// =============================================================================
// spoken-service.ts — Spoken English: checklist saving, PDF upload, publish and
// explicit replace. Dependencies are injected so the logic can be tested against
// an in-memory database (see Portal/tests/spoken-service.test.ts).
//
// SAFETY RULES
//  * New lessons are INSERT-only. An existing class + Day is never touched unless the
//    administrator explicitly chose "Replace Existing" (mode "replace", confirmReset
//    true, and the id of the lesson being replaced).
//  * A replacement touches exactly one lesson (its row + its checklist rows). It is
//    undone automatically if any step fails; a success is only reported after the
//    new state has been read back.
//  * Every upload gets a unique file name; an older file is never reused or overwritten.
//  * Uploaded files are never deleted after a successful publish (old PDFs kept).
// =============================================================================
import {
  groupSpokenTasks, spokenStatusFromRows, validateSpokenLessonInput, validateSpokenMeta,
  parseSpokenAssetPath, SPOKEN_ASSET_PATH_RE, normalizeContent,
} from "./spoken-status.ts";

export const SPOKEN_BUCKET = "spoken-english-pdfs";
export const SPOKEN_SUBJECT = "Spoken English";
export const SPOKEN_MAX_ASSET_BYTES = 8 * 1024 * 1024;

export interface SpokenDeps {
  db: any;
  S: (v: any) => string;
  today: () => string;
  lessonNoValue: (v: any) => number;
  resolveLesson: (grade: string, subject: string, lessonName: string) => Promise<{ subject: string; classes: string[] }>;
  fetchAll: (table: string, columns: string, build?: (q: any) => any) => Promise<any[]>;
}

const TASK_COLS = "class, subject, lesson_name, session_name, task_num, task_key, content, checked";

export function createSpokenService(d: SpokenDeps) {
  const { db, S } = d;
  let bucketReady = false;

  async function ensureSpokenBucket() {
    if (bucketReady) return;
    const { data } = await db.storage.getBucket(SPOKEN_BUCKET);
    if (!data) {
      const { error } = await db.storage.createBucket(SPOKEN_BUCKET, {
        public: true, fileSizeLimit: SPOKEN_MAX_ASSET_BYTES, allowedMimeTypes: ["application/pdf", "application/json"],
      });
      if (error && !/already exists/i.test(error.message)) throw new Error("Could not prepare PDF storage: " + error.message);
    }
    bucketReady = true;
  }

  // ---------------------------------------------------------------- save ticks
  async function loadTaskRows(classes: string[], subject: string, lessonName: string): Promise<any[]> {
    const { data, error } = await db.from("syllabus_session_tasks")
      .select("task_key, content, checked, class, lesson_name")
      .in("class", classes).eq("subject", subject).eq("lesson_name", lessonName);
    if (error) throw new Error(error.message);
    return data || [];
  }

  // Saves EVERY tick of one lesson in a single request. Status is derived from the
  // stored rows (never from the browser). If someone else changed the same lesson at
  // the same moment, the latest stored state is returned with conflict:true.
  async function saveSpokenChecklist(grade: string, subject: string, lessonName: string, items: any, teacher: string, notes: string) {
    if (!Array.isArray(items) || !items.length) throw new Error("No checklist items were sent.");
    const r = await d.resolveLesson(grade, subject, lessonName);
    const rows = await loadTaskRows(r.classes, r.subject, lessonName);
    if (!rows.length) throw new Error("This lesson has no checklist yet.");
    const groups = groupSpokenTasks(rows);
    const valid = new Set(groups.map((g) => g.key));

    const wanted = new Map<string, boolean>();
    for (const it of items) {
      const key = S(it && it.taskKey);
      if (!valid.has(key)) throw new Error("A submitted item does not belong to this lesson.");
      wanted.set(key, it.checked === true);
    }
    const toTrue = [...wanted].filter(([, v]) => v).map(([k]) => k);
    const toFalse = [...wanted].filter(([, v]) => !v).map(([k]) => k);
    for (const [flag, keys] of [[true, toTrue], [false, toFalse]] as [boolean, string[]][]) {
      if (!keys.length) continue;
      const { error } = await db.from("syllabus_session_tasks").update({ checked: flag })
        .in("class", r.classes).eq("subject", r.subject).eq("lesson_name", lessonName).in("task_key", keys);
      if (error) throw new Error(error.message);
    }

    const after = await loadTaskRows(r.classes, r.subject, lessonName);
    let conflict = false;
    for (const g of groupSpokenTasks(after)) {
      if (wanted.has(g.key) && g.checked !== wanted.get(g.key)) conflict = true;
    }
    const st = spokenStatusFromRows(after);

    try {   // keep the legacy per-lesson progress row in step (best effort, not read by the tracker)
      const { data: lessonRows } = await db.from("syllabus_lessons")
        .select("id, class, subject, name").in("class", r.classes).eq("subject", r.subject).eq("name", lessonName).limit(1);
      const lesson = lessonRows && lessonRows[0];
      if (lesson && !conflict) {
        const key = "LESSON::" + lesson.id;
        const patch = {
          state: st.state, notes: notes || "Spoken English Daily Checklist",
          completed_on: st.state === "TRUE" ? d.today() : null,
          updated_by: teacher || "Teacher", updated_at: new Date().toISOString(),
        };
        const { data: ex } = await db.from("syllabus_lesson_progress").select("task_key").eq("task_key", key).limit(1);
        if (ex && ex.length) await db.from("syllabus_lesson_progress").update(patch).eq("task_key", key);
        else await db.from("syllabus_lesson_progress")
          .upsert({ task_key: key, class: lesson.class, subject: lesson.subject, lesson_name: lesson.name, ...patch }, { onConflict: "class,subject,lesson_name" });
      }
    } catch (e) { console.warn("Spoken progress mirror skipped:", e); }

    return { state: st.state, label: st.label, pct: st.pct, done: st.done, total: st.total, conflict };
  }

  // ---------------------------------------------------- what exists (read-only)
  async function findExisting(cls: string, day: number): Promise<any[]> {
    const { data, error } = await db.from("syllabus_lessons")
      .select("id, class, subject, lesson_no, name, item_type, drive_link, sort_order")
      .eq("class", cls).ilike("subject", "%spoken%");
    if (error) throw new Error(error.message);
    return (data || []).filter((l: any) => d.lessonNoValue(l.lesson_no) === day);
  }

  // For the upload screen: every Spoken English lesson with how many checklist
  // items teachers have ticked (used for the "progress will be reset" warning).
  async function getSpokenLessonIndex() {
    const lessons = await d.fetchAll("syllabus_lessons", "id, class, subject, lesson_no, name, item_type, drive_link",
      (q: any) => q.ilike("subject", "%spoken%"));
    const tasks = await d.fetchAll("syllabus_session_tasks", "class, subject, lesson_name, task_key, content, checked",
      (q: any) => q.ilike("subject", "%spoken%"));
    const byLesson: Record<string, any[]> = {};
    for (const t of tasks) (byLesson[`${t.class}|${t.subject}|${t.lesson_name}`] ||= []).push(t);
    return lessons.map((l: any) => {
      const groups = groupSpokenTasks(byLesson[`${l.class}|${l.subject}|${l.name}`] || []);
      return {
        id: l.id, cls: S(l.class), day: d.lessonNoValue(l.lesson_no), name: S(l.name), itemType: S(l.item_type),
        total: groups.length, ticked: groups.filter((g) => g.checked).length,
      };
    });
  }

  // --------------------------------------------------------------- file upload
  async function uploadSpokenAsset(path: string, base64: string, contentType: string) {
    const parsed = parseSpokenAssetPath(path);
    if (!parsed) throw new Error("Invalid file name for Spoken English upload.");
    const isPdf = parsed.ext === "pdf";
    if (contentType !== (isPdf ? "application/pdf" : "application/json")) throw new Error("Unexpected file type.");
    let bytes: Uint8Array;
    try { bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)); } catch { throw new Error("The file data was not valid."); }
    if (!bytes.length || bytes.length > SPOKEN_MAX_ASSET_BYTES) throw new Error("File is empty or larger than 8 MB.");
    if (isPdf && String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") throw new Error("This is not a PDF file.");
    if (!isPdf) {
      let meta: any;
      try { meta = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new Error("Lesson details were not valid JSON."); }
      const bad = validateSpokenMeta(meta);
      if (bad) throw new Error(bad);
    }
    await ensureSpokenBucket();
    const bucket = db.storage.from(SPOKEN_BUCKET);
    const url = bucket.getPublicUrl(path).data.publicUrl;
    const { error } = await bucket.upload(path, bytes, { contentType, upsert: false });
    if (error) {
      // never reuse or overwrite an existing file
      if (/already exists|duplicate/i.test(error.message)) throw new Error("A file with this name already exists. Please upload again.");
      throw new Error("Upload failed: " + error.message);
    }
    return { path, url };
  }

  async function objectExists(path: string): Promise<boolean> {
    const name = path.split("/").pop() || "";
    const { data, error } = await db.storage.from(SPOKEN_BUCKET).list("spoken", { search: name.replace(/\.[a-z]+$/, "") });
    if (error) return false;
    return (data || []).some((f: any) => f.name === name);
  }
  async function removeFiles(paths: string[]) {   // only ever called for files of THIS attempt that were not published
    try { await db.storage.from(SPOKEN_BUCKET).remove(paths); } catch (e) { console.warn("Could not remove unused upload:", e); }
  }
  const idLess = (a: any, b: any) => (Number.isFinite(Number(a)) && Number.isFinite(Number(b))) ? Number(a) < Number(b) : String(a) < String(b);

  // ------------------------------------------------------------------- publish
  async function publishSpokenLessons(lessons: any) {
    if (!Array.isArray(lessons) || !lessons.length) throw new Error("No lessons to publish.");
    await ensureSpokenBucket();
    const publicBase = db.storage.from(SPOKEN_BUCKET).getPublicUrl("spoken/").data.publicUrl;
    const results: any[] = [];

    for (const l of lessons) {
      const label = `${S(l && l.cls)} Day ${S(l && l.day)}`;
      let pdfPath = "", jsonPath = "", published = false;
      try {
        const bad = validateSpokenLessonInput(l);
        if (bad) { results.push({ cls: l && l.cls, day: l && l.day, status: "failed", message: bad }); continue; }
        const cls = S(l.cls), day = Number(l.day), name = S(l.lessonName), mode = l.mode === "replace" ? "replace" : "new";
        const pdfUrl = S(l.pdfUrl);
        if (!pdfUrl.startsWith(publicBase)) { results.push({ cls, day, status: "failed", message: "The PDF was not uploaded to portal storage." }); continue; }
        const candidate = "spoken/" + pdfUrl.slice(publicBase.length);
        const parsed = parseSpokenAssetPath(candidate);
        if (!parsed || parsed.ext !== "pdf" || parsed.cls !== cls || parsed.day !== day) {
          results.push({ cls, day, status: "failed", message: "The uploaded PDF does not belong to this class and day." }); continue;
        }
        const { data: inUse } = await db.from("syllabus_lessons").select("id").eq("drive_link", pdfUrl).limit(1);
        if (inUse && inUse.length) { results.push({ cls, day, status: "failed", message: "This PDF file is already used by a lesson. Please upload again." }); continue; }
        pdfPath = candidate;
        jsonPath = pdfPath.replace(/\.pdf$/, ".json");
        if (!(await objectExists(pdfPath)) || !(await objectExists(jsonPath))) {
          results.push({ cls, day, status: "failed", message: "The uploaded files were not found in storage. Please upload again." }); continue;
        }
        const checklist = l.checklist.map((c: any) => normalizeContent(c));
        const r = mode === "replace"
          ? await replaceLesson(cls, day, name, pdfUrl, checklist, S(l.expectedLessonId))
          : await createLesson(cls, day, name, pdfUrl, checklist);
        published = r.status === "created" || r.status === "replaced";
        results.push({ cls, day, ...r });
      } catch (e) {
        results.push({ cls: l && l.cls, day: l && l.day, status: "failed", message: `${label}: ${String((e as any)?.message || e)}` });
      }
      if (!published && pdfPath) await removeFiles([pdfPath, jsonPath]);   // unused files of this attempt only
    }
    return { results, created: results.filter((r) => r.status === "created").length, replaced: results.filter((r) => r.status === "replaced").length };
  }

  const taskRowsFor = (cls: string, name: string, checklist: string[], day: number) => checklist.map((c, i) => ({
    class: cls, subject: SPOKEN_SUBJECT, lesson_name: name, session_name: "Daily Checklist",
    task_num: i + 1, task_key: `SPOKEN::${cls}::${day}::CHK::${i + 1}`, content: c, checked: false,
  }));

  async function createLesson(cls: string, day: number, name: string, pdfUrl: string, checklist: string[]) {
    const existing = await findExisting(cls, day);
    if (existing.length) return { status: "skipped", message: "Already exists — left unchanged (choose Replace Existing to replace it)." };
    const rows = taskRowsFor(cls, name, checklist, day);
    const keys = rows.map((r) => r.task_key);
    const { data: orphan } = await db.from("syllabus_session_tasks").select("task_key").eq("class", cls).eq("subject", SPOKEN_SUBJECT).in("task_key", keys).limit(1);
    const { data: orphanName } = await db.from("syllabus_session_tasks").select("task_key").eq("class", cls).eq("subject", SPOKEN_SUBJECT).eq("lesson_name", name).limit(1);
    if ((orphan && orphan.length) || (orphanName && orphanName.length)) {
      return { status: "skipped", message: "Old checklist rows already exist for this lesson — left unchanged." };
    }
    const { data: ins, error: insErr } = await db.from("syllabus_lessons").insert({
      class: cls, subject: SPOKEN_SUBJECT, name, item_type: "SpokenEnglish",
      sort_order: day * 10, lesson_no: String(day), target_month: "", drive_link: pdfUrl,
    }).select("id").single();
    if (insErr) throw new Error(insErr.message);

    // No unique rule exists in the database: if another admin created the same class+Day
    // at the same moment, the lesson with the lowest id wins and this one removes itself.
    const now = await findExisting(cls, day);
    if (now.some((o: any) => String(o.id) !== String(ins.id) && idLess(o.id, ins.id))) {
      await db.from("syllabus_lessons").delete().eq("id", ins.id);
      return { status: "skipped", message: "Another upload created this lesson at the same time — left unchanged." };
    }
    const { error: tErr } = await db.from("syllabus_session_tasks").insert(rows);
    if (tErr) {                                    // undo the half-created lesson
      await db.from("syllabus_lessons").delete().eq("id", ins.id);
      throw new Error(tErr.message);
    }
    return { status: "created", message: `${rows.length} checklist items` };
  }

  // Replaces exactly ONE lesson (identified by class + Day + the id the admin confirmed).
  async function replaceLesson(cls: string, day: number, name: string, pdfUrl: string, checklist: string[], expectedId: string) {
    const existing = await findExisting(cls, day);
    if (existing.length !== 1) return { status: "failed", message: existing.length ? "More than one lesson exists for this class and Day. Resolve this manually before replacing." : "The lesson to replace no longer exists." };
    const old = existing[0];
    if (String(old.id) !== expectedId) return { status: "failed", message: "The lesson changed after you reviewed it. Please review again." };
    if (S(old.subject) !== SPOKEN_SUBJECT) return { status: "failed", message: "This lesson is not a Spoken English lesson." };
    const oldName = S(old.name);

    if (name !== oldName) {   // the new title must not collide with any other lesson or leftover checklist rows
      const { data: sameName } = await db.from("syllabus_lessons").select("id").eq("class", cls).eq("subject", SPOKEN_SUBJECT).eq("name", name);
      const { data: sameTasks } = await db.from("syllabus_session_tasks").select("task_key").eq("class", cls).eq("subject", SPOKEN_SUBJECT).eq("lesson_name", name).limit(1);
      if ((sameName && sameName.length) || (sameTasks && sameTasks.length)) return { status: "failed", message: "The new lesson title is already used by other records in this class. Nothing was changed." };
    }
    const { data: snapshot, error: snapErr } = await db.from("syllabus_session_tasks").select(TASK_COLS)
      .eq("class", cls).eq("subject", SPOKEN_SUBJECT).eq("lesson_name", oldName);
    if (snapErr) throw new Error(snapErr.message);
    const oldRows: any[] = snapshot || [];
    const oldGroups = groupSpokenTasks(oldRows);
    const clearedTicks = oldGroups.filter((g) => g.checked).length;
    const newRows = taskRowsFor(cls, name, checklist, day);
    const oldLesson = { name: oldName, drive_link: old.drive_link, sort_order: old.sort_order };

    // SAFE REPLACE — old checklist rows are NEVER deleted. They are renamed to an archive name and kept.
    // Steps: (1) insert new rows under a unique pending name, (2) archive old rows by renaming,
    // (3) rename pending rows to the real name, (4) switch the lesson row, (5) verify.
    // A failure undoes only what this call did; the old rows are renamed back, never re-created.
    const token = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    const pendingName = `${name} [pending ${token}]`;
    const archiveName = `${oldName} [replaced ${token}]`;
    const tasks = () => db.from("syllabus_session_tasks");
    const st = { inserted: false, archived: false, finalised: false, switched: false };

    const rollback = async (): Promise<boolean> => {
      let ok = true;
      const run = async (label: string, fn: () => Promise<any>) => {
        try { const r = await fn(); if (r && r.error) throw new Error(r.error.message); }
        catch (e) { ok = false; console.error("SPOKEN REPLACE ROLLBACK STEP FAILED", label, cls, day, String((e as any)?.message || e)); }
      };
      if (st.switched) await run("lesson row", () => db.from("syllabus_lessons").update(oldLesson).eq("id", old.id));
      if (st.finalised) await run("delete new rows", () => tasks().delete().eq("class", cls).eq("subject", SPOKEN_SUBJECT).eq("lesson_name", name));
      if (st.inserted && !st.finalised) await run("delete pending rows", () => tasks().delete().eq("class", cls).eq("subject", SPOKEN_SUBJECT).eq("lesson_name", pendingName));
      if (st.archived) await run("un-archive old rows", () => tasks().update({ lesson_name: oldName }).eq("class", cls).eq("subject", SPOKEN_SUBJECT).eq("lesson_name", archiveName));
      if (!st.switched) await run("lesson row check", () => db.from("syllabus_lessons").update(oldLesson).eq("id", old.id));
      return ok;
    };

    try {
      st.inserted = true;
      const { error: insErr } = await tasks().insert(newRows.map((r) => ({ ...r, lesson_name: pendingName })));
      if (insErr) throw new Error(insErr.message);
      const { data: pend } = await tasks().select("task_key").eq("class", cls).eq("subject", SPOKEN_SUBJECT).eq("lesson_name", pendingName);
      if (!pend || pend.length !== newRows.length) throw new Error("The new checklist could not be verified before switching.");

      if (oldRows.length) {
        st.archived = true;
        const { error: arErr } = await tasks().update({ lesson_name: archiveName }).eq("class", cls).eq("subject", SPOKEN_SUBJECT).eq("lesson_name", oldName);
        if (arErr) throw new Error(arErr.message);
        const { data: ar } = await tasks().select("task_key").eq("class", cls).eq("subject", SPOKEN_SUBJECT).eq("lesson_name", archiveName);
        if (!ar || ar.length !== oldRows.length) throw new Error("The existing progress could not be safely archived.");
      }
      st.finalised = true;
      const { error: fErr } = await tasks().update({ lesson_name: name }).eq("class", cls).eq("subject", SPOKEN_SUBJECT).eq("lesson_name", pendingName);
      if (fErr) throw new Error(fErr.message);
      st.switched = true;
      const { error: updErr } = await db.from("syllabus_lessons").update({ name, drive_link: pdfUrl, sort_order: day * 10 }).eq("id", old.id);
      if (updErr) throw new Error(updErr.message);

      // read back — only report success when the new state is really stored
      const { data: back } = await tasks().select("task_key, content, checked").eq("class", cls).eq("subject", SPOKEN_SUBJECT).eq("lesson_name", name);
      const g = groupSpokenTasks(back || []);
      const { data: les } = await db.from("syllabus_lessons").select("id, name, drive_link").eq("id", old.id);
      if (g.length !== newRows.length || g.some((x) => x.checked) || !les || !les[0] || S(les[0].name) !== name || S(les[0].drive_link) !== pdfUrl) {
        throw new Error("The new lesson could not be verified after saving.");
      }
    } catch (e) {
      const ok = await rollback();
      return { status: "failed", message: String((e as any)?.message || e) + (ok ? " — the existing lesson and its progress were kept unchanged." : " — RESTORE INCOMPLETE: please check this lesson (old progress is kept under the name \"" + archiveName + "\").") };
    }
    try {   // legacy per-lesson progress row: reset too (best effort)
      await db.from("syllabus_lesson_progress").update({ state: "FALSE", completed_on: null, notes: "Reset: lesson replaced", updated_at: new Date().toISOString() }).eq("task_key", "LESSON::" + old.id);
    } catch (e) { console.warn("Progress mirror reset skipped:", e); }
    return { status: "replaced", message: `${newRows.length} checklist items; ${clearedTicks} ticked item(s) of earlier teacher progress reset (old progress kept as archive)`, clearedTicks };
  }

  return { saveSpokenChecklist, getSpokenLessonIndex, uploadSpokenAsset, publishSpokenLessons, ensureSpokenBucket };
}
export { SPOKEN_ASSET_PATH_RE };

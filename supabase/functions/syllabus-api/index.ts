// =========================================================================
// Supabase Edge Function: syllabus-api   (v4.1 — Gemini-wired)
// Same as the v4 you deployed, EXCEPT the optional AI layer now calls Google
// Gemini directly (the model your old Apps Script used) instead of an
// OpenAI-style endpoint. Everything else — the STRICT SUBJECT MATCHER,
// pagination, ID-based Manual keys, bulk management audit — is unchanged.
//
// Deploy: Edge Functions → syllabus-api → Via Editor → paste this whole file → Deploy.
// Secrets (Project → Settings → Edge Functions):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (auto)
//   SYLLABUS_GEMINI_KEY   = <your Google Generative Language API key>   (or GEMINI_API_KEY)
//   SYLLABUS_GEMINI_MODEL = gemini-3.1-flash-lite   (optional override)
// AI is OPTIONAL: if the key is unset, tracking still works; only the Telugu
// translate / explain buttons return a friendly "not configured" message.
// =========================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false }, db: { schema: "app" } });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-session-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const okJson  = (data: unknown) => new Response(JSON.stringify({ ok: true,  data }),  { headers: CORS });
const errJson = (e: string)     => new Response(JSON.stringify({ ok: false, error: e }), { headers: CORS });

const S = (v: any) => (v == null ? "" : String(v)).trim();
const numText = (v: any) => S(v).replace(/\.0+$/, "");

function syllabusLessonNoValue(value: any): number {
  const match = S(value).match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : NaN;
}
function compareSyllabusLessons(a: any, b: any): number {
  const an = syllabusLessonNoValue(a.lesson_no), bn = syllabusLessonNoValue(b.lesson_no);
  if (Number.isFinite(an) && Number.isFinite(bn) && an !== bn) return an - bn;
  if (Number.isFinite(an) !== Number.isFinite(bn)) return Number.isFinite(an) ? -1 : 1;
  const as = Number(a.sort_order), bs = Number(b.sort_order);
  return (Number.isFinite(as) ? as : 999999999) - (Number.isFinite(bs) ? bs : 999999999) || S(a.name).localeCompare(S(b.name));
}

const today = () => new Date().toISOString().slice(0, 10);

function normalizeManualState(value: any): "TRUE" | "IN_PROGRESS" | "FALSE" {
  if (value === true) return "TRUE";
  const state = S(value).toUpperCase().replace(/[\s-]+/g, "_");
  if (state === "TRUE" || state === "DONE" || state === "COMPLETED") return "TRUE";
  if (state === "IN_PROGRESS" || state === "INPROGRESS") return "IN_PROGRESS";
  return "FALSE";
}

// ---- class-format bridge -------------------------------------------------
// hw_timetable stores high-school classes as bare "7".."10", but
// syllabus_lessons/tasks store "Grade 7".."Grade 10" (and Nursery/LKG/UKG).
// This returns every plausible spelling so .in("class", …) matches regardless
// of which convention produced the value. Used for ALL class filters below.
function classVariants(grade: any): string[] {
  const raw = S(grade);
  const set = new Set<string>([raw, numText(raw)]);
  const n = gradeToNumber(grade);
  if (n !== null) {
    set.add(String(n));
    set.add("Grade " + n); set.add("Grade-" + n); set.add("Grade" + n);
    set.add("Class " + n); set.add("Class-" + n);
    set.add(("0" + n).slice(-2));           // "07"
    set.add(String(n) + ".0");
    // Some syllabus imports use ordinal class labels (7th, 8th, 9th).
    // Include those spellings so teacher catalogue queries do not omit rows
    // that the management editor can already see through grade normalization.
    const suffix = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as any)[n % 10] || "th";
    const ordinal = String(n) + suffix;
    set.add(ordinal); set.add("Grade " + ordinal); set.add("Grade-" + ordinal); set.add("Grade" + ordinal);
    set.add("Class " + ordinal); set.add("Class-" + ordinal); set.add("Class" + ordinal);
  } else {
    // pre-primary: cover common casings of Nursery/LKG/UKG
    const u = raw.toUpperCase();
    set.add(u); set.add(raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase());
  }
  return [...set].filter(Boolean);
}

// =========================================================================
// STRICT SUBJECT MATCHER (Telangana State + JEE-NEET Foundation)
// Ported verbatim from the legacy Apps Script matchesSyllabusRow_.
// =========================================================================
function normSubjKey(v: any): string {
  return S(v).toLowerCase().replace(/\s+/g, "");
}
function gradeToNumber(v: any): number | null {
  const s = S(v).toLowerCase().replace(/\s+/g, "");
  const cleaned = s.replace(/^grade-?/, "").replace(/^class-?/, "");
  const num = parseFloat(cleaned);
  if (!isNaN(num) && isFinite(num)) return Math.floor(num);
  return null;
}
function isJeeStrand(subKey: string): boolean {
  return subKey === "physics" || subKey === "chemistry" || subKey === "biology";
}
function classesEqual(a: any, b: any): boolean {
  const na = gradeToNumber(a), nb = gradeToNumber(b);
  if (na !== null && nb !== null) return na === nb;
  return normSubjKey(a) === normSubjKey(b);
}
function matchesSyllabusRow(teacherSubject: string, grade: any, rowSubject: string, rowStrand: string): boolean {
  const ts = normSubjKey(teacherSubject);
  const b = normSubjKey(rowSubject);
  const f = normSubjKey(rowStrand);

  // Spoken English and Spoken Skills are treated as the same subject
  if (ts === "spokenenglish" || ts === "spokenskills") {
    return b === "spokenenglish" || b === "spokenskills";
  }

  const gNum = gradeToNumber(grade);
  if (gNum !== null && gNum >= 6 && gNum <= 10) {
    if (ts === "maths" || ts === "maths-1") return (b === "maths" || b === "maths-1") && f !== "maths-2";
    // Maths-2 exists in two valid legacy shapes:
    //   1) subject="Maths", strand_subject="Maths-2"
    //   2) subject="Maths-2", strand_subject=NULL
    // Match both without leaking Maths-1 rows into the Maths-2 tracker.
    if (ts === "maths-2") return f === "maths-2" || (!f && b === "maths-2");
  }
  if (gNum === 6 || gNum === 7) {
    if (ts === "science") return b === "science";
    return b === ts;
  }
  if (gNum === 8 || gNum === 9 || gNum === 10) {
    if (isJeeStrand(ts)) {
      if (f) return f === ts;
      return b === ts;
    }
    return b === ts && !f;
  }
  return b === ts;
}

// ---- paginated fetch: PostgREST caps a single select() at 1000 rows. ----
async function fetchAll(table: string, columns: string, build?: (q: any) => any): Promise<any[]> {
  const PAGE = 1000;
  let from = 0;
  const all: any[] = [];
  for (;;) {
    let q = db.from(table).select(columns);
    if (build) q = build(q);
    const { data, error } = await q.range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data || !data.length) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

// ---- resolve a teacher's raw name via alias ----
async function resolveTeacherNames(rawOrReal: string): Promise<string[]> {
  const clean = S(rawOrReal)
    .replace(/^(?:MR\.|MRS\.|MS\.|DR\.|SIR|MADAM)\s+/i, "")
    .replace(/\s+(?:SIR|MADAM)$/i, "")
    .trim();

  const names = new Set<string>([clean, S(rawOrReal)]);
  const lower = clean.toLowerCase();

  // Known phonetic and ERP spelling variants
  if (lower === "sathish" || lower === "satish") {
    names.add("Sathish");
    names.add("Satish");
  }
  if (lower === "knr" || lower.includes("narsimha")) {
    names.add("KNR");
    names.add("Narsimha Reddy Kasireddy");
    names.add("Narsimha Reddy");
  }
  if (lower === "santosh" || lower === "santhosh") {
    names.add("Santosh");
    names.add("Santhosh");
  }
  if (lower.startsWith("srinivas")) {
    names.add("Srinivas");
    names.add("Srinivas Kodipunjula");
    names.add("Srinivas Pulloori");
    names.add("Srinivas Vallakati");
  }
  if (lower.startsWith("ramana")) {
    names.add("Ramana Prasad");
    names.add("Ramana");
  }

  try {
    const { data: u } = await db.from("users").select("id,name").ilike("name", clean).maybeSingle();
    if (u) {
      names.add(S(u.name));
      const { data: aliases } = await db.from("teacher_aliases").select("alias_name").eq("user_id", u.id);
      for (const a of aliases || []) if (S(a.alias_name)) names.add(S(a.alias_name));
    } else {
      const { data: alias } = await db.from("teacher_aliases").select("user_id").ilike("alias_name", clean).maybeSingle();
      if (alias?.user_id) {
        const { data: u2 } = await db.from("users").select("name").eq("id", alias.user_id).maybeSingle();
        if (u2) names.add(S(u2.name));
        const { data: aliases2 } = await db.from("teacher_aliases").select("alias_name").eq("user_id", alias.user_id);
        for (const a of aliases2 || []) if (S(a.alias_name)) names.add(S(a.alias_name));
      }
    }
  } catch (_) {}

  return [...names].filter(Boolean);
}

// =========================================================================
// TEACHER
// =========================================================================
async function getTeacherClassSubjects(teacher: string) {
  const names = await resolveTeacherNames(teacher);
  if (!names.length) return [];

  let q = db.from("hw_timetable").select("class, subject").eq("is_activity", false);
  if (names.length === 1) {
    q = q.ilike("teacher_name", `%${names[0]}%`);
  } else {
    const orFilter = names.map((v) => `teacher_name.ilike.%${v}%`).join(",");
    q = q.or(orFilter);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const seen = new Set<string>(); const out: any[] = [];
  for (const r of data || []) {
    const key = numText(r.class) + "|" + S(r.subject);
    if (seen.has(key)) continue; seen.add(key);
    out.push({ className: numText(r.class), subject: S(r.subject) });
  }
  return out;
}

async function getSyllabusAndPlansCatalog(grade: string, subject: string, _teacher: string) {
  const variants = classVariants(grade);
  const { data: allForClass, error } = await db.from("syllabus_lessons")
    .select("*").in("class", variants).order("sort_order").order("lesson_no");
  if (error) throw new Error(error.message);
  const lessonRows = (allForClass || []).filter((l: any) =>
    matchesSyllabusRow(subject, grade, l.subject, l.strand_subject)).sort(compareSyllabusLessons);

  const astragen = lessonRows.filter((l: any) => l.item_type === "AstraGen");
  const manualIds = lessonRows.filter((l: any) => l.item_type !== "AstraGen").map((l: any) => l.id);

  // group by the lesson's OWN stored (class, subject) so downstream task
  // queries use the exact strings the tasks were written with.
  const astragenBySubject: Record<string, { classes: Set<string>; names: string[] }> = {};
  for (const l of astragen) {
    const g = (astragenBySubject[l.subject] ??= { classes: new Set(), names: [] });
    g.classes.add(l.class); g.names.push(l.name);
  }

  const taskAgg: Record<string, { total: number; done: number }> = {};
  for (const [realSubj, g] of Object.entries(astragenBySubject)) {
    const taskRows = await fetchAll("syllabus_session_tasks", "lesson_name, checked",
      (q) => q.in("class", [...g.classes]).eq("subject", realSubj).in("lesson_name", g.names));
    for (const t of taskRows) {
      const agg = (taskAgg[t.lesson_name] ??= { total: 0, done: 0 });
      agg.total++; if (t.checked) agg.done++;
    }
  }

  const progByKey: Record<string, any> = {};
  if (manualIds.length) {
    const keys = manualIds.map((id: any) => "LESSON::" + id);
    const { data: progRows } = await db.from("syllabus_lesson_progress").select("task_key, state").in("task_key", keys);
    for (const p of progRows || []) progByKey[p.task_key] = p;
  }

  const out: any[] = [];
  for (const l of lessonRows) {
    if (l.item_type === "AstraGen") {
      const agg = taskAgg[l.name] || { total: 0, done: 0 };
      out.push({
        type: "AstraGen", name: l.name, lessonNo: l.lesson_no, sortOrder: l.sort_order, targetMonth: l.target_month,
        driveLink: l.drive_link, totalTasks: agg.total, completedTasks: agg.done,
        currentState: agg.total > 0 && agg.done === agg.total ? "TRUE" : (agg.done > 0 ? "IN_PROGRESS" : "FALSE"),
      });
    } else {
      const taskKey = "LESSON::" + l.id;
      const prog = progByKey[taskKey];
      out.push({
        type: "Manual", name: l.name, lessonNo: l.lesson_no, sortOrder: l.sort_order, targetMonth: l.target_month,
        driveLink: l.drive_link, taskKey, currentState: normalizeManualState(prog?.state),
      });
    }
  }
  return out;
}

// returns { subject, classes[] } — the lesson's real stored subject AND the
// actual class strings it lives under (so task queries match exactly).
async function resolveLesson(grade: string, teacherSubject: string, lessonName: string): Promise<{ subject: string; classes: string[] }> {
  const variants = classVariants(grade);
  const { data: candidates } = await db.from("syllabus_lessons")
    .select("class, subject, strand_subject").in("class", variants).eq("name", lessonName);
  const match = (candidates || []).find((l: any) => matchesSyllabusRow(teacherSubject, grade, l.subject, l.strand_subject));
  if (match) return { subject: match.subject, classes: [match.class] };
  return { subject: teacherSubject, classes: variants };
}

async function extractTasksFromDrivePDF(grade: string, subject: string, lesson: string, _teacher: string) {
  const r = await resolveLesson(grade, subject, lesson);
  const { data, error } = await db.from("syllabus_session_tasks")
    .select("*").in("class", r.classes).eq("subject", r.subject).eq("lesson_name", lesson).order("session_name").order("task_num");
  if (error) throw new Error(error.message);
  const bySession: Record<string, any[]> = {};
  for (const t of data || []) {
    (bySession[t.session_name] ??= []).push({
      taskKey: t.task_key, taskNum: t.task_num, content: t.content,
      telugu: t.telugu, checked: !!t.checked, notes: t.notes, sheetRow: 1,
    });
  }
  return bySession;
}

async function saveTaskProgress(taskKey: string, checked: any, teacher: string, notes: string) {
  const key = S(taskKey);

  if (!key) {
    throw new Error("Missing task key.");
  }

  // AstraGen/session task.
  // syllabus_session_tasks uses task_key as the identifier and
  // checked as the persisted completion state.
  //
  // Do not reference id, notes, updated_by, or updated_at here.
  // Those columns are not present in the actual table schema.

  const { data: taskRows, error: taskLookupError } = await db
    .from("syllabus_session_tasks")
    .select("task_key, checked")
    .eq("task_key", key);

  if (taskLookupError) {
    throw new Error(taskLookupError.message);
  }

  if (taskRows && taskRows.length) {
    const newChecked = checked === true;

    const { data: savedRows, error: saveError } = await db
      .from("syllabus_session_tasks")
      .update({
        checked: newChecked
      })
      .eq("task_key", key)
      .select("task_key, checked");

    if (saveError) {
      throw new Error(saveError.message);
    }

    if (
      !savedRows ||
      !savedRows.length ||
      savedRows.some((r: any) => !!r.checked !== newChecked)
    ) {
      throw new Error(
        "The task could not be verified after saving. Please try again."
      );
    }

    return "Saved";
  }

  // Manual lesson progress.
  const state = normalizeManualState(checked);

  const idPart = key.startsWith("LESSON::")
    ? key.slice("LESSON::".length)
    : "";

  const lessonId = Number(idPart);

  if (!lessonId || Number.isNaN(lessonId)) {
    throw new Error("Unrecognized task key: " + key);
  }

  const { data: lesson, error: lessonError } = await db
    .from("syllabus_lessons")
    .select("class, subject, name")
    .eq("id", lessonId)
    .maybeSingle();

  if (lessonError) {
    throw new Error(lessonError.message);
  }

  if (!lesson) {
    throw new Error("Lesson not found for id " + lessonId);
  }

  const row = {
    task_key: key,
    class: lesson.class,
    subject: lesson.subject,
    lesson_name: lesson.name,
    state,
    notes: S(notes),
    completed_on: state === "TRUE" ? today() : null,
    updated_by: teacher,
    updated_at: new Date().toISOString()
  };

  // Prefer the stable lesson ID key when this lesson already has a progress
  // row. The old unconditional upsert by class/subject/name could overwrite a
  // different lesson's task_key when names collide.
  // Some older records may contain more than one row with the same task_key.
  // Do not use maybeSingle() here: it throws when duplicates exist, which
  // prevents teachers from updating a lesson even though the target is clear.
  // Read a single row only to decide whether this key already exists. The
  // update below intentionally applies the requested status to every row with
  // this same task_key; it does not delete, merge, or migrate any records.
  const { data: existingProgressRows, error: existingProgressError } = await db
    .from("syllabus_lesson_progress")
    .select("task_key")
    .eq("task_key", key)
    .limit(1);
  if (existingProgressError) throw new Error(existingProgressError.message);
  const existingProgress = existingProgressRows && existingProgressRows.length
    ? existingProgressRows[0]
    : null;

  let progressError: any = null;
  if (existingProgress) {
    const { error } = await db
      .from("syllabus_lesson_progress")
      .update({
        state: row.state,
        notes: row.notes,
        completed_on: row.completed_on,
        updated_by: row.updated_by,
        updated_at: row.updated_at
      })
      .eq("task_key", key);
    progressError = error;
  } else {
    const { error } = await db
      .from("syllabus_lesson_progress")
      .upsert(row, { onConflict: "class,subject,lesson_name" });
    progressError = error;
  }
  if (progressError) throw new Error(progressError.message);

  // Verify all rows for this task key. This is duplicate-tolerant and makes
  // sure a stale duplicate cannot leave the lesson appearing half-saved.
  const { data: verifiedRows, error: verifyError } = await db
    .from("syllabus_lesson_progress")
    .select("task_key, state")
    .eq("task_key", key);
  if (verifyError) throw new Error(verifyError.message);
  if (!verifiedRows || !verifiedRows.length || verifiedRows.some((v: any) => normalizeManualState(v.state) !== state)) {
    throw new Error("The lesson status was not saved under its lesson ID. Please refresh and try again.");
  }

  return "Saved";
}

// ---- OPTIONAL AI via Google Gemini (Telugu translation / explanation) -----
async function callAI(system: string, user: string): Promise<string | null> {
  const key = Deno.env.get("SYLLABUS_GEMINI_KEY") || Deno.env.get("GEMINI_API_KEY") || "";
  if (!key) return null;
  const modelOverride = Deno.env.get("SYLLABUS_GEMINI_MODEL");
  const models = modelOverride ? [modelOverride] : ["gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-3.8-flash"];
  const prompt = system ? (system + "\n\n" + user) : user;
  for (const model of models) {
    const url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent";
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3 },
        }),
      });
      if (!resp.ok) continue;
      const j = await resp.json();
      const parts = j?.candidates?.[0]?.content?.parts || [];
      let out = S(parts.map((p: any) => p?.text || "").join(""));
      out = out.replace(/^```(?:json|html)?\s*/i, "").replace(/\s*```$/i, "").trim();
      if (out) return out;
    } catch (_e) { continue; }
  }
  return null;
}

async function regenerateTeluguForTask(taskKey: string, _grade: string, _subject: string, _lesson: string) {
  const { data: t } = await db.from("syllabus_session_tasks").select("content").eq("task_key", S(taskKey)).maybeSingle();
  if (!t) return { success: false };
  const telugu = await callAI(
    "You are a helpful assistant for Telugu-medium school teachers in India. Translate the following school lesson task into clear, natural, teacher-friendly Telugu. Keep English proper nouns / technical terms as-is. Return ONLY the Telugu text, no preamble.",
    t.content
  );
  if (!telugu) return { success: false };
  await db.from("syllabus_session_tasks").update({ telugu, updated_at: new Date().toISOString() }).eq("task_key", S(taskKey));
  return { success: true, telugu };
}

async function getManagementLessonTasks(grade: string, subject: string, lesson: string) {
  const r = await resolveLesson(grade, subject, lesson);

  const { data, error } = await db
    .from("syllabus_session_tasks")
    .select("task_key, session_name, task_num, content, checked")
    .in("class", r.classes)
    .eq("subject", r.subject)
    .eq("lesson_name", lesson)
    .order("session_name")
    .order("task_num");

  if (error) {
    throw new Error(error.message);
  }

  const bySession: Record<string, any[]> = {};

  for (const t of data || []) {
    (bySession[t.session_name] ??= []).push({
      taskKey: t.task_key,
      taskNum: t.task_num,
      content: t.content,
      checked: !!t.checked
    });
  }

  return bySession;
}

async function getSessionDetailedExplanation(grade: string, subject: string, lesson: string, session: string, force: boolean) {
  const r = await resolveLesson(grade, subject, lesson);
  const cls = r.classes[0];
  const realSubject = r.subject;
  if (!force) {
    const { data: cached } = await db.from("syllabus_explanations")
      .select("explanation_html").in("class", r.classes).eq("subject", realSubject).eq("lesson_name", lesson).eq("session_name", session).maybeSingle();
    if (cached?.explanation_html) return { success: true, explanation: cached.explanation_html };
  }
  const { data: tasks } = await db.from("syllabus_session_tasks")
    .select("content").in("class", r.classes).eq("subject", realSubject).eq("lesson_name", lesson).eq("session_name", session).order("task_num");
  const contentBlob = (tasks || []).map((t: any) => t.content).join("\n");
  if (!contentBlob) return { success: false, error: "No tasks found for this session." };
  const html = await callAI(
    "You are helping a Telugu-medium school teacher in India understand and execute a lesson-plan session in the classroom. Given the numbered teacher instructions below, write a detailed, well-organised explanation in TELUGU (with occasional English technical terms in parentheses) as inner HTML using <h4>, <p>, <ul><li>, <strong>, <em>. Where an instruction asks the teacher to pose/discuss questions, add 3-5 sample Q&A in BOTH English and Telugu. Return ONLY inner HTML — no <html>/<body>, no markdown fences.",
    contentBlob
  );
  if (!html) return { success: false, error: "AI explanation is not configured yet. Ask your admin to set SYLLABUS_GEMINI_KEY (or GEMINI_API_KEY) in Edge Function secrets." };
  await db.from("syllabus_explanations").upsert(
    { class: cls, subject: realSubject, lesson_name: lesson, session_name: session, explanation_html: html, updated_at: new Date().toISOString() },
    { onConflict: "class,subject,lesson_name,session_name" }
  );
  return { success: true, explanation: html };
}

// =========================================================================
// MANAGEMENT — syllabus catalog editor
// No schema changes are required. All writes use existing syllabus tables.
// =========================================================================
function requireSyllabusManagement(who: any) {
  if (!who || who.role !== "Management") throw new Error("Management only.");
}
function editorGradeLabel(value: any): string {
  const raw = numText(value);
  const n = gradeToNumber(raw);
  return n !== null ? String(n) : raw;
}
function editorSubjectForLesson(l: any): string {
  const gradeNum = gradeToNumber(l.class);
  const base = normSubjKey(l.subject);
  const strand = normSubjKey(l.strand_subject);
  if (strand === "maths-2") return "Maths-2";
  if (gradeNum !== null && gradeNum >= 6 && gradeNum <= 10 && (base === "maths" || base === "maths-1")) return "Maths-1";
  return S(l.strand_subject) || S(l.subject);
}
async function getSyllabusEditorData() {
  const lessons = await fetchAll("syllabus_lessons",
    "id,class,subject,strand_subject,item_type,sort_order,lesson_no,target_month,drive_link,name",
    (q) => q.order("sort_order").order("lesson_no"));
  const ttRows = await fetchAll("hw_timetable", "class,subject,is_activity", (q) => q.eq("is_activity", false));
  const pairs: { grade: string; subject: string }[] = [];
  const seen = new Set<string>();
  const addPair = (grade: any, subject: any) => {
    const g = editorGradeLabel(grade);
    let s = S(subject);
    if (!g || !s) return;
    const gradeN = gradeToNumber(g), subjectKey = normSubjKey(s);
    // The tracker treats Maths and Maths-1 as the same syllabus strand for
    // Grades 6–10. Show one editor option for that strand instead of duplicate
    // Maths / Maths-1 entries that lead to the same lesson rows.
    if (gradeN !== null && gradeN >= 6 && gradeN <= 10 && (subjectKey === "maths" || subjectKey === "maths-1")) s = "Maths-1";
    const key = (gradeN === null ? g.toLowerCase() : String(gradeN)) + "|" + normSubjKey(s);
    if (seen.has(key)) return;
    seen.add(key);
    pairs.push({ grade: g, subject: s });
  };
  for (const r of ttRows) addPair(r.class, r.subject);
  // Include syllabus-only mappings too, so a lesson is still editable even if
  // its class/subject no longer appears in the current timetable.
  for (const l of lessons) {
    const g = editorGradeLabel(l.class), s = editorSubjectForLesson(l);
    const gradeN = gradeToNumber(g);
    const hasCoverage = pairs.some((p) => {
      const sameGrade = classesEqual(p.grade, g);
      if (!sameGrade) return false;
      const ps = normSubjKey(p.subject);
      const base = normSubjKey(l.subject), strand = normSubjKey(l.strand_subject);
      if (strand === "maths-2") return ps === "maths-2";
      if (gradeN !== null && gradeN >= 6 && gradeN <= 10 && (base === "maths" || base === "maths-1")) return (ps === "maths" || ps === "maths-1") && strand !== "maths-2";
      if (strand) return ps === strand;
      return ps === base;
    });
    if (!hasCoverage) addPair(g, s);
  }
  pairs.sort((a, b) => {
    const ga = gradeToNumber(a.grade), gb = gradeToNumber(b.grade);
    if (ga !== null || gb !== null) {
      if (ga === null) return -1;
      if (gb === null) return 1;
      if (ga !== gb) return ga - gb;
    }
    return a.subject.localeCompare(b.subject);
  });
  return { lessons, classSubjects: pairs };
}
async function saveSyllabusLesson(payload: any) {
  const p = payload || {};
  const id = S(p.id) ? Number(p.id) : null;
  if (id !== null && (!Number.isInteger(id) || id <= 0)) throw new Error("Invalid lesson ID.");
  const className = S(p.class), subject = S(p.subject), name = S(p.name);
  if (!className || !subject || !name) throw new Error("Class, stored subject and lesson title are required.");
  const itemType = S(p.item_type) === "AstraGen" ? "AstraGen" : "Manual";
  const lessonNo = S(p.lesson_no);
  if (!lessonNo) throw new Error("Lesson number is required.");
  const lessonNoValue = syllabusLessonNoValue(lessonNo);
  const suppliedSortOrder = Number(p.sort_order);
  // sort_order is an internal database field. The visible sequence is the
  // lesson number, so save a normalized value instead of exposing legacy
  // values such as 1000, 2000, etc. in the management editor.
  const sortOrder = Number.isFinite(lessonNoValue)
    ? Math.round(lessonNoValue * 10)
    : (Number.isFinite(suppliedSortOrder) ? Math.trunc(suppliedSortOrder) : 0);
  const row: any = {
    class: className,
    subject,
    strand_subject: S(p.strand_subject),
    item_type: itemType,
    sort_order: sortOrder,
    lesson_no: lessonNo,
    target_month: S(p.target_month),
    drive_link: S(p.drive_link),
    name
  };
  if (row.drive_link && !/^https?:\/\//i.test(row.drive_link)) throw new Error("The PDF / Drive link must start with http:// or https://.");

  if (id === null) {
    const { data, error } = await db.from("syllabus_lessons").insert(row)
      .select("id,class,subject,strand_subject,item_type,sort_order,lesson_no,target_month,drive_link,name").single();
    if (error) throw new Error(error.message);
    return { success: true, lesson: data };
  }

  const { data: old, error: oldError } = await db.from("syllabus_lessons").select("*").eq("id", id).maybeSingle();
  if (oldError) throw new Error(oldError.message);
  if (!old) throw new Error("Lesson not found. Refresh the editor and try again.");
  const oldType = S(old.item_type) === "AstraGen" ? "AstraGen" : "Manual";
  if (oldType !== itemType) throw new Error("Lesson type cannot be changed after creation because it determines how progress is tracked. Add a new lesson with the intended type instead.");

  const identityChanged = oldType === "AstraGen" &&
    (S(old.class) !== row.class || S(old.subject) !== row.subject || S(old.name) !== row.name);
  if (identityChanged) {
    const { data: siblings, error: siblingError } = await db.from("syllabus_lessons")
      .select("id").eq("class", old.class).eq("subject", old.subject).eq("name", old.name).eq("item_type", "AstraGen").neq("id", id);
    if (siblingError) throw new Error(siblingError.message);
    if (siblings && siblings.length) throw new Error("This AstraGen class/subject/title mapping is shared by another syllabus entry. Edit its order, number, month or link only; changing its mapping would affect both entries.");

    const move = { class: row.class, subject: row.subject, lesson_name: row.name };
    const oldMove = { class: old.class, subject: old.subject, lesson_name: old.name };
    const { error: taskMoveError } = await db.from("syllabus_session_tasks").update(move)
      .eq("class", old.class).eq("subject", old.subject).eq("lesson_name", old.name);
    if (taskMoveError) throw new Error("Could not update the linked session-task mapping: " + taskMoveError.message);
    const { error: explanationMoveError } = await db.from("syllabus_explanations").update(move)
      .eq("class", old.class).eq("subject", old.subject).eq("lesson_name", old.name);
    if (explanationMoveError) {
      // Best-effort compensation keeps task rows aligned if explanation mapping fails.
      await db.from("syllabus_session_tasks").update(oldMove)
        .eq("class", row.class).eq("subject", row.subject).eq("lesson_name", row.name);
      throw new Error("Could not update linked explanations: " + explanationMoveError.message + ". The task mapping was rolled back where possible.");
    }
  }

  const { data, error } = await db.from("syllabus_lessons").update(row).eq("id", id)
    .select("id,class,subject,strand_subject,item_type,sort_order,lesson_no,target_month,drive_link,name").maybeSingle();
  if (error) {
    if (identityChanged) {
      const oldMove = { class: old.class, subject: old.subject, lesson_name: old.name };
      await db.from("syllabus_session_tasks").update(oldMove).eq("class", row.class).eq("subject", row.subject).eq("lesson_name", row.name);
      await db.from("syllabus_explanations").update(oldMove).eq("class", row.class).eq("subject", row.subject).eq("lesson_name", row.name);
    }
    throw new Error(error.message);
  }
  return { success: true, lesson: data };
}
async function deleteSyllabusLesson(idValue: any) {
  const id = Number(idValue);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid lesson ID.");
  const { data: lesson, error: findError } = await db.from("syllabus_lessons").select("id,name,item_type").eq("id", id).maybeSingle();
  if (findError) throw new Error(findError.message);
  if (!lesson) throw new Error("Lesson not found. Refresh the editor and try again.");
  // Intentionally delete only the syllabus catalog row. Progress, session tasks
  // and explanations are preserved to avoid destructive changes to historical data.
  const { error } = await db.from("syllabus_lessons").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true, removedId: id, preservedLinkedRecords: true };
}
async function reorderSyllabusLessons(idsValue: any) {
  if (!Array.isArray(idsValue) || !idsValue.length || idsValue.length > 500) throw new Error("Invalid lesson order list.");
  const ids = idsValue.map((v: any) => Number(v));
  if (ids.some((id) => !Number.isInteger(id) || id <= 0) || new Set(ids).size !== ids.length) throw new Error("The lesson order contains invalid or duplicate IDs.");
  // Only sort_order is changed. Titles, mappings and completion records remain untouched.
  for (let i = 0; i < ids.length; i++) {
    const { error } = await db.from("syllabus_lessons").update({ sort_order: (i + 1) * 10 }).eq("id", ids[i]);
    if (error) throw new Error("Could not update order for lesson " + ids[i] + ": " + error.message);
  }
  return { success: true, count: ids.length };
}

async function syncSpokenEnglishCatalog(lessons: any[], tasks: any[]) {
  if (!Array.isArray(lessons) || !lessons.length) return { success: false, message: "No lessons provided" };
  
  for (const l of lessons) {
    const cls = S(l.class), subj = "Spoken English", name = S(l.name);
    const dayNum = syllabusLessonNoValue(l.lesson_no || l.day);
    const sortOrder = Number.isFinite(dayNum) ? Math.round(dayNum * 10) : 0;
    const driveLink = S(l.drive_link || l.pdf_url);
    
    const { data: existing } = await db.from("syllabus_lessons")
      .select("id")
      .eq("class", cls)
      .eq("subject", subj)
      .eq("lesson_no", String(dayNum))
      .maybeSingle();

    if (existing?.id) {
      await db.from("syllabus_lessons").update({
        name: name,
        sort_order: sortOrder,
        lesson_no: String(dayNum),
        target_month: "Daily",
        drive_link: driveLink,
        item_type: "SpokenEnglish"
      }).eq("id", existing.id);
    } else {
      await db.from("syllabus_lessons").insert({
        class: cls,
        subject: subj,
        name: name,
        item_type: "SpokenEnglish",
        sort_order: sortOrder,
        lesson_no: String(dayNum),
        target_month: "Daily",
        drive_link: driveLink
      });
    }
  }

  if (Array.isArray(tasks) && tasks.length) {
    for (const t of tasks) {
      const taskKey = S(t.task_key || t.taskKey);
      if (!taskKey) continue;
      const { data: existingTask } = await db.from("syllabus_session_tasks")
        .select("id")
        .eq("task_key", taskKey)
        .maybeSingle();

      if (existingTask?.id) {
        await db.from("syllabus_session_tasks").update({
          content: S(t.content),
          lesson_name: S(t.lesson_name || t.lessonName)
        }).eq("id", existingTask.id);
      } else {
        await db.from("syllabus_session_tasks").insert({
          class: S(t.class),
          subject: "Spoken English",
          lesson_name: S(t.lesson_name || t.lessonName),
          session_name: "Daily Checklist",
          task_num: Number(t.task_num || t.taskNum) || 1,
          task_key: taskKey,
          content: S(t.content),
          checked: false
        });
      }
    }
  }

  return { success: true, lessonsCount: lessons.length, tasksCount: (tasks || []).length };
}

// =========================================================================
// MANAGEMENT — timeline / audit report (bulk, paginated)
// =========================================================================
async function getManagementTimelineAuditReport() {
  const ttRows = await fetchAll("hw_timetable", "class, subject, teacher_name", (q) => q.eq("is_activity", false));
  const seenPair = new Set<string>();
  const pairs: { grade: string; subject: string; teacherName: string }[] = [];
  for (const r of ttRows) {
    const cls = numText(r.class), subj = S(r.subject), tch = S(r.teacher_name);
    if (!cls || !subj || !tch) continue;
    const key = (cls + "|" + subj).toLowerCase();
    if (seenPair.has(key)) continue;
    seenPair.add(key);
    pairs.push({ grade: cls, subject: subj, teacherName: tch });
  }

  const lessons = await fetchAll("syllabus_lessons", "*");

  const taskRows = await fetchAll("syllabus_session_tasks", "class, subject, lesson_name, checked");
  const taskAgg: Record<string, { total: number; done: number }> = {};
  for (const t of taskRows) {
    const k = `${t.class}|${t.subject}|${t.lesson_name}`;
    const agg = (taskAgg[k] ??= { total: 0, done: 0 });
    agg.total++;
    if (t.checked) agg.done++;
  }

  const progRows = await fetchAll("syllabus_lesson_progress", "task_key, state, completed_on");
  const progByKey: Record<string, any> = {};
  for (const p of progRows) progByKey[p.task_key] = p;

  const out: any[] = [];
  for (const pair of pairs) {
    const matched = lessons.filter((l: any) =>
      classesEqual(l.class, pair.grade) && matchesSyllabusRow(pair.subject, pair.grade, l.subject, l.strand_subject)).sort(compareSyllabusLessons);
    const lessonsList: any[] = [];
    let completed = 0, inProgress = 0;
    let hasTaskPlan = false;
    let totalTasks = 0, completedTasks = 0;
    for (const l of matched) {
      let done = false, active = false, completedOn = "-";
      if (l.item_type === "AstraGen") {
        hasTaskPlan = true;
        const agg = taskAgg[`${l.class}|${l.subject}|${l.name}`];
        const total = agg?.total || 0, dn = agg?.done || 0;
        totalTasks += total; completedTasks += dn;
        done = total > 0 && dn === total; active = !done && dn > 0;
      } else {
        const taskKey = "LESSON::" + l.id;
        const prog = progByKey[taskKey];
        const savedState = normalizeManualState(prog?.state);
        done = savedState === "TRUE"; active = savedState === "IN_PROGRESS";
        if (done && prog?.completed_on) completedOn = String(prog.completed_on);
      }
      if (done) completed++; else if (active) inProgress++;
      const agg = l.item_type === "AstraGen" ? (taskAgg[`${l.class}|${l.subject}|${l.name}`] || { total: 0, done: 0 }) : null;
      lessonsList.push({
        type: l.item_type === "AstraGen" ? "AstraGen" : "Manual",
        name: l.name,
        lessonNo: l.lesson_no,
        sortOrder: l.sort_order,
        targetMonth: l.target_month,
        completed: done,
        inProgress: active,
        completedOn,
        totalTasks: agg ? agg.total : 0,
        completedTasks: agg ? agg.done : 0
      });
    }
    out.push({
      grade: pair.grade, subject: pair.subject, teacherName: pair.teacherName,
      totalLessonsCount: matched.length, completedLessonsCount: completed, inProgressLessonsCount: inProgress,
      hasTaskPlan, totalTasks, completedTasks, lessonsList,
    });
  }
  return out;
}

// =========================================================================
const HANDLERS: Record<string, (a: any[], who: any) => Promise<any>> = {
  getTeacherClassSubjects:        (a) => getTeacherClassSubjects(S(a[0])),
  getSyllabusAndPlansCatalog:     (a) => getSyllabusAndPlansCatalog(S(a[0]), S(a[1]), S(a[2])),
  extractTasksFromDrivePDF:       (a) => extractTasksFromDrivePDF(S(a[0]), S(a[1]), S(a[2]), S(a[3])),
  getManagementLessonTasks: async (a, w) => {
    if (!w || w.role !== "Management") throw new Error("Management only.");
    return getManagementLessonTasks(S(a[0]), S(a[1]), S(a[2]));
  },
  saveTaskProgress:               (a) => saveTaskProgress(S(a[0]), a[1], S(a[2]), S(a[3])),
  regenerateTeluguForTask:        (a) => regenerateTeluguForTask(S(a[0]), S(a[1]), S(a[2]), S(a[3])),
  getSessionDetailedExplanation:  (a) => getSessionDetailedExplanation(S(a[0]), S(a[1]), S(a[2]), S(a[3]), !!a[4]),
  getManagementTimelineAuditReport: async (_a, w) => {
    if (!w || w.role !== "Management") throw new Error("Management only.");
    return getManagementTimelineAuditReport();
  },
  getSyllabusEditorData: async (_a, w) => {
    requireSyllabusManagement(w);
    return getSyllabusEditorData();
  },
  saveSyllabusLesson: async (a, w) => {
    requireSyllabusManagement(w);
    return saveSyllabusLesson(a[0]);
  },
  deleteSyllabusLesson: async (a, w) => {
    requireSyllabusManagement(w);
    return deleteSyllabusLesson(a[0]);
  },
  reorderSyllabusLessons: async (a, w) => {
    requireSyllabusManagement(w);
    return reorderSyllabusLessons(a[0]);
  },
  syncSpokenEnglishCatalog: async (a) => {
    return syncSpokenEnglishCatalog(a[0], a[1]);
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return errJson("POST only");
  let body: any; try { body = await req.json(); } catch { return errJson("Invalid JSON body"); }
  const fn = body.fn; const args = body.args || [];
  const h = HANDLERS[fn]; if (!h) return errJson("Unknown function: " + fn);
  try {
    const token = (req.headers.get("x-session-token") || "").trim();
    const syncSecret = (req.headers.get("x-sync-secret") || "").trim();
    const who = token ? (await db.rpc("whoami", { p_token: token })).data : null;
    const isSyncAuthorized = syncSecret && (syncSecret === (Deno.env.get("SPOKEN_SYNC_SECRET") || "sapthagiri-spoken-sync-2026"));
    if (!who && !isSyncAuthorized) return errJson("Not signed in or session expired.");
    const data = await h(args, who || { role: "SyncAgent" });
    return okJson(data);
  } catch (e) { return errJson(String((e as any)?.message || e)); }
});

// =============================================================================
// spoken-status.ts — pure helpers for Spoken English progress.
// No Deno / Supabase imports so it can be unit-tested directly (Vitest).
//
// RULE (single source of truth): a lesson's status is derived ONLY from its
// checklist task rows:
//     0 checked            → Pending      (FALSE)
//     1 … total-1 checked  → In Progress  (IN_PROGRESS)
//     all checked          → Completed    (TRUE, 100 %)
// A checklist item is identified by its task_key. Repeated stored rows for the same key
// (left behind by earlier syncs) are ONE item and are ticked / unticked together.
// =============================================================================

export type SpokenState = "TRUE" | "IN_PROGRESS" | "FALSE";

export interface SpokenTaskRow {
  task_key?: string | null;
  content?: string | null;
  checked?: boolean | null;
}

export interface SpokenTaskGroup {
  key: string;        // task_key — the identity of one checklist item
  content: string;    // the text teachers see (most frequent text stored for this key)
  keys: string[];     // always [key]; kept for callers that iterate keys
  checked: boolean;   // true only if EVERY stored row of this key is ticked
  rows: number;       // how many stored rows carry this key (old syncs left duplicates)
}

export function normalizeContent(v: unknown): string {
  return String(v == null ? "" : v).replace(/[\s\u200B-\u200D\uFEFF]+/g, " ").trim();
}

// One checklist item per task_key. The production table holds repeated rows for
// the same key (some with older/newer wording) — they are ONE item to a teacher,
// ticked or unticked together. Display text = the most frequent stored wording.
export function groupSpokenTasks(rows: SpokenTaskRow[]): SpokenTaskGroup[] {
  const byKey = new Map<string, { texts: Map<string, number>; first: string; rows: number; ticked: number }>();
  const order: string[] = [];
  for (const r of rows || []) {
    const key = String(r.task_key == null ? "" : r.task_key).trim();
    if (!key) continue;
    let g = byKey.get(key);
    if (!g) { g = { texts: new Map(), first: "", rows: 0, ticked: 0 }; byKey.set(key, g); order.push(key); }
    const text = normalizeContent(r.content);
    if (text) { g.texts.set(text, (g.texts.get(text) || 0) + 1); if (!g.first) g.first = text; }
    g.rows++;
    if (r.checked === true) g.ticked++;
  }
  return order.map((key) => {
    const g = byKey.get(key)!;
    let best = g.first, n = 0;
    for (const [t, c] of g.texts) if (c > n) { best = t; n = c; }
    return { key, content: best, keys: [key], checked: g.rows > 0 && g.ticked === g.rows, rows: g.rows };
  }).filter((g) => g.content);
}

export interface SpokenStatus {
  state: SpokenState;
  label: "Pending" | "In Progress" | "Completed";
  pct: number;
  done: number;
  total: number;
}

export function computeSpokenStatus(done: number, total: number): SpokenStatus {
  total = Math.max(0, Math.trunc(Number(total)) || 0);
  done = Math.min(total, Math.max(0, Math.trunc(Number(done)) || 0));
  if (total === 0) return { state: "FALSE", label: "Pending", pct: 0, done: 0, total: 0 };
  if (done >= total) return { state: "TRUE", label: "Completed", pct: 100, done, total };
  if (done > 0) {
    return { state: "IN_PROGRESS", label: "In Progress", pct: Math.max(1, Math.min(99, Math.round((done / total) * 100))), done, total };
  }
  return { state: "FALSE", label: "Pending", pct: 0, done: 0, total };
}

export function spokenStatusFromRows(rows: SpokenTaskRow[]): SpokenStatus {
  const groups = groupSpokenTasks(rows);
  return computeSpokenStatus(groups.filter((g) => g.checked).length, groups.length);
}

// ---- upload validation (used by the Management-only upload/publish handlers) --
export const SPOKEN_CLASS_RE = /^(Nursery|LKG|UKG|Class (?:[1-9]|1[0-2]))$/;
// Every upload gets a fresh random token, so two files can never share a path and
// an older file can never be picked up by mistake.
export const SPOKEN_ASSET_PATH_RE = /^spoken\/(Nursery|LKG|UKG|Class_(?:[1-9]|1[0-2]))_Day_(\d{1,3})_([a-z0-9]{10,24})\.(pdf|json)$/;

export function spokenAssetPath(cls: string, day: number, token: string, ext: "pdf" | "json"): string {
  return `spoken/${String(cls).replace(/\s+/g, "_")}_Day_${day}_${token}.${ext}`;
}

export function parseSpokenAssetPath(path: string): { cls: string; day: number; token: string; ext: string } | null {
  const m = SPOKEN_ASSET_PATH_RE.exec(String(path || ""));
  return m ? { cls: m[1].replace(/_/g, " "), day: Number(m[2]), token: m[3], ext: m[4] } : null;
}

// Only plain https YouTube links are accepted/shown.
export function isSafeVideoUrl(u: unknown): boolean {
  return /^https:\/\/(www\.)?(youtu\.be\/|youtube\.com\/)[^\s"'<>]{3,200}$/i.test(String(u || ""));
}

export function validateSpokenMeta(meta: any): string | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return "Lesson details must be an object.";
  const allowed = new Set(["title", "objective", "video_url", "pdf_url", "checklist"]);
  for (const k of Object.keys(meta)) if (!allowed.has(k)) return "Unexpected field in lesson details: " + k;
  for (const k of ["title", "objective"]) if (meta[k] != null && String(meta[k]).length > 600) return k + " is too long.";
  if (meta.video_url && !isSafeVideoUrl(meta.video_url)) return "The video link must be a https YouTube link.";
  if (meta.checklist != null && (!Array.isArray(meta.checklist) || meta.checklist.length > 12)) return "Invalid checklist in lesson details.";
  return null;
}

export type SpokenPublishMode = "new" | "replace";

export function validateSpokenLessonInput(l: any): string | null {
  if (!l || typeof l !== "object") return "Invalid lesson.";
  if (!SPOKEN_CLASS_RE.test(String(l.cls || ""))) return "Invalid class: " + String(l.cls);
  const day = Number(l.day);
  if (!Number.isInteger(day) || day < 1 || day > 200) return "Invalid day: " + String(l.day);
  const name = String(l.lessonName || "").trim();
  if (name.length < 5 || name.length > 200) return "Invalid lesson name.";
  if (!Array.isArray(l.checklist) || l.checklist.length < 1 || l.checklist.length > 12) return "A lesson needs 1–12 checklist items.";
  for (const c of l.checklist) {
    const t = normalizeContent(c);
    if (t.length < 3 || t.length > 500) return "A checklist item is empty or too long.";
  }
  const seen = new Set<string>();
  for (const c of l.checklist) {
    const k = normalizeContent(c).toLowerCase();
    if (seen.has(k)) return "Duplicate checklist item.";
    seen.add(k);
  }
  if (!/^https:\/\//i.test(String(l.pdfUrl || ""))) return "PDF link must be https.";
  const mode = l.mode == null ? "new" : l.mode;
  if (mode !== "new" && mode !== "replace") return "Invalid mode.";
  if (mode === "replace") {
    if (l.confirmReset !== true) return "Replacing a lesson requires the administrator's explicit confirmation.";
    if (l.expectedLessonId == null || String(l.expectedLessonId).trim() === "") return "Replacing a lesson requires the id of the lesson being replaced.";
  }
  return null;
}

// Legacy Drive-sync guard. Lessons published through the portal are "managed": the old sync may not
// create, update or delete them OR their checklist rows. The sync deletes/replaces task rows by
// task_key (SPOKEN::<class>::<day>::CHK::<n>), so tasks are filtered by that key's class+Day as well
// as by lesson name.
export function filterLegacySyncPayload(
  lessons: any[], tasks: any[] | undefined,
  managed: { class: string; name: string; lesson_no: unknown }[],
  dayOf: (v: any) => string | number,
): { lessons: any[]; tasks: any[] | undefined } {
  const S = (v: unknown) => String(v ?? "").trim();
  const days = new Set(managed.map((m) => `${S(m.class)}|${String(dayOf(m.lesson_no))}`));
  const names = new Set(managed.map((m) => `${S(m.class)}|${S(m.name)}`));
  const keyDay = (k: string) => { const m = /^SPOKEN::(.+?)::(\d+)::CHK::\d+$/.exec(S(k)); return m ? `${m[1]}|${String(dayOf(m[2]))}` : ""; };
  return {
    lessons: lessons.filter((l) => !days.has(`${S(l.class)}|${String(dayOf(l.lesson_no || l.day))}`)),
    tasks: Array.isArray(tasks) ? tasks.filter((t) => {
      const kd = keyDay(t.task_key || t.taskKey);
      return !names.has(`${S(t.class)}|${S(t.lesson_name || t.lessonName)}`)
        && !days.has(`${S(t.class)}|${String(dayOf(t.lesson_no || t.day))}`) && !(kd && days.has(kd));
    }) : tasks,
  };
}

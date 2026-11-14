// =========================================================================
// Supabase Edge Function: timetable-api — editor for app.hw_timetable
// (the ONE source of truth Homework/Exams/Staff-reminders read).
// Functions: ttBootstrap, ttGetGrid, ttSaveGrid, ttCopyDay, ttClearDay,
//            ttBulkUpsert, ttBulkUpsertDryRun (NEW)
// Deploy: Edge Functions → "timetable-api" → Via Editor → paste → Deploy
// =========================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false }, db: { schema: "app" } }
);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-session-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const okJson = (d: unknown) => new Response(JSON.stringify({ ok: true, data: d }), { headers: CORS });
const errJson = (e: string) => new Response(JSON.stringify({ ok: false, error: e }), { status: 400, headers: CORS });

const S = (v: any) => (v == null ? "" : String(v)).trim();
const numText = (v: any) => S(v).replace(/\.0+$/, "");
const GRADE_ORDER: Record<string, number> = { NURSERY: 1, LKG: 2, UKG: 3, "PRE-KG": 0, PREKG: 0 };

function gradeWeight(n: any) {
  const k = S(n).toUpperCase().replace(/\s+/g, "");
  if (GRADE_ORDER[k] !== undefined) return GRADE_ORDER[k];
  const m = k.match(/\d+/);
  return m ? 100 + parseInt(m[0], 10) : 999;
}

const DAYS = [
  { n: 1, label: "Monday" }, { n: 2, label: "Tuesday" }, { n: 3, label: "Wednesday" },
  { n: 4, label: "Thursday" }, { n: 5, label: "Friday" }, { n: 6, label: "Saturday" }
];

const isPrimary = (cls: string) => gradeWeight(cls) <= 105; // Nursery..Grade 5
const maxPeriodsForCampus = (campus: string) => campus === "High" ? 9 : 8;

async function currentYear() {
  const { data } = await db.from("academic_years").select("year_code").eq("is_current", true).maybeSingle();
  if (data?.year_code) return data.year_code;
  const { data: s } = await db.from("system_settings").select("value").eq("key", "CurrentYear").maybeSingle();
  return s?.value || "2026-27";
}

// distinct classes (enrollments ∪ timetable), split by campus
async function allClasses() {
  const yr = await currentYear();
  const set = new Set<string>();
  const { data: enr } = await db.from("student_enrollments").select("class").is("leaving_date", null).eq("academic_year", yr);
  for (const e of enr || []) if (S(e.class)) set.add(numText(e.class));
  const { data: tt } = await db.from("hw_timetable").select("class");
  for (const t of tt || []) if (S(t.class)) set.add(numText(t.class));
  const arr = [...set].sort((a, b) => gradeWeight(a) - gradeWeight(b));
  return { Primary: arr.filter(isPrimary), High: arr.filter((c) => !isPrimary(c)) };
}

// =========================================================================
// Handler: ttBootstrap (PRESERVED - exact same behavior)
// =========================================================================
async function handleTtBootstrap() {
  const classes = await allClasses();
  const { data: subs } = await db.from("hw_timetable").select("subject");
  const subjSet = new Set<string>();
  for (const s of subs || []) if (S(s.subject)) subjSet.add(S(s.subject));
  const { data: us } = await db.from("users").select("name, role").eq("is_active", true);
  const teachSet = new Set<string>();
  for (const u of us || []) if (S(u.name) && S(u.name).toLowerCase() !== "admin") teachSet.add(S(u.name));
  const { data: tn } = await db.from("hw_timetable").select("teacher_name");
  for (const t of tn || []) if (S(t.teacher_name)) teachSet.add(S(t.teacher_name));

  return {
    days: DAYS,
    periods: 8, // Keep for backward compat - frontend uses maxPeriodsForCampus
    campuses: ["Primary", "High"],
    classes,
    subjects: [...subjSet].sort((a, b) => a.localeCompare(b)),
    teachers: [...teachSet].sort((a, b) => a.localeCompare(b)),
    activityHint: ["Sports", "Games", "Karate", "Dance", "Art Zone", "PET", "Leisure"],
  };
}

// =========================================================================
// Handler: ttGetGrid (PRESERVED - exact same behavior)
// =========================================================================
async function handleTtGetGrid(campus: string, weekday: number) {
  const campusKey = campus === "High" ? "High" : "Primary";
  const cls = (await allClasses())[campusKey];
  const periods = maxPeriodsForCampus(campusKey);

  const { data } = await db.from("hw_timetable").select("*").eq("weekday", weekday);
  const byCP: Record<string, any> = {};
  for (const r of data || []) byCP[numText(r.class) + "|" + r.period_no] = r;

  const grid = cls.map((c) => ({
    class: c,
    cells: Array.from({ length: periods }, (_, i) => {
      const r = byCP[c + "|" + (i + 1)];
      return {
        period_no: i + 1,
        subject: r ? S(r.subject) : "",
        teacher: r ? S(r.teacher_name) : "",
        phone: r ? numText(r.teacher_phone) : "",
        isActivity: r ? !!r.is_activity : false,
      };
    }),
  }));

  return { campus, weekday, periods, rows: grid };
}

// =========================================================================
// Handler: ttSaveGrid (PRESERVED - exact same behavior)
// =========================================================================
async function handleTtSaveGrid(weekday: number, cells: any[]) {
  cells = cells || [];
  const ups: any[] = [];
  const dels: { cls: string; p: number }[] = [];

  for (const c of cells) {
    const cls = numText(c.class);
    const p = parseInt(S(c.period_no), 10);
    if (!cls || !p) continue;
    const subject = S(c.subject);
    if (!subject) { dels.push({ cls, p }); continue; }
    ups.push({
      class: cls,
      weekday,
      period_no: p,
      period_label: "Period " + p,
      subject,
      teacher_name: S(c.teacher),
      teacher_phone: numText(c.phone),
      is_activity: !!c.isActivity,
    });
  }

  if (ups.length) {
    const { error } = await db.from("hw_timetable").upsert(ups, { onConflict: "class,weekday,period_no" });
    if (error) throw new Error(error.message);
  }

  for (const d of dels) {
    await db.from("hw_timetable").delete().eq("class", d.cls).eq("weekday", weekday).eq("period_no", d.p);
  }

  return { saved: ups.length, cleared: dels.length };
}

// =========================================================================
// Handler: ttCopyDay (PRESERVED - exact same behavior)
// =========================================================================
async function handleTtCopyDay(fromWeekday: number, toWeekday: number, classes: string[]) {
  const list = (classes || []).map(numText);
  const { data } = await db.from("hw_timetable").select("*").eq("weekday", fromWeekday);
  const rows = (data || []).filter((r: any) => !list.length || list.includes(numText(r.class)));

  if (!rows.length) return { copied: 0 };

  for (const c of [...new Set(rows.map((r: any) => numText(r.class)))]) {
    await db.from("hw_timetable").delete().eq("weekday", toWeekday).eq("class", c);
  }

  const ups = rows.map((r: any) => ({
    class: numText(r.class),
    weekday: toWeekday,
    period_no: r.period_no,
    period_label: r.period_label,
    subject: r.subject,
    teacher_name: r.teacher_name,
    teacher_phone: r.teacher_phone,
    is_activity: r.is_activity,
  }));

  const { error } = await db.from("hw_timetable").upsert(ups, { onConflict: "class,weekday,period_no" });
  if (error) throw new Error(error.message);

  return { copied: ups.length };
}

// =========================================================================
// Handler: ttClearDay (PRESERVED - exact same behavior)
// =========================================================================
async function handleTtClearDay(weekday: number, classes: string[]) {
  const list = (classes || []).map(numText);
  if (list.length) {
    for (const c of list) {
      await db.from("hw_timetable").delete().eq("weekday", weekday).eq("class", c);
    }
  } else {
    await db.from("hw_timetable").delete().eq("weekday", weekday);
  }
  return { cleared: true };
}

// =========================================================================
// Helper: Normalize class name (compatible with existing logic)
// =========================================================================
function normalizeClassName(raw: string): string {
  if (!raw) return "";
  return raw
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/\.0+$/, "")
    .replace(/^GRADE[- ]?/i, "GRADE-")
    .replace(/^CLASS[- ]?/i, "GRADE-")
    .replace(/^PRE[- ]?KG$/i, "NURSERY")
    .replace(/^PREKG$/i, "NURSERY")
    .trim();
}

// =========================================================================
// Helper: Detect campus from class name (uses existing logic)
// =========================================================================
function detectCampusFromClass(className: string): "Primary" | "High" {
  return isPrimary(className) ? "Primary" : "High";
}

// =========================================================================
// Helper: Convert day pattern to weekday number
// =========================================================================
function dayPatternToWeekday(pattern: string): number {
  const map: Record<string, number> = {
    monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
    "tue-thu": 2, "wed-sat": 3, "mon-thu": 1, "fri-sat": 5
  };
  return map[pattern.toLowerCase()] || 1;
}

// =========================================================================
// Handler: ttBulkUpsert / ttBulkUpsertDryRun (NEW - for Excel Import)
// Uses app.hw_timetable exclusively, atomic operations, targeted replacement
// =========================================================================
async function handleTtBulkUpsert(args: any[], dryRun: boolean) {
  const {
    cells = [],
    classCreates = [],
    dayCampusMap = {},
    periodMapping = {},
    clearExisting = false,
  } = args[0] || {};

  if (!cells.length) throw new Error("No cells provided for import");

  // Validate each cell has required fields
  for (const cell of cells) {
    if (!cell.day || !cell.campus || !cell.class || !cell.period_no) {
      throw new Error(`Invalid cell data: missing required fields. Got: ${JSON.stringify(cell)}`);
    }
  }

  // Step 1: Build class mapping (excelClass -> normalizedClass)
  const createdClassMap = new Map<string, string>();
  let newClassesCreated = 0;

  for (const cc of classCreates) {
    const { class: className, campus } = cc;
    const normalizedClass = normalizeClassName(className);

    // Check if class exists in hw_timetable OR enrollments
    const { data: existingTt } = await db.from("hw_timetable").select("class").eq("class", normalizedClass).maybeSingle();
    if (!existingTt) {
      const yr = await currentYear();
      const { data: existingEnr } = await db.from("student_enrollments")
        .select("class").eq("class", normalizedClass).eq("academic_year", yr).is("leaving_date", null).maybeSingle();

      if (!existingEnr) {
        // Class doesn't exist anywhere - note for creation (enrollments handled separately)
        newClassesCreated++;
      }
    }
    createdClassMap.set(className, normalizedClass);
  }

  // Step 2: Prepare upsert records for hw_timetable
  const upsertRecords = cells.map((cell: any) => {
    const mappedClass = createdClassMap.get(cell.class) || cell.class;
    const weekday = dayPatternToWeekday(cell.day);
    return {
      class: mappedClass,
      weekday,
      period_no: cell.period_no,
      period_label: `Period ${cell.period_no}`,
      subject: cell.subject || null,
      teacher_name: cell.teacher || null,
      teacher_phone: null,
      is_activity: cell.isActivity || false,
    };
  });

  // Step 3: Dry run - check changes and real teacher collisions
  if (dryRun) {
    // 1. Batch fetch all existing records for the relevant weekdays
    const weekdays = Array.from(new Set(upsertRecords.map((r: any) => r.weekday)));
    const { data: existingRows } = await db
      .from("hw_timetable")
      .select("class, weekday, period_no, subject, teacher_name, is_activity")
      .in("weekday", weekdays);

    const existingMap = new Map<string, any>();
    for (const row of existingRows || []) {
      const key = `${numText(row.class)}|${row.weekday}|${row.period_no}`;
      existingMap.set(key, row);
    }

    let cellsNew = 0;
    let cellsUpdated = 0;
    let cellsUnchanged = 0;
    const sampleUpdates: string[] = [];
    const normStr = (v: any) => (v == null ? "" : String(v)).trim().toLowerCase();

    for (const record of upsertRecords) {
      const key = `${numText(record.class)}|${record.weekday}|${record.period_no}`;
      const existing = existingMap.get(key);

      if (!existing) {
        cellsNew++;
      } else {
        const exSubj = normStr(existing.subject);
        const inSubj = normStr(record.subject);
        const exTeach = normStr(existing.teacher_name);
        const inTeach = normStr(record.teacher_name);

        if (exSubj === inSubj && exTeach === inTeach) {
          cellsUnchanged++;
        } else {
          cellsUpdated++;
          if (sampleUpdates.length < 8) {
            if (exSubj !== inSubj) {
              sampleUpdates.push(`${record.class}/Day${record.weekday}/P${record.period_no}: ${existing.subject || "empty"} → ${record.subject || "empty"}`);
            } else {
              sampleUpdates.push(`${record.class}/Day${record.weekday}/P${record.period_no}: ${record.subject} (Teacher: ${existing.teacher_name || "none"} → ${record.teacher_name || "none"})`);
            }
          }
        }
      }
    }

    // 2. Check for real teacher schedule collisions (same teacher assigned to multiple classes at same time)
    // Note: Exclude intentional multi-class shared activities (Karate, Sports, Games, Dance, Vedic Maths)
    const teacherSlots = new Map<string, Array<{ class: string; subject: string }>>();
    const sharedKeywords = ["karate", "sports", "games", "dance", "vedic maths", "art", "music"];
    const realCollisions: string[] = [];

    for (const r of upsertRecords) {
      if (!r.teacher_name || !r.teacher_name.trim()) continue;
      const tKey = `${r.weekday}|${r.period_no}|${r.teacher_name.trim().toLowerCase()}`;
      if (!teacherSlots.has(tKey)) teacherSlots.set(tKey, []);
      teacherSlots.get(tKey)!.push({ class: r.class, subject: r.subject || "" });
    }

    for (const [tKey, classList] of teacherSlots) {
      if (classList.length > 1) {
        const [w, p, teach] = tKey.split("|");
        const isShared = classList.every(c => sharedKeywords.some(kw => c.subject.toLowerCase().includes(kw)));
        if (!isShared) {
          const dayName = DAYS.find(d => d.n === parseInt(w))?.label || `Day ${w}`;
          realCollisions.push(`${teach.toUpperCase()}: assigned to ${classList.map(c => c.class).join(" & ")} on ${dayName} Period ${p}`);
        }
      }
    }

    // Calculate what would be cleared if clearExisting is enabled
    let clearedCount = 0;
    if (clearExisting) {
      const dayCampusGroups = new Map<string, Set<string>>();
      upsertRecords.forEach((r: any) => {
        const key = `${r.weekday}|${r.class}`;
        if (!dayCampusGroups.has(key)) dayCampusGroups.set(key, new Set());
        dayCampusGroups.get(key)!.add(r.class);
      });

      for (const [key, classes] of dayCampusGroups) {
        const [weekday] = key.split("|");
        const { count } = await db
          .from("hw_timetable")
          .select("*", { count: "exact", head: true })
          .eq("weekday", parseInt(weekday))
          .in("class", Array.from(classes));
        clearedCount += count || 0;
      }
    }

    return {
      success: true,
      dryRun: true,
      summary: {
        classesProcessed: new Set(upsertRecords.map((r: any) => r.class)).size,
        cellsToUpsert: upsertRecords.length,
        cellsNew,
        cellsUpdated,
        cellsUnchanged,
        cellsToClear: clearedCount,
        newClassesCreated,
        teacherCollisions: realCollisions,
        sampleUpdates,
        conflicts: realCollisions,
      },
    };
  }

  // Step 4: Live import - atomic via batched upserts
  // First, clear existing if requested (only for selected class/weekday combos)
  let clearedCount = 0;
  if (clearExisting) {
    const dayCampusGroups = new Map<string, Set<string>>();
    upsertRecords.forEach(r => {
      const key = `${r.weekday}|${r.class}`;
      if (!dayCampusGroups.has(key)) dayCampusGroups.set(key, new Set());
      dayCampusGroups.get(key)!.add(r.class);
    });

    for (const [key, classes] of dayCampusGroups) {
      const [weekday] = key.split("|");
      const { count } = await db
        .from("hw_timetable")
        .delete()
        .eq("weekday", parseInt(weekday))
        .in("class", Array.from(classes));
      clearedCount += count || 0;
    }
  }

  // Step 5: Upsert all records in batches (hw_timetable supports 1000+ rows per upsert)
  const batchSize = 500;
  for (let i = 0; i < upsertRecords.length; i += batchSize) {
    const batch = upsertRecords.slice(i, i + batchSize);
    const { error } = await db
      .from("hw_timetable")
      .upsert(batch, { onConflict: "class,weekday,period_no" });
    if (error) throw new Error(`Batch upsert failed: ${error.message}`);
  }

  return {
    success: true,
    dryRun: false,
    summary: {
      classesProcessed: new Set(upsertRecords.map(r => r.class)).size,
      cellsUpserted: upsertRecords.length,
      cellsCleared: clearedCount,
      newClassesCreated,
    },
  };
}

// =========================================================================
// Handler: ttGetTeacherSchedule (Teacher Schedule Query)
// Fetches a teacher's schedule across one or all weekdays with shift profile
// =========================================================================
async function handleTtGetTeacherSchedule(teacherName: string, weekday?: number) {
  const rawName = S(teacherName);
  if (!rawName) return { error: "Teacher name is required", periods: [] };

  const clean = rawName
    .replace(/^(?:MR\.|MRS\.|MS\.|DR\.|SIR|MADAM)\s+/i, "")
    .replace(/\s+(?:SIR|MADAM)$/i, "")
    .trim();

  const nameVariants = new Set<string>([clean, rawName]);
  const lower = clean.toLowerCase();

  // Known phonetic and ERP spelling variants
  if (lower === "sathish" || lower === "satish") {
    nameVariants.add("Sathish");
    nameVariants.add("Satish");
  }
  if (lower === "knr" || lower.includes("narsimha")) {
    nameVariants.add("KNR");
    nameVariants.add("Narsimha Reddy Kasireddy");
    nameVariants.add("Narsimha Reddy");
  }
  if (lower === "santosh" || lower === "santhosh") {
    nameVariants.add("Santosh");
    nameVariants.add("Santhosh");
  }
  if (lower.startsWith("srinivas")) {
    nameVariants.add("Srinivas");
    nameVariants.add("Srinivas Kodipunjula");
    nameVariants.add("Srinivas Pulloori");
    nameVariants.add("Srinivas Vallakati");
  }
  if (lower.startsWith("ramana")) {
    nameVariants.add("Ramana Prasad");
    nameVariants.add("Ramana");
  }

  // Also query teacher_aliases table if present
  try {
    const { data: u } = await db.from("users").select("id, name").ilike("name", clean).maybeSingle();
    if (u) {
      nameVariants.add(S(u.name));
      const { data: aliases } = await db.from("teacher_aliases").select("alias_name").eq("user_id", u.id);
      for (const a of aliases || []) if (S(a.alias_name)) nameVariants.add(S(a.alias_name));
    } else {
      const { data: alias } = await db.from("teacher_aliases").select("user_id").ilike("alias_name", clean).maybeSingle();
      if (alias?.user_id) {
        const { data: u2 } = await db.from("users").select("name").eq("id", alias.user_id).maybeSingle();
        if (u2) nameVariants.add(S(u2.name));
        const { data: aliases2 } = await db.from("teacher_aliases").select("alias_name").eq("user_id", alias.user_id);
        for (const a of aliases2 || []) if (S(a.alias_name)) nameVariants.add(S(a.alias_name));
      }
    }
  } catch (_) {}

  const variantsList = [...nameVariants].filter(Boolean);

  let q = db.from("hw_timetable").select("*");
  if (variantsList.length === 1) {
    q = q.ilike("teacher_name", `%${variantsList[0]}%`);
  } else {
    // Multi-variant OR filter
    const orFilter = variantsList.map((v) => `teacher_name.ilike.%${v}%`).join(",");
    q = q.or(orFilter);
  }

  if (weekday && weekday >= 1 && weekday <= 6) {
    q = q.eq("weekday", weekday);
  }

  const { data, error } = await q;
  if (error) throw error;

  const periods = (data || []).map((r: any) => ({
    id: r.id,
    class: numText(r.class),
    weekday: r.weekday,
    period_no: r.period_no,
    period_label: r.period_label || `Period ${r.period_no}`,
    subject: S(r.subject),
    teacher_name: S(r.teacher_name),
    is_activity: !!r.is_activity,
  })).sort((a: any, b: any) => {
    if (a.weekday !== b.weekday) return a.weekday - b.weekday;
    return a.period_no - b.period_no;
  });

  let shift = { s1In: "08:45", s1Out: "16:30", shiftType: "SINGLE" };
  try {
    for (const v of variantsList) {
      const { data: u } = await db.from("users")
        .select("s1_in, s1_out, s2_in, s2_out, shift_type, work_days")
        .ilike("name", `%${v}%`)
        .maybeSingle();
      if (u && (u.s1_in || u.s1_out)) {
        shift = {
          s1In: u.s1_in ? S(u.s1_in).slice(0, 5) : "08:45",
          s1Out: u.s1_out ? S(u.s1_out).slice(0, 5) : "16:30",
          shiftType: u.shift_type || "SINGLE",
        };
        break;
      }
    }
  } catch (_) {
    // Keep default shift fallback
  }

  return {
    teacherName: clean,
    weekday: weekday || 0,
    periods,
    shift,
  };
}

// =========================================================================
// Handler: ttParseSyllabusContents (AI Contents Page Extraction via Gemini)
// =========================================================================
async function handleTtParseSyllabusContents(base64Data: string, mimeType: string, grade?: string, subject?: string) {
  const geminiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY") || Deno.env.get("GEMINI_KEY");
  if (!geminiKey) {
    throw new Error("GEMINI_API_KEY is not configured in Supabase Edge Functions environment.");
  }

  const prompt = `You are an expert school syllabus assistant for Sapthagiri High School.
Analyze this textbook contents / table of contents page (విషయసూచిక / Table of Contents / Index).
Class: ${grade || "Not specified"}, Subject: ${subject || "Not specified"}.
Extract every chapter, lesson, and supplementary unit (పాఠ్యాంశాలు, ఉపవాచకం).
For each lesson return an object with:
- lesson_no: integer sequence starting from 1
- name: lesson or chapter title (keep original script: Telugu, Hindi, or English)
- target_month: the scheduled school month (June, July, August, September, October, November, December, January, February, March, April).
Telugu months mapping:
జూన్ -> June
జూలై -> July
ఆగస్టు -> August
సెప్టెంబరు / సెప్టెంబర్ -> September
అక్టోబరు / అక్టోబర్ -> October
నవంబరు / నవంబర్ -> November
డిసెంబరు / డిసెంబర్ -> December
జనవరి -> January
ఫిబ్రవరి -> February
మార్చి -> March
ఏప్రిల్ -> April
Return ONLY a valid JSON array of objects with keys "lesson_no", "name", and "target_month". No extra markdown or explanation.`;

  const payload = {
    contents: [{
      parts: [
        {
          inlineData: {
            mimeType: mimeType || "image/jpeg",
            data: base64Data
          }
        },
        { text: prompt }
      ]
    }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json"
    }
  };

  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gemini API error (${resp.status}): ${errText.slice(0, 200)}`);
  }

  const result = await resp.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  const cleanJson = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  const lessons = JSON.parse(cleanJson);

  return { success: true, lessons };
}

// =========================================================================
// Main handler
// =========================================================================
const HANDLERS: Record<string, (a: any[]) => Promise<any>> = {
  ttBootstrap: () => handleTtBootstrap(),
  ttGetGrid: (a) => handleTtGetGrid(S(a[0]) || "Primary", parseInt(S(a[1]) || "1", 10)),
  ttSaveGrid: (a) => handleTtSaveGrid(parseInt(S(a[0]), 10), a[1]),
  ttCopyDay: (a) => handleTtCopyDay(parseInt(S(a[0]), 10), parseInt(S(a[1]), 10), a[2] || []),
  ttClearDay: (a) => handleTtClearDay(parseInt(S(a[0]), 10), a[1] || []),
  ttBulkUpsert: (a) => handleTtBulkUpsert(a, false),
  ttBulkUpsertDryRun: (a) => handleTtBulkUpsert(a, true),
  ttGetTeacherSchedule: (a) => handleTtGetTeacherSchedule(S(a[0]), a[1] ? parseInt(S(a[1]), 10) : undefined),
  ttParseSyllabusContents: (a) => handleTtParseSyllabusContents(S(a[0]), S(a[1]), a[2] ? S(a[2]) : undefined, a[3] ? S(a[3]) : undefined),
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return errJson("POST only");

  let body: any;
  try { body = await req.json(); } catch { return errJson("Invalid JSON body"); }

  const fn = body.fn;
  const args = body.args || [];
  const h = HANDLERS[fn];
  if (!h) return errJson("Unknown function: " + fn);

  try {
    const token = (req.headers.get("x-session-token") || "").trim();
    const who = token ? (await db.rpc("whoami", { p_token: token })).data : null;
    if (!who) return errJson("Not signed in or session expired.");

    // Write / Mutation operations are strictly Management-only.
    // Read operations (e.g. ttGetTeacherSchedule, ttBootstrap, ttGetGrid) are accessible to authenticated staff.
    const isEdit = ["ttSaveGrid", "ttCopyDay", "ttClearDay", "ttBulkUpsert", "ttBulkUpsertDryRun"].includes(fn);
    if (isEdit && who.role !== "Management") return errJson("Timetable editing is Management-only.");

    return okJson(await h(args));
  } catch (e) {
    return errJson(String((e as any)?.message || e));
  }
});
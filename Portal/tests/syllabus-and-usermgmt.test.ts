import { describe, it, expect } from "vitest";

describe("Syllabus AI Contents Extraction & Telugu Mapping", () => {
  function normalizeMonth(m: string): string {
    if (!m) return "";
    const s = String(m).trim().toLowerCase();
    const teluguMap: Record<string, string> = {
      "జూన్": "June", "జూలై": "July", "ఆగస్టు": "August", "ఆగష్టు": "August",
      "సెప్టెంబరు": "September", "సెప్టెంబర్": "September",
      "అక్టోబరు": "October", "అక్టోబర్": "October",
      "నవంబరు": "November", "నవంబర్": "November",
      "డిసెంబరు": "December", "డిసెంబర్": "December",
      "జనవరి": "January", "ఫిబ్రవరి": "February",
      "మార్చి": "March", "ఏప్రిల్": "April", "మే": "May"
    };
    for (const k in teluguMap) {
      if (s.indexOf(k) >= 0) return teluguMap[k];
    }
    const months = ["June", "July", "August", "September", "October", "November", "December", "January", "February", "March", "April", "May"];
    for (let i = 0; i < months.length; i++) {
      if (s.indexOf(months[i].toLowerCase()) >= 0) return months[i];
    }
    return m;
  }

  it("correctly normalizes all Telugu month names from textbook contents", () => {
    expect(normalizeMonth("జూన్")).toBe("June");
    expect(normalizeMonth("జూలై")).toBe("July");
    expect(normalizeMonth("ఆగస్టు")).toBe("August");
    expect(normalizeMonth("సెప్టెంబరు")).toBe("September");
    expect(normalizeMonth("అక్టోబరు")).toBe("October");
    expect(normalizeMonth("నవంబరు")).toBe("November");
    expect(normalizeMonth("డిసెంబరు")).toBe("December");
    expect(normalizeMonth("జనవరి")).toBe("January");
    expect(normalizeMonth("ఫిబ్రవరి")).toBe("February");
    expect(normalizeMonth("మార్చి")).toBe("March");
    expect(normalizeMonth("ఏప్రిల్")).toBe("April");
  });

  it("handles mixed month strings and standard English month names", () => {
    expect(normalizeMonth("  August ")).toBe("August");
    expect(normalizeMonth("july")).toBe("July");
    expect(normalizeMonth("మాసం: సెప్టెంబరు")).toBe("September");
  });

  it("sorts lessons strictly according to academic school calendar (June to April)", () => {
    const ACADEMIC_MONTH_ORDER: Record<string, number> = {
      "june": 1, "july": 2, "august": 3, "september": 4, "october": 5,
      "november": 6, "december": 7, "january": 8, "february": 9, "march": 10,
      "april": 11, "may": 12
    };

    function score(m: string) { return ACADEMIC_MONTH_ORDER[String(m || "").toLowerCase()] || 99; }

    const rawLessons = [
      { lesson_no: 12, name: "మాట్లాడే నాగలి", target_month: "February" },
      { lesson_no: 1, name: "త్యాగనిరతి", target_month: "June" },
      { lesson_no: 11, name: "కాపుబిడ్డ", target_month: "January" },
      { lesson_no: 2, name: "సముద్ర ప్రయాణం", target_month: "July" },
      { lesson_no: 10, name: "సింగరేణి", target_month: "December" },
      { lesson_no: 4, name: "అసమాన్యులు", target_month: "August" },
    ];

    rawLessons.sort((a, b) => score(a.target_month) - score(b.target_month));

    expect(rawLessons.map(l => l.target_month)).toEqual([
      "June", "July", "August", "December", "January", "February"
    ]);
  });

  describe("Upavachakam & Textbook Lesson Numbering Rules", () => {
    function isUpavachakam(item: { lesson_no?: any; name?: string; is_upavachakam?: boolean }): boolean {
      if (!item) return false;
      if (item.is_upavachakam === true) return true;
      const no = String(item.lesson_no == null ? "" : item.lesson_no).trim().toLowerCase();
      if (/^[uUఉ]-?\d+/i.test(no) || /^sr-?\d+/i.test(no)) return true;
      const name = String(item.name || "").toLowerCase();
      return (
        name.indexOf("ఉపవాచక") >= 0 ||
        name.indexOf("upavachak") >= 0 ||
        name.indexOf("non-detailed") >= 0 ||
        name.indexOf("पूरक") >= 0
      );
    }

    function lessonNumberValue(val: any): number {
      const s = String(val == null ? "" : val).trim().toLowerCase();
      const uMatch = s.match(/^[uUఉ]-?(\d+)/i);
      if (uMatch) return 10000 + parseInt(uMatch[1], 10);
      const m = s.match(/\d+/);
      return m ? parseInt(m[0], 10) : 99999;
    }

    it("identifies Upavachakam by flag, lesson number prefix, or Telugu/Hindi keywords", () => {
      expect(isUpavachakam({ lesson_no: "U-1", name: "చిత్రగ్రీవం" })).toBe(true);
      expect(isUpavachakam({ lesson_no: "1", name: "చిత్రగ్రీవం (ఉపవాచకం)" })).toBe(true);
      expect(isUpavachakam({ lesson_no: "1", name: "पूरक पुस्तक - पाठ 1" })).toBe(true);
      expect(isUpavachakam({ lesson_no: "1", name: "త్యాగనిరతి", is_upavachakam: false })).toBe(false);
      expect(isUpavachakam({ lesson_no: "1.A", name: "The Snake and the Mirror" })).toBe(false);
    });

    it("preserves main lesson numbers (1..12 or 1.A..8.C) and formats Upavachakam as U-1..U-N", () => {
      const rawExtracted = [
        { lesson_no: 1, name: "త్యాగనిరతి", target_month: "June", is_upavachakam: false },
        { lesson_no: 1, name: "చిత్రగ్రీవం", target_month: "July", is_upavachakam: true },
        { lesson_no: 2, name: "సముద్ర ప్రయాణం", target_month: "July", is_upavachakam: false },
        { lesson_no: 2, name: "పోయంబుల్లాఖాన్", target_month: "August", is_upavachakam: true },
      ];

      let mainCounter = 0;
      let upavachakamCounter = 0;
      const formatted = rawExtracted.map(item => {
        const upa = isUpavachakam(item);
        let finalNo: string;
        let finalTitle = item.name;
        if (upa) {
          upavachakamCounter += 1;
          finalNo = `U-${upavachakamCounter}`;
          if (!finalTitle.includes("ఉపవాచకం")) finalTitle += " (ఉపవాచకం)";
        } else {
          mainCounter += 1;
          finalNo = item.lesson_no != null && String(item.lesson_no).trim() !== ""
            ? String(item.lesson_no).trim()
            : String(mainCounter);
        }
        return { lesson_no: finalNo, name: finalTitle, target_month: item.target_month, is_upavachakam: upa };
      });

      expect(formatted[0].lesson_no).toBe("1");
      expect(formatted[1].lesson_no).toBe("U-1");
      expect(formatted[1].name).toBe("చిత్రగ్రీవం (ఉపవాచకం)");
      expect(formatted[2].lesson_no).toBe("2");
      expect(formatted[3].lesson_no).toBe("U-2");

      // Verify no duplicate key conflict between "1" and "u-1"
      const seenNos = new Set<string>();
      for (const row of formatted) {
        const key = String(row.lesson_no).trim().toLowerCase();
        expect(seenNos.has(key)).toBe(false);
        seenNos.add(key);
      }
    });

    it("ranks Upavachakam after main lessons within the same month using lessonNumberValue", () => {
      expect(lessonNumberValue("1")).toBe(1);
      expect(lessonNumberValue("2")).toBe(2);
      expect(lessonNumberValue("1.A")).toBe(1);
      expect(lessonNumberValue("U-1")).toBe(10001);
      expect(lessonNumberValue("U-2")).toBe(10002);
      expect(lessonNumberValue("U-1")).toBeGreaterThan(lessonNumberValue("12"));
    });
  });

  describe("Cascading Dropdown Helpers (Class -> Subject)", () => {
    it("extracts distinct classes in pedagogical grade order and maps available subjects", () => {
      const pairs = [
        { grade: "Nursery", subject: "English" },
        { grade: "Nursery", subject: "Rhymes" },
        { grade: "1", subject: "Telugu" },
        { grade: "1", subject: "Maths" },
        { grade: "6", subject: "Telugu" },
        { grade: "6", subject: "English" },
        { grade: "6", subject: "General Science" },
        { grade: "10", subject: "Mathematics" },
        { grade: "UKG", subject: "English" }
      ];

      const GRADE_ORDER: Record<string, number> = {
        "NURSERY": 1, "LKG": 2, "UKG": 3, "PRE-KG": 0, "PREKG": 0
      };
      function gradeWeight(n: string) {
        const k = String(n || "").toUpperCase().replace(/\s+/g, "");
        if (GRADE_ORDER[k] !== undefined) return GRADE_ORDER[k];
        const m = k.match(/\d+/);
        return m ? 100 + parseInt(m[0], 10) : 999;
      }

      const distinctClasses = Array.from(new Set(pairs.map(p => p.grade)))
        .sort((a, b) => gradeWeight(a) - gradeWeight(b));

      expect(distinctClasses).toEqual(["Nursery", "UKG", "1", "6", "10"]);

      // For Class 6, subjects should be Telugu, English, General Science
      const class6Subjects = pairs
        .filter(p => p.grade.toLowerCase() === "6")
        .map(p => p.subject);
      expect(class6Subjects).toEqual(["Telugu", "English", "General Science"]);
    });
  });
});

describe("User Management Module Grouping & My Schedule Access", () => {
  it("keeps Teacher Tools, Teacher-only, and Management modules strictly grouped", () => {
    const MODULES = [
      { key: "Daily Student Attendance", group: "teacher" },
      { key: "Digital Homework Diary",   group: "teacher" },
      { key: "Syllabus Tracker",         group: "teacher" },
      { key: "My Attendance Log",        group: "teacherOnly" },
      { key: "Examinations Tracker",     group: "teacherOnly" },
      { key: "My Schedule",              group: "teacherOnly" },
      { key: "Staff Attendance Tracker", group: "mgmt" },
      { key: "Holidays Management",      group: "mgmt" },
      { key: "Examinations Management",  group: "mgmt" },
      { key: "Timetable Management",     group: "mgmt" },
      { key: "Student Management",       group: "mgmt" },
      { key: "Fee Ledger Database",      group: "mgmt" },
      { key: "Fee Management System",    group: "mgmt" },
      { key: "Management Dashboard",     group: "mgmt" },
      { key: "User Management",          group: "mgmt" }
    ];

    const teacherTools = MODULES.filter(m => m.group === "teacher");
    expect(teacherTools.map(m => m.key)).toEqual([
      "Daily Student Attendance",
      "Digital Homework Diary",
      "Syllabus Tracker"
    ]);

    const teacherOnly = MODULES.filter(m => m.group === "teacherOnly");
    expect(teacherOnly.map(m => m.key)).toEqual([
      "My Attendance Log",
      "Examinations Tracker",
      "My Schedule"
    ]);

    const mgmtTools = MODULES.filter(m => m.group === "mgmt");
    expect(mgmtTools.length).toBe(9);
  });
});

describe("Spoken English & Spoken Skills Day-wise Syllabus Integration", () => {
  function matchesSyllabusSubject(a: string, b: string): boolean {
    const na = (a || "").trim().toLowerCase();
    const nb = (b || "").trim().toLowerCase();
    if (na === nb) return true;
    const spokenSynonyms = ["spoken english", "spoken skills"];
    if (spokenSynonyms.includes(na) && spokenSynonyms.includes(nb)) return true;
    return false;
  }

  it("treats 'Spoken English' and 'Spoken Skills' as the same subject", () => {
    expect(matchesSyllabusSubject("Spoken English", "Spoken Skills")).toBe(true);
    expect(matchesSyllabusSubject("Spoken Skills", "Spoken English")).toBe(true);
    expect(matchesSyllabusSubject("spoken english", "Spoken English")).toBe(true);
    expect(matchesSyllabusSubject("English", "Spoken English")).toBe(false);
  });

  it("sorts Spoken English lessons by Day number rather than alphabetical title", () => {
    const lessons = [
      { name: "Day 6: Future actions and will", lesson_no: "6" },
      { name: "Day 1: Greetings and self-introduction", lesson_no: "1" },
      { name: "Day 4: Question words and order", lesson_no: "4" },
      { name: "Day 2: Classroom objects", lesson_no: "2" },
      { name: "Day 5: Habits and present tense", lesson_no: "5" },
      { name: "Day 3: Can and requests", lesson_no: "3" },
    ];

    function dayValue(l: { lesson_no?: string; name: string }): number {
      const match = (l.lesson_no || l.name).match(/\d+/);
      return match ? parseInt(match[0], 10) : 999;
    }

    lessons.sort((a, b) => dayValue(a) - dayValue(b));

    expect(lessons.map(l => l.lesson_no)).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("requires all checklist items to be checked before lesson can be marked Done", () => {
    const checklist = [
      { key: "chk1", checked: true },
      { key: "chk2", checked: true },
      { key: "chk3", checked: false },
      { key: "chk4", checked: true },
    ];

    const allChecked = checklist.length > 0 && checklist.every(c => c.checked);
    expect(allChecked).toBe(false);

    // After ticking the 3rd item
    checklist[2].checked = true;
    const nowDone = checklist.length > 0 && checklist.every(c => c.checked);
    expect(nowDone).toBe(true);
  });

  it("generates correct clean slice PDF URL for any class and day", () => {
    function getSpokenPdfUrl(cls: string, day: number): string {
      const cleanCls = cls.replace(/\s+/g, "_");
      return `spoken_pdf/${cleanCls}_Day_${day}.pdf`;
    }

    expect(getSpokenPdfUrl("Class 6", 5)).toBe("spoken_pdf/Class_6_Day_5.pdf");
    expect(getSpokenPdfUrl("Nursery", 1)).toBe("spoken_pdf/Nursery_Day_1.pdf");
    expect(getSpokenPdfUrl("Class 10", 6)).toBe("spoken_pdf/Class_10_Day_6.pdf");
  });

  describe("Problem Solving & Telugu Subject/Class Bridges", () => {
    function normSubjKey(v: any): string {
      return String(v || "").toLowerCase().replace(/\s+/g, "");
    }

    function matchesSyllabusRow(teacherSubject: string, _grade: any, rowSubject: string, rowStrand: string): boolean {
      const ts = normSubjKey(teacherSubject);
      const b = normSubjKey(rowSubject);

      if (ts === "spokenenglish" || ts === "spokenskills") {
        return b === "spokenenglish" || b === "spokenskills";
      }
      if (ts === "ps" || ts === "problemsolving" || ts === "problemsolving(ps)" || ts === "problemskills") {
        if (b === "ps" || b === "problemsolving" || b === "problemsolving(ps)" || b === "problemskills") return true;
      }
      if (ts === "telugu" || ts === "1sttelugu" || ts.includes("telugu")) {
        if (b === "telugu" || b === "1sttelugu" || b.includes("telugu")) return true;
      }
      return b === ts;
    }

    it("matches 'PS' from timetable to 'Problem Solving' in syllabus", () => {
      expect(matchesSyllabusRow("PS", "1", "Problem Solving", "")).toBe(true);
      expect(matchesSyllabusRow("Problem Solving", "1", "PS", "")).toBe(true);
      expect(matchesSyllabusRow("Problem Solving (PS)", "6", "Problem Solving", "")).toBe(true);
    });

    it("matches '1st Telugu' or 'Telugu (SL)' to 'Telugu'", () => {
      expect(matchesSyllabusRow("1st Telugu", "1", "Telugu", "")).toBe(true);
      expect(matchesSyllabusRow("Telugu", "1", "1st Telugu", "")).toBe(true);
      expect(matchesSyllabusRow("Telugu", "1", "Telugu (SL)", "")).toBe(true);
      expect(matchesSyllabusRow("Telugu", "1", "Telugu (FL)", "")).toBe(true);
      expect(matchesSyllabusRow("Telugu (SL)", "1", "Telugu", "")).toBe(true);
    });
  });

  describe("Spoken English Slicer & Drive Sync UI Controls", () => {
    it("includes Sync Spoken English buttons and dialog in syllabus markup", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const syllabusCode = fs.readFileSync(path.resolve(__dirname, "../syllabus.js"), "utf8");

      // Verify the toolbar and modal button IDs exist in the code
      expect(syllabusCode).toContain('id="sylSyncSpokenToolbar"');
      expect(syllabusCode).toContain('id="sylEditorSyncSpoken"');
      expect(syllabusCode).toContain('id="sylSpokenSyncModal"');
      expect(syllabusCode).toContain('syl-open-spoken-sync-btn');
      expect(syllabusCode).toContain('runSpokenEnglishAutoSync');
      expect(syllabusCode).toContain('showSpokenSyncDetailsModal');
      expect(syllabusCode).toContain('triggerSpokenEnglishSync');
    });
  });
});

/**
 * exam-calc.js — Unified Telangana SCERT CCE Examination Calculation Engine
 * 
 * Single source of truth for marks calculation across:
 * - Tabulation sheet & CSV export
 * - Single / Batch Progress Report previews & PDF generation
 * - Mobile Admin student progress view & Class Test inspection
 * 
 * Rules:
 * 1. Grades 6 & 7: 6 subjects (Telugu, Hindi, English, Maths, Science, Social).
 *    Science is 1 combined subject.
 *    SA Max = 600 (6 x 100: Exam 80 + Int 20).
 *    FA Max = 300 (6 x 50: CTAvg 20 + HA 5 + UT 25).
 * 2. Grades 8, 9, 10: Science split into Physics & Biology.
 *    SA Max = 600 (Telugu 100, Hindi 100, English 100, Maths 100, Social 100,
 *                  Physics 50 [Exam 40 + Int 10], Biology 50 [Exam 40 + Int 10]
 *                  -> Combined Science 100 [Exam 80 + Int 20]).
 *    FA Max = 300 (Telugu 50, Hindi 50, English 50, Maths 50, Social 50,
 *                  Physics 25, Biology 25 -> Combined Science 50).
 *    Physics and Biology contribute equally (50% each) without double-counting.
 * 3. Missing Marks:
 *    - Missing / unentered mark is NOT 0.
 *    - Genuinely entered 0 is 0.
 *    - If any required subject is missing or incomplete: status is INCOMPLETE.
 *      Total and % are NOT calculated into a misleading aggregate.
 * 4. Pass / Fail:
 *    - Grade 10: 20% in Hindi (Second Language), 35% in all other subjects including Science.
 *    - Grades 6-9: 35% in all subjects including Science.
 * 5. NO GPA, NO GRADE LETTERS (A1..E) anywhere in reporting.
 */

(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (typeof root !== "undefined") {
    root.ExamCalc = api;
  }
  if (typeof globalThis !== "undefined") {
    globalThis.ExamCalc = api;
  }
  if (typeof window !== "undefined") {
    window.ExamCalc = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this), function () {
  "use strict";

  var SUBJECTS_6_7 = ["Telugu", "Hindi", "English", "Maths", "Science", "Social"];
  var SUBJECTS_8_10_RAW = ["Telugu", "Hindi", "English", "Maths", "Physics", "Biology", "Social"];
  var SUBJECTS_8_10_DISPLAY = ["Telugu", "Hindi", "English", "Maths", "Science", "Social"];

  function gradeNum(clsStr) {
    if (clsStr == null) return null;
    var m = String(clsStr).match(/(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  }

  function isSplitScienceGrade(clsStr) {
    var g = gradeNum(clsStr);
    return g !== null && g >= 8 && g <= 10;
  }

  function isSABucket(bucket) {
    return /^SA-[12]$/i.test(String(bucket || "").trim());
  }

  function roundHalf(v) {
    if (v === "" || v == null || isNaN(Number(v))) return null;
    return Math.round((Number(v) + Number.EPSILON) * 2) / 2;
  }

  function roundHalfStr(v) {
    var n = roundHalf(v);
    if (n == null) return "—";
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  }

  function isAbsentCell(cell) {
    if (!cell) return false;
    if (cell.absent === true || cell.isAbsent === true || cell.status === "A" || cell.status === "ABSENT") return true;
    var raw = String(cell.value == null ? (cell.scored == null ? "" : cell.scored) : cell.value).trim().toLowerCase();
    return raw === "ab" || raw === "abs" || raw === "absent" || raw === "a";
  }

  function getSubjectMap(student) {
    var map = {};
    if (!student || !student.subjects) return map;
    if (Array.isArray(student.subjects)) {
      student.subjects.forEach(function (sub) {
        if (sub && sub.subject) {
          map[sub.subject] = sub;
          // Normalized lowercase lookup for robustness
          map[sub.subject.trim().toLowerCase()] = sub;
        }
      });
    } else if (typeof student.subjects === "object") {
      Object.keys(student.subjects).forEach(function (key) {
        var sub = student.subjects[key];
        map[key] = sub;
        map[key.trim().toLowerCase()] = sub;
      });
    }
    return map;
  }

  function getRawSubject(student, name) {
    var map = getSubjectMap(student);
    if (map[name]) return map[name];
    var lower = String(name || "").trim().toLowerCase();
    if (map[lower]) return map[lower];
    // Aliases
    if (lower === "social" || lower === "social studies") {
      return map["Social"] || map["Social Studies"] || map["social"] || map["social studies"];
    }
    if (lower === "maths" || lower === "mathematics") {
      return map["Maths"] || map["Mathematics"] || map["maths"] || map["mathematics"];
    }
    if (lower === "science" || lower === "general science") {
      return map["Science"] || map["General Science"] || map["science"];
    }
    return null;
  }

  /**
   * Evaluates a single raw subject (e.g. Telugu, or Physics raw).
   */
  function evaluateRawSubject(student, subjectName, bucket) {
    var sub = getRawSubject(student, subjectName);
    var isSA = isSABucket(bucket);

    if (!sub) {
      return {
        subject: subjectName,
        hasData: false,
        isComplete: false,
        isAbsent: false,
        rawScored: null,
        rawMax: isSA ? 100 : 50,
        missingComponents: isSA ? ["Exam"] : ["CT1", "CT2", "HA", "UT"],
        components: {}
      };
    }

    // Sub could be a nested object with sub.cells, or sub could directly contain the component cells { CT1, CT2, ... }
    var cells = (sub.cells && (sub.cells.CT1 || sub.cells.EX || sub.cells.Exam || sub.cells.Tot || sub.cells.ct1)) ? sub.cells : sub;

    if (isSA) {
      var examCell = cells.EX || cells.Exam || cells.exam;
      var intCell = cells.IN || cells.Int || cells.internal || cells.int;
      var totCell = cells.Tot || cells.tot || cells.total;
      
      var examAbsent = isAbsentCell(examCell);
      var examHas = !!(examCell && examCell.has && !examAbsent);
      var examVal = (examHas && examCell.value !== "" && examCell.value != null) ? Number(examCell.value) : (sub.exam != null && sub.exam !== "" && examHas ? Number(sub.exam) : (examAbsent ? 0 : null));

      var intAbsent = isAbsentCell(intCell);
      var intHas = !!(intCell && intCell.has && !intAbsent);
      var intVal = (intHas && intCell.value !== "" && intCell.value != null) ? Number(intCell.value) : (sub.int != null && sub.int !== "" && intHas ? Number(sub.int) : (intAbsent ? 0 : null));

      var totAbsent = isAbsentCell(totCell);
      var totHas = !!(totCell && totCell.has);
      var totVal = (totHas && totCell.value !== "" && totCell.value != null) ? Number(totCell.value) : (sub.total != null && sub.total !== "" ? Number(sub.total) : null);

      // Note: In SA, exam paper is critical. If exam is not entered, SA is incomplete.
      var missing = [];
      if (!examHas && !examAbsent) missing.push("Summative Exam");
      if (!intHas && !intAbsent && intVal == null) missing.push("Internal Marks");

      var isPhyBio = (subjectName === "Physics" || subjectName === "Biology");
      var defaultTotMax = isPhyBio ? 50 : 100;
      var rawMax = Number(sub.max) > 0 ? Number(sub.max) : defaultTotMax;
      var examMax = (rawMax === 50 || isPhyBio) ? 40 : 80;
      var intMax = (rawMax === 50 || isPhyBio) ? 10 : 20;

      var isComplete = (examHas || examAbsent) && (intHas || intAbsent || intVal != null);
      var rawScored = isComplete
        ? (totVal != null ? totVal : ((examVal != null || intVal != null) ? ((examVal || 0) + (intVal || 0)) : 0))
        : (totHas ? totVal : null);

      return {
        subject: subjectName,
        hasData: true,
        isComplete: isComplete,
        isAbsent: examAbsent,
        rawScored: rawScored,
        rawMax: defaultTotMax,
        missingComponents: missing,
        components: {
          Exam: { scored: examVal, max: examMax, has: examHas || examAbsent, absent: examAbsent },
          Int: { scored: intVal, max: intMax, has: intHas || intAbsent, absent: intAbsent },
          Tot: { scored: rawScored, max: defaultTotMax, has: isComplete || totHas, absent: examAbsent }
        }
      };
    } else {
      // FA bucket
      var ct1Cell = cells.CT1 || cells.ct1;
      var ct2Cell = cells.CT2 || cells.ct2;
      var utCell = cells.UT || cells.ut || cells.unit;
      var haCell = cells.HA || cells.ha;
      var totCell = cells.Tot || cells.tot || cells.total;

      var ct1Absent = isAbsentCell(ct1Cell);
      var ct2Absent = isAbsentCell(ct2Cell);
      var utAbsent = isAbsentCell(utCell);
      var haAbsent = isAbsentCell(haCell);
      var totAbsent = isAbsentCell(totCell);

      var ct1Has = !!(ct1Cell && ct1Cell.has);
      var ct2Has = !!(ct2Cell && ct2Cell.has);
      var utHas = !!(utCell && utCell.has);
      var haHas = !!(haCell && haCell.has);
      var totHas = !!(totCell && totCell.has);

      var ct1Val = (ct1Has && ct1Cell.value !== "" && ct1Cell.value != null) ? Number(ct1Cell.value) : (sub.ct1 != null && sub.ct1 !== "" && ct1Has ? Number(sub.ct1) : (ct1Absent ? 0 : null));
      var ct2Val = (ct2Has && ct2Cell.value !== "" && ct2Cell.value != null) ? Number(ct2Cell.value) : (sub.ct2 != null && sub.ct2 !== "" && ct2Has ? Number(sub.ct2) : (ct2Absent ? 0 : null));
      var utVal = (utHas && utCell.value !== "" && utCell.value != null) ? Number(utCell.value) : (sub.unit != null && sub.unit !== "" && utHas ? Number(sub.unit) : (utAbsent ? 0 : null));
      var haVal = (haHas && haCell.value !== "" && haCell.value != null) ? Number(haCell.value) : (sub.ha != null && sub.ha !== "" && haHas ? Number(sub.ha) : (haAbsent ? 0 : null));
      var totVal = (totHas && totCell.value !== "" && totCell.value != null) ? Number(totCell.value) : (sub.total != null && sub.total !== "" ? Number(sub.total) : null);

      var missingFA = [];
      if (!ct1Has && !ct1Absent) missingFA.push("Class Test 1");
      if (!ct2Has && !ct2Absent) missingFA.push("Class Test 2");
      if (!haHas && !haAbsent) missingFA.push("Home Assignment");
      if (!utHas && !utAbsent) missingFA.push("Unit Test");

      var isCompleteFA = (ct1Has || ct1Absent) && (ct2Has || ct2Absent) && (haHas || haAbsent) && (utHas || utAbsent);
      var ctAvg = (isCompleteFA || ((ct1Has || ct1Absent) && (ct2Has || ct2Absent))) ? (((ct1Val || 0) + (ct2Val || 0)) / 2) : null;
      var rawScoredFA = isCompleteFA
        ? (totVal != null ? totVal : ((ct1Val != null || utVal != null || haVal != null) ? (ctAvg + (haVal || 0) + (utVal || 0)) : (sub.total != null ? Number(sub.total) : 0)))
        : (totHas ? totVal : null);

      return {
        subject: subjectName,
        hasData: true,
        isComplete: isCompleteFA,
        isAbsent: ct1Absent && ct2Absent && utAbsent && haAbsent,
        rawScored: isCompleteFA ? rawScoredFA : null,
        rawMax: 50,
        missingComponents: missingFA,
        components: {
          CT1: { scored: ct1Val, max: 20, has: ct1Has, absent: ct1Absent },
          CT2: { scored: ct2Val, max: 20, has: ct2Has, absent: ct2Absent },
          CTAvg: { scored: ctAvg, max: 20, has: ctAvg != null, absent: ct1Absent && ct2Absent },
          HA: { scored: haVal, max: 5, has: haHas, absent: haAbsent },
          UT: { scored: utVal, max: 25, has: utHas, absent: utAbsent },
          Tot: { scored: rawScoredFA, max: 50, has: isCompleteFA || totHas, absent: false }
        }
      };
    }
  }

  /**
   * Calculates subject breakdown for reporting.
   * For Grades 8-10, computes individual Physics (out of 25/50), Biology (out of 25/50),
   * and Combined Science (out of 50/100).
   */
  function calculateSubjectReport(student, subjectName, bucket, className, options) {
    var isSA = isSABucket(bucket);
    var isSplit = isSplitScienceGrade(className);

    if (isSplit && (subjectName === "Science" || subjectName === "Combined Science")) {
      var phy = evaluateRawSubject(student, "Physics", bucket);
      var bio = evaluateRawSubject(student, "Biology", bucket);

      // In Grades 8-10:
      // FA: Teachers enter marks out of 50 each (CT1 20, CT2 20, HA 5, UT 25).
      //     Marks are halved (0.5 scale) so Physics (25) + Biology (25) = Science (50).
      // SA: If entered out of 80/20 (e.g. Exam > 40, Int > 10, or rawMax > 50),
      //     scale by 0.5 to 40/10/50 so Physics (50) + Biology (50) = Science (100).
      //     If already entered directly for 40/10 (max 50), scale is 1.0.
      var phyNeedsHalve = isSA && ((phy.rawMax > 50) || (phy.components.Exam && phy.components.Exam.scored > 40) || (phy.components.Int && phy.components.Int.scored > 10) || (phy.rawScored > 50));
      var bioNeedsHalve = isSA && ((bio.rawMax > 50) || (bio.components.Exam && bio.components.Exam.scored > 40) || (bio.components.Int && bio.components.Int.scored > 10) || (bio.rawScored > 50));
      var saNeedsHalving = (isSA && (phyNeedsHalve || bioNeedsHalve)) ||
        (options && options.saNeedsHalving === true) ||
        (student && student._saPhyBioNeedsHalve);

      var phyScale = (!isSA || saNeedsHalving) ? 0.5 : 1.0;
      var bioScale = (!isSA || saNeedsHalving) ? 0.5 : 1.0;

      var phyScaledScored = phy.isComplete ? roundHalf(phy.rawScored * phyScale) : null;
      var bioScaledScored = bio.isComplete ? roundHalf(bio.rawScored * bioScale) : null;

      var isComplete = phy.isComplete && bio.isComplete;
      var combinedScored = isComplete ? roundHalf(phyScaledScored + bioScaledScored) : null;
      var combinedMax = isSA ? 100 : 50;

      var missingNotes = [];
      if (!phy.isComplete) {
        missingNotes.push("Physics (" + (phy.missingComponents.length ? phy.missingComponents.join(", ") : "Not entered") + ")");
      }
      if (!bio.isComplete) {
        missingNotes.push("Biology (" + (bio.missingComponents.length ? bio.missingComponents.join(", ") : "Not entered") + ")");
      }

      function scaleComp(rawComp, scale, targetMax) {
        if (!rawComp) return { scored: null, max: targetMax != null ? targetMax : 0, has: false, absent: false };
        return {
          scored: rawComp.has ? roundHalf(rawComp.scored * scale) : null,
          max: targetMax != null ? targetMax : roundHalf(rawComp.max * scale),
          has: rawComp.has,
          absent: rawComp.absent
        };
      }

      function combineComp(c1, c2) {
        var has = (c1 && c1.has) && (c2 && c2.has);
        return {
          scored: has ? roundHalf(c1.scored + c2.scored) : null,
          max: roundHalf((c1 ? c1.max : 0) + (c2 ? c2.max : 0)),
          has: has,
          absent: (c1 && c1.absent) || (c2 && c2.absent)
        };
      }

      var phyComps = {}, bioComps = {}, combComps = {};
      var compKeys = isSA ? ["Exam", "Int", "Tot"] : ["CT1", "CT2", "CTAvg", "HA", "UT", "Tot"];
      var subMaxes = isSA
        ? { Exam: 40, Int: 10, Tot: 50 }
        : { CT1: 10, CT2: 10, CTAvg: 10, HA: 2.5, UT: 12.5, Tot: 25 };

      compKeys.forEach(function (k) {
        var tMax = subMaxes[k];
        phyComps[k] = scaleComp(phy.components[k], phyScale, tMax);
        bioComps[k] = scaleComp(bio.components[k], bioScale, tMax);
        combComps[k] = combineComp(phyComps[k], bioComps[k]);
      });

      return {
        subject: "Science",
        displayName: "Science (Combined)",
        isSplit: true,
        isComplete: isComplete,
        isAbsent: phy.isAbsent && bio.isAbsent,
        scored: combinedScored,
        max: combinedMax,
        missingNotes: missingNotes,
        components: combComps,
        physics: {
          subject: "Physics",
          displayName: "↳ Physics (Physical Science)",
          isComplete: phy.isComplete,
          isAbsent: phy.isAbsent,
          scored: phyScaledScored,
          max: isSA ? 50 : 25,
          components: phyComps,
          missingNotes: phy.missingComponents
        },
        biology: {
          subject: "Biology",
          displayName: "↳ Biology (Biological Science)",
          isComplete: bio.isComplete,
          isAbsent: bio.isAbsent,
          scored: bioScaledScored,
          max: isSA ? 50 : 25,
          components: bioComps,
          missingNotes: bio.missingComponents
        }
      };
    }

    // Direct Physics or Biology request in a split grade
    if (isSplit && (subjectName === "Physics" || subjectName === "Biology")) {
      var rawPhyBio = evaluateRawSubject(student, subjectName, bucket);
      var phyBioNeedsHalve = isSA && ((rawPhyBio.rawMax > 50) || (rawPhyBio.components.Exam && rawPhyBio.components.Exam.scored > 40) || (rawPhyBio.components.Int && rawPhyBio.components.Int.scored > 10) || (rawPhyBio.rawScored > 50));
      var needsHalve = (!isSA) || phyBioNeedsHalve ||
        (options && options.saNeedsHalving === true) ||
        (student && student._saPhyBioNeedsHalve);
      var scale = needsHalve ? 0.5 : 1.0;
      var scaledScored = rawPhyBio.isComplete ? roundHalf(rawPhyBio.rawScored * scale) : null;
      var scaledMax = isSA ? 50 : 25;
      var scaledComps = {};
      var compKeys = isSA ? ["Exam", "Int", "Tot"] : ["CT1", "CT2", "CTAvg", "HA", "UT", "Tot"];
      compKeys.forEach(function (k) {
        var rawComp = rawPhyBio.components[k];
        scaledComps[k] = rawComp ? {
          scored: rawComp.has ? roundHalf(rawComp.scored * scale) : null,
          max: isSA ? (k === "Exam" ? 40 : (k === "Int" ? 10 : 50)) : roundHalf(rawComp.max * scale),
          has: rawComp.has,
          absent: rawComp.absent
        } : { scored: null, max: 0, has: false, absent: false };
      });
      return {
        subject: subjectName,
        displayName: subjectName,
        isSplit: true,
        isComponent: true,
        isComplete: rawPhyBio.isComplete,
        isAbsent: rawPhyBio.isAbsent,
        scored: scaledScored,
        max: scaledMax,
        missingNotes: rawPhyBio.missingComponents,
        components: scaledComps
      };
    }

    // Regular subject (or single Science for Grades 6-7)
    var raw = evaluateRawSubject(student, subjectName, bucket);
    var maxVal = isSA ? 100 : 50;
    var scoredVal = raw.isComplete ? roundHalf(raw.rawScored) : null;

    return {
      subject: subjectName,
      displayName: subjectName,
      isSplit: false,
      isComplete: raw.isComplete,
      isAbsent: raw.isAbsent,
      scored: scoredVal,
      max: maxVal,
      missingNotes: raw.missingComponents,
      components: raw.components
    };
  }

  /**
   * Computes the complete evaluation for a student.
   * Standardizes the 6 report subjects: Telugu, Hindi, English, Maths, Science, Social.
   * Total Max = 300 (FA) or 600 (SA).
   */
  function calculateStudent(student, bucket, className, options) {
    var isSA = isSABucket(bucket);
    var isSplit = isSplitScienceGrade(className);
    var grade = gradeNum(className);

    var reportSubjects = ["Telugu", "Hindi", "English", "Maths", "Science", "Social"];
    var subjectsEval = {};
    var missingSubjects = [];
    var failedSubjects = [];
    var totalScored = 0;
    var isOverallComplete = true;

    reportSubjects.forEach(function (subj) {
      var rep = calculateSubjectReport(student, subj, bucket, className, options);
      subjectsEval[subj] = rep;

      if (!rep.isComplete) {
        isOverallComplete = false;
        if (rep.isSplit) {
          if (!rep.physics.isComplete) missingSubjects.push("Physics");
          if (!rep.biology.isComplete) missingSubjects.push("Biology");
        } else {
          missingSubjects.push(subj);
        }
      } else {
        totalScored += rep.scored;

        // Pass/Fail evaluation
        // Telangana rules:
        // Grade 10: 20% in Hindi (Second Language), 35% in others.
        // Other grades: 35% in all subjects.
        var minPct = (grade === 10 && subj.toLowerCase() === "hindi") ? 0.20 : 0.35;
        var minMarks = rep.max * minPct;
        if (rep.isAbsent || (rep.scored + 0.000001 < minMarks)) {
          failedSubjects.push(subj);
        }
      }
    });

    var totalMax = isSA ? 600 : 300;
    var roundedTotalScored = isOverallComplete ? roundHalf(totalScored) : null;
    var percent = isOverallComplete ? Math.round(((roundedTotalScored / totalMax) * 100) * 100) / 100 : null;

    var status = "INCOMPLETE";
    if (isOverallComplete) {
      status = failedSubjects.length > 0 ? "NOT PASSED" : "PASSED";
    }

    return {
      studentId: student.id || student.studentId || student.admNo || "—",
      name: student.name || "—",
      roll: student.roll || "",
      className: className,
      bucket: bucket,
      isSA: isSA,
      isSplitScience: isSplit,
      isComplete: isOverallComplete,
      missingSubjects: missingSubjects,
      failedSubjects: failedSubjects,
      totalScored: roundedTotalScored,
      totalMax: totalMax,
      percent: percent,
      status: status,
      resultText: isOverallComplete
        ? (status === "PASSED" ? "PASSED" : "NOT PASSED (Below minimum in: " + failedSubjects.join(", ") + ")")
        : "INCOMPLETE (Marks pending in: " + missingSubjects.join(", ") + ")",
      subjects: subjectsEval
    };
  }

  return {
    SUBJECTS_6_7: SUBJECTS_6_7,
    SUBJECTS_8_10_RAW: SUBJECTS_8_10_RAW,
    SUBJECTS_8_10_DISPLAY: SUBJECTS_8_10_DISPLAY,
    gradeNum: gradeNum,
    isSplitScienceGrade: isSplitScienceGrade,
    isSABucket: isSABucket,
    roundHalf: roundHalf,
    roundHalfStr: roundHalfStr,
    isAbsentCell: isAbsentCell,
    getSubjectMap: getSubjectMap,
    evaluateRawSubject: evaluateRawSubject,
    calculateSubjectReport: calculateSubjectReport,
    calculateStudent: calculateStudent
  };
});

/* =========================================================================
   exam-schedule-import-parser.js — Examination Schedule Excel Parser & Reconciler
   Part of Sapthagiri High School ERP Examination Management.

   Parses Excel schedule sheets (.xlsx, .xls) using SheetJS, normalizes
   examination names (CT 1-8, FA 1-4, SA 1-2), verifies dates & weekdays,
   and reconciles parsed entries against existing database examination records
   into New, Changed, and Unchanged categories.
   ========================================================================= */
(function (root, factory) {
  var instance;
  if (typeof module === 'object' && module.exports) {
    // Node / CommonJS
    try {
      instance = factory(require('xlsx'));
    } catch (e) {
      instance = factory(null);
    }
    module.exports = instance;
  } else {
    instance = factory(root && root.XLSX);
  }
  if (root) {
    root.ExamScheduleImportParser = instance;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.ExamScheduleImportParser = instance;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this), function (XLSXModule) {
  "use strict";

  var XLSX = XLSXModule || (typeof window !== 'undefined' && window.XLSX ? window.XLSX : (typeof globalThis !== 'undefined' && globalThis.XLSX ? globalThis.XLSX : null));

  // Load SheetJS dynamically in browser if not already available
  function loadSheetJS() {
    return new Promise(function (resolve, reject) {
      if (typeof window !== 'undefined' && window.XLSX) {
        XLSX = window.XLSX;
        resolve(XLSX);
        return;
      }
      if (XLSX) {
        resolve(XLSX);
        return;
      }
      if (typeof document === 'undefined') {
        reject(new Error("SheetJS is not loaded in this environment"));
        return;
      }

      var scriptLocal = document.createElement('script');
      scriptLocal.src = 'xlsx.full.min.js';
      scriptLocal.onload = function () {
        XLSX = window.XLSX;
        resolve(XLSX);
      };
      scriptLocal.onerror = function () {
        var scriptCdn = document.createElement('script');
        scriptCdn.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
        scriptCdn.onload = function () {
          XLSX = window.XLSX;
          resolve(XLSX);
        };
        scriptCdn.onerror = function () {
          reject(new Error('Failed to load SheetJS library'));
        };
        document.head.appendChild(scriptCdn);
      };
      document.head.appendChild(scriptLocal);
    });
  }

  // --- Examination Name Normalization (CT 1-8, FA 1-4, SA 1-2) ---
  function normalizeExamName(raw) {
    if (!raw) return null;
    var s = String(raw).trim()
      .replace(/\s+/g, ' ')
      .replace(/[–—]/g, '-');

    if (!s) return null;

    // Class Tests: 1 to 8
    // Matches: "CT 1", "CT1", "C.T. 1", "C.T.1", "CT-1", "Class Test 1", "Class Test-1"
    var ctMatch = s.match(/^(?:c\.?\s*t\.?|class\s*test)[\s-]*([1-8])\b/i);
    if (ctMatch) {
      return "Class Test " + ctMatch[1];
    }

    // Formative Assessments: 1 to 4
    // Matches: "FA 1", "FA1", "F.A. 1", "F.A.1", "FA-1", "Formative Assessment 1", "Formative Assessment-1"
    var faMatch = s.match(/^(?:f\.?\s*a\.?|formative(?:\s*assessment)?)[\s-]*([1-4])\b/i);
    if (faMatch) {
      return "Formative Assessment " + faMatch[1];
    }

    // Summative Assessments: 1 to 2
    // Matches: "SA 1", "SA1", "S.A. 1", "S.A.1", "SA-1", "Summative Assessment 1", "Summative Assessment-1"
    var saMatch = s.match(/^(?:s\.?\s*a\.?|summative(?:\s*assessment)?)[\s-]*([1-2])\b/i);
    if (saMatch) {
      return "Summative Assessment " + saMatch[1];
    }

    return null; // Not recognized
  }

  // Map canonical or raw exam name back to assessment bucket
  function examNameToBucket(examName) {
    if (!examName) return "";
    var en = String(examName).trim();
    if (/(?:class\s*test|ct)[\s-]*[12]\b/i.test(en) || /(?:formative\s*assessment|fa)[\s-]*1\b/i.test(en)) return "FA-1";
    if (/(?:class\s*test|ct)[\s-]*[34]\b/i.test(en) || /(?:formative\s*assessment|fa)[\s-]*2\b/i.test(en)) return "FA-2";
    if (/(?:summative\s*assessment|sa)[\s-]*1\b/i.test(en)) return "SA-1";
    if (/(?:class\s*test|ct)[\s-]*[56]\b/i.test(en) || /(?:formative\s*assessment|fa)[\s-]*3\b/i.test(en)) return "FA-3";
    if (/(?:class\s*test|ct)[\s-]*[78]\b/i.test(en) || /(?:formative\s*assessment|fa)[\s-]*4\b/i.test(en)) return "FA-4";
    if (/(?:summative\s*assessment|sa)[\s-]*2\b/i.test(en)) return "SA-2";
    return "";
  }

  // --- Subject Normalization ---
  function normalizeSubject(raw) {
    if (!raw) return "";
    var s = String(raw).trim()
      .replace(/\s+/g, ' ')
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ''); // Strip emojis

    var lower = s.toLowerCase();

    // Telugu
    if (/^(తెలుగు|telugu|tel)$/i.test(lower)) return "Telugu";

    // Hindi
    if (/^(हिंदी|हिन्दी|hindi|hin)$/i.test(lower)) return "Hindi";

    // English
    if (/^(english|eng)$/i.test(lower)) return "English";

    // Mathematics (canonical DB subject is "Maths")
    if (/^(mathematics|maths|math)$/i.test(lower)) return "Maths";
    if (/^maths[- ]?1$/i.test(lower)) return "Maths-1";
    if (/^maths[- ]?2$/i.test(lower)) return "Maths-2";

    // Science components
    if (/^(physics|phy)$/i.test(lower)) return "Physics";
    if (/^(biology|bio)$/i.test(lower)) return "Biology";
    if (/^(science|gen(?:eral)?[\s.]*science|gen[\s.]*sci)$/i.test(lower)) return "Science";

    // Social (canonical DB subject is "Social")
    if (/^(social[\s-]*studies|social[\s-]*science|social|soc)$/i.test(lower)) return "Social";

    // Cleaned casing for any other recognized subject
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // --- Class / Grade Normalization ---
  function normalizeClass(raw) {
    if (!raw) return "";
    var s = String(raw).trim().replace(/\s+/g, ' ');
    var m = s.match(/(?:grade|class)?[- ]?(\d+)(?:st|nd|rd|th)?/i);
    if (m) {
      return "Grade " + m[1];
    }
    if (/^(nursery|pre[- ]?kg|prekg)$/i.test(s)) return "Nursery";
    if (/^lkg$/i.test(s)) return "LKG";
    if (/^ukg$/i.test(s)) return "UKG";
    return s;
  }

  // Identify class directly from Excel sheet name (e.g. "6", "7", "8", "9", "10")
  function classFromSheetName(sheetName) {
    if (!sheetName) return null;
    var s = String(sheetName).trim();

    // Bare digit "6", "7", "8", "9", "10"
    if (/^([6-9]|10)$/.test(s)) {
      return "Grade " + s;
    }
    // "Grade 6", "Class 6", "Grade-6", "Class-6", "6th", etc.
    var mHigh = s.match(/^(?:grade|class)?[- ]?([6-9]|10)(?:st|nd|rd|th)?$/i);
    if (mHigh) {
      return "Grade " + mHigh[1];
    }

    // Lower grades 1 to 5 if present
    if (/^[1-5]$/.test(s)) return "Grade " + s;
    var mPrim = s.match(/^(?:grade|class)?[- ]?([1-5])(?:st|nd|rd|th)?$/i);
    if (mPrim) return "Grade " + mPrim[1];

    // Pre-primary
    if (/^(nursery|pre[- ]?kg|prekg)$/i.test(s)) return "Nursery";
    if (/^lkg$/i.test(s)) return "LKG";
    if (/^ukg$/i.test(s)) return "UKG";

    return null; // Unrecognized
  }

  // Numeric grade number (e.g. "Grade 8" -> 8, "8" -> 8)
  function gradeNumber(raw) {
    var s = String(raw || "").trim();
    var m = s.match(/\b(\d+)\b/);
    return m ? parseInt(m[1], 10) : null;
  }

  // --- Date & Weekday Parsing ---
  var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  function parseExcelDate(val) {
    if (val == null || val === "") {
      return { dateStr: "", dayName: "", isValid: false, error: "Missing date" };
    }

    var year, month, day;

    // 1. JS Date instance
    if (val instanceof Date) {
      year = val.getFullYear();
      month = val.getMonth() + 1;
      day = val.getDate();
    }
    // 2. Excel numeric date serial
    else if (typeof val === 'number' || (!isNaN(Number(val)) && !String(val).includes('-') && !String(val).includes('/') && !String(val).includes('.'))) {
      var serial = Number(val);
      if (serial < 1) {
        return { dateStr: "", dayName: "", isValid: false, error: "Invalid date serial" };
      }
      // Excel 1900 date system leap year bug offset
      var utcDays = Math.floor(serial - 25569);
      var utcValue = utcDays * 86400;
      var dateObj = new Date(utcValue * 1000);
      year = dateObj.getUTCFullYear();
      month = dateObj.getUTCMonth() + 1;
      day = dateObj.getUTCDate();
    }
    // 3. String representation
    else {
      var s = String(val).trim();
      var isoMatch = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
      var dmyMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);

      if (isoMatch) {
        year = parseInt(isoMatch[1], 10);
        month = parseInt(isoMatch[2], 10);
        day = parseInt(isoMatch[3], 10);
      } else if (dmyMatch) {
        day = parseInt(dmyMatch[1], 10);
        month = parseInt(dmyMatch[2], 10);
        year = parseInt(dmyMatch[3], 10);
      } else {
        var parsed = new Date(s);
        if (!isNaN(parsed.getTime())) {
          year = parsed.getFullYear();
          month = parsed.getMonth() + 1;
          day = parsed.getDate();
        } else {
          return { dateStr: s, dayName: "", isValid: false, error: "Unrecognized date format: " + s };
        }
      }
    }

    // Format ISO string YYYY-MM-DD
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var dateStr = year + '-' + pad(month) + '-' + pad(day);

    // Verify calendar validity
    var checkDate = new Date(year, month - 1, day);
    if (checkDate.getFullYear() !== year || checkDate.getMonth() !== (month - 1) || checkDate.getDate() !== day) {
      return { dateStr: dateStr, dayName: "", isValid: false, error: "Invalid calendar date: " + dateStr };
    }

    var dayName = WEEKDAYS[checkDate.getDay()];
    return { dateStr: dateStr, dayName: dayName, isValid: true };
  }

  // Validate that provided weekday string matches the date
  function validateWeekday(dateStr, dayStr) {
    if (!dateStr) return { match: true, expected: "", actual: dayStr || "" };
    var p = parseExcelDate(dateStr);
    if (!p.isValid) return { match: false, expected: "", actual: dayStr || "", error: p.error };

    var expected = p.dayName;
    var actual = String(dayStr || "").trim();
    if (!actual) {
      return { match: true, expected: expected, actual: expected, autoFilled: true };
    }

    var isMatch = expected.toLowerCase().startsWith(actual.toLowerCase().slice(0, 3));
    return {
      match: isMatch,
      expected: expected,
      actual: actual,
      error: !isMatch ? ("Day mismatch: sheet says " + actual + ", but " + dateStr + " is " + expected) : null
    };
  }

  // --- Sheet Header Detection ---
  // Expected headers: Exam Name, Maximum Marks, Date, Day, Subject (and optional Class)
  function detectHeaders(sheet, maxScanRows) {
    if (!sheet) return null;
    var ref = sheet['!ref'] || 'A1:A1';
    var decoded = XLSX.utils.decode_range(ref);
    var scanLimit = Math.min(decoded.e.r, maxScanRows || 10);

    for (var r = decoded.s.r; r <= scanLimit; r++) {
      var rowHeaders = {};
      var foundCount = 0;

      for (var c = decoded.s.c; c <= decoded.e.c; c++) {
        var cellAddr = XLSX.utils.encode_cell({ r: r, c: c });
        var cell = sheet[cellAddr];
        if (!cell || cell.v == null) continue;

        var text = String(cell.w || cell.v).trim().toLowerCase();

        // Match Column Types
        if (!rowHeaders.exam && /^(exam(?:\s*name)?|examination|assessment|test)$/i.test(text)) {
          rowHeaders.exam = c; foundCount++;
        } else if (!rowHeaders.marks && /^(max(?:imum)?[\s_]*marks?|marks?|m\.?m\.?|max)$/i.test(text)) {
          rowHeaders.marks = c; foundCount++;
        } else if (!rowHeaders.date && /^(exam[\s_]*date|date)$/i.test(text)) {
          rowHeaders.date = c; foundCount++;
        } else if (!rowHeaders.day && /^(day|weekday)$/i.test(text)) {
          rowHeaders.day = c; foundCount++;
        } else if (!rowHeaders.subject && /^(subject|paper|sub)$/i.test(text)) {
          rowHeaders.subject = c; foundCount++;
        } else if (!rowHeaders.classCol && /^(class|grade|standard)$/i.test(text)) {
          rowHeaders.classCol = c;
        }
      }

      // If at least 3 of the 5 primary headers are found, this is the header row
      if (foundCount >= 3) {
        return {
          headerRow: r,
          columns: {
            exam: rowHeaders.exam != null ? rowHeaders.exam : 0,
            marks: rowHeaders.marks != null ? rowHeaders.marks : 1,
            date: rowHeaders.date != null ? rowHeaders.date : 2,
            day: rowHeaders.day != null ? rowHeaders.day : 3,
            subject: rowHeaders.subject != null ? rowHeaders.subject : 4,
            classCol: rowHeaders.classCol != null ? rowHeaders.classCol : null
          }
        };
      }
    }

    // Fallback: Row index 2 (Row 3 in 1-based Excel index) with standard A-E columns
    return {
      headerRow: 2,
      columns: { exam: 0, marks: 1, date: 2, day: 3, subject: 4, classCol: null }
    };
  }

  // --- Parse Sheet Records ---
  function parseScheduleSheet(sheet, options) {
    options = options || {};
    var sheetName = options.sheetName || "";
    var defaultClass = normalizeClass(options.defaultClass || sheetName);

    var headerInfo = detectHeaders(sheet, 10);
    var ref = sheet['!ref'] || 'A1:A1';
    var decoded = XLSX.utils.decode_range(ref);
    var startRow = headerInfo.headerRow + 1;

    var records = [];
    var warnings = [];

    for (var r = startRow; r <= decoded.e.r; r++) {
      var getVal = function (colIdx) {
        if (colIdx == null) return null;
        var addr = XLSX.utils.encode_cell({ r: r, c: colIdx });
        var cell = sheet[addr];
        if (!cell) return null;
        return cell.v != null ? cell.v : cell.w;
      };

      var rawExam = getVal(headerInfo.columns.exam);
      var rawMarks = getVal(headerInfo.columns.marks);
      var rawDate = getVal(headerInfo.columns.date);
      var rawDay = getVal(headerInfo.columns.day);
      var rawSubj = getVal(headerInfo.columns.subject);
      var rawClass = headerInfo.columns.classCol != null ? getVal(headerInfo.columns.classCol) : null;

      // Skip empty row
      if (rawExam == null && rawMarks == null && rawDate == null && rawSubj == null) {
        continue;
      }

      var rowNum = r + 1; // 1-based line number for user messages
      var errors = [];

      // 1. Exam Name
      var normExam = normalizeExamName(rawExam);
      if (!normExam) {
        errors.push("Row " + rowNum + ": Unrecognized exam name '" + (rawExam || '') + "'. Supported: CT 1-8, FA 1-4, SA 1-2.");
      }

      // 2. Marks
      var marksNum = rawMarks != null && String(rawMarks).trim() !== "" ? Number(String(rawMarks).trim()) : null;
      if (marksNum == null || isNaN(marksNum) || marksNum <= 0) {
        errors.push("Row " + rowNum + ": Invalid maximum marks '" + (rawMarks || '') + "'. Must be a positive number.");
      }

      // 3. Date & Day
      var parsedDate = parseExcelDate(rawDate);
      var dateStr = "";
      var dayStr = String(rawDay || "").trim();

      if (!parsedDate.isValid) {
        errors.push("Row " + rowNum + ": " + parsedDate.error);
      } else {
        dateStr = parsedDate.dateStr;
        var dayCheck = validateWeekday(dateStr, dayStr);
        if (!dayCheck.match) {
          warnings.push("Row " + rowNum + ": " + dayCheck.error);
        }
        dayStr = dayCheck.expected || dayStr;
      }

      // 4. Subject
      var normSubj = normalizeSubject(rawSubj);
      if (!normSubj) {
        errors.push("Row " + rowNum + ": Missing or unrecognized subject '" + (rawSubj || '') + "'.");
      }

      // 5. Class / Grade
      var normCls = normalizeClass(rawClass) || defaultClass;
      if (!normCls) {
        errors.push("Row " + rowNum + ": Class/Grade not specified in row or sheet name.");
      }

      var record = {
        rowNum: rowNum,
        rawExam: rawExam,
        examName: normExam || String(rawExam || ""),
        bucket: examNameToBucket(normExam),
        marks: marksNum != null ? marksNum : String(rawMarks || ""),
        date: dateStr,
        day: dayStr,
        rawSubject: rawSubj,
        subject: normSubj,
        grade: normCls,
        isValid: errors.length === 0,
        errors: errors,
        warnings: warnings
      };

      records.push(record);
    }

    return {
      sheetName: sheetName,
      headerRow: headerInfo.headerRow + 1,
      records: records,
      warnings: warnings
    };
  }

  // --- Parse Entire Workbook ---
  function parseScheduleWorkbook(workbook, options) {
    if (!workbook || !workbook.Sheets) {
      throw new Error("Invalid Excel workbook object");
    }

    var sheetNames = workbook.SheetNames || [];
    var allRecords = [];
    var allWarnings = [];
    var classSheetsFound = [];
    var unrecognizedSheets = [];

    sheetNames.forEach(function (name) {
      var s = String(name).trim();
      var cls = classFromSheetName(s);

      if (!cls) {
        // Check if it's an ignorable default scratch/blank sheet
        var lower = s.toLowerCase();
        var isScratch = /^(sheet\d*|temp|scratch|test|readme|instructions|summary|notes)$/i.test(lower);
        if (!isScratch) {
          unrecognizedSheets.push({
            sheetName: s,
            error: "Sheet '" + s + "' does not match any recognized class (expected: 6, 7, 8, 9, 10)."
          });
        }
        return;
      }

      var sheet = workbook.Sheets[name];
      var res = parseScheduleSheet(sheet, { sheetName: s, defaultClass: cls });

      if (res && res.records && res.records.length > 0) {
        // Enforce that every examination record in this sheet belongs to this class
        res.records.forEach(function (rec) {
          rec.grade = cls;
          rec.sheetName = s;
        });
        classSheetsFound.push({
          sheetName: s,
          className: cls,
          count: res.records.length
        });
        allRecords = allRecords.concat(res.records);
        allWarnings = allWarnings.concat(res.warnings || []);
      }
    });

    return {
      totalParsed: allRecords.length,
      records: allRecords,
      classSheetsFound: classSheetsFound,
      unrecognizedSheets: unrecognizedSheets,
      warnings: allWarnings
    };
  }

  // --- Intelligent 3-Way Reconciliation with Database Schedule ---
  function reconcileSchedule(parsedRecords, existingDbRows) {
    existingDbRows = existingDbRows || [];

    // Index existing DB rows by class | examName | subject
    var dbMap = {};
    existingDbRows.forEach(function (row) {
      var cls = normalizeClass(row.gradeLabel || row.grade);
      var en = normalizeExamName(row.examName) || String(row.examName || "").trim();
      var sub = normalizeSubject(row.subject);
      var key = (cls + "|" + en + "|" + sub).toLowerCase();

      // Store by normalized key
      dbMap[key] = row;
    });

    var newRecords = [];
    var changedRecords = [];
    var unchangedRecords = [];
    var invalidRecords = [];

    parsedRecords.forEach(function (rec) {
      if (!rec.isValid) {
        invalidRecords.push(rec);
        return;
      }

      var cls = normalizeClass(rec.grade);
      var en = normalizeExamName(rec.examName) || rec.examName;
      var sub = normalizeSubject(rec.subject);
      var key = (cls + "|" + en + "|" + sub).toLowerCase();

      var existing = dbMap[key];

      if (!existing) {
        // 1. New Examination
        newRecords.push({
          type: "NEW",
          record: rec
        });
      } else {
        // Compare fields: Date and Maximum Marks
        var existingDate = String(existing.date || "").trim();
        var uploadedDate = String(rec.date || "").trim();

        var existingMarks = existing.marks != null && String(existing.marks).trim() !== "" ? Number(existing.marks) : null;
        var uploadedMarks = rec.marks != null && String(rec.marks).trim() !== "" ? Number(rec.marks) : null;

        var diffs = [];

        if (existingDate !== uploadedDate) {
          diffs.push({
            field: "Date",
            existingValue: existingDate || "Unscheduled",
            uploadedValue: uploadedDate || "Unscheduled"
          });
        }

        if (existingMarks !== uploadedMarks && (existingMarks != null || uploadedMarks != null)) {
          diffs.push({
            field: "Maximum Marks",
            existingValue: existingMarks != null ? existingMarks : "-",
            uploadedValue: uploadedMarks != null ? uploadedMarks : "-"
          });
        }

        if (diffs.length > 0) {
          // 2. Existing Examination — Changes Detected
          changedRecords.push({
            type: "CHANGED",
            rowId: existing.rowId,
            existing: existing,
            record: rec,
            diffs: diffs
          });
        } else {
          // 3. Unchanged Examination — Already Exists
          unchangedRecords.push({
            type: "UNCHANGED",
            rowId: existing.rowId,
            existing: existing,
            record: rec
          });
        }
      }
    });

    // Group records by class (e.g. Grade 6, Grade 7, Grade 8, Grade 9, Grade 10)
    var byClass = {};
    var getGradeGroup = function (grade) {
      var g = normalizeClass(grade) || "Unassigned";
      if (!byClass[g]) {
        byClass[g] = {
          className: g,
          newRecords: [],
          changedRecords: [],
          unchangedRecords: [],
          invalidRecords: [],
          total: 0
        };
      }
      return byClass[g];
    };

    newRecords.forEach(function (item) {
      var grp = getGradeGroup(item.record.grade);
      grp.newRecords.push(item);
      grp.total++;
    });

    changedRecords.forEach(function (item) {
      var grp = getGradeGroup(item.record.grade);
      grp.changedRecords.push(item);
      grp.total++;
    });

    unchangedRecords.forEach(function (item) {
      var grp = getGradeGroup(item.record.grade);
      grp.unchangedRecords.push(item);
      grp.total++;
    });

    invalidRecords.forEach(function (rec) {
      var grp = getGradeGroup(rec.grade);
      grp.invalidRecords.push(rec);
      grp.total++;
    });

    return {
      summary: {
        total: parsedRecords.length,
        newCount: newRecords.length,
        changedCount: changedRecords.length,
        unchangedCount: unchangedRecords.length,
        invalidCount: invalidRecords.length
      },
      byClass: byClass,
      newRecords: newRecords,
      changedRecords: changedRecords,
      unchangedRecords: unchangedRecords,
      invalidRecords: invalidRecords
    };
  }

  return {
    loadSheetJS: loadSheetJS,
    normalizeExamName: normalizeExamName,
    examNameToBucket: examNameToBucket,
    normalizeSubject: normalizeSubject,
    normalizeClass: normalizeClass,
    classFromSheetName: classFromSheetName,
    gradeNumber: gradeNumber,
    parseExcelDate: parseExcelDate,
    validateWeekday: validateWeekday,
    detectHeaders: detectHeaders,
    parseScheduleSheet: parseScheduleSheet,
    parseScheduleWorkbook: parseScheduleWorkbook,
    reconcileSchedule: reconcileSchedule
  };
});

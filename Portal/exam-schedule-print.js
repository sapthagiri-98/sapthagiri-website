/* =========================================================================
   exam-schedule-print.js — Examination Schedule Print Module
   Part of Sapthagiri High School Portal.
   Generates executive, high-contrast black-and-white A4 portrait examination
   schedules for classroom display and notice boards.
   Matches Sapthagiri report standards and 10th Class Revision Schedule layout.
   ========================================================================= */

(function (root, factory) {
  "use strict";
  var instance = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = instance;
  }
  if (root) {
    root.ExamSchedulePrint = instance;
  }
  if (typeof globalThis !== "undefined") {
    globalThis.ExamSchedulePrint = instance;
  }
})(typeof globalThis !== "undefined" ? globalThis : (typeof self !== "undefined" ? self : this), function () {
  "use strict";

  // --- Constants & Class Order ---
  var CLASS_ORDER = [
    "Nursery", "LKG", "UKG",
    "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
    "Class 6", "Class 7", "Class 8", "Class 9", "Class 10"
  ];

  function classSortIndex(cls) {
    var norm = normalizeClass(cls);
    var idx = CLASS_ORDER.indexOf(norm);
    if (idx !== -1) return idx;
    var num = gradeNumber(norm);
    return num !== null ? (num + 2) : 99;
  }

  function gradeNumber(str) {
    if (!str) return null;
    var m = String(str).match(/(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  }

  function normalizeClass(raw) {
    if (!raw) return "";
    var s = String(raw).trim();
    if (/^nursery$/i.test(s)) return "Nursery";
    if (/^lkg$/i.test(s)) return "LKG";
    if (/^ukg$/i.test(s)) return "UKG";
    var m = s.match(/(?:class|grade)?\s*(\d+)/i);
    if (m) return "Class " + parseInt(m[1], 10);
    return s;
  }

  function sortClasses(classes) {
    return (classes || []).slice().sort(function (a, b) {
      return classSortIndex(a) - classSortIndex(b);
    });
  }

  function formatDateDDMMYYYY(dateStr) {
    if (!dateStr) return "—";
    var s = String(dateStr).trim();
    var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) {
      var dd = ("0" + parseInt(m[3], 10)).slice(-2);
      var mm = ("0" + parseInt(m[2], 10)).slice(-2);
      return dd + "-" + mm + "-" + m[1];
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return s;
    return s;
  }

  function getDayOfWeek(dateStr, explicitDay) {
    if (explicitDay && String(explicitDay).trim()) {
      return String(explicitDay).trim();
    }
    if (!dateStr) return "—";
    var m = String(dateStr).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) {
      var d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
      var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return days[d.getDay()] || "—";
    }
    return "—";
  }

  function getAcademicYear() {
    var p = (typeof window !== "undefined" && window.Portal) || (typeof globalThis !== "undefined" && globalThis.Portal);
    if (p && p.CONFIG && p.CONFIG.ACADEMIC_YEAR) {
      return String(p.CONFIG.ACADEMIC_YEAR).replace("-", "–");
    }
    var d = new Date();
    var y = d.getFullYear();
    var m = d.getMonth() + 1;
    var startY = (m >= 6) ? y : (y - 1);
    var endYShort = String((startY + 1) % 100).padStart(2, "0");
    return startY + "–" + endYShort;
  }

  function examBucketForName(en) {
    if (!en) return "";
    var s = String(en).trim();
    if (/(?:class\s*test|ct)[\s-]*[12]\b/i.test(s) || /(?:formative\s*assessment|fa)[\s-]*1\b/i.test(s)) return "FA-1";
    if (/(?:class\s*test|ct)[\s-]*[34]\b/i.test(s) || /(?:formative\s*assessment|fa)[\s-]*2\b/i.test(s)) return "FA-2";
    if (/(?:summative\s*assessment|sa)[\s-]*1\b/i.test(s)) return "SA-1";
    if (/(?:class\s*test|ct)[\s-]*[56]\b/i.test(s) || /(?:formative\s*assessment|fa)[\s-]*3\b/i.test(s)) return "FA-3";
    if (/(?:class\s*test|ct)[\s-]*[78]\b/i.test(s) || /(?:formative\s*assessment|fa)[\s-]*4\b/i.test(s)) return "FA-4";
    if (/(?:summative\s*assessment|sa)[\s-]*2\b/i.test(s)) return "SA-2";
    return "";
  }

  // --- Dynamic Extraction from existing Schedule Rows ---
  function extractScheduleData(rows) {
    var rawRows = rows || [];
    var assessmentsSet = Object.create(null);
    var classesSet = Object.create(null);
    var classExamsMap = Object.create(null);
    var assessmentClassesMap = Object.create(null);

    rawRows.forEach(function (r) {
      if (!r) return;
      var examName = String(r.examName || "").trim();
      var cls = normalizeClass(r.gradeLabel || r.grade);
      if (!examName || !cls) return;

      assessmentsSet[examName] = true;
      classesSet[cls] = true;

      if (!classExamsMap[cls]) classExamsMap[cls] = [];
      if (classExamsMap[cls].indexOf(examName) === -1) {
        classExamsMap[cls].push(examName);
      }

      if (!assessmentClassesMap[examName]) assessmentClassesMap[examName] = [];
      if (assessmentClassesMap[examName].indexOf(cls) === -1) {
        assessmentClassesMap[examName].push(cls);
      }

      var bkt = examBucketForName(examName);
      if (bkt) {
        var bktFullName = bkt === "FA-1" ? "Formative Assessment 1"
          : (bkt === "FA-2" ? "Formative Assessment 2"
          : (bkt === "SA-1" ? "Summative Assessment 1"
          : (bkt === "FA-3" ? "Formative Assessment 3"
          : (bkt === "FA-4" ? "Formative Assessment 4" : "Summative Assessment 2"))));

        assessmentsSet[bktFullName] = true;
        if (!assessmentClassesMap[bktFullName]) assessmentClassesMap[bktFullName] = [];
        if (assessmentClassesMap[bktFullName].indexOf(cls) === -1) {
          assessmentClassesMap[bktFullName].push(cls);
        }
      }
    });

    var distinctAssessments = Object.keys(assessmentsSet).sort(function (a, b) {
      return a.localeCompare(b);
    });

    var distinctClasses = sortClasses(Object.keys(classesSet));

    distinctAssessments.forEach(function (asmt) {
      if (assessmentClassesMap[asmt]) {
        assessmentClassesMap[asmt] = sortClasses(assessmentClassesMap[asmt]);
      }
    });

    return {
      assessments: distinctAssessments,
      classes: distinctClasses,
      classExamsMap: classExamsMap,
      assessmentClassesMap: assessmentClassesMap
    };
  }

  // --- Row Filtering & Deduplication ---
  function filterScheduleRows(rows, criteria) {
    if (!rows || !rows.length || !criteria) return [];
    var mode = criteria.mode || "bucket";
    var result = [];
    var seen = Object.create(null);

    rows.forEach(function (r) {
      if (!r) return;
      var exam = String(r.examName || "").trim();
      var cls = normalizeClass(r.gradeLabel || r.grade);
      var subj = String(r.subject || "").trim();
      var date = String(r.date || "").trim();
      var syl = String(r.lessonsRaw || r.syllabus || r.portions || "").trim();
      var day = getDayOfWeek(date, r.day);

      var matches = false;

      if (mode === "bucket") {
        var targetAsmt = String(criteria.assessment || "").trim();
        var selectedClasses = criteria.classes || [];
        if (!targetAsmt || selectedClasses.indexOf(cls) === -1) return;

        var bktTarget = examBucketForName(targetAsmt);
        var bktRow = examBucketForName(exam);

        if (exam.toLowerCase() === targetAsmt.toLowerCase()) {
          matches = true;
        } else if (bktTarget && bktRow && bktTarget === bktRow) {
          matches = true;
        }
      } else if (mode === "individual") {
        if (criteria.selections && criteria.selections[cls]) {
          var allowedExams = criteria.selections[cls];
          if (allowedExams.indexOf(exam) !== -1) {
            matches = true;
          }
        } else if (criteria.classes && criteria.exams) {
          if (criteria.classes.indexOf(cls) !== -1 && criteria.exams.indexOf(exam) !== -1) {
            matches = true;
          }
        }
      }

      if (matches) {
        var key = cls + "||" + exam + "||" + subj + "||" + date;
        if (!seen[key]) {
          seen[key] = true;
          result.push({
            rowId: r.rowId,
            grade: cls,
            examName: exam,
            subject: subj,
            date: date,
            formattedDate: formatDateDDMMYYYY(date),
            day: day,
            marks: r.marks != null ? r.marks : "",
            syllabus: syl,
            lessonsRaw: syl,
            status: r.status || "SCHEDULED"
          });
        }
      }
    });

    // Sort: Class order -> Exam Name -> Date -> Subject
    result.sort(function (a, b) {
      var cDiff = classSortIndex(a.grade) - classSortIndex(b.grade);
      if (cDiff !== 0) return cDiff;
      var eDiff = a.examName.localeCompare(b.examName);
      if (eDiff !== 0) return eDiff;
      if (a.date && b.date) {
        var dDiff = a.date.localeCompare(b.date);
        if (dDiff !== 0) return dDiff;
      }
      return a.subject.localeCompare(b.subject);
    });

    return result;
  }

  // --- Grouping by Class (One bucket/schedule sheet per class) ---
  function groupRowsForPrint(filteredRows) {
    var groups = [];
    var groupIndexMap = Object.create(null);

    (filteredRows || []).forEach(function (r) {
      var cls = r.grade;
      if (groupIndexMap[cls] == null) {
        groupIndexMap[cls] = groups.length;
        groups.push({
          grade: cls,
          examName: r.examName,
          examNames: [],
          rows: []
        });
      }
      var grp = groups[groupIndexMap[cls]];
      if (grp.examNames.indexOf(r.examName) === -1) {
        grp.examNames.push(r.examName);
      }
      grp.rows.push(r);
    });

    groups.sort(function (a, b) {
      return classSortIndex(a.grade) - classSortIndex(b.grade);
    });

    return groups;
  }

  // --- Chapter / Lesson Number Formatting ---
  // Formats syllabus cell text, preserving existing chapter/lesson prefixes
  // and dynamically enriching lesson names with their chapter/lesson numbers.
  function formatSyllabusCell(rawSyl, grade, subject, cache) {
    if (!rawSyl || !String(rawSyl).trim() || String(rawSyl).trim() === "—") return "—";

    var str = String(rawSyl).trim();
    // Split on semicolon or newline
    var rawParts = str.split(/;|\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (!rawParts.length) return "—";

    var cacheKey = normalizeClass(grade) + "|||" + String(subject || "").trim();
    var masterLessons = (cache && cache[cacheKey]) || [];

    var formattedParts = rawParts.map(function (part) {
      // Check if item already has a chapter/lesson label or numbers:
      // Examples: "Lessons: 7, 8", "Chapter 1: Real Numbers", "Unit 1: The Magic Garden", "Ch. 4: Fractions"
      var mPrefix = part.match(/^((?:lessons?|chapters?|units?|ch\.?|l\.?|patham|pāṭham)\s*(?:no\.?|nos\.?)?\s*[\d,\s&–-]+(?::|—|-|\.)?)(.*)$/i);
      if (mPrefix) {
        var numLabel = mPrefix[1].trim();
        var restText = mPrefix[2].trim();
        return '<div class="ex-syl-item"><span class="ex-syl-num">' + escapeHtml(numLabel) + '</span> ' + escapeHtml(restText) + '</div>';
      }

      var mNum = part.match(/^(\d+[\.:\)\-]\s*)(.*)$/);
      if (mNum) {
        return '<div class="ex-syl-item"><span class="ex-syl-num">' + escapeHtml(mNum[1].trim()) + '</span> ' + escapeHtml(mNum[2].trim()) + '</div>';
      }

      // If no prefix, check Syllabus Master cache to prepend official lesson number
      if (masterLessons.length > 0) {
        var partLower = part.toLowerCase();
        var matched = masterLessons.find(function (ml) {
          var mlName = String(ml.name || "").trim().toLowerCase();
          return mlName === partLower || mlName.indexOf(partLower) !== -1 || partLower.indexOf(mlName) !== -1;
        });

        if (matched && (matched.lessonNo != null || matched.num != null || matched.lesson_no != null)) {
          var num = matched.lessonNo != null ? matched.lessonNo : (matched.num != null ? matched.num : matched.lesson_no);
          return '<div class="ex-syl-item"><span class="ex-syl-num">Lesson ' + escapeHtml(num) + ':</span> ' + escapeHtml(part) + '</div>';
        }
      }

      return '<div class="ex-syl-item">' + escapeHtml(part) + '</div>';
    });

    return formattedParts.join("");
  }

  // --- HTML Document Generation ---
  function generatePrintDocumentHtml(classGroups, options) {
    options = options || {};
    var academicYear = options.academicYear || getAcademicYear();
    var pageBreakPerClass = options.pageBreakPerClass !== false;
    var assessmentName = options.assessment || "";
    var cache = options.syllabusMasterCache || (state && state.syllabusMasterCache) || {};

    var isFit1Page = options.fitToOnePage != null ? options.fitToOnePage : (state && state.fitToOnePage);
    var docClass = isFit1Page ? "ex-print-doc ex-fit-single-page" : "ex-print-doc";
    var html = '<div class="' + docClass + '" id="exPrintDoc">';

    classGroups.forEach(function (grp, gIdx) {
      var breakClass = (pageBreakPerClass && gIdx > 0) ? " page-break" : "";

      html += '<section class="ex-print-class-sheet' + breakClass + '" data-class="' + escapeHtml(grp.grade) + '">';

      // School Branding Header: Logo only (increased by 25%, no redundant text)
      html +=
        '<header class="ex-print-logo-wrap">' +
          '<img class="ex-print-logo" src="logo-full.jpg" alt="Sapthagiri High School" onerror="this.src=\'header-logo.png\';">' +
        '</header>';

      // High-Contrast Executive Title Banner with Academic Year Badge
      var bannerMain = "";
      if (assessmentName) {
        bannerMain = grp.grade.toUpperCase() + ' — ' + assessmentName.toUpperCase() + ' SCHEDULE & SYLLABUS';
      } else if (grp.examNames && grp.examNames.length === 1) {
        bannerMain = grp.grade.toUpperCase() + ' — ' + grp.examNames[0].toUpperCase() + ' SCHEDULE & SYLLABUS';
      } else if (grp.examNames && grp.examNames.length > 1 && grp.examNames.every(function (en) { return /revision/i.test(en); })) {
        bannerMain = grp.grade.toUpperCase() + ' — REVISION EXAMINATION SCHEDULE & SYLLABUS';
      } else {
        bannerMain = grp.grade.toUpperCase() + ' — EXAMINATION SCHEDULE & SYLLABUS';
      }

      html +=
        '<div class="ex-print-banner">' +
          '<span>' + escapeHtml(bannerMain) + '</span>' +
          '<span class="ex-banner-pill">' + escapeHtml(academicYear) + '</span>' +
        '</div>';

      // Unified 5-Column Schedule Table for this class
      html +=
        '<table class="ex-print-table">' +
          '<colgroup>' +
            '<col class="ex-print-col-exam">' +
            '<col class="ex-print-col-date">' +
            '<col class="ex-print-col-day">' +
            '<col class="ex-print-col-subject">' +
            '<col class="ex-print-col-syllabus">' +
          '</colgroup>' +
          '<thead>' +
            '<tr>' +
              '<th>Exam Name</th>' +
              '<th class="col-center">Date</th>' +
              '<th class="col-center">Day</th>' +
              '<th>Subject</th>' +
              '<th>Syllabus</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>';

      var currentExamName = null;
      var examSetIndex = -1;

      grp.rows.forEach(function (r, rIdx) {
        if (r.examName !== currentExamName) {
          currentExamName = r.examName;
          examSetIndex++;
        }

        var isNewExam = (rIdx > 0 && r.examName !== grp.rows[rIdx - 1].examName);
        var isShadedExam = (examSetIndex % 2 === 1);
        var rowClasses = [];
        if (isNewExam) rowClasses.push("ex-new-exam-row");
        if (isShadedExam) rowClasses.push("ex-exam-shaded-row");
        var rowClassAttr = rowClasses.length ? (' class="' + rowClasses.join(" ") + '"') : "";

        var dateFormatted = r.formattedDate || formatDateDDMMYYYY(r.date);
        var dayText = r.day || getDayOfWeek(r.date);
        var syllabusFormatted = formatSyllabusCell(r.syllabus || r.lessonsRaw, r.grade, r.subject, cache);

        html +=
          '<tr' + rowClassAttr + '>' +
            '<td class="ex-print-col-exam">' + escapeHtml(r.examName) + '</td>' +
            '<td class="ex-print-col-date">' + escapeHtml(dateFormatted) + '</td>' +
            '<td class="ex-print-col-day">' + escapeHtml(dayText) + '</td>' +
            '<td class="ex-print-col-subject">' + escapeHtml(r.subject) + '</td>' +
            '<td class="ex-print-col-syllabus">' + syllabusFormatted + '</td>' +
          '</tr>';
      });

      html +=
          '</tbody>' +
        '</table>';

      html += '</section>';
    });

    html += '</div>';
    return html;
  }

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // --- Active State ---
  var state = {
    allRows: [],
    extracted: null,
    mode: "bucket",
    selectedAssessment: "",
    selectedBucketClasses: Object.create(null),
    selectedIndivClasses: Object.create(null),
    selectedIndivExams: Object.create(null),
    pageBreakPerClass: true,
    fitToOnePage: false,
    syllabusMasterCache: Object.create(null)
  };

  // Preloads Syllabus Master lessons to enrich lesson names with numbers
  function preloadSyllabusMaster(rows) {
    var P = (typeof window !== "undefined" && window.Portal) || (typeof globalThis !== "undefined" && globalThis.Portal);
    if (!P || typeof P.api !== "function") return Promise.resolve();

    var pairs = Object.create(null);
    (rows || []).forEach(function (r) {
      var g = normalizeClass(r.gradeLabel || r.grade);
      var s = String(r.subject || "").trim();
      if (g && s) {
        pairs[g + "|||" + s] = { grade: g, subject: s };
      }
    });

    var keys = Object.keys(pairs);
    var promises = keys.map(function (k) {
      if (state.syllabusMasterCache[k]) return Promise.resolve();
      var p = pairs[k];
      return P.api("getSyllabusMasterLessons", [p.grade, p.subject], { overlay: false })
        .then(function (lessons) {
          state.syllabusMasterCache[k] = lessons || [];
        })
        .catch(function () {
          state.syllabusMasterCache[k] = [];
        });
    });

    return Promise.all(promises);
  }

  // --- Modal Management & DOM Interactions ---
  function open(options) {
    options = options || {};
    var rows = options.rows;
    var P = (typeof window !== "undefined" && window.Portal) || (typeof globalThis !== "undefined" && globalThis.Portal);

    if (rows && rows.length > 0) {
      initModalWithRows(rows, options);
    } else if (P && typeof P.api === "function") {
      P.api("examGetScheduleTable", ["", ""], { overlay: true })
        .then(function (dbRows) {
          initModalWithRows(dbRows || [], options);
        })
        .catch(function (err) {
          alert("Unable to load examination schedule: " + (err.message || err));
        });
    } else {
      initModalWithRows([], options);
    }
  }

  function initModalWithRows(rows, options) {
    state.allRows = rows || [];
    state.extracted = extractScheduleData(state.allRows);
    state.mode = "bucket";
    state.pageBreakPerClass = true;

    // Start background preload of syllabus master lessons
    preloadSyllabusMaster(state.allRows);

    var defaultAsmt = options.currentExam || "";
    if (!defaultAsmt && state.extracted.assessments.length > 0) {
      defaultAsmt = state.extracted.assessments[0];
    }
    state.selectedAssessment = defaultAsmt;

    state.selectedBucketClasses = Object.create(null);
    var defaultClass = options.currentClass ? normalizeClass(options.currentClass) : "";
    var availClasses = state.extracted.assessmentClassesMap[defaultAsmt] || state.extracted.classes;
    if (defaultClass && availClasses.indexOf(defaultClass) !== -1) {
      state.selectedBucketClasses[defaultClass] = true;
    } else {
      availClasses.forEach(function (c) {
        state.selectedBucketClasses[c] = true;
      });
    }

    state.selectedIndivClasses = Object.create(null);
    state.selectedIndivExams = Object.create(null);
    if (defaultClass) {
      state.selectedIndivClasses[defaultClass] = true;
    } else if (state.extracted.classes.length > 0) {
      state.selectedIndivClasses[state.extracted.classes[0]] = true;
    }

    renderSelectionModal();
  }

  function renderSelectionModal() {
    closeModals();

    var ext = state.extracted;
    if (!ext || !ext.assessments.length) {
      alert("No examinations are currently scheduled to print.");
      return;
    }

    var overlay = document.createElement("div");
    overlay.className = "ex-print-modal-overlay";
    overlay.id = "exPrintSelectModal";

    var card = document.createElement("div");
    card.className = "ex-print-modal-card";

    card.innerHTML =
      '<div class="ex-print-modal-header">' +
        '<h3><i class="material-icons">print</i> Print Examination Schedule</h3>' +
        '<button type="button" class="ex-print-modal-close" id="exPrintCloseModalBtn" aria-label="Close">&times;</button>' +
      '</div>' +
      '<div class="ex-print-mode-tabs">' +
        '<button type="button" class="ex-print-mode-tab' + (state.mode === 'bucket' ? ' active' : '') + '" id="exPrintTabBucket">' +
          '<i class="material-icons" style="font-size:18px;">collections_bookmark</i> By Assessment / Bucket' +
        '</button>' +
        '<button type="button" class="ex-print-mode-tab' + (state.mode === 'individual' ? ' active' : '') + '" id="exPrintTabIndiv">' +
          '<i class="material-icons" style="font-size:18px;">checklist</i> Individual Examinations' +
        '</button>' +
      '</div>' +
      '<div class="ex-print-modal-body" id="exPrintModalBody"></div>' +
      '<div class="ex-print-modal-footer">' +
        '<label class="ex-print-pagebreak-opt">' +
          '<input type="checkbox" id="exPrintPageBreakToggle"' + (state.pageBreakPerClass ? ' checked' : '') + '> ' +
          'Start each class on a new page (Notice Board Display)' +
        '</label>' +
        '<div class="ex-print-footer-actions">' +
          '<button type="button" class="btn btn-secondary" id="exPrintCancelBtn">Cancel</button>' +
          '<button type="button" class="btn btn-primary" id="exPrintPreviewBtn" style="background:#7a151a;color:#fff;">' +
            '<i class="material-icons" style="font-size:16px;color:#fff;vertical-align:middle;margin-right:4px;">visibility</i> Preview &amp; Print' +
          '</button>' +
        '</div>' +
      '</div>';

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    document.getElementById("exPrintCloseModalBtn").addEventListener("click", closeModals);
    document.getElementById("exPrintCancelBtn").addEventListener("click", closeModals);

    document.getElementById("exPrintTabBucket").addEventListener("click", function () {
      state.mode = "bucket";
      updateModalTabs();
      renderModalBody();
    });

    document.getElementById("exPrintTabIndiv").addEventListener("click", function () {
      state.mode = "individual";
      updateModalTabs();
      renderModalBody();
    });

    document.getElementById("exPrintPageBreakToggle").addEventListener("change", function () {
      state.pageBreakPerClass = this.checked;
    });

    document.getElementById("exPrintPreviewBtn").addEventListener("click", function () {
      openPreview();
    });

    renderModalBody();
  }

  function updateModalTabs() {
    var tabB = document.getElementById("exPrintTabBucket");
    var tabI = document.getElementById("exPrintTabIndiv");
    if (tabB) tabB.className = "ex-print-mode-tab" + (state.mode === "bucket" ? " active" : "");
    if (tabI) tabI.className = "ex-print-mode-tab" + (state.mode === "individual" ? " active" : "");
  }

  function renderModalBody() {
    var body = document.getElementById("exPrintModalBody");
    if (!body) return;

    if (state.mode === "bucket") {
      renderBucketModeBody(body);
    } else {
      renderIndividualModeBody(body);
    }

    updateSummaryAndPreviewButton();
  }

  // --- Mode A: Assessment / Bucket UI ---
  function renderBucketModeBody(container) {
    var ext = state.extracted;
    var curAsmt = state.selectedAssessment;
    var availClasses = ext.assessmentClassesMap[curAsmt] || ext.classes;

    var html =
      '<div class="ex-print-field-row">' +
        '<label for="exPrintAsmtSelect">Select Assessment / Bucket</label>' +
        '<select class="ex-print-select" id="exPrintAsmtSelect">';

    ext.assessments.forEach(function (asmt) {
      var isSel = asmt === curAsmt;
      var classCount = (ext.assessmentClassesMap[asmt] || []).length;
      html += '<option value="' + escapeHtml(asmt) + '"' + (isSel ? ' selected' : '') + '>' +
        escapeHtml(asmt) + (classCount ? ' (' + classCount + ' classes)' : '') +
      '</option>';
    });

    html +=
        '</select>' +
      '</div>' +
      '<div class="ex-print-subhead">' +
        '<span class="ex-print-subhead-title">Select Classes for ' + escapeHtml(curAsmt) + '</span>' +
        '<div class="ex-print-batch-btns">' +
          '<button type="button" class="ex-print-mini-btn" id="exPrintBktSelectAll">Select All Classes</button>' +
          '<button type="button" class="ex-print-mini-btn" id="exPrintBktClear">Clear Selection</button>' +
        '</div>' +
      '</div>' +
      '<div class="ex-print-grid" id="exPrintBktClassGrid">';

    availClasses.forEach(function (cls) {
      var isChecked = !!state.selectedBucketClasses[cls];
      html +=
        '<label class="ex-print-checkbox-label' + (isChecked ? ' checked' : '') + '">' +
          '<input type="checkbox" data-bkt-cls="' + escapeHtml(cls) + '"' + (isChecked ? ' checked' : '') + '> ' +
          escapeHtml(cls) +
        '</label>';
    });

    html +=
      '</div>' +
      '<div class="ex-print-summary-strip" id="exPrintSummaryStrip"></div>';

    container.innerHTML = html;

    var asmtSel = document.getElementById("exPrintAsmtSelect");
    if (asmtSel) {
      asmtSel.addEventListener("change", function () {
        state.selectedAssessment = this.value;
        state.selectedBucketClasses = Object.create(null);
        var clsList = ext.assessmentClassesMap[state.selectedAssessment] || ext.classes;
        clsList.forEach(function (c) {
          state.selectedBucketClasses[c] = true;
        });
        renderModalBody();
      });
    }

    var selAllBtn = document.getElementById("exPrintBktSelectAll");
    if (selAllBtn) {
      selAllBtn.addEventListener("click", function () {
        availClasses.forEach(function (c) {
          state.selectedBucketClasses[c] = true;
        });
        renderModalBody();
      });
    }

    var clearBtn = document.getElementById("exPrintBktClear");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        state.selectedBucketClasses = Object.create(null);
        renderModalBody();
      });
    }

    var checkboxes = container.querySelectorAll("input[data-bkt-cls]");
    Array.prototype.forEach.call(checkboxes, function (cb) {
      cb.addEventListener("change", function () {
        var cls = this.getAttribute("data-bkt-cls");
        state.selectedBucketClasses[cls] = this.checked;
        if (this.parentNode) {
          if (this.checked) this.parentNode.classList.add("checked");
          else this.parentNode.classList.remove("checked");
        }
        updateSummaryAndPreviewButton();
      });
    });
  }

  // --- Mode B: Individual Examinations UI ---
  function renderIndividualModeBody(container) {
    var ext = state.extracted;
    var html =
      '<div class="ex-print-subhead" style="margin-top:0;">' +
        '<span class="ex-print-subhead-title">1. Select Classes</span>' +
        '<div class="ex-print-batch-btns">' +
          '<button type="button" class="ex-print-mini-btn" id="exPrintIndivSelectAllCls">Select All</button>' +
          '<button type="button" class="ex-print-mini-btn" id="exPrintIndivClearCls">Clear</button>' +
        '</div>' +
      '</div>' +
      '<div class="ex-print-grid">';

    ext.classes.forEach(function (cls) {
      var isChecked = !!state.selectedIndivClasses[cls];
      html +=
        '<label class="ex-print-checkbox-label' + (isChecked ? ' checked' : '') + '">' +
          '<input type="checkbox" data-indiv-cls="' + escapeHtml(cls) + '"' + (isChecked ? ' checked' : '') + '> ' +
          escapeHtml(cls) +
        '</label>';
    });

    html +=
      '</div>' +
      '<div class="ex-print-subhead">' +
        '<span class="ex-print-subhead-title">2. Select Examinations for Selected Classes</span>' +
      '</div>' +
      '<div id="exPrintIndivExamsContainer">';

    var chosenClasses = ext.classes.filter(function (c) { return state.selectedIndivClasses[c]; });

    if (!chosenClasses.length) {
      html += '<p style="color:#64748b;font-size:13px;font-style:italic;">Please select at least one class above to view its examinations.</p>';
    } else {
      chosenClasses.forEach(function (cls) {
        var examsForClass = ext.classExamsMap[cls] || [];
        var classExamSelections = state.selectedIndivExams[cls] || Object.create(null);

        html +=
          '<div class="ex-print-indiv-box">' +
            '<div class="ex-print-indiv-head">' +
              '<span><b>' + escapeHtml(cls) + '</b> (' + examsForClass.length + ' scheduled examinations)</span>' +
              '<div class="ex-print-batch-btns">' +
                '<button type="button" class="ex-print-mini-btn" data-indiv-all-for="' + escapeHtml(cls) + '">Select All</button>' +
                '<button type="button" class="ex-print-mini-btn" data-indiv-clear-for="' + escapeHtml(cls) + '">Clear</button>' +
              '</div>' +
            '</div>' +
            '<div class="ex-print-indiv-exams">';

        examsForClass.forEach(function (exName) {
          var isChecked = !!classExamSelections[exName];
          html +=
            '<label class="ex-print-checkbox-label' + (isChecked ? ' checked' : '') + '">' +
              '<input type="checkbox" data-indiv-exam-cls="' + escapeHtml(cls) + '" data-indiv-exam="' + escapeHtml(exName) + '"' + (isChecked ? ' checked' : '') + '> ' +
              escapeHtml(exName) +
            '</label>';
        });

        html +=
            '</div>' +
          '</div>';
      });
    }

    html +=
      '</div>' +
      '<div class="ex-print-summary-strip" id="exPrintSummaryStrip"></div>';

    container.innerHTML = html;

    var selAllCls = document.getElementById("exPrintIndivSelectAllCls");
    if (selAllCls) {
      selAllCls.addEventListener("click", function () {
        ext.classes.forEach(function (c) { state.selectedIndivClasses[c] = true; });
        renderModalBody();
      });
    }

    var clearCls = document.getElementById("exPrintIndivClearCls");
    if (clearCls) {
      clearCls.addEventListener("click", function () {
        state.selectedIndivClasses = Object.create(null);
        renderModalBody();
      });
    }

    var clsCheckboxes = container.querySelectorAll("input[data-indiv-cls]");
    Array.prototype.forEach.call(clsCheckboxes, function (cb) {
      cb.addEventListener("change", function () {
        var cls = this.getAttribute("data-indiv-cls");
        state.selectedIndivClasses[cls] = this.checked;
        if (this.checked && !state.selectedIndivExams[cls]) {
          state.selectedIndivExams[cls] = Object.create(null);
          (ext.classExamsMap[cls] || []).forEach(function (e) {
            state.selectedIndivExams[cls][e] = true;
          });
        }
        renderModalBody();
      });
    });

    var allForBtns = container.querySelectorAll("button[data-indiv-all-for]");
    Array.prototype.forEach.call(allForBtns, function (btn) {
      btn.addEventListener("click", function () {
        var cls = btn.getAttribute("data-indiv-all-for");
        state.selectedIndivExams[cls] = Object.create(null);
        (ext.classExamsMap[cls] || []).forEach(function (e) {
          state.selectedIndivExams[cls][e] = true;
        });
        renderModalBody();
      });
    });

    var clearForBtns = container.querySelectorAll("button[data-indiv-clear-for]");
    Array.prototype.forEach.call(clearForBtns, function (btn) {
      btn.addEventListener("click", function () {
        var cls = btn.getAttribute("data-indiv-clear-for");
        state.selectedIndivExams[cls] = Object.create(null);
        renderModalBody();
      });
    });

    var examCheckboxes = container.querySelectorAll("input[data-indiv-exam]");
    Array.prototype.forEach.call(examCheckboxes, function (cb) {
      cb.addEventListener("change", function () {
        var cls = this.getAttribute("data-indiv-exam-cls");
        var ex = this.getAttribute("data-indiv-exam");
        if (!state.selectedIndivExams[cls]) state.selectedIndivExams[cls] = Object.create(null);
        state.selectedIndivExams[cls][ex] = this.checked;
        if (this.parentNode) {
          if (this.checked) this.parentNode.classList.add("checked");
          else this.parentNode.classList.remove("checked");
        }
        updateSummaryAndPreviewButton();
      });
    });
  }

  // --- Current Selected Rows & Summary ---
  function getSelectedRows() {
    if (!state.allRows || !state.allRows.length) return [];

    if (state.mode === "bucket") {
      var selectedClasses = Object.keys(state.selectedBucketClasses).filter(function (c) {
        return state.selectedBucketClasses[c];
      });
      return filterScheduleRows(state.allRows, {
        mode: "bucket",
        assessment: state.selectedAssessment,
        classes: selectedClasses
      });
    } else {
      var selections = Object.create(null);
      var chosenClasses = Object.keys(state.selectedIndivClasses).filter(function (c) {
        return state.selectedIndivClasses[c];
      });

      chosenClasses.forEach(function (cls) {
        var examObj = state.selectedIndivExams[cls] || Object.create(null);
        var chosenExams = Object.keys(examObj).filter(function (e) { return examObj[e]; });
        if (chosenExams.length > 0) {
          selections[cls] = chosenExams;
        }
      });

      return filterScheduleRows(state.allRows, {
        mode: "individual",
        selections: selections
      });
    }
  }

  function updateSummaryAndPreviewButton() {
    var rows = getSelectedRows();
    var strip = document.getElementById("exPrintSummaryStrip");
    var previewBtn = document.getElementById("exPrintPreviewBtn");

    var distinctClasses = Object.create(null);
    var distinctExams = Object.create(null);
    rows.forEach(function (r) {
      distinctClasses[r.grade] = true;
      distinctExams[r.examName] = true;
    });

    var numClasses = Object.keys(distinctClasses).length;
    var numExams = Object.keys(distinctExams).length;
    var numRows = rows.length;

    if (strip) {
      if (numRows === 0) {
        strip.innerHTML = '<span style="color:#b91c1c;"><i class="material-icons" style="font-size:16px;vertical-align:middle;">warning</i> No schedule rows selected. Please check at least one class and examination.</span>';
      } else {
        strip.innerHTML =
          '<span><b>Selected Output:</b></span>' +
          '<div class="ex-print-summary-badges">' +
            '<span class="ex-print-badge"><i class="material-icons" style="font-size:14px;color:#7a151a;">groups</i> ' + numClasses + ' Class' + (numClasses !== 1 ? 'es' : '') + '</span>' +
            '<span class="ex-print-badge"><i class="material-icons" style="font-size:14px;color:#7a151a;">assignment</i> ' + numExams + ' Examination' + (numExams !== 1 ? 's' : '') + '</span>' +
            '<span class="ex-print-badge"><i class="material-icons" style="font-size:14px;color:#7a151a;">table_rows</i> ' + numRows + ' Schedule Row' + (numRows !== 1 ? 's' : '') + '</span>' +
          '</div>';
      }
    }

    if (previewBtn) {
      previewBtn.disabled = numRows === 0;
      if (numRows === 0) {
        previewBtn.style.opacity = "0.5";
        previewBtn.style.cursor = "not-allowed";
      } else {
        previewBtn.style.opacity = "1";
        previewBtn.style.cursor = "pointer";
      }
    }
  }

  // --- Print Preview Modal ---
  function openPreview() {
    var rows = getSelectedRows();
    if (!rows.length) {
      alert("No examination schedule rows are selected to print.");
      return;
    }

    var groups = groupRowsForPrint(rows);
    var printHtml = generatePrintDocumentHtml(groups, {
      academicYear: getAcademicYear(),
      pageBreakPerClass: state.pageBreakPerClass,
      assessment: state.mode === "bucket" ? state.selectedAssessment : "",
      syllabusMasterCache: state.syllabusMasterCache
    });

    closeModals();

    var overlay = document.createElement("div");
    overlay.className = "ex-print-modal-overlay";
    overlay.id = "exPrintPreviewModal";

    var card = document.createElement("div");
    card.className = "ex-print-modal-card preview-mode";

    card.innerHTML =
      '<div class="ex-print-modal-header">' +
        '<h3><i class="material-icons">visibility</i> Print Preview · Examination Schedule</h3>' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
          '<button type="button" class="ex-fit-toggle-btn' + (state.fitToOnePage ? ' active' : '') + '" id="exPrintFit1PageBtn" title="Gently adjusts cell spacing so trailing overflow rows fit onto a single sheet">' +
            '<i class="material-icons" style="font-size:16px;">' + (state.fitToOnePage ? 'check_box' : 'crop_free') + '</i> ' +
            '<span>' + (state.fitToOnePage ? 'Fit to 1 Page: ON' : 'Fit to 1 Page') + '</span>' +
          '</button>' +
          '<button type="button" class="btn btn-secondary" id="exPrintBackToSelBtn" style="padding:6px 12px;font-size:12.5px;">' +
            '<i class="material-icons" style="font-size:16px;vertical-align:middle;margin-right:4px;">arrow_back</i> Back to Selection' +
          '</button>' +
          '<button type="button" class="btn btn-primary" id="exPrintActionBtn" style="background:#7a151a;color:#fff;padding:6px 16px;font-size:13px;font-weight:700;">' +
            '<i class="material-icons" style="font-size:16px;vertical-align:middle;margin-right:4px;">print</i> Print' +
          '</button>' +
          '<button type="button" class="ex-print-modal-close" id="exPrintClosePreviewBtn" aria-label="Close">&times;</button>' +
        '</div>' +
      '</div>' +
      '<div class="ex-print-preview-viewport">' +
        '<div class="ex-print-preview-paper" id="exPrintPaper">' +
          printHtml +
        '</div>' +
      '</div>';

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    document.getElementById("exPrintClosePreviewBtn").addEventListener("click", closeModals);

    document.getElementById("exPrintBackToSelBtn").addEventListener("click", function () {
      renderSelectionModal();
    });

    document.getElementById("exPrintActionBtn").addEventListener("click", function () {
      doPrint(groups);
    });

    // Wire Manual "Fit to 1 Page" Toggle
    var fitBtn = document.getElementById("exPrintFit1PageBtn");
    if (fitBtn) {
      fitBtn.addEventListener("click", function () {
        state.fitToOnePage = !state.fitToOnePage;
        if (state.fitToOnePage) {
          fitBtn.classList.add("active");
          fitBtn.innerHTML = '<i class="material-icons" style="font-size:16px;">check_box</i> <span>Fit to 1 Page: ON</span>';
        } else {
          fitBtn.classList.remove("active");
          fitBtn.innerHTML = '<i class="material-icons" style="font-size:16px;">crop_free</i> <span>Fit to 1 Page</span>';
        }
        var paper = document.getElementById("exPrintPaper");
        if (paper) {
          var docEl = paper.querySelector("#exPrintDoc") || paper.firstElementChild;
          if (docEl) {
            if (state.fitToOnePage) docEl.classList.add("ex-fit-single-page");
            else docEl.classList.remove("ex-fit-single-page");
          }
        }
      });
    }
  }

  // --- Browser Printing Mechanism ---
  // High-contrast executive styling, dark table header, creative alternating row shading
  function doPrint(groups) {
    var printHtml = generatePrintDocumentHtml(groups, {
      academicYear: getAcademicYear(),
      pageBreakPerClass: state.pageBreakPerClass,
      assessment: state.mode === "bucket" ? state.selectedAssessment : "",
      syllabusMasterCache: state.syllabusMasterCache,
      fitToOnePage: state.fitToOnePage
    });

    var baseHref = String(document.baseURI || location.href).replace(/"/g, "&quot;");

    var pageMargin = state.fitToOnePage ? '6mm 8mm 6mm 8mm' : '8mm 10mm 8mm 10mm';

    var standaloneCss =
      '@page{size:A4 portrait;margin:' + pageMargin + ';}' +
      '*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}' +
      'html,body{margin:0!important;padding:0!important;background:#ffffff!important;color:#000000!important;' +
      'font-family:\'Inter\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif!important;visibility:visible!important;}' +
      'body *{visibility:visible!important;}' +
      '.ex-print-doc{width:100%!important;color:#000000!important;background:#ffffff!important;}' +
      '.ex-print-class-sheet{margin-bottom:18px;break-inside:auto;page-break-inside:auto;}' +
      '.ex-print-class-sheet.page-break{page-break-before:always!important;break-before:page!important;}' +
      '.ex-print-class-sheet:first-child.page-break{page-break-before:auto!important;break-before:auto!important;}' +
      '.ex-print-logo-wrap{text-align:center;margin-bottom:4px;padding:0;}' +
      '.ex-print-logo{max-height:98px;max-width:440px;width:auto;object-fit:contain;display:block;margin:0 auto;}' +
      '.ex-print-banner{background:#f8fafc!important;color:#000000!important;border-top:1.5px solid #000000!important;border-bottom:1.5px solid #000000!important;border-left:none!important;border-right:none!important;' +
      'text-align:center;font-size:10.5pt;font-weight:700;padding:4px 8px;margin:4px 0 8px 0;text-transform:uppercase;letter-spacing:0.3px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:8px;}' +
      '.ex-banner-pill{font-size:8.5pt;font-weight:600;color:#334155!important;letter-spacing:0.2px;display:inline-block;margin-left:4px;}' +
      '.ex-print-table{width:100%!important;border-collapse:collapse!important;table-layout:fixed!important;margin-bottom:10px;font-size:8.5pt;color:#000000;border:1px solid #000000!important;}' +
      '.ex-print-table thead{display:table-header-group!important;}' +
      '.ex-print-table tfoot{display:table-footer-group!important;}' +
      '.ex-print-table tr{break-inside:avoid!important;page-break-inside:avoid!important;}' +
      '.ex-print-table th,.ex-print-table td{border:1px solid #000000!important;padding:3.5px 5px!important;vertical-align:top!important;box-sizing:border-box;line-height:1.32;}' +
      '.ex-print-table th{background-color:#f1f5f9!important;color:#000000!important;font-weight:700!important;text-align:left!important;font-size:8.5pt!important;text-transform:uppercase!important;letter-spacing:0.3px!important;}' +
      '.ex-print-table th.col-center,.ex-print-table td.col-center{text-align:center!important;}' +
      '.ex-print-table tbody tr td{background-color:#ffffff!important;}' +
      '.ex-print-table tbody tr.ex-exam-shaded-row td{background-color:#f1f5f9!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}' +
      '.ex-print-col-exam{width:16%;font-weight:600;word-break:break-word;color:#000;font-size:8.5pt;}' +
      '.ex-print-col-date{width:12%;white-space:nowrap;text-align:center;font-weight:500;font-variant-numeric:tabular-nums;color:#000;font-size:8.5pt;}' +
      '.ex-print-col-day{width:11%;white-space:nowrap;text-align:center;font-weight:500;color:#222;font-size:8.5pt;}' +
      '.ex-print-col-subject{width:17%;font-weight:600;font-size:9pt;word-break:break-word;color:#000;}' +
      '.ex-print-col-syllabus{width:44%;white-space:normal;word-break:break-word;overflow-wrap:break-word;line-height:1.32;font-size:8.5pt;text-align:left;color:#111;}' +
      '.ex-syl-item{margin-bottom:2px;}' +
      '.ex-syl-item:last-child{margin-bottom:0;}' +
      '.ex-syl-num{font-weight:600;color:#000;margin-right:2px;}' +
      '.ex-print-table tr.ex-new-exam-row td{border-top:1.8px solid #000000!important;}' +
      '.ex-fit-single-page .ex-print-class-sheet .ex-print-logo{max-height:72px!important;}' +
      '.ex-fit-single-page .ex-print-class-sheet .ex-print-logo-wrap{margin-bottom:2px!important;}' +
      '.ex-fit-single-page .ex-print-class-sheet .ex-print-banner{font-size:9.5pt!important;padding:3px 6px!important;margin:3px 0 6px 0!important;}' +
      '.ex-fit-single-page .ex-print-class-sheet .ex-print-table th,.ex-fit-single-page .ex-print-class-sheet .ex-print-table td{padding:2.2px 4.5px!important;line-height:1.22!important;}' +
      '.ex-fit-single-page .ex-print-class-sheet .ex-syl-item{margin-bottom:1px!important;}';

    var frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;";
    document.body.appendChild(frame);

    var doc = frame.contentDocument;
    doc.open();
    doc.write(
      '<!doctype html><html><head><base href="' + baseHref + '">' +
      '<meta charset="UTF-8"><title>Examination Schedule · Sapthagiri High School</title>' +
      '<style>' + standaloneCss + '</style>' +
      '</head><body>' +
      printHtml +
      '</body></html>'
    );
    doc.close();

    function trigger() {
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
      } catch (e) {
        window.print();
      } finally {
        setTimeout(function () {
          if (frame.parentNode) frame.parentNode.removeChild(frame);
        }, 1200);
      }
    }

    var imgs = Array.prototype.slice.call(doc.images || []);
    var waits = imgs.map(function (img) {
      return img.complete ? Promise.resolve() : new Promise(function (res) { img.onload = img.onerror = res; });
    });
    if (doc.fonts && doc.fonts.ready) waits.push(doc.fonts.ready.catch(function () {}));

    Promise.all(waits).then(function () {
      setTimeout(trigger, 250);
    });
  }

  function closeModals() {
    var selModal = document.getElementById("exPrintSelectModal");
    if (selModal && selModal.parentNode) selModal.parentNode.removeChild(selModal);

    var prevModal = document.getElementById("exPrintPreviewModal");
    if (prevModal && prevModal.parentNode) prevModal.parentNode.removeChild(prevModal);
  }

  // --- Public API ---
  return {
    open: open,
    close: closeModals,
    extractScheduleData: extractScheduleData,
    filterScheduleRows: filterScheduleRows,
    groupRowsForPrint: groupRowsForPrint,
    formatSyllabusCell: formatSyllabusCell,
    preloadSyllabusMaster: preloadSyllabusMaster,
    generatePrintDocumentHtml: generatePrintDocumentHtml,
    formatDateDDMMYYYY: formatDateDDMMYYYY,
    getDayOfWeek: getDayOfWeek,
    normalizeClass: normalizeClass,
    sortClasses: sortClasses,
    classSortIndex: classSortIndex,
    getAcademicYear: getAcademicYear,
    getState: function () { return state; }
  };
});

/* =========================================================================
   timetable.js — Timetable Management (Management only)  — v2.2 Mobile Redesign
   Fixes & Features:
   (1) Complete mobile-first vertical timetable redesign with zero horizontal scrolling.
   (2) Dual mobile modes: "By Class" and "By Teacher".
   (3) Cross-campus data federation: loads all campuses (Primary, High School) for the selected day
       so teachers (e.g. Sathish in High School) map completely and accurately.
   (4) Robust period cell resolution: maps period_no or array index [p - 1] so cells never show empty.
   (5) Symmetrical 3-box KPI counters (Teaching/Academic, Activity/Classes, Free).
   (6) Perfectly balanced 3-zone Period Cards (P1–P8): Badge (Left), Subject & Teacher/Class (Center), Status Pill (Right).
   (7) Symmetrical 6-column Day picker (Mon–Sat) fitted with zero horizontal scroll.
   (8) Preserves desktop table, Excel paste TSV import, copy day, and saving for authorized users.
   (9) Strictly enforces read-only view for mobile admin.
   ========================================================================= */
(function () {
  "use strict";
  var P = window.Portal;
  var session = P.bootPage("timetable");
  if (!session) return;
  if (session.role !== "Management") { location.replace("dashboard.html"); return; }
  var esc = P.esc, byId = function (id) { return document.getElementById(id); };
  injectCss();

  var BOOT = null;
  var GRID_CACHE = {}; // key: day + "_" + campus -> rows
  var STATE = {
    campus: "Primary",
    day: 1,
    rows: [],
    dirty: false,
    mobileMode: "class", // "class" or "teacher"
    selectedClass: "",
    selectedTeacher: "",
    _lastWasMobile: null
  };
  var ACTIVITY = { "sports": 1, "games": 1, "karate": 1, "dance": 1, "art zone": 1, "pet": 1, "leisure": 1 };

  function normTeacher(name) {
    if (!name) return "";
    return String(name).toLowerCase()
      .replace(/^(mr\.|mrs\.|ms\.|dr\.|sir|madam)\s+/i, "")
      .replace(/[^a-z0-9]/g, "")
      .trim();
  }

  function teacherMatches(t1, t2) {
    if (!t1 || !t2) return false;
    var s1 = String(t1).trim().toLowerCase();
    var s2 = String(t2).trim().toLowerCase();
    if (s1 === s2) return true;
    var n1 = normTeacher(t1);
    var n2 = normTeacher(t2);
    if (n1 === n2 && n1.length > 0) return true;
    var w1 = s1.split(/\s+/), w2 = s2.split(/\s+/);
    if (w1.indexOf(s2) >= 0 || w2.indexOf(s1) >= 0) return true;
    return false;
  }

  function isMobileLayout() {
    return (window.innerWidth || document.documentElement.clientWidth || 0) <= 900;
  }

  STATE._lastWasMobile = isMobileLayout();
  window.addEventListener("resize", function () {
    var mob = isMobileLayout();
    if (mob !== STATE._lastWasMobile) {
      STATE._lastWasMobile = mob;
      mountBar();
      renderGrid();
    }
  });

  render();

  function render() {
    byId("view").innerHTML =
      '<div class="tt-head"><span class="ex-chip">ERP Core</span>' +
        '<h1 class="tt-title">Timetable Management</h1>' +
        '<p class="tt-sub">Master school timetable. Changes drive Homework Diary, Exams and daily schedules. Switch between classes or teachers and browse day by day.</p></div>' +
      '<div id="ttBar" class="tt-bar"></div>' +
      '<div id="ttGrid" class="tt-empty"><i class="material-icons">sync</i> Loading timetable…</div>' +
      importModal() + copyModal();

    P.api("ttBootstrap", [], { overlay: false }).then(function (b) {
      BOOT = b;
      if (BOOT.campuses && BOOT.campuses.length) {
        STATE.campus = BOOT.campuses[0];
      }
      if (BOOT.days && BOOT.days.length) {
        var jsDay = new Date().getDay(); // 0: Sun, 1: Mon, ... 6: Sat
        var matchDay = BOOT.days.find(function (d) { return d.n === jsDay; });
        STATE.day = matchDay ? matchDay.n : BOOT.days[0].n;
      }
      mountBar();
      bindModals();
      loadGrid();
    }).catch(function (e) {
      byId("ttGrid").innerHTML = err(e);
    });
  }

  function getAllDayRows(day) {
    var camps = (BOOT && BOOT.campuses && BOOT.campuses.length) ? BOOT.campuses : [STATE.campus];
    var all = [];
    camps.forEach(function (c) {
      var rows = GRID_CACHE[day + "_" + c] || [];
      rows.forEach(function (r) {
        all.push(Object.assign({}, r, { _campus: c }));
      });
    });
    return all;
  }

  function getTeacherList() {
    var map = {};
    (BOOT && BOOT.teachers ? BOOT.teachers : []).forEach(function (t) {
      if (t && String(t).trim()) map[String(t).trim()] = true;
    });
    var allRows = getAllDayRows(STATE.day);
    allRows.forEach(function (r) {
      (r.cells || []).forEach(function (c) {
        if (c.teacher && String(c.teacher).trim()) {
          map[String(c.teacher).trim()] = true;
        }
      });
    });
    return Object.keys(map).sort(function (a, b) {
      return a.localeCompare(b);
    });
  }

  function getPeriodCell(row, periodNo) {
    if (!row || !row.cells) return null;
    var cells = row.cells;
    for (var i = 0; i < cells.length; i++) {
      if (Number(cells[i].period_no) === periodNo) return cells[i];
    }
    if (cells[periodNo - 1]) return cells[periodNo - 1];
    return null;
  }

  function mountBar() {
    var bar = byId("ttBar");
    if (!bar) return;

    if (isMobileLayout()) {
      mountMobileBar();
      return;
    }

    // Desktop toolbar
    var camp = (BOOT && BOOT.campuses ? BOOT.campuses : []).map(function (c) {
      return '<button class="tt-seg' + (c === STATE.campus ? " on" : "") + '" data-c="' + esc(c) + '">' + esc(c) + '</button>';
    }).join("");
    var days = (BOOT && BOOT.days ? BOOT.days : []).map(function (d) {
      return '<button class="tt-day' + (d.n === STATE.day ? " on" : "") + '" data-d="' + d.n + '">' + esc(d.label.slice(0, 3)) + '</button>';
    }).join("");

    var actions = '';
    if (!P.isMobileAdmin(session)) {
      actions =
        '<div class="tt-actions">' +
          '<button id="ttImport" class="btn btn-outline"><i class="material-icons">content_paste</i> Import</button>' +
          '<button id="ttCopy" class="btn btn-outline"><i class="material-icons">content_copy</i> Copy day</button>' +
          '<button id="ttSave" class="btn btn-maroon"><i class="material-icons">save</i> Save Day</button>' +
        '</div>';
    }

    bar.innerHTML =
      '<div class="tt-controls">' +
        '<div class="tt-grp"><span class="tt-grplbl">Campus</span><div class="tt-segwrap">' + camp + '</div></div>' +
        '<div class="tt-grp"><span class="tt-grplbl">Day</span><div class="tt-daywrap">' + days + '</div></div>' +
      '</div>' +
      actions;

    q(".tt-seg", function (b) { b.onclick = function () { if (guard()) { STATE.campus = b.getAttribute("data-c"); mountBar(); loadGrid(); } }; });
    q(".tt-day", function (b) { b.onclick = function () { if (guard()) { STATE.day = +b.getAttribute("data-d"); mountBar(); loadGrid(); } }; });
    if (byId("ttImport")) byId("ttImport").onclick = openImport;
    if (byId("ttCopy")) byId("ttCopy").onclick = openCopy;
    if (byId("ttSave")) byId("ttSave").onclick = saveGrid;
  }

  function mountMobileBar() {
    var bar = byId("ttBar");
    if (!bar) return;

    var campHtml = "";
    if (BOOT && BOOT.campuses && BOOT.campuses.length > 1) {
      campHtml = '<div class="tt-mob-campuses">' +
        BOOT.campuses.map(function (c) {
          return '<button class="tt-mob-camp-btn' + (c === STATE.campus ? ' active' : '') + '" data-c="' + esc(c) + '">' + esc(c) + '</button>';
        }).join("") +
      '</div>';
    }

    var daysHtml = '<div class="tt-mob-days">' +
      (BOOT && BOOT.days ? BOOT.days : []).map(function (d) {
        var isAct = d.n === STATE.day;
        return '<button class="tt-mob-day-btn' + (isAct ? ' active' : '') + '" data-d="' + d.n + '">' +
          '<span>' + esc(d.label.slice(0, 3)) + '</span>' +
        '</button>';
      }).join("") +
    '</div>';

    var isClass = STATE.mobileMode === "class";
    var optionsHtml = "";
    if (isClass) {
      var allRows = getAllDayRows(STATE.day);
      if (allRows.length) {
        // Group by campus if multiple campuses exist
        var byCamp = {};
        allRows.forEach(function (r) {
          var cName = r._campus || STATE.campus;
          (byCamp[cName] = byCamp[cName] || []).push(r);
        });
        var camps = Object.keys(byCamp);
        if (camps.length > 1) {
          optionsHtml = camps.map(function (cName) {
            var opts = byCamp[cName].map(function (r) {
              return '<option value="' + esc(r.class) + '" data-campus="' + esc(cName) + '"' + (r.class === STATE.selectedClass ? ' selected' : '') + '>Class ' + esc(r.class) + '</option>';
            }).join("");
            return '<optgroup label="' + esc(cName) + ' Campus">' + opts + '</optgroup>';
          }).join("");
        } else {
          optionsHtml = allRows.map(function (r) {
            return '<option value="' + esc(r.class) + '" data-campus="' + esc(r._campus || STATE.campus) + '"' + (r.class === STATE.selectedClass ? ' selected' : '') + '>Class ' + esc(r.class) + '</option>';
          }).join("");
        }
      } else {
        optionsHtml = (STATE.rows || []).map(function (r) {
          return '<option value="' + esc(r.class) + '"' + (r.class === STATE.selectedClass ? ' selected' : '') + '>Class ' + esc(r.class) + '</option>';
        }).join("");
      }
    } else {
      var teachers = getTeacherList();
      optionsHtml = teachers.map(function (t) {
        return '<option value="' + esc(t) + '"' + (t === STATE.selectedTeacher ? ' selected' : '') + '>' + esc(t) + '</option>';
      }).join("");
    }

    bar.innerHTML =
      '<div class="tt-mob-wrap">' +
        '<div class="tt-mob-mode-toggle">' +
          '<button class="tt-mob-mode-btn' + (isClass ? ' active' : '') + '" data-mode="class">' +
            '<i class="material-icons">school</i> By Class' +
          '</button>' +
          '<button class="tt-mob-mode-btn' + (!isClass ? ' active' : '') + '" data-mode="teacher">' +
            '<i class="material-icons">person</i> By Teacher' +
          '</button>' +
        '</div>' +
        daysHtml +
        '<div class="tt-mob-selector-row">' +
          '<button class="tt-mob-step-btn" id="ttMobPrev" title="Previous">‹</button>' +
          '<div class="tt-mob-select-wrap">' +
            '<label class="tt-mob-select-lbl">' + (isClass ? 'Select Class' : 'Select Teacher') + '</label>' +
            '<select id="ttMobEntitySelect" class="mob-select">' +
              optionsHtml +
            '</select>' +
          '</div>' +
          '<button class="tt-mob-step-btn" id="ttMobNext" title="Next">›</button>' +
        '</div>' +
      '</div>';

    q(".tt-mob-camp-btn", function (b) {
      b.onclick = function () {
        STATE.campus = b.getAttribute("data-c");
        mountBar();
        loadGrid();
      };
    });

    q(".tt-mob-day-btn", function (b) {
      b.onclick = function () {
        STATE.day = +b.getAttribute("data-d");
        mountBar();
        loadGrid();
      };
    });

    q(".tt-mob-mode-btn", function (b) {
      b.onclick = function () {
        var m = b.getAttribute("data-mode");
        if (STATE.mobileMode !== m) {
          STATE.mobileMode = m;
          mountBar();
          renderGrid();
        }
      };
    });

    var sel = byId("ttMobEntitySelect");
    if (sel) {
      sel.onchange = function () {
        if (STATE.mobileMode === "class") {
          STATE.selectedClass = sel.value;
          var opt = sel.options[sel.selectedIndex];
          if (opt && opt.getAttribute("data-campus")) {
            var c = opt.getAttribute("data-campus");
            if (c !== STATE.campus) {
              STATE.campus = c;
              STATE.rows = GRID_CACHE[STATE.day + "_" + STATE.campus] || [];
              mountBar();
            }
          }
        } else {
          STATE.selectedTeacher = sel.value;
        }
        renderGrid();
      };
    }

    var prev = byId("ttMobPrev");
    if (prev) {
      prev.onclick = function () {
        if (STATE.mobileMode === "class") {
          var allRows = getAllDayRows(STATE.day);
          var clist = (allRows.length ? allRows : STATE.rows).map(function (r) { return r.class; });
          var idx = clist.indexOf(STATE.selectedClass);
          if (idx > 0) {
            STATE.selectedClass = clist[idx - 1];
            if (allRows[idx - 1] && allRows[idx - 1]._campus) {
              STATE.campus = allRows[idx - 1]._campus;
              STATE.rows = GRID_CACHE[STATE.day + "_" + STATE.campus] || [];
            }
            mountBar();
            renderGrid();
          }
        } else {
          var tlist = getTeacherList();
          var tidx = tlist.indexOf(STATE.selectedTeacher);
          if (tidx > 0) {
            STATE.selectedTeacher = tlist[tidx - 1];
            mountBar();
            renderGrid();
          }
        }
      };
    }

    var next = byId("ttMobNext");
    if (next) {
      next.onclick = function () {
        if (STATE.mobileMode === "class") {
          var allRows = getAllDayRows(STATE.day);
          var clist = (allRows.length ? allRows : STATE.rows).map(function (r) { return r.class; });
          var idx = clist.indexOf(STATE.selectedClass);
          if (idx >= 0 && idx < clist.length - 1) {
            STATE.selectedClass = clist[idx + 1];
            if (allRows[idx + 1] && allRows[idx + 1]._campus) {
              STATE.campus = allRows[idx + 1]._campus;
              STATE.rows = GRID_CACHE[STATE.day + "_" + STATE.campus] || [];
            }
            mountBar();
            renderGrid();
          }
        } else {
          var tlist = getTeacherList();
          var tidx = tlist.indexOf(STATE.selectedTeacher);
          if (tidx >= 0 && tidx < tlist.length - 1) {
            STATE.selectedTeacher = tlist[tidx + 1];
            mountBar();
            renderGrid();
          }
        }
      };
    }
  }

  function guard() {
    if (STATE.dirty && !confirm("You have unsaved changes. Discard them?")) return false;
    STATE.dirty = false;
    return true;
  }

  function loadGrid() {
    byId("ttGrid").innerHTML = '<div class="tt-empty"><i class="material-icons">sync</i> Loading…</div>';

    var camps = (BOOT && BOOT.campuses && BOOT.campuses.length) ? BOOT.campuses : [STATE.campus];
    var promises = camps.map(function (c) {
      var key = STATE.day + "_" + c;
      if (GRID_CACHE[key]) return Promise.resolve({ campus: c, rows: GRID_CACHE[key] });
      return P.api("ttGetGrid", [c, STATE.day], { overlay: false }).then(function (g) {
        GRID_CACHE[key] = g.rows || [];
        return { campus: c, rows: g.rows || [] };
      }).catch(function () {
        return { campus: c, rows: [] };
      });
    });

    Promise.all(promises).then(function () {
      STATE.rows = GRID_CACHE[STATE.day + "_" + STATE.campus] || [];
      STATE.dirty = false;

      var allRows = getAllDayRows(STATE.day);
      if (allRows.length) {
        if (!STATE.selectedClass || !allRows.some(function (r) { return r.class === STATE.selectedClass; })) {
          STATE.selectedClass = (STATE.rows[0] ? STATE.rows[0].class : allRows[0].class);
        }
      } else if (STATE.rows.length) {
        if (!STATE.selectedClass || !STATE.rows.some(function (r) { return r.class === STATE.selectedClass; })) {
          STATE.selectedClass = STATE.rows[0].class;
        }
      }

      var teachers = getTeacherList();
      if (teachers.length) {
        if (!STATE.selectedTeacher || teachers.indexOf(STATE.selectedTeacher) < 0) {
          STATE.selectedTeacher = teachers[0];
        }
      }

      if (isMobileLayout()) {
        mountMobileBar();
      }
      renderGrid();
    }).catch(function (e) {
      byId("ttGrid").innerHTML = err(e);
    });
  }

  function subjList() { return (BOOT && BOOT.subjects ? BOOT.subjects : []).map(function (s) { return '<option value="' + esc(s) + '">'; }).join(""); }
  function teachList() { return (BOOT && BOOT.teachers ? BOOT.teachers : []).map(function (t) { return '<option value="' + esc(t) + '">'; }).join(""); }

  function renderGrid() {
    if (isMobileLayout()) {
      renderMobileGrid();
      return;
    }

    if (!STATE.rows.length) {
      byId("ttGrid").innerHTML = '<div class="tt-empty"><i class="material-icons">grid_off</i>No classes for ' + esc(STATE.campus) + '.</div>';
      return;
    }
    var head = '<tr><th class="tt-cls">Class</th>';
    for (var p = 1; p <= 8; p++) head += '<th>P' + p + '</th>';
    head += '</tr>';
    var body = STATE.rows.map(function (r, ri) {
      var tds = r.cells.map(function (c, ci) {
        return '<td class="tt-cell' + (c.isActivity ? " act" : "") + '">' +
          '<input class="tt-sub" list="ttSubs" placeholder="Subject" value="' + esc(c.subject) + '" data-r="' + ri + '" data-c="' + ci + '" data-k="subject">' +
          '<input class="tt-teach" list="ttTeach" placeholder="Teacher" value="' + esc(c.teacher) + '" data-r="' + ri + '" data-c="' + ci + '" data-k="teacher">' +
          '<label class="tt-act" title="Activity (no homework)"><input type="checkbox" data-r="' + ri + '" data-c="' + ci + '" data-k="isActivity"' + (c.isActivity ? " checked" : "") + '>A</label>' +
          '</td>';
      }).join("");
      return '<tr><td class="tt-cls">' + esc(r.class) + '</td>' + tds + '</tr>';
    }).join("");
    byId("ttGrid").innerHTML =
      '<datalist id="ttSubs">' + subjList() + '</datalist>' +
      '<datalist id="ttTeach">' + teachList() + '</datalist>' +
      '<div class="tt-gridwrap"><table class="tt-table"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' +
      '<div class="tt-legend"><span class="chip act">A = Activity (Sports/Games — no homework)</span> · Leave a cell blank to remove that period.</div>';
    q(".tt-sub,.tt-teach,.tt-act input", function (el) {
      var ev = el.type === "checkbox" ? "change" : "input";
      el.addEventListener(ev, function () {
        var ri = +el.getAttribute("data-r"), ci = +el.getAttribute("data-c"), k = el.getAttribute("data-k");
        STATE.rows[ri].cells[ci][k] = el.type === "checkbox" ? el.checked : el.value;
        if (k === "isActivity") el.closest("td").classList.toggle("act", el.checked);
        STATE.dirty = true;
      });
    });
  }

  function renderMobileGrid() {
    var c = byId("ttGrid");
    if (!c) return;

    if (!STATE.rows || !STATE.rows.length) {
      c.innerHTML = '<div class="tt-empty"><i class="material-icons">event_busy</i>No classes scheduled for ' + esc(STATE.campus) + ' on ' + esc(dayLabel(STATE.day)) + '.</div>';
      return;
    }

    if (STATE.mobileMode === "class") {
      renderMobileClassView(c);
    } else {
      renderMobileTeacherView(c);
    }
  }

  function renderMobileClassView(container) {
    var allRows = getAllDayRows(STATE.day);
    var classRow = null;
    var rowsToSearch = allRows.length ? allRows : (STATE.rows || []);
    for (var i = 0; i < rowsToSearch.length; i++) {
      if (rowsToSearch[i].class === STATE.selectedClass) {
        classRow = rowsToSearch[i];
        break;
      }
    }
    if (!classRow && rowsToSearch.length) {
      classRow = rowsToSearch[0];
      STATE.selectedClass = classRow.class;
    }
    if (!classRow) {
      container.innerHTML = '<div class="tt-empty"><i class="material-icons">event_busy</i>No classes scheduled for ' + esc(dayLabel(STATE.day)) + '.</div>';
      return;
    }

    var sel = byId("ttMobEntitySelect");
    if (sel && sel.value !== STATE.selectedClass) sel.value = STATE.selectedClass;

    var academicCount = 0, activityCount = 0, freeCount = 0;
    for (var p = 1; p <= 8; p++) {
      var cell = getPeriodCell(classRow, p);
      if (!cell || !cell.subject || !cell.subject.trim()) {
        freeCount++;
      } else if (cell.isActivity || ACTIVITY[cell.subject.toLowerCase()]) {
        activityCount++;
      } else {
        academicCount++;
      }
    }

    var campusLabel = classRow._campus || STATE.campus || "Campus";

    var summaryHtml =
      '<div class="tt-mob-summary-card">' +
        '<div class="tt-mob-summary-top">' +
          '<div class="tt-mob-summary-title-wrap">' +
            '<div class="tt-mob-summary-name"><i class="material-icons">school</i> Class ' + esc(classRow.class) + '</div>' +
            '<div class="tt-mob-summary-sub"><i class="material-icons">domain</i> ' + esc(campusLabel) + ' Campus</div>' +
          '</div>' +
          '<span class="tt-mob-summary-day">' + esc(dayLabel(STATE.day)) + '</span>' +
        '</div>' +
        '<div class="tt-mob-stat-grid">' +
          '<div class="tt-mob-stat-box academic">' +
            '<div class="tt-mob-sb-val">' + academicCount + '</div>' +
            '<div class="tt-mob-sb-lbl">Academic</div>' +
          '</div>' +
          '<div class="tt-mob-stat-box activity">' +
            '<div class="tt-mob-sb-val">' + activityCount + '</div>' +
            '<div class="tt-mob-sb-lbl">Activity</div>' +
          '</div>' +
          '<div class="tt-mob-stat-box free">' +
            '<div class="tt-mob-sb-val">' + freeCount + '</div>' +
            '<div class="tt-mob-sb-lbl">Free</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    var periodsHtml = '<div class="tt-mob-timeline">';
    for (var p = 1; p <= 8; p++) {
      var cell = getPeriodCell(classRow, p);
      var hasSubj = !!(cell && cell.subject && cell.subject.trim());
      var isAct = hasSubj && (cell.isActivity || ACTIVITY[cell.subject.toLowerCase()]);

      if (hasSubj) {
        periodsHtml +=
          '<div class="tt-mob-pcard ' + (isAct ? 'is-activity' : 'is-academic') + '">' +
            '<div class="tt-mob-pbadge">' +
              '<span class="tt-mob-pb-num">P' + p + '</span>' +
              '<span class="tt-mob-pb-sub">' + (isAct ? 'ACT' : 'PERIOD') + '</span>' +
            '</div>' +
            '<div class="tt-mob-pinfo">' +
              '<div class="tt-mob-psubject">' + esc(cell.subject) + '</div>' +
              '<div class="tt-mob-pmeta">' +
                '<i class="material-icons">person</i>' +
                '<span>' + esc(cell.teacher || "No Teacher Assigned") + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="tt-mob-paction">' +
              (isAct
                ? '<span class="tt-mob-status-pill activity"><i class="material-icons">sports_soccer</i> Activity</span>'
                : '<span class="tt-mob-status-pill academic">Academic</span>') +
            '</div>' +
          '</div>';
      } else {
        periodsHtml +=
          '<div class="tt-mob-pcard is-free">' +
            '<div class="tt-mob-pbadge">' +
              '<span class="tt-mob-pb-num">P' + p + '</span>' +
              '<span class="tt-mob-pb-sub">FREE</span>' +
            '</div>' +
            '<div class="tt-mob-pinfo">' +
              '<div class="tt-mob-psubject">Free Period</div>' +
              '<div class="tt-mob-pmeta">' +
                '<span class="tt-mob-free-hint">No subject scheduled</span>' +
              '</div>' +
            '</div>' +
            '<div class="tt-mob-paction">' +
              '<span class="tt-mob-status-pill free">Free</span>' +
            '</div>' +
          '</div>';
      }
    }
    periodsHtml += '</div>';

    container.innerHTML = summaryHtml + periodsHtml;
  }

  function renderMobileTeacherView(container) {
    var teachers = getTeacherList();
    if (!teachers.length) {
      container.innerHTML = '<div class="tt-empty"><i class="material-icons">person_off</i>No teachers found.</div>';
      return;
    }
    if (!STATE.selectedTeacher || teachers.indexOf(STATE.selectedTeacher) < 0) {
      STATE.selectedTeacher = teachers[0];
    }

    var sel = byId("ttMobEntitySelect");
    if (sel && sel.value !== STATE.selectedTeacher) sel.value = STATE.selectedTeacher;

    var allRows = getAllDayRows(STATE.day);
    var teacherSlotsByPeriod = {};
    for (var p = 1; p <= 8; p++) teacherSlotsByPeriod[p] = [];

    allRows.forEach(function (r) {
      for (var p = 1; p <= 8; p++) {
        var c = getPeriodCell(r, p);
        if (c && c.teacher && teacherMatches(c.teacher, STATE.selectedTeacher)) {
          teacherSlotsByPeriod[p].push({ className: r.class, campus: r._campus, cell: c });
        }
      }
    });

    var assignedCount = 0, freeCount = 0, conflictCount = 0;
    var classesSet = {};
    var teacherCampusesSet = {};

    for (var p = 1; p <= 8; p++) {
      var slots = teacherSlotsByPeriod[p];
      if (slots.length === 0) {
        freeCount++;
      } else {
        assignedCount++;
        if (slots.length > 1) conflictCount++;
        slots.forEach(function (s) {
          classesSet[s.className] = true;
          if (s.campus) teacherCampusesSet[s.campus] = true;
        });
      }
    }
    var classNames = Object.keys(classesSet);
    var teacherCampuses = Object.keys(teacherCampusesSet);

    var summaryHtml =
      '<div class="tt-mob-summary-card' + (conflictCount > 0 ? ' has-conflict' : '') + '">' +
        '<div class="tt-mob-summary-top">' +
          '<div class="tt-mob-summary-title-wrap">' +
            '<div class="tt-mob-summary-name"><i class="material-icons">badge</i> ' + esc(STATE.selectedTeacher) + '</div>' +
            '<div class="tt-mob-summary-sub"><i class="material-icons">domain</i> ' + (teacherCampuses.length ? esc(teacherCampuses.join(', ') + ' Campus') : 'All Campuses') + '</div>' +
          '</div>' +
          '<span class="tt-mob-summary-day">' + esc(dayLabel(STATE.day)) + '</span>' +
        '</div>' +
        '<div class="tt-mob-stat-grid">' +
          '<div class="tt-mob-stat-box academic">' +
            '<div class="tt-mob-sb-val">' + assignedCount + '</div>' +
            '<div class="tt-mob-sb-lbl">Teaching</div>' +
          '</div>' +
          '<div class="tt-mob-stat-box classes">' +
            '<div class="tt-mob-sb-val">' + classNames.length + '</div>' +
            '<div class="tt-mob-sb-lbl">' + (classNames.length === 1 ? 'Class' : 'Classes') + '</div>' +
          '</div>' +
          '<div class="tt-mob-stat-box free">' +
            '<div class="tt-mob-sb-val">' + freeCount + '</div>' +
            '<div class="tt-mob-sb-lbl">Free</div>' +
          '</div>' +
        '</div>' +
        (conflictCount > 0 ? '<div class="tt-mob-conflict-banner"><i class="material-icons">warning</i> ' + conflictCount + ' Period Conflict(s) Detected</div>' : '') +
      '</div>';

    var periodsHtml = '<div class="tt-mob-timeline">';
    for (var p = 1; p <= 8; p++) {
      var slots = teacherSlotsByPeriod[p];

      if (slots.length === 1) {
        var slot = slots[0];
        var isAct = slot.cell.isActivity || ACTIVITY[(slot.cell.subject || "").toLowerCase()];
        periodsHtml +=
          '<div class="tt-mob-pcard ' + (isAct ? 'is-activity' : 'is-academic') + '">' +
            '<div class="tt-mob-pbadge">' +
              '<span class="tt-mob-pb-num">P' + p + '</span>' +
              '<span class="tt-mob-pb-sub">' + (isAct ? 'ACT' : 'PERIOD') + '</span>' +
            '</div>' +
            '<div class="tt-mob-pinfo">' +
              '<div class="tt-mob-psubject">' + esc(slot.cell.subject || "No Subject") + '</div>' +
              '<div class="tt-mob-pmeta">' +
                '<i class="material-icons">school</i>' +
                '<span>Class ' + esc(slot.className) + (slot.campus ? (' · ' + esc(slot.campus)) : '') + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="tt-mob-paction">' +
              (isAct
                ? '<span class="tt-mob-status-pill activity"><i class="material-icons">sports_soccer</i> Activity</span>'
                : '<span class="tt-mob-status-pill academic">Class ' + esc(slot.className) + '</span>') +
            '</div>' +
          '</div>';
      } else if (slots.length > 1) {
        var conflictText = slots.map(function (s) { return 'Class ' + esc(s.className) + ' (' + esc(s.cell.subject || "Period") + ')'; }).join(" & ");
        periodsHtml +=
          '<div class="tt-mob-pcard is-conflict">' +
            '<div class="tt-mob-pbadge">' +
              '<span class="tt-mob-pb-num">P' + p + '</span>' +
              '<span class="tt-mob-pb-sub">ALERT</span>' +
            '</div>' +
            '<div class="tt-mob-pinfo">' +
              '<div class="tt-mob-psubject" style="color:#b91c1c;">Schedule Conflict (' + slots.length + ' Classes)</div>' +
              '<div class="tt-mob-pmeta" style="color:#991b1b;font-weight:600;">' +
                '<i class="material-icons" style="color:#b91c1c;">warning</i>' +
                '<span>' + conflictText + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="tt-mob-paction">' +
              '<span class="tt-mob-status-pill conflict"><i class="material-icons">warning</i> Conflict</span>' +
            '</div>' +
          '</div>';
      } else {
        periodsHtml +=
          '<div class="tt-mob-pcard is-free">' +
            '<div class="tt-mob-pbadge">' +
              '<span class="tt-mob-pb-num">P' + p + '</span>' +
              '<span class="tt-mob-pb-sub">FREE</span>' +
            '</div>' +
            '<div class="tt-mob-pinfo">' +
              '<div class="tt-mob-psubject">Free Period</div>' +
              '<div class="tt-mob-pmeta">' +
                '<span class="tt-mob-free-hint">No teaching class assigned</span>' +
              '</div>' +
            '</div>' +
            '<div class="tt-mob-paction">' +
              '<span class="tt-mob-status-pill free">Free</span>' +
            '</div>' +
          '</div>';
      }
    }
    periodsHtml += '</div>';

    container.innerHTML = summaryHtml + periodsHtml;
  }

  function saveGrid() {
    var cells = [];
    STATE.rows.forEach(function (r) { r.cells.forEach(function (c) { cells.push({ class: r.class, period_no: c.period_no, subject: c.subject, teacher: c.teacher, phone: c.phone || "", isActivity: !!c.isActivity }); }); });
    var b = byId("ttSave"); if (!b) return;
    b.disabled = true; b.innerHTML = '<i class="material-icons">sync</i> Saving…';
    P.api("ttSaveGrid", [STATE.day, cells], { text: "Saving timetable…" }).then(function (r) {
      STATE.dirty = false; toast("Saved · " + r.saved + " slots" + (r.cleared ? " · " + r.cleared + " cleared" : ""), "ok");
    }).catch(function (e) { toast(e.message || e, "err"); }).finally(function () { b.disabled = false; b.innerHTML = '<i class="material-icons">save</i> Save Day'; });
  }

  /* ---------- copy day ---------- */
  function openCopy() {
    var opts = (BOOT && BOOT.days ? BOOT.days : []).filter(function (d) { return d.n !== STATE.day; }).map(function (d) { return '<option value="' + d.n + '">' + d.label + '</option>'; }).join("");
    byId("cpFrom").innerHTML = opts;
    byId("cpTitle").textContent = "Copy into " + dayLabel(STATE.day) + " (" + STATE.campus + ")";
    P.openModal("ttCopyModal");
  }
  function doCopy() {
    var from = +byId("cpFrom").value;
    var classes = (STATE.rows || []).map(function (r) { return r.class; });
    P.api("ttCopyDay", [from, STATE.day, classes], { text: "Copying…" }).then(function (r) {
      P.closeModal("ttCopyModal"); toast("Copied " + r.copied + " slots from " + dayLabel(from) + ".", "ok"); loadGrid();
    }).catch(function (e) { toast(e.message || e, "err"); });
  }

  /* ---------- import: quote-aware TSV paste from Excel/Sheets ---------- */
  function openImport() { byId("imText").value = ""; P.openModal("ttImportModal"); }

  // parse tab-separated text where cells may be quoted and contain newlines
  function parseTSV(text) {
    var rows = [], row = [], cur = "", inQ = false, i = 0, n = text.length;
    while (i < n) {
      var ch = text[i];
      if (inQ) {
        if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i += 2; continue; } inQ = false; i++; continue; }
        cur += ch; i++; continue;
      }
      if (ch === '"') { inQ = true; i++; continue; }
      if (ch === '\t') { row.push(cur); cur = ""; i++; continue; }
      if (ch === '\r') { i++; continue; }
      if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ""; i++; continue; }
      cur += ch; i++;
    }
    if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }

  function parsePaste() {
    var raw = byId("imText").value;
    if (!raw.trim()) { toast("Paste the grid first.", "err"); return; }
    var grid = parseTSV(raw);
    if (!grid.length) { toast("Nothing to import.", "err"); return; }

    var hIdx = -1;
    for (var r = 0; r < grid.length; r++) {
      if (grid[r].some(function (c) { return String(c).trim().toUpperCase() === "PERIOD"; })) { hIdx = r; break; }
    }
    if (hIdx < 0) hIdx = 0;
    var hdr = grid[hIdx];

    var pcols = [];
    for (var ci = 1; ci < hdr.length; ci++) {
      var t = String(hdr[ci]).trim();
      if (/^[1-9]/.test(t)) pcols.push(ci);
    }
    pcols = pcols.slice(0, 8);
    if (!pcols.length) { toast("Could not find period columns in the paste (need the header row with 1..8).", "err"); return; }

    var applied = 0, unknownTeach = 0, unmatched = [];
    for (var ri = hIdx + 1; ri < grid.length; ri++) {
      var cols = grid[ri];
      var label = "";
      for (var k = 0; k < Math.min(2, cols.length); k++) { if (String(cols[k]).trim()) { label = String(cols[k]).trim(); break; } }
      if (!label) continue;
      var cls = canonClass(label);
      if (!cls) continue;
      var row = STATE.rows.filter(function (rr) { return canonClass(rr.class) === cls; })[0];
      if (!row) { unmatched.push(label); continue; }
      for (var pi = 0; pi < pcols.length && pi < 8; pi++) {
        var cell = String(cols[pcols[pi]] || "").trim();
        var lines = cell.split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
        var subject = lines[0] || "";
        var teacher = lines.length > 1 ? lines[1] : "";
        row.cells[pi].subject = subject;
        row.cells[pi].teacher = teacher;
        row.cells[pi].isActivity = !!(subject && ACTIVITY[subject.toLowerCase()]);
        if (subject && !teacher && !ACTIVITY[subject.toLowerCase()]) unknownTeach++;
      }
      applied++;
    }
    P.closeModal("ttImportModal");
    STATE.dirty = true; renderGrid();
    var msg = "Imported " + applied + " class row(s)";
    if (unknownTeach) msg += " · " + unknownTeach + " teacher(s) blank";
    if (unmatched.length) msg += " · skipped: " + unmatched.slice(0, 4).join(", ") + (unmatched.length > 4 ? "…" : "");
    toast(msg + ". Review & Save.", "ok");
  }

  function canonClass(s) {
    var u = String(s).toUpperCase().replace(/\s+/g, "").replace(/\.0+$/, "").replace(/^GRADE[-]?/, "");
    if (u === "PRE-KG" || u === "PREKG") u = "NURSERY";
    return u;
  }

  /* ---------- modals / helpers ---------- */
  function dayLabel(n) { var d = (BOOT && BOOT.days ? BOOT.days : []).filter(function (x) { return x.n === n; })[0]; return d ? d.label : "Day " + n; }
  function importModal() {
    return '<div class="modal-overlay" id="ttImportModal"><div class="tt-modal"><div class="tt-mhead"><span><i class="material-icons" style="vertical-align:-4px">content_paste</i> Import from Excel (paste a day)</span><button data-close="ttImportModal">&times;</button></div>' +
      '<div class="tt-mbody">' +
        '<div class="tt-note"><i class="material-icons">info</i> In Excel/Sheets, select the whole day block <b>including the PERIOD header row</b> and the class rows. Copy (Ctrl+C) and paste below. It auto-detects the 8 period columns (skipping Break/Lunch/Diary), and reads <b>Subject</b> on the first line and <b>Teacher</b> on the second line of each cell. Fix any blank cell after import.</div>' +
        '<textarea id="imText" class="tt-paste" placeholder="Paste here — e.g. copy the CLASSES SCHEDULE - MONDAY block from your Excel timetable."></textarea>' +
      '</div><div class="tt-mfoot"><button class="btn btn-outline" data-close="ttImportModal">Cancel</button><button id="imGo" class="btn btn-maroon"><i class="material-icons">download_done</i> Import into grid</button></div></div></div>';
  }
  function copyModal() {
    return '<div class="modal-overlay" id="ttCopyModal"><div class="tt-modal"><div class="tt-mhead"><span id="cpTitle">Copy day</span><button data-close="ttCopyModal">&times;</button></div>' +
      '<div class="tt-mbody"><div class="tt-note"><i class="material-icons">info</i> Copies another day\'s grid into the current day for the visible classes. The current day\'s existing entries for those classes are replaced.</div>' +
      '<label class="tt-lbl">Copy from</label><select id="cpFrom" class="tt-in"></select></div>' +
      '<div class="tt-mfoot"><button class="btn btn-outline" data-close="ttCopyModal">Cancel</button><button id="cpGo" class="btn btn-maroon"><i class="material-icons">content_copy</i> Copy</button></div></div></div>';
  }
  function bindModals() {
    q("[data-close]", function (b) { b.onclick = function () { P.closeModal(b.getAttribute("data-close")); }; });
    q(".modal-overlay", function (m) { m.addEventListener("click", function (e) { if (e.target === m) P.closeModal(m.id); }); });
    if (byId("imGo")) byId("imGo").onclick = parsePaste;
    if (byId("cpGo")) byId("cpGo").onclick = doCopy;
  }

  function q(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }
  function err(e) { return '<div class="tt-empty"><i class="material-icons">error_outline</i>' + esc(e && e.message ? e.message : e) + '</div>'; }
  function toast(msg, kind) {
    var t = byId("ttToast"); if (!t) { t = document.createElement("div"); t.id = "ttToast"; document.body.appendChild(t); }
    var ic = kind === "err" ? "error" : (kind === "ok" ? "check_circle" : "info");
    t.className = ""; if (kind) t.classList.add(kind);
    t.innerHTML = '<i class="material-icons">' + ic + '</i>' + esc(msg);
    void t.offsetWidth; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove("show"); }, 3200);
  }

  function injectCss() {
    if (byId("tt-css")) return;
    var css =
    ".tt-head{margin-bottom:10px}.tt-title{font-size:22px;color:var(--maroon);margin:4px 0}.tt-sub{color:var(--text-muted);font-size:13px;max-width:760px}" +
    ".ex-chip{font-size:11px;font-weight:700;color:var(--maroon);background:var(--primary-light);padding:3px 10px;border-radius:999px}" +
    ".tt-bar{display:flex;flex-wrap:wrap;gap:14px;align-items:center;background:#fff;border:1px solid var(--border);border-radius:14px;padding:12px 14px;box-shadow:var(--shadow-sm);margin-bottom:14px}" +
    ".tt-controls{display:flex;flex-wrap:wrap;gap:16px;align-items:center;margin-right:auto}" +
    ".tt-grp{display:flex;flex-direction:column;gap:5px}.tt-grplbl{font-size:11px;font-weight:800;color:var(--text-muted);letter-spacing:.3px;text-transform:uppercase}" +
    ".tt-segwrap,.tt-daywrap{display:inline-flex;gap:4px;background:#f1f5f9;border:1px solid var(--border);border-radius:999px;padding:4px}" +
    ".tt-seg,.tt-day{border:none;background:transparent;font-weight:700;font-size:13px;padding:7px 14px;border-radius:999px;cursor:pointer;color:var(--text-muted);white-space:nowrap}" +
    ".tt-seg.on,.tt-day.on{background:var(--maroon);color:#fff}" +
    ".tt-actions{display:flex;gap:8px;flex-wrap:nowrap;align-items:center}" +
    ".btn{border:none;border-radius:10px;padding:9px 14px;font-weight:700;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}.btn-maroon{background:var(--maroon);color:#fff}.btn-outline{background:#fff;border:1px solid var(--border);color:var(--text-main)}.btn i{font-size:18px}.btn:disabled{opacity:.6}" +
    ".tt-empty{text-align:center;padding:32px;color:var(--text-muted);font-weight:600;background:#fff;border:1px dashed var(--border);border-radius:14px}.tt-empty i{font-size:32px;color:var(--maroon);display:block;margin-bottom:8px}" +
    ".tt-gridwrap{overflow:auto;background:#fff;border:1px solid var(--border);border-radius:14px}" +
    ".tt-table{border-collapse:separate;border-spacing:0;width:100%;font-size:12px}" +
    ".tt-table th,.tt-table td{border-bottom:1px solid #eef2f7;border-right:1px solid #eef2f7;padding:4px;vertical-align:top}" +
    ".tt-table thead th{position:sticky;top:0;background:#faf5f5;color:var(--maroon);font-weight:800;text-align:center;z-index:3}" +
    ".tt-table td.tt-cls,.tt-table th.tt-cls{position:sticky;left:0;background:#fff;font-weight:800;color:var(--text-main);min-width:74px;text-align:center;z-index:2}" +
    ".tt-table thead th.tt-cls{z-index:4;background:#faf5f5}" +
    ".tt-cell{min-width:120px}.tt-cell.act{background:#f4f4f4}" +
    ".tt-sub,.tt-teach{width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:5px 6px;font:inherit;font-size:12px;background:#fff;margin-bottom:3px}" +
    ".tt-sub{font-weight:700}.tt-teach{color:#475569}" +
    ".tt-act{display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;color:#64748b;cursor:pointer}.tt-act input{accent-color:var(--maroon)}" +
    ".tt-legend{font-size:12px;color:var(--text-muted);margin-top:8px}.tt-legend .chip.act{background:#f4f4f4;padding:2px 8px;border-radius:6px;font-weight:700}" +
    ".modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,.45);display:none;align-items:center;justify-content:center;z-index:9999;padding:16px}.modal-overlay.show{display:flex}" +
    ".tt-modal{background:#fff;border-radius:16px;max-width:640px;width:100%;max-height:90vh;display:flex;flex-direction:column}" +
    ".tt-mhead{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid var(--border);font-weight:700}.tt-mhead button{border:none;background:none;font-size:24px;cursor:pointer}" +
    ".tt-mbody{padding:16px;overflow:auto}.tt-mfoot{display:flex;justify-content:flex-end;gap:8px;padding:14px 18px;border-top:1px solid var(--border)}" +
    ".tt-note{display:flex;gap:8px;background:var(--primary-light);border:1px solid var(--border);border-radius:10px;padding:10px 12px;font-size:12.5px;margin-bottom:10px;line-height:1.5}.tt-note i{color:var(--maroon);font-size:18px;flex:0 0 auto}" +
    ".tt-paste{width:100%;min-height:200px;border:1px solid var(--border);border-radius:10px;padding:10px;font-family:monospace;font-size:12px}" +
    ".tt-lbl{font-size:12px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px}.tt-in{width:100%;padding:9px 11px;border:1px solid var(--border);border-radius:10px;font:inherit}" +
    "#ttToast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%) translateY(20px);z-index:99999;background:#14171f;color:#fff;padding:12px 18px;border-radius:12px;font-size:14px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.25);display:flex;align-items:center;gap:8px;opacity:0;pointer-events:none;transition:all .25s;max-width:88vw}#ttToast.show{opacity:1;transform:translateX(-50%) translateY(0)}#ttToast.ok{background:#065f46}#ttToast.err{background:#991b1b}#ttToast i{font-size:18px}" +

    /* =========================================================================
       MOBILE REDESIGN STYLES (max-width: 900px)
       ========================================================================= */
    "@media(max-width:900px){" +
      ".tt-head{margin-bottom:6px}" +
      ".tt-title{font-size:19px;margin:2px 0}" +
      ".tt-sub, .ex-chip, .tt-mob-campuses{display:none!important}" +
      ".tt-bar{padding:10px 12px;border-radius:14px;margin-bottom:12px;display:block}" +
      ".tt-mob-wrap{width:100%;max-width:100%;box-sizing:border-box}" +

      ".tt-mob-campuses{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-bottom:8px;width:100%;box-sizing:border-box}" +
      ".tt-mob-camp-btn{border:1px solid var(--border);background:#fff;padding:7px 10px;border-radius:999px;font-weight:700;font-size:12px;color:var(--text-muted);text-align:center;cursor:pointer;min-height:36px;white-space:nowrap}" +
      ".tt-mob-camp-btn.active{background:var(--maroon);color:#fff;border-color:var(--maroon);box-shadow:0 1px 4px rgba(107,29,47,0.25)}" +

      ".tt-mob-mode-toggle{display:flex;background:#f1f5f9;border-radius:12px;padding:4px;gap:6px;width:100%;box-sizing:border-box;margin-bottom:10px}" +
      ".tt-mob-mode-btn{flex:1;border:none;background:transparent;padding:9px 10px;border-radius:8px;font-weight:700;font-size:13px;color:#64748b;display:inline-flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;min-height:40px}" +
      ".tt-mob-mode-btn.active{background:var(--maroon);color:#fff;box-shadow:0 1px 4px rgba(107,29,47,0.25)}" +
      ".tt-mob-mode-btn i{font-size:17px}" +

      ".tt-mob-days{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin-bottom:10px;width:100%;box-sizing:border-box}" +
      ".tt-mob-day-btn{padding:8px 2px;border:1px solid #e2e8f0;background:#fff;border-radius:10px;font-weight:700;font-size:12px;color:#64748b;text-align:center;cursor:pointer;display:flex;align-items:center;justify-content:center;min-height:38px;min-width:0;box-sizing:border-box}" +
      ".tt-mob-day-btn.active{background:var(--maroon);color:#fff;border-color:var(--maroon);box-shadow:0 2px 6px rgba(107,29,47,0.2)}" +

      ".tt-mob-selector-row{display:flex;align-items:flex-end;gap:8px;width:100%;box-sizing:border-box;margin-bottom:6px}" +
      ".tt-mob-step-btn{flex:0 0 42px;height:42px;border:1px solid #cbd5e1;background:#fff;border-radius:10px;font-size:22px;line-height:1;font-weight:700;color:var(--maroon);cursor:pointer;display:inline-flex;align-items:center;justify-content:center}" +
      ".tt-mob-step-btn:active{background:#f1f5f9}" +
      ".tt-mob-select-wrap{flex:1;min-width:0}" +
      ".tt-mob-select-lbl{display:block;font-size:10.5px;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px}" +
      ".tt-mob-select-wrap select.mob-select{width:100%;min-height:42px;height:42px;border:1px solid #cbd5e1;border-radius:10px;padding:0 10px;font-weight:700;font-size:13.5px;color:#1e293b;background:#fff;box-sizing:border-box}" +

      ".tt-mob-summary-card{background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:12px 14px;margin-bottom:12px;box-shadow:0 1px 4px rgba(0,0,0,0.04);box-sizing:border-box}" +
      ".tt-mob-summary-card.has-conflict{border-color:#fca5a5;background:#fff8f8}" +
      ".tt-mob-summary-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px}" +
      ".tt-mob-summary-title-wrap{display:flex;flex-direction:column;gap:2px}" +
      ".tt-mob-summary-name{font-size:16px;font-weight:800;color:var(--maroon);display:flex;align-items:center;gap:6px}" +
      ".tt-mob-summary-name i{font-size:18px}" +
      ".tt-mob-summary-sub{font-size:11.5px;font-weight:600;color:#64748b;display:flex;align-items:center;gap:4px}" +
      ".tt-mob-summary-sub i{font-size:13px;color:#94a3b8}" +
      ".tt-mob-summary-day{font-size:11.5px;font-weight:700;color:#64748b;background:#f1f5f9;padding:4px 10px;border-radius:999px;white-space:nowrap}" +

      ".tt-mob-stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:100%;box-sizing:border-box}" +
      ".tt-mob-stat-box{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:8px 4px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:54px;box-sizing:border-box}" +
      ".tt-mob-stat-box .tt-mob-sb-val{font-size:16.5px;font-weight:800;line-height:1.1}" +
      ".tt-mob-stat-box .tt-mob-sb-lbl{font-size:10px;font-weight:800;color:#64748b;margin-top:3px;text-transform:uppercase;letter-spacing:0.3px}" +
      ".tt-mob-stat-box.academic{background:#eff6ff;border-color:#bfdbfe}" +
      ".tt-mob-stat-box.academic .tt-mob-sb-val{color:#1e40af}" +
      ".tt-mob-stat-box.activity{background:#fffbeb;border-color:#fde68a}" +
      ".tt-mob-stat-box.activity .tt-mob-sb-val{color:#b45309}" +
      ".tt-mob-stat-box.classes{background:#faf5ff;border-color:#e9d5ff}" +
      ".tt-mob-stat-box.classes .tt-mob-sb-val{color:#7e22ce}" +
      ".tt-mob-stat-box.free{background:#f8fafc;border-color:#e2e8f0}" +
      ".tt-mob-stat-box.free .tt-mob-sb-val{color:#475569}" +
      ".tt-mob-conflict-banner{margin-top:8px;background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:6px 10px;font-size:11.5px;font-weight:700;color:#b91c1c;display:flex;align-items:center;gap:6px}" +

      ".tt-mob-timeline{display:flex;flex-direction:column;gap:9px;width:100%;box-sizing:border-box}" +
      ".tt-mob-pcard{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:10px 14px;box-shadow:0 1px 3px rgba(0,0,0,0.03);box-sizing:border-box;min-height:64px}" +
      ".tt-mob-pcard.is-academic{border-left:4px solid #3b82f6}" +
      ".tt-mob-pcard.is-activity{border-left:4px solid #f59e0b}" +
      ".tt-mob-pcard.is-conflict{border-left:4px solid #ef4444;background:#fff8f8}" +
      ".tt-mob-pcard.is-free{background:#fbfcfe;border:1px dashed #cbd5e1}" +

      ".tt-mob-pbadge{flex:0 0 46px;width:46px;height:46px;border-radius:10px;background:#eff6ff;border:1px solid #bfdbfe;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#1e40af;font-weight:800;box-sizing:border-box}" +
      ".tt-mob-pbadge .tt-mob-pb-num{font-size:15px;line-height:1}" +
      ".tt-mob-pbadge .tt-mob-pb-sub{font-size:8px;font-weight:800;letter-spacing:0.5px;color:#3b82f6;margin-top:2px}" +
      ".tt-mob-pcard.is-activity .tt-mob-pbadge{background:#fffbeb;border-color:#fde68a;color:#b45309}" +
      ".tt-mob-pcard.is-activity .tt-mob-pbadge .tt-mob-pb-sub{color:#b45309}" +
      ".tt-mob-pcard.is-free .tt-mob-pbadge{background:#f1f5f9;border-color:#e2e8f0;color:#94a3b8}" +
      ".tt-mob-pcard.is-free .tt-mob-pbadge .tt-mob-pb-sub{color:#94a3b8}" +
      ".tt-mob-pcard.is-conflict .tt-mob-pbadge{background:#fee2e2;border-color:#fca5a5;color:#b91c1c}" +
      ".tt-mob-pcard.is-conflict .tt-mob-pbadge .tt-mob-pb-sub{color:#b91c1c}" +

      ".tt-mob-pinfo{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}" +
      ".tt-mob-psubject{font-size:14.5px;font-weight:800;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3}" +
      ".tt-mob-pcard.is-free .tt-mob-psubject{font-size:13.5px;font-weight:600;color:#64748b;font-style:italic}" +
      ".tt-mob-pmeta{font-size:12px;color:#64748b;display:flex;align-items:center;gap:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".tt-mob-pmeta i{font-size:14px;color:var(--maroon);flex-shrink:0}" +
      ".tt-mob-free-hint{color:#94a3b8;font-size:11.5px}" +

      ".tt-mob-paction{flex:0 0 auto;display:flex;align-items:center}" +
      ".tt-mob-status-pill{font-size:11px;font-weight:700;padding:4px 9px;border-radius:6px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap}" +
      ".tt-mob-status-pill.academic{background:#eff6ff;color:#1d4ed8;border:1px solid #dbeafe}" +
      ".tt-mob-status-pill.activity{background:#fef3c7;color:#92400e;border:1px solid #fde68a}" +
      ".tt-mob-status-pill.free{background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0}" +
      ".tt-mob-status-pill.conflict{background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5}" +
    "}";

    var st = document.createElement("style"); st.id = "tt-css"; st.textContent = css; document.head.appendChild(st);
  }
})();

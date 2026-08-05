/* =========================================================================
   examinations-tracker.js — Examinations Tracker (STAFF/teacher). Plain
   script; uses `Portal` + shared `ExamMarks`. Tabs:
     1. Schedule — upcoming-exam chips + month calendar of YOUR exams, and
                   "Add syllabus" for exams still missing it.
                   (getTeacherUpcomingExamsSummary, getTeacherExamCalendarPayload,
                    getTeacherAssignedExamsForSyllabus, getSyllabusMasterLessons,
                    teacherAddExamSyllabus)
     2. Marks    — enter marks for your completed exams (ExamMarks.mountTeacher).
   No Code.gs logic changed.
   ========================================================================= */
(function () {
  "use strict";
  var P = window.Portal, EM = window.ExamMarks;
  var session = P.bootPage("examstrack");
  if (!session) return;
  var esc = P.esc, $ = function (id) { return document.getElementById(id); };
  var me = session.name, toast = EM.toast;
  var st = { tab: "schedule", events: {}, marksMounted: false, pickRow: null, pickCtx: null };

  $("view").innerHTML = shell();
  bindTabs();
  loadUpcoming();
  initCalendar();
  loadPending();

  function shell() {
    return '<div class="card wide-card">' +
      '<div class="mod-head"><div><span class="eyebrow">Staff Portal</span><h2 style="margin-bottom:4px;">Examinations Tracker</h2>' +
      '<p class="view-description" style="margin:0;">Your exams, their syllabus, and marks entry once an exam is done.</p></div></div>' +
      '<div id="exUpcoming" style="margin-bottom:14px;"></div>' +
      '<div class="ex-tabs" id="exTabs">' +
        '<button class="active" data-t="schedule"><i class="material-icons">calendar_month</i> Schedule</button>' +
        '<button data-t="marks"><i class="material-icons">edit_note</i> Marks Entry</button>' +
      '</div>' +
      '<div id="exPaneSchedule">' +
        '<div class="ex-caltoolbar"><h3 id="exCalLabel">—</h3>' +
        '<div class="smart-selector" style="max-width:220px;"><div class="ss-icon"><i class="material-icons">calendar_month</i></div><div class="ss-body"><div class="ss-label">Month</div><input type="month" id="exCalMonth"></div></div></div>' +
        '<div class="cal-head"><div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div></div>' +
        '<div class="cal-grid" id="exCalGrid"></div>' +
        '<div id="exPending"></div>' +
      '</div>' +
      '<div id="exPaneMarks" style="display:none;"></div>' +
      '</div>' + dayModal() + pickModal();
  }

  function bindTabs() {
    Array.prototype.forEach.call($("exTabs").querySelectorAll("button"), function (b) { b.addEventListener("click", function () { switchTab(b.getAttribute("data-t")); }); });
    Array.prototype.forEach.call(document.querySelectorAll("[data-close]"), function (b) { b.addEventListener("click", function () { P.closeModal(b.getAttribute("data-close")); }); });
    Array.prototype.forEach.call(document.querySelectorAll(".modal-overlay"), function (m) { m.addEventListener("click", function (e) { if (e.target === m) P.closeModal(m.id); }); });
  }
  function switchTab(t) {
    st.tab = t;
    $("exPaneSchedule").style.display = (t === "schedule") ? "block" : "none";
    $("exPaneMarks").style.display = (t === "marks") ? "block" : "none";
    Array.prototype.forEach.call($("exTabs").querySelectorAll("button"), function (b) { b.classList.toggle("active", b.getAttribute("data-t") === t); });
    if (t === "marks" && !st.marksMounted) { st.marksMounted = true; $("exPaneMarks").innerHTML = ""; EM.mountTeacher("exPaneMarks", me); }
  }

  /* ---------------- upcoming chips ---------------- */
  function loadUpcoming() {
    P.api("getTeacherUpcomingExamsSummary", [me], { overlay: false }).then(function (list) {
      list = list || []; var box = $("exUpcoming");
      if (!list.length) { box.innerHTML = ""; return; }
      var chips = list.map(function (e) {
        var dl = e.daysLeft, label = dl === 0 ? "Today" : (dl === 1 ? "Tomorrow" : dl + "d");
        var cls = dl <= 3 ? "r" : (dl <= 7 ? "a" : "g");
        var icon = e.allCompleted ? "check_circle" : "warning";
        return '<span class="ex-upchip ' + cls + '" data-day="' + esc(e.dateStr) + '" title="' + esc(e.statusMessage || "") + '"><i class="material-icons">' + icon + "</i>" + esc(e.grade) + " · " + esc(e.subject) + " <b>" + label + "</b></span>";
      }).join("");
      box.innerHTML = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;color:var(--text-muted);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;"><i class="material-icons" style="font-size:14px;color:var(--accent);">event_upcoming</i> Upcoming Exams</div><div class="ex-chiprow">' + chips + "</div>";
      Array.prototype.forEach.call(box.querySelectorAll(".ex-upchip[data-day]"), function (c) { c.addEventListener("click", function () { openDay(c.getAttribute("data-day")); }); });
    }).catch(function () {});
  }

  /* ---------------- calendar ---------------- */
  function initCalendar() { $("exCalMonth").value = P.thisMonth(); $("exCalMonth").addEventListener("change", loadCalendar); loadCalendar(); }
  function loadCalendar() {
    var m = $("exCalMonth").value; if (!m) return;
    var p = m.split("-"), yy = +p[0], mm = +p[1];
    $("exCalLabel").textContent = new Date(yy, mm - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
    $("exCalGrid").innerHTML = '<div class="ex-loading" style="grid-column:span 7;"><i class="material-icons">sync</i></div>';
    P.api("getTeacherExamCalendarPayload", [me, m], { overlay: false }).then(function (pl) { st.events = (pl && pl.events) || {}; renderCal(yy, mm); }).catch(function (e) { $("exCalGrid").innerHTML = '<div class="ex-empty" style="grid-column:span 7;"><i class="material-icons">error_outline</i>' + esc(e.message || e) + "</div>"; });
  }
  function renderCal(yy, mm) {
    var pad = new Date(yy, mm - 1, 1).getDay(), dim = new Date(yy, mm, 0).getDate(), today = P.todayIso(), html = "";
    for (var i = 0; i < pad; i++) html += '<div class="ex-calcell empty"></div>';
    for (var d = 1; d <= dim; d++) {
      var ds = yy + "-" + String(mm).padStart(2, "0") + "-" + String(d).padStart(2, "0");
      var list = st.events[ds] || [], isToday = ds === today;
      var allDone = list.length && list.every(function (e) { return e.completed; });
      var badge = list.length ? '<span class="ex-calbadge ' + (allDone ? "grey" : "") + '">' + list.length + "</span>" : "";
      html += '<div class="ex-calcell ' + (isToday ? "today" : "") + '" ' + (list.length ? 'data-day="' + ds + '"' : "") + ' style="' + (list.length ? (allDone ? "background:#f8fafc;" : "background:#fffcf8;border-color:var(--accent);") : "") + '"><div class="ex-calnum">' + d + "</div>" + badge + "</div>";
    }
    $("exCalGrid").innerHTML = html;
    Array.prototype.forEach.call($("exCalGrid").querySelectorAll(".ex-calcell[data-day]"), function (c) { c.addEventListener("click", function () { openDay(c.getAttribute("data-day")); }); });
  }
  function openDay(ds) {
    var list = st.events[ds] || [];
    $("exDayTitle").textContent = "Exams on " + P.prettyDate(ds);
    if (!list.length) { $("exDayBody").innerHTML = '<div class="ex-empty"><i class="material-icons">event_busy</i>No exams on this date.</div>'; P.openModal("exDayModal"); return; }
    $("exDayBody").innerHTML = list.map(function (e, i) {
      var syl = e.syllabus ? esc(e.syllabus) : '<em style="color:var(--text-muted);">(No syllabus assigned)</em>';
      return '<div class="ex-card ' + (e.completed ? "completed" : "sched") + '" style="grid-template-columns:1fr;">' +
        '<div><div class="t">' + (i + 1) + ". " + esc(e.examName) + '</div><div class="meta"><span><i class="material-icons">groups</i>' + esc(e.grade) + "</span><span><i class='material-icons'>menu_book</i>" + esc(e.subject) + "</span>" + (e.dayName ? "<span><i class='material-icons'>today</i>" + esc(e.dayName) + "</span>" : "") + "</div></div>" +
        '<div class="ex-syl">' + syl + "</div></div>";
    }).join("");
    P.openModal("exDayModal");
  }

  /* ---------------- pending syllabus / assigned exams ---------------- */
  function loadPending() {
    P.api("getTeacherAssignedExamsForSyllabus", [me], { overlay: false }).then(function (list) {
      list = list || [];
      var pending = list.filter(function (e) { return !e.hasSyllabus; });
      var withSyl = list.filter(function (e) { return e.hasSyllabus; });
      var host = $("exPending"), html = "";
      if (!list.length) { host.innerHTML = '<div class="ex-sechead"><i class="material-icons">assignment</i> Your assigned exams</div><div class="ex-empty"><i class="material-icons">event_busy</i>No exams assigned to your classes yet.</div>'; return; }
      if (pending.length) { html += '<div class="ex-sechead pending"><i class="material-icons">assignment_late</i> Syllabus required · ' + pending.length + "</div>" + pending.map(function (e) { return teacherCard(e, true); }).join(""); }
      if (withSyl.length) { html += '<div class="ex-sechead"><i class="material-icons">check_circle</i> Syllabus set · ' + withSyl.length + "</div>" + withSyl.map(function (e) { return teacherCard(e, false); }).join(""); }
      host.innerHTML = html;
      Array.prototype.forEach.call(host.querySelectorAll("[data-addsyl]"), function (b) { b.addEventListener("click", function () { openPicker(+b.getAttribute("data-addsyl"), b.getAttribute("data-grade"), b.getAttribute("data-subject")); }); });
    }).catch(function () {});
  }
  function teacherCard(e, needsSyl) {
    var cls = needsSyl ? "psyl" : (e.isCompleted ? "completed" : "sched");
    var dateChip = e.date ? '<span><i class="material-icons">event</i>' + esc(e.date) + "</span>" : '<span style="color:var(--warning);"><i class="material-icons">event_busy</i>Date not set</span>';
    var mk = e.marks ? '<span><i class="material-icons">grade</i>' + esc(e.marks) + " marks</span>" : "";
    var cta = needsSyl
      ? '<button class="ex-abtn accent" data-addsyl="' + e.rowId + '" data-grade="' + esc(e.grade) + '" data-subject="' + esc(e.subject) + '"><i class="material-icons">library_books</i> Add Syllabus</button>'
      : '<span class="ex-status sched"><i class="material-icons" style="font-size:12px;">lock</i> Locked — contact management</span>';
    var syl = e.hasSyllabus ? '<div class="ex-syl"><b>Syllabus:</b> ' + esc((e.lessons || []).join("; ")) + "</div>" : '<div class="ex-syl empty">Syllabus not yet added</div>';
    return '<div class="ex-card ' + cls + '"><div><div class="t">' + esc(e.examName) + '</div><div class="meta"><span><i class="material-icons">groups</i>' + esc(e.gradeLabel || e.grade) + "</span><span><i class='material-icons'>menu_book</i>" + esc(e.subject) + "</span>" + dateChip + mk + "</div></div><div class='ex-cardacts'>" + cta + "</div>" + syl + "</div>";
  }
  function openPicker(rowId, grade, subject) {
    st.pickRow = rowId; st.pickCtx = { grade: grade, subject: subject };
    $("exPickBody").innerHTML = '<div class="ex-loading"><i class="material-icons">sync</i></div>';
    P.openModal("exPickModal");
    P.api("getSyllabusMasterLessons", [grade, subject], { overlay: false }).then(function (list) {
      if (!list || !list.length) { $("exPickBody").innerHTML = '<div class="ex-empty"><i class="material-icons">inbox</i>No lessons found in Syllabus Master for this class/subject.</div>'; return; }
      $("exPickBody").innerHTML = list.map(function (l, i) {
        return '<label class="ex-pickitem" data-name="' + esc(l.name) + '"><input type="checkbox"><span class="no">' + esc(l.lessonNo || (i + 1)) + '</span><span class="nm">' + esc(l.name) + '</span><span class="mo">' + esc(l.targetMonth || "") + "</span></label>";
      }).join("");
      Array.prototype.forEach.call($("exPickBody").querySelectorAll(".ex-pickitem input"), function (c) { c.addEventListener("change", function () { c.closest(".ex-pickitem").classList.toggle("on", c.checked); }); });
    });
  }
  function commitPicker() {
    var picked = [];
    Array.prototype.forEach.call($("exPickBody").querySelectorAll(".ex-pickitem"), function (l) { var c = l.querySelector("input"); if (c && c.checked) picked.push(l.getAttribute("data-name")); });
    if (!picked.length) { toast("Select at least one lesson.", "err"); return; }
    P.api("teacherAddExamSyllabus", [st.pickRow, picked, me]).then(function (res) {
      if (res && res.success) { P.closeModal("exPickModal"); toast("Syllabus added.", "ok"); loadPending(); loadCalendar(); }
      else toast("Save failed: " + ((res && res.error) || "unknown"), "err");
    }).catch(function (e) { toast("Error: " + (e.message || e), "err"); });
  }

  /* ---------------- modals ---------------- */
  function dayModal() {
    return '<div class="modal-overlay" id="exDayModal"><div class="modal-content" style="max-width:640px;width:100%;max-height:86vh;display:flex;flex-direction:column;">' +
      '<div class="modal-header-container"><h3 id="exDayTitle">Exams</h3><button class="modal-close-icon" data-close="exDayModal">&times;</button></div>' +
      '<div id="exDayBody" style="overflow-y:auto;flex-grow:1;padding-right:4px;"></div></div></div>';
  }
  function pickModal() {
    return '<div class="modal-overlay" id="exPickModal" style="z-index:1200;"><div class="modal-content" style="max-width:560px;width:100%;">' +
      '<div class="modal-header-container"><h3>Add Syllabus</h3><button class="modal-close-icon" data-close="exPickModal">&times;</button></div>' +
      '<p class="ex-note" style="margin-bottom:12px;">Pick the lessons this exam will cover (from Syllabus Master). You can add syllabus only where it is missing — management edits existing ones.</p>' +
      '<div id="exPickBody" class="ex-pick"></div>' +
      '<div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;"><button class="btn btn-secondary" data-close="exPickModal" style="width:auto;">Cancel</button>' +
      '<button class="btn btn-success" id="exPickApply" style="width:auto;"><i class="material-icons" style="color:#fff;">done</i> Save Syllabus</button></div></div></div>';
  }
  $("exPickApply").addEventListener("click", commitPicker);
})();

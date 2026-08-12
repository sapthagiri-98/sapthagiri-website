/* =========================================================================
   examinations.js — Examinations Management (ADMIN). Plain script; uses
   `Portal` + the shared `ExamMarks` engine. Tabs:
     1. Overview   — KPI cards + month calendar (getAdminExamSummaryStats,
                     getAdminExamCalendarPayload, getAdminExamsForDate)
     2. Schedule   — filter + editable table of dates & max marks
                     (examGetScheduleFilters, examGetScheduleTable, examBulkSaveSchedule)
     3. Marks      — class-wise entry for all subjects (ExamMarks.mountAdmin)
     4. Reports    — progress reports + class tabulation PDFs
                     (progressGetClasses, progressGetBucketList, progressGetClassData,
                      progressGenerateReports, progressGenerateTabulation)
   New/Edit exam modal uses: getExamNamePresets, (getAllExamClasses),
     getAdminSubjectsForGrade, getSyllabusMasterLessons, createAdminExam,
     updateAdminExam, deleteAdminExam, getAdminExamById, assignExamDate.
   No Code.gs logic changed.
   ========================================================================= */
(function () {
  "use strict";
  var P = window.Portal, EM = window.ExamMarks;
  var session = P.bootPage("exams");
  if (!session) return;
  var esc = P.esc, $ = function (id) { return document.getElementById(id); };
  var me = session.name, toast = EM.toast;

  var GRADES = ["Nursery", "LKG", "UKG", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10"];
  var st = { tab: "overview", editingRow: null, pickLessons: [], presets: [], marksMounted: false, reportData: null };

  $("view").innerHTML = shell();
  bindTabs();
  loadKpis();
  initCalendar();

  function shell() {
    return '<div class="card wide-card">' +
      '<div class="mod-head"><div><span class="eyebrow">Management</span><h2 style="margin-bottom:4px;">Examinations Management</h2>' +
      '<p class="view-description" style="margin:0;">Schedule exams, add syllabus, enter marks and generate report cards.</p></div>' +
      '<button class="btn btn-warning-action" id="exNewBtn" style="width:auto;padding:10px 16px;"><i class="material-icons" style="color:#fff;">add</i> New Exam</button></div>' +
      '<div class="ex-kpis" id="exKpis"></div>' +
      '<div class="ex-tabs" id="exTabs">' +
        '<button class="active" data-t="overview"><i class="material-icons">calendar_month</i> Overview</button>' +
        '<button data-t="schedule"><i class="material-icons">edit_calendar</i> Schedule</button>' +
        '<button data-t="marks"><i class="material-icons">edit_note</i> Marks Entry</button>' +
        '<button data-t="reports"><i class="material-icons">description</i> Reports</button>' +
      '</div>' +
      '<div id="exPaneOverview">' + overviewPane() + '</div>' +
      '<div id="exPaneSchedule" style="display:none;"></div>' +
      '<div id="exPaneMarks" style="display:none;"></div>' +
      '<div id="exPaneReports" style="display:none;"></div>' +
      '</div>' + formModal() + assignModal() + dayModal() + pickModal();
  }
  function overviewPane() {
    return '<div class="ex-caltoolbar"><h3 id="exCalLabel">—</h3>' +
      '<div class="smart-selector" style="max-width:220px;"><div class="ss-icon"><i class="material-icons">calendar_month</i></div><div class="ss-body"><div class="ss-label">Month</div><input type="month" id="exCalMonth"></div></div></div>' +
      '<div class="cal-head"><div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div></div>' +
      '<div class="cal-grid" id="exCalGrid" style="gap:6px;"></div>';
  }

  /* ---------------- tabs ---------------- */
  function bindTabs() {
    Array.prototype.forEach.call($("exTabs").querySelectorAll("button"), function (b) { b.addEventListener("click", function () { switchTab(b.getAttribute("data-t")); }); });
    $("exNewBtn").addEventListener("click", openCreate);
    Array.prototype.forEach.call(document.querySelectorAll("[data-close]"), function (b) { b.addEventListener("click", function () { P.closeModal(b.getAttribute("data-close")); }); });
    Array.prototype.forEach.call(document.querySelectorAll(".modal-overlay"), function (m) { m.addEventListener("click", function (e) { if (e.target === m) P.closeModal(m.id); }); });
  }
  function switchTab(t) {
    st.tab = t;
    ["overview", "schedule", "marks", "reports"].forEach(function (x) {
      $("exPane" + cap(x)).style.display = (x === t) ? "block" : "none";
    });
    Array.prototype.forEach.call($("exTabs").querySelectorAll("button"), function (b) { b.classList.toggle("active", b.getAttribute("data-t") === t); });
    if (t === "schedule") initSchedule();
    else if (t === "marks" && !st.marksMounted) { st.marksMounted = true; $("exPaneMarks").innerHTML = ""; EM.mountAdmin("exPaneMarks", me); }
    else if (t === "reports" && !$("exPaneReports").innerHTML) initReports();
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* ---------------- KPIs ---------------- */
  function loadKpis() {
    P.api("getAdminExamSummaryStats", [], { overlay: false }).then(function (s) {
      s = s || {};
      $("exKpis").innerHTML =
        kpi("today", "Today", s.todayCount) + kpi("sched", "Scheduled", s.scheduled) +
        kpi("pdate", "Needs date", s.pendingDate) + kpi("psyl", "No syllabus", s.pendingSyllabus) +
        kpi("done", "Completed", s.completed);
    }).catch(function () {});
  }
  function kpi(cls, label, v) { return '<div class="ex-kpi ' + cls + '"><div class="l">' + label + '</div><div class="v">' + (v || 0) + "</div></div>"; }

  /* ---------------- calendar ---------------- */
  function initCalendar() { $("exCalMonth").value = P.thisMonth(); $("exCalMonth").addEventListener("change", loadCalendar); loadCalendar(); }
  function loadCalendar() {
    var m = $("exCalMonth").value; if (!m) return;
    var p = m.split("-"), yy = +p[0], mm = +p[1];
    $("exCalLabel").textContent = new Date(yy, mm - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
    $("exCalGrid").innerHTML = '<div class="ex-loading" style="grid-column:span 7;"><i class="material-icons">sync</i></div>';
    P.api("getAdminExamCalendarPayload", [m], { overlay: false }).then(function (pl) { renderCal((pl && pl.events) || {}, yy, mm); }).catch(function (e) { $("exCalGrid").innerHTML = '<div class="ex-empty" style="grid-column:span 7;"><i class="material-icons">error_outline</i>' + esc(e.message || e) + "</div>"; });
  }
  function renderCal(events, yy, mm) {
    var pad = new Date(yy, mm - 1, 1).getDay(), dim = new Date(yy, mm, 0).getDate(), today = P.todayIso(), html = "";
    for (var i = 0; i < pad; i++) html += '<div class="ex-calcell empty"></div>';
    for (var d = 1; d <= dim; d++) {
      var ds = yy + "-" + String(mm).padStart(2, "0") + "-" + String(d).padStart(2, "0");
      var list = events[ds] || [], isToday = ds === today, mini = "";
      if (list.length) {
        mini = '<span class="ex-calbadge">' + list.length + " exam" + (list.length > 1 ? "s" : "") + "</span>" +
          list.slice(0, 2).map(function (e) { return '<div class="ex-calmini">' + esc(e.gradeLabel || e.grade) + " · " + esc(e.subject) + "</div>"; }).join("") +
          (list.length > 2 ? '<div class="ex-calmini">+' + (list.length - 2) + " more…</div>" : "");
      }
      html += '<div class="ex-calcell ' + (isToday ? "today" : "") + '" data-day="' + ds + '"><div class="ex-calnum">' + d + "</div>" + mini + "</div>";
    }
    $("exCalGrid").innerHTML = html;
    Array.prototype.forEach.call($("exCalGrid").querySelectorAll(".ex-calcell[data-day]"), function (c) { c.addEventListener("click", function () { openDay(c.getAttribute("data-day")); }); });
  }
  function openDay(ds) {
    $("exDayTitle").textContent = "Exams on " + P.prettyDate(ds);
    $("exDayBody").innerHTML = '<div class="ex-loading"><i class="material-icons">sync</i></div>';
    P.openModal("exDayModal");
    P.api("getAdminExamsForDate", [ds], { overlay: false }).then(function (list) {
      if (!list || !list.length) { $("exDayBody").innerHTML = '<div class="ex-empty"><i class="material-icons">event_busy</i>No exams on this date.</div>'; return; }
      $("exDayBody").innerHTML = list.map(function (e) {
        return '<div class="ex-card sched" style="grid-template-columns:1fr auto;"><div><div class="t">' + esc(e.gradeLabel || e.grade) + " · " + esc(e.subject) + "</div>" +
          '<div class="meta"><span>' + esc(e.examName) + "</span>" + (e.marks ? "<span>· " + esc(e.marks) + " marks</span>" : "") + "</div></div>" +
          '<div class="ex-cardacts"><button class="ex-abtn primary" data-edit="' + e.rowId + '"><i class="material-icons">edit</i> Edit</button></div></div>';
      }).join("");
      Array.prototype.forEach.call($("exDayBody").querySelectorAll("[data-edit]"), function (b) { b.addEventListener("click", function () { P.closeModal("exDayModal"); openEdit(+b.getAttribute("data-edit")); }); });
    }).catch(function (e) { $("exDayBody").innerHTML = '<div class="ex-empty"><i class="material-icons">error_outline</i>' + esc(e.message || e) + "</div>"; });
  }

  /* ---------------- schedule editor ---------------- */
  var schedFiltersLoaded = false;
  function initSchedule() {
    if ($("exPaneSchedule").innerHTML) { return; }
    $("exPaneSchedule").innerHTML =
      '<div class="ex-toolbar">' +
        '<div class="ex-field"><label>Exam name</label><select id="exSchExam"><option value="">All exam names</option></select></div>' +
        '<div class="ex-field"><label>Class</label><select id="exSchClass"><option value="">All classes</option></select></div>' +
        '<button class="ex-abtn" id="exSchClear"><i class="material-icons">refresh</i> Clear</button>' +
      '</div><div id="exSchBody"><div class="ex-empty"><i class="material-icons">edit_calendar</i>Loading…</div></div>';
    $("exSchExam").addEventListener("change", loadSchedule);
    $("exSchClass").addEventListener("change", loadSchedule);
    $("exSchClear").addEventListener("click", function () { $("exSchExam").value = ""; $("exSchClass").value = ""; loadSchedule(); });
    P.api("examGetScheduleFilters", [], { overlay: false }).then(function (f) {
      f = f || { examNames: [], classes: [] };
      $("exSchExam").innerHTML = '<option value="">All exam names</option>' + (f.examNames || []).map(function (n) { return '<option value="' + esc(n) + '">' + esc(n) + "</option>"; }).join("");
      $("exSchClass").innerHTML = '<option value="">All classes</option>' + (f.classes || []).map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + "</option>"; }).join("");
      schedFiltersLoaded = true; loadSchedule();
    }).catch(function () { loadSchedule(); });
  }
  function loadSchedule() {
    var en = $("exSchExam").value, cls = $("exSchClass").value;
    $("exSchBody").innerHTML = '<div class="ex-loading"><i class="material-icons">sync</i></div>';
    P.api("examGetScheduleTable", [en, cls], { overlay: false }).then(function (rows) { renderSchedule(rows || [], en, cls); }).catch(function (e) { $("exSchBody").innerHTML = '<div class="ex-empty"><i class="material-icons">error_outline</i>' + esc(e.message || e) + "</div>"; });
  }
  function renderSchedule(rows, examName, className) {
    var body = $("exSchBody");
    if (!rows.length) { body.innerHTML = '<div class="ex-empty"><i class="material-icons">event_busy</i>No exams match this filter. Create exams with “New Exam”, then schedule them here.</div>'; return; }
    var showClass = !className;
    var html = '<div class="ex-toolbar" style="align-items:flex-end;">' +
      '<div class="ex-field"><label>Set ALL dates to</label><input type="date" id="exBulkDate"></div>' +
      '<button class="ex-abtn" id="exBulkDateBtn"><i class="material-icons">event</i> Apply</button>' +
      '<div class="ex-field"><label>Set ALL max to</label><input class="ex-in max" type="number" min="0" id="exBulkMax"></div>' +
      '<button class="ex-abtn" id="exBulkMaxBtn"><i class="material-icons">grade</i> Apply</button>' +
      '<span class="ex-note">' + rows.length + " row" + (rows.length > 1 ? "s" : "") + (examName ? " · " + esc(examName) : "") + (className ? " · " + esc(className) : "") + "</span></div>";
    html += '<div class="ex-tablewrap"><table class="ex-table"><thead><tr>' +
      (showClass ? '<th class="name">Class</th>' : "") + '<th class="name">Subject</th>' + (examName ? "" : "<th>Exam</th>") +
      "<th>Date</th><th>Day</th><th>Max</th><th>Status</th></tr></thead><tbody>";
    rows.forEach(function (r) {
      html += '<tr data-row="' + r.rowId + '" data-odate="' + esc(r.date || "") + '" data-omax="' + esc(r.marks || "") + '">' +
        (showClass ? '<td class="name">' + esc(r.gradeLabel || r.grade) + "</td>" : "") +
        '<td class="name">' + esc(r.subject || "-") + "</td>" + (examName ? "" : "<td>" + esc(r.examName) + "</td>") +
        '<td><input class="ex-in date sch-date" type="date" value="' + esc(r.date || "") + '"></td>' +
        '<td class="sch-day" style="font-size:12px;color:var(--text-muted);">' + esc(r.day || "") + "</td>" +
        '<td><input class="ex-in max sch-max" type="number" min="0" value="' + esc(r.marks || "") + '"></td>' +
        "<td>" + statusPill(r.status) + "</td></tr>";
    });
    html += "</tbody></table></div><div class='ex-actbar'><button class='btn btn-success' id='exSchSave' style='width:auto;padding:11px 18px;'><i class='material-icons' style='color:#fff;'>save</i> Save All</button><span class='ex-note'>Only changed rows are written. Blank date = unschedule.</span></div>";
    body.innerHTML = html;
    Array.prototype.forEach.call(body.querySelectorAll(".sch-date"), function (inp) { inp.addEventListener("change", function () { var tr = inp.closest("tr"); tr.querySelector(".sch-day").textContent = dayName(inp.value); }); });
    $("exBulkDateBtn").addEventListener("click", function () { var v = $("exBulkDate").value || ""; Array.prototype.forEach.call(body.querySelectorAll(".sch-date"), function (inp) { inp.value = v; inp.closest("tr").querySelector(".sch-day").textContent = dayName(v); }); });
    $("exBulkMaxBtn").addEventListener("click", function () { var v = $("exBulkMax").value || ""; Array.prototype.forEach.call(body.querySelectorAll(".sch-max"), function (inp) { inp.value = v; }); });
    $("exSchSave").addEventListener("click", saveSchedule);
  }
  function saveSchedule() {
    var updates = [];
    Array.prototype.forEach.call($("exSchBody").querySelectorAll("tbody tr"), function (tr) {
      var od = tr.getAttribute("data-odate") || "", om = tr.getAttribute("data-omax") || "";
      var nd = tr.querySelector(".sch-date").value || "", nm = tr.querySelector(".sch-max").value || "";
      if (nd !== od || nm !== om) updates.push({ rowId: tr.getAttribute("data-row"), date: nd, marks: nm });
    });
    if (!updates.length) { toast("No changes to save.", "err"); return; }
    var b = $("exSchSave"); b.disabled = true; b.innerHTML = '<i class="material-icons" style="color:#fff;">sync</i> Saving…';
    P.api("examBulkSaveSchedule", [updates]).then(function (res) {
      toast(res && res.success ? ("Saved " + res.saved + " row(s).") : ("Failed: " + ((res && res.error) || "unknown")), res && res.success ? "ok" : "err");
      loadSchedule(); loadKpis();
    }).catch(function (e) { toast("Error: " + (e.message || e), "err"); }).finally(function () { b.disabled = false; b.innerHTML = '<i class="material-icons" style="color:#fff;">save</i> Save All'; });
  }

  /* ---------------- new / edit exam ---------------- */
  function openCreate() {
    st.editingRow = null; st.pickLessons = [];
    $("exFormTitle").textContent = "New Exam";
    $("exFormSubmit").innerHTML = '<i class="material-icons" style="color:#fff;">save</i> Create Exam';
    $("exFormDelete").style.display = "none";
    clearForm(); loadPresets(); fillGrades(); P.openModal("exFormModal");
  }
  function openEdit(rowId) {
    st.editingRow = rowId; st.pickLessons = [];
    $("exFormTitle").textContent = "Edit Exam";
    $("exFormSubmit").innerHTML = '<i class="material-icons" style="color:#fff;">save</i> Save Changes';
    $("exFormDelete").style.display = "inline-flex";
    clearForm(); fillGrades(); P.openModal("exFormModal");
    loadPresets(function () {
      P.api("getAdminExamById", [rowId], { overlay: false }).then(function (e) {
        if (!e) { toast("Could not load exam.", "err"); P.closeModal("exFormModal"); return; }
        setGradeFuzzy(e.grade);
        gradeChanged(function () {
          setSubjectFuzzy(e.subject);
          st.pickLessons = (e.lessons || []).slice();
          $("exfSyl").value = e.lessonsRaw || ""; updatePickLabel();
        });
        // exam name
        var known = (st.presets || []).some(function (p) { return p.name === e.examName; });
        if (known) { $("exfNameSel").value = e.examName; toggleNewName(false); nameSelChanged(); } else { toggleNewName(true); $("exfNewName").value = e.examName; }
        $("exfDate").value = e.date || "";
        $("exfMarks").value = e.marks || "";
      });
    });
  }
  function clearForm() {
    ["exfNewName", "exfDate", "exfMarks", "exfSyl"].forEach(function (id) { var el = $(id); if (el) el.value = ""; });
    $("exfNameSel").value = ""; toggleNewName(false); st.pickLessons = []; updatePickLabel();
  }
  function fillGrades() {
    $("exfGrade").innerHTML = '<option value="">Select class…</option>' + GRADES.map(function (g) { return '<option value="' + g + '">' + g + "</option>"; }).join("");
    $("exfSubject").innerHTML = '<option value="">Select subject…</option>';
  }
  function loadPresets(cb) {
    if (st.presets.length) { renderPresets(); if (cb) cb(); return; }
    $("exfNameSel").innerHTML = '<option value="">Loading exam names…</option>';
    P.api("getExamNamePresets", [], { overlay: false }).then(function (list) { st.presets = list || []; renderPresets(); if (cb) cb(); }).catch(function () { st.presets = []; renderPresets(); if (cb) cb(); });
  }
  function renderPresets() {
    var list = st.presets || [];
    if (!list.length) { $("exfNameSel").innerHTML = '<option value="">— none yet, tap “New type” —</option>'; toggleNewName(true); return; }
    $("exfNameSel").innerHTML = '<option value="">Select an exam type…</option>' + list.map(function (p) { return '<option value="' + esc(p.name) + '">' + esc(p.name) + (p.defaultMarks ? " (" + esc(p.defaultMarks) + " marks)" : "") + "</option>"; }).join("");
  }
  function nameSelChanged() {
    var name = $("exfNameSel").value; if (!name) return;
    var preset = (st.presets || []).find(function (p) { return p.name === name; });
    if (preset && preset.defaultMarks && !$("exfMarks").value) $("exfMarks").value = preset.defaultMarks;
  }
  function toggleNewName(on) {
    st.newName = !!on;
    $("exfNameSel").style.display = on ? "none" : "";
    $("exfNewWrap").style.display = on ? "block" : "none";
    $("exfNewToggle").innerHTML = on ? '<i class="material-icons" style="font-size:16px;">list</i> Use existing' : '<i class="material-icons" style="font-size:16px;">add</i> New type';
  }
  function gradeChanged(after) {
    var g = $("exfGrade").value, sel = $("exfSubject");
    sel.innerHTML = '<option value="">Loading…</option>';
    if (!g) { sel.innerHTML = '<option value="">Select subject…</option>'; return; }
    P.api("getAdminSubjectsForGrade", [g], { overlay: false }).then(function (subs) {
      var list = (subs && subs.length) ? subs : ["General"];
      sel.innerHTML = '<option value="">Select subject…</option>' + list.map(function (s) { return '<option value="' + esc(s) + '">' + esc(s) + "</option>"; }).join("");
      if (after) after();
    });
  }
  function openPicker() {
    var g = $("exfGrade").value, subj = $("exfSubject").value;
    if (!g || !subj) { toast("Choose class and subject first.", "err"); return; }
    $("exPickBody").innerHTML = '<div class="ex-loading"><i class="material-icons">sync</i></div>';
    P.openModal("exPickModal");
    P.api("getSyllabusMasterLessons", [g, subj], { overlay: false }).then(function (list) {
      if (!list || !list.length) { $("exPickBody").innerHTML = '<div class="ex-empty"><i class="material-icons">inbox</i>No lessons in Syllabus Master for this class/subject.</div>'; return; }
      var sel = {}; st.pickLessons.forEach(function (x) { sel[x.toLowerCase()] = true; });
      $("exPickBody").innerHTML = list.map(function (l, i) {
        var on = sel[l.name.toLowerCase()];
        return '<label class="ex-pickitem ' + (on ? "on" : "") + '" data-name="' + esc(l.name) + '"><input type="checkbox" ' + (on ? "checked" : "") + '><span class="no">' + esc(l.lessonNo || (i + 1)) + '</span><span class="nm">' + esc(l.name) + '</span><span class="mo">' + esc(l.targetMonth || "") + "</span></label>";
      }).join("");
      Array.prototype.forEach.call($("exPickBody").querySelectorAll(".ex-pickitem input"), function (c) { c.addEventListener("change", function () { c.closest(".ex-pickitem").classList.toggle("on", c.checked); }); });
    });
  }
  function commitPicker() {
    var picked = [];
    Array.prototype.forEach.call($("exPickBody").querySelectorAll(".ex-pickitem"), function (l) { var c = l.querySelector("input"); if (c && c.checked) picked.push(l.getAttribute("data-name")); });
    if (!picked.length) { toast("Select at least one lesson.", "err"); return; }
    st.pickLessons = picked; $("exfSyl").value = picked.join("; "); updatePickLabel(); P.closeModal("exPickModal");
  }
  function updatePickLabel() { var n = st.pickLessons.length; $("exfPickLbl").textContent = n > 0 ? (n + " lesson" + (n > 1 ? "s" : "") + " picked") : "Pick lessons"; }
  function submitForm() {
    var examName = st.newName ? ($("exfNewName").value || "").trim() : ($("exfNameSel").value || "").trim();
    var freeText = String($("exfSyl").value || "").trim();
    var useLessons = st.pickLessons.length > 0 && freeText === st.pickLessons.join("; ");
    var payload = { examName: examName, grade: $("exfGrade").value, subject: $("exfSubject").value, date: $("exfDate").value, marks: $("exfMarks").value.trim(), lessons: useLessons ? st.pickLessons.slice() : [], syllabusText: useLessons ? "" : freeText };
    if (!payload.examName || !payload.grade || !payload.subject) { toast("Exam name, class and subject are required.", "err"); return; }
    var done = function (res) { if (res && res.success) { P.closeModal("exFormModal"); refreshCurrent(); loadKpis(); toast("Saved.", "ok"); } else toast("Save failed: " + ((res && res.error) || "unknown"), "err"); };
    if (st.editingRow) P.api("updateAdminExam", [st.editingRow, payload]).then(done).catch(function (e) { toast("Error: " + (e.message || e), "err"); });
    else P.api("createAdminExam", [payload]).then(done).catch(function (e) { toast("Error: " + (e.message || e), "err"); });
  }
  function deleteExam() {
    if (!st.editingRow) return;
    if (!confirm("Delete this exam permanently?")) return;
    P.api("deleteAdminExam", [st.editingRow]).then(function (res) { if (res && res.success) { P.closeModal("exFormModal"); refreshCurrent(); loadKpis(); toast("Deleted.", "ok"); } else toast("Delete failed.", "err"); }).catch(function (e) { toast("Error: " + (e.message || e), "err"); });
  }
  function refreshCurrent() { if (st.tab === "overview") loadCalendar(); else if (st.tab === "schedule") loadSchedule(); }

  /* ---------------- reports + tabulation ---------------- */
  function initReports() {
    $("exPaneReports").innerHTML =
      '<p class="view-description" style="margin-top:0;">Pick a class and assessment, load the tabulation to spot missing marks, then print the tabulation sheet or generate progress report cards.</p>' +
      '<div class="ex-toolbar">' +
        '<div class="ex-field"><label>Class</label><select id="repClass"><option value="">Loading…</option></select></div>' +
        '<div class="ex-field"><label>Assessment</label><select id="repBucket"><option value="">Loading…</option></select></div>' +
        '<button class="ex-abtn primary" id="repLoad"><i class="material-icons">table_view</i> Load Tabulation</button>' +
      '</div>' +
      '<div class="ex-actbar" style="margin-top:0;"><button class="ex-abtn" id="repPrint" disabled><i class="material-icons">print</i> Print Tabulation (PDF)</button>' +
      '<button class="btn btn-success" id="repGen" style="width:auto;padding:10px 16px;" disabled><i class="material-icons" style="color:#fff;">picture_as_pdf</i> Generate Report Cards</button></div>' +
      '<div id="repHint" class="ex-note" style="margin-top:10px;">Choose a class + assessment, then Load Tabulation.</div>' +
      '<div id="repTab" style="display:none;"><div class="ex-legend"><span><span class="sw" style="background:#fdecec;"></span>Missing marks</span></div><div class="rep-tablewrap"><table class="rep-table" id="repTable"></table></div></div>';
    P.api("progressGetClasses", [], { overlay: false }).then(function (cs) { $("repClass").innerHTML = '<option value="">Select class…</option>' + (cs || []).map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + "</option>"; }).join(""); });
    P.api("progressGetBucketList", [], { overlay: false }).then(function (bs) { $("repBucket").innerHTML = '<option value="">Select assessment…</option>' + (bs || []).map(function (b) { return '<option value="' + esc(b.bucket) + '">' + esc(b.label) + "</option>"; }).join(""); });
    $("repClass").addEventListener("change", clearReport); $("repBucket").addEventListener("change", clearReport);
    $("repLoad").addEventListener("click", loadTab);
    $("repPrint").addEventListener("click", printTab);
    $("repGen").addEventListener("click", genReports);
  }
  function clearReport() { st.reportData = null; $("repTab").style.display = "none"; $("repHint").style.display = "block"; $("repPrint").disabled = true; $("repGen").disabled = true; }
  function loadTab() {
    var cls = $("repClass").value, bk = $("repBucket").value;
    if (!cls || !bk) { toast("Choose a class and an assessment.", "err"); return; }
    $("repHint").style.display = "block"; $("repHint").textContent = "Loading tabulation…";
    P.api("progressGetClassData", [cls, bk], { overlay: false }).then(function (data) { st.reportData = data || { students: [] }; renderTab(); }).catch(function (e) { $("repHint").textContent = "Error: " + (e.message || e); });
  }
  function renderTab() {
    var d = st.reportData;
    if (!d || !d.students || !d.students.length) { $("repHint").textContent = "No students found for this class."; $("repTab").style.display = "none"; return; }
    var isSA = d.isSA, subCols = isSA ? ["Exam", "Int", "Tot"] : ["CT1", "CT2", d.bucket, "HA", "Tot"], perSub = subCols.length;
    var h1 = '<tr><th class="stick" rowspan="2" style="width:34px;"><input type="checkbox" id="repAll" class="rep-chk" checked></th><th class="stick" rowspan="2" style="left:34px;">Roll</th><th class="stick2" rowspan="2" style="left:76px;min-width:150px;">Student</th>';
    var h2 = '<tr class="sub">';
    d.subjects.forEach(function (subj) { h1 += '<th class="grp" colspan="' + perSub + '">' + esc(subj) + "</th>"; subCols.forEach(function (c, ci) { h2 += "<th" + (ci === 0 ? ' class="grp"' : "") + ">" + esc(c) + "</th>"; }); });
    (d.holParams || []).forEach(function (p, i) { if (i === 0) h1 += '<th class="grp" colspan="' + d.holParams.length + '">Holistic</th>'; h2 += "<th" + (i === 0 ? ' class="grp"' : "") + ">" + esc(p.abbr) + "</th>"; });
    h1 += '<th class="grp" rowspan="2">Total</th><th rowspan="2">%</th><th rowspan="2">Gr</th></tr>'; h2 += "</tr>";
    var body = "";
    d.students.forEach(function (s, idx) {
      var no = !s.hasAny, cells = "";
      s.subjects.forEach(function (r) {
        if (isSA) cells += cell(r.exam, r.cells.EX.has, true) + cell(r.internal, true) + cell(r.total, r.entered, false, true);
        else cells += cell(r.ct1, r.cells.CT1.has, true) + cell(r.ct2, r.cells.CT2.has) + cell(r.unit, r.cells.UT.has) + cell(r.ha, r.cells.HA.has) + cell(r.total, r.entered, false, true);
      });
      (s.holistic || []).forEach(function (hh, i) { cells += cell(hh.has ? hh.scored : "", hh.has, i === 0); });
      body += '<tr class="' + (no ? "norow" : "") + '"><td class="stick"><input type="checkbox" class="rep-chk rep-row" data-i="' + idx + '" ' + (no ? "disabled" : "checked") + '></td>' +
        '<td class="stick" style="left:34px;">' + esc(s.roll) + '</td><td class="stick2 name" style="left:76px;">' + esc(s.name) + (no ? ' <em style="font-size:10px;color:#b3261e;">(no marks)</em>' : "") + "</td>" + cells +
        '<td class="tot grp">' + s.totScored + '</td><td class="pct">' + s.percent + '%</td><td style="font-weight:800;">' + s.grade + "</td></tr>";
    });
    $("repTable").innerHTML = "<thead>" + h1 + h2 + "</thead><tbody>" + body + "</tbody>";
    $("repHint").style.display = "none"; $("repTab").style.display = "block";
    $("repAll").addEventListener("change", function () { var on = $("repAll").checked; Array.prototype.forEach.call($("repTable").querySelectorAll(".rep-row"), function (c) { if (!c.disabled) c.checked = on; }); updateRepBtns(); });
    Array.prototype.forEach.call($("repTable").querySelectorAll(".rep-row"), function (c) { c.addEventListener("change", updateRepBtns); });
    updateRepBtns();
  }
  function cell(v, has, grp, tot) { var cls = (has ? "" : "miss") + (grp ? " grp" : "") + (tot ? " tot" : ""); var show = (v === "" || v == null) ? "&ndash;" : v; return '<td class="' + cls.trim() + '">' + show + "</td>"; }
  function updateRepBtns() { var sel = 0; Array.prototype.forEach.call($("repTable").querySelectorAll(".rep-row"), function (c) { if (c.checked) sel++; }); $("repGen").disabled = sel === 0; $("repPrint").disabled = !(st.reportData && st.reportData.students.length); }
  function printTab() {
    var cls = $("repClass").value, bk = $("repBucket").value; if (!cls || !bk) return;
    var b = $("repPrint"); b.disabled = true; var old = b.innerHTML; b.innerHTML = '<i class="material-icons">sync</i> Preparing…';
    P.api("progressGenerateTabulation", [{ className: cls, bucket: bk }], { text: "Generating tabulation PDF…" }).then(function (res) {
      if (res && res.success) window.open(res.url, "_blank"); else toast((res && res.message) || "Could not prepare the tabulation.", "err");
    }).catch(function (e) { toast("Error: " + (e.message || e), "err"); }).finally(function () { b.disabled = false; b.innerHTML = old; });
  }
  function genReports() {
    var cls = $("repClass").value, bk = $("repBucket").value, ids = [];
    Array.prototype.forEach.call($("repTable").querySelectorAll(".rep-row"), function (c) { if (c.checked) ids.push(st.reportData.students[+c.getAttribute("data-i")].id); });
    if (!ids.length) { toast("Select at least one student.", "err"); return; }
    var b = $("repGen"); b.disabled = true; var old = b.innerHTML; b.innerHTML = '<i class="material-icons" style="color:#fff;">sync</i> Generating…';
    P.api("progressGenerateReports", [{ className: cls, bucket: bk, studentIds: ids }], { text: "Generating report cards… charts render, this can take a little longer." }).then(function (res) {
      if (res && res.success) window.open(res.url, "_blank"); else toast((res && res.message) || "Could not generate the report.", "err");
    }).catch(function (e) { toast("Error: " + (e.message || e), "err"); }).finally(function () { b.disabled = false; b.innerHTML = old; });
  }

  /* ---------------- modals + helpers ---------------- */
  function formModal() {
    return '<div class="modal-overlay" id="exFormModal"><div class="modal-content" style="max-width:640px;width:100%;max-height:90vh;overflow-y:auto;">' +
      '<div class="modal-header-container"><h3 id="exFormTitle">New Exam</h3><button class="modal-close-icon" data-close="exFormModal">&times;</button></div>' +
      '<div class="ex-formgrid">' +
        '<div class="full"><label>Exam name *</label><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:stretch;">' +
          '<select id="exfNameSel" style="flex:1;min-width:180px;"><option value="">Loading…</option></select>' +
          '<button type="button" class="ex-abtn" id="exfNewToggle"><i class="material-icons" style="font-size:16px;">add</i> New type</button></div>' +
          '<div id="exfNewWrap" style="display:none;margin-top:8px;"><input type="text" id="exfNewName" placeholder="Type a new exam name (e.g. Slip Test 1)"></div></div>' +
        '<div><label>Class *</label><select id="exfGrade"></select></div>' +
        '<div><label>Subject *</label><select id="exfSubject"></select></div>' +
        '<div><label>Exam date</label><input type="date" id="exfDate"></div>' +
        '<div><label>Max marks</label><input type="number" id="exfMarks" placeholder="e.g. 50"></div>' +
        '<div class="full"><label>Syllabus <span style="text-transform:none;font-weight:600;color:var(--text-muted);">(optional — pick or type)</span></label>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;"><button type="button" class="ex-abtn" id="exfPickBtn"><i class="material-icons" style="font-size:16px;">library_books</i> <span id="exfPickLbl">Pick lessons</span></button>' +
          '<button type="button" class="ex-abtn" id="exfClearSyl"><i class="material-icons" style="font-size:16px;">clear</i> Clear</button></div>' +
          '<textarea id="exfSyl" rows="3" placeholder="Type syllabus (semicolon-separated), or leave blank."></textarea></div>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;margin-top:18px;gap:12px;flex-wrap:wrap;">' +
        '<button class="btn btn-danger" id="exFormDelete" style="width:auto;padding:10px 16px;display:none;"><i class="material-icons" style="color:#fff;">delete_forever</i> Delete</button>' +
        '<div style="display:flex;gap:10px;margin-left:auto;"><button class="btn btn-secondary" data-close="exFormModal" style="width:auto;">Cancel</button>' +
        '<button class="btn btn-success" id="exFormSubmit" style="width:auto;"><i class="material-icons" style="color:#fff;">save</i> Create Exam</button></div></div></div></div>';
  }
  function assignModal() { return ""; } // assign-date is handled inline via edit
  function dayModal() {
    return '<div class="modal-overlay" id="exDayModal"><div class="modal-content" style="max-width:600px;width:100%;">' +
      '<div class="modal-header-container"><h3 id="exDayTitle">Exams</h3><button class="modal-close-icon" data-close="exDayModal">&times;</button></div>' +
      '<div id="exDayBody"></div></div></div>';
  }
  function pickModal() {
    return '<div class="modal-overlay" id="exPickModal" style="z-index:1200;"><div class="modal-content" style="max-width:560px;width:100%;">' +
      '<div class="modal-header-container"><h3>Select Syllabus Lessons</h3><button class="modal-close-icon" data-close="exPickModal">&times;</button></div>' +
      '<p class="ex-note" style="margin-bottom:12px;">Loaded from Syllabus Master for the selected class &amp; subject.</p>' +
      '<div id="exPickBody" class="ex-pick"></div>' +
      '<div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;"><button class="btn btn-secondary" data-close="exPickModal" style="width:auto;">Cancel</button>' +
      '<button class="btn btn-success" id="exPickApply" style="width:auto;"><i class="material-icons" style="color:#fff;">done</i> Apply</button></div></div></div>';
  }
  function statusPill(s) {
    if (s === "SCHEDULED") return '<span class="ex-status sched">Scheduled</span>';
    if (s === "PENDING_DATE") return '<span class="ex-status pdate">Needs date</span>';
    if (s === "PENDING_SYLLABUS") return '<span class="ex-status psyl">No syllabus</span>';
    return '<span class="ex-status draft">Draft</span>';
  }
  function dayName(v) { if (!v) return ""; var p = v.split("-"); var d = new Date(+p[0], +p[1] - 1, +p[2]); return isNaN(d.getTime()) ? "" : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()]; }
  function setGradeFuzzy(g) { var sel = $("exfGrade"), norm = function (s) { return String(s || "").toLowerCase().replace(/\s+/g, "").replace(/^grade-?/, "").replace(/^class-?/, ""); }, t = norm(g); for (var i = 0; i < sel.options.length; i++) { if (norm(sel.options[i].value) === t) { sel.value = sel.options[i].value; return; } } var o = document.createElement("option"); o.value = g; o.text = g; sel.appendChild(o); sel.value = g; }
  function setSubjectFuzzy(s) { var sel = $("exfSubject"), norm = function (x) { return String(x || "").toLowerCase().trim(); }, t = norm(s); for (var i = 0; i < sel.options.length; i++) { if (norm(sel.options[i].value) === t) { sel.value = sel.options[i].value; return; } } var o = document.createElement("option"); o.value = s; o.text = s; sel.appendChild(o); sel.value = s; }

  // wire form modal events (once)
  $("exfNewToggle").addEventListener("click", function () { toggleNewName(!st.newName); });
  $("exfNameSel").addEventListener("change", nameSelChanged);
  $("exfGrade").addEventListener("change", function () { gradeChanged(); });
  $("exfSubject").addEventListener("change", function () { if (!st.editingRow) { st.pickLessons = []; updatePickLabel(); } });
  $("exfPickBtn").addEventListener("click", openPicker);
  $("exfClearSyl").addEventListener("click", function () { st.pickLessons = []; $("exfSyl").value = ""; updatePickLabel(); });
  $("exPickApply").addEventListener("click", commitPicker);
  $("exFormSubmit").addEventListener("click", submitForm);
  $("exFormDelete").addEventListener("click", deleteExam);
})();

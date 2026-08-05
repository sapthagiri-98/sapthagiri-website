/* =========================================================================
   syllabus.js — Syllabus Tracker (teacher + management). Plain script; uses
   the global `Portal`. Self-contained (injects its own CSS).

   Backend (all already in Code.gs — nothing changed):
     Teacher
       getTeacherClassSubjects(teacher)                     -> [{className, subject}]
       getSyllabusAndPlansCatalog(grade, subject, teacher)  -> [lesson...]
       extractTasksFromDrivePDF(grade, subject, lesson, teacher) -> {session:[task...]}
       saveTaskProgress(taskKey, checked, teacher, notes)   -> string
       regenerateTeluguForTask(taskKey, grade, subject, lesson) -> {success, telugu}
       getSessionDetailedExplanation(grade, subject, lesson, session, force) -> {success, explanation}
     Management
       getManagementTimelineAuditReport()                   -> [subjectRow...]
       (optional date-wise) getSyllabusDayTeachers(campus), getTeacherDayActivity(date, teacher)

   Wording simplified for readability. Catalog is cached per class+subject and
   the management report is cached (CONFIG.MONTH_TTL window) so re-opening is
   instant — an inline line + the console perf harness show before/after.
   ========================================================================= */
(function () {
  "use strict";
  var P = window.Portal;
  var session = P.bootPage("syllabus");
  if (!session) return;

  injectCss();
  var esc = P.esc, prettyDate = P.prettyDate;
  var $ = function (id) { return document.getElementById(id); };
  var isMgmt = (session.role === "Management");
  var me = session.name;

  // -------- month helpers (academic year June -> May) --------
  var MONTH_ORDER = ["june", "july", "august", "september", "october", "november", "december", "january", "february", "march", "april", "may"];
  var MONTH_LABEL = { june: "June", july: "July", august: "August", september: "September", october: "October", november: "November", december: "December", january: "January", february: "February", march: "March", april: "April", may: "May" };
  var JS_MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  function curMonthKey() { return JS_MONTHS[new Date().getMonth()]; }
  function normMonth(v) {
    var s = String(v == null ? "" : v).trim().toLowerCase().replace(/[^a-z]/g, "");
    if (!s) return "";
    if (MONTH_LABEL[s]) return s;
    var a3 = s.substring(0, 3), map = { jan: "january", feb: "february", mar: "march", apr: "april", may: "may", jun: "june", jul: "july", aug: "august", sep: "september", oct: "october", nov: "november", dec: "december" };
    return map[a3] || "";
  }

  // -------- caches --------
  var catalogCache = {};   // "class||subject" -> catalog array
  var tasksCache = {};     // "class||subject||lesson" -> sessions object
  var mgmtReport = null;

  if (isMgmt) buildManagement(); else buildTeacher();

  /* =======================================================================
     TEACHER VIEW
     ======================================================================= */
  function buildTeacher() {
    $("view").innerHTML =
      '<div class="card wide-card">' +
        '<span class="eyebrow">Staff Portal</span>' +
        '<h2 style="margin-bottom:4px;">Syllabus Tracker</h2>' +
        '<p class="view-description" style="margin:0 0 16px;">Track your lesson progress. Tap a class to see its lessons, then mark each one as Pending, In&nbsp;progress or Done.</p>' +
        '<div class="syl-chipbar" id="sylChips"><div class="inline-loader"><i class="material-icons">sync</i>Loading your classes…</div></div>' +
        '<div class="timing-line" id="sylTiming"></div>' +
        '<div id="sylCards"><div class="syl-empty"><i class="material-icons">touch_app</i>Tap a class above to load its lessons.</div></div>' +
      '</div>' +
      sessionsModal() + explainModal();

    bindModals();
    P.api("getTeacherClassSubjects", [me], { text: "Loading your classes…" }).then(function (list) {
      renderChips(list || []);
    }).catch(function (e) { $("sylChips").innerHTML = '<div class="syl-empty"><i class="material-icons">error_outline</i>' + esc(e.message || e) + '</div>'; });
  }

  function renderChips(list) {
    var box = $("sylChips");
    if (!list.length) { box.innerHTML = '<div class="syl-empty"><i class="material-icons">inbox</i>No classes are assigned to you in the timetable.</div>'; return; }
    P.sortGrades(list, function (x) { return x.className; });
    box.innerHTML = list.map(function (a, i) {
      return '<button class="syl-chip" data-cls="' + esc(a.className) + '" data-sub="' + esc(a.subject) + '">' +
        '<i class="material-icons">class</i>' + esc(a.className) + ' · ' + esc(a.subject) + '</button>';
    }).join("");
    Array.prototype.forEach.call(box.querySelectorAll(".syl-chip"), function (b) {
      b.addEventListener("click", function () {
        Array.prototype.forEach.call(box.querySelectorAll(".syl-chip"), function (c) { c.classList.remove("active"); });
        b.classList.add("active");
        loadCatalog(b.getAttribute("data-cls"), b.getAttribute("data-sub"));
      });
    });
  }

  function loadCatalog(cls, subject) {
    var key = cls + "||" + subject, cards = $("sylCards"), t0 = performance.now();
    if (catalogCache[key]) {
      var ms = Math.round(performance.now() - t0);
      P.perf.record("Load Syllabus", ms, "warm"); showTiming("sylTiming", "Load Syllabus", ms, "warm");
      renderCards(catalogCache[key], cls, subject); return;
    }
    cards.innerHTML = skeletons(4);
    P.api("getSyllabusAndPlansCatalog", [cls, subject, me], { text: "Loading lessons…" }).then(function (catalog) {
      var ms = Math.round(performance.now() - t0);
      P.perf.record("Load Syllabus", ms, "cold"); showTiming("sylTiming", "Load Syllabus", ms, "cold");
      catalog = catalog || [];
      catalogCache[key] = catalog;
      renderCards(catalog, cls, subject);
    }).catch(function (e) { cards.innerHTML = '<div class="syl-empty"><i class="material-icons">error_outline</i>' + esc(e.message || e) + '</div>'; });
  }

  function renderCards(catalog, cls, subject) {
    var cards = $("sylCards");
    if (!catalog.length) { cards.innerHTML = '<div class="syl-empty"><i class="material-icons">inbox</i>No lessons found for this class &amp; subject.</div>'; return; }

    // bucket by target month
    var buckets = {}, unscheduled = [];
    catalog.forEach(function (item, idx) {
      var html = cardHtml(item, idx, cls, subject);
      var mk = normMonth(item.targetMonth);
      var no = parseFloat(String(item.lessonNo || "").replace(/[^\d.]/g, "")); if (isNaN(no)) no = 9999;
      if (mk) (buckets[mk] = buckets[mk] || []).push({ order: no, html: html });
      else unscheduled.push({ order: no, html: html });
    });
    function section(mk, focus) {
      var arr = buckets[mk]; if (!arr || !arr.length) return "";
      arr.sort(function (a, b) { return a.order - b.order; });
      var label = MONTH_LABEL[mk] || mk;
      var head = focus
        ? '<div class="syl-sechead focus"><i class="material-icons">flag</i> This month · ' + label + '</div>'
        : '<div class="syl-sechead"><i class="material-icons">event</i> ' + label + '</div>';
      return head + arr.map(function (x) { return x.html; }).join("");
    }
    var cur = curMonthKey(), out = "";
    if (buckets[cur]) out += section(cur, true);
    MONTH_ORDER.forEach(function (mk) { if (mk !== cur) out += section(mk, false); });
    Object.keys(buckets).forEach(function (mk) { if (mk !== cur && MONTH_ORDER.indexOf(mk) < 0) out += section(mk, false); });
    if (unscheduled.length) { unscheduled.sort(function (a, b) { return a.order - b.order; }); out += '<div class="syl-sechead"><i class="material-icons">help_outline</i> Not scheduled</div>' + unscheduled.map(function (x) { return x.html; }).join(""); }
    cards.innerHTML = '<div class="syl-grid">' + out + '</div>';

    // wire actions
    Array.prototype.forEach.call(cards.querySelectorAll("[data-sessions]"), function (b) {
      b.addEventListener("click", function () { openSessions(cls, subject, b.getAttribute("data-sessions")); });
    });
    Array.prototype.forEach.call(cards.querySelectorAll(".syl-seg button"), function (b) {
      b.addEventListener("click", function () { setManualState(b, cls, subject); });
    });
  }

  function cardHtml(item, idx, cls, subject) {
    var pct = item.totalTasks > 0 ? Math.round((item.completedTasks / item.totalTasks) * 100) : 0;
    var state = item.currentState || "FALSE";
    if (item.type === "Manual") { if (state === "IN_PROGRESS") pct = 50; else if (state === "TRUE") pct = 100; }
    var pcolor = pct === 100 ? "var(--success)" : (pct > 0 ? "var(--warning)" : "#cbd5e1");
    var stateCls = pct === 100 ? "done" : (pct > 0 ? "active" : "pending");

    var pdf = (item.driveLink && String(item.driveLink).trim()) ? '<a class="syl-pill pdf" href="' + esc(item.driveLink) + '" target="_blank" rel="noopener"><i class="material-icons">picture_as_pdf</i>PDF</a>' : "";
    var monthPill = '<span class="syl-pill month"><i class="material-icons">event</i>' + esc(item.targetMonth || "—") + '</span>';

    var actions;
    if (item.type === "AstraGen") {
      actions = '<button class="syl-view" data-sessions="' + esc(item.name) + '"><i class="material-icons">play_circle</i> View Sessions</button>';
    } else {
      actions =
        '<div class="syl-seg" data-key="' + esc(item.taskKey) + '" data-idx="' + idx + '">' +
        '<button data-state="FALSE" class="' + (state === "FALSE" ? "on-pending" : "") + '">Pending</button>' +
        '<button data-state="IN_PROGRESS" class="' + (state === "IN_PROGRESS" ? "on-active" : "") + '">In progress</button>' +
        '<button data-state="TRUE" class="' + (state === "TRUE" ? "on-done" : "") + '">Done</button>' +
        '</div>';
    }

    return '<div class="syl-card ' + stateCls + '" id="sylcard-' + idx + '">' +
      '<div class="syl-card-head"><span class="syl-no">' + esc(item.lessonNo || "-") + '</span>' +
      '<div class="syl-card-title-block"><div class="syl-card-title">' + esc(item.name || "Untitled lesson") + '</div>' +
      '<div class="syl-pillrow">' + monthPill + pdf + '</div></div></div>' +
      '<div class="syl-prog"><div class="syl-prog-track"><div class="syl-prog-fill" style="width:' + pct + '%;background:' + pcolor + ';"></div></div><span class="syl-prog-lbl" style="color:' + pcolor + ';">' + pct + '%</span></div>' +
      '<div class="syl-actions">' + actions + '</div></div>';
  }

  function setManualState(btn, cls, subject) {
    var seg = btn.parentNode, key = seg.getAttribute("data-key"), idx = seg.getAttribute("data-idx");
    var state = btn.getAttribute("data-state");
    // visual
    Array.prototype.forEach.call(seg.querySelectorAll("button"), function (b) { b.classList.remove("on-pending", "on-active", "on-done"); });
    btn.classList.add(state === "TRUE" ? "on-done" : (state === "IN_PROGRESS" ? "on-active" : "on-pending"));
    var pct = state === "TRUE" ? 100 : (state === "IN_PROGRESS" ? 50 : 0);
    var pcolor = pct === 100 ? "var(--success)" : (pct > 0 ? "var(--warning)" : "#cbd5e1");
    var card = $("sylcard-" + idx);
    if (card) {
      var fill = card.querySelector(".syl-prog-fill"), lbl = card.querySelector(".syl-prog-lbl");
      if (fill) { fill.style.width = pct + "%"; fill.style.background = pcolor; }
      if (lbl) { lbl.textContent = pct + "%"; lbl.style.color = pcolor; }
      card.classList.remove("done", "active", "pending");
      card.classList.add(pct === 100 ? "done" : (pct > 0 ? "active" : "pending"));
    }
    // keep cache in sync
    var ck = cls + "||" + subject, cat = catalogCache[ck];
    if (cat && cat[idx]) cat[idx].currentState = state;
    // silent save (no overlay)
    var checked = state === "TRUE" ? true : (state === "IN_PROGRESS" ? "IN_PROGRESS" : false);
    P.api("saveTaskProgress", [key, checked, me, "Status: " + state], { overlay: false }).catch(function (e) { console.warn("save failed", e); });
  }

  /* ---------------- sessions drilldown (AstraGen) ---------------- */
  var curLesson = null, curSessions = {};
  function openSessions(cls, subject, lessonName) {
    curLesson = { grade: cls, subject: subject, lesson: lessonName };
    $("sylSessTitle").textContent = lessonName;
    P.openModal("sylSessModal");
    var key = cls + "||" + subject + "||" + lessonName, body = $("sylSessBody");
    if (tasksCache[key]) { renderSessions(tasksCache[key]); return; }
    body.innerHTML = skeletons(3);
    P.api("extractTasksFromDrivePDF", [cls, subject, lessonName, me], { text: "Loading sessions…" }).then(function (data) {
      tasksCache[key] = data || {};
      renderSessions(tasksCache[key]);
    }).catch(function (e) { body.innerHTML = '<div class="syl-empty"><i class="material-icons">error_outline</i>' + esc(e.message || e) + '</div>'; });
  }
  function renderSessions(data) {
    curSessions = data || {};
    var names = Object.keys(curSessions).sort(function (a, b) { return (parseInt(String(a).replace(/\D/g, ""), 10) || 0) - (parseInt(String(b).replace(/\D/g, ""), 10) || 0); });
    var body = $("sylSessBody");
    if (!names.length) { body.innerHTML = '<div class="syl-empty"><i class="material-icons">inbox</i>No session tasks found for this lesson.</div>'; return; }
    var tabs = '<div class="syl-tabs">' + names.map(function (n, i) {
      var tasks = curSessions[n] || [], done = tasks.filter(function (t) { return t.checked; }).length;
      return '<button class="syl-tab ' + (i === 0 ? "active" : "") + '" data-sess="' + encodeURIComponent(n) + '">' + esc(n) + ' <em>' + done + '/' + tasks.length + '</em></button>';
    }).join("") + '</div><div id="sylSessPanel"></div>';
    body.innerHTML = tabs;
    Array.prototype.forEach.call(body.querySelectorAll(".syl-tab"), function (b) { b.addEventListener("click", function () { openTab(b.getAttribute("data-sess"), b); }); });
    openTab(encodeURIComponent(names[0]), body.querySelector(".syl-tab"));
  }
  function openTab(encName, chip) {
    var name = decodeURIComponent(encName), panel = $("sylSessPanel");
    Array.prototype.forEach.call($("sylSessBody").querySelectorAll(".syl-tab"), function (c) { c.classList.remove("active"); });
    if (chip) chip.classList.add("active");
    var tasks = curSessions[name] || [], done = tasks.filter(function (t) { return t.checked; }).length;
    var html = '<div class="syl-sessbar"><span>' + esc(name) + ' · ' + done + '/' + tasks.length + ' done</span>' +
      '<button class="btn btn-warning-action syl-explain" data-sess="' + encodeURIComponent(name) + '" style="width:auto;padding:8px 12px;font-size:12px;"><i class="material-icons" style="color:#fff;font-size:15px;">translate</i> Explain in Telugu</button></div>';
    tasks.forEach(function (t, i) {
      var idH = esc(t.taskKey);
      var tel = t.telugu ? '<div class="syl-tel">' + esc(t.telugu) + '</div>' : '<div class="syl-tel empty">Telugu not translated yet.</div>';
      var regen = (t.sheetRow > 0) ? '<button class="syl-mini" data-regen="' + esc(t.taskKey) + '" title="Regenerate Telugu"><i class="material-icons">refresh</i></button>' : "";
      html += '<div class="syl-task ' + (t.checked ? "checked" : "") + '" id="task-' + idH + '">' +
        '<div class="syl-task-top">' +
        '<input type="checkbox" class="syl-check" ' + (t.checked ? "checked" : "") + ' data-key="' + idH + '">' +
        '<span class="syl-tasknum">' + esc(t.taskNum || (i + 1)) + '</span>' +
        '<div class="syl-task-body"><div class="syl-taskcontent">' + esc(t.content) + '</div><div id="tel-' + idH + '">' + tel + '</div></div>' +
        '<div class="syl-task-actions">' + regen + '</div></div>' +
        '<div class="syl-noterow"><input type="text" class="syl-note" id="note-' + idH + '" value="' + esc(t.notes || "") + '" placeholder="Add a note…"><button class="syl-notesave" data-key="' + idH + '" title="Save note"><i class="material-icons">save</i></button></div>' +
        '</div>';
    });
    panel.innerHTML = html;
    // wire
    Array.prototype.forEach.call(panel.querySelectorAll(".syl-check"), function (c) { c.addEventListener("change", function () { saveTask(c.getAttribute("data-key")); }); });
    Array.prototype.forEach.call(panel.querySelectorAll(".syl-notesave"), function (b) { b.addEventListener("click", function () { saveTask(b.getAttribute("data-key")); }); });
    Array.prototype.forEach.call(panel.querySelectorAll("[data-regen]"), function (b) { b.addEventListener("click", function () { regenTelugu(b.getAttribute("data-regen")); }); });
    var ex = panel.querySelector(".syl-explain"); if (ex) ex.addEventListener("click", function () { explainSession(ex.getAttribute("data-sess")); });
  }
  function saveTask(key) {
    var chk = document.querySelector('.syl-check[data-key="' + cssEsc(key) + '"]');
    var note = $("note-" + key);
    var checked = chk ? chk.checked : false, notes = note ? note.value.trim() : "";
    var card = $("task-" + key); if (card) card.classList.toggle("checked", checked);
    // reflect in cache + tab counts
    Object.keys(curSessions).forEach(function (s) { (curSessions[s] || []).forEach(function (t) { if (String(t.taskKey) === String(key)) { t.checked = checked; t.notes = notes; } }); });
    P.api("saveTaskProgress", [key, checked, me, notes], { overlay: false }).catch(function (e) { console.warn("save failed", e); });
  }
  function regenTelugu(key) {
    if (!curLesson) return;
    var cell = $("tel-" + key);
    if (cell) cell.innerHTML = '<div class="syl-tel empty"><i class="material-icons" style="font-size:13px;vertical-align:middle;animation:spin 1s linear infinite;">sync</i> Regenerating…</div>';
    P.api("regenerateTeluguForTask", [key, curLesson.grade, curLesson.subject, curLesson.lesson], { overlay: false }).then(function (res) {
      if (!cell) return;
      if (res && res.success && res.telugu) cell.innerHTML = '<div class="syl-tel">' + esc(res.telugu) + '</div>';
      else cell.innerHTML = '<div class="syl-tel empty" style="color:var(--danger);">Could not regenerate.</div>';
    }).catch(function () { if (cell) cell.innerHTML = '<div class="syl-tel empty" style="color:var(--danger);">Could not regenerate.</div>'; });
  }
  function explainSession(encName) {
    var name = decodeURIComponent(encName);
    if (!curLesson) return;
    $("sylExplainTitle").textContent = curLesson.lesson + " — " + name;
    $("sylExplainBody").innerHTML = '<div class="inline-loader"><i class="material-icons">translate</i>Generating a detailed Telugu explanation… (first time can take 10–20s)</div>';
    $("sylExplainModal").dataset.sess = name;
    P.openModal("sylExplainModal");
    P.api("getSessionDetailedExplanation", [curLesson.grade, curLesson.subject, curLesson.lesson, name, false], { overlay: false }).then(function (res) {
      if (res && res.success) $("sylExplainBody").innerHTML = '<div class="syl-explainhtml">' + res.explanation + '</div>';
      else $("sylExplainBody").innerHTML = '<div class="syl-empty"><i class="material-icons">error_outline</i>' + esc((res && res.error) || "Could not generate.") + '</div>';
    }).catch(function (e) { $("sylExplainBody").innerHTML = '<div class="syl-empty"><i class="material-icons">error_outline</i>' + esc(e.message || e) + '</div>'; });
  }
  function regenExplain() {
    if (!curLesson) return;
    var name = $("sylExplainModal").dataset.sess || "";
    $("sylExplainBody").innerHTML = '<div class="inline-loader"><i class="material-icons">translate</i>Regenerating…</div>';
    P.api("getSessionDetailedExplanation", [curLesson.grade, curLesson.subject, curLesson.lesson, name, true], { overlay: false }).then(function (res) {
      if (res && res.success) $("sylExplainBody").innerHTML = '<div class="syl-explainhtml">' + res.explanation + '</div>';
      else $("sylExplainBody").innerHTML = '<div class="syl-empty"><i class="material-icons">error_outline</i>' + esc((res && res.error) || "Could not generate.") + '</div>';
    });
  }

  /* =======================================================================
     MANAGEMENT VIEW
     ======================================================================= */
  function buildManagement() {
    $("view").innerHTML =
      '<div class="card wide-card">' +
        '<span class="eyebrow">Management</span>' +
        '<h2 style="margin-bottom:4px;">Syllabus Tracker</h2>' +
        '<p class="view-description" style="margin:0 0 14px;">See how far each class &amp; subject has covered its syllabus. Tap any subject for the lesson-by-lesson breakdown.</p>' +
        '<div class="syl-viewseg" id="sylViewSeg">' +
          '<button class="active" data-view="class"><i class="material-icons">grid_view</i> By Class</button>' +
          '<button data-view="date"><i class="material-icons">event</i> By Day</button>' +
        '</div>' +
        '<div class="mod-toolbar" style="margin-top:14px;"><button class="refresh-btn" id="sylRefresh"><i class="material-icons" style="font-size:16px;">refresh</i> Refresh</button></div>' +
        '<div class="timing-line" id="sylTiming"></div>' +
        '<div id="sylClassView"></div>' +
        '<div id="sylDateView" style="display:none;"></div>' +
      '</div>' +
      drillModal() + dateDrillModal();

    bindModals();
    Array.prototype.forEach.call($("sylViewSeg").querySelectorAll("button"), function (b) { b.addEventListener("click", function () { switchView(b.getAttribute("data-view")); }); });
    $("sylRefresh").addEventListener("click", function () { if (curView === "class") loadReport(true); else initDateView(true); });
    loadReport(false);
  }

  var curView = "class";
  function switchView(v) {
    curView = v;
    Array.prototype.forEach.call($("sylViewSeg").querySelectorAll("button"), function (b) { b.classList.toggle("active", b.getAttribute("data-view") === v); });
    $("sylClassView").style.display = (v === "class") ? "block" : "none";
    $("sylDateView").style.display = (v === "date") ? "block" : "none";
    if (v === "date" && !dateInited) initDateView(false);
  }

  function loadReport(force) {
    var host = $("sylClassView"), t0 = performance.now();
    if (!force && mgmtReport) {
      var ms = Math.round(performance.now() - t0);
      P.perf.record("Load Syllabus Report", ms, "warm"); showTiming("sylTiming", "Load Syllabus Report", ms, "warm");
      renderReport(mgmtReport); return;
    }
    host.innerHTML = '<div class="inline-loader"><i class="material-icons">sync</i>Building the syllabus report… this can take a moment.</div>';
    P.api("getManagementTimelineAuditReport", [], { text: "Loading syllabus report…" }).then(function (rep) {
      var ms = Math.round(performance.now() - t0);
      P.perf.record("Load Syllabus Report", ms, "cold"); showTiming("sylTiming", "Load Syllabus Report", ms, "cold");
      mgmtReport = rep || [];
      renderReport(mgmtReport);
    }).catch(function (e) { host.innerHTML = '<div class="syl-empty"><i class="material-icons">error_outline</i>' + esc(e.message || e) + '</div>'; });
  }

  var _drillCache = {};
  function renderReport(rep) {
    var host = $("sylClassView");
    if (!rep.length) { host.innerHTML = '<div class="syl-empty"><i class="material-icons">inbox</i>No syllabus data found.</div>'; return; }
    // group by grade
    var byGrade = {};
    rep.forEach(function (r) { (byGrade[r.grade] = byGrade[r.grade] || []).push(r); });
    var grades = Object.keys(byGrade).sort(function (a, b) { return gw(a) - gw(b); });
    _drillCache = {};
    var html = "";
    grades.forEach(function (g) {
      var subs = byGrade[g].slice().sort(function (a, b) { return String(a.subject).localeCompare(String(b.subject)); });
      var done = 0, tot = 0;
      subs.forEach(function (s) { done += s.completedLessonsCount || 0; tot += s.totalLessonsCount || 0; });
      var pct = tot > 0 ? Math.round(done / tot * 100) : 0;
      html += '<div class="syl-gradehead"><span>' + esc(g) + '</span><span class="syl-gradepct">' + pct + '% covered</span></div><div class="syl-subgrid">';
      subs.forEach(function (s) {
        var d = s.completedLessonsCount || 0, a = s.inProgressLessonsCount || 0, t = s.totalLessonsCount || 0, pend = Math.max(0, t - d - a);
        var col = s.statusColor === "red" ? "red" : (s.statusColor === "yellow" ? "amber" : "green");
        var pk = "d_" + gw(g) + "_" + esc(s.subject).replace(/\W+/g, "");
        _drillCache[pk] = s;
        var counts = t > 0
          ? '<span class="syl-cpill green">' + d + ' done</span>' + (a > 0 ? '<span class="syl-cpill amber">' + a + ' active</span>' : "") + (pend > 0 ? '<span class="syl-cpill red">' + pend + ' pending</span>' : "")
          : '<span class="syl-cpill grey">No chapters mapped</span>';
        html += '<div class="syl-subcard ' + col + '" data-pk="' + pk + '">' +
          '<div class="syl-subcard-top"><span class="syl-subname">' + esc(s.subject) + '</span><i class="material-icons syl-chev">chevron_right</i></div>' +
          '<div class="syl-subteacher">' + esc(s.teacherName || "No teacher assigned") + '</div>' +
          '<div class="syl-cpillrow">' + counts + '</div></div>';
      });
      html += '</div>';
    });
    host.innerHTML = html;
    Array.prototype.forEach.call(host.querySelectorAll(".syl-subcard[data-pk]"), function (c) { c.addEventListener("click", function () { openDrill(c.getAttribute("data-pk")); }); });
  }

  function openDrill(pk) {
    var r = _drillCache[pk]; if (!r) return;
    $("sylDrillTitle").textContent = r.grade + " · " + r.subject;
    var d = r.completedLessonsCount || 0, a = r.inProgressLessonsCount || 0, t = r.totalLessonsCount || 0, pend = Math.max(0, t - d - a);
    $("sylDrillMeta").innerHTML =
      '<span class="syl-cpill green">' + d + ' done</span><span class="syl-cpill amber">' + a + ' active</span><span class="syl-cpill red">' + pend + ' pending</span><span class="syl-cpill grey">' + t + ' total</span>';
    var lessons = r.lessonsList || [];
    var body = $("sylDrillBody");
    if (!lessons.length) { body.innerHTML = '<div class="syl-empty"><i class="material-icons">inbox</i>No lessons mapped.</div>'; P.openModal("sylDrillModal"); return; }
    // group by month
    var by = {}; lessons.forEach(function (l) { var mk = normMonth(l.targetMonth); (by[mk] = by[mk] || []).push(l); });
    function sec(mk) {
      var arr = by[mk]; if (!arr || !arr.length) return "";
      arr.sort(function (x, y) { var nx = parseFloat(String(x.lessonNo || "").replace(/[^\d.]/g, "")); var ny = parseFloat(String(y.lessonNo || "").replace(/[^\d.]/g, "")); return (isNaN(nx) ? 9999 : nx) - (isNaN(ny) ? 9999 : ny); });
      return '<div class="syl-drillmonth"><i class="material-icons">event</i>' + esc(MONTH_LABEL[mk] || mk || "Not scheduled") + '</div>' + arr.map(function (l) {
        var done = l.completed === true || String(l.completed).toLowerCase() === "true";
        var active = !done && (l.inProgress === true || String(l.inProgress).toLowerCase() === "true");
        var st = done ? "done" : (active ? "active" : "pending"), lbl = done ? "Done" : (active ? "In progress" : "Pending");
        var dt = (done && l.completedOn && l.completedOn !== "-") ? '<span class="syl-dtag"><i class="material-icons">event_available</i>' + esc(l.completedOn) + '</span>' : "";
        return '<div class="syl-drillrow ' + st + '"><span class="syl-drno">' + esc(l.lessonNo || "-") + '</span>' +
          '<div class="syl-drbody"><div class="syl-drname">' + esc(l.name || "") + '</div>' + (dt ? '<div class="syl-drmeta">' + dt + '</div>' : "") + '</div>' +
          '<span class="syl-dstatus ' + st + '">' + lbl + '</span></div>';
      }).join("");
    }
    var cur = curMonthKey(), html = "";
    if (by[cur]) html += sec(cur);
    MONTH_ORDER.forEach(function (mk) { if (mk !== cur) html += sec(mk); });
    Object.keys(by).forEach(function (mk) { if (mk !== cur && MONTH_ORDER.indexOf(mk) < 0) html += sec(mk); });
    body.innerHTML = html;
    P.openModal("sylDrillModal");
  }

  /* ---------------- management: By Day (optional backend) ---------------- */
  var dateInited = false, dateCampus = "";
  function initDateView(force) {
    dateInited = true;
    var host = $("sylDateView");
    host.innerHTML =
      '<div class="mod-toolbar">' +
        '<div class="smart-selector"><div class="ss-icon"><i class="material-icons">event</i></div><div class="ss-body"><div class="ss-label">Date</div><input type="date" id="sylDate"></div></div>' +
        '<div class="syl-viewseg" id="sylCampusSeg"><button data-c="Primary"><i class="material-icons">school</i> Primary</button><button data-c="High School"><i class="material-icons">account_balance</i> High School</button></div>' +
        '<div class="smart-selector"><div class="ss-icon"><i class="material-icons">person</i></div><div class="ss-body"><div class="ss-label">Teacher</div><select id="sylTeacher" disabled><option value="">Pick a campus…</option></select></div></div>' +
      '</div>' +
      '<div id="sylDayBody"><div class="syl-empty"><i class="material-icons">event_available</i>Pick a campus and teacher to see their day.</div></div>';
    $("sylDate").value = P.todayIso();
    $("sylDate").addEventListener("change", loadDay);
    $("sylTeacher").addEventListener("change", loadDay);
    Array.prototype.forEach.call($("sylCampusSeg").querySelectorAll("button"), function (b) { b.addEventListener("click", function () { pickCampus(b.getAttribute("data-c")); }); });
  }
  function pickCampus(c) {
    dateCampus = c;
    Array.prototype.forEach.call($("sylCampusSeg").querySelectorAll("button"), function (b) { b.classList.toggle("active", b.getAttribute("data-c") === c); });
    var sel = $("sylTeacher"); sel.disabled = true; sel.innerHTML = '<option value="">Loading…</option>';
    $("sylDayBody").innerHTML = '<div class="syl-empty"><i class="material-icons">person_search</i>Select a teacher to see their day.</div>';
    P.api("getSyllabusDayTeachers", [c], { text: "Loading teachers…" }).then(function (list) {
      list = list || [];
      if (!list.length) { sel.innerHTML = '<option value="">No teachers in this campus</option>'; return; }
      sel.disabled = false;
      sel.innerHTML = '<option value="">Select teacher…</option>' + list.map(function (t) { return '<option value="' + esc(t) + '">' + esc(t) + '</option>'; }).join("");
    }).catch(function (e) {
      sel.innerHTML = '<option value="">Unavailable</option>';
      $("sylDayBody").innerHTML = '<div class="syl-empty"><i class="material-icons">info</i>The By-Day view needs the backend function <b>getSyllabusDayTeachers</b>. It is optional — the By-Class view above has everything.</div>';
    });
  }
  function loadDay() {
    var teacher = $("sylTeacher").value, date = $("sylDate").value, body = $("sylDayBody");
    if (!teacher) { body.innerHTML = '<div class="syl-empty"><i class="material-icons">person_search</i>Pick a teacher.</div>'; return; }
    if (!date) { body.innerHTML = '<div class="syl-empty"><i class="material-icons">event</i>Pick a date.</div>'; return; }
    body.innerHTML = '<div class="inline-loader"><i class="material-icons">sync</i>Loading ' + esc(teacher) + '\u2019s day…</div>';
    P.api("getTeacherDayActivity", [date, teacher], { text: "Loading day…" }).then(function (data) { renderDay(data); })
      .catch(function () { body.innerHTML = '<div class="syl-empty"><i class="material-icons">info</i>The By-Day view needs the backend function <b>getTeacherDayActivity</b>. It is optional — the By-Class view has everything.</div>'; });
  }
  function renderDay(data) {
    var body = $("sylDayBody");
    if (!data) { body.innerHTML = '<div class="syl-empty"><i class="material-icons">error_outline</i>No data.</div>'; return; }
    var periods = data.periods || [];
    var head = '<div class="syl-daybar"><span class="syl-dayname">' + esc(data.teacherName || "") + '</span><span class="syl-dayday">' + esc(data.day || "") + (data.dateStr ? (" · " + esc(data.dateStr)) : "") + '</span></div>';
    if (data.onLeave) head += '<div class="alert-warning" style="margin:6px 0 14px;"><i class="material-icons" style="color:#92400e;">event_busy</i>Teacher is on leave' + (data.leaveReason ? (" — " + esc(data.leaveReason)) : "") + '.</div>';
    if (!periods.length) { body.innerHTML = head + '<div class="syl-empty"><i class="material-icons">free_breakfast</i>No periods scheduled on ' + esc(data.day || "this day") + '.</div>'; return; }
    var html = head + '<div>';
    periods.forEach(function (p) {
      var topic = p.isActivity ? '<span style="color:var(--text-muted);font-style:italic;">Activity / non-teaching period</span>' : (p.lesson ? esc(p.lesson) : '<span style="color:var(--text-muted);">No lesson recorded</span>');
      html += '<div class="syl-drow"><span class="syl-per">' + esc(p.periodLabel || "") + '</span><span class="syl-clssub"><b>' + esc(p.className) + '</b> · ' + esc(p.subject) + '</span><span class="syl-topic">' + topic + '</span></div>';
    });
    body.innerHTML = html + '</div>';
  }

  /* =======================================================================
     shared bits
     ======================================================================= */
  function bindModals() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-close]"), function (b) { b.addEventListener("click", function () { P.closeModal(b.getAttribute("data-close")); }); });
    Array.prototype.forEach.call(document.querySelectorAll(".modal-overlay"), function (m) { m.addEventListener("click", function (e) { if (e.target === m) P.closeModal(m.id); }); });
    var rex = $("sylExplainRegen"); if (rex) rex.addEventListener("click", regenExplain);
  }
  function sessionsModal() {
    return '<div class="modal-overlay" id="sylSessModal"><div class="modal-content" style="max-width:720px;width:100%;max-height:88vh;display:flex;flex-direction:column;">' +
      '<div class="modal-header-container"><h3 id="sylSessTitle">Lesson sessions</h3><button class="modal-close-icon" data-close="sylSessModal">&times;</button></div>' +
      '<div id="sylSessBody" style="overflow-y:auto;flex-grow:1;padding-right:4px;"></div></div></div>';
  }
  function explainModal() {
    return '<div class="modal-overlay" id="sylExplainModal" style="z-index:1200;"><div class="modal-content" style="max-width:800px;width:100%;max-height:88vh;display:flex;flex-direction:column;">' +
      '<div class="modal-header-container"><h3 id="sylExplainTitle">Telugu explanation</h3><div style="display:flex;gap:8px;align-items:center;">' +
      '<button id="sylExplainRegen" class="btn btn-warning-action" style="width:auto;padding:6px 12px;font-size:12px;"><i class="material-icons" style="color:#fff;font-size:14px;">refresh</i> Regenerate</button>' +
      '<button class="modal-close-icon" data-close="sylExplainModal">&times;</button></div></div>' +
      '<div id="sylExplainBody" style="overflow-y:auto;flex-grow:1;padding-right:4px;"></div></div></div>';
  }
  function drillModal() {
    return '<div class="modal-overlay" id="sylDrillModal"><div class="modal-content" style="max-width:640px;width:100%;max-height:86vh;display:flex;flex-direction:column;">' +
      '<div class="modal-header-container"><h3 id="sylDrillTitle">Lessons</h3><button class="modal-close-icon" data-close="sylDrillModal">&times;</button></div>' +
      '<div id="sylDrillMeta" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;"></div>' +
      '<div id="sylDrillBody" style="overflow-y:auto;flex-grow:1;padding-right:4px;"></div>' +
      '<button class="btn btn-secondary" data-close="sylDrillModal" style="margin-top:14px;">Close</button></div></div>';
  }
  function dateDrillModal() { return ""; }

  function skeletons(n) { var h = '<div class="syl-grid">'; for (var i = 0; i < n; i++) h += '<div class="syl-card" style="animation:pulse 1.2s infinite;"><div class="syl-card-head"><span class="syl-no" style="color:transparent;">--</span><div class="syl-card-title-block"><div style="height:14px;width:70%;background:#e2e8f0;border-radius:6px;"></div></div></div><div style="height:6px;background:#eef2f7;border-radius:6px;margin:12px 0;"></div><div style="height:34px;background:#f1f5f9;border-radius:10px;"></div></div>'; return h + "</div>"; }
  function showTiming(id, label, ms, mode) {
    var base = P.perf.baseline[label], el = $(id); if (!el) return;
    if (mode === "warm" && base) el.innerHTML = "\u26a1 Loaded from cache in <b>" + ms + " ms</b> — first load was " + base + " ms (" + Math.round((1 - ms / base) * 100) + "% faster).";
    else el.innerHTML = "\u23f1 Loaded in " + ms + " ms." + (base ? "" : " Re-open to load instantly from cache.");
  }
  function gw(n) { var k = String(n).toUpperCase().trim(), o = { NURSERY: 1, LKG: 2, UKG: 3 }; if (o[k] !== undefined) return o[k]; var m = k.match(/\d+/); return m ? 100 + parseInt(m[0], 10) : 999; }
  function cssEsc(s) { return String(s).replace(/["\\]/g, "\\$&"); }

  /* ---------------- injected styles ---------------- */
  function injectCss() {
    if (document.getElementById("syl-css")) return;
    var css =
    ".syl-chipbar{display:flex;flex-wrap:wrap;gap:8px;background:#fff;border:1px solid var(--border);border-radius:14px;padding:12px;box-shadow:var(--shadow-sm);margin-bottom:12px}" +
    ".syl-chip{border:1px solid var(--border);background:#f8fafc;color:var(--text-main);border-radius:999px;padding:9px 14px;font-size:13px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:7px}" +
    ".syl-chip i{font-size:15px;color:var(--maroon)}.syl-chip:hover{border-color:var(--maroon);background:var(--primary-light)}" +
    ".syl-chip.active{background:var(--maroon);color:#fff}.syl-chip.active i{color:#fff}" +
    ".syl-empty{text-align:center;padding:34px 18px;color:var(--text-muted);font-weight:600;background:#fff;border:1px dashed var(--border);border-radius:14px}.syl-empty i{font-size:34px;color:var(--maroon);display:block;margin-bottom:8px}" +
    ".syl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px}" +
    ".syl-sechead{grid-column:1/-1;display:flex;align-items:center;gap:8px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--maroon);padding:12px 4px 4px;border-bottom:1px solid var(--border);margin-top:4px}.syl-sechead.focus{color:var(--accent)}.syl-sechead i{font-size:16px}" +
    ".syl-card{background:#fff;border:1px solid var(--border);border-left:4px solid #cbd5e1;border-radius:14px;padding:14px 16px;box-shadow:var(--shadow-sm);display:flex;flex-direction:column;gap:10px;min-width:0}" +
    ".syl-card.done{border-left-color:var(--success)}.syl-card.active{border-left-color:var(--warning)}.syl-card.pending{border-left-color:#cbd5e1}" +
    ".syl-card-head{display:flex;align-items:flex-start;gap:10px;min-width:0}" +
    ".syl-no{flex-shrink:0;min-width:34px;height:34px;border-radius:10px;background:var(--primary-light);color:var(--maroon);font-weight:800;font-size:14px;display:inline-flex;align-items:center;justify-content:center;padding:0 6px}" +
    ".syl-card-title-block{flex-grow:1;min-width:0}.syl-card-title{font-size:15px;font-weight:800;color:var(--text-main);line-height:1.35;word-break:break-word}" +
    ".syl-pillrow{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}" +
    ".syl-pill{display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:3px 9px;font-size:11px;font-weight:700;background:#f1f5f9;color:#475569}.syl-pill i{font-size:13px}" +
    ".syl-pill.month{background:#eef2ff;color:#4338ca}.syl-pill.pdf{background:#fff4e6;color:#b45309;text-decoration:none}" +
    ".syl-prog{display:flex;align-items:center;gap:8px}.syl-prog-track{height:6px;background:#e2e8f0;border-radius:999px;flex-grow:1;overflow:hidden}.syl-prog-fill{height:100%;border-radius:999px;transition:width .25s ease}.syl-prog-lbl{font-size:11px;font-weight:800;min-width:36px;text-align:right}" +
    ".syl-view{width:100%;display:inline-flex;align-items:center;justify-content:center;gap:8px;background:var(--maroon);color:#fff;border:none;border-radius:10px;padding:10px 12px;font-size:13px;font-weight:700;cursor:pointer}.syl-view:hover{background:var(--maroon-dark)}.syl-view i{font-size:16px;color:#fff}" +
    ".syl-seg{display:grid;grid-template-columns:repeat(3,1fr);gap:3px;background:#f1f5f9;border:1px solid var(--border);border-radius:10px;padding:3px}" +
    ".syl-seg button{border:none;border-radius:8px;padding:9px 4px;font-size:12px;font-weight:800;cursor:pointer;background:transparent;color:#64748b;transition:all .15s ease}" +
    ".syl-seg button.on-pending{background:var(--danger);color:#fff}.syl-seg button.on-active{background:var(--warning);color:#fff}.syl-seg button.on-done{background:var(--success);color:#fff}" +
    /* sessions modal */
    ".syl-tabs{display:flex;flex-wrap:wrap;gap:6px;padding:2px 2px 10px;border-bottom:1px solid var(--border);margin-bottom:12px}" +
    ".syl-tab{border:1px solid var(--border);background:#f8fafc;color:var(--text-main);border-radius:999px;padding:7px 11px;font-size:12px;font-weight:700;white-space:nowrap;cursor:pointer;display:inline-flex;align-items:center;gap:5px}" +
    ".syl-tab.active{background:var(--maroon);color:#fff;border-color:var(--maroon)}.syl-tab em{font-style:normal;background:rgba(0,0,0,.08);border-radius:999px;padding:1px 6px;font-size:10px}.syl-tab.active em{background:rgba(255,255,255,.25)}" +
    ".syl-sessbar{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;background:var(--primary-light);border:1px solid var(--border);border-radius:12px;padding:10px 12px;margin-bottom:12px;font-size:13px;font-weight:700;color:var(--maroon)}" +
    ".syl-task{border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;margin-bottom:8px;background:#fff}.syl-task.checked{opacity:.6;background:#f8fafc}" +
    ".syl-task-top{display:flex;align-items:flex-start;gap:8px}" +
    ".syl-check{width:18px;height:18px;margin-top:3px;cursor:pointer;accent-color:var(--maroon);flex-shrink:0}" +
    ".syl-tasknum{min-width:22px;height:22px;border-radius:999px;background:var(--primary-light);color:var(--maroon);font-size:11px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}" +
    ".syl-task-body{flex-grow:1;min-width:0}.syl-taskcontent{font-size:12.5px;line-height:1.5;color:var(--text-main);word-break:break-word}" +
    ".syl-tel{font-family:var(--te);font-size:12.5px;color:#0f4c81;line-height:1.6;margin-top:6px;padding:6px 8px;background:#eef5fb;border-left:2px solid #0f4c81;border-radius:4px;word-break:break-word}" +
    ".syl-tel.empty{color:#94a3b8;background:#f8fafc;border-left-color:#cbd5e1;font-style:italic;font-size:11px;font-family:var(--font)}" +
    ".syl-task-actions{display:flex;gap:4px;flex-shrink:0}.syl-mini{background:transparent;border:1px solid var(--border);color:var(--text-muted);padding:3px 5px;border-radius:6px;cursor:pointer}.syl-mini:hover{border-color:var(--maroon);color:var(--maroon)}.syl-mini i{font-size:14px}" +
    ".syl-noterow{display:flex;gap:6px;margin-top:6px;padding-left:32px}.syl-note{font-size:11.5px;padding:5px 8px;height:30px;flex-grow:1;border-radius:6px;border:1.5px solid var(--border)}.syl-notesave{width:32px;height:30px;padding:0;border-radius:6px;background:var(--success);border:none;color:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}.syl-notesave i{font-size:15px;color:#fff}" +
    ".syl-explainhtml{line-height:1.7;font-size:14px;color:var(--text-main)}.syl-explainhtml h4{color:var(--maroon);margin:12px 0 6px}.syl-explainhtml em{color:#475569}.syl-explainhtml ul{margin:6px 0 6px 18px}" +
    /* management */
    ".syl-viewseg{display:inline-flex;gap:6px;background:#f1f5f9;border:1px solid var(--border);border-radius:999px;padding:4px}" +
    ".syl-viewseg button{border:none;background:transparent;color:var(--text-muted);font-weight:700;font-size:13px;padding:8px 16px;border-radius:999px;cursor:pointer;display:inline-flex;align-items:center;gap:6px}.syl-viewseg button i{font-size:17px}.syl-viewseg button.active{background:var(--maroon);color:#fff}" +
    ".syl-gradehead{display:flex;justify-content:space-between;align-items:center;gap:10px;font-family:var(--head);font-weight:800;color:var(--maroon);font-size:16px;margin:22px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--border)}.syl-gradepct{font-size:12px;font-weight:700;color:var(--text-muted)}" +
    ".syl-subgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}" +
    ".syl-subcard{background:#fff;border:1px solid var(--border);border-left:4px solid #cbd5e1;border-radius:14px;padding:14px 16px;box-shadow:var(--shadow-sm);cursor:pointer;transition:all .18s ease}.syl-subcard:hover{box-shadow:var(--shadow-md);transform:translateY(-1px)}" +
    ".syl-subcard.green{border-left-color:var(--success)}.syl-subcard.amber{border-left-color:var(--warning)}.syl-subcard.red{border-left-color:var(--danger)}" +
    ".syl-subcard-top{display:flex;justify-content:space-between;align-items:center}.syl-subname{font-weight:800;font-size:15px;color:var(--text-main)}.syl-chev{color:var(--text-muted)}" +
    ".syl-subteacher{font-size:12px;color:var(--text-muted);margin:4px 0 8px}" +
    ".syl-cpillrow{display:flex;flex-wrap:wrap;gap:6px}.syl-cpill{font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px}.syl-cpill.green{background:var(--success-light);color:#047857}.syl-cpill.amber{background:var(--warning-light);color:#92400e}.syl-cpill.red{background:var(--danger-light);color:#b91c1c}.syl-cpill.grey{background:#eef2f7;color:#475569}" +
    ".syl-drillmonth{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.4px;color:var(--maroon);margin:12px 0 6px}.syl-drillmonth i{font-size:15px;color:var(--accent)}" +
    ".syl-drillrow{display:flex;align-items:flex-start;gap:10px;border:1px solid var(--border);border-left:4px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:6px;background:#fff}.syl-drillrow.done{border-left-color:var(--success);background:rgba(16,185,129,.04)}.syl-drillrow.active{border-left-color:var(--warning);background:rgba(245,158,11,.06)}.syl-drillrow.pending{border-left-color:var(--danger)}" +
    ".syl-drno{flex:0 0 auto;min-width:30px;height:30px;border-radius:8px;background:#f1f5f9;color:var(--text-muted);font-weight:800;font-size:12px;display:inline-flex;align-items:center;justify-content:center;padding:0 6px}" +
    ".syl-drbody{flex:1 1 auto;min-width:0}.syl-drname{font-weight:700;font-size:14px;color:var(--text-main);line-height:1.35;word-break:break-word}.syl-drmeta{margin-top:5px}" +
    ".syl-dtag{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:var(--text-muted);background:#f1f5f9;border-radius:999px;padding:2px 9px}.syl-dtag i{font-size:13px}" +
    ".syl-dstatus{font-size:11px;font-weight:800;padding:3px 9px;border-radius:999px;white-space:nowrap}.syl-dstatus.done{background:rgba(16,185,129,.15);color:#047857}.syl-dstatus.active{background:rgba(245,158,11,.18);color:#b45309}.syl-dstatus.pending{background:rgba(239,68,68,.12);color:#b91c1c}" +
    ".syl-daybar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px}.syl-dayname{font-weight:800;color:var(--maroon);font-size:16px}.syl-dayday{font-size:13px;color:var(--text-muted);font-weight:600}" +
    ".syl-drow{display:flex;align-items:center;gap:14px;border:1px solid var(--border);border-radius:12px;background:#fff;padding:12px 14px;margin-bottom:8px}.syl-per{flex:0 0 auto;min-width:40px;height:32px;padding:0 10px;border-radius:8px;background:var(--primary-light);color:var(--maroon);font-weight:800;font-size:13px;display:inline-flex;align-items:center;justify-content:center}.syl-clssub{flex:0 0 auto;min-width:140px;font-size:14px;color:var(--text-main)}.syl-clssub b{color:var(--maroon)}.syl-topic{flex:1;font-size:14px;color:var(--text-main);font-weight:600}" +
    "@keyframes pulse{0%,100%{opacity:1}50%{opacity:.55}}" +
    "@media(max-width:600px){.syl-grid{grid-template-columns:1fr}.syl-drow{flex-direction:column;align-items:flex-start;gap:6px}.syl-clssub{min-width:0}}";
    var st = document.createElement("style"); st.id = "syl-css"; st.textContent = css; document.head.appendChild(st);
  }
})();

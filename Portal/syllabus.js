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
  var mgmtTasksCache = {}; // "class||subject||lesson" -> sessions object

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
      // The API already returns lessons in sort_order order. Keep that order
      // inside each month instead of re-sorting by lesson number, otherwise
      // the management editor's Move up / Move down buttons have no effect.
      if (mk) (buckets[mk] = buckets[mk] || []).push({ order: idx, html: html });
      else unscheduled.push({ order: idx, html: html });
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
    var requestedState = btn.getAttribute("data-state");
    var ck = cls + "||" + subject, cat = catalogCache[ck];
    var previousState = (cat && cat[idx] && cat[idx].currentState) || "FALSE";
    var card = $("sylcard-" + idx);

    function paintState(state) {
      Array.prototype.forEach.call(seg.querySelectorAll("button"), function (b) {
        b.classList.remove("on-pending", "on-active", "on-done");
        if (b.getAttribute("data-state") === state) {
          b.classList.add(state === "TRUE" ? "on-done" : (state === "IN_PROGRESS" ? "on-active" : "on-pending"));
        }
      });
      var pct = state === "TRUE" ? 100 : (state === "IN_PROGRESS" ? 50 : 0);
      var pcolor = pct === 100 ? "var(--success)" : (pct > 0 ? "var(--warning)" : "#cbd5e1");
      if (card) {
        var fill = card.querySelector(".syl-prog-fill"), lbl = card.querySelector(".syl-prog-lbl");
        if (fill) { fill.style.width = pct + "%"; fill.style.background = pcolor; }
        if (lbl) { lbl.textContent = pct + "%"; lbl.style.color = pcolor; }
        card.classList.remove("done", "active", "pending");
        card.classList.add(pct === 100 ? "done" : (pct > 0 ? "active" : "pending"));
      }
      if (cat && cat[idx]) cat[idx].currentState = state;
    }

    // Show the requested state immediately, but roll it back if persistence fails.
    // Previously failures were logged only to the console, leaving a false Done state.
    paintState(requestedState);
    Array.prototype.forEach.call(seg.querySelectorAll("button"), function (b) { b.disabled = true; });
    var checked = requestedState === "TRUE" ? true : (requestedState === "IN_PROGRESS" ? "IN_PROGRESS" : false);
    P.api("saveTaskProgress", [key, checked, me, "Status: " + requestedState], { overlay: false })
      .catch(function (e) {
        paintState(previousState);
        alert("Could not save this lesson status. The previous status has been restored.\n\n" + (e && e.message ? e.message : e));
      })
      .finally(function () {
        if (seg && seg.isConnected) Array.prototype.forEach.call(seg.querySelectorAll("button"), function (b) { b.disabled = false; });
      });
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

    // Optimistic UI, followed by a real server confirmation. If the database
    // rejects the save, immediately restore the previous checkbox state.
    var previous = null;
    Object.keys(curSessions).forEach(function (s) {
      (curSessions[s] || []).forEach(function (t) {
        if (String(t.taskKey) === String(key)) {
          previous = { checked: !!t.checked, notes: t.notes || "" };
          t.checked = checked; t.notes = notes;
        }
      });
    });

    P.api("saveTaskProgress", [key, checked, me, notes], { overlay: false })
      .then(function () {
        var ck = curLesson ? (curLesson.grade + "||" + curLesson.subject + "||" + curLesson.lesson) : "";
        if (ck && tasksCache[ck]) tasksCache[ck] = curSessions;
      })
      .catch(function (e) {
        console.warn("save failed", e);
        if (previous) {
          Object.keys(curSessions).forEach(function (s) {
            (curSessions[s] || []).forEach(function (t) {
              if (String(t.taskKey) === String(key)) { t.checked = previous.checked; t.notes = previous.notes; }
            });
          });
          if (chk) chk.checked = previous.checked;
          if (note) note.value = previous.notes;
          if (card) card.classList.toggle("checked", previous.checked);
        }
        alert("Could not save this task. Please try again.");
      });
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
        '<div class="mod-toolbar syl-admin-toolbar" style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;"><button class="refresh-btn" id="sylRefresh"><i class="material-icons" style="font-size:16px;">refresh</i> Refresh</button><button class="refresh-btn syl-edit-catalog-btn" id="sylEditCatalog"><i class="material-icons" style="font-size:16px;">edit_note</i> Edit Syllabus</button></div>' +
        '<div class="timing-line" id="sylTiming"></div>' +
        '<div id="sylClassView"></div>' +
        '<div id="sylDateView" style="display:none;"></div>' +
      '</div>' +
      drillModal() + managementTaskModal() + dateDrillModal() + syllabusEditorModal();

    bindModals();
    Array.prototype.forEach.call($("sylViewSeg").querySelectorAll("button"), function (b) { b.addEventListener("click", function () { switchView(b.getAttribute("data-view")); }); });
    $("sylRefresh").addEventListener("click", function () { if (curView === "class") loadReport(true); else initDateView(true); });
    $("sylEditCatalog").addEventListener("click", openSyllabusEditor);
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
  var mgmtFilter = "attention"; // "attention" (only classes behind schedule) | "all"

  // A lesson is "behind schedule" when its target month has already passed in
  // the academic year (June→May) and it is not yet completed. In-progress
  // lessons still count as behind if their month has passed — the intent is to
  // surface work that is late versus its target month, not the raw pending total.
  function lessonOverdue(l) {
    var done = l.completed === true || String(l.completed).toLowerCase() === "true";
    if (done) return false;
    var mk = normMonth(l.targetMonth);
    if (!mk) return false;
    var ti = MONTH_ORDER.indexOf(mk), ci = MONTH_ORDER.indexOf(curMonthKey());
    return ti >= 0 && ci >= 0 && ti < ci;
  }
  function subjLagging(s) {
    var arr = s.lessonsList || [], n = 0;
    arr.forEach(function (l) { if (lessonOverdue(l)) n++; });
    return n;
  }

  function renderReport(rep) {
    var host = $("sylClassView");
    if (!rep.length) { host.innerHTML = '<div class="syl-empty"><i class="material-icons">inbox</i>No syllabus data found.</div>'; return; }

    // annotate once
    rep.forEach(function (s) {
      s._lag = subjLagging(s);
      s._taskPlan = !!s.hasTaskPlan;
      s._done = s._taskPlan ? (s.completedTasks || 0) : (s.completedLessonsCount || 0);
      s._total = s._taskPlan ? (s.totalTasks || 0) : (s.totalLessonsCount || 0);
      s._active = s._taskPlan
        ? ((s._total > 0 && s._done > 0 && s._done < s._total) ? 1 : 0)
        : (s.inProgressLessonsCount || 0);
    });

    var byGrade = {};
    rep.forEach(function (r) { (byGrade[r.grade] = byGrade[r.grade] || []).push(r); });
    var grades = Object.keys(byGrade).sort(function (a, b) { return gw(a) - gw(b); });
    _drillCache = {};

    // system-wide "behind" summary
    var totalLag = 0, subjLagCount = 0, classesAffected = 0;
    grades.forEach(function (g) {
      var gl = 0; byGrade[g].forEach(function (s) { if (s._lag > 0) { gl += s._lag; subjLagCount++; } });
      if (gl > 0) classesAffected++; totalLag += gl;
    });

    var seg = '<div class="syl-viewseg syl-filterseg" id="sylFilterSeg">' +
      '<button class="' + (mgmtFilter === "attention" ? "active" : "") + '" data-f="attention"><i class="material-icons">priority_high</i> Needs attention</button>' +
      '<button class="' + (mgmtFilter === "all" ? "active" : "") + '" data-f="all"><i class="material-icons">apps</i> All classes</button></div>';

    var summary = (totalLag > 0)
      ? '<div class="syl-summary behind"><span class="syl-sum-ic"><i class="material-icons">running_with_errors</i></span>' +
          '<span class="syl-sum-tx"><b>' + subjLagCount + ' subject' + (subjLagCount > 1 ? "s" : "") + ' behind schedule</b>' +
          '<em>' + totalLag + ' lesson' + (totalLag > 1 ? "s" : "") + ' past their target month · ' + classesAffected + ' class' + (classesAffected > 1 ? "es" : "") + ' affected</em></span></div>'
      : '<div class="syl-summary ok"><span class="syl-sum-ic"><i class="material-icons">verified</i></span>' +
          '<span class="syl-sum-tx"><b>Everything is on track</b><em>No lessons are behind their target month.</em></span></div>';

    var body = "";
    grades.forEach(function (g) {
      var subs = byGrade[g].slice().sort(function (a, b) { return String(a.subject).localeCompare(String(b.subject)); });
      var gLag = 0; subs.forEach(function (s) { gLag += s._lag; });
      var visSubs = (mgmtFilter === "attention") ? subs.filter(function (s) { return s._lag > 0; }) : subs;
      if (mgmtFilter === "attention" && !visSubs.length) return;

      var done = 0, tot = 0; subs.forEach(function (s) { done += s._done; tot += s._total; });
      var pct = tot > 0 ? Math.round(done / tot * 100) : 0;
      var badge = gLag > 0
        ? '<span class="syl-gbadge behind">' + gLag + ' behind</span>'
        : '<span class="syl-gbadge ok"><i class="material-icons">check</i>On track</span>';
      // open grades that need attention; collapse fully-on-track grades in "All"
      var open = (gLag > 0) ? " open" : "";

      body += '<details class="syl-gsec"' + open + '><summary class="syl-gsum">' +
        '<span class="syl-gname">' + esc(g) + '</span>' + badge +
        '<span class="syl-gpct">' + pct + '% covered</span><i class="material-icons syl-gchev">expand_more</i></summary>' +
        '<div class="syl-subgrid">';

      visSubs.forEach(function (s, subIdx) {
        // Use a stable per-grade/per-card key. Do not derive it from the
        // subject text because subject names can contain punctuation/spaces
        // and may not be unique within a grade.
        var pk = "d_" + gw(g) + "_" + subIdx;
        _drillCache[pk] = s;
        var col, pill;
        if (s._total === 0) { col = "grey"; pill = '<span class="syl-cpill grey">No lesson plan</span>'; }
        else if (s._lag > 0) { col = "red"; pill = '<span class="syl-cpill red"><i class="material-icons">schedule</i>' + s._lag + ' behind schedule</span>'; }
        else if (s._active > 0) { col = "amber"; pill = '<span class="syl-cpill amber">On track · in progress</span>'; }
        else { col = "green"; pill = '<span class="syl-cpill green"><i class="material-icons">check</i>On track</span>'; }
        var mini = s._total > 0 ? '<span class="syl-submini">' + s._done + '/' + s._total + ' done · ' + pct2(s._done, s._total) + '%</span>' : '';

        // Any subject that has mapped lessons must be clickable, regardless
        // of whether its lessons are AstraGen tasks or Manual lessons.
        var clickable = Array.isArray(s.lessonsList) && s.lessonsList.length > 0;

        body += '<div class="syl-subcard ' + col + (clickable ? '' : ' no-drill') + '" data-pk="' + pk + '" data-drill="' + (clickable ? '1' : '0') + '">' +
          '<div class="syl-subcard-top"><span class="syl-subname">' + esc(s.subject) + '</span>' + (clickable ? '<i class="material-icons syl-chev">chevron_right</i>' : '') + '</div>' +
          '<div class="syl-subteacher">' + esc(s.teacherName || "No teacher assigned") + '</div>' +
          '<div class="syl-cpillrow">' + pill + mini + '</div></div>';
      });
      body += '</div></details>';
    });

    if (!body) body = '<div class="syl-empty"><i class="material-icons">verified</i>No classes are behind schedule. Switch to <b>All classes</b> to see everyone.</div>';

    host.innerHTML = seg + summary + body;

    Array.prototype.forEach.call($("sylFilterSeg").querySelectorAll("button"), function (b) {
      b.addEventListener("click", function () { mgmtFilter = b.getAttribute("data-f"); renderReport(mgmtReport); });
    });
    Array.prototype.forEach.call(host.querySelectorAll('.syl-subcard[data-pk][data-drill="1"]'), function (c) { c.addEventListener("click", function () { openDrill(c.getAttribute("data-pk")); }); });
  }
  function pct2(d, t) { return t > 0 ? Math.round(d / t * 100) : 0; }

  function openDrill(pk) {
    var r = _drillCache[pk]; if (!r) return;
    $("sylDrillTitle").textContent = r.grade + " · " + r.subject;
    var d = r.completedLessonsCount || 0, a = r.inProgressLessonsCount || 0, t = r.totalLessonsCount || 0;
    var lag = subjLagging(r);
    var taskPct = r.totalTasks > 0 ? pct2(r.completedTasks || 0, r.totalTasks) : 0;
    $("sylDrillMeta").innerHTML =
      '<span class="syl-cpill green">' + d + ' lessons done</span>' +
      (a > 0 ? '<span class="syl-cpill amber">' + a + ' in progress</span>' : "") +
      (r.totalTasks > 0 ? '<span class="syl-cpill grey">' + (r.completedTasks || 0) + '/' + r.totalTasks + ' tasks · ' + taskPct + '%</span>' : '') +
      (lag > 0 ? '<span class="syl-cpill red"><i class="material-icons">schedule</i>' + lag + ' behind schedule</span>'
               : '<span class="syl-cpill green"><i class="material-icons">check</i>On track</span>') +
      '<span class="syl-cpill grey">' + t + ' lessons</span>';
    var lessons = r.lessonsList || [];
    var body = $("sylDrillBody");
    if (!lessons.length) { body.innerHTML = '<div class="syl-empty"><i class="material-icons">inbox</i>No lessons mapped.</div>'; P.openModal("sylDrillModal"); return; }
    var by = {}; lessons.forEach(function (l) { var mk = normMonth(l.targetMonth); (by[mk] = by[mk] || []).push(l); });
    function sec(mk) {
      var arr = by[mk]; if (!arr || !arr.length) return "";
      arr.sort(function (x, y) {
        var sx = (x.sortOrder == null || x.sortOrder === "") ? NaN : Number(x.sortOrder);
        var sy = (y.sortOrder == null || y.sortOrder === "") ? NaN : Number(y.sortOrder);
        if (isFinite(sx) && isFinite(sy) && sx !== sy) return sx - sy;
        if (isFinite(sx) !== isFinite(sy)) return isFinite(sx) ? -1 : 1;
        var nx = parseFloat(String(x.lessonNo || "").replace(/[^\d.]/g, ""));
        var ny = parseFloat(String(y.lessonNo || "").replace(/[^\d.]/g, ""));
        return (isNaN(nx) ? 9999 : nx) - (isNaN(ny) ? 9999 : ny);
      });
      return '<div class="syl-drillmonth"><i class="material-icons">event</i>' + esc(MONTH_LABEL[mk] || mk || "Not scheduled") + '</div>' + arr.map(function (l) {
        var done = l.completed === true || String(l.completed).toLowerCase() === "true";
        var active = !done && (l.inProgress === true || String(l.inProgress).toLowerCase() === "true");
        var overdue = lessonOverdue(l);
        var st = done ? "done" : (overdue ? "behind" : (active ? "active" : "pending"));
        var lbl = done ? "Done" : (overdue ? "Behind" : (active ? "In progress" : "Pending"));
        var dt = (done && l.completedOn && l.completedOn !== "-") ? '<span class="syl-dtag"><i class="material-icons">event_available</i>' + esc(l.completedOn) + '</span>' : "";
        var behindTag = overdue ? '<span class="syl-dtag behind"><i class="material-icons">warning</i>Past ' + esc(MONTH_LABEL[normMonth(l.targetMonth)] || l.targetMonth || "target") + '</span>' : "";
        var taskMeta = l.type === "AstraGen" ? '<span class="syl-dtag"><i class="material-icons">checklist</i>' + (l.completedTasks || 0) + '/' + (l.totalTasks || 0) + ' tasks</span>' : '';
        var meta = (dt || behindTag || taskMeta) ? '<div class="syl-drmeta">' + dt + behindTag + taskMeta + '</div>' : "";
        var action = l.type === "AstraGen" ? '<button class="syl-drill-open" data-mgmt-lesson="' + esc(l.name) + '"><i class="material-icons">visibility</i> View tasks</button>' : '';
        return '<div class="syl-drillrow ' + st + (action ? ' has-action' : '') + '"><span class="syl-drno">' + esc(l.lessonNo || "-") + '</span>' +
          '<div class="syl-drbody"><div class="syl-drname">' + esc(l.name || "") + '</div>' + meta + '</div>' + action +
          '<span class="syl-dstatus ' + st + '">' + lbl + '</span></div>';
      }).join("");
    }
    var cur = curMonthKey(), html = "";
    if (by[cur]) html += sec(cur);
    MONTH_ORDER.forEach(function (mk) { if (mk !== cur) html += sec(mk); });
    Object.keys(by).forEach(function (mk) { if (mk !== cur && MONTH_ORDER.indexOf(mk) < 0) html += sec(mk); });
    body.innerHTML = html;
    Array.prototype.forEach.call(body.querySelectorAll("[data-mgmt-lesson]"), function (b) {
      b.addEventListener("click", function (e) { e.stopPropagation(); openManagementTasks(r.grade, r.subject, b.getAttribute("data-mgmt-lesson")); });
    });
    P.openModal("sylDrillModal");
  }

  function openManagementTasks(grade, subject, lessonName) {
    var key = grade + "||" + subject + "||" + lessonName;
    $("sylMgmtTaskTitle").textContent = lessonName;
    $("sylMgmtTaskBody").innerHTML = '<div class="inline-loader"><i class="material-icons">sync</i>Loading tasks…</div>';
    P.openModal("sylMgmtTaskModal");
    if (mgmtTasksCache[key]) { renderManagementTasks(mgmtTasksCache[key]); return; }
    P.api("getManagementLessonTasks", [grade, subject, lessonName], { text: "Loading tasks…" }).then(function (data) {
      mgmtTasksCache[key] = data || {};
      renderManagementTasks(mgmtTasksCache[key]);
    }).catch(function (e) {
      $("sylMgmtTaskBody").innerHTML = '<div class="syl-empty"><i class="material-icons">error_outline</i>' + esc(e.message || e) + '</div>';
    });
  }

  function renderManagementTasks(data) {
    var body = $("sylMgmtTaskBody"), names = Object.keys(data || {}).sort(function (a, b) {
      return (parseInt(String(a).replace(/\D/g, ""), 10) || 0) - (parseInt(String(b).replace(/\D/g, ""), 10) || 0);
    });
    if (!names.length) { body.innerHTML = '<div class="syl-empty"><i class="material-icons">inbox</i>No session tasks found for this lesson.</div>'; return; }
    var tabs = '<div class="syl-tabs">' + names.map(function (n, i) {
      var tasks = data[n] || [], done = tasks.filter(function (t) { return t.checked; }).length;
      return '<button class="syl-tab ' + (i === 0 ? "active" : "") + '" data-mgtsess="' + encodeURIComponent(n) + '">' + esc(n) + ' <em>' + done + '/' + tasks.length + '</em></button>';
    }).join("") + '</div><div id="sylMgmtTaskPanel"></div>';
    body.innerHTML = tabs;
    Array.prototype.forEach.call(body.querySelectorAll(".syl-tab"), function (b) { b.addEventListener("click", function () { renderManagementTaskTab(decodeURIComponent(b.getAttribute("data-mgtsess")), b, data); }); });
    renderManagementTaskTab(names[0], body.querySelector(".syl-tab"), data);
  }

  function renderManagementTaskTab(name, chip, data) {
    var body = $("sylMgmtTaskBody"), panel = $("sylMgmtTaskPanel");
    if (!panel) return;
    Array.prototype.forEach.call(body.querySelectorAll(".syl-tab"), function (c) { c.classList.remove("active"); });
    if (chip) chip.classList.add("active");
    var tasks = data[name] || [], done = tasks.filter(function (t) { return t.checked; }).length;
    var html = '<div class="syl-sessbar"><span>' + esc(name) + ' · ' + done + '/' + tasks.length + ' done</span><span class="syl-readonly"><i class="material-icons">visibility</i> View only</span></div>';
    tasks.forEach(function (t, i) {
      var tel = t.telugu ? '<div class="syl-tel">' + esc(t.telugu) + '</div>' : '<div class="syl-tel empty">Telugu not translated yet.</div>';
      html += '<div class="syl-task ' + (t.checked ? "checked" : "") + '">' +
        '<div class="syl-task-top"><input type="checkbox" class="syl-check" disabled ' + (t.checked ? "checked" : "") + '>' +
        '<span class="syl-tasknum">' + esc(t.taskNum || (i + 1)) + '</span>' +
        '<div class="syl-task-body"><div class="syl-taskcontent">' + esc(t.content) + '</div>' + tel + '</div></div>' +
        (t.notes ? '<div class="syl-mgmt-note"><i class="material-icons">notes</i>' + esc(t.notes) + '</div>' : '') +
        '</div>';
    });
    panel.innerHTML = html;
  }

  /* ---------------- management: syllabus catalog editor ---------------- */
  var syllabusEditorData = null;
  var syllabusEditorPairs = [];
  var syllabusEditorRows = [];
  var syllabusEditorMode = "Manual";
  var syllabusEditorDrafts = [];
  var syllabusEditorDraftSeq = 0;
  // Manual syllabus edits stay in the editor until the class-level save is pressed.
  // Keys are <class-subject-pair>::<row-id>; this also preserves edits while
  // switching between classes or the Manual/AstraGen tabs.
  var syllabusEditorPendingValues = Object.create(null);
  var syllabusEditorPendingDeletes = Object.create(null);
  // Manual row order is staged per class/subject and persisted with the same
  // class-level Update action. IDs include temporary draft keys until saved.
  var syllabusEditorPendingOrder = Object.create(null);
  var syllabusEditorOrderDirty = Object.create(null);
  var syllabusEditorSaving = false;

  function openSyllabusEditor() {
    P.openModal("sylEditorModal");
    $("sylEditorList").innerHTML = '<div class="inline-loader"><i class="material-icons">sync</i>Loading syllabus rows…</div>';
    $("sylEditorStatus").textContent = "";
    $("sylEditorFormHost").innerHTML = "";
    P.api("getSyllabusEditorData", [], { text: "Loading syllabus catalog…" }).then(function (data) {
      syllabusEditorData = data || { lessons: [], classSubjects: [] };
      syllabusEditorPairs = (syllabusEditorData.classSubjects || []).slice().sort(function (a, b) {
        return gw(a.grade) - gw(b.grade) || String(a.subject).localeCompare(String(b.subject));
      });
      if (!syllabusEditorPairs.length) {
        $("sylEditorPair").innerHTML = '<option value="">No class/subject combinations found</option>';
        $("sylEditorList").innerHTML = '<div class="syl-empty"><i class="material-icons">inbox</i>No syllabus lessons or timetable subjects were found.</div>';
        return;
      }
      $("sylEditorPair").innerHTML = syllabusEditorPairs.map(function (p, i) {
        return '<option value="' + i + '">' + esc(p.grade) + ' · ' + esc(p.subject) + '</option>';
      }).join("");
      $("sylEditorPair").onchange = function () {
        var pair = currentEditorPair();
        var rows = pair ? getEditorPairRows(pair) : [];
        syllabusEditorMode = rows.some(function (l) { return l.item_type === "AstraGen"; }) &&
          !rows.some(function (l) { return l.item_type !== "AstraGen"; }) ? "AstraGen" : "Manual";
        $("sylEditorFormHost").innerHTML = "";
        renderSyllabusEditorRows();
      };
      $("sylEditorAdd").onclick = addEditorRow;
      $("sylEditorBulkSave").onclick = saveManualEditorClass;
      var initialPair = currentEditorPair();
      var initialRows = initialPair ? getEditorPairRows(initialPair) : [];
      syllabusEditorMode = initialRows.some(function (l) { return l.item_type === "AstraGen"; }) &&
        !initialRows.some(function (l) { return l.item_type !== "AstraGen"; }) ? "AstraGen" : "Manual";
      renderSyllabusEditorRows();
    }).catch(function (e) {
      $("sylEditorList").innerHTML = '<div class="syl-empty"><i class="material-icons">error_outline</i>' + esc(e.message || e) + '</div>';
    });
  }

  function editorGradeNumber(value) {
    var s = String(value == null ? "" : value).toLowerCase().replace(/\s+/g, "").replace(/^grade-?/, "").replace(/^class-?/, "");
    var n = parseFloat(s);
    return isFinite(n) ? Math.floor(n) : null;
  }
  function editorGradeEqual(a, b) {
    var na = editorGradeNumber(a), nb = editorGradeNumber(b);
    if (na !== null && nb !== null) return na === nb;
    return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
  }
  function editorNormSubject(v) { return String(v || "").toLowerCase().replace(/\s+/g, ""); }
  function editorPairSubjectForLesson(row) {
    var gn = editorGradeNumber(row && row.class), base = editorNormSubject(row && row.subject), strand = editorNormSubject(row && row.strand_subject);
    if (strand === "maths-2") return "Maths-2";
    if (gn !== null && gn >= 6 && gn <= 10 && (base === "maths" || base === "maths-1")) return "Maths-1";
    return String((row && row.strand_subject) || (row && row.subject) || "");
  }
  function editorRowMatches(row, pair) {
    if (!editorGradeEqual(row.class, pair.grade)) return false;
    var selected = editorNormSubject(pair.subject), base = editorNormSubject(row.subject), strand = editorNormSubject(row.strand_subject);
    var gn = editorGradeNumber(pair.grade);
    if (selected === "maths-2") return strand === "maths-2";
    if (gn !== null && gn >= 6 && gn <= 10 && (selected === "maths" || selected === "maths-1")) {
      return (base === "maths" || base === "maths-1") && strand !== "maths-2";
    }
    if (gn !== null && gn >= 6 && gn <= 10 && ["physics", "chemistry", "biology"].indexOf(selected) >= 0) {
      return strand ? strand === selected : base === selected;
    }
    if (strand && selected !== strand) return false;
    return base === selected;
  }
  function lessonNumberValue(value) {
    var m = String(value == null ? "" : value).trim().match(/\d+(?:\.\d+)?/);
    return m ? Number(m[0]) : NaN;
  }
  // Preserve the existing AstraGen ordering by lesson number.
  function editorLessonSort(a, b) {
    var an = lessonNumberValue(a.lesson_no), bn = lessonNumberValue(b.lesson_no);
    if (isFinite(an) && isFinite(bn) && an !== bn) return an - bn;
    if (isFinite(an) !== isFinite(bn)) return isFinite(an) ? -1 : 1;
    var as = Number(a.sort_order), bs = Number(b.sort_order);
    if (!isFinite(as)) as = 999999999;
    if (!isFinite(bs)) bs = 999999999;
    return as - bs || String(a.name || "").localeCompare(String(b.name || ""));
  }
  // Manual rows use the persisted sort_order because the teacher tracker uses
  // that exact order before grouping lessons by target month.
  function editorManualBaseSort(a, b) {
    var ad = !!(a && a._draftKey), bd = !!(b && b._draftKey);
    if (ad !== bd) return ad ? 1 : -1;
    var as = Number(a && a.sort_order), bs = Number(b && b.sort_order);
    if (!isFinite(as)) as = 999999999;
    if (!isFinite(bs)) bs = 999999999;
    if (as !== bs) return as - bs;
    var an = lessonNumberValue(a && a.lesson_no), bn = lessonNumberValue(b && b.lesson_no);
    if (isFinite(an) && isFinite(bn) && an !== bn) return an - bn;
    if (isFinite(an) !== isFinite(bn)) return isFinite(an) ? -1 : 1;
    return String(a && a.name || "").localeCompare(String(b && b.name || ""));
  }
  function editorManualRowsInDisplayOrder(pair, rows) {
    var key = editorPairKey(pair), requested = syllabusEditorPendingOrder[key];
    if (!requested || !requested.length) return rows.slice().sort(editorManualBaseSort);
    var byId = Object.create(null), out = [];
    rows.forEach(function (row) { byId[String(row._draftKey || row.id)] = row; });
    requested.forEach(function (id) {
      var row = byId[String(id)];
      if (row) { out.push(row); delete byId[String(id)]; }
    });
    rows.forEach(function (row) {
      var id = String(row._draftKey || row.id);
      if (byId[id]) { out.push(row); delete byId[id]; }
    });
    return out;
  }
  function currentEditorPair() {
    var i = $("sylEditorPair") ? Number($("sylEditorPair").value) : -1;
    return i >= 0 && syllabusEditorPairs[i] ? syllabusEditorPairs[i] : null;
  }
  function getEditorPairRows(pair) {
    return (syllabusEditorData && syllabusEditorData.lessons || []).filter(function (l) { return editorRowMatches(l, pair); }).sort(editorLessonSort);
  }
  function editorMonthOptions(value) {
    var months = ["", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March", "April", "May"];
    var current = value ? (MONTH_LABEL[normMonth(value)] || String(value)) : "";
    return months.map(function (m) {
      return '<option value="' + esc(m) + '"' + (current === m ? ' selected' : '') + '>' + esc(m || "Not scheduled") + '</option>';
    }).join("");
  }
  function editorMissingNumbers(rows) {
    var present = {};
    rows.forEach(function (l) {
      var n = lessonNumberValue(l.lesson_no);
      if (isFinite(n) && n > 0 && Math.floor(n) === n) present[n] = true;
    });
    var nums = Object.keys(present).map(Number), max = nums.length ? Math.max.apply(Math, nums) : 0;
    var missing = [];
    if (max > 1 && max <= 100) for (var i = 1; i <= max; i++) if (!present[i]) missing.push(i);
    return missing;
  }
  function editorMappingForPair(pair, rows) {
    var seed = rows && rows.length ? rows[0] : null;
    var selected = editorNormSubject(pair.subject);
    var storedSubject = seed ? seed.subject : pair.subject;
    var strand = seed ? (seed.strand_subject || "") : (selected === "maths-2" ? "Maths-2" : "");
    if (!seed && (selected === "maths-2" || selected === "maths-1")) storedSubject = "Maths";
    return {
      className: seed ? seed.class : defaultEditorClass(pair),
      subject: storedSubject,
      strand: strand
    };
  }
  function defaultEditorClass(pair) {
    var n = editorGradeNumber(pair.grade);
    return n !== null ? "Grade " + n : String(pair.grade || "");
  }
  function renderSyllabusEditorRows() {
    var pair = currentEditorPair();
    if (!pair || !syllabusEditorData) return;
    var all = getEditorPairRows(pair);
    var manual = all.filter(function (l) { return l.item_type !== "AstraGen"; });
    var astragen = all.filter(function (l) { return l.item_type === "AstraGen"; });
    $("sylEditorModes").innerHTML =
      '<button type="button" class="syl-editor-mode ' + (syllabusEditorMode === "Manual" ? "active" : "") + '" data-editor-mode="Manual">Manual syllabus <span>' + manual.length + '</span></button>' +
      '<button type="button" class="syl-editor-mode ' + (syllabusEditorMode === "AstraGen" ? "active" : "") + '" data-editor-mode="AstraGen">AstraGen lesson plans <span>' + astragen.length + '</span></button>';
    Array.prototype.forEach.call($("sylEditorModes").querySelectorAll("[data-editor-mode]"), function (b) {
      b.onclick = function () { syllabusEditorMode = b.getAttribute("data-editor-mode"); $("sylEditorFormHost").innerHTML = ""; renderSyllabusEditorRows(); };
    });
    var rows = syllabusEditorMode === "AstraGen" ? astragen : manual.filter(function (l) {
      return editorPairPendingDeletes(pair).indexOf(String(l.id)) < 0;
    });
    if (syllabusEditorMode === "Manual") rows = rows.concat(syllabusEditorDrafts.filter(function (d) { return d._pairKey === editorPairKey(pair); }));
    syllabusEditorRows = syllabusEditorMode === "Manual" ? editorManualRowsInDisplayOrder(pair, rows) : rows.slice().sort(editorLessonSort);
    $("sylEditorCount").textContent = rows.length + (rows.length === 1 ? " row" : " rows");
    $("sylEditorAdd").innerHTML = '<i class="material-icons">add</i> ' + (syllabusEditorMode === "AstraGen" ? "Add AstraGen plan" : "Add lesson row");
    $("sylEditorAdd").style.display = "";
    $("sylEditorBulkSave").style.display = syllabusEditorMode === "Manual" ? "" : "none";
    if (syllabusEditorMode === "Manual") renderManualEditorTable(pair, manual);
    else renderAstraGenEditorTable(astragen);
  }
  function editorPairKey(pair) { var n = editorGradeNumber(pair.grade); return (n === null ? String(pair.grade || "").trim().toLowerCase() : String(n)) + "|" + editorNormSubject(pair.subject); }
  function editorPendingKey(pair, id) { return editorPairKey(pair) + "::" + String(id); }
  function editorManualValue(pair, row, field) {
    var id = row._draftKey || row.id;
    var pending = syllabusEditorPendingValues[editorPendingKey(pair, id)];
    return pending && Object.prototype.hasOwnProperty.call(pending, field) ? pending[field] : (row[field] == null ? "" : row[field]);
  }
  function editorPairPendingDeletes(pair) {
    var key = editorPairKey(pair);
    if (!syllabusEditorPendingDeletes[key]) syllabusEditorPendingDeletes[key] = [];
    return syllabusEditorPendingDeletes[key];
  }
  function editorSetSaving(disabled) {
    syllabusEditorSaving = !!disabled;
    var modal = $("sylEditorModal");
    if (!modal) return;
    Array.prototype.forEach.call(modal.querySelectorAll(".syl-cell-input, #sylEditorPair, #sylEditorAdd, #sylEditorBulkSave, .syl-editor-mode, .syl-row-remove, .syl-ed-drag-handle"), function (el) {
      el.disabled = !!disabled;
    });
    var save = $("sylEditorBulkSave");
    if (save) save.innerHTML = disabled ? '<i class="material-icons">sync</i> Updating class…' : '<i class="material-icons">save</i> Update class syllabus';
  }
  function renderManualEditorTable(pair, savedRows) {
    var drafts = syllabusEditorDrafts.filter(function (d) { return d._pairKey === editorPairKey(pair); });
    var stagedDeleteIds = editorPairPendingDeletes(pair);
    var visibleSavedRows = savedRows.filter(function (l) { return stagedDeleteIds.indexOf(String(l.id)) < 0; });
    var rows = editorManualRowsInDisplayOrder(pair, visibleSavedRows.concat(drafts));
    var missing = editorMissingNumbers(visibleSavedRows);
    var dragHint = '<div class="syl-editor-note">Drag a lesson using the grip at the start of its row to change its order within the target-month section of the syllabus tracker. Change <b>Target Month</b> to move it to another month. Click <b>Update class syllabus</b> to save.</div>';
    var alertHtml = missing.length
      ? '<div class="syl-editor-gap"><i class="material-icons">info</i><span>Lesson numbers not present between 1 and ' + Math.max.apply(Math, visibleSavedRows.map(function (l) { return lessonNumberValue(l.lesson_no); }).filter(isFinite)) + ': <b>' + esc(missing.join(", ")) + '</b>. Add a row for any missing chapter you need.</span></div>'
      : '';
    var pendingDeleteCount = editorPairPendingDeletes(pair).length;
    var deleteNote = pendingDeleteCount ? '<div class="syl-editor-gap"><i class="material-icons">delete_outline</i><span>' + pendingDeleteCount + ' lesson ' + (pendingDeleteCount === 1 ? 'row is' : 'rows are') + ' marked for removal. The removal will be applied with the class update.</span></div>' : '';
    if (!rows.length) {
      $("sylEditorList").innerHTML = alertHtml + deleteNote + '<div class="syl-empty"><i class="material-icons">menu_book</i>No manual lessons are listed for ' + esc(pair.grade) + ' · ' + esc(pair.subject) + '. Use <b>Add lesson row</b> to create the first chapter.</div>';
      return;
    }
    var html = dragHint + alertHtml + deleteNote + '<div class="syl-editor-table-wrap"><table class="syl-editor-table syl-manual-table"><thead><tr><th class="syl-col-drag" title="Drag to reorder">Move</th><th class="syl-col-no">Lesson No.</th><th>Lesson name</th><th class="syl-col-month">Target month</th><th class="syl-col-link">PDF / resource link (optional)</th><th class="syl-col-actions">Actions</th></tr></thead><tbody>';
    rows.forEach(function (l) {
      var isDraft = !!l._draftKey;
      var id = isDraft ? l._draftKey : String(l.id);
      html += '<tr data-editor-row="' + esc(id) + '" data-editor-draft="' + (isDraft ? "1" : "0") + '" data-class="' + esc(l.class || "") + '" data-subject="' + esc(l.subject || "") + '" data-strand="' + esc(l.strand_subject || "") + '">' +
        '<td class="syl-col-drag"><button type="button" class="syl-ed-drag-handle" draggable="true" aria-label="Drag to reorder lesson" title="Drag to reorder"><i class="material-icons">drag_indicator</i></button></td>' +
        '<td><input class="syl-cell-input syl-cell-number" data-field="lesson_no" value="' + esc(editorManualValue(pair, l, "lesson_no")) + '" placeholder="1" inputmode="numeric"></td>' +
        '<td><input class="syl-cell-input syl-cell-title" data-field="name" value="' + esc(editorManualValue(pair, l, "name")) + '" placeholder="Enter chapter name"></td>' +
        '<td><select class="syl-cell-input" data-field="target_month">' + editorMonthOptions(editorManualValue(pair, l, "target_month")) + '</select></td>' +
        '<td><input class="syl-cell-input" data-field="drive_link" type="url" value="' + esc(editorManualValue(pair, l, "drive_link")) + '" placeholder="https://…"></td>' +
        '<td><div class="syl-row-actions">' + (isDraft ? '<span class="syl-ed-tag manual">New</span>' : '') + '<button type="button" class="btn btn-secondary syl-row-remove" data-editor-delete="' + esc(id) + '"><i class="material-icons">delete_outline</i> Remove</button></div></td></tr>';
    });
    html += '</tbody></table></div>';
    $("sylEditorList").innerHTML = html;
    Array.prototype.forEach.call($("sylEditorList").querySelectorAll("[data-field]"), function (el) {
      function rememberValue() {
        var tr = el.closest("[data-editor-row]");
        if (!tr) return;
        var key = editorPendingKey(pair, tr.getAttribute("data-editor-row"));
        if (!syllabusEditorPendingValues[key]) syllabusEditorPendingValues[key] = {};
        syllabusEditorPendingValues[key][el.getAttribute("data-field")] = el.value;
      }
      el.addEventListener("input", rememberValue);
      el.addEventListener("change", rememberValue);
    });
    Array.prototype.forEach.call($("sylEditorList").querySelectorAll("[data-editor-delete]"), function (b) {
      b.onclick = function () { removeEditorRow(b.getAttribute("data-editor-delete")); };
    });
    bindManualEditorDrag(pair);
  }
  function bindManualEditorDrag(pair) {
    var list = $("sylEditorList"), tbody = list && list.querySelector(".syl-manual-table tbody");
    if (!tbody) return;
    var draggedRow = null;
    tbody.addEventListener("dragstart", function (event) {
      var handle = event.target && event.target.closest ? event.target.closest(".syl-ed-drag-handle") : null;
      var row = event.target && event.target.closest ? event.target.closest("tr[data-editor-row]") : null;
      if (!handle || !row || syllabusEditorSaving) { event.preventDefault(); return; }
      draggedRow = row;
      row.classList.add("syl-row-dragging");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", row.getAttribute("data-editor-row") || "");
      }
    });
    tbody.addEventListener("dragover", function (event) {
      if (!draggedRow) return;
      var target = event.target && event.target.closest ? event.target.closest("tr[data-editor-row]") : null;
      if (!target || target === draggedRow || target.parentNode !== tbody) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      var rect = target.getBoundingClientRect();
      var after = event.clientY > rect.top + rect.height / 2;
      var reference = after ? target.nextSibling : target;
      if (reference !== draggedRow) tbody.insertBefore(draggedRow, reference);
    });
    tbody.addEventListener("drop", function (event) {
      if (!draggedRow) return;
      event.preventDefault();
      var order = Array.prototype.map.call(tbody.querySelectorAll("tr[data-editor-row]"), function (row) {
        return row.getAttribute("data-editor-row");
      });
      var key = editorPairKey(pair);
      syllabusEditorPendingOrder[key] = order;
      syllabusEditorOrderDirty[key] = true;
      editorStatus("Lesson order changed. Click Update class syllabus to save the new order.", false);
    });
    tbody.addEventListener("dragend", function () {
      if (draggedRow) draggedRow.classList.remove("syl-row-dragging");
      draggedRow = null;
    });
  }
  function renderAstraGenEditorTable(rows) {
    if (!rows.length) {
      $("sylEditorList").innerHTML = '<div class="syl-editor-note">AstraGen remains linked to its PDF lesson plan. Add the plan here, then continue using the existing Gemini PDF extraction workflow to create its sessions and tasks.</div>' +
        '<div class="syl-empty"><i class="material-icons">picture_as_pdf</i>No AstraGen lesson plans are mapped to this class and subject yet.</div>';
      return;
    }
    var html = '<div class="syl-editor-note">AstraGen lesson plans keep their existing PDF-to-Gemini session workflow. This table manages the lesson mapping only; stored session tasks and completion records are preserved.</div>' +
      '<div class="syl-editor-table-wrap"><table class="syl-editor-table"><thead><tr><th>Lesson No.</th><th>Lesson plan title</th><th>Target month</th><th>PDF / Drive</th><th>Actions</th></tr></thead><tbody>';
    var rowHtml = rows.slice().sort(editorLessonSort).map(function (l) {
      var url = String(l.drive_link || "").trim();
      var link = url ? '<a class="syl-ed-link" href="' + esc(url) + '" target="_blank" rel="noopener">Open PDF</a>' : '<span class="syl-ed-muted">No link</span>';
      return '<tr><td><span class="syl-ed-number">' + esc(l.lesson_no || "—") + '</span></td>' +
        '<td><div class="syl-ed-title">' + esc(l.name || "Untitled lesson plan") + '</div><div class="syl-ed-meta">' + esc(l.class) + ' · ' + esc(l.subject) + (l.strand_subject ? ' · ' + esc(l.strand_subject) : '') + '</div></td>' +
        '<td>' + esc(l.target_month || "Not scheduled") + '</td><td>' + link + '</td>' +
        '<td><div class="syl-ed-actions"><button type="button" class="btn btn-secondary syl-ed-action" data-editor-edit="' + esc(l.id) + '"><i class="material-icons">edit</i> Edit</button><button type="button" class="btn btn-secondary syl-ed-action danger" data-editor-delete="' + esc(l.id) + '"><i class="material-icons">delete_outline</i> Remove</button></div></td></tr>';
    }).join("");
    html += rowHtml + '</tbody></table></div>';
    $("sylEditorList").innerHTML = html;
    Array.prototype.forEach.call($("sylEditorList").querySelectorAll("[data-editor-edit]"), function (b) {
      b.onclick = function () { var row = findEditorLesson(b.getAttribute("data-editor-edit")); if (row) showSyllabusLessonForm(row, "AstraGen"); };
    });
    Array.prototype.forEach.call($("sylEditorList").querySelectorAll("[data-editor-delete]"), function (b) {
      b.onclick = function () { removeEditorRow(b.getAttribute("data-editor-delete")); };
    });
  }
  function addEditorRow() {
    var pair = currentEditorPair();
    if (!pair || syllabusEditorSaving) return;
    if (syllabusEditorMode === "AstraGen") {
      showSyllabusLessonForm(null, "AstraGen");
      return;
    }
    var mapping = editorMappingForPair(pair, getEditorPairRows(pair));
    var draftKey = "draft-" + (++syllabusEditorDraftSeq);
    syllabusEditorDrafts.push({
      _draftKey: draftKey, _pairKey: editorPairKey(pair), class: mapping.className,
      subject: mapping.subject, strand_subject: mapping.strand, item_type: "Manual",
      lesson_no: "", name: "", target_month: "", drive_link: "", sort_order: 0
    });
    renderSyllabusEditorRows();
    var first = $("sylEditorList").querySelector('[data-editor-row="' + cssEsc(draftKey) + '"] [data-field="lesson_no"]');
    if (first) first.focus();
  }
  function findEditorLesson(id) {
    var rows = syllabusEditorData && syllabusEditorData.lessons || [];
    for (var i = 0; i < rows.length; i++) if (String(rows[i].id) === String(id)) return rows[i];
    return null;
  }
  function saveManualEditorClass() {
    var pair = currentEditorPair();
    if (!pair || syllabusEditorMode !== "Manual" || syllabusEditorSaving) return;
    var pairKey = editorPairKey(pair), changes = [], seenNumbers = Object.create(null), invalidDuplicate = false, validationError = "";
    var tableRows = Array.prototype.slice.call($("sylEditorList").querySelectorAll("tr[data-editor-row]"));
    tableRows.forEach(function (tr) {
      var id = tr.getAttribute("data-editor-row"), isDraft = tr.getAttribute("data-editor-draft") === "1";
      function field(name) { var el = tr.querySelector('[data-field="' + name + '"]'); return el ? String(el.value || "").trim() : ""; }
      var lessonNo = field("lesson_no"), name = field("name"), month = field("target_month"), url = field("drive_link");
      var baseline = isDraft ? null : findEditorLesson(id);
      var changed = isDraft || !baseline ||
        lessonNo !== String(baseline.lesson_no == null ? "" : baseline.lesson_no).trim() ||
        name !== String(baseline.name == null ? "" : baseline.name).trim() ||
        month !== String(baseline.target_month == null ? "" : baseline.target_month).trim() ||
        url !== String(baseline.drive_link == null ? "" : baseline.drive_link).trim();
      var parsedLessonNo = lessonNumberValue(lessonNo);
      var numberKey = isFinite(parsedLessonNo) ? String(parsedLessonNo) : lessonNo.toLocaleLowerCase();
      if (numberKey) {
        if (seenNumbers[numberKey]) {
          if (changed || seenNumbers[numberKey].changed) invalidDuplicate = true;
        } else seenNumbers[numberKey] = { changed: changed, id: id };
      }
      if (!changed) return;
      if (!lessonNo || !name) { validationError = "Enter both the lesson number and lesson name for every changed or new row."; return; }
      if (url && !/^https?:\/\//i.test(url)) { validationError = "A resource link must start with http:// or https://."; return; }
      var no = lessonNumberValue(lessonNo);
      changes.push({ tr: tr, oldId: id, isDraft: isDraft, payload: {
        id: isDraft ? null : id,
        class: tr.getAttribute("data-class"), subject: tr.getAttribute("data-subject"),
        strand_subject: tr.getAttribute("data-strand") || "", item_type: "Manual",
        lesson_no: lessonNo, name: name, target_month: month, drive_link: url,
        sort_order: isFinite(no) ? Math.round(no * 10) : 0
      }});
    });
    if (validationError) return editorStatus(validationError, true);
    if (invalidDuplicate) return editorStatus("Two lessons have the same lesson number. Give each chapter a unique number before updating.", true);
    var deletions = editorPairPendingDeletes(pair).slice();
    var orderChanged = !!syllabusEditorOrderDirty[pairKey];
    if (!changes.length && !deletions.length && !orderChanged) return editorStatus("There are no unsaved changes for this class and subject.", false);
    // Any catalog mutation also persists the currently displayed row order.
    // Keep this dirty until reorder succeeds so a failed request can be retried.
    if (changes.length || deletions.length) syllabusEditorOrderDirty[pairKey] = true;

    editorSetSaving(true);
    var saved = 0, removed = 0;
    function saveNext(index) {
      if (index >= changes.length) return Promise.resolve();
      var change = changes[index];
      return P.api("saveSyllabusLesson", [change.payload], { overlay: false }).then(function (res) {
        if (!res || !res.success) throw new Error((res && res.error) || "Could not save lesson " + change.payload.lesson_no + ".");
        var lesson = res.lesson;
        if (!lesson || !lesson.id) throw new Error("The server saved a row but did not return its lesson ID. Refresh the editor before retrying.");
        // Promote a new draft to a real database row immediately. If a later row
        // fails, retrying the class save updates this ID instead of inserting a duplicate.
        var oldPendingKey = editorPendingKey(pair, change.oldId);
        delete syllabusEditorPendingValues[oldPendingKey];
        if (change.isDraft) {
          change.tr.setAttribute("data-editor-row", String(lesson.id));
          change.tr.setAttribute("data-editor-draft", "0");
          var newBadge = change.tr.querySelector(".syl-ed-tag.manual");
          if (newBadge) newBadge.parentNode.removeChild(newBadge);
          var removeButton = change.tr.querySelector("[data-editor-delete]");
          if (removeButton) removeButton.setAttribute("data-editor-delete", String(lesson.id));
          syllabusEditorDrafts = syllabusEditorDrafts.filter(function (d) { return d._draftKey !== change.oldId; });
        }
        var catalog = syllabusEditorData.lessons || (syllabusEditorData.lessons = []), replaced = false;
        for (var i = 0; i < catalog.length; i++) {
          if (String(catalog[i].id) === String(lesson.id)) { catalog[i] = lesson; replaced = true; break; }
        }
        if (!replaced) catalog.push(lesson);
        saved++;
        editorStatus("Saving class syllabus… " + saved + " of " + changes.length + " changed rows saved.", false);
        return saveNext(index + 1);
      });
    }
    function deleteNext(index) {
      if (index >= deletions.length) return Promise.resolve();
      var id = deletions[index];
      return P.api("deleteSyllabusLesson", [id], { overlay: false }).then(function (res) {
        if (!res || !res.success) throw new Error((res && res.error) || "Could not remove lesson ID " + id + ".");
        removed++;
        var pending = editorPairPendingDeletes(pair);
        syllabusEditorPendingDeletes[pairKey] = pending.filter(function (v) { return String(v) !== String(id); });
        syllabusEditorData.lessons = (syllabusEditorData.lessons || []).filter(function (l) { return String(l.id) !== String(id); });
        return deleteNext(index + 1);
      });
    }
    function persistCurrentRowOrder() {
      var table = $("sylEditorList");
      var ids = table ? Array.prototype.map.call(table.querySelectorAll("tbody tr[data-editor-row]"), function (tr) {
        return Number(tr.getAttribute("data-editor-row"));
      }).filter(function (id) { return Number.isInteger(id) && id > 0; }) : [];
      if (!ids.length) return Promise.resolve({ success: true, count: 0 });
      return P.api("reorderSyllabusLessons", [ids], { overlay: false }).then(function (res) {
        if (!res || !res.success) throw new Error((res && res.error) || "The lesson rows were saved, but their display order could not be updated.");
        ids.forEach(function (id, index) {
          var lesson = findEditorLesson(id);
          if (lesson) lesson.sort_order = (index + 1) * 10;
        });
        return res;
      });
    }
    saveNext(0).then(deleteNext.bind(null, 0)).then(persistCurrentRowOrder).then(function () {
      syllabusEditorPendingDeletes[pairKey] = [];
      delete syllabusEditorPendingOrder[pairKey];
      syllabusEditorOrderDirty[pairKey] = false;
      Object.keys(syllabusEditorPendingValues).forEach(function (key) {
        if (key.indexOf(pairKey + "::") === 0) delete syllabusEditorPendingValues[key];
      });
      editorSetSaving(false);
      editorStatus("Class syllabus updated successfully. " + saved + " row change" + (saved === 1 ? "" : "s") + " saved, " + removed + " row" + (removed === 1 ? "" : "s") + " removed and lesson order updated.", false);
      reloadEditorData(true);
    }).catch(function (e) {
      editorSetSaving(false);
      editorStatus((saved || removed ? "Partial update: " + saved + " row changes saved and " + removed + " rows removed. " : "") + (e && e.message ? e.message : e) + " Your remaining edits are still in the table. Click Update class syllabus to retry.", true);
    });
  }
  function showSyllabusLessonForm(row, forcedType) {
    var pair = currentEditorPair();
    if (!pair) return;
    var editing = !!row;
    var pairRows = getEditorPairRows(pair);
    var mapping = editorMappingForPair(pair, pairRows);
    var defaultClass = row ? row.class : mapping.className;
    var defaultSubject = row ? row.subject : mapping.subject;
    var defaultStrand = row ? row.strand_subject : mapping.strand;
    var type = row ? (row.item_type === "AstraGen" ? "AstraGen" : "Manual") : (forcedType || "AstraGen");
    var nextNo = String(pairRows.filter(function (l) { return (l.item_type === "AstraGen" ? "AstraGen" : "Manual") === type; }).length + 1);
    var html = '<div class="syl-editor-form"><div class="syl-editor-formhead"><div><b>' + (editing ? "Edit AstraGen lesson plan" : "Add AstraGen lesson plan") + '</b><p>Keep the exact lesson title and class/subject mapping used by its session tasks.</p></div><button type="button" class="modal-close-icon" id="sylEditorFormClose">&times;</button></div>' +
      '<input id="sylEditId" type="hidden" value="' + esc(editing ? row.id : "") + '">' +
      '<div class="syl-editor-fields"><label>Class <input id="sylEditClass" value="' + esc(defaultClass) + '" required></label>' +
      '<label>Stored subject <input id="sylEditSubject" value="' + esc(defaultSubject) + '" required></label>' +
      '<label>Strand / mapped subject <input id="sylEditStrand" value="' + esc(defaultStrand || "") + '" placeholder="Optional, e.g. Maths-2"></label>' +
      '<label>Lesson number <input id="sylEditLessonNo" value="' + esc(row ? row.lesson_no : nextNo) + '" required placeholder="e.g. 1"></label>' +
      '<label class="syl-ed-wide">Lesson plan title <input id="sylEditName" value="' + esc(row ? row.name : "") + '" required placeholder="Enter the PDF lesson-plan title"></label>' +
      '<label>Target month <select id="sylEditMonth">' + editorMonthOptions(row ? row.target_month : "") + '</select></label>' +
      '<label class="syl-ed-wide">PDF / Drive link <input id="sylEditDrive" type="url" value="' + esc(row ? row.drive_link || "" : "") + '" placeholder="https://…"></label></div>' +
      '<div class="syl-ed-formnote">AstraGen PDF analysis and Gemini session extraction continue through the existing workflow. This editor changes the catalog mapping only; saved session tasks and explanations are retained.</div>' +
      '<div class="syl-editor-formactions"><button type="button" class="btn btn-secondary" id="sylEditorCancel">Cancel</button><button type="button" class="btn btn-primary" id="sylEditorSave"><i class="material-icons">save</i>' + (editing ? " Save changes" : " Add plan") + '</button></div></div>';
    $("sylEditorFormHost").innerHTML = html;
    $("sylEditorFormClose").onclick = function () { $("sylEditorFormHost").innerHTML = ""; };
    $("sylEditorCancel").onclick = function () { $("sylEditorFormHost").innerHTML = ""; };
    $("sylEditorSave").onclick = function () {
      var className = $("sylEditClass").value.trim(), subject = $("sylEditSubject").value.trim();
      var name = $("sylEditName").value.trim(), lessonNo = $("sylEditLessonNo").value.trim();
      var url = $("sylEditDrive").value.trim(), no = lessonNumberValue(lessonNo);
      if (!className || !subject || !name || !lessonNo) return editorStatus("Class, subject, lesson number and title are required.", true);
      if (url && !/^https?:\/\//i.test(url)) return editorStatus("The PDF / Drive link must start with http:// or https://.", true);
      var payload = {
        id: $("sylEditId").value || null, class: className, subject: subject,
        strand_subject: $("sylEditStrand").value.trim(), lesson_no: lessonNo,
        name: name, target_month: $("sylEditMonth").value,
        sort_order: isFinite(no) ? Math.round(no * 10) : 0,
        item_type: "AstraGen", drive_link: url
      };
      var saveBtn = $("sylEditorSave"); saveBtn.disabled = true; saveBtn.innerHTML = '<i class="material-icons">sync</i> Saving…';
      P.api("saveSyllabusLesson", [payload], { text: "Saving AstraGen lesson plan…" }).then(function (res) {
        if (!res || !res.success) throw new Error((res && res.error) || "The lesson plan could not be saved.");
        $("sylEditorFormHost").innerHTML = "";
        editorStatus(editing ? "AstraGen lesson plan updated." : "AstraGen lesson plan added. Continue with the existing Gemini PDF extraction workflow.", false);
        reloadEditorData(true, res.lesson || payload);
      }).catch(function (e) {
        editorStatus(e.message || e, true); saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="material-icons">save</i>' + (editing ? " Save changes" : " Add plan");
      });
    };
  }
  function editorStatus(message, isError) {
    var el = $("sylEditorStatus");
    if (!el) return;
    el.textContent = message || "";
    el.className = "syl-editor-status" + (isError ? " error" : " success");
  }
  function reloadEditorData(refreshReport, preferredLesson) {
    var oldPair = currentEditorPair(), oldMode = syllabusEditorMode;
    P.api("getSyllabusEditorData", [], { overlay: false }).then(function (data) {
      syllabusEditorData = data || { lessons: [], classSubjects: [] };
      syllabusEditorPairs = (syllabusEditorData.classSubjects || []).slice().sort(function (a, b) {
        return gw(a.grade) - gw(b.grade) || String(a.subject).localeCompare(String(b.subject));
      });
      var chosen = 0;
      var wantedGrade = preferredLesson ? preferredLesson.class : (oldPair && oldPair.grade);
      var wantedSubject = preferredLesson ? editorPairSubjectForLesson(preferredLesson) : (oldPair && oldPair.subject);
      if (wantedGrade != null && wantedSubject) {
        for (var i = 0; i < syllabusEditorPairs.length; i++) {
          if (editorGradeEqual(syllabusEditorPairs[i].grade, wantedGrade) && editorNormSubject(syllabusEditorPairs[i].subject) === editorNormSubject(wantedSubject)) { chosen = i; break; }
        }
      }
      $("sylEditorPair").innerHTML = syllabusEditorPairs.map(function (p, i) { return '<option value="' + i + '">' + esc(p.grade) + ' · ' + esc(p.subject) + '</option>'; }).join("");
      if (syllabusEditorPairs.length) $("sylEditorPair").value = String(chosen);
      syllabusEditorMode = oldMode;
      renderSyllabusEditorRows();
      if (refreshReport) { mgmtReport = null; loadReport(true); }
    }).catch(function (e) { editorStatus(e.message || e, true); });
  }
  function removeEditorRow(id) {
    if (syllabusEditorSaving) return;
    var pair = currentEditorPair();
    var draft = syllabusEditorDrafts.find(function (d) { return d._draftKey === id; });
    if (draft) {
      syllabusEditorDrafts = syllabusEditorDrafts.filter(function (d) { return d._draftKey !== id; });
      if (pair) delete syllabusEditorPendingValues[editorPendingKey(pair, id)];
      renderSyllabusEditorRows();
      return;
    }
    var row = findEditorLesson(id);
    if (!row) return;
    if (row.item_type !== "AstraGen") {
      if (!pair) return;
      if (!confirm('Mark "' + row.name + '" for removal from this class syllabus?\n\nIt will be removed only when you click Update class syllabus.')) return;
      var pending = editorPairPendingDeletes(pair);
      if (pending.indexOf(String(id)) < 0) pending.push(String(id));
      delete syllabusEditorPendingValues[editorPendingKey(pair, id)];
      renderSyllabusEditorRows();
      editorStatus('Lesson marked for removal. Click Update class syllabus to apply all class changes.', false);
      return;
    }
    var message = 'Remove AstraGen plan "' + row.name + '"?\n\nSaved session tasks and completion records will be preserved.';
    if (!confirm(message)) return;
    P.api("deleteSyllabusLesson", [id], { text: "Removing AstraGen syllabus entry…" }).then(function (res) {
      if (!res || !res.success) throw new Error((res && res.error) || "The AstraGen lesson plan could not be removed.");
      editorStatus("AstraGen lesson plan removed. Existing session and progress records were preserved.", false);
      reloadEditorData(true);
    }).catch(function (e) { editorStatus(e.message || e, true); });
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
  function managementTaskModal() {
    return '<div class="modal-overlay" id="sylMgmtTaskModal"><div class="modal-content" style="max-width:720px;width:100%;max-height:88vh;display:flex;flex-direction:column;">' +
      '<div class="modal-header-container"><h3 id="sylMgmtTaskTitle">Lesson tasks</h3><button class="modal-close-icon" data-close="sylMgmtTaskModal">&times;</button></div>' +
      '<div id="sylMgmtTaskBody" style="overflow-y:auto;flex-grow:1;padding-right:4px;"></div>' +
      '<button class="btn btn-secondary" data-close="sylMgmtTaskModal" style="margin-top:14px;">Close</button></div></div>';
  }
  function dateDrillModal() { return ""; }
  function syllabusEditorModal() {
    return '<div class="modal-overlay" id="sylEditorModal" style="z-index:1150;"><div class="modal-content syl-editor-modal">' +
      '<div class="modal-header-container"><div><h3 style="margin:0;">Edit Syllabus</h3><p class="syl-editor-intro">Edit manual chapters directly in a table. AstraGen PDF lesson plans remain separate and keep their Gemini session workflow.</p></div><button class="modal-close-icon" data-close="sylEditorModal">&times;</button></div>' +
      '<div class="syl-editor-toolbar"><label>Class · Subject<select id="sylEditorPair"><option value="">Loading…</option></select></label><div class="syl-editor-addwrap"><span id="sylEditorCount">Loading…</span><button type="button" class="btn btn-primary" id="sylEditorAdd"><i class="material-icons">add</i> Add lesson row</button><button type="button" class="btn btn-primary syl-editor-bulk-save" id="sylEditorBulkSave"><i class="material-icons">save</i> Update class syllabus</button></div></div>' +
      '<div class="syl-editor-modebar" id="sylEditorModes"></div>' +
      '<div id="sylEditorStatus" class="syl-editor-status"></div><div id="sylEditorFormHost"></div><div id="sylEditorList" class="syl-editor-list"><div class="inline-loader"><i class="material-icons">sync</i>Loading…</div></div>' +
      '<div class="syl-editor-footnote"><i class="material-icons">info</i><span>For Manual syllabus, add, edit and remove all rows first, then click <b>Update class syllabus</b> once. Changes are kept in the table until that button is pressed. AstraGen PDF extraction, Gemini analysis, sessions and task records continue through their separate workflow.</span></div>' +
      '<button class="btn btn-secondary" data-close="sylEditorModal" style="margin-top:14px;width:100%;">Close</button></div></div>';
  }

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
    ".syl-subcard.green{border-left-color:var(--success)}.syl-subcard.amber{border-left-color:var(--warning)}.syl-subcard.red{border-left-color:var(--danger)}.syl-subcard.no-drill{cursor:default}.syl-subcard.no-drill:hover{box-shadow:var(--shadow-sm);transform:none}" +
    ".syl-subcard-top{display:flex;justify-content:space-between;align-items:center}.syl-subname{font-weight:800;font-size:15px;color:var(--text-main)}.syl-chev{color:var(--text-muted)}" +
    ".syl-subteacher{font-size:12px;color:var(--text-muted);margin:4px 0 8px}" +
    ".syl-cpillrow{display:flex;flex-wrap:wrap;gap:6px}.syl-cpill{font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px}.syl-cpill.green{background:var(--success-light);color:#047857}.syl-cpill.amber{background:var(--warning-light);color:#92400e}.syl-cpill.red{background:var(--danger-light);color:#b91c1c}.syl-cpill.grey{background:#eef2f7;color:#475569}" +
    ".syl-drillmonth{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.4px;color:var(--maroon);margin:12px 0 6px}.syl-drillmonth i{font-size:15px;color:var(--accent)}" +
    ".syl-drillrow{display:flex;align-items:flex-start;gap:10px;border:1px solid var(--border);border-left:4px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:6px;background:#fff}.syl-drillrow.has-action{cursor:default}.syl-drill-open{flex:0 0 auto;border:1px solid var(--border);background:#f8fafc;color:var(--maroon);border-radius:8px;padding:7px 9px;font-size:11px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:4px}.syl-drill-open:hover{background:var(--primary-light);border-color:var(--maroon)}.syl-drill-open i{font-size:14px}.syl-drillrow.done{border-left-color:var(--success);background:rgba(16,185,129,.04)}.syl-drillrow.active{border-left-color:var(--warning);background:rgba(245,158,11,.06)}.syl-drillrow.pending{border-left-color:var(--danger)}" +
    ".syl-drno{flex:0 0 auto;min-width:30px;height:30px;border-radius:8px;background:#f1f5f9;color:var(--text-muted);font-weight:800;font-size:12px;display:inline-flex;align-items:center;justify-content:center;padding:0 6px}" +
    ".syl-drbody{flex:1 1 auto;min-width:0}.syl-drname{font-weight:700;font-size:14px;color:var(--text-main);line-height:1.35;word-break:break-word}.syl-drmeta{margin-top:5px}" +
    ".syl-dtag{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:var(--text-muted);background:#f1f5f9;border-radius:999px;padding:2px 9px}.syl-dtag i{font-size:13px}" +
    ".syl-dstatus{font-size:11px;font-weight:800;padding:3px 9px;border-radius:999px;white-space:nowrap}.syl-dstatus.done{background:rgba(16,185,129,.15);color:#047857}.syl-dstatus.active{background:rgba(245,158,11,.18);color:#b45309}.syl-dstatus.pending{background:rgba(239,68,68,.12);color:#b91c1c}" +
    ".syl-daybar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px}.syl-dayname{font-weight:800;color:var(--maroon);font-size:16px}.syl-dayday{font-size:13px;color:var(--text-muted);font-weight:600}" +
    ".syl-drow{display:flex;align-items:center;gap:14px;border:1px solid var(--border);border-radius:12px;background:#fff;padding:12px 14px;margin-bottom:8px}.syl-per{flex:0 0 auto;min-width:40px;height:32px;padding:0 10px;border-radius:8px;background:var(--primary-light);color:var(--maroon);font-weight:800;font-size:13px;display:inline-flex;align-items:center;justify-content:center}.syl-clssub{flex:0 0 auto;min-width:140px;font-size:14px;color:var(--text-main)}.syl-clssub b{color:var(--maroon)}.syl-topic{flex:1;font-size:14px;color:var(--text-main);font-weight:600}" +
    /* management: behind-schedule summary + filter + accordions */
    ".syl-filterseg{display:flex;width:100%;margin:0 0 14px}.syl-filterseg button{flex:1;justify-content:center}" +
    ".syl-summary{display:flex;align-items:center;gap:14px;border-radius:16px;padding:14px 16px;margin-bottom:16px;border:1px solid var(--border)}" +
    ".syl-summary.behind{background:linear-gradient(135deg,#fef2f2,#fee2e2);border-color:#fecaca}.syl-summary.ok{background:linear-gradient(135deg,#ecfdf5,#d1fae5);border-color:#a7f3d0}" +
    ".syl-sum-ic{flex:0 0 auto;width:46px;height:46px;border-radius:13px;display:grid;place-items:center}.syl-summary.behind .syl-sum-ic{background:#fff;color:#b91c1c}.syl-summary.ok .syl-sum-ic{background:#fff;color:#047857}.syl-sum-ic i{font-size:26px}" +
    ".syl-sum-tx{display:flex;flex-direction:column;gap:2px;min-width:0}.syl-sum-tx b{font-family:var(--head);font-size:15.5px;color:var(--text-main)}.syl-sum-tx em{font-style:normal;font-size:12.5px;color:var(--text-muted)}" +
    ".syl-gsec{border:1px solid var(--border);border-radius:14px;background:#fff;margin-bottom:12px;overflow:hidden;box-shadow:var(--shadow-sm)}" +
    ".syl-gsum{list-style:none;display:flex;align-items:center;gap:10px;padding:14px 16px;cursor:pointer;user-select:none}.syl-gsum::-webkit-details-marker{display:none}" +
    ".syl-gname{font-family:var(--head);font-weight:800;color:var(--maroon);font-size:16px}" +
    ".syl-gbadge{font-size:11px;font-weight:800;padding:3px 10px;border-radius:999px;display:inline-flex;align-items:center;gap:3px}.syl-gbadge.behind{background:var(--danger-light);color:#b91c1c}.syl-gbadge.ok{background:var(--success-light);color:#047857}.syl-gbadge i{font-size:13px}" +
    ".syl-gpct{margin-left:auto;font-size:12px;font-weight:700;color:var(--text-muted)}" +
    ".syl-gchev{color:var(--text-muted);transition:transform .2s ease;font-size:22px}.syl-gsec[open] .syl-gchev{transform:rotate(180deg)}" +
    ".syl-gsec .syl-subgrid{padding:0 14px 14px}" +
    ".syl-submini{font-size:11px;font-weight:700;color:var(--text-muted);align-self:center}" +
    ".syl-cpill i{font-size:13px;vertical-align:-2px;margin-right:2px}" +
    /* drill: behind state */
    ".syl-drillrow.behind{border-left-color:var(--danger);background:rgba(239,68,68,.05)}" +
    ".syl-dstatus.behind{background:var(--danger);color:#fff}" +
    ".syl-dtag.behind{color:#b91c1c;background:#fee2e2}.syl-dtag.behind i{font-size:13px}.syl-readonly{display:inline-flex;align-items:center;gap:4px;color:var(--text-muted);font-size:11px;font-weight:700}.syl-readonly i{font-size:14px}.syl-mgmt-note{margin:7px 0 0 32px;padding:7px 9px;background:#f8fafc;border-left:2px solid #cbd5e1;border-radius:5px;color:#64748b;font-size:11.5px;line-height:1.45}" +
    ".syl-edit-catalog-btn{background:#fff;border:1px solid var(--border);color:var(--maroon)}.syl-edit-catalog-btn:hover{background:var(--primary-light);border-color:var(--maroon)}" +
    ".syl-editor-modal{max-width:1120px;width:100%;max-height:92vh;display:flex;flex-direction:column;overflow:hidden}.syl-editor-intro{margin:4px 0 0;color:var(--text-muted);font-size:12.5px;font-weight:500;line-height:1.45;max-width:740px}" +
    ".syl-editor-toolbar{display:grid;grid-template-columns:minmax(220px,1fr) minmax(180px,1fr) auto;align-items:end;gap:10px;margin:12px 0}.syl-editor-toolbar label,.syl-editor-fields label{display:flex;flex-direction:column;gap:6px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.4px;color:var(--text-muted);min-width:0}.syl-editor-toolbar select,.syl-editor-toolbar input,.syl-editor-fields input,.syl-editor-fields select{width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:9px;background:#fff;color:var(--text-main);padding:10px 11px;font-size:13px;font-weight:600;min-width:0}.syl-editor-addwrap{display:flex;align-items:center;justify-content:flex-end;gap:10px}.syl-editor-addwrap span{font-size:12px;font-weight:800;color:var(--text-muted);white-space:nowrap}.syl-editor-status{display:none;padding:9px 11px;margin:0 0 10px;border-radius:9px;font-size:12px;font-weight:700}.syl-editor-status:not(:empty){display:block}.syl-editor-status.success{background:#ecfdf5;color:#047857;border:1px solid #a7f3d0}.syl-editor-status.error{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca}" +
    ".syl-editor-list{min-height:100px;overflow:auto;border:1px solid var(--border);border-radius:12px;background:#fff}.syl-editor-table-wrap{overflow-x:auto}.syl-editor-table{width:100%;border-collapse:separate;border-spacing:0;font-size:12px;min-width:720px}.syl-editor-table th{position:sticky;top:0;background:#f8fafc;color:#64748b;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.5px;padding:11px 12px;border-bottom:1px solid var(--border);white-space:nowrap}.syl-editor-table td{padding:11px 12px;border-bottom:1px solid #edf0f4;vertical-align:middle}.syl-editor-table tr:last-child td{border-bottom:0}.syl-editor-table tbody tr:hover{background:#fcfcfd}.syl-ed-order{display:flex;flex-direction:column;align-items:center;gap:1px;min-width:42px}.syl-ed-order b{font-size:12px;color:var(--maroon)}.syl-ed-move{display:grid;place-items:center;width:25px;height:20px;border:1px solid transparent;background:#f8fafc;color:#64748b;border-radius:5px;padding:0;cursor:pointer}.syl-ed-move:hover:not(:disabled){background:#f1f5f9;color:var(--maroon);border-color:var(--border)}.syl-ed-move:disabled{opacity:.25;cursor:default}.syl-ed-move i{font-size:17px}.syl-ed-title{font-size:13px;font-weight:800;color:var(--text-main);line-height:1.35;overflow-wrap:anywhere}.syl-ed-meta,.syl-ed-muted{font-size:11px;color:var(--text-muted);margin-top:4px;line-height:1.4;overflow-wrap:anywhere}.syl-ed-link{color:var(--maroon);font-size:11px;font-weight:800;text-decoration:none}.syl-ed-link:hover{text-decoration:underline}.syl-ed-tag{display:inline-flex;padding:4px 7px;border-radius:999px;font-size:10px;font-weight:800;white-space:nowrap}.syl-ed-tag.mapped{background:#eef2ff;color:#4338ca}.syl-ed-tag.manual{background:#f1f5f9;color:#475569}.syl-ed-actions{display:flex;gap:6px;flex-wrap:wrap}.syl-ed-action{display:inline-flex;align-items:center;gap:3px;padding:7px 8px!important;font-size:11px!important;white-space:nowrap}.syl-ed-action i{font-size:14px}.syl-ed-action.danger{color:#b91c1c;border-color:#fecaca}.syl-editor-form{border:1px solid #dbe3ed;background:#fbfcfe;border-radius:12px;padding:14px;margin-bottom:12px}.syl-editor-formhead{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:12px}.syl-editor-formhead b{font-size:15px;color:var(--maroon)}.syl-editor-formhead p{margin:4px 0 0;font-size:11.5px;color:var(--text-muted)}.syl-editor-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.syl-editor-fields label{font-size:10px}.syl-editor-fields small{font-size:10px;font-weight:600;line-height:1.4;text-transform:none;letter-spacing:0;color:var(--text-muted)}.syl-editor-fields .syl-ed-wide{grid-column:span 2}.syl-ed-formnote{font-size:11px;line-height:1.45;color:#64748b;background:#f1f5f9;border-radius:8px;padding:9px 10px;margin-top:10px}.syl-editor-formactions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}.syl-editor-footnote{display:flex;align-items:flex-start;gap:7px;font-size:11px;line-height:1.45;color:var(--text-muted);padding:10px 2px 0}.syl-editor-footnote i{font-size:16px;color:var(--maroon);flex-shrink:0}" +
    "@media(max-width:700px){.syl-editor-modal{max-height:94vh;padding:16px!important}.syl-editor-toolbar{grid-template-columns:1fr}.syl-editor-addwrap{justify-content:space-between}.syl-editor-fields{grid-template-columns:1fr 1fr}.syl-editor-fields .syl-ed-wide{grid-column:span 2}.syl-editor-intro{max-width:none}}" +
    "@keyframes pulse{0%,100%{opacity:1}50%{opacity:.55}}" +
    "@media(max-width:600px){.syl-grid{grid-template-columns:1fr}.syl-subgrid{grid-template-columns:1fr}.syl-drow{flex-direction:column;align-items:flex-start;gap:6px}.syl-clssub{min-width:0}}";
    css +=
      ".syl-editor-modal{max-width:1320px;width:calc(100% - 28px);max-height:94vh;padding:22px;box-sizing:border-box}" +
      ".syl-editor-toolbar{display:grid;grid-template-columns:minmax(260px,1fr) auto;align-items:end;gap:14px;margin:16px 0 10px}" +
      ".syl-editor-toolbar label{display:flex;flex-direction:column;gap:7px;color:var(--text-muted);font-size:11px;font-weight:800;letter-spacing:.35px;text-transform:uppercase}" +
      ".syl-editor-toolbar select{width:100%;min-height:46px;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:#fff;color:var(--text-main);font-size:14px;font-weight:700}" +
      ".syl-editor-addwrap{display:flex;align-items:center;justify-content:flex-end;gap:12px}.syl-editor-addwrap span{color:var(--text-muted);font-size:12px;font-weight:800;white-space:nowrap}" +
      ".syl-editor-modebar{display:flex;gap:8px;flex-wrap:wrap;margin:4px 0 12px;border-bottom:1px solid var(--border);padding-bottom:10px}" +
      ".syl-editor-mode{display:inline-flex;align-items:center;gap:8px;padding:9px 13px;border:1px solid var(--border);border-radius:9px;background:#f8fafc;color:var(--text-main);font-size:12px;font-weight:800;cursor:pointer}" +
      ".syl-editor-mode span{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:#e2e8f0;color:#475569;font-size:10px}" +
      ".syl-editor-mode.active{background:var(--maroon);border-color:var(--maroon);color:#fff}.syl-editor-mode.active span{background:rgba(255,255,255,.2);color:#fff}" +
      ".syl-editor-note,.syl-editor-gap{display:flex;align-items:flex-start;gap:8px;margin:0 0 10px;padding:10px 12px;border:1px solid #dbe3ed;border-radius:9px;background:#f8fafc;color:#475569;font-size:12px;line-height:1.5}" +
      ".syl-editor-gap{background:#fff8e8;border-color:#f5d99b;color:#854d0e}.syl-editor-note:before{content:'↕';font-size:16px;font-weight:800;color:var(--maroon)}.syl-editor-gap i{font-size:17px;flex:0 0 auto}" +
      ".syl-editor-list{max-height:58vh;min-height:120px;overflow:auto;border:1px solid var(--border);border-radius:11px;background:#fff}" +
      ".syl-editor-table-wrap{overflow:auto}.syl-editor-table{width:100%;min-width:960px;border-collapse:separate;border-spacing:0;font-size:12px}.syl-editor-table th{position:sticky;top:0;z-index:2;background:#f3f5f8;color:#566174;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.45px;padding:12px;border-bottom:1px solid var(--border);white-space:nowrap}.syl-editor-table td{padding:8px 10px;border-bottom:1px solid #edf0f4;vertical-align:middle}.syl-editor-table tbody tr:hover{background:#fbfcfe}.syl-editor-table tbody tr:last-child td{border-bottom:0}" +
      ".syl-manual-table .syl-col-no{width:105px}.syl-manual-table .syl-col-month{width:150px}.syl-manual-table .syl-col-link{width:240px}.syl-manual-table .syl-col-actions{width:150px}" +
      ".syl-col-drag{width:44px;text-align:center}.syl-ed-drag-handle{display:inline-grid;place-items:center;width:32px;height:34px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;color:#64748b;cursor:grab;padding:0;touch-action:none}.syl-ed-drag-handle:hover{background:#f1f5f9;color:var(--maroon);border-color:#cbd5e1}.syl-ed-drag-handle:active{cursor:grabbing}.syl-ed-drag-handle i{font-size:20px}.syl-manual-table tbody tr.syl-row-dragging{opacity:.42;background:#fff7ed}.syl-manual-table tbody tr.syl-row-dragging td{border-top:2px dashed var(--maroon)}" +
      ".syl-cell-input{display:block;box-sizing:border-box;width:100%;min-width:0;min-height:38px;padding:8px 9px;border:1px solid #d7dee8;border-radius:7px;background:#fff;color:var(--text-main);font:600 13px var(--font,Arial,sans-serif);outline:none}" +
      ".syl-cell-input:focus{border-color:var(--maroon);box-shadow:0 0 0 3px rgba(128,29,39,.08)}.syl-cell-number{text-align:center;font-weight:800}.syl-cell-title{min-width:260px}" +
      ".syl-row-actions{display:flex;align-items:center;gap:7px;white-space:nowrap}.syl-row-remove{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-width:86px;height:34px;padding:6px 9px!important;color:#b91c1c!important;border-color:#fecaca!important}.syl-row-remove i{font-size:17px}" +
      ".syl-ed-number{display:inline-flex;min-width:35px;justify-content:center;padding:6px 8px;border-radius:7px;background:#f1f5f9;color:var(--maroon);font-size:13px}" +
      ".syl-editor-intro{max-width:850px}.syl-editor-footnote{padding:11px 2px 0;font-size:11.5px}" +
      ".syl-editor-addwrap{flex-wrap:wrap}.syl-editor-bulk-save{background:#8f1d1d!important;border-color:#8f1d1d!important;color:#fff!important;font-weight:600!important;white-space:nowrap}.syl-editor-bulk-save:disabled{opacity:.65;cursor:wait}" +
      /* Keep editor typography calm and readable; do not inherit the portal's heavy button weights. */
      "#sylEditorModal{font-weight:400}#sylEditorModal button{font-weight:600!important}#sylEditorModal .syl-editor-toolbar label,#sylEditorModal .syl-editor-fields label{font-weight:600}" +
      "#sylEditorModal .syl-editor-toolbar select,#sylEditorModal .syl-editor-toolbar input,#sylEditorModal .syl-editor-fields input,#sylEditorModal .syl-editor-fields select{font-weight:400}" +
      "#sylEditorModal .syl-editor-addwrap span{font-weight:600}#sylEditorModal .syl-editor-mode{font-weight:600}" +
      "#sylEditorModal .syl-editor-mode.active{background:#fff7f6;border-color:var(--maroon);color:var(--maroon)}#sylEditorModal .syl-editor-mode.active span{background:#f4e1df;color:var(--maroon)}" +
      "#sylEditorModal .syl-editor-table th{font-weight:600}#sylEditorModal .syl-editor-table td{font-weight:400}" +
      "#sylEditorModal .syl-ed-title{font-weight:600}#sylEditorModal .syl-ed-link{font-weight:600}" +
      "#sylEditorModal .syl-ed-action{font-weight:500!important}" +
      "#sylEditorModal .syl-cell-input{font-weight:400}#sylEditorModal .syl-cell-number{font-weight:600}" +
      "#sylEditorModal .syl-ed-number{font-weight:600}" +
      "@media(max-width:760px){.syl-editor-modal{width:calc(100% - 12px);padding:14px!important}.syl-editor-toolbar{grid-template-columns:1fr}.syl-editor-addwrap{justify-content:space-between}.syl-editor-list{max-height:55vh}.syl-editor-intro{max-width:none}}";
    var st = document.createElement("style"); st.id = "syl-css"; st.textContent = css; document.head.appendChild(st);
  }
})();

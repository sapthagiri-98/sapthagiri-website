/* attendance.js — Daily Student Attendance page.
   Plain script; uses the global `Portal`. Same features & look as before,
   just no framework/router/module ceremony. Backend calls unchanged. */
(function () {
  "use strict";
  var P = window.Portal;
  var session = P.bootPage("attendance");
  if (!session) return;

  var esc = P.esc, todayIso = P.todayIso, prettyDate = P.prettyDate, isSunday = P.isSunday, sortGrades = P.sortGrades;
  var $ = function (id) { return document.getElementById(id); };
  var show = function (id, d) { var e = $(id); if (e) e.style.display = d || "block"; };
  var hide = function (id) { var e = $(id); if (e) e.style.display = "none"; };

  var isMgmt = session.role === "Management";
  var isAttendanceEntry = String(session.name || "").trim().toLowerCase() === "attendance entry";
  var att = { date: todayIso(), session: "Morning", className: "", roster: [], isEditMode: false, frozen: false, editable: true, reason: "" };
  var holidayInfo = null, pendingRecords = [];

  $("view").innerHTML = shell(isMgmt);
  bind(isMgmt);
  applyDateLock(isMgmt);
  initPortal(isMgmt);

  /* ---------------- Attendance Entry mode ---------------- */
  function injectAttendanceEntryCss() {
    if (!isAttendanceEntry || document.getElementById("att-entry-mode-css")) return;
    var st = document.createElement("style");
    st.id = "att-entry-mode-css";
    st.textContent =
      ".att-entry-header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 14px;padding:14px 16px;border:1px solid var(--border);border-radius:14px;background:#fff}" +
      ".att-entry-header .aeh-title{font-weight:800;color:var(--text-main);font-size:15px}.att-entry-header .aeh-sub{font-size:12px;color:var(--text-muted);margin-top:2px}" +
      ".att-entry-clock{font-size:12px;font-weight:800;color:var(--maroon);white-space:nowrap}" +
      ".att-entry-status{margin:0 0 14px;padding:12px 14px;border-radius:12px;background:#f8fafc;border:1px solid var(--border);font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:8px}" +
      ".att-entry-status i{font-size:18px;color:var(--maroon)}" +
      ".att-entry-frozen{padding:14px;border-radius:12px;background:#f1f5f9;border:1px solid #cbd5e1;color:#475569;font-size:13px;font-weight:700;margin-bottom:14px}" +
      ".att-entry-frozen i{vertical-align:middle;margin-right:6px}" +
      ".att-entry-pill.locked{background:#f1f5f9;color:#64748b;cursor:default}" +
      ".att-entry-pill.wait{background:#fff7ed;color:#9a3412;cursor:default}" +
      ".att-entry-pill.done{background:#ecfdf5;color:#047857}" +
      ".att-entry-help{font-size:12px;color:var(--text-muted);line-height:1.45;margin-top:10px}";
    document.head.appendChild(st);
  }

  if (isAttendanceEntry) injectAttendanceEntryCss();

  /* ---------------- markup ---------------- */
  function shell(mgmt) {
    return '' +
      '<div class="card wide-card" id="attendance-view">' +
        '<span class="eyebrow">Staff Portal</span><h2>' + (isAttendanceEntry ? 'Attendance Entry' : 'Daily Student Attendance') + '</h2>' +
        '<p class="view-description">' + (isAttendanceEntry ? 'Primary attendance entry · Nursery to Grade 5' : 'Manage daily classroom registers') + '</p>' +
        '<div class="smart-selector-row">' +
          '<div class="smart-selector" id="attDateCell"><div class="ss-icon"><i class="material-icons">event</i></div>' +
            '<div class="ss-body"><div class="ss-label">Date</div><input type="date" id="attDate" max="' + todayIso() + '"><span class="ss-value" id="attDateStatic" style="display:none;"></span></div></div>' +
          '<div class="smart-selector" id="attSessionCell" ' + (mgmt ? 'style="display:none;"' : '') + '><div class="ss-icon"><i class="material-icons">wb_sunny</i></div>' +
            '<div class="ss-body"><div class="ss-label">Session</div><select id="attSession"><option value="Morning">Morning</option><option value="Afternoon">Afternoon</option></select></div></div>' +
          '<div class="smart-selector" id="attClassCell" ' + (mgmt ? 'style="display:none;"' : '') + '><div class="ss-icon"><i class="material-icons">groups</i></div>' +
            '<div class="ss-body"><div class="ss-label">Class</div><select id="attClass"><option value="">Select Class…</option></select></div></div>' +
          '<div class="smart-selector status-cell"><div class="ss-icon"><i class="material-icons" id="attStatusIcon">info</i></div>' +
            '<div class="ss-body"><div class="ss-label">Status</div><span class="ss-value" id="attStatusText">Ready</span></div></div>' +
        '</div>' +
        '<div class="att-block" id="attBlock" role="alert"><i class="material-icons">event_busy</i>' +
          '<div><strong id="attBlockTitle">School is closed.</strong><span id="attBlockDetail"></span></div></div>' +
        (mgmt ? adminSplit() : teacherPanel()) +
      '</div>' +
      '<div class="sticky-footer" id="attFooter"><button class="btn btn-success" id="attSaveFooterBtn"><i class="material-icons" style="color:#fff;">verified_user</i> Review &amp; Commit Records</button></div>' +
      confirmModal() + resultModal();
  }
  function teacherPanel() {
    return '<div id="attTeacherPanel">' +
      '<div id="attLoader" class="inline-loader" style="display:none;"><i class="material-icons">sync</i>Loading student entries…</div>' +
      '<div id="attEditWarning" class="alert-warning" style="display:none;"><i class="material-icons" style="color:#92400e;">warning</i><div><strong>Records Exist:</strong> Attendance is already saved for this selection. Saving will overwrite existing values.</div></div>' +
      '<div id="attStudentCard" style="display:none;">' + bulkAndCounts() + '<div id="attStudentList"></div></div>' +
      '<div id="attTeacherEmpty" class="att-empty"><i class="material-icons">touch_app</i>Select Session and Class to load the register.</div></div>';
  }
  function adminSplit() {
    var specialHead = isAttendanceEntry ?
      '<div class="att-entry-header"><div><div class="aeh-title">Attendance Entry</div><div class="aeh-sub">Nursery to Grade 5 · Today only · one-time register entry</div></div><div class="att-entry-clock" id="attEntryClock">--:--</div></div>' +
      '<div class="att-entry-status"><i class="material-icons">info</i><span id="attEntryStatusText">Morning open. Afternoon opens at 12:30 PM. All registers freeze after saving.</span></div>' : '';
    return '<div class="att-admin-split" id="attAdminSplit">' +
      '<div>' + specialHead + '<div id="attClassListBox"><h3><i class="material-icons">fact_check</i> ' + (isAttendanceEntry ? "Today's Attendance Status" : 'Class Submission Summary') + '</h3><div id="attComplianceRows"></div></div></div>' +
      '<div>' +
        '<div id="attLoader" class="inline-loader" style="display:none;"><i class="material-icons">sync</i>Loading student entries…</div>' +
        '<div id="attEditWarning" class="alert-warning" style="display:none;"><i class="material-icons" style="color:#92400e;">warning</i><div><strong>Records Exist:</strong> Attendance is already saved for this selection. Saving will overwrite existing values.</div></div>' +
        '<div id="attAdminEmptyHint"><i class="material-icons">touch_app</i>Select a class on the left to load its register for editing.</div>' +
        '<div id="attStudentCard">' + bulkAndCounts() + '<div id="attStudentList"></div>' +
          '<div id="attAdminInlineSave"><button class="btn btn-success" id="attAdminSaveBtn"><i class="material-icons" style="color:#fff;">verified_user</i> Review &amp; Commit Records</button></div>' +
        '</div></div></div>';
  }
  function bulkAndCounts() {
    return '<div class="att-bulkbar"><button class="btn allp" id="attAllPresent"><i class="material-icons" style="color:#fff;font-size:18px;">done_all</i> All Present</button>' +
      '<button class="btn alla" id="attAllAbsent"><i class="material-icons" style="color:#fff;font-size:18px;">remove_done</i> All Absent</button></div>' +
      '<div class="att-counts"><div class="att-chip total"><span class="n" id="cntTotal">0</span><span class="l">TOTAL</span></div>' +
      '<div class="att-chip present"><span class="n" id="cntPresent">0</span><span class="l">PRESENT</span></div>' +
      '<div class="att-chip absent"><span class="n" id="cntAbsent">0</span><span class="l">ABSENT</span></div></div>';
  }
  function confirmModal() {
    return '<div class="modal-overlay" id="attConfirmModal"><div class="modal-content">' +
      '<div class="modal-header-container"><h3>Verify Class Summary</h3><button class="modal-close-icon" data-close="attConfirmModal">&times;</button></div>' +
      '<p style="color:var(--text-muted);font-size:14px;margin-bottom:20px;">Confirm totals before submitting to storage.</p>' +
      '<div class="att-confirm-totals"><div class="ct present"><div class="n" id="confPresent">0</div><div class="l">PRESENT</div></div>' +
      '<div class="ct absent"><div class="n" id="confAbsent">0</div><div class="l">ABSENT</div></div>' +
      '<div class="ct total"><div class="n" id="confTotal">0</div><div class="l">TOTAL</div></div></div>' +
      '<div style="display:flex;gap:12px;"><button class="btn btn-secondary" style="flex:1;" data-close="attConfirmModal">Cancel</button>' +
      '<button class="btn btn-success" style="flex:1;" id="attConfirmSaveBtn">Save Register</button></div></div></div>';
  }
  function resultModal() {
    return '<div class="modal-overlay" id="attResultModal"><div class="modal-content" style="text-align:center;">' +
      '<div id="attResultIcon" style="width:64px;height:64px;border-radius:50%;display:grid;place-items:center;margin:0 auto 14px;"></div>' +
      '<h3 id="attResultTitle" style="color:var(--maroon);margin-bottom:8px;"></h3><p id="attResultMsg" style="color:var(--text-muted);font-size:14px;margin-bottom:20px;"></p>' +
      '<button class="btn" id="attResultOkBtn">OK</button></div></div>';
  }

  /* ---------------- events ---------------- */
  function setStatus(mode, text) { var icon = $("attStatusIcon"), t = $("attStatusText"); if (icon) { icon.textContent = mode === "loading" ? "sync" : "check_circle"; icon.style.animation = mode === "loading" ? "spin 1s linear infinite" : "none"; } if (t) t.textContent = text; }
  function updateAttendanceEntryClock() {
    if (!isAttendanceEntry) return;
    var el = $("attEntryClock"), status = $("attEntryStatusText");
    if (!el) return;
    var d = new Date();
    var parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
    var hh = Number((parts.find(function (p) { return p.type === "hour"; }) || {}).value || 0);
    var mm = Number((parts.find(function (p) { return p.type === "minute"; }) || {}).value || 0);
    el.textContent = String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
    var mins = hh * 60 + mm;
    if (status) {
      if (mins >= 17 * 60) status.textContent = "Attendance Entry is closed. All of today's registers are frozen.";
      else if (mins >= 12 * 60 + 30) status.textContent = "Afternoon attendance is open. Morning remains available only if it has not yet been saved.";
      else status.textContent = "Morning attendance is open. Afternoon opens at 12:30 PM.";
    }
  }
  function attendanceEntryClassAllowed(cls) {
    var k = String(cls || "").toUpperCase().replace(/[\s_-]+/g, "");
    return k === "NURSERY" || k === "LKG" || k === "UKG" || /^[1-5]$/.test(k) || /^GRADE[1-5]$/.test(k);
  }
  function bind(mgmt) {
    $("attResultOkBtn").addEventListener("click", function () { P.closeModal("attResultModal"); });
    Array.prototype.forEach.call(document.querySelectorAll("[data-close]"), function (b) { b.addEventListener("click", function () { P.closeModal(b.getAttribute("data-close")); }); });
    [$("attConfirmModal"), $("attResultModal")].forEach(function (m) { if (m) m.addEventListener("click", function (e) { if (e.target === m) P.closeModal(m.id); }); });
    $("attDate").addEventListener("change", function () { onDateOrSession(mgmt); });
    if (mgmt) $("attAdminSaveBtn").addEventListener("click", submit);
    else { $("attSession").addEventListener("change", function () { onDateOrSession(mgmt); }); $("attClass").addEventListener("change", onClassChange); $("attSaveFooterBtn").addEventListener("click", submit); }
    if ($("attAllPresent")) $("attAllPresent").addEventListener("click", function () { setAll("P"); });
    if ($("attAllAbsent")) $("attAllAbsent").addEventListener("click", function () { setAll("A"); });
    $("attConfirmSaveBtn").addEventListener("click", executeSubmit);
  }
  function applyDateLock(mgmt) {
    var cell = $("attDateCell"), input = $("attDate"), stat = $("attDateStatic");
    input.setAttribute("max", todayIso());
    if (isAttendanceEntry) {
      cell.classList.add("locked"); input.style.display = "none"; stat.style.display = "block"; input.value = todayIso();
      stat.textContent = prettyDate(todayIso()) + " (Today)";
    } else if (mgmt) { cell.classList.remove("locked"); input.style.display = ""; stat.style.display = "none"; if (!input.value || input.value > todayIso()) input.value = todayIso(); }
    else { cell.classList.add("locked"); input.style.display = "none"; stat.style.display = "block"; input.value = todayIso(); stat.textContent = prettyDate(todayIso()) + " (Today)"; }
  }

  function initPortal(mgmt) {
    setStatus("loading", "Syncing workspace…");
    updateAttendanceEntryClock();
    if (isAttendanceEntry) {
      clearInterval(window.__attEntryClockTimer);
      window.__attEntryClockTimer = setInterval(function () {
        var before = $("attEntryStatusText") ? $("attEntryStatusText").textContent : "";
        updateAttendanceEntryClock();
        var after = $("attEntryStatusText") ? $("attEntryStatusText").textContent : "";
        if (before !== after) { P.api("getClassAttendanceSummary", [$("attDate").value], { overlay: false }).then(function (s) { renderCompliance(s || []); }); }
      }, 30000);
    }
    var date = $("attDate").value, campus = mgmt ? "" : (session.campus || "");
    var cachedClasses = isAttendanceEntry ? null : P.Cache.get("classes_" + campus);
    var jobs = [P.api("getHolidaysForDate", [date], { overlay: false })];
    jobs.push(cachedClasses ? Promise.resolve(cachedClasses) : P.api("getClasses", [campus], { overlay: false }));
    jobs.push(mgmt ? P.api("getClassAttendanceSummary", [date], { overlay: false }) : Promise.resolve(null));
    P.overlay(true, "Loading attendance…");
    Promise.all(jobs).then(function (r) {
      holidayInfo = r[0] || { perClass: {} };
      var classes = r[1] || [];
      if (!cachedClasses) P.Cache.set("classes_" + campus, classes, P.CONFIG.CLASS_TTL_MS);
      if (!mgmt) fillClassDropdown(classes);
      if (applyDayBlock(mgmt)) return;
      if (mgmt) { $("attAdminSplit").classList.add("show"); renderCompliance(r[2] || []); }
      setStatus("ready", isAttendanceEntry ? "Attendance Entry ready" : "Ready");
    }).catch(function (e) { setStatus("ready", "Error: " + (e.message || e)); })
      .finally(function () { P.overlay(false); });
  }
  function fillClassDropdown(classes) { var dd = $("attClass"); dd.innerHTML = '<option value="">Select Class…</option>'; sortGrades(classes.slice()).forEach(function (c) { var o = document.createElement("option"); o.value = c; o.text = c; dd.add(o); }); }

  function applyDayBlock(mgmt) {
    var date = $("attDate").value, block = $("attBlock"), title = $("attBlockTitle"), detail = $("attBlockDetail");
    if (isSunday(date)) { title.textContent = "School is closed on Sundays."; detail.textContent = "Attendance cannot be recorded for a Sunday."; block.classList.add("show"); if (mgmt) $("attAdminSplit").classList.remove("show"); hide("attStudentCard"); $("attFooter").classList.remove("show"); return true; }
    var all = holidayInfo && holidayInfo.perClass ? holidayInfo.perClass["ALL"] : null;
    if (all && all.blocksMorning && all.blocksAfternoon) { title.textContent = "Holiday: " + (all.reason || "Declared"); detail.textContent = "School is closed on this date."; block.classList.add("show"); if (mgmt) $("attAdminSplit").classList.remove("show"); hide("attStudentCard"); $("attFooter").classList.remove("show"); return true; }
    block.classList.remove("show"); if (mgmt) $("attAdminSplit").classList.add("show"); return false;
  }

  function onDateOrSession(mgmt) {
    var date = $("attDate").value;
    if (isAttendanceEntry) {
      $("attDate").value = todayIso();
      updateAttendanceEntryClock();
      if (isSunday(todayIso())) { applyDayBlock(true); return; }
    }
    if (date && date > todayIso()) { $("attDate").value = todayIso(); showResult(false, "Future date", "Attendance cannot be recorded for a future date. Reverted to today."); return; }
    setStatus("loading", "Refreshing…");
    P.api("getHolidaysForDate", [date], { text: "Checking day…" }).then(function (info) {
      holidayInfo = info || { perClass: {} };
      if (applyDayBlock(mgmt)) { setStatus("ready", "Blocked"); return; }
      if (mgmt) { hide("attStudentCard"); show("attAdminEmptyHint"); hide("attEditWarning"); $("attAdminInlineSave").style.display = "none"; P.api("getClassAttendanceSummary", [date], { text: "Loading summary…" }).then(function (s) { renderCompliance(s || []); setStatus("ready", "Ready"); }); }
      else { var cls = $("attClass").value; if (cls) fetchStudents(); else setStatus("ready", "Ready"); }
    });
  }
  function onClassChange() { var cls = $("attClass").value, date = $("attDate").value, session2 = $("attSession").value; if (cls && date && session2) { if (!applyDayBlock(false)) fetchStudents(); } }

  function renderCompliance(summary) {
    var box = $("attComplianceRows"); if (!box) return; box.innerHTML = "";
    var mP = 0, mT = 0, aP = 0, aT = 0, hol = (holidayInfo && holidayInfo.perClass) || {};
    var rows = summary.slice();
    if (isAttendanceEntry) rows = rows.filter(function (r) { return attendanceEntryClassAllowed(r.className); });
    sortGrades(rows, function (r) { return r.className; }).forEach(function (row) {
      mT += row.morning.total; aT += row.afternoon.total;
      var h = hol[row.className] || hol["ALL"] || null, mB = !!(h && h.blocksMorning), aB = !!(h && h.blocksAfternoon), safe = esc(row.className), mBadge, aBadge;
      if (mB) mBadge = '<button class="mini-pill holiday"><i class="material-icons" style="font-size:12px;">event_busy</i> Holiday</button>';
      else if (row.morning.status === "Completed") { mP += row.morning.present; mBadge = '<button class="mini-pill ' + (isAttendanceEntry ? 'att-entry-pill done' : 'done') + '" data-cls="' + safe + '" data-ses="Morning"><i class="material-icons" style="font-size:12px;">check_circle</i> M ' + row.morning.present + '/' + row.morning.total + '</button>'; }
      else if (isAttendanceEntry && !row.morning.editable) mBadge = '<button class="mini-pill att-entry-pill locked" title="' + esc(row.morning.reason || "Locked") + '"><i class="material-icons" style="font-size:12px;">lock</i> ' + esc(row.morning.reason || "Locked") + '</button>';
      else mBadge = '<button class="mini-pill pending" data-cls="' + safe + '" data-ses="Morning"><i class="material-icons" style="font-size:12px;">error_outline</i> M pending</button>';
      if (aB) aBadge = '<button class="mini-pill holiday"><i class="material-icons" style="font-size:12px;">event_busy</i> Holiday</button>';
      else if (row.afternoon.status === "Completed") { aP += row.afternoon.present; aBadge = '<button class="mini-pill ' + (isAttendanceEntry ? 'att-entry-pill done' : 'done') + '" data-cls="' + safe + '" data-ses="Afternoon"><i class="material-icons" style="font-size:12px;">check_circle</i> A ' + row.afternoon.present + '/' + row.afternoon.total + '</button>'; }
      else if (isAttendanceEntry && !row.afternoon.editable) {
        var wait = String(row.afternoon.reason || "").toLowerCase().indexOf("opens") >= 0;
        aBadge = '<button class="mini-pill att-entry-pill ' + (wait ? 'wait' : 'locked') + '" title="' + esc(row.afternoon.reason || "Locked") + '"><i class="material-icons" style="font-size:12px;">' + (wait ? 'schedule' : 'lock') + '</i> ' + esc(wait ? 'A opens 12:30' : 'A locked') + '</button>';
      } else aBadge = '<button class="mini-pill pending" data-cls="' + safe + '" data-ses="Afternoon"><i class="material-icons" style="font-size:12px;">error_outline</i> A pending</button>';
      box.insertAdjacentHTML("beforeend", '<div class="cls-card"><div class="cls-name">' + safe + '</div><div class="cls-badges">' + mBadge + aBadge + '</div></div>');
    });
    box.insertAdjacentHTML("beforeend", '<div class="cls-total-card"><div>TOTALS</div><div class="totals-pair"><span>M: ' + mP + ' / ' + mT + '</span><span>A: ' + aP + ' / ' + aT + '</span></div></div>');
    if (isAttendanceEntry) {
      box.insertAdjacentHTML("beforeend", '<div class="att-entry-help">Tap a pending session to enter it. A saved session is immediately frozen. Morning remains available after 12:30 only if it was not already saved. All new entry is blocked at 5:00 PM.</div>');
    }
    Array.prototype.forEach.call(box.querySelectorAll(".mini-pill[data-cls]"), function (b) { b.addEventListener("click", function () { loadAdminClass(b.getAttribute("data-cls"), b.getAttribute("data-ses")); }); });
  }

  function loadAdminClass(className, sessionType) {
    var date = $("attDate").value;
    if (isAttendanceEntry) {
      if (!attendanceEntryClassAllowed(className)) return;
      if (isSunday(date)) { applyDayBlock(true); return; }
    }
    if (isSunday(date)) { applyDayBlock(true); return; }
    att.className = className; att.session = sessionType;
    hide("attAdminEmptyHint"); show("attLoader"); hide("attStudentCard"); hide("attEditWarning"); $("attAdminInlineSave").style.display = "none";
    att.frozen = false; att.editable = true; att.reason = "";
    loadRoster(className, date, sessionType);
  }
  function fetchStudents() {
    var cls = $("attClass").value, date = $("attDate").value, session2 = $("attSession").value;
    if (isSunday(date)) { applyDayBlock(false); return; } if (!cls || !date) return;
    att.className = cls; att.session = session2;
    show("attLoader"); hide("attStudentCard"); $("attFooter").classList.remove("show"); hide("attEditWarning"); hide("attTeacherEmpty");
    loadRoster(cls, date, session2);
  }
  function loadRoster(cls, date, session2) {
    var cached = P.Cache.get("roster_" + String(cls).toLowerCase());
    P.api("loadStudents", [cls, date, session2], { perf: "Load Students", text: "Loading students…" }).then(function (resp) {
      hide("attLoader");
      var students = (resp && resp.students) ? resp.students : [];
      if (resp && resp.students) P.Cache.set("roster_" + String(cls).toLowerCase(), resp.students.map(function (s) { return { id: s.id, name: s.name }; }), P.CONFIG.CLASS_TTL_MS);
      att.roster = students.map(function (s) { return { id: s.id, name: s.name, status: s.status || "P" }; });
      att.isEditMode = !!(resp && resp.isEditMode);
      att.frozen = !!(resp && resp.frozen);
      att.editable = resp && resp.editable !== false;
      att.reason = (resp && resp.reason) || "";
      renderRoster();
    }).catch(function (e) { hide("attLoader"); showResult(false, "Load failed", e.message || String(e)); });
    if (cached) { /* names available immediately if needed; status still loads live */ }
  }
  function renderRoster() {
    if (isAttendanceEntry) {
      hide("attEditWarning");
      var oldFreeze = $("attEntryFreezeNotice");
      if (oldFreeze) oldFreeze.remove();
      if (att.frozen || !att.editable) {
        var notice = document.createElement("div"); notice.id = "attEntryFreezeNotice"; notice.className = "att-entry-frozen";
        notice.innerHTML = '<i class="material-icons">lock</i>' + esc(att.reason || "This register is frozen and cannot be changed.");
        $("attStudentCard").insertBefore(notice, $("attStudentList"));
      }
    } else if (att.isEditMode) show("attEditWarning", "flex");
    if (att.roster.length === 0) {
      $("attStudentList").innerHTML = '<div class="att-empty"><i class="material-icons">inbox</i>No student records found for this selection.</div>';
      show("attStudentCard"); if (isMgmt) $("attAdminInlineSave").style.display = "none"; else $("attFooter").classList.remove("show"); updateCounts(); return;
    }
    $("attStudentList").innerHTML = att.roster.map(rowHtml).join("");
    Array.prototype.forEach.call($("attStudentList").querySelectorAll(".pa-toggle button"), function (btn) { btn.addEventListener("click", function () { if (isAttendanceEntry && (!att.editable || att.frozen)) return; toggle(+btn.getAttribute("data-i"), btn.getAttribute("data-s")); }); });
    show("attStudentCard");
    if (isMgmt) $("attAdminInlineSave").style.display = isAttendanceEntry && (!att.editable || att.frozen) ? "none" : "flex";
    else { $("attFooter").classList.add("show"); $("attStudentCard").scrollIntoView({ behavior: "smooth", block: "start" }); }
    if (isAttendanceEntry && (!att.editable || att.frozen)) $("attFooter").classList.remove("show");
    updateCounts();
  }
  function rowHtml(s, i) {
    var isP = s.status === "P";
    return '<div class="student-row-mobile" data-i="' + i + '"><div class="student-info"><span class="student-name">' + esc(s.name) + '</span><span class="student-id">ID: ' + esc(s.id) + '</span></div>' +
      '<div class="pa-toggle" id="pa-' + i + '"><button type="button" class="' + (isP ? "on-p" : "") + '" data-i="' + i + '" data-s="P">P</button><button type="button" class="' + (!isP ? "on-a" : "") + '" data-i="' + i + '" data-s="A">A</button></div></div>';
  }
  function toggle(i, status) { att.roster[i].status = status; var t = $("pa-" + i); if (!t) return; var b = t.querySelectorAll("button"); b[0].classList.remove("on-p"); b[1].classList.remove("on-a"); if (status === "P") b[0].classList.add("on-p"); else b[1].classList.add("on-a"); updateCounts(); }
  function setAll(status) { att.roster.forEach(function (s, i) { toggle(i, status); }); }
  function updateCounts() { var total = att.roster.length, present = att.roster.filter(function (s) { return s.status === "P"; }).length; $("cntTotal").textContent = total; $("cntPresent").textContent = present; $("cntAbsent").textContent = total - present; }

  function submit() {
    if (att.roster.length === 0) return;
    if (isAttendanceEntry && (!att.editable || att.frozen)) { showResult(false, "Register frozen", att.reason || "This attendance register cannot be changed."); return; }
    var teacher = session.name || "System Admin";
    pendingRecords = att.roster.map(function (s) { return { date: att.date, "class": att.className, session: att.session, id: s.id, name: s.name, status: s.status, teacher: teacher }; });
    var present = att.roster.filter(function (s) { return s.status === "P"; }).length;
    $("confPresent").textContent = present; $("confAbsent").textContent = att.roster.length - present; $("confTotal").textContent = att.roster.length;
    P.openModal("attConfirmModal");
  }
  function executeSubmit() {
    P.closeModal("attConfirmModal");
    P.api("saveAttendance", [pendingRecords], { perf: "Save Register", text: "Storing register…" }).then(function () {
      showResult(true, "Attendance saved", isAttendanceEntry ? "Register saved and frozen. Returning to today's status." : "The register was stored successfully.");
      if (isMgmt) {
        P.api("getClassAttendanceSummary", [att.date], { overlay: false }).then(function (s) { renderCompliance(s || []); });
        hide("attStudentCard"); show("attAdminEmptyHint"); $("attAdminInlineSave").style.display = "none";
      } else { $("attFooter").classList.remove("show"); $("attClass").value = ""; hide("attStudentCard"); show("attTeacherEmpty"); }
    }).catch(function (e) { showResult(false, "Save failed", e.message || String(e)); });
  }
  function showResult(ok, title, msg) {
    var icon = $("attResultIcon"); icon.style.background = ok ? "var(--success-light)" : "var(--danger-light)";
    icon.innerHTML = '<i class="material-icons" style="font-size:34px;color:' + (ok ? "var(--success)" : "var(--danger)") + ';">' + (ok ? "check_circle" : "error") + '</i>';
    $("attResultTitle").textContent = title; $("attResultMsg").textContent = msg; P.openModal("attResultModal");
  }
})();

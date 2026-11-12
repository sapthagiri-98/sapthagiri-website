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

  /* Attendance Entry uses India Standard Time as the authoritative date.
     Do not use the browser/device timezone for this account. */
  function indiaTodayIso() {
    var parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());
    var out = {};
    parts.forEach(function (p) {
      if (p.type !== "literal") out[p.type] = p.value;
    });
    return out.year + "-" + out.month + "-" + out.day;
  }

  var attendanceToday = isAttendanceEntry ? indiaTodayIso() : todayIso();
  var att = { date: attendanceToday, session: "Morning", className: "", roster: [], isEditMode: false, frozen: false, editable: true, reason: "" };
  var holidayInfo = null, pendingRecords = [];
  var cachedSummary = [];
  var mobSearchQuery = "";
  var mobFilterStatus = "all";

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
      ".att-entry-header .aeh-title{font-weight:800;color:var(--text-main);font-size:15px}" +
      ".att-entry-clock{font-size:12px;font-weight:800;color:var(--maroon);white-space:nowrap;background:#fff5f5;padding:7px 10px;border-radius:10px}" +
      ".att-entry-status{margin:0 0 14px;padding:12px 14px;border-radius:12px;background:#f8fafc;border:1px solid var(--border);font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:8px}" +
      ".att-entry-status i{font-size:18px;color:var(--maroon)}" +
      ".att-entry-frozen{padding:14px;border-radius:12px;background:#f1f5f9;border:1px solid #cbd5e1;color:#475569;font-size:13px;font-weight:700;margin-bottom:14px}" +
      ".att-entry-frozen i{vertical-align:middle;margin-right:6px}" +
      ".att-entry-pill.locked{background:#f1f5f9;color:#64748b;cursor:default}" +
      ".att-entry-pill.wait{background:#fff7ed;color:#9a3412;cursor:default}" +
      ".att-entry-pill.done{background:#ecfdf5;color:#047857}" +
      ".att-entry-help{font-size:12px;color:var(--text-muted);line-height:1.45;margin-top:10px}" +
      ".att-selected-register{display:flex;align-items:center;gap:10px;margin:0 0 10px;padding:11px 12px;border:1px solid var(--border);border-radius:12px;background:#fff}" +
      ".att-selected-register .asr-icon{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:#fff5f5;color:var(--maroon);flex:0 0 auto}" +
      ".att-selected-register .asr-icon i{font-size:19px}" +
      ".att-selected-register .asr-main{min-width:0;flex:1}" +
      ".att-selected-register .asr-class{font-size:15px;font-weight:900;color:var(--text-main);line-height:1.2}" +
      ".att-selected-register .asr-session{font-size:11px;color:var(--text-muted);margin-top:2px}" +
      ".att-selected-register .asr-back{border:1px solid var(--border);background:#fff;color:var(--maroon);border-radius:9px;padding:7px 9px;font-size:11px;font-weight:800;display:flex;align-items:center;gap:3px;cursor:pointer}" +
      ".att-selected-register .asr-back i{font-size:15px}" +

      /* Attendance Entry is a write screen even though its account role is Management.
         Override only the attendance controls hidden by the generic mobile-admin CSS. */
      "@media(max-width:900px){" +
        "body.mobile-admin #attendance-view .att-bulkbar{display:grid!important;grid-template-columns:1fr 1fr;gap:8px}" +
        "body.mobile-admin #attendance-view .pa-toggle{display:grid!important;grid-template-columns:1fr 1fr;gap:4px;pointer-events:auto!important}" +
        "body.mobile-admin #attendance-view #attAdminInlineSave{display:flex!important}" +
        "body.mobile-admin #attendance-view #attAdminInlineSave .btn{display:flex!important;width:100%;min-height:48px;align-items:center;justify-content:center}" +

        "#attendance-view{width:100%;margin:0;padding:0}" +
        "#attendance-view .smart-selector-row{display:block}" +
        "#attendance-view .smart-selector-row .smart-selector{margin-bottom:8px}" +

        ".att-entry-header{padding:12px 13px;margin-bottom:9px;border-radius:13px}" +
        ".att-entry-header .aeh-title{font-size:14px}" +

        ".att-entry-clock{font-size:12px;padding:7px 9px}" +
        ".att-entry-status{padding:10px 12px;margin-bottom:10px;font-size:11.5px;line-height:1.35;align-items:flex-start}" +

        ".att-admin-split{display:flex!important;flex-direction:column!important;gap:12px!important}" +
        "#attAdminSplit>div:first-child,#attAdminSplit>div:last-child{width:100%!important}" +

        "#attClassListBox .cls-card{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:11px 12px;margin-bottom:7px;border-radius:12px}" +
        "#attClassListBox .cls-name{font-size:14px;font-weight:800;min-width:68px}" +
        "#attClassListBox .cls-badges{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}" +
        "#attClassListBox .mini-pill{min-height:34px;padding:7px 9px;font-size:11px;border-radius:999px}" +
        "#attClassListBox .cls-total-card{padding:11px 12px;border-radius:12px;margin-top:8px}" +

        ".att-bulkbar{margin-bottom:9px}" +
        ".att-bulkbar .btn{min-height:44px;justify-content:center;border-radius:11px;font-size:12px}" +
        ".att-counts{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:10px}" +
        ".att-chip{padding:9px 5px;border-radius:11px;text-align:center}" +
        ".att-chip .n{font-size:20px;line-height:1}" +
        ".att-chip .l{font-size:9px;margin-top:3px}" +

        ".student-row-mobile{display:flex!important;align-items:center;justify-content:space-between;gap:10px;padding:11px 10px;margin-bottom:6px;background:#fff;border:1px solid var(--border);border-radius:12px;min-height:62px}" +
        ".student-info{min-width:0;flex:1}" +
        ".student-name{display:block;font-size:14px;font-weight:800;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
        ".student-id{display:block;font-size:10px;color:var(--text-muted);margin-top:3px}" +
        ".pa-toggle{flex:0 0 auto;background:#f1f5f9;padding:3px;border-radius:10px}" +
        ".pa-toggle button{width:40px;height:38px;border:0;border-radius:8px;font-size:14px;font-weight:900;background:transparent;cursor:pointer;touch-action:manipulation;pointer-events:auto!important}" +
        ".pa-toggle button.on-p{background:#dcfce7;color:#047857}" +
        ".pa-toggle button.on-a{background:#fee2e2;color:#b91c1c}" +

        "#attAdminInlineSave{margin-top:10px}" +
        "#attAdminInlineSave .btn{min-height:48px;border-radius:12px;font-size:13px}" +

        ".att-entry-frozen{font-size:12px;padding:11px 12px;margin-bottom:9px}" +
        ".att-entry-help{font-size:11px;line-height:1.4}" +
        ".att-selected-register{margin-bottom:9px;padding:10px;border-radius:11px}" +
        ".att-selected-register .asr-class{font-size:14px}" +
        ".att-selected-register .asr-session{font-size:10px}" +
        ".att-selected-register .asr-back{min-height:36px;padding:7px 8px}" +
      "}" +

      "@media(max-width:420px){" +
        ".att-entry-header{align-items:flex-start}" +
        ".att-entry-clock{margin-top:1px}" +
        "#attClassListBox .cls-card{align-items:flex-start;flex-direction:column}" +
        "#attClassListBox .cls-badges{width:100%;justify-content:flex-start}" +
        "#attClassListBox .mini-pill{flex:1 1 auto;text-align:center;justify-content:center}" +
        ".student-name{font-size:13px}" +
      "}";
    document.head.appendChild(st);
  }

  function injectMobileAttendanceStyles() {
    if (document.getElementById("att-mob-redesign-css")) return;
    var st = document.createElement("style");
    st.id = "att-mob-redesign-css";
    st.textContent =
      "#attMobSearchSection{display:none;}" +
      "@media(max-width:900px){" +
        "#attAdminEmptyHint{display:none!important;}" +
        ".att-mob-class-grid{display:flex;flex-direction:column;gap:10px;margin-top:10px;}" +
        ".att-mob-class-card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:12px 14px;box-shadow:0 1px 4px rgba(15,23,42,0.04);cursor:pointer;touch-action:manipulation;transition:transform 0.1s;}" +
        ".att-mob-class-card:active{background:#f8fafc;transform:scale(0.99);}" +
        ".att-mob-cc-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}" +
        ".att-mob-cc-name{font-size:15px;font-weight:900;color:#0f172a;letter-spacing:-0.01em;}" +
        ".att-mob-cc-pct{font-size:11.5px;font-weight:800;padding:3px 8px;border-radius:999px;background:#dcfce7;color:#15803d;}" +
        ".att-mob-cc-pct.pending{background:#fef3c7;color:#b45309;}" +
        ".att-mob-cc-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;background:#f8fafc;padding:7px 10px;border-radius:10px;margin-bottom:8px;text-align:center;}" +
        ".att-mob-stat-val{font-size:14px;font-weight:900;color:#0f172a;font-variant-numeric:tabular-nums;line-height:1.2;}" +
        ".att-mob-stat-lbl{font-size:9.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.02em;margin-top:1px;}" +
        ".att-mob-cc-progress{height:5px;background:#e2e8f0;border-radius:999px;overflow:hidden;margin-bottom:8px;}" +
        ".att-mob-cc-bar{height:100%;background:#15803d;border-radius:999px;transition:width 0.3s ease;}" +
        ".att-mob-cc-foot{display:flex;align-items:center;justify-content:space-between;border-top:1px solid #f1f5f9;padding-top:7px;}" +
        ".att-mob-cc-sessions{display:flex;gap:5px;}" +
        ".att-mob-sess-btn{border:1px solid #cbd5e1;background:#fff;border-radius:7px;padding:4px 8px;font-size:11px;font-weight:800;color:#334155;display:inline-flex;align-items:center;gap:3px;cursor:pointer;}" +
        ".att-mob-sess-btn.done{background:#f0fdf4;border-color:#86efac;color:#166534;}" +
        ".att-mob-sess-btn.pending{background:#fffbeb;border-color:#fde68a;color:#92400e;}" +
        ".att-mob-sess-btn.locked{background:#f1f5f9;border-color:#cbd5e1;color:#64748b;}" +
        ".att-mob-cc-arrow{font-size:12px;font-weight:800;color:#7a151a;display:inline-flex;align-items:center;gap:1px;}" +

        /* Dedicated mobile roster view */
        "#attMobRosterContainer{margin-bottom:12px;}" +
        ".att-mob-nav-bar{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:8px 10px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;gap:8px;box-shadow:0 1px 3px rgba(0,0,0,0.03);}" +
        ".att-mob-back-btn{display:inline-flex;align-items:center;gap:3px;border:none;background:transparent;color:#7a151a;font-size:13px;font-weight:800;padding:6px 4px;cursor:pointer;white-space:nowrap;}" +
        ".att-mob-quick-selects{display:flex;gap:5px;flex:1;justify-content:flex-end;min-width:0;}" +
        ".att-mob-quick-select{padding:5px 7px;border:1px solid #cbd5e1;border-radius:8px;font-size:12px;font-weight:700;color:#0f172a;background:#fff;max-width:130px;min-height:36px;}" +
        ".att-mob-detail-header{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin-bottom:10px;}" +
        ".att-mob-dh-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}" +
        ".att-mob-dh-class{font-size:17px;font-weight:900;color:#0f172a;}" +
        ".att-mob-dh-session{font-size:11px;font-weight:800;padding:3px 8px;border-radius:6px;background:#fff5f5;color:#7a151a;}" +
        ".att-mob-search-row{position:relative;margin-bottom:8px;}" +
        ".att-mob-search-row i{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:17px;pointer-events:none;}" +
        ".att-mob-search-input{width:100%!important;height:38px!important;padding:6px 10px 6px 34px!important;border:1px solid #cbd5e1!important;border-radius:8px!important;font-size:13px!important;box-sizing:border-box!important;background:#fff!important;pointer-events:auto!important;user-select:text!important;}" +
        ".att-mob-filter-pills{display:flex;gap:5px;}" +
        ".att-mob-pill{padding:5px 11px;border-radius:999px;border:1px solid #e2e8f0;background:#fff;font-size:11.5px;font-weight:700;color:#64748b;cursor:pointer;}" +
        ".att-mob-pill.active{background:#7a151a;color:#fff;border-color:#7a151a;}" +
        ".att-mob-status-pill{display:inline-flex;align-items:center;justify-content:center;padding:5px 12px;border-radius:999px;font-size:12px;font-weight:900;letter-spacing:0.02em;min-width:64px;}" +
        ".att-mob-status-pill.pill-p{background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;}" +
        ".att-mob-status-pill.pill-a{background:#fee2e2;color:#b91c1c;border:1px solid #fecaca;}" +
        /* Student yearly search & report styles */
        "#attMobSearchSection{display:block!important;}" +
        ".att-mob-search-section{margin:10px 0 14px;position:relative;width:100%;box-sizing:border-box;}" +
        ".att-mob-search-bar{display:flex;align-items:center;background:#fff;border:1.5px solid #cbd5e1;border-radius:12px;padding:0 12px;box-shadow:0 1px 3px rgba(0,0,0,0.04);}" +
        ".att-mob-search-bar i{color:#94a3b8;font-size:20px;margin-right:8px;flex-shrink:0;}" +
        ".att-mob-search-bar input{border:none!important;background:transparent!important;padding:10px 0!important;font-size:13.5px!important;font-weight:600!important;color:#1e293b!important;width:100%!important;outline:none!important;box-shadow:none!important;}" +
        ".att-mob-search-results{position:absolute;top:100%;left:0;right:0;z-index:999;background:#fff;border:1px solid #cbd5e1;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);max-height:260px;overflow-y:auto;margin-top:4px;}" +
        ".att-mob-sr-item{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #f1f5f9;cursor:pointer;}" +
        ".att-mob-sr-item:last-child{border-bottom:none;}" +
        ".att-mob-sr-item:active{background:#f8fafc;}" +
        ".att-mob-sr-name{font-weight:700;font-size:13.5px;color:#0f172a;}" +
        ".att-mob-sr-meta{font-size:11.5px;color:#64748b;margin-top:2px;}" +
        ".att-mob-sr-badge{font-size:11px;font-weight:700;background:#eff6ff;color:#1d4ed8;padding:3px 8px;border-radius:6px;white-space:nowrap;}" +
        ".att-yr-modal{max-width:480px;padding:18px;border-radius:18px;background:#fff;}" +
        ".att-yr-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #f1f5f9;}" +
      "}";
    document.head.appendChild(st);
  }

  injectMobileAttendanceStyles();
  if (isAttendanceEntry) injectAttendanceEntryCss();

  /* ---------------- markup ---------------- */
  function shell(mgmt) {
    return '' +
      '<div class="card wide-card" id="attendance-view">' +
        '<span class="eyebrow">Staff Portal</span><h2>' + (isAttendanceEntry ? 'Attendance Entry' : 'Daily Student Attendance') + '</h2>' +
        '<p class="view-description">' + (isAttendanceEntry ? '' : 'Manage daily classroom registers') + '</p>' +
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
      confirmModal() + resultModal() + studentYearlyModal();
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
      '<div class="att-entry-header"><div><div class="aeh-title">Attendance Entry</div></div><div class="att-entry-clock" id="attEntryClock">--:--</div></div>' +
      '' : '';
    return '<div class="att-admin-split" id="attAdminSplit">' +
      '<div>' + specialHead +
        '<div class="att-mob-search-section" id="attMobSearchSection">' +
          '<div class="att-mob-search-bar">' +
            '<i class="material-icons">search</i>' +
            '<input type="search" id="attMobYearlySearch" class="mob-search" placeholder="Search student yearly attendance…">' +
          '</div>' +
          '<div id="attMobYearlyResults" class="att-mob-search-results" style="display:none;"></div>' +
        '</div>' +
        '<div id="attClassListBox"><h3><i class="material-icons">fact_check</i> ' + (isAttendanceEntry ? "Today's Attendance Status" : 'Class Submission Summary') + '</h3><div id="attComplianceRows"></div></div>' +
      '</div>' +
      '<div>' +
        '<div id="attMobRosterNav" style="display:none;"></div>' +
        '<div id="attLoader" class="inline-loader" style="display:none;"><i class="material-icons">sync</i>Loading student entries…</div>' +
        '<div id="attEditWarning" class="alert-warning" style="display:none;"><i class="material-icons" style="color:#92400e;">warning</i><div><strong>Records Exist:</strong> Attendance is already saved for this selection. Saving will overwrite existing values.</div></div>' +
        '<div id="attAdminEmptyHint"><i class="material-icons">touch_app</i>Select a class and session above to enter attendance.</div>' +
        '<div id="attSelectedRegister" class="att-selected-register" style="display:none;">' +
          '<div class="asr-icon"><i class="material-icons">groups</i></div>' +
          '<div class="asr-main"><div class="asr-class" id="attSelectedClass">Class</div><div class="asr-session" id="attSelectedSession">Morning attendance</div></div>' +
          '<button type="button" class="asr-back" id="attBackToClasses"><i class="material-icons">arrow_upward</i> Classes</button>' +
        '</div>' +
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

  function studentYearlyModal() {
    return '<div class="modal-overlay" id="attYearlyModal"><div class="modal-content att-yr-modal">' +
      '<div class="att-yr-head">' +
        '<div><h3 id="attYrName" style="margin:0;font-size:16px;font-weight:900;color:var(--maroon);">Student Attendance</h3>' +
        '<div id="attYrMeta" style="font-size:11.5px;color:#64748b;margin-top:2px;">Academic Year Analysis</div></div>' +
        '<button type="button" class="modal-close-icon" id="attYrClose">&times;</button>' +
      '</div>' +
      '<div id="attYrBody" class="att-yr-body">' +
        '<div class="inline-loader"><i class="material-icons">sync</i>Compiling academic year attendance report…</div>' +
      '</div>' +
    '</div></div>';
  }

  var YEARLY_MATRIX_CACHE = {};
  var MONTH_NAMES = { "06": "June", "07": "July", "08": "August", "09": "September", "10": "October", "11": "November", "12": "December", "01": "January", "02": "February", "03": "March", "04": "April", "05": "May" };

  function openStudentYearlyReport(stud) {
    var modal = $("attYearlyModal");
    if (!modal) return;
    modal.classList.add("show");
    $("attYrName").textContent = stud.name || "Student Attendance";
    $("attYrMeta").textContent = "Class " + (stud.className || stud.class || "—") + " · ID: " + (stud.id || "—");
    var body = $("attYrBody");
    body.innerHTML = '<div class="inline-loader"><i class="material-icons">sync</i>Compiling academic year report…</div>';

    var today = todayIso();
    var curYear = parseInt(today.slice(0, 4), 10);
    var curMonth = parseInt(today.slice(5, 7), 10);
    var startYear = (curMonth >= 6) ? curYear : (curYear - 1);

    var monthsToQuery = [];
    var y = startYear, m = 6;
    while (true) {
      var mStr = y + "-" + String(m).padStart(2, "0");
      if (mStr > today.slice(0, 7)) break;
      monthsToQuery.push(mStr);
      if (m === curMonth && y === curYear) break;
      m++;
      if (m > 12) { m = 1; y++; }
      if (monthsToQuery.length >= 12) break;
    }

    var cls = stud.className || stud.class || "";
    if (!cls) {
      body.innerHTML = '<div class="att-empty"><i class="material-icons">info</i>No class found for this student.</div>';
      return;
    }

    var promises = monthsToQuery.map(function (mStr) {
      var key = cls + "_" + mStr;
      if (YEARLY_MATRIX_CACHE[key]) return Promise.resolve(YEARLY_MATRIX_CACHE[key]);
      return P.api("getMonthlyAttendanceMatrix", [cls, mStr], { overlay: false }).then(function (pl) {
        YEARLY_MATRIX_CACHE[key] = pl || {};
        return pl || {};
      }).catch(function () { return {}; });
    });

    Promise.all(promises).then(function (results) {
      var totalWorking = 0, totalPresent = 0, totalAbsent = 0;
      var monthlyBreakdown = [];

      results.forEach(function (pl, idx) {
        var mStr = monthsToQuery[idx];
        var mKey = mStr.slice(5, 7);
        var mLabel = (MONTH_NAMES[mKey] || mKey) + " " + mStr.slice(0, 4);

        var stRecord = ((pl.students || []).find(function (s) {
          return String(s.id).toLowerCase() === String(stud.id).toLowerCase() ||
                 String(s.name).toLowerCase() === String(stud.name).toLowerCase();
        }));

        var mDays = pl.days || [];
        var mPresent = 0, mAbsent = 0, mTotal = 0;

        if (stRecord && stRecord.attendance) {
          mDays.forEach(function (d) {
            var val = String(stRecord.attendance[d.date] || "").toUpperCase();
            if (val === "P") { mPresent++; mTotal++; }
            else if (val === "A") { mAbsent++; mTotal++; }
            else if (val === "M" || val === "N") { mPresent += 0.5; mAbsent += 0.5; mTotal++; }
          });
        }

        if (mTotal > 0) {
          totalWorking += mTotal;
          totalPresent += mPresent;
          totalAbsent += mAbsent;
          var mPct = Math.round((mPresent / mTotal) * 100);
          monthlyBreakdown.push({
            label: mLabel,
            present: mPresent,
            total: mTotal,
            pct: mPct
          });
        }
      });

      if (totalWorking === 0) {
        body.innerHTML = '<div class="att-empty"><i class="material-icons">event_busy</i>No monthly attendance records found for this student in the current academic year.</div>';
        return;
      }

      var overallPct = Math.round((totalPresent / totalWorking) * 100);
      var pctColor = overallPct >= 85 ? "#15803d" : (overallPct >= 75 ? "#0284c7" : (overallPct >= 65 ? "#b45309" : "#b91c1c"));
      var statusBadge = overallPct >= 85 ? "Excellent Standing" : (overallPct >= 75 ? "Good Standing" : "Attendance Shortage");

      var html =
        '<div class="att-yr-banner" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:12px;">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">' +
            '<span style="font-size:12px;font-weight:700;color:#64748b;">Academic Year ' + startYear + '–' + (startYear + 1) + '</span>' +
            '<span style="font-size:11px;font-weight:800;padding:3px 8px;border-radius:999px;background:' + (overallPct >= 75 ? '#dcfce7' : '#fee2e2') + ';color:' + pctColor + ';">' + statusBadge + '</span>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;text-align:center;">' +
            '<div style="background:#fff;padding:8px 4px;border-radius:8px;border:1px solid #e2e8f0;"><div style="font-size:15px;font-weight:900;color:#0f172a;">' + totalWorking + '</div><div style="font-size:9.5px;font-weight:700;color:#64748b;text-transform:uppercase;">Working</div></div>' +
            '<div style="background:#fff;padding:8px 4px;border-radius:8px;border:1px solid #bbf7d0;"><div style="font-size:15px;font-weight:900;color:#15803d;">' + totalPresent + '</div><div style="font-size:9.5px;font-weight:700;color:#15803d;text-transform:uppercase;">Present</div></div>' +
            '<div style="background:#fff;padding:8px 4px;border-radius:8px;border:1px solid #fecaca;"><div style="font-size:15px;font-weight:900;color:#b91c1c;">' + totalAbsent + '</div><div style="font-size:9.5px;font-weight:700;color:#b91c1c;text-transform:uppercase;">Absent</div></div>' +
            '<div style="background:#fff;padding:8px 4px;border-radius:8px;border:1px solid #bfdbfe;"><div style="font-size:15px;font-weight:900;color:' + pctColor + ';">' + overallPct + '%</div><div style="font-size:9.5px;font-weight:700;color:#64748b;text-transform:uppercase;">Rate</div></div>' +
          '</div>' +
        '</div>' +
        '<div style="font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">Month-by-Month Attendance</div>' +
        '<div style="display:flex;flex-direction:column;gap:8px;max-height:260px;overflow-y:auto;padding-right:2px;">';

      monthlyBreakdown.forEach(function (mb) {
        var mbColor = mb.pct >= 85 ? "#15803d" : (mb.pct >= 75 ? "#0284c7" : "#b45309");
        html +=
          '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:9px 12px;">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">' +
              '<span style="font-size:13px;font-weight:700;color:#0f172a;">' + esc(mb.label) + '</span>' +
              '<span style="font-size:12px;font-weight:800;color:' + mbColor + ';">' + mb.present + ' / ' + mb.total + ' days (' + mb.pct + '%)</span>' +
            '</div>' +
            '<div style="height:6px;background:#f1f5f9;border-radius:999px;overflow:hidden;">' +
              '<div style="height:100%;width:' + mb.pct + '%;background:' + mbColor + ';border-radius:999px;"></div>' +
            '</div>' +
          '</div>';
      });

      html += '</div>';
      body.innerHTML = html;
    }).catch(function (err) {
      body.innerHTML = '<div class="att-empty"><i class="material-icons">error_outline</i>' + esc(err.message || err) + '</div>';
    });
  }

  var yearlySearchTimer = null;
  function bindYearlySearch() {
    var inp = $("attMobYearlySearch");
    var resBox = $("attMobYearlyResults");
    if (!inp || !resBox) return;

    inp.addEventListener("input", function () {
      var q = inp.value.trim();
      clearTimeout(yearlySearchTimer);
      if (q.length < 2) {
        resBox.style.display = "none";
        resBox.innerHTML = "";
        return;
      }
      yearlySearchTimer = setTimeout(function () {
        resBox.innerHTML = '<div style="padding:10px;text-align:center;font-size:12px;color:#64748b;"><i class="material-icons" style="font-size:16px;vertical-align:-3px;">sync</i> Searching students…</div>';
        resBox.style.display = "block";
        P.api("smSearchStudents", [{ year: "ALL", cls: "All", status: "Active", query: q }], { overlay: false }).then(function (res) {
          var rows = res.rows || [];
          if (!rows.length) {
            resBox.innerHTML = '<div style="padding:10px;text-align:center;font-size:12px;color:#94a3b8;">No active students found.</div>';
            return;
          }
          resBox.innerHTML = rows.slice(0, 10).map(function (s) {
            return '<div class="att-mob-sr-item" data-id="' + esc(s.id) + '" data-name="' + esc(s.name) + '" data-class="' + esc(s.className || '') + '">' +
              '<div><div class="att-mob-sr-name">' + esc(s.name) + '</div>' +
              '<div class="att-mob-sr-meta">ID: ' + esc(s.id) + (s.rollNo ? (' · Roll: ' + esc(s.rollNo)) : '') + '</div></div>' +
              '<span class="att-mob-sr-badge">Class ' + esc(s.className || '—') + '</span>' +
            '</div>';
          }).join("");

          Array.prototype.forEach.call(resBox.querySelectorAll(".att-mob-sr-item"), function (item) {
            item.addEventListener("click", function () {
              resBox.style.display = "none";
              inp.value = "";
              openStudentYearlyReport({
                id: item.getAttribute("data-id"),
                name: item.getAttribute("data-name"),
                className: item.getAttribute("data-class")
              });
            });
          });
        }).catch(function () {
          resBox.innerHTML = '<div style="padding:10px;text-align:center;font-size:12px;color:#b91c1c;">Search failed.</div>';
        });
      }, 250);
    });

    document.addEventListener("click", function (e) {
      if (!inp.contains(e.target) && !resBox.contains(e.target)) {
        resBox.style.display = "none";
      }
    });

    var closeBtn = $("attYrClose");
    if (closeBtn) closeBtn.addEventListener("click", function () {
      var modal = $("attYearlyModal");
      if (modal) modal.classList.remove("show");
    });
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
    if ($("attConfirmSaveBtn")) $("attConfirmSaveBtn").addEventListener("click", executeSubmit);
    bindYearlySearch();
    if ($("attBackToClasses")) $("attBackToClasses").addEventListener("click", function () {
      hide("attStudentCard");
      hide("attSelectedRegister");
      show("attAdminEmptyHint");
      $("attAdminInlineSave").style.display = "none";
      var box = $("attClassListBox");
      if (box) box.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  function applyDateLock(mgmt) {
    var cell = $("attDateCell"), input = $("attDate"), stat = $("attDateStatic");
    input.setAttribute("max", attendanceToday);
    if (isAttendanceEntry) {
      cell.classList.add("locked"); input.style.display = "none"; stat.style.display = "block"; input.value = attendanceToday;
      stat.textContent = prettyDate(attendanceToday) + " (Today)";
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
    var date = $("attDate").value || attendanceToday;
    $("attDate").value = date;
    var campus = mgmt ? "" : (session.campus || "");
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
      $("attDate").value = attendanceToday;
      updateAttendanceEntryClock();
      if (isSunday(attendanceToday)) { applyDayBlock(true); return; }
    }
    if (date && date > attendanceToday) { $("attDate").value = attendanceToday; showResult(false, "Future date", "Attendance cannot be recorded for a future date. Reverted to today."); return; }
    setStatus("loading", "Refreshing…");
    P.api("getHolidaysForDate", [date], { text: "Checking day…" }).then(function (info) {
      holidayInfo = info || { perClass: {} };
      if (applyDayBlock(mgmt)) { setStatus("ready", "Blocked"); return; }
      if (mgmt) { hide("attStudentCard"); show("attAdminEmptyHint"); hide("attEditWarning"); $("attAdminInlineSave").style.display = "none"; P.api("getClassAttendanceSummary", [date], { text: "Loading summary…" }).then(function (s) { renderCompliance(s || []); setStatus("ready", "Ready"); }); }
      else { var cls = $("attClass").value; if (cls) fetchStudents(); else setStatus("ready", "Ready"); }
    });
  }
  function onClassChange() { var cls = $("attClass").value, date = $("attDate").value, session2 = $("attSession").value; if (cls && date && session2) { if (!applyDayBlock(false)) fetchStudents(); } }

  function isMobileLayout() {
    return (window.innerWidth || document.documentElement.clientWidth || 0) <= 900;
  }

  function renderCompliance(summary) {
    cachedSummary = summary ? summary.slice() : [];
    var box = $("attComplianceRows"); if (!box) return; box.innerHTML = "";
    var mP = 0, mT = 0, aP = 0, aT = 0, hol = (holidayInfo && holidayInfo.perClass) || {};
    var rows = summary.slice();
    if (isAttendanceEntry) rows = rows.filter(function (r) { return attendanceEntryClassAllowed(r.className); });
    var sortedRows = sortGrades(rows, function (r) { return r.className; });

    if (isMobileLayout()) {
      var gridHtml = '<div class="att-mob-class-grid">';
      sortedRows.forEach(function (row) {
        mT += row.morning.total; aT += row.afternoon.total;
        var h = hol[row.className] || hol["ALL"] || null, mB = !!(h && h.blocksMorning), aB = !!(h && h.blocksAfternoon), safe = esc(row.className);
        var total = row.morning.total || row.afternoon.total || 0;
        var mDone = row.morning.status === "Completed", aDone = row.afternoon.status === "Completed";
        if (mDone) mP += row.morning.present;
        if (aDone) aP += row.afternoon.present;
        var present = mDone ? row.morning.present : (aDone ? row.afternoon.present : 0);
        var absent = total > present ? (total - present) : 0;
        var hasData = mDone || aDone;
        var pct = (hasData && total > 0) ? Math.round((present / total) * 100) : null;

        var badgeClass = pct === null ? "pending" : "";
        var badgeText = pct === null ? "Pending" : (pct + "% Attendance");
        if (mB && aB) { badgeClass = "pending"; badgeText = "Holiday"; }

        var mBtnClass = mB ? "locked" : (mDone ? "done" : "pending");
        var mBtnText = mB ? "M: Holiday" : (mDone ? ("M: " + row.morning.present + "/" + row.morning.total) : "M: Pending");

        var aBtnClass = aB ? "locked" : (aDone ? "done" : "pending");
        var aBtnText = aB ? "A: Holiday" : (aDone ? ("A: " + row.afternoon.present + "/" + row.afternoon.total) : "A: Pending");

        gridHtml +=
          '<div class="att-mob-class-card" data-cls="' + safe + '">' +
            '<div class="att-mob-cc-top">' +
              '<div class="att-mob-cc-name">' + safe + '</div>' +
              '<div class="att-mob-cc-pct ' + badgeClass + '">' + badgeText + '</div>' +
            '</div>' +
            '<div class="att-mob-cc-stats">' +
              '<div class="att-mob-stat-col"><div class="att-mob-stat-val">' + total + '</div><div class="att-mob-stat-lbl">Students</div></div>' +
              '<div class="att-mob-stat-col"><div class="att-mob-stat-val" style="color:#15803d;">' + (hasData ? present : "-") + '</div><div class="att-mob-stat-lbl">Present</div></div>' +
              '<div class="att-mob-stat-col"><div class="att-mob-stat-val" style="color:#b91c1c;">' + (hasData ? absent : "-") + '</div><div class="att-mob-stat-lbl">Absent</div></div>' +
            '</div>' +
            '<div class="att-mob-cc-progress"><div class="att-mob-cc-bar" style="width:' + (pct != null ? pct : 0) + '%;' + (pct != null && pct < 85 ? 'background:#d97706;' : '') + '"></div></div>' +
            '<div class="att-mob-cc-foot">' +
              '<div class="att-mob-cc-sessions">' +
                '<button type="button" class="att-mob-sess-btn ' + mBtnClass + '" data-cls="' + safe + '" data-ses="Morning">' + mBtnText + '</button>' +
                '<button type="button" class="att-mob-sess-btn ' + aBtnClass + '" data-cls="' + safe + '" data-ses="Afternoon">' + aBtnText + '</button>' +
              '</div>' +
              '<span class="att-mob-cc-arrow">Roster <i class="material-icons" style="font-size:16px;">chevron_right</i></span>' +
            '</div>' +
          '</div>';
      });
      gridHtml += '</div>';
      gridHtml += '<div class="cls-total-card" style="margin-top:10px;"><div>TOTALS</div><div class="totals-pair"><span>M: ' + mP + ' / ' + mT + '</span><span>A: ' + aP + ' / ' + aT + '</span></div></div>';
      box.innerHTML = gridHtml;

      Array.prototype.forEach.call(box.querySelectorAll(".att-mob-class-card"), function (card) {
        card.addEventListener("click", function (e) {
          var btn = e.target.closest(".att-mob-sess-btn");
          var cls = card.getAttribute("data-cls");
          var ses = btn ? btn.getAttribute("data-ses") : "Morning";
          loadAdminClass(cls, ses);
        });
      });
      return;
    }

    /* Desktop View */
    sortedRows.forEach(function (row) {
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
    Array.prototype.forEach.call(box.querySelectorAll(".mini-pill[data-cls]"), function (b) { b.addEventListener("click", function () { loadAdminClass(b.getAttribute("data-cls"), b.getAttribute("data-ses")); }); });
  }

  function setSelectedRegister(className, sessionType) {
    if (!isAttendanceEntry) return;
    var wrap = $("attSelectedRegister"), cls = $("attSelectedClass"), ses = $("attSelectedSession");
    if (!wrap) return;
    if (cls) cls.textContent = className;
    if (ses) ses.textContent = sessionType + " attendance";
    wrap.style.display = "flex";
  }

  function renderMobileRosterNav(className, sessionType) {
    var nav = $("attMobRosterNav");
    if (!nav) return;
    var optionsHtml = "";
    sortGrades(cachedSummary.slice(), function (r) { return r.className; }).forEach(function (r) {
      optionsHtml += '<option value="' + esc(r.className) + '" ' + (r.className === className ? 'selected' : '') + '>' + esc(r.className) + '</option>';
    });

    nav.innerHTML =
      '<div class="att-mob-nav-bar">' +
        '<button type="button" class="att-mob-back-btn" id="attMobBackBtn"><i class="material-icons">arrow_back</i> All Classes</button>' +
        '<div class="att-mob-quick-selects">' +
          '<select id="attMobClassSwitcher" class="att-mob-quick-select mob-select">' + optionsHtml + '</select>' +
          '<select id="attMobSessionSwitcher" class="att-mob-quick-select mob-select">' +
            '<option value="Morning" ' + (sessionType === "Morning" ? 'selected' : '') + '>Morning</option>' +
            '<option value="Afternoon" ' + (sessionType === "Afternoon" ? 'selected' : '') + '>Afternoon</option>' +
          '</select>' +
        '</div>' +
      '</div>' +
      '<div class="att-mob-detail-header">' +
        '<div class="att-mob-dh-top">' +
          '<div class="att-mob-dh-class">' + esc(className) + '</div>' +
          '<div class="att-mob-dh-session">' + esc(sessionType) + ' Register</div>' +
        '</div>' +
        '<div class="att-mob-search-row">' +
          '<i class="material-icons">search</i>' +
          '<input type="search" id="attMobStudentSearch" class="att-mob-search-input mob-search" placeholder="Search student name or ID…" value="' + esc(mobSearchQuery) + '">' +
        '</div>' +
        '<div class="att-mob-filter-pills">' +
          '<button type="button" class="att-mob-pill ' + (mobFilterStatus === "all" ? "active" : "") + '" data-filter="all">All</button>' +
          '<button type="button" class="att-mob-pill ' + (mobFilterStatus === "P" ? "active" : "") + '" data-filter="P">Present</button>' +
          '<button type="button" class="att-mob-pill ' + (mobFilterStatus === "A" ? "active" : "") + '" data-filter="A">Absent</button>' +
        '</div>' +
      '</div>';
    nav.style.display = "block";

    $("attMobBackBtn").addEventListener("click", function () {
      hide("attMobRosterNav");
      hide("attStudentCard");
      hide("attSelectedRegister");
      hide("attLoader");
      hide("attEditWarning");
      var lb = $("attClassListBox");
      if (lb) lb.style.display = "";
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    $("attMobClassSwitcher").addEventListener("change", function () {
      loadAdminClass(this.value, att.session);
    });

    $("attMobSessionSwitcher").addEventListener("change", function () {
      loadAdminClass(att.className, this.value);
    });

    var sInput = $("attMobStudentSearch");
    sInput.addEventListener("input", function () {
      mobSearchQuery = this.value.trim();
      renderRosterList();
    });

    Array.prototype.forEach.call(nav.querySelectorAll(".att-mob-filter-pills .att-mob-pill"), function (pill) {
      pill.addEventListener("click", function () {
        Array.prototype.forEach.call(nav.querySelectorAll(".att-mob-filter-pills .att-mob-pill"), function (p) { p.classList.remove("active"); });
        pill.classList.add("active");
        mobFilterStatus = pill.getAttribute("data-filter") || "all";
        renderRosterList();
      });
    });
  }

  function loadAdminClass(className, sessionType) {
    var date = $("attDate").value;
    if (isAttendanceEntry) {
      if (!attendanceEntryClassAllowed(className)) return;
      if (isSunday(date)) { applyDayBlock(true); return; }
    }
    if (isSunday(date)) { applyDayBlock(true); return; }
    att.className = className; att.session = sessionType;

    if (isMobileLayout()) {
      var lb = $("attClassListBox");
      if (lb) lb.style.display = "none";
      renderMobileRosterNav(className, sessionType);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      var lbDesk = $("attClassListBox");
      if (lbDesk) lbDesk.style.display = "";
      hide("attMobRosterNav");
    }

    hide("attAdminEmptyHint"); show("attLoader"); hide("attStudentCard"); hide("attEditWarning"); $("attAdminInlineSave").style.display = "none";
    setSelectedRegister(className, sessionType);
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
  }

  function renderRosterList() {
    var list = att.roster;
    if (mobFilterStatus !== "all") {
      list = list.filter(function (s) { return s.status === mobFilterStatus; });
    }
    if (mobSearchQuery) {
      var q = mobSearchQuery.toLowerCase();
      list = list.filter(function (s) {
        return (s.name && s.name.toLowerCase().indexOf(q) >= 0) ||
               (s.id && String(s.id).toLowerCase().indexOf(q) >= 0);
      });
    }

    if (list.length === 0) {
      $("attStudentList").innerHTML = '<div class="att-empty" style="padding:24px 12px;"><i class="material-icons">search_off</i>No matching students found.</div>';
      return;
    }

    $("attStudentList").innerHTML = list.map(function (s) {
      var origIndex = att.roster.indexOf(s);
      return rowHtml(s, origIndex);
    }).join("");

    if (!P.isMobileAdmin(session)) {
      Array.prototype.forEach.call($("attStudentList").querySelectorAll(".pa-toggle button"), function (btn) {
        btn.addEventListener("click", function () {
          if (isAttendanceEntry && (!att.editable || att.frozen)) return;
          toggle(+btn.getAttribute("data-i"), btn.getAttribute("data-s"));
        });
      });
    }
  }

  function renderRoster() {
    var isReadOnlyMobile = P.isMobileAdmin(session);
    if (isAttendanceEntry) {
      hide("attEditWarning");
      var oldFreeze = $("attEntryFreezeNotice");
      if (oldFreeze) oldFreeze.remove();
      if (att.frozen || !att.editable) {
        var notice = document.createElement("div"); notice.id = "attEntryFreezeNotice"; notice.className = "att-entry-frozen";
        notice.innerHTML = '<i class="material-icons">lock</i>' + esc(att.reason || "This register is frozen and cannot be changed.");
        $("attStudentCard").insertBefore(notice, $("attStudentList"));
      }
    } else if (att.isEditMode) {
      show("attEditWarning", "flex");
    }

    var bulk = document.querySelector(".att-bulkbar");
    if (bulk) bulk.style.display = isReadOnlyMobile ? "none" : "";

    if (att.roster.length === 0) {
      $("attStudentList").innerHTML = '<div class="att-empty"><i class="material-icons">inbox</i>No student records found for this selection.</div>';
      show("attStudentCard");
      if (isMgmt) $("attAdminInlineSave").style.display = "none";
      else $("attFooter").classList.remove("show");
      updateCounts();
      return;
    }

    renderRosterList();
    show("attStudentCard");

    if (isReadOnlyMobile) {
      if ($("attAdminInlineSave")) $("attAdminInlineSave").style.display = "none";
      if ($("attFooter")) $("attFooter").classList.remove("show");
    } else if (isMgmt) {
      $("attAdminInlineSave").style.display = isAttendanceEntry && (!att.editable || att.frozen) ? "none" : "flex";
      if (isAttendanceEntry && (!att.editable || att.frozen)) $("attFooter").classList.remove("show");
    } else {
      $("attFooter").classList.add("show");
    }

    updateCounts();
  }

  function rowHtml(s, i) {
    var isP = s.status === "P";
    var isReadOnly = P.isMobileAdmin(session);
    var statusBadge = isReadOnly
      ? '<span class="att-mob-status-pill ' + (isP ? "pill-p" : "pill-a") + '">' + (isP ? "Present" : "Absent") + '</span>'
      : '<div class="pa-toggle" id="pa-' + i + '"><button type="button" class="' + (isP ? "on-p" : "") + '" data-i="' + i + '" data-s="P">P</button><button type="button" class="' + (!isP ? "on-a" : "") + '" data-i="' + i + '" data-s="A">A</button></div>';

    return '<div class="student-row-mobile" data-i="' + i + '">' +
      '<div class="student-info">' +
        '<span class="student-name">' + esc(s.name) + '</span>' +
        '<span class="student-id">ID: ' + esc(s.id) + '</span>' +
      '</div>' +
      statusBadge +
    '</div>';
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

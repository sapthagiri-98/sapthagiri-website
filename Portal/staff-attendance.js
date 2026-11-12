/* staff-attendance.js — Management Staff Attendance v5.
   Clickable monthly counters, employee/date drill-down, shift-aware manual corrections,
   manual punches, manual leave/duty, and biometric reset. */
(function () {
  "use strict";
  var P = window.Portal, session = P.Session.get();
  if (!session || session.role !== "Management") return;
  session = P.bootPage("stafftrack");
  if (!session) return;

  var esc = P.esc, prettyDate = P.prettyDate, monthLabel = P.monthLabel;
  var $ = function (id) { return document.getElementById(id); };
  var monthCache = {}, current = null, drillDate = "", editorLockedUser = false;
  var saSearchQuery = "";
  var cachedSummaryReport = [];
  var saMobileMode = "today";
  var saMobileDate = P.todayIso();
  var saTodayFilter = "all";
  var saTodaySearch = "";

  function isMobile() {
    return (window.innerWidth || document.documentElement.clientWidth || 0) <= 900;
  }

  function injectStaffAttendanceMobileStyles() {
    if (document.getElementById("sa-mob-redesign-css")) return;
    var st = document.createElement("style");
    st.id = "sa-mob-redesign-css";
    st.textContent =
      "@media(max-width:900px){" +
        "#saManual, .mod-toolbar{display:none!important;}" +
        ".sa-mob-mode-toggle{display:flex;background:#f1f5f9;border-radius:12px;padding:4px;gap:6px;width:100%;box-sizing:border-box;margin-bottom:12px;}" +
        ".sa-mob-mode-btn{flex:1;border:none;background:transparent;padding:9px 12px;border-radius:9px;font-weight:700;font-size:13px;color:#64748b;display:inline-flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;min-height:42px;}" +
        ".sa-mob-mode-btn.active{background:var(--maroon);color:#fff;box-shadow:0 1px 4px rgba(107,29,47,0.25);}" +
        ".sa-mob-mode-btn i{font-size:17px;}" +
        ".sa-today-header{display:flex;align-items:center;justify-content:space-between;gap:8px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:12px 14px;margin-bottom:12px;box-shadow:0 1px 3px rgba(15,23,42,0.03);}" +
        ".sa-today-day{font-size:15px;font-weight:900;color:#0f172a;}" +
        ".sa-today-sub{font-size:11px;font-weight:600;color:#64748b;margin-top:2px;}" +
        ".sa-today-picker{border:1px solid #cbd5e1;border-radius:9px;padding:6px 8px;font-size:12px;font-weight:700;color:#0f172a;background:#f8fafc;}" +
        ".sa-today-kpi-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-bottom:12px;}" +
        ".sa-today-kpi{background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;padding:9px 2px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.02);cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent;transition:all 0.15s ease;}" +
        ".sa-today-kpi:active{transform:scale(0.96);}" +
        ".sa-today-kpi.active{box-shadow:0 0 0 2.5px currentColor,0 3px 8px rgba(0,0,0,0.12)!important;font-weight:900;transform:translateY(-1px);}" +
        ".sa-today-kpi-val{font-size:16px;font-weight:900;line-height:1;}" +
        ".sa-today-kpi-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.3px;margin-top:3px;}" +
        ".sa-today-kpi.k-pres{color:#047857;border-color:#bbf7d0;}" +
        ".sa-today-kpi.k-late{color:#b45309;border-color:#fde68a;}" +
        ".sa-today-kpi.k-half{color:#7c3aed;border-color:#ddd6fe;}" +
        ".sa-today-kpi.k-abse{color:#b91c1c;border-color:#fecaca;}" +
        ".sa-today-kpi.k-leav{color:#0369a1;border-color:#bae6fd;}" +
        ".sa-today-card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:12px 14px;margin-bottom:8px;box-shadow:0 1px 3px rgba(0,0,0,0.03);cursor:pointer;}" +
        ".sa-today-card:active{background:#f8fafc;}" +
        ".sa-today-card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px;}" +
        ".sa-today-name{font-size:14.5px;font-weight:800;color:#0f172a;}" +
        ".sa-today-role{font-size:11.5px;color:#64748b;margin-top:2px;}" +
        ".sa-today-times{font-size:12px;font-weight:600;color:#334155;display:flex;align-items:center;gap:6px;margin-top:4px;}" +
        ".sa-today-times i{font-size:14px;color:var(--maroon);}" +
        ".sa-mob-month-nav{display:flex;align-items:center;justify-content:space-between;gap:8px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:8px 10px;margin-bottom:12px;box-shadow:0 1px 3px rgba(15,23,42,0.03);}" +
        ".sa-mob-step-btn{width:38px;height:38px;border-radius:10px;border:1px solid #cbd5e1;background:#f8fafc;font-size:20px;font-weight:800;color:#0f172a;display:grid;place-items:center;cursor:pointer;flex:0 0 auto;}" +
        ".sa-mob-month-center{display:flex;align-items:center;gap:6px;flex:1;justify-content:center;}" +
        ".sa-mob-month-center input[type='month']{border:1px solid #cbd5e1;border-radius:9px;padding:6px 10px;font-size:13px;font-weight:800;color:#0f172a;background:#fff;}" +
        ".sa-cal-toggle{display:flex;align-items:center;justify-content:space-between;width:100%;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px 14px;font-size:12.5px;font-weight:700;color:#475569;cursor:pointer;margin-bottom:10px;}" +
        ".sa-cal-collapsible{display:none;margin-bottom:14px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:10px;}" +
        ".sa-cal-collapsible.open{display:block;}" +
        ".sa-mob-search-input{width:100%!important;height:38px!important;padding:6px 10px 6px 34px!important;border:1px solid #cbd5e1!important;border-radius:9px!important;font-size:13px!important;box-sizing:border-box!important;background:#fff!important;pointer-events:auto!important;user-select:text!important;}" +
        ".sa-mob-list{display:flex;flex-direction:column;gap:10px;margin-top:10px;}" +
        ".sa-mob-card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:12px 14px;box-shadow:0 1px 4px rgba(15,23,42,0.03);cursor:pointer;touch-action:manipulation;transition:transform 0.1s;}" +
        ".sa-mob-card:active{background:#f8fafc;transform:scale(0.99);}" +
        ".sa-mob-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px;}" +
        ".sa-mob-card-name{font-size:15px;font-weight:900;color:#0f172a;letter-spacing:-0.01em;}" +
        ".sa-mob-card-role{font-size:11px;font-weight:600;color:#64748b;margin-top:2px;}" +
        ".sa-mob-metrics{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;background:#f8fafc;padding:7px 5px;border-radius:10px;text-align:center;}" +
        ".sa-mob-m-col{padding:3px 2px;border-radius:6px;cursor:pointer;}" +
        ".sa-mob-m-val{font-size:14px;font-weight:900;line-height:1.2;font-variant-numeric:tabular-nums;}" +
        ".sa-mob-m-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.02em;margin-top:2px;}" +
        ".sa-mob-m-col.m-pres{color:#15803d;}" +
        ".sa-mob-m-col.m-late{color:#b45309;}" +
        ".sa-mob-m-col.m-half{color:#6b21a8;}" +
        ".sa-mob-m-col.m-abse{color:#b91c1c;}" +
        ".sa-mob-m-col.m-leav{color:#7a151a;}" +
        ".sa-emp-cat-tabs{display:flex;gap:5px;overflow-x:auto;padding-bottom:6px;margin-bottom:12px;}" +
        ".sa-emp-cat-tab{padding:5px 10px;border-radius:999px;border:1px solid #cbd5e1;background:#fff;font-size:11.5px;font-weight:700;color:#475569;white-space:nowrap;cursor:pointer;}" +
        ".sa-emp-cat-tab.active{background:#7a151a;color:#fff;border-color:#7a151a;}" +
      "}" +
      "@media(min-width:901px){" +
        ".sa-mob-mode-toggle,#saMobTodaySection{display:none!important;}" +
        ".sa-mob-month-nav,.sa-cal-toggle,#saMobSearchWrap{display:none!important;}" +
        ".sa-cal-collapsible{display:block!important;}" +
      "}";
    document.head.appendChild(st);
  }
  injectStaffAttendanceMobileStyles();

  $("view").innerHTML = shell();
  bind();
  monthCache = {};
  try { if (P.Cache && P.Cache.remove) P.Cache.remove("staffmon_" + P.thisMonth()); } catch (e) {}
  loadMonth(P.thisMonth(), true);

  function shell() {
    return '' +
    '<div class="card wide-card">' +
      '<div class="mod-head"><div><span class="eyebrow">Management</span>' +
        '<h2 style="margin-bottom:4px;">Staff Attendance</h2>' +
        '<p class="view-description" style="margin:0;">Biometric attendance with manual correction and employee-level drill-down.</p></div>' +
        '<button class="btn btn-maroon" id="saManual" style="width:auto;padding:10px 16px;"><i class="material-icons" style="color:#fff;">edit_calendar</i> Manual Entry</button>' +
      '</div>' +
      '<div class="sa-mob-mode-toggle" id="saMobModeToggle">' +
        '<button type="button" class="sa-mob-mode-btn ' + (saMobileMode === "today" ? "active" : "") + '" id="saMobBtnToday" data-mode="today"><i class="material-icons">today</i> Today\'s Status</button>' +
        '<button type="button" class="sa-mob-mode-btn ' + (saMobileMode === "month" ? "active" : "") + '" id="saMobBtnMonth" data-mode="month"><i class="material-icons">date_range</i> Monthly View</button>' +
      '</div>' +
      '<div id="saMobTodaySection" style="' + (saMobileMode === "today" ? "display:block;" : "display:none;") + '"></div>' +
      '<div id="saMobMonthSection" style="' + (saMobileMode === "month" ? "display:block;" : "display:none;") + '">' +
        '<div class="sa-mob-month-nav">' +
          '<button type="button" class="sa-mob-step-btn" id="saPrevMonth" aria-label="Previous Month">‹</button>' +
          '<div class="sa-mob-month-center">' +
            '<i class="material-icons" style="color:var(--maroon);font-size:18px;">calendar_month</i>' +
            '<input type="month" id="saMobMonth" class="mob-interactive">' +
          '</div>' +
          '<button type="button" class="sa-mob-step-btn" id="saNextMonth" aria-label="Next Month">›</button>' +
          '<button type="button" class="sa-mob-step-btn" id="saMobRefresh" title="Refresh biometric" style="margin-left:2px;"><i class="material-icons" style="font-size:18px;">refresh</i></button>' +
        '</div>' +
        '<div class="mod-toolbar">' +
          '<div class="smart-selector"><div class="ss-icon"><i class="material-icons">calendar_month</i></div>' +
            '<div class="ss-body"><div class="ss-label">Month</div><input type="month" id="saMonth"></div></div>' +
          '<button class="refresh-btn" id="saRefresh"><i class="material-icons" style="font-size:16px;">refresh</i> Refresh Biometric</button>' +
        '</div>' +
        '<div class="timing-line" id="saTiming"></div>' +
        '<button type="button" class="sa-cal-toggle" id="saCalToggle">' +
          '<span><i class="material-icons" style="font-size:16px;vertical-align:middle;margin-right:6px;">calendar_today</i> View Calendar / Select Date</span>' +
          '<i class="material-icons" id="saCalArrow" style="font-size:18px;">expand_more</i>' +
        '</button>' +
        '<div id="saCalWrap" class="sa-cal-collapsible">' +
          '<div class="legend"><span class="lg"><span class="dot d-green"></span>Present</span><span class="lg"><span class="dot d-orange"></span>Late</span><span class="lg"><span class="dot d-purple"></span>Half day</span><span class="lg"><span class="dot d-red"></span>Absent</span><span class="lg"><span class="dot d-blue"></span>Manual leave</span><span class="lg" style="color:var(--text-muted);">Click a date to inspect.</span></div>' +
          '<div class="cal-head"><div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div></div>' +
          '<div class="cal-grid" id="saGrid"></div>' +
        '</div>' +
        '<div class="group-head" style="margin-top:20px;"><i class="material-icons" style="font-size:18px;">summarize</i> Monthly Attendance Summary</div>' +
        '<div id="saMobSearchWrap" style="margin:10px 0;">' +
          '<div style="position:relative;">' +
            '<i class="material-icons" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:18px;pointer-events:none;">search</i>' +
            '<input type="search" id="saStaffSearch" class="sa-mob-search-input mob-search" placeholder="Search staff member…">' +
          '</div>' +
        '</div>' +
        '<div id="saSummary"></div>' +
      '</div>' +
    '</div>' + dayModal() + employeeModal() + editModal();
  }

  function dayModal() {
    return '<div class="modal-overlay" id="saDayModal"><div class="modal-content" style="max-width:700px;">' +
      '<div class="modal-header-container"><h3 id="saDayTitle">Staff on this day</h3><button class="modal-close-icon" data-close="saDayModal">&times;</button></div>' +
      '<div class="day-drill-tabs" id="saDayTabs"></div><div id="saDayBody"></div>' +
      '<button class="btn btn-secondary" data-close="saDayModal" style="margin-top:16px;">Close</button></div></div>';
  }

  function employeeModal() {
    return '<div class="modal-overlay" id="saEmployeeModal"><div class="modal-content" style="max-width:820px;">' +
      '<div class="modal-header-container"><h3 id="saEmployeeTitle">Attendance details</h3><button class="modal-close-icon" data-close="saEmployeeModal">&times;</button></div>' +
      '<div id="saEmployeeBody"></div>' +
      '<button class="btn btn-secondary" data-close="saEmployeeModal" style="margin-top:16px;">Close</button></div></div>';
  }

  function editModal() {
    return '<div class="modal-overlay" id="saEditModal"><div class="modal-content" style="max-width:600px;">' +
      '<div class="modal-header-container"><h3 id="saEditTitle">Manual Attendance Entry</h3><button class="modal-close-icon" data-close="saEditModal">&times;</button></div>' +
      '<input type="hidden" id="saEditId"><input type="hidden" id="saEditShiftType">' +
      '<div id="saEditEmployeePicker" class="form-group"><label>Employee</label><select id="saEditUser"></select></div>' +
      '<div id="saEditEmployeeFixed" style="display:none;margin-bottom:14px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:10px;background:#fafafa;"><div style="font-size:11px;text-transform:uppercase;font-weight:700;color:var(--text-muted);">Employee</div><div id="saEditEmployeeName" style="font-size:15px;font-weight:800;margin-top:3px;"></div></div>' +
      '<div id="saShiftInfo" style="font-size:13px;color:var(--text-muted);margin:-4px 0 14px;"></div>' +
      '<div class="form-group"><label>Date</label><input type="date" id="saEditDate"></div>' +
      '<div class="form-group"><label>Correction</label><select id="saEditType"><option value="PUNCH">Manual Attendance</option><option value="LEAVE">Leave</option><option value="DUTY">Official Duty / Continuous Duty</option></select></div>' +
      '<div id="saSingleFields">' +
        '<div style="display:flex;gap:10px;"><div class="form-group" style="flex:1;"><label>In time</label><input type="time" id="saSingleIn"></div>' +
        '<div class="form-group" style="flex:1;"><label>Out time</label><input type="time" id="saSingleOut"></div></div>' +
      '</div>' +
      '<div id="saDualFields" style="display:none;">' +
        '<div style="font-size:12px;font-weight:700;color:var(--maroon);margin:4px 0 6px;">Morning session</div>' +
        '<div style="display:flex;gap:10px;"><div class="form-group" style="flex:1;"><label>In</label><input type="time" id="saMorningIn"></div><div class="form-group" style="flex:1;"><label>Out</label><input type="time" id="saMorningOut"></div></div>' +
        '<div style="font-size:12px;font-weight:700;color:var(--maroon);margin:4px 0 6px;">Afternoon session</div>' +
        '<div style="display:flex;gap:10px;"><div class="form-group" style="flex:1;"><label>In</label><input type="time" id="saAfternoonIn"></div><div class="form-group" style="flex:1;"><label>Out</label><input type="time" id="saAfternoonOut"></div></div>' +
      '</div>' +
      '<div id="saStatusFields" style="display:none;"><div class="form-group"><label>Status</label><select id="saEditStatus"><option value="Leave">Leave</option><option value="Present">Present</option><option value="Half Day">Half Day</option><option value="Absent">Absent</option></select></div></div>' +
      '<div class="form-group"><label>Reason / note</label><textarea id="saEditReason" rows="3" placeholder="Biometric failure, school work, approved leave, etc."></textarea></div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">' +
        '<button class="btn btn-secondary" id="saResetDay" style="width:auto;">Reset to Biometric</button>' +
        '<button class="btn btn-secondary" data-close="saEditModal" style="width:auto;">Cancel</button>' +
        '<button class="btn btn-maroon" id="saEditSave" style="width:auto;"><i class="material-icons" style="color:#fff;">save</i> Save</button>' +
      '</div>' +
      '<p style="font-size:12px;color:var(--text-muted);margin-top:12px;">Manual corrections are stored separately. Reset removes the correction and restores the biometric result.</p>' +
    '</div></div>';
  }

  function bind() {
    var m = $("saMonth"), mobM = $("saMobMonth");
    if (m) m.value = P.thisMonth();
    if (mobM) mobM.value = P.thisMonth();
    if (m) m.addEventListener("change", function () {
      if (mobM) mobM.value = m.value;
      loadMonth(m.value, false);
    });
    if (mobM) mobM.addEventListener("change", function () {
      if (m) m.value = mobM.value;
      loadMonth(mobM.value, false);
    });

    function shiftMonth(delta) {
      var cur = (m && m.value) || (mobM && mobM.value) || P.thisMonth();
      var parts = cur.split("-");
      var y = parseInt(parts[0], 10), mo = parseInt(parts[1], 10);
      mo += delta;
      if (mo > 12) { mo = 1; y++; }
      else if (mo < 1) { mo = 12; y--; }
      var next = y + "-" + String(mo).padStart(2, "0");
      if (m) m.value = next;
      if (mobM) mobM.value = next;
      loadMonth(next, false);
    }

    var btnToday = $("saMobBtnToday"), btnMonth = $("saMobBtnMonth");
    if (btnToday && btnMonth) {
      btnToday.onclick = function() {
        saMobileMode = "today";
        btnToday.classList.add("active");
        btnMonth.classList.remove("active");
        if ($("saMobTodaySection")) $("saMobTodaySection").style.display = "block";
        if ($("saMobMonthSection")) $("saMobMonthSection").style.display = "none";
        renderTodayView();
      };
      btnMonth.onclick = function() {
        saMobileMode = "month";
        btnMonth.classList.add("active");
        btnToday.classList.remove("active");
        if ($("saMobTodaySection")) $("saMobTodaySection").style.display = "none";
        if ($("saMobMonthSection")) $("saMobMonthSection").style.display = "block";
      };
    }

    if ($("saPrevMonth")) $("saPrevMonth").addEventListener("click", function () { shiftMonth(-1); });
    if ($("saNextMonth")) $("saNextMonth").addEventListener("click", function () { shiftMonth(1); });
    if ($("saMobRefresh")) $("saMobRefresh").addEventListener("click", function () { loadMonth($("saMonth").value, true); });
    if ($("saRefresh")) $("saRefresh").addEventListener("click", function () { loadMonth($("saMonth").value, true); });

    if ($("saCalToggle")) $("saCalToggle").addEventListener("click", function () {
      var wrap = $("saCalWrap");
      if (wrap) {
        wrap.classList.toggle("open");
        var arr = $("saCalArrow");
        if (arr) arr.textContent = wrap.classList.contains("open") ? "expand_less" : "expand_more";
      }
    });

    if ($("saStaffSearch")) $("saStaffSearch").addEventListener("input", function () {
      saSearchQuery = this.value.trim().toLowerCase();
      renderSummaryList();
    });

    $("saManual").addEventListener("click", function () {
      if (P.isMobileAdmin(session)) return;
      openEditor();
    });
    $("saEditType").addEventListener("change", toggleEditFields);
    $("saEditUser").addEventListener("change", function () { updateEditorForUser(Number($("saEditUser").value)); });
    $("saEditSave").addEventListener("click", saveEdit);
    $("saResetDay").addEventListener("click", resetDay);
    Array.prototype.forEach.call(document.querySelectorAll("[data-close]"), function (b) { b.addEventListener("click", function () { P.closeModal(b.getAttribute("data-close")); }); });
    Array.prototype.forEach.call(document.querySelectorAll(".modal-overlay"), function (mm) { mm.addEventListener("click", function (e) { if (e.target === mm) P.closeModal(mm.id); }); });
  }

  function loadMonth(month, force, afterLoad) {
    var key = "staffmon_" + month, t0 = performance.now();
    var m = $("saMonth"), mobM = $("saMobMonth");
    if (m && m.value !== month) m.value = month;
    if (mobM && mobM.value !== month) mobM.value = month;
    if (!force) {
      var mem = monthCache[month] || P.Cache.get(key);
      if (mem) { var ms = Math.round(performance.now() - t0); P.perf.record("Load Staff Month", ms, "warm"); showTiming(ms, "warm"); current = mem; render(mem, month); monthCache[month] = mem; if (afterLoad) afterLoad(); return; }
    }
    $("saGrid").innerHTML = '<div class="inline-loader" style="grid-column:span 7;"><i class="material-icons">sync</i>Reading biometric records and manual corrections…</div>';
    $("saSummary").innerHTML = "";
    P.api("getManagementMonthlyBulkPayload", [month], { text: "Loading staff attendance…" }).then(function (res) {
      var ms = Math.round(performance.now() - t0); P.perf.record("Load Staff Month", ms, "cold"); showTiming(ms, "cold");
      if (!res || !res.success) { $("saGrid").innerHTML = '<div class="att-empty" style="grid-column:span 7;"><i class="material-icons">error_outline</i>' + esc((res && res.error) || "Could not load records.") + '</div>'; return; }
      current = res; monthCache[month] = res; P.Cache.set(key, res, P.CONFIG.MONTH_TTL_MS); render(res, month); if (afterLoad) afterLoad();
    }).catch(function (e) { $("saGrid").innerHTML = '<div class="att-empty" style="grid-column:span 7;"><i class="material-icons">error_outline</i>' + esc(e.message || e) + '</div>'; });
  }

  function showTiming(ms, mode) { var base = P.perf.baseline["Load Staff Month"], el = $("saTiming"); if (mode === "warm" && base) el.innerHTML = "⚡ Loaded from cache in <b>" + ms + " ms</b> — first load was " + base + " ms."; else el.innerHTML = "⏱ Loaded in " + ms + " ms."; }

  function render(res, month) {
    var map = res.calendarMap || {}, keys = Object.keys(map).sort(), grid = $("saGrid");
    if (!keys.length) grid.innerHTML = '<div class="att-empty" style="grid-column:span 7;"><i class="material-icons">inbox</i>No records for ' + esc(monthLabel(month)) + '.</div>';
    else {
      var pad = new Date(keys[0] + "T00:00:00").getDay(), html = "";
      for (var i = 0; i < pad; i++) html += '<div class="cal-day empty"></div>';
      keys.forEach(function (k) {
        var d = map[k], p = (d.Present || []).length, l = (d.Late || []).length, h = (d.HalfDay || []).length, a = (d.Absent || []).length, lv = (d.Leave || []).length, mini = "";
        if (p) mini += '<span class="m-p">P ' + p + '</span>'; if (l) mini += '<span class="m-l">L ' + l + '</span>'; if (h) mini += '<span class="m-h">H ' + h + '</span>'; if (a) mini += '<span class="m-a">A ' + a + '</span>'; if (lv) mini += '<span class="m-p">V ' + lv + '</span>';
        html += '<div class="cal-day" data-day="' + k + '"><div class="dnum">' + (+k.split("-")[2]) + '</div><div class="mini">' + mini + '</div></div>';
      });
      grid.innerHTML = html;
      Array.prototype.forEach.call(grid.querySelectorAll(".cal-day[data-day]"), function (c) { c.addEventListener("click", function () { openDay(c.getAttribute("data-day")); }); });
    }
    renderSummary(res.summaryReport || []);
    if (isMobile()) {
      renderTodayView();
    }
  }

  function renderTodayView() {
    var host = $("saMobTodaySection");
    if (!host) return;

    var dayKey = saMobileDate || P.todayIso();
    var dayData = (current && current.calendarMap && current.calendarMap[dayKey]) || {};
    var pres = dayData.Present || [];
    var late = dayData.Late || [];
    var half = dayData.HalfDay || [];
    var abse = dayData.Absent || [];
    var leav = dayData.Leave || [];

    var allStaff = [];
    pres.forEach(function(r) { allStaff.push(Object.assign({}, r, { _cat: "Present", _label: "Present" })); });
    late.forEach(function(r) { allStaff.push(Object.assign({}, r, { _cat: "Late", _label: "Late" + (r.lateBy ? (" (" + r.lateBy + ")") : "") })); });
    half.forEach(function(r) { allStaff.push(Object.assign({}, r, { _cat: "HalfDay", _label: "Half Day" })); });
    leav.forEach(function(r) { allStaff.push(Object.assign({}, r, { _cat: "Leave", _label: "On Leave" + (r.reason ? (" - " + r.reason) : "") })); });
    abse.forEach(function(r) { allStaff.push(Object.assign({}, r, { _cat: "Absent", _label: "Absent" })); });

    allStaff.sort(function(a, b) { return String(a.name).localeCompare(String(b.name)); });

    host.innerHTML =
      '<div class="sa-today-header">' +
        '<div>' +
          '<div class="sa-today-day">Biometric Punch Status</div>' +
          '<div class="sa-today-sub">Live daily records</div>' +
        '</div>' +
        '<input type="date" id="saTodayPicker" value="' + esc(dayKey) + '" class="mob-interactive sa-today-picker">' +
      '</div>' +
      '<div class="sa-today-kpi-grid">' +
        '<div class="sa-today-kpi k-pres ' + (saTodayFilter === "Present" ? "active" : "") + '" data-cat="Present"><div class="sa-today-kpi-val">' + pres.length + '</div><div class="sa-today-kpi-lbl">Present</div></div>' +
        '<div class="sa-today-kpi k-late ' + (saTodayFilter === "Late" ? "active" : "") + '" data-cat="Late"><div class="sa-today-kpi-val">' + late.length + '</div><div class="sa-today-kpi-lbl">Late</div></div>' +
        '<div class="sa-today-kpi k-half ' + (saTodayFilter === "HalfDay" ? "active" : "") + '" data-cat="HalfDay"><div class="sa-today-kpi-val">' + half.length + '</div><div class="sa-today-kpi-lbl">Half</div></div>' +
        '<div class="sa-today-kpi k-abse ' + (saTodayFilter === "Absent" ? "active" : "") + '" data-cat="Absent"><div class="sa-today-kpi-val">' + abse.length + '</div><div class="sa-today-kpi-lbl">Absent</div></div>' +
        '<div class="sa-today-kpi k-leav ' + (saTodayFilter === "Leave" ? "active" : "") + '" data-cat="Leave"><div class="sa-today-kpi-val">' + leav.length + '</div><div class="sa-today-kpi-lbl">Leave</div></div>' +
      '</div>' +
      (saTodayFilter !== "all" ?
        ('<div style="display:flex;align-items:center;justify-content:space-between;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:6px 12px;margin-bottom:10px;font-size:12px;font-weight:700;">' +
          '<span>Filtering: <b style="color:var(--maroon);">' + (saTodayFilter === "HalfDay" ? "Half Day" : saTodayFilter) + '</b></span>' +
          '<button type="button" id="saClearTodayFilter" style="border:none;background:none;color:#64748b;font-weight:700;font-size:11.5px;cursor:pointer;text-decoration:underline;">Show all (' + allStaff.length + ')</button>' +
        '</div>') : '') +
      '<div style="position:relative;margin-bottom:10px;">' +
        '<i class="material-icons" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:18px;pointer-events:none;">search</i>' +
        '<input type="search" id="saTodaySearchInput" class="sa-mob-search-input mob-search" placeholder="Search staff member today…" value="' + esc(saTodaySearch) + '">' +
      '</div>' +
      '<div id="saTodayCardsList"></div>';

    var picker = $("saTodayPicker");
    if (picker) {
      picker.onchange = function() {
        saMobileDate = this.value;
        var selMonth = this.value ? this.value.substring(0, 7) : "";
        var curMonth = $("saMonth") ? $("saMonth").value : P.thisMonth();
        if (selMonth && selMonth !== curMonth) {
          loadMonth(selMonth, false, function() {
            renderTodayView();
          });
        } else {
          renderTodayView();
        }
      };
    }
    var sInp = $("saTodaySearchInput");
    if (sInp) {
      sInp.oninput = function() {
        saTodaySearch = this.value.trim().toLowerCase();
        renderTodayCardsOnly();
      };
    }
    Array.prototype.forEach.call(host.querySelectorAll(".sa-today-kpi[data-cat]"), function(kpi) {
      kpi.onclick = function() {
        var cat = kpi.getAttribute("data-cat");
        saTodayFilter = (saTodayFilter === cat) ? "all" : cat;
        renderTodayView();
      };
    });
    var clearBtn = $("saClearTodayFilter");
    if (clearBtn) {
      clearBtn.onclick = function() {
        saTodayFilter = "all";
        renderTodayView();
      };
    }

    renderTodayCardsOnly();
  }

  function renderTodayCardsOnly() {
    var listHost = $("saTodayCardsList");
    if (!listHost) return;
    var dayKey = saMobileDate || P.todayIso();
    var dayData = (current && current.calendarMap && current.calendarMap[dayKey]) || {};
    var pres = dayData.Present || [];
    var late = dayData.Late || [];
    var half = dayData.HalfDay || [];
    var abse = dayData.Absent || [];
    var leav = dayData.Leave || [];

    var allStaff = [];
    pres.forEach(function(r) { allStaff.push(Object.assign({}, r, { _cat: "Present", _label: "Present" })); });
    late.forEach(function(r) { allStaff.push(Object.assign({}, r, { _cat: "Late", _label: "Late" + (r.lateBy ? (" (" + r.lateBy + ")") : "") })); });
    half.forEach(function(r) { allStaff.push(Object.assign({}, r, { _cat: "HalfDay", _label: "Half Day" })); });
    leav.forEach(function(r) { allStaff.push(Object.assign({}, r, { _cat: "Leave", _label: "On Leave" + (r.reason ? (" - " + r.reason) : "") })); });
    abse.forEach(function(r) { allStaff.push(Object.assign({}, r, { _cat: "Absent", _label: "Absent" })); });

    allStaff.sort(function(a, b) { return String(a.name).localeCompare(String(b.name)); });

    var filtered = allStaff;
    if (saTodayFilter !== "all") {
      filtered = filtered.filter(function(r) { return r._cat === saTodayFilter; });
    }
    if (saTodaySearch) {
      filtered = filtered.filter(function(r) {
        return (r.name && r.name.toLowerCase().indexOf(saTodaySearch) >= 0) ||
               (r.designation && r.designation.toLowerCase().indexOf(saTodaySearch) >= 0);
      });
    }

    if (!filtered.length) {
      listHost.innerHTML = '<div class="slip-empty" style="padding:24px;text-align:center;"><i class="material-icons" style="font-size:28px;color:#94a3b8;display:block;margin-bottom:6px;">search_off</i>No staff members match this filter for today.</div>';
      return;
    }

    listHost.innerHTML = filtered.map(function(r) {
      var statusColor = { "Present": "#047857", "Late": "#b45309", "HalfDay": "#6b21a8", "Absent": "#b91c1c", "Leave": "#0284c7" }[r._cat] || "#475569";
      var statusBg = { "Present": "#ecfdf5", "Late": "#fffbeb", "HalfDay": "#f5f3ff", "Absent": "#fef2f2", "Leave": "#f0f9ff" }[r._cat] || "#f1f5f9";
      var dual = String(r.shiftType || "").toUpperCase() === "DUAL";
      var timesStr = "";
      if (r._cat === "Absent") {
        timesStr = '<span style="color:#94a3b8;font-style:italic;">No punch recorded</span>';
      } else if (dual) {
        timesStr = '<span>In1: <b>' + esc(r.in1 || "—") + '</b> · Out1: <b>' + esc(r.out1 || "—") + '</b>' + (r.in2 ? (' · In2: <b>' + esc(r.in2) + '</b>') : '') + '</span>';
      } else {
        timesStr = '<span>In: <b>' + esc(r.in1 || "—") + '</b> · Out: <b>' + esc(r.out1 || "—") + '</b></span>';
      }

      return '<div class="sa-today-card" data-user="' + esc(r.userId) + '" data-name="' + esc(r.name) + '">' +
        '<div class="sa-today-card-head">' +
          '<div>' +
            '<div class="sa-today-name">' + esc(r.name) + '</div>' +
            '<div class="sa-today-role">' + esc(r.designation || "Staff Member") + '</div>' +
          '</div>' +
          '<span style="display:inline-block;padding:4px 9px;border-radius:999px;font-size:11px;font-weight:800;color:' + statusColor + ';background:' + statusBg + ';">' + esc(r._label) + '</span>' +
        '</div>' +
        '<div class="sa-today-times">' +
          '<i class="material-icons">schedule</i>' + timesStr +
        '</div>' +
      '</div>';
    }).join("");

    wireTodayCardClicks();
  }

  function wireTodayCardClicks() {
    Array.prototype.forEach.call(document.querySelectorAll(".sa-today-card[data-user]"), function(card) {
      card.onclick = function() {
        var uid = Number(card.getAttribute("data-user"));
        var name = card.getAttribute("data-name");
        openEmployee(uid, "All", name);
      };
    });
  }

  function renderSummary(rep) {
    cachedSummaryReport = rep ? rep.slice() : [];
    renderSummaryList();
  }

  function renderSummaryList() {
    var host = $("saSummary");
    if (!host) return;
    var list = cachedSummaryReport.slice().sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
    if (saSearchQuery) {
      list = list.filter(function (r) {
        return (r.name && r.name.toLowerCase().indexOf(saSearchQuery) >= 0) ||
               (r.designation && r.designation.toLowerCase().indexOf(saSearchQuery) >= 0);
      });
    }

    if (!list.length) {
      host.innerHTML = '<div class="slip-empty">No staff records match your criteria.</div>';
      return;
    }

    if (isMobile()) {
      var cardsHtml = '<div class="sa-mob-list">';
      list.forEach(function (r) {
        var safeName = esc(r.name);
        var safeRole = esc(r.designation || "Staff Member");
        var uid = r.userId || "";
        var totalLeaves = Number(r.totalLeaves) || 0;

        cardsHtml +=
          '<div class="sa-mob-card" data-user="' + uid + '" data-name="' + safeName + '">' +
            '<div class="sa-mob-card-head">' +
              '<div>' +
                '<div class="sa-mob-card-name">' + safeName + '</div>' +
                '<div class="sa-mob-card-role">' + safeRole + '</div>' +
              '</div>' +
              '<i class="material-icons" style="color:#94a3b8;font-size:20px;">chevron_right</i>' +
            '</div>' +
            '<div class="sa-mob-metrics">' +
              '<div class="sa-mob-m-col m-pres" data-cat="Present" data-user="' + uid + '" data-name="' + safeName + '">' +
                '<div class="sa-mob-m-val">' + (r.present || 0) + '</div>' +
                '<div class="sa-mob-m-lbl">Present</div>' +
              '</div>' +
              '<div class="sa-mob-m-col m-late" data-cat="Late" data-user="' + uid + '" data-name="' + safeName + '">' +
                '<div class="sa-mob-m-val">' + (r.late || 0) + '</div>' +
                '<div class="sa-mob-m-lbl">Late</div>' +
              '</div>' +
              '<div class="sa-mob-m-col m-half" data-cat="HalfDay" data-user="' + uid + '" data-name="' + safeName + '">' +
                '<div class="sa-mob-m-val">' + (r.halfDay || 0) + '</div>' +
                '<div class="sa-mob-m-lbl">Half</div>' +
              '</div>' +
              '<div class="sa-mob-m-col m-abse" data-cat="Absent" data-user="' + uid + '" data-name="' + safeName + '">' +
                '<div class="sa-mob-m-val">' + (r.absent || 0) + '</div>' +
                '<div class="sa-mob-m-lbl">Absent</div>' +
              '</div>' +
              '<div class="sa-mob-m-col m-leav" data-cat="Leave" data-user="' + uid + '" data-name="' + safeName + '">' +
                '<div class="sa-mob-m-val">' + totalLeaves + '</div>' +
                '<div class="sa-mob-m-lbl">Leaves</div>' +
              '</div>' +
            '</div>' +
          '</div>';
      });
      cardsHtml += '</div>';
      host.innerHTML = cardsHtml;

      Array.prototype.forEach.call(host.querySelectorAll(".sa-mob-card"), function (card) {
        card.addEventListener("click", function (e) {
          var col = e.target.closest(".sa-mob-m-col");
          var uid = Number(card.getAttribute("data-user"));
          var name = card.getAttribute("data-name");
          if (col) {
            e.stopPropagation();
            var cat = col.getAttribute("data-cat");
            openEmployee(uid, cat, name);
          } else {
            openEmployee(uid, "All", name);
          }
        });
      });
      return;
    }

    /* Desktop View */
    var rows = list.map(function (r) {
      return '<tr><td style="font-weight:700;">' + esc(r.name) + '</td><td style="color:var(--text-muted);">' + esc(r.designation || "") + '</td>' +
        '<td class="num">' + countBtn(r, "Present", r.present || 0, "green") + '</td>' +
        '<td class="num">' + countBtn(r, "Late", r.late || 0, "orange") + '</td>' +
        '<td class="num">' + countBtn(r, "HalfDay", r.halfDay || 0, "purple") + '</td>' +
        '<td class="num">' + countBtn(r, "Absent", r.absent || 0, "red") + '</td>' +
        '<td class="num">' + countBtn(r, "Leave", r.leave || 0, "blue") + '</td>' +
        '<td class="num" style="font-weight:800;color:var(--maroon);">' + (Number(r.totalLeaves) || 0) + '</td></tr>';
    }).join("");
    host.innerHTML = '<div class="friendly-wrap"><table class="friendly-table"><thead><tr><th>Name</th><th>Role</th><th style="text-align:center;">Present</th><th style="text-align:center;">Late</th><th style="text-align:center;">Half</th><th style="text-align:center;">Absent</th><th style="text-align:center;">Leave</th><th style="text-align:center;">Leaves Used</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p style="font-size:12px;color:var(--text-muted);margin-top:8px;">Click Present, Late, Half, Absent or Leave to see exact dates and punch times.</p>';
    Array.prototype.forEach.call(host.querySelectorAll("[data-summary]"), function (b) { b.addEventListener("click", function () { openEmployee(Number(b.getAttribute("data-user")), b.getAttribute("data-summary"), b.getAttribute("data-name")); }); });
  }

  function countBtn(r, cat, n, cls) {
    return '<button type="button" data-summary="' + cat + '" data-user="' + (r.userId || "") + '" data-name="' + esc(r.name || "") + '" class="pill ' + cls + '" style="border:0;cursor:pointer;min-width:36px;">' + n + '</button>';
  }

  function resolveUserId(userId, name) {
    if (userId) return Number(userId);
    var d = current && current.staffDirectory || [];
    var x = d.find(function (r) { return String(r.name).toLowerCase() === String(name || "").toLowerCase(); });
    if (x) return Number(x.userId);
    var rep = current && current.summaryReport || [];
    x = rep.find(function (r) { return String(r.name).toLowerCase() === String(name || "").toLowerCase(); });
    return x ? Number(x.userId) : 0;
  }

  function openEmployee(userId, category, name) {
    userId = resolveUserId(userId, name);
    if (!userId) {
      loadMonth($("saMonth").value, true, function () { openEmployee(userId, category, name); });
      return;
    }
    var rep = (current.summaryReport || []).find(function (r) { return Number(r.userId) === Number(userId); });
    if (!rep) return;
    category = category || "All";

    var buckets = ["Present", "Late", "HalfDay", "Absent", "Leave"];
    var allRows = [];
    Object.keys(current.calendarMap || {}).sort().forEach(function (date) {
      buckets.forEach(function (bkt) {
        var arr = ((current.calendarMap[date] || {})[bkt] || []);
        arr.forEach(function (r) {
          if (Number(r.userId) === Number(userId)) {
            allRows.push({ date: date, r: r, bucket: bkt });
          }
        });
      });
    });

    var rows = category === "All" ? allRows : allRows.filter(function (x) { return x.bucket === (category === "HalfDay" ? "HalfDay" : category); });

    var labels = { All: "All records", Present: "Present days", Late: "Late days", HalfDay: "Half days", Absent: "Absent days", Leave: "Leave days" };
    $("saEmployeeTitle").textContent = rep.name + " (" + (labels[category] || category) + ")";

    var tabsHtml = '<div class="sa-emp-cat-tabs">' +
      '<button type="button" class="sa-emp-cat-tab ' + (category === "All" ? "active" : "") + '" data-cat="All">All (' + allRows.length + ')</button>' +
      '<button type="button" class="sa-emp-cat-tab ' + (category === "Present" ? "active" : "") + '" data-cat="Present">Present (' + (rep.present || 0) + ')</button>' +
      '<button type="button" class="sa-emp-cat-tab ' + (category === "Late" ? "active" : "") + '" data-cat="Late">Late (' + (rep.late || 0) + ')</button>' +
      '<button type="button" class="sa-emp-cat-tab ' + (category === "HalfDay" ? "active" : "") + '" data-cat="HalfDay">Half (' + (rep.halfDay || 0) + ')</button>' +
      '<button type="button" class="sa-emp-cat-tab ' + (category === "Absent" ? "active" : "") + '" data-cat="Absent">Absent (' + (rep.absent || 0) + ')</button>' +
      '<button type="button" class="sa-emp-cat-tab ' + (category === "Leave" ? "active" : "") + '" data-cat="Leave">Leaves (' + (Number(rep.totalLeaves) || 0) + ')</button>' +
    '</div>';

    if (!rows.length) {
      $("saEmployeeBody").innerHTML = tabsHtml + '<div class="slip-empty">No matching dates in this category for this month.</div>';
    } else {
      $("saEmployeeBody").innerHTML = tabsHtml + '<div style="max-height:62vh;overflow-y:auto;padding-right:4px;">' + rows.map(function (x) { return employeeAttendanceCard(x.date, x.r, userId, x.bucket); }).join("") + '</div>';
    }

    Array.prototype.forEach.call($("saEmployeeBody").querySelectorAll(".sa-emp-cat-tab"), function (tabBtn) {
      tabBtn.addEventListener("click", function () {
        openEmployee(userId, tabBtn.getAttribute("data-cat"), name);
      });
    });

    if (!P.isMobileAdmin(session)) {
      Array.prototype.forEach.call($("saEmployeeBody").querySelectorAll("[data-edit-date]"), function (b) {
        b.addEventListener("click", function () { P.closeModal("saEmployeeModal"); openEditor(Number(b.getAttribute("data-edit-user")), b.getAttribute("data-edit-date")); });
      });
    }

    P.openModal("saEmployeeModal");
  }

  function employeeAttendanceCard(date, r, userId, category) {
    var manual = r.attendanceSource === "Manual" || r.source === "manual";
    var status = String(r.status || category || "");
    var dual = String(r.shiftType || "").toUpperCase() === "DUAL";
    var source = manual ? "Manual correction" : "Biometric";
    var sourceStyle = manual ? "#eef6ff;color:#1769aa;" : "#f1f8f4;color:#287a55;";
    var statusStyle = status === "Late" ? "#fff4d6;color:#8a5a00;" : (status === "Absent" ? "#fdeaea;color:#a92828;" : (status === "Leave" ? "#eaf4ff;color:#1769aa;" : "#f2edff;color:#6b3bb8;"));
   function punch(label, value) {
     var v = value == null ? "" : String(value).trim();
     var missing = !v || v === "-" || v === "—" || v === "null" || v === "undefined";
     if (!missing && /^\d{1,2}:\d{2}(:\d{2})?$/.test(v)) v = v.slice(0, 5);
     return '<div style="border:1px solid #e4e7eb;border-radius:10px;padding:10px 12px;background:' + (missing ? '#fafafa' : '#fff') + ';min-width:0;"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--text-muted);font-weight:700;">' + label + '</div><div style="font-size:15px;font-weight:800;margin-top:3px;color:' + (missing ? '#9aa1aa' : 'var(--text)') + ';">' + (missing ? 'Missing' : esc(v)) + '</div></div>';
   }
    function sessionBlock(title, inValue, outValue) { return '<div style="margin-top:12px;padding:12px;border:1px solid #e6e8eb;border-radius:12px;background:#fcfcfd;"><div style="font-size:12px;font-weight:800;color:var(--maroon);margin-bottom:8px;">' + title + '</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' + punch('In time', inValue) + punch('Out time', outValue) + '</div></div>'; }
    var sessionHtml = dual ? sessionBlock('Morning session', r.in1, r.out1) + sessionBlock('Afternoon session', r.in2, r.out2) : sessionBlock('Attendance', r.in1, r.out1);
    var lateHtml = Number(r.lateByMinutes || 0) > 0 ? '<div style="margin-top:12px;padding:10px 12px;border-radius:10px;background:#fff8e7;color:#7a5200;font-size:13px;"><b>Late arrival:</b> ' + esc(r.lateBy || "Late") + (r.lateSession ? ' · ' + esc(r.lateSession) + ' session' : '') + '</div>' : '';
    var reasonText = r.manualReason ? '<div style="margin-top:10px;font-size:13px;color:var(--text-muted);"><b>Reason:</b> ' + esc(r.manualReason) + '</div>' : (r.gaps && r.gaps !== "-" ? '<div style="margin-top:10px;font-size:13px;color:var(--text-muted);"><b>Attendance note:</b> ' + esc(r.gaps) + '</div>' : '');
    var editBtnHtml = P.isMobileAdmin(session) ? '' : '<div style="display:flex;justify-content:flex-end;margin-top:12px;"><button class="btn btn-secondary" data-edit-date="' + date + '" data-edit-user="' + userId + '" style="width:auto;padding:7px 14px;">Edit attendance</button></div>';
    return '<div style="border:1px solid #e1e4e8;border-radius:14px;margin:0 0 12px;padding:14px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.03);">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;"><div><div style="font-size:15px;font-weight:800;color:var(--text);">' + esc(prettyDate(date)) + '</div><div style="font-size:12px;color:var(--text-muted);margin-top:3px;">' + (dual ? 'Dual session' : 'Single session') + '</div></div>' +
      '<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;"><span style="display:inline-block;padding:5px 10px;border-radius:999px;font-size:12px;font-weight:800;' + statusStyle + '">' + esc(status === "HalfDay" ? "Half Day" : status) + '</span><span style="display:inline-block;padding:5px 10px;border-radius:999px;font-size:12px;font-weight:700;' + sourceStyle + '">Source: ' + source + '</span></div></div>' +
      sessionHtml + lateHtml + reasonText + editBtnHtml + '</div>';
  }

  function openDay(k) {
    drillDate = k; var d = (current.calendarMap || {})[k] || {};
    $("saDayTitle").textContent = "Staff on " + prettyDate(k);
    $("saDayTabs").innerHTML = tabBtn("Present", "t-green", (d.Present || []).length) + tabBtn("Late", "t-orange", (d.Late || []).length) + tabBtn("HalfDay", "t-purple", (d.HalfDay || []).length) + tabBtn("Absent", "t-red", (d.Absent || []).length) + tabBtn("Leave", "t-green", (d.Leave || []).length);
    Array.prototype.forEach.call($("saDayTabs").querySelectorAll("button"), function (b) { b.addEventListener("click", function () { showTab(b.getAttribute("data-k")); }); });
    var first = (d.Late || []).length ? "Late" : ((d.HalfDay || []).length ? "HalfDay" : ((d.Absent || []).length ? "Absent" : ((d.Leave || []).length ? "Leave" : "Present")));
    showTab(first); P.openModal("saDayModal");
  }

  function tabBtn(key, cls, n) { var label = {Present:"Present",Late:"Late",HalfDay:"Half day",Absent:"Absent",Leave:"Leave"}[key] || key; return '<button class="' + cls + '" data-k="' + key + '"><span class="n">' + n + '</span><span class="l">' + label + '</span></button>'; }
  function showTab(key) {
    Array.prototype.forEach.call($("saDayTabs").querySelectorAll("button"), function (b) { b.classList.toggle("active", b.getAttribute("data-k") === key); });
    var d = (current.calendarMap || {})[drillDate] || {}, arr = (d[key] || []).slice().sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
    if (!arr.length) { $("saDayBody").innerHTML = '<div class="slip-empty">No staff in this list for the day.</div>'; return; }
    $("saDayBody").innerHTML = arr.map(function (r, i) {
      var dual = String(r.shiftType || "").toUpperCase() === "DUAL";
      var meta = 'In ' + esc(r.in1 || "—") + ' · Out ' + esc(r.out1 || "—");
      if (dual && ((r.in2 && r.in2 !== "-") || (r.out2 && r.out2 !== "-"))) meta += ' · In2 ' + esc(r.in2 || "—") + ' · Out2 ' + esc(r.out2 || "—");
      if (r.lateBy && r.lateBy !== "-") meta += ' · Late by ' + esc(r.lateBy);
      if (r.gaps && r.gaps !== "-") meta += ' · ' + esc(r.gaps);
      if (r.attendanceSource === "Manual" || r.source === "manual") meta += ' · Manual';
      return '<div class="list-row"><div class="idx">' + (i + 1) + '</div><div class="who"><div class="nm">' + esc(r.name) + '</div><div class="meta">' + esc(r.designation || "") + ' — ' + meta + '</div></div><button class="btn btn-secondary" data-day-edit="' + esc(r.userId) + '" style="width:auto;padding:7px 10px;">Edit</button></div>';
    }).join("");
    Array.prototype.forEach.call($("saDayBody").querySelectorAll("[data-day-edit]"), function (b) { b.addEventListener("click", function () { P.closeModal("saDayModal"); openEditor(Number(b.getAttribute("data-day-edit")), drillDate); }); });
  }

  function populateUsers(selected) {
    var sel = $("saEditUser"), rep = current.staffDirectory || current.summaryReport || [];
    sel.innerHTML = rep.slice().sort(function (a,b) { return String(a.name).localeCompare(String(b.name)); }).map(function (r) { return '<option value="' + r.userId + '">' + esc(r.name) + ' — ' + esc(r.designation || '') + '</option>'; }).join("");
    if (selected) sel.value = String(selected);
  }

  function selectedStaff() {
    var uid = Number($("saEditUser").value);
    return (current.staffDirectory || []).find(function (r) { return Number(r.userId) === uid; }) || (current.summaryReport || []).find(function (r) { return Number(r.userId) === uid; }) || null;
  }

  function updateEditorForUser(uid) {
    var st = (current.staffDirectory || []).find(function (r) { return Number(r.userId) === Number(uid); }) || (current.summaryReport || []).find(function (r) { return Number(r.userId) === Number(uid); });
    if (!st) return;
    var dual = String(st.shiftType || "").toUpperCase() === "DUAL";
    $("saEditShiftType").value = dual ? "DUAL" : "SINGLE";
    $("saSingleFields").style.display = dual ? "none" : "block";
    $("saDualFields").style.display = dual ? "block" : "none";
    $("saShiftInfo").textContent = dual ? "Dual session employee — enter the morning and afternoon punches." : "Single session employee — enter the time they came in and went out.";
    $("saEditEmployeeName").textContent = st.name + (st.designation ? " — " + st.designation : "");
  }

  function clearEditorFields() {
    $("saSingleIn").value = ""; $("saSingleOut").value = "";
    $("saMorningIn").value = ""; $("saMorningOut").value = "";
    $("saAfternoonIn").value = ""; $("saAfternoonOut").value = "";
    $("saEditStatus").value = "Present"; $("saEditReason").value = "";
  }

  function openEditor(userId, date) {
    editorLockedUser = !!userId;
    populateUsers(userId);
    if (userId) $("saEditUser").value = String(userId);
    $("saEditEmployeePicker").style.display = editorLockedUser ? "none" : "block";
    $("saEditEmployeeFixed").style.display = editorLockedUser ? "block" : "none";
    updateEditorForUser(Number($("saEditUser").value));
    var d = date || P.todayIso();
    $("saEditDate").value = d;
    $("saEditId").value = "";
    $("saEditType").value = "PUNCH";
    clearEditorFields();
    toggleEditFields();
    if (editorLockedUser) loadExistingAdjustment(Number($("saEditUser").value), d);
    $("saEditTitle").textContent = editorLockedUser ? "Edit Attendance" : "Manual Attendance Entry";
    P.openModal("saEditModal");
  }

  function loadExistingAdjustment(uid, date) {
    P.api("getAttendanceAdjustments", [uid, date], { text: "Loading attendance correction…" }).then(function (rows) {
      rows = Array.isArray(rows) ? rows : [];
      if (!rows.length) return;
      var punchRows = rows.filter(function (r) { return String(r.entry_type || "").toUpperCase() === "PUNCH"; });
      var status = rows.find(function (r) { return String(r.entry_type || "").toUpperCase() !== "PUNCH"; });
      if (status) {
        var t = String(status.entry_type || "").toUpperCase();
        $("saEditType").value = t === "LEAVE" ? "LEAVE" : (t === "DUTY" || t === "OFFICIAL_DUTY" || t === "CONTINUOUS_DUTY" ? "DUTY" : "LEAVE");
        $("saEditStatus").value = status.status || ($("saEditType").value === "LEAVE" ? "Leave" : "Present");
        $("saEditReason").value = status.reason || "";
      } else if (punchRows.length) {
        $("saEditType").value = "PUNCH";
        $("saEditReason").value = punchRows[0].reason || "";
        punchRows.forEach(function (r) {
          var s = String(r.session || "").toUpperCase(), pt = String(r.punch_type || "").toUpperCase(), tm = String(r.punch_time || "").slice(0,5);
          if (s === "MORNING") { if (pt === "IN") $("saMorningIn").value = tm; if (pt === "OUT") $("saMorningOut").value = tm; }
          else if (s === "AFTERNOON") { if (pt === "IN") $("saAfternoonIn").value = tm; if (pt === "OUT") $("saAfternoonOut").value = tm; }
          else { if (pt === "IN") $("saSingleIn").value = tm; if (pt === "OUT") $("saSingleOut").value = tm; }
        });
      }
      toggleEditFields(true);
    }).catch(function () {});
  }

  function toggleEditFields(preserveStatus) {
    var type = $("saEditType").value, punch = type === "PUNCH";
    $("saSingleFields").style.display = "none"; $("saDualFields").style.display = "none"; $("saStatusFields").style.display = punch ? "none" : "block";
    if (punch) updateEditorForUser(Number($("saEditUser").value));
    if (type === "LEAVE" && !preserveStatus) $("saEditStatus").value = "Leave";
    if (type === "DUTY") $("saEditStatus").value = "Present";
  }

  function addPunch(arr, session, type, time) { if (time) arr.push({ session: session, punchType: type, time: time }); }

  function saveEdit() {
    var type = $("saEditType").value, uid = Number($("saEditUser").value), date = $("saEditDate").value;
    if (!uid || !date) return alert("Employee and date are required.");
    var st = selectedStaff(), dual = st && String(st.shiftType || "").toUpperCase() === "DUAL", reason = $("saEditReason").value.trim();
    var save = function () {
      if (type !== "PUNCH") {
        var status = $("saEditStatus").value || (type === "LEAVE" ? "Leave" : "Present");
        return P.api("saveAttendanceAdjustment", [{ userId:uid, date:date, entryType:type, statusOverride:status, reason:reason }], { text:"Saving attendance correction…" });
      }
      var punches = [];
      if (dual) { addPunch(punches, "MORNING", "IN", $("saMorningIn").value); addPunch(punches, "MORNING", "OUT", $("saMorningOut").value); addPunch(punches, "AFTERNOON", "IN", $("saAfternoonIn").value); addPunch(punches, "AFTERNOON", "OUT", $("saAfternoonOut").value); }
      else { addPunch(punches, "SINGLE", "IN", $("saSingleIn").value); addPunch(punches, "SINGLE", "OUT", $("saSingleOut").value); }
      if (!punches.length) return Promise.reject(new Error("Enter at least one punch time."));
      return P.api("saveAttendanceAdjustment", [{ userId:uid, date:date, entryType:"PUNCH", punches:punches, reason:reason }], { text:"Saving attendance correction…" });
    };
    var replace = editorLockedUser ? P.api("clearAttendanceAdjustments", [uid, date], { text:"Replacing attendance correction…" }) : Promise.resolve();
    replace.then(save).then(function () { P.closeModal("saEditModal"); monthCache = {}; P.Cache.remove && P.Cache.remove("staffmon_" + $("saMonth").value); loadMonth($("saMonth").value, true); }).catch(function (e) { alert(e.message || e); });
  }

  function resetDay() {
    var uid = Number($("saEditUser").value), date = $("saEditDate").value;
    if (!uid || !date) return;
    if (!confirm("Remove all manual corrections for this employee on " + prettyDate(date) + " and restore biometric attendance?")) return;
    P.api("clearAttendanceAdjustments", [uid, date], { text:"Restoring biometric attendance…" }).then(function () { P.closeModal("saEditModal"); monthCache = {}; loadMonth($("saMonth").value, true); }).catch(function (e) { alert(e.message || e); });
  }

})();


/* attendance-log.js — My Attendance Log (staff). Plain script; uses `Portal`.
   Backend: getTimesheetData(name, "YYYY-MM") for attendance.
   Salary slips come from payroll-api using the logged-in staff account.
   Wording simplified for readability.
   Month results are cached (CONFIG.MONTH_TTL_MS) so re-opening a month is
   instant — the console + inline line show the before/after timing. */
(function () {
  "use strict";
  var P = window.Portal;
  var session = P.Session.get();
  if (!session || session.role === "Management") return;
  session = P.bootPage("attlog");
  if (!session) return;

  var esc = P.esc, prettyDate = P.prettyDate, monthLabel = P.monthLabel;
  var $ = function (id) { return document.getElementById(id); };
  var me = session.name;
  var calCache = {};       // month -> timesheet payload (in-memory this page)
  var slipsLoaded = false;
  var payrollBase = (window.PORTAL_CONFIG || {}).SUPABASE_PAYROLL_BASE || "";

  $("view").innerHTML = shell();
  bind();
  loadMonth(P.thisMonth(), false);
  loadSlips();

  function shell() {
    return '' +
    '<div class="card wide-card">' +
      '<div class="mod-head"><div><span class="eyebrow">Staff Portal</span>' +
        '<h2 style="margin-bottom:4px;">My Attendance Log</h2>' +
        '<p class="view-description" style="margin:0;">Your monthly attendance at a glance — present, late and absent days.</p></div>' +
        '<button class="btn btn-maroon" id="alLeaveBtn" style="width:auto;padding:10px 16px;"><i class="material-icons" style="color:#fff;">event_busy</i> Apply for Leave</button>' +
      '</div>' +
      '<div class="mod-toolbar">' +
        '<div class="smart-selector"><div class="ss-icon"><i class="material-icons">calendar_month</i></div>' +
          '<div class="ss-body"><div class="ss-label">Month</div><input type="month" id="alMonth"></div></div>' +
        '<button class="refresh-btn" id="alRefresh"><i class="material-icons" style="font-size:16px;">refresh</i> Refresh</button>' +
      '</div>' +
      '<div class="timing-line" id="alTiming"></div>' +
      '<div class="stat-row">' +
        '<div class="stat-box green"><div class="n" id="alPresent">–</div><div class="l">Days Present</div></div>' +
        '<div class="stat-box orange"><div class="n" id="alLate">–</div><div class="l">Late Arrivals</div></div>' +
        '<div class="stat-box red"><div class="n" id="alAbsent">–</div><div class="l">Days Absent</div></div>' +
        '<div class="stat-box purple"><div class="n" id="alHalf">–</div><div class="l">Half Days</div></div>' +
      '</div>' +
      '<div class="legend">' +
        '<span class="lg"><span class="dot d-green"></span>Present</span>' +
        '<span class="lg"><span class="dot d-orange"></span>Late</span>' +
        '<span class="lg"><span class="dot d-purple"></span>Half day</span>' +
        '<span class="lg"><span class="dot d-red"></span>Absent</span>' +
        '<span class="lg"><span class="dot d-blue"></span>Leave / Holiday</span>' +
        '<span class="lg"><span class="dot d-grey"></span>Off / Upcoming</span>' +
      '</div>' +
      '<div class="cal-head"><div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div></div>' +
      '<div class="cal-grid" id="alGrid"></div>' +
      slipCard() +
    '</div>' +
    dayModal() + leaveModal() + salaryBreakdownModal();
  }
  function salaryBreakdownModal() {
    return '<div class="modal-overlay" id="alSalaryBreakdownModal">' +
      '<div class="modal-content" style="max-width:680px;max-height:92vh;overflow-y:auto;padding:16px 14px;">' +
        '<div class="modal-header-container" style="margin-bottom:12px;">' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            '<div style="width:36px;height:36px;border-radius:10px;background:#fef2f2;display:grid;place-items:center;color:var(--maroon);">' +
              '<i class="material-icons" style="font-size:20px;">account_balance_wallet</i>' +
            '</div>' +
            '<div>' +
              '<h3 id="alSalaryBreakdownTitle" style="margin:0;font-size:16px;font-weight:900;color:#0f172a;">Salary Breakdown</h3>' +
              '<div id="alSalaryBreakdownSub" style="font-size:12px;color:#64748b;font-weight:600;"></div>' +
            '</div>' +
          '</div>' +
          '<button class="modal-close-icon" data-close="alSalaryBreakdownModal">&times;</button>' +
        '</div>' +
        '<div id="alSalaryBreakdownBody"></div>' +
        '<div style="margin-top:16px;display:flex;justify-content:flex-end;">' +
          '<button class="btn btn-secondary" data-close="alSalaryBreakdownModal" style="width:auto;min-width:100px;">Close</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }
  function slipCard() {
    return '<div class="slip-card"><div class="slip-head"><div class="st"><i class="material-icons">receipt_long</i><h3>Salary Slips</h3></div>' +
      '<span class="pill grey" id="alSlipStatus">Loading…</span></div>' +
      '<div id="alSlipList"></div></div>';
  }
  function dayModal() {
    return '<div class="modal-overlay" id="alDayModal"><div class="modal-content">' +
      '<div class="modal-header-container"><h3 id="alDayTitle">Attendance</h3><button class="modal-close-icon" data-close="alDayModal">&times;</button></div>' +
      '<div id="alDayBody"></div>' +
      '<button class="btn btn-secondary" data-close="alDayModal" style="margin-top:16px;">Close</button></div></div>';
  }
  function leaveModal() {
    return '<div class="modal-overlay" id="alLeaveModal"><div class="modal-content">' +
      '<div class="modal-header-container"><h3>Apply for Leave</h3><button class="modal-close-icon" data-close="alLeaveModal">&times;</button></div>' +
      '<div class="form-group"><label>Leave date</label><input type="date" id="alLeaveDate"></div>' +
      '<div class="form-group"><label>Reason</label><textarea id="alLeaveReason" rows="3" placeholder="e.g. Not well, fever since morning"></textarea></div>' +
      '<div class="form-group"><label>Message to Principal (editable)</label><textarea id="alLeaveMsg" rows="4"></textarea></div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
        '<button class="btn btn-secondary" style="width:auto;" data-close="alLeaveModal">Cancel</button>' +
        '<button class="btn btn-whatsapp" style="width:auto;" id="alLeaveSend"><i class="material-icons" style="color:#fff;">send</i> Send on WhatsApp</button></div>' +
      '<p style="font-size:12px;color:var(--text-muted);margin-top:12px;">This opens WhatsApp to the Principal with your message ready to send.</p></div></div>';
  }

  function bind() {
    var m = $("alMonth"); m.value = P.thisMonth();
    m.addEventListener("change", function () { loadMonth(m.value, false); });
    $("alRefresh").addEventListener("click", function () { loadMonth($("alMonth").value, true); });
    Array.prototype.forEach.call(document.querySelectorAll("[data-close]"), function (b) { b.addEventListener("click", function () { P.closeModal(b.getAttribute("data-close")); }); });
    Array.prototype.forEach.call(document.querySelectorAll(".modal-overlay"), function (mm) { mm.addEventListener("click", function (e) { if (e.target === mm) P.closeModal(mm.id); }); });
    $("alLeaveBtn").addEventListener("click", openLeave);
    $("alLeaveReason").addEventListener("input", composeLeave);
    $("alLeaveDate").addEventListener("change", composeLeave);
    $("alLeaveSend").addEventListener("click", sendLeave);
  }

  /* ---------------- load month (with cache = measurable win) ---------------- */
  function loadMonth(month, force) {
    var key = "tsheet_" + me.toLowerCase() + "_" + month;
    var t0 = performance.now();
    if (!force) {
      var mem = calCache[month] || P.Cache.get(key);
      if (mem) {
        var ms = Math.round(performance.now() - t0);
        P.perf.record("Load My Log", ms, "warm");
        showTiming(ms, "warm");
        render(mem, month);
        calCache[month] = mem;
        return;
      }
    }
    $("alGrid").innerHTML = '<div class="inline-loader" style="grid-column:span 7;"><i class="material-icons">sync</i>Loading your log…</div>';
    P.api("getTimesheetData", [me, month], { text: "Loading your attendance…" }).then(function (data) {
      var ms = Math.round(performance.now() - t0);
      P.perf.record("Load My Log", ms, "cold");
      showTiming(ms, "cold");
      data = data || { calendar: {}, stats: {}, userShiftProfile: {} };
      calCache[month] = data;
      P.Cache.set(key, data, P.CONFIG.MONTH_TTL_MS);
      render(data, month);
    }).catch(function (e) { $("alGrid").innerHTML = '<div class="att-empty" style="grid-column:span 7;"><i class="material-icons">error_outline</i>' + esc(e.message || e) + '</div>'; });
  }
  function showTiming(ms, mode) {
    var base = P.perf.baseline["Load My Log"], el = $("alTiming");
    if (mode === "warm" && base) el.innerHTML = "⚡ Loaded from cache in <b>" + ms + " ms</b> — first load was " + base + " ms (" + Math.round((1 - ms / base) * 100) + "% faster).";
    else el.innerHTML = "⏱ Loaded in " + ms + " ms." + (base ? "" : " Re-open this month to load instantly from cache.");
  }

  var _shift = {};
  function render(data, month) {
    var st = data.stats || {}, cal = data.calendar || {};
    _shift = data.userShiftProfile || {};
    $("alPresent").textContent = st.present == null ? 0 : st.present;
    $("alLate").textContent = st.late == null ? 0 : st.late;
    $("alAbsent").textContent = st.absent == null ? 0 : st.absent;
    $("alHalf").textContent = st.halfDays == null ? 0 : st.halfDays;

    var keys = Object.keys(cal).sort();
    var grid = $("alGrid");
    if (keys.length === 0) { grid.innerHTML = '<div class="att-empty" style="grid-column:span 7;"><i class="material-icons">inbox</i>No records for ' + esc(monthLabel(month)) + '.</div>'; return; }
    var pad = new Date(keys[0] + "T00:00:00").getDay();
    var html = "";
    for (var i = 0; i < pad; i++) html += '<div class="cal-day empty"></div>';
    keys.forEach(function (k) {
      var d = cal[k], dcls = dotClass(d);
      html += '<div class="cal-day" data-day="' + k + '"><div class="dnum">' + (+k.split("-")[2]) + '</div><div class="dot ' + dcls + '"></div></div>';
    });
    grid.innerHTML = html;
    Array.prototype.forEach.call(grid.querySelectorAll(".cal-day[data-day]"), function (c) { c.addEventListener("click", function () { openDay(c.getAttribute("data-day")); }); });
  }
  function dotClass(d) {
    if (!d) return "d-grey";
    if (d.isHolidayDuty) return "d-blue";
    var s = String(d.status || "");
    if (s === "Present") return "d-green";
    if (s.indexOf("Half Day") === 0) return "d-purple";
    if (s.indexOf("Late") >= 0) return "d-orange";
    if (s === "Absent") return "d-red";
    if (s.indexOf("Leave") >= 0) return "d-blue";
    if (s.indexOf("Holiday") >= 0 || s.indexOf("Weekly Off") >= 0) return "d-blue";
    return "d-grey"; // Pending / Off
  }
  function friendlyStatus(s) {
    s = String(s || "");
    if (s === "Weekly Off") return "Weekly holiday";
    if (s.indexOf("Holiday Duty") >= 0) return "Present (holiday duty)";
    if (s === "Pending") return "Upcoming";
    return s;
  }

  /* ---------------- day detail ---------------- */
  function openDay(k) {
    var data = calCache[$("alMonth").value] || {};
    var d = (data.calendar || {})[k];
    if (!d) return;
    $("alDayTitle").textContent = prettyDate(k);
    var dcls = dotClass(d), color = { "d-green": "var(--success)", "d-orange": "var(--warning)", "d-purple": "#9b59b6", "d-red": "var(--danger)", "d-blue": "#0ea5e9", "d-grey": "#94a3b8" }[dcls];
    var rows = "";
    rows += detailRow("Status", '<span style="font-weight:800;color:' + color + ';">' + esc(friendlyStatus(d.status)) + "</span>");
    var dual = String(_shift.shiftType || "").toUpperCase() === "DUAL";
    rows += detailRow("Clock In", esc(d.in1 || "—"));
    rows += detailRow("Clock Out", esc(d.out1 || "—"));
    if (dual) { rows += detailRow("Clock In (2)", esc(d.in2 || "—")); rows += detailRow("Clock Out (2)", esc(d.out2 || "—")); }
    var note = "";
    if (String(d.status) === "Absent") note = '<div class="alert-warning" style="margin:14px 0 0;"><i class="material-icons" style="color:#92400e;">info</i>No clock-in was recorded on this day.</div>';
    else if (d.hasDeficit && d.gaps && d.gaps !== "-") note = '<div class="alert-warning" style="margin:14px 0 0;"><i class="material-icons" style="color:#92400e;">schedule</i>' + esc(d.gaps) + '</div>';
    else if (d.gaps && d.gaps.indexOf("Missing") >= 0) note = '<div class="alert-warning" style="margin:14px 0 0;"><i class="material-icons" style="color:#92400e;">warning</i>' + esc(d.gaps) + '</div>';
    $("alDayBody").innerHTML = '<div class="big-day"><div class="bd-icon" style="background:' + color + ';"><i class="material-icons">event_available</i></div>' +
      '<div class="bd-body"><div class="bd-status">' + esc(friendlyStatus(d.status)) + '</div><div class="bd-sub">' + prettyDate(k) + '</div></div></div>' +
      '<div>' + rows + '</div>' + note;
    P.openModal("alDayModal");
  }
  function detailRow(label, val) {
    return '<div style="display:flex;justify-content:space-between;padding:11px 0;border-bottom:1px solid #f1f2f6;font-size:14px;"><span style="color:var(--text-muted);font-weight:600;">' + label + '</span><span style="font-weight:700;">' + val + '</span></div>';
  }

  /* ---------------- salary slips ---------------- */
  function payrollApi(fn, args) {
    if (!payrollBase) return Promise.reject(new Error("SUPABASE_PAYROLL_BASE is missing in config.js."));
    var s = P.Session.get() || {};
    var C = window.PORTAL_CONFIG || {};
    return fetch(payrollBase, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + (C.SUPABASE_ANON || ""),
        "apikey": C.SUPABASE_ANON || "",
        "x-session-token": s.token || ""
      },
      body: JSON.stringify({ fn: fn, args: args || [] })
    })
      .then(function (r) { return r.text(); })
      .then(function (t) {
        var j;
        try { j = JSON.parse(t); } catch (e) { throw new Error("Invalid payroll server response"); }
        if (!j.ok) throw new Error(j.error || "Payroll request failed");
        return j.data;
      });
  }

  function loadSlips() {
    if (slipsLoaded) return;
    payrollApi("payrollMySalaryList", []).then(function (res) {
      slipsLoaded = true;
      var slips = Array.isArray(res) ? res : [], pill = $("alSlipStatus"), list = $("alSlipList");
      if (slips.length === 0) {
        pill.className = "pill grey";
        pill.textContent = "None available";
        list.innerHTML = '<div class="slip-empty">Salary slips will appear here after your salary is marked as paid.</div>';
        return;
      }
      pill.className = "pill green";
      pill.textContent = slips.length + " available";
      list.innerHTML = slips.map(function (s, i) {
        var month = String(s.payroll_month || "").slice(0, 7);
        var label = monthLabel(month);
        return '<div class="slip-row"><span class="m"><i class="material-icons">event</i>' + esc(label) + '</span>' +
          '<span class="acts">' +
          '<button class="slip-btn blue" type="button" data-slip-action="breakdown" data-slip-index="' + i + '"><i class="material-icons" style="font-size:16px;color:#fff;">assessment</i> Breakdown</button>' +
          '<button class="slip-btn maroon" type="button" data-slip-action="download" data-slip-index="' + i + '"><i class="material-icons" style="font-size:16px;color:#fff;">download</i> Download</button>' +
          '</span></div>';
      }).join("");

      Array.prototype.forEach.call(list.querySelectorAll("[data-slip-action]"), function (btn) {
        btn.addEventListener("click", function () {
          var idx = Number(btn.getAttribute("data-slip-index"));
          var action = btn.getAttribute("data-slip-action");
          if (action === "download") downloadSlip(slips[idx]);
          else if (action === "breakdown") viewSalaryBreakdown(slips[idx]);
        });
      });
    }).catch(function (e) {
      slipsLoaded = false;
      $("alSlipStatus").className = "pill grey";
      $("alSlipStatus").textContent = "Load failed";
      $("alSlipList").innerHTML = '<div class="slip-empty">' + esc(e.message || "Could not load salary slips.") + '</div>';
    });
  }

  function money(v) {
    var val = Number(v);
    if (!Number.isFinite(val)) val = 0;
    return "₹ " + val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function numVal(v) {
    var val = Number(v);
    return Number.isFinite(val) ? val : 0;
  }

  function statusBadge(st) {
    st = String(st || "Pending");
    if (st.toLowerCase() === "paid") {
      return '<span class="pill green" style="font-size:11px;font-weight:800;padding:4px 10px;border-radius:999px;">Paid</span>';
    }
    return '<span class="pill orange" style="font-size:11px;font-weight:800;padding:4px 10px;border-radius:999px;">Pending</span>';
  }

  function viewSalaryBreakdown(row) {
    if (!row) return;
    var month = String(row.payroll_month || row.month || "").slice(0, 7) || P.thisMonth();
    var label = monthLabel(month);
    var titleEl = $("alSalaryBreakdownTitle");
    var subEl = $("alSalaryBreakdownSub");
    var bodyEl = $("alSalaryBreakdownBody");
    if (titleEl) titleEl.textContent = "Salary Breakdown · " + label;
    if (subEl) subEl.textContent = (row.staff_name || (row.staff && row.staff.name) || row.name || me) + " · Attendance, leaves & salary computation";
    if (bodyEl) bodyEl.innerHTML = '<div class="inline-loader" style="padding:32px 10px;text-align:center;"><i class="material-icons">sync</i>Loading attendance & salary breakdown…</div>';
    P.openModal("alSalaryBreakdownModal");

    var timesheetPromise;
    if (calCache[month]) {
      timesheetPromise = Promise.resolve(calCache[month]);
    } else {
      timesheetPromise = P.api("getTimesheetData", [me, month], { overlay: false }).then(function (data) {
        if (data) calCache[month] = data;
        return data;
      }).catch(function () {
        return { stats: {} };
      });
    }

    timesheetPromise.then(function (tsData) {
      renderBreakdownModalContent(row, tsData, month);
    }).catch(function (e) {
      if (bodyEl) bodyEl.innerHTML = '<div class="att-empty" style="padding:24px 10px;text-align:center;"><i class="material-icons">error_outline</i>' + esc(e.message || "Could not load breakdown details.") + '</div>';
    });
  }

  function renderBreakdownModalContent(row, tsData, month) {
    var att = (tsData && tsData.stats) || {};
    var salary = Number(row.salary != null ? row.salary : (row.monthly_salary || 0));
    var dailyRate = Number(row.daily_rate || row.dailyRate || (salary > 0 ? (salary / 30) : 0));

    var annualEntitlement = Number(row.annual_leave_entitlement != null ? row.annual_leave_entitlement : (row.annualLeaveEntitlement != null ? row.annualLeaveEntitlement : (row.annualPaidLeave || 10)));
    var paidCredit = Number(row.paid_leave_credit != null ? row.paid_leave_credit : (row.paidLeaveCredit || 0));
    var paidUsed = Number(row.paid_leave_used != null ? row.paid_leave_used : (row.paidLeaveUsed != null ? row.paidLeaveUsed : 0));
    var paidBalance = Number(row.paid_leave_balance != null ? row.paid_leave_balance : (row.paidLeaveBalance != null ? row.paidLeaveBalance : 0));
    var paidOpening = row.paid_leave_opening != null ? Number(row.paid_leave_opening) : (row.paidLeaveOpening != null ? Number(row.paidLeaveOpening) : (paidBalance + paidUsed));
    var usedPriorMonths = Math.max(0, annualEntitlement - paidOpening);

    var fullDayAbsences = Number(row.full_day_absences != null ? row.full_day_absences : (row.fullDayAbsences != null ? row.fullDayAbsences : (att.absent || 0)));
    var halfDayAbsences = Number(row.half_day_absences != null ? row.half_day_absences : (row.halfDayAbsences != null ? row.halfDayAbsences : (att.halfDays != null ? att.halfDays : (att.halfDay || 0))));
    var absenceLeaveUnits = (fullDayAbsences * 1.0) + (halfDayAbsences * 0.5);
    var lateArrivals = Number(row.late_arrivals != null ? row.late_arrivals : (row.lateArrivals != null ? row.lateArrivals : (att.late || 0)));

    var latePenaltyLeave = row.late_penalty_leave != null
      ? Number(row.late_penalty_leave)
      : (row.latePenaltyLeave != null ? Number(row.latePenaltyLeave) : (Math.floor(lateArrivals / 3) * 0.5));

    var totalAttendanceLeave = row.attendance_leave != null
      ? Number(row.attendance_leave)
      : (row.attendanceLeave != null ? Number(row.attendanceLeave) : (absenceLeaveUnits + latePenaltyLeave));

    var isAttendanceOverridden = (row.manual_attendance_leave != null || row.manualAttendanceLeave != null);
    var autoAttendanceLeave = Number(row.automatic_attendance_leave != null ? row.automatic_attendance_leave : (row.automaticAttendanceLeave != null ? row.automaticAttendanceLeave : totalAttendanceLeave));

    var unpaidLeave = Number(row.unpaid_leave != null ? row.unpaid_leave : (row.unpaidLeave != null ? row.unpaidLeave : 0));
    var totalDeduction = Number(row.total_deduction != null ? row.total_deduction : (row.totalDeduction != null ? row.totalDeduction : 0));
    var netSalary = Number(row.net_salary != null ? row.net_salary : (row.netSalary != null ? row.netSalary : (salary - totalDeduction)));

    var joiningDays = Number(row.joining_days_unpaid != null ? row.joining_days_unpaid : (row.joiningDaysUnpaid || 0));
    var joiningDeduction = Math.round(joiningDays * dailyRate * 100) / 100;

    var lateUnpaid = Math.min(latePenaltyLeave, unpaidLeave);
    var absenceUnpaid = Math.max(0, unpaidLeave - lateUnpaid);

    var lateDeduction = Math.round(lateUnpaid * dailyRate * 100) / 100;
    var absenceDeduction = Math.round(absenceUnpaid * dailyRate * 100) / 100;
    var otherDeduction = Math.round(Math.max(0, totalDeduction - (lateDeduction + absenceDeduction + joiningDeduction)) * 100) / 100;

    var sumDeductions = lateDeduction + absenceDeduction + joiningDeduction + otherDeduction;
    if (Math.abs(sumDeductions - totalDeduction) > 0.01 && totalDeduction > 0) {
      absenceDeduction = Math.round((totalDeduction - lateDeduction - joiningDeduction - otherDeduction) * 100) / 100;
    }

    var rowStatus = String(row.status != null ? row.status : (row.payment_status != null ? row.payment_status : "Paid"));
    var payDate = row.payDate || row.pay_date || row.paymentDate || "";
    var payMode = row.paymentMode || row.payment_mode || "Bank Transfer";
    var payRef = row.paymentReference || row.payment_reference || "";
    var empName = row.staff_name || (row.staff && row.staff.name) || row.name || me;
    var empRole = row.designation || (row.staff && row.staff.role) || row.role || "Teacher";

    var paymentTransferredRow = rowStatus.toLowerCase() === 'paid'
      ? '<div class="pmob-kv-row"><span class="pmob-kv-label">Amount Transferred:</span><span class="pmob-kv-val bold green">' + money(netSalary) + '</span></div>'
      : '<div class="pmob-kv-row"><span class="pmob-kv-label">Amount to be Transferred:</span><span class="pmob-kv-val bold" style="color:#b45309;">' + money(netSalary) + '</span></div>';

    var slipBtn = rowStatus.toLowerCase() === 'paid'
      ? '<button class="btn btn-maroon" id="alBreakdownDownloadBtn" style="width:100%;min-height:44px;margin-top:14px;display:flex;align-items:center;justify-content:center;gap:8px;"><i class="material-icons" style="color:#fff;">download</i> Download Official Salary Slip (PDF)</button>'
      : '';

    var html = '' +
      // 1. Salary Summary
      '<div class="pmob-sec-card">' +
        '<div class="pmob-sec-title"><i class="material-icons">payments</i> 1. Salary Summary</div>' +
        '<div class="pmob-kv-grid">' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Employee Name:</span><span class="pmob-kv-val bold">' + esc(empName) + '</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Designation:</span><span class="pmob-kv-val">' + esc(empRole) + '</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Payroll Month:</span><span class="pmob-kv-val">' + esc(monthLabel(month)) + '</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Monthly Gross Salary:</span><span class="pmob-kv-val bold">' + money(salary) + '</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Calculation Basis:</span><span class="pmob-kv-val" style="font-size:11.5px;color:#64748b;">30 days/month (' + money(dailyRate) + '/day)</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Total Deductions:</span><span class="pmob-kv-val red">' + (totalDeduction > 0 ? ('-' + money(totalDeduction)) : '₹ 0.00') + '</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Final Net Salary:</span><span class="pmob-kv-val bold green">' + money(netSalary) + '</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Payment Status:</span><span class="pmob-kv-val">' + statusBadge(rowStatus) + '</span></div>' +
        '</div>' +
      '</div>' +

      // 2. Monthly Leave Entitlement and Balance
      '<div class="pmob-sec-card">' +
        '<div class="pmob-sec-title"><i class="material-icons">event_available</i> 2. Monthly Leave Entitlement & Balance</div>' +
        '<div class="pmob-kv-grid">' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Annual Leave Entitlement:</span><span class="pmob-kv-val">' + numVal(annualEntitlement) + ' days</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Leaves Used Up to Previous Month:</span><span class="pmob-kv-val">' + numVal(usedPriorMonths) + ' days</span></div>' +
          '<div class="pmob-kv-row" style="background:#f8fafc;padding:6px 8px;border-radius:8px;"><span class="pmob-kv-label" style="font-weight:700;color:#0f172a;">Available Balance at Month Start:</span><span class="pmob-kv-val bold" style="color:#7a151a;">' + numVal(paidOpening) + ' days</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Total Entitlement for Month:</span><span class="pmob-kv-val">' + numVal(paidCredit) + ' days</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Leaves Used During Month:</span><span class="pmob-kv-val" style="color:#b42318;font-weight:700;">' + numVal(paidUsed) + ' days</span></div>' +
          '<div class="pmob-kv-row" style="background:#f0fdf4;padding:6px 8px;border-radius:8px;"><span class="pmob-kv-label" style="font-weight:700;color:#166534;">Remaining Leave Balance:</span><span class="pmob-kv-val bold green">' + numVal(paidBalance) + ' days</span></div>' +
        '</div>' +
        '<div class="pmob-callout"><i class="material-icons">info</i> Employee started ' + esc(monthLabel(month)) + ' with ' + numVal(paidOpening) + ' days available balance.</div>' +
      '</div>' +

      // 3. Actual Leave and Absence Details
      '<div class="pmob-sec-card">' +
        '<div class="pmob-sec-title"><i class="material-icons">rule</i> 3. Actual Leave & Absence Details</div>' +
        '<div class="pmob-kv-grid">' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Total Full-Day Absences:</span><span class="pmob-kv-val">' + fullDayAbsences + (fullDayAbsences === 1 ? ' day' : ' days') + '</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Total Half-Day Absences:</span><span class="pmob-kv-val">' + halfDayAbsences + (halfDayAbsences === 1 ? ' day' : ' days') + (halfDayAbsences > 0 ? (' (' + numVal(halfDayAbsences * 0.5) + ' day equivalent)') : '') + '</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Equivalent Absence Leave:</span><span class="pmob-kv-val bold">' + numVal(absenceLeaveUnits) + (absenceLeaveUnits === 1 ? ' day' : ' days') + '</span></div>' +
          '<div class="pmob-kv-row" style="border-top:1px dashed #e2e8f0;padding-top:6px;margin-top:2px;"><span class="pmob-kv-label">Number of Late Arrivals:</span><span class="pmob-kv-val">' + lateArrivals + (lateArrivals === 1 ? ' day' : ' days') + '</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Late Penalty Leave:</span><span class="pmob-kv-val bold" style="color:#b45309;">' + numVal(latePenaltyLeave) + (latePenaltyLeave === 1 ? ' day' : ' days') + '</span></div>' +
          '<div class="pmob-kv-row" style="background:#fef2f2;padding:6px 8px;border-radius:8px;margin-top:4px;"><span class="pmob-kv-label" style="font-weight:700;color:#991b1b;">Total Leaves Consumed:</span><span class="pmob-kv-val bold red">' + numVal(totalAttendanceLeave) + (totalAttendanceLeave === 1 ? ' day' : ' days') + '</span></div>' +
        '</div>' +
        (isAttendanceOverridden ? '<div class="pmob-callout" style="color:#b45309;"><i class="material-icons">warning</i> Biometric auto was ' + numVal(autoAttendanceLeave) + ' days; manual adjustment applied.</div>' : '<div class="pmob-callout"><i class="material-icons">info</i> 3 late arrivals = 0.5 leave. Absences and late penalties are tracked separately.</div>') +
      '</div>' +

      // 4. Salary Deduction Breakdown
      '<div class="pmob-sec-card">' +
        '<div class="pmob-sec-title"><i class="material-icons">receipt_long</i> 4. Salary Deduction Breakdown</div>' +
        '<div class="pmob-kv-grid">' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Deduction due to Unpaid Absences:</span><span class="pmob-kv-val red">' + (absenceDeduction > 0 ? ('-' + money(absenceDeduction)) : '₹ 0.00') + '</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Deduction due to Late Arrivals:</span><span class="pmob-kv-val red">' + (lateDeduction > 0 ? ('-' + money(lateDeduction)) : '₹ 0.00') + '</span></div>' +
          (joiningDays > 0 ? '<div class="pmob-kv-row"><span class="pmob-kv-label">Mid-Month Joining (' + joiningDays + ' unjoined days):</span><span class="pmob-kv-val red">-' + money(joiningDeduction) + '</span></div>' : '') +
          (otherDeduction > 0 ? '<div class="pmob-kv-row"><span class="pmob-kv-label">Other Deductions / Adjustments:</span><span class="pmob-kv-val red">-' + money(otherDeduction) + '</span></div>' : '') +
          '<div class="pmob-kv-row" style="background:#fff1f2;padding:7px 8px;border-radius:8px;margin-top:4px;"><span class="pmob-kv-label" style="font-weight:800;color:#9f1239;">Total Deductions:</span><span class="pmob-kv-val bold red" style="font-size:15px;">-' + money(totalDeduction) + '</span></div>' +
        '</div>' +
        '<div class="pmob-callout"><i class="material-icons">calculate</i> Total unpaid leave days: ' + numVal(unpaidLeave) + ' days × ' + money(dailyRate) + '/day.</div>' +
      '</div>' +

      // 5. Final Payment Summary
      '<div class="pmob-sec-card">' +
        '<div class="pmob-sec-title"><i class="material-icons">account_balance</i> 5. Final Payment Summary</div>' +
        '<div class="pmob-kv-grid">' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Monthly Gross Salary:</span><span class="pmob-kv-val">' + money(salary) + '</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Total Absence Deduction:</span><span class="pmob-kv-val red">' + (absenceDeduction > 0 ? ('-' + money(absenceDeduction)) : '₹ 0.00') + '</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Total Late Deduction:</span><span class="pmob-kv-val red">' + (lateDeduction > 0 ? ('-' + money(lateDeduction)) : '₹ 0.00') + '</span></div>' +
          (joiningDeduction + otherDeduction > 0 ? '<div class="pmob-kv-row"><span class="pmob-kv-label">Other Deductions:</span><span class="pmob-kv-val red">-' + money(joiningDeduction + otherDeduction) + '</span></div>' : '') +
          '<div class="pmob-kv-row" style="font-weight:700;"><span class="pmob-kv-label">Total Deductions:</span><span class="pmob-kv-val red">-' + money(totalDeduction) + '</span></div>' +
        '</div>' +
        '<div class="pmob-final-total">' +
          '<span class="pmob-final-lbl">Final Net Salary Transferred</span>' +
          '<span class="pmob-final-amt">' + money(netSalary) + '</span>' +
        '</div>' +
        '<div class="pmob-kv-grid" style="margin-top:14px;border-top:1px solid #f1f5f9;padding-top:12px;">' +
          paymentTransferredRow +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Payment Status:</span><span class="pmob-kv-val">' + statusBadge(rowStatus) + '</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Payment Date:</span><span class="pmob-kv-val">' + (payDate ? esc(payDate) : '—') + '</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Payment Mode:</span><span class="pmob-kv-val">' + esc(payMode) + '</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Transaction Reference:</span><span class="pmob-kv-val">' + esc(payRef || '—') + '</span></div>' +
        '</div>' +
        slipBtn +
      '</div>';

    $("alSalaryBreakdownBody").innerHTML = html;

    var dlBtn = $("alBreakdownDownloadBtn");
    if (dlBtn) {
      dlBtn.onclick = function() {
        downloadSlip(row);
      };
    }
  }

  function ensurePdfLibraries() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve();

    function load(src) {
      return new Promise(function (resolve, reject) {
        var script = document.createElement("script");
        script.src = src;
        script.onload = resolve;
        script.onerror = function () { reject(new Error("Could not load the PDF library.")); };
        document.head.appendChild(script);
      });
    }

    return load("https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js")
      .then(function () {
        if (window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API && window.jspdf.jsPDF.API.autoTable) return;
        return load("https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js");
      });
  }

  function downloadSlip(row) {
    var month = String(row && row.payroll_month || "").slice(0, 7);
    ensurePdfLibraries().then(function () {
      return window.generateSalarySlipPDF(row, month);
    }).catch(function (e) {
      alert(e.message || String(e));
    });
  }

  function viewSlip(row) {
    var popup = window.open("", "_blank");
    if (!popup) {
      alert("Please allow pop-ups for this site to view the salary slip.");
      return;
    }

    var month = String(row && row.payroll_month || "").slice(0, 7);
    ensurePdfLibraries().then(function () {
      return window.generateSalarySlipPDF(row, month, { mode: "view", targetWindow: popup });
    }).catch(function (e) {
      try { popup.close(); } catch (_) {}
      alert(e.message || String(e));
    });
  }

  /* ---------------- apply for leave (client-side WhatsApp) ---------------- */
  function openLeave() {
    $("alLeaveDate").value = P.todayIso();
    $("alLeaveReason").value = "";
    composeLeave();
    P.openModal("alLeaveModal");
  }
  function composeLeave() {
    var date = $("alLeaveDate").value, reason = $("alLeaveReason").value.trim();
    $("alLeaveMsg").value = "Respected Principal,\n\nI, " + me + ", request leave on " + (date ? prettyDate(date) : "(date)") +
      (reason ? (" due to " + reason) : "") + ". Kindly grant permission.\n\nThank you.";
  }
  function sendLeave() {
    var msg = $("alLeaveMsg").value.trim();
    if (!msg) { composeLeave(); msg = $("alLeaveMsg").value.trim(); }
    var num = P.CONFIG.PRINCIPAL_WHATSAPP || P.CONFIG.SCHOOL.whatsapp;
    window.open("https://wa.me/" + num + "?text=" + encodeURIComponent(msg), "_blank");
    P.closeModal("alLeaveModal");
  }
})();

/* =========================================================================
   Embedded salary-slip generator
   SAME generator used by Management Payroll and Staff Portal
   ========================================================================= */
(function () {
  "use strict";

  function slipNum(v) {
    var x = Number(v || 0);
    return Number.isInteger(x) ? String(x) : x.toFixed(1).replace(/\.0$/, "");
  }

  function slipMoney(v) {
    return "Rs. " + Number(v || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function slipDate(v) {
    if (!v) return "";
    var p = String(v).slice(0, 10).split("-");
    if (p.length !== 3) return String(v);
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var mi = Number(p[1]) - 1;
    return p[2] + " " + (months[mi] || p[1]) + " " + p[0];
  }

  function slipMonth(v) {
    var p = String(v || "").slice(0, 7).split("-");
    if (p.length !== 2 || !p[0] || !p[1]) return String(v || "");
    var months = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    return (months[Number(p[1]) - 1] || p[1]) + " " + p[0];
  }

  function ones(n) {
    return ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven",
      "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen",
      "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"][n] || "";
  }

  function tens(n) {
    return ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty",
      "Seventy", "Eighty", "Ninety"][n] || "";
  }

  function under1000(n) {
    n = Math.floor(n);
    var s = "";

    if (n >= 100) {
      s += ones(Math.floor(n / 100)) + " Hundred";
      n %= 100;
      if (n) s += " ";
    }

    if (n < 20) {
      s += ones(n);
    } else {
      s += tens(Math.floor(n / 10));
      if (n % 10) s += " " + ones(n % 10);
    }

    return s;
  }

  function amountWords(v) {
    var n = Math.round(Number(v || 0));

    if (n === 0) return "Zero Rupees Only";

    var crore = Math.floor(n / 10000000);
    n %= 10000000;

    var lakh = Math.floor(n / 100000);
    n %= 100000;

    var thousand = Math.floor(n / 1000);
    n %= 1000;

    var parts = [];

    if (crore) parts.push(under1000(crore) + " Crore");
    if (lakh) parts.push(under1000(lakh) + " Lakh");
    if (thousand) parts.push(under1000(thousand) + " Thousand");
    if (n) parts.push(under1000(n));

    return parts.join(" ") + " Rupees Only";
  }

  function imageData(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("Logo unavailable");

      return r.blob();
    }).then(function (blob) {
      return new Promise(function (resolve, reject) {
        var fr = new FileReader();

        fr.onload = function () {
          resolve(fr.result);
        };

        fr.onerror = reject;
        fr.readAsDataURL(blob);
      });
    });
  }

  async function loadHeaderLogo() {
    var candidates = [
      "../assets/images/branding/header-logo.png",
      "assets/images/branding/header-logo.png",
      "/assets/images/branding/header-logo.png",
      "../sapthagiri-website-main/assets/images/branding/header-logo.png",
      "sapthagiri-website-main/assets/images/branding/header-logo.png",
      "/sapthagiri-website-main/assets/images/branding/header-logo.png"
    ];

    for (var i = 0; i < candidates.length; i++) {
      try {
        return await imageData(candidates[i]);
      } catch (e) {}
    }

    return null;
  }

  function setFont(doc, size, color, style) {
    doc.setFont("helvetica", style || "normal");
    doc.setFontSize(size || 9);
    doc.setTextColor(color || "#20252B");
  }

  function text(doc, value, x, y, size, color, style, opts) {
    setFont(doc, size, color, style);
    doc.text(String(value == null ? "" : value), x, y, opts || {});
  }

  function fill(doc, x, y, w, h, color) {
    doc.setFillColor(color);
    doc.rect(x, y, w, h, "F");
  }

  function stroke(doc, x, y, w, h, color, width) {
    doc.setDrawColor(color);
    doc.setLineWidth(width || 0.25);
    doc.rect(x, y, w, h, "S");
  }

  function line(doc, x1, y1, x2, y2, color, width) {
    doc.setDrawColor(color);
    doc.setLineWidth(width || 0.25);
    doc.line(x1, y1, x2, y2);
  }

  function section(doc, title, y, left, width, C) {
    fill(doc, left, y + 0.8, 1.8, 5.4, C.maroon);
    text(doc, title, left + 5, y + 5.0, 7.5, C.maroon, "bold");
    line(doc, left + 52, y + 3.8, left + width, y + 3.8, C.line, 0.35);
    return y + 9;
  }

  function compactPairRow(doc, x, y, w, leftLabel, leftValue,
                          rightLabel, rightValue, C, h) {
    h = h || 8.5;

    var half = w / 2;
    var labelW = 36;

    fill(doc, x, y, labelW, h, C.soft);
    fill(doc, x + half, y, labelW, h, C.soft);

    stroke(doc, x, y, w, h, C.line, 0.22);

    line(doc, x + half, y, x + half, y + h, C.line, 0.22);
    line(doc, x + labelW, y, x + labelW, y + h, C.line, 0.22);
    line(doc, x + half + labelW, y,
      x + half + labelW, y + h, C.line, 0.22);

    text(doc, leftLabel, x + 4, y + 5.5, 6.6, C.muted, "bold");

    text(
      doc,
      leftValue == null || leftValue === "" ? "—" : leftValue,
      x + labelW + 4,
      y + 5.5,
      7.4,
      C.ink,
      "normal"
    );

    if (rightLabel) {
      text(doc, rightLabel, x + half + 4, y + 5.5,
        6.6, C.muted, "bold");

      text(
        doc,
        rightValue == null || rightValue === "" ? "—" : rightValue,
        x + half + labelW + 4,
        y + 5.5,
        7.4,
        C.ink,
        "normal"
      );
    }

    return h;
  }

  function salaryRow(doc, x, y, w, label, value, C, strong) {
    var h = 8.5;

    fill(doc, x, y, w, h, C.softer);
    stroke(doc, x, y, w, h, C.line, 0.22);

    text(doc, label, x + 5, y + 5.5, 6.8, C.muted, "bold");

    text(
      doc,
      value,
      x + w - 5,
      y + 5.5,
      strong ? 8.2 : 7.8,
      strong ? C.maroon : C.ink,
      strong ? "bold" : "normal",
      { align: "right" }
    );

    return h;
  }

  window.generateSalarySlipPDF = async function (row, month, options) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error("PDF library is not loaded. Refresh the page once.");
    }

    /*
     * Staff payroll rows may use either `status` or `payment_status`.
     * Management rows use `status`.
     */
    var rowStatus = String(
      row && (
        row.status != null
          ? row.status
          : row.payment_status != null
            ? row.payment_status
            : ""
      )
    );

    if (!row || rowStatus !== "Paid") {
      throw new Error("Salary is not marked as paid yet.");
    }

    if (typeof window.jspdf.jsPDF !== "function") {
      throw new Error("jsPDF is unavailable.");
    }

    var jsPDF = window.jspdf.jsPDF;

    var doc = new jsPDF({
      unit: "mm",
      format: "a4",
      orientation: "portrait",
      compress: true
    });

    var pageW = 210;
    var pageH = 297;

    var left = 14;
    var right = 196;
    var width = right - left;

    var C = {
      maroon: "#76161D",
      maroonSoft: "#F7F0F1",
      ink: "#252A30",
      muted: "#69727C",
      line: "#D6DBDF",
      soft: "#F3F5F6",
      softer: "#FAFBFB",
      white: "#FFFFFF"
    };

    /*
     * Support both Management payroll rows and Staff payroll rows.
     */
    var name = String(
      (row.staff && row.staff.name) ||
      row.name ||
      row.staff_name ||
      ""
    );

    var role = String(
      (row.staff && row.staff.role) ||
      row.role ||
      row.designation ||
      ""
    );

    var payDate = row.payDate != null
      ? row.payDate
      : (row.pay_date || row.paymentDate || "");

    var payMode = row.paymentMode != null
      ? row.paymentMode
      : (row.payment_mode || "Bank Transfer");

    var payReference = row.paymentReference != null
      ? row.paymentReference
      : (row.payment_reference || "");

    var salary = row.salary != null
      ? row.salary
      : row.monthly_salary;

    var deduction = row.totalDeduction != null
      ? row.totalDeduction
      : row.total_deduction;

    var net = row.netSalary != null
      ? row.netSalary
      : row.net_salary;

    var used = row.paidLeaveUsed != null
      ? row.paidLeaveUsed
      : row.paid_leave_used;

    var balance = row.paidLeaveBalance != null
      ? row.paidLeaveBalance
      : row.paid_leave_balance;

    var opening = row.paidLeaveOpening != null
      ? row.paidLeaveOpening
      : row.paid_leave_opening;

    var unpaid = row.unpaidLeave != null
      ? row.unpaidLeave
      : row.unpaid_leave;

    if (opening == null) {
      opening = Number(balance || 0) + Number(used || 0);
    }

    /*
     * Employee ID
     */
    var rawEmployeeId =
      row.employeeId != null
        ? row.employeeId
        : (
            row.employee_id != null
              ? row.employee_id
              : (
                  row.userId != null
                    ? row.userId
                    : row.user_id
                )
          );

    var employeeId = "";

    if (rawEmployeeId != null && rawEmployeeId !== "") {
      var employeeNumber = Number(rawEmployeeId);

      if (Number.isFinite(employeeNumber) && employeeNumber > 0) {
        employeeId =
          "SHS-EMP-" +
          String(Math.floor(employeeNumber)).padStart(3, "0");
      } else {
        employeeId =
          "SHS-EMP-" +
          String(rawEmployeeId)
            .replace(/[^a-z0-9]/gi, "")
            .slice(-6);
      }
    }

    /*
     * Payment reference is shown only from August 2026 onward,
     * matching the Management payroll slip.
     */
    var payrollKey = String(month || "").slice(0, 7);

    var transactionReference = "Not available";

    if (payrollKey >= "2026-08") {
      transactionReference =
        String(payReference || "").trim() || "Not available";
    }

    fill(doc, 0, 0, pageW, pageH, C.white);

    stroke(doc, 8.5, 8.5, 193, 280, C.line, 0.25);

    /* ================================================================
       HEADER
       ================================================================ */

    var logo = await loadHeaderLogo();

    /*
     * Same aligned header as the Management salary slip.
     *
     * Logo is kept in the upper-left.
     * Salary slip title is aligned to the upper-right.
     * Address is on its own row.
     * Contact and statutory information share the final row.
     */
    if (logo) {
      doc.addImage(
        logo,
        "PNG",
        left,
        13,
        103,
        18,
        undefined,
        "FAST"
      );
    }

    text(
      doc,
      "SALARY SLIP",
      right,
      20.5,
      11.5,
      C.maroon,
      "bold",
      { align: "right" }
    );

    text(
      doc,
      slipMonth(month),
      right,
      27.0,
      7.8,
      C.ink,
      "normal",
      { align: "right" }
    );

    text(
      doc,
      "8-3-311/3, Vemulawada By-Pass Road, Sapthagiri Colony, Karimnagar - 505001",
      left,
      39.5,
      6.9,
      C.ink,
      "normal"
    );

    text(
      doc,
      "9381118421  |  sapthagiri.98@gmail.com  |  www.sapthagirischool.in",
      left,
      44.6,
      6.6,
      C.muted,
      "normal"
    );

    text(
      doc,
      "UDISE 36130790563  |  School Code 22227  |  PAN AAEAS6450K",
      right,
      44.6,
      6.25,
      C.muted,
      "normal",
      { align: "right" }
    );

    line(doc, left, 50.0, right, 50.0, C.maroon, 0.65);

    var y = 57;

    /* ================================================================
       EMPLOYEE INFORMATION
       ================================================================ */

    y = section(
      doc,
      "EMPLOYEE INFORMATION",
      y,
      left,
      width,
      C
    );

    y += compactPairRow(
      doc,
      left,
      y,
      width,
      "Employee",
      name || "—",
      "Designation",
      role || "—",
      C,
      8.5
    );

    y += compactPairRow(
      doc,
      left,
      y,
      width,
      "Employee ID",
      employeeId || "—",
      "Payroll Month",
      slipMonth(month),
      C,
      8.5
    );

    y += compactPairRow(
      doc,
      left,
      y,
      width,
      "Pay Date",
      slipDate(payDate) || "—",
      "Payment Mode",
      payMode || "—",
      C,
      8.5
    );

    y += 5;

    /* ================================================================
       LEAVE SUMMARY
       ================================================================ */

    y = section(
      doc,
      "LEAVE SUMMARY",
      y,
      left,
      width,
      C
    );

    y += compactPairRow(
      doc,
      left,
      y,
      width,
      "Opening Balance",
      slipNum(opening),
      "Paid Leave Used",
      slipNum(used),
      C,
      8.5
    );

    y += compactPairRow(
      doc,
      left,
      y,
      width,
      "Closing Balance",
      slipNum(balance),
      "Unpaid Leave",
      slipNum(unpaid),
      C,
      8.5
    );

    y += 5;

    /* ================================================================
       SALARY DETAILS
       ================================================================ */

    y = section(
      doc,
      "SALARY DETAILS",
      y,
      left,
      width,
      C
    );

    y += salaryRow(
      doc,
      left,
      y,
      width,
      "Monthly Salary",
      slipMoney(salary),
      C,
      false
    );

    y += salaryRow(
      doc,
      left,
      y,
      width,
      "Unpaid Leave Deduction",
      slipMoney(deduction),
      C,
      false
    );

    y += 4;

    fill(
      doc,
      left,
      y,
      width,
      12.5,
      C.maroonSoft
    );

    stroke(
      doc,
      left,
      y,
      width,
      12.5,
      C.maroon,
      0.55
    );

    text(
      doc,
      "NET SALARY PAYABLE",
      left + 6,
      y + 8.0,
      8.0,
      C.maroon,
      "bold"
    );

    text(
      doc,
      slipMoney(net),
      right - 6,
      y + 8.0,
      10.4,
      C.maroon,
      "bold",
      { align: "right" }
    );

    y += 17;

    /* ================================================================
       AMOUNT IN WORDS
       ================================================================ */

    y = section(
      doc,
      "AMOUNT IN WORDS",
      y,
      left,
      width,
      C
    );

    text(
      doc,
      amountWords(net),
      left + 5,
      y + 5.0,
      7.6,
      C.ink,
      "normal"
    );

    line(
      doc,
      left,
      y + 8.5,
      right,
      y + 8.5,
      C.line,
      0.25
    );

    y += 13;

    /* ================================================================
       PAYMENT INFORMATION
       ================================================================ */

    y = section(
      doc,
      "PAYMENT INFORMATION",
      y,
      left,
      width,
      C
    );

    y += compactPairRow(
      doc,
      left,
      y,
      width,
      "Payment Date",
      slipDate(payDate) || "—",
      "Payment Mode",
      payMode || "—",
      C,
      8.5
    );

    y += compactPairRow(
      doc,
      left,
      y,
      width,
      "Transaction Reference",
      transactionReference,
      "",
      "",
      C,
      8.5
    );

    y += 5;

    /* ================================================================
       DECLARATION
       ================================================================ */

    y = section(
      doc,
      "DECLARATION",
      y,
      left,
      width,
      C
    );

    var declaration =
      "This is a computer-generated salary slip issued by Sapthagiri High School E/M. " +
      "The salary details are based on the payroll record for the stated period.";

    var declarationLines =
      doc.splitTextToSize(declaration, width - 10);

    text(
      doc,
      declarationLines,
      left + 5,
      y + 5.0,
      6.9,
      C.muted,
      "normal"
    );

    y += Math.max(1, declarationLines.length) * 3.6 + 8;

    /* ================================================================
       FOOTER
       ================================================================ */

    var footerY = 265;

    line(
      doc,
      left,
      footerY,
      right,
      footerY,
      C.line,
      0.35
    );

    text(
      doc,
      "For Sapthagiri High School E/M",
      left,
      footerY + 7,
      7.4,
      C.ink,
      "bold"
    );

    text(
      doc,
      "Authorised Administration",
      left,
      footerY + 12,
      6.8,
      C.muted,
      "normal"
    );

    var generatedDate = new Date();

    var generatedOn =
      String(generatedDate.getDate()).padStart(2, "0") + " " +
      ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
       "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        [generatedDate.getMonth()] +
      " " +
      generatedDate.getFullYear();

    text(
      doc,
      "Generated " + generatedOn,
      right,
      footerY + 7,
      6.8,
      C.muted,
      "normal",
      { align: "right" }
    );

    var safe =
      name
        .replace(/[^a-z0-9]+/gi, "_")
        .replace(/^_|_$/g, "") || "Staff";

    var fileMonth =
      String(month || "").slice(0, 7) || "Payroll";

    /*
     * Staff Portal already passes:
     * { mode: "view", targetWindow: popup }
     *
     * Keep that behaviour while using exactly the same PDF layout.
     */
    if (options && options.mode === "view") {
      var blobUrl = doc.output("bloburl");
      var target = options.targetWindow;

      if (target && !target.closed) {
        target.location.href = blobUrl;
      } else {
        window.open(blobUrl, "_blank");
      }
    } else {
      doc.save(
        safe + "_" + fileMonth + "_Salary_Slip.pdf"
      );
    }
  };
})();

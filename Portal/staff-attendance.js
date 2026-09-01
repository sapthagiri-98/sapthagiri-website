/* staff-attendance.js — Management Staff Attendance v4.
   Clickable monthly counters, per-employee drill-down, manual attendance corrections,
   manual punches, manual leave, continuous-duty override and biometric refresh. */
(function () {
  "use strict";
  var P = window.Portal, session = P.Session.get();
  if (!session || session.role !== "Management") return;
  session = P.bootPage("stafftrack");
  if (!session) return;

  var esc = P.esc, prettyDate = P.prettyDate, monthLabel = P.monthLabel;
  var $ = function (id) { return document.getElementById(id); };
  var monthCache = {}, current = null, drillDate = "";

  $("view").innerHTML = shell();
  bind();
  loadMonth(P.thisMonth(), false);

  function shell() {
    return '' +
    '<div class="card wide-card">' +
      '<div class="mod-head"><div><span class="eyebrow">Management</span>' +
        '<h2 style="margin-bottom:4px;">Staff Attendance</h2>' +
        '<p class="view-description" style="margin:0;">Biometric attendance with manual correction and employee-level drill-down.</p></div>' +
        '<button class="btn btn-maroon" id="saManual" style="width:auto;padding:10px 16px;"><i class="material-icons" style="color:#fff;">edit_calendar</i> Manual Entry</button>' +
      '</div>' +
      '<div class="mod-toolbar">' +
        '<div class="smart-selector"><div class="ss-icon"><i class="material-icons">calendar_month</i></div>' +
          '<div class="ss-body"><div class="ss-label">Month</div><input type="month" id="saMonth"></div></div>' +
        '<button class="refresh-btn" id="saRefresh"><i class="material-icons" style="font-size:16px;">refresh</i> Refresh Biometric</button>' +
      '</div>' +
      '<div class="timing-line" id="saTiming"></div>' +
      '<div class="legend"><span class="lg"><span class="dot d-green"></span>Present</span><span class="lg"><span class="dot d-orange"></span>Late</span><span class="lg"><span class="dot d-purple"></span>Half day</span><span class="lg"><span class="dot d-red"></span>Absent</span><span class="lg"><span class="dot d-blue"></span>Manual leave</span><span class="lg" style="color:var(--text-muted);">Click a summary number to see its dates and punch times.</span></div>' +
      '<div class="cal-head"><div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div></div>' +
      '<div class="cal-grid" id="saGrid"></div>' +
      '<div class="group-head" style="margin-top:26px;"><i class="material-icons" style="font-size:18px;">summarize</i> Monthly Summary</div>' +
      '<div id="saSummary"></div>' +
    '</div>' + dayModal() + employeeModal() + editModal();
  }

  function dayModal() {
    return '<div class="modal-overlay" id="saDayModal"><div class="modal-content" style="max-width:650px;">' +
      '<div class="modal-header-container"><h3 id="saDayTitle">Staff on this day</h3><button class="modal-close-icon" data-close="saDayModal">&times;</button></div>' +
      '<div class="day-drill-tabs" id="saDayTabs"></div><div id="saDayBody"></div>' +
      '<button class="btn btn-secondary" data-close="saDayModal" style="margin-top:16px;">Close</button></div></div>';
  }

  function employeeModal() {
    return '<div class="modal-overlay" id="saEmployeeModal"><div class="modal-content" style="max-width:760px;">' +
      '<div class="modal-header-container"><h3 id="saEmployeeTitle">Attendance details</h3><button class="modal-close-icon" data-close="saEmployeeModal">&times;</button></div>' +
      '<div id="saEmployeeBody"></div>' +
      '<button class="btn btn-secondary" data-close="saEmployeeModal" style="margin-top:16px;">Close</button></div></div>';
  }

  function editModal() {
    return '<div class="modal-overlay" id="saEditModal"><div class="modal-content" style="max-width:600px;">' +
      '<div class="modal-header-container"><h3 id="saEditTitle">Manual Attendance Entry</h3><button class="modal-close-icon" data-close="saEditModal">&times;</button></div>' +
      '<input type="hidden" id="saEditId"><input type="hidden" id="saEditShiftType">' +
      '<div class="form-group"><label>Employee</label><select id="saEditUser"></select></div>' +
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
    var m = $("saMonth"); m.value = P.thisMonth();
    m.addEventListener("change", function () { loadMonth(m.value, false); });
    $("saRefresh").addEventListener("click", function () { loadMonth($("saMonth").value, true); });
    $("saManual").addEventListener("click", function () { openEditor(); });
    $("saEditType").addEventListener("change", toggleEditFields);
    $("saEditUser").addEventListener("change", function () { updateEditorForUser(Number($("saEditUser").value)); });
    $("saEditSave").addEventListener("click", saveEdit);
    $("saResetDay").addEventListener("click", resetDay);
    Array.prototype.forEach.call(document.querySelectorAll("[data-close]"), function (b) { b.addEventListener("click", function () { P.closeModal(b.getAttribute("data-close")); }); });
    Array.prototype.forEach.call(document.querySelectorAll(".modal-overlay"), function (mm) { mm.addEventListener("click", function (e) { if (e.target === mm) P.closeModal(mm.id); }); });
  }

  function loadMonth(month, force) {
    var key = "staffmon_" + month, t0 = performance.now();
    if (!force) {
      var mem = monthCache[month] || P.Cache.get(key);
      if (mem) { var ms = Math.round(performance.now() - t0); P.perf.record("Load Staff Month", ms, "warm"); showTiming(ms, "warm"); current = mem; render(mem, month); monthCache[month] = mem; return; }
    }
    $("saGrid").innerHTML = '<div class="inline-loader" style="grid-column:span 7;"><i class="material-icons">sync</i>Reading biometric records and manual corrections…</div>';
    $("saSummary").innerHTML = "";
    P.api("getManagementMonthlyBulkPayload", [month], { text: "Loading staff attendance…" }).then(function (res) {
      var ms = Math.round(performance.now() - t0); P.perf.record("Load Staff Month", ms, "cold"); showTiming(ms, "cold");
      if (!res || !res.success) { $("saGrid").innerHTML = '<div class="att-empty" style="grid-column:span 7;"><i class="material-icons">error_outline</i>' + esc((res && res.error) || "Could not load records.") + '</div>'; return; }
      current = res; monthCache[month] = res; P.Cache.set(key, res, P.CONFIG.MONTH_TTL_MS); render(res, month);
    }).catch(function (e) { $("saGrid").innerHTML = '<div class="att-empty" style="grid-column:span 7;"><i class="material-icons">error_outline</i>' + esc(e.message || e) + '</div>'; });
  }
  function showTiming(ms, mode) { var base = P.perf.baseline["Load Staff Month"], el = $("saTiming"); if (mode === "warm" && base) el.innerHTML = "⚡ Loaded from cache in <b>" + ms + " ms</b> — first load was " + base + " ms."; else el.innerHTML = "⏱ Loaded in " + ms + " ms."; }

  function render(res, month) {
    var map = res.calendarMap || {}, keys = Object.keys(map).sort(), grid = $("saGrid");
    if (!keys.length) { grid.innerHTML = '<div class="att-empty" style="grid-column:span 7;"><i class="material-icons">inbox</i>No records for ' + esc(monthLabel(month)) + '.</div>'; }
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
  }

  function renderSummary(rep) {
    var host = $("saSummary");
    if (!rep.length) { host.innerHTML = '<div class="slip-empty">No staff records for this month.</div>'; return; }
    rep = rep.slice().sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
    var rows = rep.map(function (r) {
      return '<tr><td style="font-weight:700;">' + esc(r.name) + '</td><td style="color:var(--text-muted);">' + esc(r.designation || "") + '</td>' +
        '<td class="num">' + countBtn(r.userId, "Present", r.present || 0, "green") + '</td>' +
        '<td class="num">' + countBtn(r.userId, "Late", r.late || 0, "orange") + '</td>' +
        '<td class="num">' + countBtn(r.userId, "HalfDay", r.halfDay || 0, "purple") + '</td>' +
        '<td class="num">' + countBtn(r.userId, "Absent", r.absent || 0, "red") + '</td>' +
        '<td class="num">' + countBtn(r.userId, "Leave", r.leave || 0, "blue") + '</td>' +
        '<td class="num" style="font-weight:800;color:var(--maroon);">' + (Number(r.totalLeaves) || 0) + '</td></tr>';
    }).join("");
    host.innerHTML = '<div class="friendly-wrap"><table class="friendly-table"><thead><tr><th>Name</th><th>Role</th><th style="text-align:center;">Present</th><th style="text-align:center;">Late</th><th style="text-align:center;">Half</th><th style="text-align:center;">Absent</th><th style="text-align:center;">Leave</th><th style="text-align:center;">Leaves Used</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p style="font-size:12px;color:var(--text-muted);margin-top:8px;">Click Present, Late, Half, Absent or Leave to see the exact dates, punch times, late duration and correction source.</p>';
    Array.prototype.forEach.call(host.querySelectorAll("[data-summary]"), function (b) { b.addEventListener("click", function () { openEmployee(Number(b.getAttribute("data-user")), b.getAttribute("data-summary")); }); });
  }
  function countBtn(userId, cat, n, cls) { return '<button type="button" data-summary="' + cat + '" data-user="' + userId + '" class="pill ' + cls + '" style="border:0;cursor:pointer;min-width:36px;">' + n + '</button>'; }

  function openEmployee(userId, category) {
    var rep = (current.summaryReport || []).find(function (r) { return Number(r.userId) === Number(userId); });
    if (!rep) return;
    var bucket = category === "HalfDay" ? "HalfDay" : category, rows = [];
    Object.keys(current.calendarMap || {}).sort().forEach(function (date) {
      var arr = ((current.calendarMap[date] || {})[bucket] || []);
      arr.forEach(function (r) { if (Number(r.userId) === Number(userId)) rows.push({ date: date, r: r }); });
    });
    $("saEmployeeTitle").textContent = rep.name + " — " + ({Present:"Present",Late:"Late",HalfDay:"Half days",Absent:"Absent",Leave:"Leave"}[category] || category);
    if (!rows.length) {
      $("saEmployeeBody").innerHTML = '<div class="slip-empty">No matching dates.</div>';
      P.openModal("saEmployeeModal"); return;
    }
    $("saEmployeeBody").innerHTML = '<div style="max-height:55vh;overflow:auto;">' + rows.map(function (x) {
      var r = x.r, times = 'In ' + esc(r.in1 || "—") + ' · Out ' + esc(r.out1 || "—");
      if (r.in2 || r.out2) times += ' · In2 ' + esc(r.in2 || "—") + ' · Out2 ' + esc(r.out2 || "—");
      var late = Number(r.lateByMinutes) > 0 ? ' · Late by ' + esc(r.lateBy || "0m") + (r.lateSession ? ' (' + esc(r.lateSession) + ')' : '') : '';
      var src = r.attendanceSource === "Manual" || r.source === "manual" ? "Manual" : "Biometric";
      var reason = r.manualReason ? '<div class="meta">Reason: ' + esc(r.manualReason) + '</div>' : '';
      return '<div class="list-row" style="align-items:flex-start;"><div class="idx">' + esc(prettyDate(x.date)) + '</div><div class="who"><div class="nm">' + esc(r.status) + '</div><div class="meta">' + times + late + (r.gaps && r.gaps !== "-" ? ' · ' + esc(r.gaps) : '') + ' · Source: ' + src + '</div>' + reason + '</div><button class="btn btn-secondary" data-edit-date="' + x.date + '" data-edit-user="' + userId + '" style="width:auto;padding:7px 10px;">Edit</button></div>';
    }).join("") + '</div>';
    Array.prototype.forEach.call($("saEmployeeBody").querySelectorAll("[data-edit-date]"), function (b) {
      b.addEventListener("click", function () { P.closeModal("saEmployeeModal"); openEditor(Number(b.getAttribute("data-edit-user")), b.getAttribute("data-edit-date")); });
    });
    P.openModal("saEmployeeModal");
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
      var meta = 'In ' + esc(r.in1 || "—") + ' · Out ' + esc(r.out1 || "—");
      if (r.in2 || r.out2) meta += ' · In2 ' + esc(r.in2 || "—") + ' · Out2 ' + esc(r.out2 || "—");
      if (r.lateBy && r.lateBy !== "-") meta += ' · Late by ' + esc(r.lateBy);
      if (r.gaps && r.gaps !== "-") meta += ' · ' + esc(r.gaps);
      if (r.attendanceSource === "Manual" || r.source === "manual") meta += ' · Manual';
      return '<div class="list-row"><div class="idx">' + (i + 1) + '</div><div class="who"><div class="nm">' + esc(r.name) + '</div><div class="meta">' + esc(r.designation || "") + ' — ' + meta + '</div></div><button class="btn btn-secondary" data-day-edit="' + esc(r.userId) + '" style="width:auto;padding:7px 10px;">Edit</button></div>';
    }).join("");
    Array.prototype.forEach.call($("saDayBody").querySelectorAll("[data-day-edit]"), function (b) { b.addEventListener("click", function () { P.closeModal("saDayModal"); openEditor(Number(b.getAttribute("data-day-edit")), drillDate); }); });
  }

  function populateUsers(selected) {
    var sel = $("saEditUser"), rep = current.staffDirectory || current.summaryReport || [];
    sel.innerHTML = rep.slice().sort(function (a,b) { return String(a.name).localeCompare(String(b.name)); })
      .map(function (r) { return '<option value="' + r.userId + '">' + esc(r.name) + ' — ' + esc(r.designation || '') + '</option>'; }).join("");
    if (selected) sel.value = String(selected);
  }

  function selectedStaff() {
    var uid = Number($("saEditUser").value);
    return (current.staffDirectory || []).find(function (r) { return Number(r.userId) === uid; }) ||
      (current.summaryReport || []).find(function (r) { return Number(r.userId) === uid; }) || null;
  }

  function updateEditorForUser(uid) {
    var st = (current.staffDirectory || []).find(function (r) { return Number(r.userId) === Number(uid); });
    if (!st) return;
    var dual = String(st.shiftType || "").toUpperCase() === "DUAL";
    $("saEditShiftType").value = dual ? "DUAL" : "SINGLE";
    $("saSingleFields").style.display = dual ? "none" : "block";
    $("saDualFields").style.display = dual ? "block" : "none";
    $("saShiftInfo").textContent = dual
      ? "Dual session employee — enter the morning and afternoon punches."
      : "Single session employee — enter the time they came in and went out.";
  }

  function openEditor(userId, date) {
    populateUsers(userId);
    var d = date || P.todayIso(), uid = Number(userId || $("saEditUser").value);
    updateEditorForUser(uid);
    $("saEditId").value = "";
    $("saEditDate").value = d;
    $("saEditType").value = "PUNCH";
    $("saSingleIn").value = ""; $("saSingleOut").value = "";
    $("saMorningIn").value = ""; $("saMorningOut").value = "";
    $("saAfternoonIn").value = ""; $("saAfternoonOut").value = "";
    $("saEditStatus").value = "Present";
    $("saEditReason").value = "";
    toggleEditFields();
    P.openModal("saEditModal");
  }

  function toggleEditFields() {
    var type = $("saEditType").value, punch = type === "PUNCH";
    $("saSingleFields").style.display = "none";
    $("saDualFields").style.display = "none";
    $("saStatusFields").style.display = punch ? "none" : "block";
    if (punch) updateEditorForUser(Number($("saEditUser").value));
    if (type === "LEAVE") $("saEditStatus").value = "Leave";
    if (type === "DUTY") $("saEditStatus").value = "Present";
  }

  function addPunch(arr, session, type, time) {
    if (time) arr.push({ session: session, punchType: type, time: time });
  }

  function saveEdit() {
    var type = $("saEditType").value, uid = Number($("saEditUser").value), date = $("saEditDate").value;
    if (!uid || !date) return alert("Employee and date are required.");
    var st = selectedStaff(), dual = st && String(st.shiftType || "").toUpperCase() === "DUAL";
    var reason = $("saEditReason").value.trim();

    if (type !== "PUNCH") {
      var status = type === "LEAVE" ? "Leave" : "Present";
      var payload = { userId:uid, date:date, entryType:type, statusOverride:status, reason:reason };
      P.api("saveAttendanceAdjustment", [payload], { text:"Saving attendance correction…" })
        .then(function () { P.closeModal("saEditModal"); monthCache = {}; loadMonth($("saMonth").value, true); })
        .catch(function (e) { alert(e.message || e); });
      return;
    }

    var punches = [];
    if (dual) {
      addPunch(punches, "MORNING", "IN", $("saMorningIn").value);
      addPunch(punches, "MORNING", "OUT", $("saMorningOut").value);
      addPunch(punches, "AFTERNOON", "IN", $("saAfternoonIn").value);
      addPunch(punches, "AFTERNOON", "OUT", $("saAfternoonOut").value);
    } else {
      addPunch(punches, "SINGLE", "IN", $("saSingleIn").value);
      addPunch(punches, "SINGLE", "OUT", $("saSingleOut").value);
    }
    if (!punches.length) return alert("Enter at least one punch time.");
    var payload = { userId:uid, date:date, entryType:"PUNCH", punches:punches, reason:reason };
    P.api("saveAttendanceAdjustment", [payload], { text:"Saving attendance correction…" })
      .then(function () { P.closeModal("saEditModal"); monthCache = {}; loadMonth($("saMonth").value, true); })
      .catch(function (e) { alert(e.message || e); });
  }

  function resetDay() {
    var uid = Number($("saEditUser").value), date = $("saEditDate").value;
    if (!uid || !date) return;
    if (!confirm("Remove all manual corrections for this employee on " + prettyDate(date) + " and restore biometric attendance?")) return;
    P.api("clearAttendanceAdjustments", [uid, date], { text:"Restoring biometric attendance…" })
      .then(function () { P.closeModal("saEditModal"); monthCache = {}; loadMonth($("saMonth").value, true); })
      .catch(function (e) { alert(e.message || e); });
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
    dayModal() + leaveModal();
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
          '<button class="slip-btn" type="button" data-slip-action="view" data-slip-index="' + i + '"><i class="material-icons" style="font-size:16px;color:#fff;">visibility</i> View</button>' +
          '<button class="slip-btn maroon" type="button" data-slip-action="download" data-slip-index="' + i + '"><i class="material-icons" style="font-size:16px;color:#fff;">download</i> Download</button>' +
          '</span></div>';
      }).join("");

      Array.prototype.forEach.call(list.querySelectorAll("[data-slip-action]"), function (btn) {
        btn.addEventListener("click", function () {
          var idx = Number(btn.getAttribute("data-slip-index"));
          var action = btn.getAttribute("data-slip-action");
          if (action === "view") viewSlip(slips[idx]);
          else downloadSlip(slips[idx]);
        });
      });
    }).catch(function (e) {
      slipsLoaded = false;
      $("alSlipStatus").className = "pill grey";
      $("alSlipStatus").textContent = "Load failed";
      $("alSlipList").innerHTML = '<div class="slip-empty">' + esc(e.message || "Could not load salary slips.") + '</div>';
    });
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

/* attendance-log.js — My Attendance Log (staff). Plain script; uses `Portal`.
   Backend (unchanged): getTimesheetData(name, "YYYY-MM"),
   getTeacherAvailableSalarySlips(name). Wording simplified for readability.
   Month results are cached (CONFIG.MONTH_TTL_MS) so re-opening a month is
   instant — the console + inline line show the before/after timing. */
(function () {
  "use strict";
  var P = window.Portal;
  var session = P.bootPage("attlog");
  if (!session) return;

  var esc = P.esc, prettyDate = P.prettyDate, monthLabel = P.monthLabel;
  var $ = function (id) { return document.getElementById(id); };
  var me = session.name;
  var calCache = {};       // month -> timesheet payload (in-memory this page)
  var slipsLoaded = false;

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
  function loadSlips() {
    if (slipsLoaded) return;
    P.api("getTeacherAvailableSalarySlips", [me], { overlay: false }).then(function (res) {
      slipsLoaded = true;
      var slips = (res && res.slips) || [], pill = $("alSlipStatus"), list = $("alSlipList");
      if (slips.length === 0) {
        pill.className = "pill grey"; pill.textContent = (res && res.ambiguous) ? "Name clash — ask admin" : "None uploaded yet";
        list.innerHTML = '<div class="slip-empty">' + ((res && res.ambiguous) ? "Multiple staff share your first name. Ask admin to set your full name." : "Salary slips will appear here once uploaded.") + '</div>';
        return;
      }
      pill.className = "pill green"; pill.textContent = slips.length + " available";
      list.innerHTML = slips.map(function (s) {
        return '<div class="slip-row"><span class="m"><i class="material-icons">event</i>' + esc(s.monthLabel) + '</span>' +
          '<span class="acts"><a class="slip-btn" href="' + esc(s.viewUrl) + '" target="_blank" rel="noopener"><i class="material-icons" style="font-size:16px;color:#fff;">visibility</i> View</a>' +
          '<a class="slip-btn maroon" href="' + esc(s.downloadUrl) + '" target="_blank" rel="noopener"><i class="material-icons" style="font-size:16px;color:#fff;">download</i> Download</a></span></div>';
      }).join("");
    }).catch(function () { $("alSlipStatus").textContent = "Load failed"; });
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

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
  var payrollBase = (window.PORTAL_CONFIG || {}).SUPABASE_PAYROLL_BASE || "";
  function payrollApi(fn, args) {
    if (!payrollBase) return Promise.reject(new Error("Payroll endpoint not configured."));
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
      list.innerHTML = slips.map(function (s, i) {
        return '<div class="slip-row"><span class="m"><i class="material-icons">event</i>' + esc(s.monthLabel) + '</span>' +
          '<span class="acts">' +
          '<button class="slip-btn blue" type="button" data-slip-action="breakdown" data-slip-index="' + i + '"><i class="material-icons" style="font-size:16px;color:#fff;">assessment</i> Breakdown</button>' +
          '<a class="slip-btn maroon" href="' + esc(s.downloadUrl) + '" target="_blank" rel="noopener"><i class="material-icons" style="font-size:16px;color:#fff;">download</i> Download</a></span></div>';
      }).join("");

      Array.prototype.forEach.call(list.querySelectorAll("[data-slip-action='breakdown']"), function (btn) {
        btn.addEventListener("click", function () {
          var idx = Number(btn.getAttribute("data-slip-index"));
          viewSalaryBreakdown(slips[idx]);
        });
      });
    }).catch(function () { $("alSlipStatus").textContent = "Load failed"; });
  }

  function viewSalaryBreakdown(slip) {
    if (!slip) return;
    var month = String(slip.month || slip.payroll_month || "").slice(0, 7);
    if (!month && slip.monthLabel) {
      // derive month from monthLabel if needed
      month = P.thisMonth();
    }
    var titleEl = $("alSalaryBreakdownTitle");
    var subEl = $("alSalaryBreakdownSub");
    var bodyEl = $("alSalaryBreakdownBody");
    if (titleEl) titleEl.textContent = "Salary Breakdown · " + (slip.monthLabel || monthLabel(month));
    if (subEl) subEl.textContent = me + " · Detailed computation & attendance report";
    if (bodyEl) bodyEl.innerHTML = '<div class="inline-loader" style="padding:32px 10px;text-align:center;"><i class="material-icons">sync</i>Loading attendance & salary breakdown…</div>';
    P.openModal("alSalaryBreakdownModal");

    var fetchTs = calCache[month] ? Promise.resolve(calCache[month]) : P.api("getTimesheetData", [me, month], { overlay: false }).then(function(d) {
      if (d) calCache[month] = d;
      return d;
    }).catch(function() { return { stats: {} }; });

    var fetchPayroll = payrollApi("payrollMySalary", [month]).catch(function() { return slip; });

    Promise.all([fetchTs, fetchPayroll]).then(function(resArr) {
      var tsData = resArr[0] || {};
      var row = resArr[1] || slip || {};
      renderBreakdownModalContent(row, tsData, month, slip);
    }).catch(function(e) {
      if (bodyEl) bodyEl.innerHTML = '<div class="att-empty" style="padding:24px 10px;text-align:center;"><i class="material-icons">error_outline</i>' + esc(e.message || "Could not load breakdown details.") + '</div>';
    });
  }

  function renderBreakdownModalContent(row, tsData, month, slip) {
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

    var dlHref = (slip && slip.downloadUrl) || (row && row.downloadUrl) || "#";
    var slipBtn = rowStatus.toLowerCase() === 'paid'
      ? '<a class="btn btn-maroon" href="' + esc(dlHref) + '" target="_blank" rel="noopener" style="width:100%;min-height:44px;margin-top:14px;display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;"><i class="material-icons" style="color:#fff;">download</i> Download Official Salary Slip (PDF)</a>'
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

/* =========================================================================
   salary-management.js — Payroll / Salary Management portal
   ========================================================================= */
(function () {
  "use strict";
  var session = null, payrollPassword = "", currentMonth = "", rows = [], staff = [], employees = [], aliasData = { linked: [], unlinked: [] }, editing = null, paying = null;
  var attendanceSummaryMap = {};
  var mobileState = {
    selectedUserId: null,
    searchQuery: "",
    filterStatus: "all"
  };

  function isMobileView() {
    return (window.innerWidth || document.documentElement.clientWidth || 9999) <= 900;
  }
  var C = window.PORTAL_CONFIG || {};
  var BASE = C.SUPABASE_PAYROLL_BASE || "";
  var ANON = C.SUPABASE_ANON || "";
  var USERS_BASE = C.SUPABASE_USERS_BASE || "";

  function esc(v){ return Portal.esc(v == null ? "" : v); }
  function money(v){ return "Rs. " + Number(v||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function n(v){ var x=Number(v||0); return Number.isInteger(x)?String(x):x.toFixed(1).replace(/\.0$/,''); }
  function monthLabel(v){ return Portal.monthLabel(v); }
  function today(){ return new Date().toISOString().slice(0,10); }
  function api(fn,args){
    var s=Portal.Session.get()||{};
    return fetch(BASE,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+ANON,"apikey":ANON,"x-session-token":s.token||""},body:JSON.stringify({fn:fn,args:args||[]})})
      .then(function(r){return r.text()}).then(function(t){var j;try{j=JSON.parse(t)}catch(e){throw new Error("Invalid payroll server response")};if(!j.ok)throw new Error(j.error||"Request failed");return j.data;});
  }
  function setView(html){document.getElementById("view").innerHTML=html;}
  function toast(msg,bad){
    var el=document.getElementById("payrollToast"); if(!el){el=document.createElement("div");el.id="payrollToast";el.style="position:fixed;right:18px;bottom:18px;z-index:10000;padding:12px 15px;border-radius:10px;background:#243042;color:#fff;font-size:13px;box-shadow:0 10px 30px rgba(0,0,0,.2)";document.body.appendChild(el)}
    el.style.background=bad?"#b42318":"#243042";el.textContent=msg;clearTimeout(window.__payrollToast);window.__payrollToast=setTimeout(function(){el.remove()},3500);
  }
  function status(s){var c=s==='Paid'?'paid':s==='Pending'?'pending':'unassigned';return '<span class="status '+c+'">'+esc(s)+'</span>';}

  function ensurePayrollRowStyles(){
    if(document.getElementById("salaryPayrollRowStyles"))return;
    var s=document.createElement("style");
    s.id="salaryPayrollRowStyles";
    s.textContent=
      ".payroll-shell{width:100%;max-width:1440px;margin:0 auto;}"+
      ".payroll-head{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:18px;}"+
      ".payroll-head h1{margin:0 0 5px;font-size:25px;line-height:1.15;}"+
      ".payroll-head p{margin:0;color:#64748b;font-size:13px;}"+
      ".payroll-actions{display:flex;gap:8px;}"+
      ".payroll-toolbar{display:flex;align-items:end;gap:10px;flex-wrap:wrap;padding:14px 16px;margin-bottom:16px;border:1px solid #e2e8f0;border-radius:14px;background:#fff;box-shadow:0 3px 12px rgba(15,23,42,.04);}"+
      ".payroll-toolbar .field{min-width:170px;margin:0;}"+
      ".payroll-toolbar .field label{display:block;margin-bottom:5px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;}"+
      ".payroll-rule{margin-left:auto;display:flex;align-items:center;gap:7px;color:#64748b;font-size:11px;line-height:1.35;max-width:390px;}"+
      ".payroll-rule .material-icons{font-size:17px;color:#94a3b8;}"+
      ".summary-grid{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-bottom:18px;}"+
      ".summary-grid .summary-box{min-height:82px!important;padding:15px 17px!important;border:1px solid #e2e8f0!important;border-radius:14px!important;background:#fff!important;box-shadow:0 3px 12px rgba(15,23,42,.04)!important;}"+
      ".summary-grid .summary-label{font-size:10px!important;font-weight:700!important;letter-spacing:.06em!important;text-transform:uppercase!important;color:#94a3b8!important;}"+
      ".summary-grid .summary-value{margin-top:8px!important;font-size:21px!important;font-weight:800!important;color:#172033!important;}"+
      ".summary-grid .summary-value.deduct{color:#b42318!important;}"+
      ".summary-grid .summary-value.net{color:#237a3b!important;}"+
      ".payroll-list{display:flex;flex-direction:column;gap:12px;}"+
      ".payroll-card.staff-row{display:block!important;padding:0!important;overflow:hidden!important;border:1px solid #e2e8f0!important;border-radius:16px!important;background:#fff!important;box-shadow:0 4px 18px rgba(15,23,42,.05)!important;}"+
      ".staff-row .staff-top{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:14px!important;padding:15px 18px 13px!important;border-bottom:1px solid #eef2f6!important;background:linear-gradient(180deg,#ffffff 0%,#fbfcfe 100%)!important;}"+
      ".staff-row .staff-identity{display:flex!important;align-items:center!important;gap:12px!important;min-width:0!important;}"+
      ".staff-row .staff-index{width:30px!important;height:30px!important;border-radius:9px!important;display:flex!important;align-items:center!important;justify-content:center!important;background:#f1f5f9!important;color:#64748b!important;font-size:12px!important;font-weight:800!important;flex:0 0 30px!important;}"+
      ".staff-row .staff-name{min-width:0!important;}"+
      ".staff-row .staff-name strong{display:block!important;font-size:15px!important;line-height:1.2!important;color:#1e293b!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;}"+
      ".staff-row .staff-name>span{display:block!important;margin-top:3px!important;color:#64748b!important;font-size:11px!important;}"+
      ".staff-row .row-note{display:flex!important;align-items:center!important;gap:4px!important;margin-top:5px!important;color:#b45309!important;font-size:10px!important;}"+
      ".staff-row .row-note .material-icons{font-size:13px!important;}"+
      ".staff-row .row-status{display:flex!important;align-items:center!important;gap:8px!important;flex:0 0 auto!important;}"+
      ".staff-row .row-status small{font-size:10px!important;color:#64748b!important;}"+
      ".staff-row .status{display:inline-flex!important;align-items:center!important;justify-content:center!important;padding:5px 10px!important;border-radius:999px!important;font-size:10px!important;font-weight:800!important;white-space:nowrap!important;}"+
      ".staff-row .payroll-metrics{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:0!important;padding:14px 18px 8px!important;}"+
      ".staff-row .metric{min-width:0!important;padding:5px 15px 10px!important;border-right:1px solid #edf1f5!important;border-bottom:1px solid #edf1f5!important;}"+
      ".staff-row .metric:nth-child(4n){border-right:0!important;}"+
      ".staff-row .metric:nth-last-child(-n+4){border-bottom:0!important;}"+
      ".staff-row .metric span{display:block!important;margin-bottom:5px!important;color:#94a3b8!important;font-size:9px!important;line-height:1.2!important;font-weight:800!important;letter-spacing:.055em!important;text-transform:uppercase!important;white-space:normal!important;}"+
      ".staff-row .metric strong{display:block!important;color:#1e293b!important;font-size:14px!important;line-height:1.25!important;font-weight:800!important;white-space:nowrap!important;}"+
      ".staff-row .metric .deduct{color:#b42318!important;}"+
      ".staff-row .metric .net{color:#237a3b!important;font-size:15px!important;}"+
      ".staff-row .metric small{display:block!important;margin-top:3px!important;color:#b45309!important;font-size:9px!important;line-height:1.1!important;}"+
      ".staff-row .adjustment{font-size:9px!important;margin-left:3px!important;}"+
      ".staff-row .row-actions{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:8px!important;padding:11px 18px 14px!important;border-top:1px solid #eef2f6!important;background:#fafbfc!important;}"+
      ".staff-row .row-actions:before{content:'Payroll actions';margin-right:auto;color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;}"+
      ".staff-row .row-actions .btn{width:auto!important;min-width:88px!important;height:35px!important;padding:7px 13px!important;border-radius:9px!important;}"+
      ".staff-row .row-actions .btn i{font-size:16px!important;}"+
      ".payroll-list .empty-state{padding:42px 20px!important;border:1px dashed #cbd5e1!important;border-radius:14px!important;background:#fff!important;color:#64748b!important;text-align:center!important;}"+
      "@media(max-width:1100px){"+
        ".summary-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;}"+
        ".payroll-rule{width:100%;max-width:none;margin-left:0;}"+
      "}"+
      "@media(max-width:760px){"+
        ".payroll-head{align-items:flex-start;flex-direction:column;}"+
        ".summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;}"+
        ".staff-row .payroll-metrics{grid-template-columns:repeat(2,minmax(0,1fr))!important;padding:10px 12px 4px!important;}"+
        ".staff-row .metric{padding:8px 10px!important;}"+
        ".staff-row .metric:nth-child(4n){border-right:1px solid #edf1f5!important;}"+
        ".staff-row .metric:nth-child(2n){border-right:0!important;}"+
        ".staff-row .metric:nth-last-child(-n+4){border-bottom:1px solid #edf1f5!important;}"+
        ".staff-row .metric:nth-last-child(-n+2){border-bottom:0!important;}"+
        ".staff-row .row-actions{justify-content:flex-start!important;flex-wrap:wrap!important;}"+
        ".staff-row .row-actions:before{width:100%;margin:0 0 2px!important;}"+
      "}"+
      "@media(max-width:480px){"+
        ".summary-grid{grid-template-columns:1fr!important;}"+
        ".staff-row .staff-top{align-items:flex-start!important;flex-direction:column!important;}"+
        ".staff-row .row-status{width:100%!important;justify-content:flex-start!important;}"+
        ".staff-row .row-actions .btn{flex:1 1 auto!important;}"+
      "}"+
      "@media(max-width:900px){"+
        ".pmob-shell{width:100%;max-width:100%;margin:0 auto;padding:0 0 32px;}"+
        ".pmob-header{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:12px 14px;margin-bottom:12px;box-shadow:0 2px 8px rgba(15,23,42,0.03);}"+
        ".pmob-month-nav{display:flex;align-items:center;justify-content:space-between;gap:8px;}"+
        ".pmob-nav-btn{width:40px;height:40px;border-radius:10px;border:1px solid #e2e8f0;background:#f8fafc;color:#1e293b;display:flex;align-items:center;justify-content:center;cursor:pointer;-webkit-tap-highlight-color:transparent;}"+
        ".pmob-nav-btn:active{background:#e2e8f0;}"+
        ".pmob-month-label{position:relative;display:flex;align-items:center;gap:6px;font-size:15px;font-weight:800;color:#7a151a;cursor:pointer;}"+
        ".pmob-month-label input[type='month']{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;}"+
        ".pmob-stats-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;}"+
        ".pmob-stat-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;box-shadow:0 2px 6px rgba(15,23,42,0.02);}"+
        ".pmob-stat-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#64748b;}"+
        ".pmob-stat-val{font-size:17px;font-weight:800;color:#0f172a;margin-top:2px;font-variant-numeric:tabular-nums;}"+
        ".pmob-stat-val.net{color:#15803d;}"+
        ".pmob-stat-val.deduct{color:#b42318;}"+
        ".pmob-search-box{position:relative;margin-bottom:10px;}"+
        ".pmob-search-box i{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:18px;pointer-events:none;}"+
        ".pmob-search-input{width:100%;height:44px;padding:8px 12px 8px 38px;border:1px solid #cbd5e1;border-radius:10px;font-size:13px;background:#fff;box-sizing:border-box;}"+
        ".pmob-filter-pills{display:flex;gap:6px;margin-bottom:12px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:2px;}"+
        ".pmob-pill{padding:7px 13px;border-radius:999px;border:1px solid #e2e8f0;background:#fff;font-size:12px;font-weight:700;color:#64748b;cursor:pointer;white-space:nowrap;}"+
        ".pmob-pill.active{background:#7a151a;color:#fff;border-color:#7a151a;}"+
        ".pmob-staff-list{display:flex;flex-direction:column;gap:10px;}"+
        ".pmob-emp-card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:14px 15px;box-shadow:0 3px 10px rgba(15,23,42,0.03);cursor:pointer;touch-action:manipulation;}"+
        ".pmob-emp-card:active{background:#fafafa;}"+
        ".pmob-emp-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;}"+
        ".pmob-emp-name{font-size:15px;font-weight:800;color:#0f172a;line-height:1.2;}"+
        ".pmob-emp-role{font-size:11px;color:#64748b;margin-top:2px;}"+
        ".pmob-emp-metrics{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;padding-top:10px;border-top:1px solid #f1f5f9;}"+
        ".pmob-metric-label{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;}"+
        ".pmob-metric-val{font-size:14px;font-weight:800;color:#0f172a;margin-top:2px;font-variant-numeric:tabular-nums;}"+
        ".pmob-emp-foot{display:flex;align-items:center;justify-content:space-between;margin-top:10px;font-size:11px;color:#64748b;}"+
        ".pmob-tap-hint{display:flex;align-items:center;color:#7a151a;font-weight:700;font-size:11.5px;}"+
        ".pmob-detail-shell{width:100%;padding:0 0 32px;}"+
        ".pmob-detail-bar{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:12px 14px;margin-bottom:12px;box-shadow:0 2px 8px rgba(15,23,42,0.04);}"+
        ".pmob-top-actions{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;}"+
        ".pmob-back-btn{display:inline-flex;align-items:center;gap:4px;border:1px solid #cbd5e1;background:#fff;color:#7a151a;padding:8px 12px;border-radius:9px;font-size:12px;font-weight:800;cursor:pointer;}"+
        ".pmob-switcher-wrap{margin-bottom:10px;}"+
        ".pmob-switcher-wrap label{display:block;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:4px;}"+
        ".pmob-switcher-select{width:100%;height:42px;padding:0 10px;border:1px solid #cbd5e1;border-radius:10px;font-size:13px;font-weight:700;color:#0f172a;background:#fff;}"+
        ".pmob-detail-month{display:flex;align-items:center;justify-content:space-between;background:#f8fafc;padding:8px 10px;border-radius:10px;border:1px solid #e2e8f0;}"+
        ".pmob-sec-card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:14px 15px;margin-bottom:12px;box-shadow:0 3px 10px rgba(15,23,42,0.03);}"+
        ".pmob-sec-title{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:800;color:#7a151a;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #f1f5f9;}"+
        ".pmob-sec-title i{font-size:17px;color:#7a151a;}"+
        ".pmob-kv-grid{display:flex;flex-direction:column;gap:8px;}"+
        ".pmob-kv-row{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12.5px;}"+
        ".pmob-kv-label{color:#64748b;font-size:12px;}"+
        ".pmob-kv-val{font-weight:700;color:#0f172a;text-align:right;font-variant-numeric:tabular-nums;font-size:12.5px;}"+
        ".pmob-kv-val.bold{font-weight:800;font-size:14px;}"+
        ".pmob-kv-val.green{color:#15803d;}"+
        ".pmob-kv-val.red{color:#b42318;}"+
        ".pmob-highlight-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;margin-top:10px;}"+
        ".pmob-callout{font-size:11px;color:#64748b;line-height:1.4;margin-top:6px;display:flex;align-items:center;gap:4px;}"+
        ".pmob-callout i{font-size:14px;color:#94a3b8;flex:0 0 auto;}"+
        ".pmob-final-total{background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #bbf7d0;border-radius:12px;padding:12px 14px;margin-top:12px;display:flex;align-items:center;justify-content:space-between;}"+
        ".pmob-final-lbl{font-size:12px;font-weight:800;color:#166534;text-transform:uppercase;}"+
        ".pmob-final-amt{font-size:20px;font-weight:900;color:#14532d;font-variant-numeric:tabular-nums;}"+
      "}";
    document.head.appendChild(s);
  }
  function shiftMonth(delta) {
    var p = (currentMonth || new Date().toISOString().slice(0, 7)).split("-"), y = +p[0], m = +p[1];
    var d = new Date(y, m - 1 + delta, 1);
    var targetM = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    loadMonth(targetM);
  }

  function getEmployeePayrollBreakdown(r) {
    if (!r) return null;
    var att = attendanceSummaryMap[String(r.userId)] ||
              attendanceSummaryMap[String(r.name || "").trim().toLowerCase()] || {};

    var salary = Number(r.salary != null ? r.salary : (r.monthly_salary || 0));
    var dailyRate = Number(r.dailyRate || (salary > 0 ? (salary / 30) : 0));

    var annualEntitlement = Number(r.annualLeaveEntitlement != null ? r.annualLeaveEntitlement : (r.annualPaidLeave || 10));
    var paidCredit = Number(r.paidLeaveCredit || 0);
    var paidUsed = Number(r.paidLeaveUsed != null ? r.paidLeaveUsed : (r.paid_leave_used || 0));
    var paidBalance = Number(r.paidLeaveBalance != null ? r.paidLeaveBalance : (r.paid_leave_balance || 0));
    var paidOpening = r.paidLeaveOpening != null ? Number(r.paidLeaveOpening) : (r.paid_leave_opening != null ? Number(r.paid_leave_opening) : (paidBalance + paidUsed));
    var usedPriorMonths = Math.max(0, annualEntitlement - paidOpening);

    var fullDayAbsences = Number(att.absent || 0);
    var halfDayAbsences = Number(att.halfDay || 0);
    var absenceLeaveUnits = (fullDayAbsences * 1.0) + (halfDayAbsences * 0.5);
    var lateArrivals = Number(att.late || 0);

    var latePenaltyLeave = r.latePenaltyLeave != null
      ? Number(r.latePenaltyLeave)
      : (Math.floor(lateArrivals / 3) * 0.5);

    var totalAttendanceLeave = r.attendanceLeave != null
      ? Number(r.attendanceLeave)
      : (absenceLeaveUnits + latePenaltyLeave);

    var isAttendanceOverridden = r.manualAttendanceLeave != null;
    var autoAttendanceLeave = Number(r.automaticAttendanceLeave != null ? r.automaticAttendanceLeave : totalAttendanceLeave);

    var unpaidLeave = Number(r.unpaidLeave != null ? r.unpaidLeave : (r.unpaid_leave || 0));
    var totalDeduction = Number(r.totalDeduction != null ? r.totalDeduction : (r.total_deduction || 0));
    var netSalary = Number(r.netSalary != null ? r.netSalary : (r.net_salary || (salary - totalDeduction)));

    var joiningDays = Number(r.joiningDaysUnpaid || 0);
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

    return {
      employeeName: r.name || "",
      role: r.role || "",
      userId: r.userId,
      status: r.status || "Pending",
      payDate: r.payDate || r.pay_date || "",
      paymentMode: r.paymentMode || r.payment_mode || "Bank Transfer",
      paymentReference: r.paymentReference || r.payment_reference || "",
      paymentComment: r.paymentComment || r.payment_comment || "",
      salary: salary,
      dailyRate: dailyRate,
      totalDeduction: totalDeduction,
      netSalary: netSalary,
      annualEntitlement: annualEntitlement,
      usedPriorMonths: usedPriorMonths,
      paidOpening: paidOpening,
      paidCredit: paidCredit,
      paidUsed: paidUsed,
      paidBalance: paidBalance,
      paidAdjustment: Number(r.paidLeaveAdjustment || 0),
      fullDayAbsences: fullDayAbsences,
      halfDayAbsences: halfDayAbsences,
      absenceLeaveUnits: absenceLeaveUnits,
      lateArrivals: lateArrivals,
      latePenaltyLeave: latePenaltyLeave,
      totalAttendanceLeave: totalAttendanceLeave,
      isAttendanceOverridden: isAttendanceOverridden,
      autoAttendanceLeave: autoAttendanceLeave,
      unpaidLeave: unpaidLeave,
      absenceDeduction: absenceDeduction,
      lateDeduction: lateDeduction,
      joiningDays: joiningDays,
      joiningDeduction: joiningDeduction,
      otherDeduction: otherDeduction,
      transferredAmount: r.status === "Paid" ? netSalary : 0,
      dueAmount: r.status === "Paid" ? 0 : netSalary,
      rawRow: r
    };
  }

  function renderMobilePayroll() {
    if (mobileState.selectedUserId != null) {
      renderMobileDetailView();
    } else {
      renderMobileListView();
    }
  }

  function renderMobileListView() {
    var paid = rows.filter(function(r){ return r.status === 'Paid'; }).length;
    var pending = rows.filter(function(r){ return r.status === 'Pending'; }).length;
    var totalDeduction = rows.reduce(function(a,r){ return a + Number(r.totalDeduction||0); }, 0);
    var totalNet = rows.reduce(function(a,r){ return a + Number(r.netSalary||0); }, 0);

    var html = '<div class="pmob-shell">' +
      '<div class="pmob-header">' +
        '<div class="pmob-month-nav">' +
          '<button class="pmob-nav-btn" id="pmobPrev"><i class="material-icons">chevron_left</i></button>' +
          '<label class="pmob-month-label" title="Tap to pick month">' +
            '<i class="material-icons">calendar_month</i>' +
            '<span>' + esc(monthLabel(currentMonth)) + '</span>' +
            '<input type="month" id="salaryMonth" value="' + esc(currentMonth) + '">' +
          '</label>' +
          '<button class="pmob-nav-btn" id="pmobNext"><i class="material-icons">chevron_right</i></button>' +
        '</div>' +
      '</div>' +
      '<div class="pmob-stats-grid">' +
        '<div class="pmob-stat-card"><div class="pmob-stat-title">Total Net Salary</div><div class="pmob-stat-val net">' + money(totalNet) + '</div></div>' +
        '<div class="pmob-stat-card"><div class="pmob-stat-title">Total Deductions</div><div class="pmob-stat-val deduct">' + money(totalDeduction) + '</div></div>' +
        '<div class="pmob-stat-card"><div class="pmob-stat-title">Paid Staff</div><div class="pmob-stat-val">' + paid + ' / ' + rows.length + '</div></div>' +
        '<div class="pmob-stat-card"><div class="pmob-stat-title">Pending</div><div class="pmob-stat-val">' + pending + '</div></div>' +
      '</div>' +
      '<div class="pmob-search-box">' +
        '<i class="material-icons">search</i>' +
        '<input type="search" class="pmob-search-input mob-search" id="pmobSearch" placeholder="Search teacher or staff member…" value="' + esc(mobileState.searchQuery) + '">' +
      '</div>' +
      '<div class="pmob-filter-pills">' +
        '<button class="pmob-pill ' + (mobileState.filterStatus === "all" ? "active" : "") + '" data-st="all">All (' + rows.length + ')</button>' +
        '<button class="pmob-pill ' + (mobileState.filterStatus === "Paid" ? "active" : "") + '" data-st="Paid">Paid (' + paid + ')</button>' +
        '<button class="pmob-pill ' + (mobileState.filterStatus === "Pending" ? "active" : "") + '" data-st="Pending">Pending (' + pending + ')</button>' +
      '</div>' +
      '<div id="pmobCardsWrap"></div>' +
    '</div>';

    setView(html);

    var prevBtn = document.getElementById("pmobPrev");
    if (prevBtn) prevBtn.onclick = function() { shiftMonth(-1); };
    var nextBtn = document.getElementById("pmobNext");
    if (nextBtn) nextBtn.onclick = function() { shiftMonth(1); };
    var mInp = document.getElementById("salaryMonth");
    if (mInp) mInp.onchange = function() { loadMonth(this.value); };

    function renderMobileCards() {
      var q = (mobileState.searchQuery || "").trim().toLowerCase();
      var filtered = rows.filter(function(r) {
        if (mobileState.filterStatus !== "all" && r.status !== mobileState.filterStatus) return false;
        if (q) {
          var matchName = String(r.name || "").toLowerCase().indexOf(q) >= 0;
          var matchRole = String(r.role || "").toLowerCase().indexOf(q) >= 0;
          if (!matchName && !matchRole) return false;
        }
        return true;
      });

      var wrap = document.getElementById("pmobCardsWrap");
      if (!wrap) return;

      if (!filtered.length) {
        wrap.innerHTML = '<div class="pmob-sec-card" style="text-align:center;padding:34px 16px;color:#64748b;">' +
          '<i class="material-icons" style="font-size:32px;color:#94a3b8;display:block;margin-bottom:6px;">search_off</i>' +
          '<div>No employees match your criteria.</div></div>';
        return;
      }

      wrap.innerHTML = '<div class="pmob-staff-list">' + filtered.map(function(r) {
        var b = getEmployeePayrollBreakdown(r);
        var dedText = b.totalDeduction > 0
          ? '<span style="color:#b42318;font-weight:700;">-' + money(b.totalDeduction) + '</span>'
          : '<span style="color:#64748b;">₹ 0.00</span>';
        return '<article class="pmob-emp-card" data-user="' + esc(b.userId) + '">' +
          '<div class="pmob-emp-head">' +
            '<div><div class="pmob-emp-name">' + esc(b.employeeName) + '</div>' +
            '<div class="pmob-emp-role">' + esc(b.role || 'Staff') + '</div></div>' +
            '<div>' + status(b.status) + '</div>' +
          '</div>' +
          '<div class="pmob-emp-metrics">' +
            '<div><div class="pmob-metric-label">Monthly Salary</div><div class="pmob-metric-val">' + money(b.salary) + '</div></div>' +
            '<div><div class="pmob-metric-label">Net Payable</div><div class="pmob-metric-val net" style="color:#15803d;">' + money(b.netSalary) + '</div></div>' +
          '</div>' +
          '<div class="pmob-emp-foot">' +
            '<div>Deductions: ' + dedText + ' · Bal: <strong>' + n(b.paidBalance) + 'd</strong></div>' +
            '<div class="pmob-tap-hint">Breakdown <i class="material-icons" style="font-size:16px;">chevron_right</i></div>' +
          '</div>' +
        '</article>';
      }).join("") + '</div>';

      Array.prototype.forEach.call(wrap.querySelectorAll(".pmob-emp-card[data-user]"), function(card) {
        card.onclick = function() {
          var uid = Number(card.getAttribute("data-user"));
          mobileState.selectedUserId = uid;
          renderMobileDetailView();
        };
      });
    }

    renderMobileCards();

    var sInp = document.getElementById("pmobSearch");
    if (sInp) {
      sInp.oninput = function() {
        mobileState.searchQuery = this.value;
        renderMobileCards();
      };
    }

    Array.prototype.forEach.call(document.querySelectorAll(".pmob-pill[data-st]"), function(btn) {
      btn.onclick = function() {
        mobileState.filterStatus = btn.getAttribute("data-st");
        Array.prototype.forEach.call(document.querySelectorAll(".pmob-pill[data-st]"), function(b) {
          b.classList.toggle("active", b === btn);
        });
        renderMobileCards();
      };
    });
  }

  function renderMobileDetailView() {
    var r = rows.find(function(x) { return Number(x.userId) === Number(mobileState.selectedUserId); });
    if (!r) {
      mobileState.selectedUserId = null;
      renderMobileListView();
      return;
    }

    var rowIndex = rows.indexOf(r);
    var b = getEmployeePayrollBreakdown(r);

    var employeeOptions = rows.map(function(item) {
      var sel = Number(item.userId) === Number(b.userId) ? " selected" : "";
      return '<option value="' + esc(item.userId) + '"' + sel + '>' + esc(item.name) + ' (' + esc(item.role || 'Staff') + ')</option>';
    }).join("");

    var paymentTransferredRow = b.status === 'Paid'
      ? '<div class="pmob-kv-row"><span class="pmob-kv-label">Amount Already Transferred:</span><span class="pmob-kv-val bold green">' + money(b.transferredAmount) + '</span></div>'
      : '<div class="pmob-kv-row"><span class="pmob-kv-label">Amount to be Transferred:</span><span class="pmob-kv-val bold" style="color:#b45309;">' + money(b.dueAmount) + '</span></div>';

    var slipBtn = b.status === 'Paid'
      ? '<button class="btn btn-primary" id="pmobDownloadSlip" style="width:100%;min-height:46px;margin-top:14px;display:flex;align-items:center;justify-content:center;gap:8px;"><i class="material-icons">download</i> Download Salary Slip (PDF)</button>'
      : '';

    var html = '<div class="pmob-detail-shell">' +
      '<div class="pmob-detail-bar">' +
        '<div class="pmob-top-actions">' +
          '<button class="pmob-back-btn" id="pmobBack"><i class="material-icons">arrow_back</i> Staff List</button>' +
          '<div>' + status(b.status) + '</div>' +
        '</div>' +
        '<div class="pmob-switcher-wrap">' +
          '<label>Selected Employee</label>' +
          '<select class="pmob-switcher-select mob-select" id="pmobSwitcher">' + employeeOptions + '</select>' +
        '</div>' +
        '<div class="pmob-detail-month">' +
          '<button class="pmob-nav-btn" id="pmobDetailPrev"><i class="material-icons">chevron_left</i></button>' +
          '<label class="pmob-month-label" title="Tap to pick month">' +
            '<i class="material-icons">calendar_month</i>' +
            '<span>' + esc(monthLabel(currentMonth)) + '</span>' +
            '<input type="month" id="salaryMonth" value="' + esc(currentMonth) + '">' +
          '</label>' +
          '<button class="pmob-nav-btn" id="pmobDetailNext"><i class="material-icons">chevron_right</i></button>' +
        '</div>' +
      '</div>' +

      // 1. Salary Summary
      '<div class="pmob-sec-card">' +
        '<div class="pmob-sec-title"><i class="material-icons">payments</i> 1. Salary Summary</div>' +
        '<div class="pmob-kv-grid">' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Employee Name:</span><span class="pmob-kv-val bold">' + esc(b.employeeName) + '</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Designation:</span><span class="pmob-kv-val">' + esc(b.role || 'Staff') + '</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Payroll Month:</span><span class="pmob-kv-val">' + esc(monthLabel(currentMonth)) + '</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Total Monthly Salary:</span><span class="pmob-kv-val bold">' + money(b.salary) + '</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Calculation Basis:</span><span class="pmob-kv-val" style="font-size:11.5px;color:#64748b;">30 days/month (' + money(b.dailyRate) + '/day)</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Total Deductions:</span><span class="pmob-kv-val red">' + (b.totalDeduction > 0 ? ('-' + money(b.totalDeduction)) : '₹ 0.00') + '</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Final Net Salary Payable:</span><span class="pmob-kv-val bold green">' + money(b.netSalary) + '</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Payment Status:</span><span class="pmob-kv-val">' + status(b.status) + '</span></div>' +
        '</div>' +
      '</div>' +

      // 2. Monthly Leave Entitlement and Balance
      '<div class="pmob-sec-card">' +
        '<div class="pmob-sec-title"><i class="material-icons">event_available</i> 2. Monthly Leave Entitlement & Balance</div>' +
        '<div class="pmob-kv-grid">' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Annual Leave Entitlement:</span><span class="pmob-kv-val">' + n(b.annualEntitlement) + ' days</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Leaves Used Up to Previous Month:</span><span class="pmob-kv-val">' + n(b.usedPriorMonths) + ' days</span></div>' +
          '<div class="pmob-kv-row" style="background:#f8fafc;padding:6px 8px;border-radius:8px;"><span class="pmob-kv-label" style="font-weight:700;color:#0f172a;">Available Balance at Month Start:</span><span class="pmob-kv-val bold" style="color:#7a151a;">' + n(b.paidOpening) + ' days</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Total Entitlement for Month:</span><span class="pmob-kv-val">' + n(b.paidCredit) + ' days' + (b.paidAdjustment ? (' <small style="color:#b45309;">(' + (b.paidAdjustment>0?'+':'') + n(b.paidAdjustment) + ' adjusted)</small>') : '') + '</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Leaves Used During Month:</span><span class="pmob-kv-val" style="color:#b42318;font-weight:700;">' + n(b.paidUsed) + ' days</span></div>' +
          '<div class="pmob-kv-row" style="background:#f0fdf4;padding:6px 8px;border-radius:8px;"><span class="pmob-kv-label" style="font-weight:700;color:#166534;">Remaining Leave Balance:</span><span class="pmob-kv-val bold green">' + n(b.paidBalance) + ' days</span></div>' +
        '</div>' +
        '<div class="pmob-callout"><i class="material-icons">info</i> Employee started ' + esc(monthLabel(currentMonth)) + ' with ' + n(b.paidOpening) + ' days available balance.</div>' +
      '</div>' +

      // 3. Actual Leave and Absence Details
      '<div class="pmob-sec-card">' +
        '<div class="pmob-sec-title"><i class="material-icons">rule</i> 3. Actual Leave & Absence Details</div>' +
        '<div class="pmob-kv-grid">' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Total Full-Day Absences:</span><span class="pmob-kv-val">' + b.fullDayAbsences + (b.fullDayAbsences === 1 ? ' day' : ' days') + '</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Total Half-Day Absences:</span><span class="pmob-kv-val">' + b.halfDayAbsences + (b.halfDayAbsences === 1 ? ' day' : ' days') + (b.halfDayAbsences > 0 ? (' (' + n(b.halfDayAbsences * 0.5) + ' day equivalent)') : '') + '</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Equivalent Absence Leave:</span><span class="pmob-kv-val bold">' + n(b.absenceLeaveUnits) + (b.absenceLeaveUnits === 1 ? ' day' : ' days') + '</span></div>' +
          '<div class="pmob-kv-row" style="border-top:1px dashed #e2e8f0;padding-top:6px;margin-top:2px;"><span class="pmob-kv-label">Number of Late Arrivals:</span><span class="pmob-kv-val">' + b.lateArrivals + (b.lateArrivals === 1 ? ' day' : ' days') + '</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Late Penalty Leave:</span><span class="pmob-kv-val bold" style="color:#b45309;">' + n(b.latePenaltyLeave) + (b.latePenaltyLeave === 1 ? ' day' : ' days') + '</span></div>' +
          '<div class="pmob-kv-row" style="background:#fef2f2;padding:6px 8px;border-radius:8px;margin-top:4px;"><span class="pmob-kv-label" style="font-weight:700;color:#991b1b;">Total Leaves Consumed:</span><span class="pmob-kv-val bold red">' + n(b.totalAttendanceLeave) + (b.totalAttendanceLeave === 1 ? ' day' : ' days') + '</span></div>' +
        '</div>' +
        (b.isAttendanceOverridden ? '<div class="pmob-callout" style="color:#b45309;"><i class="material-icons">warning</i> Biometric auto was ' + n(b.autoAttendanceLeave) + ' days; manual adjustment applied.</div>' : '<div class="pmob-callout"><i class="material-icons">info</i> 3 late arrivals = 0.5 leave. Absences and late penalties are tracked separately.</div>') +
      '</div>' +

      // 4. Salary Deduction Breakdown
      '<div class="pmob-sec-card">' +
        '<div class="pmob-sec-title"><i class="material-icons">receipt_long</i> 4. Salary Deduction Breakdown</div>' +
        '<div class="pmob-kv-grid">' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Deduction due to Unpaid Absences:</span><span class="pmob-kv-val red">' + (b.absenceDeduction > 0 ? ('-' + money(b.absenceDeduction)) : '₹ 0.00') + '</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Deduction due to Late Arrivals:</span><span class="pmob-kv-val red">' + (b.lateDeduction > 0 ? ('-' + money(b.lateDeduction)) : '₹ 0.00') + '</span></div>' +
          (b.joiningDays > 0 ? '<div class="pmob-kv-row"><span class="pmob-kv-label">Mid-Month Joining (' + b.joiningDays + ' unjoined days):</span><span class="pmob-kv-val red">-' + money(b.joiningDeduction) + '</span></div>' : '') +
          (b.otherDeduction > 0 ? '<div class="pmob-kv-row"><span class="pmob-kv-label">Other Deductions / Adjustments:</span><span class="pmob-kv-val red">-' + money(b.otherDeduction) + '</span></div>' : '') +
          '<div class="pmob-kv-row" style="background:#fff1f2;padding:7px 8px;border-radius:8px;margin-top:4px;"><span class="pmob-kv-label" style="font-weight:800;color:#9f1239;">Total Deductions:</span><span class="pmob-kv-val bold red" style="font-size:15px;">-' + money(b.totalDeduction) + '</span></div>' +
        '</div>' +
        '<div class="pmob-callout"><i class="material-icons">calculate</i> Total unpaid leave days: ' + n(b.unpaidLeave) + ' days × ' + money(b.dailyRate) + '/day.</div>' +
      '</div>' +

      // 5. Final Payment Summary
      '<div class="pmob-sec-card">' +
        '<div class="pmob-sec-title"><i class="material-icons">account_balance</i> 5. Final Payment Summary</div>' +
        '<div class="pmob-kv-grid">' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Monthly Gross Salary:</span><span class="pmob-kv-val">' + money(b.salary) + '</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Total Absence-Related Deduction:</span><span class="pmob-kv-val red">' + (b.absenceDeduction > 0 ? ('-' + money(b.absenceDeduction)) : '₹ 0.00') + '</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Total Late-Related Deduction:</span><span class="pmob-kv-val red">' + (b.lateDeduction > 0 ? ('-' + money(b.lateDeduction)) : '₹ 0.00') + '</span></div>' +
          (b.joiningDeduction + b.otherDeduction > 0 ? '<div class="pmob-kv-row"><span class="pmob-kv-label">Other Applicable Deductions:</span><span class="pmob-kv-val red">-' + money(b.joiningDeduction + b.otherDeduction) + '</span></div>' : '') +
          '<div class="pmob-kv-row" style="font-weight:700;"><span class="pmob-kv-label">Total Deduction:</span><span class="pmob-kv-val red">-' + money(b.totalDeduction) + '</span></div>' +
        '</div>' +
        '<div class="pmob-final-total">' +
          '<span class="pmob-final-lbl">Final Net Salary Payable</span>' +
          '<span class="pmob-final-amt">' + money(b.netSalary) + '</span>' +
        '</div>' +
        '<div class="pmob-kv-grid" style="margin-top:14px;border-top:1px solid #f1f5f9;padding-top:12px;">' +
          paymentTransferredRow +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Payment Status:</span><span class="pmob-kv-val">' + status(b.status) + '</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Payment Date:</span><span class="pmob-kv-val">' + (b.payDate ? esc(b.payDate) : 'Not paid yet') + '</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Payment Mode:</span><span class="pmob-kv-val">' + esc(b.paymentMode || 'Bank Transfer') + '</span></div>' +
          '<div class="pmob-kv-row"><span class="pmob-kv-label">Transaction Reference:</span><span class="pmob-kv-val">' + esc(b.paymentReference || 'Not available') + '</span></div>' +
        '</div>' +
        slipBtn +
      '</div>' +
    '</div>';

    setView(html);

    document.getElementById("pmobBack").onclick = function() {
      mobileState.selectedUserId = null;
      renderMobileListView();
    };

    document.getElementById("pmobSwitcher").onchange = function() {
      mobileState.selectedUserId = Number(this.value);
      renderMobileDetailView();
    };

    var prevBtn = document.getElementById("pmobDetailPrev");
    if (prevBtn) prevBtn.onclick = function() { shiftMonth(-1); };
    var nextBtn = document.getElementById("pmobDetailNext");
    if (nextBtn) nextBtn.onclick = function() { shiftMonth(1); };
    var mInp = document.getElementById("salaryMonth");
    if (mInp) mInp.onchange = function() { loadMonth(this.value); };

    var dlBtn = document.getElementById("pmobDownloadSlip");
    if (dlBtn) dlBtn.onclick = function() { download(rowIndex); };
  }

  function render(){
    if (isMobileView()) {
      renderMobilePayroll();
      return;
    }
    var paid=rows.filter(function(r){return r.status==='Paid'}).length;
    var pending=rows.filter(function(r){return r.status==='Pending'}).length;
    var unassigned=rows.filter(function(r){return r.status==='Unassigned'}).length;
    var unpaid=rows.reduce(function(a,r){return a+Number(r.unpaidLeave||0)},0);
    var deduction=rows.reduce(function(a,r){return a+Number(r.totalDeduction||0)},0);
    var net=rows.reduce(function(a,r){return a+Number(r.netSalary||0)},0);
    setView('<div class="payroll-shell">'+
      '<div class="payroll-head"><div><h1>Payroll Management</h1><p>Salary calculation, leave deduction, payment and salary slips.</p></div><div class="payroll-actions"><button class="btn btn-light" id="refreshBtn"><i class="material-icons">refresh</i>Refresh</button></div></div>'+
      '<div class="tabs"><button class="tab active" id="monthlyTab">Monthly Payroll</button><button class="tab" id="assignmentTab">Salary Assignments</button><button class="tab" id="employeesTab"><i class="material-icons" style="font-size:16px;vertical-align:-3px">manage_accounts</i> Manage Employees</button></div>'+
      '<div id="payrollContent">'+monthlyHtml(paid,pending,unassigned,unpaid,deduction,net)+'</div>'+
      '</div>');
    document.getElementById("refreshBtn").onclick=loadMonth;
    document.getElementById("monthlyTab").onclick=function(){this.classList.add("active");document.getElementById("assignmentTab").classList.remove("active");document.getElementById("employeesTab").classList.remove("active");render()};
    document.getElementById("assignmentTab").onclick=renderAssignments;
    document.getElementById("employeesTab").onclick=async function(){
      this.classList.add("active");
      document.getElementById("monthlyTab").classList.remove("active");
      document.getElementById("assignmentTab").classList.remove("active");
      Portal.overlay(true, "Loading employees…");
      try { await loadEmployees(); renderEmployees(); } catch(e){ toast(e.message||String(e), true); } finally { Portal.overlay(false); }
    };
    bindMonthly();
  }
  function monthlyHtml(paid,pending,unassigned,unpaid,deduction,net){
    var staffCount=rows.length;
    var html='<div class="payroll-toolbar">'+
      '<div class="field"><label>Salary Month</label><input id="salaryMonth" type="month" value="'+esc(currentMonth)+'"></div>'+
      '<button class="btn btn-primary" id="loadMonthBtn"><i class="material-icons">calendar_month</i>Load Month</button>'+
      '<button class="btn btn-light" id="refetchLeavesBtn" title="Clear payroll leave overrides and reload the latest attendance leaves"><i class="material-icons">sync</i>Refetch Leaves</button>'+
      '<div class="payroll-rule"><i class="material-icons">info</i>3 late arrivals = 0.5 leave · unpaid deduction = salary ÷ 30 × unpaid days</div>'+
      '</div>'+
      '<div class="summary-grid">'+
      '<div class="payroll-card summary-box"><div class="summary-label">Staff</div><div class="summary-value">'+staffCount+'</div></div>'+
      '<div class="payroll-card summary-box"><div class="summary-label">Paid</div><div class="summary-value">'+paid+'</div></div>'+
      '<div class="payroll-card summary-box"><div class="summary-label">Pending</div><div class="summary-value">'+pending+'</div></div>'+
      '<div class="payroll-card summary-box"><div class="summary-label">Total Deductions</div><div class="summary-value deduct">'+money(deduction)+'</div></div>'+
      '<div class="payroll-card summary-box total-net"><div class="summary-label">Total Net Salary</div><div class="summary-value net">'+money(net)+'</div></div>'+
      '</div>';

    html+='<div class="payroll-list">';
    if(!rows.length){
      html+='<div class="payroll-card empty-state"><i class="material-icons">payments</i><div>No salary assignments for this month.</div></div>';
    }

    rows.forEach(function(r,i){
      var adj = Number(r.paidLeaveAdjustment||0);
      var adjText = adj ? '<span class="adjustment '+(adj>0?'positive':'negative')+'">'+(adj>0?'+':'')+n(adj)+' adjusted</span>' : '';
      var joining = Number(r.joiningDaysUnpaid||0)>0
        ? '<div class="row-note"><i class="material-icons">event</i>Joined '+esc(r.joiningDate||'')+' · '+n(r.joiningDaysUnpaid)+' non-employed days</div>'
        : '';
      var attendanceSource = r.manualAttendanceLeave!=null
        ? '<small>Auto '+n(r.automaticAttendanceLeave)+'</small>'
        : '';

      html+='<article class="payroll-card staff-row">'+
        '<div class="staff-top">'+
          '<div class="staff-identity">'+
            '<div class="staff-index">'+(i+1)+'</div>'+
            '<div class="staff-name"><strong>'+esc(r.name)+'</strong><span>'+esc(r.role||'')+'</span>'+joining+'</div>'+
          '</div>'+
          '<div class="row-status">'+status(r.status)+(r.payDate?'<small>Paid '+esc(r.payDate)+'</small>':'')+'</div>'+
        '</div>'+
        '<div class="payroll-metrics">'+
          '<div class="metric"><span>Actual Salary</span><strong>'+money(r.salary)+'</strong></div>'+
          '<div class="metric"><span>Leave Credit</span><strong>'+n(r.paidLeaveCredit)+' '+adjText+'</strong></div>'+
          '<div class="metric"><span>Attendance Leave</span><strong>'+n(r.attendanceLeave)+attendanceSource+'</strong></div>'+
          '<div class="metric"><span>Used Paid</span><strong>'+n(r.paidLeaveUsed)+'</strong></div>'+
          '<div class="metric"><span>Balance</span><strong>'+n(r.paidLeaveBalance)+'</strong></div>'+
          '<div class="metric"><span>Unpaid</span><strong>'+n(r.unpaidLeave)+'</strong></div>'+
          '<div class="metric"><span>Deduction</span><strong class="deduct">'+money(r.totalDeduction)+'</strong></div>'+
          '<div class="metric"><span>Net Salary</span><strong class="net">'+money(r.netSalary)+'</strong></div>'+
        '</div>'+
        '<div class="row-actions">'+
          (r.status==='Paid'
            ? '<button class="btn btn-light mini" onclick="SalaryPayroll.editPaidDetails('+i+')"><i class="material-icons">edit_note</i>Edit Pay Details</button>'+
              '<button class="btn btn-primary mini" onclick="SalaryPayroll.download('+i+')"><i class="material-icons">download</i>Salary Slip</button>'
            : '<button class="btn btn-light mini" onclick="SalaryPayroll.edit('+i+')"><i class="material-icons">edit</i>Edit</button>'+
              '<button class="btn btn-light mini" onclick="SalaryPayroll.adjustLeave('+i+')"><i class="material-icons">add_circle</i>Leave</button>'+
              '<button class="btn btn-success mini" onclick="SalaryPayroll.pay('+i+')"><i class="material-icons">payments</i>Pay</button>')+
        '</div>'+
      '</article>';
    });

    html+='</div>';
    return html;
  }
  function bindMonthly(){
    var inp=document.getElementById("salaryMonth"), btn=document.getElementById("loadMonthBtn"), refetch=document.getElementById("refetchLeavesBtn");
    if(btn)btn.onclick=function(){currentMonth=inp.value||currentMonth;loadMonth()};
    if(refetch)refetch.onclick=refetchLeaves;
  }

  async function refetchLeaves(){
    currentMonth=(document.getElementById("salaryMonth")||{}).value||currentMonth;
    if(!currentMonth)return;

    var ok=window.confirm(
      "Refetch the attendance leaves for " + monthLabel(currentMonth) + "?\n\n" +
      "This will clear payroll leave overrides for unpaid/pending rows and use the latest attendance data. " +
      "Already Paid salaries will not be changed."
    );
    if(!ok)return;

    var b=document.getElementById("refetchLeavesBtn");
    try{
      if(b)b.disabled=true;
      Portal.overlay(true,"Refetching attendance leaves…");
      var result=await api("payrollRefetchLeaves",[currentMonth]);
      toast(result && result.message ? result.message : "Attendance leaves refetched.");
      await loadMonth();
    }catch(e){
      toast(e.message||String(e),true);
    }finally{
      if(b)b.disabled=false;
      Portal.overlay(false);
    }
  }
  async function loadMonth(targetMonth){
    if (targetMonth) {
      currentMonth = targetMonth;
    } else {
      var mInp = document.getElementById("salaryMonth");
      if (mInp && mInp.value) currentMonth = mInp.value;
      else if (!currentMonth) currentMonth = new Date().toISOString().slice(0, 7);
    }
    var mInp = document.getElementById("salaryMonth");
    if (mInp) mInp.value = currentMonth;
    try{
      Portal.overlay(true,"Loading payroll…");
      var pJobs = [
        api("payrollBootstrap",[currentMonth,payrollPassword]),
        Portal.api("getManagementMonthlyBulkPayload",[currentMonth],{overlay:false}).catch(function(){ return null; })
      ];
      var res = await Promise.all(pJobs);
      var data = res[0] || {};
      var saData = res[1];
      rows = data.rows || [];
      attendanceSummaryMap = {};
      if (saData && Array.isArray(saData.summaryReport)) {
        saData.summaryReport.forEach(function(item) {
          if (item.userId) attendanceSummaryMap[String(item.userId)] = item;
          if (item.name) attendanceSummaryMap[String(item.name).trim().toLowerCase()] = item;
        });
      }
      render();
    }catch(e){toast(e.message||String(e),true)}finally{Portal.overlay(false)}
  }
  function renderAssignments(){
    document.getElementById("monthlyTab").classList.remove("active");
    document.getElementById("assignmentTab").classList.add("active");

    var assigned=staff.filter(function(u){return u.assignment;});
    var html='<div class="payroll-card assignment-panel"><div class="assignment-head">'+
      '<div><strong>Salary Assignments</strong><div class="muted">Effective-dated salary history. Use a new assignment for increments, decrements, joining and leaving dates.</div></div>'+
      '<button class="btn btn-primary" id="newAssignment"><i class="material-icons">add</i>New / Revised Assignment</button></div>'+
      '<div class="assignment-grid">';

    if(!assigned.length){
      html+='<div class="empty-state"><i class="material-icons">person_off</i><div>No active payroll assignments.</div></div>';
    }

    assigned.forEach(function(u){
      var a=u.assignment;
      html+='<div class="assignment-item">'+
        '<div class="assignment-person"><strong>'+esc(u.name)+'</strong><span>'+esc(u.role||'')+'</span></div>'+
        '<div><span class="assignment-label">Salary</span><strong>'+money(a.monthlySalary)+'</strong></div>'+
        '<div><span class="assignment-label">Annual Leave</span><strong>'+n(a.annualPaidLeave)+'</strong></div>'+
        '<div><span class="assignment-label">Effective</span><strong>'+esc(a.effectiveFrom||'—')+'</strong></div>'+
        '<div><span class="assignment-label">Until</span><strong>'+esc(a.effectiveTo||'Current')+'</strong></div>'+
        '<div class="assignment-note">'+esc(a.notes||'')+'</div>'+
      '</div>';
    });

    html+='</div></div>';
    document.getElementById("payrollContent").innerHTML=html;
    document.getElementById("newAssignment").onclick=showAssignmentModal;
  }
  function showAssignmentModal(){
    var names=staff.map(function(u){return '<option value="'+esc(u.id)+'">'+esc(u.name)+' · '+esc(u.role||'')+'</option>'}).join('');
    var m=document.createElement('div');m.className='modal-backdrop show';m.id='assignmentModalTemp';m.innerHTML='<div class="modal"><h2>Salary Assignment</h2><p>Effective-dated assignment for one staff member.</p><div class="form-grid"><div class="field full"><label>Staff Member</label><select id="aUser">'+names+'</select></div><div class="field"><label>Monthly Salary (₹)</label><input id="aSalary" type="number" min="0" step="0.01"></div><div class="field"><label>Annual Paid Leave</label><input id="aLeave" type="number" min="0" step="0.5" value="10"></div><div class="field"><label>Joining Date</label><input id="aJoin" type="date"></div><div class="field"><label>Effective From</label><input id="aFrom" type="date" value="'+today()+'"></div><div class="field"><label>Effective To (optional)</label><input id="aTo" type="date"></div><div class="field full"><label>Notes</label><textarea id="aNotes" rows="2"></textarea></div></div><div class="modal-footer"><button class="btn btn-light" id="aCancel">Cancel</button><button class="btn btn-primary" id="aSave">Save Assignment</button></div></div>';
    document.body.appendChild(m);m.querySelector('#aCancel').onclick=function(){m.remove()};m.querySelector('#aSave').onclick=async function(){var b=this;try{b.disabled=true;await api('payrollSaveAssignment',[{userId:Number(m.querySelector('#aUser').value),monthlySalary:Number(m.querySelector('#aSalary').value),annualPaidLeave:Number(m.querySelector('#aLeave').value),joiningDate:m.querySelector('#aJoin').value,effectiveFrom:m.querySelector('#aFrom').value,effectiveTo:m.querySelector('#aTo').value,notes:m.querySelector('#aNotes').value}]);toast('Salary assignment saved.');m.remove();await loadMonth()}catch(e){toast(e.message,true)}finally{b.disabled=false}};
  }
  function adjustLeave(i){
    var r=rows[i];
    var m=document.createElement('div');
    m.className='modal-backdrop show';
    m.innerHTML='<div class="modal"><h2>Adjust Paid Leave</h2><p><strong>'+esc(r.name)+'</strong> · '+monthLabel(currentMonth)+'</p>'+
      '<div class="form-grid">'+
      '<div class="field"><label>Adjustment (days)</label><input id="leaveAdjustValue" type="number" step="0.5" placeholder="+1 or -1"></div>'+
      '<div class="field"><label>Current Credit</label><input type="text" value="'+n(r.paidLeaveCredit)+' days" disabled></div>'+
      '<div class="field full"><label>Reason</label><textarea id="leaveAdjustReason" rows="3" placeholder="Example: Additional 1 paid leave credited by management"></textarea></div>'+
      '</div>'+
      '<div class="adjustment-note"><i class="material-icons">history</i>This adjustment is stored in payroll history with the reason and user who made it.</div>'+
      '<div class="modal-footer"><button class="btn btn-light" id="leaveAdjustCancel">Cancel</button><button class="btn btn-primary" id="leaveAdjustSave">Save Adjustment</button></div></div>';

    document.body.appendChild(m);
    m.querySelector('#leaveAdjustCancel').onclick=function(){m.remove()};
    m.querySelector('#leaveAdjustSave').onclick=async function(){
      var b=this, value=Number(m.querySelector('#leaveAdjustValue').value||0), reason=m.querySelector('#leaveAdjustReason').value.trim();
      if(!value){toast('Enter a leave adjustment such as +1 or -1.',true);return}
      if(!reason){toast('A reason is required.',true);return}
      try{
        b.disabled=true;
        await api('payrollAdjustLeave',[{userId:r.userId,month:currentMonth,value:value,reason:reason}]);
        toast('Paid-leave adjustment recorded.');
        m.remove();
        await loadMonth();
      }catch(e){toast(e.message||String(e),true)}finally{b.disabled=false}
    };
  }

  function ensureAttendanceLeaveEditor(r){
    var input=document.getElementById("editAttendanceLeave");
    if(!input){
      var unpaid=document.getElementById("editUnpaid");
      if(!unpaid)return;
      var anchor=unpaid.closest(".field") || unpaid.parentElement;
      var field=document.createElement("div");
      field.className="field";
      field.innerHTML=
        '<label>Final Attendance Leave (days)</label>'+
        '<input id="editAttendanceLeave" type="number" min="0" step="0.5">'+
        '<div id="editAttendanceLeaveNote" class="muted" style="margin-top:5px;font-size:12px;"></div>'+
        '<button type="button" class="btn btn-light mini" id="editAttendanceReset" style="margin-top:7px;">Use Automatic</button>';
      anchor.parentNode.insertBefore(field,anchor);
      input=document.getElementById("editAttendanceLeave");
      document.getElementById("editAttendanceReset").onclick=function(){
        var auto=Number(input.getAttribute("data-auto")||0);
        input.value=auto;
        input.setAttribute("data-manual","false");
      };
      input.addEventListener("input",function(){input.setAttribute("data-manual","true");});
    }

    var auto=Number(r.automaticAttendanceLeave==null?r.attendanceLeave:r.automaticAttendanceLeave);
    var finalValue=r.manualAttendanceLeave==null?Number(r.attendanceLeave||0):Number(r.manualAttendanceLeave);
    input.value=finalValue;
    input.setAttribute("data-auto",String(auto));
    input.setAttribute("data-manual",r.manualAttendanceLeave==null?"false":"true");

    var note=document.getElementById("editAttendanceLeaveNote");
    if(note){
      note.textContent="Automatic attendance: "+n(auto)+" days. Change this only when management confirms a biometric/attendance correction.";
    }
  }

  function edit(i){
    editing=i;
    var r=rows[i];
    document.getElementById('editEmployee').textContent=r.name+' · '+monthLabel(currentMonth);
    ensureAttendanceLeaveEditor(r);
    document.getElementById('editUnpaid').value=r.manualUnpaidLeave==null?r.unpaidLeave:r.manualUnpaidLeave;
    document.getElementById('editDeduction').value=r.manualDeduction==null?'':r.manualDeduction;
    document.getElementById('editNet').value=r.manualNetSalary==null?'':r.manualNetSalary;
    document.getElementById('editMode').value=r.paymentMode||'Bank Transfer';
    document.getElementById('editComment').value=r.paymentComment||'';
    document.getElementById('editModal').classList.add('show');
  }

  function closeEdit(){
    document.getElementById('editModal').classList.remove('show');
    editing=null;
  }

  async function saveEdit(){
    var r=rows[editing];
    var leaveInput=document.getElementById('editAttendanceLeave');
    var finalAttendance=Number(leaveInput && leaveInput.value !== '' ? leaveInput.value : r.attendanceLeave);
    var autoAttendance=Number(r.automaticAttendanceLeave==null?r.attendanceLeave:r.automaticAttendanceLeave);
    var unpaid=Number(document.getElementById('editUnpaid').value||0);
    var dedRaw=document.getElementById('editDeduction').value;
    var netRaw=document.getElementById('editNet').value;
    var comment=document.getElementById('editComment').value.trim();

    if(!Number.isFinite(finalAttendance) || finalAttendance<0){
      toast('Final attendance leave cannot be negative.',true);
      return;
    }

    finalAttendance=Math.round(finalAttendance*2)/2;
    var attendanceChanged=Math.abs(finalAttendance-Number(r.attendanceLeave||0))>0.001;
    var manualLeaveOverride=Math.abs(finalAttendance-autoAttendance)>0.001 ? finalAttendance : null;

    if((dedRaw!==''||netRaw!==''||unpaid!==Number(r.calculatedUnpaidLeave)||attendanceChanged)&&!comment){
      toast('Enter a reason for changing the calculated payroll.',true);
      return;
    }

    var paidUsed=Math.max(0,finalAttendance-unpaid);
    var balance=Math.max(0,Number(r.paidLeaveCredit||0)-paidUsed);
    var manualUnpaidValue=(r.manualUnpaidLeave!=null || unpaid!==Number(r.unpaidLeave||0)) ? unpaid : null;
    var deduction=dedRaw===''?unpaid*Number(r.salary||0)/30:Number(dedRaw);
    var net=netRaw===''?Number(r.salary||0)-deduction:Number(netRaw);

    try{
      await api('payrollSaveRow',[{
        month:currentMonth,
        userId:r.userId,
        salary:r.salary,
        annualLeaveEntitlement:r.annualLeaveEntitlement,
        paidLeaveCredit:r.paidLeaveCredit,
        paidLeaveUsed:paidUsed,
        manualAttendanceLeave:manualLeaveOverride,
        paidLeaveBalance:balance,
        calculatedUnpaidLeave:r.calculatedUnpaidLeave,
        manualUnpaidLeave:manualUnpaidValue,
        unpaidLeave:unpaid,
        dailyRate:r.dailyRate,
        calculatedDeduction:r.calculatedDeduction,
        manualDeduction:dedRaw===''?null:Number(dedRaw),
        totalDeduction:deduction,
        calculatedNetSalary:r.calculatedNetSalary,
        manualNetSalary:netRaw===''?null:Number(netRaw),
        netSalary:net,
        joiningDate:r.joiningDate,
        joiningDaysUnpaid:r.joiningDaysUnpaid,
        latePenaltyLeave:r.latePenaltyLeave
      }]);
      toast('Payroll changes saved.');
      closeEdit();
      await loadMonth();
    }catch(e){
      toast(e.message||String(e),true);
    }
  }

  function pay(i){paying=i;var r=rows[i];document.getElementById('payEmployee').textContent=r.name+' · '+monthLabel(currentMonth);document.getElementById('payAmount').value=Number(r.netSalary||0).toFixed(2);document.getElementById('payDate').value=today();document.getElementById('payMode').value=r.paymentMode||'Bank Transfer';document.getElementById('payReference').value='';document.getElementById('payComment').value='';document.getElementById('payModal').classList.add('show');}
  function closePay(){document.getElementById('payModal').classList.remove('show');paying=null;}
  async function confirmPay(){var r=rows[paying], amount=Number(document.getElementById('payAmount').value||0), comment=document.getElementById('payComment').value.trim();if(Math.abs(amount-Number(r.netSalary||0))>0.005&&!comment){toast('Comment is required when changing the salary amount.',true);return}var b=document.getElementById('confirmPayBtn');try{b.disabled=true;await api('payrollSaveRow',[{month:currentMonth,userId:r.userId,salary:r.salary,annualLeaveEntitlement:r.annualLeaveEntitlement,paidLeaveCredit:r.paidLeaveCredit,paidLeaveUsed:r.paidLeaveUsed,paidLeaveBalance:r.paidLeaveBalance,calculatedUnpaidLeave:r.calculatedUnpaidLeave,manualUnpaidLeave:r.manualUnpaidLeave,unpaidLeave:r.unpaidLeave,dailyRate:r.dailyRate,calculatedDeduction:r.calculatedDeduction,manualDeduction:r.manualDeduction,totalDeduction:r.totalDeduction,calculatedNetSalary:r.calculatedNetSalary,manualNetSalary:Math.abs(amount-Number(r.calculatedNetSalary||0))>0.005?amount:r.manualNetSalary,netSalary:amount,joiningDate:r.joiningDate,joiningDaysUnpaid:r.joiningDaysUnpaid,latePenaltyLeave:r.latePenaltyLeave}]);await api('payrollMarkPaid',[{month:currentMonth,userId:r.userId,payDate:document.getElementById('payDate').value,paymentMode:document.getElementById('payMode').value,paymentReference:document.getElementById('payReference').value,paymentComment:comment,netSalary:amount}]);toast('Salary marked as paid.');closePay();await loadMonth()}catch(e){toast(e.message,true)}finally{b.disabled=false}}
  
  function editPaidDetails(i){
    var r=rows[i];
    var m=document.createElement('div');
    m.className='modal-backdrop show';
    m.id='editPaidDetailsModal';
    m.innerHTML='<div class="modal"><h2>Edit Payment Details</h2><p><strong>'+esc(r.name)+'</strong> · '+monthLabel(currentMonth)+'</p>'+
      '<div class="form-grid">'+
      '<div class="field"><label>Paid Amount (₹)</label><input id="epdAmount" type="number" step="0.01" value="'+Number(r.netSalary||0).toFixed(2)+'"></div>'+
      '<div class="field"><label>Payment Date</label><input id="epdDate" type="date" value="'+(r.payDate||today())+'"></div>'+
      '<div class="field"><label>Payment Mode</label><select id="epdMode"><option value="Bank Transfer"'+(r.paymentMode==='Bank Transfer'?' selected':'')+'>Bank Transfer</option><option value="Cash"'+(r.paymentMode==='Cash'?' selected':'')+'>Cash</option><option value="Cheque"'+(r.paymentMode==='Cheque'?' selected':'')+'>Cheque</option><option value="UPI"'+(r.paymentMode==='UPI'?' selected':'')+'>UPI</option></select></div>'+
      '<div class="field"><label>Reference / UTR</label><input id="epdReference" type="text" value="'+esc(r.paymentReference||'')+'" placeholder="Transaction ref / UTR"></div>'+
      '<div class="field full"><label>Payment Comment / Note</label><textarea id="epdComment" rows="2" placeholder="Reason for update or remarks">'+esc(r.paymentComment||'')+'</textarea></div>'+
      '</div>'+
      '<div class="modal-footer"><button class="btn btn-light" id="epdCancel">Cancel</button><button class="btn btn-primary" id="epdSave">Save Payment Details</button></div></div>';

    document.body.appendChild(m);
    m.querySelector('#epdCancel').onclick=function(){m.remove()};
    m.querySelector('#epdSave').onclick=async function(){
      var b=this;
      var amt=Number(m.querySelector('#epdAmount').value||0);
      var dt=m.querySelector('#epdDate').value;
      var mode=m.querySelector('#epdMode').value;
      var ref=m.querySelector('#epdReference').value.trim();
      var cmt=m.querySelector('#epdComment').value.trim();
      if(!amt || amt <= 0){ toast('Please enter a valid salary amount.', true); return; }
      if(!dt){ toast('Payment date is required.', true); return; }
      try{
        b.disabled=true;
        await api('payrollMarkPaid',[{
          month:currentMonth,
          userId:r.userId,
          payDate:dt,
          paymentMode:mode,
          paymentReference:ref,
          paymentComment:cmt,
          netSalary:amt
        }]);
        toast('Payment details updated.');
        m.remove();
        await loadMonth();
      }catch(e){
        toast(e.message||String(e),true);
      }finally{
        b.disabled=false;
      }
    };
  }

  async function download(i){try{await window.generateSalarySlipPDF(rows[i],currentMonth)}catch(e){toast(e.message||String(e),true)}}
  function showAssignments(){document.getElementById('assignmentTab').click()}

  function usersApi(fn,args){
    if(!USERS_BASE) return Promise.reject(new Error("SUPABASE_USERS_BASE is missing in config.js."));
    var s=Portal.Session.get()||{};
    return fetch(USERS_BASE,{method:"POST",headers:{
      "Content-Type":"application/json","Authorization":"Bearer "+ANON,"apikey":ANON,
      "x-session-token":s.token||""
    },body:JSON.stringify({fn:fn,args:args||[]})})
    .then(function(r){return r.text()})
    .then(function(t){
      var j; try{j=JSON.parse(t)}catch(e){throw new Error("Invalid users server response")};
      if(!j.ok) throw new Error(j.error||"User request failed");
      return j.data;
    });
  }

  async function loadEmployees(){
    employees=(await usersApi("usersList",[]))||[];
    try{ aliasData=(await usersApi("getUnlinkedTeacherNames",[]))||{linked:[],unlinked:[]}; }
    catch(_e){ aliasData={linked:[],unlinked:[]}; }
  }

  function employeeAliasFor(id){
    var hit=(aliasData.linked||[]).filter(function(x){return Number(x.resolvedCode)===Number(id);});
    return hit.length ? hit.map(function(x){return x.rawName;}).join(", ") : "";
  }

  function renderEmployees(){
    document.getElementById("monthlyTab").classList.remove("active");
    document.getElementById("assignmentTab").classList.remove("active");
    document.getElementById("employeesTab").classList.add("active");

    var active=employees.filter(function(u){return u.active!==false;}).length;
    var inactive=employees.length-active;
    var html='<div class="payroll-card employee-panel">'+
      '<div class="assignment-head">'+
        '<div><strong>Manage Employees</strong><div class="muted">Payroll uses the canonical employee name from Users. Timetable abbreviations such as KNR are mapped to the same user ID.</div></div>'+
        '<div style="display:flex;gap:8px;flex-wrap:wrap">'+
          '<a class="btn btn-light" href="user-management.html"><i class="material-icons">manage_accounts</i>Open User Management</a>'+
          '<button class="btn btn-light" id="employeeRefresh"><i class="material-icons">refresh</i>Refresh</button>'+
        '</div>'+
      '</div>'+
      '<div class="employee-kpis">'+
        '<div><strong>'+active+'</strong><span>Active employees</span></div>'+
        '<div><strong>'+inactive+'</strong><span>Inactive users</span></div>'+
        '<div><strong>'+employees.filter(function(u){return employeeAliasFor(u.id);}).length+'</strong><span>Timetable mappings</span></div>'+
      '</div>'+
      '<div class="employee-table-wrap"><table class="employee-table"><thead><tr>'+
        '<th>User</th><th>Employee / Login Name</th><th>Role</th><th>Timetable Alias</th><th>Status</th><th></th>'+
      '</tr></thead><tbody>';

    if(!employees.length){
      html+='<tr><td colspan="6" class="empty-cell">No users found.</td></tr>';
    }else{
      employees.forEach(function(u){
        var alias=employeeAliasFor(u.id);
        html+='<tr>'+
          '<td><strong>#'+esc(u.id)+'</strong></td>'+
          '<td><strong>'+esc(u.name||"")+'</strong><small>'+esc(u.whatsapp||"")+'</small></td>'+
          '<td>'+esc(u.role||"")+'</td>'+
          '<td>'+(alias?'<span class="alias-chip">'+esc(alias)+'</span>':'<span class="muted">Not mapped</span>')+'</td>'+
          '<td>'+(u.active!==false?'<span class="status paid">Active</span>':'<span class="status unassigned">Inactive</span>')+'</td>'+
          '<td><button class="btn btn-light mini" onclick="SalaryPayroll.editEmployee('+Number(u.id)+')"><i class="material-icons">edit</i>Edit / Map</button></td>'+
        '</tr>';
      });
    }
    html+='</tbody></table></div></div>';
    document.getElementById("payrollContent").innerHTML=html;
    document.getElementById("employeeRefresh").onclick=async function(){
      try{this.disabled=true;await loadEmployees();renderEmployees();toast("Employee list refreshed.");}
      catch(e){toast(e.message||String(e),true)}finally{this.disabled=false}
    };
  }

  function editEmployee(id){
    var u=employees.find(function(x){return Number(x.id)===Number(id);});
    if(!u){toast("Employee not found.",true);return;}
    var currentAlias=employeeAliasFor(u.id);
    var m=document.createElement("div");
    m.className="modal-backdrop show";
    m.innerHTML='<div class="modal employee-modal">'+
      '<h2>Manage Employee</h2>'+
      '<p>User #'+esc(u.id)+' · Changes are saved to the Users table.</p>'+
      '<div class="form-grid">'+
        '<div class="field full"><label>Canonical Employee Name</label><input id="empName" value="'+esc(u.name||"")+'"></div>'+
        '<div class="field"><label>Designation / Role</label><input id="empRole" value="'+esc(u.role||"")+'"></div>'+
        '<div class="field"><label>Campus</label><input id="empCampus" value="'+esc(u.campus||"Both")+'"></div>'+
        '<div class="field"><label>WhatsApp</label><input id="empWhats" value="'+esc(u.whatsapp||"")+'"></div>'+
        '<div class="field"><label>Biometric Code</label><input id="empBio" value="'+esc(u.biometric_code||"")+'"></div>'+
        '<div class="field full"><label>Timetable Name / Alias</label><input id="empAlias" value="'+esc(currentAlias)+'" placeholder="Example: KNR"></div>'+
        '<div class="field full"><label>New Password (optional)</label><input id="empPass" type="password" autocomplete="new-password" placeholder="Leave blank to keep current password"></div>'+
      '</div>'+
      '<div class="adjustment-note"><i class="material-icons">link</i><span>The canonical employee name is the Users name. The timetable alias is stored separately and resolves to this same user ID, so KNR can safely represent Narsimha Reddy Kasireddy without becoming another employee.</span></div>'+
      '<div class="modal-footer"><button class="btn btn-light" id="empCancel">Cancel</button><button class="btn btn-primary" id="empSave">Save Employee</button></div>'+
    '</div>';
    document.body.appendChild(m);
    m.querySelector("#empCancel").onclick=function(){m.remove()};
    m.querySelector("#empSave").onclick=async function(){
      var b=this;
      var name=m.querySelector("#empName").value.trim();
      var alias=m.querySelector("#empAlias").value.trim();
      if(!name){toast("Employee name is required.",true);return}
      try{
        b.disabled=true;
        await usersApi("userUpdate",[Number(u.id),{
          name:name,
          role:m.querySelector("#empRole").value.trim(),
          campus:m.querySelector("#empCampus").value.trim(),
          whatsapp:m.querySelector("#empWhats").value.trim(),
          biometricCode:m.querySelector("#empBio").value.trim()
        }]);
        if(alias){
          await usersApi("linkTeacherName",[alias,Number(u.id)]);
        }
        if(m.querySelector("#empPass").value.trim()){
          await usersApi("userResetPassword",[String(u.id),m.querySelector("#empPass").value.trim()]);
        }
        toast("Employee details and mapping saved.");
        m.remove();
        await loadEmployees();
        await loadMonth();
        renderEmployees();
      }catch(e){toast(e.message||String(e),true)}
      finally{b.disabled=false}
    };
  }

  async function boot(){
    ensurePayrollRowStyles();
    session=Portal.bootPage('payroll');
    if(!session)return;
    if(!BASE){toast('SUPABASE_PAYROLL_BASE is missing in config.js.',true);return}
    var modal=document.getElementById('payrollPasswordModal');
    if(modal)modal.classList.add('show');
    function cancelPayrollLogin(){
      if(modal)modal.classList.remove('show');
      if(window.history.length>1)window.history.back();
      else location.replace("dashboard.html");
    }
    var closeBtn=document.getElementById('payrollCloseBtn');
    if(closeBtn)closeBtn.onclick=cancelPayrollLogin;
    var cancelBtn=document.getElementById('payrollCancelBtn');
    if(cancelBtn)cancelBtn.onclick=cancelPayrollLogin;
    var pInp=document.getElementById('payrollPassword');
    if(pInp){
      setTimeout(function(){ try { pInp.focus(); } catch(e){} }, 200);
      pInp.onkeydown=function(e){if(e.key==='Enter')unlock()};
      pInp.onkeyup=function(e){if(e.key==='Enter')unlock()};
    }
    var btn=document.getElementById('payrollUnlockBtn');
    if(btn)btn.onclick=unlock;
    window.addEventListener("resize", function(){
      render();
    });
  }
  async function unlock(){
    var pInput = document.getElementById('payrollPassword');
    var p = pInput ? pInput.value.trim() : "";
    var err=document.getElementById('payrollPasswordError');
    var btn=document.getElementById('payrollUnlockBtn');
    try{
      if(!p){err.textContent='Enter the payroll password.';err.style.display='block';return}
      err.style.display='none';
      btn.disabled=true;
      btn.innerHTML='<i class="material-icons spin-icon">sync</i> Checking…';
      Portal.overlay(true,"Checking payroll access…");
      await api('payrollBootstrap',[new Date().toISOString().slice(0,7),p]);
      payrollPassword=p;
      currentMonth=new Date().toISOString().slice(0,7);
      btn.innerHTML='<i class="material-icons spin-icon">sync</i> Loading staff…';
      staff=(await api('payrollStaffList',[currentMonth]))||[];
      document.getElementById('payrollPasswordModal').classList.remove('show');
      await loadMonth();
    }catch(e){
      err.textContent=e.message||String(e);
      err.style.display='block';
    }finally{
      btn.disabled=false;
      btn.innerHTML='<i class="material-icons">lock_open</i>Unlock Payroll';
      Portal.overlay(false);
    }
  }

  window.SalaryPayroll={
    edit:edit,
    pay:pay,
    editPaidDetails:editPaidDetails,
    download:download,
    adjustLeave:adjustLeave,
    closeEdit:closeEdit,
    closePay:closePay,
    showAssignments:showAssignments,
    editEmployee:editEmployee,
    selectEmployee: function(uid) { mobileState.selectedUserId = Number(uid); render(); },
    backToList: function() { mobileState.selectedUserId = null; render(); }
  };
  document.addEventListener('click',function(e){if(e.target&&e.target.id==='saveEditBtn')saveEdit();if(e.target&&e.target.id==='confirmPayBtn')confirmPay()});
  document.addEventListener('DOMContentLoaded',boot);
})();

/* =========================================================================
   Embedded salary-slip generator
   Print-first, clean one-page A4 salary slip
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
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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
    return ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
      "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
      "Eighteen", "Nineteen"][n] || "";
  }

  function tens(n) {
    return ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy",
      "Eighty", "Ninety"][n] || "";
  }

  function under1000(n) {
    n = Math.floor(n);
    var s = "";
    if (n >= 100) {
      s += ones(Math.floor(n / 100)) + " Hundred";
      n %= 100;
      if (n) s += " ";
    }
    if (n < 20) s += ones(n);
    else {
      s += tens(Math.floor(n / 10));
      if (n % 10) s += " " + ones(n % 10);
    }
    return s;
  }

  function amountWords(v) {
    var n = Math.round(Number(v || 0));
    if (n === 0) return "Zero Rupees Only";
    var crore = Math.floor(n / 10000000); n %= 10000000;
    var lakh = Math.floor(n / 100000); n %= 100000;
    var thousand = Math.floor(n / 1000); n %= 1000;
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
        fr.onload = function () { resolve(fr.result); };
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

  function compactPairRow(doc, x, y, w, leftLabel, leftValue, rightLabel, rightValue, C, h) {
    h = h || 8.5;
    var half = w / 2;
    var labelW = 36;

    fill(doc, x, y, labelW, h, C.soft);
    fill(doc, x + half, y, labelW, h, C.soft);
    stroke(doc, x, y, w, h, C.line, 0.22);
    line(doc, x + half, y, x + half, y + h, C.line, 0.22);
    line(doc, x + labelW, y, x + labelW, y + h, C.line, 0.22);
    line(doc, x + half + labelW, y, x + half + labelW, y + h, C.line, 0.22);

    text(doc, leftLabel, x + 4, y + 5.5, 6.6, C.muted, "bold");
    text(doc, leftValue == null || leftValue === "" ? "—" : leftValue,
      x + labelW + 4, y + 5.5, 7.4, C.ink, "normal");

    if (rightLabel) {
      text(doc, rightLabel, x + half + 4, y + 5.5, 6.6, C.muted, "bold");
      text(doc, rightValue == null || rightValue === "" ? "—" : rightValue,
        x + half + labelW + 4, y + 5.5, 7.4, C.ink, "normal");
    }

    return h;
  }

  function salaryRow(doc, x, y, w, label, value, C, strong) {
    var h = 8.5;
    fill(doc, x, y, w, h, C.softer);
    stroke(doc, x, y, w, h, C.line, 0.22);
    text(doc, label, x + 5, y + 5.5, 6.8, C.muted, "bold");
    text(doc, value, x + w - 5, y + 5.5, strong ? 8.2 : 7.8,
      strong ? C.maroon : C.ink, strong ? "bold" : "normal", { align: "right" });
    return h;
  }

  window.generateSalarySlipPDF = async function (row, month) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error("PDF library is not loaded. Refresh the page once.");
    }
    if (!row || row.status !== "Paid") {
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

    var name = String((row.staff && row.staff.name) || row.name || "");
    var role = String((row.staff && row.staff.role) || row.role || "");

    var payDate = row.payDate != null ? row.payDate : (row.pay_date || "");
    var payMode = row.paymentMode != null ? row.paymentMode : (row.payment_mode || "Bank Transfer");
    var payReference = row.paymentReference != null
      ? row.paymentReference
      : (row.payment_reference || "");

    var salary = row.salary != null ? row.salary : row.monthly_salary;
    var deduction = row.totalDeduction != null ? row.totalDeduction : row.total_deduction;
    var net = row.netSalary != null ? row.netSalary : row.net_salary;
    var used = row.paidLeaveUsed != null ? row.paidLeaveUsed : row.paid_leave_used;
    var balance = row.paidLeaveBalance != null ? row.paidLeaveBalance : row.paid_leave_balance;
    var opening = row.paidLeaveOpening != null ? row.paidLeaveOpening : row.paid_leave_opening;
    var unpaid = row.unpaidLeave != null ? row.unpaidLeave : row.unpaid_leave;

    if (opening == null) opening = Number(balance || 0) + Number(used || 0);

    var rawEmployeeId = row.employeeId != null
      ? row.employeeId
      : (row.employee_id != null ? row.employee_id : row.userId);

    var employeeId = "";
    if (rawEmployeeId != null && rawEmployeeId !== "") {
      var employeeNumber = Number(rawEmployeeId);
      if (Number.isFinite(employeeNumber) && employeeNumber > 0) {
        employeeId = "SHS-EMP-" + String(Math.floor(employeeNumber)).padStart(3, "0");
      } else {
        employeeId = "SHS-EMP-" + String(rawEmployeeId).replace(/[^a-z0-9]/gi, "").slice(-6);
      }
    }

    var payrollKey = String(month || "").slice(0, 7);
    var transactionReference = "Not available";
    if (payrollKey >= "2026-08") {
      transactionReference = String(payReference || "").trim() || "Not available";
    }

    fill(doc, 0, 0, pageW, pageH, C.white);
    stroke(doc, 8.5, 8.5, 193, 280, C.line, 0.25);

    var logo = await loadHeaderLogo();

    if (logo) {
      doc.addImage(logo, "PNG", left, 13, 103, 18, undefined, "FAST");
    }

    fill(doc, 151, 13, 45, 22, C.maroonSoft);
    line(doc, 151, 35, 196, 35, C.maroon, 0.55);
    text(doc, "SALARY SLIP", 173.5, 23.0, 11.2, C.maroon, "bold", { align: "center" });
    text(doc, slipMonth(month), 173.5, 29.2, 7.2, C.ink, "normal", { align: "center" });

    text(doc,
      "8-3-311/3, Vemulawada By-Pass Road, Sapthagiri Colony, Karimnagar - 505001",
      left, 39.5, 6.9, C.ink, "normal");

    text(doc,
      "9381118421  |  sapthagiri.98@gmail.com  |  www.sapthagirischool.in",
      left, 44.4, 6.7, C.muted, "normal");

    text(doc,
      "UDISE 36130790563  |  School Code 22227  |  PAN AAEAS6450K",
      right, 44.4, 6.5, C.muted, "normal", { align: "right" });

    line(doc, left, 49.0, right, 49.0, C.maroon, 0.65);

    var y = 56;

    y = section(doc, "EMPLOYEE INFORMATION", y, left, width, C);
    y += compactPairRow(doc, left, y, width,
      "Employee", name || "—", "Designation", role || "—", C, 8.5);
    y += compactPairRow(doc, left, y, width,
      "Employee ID", employeeId || "—", "Payroll Month", slipMonth(month), C, 8.5);
    y += compactPairRow(doc, left, y, width,
      "Pay Date", slipDate(payDate) || "—", "Payment Mode", payMode || "—", C, 8.5);

    y += 5;

    y = section(doc, "LEAVE SUMMARY", y, left, width, C);
    y += compactPairRow(doc, left, y, width,
      "Opening Balance", slipNum(opening), "Paid Leave Used", slipNum(used), C, 8.5);
    y += compactPairRow(doc, left, y, width,
      "Closing Balance", slipNum(balance), "Unpaid Leave", slipNum(unpaid), C, 8.5);

    y += 5;

    y = section(doc, "SALARY DETAILS", y, left, width, C);
    y += salaryRow(doc, left, y, width, "Monthly Salary", slipMoney(salary), C, false);
    y += salaryRow(doc, left, y, width, "Unpaid Leave Deduction", slipMoney(deduction), C, false);
    y += 4;

    fill(doc, left, y, width, 12.5, C.maroonSoft);
    stroke(doc, left, y, width, 12.5, C.maroon, 0.55);
    text(doc, "NET SALARY PAYABLE", left + 6, y + 8.0, 8.0, C.maroon, "bold");
    text(doc, slipMoney(net), right - 6, y + 8.0, 10.4, C.maroon, "bold", { align: "right" });
    y += 17;

    y = section(doc, "AMOUNT IN WORDS", y, left, width, C);
    text(doc, amountWords(net), left + 5, y + 5.0, 7.6, C.ink, "normal");
    line(doc, left, y + 8.5, right, y + 8.5, C.line, 0.25);
    y += 13;

    y = section(doc, "PAYMENT INFORMATION", y, left, width, C);
    y += compactPairRow(doc, left, y, width,
      "Payment Date", slipDate(payDate) || "—", "Payment Mode", payMode || "—", C, 8.5);
    y += compactPairRow(doc, left, y, width,
      "Transaction Reference", transactionReference, "", "", C, 8.5);

    y += 5;

    y = section(doc, "DECLARATION", y, left, width, C);
    var declaration =
      "This is a computer-generated salary slip issued by Sapthagiri High School E/M. " +
      "The salary details are based on the payroll record for the stated period.";
    var declarationLines = doc.splitTextToSize(declaration, width - 10);
    text(doc, declarationLines, left + 5, y + 5.0, 6.9, C.muted, "normal");
    y += Math.max(1, declarationLines.length) * 3.6 + 8;

    var footerY = 265;
    line(doc, left, footerY, right, footerY, C.line, 0.35);

    text(doc, "For Sapthagiri High School E/M", left, footerY + 7, 7.4, C.ink, "bold");
    text(doc, "Authorised Administration", left, footerY + 12, 6.8, C.muted, "normal");

    var generatedDate = new Date();
    var generatedOn =
      String(generatedDate.getDate()).padStart(2, "0") + " " +
      ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][generatedDate.getMonth()] +
      " " + generatedDate.getFullYear();

    text(doc, "Generated " + generatedOn, right, footerY + 7, 6.8, C.muted, "normal", { align: "right" });

    var safe = name.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "Staff";
    var fileMonth = String(month || "").slice(0, 7) || "Payroll";
    doc.save(safe + "_" + fileMonth + "_Salary_Slip.pdf");
  };
})();

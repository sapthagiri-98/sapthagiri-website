/* =========================================================================
   salary-management.js — Payroll / Salary Management portal
   ========================================================================= */
(function () {
  "use strict";
  var session = null, payrollPassword = "", currentMonth = "", rows = [], staff = [], editing = null, paying = null;
  var C = window.PORTAL_CONFIG || {};
  var BASE = C.SUPABASE_PAYROLL_BASE || "";
  var ANON = C.SUPABASE_ANON || "";

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
      "}";
    document.head.appendChild(s);
  }
  function render(){
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
            ? '<button class="btn btn-primary mini" onclick="SalaryPayroll.download('+i+')"><i class="material-icons">download</i>Salary Slip</button>'
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
  async function loadMonth(){
    currentMonth=(document.getElementById("salaryMonth")||{}).value||currentMonth||new Date().toISOString().slice(0,7);
    try{
      Portal.overlay(true,"Loading payroll…");
      var data=await api("payrollBootstrap",[currentMonth,payrollPassword]);
      rows=data.rows||[];render();
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

  async function boot(){ensurePayrollRowStyles();session=Portal.bootPage('payroll');if(!session)return;if(!BASE){toast('SUPABASE_PAYROLL_BASE is missing in config.js.',true);return}document.getElementById('payrollPasswordModal').classList.add('show');document.getElementById('payrollUnlockBtn').onclick=unlock;document.getElementById('payrollPassword').onkeydown=function(e){if(e.key==='Enter')unlock()};}
  async function unlock(){
    var p=document.getElementById('payrollPassword').value;
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

  window.SalaryPayroll={edit:edit,pay:pay,download:download,adjustLeave:adjustLeave,closeEdit:closeEdit,closePay:closePay,showAssignments:showAssignments,editEmployee:editEmployee};
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

  /* Helvetica is a clean, widely supported print font in jsPDF. */
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

  /* Print-oriented section heading: label first, then one restrained rule. */
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

        /* ================================================================
       HEADER
       ================================================================ */

    var logo = await loadHeaderLogo();

    /*
     * Header geometry
     *
     * Left block  : official school logo
     * Right block : document title + month
     * Below       : school address
     * Bottom row  : contact details + statutory identifiers
     *
     * Everything uses the same left/right margins so the printed result
     * stays aligned on A4.
     */
    var headerLeft = left;
    var headerRight = right;
    var headerWidth = width;

    if (logo) {
      /*
       * Keep the supplied logo at its natural visual proportion.
       * It occupies only the upper-left header area.
       */
      doc.addImage(
        logo,
        "PNG",
        headerLeft,
        13,
        103,
        18,
        undefined,
        "FAST"
      );
    }

    /*
     * Document title block on the upper-right.
     * No separate PAYROLL DOCUMENT label.
     */
    text(
      doc,
      "SALARY SLIP",
      headerRight,
      20.5,
      11.5,
      C.maroon,
      "bold",
      { align: "right" }
    );

    text(
      doc,
      slipMonth(month),
      headerRight,
      27.0,
      7.8,
      C.ink,
      "normal",
      { align: "right" }
    );

    /*
     * School address.
     *
     * It is intentionally placed below the complete logo rather than
     * beside it. This prevents the long address from fighting with the
     * large school branding.
     */
    text(
      doc,
      "8-3-311/3, Vemulawada By-Pass Road, Sapthagiri Colony, Karimnagar - 505001",
      headerLeft,
      39.5,
      6.9,
      C.ink,
      "normal"
    );

    /*
     * Bottom information row.
     *
     * Left side  = phone / email / website
     * Right side = UDISE / School Code / PAN
     *
     * Both are aligned to the same left/right document boundaries.
     */
    text(
      doc,
      "9381118421  |  sapthagiri.98@gmail.com  |  www.sapthagirischool.in",
      headerLeft,
      44.6,
      6.6,
      C.muted,
      "normal"
    );

    text(
      doc,
      "UDISE 36130790563  |  School Code 22227  |  PAN AAEAS6450K",
      headerRight,
      44.6,
      6.25,
      C.muted,
      "normal",
      { align: "right" }
    );

    /*
     * One divider after ALL header information.
     */
    line(
      doc,
      headerLeft,
      50.0,
      headerRight,
      50.0,
      C.maroon,
      0.65
    );

    /*
     * Body starts below the complete header.
     */
    var y = 57;

    /* ================================================================
       EMPLOYEE INFORMATION
       ================================================================ */
    y = section(doc, "EMPLOYEE INFORMATION", y, left, width, C);

    y += compactPairRow(doc, left, y, width,
      "Employee", name || "—", "Designation", role || "—", C, 8.5);
    y += compactPairRow(doc, left, y, width,
      "Employee ID", employeeId || "—", "Payroll Month", slipMonth(month), C, 8.5);
    y += compactPairRow(doc, left, y, width,
      "Pay Date", slipDate(payDate) || "—", "Payment Mode", payMode || "—", C, 8.5);

    y += 5;

    /* ================================================================
       LEAVE SUMMARY
       ================================================================ */
    y = section(doc, "LEAVE SUMMARY", y, left, width, C);
    y += compactPairRow(doc, left, y, width,
      "Opening Balance", slipNum(opening), "Paid Leave Used", slipNum(used), C, 8.5);
    y += compactPairRow(doc, left, y, width,
      "Closing Balance", slipNum(balance), "Unpaid Leave", slipNum(unpaid), C, 8.5);

    y += 5;

    /* ================================================================
       SALARY DETAILS
       ================================================================ */
    y = section(doc, "SALARY DETAILS", y, left, width, C);
    y += salaryRow(doc, left, y, width, "Monthly Salary", slipMoney(salary), C, false);
    y += salaryRow(doc, left, y, width, "Unpaid Leave Deduction", slipMoney(deduction), C, false);
    y += 4;

    fill(doc, left, y, width, 12.5, C.maroonSoft);
    stroke(doc, left, y, width, 12.5, C.maroon, 0.55);
    text(doc, "NET SALARY PAYABLE", left + 6, y + 8.0, 8.0, C.maroon, "bold");
    text(doc, slipMoney(net), right - 6, y + 8.0, 10.4, C.maroon, "bold", { align: "right" });
    y += 17;

    /* ================================================================
       AMOUNT IN WORDS
       ================================================================ */
    y = section(doc, "AMOUNT IN WORDS", y, left, width, C);
    text(doc, amountWords(net), left + 5, y + 5.0, 7.6, C.ink, "normal");
    line(doc, left, y + 8.5, right, y + 8.5, C.line, 0.25);
    y += 13;

    /* ================================================================
       PAYMENT INFORMATION
       ================================================================ */
    y = section(doc, "PAYMENT INFORMATION", y, left, width, C);
    y += compactPairRow(doc, left, y, width,
      "Payment Date", slipDate(payDate) || "—", "Payment Mode", payMode || "—", C, 8.5);
    y += compactPairRow(doc, left, y, width,
      "Transaction Reference", transactionReference, "", "", C, 8.5);

    y += 5;

    /* ================================================================
       DECLARATION
       ================================================================ */
    y = section(doc, "DECLARATION", y, left, width, C);
    var declaration =
      "This is a computer-generated salary slip issued by Sapthagiri High School E/M. " +
      "The salary details are based on the payroll record for the stated period.";
    var declarationLines = doc.splitTextToSize(declaration, width - 10);
    text(doc, declarationLines, left + 5, y + 5.0, 6.9, C.muted, "normal");
    y += Math.max(1, declarationLines.length) * 3.6 + 8;

    /* ================================================================
       FOOTER
       ================================================================ */
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

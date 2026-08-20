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

      html+='<article class="payroll-card staff-row">'+
        '<div class="staff-main">'+
          '<div class="staff-index">'+(i+1)+'</div>'+
          '<div class="staff-name"><strong>'+esc(r.name)+'</strong><span>'+esc(r.role||'')+'</span>'+joining+'</div>'+
        '</div>'+
        '<div class="metric"><span>Actual Salary</span><strong>'+money(r.salary)+'</strong></div>'+
        '<div class="metric"><span>Leave Credit</span><strong>'+n(r.paidLeaveCredit)+' '+adjText+'</strong></div>'+
        '<div class="metric"><span>Used Paid</span><strong>'+n(r.paidLeaveUsed)+'</strong></div>'+
        '<div class="metric"><span>Balance</span><strong>'+n(r.paidLeaveBalance)+'</strong></div>'+
        '<div class="metric"><span>Unpaid</span><strong>'+n(r.unpaidLeave)+'</strong></div>'+
        '<div class="metric"><span>Deduction</span><strong class="deduct">'+money(r.totalDeduction)+'</strong></div>'+
        '<div class="metric net-metric"><span>Net Salary</span><strong class="net">'+money(r.netSalary)+'</strong></div>'+
        '<div class="row-status">'+status(r.status)+(r.payDate?'<small>Paid '+esc(r.payDate)+'</small>':'')+'</div>'+
        '<div class="row-actions">'+
          (r.status==='Paid'
            ? '<button class="btn btn-primary mini" onclick="SalaryPayroll.download('+i+')"><i class="material-icons">download</i>Slip</button>'
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
    var inp=document.getElementById("salaryMonth"), btn=document.getElementById("loadMonthBtn");
    if(btn)btn.onclick=function(){currentMonth=inp.value||currentMonth;loadMonth()};
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

  function edit(i){editing=i;var r=rows[i];document.getElementById('editEmployee').textContent=r.name+' · '+monthLabel(currentMonth);document.getElementById('editUnpaid').value=r.manualUnpaidLeave==null?r.unpaidLeave:r.manualUnpaidLeave;document.getElementById('editDeduction').value=r.manualDeduction==null?'':r.manualDeduction;document.getElementById('editNet').value=r.manualNetSalary==null?'':r.manualNetSalary;document.getElementById('editMode').value=r.paymentMode||'Bank Transfer';document.getElementById('editComment').value=r.paymentComment||'';document.getElementById('editModal').classList.add('show');}
  function closeEdit(){document.getElementById('editModal').classList.remove('show');editing=null;}
  async function saveEdit(){var r=rows[editing];var unpaid=Number(document.getElementById('editUnpaid').value||0);var dedRaw=document.getElementById('editDeduction').value;var netRaw=document.getElementById('editNet').value;var comment=document.getElementById('editComment').value.trim();if((dedRaw!==''||netRaw!==''||unpaid!==Number(r.calculatedUnpaidLeave))&&!comment){toast('Enter a reason for changing the calculated payroll. ',true);return}var paidUsed=Math.max(0,Number(r.attendanceLeave||0)-unpaid);var balance=Math.max(0,Number(r.paidLeaveCredit||0)-paidUsed);var deduction=dedRaw===''?unpaid*Number(r.salary||0)/30:Number(dedRaw);var net=netRaw===''?Number(r.salary||0)-deduction:Number(netRaw);try{await api('payrollSaveRow',[{month:currentMonth,userId:r.userId,salary:r.salary,annualLeaveEntitlement:r.annualLeaveEntitlement,paidLeaveCredit:r.paidLeaveCredit,paidLeaveUsed:paidUsed,paidLeaveBalance:balance,calculatedUnpaidLeave:r.calculatedUnpaidLeave,manualUnpaidLeave:unpaid,unpaidLeave:unpaid,dailyRate:r.dailyRate,calculatedDeduction:r.calculatedDeduction,manualDeduction:dedRaw===''?null:Number(dedRaw),totalDeduction:deduction,calculatedNetSalary:r.calculatedNetSalary,manualNetSalary:netRaw===''?null:Number(netRaw),netSalary:net,joiningDate:r.joiningDate,joiningDaysUnpaid:r.joiningDaysUnpaid,latePenaltyLeave:r.latePenaltyLeave}]);toast('Payroll changes saved.');closeEdit();await loadMonth()}catch(e){toast(e.message,true)}}
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

  async function boot(){session=Portal.bootPage('payroll');if(!session)return;if(!BASE){toast('SUPABASE_PAYROLL_BASE is missing in config.js.',true);return}document.getElementById('payrollPasswordModal').classList.add('show');document.getElementById('payrollUnlockBtn').onclick=unlock;document.getElementById('payrollPassword').onkeydown=function(e){if(e.key==='Enter')unlock()};}
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
   Reference-style professional A4 payslip
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
    var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return (months[Number(p[1]) - 1] || p[1]) + " " + p[0];
  }

  function slipMonthShort(v) {
    var p = String(v || "").slice(0, 7).split("-");
    if (p.length !== 2) return String(v || "");
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return (months[Number(p[1]) - 1] || p[1]) + "-" + p[0].slice(-2);
  }

  function ones(n) {
    return ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
      "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
      "Eighteen", "Nineteen"][n] || "";
  }

  function tens(n) {
    return ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"][n] || "";
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
    doc.setFont("times", style || "normal");
    doc.setFontSize(size || 9);
    doc.setTextColor(color || "#1F2937");
  }

  function text(doc, value, x, y, size, color, style, opts) {
    setFont(doc, size, color, style);
    doc.text(String(value == null ? "" : value), x, y, opts || {});
  }

  function hLine(doc, x1, y1, x2, y2, color, width) {
    doc.setDrawColor(color || "#D0D5DD");
    doc.setLineWidth(width || 0.25);
    doc.line(x1, y1, x2, y2);
  }

  function fillRect(doc, x, y, w, h, color) {
    doc.setFillColor(color);
    doc.rect(x, y, w, h, "F");
  }

  function tableDefaults(colors) {
    return {
      theme: "grid",
      styles: {
        font: "times",
        fontSize: 9.1,
        textColor: colors.ink,
        lineColor: [201, 206, 212],
        lineWidth: 0.28,
        cellPadding: { top: 4.8, right: 5.0, bottom: 4.8, left: 5.0 },
        valign: "middle"
      },
      headStyles: {
        font: "times",
        fontStyle: "bold"
      }
    };
  }

  function sectionHeader(doc, title, y, left, width, colors) {
    fillRect(doc, left, y, width, 9, colors.gray);
    text(doc, title, left + 5, y + 6.0, 8.8, colors.ink, "bold");
    return y + 9;
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

    if (typeof doc.autoTable !== "function") {
      throw new Error("PDF table library is not loaded. Refresh the page once.");
    }

    var pageW = 210;
    var pageH = 297;
    var left = 15;
    var right = 195;
    var width = right - left;

    /* Professional restrained palette: dark maroon + orange accent + neutral gray. */
    var colors = {
      maroon: "#7A151A",
      maroonDark: "#5D1115",
      orange: "#B85A1B",
      ink: "#202020",
      muted: "#555555",
      gray: "#F0F0F0",
      gray2: "#F7F7F7",
      border: "#AFAFAF",
      white: "#FFFFFF",
      deduction: "#202020"
    };

    var name = String((row.staff && row.staff.name) || row.name || "");
    var role = String((row.staff && row.staff.role) || row.role || "");
    var payDate = row.payDate != null ? row.payDate : (row.pay_date || "");
    var payMode = row.paymentMode != null ? row.paymentMode : (row.payment_mode || "Bank Transfer");
    var payReference = row.paymentReference != null ? row.paymentReference : (row.payment_reference || "");
    var comment = row.paymentComment != null ? row.paymentComment : (row.payment_comment || "");
    /* Never print historical migration/internal payroll notes on employee slips. */
    if (/historical\s+.*payroll\s+migration/i.test(String(comment))) comment = "";
    var salary = row.salary != null ? row.salary : row.monthly_salary;
    var deduction = row.totalDeduction != null ? row.totalDeduction : row.total_deduction;
    var net = row.netSalary != null ? row.netSalary : row.net_salary;
    var used = row.paidLeaveUsed != null ? row.paidLeaveUsed : row.paid_leave_used;
    var balance = row.paidLeaveBalance != null ? row.paidLeaveBalance : row.paid_leave_balance;
    var opening = row.paidLeaveOpening != null ? row.paidLeaveOpening : row.paid_leave_opening;
    var unpaid = row.unpaidLeave != null ? row.unpaidLeave : row.unpaid_leave;
    var joiningDays = Number(row.joiningDaysUnpaid != null ? row.joiningDaysUnpaid : (row.joining_days_unpaid || 0));

    /* If the API does not send beginning balance, derive it correctly. */
    if (opening == null) {
      opening = Number(balance || 0) + Number(used || 0);
    }

    /* -------------------------------------------------------------------
       PAGE
       ------------------------------------------------------------------- */
    fillRect(doc, 0, 0, pageW, pageH, colors.white);

    /* Fine outer frame. It is intentionally subtle and printer-safe. */
    doc.setDrawColor(colors.border);
    doc.setLineWidth(0.35);
    doc.rect(10, 9, 190, 278, "S");

    /* -------------------------------------------------------------------
       HEADER
       ------------------------------------------------------------------- */
    var logo = await loadHeaderLogo();
    if (logo) {
      /* Complete official header-logo. No duplicate school name is drawn. */
      doc.addImage(logo, "PNG", left, 13, 111, 19.2, undefined, "FAST");
    }

    text(doc, "PAYSLIP FOR THE MONTH", right, 18.5, 7.8, colors.muted, "normal", { align: "right" });
    text(doc, slipMonthShort(month), right, 25, 11.5, colors.ink, "bold", { align: "right" });

    hLine(doc, left, 37, right, 37, colors.maroon, 0.8);
    hLine(doc, left, 38.5, right, 38.5, colors.orange, 0.45);

    /* -------------------------------------------------------------------
       DOCUMENT TITLE + SUMMARY
       ------------------------------------------------------------------- */
    var y = 44;

    fillRect(doc, left, y, width, 10, colors.gray);
    text(doc, "EMPLOYEE SALARY SLIP", pageW / 2, y + 6.7, 10.5, colors.ink, "bold", { align: "center" });
    y += 10;

    fillRect(doc, left, y, width, 7.5, colors.gray);
    text(doc, "SUMMARY", pageW / 2, y + 5.3, 8.8, colors.ink, "bold", { align: "center" });
    y += 7.8;

    var summary = tableDefaults(colors);
    summary.startY = y;
    summary.margin = { left: left, right: pageW - right };
    summary.body = [
      ["Employee Name", name || "—", "Designation", role || "—"],
      ["Pay Date", slipDate(payDate) || "—", "Mode", payMode || "—"]
    ];
    summary.columnStyles = {
      0: { cellWidth: 31, fontStyle: "bold" },
      1: { cellWidth: 59 },
      2: { cellWidth: 31, fontStyle: "bold" },
      3: { cellWidth: 59 }
    };
    summary.styles.cellPadding = { top: 5.0, right: 5, bottom: 5.0, left: 5 };
    doc.autoTable(summary);
    y = doc.lastAutoTable.finalY + 8;

    /* -------------------------------------------------------------------
       LEAVE INFORMATION
       ------------------------------------------------------------------- */
    y = sectionHeader(doc, "LEAVE INFORMATION", y, left, width, colors);

    var leave = tableDefaults(colors);
    leave.startY = y;
    leave.margin = { left: left, right: pageW - right };
    leave.body = [
      ["Paid Leave Balance (Beginning of Month)", slipNum(opening), "Utilised Paid Leaves", slipNum(used)],
      ["Paid Leave Balance (End of Month)", slipNum(balance), "Unpaid Leaves", slipNum(unpaid)]
    ];
    leave.columnStyles = {
      0: { cellWidth: 63, fontStyle: "bold" },
      1: { cellWidth: 27, halign: "right", fontStyle: "bold" },
      2: { cellWidth: 63, fontStyle: "bold" },
      3: { cellWidth: 27, halign: "right", fontStyle: "bold" }
    };
    doc.autoTable(leave);
    y = doc.lastAutoTable.finalY + 8;

    /* -------------------------------------------------------------------
       SALARY BREAK-UP
       ------------------------------------------------------------------- */
    y = sectionHeader(doc, "SALARY BREAK-UP", y, left, width, colors);

    var salaryTable = tableDefaults(colors);
    salaryTable.startY = y;
    salaryTable.margin = { left: left, right: pageW - right };
    salaryTable.body = [
      ["Actual Salary", slipMoney(salary), "Unpaid Leaves Deduction", slipMoney(deduction)]
    ];
    salaryTable.columnStyles = {
      0: { cellWidth: 31, fontStyle: "bold" },
      1: { cellWidth: 59, halign: "right", fontStyle: "bold" },
      2: { cellWidth: 63, fontStyle: "bold" },
      3: { cellWidth: 27, halign: "right", fontStyle: "bold" }
    };
    salaryTable.styles.cellPadding = { top: 5.5, right: 5, bottom: 5.5, left: 5 };
    salaryTable.didParseCell = function (data) {
      if (data.column.index === 3) data.cell.styles.fontStyle = "bold";
    };
    doc.autoTable(salaryTable);
    y = doc.lastAutoTable.finalY;

    /* Net salary as a formal table row, not a decorative dashboard card. */
    var netTable = tableDefaults(colors);
    netTable.startY = y;
    netTable.margin = { left: left, right: pageW - right };
    netTable.body = [
      ["Net Salary for Current Month\n(Actual Salary - Deduction)", slipMoney(net)]
    ];
    netTable.columnStyles = {
      0: { cellWidth: 90, fontStyle: "bold", halign: "center", valign: "middle" },
      1: { cellWidth: 90, halign: "right", fontStyle: "bold", fontSize: 11.2 }
    };
    netTable.styles.cellPadding = { top: 6.5, right: 5.5, bottom: 6.5, left: 5.5 };
    netTable.didParseCell = function (data) {
      if (data.column.index === 1) data.cell.styles.textColor = colors.ink;
      if (data.column.index === 0) data.cell.styles.textColor = colors.ink;
    };
    doc.autoTable(netTable);
    y = doc.lastAutoTable.finalY;

    /* -------------------------------------------------------------------
       AMOUNT IN WORDS
       ------------------------------------------------------------------- */
    var words = amountWords(net);
    var wordsTable = tableDefaults(colors);
    wordsTable.startY = y;
    wordsTable.margin = { left: left, right: pageW - right };
    wordsTable.body = [["In Words:", words]];
    wordsTable.columnStyles = {
      0: { cellWidth: 31, fontStyle: "bold" },
      1: { cellWidth: 149 }
    };
    wordsTable.styles.cellPadding = { top: 5.0, right: 5, bottom: 5.0, left: 5 };
    doc.autoTable(wordsTable);
    y = doc.lastAutoTable.finalY;

    /* Payment information is optional and appears only when actual payment
       reference/comment data exists. Internal migration notes are never shown. */
    if (payReference || comment) {
      y += 6;
      y = sectionHeader(doc, "PAYMENT DETAILS", y, left, width, colors);

      var details = [];
      if (payReference) details.push("Payment Reference: " + String(payReference));
      if (comment) details.push("Note: " + String(comment));

      var detailText = doc.splitTextToSize(details.join("  |  "), width - 8);
      text(doc, detailText, left + 5, y + 5, 8.2, colors.ink, "normal");
      y += Math.max(1, detailText.length) * 4 + 7;
    }

    /* -------------------------------------------------------------------
       FOOTER
       ------------------------------------------------------------------- */
    hLine(doc, left, pageH - 19, right, pageH - 19, colors.border, 0.3);
    text(doc, "Computer-generated salary slip • No signature required", pageW / 2, pageH - 12, 7.6, colors.muted, "normal", { align: "center" });

    var safe = name.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "Staff";
    var fileMonth = String(month || "").slice(0, 7) || "Payroll";
    doc.save(safe + "_" + fileMonth + "_Salary_Slip.pdf");
  };
})();

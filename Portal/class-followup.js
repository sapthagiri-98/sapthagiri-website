/* =====================================================================
   class-followup.js — "Fee Follow-up" page.
   TEACHER mode: only the signed-in class in-charge's own class; the server decides the class and
   returns rows with NO amounts. ADMIN mode (Management): all classes, full detail, configuration.
   The page never computes fees: every status/reason comes from followup-api.
   ===================================================================== */
(function () {
  "use strict";
  var P = window.Portal; if (!P) return;
  var esc = P.esc;
  function $(id) { return document.getElementById(id); }
  var ROOT = null, ME = null, STATE = { rows: [], filter: "attention", q: "", priority: false };
  var money = function (n) { return "₹" + Number(n || 0).toLocaleString("en-IN"); };
  var fmtD = function (iso) { if (!iso) return "—"; var p = String(iso).slice(0, 10).split("-"); return p.length === 3 ? p[2] + "-" + p[1] + "-" + p[0] : iso; };
  function toast(m, ok) {
    var t = document.createElement("div"); t.textContent = m;
    t.style.cssText = "position:fixed;bottom:22px;left:50%;transform:translateX(-50%);padding:10px 16px;border-radius:10px;color:#fff;font-size:.9rem;z-index:10000;background:" + (ok === false ? "#991b1b" : "#166534");
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3500);
  }
  function dialog(title, bodyHtml, okLabel, onOk) {
    var d = document.createElement("div"); d.className = "fu-dlg";
    d.innerHTML = "<div><h3 style='margin:0 0 4px'>" + esc(title) + "</h3>" + bodyHtml + "<div class='row'><button class='fu-btn' data-x>Cancel</button>" + (okLabel ? "<button class='fu-btn primary' data-ok>" + esc(okLabel) + "</button>" : "") + "</div></div>";
    document.body.appendChild(d);
    var close = function () { d.remove(); };
    d.addEventListener("click", function (e) { if (e.target === d || (e.target.hasAttribute && e.target.hasAttribute("data-x"))) close(); });
    var ok = d.querySelector("[data-ok]");
    if (ok) ok.addEventListener("click", async function () { ok.disabled = true; try { await onOk(d); close(); } catch (err) { toast(err.message || String(err), false); ok.disabled = false; } });
    return d;
  }

  // ---------------- badges + one student card (teacher-safe fields only) ----------------
  var REQ = { MET: ["b-met", "Minimum met"], NOT_MET: ["b-not", "Minimum not met"], HOLD: ["b-hold", "On hold"], VERIFY: ["b-ver", "Verification needed"] };
  var ACT = { NONE: "No follow-up needed", FOLLOW_UP: "Follow up", PRIORITY_FOLLOW_UP: "Priority follow-up", REVIEW_LATER: "Review later", REFER_ADMIN: "Refer to administration", VERIFY: "Do not contact yet" };
  function badges(r) {
    var q = REQ[r.requirement] || ["b-ver", r.requirement];
    return '<span class="fu-badge ' + q[0] + '">' + esc(q[1]) + "</span>" +
      '<span class="fu-badge ' + (r.action === "PRIORITY_FOLLOW_UP" ? "b-pri" : r.action === "REFER_ADMIN" ? "b-ref" : "b-hold") + '">' + esc(ACT[r.action] || r.action) + "</span>" +
      (r.referred ? '<span class="fu-badge b-ref">Referred</span>' : "");
  }
  function card(r, admin) {
    var a = r.admin;
    return '<div class="fu-card"><div><div class="fu-name">' + esc(r.name) + '</div><div class="fu-sub">ID ' + esc(r.studentId) + " · " + esc(r.classLabel) + "</div>" +
      '<div class="fu-sub">' + esc(r.fatherName) + (r.phone ? " · " + esc(r.phone) : "") + "</div></div>" +
      "<div>" + badges(r) + '<p class="fu-reason">' + esc(r.reason) + "</p>" +
      '<div class="fu-sub">Last successful payment: ' + esc(fmtD(r.lastPaymentDate)) + (r.holdUntil ? " · Review after " + esc(fmtD(r.holdUntil)) : "") +
      (r.lastContactOn ? " · Last contact " + esc(fmtD(r.lastContactOn)) + (r.lastContactOutcome ? " (" + esc(r.lastContactOutcome.toLowerCase().replace(/_/g, " ")) + ")" : "") : "") + (r.promisedOn ? " · Promised " + esc(fmtD(r.promisedOn)) : "") + "</div>" +
      (r.restrictionNote ? '<div class="fu-restrict">' + esc(r.restrictionNote) + "</div>" : "") +
      (admin && a ? '<div class="fu-sub" style="margin-top:6px;color:#334155">Min ' + money(a.minimum) + " · paid in window " + money(a.paidInWindow) + " · outstanding " + money(a.outstanding) + " · priority " + money(a.priorityBalance) + " · deferrable " + money(a.deferrableBalance) + "</div>" : "") + "</div>" +
      '<div class="fu-act">' + (admin ? adminBtns(r) : '<button class="fu-btn primary" data-a="log" data-u="' + esc(r.studentUuid) + '">Log contact</button><button class="fu-btn" data-a="hist" data-u="' + esc(r.studentUuid) + '">History</button>') + "</div></div>";
  }
  function adminBtns(r) {
    var u = esc(r.studentUuid), a = r.admin || {};
    return '<button class="fu-btn" data-a="hist" data-u="' + u + '">History</button>' +
      (a.hold ? '<button class="fu-btn" data-a="clrhold" data-u="' + u + '">Clear hold</button>' : '<button class="fu-btn" data-a="hold" data-u="' + u + '">Hold</button>') +
      (a.override ? '<button class="fu-btn" data-a="clrov" data-u="' + u + '">Clear override</button>' : '<button class="fu-btn" data-a="ov" data-u="' + u + '">Override</button>') +
      (a.restriction && a.restriction.status === "proposed" ? '<button class="fu-btn" data-a="decide" data-u="' + u + '" data-id="' + a.restriction.id + '">Decide restriction</button>' :
        a.restriction && a.restriction.status === "authorised" ? '<button class="fu-btn" data-a="lift" data-id="' + a.restriction.id + '">Lift restriction</button>' : '<button class="fu-btn" data-a="restrict" data-u="' + u + '">Propose restriction</button>');
  }

  // ---------------- filters ----------------
  var FILTERS = [["attention", "Needs attention"], ["met", "Requirement met"], ["hold", "On hold / review later"], ["verify", "Verification needed"], ["referred", "Referred"], ["all", "All"]];
  function passes(r) {
    var f = STATE.filter;
    if (f === "attention" && !["FOLLOW_UP", "PRIORITY_FOLLOW_UP", "REFER_ADMIN"].includes(r.action)) return false;
    if (f === "met" && r.requirement !== "MET") return false;
    if (f === "hold" && !(r.requirement === "HOLD" || r.action === "REVIEW_LATER")) return false;
    if (f === "verify" && r.requirement !== "VERIFY") return false;
    if (f === "referred" && !r.referred) return false;
    if (STATE.priority && !r.priority) return false;
    var q = STATE.q.trim().toLowerCase();
    return !q || (r.name + " " + r.studentId + " " + r.fatherName).toLowerCase().indexOf(q) >= 0;
  }
  function count(f) { var s = STATE.filter; STATE.filter = f; var n = STATE.rows.filter(function (r) { var q = STATE.q, p = STATE.priority; STATE.q = ""; STATE.priority = false; var ok = passes(r); STATE.q = q; STATE.priority = p; return ok; }).length; STATE.filter = s; return n; }
  function listHtml(admin) {
    var chips = '<div class="fu-chips">' + FILTERS.map(function (f) { return '<button class="fu-chip ' + (STATE.filter === f[0] ? "on" : "") + '" data-f="' + f[0] + '">' + esc(f[1]) + "<b>" + count(f[0]) + "</b></button>"; }).join("") + "</div>";
    var bar = '<div class="fu-bar"><input type="text" id="fuQ" placeholder="Search name, ID or parent…" value="' + esc(STATE.q) + '"><label style="font-size:.85rem"><input type="checkbox" id="fuPri" ' + (STATE.priority ? "checked" : "") + "> Priority only</label></div>";
    var rows = STATE.rows.filter(passes);
    return chips + bar + (rows.length ? '<div class="fu-list">' + rows.map(function (r) { return card(r, admin); }).join("") + "</div>" : '<div class="fu-empty">No students in this view.</div>');
  }
  function wireList(host, admin) {
    host.addEventListener("click", function (e) {
      var c = e.target.closest && e.target.closest("[data-f]"); if (c) { STATE.filter = c.getAttribute("data-f"); redraw(admin); return; }
      var b = e.target.closest && e.target.closest("[data-a]"); if (b) rowAction(b.getAttribute("data-a"), b, admin);
    });
    host.addEventListener("input", function (e) {
      if (e.target.id === "fuQ") { STATE.q = e.target.value; var pos = e.target.selectionStart; redraw(admin); var q = $("fuQ"); if (q) { q.focus(); q.setSelectionRange(pos, pos); } }
      if (e.target.id === "fuPri") { STATE.priority = e.target.checked; redraw(admin); }
    });
  }
  function redraw(admin) { var h = $("fuList"); if (h) h.innerHTML = listHtml(admin); }
  function rowOf(uuid) { return STATE.rows.filter(function (r) { return r.studentUuid === uuid; })[0]; }

  // ---------------- row actions ----------------
  async function rowAction(act, btn, admin) {
    var uuid = btn.getAttribute("data-u"), id = btn.getAttribute("data-id"), r = uuid ? rowOf(uuid) : null;
    var reload = admin ? loadAdminClass : loadTeacher;
    if (act === "log") return logDlg(r, reload);
    if (act === "hist") {
      var h = await P.api("fuContactHistory", [uuid]);
      return dialog("Contact history — " + r.name, h.length ? "<table class='fu-t'><tr><th>Date</th><th>Outcome</th><th>Notes</th><th>By</th></tr>" + h.map(function (x) { return "<tr><td>" + esc(fmtD(x.contacted_on)) + "</td><td>" + esc(x.outcome) + "</td><td>" + esc([x.response, x.remark, x.promised_on ? "Promised " + fmtD(x.promised_on) : ""].filter(Boolean).join(" · ")) + "</td><td>" + esc(x.created_by) + "</td></tr>"; }).join("") + "</table>" : "<p>No contacts logged yet.</p>", null);
    }
    var run = async function (fn, args, msg) { await P.api(fn, args); toast(msg); await reload(); };
    if (act === "hold") return dialog("Set follow-up hold — " + r.name, "<label>Hold until</label><input type='date' id='d1'><label>Reason *</label><input id='d2' maxlength='300'>", "Set hold", function (d) { return run("fuSetHold", [uuid, d.querySelector("#d1").value, d.querySelector("#d2").value], "Hold set."); });
    if (act === "clrhold") return run("fuClearHold", [uuid], "Hold cleared.");
    if (act === "clrov") return run("fuClearOverride", [uuid], "Override cleared.");
    if (act === "ov") return dialog("Override recommendation — " + r.name,
      "<label>Set recommendation to</label><select id='d1'><option value='NONE'>No follow-up needed</option><option value='FOLLOW_UP'>Follow up</option><option value='PRIORITY_FOLLOW_UP'>Priority follow-up</option><option value='REVIEW_LATER'>Review later</option><option value='REFER_ADMIN'>Refer to administration</option></select>" +
      "<label>Internal reason * (admin only)</label><input id='d2' maxlength='300'><label>Note shown to teacher (no amounts)</label><input id='d3' maxlength='160'><label>Expires on (optional)</label><input type='date' id='d4'>", "Save override",
      function (d) { return run("fuSetOverride", [uuid, d.querySelector("#d1").value, d.querySelector("#d2").value, d.querySelector("#d3").value, d.querySelector("#d4").value], "Override saved."); });
    if (act === "restrict") return dialog("Propose restriction — " + r.name,
      "<p style='font-size:.8rem;color:#64748b'>Nothing is restricted until an administrator authorises it. Attendance, exams and eligibility are never changed automatically.</p><label>Scope</label>" +
      ["classes:Classroom attendance", "games:Games and sports", "exams:FA/SA examinations", "tests:Slip, revision and class tests"].map(function (s) { var p = s.split(":"); return "<label style='font-weight:500'><input type='checkbox' class='sc' value='" + p[0] + "' style='width:auto'> " + p[1] + "</label>"; }).join("") + "<label>Reason *</label><input id='d2' maxlength='300'>", "Propose",
      function (d) { var sc = Array.prototype.map.call(d.querySelectorAll(".sc:checked"), function (x) { return x.value; }); return run("fuProposeRestriction", [uuid, sc, d.querySelector("#d2").value], "Restriction proposed (not yet in force)."); });
    if (act === "decide" || act === "lift") {
      var opts = act === "decide" ? "<option value='authorised'>Authorise</option><option value='rejected'>Reject</option>" : "<option value='lifted'>Lift restriction</option>";
      return dialog(act === "decide" ? "Decide restriction" : "Lift restriction", "<label>Decision</label><select id='d1'>" + opts + "</select><label>Reason *</label><input id='d2' maxlength='300'>", "Confirm",
        function (d) { return run("fuDecideRestriction", [Number(id), d.querySelector("#d1").value, d.querySelector("#d2").value], "Decision recorded."); });
    }
  }
  function logDlg(r, reload) {
    dialog("Log parent contact — " + r.name,
      "<label>Date contacted</label><input type='date' id='c1'><label>Outcome *</label><select id='c2'><option value='REACHED'>Spoke to parent</option><option value='NO_ANSWER'>No answer</option><option value='PROMISED'>Parent promised to pay</option><option value='REFUSED'>Unable / unwilling to pay</option><option value='WRONG_NUMBER'>Wrong number</option><option value='OTHER'>Other</option><option value='REFERRED'>Refer to administration</option></select>" +
      "<label>Parent's response</label><input id='c3' maxlength='300'><label>Promised payment date</label><input type='date' id='c4'><label>Remark</label><textarea id='c5' rows='2' maxlength='500'></textarea>" +
      "<p style='font-size:.75rem;color:#64748b'>Please do not record fee amounts here.</p>", "Save",
      async function (d) {
        await P.api("fuLogContact", [{ studentUuid: r.studentUuid, contactedOn: d.querySelector("#c1").value || undefined, outcome: d.querySelector("#c2").value, response: d.querySelector("#c3").value, promisedOn: d.querySelector("#c4").value, remark: d.querySelector("#c5").value }]);
        toast("Saved."); await reload();
      });
  }

  // ---------------- teacher page ----------------
  function summaryLine(s) { return s.total + " students · " + s.needsAttention + " need attention · " + s.met + " met · " + s.onHold + " on hold" + (s.verify ? " · " + s.verify + " to be verified by administration" : ""); }
  async function loadTeacher() {
    var d = await P.api("fuMyClass", []);
    STATE.rows = d.students;
    ROOT.innerHTML = '<div class="fu-title"><h2>My Class – Fee Follow-up</h2><span class="fu-badge b-hold">' + esc(d.classLabel) + "</span></div>" +
      '<p class="fu-note">' + esc(summaryLine(d.summary)) + ". Fee amounts are managed by administration and are not shown here.</p><div id=\"fuList\"></div>";
    var list = $("fuList"); list.innerHTML = listHtml(false); if (!list._w) { list._w = 1; wireList(list, false); }
  }

  // ---------------- admin pages ----------------
  var ADMIN_TAB = "overview", ADMIN_CLASS = "Nursery";
  function adminShell(inner) {
    var tabs = [["overview", "Overview"], ["class", "Class detail"], ["policy", "Policy & calendar"], ["activity", "Activity & audit"]];
    ROOT.innerHTML = '<div class="fu-title"><h2>Fee Follow-up — Administration</h2></div><p class="fu-note">Recommendations only. Nothing here changes fees, payments, attendance or exam eligibility.</p>' +
      '<div class="fu-tabs">' + tabs.map(function (t) { return '<div class="fu-tab ' + (ADMIN_TAB === t[0] ? "on" : "") + '" data-t="' + t[0] + '">' + t[1] + "</div>"; }).join("") + "</div><div id=\"fuTab\">" + inner + "</div>";
    ROOT.querySelectorAll(".fu-tab").forEach(function (t) { t.addEventListener("click", function () { ADMIN_TAB = t.getAttribute("data-t"); loadAdmin(); }); });
  }
  async function loadAdmin() {
    if (ADMIN_TAB === "overview") {
      var o = await P.api("fuAdminOverview", []);
      adminShell("<table class='fu-t'><tr><th>Class</th><th>In-charge</th><th>Students</th><th>Needs attention</th><th>Met</th><th>On hold</th><th>Verify</th><th>Referred</th><th></th></tr>" + o.map(function (c) {
        return "<tr><td>" + esc(c.label) + "</td><td>" + (c.incharge ? esc(c.incharge) : "<span style='color:#991b1b'>Not assigned</span>") + "</td><td>" + c.total + "</td><td>" + c.needsAttention + "</td><td>" + c.met + "</td><td>" + c.onHold + "</td><td>" + c.verify + "</td><td>" + c.referred + "</td><td><button class='fu-btn' data-open='" + esc(c.code) + "'>Open</button></td></tr>"; }).join("") + "</table>");
      $("fuTab").addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-open]"); if (b) { ADMIN_CLASS = b.getAttribute("data-open"); ADMIN_TAB = "class"; loadAdmin(); } });
    } else if (ADMIN_TAB === "class") { await loadAdminClass(); }
    else if (ADMIN_TAB === "policy") { await loadPolicy(); }
    else {
      var a = await P.api("fuAdminActivity", []);
      adminShell("<h3>Teacher follow-up activity</h3>" + (a.contacts.length ? "<table class='fu-t'><tr><th>When</th><th>Class</th><th>By</th><th>Outcome</th><th>Promised</th><th>Referred</th></tr>" + a.contacts.map(function (c) { return "<tr><td>" + esc(String(c.created_at).slice(0, 16).replace("T", " ")) + "</td><td>" + esc(c.classLabel) + "</td><td>" + esc(c.created_by) + "</td><td>" + esc(c.outcome) + "</td><td>" + esc(fmtD(c.promised_on)) + "</td><td>" + (c.referred ? "Yes" : "") + "</td></tr>"; }).join("") + "</table>" : "<p>None yet.</p>") +
        "<h3 style='margin-top:18px'>Audit trail</h3>" + (a.audit.length ? "<table class='fu-t'><tr><th>When</th><th>User</th><th>Action</th><th>Detail</th></tr>" + a.audit.map(function (x) { return "<tr><td>" + esc(String(x.ts).slice(0, 16).replace("T", " ")) + "</td><td>" + esc(x.user_name) + "</td><td>" + esc(x.action) + "</td><td>" + esc(JSON.stringify(x.new_value || {}).slice(0, 160)) + "</td></tr>"; }).join("") + "</table>" : "<p>None yet.</p>"));
    }
  }
  async function loadAdminClass() {
    var d = await P.api("fuAdminClass", [ADMIN_CLASS]); STATE.rows = d.students;
    var sel = ["Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].map(function (c) { return "<option value='" + c + "' " + (c === ADMIN_CLASS ? "selected" : "") + ">" + (/^\d/.test(c) ? "Class " + c : c) + "</option>"; }).join("");
    ADMIN_TAB = "class";
    adminShell("<div class='fu-bar'><select id='fuCls'>" + sel + "</select><span class='fu-note' style='margin:0'>In-charge: " + (d.incharge ? esc(d.incharge) : "not assigned") + " · " + esc(summaryLine(d.summary)) + "</span></div><div id='fuList'></div>");
    $("fuCls").addEventListener("change", function (e) { ADMIN_CLASS = e.target.value; loadAdminClass(); });
    var list = $("fuList"); list.innerHTML = listHtml(true); wireList(list, true);
  }
  async function loadPolicy() {
    var p = await P.api("fuGetPolicy", []);
    var f = function (id, label, val, type) { return "<div class='f'><label>" + esc(label) + "</label><input id='" + id + "' type='" + (type || "number") + "' value='" + esc(val) + "'></div>"; };
    adminShell("<h3>Minimum payment per month</h3><div class='fu-pol'>" + p.bands.map(function (b, i) { return f("pb" + i, b.name + " (₹)", b.amount); }).join("") + "</div>" +
      "<h3 style='margin-top:16px'>Rules</h3><div class='fu-pol'>" + f("pRev", "Review period (days)", p.reviewDays) + f("pHold", "Hold after a substantial payment (months, 1–2)", p.holdMonths) + f("pSub", "Substantial payment = × monthly minimum", p.substantialMultiple) + f("pLow", "February: hold only if remaining ≤ × minimum", p.lowBalanceMultiple) + f("pRe", "Do not re-contact within (days)", p.recontactDays) + "</div>" +
      "<h3 style='margin-top:16px'>Fee priorities & collection calendar</h3><div class='fu-pol'>" + f("pPri", "Priority fee codes (comma separated)", p.priorityFeeTypes.join(","), "text") + f("pDef", "Deferrable fee codes", p.deferrableFeeTypes.join(","), "text") + f("pPush", "Extra-attention month (2 = Feb)", p.calendar.pushMonth) + f("pTgt", "Target collection month (3 = Mar)", p.calendar.targetMonth) + f("pEnd", "School year ends (4 = Apr)", p.calendar.yearEndMonth) + "</div>" +
      "<p style='margin-top:14px'><button class='fu-btn primary' id='pSave'>Save policy</button></p>");
    $("pSave").addEventListener("click", async function () {
      var v = function (id) { return $(id).value; }, list = function (id) { return v(id).split(",").map(function (x) { return x.trim(); }).filter(Boolean); };
      var np = { bands: p.bands.map(function (b, i) { return Object.assign({}, b, { amount: Number(v("pb" + i)) }); }), reviewDays: Number(v("pRev")), holdMonths: Number(v("pHold")), substantialMultiple: Number(v("pSub")), lowBalanceMultiple: Number(v("pLow")), recontactDays: Number(v("pRe")), priorityFeeTypes: list("pPri"), deferrableFeeTypes: list("pDef"), calendar: { pushMonth: Number(v("pPush")), targetMonth: Number(v("pTgt")), yearEndMonth: Number(v("pEnd")) } };
      try { await P.api("fuSavePolicy", [np]); toast("Policy saved."); } catch (e) { toast(e.message, false); }
    });
  }

  async function boot() {
    P.bootPage("followup"); ROOT = $("fuRoot");
    try {
      ME = await P.api("fuWhoAmI", []);
      if (ME.isAdmin) { await loadAdmin(); }
      else if (ME.classCode) { await loadTeacher(); }
      else ROOT.innerHTML = '<div class="fu-empty">You are not assigned as a class in-charge. Please contact administration.</div>';
    } catch (e) { ROOT.innerHTML = '<div class="fu-empty">' + esc(e.message || e) + "</div>"; }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();

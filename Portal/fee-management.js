/* =========================================================================
   fee-management.js — Fee Management (ledger-first, Supabase) · v6 (drop-in)
   Primary = STUDENT LEDGER. Sub-tabs: Ledger · Collect · Fee Sheet · Reports ·
   Tools. Receipts/ledger PDFs via ReceiptShare (browser, native share, no
   storage). Uses window.Portal + backend fees-api v3.
   v6: Outstanding grouped by CHARGE year (dues + allocations to that year) ·
       Complete view groups payments by fee type, ordered by date · year filter
       drives cards+views · truthful totals · Fee-Sheet Total column · Collect
       year/class/student dropdowns · nicer printable Reports.
   ========================================================================= */
(function () {
  "use strict";
  var P = window.Portal, session = P.bootPage("feemgmt");
  if (!session) return;
  var esc = P.esc, $ = function (id) { return document.getElementById(id); };
  var ME = session.name || "Admin", GATE = "fin_gate_v3";
  css();
  var BOOT = null, YEAR = "";
  var L = { student: null, account: null, fin: null, stmt: null, view: "ALL", yview: "ALL", perYear: [] };
  var PAY = { student: null, account: null, choice: "" };
  var SHEET = { data: null };
  gate();

  /* ---- gate ---- */
  function gate() {
    if (rg()) return boot();
    $("view").innerHTML = '<div class="fin-gate"><i class="material-icons">lock</i><h3>Fee Management</h3><p>Enter the module password.</p><input id="gp" type="password" autocomplete="off"/><button class="btn btn-maroon" id="gb" style="width:100%;justify-content:center"><i class="material-icons">login</i> Unlock</button><div class="fin-err" id="ge" style="display:none"></div></div>';
    $("gb").onclick = sg; $("gp").addEventListener("keydown", function (e) { if (e.key === "Enter") sg(); }); setTimeout(function () { $("gp").focus(); }, 80);
  }
  function sg() { var pw = $("gp").value; if (!pw) return ge("Enter the password."); P.api("feeVerifyPassword", [pw], { text: "Verifying…" }).then(function (r) { if (r && r.success) { wg(r.expiresInMin || 45); boot(); } else ge("Incorrect password."); }).catch(function (e) { ge(e.message || e); }); }
  function ge(m) { var e = $("ge"); e.textContent = m; e.style.display = "block"; }
  function rg() { try { var g = JSON.parse(sessionStorage.getItem(GATE)); if (!g || Date.now() > g.exp) return null; return g; } catch (e) { return null; } }
  function wg(min) { sessionStorage.setItem(GATE, JSON.stringify({ exp: Date.now() + min * 60000 })); }

  /* ---- boot ---- */
  function boot() { $("view").innerHTML = mt("Loading finance…"); P.api("feeBootstrap", [], { overlay: false }).then(function (b) { BOOT = b; YEAR = b.currentYear; shell(); }).catch(function (e) { $("view").innerHTML = eb(e); }); }
  function shell() {
    $("view").innerHTML =
      '<div class="fin-head"><span class="chip">Management</span><h1 class="fin-title">Fee Management</h1><p class="fin-sub">Student ledger · print receipts &amp; ledgers · collect payments — all in one place.</p></div>' +
      '<div class="fin-tabs" id="tabs">' + tb("ledger", "receipt_long", "Ledger") + tb("collect", "point_of_sale", "Collect") + tb("sheet", "grid_on", "Fee Sheet") + tb("reports", "insights", "Reports") + tb("tools", "settings", "Tools") + '</div>' +
      '<div id="pLedger"></div><div id="pCollect" style="display:none"></div><div id="pSheet" style="display:none"></div><div id="pReports" style="display:none"></div><div id="pTools" style="display:none"></div>' + modalHost();
    Array.prototype.forEach.call($("tabs").querySelectorAll("button"), function (b) { b.onclick = function () { sw(b.getAttribute("data-t")); }; });
    mountLedger();
  }
  function tb(id, ic, l) { return '<button data-t="' + id + '"' + (id === "ledger" ? ' class="active"' : "") + '><i class="material-icons">' + ic + '</i>' + l + '</button>'; }
  function sw(t) {
    ["ledger", "collect", "sheet", "reports", "tools"].forEach(function (x) { $("p" + cap(x)).style.display = (x === t ? "block" : "none"); });
    Array.prototype.forEach.call($("tabs").querySelectorAll("button"), function (b) { b.classList.toggle("active", b.getAttribute("data-t") === t); });
    if (t === "collect" && !$("pCollect").innerHTML) mountCollect();
    if (t === "sheet" && !$("pSheet").innerHTML) mountSheet();
    if (t === "reports" && !$("pReports").innerHTML) mountReports();
    if (t === "tools" && !$("pTools").innerHTML) mountTools();
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* ======================= LEDGER (primary) ======================= */
  function mountLedger() {
    var years = (BOOT.years || []).map(function (y) { return '<option' + (y === YEAR ? " selected" : "") + '>' + esc(y) + '</option>'; }).join("");
    $("pLedger").innerHTML =
      '<div class="bar"><div class="srch"><i class="material-icons">search</i><input id="lS" placeholder="Search any student — name, ID, phone (incl. left)"/><button class="clr" id="lC">&times;</button></div><div id="lR" class="res"></div>' +
      '<div class="or"><span>or pick</span></div><div class="pick">' + selc("event", "Academic Year", '<select id="lY" class="in">' + years + '</select>') + selc("groups", "Class", '<select id="lCl" class="in"><option value="">Loading…</option></select>') + selc("person", "Student", '<select id="lSt" class="in" disabled><option value="">Pick a class…</option></select>') + '</div></div>' +
      '<div id="lB"><div class="empty"><i class="material-icons">account_balance</i>Search or pick a student to view the ledger.</div></div>';
    var t = null;
    $("lS").addEventListener("input", function () { var v = this.value; clearTimeout(t); t = setTimeout(function () { search("lR", v, openLedger); }, 250); });
    $("lC").onclick = function () { $("lS").value = ""; $("lR").innerHTML = ""; };
    $("lY").onchange = function () { YEAR = this.value; classes("lCl"); };
    $("lCl").onchange = function () { students("lCl", "lSt"); };
    $("lSt").onchange = function () { if (this.value) openLedger(this.value); };
    classes("lCl");
  }
  function classes(id) { var s = $(id); s.innerHTML = '<option>Loading…</option>'; P.api("feeGetClasses", [YEAR], { overlay: false }).then(function (cs) { s.innerHTML = '<option value="">Select class…</option>' + (cs || []).map(function (c) { return '<option>' + esc(c) + '</option>'; }).join(""); }).catch(function () { s.innerHTML = '<option>Failed</option>'; }); }
  function students(clsId, stId) { var cls = $(clsId).value, s = $(stId); if (!cls) { s.disabled = true; s.innerHTML = '<option>Pick a class…</option>'; return; } s.disabled = true; s.innerHTML = '<option>Loading…</option>'; P.api("feeGetStudents", [YEAR, cls], { overlay: false }).then(function (list) { s.disabled = false; s.innerHTML = '<option value="">Select student…</option>' + (list || []).map(function (x) { return '<option value="' + esc(x.id) + '">' + esc(x.name) + (x.left ? " (left)" : "") + '</option>'; }).join(""); }).catch(function () { s.innerHTML = '<option>Failed</option>'; }); }
  function search(boxId, q, onPick) { var box = $(boxId); q = (q || "").trim(); if (!q) { box.innerHTML = ""; return; } box.innerHTML = ld("Searching…"); P.api("feeSearchStudents", [q], { overlay: false }).then(function (res) { var rows = res.rows || []; box.innerHTML = rows.length ? rows.map(function (s) { return '<div class="row" data-id="' + esc(s.id) + '"><div class="rm"><b>' + esc(s.name) + '</b><span>' + esc(s.id) + (s.className ? ' · ' + esc(s.className) : '') + (s.phone ? ' · ' + esc(s.phone) : '') + '</span></div><div>' + (s.outstanding > 0 ? '<span class="due">Due ' + money(s.outstanding) + '</span>' : '<span class="ok">Clear</span>') + '</div></div>'; }).join("") : '<div class="rem">No students found.</div>'; Array.prototype.forEach.call(box.querySelectorAll(".row"), function (el) { el.onclick = function () { box.innerHTML = ""; onPick(el.getAttribute("data-id")); }; }); }).catch(function (e) { box.innerHTML = eb(e); }); }
  function openLedger(id) { $("lS").value = ""; $("lB").innerHTML = mt("Loading ledger…"); P.api("feeGetStudentFinance", [id], { overlay: false }).then(function (f) { L.fin = f; L.student = f.student; L.account = f.account; L.stmt = null; L.view = "ALL"; L.yview = "ALL"; renderLedger(); }).catch(function (e) { $("lB").innerHTML = eb(e); }); }
  function renderLedger() {
    var s = L.student, a = L.account;
    L.perYear = (L.fin && L.fin.perYear) || [];
    if (!L.yview) L.yview = "ALL";
    $("lB").innerHTML =
      '<div class="sbar"><div class="sn">' + esc(s.name) + '</div><div class="sm">' + esc(a.className || "") + ' · ID ' + esc(s.id) + (s.phone ? ' · ' + esc(s.phone) : '') + '</div></div>' +
      '<div class="tots" id="lTot" style="margin-top:12px"></div>' +
      '<div class="actbar">' +
      selc("filter_list", "View Ledger", '<select id="lV" class="in">' + viewOptions() + '</select>') +
      selc("event", "Year", '<select id="lYr" class="in">' + yearOptions() + '</select>') +
      '<div class="acts"><button class="btn btn-outline btn-sm" id="pLg"><i class="material-icons">print</i> Print/Share Ledger</button><button class="btn btn-maroon btn-sm" id="cP"><i class="material-icons">point_of_sale</i> Collect</button></div>' +
      '</div><div id="lD"></div>';
    $("lV").value = L.view; $("lYr").value = L.yview;
    $("lV").onchange = function () { L.view = this.value; refresh(); };
    $("lYr").onchange = function () { L.yview = this.value; refresh(); };
    $("pLg").onclick = printLedger;
    $("cP").onclick = function () { sw("collect"); setTimeout(function () { collectOpen(s.id); }, 40); };
    refresh();
  }
  function ensureStmt(cb) { if (L.stmt) return cb(); P.api("feeGetStatement", [L.student.id, null], { overlay: false }).then(function (d) { L.stmt = d; cb(); }); }
  function refresh() { ensureStmt(function () { fillTotals(); detail(); }); }
  function detail() {
    if (L.view === "__OUT__") return outstandingView();
    if (L.view && L.view !== "ALL") return category(L.view);
    return completeView();
  }
  function withReceipt(rid, cb) { P.api("feeGetReceipt", [rid], { text: "Preparing receipt…" }).then(cb).catch(function (e) { toast(e.message || e, "err"); }); }
  function wireReceiptButtons() {
    Array.prototype.forEach.call($("lD").querySelectorAll(".rP"), function (b) { b.onclick = function () { withReceipt(b.getAttribute("data-r"), function (r) { ReceiptShare.print(r); }); }; });
    Array.prototype.forEach.call($("lD").querySelectorAll(".rS"), function (b) { b.onclick = function () { withReceipt(b.getAttribute("data-r"), function (r) { ReceiptShare.share(r); }); }; });
  }

  function byAsc(a, b) { return a.year < b.year ? -1 : 1; }
  function sumf(arr, k) { return arr.reduce(function (s, x) { return s + (Number(x[k]) || 0); }, 0); }
  function fillTotals() {
    var per = (L.stmt.perYear || []).slice().sort(byAsc);
    var A, C, R, lbl;
    if (L.yview === "ALL") {
      var opening = per.length ? (Number(per[0].openingBal) || 0) : 0;
      A = opening + sumf(per, "charged"); C = sumf(per, "collected");
      R = per.length ? (Number(per[per.length - 1].balance) || 0) : 0;
      lbl = "Assigned (all years)";
    } else {
      var y = per.filter(function (x) { return x.year === L.yview; })[0] || { openingBal: 0, charged: 0, collected: 0, balance: 0 };
      A = (Number(y.openingBal) || 0) + (Number(y.charged) || 0); C = Number(y.collected) || 0; R = Number(y.balance) || 0;
      lbl = "Assigned " + L.yview;
    }
    var el = $("lTot"); if (el) el.innerHTML = tot(money(A), lbl, "") + tot(money(C), "Collected", "green") + tot(money(R), "Arrears", R > 0 ? "red" : "green");
  }

  /* Complete view — year summary + payments grouped by FEE TYPE, by date. */
  function completeView() {
    var yf = L.yview;
    var years = (L.stmt.perYear || []).slice().sort(byAsc);
    if (yf !== "ALL") years = years.filter(function (y) { return y.year === yf; });
    var rows = years.map(function (y) {
      return '<tr><td data-label="Year">' + esc(y.year) + '</td><td data-label="Class">' + esc(y.className || "") + '</td>' +
        '<td class="r" data-label="Opening">' + money(y.openingBal) + '</td><td class="r" data-label="Charged">' + money(y.charged) + '</td>' +
        '<td class="r" data-label="Collected">' + money(y.collected) + '</td><td class="r" data-label="Closing"><b>' + money(y.balance) + '</b></td></tr>';
    }).join("") || '<tr><td colspan="6" class="mut">No charges.</td></tr>';

    var allocs = [];
    (L.stmt.receipts || []).forEach(function (p) {
      if (p.status === "Void") return;
      (p.allocations || []).forEach(function (a) {
        if (yf !== "ALL" && a.year !== yf) return;
        allocs.push({ label: a.label, year: a.year, amount: Number(a.amount) || 0, date: p.date, receiptId: p.receiptId, mode: p.mode });
      });
    });
    var byType = {};
    allocs.forEach(function (a) { (byType[a.label] = byType[a.label] || []).push(a); });
    var typeNames = Object.keys(byType).sort();
    var payBlocks = typeNames.map(function (nm) {
      var list = byType[nm].slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      var sub = list.reduce(function (s, x) { return s + x.amount; }, 0);
      var trs = list.map(function (a) {
        return '<tr><td data-label="Date">' + esc(pd(a.date)) + '</td><td data-label="Receipt">' + esc(a.receiptId) + '</td>' +
          '<td data-label="Year"><span class="yr">' + esc(a.year) + '</span></td><td data-label="Mode">' + esc(a.mode) + '</td>' +
          '<td class="r" data-label="Amount">' + money(a.amount) + '</td>' +
          '<td data-label=""><button class="mini rP" data-r="' + esc(a.receiptId) + '"><i class="material-icons" style="font-size:15px">print</i></button> <button class="mini rS" data-r="' + esc(a.receiptId) + '"><i class="material-icons" style="font-size:15px">ios_share</i></button></td></tr>';
      }).join("");
      return '<div class="catyear"><div class="catyh">' + esc(nm) + ' · ' + money(sub) + '</div>' +
        '<div class="tw"><table class="tbl"><thead><tr><th>Date</th><th>Receipt</th><th>Yr</th><th>Mode</th><th class="r">Amount</th><th></th></tr></thead><tbody>' + trs + '</tbody></table></div></div>';
    }).join("") || '<div class="se"><i class="material-icons">info</i>No payments' + (yf !== "ALL" ? " in " + esc(yf) : "") + '.</div>';

    $("lD").innerHTML =
      '<div class="sh"><i class="material-icons">table_view</i> Year-wise Summary' + (yf !== "ALL" ? " · " + esc(yf) : "") + '</div>' +
      '<div class="tw"><table class="tbl"><thead><tr><th>Year</th><th>Class</th><th class="r">Opening</th><th class="r">Charged</th><th class="r">Collected</th><th class="r">Closing</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="sh"><i class="material-icons">history</i> Payments by Fee Type' + (yf !== "ALL" ? " · " + esc(yf) : "") + '</div>' + payBlocks;
    wireReceiptButtons();
  }

  /* Outstanding — organised by CHARGE (allocation) year: that year's dues +
     the payments allocated to that year (whenever received), by date. */
  function outstandingView() {
    var yf = L.yview;
    var years = (L.stmt.perYear || []).slice().sort(byAsc);
    if (yf !== "ALL") years = years.filter(function (y) { return y.year === yf; });

    var allocByYear = {};
    (L.stmt.receipts || []).forEach(function (p) {
      if (p.status === "Void") return;
      (p.allocations || []).forEach(function (a) {
        (allocByYear[a.year] = allocByYear[a.year] || []).push({ label: a.label, amount: Number(a.amount) || 0, date: p.date, receiptId: p.receiptId, mode: p.mode });
      });
    });

    var totAssigned = 0, totCollected = 0, totRemaining = 0;
    var blocks = years.map(function (y) {
      var assigned = (y.charges || []).reduce(function (s, c) { return s + (Number(c.assigned) || 0); }, 0);
      var collected = (y.charges || []).reduce(function (s, c) { return s + (Number(c.paid) || 0); }, 0);
      var remaining = (y.charges || []).reduce(function (s, c) { return s + (Number(c.balance) || 0); }, 0);
      totAssigned += assigned; totCollected += collected; totRemaining += remaining;

      var dueRows = (y.charges || []).slice().sort(function (a, b) { return (a.label < b.label ? -1 : 1); }).map(function (c) {
        return '<tr class="' + (c.balance > 0 ? "d" : "c") + '"><td data-label="Fee">' + esc(c.label) + '</td><td class="r" data-label="Assigned">' + money(c.assigned) + '</td><td class="r" data-label="Collected">' + money(c.paid) + '</td><td class="r" data-label="Remaining">' + money(c.balance) + '</td></tr>';
      }).join("") || '<tr><td colspan="4" class="mut">No dues entered.</td></tr>';

      var pays = (allocByYear[y.year] || []).slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      var payRows = pays.map(function (a) {
        return '<tr><td data-label="Date">' + esc(pd(a.date)) + '</td><td data-label="Receipt">' + esc(a.receiptId) + '</td><td data-label="Fee">' + esc(a.label) + '</td><td data-label="Mode">' + esc(a.mode) + '</td><td class="r" data-label="Amount">' + money(a.amount) + '</td></tr>';
      }).join("") || '<tr><td colspan="5" class="mut">No payments allocated to this year.</td></tr>';

      return '<div class="catyear"><div class="catyh">' + esc(y.year) + (y.className ? " · " + esc(y.className) : "") + ' · Assigned ' + money(assigned) + ' · Collected ' + money(collected) + ' · ' + (remaining > 0 ? '<span class="duep">Due ' + money(remaining) + '</span>' : '<span class="okp">Cleared</span>') + '</div>' +
        '<div class="tw"><table class="tbl"><thead><tr><th>Fee (dues entered)</th><th class="r">Assigned</th><th class="r">Collected</th><th class="r">Remaining</th></tr></thead><tbody>' + dueRows + '</tbody></table></div>' +
        '<div class="tw" style="margin-top:8px"><table class="tbl"><thead><tr><th>Date</th><th>Receipt</th><th>Fee</th><th>Mode</th><th class="r">Amount</th></tr></thead><tbody>' + payRows + '</tbody></table></div></div>';
    }).join("");

    var head = '<div class="sh"><i class="material-icons">account_balance_wallet</i> Outstanding by Academic Year' + (yf !== "ALL" ? " · " + esc(yf) : "") + '</div>' +
      '<div class="ssum"><div class="si"><span class="sl">Assigned</span><span class="sv">' + money(totAssigned) + '</span></div>' +
      '<div class="si"><span class="sl">Collected</span><span class="sv c">' + money(totCollected) + '</span></div>' +
      '<div class="si"><span class="sl">Remaining</span><span class="sv ' + (totRemaining > 0 ? "dd" : "c") + '">' + money(totRemaining) + '</span></div></div>';
    if (!blocks) blocks = '<div class="se"><i class="material-icons">info</i>No dues' + (yf !== "ALL" ? " in " + esc(yf) : "") + '.</div>';
    $("lD").innerHTML = head + blocks;
  }

  function category(cat) {
    var yf = L.yview;
    var years = (L.stmt.perYear || []).slice().sort(byAsc);
    if (yf !== "ALL") years = years.filter(function (y) { return y.year === yf; });
    var payByYear = {};
    (L.stmt.receipts || []).forEach(function (p) {
      (p.allocations || []).forEach(function (al) {
        if (al.label !== cat) return;
        (payByYear[al.year] = payByYear[al.year] || []).push({ date: p.date, receiptId: p.receiptId, amount: Number(al.amount) || 0, status: p.status });
      });
    });
    var totA = 0, totP = 0, totR = 0, blocks = "";
    years.forEach(function (y) {
      var ch = (y.charges || []).filter(function (c) { return c.label === cat; })[0];
      var assigned = ch ? Number(ch.assigned) || 0 : 0, paid = ch ? Number(ch.paid) || 0 : 0, bal = ch ? Number(ch.balance) || 0 : 0;
      var pays = (payByYear[y.year] || []).slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      if (assigned === 0 && paid === 0 && !pays.length) return;
      totA += assigned; totP += paid; totR += bal;
      var run = assigned;
      var rows = '<div class="sr op"><div class="dot"><i class="material-icons">receipt_long</i></div><div class="mn"><div class="tt">Fee Assigned</div><div class="sub">' + esc(y.year) + (y.className ? " · " + esc(y.className) : "") + '</div></div><div class="am"><div class="a">' + money(assigned) + '</div><div class="bl">Balance ' + money(run) + '</div></div></div>';
      pays.forEach(function (pp) { if (pp.status === "Void") return; run -= pp.amount; rows += '<div class="sr py"><div class="dot py"><i class="material-icons">payments</i></div><div class="mn"><div class="tt">' + esc(pd(pp.date)) + '</div><div class="sub">Receipt ' + esc(pp.receiptId) + '</div></div><div class="am"><div class="a pd">+' + money(pp.amount) + '</div><div class="bl' + (run > 0.5 ? "" : " c") + '">Balance ' + money(Math.max(run, 0)) + '</div></div></div>'; });
      blocks += '<div class="catyear"><div class="catyh">' + esc(y.year) + (bal > 0 ? ' · <span class="duep">Due ' + money(bal) + '</span>' : ' · <span class="okp">Cleared</span>') + '</div><div class="stmt">' + rows + '</div></div>';
    });
    var head = '<div class="sh"><i class="material-icons">description</i> ' + esc(cat) + ' — Statement' + (yf !== "ALL" ? ' (' + esc(yf) + ')' : ' (per year)') + '</div>' +
      '<div class="ssum"><div class="si"><span class="sl">Assigned</span><span class="sv">' + money(totA) + '</span></div><div class="si"><span class="sl">Collected</span><span class="sv c">' + money(totP) + '</span></div><div class="si"><span class="sl">Remaining</span><span class="sv ' + (totR > 0 ? "dd" : "c") + '">' + money(totR) + '</span></div></div>';
    if (!blocks) blocks = '<div class="se"><i class="material-icons">info</i>No ' + esc(cat) + ' activity' + (yf !== "ALL" ? ' in ' + esc(yf) : '') + '.</div>';
    $("lD").innerHTML = head + blocks;
  }

  function printLedger() {
    ensureStmt(function () {
      var d = L.stmt, s = L.student, a = L.account;
      var br = (a.breakdown || []).map(function (b) { return '<tr><td>' + esc(b.label) + '</td><td class="r">Rs. ' + inr(b.assigned) + '</td><td class="r">Rs. ' + inr(b.paid) + '</td><td class="r">Rs. ' + inr(b.balance) + '</td></tr>'; }).join("");
      var rr = (d.receipts || []).map(function (p) { return '<tr><td>' + esc(p.receiptId) + '</td><td>' + esc(pd(p.date)) + '</td><td class="r">Rs. ' + inr(p.amount) + '</td><td>' + esc(p.mode) + '</td><td>' + (p.allocations || []).map(function (x) { return esc(x.label) + " Rs. " + inr(x.amount); }).join("<br>") + '</td></tr>'; }).join("");
      var s2 = d.school || {};
      var head = (window.ReceiptHeaderBlock ? window.ReceiptHeaderBlock(s2, "STUDENT FEE LEDGER") :
        '<div class="rc-hd"><img class="rc-logo" src="header-logo.png" crossorigin="anonymous" onerror="this.style.display=\'none\'"/><div class="rc-ad">' + esc(s2.address || "Karimnagar") + '</div></div><div class="rc-bar">STUDENT FEE LEDGER</div>');
      var html = head +
        '<table class="rc-t"><tr><td class="k">Student</td><td>' + esc(s.name) + '</td><td class="k">ID</td><td>' + esc(s.id) + '</td></tr><tr><td class="k">Class</td><td>' + esc(a.className || "") + '</td><td class="k">Year</td><td>' + esc(a.year) + '</td></tr></table>' +
        '<div class="rc-sub">BALANCE BREAKDOWN</div><table class="rc-h"><tr><th>Fee</th><th class="r">Assigned</th><th class="r">Collected</th><th class="r">Arrears</th></tr>' + br + '</table>' +
        '<div class="rc-sub">PAYMENT HISTORY</div><table class="rc-h"><tr><th>Receipt</th><th>Date</th><th class="r">Amount</th><th>Mode</th><th>Allocated</th></tr>' + rr + '</table>' +
        '<div class="rc-note">Computer-generated ledger · ' + esc(new Date().toLocaleDateString("en-IN")) + '</div>';
      ReceiptShare.shareLedger(html, "Ledger - " + s.name);
    });
  }

  /* ======================= COLLECT ======================= */
  function mountCollect() {
    PAY = { student: null, account: null, choice: "" };
    var years = (BOOT.years || []).map(function (y) { return '<option' + (y === YEAR ? " selected" : "") + '>' + esc(y) + '</option>'; }).join("");
    $("pCollect").innerHTML =
      '<div class="bar"><div class="srch"><i class="material-icons">search</i><input id="cS" placeholder="Search student to collect…"/><button class="clr" id="cC">&times;</button></div><div id="cR" class="res"></div>' +
      '<div class="or"><span>or pick</span></div><div class="pick">' +
      selc("event", "Academic Year", '<select id="cY" class="in">' + years + '</select>') +
      selc("groups", "Class", '<select id="cCl" class="in"><option value="">Loading…</option></select>') +
      selc("person", "Student", '<select id="cSt" class="in" disabled><option value="">Pick a class…</option></select>') +
      '</div></div>' +
      '<div id="cB"><div class="empty"><i class="material-icons">point_of_sale</i>Search or pick a student to collect a payment.</div></div>';
    var t = null; $("cS").addEventListener("input", function () { var v = this.value; clearTimeout(t); t = setTimeout(function () { search("cR", v, collectOpen); }, 250); });
    $("cC").onclick = function () { $("cS").value = ""; $("cR").innerHTML = ""; };
    function CY() { return $("cY").value; }
    function cClasses() { var s = $("cCl"); s.innerHTML = '<option>Loading…</option>'; P.api("feeGetClasses", [CY()], { overlay: false }).then(function (cs) { s.innerHTML = '<option value="">Select class…</option>' + (cs || []).map(function (c) { return '<option>' + esc(c) + '</option>'; }).join(""); }); }
    function cStudents() { var cls = $("cCl").value, s = $("cSt"); if (!cls) { s.disabled = true; s.innerHTML = '<option>Pick a class…</option>'; return; } s.disabled = true; s.innerHTML = '<option>Loading…</option>'; P.api("feeGetStudents", [CY(), cls], { overlay: false }).then(function (list) { s.disabled = false; s.innerHTML = '<option value="">Select student…</option>' + (list || []).map(function (x) { return '<option value="' + esc(x.id) + '">' + esc(x.name) + (x.left ? " (left)" : "") + '</option>'; }).join(""); }); }
    $("cY").onchange = cClasses; $("cCl").onchange = cStudents; $("cSt").onchange = function () { if (this.value) collectOpen(this.value); };
    cClasses();
  }
  function collectOpen(id) { sw("collect"); if ($("cS")) $("cS").value = ""; $("cB").innerHTML = mt("Loading account…"); P.api("feeGetStudentFinance", [id], { overlay: false }).then(function (f) { PAY.student = f.student; PAY.account = f.account; PAY.choice = ""; renderCollect(f.perYear, f.account.year); }).catch(function (e) { $("cB").innerHTML = eb(e); }); }
  function renderCollect(perYear, activeY) {
    var a = PAY.account, s = PAY.student, t = a.totals;
    var chips = (perYear || []).map(function (y) { return '<span class="yc' + (y.year === activeY ? " active" : "") + (y.balance > 0 ? " due" : "") + '" data-y="' + esc(y.year) + '">' + esc(y.year) + (y.balance > 0 ? '<em>' + money(y.balance) + '</em>' : '') + '</span>'; }).join("");
    var rows = a.breakdown.map(function (b) { return '<tr><td data-label="Fee">' + esc(b.label) + '</td><td class="r" data-label="Assigned">' + money(b.assigned) + '</td><td class="r" data-label="Collected">' + money(b.paid) + '</td><td class="r" data-label="Balance">' + money(b.balance) + '</td></tr>'; }).join("");
    $("cB").innerHTML = '<div class="acc"><div class="sbar"><div class="sn">' + esc(s.name) + '</div><div class="sm">' + esc(a.className || "") + ' · ID ' + esc(s.id) + '</div></div><div class="ycs" style="margin-top:10px">' + chips + '</div>' +
      '<div class="tots">' + tot(money(t.remaining), "Outstanding", t.remaining > 0 ? "red" : "green") + tot(money(t.openingBalance), "Old Due", t.openingBalance > 0 ? "amber" : "") + tot(money(t.charged), "Charged " + esc(a.year), "") + '</div>' +
      '<div class="tw"><table class="tbl"><thead><tr><th>Fee</th><th class="r">Assigned</th><th class="r">Collected</th><th class="r">Balance</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="pc"><h3><i class="material-icons">payments</i> Collect a Payment</h3>' + (a.canPay ? '<div class="note"><i class="material-icons">info</i>Enter only the amount — auto-allocates: prev Study Materials → current Study Materials → Old Due → Misc → Tuition → Transport.</div><div class="prow"><div class="fld"><label>Amount Received</label><input id="cA" class="in big" type="number" min="1" inputmode="numeric"/></div><div class="fld"><label>Mode</label><select id="cM" class="in">' + (BOOT.modes || []).map(function (m) { return '<option>' + m + '</option>'; }).join("") + '</select></div><div class="fld"><label>Date</label><input id="cD" class="in" value="' + today() + '"/></div></div><div class="fld"><label>Remarks (optional)</label><input id="cRm" class="in"/></div><button class="btn btn-maroon" id="cPv"><i class="material-icons">visibility</i> Preview Allocation</button><div id="cCh"></div><div id="cPr"></div>' : '<div class="note ok"><i class="material-icons">verified</i>All dues cleared for ' + esc(a.year) + ' and earlier.</div>') + '</div></div>';
    Array.prototype.forEach.call($("cB").querySelectorAll(".yc"), function (b) { b.onclick = function () { P.api("feeGetAccount", [b.getAttribute("data-y"), s.id], { overlay: false }).then(function (ac) { PAY.account = ac; PAY.choice = ""; renderCollect(perYear, ac.year); }); }; });
    if (a.canPay) { $("cPv").onclick = preview; $("cA").addEventListener("keydown", function (e) { if (e.key === "Enter") preview(); }); setTimeout(function () { $("cA").focus(); }, 50); }
  }
  function preview() { var amt = Number($("cA").value); if (!amt || amt <= 0) return toast("Enter a valid amount.", "err"); P.api("feePreviewPayment", [{ year: PAY.account.year, studentId: PAY.account.studentId, amount: amt, transportChoice: PAY.choice }], { text: "Calculating…" }).then(function (p) { if (p.needsChoice) return choice(p); showPrev(amt, p); }).catch(function (e) { toast(e.message || e, "err"); }); }
  function choice(p) { $("cCh").innerHTML = '<div class="note amber"><i class="material-icons">help</i>Reaches current-year fees and <b>Transport is also open</b>. Apply remaining ' + money(p.reachesCurrent) + ' to which first?</div><div class="seg"><button data-c="TUITION">Tuition first</button><button data-c="TRANSPORT">Transport first</button></div>'; Array.prototype.forEach.call($("cCh").querySelectorAll("[data-c]"), function (b) { b.onclick = function () { PAY.choice = b.getAttribute("data-c"); preview(); }; }); }
  function showPrev(amt, p) { $("cCh").innerHTML = ""; var rows = p.allocations.map(function (a) { return '<tr><td data-label="Applied to">' + esc(a.label) + ' <span class="yr">' + esc(a.year) + '</span>' + (a.isPrevYear ? ' <span class="tag">old</span>' : '') + '</td><td class="r" data-label="Amount">' + money(a.amount) + '</td><td class="r" data-label="Balance after">' + money(a.remainingAfter) + '</td></tr>'; }).join(""); $("cPr").innerHTML = '<div class="conf"><div class="ch">Payment <b>' + money(amt) + '</b> will be recorded as:</div><div class="tw"><table class="tbl"><thead><tr><th>Applied to</th><th class="r">Amount</th><th class="r">Balance after</th></tr></thead><tbody>' + rows + '</tbody></table></div><button class="btn btn-maroon" id="cCf" style="margin-top:12px"><i class="material-icons">check_circle</i> Confirm &amp; Record</button></div>'; $("cCf").onclick = record; }
  function record() { var amt = Number($("cA").value), b = $("cCf"); b.disabled = true; b.innerHTML = '<i class="material-icons">sync</i> Saving…'; P.api("feeRecordPayment", [{ year: PAY.account.year, studentId: PAY.account.studentId, amount: amt, mode: $("cM").value, date: $("cD").value.trim(), remarks: $("cRm").value, transportChoice: PAY.choice, receivedBy: ME }], { text: "Recording…" }).then(function (r) { if (r.needsChoice) { b.disabled = false; b.innerHTML = '<i class="material-icons">check_circle</i> Confirm &amp; Record'; return choice(r); } toast("Recorded · " + r.receiptId, "ok"); receiptModal(r); collectOpen(PAY.account.studentId); }).catch(function (e) { toast(e.message || e, "err"); b.disabled = false; b.innerHTML = '<i class="material-icons">check_circle</i> Confirm &amp; Record'; }); }
  function receiptModal(r) {
    openModal("Receipt · " + esc(r.receiptId), '<div class="note ok"><i class="material-icons">check_circle</i>Saved ' + money(r.currentPayment || r.amount) + '. Balance after: <b>' + money(r.balance) + '</b>.</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-maroon btn-sm" id="rP"><i class="material-icons">print</i> Print</button><button class="btn btn-outline btn-sm" id="rS"><i class="material-icons">ios_share</i> Share PDF</button></div>');
    setTimeout(function () { if ($("rP")) $("rP").onclick = function () { ReceiptShare.print(r); }; if ($("rS")) $("rS").onclick = function () { ReceiptShare.share(r); }; }, 30);
  }

  /* ======================= FEE SHEET (with live Total column) ======================= */
  function mountSheet() {
    var years = (BOOT.years || []).map(function (y) { return '<option' + (y === YEAR ? " selected" : "") + '>' + esc(y) + '</option>'; }).join("");
    $("pSheet").innerHTML = '<div class="tbar">' +
      selc("event", "Academic Year", '<select id="fY" class="in">' + years + '</select>') +
      selc("groups", "Class", '<select id="fCl" class="in"><option>Loading…</option></select>') +
      '<button class="btn btn-maroon" id="fL" style="align-self:flex-end"><i class="material-icons">table_view</i> Load</button></div>' +
      '<div id="fB"><div class="empty"><i class="material-icons">grid_on</i>Pick a year &amp; class, then Load.</div></div>';
    function fillClasses() { var y = $("fY").value; $("fCl").innerHTML = '<option>Loading…</option>'; P.api("feeGetClasses", [y], { overlay: false }).then(function (cs) { $("fCl").innerHTML = '<option value="">Select class…</option>' + (cs || []).map(function (c) { return '<option>' + esc(c) + '</option>'; }).join(""); }); }
    $("fY").onchange = fillClasses;
    $("fL").onclick = loadSheet;
    fillClasses();
  }
  function loadSheet() {
    var y = $("fY").value, cls = $("fCl").value; if (!cls) return toast("Pick a class.", "err");
    $("fB").innerHTML = mt("Loading…");
    P.api("feeGetFeeSheet", [y, cls], { text: "Loading…" }).then(function (d) { SHEET.data = d; renderSheet(); }).catch(function (e) { $("fB").innerHTML = eb(e); });
  }
  function rowTotal(i) { var d = SHEET.data, t = 0; d.feeTypes.forEach(function (ty) { var inp = $("fB").querySelector('.cell[data-i="' + i + '"][data-ft="' + ty.code + '"]'); t += inp ? (Number(inp.value) || 0) : (d.rows[i].fees[ty.code] || 0); }); if (d.isMigrationYear) { var od = $("fB").querySelector('.cell[data-i="' + i + '"][data-ft="__OLD__"]'); t += od ? (Number(od.value) || 0) : (d.rows[i].oldDue || 0); } else t += (d.rows[i].oldDue || 0); return t; }
  function updateTotals() { var d = SHEET.data, grand = 0, gOld = 0, gByFt = {}; d.rows.forEach(function (r, i) { var rt = rowTotal(i); var el = $("rt" + i); if (el) el.innerHTML = money(rt); grand += rt; d.feeTypes.forEach(function (ty) { var inp = $("fB").querySelector('.cell[data-i="' + i + '"][data-ft="' + ty.code + '"]'); gByFt[ty.code] = (gByFt[ty.code] || 0) + (inp ? Number(inp.value) || 0 : 0); }); var od = $("fB").querySelector('.cell[data-i="' + i + '"][data-ft="__OLD__"]'); gOld += od ? Number(od.value) || 0 : (d.rows[i].oldDue || 0); }); if ($("gTot")) $("gTot").innerHTML = money(grand); if ($("gOld")) $("gOld").innerHTML = money(gOld); d.feeTypes.forEach(function (ty) { if ($("g_" + ty.code)) $("g_" + ty.code).innerHTML = money(gByFt[ty.code] || 0); }); }
  function renderSheet() {
    var d = SHEET.data;
    if (!d.rows.length) { $("fB").innerHTML = '<div class="empty"><i class="material-icons">group_off</i>No students.</div>'; return; }
    var head = '<tr><th>Student</th><th>Old Due</th>' + d.feeTypes.map(function (t) { return '<th>' + esc(t.name) + '</th>'; }).join("") + '<th>Total</th></tr>';
    var body = d.rows.map(function (r, i) {
      var cells = d.feeTypes.map(function (t) { return '<td><input class="cell" data-i="' + i + '" data-ft="' + esc(t.code) + '" type="number" value="' + (r.fees[t.code] || 0) + '"/></td>'; }).join("");
      var oc = d.isMigrationYear ? '<td><input class="cell old" data-i="' + i + '" data-ft="__OLD__" type="number" value="' + (r.oldDue || 0) + '"/></td>' : '<td class="mut">' + money(r.oldDue) + '</td>';
      return '<tr><td class="stn">' + esc(r.name) + '<span class="sid">' + esc(r.id) + '</span></td>' + oc + cells + '<td class="rowtot" id="rt' + i + '">' + money(rowTotal(i)) + '</td></tr>';
    }).join("");
    var grandRow = '<tr class="grand"><td class="stn">All (' + d.rows.length + ')</td><td id="gOld" class="r">—</td>' + d.feeTypes.map(function (t) { return '<td id="g_' + esc(t.code) + '" class="r">—</td>'; }).join("") + '<td id="gTot" class="r">—</td></tr>';
    $("fB").innerHTML = '<div class="note"><i class="material-icons">info</i>' + (d.isMigrationYear ? '<b>Old Due editable</b> (opening year).' : '<b>Old Due derived</b> from prior years.') + ' Total updates live as you type. Cannot go below collected.</div><div class="shw"><table class="sht"><thead>' + head + '</thead><tbody>' + body + grandRow + '</tbody></table></div><button class="btn btn-maroon" id="fS" style="margin-top:12px"><i class="material-icons">save</i> Save Fee Sheet</button>';
    Array.prototype.forEach.call($("fB").querySelectorAll(".cell"), function (inp) { inp.addEventListener("input", updateTotals); });
    updateTotals();
    $("fS").onclick = saveSheet;
  }
  function saveSheet() { var d = SHEET.data; var rows = d.rows.map(function (r, i) { var fees = {}; d.feeTypes.forEach(function (t) { var inp = $("fB").querySelector('.cell[data-i="' + i + '"][data-ft="' + t.code + '"]'); fees[t.code] = inp ? Number(inp.value) || 0 : 0; }); var o = { id: r.id, fees: fees }; if (d.isMigrationYear) { var od = $("fB").querySelector('.cell[data-i="' + i + '"][data-ft="__OLD__"]'); o.oldDue = od ? Number(od.value) || 0 : 0; } return o; }); var b = $("fS"); b.disabled = true; b.innerHTML = '<i class="material-icons">sync</i> Saving…'; P.api("feeSaveFeeSheet", [d.year, d.className, rows, ME], { text: "Saving…" }).then(function (res) { toast("Saved " + (res.changed || 0) + " change(s)." + (res.errors && res.errors.length ? " " + res.errors.length + " blocked." : ""), res.errors && res.errors.length ? "err" : "ok"); b.disabled = false; b.innerHTML = '<i class="material-icons">save</i> Save Fee Sheet'; loadSheet(); }).catch(function (e) { toast(e.message || e, "err"); b.disabled = false; b.innerHTML = '<i class="material-icons">save</i> Save Fee Sheet'; }); }

  /* ======================= REPORTS ======================= */
  function mountReports() { $("pReports").innerHTML = '<div class="subt" id="rT">' + rt("daily", "today", "Daily") + rt("range", "date_range", "Range") + rt("type", "category", "By Type") + rt("class", "groups", "By Class") + rt("out", "warning", "Outstanding") + rt("register", "receipt", "Receipts") + rt("yearwise", "calendar_month", "Year-wise") + rt("long", "hourglass_bottom", "Long Pending") + rt("totals", "summarize", "Totals") + '</div><div id="rB"></div>'; Array.prototype.forEach.call($("rT").querySelectorAll("button"), function (b, i) { if (i === 0) b.classList.add("active"); b.onclick = function () { Array.prototype.forEach.call($("rT").querySelectorAll("button"), function (x) { x.classList.remove("active"); }); b.classList.add("active"); rep(b.getAttribute("data-t")); }; }); rep("daily"); }
  function rt(id, ic, l) { return '<button data-t="' + id + '"><i class="material-icons">' + ic + '</i>' + l + '</button>'; }
  function rep(k) {
    var B = $("rB");
    if (k === "daily") { B.innerHTML = ct(fl("Date (dd-mm-yyyy)", ip("rD", today())) + gb()) + '<div id="rO"></div>'; $("rG").onclick = function () { rn("feeDailyCollection", [$("rD").value, YEAR], function (r) { return sm("Collections on " + pretty(r.date) + " — " + money(r.total) + " (" + r.count + ")") + tbl(["Receipt", "Student", "Amount", "Mode"], r.rows.map(function (x) { return [x.receiptId, x.name, money(x.amount), x.mode]; })); }); }; }
    else if (k === "range") { B.innerHTML = ct(fl("From", ip("rF", today())) + fl("To", ip("rTo", today())) + gb()) + '<div id="rO"></div>'; $("rG").onclick = function () { rn("feeCollectionByRange", [$("rF").value, $("rTo").value, YEAR], function (r) { return sm(pretty(r.from) + " → " + pretty(r.to) + " — " + money(r.total)) + tbl(["Receipt", "Date", "Student", "Amount", "Mode"], r.rows.map(function (x) { return [x.receiptId, pd(x.date), x.name, money(x.amount), x.mode]; })); }); }; }
    else if (k === "type") rn("feeCollectionByType", [YEAR], function (r) { return sm("By fee type — " + money(r.total)) + tbl(["Fee Type", "Amount"], r.rows.map(function (x) { return [x.feeType, money(x.amount)]; })); }, B);
    else if (k === "class") rn("feeCollectionByClass", [YEAR], function (r) { return sm("By class — " + money(r.total)) + tbl(["Class", "Amount"], r.rows.map(function (x) { return [x.className, money(x.amount)]; })); }, B);
    else if (k === "out") { B.innerHTML = ct(fl("Class (blank=all)", ip("rC", "")) + gb()) + '<div id="rO"></div>'; $("rG").onclick = function () { rn("feeOutstanding", [YEAR, $("rC").value || "ALL"], function (r) { return sm(r.count + " students · " + money(r.total)) + tbl(["ID", "Student", "Class", "Phone", "Outstanding"], r.rows.map(function (x) { return [x.studentId, x.name, x.className, x.phone, money(x.outstanding)]; })); }); }; }
    else if (k === "register") { B.innerHTML = ct(fl("From (opt)", ip("rF", "")) + fl("To (opt)", ip("rTo", "")) + gb()) + '<div id="rO"></div>'; $("rG").onclick = function () { rn("feeReceiptRegister", [YEAR, $("rF").value, $("rTo").value], function (r) { return sm(r.count + " receipts · " + money(r.total)) + tbl(["Receipt", "Date", "Student", "Amount", "Mode", "Status"], r.rows.map(function (x) { return [x.receiptId, pd(x.date), x.name, money(x.amount), x.mode, x.status]; })); }); }; }
    else if (k === "yearwise") rn("feeYearWiseCollection", [], function (r) { return sm("Year-wise — " + money(r.total)) + tbl(["Year", "Amount"], r.rows.map(function (x) { return [x.year, money(x.amount)]; })); }, B);
    else if (k === "long") rn("feeLongPending", [YEAR], function (r) { return sm(r.count + " students · " + money(r.total)) + tbl(["ID", "Student", "Class", "Phone", "Old Due"], r.rows.map(function (x) { return [x.studentId, x.name, x.className, x.phone, money(x.oldDue)]; })); }, B);
    else rn("feeTotals", [YEAR], function (r) { return '<div class="tots">' + tot(money(r.assigned), "Total Charged", "") + tot(money(r.collected), "Collected", "green") + tot(money(r.outstanding), "Outstanding", "red") + '</div>'; }, B);
  }
  function rn(fn, args, render, target) { var out = (target && target.id === "rB") ? target : $("rO"); if (!out) out = $("rB"); out.innerHTML = mt("Loading…"); P.api(fn, args, { overlay: false }).then(function (r) { out.innerHTML = '<div class="repbar"><button class="btn btn-outline btn-sm" id="rPr"><i class="material-icons">print</i> Print</button></div>' + render(r); var pr = $("rPr"); if (pr) pr.onclick = function () { printNode(out); }; }).catch(function (e) { out.innerHTML = eb(e); }); }
  function ct(i) { return '<div class="tbar">' + i + '</div>'; }
  function gb() { return '<button class="btn btn-maroon" id="rG" style="align-self:flex-end"><i class="material-icons">search</i> Load</button>'; }
  function sm(t) { return '<div class="rsum">' + esc(t) + '</div>'; }
  function printNode(el) { var w = window.open("", "_blank"); if (!w) return toast("Allow pop-ups.", "err"); w.document.write('<html><head><title>Fee Report</title><style>body{font-family:Segoe UI,Arial;padding:14px;color:#111}h2{color:#8a1618;margin:0 0 6px}table{border-collapse:collapse;width:100%;margin-top:8px}th,td{border:1px solid #cbd0d6;padding:6px 9px;font-size:12px;text-align:left}th{background:#f3eaea;color:#8a1618}.r{text-align:right}.grand td{font-weight:800;background:#faf5f5}.rsum{font-weight:700;color:#8a1618;margin:6px 0}.repbar,.btn,.material-icons{display:none!important}</style></head><body><h2>SAPTHAGIRI HIGH SCHOOL E/M — Fee Report</h2><div>' + esc(new Date().toLocaleString("en-IN")) + '</div>' + el.innerHTML + '</body></html>'); w.document.close(); w.focus(); setTimeout(function () { w.print(); }, 300); }

  /* ======================= TOOLS ======================= */
  function mountTools() {
    $("pTools").innerHTML =
      '<div class="card"><h3><i class="material-icons">link</i> Student Management Link</h3><div class="note"><i class="material-icons">info</i>Classes, promotions &amp; new admissions come live from Student Management. Sync pulls any new students into fees.</div><button class="btn btn-outline" id="tSy"><i class="material-icons">sync</i> Sync Students Now</button><div id="tSyO"></div></div>' +
      '<div class="card"><h3><i class="material-icons">badge</i> Change Student ID</h3><div class="r2">' + fl("Current ID", ip("ciO", "")) + fl("New ID", ip("ciN", "")) + '</div><button class="btn btn-maroon" id="ciB"><i class="material-icons">sync_alt</i> Change ID</button></div>' +
      '<div class="card"><h3><i class="material-icons">category</i> Fee Types</h3><div class="r2">' + fl("Name", ip("tyN", "", "e.g. Hostel Fee")) + fl("Code", ip("tyC", "", "e.g. HOSTEL")) + '</div><div class="r2">' + fl("Kind", '<select id="tyK" class="in"><option value="other">Other</option><option value="tuition">Tuition-like</option><option value="transport">Transport-like</option><option value="studyMaterials">Study Materials-like</option><option value="misc">Misc-like</option></select>') + fl("Sort", ip("tyS", "25")) + '</div><button class="btn btn-maroon" id="tyA"><i class="material-icons">add</i> Add Fee Type</button></div>' +
      '<div class="card"><h3><i class="material-icons">tune</i> Settings</h3><div class="r2">' + fl("Current Year", ip("stY", BOOT.currentYear)) + fl("Opening Year", ip("stM", BOOT.migrationYear)) + '</div><button class="btn btn-maroon" id="stS"><i class="material-icons">save</i> Save</button><div class="r2" style="margin-top:14px">' + fl("New Module Password", ip("stP", "", "new password")) + '<div class="fld" style="align-self:flex-end"><button class="btn btn-outline" id="stPB"><i class="material-icons">password</i> Update Password</button></div></div></div>';
    $("tSy").onclick = function () { $("tSyO").innerHTML = '<div class="rsum">Syncing…</div>'; P.api("feeSyncStudents", [], { text: "Syncing…" }).then(function () { $("tSyO").innerHTML = '<div class="rsum">Synced. Rosters now reflect Student Management.</div>'; }).catch(function (e) { $("tSyO").innerHTML = eb(e); }); };
    $("ciB").onclick = function () { var o = $("ciO").value.trim(), n = $("ciN").value.trim(); if (!o || !n) return toast("Enter both IDs.", "err"); if (!confirm('Change "' + o + '" to "' + n + '"?')) return; P.api("feeChangeStudentId", [o, n], { text: "Updating…" }).then(function () { toast("ID changed.", "ok"); $("ciO").value = ""; $("ciN").value = ""; }).catch(function (e) { toast(e.message || e, "err"); }); };
    $("tyA").onclick = function () { var name = $("tyN").value.trim(), code = $("tyC").value.trim(); if (!name || !code) return toast("Name &amp; code required.", "err"); P.api("feeAddFeeType", [{ name: name, code: code, kind: $("tyK").value, sort: Number($("tyS").value) || 25 }], { text: "Adding…" }).then(function () { toast("Added.", "ok"); P.api("feeBootstrap", [], { overlay: false }).then(function (b) { BOOT = b; }); }).catch(function (e) { toast(e.message || e, "err"); }); };
    $("stS").onclick = function () { P.api("feeSetCurrentYear", [$("stY").value.trim()], { overlay: false }).then(function () { return P.api("feeSetMigrationYear", [$("stM").value.trim()], { overlay: false }); }).then(function () { toast("Saved. Reloading…", "ok"); setTimeout(boot, 600); }).catch(function (e) { toast(e.message || e, "err"); }); };
    $("stPB").onclick = function () { var pw = $("stP").value.trim(); if (!pw) return toast("Enter password.", "err"); P.api("feeSetPassword", [pw], { text: "Updating…" }).then(function () { toast("Password updated.", "ok"); $("stP").value = ""; }).catch(function (e) { toast(e.message || e, "err"); }); };
  }

  /* ---- shared ---- */
  function selc(ic, label, inner) { return '<div class="ssel"><label class="lb"><i class="material-icons">' + ic + '</i>' + label + '</label>' + inner + '</div>'; }
  function fl(label, inner) { return '<div class="fld"><label>' + label + '</label>' + inner + '</div>'; }
  function ip(id, val, ph) { return '<input id="' + id + '" class="in" value="' + esc(val || "") + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + '/>'; }
  function tot(v, l, c) { return '<div class="to ' + (c || "") + '"><span class="tv">' + v + '</span><span class="tl">' + esc(l) + '</span></div>'; }
  function tbl(h, rows) {
    var mc = {}; h.forEach(function (x, i) { if (/amount|outstanding|old due/i.test(x)) mc[i] = 0; });
    var body = rows.length ? rows.map(function (r) { return '<tr>' + r.map(function (c, i) { if (mc.hasOwnProperty(i)) { mc[i] += Number(String(c).replace(/[^0-9.\-]/g, "")) || 0; } return '<td' + (/^₹/.test(String(c)) ? ' class="r"' : '') + ' data-label="' + esc(h[i]) + '">' + (c == null ? "" : esc(String(c))) + '</td>'; }).join("") + '</tr>'; }).join("") : '<tr><td colspan="' + h.length + '" class="mut">No data.</td></tr>';
    var foot = "";
    if (rows.length && Object.keys(mc).length) { foot = '<tr class="grand">' + h.map(function (x, i) { if (i === 0) return '<td>Total</td>'; if (mc.hasOwnProperty(i)) return '<td class="r">₹' + (mc[i]).toLocaleString("en-IN") + '</td>'; return '<td></td>'; }).join("") + '</tr>'; }
    return '<div class="tw"><table class="tbl"><thead><tr>' + h.map(function (x) { return '<th' + (/amount|old due|outstanding/i.test(x) ? ' class="r"' : '') + '>' + esc(x) + '</th>'; }).join("") + '</tr></thead><tbody>' + body + foot + '</tbody></table></div>';
  }
  function money(n) { return "\u20B9" + inr(n); }
  function inr(n) { return (Number(n) || 0).toLocaleString("en-IN"); }
  function today() { var d = new Date(); return String(d.getDate()).padStart(2, "0") + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + d.getFullYear(); }
  function pretty(v) { var m = String(v || "").match(/^(\d{2})-(\d{2})-(\d{4})$/); if (!m) return pd(v); var M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]; return m[1] + " " + M[+m[2] - 1] + " " + m[3]; }
  function pd(v) { var m = String(v || "").match(/^(\d{4})-(\d{2})-(\d{2})/); var M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]; if (m) return m[3] + "-" + M[+m[2] - 1] + "-" + m[1]; var mm = String(v || "").match(/^(\d{2})-(\d{2})-(\d{4})$/); if (mm) return mm[1] + "-" + M[+mm[2] - 1] + "-" + mm[3]; return String(v || ""); }
  function ayOf(dateISO) { var m = String(dateISO || "").match(/^(\d{4})-(\d{2})/); if (!m) return ""; var y = +m[1], mo = +m[2]; var st = mo >= 6 ? y : y - 1; return st + "-" + String((st + 1) % 100).padStart(2, "0"); }
  function viewOptions() {
    var ft = (BOOT.feeTypes || []).filter(function (t) { return t.code !== "OLD_DUE"; });
    return '<option value="ALL">Complete (year-wise)</option><option value="__OUT__">Outstanding</option>' + ft.map(function (t) { return '<option value="' + esc(t.name) + '">' + esc(t.name) + ' ledger</option>'; }).join("");
  }
  function yearOptions() {
    var ys = (L.perYear || []).map(function (y) { return y.year; }).sort(function (a, b) { return a < b ? 1 : -1; });
    return '<option value="ALL">All years</option>' + ys.map(function (y) { return '<option value="' + esc(y) + '">' + esc(y) + '</option>'; }).join("");
  }
  function mt(m) { return '<div class="empty"><i class="material-icons">sync</i>' + esc(m) + '</div>'; }
  function ld(m) { return '<div class="rld"><i class="material-icons">sync</i> ' + esc(m) + '</div>'; }
  function eb(e) { return '<div class="empty"><i class="material-icons">error_outline</i>' + esc(e && e.message ? e.message : e) + '</div>'; }
  function modalHost() { return '<div class="mdl" id="mdl"><div class="mc"><div class="mh"><span id="mTt"></span><button id="mx">&times;</button></div><div class="mb" id="mb"></div><div class="mf"><button class="btn btn-outline" id="mc2">Close</button></div></div></div>'; }
  function openModal(t, b) { var h = $("mdl"); $("mTt").innerHTML = t; $("mb").innerHTML = b; h.classList.add("show"); $("mx").onclick = $("mc2").onclick = function () { h.classList.remove("show"); }; h.onclick = function (e) { if (e.target === h) h.classList.remove("show"); }; }
  function toast(msg, kind) { var t = $("ft"); if (!t) { t = document.createElement("div"); t.id = "ft"; document.body.appendChild(t); } t.className = kind || ""; t.innerHTML = '<i class="material-icons">' + (kind === "err" ? "error" : kind === "ok" ? "check_circle" : "info") + '</i>' + esc(msg); void t.offsetWidth; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove("show"); }, 2600); }

  function css() {
    if ($("fin-css")) return; var s = document.createElement("style"); s.id = "fin-css";
    s.textContent =
      ".fin-head{margin-bottom:10px}.fin-title{font-size:23px;color:var(--maroon);margin:4px 0}.fin-sub{color:var(--text-muted);font-size:13px;max-width:720px}.chip{font-size:11px;font-weight:700;color:var(--maroon);background:var(--primary-light);padding:3px 10px;border-radius:999px}" +
      ".fin-tabs{display:inline-flex;flex-wrap:wrap;gap:6px;background:#f1f5f9;border:1px solid var(--border);border-radius:999px;padding:4px;margin:0 0 18px}.fin-tabs button{border:none;background:transparent;color:var(--text-muted);font-weight:700;font-size:13px;padding:9px 15px;border-radius:999px;cursor:pointer;display:inline-flex;align-items:center;gap:6px}.fin-tabs button i{font-size:17px}.fin-tabs button.active{background:var(--maroon);color:#fff}" +
      ".subt{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:14px}.subt button{border:1px solid var(--border);background:#fff;color:var(--text-muted);font-weight:700;font-size:12px;padding:7px 11px;border-radius:9px;cursor:pointer;display:inline-flex;align-items:center;gap:5px}.subt button i{font-size:15px}.subt button.active{background:var(--maroon);color:#fff;border-color:var(--maroon)}" +
      ".bar{background:#fff;border:1px solid var(--border);border-radius:16px;padding:14px;box-shadow:var(--shadow-sm);margin-bottom:14px}.srch{display:flex;align-items:center;gap:8px;background:#f8fafc;border:1px solid var(--border);border-radius:12px;padding:9px 12px}.srch i{color:var(--maroon)}.srch input{flex:1;border:none;background:transparent;font:inherit;font-size:15px;outline:none}.clr{border:none;background:#e2e8f0;color:#475569;border-radius:50%;width:24px;height:24px;cursor:pointer;font-size:16px;line-height:1}" +
      ".res{margin-top:6px}.row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 12px;border:1px solid var(--border);border-radius:10px;margin-top:6px;cursor:pointer;background:#fff}.row:hover{background:var(--primary-light);border-color:var(--maroon)}.rm b{font-size:14px}.rm span{display:block;font-size:11px;color:var(--text-muted)}.due{font-size:12px;font-weight:700;color:#dc2626}.ok{font-size:12px;font-weight:700;color:#059669}.rld,.rem{padding:10px;color:var(--text-muted);font-size:13px;font-weight:600}" +
      ".or{text-align:center;margin:12px 0 8px;position:relative}.or span{background:#fff;padding:0 10px;color:var(--text-muted);font-size:11.5px;font-weight:700;position:relative;z-index:1}.or:before{content:'';position:absolute;left:0;right:0;top:50%;height:1px;background:var(--border)}" +
      ".pick,.tbar{display:flex;flex-wrap:wrap;gap:12px}.ssel{flex:1 1 200px;display:flex;flex-direction:column;gap:4px}.tbar{margin-bottom:14px}.lb{font-size:12px;font-weight:700;color:var(--text-muted);display:flex;align-items:center;gap:5px}.lb i{font-size:15px}" +
      ".in{width:100%;padding:9px 11px;border:1px solid var(--border);border-radius:10px;font:inherit;background:#fff}.big{font-size:20px;font-weight:800;color:var(--maroon)}.fld{display:flex;flex-direction:column;gap:4px;margin-bottom:10px}.r2{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media(max-width:520px){.r2{grid-template-columns:1fr}}" +
      ".empty{text-align:center;padding:38px 20px;color:var(--text-muted);font-weight:600;background:#fff;border:1px dashed var(--border);border-radius:14px}.empty i{font-size:38px;color:var(--maroon);display:block;margin-bottom:8px}" +
      ".sbar{background:var(--primary-light);border:1px solid var(--border);border-radius:14px;padding:14px 18px}.sn{font-weight:800;font-size:17px;color:var(--maroon)}.sm{font-size:13px;color:var(--text-muted);margin-top:2px}" +
      ".actbar{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;margin:14px 0}.actbar .ssel{flex:0 0 200px}.acts{display:flex;gap:8px;margin-left:auto}" +
      ".acc{background:#fff;border:1px solid var(--border);border-radius:16px;padding:16px 18px;box-shadow:var(--shadow-sm)}" +
      ".ycs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}.yc{border:1px solid var(--border);background:#f8fafc;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;color:var(--text-muted);display:inline-flex;gap:6px}.yc.active{background:var(--maroon);color:#fff;border-color:var(--maroon)}.yc.due{border-color:#f59e0b}.yc em{font-style:normal;font-size:10px;background:rgba(0,0,0,.08);padding:1px 6px;border-radius:6px}.yc.active em{background:rgba(255,255,255,.2)}" +
      ".tots{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px}.to{flex:1 1 130px;background:#f8fafc;border:1px solid var(--border);border-radius:12px;padding:12px}.tv{display:block;font-size:19px;font-weight:800}.tl{font-size:11px;color:var(--text-muted);font-weight:700}.to.green .tv{color:#059669}.to.red .tv{color:#dc2626}.to.amber .tv{color:#d97706}" +
      ".tw{overflow:auto;border:1px solid var(--border);border-radius:12px;margin-bottom:6px}.tbl{width:100%;border-collapse:collapse}.tbl th,.tbl td{padding:9px 11px;font-size:13px;text-align:left;border-bottom:1px solid #f1f2f6}.tbl th{background:#faf5f5;color:var(--maroon);font-size:11.5px;text-transform:uppercase;letter-spacing:.3px}.tbl td.r,.tbl th.r{text-align:right}.void{opacity:.55}.mut{color:#94a3b8}.tbl tbody tr:nth-child(even) td{background:#fcfbfb}.grand td{font-weight:800;background:#faf5f5}.tbl tr.d td:last-child{color:#b91c1c;font-weight:700}.tbl tr.c td:last-child{color:#059669}" +
      ".pill{display:inline-block;background:#eef2ff;color:#4338ca;border-radius:999px;padding:2px 9px;font-size:11px;font-weight:600}" +
      ".ssum{display:flex;gap:8px;background:#fff;border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:14px}.si{flex:1;text-align:center;display:flex;flex-direction:column;gap:3px}.si+.si{border-left:1px solid var(--border)}.sl{font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.4px;color:var(--text-muted)}.sv{font-size:16px;font-weight:800}.sv.c{color:#047857}.sv.dd{color:#b91c1c}" +
      ".stmt{display:flex;flex-direction:column;gap:10px}.sr{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid var(--border);border-radius:14px;padding:12px 14px;box-shadow:var(--shadow-sm)}.sr.op{border-left:4px solid var(--maroon)}.sr.py{border-left:4px solid #10b981}.dot{flex:0 0 auto;width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:var(--primary-light);color:var(--maroon)}.dot.py{background:#d1fae5;color:#047857}.dot i{font-size:19px}.mn{flex:1;min-width:0}.tt{font-weight:800;font-size:14px}.sub{font-size:11.5px;color:var(--text-muted);margin-top:1px;font-family:monospace}.am{flex:0 0 auto;text-align:right}.a{font-weight:800;font-size:15px;color:var(--maroon)}.a.pd{color:#047857}.bl{font-size:11px;color:var(--text-muted);font-weight:600;margin-top:1px}.bl.c{color:#047857}.se{display:flex;align-items:center;justify-content:center;gap:8px;color:var(--text-muted);font-size:13px;font-weight:600;padding:16px;background:#f8fafc;border:1px dashed var(--border);border-radius:12px}.se i{font-size:18px;color:var(--maroon)}" +
      ".catyear{margin-bottom:14px}.catyh{font-size:12px;font-weight:800;color:var(--maroon);margin:10px 0 6px;text-transform:uppercase;letter-spacing:.4px}.duep{color:#b91c1c}.okp{color:#059669}" +
      ".pc{margin-top:16px;border-top:2px dashed var(--border);padding-top:14px}.pc h3{font-size:15px;color:var(--maroon);margin:0 0 10px;display:flex;align-items:center;gap:8px}.pc h3 i{font-size:19px}.prow{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:12px}@media(max-width:560px){.prow{grid-template-columns:1fr}}" +
      ".note{display:flex;gap:8px;align-items:flex-start;background:var(--primary-light);border:1px solid var(--border);border-radius:10px;padding:10px 12px;font-size:12.5px;margin-bottom:12px;line-height:1.5}.note i{color:var(--maroon);font-size:18px;flex:0 0 auto}.note.ok{background:#ecfdf5;border-color:#a7f3d0}.note.ok i{color:#059669}.note.amber{background:#fffbeb;border-color:#fde68a}.note.amber i{color:#d97706}" +
      ".seg{display:inline-flex;background:#f1f5f9;border:1px solid var(--border);border-radius:10px;padding:4px;margin-bottom:6px}.seg button{border:none;background:transparent;padding:8px 16px;border-radius:8px;font-weight:700;cursor:pointer;color:var(--text-muted)}.conf{margin-top:14px;border:2px solid var(--maroon);border-radius:12px;padding:14px}.ch{font-size:14px;margin-bottom:10px}.sh{font-size:14px;font-weight:800;color:var(--maroon);margin:16px 0 8px;display:flex;align-items:center;gap:6px}.sh i{font-size:18px}" +
      ".shw{overflow:auto}.sht{width:100%;border-collapse:collapse}.sht th,.sht td{border:1px solid var(--border);padding:6px;font-size:12.5px}.sht th{background:#faf5f5;color:var(--maroon);position:sticky;top:0}.cell{width:90px;padding:5px;border:1px solid var(--border);border-radius:6px}.old{background:#fffbeb;font-weight:700}.stn{white-space:nowrap}.sid{display:block;font-size:10px;color:#94a3b8;font-weight:600}.rowtot{font-weight:800;color:var(--maroon)}.sht .grand td{position:sticky;bottom:0;background:#faf5f5}" +
      ".rsum{font-weight:700;margin:10px 0;color:var(--maroon)}.repbar{display:flex;justify-content:flex-end;margin-bottom:8px}.card{background:#fff;border:1px solid var(--border);border-radius:16px;padding:16px 18px;box-shadow:var(--shadow-sm);max-width:840px;margin-bottom:16px}.card h3{font-size:15px;color:var(--maroon);margin:0 0 12px;display:flex;align-items:center;gap:8px}.card h3 i{font-size:19px}" +
      ".tag{font-size:9.5px;font-weight:700;color:#b45309;background:#fef3c7;padding:1px 6px;border-radius:6px}.yr{font-size:10px;font-weight:700;color:var(--text-muted);background:#f1f5f9;padding:1px 6px;border-radius:6px}" +
      ".btn{border:none;border-radius:10px;padding:10px 16px;font-weight:700;font-size:13.5px;cursor:pointer;display:inline-flex;align-items:center;gap:6px}.btn-maroon{background:var(--maroon);color:#fff}.btn-outline{background:#fff;border:1px solid var(--border);color:var(--text-main)}.btn-sm{padding:7px 12px;font-size:12.5px}.btn i{font-size:18px}.btn:disabled{opacity:.6;cursor:default}.mini{border:1px solid var(--border);background:#fff;border-radius:8px;padding:5px 8px;font-size:11.5px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center}" +
      ".fin-gate{max-width:360px;margin:40px auto;text-align:center;background:#fff;border:1px solid var(--border);border-radius:16px;padding:28px}.fin-gate i{font-size:40px;color:var(--maroon)}.fin-gate h3{color:var(--maroon);margin:8px 0}.fin-gate p{color:var(--text-muted);font-size:13px}.fin-gate input{width:100%;margin:12px 0;padding:10px;border:1px solid var(--border);border-radius:10px}.fin-err{color:#dc2626;font-weight:600;font-size:13px;margin-top:8px}" +
      ".mdl{position:fixed;inset:0;background:rgba(15,23,42,.45);display:none;align-items:center;justify-content:center;z-index:9999;padding:16px}.mdl.show{display:flex}.mc{background:#fff;border-radius:16px;max-width:600px;width:100%;max-height:90vh;display:flex;flex-direction:column}.mh{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid var(--border);font-weight:700}.mh button{border:none;background:none;font-size:24px;cursor:pointer;line-height:1}.mb{padding:18px;overflow:auto}.mf{display:flex;justify-content:flex-end;gap:8px;padding:14px 18px;border-top:1px solid var(--border)}" +
      "#ft{position:fixed;left:50%;bottom:22px;transform:translateX(-50%) translateY(20px);z-index:99999;background:#14171f;color:#fff;padding:12px 18px;border-radius:12px;font-size:14px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.25);display:flex;align-items:center;gap:8px;opacity:0;pointer-events:none;transition:all .25s;max-width:88vw}#ft.show{opacity:1;transform:translateX(-50%) translateY(0)}#ft.ok{background:#065f46}#ft.err{background:#991b1b}#ft i{font-size:18px}" +
      "@media(max-width:640px){.acts{margin-left:0;width:100%}.tbl thead{display:none}.tbl,.tbl tbody,.tbl tr,.tbl td{display:block;width:100%}.tbl tr{border:1px solid var(--border);border-radius:12px;margin:10px;padding:6px 12px}.tbl td{display:flex;justify-content:space-between;gap:14px;padding:8px 0;border-top:1px solid #f1f2f6;text-align:right}.tbl td::before{content:attr(data-label);font-weight:700;color:var(--text-muted);text-align:left}.tbl tr td:first-child{border-top:none}}";
    document.head.appendChild(s);
  }
})();

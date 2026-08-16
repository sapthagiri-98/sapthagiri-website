  /* =========================================================================
    fee-management.js — Complete UI Component (Fixed Single-Year View)
    ========================================================================= */
  (function () {
    "use strict";
    var P = window.Portal, session = P.bootPage("feemgmt");
    if (!session) return;
    var esc = P.esc, $ = function (id) { return document.getElementById(id); };
    var ME = session.name || "Admin", GATE = "fin_gate_v3", SCHOOL_TOTALS_GATE = "school_totals_gate_v1";
    css();
    var BOOT = null, YEAR = "";
    var L = { student: null, account: null, fin: null, stmt: null, view: "ALL", yview: "", perYear: [] };
    var PAY = { student: null, account: null, choice: "" };
    var SHEET = { data: null };
    var REPORTS = { year: "", totals: null, classData: null, classListRequest: 0, classRequest: 0 };
    gate();

    function gate() {
      if (rg()) return boot();
      $("view").innerHTML = '<div class="fin-gate"><i class="material-icons">lock</i><h3>Fee Management</h3><p>Enter the module password.</p><input id="gp" type="password" autocomplete="off"/><button class="btn btn-maroon" id="gb" style="width:100%;justify-content:center"><i class="material-icons">login</i> Unlock</button><div class="fin-err" id="ge" style="display:none"></div></div>';
      $("gb").onclick = sg; $("gp").addEventListener("keydown", function (e) { if (e.key === "Enter") sg(); }); setTimeout(function () { $("gp").focus(); }, 80);
    }
    function sg() { var pw = $("gp").value; if (!pw) return ge("Enter the password."); P.api("feeVerifyPassword", [pw], { text: "Verifying…" }).then(function (r) { if (r && r.success) { wg(r.expiresInMin || 45); boot(); } else ge("Incorrect password."); }).catch(function (e) { ge(e.message || e); }); }
    function ge(m) { var e = $("ge"); e.textContent = m; e.style.display = "block"; }
    function rg() { try { var g = JSON.parse(sessionStorage.getItem(GATE)); if (!g || Date.now() > g.exp) return null; return g; } catch (e) { return null; } }
    function wg(min) { sessionStorage.setItem(GATE, JSON.stringify({ exp: Date.now() + min * 60000 })); }

    function boot() { $("view").innerHTML = mt("Loading finance…"); P.api("feeBootstrap", [], { overlay: false }).then(function (b) { BOOT = b; YEAR = b.currentYear; L.yview = YEAR; shell(); }).catch(function (e) { $("view").innerHTML = eb(e); }); }
    function shell() {
      $("view").innerHTML =
        '<div class="fin-head"><div class="fin-brand"><div class="fin-brand-mark"><i class="material-icons">account_balance</i></div><div><span class="chip">Finance</span><h1 class="fin-title">Fee Management</h1><p class="fin-sub">Student ledger · collections · fee sheet · parent follow-up.</p></div></div></div>' +
        '<div class="fin-tabs" id="tabs">' + tb("ledger", "receipt_long", "Ledger") + tb("collect", "point_of_sale", "Collect") + tb("sheet", "grid_on", "Fee Sheet") + tb("reports", "assessment", "Reports") + tb("collections", "payments", "Collections") + tb("messages", "chat", "Messages") + tb("tools", "settings", "Tools") + '</div>' +
        '<div id="pLedger"></div><div id="pCollect" style="display:none"></div><div id="pSheet" style="display:none"></div><div id="pReports" style="display:none"></div><div id="pCollections" style="display:none"></div><div id="pMessages" style="display:none"></div><div id="pTools" style="display:none"></div>' + modalHost();
      Array.prototype.forEach.call($("tabs").querySelectorAll("button"), function (b) { b.onclick = function () { sw(b.getAttribute("data-t")); }; });
      mountLedger();
    }
    function tb(id, ic, l) { return '<button data-t="' + id + '"' + (id === "ledger" ? ' class="active"' : "") + '><i class="material-icons">' + ic + '</i>' + l + '</button>'; }
    function sw(t) {
      ["ledger", "collect", "sheet", "reports", "collections", "messages", "tools"].forEach(function (x) { $("p" + cap(x)).style.display = (x === t ? "block" : "none"); });
      Array.prototype.forEach.call($("tabs").querySelectorAll("button"), function (b) { b.classList.toggle("active", b.getAttribute("data-t") === t); });
      if (t === "collect" && !$("pCollect").innerHTML) mountCollect();
      if (t === "sheet" && !$("pSheet").innerHTML) mountSheet();
      if (t === "reports" && !$("pReports").innerHTML) mountReports();
      if (t === "collections" && !$("pCollections").innerHTML) mountCollections();
      if (t === "messages" && !$("pMessages").innerHTML) mountMessages();
      if (t === "tools" && !$("pTools").innerHTML) mountTools();
    }
    function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

    /* ======================= LEDGER ======================= */
    function mountLedger() {
      var years = (BOOT.years || []).map(function (y) { return '<option' + (y === YEAR ? " selected" : "") + '>' + esc(y) + '</option>'; }).join("");
      $("pLedger").innerHTML =
        '<div class="bar"><div class="srch"><i class="material-icons">search</i><input id="lS" placeholder="Search student by Name, ID, or Phone…"/><button class="clr" id="lC">&times;</button></div><div id="lR" class="res"></div>' +
        '<div class="or"><span>or pick</span></div><div class="pick">' + selc("event", "Academic Year", '<select id="lY" class="in">' + years + '</select>') + selc("groups", "Class", '<select id="lCl" class="in"><option value="">Loading…</option></select>') + selc("person", "Student", '<select id="lSt" class="in" disabled><option value="">Pick a class…</option></select>') + '</div></div>' +
        '<div id="lB"><div class="empty"><i class="material-icons">account_balance</i>Search or pick a student to view their ledger.</div></div>';
      var t = null;
      $("lS").addEventListener("input", function () { var v = this.value; clearTimeout(t); t = setTimeout(function () { search("lR", v, openLedger); }, 250); });
      $("lC").onclick = function () { $("lS").value = ""; $("lR").innerHTML = ""; };
      $("lY").onchange = function () { YEAR = this.value; L.yview = YEAR; classes("lCl"); };
      $("lCl").onchange = function () { students("lCl", "lSt"); };
      $("lSt").onchange = function () { if (this.value) openLedger(this.value); };
      classes("lCl");
    }

    function classes(id) { var s = $(id); s.innerHTML = '<option>Loading…</option>'; P.api("feeGetClasses", [YEAR], { overlay: false }).then(function (cs) { s.innerHTML = '<option value="">Select class…</option>' + (cs || []).map(function (c) { return '<option>' + esc(c) + '</option>'; }).join(""); }).catch(function () { s.innerHTML = '<option>Failed</option>'; }); }
    function students(clsId, stId) { var cls = $(clsId).value, s = $(stId); if (!cls) { s.disabled = true; s.innerHTML = '<option>Pick a class…</option>'; return; } s.disabled = true; s.innerHTML = '<option>Loading…</option>'; P.api("feeGetStudents", [YEAR, cls], { overlay: false }).then(function (list) { var rows = (list || []).slice().sort(feeStudentSort); s.disabled = false; s.innerHTML = '<option value="">Select student…</option>' + rows.map(function (x) { return '<option value="' + esc(x.id) + '">' + (!studentIsInactive(x) && studentRoll(x) !== null ? esc(String(studentRoll(x))) + ' · ' : '') + esc(x.name) + (studentIsInactive(x) ? " · " + esc(studentStatus(x)) : "") + '</option>'; }).join(""); }).catch(function () { s.innerHTML = '<option>Failed</option>'; }); }
    function search(boxId, q, onPick, seq) {
      var box = $(boxId); q = (q || "").trim();
      if (!q) { box.innerHTML = ""; return; }
      if (q.length < 2) { box.innerHTML = '<div class="rem">Type at least 2 characters.</div>'; return; }
      box.innerHTML = ld("Searching…");
      P.api("feeSearchStudents", [q], { overlay: false }).then(function (res) {
        if (seq !== undefined && boxId === "cR") {
          // stale search response: ignore it
          var input = $("cS"); if (input && input.value.trim() !== q) return;
        }
        var rows = (res.rows || []).slice().sort(function (a, b) {
          return gradeWeightLocal(a.className) - gradeWeightLocal(b.className) || feeStudentSort(a, b);
        }).slice(0, 20);
        box.innerHTML = rows.length ? rows.map(function (s) { return '<div class="row" data-id="' + esc(s.id) + '"><div class="rm"><b>' + esc(s.name) + '</b><span>' + esc(s.id) + (s.className ? ' · ' + esc(s.className) : '') + (s.phone ? ' · ' + esc(s.phone) : '') + ' · ' + esc(studentStatus(s)) + '</span></div><div>' + (s.outstanding > 0 ? '<span class="due">Due ' + money(s.outstanding) + '</span>' : '<span class="ok">Clear</span>') + '</div></div>'; }).join("") : '<div class="rem">No students found.</div>';
        Array.prototype.forEach.call(box.querySelectorAll(".row"), function (el) { el.onclick = function () { box.innerHTML = ""; onPick(el.getAttribute("data-id"), true); }; });
      }).catch(function (e) { box.innerHTML = eb(e); });
    }

    function openLedger(id) {
      $("lS").value = ""; $("lB").innerHTML = mt("Loading student ledger…");
      P.api("feeGetStudentFinance", [id], { overlay: false }).then(function (f) {
        L.fin = f; L.student = f.student; L.account = f.account; L.stmt = null; L.view = "ALL"; L.yview = YEAR;
        renderLedger();
      }).catch(function (e) { $("lB").innerHTML = eb(e); });
    }

    function renderLedger() {
      var s = L.student, a = L.account;
      L.perYear = (L.fin && L.fin.perYear) || [];
      if (!L.yview) L.yview = YEAR;

      $("lB").innerHTML =
        '<div class="sbar"><div class="sn">' + esc(s.name) + '</div><div class="sm">' + esc(a.className || "") + ' · ID: ' + esc(s.id) + (s.phone ? ' · 📞 ' + esc(s.phone) : '') + '</div></div>' +
        '<div class="tots" id="lTot" style="margin-top:12px"></div>' +
        '<div class="actbar">' +
        selc("event", "Academic Year", '<select id="lYr" class="in">' + yearOptions() + '</select>') +
        '<div class="acts"><button class="btn btn-outline btn-sm" id="pFullLg"><i class="material-icons">history_edu</i> Print Full Audit Ledger</button><button class="btn btn-maroon btn-sm" id="cP"><i class="material-icons">point_of_sale</i> Collect</button></div>' +
        '</div><div id="lD"></div>';

      $("lYr").value = L.yview;
      $("lYr").onchange = function () { L.yview = this.value; refresh(); };
      $("pFullLg").onclick = triggerFullAuditPrint;
      $("cP").onclick = function () { sw("collect"); setTimeout(function () { collectOpen(s.id); }, 40); };
      refresh();
    }

    function ensureStmt(cb) {
      if (L.stmt) return cb();
      P.api("feeGetStatement", [L.student.id, null], { overlay: false }).then(function (d) { L.stmt = d; cb(); });
    }

    function refresh() {
      ensureStmt(function () {
        fillTotals();
        renderSingleYearLedgerView();
      });
    }

    function fillTotals() {
      var per = (L.stmt.perYear || []).filter(function (x) { return x.year === L.yview; });
      var y = per[0] || { openingBal: 0, charged: 0, collected: 0, balance: 0 };
      var totalAssigned = Number(y.charged) || 0;
      var collected = Number(y.collected) || 0;
      var arrears = Number(y.balance) || 0;

      var el = $("lTot");
      if (el) {
        el.innerHTML =
          tot(money(totalAssigned), "Assigned " + esc(L.yview), "") +
          tot(money(collected), "Collected", "green") +
          tot(money(arrears), "Arrears", arrears > 0 ? "red" : "green");
      }
    }

    /* Single-Year Focused Ledger View */
    function renderSingleYearLedgerView() {
      var yf = L.yview;
      var yearData = (L.stmt.perYear || []).find(function (y) { return y.year === yf; }) || { charges: [], className: "" };
      var migYear = (BOOT && BOOT.migrationYear) || "2025-26";
      var isDigitisationYear = (yf === migYear);

      var headOrder = ["study_materials", "old_due", "misc", "tuition", "transport"];
      var sortedCharges = (yearData.charges || []).slice().sort(function (a, b) {
        var ca = (a.code || "").toLowerCase(), cb = (b.code || "").toLowerCase();
        var ia = headOrder.indexOf(ca), ib = headOrder.indexOf(cb);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a.label.localeCompare(b.label);
      });

      var chargeRows = sortedCharges.map(function (c) {
        var isOldDue = (c.code === "OLD_DUE" || c.label.toLowerCase().includes("old due"));
        var allowEdit = !isOldDue || isDigitisationYear;

        return (
          '<tr>' +
          '<td data-label="Fee Head"><b>' + esc(c.label) + '</b></td>' +
          '<td class="r" data-label="Assigned">' +
            money(c.assigned) + ' ' +
            (allowEdit ? '<button class="mini-edit btn-edit-charge" data-code="' + esc(c.code || c.label) + '" data-amt="' + c.assigned + '" title="Edit Fee Assignment"><i class="material-icons" style="font-size:14px">edit</i></button>' : '') +
          '</td>' +
          '<td class="r" data-label="Collected">' + money(c.paid) + '</td>' +
          '<td class="r" data-label="Pending"><b>' + money(c.balance) + '</b></td>' +
          '</tr>'
        );
      }).join("");

      var assignTable =
        '<div class="sh"><i class="material-icons">table_view</i> ' + esc(yf) + ' Fee Structure (' + esc(yearData.className || "Grade") + ')</div>' +
        '<div class="tw"><table class="tbl"><thead><tr><th>Fee Head</th><th class="r">Assigned</th><th class="r">Collected</th><th class="r">Pending Balance</th></tr></thead><tbody>' +
        (chargeRows || '<tr><td colspan="4" class="mut">No fees assigned for ' + esc(yf) + '.</td></tr>') +
        '</tbody></table></div>';

      var waterfallOrder = ["Study Materials Fee", "Old Due", "Misc Fee", "Tuition Fee", "Transport Fee"];
      var allocs = [];
      (L.stmt.receipts || []).forEach(function (p) {
        if (p.status === "Void") return;
        (p.allocations || []).forEach(function (a) {
          if (a.year === yf) {
            allocs.push({ label: a.label, code: a.feeTypeCode || a.label, year: a.year, amount: Number(a.amount) || 0, date: p.date, receiptId: p.receiptId, mode: p.mode });
          }
        });
      });

      var byType = {};
      allocs.forEach(function (a) { (byType[a.label] = byType[a.label] || []).push(a); });

      var sortedTypeNames = Object.keys(byType).sort(function (a, b) {
        var ia = waterfallOrder.indexOf(a), ib = waterfallOrder.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a.localeCompare(b);
      });

      var payBlocks = sortedTypeNames.map(function (nm) {
        var list = byType[nm].slice().sort(function (a, b) { return a.date > b.date ? -1 : 1; });
        var subTotal = list.reduce(function (s, x) { return s + x.amount; }, 0);
        
        var matchingCharge = (yearData.charges || []).find(function (c) { return c.label === nm || c.code === nm; });
        var headAssigned = matchingCharge ? matchingCharge.assigned : subTotal;
        var headClosingBal = Math.max(0, headAssigned - subTotal);

        var trs = list.map(function (a) {
          return (
            '<tr>' +
            '<td data-label="Date">' + esc(pd(a.date)) + '</td>' +
            '<td data-label="Receipt"><b>' + esc(a.receiptId) + '</b></td>' +
            '<td data-label="Mode">' + esc(a.mode) + '</td>' +
            '<td class="r" data-label="Amount Paid"><span class="ok">+' + money(a.amount) + '</span></td>' +
            '<td data-label="Actions">' +
              '<button class="mini rP" data-r="' + esc(a.receiptId) + '" data-y="' + esc(yf) + '" title="Print"><i class="material-icons" style="font-size:15px">print</i></button> ' +
              '<button class="mini rS" data-r="' + esc(a.receiptId) + '" data-y="' + esc(yf) + '" title="Share"><i class="material-icons" style="font-size:15px">ios_share</i></button> ' +
              '<button class="mini btn-void-alloc" data-r="' + esc(a.receiptId) + '" data-y="' + esc(yf) + '" data-ft="' + esc(a.code) + '" style="color:#b91c1c;border-color:#fca5a5;" title="Void Only This Allocation"><i class="material-icons" style="font-size:15px">delete_outline</i></button>' +
            '</td>' +
            '</tr>'
          );
        }).join("");

        return (
          '<div class="catyear"><div class="catyh">' + esc(nm) + ' · Total Paid: ' + money(subTotal) + ' · Pending Balance: ' + money(headClosingBal) + '</div>' +
          '<div class="tw"><table class="tbl"><thead><tr><th>Date</th><th>Receipt ID</th><th>Mode</th><th class="r">Amount Paid</th><th>Actions</th></tr></thead><tbody>' + trs + '</tbody></table></div></div>'
        );
      }).join("") || '<div class="se"><i class="material-icons">info</i>No payments recorded for ' + esc(yf) + '.</div>';

      $("lD").innerHTML = assignTable + '<div class="sh"><i class="material-icons">history</i> Payments by Fee Type (' + esc(yf) + ')</div>' + payBlocks;

      wireReceiptButtons();
      wireInLineEditButtons();
    }

    function wireInLineEditButtons() {
      Array.prototype.forEach.call($("lD").querySelectorAll(".btn-edit-charge"), function (btn) {
        btn.onclick = function () {
          var code = btn.getAttribute("data-code");
          var currentAmt = Number(btn.getAttribute("data-amt")) || 0;
          
          var modalBody =
            '<div class="fld"><label>Fee Head Code</label><input class="in" value="' + esc(code) + '" disabled/></div>' +
            '<div class="fld"><label>New Assigned Amount (₹)</label><input id="inpNewCharge" class="in big" type="number" value="' + currentAmt + '"/></div>' +
            '<button class="btn btn-maroon" id="btnSaveCharge" style="width:100%;justify-content:center;margin-top:10px;"><i class="material-icons">save</i> Update Assigned Fee</button>';

          openModal("Edit Fee Charge · " + esc(L.yview), modalBody);

          setTimeout(function () {
            $("btnSaveCharge").onclick = function () {
              var newAmt = Number($("inpNewCharge").value);
              if (isNaN(newAmt) || newAmt < 0) return toast("Enter a valid fee amount.", "err");

              var feesPayload = {};
              var oldDueAmt = null;

              if (code === "OLD_DUE") {
                oldDueAmt = newAmt;
              } else {
                feesPayload[code] = newAmt;
              }

              P.api("feeSetStudentCharges", [L.student.id, L.yview, feesPayload, oldDueAmt, ME], { text: "Updating fee..." })
                .then(function (res) {
                  if (res.success) {
                    toast("Fee assignment updated.", "ok");
                    closeModal("mdl");
                    L.stmt = null;
                    refresh();
                  } else {
                    toast(res.errors ? res.errors.join(", ") : "Failed to update.", "err");
                  }
                }).catch(function (e) { toast(e.message || e, "err"); });
            };
          }, 50);
        };
      });
    }

    function triggerFullAuditPrint() {
      P.api("feeGetFullAuditStatement", [L.student.id], { text: "Loading full audit ledger..." })
        .then(function (auditData) {
          ReceiptShare.shareAuditLedger(auditData);
        })
        .catch(function (e) { toast(e.message || e, "err"); });
    }

    function withReceipt(rid, year, cb) { P.api("feeGetReceipt", [rid, year], { text: "Preparing receipt…" }).then(cb).catch(function (e) { toast(e.message || e, "err"); }); }
    function wireReceiptButtons() {
      Array.prototype.forEach.call($("lD").querySelectorAll(".rP"), function (b) { b.onclick = function () { withReceipt(b.getAttribute("data-r"), b.getAttribute("data-y"), function (r) { ReceiptShare.print(r); }); }; });
      Array.prototype.forEach.call($("lD").querySelectorAll(".rS"), function (b) { b.onclick = function () { withReceipt(b.getAttribute("data-r"), b.getAttribute("data-y"), function (r) { ReceiptShare.share(r); }); }; });
      
      Array.prototype.forEach.call($("lD").querySelectorAll(".btn-void-alloc"), function (b) {
        b.onclick = function () {
          var rid = b.getAttribute("data-r");
          var year = b.getAttribute("data-y");
          var code = b.getAttribute("data-ft");
          var reason = prompt('Enter reason for voiding ' + code + ' allocation in receipt "' + rid + '":');
          if (!reason) return;

          P.api("feeVoidAllocation", [rid, year, code, reason], { text: "Voiding allocation…" })
            .then(function (res) {
              if (res.success) {
                toast("Allocation for " + code + " voided.", "ok");
                L.stmt = null;
                refresh();
              }
            })
            .catch(function (e) { toast(e.message || e, "err"); });
        };
      });
    }

    /* ======================= COLLECT ======================= */
    function mountCollect() {
      PAY = { student: null, account: null, choice: "" };
      var years = (BOOT.years || []).map(function (y) { return '<option' + (y === YEAR ? " selected" : "") + '>' + esc(y) + '</option>'; }).join("");
      $("pCollect").innerHTML =
        '<div class="bar"><div class="srch"><i class="material-icons">search</i><input id="cS" placeholder="Search student by Name, ID or Phone…"/><button class="clr" id="cC">&times;</button></div><div id="cR" class="res"></div>' +
        '<div class="or"><span>or pick</span></div><div class="pick">' +
        selc("event", "Academic Year", '<select id="cY" class="in">' + years + '</select>') +
        selc("groups", "Class", '<select id="cCl" class="in"><option value="">Loading…</option></select>') +
        selc("person", "Student", '<select id="cSt" class="in" disabled><option value="">Pick a class…</option></select>') +
        '</div></div>' +
        '<div id="cB"><div class="empty"><i class="material-icons">point_of_sale</i>Search or pick a student to collect a payment.</div></div>';
      var t = null; var searchSeq = 0;
      $("cS").addEventListener("input", function () {
        var v = this.value; clearTimeout(t);
        var seq = ++searchSeq;
        t = setTimeout(function () { search("cR", v, collectOpen, seq); }, 300);
      });
      $("cC").onclick = function () { searchSeq++; clearTimeout(t); $("cS").value = ""; $("cR").innerHTML = ""; };
      function CY() { return $("cY").value; }
      function cClasses() { var s = $("cCl"); s.innerHTML = '<option>Loading…</option>'; P.api("feeGetClasses", [CY()], { overlay: false }).then(function (cs) { s.innerHTML = '<option value="">Select class…</option>' + (cs || []).map(function (c) { return '<option>' + esc(c) + '</option>'; }).join(""); }); }
      function cStudents() {
        var cls = $("cCl").value, s = $("cSt");
        if (!cls) { s.disabled = true; s.innerHTML = '<option value="">Pick a class…</option>'; return; }
        s.disabled = true; s.innerHTML = '<option>Loading…</option>';
        P.api("feeGetStudents", [CY(), cls], { overlay: false }).then(function (list) {
          var rows = (list || []).filter(function (x) { return !studentIsInactive(x); }).sort(feeStudentSort);
          s.disabled = false;
          s.innerHTML = '<option value="">Select active student…</option>' + rows.map(function (x) {
            return '<option value="' + esc(x.id) + '">' + (studentRoll(x) !== null ? esc(String(studentRoll(x))) + ' · ' : '') + esc(x.name) + '</option>';
          }).join("");
        }).catch(function () { s.disabled = true; s.innerHTML = '<option value="">Failed to load students</option>'; });
      }
      $("cY").onchange = function () { clearCollectSelection(); cClasses(); };
      $("cCl").onchange = function () { clearCollectSelection(); cStudents(); };
      $("cSt").onchange = function () { if (this.value) collectOpen(this.value, true); };
      cClasses();
      function clearCollectSelection() {
        if ($("cSt")) { $("cSt").value = ""; }
        if ($("cR")) { $("cR").innerHTML = ""; }
      }
    }
    function collectOpen(id, fromSearch) {
      sw("collect");
      if ($("cS")) $("cS").value = "";
      if (fromSearch) {
        if ($("cCl")) $("cCl").value = "";
        if ($("cSt")) { $("cSt").value = ""; $("cSt").disabled = true; $("cSt").innerHTML = '<option value="">Selected through search</option>'; }
        if ($("cR")) $("cR").innerHTML = "";
      }
      $("cB").innerHTML = mt("Loading account…");
      P.api("feeGetStudentFinance", [id], { overlay: false }).then(function (f) {
        PAY.student = f.student; PAY.account = f.account; PAY.choice = "";
        renderCollect(f.perYear, f.account.year);
      }).catch(function (e) { $("cB").innerHTML = eb(e); });
    }
    function renderCollect(perYear, activeY) {
      var a = PAY.account, s = PAY.student, t = a.totals;
      var chips = (perYear || []).map(function (y) {
        return '<button type="button" class="yc' + (y.year === activeY ? " active" : "") + (y.balance > 0 ? " due" : "") + '" data-y="' + esc(y.year) + '"><span>' + esc(y.year) + '</span><em>' + money(y.balance) + '</em></button>';
      }).join("");
      var rows = a.breakdown.map(function (b) { return '<tr><td data-label="Fee">' + esc(b.label) + '</td><td class="r" data-label="Assigned">' + money(b.assigned) + '</td><td class="r" data-label="Collected">' + money(b.paid) + '</td><td class="r" data-label="Balance">' + money(b.balance) + '</td></tr>'; }).join("");
      $("cB").innerHTML = '<div class="acc"><div class="sbar"><div class="sn">' + esc(s.name) + '</div><div class="sm">' + esc(a.className || "") + ' · ID ' + esc(s.id) + '</div></div><div class="year-strip"><div class="year-strip-label">Academic year</div>' + chips + '</div>' +
        '<div class="tots">' + tot(money(t.remaining), "Outstanding", t.remaining > 0 ? "red" : "green") + tot(money(t.openingBalance), "Old Due", t.openingBalance > 0 ? "amber" : "") + tot(money(t.charged), "Charged " + esc(a.year), "") + '</div>' +
        '<div class="tw"><table class="tbl"><thead><tr><th>Fee</th><th class="r">Assigned</th><th class="r">Collected</th><th class="r">Balance</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '<div class="pc"><h3><i class="material-icons">payments</i> Collect a Payment</h3>' + (a.canPay ? '<div class="note"><i class="material-icons">info</i>Enter amount — auto-allocates: Study Materials → Old Due → Misc → Tuition → Transport.</div><div class="prow"><div class="fld"><label>Amount Received</label><input id="cA" class="in big" type="number" min="1" inputmode="numeric"/></div><div class="fld"><label>Mode</label><select id="cM" class="in">' + (BOOT.modes || []).map(function (m) { return '<option>' + m + '</option>'; }).join("") + '</select></div><div class="fld"><label>Date</label><input id="cD" class="in" value="' + today() + '"/></div></div><div class="fld"><label>Remarks (optional)</label><input id="cRm" class="in"/></div><button class="btn btn-maroon" id="cPv"><i class="material-icons">visibility</i> Preview Allocation</button><div id="cCh"></div><div id="cPr"></div>' : '<div class="note ok"><i class="material-icons">verified</i>All dues cleared for ' + esc(a.year) + '.</div>') + '</div></div>';
      Array.prototype.forEach.call($("cB").querySelectorAll(".yc"), function (b) { b.onclick = function () { P.api("feeGetAccount", [b.getAttribute("data-y"), s.id], { overlay: false }).then(function (ac) { PAY.account = ac; PAY.choice = ""; renderCollect(perYear, ac.year); }); }; });
      if (a.canPay) { $("cPv").onclick = preview; $("cA").addEventListener("keydown", function (e) { if (e.key === "Enter") preview(); }); setTimeout(function () { $("cA").focus(); }, 50); }
    }
    function preview() { var amt = Number($("cA").value); if (!amt || amt <= 0) return toast("Enter a valid amount.", "err"); P.api("feePreviewPayment", [{ year: PAY.account.year, studentId: PAY.account.studentId, amount: amt, transportChoice: PAY.choice }], { text: "Calculating…" }).then(function (p) { if (p.needsChoice) return choice(p); showPrev(amt, p); }).catch(function (e) { toast(e.message || e, "err"); }); }
    function choice(p) { $("cCh").innerHTML = '<div class="note amber"><i class="material-icons">help</i>Reaches current-year fees and <b>Transport is also open</b>. Apply remaining ' + money(p.reachesCurrent) + ' to which first?</div><div class="seg"><button data-c="TUITION">Tuition first</button><button data-c="TRANSPORT">Transport first</button></div>'; Array.prototype.forEach.call($("cCh").querySelectorAll("[data-c]"), function (b) { b.onclick = function () { PAY.choice = b.getAttribute("data-c"); preview(); }; }); }
    function showPrev(amt, p) { $("cCh").innerHTML = ""; var rows = p.allocations.map(function (a) { return '<tr><td data-label="Applied to">' + esc(a.label) + ' <span class="yr">' + esc(a.year) + '</span>' + (a.isPrevYear ? ' <span class="tag">old</span>' : '') + '</td><td class="r" data-label="Amount">' + money(a.amount) + '</td><td class="r" data-label="Balance after">' + money(a.remainingAfter) + '</td></tr>'; }).join(""); $("cPr").innerHTML = '<div class="conf"><div class="ch">Payment <b>' + money(amt) + '</b> will be recorded as:</div><div class="tw"><table class="tbl"><thead><tr><th>Applied to</th><th class="r">Amount</th><th class="r">Balance after</th></tr></thead><tbody>' + rows + '</tbody></table></div><button class="btn btn-maroon" id="cCf" style="margin-top:12px"><i class="material-icons">check_circle</i> Confirm &amp; Record</button></div>'; $("cCf").onclick = record; }

    function record() {
      var amt = Number($("cA").value), b = $("cCf");
      b.disabled = true; b.innerHTML = '<i class="material-icons">sync</i> Saving…';
      P.api("feeRecordPayment", [{ year: PAY.account.year, studentId: PAY.account.studentId, amount: amt, mode: $("cM").value, date: $("cD").value.trim(), remarks: $("cRm").value, transportChoice: PAY.choice, receivedBy: ME }], { text: "Recording…" })
        .then(function (res) {
          if (res.needsChoice) {
            b.disabled = false; b.innerHTML = '<i class="material-icons">check_circle</i> Confirm &amp; Record';
            return choice(res);
          }
          toast("Recorded successfully.", "ok");
          
          var sid = PAY.account.studentId;
          var wasMulti = !!(res.multiReceipts && res.multiReceipts.length);
          if (wasMulti) {
            multiReceiptsModal(res.multiReceipts, sid);
          } else if (res.receiptId) {
            receiptModal(res, sid);
          }
        }).catch(function (e) { toast(e.message || e, "err"); b.disabled = false; b.innerHTML = '<i class="material-icons">check_circle</i> Confirm &amp; Record'; });
    }

    function refreshAfterReceipt(sid) {
      var closeAndRefresh = function () {
        var h = $("mdl"); if (h) h.classList.remove("show");
        sw("ledger");
        openLedger(sid);
      };
      setTimeout(function () {
        var mx = $("mx"), mc2 = $("mc2"), h = $("mdl");
        if (mx) mx.onclick = closeAndRefresh;
        if (mc2) mc2.onclick = closeAndRefresh;
        if (h) h.onclick = function (e) { if (e.target === h) closeAndRefresh(); };
      }, 30);
    }

    function multiReceiptsModal(receipts, sid) {
      var listHtml = receipts.map(function (r) {
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid #e2e8f0;">' +
          '<div><b>' + esc(r.receiptId) + '</b> (' + esc(r.feeType) + ')</div>' +
          '<div>' + money(r.currentPayment || r.amount) + ' ' +
          '<button class="mini" onclick="window.printSingleReceipt(\'' + esc(r.receiptId) + '\')"><i class="material-icons" style="font-size:14px">print</i> Print</button></div>' +
          '</div>';
      }).join("");

      openModal("Receipts Generated (" + receipts.length + ")", '<div class="note ok"><i class="material-icons">check_circle</i>Payment split into ' + receipts.length + ' receipts by fee type.</div><div style="margin-top:10px;">' + listHtml + '</div>');
      refreshAfterReceipt(sid);

      window.printSingleReceipt = function (rid) {
        withReceipt(rid, function (rc) { ReceiptShare.print(rc); });
      };
    }

    function receiptModal(r, sid) {
      openModal("Receipt · " + esc(r.receiptId), '<div class="note ok"><i class="material-icons">check_circle</i>Saved ' + money(r.currentPayment || r.amount) + '. Balance after: <b>' + money(r.balance) + '</b>.</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-maroon btn-sm" id="rP"><i class="material-icons">print</i> Print Receipt</button><button class="btn btn-outline btn-sm" id="rS"><i class="material-icons">ios_share</i> Share PDF</button></div>');
      refreshAfterReceipt(sid);
      setTimeout(function () { if ($("rP")) $("rP").onclick = function () { ReceiptShare.print(r); }; if ($("rS")) $("rS").onclick = function () { ReceiptShare.share(r); }; }, 30);
    }

    /* ======================= FEE SHEET ======================= */
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
    function rowTotal(i) { var d = SHEET.data, t = 0; d.feeTypes.forEach(function (ty) { var inp = $("fB").querySelector('.cell[data-i="' + i + '"][data-ft="' + ty.code + '"]'); t += inp ? (Number(inp.value) || 0) : (d.rows[i].fees[ty.code] || 0); }); var od = $("fB").querySelector('.cell[data-i="' + i + '"][data-ft="__OLD__"]'); t += od ? (Number(od.value) || 0) : (d.rows[i].oldDue || 0); return t; }
    function updateTotals() {
      var d = SHEET.data, grand = 0, gOld = 0, gByFt = {};
      d.rows.forEach(function (r, i) {
        var rt = rowTotal(i), el = $("rt" + i);
        if (el) el.innerHTML = money(rt);
        grand += rt;
        d.feeTypes.forEach(function (ty) {
          var inp = $("fB").querySelector('.cell[data-i="' + i + '"][data-ft="' + ty.code + '"]');
          gByFt[ty.code] = (gByFt[ty.code] || 0) + (inp ? Number(inp.value) || 0 : 0);
        });
        var od = $("fB").querySelector('.cell[data-i="' + i + '"][data-ft="__OLD__"]');
        gOld += od ? Number(od.value) || 0 : (d.rows[i].oldDue || 0);
      });
      if ($("gTot")) $("gTot").innerHTML = money(grand);
      if ($("gOld")) $("gOld").innerHTML = money(gOld);
      d.feeTypes.forEach(function (ty) {
        if ($("g_" + ty.code)) $("g_" + ty.code).innerHTML = money(gByFt[ty.code] || 0);
      });
    }

    function renderSheet() {
      var d = SHEET.data;
      /* Preserve one canonical Fee Management order: active students by roll number,
         then inactive/left/passed students without roll numbers. */
      d.rows = (d.rows || []).slice().sort(feeStudentSort);
      if (!d.rows.length) {
        $("fB").innerHTML = '<div class="empty"><i class="material-icons">group_off</i>No students in this class.</div>';
        return;
      }

      var migYear = (BOOT && BOOT.migrationYear) || "2025-26";
      var isMigrationYear = d.year === migYear;
      var feeCount = d.feeTypes.length;
      var oldTotal = d.rows.reduce(function (sum, r) { return sum + (Number(r.oldDue) || 0); }, 0);
      var feeNames = d.feeTypes.map(function (t) { return esc(t.name); }).join(" · ");

      var head =
        '<tr>' +
          '<th class="fs-student-col">Student / Status</th>' +
          '<th class="r fs-old-col">Old Due' + (isMigrationYear ? '' : ' <span class="lock-head"><i class="material-icons">lock</i></span>') + '</th>' +
          d.feeTypes.map(function (t) { return '<th class="r">' + esc(t.name) + '</th>'; }).join("") +
          '<th class="r fs-total-col">Total</th>' +
        '</tr>';

      var body = d.rows.map(function (r, i) {
        var cells = d.feeTypes.map(function (t) {
          return '<td class="r fs-input-cell"><div class="fee-input-wrap"><span>₹</span><input class="cell" data-i="' + i + '" data-ft="' + esc(t.code) + '" type="number" min="0" step="1" value="' + (r.fees[t.code] || 0) + '" aria-label="' + esc(t.name) + ' for ' + esc(r.name) + '"/></div></td>';
        }).join("");

        var oc = isMigrationYear
          ? '<td class="r fs-old-cell"><div class="fee-input-wrap old-edit"><span>₹</span><input class="cell old" data-i="' + i + '" data-ft="__OLD__" type="number" min="0" step="1" value="' + (r.oldDue || 0) + '" aria-label="Old Due for ' + esc(r.name) + '"/></div></td>'
          : '<td class="r fs-old-cell"><div class="locked-fee"><span>' + money(r.oldDue || 0) + '</span><i class="material-icons" title="Locked after opening year">lock</i></div></td>';

        return '<tr class="fs-row" data-name="' + esc(String(r.name || "").toLowerCase()) + '">' +
          feeStudentCell(r) +
          oc + cells +
          '<td class="r rowtot fs-total" id="rt' + i + '">' + money(rowTotal(i)) + '</td>' +
        '</tr>';
      }).join("");

      var grandRow =
        '<tr class="grand fs-grand">' +
          '<td class="stn"><b>CLASS TOTAL</b><span>' + d.rows.length + ' students · live total</span></td>' +
          '<td id="gOld" class="r">—</td>' +
          d.feeTypes.map(function (t) { return '<td id="g_' + esc(t.code) + '" class="r">—</td>'; }).join("") +
          '<td id="gTot" class="r total-emphasis">—</td>' +
        '</tr>';

      $("fB").innerHTML =
        '<div class="fs-head">' +
          '<div class="fs-title-block">' +
            '<span class="eyebrow">FEE ASSIGNMENT</span>' +
            '<h2><i class="material-icons">grid_view</i>' + esc(d.className || "Class") + ' Fee Sheet</h2>' +
            '<p>' + esc(d.year) + ' · ' + d.rows.length + ' students · ' + feeCount + ' editable fee heads</p>' +
          '</div>' +
          '<div class="fs-status ' + (isMigrationYear ? 'open' : 'locked') + '"><i class="material-icons">' + (isMigrationYear ? 'edit' : 'lock') + '</i>' + (isMigrationYear ? 'Opening-year editing' : 'Old Due locked') + '</div>' +
        '</div>' +

        '<div class="fs-toolbar">' +
          '<div class="fs-search"><i class="material-icons">search</i><input id="fsSearch" placeholder="Find a student…" autocomplete="off"/></div>' +
          '<div class="fs-toolbar-note"><i class="material-icons">' + (isMigrationYear ? 'edit_note' : 'lock') + '</i><span>' +
            (isMigrationYear
              ? '<b>Opening-year mode</b> Old Due can be entered here. Other fee heads remain editable.'
              : '<b>Old Due is locked</b> Carry-forward balances are created through <b>Tools → Assign Old Due</b>.') +
          '</span></div>' +
        '</div>' +

        '<div class="fs-table-wrap"><table class="sht fs-table"><thead>' + head + '</thead><tbody>' + body + grandRow + '</tbody></table></div>' +

        '<div class="fs-footer">' +
          '<div><i class="material-icons">info</i><span>Totals update instantly. Fee assignments cannot be reduced below amounts already collected.</span></div>' +
          '<button class="btn btn-maroon" id="fS"><i class="material-icons">save</i> Save Fee Sheet</button>' +
        '</div>';

      Array.prototype.forEach.call($("fB").querySelectorAll(".cell"), function (inp) {
        inp.addEventListener("input", updateTotals);
      });

      $("fsSearch").addEventListener("input", function () {
        var q = String(this.value || "").trim().toLowerCase();
        Array.prototype.forEach.call($("fB").querySelectorAll(".fs-row"), function (row) {
          row.style.display = !q || String(row.getAttribute("data-name") || "").indexOf(q) !== -1 ? "" : "none";
        });
      });

      updateTotals();
      $("fS").onclick = saveSheet;
    }

    function saveSheet() {
      var d = SHEET.data;
      var migYear = (BOOT && BOOT.migrationYear) || "2025-26";
      var isMigrationYear = d.year === migYear;

      var rows = d.rows.map(function (r, i) {
        var fees = {};
        d.feeTypes.forEach(function (t) {
          var inp = $("fB").querySelector('.cell[data-i="' + i + '"][data-ft="' + t.code + '"]');
          fees[t.code] = inp ? Number(inp.value) || 0 : Number(r.fees[t.code]) || 0;
        });

        // Old Due is editable only in the opening/digitisation year.
        // In later years the existing carry-forward value is submitted unchanged.
        var od = $("fB").querySelector('.cell[data-i="' + i + '"][data-ft="__OLD__"]');
        var oldDue = isMigrationYear ? (od ? Number(od.value) || 0 : Number(r.oldDue) || 0) : (Number(r.oldDue) || 0);

        return { id: r.id, fees: fees, oldDue: oldDue };
      });

      var b = $("fS");
      b.disabled = true;
      b.innerHTML = '<i class="material-icons">sync</i> Saving…';

      P.api("feeSaveFeeSheet", [d.year, d.className, rows, ME], { text: "Saving…" })
        .then(function (res) {
          toast("Saved " + (res.changed || 0) + " change(s)." + (res.errors && res.errors.length ? " " + res.errors.length + " blocked." : ""), res.errors && res.errors.length ? "err" : "ok");
          b.disabled = false;
          b.innerHTML = '<i class="material-icons">save</i> Save Fee Sheet';
          loadSheet();
        })
        .catch(function (e) {
          toast(e.message || e, "err");
          b.disabled = false;
          b.innerHTML = '<i class="material-icons">save</i> Save Fee Sheet';
        });
    }

    /* ======================= REPORTS ======================= */
    function mountReports() {
      var years = (BOOT.years || []).map(function (y) {
        return '<option' + (y === YEAR ? " selected" : "") + '>' + esc(y) + '</option>';
      }).join("");

      $("pReports").innerHTML =
        '<div class="page-card reports-page">' +
          '<div class="page-card-head">' +
            '<div><span class="eyebrow">FINANCE REPORTS</span><h2><i class="material-icons">assessment</i> Reports</h2><p>Class-wise student reports are available directly. School totals require a separate password.</p></div>' +
            '<div class="report-stat"><i class="material-icons">account_balance_wallet</i><span id="repYearLabel">' + esc(YEAR) + '</span></div>' +
          '</div>' +
          '<div class="subt report-tabs" id="reportTabs">' +
            '<button data-rv="totals"><i class="material-icons">lock</i>School Totals</button>' +
            '<button class="active" data-rv="class"><i class="material-icons">groups</i>Class-wise Report</button>' +
          '</div>' +
          '<div id="repTotals" style="display:none"></div><div id="repClass"></div>' +
        '</div>';

      Array.prototype.forEach.call($("reportTabs").querySelectorAll("button"), function (b) {
        b.onclick = function () { switchReportView(b.getAttribute("data-rv")); };
      });

      mountReportTotals();
      mountReportClass();
      switchReportView("class");
    }

    function switchReportView(view) {
      if (view === "totals") {
        openSchoolTotalsGate();
        return;
      }
      Array.prototype.forEach.call($("reportTabs").querySelectorAll("button"), function (b) {
        b.classList.toggle("active", b.getAttribute("data-rv") === view);
      });
      $("repTotals").style.display = "none";
      $("repClass").style.display = "block";
    }

    function schoolTotalsGateActive() {
      try {
        var g = JSON.parse(sessionStorage.getItem(SCHOOL_TOTALS_GATE));
        return !!(g && Date.now() < Number(g.exp || 0));
      } catch (e) {
        return false;
      }
    }

    function openSchoolTotalsGate() {
      if (schoolTotalsGateActive()) {
        showSchoolTotals();
        return;
      }

      var body =
        '<div class="note amber"><i class="material-icons">lock</i>School-wide fee totals are restricted. Enter the separate finance password.</div>' +
        '<div class="fld" style="margin-top:12px"><label>School Totals Password</label><input id="schoolTotalsPw" class="in" type="password" autocomplete="off"/></div>' +
        '<button class="btn btn-maroon" id="schoolTotalsUnlock" style="width:100%;justify-content:center;margin-top:10px"><i class="material-icons">lock_open</i> Unlock School Totals</button>' +
        '<div class="fin-err" id="schoolTotalsErr" style="display:none;margin-top:10px"></div>';

      openModal("School Totals", body);
      setTimeout(function () {
        var inp = $("schoolTotalsPw"), btn = $("schoolTotalsUnlock");
        if (inp) inp.focus();
        function unlock() {
          var pw = inp ? inp.value : "";
          if (!pw) {
            var er = $("schoolTotalsErr");
            if (er) { er.textContent = "Enter the password."; er.style.display = "block"; }
            return;
          }
          btn.disabled = true;
          btn.innerHTML = '<i class="material-icons">sync</i> Verifying…';
          P.api("feeGetSchoolTotals", [$("repTY").value, pw], { overlay: false })
            .then(function (d) {
              sessionStorage.setItem(SCHOOL_TOTALS_GATE, JSON.stringify({ exp: Date.now() + 15 * 60000 }));
              REPORTS.totals = d;
              closeModal("mdl");
              renderReportTotals(d);
              Array.prototype.forEach.call($("reportTabs").querySelectorAll("button"), function (b) {
                b.classList.toggle("active", b.getAttribute("data-rv") === "totals");
              });
              $("repTotals").style.display = "block";
              $("repClass").style.display = "none";
            })
            .catch(function (e) {
              btn.disabled = false;
              btn.innerHTML = '<i class="material-icons">lock_open</i> Unlock School Totals';
              var er = $("schoolTotalsErr");
              if (er) { er.textContent = e.message || "Incorrect password."; er.style.display = "block"; }
            });
        }
        if (btn) btn.onclick = unlock;
        if (inp) inp.addEventListener("keydown", function (e) { if (e.key === "Enter") unlock(); });
      }, 50);
    }

    function showSchoolTotals() {
      Array.prototype.forEach.call($("reportTabs").querySelectorAll("button"), function (b) {
        b.classList.toggle("active", b.getAttribute("data-rv") === "totals");
      });
      $("repTotals").style.display = "block";
      $("repClass").style.display = "none";
      loadReportTotals();
    }

    function mountReportTotals() {
      var years = (BOOT.years || []).map(function (y) {
        return '<option' + (y === YEAR ? " selected" : "") + '>' + esc(y) + '</option>';
      }).join("");

      $("repTotals").innerHTML =
        '<div class="report-toolbar">' +
          selc("event", "Academic Year", '<select id="repTY" class="in">' + years + '</select>') +
          '<button class="btn btn-maroon" id="repTLoad" style="align-self:flex-end"><i class="material-icons">refresh</i> Get Total Dues</button>' +
          '<button class="btn btn-outline" id="repTPrint" style="align-self:flex-end"><i class="material-icons">print</i> Print</button>' +
          '<button class="btn btn-outline" id="repTExport" style="align-self:flex-end"><i class="material-icons">download</i> Export CSV</button>' +
        '</div>' +
        '<div id="repTB"><div class="empty"><i class="material-icons">summarize</i>Select an academic year and load the totals report.</div></div>';

      $("repTLoad").onclick = openSchoolTotalsGate;
      $("repTPrint").onclick = printReportTotals;
      $("repTExport").onclick = exportReportTotals;
    }

    function mountReportClass() {
      var years = (BOOT.years || []).map(function (y) {
        return '<option' + (y === YEAR ? " selected" : "") + '>' + esc(y) + '</option>';
      }).join("");

      $("repClass").innerHTML =
        '<div class="report-toolbar">' +
          selc("event", "Academic Year", '<select id="repCY" class="in">' + years + '</select>') +
          selc("groups", "Class", '<select id="repCClass" class="in"><option value="">Loading…</option></select>') +
          selc("payments", "Fee Type", '<select id="repCFee" class="in"><option value="ALL">All Fee Types</option>' +
            '<option value="OLD_DUE">Old Due</option>' +
            (BOOT.feeTypes || []).filter(function (t) { return t.code !== "OLD_DUE"; }).map(function (t) {
              return '<option value="' + esc(t.code) + '">' + esc(t.name) + '</option>';
            }).join("") +
          '</select>') +
          '<button class="btn btn-maroon" id="repCLoad" style="align-self:flex-end"><i class="material-icons">table_view</i> Load Report</button>' +
          '<button class="btn btn-outline" id="repCPrint" style="align-self:flex-end"><i class="material-icons">print</i> Print</button>' +
          '<button class="btn btn-outline" id="repCExport" style="align-self:flex-end"><i class="material-icons">download</i> Export CSV</button>' +
        '</div>' +
        '<div id="repCB"><div class="empty"><i class="material-icons">groups</i>Pick a year and class, then load the class-wise report.</div></div>';

      $("repCY").onchange = function () {
        REPORTS.classListRequest++;
        REPORTS.classRequest++;
        $("repCClass").innerHTML = '<option value="">Loading…</option>';
        $("repCB").innerHTML = '<div class="empty"><i class="material-icons">groups</i>Pick a class and load the report.</div>';
        reportClasses();
      };
      $("repCClass").onchange = function () {
        if ($("repCClass").value) loadClassReport();
      };
      $("repCFee").onchange = function () {
        if ($("repCClass").value) loadClassReport();
      };
      $("repCLoad").onclick = loadClassReport;
      $("repCPrint").onclick = printClassReport;
      $("repCExport").onclick = exportClassReport;
      reportClasses();
    }

    function reportClasses() {
      var y = $("repCY").value, s = $("repCClass");
      var requestId = ++REPORTS.classListRequest;
      REPORTS.classRequest++;
      s.innerHTML = '<option value="">Loading…</option>';

      P.api("feeGetClasses", [y], { overlay: false }).then(function (cs) {
        // Ignore a response belonging to an older academic-year request.
        if (requestId !== REPORTS.classListRequest || $("repCY").value !== y) return;

        var list = cs || [];
        s.innerHTML = '<option value="">Select class…</option>' +
          list.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join("");

        // IMPORTANT: do not automatically select/load the first class.
        // The old implementation did this and could display one class first,
        // then replace it when another pending request completed.
        s.value = "";

        if (list.length) {
          $("repCB").innerHTML = '<div class="empty"><i class="material-icons">groups</i>Select a class, then load the report.</div>';
        } else {
          $("repCB").innerHTML = '<div class="empty"><i class="material-icons">group_off</i>No classes found for ' + esc(y) + '.</div>';
        }
      }).catch(function (e) {
        if (requestId !== REPORTS.classListRequest || $("repCY").value !== y) return;
        s.innerHTML = '<option value="">Failed to load classes</option>';
        $("repCB").innerHTML = eb(e);
      });
    }

    function reportFeeWeight(r) {
      var k = reportNameKey(r && r.name);
      if ((r && r.code === "OLD_DUE") || k === "OLDDUE") return 1;
      if (k.indexOf("STUDYMATERIAL") !== -1) return 2;
      if (k.indexOf("TUITION") !== -1) return 3;
      if (k.indexOf("TRANSPORT") !== -1) return 4;
      if (k.indexOf("MISC") !== -1) return 5;
      var t = (BOOT.feeTypes || []).find(function (x) { return x.code === (r && r.code); });
      return t ? 20 + Number(t.sort || 25) : 50;
    }

    function reportNameKey(s) {
      return String(s || "").toUpperCase().trim()
        .replace(/[-_.:]/g, "")
        .replace(/\s+/g, "")
        .replace(/FEES/g, "FEE");
    }

    function reportMoney(n) { return money(Number(n) || 0); }

    function loadReportTotals() {
      var y = $("repTY").value;
      REPORTS.year = y;
      $("repYearLabel").textContent = y;
      $("repTB").innerHTML = mt("Calculating school totals…");

      Promise.all([
        P.api("feeGetClasses", [y], { overlay: false }),
        P.api("feeCollectionByType", [y], { overlay: false }),
        P.api("feeCollectionByClass", [y], { overlay: false })
      ]).then(function (base) {
        var classes = base[0] || [], byTypeResult = base[1] || { rows: [], total: 0 }, byClassResult = base[2] || { rows: [], total: 0 };

        return Promise.all(classes.map(function (cls) {
          return P.api("feeGetFeeSheet", [y, cls], { overlay: false });
        })).then(function (sheets) {
          var assignedBy = {}, classRows = [], feeNames = {};

          sheets.forEach(function (d) {
            var clsAssigned = 0, rows = d.rows || [];
            rows.forEach(function (r) {
              var od = Number(r.oldDue) || 0;
              assignedBy.OLD_DUE = (assignedBy.OLD_DUE || 0) + od;
              clsAssigned += od;

              (d.feeTypes || []).forEach(function (t) {
                var amt = Number((r.fees || {})[t.code]) || 0;
                assignedBy[t.code] = (assignedBy[t.code] || 0) + amt;
                feeNames[t.code] = t.name;
                clsAssigned += amt;
              });
            });
            classRows.push({
              className: d.className || "",
              students: rows.length,
              assigned: clsAssigned
            });
          });

          var collectedBy = { OLD_DUE: 0 };
          (byTypeResult.rows || []).forEach(function (r) {
            var code = null;
            var nm = reportNameKey(r.feeType);
            if (nm === "OLDDUE") code = "OLD_DUE";
            else {
              Object.keys(feeNames).some(function (k) {
                if (reportNameKey(feeNames[k]) === nm) { code = k; return true; }
                return false;
              });
            }
            if (!code) code = "NAME:" + nm;
            collectedBy[code] = (collectedBy[code] || 0) + Number(r.amount || 0);
          });

          var feeRows = [];
          feeRows.push({
            code: "OLD_DUE",
            name: "Old Due",
            assigned: assignedBy.OLD_DUE || 0,
            collected: collectedBy.OLD_DUE || 0
          });

          Object.keys(feeNames).forEach(function (code) {
            feeRows.push({
              code: code,
              name: feeNames[code],
              assigned: assignedBy[code] || 0,
              collected: collectedBy[code] || 0
            });
          });

          feeRows = feeRows.filter(function (r) {
            return Math.abs(r.assigned) > 0.005 || Math.abs(r.collected) > 0.005;
          });

          feeRows.sort(function (a, b) {
            var aw = reportFeeWeight(a), bw = reportFeeWeight(b);
            return aw - bw || String(a.name || "").localeCompare(String(b.name || ""));
          });

          feeRows.forEach(function (r) {
            r.due = Math.max(0, Number(r.assigned) - Number(r.collected));
          });

          var classCollected = {};
          (byClassResult.rows || []).forEach(function (r) {
            classCollected[reportNameKey(r.className)] = Number(r.amount || 0);
          });

          classRows.forEach(function (r) {
            r.collected = classCollected[reportNameKey(r.className)] || 0;
            r.outstanding = Math.max(0, r.assigned - r.collected);
          });

          classRows.sort(function (a, b) { return gradeWeightLocal(a.className) - gradeWeightLocal(b.className); });

          var assigned = feeRows.reduce(function (s, r) { return s + r.assigned; }, 0);
          var collected = feeRows.reduce(function (s, r) { return s + r.collected; }, 0);
          var outstanding = feeRows.reduce(function (s, r) { return s + r.due; }, 0);

          REPORTS.totals = {
            year: y,
            feeRows: feeRows,
            classRows: classRows,
            assigned: assigned,
            collected: collected,
            outstanding: outstanding,
            byTypeTotal: Number(byTypeResult.total || collected),
            byClassTotal: Number(byClassResult.total || collected)
          };

          renderReportTotals(REPORTS.totals);
        });
      }).catch(function (e) {
        $("repTB").innerHTML = eb(e);
      });
    }

    function feeRowsLegacy(rows, mode) {
      return rows.map(function (r) {
        var value = mode === "due" ? r.due : r.collected;
        return '<tr><td><b>' + esc(r.name) + '</b></td><td class="r">' + reportMoney(value) + '</td></tr>';
      }).join("");
    }

    function renderReportTotals(d) {
      var feeBody = d.feeRows.map(function (r) {
        return '<tr>' +
          '<td><b>' + esc(r.name) + '</b></td>' +
          '<td class="r">' + reportMoney(r.assigned) + '</td>' +
          '<td class="r">' + reportMoney(r.collected) + '</td>' +
          '<td class="r"><b class="' + (r.due > 0 ? 'due' : 'ok') + '">' + reportMoney(r.due) + '</b></td>' +
        '</tr>';
      }).join("");

      var classBody = d.classRows.map(function (r) {
        return '<tr>' +
          '<td><b>' + esc(r.className) + '</b></td>' +
          '<td class="r">' + r.students + '</td>' +
          '<td class="r">' + reportMoney(r.assigned) + '</td>' +
          '<td class="r">' + reportMoney(r.collected) + '</td>' +
          '<td class="r"><b class="' + (r.outstanding > 0 ? 'due' : 'ok') + '">' + reportMoney(r.outstanding) + '</b></td>' +
        '</tr>';
      }).join("");

      $("repTB").innerHTML =
        '<div class="report-summary">' +
          tot(reportMoney(d.outstanding), "TOTAL DUES", d.outstanding > 0 ? "red" : "green") +
          tot(reportMoney(d.collected), "TOTAL RECEIVED", "green") +
          tot(reportMoney(d.assigned), "TOTAL ASSIGNED", "") +
        '</div>' +

        '<div class="report-two-col">' +
          '<section class="report-box legacy-box">' +
            '<div class="legacy-box-title">TOTAL DUES</div>' +
            '<div class="tw"><table class="tbl report-legacy-table"><tbody>' +
              feeRowsLegacy(d.feeRows, "due") +
              '<tr class="grand"><td><b>TOTAL DUES</b></td><td class="r"><b>' + reportMoney(d.outstanding) + '</b></td></tr>' +
            '</tbody></table></div>' +
          '</section>' +

          '<section class="report-box legacy-box">' +
            '<div class="legacy-box-title">TOTAL COLLECTION</div>' +
            '<div class="tw"><table class="tbl report-legacy-table"><tbody>' +
              feeRowsLegacy(d.feeRows, "collected") +
              '<tr class="grand"><td><b>TOTAL RECEIVED AMOUNT</b></td><td class="r"><b>' + reportMoney(d.collected) + '</b></td></tr>' +
            '</tbody></table></div>' +
          '</section>' +
        '</div>' +

        '<section class="report-box">' +
          '<div class="report-box-head"><div><span class="eyebrow">CLASS SUMMARY</span><h3>Class-wise Totals</h3><p>Students, assigned fees, received amount and remaining due.</p></div></div>' +
          '<div class="tw"><table class="tbl report-table"><thead><tr><th>Class</th><th class="r">Students</th><th class="r">Assigned</th><th class="r">Received</th><th class="r">Due</th></tr></thead><tbody>' +
            (classBody || '<tr><td colspan="5" class="mut">No class data.</td></tr>') +
          '</tbody></table></div>' +
        '</section>' +

        '';
    }

    function printReportTotals() {
      if (!REPORTS.totals) return toast("Load the totals report first.", "err");
      var d = REPORTS.totals;
      var rows = d.feeRows.map(function (r) {
        return '<tr><td>' + esc(r.name) + '</td><td class="amount">' + reportMoney(r.assigned) + '</td><td class="amount">' + reportMoney(r.collected) + '</td><td class="amount">' + reportMoney(r.due) + '</td></tr>';
      }).join("");
      var classRows = d.classRows.map(function (r) {
        return '<tr><td>' + esc(r.className) + '</td><td>' + r.students + '</td><td class="amount">' + reportMoney(r.assigned) + '</td><td class="amount">' + reportMoney(r.collected) + '</td><td class="amount">' + reportMoney(r.outstanding) + '</td></tr>';
      }).join("");
      var html =
        '<div class="print-logo"><img src="receipt-header-logo.png" alt="School logo" onerror="this.style.display=none"/></div>' +
        '<div class="print-title">FEE TOTALS REPORT</div><div class="print-meta">' + esc(d.year) + '</div>' +
        '<h3>Fee Type Totals</h3><table><thead><tr><th>Fee Type</th><th>Assigned</th><th>Received</th><th>Remaining Due</th></tr></thead><tbody>' +
        rows + '<tr><th>TOTAL</th><th class="amount">' + reportMoney(d.assigned) + '</th><th class="amount">' + reportMoney(d.collected) + '</th><th class="amount">' + reportMoney(d.outstanding) + '</th></tr></tbody></table>' +
        '<h3 style="margin-top:18px">Class-wise Totals</h3><table><thead><tr><th>Class</th><th>Students</th><th>Assigned</th><th>Received</th><th>Due</th></tr></thead><tbody>' +
        classRows + '</tbody></table><div class="print-foot">Printed on ' + esc(new Date().toLocaleString("en-IN")) + '</div>';
      printHtml("Fee Totals Report", html);
    }

    function reportChargeForType(py, feeType) {
      if (feeType === "ALL") {
        var due = Number(py.charged) || 0;
        var paid = Number(py.collected) || 0;
        var bal = Number(py.balance);
        if (!isFinite(bal)) bal = Math.max(0, due - paid);
        return { due: due, paid: paid, balance: Math.max(0, bal) };
      }

      var charges = py.charges || [];
      var c = charges.find(function (x) {
        return String(x.code || "") === String(feeType) ||
               (feeType === "OLD_DUE" && String(x.code || "") === "OLD_DUE");
      });
      if (!c) return { due: 0, paid: 0, balance: 0 };

      return {
        due: Number(c.assigned) || 0,
        paid: Number(c.paid) || 0,
        balance: Math.max(0, Number(c.balance) || 0)
      };
    }

    function loadClassReport() {
      var y = $("repCY").value, cls = $("repCClass").value, ft = $("repCFee").value;
      if (!cls) return toast("Pick a class.", "err");

      // Every new report request invalidates all older report requests.
      // This prevents a slow response from another class/year/fee type from
      // replacing the report the user currently selected.
      var requestId = ++REPORTS.classRequest;
      REPORTS.year = y;
      $("repCB").innerHTML = mt("Building class-wise report…");

      // Load the fee sheet and the authoritative class roster together.
      // feeGetStudents is the source that explicitly exposes the academic-year
      // roll_number. Do not rely only on the fee-sheet payload for ordering.
      Promise.all([
        P.api("feeGetFeeSheet", [y, cls], { overlay: false }),
        P.api("feeGetStudents", [y, cls], { overlay: false })
      ]).then(function (result) {
        var sheet = result[0] || {};
        var roster = result[1] || [];

        if (requestId !== REPORTS.classRequest ||
            $("repCY").value !== y ||
            $("repCClass").value !== cls ||
            $("repCFee").value !== ft) return;

        var rosterById = {};
        roster.forEach(function (x) {
          rosterById[String(x.id)] = x;
        });

        // Merge roll/status information from the academic-year roster into
        // the fee rows before sorting. This is the critical link that keeps
        // the report in actual roll-number order.
        var rows = (sheet.rows || []).map(function (r) {
          var rr = rosterById[String(r.id)] || {};
          var roll = rr.roll_number != null ? rr.roll_number :
                     (rr.rollNumber != null ? rr.rollNumber :
                     (r.roll_number != null ? r.roll_number :
                     (r.rollNumber != null ? r.rollNumber : r.rollNo)));

          var inactive = rr.left === true || rr.inactive === true ||
                         r.left === true || r.inactive === true;

          return Object.assign({}, r, {
            roll_number: roll,
            rollNumber: roll,
            rollNo: roll,
            inactive: inactive,
            left: inactive,
            status: rr.status || r.status || (inactive ? "Inactive" : "Active")
          });
        }).sort(feeStudentSort);
        if (!rows.length) {
          REPORTS.classData = { year: y, className: cls, feeType: ft, rows: [] };
          $("repCB").innerHTML = '<div class="empty"><i class="material-icons">group_off</i>No students in this class.</div>';
          return;
        }

        var jobs = rows.map(function (r) {
          return P.api("feeGetStatement", [r.id, [y]], { overlay: false }).then(function (st) {
            var py = (st.perYear || []).find(function (x) { return x.year === y; }) || {};
            var selected = reportChargeForType(py, ft);

            var history = (st.receipts || []).filter(function (p) {
              return p.status !== "Void" && (p.allocations || []).some(function (a) {
                return a.year === y && (ft === "ALL" || String(a.feeTypeCode || "") === String(ft));
              });
            }).map(function (p) {
              var allocAmount = (p.allocations || []).filter(function (a) {
                return a.year === y && (ft === "ALL" || String(a.feeTypeCode || "") === String(ft));
              }).reduce(function (s, a) { return s + (Number(a.amount) || 0); }, 0);
              return pretty(p.date) + ": " + reportMoney(allocAmount);
            }).filter(function (x) { return x.indexOf("₹0") === -1; });

            return {
              id: r.id,
              name: r.name,
              phone: st.student ? st.student.phone : "",
              rollNumber: r.roll_number != null ? r.roll_number : (r.rollNumber != null ? r.rollNumber : r.rollNo),
              status: studentStatus(r),
              inactive: studentIsInactive(r),
              totalDue: selected.due,
              totalPaid: selected.paid,
              remaining: selected.balance,
              history: history
            };
          });
        });

        return Promise.all(jobs).then(function (detailRows) {
          // The individual student statements can take several seconds.
          // Re-check the request before rendering so stale results are discarded.
          if (requestId !== REPORTS.classRequest ||
              $("repCY").value !== y ||
              $("repCClass").value !== cls ||
              $("repCFee").value !== ft) return;

          detailRows.sort(feeStudentSort);
          REPORTS.classData = { year: y, className: cls, feeType: ft, rows: detailRows };
          renderClassReport(REPORTS.classData);
        });
      }).catch(function (e) {
        if (requestId !== REPORTS.classRequest ||
            $("repCY").value !== y ||
            $("repCClass").value !== cls ||
            $("repCFee").value !== ft) return;
        $("repCB").innerHTML = eb(e);
      });
    }

    function reportFeeLabel(code) {
      if (code === "ALL") return "All Fee Types";
      if (code === "OLD_DUE") return "Old Due";
      var t = (BOOT.feeTypes || []).find(function (x) { return x.code === code; });
      return t ? t.name : code;
    }

    function renderClassReport(d) {
      var activeRows = d.rows.filter(function (r) { return !r.inactive; });
      var inactiveRows = d.rows.filter(function (r) { return r.inactive && Number(r.remaining) > 0.005; });
      var displayRows = activeRows.concat(inactiveRows);

      var totalDue = displayRows.reduce(function (s, r) { return s + Number(r.totalDue || 0); }, 0);
      var totalPaid = displayRows.reduce(function (s, r) { return s + Number(r.totalPaid || 0); }, 0);
      var totalRemaining = displayRows.reduce(function (s, r) { return s + Number(r.remaining || 0); }, 0);

      var body = displayRows.map(function (r) {
        var roll = !r.inactive && r.rollNumber != null ? String(r.rollNumber) : "—";
        var hist = r.history.length ? r.history.join("<br>") : '<span class="mut">No payments recorded</span>';
        return '<tr class="' + (r.inactive ? 'report-inactive-row' : '') + '">' +
          '<td class="report-roll">' + esc(roll) + '</td>' +
          '<td><b>' + esc(r.name) + '</b><span class="subline">' + esc(r.status) + '</span></td>' +
          '<td>' + esc(r.phone || "—") + '</td>' +
          '<td class="r">' + reportMoney(r.totalDue) + '</td>' +
          '<td class="r">' + reportMoney(r.totalPaid) + '</td>' +
          '<td class="r"><b class="' + (r.remaining > 0 ? 'due' : 'ok') + '">' + reportMoney(r.remaining) + '</b></td>' +
          '<td class="report-history">' + hist + '</td>' +
        '</tr>';
      }).join("");

      $("repCB").innerHTML =
        '<div class="report-summary">' +
          tot(String(displayRows.length), "Students shown", "") +
          tot(reportMoney(totalPaid), "Total Paid", "green") +
          tot(reportMoney(totalRemaining), "Remaining Due", totalRemaining > 0 ? "red" : "green") +
        '</div>' +
        '<div class="report-class-head"><div><span class="eyebrow">CLASS-WISE FEE REPORT</span><h3>' + esc(d.className) + ' · ' + esc(d.year) + '</h3><p>Fee Type: <b>' + esc(reportFeeLabel(d.feeType)) + '</b> · Active students keep roll order. Inactive students appear at the bottom only when an outstanding balance remains.</p></div><div class="report-legend"><span class="legend-active">Active</span><span class="legend-inactive">Inactive / Left</span></div></div>' +
        '<div class="report-table-wrap"><table class="tbl report-class-table"><thead><tr>' +
          '<th>Roll</th><th>Student</th><th>Contact</th><th class="r">Total Due</th><th class="r">Total Paid</th><th class="r">Remaining Due</th><th>Payment History</th>' +
        '</tr></thead><tbody>' +
          (body || '<tr><td colspan="7" class="mut">No students with reportable balances.</td></tr>') +
          '<tr class="grand"><td colspan="3"><b>TOTAL</b></td><td class="r"><b>' + reportMoney(totalDue) + '</b></td><td class="r"><b>' + reportMoney(totalPaid) + '</b></td><td class="r"><b>' + reportMoney(totalRemaining) + '</b></td><td></td></tr>' +
        '</tbody></table></div>';
    }

    function printClassReport() {
      if (!REPORTS.classData) return toast("Load a class report first.", "err");
      var d = REPORTS.classData;
      var rows = d.rows.filter(function (r) { return !r.inactive || Number(r.remaining) > 0.005; });
      var htmlRows = rows.map(function (r) {
        return '<tr><td>' + (!r.inactive && r.rollNumber != null ? esc(String(r.rollNumber)) : "—") +
          '</td><td><b>' + esc(r.name) + '</b><br><small>' + esc(r.status) + '</small></td>' +
          '<td>' + esc(r.phone || "—") + '</td><td class="amount">' + reportMoney(r.totalDue) +
          '</td><td class="amount">' + reportMoney(r.totalPaid) + '</td><td class="amount">' +
          reportMoney(r.remaining) + '</td><td>' + (r.history.length ? esc(r.history.join(" | ")) : "No payments") + '</td></tr>';
      }).join("");
      var totalDue = rows.reduce(function (s, r) { return s + Number(r.totalDue || 0); }, 0);
      var totalPaid = rows.reduce(function (s, r) { return s + Number(r.totalPaid || 0); }, 0);
      var totalRemaining = rows.reduce(function (s, r) { return s + Number(r.remaining || 0); }, 0);
      var html =
        '<div class="print-logo"><img src="receipt-header-logo.png" alt="School logo" onerror="this.style.display=none"/></div>' +
        '<div class="print-title">CLASS-WISE FEE REPORT</div><div class="print-meta">' + esc(d.className) + ' · ' + esc(d.year) + ' · ' + esc(reportFeeLabel(d.feeType)) + '</div>' +
        '<table><thead><tr><th>Roll</th><th>Student</th><th>Contact</th><th>Total Due</th><th>Total Paid</th><th>Remaining Due</th><th>Payment History</th></tr></thead><tbody>' +
        htmlRows + '<tr><th colspan="3">TOTAL</th><th class="amount">' + reportMoney(totalDue) + '</th><th class="amount">' +
        reportMoney(totalPaid) + '</th><th class="amount">' + reportMoney(totalRemaining) + '</th><th></th></tr>' +
        '</tbody></table><div class="print-foot">Printed on ' + esc(new Date().toLocaleString("en-IN")) + '</div>';
      printHtml("Class-wise Fee Report", html);
    }

    function csvCell(v) {
      return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    }

    function downloadCsv(filename, rows) {
      var csv = rows.map(function (r) { return r.map(csvCell).join(","); }).join("\r\n");
      var blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 100);
    }

    function exportReportTotals() {
      if (!REPORTS.totals) return toast("Load the totals report first.", "err");
      var d = REPORTS.totals, rows = [["Fee Type", "Assigned", "Received", "Remaining Due"]];
      d.feeRows.forEach(function (r) { rows.push([r.name, r.assigned, r.collected, r.due]); });
      rows.push(["TOTAL", d.assigned, d.collected, d.outstanding]);
      rows.push([]);
      rows.push(["CLASS", "STUDENTS", "ASSIGNED", "RECEIVED", "OUTSTANDING"]);
      d.classRows.forEach(function (r) { rows.push([r.className, r.students, r.assigned, r.collected, r.outstanding]); });
      downloadCsv("fee-totals-" + d.year + ".csv", rows);
    }

    function exportClassReport() {
      if (!REPORTS.classData) return toast("Load a class report first.", "err");
      var d = REPORTS.classData;
      var rows = [["Roll", "Student", "Status", "Contact", "Total Due", "Total Paid", "Remaining Due", "Payment History"]];
      d.rows.filter(function (r) { return !r.inactive || Number(r.remaining) > 0.005; }).forEach(function (r) {
        rows.push([
          !r.inactive && r.rollNumber != null ? r.rollNumber : "",
          r.name, r.status, r.phone,
          r.totalDue, r.totalPaid, r.remaining, r.history.join(" | ")
        ]);
      });
      downloadCsv("class-wise-fee-report-" + d.className.replace(/\s+/g, "-") + "-" + d.year + "-" + d.feeType + ".csv", rows);
    }

    /* ======================= COLLECTIONS ======================= */
    function mountCollections() {
      var d = new Date(), isoToday = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      $("pCollections").innerHTML =
        '<div class="page-card">' +
          '<div class="page-card-head"><div><span class="eyebrow">DAILY COLLECTIONS</span><h2><i class="material-icons">payments</i> Date-wise Payments</h2><p>Select a date to see every collection, grouped in school class order.</p></div><div class="date-badge"><i class="material-icons">event</i><span id="colDateLabel">' + esc(pretty(isoToday)) + '</span></div></div>' +
          '<div class="filter-grid">' +
            selc("event", "Collection Date", '<input id="colDate" class="in" type="date" value="' + isoToday + '"/>') +
            selc("school", "Section", '<select id="colSection" class="in"><option value="ALL" selected>All Classes</option><option value="PRIMARY">Primary · Nursery–Grade 5</option><option value="HS">High School · Grades 6–10</option></select>') +
          '</div>' +
          '<div id="colB"><div class="empty"><i class="material-icons">event_available</i>Loading collections…</div></div>' +
        '</div>';
      $("colDate").onchange = loadCollections; $("colSection").onchange = loadCollections; loadCollections();
    }
    function classBand(cls) {
      var k = String(cls || "").toUpperCase().replace(/\s+/g, "");
      if (k === "NURSERY" || k === "LKG" || k === "UKG") return "PRIMARY";
      var m = k.match(/\d+/); if (m) return Number(m[0]) <= 5 ? "PRIMARY" : "HS";
      return "OTHER";
    }
    function gradeWeightLocal(n) {
      var k = String(n || "").toUpperCase().replace(/\s+/g, "");
      if (k === "NURSERY") return 1; if (k === "LKG") return 2; if (k === "UKG") return 3;
      var m = k.match(/\d+/); return m ? 100 + Number(m[0]) : 999;
    }

    /* ======================= STUDENT ORDERING ======================= */
    function studentRoll(x) {
      var v = x && (x.roll_number != null ? x.roll_number : (x.rollNumber != null ? x.rollNumber : (x.rollNo != null ? x.rollNo : x.roll)));
      var n = Number(v);
      return isFinite(n) && n > 0 ? n : null;
    }

    function studentIsInactive(x) {
      if (!x) return false;
      if (x.is_active === false || x.active === false || x.left === true) return true;
      if (x.leaving_date || x.leavingDate) return true;
      var s = String(x.status || x.studentStatus || x.enrollmentStatus || "").trim().toLowerCase();
      if (!s) return false;
      return ["left", "inactive", "passed", "passed out", "passed-out", "alumni", "transferred", "withdrawn", "withdrawal", "tc issued", "tc"].indexOf(s) !== -1;
    }

    function studentStatus(x) {
      if (!studentIsInactive(x)) return "Active";
      var s = String(x.status || x.studentStatus || x.enrollmentStatus || "").trim();
      if (s) return s;
      if (x.leaving_reason) return String(x.leaving_reason);
      if (x.leavingReason) return String(x.leavingReason);
      return x.passedOut ? "Passed Out" : (x.left ? "Left" : "Inactive");
    }

    function feeStudentSort(a, b) {
      var ai = studentIsInactive(a) ? 1 : 0, bi = studentIsInactive(b) ? 1 : 0;
      if (ai !== bi) return ai - bi;

      var ar = studentRoll(a), br = studentRoll(b);
      if (ar !== null && br !== null && ar !== br) return ar - br;
      if (ar !== null && br === null) return -1;
      if (ar === null && br !== null) return 1;

      return String(a && a.name || "").localeCompare(String(b && b.name || ""), undefined, { sensitivity: "base" });
    }

    function feeStudentCell(x) {
      var inactive = studentIsInactive(x), roll = studentRoll(x), status = studentStatus(x);
      var rollHtml = !inactive && roll !== null ? '<span class="fs-roll">' + esc(String(roll)) + '</span>' : '';
      var statusClass = inactive ? ' inactive' : ' active';
      return '<td class="stn fs-student">' +
        '<div class="fs-student-main">' + rollHtml + '<div class="fs-student-copy"><b>' + esc(x.name) + '</b><span class="fs-student-status' + statusClass + '">' + esc(status) + '</span></div></div>' +
        '</td>';
    }

    function feeStudentInline(x) {
      var inactive = studentIsInactive(x), roll = studentRoll(x), status = studentStatus(x);
      return (!inactive && roll !== null ? '<span class="fs-roll fs-roll-sm">' + esc(String(roll)) + '</span> ' : '') +
        '<b>' + esc(x.name) + '</b><span class="subline">' + esc(status) + '</span>';
    }
    function loadCollections() {
      var date = $("colDate").value, section = $("colSection").value; if (!date) return;
      $("colDateLabel").textContent = pretty(date); $("colB").innerHTML = mt("Loading collections…");
      P.api("feeDailyCollection", [date, YEAR], { overlay: false }).then(function (r) {
        var rows = (r.rows || []).filter(function (x) { return section === "ALL" || classBand(x.className) === section; })
          .sort(function (a, b) { return gradeWeightLocal(a.className) - gradeWeightLocal(b.className) || feeStudentSort(a, b); });
        renderCollections(r, rows);
      }).catch(function (e) { $("colB").innerHTML = eb(e); });
    }
    function renderCollections(r, rows) {
      var total = rows.reduce(function (s, x) { return s + Number(x.amount || 0); }, 0), classes = {};
      rows.forEach(function (x) { (classes[x.className || "Unknown"] = classes[x.className || "Unknown"] || []).push(x); });
      var order = Object.keys(classes).sort(function (a, b) { return gradeWeightLocal(a) - gradeWeightLocal(b); });
      var groups = order.map(function (c) {
        var list = classes[c], sub = list.reduce(function (s, x) { return s + Number(x.amount || 0); }, 0);
        return '<section class="collection-group"><div class="collection-group-head"><div><span class="class-pill">' + esc(c || "Unknown") + '</span><span class="collection-count">' + list.length + ' payment' + (list.length === 1 ? '' : 's') + '</span></div><strong>' + money(sub) + '</strong></div>' +
          '<div class="tw"><table class="tbl collection-table"><thead><tr><th>Student</th><th>Receipt</th><th>Mode</th><th class="r">Amount</th></tr></thead><tbody>' +
          list.map(function (x) { return '<tr><td>' + feeStudentInline(x) + '</td><td>' + esc(x.receiptId) + '</td><td>' + esc(x.mode || "") + '</td><td class="r"><b>' + money(x.amount) + '</b></td></tr>'; }).join("") +
          '</tbody></table></div></section>';
      }).join("");
      var modeTotals = {};
      rows.forEach(function (x) { modeTotals[x.mode] = (modeTotals[x.mode] || 0) + Number(x.amount || 0); });
      var modes = Object.keys(modeTotals).map(function (m) { return '<span class="mode-chip">' + esc(m) + ' <b>' + money(modeTotals[m]) + '</b></span>'; }).join("");
      $("colB").innerHTML = '<div class="collection-summary">' + tot(money(total), "Collected on " + pretty(r.date), "green") + tot(String(rows.length), "Payments", "") + '<div class="mode-list">' + (modes || '<span class="mut">No payments for this filter.</span>') + '</div></div>' +
        (rows.length ? groups : '<div class="empty"><i class="material-icons">payments</i>No payments found for ' + esc(pretty(r.date)) + ' in this section.</div>');
    }

    /* ======================= PARENT MESSAGES ======================= */
    function mountMessages() {
      var types = '<option value="ALL">All Pending Dues</option>' + (BOOT.feeTypes || []).filter(function (t) { return t.code !== "OLD_DUE"; }).map(function (t) { return '<option value="' + esc(t.code) + '">' + esc(t.name) + '</option>'; }).join("") + '<option value="OLD_DUE">Old Due</option>';
      $("pMessages").innerHTML =
        '<div class="page-card"><div class="page-card-head"><div><span class="eyebrow">PARENT FOLLOW-UP</span><h2><i class="material-icons">chat</i> Generate WhatsApp Messages</h2><p>Find students with pending dues and open the message directly in WhatsApp Desktop.</p></div><div class="message-stat"><i class="material-icons">forum</i><span>WhatsApp Desktop</span></div></div>' +
        '<div class="filter-grid message-filters">' +
          selc("groups", "Class / Section", '<select id="msgClass" class="in"><option value="ALL" selected>All Classes</option><option value="PRIMARY">Primary · Nursery–Grade 5</option><option value="HS">High School · Grades 6–10</option></select>') +
          selc("payments", "Fee Head", '<select id="msgFeeType" class="in">' + types + '</select>') +
        '</div><div class="message-actions"><button class="btn btn-maroon" id="msgLoad"><i class="material-icons">refresh</i> Generate Messages</button><button class="btn btn-outline" id="msgPrint"><i class="material-icons">print</i> Print Call Sheet</button></div>' +
        '<div id="msgB"><div class="empty"><i class="material-icons">chat</i>Choose a section and generate the parent follow-up list.</div></div></div>';
      $("msgLoad").onclick = loadMessages; $("msgPrint").onclick = printCallSheet;
    }
    function loadMessages() {
      var cls = $("msgClass").value, ft = $("msgFeeType").value;
      $("msgB").innerHTML = mt("Preparing parent follow-up list…");
      P.api("feeDuesCallList", [YEAR, cls, ft], { overlay: false }).then(function (r) {
        var rows = (r.rows || []).filter(function (x) { return cls === "ALL" || (cls === "PRIMARY" ? classBand(x.className) === "PRIMARY" : classBand(x.className) === "HS"); })
          .sort(function (a, b) { return gradeWeightLocal(a.className) - gradeWeightLocal(b.className) || feeStudentSort(a, b); });
        window._feeMessageRows = rows; renderMessages(rows, ft);
      }).catch(function (e) { $("msgB").innerHTML = eb(e); });
    }
    function waText(row, feeLabel) {
      return encodeURIComponent("Dear Parent,\nYour child " + row.name + " has a pending " + feeLabel + " of Rs. " + Number(row.outstanding || 0).toLocaleString("en-IN") + ". Please clear it at the earliest.\n\n- PRINCIPAL,\nSAPTHAGIRI SCHOOL.");
    }
    function waLink(phone, text) {
      var digits = String(phone || "").replace(/\D/g, ""); if (digits.length === 10) digits = "91" + digits;
      return "whatsapp://send?phone=" + digits + "&text=" + text;
    }
    function renderMessages(rows, ft) {
      var feeLabel = ft === "ALL" ? "pending fee dues" : ((BOOT.feeTypes || []).find(function (x) { return x.code === ft; }) || { name: ft === "OLD_DUE" ? "Old Due" : ft }).name;
      var total = rows.reduce(function (s, x) { return s + Number(x.outstanding || 0); }, 0);
      var body = rows.map(function (x) {
        return '<tr><td>' + feeStudentInline(x) + '</td><td><span class="class-pill small">' + esc(x.className || "—") + '</span></td><td>' + esc(x.phone || "No number") + '</td><td class="r"><b class="due">' + money(x.outstanding) + '</b></td><td>' + (x.phone ? '<a class="wa-send" href="' + esc(waLink(x.phone, waText(x, feeLabel))) + '"><i class="material-icons">send</i> Send</a>' : '<span class="mut">No number</span>') + '</td></tr>';
      }).join("");
      $("msgB").innerHTML = '<div class="message-overview">' + tot(String(rows.length), "Parents to contact", "") + tot(money(total), "Pending amount", "red") + '<div class="message-hint"><i class="material-icons">open_in_new</i> Send opens WhatsApp Desktop.</div></div>' +
        (rows.length ? '<div class="tw"><table class="tbl message-table"><thead><tr><th>Student</th><th>Class</th><th>Contact</th><th class="r">Pending</th><th>WhatsApp</th></tr></thead><tbody>' + body + '</tbody></table></div>' : '<div class="empty"><i class="material-icons">check_circle</i>No pending dues found for this selection.</div>');
    }
    function printCallSheet() {
      var rows = window._feeMessageRows || []; if (!rows.length) return toast("Generate the pending list first.", "err");
      var feeLabel = $("msgFeeType").selectedOptions[0] ? $("msgFeeType").selectedOptions[0].text : "Pending Dues";
      var html = '<div class="print-logo"><img src="receipt-header-logo.png" alt="School logo" onerror="this.style.display=none"/></div><div class="print-title">PARENT CALL SHEET</div><div class="print-meta">' + esc(YEAR) + ' · ' + esc($("msgClass").selectedOptions[0].text) + ' · ' + esc(feeLabel) + '</div><table><thead><tr><th>Class</th><th>Student</th><th>Contact</th><th>Last Paid</th><th>Pending</th><th>Call Notes</th></tr></thead><tbody>' +
        rows.map(function (x) { return '<tr><td>' + esc(x.className || "") + '</td><td>' + (!studentIsInactive(x) && studentRoll(x) !== null ? '<b>' + esc(String(studentRoll(x))) + '. </b>' : '') + '<b>' + esc(x.name) + '</b><br><small>' + esc(studentStatus(x)) + '</small></td><td>' + esc(x.phone || "—") + '</td><td>' + esc(x.lastPaidDate ? pretty(x.lastPaidDate) + " · " + money(x.lastPaidAmount) : "No payment") + '</td><td class="amount">' + money(x.outstanding) + '</td><td></td></tr>'; }).join("") +
        '</tbody></table><div class="print-foot">Printed on ' + esc(new Date().toLocaleString("en-IN")) + '</div>';
      printHtml("Parent Call Sheet", html);
    }
    function printHtml(title, body) {
      var w = window.open("", "_blank"); if (!w) return toast("Allow pop-ups to print.", "err");
      w.document.write('<html><head><title>' + esc(title) + '</title><style>@page{size:A4;margin:12mm}body{font-family:Segoe UI,Arial,sans-serif;color:#172033;margin:0}.print-logo{text-align:center;border-bottom:1.5px solid #8a1618;padding-bottom:8px;margin-bottom:10px}.print-logo img{width:100%;max-height:78px;object-fit:contain}.print-title{text-align:center;font-size:15px;font-weight:800;color:#8a1618;letter-spacing:1px}.print-meta{text-align:center;color:#64748b;font-size:11px;margin:4px 0 12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #cbd5e1;padding:6px 7px;font-size:10.5px;vertical-align:top}th{background:#f7eeee;color:#8a1618;text-transform:uppercase;font-size:9.5px;letter-spacing:.4px}.amount{text-align:right;font-weight:800}.print-foot{margin-top:10px;text-align:center;color:#64748b;font-size:9px}small{color:#64748b}</style></head><body>' + body + '</body></html>');
      w.document.close(); w.focus(); setTimeout(function () { w.print(); }, 300);
    }

    /* ======================= TOOLS ======================= */
    function mountTools() {
      $("pTools").innerHTML =
        '<div class="tools-grid">' +
          '<div class="tool-card tool-primary"><div class="tool-icon"><i class="material-icons">account_balance</i></div><span class="eyebrow">YEAR OPENING</span><h3>Assign 2026–27 Old Due</h3><p>Calculate each student’s 2025–26 closing arrear and create the fixed 2026–27 Old Due assignment.</p><button class="btn btn-maroon" id="tCarryOldDue"><i class="material-icons">sync</i> Assign Old Due</button><div id="tCarryOldDueO"></div></div>' +
          '<div class="tool-card"><div class="tool-icon soft"><i class="material-icons">sync</i></div><span class="eyebrow">STUDENT DATA</span><h3>Refresh Student Data</h3><p>Student Management remains the source of truth for names, classes, promotions, admissions and leaving records.</p><button class="btn btn-outline" id="tRefreshStudents"><i class="material-icons">refresh</i> Refresh Data</button><div id="tRefreshStudentsO"></div></div>' +
          '<div class="tool-card"><div class="tool-icon soft"><i class="material-icons">category</i></div><span class="eyebrow">FEE CONFIGURATION</span><h3>Add Fee Type</h3><p>Add a new fee head without changing the existing ledger structure.</p><div class="r2">' + fl("Name", ip("tyN", "", "e.g. Hostel Fee")) + fl("Code", ip("tyC", "", "e.g. HOSTEL")) + '</div><div class="r2">' + fl("Kind", '<select id="tyK" class="in"><option value="other">Other</option><option value="tuition">Tuition-like</option><option value="transport">Transport-like</option><option value="studyMaterials">Study Materials-like</option><option value="misc">Misc-like</option></select>') + fl("Sort", ip("tyS", "25")) + '</div><button class="btn btn-maroon" id="tyA"><i class="material-icons">add</i> Add Fee Type</button></div>' +
          '<div class="tool-card"><div class="tool-icon soft"><i class="material-icons">password</i></div><span class="eyebrow">SECURITY</span><h3>Module Password</h3><p>Change the password used to unlock Fee Management.</p>' + fl("New Module Password", ip("stP", "", "Enter new password")) + '<button class="btn btn-outline" id="stPB"><i class="material-icons">lock_reset</i> Update Password</button></div>' +
        '</div><div class="tool-note"><i class="material-icons">info</i><div><b>Protected controls</b><span>Academic year, opening year and student ID are controlled by their source systems and are intentionally not editable here.</span></div></div>';

      $("tRefreshStudents").onclick = function () {
        $("tRefreshStudentsO").innerHTML = '<div class="rsum">Refreshing live student data…</div>';
        P.api("feeBootstrap", [], { overlay: false }).then(function (b) {
          BOOT = b; YEAR = b.currentYear; $("tRefreshStudentsO").innerHTML = '<div class="rsum">Student data is live and refreshed.</div>';
          if ($("lCl")) classes("lCl");
          if ($("cCl")) {
            var cy = $("cY") ? $("cY").value : YEAR, cs = $("cCl"); cs.innerHTML = '<option>Loading…</option>';
            P.api("feeGetClasses", [cy], { overlay: false }).then(function (list) { cs.innerHTML = '<option value="">Select class…</option>' + (list || []).map(function (c) { return '<option>' + esc(c) + '</option>'; }).join(""); });
          }
        }).catch(function (e) { $("tRefreshStudentsO").innerHTML = eb(e); });
      };
      $("tyA").onclick = function () { var name = $("tyN").value.trim(), code = $("tyC").value.trim(); if (!name || !code) return toast("Name & code required.", "err"); P.api("feeAddFeeType", [{ name: name, code: code, kind: $("tyK").value, sort: Number($("tyS").value) || 25 }], { text: "Adding…" }).then(function () { toast("Added.", "ok"); P.api("feeBootstrap", [], { overlay: false }).then(function (b) { BOOT = b; }); }).catch(function (e) { toast(e.message || e, "err"); }); };
      $("stPB").onclick = function () { var pw = $("stP").value.trim(); if (!pw) return toast("Enter password.", "err"); P.api("feeSetPassword", [pw], { text: "Updating…" }).then(function () { toast("Password updated.", "ok"); $("stP").value = ""; }).catch(function (e) { toast(e.message || e, "err"); }); };
      $("tCarryOldDue").onclick = function () {
        if (!confirm("This will calculate the 2025-26 closing balance for every student and save it as their 2026-27 Old Due assignment.\n\nExisting imported 2026-27 Old Due values will be replaced.\n\nContinue?")) return;
        var b = $("tCarryOldDue"), out = $("tCarryOldDueO"); b.disabled = true; b.innerHTML = '<i class="material-icons">sync</i> Assigning…';
        out.innerHTML = '<div class="rsum">Calculating 2025-26 closing balances and creating 2026-27 assignments…</div>';
        P.api("feeAssignCarryForwardOldDue", ["2026-27", ME], { text: "Assigning Old Due…" }).then(function (r) {
          if (!r.success) { out.innerHTML = '<div class="rsum">Completed with ' + (r.errors || []).length + ' error(s). Assigned ' + r.assigned + ' students.</div>'; if (r.errors && r.errors.length) console.error("Old Due assignment errors:", r.errors); toast("Old Due assignment completed with errors.", "err"); return; }
          out.innerHTML = '<div class="rsum">Done. ' + r.assigned + ' students assigned.</div>'; toast("2026-27 Old Due assignments created successfully.", "ok");
        }).catch(function (e) { out.innerHTML = eb(e); toast(e.message || e, "err"); }).finally(function () { b.disabled = false; b.innerHTML = '<i class="material-icons">sync</i> Assign Old Due'; });
      };
    }

    /* ---- Shared UI Helpers ---- */
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
    function yearOptions() {
      var ys = (L.perYear || []).map(function (y) { return y.year; }).sort(function (a, b) { return a < b ? 1 : -1; });
      if (!ys.length) ys = [YEAR];
      return ys.map(function (y) { return '<option value="' + esc(y) + '"' + (y === L.yview ? ' selected' : '') + '>' + esc(y) + '</option>'; }).join("");
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
        ".subt{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:14px}.subt button{border:1px solid var(--border);background:#fff;color:var(--text-muted);font-weight:700;font-size:12px;padding:7px 11px;border-radius:999px;cursor:pointer;display:inline-flex;align-items:center;gap:5px}.subt button i{font-size:15px}.subt button.active{background:var(--maroon);color:#fff;border-color:var(--maroon)}" +
        ".bar{background:#fff;border:1px solid var(--border);border-radius:16px;padding:14px;box-shadow:var(--shadow-sm);margin-bottom:14px}.srch{display:flex;align-items:center;gap:8px;background:#f8fafc;border:1px solid var(--border);border-radius:12px;padding:9px 12px}.srch i{color:var(--maroon)}.srch input{flex:1;border:none;background:transparent;font:inherit;font-size:15px;outline:none}.clr{border:none;background:#e2e8f0;color:#475569;border-radius:50%;width:24px;height:24px;cursor:pointer;font-size:16px;line-height:1}" +
        ".res{margin-top:6px}.row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 12px;border:1px solid var(--border);border-radius:10px;margin-top:6px;cursor:pointer;background:#fff}.row:hover{background:var(--primary-light);border-color:var(--maroon)}.rm b{font-size:14px}.rm span{display:block;font-size:11px;color:var(--text-muted)}.due{font-size:12px;font-weight:700;color:#dc2626}.ok{font-size:12px;font-weight:700;color:#059669}.rld,.rem{padding:10px;color:var(--text-muted);font-size:13px;font-weight:600}" +
        ".or{text-align:center;margin:12px 0 8px;position:relative}.or span{background:#fff;padding:0 10px;color:var(--text-muted);font-size:11.5px;font-weight:700;position:relative;z-index:1}.or:before{content:'';position:absolute;left:0;right:0;top:50%;height:1px;background:var(--border)}" +
        ".pick,.tbar{display:flex;flex-wrap:wrap;gap:12px}.ssel{flex:1 1 200px;display:flex;flex-direction:column;gap:4px}.tbar{margin-bottom:14px}.lb{font-size:12px;font-weight:700;color:var(--text-muted);display:flex;align-items:center;gap:5px}.lb i{font-size:15px}" +
        ".in{width:100%;padding:9px 11px;border:1px solid var(--border);border-radius:10px;font:inherit;background:#fff}.big{font-size:20px;font-weight:800;color:var(--maroon)}.fld{display:flex;flex-direction:column;gap:4px;margin-bottom:10px}.r2{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media(max-width:520px){.r2{grid-template-columns:1fr}}" +
        ".empty{text-align:center;padding:38px 20px;color:var(--text-muted);font-weight:600;background:#fff;border:1px dashed var(--border);border-radius:14px}.empty i{font-size:38px;color:var(--maroon);display:block;margin-bottom:8px}" +
        ".sbar{background:var(--primary-light);border:1px solid var(--border);border-radius:14px;padding:14px 18px}.sn{font-weight:800;font-size:17px;color:var(--maroon)}.sm{font-size:13px;color:var(--text-muted);margin-top:2px}" +
        ".year-strip{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 14px}.year-strip-label{font-size:11px;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;width:100%;margin-bottom:-2px}.yc{border:1px solid var(--border);background:#fff;border-radius:11px;padding:8px 12px;cursor:pointer;display:flex;align-items:center;gap:9px;font:inherit;color:var(--text-main);min-width:130px;justify-content:space-between}.yc span{font-size:12px;font-weight:800}.yc em{font-style:normal;font-size:12px;font-weight:800;color:#64748b}.yc.due em{color:#dc2626}.yc.active{background:var(--maroon);border-color:var(--maroon);color:#fff}.yc.active em{color:#fff}" +
        ".actbar{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;margin:14px 0}.actbar .ssel{flex:0 0 200px}.acts{display:flex;gap:8px;margin-left:auto}" +
        ".acc{background:#fff;border:1px solid var(--border);border-radius:16px;padding:16px 18px;box-shadow:var(--shadow-sm)}" +
        ".tots{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px}.to{flex:1 1 130px;background:#f8fafc;border:1px solid var(--border);border-radius:12px;padding:12px}.tv{display:block;font-size:19px;font-weight:800}.tl{font-size:11px;color:var(--text-muted);font-weight:700}.to.green .tv{color:#059669}.to.red .tv{color:#dc2626}.to.amber .tv{color:#d97706}" +
        ".tw{overflow:auto;border:1px solid var(--border);border-radius:12px;margin-bottom:6px}.tbl{width:100%;border-collapse:collapse}.tbl th,.tbl td{padding:9px 11px;font-size:13px;text-align:left;border-bottom:1px solid #f1f2f6}.tbl th{background:#faf5f5;color:var(--maroon);font-size:11.5px;text-transform:uppercase;letter-spacing:.3px}.tbl td.r,.tbl th.r{text-align:right}.void{opacity:.55}.mut{color:#94a3b8}.tbl tbody tr:nth-child(even) td{background:#fcfbfb}.grand td{font-weight:800;background:#faf5f5}" +
        ".mini-edit{border:none;background:#f1f5f9;color:var(--maroon);border-radius:6px;padding:3px 6px;cursor:pointer;margin-left:6px;vertical-align:middle}.mini-edit:hover{background:var(--primary-light)}" +
        ".catyear{margin-bottom:14px}.catyh{font-size:12px;font-weight:800;color:var(--maroon);margin:10px 0 6px;text-transform:uppercase;letter-spacing:.4px}.sh{font-size:14px;font-weight:800;color:var(--maroon);margin:16px 0 8px;display:flex;align-items:center;gap:6px}.sh i{font-size:18px}" +
        ".btn{border:none;border-radius:10px;padding:10px 16px;font-weight:700;font-size:13.5px;cursor:pointer;display:inline-flex;align-items:center;gap:6px}.btn-maroon{background:var(--maroon);color:#fff}.btn-outline{background:#fff;border:1px solid var(--border);color:var(--text-main)}.btn-sm{padding:7px 12px;font-size:12.5px}.mini{border:1px solid var(--border);background:#fff;border-radius:8px;padding:5px 8px;cursor:pointer;display:inline-flex;align-items:center}" +
        ".fin-gate{max-width:360px;margin:40px auto;text-align:center;background:#fff;border:1px solid var(--border);border-radius:16px;padding:28px}.fin-gate i{font-size:40px;color:var(--maroon)}.fin-gate h3{color:var(--maroon);margin:8px 0}.fin-gate p{color:var(--text-muted);font-size:13px}.fin-gate input{width:100%;margin:12px 0;padding:10px;border:1px solid var(--border);border-radius:10px}.fin-err{color:#dc2626;font-weight:600;font-size:13px;margin-top:8px}" +
        ".mdl{position:fixed;inset:0;background:rgba(15,23,42,.45);display:none;align-items:center;justify-content:center;z-index:9999;padding:16px}.mdl.show{display:flex}.mc{background:#fff;border-radius:16px;max-width:600px;width:100%;max-height:90vh;display:flex;flex-direction:column}.mh{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid var(--border);font-weight:700}.mh button{border:none;background:none;font-size:24px;cursor:pointer;line-height:1}.mb{padding:18px;overflow:auto}.mf{display:flex;justify-content:flex-end;gap:8px;padding:14px 18px;border-top:1px solid var(--border)}" +
        "#ft{position:fixed;left:50%;bottom:22px;transform:translateX(-50%) translateY(20px);z-index:99999;background:#14171f;color:#fff;padding:12px 18px;border-radius:12px;font-size:14px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.25);display:flex;align-items:center;gap:8px;opacity:0;pointer-events:none;transition:all .25s;max-width:88vw}#ft.show{opacity:1;transform:translateX(-50%) translateY(0)}#ft.ok{background:#065f46}#ft.err{background:#991b1b}" +
        ".fin-head{margin:0 0 18px}.fin-brand{display:flex;align-items:center;gap:12px}.fin-brand-mark{width:42px;height:42px;border-radius:13px;background:var(--maroon);color:#fff;display:grid;place-items:center;box-shadow:0 8px 20px rgba(138,22,24,.18)}.fin-brand-mark i{font-size:22px}.fin-title{font-size:26px;letter-spacing:-.4px;margin:3px 0}.fin-sub{font-size:13px;margin:0;color:var(--text-muted)}.fin-tabs{display:flex;width:100%;gap:4px;padding:5px;background:#fff;border:1px solid var(--border);border-radius:14px;box-shadow:0 5px 18px rgba(15,23,42,.05);margin-bottom:18px}.fin-tabs button{flex:1;justify-content:center;border-radius:10px;padding:10px 12px}.fin-tabs button.active{box-shadow:0 5px 14px rgba(138,22,24,.18)}" +
                 ".page-card{background:#fff;border:1px solid var(--border);border-radius:20px;padding:20px;box-shadow:0 8px 28px rgba(15,23,42,.06)}.page-card-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:18px}.page-card-head h2{margin:3px 0 5px;font-size:20px;color:#1f2937;letter-spacing:-.2px;display:flex;align-items:center;gap:8px}.page-card-head h2 i{color:var(--maroon);font-size:21px}.page-card-head p{margin:0;color:var(--text-muted);font-size:12.5px}.eyebrow{font-size:10px;font-weight:800;letter-spacing:1.1px;color:var(--maroon)}.date-badge,.message-stat{display:flex;align-items:center;gap:7px;padding:9px 12px;border-radius:11px;background:#faf5f5;color:var(--maroon);font-size:12px;font-weight:800;white-space:nowrap}.date-badge i,.message-stat i{font-size:17px}.filter-grid{display:grid;grid-template-columns:minmax(220px,1fr) minmax(240px,1fr);gap:12px;padding:14px;background:#f8fafc;border:1px solid #edf0f4;border-radius:14px;margin-bottom:16px}.message-filters{grid-template-columns:1fr 1fr}.collection-summary,.message-overview{display:grid;grid-template-columns:1fr 150px 1.4fr;gap:10px;margin-bottom:15px}.message-overview{grid-template-columns:1fr 1fr 1.6fr}.collection-summary .to,.message-overview .to{margin:0}.mode-list,.message-hint{display:flex;align-items:center;gap:6px;flex-wrap:wrap;background:#f8fafc;border:1px solid var(--border);border-radius:12px;padding:10px 12px;color:var(--text-muted);font-size:11px}.mode-chip{background:#fff;border:1px solid var(--border);border-radius:999px;padding:5px 8px;font-size:10.5px}.mode-chip b{color:#1f2937}.collection-group{margin:0 0 14px}.collection-group-head{display:flex;justify-content:space-between;align-items:center;padding:8px 3px}.class-pill{display:inline-flex;align-items:center;padding:4px 9px;border-radius:999px;background:#f7eeee;color:var(--maroon);font-weight:800;font-size:11px}.class-pill.small{font-size:10px}.collection-count{font-size:10px;color:var(--text-muted);margin-left:7px}.collection-table td{padding:10px 11px}.subline{display:block;color:#94a3b8;font-size:10px;margin-top:2px}.message-actions{display:flex;gap:8px;margin-bottom:14px}.message-table td{padding:10px 11px}.wa-send{display:inline-flex;align-items:center;gap:5px;text-decoration:none;background:#166534;color:#fff;border-radius:8px;padding:7px 10px;font-size:11px;font-weight:800}.wa-send i{font-size:15px}.tool-note{display:flex;align-items:flex-start;gap:10px;margin-top:14px;padding:12px 14px;border:1px solid var(--border);border-radius:13px;background:#f8fafc;color:#64748b;font-size:11.5px}.tool-note i{color:var(--maroon)}.tool-note b{display:block;color:#334155;margin-bottom:2px}.tools-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.tool-card{background:#fff;border:1px solid var(--border);border-radius:18px;padding:18px;box-shadow:0 7px 22px rgba(15,23,42,.05)}.tool-card h3{margin:5px 0 7px;font-size:17px;color:#202638}.tool-card p{font-size:12px;line-height:1.55;color:var(--text-muted);margin:0 0 14px}.tool-primary{border-color:#e7c8c8;box-shadow:0 10px 28px rgba(138,22,24,.08)}.tool-icon{width:38px;height:38px;border-radius:11px;background:var(--maroon);color:#fff;display:grid;place-items:center;margin-bottom:12px}.tool-icon.soft{background:#faf0f0;color:var(--maroon)}.tool-icon i{font-size:20px}.tool-card .rsum{margin-top:10px}.tool-card .fld{margin-bottom:9px}.tool-card .btn{width:auto}.tw{box-shadow:0 2px 8px rgba(15,23,42,.025)}.tbl th{position:sticky;top:0;z-index:1}.tbl tbody tr:hover td{background:#fff8f8}.sbar{box-shadow:none}.sh{font-size:13px;letter-spacing:.1px}.acc,.bar{box-shadow:0 5px 18px rgba(15,23,42,.04)}@media(max-width:760px){.fin-tabs{overflow:auto}.fin-tabs button{flex:0 0 auto}.page-card{padding:15px}.page-card-head{flex-direction:column}.filter-grid,.message-filters,.tools-grid,.collection-summary,.message-overview{grid-template-columns:1fr}.date-badge,.message-stat{align-self:flex-start}.message-actions{flex-wrap:wrap}.message-actions .btn{flex:1}.collection-table th:nth-child(2),.collection-table td:nth-child(2){display:none}}"
        s.textContent += "\n/* Number inputs: keep numeric entry but remove browser spinner arrows everywhere in Fee Management. */\ninput[type=number]{-moz-appearance:textfield;appearance:textfield}\ninput[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}\n.fs-head{display:flex;align-items:center;justify-content:space-between;gap:18px;margin:4px 0 14px}\n.fs-title-block .eyebrow{display:block;margin-bottom:4px}\n.fs-title-block h2{margin:0;color:#202638;font-size:21px;letter-spacing:-.25px;display:flex;align-items:center;gap:7px}\n.fs-title-block h2 i{color:var(--maroon);font-size:21px}\n.fs-title-block p{margin:5px 0 0;color:var(--text-muted);font-size:12px}\n.fs-status{display:inline-flex;align-items:center;gap:7px;padding:8px 11px;border-radius:999px;font-size:11px;font-weight:800;white-space:nowrap}\n.fs-status.open{background:#fdf3e7;color:#a16207;border:1px solid #f2d5a8}\n.fs-status.locked{background:#f5f6f8;color:#475569;border:1px solid #dfe4ea}\n.fs-status i{font-size:15px}\n.fs-toolbar{display:flex;align-items:center;gap:10px;margin-bottom:10px}\n.fs-search{width:270px;display:flex;align-items:center;gap:7px;background:#fff;border:1px solid var(--border);border-radius:10px;padding:8px 10px}\n.fs-search i{font-size:18px;color:#8b95a5}\n.fs-search input{border:0;outline:0;background:transparent;width:100%;font:inherit;font-size:12.5px}\n.fs-toolbar-note{flex:1;display:flex;align-items:center;gap:8px;padding:8px 11px;background:#f8fafc;border:1px solid #e8edf2;border-radius:10px;color:#64748b;font-size:10.5px}\n.fs-toolbar-note i{color:var(--maroon);font-size:17px}\n.fs-toolbar-note b{color:#334155}\n.fs-table-wrap{background:#fff;border:1px solid var(--border);border-radius:15px;overflow:auto;box-shadow:0 5px 18px rgba(15,23,42,.035)}\n.fs-table{min-width:980px;border-collapse:separate;border-spacing:0}\n.fs-table th{position:sticky;top:0;z-index:3;background:#fbf6f6;color:#7f1d1d;border-bottom:1px solid #eadede;padding:11px 9px;font-size:10.5px;letter-spacing:.35px}\n.fs-table th:first-child{padding-left:14px}\n.fs-table td{padding:7px 8px;border-bottom:1px solid #f0f2f5;vertical-align:middle}\n.fs-table tbody tr:last-child td{border-bottom:0}\n.fs-table tbody tr.fs-row:hover td{background:#fffafa}\n.fs-student-col{width:250px}.fs-student-main{display:flex;align-items:center;gap:9px}.fs-student-copy{display:flex;flex-direction:column;min-width:0}.fs-roll{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:28px;padding:0 7px;border-radius:8px;background:#f4e8e8;color:#7f1d1d;font-size:11px;font-weight:800;flex:0 0 auto}.fs-roll-sm{min-width:22px;height:22px;padding:0 5px;border-radius:6px;font-size:10px;vertical-align:middle}.fs-student-status{display:block;margin-top:3px;font-size:9.5px;font-weight:700;letter-spacing:.15px;color:#15803d}.fs-student-status.inactive{color:#b45309}.fs-student-status.active{color:#15803d}.fs-old-col{width:145px}.fs-total-col{width:125px}\n.fs-student{min-width:210px;padding-left:14px!important}\n.fs-student b{font-size:12.5px;font-weight:750;color:#273044}\n.fs-input-cell{min-width:125px}\n.fee-input-wrap{display:flex;align-items:center;background:#fbfcfd;border:1px solid #e1e6ec;border-radius:8px;height:34px;padding:0 8px;transition:border-color .15s,box-shadow .15s,background .15s}\n.fee-input-wrap:focus-within{background:#fff;border-color:#c99b9b;box-shadow:0 0 0 3px rgba(138,22,24,.07)}\n.fee-input-wrap>span{font-size:10px;color:#a0a8b5;font-weight:700;margin-right:3px}\n.fee-input-wrap input{width:100%;border:0;outline:0;background:transparent;text-align:right;font:inherit;font-size:12.5px;font-weight:700;color:#283143;min-width:65px}\n.old-edit{background:#fffaf5;border-color:#ead7bc}\n.locked-fee{display:inline-flex;align-items:center;justify-content:flex-end;gap:5px;color:#4b5563;font-size:12.5px;font-weight:750;min-width:105px;height:34px}\n.locked-fee i{font-size:15px;color:#94a3b8}\n.lock-head{display:inline-flex;vertical-align:middle;margin-left:3px}.lock-head i{font-size:12px}\n.fs-total{font-weight:850;color:#202638;font-size:12.5px;white-space:nowrap;padding-right:14px!important}.fs-grand .total-emphasis{font-size:13px;font-weight:900;color:var(--maroon)}\n.fs-grand td{background:#faf6f6!important;border-top:1px solid #e7dada;border-bottom:0!important;padding-top:11px;padding-bottom:11px}\n.fs-grand .stn span{display:block;color:#8a94a4;font-size:9.5px;font-weight:600;margin-top:2px}\n.fs-grand td:not(.stn){font-size:11.5px;color:#7f1d1d}\n.fs-footer{position:sticky;bottom:0;z-index:4;margin-top:10px;padding:10px 12px;background:rgba(255,255,255,.96);backdrop-filter:blur(8px);border:1px solid var(--border);border-radius:12px;display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:0 -4px 16px rgba(15,23,42,.05)}\n.fs-footer>div{display:flex;align-items:center;gap:7px;color:#718096;font-size:10.5px}\n.fs-footer>div i{font-size:16px;color:#a0a8b5}.fs-footer .btn{white-space:nowrap}\n";
      s.textContent += "\n/* Reports */\n.report-toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;margin-bottom:14px;padding:14px;background:#fff;border:1px solid var(--border);border-radius:14px;box-shadow:0 5px 18px rgba(15,23,42,.04)}\n.report-toolbar .ssel{flex:1 1 190px;min-width:180px}.report-toolbar .btn{flex:0 0 auto}.report-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:15px}.report-summary .to{margin:0;background:#fff;box-shadow:0 4px 14px rgba(15,23,42,.04)}\n.report-two-col{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px}.report-box{background:#fff;border:1px solid var(--border);border-radius:16px;padding:15px;box-shadow:0 5px 18px rgba(15,23,42,.04);margin-bottom:14px}.report-box-head{margin-bottom:10px}.report-box-head h3{margin:3px 0 4px;font-size:16px;color:#202638}.report-box-head p{margin:0;color:var(--text-muted);font-size:11px}.report-table td,.report-table th{padding:9px 10px}.report-history-box{margin-top:0}.legacy-total-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.legacy-total-card{border:1px solid #eadede;background:#faf5f5;border-radius:12px;padding:14px}.legacy-total-card span{display:block;color:var(--maroon);font-size:10px;font-weight:800;letter-spacing:.6px}.legacy-total-card b{display:block;margin-top:4px;font-size:22px;color:#202638}.report-stat{display:flex;align-items:center;gap:7px;padding:9px 12px;border-radius:11px;background:#faf5f5;color:var(--maroon);font-size:12px;font-weight:800;white-space:nowrap}.report-stat i{font-size:17px}.report-class-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin:2px 0 12px}.report-class-head h3{margin:3px 0 4px;font-size:18px;color:#202638}.report-class-head p{margin:0;color:var(--text-muted);font-size:11px}.report-legend{display:flex;gap:6px;flex-wrap:wrap}.report-legend span{font-size:10px;font-weight:800;padding:5px 8px;border-radius:999px}.legend-active{background:#ecfdf5;color:#15803d}.legend-inactive{background:#fff7ed;color:#b45309}.report-table-wrap{overflow:auto;border:1px solid var(--border);border-radius:13px;background:#fff}.report-class-table{min-width:1180px}.report-class-table th,.report-class-table td{padding:9px 10px}.report-class-table .report-roll{text-align:center;font-weight:800;color:var(--maroon);width:55px}.report-class-table .report-history{min-width:230px;font-size:11px;line-height:1.55}.report-inactive-row td{background:#fffaf3!important}.report-tabs{margin-bottom:12px}@media(max-width:900px){.report-two-col{grid-template-columns:1fr}.report-summary{grid-template-columns:1fr}.report-class-head{flex-direction:column}}@media(max-width:620px){.legacy-total-grid{grid-template-columns:1fr}.report-toolbar .btn{width:100%;justify-content:center}.report-toolbar .ssel{min-width:100%}}\n";
      document.head.appendChild(s);
    }
  })();
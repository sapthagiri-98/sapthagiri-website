/* =========================================================================
   fees.js — Fee Ledger Database (Management). Plain script; uses `Portal`.
   Backend (unchanged): getFeeClasses(year), getFeeStudentsByClass(year, cls),
   getStudentFeeProfile(year, studentId). Records are always live (never cached).
   Wording kept plain: Assigned / Collected / Arrears.
   ========================================================================= */
(function () {
  "use strict";
  var P = window.Portal;
  var session = P.bootPage("fees");
  if (!session) return;
  injectCss();
  var esc = P.esc, $ = function (id) { return document.getElementById(id); };
  var profile = null;

  var CATS = ["Old Due", "Tuition Fee", "Study Materials Fee", "Transport Fee", "Misc. Fee"];

  $("view").innerHTML = shell();
  bind();
  loadClasses();

  function shell() {
    return '<div class="card wide-card">' +
      '<span class="eyebrow">Management</span><h2 style="margin-bottom:4px;">Fee Ledger Database</h2>' +
      '<p class="view-description" style="margin:0 0 16px;">Look up any student to see what was assigned, collected and still due — with a full payment history.</p>' +
      '<div class="mod-toolbar">' +
        '<div class="smart-selector"><div class="ss-icon"><i class="material-icons">event</i></div><div class="ss-body"><div class="ss-label">Academic Year</div><select id="feeYear"></select></div></div>' +
        '<div class="smart-selector"><div class="ss-icon"><i class="material-icons">groups</i></div><div class="ss-body"><div class="ss-label">Class</div><select id="feeClass"><option value="">Loading…</option></select></div></div>' +
        '<div class="smart-selector"><div class="ss-icon"><i class="material-icons">person</i></div><div class="ss-body"><div class="ss-label">Student</div><select id="feeStudent" disabled><option value="">Pick a class…</option></select></div></div>' +
      '</div>' +
      '<div id="feeBody"><div class="fee-empty"><i class="material-icons">account_balance</i>Pick a class and student to view the ledger.</div></div>' +
    '</div>';
  }

  function bind() {
    // academic years: current + previous (based on the school year starting June)
    var d = new Date(), y = d.getFullYear(), startY = (d.getMonth() >= 5) ? y : y - 1;
    var years = [ay(startY), ay(startY - 1)];
    $("feeYear").innerHTML = years.map(function (v) { return '<option value="' + v + '">' + v + "</option>"; }).join("");
    $("feeYear").addEventListener("change", loadClasses);
    $("feeClass").addEventListener("change", loadStudents);
    $("feeStudent").addEventListener("change", loadProfile);
  }
  function ay(a) { return a + "-" + String((a + 1) % 100).padStart(2, "0"); }

  function loadClasses() {
    reset();
    var year = $("feeYear").value, sel = $("feeClass");
    sel.innerHTML = '<option value="">Loading…</option>';
    P.api("getFeeClasses", [year], { text: "Loading classes…" }).then(function (cs) {
      cs = cs || [];
      P.sortGrades(cs);
      sel.innerHTML = '<option value="">Select class…</option>' + cs.filter(function (c) { return String(c).trim() !== "11" && String(c).trim() !== "Grade 11"; }).map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + "</option>"; }).join("");
    }).catch(function (e) { sel.innerHTML = '<option value="">Failed to load</option>'; $("feeBody").innerHTML = errBox(e); });
  }
  function loadStudents() {
    reset();
    var year = $("feeYear").value, cls = $("feeClass").value, sel = $("feeStudent");
    if (!cls) { sel.disabled = true; sel.innerHTML = '<option value="">Pick a class…</option>'; return; }
    sel.disabled = true; sel.innerHTML = '<option value="">Loading…</option>';
    P.api("getFeeStudentsByClass", [year, cls], { text: "Loading students…" }).then(function (list) {
      list = list || [];
      sel.disabled = false;
      sel.innerHTML = '<option value="">Select student…</option>' + list.map(function (s) { return '<option value="' + esc(s.id) + '">' + esc(s.name) + "</option>"; }).join("");
    }).catch(function (e) { sel.innerHTML = '<option value="">Failed</option>'; $("feeBody").innerHTML = errBox(e); });
  }
  function loadProfile() {
    var year = $("feeYear").value, id = $("feeStudent").value;
    if (!id) { reset(); return; }
    $("feeBody").innerHTML = '<div class="inline-loader"><i class="material-icons">sync</i>Loading ledger…</div>';
    P.api("getStudentFeeProfile", [year, id], { text: "Loading ledger…" }).then(function (p) { profile = p; render(); }).catch(function (e) { $("feeBody").innerHTML = errBox(e); });
  }
  function reset() { profile = null; $("feeBody").innerHTML = '<div class="fee-empty"><i class="material-icons">account_balance</i>Pick a class and student to view the ledger.</div>'; }

  function money(n) { return "₹" + (Number(n) || 0).toLocaleString("en-IN"); }

  function render() {
    if (!profile) { reset(); return; }
    var t = profile.totals || { assigned: 0, paid: 0, remaining: 0 };
    var opts = '<option value="ALL">Complete view</option>' + CATS.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + " ledger</option>"; }).join("");
    $("feeBody").innerHTML =
      '<div class="fee-studentbar"><div><div class="fee-sname">' + esc(profile.studentName) + '</div><div class="fee-smeta">' + esc(profile.className || "") + ' · ID ' + esc(profile.studentId) + '</div></div></div>' +
      '<div class="stat-row" style="margin-top:14px;">' +
        '<div class="stat-box maroon"><div class="n" style="font-size:22px;">' + money(t.assigned) + '</div><div class="l">Assigned</div></div>' +
        '<div class="stat-box green"><div class="n" style="font-size:22px;">' + money(t.paid) + '</div><div class="l">Collected</div></div>' +
        '<div class="stat-box red"><div class="n" style="font-size:22px;">' + money(t.remaining) + '</div><div class="l">Arrears</div></div>' +
      '</div>' +
      '<div class="mod-toolbar" style="margin-bottom:10px;"><div class="smart-selector" style="max-width:300px;"><div class="ss-icon"><i class="material-icons">filter_list</i></div><div class="ss-body"><div class="ss-label">View ledger</div><select id="feeCat">' + opts + '</select></div></div></div>' +
      '<div id="feeDetail"></div>';
    $("feeCat").addEventListener("change", renderDetail);
    renderDetail();
  }

  function renderDetail() {
    var cat = $("feeCat").value;
    if (cat && cat !== "ALL") { renderCategory(cat); return; }
    // breakdown table
    var brk = profile.breakdown || {};
    var rows = Object.keys(brk).map(function (k) {
      var d = brk[k];
      var dueCls = (Number(d.remaining) > 0) ? "due" : "clear";
      return '<tr class="rt-' + dueCls + '"><td data-label="Fee Segment" style="font-weight:700;text-align:left;">' + esc(k) + '</td><td class="num" data-label="Assigned">' + money(d.assigned) + '</td><td class="num" data-label="Collected" style="color:#047857;">' + money(d.paid) + '</td><td class="num" data-label="Arrears" style="color:#b91c1c;font-weight:700;">' + money(d.remaining) + "</td></tr>";
    }).join("");
    var hist = (profile.history || []);
    var hrows = hist.length ? hist.map(function (h) {
      return '<tr><td data-label="Receipt / ID" style="font-family:monospace;font-size:12px;">' + esc(h.paymentId || "—") + '</td><td data-label="Type"><span class="pill grey">' + esc(h.feeType) + '</span></td><td class="num" data-label="Paid" style="color:#047857;font-weight:700;">' + money(h.amountPaid) + '</td><td data-label="Date">' + esc(h.date) + "</td></tr>";
    }).join("") : '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:16px;">No payments recorded.</td></tr>';
    $("feeDetail").innerHTML =
      '<div class="group-head"><i class="material-icons" style="font-size:18px;">receipt_long</i> Balance Breakdown</div>' +
      '<div class="friendly-wrap"><table class="friendly-table rtable"><thead><tr><th>Fee Segment</th><th style="text-align:center;">Assigned</th><th style="text-align:center;">Collected</th><th style="text-align:center;">Arrears</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="group-head" style="margin-top:22px;"><i class="material-icons" style="font-size:18px;">history</i> Payment History</div>' +
      '<div class="friendly-wrap"><table class="friendly-table rtable"><thead><tr><th>Receipt / ID</th><th>Type</th><th style="text-align:center;">Paid</th><th>Date</th></tr></thead><tbody>' + hrows + '</tbody></table></div>';
  }

  function renderCategory(cat) {
    var d = (profile.breakdown || {})[cat] || { assigned: 0, paid: 0, remaining: 0 };
    var hist = (profile.history || []).filter(function (h) { return h.feeType === cat; });
    var running = d.assigned;

    // Compact summary strip: what was assigned, collected and what's left.
    var remCls = (Number(d.remaining) > 0) ? "due" : "clear";
    var head =
      '<div class="group-head"><i class="material-icons" style="font-size:18px;">description</i> ' + esc(cat) + ' — Statement</div>' +
      '<div class="fee-stmt-summary">' +
        '<div class="fss-item"><span class="fss-l">Assigned</span><span class="fss-v">' + money(d.assigned) + '</span></div>' +
        '<div class="fss-item"><span class="fss-l">Collected</span><span class="fss-v paid">' + money(d.paid) + '</span></div>' +
        '<div class="fss-item"><span class="fss-l">Remaining</span><span class="fss-v ' + remCls + '">' + money(d.remaining) + '</span></div>' +
      '</div>';

    // Timeline: an opening "Fee Assigned" line, then one row per payment with a
    // running balance. No empty Assigned/Paid dash cells, no blank titles.
    var timeline = '<div class="fee-stmt">' +
      '<div class="fst-row opening">' +
        '<div class="fst-dot"><i class="material-icons">receipt_long</i></div>' +
        '<div class="fst-main"><div class="fst-title">Fee Assigned</div><div class="fst-sub">Opening balance</div></div>' +
        '<div class="fst-amt"><div class="fst-a">' + money(d.assigned) + '</div><div class="fst-bal">Balance ' + money(running) + '</div></div>' +
      '</div>';

    if (!hist.length) {
      timeline += '<div class="fst-empty"><i class="material-icons">info</i>No payments recorded for this fee yet.</div>';
    } else {
      hist.forEach(function (h) {
        running -= (Number(h.amountPaid) || 0);
        var balCls = (running > 0) ? "" : " clear";
        timeline += '<div class="fst-row pay">' +
          '<div class="fst-dot pay"><i class="material-icons">payments</i></div>' +
          '<div class="fst-main"><div class="fst-title">' + esc(h.date) + '</div><div class="fst-sub">Receipt ' + esc(h.paymentId || "—") + '</div></div>' +
          '<div class="fst-amt"><div class="fst-a paid">+' + money(h.amountPaid) + '</div><div class="fst-bal' + balCls + '">Balance ' + money(running) + '</div></div>' +
        '</div>';
      });
    }
    timeline += '</div>';

    $("feeDetail").innerHTML = head + timeline;
  }

  function errBox(e) { return '<div class="fee-empty"><i class="material-icons">error_outline</i>' + esc(e && e.message ? e.message : e) + "</div>"; }

  function injectCss() {
    if (document.getElementById("fee-css")) return;
    var css =
      ".fee-empty{text-align:center;padding:40px 20px;color:var(--text-muted);font-weight:600;background:#fff;border:1px dashed var(--border);border-radius:14px}.fee-empty i{font-size:38px;color:var(--maroon);display:block;margin-bottom:8px}" +
      ".fee-studentbar{display:flex;align-items:center;gap:12px;background:var(--primary-light);border:1px solid var(--border);border-radius:14px;padding:14px 18px}" +
      ".fee-sname{font-weight:800;font-size:17px;color:var(--maroon);font-family:var(--head)}.fee-smeta{font-size:13px;color:var(--text-muted);margin-top:2px}" +
      /* Category statement — clean timeline (works on mobile & desktop) */
      ".fee-stmt-summary{display:flex;gap:8px;background:#fff;border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:14px;box-shadow:var(--shadow-sm)}" +
      ".fss-item{flex:1;text-align:center;display:flex;flex-direction:column;gap:3px}.fss-item+.fss-item{border-left:1px solid var(--border)}" +
      ".fss-l{font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.4px;color:var(--text-muted)}" +
      ".fss-v{font-size:16px;font-weight:800;font-family:var(--head);color:var(--text-main)}.fss-v.paid,.fss-v.clear{color:#047857}.fss-v.due{color:#b91c1c}" +
      ".fee-stmt{display:flex;flex-direction:column;gap:10px}" +
      ".fst-row{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid var(--border);border-radius:14px;padding:12px 14px;box-shadow:var(--shadow-sm)}" +
      ".fst-row.opening{border-left:4px solid var(--maroon)}.fst-row.pay{border-left:4px solid var(--success)}" +
      ".fst-dot{flex:0 0 auto;width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:var(--primary-light);color:var(--maroon)}" +
      ".fst-dot.pay{background:var(--success-light);color:#047857}.fst-dot i{font-size:19px}" +
      ".fst-main{flex:1;min-width:0}.fst-title{font-weight:800;font-size:14px;color:var(--text-main)}.fst-sub{font-size:11.5px;color:var(--text-muted);margin-top:1px;font-family:monospace}" +
      ".fst-amt{flex:0 0 auto;text-align:right}.fst-a{font-weight:800;font-size:15px;color:var(--maroon);font-family:var(--head)}.fst-a.paid{color:#047857}" +
      ".fst-bal{font-size:11px;color:var(--text-muted);font-weight:600;margin-top:1px}.fst-bal.clear{color:#047857}" +
      ".fst-empty{display:flex;align-items:center;justify-content:center;gap:8px;text-align:center;color:var(--text-muted);font-size:13px;font-weight:600;padding:16px;background:#f8fafc;border:1px dashed var(--border);border-radius:12px}.fst-empty i{font-size:18px;color:var(--maroon)}" +
      /* Responsive breakdown/history tables -> stacked cards on phones */
      "@media(max-width:640px){" +
        ".rtable{min-width:0 !important;width:100%}" +
        ".rtable thead{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);border:0}" +
        ".rtable,.rtable tbody,.rtable tr,.rtable td{display:block;width:100%}" +
        ".friendly-wrap:has(.rtable){border:none;background:transparent;box-shadow:none;overflow:visible}" +
        ".rtable tr{border:1px solid var(--border);border-radius:14px;margin:0 0 10px;padding:6px 14px;background:#fff;box-shadow:var(--shadow-sm)}" +
        ".rtable tr.rt-due{border-left:4px solid var(--danger)}.rtable tr.rt-clear{border-left:4px solid var(--success)}" +
        ".rtable tr:hover td{background:transparent}" +
        ".rtable td{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:9px 0;border:none;border-top:1px solid #f1f2f6;text-align:right !important}" +
        ".rtable td::before{content:attr(data-label);font-weight:600;color:var(--text-muted);text-align:left;font-size:12px}" +
        ".rtable tr td:first-child{border-top:none;padding-top:10px;font-size:15px;font-weight:800 !important;color:var(--maroon);text-align:left !important}" +
        ".rtable tr td:first-child::before{content:none}" +
        ".rtable td[colspan]{justify-content:center}.rtable td[colspan]::before{content:none}" +
      "}";
    var st = document.createElement("style"); st.id = "fee-css"; st.textContent = css; document.head.appendChild(st);
  }
})();

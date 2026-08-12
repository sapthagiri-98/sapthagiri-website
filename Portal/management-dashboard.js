/* =========================================================================
   management-dashboard.js — Management Dashboard (real-time overview)
   Plain script; uses `Portal`. One backend call (getManagementDashboard)
   aggregates KPIs across Attendance, Homework, Exams, Syllabus and Fees.
   Auto-refreshes every 45s; manual refresh button; live "updated Xs ago".
   ========================================================================= */
(function () {
  "use strict";
  var P = window.Portal;
  var session = P.bootPage("dashboard");
  if (!session) return;
  if (session.role !== "Management") { location.replace("dashboard.html"); return; }
  var esc = P.esc, byId = function (id) { return document.getElementById(id); };
  injectCss();

  var STATE = { data: null, lastFetch: 0, refreshTimer: null, tickTimer: null };

  render();
  load();
  STATE.refreshTimer = setInterval(load, 45000);
  STATE.tickTimer = setInterval(updateAgo, 1000);
  window.addEventListener("beforeunload", function () { clearInterval(STATE.refreshTimer); clearInterval(STATE.tickTimer); });

  function greeting() {
    var h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  }
  function firstName() { return String(session.name || "").trim().split(/\s+/)[0] || "there"; }

  function render() {
    byId("view").innerHTML =
      '<div class="dash-head">' +
        '<div><span class="ex-chip">Management</span><h1 class="dash-title">' + greeting() + ', ' + esc(firstName()) + ' \uD83D\uDC4B</h1>' +
        '<p class="dash-sub">Real-time overview of today\u2019s school operations.</p></div>' +
        '<div class="dash-refresh">' +
          '<span class="dash-ago" id="dashAgo">Loading\u2026</span>' +
          '<button class="dash-refreshbtn" id="dashRefresh" title="Refresh now"><i class="material-icons">refresh</i></button>' +
        '</div>' +
      '</div>' +
      '<div id="dashBanner"></div>' +
      '<div id="dashHero" class="dash-hero"></div>' +
      '<div class="dash-cols">' +
        '<div class="dash-col-main">' +
          '<div class="dash-panel"><div class="dash-panel-h"><i class="material-icons">insights</i> Module Snapshot</div><div id="dashSnapshot" class="dash-snapgrid"></div></div>' +
        '</div>' +
        '<div class="dash-col-side">' +
          '<div class="dash-panel"><div class="dash-panel-h"><i class="material-icons">history</i> Recent Activity</div><div id="dashActivity" class="dash-activity"></div></div>' +
          '<div class="dash-panel"><div class="dash-panel-h"><i class="material-icons">bolt</i> Quick Links</div><div id="dashLinks" class="dash-links"></div></div>' +
        '</div>' +
      '</div>';
    byId("dashRefresh").addEventListener("click", function () { load(true); });
    renderLinks();
  }

  function load(manual) {
    var btn = byId("dashRefresh");
    if (manual) btn.classList.add("spin");
    P.api("getManagementDashboard", [], { overlay: false }).then(function (d) {
      STATE.data = d; STATE.lastFetch = Date.now();
      renderBanner(d); renderHero(d); renderSnapshot(d); renderActivity(d);
      updateAgo();
    }).catch(function (e) {
      byId("dashHero").innerHTML = '<div class="dash-error"><i class="material-icons">error_outline</i>' + esc(e.message || e) + '</div>';
    }).finally(function () { if (manual) setTimeout(function () { btn.classList.remove("spin"); }, 400); });
  }

  function updateAgo() {
    if (!STATE.lastFetch) return;
    var secs = Math.round((Date.now() - STATE.lastFetch) / 1000);
    var txt = secs < 3 ? "Updated just now" : secs < 60 ? ("Updated " + secs + "s ago") : ("Updated " + Math.floor(secs / 60) + "m ago");
    var el = byId("dashAgo"); if (el) el.textContent = txt;
  }

  function money(n) { return "\u20B9" + Math.round(Number(n) || 0).toLocaleString("en-IN"); }

  function renderBanner(d) {
    var s = d.school || {};
    var box = byId("dashBanner");
    if (s.holidayToday) {
      box.innerHTML = '<div class="dash-alert holiday"><i class="material-icons">event_busy</i>' +
        '<div><b>' + esc(s.holidayReason || "Holiday") + '</b><span>Today is a non-working day \u2014 attendance figures below reflect that.</span></div></div>';
    } else {
      box.innerHTML = "";
    }
  }

  function ring(pct, color) {
    var p = (pct == null) ? 0 : Math.max(0, Math.min(100, pct));
    var deg = Math.round(p * 3.6);
    var label = (pct == null) ? "\u2014" : p + "%";
    return '<div class="dash-ring" style="background:conic-gradient(' + color + ' ' + deg + 'deg, #eef0f4 ' + deg + 'deg)">' +
      '<div class="dash-ring-inner">' + label + '</div></div>';
  }

  function heroCard(opts) {
    // opts: {icon, accent, label, value, sub, ringPct}
    var ringHtml = opts.ringPct !== undefined ? ring(opts.ringPct, opts.accent) : '<div class="dash-heroicon" style="background:' + opts.accentLight + ';color:' + opts.accent + '"><i class="material-icons">' + opts.icon + '</i></div>';
    return '<div class="dash-herocard" style="border-left-color:' + opts.accent + '">' +
      ringHtml +
      '<div class="dash-herobody"><div class="dash-herolabel">' + esc(opts.label) + '</div>' +
      '<div class="dash-herovalue">' + opts.value + '</div>' +
      (opts.sub ? '<div class="dash-herosub">' + opts.sub + '</div>' : '') + '</div></div>';
  }

  function renderHero(d) {
    var att = d.attendance || {}, hw = d.homework || {}, fee = d.fees || {}, ex = d.exams || {};
    var cards = [];

    cards.push(heroCard({
      icon: "assignment_turned_in", accent: "#7a1220", accentLight: "var(--primary-light)",
      label: "Attendance Today", ringPct: att.blocked ? null : att.attendancePct,
      value: att.blocked ? "\u2014" : (att.attendancePct == null ? "Not marked" : att.attendancePct + "%"),
      sub: att.blocked ? "Non-working day" : (att.classesMarkedToday + " / " + att.totalClasses + " classes marked"),
    }));

    cards.push(heroCard({
      icon: "payments", accent: "#059669", accentLight: "#ecfdf5",
      label: "Collected Today", value: money(fee.today),
      sub: "This month: <b>" + money(fee.month) + "</b>",
    }));

    cards.push(heroCard({
      icon: "menu_book", accent: "#2563eb", accentLight: "#eff6ff",
      label: "Homework Diary", ringPct: hw.total > 0 ? hw.pct : null,
      value: hw.total > 0 ? (hw.pct + "%") : "No classes today",
      sub: hw.total > 0 ? (hw.done + " / " + hw.total + " subjects logged") : "",
    }));

    cards.push(heroCard({
      icon: "emoji_events", accent: "#d97706", accentLight: "#fffbeb",
      label: "Examinations", value: ex.today + " today",
      sub: ex.next7Days + " in next 7 days" + (ex.pendingSyllabus > 0 ? " \u00b7 <span class='dash-warntxt'>" + ex.pendingSyllabus + " missing syllabus</span>" : ""),
    }));

    byId("dashHero").innerHTML = cards.join("");
  }

  function snapRow(icon, color, label, value, extra) {
    return '<div class="dash-snaprow"><div class="dash-snapicon" style="color:' + color + '"><i class="material-icons">' + icon + '</i></div>' +
      '<div class="dash-snapmain"><div class="dash-snaplabel">' + esc(label) + '</div>' + (extra ? '<div class="dash-snapextra">' + extra + '</div>' : '') + '</div>' +
      '<div class="dash-snapvalue">' + value + '</div></div>';
  }

  function renderSnapshot(d) {
    var syl = d.syllabus || {}, fee = d.fees || {}, roster = d.roster || {};
    var rows = [];
    rows.push(snapRow("fact_check", "#7a1220", "Syllabus Coverage",
      syl.total > 0 ? syl.pct + "%" : "\u2014",
      syl.total > 0 ? (syl.done + " / " + syl.total + " lessons done" + (syl.behind > 0 ? " \u00b7 <span class='dash-warntxt'>" + syl.behind + " behind schedule</span>" : "")) : "No lessons loaded yet"));
    rows.push(snapRow("account_balance_wallet", "#b91c1c", "Fee Outstanding (" + esc(fee.year || "") + ")", money(fee.outstanding),
      "Assigned " + money(fee.assigned) + " \u00b7 Collected " + money(fee.collected)));
    rows.push(snapRow("groups", "#0f766e", "Active Students", roster.activeStudents, roster.distinctClasses + " classes"));
    rows.push(snapRow("manage_accounts", "#4338ca", "Active Staff", roster.activeStaff, "Teachers &amp; Management"));
    byId("dashSnapshot").innerHTML = rows.join("");
  }

  function renderActivity(d) {
    var box = byId("dashActivity");
    var list = d.activity || [];
    if (!list.length) { box.innerHTML = '<div class="dash-empty-mini">No recent activity yet.</div>'; return; }
    box.innerHTML = list.map(function (a) {
      var icon = a.type === "payment" ? "payments" : "notifications";
      var color = a.type === "payment" ? "#059669" : "#7a1220";
      return '<div class="dash-actrow"><div class="dash-acticon" style="background:' + color + '1a;color:' + color + '"><i class="material-icons">' + icon + '</i></div>' +
        '<div class="dash-actbody"><div class="dash-acttext">' + esc(a.text) + '</div><div class="dash-actmeta">' + esc(a.receiptId || "") + '</div></div></div>';
    }).join("");
  }

  function renderLinks() {
    var mods = [
      { id: "attendance", label: "Attendance", icon: "assignment_turned_in", href: "attendance.html" },
      { id: "homework", label: "Homework Diary", icon: "menu_book", href: "homework.html" },
      { id: "exams", label: "Examinations", icon: "emoji_events", href: "examinations.html" },
      { id: "syllabus", label: "Syllabus Tracker", icon: "fact_check", href: "syllabus.html" },
      { id: "feemgmt", label: "Fee Management", icon: "account_balance_wallet", href: "fee-management.html" },
      { id: "fees", label: "Fee Ledger", icon: "payments", href: "fees.html" },
      { id: "stafftrack", label: "Staff Attendance", icon: "groups", href: "staff-attendance.html" },
      { id: "usermgmt", label: "User Management", icon: "manage_accounts", href: "user-management.html" },
    ];
    byId("dashLinks").innerHTML = mods.map(function (m) {
      return '<a class="dash-link" href="' + m.href + '"><i class="material-icons">' + m.icon + '</i><span>' + esc(m.label) + '</span><i class="material-icons dash-link-chev">chevron_right</i></a>';
    }).join("");
  }

  function injectCss() {
    if (byId("dash-css")) return;
    var css =
    ".dash-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:14px;margin-bottom:6px}" +
    ".ex-chip{font-size:11px;font-weight:700;color:var(--maroon);background:var(--primary-light);padding:3px 10px;border-radius:999px}" +
    ".dash-title{font-size:24px;color:var(--maroon);margin:6px 0 2px;font-family:var(--head,inherit)}" +
    ".dash-sub{color:var(--text-muted);font-size:13.5px;margin:0}" +
    ".dash-refresh{display:flex;align-items:center;gap:10px}" +
    ".dash-ago{font-size:12px;color:var(--text-muted);font-weight:600}" +
    ".dash-refreshbtn{border:1px solid var(--border);background:#fff;border-radius:10px;width:38px;height:38px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;color:var(--maroon)}" +
    ".dash-refreshbtn:hover{background:var(--primary-light)}.dash-refreshbtn.spin i{animation:dashspin .6s linear}" +
    "@keyframes dashspin{from{transform:rotate(0)}to{transform:rotate(360deg)}}" +
    ".dash-alert{display:flex;gap:12px;align-items:center;background:#fffbeb;border:1px solid #fde68a;border-radius:14px;padding:12px 16px;margin:14px 0}" +
    ".dash-alert i{font-size:26px;color:#d97706}.dash-alert b{display:block;color:#92400e;font-size:14px}.dash-alert span{font-size:12.5px;color:#92400e;opacity:.85}" +
    ".dash-hero{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin:16px 0}" +
    ".dash-herocard{background:#fff;border:1px solid var(--border);border-left:4px solid;border-radius:16px;padding:16px;box-shadow:var(--shadow-sm);display:flex;align-items:center;gap:14px;transition:transform .15s ease,box-shadow .15s ease}" +
    ".dash-herocard:hover{transform:translateY(-2px);box-shadow:var(--shadow-md)}" +
    ".dash-heroicon{flex:0 0 auto;width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center}.dash-heroicon i{font-size:26px}" +
    ".dash-ring{flex:0 0 auto;width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center}" +
    ".dash-ring-inner{width:42px;height:42px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:var(--text-main)}" +
    ".dash-herobody{min-width:0}.dash-herolabel{font-size:11.5px;font-weight:800;text-transform:uppercase;letter-spacing:.4px;color:var(--text-muted)}" +
    ".dash-herovalue{font-size:20px;font-weight:800;color:var(--text-main);margin-top:2px;font-family:var(--head,inherit)}" +
    ".dash-herosub{font-size:11.5px;color:var(--text-muted);margin-top:2px}" +
    ".dash-warntxt{color:#b45309;font-weight:700}" +
    ".dash-cols{display:grid;grid-template-columns:1.4fr 1fr;gap:16px;align-items:start}@media(max-width:900px){.dash-cols{grid-template-columns:1fr}}" +
    ".dash-panel{background:#fff;border:1px solid var(--border);border-radius:16px;padding:16px 18px;box-shadow:var(--shadow-sm);margin-bottom:16px}" +
    ".dash-panel-h{display:flex;align-items:center;gap:8px;font-weight:800;font-size:14px;color:var(--maroon);margin-bottom:12px}.dash-panel-h i{font-size:19px}" +
    ".dash-snapgrid{display:flex;flex-direction:column;gap:2px}" +
    ".dash-snaprow{display:flex;align-items:center;gap:12px;padding:11px 4px;border-bottom:1px solid #f1f2f6}.dash-snaprow:last-child{border-bottom:none}" +
    ".dash-snapicon{flex:0 0 auto;width:38px;height:38px;border-radius:10px;background:#f8fafc;display:flex;align-items:center;justify-content:center}.dash-snapicon i{font-size:20px}" +
    ".dash-snapmain{flex:1;min-width:0}.dash-snaplabel{font-weight:700;font-size:13.5px;color:var(--text-main)}.dash-snapextra{font-size:11.5px;color:var(--text-muted);margin-top:1px}" +
    ".dash-snapvalue{font-weight:800;font-size:16px;color:var(--text-main);flex:0 0 auto;text-align:right}" +
    ".dash-activity{display:flex;flex-direction:column;gap:8px;max-height:280px;overflow:auto}" +
    ".dash-actrow{display:flex;align-items:center;gap:10px}" +
    ".dash-acticon{flex:0 0 auto;width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center}.dash-acticon i{font-size:17px}" +
    ".dash-actbody{min-width:0}.dash-acttext{font-size:12.5px;font-weight:600;color:var(--text-main);line-height:1.35}.dash-actmeta{font-size:10.5px;color:var(--text-muted);font-family:monospace}" +
    ".dash-empty-mini{color:var(--text-muted);font-size:12.5px;padding:8px 2px}" +
    ".dash-links{display:flex;flex-direction:column;gap:6px}" +
    ".dash-link{display:flex;align-items:center;gap:10px;padding:10px 10px;border-radius:10px;text-decoration:none;color:var(--text-main);font-weight:700;font-size:13px;border:1px solid transparent}" +
    ".dash-link:hover{background:var(--primary-light);border-color:var(--border)}.dash-link i:first-child{color:var(--maroon);font-size:19px}" +
    ".dash-link span{flex:1}.dash-link-chev{color:#cbd5e1!important;font-size:18px!important}" +
    ".dash-error{text-align:center;padding:30px;color:var(--text-muted);font-weight:600;background:#fff;border:1px dashed var(--border);border-radius:14px}.dash-error i{font-size:32px;color:var(--maroon);display:block;margin-bottom:8px}" +
    "@media(max-width:640px){.dash-hero{grid-template-columns:1fr 1fr}}" +
    "@media(max-width:420px){.dash-hero{grid-template-columns:1fr}}";
    var st = document.createElement("style"); st.id = "dash-css"; st.textContent = css; document.head.appendChild(st);
  }
})();

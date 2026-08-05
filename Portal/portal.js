/* =========================================================================
   portal.js — the ONE shared script. Plain (no framework).
   Reads settings from config.js (window.PORTAL_CONFIG).
   Exposes a single global: window.Portal  (and window.perf for the console)
   ========================================================================= */
(function () {
  "use strict";

  var CONFIG = window.PORTAL_CONFIG || {};
  if (!CONFIG.APPS_SCRIPT_URL) console.warn("[Portal] Missing config.js / APPS_SCRIPT_URL");
  var S = CONFIG.SCHOOL || {};
  var WA = "https://wa.me/" + (S.whatsapp || "") +
    "?text=" + encodeURIComponent("Hello, I would like to know more about " + (S.name || "the school") + ".");

  /* ---------------- helpers ---------------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function pad(n) { return String(n).padStart(2, "0"); }
  function todayIso() { var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function thisMonth() { var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1); }
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function prettyDate(iso) { if (!iso) return ""; var p = String(iso).split("-"); if (p.length !== 3) return iso; return p[2] + " " + MON[+p[1] - 1] + " " + p[0]; }
  function monthLabel(m) { var p = String(m || "").split("-"); if (p.length !== 2) return m; return ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][+p[1] - 1] + " " + p[0]; }
  function isSunday(iso) { var p = String(iso).split("-"); if (p.length !== 3) return false; return new Date(+p[0], +p[1] - 1, +p[2]).getDay() === 0; }
  var GRADE_ORDER = { NURSERY: 1, LKG: 2, UKG: 3 };
  function gradeWeight(n) { var k = String(n).toUpperCase().trim(); if (GRADE_ORDER[k] !== undefined) return GRADE_ORDER[k]; var m = k.match(/Grade[- ]?(\d+)/i) || k.match(/\d+/); return m ? 100 + parseInt(m[1] || m[0], 10) : 999; }
  function sortGrades(arr, get) { return arr.sort(function (a, b) { return gradeWeight(get ? get(a) : a) - gradeWeight(get ? get(b) : b); }); }

  /* ---------------- overlay ---------------- */
  var _ovEl = null, _ovCount = 0;
  function _ovEnsure() { if (_ovEl) return _ovEl; _ovEl = document.createElement("div"); _ovEl.id = "pv2-overlay"; _ovEl.innerHTML = '<div class="pv2-overlay-card"><i class="material-icons">sync</i><span id="pv2-overlay-text">Working…</span></div>'; document.body.appendChild(_ovEl); return _ovEl; }
  function overlay(on, text) { _ovEnsure(); if (on) { _ovCount++; if (text) _ovEl.querySelector("#pv2-overlay-text").textContent = text; _ovEl.classList.add("show"); document.documentElement.classList.add("pv2-locked"); } else { _ovCount = Math.max(0, _ovCount - 1); if (_ovCount === 0) { _ovEl.classList.remove("show"); document.documentElement.classList.remove("pv2-locked"); } } }

  /* ---------------- perf: real before/after measurement (no badge) ---------- */
  var perf = {
    marks: [],
    baseline: (function () { try { return JSON.parse(localStorage.getItem("pv2_perf_base")) || {}; } catch (e) { return {}; } })(),
    _saveBase: function () { try { localStorage.setItem("pv2_perf_base", JSON.stringify(this.baseline)); } catch (e) {} },
    record: function (label, ms, mode) {
      mode = mode || "cold";
      this.marks.push({ label: label, ms: ms, mode: mode, at: Date.now() });
      if (mode === "cold" && this.baseline[label] == null) { this.baseline[label] = ms; this._saveBase(); }
      var base = this.baseline[label], extra = "";
      if (base && ms < base) extra = " (baseline " + base + "ms → " + Math.round((1 - ms / base) * 100) + "% faster)";
      else if (base && ms > base) extra = " (baseline " + base + "ms)";
      if (CONFIG.PERF) console.info("[PERF] " + label + ": " + ms + "ms" + extra + " [" + mode + "]");
      return { ms: ms, baseline: base || null, improvement: (base && ms < base) ? Math.round((1 - ms / base) * 100) : 0 };
    },
    resetBaseline: function (label) { if (label) delete this.baseline[label]; else this.baseline = {}; this._saveBase(); console.info("[PERF] baseline reset", label || "(all)"); },
    report: function () {
      var by = {}; this.marks.forEach(function (r) { (by[r.label] = by[r.label] || []).push(r); });
      var self = this;
      var rows = Object.keys(by).map(function (label) {
        var arr = by[label];
        var cold = arr.filter(function (r) { return r.mode === "cold"; }).map(function (r) { return r.ms; });
        var warm = arr.filter(function (r) { return r.mode === "warm"; }).map(function (r) { return r.ms; });
        var avg = function (a) { return a.length ? Math.round(a.reduce(function (x, y) { return x + y; }, 0) / a.length) : "-"; };
        var base = self.baseline[label], bestWarm = warm.length ? Math.min.apply(null, warm) : null;
        return { operation: label, baseline_ms: base != null ? base : "-", cold_avg_ms: avg(cold), warm_avg_ms: avg(warm), best_warm_ms: bestWarm != null ? bestWarm : "-", improvement: (base && bestWarm != null) ? (Math.round((1 - bestWarm / base) * 100) + "%") : "-", samples: arr.length };
      });
      console.table(rows); return rows;
    },
    clear: function () { this.marks = []; }
  };

  /* ---------------- api: one fetch() to Apps Script ---------------- */
  function rpc(fn, args) {
    return fetch(CONFIG.APPS_SCRIPT_URL + "?api=1", {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ fn: fn, args: args || [] }), redirect: "follow"
    }).then(function (r) { return r.text(); }).then(function (text) {
      var json; try { json = JSON.parse(text); } catch (e) { throw new Error("Unexpected server response: " + text.slice(0, 160)); }
      if (!json.ok) throw new Error(json.error || "Request failed");
      return json.data;
    });
  }
  function api(fn, args, opts) {
    opts = opts || {};
    var ov = opts.overlay !== false, t0 = performance.now();
    if (ov) overlay(true, opts.text || "Working…");
    return rpc(fn, args).finally(function () {
      if (ov) overlay(false);
      if (opts.perf) perf.record(opts.perf, Math.round(performance.now() - t0), opts.mode || "cold");
    });
  }

  /* ---------------- session ---------------- */
  var Session = {
    get: function () { try { return JSON.parse(sessionStorage.getItem("pv2_session")); } catch (e) { return null; } },
    set: function (s) { sessionStorage.setItem("pv2_session", JSON.stringify(s)); },
    clear: function () { sessionStorage.removeItem("pv2_session"); },
    require: function () { var s = this.get(); if (!s) { location.replace("login.html"); return null; } return s; },
    logout: function () { this.clear(); location.href = "login.html"; }
  };

  /* ---------------- tiny TTL cache ---------------- */
  var Cache = {
    set: function (k, v, ttl) { try { localStorage.setItem("pv2_" + k, JSON.stringify({ v: v, exp: Date.now() + ttl })); } catch (e) {} },
    get: function (k) { try { var r = JSON.parse(localStorage.getItem("pv2_" + k)); if (!r) return null; if (Date.now() > r.exp) { localStorage.removeItem("pv2_" + k); return null; } return r.v; } catch (e) { return null; } },
    clear: function (k) { try { localStorage.removeItem("pv2_" + k); } catch (e) {} }
  };

  /* ---------------- site chrome ---------------- */
  function _logo() { return '<img src="header-logo.png" alt="' + esc(S.name) + '" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';"><span class="fallback" style="display:none;"><i class="material-icons">school</i>' + esc(S.name) + '</span>'; }
  function renderChrome(opts) {
    opts = opts || {};
    var right = opts.app
      ? '<div class="header-actions"><a class="header-back" href="' + CONFIG.WEBSITE_URL + '">🌐 Website</a><span class="header-user profile-chip" title="' + esc(opts.userName || "") + '"><i class="material-icons">account_circle</i><strong>' + esc(opts.userName || "") + '</strong></span><button class="header-logout" id="pv2Logout"><i class="material-icons" style="font-size:16px;">logout</i> Log Out</button></div>'
      : '<div class="header-actions"><a class="header-back" href="' + CONFIG.WEBSITE_URL + '">← Back to Website</a></div>';
    var head = document.createElement("div");
    head.innerHTML =
      '<div class="site-topbar"><div class="wrap"><a href="tel:' + S.phone + '">📞 ' + S.phone + '</a><span class="tb-hide-mobile">' + esc(S.address) + '</span><span class="tb-spacer tb-hide-mobile"></span><a class="tb-hide-mobile" href="mailto:' + S.email + '">✉️ ' + S.email + '</a><a class="tb-wa" href="' + WA + '" target="_blank" rel="noopener">💬 WhatsApp</a></div></div>' +
      '<header class="site-header"><div class="wrap"><a class="site-brand" href="' + CONFIG.WEBSITE_URL + '">' + _logo() + '</a>' + right + '</div></header>';
    document.body.insertBefore(head, document.body.firstChild);
    var foot = document.createElement("div");
    foot.innerHTML =
      '<footer class="site-footer"><div class="wrap"><div class="f-brand"><img class="f-logo" src="header-logo.png" alt="' + esc(S.name) + '" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'inline-flex\';"><span class="f-fallback" style="display:none;align-items:center;gap:8px;"><i class="material-icons" style="color:#fff;">school</i>' + esc(S.name) + '</span></div><nav class="f-links"><a href="' + CONFIG.WEBSITE_URL + '">Home</a><a href="' + WA + '" target="_blank" rel="noopener">WhatsApp</a><a href="tel:' + S.phone + '">' + S.phone + '</a></nav><div class="f-copy">© <span>' + new Date().getFullYear() + '</span> ' + esc(S.name) + ', ' + esc(S.city) + '. Digital Portal.</div></div></footer>' +
      '<a class="fab-wa" href="' + WA + '" target="_blank" rel="noopener" title="Chat on WhatsApp">💬</a>';
    document.body.appendChild(foot);
    var lo = document.getElementById("pv2Logout"); if (lo) lo.addEventListener("click", function () { Session.logout(); });
  }

  /* ---------------- navigation ----------------
     Real pages: attendance (+ attendance-month via sub-tab), homework,
     attendance-log, staff-attendance, holidays, syllabus, examinations,
     examinations-tracker, fees. Others → coming-soon.html.
     mgmt hides from teachers; teacherOnly hides from Management. */
  var MENU = [
    { id: "attendance",  label: "Student Attendance",       icon: "assignment_turned_in", href: "attendance.html",           perm: "Daily Student Attendance", desc: "Daily attendance · Monthly sheets" },
    { id: "homework",    label: "Digital Homework Diary",   icon: "menu_book",            href: "homework.html",             perm: "Digital Homework Diary", desc: "Assign homework · Review submissions" },
    { id: "attlog",      label: "My Attendance Log",        icon: "pending_actions",      href: "attendance-log.html",       perm: "My Attendance Log", teacherOnly: true, desc: "Your punches · Monthly timesheet" },
    { id: "stafftrack",  label: "Staff Attendance",         icon: "groups",               href: "staff-attendance.html",     perm: "Staff Attendance Tracker", mgmt: true, desc: "Monitor punches · Attendance summary" },
    { id: "holidays",    label: "Holidays Management",       icon: "event_busy",           href: "holidays.html",             perm: "Holidays Management", mgmt: true, desc: "Holiday calendar · Add & manage" },
    { id: "syllabus",    label: "Syllabus Tracker",         icon: "fact_check",           href: "syllabus.html",             perm: "Syllabus Tracker", desc: "Lesson progress · Completion tracking" },
    { id: "exams",       label: "Examinations Management",  icon: "emoji_events",         href: "examinations.html",         perm: "Examinations Management", mgmt: true, desc: "Schedule exams · Set syllabus" },
    { id: "examstrack",  label: "Examinations Tracker",     icon: "event_available",      href: "examinations-tracker.html", perm: "Examinations Tracker", teacherOnly: true, desc: "Upcoming exams · Syllabus readiness" },
    { id: "fees",        label: "Fee Ledger Database",      icon: "payments",             href: "fees.html",                 perm: "Fee Ledger Database", mgmt: true, desc: "Student fee records · Payment history" },
    { id: "dashboard",   label: "Management Dashboard",     icon: "dashboard",            soon: true, perm: "Management Dashboard", mgmt: true, desc: "School-wide analytics overview" }
  ];

  /* Sub-tabs group two+ pages under one sidebar module. Key = sidebar nav id. */
  var SUBTABS = {
    attendance: [
      { id: "attendance", label: "Daily Entry",    icon: "assignment_turned_in", href: "attendance.html" },
      { id: "attmonth",   label: "Monthly Sheet",  icon: "edit_calendar",        href: "attendance-month.html", mgmt: true }
    ]
  };
  function _groupOf(activeId) {
    var found = null;
    Object.keys(SUBTABS).forEach(function (k) { if (SUBTABS[k].some(function (t) { return t.id === activeId; })) found = k; });
    return found;
  }

  function _visibleMenu(session) {
    var isMgmt = session.role === "Management", perms = session.permissions || {};
    return MENU.filter(function (m) {
      if (Object.prototype.hasOwnProperty.call(perms, m.perm)) { if (m.mgmt && !isMgmt) return false; if (m.teacherOnly && isMgmt) return false; return !!perms[m.perm]; }
      if (m.mgmt) return isMgmt;
      if (m.teacherOnly) return !isMgmt;
      return true;
    });
  }
  function _href(m) { return m.soon ? ("coming-soon.html?m=" + encodeURIComponent(m.label)) : m.href; }
  function renderNav(activeId, session) {
    var items = _visibleMenu(session);
    var eff = _groupOf(activeId) || activeId; // sub-tab pages highlight their group's sidebar item
    var side = document.getElementById("nav");
    if (side) side.innerHTML = '<div class="pv2-sidebar-inner"><div class="pv2-sidebar-title">Portal Modules</div>' + items.map(function (m) { return '<a class="pv2-navitem ' + (m.id === eff ? "active" : "") + '" href="' + _href(m) + '"><i class="material-icons">' + m.icon + '</i><span>' + m.label + '</span>' + (m.soon ? '<em class="pv2-soon">Soon</em>' : "") + '</a>'; }).join("") + '</div>';
    var mob = document.getElementById("mobileNav");
    var SHORT = { home: "Home", attendance: "Attendance", homework: "Homework", attlog: "My Log", stafftrack: "Staff", holidays: "Holidays", syllabus: "Syllabus", exams: "Exams", examstrack: "Exam Track", fees: "Fees", dashboard: "Dashboard" };
    // Mobile bottom navigation: a permanent "Home" (dashboard launcher) followed
    // by the same permission-filtered modules used on desktop. No duplicate logic.
    var homeItem = '<a class="' + (activeId === "home" ? "active" : "") + '" href="dashboard.html"><i class="material-icons">home</i><span>Home</span></a>';
    if (mob) mob.innerHTML = homeItem + items.filter(function (m) { return !m.soon; }).map(function (m) { return '<a class="' + (m.id === eff ? "active" : "") + '" href="' + _href(m) + '"><i class="material-icons">' + m.icon + '</i><span>' + (SHORT[m.id] || m.label) + '</span></a>'; }).join("");
  }

  /* Inject a Daily/Monthly-style sub-tab bar above #view (no page-script change). */
  function _subtabCss() {
    if (document.getElementById("pv2-subtab-css")) return;
    var css = ".pv2-subtabs{display:inline-flex;gap:6px;background:#f1f5f9;border:1px solid var(--border);border-radius:999px;padding:4px;margin:0 0 18px}" +
      ".pv2-subtab{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:999px;font-weight:700;font-size:13px;color:var(--text-muted)}" +
      ".pv2-subtab i{font-size:17px}.pv2-subtab:hover{color:var(--maroon)}.pv2-subtab.active{background:var(--maroon);color:#fff}.pv2-subtab.active i{color:#fff}";
    var st = document.createElement("style"); st.id = "pv2-subtab-css"; st.textContent = css; document.head.appendChild(st);
  }
  function renderSubtabs(activeId, session) {
    var group = _groupOf(activeId); if (!group) return;
    var isMgmt = session.role === "Management";
    var tabs = SUBTABS[group].filter(function (t) { return t.mgmt ? isMgmt : (t.teacherOnly ? !isMgmt : true); });
    if (tabs.length < 2) return; // nothing to switch between
    var main = document.querySelector(".app-main"), view = document.getElementById("view");
    if (!main || !view) return;
    _subtabCss();
    var bar = document.createElement("nav"); bar.className = "pv2-subtabs";
    bar.innerHTML = tabs.map(function (t) { return '<a class="pv2-subtab ' + (t.id === activeId ? "active" : "") + '" href="' + t.href + '"><i class="material-icons">' + t.icon + '</i>' + t.label + '</a>'; }).join("");
    main.insertBefore(bar, view);
  }

  function openModal(id) { var m = document.getElementById(id); if (m) m.classList.add("show"); }
  function closeModal(id) { var m = document.getElementById(id); if (m) m.classList.remove("show"); }

  /* ---------------- shared module helper (single source of truth) ----------
     Returns ONLY the modules the logged-in user may see, reusing the exact
     permission logic (_visibleMenu) that drives the desktop sidebar. The
     dashboard launcher and the mobile bottom-nav both consume this, so the
     permission rules are never duplicated. `soon` modules are excluded
     because they are not launchable yet. */
  function getVisibleModules(session) {
    session = session || Session.get() || {};
    return _visibleMenu(session).filter(function (m) { return !m.soon; });
  }

  /* Mobile Admin = Management role on a small screen. On phones the admin
     dashboard is monitoring-only, so every write control is hidden via the
     `mobile-admin` body class (presentation layer only — backend untouched). */
  var MOBILE_ADMIN_BP = 900;
  function isMobileAdmin(session) {
    session = session || Session.get();
    return !!(session && session.role === "Management" &&
      (window.innerWidth || document.documentElement.clientWidth) < MOBILE_ADMIN_BP);
  }
  function _applyReadOnlyClass(session) {
    var on = isMobileAdmin(session);
    document.body.classList.toggle("mobile-admin", on);
    return on;
  }

  function bootPage(activeId) {
    var session = Session.require(); if (!session) return null;
    renderChrome({ app: true, userName: session.name });
    renderNav(activeId, session); renderSubtabs(activeId, session);
    _applyReadOnlyClass(session);
    window.addEventListener("resize", function () { _applyReadOnlyClass(session); });
    return session;
  }

  /* Boot helper for the Dashboard (Home) launcher. The dashboard IS the
     navigation, so we deliberately DO NOT populate the left sidebar here and
     tag <body> with `dash-home` — CSS then hides the sidebar and lets the
     module grid use the full width. Opening any module calls bootPage()
     instead, which restores the normal sidebar. The mobile bottom-nav still
     renders (with Home highlighted) for quick thumb navigation. */
  function bootDashboard() {
    var session = Session.require(); if (!session) return null;
    document.body.classList.add("dash-home");
    renderChrome({ app: true, userName: session.name });
    renderNav("home", session); // fills the mobile bottom-nav (Home active) + desktop sidebar
    var side = document.getElementById("nav"); if (side) side.innerHTML = ""; // no duplicate sidebar on Home
    _applyReadOnlyClass(session);
    window.addEventListener("resize", function () { _applyReadOnlyClass(session); });
    return session;
  }

  window.Portal = {
    CONFIG: CONFIG, WA: WA, api: api, overlay: overlay, perf: perf,
    Session: Session, Cache: Cache,
    renderChrome: renderChrome, renderNav: renderNav, bootPage: bootPage,
    bootDashboard: bootDashboard, getVisibleModules: getVisibleModules, isMobileAdmin: isMobileAdmin,
    openModal: openModal, closeModal: closeModal,
    esc: esc, todayIso: todayIso, thisMonth: thisMonth, prettyDate: prettyDate, monthLabel: monthLabel, isSunday: isSunday, sortGrades: sortGrades
  };
  window.perf = perf; // console access
})();

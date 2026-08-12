/* =========================================================================
   attendance-month.js — Monthly Sheet tab of the Student Attendance module
   (Management only). Plain script; uses `Portal`. Backend (unchanged):
     getClasses(campusFilter)
     getMonthlyAttendanceMatrix(className, monthStr)
     saveMonthlyAttendanceMatrix(records)
   Codes: P = full present · A = full absent · M = morning only · N = afternoon only
   Sundays, full-day holidays and future dates are locked. Every past+today cell
   must be P/A/M/N before saving. Records are always live (never cached).
   Adding holidays now lives in the separate "Holidays Management" module.

   VISIBILITY UPDATE: the grid's height is now scaling-proof (clamp on viewport)
   and rows are more compact, so many more students are visible before scrolling
   — even on PCs at 125%/150% Windows display scaling.
   ========================================================================= */
(function () {
  "use strict";
  var P = window.Portal;
  var session = P.bootPage("attmonth");
  if (!session) return;
  if (session.role !== "Management") { location.replace("attendance.html"); return; } // admin-only bulk editor
  injectCss();
  var esc = P.esc, $ = function (id) { return document.getElementById(id); };
  var me = session.name;

  var payload = null, holidays = {}, snapshot = null, activeDate = "", classes = [];

  $("view").innerHTML = shell();
  bind();
  loadClasses();

  function shell() {
    return '<div class="card wide-card">' +
      '<div class="mod-head"><div><span class="eyebrow">Management</span><h2 style="margin-bottom:4px;">Monthly Attendance Sheet</h2>' +
      '<p class="view-description" style="margin:0;">Fill or fix a whole month for one class in a single grid. Sundays, holidays and future dates are locked automatically. Add holidays in the <b>Holidays Management</b> module.</p></div></div>' +
      '<div class="mod-toolbar">' +
        '<div class="smart-selector"><div class="ss-icon"><i class="material-icons">groups</i></div><div class="ss-body"><div class="ss-label">Class</div><select id="amClass"><option value="">Loading…</option></select></div></div>' +
        '<div class="smart-selector"><div class="ss-icon"><i class="material-icons">calendar_month</i></div><div class="ss-body"><div class="ss-label">Month</div><input type="month" id="amMonth"></div></div>' +
        '<button class="btn btn-maroon" id="amLoad" style="width:auto;padding:12px 18px;"><i class="material-icons" style="color:#fff;">table_view</i> Load Sheet</button>' +
      '</div>' +
      '<div class="am-legendbar" id="amLegend" style="display:none;">' +
        '<span class="am-lbl">Quick-fill selected column:</span>' +
        '<button class="am-mini" data-q="P">P</button><button class="am-mini" data-q="A">A</button><button class="am-mini" data-q="M">M</button><button class="am-mini" data-q="N">N</button>' +
        '<span id="amActiveHint" class="am-lbl" style="margin-left:6px;"></span><span style="flex:1;"></span>' +
        '<span class="am-lg"><span class="sw" style="background:#ecfdf5;"></span>Present (P)</span>' +
        '<span class="am-lg"><span class="sw" style="background:#fef2f2;"></span>Absent (A)</span>' +
        '<span class="am-lg"><span class="sw" style="background:#fffbeb;"></span>Half (M/N)</span>' +
        '<span class="am-lg"><span class="sw" style="background:#fee2e2;"></span>Sunday / Holiday</span>' +
        '<span class="am-lg"><span class="sw" style="background:#f1f5f9;"></span>Future / Locked</span>' +
      '</div>' +
      '<div id="amValidation" class="am-validation"></div>' +
      '<div id="amLoader" style="display:none;text-align:center;padding:24px;color:var(--text-muted);font-weight:700;"><i class="material-icons" style="animation:spin 1s linear infinite;color:var(--maroon);vertical-align:middle;">sync</i> Loading monthly grid…</div>' +
      '<div id="amHost"></div>' +
      '<div class="am-savebar" id="amSavebar" style="display:none;">' +
        '<div class="ex-note" id="amHint">Totals update live. Every past + today cell must be P/A/M/N before saving. Future dates are locked.</div>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;"><button class="btn btn-secondary" id="amReset" style="width:auto;padding:11px 16px;"><i class="material-icons" style="color:var(--maroon);">restart_alt</i> Reset</button>' +
        '<button class="btn btn-success" id="amSave" style="width:auto;padding:11px 18px;"><i class="material-icons" style="color:#fff;">cloud_done</i> Save Monthly Attendance</button></div>' +
      '</div>' +
      '<div id="amPostSave" class="am-postsave" style="display:none;"></div>' +
    '</div>';
  }

  function bind() {
    $("amMonth").value = P.thisMonth();
    $("amLoad").addEventListener("click", loadGrid);
    $("amReset").addEventListener("click", askReset);
    $("amSave").addEventListener("click", saveGrid);
    Array.prototype.forEach.call(document.querySelectorAll("#amLegend .am-mini"), function (b) { b.addEventListener("click", function () { quickFill(b.getAttribute("data-q")); }); });
  }

  function loadClasses() {
    P.api("getClasses", [""], { text: "Loading classes…" }).then(function (cs) {
      classes = cs || []; P.sortGrades(classes);
      $("amClass").innerHTML = '<option value="">Select class…</option>' + classes.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + "</option>"; }).join("");
    }).catch(function () { $("amClass").innerHTML = '<option value="">Failed to load</option>'; });
  }

  /* ---------------- load + render grid ---------------- */
  function loadGrid() {
    var cls = $("amClass").value, month = $("amMonth").value;
    if (!cls || !month) { toast("Pick a class and month.", "err"); return; }
    payload = null; snapshot = null; holidays = {}; activeDate = "";
    $("amPostSave").style.display = "none"; $("amValidation").style.display = "none";
    $("amHost").innerHTML = ""; $("amSavebar").style.display = "none"; $("amLegend").style.display = "none";
    $("amLoader").style.display = "block";
    P.api("getMonthlyAttendanceMatrix", [cls, month], { overlay: false }).then(function (pl) {
      $("amLoader").style.display = "none";
      payload = pl || null; holidays = (pl && pl.holidays) ? pl.holidays : {};
      if (pl && pl.students) snapshot = JSON.stringify(pl.students);
      render();
    }).catch(function (e) { $("amLoader").style.display = "none"; $("amHost").innerHTML = '<div class="alert-warning" style="display:flex;"><i class="material-icons">warning</i><div>Failed to load: ' + esc(e.message || e) + "</div></div>"; });
  }

  function statusClass(v) { v = String(v || "").toUpperCase(); return v === "P" ? "s-p" : v === "A" ? "s-a" : (v === "M" || v === "N") ? "s-mn" : "s-blank"; }
  function isFuture(iso) { return String(iso || "") > P.todayIso(); }
  function blocked(dateKey, label) {
    if (String(label || "").toLowerCase() === "sun") return true;
    if (holidays[dateKey] && holidays[dateKey].full) return true;
    if (isFuture(dateKey)) return true;
    return false;
  }

  function render() {
    var host = $("amHost");
    if (!payload || !payload.students || !payload.students.length) { host.innerHTML = '<div class="am-empty">No students found for this class.</div>'; return; }
    var days = payload.days;
    var html = '<div class="am-wrap"><table class="am-table"><thead><tr><th class="roll">Roll</th><th class="nm">Student</th>';
    for (var i = 0; i < days.length; i++) {
      var d = days[i], sun = String(d.label).toLowerCase() === "sun", h = holidays[d.date], fut = isFuture(d.date);
      var thc = "", title = "";
      if (sun) { thc = "d-block"; title = "Sunday"; }
      else if (h && h.full) { thc = "d-block"; title = "Holiday: " + (h.reason || ""); }
      else if (h) { thc = "d-part"; title = (h.session || "Partial") + " holiday: " + (h.reason || ""); }
      else if (fut) { thc = "d-fut"; title = "Future date — locked"; }
      html += '<th class="' + thc + '" title="' + esc(title) + '" data-col="' + d.date + '"><div>' + d.day + '</div><div class="dl">' + esc(d.label) + '</div></th>';
    }
    html += "</tr></thead><tbody>";
    payload.students.forEach(function (s, r) {
      html += '<tr><td class="roll">' + esc(s.rollNo || (r + 1)) + '</td><td class="nm"><b>' + esc(s.name) + '</b><div class="id">ID: ' + esc(s.id) + "</div></td>";
      days.forEach(function (d) {
        var dis = blocked(d.date, d.label), val = (s.attendance && s.attendance[d.date]) ? s.attendance[d.date] : "";
        if (dis) val = "";
        html += '<td class="' + (dis ? cellBlockClass(d) : "") + '"><select class="am-sel ' + statusClass(val) + '" data-r="' + r + '" data-date="' + d.date + '" ' + (dis ? "disabled tabindex=-1" : "") + ">" +
          opt("", val) + opt("P", val) + opt("A", val) + opt("M", val) + opt("N", val) + "</select></td>";
      });
      html += "</tr>";
    });
    html += "</tbody><tfoot>";
    html += '<tr class="ft-m"><td class="roll"></td><td class="nm">Morning Present</td>' + days.map(function (d) { return '<td id="tm_' + d.date + '">0</td>'; }).join("") + "</tr>";
    html += '<tr class="ft-a"><td class="roll"></td><td class="nm">Afternoon Present</td>' + days.map(function (d) { return '<td id="ta_' + d.date + '">0</td>'; }).join("") + "</tr>";
    html += '<tr class="ft-avg"><td class="roll"></td><td class="nm">Day Average</td>' + days.map(function (d) { return '<td id="tv_' + d.date + '">0</td>'; }).join("") + "</tr>";
    html += "</tfoot></table></div>";
    host.innerHTML = html;
    Array.prototype.forEach.call(host.querySelectorAll(".am-sel"), function (sel) { sel.addEventListener("change", function () { cellChanged(sel); }); });
    Array.prototype.forEach.call(host.querySelectorAll("th[data-col]"), function (th) { th.addEventListener("click", function () { setActive(th.getAttribute("data-col")); }); });
    $("amSavebar").style.display = "flex"; $("amLegend").style.display = "flex";
    days.forEach(function (d) { recalc(d.date); });
  }
  function opt(v, cur) { return '<option value="' + v + '"' + (v === cur ? " selected" : "") + ">" + (v || "-") + "</option>"; }
  function cellBlockClass(d) { var sun = String(d.label).toLowerCase() === "sun", h = holidays[d.date]; if (sun || (h && h.full)) return "d-block"; if (isFuture(d.date)) return "d-fut"; if (h) return "d-part"; return ""; }

  function cellChanged(sel) {
    var v = String(sel.value || "").toUpperCase();
    sel.className = "am-sel " + statusClass(v);
    var td = sel.parentNode; if (td && td.classList) td.classList.remove("invalid");
    var r = +sel.getAttribute("data-r"), dateKey = sel.getAttribute("data-date");
    if (payload && payload.students[r]) payload.students[r].attendance[dateKey] = v;
    recalc(dateKey);
  }
  function recalc(dateKey) {
    if (!payload) return;
    var m = 0, a = 0;
    payload.students.forEach(function (s) { var v = String((s.attendance && s.attendance[dateKey]) || "").toUpperCase(); if (v === "P" || v === "M") m++; if (v === "P" || v === "N") a++; });
    var avg = (m + a) / 2;
    setT("tm_" + dateKey, m); setT("ta_" + dateKey, a); setT("tv_" + dateKey, Number.isInteger(avg) ? avg : avg.toFixed(1));
  }
  function setT(id, v) { var el = $(id); if (el) el.textContent = v; }

  function setActive(dateKey) {
    var d = (payload.days || []).filter(function (x) { return x.date === dateKey; })[0];
    if (!d || blocked(dateKey, d.label)) return;
    activeDate = dateKey; $("amActiveHint").textContent = "Active date: " + P.prettyDate(dateKey);
    // Visually mark the active column header so it's obvious which one quick-fill targets.
    Array.prototype.forEach.call(document.querySelectorAll(".am-table th[data-col]"), function (th) {
      th.classList.toggle("col-active", th.getAttribute("data-col") === dateKey);
    });
  }
  function quickFill(status) {
    if (!activeDate) { toast("Click a date column header first, then P/A/M/N.", "err"); return; }
    var nodes = document.querySelectorAll('.am-sel[data-date="' + activeDate + '"]:not([disabled])');
    Array.prototype.forEach.call(nodes, function (n) { n.value = status; cellChanged(n); });
  }

  /* ---------------- save + validation ---------------- */
  function saveGrid() {
    if (!payload) return;
    var cls = payload.className, days = payload.days, students = payload.students;
    Array.prototype.forEach.call(document.querySelectorAll("td.invalid"), function (td) { td.classList.remove("invalid"); });
    $("amValidation").style.display = "none";
    var missing = {}, records = [];
    students.forEach(function (s, i) {
      days.forEach(function (d) {
        if (blocked(d.date, d.label)) return;
        var v = String((s.attendance && s.attendance[d.date]) || "").toUpperCase();
        if (v !== "P" && v !== "A" && v !== "M" && v !== "N") {
          (missing[d.date] = missing[d.date] || []).push(s.name);
          var sel = document.querySelector('.am-sel[data-r="' + i + '"][data-date="' + d.date + '"]');
          if (sel && sel.parentNode) sel.parentNode.classList.add("invalid");
          return;
        }
        records.push({ date: d.date, "class": cls, id: s.id, name: s.name, status: v, teacher: me });
      });
    });
    var keys = Object.keys(missing);
    if (keys.length) {
      keys.sort();
      var html = '<strong><i class="material-icons" style="vertical-align:middle;color:#b91c1c;font-size:18px;">error_outline</i> Please mark P/A/M/N for every past + today date before saving.</strong><ul>';
      keys.forEach(function (dk) { var names = missing[dk], lbl = names.length > 4 ? (names.slice(0, 4).join(", ") + " (+" + (names.length - 4) + " more)") : names.join(", "); html += "<li>" + dmy(dk) + " — " + names.length + " student" + (names.length === 1 ? "" : "s") + ": " + esc(lbl) + "</li>"; });
      html += "</ul>";
      var b = $("amValidation"); b.innerHTML = html; b.style.display = "block";
      var first = document.querySelector("td.invalid"); if (first && first.scrollIntoView) first.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!records.length) { toast("No editable cells this month (only Sundays/holidays).", "err"); return; }
    var sb = $("amSave"); sb.disabled = true; sb.innerHTML = '<i class="material-icons" style="color:#fff;">sync</i> Saving…';
    P.api("saveMonthlyAttendanceMatrix", [records]).then(function (res) {
      postSave(cls, payload.monthStr, records.length, (res && res.updated) || 0, (res && res.added) || 0);
    }).catch(function (e) { toast("Save failed: " + (e.message || e), "err"); }).finally(function () { sb.disabled = false; sb.innerHTML = '<i class="material-icons" style="color:#fff;">cloud_done</i> Save Monthly Attendance'; });
  }
  function postSave(cls, month, cells, updated, added) {
    $("amSavebar").style.display = "none"; $("amLegend").style.display = "none"; $("amValidation").style.display = "none";
    $("amHost").innerHTML = ""; payload = null; snapshot = null;
    $("amPostSave").innerHTML =
      '<h4><i class="material-icons" style="color:#065f46;vertical-align:middle;">check_circle</i> Monthly attendance saved</h4>' +
      '<p style="font-size:13px;color:#064e3b;font-weight:600;margin:6px 0 12px;">Saved for <b>' + esc(cls) + '</b> — <b>' + esc(P.monthLabel(month)) + '</b>.</p>' +
      '<div class="am-summary"><div class="st"><label>Cells filled</label><span>' + cells + '</span></div><div class="st"><label>New rows added</label><span>' + added + '</span></div><div class="st"><label>Rows updated</label><span>' + updated + '</span></div></div>' +
      '<div style="margin-top:14px;"><button class="btn btn-maroon" id="amNew" style="width:auto;padding:10px 16px;"><i class="material-icons" style="color:#fff;">refresh</i> Start New Entry</button></div>';
    $("amPostSave").style.display = "block";
    $("amNew").addEventListener("click", function () { $("amPostSave").style.display = "none"; });
    toast("Saved " + (added + updated) + " session rows.", "ok");
  }

  function askReset() { if (!payload || !snapshot) return; if (!confirm("Discard all changes and restore the values loaded from the server? Nothing has been saved yet.")) return; doReset(); }
  function doReset() {
    try {
      var orig = JSON.parse(snapshot), byId = {};
      orig.forEach(function (s) { byId[s.id] = s; });
      payload.students.forEach(function (s) { var o = byId[s.id]; if (o && o.attendance) { s.attendance = {}; for (var k in o.attendance) if (Object.prototype.hasOwnProperty.call(o.attendance, k)) s.attendance[k] = o.attendance[k]; } });
      render(); toast("Restored to the loaded values.", "ok");
    } catch (e) { toast("Reset failed: " + (e.message || e), "err"); }
  }

  /* ---------------- helpers ---------------- */
  function dmy(iso) { var p = String(iso || "").split("-"); return p.length === 3 ? (p[2] + "/" + p[1]) : iso; }
  function toast(msg, kind) {
    var t = $("amToast"); if (!t) { t = document.createElement("div"); t.id = "amToast"; document.body.appendChild(t); }
    var icon = kind === "err" ? "error" : (kind === "ok" ? "check_circle" : "info");
    t.className = ""; if (kind) t.classList.add(kind);
    t.innerHTML = '<i class="material-icons">' + icon + '</i><span>' + esc(msg) + "</span>";
    void t.offsetWidth; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }

  function injectCss() {
    if (document.getElementById("am-css")) return;
    var css =
      ".am-legendbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:6px 0 12px;padding:8px 10px;border:1px solid var(--border);border-radius:12px;background:#f8fafc}" +
      ".am-legendbar .am-lbl{font-size:12px;font-weight:800;color:var(--text-muted)}" +
      ".am-mini{border:1px solid var(--border);background:#fff;border-radius:10px;padding:6px 12px;font-size:12px;font-weight:800;cursor:pointer;color:var(--text-main)}.am-mini:hover{border-color:var(--maroon);color:var(--maroon)}" +
      ".am-lg{display:inline-flex;gap:6px;align-items:center;font-size:11px;color:var(--text-muted)}.am-lg .sw{width:14px;height:14px;border-radius:4px;display:inline-block;border:1px solid rgba(0,0,0,.05)}" +
      ".am-validation{display:none;background:#fef2f2;border:1px solid #fca5a5;color:#991b1b;padding:12px 14px;border-radius:12px;margin:10px 0;font-size:13px;font-weight:700}.am-validation ul{margin:6px 0 0 18px;padding:0;font-weight:600;font-size:12px}" +
      // ---- SCROLL AREA: scaling-proof height so many rows show on every PC ----
      // Height grows with the viewport but never collapses: min 460px, target 68vh,
      // cap 1200px. This is what fixes the "only 2 rows on another PC" problem.
      ".am-wrap{overflow:auto;height:clamp(460px,68vh,1200px);border:1px solid var(--border);border-radius:14px;background:#fff;position:relative;overscroll-behavior:contain}" +
      ".am-table{width:max-content;min-width:100%;border-collapse:separate;border-spacing:0;font-size:12px}" +
      // ---- Compact rows: less padding => more students per screen ----
      ".am-table th,.am-table td{border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;padding:3px 6px;text-align:center;white-space:nowrap;background:#fff}" +
      ".am-table thead th{position:sticky;top:0;z-index:5;background:#faf6f6;color:var(--maroon);font-weight:900;line-height:1.15}" +
      ".am-table td.roll,.am-table th.roll{position:sticky;left:0;z-index:4;background:#fff;min-width:46px;font-weight:800;color:#64748b}" +
      ".am-table td.nm,.am-table th.nm{position:sticky;left:46px;z-index:4;background:#fff;text-align:left;min-width:190px;max-width:240px}" +
      ".am-table td.nm b{font-size:12.5px;line-height:1.2}.am-table td.nm .id{font-size:10px;color:#94a3b8}" +
      ".am-table thead th.roll,.am-table thead th.nm{z-index:7;background:#faf6f6}" +
      ".am-table th.d-block{background:#fee2e2!important;color:#991b1b}.am-table th.d-part{background:#fff7ed!important;color:#9a3412}.am-table th.d-fut{background:#f1f5f9!important;color:#64748b}" +
      ".am-table td.d-block{background:#fff5f5!important}.am-table td.d-part{background:#fff7ed!important}.am-table td.d-fut{background:#f8fafc!important}" +
      ".am-table th .dl{font-size:10px;color:#94a3b8;font-weight:600}" +
      ".am-table th[data-col]{cursor:pointer}.am-table th[data-col]:hover{background:#f3e9e9}" +
      ".am-table th.col-active{background:#8a1d21!important;color:#fff!important}.am-table th.col-active .dl{color:#f3d6d8!important}" +
      // ---- Compact select cells ----
      ".am-sel{width:50px;border:1px solid #d1d5db;border-radius:8px;padding:4px 3px;font-weight:900;text-align:center;outline:none;background:#fff;appearance:auto}" +
      ".am-sel.s-p{background:#ecfdf5!important;color:#047857!important;border-color:#86efac!important}.am-sel.s-a{background:#fef2f2!important;color:#b91c1c!important;border-color:#fecaca!important}.am-sel.s-mn{background:#fffbeb!important;color:#92400e!important;border-color:#fde68a!important}.am-sel.s-blank{background:#f8fafc!important;color:#94a3b8!important}" +
      ".am-table td.invalid{box-shadow:inset 0 0 0 2px #ef4444}" +
      // ---- Sticky totals footer (offsets tuned to the compact row height ~30px) ----
      ".am-table tfoot td{position:sticky;z-index:3;background:#faf6f6;font-weight:900;color:#0f172a;padding:4px 6px}" +
      ".am-table tfoot tr.ft-m td{bottom:60px}.am-table tfoot tr.ft-a td{bottom:30px}.am-table tfoot tr.ft-avg td{bottom:0;background:#eef2ff;color:#3730a3}" +
      ".am-table tfoot td.roll{left:0;z-index:6}.am-table tfoot td.nm{left:46px;z-index:6}" +
      ".am-savebar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:14px;flex-wrap:wrap}" +
      ".am-postsave{margin:16px 0;padding:20px;border-radius:14px;background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:1px solid #86efac}.am-postsave h4{margin:0;color:#065f46;font-size:15px}" +
      ".am-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:4px}.am-summary .st{background:#fff;padding:12px 14px;border-radius:10px}.am-summary .st label{display:block;font-size:11px;text-transform:uppercase;color:#065f46;font-weight:800;letter-spacing:.4px;margin-bottom:4px}.am-summary .st span{font-size:20px;font-weight:900;color:#0f172a}" +
      ".am-empty{text-align:center;padding:24px;color:var(--text-muted);font-weight:600;background:#fff;border:1px dashed var(--border);border-radius:14px}" +
      ".ex-note{font-size:13px;color:var(--text-muted)}" +
      "#amToast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%) translateY(20px);z-index:99999;background:#14171f;color:#fff;padding:12px 18px;border-radius:12px;font-size:14px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.25);display:flex;align-items:center;gap:8px;opacity:0;pointer-events:none;transition:opacity .25s ease,transform .25s ease;max-width:88vw}#amToast.show{opacity:1;transform:translateX(-50%) translateY(0)}#amToast.ok{background:#065f46}#amToast.err{background:#991b1b}#amToast i{font-size:18px}" +
      // ---- Responsive: give short laptops even more of the screen ----
      "@media(max-height:800px){.am-wrap{height:clamp(420px,74vh,900px)}}" +
      "@media(max-width:900px){.am-table td.nm,.am-table th.nm{min-width:150px}.am-wrap{height:clamp(380px,66vh,900px)}}";
    var st = document.createElement("style"); st.id = "am-css"; st.textContent = css; document.head.appendChild(st);
  }
})();

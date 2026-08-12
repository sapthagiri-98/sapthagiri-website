/* staff-attendance.js — Staff Attendance (Management). Plain script; uses `Portal`.
   Backend (unchanged): getManagementMonthlyBulkPayload("YYYY-MM") which returns
   { success, calendarMap:{date:{Present:[],Late:[],Absent:[],HalfDay:[]}},
     summaryReport:[{name,designation,present,absent,late,halfDay,totalLeaves}] }.
   Wording simplified. The month payload is cached (CONFIG.MONTH_TTL_MS) so a
   second view is instant — the console + inline line show before/after timing.
   Refresh bypasses the cache. */
(function () {
  "use strict";
  var P = window.Portal;
  var session = P.bootPage("stafftrack");
  if (!session) return;

  var esc = P.esc, prettyDate = P.prettyDate, monthLabel = P.monthLabel;
  var $ = function (id) { return document.getElementById(id); };
  var monthCache = {};   // month -> payload (in-memory)
  var current = null;    // current month payload
  var drillDate = "";

  $("view").innerHTML = shell();
  bind();
  loadMonth(P.thisMonth(), false);

  function shell() {
    return '' +
    '<div class="card wide-card">' +
      '<div class="mod-head"><div><span class="eyebrow">Management</span>' +
        '<h2 style="margin-bottom:4px;">Staff Attendance</h2>' +
        '<p class="view-description" style="margin:0;">See who was present, late or absent each day — plus a simple monthly summary.</p></div></div>' +
      '<div class="mod-toolbar">' +
        '<div class="smart-selector"><div class="ss-icon"><i class="material-icons">calendar_month</i></div>' +
          '<div class="ss-body"><div class="ss-label">Month</div><input type="month" id="saMonth"></div></div>' +
        '<button class="refresh-btn" id="saRefresh"><i class="material-icons" style="font-size:16px;">refresh</i> Refresh</button>' +
      '</div>' +
      '<div class="timing-line" id="saTiming"></div>' +
      '<div class="legend">' +
        '<span class="lg"><span class="dot d-green"></span>Present</span>' +
        '<span class="lg"><span class="dot d-orange"></span>Late</span>' +
        '<span class="lg"><span class="dot d-purple"></span>Half day</span>' +
        '<span class="lg"><span class="dot d-red"></span>Absent</span>' +
        '<span class="lg" style="color:var(--text-muted);">Tap any day for the name lists.</span>' +
      '</div>' +
      '<div class="cal-head"><div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div></div>' +
      '<div class="cal-grid" id="saGrid"></div>' +
      '<div class="group-head" style="margin-top:26px;"><i class="material-icons" style="font-size:18px;">summarize</i> Monthly Summary</div>' +
      '<div id="saSummary"></div>' +
    '</div>' +
    dayModal();
  }
  function dayModal() {
    return '<div class="modal-overlay" id="saDayModal"><div class="modal-content" style="max-width:560px;">' +
      '<div class="modal-header-container"><h3 id="saDayTitle">Staff on this day</h3><button class="modal-close-icon" data-close="saDayModal">&times;</button></div>' +
      '<div class="day-drill-tabs" id="saDayTabs"></div>' +
      '<div id="saDayBody"></div>' +
      '<button class="btn btn-secondary" data-close="saDayModal" style="margin-top:16px;">Close</button></div></div>';
  }

  function bind() {
    var m = $("saMonth"); m.value = P.thisMonth();
    m.addEventListener("change", function () { loadMonth(m.value, false); });
    $("saRefresh").addEventListener("click", function () { loadMonth($("saMonth").value, true); });
    Array.prototype.forEach.call(document.querySelectorAll("[data-close]"), function (b) { b.addEventListener("click", function () { P.closeModal(b.getAttribute("data-close")); }); });
    Array.prototype.forEach.call(document.querySelectorAll(".modal-overlay"), function (mm) { mm.addEventListener("click", function (e) { if (e.target === mm) P.closeModal(mm.id); }); });
  }

  /* ---------------- load month (cache = measurable win) ---------------- */
  function loadMonth(month, force) {
    var key = "staffmon_" + month, t0 = performance.now();
    if (!force) {
      var mem = monthCache[month] || P.Cache.get(key);
      if (mem) {
        var ms = Math.round(performance.now() - t0);
        P.perf.record("Load Staff Month", ms, "warm"); showTiming(ms, "warm");
        current = mem; render(mem, month); monthCache[month] = mem; return;
      }
    }
    $("saGrid").innerHTML = '<div class="inline-loader" style="grid-column:span 7;"><i class="material-icons">sync</i>Reading biometric records… this can take a moment.</div>';
    $("saSummary").innerHTML = "";
    P.api("getManagementMonthlyBulkPayload", [month], { text: "Loading staff attendance…" }).then(function (res) {
      var ms = Math.round(performance.now() - t0);
      P.perf.record("Load Staff Month", ms, "cold"); showTiming(ms, "cold");
      if (!res || !res.success) { $("saGrid").innerHTML = '<div class="att-empty" style="grid-column:span 7;"><i class="material-icons">error_outline</i>' + esc((res && res.error) || "Could not load records.") + '</div>'; return; }
      current = res; monthCache[month] = res; P.Cache.set(key, res, P.CONFIG.MONTH_TTL_MS); render(res, month);
    }).catch(function (e) { $("saGrid").innerHTML = '<div class="att-empty" style="grid-column:span 7;"><i class="material-icons">error_outline</i>' + esc(e.message || e) + '</div>'; });
  }
  function showTiming(ms, mode) {
    var base = P.perf.baseline["Load Staff Month"], el = $("saTiming");
    if (mode === "warm" && base) el.innerHTML = "⚡ Loaded from cache in <b>" + ms + " ms</b> — first load was " + base + " ms (" + Math.round((1 - ms / base) * 100) + "% faster).";
    else el.innerHTML = "⏱ Loaded in " + ms + " ms." + (base ? "" : " Re-open this month to load instantly from cache.");
  }

  /* ---------------- render calendar + summary ---------------- */
  function render(res, month) {
    var map = res.calendarMap || {};
    var keys = Object.keys(map).sort();
    var grid = $("saGrid");
    if (keys.length === 0) { grid.innerHTML = '<div class="att-empty" style="grid-column:span 7;"><i class="material-icons">inbox</i>No records for ' + esc(monthLabel(month)) + '.</div>'; }
    else {
      var pad = new Date(keys[0] + "T00:00:00").getDay(), html = "";
      for (var i = 0; i < pad; i++) html += '<div class="cal-day empty"></div>';
      keys.forEach(function (k) {
        var d = map[k], p = d.Present.length, l = d.Late.length, h = d.HalfDay.length, a = d.Absent.length;
        var mini = "";
        if (p) mini += '<span class="m-p">P ' + p + '</span>';
        if (l) mini += '<span class="m-l">L ' + l + '</span>';
        if (h) mini += '<span class="m-h">H ' + h + '</span>';
        if (a) mini += '<span class="m-a">A ' + a + '</span>';
        html += '<div class="cal-day" data-day="' + k + '"><div class="dnum">' + (+k.split("-")[2]) + '</div><div class="mini">' + mini + '</div></div>';
      });
      grid.innerHTML = html;
      Array.prototype.forEach.call(grid.querySelectorAll(".cal-day[data-day]"), function (c) { c.addEventListener("click", function () { openDay(c.getAttribute("data-day")); }); });
    }
    renderSummary(res.summaryReport || []);
  }
  function renderSummary(rep) {
    var host = $("saSummary");
    if (!rep.length) { host.innerHTML = '<div class="slip-empty">No staff records for this month.</div>'; return; }
    rep = rep.slice().sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
    var rows = rep.map(function (r) {
      return '<tr><td style="font-weight:700;">' + esc(r.name) + '</td><td style="color:var(--text-muted);">' + esc(r.designation || "") + '</td>' +
        '<td class="num"><span class="pill green">' + (r.present || 0) + '</span></td>' +
        '<td class="num"><span class="pill orange">' + (r.late || 0) + '</span></td>' +
        '<td class="num"><span class="pill purple">' + (r.halfDay || 0) + '</span></td>' +
        '<td class="num"><span class="pill red">' + (r.absent || 0) + '</span></td>' +
        '<td class="num" style="font-weight:800;color:var(--maroon);">' + (Number(r.totalLeaves) || 0) + '</td></tr>';
    }).join("");
    host.innerHTML = '<div class="friendly-wrap"><table class="friendly-table"><thead><tr>' +
      '<th>Name</th><th>Role</th><th style="text-align:center;">Present</th><th style="text-align:center;">Late</th><th style="text-align:center;">Half</th><th style="text-align:center;">Absent</th><th style="text-align:center;">Leaves Used</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p style="font-size:12px;color:var(--text-muted);margin-top:8px;">“Leaves Used” = absent days + half-days counted as ½, plus a ½ penalty for every 3 late arrivals.</p>';
  }

  /* ---------------- day drilldown ---------------- */
  function openDay(k) {
    drillDate = k;
    var d = (current.calendarMap || {})[k] || { Present: [], Late: [], Absent: [], HalfDay: [] };
    $("saDayTitle").textContent = "Staff on " + prettyDate(k);
    $("saDayTabs").innerHTML =
      tabBtn("Present", "t-green", d.Present.length) +
      tabBtn("Late", "t-orange", d.Late.length) +
      tabBtn("HalfDay", "t-purple", d.HalfDay.length) +
      tabBtn("Absent", "t-red", d.Absent.length);
    Array.prototype.forEach.call($("saDayTabs").querySelectorAll("button"), function (b) { b.addEventListener("click", function () { showTab(b.getAttribute("data-k")); }); });
    // open on the most useful non-empty tab
    var first = d.Late.length ? "Late" : (d.HalfDay.length ? "HalfDay" : (d.Absent.length ? "Absent" : "Present"));
    showTab(first);
    P.openModal("saDayModal");
  }
  function tabBtn(key, cls, n) {
    var label = { Present: "Present", Late: "Late", HalfDay: "Half day", Absent: "Absent" }[key];
    return '<button class="' + cls + '" data-k="' + key + '"><span class="n">' + n + '</span><span class="l">' + label + '</span></button>';
  }
  function showTab(key) {
    Array.prototype.forEach.call($("saDayTabs").querySelectorAll("button"), function (b) { b.classList.toggle("active", b.getAttribute("data-k") === key); });
    var d = (current.calendarMap || {})[drillDate] || {};
    var arr = (d[key] || []).slice().sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
    var showTimes = (key !== "Absent");
    if (arr.length === 0) { $("saDayBody").innerHTML = '<div class="slip-empty">No staff in this list for the day.</div>'; return; }
    $("saDayBody").innerHTML = arr.map(function (r, i) {
      var meta = showTimes
        ? ("In " + esc(r.in1 || "—") + " · Out " + esc(r.out1 || "—") + (String(r.status || "").indexOf("Late") >= 0 ? (" · " + esc(r.status)) : "") + (r.gaps && r.gaps !== "-" ? (" · " + esc(r.gaps)) : ""))
        : "No clock-in recorded";
      return '<div class="list-row"><div class="idx">' + (i + 1) + '</div><div class="who"><div class="nm">' + esc(r.name) + '</div><div class="meta">' + esc(r.designation || "") + ' — ' + meta + '</div></div></div>';
    }).join("");
  }
})();

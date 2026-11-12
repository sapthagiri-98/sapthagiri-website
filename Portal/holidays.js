/* =========================================================================
   holidays.js — Holidays Management (Management only). Plain script; uses
   `Portal`. Add a holiday (moved here from the monthly attendance page) with a
   clear choice of WHO is off:
     • Everyone (students + staff)        -> appliesToStaff = true
     • Students only (staff working day)  -> appliesToStaff = false
   Student attendance always blocks the listed classes/sessions (unchanged).
   Staff attendance only treats the day as off when appliesToStaff is true
   (needs the small Code.gs change described in the README).

   Backend:
     getClasses(campusFilter)                    (existing)
     addHolidayEntry(payload)                    (existing — extend to write appliesToStaff)
     getAllHolidays()                            (NEW — optional; list degrades gracefully)
     deleteHolidayRow(rowIndex)                  (NEW — optional)
   ========================================================================= */
(function () {
  "use strict";
  var P = window.Portal;
  var session = P.bootPage("holidays");
  if (!session) return;
  if (session.role !== "Management") { location.replace("attendance.html"); return; } // admin-only
  injectCss();
  var esc = P.esc, $ = function (id) { return document.getElementById(id); };
  var classes = [];

  $("view").innerHTML = shell();
  bind();
  loadClasses();
  loadList();

  function shell() {
    return '<div class="card wide-card">' +
      '<span class="eyebrow">Management</span><h2 style="margin-bottom:4px;">Holidays Management</h2>' +
      '<p class="view-description" style="margin:0 0 18px;">Declare holidays and choose whether staff also get the day off. This drives both student and staff attendance.</p>' +
      '<div class="hol-grid">' +
        addCard() +
        '<div class="hol-listcard"><div class="group-head" style="margin-top:0;"><i class="material-icons" style="font-size:18px;">event_note</i> Current Holidays</div><div id="holList"><div class="inline-loader"><i class="material-icons">sync</i>Loading…</div></div></div>' +
      '</div>' +
    '</div>';
  }
  function addCard() {
    return '<div class="hol-addcard"><div class="group-head" style="margin-top:0;"><i class="material-icons" style="font-size:18px;">add_circle</i> Add Holiday</div>' +
      '<div class="form-group"><label>Reason</label><input type="text" id="hlReason" placeholder="e.g. Summer Vacation, Republic Day"></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;"><div class="form-group"><label>From</label><input type="date" id="hlFrom"></div><div class="form-group"><label>To</label><input type="date" id="hlTo"></div></div>' +
      '<div class="form-group"><label>Which students are off?</label><div class="hol-scope"><label><input type="radio" name="hlScope" value="ALL" checked> All Classes</label><label><input type="radio" name="hlScope" value="SELECTED"> Selected Classes</label></div>' +
        '<div id="hlClassGrid" class="hol-classgrid" style="display:none;"></div></div>' +
      '<div class="form-group"><label>Session</label><select id="hlSession"><option value="Full Day">Full Day (whole day off)</option><option value="Morning">Morning session off</option><option value="Afternoon">Afternoon session off</option><option value="Half Day">Half Day (afternoon off)</option></select></div>' +
      '<div class="form-group"><label>Who is off?</label>' +
        '<div class="hol-who">' +
          '<label class="on"><input type="radio" name="hlWho" value="ALL" checked><span><b>Everyone</b> — students &amp; staff</span></label>' +
          '<label><input type="radio" name="hlWho" value="STUDENTS"><span><b>Students only</b> — staff working day</span></label>' +
        '</div>' +
        '<div class="hol-hint"><i class="material-icons">info</i> “Students only” marks it a student holiday but a normal working day in Staff Attendance. (Staff are only affected by Full-Day holidays.)</div>' +
      '</div>' +
      '<div id="hlStatus" class="hol-status"></div>' +
      '<button class="btn btn-success" id="hlSave" style="width:100%;"><i class="material-icons" style="color:#fff;">save</i> Save Holiday</button></div>';
  }

  function bind() {
    $("hlFrom").value = P.todayIso(); $("hlTo").value = P.todayIso();
    Array.prototype.forEach.call(document.getElementsByName("hlScope"), function (r) { r.addEventListener("change", toggleScope); });
    Array.prototype.forEach.call(document.getElementsByName("hlWho"), function (r) { r.addEventListener("change", paintWho); });
    $("hlSave").addEventListener("click", saveHoliday);
  }
  function paintWho() {
    Array.prototype.forEach.call(document.querySelectorAll(".hol-who label"), function (l) { l.classList.toggle("on", l.querySelector("input").checked); });
  }
  function toggleScope() { $("hlClassGrid").style.display = (getScope() === "SELECTED") ? "grid" : "none"; }
  function getScope() { var s = "ALL"; Array.prototype.forEach.call(document.getElementsByName("hlScope"), function (r) { if (r.checked) s = r.value; }); return s; }
  function getWho() { var s = "ALL"; Array.prototype.forEach.call(document.getElementsByName("hlWho"), function (r) { if (r.checked) s = r.value; }); return s; }

  function loadClasses() {
    P.api("getClasses", [""], { overlay: false }).then(function (cs) {
      classes = cs || []; P.sortGrades(classes);
      $("hlClassGrid").innerHTML = classes.map(function (c) { return '<label><input type="checkbox" name="hlClass" value="' + esc(c) + '"> ' + esc(c) + "</label>"; }).join("");
    }).catch(function () {});
  }

  function saveHoliday() {
    var reason = ($("hlReason").value || "").trim(), from = $("hlFrom").value, to = $("hlTo").value, session2 = $("hlSession").value, scope = getScope();
    if (!reason) { status("Reason is required.", "err"); return; }
    if (!from || !to) { status("Both dates are required.", "err"); return; }
    if (from > to) { status("From date cannot be after To date.", "err"); return; }
    var list = [];
    if (scope === "SELECTED") { Array.prototype.forEach.call(document.getElementsByName("hlClass"), function (c) { if (c.checked) list.push(c.value); }); if (!list.length) { status("Pick at least one class or choose All Classes.", "err"); return; } }
    var appliesToStaff = (getWho() === "ALL");
    var b = $("hlSave"); b.disabled = true; b.innerHTML = '<i class="material-icons" style="color:#fff;">sync</i> Saving…';
    status("Saving…", "");
    P.api("addHolidayEntry", [{ reason: reason, dateFrom: from, dateTo: to, scope: scope, classes: list, session: session2, appliesToStaff: appliesToStaff }]).then(function (res) {
      if (res && res.success) {
        status("Holiday saved.", "ok");
        $("hlReason").value = "";
        loadList();
      } else status((res && res.error) || "Save failed.", "err");
    }).catch(function (e) { status(e.message || String(e), "err"); }).finally(function () { b.disabled = false; b.innerHTML = '<i class="material-icons" style="color:#fff;">save</i> Save Holiday'; });
  }
  function status(msg, kind) {
    var el = $("hlStatus"); if (!el) return;
    el.className = "hol-status " + (kind || ""); el.textContent = msg;
  }

  /* ---------------- existing holidays list ---------------- */
  var allHolidaysCache = [];
  var curMobileHolView = "list"; // "list" | "calendar"
  var calCurrentDate = new Date();

  function isMobile() {
    return (window.innerWidth || document.documentElement.clientWidth || 0) <= 900;
  }

  function loadList() {
    var host = $("holList");
    host.innerHTML = '<div class="inline-loader"><i class="material-icons">sync</i>Loading…</div>';
    P.api("getAllHolidays", [], { overlay: false }).then(function (list) {
      allHolidaysCache = list || [];
      renderList(allHolidaysCache);
    }).catch(function () {
      // backend function not present yet — form still works
      host.innerHTML = '<div class="hol-empty"><i class="material-icons">info</i>The holidays list needs the optional <b>getAllHolidays</b> backend function (see the README). You can still add holidays above.</div>';
    });
  }

  function renderList(list) {
    var host = $("holList");
    if (!host) return;

    if (isMobile()) {
      renderMobileHolidays(host, list);
      return;
    }

    // DESKTOP VIEW
    if (!list.length) { host.innerHTML = '<div class="hol-empty"><i class="material-icons">event_available</i>No holidays declared yet.</div>'; return; }
    host.innerHTML = list.map(function (h) {
      var range = (h.dateFrom === h.dateTo) ? P.prettyDate(h.dateFrom) : (P.prettyDate(h.dateFrom) + " → " + P.prettyDate(h.dateTo));
      var cls = String(h.classes || "").toUpperCase() === "ALL" ? "All classes" : esc(h.classes || "");
      var whoBadge = h.appliesToStaff ? '<span class="pill blue">Students + Staff</span>' : '<span class="pill orange">Students only</span>';
      var sess = esc(h.session || "Full Day");
      var del = (h.rowIndex != null) ? '<button class="hol-del" data-row="' + h.rowIndex + '" title="Delete"><i class="material-icons">delete</i></button>' : "";
      return '<div class="hol-item"><div class="hol-item-main"><div class="hol-reason">' + esc(h.reason || "Holiday") + '</div>' +
        '<div class="hol-meta">' + range + ' · ' + sess + ' · ' + cls + '</div>' +
        '<div class="hol-badges">' + whoBadge + '</div></div>' + del + '</div>';
    }).join("");
    Array.prototype.forEach.call(host.querySelectorAll(".hol-del"), function (b) { b.addEventListener("click", function () { del(+b.getAttribute("data-row")); }); });
  }

  function renderMobileHolidays(host, list) {
    var today = P.todayIso();
    var segHtml =
      '<div class="hol-mob-seg">' +
        '<button type="button" class="hol-mob-seg-btn ' + (curMobileHolView === "list" ? "active" : "") + '" id="holMobViewList"><i class="material-icons">format_list_bulleted</i> List View</button>' +
        '<button type="button" class="hol-mob-seg-btn ' + (curMobileHolView === "calendar" ? "active" : "") + '" id="holMobViewCal"><i class="material-icons">calendar_month</i> Calendar View</button>' +
      '</div>';

    if (curMobileHolView === "calendar") {
      host.innerHTML = segHtml + renderMobileCalendarHtml(list);
      bindMobileCalControls(list);
    } else {
      host.innerHTML = segHtml + renderMobileListHtml(list, today);
    }

    var bList = $("holMobViewList"), bCal = $("holMobViewCal");
    if (bList) bList.addEventListener("click", function () { curMobileHolView = "list"; renderMobileHolidays(host, list); });
    if (bCal) bCal.addEventListener("click", function () { curMobileHolView = "calendar"; renderMobileHolidays(host, list); });
  }

  function renderMobileListHtml(list, today) {
    if (!list.length) {
      return '<div class="hol-empty"><i class="material-icons">event_available</i>No holidays declared yet.</div>';
    }

    var upcoming = [], past = [];
    list.forEach(function (h) {
      if ((h.dateTo || h.dateFrom) >= today) upcoming.push(h);
      else past.push(h);
    });

    upcoming.sort(function (a, b) { return (a.dateFrom || "").localeCompare(b.dateFrom || ""); });
    past.sort(function (a, b) { return (b.dateFrom || "").localeCompare(a.dateFrom || ""); });

    var html = '<div class="hol-mob-list-container">';

    // Upcoming Section
    html += '<div class="hol-mob-sec-head"><i class="material-icons">upcoming</i> Upcoming &amp; Current Holidays (' + upcoming.length + ')</div>';
    if (!upcoming.length) {
      html += '<div class="hol-mob-empty-sub">No upcoming holidays scheduled.</div>';
    } else {
      html += upcoming.map(function (h) { return mobileHolidayCard(h, today, false); }).join("");
    }

    // Past Section
    if (past.length > 0) {
      html += '<div class="hol-mob-sec-head past"><i class="material-icons">history</i> Past Holidays (' + past.length + ')</div>';
      html += past.map(function (h) { return mobileHolidayCard(h, today, true); }).join("");
    }

    html += '</div>';
    return html;
  }

  function mobileHolidayCard(h, today, isPast) {
    var range = (h.dateFrom === h.dateTo) ? P.prettyDate(h.dateFrom) : (P.prettyDate(h.dateFrom) + " → " + P.prettyDate(h.dateTo));
    var cls = String(h.classes || "").toUpperCase() === "ALL" ? "All Classes" : esc(h.classes || "");
    var whoBadge = h.appliesToStaff
      ? '<span class="pill blue" style="font-size:10.5px;padding:2px 7px;">Students + Staff</span>'
      : '<span class="pill orange" style="font-size:10.5px;padding:2px 7px;">Students Only</span>';

    var timingBadge = "";
    if (isPast) {
      timingBadge = '<span class="hol-mob-tag past">Completed</span>';
    } else if (h.dateFrom <= today && h.dateTo >= today) {
      timingBadge = '<span class="hol-mob-tag active">Today / Active</span>';
    } else {
      var d1 = new Date(today), d2 = new Date(h.dateFrom);
      var diffDays = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
      timingBadge = diffDays === 1
        ? '<span class="hol-mob-tag soon">Tomorrow</span>'
        : '<span class="hol-mob-tag soon">In ' + diffDays + ' days</span>';
    }

    return '<div class="hol-mob-card ' + (isPast ? "past" : "") + '">' +
      '<div class="hol-mob-card-top">' +
        '<div class="hol-mob-card-title">' + esc(h.reason || "Holiday") + '</div>' +
        timingBadge +
      '</div>' +
      '<div class="hol-mob-card-date"><i class="material-icons">event</i> ' + range + '</div>' +
      '<div class="hol-mob-card-foot">' +
        '<span>' + esc(h.session || "Full Day") + ' · ' + cls + '</span>' +
        whoBadge +
      '</div>' +
    '</div>';
  }

  function renderMobileCalendarHtml(list) {
    var y = calCurrentDate.getFullYear(), m = calCurrentDate.getMonth();
    var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var firstDay = new Date(y, m, 1).getDay();
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var today = P.todayIso();

    var calHols = list.filter(function (h) {
      if (!h.dateFrom) return false;
      var fromM = parseInt(h.dateFrom.slice(5, 7), 10) - 1, fromY = parseInt(h.dateFrom.slice(0, 4), 10);
      var toM = parseInt((h.dateTo || h.dateFrom).slice(5, 7), 10) - 1, toY = parseInt((h.dateTo || h.dateFrom).slice(0, 4), 10);
      var curIdx = y * 12 + m, startIdx = fromY * 12 + fromM, endIdx = toY * 12 + toM;
      return curIdx >= startIdx && curIdx <= endIdx;
    });

    var html =
      '<div class="hol-cal-wrap">' +
        '<div class="hol-cal-nav">' +
          '<button type="button" class="btn btn-secondary" id="holCalPrev" style="padding:4px 10px;font-size:12px;">‹ Prev</button>' +
          '<div style="font-weight:800;font-size:15px;color:#0f172a;">' + monthNames[m] + ' ' + y + '</div>' +
          '<button type="button" class="btn btn-secondary" id="holCalNext" style="padding:4px 10px;font-size:12px;">Next ›</button>' +
        '</div>' +
        '<div class="hol-cal-grid">' +
          '<div class="hol-cal-dh">Sun</div><div class="hol-cal-dh">Mon</div><div class="hol-cal-dh">Tue</div><div class="hol-cal-dh">Wed</div><div class="hol-cal-dh">Thu</div><div class="hol-cal-dh">Fri</div><div class="hol-cal-dh">Sat</div>';

    // empty cells before 1st of month
    for (var b = 0; b < firstDay; b++) {
      html += '<div class="hol-cal-cell empty"></div>';
    }

    // day cells
    for (var d = 1; d <= daysInMonth; d++) {
      var dStr = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
      var isToday = (dStr === today);
      var dayHols = calHols.filter(function (h) { return dStr >= h.dateFrom && dStr <= (h.dateTo || h.dateFrom); });
      var isHol = dayHols.length > 0;
      var holTitle = isHol ? dayHols.map(function (it) { return it.reason; }).join(", ") : "";

      html += '<div class="hol-cal-cell ' + (isToday ? 'today ' : '') + (isHol ? 'has-hol ' : '') + '" title="' + esc(holTitle) + '">' +
        '<span class="hol-cal-dayno">' + d + '</span>' +
        (isHol ? '<span class="hol-cal-dot" title="' + esc(holTitle) + '"></span>' : '') +
      '</div>';
    }

    html += '</div>';

    // List of holidays occurring in this month below calendar
    html += '<div style="margin-top:14px;">';
    html += '<div class="hol-mob-sec-head"><i class="material-icons">event</i> ' + monthNames[m] + ' Holidays (' + calHols.length + ')</div>';
    if (!calHols.length) {
      html += '<div class="hol-mob-empty-sub">No holidays in ' + monthNames[m] + ' ' + y + '.</div>';
    } else {
      html += calHols.map(function (h) { return mobileHolidayCard(h, today, (h.dateTo || h.dateFrom) < today); }).join("");
    }
    html += '</div></div>';

    return html;
  }

  function bindMobileCalControls(list) {
    var p = $("holCalPrev"), n = $("holCalNext");
    if (p) {
      p.addEventListener("click", function () {
        calCurrentDate = new Date(calCurrentDate.getFullYear(), calCurrentDate.getMonth() - 1, 1);
        renderMobileHolidays($("holList"), list);
      });
    }
    if (n) {
      n.addEventListener("click", function () {
        calCurrentDate = new Date(calCurrentDate.getFullYear(), calCurrentDate.getMonth() + 1, 1);
        renderMobileHolidays($("holList"), list);
      });
    }
  }
  function del(rowIndex) {
    if (!confirm("Delete this holiday? Attendance for those dates will no longer be blocked.")) return;
    P.api("deleteHolidayRow", [rowIndex]).then(function (res) {
      if (res && res.success) { status("Holiday deleted.", "ok"); loadList(); }
      else status((res && res.error) || "Delete failed.", "err");
    }).catch(function (e) { status(e.message || String(e), "err"); });
  }

  function injectCss() {
    if (document.getElementById("hol-css")) return;
    var css =
      ".hol-grid{display:grid;grid-template-columns:minmax(320px,420px) 1fr;gap:20px;align-items:start}@media(max-width:900px){.hol-grid{grid-template-columns:1fr}}" +
      ".hol-addcard,.hol-listcard{background:#fff;border:1px solid var(--border);border-radius:16px;padding:18px 20px;box-shadow:var(--shadow-sm)}" +
      ".hol-scope{display:flex;gap:14px;flex-wrap:wrap;align-items:center;padding:8px 10px;border:1px solid var(--border);border-radius:10px;background:#fafafa}.hol-scope label{display:flex;align-items:center;gap:6px;font-weight:700;font-size:13px;text-transform:none;color:#0f172a;margin:0}.hol-scope input{accent-color:var(--maroon)}" +
      ".hol-classgrid{grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;margin-top:8px;padding:12px;border:1px solid var(--border);border-radius:10px;background:#f8fafc;max-height:200px;overflow:auto}.hol-classgrid label{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;color:#0f172a;padding:6px 8px;background:#fff;border:1px solid #eef2f7;border-radius:8px;cursor:pointer;text-transform:none;margin:0}" +
      ".hol-who{display:flex;flex-direction:column;gap:8px}.hol-who label{display:flex;align-items:center;gap:10px;padding:11px 14px;border:1.5px solid var(--border);border-radius:12px;cursor:pointer;text-transform:none;margin:0;font-weight:600;color:var(--text-main);font-size:14px}.hol-who label.on{border-color:var(--maroon);background:var(--primary-light)}.hol-who input{accent-color:var(--maroon);width:16px;height:16px}" +
      ".hol-hint{display:flex;gap:6px;align-items:flex-start;font-size:12px;color:var(--text-muted);margin-top:8px;line-height:1.45}.hol-hint i{font-size:15px;color:var(--accent);flex-shrink:0}" +
      ".hol-status{font-size:12.5px;font-weight:700;min-height:16px;margin:4px 0 12px;color:var(--text-muted)}.hol-status.ok{color:var(--success)}.hol-status.err{color:var(--danger)}" +
      ".hol-empty{text-align:center;padding:30px 18px;color:var(--text-muted);font-weight:600;background:#fafafa;border:1px dashed var(--border);border-radius:12px}.hol-empty i{font-size:32px;color:var(--maroon);display:block;margin-bottom:8px}" +
      ".hol-item{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--border);border-radius:12px;margin-bottom:8px;background:#fff}" +
      ".hol-item-main{flex:1;min-width:0}.hol-reason{font-weight:800;font-size:14px;color:var(--text-main)}.hol-meta{font-size:12px;color:var(--text-muted);margin-top:2px}.hol-badges{margin-top:6px}" +
      ".hol-del{flex:0 0 auto;border:1px solid #fecaca;background:#fff;color:var(--danger);width:34px;height:34px;border-radius:999px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}.hol-del:hover{background:var(--danger);color:#fff;border-color:var(--danger)}.hol-del i{font-size:18px}" +
      ".pill{display:inline-flex;align-items:center;gap:5px;padding:4px 11px;border-radius:999px;font-size:12px;font-weight:700}.pill.blue{background:#e0f2fe;color:#075985}.pill.orange{background:var(--warning-light);color:#92400e}" +
      "@media(max-width:900px){" +
        ".hol-addcard{display:none!important;}" +
        ".hol-listcard{padding:12px 14px!important;border:none!important;box-shadow:none!important;background:transparent!important;}" +
        ".hol-del{display:none!important;}" +
        ".hol-mob-seg{display:flex;gap:6px;background:#f1f5f9;padding:4px;border-radius:12px;margin-bottom:14px;}" +
        ".hol-mob-seg-btn{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:8px 12px;font-size:13px;font-weight:800;border:none;background:transparent;color:#64748b;border-radius:9px;cursor:pointer;transition:all 0.15s ease;}" +
        ".hol-mob-seg-btn.active{background:#fff;color:#7a151a;box-shadow:0 1px 3px rgba(0,0,0,0.08);}" +
        ".hol-mob-sec-head{font-size:13px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:6px;margin:12px 0 8px;text-transform:uppercase;letter-spacing:0.03em;}" +
        ".hol-mob-sec-head.past{color:#64748b;margin-top:20px;}" +
        ".hol-mob-empty-sub{font-size:12.5px;color:#94a3b8;font-style:italic;padding:8px 0;}" +
        ".hol-mob-card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:12px 14px;box-shadow:0 1px 3px rgba(15,23,42,0.03);margin-bottom:10px;}" +
        ".hol-mob-card.past{opacity:0.75;background:#f8fafc;}" +
        ".hol-mob-card-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;}" +
        ".hol-mob-card-title{font-size:15px;font-weight:800;color:#0f172a;}" +
        ".hol-mob-card-date{font-size:12.5px;font-weight:700;color:#475569;display:flex;align-items:center;gap:5px;margin-bottom:8px;}" +
        ".hol-mob-card-date i{font-size:15px;color:#94a3b8;}" +
        ".hol-mob-card-foot{display:flex;align-items:center;justify-content:space-between;border-top:1px solid #f1f5f9;padding-top:7px;font-size:11.5px;color:#64748b;font-weight:600;}" +
        ".hol-mob-tag{font-size:10.5px;font-weight:800;padding:2px 8px;border-radius:999px;white-space:nowrap;}" +
        ".hol-mob-tag.active{background:#dcfce7;color:#15803d;}" +
        ".hol-mob-tag.soon{background:#e0e7ff;color:#4338ca;}" +
        ".hol-mob-tag.past{background:#f1f5f9;color:#64748b;}" +
        ".hol-cal-wrap{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:12px;box-shadow:0 1px 3px rgba(15,23,42,0.03);}" +
        ".hol-cal-nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}" +
        ".hol-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center;}" +
        ".hol-cal-dh{font-size:11px;font-weight:800;color:#64748b;padding:4px 0;text-transform:uppercase;}" +
        ".hol-cal-cell{aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:8px;font-size:12px;font-weight:700;color:#1e293b;position:relative;background:#f8fafc;}" +
        ".hol-cal-cell.empty{background:transparent;}" +
        ".hol-cal-cell.today{outline:2px solid #0284c7;background:#f0f9ff;font-weight:900;color:#0369a1;}" +
        ".hol-cal-cell.has-hol{background:#fee2e2;color:#991b1b;font-weight:900;}" +
        ".hol-cal-dot{width:5px;height:5px;border-radius:50%;background:#b91c1c;position:absolute;bottom:3px;}" +
      "}";
    var st = document.createElement("style"); st.id = "hol-css"; st.textContent = css; document.head.appendChild(st);
  }
})();

/* =========================================================================
   my-schedule-component.js — Teacher Schedule Component (Mobile-First)
   Sapthagiri High School E/M Portal

   Features:
   - Symmetrical 6-column Day selector (Mon–Sat), defaulting to Today.
   - Official Reporting & Leaving time pill (from user shift or school bounds).
   - Real-time timetable fetching from DB (app.hw_timetable).
   - Symmetrical 3-box KPI counters (Teaching, Activity, Free).
   - Duplicate period consolidation (e.g. English P3, P4).
   - Period start & end timing for Primary (8 periods) and High School (9 periods).
   - Mobile-optimized card layout with zero horizontal overflow.
   ========================================================================= */
(function () {
  "use strict";

  var P = window.Portal || {};
  var esc = (P && P.esc) ? P.esc : function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  var DAYS = [
    { n: 1, name: "Monday", short: "Mon" },
    { n: 2, name: "Tuesday", short: "Tue" },
    { n: 3, name: "Wednesday", short: "Wed" },
    { n: 4, name: "Thursday", short: "Thu" },
    { n: 5, name: "Friday", short: "Fri" },
    { n: 6, name: "Saturday", short: "Sat" }
  ];

  // Primary School period timings (8 periods)
  var PRIMARY_PERIODS = {
    1: { start: "09:20 AM", end: "10:00 AM" },
    2: { start: "10:00 AM", end: "10:40 AM" },
    3: { start: "10:50 AM", end: "11:30 AM" },
    4: { start: "11:30 AM", end: "12:10 PM" },
    5: { start: "12:55 PM", end: "01:35 PM" },
    6: { start: "01:35 PM", end: "02:15 PM" },
    7: { start: "02:25 PM", end: "03:15 PM" },
    8: { start: "03:15 PM", end: "04:05 PM" }
  };

  // High School period timings (9 periods)
  var HIGH_PERIODS = {
    1: { start: "09:05 AM", end: "09:50 AM" },
    2: { start: "09:50 AM", end: "10:30 AM" },
    3: { start: "10:35 AM", end: "11:15 AM" },
    4: { start: "11:15 AM", end: "11:55 AM" },
    5: { start: "11:55 AM", end: "12:40 PM" },
    6: { start: "01:20 PM", end: "02:05 PM" },
    7: { start: "02:05 PM", end: "02:45 PM" },
    8: { start: "02:50 PM", end: "03:30 PM" },
    9: { start: "03:30 PM", end: "04:30 PM" }
  };

  var ACTIVITY_SET = {
    sports: true, games: true, karate: true, dance: true,
    "art zone": true, art: true, pet: true, leisure: true,
    rhymes: true, stories: true, library: true, yoga: true, drawing: true
  };

  function isActivitySubject(sub) {
    if (!sub) return false;
    var s = String(sub).trim().toLowerCase();
    return !!ACTIVITY_SET[s];
  }

  function normalizeTeacherName(name) {
    if (!name) return "";
    return String(name)
      .replace(/^(?:MR\.|MRS\.|MS\.|DR\.|SIR|MADAM)\s+/i, "")
      .replace(/\s+(?:SIR|MADAM)$/i, "")
      .trim();
  }

  function getTeacherVariants(name) {
    if (!name) return [];
    var clean = normalizeTeacherName(name);
    var list = [];
    function add(n) {
      if (!n) return;
      var s = String(n).trim();
      if (s && list.indexOf(s) < 0) list.push(s);
    }
    add(clean);
    add(name);

    var lower = clean.toLowerCase();
    // Sathish <-> Satish (ERP/Timetable spelling differences)
    if (lower === "sathish" || lower === "satish") {
      add("Sathish");
      add("Satish");
      add("Mr. Sathish");
      add("Mr. Satish");
      add("Sathish Sir");
      add("Satish Sir");
    }
    // KNR <-> Narsimha Reddy Kasireddy
    if (lower === "knr" || lower.indexOf("narsimha") >= 0) {
      add("KNR");
      add("Narsimha Reddy Kasireddy");
      add("Narsimha Reddy");
      add("K. Narsimha Reddy");
    }
    // Santosh <-> Santhosh
    if (lower === "santosh" || lower === "santhosh") {
      add("Santosh");
      add("Santhosh");
      add("Mr. Santosh");
      add("Santosh Sir");
    }
    // Srinivas
    if (lower.indexOf("srinivas") >= 0) {
      add("Srinivas");
      add("Srinivas Kodipunjula");
      add("Srinivas Pulloori");
      add("Srinivas Vallakati");
    }
    // Ramana Prasad <-> Ramana
    if (lower.indexOf("ramana") >= 0) {
      add("Ramana Prasad");
      add("Ramana");
    }
    return list;
  }

  function teacherMatches(cellTeacher, variants) {
    if (!cellTeacher) return false;
    var ctClean = normalizeTeacherName(cellTeacher).toLowerCase();
    if (!ctClean) return false;

    // Direct check against whole cell
    for (var i = 0; i < variants.length; i++) {
      var vClean = normalizeTeacherName(variants[i]).toLowerCase();
      if (!vClean) continue;
      if (ctClean === vClean || ctClean.indexOf(vClean) >= 0 || vClean.indexOf(ctClean) >= 0) return true;
    }

    // Split compound / multi-teacher cells e.g. "Satish, Santosh" or "Satish / Rajesh" or "Social\nSatish"
    var tokens = String(cellTeacher).split(/[\r\n,/\&|]+/).map(function (s) {
      return normalizeTeacherName(s).toLowerCase();
    }).filter(Boolean);

    for (var j = 0; j < tokens.length; j++) {
      var tok = tokens[j];
      for (var k = 0; k < variants.length; k++) {
        var vk = normalizeTeacherName(variants[k]).toLowerCase();
        if (vk && (tok === vk || tok.indexOf(vk) >= 0 || vk.indexOf(tok) >= 0)) return true;
      }
    }
    return false;
  }

  function gradeWeight(n) {
    var k = String(n || "").toUpperCase().replace(/\s+/g, "");
    if (k === "NURSERY") return 1;
    if (k === "LKG" || k === "PREKG") return 2;
    if (k === "UKG") return 3;
    var m = k.match(/\d+/);
    return m ? 100 + parseInt(m[0], 10) : 999;
  }

  function isPrimaryClass(cls) {
    return gradeWeight(cls) <= 105; // Nursery..Grade 5
  }

  function formatTime12(tStr, fallback) {
    if (!tStr) return fallback || "";
    var s = String(tStr).trim();
    if (s.indexOf("AM") >= 0 || s.indexOf("PM") >= 0) return s;
    var parts = s.split(":");
    if (parts.length < 2) return s;
    var h = parseInt(parts[0], 10);
    var m = parts[1].slice(0, 2);
    if (isNaN(h)) return s;
    var ampm = h >= 12 ? "PM" : "AM";
    var h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return h12 + ":" + m + " " + ampm;
  }

  function getDateForWeekday(targetWeekday) {
    var now = new Date();
    var curDay = now.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    var diff = (targetWeekday - curDay);
    if (curDay === 0) diff = targetWeekday - 7;
    var target = new Date(now);
    target.setDate(now.getDate() + diff);
    var y = target.getFullYear();
    var m = String(target.getMonth() + 1).padStart(2, "0");
    var d = String(target.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  function ensureStyles() {
    if (document.getElementById("teacher-schedule-css")) return;
    var css =
      ".tsch-wrapper{width:100%;box-sizing:border-box;margin:0 0 24px;font-family:var(--font,sans-serif)}" +
      ".tsch-card{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:18px;padding:16px;box-shadow:0 4px 18px rgba(20,20,40,.05);box-sizing:border-box}" +
      
      /* Header & Timing */
      ".tsch-head{display:flex;flex-direction:column;gap:8px;margin-bottom:14px}" +
      ".tsch-head-row{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px}" +
      ".tsch-title-wrap{display:flex;align-items:center;gap:8px}" +
      ".tsch-title-wrap i{color:var(--maroon,#8a1618);font-size:22px}" +
      ".tsch-title{font-size:17px;font-weight:800;color:var(--text-main,#0f172a);margin:0;font-family:var(--head,sans-serif)}" +
      ".tsch-today-badge{background:var(--maroon,#8a1618);color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:999px;letter-spacing:.3px}" +
      
      /* Shift / Timing Pill */
      ".tsch-timing-bar{display:flex;align-items:center;gap:6px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px 12px;font-size:12.5px;color:#334155;flex-wrap:wrap}" +
      ".tsch-timing-bar i{font-size:16px;color:var(--maroon,#8a1618);flex-shrink:0}" +
      ".tsch-timing-item{display:inline-flex;align-items:center;gap:4px}" +
      ".tsch-timing-item strong{color:#0f172a;font-weight:700}" +
      ".tsch-timing-sep{color:#cbd5e1;margin:0 4px}" +

      /* Day Selector */
      ".tsch-days{display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin-bottom:14px;background:#f1f5f9;border-radius:12px;padding:4px;border:1px solid #e2e8f0}" +
      ".tsch-day-btn{background:transparent;border:none;border-radius:9px;padding:8px 2px;font-size:12.5px;font-weight:700;color:#64748b;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;transition:all .15s ease;-webkit-tap-highlight-color:transparent}" +
      ".tsch-day-btn:hover{color:var(--maroon,#8a1618)}" +
      ".tsch-day-btn.active{background:var(--maroon,#8a1618);color:#fff;box-shadow:0 2px 6px rgba(138,22,24,.25)}" +
      ".tsch-day-btn .sub{font-size:9.5px;font-weight:600;opacity:.85}" +
      ".tsch-day-btn.is-today .sub{font-weight:800;text-decoration:underline}" +

      /* KPI Stat Grid */
      ".tsch-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}" +
      ".tsch-stat-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:8px 6px;text-align:center;display:flex;flex-direction:column;gap:2px}" +
      ".tsch-stat-box.teaching{background:#eff6ff;border-color:#bfdbfe}" +
      ".tsch-stat-box.teaching .val{color:#1d4ed8}" +
      ".tsch-stat-box.activity{background:#fffbeb;border-color:#fde68a}" +
      ".tsch-stat-box.activity .val{color:#b45309}" +
      ".tsch-stat-box.free{background:#f8fafc;border-color:#e2e8f0}" +
      ".tsch-stat-box.free .val{color:#64748b}" +
      ".tsch-stat-box .val{font-size:18px;font-weight:800;line-height:1.2}" +
      ".tsch-stat-box .lbl{font-size:11px;font-weight:700;color:#64748b;letter-spacing:.3px}" +

      /* Timeline of Periods */
      ".tsch-timeline{display:flex;flex-direction:column;gap:9px;width:100%;box-sizing:border-box}" +
      ".tsch-pcard{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:11px 13px;box-shadow:0 1px 3px rgba(0,0,0,.03);box-sizing:border-box;min-height:64px;transition:transform .1s ease}" +
      ".tsch-pcard.is-academic{border-left:4px solid #3b82f6}" +
      ".tsch-pcard.is-activity{border-left:4px solid #f59e0b}" +
      ".tsch-pcard.is-free{background:#fafbfe;border:1px dashed #cbd5e1}" +
      
      /* Period Badge (Left) */
      ".tsch-pbadge{flex:0 0 54px;width:54px;height:50px;border-radius:10px;background:#eff6ff;border:1px solid #bfdbfe;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#1e40af;font-weight:800;box-sizing:border-box;text-align:center}" +
      ".tsch-pbadge .pnum{font-size:13px;font-weight:800;line-height:1.1}" +
      ".tsch-pbadge .plbl{font-size:8px;font-weight:700;letter-spacing:.3px;color:#3b82f6;margin-top:2px}" +
      ".tsch-pcard.is-activity .tsch-pbadge{background:#fffbeb;border-color:#fde68a;color:#b45309}" +
      ".tsch-pcard.is-activity .tsch-pbadge .plbl{color:#b45309}" +
      ".tsch-pcard.is-free .tsch-pbadge{background:#f1f5f9;border-color:#e2e8f0;color:#94a3b8}" +
      ".tsch-pcard.is-free .tsch-pbadge .plbl{color:#94a3b8}" +

      /* Period Body (Center) */
      ".tsch-pinfo{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}" +
      ".tsch-psubject{font-size:14px;font-weight:800;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3}" +
      ".tsch-pcard.is-free .tsch-psubject{font-size:13px;font-weight:600;color:#64748b;font-style:italic}" +
      ".tsch-pmeta{font-size:12px;color:#475569;display:flex;align-items:center;gap:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".tsch-pmeta i{font-size:14px;color:var(--maroon,#8a1618);flex-shrink:0}" +
      ".tsch-ptime{font-size:11px;font-weight:600;color:#64748b;display:flex;align-items:center;gap:4px;margin-top:1px}" +
      ".tsch-ptime i{font-size:12px;color:#94a3b8}" +

      /* Status Pill (Right) */
      ".tsch-paction{flex:0 0 auto;display:flex;align-items:center}" +
      ".tsch-pill{font-size:11px;font-weight:700;padding:4px 9px;border-radius:6px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap}" +
      ".tsch-pill.academic{background:#eff6ff;color:#1d4ed8;border:1px solid #dbeafe}" +
      ".tsch-pill.activity{background:#fef3c7;color:#92400e;border:1px solid #fde68a}" +
      ".tsch-pill.free{background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0}" +

      /* Empty & Loading States */
      ".tsch-empty{text-align:center;padding:28px 14px;color:#64748b;font-size:13.5px;background:#f8fafc;border-radius:12px;border:1px dashed #cbd5e1}" +
      ".tsch-empty i{font-size:32px;color:#94a3b8;display:block;margin-bottom:6px}" +
      ".tsch-loading{text-align:center;padding:24px 12px;color:#64748b;font-size:13px;display:flex;align-items:center;justify-content:center;gap:8px}" +
      ".tsch-loading i{font-size:18px;animation:tsch-spin 1s linear infinite;color:var(--maroon,#8a1618)}" +
      "@keyframes tsch-spin{100%{transform:rotate(360deg)}}" +

      /* Tap interaction */
      ".tsch-pcard.has-link{cursor:pointer}" +
      ".tsch-pcard.has-link:active{transform:scale(0.98)}" +
      ".tsch-pcard.has-link .tsch-chevron{color:#94a3b8;font-size:18px;margin-left:4px}" +

      /* Small mobile adjustments */
      "@media(max-width:380px){" +
        ".tsch-day-btn{font-size:11px;padding:6px 1px}" +
        ".tsch-day-btn .sub{display:none}" +
        ".tsch-stat-box .val{font-size:16px}" +
        ".tsch-pbadge{flex:0 0 46px;width:46px;height:46px}" +
        ".tsch-pbadge .pnum{font-size:11.5px}" +
        ".tsch-psubject{font-size:13px}" +
      "}";

    var st = document.createElement("style");
    st.id = "teacher-schedule-css";
    st.textContent = css;
    document.head.appendChild(st);
  }

  function TeacherSchedule(container, session, options) {
    this.container = typeof container === "string" ? document.getElementById(container) : container;
    this.session = session || (P.Session && P.Session.get()) || {};
    this.options = options || {};
    this.teacherName = this.session.name || "Teacher";
    this.cleanTeacherName = normalizeTeacherName(this.teacherName);
    this.teacherVariants = getTeacherVariants(this.teacherName);
    this.weekCache = {}; // weekday -> periods array
    this.shift = {
      s1In: this.session.s1In || "08:45",
      s1Out: this.session.s1Out || "16:30",
      shiftType: this.session.shiftType || "SINGLE"
    };

    var curDay = new Date().getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    this.todayWeekday = (curDay >= 1 && curDay <= 6) ? curDay : 1;
    this.isSunday = (curDay === 0);
    this.selectedDay = this.todayWeekday;

    this.init();
  }

  TeacherSchedule.prototype.init = function () {
    if (!this.container) return;
    ensureStyles();
    this.renderShell();
    this.fetchBiometricShift();
    this.loadDay(this.selectedDay);
  };

  TeacherSchedule.prototype.fetchBiometricShift = function () {
    var self = this;
    if (!P.api) return;
    var curMonth = P.thisMonth ? P.thisMonth() : (new Date().toISOString().slice(0, 7));
    var variants = self.teacherVariants || getTeacherVariants(self.teacherName);

    function tryShift(idx) {
      if (idx >= variants.length) return;
      var name = variants[idx];
      P.api("getTimesheetData", [name, curMonth], { overlay: false })
        .then(function (data) {
          if (data && data.userShiftProfile) {
            var sp = data.userShiftProfile;
            if (sp.s1In) self.shift.s1In = String(sp.s1In).slice(0, 5);
            if (sp.s1Out) self.shift.s1Out = String(sp.s1Out).slice(0, 5);
            if (sp.shiftType) self.shift.shiftType = sp.shiftType;
            self.updateTimingBanner();
          } else {
            tryShift(idx + 1);
          }
        })
        .catch(function () {
          tryShift(idx + 1);
        });
    }
    tryShift(0);
  };

  TeacherSchedule.prototype.updateTimingBanner = function () {
    var bar = this.container ? this.container.querySelector(".tsch-timing-bar") : null;
    if (!bar) return;
    var repTime = formatTime12(this.shift.s1In, "8:45 AM");
    var leaveTime = formatTime12(this.shift.s1Out, "4:30 PM");
    bar.innerHTML =
      '<i class="material-icons">access_time</i>' +
      '<span class="tsch-timing-item">Reporting: <strong>' + esc(repTime) + '</strong></span>' +
      '<span class="tsch-timing-sep">·</span>' +
      '<span class="tsch-timing-item">Leaving: <strong>' + esc(leaveTime) + '</strong></span>' +
      '<span class="tsch-timing-sep">·</span>' +
      '<span class="tsch-timing-item"><span style="color:#64748b;">Assembly:</span> <strong>8:45 AM</strong></span>';
  };

  TeacherSchedule.prototype.renderShell = function () {
    var self = this;
    var d = new Date().getDay();
    var repTime = formatTime12(this.shift.s1In, "8:45 AM");
    var leaveTime = formatTime12(this.shift.s1Out, "4:30 PM");

    var daysHtml = DAYS.map(function (day) {
      var isActive = day.n === self.selectedDay;
      var isToday = day.n === d;
      return (
        '<button type="button" class="tsch-day-btn ' + (isActive ? "active" : "") + (isToday ? " is-today" : "") + '" data-day="' + day.n + '">' +
          '<span>' + esc(day.short) + '</span>' +
          '<span class="sub">' + (isToday ? "Today" : "Day " + day.n) + '</span>' +
        '</button>'
      );
    }).join("");

    this.container.innerHTML =
      '<div class="tsch-wrapper">' +
        '<div class="tsch-card">' +
          '<div class="tsch-head">' +
            '<div class="tsch-head-row">' +
              '<div class="tsch-title-wrap">' +
                '<i class="material-icons">calendar_today</i>' +
                '<h2 class="tsch-title">My Teaching Schedule</h2>' +
                (self.isSunday ? '<span class="tsch-today-badge" style="background:#475569;">Sun Holiday</span>' : '<span class="tsch-today-badge">Active</span>') +
              '</div>' +
              (self.options.showFullLink ? '<a href="my-schedule.html" class="tsch-pill academic" style="text-decoration:none;"><i class="material-icons" style="font-size:14px;">open_in_new</i> Dedicated View</a>' : '') +
            '</div>' +
            '<div class="tsch-timing-bar">' +
              '<i class="material-icons">access_time</i>' +
              '<span class="tsch-timing-item">Reporting: <strong>' + esc(repTime) + '</strong></span>' +
              '<span class="tsch-timing-sep">·</span>' +
              '<span class="tsch-timing-item">Leaving: <strong>' + esc(leaveTime) + '</strong></span>' +
              '<span class="tsch-timing-sep">·</span>' +
              '<span class="tsch-timing-item"><span style="color:#64748b;">Assembly:</span> <strong>8:45 AM</strong></span>' +
            '</div>' +
          '</div>' +

          '<div class="tsch-days" id="tschDaysBar">' + daysHtml + '</div>' +

          '<div id="tschStatsBar" class="tsch-stats">' +
            '<div class="tsch-stat-box teaching"><span class="val" id="tschStatTeach">—</span><span class="lbl">Teaching</span></div>' +
            '<div class="tsch-stat-box activity"><span class="val" id="tschStatAct">—</span><span class="lbl">Activity</span></div>' +
            '<div class="tsch-stat-box free"><span class="val" id="tschStatFree">—</span><span class="lbl">Free</span></div>' +
          '</div>' +

          '<div id="tschTimelineContainer" class="tsch-timeline">' +
            '<div class="tsch-loading"><i class="material-icons">sync</i> Loading schedule…</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    // Day switch event listeners
    var bar = this.container.querySelector("#tschDaysBar");
    if (bar) {
      bar.addEventListener("click", function (e) {
        var btn = e.target.closest(".tsch-day-btn");
        if (!btn) return;
        var dayNum = parseInt(btn.getAttribute("data-day"), 10);
        if (isNaN(dayNum) || dayNum === self.selectedDay) return;

        Array.prototype.forEach.call(bar.querySelectorAll(".tsch-day-btn"), function (b) {
          b.classList.remove("active");
        });
        btn.classList.add("active");
        self.selectedDay = dayNum;
        self.loadDay(dayNum);
      });
    }
  };

  TeacherSchedule.prototype.loadDay = function (weekday) {
    var self = this;
    var host = this.container.querySelector("#tschTimelineContainer");
    if (!host) return;

    // Check memory cache
    if (this.weekCache[weekday]) {
      this.renderDay(weekday, this.weekCache[weekday]);
      return;
    }

    host.innerHTML = '<div class="tsch-loading"><i class="material-icons">sync</i> Loading timetable for ' + esc(DAYS[weekday - 1].name) + '…</div>';

    var variants = self.teacherVariants || getTeacherVariants(self.teacherName);

    // Strategy 1: Call ttGetTeacherSchedule with variants
    function tryTtGetTeacherSchedule(variantIdx) {
      if (!P.api || variantIdx >= variants.length) {
        return Promise.reject(new Error("ttGetTeacherSchedule not available or no matches"));
      }
      var targetName = variants[variantIdx];
      return P.api("ttGetTeacherSchedule", [targetName, weekday], { overlay: false })
        .then(function (res) {
          if (res && res.shift) {
            self.shift.s1In = res.shift.s1In ? String(res.shift.s1In).slice(0, 5) : self.shift.s1In;
            self.shift.s1Out = res.shift.s1Out ? String(res.shift.s1Out).slice(0, 5) : self.shift.s1Out;
            self.updateTimingBanner();
          }
          var periods = (res && res.periods) ? res.periods : [];
          if (periods.length > 0) return periods;
          return tryTtGetTeacherSchedule(variantIdx + 1);
        })
        .catch(function (err) {
          if (err && String(err.message || err).indexOf("Unknown function") >= 0) {
            throw err; // Skip trying further variants if function doesn't exist on server
          }
          return tryTtGetTeacherSchedule(variantIdx + 1);
        });
    }

    // Strategy 2: Call ttGetGrid for High & Primary campuses (active in production)
    function tryTtGetGrid() {
      if (!P.api) return Promise.reject(new Error("No API"));
      return Promise.all([
        P.api("ttGetGrid", ["High", weekday], { overlay: false }).catch(function () { return null; }),
        P.api("ttGetGrid", ["Primary", weekday], { overlay: false }).catch(function () { return null; })
      ]).then(function (results) {
        var found = [];
        (results || []).forEach(function (gridRes) {
          if (!gridRes || !gridRes.rows) return;
          gridRes.rows.forEach(function (row) {
            var clsName = row.class;
            (row.cells || []).forEach(function (cell) {
              if (!cell || !cell.subject) return;
              if (teacherMatches(cell.teacher, variants)) {
                found.push({
                  class: clsName,
                  weekday: weekday,
                  period_no: cell.period_no,
                  period_label: "Period " + cell.period_no,
                  subject: cell.subject,
                  teacher_name: cell.teacher || self.teacherName,
                  is_activity: !!cell.isActivity || isActivitySubject(cell.subject)
                });
              }
            });
          });
        });

        if (found.length > 0) {
          found.sort(function (a, b) { return a.period_no - b.period_no; });
          return found;
        }
        return Promise.reject(new Error("No periods found in grid"));
      });
    }

    // Strategy 3: Fallback to getAssignmentsByDate with variants
    function tryAssignmentsByDate(variantIdx) {
      if (!P.api || variantIdx >= variants.length) {
        return Promise.reject(new Error("No assignments found"));
      }
      var dateStr = getDateForWeekday(weekday);
      var targetName = variants[variantIdx];
      return P.api("getAssignmentsByDate", [dateStr, targetName], { overlay: false })
        .then(function (list) {
          if (list && list.length > 0) {
            return list.map(function (a) {
              var pNo = a.period_no;
              if (!pNo && a.periodLabel) {
                var m = String(a.periodLabel).match(/\d+/);
                pNo = m ? parseInt(m[0], 10) : 1;
              }
              return {
                class: a.className,
                weekday: weekday,
                period_no: pNo || 1,
                period_label: a.periodLabel || ("Period " + (pNo || 1)),
                subject: a.subject,
                teacher_name: a.teacherName || self.teacherName,
                is_activity: isActivitySubject(a.subject)
              };
            });
          }
          return tryAssignmentsByDate(variantIdx + 1);
        })
        .catch(function () {
          return tryAssignmentsByDate(variantIdx + 1);
        });
    }

    tryTtGetTeacherSchedule(0)
      .catch(function () {
        return tryTtGetGrid();
      })
      .catch(function () {
        return tryAssignmentsByDate(0);
      })
      .then(function (periods) {
        self.weekCache[weekday] = periods || [];
        self.renderDay(weekday, periods || []);
      })
      .catch(function () {
        self.weekCache[weekday] = [];
        self.renderDay(weekday, []);
      });
  };

  TeacherSchedule.prototype.consolidatePeriods = function (periodsList, maxPeriods) {
    maxPeriods = maxPeriods || 8;
    // Map assigned periods by period number
    var byPeriod = {};
    (periodsList || []).forEach(function (p) {
      var n = parseInt(p.period_no, 10);
      if (!isNaN(n)) byPeriod[n] = p;
    });

    // Detect campus profile: if any class is Grade 6+, High School campus uses 9 periods
    var hasHigh = (periodsList || []).some(function (p) { return !isPrimaryClass(p.class); });
    if (hasHigh) maxPeriods = Math.max(maxPeriods, 9);

    var timingMap = hasHigh ? HIGH_PERIODS : PRIMARY_PERIODS;

    var consolidated = [];
    var visited = {};

    for (var p = 1; p <= maxPeriods; p++) {
      if (visited[p]) continue;

      var current = byPeriod[p];
      if (!current) {
        // Free period
        var pTiming = timingMap[p] || { start: "Period " + p, end: "" };
        consolidated.push({
          isFree: true,
          periodNums: [p],
          periodLabel: "P" + p,
          subject: "Free Period",
          className: "—",
          startTime: pTiming.start,
          endTime: pTiming.end,
          timeLabel: pTiming.start + (pTiming.end ? " – " + pTiming.end : "")
        });
        continue;
      }

      // Found an assigned class: check if subsequent consecutive periods share identical class & subject
      var combinedPeriods = [p];
      var nextP = p + 1;
      var curClsNorm = String(current.class || "").trim().toLowerCase();
      var curSubNorm = String(current.subject || "").trim().toLowerCase();

      while (nextP <= maxPeriods && byPeriod[nextP]) {
        var nxt = byPeriod[nextP];
        var nxtClsNorm = String(nxt.class || "").trim().toLowerCase();
        var nxtSubNorm = String(nxt.subject || "").trim().toLowerCase();

        if (curClsNorm === nxtClsNorm && curSubNorm === nxtSubNorm) {
          combinedPeriods.push(nextP);
          visited[nextP] = true;
          nextP++;
        } else {
          break;
        }
      }

      var firstTiming = timingMap[combinedPeriods[0]] || { start: "", end: "" };
      var lastTiming = timingMap[combinedPeriods[combinedPeriods.length - 1]] || { start: "", end: "" };
      var combinedTimeStr = firstTiming.start + (lastTiming.end ? " – " + lastTiming.end : "");

      var isAct = current.is_activity || isActivitySubject(current.subject);

      consolidated.push({
        isFree: false,
        isActivity: isAct,
        periodNums: combinedPeriods,
        periodLabel: combinedPeriods.length > 1 ? ("P" + combinedPeriods.join(", P")) : ("P" + p),
        subject: current.subject || "Assigned Period",
        className: current.class,
        startTime: firstTiming.start,
        endTime: lastTiming.end,
        timeLabel: combinedTimeStr,
        record: current
      });
    }

    return {
      cards: consolidated,
      maxPeriods: maxPeriods,
      hasHigh: hasHigh
    };
  };

  TeacherSchedule.prototype.renderDay = function (weekday, periods) {
    var host = this.container.querySelector("#tschTimelineContainer");
    if (!host) return;

    var processed = this.consolidatePeriods(periods, 8);
    var cards = processed.cards;

    // Calculate KPI stats
    var teachingCount = 0;
    var activityCount = 0;
    var freeCount = 0;

    cards.forEach(function (c) {
      if (c.isFree) {
        freeCount += c.periodNums.length;
      } else if (c.isActivity) {
        activityCount += c.periodNums.length;
      } else {
        teachingCount += c.periodNums.length;
      }
    });

    var stTeach = this.container.querySelector("#tschStatTeach");
    var stAct = this.container.querySelector("#tschStatAct");
    var stFree = this.container.querySelector("#tschStatFree");
    if (stTeach) stTeach.textContent = teachingCount;
    if (stAct) stAct.textContent = activityCount;
    if (stFree) stFree.textContent = freeCount;

    var dayName = DAYS[weekday - 1].name;

    if (!cards.length || (teachingCount === 0 && activityCount === 0)) {
      host.innerHTML =
        '<div class="tsch-empty">' +
          '<i class="material-icons">event_busy</i>' +
          '<div><strong>No teaching periods assigned for ' + esc(dayName) + '</strong></div>' +
          '<div style="font-size:12px;color:#94a3b8;margin-top:4px;">Enjoy your free schedule or check with the academic office if classes were newly allotted.</div>' +
        '</div>';
      return;
    }

    host.innerHTML = cards.map(function (c) {
      if (c.isFree) {
        return (
          '<div class="tsch-pcard is-free">' +
            '<div class="tsch-pbadge">' +
              '<span class="pnum">' + esc(c.periodLabel) + '</span>' +
              '<span class="plbl">FREE</span>' +
            '</div>' +
            '<div class="tsch-pinfo">' +
              '<div class="tsch-psubject">Free Period</div>' +
              '<div class="tsch-ptime"><i class="material-icons">schedule</i>' + esc(c.timeLabel) + '</div>' +
            '</div>' +
            '<div class="tsch-paction">' +
              '<span class="tsch-pill free">Free</span>' +
            '</div>' +
          '</div>'
        );
      }

      var cardType = c.isActivity ? "is-activity" : "is-academic";
      var statusPill = c.isActivity
        ? '<span class="tsch-pill activity"><i class="material-icons" style="font-size:13px;">sports_soccer</i> Activity</span>'
        : '<span class="tsch-pill academic"><i class="material-icons" style="font-size:13px;">menu_book</i> Class ' + esc(c.className) + '</span>';

      return (
        '<div class="tsch-pcard ' + cardType + ' has-link" onclick="location.href=\'homework.html\'" title="Tap to open homework for ' + esc(c.className) + '">' +
          '<div class="tsch-pbadge">' +
            '<span class="pnum">' + esc(c.periodLabel) + '</span>' +
            '<span class="plbl">' + (c.isActivity ? "ACT" : "TEACH") + '</span>' +
          '</div>' +
          '<div class="tsch-pinfo">' +
            '<div class="tsch-psubject">' + esc(c.subject) + '</div>' +
            '<div class="tsch-pmeta">' +
              '<i class="material-icons">school</i>' +
              '<span><strong>Class ' + esc(c.className) + '</strong></span>' +
            '</div>' +
            '<div class="tsch-ptime"><i class="material-icons">schedule</i>' + esc(c.timeLabel) + '</div>' +
          '</div>' +
          '<div class="tsch-paction">' +
            statusPill +
            '<i class="material-icons tsch-chevron">chevron_right</i>' +
          '</div>' +
        '</div>'
      );
    }).join("");
  };

  // Static mount method
  TeacherSchedule.mount = function (container, session, options) {
    return new TeacherSchedule(container, session, options);
  };
  TeacherSchedule.normalizeTeacherName = normalizeTeacherName;
  TeacherSchedule.getTeacherVariants = getTeacherVariants;
  TeacherSchedule.teacherMatches = teacherMatches;

  window.TeacherSchedule = TeacherSchedule;
})();

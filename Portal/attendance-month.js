/* =========================================================================
   attendance-report.js  —  A4 Monthly Attendance Report (Management)
   Ports the VBA "GetClassData" printout + "GenerateAbsenteeMessages".
   Print-perfect A4 landscape sheet matching Sample Attendance A4.
   Backend: attMonthlyReport(class, month) · attAbsentees(class, date)
   ========================================================================= */
(function () {
  "use strict";
  var P = window.Portal;
  var session = P.bootPage("attreport");
  if (!session) return;
  if (session.role !== "Management") { location.replace("attendance.html"); return; }
  injectCss();
  var esc = P.esc, $ = function (id) { return document.getElementById(id); };
  var classes = [], DATA = null;

  $("view").innerHTML = shell();
  bind();
  loadClasses();

  function shell() {
    return '' +
      '<div class="ar-head no-print">' +
        '<span class="ex-chip">ERP Core</span>' +
        '<h1 class="ar-title">Monthly Attendance Report</h1>' +
        '<p class="ar-sub">Printable A4 sheet with cumulative present days, percentages and daily present-counts. Sundays &amp; holidays are handled automatically.</p>' +
      '</div>' +
      '<div class="ar-bar no-print">' +
        '<div class="ar-f"><label>Class</label><select id="arClass" class="ar-in"><option>Loading…</option></select></div>' +
        '<div class="ar-f"><label>Month</label><input id="arMonth" type="month" class="ar-in"></div>' +
        '<button id="arLoad" class="btn btn-maroon"><i class="material-icons">table_view</i> Generate</button>' +
        '<button id="arPrint" class="btn btn-outline" disabled><i class="material-icons">print</i> Print / PDF</button>' +
        '<button id="arMsg" class="btn btn-outline"><i class="material-icons">chat</i> Absentee WhatsApp…</button>' +
      '</div>' +
      '<div id="arLoader" class="ar-empty no-print" style="display:none"><i class="material-icons">sync</i> Building report…</div>' +
      '<div id="arSheetWrap" class="ar-sheetwrap"></div>' +
      msgModal();
  }

  function bind() {
    $("arMonth").value = P.thisMonth ? P.thisMonth() : (new Date()).toISOString().slice(0, 7);
    $("arLoad").addEventListener("click", loadReport);
    $("arPrint").addEventListener("click", function () { window.print(); });
    $("arMsg").addEventListener("click", openMsg);
    $("mmX").addEventListener("click", function () { $("mm").classList.remove("show"); });
    $("mm").addEventListener("click", function (e) { if (e.target === $("mm")) $("mm").classList.remove("show"); });
    $("mmGo").addEventListener("click", runMsg);
  }

  function loadClasses() {
    P.api("getClasses", [""], { text: "Loading classes…" }).then(function (cs) {
      classes = cs || []; if (P.sortGrades) P.sortGrades(classes);
      $("arClass").innerHTML = '<option value="">Select class…</option>' +
        classes.map(function (c) { return '<option>' + esc(c) + "</option>"; }).join("");
      var mm = $("mmClass"); if (mm) mm.innerHTML = '<option value="ALL">All classes</option>' +
        classes.map(function (c) { return '<option>' + esc(c) + "</option>"; }).join("");
    }).catch(function () { $("arClass").innerHTML = '<option>Failed to load</option>'; });
  }

  /* ---------------- report ---------------- */
  function loadReport() {
    var cls = $("arClass").value, month = $("arMonth").value;
    if (!cls || !month) { alert("Pick a class and month."); return; }
    $("arLoader").style.display = "block"; $("arSheetWrap").innerHTML = ""; $("arPrint").disabled = true;
    P.api("attMonthlyReport", [cls, month], { overlay: false }).then(function (d) {
      $("arLoader").style.display = "none"; DATA = d; renderSheet(d); $("arPrint").disabled = false;
    }).catch(function (e) {
      $("arLoader").style.display = "none";
      $("arSheetWrap").innerHTML = '<div class="ar-empty"><i class="material-icons">error_outline</i>' + esc(e.message || e) + '</div>';
    });
  }

  function cellClass(code) {
    return code === "P" ? "c-p" : code === "A" ? "c-a" : (code === "M" || code === "N") ? "c-mn" : "";
  }
  function fmt(v) { if (v == null) return ""; return (Math.round(v * 10) / 10).toString(); }
  function monthName(m) {
    var p = String(m || "").split("-"); if (p.length !== 2) return m;
    return ["January","February","March","April","May","June","July","August","September","October","November","December"][+p[1] - 1] || m;
  }

  function renderSheet(d) {
    var days = d.days, n = d.students.length;
    // A blocked column (Sunday / full-day holiday) becomes ONE merged cell that
    // spans the weekday row + all n student rows + 3 summary rows => rowspan n+4.
    var BLOCK_RS = n + 4;

    // colgroup: fixed for known cols; the day columns have NO width -> they flex
    // to fill the remaining page width (so the table always fills ~100% of A4).
    var cols = '<col class="c-roll"><col class="c-id"><col class="c-nm">';
    days.forEach(function () { cols += '<col class="c-d">'; });
    cols += '<col class="c-pd"><col class="c-pd"><col class="c-pd"><col class="c-pc"><col class="c-pc">';

    // ROW 1 — group header + day numbers
    var numTh = '';
    days.forEach(function (day) { numTh += '<th class="d' + (day.block ? " blk" : "") + '">' + day.day + '</th>'; });
    var hrow1 =
      '<tr class="hrow1">' +
        '<th class="roll" rowspan="2">Roll No.</th>' +
        '<th class="idc" rowspan="2">ID No.</th>' +
        '<th class="nm" rowspan="2">Name of the Student</th>' +
        numTh +
        '<th class="grp" colspan="3">PRESENT DAYS</th>' +
        '<th class="grp" colspan="2">PERCENTAGE</th>' +
      '</tr>';

    // ROW 2 — weekday labels; blocked day => merged cell that starts here
    var wdTh = '';
    days.forEach(function (day) {
      if (day.block) {
        wdTh += '<th class="d blk vmerge" rowspan="' + BLOCK_RS + '"><span class="rot">' + esc(day.reason || "SUNDAY") + '</span></th>';
      } else if (day.half === "M" || day.half === "A") {
        wdTh += '<th class="d half"><span class="rot">' + esc(day.label + "(" + day.half + ")") + '</span></th>';
      } else {
        wdTh += '<th class="d"><span class="rot">' + esc(day.label) + '</span></th>';
      }
    });
    var hrow2 =
      '<tr class="hrow2">' + wdTh +
        '<th class="pd">Until Last</th><th class="pd">Current</th><th class="pd">Total</th>' +
        '<th class="pc">Month</th><th class="pc">Year</th>' +
      '</tr>';

    // student rows (blocked columns skipped — covered by the merged cell)
    var body = d.students.map(function (s) {
      var tds = '';
      days.forEach(function (day, ci) {
        if (day.block) return;
        tds += '<td class="d ' + cellClass(s.cells[ci]) + '">' + esc(s.cells[ci]) + '</td>';
      });
      return '<tr>' +
        '<td class="roll">' + s.rollNo + '</td>' +
        '<td class="idc">' + esc(s.id) + '</td>' +
        '<td class="nm">' + esc(s.name) + '</td>' +
        tds +
        '<td class="pd">' + fmt(s.untilLast) + '</td>' +
        '<td class="pd">' + fmt(s.current) + '</td>' +
        '<td class="pd tot">' + fmt(s.total) + '</td>' +
        '<td class="pc">' + s.pctMonth + '%</td>' +
        '<td class="pc">' + s.pctYear + '%</td>' +
        '</tr>';
    }).join("");

    // 3 summary rows (blocked cols skipped) + CLASS AVERAGE aligned under Month/Year
    var sumMeta = [
      ["Number of students present (Morning)", d.summary.morning],
      ["Number of students present (Afternoon)", d.summary.afternoon],
      ["Average Attendance", d.summary.avg]
    ];
    var sumRows = sumMeta.map(function (r, ri) {
      var tds = '';
      r[1].forEach(function (v, i) {
        if (days[i].block) return;
        tds += '<td class="d sum">' + (v == null ? "" : fmt(v)) + '</td>';
      });
      var tail = ri === 0
        ? '<td class="sumlbl" colspan="3" rowspan="3">CLASS AVERAGE</td>' +
          '<td class="pc avg" rowspan="3">' + d.classAvg.month + '%</td>' +
          '<td class="pc avg" rowspan="3">' + d.classAvg.year + '%</td>'
        : '';
      return '<tr class="sumrow' + (ri === 0 ? " sumtop" : "") + '">' +
        '<td class="sumtitle" colspan="3">' + esc(r[0]) + '</td>' + tds + tail + '</tr>';
    }).join("");

    // ONE continuous table (NO thead/tfoot) so the merged column can span all rows
    var sheet =
      '<div class="a4">' +
        // ---- letterhead: logo left, school details right (no crash / clean gap) ----
        '<div class="a4-top">' +
          '<img class="a4-logo" src="header-logo.png" alt="' + esc(d.school.name) + '" onerror="this.style.display=\'none\';">' +
          '<div class="a4-idblock">' +
            '<div class="a4-school">' + esc(d.school.name) + '</div>' +
            '<div class="a4-line">' + esc(d.school.line1) + '</div>' +
            '<div class="a4-line">Since 1998 · Day &amp; Residential · ' + esc(d.school.phone) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="a4-report">MONTHLY ATTENDANCE REPORT</div>' +
        // ---- ONE full-width meta band: Class/Month/Year + Working Days ----
        '<table class="a4-meta">' +
          '<tr>' +
            '<td class="k" rowspan="2">CLASS</td><td class="v" rowspan="2">' + esc(d.className) + '</td>' +
            '<td class="k" rowspan="2">MONTH</td><td class="v" rowspan="2">' + esc(monthName(d.month)) + '</td>' +
            '<td class="k" rowspan="2">ACADEMIC YEAR</td><td class="v" rowspan="2">' + esc(d.academicYear) + '</td>' +
            '<td class="hdr" colspan="6">WORKING DAYS</td>' +
          '</tr>' +
          '<tr>' +
            '<td class="k sm">Until Last</td><td class="v">' + fmt(d.working.untilLast) + '</td>' +
            '<td class="k sm">Current</td><td class="v">' + fmt(d.working.current) + '</td>' +
            '<td class="k sm">Total</td><td class="v tot">' + fmt(d.working.total) + '</td>' +
          '</tr>' +
        '</table>' +
        '<table class="a4-tbl"><colgroup>' + cols + '</colgroup>' +
          hrow1 + hrow2 + body + sumRows +
        '</table>' +
      '</div>';
    $("arSheetWrap").innerHTML = sheet;
  }

  /* ---------------- absentee messaging ---------------- */
  function openMsg() {
    $("mmDate").value = (new Date()).toISOString().slice(0, 10);
    $("mmResult").innerHTML = "";
    $("mm").classList.add("show");
  }
  function runMsg() {
    var cls = $("mmClass").value || "ALL", date = $("mmDate").value;
    if (!date) { alert("Pick a date."); return; }
    $("mmResult").innerHTML = '<div class="ar-empty"><i class="material-icons">sync</i> Checking…</div>';
    P.api("attAbsentees", [cls, date], { overlay: false }).then(function (r) {
      if (!r.anyMarked) { $("mmResult").innerHTML = '<div class="mm-note warn">Attendance has not been entered for this date.</div>'; return; }
      if (!r.rows.length) { $("mmResult").innerHTML = '<div class="mm-note ok">Attendance entered · no absentees. 🎉</div>'; return; }
      var rows = r.rows.map(function (x) {
        var msg = "Dear Parent,\n" + x.name + " was absent for the " + x.session + " on " +
          prettyDate(date) + ".\nPlease ensure regular attendance.\n\n  - SAPTHAGIRI SCHOOL";
        var wa = "https://wa.me/91" + encodeURIComponent(x.phone) + "?text=" + encodeURIComponent(msg);
        return '<tr><td>' + esc(x.class) + '</td><td>' + esc(x.name) + '</td><td>' + esc(x.session) + '</td>' +
          '<td>' + esc(x.phone || "—") + '</td><td>' +
          (x.phone ? '<a class="mm-send" target="_blank" href="' + wa + '">Send</a>' : '<span class="ar-muted">no phone</span>') +
          '</td></tr>';
      }).join("");
      $("mmResult").innerHTML =
        '<div class="mm-note">' + r.rows.length + ' absentee message(s) ready.</div>' +
        '<div class="mm-tablewrap"><table class="mm-table"><thead><tr><th>Class</th><th>Student</th><th>Absence</th><th>Phone</th><th></th></tr></thead><tbody>' +
        rows + '</tbody></table></div>';
    }).catch(function (e) { $("mmResult").innerHTML = '<div class="mm-note warn">' + esc(e.message || e) + '</div>'; });
  }
  function prettyDate(iso) {
    var p = iso.split("-"); if (p.length !== 3) return iso;
    var mo = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+p[1] - 1];
    return p[2] + " " + mo + " " + p[0];
  }

  function msgModal() {
    return '<div class="mm" id="mm"><div class="mm-box">' +
      '<div class="mm-head"><span><i class="material-icons" style="vertical-align:-4px">chat</i> Absentee WhatsApp Messages</span><button id="mmX">&times;</button></div>' +
      '<div class="mm-body">' +
        '<div class="ar-bar" style="margin:0 0 10px">' +
          '<div class="ar-f"><label>Class</label><select id="mmClass" class="ar-in"><option value="ALL">All classes</option></select></div>' +
          '<div class="ar-f"><label>Date</label><input id="mmDate" type="date" class="ar-in"></div>' +
          '<button id="mmGo" class="btn btn-maroon"><i class="material-icons">search</i> Find Absentees</button>' +
        '</div>' +
        '<div id="mmResult"></div>' +
      '</div></div></div>';
  }

  /* ---------------- css ---------------- */
  function injectCss() {
    if (document.getElementById("ar-css")) return;
    var css =
    ".ar-head{margin-bottom:10px}.ar-title{font-size:22px;color:var(--maroon);margin:4px 0}.ar-sub{color:var(--text-muted);font-size:13px;max-width:720px}" +
    ".ex-chip{font-size:11px;font-weight:700;color:var(--maroon);background:var(--primary-light);padding:3px 10px;border-radius:999px}" +
    ".ar-bar{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;background:#fff;border:1px solid var(--border);border-radius:14px;padding:12px 14px;box-shadow:var(--shadow-sm);margin-bottom:14px}" +
    ".ar-f{display:flex;flex-direction:column;gap:4px}.ar-f label{font-size:12px;font-weight:700;color:var(--text-muted)}" +
    ".ar-in{padding:9px 11px;border:1px solid var(--border);border-radius:10px;font:inherit;min-width:170px;background:#fff}" +
    ".btn{border:none;border-radius:10px;padding:10px 15px;font-weight:700;font-size:13.5px;cursor:pointer;display:inline-flex;align-items:center;gap:6px}.btn-maroon{background:var(--maroon);color:#fff}.btn-outline{background:#fff;border:1px solid var(--border);color:var(--text-main)}.btn i{font-size:18px}.btn:disabled{opacity:.5;cursor:default}" +
    ".ar-empty{text-align:center;padding:26px;color:var(--text-muted);font-weight:600;background:#fff;border:1px dashed var(--border);border-radius:14px}.ar-empty i{font-size:30px;color:var(--maroon);display:block;margin-bottom:6px}.ar-muted{color:#94a3b8}" +
    // sheet shell  (monochrome / print-first: black lines, gray fills only)
    ".ar-sheetwrap{overflow:auto}" +
    ".a4{background:#fff;color:#000;width:100%;max-width:1180px;margin:0 auto;padding:10px 16px 14px;border:1px solid var(--border);border-radius:8px;box-shadow:var(--shadow-sm);-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    // letterhead — logo left, school block right, aligned so they never overlap
    ".a4-top{display:flex;align-items:center;justify-content:center;gap:16px;border-bottom:2px solid #000;padding-bottom:8px}" +
    ".a4-logo{height:64px;width:auto;object-fit:contain;flex:0 0 auto}" +
    ".a4-idblock{text-align:center}" +
    ".a4-school{font-family:Poppins,sans-serif;font-weight:800;font-size:22px;color:#000;line-height:1.05}" +
    ".a4-line{font-size:11px;color:#222;margin-top:2px;line-height:1.35}" +
    ".a4-report{text-align:center;font-family:Poppins,sans-serif;font-weight:800;font-size:13.5px;letter-spacing:.6px;margin:7px 0;padding-bottom:2px;border-bottom:1px solid #000;display:inline-block;position:relative;left:50%;transform:translateX(-50%)}" +
    // meta band — ONE full-width table, uniform cells, no dead space
    ".a4-meta{border-collapse:collapse;width:100%;font-size:11px;margin:2px 0 8px;table-layout:fixed}" +
    ".a4-meta td{border:1px solid #000;padding:5px 8px;text-align:center;vertical-align:middle;white-space:nowrap}" +
    ".a4-meta .k{background:#ececec;font-weight:800;letter-spacing:.3px;font-size:10.5px}" +
    ".a4-meta .k.sm{font-weight:700;letter-spacing:0}" +
    ".a4-meta .v{font-weight:700;font-size:12px}" +
    ".a4-meta .hdr{background:#ececec;font-weight:800;letter-spacing:.6px}" +
    ".a4-meta .v.tot{background:#ececec}" +
    // grid — uniform black hairlines, gray-only fills
    ".a4-tbl{border-collapse:collapse;width:100%;font-size:10px;table-layout:fixed}" +
    ".a4-tbl col.c-roll{width:30px}.a4-tbl col.c-id{width:74px}.a4-tbl col.c-nm{width:150px}" +
    ".a4-tbl col.c-pd{width:38px}.a4-tbl col.c-pc{width:38px}" + // c-d flexes to fill
    ".a4-tbl th,.a4-tbl td{border:.7px solid #000;text-align:center;padding:1.5px 1px;overflow:hidden}" +
    ".a4-tbl th{background:#ececec;font-weight:700}" +
    ".a4-tbl th.nm,.a4-tbl td.nm{text-align:left;padding-left:5px;white-space:nowrap;text-overflow:ellipsis}" +
    ".a4-tbl td.idc{font-size:9px}" +
    ".a4-tbl th.grp{font-weight:800;letter-spacing:.3px}" +
    ".hrow2 th.d{height:64px;vertical-align:middle}" +
    ".a4-tbl .rot{writing-mode:vertical-rl;transform:rotate(180deg);white-space:nowrap;font-weight:700;font-size:9px;display:inline-block;line-height:1}" +
    ".a4-tbl th.d.blk,.a4-tbl th.d.vmerge{background:#ececec;vertical-align:middle}.a4-tbl th.d.half{background:#d9d9d9}" +
    // attendance codes: solid black & bold for clean B&W legibility
    ".a4-tbl td.c-p,.a4-tbl td.c-a,.a4-tbl td.c-mn{color:#000;font-weight:700}" +
    ".a4-tbl td.tot{font-weight:800;background:#f4f4f4}" +
    // summary rows
    ".a4-tbl tr.sumrow td{background:#f4f4f4;font-weight:700}" +
    ".a4-tbl td.sumtitle{text-align:left;padding-left:5px}" +
    ".a4-tbl td.sumlbl{font-weight:800;font-size:12px;background:#ececec;letter-spacing:.4px}" +
    ".a4-tbl tr.sumtop td{border-top:1.6px solid #000}" +
    ".a4-tbl td.pc.avg{font-size:13px;font-weight:800;background:#ececec}" +
    // modal
    ".mm{position:fixed;inset:0;background:rgba(15,23,42,.45);display:none;align-items:center;justify-content:center;z-index:9999;padding:16px}.mm.show{display:flex}" +
    ".mm-box{background:#fff;border-radius:16px;max-width:760px;width:100%;max-height:90vh;display:flex;flex-direction:column}" +
    ".mm-head{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid var(--border);font-weight:700}.mm-head button{border:none;background:none;font-size:24px;cursor:pointer}" +
    ".mm-body{padding:16px;overflow:auto}.mm-note{font-size:13px;font-weight:600;padding:8px 12px;border-radius:10px;background:var(--primary-light);margin-bottom:8px}.mm-note.ok{background:#ecfdf5;color:#065f46}.mm-note.warn{background:#fef2f2;color:#991b1b}" +
    ".mm-tablewrap{overflow:auto;border:1px solid var(--border);border-radius:12px}.mm-table{width:100%;border-collapse:collapse;font-size:13px}.mm-table th,.mm-table td{padding:8px 10px;border-bottom:1px solid #f1f2f6;text-align:left}.mm-table th{background:#faf5f5;color:var(--maroon);font-size:11.5px;text-transform:uppercase}" +
    ".mm-send{display:inline-block;background:#25D366;color:#fff;font-weight:700;padding:5px 12px;border-radius:8px;text-decoration:none;font-size:12px}" +
    // ---------- PRINT ----------
    "@media print{" +
      "*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}" +
      "html,body{background:#fff!important;margin:0!important;padding:0!important}" +
      ".no-print,.pv2-sidebar,.app-mobile-nav,.site-topbar,.site-header,.site-footer,.fab-wa,.pv2-subtabs,#pv2-overlay{display:none!important}" +
      ".app-main,.app-body,#view{margin:0!important;padding:0!important;display:block!important}" +
      ".ar-sheetwrap{overflow:visible}" +
      ".a4{width:100%;max-width:none;border:none;box-shadow:none;border-radius:0;padding:0;margin:0}" +
      "@page{size:A4 landscape;margin:6mm}" +
      ".a4-tbl{font-size:8.6px}.hrow2 th.d{height:56px}.a4-tbl .rot{font-size:8.5px}" +
      ".a4-logo{height:52px}.a4-report{margin:5px 0}.a4-top{gap:14px;padding-bottom:6px}" +
    "}";
    var st = document.createElement("style"); st.id = "ar-css"; st.textContent = css; document.head.appendChild(st);
  }
})();

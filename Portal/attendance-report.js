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

  function renderSheet(d) {
    var days = d.days, n = d.students.length;

    // ---- colgroup: fixed for known columns, day columns flex to fill width ----
    var cols = '<col class="c-roll"><col class="c-id"><col class="c-nm">';
    days.forEach(function () { cols += '<col class="c-d">'; });
    cols += '<col class="c-pd"><col class="c-pd"><col class="c-pd"><col class="c-pc"><col class="c-pc">';

    // ---- header rows: day numbers + weekday labels ----
    var numTh = '', wdTh = '';
    days.forEach(function (day) {
      var blk = day.block ? " blk" : "";
      numTh += '<th class="d' + blk + '">' + day.day + '</th>';
      if (day.block) {
        wdTh += '<th class="d blk"></th>';                       // label goes into the merged body cell
      } else if (day.half === "M" || day.half === "A") {
        wdTh += '<th class="d half"><span class="rot">' + esc(day.label + "(" + day.half + ")") + '</span></th>';
      } else {
        wdTh += '<th class="d"><span class="rot">' + esc(day.label) + '</span></th>';
      }
    });

    // ---- body: normal cells; blocked columns merge vertically over all rows ----
    var body = d.students.map(function (s, ri) {
      var tds = '';
      days.forEach(function (day, ci) {
        if (day.block) {
          if (ri === 0) tds += '<td class="d blk vmerge" rowspan="' + n + '"><span class="rot">' + esc(day.reason || "SUNDAY") + '</span></td>';
          // other rows: covered by the rowspan above
          return;
        }
        var code = s.cells[ci];
        tds += '<td class="d ' + cellClass(code) + '">' + esc(code) + '</td>';
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

    // ---- footer summary (3 rows) + CLASS AVERAGE aligned under PD/Month/Year ----
    var sumMeta = [
      ["Number of students present (Morning)", d.summary.morning],
      ["Number of students present (Afternoon)", d.summary.afternoon],
      ["Average Attendance", d.summary.avg]
    ];
    var sumRows = sumMeta.map(function (r, ri) {
      var tds = r[1].map(function (v, i) {
        if (days[i].block) return '<td class="d blk"></td>';
        return '<td class="d sum">' + (v == null ? "" : fmt(v)) + '</td>';
      }).join("");
      // CLASS AVERAGE spans the 3 PRESENT-DAYS columns; the two % averages sit under Month & Year
      var tail = ri === 0
        ? '<td class="sumlbl" colspan="3" rowspan="3">CLASS AVERAGE</td>' +
          '<td class="pc avg" rowspan="3">' + d.classAvg.month + '%</td>' +
          '<td class="pc avg" rowspan="3">' + d.classAvg.year + '%</td>'
        : '';
      return '<tr class="sumrow">' + '<td class="sumtitle" colspan="3">' + esc(r[0]) + '</td>' + tds + tail + '</tr>';
    }).join("");

    var sheet =
      '<div class="a4">' +
        // -------- letterhead (logo image already contains the school name) --------
        '<div class="a4-top">' +
          '<img class="a4-logo" src="header-logo.png" alt="' + esc(d.school.name) + '" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'block\';">' +
          '<div class="a4-school" style="display:none">' + esc(d.school.name) + '</div>' +
          '<div class="a4-line">' + esc(d.school.line1) + '</div>' +
          '<div class="a4-line">Since 1998 · Day &amp; Residential · ' + esc(d.school.phone) + '</div>' +
        '</div>' +
        '<div class="a4-report">MONTHLY ATTENDANCE REPORT</div>' +
        // -------- meta strip: Class/Month/Year + WORKING DAYS box --------
        '<div class="a4-meta">' +
          '<table class="meta-l"><tr>' +
            '<td class="k">Class</td><td class="v">' + esc(d.className) + '</td>' +
            '<td class="k">Month</td><td class="v">' + esc(monthName(d.month)) + '</td>' +
            '<td class="k">Year</td><td class="v">' + esc(d.academicYear) + '</td>' +
          '</tr></table>' +
          '<table class="meta-r">' +
            '<tr><td class="hdr" colspan="6">WORKING DAYS</td></tr>' +
            '<tr><td class="k">Until Last Month</td><td class="v">' + fmt(d.working.untilLast) + '</td>' +
                '<td class="k">Current Month</td><td class="v">' + fmt(d.working.current) + '</td>' +
                '<td class="k">Total</td><td class="v">' + fmt(d.working.total) + '</td></tr>' +
          '</table>' +
        '</div>' +
        // -------- main grid --------
        '<table class="a4-tbl"><colgroup>' + cols + '</colgroup><thead>' +
          '<tr class="hrow1">' +
            '<th class="roll" rowspan="2">Roll No.</th>' +
            '<th class="idc" rowspan="2">ID No.</th>' +
            '<th class="nm" rowspan="2">Name of the Student</th>' +
            numTh +
            '<th class="grp" colspan="3">PRESENT DAYS</th>' +
            '<th class="grp" colspan="2">PERCENTAGE</th>' +
          '</tr>' +
          '<tr class="hrow2">' + wdTh +
            '<th class="pd">Until Last</th><th class="pd">Current</th><th class="pd">Total</th>' +
            '<th class="pc">Month</th><th class="pc">Year</th>' +
          '</tr>' +
        '</thead><tbody>' + body + '</tbody>' +
        '<tfoot>' + sumRows + '</tfoot></table>' +
      '</div>';
    $("arSheetWrap").innerHTML = sheet;
  }

  function monthName(m) {
    var p = String(m || "").split("-"); if (p.length !== 2) return m;
    return ["January","February","March","April","May","June","July","August","September","October","November","December"][+p[1] - 1] || m;
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
    // sheet shell
    ".ar-sheetwrap{overflow:auto}" +
    ".a4{background:#fff;color:#000;width:100%;max-width:1160px;margin:0 auto;padding:14px 18px;border:1px solid var(--border);border-radius:8px;box-shadow:var(--shadow-sm);-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    // letterhead
    ".a4-top{text-align:center;border-bottom:2px solid #7a1220;padding-bottom:6px}" +
    ".a4-logo{display:block;margin:0 auto;max-height:70px;object-fit:contain}" +
    ".a4-school{font-family:Poppins,sans-serif;font-weight:800;font-size:22px;color:#7a1220}" +
    ".a4-line{font-size:11px;color:#333;margin-top:1px}" +
    ".a4-report{text-align:center;font-family:Poppins,sans-serif;font-weight:800;font-size:14px;letter-spacing:.3px;margin:6px 0 8px;text-decoration:underline}" +
    // meta
    ".a4-meta{display:flex;gap:12px;align-items:stretch;margin-bottom:8px}" +
    ".meta-l,.meta-r{border-collapse:collapse;font-size:11px}.meta-l{flex:1}.meta-r{margin-left:auto}" +
    ".meta-l td,.meta-r td{border:.8px solid #333;padding:4px 8px;white-space:nowrap}" +
    ".meta-l .k,.meta-r .k,.meta-r .hdr{background:#f2f2f2;font-weight:700}" +
    ".meta-r .hdr{text-align:center;letter-spacing:.4px}.meta-l .v,.meta-r .v{text-align:center;font-weight:600}" +
    // grid
    ".a4-tbl{border-collapse:collapse;width:100%;font-size:10px;table-layout:fixed}" +
    ".a4-tbl col.c-roll{width:32px}.a4-tbl col.c-id{width:74px}.a4-tbl col.c-nm{width:150px}" +
    ".a4-tbl col.c-pd{width:38px}.a4-tbl col.c-pc{width:40px}" + // c-d has no width -> flexes to fill
    ".a4-tbl th,.a4-tbl td{border:.7px solid #333;text-align:center;padding:1px;overflow:hidden}" +
    ".a4-tbl thead th{background:#f2f2f2;font-weight:700}" +
    ".a4-tbl th.nm,.a4-tbl td.nm{text-align:left;padding-left:4px;white-space:nowrap;text-overflow:ellipsis}" +
    ".a4-tbl td.idc{font-size:9px}" +
    ".a4-tbl th.grp{font-weight:800}" +
    ".hrow2 th.d{height:66px;vertical-align:middle}" +
    ".a4-tbl .rot{writing-mode:vertical-rl;transform:rotate(180deg);white-space:nowrap;font-weight:700;font-size:9px;display:inline-block;line-height:1}" +
    ".a4-tbl th.d.blk,.a4-tbl td.d.blk{background:#f2f2f2}.a4-tbl th.d.half{background:#ffe699}" +
    ".a4-tbl td.vmerge{background:#f2f2f2;vertical-align:middle}" +
    ".a4-tbl td.c-p{color:#065f46;font-weight:600}.a4-tbl td.c-a{color:#b91c1c;font-weight:600}.a4-tbl td.c-mn{color:#92400e;font-weight:700}" +
    ".a4-tbl td.tot{font-weight:700}" +
    // footer
    ".a4-tbl tfoot td{background:#faf6f6;font-weight:700}" +
    ".a4-tbl tfoot td.sumtitle{text-align:left;padding-left:4px}" +
    ".a4-tbl tfoot td.sumlbl{font-weight:800;font-size:12px;background:#faf6f6}" +
    ".a4-tbl tfoot td.blk{background:#f2f2f2}" +
    ".a4-tbl tfoot tr.sumrow:first-child td{border-top:2px solid #000}" +
    ".a4-tbl tfoot td.pc.avg{font-size:13px;font-weight:800}" +
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
      "body{background:#fff}" +
      // hide ALL portal chrome + controls
      ".no-print,.pv2-sidebar,.app-mobile-nav,.site-topbar,.site-header,.site-footer,.fab-wa,.pv2-subtabs,#pv2-overlay{display:none!important}" +
      ".app-main,.app-body,#view{margin:0!important;padding:0!important;display:block!important}" +
      ".ar-sheetwrap{overflow:visible}" +
      ".a4{width:100%;max-width:none;border:none;box-shadow:none;border-radius:0;padding:0}" +
      "@page{size:A4 landscape;margin:6mm}" +
      ".a4-tbl{font-size:8.6px}.hrow2 th.d{height:58px}.a4-tbl .rot{font-size:8.5px}" +
      ".a4-logo{max-height:60px}" +
    "}";
    var st = document.createElement("style"); st.id = "ar-css"; st.textContent = css; document.head.appendChild(st);
  }
})();

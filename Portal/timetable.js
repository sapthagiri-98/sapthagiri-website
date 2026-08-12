/* =========================================================================
   timetable.js — Timetable Management (Management only)  — v2
   Fixes: (1) class-label normalization, (2) cleaner toolbar,
          (3) robust Excel paste (quote-aware TSV, Subject/Teacher on 2 lines,
              auto-skips Break/Lunch/Diary columns).
   ========================================================================= */
(function () {
  "use strict";
  var P = window.Portal;
  var session = P.bootPage("timetable");
  if (!session) return;
  if (session.role !== "Management") { location.replace("dashboard.html"); return; }
  var esc = P.esc, byId = function (id) { return document.getElementById(id); };
  injectCss();
  var BOOT = null, STATE = { campus: "Primary", day: 1, rows: [], dirty: false };
  var ACTIVITY = { "sports": 1, "games": 1, "karate": 1, "dance": 1, "art zone": 1, "pet": 1, "leisure": 1 };

  render();

  function render() {
    byId("view").innerHTML =
      '<div class="tt-head"><span class="ex-chip">ERP Core</span>' +
        '<h1 class="tt-title">Timetable Management</h1>' +
        '<p class="tt-sub">Edit the master timetable in a simple grid. Changes here instantly drive the Homework Diary, Exams and staff reminders. Import from Excel, fix any cell, and save.</p></div>' +
      '<div id="ttBar" class="tt-bar"></div>' +
      '<div id="ttGrid" class="tt-empty"><i class="material-icons">sync</i> Loading timetable…</div>' +
      importModal() + copyModal();
    P.api("ttBootstrap", [], { overlay: false }).then(function (b) {
      BOOT = b; mountBar(); bindModals(); loadGrid();
    }).catch(function (e) { byId("ttGrid").innerHTML = err(e); });
  }

  function mountBar() {
    var camp = BOOT.campuses.map(function (c) { return '<button class="tt-seg' + (c === STATE.campus ? " on" : "") + '" data-c="' + c + '">' + c + '</button>'; }).join("");
    var days = BOOT.days.map(function (d) { return '<button class="tt-day' + (d.n === STATE.day ? " on" : "") + '" data-d="' + d.n + '">' + d.label.slice(0, 3) + '</button>'; }).join("");
    byId("ttBar").innerHTML =
      '<div class="tt-controls">' +
        '<div class="tt-grp"><span class="tt-grplbl">Campus</span><div class="tt-segwrap">' + camp + '</div></div>' +
        '<div class="tt-grp"><span class="tt-grplbl">Day</span><div class="tt-daywrap">' + days + '</div></div>' +
      '</div>' +
      '<div class="tt-actions">' +
        '<button id="ttImport" class="btn btn-outline"><i class="material-icons">content_paste</i> Import</button>' +
        '<button id="ttCopy" class="btn btn-outline"><i class="material-icons">content_copy</i> Copy day</button>' +
        '<button id="ttSave" class="btn btn-maroon"><i class="material-icons">save</i> Save Day</button>' +
      '</div>';
    q(".tt-seg", function (b) { b.onclick = function () { if (guard()) { STATE.campus = b.getAttribute("data-c"); mountBar(); loadGrid(); } }; });
    q(".tt-day", function (b) { b.onclick = function () { if (guard()) { STATE.day = +b.getAttribute("data-d"); mountBar(); loadGrid(); } }; });
    byId("ttImport").onclick = openImport;
    byId("ttCopy").onclick = openCopy;
    byId("ttSave").onclick = saveGrid;
  }
  function guard() { if (STATE.dirty && !confirm("You have unsaved changes. Discard them?")) return false; STATE.dirty = false; return true; }

  function loadGrid() {
    byId("ttGrid").innerHTML = '<div class="tt-empty"><i class="material-icons">sync</i> Loading…</div>';
    P.api("ttGetGrid", [STATE.campus, STATE.day], { overlay: false }).then(function (g) {
      STATE.rows = g.rows || []; STATE.dirty = false; renderGrid();
    }).catch(function (e) { byId("ttGrid").innerHTML = err(e); });
  }

  function subjList() { return (BOOT.subjects || []).map(function (s) { return '<option value="' + esc(s) + '">'; }).join(""); }
  function teachList() { return (BOOT.teachers || []).map(function (t) { return '<option value="' + esc(t) + '">'; }).join(""); }

  function renderGrid() {
    if (!STATE.rows.length) { byId("ttGrid").innerHTML = '<div class="tt-empty"><i class="material-icons">grid_off</i>No classes for ' + esc(STATE.campus) + '.</div>'; return; }
    var head = '<tr><th class="tt-cls">Class</th>';
    for (var p = 1; p <= 8; p++) head += '<th>P' + p + '</th>';
    head += '</tr>';
    var body = STATE.rows.map(function (r, ri) {
      var tds = r.cells.map(function (c, ci) {
        return '<td class="tt-cell' + (c.isActivity ? " act" : "") + '">' +
          '<input class="tt-sub" list="ttSubs" placeholder="Subject" value="' + esc(c.subject) + '" data-r="' + ri + '" data-c="' + ci + '" data-k="subject">' +
          '<input class="tt-teach" list="ttTeach" placeholder="Teacher" value="' + esc(c.teacher) + '" data-r="' + ri + '" data-c="' + ci + '" data-k="teacher">' +
          '<label class="tt-act" title="Activity (no homework)"><input type="checkbox" data-r="' + ri + '" data-c="' + ci + '" data-k="isActivity"' + (c.isActivity ? " checked" : "") + '>A</label>' +
          '</td>';
      }).join("");
      return '<tr><td class="tt-cls">' + esc(r.class) + '</td>' + tds + '</tr>';
    }).join("");
    byId("ttGrid").innerHTML =
      '<datalist id="ttSubs">' + subjList() + '</datalist>' +
      '<datalist id="ttTeach">' + teachList() + '</datalist>' +
      '<div class="tt-gridwrap"><table class="tt-table"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' +
      '<div class="tt-legend"><span class="chip act">A = Activity (Sports/Games — no homework)</span> · Leave a cell blank to remove that period.</div>';
    q(".tt-sub,.tt-teach,.tt-act input", function (el) {
      var ev = el.type === "checkbox" ? "change" : "input";
      el.addEventListener(ev, function () {
        var ri = +el.getAttribute("data-r"), ci = +el.getAttribute("data-c"), k = el.getAttribute("data-k");
        STATE.rows[ri].cells[ci][k] = el.type === "checkbox" ? el.checked : el.value;
        if (k === "isActivity") el.closest("td").classList.toggle("act", el.checked);
        STATE.dirty = true;
      });
    });
  }

  function saveGrid() {
    var cells = [];
    STATE.rows.forEach(function (r) { r.cells.forEach(function (c) { cells.push({ class: r.class, period_no: c.period_no, subject: c.subject, teacher: c.teacher, phone: c.phone || "", isActivity: !!c.isActivity }); }); });
    var b = byId("ttSave"); b.disabled = true; b.innerHTML = '<i class="material-icons">sync</i> Saving…';
    P.api("ttSaveGrid", [STATE.day, cells], { text: "Saving timetable…" }).then(function (r) {
      STATE.dirty = false; toast("Saved · " + r.saved + " slots" + (r.cleared ? " · " + r.cleared + " cleared" : ""), "ok");
    }).catch(function (e) { toast(e.message || e, "err"); }).finally(function () { b.disabled = false; b.innerHTML = '<i class="material-icons">save</i> Save Day'; });
  }

  /* ---------- copy day ---------- */
  function openCopy() {
    var opts = BOOT.days.filter(function (d) { return d.n !== STATE.day; }).map(function (d) { return '<option value="' + d.n + '">' + d.label + '</option>'; }).join("");
    byId("cpFrom").innerHTML = opts;
    byId("cpTitle").textContent = "Copy into " + dayLabel(STATE.day) + " (" + STATE.campus + ")";
    P.openModal("ttCopyModal");
  }
  function doCopy() {
    var from = +byId("cpFrom").value;
    var classes = (STATE.rows || []).map(function (r) { return r.class; });
    P.api("ttCopyDay", [from, STATE.day, classes], { text: "Copying…" }).then(function (r) {
      P.closeModal("ttCopyModal"); toast("Copied " + r.copied + " slots from " + dayLabel(from) + ".", "ok"); loadGrid();
    }).catch(function (e) { toast(e.message || e, "err"); });
  }

  /* ---------- import: quote-aware TSV paste from Excel/Sheets ---------- */
  function openImport() { byId("imText").value = ""; P.openModal("ttImportModal"); }

  // parse tab-separated text where cells may be quoted and contain newlines
  function parseTSV(text) {
    var rows = [], row = [], cur = "", inQ = false, i = 0, n = text.length;
    while (i < n) {
      var ch = text[i];
      if (inQ) {
        if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i += 2; continue; } inQ = false; i++; continue; }
        cur += ch; i++; continue;
      }
      if (ch === '"') { inQ = true; i++; continue; }
      if (ch === '\t') { row.push(cur); cur = ""; i++; continue; }
      if (ch === '\r') { i++; continue; }
      if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ""; i++; continue; }
      cur += ch; i++;
    }
    if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }

  function parsePaste() {
    var raw = byId("imText").value;
    if (!raw.trim()) { toast("Paste the grid first.", "err"); return; }
    var grid = parseTSV(raw);
    if (!grid.length) { toast("Nothing to import.", "err"); return; }

    // find header row (has a cell === PERIOD) — else use the first row
    var hIdx = -1;
    for (var r = 0; r < grid.length; r++) {
      if (grid[r].some(function (c) { return String(c).trim().toUpperCase() === "PERIOD"; })) { hIdx = r; break; }
    }
    if (hIdx < 0) hIdx = 0;
    var hdr = grid[hIdx];

    // period columns = header cells that START with a digit 1..8 (skip BREAK/LUNCH/DIARY)
    var pcols = [];
    for (var ci = 1; ci < hdr.length; ci++) {
      var t = String(hdr[ci]).trim();
      if (/^[1-9]/.test(t)) pcols.push(ci);
    }
    pcols = pcols.slice(0, 8);
    if (!pcols.length) { toast("Could not find period columns in the paste (need the header row with 1..8).", "err"); return; }

    var applied = 0, unknownTeach = 0, unmatched = [];
    for (var ri = hIdx + 1; ri < grid.length; ri++) {
      var cols = grid[ri];
      var label = "";
      for (var k = 0; k < Math.min(2, cols.length); k++) { if (String(cols[k]).trim()) { label = String(cols[k]).trim(); break; } }
      if (!label) continue;
      var cls = canonClass(label);
      if (!cls) continue;
      var row = STATE.rows.filter(function (rr) { return canonClass(rr.class) === cls; })[0];
      if (!row) { unmatched.push(label); continue; }
      for (var pi = 0; pi < pcols.length && pi < 8; pi++) {
        var cell = String(cols[pcols[pi]] || "").trim();
        var lines = cell.split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
        var subject = lines[0] || "";
        var teacher = lines.length > 1 ? lines[1] : "";
        row.cells[pi].subject = subject;
        row.cells[pi].teacher = teacher;
        row.cells[pi].isActivity = !!(subject && ACTIVITY[subject.toLowerCase()]);
        if (subject && !teacher && !ACTIVITY[subject.toLowerCase()]) unknownTeach++;
      }
      applied++;
    }
    P.closeModal("ttImportModal");
    STATE.dirty = true; renderGrid();
    var msg = "Imported " + applied + " class row(s)";
    if (unknownTeach) msg += " · " + unknownTeach + " teacher(s) blank";
    if (unmatched.length) msg += " · skipped: " + unmatched.slice(0, 4).join(", ") + (unmatched.length > 4 ? "…" : "");
    toast(msg + ". Review & Save.", "ok");
  }

  // "GRADE-6" / "Grade 6" / "6.0" → "6" ; "PRE-KG" → "NURSERY"
  function canonClass(s) {
    var u = String(s).toUpperCase().replace(/\s+/g, "").replace(/\.0+$/, "").replace(/^GRADE[-]?/, "");
    if (u === "PRE-KG" || u === "PREKG") u = "NURSERY";
    return u;
  }

  /* ---------- modals / helpers ---------- */
  function dayLabel(n) { var d = BOOT.days.filter(function (x) { return x.n === n; })[0]; return d ? d.label : "Day " + n; }
  function importModal() {
    return '<div class="modal-overlay" id="ttImportModal"><div class="tt-modal"><div class="tt-mhead"><span><i class="material-icons" style="vertical-align:-4px">content_paste</i> Import from Excel (paste a day)</span><button data-close="ttImportModal">&times;</button></div>' +
      '<div class="tt-mbody">' +
        '<div class="tt-note"><i class="material-icons">info</i> In Excel/Sheets, select the whole day block <b>including the PERIOD header row</b> and the class rows. Copy (Ctrl+C) and paste below. It auto-detects the 8 period columns (skipping Break/Lunch/Diary), and reads <b>Subject</b> on the first line and <b>Teacher</b> on the second line of each cell. Fix any blank cell after import.</div>' +
        '<textarea id="imText" class="tt-paste" placeholder="Paste here — e.g. copy the CLASSES SCHEDULE - MONDAY block from your Excel timetable."></textarea>' +
      '</div><div class="tt-mfoot"><button class="btn btn-outline" data-close="ttImportModal">Cancel</button><button id="imGo" class="btn btn-maroon"><i class="material-icons">download_done</i> Import into grid</button></div></div></div>';
  }
  function copyModal() {
    return '<div class="modal-overlay" id="ttCopyModal"><div class="tt-modal"><div class="tt-mhead"><span id="cpTitle">Copy day</span><button data-close="ttCopyModal">&times;</button></div>' +
      '<div class="tt-mbody"><div class="tt-note"><i class="material-icons">info</i> Copies another day\'s grid into the current day for the visible classes. The current day\'s existing entries for those classes are replaced.</div>' +
      '<label class="tt-lbl">Copy from</label><select id="cpFrom" class="tt-in"></select></div>' +
      '<div class="tt-mfoot"><button class="btn btn-outline" data-close="ttCopyModal">Cancel</button><button id="cpGo" class="btn btn-maroon"><i class="material-icons">content_copy</i> Copy</button></div></div></div>';
  }
  function bindModals() {
    q("[data-close]", function (b) { b.onclick = function () { P.closeModal(b.getAttribute("data-close")); }; });
    q(".modal-overlay", function (m) { m.addEventListener("click", function (e) { if (e.target === m) P.closeModal(m.id); }); });
    if (byId("imGo")) byId("imGo").onclick = parsePaste;
    if (byId("cpGo")) byId("cpGo").onclick = doCopy;
  }

  function q(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }
  function err(e) { return '<div class="tt-empty"><i class="material-icons">error_outline</i>' + esc(e && e.message ? e.message : e) + '</div>'; }
  function toast(msg, kind) {
    var t = byId("ttToast"); if (!t) { t = document.createElement("div"); t.id = "ttToast"; document.body.appendChild(t); }
    var ic = kind === "err" ? "error" : (kind === "ok" ? "check_circle" : "info");
    t.className = ""; if (kind) t.classList.add(kind);
    t.innerHTML = '<i class="material-icons">' + ic + '</i>' + esc(msg);
    void t.offsetWidth; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove("show"); }, 3200);
  }

  function injectCss() {
    if (byId("tt-css")) return;
    var css =
    ".tt-head{margin-bottom:10px}.tt-title{font-size:22px;color:var(--maroon);margin:4px 0}.tt-sub{color:var(--text-muted);font-size:13px;max-width:760px}" +
    ".ex-chip{font-size:11px;font-weight:700;color:var(--maroon);background:var(--primary-light);padding:3px 10px;border-radius:999px}" +
    // toolbar: controls left, actions right; wraps cleanly on small screens
    ".tt-bar{display:flex;flex-wrap:wrap;gap:14px;align-items:center;background:#fff;border:1px solid var(--border);border-radius:14px;padding:12px 14px;box-shadow:var(--shadow-sm);margin-bottom:14px}" + ".tt-controls{display:flex;flex-wrap:wrap;gap:16px;align-items:center;margin-right:auto}" +
    ".tt-grp{display:flex;flex-direction:column;gap:5px}.tt-grplbl{font-size:11px;font-weight:800;color:var(--text-muted);letter-spacing:.3px;text-transform:uppercase}" +
    ".tt-segwrap,.tt-daywrap{display:inline-flex;gap:4px;background:#f1f5f9;border:1px solid var(--border);border-radius:999px;padding:4px}" +
    ".tt-seg,.tt-day{border:none;background:transparent;font-weight:700;font-size:13px;padding:7px 14px;border-radius:999px;cursor:pointer;color:var(--text-muted);white-space:nowrap}" +
    ".tt-seg.on,.tt-day.on{background:var(--maroon);color:#fff}" +
    ".tt-actions{display:flex;gap:8px;flex-wrap:nowrap;align-items:center}" +
    ".btn{border:none;border-radius:10px;padding:9px 14px;font-weight:700;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}.btn-maroon{background:var(--maroon);color:#fff}.btn-outline{background:#fff;border:1px solid var(--border);color:var(--text-main)}.btn i{font-size:18px}.btn:disabled{opacity:.6}" +
    ".tt-empty{text-align:center;padding:32px;color:var(--text-muted);font-weight:600;background:#fff;border:1px dashed var(--border);border-radius:14px}.tt-empty i{font-size:32px;color:var(--maroon);display:block;margin-bottom:8px}" +
    ".tt-gridwrap{overflow:auto;background:#fff;border:1px solid var(--border);border-radius:14px}" +
    ".tt-table{border-collapse:separate;border-spacing:0;width:100%;font-size:12px}" +
    ".tt-table th,.tt-table td{border-bottom:1px solid #eef2f7;border-right:1px solid #eef2f7;padding:4px;vertical-align:top}" +
    ".tt-table thead th{position:sticky;top:0;background:#faf5f5;color:var(--maroon);font-weight:800;text-align:center;z-index:3}" +
    ".tt-table td.tt-cls,.tt-table th.tt-cls{position:sticky;left:0;background:#fff;font-weight:800;color:var(--text-main);min-width:74px;text-align:center;z-index:2}" +
    ".tt-table thead th.tt-cls{z-index:4;background:#faf5f5}" +
    ".tt-cell{min-width:120px}.tt-cell.act{background:#f4f4f4}" +
    ".tt-sub,.tt-teach{width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:5px 6px;font:inherit;font-size:12px;background:#fff;margin-bottom:3px}" +
    ".tt-sub{font-weight:700}.tt-teach{color:#475569}" +
    ".tt-act{display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;color:#64748b;cursor:pointer}.tt-act input{accent-color:var(--maroon)}" +
    ".tt-legend{font-size:12px;color:var(--text-muted);margin-top:8px}.tt-legend .chip.act{background:#f4f4f4;padding:2px 8px;border-radius:6px;font-weight:700}" +
    ".modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,.45);display:none;align-items:center;justify-content:center;z-index:9999;padding:16px}.modal-overlay.show{display:flex}" +
    ".tt-modal{background:#fff;border-radius:16px;max-width:640px;width:100%;max-height:90vh;display:flex;flex-direction:column}" +
    ".tt-mhead{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid var(--border);font-weight:700}.tt-mhead button{border:none;background:none;font-size:24px;cursor:pointer}" +
    ".tt-mbody{padding:16px;overflow:auto}.tt-mfoot{display:flex;justify-content:flex-end;gap:8px;padding:14px 18px;border-top:1px solid var(--border)}" +
    ".tt-note{display:flex;gap:8px;background:var(--primary-light);border:1px solid var(--border);border-radius:10px;padding:10px 12px;font-size:12.5px;margin-bottom:10px;line-height:1.5}.tt-note i{color:var(--maroon);font-size:18px;flex:0 0 auto}" +
    ".tt-paste{width:100%;min-height:200px;border:1px solid var(--border);border-radius:10px;padding:10px;font-family:monospace;font-size:12px}" +
    ".tt-lbl{font-size:12px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px}.tt-in{width:100%;padding:9px 11px;border:1px solid var(--border);border-radius:10px;font:inherit}" +
    "#ttToast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%) translateY(20px);z-index:99999;background:#14171f;color:#fff;padding:12px 18px;border-radius:12px;font-size:14px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.25);display:flex;align-items:center;gap:8px;opacity:0;pointer-events:none;transition:all .25s;max-width:88vw}#ttToast.show{opacity:1;transform:translateX(-50%) translateY(0)}#ttToast.ok{background:#065f46}#ttToast.err{background:#991b1b}#ttToast i{font-size:18px}" +
    "@media(max-width:720px){.tt-bar{align-items:stretch}.tt-actions{width:100%;justify-content:flex-end}}";
    var st = document.createElement("style"); st.id = "tt-css"; st.textContent = css; document.head.appendChild(st);
  }
})();

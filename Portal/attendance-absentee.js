/* =========================================================================
   attendance-absentee.js — Absentee WhatsApp (own sub-tab, Management)
   Pick a class + date → find absentees → one-tap wa.me messages.
   Backend: getClasses, attAbsentees  (already on Supabase attendance-api).
   ========================================================================= */
(function () {
  "use strict";
  var P = window.Portal;
  var session = P.bootPage("attabsent");
  if (!session) return;
  if (session.role !== "Management") { location.replace("attendance.html"); return; }
  var esc = P.esc, byId = function (id) { return document.getElementById(id); };
  injectCss();

  byId("view").innerHTML =
    '<div class="aw-head"><span class="ex-chip">ERP Core</span>' +
      '<h1 class="aw-title">Absentee WhatsApp</h1>' +
      '<p class="aw-sub">Pick a class and date to find students who were absent, then send each parent a WhatsApp message with one tap.</p></div>' +
    '<div class="aw-bar">' +
      '<div class="aw-f"><label>Class</label><select id="awClass" class="aw-in"><option>Loading…</option></select></div>' +
      '<div class="aw-f"><label>Date</label><input id="awDate" type="date" class="aw-in"></div>' +
      '<button id="awGo" class="btn btn-maroon"><i class="material-icons">search</i> Find Absentees</button>' +
    '</div>' +
    '<div id="awResult"></div>';

  byId("awDate").value = (new Date()).toISOString().slice(0, 10);
  byId("awGo").onclick = run;

  P.api("getClasses", [""], { text: "Loading classes…" }).then(function (cs) {
    cs = cs || []; if (P.sortGrades) P.sortGrades(cs);
    byId("awClass").innerHTML = '<option value="ALL">All classes</option>' +
      cs.map(function (c) { return '<option>' + esc(c) + "</option>"; }).join("");
  }).catch(function () { byId("awClass").innerHTML = '<option value="ALL">All classes</option>'; });

  function run() {
    var cls = byId("awClass").value || "ALL", date = byId("awDate").value;
    if (!date) { alert("Pick a date."); return; }
    byId("awResult").innerHTML = '<div class="aw-empty"><i class="material-icons">sync</i> Checking…</div>';
    P.api("attAbsentees", [cls, date], { overlay: false }).then(function (r) {
      if (!r.anyMarked) { byId("awResult").innerHTML = '<div class="aw-note warn">Attendance has not been entered for this date.</div>'; return; }
      if (!r.rows.length) { byId("awResult").innerHTML = '<div class="aw-note ok">Attendance entered · no absentees. 🎉</div>'; return; }

      // sort: class (grade order) then student name
      var list = (r.rows || []).slice().sort(function (a, b) {
        var g = gradeWeight(a.class) - gradeWeight(b.class);
        return g !== 0 ? g : String(a.name).localeCompare(String(b.name));
      });

      var rows = list.map(function (x) {
        var sess = titleCase(x.session);
        var msg = "Dear Parent,\n" + x.name + " was absent for the " + sess.toLowerCase() +
          " on " + prettyDate(date) + ".\nPlease ensure regular attendance.\n\n  - SAPTHAGIRI SCHOOL";
        var wa = P.waLink(x.phone, msg);
        return '<tr><td>' + esc(x.class) + '</td><td>' + esc(x.name) + '</td><td>' + esc(sess) + '</td>' +
          '<td>' + esc(x.phone || "—") + '</td><td>' +
          (x.phone ? sendLink(wa) : '<span class="aw-muted">no phone</span>') +
          '</td></tr>';
      }).join("");
      byId("awResult").innerHTML =
        '<div class="aw-note">' + list.length + ' absentee message(s) ready · ' + esc(prettyDate(date)) + '</div>' +
        '<div class="aw-tablewrap"><table class="aw-table"><thead><tr><th>Class</th><th>Student</th><th>Absence</th><th>Phone</th><th></th></tr></thead><tbody>' +
        rows + '</tbody></table></div>';
    }).catch(function (e) { byId("awResult").innerHTML = '<div class="aw-note warn">' + esc(e.message || e) + '</div>'; });
  }

  function sendLink(url) {
    var LT = String.fromCharCode(60), GT = String.fromCharCode(62); // < and >
    return LT + 'a class="aw-send" target="_blank" href="' + url + '"' + GT + 'Send' + LT + '/a' + GT;
  }

  function titleCase(s) {
    return String(s || "").toLowerCase().replace(/\b\w/g, function (m) { return m.toUpperCase(); });
  }
  var GRADE_ORDER = { NURSERY: 1, LKG: 2, UKG: 3 };
  function gradeWeight(n) {
    var k = String(n).toUpperCase().replace(/\s+/g, "");
    if (GRADE_ORDER[k] !== undefined) return GRADE_ORDER[k];
    var m = k.match(/\d+/); return m ? 100 + parseInt(m[0], 10) : 999;
  }

  function prettyDate(iso) {
    var p = iso.split("-"); if (p.length !== 3) return iso;
    var mo = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+p[1] - 1];
    return p[2] + " " + mo + " " + p[0];
  }

  function injectCss() {
    if (byId("aw-css")) return;
    var css =
    ".aw-head{margin-bottom:10px}.aw-title{font-size:22px;color:var(--maroon);margin:4px 0}.aw-sub{color:var(--text-muted);font-size:13px;max-width:720px}" +
    ".ex-chip{font-size:11px;font-weight:700;color:var(--maroon);background:var(--primary-light);padding:3px 10px;border-radius:999px}" +
    ".aw-bar{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;background:#fff;border:1px solid var(--border);border-radius:14px;padding:12px 14px;box-shadow:var(--shadow-sm);margin-bottom:14px}" +
    ".aw-f{display:flex;flex-direction:column;gap:4px}.aw-f label{font-size:12px;font-weight:700;color:var(--text-muted)}" +
    ".aw-in{padding:9px 11px;border:1px solid var(--border);border-radius:10px;font:inherit;min-width:170px;background:#fff}" +
    ".btn{border:none;border-radius:10px;padding:10px 15px;font-weight:700;font-size:13.5px;cursor:pointer;display:inline-flex;align-items:center;gap:6px}.btn-maroon{background:var(--maroon);color:#fff}.btn i{font-size:18px}" +
    ".aw-empty{text-align:center;padding:26px;color:var(--text-muted);font-weight:600;background:#fff;border:1px dashed var(--border);border-radius:14px}.aw-empty i{font-size:30px;color:var(--maroon);display:block;margin-bottom:6px}.aw-muted{color:#94a3b8}" +
    ".aw-note{font-size:13px;font-weight:600;padding:9px 12px;border-radius:10px;background:var(--primary-light);margin-bottom:10px}.aw-note.ok{background:#ecfdf5;color:#065f46}.aw-note.warn{background:#fef2f2;color:#991b1b}" +
    ".aw-tablewrap{overflow:auto;border:1px solid var(--border);border-radius:12px}.aw-table{width:100%;border-collapse:collapse;font-size:13px}.aw-table th,.aw-table td{padding:9px 11px;border-bottom:1px solid #f1f2f6;text-align:left}.aw-table th{background:#faf5f5;color:var(--maroon);font-size:11.5px;text-transform:uppercase}" +
    ".aw-send{display:inline-block;background:#25D366;color:#fff;font-weight:700;padding:6px 14px;border-radius:8px;text-decoration:none;font-size:12px}";
    var st = document.createElement("style"); st.id = "aw-css"; st.textContent = css; document.head.appendChild(st);
  }
})();

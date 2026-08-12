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
  function loadList() {
    var host = $("holList");
    host.innerHTML = '<div class="inline-loader"><i class="material-icons">sync</i>Loading…</div>';
    P.api("getAllHolidays", [], { overlay: false }).then(function (list) {
      renderList(list || []);
    }).catch(function () {
      // backend function not present yet — form still works
      host.innerHTML = '<div class="hol-empty"><i class="material-icons">info</i>The holidays list needs the optional <b>getAllHolidays</b> backend function (see the README). You can still add holidays above.</div>';
    });
  }
  function renderList(list) {
    var host = $("holList");
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
      ".hol-del{flex:0 0 auto;border:1px solid #fecaca;background:#fff;color:var(--danger);width:34px;height:34px;border-radius:9px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}.hol-del:hover{background:var(--danger);color:#fff;border-color:var(--danger)}.hol-del i{font-size:18px}" +
      ".pill{display:inline-flex;align-items:center;gap:5px;padding:4px 11px;border-radius:999px;font-size:12px;font-weight:700}.pill.blue{background:#e0f2fe;color:#075985}.pill.orange{background:var(--warning-light);color:#92400e}";
    var st = document.createElement("style"); st.id = "hol-css"; st.textContent = css; document.head.appendChild(st);
  }
})();

/* =========================================================================
   examinations.js — Examinations (ONE module, ONE file).
   Boots as Management ("Examinations Management") or Teacher
   ("Examinations Tracker") depending on session.role. Both experiences
   share the same marks-entry engine, exam pattern and backend (exams-api).

   Exam pattern (confirmed):
     FA-1 -> CT-1,CT-2,UT,HA   FA-2 -> CT-3,CT-4,UT,HA
     SA-1 -> Internal(20, avg of FA-1+FA-2) + SA exam(80)
     FA-3 -> CT-5,CT-6,UT,HA   FA-4 -> CT-7,CT-8,UT,HA
     SA-2 -> Internal(20, avg of FA-1..FA-4) + SA exam(80)
   Component *labels* (Class Test 1..8) are computed by the backend per
   bucket; this file just displays whatever label the API returns.

   Admin tabs:   Overview · Schedule · Marks Entry · Locks · Reports
   Teacher tabs: Schedule · Marks Entry
   ========================================================================= */
(function () {
  "use strict";
  var P = window.Portal;
  var esc = P.esc, $ = function (id) { return document.getElementById(id); };

  var session0 = P.Session.get();
  if (!session0) { location.replace("login.html"); return; }
  var isAdmin = session0.role === "Management";
  var session = P.bootPage(isAdmin ? "exams" : "examstrack");
  if (!session) return;
  var me = session.name;

  var GRADES = ["Nursery", "LKG", "UKG", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10"];
  var BUCKET_SEQ = ["FA-1", "FA-2", "SA-1", "FA-3", "FA-4", "SA-2"];

  /* ---------------- inline toast / loading / empty ---------------- */
  function toast(msg, kind) {
    var t = $("exToast");
    if (!t) { t = document.createElement("div"); t.id = "exToast"; document.body.appendChild(t); }
    var icon = kind === "err" ? "error" : (kind === "ok" ? "check_circle" : "info");
    t.className = ""; if (kind) t.classList.add(kind);
    t.innerHTML = '<i class="material-icons">' + icon + '</i><span>' + esc(msg) + "</span>";
    void t.offsetWidth; t.classList.add("show");
    clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }
  function loading(id, msg) { var el = $(id); if (el) el.innerHTML = '<div class="ex-loading"><i class="material-icons">sync</i><div style="margin-top:8px;">' + (msg || "Loading…") + "</div></div>"; }
  function empty(id, msg, icon) { var el = $(id); if (el) el.innerHTML = '<div class="ex-empty"><i class="material-icons">' + (icon || "grid_on") + "</i>" + msg + "</div>"; }
  function overFlag(el, max) { var over = el.value !== "" && Number(el.value) > Number(max); el.classList.toggle("over", over); var row = el.closest(".ex-entryrow"); if (row) row.classList.toggle("over", over); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function dayName(v) { if (!v) return ""; var p = v.split("-"); var d = new Date(+p[0], +p[1] - 1, +p[2]); return isNaN(d.getTime()) ? "" : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()]; }
  function statusPill(s) {
    if (s === "SCHEDULED") return '<span class="ex-status sched">Scheduled</span>';
    if (s === "PENDING_DATE") return '<span class="ex-status pdate">Needs date</span>';
    if (s === "PENDING_SYLLABUS") return '<span class="ex-status psyl">No syllabus</span>';
    return '<span class="ex-status draft">Draft</span>';
  }

  /* =======================================================================
     SHARED MARKS-ENTRY ENGINE (used by both Admin "Marks Entry" and
     Teacher "Marks Entry" tabs)
     ======================================================================= */

  // single-subject entry list (teacher academic view)
  function renderSingle(g, hostId, isMgmt, entryUser, refresh) {
    var host = $(hostId), locked = g.locked, html = "";
    if (locked) html += '<div class="ex-lock"><i class="material-icons">lock</i>Locked' + (isMgmt ? " — unlock to edit." : " by management. Contact management to change.") + "</div>";
    html += '<div class="ex-note" style="margin-bottom:10px;"><b>' + esc(g.className) + " · " + esc(g.subject) + "</b> — " + esc(g.bucket) + " · " + esc(g.componentLabel) + ' &middot; <span style="color:var(--text-muted);">max ' + esc(g.max) + "</span></div>";
    html += '<div class="ex-entrylist">';
    g.rows.forEach(function (r) {
      var over = (!r.absent && r.scored !== "" && r.scored != null && Number(r.scored) > Number(g.max));
      html += '<div class="ex-entryrow ' + (r.absent ? "absent" : "") + (over ? " over" : "") + '" data-id="' + esc(r.id) + '" data-name="' + esc(r.name) + '">' +
        '<div class="ex-einfo"><span class="ex-eroll">' + esc(r.roll) + '</span><span class="ex-ename">' + esc(r.name) + "</span></div>" +
        '<div class="ex-ectrl"><input class="ex-in mk-mark" type="number" inputmode="decimal" min="0" max="' + g.max + '" step="0.5" value="' + (r.absent ? "" : esc(r.scored)) + '" ' + (r.absent || locked ? "disabled" : "") + '><span class="ex-emax">/ ' + esc(g.max) + "</span>" +
        '<label class="ex-abs"><input type="checkbox" ' + (r.absent ? "checked" : "") + " " + (locked ? "disabled" : "") + "> Absent</label></div></div>";
    });
    html += "</div><div class='ex-actbar'>";
    if (!locked || isMgmt) html += '<button class="btn btn-success mk-save" style="width:auto;padding:11px 18px;"><i class="material-icons" style="color:#fff;">save</i> Save Marks</button>';
    html += '<span class="ex-note">Blank = not entered. Toggle Absent for absentees. Marks can\'t exceed max.</span></div>';
    host.innerHTML = html;
    Array.prototype.forEach.call(host.querySelectorAll(".mk-mark"), function (inp) { inp.addEventListener("input", function () { overFlag(inp, g.max); }); });
    Array.prototype.forEach.call(host.querySelectorAll(".ex-abs input"), function (cb) {
      cb.addEventListener("change", function () {
        var row = cb.closest(".ex-entryrow"), inp = row.querySelector(".ex-in");
        if (cb.checked) { inp.value = ""; inp.disabled = true; inp.classList.remove("over"); row.classList.remove("over"); row.classList.add("absent"); }
        else { inp.disabled = false; row.classList.remove("absent"); }
      });
    });
    var sb = host.querySelector(".mk-save");
    if (sb) sb.addEventListener("click", function () {
      var entries = [], over = 0;
      Array.prototype.forEach.call(host.querySelectorAll(".ex-entryrow"), function (row) {
        var inp = row.querySelector(".ex-in"), abs = row.querySelector(".ex-abs input").checked;
        if (!abs && inp.value !== "" && Number(inp.value) > Number(g.max)) over++;
        entries.push({ id: row.getAttribute("data-id"), name: row.getAttribute("data-name"), bucket: g.bucket, component: g.component, subject: g.subject, scored: inp.value, absent: abs });
      });
      if (over > 0) { toast(over + " mark" + (over > 1 ? "s" : "") + " exceed the max (" + g.max + "). Fix the red ones.", "err"); return; }
      sb.disabled = true; sb.innerHTML = '<i class="material-icons" style="color:#fff;">sync</i> Saving…';
      P.api("marksSaveBulk", [{ className: g.className, entries: entries, enteredBy: entryUser, isManagement: !!isMgmt }]).then(function (res) {
        toast((res && res.message) || (res && res.success ? "Saved" : "Failed"), res && res.success ? "ok" : "err");
      }).catch(function (e) { toast("Error: " + (e.message || e), "err"); }).finally(function () { sb.disabled = false; sb.innerHTML = '<i class="material-icons" style="color:#fff;">save</i> Save Marks'; });
    });
  }

  // class grid (admin: all-subjects academic / holistic indicators)
  function renderClassGrid(g, hostId, user, onLockToggled) {
    var host = $(hostId), locked = g.locked, html = "", cols = [];
    if (g.mode === "academic") cols = g.subjects.map(function (s) { return { key: s, label: s, max: g.max }; });
    else cols = g.indicators.map(function (i) { return { key: i.key, label: i.label, max: i.max }; });
    if (locked) html += '<div class="ex-lock"><i class="material-icons">lock</i>Locked — unlock to edit.</div>';
    html += '<div class="ex-note" style="margin-bottom:10px;"><b>' + esc(g.className) + "</b> — " + esc(g.bucket) + " · " + esc(g.componentLabel || (g.mode === "holistic" ? "Holistic Indicators" : "")) + "</div>";
    html += '<div class="ex-tablewrap"><table class="ex-table"><thead><tr><th class="name">Roll · Student</th>';
    cols.forEach(function (c) { html += "<th>" + esc(c.label) + "</th>"; });
    html += "</tr></thead><tbody>";
    var dis = locked ? "disabled" : "";
    g.rows.forEach(function (r) {
      html += '<tr data-id="' + esc(r.id) + '" data-name="' + esc(r.name) + '"><td class="name">' + esc(r.roll) + " · " + esc(r.name) + "</td>";
      cols.forEach(function (c) {
        var cell = r.cells[c.key] || { scored: "" };
        if (g.mode === "academic") {
          html += '<td class="' + (cell.absent ? "abscell" : "") + '" data-col="' + esc(c.key) + '" data-max="' + c.max + '"><input class="ex-in" type="text" inputmode="decimal" value="' + (cell.absent ? "Ab" : esc(cell.scored)) + '" ' + (cell.absent ? 'data-abs="1"' : "") + " " + dis + "></td>";
        } else {
          var v = cell.scored; v = (v == null ? "" : v);
          html += '<td data-col="' + esc(c.key) + '"><input class="ex-in" type="number" min="0" ' + (c.max ? 'max="' + c.max + '"' : "") + ' step="0.5" value="' + esc(v) + '" ' + dis + "></td>";
        }
      });
      html += "</tr>";
    });
    html += "</tbody></table></div><div class='ex-actbar'>";
    html += '<button class="btn btn-success mk-saveall" style="width:auto;padding:11px 18px;" ' + (locked ? "disabled" : "") + '><i class="material-icons" style="color:#fff;">save</i> Save All</button>';
    html += '<button class="ex-abtn ' + (locked ? "accent" : "") + ' mk-togglelock"><i class="material-icons">' + (locked ? "lock_open" : "lock") + "</i>" + (locked ? " Unlock" : " Lock") + "</button>";
    if (g.mode === "academic") html += '<span class="ex-note">Type <b>Ab</b> in a cell for absent. Blank = not entered.</span>';
    html += "</div>";
    host.innerHTML = html;
    Array.prototype.forEach.call(host.querySelectorAll('td[data-abs="1"] .ex-in, .ex-in'), function (inp) {
      inp.addEventListener("focus", function () { var td = inp.closest("td"); if (td && td.getAttribute("data-abs") === "1") { inp.value = ""; td.removeAttribute("data-abs"); } });
    });
    var sb = host.querySelector(".mk-saveall");
    if (sb) sb.addEventListener("click", function () {
      var entries = [];
      Array.prototype.forEach.call(host.querySelectorAll("tbody tr"), function (tr) {
        var id = tr.getAttribute("data-id"), name = tr.getAttribute("data-name");
        Array.prototype.forEach.call(tr.querySelectorAll("td[data-col]"), function (td) {
          var col = td.getAttribute("data-col"), inp = td.querySelector(".ex-in"), raw = String(inp.value).trim();
          var absent = /^ab$/i.test(raw) || td.getAttribute("data-abs") === "1";
          var en = { id: id, name: name, bucket: g.bucket, component: "", subject: "", scored: "", absent: false };
          if (g.mode === "academic") { en.component = g.component; en.subject = col; en.max = td.getAttribute("data-max"); en.absent = absent; if (!absent) en.scored = raw; }
          else { en.component = col; en.scored = raw; }
          entries.push(en);
        });
      });
      sb.disabled = true; sb.innerHTML = '<i class="material-icons" style="color:#fff;">sync</i> Saving…';
      P.api("marksSaveBulk", [{ className: g.className, entries: entries, enteredBy: user, isManagement: true }]).then(function (res) {
        toast((res && res.message) || (res && res.success ? "Saved" : "Failed"), res && res.success ? "ok" : "err");
      }).catch(function (e) { toast("Error: " + (e.message || e), "err"); }).finally(function () { sb.disabled = false; sb.innerHTML = '<i class="material-icons" style="color:#fff;">save</i> Save All'; });
    });
    var lb = host.querySelector(".mk-togglelock");
    if (lb) lb.addEventListener("click", function () {
      var willLock = !g.locked;
      if (!confirm((willLock ? "Lock" : "Unlock") + " " + g.className + " · " + g.bucket + " for ALL teachers (academic + holistic)?")) return;
      P.api("marksSetLock", [g.className, g.bucket, willLock, user]).then(function () { if (onLockToggled) onLockToggled(); }).catch(function (e) { toast("Error: " + (e.message || e), "err"); });
    });
  }

  // holistic single-parameter entry (teacher, or admin preview)
  function renderHolistic(g, hostId, user, isMgmt, refresh) {
    var host = $(hostId), auto = !!g.automatic, viewOnly = !!g.locked, html = "";
    html += '<div class="ex-note" style="margin-bottom:10px;"><b>' + esc(g.className) + "</b> · " + esc(g.bucket) + " · " + esc(g.parameter) + ' <span style="color:var(--text-muted);">max ' + esc(g.max) + "</span>";
    if (auto) html += ' <span class="ex-autobadge"><i class="material-icons">bolt</i>Auto from attendance</span>';
    html += "</div>";
    if (viewOnly) html += '<div class="ex-lock"><i class="material-icons">lock</i>Locked — view only. Contact management to change.</div>';
    else if (auto) html += '<div class="ex-lock"><i class="material-icons">info</i>Attendance &amp; Punctuality is calculated automatically. Review and Save.</div>';
    html += '<div class="ex-entrylist">';
    g.rows.forEach(function (r) {
      var over = (!auto && r.scored !== "" && r.scored != null && Number(r.scored) > Number(g.max));
      var dis = (auto || viewOnly) ? "disabled" : "";
      html += '<div class="ex-entryrow ' + (over ? "over" : "") + '" data-id="' + esc(r.id) + '" data-name="' + esc(r.name) + '" data-roll="' + esc(r.roll) + '">' +
        '<div class="ex-einfo"><span class="ex-eroll">' + esc(r.roll) + '</span><span class="ex-ename">' + esc(r.name) + "</span></div>" +
        '<div class="ex-ectrl"><input class="ex-in hol-mark" type="number" inputmode="decimal" min="0" max="' + g.max + '" step="0.5" value="' + esc(r.scored) + '" ' + dis + '><span class="ex-emax">/ ' + esc(g.max) + "</span></div></div>";
    });
    html += "</div><div class='ex-actbar'>";
    if (!viewOnly) html += '<button class="btn btn-success hol-save" style="width:auto;padding:11px 18px;"><i class="material-icons" style="color:#fff;">save</i> Save Marks</button>';
    html += '<span class="ex-note">' + (viewOnly ? "Locked — view only." : (auto ? "Auto-filled from attendance." : "Blank = not entered. Score out of " + esc(g.max) + ".")) + "</span></div>";
    host.innerHTML = html;
    Array.prototype.forEach.call(host.querySelectorAll(".hol-mark"), function (inp) { if (!auto && !viewOnly) inp.addEventListener("input", function () { overFlag(inp, g.max); }); });
    var sb = host.querySelector(".hol-save");
    if (sb) sb.addEventListener("click", function () {
      var entries = [], over = 0;
      Array.prototype.forEach.call(host.querySelectorAll(".ex-entryrow"), function (row) {
        var inp = row.querySelector(".hol-mark"), val = inp ? inp.value : "";
        if (!g.automatic && val !== "" && Number(val) > Number(g.max)) over++;
        entries.push({ id: row.getAttribute("data-id"), name: row.getAttribute("data-name"), roll: row.getAttribute("data-roll"), scored: val });
      });
      if (over > 0) { toast(over + " mark" + (over > 1 ? "s" : "") + " exceed the max (" + g.max + "). Fix the red ones.", "err"); return; }
      sb.disabled = true; sb.innerHTML = '<i class="material-icons" style="color:#fff;">sync</i> Saving…';
      P.api("saveHolisticMarks", [{ className: g.className, bucket: g.bucket, parameter: g.parameter, entries: entries, enteredBy: user, isManagement: !!isMgmt }]).then(function (res) {
        toast((res && res.message) || (res && res.success ? "Saved" : "Failed"), res && res.success ? "ok" : "err");
        if (res && res.success && refresh) refresh();
      }).catch(function (e) { toast("Error: " + (e.message || e), "err"); }).finally(function () { sb.disabled = false; sb.innerHTML = '<i class="material-icons" style="color:#fff;">save</i> Save Marks'; });
    });
  }

  /* ---- mount: TEACHER marks tab (academic <-> holistic toggle) ---- */
  function mountTeacherMarks(hostId, user) {
    var host = $(hostId);
    host.innerHTML =
      '<div class="ex-modeseg" id="mkModeSeg">' +
        '<button class="active" data-m="academic"><i class="material-icons">calculate</i> Academic</button>' +
        '<button data-m="holistic"><i class="material-icons">emoji_people</i> Holistic</button>' +
      '</div>' +
      '<div id="mkAcad">' +
        '<div class="ex-toolbar">' +
          '<div class="ex-field"><label>Class</label><select id="mkTClass"><option value="">Loading…</option></select></div>' +
          '<div class="ex-field"><label>Exam &amp; Subject</label><select id="mkTExam" disabled><option value="">Pick a class first…</option></select></div>' +
        '</div><div id="mkTHost"><div class="ex-empty"><i class="material-icons">fact_check</i>Pick a completed exam to enter marks.</div></div>' +
      '</div>' +
      '<div id="mkHol" style="display:none;">' +
        '<div class="ex-toolbar">' +
          '<div class="ex-field"><label>Class</label><select id="mkHClass"><option value="">Loading…</option></select></div>' +
          '<div class="ex-field"><label>Assessment</label><select id="mkHBucket" disabled><option value="">Pick a class first…</option></select></div>' +
          '<div class="ex-field"><label>Parameter</label><select id="mkHParam" disabled><option value="">Pick an assessment…</option></select></div>' +
        '</div><div id="mkHHost"><div class="ex-empty"><i class="material-icons">emoji_people</i>Pick a class, assessment and parameter.</div></div>' +
      '</div>';

    var st = { opts: null, holParams: [], holCur: null, holInit: false, holCls: "", holBucket: "" };
    Array.prototype.forEach.call(host.querySelectorAll("#mkModeSeg button"), function (b) {
      b.addEventListener("click", function () { switchMode(b.getAttribute("data-m")); });
    });
    function switchMode(m) {
      var isHol = m === "holistic";
      $("mkAcad").style.display = isHol ? "none" : "block";
      $("mkHol").style.display = isHol ? "block" : "none";
      Array.prototype.forEach.call(host.querySelectorAll("#mkModeSeg button"), function (b) { b.classList.toggle("active", b.getAttribute("data-m") === m); });
      if (isHol && !st.holInit) { st.holInit = true; holInit(); }
    }

    P.api("marksGetTeacherExamOptions", [user], { text: "Loading your exams…" }).then(function (res) {
      st.opts = res || { classes: [], options: {} };
      var sel = $("mkTClass"), cs = st.opts.classes || [];
      if (!cs.length) { sel.innerHTML = '<option value="">No completed exams yet</option>'; empty("mkTHost", "No completed exams awaiting marks entry. A subject appears here once its exam date has passed.", "task_alt"); return; }
      sel.innerHTML = '<option value="">Select class…</option>' + cs.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + "</option>"; }).join("");
    }).catch(function (e) { empty("mkTHost", esc(e.message || e), "error_outline"); });

    $("mkTClass").addEventListener("change", function () {
      var cls = this.value, ex = $("mkTExam");
      empty("mkTHost", "Pick a completed exam to enter marks.", "fact_check");
      if (!cls) { ex.disabled = true; ex.innerHTML = '<option value="">Pick a class first…</option>'; return; }
      var opts = (st.opts.options || {})[cls] || [];
      ex.disabled = false;
      ex.innerHTML = '<option value="">Select exam &amp; subject…</option>' + opts.map(function (o, i) { return '<option value="' + i + '">' + esc(o.label) + (o.locked ? " \uD83D\uDD12" : "") + "</option>"; }).join("");
    });
    $("mkTExam").addEventListener("change", function () {
      var cls = $("mkTClass").value, idx = this.value; if (cls === "" || idx === "") return;
      var o = ((st.opts.options || {})[cls] || [])[+idx]; if (!o) return;
      loading("mkTHost", "Loading students…");
      P.api("marksGetGrid", [o.className, o.subject, o.bucket, o.component]).then(function (g) { renderSingle(g, "mkTHost", false, user, refreshT); }).catch(function (e) { empty("mkTHost", esc(e.message || e), "error_outline"); });
    });
    function refreshT() { $("mkTExam").dispatchEvent(new Event("change")); }

    function holInit() {
      P.api("marksGetHighSchoolClasses", []).then(function (cs) {
        cs = cs || []; $("mkHClass").innerHTML = '<option value="">Select class…</option>' + cs.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + "</option>"; }).join("");
      }).catch(function () { $("mkHClass").innerHTML = '<option value="">Error</option>'; });
      $("mkHClass").addEventListener("change", holClassChanged);
      $("mkHBucket").addEventListener("change", holBucketChanged);
      $("mkHParam").addEventListener("change", holParamChanged);
    }
    function holClassChanged() {
      var cls = $("mkHClass").value, bSel = $("mkHBucket"), pSel = $("mkHParam");
      pSel.disabled = true; pSel.innerHTML = '<option value="">Pick an assessment…</option>';
      empty("mkHHost", "Pick an assessment and parameter.", "emoji_people");
      if (!cls) { bSel.disabled = true; bSel.innerHTML = '<option value="">Pick a class first…</option>'; return; }
      bSel.disabled = true; bSel.innerHTML = '<option value="">Loading…</option>';
      P.api("getHolisticBuckets", [cls]).then(function (res) {
        var bl = (res && res.buckets) || [];
        if (!bl.length) { bSel.innerHTML = '<option value="">No assessments open yet</option>'; return; }
        bSel.disabled = false;
        bSel.innerHTML = bl.map(function (b) { return '<option value="' + esc(b.bucket) + '">' + esc(b.bucket) + (b.locked ? " \uD83D\uDD12" : "") + "</option>"; }).join("");
        if (res.activeBucket) bSel.value = res.activeBucket;
        holBucketChanged();
      }).catch(function () { bSel.innerHTML = '<option value="">Error</option>'; });
    }
    function holBucketChanged() {
      var cls = $("mkHClass").value, bucket = $("mkHBucket").value, pSel = $("mkHParam");
      empty("mkHHost", "Pick a parameter.", "emoji_people");
      if (!cls || !bucket) { pSel.disabled = true; pSel.innerHTML = '<option value="">Pick an assessment…</option>'; return; }
      pSel.disabled = true; pSel.innerHTML = '<option value="">Loading…</option>';
      P.api("getHolisticAssignments", [user, cls, bucket]).then(function (res) {
        var params = (res && res.parameters) || [];
        st.holParams = params; st.holCls = cls; st.holBucket = bucket;
        if (!params.length) {
          var msg = "No holistic parameters assigned to you for " + bucket + ".";
          if (res && res.hasAnyAssignment) { var others = (res.teacherBuckets || []).map(function (tb) { return tb.bucket; }); msg = "Your parameters are under: " + others.join(", ") + "."; }
          pSel.innerHTML = '<option value="">None for ' + esc(bucket) + '</option>';
          empty("mkHHost", esc(msg), "info"); return;
        }
        pSel.disabled = false;
        pSel.innerHTML = '<option value="">Select parameter…</option>' + params.map(function (pp, i) { return '<option value="' + i + '">' + esc(pp.parameter) + (pp.automatic ? " (auto)" : "") + "</option>"; }).join("");
      }).catch(function (e) { pSel.innerHTML = '<option value="">Error</option>'; empty("mkHHost", esc(e.message || e), "error_outline"); });
    }
    function holParamChanged() {
      var idx = $("mkHParam").value; if (idx === "") return;
      var pp = (st.holParams || [])[+idx]; if (!pp) return;
      loading("mkHHost", "Loading students…");
      P.api("getHolisticStudents", [st.holCls, st.holBucket, pp.parameter]).then(function (g) {
        renderHolistic(g, "mkHHost", user, false, function () { holParamChanged(); });
      }).catch(function (e) { empty("mkHHost", esc(e.message || e), "error_outline"); });
    }
  }

  /* ---- mount: ADMIN marks tab (class-wide grid, all subjects at once) ---- */
  function mountAdminMarks(hostId, user) {
    var host = $(hostId);
    host.innerHTML =
      '<div class="ex-toolbar">' +
        '<div class="ex-field"><label>Class</label><select id="mkAClass"><option value="">Loading…</option></select></div>' +
        '<div class="ex-field"><label>Exam / Assessment</label><select id="mkAExam" disabled><option value="">Pick a class first…</option></select></div>' +
      '</div>' +
      '<div id="mkAHolControls"></div>' +
      '<div id="mkAHost"><div class="ex-empty"><i class="material-icons">grid_on</i>Pick a class and exam to enter all subjects at once.</div></div>';

    P.api("marksGetHighSchoolClasses", []).then(function (cs) {
      cs = cs || []; $("mkAClass").innerHTML = '<option value="">Select class…</option>' + cs.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + "</option>"; }).join("");
    }).catch(function () { $("mkAClass").innerHTML = '<option value="">Error</option>'; });

    $("mkAClass").addEventListener("change", function () {
      var cls = this.value, ex = $("mkAExam");
      empty("mkAHost", "Pick an exam to load all subjects.", "grid_on");
      $("mkAHolControls").innerHTML = "";
      if (!cls) { ex.disabled = true; ex.innerHTML = '<option value="">Pick a class first…</option>'; return; }
      ex.disabled = true; ex.innerHTML = '<option value="">Loading…</option>';
      P.api("marksGetAdminExamOptions", [cls]).then(function (opts) {
        opts = opts || []; ex.disabled = false;
        ex.innerHTML = '<option value="">Select exam…</option>' + opts.map(function (o) { return '<option value="' + esc(o.bucket) + "|" + esc(o.component) + '">' + esc(o.label) + "</option>"; }).join("");
      });
    });
    $("mkAExam").addEventListener("change", function () {
      var cls = $("mkAClass").value, v = this.value; if (!cls || !v) return;
      var p = v.split("|"), bucket = p[0], comp = p[1];
      $("mkAHolControls").innerHTML = "";
      loading("mkAHost", "Loading marks…");
      P.api("marksGetClassGrid", [cls, bucket, comp]).then(function (g) {
        renderClassGrid(g, "mkAHost", user, function () { $("mkAExam").dispatchEvent(new Event("change")); });
        renderAdminHolControls(cls, bucket, comp, user);
      }).catch(function (e) { empty("mkAHost", esc(e.message || e), "error_outline"); });
    });
  }

  function renderAdminHolControls(cls, bucket, comp, user) {
    var isSABucket = String(bucket).indexOf("SA") === 0;
    var box = $("mkAHolControls");
    box.innerHTML =
      '<div class="ex-lock" style="justify-content:space-between;flex-wrap:wrap;gap:10px;">' +
      '<span><i class="material-icons" style="vertical-align:middle;color:var(--accent);">lock</i> Lock controls · <b>' + esc(cls) + " · " + esc(bucket) + "</b> <span style=\"color:var(--text-muted);\">(locks academic + holistic together)</span></span>" +
      '<span style="display:flex;gap:8px;flex-wrap:wrap;">' +
      (comp === "HOLISTIC" && !isSABucket ? '<button class="ex-abtn accent" id="mkHARun"><i class="material-icons">bolt</i> Auto-fill Attendance</button>' : "") +
      '<button class="ex-abtn" id="mkHALock"><i class="material-icons">lock</i> Lock</button>' +
      '<span id="mkHAStatus" class="ex-status draft" style="align-self:center;">…</span></span></div>';
    refreshLockState();
    var run = $("mkHARun"); if (run) run.addEventListener("click", function () {
      if (!confirm("Auto-fill Attendance & Punctuality for " + cls + " · " + bucket + " from attendance %?")) return;
      run.disabled = true; run.innerHTML = '<i class="material-icons">sync</i> Running…';
      P.api("runHolisticAutoAttendance", [cls, bucket, user]).then(function (res) {
        toast((res && res.message) || (res && res.success ? "Done" : "Failed"), res && res.success ? "ok" : "err");
        $("mkAExam").dispatchEvent(new Event("change"));
      }).catch(function (e) { run.disabled = false; run.innerHTML = '<i class="material-icons">bolt</i> Auto-fill Attendance'; toast("Error: " + (e.message || e), "err"); });
    });
    $("mkHALock").addEventListener("click", function () {
      var willLock = $("mkHALock").getAttribute("data-locked") !== "1";
      if (!confirm((willLock ? "Lock " : "Unlock ") + cls + " · " + bucket + "?" + (willLock ? " This blocks teacher edits until unlocked." : ""))) return;
      P.api("marksSetLock", [cls, bucket, willLock, user]).then(function () { toast((willLock ? "Locked " : "Unlocked ") + bucket, "ok"); refreshLockState(); }).catch(function (e) { toast("Error: " + (e.message || e), "err"); });
    });
    function refreshLockState() {
      P.api("getHolisticLockState", [cls, bucket], { overlay: false }).then(function (s) {
        var badge = $("mkHAStatus"), lockBtn = $("mkHALock"); if (!badge) return;
        var locked = !!(s && s.locked), manual = !!(s && s.manualLocked);
        badge.className = "ex-status " + (locked ? "psyl" : "sched"); badge.textContent = locked ? "Locked" : "Open";
        lockBtn.setAttribute("data-locked", manual ? "1" : "0");
        lockBtn.innerHTML = '<i class="material-icons">' + (manual ? "lock_open" : "lock") + "</i>" + (manual ? " Unlock" : " Lock");
      }).catch(function () {});
    }
  }

  /* =======================================================================
     ADMIN — Examinations Management
     ======================================================================= */
  function bootAdmin() {
    var st = { tab: "overview", editingRow: null, pickLessons: [], presets: [], marksMounted: false, locksLoaded: false, reportData: null };

    $("view").innerHTML = shell();
    bindTabs();
    loadKpis();
    initCalendar();

    function shell() {
      return '<div class="card wide-card">' +
        '<div class="mod-head"><div><span class="eyebrow">Management</span><h2 style="margin-bottom:4px;">Examinations Management</h2>' +
        '<p class="view-description" style="margin:0;">Schedule exams, add syllabus, enter marks, control locks and generate tabulation reports.</p></div>' +
        '<button class="btn btn-warning-action" id="exNewBtn" style="width:auto;padding:10px 16px;"><i class="material-icons" style="color:#fff;">add</i> New Exam</button></div>' +
        '<div class="ex-kpis" id="exKpis"></div>' +
        '<div class="ex-tabs" id="exTabs">' +
          '<button class="active" data-t="overview"><i class="material-icons">calendar_month</i> Overview</button>' +
          '<button data-t="schedule"><i class="material-icons">edit_calendar</i> Schedule</button>' +
          '<button data-t="marks"><i class="material-icons">edit_note</i> Marks Entry</button>' +
          '<button data-t="locks"><i class="material-icons">lock</i> Locks</button>' +
          '<button data-t="reports"><i class="material-icons">description</i> Reports</button>' +
        '</div>' +
        '<div id="exPaneOverview">' + overviewPane() + '</div>' +
        '<div id="exPaneSchedule" style="display:none;"></div>' +
        '<div id="exPaneMarks" style="display:none;"></div>' +
        '<div id="exPaneLocks" style="display:none;"></div>' +
        '<div id="exPaneReports" style="display:none;"></div>' +
        '</div>' + formModal() + dayModal() + pickModal();
    }
    function overviewPane() {
      return '<div class="ex-caltoolbar"><h3 id="exCalLabel">—</h3>' +
        '<div class="smart-selector" style="max-width:220px;"><div class="ss-icon"><i class="material-icons">calendar_month</i></div><div class="ss-body"><div class="ss-label">Month</div><input type="month" id="exCalMonth"></div></div></div>' +
        '<div class="cal-head"><div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div></div>' +
        '<div class="cal-grid" id="exCalGrid" style="gap:6px;"></div>';
    }

    /* ---------------- tabs ---------------- */
    function bindTabs() {
      Array.prototype.forEach.call($("exTabs").querySelectorAll("button"), function (b) { b.addEventListener("click", function () { switchTab(b.getAttribute("data-t")); }); });
      $("exNewBtn").addEventListener("click", openCreate);
      Array.prototype.forEach.call(document.querySelectorAll("[data-close]"), function (b) { b.addEventListener("click", function () { P.closeModal(b.getAttribute("data-close")); }); });
      Array.prototype.forEach.call(document.querySelectorAll(".modal-overlay"), function (m) { m.addEventListener("click", function (e) { if (e.target === m) P.closeModal(m.id); }); });
    }
    function switchTab(t) {
      st.tab = t;
      ["overview", "schedule", "marks", "locks", "reports"].forEach(function (x) { $("exPane" + cap(x)).style.display = (x === t) ? "block" : "none"; });
      Array.prototype.forEach.call($("exTabs").querySelectorAll("button"), function (b) { b.classList.toggle("active", b.getAttribute("data-t") === t); });
      if (t === "schedule") initSchedule();
      else if (t === "marks" && !st.marksMounted) { st.marksMounted = true; $("exPaneMarks").innerHTML = ""; mountAdminMarks("exPaneMarks", me); }
      else if (t === "locks") initLocks();
      else if (t === "reports" && !$("exPaneReports").innerHTML) initReports();
    }

    /* ---------------- KPIs ---------------- */
    function loadKpis() {
      P.api("getAdminExamSummaryStats", [], { overlay: false }).then(function (s) {
        s = s || {};
        $("exKpis").innerHTML =
          kpi("today", "Today", s.todayCount) + kpi("sched", "Scheduled", s.scheduled) +
          kpi("pdate", "Needs date", s.pendingDate) + kpi("psyl", "No syllabus", s.pendingSyllabus) +
          kpi("done", "Completed", s.completed);
      }).catch(function () {});
    }
    function kpi(cls, label, v) { return '<div class="ex-kpi ' + cls + '"><div class="l">' + label + '</div><div class="v">' + (v || 0) + "</div></div>"; }

    /* ---------------- overview calendar ---------------- */
    function initCalendar() { $("exCalMonth").value = P.thisMonth(); $("exCalMonth").addEventListener("change", loadCalendar); loadCalendar(); }
    function loadCalendar() {
      var m = $("exCalMonth").value; if (!m) return;
      var p = m.split("-"), yy = +p[0], mm = +p[1];
      $("exCalLabel").textContent = new Date(yy, mm - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
      $("exCalGrid").innerHTML = '<div class="ex-loading" style="grid-column:span 7;"><i class="material-icons">sync</i></div>';
      P.api("getAdminExamCalendarPayload", [m], { overlay: false }).then(function (pl) { renderCal((pl && pl.events) || {}, yy, mm); }).catch(function (e) { $("exCalGrid").innerHTML = '<div class="ex-empty" style="grid-column:span 7;"><i class="material-icons">error_outline</i>' + esc(e.message || e) + "</div>"; });
    }
    function renderCal(events, yy, mm) {
      var pad = new Date(yy, mm - 1, 1).getDay(), dim = new Date(yy, mm, 0).getDate(), today = P.todayIso(), html = "";
      for (var i = 0; i < pad; i++) html += '<div class="ex-calcell empty"></div>';
      for (var d = 1; d <= dim; d++) {
        var ds = yy + "-" + String(mm).padStart(2, "0") + "-" + String(d).padStart(2, "0");
        var list = events[ds] || [], isToday = ds === today, mini = "";
        if (list.length) {
          mini = '<span class="ex-calbadge">' + list.length + " exam" + (list.length > 1 ? "s" : "") + "</span>" +
            list.slice(0, 2).map(function (e) { return '<div class="ex-calmini">' + esc(e.gradeLabel || e.grade) + " · " + esc(e.subject) + "</div>"; }).join("") +
            (list.length > 2 ? '<div class="ex-calmini">+' + (list.length - 2) + " more…</div>" : "");
        }
        html += '<div class="ex-calcell ' + (isToday ? "today" : "") + '" data-day="' + ds + '"><div class="ex-calnum">' + d + "</div>" + mini + "</div>";
      }
      $("exCalGrid").innerHTML = html;
      Array.prototype.forEach.call($("exCalGrid").querySelectorAll(".ex-calcell[data-day]"), function (c) { c.addEventListener("click", function () { openDay(c.getAttribute("data-day")); }); });
    }
    function openDay(ds) {
      $("exDayTitle").textContent = "Exams on " + P.prettyDate(ds);
      $("exDayBody").innerHTML = '<div class="ex-loading"><i class="material-icons">sync</i></div>';
      P.openModal("exDayModal");
      P.api("getAdminExamsForDate", [ds], { overlay: false }).then(function (list) {
        if (!list || !list.length) { $("exDayBody").innerHTML = '<div class="ex-empty"><i class="material-icons">event_busy</i>No exams on this date.</div>'; return; }
        $("exDayBody").innerHTML = list.map(function (e) {
          return '<div class="ex-card sched" style="grid-template-columns:1fr auto;"><div><div class="t">' + esc(e.gradeLabel || e.grade) + " · " + esc(e.subject) + "</div>" +
            '<div class="meta"><span>' + esc(e.examName) + "</span>" + (e.marks ? "<span>· " + esc(e.marks) + " marks</span>" : "") + "</div></div>" +
            '<div class="ex-cardacts"><button class="ex-abtn primary" data-edit="' + e.rowId + '"><i class="material-icons">edit</i> Edit</button></div></div>';
        }).join("");
        Array.prototype.forEach.call($("exDayBody").querySelectorAll("[data-edit]"), function (b) { b.addEventListener("click", function () { P.closeModal("exDayModal"); openEdit(+b.getAttribute("data-edit")); }); });
      }).catch(function (e) { $("exDayBody").innerHTML = '<div class="ex-empty"><i class="material-icons">error_outline</i>' + esc(e.message || e) + "</div>"; });
    }

    /* ---------------- schedule editor ---------------- */
    function initSchedule() {
      if ($("exPaneSchedule").innerHTML) return;
      $("exPaneSchedule").innerHTML =
        '<div class="ex-toolbar">' +
          '<div class="ex-field"><label>Exam name</label><select id="exSchExam"><option value="">All exam names</option></select></div>' +
          '<div class="ex-field"><label>Class</label><select id="exSchClass"><option value="">All classes</option></select></div>' +
          '<button class="ex-abtn" id="exSchClear"><i class="material-icons">refresh</i> Clear</button>' +
        '</div><div id="exSchBody"><div class="ex-empty"><i class="material-icons">edit_calendar</i>Loading…</div></div>';
      $("exSchExam").addEventListener("change", loadSchedule);
      $("exSchClass").addEventListener("change", loadSchedule);
      $("exSchClear").addEventListener("click", function () { $("exSchExam").value = ""; $("exSchClass").value = ""; loadSchedule(); });
      P.api("examGetScheduleFilters", [], { overlay: false }).then(function (f) {
        f = f || { examNames: [], classes: [] };
        $("exSchExam").innerHTML = '<option value="">All exam names</option>' + (f.examNames || []).map(function (n) { return '<option value="' + esc(n) + '">' + esc(n) + "</option>"; }).join("");
        $("exSchClass").innerHTML = '<option value="">All classes</option>' + (f.classes || []).map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + "</option>"; }).join("");
        loadSchedule();
      }).catch(function () { loadSchedule(); });
    }
    function loadSchedule() {
      var en = $("exSchExam").value, cls = $("exSchClass").value;
      $("exSchBody").innerHTML = '<div class="ex-loading"><i class="material-icons">sync</i></div>';
      P.api("examGetScheduleTable", [en, cls], { overlay: false }).then(function (rows) { renderSchedule(rows || [], en, cls); }).catch(function (e) { $("exSchBody").innerHTML = '<div class="ex-empty"><i class="material-icons">error_outline</i>' + esc(e.message || e) + "</div>"; });
    }
    function renderSchedule(rows, examName, className) {
      var body = $("exSchBody");
      if (!rows.length) { body.innerHTML = '<div class="ex-empty"><i class="material-icons">event_busy</i>No exams match this filter. Create exams with “New Exam”, then schedule them here.</div>'; return; }
      var showClass = !className;
      var html = '<div class="ex-toolbar" style="align-items:flex-end;">' +
        '<div class="ex-field"><label>Set ALL dates to</label><input type="date" id="exBulkDate"></div>' +
        '<button class="ex-abtn" id="exBulkDateBtn"><i class="material-icons">event</i> Apply</button>' +
        '<div class="ex-field"><label>Set ALL max to</label><input class="ex-in max" type="number" min="0" id="exBulkMax"></div>' +
        '<button class="ex-abtn" id="exBulkMaxBtn"><i class="material-icons">grade</i> Apply</button>' +
        '<span class="ex-note">' + rows.length + " row" + (rows.length > 1 ? "s" : "") + (examName ? " · " + esc(examName) : "") + (className ? " · " + esc(className) : "") + "</span></div>";
      html += '<div class="ex-tablewrap"><table class="ex-table"><thead><tr>' +
        (showClass ? '<th class="name">Class</th>' : "") + '<th class="name">Subject</th>' + (examName ? "" : "<th>Exam</th>") +
        "<th>Date</th><th>Day</th><th>Max</th><th>Status</th></tr></thead><tbody>";
      rows.forEach(function (r) {
        html += '<tr data-row="' + r.rowId + '" data-odate="' + esc(r.date || "") + '" data-omax="' + esc(r.marks || "") + '">' +
          (showClass ? '<td class="name">' + esc(r.gradeLabel || r.grade) + "</td>" : "") +
          '<td class="name">' + esc(r.subject || "-") + "</td>" + (examName ? "" : "<td>" + esc(r.examName) + "</td>") +
          '<td><input class="ex-in date sch-date" type="date" value="' + esc(r.date || "") + '"></td>' +
          '<td class="sch-day" style="font-size:12px;color:var(--text-muted);">' + esc(r.day || "") + "</td>" +
          '<td><input class="ex-in max sch-max" type="number" min="0" value="' + esc(r.marks || "") + '"></td>' +
          "<td>" + statusPill(r.status) + "</td></tr>";
      });
      html += "</tbody></table></div><div class='ex-actbar'><button class='btn btn-success' id='exSchSave' style='width:auto;padding:11px 18px;'><i class='material-icons' style='color:#fff;'>save</i> Save All</button><span class='ex-note'>Only changed rows are written. Blank date = unschedule.</span></div>";
      body.innerHTML = html;
      Array.prototype.forEach.call(body.querySelectorAll(".sch-date"), function (inp) { inp.addEventListener("change", function () { var tr = inp.closest("tr"); tr.querySelector(".sch-day").textContent = dayName(inp.value); }); });
      $("exBulkDateBtn").addEventListener("click", function () { var v = $("exBulkDate").value || ""; Array.prototype.forEach.call(body.querySelectorAll(".sch-date"), function (inp) { inp.value = v; inp.closest("tr").querySelector(".sch-day").textContent = dayName(v); }); });
      $("exBulkMaxBtn").addEventListener("click", function () { var v = $("exBulkMax").value || ""; Array.prototype.forEach.call(body.querySelectorAll(".sch-max"), function (inp) { inp.value = v; }); });
      $("exSchSave").addEventListener("click", saveSchedule);
    }
    function saveSchedule() {
      var updates = [];
      Array.prototype.forEach.call($("exSchBody").querySelectorAll("tbody tr"), function (tr) {
        var od = tr.getAttribute("data-odate") || "", om = tr.getAttribute("data-omax") || "";
        var nd = tr.querySelector(".sch-date").value || "", nm = tr.querySelector(".sch-max").value || "";
        if (nd !== od || nm !== om) updates.push({ rowId: tr.getAttribute("data-row"), date: nd, marks: nm });
      });
      if (!updates.length) { toast("No changes to save.", "err"); return; }
      var b = $("exSchSave"); b.disabled = true; b.innerHTML = '<i class="material-icons" style="color:#fff;">sync</i> Saving…';
      P.api("examBulkSaveSchedule", [updates]).then(function (res) {
        toast(res && res.success ? ("Saved " + res.saved + " row(s).") : ("Failed: " + ((res && res.error) || "unknown")), res && res.success ? "ok" : "err");
        loadSchedule(); loadKpis();
      }).catch(function (e) { toast("Error: " + (e.message || e), "err"); }).finally(function () { b.disabled = false; b.innerHTML = '<i class="material-icons" style="color:#fff;">save</i> Save All'; });
    }

    /* ---------------- new / edit exam ---------------- */
    function openCreate() {
      st.editingRow = null; st.pickLessons = [];
      $("exFormTitle").textContent = "New Exam";
      $("exFormSubmit").innerHTML = '<i class="material-icons" style="color:#fff;">save</i> Create Exam';
      $("exFormDelete").style.display = "none";
      clearForm(); loadPresets(); fillGrades(); P.openModal("exFormModal");
    }
    function openEdit(rowId) {
      st.editingRow = rowId; st.pickLessons = [];
      $("exFormTitle").textContent = "Edit Exam";
      $("exFormSubmit").innerHTML = '<i class="material-icons" style="color:#fff;">save</i> Save Changes';
      $("exFormDelete").style.display = "inline-flex";
      clearForm(); fillGrades(); P.openModal("exFormModal");
      loadPresets(function () {
        P.api("getAdminExamById", [rowId], { overlay: false }).then(function (e) {
          if (!e) { toast("Could not load exam.", "err"); P.closeModal("exFormModal"); return; }
          setGradeFuzzy(e.grade);
          gradeChanged(function () {
            setSubjectFuzzy(e.subject);
            st.pickLessons = (e.lessons || []).slice();
            $("exfSyl").value = e.lessonsRaw || ""; updatePickLabel();
          });
          var known = (st.presets || []).some(function (p) { return p.name === e.examName; });
          if (known) { $("exfNameSel").value = e.examName; toggleNewName(false); nameSelChanged(); } else { toggleNewName(true); $("exfNewName").value = e.examName; }
          $("exfDate").value = e.date || ""; $("exfMarks").value = e.marks || "";
        });
      });
    }
    function clearForm() {
      ["exfNewName", "exfDate", "exfMarks", "exfSyl"].forEach(function (id) { var el = $(id); if (el) el.value = ""; });
      $("exfNameSel").value = ""; toggleNewName(false); st.pickLessons = []; updatePickLabel();
    }
    function fillGrades() {
      $("exfGrade").innerHTML = '<option value="">Select class…</option>' + GRADES.map(function (g) { return '<option value="' + g + '">' + g + "</option>"; }).join("");
      $("exfSubject").innerHTML = '<option value="">Select subject…</option>';
    }
    function loadPresets(cb) {
      if (st.presets.length) { renderPresets(); if (cb) cb(); return; }
      $("exfNameSel").innerHTML = '<option value="">Loading exam names…</option>';
      P.api("getExamNamePresets", [], { overlay: false }).then(function (list) { st.presets = list || []; renderPresets(); if (cb) cb(); }).catch(function () { st.presets = []; renderPresets(); if (cb) cb(); });
    }
    function renderPresets() {
      var list = st.presets || [];
      if (!list.length) { $("exfNameSel").innerHTML = '<option value="">— none yet, tap “New type” —</option>'; toggleNewName(true); return; }
      $("exfNameSel").innerHTML = '<option value="">Select an exam type…</option>' + list.map(function (p) { return '<option value="' + esc(p.name) + '">' + esc(p.name) + (p.defaultMarks ? " (" + esc(p.defaultMarks) + " marks)" : "") + "</option>"; }).join("");
    }
    function nameSelChanged() {
      var name = $("exfNameSel").value; if (!name) return;
      var preset = (st.presets || []).find(function (p) { return p.name === name; });
      if (preset && preset.defaultMarks && !$("exfMarks").value) $("exfMarks").value = preset.defaultMarks;
    }
    function toggleNewName(on) {
      st.newName = !!on;
      $("exfNameSel").style.display = on ? "none" : "";
      $("exfNewWrap").style.display = on ? "block" : "none";
      $("exfNewToggle").innerHTML = on ? '<i class="material-icons" style="font-size:16px;">list</i> Use existing' : '<i class="material-icons" style="font-size:16px;">add</i> New type';
    }
    function gradeChanged(after) {
      var g = $("exfGrade").value, sel = $("exfSubject");
      sel.innerHTML = '<option value="">Loading…</option>';
      if (!g) { sel.innerHTML = '<option value="">Select subject…</option>'; return; }
      P.api("getAdminSubjectsForGrade", [g], { overlay: false }).then(function (subs) {
        var list = (subs && subs.length) ? subs : ["General"];
        sel.innerHTML = '<option value="">Select subject…</option>' + list.map(function (s) { return '<option value="' + esc(s) + '">' + esc(s) + "</option>"; }).join("");
        if (after) after();
      });
    }
    function openPicker() {
      var g = $("exfGrade").value, subj = $("exfSubject").value;
      if (!g || !subj) { toast("Choose class and subject first.", "err"); return; }
      $("exPickBody").innerHTML = '<div class="ex-loading"><i class="material-icons">sync</i></div>';
      P.openModal("exPickModal");
      P.api("getSyllabusMasterLessons", [g, subj], { overlay: false }).then(function (list) {
        if (!list || !list.length) { $("exPickBody").innerHTML = '<div class="ex-empty"><i class="material-icons">inbox</i>No lessons in Syllabus Master for this class/subject.</div>'; return; }
        var sel = {}; st.pickLessons.forEach(function (x) { sel[x.toLowerCase()] = true; });
        $("exPickBody").innerHTML = list.map(function (l, i) {
          var on = sel[l.name.toLowerCase()];
          return '<label class="ex-pickitem ' + (on ? "on" : "") + '" data-name="' + esc(l.name) + '"><input type="checkbox" ' + (on ? "checked" : "") + '><span class="no">' + esc(l.lessonNo || (i + 1)) + '</span><span class="nm">' + esc(l.name) + '</span><span class="mo">' + esc(l.targetMonth || "") + "</span></label>";
        }).join("");
        Array.prototype.forEach.call($("exPickBody").querySelectorAll(".ex-pickitem input"), function (c) { c.addEventListener("change", function () { c.closest(".ex-pickitem").classList.toggle("on", c.checked); }); });
      });
    }
    function commitPicker() {
      var picked = [];
      Array.prototype.forEach.call($("exPickBody").querySelectorAll(".ex-pickitem"), function (l) { var c = l.querySelector("input"); if (c && c.checked) picked.push(l.getAttribute("data-name")); });
      if (!picked.length) { toast("Select at least one lesson.", "err"); return; }
      st.pickLessons = picked; $("exfSyl").value = picked.join("; "); updatePickLabel(); P.closeModal("exPickModal");
    }
    function updatePickLabel() { var n = st.pickLessons.length; $("exfPickLbl").textContent = n > 0 ? (n + " lesson" + (n > 1 ? "s" : "") + " picked") : "Pick lessons"; }
    function submitForm() {
      var examName = st.newName ? ($("exfNewName").value || "").trim() : ($("exfNameSel").value || "").trim();
      var freeText = String($("exfSyl").value || "").trim();
      var useLessons = st.pickLessons.length > 0 && freeText === st.pickLessons.join("; ");
      var payload = { examName: examName, grade: $("exfGrade").value, subject: $("exfSubject").value, date: $("exfDate").value, marks: $("exfMarks").value.trim(), lessons: useLessons ? st.pickLessons.slice() : [], syllabusText: useLessons ? "" : freeText };
      if (!payload.examName || !payload.grade || !payload.subject) { toast("Exam name, class and subject are required.", "err"); return; }
      var done = function (res) { if (res && res.success) { P.closeModal("exFormModal"); refreshCurrent(); loadKpis(); toast("Saved.", "ok"); } else toast("Save failed: " + ((res && res.error) || "unknown"), "err"); };
      if (st.editingRow) P.api("updateAdminExam", [st.editingRow, payload]).then(done).catch(function (e) { toast("Error: " + (e.message || e), "err"); });
      else P.api("createAdminExam", [payload]).then(done).catch(function (e) { toast("Error: " + (e.message || e), "err"); });
    }
    function deleteExam() {
      if (!st.editingRow) return;
      if (!confirm("Delete this exam permanently?")) return;
      P.api("deleteAdminExam", [st.editingRow]).then(function (res) { if (res && res.success) { P.closeModal("exFormModal"); refreshCurrent(); loadKpis(); toast("Deleted.", "ok"); } else toast("Delete failed.", "err"); }).catch(function (e) { toast("Error: " + (e.message || e), "err"); });
    }
    function refreshCurrent() { if (st.tab === "overview") loadCalendar(); else if (st.tab === "schedule") loadSchedule(); }

    /* ---------------- LOCKS tab (NEW) ---------------- */
    function initLocks() {
      $("exPaneLocks").innerHTML =
        '<p class="view-description" style="margin-top:0;">Lock a class + assessment to stop teachers entering or editing marks (academic and holistic together). Management can still edit while locked.</p>' +
        '<div id="exLocksBody"><div class="ex-loading"><i class="material-icons">sync</i></div></div>';
      loadLocks();
    }
    function loadLocks() {
      P.api("locksGetMatrix", [], { overlay: false }).then(function (m) { renderLocks(m || { buckets: BUCKET_SEQ, rows: [] }); }).catch(function (e) { $("exLocksBody").innerHTML = '<div class="ex-empty"><i class="material-icons">error_outline</i>' + esc(e.message || e) + "</div>"; });
    }
    function renderLocks(m) {
      var buckets = m.buckets || BUCKET_SEQ, rows = m.rows || [];
      if (!rows.length) { $("exLocksBody").innerHTML = '<div class="ex-empty"><i class="material-icons">groups</i>No high-school classes found yet.</div>'; return; }
      var html = '<div class="ex-tablewrap"><table class="ex-table"><thead><tr><th class="name">Class</th>';
      buckets.forEach(function (b) { html += "<th>" + esc(b) + "</th>"; });
      html += "</tr></thead><tbody>";
      rows.forEach(function (row) {
        html += '<tr><td class="name">' + esc(row.class) + "</td>";
        buckets.forEach(function (b) {
          var locked = !!row.locks[b];
          html += '<td><button class="ex-abtn ' + (locked ? "danger" : "") + ' lockcell" data-class="' + esc(row.class) + '" data-bucket="' + esc(b) + '" data-locked="' + (locked ? "1" : "0") + '"><i class="material-icons">' + (locked ? "lock" : "lock_open") + "</i> " + (locked ? "Locked" : "Open") + "</button></td>";
        });
        html += "</tr>";
      });
      html += "</tbody></table></div>";
      $("exLocksBody").innerHTML = html;
      Array.prototype.forEach.call($("exLocksBody").querySelectorAll(".lockcell"), function (b) {
        b.addEventListener("click", function () {
          var cls = b.getAttribute("data-class"), bucket = b.getAttribute("data-bucket"), willLock = b.getAttribute("data-locked") !== "1";
          b.disabled = true;
          P.api("locksSetBucket", [cls, bucket, willLock, me]).then(function () { toast((willLock ? "Locked " : "Unlocked ") + cls + " · " + bucket, "ok"); loadLocks(); }).catch(function (e) { toast("Error: " + (e.message || e), "err"); b.disabled = false; });
        });
      });
    }

    /* ---------------- REPORTS tab (tabulation) ---------------- */
    function initReports() {
      $("exPaneReports").innerHTML =
        '<p class="view-description" style="margin-top:0;">Pick a class and assessment, load the tabulation to review totals, %, grade and spot missing marks. Print or export as needed.</p>' +
        '<div class="ex-toolbar">' +
          '<div class="ex-field"><label>Class</label><select id="repClass"><option value="">Loading…</option></select></div>' +
          '<div class="ex-field"><label>Assessment</label><select id="repBucket"><option value="">Loading…</option></select></div>' +
          '<button class="ex-abtn primary" id="repLoad"><i class="material-icons">table_view</i> Load Tabulation</button>' +
        '</div>' +
        '<div class="ex-actbar" style="margin-top:0;"><button class="ex-abtn" id="repPrint" disabled><i class="material-icons">print</i> Print</button>' +
        '<button class="ex-abtn" id="repCsv" disabled><i class="material-icons">download</i> Export CSV</button></div>' +
        '<div id="repHint" class="ex-note" style="margin-top:10px;">Choose a class + assessment, then Load Tabulation.</div>' +
        '<div id="repTab" style="display:none;"><div class="ex-legend"><span><span class="sw" style="background:#fdecec;"></span>Missing marks</span></div><div class="rep-tablewrap" id="repTabWrap"><table class="rep-table" id="repTable"></table></div></div>';
      P.api("progressGetClasses", [], { overlay: false }).then(function (cs) { $("repClass").innerHTML = '<option value="">Select class…</option>' + (cs || []).map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + "</option>"; }).join(""); });
      P.api("progressGetBucketList", [], { overlay: false }).then(function (bs) { $("repBucket").innerHTML = '<option value="">Select assessment…</option>' + (bs || []).map(function (b) { return '<option value="' + esc(b.bucket) + '">' + esc(b.label) + "</option>"; }).join(""); });
      $("repClass").addEventListener("change", clearReport); $("repBucket").addEventListener("change", clearReport);
      $("repLoad").addEventListener("click", loadTab);
      $("repPrint").addEventListener("click", function () { window.print(); });
      $("repCsv").addEventListener("click", exportCsv);
    }
    function clearReport() { st.reportData = null; $("repTab").style.display = "none"; $("repHint").style.display = "block"; $("repHint").textContent = "Choose a class + assessment, then Load Tabulation."; $("repPrint").disabled = true; $("repCsv").disabled = true; }
    function loadTab() {
      var cls = $("repClass").value, bk = $("repBucket").value;
      if (!cls || !bk) { toast("Choose a class and an assessment.", "err"); return; }
      $("repHint").style.display = "block"; $("repHint").textContent = "Loading tabulation…";
      P.api("progressGetClassData", [cls, bk], { overlay: false }).then(function (data) { st.reportData = data || { students: [] }; renderTab(); }).catch(function (e) { $("repHint").textContent = "Error: " + (e.message || e); });
    }
    function cell(c) {
      if (!c) return '<td class="miss">&ndash;</td>';
      var show = (c.value === "" || c.value == null) ? "&ndash;" : c.value;
      return '<td class="' + (c.has ? "" : "miss") + '">' + show + "</td>";
    }
    function renderTab() {
      var d = st.reportData;
      if (!d || !d.students || !d.students.length) { $("repHint").textContent = "No students found for this class."; $("repTab").style.display = "none"; return; }
      var isSABucket = d.isSA, subCols = isSABucket ? ["Exam", "Int", "Tot"] : ["CT1", "CT2", "UT", "HA", "Tot"], perSub = subCols.length;
      var colLabels = d.colLabels || {};
      var h1 = '<tr><th class="stick" rowspan="2" style="width:34px;">Roll</th><th class="stick2" rowspan="2" style="left:34px;min-width:150px;">Student</th>';
      var h2 = '<tr class="sub">';
      d.subjects.forEach(function (subj) {
        h1 += '<th class="grp" colspan="' + perSub + '">' + esc(subj) + "</th>";
        subCols.forEach(function (c, ci) { h2 += "<th" + (ci === 0 ? ' class="grp"' : "") + ">" + esc(colLabels[c] || c) + "</th>"; });
      });
      (d.holisticParams || []).forEach(function (p, i) { if (i === 0) h1 += '<th class="grp" colspan="' + d.holisticParams.length + '">Holistic (info only)</th>'; h2 += "<th" + (i === 0 ? ' class="grp"' : "") + ">" + esc(p.parameter) + "</th>"; });
      h1 += '<th class="grp" rowspan="2">Total</th><th rowspan="2">%</th><th rowspan="2">Grade</th></tr>'; h2 += "</tr>";
      var body = "";
      d.students.forEach(function (s) {
        var no = !s.hasAny, cells = "";
        d.subjects.forEach(function (subj) {
          var c = s.subjects[subj] || {};
          if (isSABucket) cells += cell(c.Exam) + cell(c.Int) + cell(c.Tot);
          else cells += cell(c.CT1) + cell(c.CT2) + cell(c.UT) + cell(c.HA) + cell(c.Tot);
        });
        (d.holisticParams || []).forEach(function (p) { cells += cell(s.holistic ? s.holistic[p.parameter] : null); });
        body += '<tr class="' + (no ? "norow" : "") + '"><td class="stick">' + esc(s.roll) + '</td><td class="stick2 name">' + esc(s.name) + (no ? ' <em style="font-size:10px;color:#b3261e;">(no marks)</em>' : "") + "</td>" + cells +
          '<td class="tot grp">' + (s.hasAny ? s.totalScored : "&ndash;") + '/' + s.totalMax + '</td><td class="pct">' + (s.hasAny ? s.percent + "%" : "&ndash;") + '</td><td style="font-weight:800;">' + esc(s.grade) + "</td></tr>";
      });
      $("repTable").innerHTML = "<thead>" + h1 + h2 + "</thead><tbody>" + body + "</tbody>";
      $("repHint").style.display = "none"; $("repTab").style.display = "block";
      $("repPrint").disabled = false; $("repCsv").disabled = false;
    }
    function exportCsv() {
      var d = st.reportData; if (!d || !d.students || !d.students.length) return;
      var isSABucket = d.isSA, subCols = isSABucket ? ["Exam", "Int", "Tot"] : ["CT1", "CT2", "UT", "HA", "Tot"];
      var colLabels = d.colLabels || {};
      var header = ["Roll", "Student"];
      d.subjects.forEach(function (subj) { subCols.forEach(function (c) { header.push(subj + " " + (colLabels[c] || c)); }); });
      (d.holisticParams || []).forEach(function (p) { header.push("Holistic: " + p.parameter); });
      header.push("Total", "Max", "%", "Grade");
      var lines = [header.map(csvEsc).join(",")];
      d.students.forEach(function (s) {
        var row = [s.roll, s.name];
        d.subjects.forEach(function (subj) {
          var c = s.subjects[subj] || {};
          subCols.forEach(function (k) { var v = c[k]; row.push(v && v.value !== "" && v.value != null ? v.value : ""); });
        });
        (d.holisticParams || []).forEach(function (p) { var v = s.holistic ? s.holistic[p.parameter] : null; row.push(v && v.value !== "" ? v.value : ""); });
        row.push(s.hasAny ? s.totalScored : "", s.totalMax, s.hasAny ? s.percent : "", s.grade);
        lines.push(row.map(csvEsc).join(","));
      });
      var blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = "Tabulation_" + d.class + "_" + d.bucket + ".csv"; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
    function csvEsc(v) { v = (v == null ? "" : String(v)); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }

    /* ---------------- modals + form helpers ---------------- */
    function formModal() {
      return '<div class="modal-overlay" id="exFormModal"><div class="modal-content" style="max-width:640px;width:100%;max-height:90vh;overflow-y:auto;">' +
        '<div class="modal-header-container"><h3 id="exFormTitle">New Exam</h3><button class="modal-close-icon" data-close="exFormModal">&times;</button></div>' +
        '<div class="ex-formgrid">' +
          '<div class="full"><label>Exam name *</label><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:stretch;">' +
            '<select id="exfNameSel" style="flex:1;min-width:180px;"><option value="">Loading…</option></select>' +
            '<button type="button" class="ex-abtn" id="exfNewToggle"><i class="material-icons" style="font-size:16px;">add</i> New type</button></div>' +
            '<div id="exfNewWrap" style="display:none;margin-top:8px;"><input type="text" id="exfNewName" placeholder="Type a new exam name (e.g. Slip Test 1)"></div></div>' +
          '<div><label>Class *</label><select id="exfGrade"></select></div>' +
          '<div><label>Subject *</label><select id="exfSubject"></select></div>' +
          '<div><label>Exam date</label><input type="date" id="exfDate"></div>' +
          '<div><label>Max marks</label><input type="number" id="exfMarks" placeholder="e.g. 50"></div>' +
          '<div class="full"><label>Syllabus <span style="text-transform:none;font-weight:600;color:var(--text-muted);">(optional — pick or type)</span></label>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;"><button type="button" class="ex-abtn" id="exfPickBtn"><i class="material-icons" style="font-size:16px;">library_books</i> <span id="exfPickLbl">Pick lessons</span></button>' +
            '<button type="button" class="ex-abtn" id="exfClearSyl"><i class="material-icons" style="font-size:16px;">clear</i> Clear</button></div>' +
            '<textarea id="exfSyl" rows="3" placeholder="Type syllabus (semicolon-separated), or leave blank."></textarea></div>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;margin-top:18px;gap:12px;flex-wrap:wrap;">' +
          '<button class="btn btn-danger" id="exFormDelete" style="width:auto;padding:10px 16px;display:none;"><i class="material-icons" style="color:#fff;">delete_forever</i> Delete</button>' +
          '<div style="display:flex;gap:10px;margin-left:auto;"><button class="btn btn-secondary" data-close="exFormModal" style="width:auto;">Cancel</button>' +
          '<button class="btn btn-success" id="exFormSubmit" style="width:auto;"><i class="material-icons" style="color:#fff;">save</i> Create Exam</button></div></div></div></div>';
    }
    function dayModal() {
      return '<div class="modal-overlay" id="exDayModal"><div class="modal-content" style="max-width:600px;width:100%;">' +
        '<div class="modal-header-container"><h3 id="exDayTitle">Exams</h3><button class="modal-close-icon" data-close="exDayModal">&times;</button></div>' +
        '<div id="exDayBody"></div></div></div>';
    }
    function pickModal() {
      return '<div class="modal-overlay" id="exPickModal" style="z-index:1200;"><div class="modal-content" style="max-width:560px;width:100%;">' +
        '<div class="modal-header-container"><h3>Select Syllabus Lessons</h3><button class="modal-close-icon" data-close="exPickModal">&times;</button></div>' +
        '<p class="ex-note" style="margin-bottom:12px;">Loaded from Syllabus Master for the selected class &amp; subject.</p>' +
        '<div id="exPickBody" class="ex-pick"></div>' +
        '<div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;"><button class="btn btn-secondary" data-close="exPickModal" style="width:auto;">Cancel</button>' +
        '<button class="btn btn-success" id="exPickApply" style="width:auto;"><i class="material-icons" style="color:#fff;">done</i> Apply</button></div></div></div>';
    }
    function setGradeFuzzy(g) { var sel = $("exfGrade"), norm = function (s) { return String(s || "").toLowerCase().replace(/\s+/g, "").replace(/^grade-?/, "").replace(/^class-?/, ""); }, t = norm(g); for (var i = 0; i < sel.options.length; i++) { if (norm(sel.options[i].value) === t) { sel.value = sel.options[i].value; return; } } var o = document.createElement("option"); o.value = g; o.text = g; sel.appendChild(o); sel.value = g; }
    function setSubjectFuzzy(s) { var sel = $("exfSubject"), norm = function (x) { return String(x || "").toLowerCase().trim(); }, t = norm(s); for (var i = 0; i < sel.options.length; i++) { if (norm(sel.options[i].value) === t) { sel.value = sel.options[i].value; return; } } var o = document.createElement("option"); o.value = s; o.text = s; sel.appendChild(o); sel.value = s; }

    $("exfNewToggle").addEventListener("click", function () { toggleNewName(!st.newName); });
    $("exfNameSel").addEventListener("change", nameSelChanged);
    $("exfGrade").addEventListener("change", function () { gradeChanged(); });
    $("exfSubject").addEventListener("change", function () { if (!st.editingRow) { st.pickLessons = []; updatePickLabel(); } });
    $("exfPickBtn").addEventListener("click", openPicker);
    $("exfClearSyl").addEventListener("click", function () { st.pickLessons = []; $("exfSyl").value = ""; updatePickLabel(); });
    $("exPickApply").addEventListener("click", commitPicker);
    $("exFormSubmit").addEventListener("click", submitForm);
    $("exFormDelete").addEventListener("click", deleteExam);
  }

  /* =======================================================================
     TEACHER — Examinations Tracker
     ======================================================================= */
  function bootTeacher() {
    var st = { tab: "schedule", events: {}, marksMounted: false, pickRow: null, pickCtx: null };

    $("view").innerHTML = shell();
    bindTabs();
    loadUpcoming();
    initCalendar();
    loadPending();

    function shell() {
      return '<div class="card wide-card">' +
        '<div class="mod-head"><div><span class="eyebrow">Staff Portal</span><h2 style="margin-bottom:4px;">Examinations Tracker</h2>' +
        '<p class="view-description" style="margin:0;">Your exams, their syllabus, and marks entry once an exam is done.</p></div></div>' +
        '<div id="exUpcoming" style="margin-bottom:14px;"></div>' +
        '<div class="ex-tabs" id="exTabs">' +
          '<button class="active" data-t="schedule"><i class="material-icons">calendar_month</i> Schedule</button>' +
          '<button data-t="marks"><i class="material-icons">edit_note</i> Marks Entry</button>' +
        '</div>' +
        '<div id="exPaneSchedule">' +
          '<div class="ex-caltoolbar"><h3 id="exCalLabel">—</h3>' +
          '<div class="smart-selector" style="max-width:220px;"><div class="ss-icon"><i class="material-icons">calendar_month</i></div><div class="ss-body"><div class="ss-label">Month</div><input type="month" id="exCalMonth"></div></div></div>' +
          '<div class="cal-head"><div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div></div>' +
          '<div class="cal-grid" id="exCalGrid"></div>' +
          '<div id="exPending"></div>' +
        '</div>' +
        '<div id="exPaneMarks" style="display:none;"></div>' +
        '</div>' + dayModal() + pickModal();
    }

    function bindTabs() {
      Array.prototype.forEach.call($("exTabs").querySelectorAll("button"), function (b) { b.addEventListener("click", function () { switchTab(b.getAttribute("data-t")); }); });
      Array.prototype.forEach.call(document.querySelectorAll("[data-close]"), function (b) { b.addEventListener("click", function () { P.closeModal(b.getAttribute("data-close")); }); });
      Array.prototype.forEach.call(document.querySelectorAll(".modal-overlay"), function (m) { m.addEventListener("click", function (e) { if (e.target === m) P.closeModal(m.id); }); });
    }
    function switchTab(t) {
      st.tab = t;
      $("exPaneSchedule").style.display = (t === "schedule") ? "block" : "none";
      $("exPaneMarks").style.display = (t === "marks") ? "block" : "none";
      Array.prototype.forEach.call($("exTabs").querySelectorAll("button"), function (b) { b.classList.toggle("active", b.getAttribute("data-t") === t); });
      if (t === "marks" && !st.marksMounted) { st.marksMounted = true; $("exPaneMarks").innerHTML = ""; mountTeacherMarks("exPaneMarks", me); }
    }

    /* ---------------- upcoming chips ---------------- */
    function loadUpcoming() {
      P.api("getTeacherUpcomingExamsSummary", [me], { overlay: false }).then(function (list) {
        list = list || []; var box = $("exUpcoming");
        if (!list.length) { box.innerHTML = ""; return; }
        var chips = list.map(function (e) {
          var dl = e.daysLeft, label = dl === 0 ? "Today" : (dl === 1 ? "Tomorrow" : dl + "d");
          var cls = dl <= 3 ? "r" : (dl <= 7 ? "a" : "g");
          var icon = e.allCompleted ? "check_circle" : "warning";
          return '<span class="ex-upchip ' + cls + '" data-day="' + esc(e.dateStr) + '"><i class="material-icons">' + icon + "</i>" + esc(e.grade) + " · " + esc(e.subject) + " <b>" + label + "</b></span>";
        }).join("");
        box.innerHTML = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;color:var(--text-muted);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;"><i class="material-icons" style="font-size:14px;color:var(--accent);">event_upcoming</i> Upcoming Exams</div><div class="ex-chiprow">' + chips + "</div>";
        Array.prototype.forEach.call(box.querySelectorAll(".ex-upchip[data-day]"), function (c) { c.addEventListener("click", function () { openDay(c.getAttribute("data-day")); }); });
      }).catch(function () {});
    }

    /* ---------------- calendar ---------------- */
    function initCalendar() { $("exCalMonth").value = P.thisMonth(); $("exCalMonth").addEventListener("change", loadCalendar); loadCalendar(); }
    function loadCalendar() {
      var m = $("exCalMonth").value; if (!m) return;
      var p = m.split("-"), yy = +p[0], mm = +p[1];
      $("exCalLabel").textContent = new Date(yy, mm - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
      $("exCalGrid").innerHTML = '<div class="ex-loading" style="grid-column:span 7;"><i class="material-icons">sync</i></div>';
      P.api("getTeacherExamCalendarPayload", [me, m], { overlay: false }).then(function (pl) { st.events = (pl && pl.events) || {}; renderCal(yy, mm); }).catch(function (e) { $("exCalGrid").innerHTML = '<div class="ex-empty" style="grid-column:span 7;"><i class="material-icons">error_outline</i>' + esc(e.message || e) + "</div>"; });
    }
    function renderCal(yy, mm) {
      var pad = new Date(yy, mm - 1, 1).getDay(), dim = new Date(yy, mm, 0).getDate(), today = P.todayIso(), html = "";
      for (var i = 0; i < pad; i++) html += '<div class="ex-calcell empty"></div>';
      for (var d = 1; d <= dim; d++) {
        var ds = yy + "-" + String(mm).padStart(2, "0") + "-" + String(d).padStart(2, "0");
        var list = st.events[ds] || [], isToday = ds === today;
        var allDone = list.length && list.every(function (e) { return e.completed; });
        var badge = list.length ? '<span class="ex-calbadge ' + (allDone ? "grey" : "") + '">' + list.length + "</span>" : "";
        html += '<div class="ex-calcell ' + (isToday ? "today" : "") + '" ' + (list.length ? 'data-day="' + ds + '"' : "") + ' style="' + (list.length ? (allDone ? "background:#f8fafc;" : "background:#fffcf8;border-color:var(--accent);") : "") + '"><div class="ex-calnum">' + d + "</div>" + badge + "</div>";
      }
      $("exCalGrid").innerHTML = html;
      Array.prototype.forEach.call($("exCalGrid").querySelectorAll(".ex-calcell[data-day]"), function (c) { c.addEventListener("click", function () { openDay(c.getAttribute("data-day")); }); });
    }
    function openDay(ds) {
      var list = st.events[ds] || [];
      $("exDayTitle").textContent = "Exams on " + P.prettyDate(ds);
      if (!list.length) { $("exDayBody").innerHTML = '<div class="ex-empty"><i class="material-icons">event_busy</i>No exams on this date.</div>'; P.openModal("exDayModal"); return; }
      $("exDayBody").innerHTML = list.map(function (e, i) {
        var syl = e.syllabus ? esc(e.syllabus) : '<em style="color:var(--text-muted);">(No syllabus assigned)</em>';
        return '<div class="ex-card ' + (e.completed ? "completed" : "sched") + '" style="grid-template-columns:1fr;">' +
          '<div><div class="t">' + (i + 1) + ". " + esc(e.examName) + '</div><div class="meta"><span><i class="material-icons">groups</i>' + esc(e.grade) + "</span><span><i class='material-icons'>menu_book</i>" + esc(e.subject) + "</span>" + (e.dayName ? "<span><i class='material-icons'>today</i>" + esc(e.dayName) + "</span>" : "") + "</div></div>" +
          '<div class="ex-syl">' + syl + "</div></div>";
      }).join("");
      P.openModal("exDayModal");
    }

    /* ---------------- pending syllabus / assigned exams ---------------- */
    function loadPending() {
      P.api("getTeacherAssignedExamsForSyllabus", [me], { overlay: false }).then(function (list) {
        list = list || [];
        var pending = list.filter(function (e) { return !e.hasSyllabus; });
        var withSyl = list.filter(function (e) { return e.hasSyllabus; });
        var host = $("exPending"), html = "";
        if (!list.length) { host.innerHTML = '<div class="ex-sechead"><i class="material-icons">assignment</i> Your assigned exams</div><div class="ex-empty"><i class="material-icons">event_busy</i>No exams assigned to your classes yet.</div>'; return; }
        if (pending.length) { html += '<div class="ex-sechead pending"><i class="material-icons">assignment_late</i> Syllabus required · ' + pending.length + "</div>" + pending.map(function (e) { return teacherCard(e, true); }).join(""); }
        if (withSyl.length) { html += '<div class="ex-sechead"><i class="material-icons">check_circle</i> Syllabus set · ' + withSyl.length + "</div>" + withSyl.map(function (e) { return teacherCard(e, false); }).join(""); }
        host.innerHTML = html;
        Array.prototype.forEach.call(host.querySelectorAll("[data-addsyl]"), function (b) { b.addEventListener("click", function () { openPicker(+b.getAttribute("data-addsyl"), b.getAttribute("data-grade"), b.getAttribute("data-subject")); }); });
      }).catch(function () {});
    }
    function teacherCard(e, needsSyl) {
      var cls = needsSyl ? "psyl" : (e.isCompleted ? "completed" : "sched");
      var dateChip = e.date ? '<span><i class="material-icons">event</i>' + esc(e.date) + "</span>" : '<span style="color:var(--warning);"><i class="material-icons">event_busy</i>Date not set</span>';
      var mk = e.marks ? '<span><i class="material-icons">grade</i>' + esc(e.marks) + " marks</span>" : "";
      var cta = needsSyl
        ? '<button class="ex-abtn accent" data-addsyl="' + e.rowId + '" data-grade="' + esc(e.grade) + '" data-subject="' + esc(e.subject) + '"><i class="material-icons">library_books</i> Add Syllabus</button>'
        : (e.isCompleted ? '<span class="ex-status completed"><i class="material-icons" style="font-size:12px;">check</i> Completed</span>' : '<span class="ex-status sched"><i class="material-icons" style="font-size:12px;">schedule</i> Upcoming</span>');
      var syl = e.hasSyllabus ? '<div class="ex-syl"><b>Syllabus:</b> ' + esc((e.lessons || []).join("; ")) + "</div>" : '<div class="ex-syl empty">Syllabus not yet added</div>';
      return '<div class="ex-card ' + cls + '"><div><div class="t">' + esc(e.examName) + '</div><div class="meta"><span><i class="material-icons">groups</i>' + esc(e.gradeLabel || e.grade) + "</span><span><i class='material-icons'>menu_book</i>" + esc(e.subject) + "</span>" + dateChip + mk + "</div></div><div class='ex-cardacts'>" + cta + "</div>" + syl + "</div>";
    }
    function openPicker(rowId, grade, subject) {
      st.pickRow = rowId; st.pickCtx = { grade: grade, subject: subject };
      $("exPickBody").innerHTML = '<div class="ex-loading"><i class="material-icons">sync</i></div>';
      P.openModal("exPickModal");
      P.api("getSyllabusMasterLessons", [grade, subject], { overlay: false }).then(function (list) {
        if (!list || !list.length) { $("exPickBody").innerHTML = '<div class="ex-empty"><i class="material-icons">inbox</i>No lessons found in Syllabus Master for this class/subject.</div>'; return; }
        $("exPickBody").innerHTML = list.map(function (l, i) {
          return '<label class="ex-pickitem" data-name="' + esc(l.name) + '"><input type="checkbox"><span class="no">' + esc(l.lessonNo || (i + 1)) + '</span><span class="nm">' + esc(l.name) + '</span><span class="mo">' + esc(l.targetMonth || "") + "</span></label>";
        }).join("");
        Array.prototype.forEach.call($("exPickBody").querySelectorAll(".ex-pickitem input"), function (c) { c.addEventListener("change", function () { c.closest(".ex-pickitem").classList.toggle("on", c.checked); }); });
      });
    }
    function commitPicker() {
      var picked = [];
      Array.prototype.forEach.call($("exPickBody").querySelectorAll(".ex-pickitem"), function (l) { var c = l.querySelector("input"); if (c && c.checked) picked.push(l.getAttribute("data-name")); });
      if (!picked.length) { toast("Select at least one lesson.", "err"); return; }
      P.api("teacherAddExamSyllabus", [st.pickRow, picked, me]).then(function (res) {
        if (res && res.success) { P.closeModal("exPickModal"); toast("Syllabus added.", "ok"); loadPending(); loadCalendar(); }
        else toast("Save failed: " + ((res && res.error) || "unknown"), "err");
      }).catch(function (e) { toast("Error: " + (e.message || e), "err"); });
    }

    /* ---------------- modals ---------------- */
    function dayModal() {
      return '<div class="modal-overlay" id="exDayModal"><div class="modal-content" style="max-width:640px;width:100%;max-height:86vh;display:flex;flex-direction:column;">' +
        '<div class="modal-header-container"><h3 id="exDayTitle">Exams</h3><button class="modal-close-icon" data-close="exDayModal">&times;</button></div>' +
        '<div id="exDayBody" style="overflow-y:auto;flex-grow:1;padding-right:4px;"></div></div></div>';
    }
    function pickModal() {
      return '<div class="modal-overlay" id="exPickModal" style="z-index:1200;"><div class="modal-content" style="max-width:560px;width:100%;">' +
        '<div class="modal-header-container"><h3>Add Syllabus</h3><button class="modal-close-icon" data-close="exPickModal">&times;</button></div>' +
        '<p class="ex-note" style="margin-bottom:12px;">Pick the lessons this exam will cover (from Syllabus Master). You can add syllabus only where it is missing — management edits existing ones.</p>' +
        '<div id="exPickBody" class="ex-pick"></div>' +
        '<div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;"><button class="btn btn-secondary" data-close="exPickModal" style="width:auto;">Cancel</button>' +
        '<button class="btn btn-success" id="exPickApply" style="width:auto;"><i class="material-icons" style="color:#fff;">done</i> Save Syllabus</button></div></div></div>';
    }
    $("exPickApply").addEventListener("click", commitPicker);
  }

  /* =======================================================================
     BOOT — Management vs Teacher
     ======================================================================= */
  if (isAdmin) bootAdmin(); else bootTeacher();
})();

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
      if (pp.parameter === "Height & Weight") {
        P.api("progressGetClassData", [st.holCls, st.holBucket], { overlay: false }).then(function (data) {
          var rows = ((data && data.students) || []).map(function (student, index) {
            var height = student.heightCm || student.height || "", weight = student.weightKg || student.weight || "";
            var bmi = height && weight ? (Number(weight) / Math.pow(Number(height) / 100, 2)).toFixed(1) : "&ndash;";
            return '<div class="hw-entryrow" data-id="' + esc(student.id || student.studentId || '') + '" data-name="' + esc(student.name || '') + '"><div class="hw-student"><b>' + esc(student.roll || index + 1) + '</b><span>' + esc(student.name || '') + '</span></div><div class="hw-inputs"><label>Height (cm)<input class="ex-in hw-height" type="number" inputmode="decimal" min="50" max="220" step="0.1" value="' + esc(height) + '"></label><label>Weight (kg)<input class="ex-in hw-weight" type="number" inputmode="decimal" min="10" max="200" step="0.1" value="' + esc(weight) + '"></label><label>BMI<span class="hw-bmi">' + bmi + '</span></label></div></div>';
          }).join('');
          $("mkHHost").innerHTML = '<div class="hw-entrylist">' + rows + '</div><div class="ex-actbar"><button class="btn btn-success" id="hwSave"><i class="material-icons" style="color:#fff">save</i> Save Height & Weight</button></div>';
          function calculate(row) { var h = Number(row.querySelector('.hw-height').value), w = Number(row.querySelector('.hw-weight').value); row.querySelector('.hw-bmi').textContent = h > 0 && w > 0 ? (w / Math.pow(h / 100, 2)).toFixed(1) : '–'; }
          Array.prototype.forEach.call($("mkHHost").querySelectorAll('.hw-entryrow'), function (row) { row.querySelector('.hw-height').addEventListener('input', function () { calculate(row); }); row.querySelector('.hw-weight').addEventListener('input', function () { calculate(row); }); });
          $("hwSave").addEventListener('click', function () {
            var entries = Array.prototype.map.call($("mkHHost").querySelectorAll('.hw-entryrow'), function (row) { return { id: row.getAttribute('data-id'), name: row.getAttribute('data-name'), heightCm: row.querySelector('.hw-height').value, weightKg: row.querySelector('.hw-weight').value, bmi: row.querySelector('.hw-bmi').textContent }; });
            P.api("saveHolisticHealthData", [{ className: st.holCls, bucket: st.holBucket, entries: entries, enteredBy: user }]).then(function (res) { toast((res && res.message) || "Height and weight saved.", res && res.success === false ? "err" : "ok"); }).catch(function (e) { toast("Error: " + (e.message || e), "err"); });
          });
        }).catch(function (e) { empty("mkHHost", esc(e.message || e), "error_outline"); });
        return;
      }
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
    var st = { tab: "overview", editingRow: null, pickLessons: [], presets: [], marksMounted: false, locksLoaded: false, reportData: null, holisticMounted: false };

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
          '<button data-t="reports"><i class="material-icons">description</i> Reports</button><button data-t="holistic"><i class="material-icons">emoji_people</i> Holistic</button>' +
        '</div>' +
        '<div id="exPaneOverview">' + overviewPane() + '</div>' +
        '<div id="exPaneSchedule" style="display:none;"></div>' +
        '<div id="exPaneMarks" style="display:none;"></div>' +
        '<div id="exPaneLocks" style="display:none;"></div>' +
        '<div id="exPaneReports" style="display:none;"></div><div id="exPaneHolistic" style="display:none;"></div>' +
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
      ["overview", "schedule", "marks", "locks", "reports", "holistic"].forEach(function (x) { $("exPane" + cap(x)).style.display = (x === t) ? "block" : "none"; });
      Array.prototype.forEach.call($("exTabs").querySelectorAll("button"), function (b) { b.classList.toggle("active", b.getAttribute("data-t") === t); });
      if (t === "schedule") initSchedule();
      else if (t === "marks" && !st.marksMounted) { st.marksMounted = true; $("exPaneMarks").innerHTML = ""; mountAdminMarks("exPaneMarks", me); }
      else if (t === "locks") initLocks();
      else if (t === "reports" && !$("exPaneReports").innerHTML) initReports();
      else if (t === "holistic" && !st.holisticMounted) { st.holisticMounted = true; initAdminHolistic(); }
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

    /* ---------------- HOLISTIC tab (management responsible entry) ---------------- */
    function initAdminHolistic() {
      var host = $("exPaneHolistic");
      host.innerHTML = '<p class="view-description" style="margin-top:0;">Assign the responsible teacher for each holistic parameter across Classes 6–10.</p>' +
        '<div class="ex-toolbar"><div class="ex-field"><label>Assessment</label><select id="haBucket">' +
          BUCKET_SEQ.map(function (bucket) { return '<option value="' + bucket + '">' + bucket + '</option>'; }).join('') +
        '</select></div></div>' +
        '<div id="haBody"><div class="ex-loading"><i class="material-icons">sync</i><div>Loading responsibility matrix…</div></div></div>';
      var classes = ["6", "7", "8", "9", "10"], teachers = [];
      function normalizeClasses(list) {
        var found = (list || []).filter(function (c) { var n = gradeNumFromClass(c); return n >= 6 && n <= 10; });
        return found.length ? found : classes;
      }
      function teacherName(t) { return typeof t === "string" ? t : (t.name || t.teacher || t.fullName || t.email || ""); }
      function normalizeTeachers(list) {
        var rows = Array.isArray(list) ? list : ((list && (list.teachers || list.staff || list.users || list.rows)) || []);
        return rows.filter(function (t) {
          var role = String(typeof t === "string" ? "" : (t.role || t.designation || t.type || t.department || "")).toLowerCase();
          return !role || /teacher|faculty|pet|physical/.test(role);
        }).map(teacherName).filter(Boolean).filter(function (name, index, arr) { return arr.indexOf(name) === index; });
      }
      function getTeacherList() {
        var calls = ["getTeachers", "getStaff", "getUsers"];
        function next(i) {
          if (i >= calls.length) return Promise.resolve([]);
          return P.api(calls[i], [], { overlay: false }).then(function (res) { var list = normalizeTeachers(res); return list.length ? list : next(i + 1); }).catch(function () { return next(i + 1); });
        }
        return next(0);
      }
      Promise.all([
        P.api("marksGetHighSchoolClasses", [], { overlay: false }).catch(function () { return []; }),
        getTeacherList()
      ]).then(function (result) {
        classes = normalizeClasses(result[0]); teachers = result[1] || [];
        renderMatrix();
      });
      $("haBucket").addEventListener("change", renderMatrix);
      function renderMatrix() {
        var bucket = $("haBucket").value;
        loading("haBody", "Loading " + bucket + " responsibilities…");
        Promise.all(classes.map(function (cls) {
          return P.api("progressGetClassData", [cls, bucket], { overlay: false }).then(function (data) {
            return P.api("getHolisticResponsibilityMatrix", [cls, bucket], { overlay: false }).catch(function () { return { assignments: [] }; }).then(function (matrix) {
              var assignments = (matrix && matrix.assignments) || [];
              return Promise.all(teachers.map(function (teacher) {
                return P.api("getHolisticAssignments", [teacher, cls, bucket], { overlay: false }).then(function (res) {
                  return ((res && res.parameters) || []).map(function (p) { return { parameter: p.parameter, teacher: teacher }; });
                }).catch(function () { return []; });
              })).then(function (visible) {
                var merged = {}, all = assignments.concat([].concat.apply([], visible));
                all.forEach(function (a) { var teacher = a.teacher || a.teacherName || a.assignedTo || ""; if (a.parameter && teacher) merged[a.parameter] = { parameter: a.parameter, teacher: teacher }; });
                return { cls: cls, params: (data && data.holisticParams) || [], assignments: Object.keys(merged).map(function (key) { return merged[key]; }) };
              });
            });
          }).catch(function () { return { cls: cls, params: [], assignments: [] }; });
        })).then(function (sets) {
          var parameterNames = [];
          sets.forEach(function (set) { set.params.forEach(function (p) { if (parameterNames.indexOf(p.parameter) < 0) parameterNames.push(p.parameter); }); });
          if (bucket === "SA-1" && parameterNames.indexOf("Height & Weight") < 0) {
            parameterNames.push("Height & Weight");
            sets.forEach(function (set) { if (!set.params.some(function (p) { return p.parameter === "Height & Weight"; })) set.params.push({ parameter: "Height & Weight" }); });
          }
          if (!parameterNames.length) { empty("haBody", "No holistic parameters found for " + bucket + ".", "assignment_ind"); return; }
          sets.forEach(function (set) {
            (set.assignments || []).forEach(function (a) {
              var existing = a.teacher || a.teacherName || a.assignedTo || "";
              if (existing && teachers.indexOf(existing) < 0) teachers.push(existing);
            });
          });
          teachers.sort(function (a, b) { return String(a).localeCompare(String(b)); });
          var options = '<option value="">Unassigned</option>' + teachers.map(function (name) { return '<option value="' + esc(name) + '">' + esc(name) + '</option>'; }).join('');
          var head = '<tr><th class="name">Class</th>' + parameterNames.map(function (parameter) { return '<th>' + esc(parameter) + '</th>'; }).join('') + '</tr>';
          var body = sets.map(function (set) {
            var current = {}; set.assignments.forEach(function (a) { current[a.parameter] = a.teacher || a.teacherName || a.assignedTo || ""; });
            var available = set.params.map(function (p) { return p.parameter; });
            return '<tr data-class="' + esc(set.cls) + '"><td class="name">' + esc(set.cls) + '</td>' + parameterNames.map(function (parameter) {
              if (available.indexOf(parameter) < 0) return '<td class="ha-na">—</td>';
              return '<td data-parameter="' + esc(parameter) + '"><select class="ha-teacher">' + options + '</select></td>';
            }).join('') + '</tr>';
          }).join('');
          $("haBody").innerHTML = '<div class="ha-assign"><div class="ex-tablewrap ha-matrix-wrap"><table class="ex-table ha-matrix"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div><div class="ex-actbar"><button class="btn btn-success" id="haSave" style="width:auto"><i class="material-icons" style="color:#fff">save</i> Save Responsibilities</button></div></div>';
          sets.forEach(function (set) {
            var current = {}; set.assignments.forEach(function (a) { current[a.parameter] = a.teacher || a.teacherName || a.assignedTo || ""; });
            var tr = Array.prototype.filter.call($("haBody").querySelectorAll('tbody tr'), function (row) { return row.getAttribute('data-class') === String(set.cls); })[0];
            if (tr) Array.prototype.forEach.call(tr.querySelectorAll('td[data-parameter]'), function (td) { td.querySelector('select').value = current[td.getAttribute('data-parameter')] || ""; });
          });
          $("haSave").addEventListener('click', function () {
            var jobs = Array.prototype.map.call($("haBody").querySelectorAll('tbody tr'), function (tr) {
              var assignments = Array.prototype.map.call(tr.querySelectorAll('td[data-parameter]'), function (td) { return { parameter: td.getAttribute('data-parameter'), teacher: td.querySelector('select').value }; });
              return P.api("saveHolisticResponsibilityMatrix", [{ className: tr.getAttribute('data-class'), bucket: bucket, assignments: assignments, updatedBy: me }]);
            });
            Promise.all(jobs).then(function () { toast('Holistic responsibilities saved.', 'ok'); }).catch(function (e) { toast('Error: ' + (e.message || e), 'err'); });
          });
        });
      }
    }

    /* =====================================================================
       REPORTS tab (tabulation + progress reports)
       ===================================================================== */

    /* ---- subject allowlist (front-end only correction):
       6th/7th -> Telugu, Hindi, English, Maths, Science, Social
       8th-10th -> Telugu, Hindi, English, Maths, Physics, Biology, Social
       Anything else the backend happens to surface (e.g. stray "Chemistry")
       is dropped from BOTH the tabulation and the progress reports. ---- */
    var SUBJECTS_6_7 = ["Telugu", "Hindi", "English", "Maths", "Science", "Social"];
    var SUBJECTS_8_10 = ["Telugu", "Hindi", "English", "Maths", "Physics", "Biology", "Social"];
    function gradeNumFromClass(clsStr) {
      var m = String(clsStr || "").match(/(\d+)/);
      return m ? parseInt(m[1], 10) : null;
    }
    function allowedSubjectsFor(clsStr) {
      var n = gradeNumFromClass(clsStr);
      if (n === 6 || n === 7) return SUBJECTS_6_7;
      if (n >= 8 && n <= 10) return SUBJECTS_8_10;
      return null; // unknown grade band — don't filter, show whatever backend returned
    }
    function filterSubjects(d) {
      var allow = allowedSubjectsFor(d.class);
      if (!allow) return d.subjects || [];
      var have = d.subjects || [];
      return allow.filter(function (s) { return have.indexOf(s) >= 0; });
    }

    /* ---- academic year string, e.g. "2026-27" (India: June-May cycle) ---- */
    function academicYearStr() {
      var d = new Date(), y = d.getFullYear(), m = d.getMonth() + 1; // 1-12
      var startY = (m >= 6) ? y : (y - 1);
      return startY + "-" + String((startY + 1) % 100).padStart(2, "0");
    }

    /* ---- bucket -> human title, e.g. "FORMATIVE ASSESSMENT - 3" ---- */
    function bucketTitleWords(bucket) {
      var p = String(bucket || "").split("-"), kind = p[0], n = p[1] || "";
      var word = kind === "SA" ? "SUMMATIVE ASSESSMENT" : "FORMATIVE ASSESSMENT";
      return word + " - " + n;
    }

    /* ---- grade letter -> 10-point GPA (standard CBSE-style scale). Used
       for the Progress Report's GPA column, computed from the SAME
       percent/grade already shown in the tabulation for that student. ---- */
    function gradeToGPA(grade) {
      var map = { A1: 10, A2: 9, B1: 8, B2: 7, C1: 6, C2: 5, D: 4, E: 0 };
      return (grade in map) ? map[grade] : 0;
    }

    /* ---- simple, single-bucket "Overall Impression" remark ---- */
    function overallImpression(pct) {
      if (pct >= 91) return "Excellent performance! Keep up the outstanding work.";
      if (pct >= 81) return "Very good performance. Continue working hard to reach the top.";
      if (pct >= 71) return "Good performance. Focus on the weaker subjects to improve further.";
      if (pct >= 61) return "Satisfactory performance. Consistent effort will improve the results.";
      if (pct >= 51) return "Average performance. Needs focused effort on weak areas.";
      if (pct >= 41) return "Below average. Needs significant improvement and support.";
      if (pct >= 33) return "Needs improvement. Please seek extra academic support.";
      return "Requires immediate attention and support to improve performance.";
    }
    function studentIdText(s) {
      return s.studentId || s.studentID || s.idNumber || s.admissionNo || s.admissionNumber || s.admNo || s.id || "—";
    }
    function subjectTotalValue(s, subject) {
      var c = (s.subjects || {})[subject] || {}, t = c.Tot;
      if (!t || !t.has || t.value === "" || t.value == null || isNaN(Number(t.value))) return null;
      return Number(t.value);
    }
    function intelligentImpression(s, subjects, maxPerSubject, attendancePct, hadAssessmentAbsence) {
      var scored = subjects.map(function (subject) { return { subject: subject, value: subjectTotalValue(s, subject) }; })
        .filter(function (x) { return x.value != null; });
      var pct = s.hasAny ? Number(s.percent) : 0;
      var text;
      if (!scored.length) text = "Assessment marks are incomplete. Please work regularly and seek support where needed.";
      else {
        scored.sort(function (a, b) { return b.value - a.value; });
        var strongest = scored[0], focus = scored[scored.length - 1];
        var opening = pct >= 80 ? "A very good effort overall." : pct >= 60 ? "A good effort overall." : pct >= 40 ? "A satisfactory effort with scope for improvement." : "More consistent effort and support are required.";
        var strength = "The work in " + strongest.subject + " is encouraging.";
        var next = focus.subject === strongest.subject ? "Continue the same regular effort." : "Please give extra attention to " + focus.subject + " through daily revision and correction of mistakes.";
        var closing = pct >= 60 ? "Keep up the effort." : "Regular practice will help improve the next result.";
        text = [opening, strength, next, closing].join(" ");
      }
      if (hadAssessmentAbsence) text += " Regular attendance during assessments is important and should be improved.";
      else if (attendancePct != null && Number(attendancePct) < 90) text += " Attendance is below 90%; more regular attendance will support better progress.";
      return text;
    }
    function isAbsentCell(cell) {
      if (!cell) return false;
      if (cell.absent === true || cell.isAbsent === true || cell.status === "A" || cell.status === "ABSENT") return true;
      var raw = String(cell.value == null ? (cell.scored == null ? "" : cell.scored) : cell.value).trim().toLowerCase();
      return raw === "ab" || raw === "abs" || raw === "absent" || raw === "a";
    }
    function progressCellText(cell, value) {
      if (isAbsentCell(cell)) return "Ab";
      return value == null ? "&ndash;" : esc(roundHalfValue(value));
    }
    function studentHasAssessmentAbsence(student, subjects, keys) {
      return subjects.some(function (subject) {
        var cells = (student.subjects || {})[subject] || {};
        return keys.some(function (key) { return isAbsentCell(cells[key]); });
      });
    }

    function attendanceMonthsForBucket(bucket) {
      var periods = {
        "FA-1": [6, 7],
        "FA-2": [8, 9],
        "SA-1": [6, 7, 8, 9, 10],
        "FA-3": [11, 12],
        "FA-4": [1, 2],
        "SA-2": [6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4]
      };
      var startYear = parseInt(academicYearStr().split("-")[0], 10);
      return (periods[bucket] || []).map(function (month) {
        var year = month >= 6 ? startYear : startYear + 1;
        return year + "-" + String(month).padStart(2, "0");
      });
    }
    function attendanceMonthName(iso) {
      var month = parseInt(String(iso || "").split("-")[1], 10);
      return ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][month - 1] || iso;
    }
    function loadAssessmentAttendance(className, bucket) {
      var months = attendanceMonthsForBucket(bucket);
      return Promise.all(months.map(function (month) {
        return P.api("attMonthlyReport", [className, month], { overlay: false })
          .then(function (data) { return { month: month, data: data || null }; })
          .catch(function () { return { month: month, data: null }; });
      }));
    }
    function findAttendanceStudent(report, student) {
      if (!report || !report.students) return null;
      var sid = String(studentIdText(student));
      var roll = String(student.roll == null ? "" : student.roll);
      var name = String(student.name || "").trim().toLowerCase();
      return report.students.filter(function (row) {
        if (row.id != null && String(row.id) === sid) return true;
        if (row.rollNo != null && String(row.rollNo) === roll) return true;
        return String(row.name || "").trim().toLowerCase() === name;
      })[0] || null;
    }
    function attendanceRowsForStudent(d, student) {
      var reports = d.attendanceReports || [], rows = [], lastStudent = null, lastReport = null;
      reports.forEach(function (entry) {
        var report = entry.data, row = findAttendanceStudent(report, student);
        if (row && report) { lastStudent = row; lastReport = report; }
        rows.push({
          month: attendanceMonthName(entry.month),
          present: row && row.current != null ? row.current : null,
          working: report && report.working && report.working.current != null ? report.working.current : null,
          percentage: row && row.pctMonth != null ? row.pctMonth : null
        });
      });
      return {
        rows: rows,
        cumulativePresent: lastStudent && lastStudent.total != null ? lastStudent.total : null,
        cumulativeWorking: lastReport && lastReport.working && lastReport.working.total != null ? lastReport.working.total : null,
        overallPercentage: lastStudent && lastStudent.pctYear != null ? lastStudent.pctYear : null
      };
    }
    function classRankMap(students) {
      var rows = students.map(function (student, index) { return { index: index, score: student.hasAny ? Number(student.totalScored) : null }; })
        .filter(function (r) { return r.score != null && !isNaN(r.score); }).sort(function (a, b) { return b.score - a.score; });
      var out = {}, previous = null, rank = 0;
      rows.forEach(function (r, position) { if (previous === null || Math.abs(r.score - previous) > 0.000001) rank = position + 1; out[r.index] = rank; previous = r.score; });
      return out;
    }
    function passFailWord(pct) { return pct >= 33 ? "PASSED" : "NOT PASSED"; }

    function initReports() {
      $("exPaneReports").innerHTML =
        '<p class="view-description" style="margin-top:0;">Pick a class and assessment, load the tabulation to review totals, %, grade and spot missing marks. Print, export, or print individual progress reports.</p>' +
        '<div class="ex-toolbar">' +
          '<div class="ex-field"><label>Class</label><select id="repClass"><option value="">Loading…</option></select></div>' +
          '<div class="ex-field"><label>Assessment</label><select id="repBucket"><option value="">Loading…</option></select></div>' +
          '<button class="ex-abtn primary" id="repLoad"><i class="material-icons">table_view</i> Load Tabulation</button>' +
        '</div>' +
        '<div class="ex-actbar" style="margin-top:0;"><button class="ex-abtn" id="repPrint" disabled><i class="material-icons">print</i> Print</button>' +
        '<button class="ex-abtn" id="repCsv" disabled><i class="material-icons">download</i> Export CSV</button></div>' +
        '<div id="repHint" class="ex-note" style="margin-top:10px;">Choose a class + assessment, then Load Tabulation.</div>' +
        '<div id="repTab" style="display:none;">' +
          '<div id="repTabScaler">' +
            '<div class="rep-print-head">' +
              '<img src="receipt-header-logo.png" alt="' + esc((P.CONFIG.SCHOOL || {}).name || "School") + '" onerror="this.style.display=\'none\'">' +
            '</div>' +
            '<div class="rep-doc-title" id="repDocTitle"></div>' +
            '<div class="rep-doc-legend" id="repDocLegend"></div>' +
            '<div class="ex-legend"><span><span class="sw" style="background:#fdecec;"></span>Missing marks</span></div>' +
            '<div class="rep-tablewrap" id="repTabWrap"><table class="rep-table" id="repTable"></table></div>' +
            '<div class="rep-print-gen" id="repPrintGen"></div>' +
          '</div>' +
        '</div>' +
        '<div id="prPanel"></div>' +
        '<div id="progRepPrintArea"></div>';
      P.api("progressGetClasses", [], { overlay: false }).then(function (cs) { $("repClass").innerHTML = '<option value="">Select class…</option>' + (cs || []).map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + "</option>"; }).join(""); });
      P.api("progressGetBucketList", [], { overlay: false }).then(function (bs) {
        var labels = {};
        (bs || []).forEach(function (b) { if (b && b.bucket) labels[b.bucket] = b.label || b.bucket; });
        $("repBucket").innerHTML = '<option value="">Select assessment…</option>' + BUCKET_SEQ.map(function (bucket) {
          return '<option value="' + esc(bucket) + '">' + esc(labels[bucket] || bucket) + '</option>';
        }).join("");
      });
      $("repClass").addEventListener("change", clearReport); $("repBucket").addEventListener("change", clearReport);
      $("repLoad").addEventListener("click", loadTab);
      $("repPrint").addEventListener("click", function () { printContainer("repTab", "landscape"); });
      $("repCsv").addEventListener("click", exportCsv);
    }
    function clearReport() {
      st.reportData = null; $("repTab").style.display = "none"; $("repHint").style.display = "block";
      $("repHint").textContent = "Choose a class + assessment, then Load Tabulation.";
      $("repPrint").disabled = true; $("repCsv").disabled = true;
      $("prPanel").innerHTML = "";
    }
    function loadTab() {
      var cls = $("repClass").value, bk = $("repBucket").value;
      if (!cls || !bk) { toast("Choose a class and an assessment.", "err"); return; }
      $("repHint").style.display = "block"; $("repHint").textContent = "Loading tabulation…";
      P.api("progressGetClassData", [cls, bk], { overlay: false }).then(function (data) {
        st.reportData = data || { students: [] };
        return loadAssessmentAttendance(cls, bk);
      }).then(function (reports) {
        st.reportData.attendanceReports = reports || [];
        renderTab(); renderProgressPanel();
      }).catch(function (e) { $("repHint").textContent = "Error: " + (e.message || e); });
    }
    function roundHalfValue(v) {
      if (v === "" || v == null || isNaN(Number(v))) return v;
      var n = Math.round((Number(v) + Number.EPSILON) * 2) / 2;
      return Number.isInteger(n) ? String(n) : n.toFixed(1);
    }
    function cell(c) {
      if (!c) return '<td class="miss">&ndash;</td>';
      var show = (c.value === "" || c.value == null) ? "&ndash;" : roundHalfValue(c.value);
      return '<td class="' + (c.has ? "" : "miss") + '">' + show + "</td>";
    }
    /* Short column-header abbreviations (CT1/CT2/UT/HA/Tot or Exam/Int/Tot).
       Where the backend's full label carries the bucket-specific Class
       Test number (e.g. "Class Test 5 (20)" for FA-3), we keep that number
       so admins still see the right running count, just compacted. */
    function shortColLabel(key, fullLabel) {
      var full = String(fullLabel || "");
      if (key === "CT1" || key === "CT2") { var m = full.match(/Test\s*(\d+)/i); return m ? "CT" + m[1] : (key === "CT1" ? "CT1" : "CT2"); }
      if (key === "UT") return "UT";
      if (key === "HA") return "HA";
      if (key === "Tot") return "Tot";
      if (key === "Exam") return "Exam";
      if (key === "Int") return "Int";
      return key;
    }
    function maxFromLabel(fullLabel) { var m = String(fullLabel || "").match(/\((\d+(?:\.\d+)?)\)/); return m ? m[1] : ""; }
    function reportCell(c, extraClass) {
      if (!c) return '<td class="miss ' + (extraClass || "") + '">&ndash;</td>';
      var show = (c.value === "" || c.value == null) ? "&ndash;" : roundHalfValue(c.value);
      return '<td class="' + (c.has ? "" : "miss ") + (extraClass || "") + '">' + show + '</td>';
    }
    function renderTab() {
      var d = st.reportData;
      if (!d || !d.students || !d.students.length) { $("repHint").textContent = "No students found for this class."; $("repTab").style.display = "none"; return; }

      var subjects = filterSubjects(d);
      var isSABucket = !!d.isSA;
      var hol = (d.holisticParams || []).slice(0, 3);
      var subjectKeys = isSABucket ? ["Exam", "Int", "Tot"] : ["CT1", "CT2", "HA", "UT", "Tot"];
      var subjectLabels = isSABucket ? ["1", "2", "T"] : ["1", "2", "3", "4", "T"];
      var subjectMax = isSABucket ? ["80", "20", "100"] : ["20", "20", "5", "25", "50"];
      var perSub = subjectKeys.length;
      var overallMax = subjects.length * (isSABucket ? 100 : 50);

      $("repDocTitle").textContent = bucketTitleWords(d.bucket) + " MARKS SHEET (" + academicYearStr() + ")";
      $("repDocLegend").innerHTML = buildLegendHtml(d, isSABucket);

      /* Exact old-sheet proportions: narrow numbered component columns,
         wider student-name column, four holistic columns, then only
         Total / % / P-F. */
      var colHtml = '<colgroup><col class="c-sl"><col class="c-name">';
      subjects.forEach(function () {
        for (var i = 0; i < perSub; i++) colHtml += '<col class="c-mark">';
      });
      for (var h = 0; h < 4; h++) colHtml += '<col class="c-hol">';
      colHtml += '<col class="c-total"><col class="c-percent"><col class="c-pf"><col class="c-rank"></colgroup>';

      var h1 = '<tr class="top"><th rowspan="2">Sl<br>No</th><th rowspan="2">Student Name</th>';
      var h2 = '<tr class="sub">';
      subjects.forEach(function (subj) {
        h1 += '<th class="grp" colspan="' + perSub + '">' + esc(subj) + '</th>';
        subjectLabels.forEach(function (label, i) {
          h2 += '<th class="' + (i === 0 ? 'grp ' : '') + (i === subjectLabels.length - 1 ? 'sumhead' : '') + '">' + label + '<span class="mx">(' + subjectMax[i] + ')</span></th>';
        });
      });
      h1 += '<th class="grp" colspan="4">Holistic Indicators</th>';
      h2 += '<th class="grp">1<span class="mx">(10)</span></th><th>2<span class="mx">(10)</span></th><th>3<span class="mx">(10)</span></th><th class="sumhead">T<span class="mx">(30)</span></th>';
      h1 += '<th class="grp total-head" colspan="4">TOTAL</th></tr>';
      h2 += '<th class="grp total-head">' + esc(d.bucket) + '<span class="mx">(' + overallMax + ')</span></th><th class="total-head">%</th><th class="total-head">P/F</th><th class="total-head">Rank</th></tr>';

      var rankRows = d.students.map(function (student, index) {
        return { index: index, score: student.hasAny ? Number(student.totalScored) : null };
      }).filter(function (r) { return r.score != null && !isNaN(r.score); })
        .sort(function (a, b) { return b.score - a.score; });
      var rankByIndex = {}, lastScore = null, lastRank = 0;
      rankRows.forEach(function (r, position) {
        if (lastScore === null || Math.abs(r.score - lastScore) > 0.000001) lastRank = position + 1;
        rankByIndex[r.index] = lastRank;
        lastScore = r.score;
      });

      var body = "";
      d.students.forEach(function (s, idx) {
        var cells = "";
        subjects.forEach(function (subj) {
          var c = s.subjects[subj] || {};
          subjectKeys.forEach(function (key, ci) {
            cells += reportCell(c[key], (ci === 0 ? "grp " : "") + (ci === subjectKeys.length - 1 ? "sub-total" : ""));
          });
        });

        var holTotal = 0, holHas = false;
        for (var hi = 0; hi < 3; hi++) {
          var p = hol[hi], hv = p && s.holistic ? s.holistic[p.parameter] : null;
          if (hv && hv.has && hv.value !== "" && hv.value != null) { holTotal += Number(hv.value); holHas = true; }
          cells += reportCell(hv, hi === 0 ? "grp" : "");
        }
        cells += '<td class="sub-total">' + (holHas ? roundHalfValue(holTotal) : '&ndash;') + '</td>';

        var pct = s.hasAny ? Number(s.percent) : 0;
        body += '<tr class="' + (!s.hasAny ? 'norow' : '') + '">' +
          '<td>' + esc(s.roll != null && s.roll !== "" ? s.roll : (idx + 1)) + '</td>' +
          '<td class="student-name">' + esc(s.name) + '</td>' + cells +
          '<td class="grp grand-total">' + (s.hasAny ? roundHalfValue(s.totalScored) : '&ndash;') + '</td>' +
          '<td class="grand-total">' + (s.hasAny ? s.percent : '&ndash;') + '</td>' +
          '<td class="grand-total">' + (s.hasAny ? (pct >= 33 ? 'P' : 'F') : '&ndash;') + '</td>' +
          '<td class="grand-total">' + (rankByIndex[idx] || '&ndash;') + '</td></tr>';
      });

      $("repTable").innerHTML = colHtml + '<thead>' + h1 + h2 + '</thead><tbody>' + body + '</tbody>';
      $("repPrintGen").textContent = "";
      $("repHint").style.display = "none"; $("repTab").style.display = "block";
      $("repPrint").disabled = false; $("repCsv").disabled = false;
    }
    function buildLegendHtml(d, isSABucket) {
      if (isSABucket) {
        return '<b>Academic :</b> 1 - Summative Exam, 2 - Internal Marks, T - Total; <b>Holistic :</b> 1 - ' +
          esc(((d.holisticParams || [])[0] || {}).parameter || 'Attendance & Punctuality') + ', 2 - ' +
          esc(((d.holisticParams || [])[1] || {}).parameter || 'Extra & Co-curriculars') + ', 3 - ' +
          esc(((d.holisticParams || [])[2] || {}).parameter || 'Assembly & Spoken Skills');
      }
      var hp = d.holisticParams || [];
      return '<b>Academic :</b> 1 - Class Test 1, 2 - Class Test 2, 3 - Home Assignment, 4 - Unit Test; ' +
        '<b>Holistic :</b> 1 - ' + esc((hp[0] || {}).parameter || 'Attendance & Punctuality') +
        ', 2 - ' + esc((hp[1] || {}).parameter || 'Extra & Co-curriculars') +
        ', 3 - ' + esc((hp[2] || {}).parameter || 'Assembly & Spoken Skills');
    }
    function exportCsv() {
      var d = st.reportData; if (!d || !d.students || !d.students.length) return;
      var subjects = filterSubjects(d);
      var isSABucket = d.isSA, subCols = isSABucket ? ["Exam", "Int", "Tot"] : ["CT1", "CT2", "HA", "UT", "Tot"];
      var colLabels = d.colLabels || {};
      var header = ["Roll", "Student"];
      subjects.forEach(function (subj) { subCols.forEach(function (c) { header.push(subj + " " + (colLabels[c] || c)); }); });
      (d.holisticParams || []).forEach(function (p) { header.push("Holistic: " + p.parameter); });
      header.push("Total", "Max", "%", "P/F");
      var lines = [header.map(csvEsc).join(",")];
      d.students.forEach(function (s) {
        var row = [s.roll, s.name];
        subjects.forEach(function (subj) {
          var c = s.subjects[subj] || {};
          subCols.forEach(function (k) { var v = c[k]; row.push(v && v.value !== "" && v.value != null ? v.value : ""); });
        });
        (d.holisticParams || []).forEach(function (p) { var v = s.holistic ? s.holistic[p.parameter] : null; row.push(v && v.value !== "" ? v.value : ""); });
        row.push(s.hasAny ? s.totalScored : "", s.totalMax, s.hasAny ? s.percent : "", s.hasAny ? (Number(s.percent) >= 33 ? "P" : "F") : "");
        lines.push(row.map(csvEsc).join(","));
      });
      var blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = "Tabulation_" + d.class + "_" + d.bucket + ".csv"; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
    function csvEsc(v) { v = (v == null ? "" : String(v)); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }

    /* ---------------- PROGRESS REPORTS panel (checkbox picker) ---------------- */
    function renderProgressPanel() {
      var d = st.reportData;
      var host = $("prPanel");
      if (!d || !d.students || !d.students.length) { host.innerHTML = ""; return; }
      host.innerHTML =
        '<div class="pr-panel">' +
          '<div class="pr-panel-head"><div><h4><i class="material-icons" style="font-size:16px;vertical-align:middle;">description</i> Print Progress Reports</h4>' +
          '<div class="pr-panel-sub">One printable report per selected student — ' + esc(bucketTitleWords(d.bucket)) + '.</div></div>' +
          '<label class="pr-selectall"><input type="checkbox" id="prSelectAll" checked> Select all</label></div>' +
          '<div class="pr-studentlist" id="prStudentList"></div>' +
          '<div class="pr-panel-foot"><span class="pr-count" id="prCount"></span>' +
          '<button class="ex-abtn primary" id="prPrintBtn"><i class="material-icons">print</i> Print Selected Progress Reports</button></div>' +
        '</div>';
      var list = $("prStudentList");
      list.innerHTML = d.students.map(function (s, i) {
        return '<label class="pr-srow"><input type="checkbox" class="pr-sc" data-idx="' + i + '" checked><span class="roll">' + esc(s.roll) + '</span><span class="nm">' + esc(s.name) + "</span></label>";
      }).join("");
      function updateCount() {
        var n = list.querySelectorAll(".pr-sc:checked").length;
        $("prCount").textContent = n + " of " + d.students.length + " student" + (d.students.length > 1 ? "s" : "") + " selected";
      }
      updateCount();
      Array.prototype.forEach.call(list.querySelectorAll(".pr-sc"), function (cb) { cb.addEventListener("change", function () {
        updateCount();
        var all = list.querySelectorAll(".pr-sc"), checked = list.querySelectorAll(".pr-sc:checked");
        $("prSelectAll").checked = all.length === checked.length;
      }); });
      $("prSelectAll").addEventListener("change", function () {
        var on = this.checked;
        Array.prototype.forEach.call(list.querySelectorAll(".pr-sc"), function (cb) { cb.checked = on; });
        updateCount();
      });
      $("prPrintBtn").addEventListener("click", function () {
        var idxs = [];
        Array.prototype.forEach.call(list.querySelectorAll(".pr-sc:checked"), function (cb) { idxs.push(+cb.getAttribute("data-idx")); });
        if (!idxs.length) { toast("Select at least one student.", "err"); return; }
        buildProgressReports(idxs);
      });
    }

    /* ---- simple CSS-only bar chart (no external chart library needed) ---- */
    function buildChartHtml(subjects, values, maxVal, averages) {
      var ticks = [], step = maxVal / 5;
      for (var i = 5; i >= 0; i--) ticks.push(Math.round(step * i));
      var axis = '<div class="pr-chart-axis">' + ticks.map(function (t) { return "<span>" + t + "</span>"; }).join("") + '</div>';
      var bars = subjects.map(function (subj, i) {
        var v = Math.max(0, Math.min(maxVal, Number(values[i] || 0)));
        var h = Math.max(1, Math.round((v / maxVal) * 100));
        return '<div class="pr-bar-wrap"><div class="pr-bar" style="height:' + h + '%;" title="' + esc(subj) + ': ' + v + '"></div></div>';
      }).join('');
      var points = (averages || []).map(function (v, i) {
        var x = ((i + 0.5) / Math.max(subjects.length, 1)) * 1000;
        var y = 100 - Math.max(0, Math.min(100, (Number(v || 0) / maxVal) * 100));
        return Math.round(x * 10) / 10 + ',' + Math.round(y * 10) / 10;
      }).join(' ');
      var averageLine = points ? '<svg class="pr-average-line" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="' + points + '"></polyline></svg>' : '';
      var labels = '<div class="pr-chart-labels" style="--subject-count:' + Math.max(subjects.length, 1) + '">' + subjects.map(function (subj) { return '<span>' + esc(subj) + '</span>'; }).join('') + '</div>';
      return '<div class="pr-graphbox"><div class="pr-graphtitle">SUBJECT PERFORMANCE COMPARISON</div><div class="pr-chart-legend"><span class="pr-average-key"></span> Dotted line: class average by subject</div><div class="pr-chart">' + axis + '<div class="pr-chart-main"><div class="pr-chart-plot">' + averageLine + bars + '</div>' + labels + '</div></div></div>';
    }

    /* Column layout (kept consistent across every row via rowspan/colspan
       so the grid lines up exactly, matching the sample):
         FA: [Subject][CT1][CT2][UT][HA][Total] = 6 left cols + [Parameter][Value] = 2 holistic cols -> 8 total
         SA: [Subject][Exam][Int][Total]        = 4 left cols + [Parameter][Value] = 2 holistic cols -> 6 total
       "Total" gets its own rowspan-2 header (like "Subject"), separate
       from the "Academic Parameters" super-header, matching the sample. */
    function buildProgressReports(idxs) {
      var d = st.reportData;
      var subjects = filterSubjects(d);
      var isSABucket = !!d.isSA;
      var maxPerSubject = d.maxPerSubject || (isSABucket ? 100 : 50);
      var title = bucketTitleWords(d.bucket) + " PROGRESS REPORT (" + academicYearStr() + ")";
      var holP = (d.holisticParams || []).slice();
      var colLabels = d.colLabels || {};
      var academicKeys = isSABucket ? ["Exam", "Int", "Tot"] : ["CT1", "CT2", "CTAvg", "HA", "UT", "Tot"];
      var ctNumbers = { "FA-1": [1, 2], "FA-2": [3, 4], "FA-3": [5, 6], "FA-4": [7, 8] }[d.bucket] || [1, 2];
      var internalSource = d.bucket === "SA-2" ? "Internal (FA-1 to FA-4)" : "Internal (FA-1 & FA-2)";
      var academicHeads = isSABucket ? ["Summative Exam", internalSource, "Total"] : ["Class Test " + ctNumbers[0], "Class Test " + ctNumbers[1], "Average of Class Tests " + ctNumbers[0] + " & " + ctNumbers[1], "Home Assignment", "Unit Test", "Total"];
      var academicMax = isSABucket
        ? [maxFromLabel(colLabels.Exam) || "80", maxFromLabel(colLabels.Int) || "20", String(maxPerSubject)]
        : [maxFromLabel(colLabels.CT1) || "20", maxFromLabel(colLabels.CT2) || "20", "20", maxFromLabel(colLabels.HA) || "5", maxFromLabel(colLabels.UT) || "25", String(maxPerSubject)];
      var componentMaximums = academicMax.map(function (max) { return Number(max) * subjects.length; });
      var ranks = classRankMap(d.students || []);

      function componentValue(student, subject, key) {
        var cells = (student.subjects || {})[subject] || {};
        if (key === "CTAvg") {
          var c1 = cells.CT1, c2 = cells.CT2;
          if (!c1 || !c2 || !c1.has || !c2.has || c1.value === "" || c2.value === "" || c1.value == null || c2.value == null || isNaN(Number(c1.value)) || isNaN(Number(c2.value))) return null;
          return (Number(c1.value) + Number(c2.value)) / 2;
        }
        var v = cells[key];
        return v && v.has && v.value !== "" && v.value != null && !isNaN(Number(v.value)) ? Number(v.value) : null;
      }
      function hasCompleteFASubject(student, subject) {
        return ["CT1", "CT2", "HA", "UT", "Tot"].every(function (key) { return componentValue(student, subject, key) != null; });
      }
      var classAverages = subjects.map(function (subject) {
        var vals = (d.students || []).filter(function (student) {
          return isSABucket ? subjectTotalValue(student, subject) != null : hasCompleteFASubject(student, subject);
        }).map(function (student) { return subjectTotalValue(student, subject); });
        return vals.length ? vals.reduce(function (a, b) { return a + b; }, 0) / vals.length : 0;
      });

      var pages = idxs.map(function (idx) {
        var s = d.students[idx]; if (!s) return "";
        var pct = s.hasAny ? Number(s.percent) : 0;
        var componentTotals = academicKeys.map(function (key) {
          if (key === "Tot") return s.hasAny ? Number(s.totalScored) : null;
          var vals = subjects.map(function (subject) { return componentValue(s, subject, key); }).filter(function (v) { return v != null; });
          return vals.length ? vals.reduce(function (a, b) { return a + b; }, 0) : null;
        });
        var academicRows = subjects.map(function (subject) {
          var cells = (s.subjects || {})[subject] || {};
          return '<tr><td class="pr-subjectname">' + esc(subject) + '</td>' + academicKeys.map(function (key, i) {
            var value = componentValue(s, subject, key), sourceCell = key === "CTAvg" ? null : cells[key];
            var shown = key === "CTAvg" && (isAbsentCell(cells.CT1) || isAbsentCell(cells.CT2)) ? "Ab" : progressCellText(sourceCell, value);
            return '<td class="' + (shown === "Ab" ? 'pr-absent ' : '') + (i === academicKeys.length - 1 ? 'pr-tot' : '') + '">' + shown + '</td>';
          }).join("") + '</tr>';
        }).join("");

        var holTotal = 0, holHas = false, holMaximum = 0;
        var holisticRows = holP.map(function (parameter, i) {
          var v = s.holistic ? s.holistic[parameter.parameter] : null, shown = "&ndash;";
          var maximum = Number(parameter.max == null ? (parameter.maximum == null ? 10 : parameter.maximum) : parameter.max) || 10;
          holMaximum += maximum;
          if (v && v.has && v.value !== "" && v.value != null) { holTotal += Number(v.value); holHas = true; shown = esc(roundHalfValue(v.value)); }
          return '<tr><td class="pr-hol-no">' + (i + 1) + '</td><td class="pr-hol-name">' + esc(parameter.parameter) + '</td><td>' + esc(roundHalfValue(maximum)) + '</td><td>' + shown + '</td></tr>';
        }).join("");
        holisticRows += '<tr class="pr-holistic-total"><td colspan="2" class="pr-scorelabel">Total</td><td class="pr-scorelabel">' + esc(roundHalfValue(holMaximum)) + '</td><td class="pr-scoreval">' + (holHas ? esc(roundHalfValue(holTotal)) : "&ndash;") + '</td></tr>';

        var headCells = academicHeads.map(function (label, i) { return '<th>' + esc(label) + '<span class="mx">Maximum ' + academicMax[i] + '</span></th>'; }).join("");
        var totalRow = '<tr class="pr-component-total"><td>Component Total</td>' + componentTotals.map(function (value, i) {
          return '<td>' + (value == null ? '&ndash;' : esc(roundHalfValue(value)) + ' / ' + esc(roundHalfValue(componentMaximums[i]))) + '</td>';
        }).join('') + '</tr>';
        var resultStrip = '<div class="pr-result-strip">' +
          '<div class="pr-result-card"><span>Percentage</span><b>' + (s.hasAny ? esc(s.percent) + '%' : '&ndash;') + '</b></div>' +
          '<div class="pr-result-card"><span>Rank</span><b>' + (ranks[idx] || '&ndash;') + '</b></div>' +
          '<div class="pr-result-card"><span>Overall Result</span><b>' + esc(passFailWord(pct)) + '</b></div>' +
        '</div>';
        var chartVals = subjects.map(function (subject) { var value = subjectTotalValue(s, subject); return value == null ? 0 : value; });
        var attendance = attendanceRowsForStudent(d, s);
        var assessmentAbsent = studentHasAssessmentAbsence(s, subjects, academicKeys.filter(function (k) { return k !== "CTAvg" && k !== "Tot"; }));
        var impression = intelligentImpression(s, subjects, maxPerSubject, attendance.overallPercentage, assessmentAbsent);
        function attendanceTableHtml(rows) {
          var head = rows.map(function (row) { return '<th>' + esc(row.month) + '</th>'; }).join('');
          var present = rows.map(function (row) { return '<td>' + (row.present == null ? '&ndash;' : esc(roundHalfValue(row.present))) + '</td>'; }).join('');
          var working = rows.map(function (row) { return '<td>' + (row.working == null ? '&ndash;' : esc(roundHalfValue(row.working))) + '</td>'; }).join('');
          var pct = rows.map(function (row) { return '<td>' + (row.percentage == null ? '&ndash;' : esc(row.percentage) + '%') + '</td>'; }).join('');
          return '<table class="pr-table pr-attendance-table' + (d.bucket === "SA-2" ? ' pr-attendance-sa2' : '') + '"><thead><tr><th>Metric</th>' + head + '<th>Cumulative</th></tr></thead><tbody>' +
            '<tr><th>Present Days</th>' + present + '<td class="pr-att-cum">' + (attendance.cumulativePresent == null ? '&ndash;' : esc(roundHalfValue(attendance.cumulativePresent))) + '</td></tr>' +
            '<tr><th>Working Days</th>' + working + '<td class="pr-att-cum">' + (attendance.cumulativeWorking == null ? '&ndash;' : esc(roundHalfValue(attendance.cumulativeWorking))) + '</td></tr>' +
            '<tr><th>Attendance %</th>' + pct + '<td class="pr-att-cum">' + (attendance.overallPercentage == null ? '&ndash;' : esc(attendance.overallPercentage) + '%') + '</td></tr></tbody></table>';
        }
        var attendanceHtml = attendanceTableHtml(attendance.rows);
        var height = s.heightCm || s.height || '', weight = s.weightKg || s.weight || '', bmi = height && weight ? (Number(weight) / Math.pow(Number(height) / 100, 2)).toFixed(1) : '&ndash;';
        var healthHtml = /^SA-[12]$/.test(d.bucket) ? '<div class="pr-section-title">Health Measurements</div><table class="pr-table pr-health-table"><thead><tr><th>Height</th><th>Weight</th><th>BMI</th></tr></thead><tbody><tr><td>' + (height || '&ndash;') + (height ? ' cm' : '') + '</td><td>' + (weight || '&ndash;') + (weight ? ' kg' : '') + '</td><td>' + bmi + '</td></tr></tbody></table>' : '';

        return '<div class="pr-page ' + (isSABucket ? 'pr-sa' : 'pr-fa') + '"><div class="pr-scale-inner">' +
          '<div class="pr-header"><img src="receipt-header-logo.png" alt="School" onerror="this.style.display=\'none\'"></div>' +
          '<div class="pr-title">' + esc(title) + '</div>' +
          '<table class="pr-student-table"><tr><th>Name of the Student</th><td>' + esc(s.name) + '</td><th>ID No.</th><td>' + esc(studentIdText(s)) + '</td></tr>' +
          '<tr><th>Class</th><td>' + esc(d.class) + '</td><th>Assessment</th><td>' + esc(d.bucket) + '</td></tr></table>' +
          '<div class="pr-section-title">Academic Assessment</div>' +
          '<table class="pr-table pr-academic-table"><thead><tr><th>Subject</th>' + headCells + '</tr></thead><tbody>' + academicRows + totalRow + '</tbody></table>' +
          resultStrip +
          '<div class="pr-section-title">Holistic Assessment</div>' +
          '<table class="pr-table pr-holistic-table"><thead><tr><th>Sl No.</th><th>Indicator</th><th>Maximum</th><th>Score</th></tr></thead><tbody>' + holisticRows + '</tbody></table>' +
          '<div class="pr-section-title">Attendance</div>' +
          attendanceHtml +
          healthHtml +
          '<div class="pr-impression-box"><div class="pr-impression-title">Overall Impression</div><div class="pr-impression-text">' + esc(impression) + '</div></div>' +
          buildChartHtml(subjects, chartVals, maxPerSubject, classAverages) + '<div class="pr-signature-space"></div>' +
          '<div class="pr-footer"><span>Principal\'s Signature</span><span>Parent\'s Signature</span></div></div></div>';
      }).join("");
      $("progRepPrintArea").innerHTML = pages;
      printContainer("progRepPrintArea", "portrait");
    }


    /* ---- print helper: shows exactly one of #repTab / #progRepPrintArea,
       computes a single uniform scale factor so the whole (correctly laid
       out, un-modified) block fits on one page, prints, then restores.
       Using a whole-block transform:scale — instead of shrinking individual
       cell fonts/padding or forcing table-layout:fixed — guarantees nothing
       can ever visually overlap: every cell keeps exactly the size it
       needs; the entire thing is just uniformly shrunk like a real
       "fit to page" print. ---- */
    function mmToPx(mm) { return mm * 96 / 25.4; }
    function scaleBlockToPage(scalerEl, wrapEl, orientation, restoreFns) {
      if (!scalerEl || !wrapEl) return;
      scalerEl.style.transform = "none";
      scalerEl.style.width = "auto";
      wrapEl.style.height = "auto";
      wrapEl.style.overflow = "visible";
      void scalerEl.offsetWidth; // force reflow before measuring
      var natW = scalerEl.scrollWidth, natH = scalerEl.scrollHeight;
      if (!natW || !natH) return;
      var marginMM = 10;
      var pageWmm = orientation === "landscape" ? 297 : 210;
      var pageHmm = orientation === "landscape" ? 210 : 297;
      var usableW = mmToPx(pageWmm - marginMM * 2);
      var usableH = mmToPx(pageHmm - marginMM * 2);
      var scale = usableW / natW;
      if (natH * scale > usableH) scale = usableH / natH;
      scale = Math.max(0.15, Math.min(scale, 1.35));
      scalerEl.style.transformOrigin = "top left";
      scalerEl.style.width = natW + "px";
      scalerEl.style.transform = "scale(" + scale + ")";
      wrapEl.style.height = (natH * scale) + "px";
      wrapEl.style.overflow = "hidden";
      restoreFns.push(function () {
        scalerEl.style.transform = ""; scalerEl.style.width = "";
        wrapEl.style.height = ""; wrapEl.style.overflow = "";
      });
    }
    /* Print in an isolated iframe so @page orientation is applied to the
       actual print document. Tabulation is always A4 landscape; progress
       reports are always A4 portrait. */
    function printContainer(id, orientation) {
      var source = $(id);
      if (!source) return;
      var wanted = id === "repTab" ? "landscape" : "portrait";
      var oldDisplay = source.style.display;
      source.style.display = "block";

      var cssNodes = Array.prototype.slice.call(document.querySelectorAll('link[rel="stylesheet"],style'));
      var headCss = cssNodes.map(function (n) { return n.outerHTML; }).join("");
      var baseHref = String(document.baseURI || location.href).replace(/"/g, "&quot;");
      var pageCss = '<style>' +
        (id === 'progRepPrintArea' ? '@page{size:A4 portrait;margin:10mm 8mm 10mm 22mm;}' : '@page{size:A4 landscape;margin:10mm;}') +
        'html,body{margin:0!important;padding:0!important;background:#fff!important;}' +
        'body *{visibility:visible!important;}' +
        '#repTab{display:block!important;width:277mm!important;}' +
        '#repTab .rep-tablewrap{width:277mm!important;max-height:none!important;overflow:visible!important;}' +
        '#repTab .rep-table{width:277mm!important;table-layout:fixed!important;}' +
        '#progRepPrintArea{display:block!important;width:180mm!important;}' +
        '#progRepPrintArea .pr-page{width:180mm!important;min-height:277mm!important;page-break-after:always;}' +
        '#progRepPrintArea .pr-page:last-child{page-break-after:auto;}' +
        '</style>';

      var frame = document.createElement("iframe");
      frame.setAttribute("aria-hidden", "true");
      frame.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;";
      document.body.appendChild(frame);
      var doc = frame.contentDocument;
      doc.open();
      doc.write('<!doctype html><html><head><base href="' + baseHref + '">' + headCss + pageCss + '</head><body>' + source.outerHTML + '</body></html>');
      doc.close();
      source.style.display = oldDisplay;

      function doPrint() {
        try { frame.contentWindow.focus(); frame.contentWindow.print(); }
        finally { setTimeout(function () { if (frame.parentNode) frame.parentNode.removeChild(frame); }, 800); }
      }
      var imgs = Array.prototype.slice.call(doc.images || []);
      var waits = imgs.map(function (img) { return img.complete ? Promise.resolve() : new Promise(function (resolve) { img.onload = img.onerror = resolve; }); });
      if (doc.fonts && doc.fonts.ready) waits.push(doc.fonts.ready.catch(function () {}));
      Promise.all(waits).then(function () { setTimeout(doPrint, 250); });
    }

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
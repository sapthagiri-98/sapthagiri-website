/* =========================================================================
   exam-marks.js — shared Marks Entry engine for both exam pages.
   Exposes window.ExamMarks with two entry points:
     ExamMarks.mountTeacher(hostId, user)
     ExamMarks.mountAdmin(hostId, user)
   Uses the global `Portal`. Backend (all already in Code.gs — unchanged):
     Academic (teacher): marksGetTeacherExamOptions, marksGetGrid, marksSaveBulk, marksSetLock
     Academic (admin):   marksGetHighSchoolClasses, marksGetAdminExamOptions, marksGetClassGrid, marksSaveBulk, marksSetLock
     Holistic (teacher): marksGetHighSchoolClasses, getHolisticBuckets, getHolisticAssignments,
                         getHolisticStudents, saveHolisticMarks
     Holistic (admin):   getHolisticLockState, holisticSetLock, runHolisticAutoAttendance
   ========================================================================= */
(function () {
  "use strict";
  var P = window.Portal;
  var esc = P.esc, $ = function (id) { return document.getElementById(id); };

  /* ---------- inline toast ---------- */
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

  /* =======================================================================
     TEACHER
     ======================================================================= */
  function mountTeacher(hostId, user) {
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

    var st = { user: user, opts: null, cur: null, holParams: [], holCur: null, holInit: false, holCls: "", holBucket: "" };
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

    // ---- academic ----
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
      ex.innerHTML = '<option value="">Select exam &amp; subject…</option>' + opts.map(function (o, i) { return '<option value="' + i + '">' + esc(o.label) + (o.locked ? " 🔒" : "") + (o.gated ? " (locked)" : "") + "</option>"; }).join("");
    });
    $("mkTExam").addEventListener("change", function () {
      var cls = $("mkTClass").value, idx = this.value; if (cls === "" || idx === "") return;
      var o = ((st.opts.options || {})[cls] || [])[+idx]; if (!o) return;
      if (o.gated) { empty("mkTHost", esc(o.gateMsg || "Locked"), "block"); return; }
      loading("mkTHost", "Loading students…");
      P.api("marksGetGrid", [o.className, o.subject, o.bucket, o.component]).then(function (g) { st.cur = g; renderSingle(g, "mkTHost", false, st, refreshT); }).catch(function (e) { empty("mkTHost", esc(e.message || e), "error_outline"); });
    });
    function refreshT() { $("mkTExam").dispatchEvent(new Event("change")); }

    // ---- holistic ----
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
        bSel.innerHTML = bl.map(function (b) { return '<option value="' + esc(b.bucket) + '">' + esc(b.bucket) + (b.locked ? " 🔒" : "") + "</option>"; }).join("");
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
          if (res && res.hasAnyAssignment) { var others = (res.teacherBuckets || []).map(function (tb) { return tb.bucket + (tb.available ? "" : (tb.visible ? " (locked)" : " (opens later)")); }); msg = "Your parameters are under: " + others.join(", ") + "."; }
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
      P.api("getHolisticStudents", [st.holCls, st.holBucket, pp.parameter, user]).then(function (g) {
        if (g && g.allowed === false) { empty("mkHHost", esc(g.error || "Not allowed"), "block"); return; }
        st.holCur = g; renderHolistic(g, "mkHHost", user, false, function () { holParamChanged(); });
      }).catch(function (e) { empty("mkHHost", esc(e.message || e), "error_outline"); });
    }
  }

  /* =======================================================================
     ADMIN
     ======================================================================= */
  function mountAdmin(hostId, user) {
    var host = $(hostId);
    host.innerHTML =
      '<div class="ex-toolbar">' +
        '<div class="ex-field"><label>Class</label><select id="mkAClass"><option value="">Loading…</option></select></div>' +
        '<div class="ex-field"><label>Exam / Assessment</label><select id="mkAExam" disabled><option value="">Pick a class first…</option></select></div>' +
      '</div>' +
      '<div id="mkAHolControls"></div>' +
      '<div id="mkAHost"><div class="ex-empty"><i class="material-icons">grid_on</i>Pick a class and exam to enter all subjects at once.</div></div>';

    var st = { user: user, cur: null };
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
        st.cur = g; renderClassGrid(g, "mkAHost", user);
        if (comp === "HOLISTIC") renderAdminHolControls(cls, bucket, user);
      }).catch(function (e) { empty("mkAHost", esc(e.message || e), "error_outline"); });
    });
  }

  function renderAdminHolControls(cls, bucket, user) {
    var isSA = String(bucket).indexOf("SA") === 0;
    var box = $("mkAHolControls");
    box.innerHTML =
      '<div class="ex-lock" style="justify-content:space-between;flex-wrap:wrap;gap:10px;">' +
      '<span><i class="material-icons" style="vertical-align:middle;color:var(--accent);">emoji_people</i> Holistic controls · <b>' + esc(cls) + " · " + esc(bucket) + "</b></span>" +
      '<span style="display:flex;gap:8px;flex-wrap:wrap;">' +
      (isSA ? "" : '<button class="ex-abtn accent" id="mkHARun"><i class="material-icons">bolt</i> Auto-fill Attendance</button>') +
      '<button class="ex-abtn" id="mkHALock"><i class="material-icons">lock</i> Lock</button>' +
      '<span id="mkHAStatus" class="ex-status draft" style="align-self:center;">…</span></span></div>';
    refreshLockState();
    var run = $("mkHARun"); if (run) run.addEventListener("click", function () {
      if (!confirm("Auto-fill Attendance & Punctuality for " + cls + " · " + bucket + " from attendance %?")) return;
      run.disabled = true; run.innerHTML = '<i class="material-icons">sync</i> Running…';
      P.api("runHolisticAutoAttendance", [cls, bucket, user]).then(function (res) {
        toast((res && res.message) || (res && res.success ? "Done" : "Failed"), res && res.success ? "ok" : "err");
        // reload grid
        $("mkAExam").dispatchEvent(new Event("change"));
      }).catch(function (e) { run.disabled = false; run.innerHTML = '<i class="material-icons">bolt</i> Auto-fill Attendance'; toast("Error: " + (e.message || e), "err"); });
    });
    $("mkHALock").addEventListener("click", function () {
      var willLock = $("mkHALock").getAttribute("data-locked") !== "1";
      if (!confirm((willLock ? "Lock " : "Unlock ") + cls + " · " + bucket + "?" + (willLock ? " This unlocks the next assessment for teachers." : ""))) return;
      P.api("holisticSetLock", [cls, bucket, willLock, user]).then(function () { toast((willLock ? "Locked " : "Unlocked ") + bucket, "ok"); refreshLockState(); }).catch(function (e) { toast("Error: " + (e.message || e), "err"); });
    });
    function refreshLockState() {
      P.api("getHolisticLockState", [cls, bucket], { overlay: false }).then(function (s) {
        var badge = $("mkHAStatus"), lockBtn = $("mkHALock"); if (!badge) return;
        var locked = !!(s && s.locked), manual = !!(s && s.manualLocked);
        badge.className = "ex-status " + (locked ? "psyl" : "sched"); badge.textContent = locked ? ((s && s.dateLocked) ? "Locked (date)" : "Locked") : "Open";
        lockBtn.setAttribute("data-locked", manual ? "1" : "0");
        lockBtn.innerHTML = '<i class="material-icons">' + (manual ? "lock_open" : "lock") + "</i>" + (manual ? " Unlock" : " Lock");
        lockBtn.disabled = !!(s && s.dateLocked && !manual);
      }).catch(function () {});
    }
  }

  /* =======================================================================
     shared renderers
     ======================================================================= */
  function overFlag(el, max) { var over = el.value !== "" && Number(el.value) > Number(max); el.classList.toggle("over", over); var row = el.closest(".ex-entryrow"); if (row) row.classList.toggle("over", over); }

  // single-subject entry list (teacher academic)
  function renderSingle(g, hostId, isMgmt, st, refresh) {
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
    // wire
    Array.prototype.forEach.call(host.querySelectorAll(".mk-mark"), function (inp) { inp.addEventListener("input", function () { overFlag(inp, g.max); }); });
    Array.prototype.forEach.call(host.querySelectorAll(".ex-abs input"), function (cb) {
      cb.addEventListener("change", function () { var row = cb.closest(".ex-entryrow"), inp = row.querySelector(".ex-in"); if (cb.checked) { inp.value = ""; inp.disabled = true; inp.classList.remove("over"); row.classList.remove("over"); row.classList.add("absent"); } else { inp.disabled = false; row.classList.remove("absent"); } });
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
      P.api("marksSaveBulk", [{ className: g.className, entries: entries, enteredBy: st.user, isManagement: !!isMgmt }]).then(function (res) {
        toast((res && res.message) || (res && res.success ? "Saved" : "Failed"), res && res.success ? "ok" : "err");
      }).catch(function (e) { toast("Error: " + (e.message || e), "err"); }).finally(function () { sb.disabled = false; sb.innerHTML = '<i class="material-icons" style="color:#fff;">save</i> Save Marks'; });
    });
  }

  // class grid (admin: academic all-subjects / holistic / body)
  function renderClassGrid(g, hostId, user) {
    var host = $(hostId), locked = g.locked, html = "", cols = [];
    if (g.mode === "academic") cols = g.subjects.map(function (s) { return { key: s, label: s, max: g.max, acad: true }; });
    else if (g.mode === "holistic") cols = g.indicators.map(function (i) { return { key: i.key, label: i.label + " (" + i.max + ")", max: i.max }; });
    else cols = g.metrics.map(function (m) { return { key: m.key, label: m.label, max: "" }; });
    if (locked) html += '<div class="ex-lock"><i class="material-icons">lock</i>Locked — unlock to edit.</div>';
    html += '<div class="ex-note" style="margin-bottom:10px;"><b>' + esc(g.className) + "</b> — " + esc(g.bucket) + " · " + esc(g.componentLabel || (g.mode === "holistic" ? "Holistic Indicators" : "Body Metrics")) + "</div>";
    html += '<div class="ex-tablewrap"><table class="ex-table"><thead><tr><th class="name">Roll · Student</th>';
    cols.forEach(function (c) { html += "<th>" + esc(c.label) + "</th>"; });
    html += "</tr></thead><tbody>";
    var dis = locked ? "disabled" : "";
    g.rows.forEach(function (r) {
      html += '<tr data-id="' + esc(r.id) + '" data-name="' + esc(r.name) + '"><td class="name">' + esc(r.roll) + " · " + esc(r.name) + "</td>";
      cols.forEach(function (c) {
        if (g.mode === "academic") { var cell = r.cells[c.key] || { scored: "", absent: false }; html += '<td class="' + (cell.absent ? "abscell" : "") + '" data-col="' + esc(c.key) + '" data-max="' + c.max + '"><input class="ex-in" type="text" inputmode="decimal" value="' + (cell.absent ? "Ab" : esc(cell.scored)) + '" ' + (cell.absent ? 'data-abs="1"' : "") + " " + dis + "></td>"; }
        else { var v = r.cells[c.key]; v = (v == null ? "" : v); html += '<td data-col="' + esc(c.key) + '"><input class="ex-in" type="number" min="0" ' + (c.max ? 'max="' + c.max + '"' : "") + ' step="0.5" value="' + esc(v) + '" ' + dis + "></td>"; }
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
      if (!confirm((willLock ? "Lock" : "Unlock") + " " + g.className + " · " + g.bucket + " · " + g.component + "?")) return;
      P.api("marksSetLock", [g.className, g.bucket, g.component, willLock, user]).then(function () { $("mkAExam").dispatchEvent(new Event("change")); }).catch(function (e) { toast("Error: " + (e.message || e), "err"); });
    });
  }

  // holistic single parameter entry (teacher)
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

  window.ExamMarks = { mountTeacher: mountTeacher, mountAdmin: mountAdmin, toast: toast };
})();

/* =========================================================================
   student-management.js  —  School ERP CORE · Student Management (v1)
   =========================================================================
   Search-first, operator-grade UI. Plain script; uses the global `Portal`.
   Talks ONLY to the StudentManagement.gs backend (sm* functions):

     smBootstrap                 one call powers the whole page
     smSearchStudents            instant, filtered directory
     smGetStudent                full profile (identity + history + custom + audit)
     smAdmitStudent              new admission (identity + first enrollment)
     smUpdateStudent             edit permanent info
     smUpdateEnrollment          correct one year's class/dates/reason
     smPromoteStudents           bulk promotion -> APPENDS next-year enrollment
     smPromoteClass              promote a whole class
     smLeaveStudent              close current enrollment (leaving event)
     smRejoinStudent             new enrollment for a returning student
     smBulkChangeClass           re-group within a year
     smDeleteStudent             hard remove (single-year students only)
     smAddCustomField            future columns without a redesign
     smExportStudents / smImportStudents

   Design notes:
     * NO sections — classes only, everywhere.
     * A student's class/year is derived from Enrollment History, never stored
       on identity. Promotion, leaving and passed-out are enrollment events.
     * Search is client-driven with debounce; the whole page rarely reloads.
   ========================================================================= */
(function () {
  "use strict";
  var P = window.Portal;
  var session = P.bootPage("studentmgmt");
  if (!session) return;
  var esc = P.esc, $ = function (id) { return document.getElementById(id); };
  var ME = session.name || "Admin";

  injectCss();

  /* ------------------------------- state -------------------------------- */
  var BOOT = null;                 // bootstrap payload
  var STATE = { year: "", cls: "All", status: "All", query: "", rows: [], selected: {} };
  var searchTimer = null;

  render();

  /* ------------------------------- boot --------------------------------- */
  function render() {
    $("view").innerHTML =
      '<div class="sm-head">' +
        '<span class="ex-chip">ERP Core</span>' +
        '<h1 class="sm-title">Student Management</h1>' +
        '<p class="sm-sub">One Student Master for the entire school. Attendance, Examinations and Fees all read from here.</p>' +
      '</div>' +
      '<div id="smKpis" class="sm-kpis"></div>' +
      '<div class="sm-tabs" id="smTabs">' +
        tabBtn("directory", "groups", "Student Directory") +
        tabBtn("rollnumbers", "format_list_numbered", "Edit Roll Numbers") +
        tabBtn("admit", "person_add", "New Admission") +
        tabBtn("promote", "upgrade", "Bulk Promotion") +
        tabBtn("tools", "settings", "Import / Fields") +
      '</div>' +
      '<div id="smDirectory"></div>' +
      '<div id="smRollnumbers" style="display:none"></div>' +
      '<div id="smAdmit" style="display:none"></div>' +
      '<div id="smPromote" style="display:none"></div>' +
      '<div id="smTools" style="display:none"></div>' +
      modalHost();

    Array.prototype.forEach.call($("smTabs").querySelectorAll("button"), function (b) {
      b.addEventListener("click", function () { switchTab(b.getAttribute("data-t")); });
    });

    $("smDirectory").innerHTML = '<div class="sm-empty"><i class="material-icons">sync</i>Loading student master…</div>';
    P.api("smBootstrap", [], { overlay: false }).then(function (boot) {
      BOOT = boot; STATE.year = boot.currentYear;
      renderKpis(boot.counts);
      mountDirectory();
    }).catch(function (e) { $("smDirectory").innerHTML = errBox(e); });
  }

  function tabBtn(id, icon, label) { return '<button data-t="' + id + '" class="' + (id === "directory" ? "active" : "") + '"><i class="material-icons">' + icon + '</i>' + label + '</button>'; }
  function switchTab(t) {
    ["directory", "rollnumbers", "admit", "promote", "tools"].forEach(function (x) { $("sm" + cap(x)).style.display = x === t ? "block" : "none"; });
    Array.prototype.forEach.call($("smTabs").querySelectorAll("button"), function (b) { b.classList.toggle("active", b.getAttribute("data-t") === t); });
    if (t === "rollnumbers" && !$("smRollnumbers").innerHTML) mountRollNumbers();
    if (t === "admit" && !$("smAdmit").innerHTML) mountAdmit();
    if (t === "promote" && !$("smPromote").innerHTML) mountPromote();
    if (t === "tools" && !$("smTools").innerHTML) mountTools();
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function renderKpis(c) {
    c = c || {};
    $("smKpis").innerHTML =
      kpi(c.total, "Total Students", "grey") +
      kpi(c.active, "Active", "green") +
      kpi(c.left, "Left", "orange") +
      kpi(c.passedOut, "Passed Out", "blue") +
      kpi(c.inactive, "Inactive", "grey");
  }
  function kpi(v, l, c) { return '<div class="sm-kpi ' + c + '"><span class="sm-kpi-v">' + (v == null ? "–" : v) + '</span><span class="sm-kpi-l">' + esc(l) + '</span></div>'; }

  /* =========================== DIRECTORY =============================== */
  function mountDirectory() {
    var years = ['<option value="ALL">All Years</option>'].concat((BOOT.years || []).map(function (y) {
      return '<option value="' + esc(y) + '"' + (y === STATE.year ? " selected" : "") + '>' + esc(y) + (y === BOOT.currentYear ? " (current)" : "") + '</option>';
    })).join("");
    var classes = '<option value="All">All Classes</option>' + (BOOT.classes || []).map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join("");
    var statuses = ["All", "Active", "Left", "Passed Out", "Inactive"].map(function (s) { return '<option value="' + s + '">' + s + '</option>'; }).join("");

    $("smDirectory").innerHTML =
      '<div class="sm-searchbar">' +
        '<div class="sm-search"><i class="material-icons">search</i>' +
          '<input id="smSearch" type="text" placeholder="Search name, ID, admission no, father, phone…" autocomplete="off">' +
          '<button id="smClear" class="sm-clear" title="Clear">&times;</button>' +
        '</div>' +
        '<div class="sm-filters">' +
          selector("event", "Year", '<select id="smYear" class="sm-input">' + years + '</select>') +
          selector("groups", "Class", '<select id="smClass" class="sm-input">' + classes + '</select>') +
          selector("filter_list", "Status", '<select id="smStatus" class="sm-input">' + statuses + '</select>') +
        '</div>' +
      '</div>' +
      '<div id="smBulkBar" class="sm-bulkbar" style="display:none"></div>' +
      '<div id="smList"></div>';

    $("smSearch").addEventListener("input", function () { STATE.query = this.value; debounceSearch(); });
    $("smClear").addEventListener("click", function () { $("smSearch").value = ""; STATE.query = ""; loadList(); });
    $("smYear").addEventListener("change", function () { STATE.year = this.value; loadList(); });
    $("smClass").addEventListener("change", function () { STATE.cls = this.value; loadList(); });
    $("smStatus").addEventListener("change", function () { STATE.status = this.value; loadList(); });

    loadList();
  }
  function debounceSearch() { clearTimeout(searchTimer); searchTimer = setTimeout(loadList, 260); }

  function loadList() {
    STATE.selected = {};
    $("smList").innerHTML = '<div class="sm-empty"><i class="material-icons">sync</i>Searching…</div>';
    var filters = { year: STATE.year, cls: STATE.cls, status: STATE.status, query: STATE.query };
    P.api("smSearchStudents", [filters], { overlay: false }).then(function (res) {
      STATE.rows = res.rows || [];
      renderList(res);
      updateBulkBar();
    }).catch(function (e) { $("smList").innerHTML = errBox(e); });
  }

  function renderList(res) {
    if (!res.rows.length) { $("smList").innerHTML = '<div class="sm-empty"><i class="material-icons">search_off</i>No students match this filter.</div>'; return; }
    var head = '<div class="sm-count">' + res.count + ' student' + (res.count === 1 ? '' : 's') +
      (STATE.cls !== "All" ? ' · Class ' + esc(STATE.cls) : '') +
      (STATE.year && STATE.year !== "ALL" ? ' · ' + esc(STATE.year) : ' · all years') +
      (res.truncated ? ' · showing first 1000' : '') + '</div>';

    var rows = res.rows.map(rowHtml).join("");
    $("smList").innerHTML = head +
      '<div class="sm-tablewrap"><table class="sm-table"><thead><tr>' +
        '<th class="sm-chk"><input type="checkbox" id="smAll"></th>' +
        '<th>Student</th><th>Class</th><th>Father</th><th>Phone</th><th>Status</th><th class="sm-actcol">Actions</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';

    $("smAll").addEventListener("change", function () {
      var on = this.checked; STATE.rows.forEach(function (r) { STATE.selected[r.id] = on; });
      Array.prototype.forEach.call($("smList").querySelectorAll(".sm-rowchk"), function (c) { c.checked = on; });
      updateBulkBar();
    });
    Array.prototype.forEach.call($("smList").querySelectorAll(".sm-rowchk"), function (c) {
      c.addEventListener("change", function () { STATE.selected[c.getAttribute("data-id")] = c.checked; updateBulkBar(); });
    });
    wireRowActions();
  }

  function rowHtml(s) {
    return '<tr>' +
      '<td class="sm-chk"><input type="checkbox" class="sm-rowchk" data-id="' + esc(s.id) + '"></td>' +
      '<td data-label="Student"><b class="sm-name" data-open="' + esc(s.id) + '">' + esc(s.name) + '</b>' +
        '<span class="sm-sid">' + esc(s.id) + (s.admissionNo ? ' · Adm ' + esc(s.admissionNo) : '') + '</span></td>' +
      '<td data-label="Class">' + esc(s.className || "—") + '</td>' +
      '<td data-label="Father">' + esc(s.father || "") + '</td>' +
      '<td data-label="Phone">' + esc(s.phone || "") + '</td>' +
      '<td data-label="Status"><span class="sm-pill ' + s.statusClass + '">' + esc(s.status) +
        (s.leavingReason && s.status !== "Active" ? ' · ' + esc(s.leavingReason) : '') + '</span></td>' +
      '<td data-label="Actions" class="sm-acts">' +
        iconBtn("open", s.id, "visibility", "Profile") +
        iconBtn("edit", s.id, "edit", "Edit") +
        iconBtn("status", s.id, "manage_accounts", "Status") +
      '</td></tr>';
  }
  function iconBtn(kind, id, icon, title) { return '<button class="sm-ibtn" data-' + kind + '="' + esc(id) + '" title="' + title + '"><i class="material-icons">' + icon + '</i></button>'; }

  function wireRowActions() {
    q('[data-open]', function (b) { b.addEventListener("click", function () { openProfile(b.getAttribute("data-open")); }); });
    q('[data-edit]', function (b) { b.addEventListener("click", function () { openEdit(b.getAttribute("data-edit")); }); });
    q('[data-status]', function (b) { b.addEventListener("click", function () { openStatus(b.getAttribute("data-status")); }); });
  }
  function q(sel, fn) { Array.prototype.forEach.call($("smList").querySelectorAll(sel), fn); }

  /* ------------------------------ bulk bar ------------------------------ */
  function selectedIds() { return Object.keys(STATE.selected).filter(function (k) { return STATE.selected[k]; }); }
  function updateBulkBar() {
    var ids = selectedIds(), bar = $("smBulkBar");
    if (!ids.length) { bar.style.display = "none"; bar.innerHTML = ""; return; }
    bar.style.display = "flex";
    bar.innerHTML =
      '<span class="sm-bulkcount"><i class="material-icons">check_circle</i>' + ids.length + ' selected</span>' +
      '<div class="sm-bulkacts">' +
        bbtn("bkPromote", "upgrade", "Promote") +
        bbtn("bkClass", "swap_horiz", "Change Class") +
        bbtn("bkLeave", "logout", "Mark Left") +
        bbtn("bkExport", "download", "Export") +
        '<button id="bkClear" class="sm-bbtn ghost"><i class="material-icons">close</i>Clear</button>' +
      '</div>';
    $("bkPromote").addEventListener("click", function () { bulkPromote(ids); });
    $("bkClass").addEventListener("click", function () { bulkChangeClass(ids); });
    $("bkLeave").addEventListener("click", function () { bulkLeave(ids); });
    $("bkExport").addEventListener("click", function () { exportRows(); });
    $("bkClear").addEventListener("click", function () {
      STATE.selected = {}; Array.prototype.forEach.call($("smList").querySelectorAll(".sm-rowchk"), function (c) { c.checked = false; });
      var all = $("smAll"); if (all) all.checked = false; updateBulkBar();
    });
  }
  function bbtn(id, icon, label) { return '<button id="' + id + '" class="sm-bbtn"><i class="material-icons">' + icon + '</i>' + label + '</button>'; }

  function bulkPromote(ids) {
    var toYear = STATE.year && STATE.year !== "ALL" ? BOOT.nextYear : BOOT.nextYear;
    openModal("Promote " + ids.length + " Student(s)",
      '<div class="sm-note"><i class="material-icons">info</i>A NEW enrollment is created for each student in the target year. Their previous years are never touched. Students already in the highest class (' + esc(BOOT.highestClass) + ') are marked <b>Passed Out</b> automatically.</div>' +
      '<div class="sm-row2">' +
        field("To Year", '<input id="pmYear" class="sm-input" value="' + esc(toYear) + '">') +
        field("To Class (blank = auto next class)", '<input id="pmClass" class="sm-input" placeholder="auto">') +
      '</div>', "Promote", function () {
        return P.api("smPromoteStudents", [ids, $("pmYear").value.trim(), $("pmClass").value.trim(), ME], { text: "Promoting…" }).then(function (r) {
          toast("Promoted " + r.promoted + " · Passed Out " + r.passedOut + (r.skipped.length ? " · Skipped " + r.skipped.length : ""), "ok");
          reloadAll();
        });
      });
  }
  function bulkChangeClass(ids) {
    var year = STATE.year && STATE.year !== "ALL" ? STATE.year : BOOT.currentYear;
    openModal("Change Class · " + ids.length + " Student(s)",
      '<div class="sm-note"><i class="material-icons">info</i>Updates the class on each student\'s <b>' + esc(year) + '</b> enrollment (a correction, not a promotion).</div>' +
      field("New Class", '<input id="ccClass" class="sm-input" placeholder="e.g. 6">'), "Update", function () {
        var toClass = $("ccClass").value.trim(); if (!toClass) throw new Error("Enter a class.");
        return P.api("smBulkChangeClass", [ids, year, toClass, ME], { text: "Updating…" }).then(function (r) { toast("Changed " + r.changed + " record(s).", "ok"); reloadAll(); });
      });
  }
  function bulkLeave(ids) {
    openModal("Mark Left · " + ids.length + " Student(s)",
      '<div class="sm-note"><i class="material-icons">info</i>Stamps a leaving event on each student\'s latest open enrollment. History is preserved.</div>' +
      '<div class="sm-row2">' +
        field("Reason", reasonSelect("lvReason")) +
        field("Leaving Date", '<input id="lvDate" class="sm-input" placeholder="dd-mm-yyyy">') +
      '</div>', "Confirm", function () {
        var reason = $("lvReason").value, date = $("lvDate").value.trim();
        return runSequential(ids, function (id) { return P.api("smLeaveStudent", [id, reason, date, ME], { overlay: false }).catch(function () {}); })
          .then(function () { toast("Updated " + ids.length + " student(s).", "ok"); reloadAll(); });
      });
  }
  function runSequential(items, fn) { return items.reduce(function (p, it) { return p.then(function () { return fn(it); }); }, Promise.resolve()); }

  /* ============================ PROFILE ================================= */
  function openProfile(id) {
    openModal("Loading…", '<div class="sm-empty"><i class="material-icons">sync</i>Loading profile…</div>', "", null, false, true);
    P.api("smGetStudent", [id], { overlay: false }).then(function (s) {
      $("smModalTitle").innerHTML = '<i class="material-icons" style="vertical-align:-4px">badge</i> ' + esc(s.name) +
        ' <span class="sm-pill ' + s.statusClass + '" style="margin-left:6px">' + esc(s.status) + '</span>';
      $("smModalBody").innerHTML = profileHtml(s);
      wireProfileTabs();
      $("pfEdit").addEventListener("click", function () { closeModal(); openEdit(id); });
      $("pfAddEnroll").addEventListener("click", function () { openRejoin(s); });
      Array.prototype.forEach.call($("smModalBody").querySelectorAll("[data-edenr]"), function (b) {
        b.addEventListener("click", function () { openEnrollmentEdit(id, b.getAttribute("data-edenr")); });
      });
    }).catch(function (e) { $("smModalBody").innerHTML = errBox(e); });
  }
  function profileHtml(s) {
    var info = [
      ["Student ID", s.id], ["Admission No", s.admissionNo], ["Father", s.father], ["Mother", s.mother],
      ["Phone 1", s.phone1], ["Phone 2", s.phone2], ["Date of Birth", s.dob], ["Gender", s.gender],
      ["Religion", s.religion], ["Category", s.category], ["Blood Group", s.bloodGroup], ["Admission Date", s.admissionDate]
    ];
    (s.customFields || []).forEach(function (f) { info.push([f.name, s.customValues[f.code] || ""]); });

    var profileGrid = '<div class="sm-kv">' + info.map(function (p) {
      return '<div class="sm-kv-row"><span class="sm-kv-k">' + esc(p[0]) + '</span><span class="sm-kv-v">' + (p[1] ? esc(p[1]) : '<i class="sm-muted">—</i>') + '</span></div>';
    }).join("") + '</div>';

    var enrRows = (s.enrollments || []).map(function (e) {
      var badge = e.leavingDate ? '<span class="sm-pill ' + (e.leavingReason === "Passed Out" ? "blue" : "orange") + '">' + esc(e.leavingReason || "Left") + '</span>' : '<span class="sm-pill green">Studying</span>';
      return '<tr><td data-label="Year"><b>' + esc(e.year) + '</b></td><td data-label="Class">' + esc(e.className) + '</td>' +
        '<td data-label="Type">' + esc(e.type) + '</td><td data-label="Joined">' + esc(e.enrollDate || "—") + '</td>' +
        '<td data-label="Left">' + (e.leavingDate ? esc(e.leavingDate) : "—") + '</td><td data-label="Result">' + badge + '</td>' +
        '<td data-label=""><button class="sm-ibtn" data-edenr="' + esc(e.enrollmentId) + '" title="Edit"><i class="material-icons">edit</i></button></td></tr>';
    }).join("") || '<tr><td colspan="7" class="sm-muted" style="text-align:center">No enrollment history.</td></tr>';

    var audit = (s.audit || []).map(function (a) { return '<div class="sm-auditrow"><span>' + esc(a.action) + '</span><span class="sm-muted">' + esc(a.time) + ' · ' + esc(a.user) + '</span></div>'; }).join("") || '<div class="sm-muted">No changes recorded.</div>';

    return '<div class="sm-proftabs" id="smProfTabs">' +
        '<button data-p="prof" class="active">Profile</button>' +
        '<button data-p="enroll">Enrollment History</button>' +
        '<button data-p="audit">Audit</button>' +
      '</div>' +
      '<div data-pane="prof">' +
        '<div class="sm-profbtns"><button id="pfEdit" class="btn btn-outline"><i class="material-icons">edit</i> Edit Details</button></div>' +
        profileGrid +
      '</div>' +
      '<div data-pane="enroll" style="display:none">' +
        '<div class="sm-profbtns"><button id="pfAddEnroll" class="btn btn-outline"><i class="material-icons">add</i> Add / Rejoin Enrollment</button></div>' +
        '<div class="sm-tablewrap"><table class="sm-table"><thead><tr><th>Year</th><th>Class</th><th>Type</th><th>Joined</th><th>Left</th><th>Result</th><th></th></tr></thead><tbody>' + enrRows + '</tbody></table></div>' +
      '</div>' +
      '<div data-pane="audit" style="display:none"><div class="sm-auditbox">' + audit + '</div></div>';
  }
  function wireProfileTabs() {
    Array.prototype.forEach.call($("smProfTabs").querySelectorAll("button"), function (b) {
      b.addEventListener("click", function () {
        Array.prototype.forEach.call($("smProfTabs").querySelectorAll("button"), function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        var p = b.getAttribute("data-p");
        Array.prototype.forEach.call($("smModalBody").querySelectorAll("[data-pane]"), function (pane) { pane.style.display = pane.getAttribute("data-pane") === p ? "block" : "none"; });
      });
    });
  }

  /* ============================ EDIT STUDENT ============================ */
  function openEdit(id) {
    P.api("smGetStudent", [id], { text: "Loading…" }).then(function (s) {
      var cust = (s.customFields || []).map(function (f) {
        return field(f.name, customInput("cf_" + f.code, f, s.customValues[f.code] || ""));
      }).join("");
      openModal("Edit · " + esc(s.name),
        '<div class="sm-row2">' +
          field("Student ID *", inp("edId", s.id)) + field("Admission No", inp("edAdm", s.admissionNo)) +
        '</div><div class="sm-row2">' +
          field("Student Name *", inp("edName", s.name)) + '<div></div>' +
        '</div><div class="sm-row2">' +
          field("Father Name", inp("edFather", s.father)) + field("Mother Name", inp("edMother", s.mother)) +
        '</div><div class="sm-row2">' +
          field("Phone 1", inp("edPhone1", s.phone1)) + field("Phone 2", inp("edPhone2", s.phone2)) +
        '</div><div class="sm-row2">' +
          field("Date of Birth", inp("edDob", s.dob, "dd-mm-yyyy")) + field("Gender", genderSelect("edGender", s.gender)) +
        '</div><div class="sm-row2">' +
          field("Religion", inp("edReligion", s.religion)) + field("Category", inp("edCategory", s.category)) +
        '</div><div class="sm-row2">' +
          field("Blood Group", inp("edBlood", s.bloodGroup)) + field("Admission Date", inp("edAdmDate", s.admissionDate, "dd-mm-yyyy")) +
        '</div>' +
        (cust ? '<div class="sm-sub2">Additional Fields</div>' + cust : ''),
        "Save Changes", function () {
          var patch = {
            name: $("edName").value, admissionNo: $("edAdm").value, father: $("edFather").value, mother: $("edMother").value,
            phone1: $("edPhone1").value, phone2: $("edPhone2").value, dob: $("edDob").value, gender: $("edGender").value,
            religion: $("edReligion").value, category: $("edCategory").value, bloodGroup: $("edBlood").value, admissionDate: $("edAdmDate").value,
            custom: collectCustom(s.customFields)
          };
          if (!patch.name.trim()) throw new Error("Name is required.");
          var newId = $("edId").value.trim();
          if (!newId) throw new Error("Student ID is required.");
          var doSave = function (useId) {
            return P.api("smUpdateStudent", [useId, patch, ME], { text: "Saving…" }).then(function () { toast("Saved.", "ok"); loadList(); });
          };
          if (newId !== id) {
            return P.api("smChangeStudentId", [id, newId, patch.admissionNo, ME], { text: "Updating ID…" }).then(function () { return doSave(newId); });
          }
          return doSave(id);
        });
    }).catch(function (e) { toast(e.message || e, "err"); });
  }

  /* ============================ STATUS MENU ============================ */
  function openStatus(id) {
    P.api("smGetStudent", [id], { text: "Loading…" }).then(function (s) {
      var opts = [];
      if (s.status === "Active") opts = [["leave", "Mark Left", "logout"], ["delete", "Remove", "delete"]];
      else opts = [["rejoin", "Rejoin (new enrollment)", "login"], ["delete", "Remove", "delete"]];
      var btns = opts.map(function (o) { return '<button class="sm-statusbtn ' + (o[0] === "delete" ? "danger" : "") + '" data-do="' + o[0] + '"><i class="material-icons">' + o[2] + '</i>' + esc(o[1]) + '</button>'; }).join("");
      openModal("Status · " + esc(s.name),
        '<div class="sm-note"><i class="material-icons">info</i>Current status is derived from enrollment history: <b>' + esc(s.status) + '</b>' +
        (s.currentClass ? ' · ' + esc(s.currentClass) + ' (' + esc(s.currentYear) + ')' : '') + '.</div>' +
        '<div class="sm-statuslist">' + btns + '</div>', "", null, false, true);
      Array.prototype.forEach.call($("smModalBody").querySelectorAll(".sm-statusbtn"), function (b) {
        b.addEventListener("click", function () { doStatus(b.getAttribute("data-do"), s); });
      });
    }).catch(function (e) { toast(e.message || e, "err"); });
  }
  function doStatus(act, s) {
    if (act === "leave") {
      openModal("Mark Left · " + esc(s.name),
        '<div class="sm-row2">' + field("Reason", reasonSelect("lv1Reason")) + field("Leaving Date", inp("lv1Date", "", "dd-mm-yyyy")) + '</div>',
        "Confirm", function () { return P.api("smLeaveStudent", [s.id, $("lv1Reason").value, $("lv1Date").value.trim(), ME], { text: "Updating…" }).then(function () { toast("Marked Left.", "ok"); reloadAll(); }); });
      return;
    }
    if (act === "rejoin") { openRejoin(s); return; }
    if (act === "delete") {
      openModal("Remove · " + esc(s.name),
        '<div class="sm-note danger"><i class="material-icons">warning</i>This permanently removes the student and their record. It is blocked for students with multi-year history — use <b>Mark Left</b> instead. Continue?</div>',
        "Remove", function () { return P.api("smDeleteStudent", [s.id, ME], { text: "Removing…" }).then(function () { toast("Removed.", "ok"); reloadAll(); }); }, true);
    }
  }
  function openRejoin(s) {
    openModal("Rejoin · " + esc(s.name),
      '<div class="sm-note"><i class="material-icons">info</i>Creates a fresh enrollment (the previous years stay intact).</div>' +
      '<div class="sm-row2">' + field("Academic Year", inp("rjYear", BOOT.currentYear)) + field("Class", inp("rjClass", "", "e.g. 6")) + '</div>',
      "Rejoin", function () { var c = $("rjClass").value.trim(); if (!c) throw new Error("Class is required."); return P.api("smRejoinStudent", [s.id, $("rjYear").value.trim(), c, ME], { text: "Updating…" }).then(function () { toast("Rejoined.", "ok"); reloadAll(); }); });
  }

  /* ======================= ENROLLMENT EDIT ============================= */
  function openEnrollmentEdit(sid, enrollmentId) {
    P.api("smGetStudent", [sid], { text: "Loading…" }).then(function (s) {
      var e = (s.enrollments || []).filter(function (x) { return x.enrollmentId === enrollmentId; })[0];
      if (!e) { toast("Enrollment not found.", "err"); return; }
      openModal("Edit Enrollment · " + esc(e.year),
        '<div class="sm-row2">' + field("Academic Year", inp("enYear", e.year)) + field("Class", inp("enClass", e.className)) + '</div>' +
        '<div class="sm-row2">' + field("Enrollment Type", typeSelect("enType", e.type)) + field("Joined Date", inp("enJoin", e.enrollDate, "dd-mm-yyyy")) + '</div>' +
        '<div class="sm-row2">' + field("Leaving Date (blank = studying)", inp("enLeave", e.leavingDate, "dd-mm-yyyy")) + field("Leaving Reason", reasonSelect("enReason", e.leavingReason)) + '</div>' +
        field("Remarks", inp("enRemarks", e.remarks)),
        "Save", function () {
          var patch = { year: $("enYear").value.trim(), className: $("enClass").value.trim(), type: $("enType").value, enrollDate: $("enJoin").value.trim(), leavingDate: $("enLeave").value.trim(), leavingReason: $("enLeave").value.trim() ? $("enReason").value : "", remarks: $("enRemarks").value };
          return P.api("smUpdateEnrollment", [enrollmentId, patch, ME], { text: "Saving…" }).then(function () { toast("Enrollment updated.", "ok"); closeModal(); openProfile(sid); loadList(); });
        });
    });
  }


  /* ======================== EDIT ROLL NUMBERS ============================ */
  function mountRollNumbers() {
    var years = (BOOT.years || []).map(function (y) {
      return '<option value="' + esc(y) + '"' + (y === BOOT.currentYear ? " selected" : "") + '>' +
        esc(y) + (y === BOOT.currentYear ? " (current)" : "") + '</option>';
    }).join("");
    var classes = '<option value="">Select class</option>' +
      (BOOT.classes || []).map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join("");

    $("smRollnumbers").innerHTML =
      '<div class="sm-card sm-roll-card">' +
        '<h3><i class="material-icons">format_list_numbered</i> Edit Roll Numbers</h3>' +
        '<div class="sm-note"><i class="material-icons">info</i>Select an academic year and class, then enter the roll number for every student. </div>' +
        '<div class="sm-row2">' +
          field("Academic Year", '<select id="rnYear" class="sm-input">' + years + '</select>') +
          field("Class", '<select id="rnClass" class="sm-input">' + classes + '</select>') +
        '</div>' +
        '<div id="rnStatus" class="sm-roll-status"></div>' +
        '<div id="rnList"></div>' +
      '</div>';

    $("rnYear").addEventListener("change", loadRollNumbers);
    $("rnClass").addEventListener("change", loadRollNumbers);
    loadRollNumbers();
  }

  function loadRollNumbers() {
    var year = $("rnYear").value;
    var cls = $("rnClass").value;
    var box = $("rnList"), status = $("rnStatus");
    if (!cls) {
      status.innerHTML = '<div class="sm-note"><i class="material-icons">arrow_upward</i>Select a class to load its students.</div>';
      box.innerHTML = "";
      return;
    }

    status.innerHTML = '<div class="sm-empty sm-roll-loading"><i class="material-icons">sync</i>Loading class roster…</div>';
    box.innerHTML = "";

    P.api("smGetRollNumbers", [year, cls], { overlay: false }).then(function (res) {
      renderRollNumbers(res);
    }).catch(function (e) {
      status.innerHTML = errBox(e);
      box.innerHTML = "";
    });
  }

  function renderRollNumbers(res) {
    var rows = res.rows || [];
    var status = $("rnStatus"), box = $("rnList");

    status.innerHTML =
      '<div class="sm-roll-summary">' +
        '<span><i class="material-icons">groups</i><b>' + rows.length + '</b> student' + (rows.length === 1 ? "" : "s") + '</span>' +
        '<span><i class="material-icons">event</i>' + esc(res.year) + '</span>' +
        '<span><i class="material-icons">school</i>Class ' + esc(res.className) + '</span>' +
      '</div>';

    if (!rows.length) {
      box.innerHTML = '<div class="sm-empty"><i class="material-icons">group_off</i>No students found in this class for the selected year.</div>';
      return;
    }

    box.innerHTML =
      '<div class="sm-roll-tablewrap">' +
        '<table class="sm-table sm-roll-table">' +
          '<thead><tr><th style="width:70px">S.No.</th><th>Student</th><th>Student ID</th><th style="width:180px">Roll Number *</th></tr></thead>' +
          '<tbody>' +
            rows.map(function (r, i) {
              return '<tr>' +
                '<td data-label="S.No.">' + (i + 1) + '</td>' +
                '<td data-label="Student"><b class="sm-name">' + esc(r.name) + '</b></td>' +
                '<td data-label="Student ID"><span class="sm-sid">' + esc(r.studentId) + '</span></td>' +
                '<td data-label="Roll Number">' +
                  '<input type="number" min="1" step="1" inputmode="numeric" class="sm-input sm-roll-input" data-enrollment-id="' + esc(r.enrollmentId) + '" data-student-id="' + esc(r.studentId) + '" data-name="' + esc(r.name) + '" value="' + esc(r.rollNumber || "") + '">' +
                '</td>' +
              '</tr>';
            }).join("") +
          '</tbody>' +
        '</table>' +
      '</div>' +
      '<div class="sm-roll-footer">' +
        '<button id="rnSave" class="btn btn-maroon"><i class="material-icons">save</i> Save Roll Numbers</button>' +
      '</div>';

    $("rnSave").addEventListener("click", saveRollNumbers);
  }

  function saveRollNumbers() {
    var year = $("rnYear").value;
    var cls = $("rnClass").value;
    var inputs = Array.prototype.slice.call($("rnList").querySelectorAll(".sm-roll-input"));
    var missing = [];
    var invalid = [];
    var dup = {};

    inputs.forEach(function (el) {
      var value = el.value.trim();
      var name = el.getAttribute("data-name") || el.getAttribute("data-student-id") || "Student";
      if (!value) {
        missing.push(name);
        return;
      }
      if (!/^\d+$/.test(value) || Number(value) <= 0) {
        invalid.push(name + " (" + value + ")");
        return;
      }
      var n = String(Number(value));
      if (!dup[n]) dup[n] = [];
      dup[n].push(name);
    });

    var duplicateParts = Object.keys(dup).filter(function (n) { return dup[n].length > 1; }).map(function (n) {
      return "Roll " + n + ": " + dup[n].join(" & ");
    });

    if (missing.length || invalid.length || duplicateParts.length) {
      var msg = "Roll number changes were NOT saved.\n\n";
      if (missing.length) msg += "Missing roll number:\n• " + missing.join("\n• ") + "\n\n";
      if (duplicateParts.length) msg += "Duplicate roll number(s):\n• " + duplicateParts.join("\n• ") + "\n\n";
      if (invalid.length) msg += "Invalid roll number:\n• " + invalid.join("\n• ");
      window.alert(msg.trim());
      return;
    }

    var rows = inputs.map(function (el) {
      return {
        enrollmentId: el.getAttribute("data-enrollment-id"),
        studentId: el.getAttribute("data-student-id"),
        name: el.getAttribute("data-name"),
        rollNumber: el.value.trim()
      };
    });

    var btn = $("rnSave");
    btn.disabled = true;
    btn.innerHTML = '<i class="material-icons">sync</i> Saving…';

    P.api("smSaveRollNumbers", [year, cls, rows, ME], { overlay: false }).then(function (r) {
      toast("Saved roll numbers for " + r.count + " student(s).", "ok");
      loadRollNumbers();
    }).catch(function (e) {
      window.alert("Roll numbers were NOT saved.\n\n" + (e && e.message ? e.message : e));
    }).then(function () {
      btn.disabled = false;
      btn.innerHTML = '<i class="material-icons">save</i> Save Roll Numbers';
    });
  }

  /* ============================ NEW ADMISSION ========================== */
  function mountAdmit() {
    var cust = (BOOT.customFields || []).map(function (f) { return field(f.name + (f.required ? " *" : ""), customInput("ad_cf_" + f.code, f, "")); }).join("");
    $("smAdmit").innerHTML =
      '<div class="sm-card">' +
        '<h3><i class="material-icons">person_add</i> New Admission</h3>' +
        '<div class="sm-note"><i class="material-icons">info</i>Enter a Student ID to allot manually (must be unique), or leave blank to auto-generate. The class + year create the first enrollment record.</div>' +
        '<div class="sm-row2">' + field("Student ID (optional)", inp("adId", "", "auto") + '<span id="adIdMsg" class="sm-idmsg"></span>') + field("Admission No", inp("adAdm", "")) + '</div>' +
        '<div class="sm-row2">' + field("Student Name *", inp("adName", "")) + field("Class *", inp("adClass", "", "e.g. 6")) + '</div>' +
        '<div class="sm-row2">' + field("Academic Year", inp("adYear", BOOT.currentYear)) + field("Admission Date", inp("adDate", "", "dd-mm-yyyy")) + '</div>' +
        '<div class="sm-row2">' + field("Father Name *", inp("adFather", "")) + field("Mother Name", inp("adMother", "")) + '</div>' +
        '<div class="sm-row2">' + field("Contact Number *", inp("adPhone1", "")) + field("Phone 2", inp("adPhone2", "")) + '</div>' +
        '<div class="sm-row2">' + field("Date of Birth", inp("adDob", "", "dd-mm-yyyy")) + field("Gender", genderSelect("adGender", "")) + '</div>' +
        '<div class="sm-row2">' + field("Religion", inp("adReligion", "")) + field("Category", inp("adCategory", "")) + '</div>' +
        '<div class="sm-row2">' + field("Blood Group", inp("adBlood", "")) + '<div></div></div>' +
        (cust ? '<div class="sm-sub2">Additional Fields</div>' + cust : '') +
        '<button id="adSave" class="btn btn-maroon" style="margin-top:12px"><i class="material-icons">check_circle</i> Admit Student</button>' +
      '</div>';

    var idBox = $("adId"), msg = $("adIdMsg"), t = null;
    idBox.addEventListener("input", function () {
      var v = idBox.value.trim(); msg.textContent = ""; msg.className = "sm-idmsg"; if (!v) return;
      clearTimeout(t); t = setTimeout(function () {
        P.api("smCheckStudentId", [v], { overlay: false }).then(function (r) {
          if (r.exists) { msg.textContent = "✗ Already allotted"; msg.className = "sm-idmsg bad"; }
          else { msg.textContent = "✓ Available"; msg.className = "sm-idmsg good"; }
        });
      }, 320);
    });
    $("adSave").addEventListener("click", function () {
      var name = $("adName").value.trim();
      var cls = $("adClass").value.trim();
      var father = $("adFather").value.trim();
      var phone1 = $("adPhone1").value.trim();

      if (!name || !father || !phone1 || !cls) {
        toast("Name, father name, contact number and class are required.", "err");
        return;
      }

      var p = {
        studentId: $("adId").value.trim(), admissionNo: $("adAdm").value, name: name, className: cls, year: $("adYear").value.trim(),
        admissionDate: $("adDate").value.trim(), father: father, mother: $("adMother").value,
        phone1: phone1, phone2: $("adPhone2").value, dob: $("adDob").value.trim(), gender: $("adGender").value,
        religion: $("adReligion").value, category: $("adCategory").value, bloodGroup: $("adBlood").value,
        custom: collectCustom(BOOT.customFields, "ad_cf_")
      };
      var b = $("adSave"); b.disabled = true; b.innerHTML = '<i class="material-icons">sync</i> Admitting…';
      P.api("smAdmitStudent", [p, ME], { text: "Admitting…" }).then(function (r) {
        toast("Admitted · " + r.studentId, "ok"); $("smAdmit").innerHTML = ""; mountAdmit();
        P.api("smBootstrap", [], { overlay: false }).then(function (boot) { BOOT = boot; renderKpis(boot.counts); });
      }).catch(function (e) { toast(e.message || e, "err"); b.disabled = false; b.innerHTML = '<i class="material-icons">check_circle</i> Admit Student'; });
    });
  }

  /* ============================ BULK PROMOTION ========================= */
  function mountPromote() {
    var classes = (BOOT.classes || []).map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join("");
    $("smPromote").innerHTML =
      '<div class="sm-card">' +
        '<h3><i class="material-icons">upgrade</i> Promote a Whole Class</h3>' +
        '<div class="sm-note"><i class="material-icons">info</i>Every studying student in the from-class gets a NEW enrollment in the to-year/to-class. Previous years are preserved forever. Students already in the highest class (' + esc(BOOT.highestClass) + ') are marked <b>Passed Out</b> automatically.</div>' +
        '<div class="sm-row2">' + field("From Year", inp("prFromYear", BOOT.currentYear)) + field("From Class", '<select id="prFromClass" class="sm-input"><option value="">Select…</option>' + classes + '</select>') + '</div>' +
        '<div class="sm-row2">' + field("To Year", inp("prToYear", BOOT.nextYear)) + field("To Class (blank = auto next)", inp("prToClass", "", "auto")) + '</div>' +
        '<button id="prGo" class="btn btn-maroon" style="margin-top:12px"><i class="material-icons">upgrade</i> Promote Class</button>' +
      '</div>';
    $("prGo").addEventListener("click", function () {
      var fy = $("prFromYear").value.trim(), fc = $("prFromClass").value, ty = $("prToYear").value.trim(), tc = $("prToClass").value.trim();
      if (!fc || !ty) { toast("Pick a from-class and to-year.", "err"); return; }
      openModal("Confirm Promotion",
        '<p style="line-height:1.6">Promote all studying students in <b>' + esc(fc) + '</b> (' + esc(fy) + ') to <b>' + (tc || "the next class") + '</b> (' + esc(ty) + ')?</p>',
        "Promote", function () {
          return P.api("smPromoteClass", [fy, fc, ty, tc, ME], { text: "Promoting…" }).then(function (r) {
            toast("Matched " + r.matched + " · Promoted " + r.promoted + " · Passed Out " + r.passedOut, "ok"); reloadAll();
          });
        });
    });
  }

  /* ============================ TOOLS: import / fields ================= */
  function mountTools() {
    $("smTools").innerHTML =
      '<div class="sm-card">' +
        '<h3><i class="material-icons">download</i> Export</h3>' +
        '<div class="sm-note"><i class="material-icons">info</i>Exports the current search result as a StudentID-keyed CSV. Edit it offline and import it back — only changed cells are updated.</div>' +
        '<button id="tlExport" class="btn btn-outline"><i class="material-icons">download</i> Export Current View (CSV)</button>' +
      '</div>' +
      '<div class="sm-card">' +
        '<h3><i class="material-icons">upload</i> Import / Update</h3>' +
        '<div class="sm-note"><i class="material-icons">info</i>Paste CSV (with the exported header). Rows with a blank <b>StudentID</b> are treated as new admissions. The <b>Class</b> column updates the enrollment for the chosen year.</div>' +
        '<div class="sm-row2">' + field("Apply Class to Year", inp("imYear", BOOT.currentYear)) + '<div></div></div>' +
        '<textarea id="imData" class="sm-input" style="min-height:140px;font-family:monospace;font-size:12px" placeholder="StudentID,AdmissionNumber,StudentName,FatherName,...&#10;SG260001,,Rahul,Suresh,..."></textarea>' +
        '<button id="tlImport" class="btn btn-maroon" style="margin-top:10px"><i class="material-icons">upload</i> Import</button>' +
        '<div id="imResult" style="margin-top:10px"></div>' +
      '</div>' +
      '<div class="sm-card">' +
        '<h3><i class="material-icons">playlist_add</i> Add a Custom Field</h3>' +
        '<div class="sm-note"><i class="material-icons">info</i>Add future fields (Aadhaar, PEN, EMIS, Scholarship…) without any redesign. They appear instantly in admission, edit and profile.</div>' +
        '<div class="sm-row2">' + field("Field Name", inp("cfName", "", "e.g. Aadhaar Number")) + field("Field Code", inp("cfCode", "", "e.g. AADHAAR")) + '</div>' +
        '<div class="sm-row2">' + field("Type", '<select id="cfType" class="sm-input"><option value="text">Text</option><option value="number">Number</option><option value="date">Date</option><option value="select">Dropdown</option></select>') + field("Options (for Dropdown, | separated)", inp("cfOptions", "")) + '</div>' +
        '<button id="cfAdd" class="btn btn-outline" style="margin-top:6px"><i class="material-icons">add</i> Add Field</button>' +
        '<div id="cfList" class="sm-fieldlist"></div>' +
      '</div>';

    $("tlExport").addEventListener("click", exportRows);
    $("tlImport").addEventListener("click", function () {
      var txt = $("imData").value.trim(); if (!txt) { toast("Paste CSV first.", "err"); return; }
      var records; try { records = parseCsv(txt); } catch (e) { toast("CSV parse error: " + e.message, "err"); return; }
      if (!records.length) { toast("No data rows found.", "err"); return; }
      var b = $("tlImport"); b.disabled = true; b.innerHTML = '<i class="material-icons">sync</i> Importing…';
      P.api("smImportStudents", [records, $("imYear").value.trim(), ME], { text: "Importing…" }).then(function (r) {
        $("imResult").innerHTML = '<div class="sm-note ok"><i class="material-icons">check_circle</i>Created ' + r.created + ' · Updated ' + r.updated + ' · Unchanged ' + r.unchanged + (r.errors.length ? ' · <b style="color:#b91c1c">Errors ' + r.errors.length + '</b>' : '') + '</div>' +
          (r.errors.length ? '<div class="sm-errlist">' + r.errors.map(function (e) { return 'Row ' + e.row + ': ' + esc(e.error); }).join("<br>") + '</div>' : '');
        toast("Import complete.", "ok");
        b.disabled = false; b.innerHTML = '<i class="material-icons">upload</i> Import';
        P.api("smBootstrap", [], { overlay: false }).then(function (boot) { BOOT = boot; renderKpis(boot.counts); });
      }).catch(function (e) { toast(e.message || e, "err"); b.disabled = false; b.innerHTML = '<i class="material-icons">upload</i> Import'; });
    });

    $("cfAdd").addEventListener("click", function () {
      var name = $("cfName").value.trim(), code = $("cfCode").value.trim();
      if (!name || !code) { toast("Field name and code are required.", "err"); return; }
      var field2 = { name: name, code: code, type: $("cfType").value, options: $("cfOptions").value.split("|").map(function (x) { return x.trim(); }).filter(Boolean) };
      P.api("smAddCustomField", [field2, ME], { text: "Adding…" }).then(function () {
        toast("Field added.", "ok"); $("cfName").value = ""; $("cfCode").value = ""; $("cfOptions").value = "";
        P.api("smBootstrap", [], { overlay: false }).then(function (boot) { BOOT = boot; renderFieldList(); });
      }).catch(function (e) { toast(e.message || e, "err"); });
    });
    renderFieldList();
  }
  function renderFieldList() {
    var box = $("cfList"); if (!box) return;
    var fields = (BOOT.customFields || []);
    box.innerHTML = fields.length ? '<div class="sm-sub2">Existing Fields</div>' + fields.map(function (f) { return '<span class="sm-fieldchip"><i class="material-icons">label</i>' + esc(f.name) + ' <em>(' + esc(f.code) + ' · ' + esc(f.type) + ')</em></span>'; }).join("") : '';
  }

  /* ============================ EXPORT helper ========================== */
  function exportRows() {
    var filters = { year: STATE.year, cls: STATE.cls, status: STATE.status, query: STATE.query };
    P.api("smExportStudents", [filters], { text: "Preparing export…" }).then(function (res) {
      var csv = res.rows.map(function (r) { return r.map(csvCell).join(","); }).join("\r\n");
      var blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
      var url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = "students_" + (STATE.year || "all") + "_" + Date.now() + ".csv";
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      toast("Exported " + (res.rows.length - 1) + " student(s).", "ok");
    }).catch(function (e) { toast(e.message || e, "err"); });
  }
  function csvCell(v) { v = v == null ? "" : String(v); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function parseCsv(text) {
    var lines = text.replace(/\r\n/g, "\n").split("\n").filter(function (l) { return l.trim() !== ""; });
    if (lines.length < 2) return [];
    var header = splitCsvLine(lines[0]);
    return lines.slice(1).map(function (ln) { var cells = splitCsvLine(ln), o = {}; header.forEach(function (h, i) { o[h.trim()] = cells[i] !== undefined ? cells[i] : ""; }); return o; });
  }
  function splitCsvLine(line) {
    var out = [], cur = "", inQ = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (inQ) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; } else cur += ch; }
      else { if (ch === '"') inQ = true; else if (ch === ",") { out.push(cur); cur = ""; } else cur += ch; }
    }
    out.push(cur); return out;
  }

  /* ============================ SHARED helpers ========================= */
  function reloadAll() { P.api("smBootstrap", [], { overlay: false }).then(function (boot) { BOOT = boot; renderKpis(boot.counts); loadList(); }); }
  function selector(icon, label, inner) { return '<div class="smart-selector"><label class="sm-lbl"><i class="material-icons">' + icon + '</i>' + label + '</label>' + inner + '</div>'; }
  function field(label, inner) { return '<div class="sm-field"><label class="sm-lbl">' + label + '</label>' + inner + '</div>'; }
  function inp(id, val, ph) { return '<input id="' + id + '" class="sm-input" value="' + esc(val || "") + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + '>'; }
  function genderSelect(id, val) { return '<select id="' + id + '" class="sm-input"><option value="">—</option>' + (BOOT.genders || ["Male", "Female", "Other"]).map(function (g) { return '<option' + (g === val ? " selected" : "") + '>' + g + '</option>'; }).join("") + '</select>'; }
  function reasonSelect(id, val) { return '<select id="' + id + '" class="sm-input">' + (BOOT.leavingReasons || []).map(function (r) { return '<option' + (r === val ? " selected" : "") + '>' + r + '</option>'; }).join("") + '</select>'; }
  function typeSelect(id, val) { return '<select id="' + id + '" class="sm-input">' + ["Admission", "Promotion", "Rejoin", "Migrated"].map(function (t) { return '<option' + (t === val ? " selected" : "") + '>' + t + '</option>'; }).join("") + '</select>'; }
  function customInput(id, f, val) {
    if (f.type === "select") return '<select id="' + id + '" class="sm-input"><option value="">—</option>' + (f.options || []).map(function (o) { return '<option' + (o === val ? " selected" : "") + '>' + esc(o) + '</option>'; }).join("") + '</select>';
    var type = f.type === "number" ? "number" : "text";
    return '<input id="' + id + '" type="' + type + '" class="sm-input" value="' + esc(val || "") + '"' + (f.type === "date" ? ' placeholder="dd-mm-yyyy"' : '') + '>';
  }
  function collectCustom(fields, prefix) { prefix = prefix || "cf_"; var out = {}; (fields || []).forEach(function (f) { var el = $(prefix + f.code); if (el) out[f.code] = el.value; }); return out; }
  function errBox(e) { return '<div class="sm-empty"><i class="material-icons">error_outline</i>' + esc(e && e.message ? e.message : e) + '</div>'; }

  /* ------------------------------- modal -------------------------------- */
  function modalHost() {
    return '<div class="sm-modal" id="smModal"><div class="sm-modal-box">' +
      '<div class="sm-modal-head"><span id="smModalTitle"></span><button id="smModalX">&times;</button></div>' +
      '<div class="sm-modal-body" id="smModalBody"></div>' +
      '<div class="sm-modal-err" id="smModalErr"></div>' +
      '<div class="sm-modal-foot"><button class="btn btn-outline" id="smModalCancel">Cancel</button><button class="btn btn-maroon" id="smModalOk"></button></div>' +
    '</div></div>';
  }
  var modalRunner = null;
  function openModal(title, bodyHtml, okLabel, onOk, danger, hideOk) {
    var host = $("smModal");
    $("smModalTitle").innerHTML = title; $("smModalBody").innerHTML = bodyHtml;
    var err = $("smModalErr"); err.style.display = "none";
    var ok = $("smModalOk"); ok.className = "btn " + (danger ? "btn-danger" : "btn-maroon");
    ok.style.display = hideOk ? "none" : ""; ok.innerHTML = okLabel || ""; ok.disabled = false;
    modalRunner = onOk; host.classList.add("show");
    $("smModalX").onclick = closeModal; $("smModalCancel").onclick = closeModal;
    host.onclick = function (e) { if (e.target === host) closeModal(); };
    ok.onclick = function () {
      err.style.display = "none"; var r;
      try { r = modalRunner ? modalRunner() : null; } catch (ex) { err.textContent = ex.message || String(ex); err.style.display = "block"; return; }
      if (r && r.then) { ok.disabled = true; var orig = ok.innerHTML; ok.innerHTML = '<i class="material-icons">sync</i> Working…'; r.then(function () { closeModal(); }).catch(function (ex) { err.textContent = ex.message || String(ex); err.style.display = "block"; ok.disabled = false; ok.innerHTML = orig; }); }
      else closeModal();
    };
  }
  function closeModal() { var h = $("smModal"); if (h) h.classList.remove("show"); }

  function toast(msg, kind) {
    var t = $("smToast"); if (!t) { t = document.createElement("div"); t.id = "smToast"; document.body.appendChild(t); }
    var icon = kind === "err" ? "error" : (kind === "ok" ? "check_circle" : "info");
    t.className = ""; if (kind) t.classList.add(kind);
    t.innerHTML = '<i class="material-icons">' + icon + '</i>' + esc(msg);
    void t.offsetWidth; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove("show"); }, 2800);
  }

  /* ------------------------------- css ---------------------------------- */
  function injectCss() {
    if ($("sm-css")) return;
    var css =
    ".sm-head{margin-bottom:12px}.sm-title{font-size:23px;color:var(--maroon);margin:4px 0}.sm-sub{color:var(--text-muted);font-size:13px;max-width:640px}" +
    ".ex-chip{font-size:11px;font-weight:700;color:var(--maroon);background:var(--primary-light);padding:3px 10px;border-radius:999px}" +
    ".sm-kpis{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0}.sm-kpi{flex:1 1 120px;background:#fff;border:1px solid var(--border);border-radius:14px;padding:12px 14px;box-shadow:var(--shadow-sm)}.sm-kpi-v{display:block;font-size:22px;font-weight:800;color:var(--text-main)}.sm-kpi-l{font-size:11.5px;font-weight:700;color:var(--text-muted)}.sm-kpi.green .sm-kpi-v{color:#059669}.sm-kpi.orange .sm-kpi-v{color:#d97706}.sm-kpi.blue .sm-kpi-v{color:#2563eb}" +
    ".sm-tabs{display:inline-flex;flex-wrap:wrap;gap:6px;background:#f1f5f9;border:1px solid var(--border);border-radius:999px;padding:4px;margin:0 0 18px}.sm-tabs button{border:none;background:transparent;color:var(--text-muted);font-weight:700;font-size:13px;padding:9px 15px;border-radius:999px;cursor:pointer;display:inline-flex;align-items:center;gap:6px}.sm-tabs button i{font-size:17px}.sm-tabs button.active{background:var(--maroon);color:#fff}" +
    ".sm-roll-card{max-width:980px}.sm-roll-status{margin-bottom:12px}.sm-roll-summary{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 12px}.sm-roll-summary span{display:inline-flex;align-items:center;gap:5px;background:#f8fafc;border:1px solid var(--border);border-radius:999px;padding:6px 11px;font-size:12px;color:var(--text-muted)}.sm-roll-summary i{font-size:16px;color:var(--maroon)}.sm-roll-tablewrap{overflow:auto;background:#fff;border:1px solid var(--border);border-radius:14px}.sm-roll-table th:last-child,.sm-roll-table td:last-child{width:180px}.sm-roll-input{max-width:150px;text-align:center;font-weight:700}.sm-roll-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px}.sm-roll-footer .sm-note{margin:0;flex:1}.sm-roll-loading{padding:20px}@media(max-width:640px){.sm-roll-footer{flex-direction:column;align-items:stretch}.sm-roll-footer .btn{justify-content:center}.sm-roll-input{max-width:none}.sm-roll-card{padding:12px}}"+
    ".sm-searchbar{background:#fff;border:1px solid var(--border);border-radius:16px;padding:14px;box-shadow:var(--shadow-sm);margin-bottom:14px}" +
    ".sm-search{display:flex;align-items:center;gap:8px;background:#f8fafc;border:1px solid var(--border);border-radius:12px;padding:8px 12px}.sm-search i{color:var(--maroon)}.sm-search input{flex:1;border:none;background:transparent;font:inherit;font-size:15px;outline:none}.sm-clear{border:none;background:#e2e8f0;color:#475569;border-radius:50%;width:24px;height:24px;cursor:pointer;font-size:16px;line-height:1}" +
    ".sm-filters{display:flex;flex-wrap:wrap;gap:12px;margin-top:12px}.smart-selector{flex:1 1 160px;display:flex;flex-direction:column;gap:4px}" +
    ".sm-lbl{font-size:12px;font-weight:700;color:var(--text-muted);display:flex;align-items:center;gap:5px}.sm-lbl i{font-size:15px}" +
    ".sm-input{width:100%;padding:9px 11px;border:1px solid var(--border);border-radius:10px;font:inherit;background:#fff}" +
    ".sm-field{display:flex;flex-direction:column;gap:4px;margin-bottom:10px}.sm-row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media(max-width:520px){.sm-row2{grid-template-columns:1fr}}" +
    ".sm-sub2{font-size:12px;font-weight:800;color:var(--maroon);margin:8px 0 6px;text-transform:uppercase;letter-spacing:.5px}" +
    ".sm-bulkbar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;background:var(--maroon);color:#fff;border-radius:12px;padding:10px 14px;margin-bottom:12px}.sm-bulkcount{font-weight:700;display:flex;align-items:center;gap:6px}.sm-bulkcount i{font-size:18px}.sm-bulkacts{display:flex;flex-wrap:wrap;gap:6px}.sm-bbtn{border:none;background:rgba(255,255,255,.16);color:#fff;font-weight:700;font-size:12.5px;padding:8px 12px;border-radius:9px;cursor:pointer;display:inline-flex;align-items:center;gap:5px}.sm-bbtn i{font-size:16px}.sm-bbtn.ghost{background:transparent;border:1px solid rgba(255,255,255,.4)}.sm-bbtn:hover{background:rgba(255,255,255,.28)}" +
    ".sm-count{font-size:12.5px;color:var(--text-muted);font-weight:700;margin-bottom:8px}" +
    ".sm-tablewrap{overflow:auto;background:#fff;border:1px solid var(--border);border-radius:14px}.sm-table{width:100%;border-collapse:collapse}.sm-table th,.sm-table td{padding:10px 12px;font-size:13px;text-align:left;border-bottom:1px solid #f1f2f6}.sm-table th{background:#faf5f5;color:var(--maroon);font-size:11.5px;text-transform:uppercase;letter-spacing:.4px;position:sticky;top:0}.sm-chk{width:36px}.sm-actcol{width:120px}" +
    ".sm-name{color:var(--maroon);cursor:pointer}.sm-name:hover{text-decoration:underline}.sm-sid{display:block;font-size:10.5px;color:#94a3b8;font-weight:600}" +
    ".sm-pill{display:inline-block;font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px}.sm-pill.green{background:#ecfdf5;color:#059669}.sm-pill.orange{background:#fff7ed;color:#d97706}.sm-pill.blue{background:#eff6ff;color:#2563eb}.sm-pill.grey{background:#f1f5f9;color:#64748b}" +
    ".sm-acts{display:flex;gap:4px}.sm-ibtn{border:1px solid var(--border);background:#fff;border-radius:8px;padding:5px 7px;cursor:pointer;color:var(--text-muted)}.sm-ibtn i{font-size:17px;display:block}.sm-ibtn:hover{background:var(--primary-light);color:var(--maroon)}" +
    ".sm-empty{text-align:center;padding:38px 20px;color:var(--text-muted);font-weight:600;background:#fff;border:1px dashed var(--border);border-radius:14px}.sm-empty i{font-size:38px;color:var(--maroon);display:block;margin-bottom:8px}" +
    ".sm-card{background:#fff;border:1px solid var(--border);border-radius:16px;padding:16px 18px;box-shadow:var(--shadow-sm);max-width:820px;margin-bottom:16px}.sm-card h3{font-size:15px;color:var(--maroon);margin:0 0 12px;display:flex;align-items:center;gap:8px}.sm-card h3 i{font-size:19px}" +
    ".sm-note{display:flex;gap:8px;align-items:flex-start;background:var(--primary-light);border:1px solid var(--border);border-radius:10px;padding:10px 12px;font-size:12.5px;margin-bottom:12px;line-height:1.5}.sm-note i{color:var(--maroon);font-size:18px;flex:0 0 auto}.sm-note.ok{background:#ecfdf5;border-color:#a7f3d0}.sm-note.ok i{color:#059669}.sm-note.danger{background:#fef2f2;border-color:#fecaca}.sm-note.danger i{color:#dc2626}" +
    ".sm-idmsg{display:block;font-size:11.5px;font-weight:700;margin-top:4px;min-height:14px}.sm-idmsg.good{color:#047857}.sm-idmsg.bad{color:#b91c1c}" +
    ".sm-kv{display:grid;grid-template-columns:1fr 1fr;gap:0 18px}@media(max-width:520px){.sm-kv{grid-template-columns:1fr}}.sm-kv-row{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #f1f2f6}.sm-kv-k{font-size:12px;color:var(--text-muted);font-weight:700}.sm-kv-v{font-size:13px;font-weight:600;text-align:right}.sm-muted{color:#94a3b8}" +
    ".sm-proftabs{display:inline-flex;gap:4px;background:#f1f5f9;border-radius:10px;padding:3px;margin-bottom:14px}.sm-proftabs button{border:none;background:transparent;font-weight:700;font-size:12.5px;padding:7px 13px;border-radius:8px;cursor:pointer;color:var(--text-muted)}.sm-proftabs button.active{background:var(--maroon);color:#fff}" +
    ".sm-profbtns{margin-bottom:12px}.sm-auditbox{max-height:320px;overflow:auto}.sm-auditrow{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #f1f2f6;font-size:12.5px}" +
    ".sm-statuslist{display:flex;flex-direction:column;gap:8px}.sm-statusbtn{display:flex;align-items:center;gap:8px;border:1px solid var(--border);background:#fff;border-radius:10px;padding:11px 14px;font-weight:700;font-size:13.5px;cursor:pointer;text-align:left}.sm-statusbtn i{font-size:19px;color:var(--maroon)}.sm-statusbtn:hover{background:var(--primary-light)}.sm-statusbtn.danger{color:#b91c1c}.sm-statusbtn.danger i{color:#b91c1c}" +
    ".sm-fieldlist{margin-top:12px}.sm-fieldchip{display:inline-flex;align-items:center;gap:5px;background:#f8fafc;border:1px solid var(--border);border-radius:999px;padding:5px 12px;font-size:12px;font-weight:600;margin:4px 6px 0 0}.sm-fieldchip i{font-size:15px;color:var(--maroon)}.sm-fieldchip em{color:var(--text-muted);font-style:normal;font-size:11px}" +
    ".sm-errlist{font-size:12px;color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:8px 10px;margin-top:6px;max-height:180px;overflow:auto}" +
    ".btn{border:none;border-radius:10px;padding:10px 16px;font-weight:700;font-size:13.5px;cursor:pointer;display:inline-flex;align-items:center;gap:6px}.btn-maroon{background:var(--maroon);color:#fff}.btn-outline{background:#fff;border:1px solid var(--border);color:var(--text-main)}.btn-danger{background:#dc2626;color:#fff}.btn i{font-size:18px}.btn:disabled{opacity:.6;cursor:default}" +
    ".sm-modal{position:fixed;inset:0;background:rgba(15,23,42,.45);display:none;align-items:center;justify-content:center;z-index:9999;padding:16px}.sm-modal.show{display:flex}.sm-modal-box{background:#fff;border-radius:16px;max-width:640px;width:100%;max-height:90vh;display:flex;flex-direction:column}.sm-modal-head{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid var(--border);font-weight:700}.sm-modal-head button{border:none;background:none;font-size:24px;cursor:pointer;line-height:1}.sm-modal-body{padding:18px;overflow:auto}.sm-modal-err{display:none;color:var(--danger,#dc2626);font-weight:600;font-size:13px;padding:0 18px}.sm-modal-foot{display:flex;justify-content:flex-end;gap:8px;padding:14px 18px;border-top:1px solid var(--border)}" +
    "#smToast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%) translateY(20px);z-index:99999;background:#14171f;color:#fff;padding:12px 18px;border-radius:12px;font-size:14px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.25);display:flex;align-items:center;gap:8px;opacity:0;pointer-events:none;transition:all .25s;max-width:88vw}#smToast.show{opacity:1;transform:translateX(-50%) translateY(0)}#smToast.ok{background:#065f46}#smToast.err{background:#991b1b}#smToast i{font-size:18px}" +
    "@media(max-width:640px){.sm-table thead{display:none}.sm-table,.sm-table tbody,.sm-table tr,.sm-table td{display:block;width:100%}.sm-table tr{border:1px solid var(--border);border-radius:12px;margin:10px;padding:6px 12px}.sm-table td{display:flex;justify-content:space-between;gap:14px;padding:8px 0;border-top:1px solid #f1f2f6;text-align:right}.sm-table td::before{content:attr(data-label);font-weight:700;color:var(--text-muted);text-align:left}.sm-table tr td:first-child{border-top:none}.sm-chk,.sm-actcol{width:auto}.sm-acts{justify-content:flex-end}}";
    var st = document.createElement("style"); st.id = "sm-css"; st.textContent = css; document.head.appendChild(st);
  }
})();

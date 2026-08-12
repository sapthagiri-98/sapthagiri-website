/* =====================================================================
   user-management.js  —  Users Management page controller.   (v3)
   Uses window.Portal (bootPage/api/session/esc helpers).
   Backend: users-api  (routed automatically by config.js by fn name).

   v3 changes (FULL replacement — paste the whole file):
     - Added Working Days checkboxes (Shift tab): setWorkDays()/collectWorkDays()
       read/write payload.workDays, so e.g. Srinivas Pulloori can be limited
       to Monday+Thursday and Staff Attendance stops expecting him daily.
     - REMOVED the "Sync Phones" button entirely (umSync) — phones/names are
       now resolved live server-side; there's nothing left to sync.
   ===================================================================== */
(function () {
  "use strict";
  // Fallback catalog (used if userModuleKeys() is unavailable). Keys MUST
  // match portal.js MENU[].perm and users-api MODULE_KEYS.
  var MODULES_FALLBACK = [
    { key: "Daily Student Attendance", group: "teacher" },
    { key: "Digital Homework Diary",   group: "teacher" },
    { key: "Syllabus Tracker",         group: "teacher" },
    { key: "My Attendance Log",        group: "teacherOnly" },
    { key: "Examinations Tracker",     group: "teacherOnly" },
    { key: "Staff Attendance Tracker", group: "mgmt" },
    { key: "Holidays Management",      group: "mgmt" },
    { key: "Examinations Management",  group: "mgmt" },
    { key: "Timetable Management",     group: "mgmt" },
    { key: "Student Management",       group: "mgmt" },
    { key: "Fee Ledger Database",      group: "mgmt" },
    { key: "Fee Management System",    group: "mgmt" },
    { key: "Management Dashboard",     group: "mgmt" },
    { key: "User Management",          group: "mgmt" }
  ];
  var DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5, 6];   // Mon-Sat

  var P = window.Portal;
  var esc = (P && P.esc) ? P.esc : function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  };
  function toast(msg, ok) {
    if (P && P.toast) P.toast(msg, ok === false ? "error" : "success");
    else alert(msg);
  }
  async function api(fn, args) { return await P.api(fn, args || []); }
  var MODULES = MODULES_FALLBACK, USERS = [], EDIT_ID = null;
  function $(id) { return document.getElementById(id); }

  // ------- effective permission (explicit override else role default) -------
  function effective(user, mod) {
    var p = user.permissions || {};
    if (Object.prototype.hasOwnProperty.call(p, mod.key)) return !!p[mod.key];
    var isMgmt = String(user.role) === "Management";
    if (mod.group === "mgmt") return isMgmt;
    if (mod.group === "teacherOnly") return !isMgmt;
    return true;
  }

  // ------- working days helpers -------
  function setWorkDays(days) {
    var selected = Array.isArray(days) ? days.map(Number) : DEFAULT_WORK_DAYS;
    $("fWorkDays").querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
      cb.checked = selected.indexOf(Number(cb.value)) >= 0;
    });
  }
  function collectWorkDays() {
    var out = [];
    $("fWorkDays").querySelectorAll('input[type="checkbox"]:checked').forEach(function (cb) {
      out.push(Number(cb.value));
    });
    return out;
  }
  function workDaysLabel(u) {
    var names = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    var wd = Array.isArray(u.workDays) ? u.workDays.slice().sort() : DEFAULT_WORK_DAYS;
    if (wd.length === 6 && wd.indexOf(0) < 0) return "Mon–Sat";
    if (wd.length === 7) return "Every day";
    if (!wd.length) return "—";
    return wd.map(function (d) { return names[d]; }).join(", ");
  }

  // ------------------------------ list view ------------------------------
  function shiftLabel(u) {
    if (!u.s1In) return "—";
    var a = String(u.s1In).slice(0, 5) + "–" + String(u.s1Out || "").slice(0, 5);
    if (String(u.shiftType) === "DUAL" && u.s2In)
      a += " · " + String(u.s2In).slice(0, 5) + "–" + String(u.s2Out || "").slice(0, 5);
    return a;
  }
  function rolePill(role) {
    var c = role === "Management" ? "mgmt" : (role === "DTP" ? "dtp" : "role");
    return '<span class="um-pill ' + c + '">' + esc(role) + "</span>";
  }
  function ic(icon, title, act, id) {
    return '<button type="button" class="um-ic" title="' + esc(title) + '" data-act="' + act + '" data-id="' + esc(id) + '">' +
      '<span class="material-icons-round">' + icon + "</span></button>";
  }
  function render() {
    var q = ($("umSearch").value || "").toLowerCase().trim();
    var rows = USERS.filter(function (u) {
      if (!q) return true;
      return (u.name + " " + u.role + " " + (u.biometricCode || "") + " " + (u.whatsapp || ""))
        .toLowerCase().indexOf(q) >= 0;
    });
    var host = $("umList");
    if (!rows.length) { host.innerHTML = '<div class="um-empty">No users match.</div>'; return; }
    var body = rows.map(function (u) {
      return "<tr>" +
        '<td><div class="um-name">' + esc(u.name) + "</div>" +
          '<div class="um-sub">' + (u.biometricCode ? "Emp " + esc(u.biometricCode) : "No biometric") +
          (u.whatsapp ? " · " + esc(u.whatsapp) : "") + "</div></td>" +
        "<td>" + rolePill(u.role) + "</td>" +
        "<td>" + esc(u.campus) + "</td>" +
        '<td class="um-sub">' + esc(shiftLabel(u)) + '<br><span style="color:#94a3b8">' + esc(workDaysLabel(u)) + "</span></td>" +
        "<td>" + (u.permissionCount ? u.permissionCount + " set" : "<span class='um-sub'>role default</span>") + "</td>" +
        "<td>" + (u.active ? '<span class="um-pill on">Active</span>' : '<span class="um-pill off">Inactive</span>') + "</td>" +
        '<td><div class="um-actions">' +
          ic("edit", "Edit", "edit", u.id) +
          ic("password", "Reset password", "pw", u.id) +
          ic(u.active ? "block" : "check_circle", u.active ? "Deactivate" : "Reactivate", u.active ? "off" : "on", u.id) +
        "</div></td></tr>";
    }).join("");
    host.innerHTML =
      '<table class="um-table"><thead><tr>' +
      "<th>Name</th><th>Role</th><th>Campus</th><th>Shift / Days</th><th>Modules</th><th>Status</th><th></th>" +
      "</tr></thead><tbody>" + body + "</tbody></table>";
    // NOTE: no per-button listeners here — a single delegated listener on
    // #umList (wired once in boot) handles every click, surviving re-renders.
  }
  function onAction(act, id) {
    var u = USERS.filter(function (x) { return String(x.id) === String(id); })[0];
    if (!u) return;
    if (act === "edit") return openEditor(u);
    if (act === "pw")   return resetPw(u);
    if (act === "off")  return setActive(u, false);
    if (act === "on")   return setActive(u, true);
  }
  async function setActive(u, active) {
    if (active === false && !confirm('Deactivate "' + u.name + '"? They will no longer be able to log in.')) return;
    try {
      await api(active ? "userReactivate" : "userDeactivate", [u.id]);
      toast(active ? "Reactivated" : "Deactivated");
      await load();
    } catch (e) { toast(String(e && e.message || e), false); }
  }
  async function resetPw(u) {
    var pw = prompt('New login password for "' + u.name + '":');
    if (pw == null) return;
    if (!pw.trim()) return toast("Password cannot be blank.", false);
    try { await api("userResetPassword", [u.id, pw.trim()]); toast("Password updated"); }
    catch (e) { toast(String(e && e.message || e), false); }
  }

  // ------------------------------ editor ------------------------------
  function openEditor(u) {
    EDIT_ID = u ? u.id : null;
    $("umModalTitle").textContent = u ? "Edit User" : "Add User";
    $("fName").value  = u ? u.name : "";
    $("fRole").value  = u ? u.role : "Teacher";
    $("fPass").value  = "";
    $("fPass").placeholder = u ? "Leave blank to keep current" : "Set login password";
    $("fCampus").value = u ? u.campus : "Both";
    $("fWhats").value = u ? (u.whatsapp || "") : "";
    $("fBio").value   = u ? (u.biometricCode || "") : "";
    $("fShift").value = u ? (u.shiftType || "SINGLE") : "SINGLE";
    $("fSunday").value = u ? (u.sunday || "Off") : "Off";
    $("fS1in").value  = u ? String(u.s1In || "").slice(0, 5) : "";
    $("fS1out").value = u ? String(u.s1Out || "").slice(0, 5) : "";
    $("fS2in").value  = u ? String(u.s2In || "").slice(0, 5) : "";
    $("fS2out").value = u ? String(u.s2Out || "").slice(0, 5) : "";
    $("fGrace").value = u ? (u.grace != null ? u.grace : 5) : 5;
    setWorkDays(u ? u.workDays : DEFAULT_WORK_DAYS);
    syncDual();
    buildModules(u);
    switchTab("account");
    $("umModal").style.display = "flex";
  }
  function closeEditor() { $("umModal").style.display = "none"; EDIT_ID = null; }
  function buildModules(u) {
    var host = $("fModules");
    var groups = { teacher: "Teacher tools", teacherOnly: "Teacher-only", mgmt: "Management" };
    var html = "", lastGroup = "";
    MODULES.forEach(function (m) {
      if (m.group !== lastGroup) { html += '<div class="um-modhdr">' + groups[m.group] + "</div>"; lastGroup = m.group; }
      var on = u ? effective(u, m) : (m.group === "mgmt" ? false : m.group === "teacher");
      html += '<label class="um-mod"><input type="checkbox" data-key="' + esc(m.key) + '" ' +
        (on ? "checked" : "") + '/> ' + esc(m.key) +
        "<small>" + (m.group === "mgmt" ? "admin" : m.group === "teacherOnly" ? "staff" : "core") + "</small></label>";
    });
    host.innerHTML = html;
  }
  function collectPermissions() {
    var p = {};
    $("fModules").querySelectorAll("input[data-key]").forEach(function (cb) { p[cb.dataset.key] = !!cb.checked; });
    return p;
  }
  function syncDual() {
    var dual = $("fShift").value === "DUAL";
    $("dualIn").classList.toggle("show", dual);
    $("dualOut").classList.toggle("show", dual);
  }
  function switchTab(name) {
    document.querySelectorAll(".um-tab").forEach(function (t) { t.classList.toggle("active", t.dataset.pane === name); });
    document.querySelectorAll(".um-pane").forEach(function (p) { p.classList.toggle("active", p.dataset.pane === name); });
  }
  async function save() {
    var payload = {
      name: $("fName").value.trim(),
      role: $("fRole").value,
      campus: $("fCampus").value,
      whatsapp: $("fWhats").value.trim(),
      biometricCode: $("fBio").value.trim(),
      shiftType: $("fShift").value,
      sunday: $("fSunday").value,
      s1In: $("fS1in").value, s1Out: $("fS1out").value,
      s2In: $("fS2in").value, s2Out: $("fS2out").value,
      grace: Number($("fGrace").value) || 0,
      workDays: collectWorkDays(),
      permissions: collectPermissions()
    };
    if ($("fPass").value.trim()) payload.password = $("fPass").value.trim();
    if (!payload.name) return toast("Name is required.", false);
    try {
      if (EDIT_ID) { await api("userUpdate", [EDIT_ID, payload]); toast("User updated"); }
      else { await api("userCreate", [payload]); toast("User created"); }
      closeEditor();
      await load();
    } catch (e) { toast(String(e && e.message || e), false); }
  }
  // ------------------------------ wiring ------------------------------
  async function load() {
    try { USERS = await api("usersList", []); render(); }
    catch (e) {
      $("umList").innerHTML =
        '<div class="um-empty">Could not load users.<br><span class="um-sub">' + esc(String(e && e.message || e)) + "</span></div>";
    }
  }
  async function boot() {
    if (P && P.bootPage) { try { P.bootPage("usermgmt"); } catch (_e) {} }
    try { MODULES = await api("userModuleKeys", []); } catch (_e) { MODULES = MODULES_FALLBACK; }
    // Delegated click handler — survives every table re-render.
    $("umList").addEventListener("click", function (ev) {
      var btn = ev.target.closest ? ev.target.closest(".um-ic") : null;
      if (!btn) return;
      ev.preventDefault();
      onAction(btn.getAttribute("data-act"), btn.getAttribute("data-id"));
    });
    $("umSearch").addEventListener("input", render);
    $("umAdd").addEventListener("click", function () { openEditor(null); });
    $("umClose").addEventListener("click", closeEditor);
    $("umCancel").addEventListener("click", closeEditor);
    $("umSave").addEventListener("click", save);
    $("fShift").addEventListener("change", syncDual);
    document.querySelectorAll(".um-tab").forEach(function (t) {
      t.addEventListener("click", function () { switchTab(t.dataset.pane); });
    });
    // Click the dark overlay (outside the card) to close.
    $("umModal").addEventListener("click", function (ev) { if (ev.target === $("umModal")) closeEditor(); });
    await load();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

/* =========================================================================
   user-management-linking.js — "Teacher Linking" tab controller.  (v2)
   ADD this file AFTER user-management.js on user-management.html.

   FIX vs v1: the old version translated a picked teacher through a
   "userCode" field that usersList() never actually returns (biometricCode
   is a different, often-blank field) — so linking silently failed for any
   teacher without a biometric code. v2 uses the real user id directly via
   getCanonicalTeachers(), which now returns {id, name}.

   Injects a "Teacher Linking" section under the users table and lets you
   attach mismatched timetable names (e.g. "KNR") to the real user
   ("Narsimha Reddy Kasireddy"), once — it then resolves everywhere.
   ========================================================================= */
(function () {
  "use strict";
  var P = window.Portal;
  if (!P) return;
  var esc = P.esc || function (s) { return String(s == null ? "" : s); };
  function toast(m, ok) { if (P.toast) P.toast(m, ok === false ? "error" : "success"); else alert(m); }
  async function api(fn, args) { return await P.api(fn, args || []); }

  var TEACHERS = [];   // [{id, name}]

  function css() {
    if (document.getElementById("uml-css")) return;
    var s = document.createElement("style");
    s.id = "uml-css";
    s.textContent =
      ".uml-wrap{max-width:1180px;margin:22px auto 0;padding:0 0 24px}" +
      ".uml-head{display:flex;align-items:center;gap:10px;margin:6px 0 12px}" +
      ".uml-head h3{margin:0;font-size:1rem;color:#0f172a}" +
      ".uml-badge{background:#fee2e2;color:#991b1b;border-radius:999px;padding:2px 9px;font-size:.72rem;font-weight:700}" +
      ".uml-badge.ok{background:#dcfce7;color:#166534}" +
      ".uml-table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e6e8ee;border-radius:12px;overflow:hidden}" +
      ".uml-table th,.uml-table td{padding:10px 12px;text-align:left;font-size:.88rem;border-bottom:1px solid #eef1f6}" +
      ".uml-table th{background:#f8fafc;color:#475569;font-weight:600;font-size:.74rem;text-transform:uppercase;letter-spacing:.03em}" +
      ".uml-table tr:last-child td{border-bottom:0}" +
      ".uml-src{color:#94a3b8;font-size:.74rem}" +
      ".uml-row-name{font-weight:600;color:#0f172a}" +
      ".uml-sel{padding:7px 9px;border:1px solid #e2e8f0;border-radius:8px;font-size:.85rem;min-width:190px}" +
      ".uml-btn{border:1px solid #e2e8f0;background:#fff;border-radius:8px;padding:7px 12px;font-size:.82rem;font-weight:600;cursor:pointer;color:#0f172a}" +
      ".uml-btn.primary{background:#8a1d21;border-color:#8a1d21;color:#fff}" +
      ".uml-btn:hover{filter:brightness(.97)}" +
      ".uml-empty{color:#94a3b8;padding:16px;text-align:center}" +
      ".uml-pill{display:inline-block;background:#eef2ff;color:#4338ca;border-radius:999px;padding:2px 8px;font-size:.72rem;font-weight:600}";
    document.head.appendChild(s);
  }

  function teacherOptions() {
    return '<option value="">— pick user —</option>' +
      TEACHERS.map(function (t) { return '<option value="' + t.id + '">' + esc(t.name) + '</option>'; }).join("");
  }

  function renderTable(host, payload) {
    var un = payload.unlinked || [], ln = payload.linked || [];
    var rowsUn = un.length ? un.map(function (r) {
      return '<tr data-raw="' + esc(r.rawName) + '">' +
        '<td><div class="uml-row-name">' + esc(r.rawName) + '</div><div class="uml-src">in: ' + esc(r.sources) + '</div></td>' +
        '<td><select class="uml-sel">' + teacherOptions() + '</select></td>' +
        '<td><button class="uml-btn primary uml-link">Link</button></td>' +
        '</tr>';
    }).join("") : '<tr><td colspan="3" class="uml-empty">🎉 Every name is linked.</td></tr>';

    var rowsLn = ln.length ? ln.map(function (r) {
      return '<tr data-raw="' + esc(r.rawName) + '">' +
        '<td><div class="uml-row-name">' + esc(r.rawName) + '</div><div class="uml-src">in: ' + esc(r.sources) + '</div></td>' +
        '<td><span class="uml-pill">' + esc(r.resolvedName) + '</span></td>' +
        '<td><button class="uml-btn uml-unlink">Unlink</button></td>' +
        '</tr>';
    }).join("") : "";

    host.innerHTML =
      '<div class="uml-head"><h3>Teacher Linking</h3>' +
      '<span class="uml-badge' + (un.length ? "" : " ok") + '">' + un.length + ' unmatched</span></div>' +
      '<p class="uml-src" style="margin:0 0 10px">Names below come from the Timetable. Attach any mismatched ' +
      'spelling (e.g. "KNR") to the correct user — it then resolves everywhere (Homework, reminders, reports).</p>' +
      '<table class="uml-table"><thead><tr><th>Name in Timetable</th><th>Link to user</th><th></th></tr></thead>' +
      '<tbody>' + rowsUn + rowsLn + '</tbody></table>';

    host.querySelectorAll(".uml-link").forEach(function (b) {
      b.addEventListener("click", async function () {
        var tr = b.closest("tr");
        var raw = tr.getAttribute("data-raw");
        var id = tr.querySelector(".uml-sel").value;
        if (!id) return toast("Pick a user first.", false);
        try { await api("linkTeacherName", [raw, Number(id)]); toast("Linked " + raw); await load(); }
        catch (e) { toast(String(e && e.message || e), false); }
      });
    });
    host.querySelectorAll(".uml-unlink").forEach(function (b) {
      b.addEventListener("click", async function () {
        var raw = b.closest("tr").getAttribute("data-raw");
        try { await api("unlinkTeacherName", [raw]); toast("Unlinked " + raw); await load(); }
        catch (e) { toast(String(e && e.message || e), false); }
      });
    });
  }

  async function load() {
    var host = document.getElementById("umlHost");
    if (!host) return;
    try {
      TEACHERS = await api("getCanonicalTeachers", []);
      var payload = await api("getUnlinkedTeacherNames", []);
      renderTable(host, payload);
    } catch (e) {
      host.innerHTML = '<div class="uml-empty">Could not load linking data.<br>' + esc(String(e && e.message || e)) + '</div>';
    }
  }

  function mount() {
    css();
    var anchor = document.getElementById("umList");
    var main = anchor ? anchor.parentNode : (document.querySelector(".um-wrap") || document.body);
    var wrap = document.createElement("div");
    wrap.className = "uml-wrap";
    wrap.innerHTML = '<div id="umlHost"><div class="uml-empty">Loading teacher links…</div></div>';
    main.appendChild(wrap);
    setTimeout(load, 400);   // let the main controller finish its own boot/render
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();

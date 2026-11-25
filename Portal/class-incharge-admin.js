/* =====================================================================
   class-incharge-admin.js — "Class In-charge" panel for User Management.
   Management only (server enforces it too). Classes + eligible staff come from the
   backend (followup-api), not from a hard-coded list. Loaded by user-management.html.
   ===================================================================== */
(function () {
  "use strict";
  var P = window.Portal; if (!P) return;
  var esc = P.esc || function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); };
  var DATA = { classes: [], staff: [] }, BY_NAME = {};
  function $(id) { return document.getElementById(id); }
  function toast(m, ok) {
    var t = document.createElement("div"); t.textContent = m;
    t.style.cssText = "position:fixed;bottom:22px;left:50%;transform:translateX(-50%);padding:10px 16px;border-radius:10px;color:#fff;font-size:.9rem;z-index:10000;background:" + (ok === false ? "#991b1b" : "#166534");
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3500);
  }

  function css() {
    if ($("ci-css")) return;
    var s = document.createElement("style"); s.id = "ci-css";
    s.textContent =
      ".ci-box{background:#fff;border:1px solid #e2e8f0;border-radius:14px;margin:0 0 18px;overflow:hidden}" +
      ".ci-head{display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer;user-select:none}" +
      ".ci-head h3{margin:0;font-size:1rem;color:#1e293b;flex:1}.ci-head small{color:#64748b}" +
      ".ci-body{padding:0 16px 14px;display:none}.ci-box.open .ci-body{display:block}" +
      ".ci-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}" +
      ".ci-card{border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;background:#f8fafc}" +
      ".ci-card b{display:block;font-size:.9rem;color:#0f172a}.ci-card .who{margin:4px 0 8px;font-size:.85rem;color:#334155;min-height:20px}" +
      ".ci-card .none{color:#94a3b8;font-style:italic}.ci-card button{font-size:.75rem;padding:4px 10px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;margin-right:4px}" +
      ".ci-card button:hover{border-color:#800000;color:#800000}" +
      ".ci-pill{display:inline-block;margin-top:3px;padding:2px 9px;border-radius:999px;font-size:.7rem;font-weight:700;background:#e0f2fe;color:#075985}" +
      ".ci-hist{width:100%;border-collapse:collapse;margin-top:10px;font-size:.8rem}.ci-hist th,.ci-hist td{padding:6px 8px;border-bottom:1px solid #eef1f6;text-align:left}" +
      ".ci-dlg{position:fixed;inset:0;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;z-index:9999}" +
      ".ci-dlg>div{background:#fff;border-radius:14px;padding:18px;width:min(420px,92vw)}" +
      ".ci-dlg label{display:block;font-size:.8rem;font-weight:600;color:#475569;margin:10px 0 4px}.ci-dlg select,.ci-dlg input{width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px}" +
      ".ci-dlg .row{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}";
    document.head.appendChild(s);
  }
  function pill(name) { var c = BY_NAME[name]; return c ? ' <span class="ci-pill" title="Class in-charge">In-charge · ' + esc(c) + "</span>" : ""; }

  function dialog(title, bodyHtml, okLabel, onOk) {
    var d = document.createElement("div"); d.className = "ci-dlg";
    d.innerHTML = "<div><h3 style='margin:0 0 4px'>" + esc(title) + "</h3>" + bodyHtml +
      "<div class='row'><button class='btn' data-x>Cancel</button><button class='btn btn-primary' data-ok>" + esc(okLabel) + "</button></div></div>";
    document.body.appendChild(d);
    var close = function () { d.remove(); };
    d.addEventListener("click", function (e) { if (e.target === d || e.target.hasAttribute("data-x")) close(); });
    d.querySelector("[data-ok]").addEventListener("click", async function (e) {
      e.target.disabled = true;
      try { await onOk(d); close(); } catch (err) { toast(err.message || String(err), false); e.target.disabled = false; }
    });
    return d;
  }
  function assignDlg(cls) {
    var opts = DATA.staff.map(function (s) { return "<option value='" + s.id + "'>" + esc(s.name) + " (" + esc(s.role) + ")" + (s.classCode ? " — currently " + esc(s.classCode) : "") + "</option>"; }).join("");
    dialog((cls.incharge ? "Change" : "Assign") + " in-charge — " + cls.label,
      "<label>Staff member</label><select id='ciUser'><option value=''>Select…</option>" + opts + "</select>" +
      "<label>Note (optional)</label><input id='ciNote' maxlength='300' placeholder='e.g. academic year 2026-27' />" +
      "<p style='font-size:.75rem;color:#64748b'>A staff member can be in-charge of one class. Choosing someone already in charge elsewhere moves them. The change is recorded in the history.</p>",
      "Save", async function (d) {
        var uid = d.querySelector("#ciUser").value; if (!uid) throw new Error("Select a staff member.");
        await P.api("fuAssignIncharge", [cls.code, Number(uid), d.querySelector("#ciNote").value]);
        toast(cls.label + " in-charge saved."); await load();
      });
  }
  function removeDlg(cls) {
    dialog("Remove in-charge — " + cls.label, "<label>Reason *</label><input id='ciWhy' maxlength='300' />", "Remove", async function (d) {
      await P.api("fuRemoveIncharge", [cls.code, d.querySelector("#ciWhy").value]); toast("In-charge removed."); await load();
    });
  }
  async function history(code) {
    var rows = await P.api("fuInchargeHistory", [code || ""]);
    var html = rows.length ? "<table class='ci-hist'><tr><th>Class</th><th>In-charge</th><th>From</th><th>To</th><th>By / reason</th></tr>" + rows.map(function (r) {
      return "<tr><td>" + esc(r.classLabel) + "</td><td>" + esc(r.name) + (r.active ? " ✔" : "") + "</td><td>" + esc((r.assignedAt || "").slice(0, 10)) + "</td><td>" + esc((r.endedAt || "").slice(0, 10)) + "</td><td>" + esc(r.assignedBy || "") + (r.endReason ? " · " + esc(r.endReason) : "") + "</td></tr>";
    }).join("") + "</table>" : "<p>No history yet.</p>";
    dialog("Assignment history", html, "Close", async function () {});
  }
  function draw() {
    var host = $("ciBody"); if (!host) return;
    var assigned = DATA.classes.filter(function (c) { return c.incharge; }).length;
    $("ciCount").textContent = assigned + " of " + DATA.classes.length + " classes assigned";
    host.innerHTML = '<div class="ci-grid">' + DATA.classes.map(function (c) {
      return '<div class="ci-card"><b>' + esc(c.label) + '</b><div class="who">' + (c.incharge ? esc(c.incharge.name) : '<span class="none">Not assigned</span>') + "</div>" +
        '<button data-a="set" data-c="' + esc(c.code) + '">' + (c.incharge ? "Change" : "Assign") + "</button>" +
        (c.incharge ? '<button data-a="rm" data-c="' + esc(c.code) + '">Remove</button>' : "") + "</div>";
    }).join("") + '</div><p style="margin-top:10px"><a href="#" id="ciHist">View assignment history</a></p>';
  }
  async function load() {
    try {
      DATA = await P.api("fuListAssignments", []);
      BY_NAME = {}; DATA.classes.forEach(function (c) { if (c.incharge) BY_NAME[c.incharge.name] = c.label; });
      draw(); window.dispatchEvent(new Event("um-incharge-changed"));
    } catch (e) { var h = $("ciBody"); if (h) h.innerHTML = '<p style="color:#991b1b">' + esc(e.message || e) + "</p>"; }
  }
  function mount() {
    var list = $("umList"); if (!list || $("ciBox")) return;
    var sess = P.Session && P.Session.get(); if (sess && sess.role !== "Management") return;
    css();
    var box = document.createElement("div"); box.id = "ciBox"; box.className = "ci-box";
    box.innerHTML = '<div class="ci-head" id="ciHead"><span class="material-icons-round">supervisor_account</span><h3>Class In-charge <small id="ciCount"></small></h3><span class="material-icons-round">expand_more</span></div><div class="ci-body" id="ciBody">Loading…</div>';
    list.parentNode.insertBefore(box, list);
    var opened = false;
    $("ciHead").addEventListener("click", function () { box.classList.toggle("open"); if (!opened) { opened = true; } });
    box.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("button[data-a]");
      if (b) { var cls = DATA.classes.filter(function (c) { return c.code === b.getAttribute("data-c"); })[0]; if (b.getAttribute("data-a") === "set") assignDlg(cls); else removeDlg(cls); }
      if (e.target.id === "ciHist") { e.preventDefault(); history(""); }
    });
    load();
  }
  window.UMIncharge = { pill: pill };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(mount, 0); }); else setTimeout(mount, 0);
})();

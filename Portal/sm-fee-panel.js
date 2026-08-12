/* =========================================================================
   sm-fee-panel.js — "Fee Structure" panel for Student Management admit/edit.
   Links Student Management <-> Fees (via student_id). Include AFTER portal.js
   on student-management.html. Usage:
     SMFees.openModal(studentId, currentYear);                  // popup
     SMFees.mountInline(containerEl, studentId, currentYear);   // inline
     SMFees.saveFor(studentId, year);                           // save from host
   ========================================================================= */
(function () {
  "use strict";
  var P = window.Portal; if (!P) return;
  var esc = P.esc || function (s) { return String(s == null ? "" : s); };
  function money(n) { return "\u20B9" + (Number(n) || 0).toLocaleString("en-IN"); }
  function toast(m, ok) { if (P.toast) P.toast(m, ok === false ? "error" : "success"); else alert(m); }
  function api(fn, args) { return P.api(fn, args || [], { overlay: false }); }
  css();

  function load(sid, year) { return api("feeGetStudentCharges", [sid, year]); }
  function panelHtml(d) {
    var rows = (d.feeTypes || []).map(function (t) { return '<div class="smf-row"><label>' + esc(t.name) + '</label><input class="smf-in" data-code="' + esc(t.code) + '" type="number" min="0" value="' + (d.fees[t.code] || 0) + '"/></div>'; }).join("");
    var old = d.isMigrationYear ? '<div class="smf-row"><label>Old Due (opening)</label><input class="smf-in smf-old" type="number" min="0" value="' + (d.oldDue || 0) + '"/></div>' : '<div class="smf-row"><label>Old Due (carried)</label><div class="smf-derived">' + money(d.oldDue) + ' · auto</div></div>';
    return '<div class="smf-head"><i class="material-icons">payments</i> Fee Structure · ' + esc(d.year) + '</div><div class="smf-grid">' + old + rows + '</div><div class="smf-note">Old Due carries forward automatically each year. A fee can\'t be set below what\'s already collected.</div>';
  }
  function collectFrom(root) { var fees = {}; Array.prototype.forEach.call(root.querySelectorAll(".smf-in[data-code]"), function (i) { fees[i.getAttribute("data-code")] = Number(i.value) || 0; }); var o = root.querySelector(".smf-old"); return { fees: fees, oldDue: o ? (Number(o.value) || 0) : undefined }; }

  function openModal(sid, year) {
    var h = ensure(); h.querySelector(".smf-body").innerHTML = '<div class="smf-loading">Loading fees…</div>'; h.classList.add("show");
    load(sid, year).then(function (d) { h.querySelector(".smf-body").innerHTML = panelHtml(d); }).catch(function (e) { h.querySelector(".smf-body").innerHTML = '<div class="smf-loading">' + esc(e.message || e) + '</div>'; });
    h.querySelector(".smf-save").onclick = function () { var p = collectFrom(h); var b = h.querySelector(".smf-save"); b.disabled = true; api("feeSetStudentCharges", [sid, year, p.fees, p.oldDue, ""]).then(function (r) { toast(r.success ? "Fees saved." : (r.changed + " saved, " + r.errors.length + " blocked."), r.success); b.disabled = false; if (r.success) h.classList.remove("show"); }).catch(function (e) { toast(e.message || e, false); b.disabled = false; }); };
  }
  function ensure() { var h = document.getElementById("smfModal"); if (h) return h; h = document.createElement("div"); h.id = "smfModal"; h.className = "smf-modal"; h.innerHTML = '<div class="smf-card"><div class="smf-cardhd"><span>Assign Fees</span><button class="smf-x">&times;</button></div><div class="smf-body"></div><div class="smf-foot"><button class="smf-cancel">Close</button><button class="smf-save">Save Fees</button></div></div>'; document.body.appendChild(h); h.querySelector(".smf-x").onclick = h.querySelector(".smf-cancel").onclick = function () { h.classList.remove("show"); }; h.onclick = function (e) { if (e.target === h) h.classList.remove("show"); }; return h; }

  function mountInline(container, sid, year) {
    if (!container) return;
    container.innerHTML = '<div class="smf-inline"><div class="smf-loading">Loading fees…</div></div>';
    return load(sid, year).then(function (d) {
      container.querySelector(".smf-inline").innerHTML = panelHtml(d) + '<button class="smf-save smf-inbtn" type="button">Save Fees</button>';
      container.querySelector(".smf-save").onclick = function () { var p = collectFrom(container); var b = container.querySelector(".smf-save"); b.disabled = true; api("feeSetStudentCharges", [sid, year, p.fees, p.oldDue, ""]).then(function (r) { toast(r.success ? "Fees saved." : (r.changed + " saved, " + r.errors.length + " blocked."), r.success); b.disabled = false; }).catch(function (e) { toast(e.message || e, false); b.disabled = false; }); };
    });
  }
  function saveFor(sid, year) { var h = document.getElementById("smfModal"); var root = (h && h.classList.contains("show")) ? h : document; var p = collectFrom(root); return api("feeSetStudentCharges", [sid, year, p.fees, p.oldDue, ""]); }

  window.SMFees = { openModal: openModal, mountInline: mountInline, load: load, saveFor: saveFor };

  function css() {
    if (document.getElementById("smf-css")) return; var s = document.createElement("style"); s.id = "smf-css";
    s.textContent = ".smf-head{display:flex;align-items:center;gap:8px;font-weight:800;color:#8a1618;font-size:14px;margin:6px 0 10px}.smf-head i{font-size:18px}.smf-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 16px}@media(max-width:520px){.smf-grid{grid-template-columns:1fr}}.smf-row{display:flex;flex-direction:column;gap:4px}.smf-row label{font-size:12px;font-weight:600;color:#64748b}.smf-in{padding:9px 11px;border:1px solid #e2e8f0;border-radius:9px;font:inherit}.smf-old{background:#fffbeb;font-weight:700}.smf-derived{padding:9px 11px;border:1px dashed #e2e8f0;border-radius:9px;color:#94a3b8;font-weight:600;font-size:13px}.smf-note{font-size:12px;color:#64748b;margin-top:10px;line-height:1.5}.smf-loading{padding:20px;text-align:center;color:#94a3b8;font-weight:600}.smf-inbtn{margin-top:12px;background:#8a1618;color:#fff;border:none;border-radius:10px;padding:9px 16px;font-weight:700;cursor:pointer}.smf-modal{position:fixed;inset:0;background:rgba(15,23,42,.45);display:none;align-items:center;justify-content:center;z-index:9998;padding:16px}.smf-modal.show{display:flex}.smf-card{background:#fff;border-radius:16px;max-width:560px;width:100%;max-height:90vh;display:flex;flex-direction:column}.smf-cardhd{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid #eef1f6;font-weight:700}.smf-cardhd button{border:none;background:none;font-size:24px;cursor:pointer;line-height:1}.smf-body{padding:16px 18px;overflow:auto}.smf-foot{display:flex;justify-content:flex-end;gap:8px;padding:14px 18px;border-top:1px solid #eef1f6}.smf-foot button{border-radius:10px;padding:9px 16px;font-weight:700;cursor:pointer;border:1px solid #e2e8f0;background:#fff}.smf-foot .smf-save{background:#8a1618;color:#fff;border-color:#8a1618}";
    document.head.appendChild(s);
  }
})();

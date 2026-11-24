/* Spoken English — "Add New Spoken English PDFs" (admin only).
   Flow: choose PDFs → read text in the browser → detect class/day → review checklists
   → slice per-class PDFs → upload to portal storage → publish lessons.
   No Google Drive, no GitHub. Needs window.SpokenCore (spoken-english-core.js). */
(function () {
  "use strict";
  var PDFIUM_URL = "https://cdn.jsdelivr.net/npm/@hyzyla/pdfium@3.0.0/dist/index.esm.cdn.js";
  var PDFLIB_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js";
  var MAX_FILE_BYTES = 40 * 1024 * 1024;
  var C = function () { return window.SpokenCore; };

  var pdfiumLib = null, ctx = null, state = null;

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function loadScript(url) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = url; s.onload = res; s.onerror = function () { rej(new Error("Could not load " + url)); };
      document.head.appendChild(s);
    });
  }
  function getPdfLib() {
    if (window.PDFLib) return Promise.resolve(window.PDFLib);
    return loadScript(PDFLIB_URL).then(function () { return window.PDFLib; });
  }
  function getPdfium() {
    if (pdfiumLib) return Promise.resolve(pdfiumLib);
    return import(PDFIUM_URL).then(function (m) { return m.PDFiumLibrary.init(); }).then(function (l) { pdfiumLib = l; return l; });
  }

  function readPages(bytes) {
    return getPdfium().then(function (lib) {
      return lib.loadDocument(bytes).then(function (doc) {
        var pages = [];
        try { for (var p of doc.pages()) pages.push(p.getText()); } finally { doc.destroy(); }
        return pages;
      });
    });
  }

  function toBase64(u8) {
    var out = "", chunk = 0x8000;
    for (var i = 0; i < u8.length; i += chunk) out += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
    return btoa(out);
  }
  function latin1(u8) { var s = ""; for (var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return s; }
  // Every upload gets its own random token so a file name can never collide with, or reuse, an older file.
  function newToken() {
    var a = new Uint8Array(10); (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return (b % 36).toString(36); }).join("");
  }
  function assetPath(cls, day, token, ext) { return "spoken/" + String(cls).replace(/\s+/g, "_") + "_Day_" + day + "_" + token + "." + ext; }

  /* ---------- UI shell ---------- */
  function shell() {
    var el = document.getElementById("sylSpokenUpload");
    if (el) el.remove();
    el = document.createElement("div");
    el.id = "sylSpokenUpload";
    el.style.cssText = "position:fixed;inset:0;z-index:3000;background:rgba(15,23,42,.7);display:flex;align-items:center;justify-content:center;padding:12px;";
    el.innerHTML = '<div style="background:#fff;border-radius:16px;max-width:860px;width:100%;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;">' +
      '<div style="padding:14px 18px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">' +
      '<h3 style="margin:0;font-size:17px;font-weight:800;">Add New Spoken English PDFs</h3>' +
      '<button type="button" id="spuClose" style="border:0;background:none;font-size:24px;cursor:pointer;">&times;</button></div>' +
      '<div id="spuBody" style="padding:16px 18px;overflow-y:auto;flex:1;"></div>' +
      '<div id="spuFoot" style="padding:12px 18px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:10px;"></div></div>';
    document.body.appendChild(el);
    el.querySelector("#spuClose").onclick = close;
    return el;
  }
  function close() { var el = document.getElementById("sylSpokenUpload"); if (el) el.remove(); }
  function body(h) { document.getElementById("spuBody").innerHTML = h; }
  function foot(buttons) {
    var f = document.getElementById("spuFoot"); f.innerHTML = "";
    buttons.forEach(function (b) {
      var x = document.createElement("button");
      x.type = "button"; x.className = b.primary ? "btn btn-success" : "btn btn-secondary"; x.style.width = "auto"; x.style.padding = "8px 16px";
      x.textContent = b.label; x.disabled = !!b.disabled; x.onclick = b.onClick; f.appendChild(x);
    });
  }

  /* ---------- step 1: choose files ---------- */
  function stepChoose() {
    state = { files: [], lessons: [], existing: null };
    body('<p style="margin:0 0 10px;font-size:13px;color:#334155;">Choose one or many Spoken English teacher-guide PDFs. Names such as <b>Day 9-10</b> are detected automatically. Existing lessons are never overwritten.</p>' +
      '<input type="file" id="spuFiles" accept="application/pdf,.pdf" multiple style="display:block;margin-bottom:10px;">' +
      '<div id="spuStatus" style="font-size:12.5px;color:#64748b;"></div>');
    foot([{ label: "Cancel", onClick: close }]);
    document.getElementById("spuFiles").onchange = function (e) { analyse(Array.prototype.slice.call(e.target.files)); };
  }

  function status(t) { var s = document.getElementById("spuStatus"); if (s) s.innerHTML = t; }

  function analyse(files) {
    if (!files.length) return;
    var core = C();
    // If the list of existing lessons cannot be loaded, stop: otherwise an existing Day would look "NEW".
    var existingReq = ctx.api("getSpokenLessonIndex", [], { overlay: false }).then(
      function (list) { return { ok: true, list: list || [] }; },
      function (e) { return { ok: false, err: e }; });
    var results = [];
    var chain = Promise.resolve();
    files.forEach(function (f) {
      chain = chain.then(function () {
        status("Reading <b>" + esc(f.name) + "</b>…");
        var rec = { name: f.name, filenameDays: core.detectDaysFromFilename(f.name), error: "", lessons: [], warnings: [], bytes: null };
        if (!/\.pdf$/i.test(f.name)) { rec.error = "Not a PDF file."; results.push(rec); return; }
        if (f.size > MAX_FILE_BYTES) { rec.error = "File is larger than 40 MB."; results.push(rec); return; }
        return f.arrayBuffer().then(function (buf) {
          rec.bytes = new Uint8Array(buf);
          return readPages(rec.bytes.slice());
        }).then(function (pages) {
          rec.pageCount = pages.length;
          rec.preview = pages.slice(0, 3).map(function (t, i) {
            return "Page " + (i + 1) + ":\n" + String(t || "").split(/\r?\n/).filter(function (x) { return x.trim(); }).slice(0, 8).join("\n");
          }).join("\n\n");
          var r = core.parseUploadPages(pages);
          rec.lessons = r.lessons; rec.warnings = r.warnings; rec.daysFound = r.daysFound;
          if (!r.lessons.length) rec.error = "No lessons were recognised in this PDF.";
          var yt = core.findYoutubeInBytes(latin1(rec.bytes));
          rec.lessons.forEach(function (l) { l._file = rec; if (!l.videoUrl && yt && r.lessons.length === 1) l.videoUrl = yt; });
        }).catch(function (e) { rec.error = "Could not read this PDF: " + (e && e.message || e); }).then(function () { results.push(rec); });
      });
    });
    chain.then(function () { return existingReq; }).then(function (idx) {
      if (!idx.ok) {
        status('<span style="color:#b91c1c;font-weight:700;">Could not check which lessons already exist: ' + esc(idx.err && idx.err.message || idx.err) + '. Nothing was uploaded. Please try again.</span>');
        return;
      }
      var existing = idx.list;
      state.files = results; state.existing = existing || [];
      state.lessons = [];
      var seen = {};
      results.forEach(function (rec) {
        rec.lessons.forEach(function (l) {
          var key = l.cls + "|" + l.day;
          var matches = state.existing.filter(function (e) { return e.cls === l.cls && Number(e.day) === Number(l.day); });
          l.duplicateInBatch = !!seen[key]; seen[key] = true;
          l.exists = matches.length > 0;
          l.existing = matches.length === 1 ? matches[0] : null;
          l.existingCount = matches.length;
          l.decision = "keep";            // existing lessons are kept unless the administrator chooses otherwise
          l.confirmReset = false;
          l.approved = !l.needsReview;
          if (!l.duplicateInBatch) state.lessons.push(l);
        });
      });
      stepReview();
    }).catch(function (e) {
      status('<span style="color:#b91c1c;font-weight:700;">Something went wrong while reading the PDFs: ' + esc(e && e.message || e) + '. Nothing was uploaded.</span>');
    });
  }

  /* ---------- step 2: review ---------- */
  function stepReview() {
    var h = "";
    state.files.forEach(function (rec) {
      var fd = rec.filenameDays.length ? "Day " + rec.filenameDays.join(", ") : "no day in file name";
      var cd = rec.daysFound && rec.daysFound.length ? "Day " + rec.daysFound.join(", ") : "none";
      var mismatch = rec.filenameDays.length && rec.daysFound && rec.daysFound.length && rec.filenameDays.join() !== rec.daysFound.join();
      h += '<div style="border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;margin-bottom:10px;background:#f8fafc;">' +
        '<div style="font-weight:800;font-size:13px;">' + esc(rec.name) + '</div>' +
        '<div style="font-size:12px;color:#475569;">File name says: ' + esc(fd) + ' &middot; PDF contents: ' + esc(cd) + ' &middot; ' + rec.lessons.length + ' lesson(s)</div>' +
        (mismatch ? '<div style="font-size:12px;color:#b45309;">The days in the file name differ from the days found inside the PDF. The PDF contents are used.</div>' : "") +
        (rec.error ? '<div style="font-size:12px;color:#b91c1c;">' + esc(rec.error) + '</div>' : "") +
        (!rec.lessons.length && rec.preview ? '<details style="margin-top:6px;font-size:12px;"><summary style="cursor:pointer;color:#475569;">Show what the portal read from this PDF (' + (rec.pageCount || 0) + ' pages)</summary><pre style="white-space:pre-wrap;max-height:220px;overflow:auto;background:#fff;border:1px solid #e2e8f0;padding:8px;border-radius:6px;">' + esc(rec.preview) + '</pre></details>' : "") +
        rec.warnings.map(function (w) { return '<div style="font-size:12px;color:#b45309;">' + esc(w) + '</div>'; }).join("") + '</div>';
    });
    var dups = [];
    state.files.forEach(function (r) { r.lessons.forEach(function (l) { if (l.duplicateInBatch) dups.push(l.cls + " Day " + l.day); }); });
    if (dups.length) h += '<div style="font-size:12px;color:#b45309;margin-bottom:10px;">Repeated in this batch and ignored: ' + esc(dups.join("; ")) + '</div>';
    if (!state.lessons.length) h += '<div class="syl-empty">No lessons were found.</div>';
    state.lessons.forEach(function (l, li) {
      var border = l.exists ? "#fca5a5" : (l.needsReview ? "#fcd34d" : "#bbf7d0");
      h += '<div data-li="' + li + '" style="border:1px solid ' + border + ';border-radius:10px;padding:10px 12px;margin-bottom:10px;">' +
        '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;"><b style="font-size:13px;">' + esc(l.cls) + ' &middot; ' + esc(l.lessonName) + '</b>' +
        '<span style="font-size:11.5px;color:#64748b;">' + (l.exists ? "ALREADY EXISTS" : "NEW") + ' &middot; PDF pages ' + (l.startPage + 1) + '–' + (l.endPage + 1) + '</span></div>';
      if (l.exists) {
        var ex = l.existing;
        if (!ex) {
          h += '<div style="font-size:12.5px;color:#991b1b;background:#fef2f2;padding:8px;border-radius:6px;margin:6px 0;">More than one lesson already exists for ' + esc(l.cls) + ' Day ' + esc(l.day) + '. It is left unchanged; please resolve this in the syllabus editor first.</div></div>';
          return;
        }
        var decisionId = "spuDec" + li;
        h += '<div style="font-size:12.5px;background:#fffbeb;padding:8px;border-radius:6px;margin:6px 0;">' +
          '<b>' + esc(l.cls) + ' Day ' + esc(l.day) + ' already exists:</b> &ldquo;' + esc(ex.name) + '&rdquo;. Teachers have ticked <b>' + esc(ex.ticked) + ' of ' + esc(ex.total) + '</b> checklist items.' +
          '<div style="margin-top:6px;"><label style="margin-right:16px;"><input type="radio" name="' + decisionId + '" value="keep" ' + (l.decision === "keep" ? "checked" : "") + '> <b>Keep Existing</b> &mdash; change nothing</label>' +
          '<label><input type="radio" name="' + decisionId + '" value="replace" ' + (l.decision === "replace" ? "checked" : "") + '> <b>Replace Existing</b></label></div>';
        if (l.decision === "replace") {
          h += '<div style="margin-top:8px;border:2px solid #dc2626;background:#fef2f2;color:#7f1d1d;padding:8px 10px;border-radius:6px;">' +
            '<b>&#9888; Warning &mdash; this replaces the existing lesson.</b><br>The current PDF and checklist of <b>' + esc(l.cls) + ' Day ' + esc(l.day) + '</b> will be replaced by this upload, and ' +
            '<b>all teacher checklist progress saved for this class and Day will be reset</b> (' + esc(ex.ticked) + ' of ' + esc(ex.total) + ' ticked items will be cleared). ' +
            'Other classes, other days and other subjects are not affected. This cannot be undone.' +
            '<label style="display:block;margin-top:6px;font-weight:700;"><input type="checkbox" data-confirm="1" ' + (l.confirmReset ? "checked" : "") + '> I understand. Replace ' + esc(l.cls) + ' Day ' + esc(l.day) + ' and reset its progress.</label></div>';
        }
        h += '</div>';
      }
      if (!l.exists || l.decision === "replace") {
        h += (l.objective ? '<div style="font-size:12px;color:#475569;margin:4px 0;">Objective: ' + esc(l.objective) + '</div>' : "") +
          (l.needsReview ? '<div style="font-size:12px;color:#92400e;background:#fffbeb;padding:6px 8px;border-radius:6px;margin:4px 0;">Needs admin review: ' + esc(l.reviewReasons.join("; ")) + '. Edit the items, then tick &ldquo;Approve&rdquo;. Unapproved lessons are not published.</div>' : "") +
          '<div class="spu-items">' + l.checklist.map(function (c, ci) {
            return '<div style="display:flex;gap:6px;margin-bottom:4px;"><textarea data-ci="' + ci + '" rows="2" style="flex:1;font-size:12.5px;">' + esc(c) + '</textarea>' +
              '<button type="button" data-rm="' + ci + '" title="Remove item">&times;</button></div>';
          }).join("") + '</div>' +
          '<label style="font-size:12.5px;font-weight:700;"><input type="checkbox" data-approve="1" ' + (l.approved ? "checked" : "") + '> Approve for publishing</label>';
      }
      h += '</div>';
    });
    body(h);
    var host = document.getElementById("spuBody");
    Array.prototype.forEach.call(host.querySelectorAll("[data-li]"), function (box) {
      var l = state.lessons[+box.getAttribute("data-li")];
      Array.prototype.forEach.call(box.querySelectorAll("textarea"), function (t) {
        t.oninput = function () { l.checklist[+t.getAttribute("data-ci")] = t.value; };
      });
      Array.prototype.forEach.call(box.querySelectorAll("[data-rm]"), function (b) {
        b.onclick = function () { l.checklist.splice(+b.getAttribute("data-rm"), 1); stepReview(); };
      });
      var ap = box.querySelector("[data-approve]"); if (ap) ap.onchange = function (e) { l.approved = e.target.checked; refreshFoot(); };
      Array.prototype.forEach.call(box.querySelectorAll('input[type=radio]'), function (r) {
        r.onchange = function () { l.decision = r.value; l.confirmReset = false; stepReview(); };
      });
      var cf = box.querySelector("[data-confirm]"); if (cf) cf.onchange = function (e) { l.confirmReset = e.target.checked; refreshFoot(); };
    });
    refreshFoot();
  }
  // What will actually be published: new approved lessons, plus explicitly confirmed replacements.
  function plan() {
    var out = { create: [], replace: [] };
    state.lessons.forEach(function (l) {
      if (!l.approved || !l.checklist.length) return;
      if (!l.exists) out.create.push(l);
      else if (l.existing && l.decision === "replace" && l.confirmReset) out.replace.push(l);
    });
    return out;
  }
  function refreshFoot() {
    var p = plan(), n = p.create.length + p.replace.length;
    var label = n ? "Publish " + p.create.length + " new" + (p.replace.length ? ", replace " + p.replace.length : "") : "Nothing to publish";
    foot([{ label: "Back", onClick: stepChoose }, { label: label, primary: true, disabled: !n, onClick: publish }]);
  }

  /* ---------- step 3: slice, upload, publish ---------- */
  function publish() {
    var p = plan(), list = p.create.concat(p.replace);
    foot([]);
    body('<div id="spuProg" style="font-size:13px;">Preparing…</div>');
    var prog = function (t) { document.getElementById("spuProg").textContent = t; };
    var payload = [], failed = [];
    getPdfLib().then(function (PL) {
      var chain = Promise.resolve();
      list.forEach(function (l, i) {
        chain = chain.then(function () {
          prog("Uploading " + l.cls + " Day " + l.day + " (" + (i + 1) + "/" + list.length + ")…");
          var token = newToken();
          return PL.PDFDocument.load(l._file.bytes, { ignoreEncryption: true }).then(function (src) {
            return PL.PDFDocument.create().then(function (out) {
              var idx = []; for (var q = l.startPage; q <= l.endPage; q++) idx.push(q);
              return out.copyPages(src, idx).then(function (pgs) {
                pgs.forEach(function (pg) { out.addPage(pg); });
                return out.save({ useObjectStreams: false });
              });
            });
          }).then(function (bytes) {
            var yt = C().findYoutubeInBytes(latin1(bytes));
            var video = l.videoUrl || yt || "";
            var pdfPath = assetPath(l.cls, l.day, token, "pdf"), jsonPath = assetPath(l.cls, l.day, token, "json");
            return ctx.api("uploadSpokenAsset", [pdfPath, toBase64(bytes), "application/pdf"], { overlay: false }).then(function (up) {
              var meta = { title: l.title, objective: l.objective, video_url: /^https:\/\/(www\.)?(youtu\.be\/|youtube\.com\/)/i.test(video) ? video : "", pdf_url: up.url, checklist: l.checklist };
              var json = btoa(unescape(encodeURIComponent(JSON.stringify(meta))));
              return ctx.api("uploadSpokenAsset", [jsonPath, json, "application/json"], { overlay: false }).then(function () {
                var item = { cls: l.cls, day: l.day, lessonName: l.lessonName, pdfUrl: up.url, checklist: l.checklist, mode: l.exists ? "replace" : "new" };
                if (l.exists) { item.confirmReset = true; item.expectedLessonId = String(l.existing.id); }
                payload.push(item);
              });
            });
          }).catch(function (e) { failed.push({ cls: l.cls, day: l.day, status: "failed", message: "Upload failed: " + (e && e.message || e) }); });
        });
      });
      return chain;
    }).then(function () {
      if (!payload.length) return { results: [] };
      prog("Publishing lessons…");
      return ctx.api("publishSpokenLessons", [payload], { overlay: false });
    }).then(function (res) {
      var rows = ((res && res.results) || []).concat(failed);
      var bad = rows.filter(function (r) { return r.status === "failed"; }).length;
      var ok = rows.filter(function (r) { return r.status === "created" || r.status === "replaced"; }).length;
      body('<p style="font-size:14px;font-weight:800;color:' + (bad ? "#b91c1c" : "#15803d") + ';">' +
        (bad ? ok + ' lesson(s) published, ' + bad + ' failed.' : ok + ' lesson(s) published.') + '</p>' +
        rows.map(function (r) {
          var c = r.status === "failed" ? "#b91c1c" : (r.status === "skipped" ? "#64748b" : "#15803d");
          return '<div style="font-size:12.5px;color:' + c + ';">' + esc(r.cls) + ' Day ' + esc(r.day) + ': <b>' + esc(r.status) + '</b>' + (r.message ? ' — ' + esc(r.message) : "") + '</div>';
        }).join(""));
      foot([{ label: "Done", primary: true, onClick: function () { close(); if (ctx.onDone) ctx.onDone(); } }]);
    }).catch(function (e) {
      body('<p style="color:#b91c1c;font-weight:700;">Publishing stopped: ' + esc(e && e.message || e) + '</p><p style="font-size:12.5px;">The portal only shows a lesson as published after the server confirms it. Please check the lesson list, then try again if needed.</p>');
      foot([{ label: "Close", onClick: function () { close(); if (ctx.onDone) ctx.onDone(); } }]);
    });
  }

  window.SpokenUpload = {
    open: function (c) { ctx = c; shell(); stepChoose(); },
    _test: { review: function (st, c) { ctx = c; state = st; shell(); stepReview(); }, plan: function () { return plan(); }, assetPath: assetPath, newToken: newToken }
  };
})();

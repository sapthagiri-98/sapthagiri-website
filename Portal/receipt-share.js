/* =========================================================================
   receipt-share.js (v2) — client-side PDF + native share (NO server storage)
   Changes per request:
     • Logo enlarged (it already contains the school name) — no text name.
     • Address + Since/tagline + phone sit BELOW the logo.
     • "FEE PAYMENT e-RECEIPT" bar sits at the TOP, right under the header.
   Include AFTER fee-management.js. Loads html2canvas + jsPDF lazily.
     ReceiptShare.print(r) .share(r) .download(r) .shareLedger(html, title)
   ========================================================================= */
(function () {
  "use strict";
  var CDN = { h2c: "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
              jspdf: "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" };
  var loaded = {};
  function load(src) { if (loaded[src]) return loaded[src]; loaded[src] = new Promise(function (res, rej) { var s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = function () { rej(new Error("load " + src)); }; document.head.appendChild(s); }); return loaded[src]; }
  function libs() { return Promise.all([load(CDN.h2c), load(CDN.jspdf)]); }
  function inr(n) { return (Number(n) || 0).toLocaleString("en-IN"); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function pd(v) { var m = String(v || "").match(/^(\d{4})-(\d{2})-(\d{2})/); var M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; if (m) return m[3] + "-" + M[+m[2] - 1] + "-" + m[1]; var mm = String(v || "").match(/^(\d{2})-(\d{2})-(\d{4})$/); if (mm) return mm[1] + "-" + M[+mm[2] - 1] + "-" + mm[3]; return String(v || ""); }

  // header: big logo on top, details below; then the e-RECEIPT bar
  function headerBlock(s, barText) {
    s = s || {};
    return '<div class="rc-hd">' +
      '<img class="rc-logo" src="header-logo.png" crossorigin="anonymous" onerror="this.style.display=\'none\'"/>' +
      '<div class="rc-ad">' + esc(s.address || "Karimnagar, Telangana") + '</div>' +
      '<div class="rc-meta">Since ' + esc(s.since || "1998") + ' &nbsp;|&nbsp; ' + esc(s.tagline || "Day &amp; Residential") + ' &nbsp;|&nbsp; ' + esc(s.phone || "9381118421") + '</div>' +
      '</div>' +
      '<div class="rc-bar">' + (barText || "FEE PAYMENT e-RECEIPT") + '</div>';
  }

  function receiptHtml(r) {
    var hist = (r.history || []).map(function (h) { return '<tr' + (h.isThis ? ' style="font-weight:700;background:#f6efef"' : '') + '><td>' + esc(pd(h.date)) + '</td><td class="r">Rs. ' + inr(h.amount) + '</td><td>' + esc(h.mode) + '</td><td class="r">Rs. ' + inr(h.balance) + '</td></tr>'; }).join("");
    return headerBlock(r.school, "FEE PAYMENT e-RECEIPT") +
      '<table class="rc-t"><tr><td class="k">Class</td><td>' + esc(r.className) + '</td><td class="k">Academic Year</td><td>' + esc(r.academicYear) + '</td></tr>' +
      '<tr><td class="k">Student Name</td><td>' + esc(r.studentName) + '</td><td class="k">Student ID</td><td>' + esc(r.studentId) + '</td></tr>' +
      '<tr><td class="k">Father\'s Name</td><td>' + esc(r.fatherName) + '</td><td class="k">Contact No.</td><td>' + esc(r.contactNo) + '</td></tr></table>' +
      '<table class="rc-t"><tr><td class="k">Fee Type</td><td colspan="3">' + esc(r.feeType) + '</td></tr>' +
      '<tr><td class="k">Total Fee</td><td>Rs. ' + inr(r.totalFee) + '</td><td class="k">Current Due</td><td>Rs. ' + inr(r.currentDue) + '</td></tr>' +
      '<tr><td class="k">Current Payment</td><td>Rs. ' + inr(r.currentPayment) + '</td><td class="k">Date</td><td>' + esc(pd(r.date)) + '</td></tr>' +
      '<tr><td class="k">Amount in Words</td><td colspan="3">' + esc(r.amountInWords) + '</td></tr>' +
      '<tr><td class="k">Payment Received By</td><td colspan="3">' + esc(r.receivedBy) + '</td></tr>' +
      '<tr><td class="k">Balance</td><td colspan="3"><b>Rs. ' + inr(r.balance) + '</b></td></tr></table>' +
      '<div class="rc-sub">PAYMENTS HISTORY</div>' +
      '<table class="rc-h"><tr><th>Date</th><th class="r">Amount</th><th>Mode</th><th class="r">Balance</th></tr>' + hist + '</table>' +
      '<div class="rc-note"><i>Note: This is a computer generated receipt and does not require a signature</i></div>';
  }
  // expose for ledger printing (school header + e-receipt bar reused)
  window.ReceiptHeaderBlock = headerBlock;

  var CSS = '.rc-wrap{font-family:Segoe UI,Arial,sans-serif;color:#111;width:720px;padding:18px;background:#fff}' +
    '.rc-hd{text-align:center;border-bottom:2px solid #8a1618;padding-bottom:10px;margin-bottom:0}' +
    '.rc-logo{height:96px;max-width:92%;object-fit:contain;display:block;margin:0 auto 6px}' +
    '.rc-ad{font-size:13px;color:#333}.rc-meta{font-size:12px;color:#555;margin-top:2px}' +
    '.rc-bar{background:#8a1618;color:#fff;text-align:center;font-weight:700;letter-spacing:2px;padding:8px;margin:0 0 12px}' +
    '.rc-t,.rc-h{width:100%;border-collapse:collapse;margin-bottom:8px}.rc-t td,.rc-h td,.rc-h th{border:1px solid #000;padding:6px 10px;font-size:13px}' +
    '.rc-t td.k{background:#f3eaea;font-weight:700;width:20%}.rc-h th{background:#f3eaea}.r{text-align:right}' +
    '.rc-sub{background:#e9e9e9;text-align:center;font-weight:700;padding:5px;font-size:13px;margin-bottom:4px}' +
    '.rc-note{font-size:11px;color:#444;margin-top:14px;text-align:center;border-top:1px dashed #999;padding-top:8px}';
  window.ReceiptCSS = CSS;

  function node(inner) { var w = document.createElement("div"); w.className = "rc-wrap"; w.style.cssText = "position:fixed;left:-10000px;top:0"; w.innerHTML = "<style>" + CSS + "</style>" + inner; document.body.appendChild(w); return w; }
  function toBlob(el) {
    return libs().then(function () { return window.html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#fff" }); }).then(function (canvas) {
      var jsPDF = window.jspdf.jsPDF, pdf = new jsPDF("p", "mm", "a4"), pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight(), m = 8, iw = pw - m * 2, ih = canvas.height * iw / canvas.width, img = canvas.toDataURL("image/jpeg", 0.92);
      if (ih <= ph - m * 2) pdf.addImage(img, "JPEG", m, m, iw, ih);
      else { var pageH = ph - m * 2, sliceH = canvas.width * pageH / iw, y = 0, first = true; while (y < canvas.height) { var c2 = document.createElement("canvas"); c2.width = canvas.width; c2.height = Math.min(sliceH, canvas.height - y); c2.getContext("2d").drawImage(canvas, 0, y, canvas.width, c2.height, 0, 0, canvas.width, c2.height); if (!first) pdf.addPage(); pdf.addImage(c2.toDataURL("image/jpeg", 0.92), "JPEG", m, m, iw, c2.height * iw / canvas.width); first = false; y += c2.height; } }
      return pdf.output("blob");
    });
  }
  function fname(r) { return (String(r.studentName || "Student").replace(/[^\w]+/g, "_")) + "_" + (r.receiptId || "receipt") + ".pdf"; }
  function ov(on) { var e = document.getElementById("rcs-ov"); if (on) { if (!e) { e = document.createElement("div"); e.id = "rcs-ov"; e.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.4);z-index:100000;display:flex;align-items:center;justify-content:center"; e.innerHTML = '<div style="background:#fff;padding:16px 22px;border-radius:12px;font:600 14px Segoe UI;color:#8a1618">Preparing PDF…</div>'; document.body.appendChild(e); } } else if (e) e.remove(); }
  function dl(blob, name) { var u = URL.createObjectURL(blob); var a = document.createElement("a"); a.href = u; a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 1500); }

  window.ReceiptShare = {
    print: function (r) { var w = window.open("", "_blank"); if (!w) return alert("Allow pop-ups to print."); w.document.write('<html><head><title>Receipt ' + esc(r.receiptId || "") + '</title><style>@page{size:A4;margin:12mm}' + CSS + '.rc-wrap{width:auto;padding:0}</style></head><body><div class="rc-wrap">' + receiptHtml(r) + '</div></body></html>'); w.document.close(); w.focus(); setTimeout(function () { w.print(); }, 350); },
    share: function (r) { var el = node(receiptHtml(r)); ov(true); return toBlob(el).then(function (b) { el.remove(); ov(false); var f = new File([b], fname(r), { type: "application/pdf" }); if (navigator.canShare && navigator.canShare({ files: [f] })) return navigator.share({ files: [f], title: "Fee Receipt " + (r.receiptId || ""), text: "Fee receipt for " + (r.studentName || "") }).catch(function () {}); dl(b, fname(r)); var ph = String(r.contactNo || "").replace(/\D/g, ""); if (ph) { if (ph.length === 10) ph = "91" + ph; window.open("https://wa.me/" + ph + "?text=" + encodeURIComponent("Dear Parent, fee receipt for " + (r.studentName || "") + " (Receipt " + (r.receiptId || "") + "). PDF downloaded — please attach it."), "_blank"); } }).catch(function (e) { el.remove(); ov(false); alert("PDF error: " + (e.message || e)); }); },
    download: function (r) { var el = node(receiptHtml(r)); ov(true); return toBlob(el).then(function (b) { el.remove(); ov(false); dl(b, fname(r)); }).catch(function (e) { el.remove(); ov(false); alert("PDF error: " + (e.message || e)); }); },
    shareLedger: function (inner, title) { var el = node(inner); ov(true); return toBlob(el).then(function (b) { el.remove(); ov(false); var f = new File([b], (title || "Ledger").replace(/[^\w]+/g, "_") + ".pdf", { type: "application/pdf" }); if (navigator.canShare && navigator.canShare({ files: [f] })) return navigator.share({ files: [f], title: title || "Ledger" }).catch(function () {}); dl(b, f.name); }).catch(function (e) { el.remove(); ov(false); alert("PDF error: " + (e.message || e)); }); },
    canShareFiles: function () { try { return !!(navigator.canShare && navigator.canShare({ files: [new File([new Blob(["x"])], "x.pdf", { type: "application/pdf" })] })); } catch (e) { return false; } },
  };
})();

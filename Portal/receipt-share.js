/* =========================================================================
   receipt-share.js — Printable Module for e-Receipts & Unrolled Audit Ledgers
   ========================================================================= */
(function (window) {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function formatInr(n) {
    return Number(n || 0).toLocaleString("en-IN");
  }

  function formatDate(d) {
    if (!d) return "";
    var m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return m[3] + " " + months[parseInt(m[2], 10) - 1] + " " + m[1];
    }
    return d;
  }

  var ReceiptShare = {
    // ---------------------------------------------------------------------
    // A4 E-RECEIPT
    // ---------------------------------------------------------------------
    buildReceiptHtml: function (r) {
      var historyRows = (r.history || []).map(function (h) {
        return (
          '<tr>' +
          '<td>' + esc(formatDate(h.date)) + '</td>' +
          '<td class="r">Rs. ' + esc(formatInr(h.amount)) + '</td>' +
          '<td>' + esc(h.mode || "Cash") + '</td>' +
          '<td class="r">Rs. ' + esc(formatInr(h.balance)) + '</td>' +
          '</tr>'
        );
      }).join("");

      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Fee Receipt - ${esc(r.receiptId)}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; margin: 0; padding: 0; background: #fff; }
    .receipt-card { border: 2px solid #8a1618; padding: 16px 20px; max-width: 780px; margin: 0 auto; box-sizing: border-box; }
    
    .hdr-logo-container { text-align: center; margin-bottom: 8px; border-bottom: 1.5px solid #8a1618; padding-bottom: 8px; }
    .hdr-logo-img { width: 100%; max-height: 85px; object-fit: contain; display: block; margin: 0 auto; }
    
    .rc-title-bar { color: #808080; font-size: 13px; font-weight: 800; text-align: center; text-transform: uppercase; letter-spacing: 1px; margin: 10px 0 12px; }
    
    .grid-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    .grid-table td { border: 1px solid #b1b9c5; padding: 6px 10px; font-size: 12px; }
    .grid-table td.lbl { background: #ffffff; font-weight: 700; color: #334155; width: 18%; }
    .grid-table td.val { font-weight: 600; color: #0f172a; width: 32%; }
    .grid-table td.highlight { font-weight: 800; color: #8a1618; font-size: 13px; }
    
    .words-box { border: 1px solid #fecdd3; padding: 8px 12px; font-size: 12px; font-weight: 700; color: #8a1618; margin-bottom: 12px; border-radius: 4px; background: #fff1f2; }
    
    .sec-hdr { font-size: 12px; font-weight: 800; color: #8a1618; text-transform: uppercase; margin: 14px 0 6px; letter-spacing: 0.5px; border-bottom: 1px solid #8a1618; padding-bottom: 3px; }
    .hist-table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    .hist-table th, .hist-table td { border: 1px solid #b1b9c5; padding: 6px 10px; font-size: 11.5px; text-align: left; }
    .hist-table th { background: #ffffff; color: #334155; font-weight: 700; }
    .hist-table td.r, .hist-table th.r { text-align: right; }
    
    .ftr-note { font-size: 10px; color: #64748b; font-style: italic; text-align: center; margin-top: 16px; border-top: 1px dashed #cbd5e1; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="receipt-card">
    <div class="hdr-logo-container">
      <img src="receipt-header-logo.png" class="hdr-logo-img" alt="Sapthagiri High School" crossorigin="anonymous" onerror="this.style.display='none';"/>
    </div>
    <div class="rc-title-bar">FEE PAYMENT e-RECEIPT</div>

    <table class="grid-table">
      <tr>
        <td class="lbl">Class</td>
        <td class="val">${esc(r.className)}</td>
        <td class="lbl">Academic Year</td>
        <td class="val">${esc(r.academicYear)}</td>
      </tr>
      <tr>
        <td class="lbl">Student Name</td>
        <td class="val">${esc(r.studentName)}</td>
        <td class="lbl">Student ID</td>
        <td class="val">${esc(r.studentId)}</td>
      </tr>
      <tr>
        <td class="lbl">Father's Name</td>
        <td class="val">${esc(r.fatherName || "—")}</td>
        <td class="lbl">Contact No.</td>
        <td class="val">${esc(r.contactNo || "—")}</td>
      </tr>
      <tr>
        <td class="lbl">Fee Type</td>
        <td class="val" colspan="3">${esc(r.feeType)}</td>
      </tr>
      <tr>
        <td class="lbl">Total Fee</td>
        <td class="val">₹ ${formatInr(r.totalFee)}</td>
        <td class="lbl">Current Due</td>
        <td class="val highlight">₹ ${formatInr(r.currentDue)}</td>
      </tr>
      <tr>
        <td class="lbl">Current Payment</td>
        <td class="val highlight">₹ ${formatInr(r.currentPayment || r.amount)}</td>
        <td class="lbl">Date</td>
        <td class="val">${esc(formatDate(r.date))}</td>
      </tr>
      <tr>
        <td class="lbl">Received By</td>
        <td class="val">${esc(r.receivedBy)}</td>
        <td class="lbl">Balance</td>
        <td class="val highlight">₹ ${formatInr(r.balance)}</td>
      </tr>
    </table>

    <div class="words-box">
      Amount in Words: ${esc(r.amountInWords)}
    </div>

    ${historyRows ? `
      <div class="sec-hdr">PAYMENTS HISTORY</div>
      <table class="hist-table">
        <thead>
          <tr>
            <th>Date</th>
            <th class="r">Amount</th>
            <th>Mode</th>
            <th class="r">Balance</th>
          </tr>
        </thead>
        <tbody>
          ${historyRows}
        </tbody>
      </table>
    ` : ''}

    <div class="ftr-note">
      Note: This is a computer generated receipt and does not require a signature.
    </div>
  </div>
</body>
</html>`;
    },

    print: function (r) {
      var win = window.open("", "_blank");
      if (!win) return alert("Please allow pop-ups to print receipt.");
      win.document.write(this.buildReceiptHtml(r));
      win.document.close();
      win.focus();
      setTimeout(function () { win.print(); }, 300);
    },

    share: function (r) {
      var self = this;

      function loadHtml2Pdf() {
        if (window.html2pdf) return Promise.resolve(window.html2pdf);

        return new Promise(function (resolve, reject) {
          var existing = document.querySelector('script[data-receipt-html2pdf="1"]');
          if (existing) {
            existing.addEventListener("load", function () { resolve(window.html2pdf); }, { once: true });
            existing.addEventListener("error", function () { reject(new Error("Could not load the PDF generator.")); }, { once: true });
            return;
          }

          var script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
          script.async = true;
          script.setAttribute("data-receipt-html2pdf", "1");
          script.onload = function () {
            if (window.html2pdf) resolve(window.html2pdf);
            else reject(new Error("PDF generator loaded incorrectly."));
          };
          script.onerror = function () {
            reject(new Error("Could not load the PDF generator."));
          };
          document.head.appendChild(script);
        });
      }

      function waitForImages(doc) {
        var images = Array.prototype.slice.call(doc.images || []);
        if (!images.length) return Promise.resolve();

        return Promise.all(images.map(function (img) {
          if (img.complete) return Promise.resolve();
          return new Promise(function (resolve) {
            img.onload = resolve;
            img.onerror = resolve;
          });
        }));
      }

      return loadHtml2Pdf().then(function (html2pdf) {
        var holder = document.createElement("iframe");
        holder.style.position = "fixed";
        holder.style.left = "-100000px";
        holder.style.top = "0";
        holder.style.width = "794px";
        holder.style.height = "1123px";
        holder.style.border = "0";

        /*
         * IMPORTANT:
         * Do not use visibility:hidden here.
         *
         * html2canvas/html2pdf can treat content inside a hidden iframe as
         * non-renderable, which produces a valid but completely blank PDF.
         * Keep the iframe rendered, but place it far outside the viewport.
         */
        holder.style.visibility = "visible";
        holder.style.opacity = "1";
        holder.style.pointerEvents = "none";
        holder.style.zIndex = "-1";
        document.body.appendChild(holder);

        var doc = holder.contentWindow.document;
        doc.open();
        doc.write(self.buildReceiptHtml(r));
        doc.close();

        return new Promise(function (resolve, reject) {
          setTimeout(function () {
            waitForImages(doc).then(function () {
              var target = doc.querySelector(".receipt-card");
              if (!target) {
                holder.remove();
                reject(new Error("Could not prepare the receipt for download."));
                return;
              }

              html2pdf()
                .set({
                  margin: [10, 10, 10, 10],
                  filename: "Fee-Receipt-" + String(r.receiptId || "Receipt") + ".pdf",
                  image: { type: "jpeg", quality: 0.98 },
                  html2canvas: {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: "#ffffff"
                  },
                  jsPDF: {
                    unit: "mm",
                    format: "a4",
                    orientation: "portrait"
                  },
                  pagebreak: { mode: ["css", "legacy"] }
                })
                .from(target)
                .save()
                .then(function () {
                  holder.remove();
                  resolve();
                })
                .catch(function (err) {
                  holder.remove();
                  reject(err);
                });
            }).catch(function (err) {
              holder.remove();
              reject(err);
            });
          }, 300);
        });
      });
    },

    // ---------------------------------------------------------------------
    // A4 MULTI-PAGE FULL AUDIT LEDGER (Split Subtables & Fee Type Closing)
    // ---------------------------------------------------------------------
    buildFullAuditLedgerHtml: function (auditData) {
      var s = auditData.student || {};

      var yearSections = (auditData.perYear || []).map(function (y, idx) {
        var chargeRows = (y.charges || []).map(function (c) {
          return (
            '<tr>' +
            '<td>' + esc(c.label) + '</td>' +
            '<td class="r">₹ ' + formatInr(c.assigned) + '</td>' +
            '<td class="r">₹ ' + formatInr(c.paid) + '</td>' +
            '<td class="r">₹ ' + formatInr(c.balance) + '</td>' +
            '</tr>'
          );
        }).join("");

        // Gather all allocations for this academic year
        var yAllocs = [];
        (auditData.receipts || []).forEach(function (p) {
          (p.allocations || []).forEach(function (a) {
            if (a.year === y.year) {
              yAllocs.push({
                receiptId: p.receiptId,
                date: p.date,
                mode: p.mode,
                label: a.label,
                amount: Number(a.amount) || 0
              });
            }
          });
        });

        // Group allocations by Fee Head
        var byFeeType = {};
        yAllocs.forEach(function (al) {
          (byFeeType[al.label] = byFeeType[al.label] || []).push(al);
        });

        var waterfallOrder = ["Study Materials Fee", "Old Due", "Misc Fee", "Tuition Fee", "Transport Fee"];
        var sortedTypeNames = Object.keys(byFeeType).sort(function (a, b) {
          var ia = waterfallOrder.indexOf(a), ib = waterfallOrder.indexOf(b);
          if (ia !== -1 && ib !== -1) return ia - ib;
          if (ia !== -1) return -1;
          if (ib !== -1) return 1;
          return a.localeCompare(b);
        });

        // Build a dedicated payment subtable for each fee head (Oldest to Newest)
        var feeTypePaymentSubtables = sortedTypeNames.map(function (ftName) {
          var list = byFeeType[ftName].slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
          var typeTotalPaid = list.reduce(function (sum, x) { return sum + x.amount; }, 0);

          var matchingCharge = (y.charges || []).find(function (c) { return c.label === ftName || c.code === ftName; });
          var headAssigned = matchingCharge ? matchingCharge.assigned : typeTotalPaid;
          var headClosingBal = Math.max(0, headAssigned - typeTotalPaid);

          var pTrs = list.map(function (p) {
            return (
              '<tr>' +
              '<td><b>' + esc(p.receiptId) + '</b></td>' +
              '<td>' + esc(formatDate(p.date)) + '</td>' +
              '<td>' + esc(p.mode) + '</td>' +
              '<td class="r">₹ ' + formatInr(p.amount) + '</td>' +
              '</tr>'
            );
          }).join("");

          return `
            <div class="sec-subhdr" style="margin-top:10px;">${esc(ftName)} Payments (Collected: ₹ ${formatInr(typeTotalPaid)})</div>
            <table class="ledger-tbl">
              <thead>
                <tr>
                  <th>Receipt ID</th>
                  <th>Date</th>
                  <th>Mode</th>
                  <th class="r">Amount Paid</th>
                </tr>
              </thead>
              <tbody>
                ${pTrs}
                <tr class="summary-row">
                  <td colspan="3"><b>${esc(ftName)} Closing Pending Balance</b></td>
                  <td class="r"><b>₹ ${formatInr(headClosingBal)}</b></td>
                </tr>
              </tbody>
            </table>
          `;
        }).join("") || '<div style="font-size:11px;color:#64748b;margin:8px 0;font-style:italic;">No payments recorded in this academic year.</div>';

        return `
          <div class="year-block ${idx > 0 ? 'page-break' : ''}">
            <div class="year-hdr">Academic Year: ${esc(y.year)} (${esc(y.className || "Grade")})</div>
            
            <div class="sec-subhdr">ASSIGNED FEE STRUCTURE</div>
            <table class="ledger-tbl">
              <thead>
                <tr>
                  <th>Fee Head</th>
                  <th class="r">Assigned</th>
                  <th class="r">Collected</th>
                  <th class="r">Pending Balance</th>
                </tr>
              </thead>
              <tbody>
                ${chargeRows || '<tr><td colspan="4">No assigned charges.</td></tr>'}
                <tr class="summary-row total">
                  <td>Year Total / Closing Balance</td>
                  <td class="r">₹ ${formatInr(y.charged)}</td>
                  <td class="r">₹ ${formatInr(y.collected)}</td>
                  <td class="r">₹ ${formatInr(y.balance)}</td>
                </tr>
              </tbody>
            </table>

            <div class="sec-subhdr" style="margin-top:12px;font-weight:800;color:#8a1618;">PAYMENTS RECEIVED IN ${esc(y.year)} BY CATEGORY</div>
            ${feeTypePaymentSubtables}
          </div>
        `;
      }).join("");

      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Full Audit Ledger - ${esc(s.name)}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 0; }
    .ledger-card { border: 1px solid #cbd5e1; padding: 18px; max-width: 800px; margin: 0 auto; }
    
    .hdr-logo-container { text-align: center; margin-bottom: 8px; border-bottom: 1.5px solid #8a1618; padding-bottom: 8px; }
    .hdr-logo-img { width: 100%; max-height: 85px; object-fit: contain; display: block; margin: 0 auto; }
    .doc-title { font-size: 13px; font-weight: 800; color: #8a1618; text-transform: uppercase; text-align: center; letter-spacing: 1px; margin: 8px 0 12px; }
    
    .meta-tbl { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    .meta-tbl td { padding: 6px 10px; font-size: 12px; border: 1px solid #cbd5e1; }
    .meta-tbl td.k { background: #f8fafc; font-weight: 700; color: #475569; width: 15%; }
    
    .year-block { margin-bottom: 22px; }
    .page-break { page-break-before: always; margin-top: 14px; }
    
    .year-hdr { font-size: 13px; font-weight: 800; color: #8a1618; background: #fff1f2; padding: 6px 10px; border: 1px solid #fecdd3; margin-bottom: 8px; border-radius: 4px; }
    .sec-subhdr { font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px; }
    
    .ledger-tbl { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    .ledger-tbl th, .ledger-tbl td { border: 1px solid #cbd5e1; padding: 6px 9px; font-size: 11.5px; text-align: left; }
    .ledger-tbl th { background: #f1f5f9; font-weight: 700; color: #334155; }
    .ledger-tbl td.r, .ledger-tbl th.r { text-align: right; }
    .ledger-tbl tr.summary-row { background: #fafafa; font-weight: 600; }
    .ledger-tbl tr.total { background: #fff1f2; font-weight: 800; color: #8a1618; }
    
    .ftr { font-size: 10px; color: #64748b; text-align: center; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="ledger-card">
    <div class="hdr-logo-container">
      <img src="receipt-header-logo.png" class="hdr-logo-img" alt="Sapthagiri High School" crossorigin="anonymous" onerror="this.style.display='none';"/>
    </div>
    <div class="doc-title">OFFICIAL FULL STUDENT AUDIT LEDGER</div>

    <table class="meta-tbl">
      <tr>
        <td class="k">Student Name</td>
        <td><b>${esc(s.name)}</b></td>
        <td class="k">Student ID</td>
        <td><b>${esc(s.id)}</b></td>
      </tr>
      <tr>
        <td class="k">Father's Name</td>
        <td>${esc(s.father || "—")}</td>
        <td class="k">Contact No.</td>
        <td>${esc(s.phone || "—")}</td>
      </tr>
    </table>

    ${yearSections}

    <div class="ftr">
      Printed on: ${esc(new Date().toLocaleString("en-IN"))} · Computer Generated Full Student Audit Ledger
    </div>
  </div>
</body>
</html>`;
    },

    shareAuditLedger: function (auditData) {
      var win = window.open("", "_blank");
      if (!win) return alert("Please allow pop-ups to print ledger.");
      win.document.write(this.buildFullAuditLedgerHtml(auditData));
      win.document.close();
      win.focus();
      setTimeout(function () { win.print(); }, 300);
    }
  };

  window.ReceiptShare = ReceiptShare;
})(window);

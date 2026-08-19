/* =========================================================================
   fee-ledger-view.js — Read-only mobile Fees & Ledger
   Principal / Management quick lookup.

   Read-only means:
     • no fee editing
     • no payment collection
     • no write operations

   It does NOT mean the lookup controls are disabled. Academic year,
   class and student selectors remain fully usable for fast browsing.
   ========================================================================= */
(function () {
  "use strict";

  var P = window.Portal;
  var session = P.Session && P.Session.get ? P.Session.get() : null;
  var isPhone = (window.innerWidth || document.documentElement.clientWidth || 9999) < 900;
  var isAdmin = !!(session &&
    String(session.role || "").toLowerCase() === "management" &&
    String(session.name || "").trim().toLowerCase() ===
      String((P.CONFIG || {}).ADMIN_USER_NAME || "Admin").trim().toLowerCase());

  if (!session) {
    location.replace("login.html");
    return;
  }

  if (!isPhone || !isAdmin) {
    location.replace("fee-management.html");
    return;
  }

  session = P.bootPage("feeview");
  if (!session) return;

  var esc = P.esc;
  var $ = function (id) { return document.getElementById(id); };

  var S = {
    boot: null,
    year: "",
    className: "",
    student: null,
    finance: null,
    statement: null,
    ledgerFilter: "ALL",
    timer: null
  };

  css();
  boot();

  function boot() {
    $("view").innerHTML = loading("Loading fees…");

    P.api("feeBootstrap", [], { overlay: false }).then(function (b) {
      S.boot = b || {};
      S.year = S.boot.currentYear || "";
      renderShell();
      loadClasses();
    }).catch(function (e) {
      $("view").innerHTML = errorBox(e);
    });
  }

  function renderShell() {
    var years = (S.boot.years || []).slice();

    if (S.year && years.indexOf(S.year) < 0) years.push(S.year);

    years.sort(function (a, b) { return yn(b) - yn(a); });

    $("view").innerHTML =
      '<div class="flv-page">' +

        '<div class="flv-head">' +
          '<div>' +
            '<span class="flv-eyebrow">FEES · READ ONLY</span>' +
            '<h1><i class="material-icons">account_balance_wallet</i> Fees &amp; Ledger</h1>' +
            '<p>View student fees, balances and payment history.</p>' +
          '</div>' +
          '<div class="flv-live"><i class="material-icons">visibility</i><span>View only</span></div>' +
        '</div>' +

        '<div class="flv-search-card">' +
          '<div class="flv-search">' +
            '<i class="material-icons">search</i>' +
            '<input id="flvSearch" type="search" autocomplete="off" placeholder="Search name, student ID or phone…">' +
            '<button id="flvClear" class="flv-clear" type="button">&times;</button>' +
          '</div>' +
          '<div id="flvResults" class="flv-results"></div>' +

          '<div class="flv-divider"><span>or browse by class</span></div>' +

          '<div class="flv-pickers">' +
            picker("Academic Year",
              '<select id="flvYear">' +
                years.map(function (y) {
                  return '<option value="' + esc(y) + '"' +
                    (y === S.year ? ' selected' : '') + '>' +
                    esc(y) + '</option>';
                }).join("") +
              '</select>') +

            picker("Class",
              '<select id="flvClass">' +
                '<option value="">Select class…</option>' +
              '</select>') +

            picker("Student",
              '<select id="flvStudent">' +
                '<option value="">Select a student…</option>' +
              '</select>') +
          '</div>' +
        '</div>' +

        '<div id="flvContent">' +
          '<div class="flv-empty">' +
            '<i class="material-icons">person_search</i>' +
            '<b>Find a student</b>' +
            '<span>Search by name, ID or phone, or browse a class above.</span>' +
          '</div>' +
        '</div>' +

      '</div>';

    $("flvSearch").addEventListener("input", function () {
      var q = this.value.trim();
      clearTimeout(S.timer);
      S.timer = setTimeout(function () { search(q); }, 220);
    });

    $("flvClear").onclick = function () {
      $("flvSearch").value = "";
      $("flvResults").innerHTML = "";
      $("flvSearch").focus();
    };

    $("flvYear").onchange = function () {
      S.year = this.value;
      S.className = "";
      $("flvStudent").innerHTML = '<option value="">Select a student…</option>';
      loadClasses();
    };

    $("flvClass").onchange = function () {
      S.className = this.value;
      loadStudents();
    };

    $("flvStudent").onchange = function () {
      if (this.value) openStudent(this.value);
    };
  }

  function loadClasses() {
    var sel = $("flvClass");
    if (!sel) return;

    /*
     * Deliberately NOT disabled.
     * Loading state is represented by the option text, not by disabling
     * the control. This keeps the browse controls usable on touch devices.
     */
    sel.innerHTML = '<option value="">Loading classes…</option>';
    sel.classList.add("flv-loading-select");

    P.api("feeGetClasses", [S.year], { overlay: false }).then(function (rows) {
      rows = (rows || []).slice().sort(gradeSort);

      sel.innerHTML =
        '<option value="">Select class…</option>' +
        rows.map(function (x) {
          return '<option value="' + esc(x) + '">' + esc(x) + '</option>';
        }).join("");

      sel.classList.remove("flv-loading-select");

      if (S.className && rows.indexOf(S.className) >= 0) {
        sel.value = S.className;
        loadStudents();
      }
    }).catch(function () {
      sel.innerHTML = '<option value="">Unable to load classes</option>';
      sel.classList.remove("flv-loading-select");
    });
  }

  function loadStudents() {
    var cls = $("flvClass");
    var sel = $("flvStudent");

    if (!sel) return;

    if (!cls || !cls.value) {
      sel.innerHTML = '<option value="">Select a student…</option>';
      return;
    }

    sel.innerHTML = '<option value="">Loading students…</option>';
    sel.classList.add("flv-loading-select");

    P.api("feeGetStudents", [S.year, cls.value], { overlay: false }).then(function (rows) {
      rows = (rows || []).slice().sort(function (a, b) {
        return (Number(a.roll_number) || 999999) - (Number(b.roll_number) || 999999) ||
          String(a.name || "").localeCompare(String(b.name || ""));
      });

      sel.innerHTML =
        '<option value="">Select a student…</option>' +
        rows.map(function (x) {
          return '<option value="' + esc(x.id) + '">' +
            esc(x.name) +
            (x.inactive ? " · " + esc(x.status || "Inactive") : "") +
            '</option>';
        }).join("");

      sel.classList.remove("flv-loading-select");
    }).catch(function () {
      sel.innerHTML = '<option value="">Unable to load students</option>';
      sel.classList.remove("flv-loading-select");
    });
  }

  function search(q) {
    var box = $("flvResults");
    if (!box) return;

    if (!q) {
      box.innerHTML = "";
      return;
    }

    if (q.length < 2) {
      box.innerHTML = '<div class="flv-hint">Type at least 2 characters.</div>';
      return;
    }

    box.innerHTML =
      '<div class="flv-loading"><span class="flv-spinner"></span> Searching…</div>';

    P.api("feeSearchStudents", [q], { overlay: false }).then(function (res) {
      var rows = (res && res.rows) || [];

      if (!rows.length) {
        box.innerHTML = '<div class="flv-hint">No students found.</div>';
        return;
      }

      box.innerHTML = rows.slice(0, 20).map(function (s) {
        var due = Number(s.outstanding) || 0;
        var meta = [s.id, s.className, s.phone]
          .filter(Boolean)
          .map(esc)
          .join(" · ");

        return '<button type="button" class="flv-result" data-id="' + esc(s.id) + '">' +
          '<span class="flv-result-avatar">' + esc(initials(s.name)) + '</span>' +
          '<span class="flv-result-main">' +
            '<b>' + esc(s.name) + '</b>' +
            '<small>' + meta + '</small>' +
          '</span>' +
          '<span class="flv-result-due ' + (due > 0 ? "has-due" : "clear") + '">' +
            (due > 0 ? "Due " + money(due) : "Clear") +
          '</span>' +
          '<span class="flv-result-status">' +
            esc(s.inactive ? (s.status || "Inactive") : "Active") +
          '</span>' +
        '</button>';
      }).join("");

      Array.prototype.forEach.call(
        box.querySelectorAll(".flv-result"),
        function (el) {
          el.onclick = function () {
            box.innerHTML = "";
            $("flvSearch").value = "";
            openStudent(el.getAttribute("data-id"));
          };
        }
      );
    }).catch(function (e) {
      box.innerHTML = errorBox(e);
    });
  }

  function openStudent(id) {
    $("flvContent").innerHTML = loading("Loading student ledger…");

    /*
     * Statement is the source of truth for the year/category/payment ledger.
     * Finance is retained for the overall outstanding figure.
     */
    Promise.all([
      P.api("feeGetStudentFinance", [id], { overlay: false }),
      P.api("feeGetStatement", [id, null], { overlay: false })
    ]).then(function (r) {
      S.finance = r[0] || {};
      S.statement = r[1] || {};
      S.student = S.statement.student || S.finance.student;
      S.ledgerFilter = "ALL";
      renderStudent();
    }).catch(function (e) {
      $("flvContent").innerHTML = errorBox(e);
    });
  }

  function renderStudent() {
    var s = S.student || {};
    var st = S.statement || {};
    var f = S.finance || {};

    var current = (S.boot && S.boot.currentYear) || f.suggestedYear || S.year;
    var years = (st.allYears || []).slice();

    if (current && years.indexOf(current) < 0) years.push(current);

    years.sort(function (a, b) { return yn(b) - yn(a); });

    if (!S.year || years.indexOf(S.year) < 0) {
      S.year = current || years[0] || "";
    }

    var y = findYear(st.perYear, S.year) || {
      year: S.year,
      className: "",
      charged: 0,
      collected: 0,
      balance: 0,
      charges: []
    };

    var due = Number(y.balance) || 0;
    var assigned = Number(y.charged) || 0;
    var collected = Number(y.collected) || 0;

    var allDue = Number(f.totalOutstanding);
    if (!isFinite(allDue)) allDue = Number(st.closingBalance) || 0;

    var yearBtns = years.map(function (yr) {
      var yy = findYear(st.perYear, yr);
      var bal = yy ? Number(yy.balance) || 0 : 0;

      return '<button type="button" class="flv-year ' +
        (yr === S.year ? "active" : "") +
        '" data-year="' + esc(yr) + '">' +
          '<span>' + esc(yr) + '</span>' +
          '<b class="' + (bal > 0 ? "due" : "clear") + '">' +
            (bal > 0 ? money(bal) : "Clear") +
          '</b>' +
      '</button>';
    }).join("");

    var charges = (y.charges || []).slice();

    var feeRows = charges.map(function (c) {
      var d = Number(c.balance) || 0;

      return '<div class="flv-fee-row">' +
        '<div class="flv-fee-name">' +
          '<span class="flv-fee-icon">' +
            '<i class="material-icons">' + feeIcon(c.code) + '</i>' +
          '</span>' +
          '<div>' +
            '<b>' + esc(c.label) + '</b>' +
            '<small class="' + (d > 0 ? "pending" : "cleared") + '">' +
              (d > 0 ? "Pending" : "Cleared") +
            '</small>' +
          '</div>' +
        '</div>' +
        '<div class="flv-fee-num">' +
          '<small>Assigned</small><b>' + money(c.assigned) + '</b>' +
        '</div>' +
        '<div class="flv-fee-num">' +
          '<small>Paid</small><b>' + money(c.paid) + '</b>' +
        '</div>' +
        '<div class="flv-fee-num due-num">' +
          '<small>Balance</small><b>' + money(d) + '</b>' +
        '</div>' +
      '</div>';
    }).join("");

    if (!feeRows) {
      feeRows =
        '<div class="flv-no-data">' +
          '<i class="material-icons">receipt_long</i>' +
          'No fee assignments recorded for this year.' +
        '</div>';
    }

    var feeOptions =
      '<option value="ALL">All payments</option>' +
      charges.map(function (c) {
        return '<option value="' + esc(c.code) + '">' +
          esc(c.label) +
        '</option>';
      }).join("");

    $("flvContent").innerHTML =
      '<section class="flv-student-card">' +
        '<div class="flv-student-top">' +
          '<div class="flv-student-avatar">' + esc(initials(s.name)) + '</div>' +
          '<div class="flv-student-copy">' +
            '<h2>' + esc(s.name || "Student") + '</h2>' +
            '<div class="flv-student-meta">' +
              '<span><i class="material-icons">badge</i>' + esc(s.id || "") + '</span>' +
              '<span><i class="material-icons">school</i>' +
                esc(y.className || "Class not recorded") +
              '</span>' +
              (s.phone ?
                '<span><i class="material-icons">phone</i>' + esc(s.phone) + '</span>' :
                '') +
            '</div>' +
            (s.father ?
              '<div class="flv-father">Father: ' + esc(s.father) + '</div>' :
              '') +
          '</div>' +
          '<button type="button" id="flvNewSearch" class="flv-icon-btn" ' +
            'title="Search another student">' +
            '<i class="material-icons">person_search</i>' +
          '</button>' +
        '</div>' +
      '</section>' +

      '<section class="flv-yearbar">' +
        '<div class="flv-section-label">ACADEMIC YEAR</div>' +
        '<div class="flv-years">' + yearBtns + '</div>' +
      '</section>' +

      '<section class="flv-summary">' +
        '<div class="flv-due-card ' + (due > 0 ? "has-due" : "clear") + '">' +
          '<div>' +
            '<span>Year balance</span>' +
            '<b>' + money(due) + '</b>' +
            '<small>' + esc(S.year) + ' · ' +
              (due > 0 ? "Outstanding" : "Cleared") +
            '</small>' +
          '</div>' +
          '<i class="material-icons">' +
            (due > 0 ? "account_balance_wallet" : "verified") +
          '</i>' +
        '</div>' +

        '<div class="flv-stat">' +
          '<span>Assigned</span><b>' + money(assigned) + '</b>' +
        '</div>' +

        '<div class="flv-stat">' +
          '<span>Paid</span><b class="green">' + money(collected) + '</b>' +
        '</div>' +

        '<div class="flv-stat">' +
          '<span>All-year balance</span>' +
          '<b class="' + (allDue > 0 ? "red" : "green") + '">' +
            money(allDue) +
          '</b>' +
        '</div>' +
      '</section>' +

      '<section class="flv-section">' +
        '<div class="flv-section-head">' +
          '<div>' +
            '<span class="flv-eyebrow">FEE STRUCTURE</span>' +
            '<h3>Assigned fees</h3>' +
          '</div>' +
          '<span class="flv-badge">' + esc(S.year) + '</span>' +
        '</div>' +
        '<div class="flv-fee-list">' + feeRows + '</div>' +
      '</section>' +

      '<section class="flv-section flv-ledger-section">' +
        '<div class="flv-section-head flv-ledger-head">' +
          '<div>' +
            '<span class="flv-eyebrow">LEDGER</span>' +
            '<h3>Payment statement</h3>' +
          '</div>' +
          '<select id="flvFeeFilter" class="flv-ledger-filter">' +
            feeOptions +
          '</select>' +
        '</div>' +
        '<div id="flvLedgerBody"></div>' +
      '</section>' +

      '<div class="flv-note">' +
        '<i class="material-icons">lock</i>' +
        '<span>Read only: this view cannot change fee assignments or payments.</span>' +
      '</div>';

    $("flvFeeFilter").value = S.ledgerFilter;

    $("flvFeeFilter").onchange = function () {
      S.ledgerFilter = this.value || "ALL";
      renderLedger(y, st);
    };

    renderLedger(y, st);

    Array.prototype.forEach.call(
      document.querySelectorAll(".flv-year"),
      function (b) {
        b.onclick = function () {
          S.year = b.getAttribute("data-year");
          S.ledgerFilter = "ALL";
          renderStudent();
          window.scrollTo({ top: 0, behavior: "smooth" });
        };
      }
    );

    $("flvNewSearch").onclick = function () {
      $("flvSearch").focus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
  }

  /*
   * Professional ledger:
   *
   * ALL PAYMENTS:
   *   Shows every non-void receipt that has an allocation to the selected
   *   academic year, grouped chronologically.
   *
   * CATEGORY:
   *   Shows only allocations belonging to the selected fee category.
   *   The summary always shows Assigned / Paid / Balance for that category.
   *
   * The running balance is derived from the assigned amount minus the
   * cumulative allocations shown in the ledger.
   */
  function renderLedger(y, st) {
    var body = $("flvLedgerBody");
    if (!body) return;

    var charges = (y && y.charges) || [];
    var filter = S.ledgerFilter || "ALL";
    var selectedCharge = null;

    charges.forEach(function (c) {
      if (String(c.code) === String(filter)) selectedCharge = c;
    });

    var assigned = 0;
    var paid = 0;
    var balance = 0;

    if (selectedCharge) {
      assigned = Number(selectedCharge.assigned) || 0;
      paid = Number(selectedCharge.paid) || 0;
      balance = Number(selectedCharge.balance) || 0;
    } else {
      assigned = charges.reduce(function (n, c) {
        return n + (Number(c.assigned) || 0);
      }, 0);

      paid = charges.reduce(function (n, c) {
        return n + (Number(c.paid) || 0);
      }, 0);

      balance = charges.reduce(function (n, c) {
        return n + (Number(c.balance) || 0);
      }, 0);
    }

    var payments = ledgerPayments(st.receipts || [], S.year, filter);
    var label = selectedCharge ? selectedCharge.label : "All fee categories";

    /*
     * Mobile ledger is deliberately a vertical financial flow, not a table.
     *
     * 1. Assigned amount is established at the top.
     * 2. Each payment is shown as a + amount.
     * 3. The running balance is shown immediately after that payment.
     * 4. The final closing balance is shown at the bottom.
     *
     * This makes the arithmetic readable with one thumb-scroll and avoids
     * any horizontal scrolling on a phone.
     */
    var running = assigned;
    var flow = "";

    flow +=
      '<div class="flv-flow-opening">' +
        '<div class="flv-flow-node">' +
          '<span class="flv-flow-dot assigned"><i class="material-icons">assignment</i></span>' +
          '<span class="flv-flow-line"></span>' +
        '</div>' +
        '<div class="flv-flow-card opening-card">' +
          '<div class="flv-flow-card-head">' +
            '<div>' +
              '<span class="flv-flow-kicker">ASSIGNED FEE</span>' +
              '<b>' + esc(label) + '</b>' +
            '</div>' +
            '<strong>' + money(assigned) + '</strong>' +
          '</div>' +
          '<div class="flv-flow-sub">Starting amount for ' + esc(S.year) + '</div>' +
        '</div>' +
      '</div>';

    if (!payments.length) {
      flow +=
        '<div class="flv-flow-empty">' +
          '<div class="flv-flow-empty-icon"><i class="material-icons">payments</i></div>' +
          '<b>No payments recorded</b>' +
          '<span>' +
            (selectedCharge
              ? 'No payment has been allocated to ' + esc(selectedCharge.label) + ' yet.'
              : 'No payments have been allocated to ' + esc(S.year) + '.') +
          '</span>' +
        '</div>';
    } else {
      payments.forEach(function (p, index) {
        running = Math.max(0, running - p.amount);

        flow +=
          '<div class="flv-flow-payment">' +
            '<div class="flv-flow-node">' +
              '<span class="flv-flow-dot payment"><i class="material-icons">south</i></span>' +
              '<span class="flv-flow-line"></span>' +
            '</div>' +

            '<div class="flv-flow-card payment-card">' +
              '<div class="flv-flow-date">' +
                esc(P.prettyDate(p.date)) +
              '</div>' +

              '<div class="flv-flow-payment-main">' +
                '<div class="flv-flow-payment-info">' +
                  '<b>' + esc(p.mode || "Payment") + '</b>' +
                  '<span>Receipt ' + esc(p.receiptId || "—") + '</span>' +
                '</div>' +
                '<strong class="flv-positive">+' + money(p.amount) + '</strong>' +
              '</div>' +

              '<div class="flv-flow-balance">' +
                '<span>Balance after payment</span>' +
                '<b class="' + (running > 0 ? "pending" : "cleared") + '">' +
                  money(running) +
                '</b>' +
              '</div>' +
            '</div>' +
          '</div>';
      });

      flow +=
        '<div class="flv-flow-closing">' +
          '<div class="flv-flow-node">' +
            '<span class="flv-flow-dot ' + (balance > 0 ? "pending-dot" : "cleared-dot") + '">' +
              '<i class="material-icons">' + (balance > 0 ? "account_balance_wallet" : "check") + '</i>' +
            '</span>' +
          '</div>' +
          '<div class="flv-flow-card closing-card">' +
            '<span class="flv-flow-kicker">CLOSING BALANCE</span>' +
            '<strong class="' + (balance > 0 ? "pending" : "cleared") + '">' +
              money(balance) +
            '</strong>' +
            '<span>' + (balance > 0 ? "Amount still pending" : "Fee fully settled") + '</span>' +
          '</div>' +
        '</div>';
    }

    body.innerHTML =
      '<div class="flv-ledger-category">' +
        '<div>' +
          '<span>Showing</span>' +
          '<b>' + esc(label) + '</b>' +
        '</div>' +
        '<div class="flv-ledger-category-count">' +
          payments.length + ' payment' + (payments.length === 1 ? "" : "s") +
        '</div>' +
      '</div>' +

      '<div class="flv-ledger-summary">' +
        '<div>' +
          '<span>Assigned</span>' +
          '<b>' + money(assigned) + '</b>' +
        '</div>' +
        '<div>' +
          '<span>Paid</span>' +
          '<b class="green">' + money(paid) + '</b>' +
        '</div>' +
        '<div>' +
          '<span>Balance</span>' +
          '<b class="' + (balance > 0 ? "red" : "green") + '">' +
            money(balance) +
          '</b>' +
        '</div>' +
      '</div>' +

      '<div class="flv-flow" aria-label="Payment flow">' +
        flow +
      '</div>';
  }

  /*
   * Convert the statement receipts into category-aware ledger rows.
   *
   * Important: allocation year, not receipt year, determines which
   * academic-year ledger a payment settles. This follows the finance
   * model used by the backend.
   */
  function ledgerPayments(receipts, year, feeCode) {
    var out = [];

    (receipts || []).forEach(function (p) {
      if (p.status === "Void") return;

      var allocations = (p.allocations || []).filter(function (a) {
        if (a.year !== year) return false;
        if (feeCode === "ALL") return true;
        return String(a.feeTypeCode || a.code || "") === String(feeCode);
      });

      var amount = allocations.reduce(function (n, a) {
        return n + (Number(a.amount) || 0);
      }, 0);

      if (amount > 0) {
        out.push({
          receiptId: p.receiptId,
          date: p.date,
          mode: p.mode,
          amount: amount
        });
      }
    });

    return out.sort(function (a, b) {
      return String(a.date) < String(b.date) ? -1 : 1;
    });
  }

  function findYear(rows, year) {
    return (rows || []).find(function (x) {
      return x.year === year;
    }) || null;
  }

  function feeIcon(code) {
    code = String(code || "").toUpperCase();

    if (code === "OLD_DUE") return "history";
    if (code.indexOf("TUITION") >= 0) return "school";
    if (code.indexOf("TRANSPORT") >= 0) return "directions_bus";
    if (code.indexOf("STUDY") >= 0 || code.indexOf("MATERIAL") >= 0) return "menu_book";

    return "receipt_long";
  }

  function picker(label, html) {
    return '<label class="flv-picker">' +
      '<span>' + esc(label) + '</span>' +
      html +
    '</label>';
  }

  function loading(t) {
    return '<div class="flv-loading-card">' +
      '<span class="flv-spinner"></span>' +
      '<b>' + esc(t) + '</b>' +
    '</div>';
  }

  function errorBox(e) {
    return '<div class="flv-error">' +
      '<i class="material-icons">error_outline</i>' +
      '<b>Unable to load fees</b>' +
      '<span>' + esc(e && e.message ? e.message : e) + '</span>' +
    '</div>';
  }

  function money(n) {
    n = Number(n) || 0;
    return "₹" + n.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  function yn(y) {
    var m = String(y || "").match(/\d{4}/);
    return m ? Number(m[0]) : 0;
  }

  function initials(n) {
    var p = String(n || "").trim().split(/\s+/).filter(Boolean);
    if (p.length < 2) return (p[0] || "?").charAt(0).toUpperCase();
    return (p[0].charAt(0) + p[p.length - 1].charAt(0)).toUpperCase();
  }

  function gradeWeight(n) {
    var k = String(n || "").toUpperCase().replace(/\s+/g, "");

    if (k === "NURSERY") return 1;
    if (k === "LKG") return 2;
    if (k === "UKG") return 3;

    var m = k.match(/\d+/);
    return m ? 100 + Number(m[0]) : 999;
  }

  function gradeSort(a, b) {
    return gradeWeight(a) - gradeWeight(b) ||
      String(a).localeCompare(String(b));
  }

  function css() {
    if ($("flv-css")) return;

    var s = document.createElement("style");
    s.id = "flv-css";

    s.textContent = [
      ".flv-page{max-width:680px;margin:0 auto;padding:0 0 28px;color:#202638}",
      ".flv-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:14px}",
      ".flv-head h1{margin:2px 0 4px;font-size:21px;line-height:1.15;letter-spacing:-.25px;color:var(--maroon);display:flex;align-items:center;gap:7px}",
      ".flv-head h1 i{font-size:21px}",
      ".flv-head p{margin:0;color:var(--text-muted);font-size:12px;line-height:1.35}",
      ".flv-eyebrow{font-size:10px;font-weight:900;letter-spacing:.9px;color:var(--maroon)}",
      ".flv-live{display:inline-flex;align-items:center;gap:5px;padding:7px 10px;border-radius:999px;background:#ecfdf5;border:1px solid #ccefe0;color:#15803d;font-size:10px;font-weight:800;white-space:nowrap}",
      ".flv-live i{font-size:16px}",

      ".flv-search-card,.flv-student-card,.flv-section{background:#fff;border:1px solid var(--border);border-radius:16px;box-shadow:0 5px 18px rgba(15,23,42,.045)}",
      ".flv-search-card{padding:13px;margin-bottom:13px}",
      ".flv-search{display:flex;align-items:center;gap:8px;background:#f8fafc;border:1px solid #dfe5ec;border-radius:12px;padding:10px 11px;min-height:46px}",
      ".flv-search:focus-within{background:#fff;border-color:#c99b9b;box-shadow:0 0 0 3px rgba(138,22,24,.07)}",
      ".flv-search>i{color:var(--maroon);font-size:21px}",
      ".flv-search input{border:0;outline:0;background:transparent;flex:1;min-width:0;font:inherit;font-size:15px;line-height:1.2}",
      ".flv-clear{border:0;background:#e2e8f0;color:#475569;width:27px;height:27px;border-radius:50%;font-size:19px;cursor:pointer;flex:0 0 27px}",

      ".flv-results{margin-top:7px}",
      ".flv-result{width:100%;display:grid;grid-template-columns:40px minmax(0,1fr) auto;grid-template-rows:auto auto;column-gap:9px;align-items:center;text-align:left;border:1px solid var(--border);background:#fff;border-radius:12px;padding:10px;min-height:58px;margin-top:6px;cursor:pointer;font:inherit}",
      ".flv-result:hover{background:#fff8f8;border-color:#d7b2b2}",
      ".flv-result-avatar{grid-row:1/3;width:36px;height:36px;border-radius:10px;background:#f7eeee;color:var(--maroon);display:grid;place-items:center;font-size:12px;font-weight:900}",
      ".flv-result-main{min-width:0}",
      ".flv-result-main b{display:block;font-size:13.5px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".flv-result-main small{display:block;color:var(--text-muted);font-size:10.5px;line-height:1.25;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".flv-result-due{grid-column:3;grid-row:1;font-size:11px;font-weight:900;justify-self:end}",
      ".flv-result-due.has-due{color:#dc2626}.flv-result-due.clear{color:#059669}",
      ".flv-result-status{grid-column:3;grid-row:2;justify-self:end;font-size:9.5px;color:#64748b;font-weight:700}",

      ".flv-divider{display:flex;align-items:center;gap:8px;margin:12px 0 9px;color:#94a3b8;font-size:10.5px;font-weight:800}",
      ".flv-divider:before,.flv-divider:after{content:'';height:1px;background:#e9edf2;flex:1}",
      ".flv-pickers{display:grid;grid-template-columns:1fr 1fr 1.25fr;gap:8px}",
      ".flv-picker{display:flex;flex-direction:column;gap:5px}",
      ".flv-picker>span{font-size:10.5px;font-weight:800;color:#64748b}",
      ".flv-picker select,.flv-ledger-filter{width:100%;min-height:44px;padding:9px 10px;border:1px solid #dfe5ec;border-radius:10px;background:#fff;color:#202638;font:inherit;font-size:13px;line-height:1.2;outline:none;cursor:pointer;appearance:auto;-webkit-appearance:auto;touch-action:manipulation}",
      "body.mobile-admin .flv-picker select,body.mobile-admin .flv-ledger-filter{pointer-events:auto !important;background:#fff !important;cursor:pointer !important}",
      ".flv-picker select:focus,.flv-ledger-filter:focus{border-color:#b77979;box-shadow:0 0 0 3px rgba(138,22,24,.07)}",
      ".flv-picker select.flv-loading-select{color:#64748b}",

      ".flv-empty,.flv-loading-card,.flv-error{background:#fff;border:1px dashed var(--border);border-radius:15px;padding:34px 18px;text-align:center;color:var(--text-muted);display:flex;flex-direction:column;align-items:center;gap:7px}",
      ".flv-empty i{font-size:36px;color:#b77979}",
      ".flv-empty b{font-size:14px;color:#334155}",
      ".flv-empty span,.flv-error span{font-size:11.5px;line-height:1.4}",
      ".flv-loading-card{border-style:solid;min-height:110px;justify-content:center}",
      ".flv-loading{padding:10px;color:#64748b;font-size:12px;font-weight:700;display:flex;align-items:center;gap:7px}",
      ".flv-hint{padding:10px;color:#64748b;font-size:11.5px;font-weight:700}",
      ".flv-spinner{width:18px;height:18px;border:2px solid #e5d5d5;border-top-color:var(--maroon);border-radius:50%;display:inline-block;animation:flvSpin .7s linear infinite}",
      "@keyframes flvSpin{to{transform:rotate(360deg)}}",
      ".flv-error{border-style:solid;border-color:#f0caca;background:#fffafa}",
      ".flv-error i{font-size:30px;color:#b91c1c}",
      ".flv-error b{color:#991b1b;font-size:13px}",

      ".flv-student-card{padding:13px 14px;margin-bottom:12px}",
      ".flv-student-top{display:flex;align-items:center;gap:10px}",
      ".flv-student-avatar{width:46px;height:46px;flex:0 0 46px;border-radius:13px;background:var(--maroon);color:#fff;display:grid;place-items:center;font-weight:900;font-size:14px}",
      ".flv-student-copy{min-width:0;flex:1}",
      ".flv-student-copy h2{margin:0 0 4px;font-size:17px;line-height:1.2;color:#202638;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".flv-student-meta{display:flex;gap:7px;flex-wrap:wrap;color:#64748b;font-size:11px;line-height:1.25}",
      ".flv-student-meta span{display:inline-flex;align-items:center;gap:3px}",
      ".flv-student-meta i{font-size:14px;color:#9a5d5d}",
      ".flv-father{margin-top:4px;color:#64748b;font-size:10.5px}",
      ".flv-icon-btn{width:38px;height:38px;flex:0 0 38px;border:1px solid var(--border);background:#fff;border-radius:10px;color:var(--maroon);cursor:pointer;display:grid;place-items:center}",

      ".flv-yearbar{margin:0 0 12px}",
      ".flv-section-label{font-size:10px;font-weight:900;letter-spacing:.9px;color:#64748b;margin:0 0 6px}",
      ".flv-years{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}",
      ".flv-years::-webkit-scrollbar{display:none}",
      ".flv-year{border:1px solid var(--border);background:#fff;border-radius:10px;padding:8px 10px;min-width:108px;min-height:39px;display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;font:inherit;touch-action:manipulation}",
      ".flv-year span{font-size:11px;font-weight:800;color:#334155}",
      ".flv-year b{font-size:10px}",
      ".flv-year b.due{color:#dc2626}.flv-year b.clear{color:#059669}",
      ".flv-year.active{background:var(--maroon);border-color:var(--maroon)}",
      ".flv-year.active span,.flv-year.active b{color:#fff}",

      ".flv-summary{display:grid;grid-template-columns:1.4fr 1fr 1fr 1.2fr;gap:7px;margin-bottom:13px}",
      ".flv-due-card,.flv-stat{border:1px solid var(--border);border-radius:12px;background:#fff;padding:10px 11px;min-height:64px}",
      ".flv-due-card{display:flex;justify-content:space-between;align-items:center}",
      ".flv-due-card span,.flv-stat span{display:block;font-size:10px;color:#64748b;font-weight:800}",
      ".flv-due-card b{display:block;margin-top:3px;font-size:18px;line-height:1.1;color:#dc2626}",
      ".flv-due-card.clear b{color:#059669}",
      ".flv-due-card small{font-size:9.5px;color:#94a3b8}",
      ".flv-due-card>i{font-size:25px;color:#d8a3a3}",
      ".flv-due-card.clear>i{color:#86c9ad}",
      ".flv-stat b{display:block;margin-top:5px;font-size:14px;line-height:1.1;color:#202638}",
      ".flv-stat b.green{color:#059669}.flv-stat b.red{color:#dc2626}",

      ".flv-section{padding:13px;margin-bottom:12px}",
      ".flv-section-head{display:flex;align-items:center;justify-content:space-between;gap:9px;margin-bottom:9px}",
      ".flv-section-head h3{margin:2px 0 0;font-size:14px;line-height:1.2;color:#202638}",
      ".flv-badge{font-size:10px;font-weight:800;color:var(--maroon);background:#faf0f0;border:1px solid #ead6d6;border-radius:999px;padding:5px 8px;white-space:nowrap}",

      ".flv-fee-list{border:1px solid #edf0f3;border-radius:11px;overflow:hidden}",
      ".flv-fee-row{display:grid;grid-template-columns:minmax(150px,1.6fr) repeat(3,minmax(65px,.7fr));align-items:center;gap:6px;padding:10px;border-bottom:1px solid #f0f2f5}",
      ".flv-fee-row:last-child{border-bottom:0}",
      ".flv-fee-name{display:flex;align-items:center;gap:7px;min-width:0}",
      ".flv-fee-icon{width:29px;height:29px;border-radius:8px;background:#faf0f0;color:var(--maroon);display:grid;place-items:center;flex:0 0 29px}",
      ".flv-fee-icon i{font-size:16px}",
      ".flv-fee-name b{display:block;font-size:11.5px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".flv-fee-name small{display:block;margin-top:2px;font-size:9.5px}",
      ".flv-fee-name small.pending{color:#dc2626}.flv-fee-name small.cleared{color:#059669}",
      ".flv-fee-num{text-align:right}",
      ".flv-fee-num small{display:block;color:#94a3b8;font-size:8.5px;font-weight:700}",
      ".flv-fee-num b{font-size:11.5px;color:#334155}",
      ".flv-fee-num.due-num b{color:#dc2626}",

      ".flv-ledger-section{padding-bottom:14px}",
      ".flv-ledger-head{align-items:flex-end}",
      ".flv-ledger-filter{width:190px;min-height:42px;font-size:12.5px;font-weight:700}",

      ".flv-ledger-category{display:flex;justify-content:space-between;align-items:center;gap:10px;background:#f8fafc;border:1px solid #e8edf2;border-radius:11px;padding:9px 10px;margin-bottom:8px}",
      ".flv-ledger-category span{display:block;color:#94a3b8;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.5px}",
      ".flv-ledger-category b{display:block;margin-top:2px;color:#334155;font-size:12px;line-height:1.2}",
      ".flv-ledger-category-count{font-size:10px;font-weight:800;color:#64748b;white-space:nowrap}",

      ".flv-ledger-summary{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:12px}",
      ".flv-ledger-summary>div{background:#fff;border:1px solid #edf0f3;border-radius:10px;padding:9px}",
      ".flv-ledger-summary span{display:block;font-size:9.5px;color:#94a3b8;font-weight:800}",
      ".flv-ledger-summary b{display:block;margin-top:4px;font-size:13px;line-height:1.1;color:#334155}",
      ".flv-ledger-summary b.green{color:#059669}.flv-ledger-summary b.red{color:#dc2626}",

      /* Vertical bank-statement flow */
      ".flv-flow{position:relative;padding:0 1px}",
      ".flv-flow-opening,.flv-flow-payment,.flv-flow-closing{display:grid;grid-template-columns:28px minmax(0,1fr);column-gap:8px;position:relative}",
      ".flv-flow-node{position:relative;display:flex;justify-content:center;min-height:100%}",
      ".flv-flow-dot{width:27px;height:27px;border-radius:50%;display:grid;place-items:center;z-index:2;background:#fff;border:1px solid #dfe5ec}",
      ".flv-flow-dot i{font-size:15px}",
      ".flv-flow-dot.assigned{background:#f8eeee;border-color:#ead1d1;color:var(--maroon)}",
      ".flv-flow-dot.payment{background:#ecfdf5;border-color:#ccefe0;color:#059669}",
      ".flv-flow-dot.pending-dot{background:#fff7ed;border-color:#fed7aa;color:#c2410c}",
      ".flv-flow-dot.cleared-dot{background:#ecfdf5;border-color:#ccefe0;color:#059669}",
      ".flv-flow-line{position:absolute;top:27px;bottom:-8px;width:2px;background:#e7ebef;left:50%;transform:translateX(-50%)}",
      ".flv-flow-card{min-width:0;border:1px solid #e5e9ee;border-radius:12px;background:#fff;padding:11px 12px;margin-bottom:9px}",
      ".flv-flow-card.opening-card{background:#fffafa;border-color:#ead6d6}",
      ".flv-flow-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}",
      ".flv-flow-card-head b{display:block;margin-top:2px;font-size:13px;line-height:1.2;color:#334155}",
      ".flv-flow-card-head strong{font-size:16px;line-height:1.1;color:#334155;white-space:nowrap}",
      ".flv-flow-kicker{display:block;color:#94a3b8;font-size:9px;font-weight:900;letter-spacing:.7px}",
      ".flv-flow-sub{margin-top:4px;color:#94a3b8;font-size:10px;line-height:1.3}",
      ".flv-flow-date{font-size:12px;font-weight:900;color:#334155;margin-bottom:7px}",
      ".flv-flow-payment-main{display:flex;align-items:center;justify-content:space-between;gap:10px}",
      ".flv-flow-payment-info{min-width:0}",
      ".flv-flow-payment-info b{display:block;font-size:12px;line-height:1.2;color:#475569}",
      ".flv-flow-payment-info span{display:block;margin-top:3px;font-size:10px;line-height:1.25;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".flv-flow-payment-main strong{font-size:15px;line-height:1.1;white-space:nowrap}",
      ".flv-positive{color:#059669}",
      ".flv-flow-balance{display:flex;align-items:baseline;justify-content:space-between;gap:8px;border-top:1px solid #edf0f3;margin-top:9px;padding-top:8px}",
      ".flv-flow-balance span{font-size:10px;color:#64748b;font-weight:700}",
      ".flv-flow-balance b{font-size:13px}",
      ".flv-flow-balance b.pending{color:#dc2626}.flv-flow-balance b.cleared{color:#059669}",
      ".flv-flow-empty{margin:2px 0 10px 36px;padding:18px 12px;text-align:center;border:1px dashed #dfe5ec;border-radius:12px;color:#94a3b8}",
      ".flv-flow-empty-icon{width:32px;height:32px;border-radius:50%;margin:0 auto 6px;background:#f8fafc;display:grid;place-items:center}",
      ".flv-flow-empty-icon i{font-size:18px}",
      ".flv-flow-empty b{display:block;font-size:11.5px;color:#475569}",
      ".flv-flow-empty span{display:block;margin-top:3px;font-size:10px;line-height:1.35}",
      ".flv-flow-closing .flv-flow-node{padding-top:0}",
      ".flv-flow-closing .flv-flow-card{margin-bottom:0;background:#fafafa}",
      ".flv-flow-closing .flv-flow-card>strong{display:block;margin-top:3px;font-size:18px;line-height:1.1}",
      ".flv-flow-closing .flv-flow-card>strong.pending{color:#dc2626}.flv-flow-closing .flv-flow-card>strong.cleared{color:#059669}",
      ".flv-flow-closing .flv-flow-card>span:last-child{display:block;margin-top:3px;font-size:10px;color:#64748b}",

      ".flv-no-data{padding:22px;text-align:center;color:#94a3b8;font-size:11px}",
      ".flv-no-data i{font-size:24px;display:block;margin-bottom:4px}",
      ".flv-note{display:flex;align-items:center;gap:7px;padding:10px 12px;border-radius:11px;background:#f8fafc;border:1px solid #e8edf2;color:#64748b;font-size:10px;line-height:1.35}",
      ".flv-note i{font-size:16px;color:#94a3b8}",

      "@media(max-width:760px){",
        ".flv-page{padding-bottom:22px}",
        ".flv-head h1{font-size:20px}.flv-head h1 i{font-size:20px}.flv-head p{font-size:11.5px}",
        ".flv-pickers{grid-template-columns:1fr 1fr}",
        ".flv-summary{grid-template-columns:1.35fr 1fr 1fr}",
        ".flv-due-card{grid-column:1/-1}",
        ".flv-fee-row{grid-template-columns:1fr 1fr 1fr;gap:6px}",
        ".flv-fee-name{grid-column:1/-1}",
        ".flv-fee-num{text-align:left}",
        ".flv-fee-num.due-num{text-align:right}",
        ".flv-ledger-row{grid-template-columns:1fr}",
      "}",

      "@media(max-width:430px){",
        ".flv-head p{display:none}.flv-live span{display:none}",
        ".flv-pickers{grid-template-columns:1fr}",
        ".flv-summary{grid-template-columns:1fr 1fr}",
        ".flv-student-card{padding:12px}",
        ".flv-student-meta{gap:5px}",
        ".flv-student-meta span:nth-child(3){width:100%}",
        ".flv-ledger-head{align-items:flex-start;flex-direction:column}",
        ".flv-ledger-filter{width:100%;min-height:44px;font-size:13px}",
        ".flv-flow-card{padding:11px}",
        ".flv-flow-payment-main strong{font-size:14px}",
        ".flv-flow-card-head strong{font-size:15px}",
        ".flv-flow-empty{margin-left:0}",
      "}",

      "@media(min-width:900px){body{display:none!important}}",
      ".flv-admin-only{display:none!important}"
    ].join("\n");

    document.head.appendChild(s);
  }
})();

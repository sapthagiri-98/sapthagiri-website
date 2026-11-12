/* homework.js — Digital Homework Diary page.
   Plain script; uses the global `Portal`. Same features & look as before.
   WhatsApp actions open the DESKTOP app via Portal.waLink().
   Teacher: today-locked date, assignment cards, edit + AI proofread, No Homework, delete.
   Management: editable date, class rows + subject cards (override edit),
   share class diary, remind, bulk reminders, mark leave. Backend unchanged. */
(function () {
  "use strict";
  var P = window.Portal;
  var session = P.bootPage("homework");
  if (!session) return;

  var esc = P.esc, todayIso = P.todayIso, prettyDate = P.prettyDate, sortGrades = P.sortGrades;
  var $ = function (id) { return document.getElementById(id); };
  var isMgmt = (session.role === "Management" || session.role === "Tutor");
  var currentClass = "", currentSubject = "", mgmtOverviewCache = [];
  var curMobileHwClass = null;

  function isMobile() {
    return (window.innerWidth || document.documentElement.clientWidth || 0) <= 900;
  }

  function injectHwCss() {
    if (document.getElementById("hw-mob-css")) return;
    var st = document.createElement("style");
    st.id = "hw-mob-css";
    st.textContent =
      "@media(max-width:900px){" +
        ".hw-role{display:none!important;}" +
        "#hwMgmtActions{width:100%;margin-top:6px;}" +
        "#hwMgmtActions .btn{width:100%!important;justify-content:center;}" +
        ".hw-mob-class-card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,0.03);margin-bottom:10px;cursor:pointer;touch-action:manipulation;transition:transform 0.1s;}" +
        ".hw-mob-class-card:active{background:#f8fafc;transform:scale(0.99);}" +
        ".hw-mob-cc-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}" +
        ".hw-mob-cc-title{font-size:16px;font-weight:800;color:#0f172a;}" +
        ".hw-mob-cc-status{font-size:11.5px;font-weight:800;padding:3px 8px;border-radius:999px;}" +
        ".hw-mob-cc-status.done{background:#dcfce7;color:#15803d;}" +
        ".hw-mob-cc-status.pending{background:#fef3c7;color:#b45309;}" +
        ".hw-mob-cc-meta{font-size:12px;color:#64748b;display:flex;justify-content:space-between;align-items:center;margin-top:4px;}" +
        ".hw-mob-cc-bar{height:5px;background:#e2e8f0;border-radius:999px;overflow:hidden;margin-top:6px;}" +
        ".hw-mob-cc-fill{height:100%;border-radius:999px;background:#15803d;}" +
        ".hw-mob-detail-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;margin-bottom:12px;}" +
      "}";
    document.head.appendChild(st);
  }
  injectHwCss();

  // build a WhatsApp anchor without a literal <a> tag in source (paste-safe)
  var LT = String.fromCharCode(60), GT = String.fromCharCode(62);
  function waAnchor(cls, style, phone, message, inner) {
    return LT + 'a class="' + cls + '" href="' + P.waLink(phone, message) + '" style="' + style + '"' + GT + inner + LT + '/a' + GT;
  }

  $("view").innerHTML = shell();
  bind();
  applyDateLock();
  refresh();

  /* ---------------- markup ---------------- */
  function shell() {
    return '' +
    '<div class="card wide-card" id="homework-view">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;border-bottom:1px solid var(--border);padding-bottom:18px;margin-bottom:18px;">' +
        '<div><span class="eyebrow">Staff Portal</span><h2 style="margin-bottom:4px;">Digital Homework Diary</h2>' +
          '<div class="hw-role">Role: <strong id="hwRoleLabel">' + esc(session.role) + '</strong></div></div>' +
        '<div id="hwMgmtActions" style="display:' + (session.role === "Management" ? "block" : "none") + ';">' +
          '<button class="btn btn-warning-action" id="hwNotifyBtn" style="width:auto;padding:10px 16px;"><i class="material-icons" style="color:#fff;">notifications_active</i> Notify Missing Diaries</button></div>' +
      '</div>' +
      '<div class="smart-selector-row" style="max-width:420px;">' +
        '<div class="smart-selector" id="hwDateCell"><div class="ss-icon"><i class="material-icons">event</i></div>' +
          '<div class="ss-body"><div class="ss-label">Diary Date</div><input type="date" id="hwDate"><span class="ss-value" id="hwDateStatic" style="display:none;"></span></div></div>' +
      '</div>' +
      '<div id="hwContainer"></div>' +
    '</div>' +
    editModal() + aiModal() + bulkModal() + resultModal();
  }
  function editModal() {
    return '<div class="modal-overlay" id="hwEditModal"><div class="modal-content">' +
      '<div class="modal-header-container"><h3 id="hwModalTitle">Update Diary Entry</h3><button class="modal-close-icon" data-close="hwEditModal">&times;</button></div>' +
      '<div class="form-group"><label>Homework Instructions</label><textarea id="hwText" rows="5" placeholder="Enter instructions, readings or activities…"></textarea></div>' +
      '<div style="margin-bottom:16px;"><button class="btn btn-secondary" id="hwNoHwBtn" style="background:var(--success-light);color:#047857;border-color:#6ee7b7;"><i class="material-icons" style="color:#047857;">assignment_turned_in</i> Set as "No Homework"</button></div>' +
      '<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;">' +
        '<button class="btn btn-danger" id="hwDeleteBtn" style="width:auto;padding:12px 18px;display:none;"><i class="material-icons" style="color:#fff;">delete_forever</i></button>' +
        '<div style="display:flex;gap:12px;margin-left:auto;"><button class="btn btn-secondary" data-close="hwEditModal" style="width:auto;">Cancel</button><button class="btn btn-success" id="hwSaveBtn" style="width:auto;"><i class="material-icons" style="color:#fff;">save</i> Save</button></div>' +
      '</div></div></div>';
  }
  function aiModal() {
    return '<div class="modal-overlay" id="hwAiModal" style="z-index:2000;"><div class="modal-content">' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;color:var(--maroon);"><i class="material-icons" style="font-size:26px;color:var(--accent);">auto_awesome</i><h3 style="margin:0;font-size:18px;">Proofreading Assistant</h3></div>' +
      '<p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">Suggested fixes found. Choose which to keep:</p>' +
      '<div style="margin-bottom:12px;"><label>Your Input</label><div class="ai-box orig" id="hwAiOriginal"></div></div>' +
      '<div style="margin-bottom:20px;"><label style="color:var(--success);">Suggested</label><div class="ai-box sugg" id="hwAiSuggestion"></div></div>' +
      '<div style="display:flex;gap:12px;"><button class="btn btn-secondary" style="flex:1;" id="hwAiKeep">Keep Original</button><button class="btn btn-success" style="flex:1;" id="hwAiAccept">Accept Suggestion</button></div></div></div>';
  }
  function bulkModal() {
    return '<div class="modal-overlay" id="hwBulkModal"><div class="modal-content" style="max-width:640px;">' +
      '<div class="modal-header-container"><h3>Missing Diary Submissions</h3><button class="modal-close-icon" data-close="hwBulkModal">&times;</button></div>' +
      '<p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">These teachers have not submitted a diary update for the selected date:</p>' +
      '<div id="hwBulkList" style="max-height:350px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-lg);margin-bottom:16px;background:#fafafa;"></div>' +
      '<button class="btn btn-secondary" data-close="hwBulkModal">Close</button></div></div>';
  }
  function resultModal() {
    return '<div class="modal-overlay" id="hwResultModal"><div class="modal-content" style="text-align:center;">' +
      '<div id="hwResultIcon" style="width:60px;height:60px;border-radius:50%;display:grid;place-items:center;margin:0 auto 14px;"></div>' +
      '<h3 id="hwResultTitle" style="color:var(--maroon);margin-bottom:8px;"></h3><p id="hwResultMsg" style="color:var(--text-muted);font-size:14px;margin-bottom:20px;"></p>' +
      '<button class="btn" id="hwResultOk">OK</button></div></div>';
  }

  /* ---------------- events ---------------- */
  function bind() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-close]"), function (b) { b.addEventListener("click", function () { P.closeModal(b.getAttribute("data-close")); }); });
    Array.prototype.forEach.call(document.querySelectorAll(".modal-overlay"), function (m) { m.addEventListener("click", function (e) { if (e.target === m) P.closeModal(m.id); }); });
    $("hwDate").addEventListener("change", refresh);
    $("hwNoHwBtn").addEventListener("click", function () { $("hwText").value = "No Homework"; saveEntry(); });
    $("hwSaveBtn").addEventListener("click", saveEntry);
    $("hwDeleteBtn").addEventListener("click", deleteEntry);
    $("hwAiKeep").addEventListener("click", function () { confirmSave(false); });
    $("hwAiAccept").addEventListener("click", function () { confirmSave(true); });
    $("hwResultOk").addEventListener("click", function () { P.closeModal("hwResultModal"); });
    if ($("hwNotifyBtn")) $("hwNotifyBtn").addEventListener("click", openBulk);
  }
  function applyDateLock() {
    var cell = $("hwDateCell"), input = $("hwDate"), stat = $("hwDateStatic");
    if (session.role === "Management") { cell.classList.remove("locked"); input.style.display = ""; stat.style.display = "none"; input.value = todayIso(); }
    else { cell.classList.add("locked"); input.style.display = "none"; stat.style.display = "block"; input.value = todayIso(); stat.textContent = prettyDate(todayIso()) + " (Today)"; }
  }

  function refresh() {
    var date = $("hwDate").value, c = $("hwContainer");
    c.innerHTML = '<div class="inline-loader"><i class="material-icons">sync</i>Loading diary…</div>';
    P.api("getHomeworkHolidayStatus", [date], { text: "Checking day…" }).then(function (hol) {
      if (hol && hol.blocked) { c.innerHTML = '<div class="hw-holiday"><i class="material-icons">event_busy</i><div class="t">School Holiday</div><div class="r">' + esc(hol.reason || "Holiday") + '</div><div class="s">Homework diary entry is disabled on holidays.</div></div>'; return; }
      loadEntries();
    }).catch(function (e) { c.innerHTML = '<div class="hw-empty"><i class="material-icons">error_outline</i>' + esc(e.message || e) + '</div>'; });
  }
  function loadEntries() {
    var date = $("hwDate").value;
    if (isMgmt) P.api("getManagementOverview", [date], { perf: "Load Diary", text: "Loading diary…" }).then(function (data) { mgmtOverviewCache = data || []; renderMgmt(data || []); }).catch(function (e) { resultBox(false, "Load failed", e.message || String(e)); });
    else P.api("getAssignmentsByDate", [date, session.name], { perf: "Load Diary", text: "Loading diary…" }).then(function (list) { renderTeacher(list || []); }).catch(function (e) { resultBox(false, "Load failed", e.message || String(e)); });
  }

  function renderTeacher(assignments) {
    var c = $("hwContainer");
    if (!assignments.length) { c.innerHTML = '<div class="hw-empty"><i class="material-icons">event_note</i>No schedule assigned to your profile today.</div>'; return; }
    c.innerHTML = assignments.map(function (a) {
      var done = a.homework && String(a.homework).trim() !== "";
      return '<div class="hw-teacher-card ' + (done ? "done" : "") + '" data-cls="' + esc(a.className) + '" data-sub="' + esc(a.subject) + '">' +
        '<div class="hw-head"><span class="hw-cls">Class: ' + esc(a.className) + '</span><span class="period-badge">' + esc(a.periodLabel || "") + '</span></div>' +
        '<div class="hw-sub">Subject: ' + esc(a.subject) + '</div>' +
        '<div class="hw-display-box">' + (done ? esc(a.homework) : "✍️ No entry recorded. Click to add homework.") + '</div></div>';
    }).join("");
    Array.prototype.forEach.call(c.querySelectorAll(".hw-teacher-card"), function (card) { card.addEventListener("click", function () { openEdit(card.getAttribute("data-cls"), card.getAttribute("data-sub")); }); });
  }

  function renderMgmt(classes) {
    var c = $("hwContainer");
    if (!classes.length) { c.innerHTML = '<div class="hw-empty"><i class="material-icons">event_note</i>No structured entries found for this date.</div>'; return; }
    var date = $("hwDate").value, displayDate = date.split("-").reverse().join("-");
    var canOverride = session.role === "Management", canRemind = session.role === "Management";
    sortGrades(classes, function (item) { return item.className; });

    // MOBILE VIEW: Display compact class list first; clicking navigates into class detail view with close/back button
    if (isMobile()) {
      if (curMobileHwClass) {
        var cls = classes.filter(function (it) { return it.className === curMobileHwClass; })[0];
        if (!cls) { curMobileHwClass = null; renderMgmt(classes); return; }
        var pending = cls.subjects.filter(function (s) { return !s.homework && !s.isActivity; }).length;
        var status = pending === 0 ? '<span style="color:var(--success);font-weight:700;">✔ Completed</span>' : '<span style="color:var(--warning);font-weight:700;">⚠ ' + pending + ' Pending</span>';
        var shareTxt = "*Sapthagiri Homework Diary*\n*Date:* " + displayDate + "\n*Class:* " + cls.className + "\n\n";
        cls.subjects.forEach(function (s) { if (s.homework && !s.isActivity) shareTxt += "*" + s.subject + ":* " + s.homework + "\n\n"; });
        var shareBtn = (session.role === "Tutor") ? "" :
          waAnchor("btn btn-whatsapp", "width:auto;padding:8px 14px;font-size:13px;", "", shareTxt,
            '<i class="material-icons" style="color:#fff;">share</i> Share Class Diary');

        var cards = cls.subjects.map(function (s) {
          var done = s.homework && String(s.homework).trim() !== "";
          var locked = (session.role === "Tutor" && s.teacher !== session.name) || s.isActivity;
          var clickable = locked ? "" : "clickable";
          var dataAttr = locked ? "" : ('data-cls="' + esc(cls.className) + '" data-sub="' + esc(s.subject) + '"');
          var remindMsg = encodeURIComponent("Hello " + s.teacher + ", please fill missing diary updates for Class " + cls.className + " - " + s.subject + " on " + displayDate + ".");
          var remindBtn = (!done && s.phone && !s.isActivity && canRemind) ? '<button class="btn-remind" data-remind="' + s.phone + '|' + remindMsg + '"><i class="material-icons" style="font-size:14px;color:var(--warning);">notifications</i> Remind</button>' : "";
          return '<div class="subject-status-card ' + clickable + ' ' + (done ? "status-complete" : "status-pending") + '" ' + dataAttr + '>' +
            '<div><div class="ssc-top"><span class="ssc-name">' + esc(s.subject) + '</span><span class="period-badge">' + esc(s.periodLabel || "") + '</span></div>' +
            '<div class="ssc-teacher">Instructor: ' + esc(s.teacher || "-") + '</div>' +
            '<div class="ssc-hw">' + (done ? esc(s.homework) : '<em style="color:var(--text-muted);">No diary entry logged…</em>') + '</div></div>' +
            '<div class="ssc-actions">' + remindBtn + '</div></div>';
        }).join("");

        c.innerHTML =
          '<div class="hw-mob-detail-bar">' +
            '<button type="button" class="btn btn-secondary" id="hwMobBackBtn" style="padding:6px 12px;font-size:13px;font-weight:700;display:inline-flex;align-items:center;gap:4px;">' +
              '<i class="material-icons" style="font-size:16px;">arrow_back</i> All Classes' +
            '</button>' +
            '<div style="font-size:15px;font-weight:800;color:var(--brand-primary,#800000);">Class ' + esc(cls.className) + '</div>' +
          '</div>' +
          '<div class="mgmt-class-row">' +
            '<div class="mgmt-class-header"><div>Class ' + esc(cls.className) + ' &nbsp;&nbsp; ' + status + '</div>' + shareBtn + '</div>' +
            '<div class="mgmt-subject-grid">' + cards + '</div>' +
          '</div>';

        var backBtn = $("hwMobBackBtn");
        if (backBtn) {
          backBtn.addEventListener("click", function () {
            curMobileHwClass = null;
            renderMgmt(classes);
            window.scrollTo({ top: 0, behavior: "smooth" });
          });
        }
      } else {
        // Class list overview
        c.innerHTML = '<div class="hw-mob-class-grid">' + classes.map(function (cls) {
          var totalSub = cls.subjects.filter(function (s) { return !s.isActivity; }).length;
          var pending = cls.subjects.filter(function (s) { return !s.homework && !s.isActivity; }).length;
          var completed = totalSub - pending;
          var pct = totalSub > 0 ? Math.round((completed / totalSub) * 100) : 100;
          var statusBadge = pending === 0
            ? '<span class="hw-mob-cc-status done">✔ Completed</span>'
            : '<span class="hw-mob-cc-status pending">⚠ ' + pending + ' Pending</span>';
          return '<div class="hw-mob-class-card" data-mob-cls="' + esc(cls.className) + '">' +
            '<div class="hw-mob-cc-top"><span class="hw-mob-cc-title">Class ' + esc(cls.className) + '</span>' + statusBadge + '</div>' +
            '<div class="hw-mob-cc-meta"><span>' + totalSub + ' Subjects</span><span>' + completed + '/' + totalSub + ' Logged (' + pct + '%)</span></div>' +
            '<div class="hw-mob-cc-bar"><div class="hw-mob-cc-fill" style="width:' + pct + '%;' + (pending > 0 ? 'background:#d97706;' : '') + '"></div></div>' +
          '</div>';
        }).join("") + '</div>';

        Array.prototype.forEach.call(c.querySelectorAll(".hw-mob-class-card[data-mob-cls]"), function (card) {
          card.addEventListener("click", function () {
            curMobileHwClass = card.getAttribute("data-mob-cls");
            renderMgmt(classes);
            window.scrollTo({ top: 0, behavior: "smooth" });
          });
        });
      }
    } else {
      // DESKTOP VIEW
      c.innerHTML = classes.map(function (cls) {
        var pending = cls.subjects.filter(function (s) { return !s.homework && !s.isActivity; }).length;
        var status = pending === 0 ? '<span style="color:var(--success);font-weight:700;">✔ Completed</span>' : '<span style="color:var(--warning);font-weight:700;">⚠ ' + pending + ' Pending</span>';
        var shareTxt = "*Sapthagiri Homework Diary*\n*Date:* " + displayDate + "\n*Class:* " + cls.className + "\n\n";
        cls.subjects.forEach(function (s) { if (s.homework && !s.isActivity) shareTxt += "*" + s.subject + ":* " + s.homework + "\n\n"; });
        var shareBtn = (session.role === "Tutor") ? "" :
          waAnchor("btn btn-whatsapp", "width:auto;padding:8px 14px;font-size:13px;", "", shareTxt,
            '<i class="material-icons" style="color:#fff;">share</i> Share Class Diary');
        var cards = cls.subjects.map(function (s) {
          var done = s.homework && String(s.homework).trim() !== "";
          var locked = (session.role === "Tutor" && s.teacher !== session.name) || s.isActivity;
          var clickable = locked ? "" : "clickable";
          var dataAttr = locked ? "" : ('data-cls="' + esc(cls.className) + '" data-sub="' + esc(s.subject) + '"');
          var remindMsg = encodeURIComponent("Hello " + s.teacher + ", please fill missing diary updates for Class " + cls.className + " - " + s.subject + " on " + displayDate + ".");
          var remindBtn = (!done && s.phone && !s.isActivity && canRemind) ? '<button class="btn-remind" data-remind="' + s.phone + '|' + remindMsg + '"><i class="material-icons" style="font-size:14px;color:var(--warning);">notifications</i> Remind</button>' : "";
          return '<div class="subject-status-card ' + clickable + ' ' + (done ? "status-complete" : "status-pending") + '" ' + dataAttr + '>' +
            '<div><div class="ssc-top"><span class="ssc-name">' + esc(s.subject) + '</span><span class="period-badge">' + esc(s.periodLabel || "") + '</span></div>' +
            '<div class="ssc-teacher">Instructor: ' + esc(s.teacher || "-") + '</div>' +
            '<div class="ssc-hw">' + (done ? esc(s.homework) : '<em style="color:var(--text-muted);">No diary entry logged…</em>') + '</div></div>' +
            '<div class="ssc-actions">' + remindBtn + '</div></div>';
        }).join("");
        return '<div class="mgmt-class-row"><div class="mgmt-class-header"><div>Class ' + esc(cls.className) + ' &nbsp;&nbsp; ' + status + '</div>' + shareBtn + '</div><div class="mgmt-subject-grid">' + cards + '</div></div>';
      }).join("");
    }
    if (canOverride) Array.prototype.forEach.call(c.querySelectorAll(".subject-status-card.clickable[data-cls]"), function (card) { card.addEventListener("click", function () { openEdit(card.getAttribute("data-cls"), card.getAttribute("data-sub")); }); });
    // Remind teacher → WhatsApp Desktop
    Array.prototype.forEach.call(c.querySelectorAll("[data-remind]"), function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        var parts = b.getAttribute("data-remind").split("|");
        window.location.href = P.waLink(parts[0], decodeURIComponent(parts[1]));
      });
    });
  }

  function openEdit(className, subject) {
    currentClass = className; currentSubject = subject;
    $("hwModalTitle").textContent = className + " - " + subject;
    $("hwText").value = ""; $("hwDeleteBtn").style.display = "none";
    P.openModal("hwEditModal");
    P.api("getExistingHomework", [$("hwDate").value, className, subject], { text: "Loading entry…" }).then(function (res) {
      if (res && res.homework) { $("hwText").value = res.homework; if (["None (Leave)", "None (Holiday)", "No Homework"].indexOf(res.homework) < 0) $("hwDeleteBtn").style.display = "inline-flex"; }
    });
  }
  function saveEntry() {
    var hw = $("hwText").value; if (!hw.trim()) return;
    if (hw === "No Homework") { finalizeSave(hw); return; }
    var btn = $("hwSaveBtn"), orig = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<i class="material-icons" style="color:#fff;font-size:16px;">sync</i> Proofing…';
    P.api("enhanceHomeworkText", [hw], { overlay: false }).then(function (res) {
      btn.disabled = false; btn.innerHTML = orig;
      if (res && res.success && res.suggested && res.suggested !== hw) { $("hwAiOriginal").textContent = hw; $("hwAiSuggestion").textContent = res.suggested; P.openModal("hwAiModal"); }
      else finalizeSave(hw);
    }).catch(function () { btn.disabled = false; btn.innerHTML = orig; finalizeSave(hw); });
  }
  function confirmSave(useAI) { var text = useAI ? $("hwAiSuggestion").textContent : $("hwAiOriginal").textContent; P.closeModal("hwAiModal"); finalizeSave(text); }
  function finalizeSave(content) {
    P.closeModal("hwEditModal");
    var author = session.role === "Management" ? "Management Override" : session.name;
    P.api("saveHomework", [$("hwDate").value, currentClass, currentSubject, content, author], { perf: "Save Homework", text: "Saving…" })
      .then(function (msg) { resultBox(true, "Saved", String(msg || "Homework saved.")); refresh(); })
      .catch(function (e) { resultBox(false, "Save failed", e.message || String(e)); });
  }
  function deleteEntry() {
    if (!confirm("Permanently erase this diary entry?")) return;
    P.closeModal("hwEditModal");
    P.api("deleteHomework", [$("hwDate").value, currentClass, currentSubject], { text: "Deleting…" })
      .then(function (msg) { resultBox(true, "Deleted", String(msg || "Entry deleted.")); refresh(); })
      .catch(function (e) { resultBox(false, "Delete failed", e.message || String(e)); });
  }

  function openBulk() {
    var date = $("hwDate").value, displayDate = date.split("-").reverse().join("-"), map = {};
    mgmtOverviewCache.forEach(function (cls) { cls.subjects.forEach(function (s) { if (!s.homework && !s.isActivity) { if (!map[s.teacher]) map[s.teacher] = { name: s.teacher, phone: s.phone, items: [] }; map[s.teacher].items.push("Class " + cls.className + " (" + s.subject + ")"); } }); });
    var rows = Object.keys(map).map(function (k) {
      var t = map[k], msg = "Hello " + t.name + ", please fill missing diary updates for: " + t.items.join(", ") + " on " + displayDate + ".";
      var alertBtn = waAnchor("btn btn-whatsapp", "width:auto;padding:8px 12px;font-size:13px;height:36px;", t.phone, msg,
        '<i class="material-icons" style="font-size:16px;color:#fff;">send</i> Alert');
      return '<div class="bulk-list-item"><div style="flex:1;min-width:150px;"><strong>' + esc(t.name) + '</strong><div style="font-size:12px;color:var(--danger);font-weight:500;margin-top:2px;">Missing: ' + t.items.length + ' units</div></div>' +
        '<div style="display:flex;gap:8px;align-items:center;"><button class="btn btn-warning-action" data-leave="' + esc(t.name) + '" style="width:auto;padding:8px 12px;font-size:13px;height:36px;"><i class="material-icons" style="font-size:16px;color:#fff;">no_accounts</i> Leave</button>' +
        alertBtn + '</div></div>';
    }).join("");
    $("hwBulkList").innerHTML = rows || '<p style="padding:20px;text-align:center;color:var(--success);font-weight:600;">✔ All diary logs are filled.</p>';
    P.openModal("hwBulkModal");
    Array.prototype.forEach.call($("hwBulkList").querySelectorAll("[data-leave]"), function (b) { b.addEventListener("click", function () { markLeave(b.getAttribute("data-leave")); }); });
  }
  function markLeave(teacherName) {
    if (!confirm("Mark " + teacherName + " as on leave? This sets their entries to 'None (Leave)'.")) return;
    P.closeModal("hwBulkModal");
    P.api("globalMarkTeacherLeave", [$("hwDate").value, teacherName], { text: "Applying leave…" })
      .then(function (msg) { resultBox(true, "Leave applied", String(msg || "Teacher marked on leave.")); refresh(); })
      .catch(function (e) { resultBox(false, "Failed", e.message || String(e)); });
  }

  function resultBox(ok, title, msg) {
    var icon = $("hwResultIcon"); icon.style.background = ok ? "var(--success-light)" : "var(--danger-light)";
    icon.innerHTML = '<i class="material-icons" style="font-size:32px;color:' + (ok ? "var(--success)" : "var(--danger)") + ';">' + (ok ? "check_circle" : "error") + '</i>';
    $("hwResultTitle").textContent = title; $("hwResultMsg").textContent = msg; P.openModal("hwResultModal");
  }
})();

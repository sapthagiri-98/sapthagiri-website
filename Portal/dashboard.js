/* =========================================================================
   dashboard.js — the post-login Home screen (the app's navigation entry).
   Renders ONE card per module the user is allowed to see. The module list is
   NOT hardcoded here: it comes from Portal.getVisibleModules(session), which
   reuses the same Users-sheet-driven permission logic as the desktop sidebar.
   The dashboard IS the navigation, so the left sidebar is hidden on this page
   (handled by bootDashboard + the `dash-home` body class). Opening any module
   restores the normal sidebar. Kept intentionally minimal: no stats, charts
   or widgets — it only answers "what do you want to do next?".
   ========================================================================= */
(function () {
  "use strict";
  var P = window.Portal;
  var session = P.bootDashboard();
  if (!session) return; // bootDashboard already redirected to login

  var esc = P.esc;

  function greeting() {
    var h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  }

  var firstName = String(session.name || "").trim().split(/\s+/)[0] || "there";
  var isMgmt = session.role === "Management";
  var readOnly = P.isMobileAdmin(session);

  var modules = P.getVisibleModules(session);

  var cardsHtml;
  if (!modules.length) {
    cardsHtml =
      '<div class="dash-empty">' +
      '<i class="material-icons">lock</i>' +
      '<div class="t">No modules assigned yet</div>' +
      '<div class="s">Please contact the school office to enable your portal access.</div>' +
      '</div>';
  } else {
    cardsHtml = '<div class="dashboard-grid">' + modules.map(function (m) {
      return (
        '<a class="module-card" href="' + esc(m.href) + '" aria-label="' + esc(m.label) + '">' +
          '<span class="mc-icon"><i class="material-icons">' + esc(m.icon) + '</i></span>' +
          '<span class="mc-body">' +
            '<span class="mc-title">' + esc(m.label) + '</span>' +
            '<span class="mc-desc">' + esc(m.desc || "Open module") + '</span>' +
          '</span>' +
          '<i class="material-icons mc-chevron">chevron_right</i>' +
        '</a>'
      );
    }).join("") + '</div>';
  }

  // Compact, single-line greeting (no oversized hero). Management on mobile
  // gets the "monitoring" wording; everyone else a friendly welcome.
  var subLine = isMgmt ? "School Monitoring Portal" : "Sapthagiri Digital Portal";

  var roBanner = readOnly
    ? '<div class="dash-readonly"><i class="material-icons">visibility</i>' +
      '<span><strong>View-only mode</strong> — this mobile dashboard is for monitoring. ' +
      'Editing, entry and deletion are disabled here.</span></div>'
    : '';

  document.getElementById("view").innerHTML =
    '<section class="dash-greet">' +
      '<h1 class="dash-hello">' + greeting() + ', ' + esc(firstName) + ' \uD83D\uDC4B</h1>' +
      '<p class="dash-sub">' + subLine + '</p>' +
    '</section>' +
    roBanner +
    '<p class="dash-prompt">What would you like to do today?</p>' +
    cardsHtml;
})();

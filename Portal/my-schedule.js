/* =========================================================================
   my-schedule.js — Dedicated Teacher Schedule Page Controller
   ========================================================================= */
(function () {
  "use strict";

  var P = window.Portal;
  var session = P.bootPage("schedule");
  if (!session) return;

  var view = document.getElementById("view");
  if (!view) return;

  view.innerHTML =
    '<div class="my-sched-page" style="max-width:760px;margin:0 auto;">' +
      '<div id="myScheduleMount"></div>' +
    '</div>';

  if (window.TeacherSchedule) {
    window.TeacherSchedule.mount("myScheduleMount", session, { showFullLink: false });
  }
})();

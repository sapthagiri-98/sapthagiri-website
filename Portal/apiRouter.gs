// =========================================================================
// apiRouter.gs — the ONE backend gateway for the portal (cumulative).
// doGet()/doPost() in Code.gs already branch on e.parameter.api === "1"
// and call apiRouter_(e). This supplies that function.
//   * No spreadsheet logic here — it only DISPATCHES to functions that
//     already exist in Code.gs. Zero business-logic changes.
//   * Explicit whitelist. Nothing else is callable.
//   * Always returns HTTP 200 with { ok, data } / { ok:false, error }.
// Deployment: "Execute as me", "Anyone" access.
// =========================================================================

var API_HANDLERS = {
  // ---- Auth + accounts ----
  getUsers:                       function()                            { return getUsers(); },
  validateLogin:                  function(name, password)              { return validateLogin(name, password); },

  // ---- Daily Student Attendance ----
  getClasses:                     function(campusFilter)                { return getClasses(campusFilter); },
  getClassAttendanceSummary:      function(dateStr)                     { return getClassAttendanceSummary(dateStr); },
  loadStudents:                   function(cls, date, sess)             { return loadStudents(cls, date, sess); },
  getHolidaysForDate:             function(dateStr)                     { return getHolidaysForDate(dateStr); },
  saveAttendance:                 function(records)                     { return saveAttendance(records); },

  // ---- Monthly Student Attendance (bulk editor) ----
  getMonthlyAttendanceMatrix:     function(className, monthStr)         { return getMonthlyAttendanceMatrix(className, monthStr); },
  saveMonthlyAttendanceMatrix:    function(records)                     { return saveMonthlyAttendanceMatrix(records); },

  // ---- Holidays Management ----
  addHolidayEntry:                function(payload)                     { return addHolidayEntry(payload); },
  getAllHolidays:                 function()                            { return getAllHolidays(); },        // NEW (see README)
  deleteHolidayRow:               function(rowIndex)                    { return deleteHolidayRow(rowIndex); }, // NEW (see README)

  // ---- Digital Homework Diary ----
  getHomeworkHolidayStatus:       function(dateStr)                     { return getHomeworkHolidayStatus(dateStr); },
  getAssignmentsByDate:           function(date, teacher)               { return getAssignmentsByDate(date, teacher); },
  getManagementOverview:          function(date)                        { return getManagementOverview(date); },
  getExistingHomework:            function(date, cls, subject)          { return getExistingHomework(date, cls, subject); },
  saveHomework:                   function(date, cls, subject, hw, by)  { return saveHomework(date, cls, subject, hw, by); },
  deleteHomework:                 function(date, cls, subject)          { return deleteHomework(date, cls, subject); },
  enhanceHomeworkText:            function(text)                        { return enhanceHomeworkText(text); },
  globalMarkTeacherLeave:         function(date, teacher)               { return globalMarkTeacherLeave(date, teacher); },

  // ---- My Attendance Log (staff) ----
  getTimesheetData:               function(name, month)                 { return getTimesheetData(name, month); },
  getTeacherAvailableSalarySlips: function(name)                        { return getTeacherAvailableSalarySlips(name); },

  // ---- Staff Attendance (management) ----
  getManagementMonthlyBulkPayload: function(month)                      { return getManagementMonthlyBulkPayload(month); },

  // ---- Syllabus Tracker ----
  getTeacherClassSubjects:        function(teacher)                     { return getTeacherClassSubjects(teacher); },
  getSyllabusAndPlansCatalog:     function(grade, subject, teacher)     { return getSyllabusAndPlansCatalog(grade, subject, teacher); },
  extractTasksFromDrivePDF:       function(grade, subject, lesson, tch) { return extractTasksFromDrivePDF(grade, subject, lesson, tch); },
  saveTaskProgress:               function(taskKey, checked, tch, note) { return saveTaskProgress(taskKey, checked, tch, note); },
  regenerateTeluguForTask:        function(taskKey, grade, subj, lesson){ return regenerateTeluguForTask(taskKey, grade, subj, lesson); },
  getSessionDetailedExplanation:  function(grade, subj, lesson, sess, f){ return getSessionDetailedExplanation(grade, subj, lesson, sess, f); },
  getManagementTimelineAuditReport: function()                         { return getManagementTimelineAuditReport(); },
  getSyllabusDayTeachers:         function(campus)                      { return getSyllabusDayTeachers(campus); },
  getTeacherDayActivity:          function(date, teacher)               { return getTeacherDayActivity(date, teacher); },

  // ---- Examinations Management (admin) ----
  getAdminExamSummaryStats:       function()                            { return getAdminExamSummaryStats(); },
  getAdminExamCalendarPayload:    function(monthStr)                    { return getAdminExamCalendarPayload(monthStr); },
  getAdminExamsForDate:           function(dateStr)                     { return getAdminExamsForDate(dateStr); },
  getPendingScheduleExams:        function(filters)                     { return getPendingScheduleExams(filters); },
  getPendingExamNamesList:        function()                            { return getPendingExamNamesList(); },
  getPendingClassesList:          function()                            { return getPendingClassesList(); },
  getAllExamClasses:              function()                            { return getAllExamClasses(); },
  getAdminSubjectsForGrade:       function(grade)                       { return getAdminSubjectsForGrade(grade); },
  getSyllabusMasterLessons:       function(grade, subject)              { return getSyllabusMasterLessons(grade, subject); },
  createAdminExam:                function(payload)                     { return createAdminExam(payload); },
  updateAdminExam:                function(rowId, payload)              { return updateAdminExam(rowId, payload); },
  deleteAdminExam:                function(rowId)                       { return deleteAdminExam(rowId); },
  assignExamDate:                 function(rowId, d, t, dur, mk)        { return assignExamDate(rowId, d, t, dur, mk); },
  getAdminExamById:               function(rowId)                       { return getAdminExamById(rowId); },
  getExamNamePresets:             function()                            { return getExamNamePresets(); },
  examGetScheduleFilters:         function()                            { return examGetScheduleFilters(); },
  examGetScheduleTable:           function(examName, className)         { return examGetScheduleTable(examName, className); },
  examBulkSaveSchedule:           function(updates)                     { return examBulkSaveSchedule(updates); },

  // ---- Examinations Tracker (staff) ----
  getTeacherUpcomingExamsSummary: function(teacher)                     { return getTeacherUpcomingExamsSummary(teacher); },
  getTeacherExamCalendarPayload:  function(teacher, monthStr)           { return getTeacherExamCalendarPayload(teacher, monthStr); },
  getTeacherAssignedExamsForSyllabus: function(teacher)                 { return getTeacherAssignedExamsForSyllabus(teacher); },
  teacherAddExamSyllabus:         function(rowId, lessons, teacher)     { return teacherAddExamSyllabus(rowId, lessons, teacher); },

  // ---- Marks (teacher + admin) ----
  marksGetTeacherExamOptions:     function(teacher)                     { return marksGetTeacherExamOptions(teacher); },
  marksGetHighSchoolClasses:      function()                            { return marksGetHighSchoolClasses(); },
  marksGetGrid:                   function(cls, subj, bucket, comp)     { return marksGetGrid(cls, subj, bucket, comp); },
  marksGetAdminExamOptions:       function(className)                   { return marksGetAdminExamOptions(className); },
  marksGetClassGrid:              function(className, bucket, comp)     { return marksGetClassGrid(className, bucket, comp); },
  marksSaveBulk:                  function(payload)                     { return marksSaveBulk(payload); },
  marksSetLock:                   function(cls, bucket, comp, lock, by) { return marksSetLock(cls, bucket, comp, lock, by); },
  getTeacherPendingMarksSummary:  function(teacher)                     { return getTeacherPendingMarksSummary(teacher); },

  // ---- Holistic assessment ----
  getHolisticBuckets:             function(className)                   { return getHolisticBuckets(className); },
  getHolisticLockState:           function(className, bucket)           { return getHolisticLockState(className, bucket); },
  getHolisticAssignments:         function(teacher, className, bucket)  { return getHolisticAssignments(teacher, className, bucket); },
  getHolisticStudents:            function(cls, bucket, param, teacher) { return getHolisticStudents(cls, bucket, param, teacher); },
  saveHolisticMarks:              function(payload)                     { return saveHolisticMarks(payload); },
  holisticSetLock:                function(className, bucket, locked, by){ return holisticSetLock(className, bucket, locked, by); },
  runHolisticAutoAttendance:      function(className, bucket, adminName){ return runHolisticAutoAttendance(className, bucket, adminName); },

  // ---- Progress reports + class tabulation ----
  progressGetBucketList:          function()                            { return progressGetBucketList(); },
  progressGetClasses:             function()                            { return progressGetClasses(); },
  progressGetClassData:           function(className, bucket)           { return progressGetClassData(className, bucket); },
  progressGenerateReports:        function(payload)                     { return progressGenerateReports(payload); },
  progressGenerateTabulation:     function(payload)                     { return progressGenerateTabulation(payload); },

  // ---- Fee Ledger Database ----
  getFeeClasses:                  function(academicYear)                { return getFeeClasses(academicYear); },
  getFeeStudentsByClass:          function(academicYear, className)     { return getFeeStudentsByClass(academicYear, className); },
  getStudentFeeProfile:           function(academicYear, studentId)     { return getStudentFeeProfile(academicYear, studentId); },

  // ---- Health check for the perf harness ----
  ping:                           function()                            { return { pong: true, t: Date.now() }; }
};

function apiRouter_(e) {
  var out;
  try {
    var fn, args;
    if (e && e.postData && e.postData.contents) {
      var body = JSON.parse(e.postData.contents);
      fn = body.fn; args = body.args || [];
    } else if (e && e.parameter && e.parameter.fn) {
      fn = e.parameter.fn; args = e.parameter.args ? JSON.parse(e.parameter.args) : [];
    }
    if (!fn) throw new Error("No function specified.");
    if (!Object.prototype.hasOwnProperty.call(API_HANDLERS, fn)) throw new Error("Function not allowed: " + fn);
    if (!Array.isArray(args)) args = [args];
    out = { ok: true, data: API_HANDLERS[fn].apply(null, args) };
  } catch (err) {
    out = { ok: false, error: String(err && err.message ? err.message : err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

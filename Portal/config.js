/* =========================================================================
   config.js — the ONLY file you normally edit.
   Matches the school website's own config.js pattern (a global settings
   object). Loaded BEFORE portal.js on every page.
   ========================================================================= */
window.PORTAL_CONFIG = {
  // Apps Script Web App /exec URL (deployed: Execute as me, Access: Anyone).
  APPS_SCRIPT_URL:
    "https://script.google.com/macros/s/AKfycbwIU_XLq08agLFRFlEXBQN3g1nKIU16ieaEUdk2cG2LNBNn72KLl2o-L05OgETlGNji/exec",

  WEBSITE_URL: "../index.html",     // portal/ sits one level under the site root
  ADMIN_USER_NAME: "Admin",         // Admin logs in via the normal Users model

  // Where leave requests go (Apply for Leave → WhatsApp). Principal number.
  PRINCIPAL_WHATSAPP: "919246932393",

  // Performance measurement (prints before/after in the console; no badge).
  PERF: true,

  // Browser caches (ms). Attendance/homework/exam RECORDS are never cached;
  // these only speed up re-opening the SAME month on the heavy log screens.
  CLASS_TTL_MS: 30 * 60 * 1000,     // class list
  MONTH_TTL_MS: 90 * 1000,          // month timesheets (Refresh bypasses this)

  SCHOOL: {
    name: "Sapthagiri High School E/M", city: "Karimnagar",
    phone: "9381118421", whatsapp: "919381118421",
    email: "sapthagiri.98@gmail.com", address: "Karimnagar"
  }
};

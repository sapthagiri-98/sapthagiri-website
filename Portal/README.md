# Sapthagiri Digital Portal — update pack

Plain multi-page web app (no React, no build step). Drop these files into your
existing `/portal/` folder, replacing the same-named files and adding the new
ones. Your existing **`attendance.js`** and **`homework.js`** are unchanged —
keep them.

## What changed in this update

### 1. Settings moved out of `portal.js` → `config.js`
`APPS_SCRIPT_URL` (and phone, admin name, cache times, principal WhatsApp) now
live in **`config.js`** — the only file you normally edit. Every page loads
`config.js` **before** `portal.js`:

```html
<script src="config.js"></script>
<script src="portal.js"></script>
<script src="<page>.js"></script>
```

### 2. No badge — real, measurable optimisation
The floating timing badge is gone. Instead:
- The two heavy log screens **cache the month payload** (`config.js → MONTH_TTL_MS`, 90s).
  Re-opening a month is served instantly from cache. **Refresh** bypasses it.
- A small inline line shows the win, e.g.
  `⚡ Loaded from cache in 38 ms — first load was 3,140 ms (99% faster).`
- A console harness records every timing. In DevTools:
  ```js
  perf.report();          // table: baseline / cold avg / warm avg / improvement
  perf.resetBaseline();   // clear baselines to capture a fresh "before"
  ```
  The first COLD run per operation becomes the baseline; warm runs print
  `41ms (baseline 3140ms → 99% faster)`.

### 3. Two new modules (features intact, wording simplified)
- **`attendance-log.html` + `attendance-log.js`** — *My Attendance Log* (staff):
  month picker, Present/Late/Absent/Half-day counts, colour-dot calendar with a
  tap-to-open day detail (Clock In/Out, status, any shortfall), **salary slips**
  list, and **Apply for Leave** (opens WhatsApp to the Principal).
  Backend: `getTimesheetData`, `getTeacherAvailableSalarySlips` (unchanged).
- **`staff-attendance.html` + `staff-attendance.js`** — *Staff Attendance* (admin):
  month picker, calendar with per-day P/L/H/A counts, tap-a-day drilldown with
  name lists, and a plain-English **Monthly Summary** table (Present, Late, Half,
  Absent, Leaves Used). Backend: `getManagementMonthlyBulkPayload` (unchanged).

Jargon was rewritten for readability — e.g. “Institutional biometric logs /
discrepancy notes / calculated leaves deducted” → “Clock In/Out / Notes /
Leaves Used”.

## Backend
Replace **`apiRouter.gs`** in the Apps Script project (it now whitelists
`getTimesheetData`, `getTeacherAvailableSalarySlips`,
`getManagementMonthlyBulkPayload`). **No `Code.gs` logic changed.** Redeploy the
Web App as *Execute as me / Anyone*.

## Files in this pack
```
config.js                  (new)   settings incl. APPS_SCRIPT_URL
portal.js                  (replace) reads config.js, perf harness, nav
portal.css                 (replace) adds styles for the two new screens
login.html, attendance.html, homework.html, coming-soon.html (replace: add config.js tag)
attendance-log.html / .js  (new)   My Attendance Log
staff-attendance.html / .js(new)   Staff Attendance
apiRouter.gs               (replace) adds the 3 new endpoints
attendance.js, homework.js (KEEP your existing files — unchanged)
```

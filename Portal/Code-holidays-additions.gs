// =========================================================================
// Code.gs ADDITIONS for Holidays Management (student vs staff holidays).
// Paste these TWO new functions anywhere in Code.gs (e.g. right after the
// existing addHolidayEntry). They reuse helpers you already have:
//   _getHolidayMasterSheet_, _normDateIsoAny_, _accessIsTrue_
// Then apply the 2 small EDITS described in README-student-attendance-holidays.md
// =========================================================================

// List every declared holiday for the Holidays Management screen.
function getAllHolidays() {
  const sheet = _getHolidayMasterSheet_();
  if (sheet.getLastRow() <= 1) return [];
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, Math.max(sheet.getLastColumn(), 7)).getValues();
  const out = [];
  for (let i = 0; i < data.length; i++) {
    const r = data[i];
    if (!r[0] && !r[1]) continue;
    const classesRaw = String(r[3] || "").trim();
    const isAll = /^(all|all classes|\*)$/i.test(classesRaw);
    const staffRaw = String(r[6] == null ? "" : r[6]).trim();          // Column G = "Applies To Staff"
    const appliesToStaff = (staffRaw === "") ? isAll : _accessIsTrue_(staffRaw); // blank = legacy behaviour
    out.push({
      rowIndex: i + 2,
      reason: String(r[0] || ""),
      dateFrom: _normDateIsoAny_(r[1]),
      dateTo: _normDateIsoAny_(r[2]),
      classes: isAll ? "ALL" : classesRaw,
      session: String(r[4] || ""),
      addedOn: String(r[5] || ""),
      appliesToStaff: appliesToStaff
    });
  }
  out.sort(function (a, b) { return String(b.dateFrom).localeCompare(String(a.dateFrom)); }); // newest first
  return out;
}

// Delete one holiday row (rowIndex is the 1-based sheet row from getAllHolidays).
function deleteHolidayRow(rowIndex) {
  try {
    const sheet = _getHolidayMasterSheet_();
    const r = parseInt(rowIndex, 10);
    if (!r || r < 2 || r > sheet.getLastRow()) return { success: false, error: "Invalid row." };
    sheet.deleteRow(r);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

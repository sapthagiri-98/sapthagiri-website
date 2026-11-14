/* =========================================================================
   timetable-import-parser.js — XLSX Timetable Parser
   Uses SheetJS (xlsx) to parse Excel files and extract structured timetable data
   ========================================================================= */
(function () {
  "use strict";

  // SheetJS instance
  var XLSX = typeof window !== 'undefined' && window.XLSX ? window.XLSX : null;

  // Load SheetJS: check window.XLSX, then local file, then CDN
  function loadSheetJS() {
    return new Promise(function (resolve, reject) {
      if (typeof window !== 'undefined' && window.XLSX) {
        XLSX = window.XLSX;
        resolve(XLSX);
        return;
      }
      if (XLSX) {
        resolve(XLSX);
        return;
      }

      // Try local script first
      var scriptLocal = document.createElement('script');
      scriptLocal.src = 'xlsx.full.min.js';
      scriptLocal.onload = function () {
        XLSX = window.XLSX;
        resolve(XLSX);
      };
      scriptLocal.onerror = function () {
        // Fallback to CDN
        var scriptCdn = document.createElement('script');
        scriptCdn.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
        scriptCdn.onload = function () {
          XLSX = window.XLSX;
          resolve(XLSX);
        };
        scriptCdn.onerror = function () {
          reject(new Error('Failed to load SheetJS library (both local and CDN failed)'));
        };
        document.head.appendChild(scriptCdn);
      };
      document.head.appendChild(scriptLocal);
    });
  }

  // Normalize class name to match database format
  function normalizeClassName(raw) {
    if (!raw) return null;
    var s = String(raw).trim().toUpperCase()
      .replace(/\s+/g, ' ')
      .replace(/\.0+$/, '');

    if (!s) return null;

    // Pre-KG / Nursery / LKG / UKG normalization
    if (/^(PRE[- ]?KG|PREKG|NURSERY)$/i.test(s)) return 'NURSERY';
    if (/^LKG$/i.test(s)) return 'LKG';
    if (/^UKG$/i.test(s)) return 'UKG';

    // Grade normalization: GRADE-1, GRADE-2, etc.
    var gradeMatch = s.match(/^(?:GRADE|CLASS)?[- ]?(\d+)$/i);
    if (gradeMatch) return 'GRADE-' + gradeMatch[1];

    return s;
  }

  // Parse subject and teacher cell content (supports \n and |)
  function parseCellContent(cellValue) {
    if (!cellValue) return { subject: '', teacher: '', isActivity: false };

    var str = String(cellValue).trim();
    if (!str || str === '-' || str === '—' || str === 'N/A') {
      return { subject: '', teacher: '', isActivity: false };
    }

    // Split by newline or pipe
    var rawParts = str.split(/[\r\n|]+/).map(function (p) { return p.trim(); }).filter(Boolean);

    // Filter out common header noise if cell accidentally contains header terms
    var parts = rawParts.filter(function (p) {
      var up = p.toUpperCase();
      return up !== 'PERIOD' && up !== 'BREAK' && up !== 'LUNCH' && up !== 'DIARY' && up !== 'ASSEMBLY' && up !== 'CHECKING';
    });

    if (parts.length === 0) return { subject: '', teacher: '', isActivity: false };

    var subject = parts[0] || '';
    var teacher = parts.length > 1 ? parts[1] : '';

    // Strip emojis and icon symbols, preserving Telugu (0C00-0C7F) and Hindi (0900-097F)
    subject = subject
      .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
      .replace(/[\u{2600}-\u{27BF}]/gu, '')
      .replace(/📖|📐|🚀|🧲|🌱|🎨|💡|💬|🧠|♫|🌐|🍪|🍚/g, '')
      .trim();

    // Normalize Telugu and Hindi scripts to canonical English for ERP, Exams, and Teacher scheduling compatibility
    if (/^తెలుగు/i.test(subject) || subject === 'తెలుగు') {
      subject = 'Telugu';
    } else if (/^(?:हिंदी|हिन्दी)/i.test(subject) || subject === 'हिंदी' || subject === 'हिन्दी') {
      subject = 'Hindi';
    }

    // Clean up teacher: remove titles like Mr., Mrs., Ms., Dr., Sir, Madam
    teacher = teacher
      .replace(/^(MR\.|MRS\.|MS\.|DR\.|SIR|MADAM)\s+/i, '')
      .replace(/\s+(SIR|MADAM)$/i, '')
      .trim();

    // Map common timetable nicknames to canonical ERP user account names
    if (/^satish$/i.test(teacher)) {
      teacher = 'Sathish';
    } else if (/^knr$/i.test(teacher)) {
      teacher = 'Narsimha Reddy Kasireddy';
    }

    // Check if activity
    var activityKeywords = [
      'SPORTS', 'GAMES', 'KARATE', 'DANCE', 'ART', 'PET', 'LEISURE', 'YOGA',
      'MUSIC', 'CRAFT', 'RHYMES', 'STORIES', 'DRAWING', 'PAINTING',
      'MARTIAL ARTS', 'PHYSICAL EDUCATION', 'INDOOR GAMES', 'OUTDOOR GAMES',
      'ART ZONE', 'CREATIVE ACTIVITIES'
    ];
    var isActivity = activityKeywords.some(function (kw) {
      return subject.toUpperCase().includes(kw);
    });

    return { subject: subject, teacher: teacher, isActivity: isActivity };
  }

  // Determine day pattern from sheet name
  function detectDayPattern(sheetName) {
    var name = String(sheetName || '').toLowerCase().trim();
    if (/\b(monday|mon)\b/i.test(name) || /mon$/i.test(name)) return 'monday';
    if (/\b(tuesday|tue)\b/i.test(name) || /tue$/i.test(name)) return 'tuesday';
    if (/\b(wednesday|wed)\b/i.test(name) || /wed$/i.test(name)) return 'wednesday';
    if (/\b(thursday|thu)\b/i.test(name) || /thu$/i.test(name)) return 'thursday';
    if (/\b(friday|fri)\b/i.test(name) || /fri$/i.test(name)) return 'friday';
    if (/\b(saturday|sat)\b/i.test(name) || /sat$/i.test(name)) return 'saturday';
    return 'default';
  }

  // Determine campus from sheet name
  function detectCampus(sheetName) {
    var s = String(sheetName || '').toLowerCase().trim();
    if (/^hs[\s_]/i.test(s) || /high\s*school/i.test(s) || /\bhs\b/i.test(s)) return 'High';
    if (/^ps[\s_]/i.test(s) || /primary/i.test(s) || /pre-primary/i.test(s) || /kids/i.test(s)) return 'Primary';
    return 'Primary';
  }

  // Classify a sheet and determine if it is one of the 12 relevant day sheets
  function classifySheet(sheetName) {
    var s = String(sheetName || '').trim();
    var sLower = s.toLowerCase();

    // Filter out non-daily, summary, and scratch sheets
    var badKeywords = [
      'half day', 'halfday', 'final', 'full', 'sheet', 'no karate', 'new',
      'tuesday, thursday', 'wed, sat', 'mon_thu', '2024-25', '2025-26'
    ];
    for (var i = 0; i < badKeywords.length; i++) {
      if (sLower.includes(badKeywords[i])) return null;
    }

    var day = detectDayPattern(s);
    if (day === 'default') return null;

    var campus = null;
    var priority = 0;

    // High School
    if (/^hs[\s_]/i.test(s) || /high\s*school/i.test(s) || /\bhs\b/i.test(s)) {
      campus = 'High';
      priority = /^hs[\s_]/i.test(s) ? 10 : 5;
    }
    // Primary School
    else if (/^ps[\s_]/i.test(s) || /primary/i.test(s) || /pre-primary/i.test(s) || /kids/i.test(s)) {
      campus = 'Primary';
      priority = /^ps[\s_]/i.test(s) ? 10 : 5;
    }
    // Standalone 3-letter weekday (e.g. "Mon", "Tue" in parent workbook)
    else if (/^(mon|tue|wed|thu|fri|sat)$/i.test(s)) {
      campus = 'Primary';
      priority = 8;
    }

    if (!campus) return null;
    return { campus: campus, day: day, priority: priority, name: s };
  }

  // Parse a single worksheet
  function parseSheet(sheet, sheetName, campusOverride, dayOverride) {
    if (!sheet) return null;
    if (!XLSX && typeof window !== 'undefined' && window.XLSX) {
      XLSX = window.XLSX;
    }
    if (!XLSX) return null;

    var range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
    var merges = sheet['!merges'] || [];

    // Helper to get cell value considering merged cells (both horizontal and vertical)
    function getCellValue(r, c) {
      var tr = r, tc = c;
      for (var i = 0; i < merges.length; i++) {
        var m = merges[i];
        if (r >= m.s.r && r <= m.e.r && c >= m.s.c && c <= m.e.c) {
          tr = m.s.r;
          tc = m.s.c;
          break;
        }
      }
      var addr = XLSX.utils.encode_cell({ r: tr, c: tc });
      var cell = sheet[addr];
      if (!cell) return '';
      var val = (cell.w !== undefined && cell.w !== null) ? cell.w : (cell.v !== undefined && cell.v !== null ? cell.v : '');
      return String(val).trim();
    }

    // 1. Detect header row and class column (cell containing 'PERIOD')
    var headerRowIdx = -1;
    var classCol = -1;

    for (var r = range.s.r; r <= Math.min(range.e.r, range.s.r + 10); r++) {
      for (var c = range.s.c; c <= Math.min(range.e.c, range.s.c + 5); c++) {
        if (getCellValue(r, c).toUpperCase() === 'PERIOD') {
          headerRowIdx = r;
          classCol = c;
          break;
        }
      }
      if (headerRowIdx >= 0) break;
    }

    // Fallback if 'PERIOD' not found: find row with period numbers
    if (headerRowIdx < 0) {
      for (var fr = range.s.r; fr <= Math.min(range.e.r, range.s.r + 10); fr++) {
        var digitCount = 0;
        for (var fc = range.s.c; fc <= range.e.c; fc++) {
          if (/^(?:P|PERIOD\s*)?[1-9]/i.test(getCellValue(fr, fc))) digitCount++;
        }
        if (digitCount >= 4) {
          headerRowIdx = fr;
          classCol = range.s.c;
          break;
        }
      }
    }

    if (headerRowIdx < 0) return null;

    // 2. Detect period columns (ignoring non-teaching columns like Break, Lunch, Diary)
    var periodCols = [];
    var skipKeywords = ['BREAK', 'LUNCH', 'DIARY', 'CHECKING', 'ASSEMBLY', 'INTERVAL', 'LEISURE'];

    for (var pc = classCol + 1; pc <= range.e.c; pc++) {
      var headerVal = getCellValue(headerRowIdx, pc);
      if (!headerVal) continue;

      var isSkip = skipKeywords.some(function (kw) {
        return headerVal.toUpperCase().includes(kw);
      });
      if (isSkip) continue;

      var numMatch = headerVal.match(/^(?:P|PERIOD\s*)?(\d+)/i);
      if (numMatch) {
        var pNo = parseInt(numMatch[1], 10);
        var timeMatch = headerVal.match(/(\d{1,2}[.:]\d{2})\s*[-–]\s*(\d{1,2}[.:]\d{2})/);
        periodCols.push({
          col: pc,
          period_no: pNo,
          start_time: timeMatch ? timeMatch[1].replace('.', ':') : null,
          end_time: timeMatch ? timeMatch[2].replace('.', ':') : null,
          label: 'Period ' + pNo
        });
      }
    }

    if (periodCols.length === 0) return null;

    // 3. Extract class rows and cells
    var classes = [];
    var skipClassKeywords = ['ASSEMBLY', 'BREAK', 'LUNCH', 'LEISURE', 'NOTE', 'MORNING', 'EVENING', 'SCHEDULE', 'CLASSES', 'TOTAL'];

    for (var dr = headerRowIdx + 1; dr <= range.e.r; dr++) {
      var rawClassName = getCellValue(dr, classCol);
      if (!rawClassName) continue;

      var isSkipRow = skipClassKeywords.some(function (kw) {
        return rawClassName.toUpperCase().includes(kw);
      });
      if (isSkipRow) continue;

      var normalizedClass = normalizeClassName(rawClassName);
      if (!normalizedClass) continue;

      var cells = [];
      for (var p = 0; p < periodCols.length; p++) {
        var pCol = periodCols[p];
        var cellVal = getCellValue(dr, pCol.col);
        var parsed = parseCellContent(cellVal);
        if (parsed.subject || parsed.teacher) {
          cells.push({
            period_no: pCol.period_no,
            subject: parsed.subject,
            teacher: parsed.teacher,
            isActivity: parsed.isActivity
          });
        }
      }

      if (cells.length > 0) {
        classes.push({
          class: normalizedClass,
          rawClass: rawClassName,
          cells: cells
        });
      }
    }

    var campus = campusOverride || detectCampus(sheetName);
    var dayPattern = dayOverride || detectDayPattern(sheetName);

    return {
      sheetName: sheetName,
      campus: campus,
      dayPattern: dayPattern,
      classes: classes,
      periodTimes: periodCols.map(function (pc) {
        return {
          period_no: pc.period_no,
          start_time: pc.start_time,
          end_time: pc.end_time,
          label: pc.label
        };
      }),
      detectedPeriods: periodCols.length,
      headerRowIndex: headerRowIdx
    };
  }

  // Main parser function - parses entire workbook and extracts 12 target sheets
  function parseWorkbook(file) {
    return loadSheetJS().then(function (xlsxLib) {
      XLSX = xlsxLib || window.XLSX;
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function (e) {
          try {
            var data = new Uint8Array(e.target.result);
            var workbook = XLSX.read(data, { type: 'array' });

            var results = {
              sheets: [],
              campuses: new Set(),
              dayPatterns: new Set(),
              allClasses: new Map(),
              summary: { totalSheets: 0, totalClasses: 0, totalCells: 0 }
            };

            // 1. Identify target sheets by classifying sheet names
            var candidates = {};
            workbook.SheetNames.forEach(function (sheetName) {
              var c = classifySheet(sheetName);
              if (c) {
                var key = c.campus + '_' + c.day;
                if (!candidates[key] || c.priority > candidates[key].priority) {
                  candidates[key] = c;
                }
              }
            });

            // 2. Parse each selected target sheet
            Object.keys(candidates).forEach(function (k) {
              var target = candidates[k];
              var sheet = workbook.Sheets[target.name];
              var parsed = parseSheet(sheet, target.name, target.campus, target.day);

              if (parsed && parsed.classes.length > 0) {
                results.sheets.push(parsed);
                results.campuses.add(parsed.campus);
                results.dayPatterns.add(parsed.dayPattern);
                results.summary.totalSheets++;
                results.summary.totalClasses += parsed.classes.length;
                results.summary.totalCells += parsed.classes.reduce(function (sum, cls) {
                  return sum + cls.cells.length;
                }, 0);

                parsed.classes.forEach(function (cls) {
                  var cKey = cls.class;
                  if (!results.allClasses.has(cKey)) {
                    results.allClasses.set(cKey, {
                      campuses: new Set(),
                      dayPatterns: new Set(),
                      sampleCells: cls.cells.slice(0, 3)
                    });
                  }
                  var entry = results.allClasses.get(cKey);
                  entry.campuses.add(parsed.campus);
                  entry.dayPatterns.add(parsed.dayPattern);
                });
              }
            });

            // Convert Sets to Arrays for serialization and UI consumption
            results.campuses = Array.from(results.campuses);
            results.dayPatterns = Array.from(results.dayPatterns);
            results.allClasses = Array.from(results.allClasses.entries()).map(function (e) {
              return {
                class: e[0],
                campuses: Array.from(e[1].campuses),
                dayPatterns: Array.from(e[1].dayPatterns),
                sampleCells: e[1].sampleCells
              };
            });

            resolve(results);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = function () {
          reject(new Error('Failed to read file'));
        };
        reader.readAsArrayBuffer(file);
      });
    });
  }

  // Export parser
  window.TimetableImportParser = {
    loadSheetJS: loadSheetJS,
    parseWorkbook: parseWorkbook,
    parseSheet: parseSheet,
    normalizeClassName: normalizeClassName,
    parseCellContent: parseCellContent,
    classifySheet: classifySheet,
    detectCampus: detectCampus,
    detectDayPattern: detectDayPattern
  };
})();

/* =========================================================================
   spoken-english-core.js — pure logic for the Spoken English tracker.
   No DOM, no network. Used by the portal (window.SpokenCore) and by tests.

   Responsibilities
     1. Detect Day numbers from PDF file names.
     2. Split a multi-class "teacher guide" PDF (text per page) into
        per-class, per-day lessons.
     3. Parse the numbered sections (1–10) of one lesson.
     4. Build a lesson-specific checklist ONLY from text found in that lesson.
     5. Compute lesson status / class summaries (single source of truth).

   Input text comes from PDFium (page.getText()), the same engine the old
   Python sync used, so Telugu text is read correctly.
   ========================================================================= */
(function (root) {
  "use strict";

  /* ------------------------------------------------------------------ */
  /* 1. File names → day numbers                                         */
  /* ------------------------------------------------------------------ */
  // "Spoken_English_Day9_Day10.pdf", "Day 9-10.pdf", "Days 9 & 10", "Day_9_10"
  function detectDaysFromFilename(name) {
    var s = String(name || "").replace(/\.pdf$/i, "").replace(/[_\.]+/g, " ");
    var days = {};
    function add(n) { n = parseInt(n, 10); if (n >= 1 && n <= 200) days[n] = true; }
    var m, re;
    re = /day[s]?\s*[-–]?\s*(\d{1,3})/gi;                       // "Day 9", "Day9"
    while ((m = re.exec(s))) add(m[1]);
    re = /day[s]?\s*(\d{1,3})\s*(?:-|–|—|to|and|&|,)\s*(?:day[s]?\s*)?(\d{1,3})/gi;   // ranges
    while ((m = re.exec(s))) {
      var a = parseInt(m[1], 10), b = parseInt(m[2], 10);
      if (b >= a && b - a <= 30) { for (var i = a; i <= b; i++) add(i); } else { add(a); add(b); }
    }
    re = /day[s]?\s*(\d{1,3})((?:\s*[-–\s]\s*\d{1,3})+)/gi;     // "Day 9 10" / "Day 9-10-11"
    while ((m = re.exec(s))) { add(m[1]); (m[2].match(/\d{1,3}/g) || []).forEach(add); }
    return Object.keys(days).map(Number).sort(function (a, b) { return a - b; });
  }

  /* ------------------------------------------------------------------ */
  /* 2. Split a multi-class PDF into lessons                              */
  /* ------------------------------------------------------------------ */
  function normalizeClassLabel(raw) {
    var s = String(raw || "").trim();
    if (/^(class|grade)/i.test(s)) { var d = s.match(/\d+/); return d ? "Class " + parseInt(d[0], 10) : ""; }
    if (/^lkg$/i.test(s)) return "LKG";
    if (/^ukg$/i.test(s)) return "UKG";
    if (/^nursery$/i.test(s)) return "Nursery";
    return "";
  }

  var CLASS_RE = /(Nursery|LKG|UKG|Class\s*\d+)\s*తరగ?ు?తి/i;
  var DAY_RE = /(?:DAY\s*(\d+)|(\d+)\s*DAY)/i;

  function toLines(text) {
    return String(text || "").split(/\r?\n/).map(function (l) { return l.replace(/\s+$/, ""); }).filter(function (l) { return l.trim() !== ""; });
  }
  function isNoiseLine(l) {
    var t = String(l).trim();
    return /^SPOKEN ENGLISH\s*\|\s*TEACHER GUIDE/i.test(t) || /^School Spoken English Programme/i.test(t);
  }
  function squash(s) { return String(s || "").replace(/\s+/g, " ").trim(); }

  // A lesson starts on the page whose first few lines read like "Class 5 తరగతి | DAY 1".
  // Strict form first (exactly what the existing guides use); if a PDF is laid out a little
  // differently (no running header, Telugu word extracted differently, class and day on
  // separate lines) the looser forms below are tried. Running headers such as
  // "SPOKEN ENGLISH | TEACHER GUIDE DAY 9-10 • NURSERY–CLASS 10" are never treated as lesson headers.
  var LOOSE_CLASS_RE = /\b(Nursery|LKG|UKG|(?:Class|Grade)\s*[-:]?\s*\d{1,2})\b/gi;
  function allMatches(re, s) { var out = [], m; re.lastIndex = 0; while ((m = re.exec(s))) out.push(m); return out; }
  function lineStart(line, strict) {
    var t = String(line || "").trim();
    if (!t || isNoiseLine(t)) return null;
    var mc = CLASS_RE.exec(t), md = DAY_RE.exec(t);
    if (strict) {
      if (!(mc && md)) return null;
      var c1 = normalizeClassLabel(mc[1]), d1 = parseInt(md[1] || md[2], 10);
      return c1 && d1 ? { cls: c1, day: d1 } : null;
    }
    if (t.length > 90) return null;                        // a heading, not a sentence
    var classes = allMatches(LOOSE_CLASS_RE, t), days = allMatches(/DAY\s*(\d+)|(\d+)\s*DAY/gi, t);
    if (classes.length !== 1 || days.length !== 1 || /[–—-]\s*(?:Class|Grade|\d)/i.test(t.replace(/^.*?DAY\s*\d+/i, ""))) return null;
    var c2 = normalizeClassLabel(classes[0][1].replace(/^grade/i, "Class")), d2 = parseInt(days[0][1] || days[0][2], 10);
    return c2 && d2 ? { cls: c2, day: d2 } : null;
  }
  function pageStart(lines) {
    var head = lines.slice(0, 8), k, r;
    for (k = 0; k < head.length; k++) { if ((r = lineStart(head[k], true))) return r; }
    for (k = 0; k < head.length; k++) { if ((r = lineStart(head[k], false))) return r; }
    // class and day on neighbouring short lines: "Class 5 తరగతి" / "DAY 9"
    for (k = 0; k + 1 < head.length; k++) {
      var a = String(head[k]).trim(), b = String(head[k + 1]).trim();
      if (isNoiseLine(a) || isNoiseLine(b) || a.length > 40 || b.length > 40) continue;
      var ca = allMatches(LOOSE_CLASS_RE, a), db = allMatches(/DAY\s*(\d+)|(\d+)\s*DAY/gi, b);
      var da = allMatches(/DAY\s*(\d+)|(\d+)\s*DAY/gi, a), cb = allMatches(LOOSE_CLASS_RE, b);
      if (ca.length === 1 && !da.length && db.length === 1 && !cb.length) return { cls: normalizeClassLabel(ca[0][1].replace(/^grade/i, "Class")), day: parseInt(db[0][1] || db[0][2], 10) };
      if (da.length === 1 && !ca.length && cb.length === 1 && !db.length) return { cls: normalizeClassLabel(cb[0][1].replace(/^grade/i, "Class")), day: parseInt(da[0][1] || da[0][2], 10) };
    }
    return null;
  }
  function findLessonStarts(pageLines) {
    var starts = [];
    (pageLines || []).forEach(function (lines, i) {
      var r = pageStart(lines || []);
      if (r && r.cls && r.day) starts.push({ page: i, cls: r.cls, day: r.day });
    });
    return starts;
  }

  // pageTexts: string[] (one per PDF page).
  // → { lessons:[{cls,day,startPage,endPage,lines[]}], warnings:[] }
  function splitLessons(pageTexts) {
    var pageLines = (pageTexts || []).map(toLines);
    var starts = findLessonStarts(pageLines), lessons = [], warnings = [], seen = {};
    if (!starts.length) warnings.push("No lesson headers (\"Class N తరగతి | DAY N\") were found in this PDF.");
    else if (starts[0].page > 0) warnings.push("Pages 1–" + starts[0].page + " come before the first lesson and are not used.");
    starts.forEach(function (st, i) {
      var end = (i + 1 < starts.length ? starts[i + 1].page - 1 : pageLines.length - 1);
      var lines = [];
      for (var p = st.page; p <= end; p++) lines = lines.concat(pageLines[p]);
      var key = st.cls + "||" + st.day;
      if (seen[key]) { warnings.push("Lesson " + st.cls + " Day " + st.day + " appears twice in this PDF; the second copy is ignored."); return; }
      seen[key] = true;
      lessons.push({ cls: st.cls, day: st.day, startPage: st.page, endPage: end, lines: lines });
    });
    return { lessons: lessons, warnings: warnings };
  }

  /* ------------------------------------------------------------------ */
  /* 3. Parse one lesson                                                  */
  /* ------------------------------------------------------------------ */
  // Section headings are validated by keyword so a numbered list INSIDE a
  // section ("1. …", "6. …") is never mistaken for a heading.
  var HEADING_HINT = {
    1: /ఉపాధ్యా/, 2: /వివరణ/, 3: /English/i, 4: /ప్రశ్న/, 5: /తప్పు/,
    6: /ప్రణాళిక|ప్రణా/, 7: /speaking/i, 8: /బోర్డు/, 9: /practice/i, 10: /self-check|ఉపాధ్యా/i
  };

  function parseSections(lines) {
    var sections = {}, cur = null, expect = 1, headRe = /^\s*(\d{1,2})\.\s+(\S.*)$/;
    lines.forEach(function (l) {
      if (isNoiseLine(l)) return;
      var m = headRe.exec(l);
      if (m) {
        var n = parseInt(m[1], 10);
        if (n === expect && HEADING_HINT[n] && HEADING_HINT[n].test(m[2].replace(/[\s\u200b-\u200d]+/g, ""))) {
          cur = n; expect = n + 1;
          sections[cur] = { heading: squash(m[2]), lines: [] };
          return;
        }
      }
      if (cur != null) sections[cur].lines.push(l);
    });
    return sections;
  }

  function parseHeader(lines) {
    var meta = { title: "", objective: "", minutes: null, videoUrl: "", videoTitle: "" };
    var top = [];
    for (var i = 0; i < lines.length && i < 14; i++) {
      if (/^\s*1\.\s+\S/.test(lines[i])) break;
      top.push(lines[i]);
    }
    var oi = -1;
    top.forEach(function (l, i) {
      var mt = /పాఠ[ం్య][^:]*:\s*(.+)$/.exec(l);
      if (mt && !meta.title) meta.title = squash(mt[1].split("|")[0]);
      var mm = /సమయం[^:]*:\s*(\d{1,3})/.exec(l);
      if (mm && meta.minutes == null) meta.minutes = parseInt(mm[1], 10);
      var mo = /లక్ష్యం[^:]*:\s*(.+)$/.exec(l);
      if (mo && oi < 0) { meta.objective = squash(mo[1]); oi = i; }
    });
    if (oi >= 0) {   // objective may wrap onto the following line(s)
      for (var j = oi + 1; j < top.length; j++) {
        if (CLASS_RE.test(top[j]) || /^(పాఠం|సమయం)/.test(top[j].trim())) break;
        meta.objective = squash(meta.objective + " " + top[j]);
      }
    }
    var all = lines.join("\n");
    var mv = /(https?:\/\/(?:www\.)?youtu[^\s)"'<>]+)/i.exec(all);
    if (mv) {
      meta.videoUrl = mv[1].replace(/[.,;:]+$/, "");
      // title only when the PDF prints "<title>: <url>" on one line
      var lineStart = all.lastIndexOf("\n", mv.index) + 1;
      var mt2 = /^\s*(.{3,100}?)\s*:\s*$/.exec(all.slice(lineStart, mv.index));
      if (mt2 && !/వీడియో|Channel|Direct URL/i.test(mt2[1])) meta.videoTitle = squash(mt2[1]);
    }
    if (!meta.videoTitle) {   // "• వీడియో చూడండి: <title>" on its own line
      var mw = /వీడియో\s*చూ\s*డం\s*డి[ \t]*:[ \t]*([^\n]{4,160})/.exec(all);
      if (mw) {
        var t = squash(mw[1].replace(/https?:\/\/\S+/g, "").replace(/\s*[—–-]\s*$/, ""));
        if (t && !/^(Channel|Direct URL)/i.test(t)) meta.videoTitle = t;
      }
    }
    meta.title = meta.title.replace(/^[^\wఀ-౿]+/, "").trim();
    return meta;
  }

  // Leading run of English text on a table row, up to the first Telugu char.
  function englishPrefix(line) {
    var m = /^([^ఀ-౿]*)/.exec(String(line).trim());
    return squash(m ? m[1] : "");
  }
  var SENTENCE_END = /[.?!…_)"”’]$/;

  function parseSentences(sec) {
    var out = [], seen = {};
    if (!sec) return out;
    sec.lines.forEach(function (l) {
      if (isNoiseLine(l)) return;
      var c = englishPrefix(l);
      if (!/^[A-Za-z]/.test(c) || /^English sentence/i.test(c)) return;
      if (c.length < 3 || c.length > 120 || !SENTENCE_END.test(c)) return;
      var k = c.toLowerCase();
      if (!seen[k]) { seen[k] = true; out.push(c); }
    });
    return out;
  }

  // "Teacher asks" column: English questions ending in "?".
  function parseQuestions(sec) {
    var out = [], seen = {};
    if (!sec) return out;
    var arr = sec.lines.filter(function (l) { return !isNoiseLine(l); });
    function add(q) { q = squash(q); var k = q.toLowerCase(); if (q && !seen[k]) { seen[k] = true; out.push(q); } }
    for (var i = 0; i < arr.length; i++) {
      var t = arr[i].trim();
      if (/^Teacher asks/i.test(t)) continue;
      var m = /^([A-Z][^?\n]{2,80}\?)/.exec(t);
      if (m) { add(m[1]); continue; }
      // question wrapped over two lines: "What is your favourite" / "subject? My …"
      var next = (arr[i + 1] || "").trim();
      var m2 = /^([a-z][^?]{0,30}\?)/.exec(next);
      if (/^[A-Z][A-Za-z' ,]{5,60}$/.test(t) && m2) { add(t + " " + m2[1]); i++; }
    }
    return out;
  }

  // Timed rows: a line starting with "0–5" / "10-18" (optionally followed by
  // "నిమి"). The cell text (label + instruction) is kept verbatim; the exact
  // label/instruction boundary cannot be recovered from plain text.
  function parsePlan(sec) {
    var rows = [];
    if (!sec) return rows;
    var cur = null;
    sec.lines.forEach(function (l) {
      if (isNoiseLine(l)) return;
      var t = l.trim();
      var m = /^(\d{1,3})\s*[–\-—]\s*(\d{1,3})(?:\s*నిమి\w*)?\s*(.*)$/.exec(t);
      if (m && parseInt(m[2], 10) > parseInt(m[1], 10)) {
        cur = { from: parseInt(m[1], 10), to: parseInt(m[2], 10), text: m[3] || "" };
        rows.push(cur);
      } else if (cur && !/^సమయం\s/.test(t)) {
        cur.text += " " + t;
      }
    });
    rows.forEach(function (r) { r.text = squash(r.text); });
    return rows.filter(function (r) { return r.text; });
  }

  function sectionText(sec) {
    if (!sec) return "";
    return squash(sec.lines.filter(function (l) { return !isNoiseLine(l); }).join(" "));
  }

  function cutWords(text, max) {
    text = squash(text);
    if (text.length <= max) return text;
    return text.slice(0, max).replace(/\s+\S*$/, "") + "…";
  }
  // First sentence(s) of a paragraph (split on "." or "।" only, so questions
  // such as "What is this?" stay inside the quoted example).
  function firstSentence(text, max) {
    text = squash(text).replace(/^\d+\.\s+/, "");
    if (!text) return "";
    var out = "", re = /[^.।]+[.।]+(?:\s|$)/g, m;
    while ((m = re.exec(text))) {
      out += (out ? " " : "") + m[0].trim();
      if (out.length >= 35) break;
    }
    return cutWords(out || text, max || 150);
  }
  function listShort(arr, n) {
    var shown = arr.slice(0, n).join(" / ");
    return arr.length > n ? shown + " … (మొత్తం " + arr.length + ")" : shown;
  }

  // Merge timed rows into at most `maxGroups` contiguous groups.
  function groupPlan(rows, maxGroups) {
    if (rows.length <= maxGroups) return rows.map(function (r) { return [r]; });
    var groups = [], per = Math.ceil(rows.length / maxGroups);
    for (var i = 0; i < rows.length; i += per) groups.push(rows.slice(i, i + per));
    return groups;
  }

  /* ------------------------------------------------------------------ */
  /* 4. Checklist (only from what the lesson itself contains)             */
  /* ------------------------------------------------------------------ */
  // Returns { items:[string], reasons:[string] }. Any reason ⇒ admin review.
  function buildChecklist(parsed) {
    var items = [], reasons = [], s = parsed.sections, meta = parsed.meta;

    // 1. Teacher preparation (section 1): only the parts present in the text.
    var prep = sectionText(s[1]), parts = [];
    if (/youtu|వీడియో/i.test(prep + " " + meta.videoUrl)) parts.push(meta.videoTitle ? "వీడియో (‘" + cutWords(meta.videoTitle, 70) + "’) చూసి" : "వీడియో చూసి");
    if (/గట్టిగా\s*చదవండి/.test(prep)) {
      var nm = /(\d{1,2})\s*సార్లు/.exec(prep);
      parts.push("ఈ రోజు English వాక్యాలను" + (nm ? " " + nm[1] + " సార్లు" : "") + " గట్టిగా చదివి");
    }
    if (/ప్రా\s*క్టీస్|practice/i.test(prep) && /ప్రశ్న/.test(prep)) parts.push("ప్రశ్న–సమాధానాలు practice చేసి");
    if (parts.length) items.push("ముందురోజు సిద్ధత: " + parts.join(", ") + " సిద్ధమయ్యాను.");
    else reasons.push("Teacher-preparation section (1) not found or unreadable.");

    // 2. English sentence patterns (section 3)
    var sentences = parseSentences(s[3]);
    if (sentences.length >= 2) items.push("ఈ రోజు వాక్యాలు: " + listShort(sentences, 4) + " — బోర్డుపై చూపి, విద్యార్థులతో పలికించాను.");
    else reasons.push("Could not read the English sentences table (section 3).");

    // 3. Questions to ask (section 4)
    var qs = parseQuestions(s[4]);
    if (qs.length >= 1) items.push("తరగతి ప్రశ్నలు: " + listShort(qs, 3) + " — అడిగి, విద్యార్థుల English సమాధానాలు విన్నాను.");

    // 4. Timed classroom plan (section 6), merged into at most 3 items
    var plan = parsePlan(s[6]);
    if (plan.length >= 2) {
      groupPlan(plan, 3).forEach(function (g) {
        items.push("తరగతి కార్యకలాపం (" + g[0].from + "–" + g[g.length - 1].to + " నిమిషాలు): " +
          g.map(function (r) { return cutWords(r.text, 75); }).join(" ▸ "));
      });
    } else reasons.push("Could not read the timed class plan (section 6).");

    // 5. Main speaking activity (section 7)
    var act = sectionText(s[7]).replace(/^\d+\.\s+/, "");
    if (act) {
      var an = /^([^:：]{2,40})[:：]\s*(.+)$/.exec(act);
      items.push("ప్రధాన speaking activity" + (an ? " ‘" + squash(an[1]) + "’" : "") + ": " + firstSentence(an ? an[2] : act, 150));
    } else reasons.push("Main speaking activity (section 7) not found.");

    // 6. Home practice (section 9)
    var home = sectionText(s[9]);
    if (home) items.push("ఇంటి practice ఇచ్చాను: " + firstSentence(home, 150));

    if (!meta.title) reasons.push("Lesson title not found.");
    if (!meta.objective) reasons.push("Lesson objective not found.");
    if (items.length < 4) reasons.push("Only " + items.length + " checklist item(s) could be extracted.");
    return { items: items, reasons: reasons };
  }

  function parseLesson(lesson) {
    var lines = lesson.lines.filter(function (l) { return !isNoiseLine(l); });
    var meta = parseHeader(lines);
    var parsed = { meta: meta, sections: parseSections(lines) };
    var cl = buildChecklist(parsed);
    return {
      cls: lesson.cls, day: lesson.day,
      title: meta.title, objective: meta.objective, videoUrl: meta.videoUrl,
      lessonName: "Day " + lesson.day + ": " + (meta.title || "Lesson"),
      startPage: lesson.startPage, endPage: lesson.endPage,
      pageCount: lesson.endPage - lesson.startPage + 1,
      checklist: cl.items, reviewReasons: cl.reasons, needsReview: cl.reasons.length > 0
    };
  }

  // pageTexts → { lessons:[parsedLesson], warnings:[], daysFound:[] }
  function parseUploadPages(pageTexts) {
    var sp = splitLessons(pageTexts), days = {};
    var lessons = sp.lessons.map(parseLesson);
    lessons.forEach(function (l) { days[l.day] = true; });
    return { lessons: lessons, warnings: sp.warnings, daysFound: Object.keys(days).map(Number).sort(function (a, b) { return a - b; }) };
  }

  // youtube links stored only as PDF link annotations (not in the text layer)
  function findYoutubeInBytes(latin1String) {
    var m = /https?:\/\/(?:www\.)?youtu[^\s()<>\\\x00-\x1f\x7f-\xff]+/i.exec(String(latin1String || ""));
    return m ? m[0].replace(/[.,;:"')]+$/, "") : "";
  }

  /* ------------------------------------------------------------------ */
  /* 5. Status + summaries (same rules as the edge function)              */
  /* ------------------------------------------------------------------ */
  function computeStatus(done, total) {
    total = Math.max(0, parseInt(total, 10) || 0);
    done = Math.min(total, Math.max(0, parseInt(done, 10) || 0));
    if (total === 0) return { state: "FALSE", label: "Pending", pct: 0, done: 0, total: 0 };
    if (done >= total) return { state: "TRUE", label: "Completed", pct: 100, done: done, total: total };
    if (done > 0) return { state: "IN_PROGRESS", label: "In Progress", pct: Math.max(1, Math.min(99, Math.round(done / total * 100))), done: done, total: total };
    return { state: "FALSE", label: "Pending", pct: 0, done: 0, total: total };
  }

  // items: [{ currentState: "TRUE"|"IN_PROGRESS"|"FALSE" }]
  function summarize(items) {
    var r = { total: 0, completed: 0, inProgress: 0, pending: 0, pct: 0 };
    (items || []).forEach(function (it) {
      r.total++;
      var st = it && (it.currentState || it.state);
      if (st === "TRUE") r.completed++; else if (st === "IN_PROGRESS") r.inProgress++; else r.pending++;
    });
    r.pct = r.total ? Math.round(r.completed / r.total * 100) : 0;
    return r;
  }

  root.SpokenCore = {
    detectDaysFromFilename: detectDaysFromFilename,
    normalizeClassLabel: normalizeClassLabel,
    findLessonStarts: findLessonStarts,
    splitLessons: splitLessons,
    parseSections: parseSections,
    parseHeader: parseHeader,
    parseSentences: parseSentences,
    parseQuestions: parseQuestions,
    parsePlan: parsePlan,
    buildChecklist: buildChecklist,
    parseLesson: parseLesson,
    parseUploadPages: parseUploadPages,
    findYoutubeInBytes: findYoutubeInBytes,
    computeStatus: computeStatus,
    summarize: summarize
  };
})(typeof window !== "undefined" ? window : globalThis);

import { describe, it, expect, beforeEach, vi } from 'vitest';
// @ts-ignore
import ExamSchedulePrint from '../exam-schedule-print.js';

describe('ExamSchedulePrint Module', () => {
  const sampleScheduleRows = [
    // Class 3 - Formative Assessment 1
    {
      rowId: 101,
      grade: 'Class 3',
      gradeLabel: 'Class 3',
      examName: 'Formative Assessment 1',
      subject: 'Telugu',
      date: '2026-07-08',
      day: 'Wednesday',
      marks: 50,
      status: 'SCHEDULED',
      lessonsRaw: 'Lesson 1: Vinadam & Matladadam; Lesson 2: Chadavadam'
    },
    {
      rowId: 102,
      grade: 'Class 3',
      gradeLabel: 'Class 3',
      examName: 'Formative Assessment 1',
      subject: 'English',
      date: '2026-07-09',
      day: 'Thursday',
      marks: 50,
      status: 'SCHEDULED',
      lessonsRaw: 'Unit 1: The Magic Garden (Vocabulary, Grammar & Reading Comprehension)'
    },
    {
      rowId: 103,
      grade: 'Class 3',
      gradeLabel: 'Class 3',
      examName: 'Formative Assessment 1',
      subject: 'Maths',
      date: '2026-07-10',
      day: 'Friday',
      marks: 50,
      status: 'SCHEDULED',
      lessonsRaw: 'Chapter 1: Where to Look From; Chapter 2: Fun with Numbers'
    },
    // Class 4 - Formative Assessment 1
    {
      rowId: 104,
      grade: 'Class 4',
      gradeLabel: 'Class 4',
      examName: 'Formative Assessment 1',
      subject: 'Telugu',
      date: '2026-07-08',
      day: 'Wednesday',
      marks: 50,
      status: 'SCHEDULED',
      lessonsRaw: 'Patham 1: Desha Bhakthi Geyam; Patham 2: Paropakaram'
    },
    {
      rowId: 105,
      grade: 'Class 4',
      gradeLabel: 'Class 4',
      examName: 'Formative Assessment 1',
      subject: 'Maths',
      date: '2026-07-10',
      day: 'Friday',
      marks: 50,
      status: 'SCHEDULED',
      lessonsRaw: 'Chapter 1: Building with Bricks; Chapter 2: Long and Short (Word Problems & Measurements)'
    },
    // Class 4 - Formative Assessment 2
    {
      rowId: 106,
      grade: 'Class 4',
      gradeLabel: 'Class 4',
      examName: 'Formative Assessment 2',
      subject: 'Telugu',
      date: '2026-09-15',
      day: 'Tuesday',
      marks: 50,
      status: 'SCHEDULED',
      lessonsRaw: 'Patham 3 & Patham 4'
    },
    // Class 10 - Multiple tests
    {
      rowId: 201,
      grade: 'Class 10',
      gradeLabel: 'Class 10',
      examName: 'Revision Test 1',
      subject: 'Mathematics',
      date: '2026-11-02',
      day: 'Monday',
      marks: 100,
      status: 'SCHEDULED',
      lessonsRaw: 'Real Numbers, Sets, Polynomials, Linear Equations in Two Variables with all theorems'
    },
    {
      rowId: 202,
      grade: 'Class 10',
      gradeLabel: 'Class 10',
      examName: 'Revision Test 1',
      subject: 'Physical Science',
      date: '2026-11-04',
      day: 'Wednesday',
      marks: 50,
      status: 'SCHEDULED',
      lessonsRaw: 'Reflection of Light at Curved Surfaces; Chemical Equations & Reactions'
    },
    {
      rowId: 203,
      grade: 'Class 10',
      gradeLabel: 'Class 10',
      examName: 'Revision Test 2',
      subject: 'Mathematics',
      date: '2026-12-01',
      day: 'Tuesday',
      marks: 100,
      status: 'SCHEDULED',
      lessonsRaw: 'Quadratic Equations, Progressions, Coordinate Geometry, Similar Triangles'
    },
    {
      rowId: 204,
      grade: 'Class 10',
      gradeLabel: 'Class 10',
      examName: 'Formative Assessment 1',
      subject: 'Social Studies',
      date: '2026-07-15',
      day: 'Wednesday',
      marks: 50,
      status: 'SCHEDULED',
      lessonsRaw: 'India: Relief Features'
    }
  ];

  beforeEach(() => {
    (globalThis as any).Portal = {
      CONFIG: {
        ACADEMIC_YEAR: '2026–27',
        SCHOOL: {
          name: 'Sapthagiri High School E/M',
          city: 'Karimnagar',
          phone: '9381118421'
        }
      },
      api: vi.fn().mockResolvedValue(sampleScheduleRows)
    };
  });

  it('1. Extracts distinct assessments and classes accurately from schedule rows', () => {
    const data = ExamSchedulePrint.extractScheduleData(sampleScheduleRows);

    expect(data.assessments).toContain('Formative Assessment 1');
    expect(data.assessments).toContain('Formative Assessment 2');
    expect(data.assessments).toContain('Revision Test 1');
    expect(data.assessments).toContain('Revision Test 2');

    expect(data.classes).toEqual(['Class 3', 'Class 4', 'Class 10']);
    expect(data.assessmentClassesMap['Formative Assessment 1']).toContain('Class 3');
    expect(data.assessmentClassesMap['Formative Assessment 1']).toContain('Class 4');
    expect(data.assessmentClassesMap['Formative Assessment 1']).toContain('Class 10');
  });

  it('2. Scenario 1: FA-1 for Class 3 only', () => {
    const filtered = ExamSchedulePrint.filterScheduleRows(sampleScheduleRows, {
      mode: 'bucket',
      assessment: 'Formative Assessment 1',
      classes: ['Class 3']
    });

    expect(filtered.length).toBe(3);
    filtered.forEach((r: any) => {
      expect(r.grade).toBe('Class 3');
      expect(r.examName).toBe('Formative Assessment 1');
    });

    const groups = ExamSchedulePrint.groupRowsForPrint(filtered);
    expect(groups.length).toBe(1);
    expect(groups[0].grade).toBe('Class 3');
    expect(groups[0].rows.length).toBe(3);

    const html = ExamSchedulePrint.generatePrintDocumentHtml(groups, {
      academicYear: '2026–27',
      assessment: 'Formative Assessment 1'
    });
    expect(html).toContain('CLASS 3');
    expect(html).toContain('FORMATIVE ASSESSMENT 1');
    expect(html).toContain('SCHEDULE &amp; SYLLABUS');
    expect(html).toContain('2026–27');
    expect(html).not.toContain('CLASS 4');
    expect(html).not.toContain('CLASS 10');
  });

  it('3. Scenario 2: FA-1 for Classes 3 and 4 together in separate class sheets', () => {
    const filtered = ExamSchedulePrint.filterScheduleRows(sampleScheduleRows, {
      mode: 'bucket',
      assessment: 'Formative Assessment 1',
      classes: ['Class 3', 'Class 4']
    });

    expect(filtered.length).toBe(5); // 3 for Class 3, 2 for Class 4

    const groups = ExamSchedulePrint.groupRowsForPrint(filtered);
    expect(groups.length).toBe(2);
    expect(groups[0].grade).toBe('Class 3');
    expect(groups[1].grade).toBe('Class 4');

    const html = ExamSchedulePrint.generatePrintDocumentHtml(groups, {
      academicYear: '2026–27',
      assessment: 'Formative Assessment 1',
      pageBreakPerClass: true
    });

    expect(html).toContain('CLASS 3');
    expect(html).toContain('CLASS 4');
    expect(html).toContain('data-class="Class 4"');
    expect(html).toContain('page-break');
  });

  it('4. Scenario 3: One bucket per class — multiple tests (FA-1 & FA-2) printed sequentially without header duplication', () => {
    const filtered = ExamSchedulePrint.filterScheduleRows(sampleScheduleRows, {
      mode: 'individual',
      selections: {
        'Class 4': ['Formative Assessment 1', 'Formative Assessment 2']
      }
    });

    expect(filtered.length).toBe(3); // 2 in FA-1, 1 in FA-2

    // One sheet for Class 4 containing both tests
    const groups = ExamSchedulePrint.groupRowsForPrint(filtered);
    expect(groups.length).toBe(1);
    expect(groups[0].grade).toBe('Class 4');
    expect(groups[0].examNames).toContain('Formative Assessment 1');
    expect(groups[0].examNames).toContain('Formative Assessment 2');
    expect(groups[0].rows.length).toBe(3);

    const html = ExamSchedulePrint.generatePrintDocumentHtml(groups, { academicYear: '2026–27' });
    expect(html).toContain('CLASS 4');
    expect(html).toContain('Formative Assessment 1');
    expect(html).toContain('Formative Assessment 2');
    // Header appears once
    const logoCount = (html.match(/logo-full\.jpg/g) || []).length;
    expect(logoCount).toBe(1);
    // New exam transition row border
    expect(html).toContain('ex-new-exam-row');
  });

  it('5. Scenario 4: Revision Test 1 and Revision Test 2 for Class 10 only (Method B) in unified table', () => {
    const filtered = ExamSchedulePrint.filterScheduleRows(sampleScheduleRows, {
      mode: 'individual',
      selections: {
        'Class 10': ['Revision Test 1', 'Revision Test 2']
      }
    });

    expect(filtered.length).toBe(3); // 2 in RT-1, 1 in RT-2
    filtered.forEach((r: any) => {
      expect(r.grade).toBe('Class 10');
      expect(['Revision Test 1', 'Revision Test 2']).toContain(r.examName);
      expect(r.examName).not.toBe('Formative Assessment 1');
    });

    const groups = ExamSchedulePrint.groupRowsForPrint(filtered);
    expect(groups.length).toBe(1);
    expect(groups[0].grade).toBe('Class 10');
    expect(groups[0].examNames).toEqual(['Revision Test 1', 'Revision Test 2']);

    const html = ExamSchedulePrint.generatePrintDocumentHtml(groups, { academicYear: '2026–27' });
    expect(html).toContain('CLASS 10 — REVISION EXAMINATION SCHEDULE &amp; SYLLABUS');
    expect(html).toContain('Revision Test 1');
    expect(html).toContain('Revision Test 2');
    expect(html).toContain('ex-new-exam-row');
    // Header appears once
    const logoCount = (html.match(/logo-full\.jpg/g) || []).length;
    expect(logoCount).toBe(1);
  });

  it('6. Scenario 5: Multi-page schedule with repeating thead structure', () => {
    const groups = ExamSchedulePrint.groupRowsForPrint(sampleScheduleRows);
    const html = ExamSchedulePrint.generatePrintDocumentHtml(groups);

    // Document must have table with thead containing exactly 5 columns
    expect(html).toContain('<table class="ex-print-table">');
    expect(html).toContain('<thead>');
    expect(html).toContain('<th>Exam Name</th>');
    expect(html).toContain('<th class="col-center">Date</th>');
    expect(html).toContain('<th class="col-center">Day</th>');
    expect(html).toContain('<th>Subject</th>');
    expect(html).toContain('<th>Syllabus</th>');
    expect(html).toContain('</thead>');
  });

  it('7. Scenario 6: Long syllabus descriptions wrap cleanly without clipping', () => {
    const longSyllabus = 'Detailed portions: Chapter 1 Real Numbers with all Euclidean algorithms and fundamental theorems of arithmetic; Chapter 2 Polynomials with geometrical meaning of zeroes; Chapter 3 Pair of Linear Equations with cross multiplication method; Chapter 4 Quadratic Equations; Chapter 5 Arithmetic Progressions; Chapter 6 Triangles and state and prove Pythagoras Theorem.';
    const rows = [
      {
        rowId: 999,
        grade: 'Class 10',
        examName: 'Summative Assessment 1',
        subject: 'Mathematics',
        date: '2026-10-12',
        day: 'Monday',
        marks: 100,
        lessonsRaw: longSyllabus
      }
    ];

    const filtered = ExamSchedulePrint.filterScheduleRows(rows, {
      mode: 'bucket',
      assessment: 'Summative Assessment 1',
      classes: ['Class 10']
    });

    const groups = ExamSchedulePrint.groupRowsForPrint(filtered);
    const html = ExamSchedulePrint.generatePrintDocumentHtml(groups);

    expect(html).toContain('ex-print-col-syllabus');
    expect(html).toContain('Pythagoras Theorem');
  });

  it('8. Scenario 7: Accurate DD-MM-YYYY date formatting and weekday derivation', () => {
    expect(ExamSchedulePrint.formatDateDDMMYYYY('2026-07-08')).toBe('08-07-2026');
    expect(ExamSchedulePrint.formatDateDDMMYYYY('2026-12-01')).toBe('01-12-2026');
    expect(ExamSchedulePrint.formatDateDDMMYYYY('')).toBe('—');

    // 2026-07-08 was Wednesday
    expect(ExamSchedulePrint.getDayOfWeek('2026-07-08', '')).toBe('Wednesday');
    // 2026-11-02 was Monday
    expect(ExamSchedulePrint.getDayOfWeek('2026-11-02', '')).toBe('Monday');
    // Explicit day preserved if provided
    expect(ExamSchedulePrint.getDayOfWeek('2026-07-08', 'Wednesday')).toBe('Wednesday');
  });

  it('9. Scenario 8: Deduplicates duplicate schedule rows', () => {
    const duplicateRows = [
      {
        rowId: 1,
        grade: 'Class 5',
        examName: 'Formative Assessment 1',
        subject: 'Maths',
        date: '2026-07-08',
        day: 'Wednesday',
        lessonsRaw: 'Unit 1'
      },
      {
        rowId: 2,
        grade: 'Class 5',
        examName: 'Formative Assessment 1',
        subject: 'Maths',
        date: '2026-07-08',
        day: 'Wednesday',
        lessonsRaw: 'Unit 1'
      }
    ];

    const filtered = ExamSchedulePrint.filterScheduleRows(duplicateRows, {
      mode: 'bucket',
      assessment: 'Formative Assessment 1',
      classes: ['Class 5']
    });

    expect(filtered.length).toBe(1);
  });

  it('10. Scenario 9: A4 portrait print layout, logo branding (no duplicate text), no signature requirement', () => {
    const groups = ExamSchedulePrint.groupRowsForPrint([sampleScheduleRows[0]]);
    const html = ExamSchedulePrint.generatePrintDocumentHtml(groups, {
      academicYear: '2026–27',
      assessment: 'Formative Assessment 1'
    });

    // Official logo asset only
    expect(html).toContain('src="logo-full.jpg"');
    expect(html).toContain('onerror="this.src=\'header-logo.png\';"');
    // No duplicate text under logo
    expect(html).not.toContain('<h1 class="ex-print-school-name">');
    expect(html).not.toContain('Phone: 9381118421');
    // No signatures requirement
    expect(html).not.toContain('Principal / Examination In-charge');
    expect(html).not.toContain('Notice Board Copy');

    // Five column order and width classes
    expect(html).toContain('ex-print-col-exam');
    expect(html).toContain('ex-print-col-date');
    expect(html).toContain('ex-print-col-day');
    expect(html).toContain('ex-print-col-subject');
    expect(html).toContain('ex-print-col-syllabus');

    // Executive banner with academic year pill
    expect(html).toContain('ex-print-banner');
    expect(html).toContain('ex-banner-pill');
    expect(html).toContain('2026–27');
  });

  it('11. Syllabus formatting enriches lesson numbers from master and preserves existing prefixes', () => {
    const mockCache = {
      'Class 6|||Science': [
        { lessonNo: 4, name: 'Plants: parts and functions' },
        { lessonNo: 5, name: 'Getting to know plants' }
      ],
      'Class 6|||Maths': [
        { lessonNo: 2, name: 'Fractions and Decimals' }
      ]
    };

    // Case A: Lesson without number -> should lookup and prepend Lesson 4
    const resA = ExamSchedulePrint.formatSyllabusCell('Plants: parts and functions', 'Class 6', 'Science', mockCache);
    expect(resA).toContain('Lesson 4:');
    expect(resA).toContain('Plants: parts and functions');

    // Case B: Lesson already has number -> should preserve prefix
    const resB = ExamSchedulePrint.formatSyllabusCell('Chapter 3: Playing with Numbers', 'Class 6', 'Maths', mockCache);
    expect(resB).toContain('Chapter 3:');
    expect(resB).toContain('Playing with Numbers');

    // Case C: Multi-lesson string
    const resC = ExamSchedulePrint.formatSyllabusCell('Plants: parts and functions; Getting to know plants', 'Class 6', 'Science', mockCache);
    expect(resC).toContain('Lesson 4:');
    expect(resC).toContain('Lesson 5:');

    // Case D: 10th Class Revision Schedule style
    const resD = ExamSchedulePrint.formatSyllabusCell('Lessons: 7, 8; N.D - 5', 'Class 10', 'Telugu', mockCache);
    expect(resD).toContain('Lessons: 7, 8');
    expect(resD).toContain('N.D - 5');
  });

  it('12. Non-regression: Normalization and sorting handles Nursery, LKG, UKG, Class 1-10', () => {
    const rawClasses = ['Grade 10', 'Class 3', 'UKG', 'Class 1', 'Nursery', 'LKG', 'Grade 7'];
    const sorted = ExamSchedulePrint.sortClasses(rawClasses);
    expect(sorted).toEqual(['Nursery', 'LKG', 'UKG', 'Class 1', 'Class 3', 'Grade 7', 'Grade 10']);
  });

  it('13. UI Flow: Selection Modal rendering, Mode A interactions, Mode B toggling, and Preview navigation', () => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    ExamSchedulePrint.open({ rows: sampleScheduleRows });

    const modal = document.getElementById('exPrintSelectModal');
    expect(modal).toBeTruthy();

    const tabBucket = document.getElementById('exPrintTabBucket');
    const tabIndiv = document.getElementById('exPrintTabIndiv');
    expect(tabBucket?.classList.contains('active')).toBe(true);

    const asmtSelect = document.getElementById('exPrintAsmtSelect') as HTMLSelectElement;
    expect(asmtSelect).toBeTruthy();
    expect(asmtSelect.options.length).toBeGreaterThan(0);

    const summary = document.getElementById('exPrintSummaryStrip');
    expect(summary?.textContent).toContain('Schedule Row');

    const previewBtn = document.getElementById('exPrintPreviewBtn') as HTMLButtonElement;
    expect(previewBtn.disabled).toBe(false);

    // Clear selection
    const clearBtn = document.getElementById('exPrintBktClear');
    clearBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(previewBtn.disabled).toBe(true);

    // Select All in Mode A
    const selectAllBtn = document.getElementById('exPrintBktSelectAll');
    selectAllBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(previewBtn.disabled).toBe(false);

    // Switch to Individual Mode (Mode B)
    tabIndiv?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(tabIndiv?.classList.contains('active')).toBe(true);
    expect(modal?.innerHTML).toContain('1. Select Classes');
    expect(modal?.innerHTML).toContain('2. Select Examinations for Selected Classes');

    // Switch back to Bucket Mode to preview
    tabBucket?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(previewBtn.disabled).toBe(false);

    // Open Preview
    previewBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const previewModal = document.getElementById('exPrintPreviewModal');
    expect(previewModal).toBeTruthy();
    expect(previewModal?.innerHTML).toContain('Print Preview · Examination Schedule');
    expect(previewModal?.innerHTML).toContain('logo-full.jpg');

    // Back to Selection
    const backBtn = document.getElementById('exPrintBackToSelBtn');
    backBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById('exPrintPreviewModal')).toBeNull();
    expect(document.getElementById('exPrintSelectModal')).toBeTruthy();

    // Close Modal
    const closeBtn = document.getElementById('exPrintCloseModalBtn');
    closeBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById('exPrintSelectModal')).toBeNull();
  });

  it('14. Alternating Exam-Set Fill Shading: 1st exam set is white, 2nd exam set has ex-exam-shaded-row, 3rd exam set is white', () => {
    const multiExamRows = [
      { grade: 'Class 6', examName: 'Class Test 5', subject: 'Hindi', date: '2026-11-23', lessonsRaw: 'Lesson 1' },
      { grade: 'Class 6', examName: 'Class Test 5', subject: 'Science', date: '2026-11-25', lessonsRaw: 'Lesson 4' },
      { grade: 'Class 6', examName: 'Class Test 6', subject: 'Hindi', date: '2026-12-01', lessonsRaw: 'Lesson 2' },
      { grade: 'Class 6', examName: 'Class Test 6', subject: 'Science', date: '2026-12-03', lessonsRaw: 'Lesson 5' },
      { grade: 'Class 6', examName: 'Formative Assessment 3', subject: 'Hindi', date: '2026-12-15', lessonsRaw: 'Lessons 1-3' }
    ];

    const groups = ExamSchedulePrint.groupRowsForPrint(multiExamRows);
    const html = ExamSchedulePrint.generatePrintDocumentHtml(groups, { academicYear: '2026-27' });
    const container = document.createElement('div');
    container.innerHTML = html;

    const trs = container.querySelectorAll('tbody tr');
    expect(trs.length).toBe(5);

    // Set 0 (Class Test 5): no fill shading
    expect(trs[0].classList.contains('ex-exam-shaded-row')).toBe(false);
    expect(trs[1].classList.contains('ex-exam-shaded-row')).toBe(false);

    // Set 1 (Class Test 6): header fill shading (#f1f5f9)
    expect(trs[2].classList.contains('ex-exam-shaded-row')).toBe(true);
    expect(trs[3].classList.contains('ex-exam-shaded-row')).toBe(true);

    // Set 2 (Formative Assessment 3): no fill shading
    expect(trs[4].classList.contains('ex-exam-shaded-row')).toBe(false);
  });

  it('15. Manual Fit to 1 Page Toggle: Standard spacious by default, activates .ex-fit-single-page when clicked', () => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    ExamSchedulePrint.open({ rows: sampleScheduleRows });
    const previewBtn = document.getElementById('exPrintPreviewBtn') as HTMLButtonElement;
    previewBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const previewModal = document.getElementById('exPrintPreviewModal');
    expect(previewModal).toBeTruthy();

    const fitBtn = document.getElementById('exPrintFit1PageBtn');
    expect(fitBtn).toBeTruthy();
    expect(fitBtn?.textContent).toContain('Fit to 1 Page');
    expect(fitBtn?.classList.contains('active')).toBe(false);

    // Default: doc does not have ex-fit-single-page
    const docEl = previewModal?.querySelector('#exPrintDoc');
    expect(docEl?.classList.contains('ex-fit-single-page')).toBe(false);

    // Toggle ON
    fitBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(fitBtn?.classList.contains('active')).toBe(true);
    expect(fitBtn?.textContent).toContain('Fit to 1 Page: ON');
    expect(docEl?.classList.contains('ex-fit-single-page')).toBe(true);

    // Toggle OFF
    fitBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(fitBtn?.classList.contains('active')).toBe(false);
    expect(fitBtn?.textContent).toContain('Fit to 1 Page');
    expect(docEl?.classList.contains('ex-fit-single-page')).toBe(false);

    // Close preview
    const closeBtn = document.getElementById('exPrintClosePreviewBtn');
    closeBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById('exPrintPreviewModal')).toBeNull();
  });
});

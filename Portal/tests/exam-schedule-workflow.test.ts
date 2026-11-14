// =========================================================================
// Examination Schedule Import & Syllabus Mapping End-to-End Workflow Tests
// =========================================================================
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import Parser from '../exam-schedule-import-parser.js';

describe('Examination Schedule Import & Teacher Mapping Workflow', () => {

  describe('1. Realistic Workbook with Multiple Exams, Grades & Subjects', () => {
    it('parses realistic schedule covering CT 3, CT 4, CT 5, FA 2, and SA 1', () => {
      // Realistic workbook requested in Part 10:
      // Contains: Class Test 3, Class Test 4, Class Test 5, Formative Assessment 2, Summative Assessment 1
      const sheetData = [
        ['[Decorative Logo / Banner]', '', '', '', '', ''],
        ['Sapthagiri High School - Annual Examination Schedule 2026-27', '', '', '', '', ''],
        ['Class', 'Exam Name', 'Maximum Marks', 'Date', 'Day', 'Subject'],
        ['Grade 8', 'CT 3', 25, '2026-11-20', 'Friday', 'Mathematics'],
        ['Grade 8', 'CT 3', 25, '2026-11-21', 'Saturday', 'Physics'],
        ['Grade 8', 'CT 3', 25, '2026-11-23', 'Monday', 'Biology'],
        ['Grade 9', 'CT 4', 25, '2026-12-05', 'Saturday', 'English'],
        ['Grade 9', 'CT 5', 25, '2026-12-18', 'Friday', 'Social Studies'],
        ['Grade 10', 'FA 2', 50, '2027-01-11', 'Monday', 'Telugu'],
        ['Grade 10', 'SA 1', 100, '2027-02-15', 'Monday', 'Mathematics'],
        ['Grade 10', 'SA 1', 50, '2027-02-16', 'Tuesday', 'Physics'],
        ['Grade 10', 'SA 1', 50, '2027-02-17', 'Wednesday', 'Biology'],
      ];

      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      const res = Parser.parseScheduleSheet(ws);

      expect(res.records.length).toBe(9);
      expect(res.warnings.length).toBe(0);

      // Verify normalization across records
      expect(res.records[0].examName).toBe('Class Test 3');
      expect(res.records[0].grade).toBe('Grade 8');
      expect(res.records[0].subject).toBe('Maths');
      expect(res.records[0].bucket).toBe('FA-2');

      expect(res.records[3].examName).toBe('Class Test 4');
      expect(res.records[3].bucket).toBe('FA-2');

      expect(res.records[4].examName).toBe('Class Test 5');
      expect(res.records[4].bucket).toBe('FA-3');

      expect(res.records[5].examName).toBe('Formative Assessment 2');
      expect(res.records[5].bucket).toBe('FA-2');

      expect(res.records[6].examName).toBe('Summative Assessment 1');
      expect(res.records[6].bucket).toBe('SA-1');
      expect(res.records[6].marks).toBe(100);

      expect(res.records[7].subject).toBe('Physics');
      expect(res.records[7].marks).toBe(50);

      expect(res.records[8].subject).toBe('Biology');
      expect(res.records[8].marks).toBe(50);
    });
  });

  describe('2. Maths-1 & Maths-2 Combined Strand Mapping (Part 6)', () => {
    // Mock master lessons in app.syllabus_lessons
    const masterLessons = {
      'Maths-1': [
        { id: 'm1-1', lessonNo: 1, name: 'Real Numbers', targetMonth: 'June' },
        { id: 'm1-2', lessonNo: 2, name: 'Sets', targetMonth: 'July' },
        { id: 'm1-3', lessonNo: 3, name: 'Polynomials', targetMonth: 'August' }
      ],
      'Maths-2': [
        { id: 'm2-1', lessonNo: 1, name: 'Similar Triangles', targetMonth: 'June' },
        { id: 'm2-2', lessonNo: 2, name: 'Coordinate Geometry', targetMonth: 'July' },
        { id: 'm2-3', lessonNo: 3, name: 'Trigonometry', targetMonth: 'August' }
      ]
    };

    function resolveMathsSyllabusCatalogue(grade: string, subject: string) {
      const isMaths = /^(math|maths|mathematics|maths-1|maths-2)$/i.test(subject.trim());
      const m = grade.match(/\b(\d+)\b/);
      const gn = m ? parseInt(m[1], 10) : 0;
      const isHighSchool = gn >= 8 && gn <= 10;

      if (isMaths && isHighSchool) {
        // Tag with strand badge and merge
        const m1 = masterLessons['Maths-1'].map(l => ({ ...l, strand: 'Maths-1' }));
        const m2 = masterLessons['Maths-2'].map(l => ({ ...l, strand: 'Maths-2' }));
        return [...m1, ...m2];
      }
      return masterLessons['Maths-1'];
    }

    it('combines Maths-1 and Maths-2 lessons for Grade 8, 9, 10 without duplicating IDs', () => {
      const catalogue = resolveMathsSyllabusCatalogue('Grade 8', 'Mathematics');
      expect(catalogue.length).toBe(6);

      const m1Lessons = catalogue.filter(l => l.strand === 'Maths-1');
      const m2Lessons = catalogue.filter(l => l.strand === 'Maths-2');

      expect(m1Lessons.length).toBe(3);
      expect(m2Lessons.length).toBe(3);

      // Verify no duplicate IDs
      const ids = catalogue.map(l => l.id);
      expect(new Set(ids).size).toBe(6);
    });

    it('allows progressive multi-teacher mapping without overwriting previous selections', () => {
      // Step 1: Teacher 1 (Maths-1 teacher) maps Real Numbers and Sets
      let examSyllabus: string[] = ['Real Numbers', 'Sets'];

      // Step 2: Teacher 2 (Maths-2 teacher) opens mapping, sees Real Numbers and Sets pre-checked,
      // and adds Similar Triangles and Trigonometry
      const newlySelectedByTeacher2 = ['Similar Triangles', 'Trigonometry'];
      const updatedSyllabus = Array.from(new Set([...examSyllabus, ...newlySelectedByTeacher2]));

      expect(updatedSyllabus).toEqual(['Real Numbers', 'Sets', 'Similar Triangles', 'Trigonometry']);
      expect(updatedSyllabus.length).toBe(4);
    });
  });

  describe('3. Lock & Window Permission Enforcement (Part 5)', () => {
    const lockMatrix = {
      buckets: ['FA-1', 'FA-2', 'SA-1', 'FA-3', 'FA-4', 'SA-2'],
      rows: [
        { class: '8', locks: { 'FA-1': true, 'FA-2': false, 'SA-1': true } },
        { class: '9', locks: { 'FA-1': true, 'FA-2': true, 'SA-1': true } }
      ]
    };

    function isMappingWindowOpen(grade: string, examName: string): boolean {
      const bucket = Parser.examNameToBucket(examName);
      if (!bucket) return true;
      const m = grade.match(/\b(\d+)\b/);
      const gn = m ? m[1] : '';
      const row = lockMatrix.rows.find(r => r.class === gn);
      if (!row) return true;
      // If locked === true, mapping window is closed
      return !row.locks[bucket];
    }

    it('correctly reports open or closed mapping window per class and exam bucket', () => {
      // Grade 8: FA-2 is open (false in locks)
      expect(isMappingWindowOpen('Grade 8', 'Class Test 3')).toBe(true);
      expect(isMappingWindowOpen('Grade 8', 'Formative Assessment 2')).toBe(true);

      // Grade 8: SA-1 is locked
      expect(isMappingWindowOpen('Grade 8', 'Summative Assessment 1')).toBe(false);

      // Grade 9: FA-2 is locked
      expect(isMappingWindowOpen('Grade 9', 'Class Test 3')).toBe(false);
      expect(isMappingWindowOpen('Grade 9', 'Formative Assessment 2')).toBe(false);
    });
  });

  describe('4. Readiness Indicator Computation (Part 4)', () => {
    function computeReadiness(rows: Array<{ status: string; lessonsRaw?: string }>) {
      const total = rows.length;
      if (total === 0) return { total: 0, submitted: 0, pending: 0, status: 'EMPTY' };

      const submitted = rows.filter(r => r.status === 'SCHEDULED' || (r.lessonsRaw && r.lessonsRaw.trim().length > 0)).length;
      const pending = total - submitted;

      let status = 'PENDING_SYLLABUS';
      if (submitted === total) {
        status = 'READY';
      } else if (submitted > 0) {
        status = 'PARTIALLY_READY';
      }

      return { total, submitted, pending, status };
    }

    it('calculates exam readiness as Ready only when 100% of required mappings are complete', () => {
      const readyExam = [
        { status: 'SCHEDULED', lessonsRaw: 'Lesson 1' },
        { status: 'SCHEDULED', lessonsRaw: 'Lesson 2' },
        { status: 'SCHEDULED', lessonsRaw: 'Lesson 3' }
      ];
      expect(computeReadiness(readyExam).status).toBe('READY');

      const partialExam = [
        { status: 'SCHEDULED', lessonsRaw: 'Lesson 1' },
        { status: 'PENDING_SYLLABUS', lessonsRaw: '' },
        { status: 'SCHEDULED', lessonsRaw: 'Lesson 3' }
      ];
      const partialRes = computeReadiness(partialExam);
      expect(partialRes.status).toBe('PARTIALLY_READY');
      expect(partialRes.submitted).toBe(2);
      expect(partialRes.pending).toBe(1);

      const pendingExam = [
        { status: 'PENDING_SYLLABUS', lessonsRaw: '' },
        { status: 'PENDING_SYLLABUS', lessonsRaw: '' }
      ];
      expect(computeReadiness(pendingExam).status).toBe('PENDING_SYLLABUS');
    });
  });

  describe('5. Multi-Class Workbook & Selective Class Updating (Class Tests Schedule.xlsx)', () => {
    it('parses multi-class workbook sheets 6, 7, 8, 9, 10 while ignoring column F onwards', () => {
      const wb = XLSX.utils.book_new();

      const makeSheetData = (gradeStr: string) => [
        ['SAPTHAGIRI HIGH SCHOOL', '', '', '', '', ''],
        [`${gradeStr}th EXAMS SCHEDULE`, '', '', '', '', ''],
        ['EXAM', 'Max. Marks', 'Date', 'Day', 'Subject', 'Syllabus', 'Extra Note'],
        ['CLASS TEST - 1', 20, '2026-07-10', 'Friday', 'Hindi', '1. आम ले लो आम!', 'Ignore this'],
        ['CLASS TEST - 1', 20, '2026-07-11', 'Saturday', 'Telugu', "1. 'అభినందన'", 'Ignore this'],
        ['CLASS TEST - 5', 20, '2026-11-20', 'Friday', 'Mathematics', '5. Linear Equations', 'Ignore this'],
        ['FA - 3', 50, '2026-12-15', 'Tuesday', 'Science', 'All Portions', 'Ignore this']
      ];

      ['6', '7', '8', '9', '10'].forEach(sheetName => {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(makeSheetData(sheetName)), sheetName);
      });

      const parsed = Parser.parseScheduleWorkbook(wb);

      expect(parsed.totalParsed).toBe(20); // 4 rows * 5 sheets
      expect(parsed.classSheetsFound.length).toBe(5);
      expect(parsed.classSheetsFound.map(c => c.className)).toEqual(['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10']);

      // Verify Column F (Syllabus) is completely ignored in records
      parsed.records.forEach(rec => {
        expect((rec as any).syllabus).toBeUndefined();
        expect((rec as any).lessons).toBeUndefined();
        expect(rec.marks).toBe(rec.examName.includes('Formative') ? 50 : 20);
      });
    });

    it('filters schedule records strictly to user-selected classes', () => {
      const allRecords = [
        { grade: 'Grade 6', examName: 'Class Test 1', subject: 'Hindi', date: '2026-07-10', marks: 20 },
        { grade: 'Grade 7', examName: 'Class Test 1', subject: 'Hindi', date: '2026-07-10', marks: 20 },
        { grade: 'Grade 8', examName: 'Class Test 1', subject: 'Hindi', date: '2026-07-10', marks: 20 },
        { grade: 'Grade 9', examName: 'Class Test 1', subject: 'Hindi', date: '2026-07-10', marks: 20 },
        { grade: 'Grade 10', examName: 'Class Test 1', subject: 'Hindi', date: '2026-07-10', marks: 20 }
      ];

      // User chooses only Grade 8 and Grade 10
      const chosenClasses = ['Grade 8', 'Grade 10'];
      const filtered = allRecords.filter(r => chosenClasses.includes(r.grade));

      expect(filtered.length).toBe(2);
      expect(filtered.map(r => r.grade)).toEqual(['Grade 8', 'Grade 10']);
    });
  });

  describe('6. Discrepancy Comparison Table & New Exams (CT-5, CT-6, FA-3) Detection', () => {
    it('accurately detects date/marks discrepancies for existing exams up to FA-2 and classifies new exams', () => {
      // Existing DB schedule (up to FA-2)
      const existingDbRows = [
        // Class Test 1 - matching date
        { rowId: 101, grade: 'Grade 10', examName: 'Class Test 1', subject: 'Physics', date: '2026-07-08', marks: 20 },
        // Class Test 2 - date discrepancy (DB has 2026-07-20, Excel has 2026-07-22)
        { rowId: 102, grade: 'Grade 10', examName: 'Class Test 2', subject: 'Physics', date: '2026-07-20', marks: 20 },
        // Formative Assessment 2 - marks discrepancy (DB has 25, Excel has 50)
        { rowId: 103, grade: 'Grade 10', examName: 'Formative Assessment 2', subject: 'Physics', date: '2026-10-15', marks: 25 }
      ];

      // Uploaded Excel records (including existing CT-1, CT-2, FA-2 + new CT-5, CT-6, FA-3)
      const uploadedRecords = [
        { rowNum: 4, grade: 'Grade 10', examName: 'Class Test 1', subject: 'Physics', date: '2026-07-08', day: 'Wednesday', marks: 20, isValid: true },
        { rowNum: 5, grade: 'Grade 10', examName: 'Class Test 2', subject: 'Physics', date: '2026-07-22', day: 'Wednesday', marks: 20, isValid: true },
        { rowNum: 6, grade: 'Grade 10', examName: 'Formative Assessment 2', subject: 'Physics', date: '2026-10-15', day: 'Thursday', marks: 50, isValid: true },
        // Brand new exams:
        { rowNum: 7, grade: 'Grade 10', examName: 'Class Test 5', subject: 'Physics', date: '2026-11-25', day: 'Wednesday', marks: 20, isValid: true },
        { rowNum: 8, grade: 'Grade 10', examName: 'Class Test 6', subject: 'Physics', date: '2026-12-10', day: 'Thursday', marks: 20, isValid: true },
        { rowNum: 9, grade: 'Grade 10', examName: 'Formative Assessment 3', subject: 'Physics', date: '2026-12-22', day: 'Tuesday', marks: 50, isValid: true }
      ];

      const recon = Parser.reconcileSchedule(uploadedRecords, existingDbRows);

      // Verify reconciliation counts
      expect(recon.summary.unchangedCount).toBe(1); // CT 1
      expect(recon.summary.changedCount).toBe(2);   // CT 2 (date mismatch) + FA 2 (marks mismatch)
      expect(recon.summary.newCount).toBe(3);       // CT 5, CT 6, FA 3

      // Verify discrepancy comparison table fields for Changed records
      const dateDiff = recon.changedRecords.find(c => c.record.examName === 'Class Test 2');
      expect(dateDiff).toBeDefined();
      expect(dateDiff?.diffs[0].field).toBe('Date');
      expect(dateDiff?.diffs[0].existingValue).toBe('2026-07-20');
      expect(dateDiff?.diffs[0].uploadedValue).toBe('2026-07-22');

      const marksDiff = recon.changedRecords.find(c => c.record.examName === 'Formative Assessment 2');
      expect(marksDiff).toBeDefined();
      expect(marksDiff?.diffs[0].field).toBe('Maximum Marks');
      expect(marksDiff?.diffs[0].existingValue).toBe(25);
      expect(marksDiff?.diffs[0].uploadedValue).toBe(50);

      // Verify Newly Added Exams (CT-5, CT-6, FA-3)
      const newExamNames = recon.newRecords.map(n => n.record.examName);
      expect(newExamNames).toEqual(['Class Test 5', 'Class Test 6', 'Formative Assessment 3']);

      // When newly created in DB, payload has lessons: []
      recon.newRecords.forEach(n => {
        const payload = {
          examName: n.record.examName,
          grade: n.record.grade,
          subject: n.record.subject,
          date: n.record.date,
          marks: String(n.record.marks),
          lessons: [],
          syllabusText: ''
        };
        // Simulated teacher mapping view: hasSyllabus is false
        const hasSyllabus = Boolean(payload.lessons.length > 0 || (payload.syllabusText && payload.syllabusText.trim().length > 0));
        expect(hasSyllabus).toBe(false);
      });
    });
  });

  describe('8. Smart Lock Manager in Schedule Tab & Bucket Permission Verification', () => {
    const mockLockMatrix = {
      buckets: ['FA-1', 'FA-2', 'SA-1', 'FA-3', 'FA-4', 'SA-2'],
      rows: [
        { class: '6', locks: { 'FA-1': false, 'FA-2': false, 'SA-1': false, 'FA-3': true, 'FA-4': true, 'SA-2': true } },
        { class: '7', locks: { 'FA-1': false, 'FA-2': false, 'SA-1': false, 'FA-3': true, 'FA-4': true, 'SA-2': true } },
        { class: '8', locks: { 'FA-1': false, 'FA-2': false, 'SA-1': false, 'FA-3': true, 'FA-4': true, 'SA-2': true } },
        { class: '9', locks: { 'FA-1': false, 'FA-2': false, 'SA-1': false, 'FA-3': true, 'FA-4': true, 'SA-2': true } },
        { class: '10', locks: { 'FA-1': false, 'FA-2': false, 'SA-1': false, 'FA-3': true, 'FA-4': true, 'SA-2': true } }
      ]
    };

    function isBucketLocked(grade: string, examName: string, matrix: typeof mockLockMatrix) {
      const bucket = Parser.examNameToBucket(examName);
      if (!bucket) return false;
      const gn = parseInt(String(grade).replace(/\D+/g, ''), 10);
      const row = matrix.rows.find(r => parseInt(r.class, 10) === gn);
      return row && row.locks ? Boolean((row.locks as any)[bucket]) : false;
    }

    it('correctly maps CT-5 to FA-3 and SA-1 to SA-1', () => {
      expect(Parser.examNameToBucket('Class Test 5')).toBe('FA-3');
      expect(Parser.examNameToBucket('CT-5')).toBe('FA-3');
      expect(Parser.examNameToBucket('CT 6')).toBe('FA-3');
      expect(Parser.examNameToBucket('Summative Assessment 1')).toBe('SA-1');
      expect(Parser.examNameToBucket('SA-1')).toBe('SA-1');
    });

    it('explains why CT-5 is blocked while SA-1 shows Add Syllabus', () => {
      // In the default lock state:
      // SA-1 is unlocked -> returns false (Open for teachers -> "Add Syllabus" shown)
      expect(isBucketLocked('10', 'SA-1', mockLockMatrix)).toBe(false);

      // CT-5 is locked under FA-3 -> returns true (Locked for teachers -> "Mapping Closed" shown)
      expect(isBucketLocked('10', 'Class Test 5', mockLockMatrix)).toBe(true);
      expect(isBucketLocked('8', 'CT-5', mockLockMatrix)).toBe(true);
    });

    it('simulates Smart Lock Manager 1-click batch unlocking for FA-3 across all classes', () => {
      // Clone matrix
      const matrix = JSON.parse(JSON.stringify(mockLockMatrix));

      // Batch unlock FA-3 across all classes (6-10)
      matrix.rows.forEach((r: any) => {
        r.locks['FA-3'] = false;
      });

      // Now CT-5 is open for all teachers!
      expect(isBucketLocked('6', 'Class Test 5', matrix)).toBe(false);
      expect(isBucketLocked('7', 'Class Test 5', matrix)).toBe(false);
      expect(isBucketLocked('8', 'Class Test 5', matrix)).toBe(false);
      expect(isBucketLocked('9', 'Class Test 5', matrix)).toBe(false);
      expect(isBucketLocked('10', 'Class Test 5', matrix)).toBe(false);
    });
  });

});

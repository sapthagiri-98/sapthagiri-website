// =========================================================================
// Examination Schedule Import Parser & Reconciler Tests
// =========================================================================
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import Parser from '../exam-schedule-import-parser.js';

describe('Exam Schedule Import Parser', () => {

  describe('1. Examination Name Normalization', () => {
    it('normalizes Class Tests 1 to 8 with various abbreviations', () => {
      expect(Parser.normalizeExamName('CT 1')).toBe('Class Test 1');
      expect(Parser.normalizeExamName('CT1')).toBe('Class Test 1');
      expect(Parser.normalizeExamName('C.T. 1')).toBe('Class Test 1');
      expect(Parser.normalizeExamName('C.T.1')).toBe('Class Test 1');
      expect(Parser.normalizeExamName('CT-1')).toBe('Class Test 1');
      expect(Parser.normalizeExamName('Class Test 1')).toBe('Class Test 1');
      expect(Parser.normalizeExamName('class test 3')).toBe('Class Test 3');
      expect(Parser.normalizeExamName('CT 8')).toBe('Class Test 8');
      expect(Parser.normalizeExamName('CT8')).toBe('Class Test 8');
    });

    it('normalizes Formative Assessments 1 to 4 with various abbreviations', () => {
      expect(Parser.normalizeExamName('FA 1')).toBe('Formative Assessment 1');
      expect(Parser.normalizeExamName('FA1')).toBe('Formative Assessment 1');
      expect(Parser.normalizeExamName('F.A. 1')).toBe('Formative Assessment 1');
      expect(Parser.normalizeExamName('FA-2')).toBe('Formative Assessment 2');
      expect(Parser.normalizeExamName('Formative Assessment 2')).toBe('Formative Assessment 2');
      expect(Parser.normalizeExamName('formative 3')).toBe('Formative Assessment 3');
      expect(Parser.normalizeExamName('FA 4')).toBe('Formative Assessment 4');
    });

    it('normalizes Summative Assessments 1 to 2 with various abbreviations', () => {
      expect(Parser.normalizeExamName('SA 1')).toBe('Summative Assessment 1');
      expect(Parser.normalizeExamName('SA1')).toBe('Summative Assessment 1');
      expect(Parser.normalizeExamName('S.A. 1')).toBe('Summative Assessment 1');
      expect(Parser.normalizeExamName('SA-2')).toBe('Summative Assessment 2');
      expect(Parser.normalizeExamName('Summative Assessment 2')).toBe('Summative Assessment 2');
    });

    it('rejects unsupported or unrelated exam names', () => {
      expect(Parser.normalizeExamName('CT 9')).toBeNull(); // Only 1-8 supported
      expect(Parser.normalizeExamName('FA 5')).toBeNull(); // Only 1-4 supported
      expect(Parser.normalizeExamName('SA 3')).toBeNull(); // Only 1-2 supported
      expect(Parser.normalizeExamName('Quarterly Exam')).toBeNull();
      expect(Parser.normalizeExamName('Mid Term 1')).toBeNull();
      expect(Parser.normalizeExamName('')).toBeNull();
      expect(Parser.normalizeExamName(null)).toBeNull();
    });

    it('maps exam names to correct assessment buckets', () => {
      expect(Parser.examNameToBucket('Class Test 1')).toBe('FA-1');
      expect(Parser.examNameToBucket('Class Test 3')).toBe('FA-2');
      expect(Parser.examNameToBucket('Formative Assessment 2')).toBe('FA-2');
      expect(Parser.examNameToBucket('Summative Assessment 1')).toBe('SA-1');
      expect(Parser.examNameToBucket('Class Test 5')).toBe('FA-3');
      expect(Parser.examNameToBucket('Class Test 7')).toBe('FA-4');
      expect(Parser.examNameToBucket('Summative Assessment 2')).toBe('SA-2');
    });
  });

  describe('2. Subject and Class Normalization', () => {
    it('normalizes core academic subjects', () => {
      expect(Parser.normalizeSubject('Telugu')).toBe('Telugu');
      expect(Parser.normalizeSubject('తెలుగు')).toBe('Telugu');
      expect(Parser.normalizeSubject('Hindi')).toBe('Hindi');
      expect(Parser.normalizeSubject('हिन्दी')).toBe('Hindi');
      expect(Parser.normalizeSubject('English')).toBe('English');
      expect(Parser.normalizeSubject('Maths')).toBe('Maths');
      expect(Parser.normalizeSubject('Mathematics')).toBe('Maths');
      expect(Parser.normalizeSubject('Math')).toBe('Maths');
      expect(Parser.normalizeSubject('Maths-1')).toBe('Maths-1');
      expect(Parser.normalizeSubject('Maths-2')).toBe('Maths-2');
      expect(Parser.normalizeSubject('Physics')).toBe('Physics');
      expect(Parser.normalizeSubject('Phy')).toBe('Physics');
      expect(Parser.normalizeSubject('Biology')).toBe('Biology');
      expect(Parser.normalizeSubject('Bio')).toBe('Biology');
      expect(Parser.normalizeSubject('General Science')).toBe('Science');
      expect(Parser.normalizeSubject('Social Studies')).toBe('Social');
      expect(Parser.normalizeSubject('Social')).toBe('Social');
    });

    it('normalizes grade / class names', () => {
      expect(Parser.normalizeClass('Grade 6')).toBe('Grade 6');
      expect(Parser.normalizeClass('Class 6')).toBe('Grade 6');
      expect(Parser.normalizeClass('6')).toBe('Grade 6');
      expect(Parser.normalizeClass('8th')).toBe('Grade 8');
      expect(Parser.normalizeClass('Grade-10')).toBe('Grade 10');
      expect(Parser.normalizeClass('NURSERY')).toBe('Nursery');
      expect(Parser.normalizeClass('LKG')).toBe('LKG');
      expect(Parser.normalizeClass('UKG')).toBe('UKG');
    });
  });

  describe('3. Date & Weekday Verification', () => {
    it('parses formatted string dates (ISO and DMY)', () => {
      const res1 = Parser.parseExcelDate('2026-11-20');
      expect(res1.isValid).toBe(true);
      expect(res1.dateStr).toBe('2026-11-20');
      expect(res1.dayName).toBe('Friday');

      const res2 = Parser.parseExcelDate('25/11/2026');
      expect(res2.isValid).toBe(true);
      expect(res2.dateStr).toBe('2026-11-25');
      expect(res2.dayName).toBe('Wednesday');
    });

    it('parses Excel numeric date serials', () => {
      // 45620 corresponds to 2024-11-24 (Sunday) or similar
      const res = Parser.parseExcelDate(45620);
      expect(res.isValid).toBe(true);
      expect(res.dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(res.dayName).toBeTruthy();
    });

    it('validates that weekday matches the calendar date', () => {
      // 2026-11-20 is a Friday
      const match = Parser.validateWeekday('2026-11-20', 'Friday');
      expect(match.match).toBe(true);
      expect(match.expected).toBe('Friday');

      // Mismatch test
      const mismatch = Parser.validateWeekday('2026-11-20', 'Monday');
      expect(mismatch.match).toBe(false);
      expect(mismatch.error).toContain('Day mismatch');
    });
  });

  describe('4. Sheet Parsing & Header Detection', () => {
    it('ignores Row 1 (logo/banner) and Row 2 (title), reading headers from Row 3', () => {
      // Create a mock sheet matching user requirement:
      // Row 1: Logo/image decorative header
      // Row 2: "Sapthagiri High School Examination Schedule"
      // Row 3: Exam Name | Maximum Marks | Date | Day | Subject
      // Row 4: CT 3      | 25            | 2026-11-20 | Friday | Mathematics
      const data = [
        ['[Decorative Logo Header]', '', '', '', ''],
        ['Sapthagiri High School - Class 8 Schedule 2026-27', '', '', '', ''],
        ['Exam Name', 'Maximum Marks', 'Date', 'Day', 'Subject'],
        ['CT 3', 25, '2026-11-20', 'Friday', 'Mathematics'],
        ['CT 4', 25, '2026-11-21', 'Saturday', 'Physics'],
        ['FA 2', 50, '2026-11-23', 'Monday', 'Social Studies'],
      ];

      const ws = XLSX.utils.aoa_to_sheet(data);
      const res = Parser.parseScheduleSheet(ws, { defaultClass: 'Grade 8' });

      expect(res.headerRow).toBe(3);
      expect(res.records.length).toBe(3);

      const r1 = res.records[0];
      expect(r1.examName).toBe('Class Test 3');
      expect(r1.marks).toBe(25);
      expect(r1.date).toBe('2026-11-20');
      expect(r1.day).toBe('Friday');
      expect(r1.subject).toBe('Maths');
      expect(r1.grade).toBe('Grade 8');
      expect(r1.isValid).toBe(true);

      const r2 = res.records[1];
      expect(r2.examName).toBe('Class Test 4');
      expect(r2.marks).toBe(25);
      expect(r2.subject).toBe('Physics');

      const r3 = res.records[2];
      expect(r3.examName).toBe('Formative Assessment 2');
      expect(r3.marks).toBe(50);
      expect(r3.subject).toBe('Social');
    });

    it('reports invalid exam names as errors while keeping valid records', () => {
      const data = [
        ['', '', '', '', ''],
        ['Title Row', '', '', '', ''],
        ['Exam Name', 'Maximum Marks', 'Date', 'Day', 'Subject'],
        ['CT 3', 25, '2026-11-20', 'Friday', 'Mathematics'],
        ['Midterm Surprise Exam', 50, '2026-11-22', 'Sunday', 'English'],
      ];

      const ws = XLSX.utils.aoa_to_sheet(data);
      const res = Parser.parseScheduleSheet(ws, { defaultClass: 'Grade 8' });

      expect(res.records.length).toBe(2);
      expect(res.records[0].isValid).toBe(true);
      expect(res.records[1].isValid).toBe(false);
      expect(res.records[1].errors[0]).toContain('Unrecognized exam name');
    });
  });

  describe('5. Intelligent 3-Way Reconciliation', () => {
    const existingDbSchedule = [
      // 1. Existing unchanged exam
      {
        rowId: 101,
        examName: 'Class Test 3',
        grade: 'Grade 8',
        gradeLabel: 'Grade 8',
        subject: 'Mathematics',
        date: '2026-11-20',
        marks: 25,
        status: 'SCHEDULED'
      },
      // 2. Existing exam with different date and marks
      {
        rowId: 102,
        examName: 'Class Test 3',
        grade: 'Grade 8',
        gradeLabel: 'Grade 8',
        subject: 'Physics',
        date: '2026-11-15', // Will be changed to 2026-11-21
        marks: 20,         // Will be changed to 25
        status: 'SCHEDULED'
      }
    ];

    it('correctly categorizes records into NEW, CHANGED, and UNCHANGED', () => {
      const uploadedRecords = [
        // Match 1: Class Test 3, Grade 8, Mathematics (Same date 2026-11-20, same marks 25) -> UNCHANGED
        {
          examName: 'Class Test 3',
          grade: 'Grade 8',
          subject: 'Mathematics',
          date: '2026-11-20',
          marks: 25,
          isValid: true
        },
        // Match 2: Class Test 3, Grade 8, Physics (Date 2026-11-21 != 2026-11-15, marks 25 != 20) -> CHANGED
        {
          examName: 'Class Test 3',
          grade: 'Grade 8',
          subject: 'Physics',
          date: '2026-11-21',
          marks: 25,
          isValid: true
        },
        // Match 3: Class Test 3, Grade 8, Biology (Not in DB) -> NEW
        {
          examName: 'Class Test 3',
          grade: 'Grade 8',
          subject: 'Biology',
          date: '2026-11-22',
          marks: 25,
          isValid: true
        }
      ];

      const result = Parser.reconcileSchedule(uploadedRecords, existingDbSchedule);

      expect(result.summary.total).toBe(3);
      expect(result.summary.unchangedCount).toBe(1);
      expect(result.summary.changedCount).toBe(1);
      expect(result.summary.newCount).toBe(1);
      expect(result.summary.invalidCount).toBe(0);

      // Verify Unchanged
      expect(result.unchangedRecords[0].rowId).toBe(101);
      expect(result.unchangedRecords[0].type).toBe('UNCHANGED');

      // Verify Changed with detailed diffs
      expect(result.changedRecords[0].rowId).toBe(102);
      expect(result.changedRecords[0].diffs.length).toBe(2);
      expect(result.changedRecords[0].diffs[0].field).toBe('Date');
      expect(result.changedRecords[0].diffs[0].existingValue).toBe('2026-11-15');
      expect(result.changedRecords[0].diffs[0].uploadedValue).toBe('2026-11-21');
      expect(result.changedRecords[0].diffs[1].field).toBe('Maximum Marks');
      expect(result.changedRecords[0].diffs[1].existingValue).toBe(20);
      expect(result.changedRecords[0].diffs[1].uploadedValue).toBe(25);

      // Verify New
      expect(result.newRecords[0].type).toBe('NEW');
      expect(result.newRecords[0].record.subject).toBe('Biology');
    });

    it('is strictly idempotent on re-upload of identical data', () => {
      // If DB has all 3 records already up to date
      const syncedDb = [
        { rowId: 101, examName: 'Class Test 3', grade: 'Grade 8', subject: 'Mathematics', date: '2026-11-20', marks: 25 },
        { rowId: 102, examName: 'Class Test 3', grade: 'Grade 8', subject: 'Physics', date: '2026-11-21', marks: 25 },
        { rowId: 103, examName: 'Class Test 3', grade: 'Grade 8', subject: 'Biology', date: '2026-11-22', marks: 25 },
      ];

      const uploadedRecords = [
        { examName: 'Class Test 3', grade: 'Grade 8', subject: 'Mathematics', date: '2026-11-20', marks: 25, isValid: true },
        { examName: 'Class Test 3', grade: 'Grade 8', subject: 'Physics', date: '2026-11-21', marks: 25, isValid: true },
        { examName: 'Class Test 3', grade: 'Grade 8', subject: 'Biology', date: '2026-11-22', marks: 25, isValid: true }
      ];

      const result = Parser.reconcileSchedule(uploadedRecords, syncedDb);

      expect(result.summary.unchangedCount).toBe(3);
      expect(result.summary.newCount).toBe(0);
      expect(result.summary.changedCount).toBe(0);
    });
  });

  describe('6. Class Identification from Excel Sheet Names (6, 7, 8, 9, 10)', () => {
    it('identifies classes directly from bare digit sheet names (6 to 10)', () => {
      expect(Parser.classFromSheetName('6')).toBe('Grade 6');
      expect(Parser.classFromSheetName('7')).toBe('Grade 7');
      expect(Parser.classFromSheetName('8')).toBe('Grade 8');
      expect(Parser.classFromSheetName('9')).toBe('Grade 9');
      expect(Parser.classFromSheetName('10')).toBe('Grade 10');
    });

    it('identifies classes from formatted sheet name variants', () => {
      expect(Parser.classFromSheetName('Grade 6')).toBe('Grade 6');
      expect(Parser.classFromSheetName('Class 7')).toBe('Grade 7');
      expect(Parser.classFromSheetName('Grade-8')).toBe('Grade 8');
      expect(Parser.classFromSheetName('9th')).toBe('Grade 9');
      expect(Parser.classFromSheetName('Class 10')).toBe('Grade 10');
    });

    it('returns null for unrecognized sheets', () => {
      expect(Parser.classFromSheetName('Summary')).toBeNull();
      expect(Parser.classFromSheetName('Instructions')).toBeNull();
      expect(Parser.classFromSheetName('Random Sheet')).toBeNull();
      expect(Parser.classFromSheetName('11')).toBeNull();
    });

    it('parses a multi-sheet workbook with sheets 6, 7, 8, 9, 10 independently', () => {
      const wb = XLSX.utils.book_new();

      const createSheetData = (examName: string, subj: string, marks: number) => [
        ['Logo Header', '', '', '', ''],
        ['Schedule Title', '', '', '', ''],
        ['Exam Name', 'Maximum Marks', 'Date', 'Day', 'Subject'],
        [examName, marks, '2026-11-20', 'Friday', subj]
      ];

      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(createSheetData('CT 3', 'Telugu', 25)), '6');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(createSheetData('CT 3', 'Hindi', 25)), '7');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(createSheetData('CT 3', 'Mathematics', 25)), '8');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(createSheetData('CT 3', 'Physics', 25)), '9');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(createSheetData('CT 3', 'Biology', 25)), '10');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Unrecognized Notes']]), 'Curriculum Notes');

      const res = Parser.parseScheduleWorkbook(wb);

      expect(res.totalParsed).toBe(5);
      expect(res.classSheetsFound.length).toBe(5);
      expect(res.classSheetsFound.map(c => c.sheetName)).toEqual(['6', '7', '8', '9', '10']);
      expect(res.classSheetsFound.map(c => c.className)).toEqual(['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10']);

      // Unrecognized sheet flagged
      expect(res.unrecognizedSheets.length).toBe(1);
      expect(res.unrecognizedSheets[0].sheetName).toBe('Curriculum Notes');

      // Verify each record is correctly bound to its class
      expect(res.records[0].grade).toBe('Grade 6');
      expect(res.records[0].subject).toBe('Telugu');

      expect(res.records[1].grade).toBe('Grade 7');
      expect(res.records[1].subject).toBe('Hindi');

      expect(res.records[2].grade).toBe('Grade 8');
      expect(res.records[2].subject).toBe('Maths');

      expect(res.records[3].grade).toBe('Grade 9');
      expect(res.records[3].subject).toBe('Physics');

      expect(res.records[4].grade).toBe('Grade 10');
      expect(res.records[4].subject).toBe('Biology');

      // Test grouping in reconciliation
      const recon = Parser.reconcileSchedule(res.records, []);
      expect(Object.keys(recon.byClass)).toEqual(['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10']);
      expect(recon.byClass['Grade 6'].newRecords.length).toBe(1);
      expect(recon.byClass['Grade 10'].newRecords.length).toBe(1);
    });
  });

});

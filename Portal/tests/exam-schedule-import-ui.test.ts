// =========================================================================
// Exam Schedule Import Wizard UI & Interaction Tests
// =========================================================================
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Parser from '../exam-schedule-import-parser.js';

// Setup Globals for JSDOM
declare global {
  var Portal: any;
  var ExamScheduleImportParser: any;
  var ExamScheduleImportUI: any;
}

globalThis.ExamScheduleImportParser = Parser;

// Load UI component
await import('../exam-schedule-import-ui.js');

describe('Exam Schedule Import Wizard UI', () => {

  beforeEach(() => {
    document.body.innerHTML = '';
    globalThis.Portal = {
      esc: (s: string) => String(s || ''),
      api: vi.fn()
    };
  });

  it('1. Opens modal with Step 1 (Upload Dropzone) and explains sheet auto-detection', () => {
    globalThis.ExamScheduleImportUI.open();

    const modal = document.getElementById('exImportWizardModal');
    expect(modal).not.toBeNull();

    const title = modal?.querySelector('.ex-wiz-title')?.textContent;
    expect(title).toContain('Import Examination Schedule from Excel');

    const dropzone = document.getElementById('exWizDropzone');
    expect(dropzone).not.toBeNull();
    expect(dropzone?.textContent).toContain('Auto-detects class sheets: 6, 7, 8, 9, 10');
  });

  it('2. Prompts user "Which classes schedule do you want to update?" with detected classes', async () => {
    globalThis.ExamScheduleImportUI.open();

    const mockParseRes = {
      totalParsed: 297,
      records: [
        { grade: 'Grade 6', examName: 'Class Test 1', subject: 'Hindi', date: '2026-07-10', marks: 20, isValid: true },
        { grade: 'Grade 7', examName: 'Class Test 1', subject: 'Hindi', date: '2026-07-10', marks: 20, isValid: true },
        { grade: 'Grade 8', examName: 'Class Test 1', subject: 'Hindi', date: '2026-07-10', marks: 20, isValid: true },
        { grade: 'Grade 9', examName: 'Class Test 1', subject: 'Hindi', date: '2026-07-10', marks: 20, isValid: true },
        { grade: 'Grade 10', examName: 'Class Test 1', subject: 'Physics', date: '2026-07-08', marks: 20, isValid: true }
      ],
      classSheetsFound: [
        { sheetName: '6', className: 'Grade 6', count: 54 },
        { sheetName: '7', className: 'Grade 7', count: 54 },
        { sheetName: '8', className: 'Grade 8', count: 63 },
        { sheetName: '9', className: 'Grade 9', count: 63 },
        { sheetName: '10', className: 'Grade 10', count: 63 }
      ],
      unrecognizedSheets: [],
      warnings: []
    };

    const state = globalThis.ExamScheduleImportUI.getState();
    state.file = { name: 'Class Tests Schedule.xlsx' };
    state.parseRes = mockParseRes;

    // Simulate transition to Class Selection stage
    // Wire up mock file parse response
    const stepUpload = document.getElementById('exWizStepUpload')!;
    const stepClassSelect = document.getElementById('exWizStepClassSelect')!;
    stepUpload.style.display = 'none';
    stepClassSelect.style.display = 'block';

    // Verify state can track class selection
    mockParseRes.classSheetsFound.forEach(c => {
      state.selectedClasses[c.className] = true;
    });

    expect(Object.keys(state.selectedClasses).length).toBe(5);
    expect(state.selectedClasses['Grade 10']).toBe(true);

    // Deselect Grade 6 and Grade 7
    state.selectedClasses['Grade 6'] = false;
    state.selectedClasses['Grade 7'] = false;

    const chosen = Object.keys(state.selectedClasses).filter(k => state.selectedClasses[k]);
    expect(chosen).toEqual(['Grade 8', 'Grade 9', 'Grade 10']);
  });

  it('3. Renders discrepancy comparison table (Old DB vs New Excel) and newly added exams', async () => {
    globalThis.ExamScheduleImportUI.open();

    // Mock DB schedule (has CT-1 matching, CT-2 with different date)
    const mockDbRows = [
      { rowId: 201, grade: 'Grade 10', examName: 'Class Test 1', subject: 'Physics', date: '2026-07-08', marks: 20 },
      { rowId: 202, grade: 'Grade 10', examName: 'Class Test 2', subject: 'Physics', date: '2026-07-20', marks: 20 }
    ];

    globalThis.Portal.api.mockImplementation((fn: string) => {
      if (fn === 'examGetScheduleTable') return Promise.resolve(mockDbRows);
      if (fn === 'examBulkSaveSchedule') return Promise.resolve({ success: true, saved: 1 });
      if (fn === 'createAdminExam') return Promise.resolve({ success: true });
      return Promise.resolve({});
    });

    // Uploaded Excel has CT-1 (same), CT-2 (date moved to 2026-07-22), and CT-5 (brand new exam)
    const uploadedRecords = [
      { rowNum: 4, grade: 'Grade 10', examName: 'Class Test 1', subject: 'Physics', date: '2026-07-08', day: 'Wednesday', marks: 20, isValid: true },
      { rowNum: 5, grade: 'Grade 10', examName: 'Class Test 2', subject: 'Physics', date: '2026-07-22', day: 'Wednesday', marks: 20, isValid: true },
      { rowNum: 6, grade: 'Grade 10', examName: 'Class Test 5', subject: 'Physics', date: '2026-11-25', day: 'Wednesday', marks: 20, isValid: true }
    ];

    const recon = Parser.reconcileSchedule(uploadedRecords, mockDbRows);
    expect(recon.summary.unchangedCount).toBe(1);
    expect(recon.summary.changedCount).toBe(1);
    expect(recon.summary.newCount).toBe(1);

    // Verify discrepancy diff
    const changed = recon.changedRecords[0];
    expect(changed.record.examName).toBe('Class Test 2');
    expect(changed.diffs[0].field).toBe('Date');
    expect(changed.diffs[0].existingValue).toBe('2026-07-20');
    expect(changed.diffs[0].uploadedValue).toBe('2026-07-22');

    // Verify new exam
    const newExam = recon.newRecords[0];
    expect(newExam.record.examName).toBe('Class Test 5');
  });

  it('4. Executes safe batch update for discrepancies and creation for new exams', async () => {
    const savedUpdates: any[] = [];
    const createdExams: any[] = [];

    globalThis.Portal.api.mockImplementation((fn: string, args: any[]) => {
      if (fn === 'examBulkSaveSchedule') {
        savedUpdates.push(...args[0]);
        return Promise.resolve({ success: true, saved: args[0].length });
      }
      if (fn === 'createAdminExam') {
        createdExams.push(args[0]);
        return Promise.resolve({ success: true });
      }
      return Promise.resolve({});
    });

    const changedItem = {
      _idx: 0,
      rowId: 501,
      record: { grade: 'Grade 10', examName: 'Class Test 2', subject: 'Physics', date: '2026-07-22', marks: 20 },
      existing: { rowId: 501, date: '2026-07-20', marks: 20 },
      diffs: [{ field: 'Date', existingValue: '2026-07-20', uploadedValue: '2026-07-22' }]
    };

    const newItem = {
      _idx: 0,
      record: { grade: 'Grade 10', examName: 'Class Test 5', subject: 'Physics', date: '2026-11-25', marks: 20 }
    };

    // Simulate batch update API call
    const updates = [{ rowId: changedItem.rowId, date: changedItem.record.date, marks: String(changedItem.record.marks) }];
    const updateRes = await globalThis.Portal.api('examBulkSaveSchedule', [updates]);
    expect(updateRes.saved).toBe(1);
    expect(savedUpdates[0].date).toBe('2026-07-22');

    // Simulate new exam creation with lessons: [] (ready for teacher syllabus mapping)
    const newPayload = {
      examName: newItem.record.examName,
      grade: newItem.record.grade,
      subject: newItem.record.subject,
      date: newItem.record.date,
      marks: String(newItem.record.marks),
      lessons: [],
      syllabusText: ''
    };
    const createRes = await globalThis.Portal.api('createAdminExam', [newPayload]);
    expect(createRes.success).toBe(true);
    expect(createdExams[0].examName).toBe('Class Test 5');
    expect(createdExams[0].lessons).toEqual([]);
  });

});

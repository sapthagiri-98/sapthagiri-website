import { describe, it, expect } from 'vitest';
import '../exam-calc.js';

const ExamCalc = (globalThis as any).ExamCalc;

describe('ExamCalc - Telangana Marks Structure & Totals', () => {

  // ==========================================
  // PART 1.1: GRADES 6 & 7 (FA & SA)
  // ==========================================
  describe('Grades 6 & 7', () => {
    it('calculates Formative Assessment (FA) out of 300 across 6 subjects', () => {
      const student = {
        name: 'Manusri',
        roll: '1',
        subjects: [
          { subject: 'Telugu', total: 40, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } }, ct1: 15, ct2: 15, ctAvg: 15, unit: 20, ha: 5 },
          { subject: 'Hindi', total: 45, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } }, ct1: 18, ct2: 18, ctAvg: 18, unit: 22, ha: 5 },
          { subject: 'English', total: 38, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } }, ct1: 14, ct2: 14, ctAvg: 14, unit: 19, ha: 5 },
          { subject: 'Maths', total: 42, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } }, ct1: 16, ct2: 16, ctAvg: 16, unit: 21, ha: 5 },
          { subject: 'Science', total: 40, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } }, ct1: 15, ct2: 15, ctAvg: 15, unit: 20, ha: 5 },
          { subject: 'Social', total: 35, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } }, ct1: 12, ct2: 14, ctAvg: 13, unit: 17, ha: 5 }
        ]
      };

      const result = ExamCalc.calculateStudent(student, 'FA-1', '6');

      expect(result.isComplete).toBe(true);
      expect(result.totalMax).toBe(300);
      // 40 + 45 + 38 + 42 + 40 + 35 = 240
      expect(result.totalScored).toBe(240);
      expect(result.percent).toBe(80);
      expect(result.status).toBe('PASSED');
      expect(result.isSplitScience).toBe(false);
      expect(result.subjects.Science.max).toBe(50);
      expect(result.subjects.Science.scored).toBe(40);
    });

    it('calculates Summative Assessment (SA) out of 600 across 6 subjects', () => {
      const student = {
        name: 'Manusri',
        roll: '1',
        subjects: [
          { subject: 'Telugu', exam: 68, int: 18, cells: { EX: { has: true }, IN: { has: true } } },
          { subject: 'Hindi', exam: 72, int: 19, cells: { EX: { has: true }, IN: { has: true } } },
          { subject: 'English', exam: 65, int: 17, cells: { EX: { has: true }, IN: { has: true } } },
          { subject: 'Maths', exam: 75, int: 20, cells: { EX: { has: true }, IN: { has: true } } },
          { subject: 'Science', exam: 70, int: 18, cells: { EX: { has: true }, IN: { has: true } } },
          { subject: 'Social', exam: 60, int: 16, cells: { EX: { has: true }, IN: { has: true } } }
        ]
      };

      const result = ExamCalc.calculateStudent(student, 'SA-1', '7');

      expect(result.isComplete).toBe(true);
      expect(result.totalMax).toBe(600);
      // (68+18) + (72+19) + (65+17) + (75+20) + (70+18) + (60+16) = 86 + 91 + 82 + 95 + 88 + 76 = 518
      expect(result.totalScored).toBe(518);
      expect(result.percent).toBeCloseTo(86.33, 2);
      expect(result.status).toBe('PASSED');
    });
  });

  // ==========================================
  // PART 1.2 & 1.3: GRADES 8, 9 & 10 (SCIENCE SPLIT)
  // ==========================================
  describe('Grades 8, 9 & 10 (Physics & Biology Component Modeling)', () => {
    it('Formative: scales Physics & Biology to 25 each, combining to 50 for Science (Grand Total 300)', () => {
      const student = {
        name: 'Thanusri',
        roll: '1',
        subjects: [
          { subject: 'Telugu', total: 40, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } }, ct1: 15, ct2: 15, ctAvg: 15, unit: 20, ha: 5 },
          { subject: 'Hindi', total: 30, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } }, ct1: 10, ct2: 10, ctAvg: 10, unit: 15, ha: 5 },
          { subject: 'English', total: 42, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } }, ct1: 16, ct2: 16, ctAvg: 16, unit: 21, ha: 5 },
          { subject: 'Maths', total: 48, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } }, ct1: 19, ct2: 19, ctAvg: 19, unit: 24, ha: 5 },
          // Physics entered out of 50: raw 40 -> scaled to 25 = 20
          { subject: 'Physics', total: 40, max: 50, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } }, ct1: 16, ct2: 16, ctAvg: 16, unit: 20, ha: 4 },
          // Biology entered out of 50: raw 30 -> scaled to 25 = 15
          { subject: 'Biology', total: 30, max: 50, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } }, ct1: 10, ct2: 10, ctAvg: 10, unit: 16, ha: 4 },
          { subject: 'Social', total: 38, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } }, ct1: 14, ct2: 14, ctAvg: 14, unit: 19, ha: 5 }
        ]
      };

      const result = ExamCalc.calculateStudent(student, 'FA-1', '8');

      expect(result.isComplete).toBe(true);
      expect(result.isSplitScience).toBe(true);
      expect(result.totalMax).toBe(300);

      // Verify Physics & Biology sub-components
      const sci = result.subjects.Science;
      expect(sci.physics.max).toBe(25);
      expect(sci.physics.scored).toBe(20);
      expect(sci.biology.max).toBe(25);
      expect(sci.biology.scored).toBe(15);

      // Combined Science: 20 + 15 = 35 / 50
      expect(sci.max).toBe(50);
      expect(sci.scored).toBe(35);

      // Grand Total: 40 + 30 + 42 + 48 + 35 (Science) + 38 = 233 / 300
      expect(result.totalScored).toBe(233);
      expect(result.percent).toBeCloseTo((233 / 300) * 100, 2);
      expect(result.status).toBe('PASSED');
    });

    it('Summative: combines Physics (50) + Biology (50) to Science (100) (Grand Total 600)', () => {
      const student = {
        name: 'Thanusri',
        roll: '1',
        subjects: [
          { subject: 'Telugu', exam: 70, int: 18, cells: { EX: { has: true }, IN: { has: true } } }, // 88
          { subject: 'Hindi', exam: 60, int: 15, cells: { EX: { has: true }, IN: { has: true } } },  // 75
          { subject: 'English', exam: 65, int: 17, cells: { EX: { has: true }, IN: { has: true } } },// 82
          { subject: 'Maths', exam: 72, int: 19, cells: { EX: { has: true }, IN: { has: true } } },  // 91
          // Physics entered directly out of 50: Exam 35 (max 40), Int 8 (max 10) -> total 43
          { subject: 'Physics', exam: 35, int: 8, max: 50, cells: { EX: { has: true }, IN: { has: true } } },
          // Biology entered directly out of 50: Exam 30 (max 40), Int 7 (max 10) -> total 37
          { subject: 'Biology', exam: 30, int: 7, max: 50, cells: { EX: { has: true }, IN: { has: true } } },
          { subject: 'Social', exam: 58, int: 16, cells: { EX: { has: true }, IN: { has: true } } }  // 74
        ]
      };

      const result = ExamCalc.calculateStudent(student, 'SA-1', '10');

      expect(result.isComplete).toBe(true);
      expect(result.totalMax).toBe(600);

      const sci = result.subjects.Science;
      expect(sci.physics.max).toBe(50);
      expect(sci.physics.scored).toBe(43);
      expect(sci.biology.max).toBe(50);
      expect(sci.biology.scored).toBe(37);

      // Combined Science: 43 + 37 = 80 / 100
      expect(sci.max).toBe(100);
      expect(sci.scored).toBe(80);

      // Grand Total: 88 + 75 + 82 + 91 + 80 (Science) + 74 = 490 / 600
      expect(result.totalScored).toBe(490);
      expect(result.percent).toBeCloseTo((490 / 600) * 100, 2);
      expect(result.status).toBe('PASSED');
    });
  });

  // ==========================================
  // PART 4: HANDLING OF MISSING MARKS VS ZERO
  // ==========================================
  describe('Handling of Missing Marks vs Genuine Zero', () => {
    it('treats missing subject as INCOMPLETE, NOT zero; does not calculate misleading totals or percent', () => {
      const student = {
        name: 'Thanusri',
        roll: '1',
        subjects: [
          { subject: 'Telugu', total: 31, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } } },
          { subject: 'Hindi', total: 20, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } } },
          // English is completely unentered
          { subject: 'English', total: 0, cells: { CT1: { has: false }, CT2: { has: false }, UT: { has: false }, HA: { has: false } } },
          { subject: 'Maths', total: 24.5, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } } },
          { subject: 'Physics', total: 22, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } } },
          { subject: 'Biology', total: 20, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } } },
          { subject: 'Social', total: 26.5, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } } }
        ]
      };

      const result = ExamCalc.calculateStudent(student, 'FA-1', '8');

      expect(result.isComplete).toBe(false);
      expect(result.missingSubjects).toContain('English');
      expect(result.totalScored).toBeNull();
      expect(result.percent).toBeNull();
      expect(result.status).toBe('INCOMPLETE');
      expect(result.resultText).toContain('Marks pending in: English');
    });

    it('if only Physics is entered and Biology is missing, Science is flagged as incomplete', () => {
      const student = {
        name: 'Student',
        roll: '2',
        subjects: [
          { subject: 'Telugu', total: 35, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } } },
          { subject: 'Hindi', total: 35, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } } },
          { subject: 'English', total: 35, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } } },
          { subject: 'Maths', total: 35, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } } },
          { subject: 'Physics', total: 30, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } } },
          // Biology not entered
          { subject: 'Biology', total: 0, cells: { CT1: { has: false }, CT2: { has: false }, UT: { has: false }, HA: { has: false } } },
          { subject: 'Social', total: 35, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } } }
        ]
      };

      const result = ExamCalc.calculateStudent(student, 'FA-1', '8');

      expect(result.isComplete).toBe(false);
      expect(result.missingSubjects).toContain('Biology');
      expect(result.subjects.Science.isComplete).toBe(false);
      expect(result.totalScored).toBeNull();
    });

    it('treats genuine zero (entered = true, has = true, value = 0) as 0, NOT as missing', () => {
      const student = {
        name: 'Student',
        roll: '3',
        subjects: [
          { subject: 'Telugu', total: 30, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } } },
          // Hindi was genuinely entered with zero score across all components
          { subject: 'Hindi', total: 0, cells: { CT1: { has: true, value: 0 }, CT2: { has: true, value: 0 }, UT: { has: true, value: 0 }, HA: { has: true, value: 0 } }, ct1: 0, ct2: 0, ctAvg: 0, unit: 0, ha: 0 },
          { subject: 'English', total: 30, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } } },
          { subject: 'Maths', total: 30, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } } },
          { subject: 'Science', total: 30, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } } },
          { subject: 'Social', total: 30, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } } }
        ]
      };

      const result = ExamCalc.calculateStudent(student, 'FA-1', '6');

      expect(result.isComplete).toBe(true);
      expect(result.missingSubjects).toEqual([]);
      expect(result.subjects.Hindi.scored).toBe(0);
      expect(result.totalScored).toBe(150); // 30*5 + 0 = 150
      expect(result.status).toBe('NOT PASSED'); // Failed Hindi
      expect(result.failedSubjects).toContain('Hindi');
    });

    it('SA exam with only Internal marks entered is flagged as incomplete (Summative Exam pending)', () => {
      const student = {
        name: 'Student',
        roll: '4',
        subjects: [
          // Exam paper not entered yet
          { subject: 'Telugu', exam: 0, int: 16, cells: { EX: { has: false }, IN: { has: true } } },
          { subject: 'Hindi', exam: 0, int: 15, cells: { EX: { has: false }, IN: { has: true } } },
          { subject: 'English', exam: 0, int: 14, cells: { EX: { has: false }, IN: { has: true } } },
          { subject: 'Maths', exam: 0, int: 18, cells: { EX: { has: false }, IN: { has: true } } },
          { subject: 'Science', exam: 0, int: 17, cells: { EX: { has: false }, IN: { has: true } } },
          { subject: 'Social', exam: 0, int: 15, cells: { EX: { has: false }, IN: { has: true } } }
        ]
      };

      const result = ExamCalc.calculateStudent(student, 'SA-1', '6');

      expect(result.isComplete).toBe(false);
      expect(result.status).toBe('INCOMPLETE');
      expect(result.totalScored).toBeNull();
    });
  });

  // ==========================================
  // PART 1.4: TELANGANA PASS/FAIL RULES
  // ==========================================
  describe('Telangana Pass Criteria', () => {
    it('Grade 10: 20% pass mark for Second Language Hindi (e.g. 20/100 passes), 35% for other subjects', () => {
      const student = {
        name: 'SSC Student',
        roll: '10',
        subjects: [
          { subject: 'Telugu', exam: 30, int: 10, cells: { EX: { has: true }, IN: { has: true } } }, // 40 (>=35: pass)
          { subject: 'Hindi', exam: 15, int: 7, cells: { EX: { has: true }, IN: { has: true } } },    // 22 (>=20: pass for Grade 10 Hindi!)
          { subject: 'English', exam: 32, int: 10, cells: { EX: { has: true }, IN: { has: true } } },// 42 (>=35: pass)
          { subject: 'Maths', exam: 30, int: 10, cells: { EX: { has: true }, IN: { has: true } } },  // 40 (>=35: pass)
          { subject: 'Physics', exam: 32, int: 8, cells: { EX: { has: true }, IN: { has: true } } }, // 40 -> halved to 20
          { subject: 'Biology', exam: 32, int: 8, cells: { EX: { has: true }, IN: { has: true } } }, // 40 -> halved to 20 -> Science 40 (>=35: pass)
          { subject: 'Social', exam: 30, int: 10, cells: { EX: { has: true }, IN: { has: true } } }  // 40 (>=35: pass)
        ]
      };

      const result = ExamCalc.calculateStudent(student, 'SA-1', '10');

      expect(result.isComplete).toBe(true);
      expect(result.status).toBe('PASSED');
      expect(result.failedSubjects).toEqual([]);
    });

    it('Grade 10: Hindi below 20 fails', () => {
      const student = {
        name: 'SSC Student',
        roll: '10',
        subjects: [
          { subject: 'Telugu', exam: 30, int: 10, cells: { EX: { has: true }, IN: { has: true } } }, // 40
          { subject: 'Hindi', exam: 10, int: 5, cells: { EX: { has: true }, IN: { has: true } } },    // 15 (<20: fail)
          { subject: 'English', exam: 32, int: 10, cells: { EX: { has: true }, IN: { has: true } } },// 42
          { subject: 'Maths', exam: 30, int: 10, cells: { EX: { has: true }, IN: { has: true } } },  // 40
          { subject: 'Physics', exam: 32, int: 8, cells: { EX: { has: true }, IN: { has: true } } },
          { subject: 'Biology', exam: 32, int: 8, cells: { EX: { has: true }, IN: { has: true } } },
          { subject: 'Social', exam: 30, int: 10, cells: { EX: { has: true }, IN: { has: true } } }  // 40
        ]
      };

      const result = ExamCalc.calculateStudent(student, 'SA-1', '10');

      expect(result.isComplete).toBe(true);
      expect(result.status).toBe('NOT PASSED');
      expect(result.failedSubjects).toContain('Hindi');
    });
  });

  // ==========================================
  // PART 6: NO GPA / NO GRADE SYSTEM
  // ==========================================
  describe('Removal of GPA & Grade letters', () => {
    it('result object contains no GPA or letter grade fields', () => {
      const student = {
        name: 'Student',
        roll: '5',
        subjects: [
          { subject: 'Telugu', total: 40, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } } },
          { subject: 'Hindi', total: 40, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } } },
          { subject: 'English', total: 40, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } } },
          { subject: 'Maths', total: 40, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } } },
          { subject: 'Science', total: 40, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } } },
          { subject: 'Social', total: 40, cells: { CT1: { has: true }, CT2: { has: true }, UT: { has: true }, HA: { has: true } } }
        ]
      };

      const result = ExamCalc.calculateStudent(student, 'FA-1', '6');

      expect(result).not.toHaveProperty('gpa');
      expect(result).not.toHaveProperty('grade');
      expect(result).not.toHaveProperty('gpaSummary');
    });
  });

  // ==========================================
  // REAL-WORLD DATA TEST WITH ACTUAL LIVE API PAYLOAD
  // ==========================================
  describe('Live API Payload Integration', () => {
    it('accurately identifies incomplete status and missing subjects from actual Class 8 FA-1 response', () => {
      const c8fa = require('C:/Users/vipul/.gemini/antigravity/brain/632e4793-8417-476a-a0df-b650b4eb5846/scratch/sample_c8_fa1.json');
      const student0 = c8fa.students[0];

      const result = ExamCalc.calculateStudent(student0, 'FA-1', '8');

      // In student0: English is completely missing; Hindi and Biology lack UT and HA
      expect(result.isComplete).toBe(false);
      expect(result.missingSubjects).toContain('English');
      expect(result.missingSubjects).toContain('Hindi');
      expect(result.missingSubjects).toContain('Biology');
      expect(result.totalScored).toBeNull();
      expect(result.percent).toBeNull();
      expect(result.status).toBe('INCOMPLETE');
    });

    it('accurately parses direct object formatted subjects as returned by live progressGetClassData', () => {
      const studentDirect = {
        name: 'Thanusri Vollala',
        roll: '1',
        subjects: {
          Telugu: { CT1: { has: true, value: 16 }, CT2: { has: true, value: 18 }, HA: { has: true, value: 5 }, UT: { has: true, value: 21 }, Tot: { has: true, value: 43 } },
          Hindi: { CT1: { has: true, value: 15 }, CT2: { has: true, value: 15 }, HA: { has: true, value: 5 }, UT: { has: true, value: 20 }, Tot: { has: true, value: 40 } },
          English: { CT1: { has: true, value: 17 }, CT2: { has: true, value: 19 }, HA: { has: true, value: 5 }, UT: { has: true, value: 22 }, Tot: { has: true, value: 45 } },
          Maths: { CT1: { has: true, value: 19 }, CT2: { has: true, value: 19 }, HA: { has: true, value: 5 }, UT: { has: true, value: 23 }, Tot: { has: true, value: 47 } },
          Physics: { CT1: { has: true, value: 18 }, CT2: { has: true, value: 18 }, HA: { has: true, value: 5 }, UT: { has: true, value: 21 }, Tot: { has: true, value: 44 } },
          Biology: { CT1: { has: true, value: 16 }, CT2: { has: true, value: 16 }, HA: { has: true, value: 5 }, UT: { has: true, value: 21 }, Tot: { has: true, value: 42 } },
          Social: { CT1: { has: true, value: 16 }, CT2: { has: true, value: 18 }, HA: { has: true, value: 5 }, UT: { has: true, value: 20 }, Tot: { has: true, value: 42 } }
        }
      };

      const result = ExamCalc.calculateStudent(studentDirect, 'FA-2', '8');

      expect(result.isComplete).toBe(true);
      expect(result.totalMax).toBe(300);
      // Science: (44 * 0.5) + (42 * 0.5) = 22 + 21 = 43
      expect(result.subjects.Science.scored).toBe(43);
      // Grand Total = 43 (Telugu) + 40 (Hindi) + 45 (English) + 47 (Maths) + 43 (Science) + 42 (Social) = 260
      expect(result.totalScored).toBe(260);
      expect(result.percent).toBe(86.67);
      expect(result.status).toBe('PASSED');
    });

    it('handles Physics (40) and Biology (40) direct entries in SA-1 for Grade 8 matching tabulation sheet', () => {
      // Live SA-1 student data from marksheet (Thanusri Vollala) with 40-mark Physics & Biology entry
      const studentSA = {
        name: 'Thanusri Vollala',
        roll: '1',
        subjects: {
          Telugu: { Exam: { has: true, value: 53 }, Int: { has: true, value: 14 }, Tot: { has: true, value: 67 } },
          Hindi: { Exam: { has: true, value: 40 }, Int: { has: true, value: 10.5 }, Tot: { has: true, value: 50.5 } },
          English: { Exam: { has: true, value: 66 }, Int: { has: true, value: 9.5 }, Tot: { has: true, value: 75.5 } },
          Maths: { Exam: { has: true, value: 61 }, Int: { has: true, value: 10 }, Tot: { has: true, value: 71 } },
          // Physics entered directly for 40: Exam 25 (max 40), Int 5.5 (max 10), Tot 30.5 (max 50)
          Physics: { Exam: { has: true, value: 25 }, Int: { has: true, value: 5.5 }, Tot: { has: true, value: 30.5 } },
          // Biology entered directly for 40: Exam 15 (max 40), Int 5.5 (max 10), Tot 20.5 (max 50)
          Biology: { Exam: { has: true, value: 15 }, Int: { has: true, value: 5.5 }, Tot: { has: true, value: 20.5 } },
          Social: { Exam: { has: true, value: 40 }, Int: { has: true, value: 11 }, Tot: { has: true, value: 51 } }
        }
      };

      // 1. Direct Physics report check (Exam 25/40, Int 5.5/10, Tot 30.5/50)
      const phyRep = ExamCalc.calculateSubjectReport(studentSA, 'Physics', 'SA-1', '8');
      expect(phyRep.max).toBe(50);
      expect(phyRep.scored).toBe(30.5);
      expect(phyRep.components.Exam.scored).toBe(25);
      expect(phyRep.components.Exam.max).toBe(40);
      expect(phyRep.components.Int.scored).toBe(5.5);
      expect(phyRep.components.Int.max).toBe(10);
      expect(phyRep.components.Tot.scored).toBe(30.5);
      expect(phyRep.components.Tot.max).toBe(50);

      // 2. Direct Biology report check (Exam 15/40, Int 5.5/10, Tot 20.5/50)
      const bioRep = ExamCalc.calculateSubjectReport(studentSA, 'Biology', 'SA-1', '8');
      expect(bioRep.max).toBe(50);
      expect(bioRep.scored).toBe(20.5);
      expect(bioRep.components.Exam.scored).toBe(15);
      expect(bioRep.components.Exam.max).toBe(40);
      expect(bioRep.components.Int.scored).toBe(5.5);
      expect(bioRep.components.Int.max).toBe(10);
      expect(bioRep.components.Tot.scored).toBe(20.5);
      expect(bioRep.components.Tot.max).toBe(50);

      // 3. Combined Student evaluation: Total Scored = 67 + 50.5 + 75.5 + 71 + 51 + (30.5 + 20.5) = 366 / 600
      const result = ExamCalc.calculateStudent(studentSA, 'SA-1', '8');
      expect(result.isComplete).toBe(true);
      expect(result.totalMax).toBe(600);
      expect(result.totalScored).toBe(366);
      expect(result.percent).toBe(61);
      expect(result.status).toBe('PASSED');
    });

    it('correctly normalizes Grade 10 SA-1 marks when entered out of 80/20 in DB (Sahasra Reddy Panyala)', () => {
      const student10 = {
        name: 'Sahasra Reddy Panyala',
        roll: '1',
        subjects: {
          Telugu: { Exam: { has: true, value: 77 }, Int: { has: true, value: 19.5 }, Tot: { has: true, value: 96.5 } },
          Hindi: { Exam: { has: true, value: 75 }, Int: { has: true, value: 19.5 }, Tot: { has: true, value: 94.5 } },
          English: { Exam: { has: true, value: 78 }, Int: { has: true, value: 19.5 }, Tot: { has: true, value: 97.5 } },
          Maths: { Exam: { has: true, value: 76 }, Int: { has: true, value: 18.5 }, Tot: { has: true, value: 94.5 } },
          // Unmigrated / raw 80-mark entry in DB:
          Physics: { Exam: { has: true, value: 72 }, Int: { has: true, value: 19 }, Tot: { has: true, value: 91 } },
          Biology: { Exam: { has: true, value: 64 }, Int: { has: true, value: 17 }, Tot: { has: true, value: 81 } },
          Social: { Exam: { has: true, value: 75 }, Int: { has: true, value: 19.5 }, Tot: { has: true, value: 94.5 } }
        }
      };

      const result = ExamCalc.calculateStudent(student10, 'SA-1', '10');
      expect(result.isComplete).toBe(true);
      expect(result.totalMax).toBe(600);

      const sci = result.subjects.Science;
      // Physics scaled to 40/10/50: 72*0.5=36, 19*0.5=9.5, total 45.5
      expect(sci.physics.components.Exam.scored).toBe(36);
      expect(sci.physics.components.Exam.max).toBe(40);
      expect(sci.physics.components.Int.scored).toBe(9.5);
      expect(sci.physics.components.Int.max).toBe(10);
      expect(sci.physics.scored).toBe(45.5);
      expect(sci.physics.max).toBe(50);

      // Biology scaled to 40/10/50: 64*0.5=32, 17*0.5=8.5, total 40.5
      expect(sci.biology.components.Exam.scored).toBe(32);
      expect(sci.biology.components.Exam.max).toBe(40);
      expect(sci.biology.components.Int.scored).toBe(8.5);
      expect(sci.biology.components.Int.max).toBe(10);
      expect(sci.biology.scored).toBe(40.5);
      expect(sci.biology.max).toBe(50);

      // Science Combined: 36+32 = 68 (max 80), 9.5+8.5 = 18 (max 20), total 86 (max 100)
      expect(sci.components.Exam.scored).toBe(68);
      expect(sci.components.Exam.max).toBe(80);
      expect(sci.components.Int.scored).toBe(18);
      expect(sci.components.Int.max).toBe(20);
      expect(sci.scored).toBe(86);
      expect(sci.max).toBe(100);

      // Grand Total: 96.5 + 94.5 + 97.5 + 94.5 + 86 + 94.5 = 563.5 / 600
      expect(result.totalScored).toBe(563.5);
      expect(result.percent).toBeCloseTo((563.5 / 600) * 100, 2);
      expect(result.status).toBe('PASSED');
    });

    it('correctly scales a lower-scoring student when saNeedsHalving is passed via options', () => {
      const lowerStudent = {
        name: 'Pranay Narige',
        roll: '10',
        subjects: {
          Telugu: { Exam: { has: true, value: 58 }, Int: { has: true, value: 17.5 }, Tot: { has: true, value: 75.5 } },
          Hindi: { Exam: { has: false, absent: true, value: 'Ab' }, Int: { has: true, value: 17 }, Tot: { has: false } },
          English: { Exam: { has: true, value: 79 }, Int: { has: true, value: 14 }, Tot: { has: true, value: 93 } },
          Maths: { Exam: { has: true, value: 75 }, Int: { has: true, value: 19 }, Tot: { has: true, value: 94 } },
          // Physics entered out of 80/20, but scored <= 40/10 (e.g. 30 Exam, 8 Int)
          Physics: { Exam: { has: true, value: 30 }, Int: { has: true, value: 8 }, Tot: { has: true, value: 38 } },
          Biology: { Exam: { has: true, value: 24 }, Int: { has: true, value: 6 }, Tot: { has: true, value: 30 } },
          Social: { Exam: { has: true, value: 50 }, Int: { has: true, value: 8.5 }, Tot: { has: true, value: 58.5 } }
        }
      };

      const result = ExamCalc.calculateStudent(lowerStudent, 'SA-1', '10', { saNeedsHalving: true });
      const sci = result.subjects.Science;
      // Physics: 30*0.5 = 15/40, 8*0.5 = 4/10, total = 19/50
      expect(sci.physics.components.Exam.scored).toBe(15);
      expect(sci.physics.components.Exam.max).toBe(40);
      expect(sci.physics.components.Int.scored).toBe(4);
      expect(sci.physics.components.Int.max).toBe(10);
      expect(sci.physics.scored).toBe(19);

      // Biology: 24*0.5 = 12/40, 6*0.5 = 3/10, total = 15/50
      expect(sci.biology.components.Exam.scored).toBe(12);
      expect(sci.biology.components.Int.scored).toBe(3);
      expect(sci.biology.scored).toBe(15);

      // Combined Science: 15+12 = 27 (max 80), 4+3 = 7 (max 20), total = 34 (max 100)
      expect(sci.components.Exam.scored).toBe(27);
      expect(sci.components.Int.scored).toBe(7);
      expect(sci.scored).toBe(34);
    });

    it('automatically halves student with raw marks out of 80 even when no options are passed', () => {
      // Direct raw data matching Sahasra Reddy (Image 3)
      const sahasra = {
        name: 'Sahasra Reddy Panyala',
        roll: '1',
        subjects: {
          Telugu: { Exam: { has: true, value: 77 }, Int: { has: true, value: 19.5 }, Tot: { has: true, value: 96.5 } },
          Hindi: { Exam: { has: true, value: 75 }, Int: { has: true, value: 19.5 }, Tot: { has: true, value: 94.5 } },
          English: { Exam: { has: true, value: 78 }, Int: { has: true, value: 19.5 }, Tot: { has: true, value: 97.5 } },
          Maths: { Exam: { has: true, value: 76 }, Int: { has: true, value: 18.5 }, Tot: { has: true, value: 94.5 } },
          Physics: { Exam: { has: true, value: 72 }, Int: { has: true, value: 19 }, Tot: { has: true, value: 91 } },
          Biology: { Exam: { has: true, value: 64 }, Int: { has: true, value: 17 }, Tot: { has: true, value: 81 } },
          Social: { Exam: { has: true, value: 75 }, Int: { has: true, value: 19.5 }, Tot: { has: true, value: 94.5 } }
        }
      };

      // Call WITHOUT options
      const result = ExamCalc.calculateStudent(sahasra, 'SA-1', '10');
      const sci = result.subjects.Science;

      // Physics: 72 -> 36/40, 19 -> 9.5/10, Total 45.5/50
      expect(sci.physics.components.Exam.scored).toBe(36);
      expect(sci.physics.components.Exam.max).toBe(40);
      expect(sci.physics.components.Int.scored).toBe(9.5);
      expect(sci.physics.components.Int.max).toBe(10);
      expect(sci.physics.scored).toBe(45.5);
      expect(sci.physics.max).toBe(50);

      // Biology: 64 -> 32/40, 17 -> 8.5/10, Total 40.5/50
      expect(sci.biology.components.Exam.scored).toBe(32);
      expect(sci.biology.components.Exam.max).toBe(40);
      expect(sci.biology.components.Int.scored).toBe(8.5);
      expect(sci.biology.components.Int.max).toBe(10);
      expect(sci.biology.scored).toBe(40.5);
      expect(sci.biology.max).toBe(50);

      // Science Combined: 36 + 32 = 68/80, 9.5 + 8.5 = 18/20, Total 86/100
      expect(sci.components.Exam.scored).toBe(68);
      expect(sci.components.Exam.max).toBe(80);
      expect(sci.components.Int.scored).toBe(18);
      expect(sci.components.Int.max).toBe(20);
      expect(sci.scored).toBe(86);
      expect(sci.max).toBe(100);

      // Total Scored: 96.5 + 94.5 + 97.5 + 94.5 + 86 + 94.5 = 563.5 / 600
      expect(result.totalScored).toBe(563.5);
      expect(result.totalMax).toBe(600);
      expect(result.status).toBe('PASSED');
    });
  });

});

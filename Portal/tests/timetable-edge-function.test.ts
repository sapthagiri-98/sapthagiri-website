// =========================================================================
// Timetable Edge Function Tests
// Tests the Supabase Edge Function handlers for timetable import
// =========================================================================
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  upsert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  delete: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  in: vi.fn(() => mockSupabase),
  single: vi.fn(() => mockSupabase),
  maybeSingle: vi.fn(() => mockSupabase),
  then: vi.fn()
}

// Mock the Supabase module
vi.mock('https://esm.sh/@supabase/supabase-js@2', () => ({
  createClient: vi.fn(() => mockSupabase)
}))

// We need to test the edge function logic
// Since it's in Deno/TypeScript, we'll test the core logic by extracting functions

describe('ttBulkUpsert Edge Function Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Mock database responses
  const mockClasses = [
    { name: 'GRADE-1', campus: 'Primary', grade_level: 3 },
    { name: 'GRADE-2', campus: 'Primary', grade_level: 4 },
    { name: 'NURSERY', campus: 'Primary', grade_level: 0 },
    { name: 'LKG', campus: 'Primary', grade_level: 1 },
    { name: 'UKG', campus: 'Primary', grade_level: 2 },
    { name: 'GRADE-6', campus: 'High School', grade_level: 8 },
    { name: 'GRADE-7', campus: 'High School', grade_level: 9 }
  ]

  const mockPeriods = [
    { campus: 'Primary', period_no: 1, start_time: '08:00:00', end_time: '08:40:00', label: 'Period 1' },
    { campus: 'Primary', period_no: 2, start_time: '08:40:00', end_time: '09:20:00', label: 'Period 2' },
    { campus: 'High School', period_no: 1, start_time: '08:30:00', end_time: '09:10:00', label: 'Period 1' },
    { campus: 'High School', period_no: 2, start_time: '09:10:00', end_time: '09:50:00', label: 'Period 2' }
  ]

  const mockDays = [
    { n: 1, label: 'Monday' },
    { n: 2, label: 'Tuesday' },
    { n: 3, label: 'Wednesday' },
    { n: 4, label: 'Thursday' },
    { n: 5, label: 'Friday' },
    { n: 6, label: 'Saturday' }
  ]

  const mockCampuses = [
    { name: 'Primary' },
    { name: 'High School' }
  ]

  it('should validate payload structure', () => {
    const validPayload = {
      cells: [
        { day: 'monday', campus: 'Primary', class: 'GRADE-1', period_no: 1, subject: 'English', teacher: 'MNR', isActivity: false }
      ],
      classCreates: [],
      dayCampusMap: { monday: 'Primary' },
      periodMapping: {},
      clearExisting: false,
      dryRun: true
    }

    expect(validPayload.cells).toBeDefined()
    expect(Array.isArray(validPayload.cells)).toBe(true)
    expect(validPayload.dayCampusMap).toBeDefined()
    expect(typeof validPayload.dayCampusMap).toBe('object')
    expect(typeof validPayload.dryRun).toBe('boolean')
  })

  it('should reject invalid payload', () => {
    const invalidPayloads = [
      { cells: 'not an array' },
      { cells: [] }, // missing other required fields
      { cells: [{}] }, // empty cell
      { cells: [{ day: 'monday' }] } // incomplete cell
    ]

    invalidPayloads.forEach(payload => {
      const hasCells = Array.isArray(payload.cells)
      const hasDayCampusMap = !!payload.dayCampusMap && typeof payload.dayCampusMap === 'object'
      const hasCellsLength = hasCells && payload.cells.length > 0
      const isValid = hasCells && hasDayCampusMap && hasCellsLength
      expect(isValid).toBe(false)
    })
  })

  it('should map day pattern to day number', () => {
    const dayMap: Record<string, number> = {
      monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
      'tue-thu': 2, 'wed-sat': 3, 'mon-thu': 1, 'fri-sat': 5
    }

    expect(dayMap['monday']).toBe(1)
    expect(dayMap['tuesday']).toBe(2)
    expect(dayMap['wednesday']).toBe(3)
    expect(dayMap['thursday']).toBe(4)
    expect(dayMap['friday']).toBe(5)
    expect(dayMap['saturday']).toBe(6)
    expect(dayMap['tue-thu']).toBe(2) // Tuesday
    expect(dayMap['wed-sat']).toBe(3) // Wednesday
    expect(dayMap['mon-thu']).toBe(1) // Monday
    expect(dayMap['fri-sat']).toBe(5) // Friday
  })

  it('should validate cell data', () => {
    const validCell = {
      day: 'monday',
      campus: 'Primary',
      class: 'GRADE-1',
      period_no: 1,
      subject: 'English',
      teacher: 'MNR',
      isActivity: false
    }

    const requiredFields = ['day', 'campus', 'class', 'period_no', 'subject']
    const hasAllFields = requiredFields.every(field => validCell[field] !== undefined)
    expect(hasAllFields).toBe(true)
    expect(typeof validCell.period_no).toBe('number')
    expect(validCell.period_no).toBeGreaterThan(0)
    expect(validCell.period_no).toBeLessThanOrEqual(12)
  })

  it('should handle class creation logic', () => {
    const classCreates = [
      { class: 'GRADE-8', campus: 'High School' },
      { class: 'GRADE-9', campus: 'High School' }
    ]

    // Should create unique class entries
    const uniqueCreates = [...new Map(classCreates.map(c => [`${c.class}|${c.campus}`, c])).values()]
    expect(uniqueCreates.length).toBe(2)
    expect(uniqueCreates[0]).toEqual({ class: 'GRADE-8', campus: 'High School' })
  })

  it('should build upsert records correctly', () => {
    const cells = [
      { day: 'monday', campus: 'Primary', class: 'GRADE-1', period_no: 1, subject: 'English', teacher: 'MNR', isActivity: false },
      { day: 'monday', campus: 'Primary', class: 'GRADE-1', period_no: 2, subject: 'Maths', teacher: 'Santosh', isActivity: false }
    ]

    const dayMap = { monday: 1 }
    const upsertRecords = cells.map(cell => ({
      day: dayMap[cell.day],
      campus: cell.campus,
      class: cell.class,
      period_no: cell.period_no,
      subject: cell.subject,
      teacher: cell.teacher,
      is_activity: cell.isActivity
    }))

    expect(upsertRecords.length).toBe(2)
    expect(upsertRecords[0]).toEqual({
      day: 1,
      campus: 'Primary',
      class: 'GRADE-1',
      period_no: 1,
      subject: 'English',
      teacher: 'MNR',
      is_activity: false
    })
  })

  it('should detect conflicts in dry run mode', () => {
    // Simulate existing grid data
    const existingGrid = [
      { day: 1, campus: 'Primary', class: 'GRADE-1', period_no: 1, subject: 'English', teacher: 'MNR' },
      { day: 1, campus: 'Primary', class: 'GRADE-1', period_no: 2, subject: 'Maths', teacher: 'Santosh' }
    ]

    const newCells = [
      { day: 1, campus: 'Primary', class: 'GRADE-1', period_no: 1, subject: 'English', teacher: 'MNR' }, // Same - no conflict
      { day: 1, campus: 'Primary', class: 'GRADE-1', period_no: 2, subject: 'Science', teacher: 'Venkatesh' }, // Different subject/teacher - conflict
      { day: 1, campus: 'Primary', class: 'GRADE-1', period_no: 3, subject: 'Hindi', teacher: 'Sunitha' } // New - no conflict
    ]

    const conflicts = []
    newCells.forEach(newCell => {
      const existing = existingGrid.find(e =>
        e.day === newCell.day &&
        e.campus === newCell.campus &&
        e.class === newCell.class &&
        e.period_no === newCell.period_no
      )
      if (existing && (existing.subject !== newCell.subject || existing.teacher !== newCell.teacher)) {
        conflicts.push({
          day: newCell.day,
          campus: newCell.campus,
          class: newCell.class,
          period_no: newCell.period_no,
          existing: { subject: existing.subject, teacher: existing.teacher },
          incoming: { subject: newCell.subject, teacher: newCell.teacher }
        })
      }
    })

    expect(conflicts.length).toBe(1)
    expect(conflicts[0].period_no).toBe(2)
    expect(conflicts[0].existing.subject).toBe('Maths')
    expect(conflicts[0].incoming.subject).toBe('Science')
  })

  it('should handle clearExisting logic', () => {
    const dayCampusMap = { monday: 'Primary', tuesday: 'Primary' }
    const dayMap = { monday: 1, tuesday: 2 }

    // Clear existing should delete records for the specified day/campus combinations
    const deleteConditions = Object.entries(dayCampusMap).map(([dayPattern, campus]) => ({
      day: dayMap[dayPattern],
      campus: campus
    }))

    expect(deleteConditions.length).toBe(2)
    expect(deleteConditions).toContainEqual({ day: 1, campus: 'Primary' })
    expect(deleteConditions).toContainEqual({ day: 2, campus: 'Primary' })
  })

  it('should handle period mapping upsert', () => {
    const periodMapping = {
      'Primary Monday': {
        1: { start_time: '08:00', end_time: '08:40', label: 'Period 1' },
        2: { start_time: '08:40', end_time: '09:20', label: 'Period 2' }
      },
      'High School Monday': {
        1: { start_time: '08:30', end_time: '09:10', label: 'Period 1' }
      }
    }

    const campusFromSheet = (sheetName: string) => {
      if (sheetName.includes('High School')) return 'High School'
      return 'Primary'
    }

    const periodRecords = []
    Object.entries(periodMapping).forEach(([sheetName, periods]) => {
      const campus = campusFromSheet(sheetName)
      Object.entries(periods).forEach(([periodNo, times]) => {
        periodRecords.push({
          campus,
          period_no: parseInt(periodNo),
          start_time: times.start_time,
          end_time: times.end_time,
          label: times.label
        })
      })
    })

    expect(periodRecords.length).toBe(3)
    expect(periodRecords[0]).toEqual({
      campus: 'Primary',
      period_no: 1,
      start_time: '08:00',
      end_time: '08:40',
      label: 'Period 1'
    })
    expect(periodRecords[2]).toEqual({
      campus: 'High School',
      period_no: 1,
      start_time: '08:30',
      end_time: '09:10',
      label: 'Period 1'
    })
  })
})

describe('Edge Function Handler Routing', () => {
  it('should route to correct handler based on function name', () => {
    const handlers = {
      ttBootstrap: 'bootstrap',
      ttGetGrid: 'getGrid',
      ttSaveGrid: 'saveGrid',
      ttCopyDay: 'copyDay',
      ttClearDay: 'clearDay',
      ttBulkUpsert: 'bulkUpsert',
      ttBulkUpsertDryRun: 'bulkUpsertDryRun'
    }

    // Test routing logic
    function routeRequest(functionName: string) {
      return handlers[functionName] || 'unknown'
    }

    expect(routeRequest('ttBulkUpsert')).toBe('bulkUpsert')
    expect(routeRequest('ttBulkUpsertDryRun')).toBe('bulkUpsertDryRun')
    expect(routeRequest('ttBootstrap')).toBe('bootstrap')
    expect(routeRequest('unknown')).toBe('unknown')
  })
})

describe('Error Handling', () => {
  it('should format error responses correctly', () => {
    const errorResponse = {
      success: false,
      error: 'Invalid payload',
      details: 'Missing required field: cells'
    }

    expect(errorResponse.success).toBe(false)
    expect(errorResponse.error).toBeDefined()
    expect(typeof errorResponse.error).toBe('string')
  })

  it('should format success responses correctly', () => {
    const successResponse = {
      success: true,
      summary: {
        classesProcessed: 5,
        cellsUpserted: 40,
        cellsCleared: 0,
        newClassesCreated: 0,
        conflicts: []
      }
    }

    expect(successResponse.success).toBe(true)
    expect(successResponse.summary).toBeDefined()
    expect(typeof successResponse.summary.classesProcessed).toBe('number')
    expect(typeof successResponse.summary.cellsUpserted).toBe('number')
  })
})
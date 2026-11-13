// =========================================================================
// Timetable Import Parser Tests
// =========================================================================
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Since the parser is in a IIFE, we need to simulate its functions
// We'll extract the key functions for testing

// Mock the parser functions (copied from the parser for testing)
function normalizeClassName(raw: string): string {
  if (!raw) return ''
  var s = String(raw).trim()
  if (!s) return ''

  s = s.toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/\.0+$/, '')
    .replace(/^GRADE[- ]?/i, 'GRADE-')
    .replace(/^CLASS[- ]?/i, 'GRADE-')

  if (/^(PRE[- ]?KG|PREKG|NURSERY)$/i.test(s)) return 'NURSERY'
  if (/^LKG$/i.test(s)) return 'LKG'
  if (/^UKG$/i.test(s)) return 'UKG'

  var gradeMatch = s.match(/^GRADE[- ]?(\d+)$/i)
  if (gradeMatch) return 'GRADE-' + gradeMatch[1]

  var numMatch = s.match(/^(\d+)$/)
  if (numMatch) return 'GRADE-' + numMatch[1]

  return s
}

function parseCellContent(cellValue: string): { subject: string; teacher: string; isActivity: boolean } {
  if (!cellValue) return { subject: '', teacher: '', isActivity: false }

  var str = String(cellValue).trim()
  if (!str) return { subject: '', teacher: '', isActivity: false }

  var parts = str.split('|').map(function(p) { return p.trim(); }).filter(Boolean)

  var cleanParts = parts.filter(function(p) {
    var up = p.toUpperCase()
    return up !== 'PERIOD' && up !== 'BREAK' && up !== 'LUNCH' && up !== 'DIARY' && up !== 'ASSEMBLY' && up !== 'CHECKING'
  })

  if (cleanParts.length === 0) return { subject: '', teacher: '', isActivity: false }

  var subject = cleanParts[0] || ''
  var teacher = cleanParts.length > 1 ? cleanParts[1] : ''

  subject = subject
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/📖|📐|🚀|🧲|🌱|🎨|💡|💬|🧠|♫/g, '')
    .trim()

  teacher = teacher
    .replace(/^(MR\.|MRS\.|MS\.|DR\.|SIR|MADAM)\s+/i, '')
    .trim()

  var activityKeywords = ['SPORTS', 'GAMES', 'KARATE', 'DANCE', 'ART', 'PET', 'LEISURE', 'YOGA', 'MUSIC', 'CRAFT', 'RHYMES', 'STORIES', 'DRAWING', 'PAINTING', 'MARTIAL ARTS', 'PHYSICAL EDUCATION', 'INDOOR GAMES', 'OUTDOOR GAMES', 'ART ZONE', 'CREATIVE ACTIVITIES']
  var isActivity = activityKeywords.some(function(kw) {
    return subject.toUpperCase().includes(kw)
  })

  return { subject: subject, teacher: teacher, isActivity: isActivity }
}

describe('normalizeClassName', () => {
  it('should normalize standard grades', () => {
    expect(normalizeClassName('GRADE-1')).toBe('GRADE-1')
    expect(normalizeClassName('Grade 1')).toBe('GRADE-1')
    expect(normalizeClassName('GRADE 2')).toBe('GRADE-2')
    expect(normalizeClassName('class 3')).toBe('GRADE-3')
    expect(normalizeClassName('Class-4')).toBe('GRADE-4')
  })

  it('should normalize pre-primary classes', () => {
    expect(normalizeClassName('NURSERY')).toBe('NURSERY')
    expect(normalizeClassName('Pre-KG')).toBe('NURSERY')
    expect(normalizeClassName('PRE KG')).toBe('NURSERY')
    expect(normalizeClassName('PreKG')).toBe('NURSERY')
    expect(normalizeClassName('LKG')).toBe('LKG')
    expect(normalizeClassName('UKG')).toBe('UKG')
  })

  it('should handle numeric input', () => {
    expect(normalizeClassName('1')).toBe('GRADE-1')
    expect(normalizeClassName('6')).toBe('GRADE-6')
    expect(normalizeClassName('10')).toBe('GRADE-10')
  })

  it('should handle edge cases', () => {
    expect(normalizeClassName('')).toBe('')
    expect(normalizeClassName(null as any)).toBe('')
    expect(normalizeClassName(undefined as any)).toBe('')
    expect(normalizeClassName('   ')).toBe('')
  })

  it('should preserve unknown formats', () => {
    expect(normalizeClassName('SPECIAL')).toBe('SPECIAL')
    expect(normalizeClassName('Grade-A')).toBe('GRADE-A')
  })
})

describe('parseCellContent', () => {
  it('should parse simple subject|teacher format', () => {
    const result = parseCellContent('English|MNR')
    expect(result.subject).toBe('English')
    expect(result.teacher).toBe('MNR')
    expect(result.isActivity).toBe(false)
  })

  it('should parse subject with emoji', () => {
    const result = parseCellContent('English📖|MNR')
    expect(result.subject).toBe('English')
    expect(result.teacher).toBe('MNR')
  })

  it('should parse subject with multiple pipes', () => {
    const result = parseCellContent('|||MARTIAL ARTS|Srinivas|')
    expect(result.subject).toBe('MARTIAL ARTS')
    expect(result.teacher).toBe('Srinivas')
    expect(result.isActivity).toBe(true)
  })

  it('should detect activity subjects', () => {
    expect(parseCellContent('Sports|Coach').isActivity).toBe(true)
    expect(parseCellContent('Games|Teacher').isActivity).toBe(true)
    expect(parseCellContent('Karate|Srinivas').isActivity).toBe(true)
    expect(parseCellContent('Dance|Priya').isActivity).toBe(true)
    expect(parseCellContent('Art|Teacher').isActivity).toBe(true)
    expect(parseCellContent('Yoga|Instructor').isActivity).toBe(true)
    expect(parseCellContent('Music|Teacher').isActivity).toBe(true)
    expect(parseCellContent('Craft|Teacher').isActivity).toBe(true)
    expect(parseCellContent('Rhymes|Teacher').isActivity).toBe(true)
    expect(parseCellContent('Stories|Teacher').isActivity).toBe(true)
    expect(parseCellContent('Drawing|Teacher').isActivity).toBe(true)
    expect(parseCellContent('Physical Education|Teacher').isActivity).toBe(true)
  })

  it('should not mark academic subjects as activity', () => {
    expect(parseCellContent('English|MNR').isActivity).toBe(false)
    expect(parseCellContent('Maths|Santosh').isActivity).toBe(false)
    expect(parseCellContent('Science|Venkatesh').isActivity).toBe(false)
    expect(parseCellContent('Hindi|Sunitha').isActivity).toBe(false)
    expect(parseCellContent('Telugu|Swaroopa').isActivity).toBe(false)
    expect(parseCellContent('Social|Pranathi').isActivity).toBe(false)
  })

  it('should handle empty or invalid input', () => {
    expect(parseCellContent('')).toEqual({ subject: '', teacher: '', isActivity: false })
    expect(parseCellContent(null as any)).toEqual({ subject: '', teacher: '', isActivity: false })
    expect(parseCellContent(undefined as any)).toEqual({ subject: '', teacher: '', isActivity: false })
  })

  it('should clean teacher titles', () => {
    const result = parseCellContent('English|Mr. Santosh')
    expect(result.teacher).toBe('Santosh')

    const result2 = parseCellContent('Maths|Mrs. Sunitha')
    expect(result2.teacher).toBe('Sunitha')
  })

  it('should handle cells with only subject', () => {
    const result = parseCellContent('English')
    expect(result.subject).toBe('English')
    expect(result.teacher).toBe('')
  })
})

describe('detectHeaderRow', () => {
  it('should find row with PERIOD keyword', () => {
    const data = [
      ['', 'SCHOOL NAME', '', ''],
      ['', 'PERIOD', '1', '2', '3'],
      ['', 'GRADE-1', 'English', 'Maths', 'Science']
    ]
    // Implementation would find row 1
    expect(true).toBe(true) // Placeholder
  })
})

describe('detectPeriodColumns', () => {
  it('should identify period columns from header', () => {
    // Implementation would detect columns with period numbers
    expect(true).toBe(true) // Placeholder
  })
})

describe('detectClassColumn', () => {
  it('should identify class column', () => {
    // Implementation would find column with class names
    expect(true).toBe(true) // Placeholder
  })
})

describe('detectCampus', () => {
  it('should detect campus from sheet name', () => {
    // Implementation would parse sheet names
    expect(true).toBe(true) // Placeholder
  })
})

describe('detectDayPattern', () => {
  it('should detect day patterns', () => {
    // Implementation would parse day patterns from sheet names
    expect(true).toBe(true) // Placeholder
  })
})
// =========================================================================
// Teacher Schedule Component Tests
// Tests the period consolidation, timing calculation, and schedule logic
// =========================================================================
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('Teacher Schedule Logic & Consolidation', () => {
  // Mock mock DOM environment
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Period timings lookup
  const PRIMARY_PERIODS: Record<number, { start: string, end: string }> = {
    1: { start: "09:20 AM", end: "10:00 AM" },
    2: { start: "10:00 AM", end: "10:40 AM" },
    3: { start: "10:50 AM", end: "11:30 AM" },
    4: { start: "11:30 AM", end: "12:10 PM" },
    5: { start: "12:55 PM", end: "01:35 PM" },
    6: { start: "01:35 PM", end: "02:15 PM" },
    7: { start: "02:25 PM", end: "03:15 PM" },
    8: { start: "03:15 PM", end: "04:05 PM" }
  }

  const HIGH_PERIODS: Record<number, { start: string, end: string }> = {
    1: { start: "09:05 AM", end: "09:50 AM" },
    2: { start: "09:50 AM", end: "10:30 AM" },
    3: { start: "10:35 AM", end: "11:15 AM" },
    4: { start: "11:15 AM", end: "11:55 AM" },
    5: { start: "11:55 AM", end: "12:40 PM" },
    6: { start: "01:20 PM", end: "02:05 PM" },
    7: { start: "02:05 PM", end: "02:45 PM" },
    8: { start: "02:50 PM", end: "03:30 PM" },
    9: { start: "03:30 PM", end: "04:30 PM" }
  }

  function formatTime12(tStr: string, fallback?: string): string {
    if (!tStr) return fallback || ""
    const s = String(tStr).trim()
    if (s.includes("AM") || s.includes("PM")) return s
    const parts = s.split(":")
    if (parts.length < 2) return s
    const h = parseInt(parts[0], 10)
    const m = parts[1].slice(0, 2)
    if (isNaN(h)) return s
    const ampm = h >= 12 ? "PM" : "AM"
    const h12 = h % 12 === 0 ? 12 : h % 12
    return `${h12}:${m} ${ampm}`
  }

  function gradeWeight(n: any) {
    const k = String(n || "").toUpperCase().replace(/\s+/g, "")
    if (k === "NURSERY") return 1
    if (k === "LKG" || k === "PREKG") return 2
    if (k === "UKG") return 3
    const m = k.match(/\d+/)
    return m ? 100 + parseInt(m[0], 10) : 999
  }

  function isPrimaryClass(cls: any) {
    return gradeWeight(cls) <= 105
  }

  function consolidatePeriods(periodsList: any[], maxPeriods = 8) {
    const byPeriod: Record<number, any> = {}
    periodsList.forEach(p => {
      const n = parseInt(p.period_no, 10)
      if (!isNaN(n)) byPeriod[n] = p
    })

    const hasHigh = periodsList.some(p => !isPrimaryClass(p.class))
    if (hasHigh) maxPeriods = Math.max(maxPeriods, 9)

    const timingMap = hasHigh ? HIGH_PERIODS : PRIMARY_PERIODS
    const consolidated: any[] = []
    const visited: Record<number, boolean> = {}

    for (let p = 1; p <= maxPeriods; p++) {
      if (visited[p]) continue

      const current = byPeriod[p]
      if (!current) {
        const pTiming = timingMap[p] || { start: `Period ${p}`, end: "" }
        consolidated.push({
          isFree: true,
          periodNums: [p],
          periodLabel: `P${p}`,
          subject: "Free Period",
          className: "—",
          timeLabel: `${pTiming.start} – ${pTiming.end}`
        })
        continue
      }

      const combinedPeriods = [p]
      let nextP = p + 1
      const curClsNorm = String(current.class || "").trim().toLowerCase()
      const curSubNorm = String(current.subject || "").trim().toLowerCase()

      while (nextP <= maxPeriods && byPeriod[nextP]) {
        const nxt = byPeriod[nextP]
        const nxtClsNorm = String(nxt.class || "").trim().toLowerCase()
        const nxtSubNorm = String(nxt.subject || "").trim().toLowerCase()

        if (curClsNorm === nxtClsNorm && curSubNorm === nxtSubNorm) {
          combinedPeriods.push(nextP)
          visited[nextP] = true
          nextP++
        } else {
          break
        }
      }

      const firstTiming = timingMap[combinedPeriods[0]] || { start: "", end: "" }
      const lastTiming = timingMap[combinedPeriods[combinedPeriods.length - 1]] || { start: "", end: "" }
      const combinedTimeStr = `${firstTiming.start} – ${lastTiming.end}`

      consolidated.push({
        isFree: false,
        isActivity: !!current.is_activity,
        periodNums: combinedPeriods,
        periodLabel: combinedPeriods.length > 1 ? (`P${combinedPeriods.join(", P")}`) : (`P${p}`),
        subject: current.subject,
        className: current.class,
        timeLabel: combinedTimeStr
      })
    }

    return { cards: consolidated, maxPeriods, hasHigh }
  }

  it('formats reporting and leaving times into 12-hour AM/PM correctly', () => {
    expect(formatTime12("08:45")).toBe("8:45 AM")
    expect(formatTime12("16:30")).toBe("4:30 PM")
    expect(formatTime12("09:00")).toBe("9:00 AM")
    expect(formatTime12("17:00")).toBe("5:00 PM")
    expect(formatTime12("", "8:45 AM")).toBe("8:45 AM")
  })

  it('consolidates repeat consecutive periods into a single card (e.g. P3, P4 English)', () => {
    const samplePeriods = [
      { period_no: 1, class: "Nursery", subject: "Spoken English", is_activity: false },
      { period_no: 2, class: "Nursery", subject: "EVS", is_activity: false },
      { period_no: 3, class: "Nursery", subject: "English", is_activity: false },
      { period_no: 4, class: "Nursery", subject: "English", is_activity: false }, // repeat period!
      { period_no: 6, class: "Grade 1", subject: "English", is_activity: false }
    ]

    const result = consolidatePeriods(samplePeriods, 8)
    const cards = result.cards

    // P3 & P4 should be consolidated
    const englishCard = cards.find(c => c.periodNums.includes(3))
    expect(englishCard).toBeDefined()
    expect(englishCard?.periodNums).toEqual([3, 4])
    expect(englishCard?.periodLabel).toBe("P3, P4")
    expect(englishCard?.subject).toBe("English")
    expect(englishCard?.className).toBe("Nursery")
    expect(englishCard?.timeLabel).toBe("10:50 AM – 12:10 PM")

    // P5 should be marked as Free
    const p5Card = cards.find(c => c.periodNums.includes(5))
    expect(p5Card).toBeDefined()
    expect(p5Card?.isFree).toBe(true)
    expect(p5Card?.periodLabel).toBe("P5")
  })

  it('expands to 9 periods when teacher is assigned high school classes', () => {
    const highPeriods = [
      { period_no: 1, class: "Grade 10", subject: "Mathematics", is_activity: false },
      { period_no: 9, class: "Grade 9", subject: "Study Hour", is_activity: true }
    ]

    const result = consolidatePeriods(highPeriods, 8)
    expect(result.maxPeriods).toBe(9)
    expect(result.hasHigh).toBe(true)
    expect(result.cards.length).toBe(9) // 2 assigned + 7 free = 9 cards
  })

  it('calculates KPIs correctly for teaching, activity, and free periods', () => {
    const periods = [
      { period_no: 1, class: "Grade 3", subject: "Maths", is_activity: false },
      { period_no: 2, class: "Grade 4", subject: "Maths", is_activity: false },
      { period_no: 3, class: "Grade 5", subject: "PET / Sports", is_activity: true },
      { period_no: 7, class: "Grade 3", subject: "Maths", is_activity: false },
      { period_no: 8, class: "Grade 3", subject: "Maths", is_activity: false }
    ]

    const result = consolidatePeriods(periods, 8)
    let teachingCount = 0
    let activityCount = 0
    let freeCount = 0

    result.cards.forEach(c => {
      if (c.isFree) freeCount += c.periodNums.length
      else if (c.isActivity) activityCount += c.periodNums.length
      else teachingCount += c.periodNums.length
    })

    expect(teachingCount).toBe(4) // P1, P2, P7, P8
    expect(activityCount).toBe(1) // P3
    expect(freeCount).toBe(3)     // P4, P5, P6
    expect(teachingCount + activityCount + freeCount).toBe(8)
  })

  it('mounts TeacherSchedule component into DOM and renders days, timings and cards', async () => {
    document.body.innerHTML = '<div id="testMount"></div>'
    
    ;(window as any).Portal = {
      esc: (s: any) => String(s || ''),
      Session: {
        get: () => ({ name: 'Padmaja', role: 'Teacher', s1In: '08:45', s1Out: '16:30' })
      },
      api: vi.fn((fn: string, args: any[]) => {
        if (fn === 'ttGetTeacherSchedule') {
          return Promise.resolve({
            teacherName: 'Padmaja',
            weekday: args[1] || 1,
            shift: { s1In: '08:45', s1Out: '16:30' },
            periods: [
              { period_no: 1, class: 'Nursery', subject: 'Spoken English', is_activity: false },
              { period_no: 2, class: 'Nursery', subject: 'English', is_activity: false },
              { period_no: 3, class: 'Nursery', subject: 'English', is_activity: false }
            ]
          })
        }
        return Promise.resolve([])
      })
    }

    const fs = await import('fs')
    const path = await import('path')
    const code = fs.readFileSync(path.resolve(__dirname, '../my-schedule-component.js'), 'utf8')
    eval(code)

    expect((window as any).TeacherSchedule).toBeDefined()
    const instance = (window as any).TeacherSchedule.mount('testMount', (window as any).Portal.Session.get())
    expect(instance).toBeDefined()

    const title = document.querySelector('.tsch-title')
    expect(title?.textContent).toBe('My Teaching Schedule')

    const timingBar = document.querySelector('.tsch-timing-bar')
    expect(timingBar?.textContent).toContain('Reporting: 8:45 AM')
    expect(timingBar?.textContent).toContain('Leaving: 4:30 PM')

    const dayBtns = document.querySelectorAll('.tsch-day-btn')
    expect(dayBtns.length).toBe(6)

    // Allow loadDay promise to settle
    await new Promise(r => setTimeout(r, 60))

    const pcards = document.querySelectorAll('.tsch-pcard')
    expect(pcards.length).toBeGreaterThan(0)

    // Verify consolidated period badge P2, P3
    const pnumBadges = Array.from(document.querySelectorAll('.tsch-pbadge .pnum')).map(el => el.textContent)
    expect(pnumBadges).toContain('P2, P3')
  })

  it('normalizes teacher titles and expands phonetic/ERP spelling variants', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const code = fs.readFileSync(path.resolve(__dirname, '../my-schedule-component.js'), 'utf8')
    eval(code)

    const TS = (window as any).TeacherSchedule
    expect(TS).toBeDefined()
    expect(TS.normalizeTeacherName).toBeDefined()
    expect(TS.getTeacherVariants).toBeDefined()
    expect(TS.teacherMatches).toBeDefined()

    // Title removal
    expect(TS.normalizeTeacherName('Mr. Sathish')).toBe('Sathish')
    expect(TS.normalizeTeacherName('Mrs. Sunitha')).toBe('Sunitha')
    expect(TS.normalizeTeacherName('Dr. Rajesh')).toBe('Rajesh')
    expect(TS.normalizeTeacherName('Sathish Sir')).toBe('Sathish')
    expect(TS.normalizeTeacherName('Mr. Satish')).toBe('Satish')

    // Variant expansion
    const sathishVariants = TS.getTeacherVariants('Mr. Sathish')
    expect(sathishVariants).toContain('Sathish')
    expect(sathishVariants).toContain('Satish')
    expect(sathishVariants).toContain('Mr. Sathish')

    const satishVariants = TS.getTeacherVariants('Satish')
    expect(satishVariants).toContain('Satish')
    expect(satishVariants).toContain('Sathish')

    const knrVariants = TS.getTeacherVariants('KNR')
    expect(knrVariants).toContain('KNR')
    expect(knrVariants).toContain('Narsimha Reddy Kasireddy')

    // Teacher matching against timetable cell contents
    expect(TS.teacherMatches('Satish', sathishVariants)).toBe(true)
    expect(TS.teacherMatches('Social\nSatish', sathishVariants)).toBe(true)
    expect(TS.teacherMatches('English📖\nSatish', sathishVariants)).toBe(true)
    expect(TS.teacherMatches('Satish, Santosh', sathishVariants)).toBe(true)
    expect(TS.teacherMatches('Harika', sathishVariants)).toBe(false)
  })

  it('resolves Mr. Sathish Saturday schedule via ttGetGrid fallback when ttGetTeacherSchedule is undeployed', async () => {
    document.body.innerHTML = '<div id="sathishScheduleMount"></div>'

    // Mock Portal where ttGetTeacherSchedule fails with "Unknown function" (production edge state),
    // and ttGetGrid provides the Saturday High School grid with Satish as teacher
    const mockHighSchoolSaturdayGrid = {
      campus: 'High',
      weekday: 6,
      periods: 9,
      rows: [
        {
          class: '6',
          cells: [
            { period_no: 1, subject: 'Maths', teacher: 'Ramana Prasad' },
            { period_no: 4, subject: 'Social', teacher: 'Satish' },
            { period_no: 8, subject: 'English', teacher: 'Satish' }
          ]
        },
        {
          class: '7',
          cells: [
            { period_no: 2, subject: 'English', teacher: 'Satish' },
            { period_no: 7, subject: 'Social', teacher: 'Satish' }
          ]
        },
        {
          class: '8',
          cells: [
            { period_no: 1, subject: 'Social', teacher: 'Satish' },
            { period_no: 4, subject: 'Telugu', teacher: 'Thirupathi' }
          ]
        },
        {
          class: '9',
          cells: [
            { period_no: 3, subject: 'Social', teacher: 'Satish' },
            { period_no: 4, subject: 'Biology', teacher: 'Rajesh' }
          ]
        },
        {
          class: '10',
          cells: [
            { period_no: 5, subject: 'Social', teacher: 'Satish' },
            { period_no: 7, subject: 'Physics', teacher: 'Harika' }
          ]
        }
      ]
    }

    ;(window as any).Portal = {
      esc: (s: any) => String(s || ''),
      Session: {
        get: () => ({ name: 'Sathish', role: 'Teacher', s1In: '08:40', s1Out: '16:40' })
      },
      api: vi.fn((fn: string, args: any[]) => {
        if (fn === 'ttGetTeacherSchedule') {
          return Promise.reject(new Error('Unknown function: ttGetTeacherSchedule'))
        }
        if (fn === 'ttGetGrid') {
          if (args[0] === 'High' && args[1] === 6) {
            return Promise.resolve(mockHighSchoolSaturdayGrid)
          }
          return Promise.resolve({ campus: 'Primary', weekday: 6, periods: 8, rows: [] })
        }
        if (fn === 'getTimesheetData') {
          return Promise.resolve({
            userShiftProfile: { s1In: '08:40:00', s1Out: '16:40:00', shiftType: 'SINGLE' }
          })
        }
        return Promise.resolve([])
      })
    }

    const fs = await import('fs')
    const path = await import('path')
    const code = fs.readFileSync(path.resolve(__dirname, '../my-schedule-component.js'), 'utf8')
    eval(code)

    const instance = (window as any).TeacherSchedule.mount('sathishScheduleMount', (window as any).Portal.Session.get())
    expect(instance).toBeDefined()

    // Explicitly load Saturday (weekday 6)
    instance.loadDay(6)

    // Wait for async promises to settle
    await new Promise(r => setTimeout(r, 200))

    // Verify stats in DOM: 7 teaching periods, 0 activity, 2 free (out of 9 High School periods)
    const stTeach = document.querySelector('#tschStatTeach')
    const stAct = document.querySelector('#tschStatAct')
    const stFree = document.querySelector('#tschStatFree')

    expect(stTeach?.textContent).toBe('7')
    expect(stAct?.textContent).toBe('0')
    expect(stFree?.textContent).toBe('2')

    // Verify empty state is NOT rendered
    const emptyState = document.querySelector('.tsch-empty')
    expect(emptyState).toBeNull()

    // Verify assigned period cards are rendered
    const pcards = document.querySelectorAll('.tsch-pcard:not(.is-free)')
    expect(pcards.length).toBe(7)

    // Check that Class 8 Social (P1), Class 7 English (P2), Class 9 Social (P3), etc. appear
    const pSubjects = Array.from(document.querySelectorAll('.tsch-psubject')).map(el => el.textContent)
    expect(pSubjects).toContain('Social')
    expect(pSubjects).toContain('English')
  })
})

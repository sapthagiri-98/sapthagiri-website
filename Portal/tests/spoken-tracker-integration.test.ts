// @vitest-environment jsdom
// Management tracker: Spoken English / Spoken Skills shown as normal subject cards, progress from checklist items.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const dir = path.resolve(__dirname, '..')
const read = (f: string) => fs.readFileSync(path.join(dir, f), 'utf8')
const SCRIPTS = ['config.js', 'portal.js', 'spoken-english-core.js', 'spoken-upload.js', 'syllabus.js']
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms))

// ticked[d] = ticked items of day d+1 (10 items each)
const lessons = (ticked: number[], per = 10) => ticked.map((t, i) => ({
  type: 'SpokenEnglish', name: 'Day ' + (i + 1), lessonNo: i + 1, completed: t === per, inProgress: t > 0 && t < per, targetMonth: '', totalTasks: per, completedTasks: t,
}))
const row = (grade: string, subject: string, ticked: number[]) => ({
  grade, subject, teacherName: 'T ' + grade, totalLessonsCount: ticked.length, completedLessonsCount: ticked.filter((t) => t === 10).length,
  inProgressLessonsCount: 0, hasTaskPlan: false, totalTasks: 0, completedTasks: 0, lessonsList: lessons(ticked),
})
const seven = [10, 10, 10, 10, 10, 10, 10, 0, 0, 0]
const REPORT = [
  row('Nursery', 'Spoken English', seven),                       // 70 %
  row('Class 5', 'Spoken English', [10, 5, 0, 0, 0, 0, 0, 0, 0, 0]), // 15 %
  row('Class 6', 'Spoken Skills', Array(10).fill(10)),           // done
  row('Class 7', 'Spoken Skills', Array(10).fill(0)),            // pending 0 %
  row('Class 9', 'Spoken Skills', [10, 10, 10, 10, 10, 10, 10, 10, 10, 9]),
  { grade: 'Class 6', subject: 'Maths', teacherName: 'M', totalLessonsCount: 1, completedLessonsCount: 1, inProgressLessonsCount: 0, hasTaskPlan: false, totalTasks: 0, completedTasks: 0,
    lessonsList: [{ type: 'Manual', name: 'Ch 1', lessonNo: 1, completed: true, inProgress: false, targetMonth: 'June' }] },
]

async function boot(report: any[]) {
  document.documentElement.innerHTML = '<head></head><body><nav id="mobileNav"></nav><nav id="nav"></nav><main><div id="view"></div></main></body>'
  ;(window as any).Portal = undefined
  ;(window as any).fetch = async (_u: string, init: any) => {
    const { fn } = JSON.parse(init.body)
    return { text: async () => JSON.stringify({ ok: true, data: fn === 'getManagementTimelineAuditReport' ? report : [] }) }
  }
  sessionStorage.setItem('pv2_session', JSON.stringify({ name: 'Admin', role: 'Management', token: 't', permissions: {} }))
  const errors: string[] = []
  window.addEventListener('error', (e: any) => errors.push(String(e.message)))
  for (const f of SCRIPTS) { try { (0, eval)(read(f)) } catch (e: any) { errors.push(f + ': ' + e.message) } }
  await tick(150)
  return errors
}
const cards = () => Array.from(document.querySelectorAll('.syl-subcard')).map((c) => (c.textContent || '').replace(/\s+/g, ' '))
const allBtn = () => document.querySelector('#sylFilterSeg button[data-f="all"]') as HTMLElement

describe('Spoken English inside the existing Syllabus Tracker', () => {
  it('has no separate Spoken English completion summary above the tracker', async () => {
    const errors = await boot(REPORT)
    expect(errors).toEqual([])
    expect(document.getElementById('sylSpokenOverview')).toBeNull()
    expect(document.body.textContent).not.toMatch(/completion across all classes/i)
  })
  it('Needs attention lists every incomplete Spoken card (English and Skills) and hides the completed one', async () => {
    await boot(REPORT)
    const c = cards().join('\n')
    expect(c).toMatch(/Spoken English[^\n]*70%/)       // Nursery: days 1-7 done of 10 equal days
    expect(c).toMatch(/Spoken English[^\n]*15%/)       // Class 5: 15/100 items
    expect(c).toMatch(/Spoken Skills[^\n]*Pending · 0%/) // Class 7
    expect(c).toMatch(/Spoken Skills[^\n]*99\/100 items · 99%/) // Class 9
    expect(c.match(/Spoken/g)!.length).toBe(4)          // Class 6 (complete) is not under Needs attention
    expect(c).not.toMatch(/Maths/)
  })
  it('All classes shows all five Spoken cards with the same figures, including the completed one', async () => {
    await boot(REPORT)
    allBtn().click(); await tick()
    const c = cards().join('\n')
    expect(c.match(/Spoken/g)!.length).toBe(5)
    expect(c).toMatch(/Spoken English[^\n]*70\/100 items · 70%/)
    expect(c).toMatch(/Spoken Skills[^\n]*Completed · 100%/)
    expect(c).toMatch(/Maths/)
  })
  it('clicking a Spoken card opens the lesson-by-lesson view with per-day item counts', async () => {
    await boot(REPORT)
    const card = Array.from(document.querySelectorAll('.syl-subcard')).find((x) => /70%/.test(x.textContent || '')) as HTMLElement
    card.click(); await tick()
    const body = document.getElementById('sylDrillBody')!.textContent || ''
    expect((body.match(/10\/10 items/g) || []).length).toBe(7)
    expect((body.match(/(?<!\d)0\/10 items/g) || []).length).toBe(3)
    expect(body).toMatch(/Completed/); expect(body).toMatch(/Pending/)
    expect(document.getElementById('sylDrillMeta')!.textContent).toMatch(/70\/100 items · 70%/)
  })
  it('does not use target months: an old month never changes Spoken status, and a complete Spoken subject is not "behind"', async () => {
    const r = JSON.parse(JSON.stringify(REPORT)); r[2].lessonsList.forEach((l: any) => { l.targetMonth = 'June' })
    await boot(r)
    expect(cards().join('\n').match(/Spoken/g)!.length).toBe(4)
  })
  it('mobile layout: Spoken-only incomplete classes appear under Attention and show item-based percentages', async () => {
    ;(window as any).innerWidth = 500
    const errors = await boot(REPORT)
    expect(errors).toEqual([])
    const txt = (document.getElementById('sylClassView')!.textContent || '').replace(/\s+/g, ' ')
    expect(txt).toMatch(/Spoken incomplete/)
    expect(txt).not.toMatch(/Class 6\s*Spoken incomplete/)   // Class 6 is complete
    ;(document.querySelector('.syl-mob-class-card[data-grade="Nursery"]') as HTMLElement).click(); await tick()
    expect(document.getElementById('sylClassView')!.textContent).toMatch(/70\/100 items · 70%/)
    ;(window as any).innerWidth = 1024
  })
})

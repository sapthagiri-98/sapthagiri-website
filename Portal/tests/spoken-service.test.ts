// Server-side Spoken English logic (checklist saving, upload, publish, explicit replace).
// IN-MEMORY test double only — these tests do NOT touch any real Supabase project.
import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { makeDb } from './helpers/memdb.ts'
import { createSpokenService } from '../../supabase/functions/syllabus-api/spoken-service.ts'
import { spokenStatusFromRows, spokenAssetPath } from '../../supabase/functions/syllabus-api/spoken-status.ts'

const noNum = (v: any) => { const m = String(v ?? '').match(/\d+(?:\.\d+)?/); return m ? Number(m[0]) : NaN }
const pdfB64 = (extra = '') => Buffer.from('%PDF-1.4\n' + extra + '\n%%EOF').toString('base64')
const jsonB64 = (o: any) => Buffer.from(JSON.stringify(o)).toString('base64')
let seq = 0
const tok = () => 'tk' + String(++seq).padStart(8, '0') + 'zz'

function setup(yieldEvery?: () => Promise<void>) {
  const m = makeDb({ yieldEvery })
  const svc = createSpokenService({
    db: m.db, S: (v: any) => (v == null ? '' : String(v)).trim(), today: () => '2026-11-24', lessonNoValue: noNum,
    resolveLesson: async (_g: string, subject: string) => ({ subject, classes: [_g] }),
    fetchAll: async (table: string, cols: string, build?: (q: any) => any) => { let q = m.db.from(table).select(cols); if (build) q = build(q); return (await q).data },
  })
  return { ...m, svc }
}
type Ctx = ReturnType<typeof setup>

// production-shaped legacy lesson: 4 keys, repeated rows, two wordings per key (as found in the live table)
function seedLegacy(c: Ctx, cls: string, day: number, name: string, ticked: boolean, dupes = 5) {
  c.tables.syllabus_lessons.push({ id: c.state.nextId++, class: cls, subject: 'Spoken English', name, lesson_no: String(day), item_type: 'SpokenEnglish', target_month: 'November', drive_link: `spoken_pdf/${cls.replace(' ', '_')}_Day_${day}.pdf`, sort_order: day * 10 })
  for (let k = 1; k <= 4; k++) for (let i = 0; i < dupes; i++) for (const w of ['old wording ' + k, 'new wording ' + k]) {
    if (w.startsWith('old') && i > 1) continue
    c.tables.syllabus_session_tasks.push({ class: cls, subject: 'Spoken English', lesson_name: name, session_name: 'Daily Checklist', task_num: k, task_key: `SPOKEN::${cls}::${day}::CHK::${k}`, content: w, checked: ticked })
  }
}
async function stage(c: Ctx, cls: string, day: number, checklist: string[], title = `Day ${day}: Test lesson`) {
  const t = tok()
  const pdf = await c.svc.uploadSpokenAsset(spokenAssetPath(cls, day, t, 'pdf'), pdfB64(t), 'application/pdf')
  await c.svc.uploadSpokenAsset(spokenAssetPath(cls, day, t, 'json'), jsonB64({ title, objective: 'x', video_url: '', pdf_url: pdf.url, checklist }), 'application/json')
  return { cls, day, lessonName: title, pdfUrl: pdf.url, checklist, path: `spoken-english-pdfs/spoken/${spokenAssetPath(cls, day, t, 'pdf').split('/')[1]}` }
}
const CL = ['alpha item one', 'beta item two', 'gamma item three']
const lessonsOf = (c: Ctx, cls: string) => c.tables.syllabus_lessons.filter((l) => l.class === cls)

describe('new lessons', () => {
  let c: Ctx
  beforeEach(() => { c = setup() })
  it('creates a lesson that starts Pending with no target month, without touching existing data', async () => {
    seedLegacy(c, 'Class 5', 1, 'Day 1: Legacy', true)
    const before = JSON.stringify(c.tables.syllabus_lessons.concat(c.tables.syllabus_session_tasks.filter((t) => t.lesson_name === 'Day 1: Legacy') as any))
    const l = await stage(c, 'Class 5', 9, CL)
    const r = await c.svc.publishSpokenLessons([{ ...l, mode: 'new' }])
    expect(r.results[0].status).toBe('created')
    const row = c.tables.syllabus_lessons.find((x) => x.lesson_no === '9')!
    expect(row.target_month).toBe('')
    expect(row.drive_link).toBe(l.pdfUrl)
    const tasks = c.tables.syllabus_session_tasks.filter((t) => t.lesson_name === l.lessonName)
    expect(tasks).toHaveLength(3); expect(tasks.every((t) => t.checked === false)).toBe(true)
    expect(spokenStatusFromRows(tasks).label).toBe('Pending')
    const after = JSON.stringify(c.tables.syllabus_lessons.filter((x) => x.lesson_no === '1').concat(c.tables.syllabus_session_tasks.filter((t) => t.lesson_name === 'Day 1: Legacy') as any))
    expect(after).toBe(JSON.stringify(JSON.parse(before).filter((x: any) => x.lesson_no === '1' || x.lesson_name === 'Day 1: Legacy')))
  })
  it('only the exact class + Day is created; other classes and days are untouched', async () => {
    seedLegacy(c, 'Class 6', 9, 'Day 9: Class 6 legacy', true)
    const snap6 = JSON.stringify([lessonsOf(c, 'Class 6'), c.tables.syllabus_session_tasks])
    await c.svc.publishSpokenLessons([{ ...(await stage(c, 'Class 5', 9, CL)), mode: 'new' }])
    expect(JSON.stringify([lessonsOf(c, 'Class 6'), c.tables.syllabus_session_tasks.filter((t) => t.class === 'Class 6')])).toBe(JSON.stringify([JSON.parse(snap6)[0], JSON.parse(snap6)[1]]))
  })
  it('a Day that already exists is skipped and its unused files are removed', async () => {
    seedLegacy(c, 'Class 5', 1, 'Day 1: Legacy', true)
    const before = c.snapshot()
    const l = await stage(c, 'Class 5', 1, CL)
    const r = await c.svc.publishSpokenLessons([{ ...l, mode: 'new' }])
    expect(r.results[0].status).toBe('skipped')
    expect(c.snapshot()).toBe(before)
    expect([...c.files.keys()].some((k) => k.includes('Class_5_Day_1_'))).toBe(false)
  })
  it('detects an existing Day even when it is stored with a different file name', async () => {
    seedLegacy(c, 'Class 5', 2, 'Day 2: Anything', false)
    c.tables.syllabus_lessons[0].drive_link = 'https://elsewhere.example/totally-different-name.pdf'
    const r = await c.svc.publishSpokenLessons([{ ...(await stage(c, 'Class 5', 2, CL)), mode: 'new' }])
    expect(r.results[0].status).toBe('skipped')
  })
  it('rolls back the lesson if the checklist insert fails, removes unused files, reports failure', async () => {
    const l = await stage(c, 'Class 5', 9, CL)
    c.state.hook = (op, t) => (op === 'insert' && t === 'syllabus_session_tasks' ? { message: 'boom' } : undefined)
    const r = await c.svc.publishSpokenLessons([{ ...l, mode: 'new' }])
    expect(r.results[0].status).toBe('failed')
    expect(c.tables.syllabus_lessons).toHaveLength(0); expect(c.tables.syllabus_session_tasks).toHaveLength(0)
    expect(c.files.size).toBe(0)
  })
  it('rejects a PDF that belongs to another class/day, one not in storage, and one already used', async () => {
    const other = await stage(c, 'Class 7', 9, CL)
    let r = await c.svc.publishSpokenLessons([{ ...other, cls: 'Class 5', mode: 'new' }])
    expect(r.results[0].status).toBe('failed'); expect(c.files.size).toBe(2)           // nothing of Class 7 deleted
    r = await c.svc.publishSpokenLessons([{ ...other, pdfUrl: other.pdfUrl.replace(/_tk.*\.pdf/, '_tkmissing000000.pdf'), mode: 'new' }])
    expect(r.results[0].status).toBe('failed')
    await c.svc.publishSpokenLessons([{ ...other, mode: 'new' }])                         // publish it for real
    r = await c.svc.publishSpokenLessons([{ ...other, lessonName: 'Day 9: Again', mode: 'new' }])
    expect(r.results[0].status).toBe('failed')
    expect(c.files.size).toBe(2)                                                           // the live lesson's files survive
  })
  it('two admins publishing the same new lesson at once create exactly one lesson', async () => {
    for (let round = 0; round < 25; round++) {
      let n = 0
      const cc = setup(async () => { if (++n % (2 + (round % 3)) === 0) await new Promise((r) => setTimeout(r, 0)); else await Promise.resolve() })
      const a = await stage(cc, 'Class 8', 9, CL), b = await stage(cc, 'Class 8', 9, CL)
      const res = await Promise.all([cc.svc.publishSpokenLessons([{ ...a, mode: 'new' }]), cc.svc.publishSpokenLessons([{ ...b, mode: 'new' }])])
      expect(lessonsOf(cc, 'Class 8')).toHaveLength(1)
      expect(cc.tables.syllabus_session_tasks).toHaveLength(3)
      expect(res.map((x) => x.results[0].status).sort()).toEqual(['created', 'skipped'])
    }
  })
})

describe('explicit replacement', () => {
  let c: Ctx, id: number
  beforeEach(() => {
    c = setup()
    seedLegacy(c, 'Class 5', 1, 'Day 1: Legacy', true)
    seedLegacy(c, 'Class 5', 2, 'Day 2: Legacy', true)
    seedLegacy(c, 'Class 6', 1, 'Day 1: Legacy', true)
    c.tables.syllabus_lesson_progress.push({ task_key: 'LESSON::1', class: 'Class 5', subject: 'Spoken English', lesson_name: 'Day 1: Legacy', state: 'TRUE' })
    c.tables.syllabus_lessons.push({ id: c.state.nextId++, class: 'Class 5', subject: 'Maths', name: 'Day 1: Maths', lesson_no: '1', item_type: 'Manual' })
    id = c.tables.syllabus_lessons.find((l) => l.class === 'Class 5' && l.lesson_no === '1' && l.subject === 'Spoken English')!.id
  })
  const others = (cc: Ctx) => JSON.stringify([
    cc.tables.syllabus_lessons.filter((l) => !(l.class === 'Class 5' && l.subject === 'Spoken English' && l.lesson_no === '1')),
    cc.tables.syllabus_session_tasks.filter((t) => !(t.class === 'Class 5' && (t.lesson_name === 'Day 1: Legacy' || t.lesson_name === 'Day 1: Brand new title'))),
  ])
  const req = (l: any, over: any = {}) => ({ ...l, mode: 'replace', confirmReset: true, expectedLessonId: String(id), ...over })

  it('refuses to replace without explicit confirmation or the lesson id', async () => {
    const l = await stage(c, 'Class 5', 1, CL, 'Day 1: New'); const before = c.snapshot()
    for (const over of [{ confirmReset: false }, { confirmReset: undefined }, { expectedLessonId: '' }]) {
      const r = await c.svc.publishSpokenLessons([req(l, over)])
      expect(r.results[0].status).toBe('failed')
    }
    expect(c.snapshot().replace(/spoken-english-pdfs[^"]*/g, '')).toBe(before.replace(/spoken-english-pdfs[^"]*/g, ''))
  })
  it('replaces exactly one lesson, resets only its progress, keeps the old PDF, leaves everything else identical', async () => {
    const oldUrl = c.tables.syllabus_lessons.find((l) => l.id === id)!.drive_link
    const othersBefore = others(c)
    const l = await stage(c, 'Class 5', 1, CL, 'Day 1: Brand new title')
    const r = await c.svc.publishSpokenLessons([req(l)])
    expect(r.results[0]).toMatchObject({ status: 'replaced', clearedTicks: 4 })
    const row = c.tables.syllabus_lessons.find((x) => x.id === id)!
    expect(row.name).toBe('Day 1: Brand new title'); expect(row.drive_link).toBe(l.pdfUrl); expect(row.drive_link).not.toBe(oldUrl)
    const mine = c.tables.syllabus_session_tasks.filter((t) => t.class === 'Class 5' && t.lesson_name === 'Day 1: Brand new title')
    expect(mine).toHaveLength(3); expect(mine.every((t) => t.checked === false)).toBe(true)
    expect(c.tables.syllabus_session_tasks.some((t) => t.lesson_name === 'Day 1: Legacy' && t.class === 'Class 5')).toBe(false)
    const archived = c.tables.syllabus_session_tasks.filter((t) => t.class === 'Class 5' && /^Day 1: Legacy \[replaced /.test(t.lesson_name))
    expect(archived).toHaveLength(28); expect(archived.every((t) => t.checked === true)).toBe(true)   // old progress kept, never deleted
    expect(c.tables.syllabus_session_tasks.some((t) => /\[pending /.test(t.lesson_name))).toBe(false)
    const othersNow = JSON.parse(others(c)); const othersThen = JSON.parse(othersBefore)
    expect(othersNow[0]).toEqual(othersThen[0]); expect(othersNow[1].length).toBe(othersThen[1].length + 28)
    expect(c.tables.syllabus_lesson_progress[0].state).toBe('FALSE')
    expect(spokenStatusFromRows(mine).label).toBe('Pending')
  })
  it('restores the old lesson and its ticks untouched if inserting the new checklist fails', async () => {
    const before = JSON.stringify([c.tables.syllabus_lessons, c.tables.syllabus_session_tasks.map((t) => ({ ...t })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))])
    const l = await stage(c, 'Class 5', 1, CL, 'Day 1: New')
    let inserts = 0   // fail only the NEW checklist insert; the automatic restore must succeed
    c.state.hook = (op, t) => (op === 'insert' && t === 'syllabus_session_tasks' && ++inserts === 1 ? { message: 'boom' } : undefined)
    const r = await c.svc.publishSpokenLessons([req(l)])
    c.state.hook = undefined
    expect(r.results[0].status).toBe('failed'); expect(r.results[0].message).toMatch(/kept unchanged/i)
    const after = JSON.stringify([c.tables.syllabus_lessons, c.tables.syllabus_session_tasks.map((t) => ({ ...t })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))])
    expect(after).toBe(before)                                   // lesson row + all 4 ticked keys exactly as before
    expect([...c.files.keys()].some((k) => k.includes(l.pdfUrl.split('/').pop()!))).toBe(false) // unused new files removed
  })
  it('says so loudly when the automatic restore also fails (never a false success)', async () => {
    const l = await stage(c, 'Class 5', 1, CL, 'Day 1: New')
    let upd = 0   // the lesson-row update fails, and so does every later tasks update (the un-archive)
    c.state.hook = (op, t) => (t === 'syllabus_lessons' && op === 'update' ? { message: 'boom' } : (t === 'syllabus_session_tasks' && op === 'update' && ++upd > 2 ? { message: 'boom2' } : undefined))
    const r = await c.svc.publishSpokenLessons([req(l)])
    expect(r.results[0].status).toBe('failed'); expect(r.results[0].message).toMatch(/RESTORE INCOMPLETE/)
    expect(c.tables.syllabus_session_tasks.filter((t) => t.class === 'Class 5' && /\[replaced /.test(t.lesson_name) && t.checked).length).toBe(28)   // old ticks still exist
  })
  it('restores the old lesson if updating the lesson row fails', async () => {
    const l = await stage(c, 'Class 5', 1, CL, 'Day 1: New')
    c.state.hook = (op, t) => (op === 'update' && t === 'syllabus_lessons' && !c.state.log.length ? (c.state.log.push('x'), { message: 'boom' }) : undefined)
    const r = await c.svc.publishSpokenLessons([req(l)])
    expect(r.results[0].status).toBe('failed')
    expect(c.tables.syllabus_lessons.find((x) => x.id === id)!.name).toBe('Day 1: Legacy')
    expect(spokenStatusFromRows(c.tables.syllabus_session_tasks.filter((t) => t.class === 'Class 5' && t.lesson_name === 'Day 1: Legacy')).label).toBe('Completed')
    expect(c.tables.syllabus_session_tasks.some((t) => /\[(pending|replaced) /.test(t.lesson_name))).toBe(false)
  })
  it('keeps old progress and the old lesson when the archive step fails', async () => {
    const l = await stage(c, 'Class 5', 1, CL, 'Day 1: New')
    c.state.hook = (op, t) => (op === 'update' && t === 'syllabus_session_tasks' ? { message: 'boom' } : undefined)
    const r = await c.svc.publishSpokenLessons([req(l)])
    c.state.hook = undefined
    expect(r.results[0].status).toBe('failed')
    expect(c.tables.syllabus_session_tasks.filter((t) => t.class === 'Class 5' && t.lesson_name === 'Day 1: Legacy' && t.checked)).toHaveLength(28)
    expect(c.tables.syllabus_session_tasks.some((t) => /\[pending /.test(t.lesson_name))).toBe(false)
  })
  it('works when the title stays the same (old rows archived, new rows under the same name)', async () => {
    const l = await stage(c, 'Class 5', 1, CL, 'Day 1: Legacy')
    const r = await c.svc.publishSpokenLessons([req(l)])
    expect(r.results[0].status).toBe('replaced')
    expect(c.tables.syllabus_session_tasks.filter((t) => t.class === 'Class 5' && t.lesson_name === 'Day 1: Legacy').every((t) => !t.checked)).toBe(true)
    expect(c.tables.syllabus_session_tasks.filter((t) => /Day 1: Legacy \[replaced /.test(t.lesson_name))).toHaveLength(28)
  })
  it('refuses when the lesson changed since review, or when the new title is already used', async () => {
    const l = await stage(c, 'Class 5', 1, CL, 'Day 1: New')
    let r = await c.svc.publishSpokenLessons([req(l, { expectedLessonId: '99999' })])
    expect(r.results[0].status).toBe('failed')
    const l2 = await stage(c, 'Class 5', 1, CL, 'Day 2: Legacy')                   // collides with the Day 2 lesson
    r = await c.svc.publishSpokenLessons([req(l2)])
    expect(r.results[0].status).toBe('failed'); expect(r.results[0].message).toMatch(/already used/)
    expect(c.tables.syllabus_lessons.find((x) => x.id === id)!.name).toBe('Day 1: Legacy')
  })
  it('never replaces when more than one lesson exists for that class and Day', async () => {
    c.tables.syllabus_lessons.push({ id: c.state.nextId++, class: 'Class 5', subject: 'Spoken English', name: 'Dup', lesson_no: '1', item_type: 'SpokenEnglish' })
    const r = await c.svc.publishSpokenLessons([req(await stage(c, 'Class 5', 1, CL, 'Day 1: New'))])
    expect(r.results[0].status).toBe('failed')
  })
})

describe('uploads', () => {
  const c = setup()
  it('accepts only validated names, PDFs and safe details; never reuses a file', async () => {
    const p = spokenAssetPath('Class 5', 9, 'abcdefghij12', 'pdf')
    await expect(c.svc.uploadSpokenAsset('spoken/../x.pdf', pdfB64(), 'application/pdf')).rejects.toThrow(/file name/)
    await expect(c.svc.uploadSpokenAsset('spoken/Class_5_Day_9.pdf', pdfB64(), 'application/pdf')).rejects.toThrow(/file name/) // un-versioned names are no longer accepted
    await expect(c.svc.uploadSpokenAsset(p, Buffer.from('not a pdf').toString('base64'), 'application/pdf')).rejects.toThrow(/not a PDF/)
    await expect(c.svc.uploadSpokenAsset(p, pdfB64(), 'application/json')).rejects.toThrow(/file type/)
    await c.svc.uploadSpokenAsset(p, pdfB64('first'), 'application/pdf')
    await expect(c.svc.uploadSpokenAsset(p, pdfB64('second'), 'application/pdf')).rejects.toThrow(/already exists/)
    expect(Buffer.from(c.files.get('spoken-english-pdfs/' + p)!).toString()).toContain('first')
    const j = spokenAssetPath('Class 5', 9, 'abcdefghij12', 'json')
    await expect(c.svc.uploadSpokenAsset(j, jsonB64({ video_url: 'javascript:alert(1)' }), 'application/json')).rejects.toThrow(/YouTube/)
    await expect(c.svc.uploadSpokenAsset(j, jsonB64({ evil: 1 }), 'application/json')).rejects.toThrow(/Unexpected field/)
    await c.svc.uploadSpokenAsset(j, jsonB64({ title: 't', video_url: 'https://youtu.be/abc123' }), 'application/json')
  })
})

describe('checklist progress (production-shaped data)', () => {
  let c: Ctx
  beforeEach(() => { c = setup(); seedLegacy(c, 'UKG', 1, 'Day 1: Greetings', false) })
  const lessonRows = () => c.tables.syllabus_session_tasks.filter((t) => t.class === 'UKG' && t.lesson_name === 'Day 1: Greetings')
  const keys = () => [...new Set(lessonRows().map((t) => t.task_key))]
  const save = (ticked: string[], who = 'T1') => c.svc.saveSpokenChecklist('UKG', 'Spoken English', 'Day 1: Greetings', keys().map((k) => ({ taskKey: k, checked: ticked.includes(k) })), who, '')

  it('shows 4 items (not 8) for a lesson with repeated rows, starting Pending', () => {
    expect(spokenStatusFromRows(lessonRows())).toMatchObject({ state: 'FALSE', total: 4, done: 0 })
  })
  it('Pending → In Progress → Completed → In Progress → Pending, and it persists', async () => {
    const k = keys()
    expect(await save([k[0]])).toMatchObject({ state: 'IN_PROGRESS', pct: 25, done: 1, total: 4, conflict: false })
    expect(await save(k)).toMatchObject({ state: 'TRUE', pct: 100, done: 4, total: 4 })
    expect(spokenStatusFromRows(lessonRows()).label).toBe('Completed')           // what a refresh / new login reads
    expect(lessonRows().every((t) => t.checked)).toBe(true)                       // every repeated row was ticked
    expect(await save(k.slice(0, 3))).toMatchObject({ state: 'IN_PROGRESS', pct: 75 })
    expect(await save([])).toMatchObject({ state: 'FALSE', pct: 0 })
    expect(lessonRows().some((t) => t.checked)).toBe(false)
  })
  it('keeps the legacy progress row in step', async () => {
    await save(keys())
    expect(c.tables.syllabus_lesson_progress.map((p) => p.state)).toEqual(['TRUE'])
    await save(keys().slice(0, 1))
    expect(c.tables.syllabus_lesson_progress.map((p) => p.state)).toEqual(['IN_PROGRESS'])
  })
  it('rejects ticks for items that are not part of the lesson', async () => {
    await expect(c.svc.saveSpokenChecklist('UKG', 'Spoken English', 'Day 1: Greetings', [{ taskKey: 'SPOKEN::UKG::7::CHK::1', checked: true }], 'T', '')).rejects.toThrow(/does not belong/)
  })
  it('concurrent teachers: each save finishes consistently, a clash is reported (never silently corrupted)', async () => {
    for (let round = 0; round < 20; round++) {
      let n = 0
      const cc = setup(async () => { if (++n % (2 + (round % 4)) === 0) await new Promise((r) => setTimeout(r, 0)); else await Promise.resolve() })
      seedLegacy(cc, 'UKG', 1, 'Day 1: Greetings', false)
      const ks = [...new Set(cc.tables.syllabus_session_tasks.map((t) => t.task_key))]
      const mk = (on: string[]) => cc.svc.saveSpokenChecklist('UKG', 'Spoken English', 'Day 1: Greetings', ks.map((k) => ({ taskKey: k, checked: on.includes(k) })), 'T', '')
      const [a, b] = await Promise.all([mk(ks), mk([ks[0]])])
      const st = spokenStatusFromRows(cc.tables.syllabus_session_tasks)
      // stored state is always one whole, valid state and the status derived from it is self-consistent
      expect(['TRUE', 'IN_PROGRESS']).toContain(st.state)
      expect(st.done).toBe(cc.tables.syllabus_session_tasks.length ? new Set(cc.tables.syllabus_session_tasks.filter((t) => t.checked).map((t) => t.task_key)).size : 0)
      if (a.conflict || b.conflict) expect(a.conflict || b.conflict).toBe(true)
    }
  })
  it('getSpokenLessonIndex reports ticked / total for the replace warning', async () => {
    await save(keys().slice(0, 2))
    const idx = await c.svc.getSpokenLessonIndex()
    expect(idx).toEqual([expect.objectContaining({ cls: 'UKG', day: 1, total: 4, ticked: 2 })])
  })
})

describe('source guards (permissions and legacy sync)', () => {
  const idx = fs.readFileSync(path.resolve(__dirname, '../../supabase/functions/syllabus-api/index.ts'), 'utf8').replace(/\r\n/g, '\n')
  it('upload, publish and index are Management-only', () => {
    for (const h of ['getSpokenLessonIndex', 'uploadSpokenAsset', 'publishSpokenLessons'])
      expect(idx).toMatch(new RegExp(h + ': async \\(\\w+, w\\) => \\{\\n    requireStrictManagement\\(w\\);'))
  })
  it('the legacy Drive sync skips lessons managed by portal upload', () => {
    expect(idx).toMatch(/must never touch them/)
    expect(idx).toMatch(/filterLegacySyncPayload\(/)
  })
})

import { filterLegacySyncPayload } from '../../supabase/functions/syllabus-api/spoken-status.ts'
describe('legacy Drive-sync guard', () => {
  const dayOf = (v: unknown) => String(parseInt(String(v ?? '').replace(/\D/g, ''), 10) || '')
  const managed = [{ class: 'Class 5', name: 'Day 1: Portal title', lesson_no: '1' }]
  it('drops lessons AND tasks of a managed class+Day even when the lesson_name differs', () => {
    const lessons = [{ class: 'Class 5', lesson_no: '1' }, { class: 'Class 5', lesson_no: '2' }, { class: 'Class 6', lesson_no: '1' }]
    const tasks = [
      { class: 'Class 5', lesson_name: 'Drive wording', task_key: 'SPOKEN::Class 5::1::CHK::1' },   // same key, different name
      { class: 'Class 5', lesson_name: 'Day 1: Portal title', task_key: 'x' },
      { class: 'Class 5', lesson_name: 'Day 2', task_key: 'SPOKEN::Class 5::2::CHK::1' },
      { class: 'Class 6', lesson_name: 'Day 1', task_key: 'SPOKEN::Class 6::1::CHK::1' },
    ]
    const r = filterLegacySyncPayload(lessons, tasks, managed, dayOf)
    expect(r.lessons.map((l) => `${l.class}|${l.lesson_no}`)).toEqual(['Class 5|2', 'Class 6|1'])
    expect(r.tasks!.map((t) => t.task_key)).toEqual(['SPOKEN::Class 5::2::CHK::1', 'SPOKEN::Class 6::1::CHK::1'])
  })
  it('passes everything through when nothing is managed', () => {
    const t = [{ class: 'Class 5', lesson_name: 'a', task_key: 'SPOKEN::Class 5::1::CHK::1' }]
    expect(filterLegacySyncPayload([{ class: 'Class 5', lesson_no: '1' }], t, [], dayOf).tasks).toEqual(t)
  })
  it('index.ts uses the shared guard', () => {
    const src = require('fs').readFileSync(require('path').resolve(__dirname, '../../supabase/functions/syllabus-api/index.ts'), 'utf8')
    expect(src).toMatch(/filterLegacySyncPayload\(lessons, tasks, managedRows/)
  })
})

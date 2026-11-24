// Spoken English tracker — tests load the REAL source files (no copied code).
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  computeSpokenStatus, groupSpokenTasks, spokenStatusFromRows,
  SPOKEN_ASSET_PATH_RE, spokenAssetPath, validateSpokenLessonInput,
} from '../../supabase/functions/syllabus-api/spoken-status.ts'

const root = path.resolve(__dirname, '..')
const load = (f: string) => fs.readFileSync(path.join(root, f), 'utf8')
const holder: any = {}
new Function('window', load('spoken-english-core.js'))(holder)
const C = holder.SpokenCore
const fx = (n: string): string[] => JSON.parse(load(`tests/fixtures/spoken/${n}.json`))

const SAMPLES: [string, string, number][] = [
  ['Class_5_Day_1', 'Class 5', 1], ['Class_10_Day_2', 'Class 10', 2], ['Nursery_Day_1', 'Nursery', 1],
  ['LKG_Day_3', 'LKG', 3], ['Class_9_Day_7', 'Class 9', 7], ['Class_3_Day_5', 'Class 3', 5], ['Class_7_Day_4', 'Class 7', 4],
]

describe('filename day detection', () => {
  it('detects single days and ranges', () => {
    expect(C.detectDaysFromFilename('Spoken Day 9.pdf')).toEqual([9])
    expect(C.detectDaysFromFilename('Spoken_English_Day_9-10.pdf')).toEqual([9, 10])
    expect(C.detectDaysFromFilename('Days 1 to 3.pdf')).toEqual([1, 2, 3])
    expect(C.detectDaysFromFilename('notes.pdf')).toEqual([])
  })
})

describe('PDF parsing → lessons and checklists (real extracted PDF text)', () => {
  for (const [file, cls, day] of SAMPLES) {
    it(`${file}: right class/day, relevant checklist`, () => {
      const r = C.parseUploadPages(fx(file))
      expect(r.lessons).toHaveLength(1)
      const l = r.lessons[0]
      expect(l.cls).toBe(cls)
      expect(l.day).toBe(day)
      expect(l.lessonName).toContain(`Day ${day}`)
      expect(l.checklist.length).toBeGreaterThanOrEqual(1)
      expect(l.checklist.length).toBeLessThanOrEqual(8)
      expect(new Set(l.checklist).size).toBe(l.checklist.length)
      // every item must be traceable to text that exists in this PDF (some 14-char run of it)
      const squash = (t: string) => t.replace(/[\s‘’'"“”/]/g, '')
      const pdfText = squash(fx(file).join('\n'))
      for (const item of l.checklist) {
        // traceable = some 10-char run of a quoted fragment occurs verbatim in the PDF text
        // (the prep line may only state "watch the video" when the PDF itself says so)
        const frags = item.split(/\s\/\s|—|:\s|▸|…/).map(squash).filter((f) => f.length >= 6)
        let hit = frags.some((f) => { for (let i = 0; i + 10 <= f.length; i += 2) if (pdfText.includes(f.slice(i, i + 10))) return true; return false })
        if (!hit && item.startsWith('ముందురోజు సిద్ధత') && !/\(‘/.test(item)) hit = pdfText.includes('వీడియో')
        expect(hit, 'not traceable to the PDF: ' + item).toBe(true)
      }
    })
  }
  it('checklists differ between lessons (not generic)', () => {
    const all = SAMPLES.map(([f]) => C.parseUploadPages(fx(f)).lessons[0].checklist.join('|'))
    expect(new Set(all).size).toBe(all.length)
  })
  it('a multi-class PDF is split into the right lessons and pages', () => {
    const pages = [...fx('Class_5_Day_1'), ...fx('Class_10_Day_2'), ...fx('Nursery_Day_1')]
    const r = C.parseUploadPages(pages)
    expect(r.lessons.map((l: any) => `${l.cls}#${l.day}`)).toEqual(['Class 5#1', 'Class 10#2', 'Nursery#1'])
    expect(r.lessons[0].startPage).toBe(0); expect(r.lessons[0].endPage).toBe(1)
    expect(r.lessons[1].startPage).toBe(2); expect(r.lessons[1].endPage).toBe(4)
    expect(r.daysFound).toEqual([1, 2])
  })
  it('flags unusable text for review instead of inventing tasks', () => {
    const r = C.parseUploadPages(['Class 5 తరగతి | DAY 4 పాఠం: Test సమయం: 40 నిమిషాలు | ప్రధాన లక్ష్యం: x 1. ఉపాధ్యాయులు ముందురోజు తప్పనిసరిగా చేయాల్సినవి • వీడియో చూడండి: abc'])
    expect(r.lessons).toHaveLength(1)
    expect(r.lessons[0].needsReview).toBe(true)
    expect(r.lessons[0].checklist.length).toBeLessThan(4)
  })
})

describe('status rules (client + server agree)', () => {
  const cases: [number, number, string, number][] = [
    [0, 4, 'FALSE', 0], [1, 4, 'IN_PROGRESS', 25], [3, 4, 'IN_PROGRESS', 75], [4, 4, 'TRUE', 100],
    [0, 0, 'FALSE', 0], [199, 200, 'IN_PROGRESS', 99],
  ]
  for (const [d, t, st, pct] of cases) {
    it(`${d}/${t} → ${st} ${pct}%`, () => {
      expect(C.computeStatus(d, t)).toMatchObject({ state: st, pct })
      expect(computeSpokenStatus(d, t)).toMatchObject({ state: st, pct })
    })
  }
  it('untick moves Completed → In Progress → Pending', () => {
    const rows = [1, 2, 3, 4].map((i) => ({ task_key: `K${i}`, content: `item ${i}`, checked: true }))
    expect(spokenStatusFromRows(rows).state).toBe('TRUE')
    rows[3].checked = false; expect(spokenStatusFromRows(rows).state).toBe('IN_PROGRESS')
    rows.forEach((r) => (r.checked = false)); expect(spokenStatusFromRows(rows).state).toBe('FALSE')
  })
  it('REGRESSION (live data shape): repeated rows and two wordings per key are ONE item per key', () => {
    // as found in production: 4 keys, each stored many times, some with older wording
    const rows: any[] = []
    for (let k = 1; k <= 4; k++) for (let i = 0; i < 30; i++) rows.push({ task_key: 'K' + k, content: 'new ' + k, checked: true })
    for (let k = 1; k <= 4; k++) for (let i = 0; i < 3; i++) rows.push({ task_key: 'K' + k, content: 'old ' + k, checked: true })
    const g = groupSpokenTasks(rows)
    expect(g).toHaveLength(4); expect(g.map((x) => x.content)).toEqual(['new 1', 'new 2', 'new 3', 'new 4'])   // most frequent wording
    expect(spokenStatusFromRows(rows)).toMatchObject({ state: 'TRUE', pct: 100, done: 4, total: 4 })
  })
  it('an item counts as ticked only if every stored row of its key is ticked', () => {
    const rows = [{ task_key: 'K1', content: 'a1', checked: true }, { task_key: 'K1', content: 'a1', checked: false }]
    expect(spokenStatusFromRows(rows)).toMatchObject({ state: 'FALSE', done: 0, total: 1 })
  })
  it('lesson starts Pending when no item is ticked', () => {
    expect(spokenStatusFromRows([{ task_key: 'a', content: 'x', checked: false }]).state).toBe('FALSE')
  })
})

describe('class summaries', () => {
  it('counts lessons and overall % = completed / total', () => {
    const s = C.summarize([{ currentState: 'TRUE' }, { currentState: 'TRUE' }, { currentState: 'IN_PROGRESS' }, { currentState: 'FALSE' }, { currentState: 'FALSE' }, { currentState: 'FALSE' }, { currentState: 'FALSE' }, { currentState: 'FALSE' }])
    expect(s).toEqual({ total: 8, completed: 2, inProgress: 1, pending: 5, pct: 25 })
    expect(C.summarize([])).toMatchObject({ total: 0, pct: 0 })
  })
})

describe('server-side upload validation', () => {
  it('only allows spoken/<class>_Day_<n>.(pdf|json)', () => {
    expect(SPOKEN_ASSET_PATH_RE.test(spokenAssetPath('Class 5', 9, 'abcdefghij12', 'pdf'))).toBe(true)
    expect(SPOKEN_ASSET_PATH_RE.test('spoken/Class_5_Day_9.pdf')).toBe(false)   // un-versioned names no longer accepted
    expect(SPOKEN_ASSET_PATH_RE.test('spoken/../x.pdf')).toBe(false)
    expect(SPOKEN_ASSET_PATH_RE.test('spoken/Class_13_Day_1.pdf')).toBe(false)
  })
  it('rejects bad lessons', () => {
    const ok: any = { cls: 'Class 5', day: 9, lessonName: 'Day 9: Greetings', checklist: ['a1b', 'c2d'], pdfUrl: 'https://x.supabase.co/a.pdf' }
    expect(validateSpokenLessonInput(ok)).toBeNull()
    expect(validateSpokenLessonInput({ ...ok, cls: 'Class 99' })).toMatch(/class/i)
    expect(validateSpokenLessonInput({ ...ok, checklist: [] })).toMatch(/checklist/i)
    expect(validateSpokenLessonInput({ ...ok, checklist: ['same', 'same'] })).toMatch(/duplicate/i)
    expect(validateSpokenLessonInput({ ...ok, pdfUrl: 'http://x' })).toMatch(/https/)
  })
})

describe('front end source guards', () => {
  const syl = load('syllabus.js')
  it('Spoken English UI no longer uses the target month or the Drive sync text', () => {
    expect(syl).not.toMatch(/Marked as November/)
    expect(syl).not.toMatch(/Check Drive &amp; Redo Slicing/)
    expect(syl).toMatch(/Add New Spoken English PDFs/)
  })
  it('saves the checklist with ONE batch call', () => {
    expect(syl).toMatch(/P\.api\("saveSpokenChecklist"/)
    expect(syl).not.toMatch(/"saveTaskProgress", \[taskKey, isChecked, me, "Spoken English Check"\]/)
  })
  it('new function names are routed to the syllabus API', () => {
    const cfg = load('config.js')
    for (const f of ['saveSpokenChecklist', 'getSpokenLessonIndex', 'uploadSpokenAsset', 'publishSpokenLessons']) expect(cfg).toContain(`"${f}"`)
  })
  it('regular syllabus code path is unchanged in behaviour (Manual card still has the month pill)', () => {
    expect(syl).toMatch(/isSpokenCard \? "" : '<span class="syl-pill month">/)
  })
})

describe('lesson header detection tolerates layout differences', () => {
  const C: any = (globalThis as any).SpokenCore || (require('../spoken-english-core.js'), (globalThis as any).SpokenCore)
  const body = (extra: string[] = []) => ['పాఠం: Test lesson', ...extra, '1. ఉపాధ్యాయులు ముందురోజు తయారీ', 'x'].join('\n')
  const find = (pages: string[]) => C.parseUploadPages(pages).lessons.map((l: any) => `${l.cls}|${l.day}`)
  it('strict header on the first line (no running header)', () => {
    expect(find(['Class 5 తరగతి | DAY 9\n' + body(), 'Class 5 తరగతి | DAY 10\n' + body()])).toEqual(['Class 5|9', 'Class 5|10'])
  })
  it('running header + strict header still works', () => {
    expect(find(['SPOKEN ENGLISH | TEACHER GUIDE DAY 9–10 • NURSERY–CLASS 10\nSchool Spoken English Programme Page 3\nClass 7 తరగతి | DAY 9\n' + body()])).toEqual(['Class 7|9'])
  })
  it('Telugu word extracted differently', () => {
    expect(find(['Class 5 తరగ తి | DAY 9\n' + body(), 'LKG తరగతి | DAY 9\n' + body(), 'Class 10 | DAY 10\n' + body()])).toEqual(['Class 5|9', 'LKG|9', 'Class 10|10'])
  })
  it('class and day on separate short lines', () => {
    expect(find(['Class 6\nDAY 9\n' + body()])).toEqual(['Class 6|9'])
  })
  it('never treats a running header or a sentence as a lesson start', () => {
    expect(find(['SPOKEN ENGLISH | TEACHER GUIDE DAY 9–10 • NURSERY–CLASS 10\nSchool Spoken English Programme Page 3\nwelcome\n' + body()])).toEqual([])
    expect(find(['Today in Class 5 the students will practise greetings and on DAY 9 they will do role play together with the teacher\n' + body()])).toEqual([])
  })
})

describe('real Day 9–10 PDF text (Telugu letters split by extra spaces)', () => {
  const pages = fx('Day_9-10_spaced_telugu')
  const r = C.parseUploadPages(pages)
  it('finds Nursery and LKG Day 9 even though the cover page precedes them', () => {
    const keys = r.lessons.map((l: any) => l.cls + ' ' + l.day)
    expect(keys).toContain('Nursery 9')
    expect(keys).toContain('LKG 9')
  })
  it('reads every section and needs no manual review', () => {
    const n = r.lessons.find((l: any) => l.cls === 'Nursery' && l.day === 9)
    expect(n.needsReview).toBe(false)
    expect(n.checklist.length).toBeGreaterThanOrEqual(6)
    expect(n.videoUrl).toBe('https://youtu.be/FP9DmKGJaDQ')
    expect(n.lessonName).toMatch(/Yesterday/)
  })
})

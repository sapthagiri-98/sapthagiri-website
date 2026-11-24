// Upload screen: Keep / Replace confirmation behaviour (jsdom, no network).
import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '..')
const w: any = window
beforeEach(() => {
  document.body.innerHTML = ''
  new Function('window', fs.readFileSync(path.join(root, 'spoken-english-core.js'), 'utf8'))(w)
  new Function('window', 'document', fs.readFileSync(path.join(root, 'spoken-upload.js'), 'utf8'))(w, document)
})
const lesson = (over: any = {}) => ({ cls: 'Class 5', day: 1, lessonName: 'Day 1: New', title: 'New', objective: 'o', startPage: 0, endPage: 1, needsReview: false, reviewReasons: [], approved: true,
  checklist: ['item one', 'item two'], exists: true, existing: { id: 7, name: 'Day 1: Old', total: 4, ticked: 3 }, existingCount: 1, decision: 'keep', confirmReset: false, duplicateInBatch: false, ...over })
const footBtn = () => document.querySelector('#spuFoot .btn-success') as HTMLButtonElement
const open = (ls: any[]) => w.SpokenUpload._test.review({ files: [], lessons: ls, existing: [] }, { api: async () => ({}), onDone() {} })

describe('Keep / Replace confirmation', () => {
  it('existing lessons default to Keep Existing: nothing is published', () => {
    const l = lesson(); open([l])
    expect(w.SpokenUpload._test.plan()).toEqual({ create: [], replace: [] })
    expect(footBtn().disabled).toBe(true)
    expect(document.body.textContent).toContain('already exists')
    expect(document.body.textContent).toContain('3 of 4')
  })
  it('choosing Replace shows a prominent warning naming the exact class/day and the progress that will be reset, and still needs a confirmation tick', () => {
    const l = lesson(); open([l])
    const radio = document.querySelector('input[value="replace"]') as HTMLInputElement
    radio.checked = true; radio.dispatchEvent(new Event('change'))
    const text = document.body.textContent!
    expect(text).toContain('replaces the existing lesson')
    expect(text).toContain('all teacher checklist progress saved for this class and Day will be reset')
    expect(text).toContain('Class 5 Day 1')
    expect(text).toContain('3 of 4 ticked items will be cleared')
    expect(w.SpokenUpload._test.plan().replace).toHaveLength(0)
    expect(footBtn().disabled).toBe(true)
    const cb = document.querySelector('[data-confirm]') as HTMLInputElement
    cb.checked = true; cb.dispatchEvent(new Event('change'))
    expect(w.SpokenUpload._test.plan().replace).toHaveLength(1)
    expect(footBtn().disabled).toBe(false); expect(footBtn().textContent).toContain('replace 1')
  })
  it('switching back to Keep clears the confirmation', () => {
    const l = lesson({ decision: 'replace', confirmReset: true }); open([l])
    const keep = document.querySelector('input[value="keep"]') as HTMLInputElement
    keep.checked = true; keep.dispatchEvent(new Event('change'))
    expect(l.confirmReset).toBe(false); expect(w.SpokenUpload._test.plan().replace).toHaveLength(0)
  })
  it('new lessons need approval; flagged ones are excluded until approved', () => {
    const ok = lesson({ exists: false, existing: null }), flagged = lesson({ day: 3, exists: false, existing: null, needsReview: true, reviewReasons: ['x'], approved: false })
    open([ok, flagged])
    expect(w.SpokenUpload._test.plan().create).toEqual([ok])
  })
  it('more than one existing lesson for a class/day can never be replaced from the screen', () => {
    open([lesson({ existing: null, existingCount: 2 })])
    expect(document.querySelector('input[value="replace"]')).toBeNull()
    expect(w.SpokenUpload._test.plan().replace).toHaveLength(0)
  })
  it('file names use a fresh random token every time', () => {
    const a = w.SpokenUpload._test.newToken(), b = w.SpokenUpload._test.newToken()
    expect(a).not.toBe(b); expect(w.SpokenUpload._test.assetPath('Class 5', 9, a, 'pdf')).toMatch(/^spoken\/Class_5_Day_9_[a-z0-9]{10}\.pdf$/)
  })
})

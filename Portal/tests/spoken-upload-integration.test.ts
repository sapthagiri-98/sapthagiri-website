// @vitest-environment jsdom
// Loads the real page scripts in the real order (config, portal, core, upload, syllabus) inside jsdom with a
// stubbed fetch, then clicks the real "Add New Spoken English PDFs" button. This is NOT a real-browser test
// (no PDFium/pdf-lib CDN, no real layout) - it checks wiring: load order, undefined names, modal opening.
import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const dir = path.resolve(__dirname, '..')
const read = (f: string) => fs.readFileSync(path.join(dir, f), 'utf8')
const SCRIPTS = ['config.js', 'portal.js', 'spoken-english-core.js', 'spoken-upload.js', 'syllabus.js']
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms))

function boot(role: string, indexFails = false) {
  document.documentElement.innerHTML = '<head></head><body><nav id="mobileNav"></nav><nav id="nav"></nav><main><div id="view"></div></main></body>'
  const calls: string[] = []
  ;(window as any).fetch = async (_u: string, init: any) => {
    const { fn } = JSON.parse(init.body); calls.push(fn)
    const ok = (data: any) => ({ text: async () => JSON.stringify({ ok: true, data }) })
    if (fn === 'getSpokenLessonIndex' && indexFails) return { text: async () => JSON.stringify({ ok: false, error: 'Management only.' }) }
    if (fn === 'getSpokenLessonIndex') return ok([{ id: 1, cls: 'Class 5', day: 1, name: 'x', itemType: 'SpokenEnglish', total: 4, ticked: 4 }])
    if (fn === 'getManagementTimelineAuditReport') return ok([])
    return ok([])
  }
  sessionStorage.setItem('pv2_session', JSON.stringify({ name: 'Test Admin', role, token: 't', permissions: {} }))
  const errors: string[] = []
  window.addEventListener('error', (e: any) => errors.push(String(e.message)))
  for (const f of SCRIPTS) { try { (0, eval)(read(f)) } catch (e: any) { errors.push(f + ': ' + e.message) } }
  return { calls, errors }
}

describe('Spoken English upload wiring', () => {
  beforeEach(() => { (window as any).SpokenUpload = undefined; (window as any).Portal = undefined })
  it('SpokenUpload and SpokenCore exist before syllabus.js runs; script order in syllabus.html is correct', () => {
    const html = fs.readFileSync(path.join(dir, 'syllabus.html'), 'utf8')
    const order = SCRIPTS.map((s) => html.indexOf('src="' + s + '"'))
    expect(order.every((i) => i > 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })
  it('the button opens the upload dialog and no script error occurs (Management)', async () => {
    const { errors } = boot('Management')
    await tick(100)
    expect(errors).toEqual([])
    expect(typeof (window as any).SpokenUpload.open).toBe('function')
    const btn = document.getElementById('sylSyncSpokenToolbar') as HTMLButtonElement
    expect(btn).toBeTruthy()
    btn.click()
    await tick()
    expect(errors).toEqual([])
    expect(document.getElementById('sylSpokenUpload')).toBeTruthy()
    const inp = document.getElementById('spuFiles') as HTMLInputElement
    expect(inp && inp.accept).toMatch(/pdf/); expect(inp.multiple).toBe(true)
    ;(document.getElementById('spuClose') as HTMLElement).click()
    expect(document.getElementById('sylSpokenUpload')).toBeNull()
  })
  it('choosing a file calls getSpokenLessonIndex, and a failure is shown instead of treating lessons as NEW', async () => {
    const { calls, errors } = boot('Management', true)
    await tick(100)
    ;(document.getElementById('sylSyncSpokenToolbar') as HTMLElement).click()
    const inp = document.getElementById('spuFiles') as HTMLInputElement
    const file = new File([new Uint8Array([37, 80, 68, 70, 45])], 'Day 9.pdf', { type: 'application/pdf' })
    ;(file as any).arrayBuffer = async () => new Uint8Array([37, 80, 68, 70, 45]).buffer   // jsdom's File has no arrayBuffer()
    Object.defineProperty(inp, 'files', { value: [file] })
    inp.dispatchEvent(new Event('change'))
    await tick(300)
    expect(calls).toContain('getSpokenLessonIndex')
    expect(document.getElementById('spuStatus')!.textContent).toMatch(/Could not check which lessons already exist/)
    expect(calls).not.toContain('uploadSpokenAsset'); expect(calls).not.toContain('publishSpokenLessons')
    expect(errors).toEqual([])
  })
  it('syllabus.js defines the toast helper it uses', () => {
    const src = read('syllabus.js')
    expect(src).toMatch(/function toast\(msg, kind\)/)
  })
})

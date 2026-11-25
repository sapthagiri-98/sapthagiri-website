// UI wired to the REAL service over the in-memory db (no network). Checks what a teacher/admin actually sees.
import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { makeFuDb } from './helpers/fudb.ts'
import { createFollowupService } from '../../supabase/functions/followup-api/followup-service.ts'

const root = path.resolve(__dirname, '..')
const w: any = window
const tick = () => new Promise((r) => setTimeout(r, 20))
function seed() {
  const mk = (n: number, cls: string, name: string) => ({ s: { student_uuid: 'u' + n, student_id: 'S' + n, name, father_name: 'Dad ' + n, phone1: '9' + n, is_active: true }, e: { id: n, student_uuid: 'u' + n, academic_year: '2026-27', class: cls, enrollment_type: 'Regular', leaving_date: null } })
  const st = [mk(1, 'Nursery', 'Anu'), mk(2, 'Nursery', 'Bala'), mk(4, '7', 'Dev')]
  return { users: [{ id: 1, name: 'Principal', role: 'Management', is_active: true }, { id: 2, name: 'Padmaja', role: 'Teacher', is_active: true }],
    students: st.map((x) => x.s), student_enrollments: st.map((x) => x.e), fee_settings: [{ key: 'CurrentYear', value: '2026-27' }],
    fee_charges: st.map(({ s }) => ({ student_id: s.student_id, academic_year: '2026-27', fee_type_code: 'TUITION', amount: 91357 })),
    fee_payments: [{ id: 11, student_id: 'S1', receipt_year: '2026-27', pay_date: '2026-11-10', amount: 2000, void: false }],
    fee_payment_allocations: [{ payment_id: 11, academic_year: '2026-27', fee_type_code: 'TUITION', amount: 2000 }] }
}
async function boot(who: any) {
  const T = makeFuDb(seed()); const svc = createFollowupService(T.db, { today: () => '2026-11-25' })
  await svc.handlers.fuAssignIncharge(['Nursery', 2], { name: 'Principal', role: 'Management' })
  document.body.innerHTML = '<nav id="nav"></nav><div id="fuRoot"></div>'
  w.Portal = { esc: (s: any) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c]), bootPage() {},
    api: async (fn: string, args: any[]) => JSON.parse(JSON.stringify(await (svc.handlers as any)[fn](args || [], who))) }
  new Function('window', 'document', fs.readFileSync(path.join(root, 'class-followup.js'), 'utf8'))(w, document)
  await tick(); await tick(); return T
}
beforeEach(() => { document.body.innerHTML = '' })

describe('teacher page', () => {
  it('shows only own class, statuses and reasons — and no money anywhere in the DOM', async () => {
    await boot({ name: 'Padmaja', role: 'Teacher' }); (document.querySelector('[data-f="all"]') as HTMLElement).click()
    const text = document.body.textContent!, html = document.body.innerHTML
    expect(text).toContain('My Class – Fee Follow-up'); expect(text).toContain('Nursery')
    expect(text).toContain('Anu'); expect(text).toContain('Bala'); expect(text).not.toContain('Dev')
    expect(text).toContain('Follow-up required. The minimum payment requirement has not been met.')
    expect(html).not.toMatch(/₹|91357|91,357|2000|2,000|outstanding|billed|allocation/i)
  })
  it('filters + search work', async () => {
    await boot({ name: 'Padmaja', role: 'Teacher' })
    expect(document.querySelectorAll('.fu-card').length).toBe(1)                       // default: needs attention => Bala only
    ;(document.querySelector('[data-f="met"]') as HTMLElement).click(); expect(document.querySelector('.fu-name')!.textContent).toBe('Anu')
    ;(document.querySelector('[data-f="all"]') as HTMLElement).click(); expect(document.querySelectorAll('.fu-card').length).toBe(2)
    const q = document.getElementById('fuQ') as HTMLInputElement; q.value = 'bal'; q.dispatchEvent(new Event('input', { bubbles: true }))
    expect(document.querySelectorAll('.fu-card').length).toBe(1)
  })
  it('has no administrator actions (hold / override / restriction)', async () => {
    await boot({ name: 'Padmaja', role: 'Teacher' })
    expect(document.body.innerHTML).not.toMatch(/data-a="(hold|ov|restrict|clrhold|clrov|decide)"/)
    expect(document.querySelector('[data-a="log"]')).toBeTruthy()
  })
  it('unassigned user sees a plain message and no data', async () => {
    await boot({ name: 'Nobody', role: 'Teacher' })
    expect(document.body.textContent).toContain('not assigned as a class in-charge'); expect(document.querySelector('.fu-card')).toBeNull()
  })
  it('escapes hostile names', async () => {
    const T = makeFuDb(seed()); T.tables.students[0].name = '<img src=x onerror=alert(1)>'
    const svc = createFollowupService(T.db, { today: () => '2026-11-25' }); await svc.handlers.fuAssignIncharge(['Nursery', 2], { name: 'P', role: 'Management' })
    document.body.innerHTML = '<div id="fuRoot"></div>'
    w.Portal = { esc: (s: any) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c]), bootPage() {}, api: async (fn: string, a: any[]) => JSON.parse(JSON.stringify(await (svc.handlers as any)[fn](a, { name: 'Padmaja', role: 'Teacher' }))) }
    new Function('window', 'document', fs.readFileSync(path.join(root, 'class-followup.js'), 'utf8'))(w, document); await tick(); await tick()
    ;(document.querySelector('[data-f="all"]') as HTMLElement).click()
    expect(document.querySelector('img')).toBeNull()
  })
})

describe('admin page', () => {
  it('shows all classes overview with in-charge, and class detail with amounts', async () => {
    await boot({ name: 'Principal', role: 'Management' })
    expect(document.body.textContent).toContain('Padmaja'); expect(document.body.textContent).toContain('Not assigned'); expect(document.body.textContent).toContain('Class 10')
    ;(document.querySelector('[data-open="Nursery"]') as HTMLElement).click(); await tick(); await tick()
    expect(document.body.textContent).toMatch(/outstanding ₹91,357/); expect(document.querySelector('[data-a="hold"]')).toBeTruthy()
  })
})

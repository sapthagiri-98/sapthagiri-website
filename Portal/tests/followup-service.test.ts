// Service-level security + workflow tests. IN-MEMORY double only: no real Supabase project, no production data.
import { describe, it, expect, beforeEach } from 'vitest'
import { makeFuDb } from './helpers/fudb.ts'
import { createFollowupService } from '../../supabase/functions/followup-api/followup-service.ts'

const TODAY = '2026-11-25'
const admin = { name: 'Principal', role: 'Management', is_active: true }
const padmaja = { name: 'Padmaja', role: 'Teacher', is_active: true }
const ravi = { name: 'Ravi', role: 'Teacher', is_active: true }
const dtp = { name: 'Operator', role: 'DTP', is_active: true }

function seed() {
  const users = [
    { id: 1, name: 'Principal', role: 'Management', is_active: true }, { id: 2, name: 'Padmaja', role: 'Teacher', is_active: true },
    { id: 3, name: 'Ravi', role: 'Teacher', is_active: true }, { id: 4, name: 'Operator', role: 'DTP', is_active: true },
    { id: 5, name: 'Gone', role: 'Teacher', is_active: false },
  ]
  const mk = (n: number, cls: string, name: string) => ({ s: { student_uuid: 'u' + n, student_id: 'S' + n, name, father_name: 'Father ' + n, phone1: '90000' + n, is_active: true }, e: { id: n, student_uuid: 'u' + n, academic_year: '2026-27', class: cls, enrollment_type: 'Regular', leaving_date: null } })
  const st = [mk(1, 'Nursery', 'Anu'), mk(2, 'Nursery', 'Bala'), mk(3, 'Nursery', 'Chitra'), mk(4, '7', 'Dev'), mk(5, '7', 'Esha')]
  const charges = st.flatMap(({ s }) => [{ student_id: s.student_id, academic_year: '2026-27', fee_type_code: 'TUITION', amount: s.student_id === 'S3' ? 60000 : 20000 }])
  const payments = [
    { id: 11, student_id: 'S1', receipt_year: '2026-27', pay_date: '2026-11-10', amount: 2000, void: false },        // Anu: minimum met
    { id: 12, student_id: 'S3', receipt_year: '2026-27', pay_date: '2026-10-20', amount: 50000, void: false },       // Chitra: substantial
    { id: 13, student_id: 'S4', receipt_year: '2026-27', pay_date: '2026-11-20', amount: 500, void: true },         // voided
  ]
  const allocs = payments.map((p) => ({ payment_id: p.id, academic_year: '2026-27', fee_type_code: 'TUITION', amount: p.amount }))
  return { users, students: st.map((x) => x.s), student_enrollments: st.map((x) => x.e), fee_settings: [{ key: 'CurrentYear', value: '2026-27' }], fee_charges: charges, fee_payments: payments, fee_payment_allocations: allocs }
}
let T: ReturnType<typeof makeFuDb>, svc: ReturnType<typeof createFollowupService>, h: any
beforeEach(() => { T = makeFuDb(seed()); svc = createFollowupService(T.db, { today: () => TODAY }); h = svc.handlers })

describe('in-charge assignment', () => {
  it('admin assigns Nursery in-charge; shows in list; audit written', async () => {
    await h.fuAssignIncharge(['Nursery', 2, 'new year'], admin)
    const l = await h.fuListAssignments([], admin)
    expect(l.classes.find((c: any) => c.code === 'Nursery').incharge.name).toBe('Padmaja')
    expect(l.classes.map((c: any) => c.code)).toEqual(['Nursery','LKG','UKG','1','2','3','4','5','6','7','8','9','10'])
    expect(T.state.audits.some((a) => a.p_action === 'ASSIGN_INCHARGE')).toBe(true)
  })
  it('only eligible staff selectable (inactive / DTP rejected, not listed)', async () => {
    await expect(h.fuAssignIncharge(['Nursery', 5], admin)).rejects.toThrow(/not eligible/)
    await expect(h.fuAssignIncharge(['Nursery', 4], admin)).rejects.toThrow(/not eligible/)
    const l = await h.fuListAssignments([], admin); expect(l.staff.map((s: any) => s.name)).not.toContain('Gone'); expect(l.staff.map((s: any) => s.name)).not.toContain('Operator')
  })
  it('reassign: old row ended with history, exactly one active primary', async () => {
    await h.fuAssignIncharge(['Nursery', 2], admin); await h.fuAssignIncharge(['Nursery', 3], admin)
    const rows = T.tables.class_incharge
    expect(rows.filter((r) => r.active && r.class_code === 'Nursery').length).toBe(1)
    expect(rows.find((r) => r.user_id === 2).active).toBe(false); expect(rows.find((r) => r.user_id === 2).end_reason).toBe('Reassigned')
    const hist = await h.fuInchargeHistory(['Nursery'], admin); expect(hist.length).toBe(2)
  })
  it('a teacher moved to another class leaves the first class unassigned', async () => {
    await h.fuAssignIncharge(['Nursery', 2], admin); await h.fuAssignIncharge(['7', 2], admin)
    const l = await h.fuListAssignments([], admin)
    expect(l.classes.find((c: any) => c.code === 'Nursery').incharge).toBeNull(); expect(l.classes.find((c: any) => c.code === '7').incharge.name).toBe('Padmaja')
  })
  it('re-assigning the same person is rejected; remove needs reason', async () => {
    await h.fuAssignIncharge(['Nursery', 2], admin)
    await expect(h.fuAssignIncharge(['Nursery', 2], admin)).rejects.toThrow(/already/)
    await expect(h.fuRemoveIncharge(['Nursery', ''], admin)).rejects.toThrow(/reason/)
    await h.fuRemoveIncharge(['Nursery', 'on leave'], admin); expect((await h.fuListAssignments([], admin)).classes[0].incharge).toBeNull()
  })
  it('unknown class rejected', async () => { await expect(h.fuAssignIncharge(['11', 2], admin)).rejects.toThrow(/Unknown class/) })
  it('NON-admins cannot assign, remove, list or read history', async () => {
    for (const who of [padmaja, ravi, dtp, null as any]) {
      await expect(h.fuAssignIncharge(['Nursery', 2], who)).rejects.toThrow(/Management only/)
      await expect(h.fuRemoveIncharge(['Nursery', 'x'], who)).rejects.toThrow(/Management only/)
      await expect(h.fuListAssignments([], who)).rejects.toThrow(/Management only/)
      await expect(h.fuInchargeHistory([], who)).rejects.toThrow(/Management only/)
    }
    expect(T.tables.class_incharge.length).toBe(0)
  })
  it('DB-level uniqueness backs it up (duplicate active primary refused)', async () => {
    const r1 = await T.db.from('class_incharge').insert({ class_code: 'Nursery', user_id: 2, is_primary: true, active: true })
    const r2 = await T.db.from('class_incharge').insert({ class_code: 'Nursery', user_id: 3, is_primary: true, active: true })
    expect(r1.error).toBeNull(); expect(r2.error).toBeTruthy()
  })
  it('audit failure aborts with an error (no silent unaudited change)', async () => {
    T.state.failAudit = true; await expect(h.fuAssignIncharge(['Nursery', 2], admin)).rejects.toThrow(/Audit log failed/)
  })
})

describe('teacher dashboard is class-scoped and money-free', () => {
  beforeEach(async () => { await h.fuAssignIncharge(['Nursery', 2], admin) })
  it('Padmaja sees only Nursery students', async () => {
    const r = await h.fuMyClass([], padmaja)
    expect(r.classLabel).toBe('Nursery'); expect(r.students.map((s: any) => s.name).sort()).toEqual(['Anu', 'Bala', 'Chitra'])
  })
  it('request args cannot select another class', async () => {
    const r = await h.fuMyClass(['7', { classCode: '7' }], padmaja); expect(r.students.every((s: any) => s.classLabel === 'Nursery')).toBe(true)
  })
  it('unassigned teacher / non-teacher gets nothing; Ravi sees nothing of Nursery', async () => {
    await expect(h.fuMyClass([], ravi)).rejects.toThrow(/not assigned/); await expect(h.fuMyClass([], dtp)).rejects.toThrow(/not assigned/)
  })
  it('teacher cannot call admin endpoints (any class, any detail)', async () => {
    for (const f of ['fuAdminClass', 'fuAdminOverview', 'fuGetPolicy', 'fuSavePolicy', 'fuSetHold', 'fuClearHold', 'fuSetOverride', 'fuClearOverride', 'fuProposeRestriction', 'fuDecideRestriction', 'fuAdminActivity'])
      await expect(h[f](['7', 'x', 'y'], padmaja)).rejects.toThrow(/Management only/)
  })
  it('response has NO financial figures and no admin block', async () => {
    const r = await h.fuMyClass([], padmaja); const json = JSON.stringify(r)
    expect(json).not.toMatch(/50000|20000|60000|2000\b|outstanding|billed|balance|allocation|admin"|internal|byCode|priorityBalance|paidInWindow/i)
    for (const s of r.students) expect(Object.keys(s)).not.toContain('admin')
  })
  it('statuses: Anu met, Bala follow-up, Chitra hold', async () => {
    const m = Object.fromEntries((await h.fuMyClass([], padmaja)).students.map((s: any) => [s.name, s]))
    expect(m.Anu.requirement).toBe('MET'); expect(m.Bala.action).toBe('FOLLOW_UP'); expect(m.Chitra.requirement).toBe('HOLD'); expect(m.Anu.lastPaymentDate).toBe('2026-11-10')
  })
  it('departed students are excluded', async () => {
    T.tables.student_enrollments.find((e) => e.student_uuid === 'u2')!.leaving_date = '2026-10-01'
    expect((await h.fuMyClass([], padmaja)).students.map((s: any) => s.name)).not.toContain('Bala')
  })
  it('admin view of a class does include amounts', async () => {
    const r = await h.fuAdminClass(['Nursery'], admin); const bala = r.students.find((s: any) => s.name === 'Bala')
    expect(bala.admin.outstanding).toBe(20000); expect(bala.admin.minimum).toBe(2000)
  })
})

describe('module checkbox (permission switch)', () => {
  it('Management turning "Fee Follow-up" OFF blocks the teacher even though assigned; ON/absent allows', async () => {
    await h.fuAssignIncharge(['Nursery', 2], admin)
    const off = { ...padmaja, permissions: { 'Fee Follow-up': false } }
    expect((await h.fuWhoAmI([], off)).classCode).toBeNull()
    await expect(h.fuMyClass([], off)).rejects.toThrow(/not assigned/)
    await expect(h.fuLogContact([{ studentUuid: 'u1', outcome: 'REACHED' }], off)).rejects.toThrow(/not assigned/)
    expect((await h.fuWhoAmI([], { ...padmaja, permissions: { 'Fee Follow-up': true } })).classCode).toBe('Nursery')
    expect((await h.fuWhoAmI([], { ...padmaja, permissions: {} })).classCode).toBe('Nursery')
  })
  it('the checkbox alone never grants access without an assignment', async () => {
    await expect(h.fuMyClass([], { ...ravi, permissions: { 'Fee Follow-up': true } })).rejects.toThrow(/not assigned/)
  })
})

describe('contacts, overrides, holds, restrictions', () => {
  beforeEach(async () => { await h.fuAssignIncharge(['Nursery', 2], admin) })
  it('teacher logs contact + promise + referral; recommendation reacts; audited', async () => {
    await h.fuLogContact([{ studentUuid: 'u2', outcome: 'PROMISED', promisedOn: '2026-12-05', remark: 'will pay after salary' }], padmaja)
    let b = (await h.fuMyClass([], padmaja)).students.find((s: any) => s.name === 'Bala'); expect(b.action).toBe('REVIEW_LATER'); expect(b.promisedOn).toBe('2026-12-05')
    await h.fuLogContact([{ studentUuid: 'u2', outcome: 'REFERRED', remark: 'no response' }], padmaja)
    b = (await h.fuMyClass([], padmaja)).students.find((s: any) => s.name === 'Bala'); expect(b.referred).toBe(true)
    expect(T.state.audits.map((a) => a.p_action)).toEqual(expect.arrayContaining(['LOG_CONTACT', 'REFER_TO_ADMIN']))
  })
  it('teacher cannot log a contact for a student of another class', async () => {
    await expect(h.fuLogContact([{ studentUuid: 'u4', outcome: 'REACHED' }], padmaja)).rejects.toThrow(/not in your class/)
    await expect(h.fuContactHistory(['u4'], padmaja)).rejects.toThrow(/not in your class/)
    await expect(h.fuLogContact([{ studentUuid: 'u1', outcome: 'REACHED' }], ravi)).rejects.toThrow(/not assigned/)
  })
  it('validations: promised needs a date; no future contact date; bad outcome', async () => {
    await expect(h.fuLogContact([{ studentUuid: 'u2', outcome: 'PROMISED' }], padmaja)).rejects.toThrow(/promised/i)
    await expect(h.fuLogContact([{ studentUuid: 'u2', outcome: 'REACHED', contactedOn: '2027-01-01' }], padmaja)).rejects.toThrow(/future/)
    await expect(h.fuLogContact([{ studentUuid: 'u2', outcome: 'BOGUS' }], padmaja)).rejects.toThrow(/valid outcome/)
  })
  it('override requires reason, changes recommendation, is audited and reversible', async () => {
    await expect(h.fuSetOverride(['u2', 'NONE', ''], admin)).rejects.toThrow(/reason/)
    await h.fuSetOverride(['u2', 'NONE', 'sibling arrangement', 'Special case'], admin)
    let b = (await h.fuMyClass([], padmaja)).students.find((s: any) => s.name === 'Bala'); expect(b.action).toBe('NONE'); expect(b.reason).toMatch(/administration/)
    expect(JSON.stringify(b)).not.toMatch(/sibling/)       // internal reason never reaches the teacher
    await h.fuClearOverride(['u2'], admin)
    b = (await h.fuMyClass([], padmaja)).students.find((s: any) => s.name === 'Bala'); expect(b.action).toBe('FOLLOW_UP')
    expect(T.state.audits.filter((a) => /OVERRIDE/.test(a.p_action)).length).toBe(2)
  })
  it('admin hold set / cleared', async () => {
    await expect(h.fuSetHold(['u2', '2026-01-01', 'x'], admin)).rejects.toThrow(/today or later/)
    await h.fuSetHold(['u2', '2026-12-31', 'family emergency'], admin)
    expect((await h.fuMyClass([], padmaja)).students.find((s: any) => s.name === 'Bala').requirement).toBe('HOLD')
    await h.fuClearHold(['u2'], admin)
    expect((await h.fuMyClass([], padmaja)).students.find((s: any) => s.name === 'Bala').requirement).toBe('NOT_MET')
  })
  it('restriction: nothing happens automatically; only an admin proposes then authorises with reasons', async () => {
    // a plain recommendation never creates a restriction
    await h.fuMyClass([], padmaja); expect(T.tables.fu_restrictions.length).toBe(0)
    await expect(h.fuProposeRestriction(['u2', ['classes'], 'x'], padmaja)).rejects.toThrow(/Management only/)
    await h.fuProposeRestriction(['u2', ['exams'], 'persistent non-payment'], admin)
    let b = (await h.fuMyClass([], padmaja)).students.find((s: any) => s.name === 'Bala'); expect(b.restrictionState).toBe('pending'); expect(b.restrictionNote).toMatch(/Do not apply/)
    const id = T.tables.fu_restrictions[0].id
    await expect(h.fuDecideRestriction([id, 'authorised', ''], admin)).rejects.toThrow(/reason/)
    await expect(h.fuDecideRestriction([id, 'authorised', 'ok'], padmaja)).rejects.toThrow(/Management only/)
    await h.fuDecideRestriction([id, 'authorised', 'approved by principal'], admin)
    b = (await h.fuMyClass([], padmaja)).students.find((s: any) => s.name === 'Bala'); expect(b.restrictionState).toBe('authorised'); expect(b.restrictionNote).toMatch(/FA\/SA/)
    await expect(h.fuDecideRestriction([id, 'rejected', 'x'], admin)).rejects.toThrow(/cannot be/)
    await h.fuDecideRestriction([id, 'lifted', 'paid'], admin)
    expect((await h.fuMyClass([], padmaja)).students.find((s: any) => s.name === 'Bala').restrictionState).toBe('none')
    expect(T.state.audits.map((a) => a.p_action)).toEqual(expect.arrayContaining(['PROPOSE_RESTRICTION', 'RESTRICTION_AUTHORISED', 'RESTRICTION_LIFTED']))
  })
  it('policy save validates, is admin-only, audited, and changes minimums', async () => {
    const p = await h.fuGetPolicy([], admin); p.bands[0].amount = 99999
    const saved = await h.fuSavePolicy([p], admin); expect(saved.bands[0].amount).toBe(99999)
    await expect(h.fuSavePolicy([{ ...p, holdMonths: 9 }], admin)).rejects.toThrow()
    const b = (await h.fuAdminClass(['Nursery'], admin)).students.find((s: any) => s.name === 'Anu'); expect(b.admin.minimum).toBe(99999); expect(b.requirement).not.toBe('MET')
  })
})

describe('existing fee data is never changed', () => {
  it('no handler writes fee_* / students / users tables', async () => {
    await h.fuAssignIncharge(['Nursery', 2], admin)
    const before = JSON.stringify([T.tables.fee_charges, T.tables.fee_payments, T.tables.fee_payment_allocations, T.tables.fee_settings, T.tables.students, T.tables.student_enrollments, T.tables.users])
    await h.fuMyClass([], padmaja); await h.fuAdminOverview([], admin); await h.fuAdminClass(['7'], admin)
    await h.fuLogContact([{ studentUuid: 'u1', outcome: 'REACHED' }], padmaja); await h.fuSetHold(['u2', '2026-12-31', 'x'], admin)
    expect(JSON.stringify([T.tables.fee_charges, T.tables.fee_payments, T.tables.fee_payment_allocations, T.tables.fee_settings, T.tables.students, T.tables.student_enrollments, T.tables.users])).toBe(before)
    expect(T.state.writes.filter((w) => /fee_|students|student_enrollments|users/.test(w))).toEqual([])
  })
})

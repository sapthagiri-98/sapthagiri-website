// Pure rules for fee follow-up. No database, no network.
import { describe, it, expect } from 'vitest'
import { DEFAULT_POLICY, minimumFor, evaluate, buildAccount, validatePolicy, phaseFor, teacherView, normClass } from '../../supabase/functions/followup-api/followup-engine.ts'

const P = DEFAULT_POLICY
const charges = (o: Record<string, number>, y = '2026-27') => Object.entries(o).map(([c, a]) => ({ academic_year: y, fee_type_code: c, amount: a }))
function run(cls: string, today: string, ch: Record<string, number>, pays: Array<[string, number, any?]>, extra: any = {}) {
  const payments = pays.map((p, i) => ({ id: i + 1, receipt_year: '2026-27', pay_date: p[0], amount: p[1], void: false, ...(p[2] || {}) }))
  const allocs = payments.filter((p: any) => !p.noAlloc).map((p: any) => ({ payment_id: p.id, academic_year: '2026-27', fee_type_code: 'TUITION', amount: p.allocAmt ?? p.amount }))
  const account = buildAccount({ charges: charges(ch), payments, allocs }, '2026-27')
  return evaluate({ today, cls, policy: extra.policy || P, account, payments, allocs, ...extra })
}

describe('minimum by class band (configurable policy)', () => {
  it.each([['Nursery', 2000], ['LKG', 2000], ['UKG', 2000], ['1', 3000], ['5', 3000], ['6', 3500], ['8', 3500], ['9', 4000], ['10', 4000]])('%s => %i', (c, v) => expect(minimumFor(c, P)).toBe(v))
  it('class spellings normalise', () => { expect(normClass('Grade 7')).toBe('7'); expect(normClass('nursery')).toBe('Nursery'); expect(normClass('10.0')).toBe('10') })
  it('admin can change a band', () => { const p = validatePolicy({ ...P, bands: [{ name: 'All', from: 'Nursery', to: '10', amount: 1234 }] }); expect(minimumFor('7', p)).toBe(1234) })
  it('rejects bad policy', () => { expect(() => validatePolicy({ ...P, holdMonths: 5 })).toThrow(); expect(() => validatePolicy({ ...P, priorityFeeTypes: ['TUITION'], deferrableFeeTypes: ['TUITION'] })).toThrow() })
})

describe('Scenario A/B — payments inside the review window', () => {
  const ch = { TUITION: 20000 }
  it('no payment in 30 days => follow-up required', () => {
    const e = run('Nursery', '2026-11-25', ch, [['2026-09-01', 5000]])
    expect(e.requirement).toBe('NOT_MET'); expect(e.action).toBe('FOLLOW_UP'); expect(e.reason).toMatch(/Follow-up required/)
  })
  it('minimum paid within 30 days => met, no follow-up', () => {
    const e = run('Nursery', '2026-11-25', ch, [['2026-11-10', 2000]])
    expect(e.requirement).toBe('MET'); expect(e.action).toBe('NONE'); expect(e.reason).toBe('Payment requirement met. No follow-up required at present.')
  })
  it('several small payments add up (not just the latest)', () => {
    const e = run('1', '2026-11-25', ch, [['2026-11-02', 1000], ['2026-11-12', 1000], ['2026-11-20', 1000]])
    expect(e.requirement).toBe('MET')
  })
  it('partial: below minimum is not met', () => expect(run('6', '2026-11-25', ch, [['2026-11-20', 3000]]).requirement).toBe('NOT_MET'))
  it('window boundary: 30th day counts, 31st does not', () => {
    expect(run('Nursery', '2026-11-30', ch, [['2026-11-01', 2000]]).requirement).toBe('MET')
    expect(run('Nursery', '2026-11-30', ch, [['2026-10-31', 2000]]).requirement).toBe('NOT_MET')
  })
  it('voided / reversed payments never count', () => expect(run('Nursery', '2026-11-25', ch, [['2026-11-20', 9000, { void: true }]]).requirement).not.toBe('MET'))
  it('future-dated payments do not count', () => expect(run('Nursery', '2026-11-25', ch, [['2026-12-20', 9000]]).requirement).toBe('NOT_MET'))
})

describe('data quality => VERIFY (never guess about money)', () => {
  const ch = { TUITION: 20000 }
  it('missing pay date', () => { const e = run('Nursery', '2026-11-25', ch, [[null as any, 2000]]); expect(e.requirement).toBe('VERIFY'); expect(e.action).toBe('VERIFY') })
  it('payment with no allocation', () => expect(run('Nursery', '2026-11-25', ch, [['2026-11-20', 2000, { noAlloc: true }]]).requirement).toBe('VERIFY'))
  it('allocation total differs from payment', () => expect(run('Nursery', '2026-11-25', ch, [['2026-11-20', 2000, { allocAmt: 500 }]]).requirement).toBe('VERIFY'))
  it('no charges at all', () => expect(run('Nursery', '2026-11-25', {}, []).requirement).toBe('VERIFY'))
  it('class with no band', () => expect(run('Nursery', '2026-11-25', ch, [], { policy: { ...P, bands: [{ name: 'x', from: '9', to: '10', amount: 1 }] } }).requirement).toBe('VERIFY'))
})

describe('Scenario C/E — substantial recent payment => temporary hold', () => {
  it('Rs 50,000 vs Rs 2,000 minimum, mostly deferrable dues left => hold', () => {
    const e = run('Nursery', '2026-12-20', { TUITION: 60000 }, [['2026-11-20', 50000]])
    expect(e.requirement).toBe('HOLD'); expect(e.action).toBe('REVIEW_LATER'); expect(e.holdUntil).toBeTruthy()
    expect(e.reason).toMatch(/Recent substantial payment detected\. Defer routine follow-up and review again/)
  })
  it('hold expires: after the hold period follow-up resumes', () => {
    const e = run('Nursery', '2027-01-25', { TUITION: 60000 }, [['2026-11-20', 50000]])
    expect(e.requirement).toBe('NOT_MET'); expect(e.action).toBe('FOLLOW_UP')
  })
  it('two-month hold setting keeps it longer', () => {
    const p = { ...P, holdMonths: 2 }
    expect(run('Nursery', '2027-01-25', { TUITION: 60000 }, [['2026-11-20', 50000]], { policy: p }).requirement).toBe('HOLD')
  })
  it('a large payment does NOT clear priority dues', () => {
    const e = run('Nursery', '2026-12-20', { TUITION: 20000, STUDY_MAT: 4000 }, [['2026-10-20', 50000]].map((p) => p as any))
    // allocation put everything to TUITION in this fixture so STUDY_MAT remains
    expect(e.priority).toBe(true); expect(e.requirement).not.toBe('HOLD'); expect(e.action).toBe('PRIORITY_FOLLOW_UP')
  })
  it('February: hold only if remaining dues are low', () => {
    expect(run('Nursery', '2027-02-05', { TUITION: 70000 }, [['2026-12-28', 50000]]).requirement).toBe('NOT_MET')
    expect(run('Nursery', '2027-02-05', { TUITION: 60000 }, [['2026-12-28', 50000]]).requirement).toBe('HOLD')
  })
  it('March: no holds from payments — unresolved cases go to administration', () => {
    const e = run('Nursery', '2027-03-10', { TUITION: 60000 }, [['2027-02-20', 50000]])
    expect(e.requirement).not.toBe('HOLD')
  })
})

describe('Scenario D — priority categories and calendar', () => {
  it('study material / misc pending => priority follow-up even when minimum met', () => {
    const payments = [{ id: 1, receipt_year: '2026-27', pay_date: '2026-11-20', amount: 2000, void: false }]
    const allocs = [{ payment_id: 1, academic_year: '2026-27', fee_type_code: 'TUITION', amount: 2000 }]
    const account = buildAccount({ charges: charges({ TUITION: 20000, MISC: 1500 }), payments, allocs }, '2026-27')
    const e = evaluate({ today: '2026-11-25', cls: 'Nursery', policy: P, account, payments, allocs })
    expect(e.requirement).toBe('MET'); expect(e.action).toBe('PRIORITY_FOLLOW_UP'); expect(e.priority).toBe(true)
  })
  it('only tuition / old dues pending => normal follow-up (not priority)', () => {
    const e = run('Nursery', '2026-11-25', { TUITION: 20000, OLD_DUE: 5000 }, [])
    expect(e.priority).toBe(false); expect(e.action).toBe('FOLLOW_UP')
  })
  it('fully paid => none', () => expect(run('Nursery', '2026-11-25', { TUITION: 2000 }, [['2026-11-20', 2000]]).action).toBe('NONE'))
  it('phases', () => { expect(phaseFor('2026-12-10', P)).toBe('normal'); expect(phaseFor('2027-02-01', P)).toBe('push'); expect(phaseFor('2027-03-31', P)).toBe('final'); expect(phaseFor('2027-04-02', P)).toBe('closed') })
  it('April: school year ended', () => expect(run('Nursery', '2027-04-05', { TUITION: 20000 }, []).reasonCode).toBe('YEAR_END'))
  it('March: priority follow-up, then refer to administration after a recent contact', () => {
    expect(run('Nursery', '2027-03-05', { TUITION: 20000 }, []).action).toBe('PRIORITY_FOLLOW_UP')
    const e = run('Nursery', '2027-03-20', { TUITION: 20000 }, [], { lastContact: { contacted_on: '2027-03-06', outcome: 'REACHED' } })
    expect(e.action).toBe('REFER_ADMIN')
  })
})

describe('contacts, holds, overrides', () => {
  const ch = { TUITION: 20000 }
  it('promised date in future => review later', () => {
    const e = run('Nursery', '2026-11-25', ch, [], { lastContact: { contacted_on: '2026-11-20', outcome: 'PROMISED', promised_on: '2026-12-05' } })
    expect(e.action).toBe('REVIEW_LATER'); expect(e.reason).toMatch(/promised/)
  })
  it('recently contacted => not nagged again', () => expect(run('Nursery', '2026-11-25', ch, [], { lastContact: { contacted_on: '2026-11-20', outcome: 'REACHED' } }).action).toBe('REVIEW_LATER'))
  it('admin hold wins until it expires', () => {
    expect(run('Nursery', '2026-11-25', ch, [], { hold: { hold_until: '2026-12-10', reason: 'x' } }).requirement).toBe('HOLD')
    expect(run('Nursery', '2026-11-25', ch, [], { hold: { hold_until: '2026-11-01', reason: 'x' } }).requirement).toBe('NOT_MET')
  })
  it('admin override applies, expires', () => {
    expect(run('Nursery', '2026-11-25', ch, [], { override: { action: 'NONE', teacher_note: 'Special case' } }).action).toBe('NONE')
    expect(run('Nursery', '2026-11-25', ch, [], { override: { action: 'NONE', expires_on: '2026-11-01' } }).action).toBe('FOLLOW_UP')
  })
})

describe('ledger mirror', () => {
  it('old due derived from the previous year balance', () => {
    const l = { charges: [{ academic_year: '2025-26', fee_type_code: 'TUITION', amount: 10000 }, { academic_year: '2026-27', fee_type_code: 'TUITION', amount: 20000 }],
      payments: [{ id: 1, receipt_year: '2025-26', pay_date: '2025-08-01', amount: 6000 }], allocs: [{ payment_id: 1, academic_year: '2025-26', fee_type_code: 'TUITION', amount: 6000 }] }
    const a = buildAccount(l, '2026-27'); expect(a.byCode.OLD_DUE).toBe(4000); expect(a.outstanding).toBe(24000)
  })
  it('voided payment is ignored', () => {
    const a = buildAccount({ charges: charges({ TUITION: 5000 }), payments: [{ id: 1, receipt_year: '2026-27', pay_date: '2026-11-01', amount: 5000, void: true }], allocs: [{ payment_id: 1, academic_year: '2026-27', fee_type_code: 'TUITION', amount: 5000 }] }, '2026-27')
    expect(a.outstanding).toBe(5000)
  })
})

describe('teacher projection leaks no money', () => {
  it('contains no amount fields and no admin block', () => {
    const e = run('Nursery', '2026-11-25', { TUITION: 123456, STUDY_MAT: 789 }, [['2026-11-20', 2000]])
    const row = teacherView({ student_uuid: 'u', student_id: 'S1', name: 'A', father_name: 'F', phone1: '9' }, 'Nursery', e, {})
    const json = JSON.stringify(row)
    expect(json).not.toMatch(/123456|789|outstanding|billed|balance|internal|admin|amount|allocation/i)
    expect(Object.keys(row).sort()).toMatchInlineSnapshot(`
      [
        "action",
        "classLabel",
        "fatherName",
        "holdUntil",
        "lastContactOn",
        "lastContactOutcome",
        "lastPaymentDate",
        "name",
        "phone",
        "priority",
        "promisedOn",
        "reason",
        "referred",
        "requirement",
        "restrictionNote",
        "restrictionState",
        "studentId",
        "studentUuid",
      ]
    `)
  })
})

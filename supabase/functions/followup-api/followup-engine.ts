// =============================================================================
// followup-engine.ts — PURE, deterministic rules for fee follow-up recommendations.
//
//  * No database access, no network, no AI. Everything is computed from facts that
//    the caller read from the EXISTING fee ledger (fee_charges, fee_payments,
//    fee_payment_allocations). Nothing here writes or re-allocates money.
//  * `buildAccount` mirrors the read-only ledger maths of fees-api (buildAccount /
//    computeStartingPriorOldDue / outstandingUpto) so both modules agree on balances.
//  * `evaluate` returns an INTERNAL result (with amounts, for administrators).
//    `teacherView` is the ONLY thing that may be sent to a class in-charge teacher:
//    it is built from a fixed whitelist and contains no amounts.
//
// An optional AI explanation layer can later wrap `evaluate()`'s output text; it must
// never change a number, an allocation or a status.
// =============================================================================

export const R2 = (n: number) => Math.round(n * 100) / 100;
const N = (v: any) => { const n = Number(v); return isNaN(n) ? 0 : n; };
const S = (v: any) => (v == null ? "" : String(v)).trim();

// ------------------------------------------------------------------ classes
export function normClass(c: any): string {
  const s = S(c).replace(/\.0+$/, "");
  const u = s.toUpperCase().replace(/\s+/g, "");
  if (u.startsWith("NURSERY")) return "Nursery";
  if (u === "LKG" || u === "UKG") return u;
  const m = u.match(/^(?:GRADE|CLASS)?-?(\d{1,2})$/);
  return m ? String(parseInt(m[1], 10)) : s;
}
export function classWeight(c: any): number {
  const k = normClass(c);
  if (k === "Nursery") return 1; if (k === "LKG") return 2; if (k === "UKG") return 3;
  const n = parseInt(k, 10);
  return isNaN(n) ? 999 : 100 + n;
}
export function classLabel(c: any): string {
  const k = normClass(c);
  return /^\d+$/.test(k) ? "Class " + k : k;
}
export function sortClasses(a: string[]): string[] { return a.slice().sort((x, y) => classWeight(x) - classWeight(y)); }

// ------------------------------------------------------------------ policy
export interface Band { name: string; from: string; to: string; amount: number }
export interface Policy {
  bands: Band[];
  reviewDays: number;
  holdMonths: number;            // 1 (default) or 2
  substantialMultiple: number;   // payment(s) >= multiple x monthly minimum => "substantial"
  lowBalanceMultiple: number;    // in the push month a hold needs remaining dues <= multiple x minimum
  priorityFeeTypes: string[];
  deferrableFeeTypes: string[];
  calendar: { pushMonth: number; targetMonth: number; yearEndMonth: number };
  recontactDays: number;
}
export const DEFAULT_POLICY: Policy = {
  bands: [
    { name: "Nursery to UKG", from: "Nursery", to: "UKG", amount: 2000 },
    { name: "Grades 1-5", from: "1", to: "5", amount: 3000 },
    { name: "Grades 6-8", from: "6", to: "8", amount: 3500 },
    { name: "Grades 9-10", from: "9", to: "10", amount: 4000 },
  ],
  reviewDays: 30, holdMonths: 1, substantialMultiple: 5, lowBalanceMultiple: 6,
  priorityFeeTypes: ["STUDY_MAT", "MISC"], deferrableFeeTypes: ["TUITION", "OLD_DUE", "TRANSPORT"],
  calendar: { pushMonth: 2, targetMonth: 3, yearEndMonth: 4 }, recontactDays: 30,
};

const intIn = (v: any, lo: number, hi: number, name: string) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < lo || n > hi) throw new Error(`${name} must be a whole number between ${lo} and ${hi}.`);
  return n;
};
/** Validates + normalises an administrator-submitted policy (throws on bad input). */
export function validatePolicy(input: any): Policy {
  if (!input || typeof input !== "object") throw new Error("Policy is missing.");
  const bands: Band[] = (Array.isArray(input.bands) ? input.bands : []).map((b: any) => {
    const amount = Number(b.amount);
    if (!(amount >= 0 && amount <= 1000000)) throw new Error(`Minimum payment for "${S(b.name)}" is not valid.`);
    return { name: S(b.name).slice(0, 40), from: normClass(b.from), to: normClass(b.to), amount: Math.round(amount) };
  });
  if (!bands.length) throw new Error("At least one payment band is required.");
  for (const b of bands) if (classWeight(b.from) > classWeight(b.to)) throw new Error(`Band "${b.name}" has its classes in the wrong order.`);
  const codes = (v: any, name: string) => {
    const a = (Array.isArray(v) ? v : []).map((x: any) => S(x).toUpperCase()).filter(Boolean);
    if (a.some((x: string) => !/^[A-Z0-9_]{2,30}$/.test(x))) throw new Error(`${name} contains an invalid fee code.`);
    return a;
  };
  const priority = codes(input.priorityFeeTypes, "Priority fee types");
  const deferrable = codes(input.deferrableFeeTypes, "Deferrable fee types");
  if (priority.some((x: string) => deferrable.includes(x))) throw new Error("A fee type cannot be both priority and deferrable.");
  const cal = input.calendar || {};
  const pushMonth = intIn(cal.pushMonth, 1, 12, "Push month"), targetMonth = intIn(cal.targetMonth, 1, 12, "Target month"),
    yearEndMonth = intIn(cal.yearEndMonth, 1, 12, "Year-end month");
  return {
    bands, priorityFeeTypes: priority, deferrableFeeTypes: deferrable,
    reviewDays: intIn(input.reviewDays, 7, 90, "Review period (days)"),
    holdMonths: intIn(input.holdMonths, 1, 2, "Hold duration (months)"),
    substantialMultiple: intIn(input.substantialMultiple, 2, 100, "Substantial payment multiple"),
    lowBalanceMultiple: intIn(input.lowBalanceMultiple, 1, 100, "Low-balance multiple"),
    recontactDays: intIn(input.recontactDays, 1, 90, "Re-contact interval (days)"),
    calendar: { pushMonth, targetMonth, yearEndMonth },
  };
}
export function mergePolicy(stored: any): Policy {
  try { return validatePolicy({ ...DEFAULT_POLICY, ...(stored || {}), calendar: { ...DEFAULT_POLICY.calendar, ...((stored || {}).calendar || {}) } }); }
  catch { return DEFAULT_POLICY; }
}
/** Monthly minimum for a class, from the (configurable) bands. 0 => no band covers the class. */
export function minimumFor(cls: any, policy: Policy): number {
  const w = classWeight(cls);
  const b = policy.bands.find((x) => w >= classWeight(x.from) && w <= classWeight(x.to));
  return b ? b.amount : 0;
}

// ------------------------------------------------------------------ dates (all ISO yyyy-mm-dd, no timezones)
export function isoToUtc(iso: string): number { const [y, m, d] = iso.split("-").map(Number); return Date.UTC(y, m - 1, d); }
export function addDays(iso: string, n: number): string { return new Date(isoToUtc(iso) + n * 86400000).toISOString().slice(0, 10); }
export function daysBetween(a: string, b: string): number { return Math.round((isoToUtc(b) - isoToUtc(a)) / 86400000); }
const isIso = (s: any) => /^\d{4}-\d{2}-\d{2}$/.test(S(s)) && !isNaN(isoToUtc(S(s)));

export type Phase = "normal" | "push" | "final" | "closed";
/** Collection calendar: normal (to Jan) -> push (Feb) -> final (Mar) -> closed (Apr = school year ends). */
export function phaseFor(today: string, p: Policy): Phase {
  const m = parseInt(today.slice(5, 7), 10);
  if (m === p.calendar.yearEndMonth) return "closed";
  if (m === p.calendar.targetMonth) return "final";
  if (m === p.calendar.pushMonth) return "push";
  return "normal";
}

// ------------------------------------------------------------------ ledger (read-only mirror of fees-api)
const yNum = (y: any) => { const m = S(y).match(/(\d{4})/); return m ? +m[1] : 0; };
export function prevYear(y: string) { const n = yNum(y); return n ? `${n - 1}-${String(n).slice(2)}` : ""; }

export interface LedgerInput {
  charges: { academic_year: string; fee_type_code: string; amount: any }[];
  payments: { id: number; receipt_year: string; pay_date: string | null; amount: any; void?: boolean }[];
  allocs: { payment_id: number; academic_year: string; fee_type_code: string; amount: any }[];
}
export interface Account {
  year: string;
  byCode: Record<string, number>;      // outstanding balance per fee code (Old Due included)
  outstanding: number;                 // total outstanding for the year incl. carried-forward Old Due
  hasCharges: boolean;
}
/** Same formulas as fees-api (loadLedger + buildAccount + outstandingUpto). Read-only. */
export function buildAccount(l: LedgerInput, year: string): Account {
  const pays = (l.payments || []).filter((p) => !p.void);
  const okIds = new Set(pays.map((p) => p.id));
  const allocs = (l.allocs || []).filter((a) => okIds.has(a.payment_id));
  const lines: Record<string, { year: string; code: string; assigned: number; paid: number }> = {};
  for (const c of l.charges || []) {
    const k = c.academic_year + "|" + c.fee_type_code;
    (lines[k] ??= { year: c.academic_year, code: c.fee_type_code, assigned: 0, paid: 0 }).assigned += N(c.amount);
  }
  for (const a of allocs) {
    const k = a.academic_year + "|" + a.fee_type_code;
    (lines[k] ??= { year: a.academic_year, code: a.fee_type_code, assigned: 0, paid: 0 }).paid += N(a.amount);
  }
  const arr = Object.values(lines).map((x) => ({ ...x, balance: R2(Math.max(0, x.assigned - x.paid)) }));
  const yearLines = arr.filter((x) => x.year === year);
  const od = yearLines.find((x) => x.code === "OLD_DUE");
  const payById: Record<number, any> = {}; for (const p of pays) payById[p.id] = p;

  // Old Due carried from the previous year (when no explicit OLD_DUE charge exists for this year)
  const py = prevYear(year);
  const prevLines = arr.filter((x) => x.year === py);
  let derivedOld = 0;
  if (prevLines.length) {
    const prevAssigned = R2(prevLines.reduce((s, x) => s + x.assigned, 0));
    const prevPaidInPrev = allocs.filter((a) => payById[a.payment_id]?.receipt_year === py && a.academic_year === py)
      .reduce((s, a) => s + N(a.amount), 0);
    derivedOld = R2(Math.max(0, prevAssigned - prevPaidInPrev));
  }
  const startingOld = od ? od.assigned : derivedOld;
  const odPaidInYear = allocs.filter((a) => payById[a.payment_id]?.receipt_year === year && a.fee_type_code === "OLD_DUE")
    .reduce((s, a) => s + N(a.amount), 0);

  const byCode: Record<string, number> = {};
  const oldBal = R2(Math.max(0, startingOld - odPaidInYear));
  if (startingOld > 0.005 || odPaidInYear > 0.005 || od) byCode["OLD_DUE"] = oldBal;
  for (const x of yearLines) if (x.code !== "OLD_DUE") byCode[x.code] = x.balance;

  const directBal = R2(yearLines.reduce((s, x) => s + x.balance, 0));
  const outstanding = od ? directBal : R2(directBal + Math.max(0, derivedOld - odPaidInYear));
  return { year, byCode, outstanding, hasCharges: (l.charges || []).length > 0 };
}

// ------------------------------------------------------------------ evaluation
export type Action = "NONE" | "FOLLOW_UP" | "PRIORITY_FOLLOW_UP" | "REVIEW_LATER" | "REFER_ADMIN" | "VERIFY";
export type Requirement = "MET" | "NOT_MET" | "VERIFY" | "HOLD";
export const ACTIONS: Action[] = ["NONE", "FOLLOW_UP", "PRIORITY_FOLLOW_UP", "REVIEW_LATER", "REFER_ADMIN", "VERIFY"];

export interface EvalInput {
  today: string;
  cls: string;
  policy: Policy;
  account: Account;
  payments: { id: number; pay_date: string | null; amount: any; void?: boolean }[];
  allocs: { payment_id: number; amount: any }[];
  lastContact?: { contacted_on: string; outcome: string; promised_on?: string | null; referred?: boolean } | null;
  hold?: { hold_until: string; reason: string } | null;
  override?: { action: Action; teacher_note?: string | null; expires_on?: string | null } | null;
  restriction?: { status: string; scope: string[] } | null;
}
export interface Evaluation {
  requirement: Requirement;
  action: Action;
  priority: boolean;                 // study material / miscellaneous pending (boolean only for teachers)
  reasonCode: string;
  reason: string;                    // teacher-safe text (no amounts)
  holdUntil: string | null;
  lastPaymentDate: string | null;
  phase: Phase;
  // ---- INTERNAL (administrators only; never copied into teacherView) ----
  internal: {
    minimum: number; paidInWindow: number; outstanding: number; priorityBalance: number; deferrableBalance: number;
    otherBalance: number; byCode: Record<string, number>; substantialOn: string | null; windowStart: string;
  };
}
const fmt = (iso: string) => { const [y, m, d] = iso.split("-"); return `${d} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m - 1]} ${y}`; };

export function evaluate(inp: EvalInput): Evaluation {
  const { today, policy } = inp;
  const minimum = minimumFor(inp.cls, policy);
  const phase = phaseFor(today, policy);
  const windowStart = addDays(today, -(policy.reviewDays - 1));
  const lookbackStart = addDays(today, -(policy.reviewDays + policy.holdMonths * 30));

  // successful payments only (voided/reversed excluded). Amount = what the EXISTING allocations say.
  const allocSum: Record<number, number> = {}, allocCount: Record<number, number> = {};
  for (const a of inp.allocs || []) { allocSum[a.payment_id] = (allocSum[a.payment_id] || 0) + N(a.amount); allocCount[a.payment_id] = (allocCount[a.payment_id] || 0) + 1; }
  const good = (inp.payments || []).filter((p) => !p.void);
  let verify = false;
  const dated: { date: string; amt: number }[] = [];
  for (const p of good) {
    const hasDate = isIso(p.pay_date);
    const amt = R2(allocSum[p.id] || 0);
    if (!hasDate) { verify = true; continue; }                                  // missing/invalid payment date
    if (p.pay_date! > today) continue;                                          // future-dated: not yet a payment
    if (p.pay_date! >= lookbackStart && (!allocCount[p.id] || Math.abs(amt - N(p.amount)) > 0.5)) verify = true;  // unallocated / mismatched
    dated.push({ date: p.pay_date!, amt });
  }
  dated.sort((a, b) => a.date.localeCompare(b.date));
  const paidInWindow = R2(dated.filter((p) => p.date >= windowStart).reduce((s, p) => s + p.amt, 0));
  const lastPaymentDate = dated.length ? dated[dated.length - 1].date : null;

  const bc = inp.account.byCode;
  const sumBy = (codes: string[]) => R2(codes.reduce((s, c) => s + N(bc[c]), 0));
  const priorityBalance = sumBy(policy.priorityFeeTypes);
  const deferrableBalance = sumBy(policy.deferrableFeeTypes);
  const otherBalance = R2(Object.keys(bc).filter((c) => !policy.priorityFeeTypes.includes(c) && !policy.deferrableFeeTypes.includes(c)).reduce((s, c) => s + N(bc[c]), 0));
  const outstanding = inp.account.outstanding;
  const priority = priorityBalance > 0.005;
  const met = minimum > 0 && paidInWindow + 0.005 >= minimum;

  // "substantial" payment: cumulative successful payments in the look-back reach multiple x minimum
  let substantialOn: string | null = null;
  if (minimum > 0) {
    let run = 0; const thr = policy.substantialMultiple * minimum;
    for (const p of dated.filter((x) => x.date >= lookbackStart)) { run += p.amt; if (run + 0.005 >= thr) { substantialOn = p.date; break; } }
  }
  const holdDate = substantialOn ? addDays(substantialOn, policy.reviewDays + policy.holdMonths * 30) : null;

  const internal = { minimum, paidInWindow, outstanding, priorityBalance, deferrableBalance, otherBalance, byCode: { ...bc }, substantialOn, windowStart };
  const base = { priority, holdUntil: null as string | null, lastPaymentDate, phase, internal };
  const out = (requirement: Requirement, action: Action, reasonCode: string, reason: string, extra: Partial<Evaluation> = {}): Evaluation =>
    ({ ...base, requirement, action, reasonCode, reason, ...extra });

  // ---- administrator override (explicit decision, with recorded reason) ----
  const ov = inp.override;
  if (ov && (!ov.expires_on || ov.expires_on >= today)) {
    return out(met ? "MET" : "NOT_MET", ov.action, "ADMIN_OVERRIDE",
      "Set by administration." + (ov.teacher_note ? " " + S(ov.teacher_note).slice(0, 160) : ""));
  }
  // ---- data quality: do not guess about money ----
  if (verify || (!inp.account.hasCharges && good.length === 0) || minimum <= 0) {
    return out("VERIFY", "VERIFY", "NEEDS_VERIFICATION",
      "Payment information needs verification by administration. Please do not contact the parent about fees yet.");
  }
  // ---- fully paid ----
  if (outstanding <= 0.005) return out("MET", "NONE", "UP_TO_DATE", "No follow-up required. Fees are up to date.");
  // ---- administrator hold ----
  if (inp.hold && inp.hold.hold_until >= today) {
    return out("HOLD", "REVIEW_LATER", "ADMIN_HOLD", `Temporary follow-up hold set by administration. Review after ${fmt(inp.hold.hold_until)}.`, { holdUntil: inp.hold.hold_until });
  }
  // ---- school year ended ----
  if (phase === "closed") {
    return out(met ? "MET" : "NOT_MET", "NONE", "YEAR_END", "The school year has ended. Administration will handle any remaining cases.");
  }
  const lc = inp.lastContact || null;
  const recentContact = !!lc && daysBetween(lc.contacted_on, today) < policy.recontactDays && daysBetween(lc.contacted_on, today) >= 0;
  const promised = lc && lc.promised_on && lc.promised_on >= today ? lc.promised_on : null;

  // ---- minimum already paid in the review window ----
  if (met) {
    if (priority && !recentContact) {
      return out("MET", "PRIORITY_FOLLOW_UP", "MET_PRIORITY_PENDING",
        "Minimum payment met, but study material / miscellaneous payment is still pending. Priority reminder recommended.");
    }
    if (phase === "final" && !recentContact) {
      return out("MET", "FOLLOW_UP", "MET_TARGET_MONTH", "Minimum payment met. It is the year-end collection month, so a reminder about the remaining fees is recommended.");
    }
    return out("MET", "NONE", "MET", "Payment requirement met. No follow-up required at present.");
  }

  // ---- minimum NOT met in the window ----
  if (promised) {
    return out("NOT_MET", "REVIEW_LATER", "AWAIT_PROMISE", `Parent promised to pay by ${fmt(promised)}. Review after that date.`);
  }
  // recent substantial payment => defer routine follow-up (never when priority dues remain / year-end push)
  if (holdDate && holdDate >= today && !priority && phase !== "final") {
    const lowEnough = phase !== "push" || outstanding <= policy.lowBalanceMultiple * minimum + 0.005;
    if (lowEnough) {
      return out("HOLD", "REVIEW_LATER", "SUBSTANTIAL_PAYMENT_HOLD",
        `Recent substantial payment detected. Defer routine follow-up and review again after ${fmt(holdDate)}.`, { holdUntil: holdDate });
    }
  }
  if (phase === "final") {
    return recentContact
      ? out("NOT_MET", "REFER_ADMIN", "UNRESOLVED_TARGET", "Fees are still unresolved in the collection month. Please refer this case to administration.")
      : out("NOT_MET", "PRIORITY_FOLLOW_UP", "TARGET_MONTH", "Year-end collection month: follow-up required. The minimum payment requirement has not been met.");
  }
  if (priority) {
    return out("NOT_MET", "PRIORITY_FOLLOW_UP", "PRIORITY_PENDING",
      "Priority follow-up recommended: study material / miscellaneous payment is pending and the minimum payment requirement has not been met.");
  }
  if (recentContact) {
    return out("NOT_MET", "REVIEW_LATER", "RECENTLY_CONTACTED", `Parent was contacted on ${fmt(lc!.contacted_on)}. Review again after ${fmt(addDays(lc!.contacted_on, policy.recontactDays))}.`);
  }
  return out("NOT_MET", "FOLLOW_UP", "NOT_MET", "Follow-up required. The minimum payment requirement has not been met.");
}

// ------------------------------------------------------------------ what a teacher may see
export const RESTRICTION_LABELS: Record<string, string> = {
  classes: "classroom attendance", games: "games and sports", exams: "FA/SA examinations", tests: "slip, revision and class tests",
};
export interface TeacherRow {
  studentUuid: string; studentId: string; name: string; fatherName: string; phone: string; classLabel: string;
  requirement: Requirement; action: Action; priority: boolean; reason: string;
  lastPaymentDate: string | null; holdUntil: string | null;
  referred: boolean; lastContactOn: string | null; lastContactOutcome: string | null; promisedOn: string | null;
  restrictionState: "none" | "pending" | "authorised"; restrictionNote: string;
}
/** The ONLY projection sent to a teacher. Built from an explicit whitelist: no billed/outstanding/allocation figures. */
export function teacherView(
  stu: { student_uuid: string; student_id: string; name: string; father_name?: string; phone1?: string },
  cls: string, ev: Evaluation,
  extra: { lastContact?: any; restriction?: { status: string; scope: string[] } | null; referred?: boolean },
): TeacherRow {
  const r = extra.restriction || null;
  const authorised = !!r && r.status === "authorised", pending = !!r && r.status === "proposed";
  return {
    studentUuid: stu.student_uuid, studentId: stu.student_id, name: stu.name,
    fatherName: S(stu.father_name), phone: S(stu.phone1), classLabel: classLabel(cls),
    requirement: ev.requirement, action: ev.action, priority: ev.priority, reason: ev.reason,
    lastPaymentDate: ev.lastPaymentDate, holdUntil: ev.holdUntil,
    referred: !!extra.referred,
    lastContactOn: extra.lastContact?.contacted_on || null, lastContactOutcome: extra.lastContact?.outcome || null,
    promisedOn: extra.lastContact?.promised_on || null,
    restrictionState: authorised ? "authorised" : pending ? "pending" : "none",
    restrictionNote: authorised
      ? "Restriction authorised by administration: " + (r!.scope || []).map((s) => RESTRICTION_LABELS[s] || s).join(", ") + ". Follow the instruction communicated to you."
      : pending ? "Administration is reviewing this case. Do not apply any restriction until it is authorised." : "",
  };
}

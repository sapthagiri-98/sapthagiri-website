// =============================================================================
// followup-service.ts — handlers for Class In-charge + Fee Follow-up.
//
// SECURITY MODEL (enforced here, server-side — the browser is never trusted):
//   * identity comes from `who` (session token -> whoami) — never from request args.
//   * a teacher's class is READ FROM class_incharge by their identity; any class /
//     student id supplied by the browser is only ever checked against it.
//   * fee tables are only SELECTed. No handler writes fee_* tables.
//   * teachers receive `teacherView()` rows only (no amounts of any kind).
// =============================================================================
import {
  Policy, DEFAULT_POLICY, mergePolicy, validatePolicy, normClass, classLabel, sortClasses, classWeight, minimumFor,
  buildAccount, evaluate, teacherView, ACTIONS, Evaluation, phaseFor, R2,
} from "./followup-engine.ts";

const S = (v: any) => (v == null ? "" : String(v)).trim();
const INACTIVE_TYPES = new Set(["left", "inactive", "passed", "passed out", "transferred", "withdrawn", "tc", "tc issued"]);
const enrInactive = (e: any) => !!e?.leaving_date || INACTIVE_TYPES.has(S(e?.enrollment_type).toLowerCase());
export const STANDARD_CLASSES = ["Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
export const ELIGIBLE_ROLES = ["Teacher", "Tutor", "Management"];
const OUTCOMES = ["REACHED", "NO_ANSWER", "PROMISED", "REFUSED", "WRONG_NUMBER", "OTHER", "REFERRED"];
const SCOPES = ["classes", "games", "exams", "tests"];
const isIso = (s: any) => /^\d{4}-\d{2}-\d{2}$/.test(S(s)) && !isNaN(Date.parse(S(s)));
const clip = (v: any, n: number) => S(v).slice(0, n);

export function istToday(now = new Date()): string { return new Date(now.getTime() + 330 * 60000).toISOString().slice(0, 10); }

export function createFollowupService(db: any, opts: { today?: () => string } = {}) {
  const today = opts.today || (() => istToday());
  const must = (r: any, what: string) => { if (r?.error) throw new Error(`${what}: ${r.error.message}`); return r?.data; };
  const audit = async (who: any, action: string, entity: string, id: any, prev: any, next: any) => {
    // reuses the existing app.audit() helper (writes app.audit_logs)
    const { error } = await db.rpc("audit", { p_module: "FeeFollowUp", p_user: S(who?.name), p_action: action, p_entity: entity, p_entity_id: S(id), p_prev: prev ?? null, p_new: next ?? null });
    if (error) throw new Error("Audit log failed, action not completed: " + error.message);
  };
  const isAdmin = (who: any) => !!who && who.role === "Management";
  const requireAdmin = (who: any) => { if (!isAdmin(who)) throw new Error("Management only."); };

  async function chunked<T>(ids: any[], size: number, fn: (part: any[]) => Promise<T[]>): Promise<T[]> {
    const out: T[] = []; for (let i = 0; i < ids.length; i += size) out.push(...(await fn(ids.slice(i, i + size)))); return out;
  }
  async function currentYear(): Promise<string> {
    const r = await db.from("fee_settings").select("value").eq("key", "CurrentYear").maybeSingle();
    return S(r?.data?.value) || "2026-27";
  }
  async function loadPolicy(): Promise<Policy> {
    const r = await db.from("fu_settings").select("value").eq("key", "policy").maybeSingle();
    return mergePolicy(r?.data?.value);
  }
  async function userByName(name: string) {
    const r = await db.from("users").select("id,name,role,is_active").eq("name", name).maybeSingle();
    return r?.data || null;
  }
  /** The ONLY way a teacher's class is determined: active assignment for the authenticated identity. */
  async function myAssignment(who: any) {
    if (!who?.name) return null;
    if (who.permissions && who.permissions["Fee Follow-up"] === false) return null;   // Management switched the module OFF for this user
    const u = await userByName(S(who.name)); if (!u || u.is_active === false) return null;
    const r = await db.from("class_incharge").select("id,class_code,user_id,user_name,assigned_at").eq("user_id", u.id).eq("active", true).maybeSingle();
    return r?.data || null;
  }

  // -------- roster + evaluation (read-only against the existing ledger) --------
  async function roster(classCode: string, year: string) {
    const enr = must(await db.from("student_enrollments")
      .select("id,student_uuid,class,enrollment_type,leaving_date").eq("academic_year", year).eq("class", classCode).order("id", { ascending: false }), "Roster") || [];
    const latest: Record<string, any> = {};
    for (const e of enr) { const u = S(e.student_uuid); if (u && !latest[u]) latest[u] = e; }
    const uuids = Object.keys(latest).filter((u) => !enrInactive(latest[u]));
    if (!uuids.length) return [];
    const studs = await chunked<any>(uuids, 150, async (p) => must(await db.from("students").select("student_uuid,student_id,name,father_name,phone1,is_active").in("student_uuid", p), "Students") || []);
    return studs.filter((s) => s.is_active !== false).sort((a, b) => S(a.name).localeCompare(S(b.name)));
  }
  async function evaluateClass(classCode: string, internal: boolean) {
    const year = await currentYear(), policy = await loadPolicy(), t = today();
    const studs = await roster(classCode, year);
    const sids = studs.map((s: any) => S(s.student_id)).filter(Boolean), uuids = studs.map((s: any) => S(s.student_uuid));
    const charges = await chunked<any>(sids, 150, async (p) => must(await db.from("fee_charges").select("student_id,academic_year,fee_type_code,amount").in("student_id", p), "Charges") || []);
    const pays = await chunked<any>(sids, 150, async (p) => must(await db.from("fee_payments").select("id,student_id,receipt_year,pay_date,amount,void").in("student_id", p), "Payments") || []);
    const payIds = pays.filter((p: any) => !p.void).map((p: any) => p.id);
    const allocs = await chunked<any>(payIds, 150, async (p) => must(await db.from("fee_payment_allocations").select("payment_id,academic_year,fee_type_code,amount").in("payment_id", p), "Allocations") || []);
    const contacts = await chunked<any>(uuids, 150, async (p) => must(await db.from("fu_contacts").select("*").in("student_uuid", p).order("created_at", { ascending: false }), "Contacts") || []);
    const holds = await chunked<any>(uuids, 150, async (p) => must(await db.from("fu_holds").select("*").in("student_uuid", p).eq("active", true), "Holds") || []);
    const overrides = await chunked<any>(uuids, 150, async (p) => must(await db.from("fu_overrides").select("*").in("student_uuid", p).eq("active", true), "Overrides") || []);
    const restr = await chunked<any>(uuids, 150, async (p) => must(await db.from("fu_restrictions").select("*").in("student_uuid", p).in("status", ["proposed", "authorised"]).order("proposed_at", { ascending: false }), "Restrictions") || []);

    const by = <T>(rows: any[], key: string) => { const m: Record<string, any[]> = {}; for (const r of rows) (m[S(r[key])] ??= []).push(r); return m; };
    const cBy = by(charges, "student_id"), pBy = by(pays, "student_id"), kBy = by(contacts, "student_uuid"),
      hBy = by(holds, "student_uuid"), oBy = by(overrides, "student_uuid"), rBy = by(restr, "student_uuid");
    const aByPay = by(allocs, "payment_id");

    return studs.map((s: any) => {
      const sid = S(s.student_id), uid = S(s.student_uuid);
      const myPays = pBy[sid] || [];
      const myAllocs = myPays.flatMap((p: any) => aByPay[S(p.id)] || []);
      const account = buildAccount({ charges: cBy[sid] || [], payments: myPays, allocs: myAllocs }, year);
      const cs = kBy[uid] || [], lastContact = cs[0] || null;
      const hold = (hBy[uid] || []).sort((a, b) => S(b.hold_until).localeCompare(S(a.hold_until)))[0] || null;
      const ov = (oBy[uid] || [])[0] || null;
      const rs = (rBy[uid] || [])[0] || null;
      const ev: Evaluation = evaluate({
        today: t, cls: classCode, policy, account, payments: myPays,
        allocs: myAllocs, lastContact, hold, override: ov ? { action: ov.action, teacher_note: ov.teacher_note, expires_on: ov.expires_on } : null,
      });
      const restriction = rs ? { status: rs.status, scope: rs.scope || [] } : null;
      const referred = !!lastContact?.referred;
      if (!internal) return teacherView(s, classCode, ev, { lastContact, restriction, referred });
      // ---- ADMIN-ONLY projection (amounts allowed) ----
      return {
        ...teacherView(s, classCode, ev, { lastContact, restriction, referred }),
        admin: {
          minimum: ev.internal.minimum, paidInWindow: ev.internal.paidInWindow, outstanding: ev.internal.outstanding,
          priorityBalance: ev.internal.priorityBalance, deferrableBalance: ev.internal.deferrableBalance, byCode: ev.internal.byCode,
          reasonCode: ev.reasonCode, substantialOn: ev.internal.substantialOn,
          hold: hold ? { until: hold.hold_until, reason: hold.reason, id: hold.id } : null,
          override: ov ? { id: ov.id, action: ov.action, reason: ov.reason, expiresOn: ov.expires_on, teacherNote: ov.teacher_note } : null,
          restriction: rs ? { id: rs.id, status: rs.status, scope: rs.scope, reason: rs.reason } : null,
        },
      };
    });
  }
  const summarize = (rows: any[]) => {
    const c = { total: rows.length, needsAttention: 0, met: 0, onHold: 0, verify: 0, referred: 0, priority: 0 };
    for (const r of rows) {
      if (r.requirement === "MET") c.met++; else if (r.requirement === "HOLD") c.onHold++; else if (r.requirement === "VERIFY") c.verify++;
      if (["FOLLOW_UP", "PRIORITY_FOLLOW_UP", "REFER_ADMIN"].includes(r.action)) c.needsAttention++;
      if (r.referred) c.referred++; if (r.priority) c.priority++;
    }
    return c;
  };

  // ===================================================================== handlers
  const H: Record<string, (a: any[], who: any) => Promise<any>> = {
    /** Who am I for this module? (drives menu + page mode). Never returns financial data. */
    async fuWhoAmI(_a, who) {
      const admin = isAdmin(who), asg = await myAssignment(who);
      return { isAdmin: admin, classCode: asg?.class_code || null, classLabel: asg ? classLabel(asg.class_code) : null, phase: phaseFor(today(), await loadPolicy()) };
    },

    // ---------- in-charge assignment (Management only) ----------
    async fuListAssignments(_a, who) {
      requireAdmin(who);
      const year = await currentYear();
      const enr = must(await db.from("student_enrollments").select("class").eq("academic_year", year), "Classes") || [];
      const found = new Set<string>(enr.map((e: any) => normClass(e.class)).filter(Boolean));
      const classes = sortClasses([...new Set([...STANDARD_CLASSES, ...found])]).filter((c) => classWeight(c) < 999);
      const rows = must(await db.from("class_incharge").select("*").eq("active", true), "Assignments") || [];
      const users = must(await db.from("users").select("id,name,role,is_active").eq("is_active", true).in("role", ELIGIBLE_ROLES), "Staff") || [];
      const byClass: Record<string, any> = {}; for (const r of rows) byClass[r.class_code] = r;
      return {
        classes: classes.map((c) => ({ code: c, label: classLabel(c), incharge: byClass[c] ? { userId: byClass[c].user_id, name: byClass[c].user_name, since: byClass[c].assigned_at, note: byClass[c].note } : null })),
        staff: users.map((u: any) => ({ id: u.id, name: u.name, role: u.role, classCode: rows.find((r: any) => r.user_id === u.id)?.class_code || null }))
          .sort((a: any, b: any) => S(a.name).localeCompare(S(b.name))),
      };
    },
    async fuAssignIncharge(a, who) {
      requireAdmin(who);
      const classCode = normClass(a[0]), userId = Number(a[1]), note = clip(a[2], 300);
      if (!STANDARD_CLASSES.includes(classCode)) throw new Error("Unknown class.");
      const u = must(await db.from("users").select("id,name,role,is_active").eq("id", userId).maybeSingle(), "User");
      if (!u || u.is_active === false || !ELIGIBLE_ROLES.includes(u.role)) throw new Error("This staff member is not eligible to be a class in-charge.");
      const now = new Date().toISOString();
      const cur = must(await db.from("class_incharge").select("*").eq("class_code", classCode).eq("active", true), "Current") || [];
      if (cur.some((r: any) => r.user_id === u.id)) throw new Error(`${u.name} is already the in-charge of ${classLabel(classCode)}.`);
      const own = must(await db.from("class_incharge").select("*").eq("user_id", u.id).eq("active", true), "Current") || [];
      for (const r of [...cur, ...own]) {
        must(await db.from("class_incharge").update({ active: false, ended_at: now, ended_by: S(who.name), end_reason: r.class_code === classCode ? "Reassigned" : "Moved to " + classLabel(classCode) }).eq("id", r.id), "End previous");
      }
      const ins = must(await db.from("class_incharge").insert({ class_code: classCode, user_id: u.id, user_name: u.name, is_primary: true, active: true, assigned_by: S(who.name), note: note || null }).select().single(), "Assign");
      await audit(who, "ASSIGN_INCHARGE", "class_incharge", ins?.id, { previous: [...cur, ...own].map((r: any) => ({ class: r.class_code, user: r.user_name })) }, { class: classCode, user: u.name, note });
      return { ok: true };
    },
    async fuRemoveIncharge(a, who) {
      requireAdmin(who);
      const classCode = normClass(a[0]), reason = clip(a[1], 300);
      if (!reason) throw new Error("A reason is required.");
      const cur = must(await db.from("class_incharge").select("*").eq("class_code", classCode).eq("active", true), "Current") || [];
      if (!cur.length) throw new Error("This class has no in-charge.");
      must(await db.from("class_incharge").update({ active: false, ended_at: new Date().toISOString(), ended_by: S(who.name), end_reason: reason }).eq("class_code", classCode).eq("active", true), "Remove");
      await audit(who, "REMOVE_INCHARGE", "class_incharge", classCode, { user: cur[0].user_name }, { reason });
      return { ok: true };
    },
    async fuInchargeHistory(a, who) {
      requireAdmin(who);
      const classCode = S(a[0]) ? normClass(a[0]) : "";
      let q = db.from("class_incharge").select("*").order("assigned_at", { ascending: false }); if (classCode) q = q.eq("class_code", classCode);
      return (must(await q, "History") || []).slice(0, 200).map((r: any) => ({ classLabel: classLabel(r.class_code), name: r.user_name, active: r.active, assignedBy: r.assigned_by, assignedAt: r.assigned_at, endedBy: r.ended_by, endedAt: r.ended_at, endReason: r.end_reason, note: r.note }));
    },

    // ---------- teacher: own class only ----------
    async fuMyClass(_a, who) {
      const asg = await myAssignment(who);
      if (!asg) throw new Error("You are not assigned as a class in-charge.");
      const rows = await evaluateClass(asg.class_code, false);       // class comes from the server, never from the request
      return { classLabel: classLabel(asg.class_code), summary: summarize(rows), students: rows };
    },
    async fuLogContact(a, who) {
      const p = a[0] || {}, uuid = S(p.studentUuid);
      const asg = await myAssignment(who);
      let classCode = asg?.class_code;
      if (isAdmin(who) && !classCode) {
        const e = must(await db.from("student_enrollments").select("class").eq("academic_year", await currentYear()).eq("student_uuid", uuid).order("id", { ascending: false }).limit(1), "Enrollment") || [];
        classCode = e[0]?.class;
      }
      if (!classCode) throw new Error("You are not assigned as a class in-charge.");
      const year = await currentYear();
      const e = must(await db.from("student_enrollments").select("class,enrollment_type,leaving_date").eq("academic_year", year).eq("student_uuid", uuid).order("id", { ascending: false }).limit(1), "Enrollment") || [];
      if (!e[0] || S(e[0].class) !== S(classCode) || enrInactive(e[0])) throw new Error("This student is not in your class.");
      const outcome = S(p.outcome).toUpperCase(); if (!OUTCOMES.includes(outcome)) throw new Error("Choose a valid outcome.");
      const on = isIso(p.contactedOn) ? S(p.contactedOn) : today(); if (on > today()) throw new Error("Contact date cannot be in the future.");
      const promised = S(p.promisedOn) ? (isIso(p.promisedOn) ? S(p.promisedOn) : (() => { throw new Error("Promised date is not valid."); })()) : null;
      if (outcome === "PROMISED" && !promised) throw new Error("Enter the promised payment date.");
      const u = await userByName(S(who.name));
      const row = { student_uuid: uuid, class_code: classCode, academic_year: year, contacted_on: on, outcome, response: clip(p.response, 300) || null, promised_on: promised, remark: clip(p.remark, 500) || null, referred: outcome === "REFERRED" || !!p.referred, created_by: S(who.name), created_by_id: u?.id ?? null };
      const ins = must(await db.from("fu_contacts").insert(row).select().single(), "Save contact");
      await audit(who, row.referred ? "REFER_TO_ADMIN" : "LOG_CONTACT", "fu_contacts", ins?.id, null, { student: uuid, outcome, promised, referred: row.referred });
      return { ok: true };
    },
    async fuContactHistory(a, who) {
      const uuid = S(a[0]); const asg = await myAssignment(who);
      if (!isAdmin(who)) {
        const e = must(await db.from("student_enrollments").select("class").eq("academic_year", await currentYear()).eq("student_uuid", uuid).order("id", { ascending: false }).limit(1), "Enrollment") || [];
        if (!asg || !e[0] || S(e[0].class) !== S(asg.class_code)) throw new Error("This student is not in your class.");
      }
      return (must(await db.from("fu_contacts").select("contacted_on,outcome,response,promised_on,remark,referred,created_by,created_at").eq("student_uuid", uuid).order("created_at", { ascending: false }), "History") || []).slice(0, 50);
    },

    // ---------- admin: all classes, full detail, configuration ----------
    async fuAdminClass(a, who) {
      requireAdmin(who);
      const classCode = normClass(a[0]); if (!STANDARD_CLASSES.includes(classCode)) throw new Error("Unknown class.");
      const rows = await evaluateClass(classCode, true);
      const inc = must(await db.from("class_incharge").select("user_name").eq("class_code", classCode).eq("active", true).maybeSingle(), "In-charge");
      return { classLabel: classLabel(classCode), incharge: inc?.user_name || null, summary: summarize(rows), students: rows };
    },
    async fuAdminOverview(_a, who) {
      requireAdmin(who);
      const out: any[] = [];
      for (const c of STANDARD_CLASSES) { const rows = await evaluateClass(c, false); out.push({ code: c, label: classLabel(c), ...summarize(rows) }); }
      const asg = must(await db.from("class_incharge").select("class_code,user_name").eq("active", true), "In-charge") || [];
      return out.map((o) => ({ ...o, incharge: asg.find((x: any) => x.class_code === o.code)?.user_name || null }));
    },
    async fuGetPolicy(_a, who) { requireAdmin(who); return await loadPolicy(); },
    async fuSavePolicy(a, who) {
      requireAdmin(who);
      const prev = await loadPolicy(); const next = validatePolicy(a[0]);
      must(await db.from("fu_settings").upsert({ key: "policy", value: next, updated_by: S(who.name), updated_at: new Date().toISOString() }, { onConflict: "key" }), "Save policy");
      await audit(who, "SAVE_POLICY", "fu_settings", "policy", prev, next);
      return next;
    },
    async fuSetHold(a, who) {
      requireAdmin(who);
      const uuid = S(a[0]), until = S(a[1]), reason = clip(a[2], 300);
      if (!isIso(until) || until < today()) throw new Error("Choose a hold end date that is today or later.");
      if (!reason) throw new Error("A reason is required.");
      must(await db.from("fu_holds").update({ active: false, cleared_by: S(who.name), cleared_at: new Date().toISOString() }).eq("student_uuid", uuid).eq("active", true), "Clear old hold");
      const ins = must(await db.from("fu_holds").insert({ student_uuid: uuid, hold_until: until, reason, set_by: S(who.name) }).select().single(), "Hold");
      await audit(who, "SET_HOLD", "fu_holds", ins?.id, null, { student: uuid, until, reason });
      return { ok: true };
    },
    async fuClearHold(a, who) {
      requireAdmin(who);
      const uuid = S(a[0]);
      must(await db.from("fu_holds").update({ active: false, cleared_by: S(who.name), cleared_at: new Date().toISOString() }).eq("student_uuid", uuid).eq("active", true), "Clear hold");
      await audit(who, "CLEAR_HOLD", "fu_holds", uuid, null, { student: uuid });
      return { ok: true };
    },
    async fuSetOverride(a, who) {
      requireAdmin(who);
      const uuid = S(a[0]), action = S(a[1]).toUpperCase(), reason = clip(a[2], 300), note = clip(a[3], 160), exp = S(a[4]);
      if (!ACTIONS.includes(action as any) || action === "VERIFY") throw new Error("Choose a valid action.");
      if (!reason) throw new Error("A reason is required for an override.");
      if (exp && !isIso(exp)) throw new Error("Expiry date is not valid.");
      must(await db.from("fu_overrides").update({ active: false, cleared_by: S(who.name), cleared_at: new Date().toISOString() }).eq("student_uuid", uuid).eq("active", true), "Clear old override");
      const ins = must(await db.from("fu_overrides").insert({ student_uuid: uuid, action, reason, teacher_note: note || null, expires_on: exp || null, set_by: S(who.name) }).select().single(), "Override");
      await audit(who, "SET_OVERRIDE", "fu_overrides", ins?.id, null, { student: uuid, action, reason, exp });
      return { ok: true };
    },
    async fuClearOverride(a, who) {
      requireAdmin(who);
      const uuid = S(a[0]);
      must(await db.from("fu_overrides").update({ active: false, cleared_by: S(who.name), cleared_at: new Date().toISOString() }).eq("student_uuid", uuid).eq("active", true), "Clear override");
      await audit(who, "CLEAR_OVERRIDE", "fu_overrides", uuid, null, { student: uuid });
      return { ok: true };
    },

    // ---------- restriction workflow: ONLY an administrator can propose / authorise ----------
    async fuProposeRestriction(a, who) {
      requireAdmin(who);
      const uuid = S(a[0]), scope = (Array.isArray(a[1]) ? a[1] : []).map(S).filter((x: string) => SCOPES.includes(x)), reason = clip(a[2], 300);
      if (!scope.length) throw new Error("Choose at least one restriction scope."); if (!reason) throw new Error("A reason is required.");
      const e = must(await db.from("student_enrollments").select("class").eq("academic_year", await currentYear()).eq("student_uuid", uuid).order("id", { ascending: false }).limit(1), "Enrollment") || [];
      if (!e[0]) throw new Error("Student not found.");
      const ins = must(await db.from("fu_restrictions").insert({ student_uuid: uuid, class_code: e[0].class, scope, reason, status: "proposed", proposed_by: S(who.name) }).select().single(), "Propose");
      await audit(who, "PROPOSE_RESTRICTION", "fu_restrictions", ins?.id, null, { student: uuid, scope, reason });
      return { ok: true };
    },
    async fuDecideRestriction(a, who) {
      requireAdmin(who);
      const id = Number(a[0]), decision = S(a[1]).toLowerCase(), why = clip(a[2], 300);
      if (!["authorised", "rejected", "lifted"].includes(decision)) throw new Error("Choose authorise, reject or lift.");
      if (!why) throw new Error("A reason is required for the decision.");
      const r = must(await db.from("fu_restrictions").select("*").eq("id", id).maybeSingle(), "Restriction");
      if (!r) throw new Error("Restriction not found.");
      const ok = (decision === "lifted" && r.status === "authorised") || (decision !== "lifted" && r.status === "proposed");
      if (!ok) throw new Error(`A ${r.status} restriction cannot be ${decision}.`);
      must(await db.from("fu_restrictions").update({ status: decision, decided_by: S(who.name), decided_at: new Date().toISOString(), decision_reason: why }).eq("id", id), "Decide");
      await audit(who, "RESTRICTION_" + decision.toUpperCase(), "fu_restrictions", id, { status: r.status }, { status: decision, why });
      return { ok: true };
    },
    async fuAdminActivity(a, who) {
      requireAdmin(who);
      const contacts = must(await db.from("fu_contacts").select("student_uuid,class_code,contacted_on,outcome,promised_on,referred,created_by,created_at").order("created_at", { ascending: false }), "Activity") || [];
      const audits = must(await db.from("audit_logs").select("ts,user_name,action,entity,entity_id,new_value").eq("module", "FeeFollowUp").order("ts", { ascending: false }), "Audit") || [];
      return { contacts: contacts.slice(0, 200).map((c: any) => ({ ...c, classLabel: classLabel(c.class_code) })), audit: audits.slice(0, 200) };
    },
  };
  return { handlers: H, _internal: { evaluateClass, myAssignment, loadPolicy } };
}

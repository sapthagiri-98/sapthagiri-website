// In-memory TEST DOUBLE of the supabase-js calls used by followup-service. Never talks to a real project.
export type Row = Record<string, any>
export function makeFuDb(seed: Record<string, Row[]> = {}) {
  const tables: Record<string, Row[]> = {}
  for (const t of ['users','students','student_enrollments','fee_settings','fee_charges','fee_payments','fee_payment_allocations','class_incharge','fu_settings','fu_holds','fu_overrides','fu_contacts','fu_restrictions','audit_logs']) tables[t] = []
  for (const [k, v] of Object.entries(seed)) tables[k] = v.map((r) => ({ ...r }))
  const state = { id: 1000, audits: [] as any[], writes: [] as string[], failAudit: false }
  class Q {
    f: Array<(r: Row) => boolean> = []; op = 'select'; payload: any; lim = 0; one: '' | 'single' | 'maybe' = ''; ord: [string, boolean] | null = null
    constructor(public t: string) {}
    select(_c?: string) { return this }
    insert(p: any) { this.op = 'insert'; this.payload = p; return this }
    update(p: any) { this.op = 'update'; this.payload = p; return this }
    upsert(p: any, o?: any) { this.op = 'upsert'; this.payload = p; (this as any).oc = o?.onConflict; return this }
    eq(k: string, v: any) { this.f.push((r) => r[k] === v); return this }
    in(k: string, vs: any[]) { this.f.push((r) => vs.includes(r[k])); return this }
    order(k: string, o?: any) { this.ord = [k, !!(o && o.ascending === false)]; return this }
    limit(n: number) { this.lim = n; return this }
    single() { this.one = 'single'; return this }
    maybeSingle() { this.one = 'maybe'; return this }
    then(res: any, rej?: any) { return this.exec().then(res, rej) }
    async exec(): Promise<any> {
      const rows = tables[this.t]
      if (this.op !== 'select') state.writes.push(this.op + ':' + this.t)
      if (this.op === 'insert') {
        const arr = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((p: Row) => ({ id: ++state.id, ...(['fu_holds','fu_overrides'].includes(this.t) ? { active: true } : {}), ...(this.t === 'fu_restrictions' ? { status: 'proposed' } : {}), created_at: new Date(++state.id).toISOString(), proposed_at: new Date(state.id).toISOString(), ...p }))
        // unique-index emulation for class_incharge
        if (this.t === 'class_incharge') for (const n of arr) {
          if (n.active && n.is_primary && rows.some((r) => r.active && r.is_primary && r.class_code === n.class_code)) return { data: null, error: { message: 'duplicate key uq_class_incharge_active_primary' } }
          if (n.active && rows.some((r) => r.active && r.user_id === n.user_id)) return { data: null, error: { message: 'duplicate key uq_class_incharge_active_user' } }
        }
        rows.push(...arr); return { data: this.one ? arr[0] : arr, error: null }
      }
      const m = rows.filter((r) => this.f.every((f) => f(r)))
      if (this.op === 'update') { m.forEach((r) => Object.assign(r, this.payload)); return { data: m, error: null } }
      if (this.op === 'upsert') { const k = (this as any).oc || 'id'; const ex = rows.find((r) => r[k] === this.payload[k]); if (ex) Object.assign(ex, this.payload); else rows.push({ ...this.payload }); return { data: null, error: null } }
      let out = m.map((r) => ({ ...r }))
      if (this.ord) { const [k, desc] = this.ord; out.sort((a, b) => (String(a[k] ?? '') < String(b[k] ?? '') ? -1 : 1) * (desc ? -1 : 1)) }
      if (this.lim) out = out.slice(0, this.lim)
      return { data: this.one ? out[0] ?? null : out, error: null }
    }
  }
  const db: any = {
    from: (t: string) => new Q(t),
    rpc: async (fn: string, a: any) => {
      if (fn !== 'audit') return { data: null, error: { message: 'unknown rpc' } }
      if (state.failAudit) return { error: { message: 'audit down' } }
      state.audits.push(a); tables.audit_logs.push({ ts: new Date().toISOString(), user_name: a.p_user, action: a.p_action, entity: a.p_entity, entity_id: a.p_entity_id, new_value: a.p_new, module: a.p_module }); return { error: null }
    },
  }
  return { db, tables, state }
}

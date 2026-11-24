// Minimal in-memory stand-in for the parts of supabase-js the Spoken English service uses.
// It is a TEST DOUBLE — nothing here talks to a real Supabase project.
export type Row = Record<string, any>
type Hook = (op: string, table: string, payload: any) => { message: string } | undefined

export function makeDb(opts: { yieldEvery?: () => Promise<void> } = {}) {
  const tables: Record<string, Row[]> = { syllabus_lessons: [], syllabus_session_tasks: [], syllabus_lesson_progress: [] }
  const files = new Map<string, Uint8Array>()
  const buckets = new Set<string>()
  const state = { nextId: 1, hook: undefined as Hook | undefined, log: [] as string[] }
  const tick = opts.yieldEvery || (async () => {})

  const like = (v: any, pat: string) => new RegExp('^' + pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$', 'i').test(String(v ?? ''))

  class Q {
    f: Array<(r: Row) => boolean> = []; op = 'select'; payload: any; lim = 0; one = false
    constructor(public t: string) {}
    select(_c?: string) { return this }
    insert(p: any) { this.op = 'insert'; this.payload = p; return this }
    update(p: any) { this.op = 'update'; this.payload = p; return this }
    delete() { this.op = 'delete'; return this }
    upsert(p: any) { this.op = 'upsert'; this.payload = p; return this }
    eq(k: string, v: any) { this.f.push((r) => r[k] === v); return this }
    in(k: string, vs: any[]) { this.f.push((r) => vs.includes(r[k])); return this }
    ilike(k: string, pat: string) { this.f.push((r) => like(r[k], pat)); return this }
    like(k: string, pat: string) { this.f.push((r) => like(r[k], pat)); return this }
    limit(n: number) { this.lim = n; return this }
    range() { return this }
    order() { return this }
    single() { this.one = true; return this }
    then(res: any, rej?: any) { return this.exec().then(res, rej) }
    async exec(): Promise<any> {
      await tick()
      const err = state.hook?.(this.op, this.t, this.payload)
      if (err) return { data: null, error: err }
      const rows = tables[this.t]
      const m = rows.filter((r) => this.f.every((f) => f(r)))
      if (this.op === 'insert') {
        const arr = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((p: Row) => ({ ...(this.t === 'syllabus_lessons' ? { id: state.nextId++ } : {}), ...p }))
        rows.push(...arr)
        await tick()
        return { data: this.one ? arr[0] : arr, error: null }
      }
      if (this.op === 'update') { m.forEach((r) => Object.assign(r, this.payload)); return { data: m, error: null } }
      if (this.op === 'delete') { tables[this.t] = rows.filter((r) => !m.includes(r)); return { data: null, error: null } }
      if (this.op === 'upsert') { rows.push({ ...this.payload }); return { data: null, error: null } }
      const out = this.lim ? m.slice(0, this.lim) : m
      return { data: this.one ? out[0] : out.map((r) => ({ ...r })), error: null }
    }
  }

  const BASE = 'https://test.supabase.co/storage/v1/object/public/'
  const db: any = {
    from: (t: string) => new Q(t),
    storage: {
      getBucket: async (b: string) => ({ data: buckets.has(b) ? { id: b } : null }),
      createBucket: async (b: string) => { buckets.add(b); return { error: null } },
      from: (b: string) => ({
        getPublicUrl: (p: string) => ({ data: { publicUrl: BASE + b + '/' + p } }),
        upload: async (p: string, bytes: Uint8Array) => {
          if (state.hook?.('upload', 'storage', p)) return { error: { message: 'simulated upload failure' } }
          if (files.has(b + '/' + p)) return { error: { message: 'The resource already exists' } }
          files.set(b + '/' + p, bytes); return { error: null }
        },
        list: async (folder: string, o: { search?: string } = {}) => ({
          data: [...files.keys()].filter((k) => k.startsWith(b + '/' + folder + '/')).map((k) => k.split('/').pop()!)
            .filter((n) => !o.search || n.includes(o.search)).map((name) => ({ name })), error: null,
        }),
        remove: async (paths: string[]) => { paths.forEach((p) => files.delete(b + '/' + p)); return { error: null } },
      }),
    },
  }
  return { db, tables, files, state, BASE: BASE + 'spoken-english-pdfs/', snapshot: () => JSON.stringify(tables) }
}

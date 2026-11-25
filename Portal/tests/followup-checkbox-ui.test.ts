// Dashboard + menu respect the Fee Follow-up permission checkbox and the in-charge check (jsdom, mocked fetch).
import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs'
const tick = () => new Promise((r) => setTimeout(r, 30))
const w: any = window
async function dash(perms: any, whoami: any) {
  sessionStorage.clear()
  sessionStorage.setItem('pv2_session', JSON.stringify({ name: 'Padmaja', role: 'Teacher', token: 't', permissions: perms }))
  document.body.innerHTML = '<div id="view"></div><div id="nav"></div><div id="mobileNav"></div>'
  w.fetch = async (_u: string, o: any) => { const b = JSON.parse(o.body); return { text: async () => JSON.stringify(b.fn === 'fuWhoAmI' ? { ok: true, data: whoami } : { ok: true, data: [] }) } }
  new Function('window', 'document', fs.readFileSync('config.js', 'utf8') + '\n' + fs.readFileSync('portal.js', 'utf8'))(w, document)
  new Function('window', 'document', fs.readFileSync('dashboard.js', 'utf8'))(w, document)
  await tick(); await tick()
  return document.getElementById('view')!.textContent!
}
describe('Fee Follow-up visibility', () => {
  it('shown for an in-charge', async () => expect(await dash({}, { classCode: 'Nursery' })).toContain('Fee Follow-up'))
  it('hidden for a non-in-charge', async () => expect(await dash({}, { classCode: null })).not.toContain('Fee Follow-up'))
  it('hidden when the checkbox is OFF even for an in-charge', async () => expect(await dash({ 'Fee Follow-up': false }, { classCode: 'Nursery' })).not.toContain('Fee Follow-up'))
  it('shown when the checkbox is ON and in-charge', async () => expect(await dash({ 'Fee Follow-up': true }, { classCode: 'Nursery' })).toContain('Fee Follow-up'))
})
describe('User Management lists the checkbox', () => {
  it('adds "Fee Follow-up" under Teacher-only when the server list lacks it', async () => {
    document.body.innerHTML = ''
    const src = fs.readFileSync('user-management.js', 'utf8')
    expect(src).toMatch(/key: "Fee Follow-up",\s+group: "teacherOnly"/)
  })
})

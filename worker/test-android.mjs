// Android companion (src=android): only ever raises a day's count; recorded under st.android.
import assert from 'node:assert';
import worker from './src/index.js';
console.log = () => {};
class KV { constructor() { this.m = new Map(); }
  async get(k) { return this.m.has(k) ? this.m.get(k) : null; } async put(k, v) { this.m.set(k, v); } async delete(k) { this.m.delete(k); }
  async list({ prefix = '' } = {}) { return { keys: [...this.m.keys()].filter(k => k.startsWith(prefix)).sort().map(name => ({ name })), list_complete: true }; } }
const env = { PH: new KV(), APP_URL: 'x', VAPID_PUBLIC_KEY: 'x' };
let fake = Date.parse('2026-10-10T15:00:00-07:00'); Date.now = () => fake;
const call = async (path, body) => { const r = await worker.fetch(new Request('https://w.test' + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}), env); const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; } return { status: r.status, body: j }; };
const C = (await call('/claim', {})).body.code;
let r = await call('/sync', { code: C, steps: 4200, src: 'android', date: '2026-10-10', app: 'android-0.1.0' });
assert.equal(r.status, 200); assert.equal(r.body.steps, 4200); assert.equal(r.body.state.android.lastSteps, 4200); assert.equal(r.body.state.android.app, 'android-0.1.0');
r = await call('/sync', { code: C, steps: 3000, src: 'android' }); // a lower reading never lowers the day
assert.equal(r.body.steps, 4200); assert.match(r.body.state.syncLog[0].reason, /kept 4200/);
r = await call('/sync', { code: C, steps: 9100, src: 'android' }); assert.equal(r.body.steps, 9100);
r = await call(`/sync?code=${C}&src=garmin&steps=8000`); // Garmin can't lower below what Android already banked either (Garmin keeps max of its own reports, but stored = its value)
r = await call('/sync', { code: C, steps: 9500, src: 'android' }); assert.equal(r.body.steps, 9500);
r = await call('/sync', { code: C, steps: 10, src: 'android', dry: 1 }); assert.equal(r.body.dry, true);
assert.equal((await call(`/state?code=${C}`)).body.todaySteps, 9500);
console.error('android ok');

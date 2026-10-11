// Blank steps= (Shortcut Sum empty early in the day) = valid 0-step sync that never lowers; missing steps param = still rejected.
import assert from 'node:assert';
import worker from './src/index.js';
console.log = () => {};
class KV { constructor() { this.m = new Map(); }
  async get(k) { return this.m.has(k) ? this.m.get(k) : null; } async put(k, v) { this.m.set(k, v); } async delete(k) { this.m.delete(k); }
  async list({ prefix = '' } = {}) { return { keys: [...this.m.keys()].filter(k => k.startsWith(prefix)).sort().map(name => ({ name })), list_complete: true }; } }
const env = { PH: new KV(), APP_URL: 'x', VAPID_PUBLIC_KEY: 'x' };
let fake = Date.parse('2026-10-11T00:20:00-07:00'); Date.now = () => fake;
const call = async (path, body) => { const r = await worker.fetch(new Request('https://w.test' + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}), env); const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; } return { status: r.status, body: j }; };
const C = (await call('/claim', {})).body.code;
const st = async () => (await call(`/state?code=${C}`)).body;
// 12:20 AM, no samples yet: "&steps=" (GET, how the Shortcut calls it) -> 200, 0 steps, logged ok
let r = await call(`/sync?code=${C}&steps=`); assert.equal(r.status, 200); assert.match(r.body, /Got 0 steps/);
let s = await st(); assert.equal(s.todaySteps, 0); assert.equal(s.syncLog[0].ok, true); assert.match(s.syncLog[0].reason, /counted as 0/); assert.ok(s.lastSync);
r = await call(`/sync?code=${C}&steps=%20%20`); assert.equal(r.status, 200);                          // whitespace
r = await call('/sync', { code: C, steps: '' }); assert.equal(r.status, 200); assert.equal(r.body.steps, 0); // JSON blank
r = await call('/sync', { code: C, steps: null }); assert.equal(r.status, 200);                         // JSON null
// later a real count, then an empty one never lowers it
r = await call(`/sync?code=${C}&steps=2500`); assert.equal((await st()).todaySteps, 2500);
r = await call(`/sync?code=${C}&steps=`); assert.equal(r.status, 200); assert.match(r.body, /Got 2,500 steps/);
s = await st(); assert.equal(s.todaySteps, 2500); assert.match(s.syncLog[0].reason, /kept 2500/);
// a normal lower number still behaves as before (latest wins with no Garmin report)
r = await call(`/sync?code=${C}&steps=2400`); assert.equal((await st()).todaySteps, 2400);
// no steps param at all: still rejected, nothing stored
r = await call(`/sync?code=${C}`); assert.equal(r.status, 400); assert.match(r.body.reason, /steps missing/);
r = await call('/sync', { code: C }); assert.equal(r.status, 400); assert.equal(r.body.error, 'steps missing or weird');
r = await call(`/sync?code=${C}&steps=abc`); assert.equal(r.status, 400);                              // garbage still rejected
assert.equal((await st()).todaySteps, 2400);
console.error('✓ empty steps= (0, never lowers; missing param still rejected)');

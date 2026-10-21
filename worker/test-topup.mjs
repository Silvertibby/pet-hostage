// v0.6.5: longer sync log, morning top-up of yesterday, Garmin never lowers, blank/0 never lowers
import assert from 'node:assert';
import worker from './src/index.js';
console.log = () => {};
class KV { constructor() { this.m = new Map(); this.puts = 0; } async get(k) { return this.m.has(k) ? this.m.get(k) : null; } async put(k, v) { this.puts++; this.m.set(k, v); } async delete(k) { this.m.delete(k); }
  async list({ prefix = '' } = {}) { return { keys: [...this.m.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; } }
const env = { PH: new KV(), APP_URL: 'x', VAPID_PUBLIC_KEY: 'x' };
let fake = Date.parse('2026-10-09T12:00:00-07:00'); Date.now = () => fake; const at = i => { fake = Date.parse(i); };
const call = async (path, body) => { const r = await worker.fetch(new Request('https://w.test' + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}), env); return { status: r.status, body: await r.json().catch(() => null) }; };
const st = async c => { const v = (await call('/state?code=' + c)).body; return { ...JSON.parse(await env.PH.get('player:' + c)), ...v }; };
const A = (await call('/claim', {})).body.code;
const sync = (q, b) => call(`/sync?code=${A}&${q}`, b || {});
// Oct 9 met (14000) -> Oct 10 missed (9000 at midnight)
await sync('steps=14000'); at('2026-10-10T12:00:00-07:00'); await sync('steps=9000');
at('2026-10-11T00:30:00-07:00'); let s = await st(A);
assert.equal(s.hostage.streak, 0); assert.equal(s.stats.missedDays, 1); assert.equal(s.deathCount, 1); assert.equal(s.bank, 0);
// blank / 0 never lower; a lower past-day value never lowers
await sync('steps='); await sync('steps=0'); s = await st(A); assert.equal(s.todaySteps, 0);
await sync('steps=8000&date=2026-10-10'); s = await st(A); assert.equal(s.syncLog[0].steps, 9000);
// morning top-up crosses the goal: death undone, day re-settled as made, +earn
await sync('steps=50&yesterday=12500'); s = await st(A);
assert.equal(s.hostage.streak, 2, 'streak restored + made'); assert.equal(s.deathCount, 0); assert.equal(s.stats.missedDays, 0); assert.equal(s.stats.metDays, 2);
assert.equal(s.bank, 4000 + 2500); assert.ok(!s.bankLog.some(e => e.kind === 'reset')); assert.equal(s.todaySteps, 50);
assert.ok(s.syncLog[0].reason.includes('12500'));
// already made: a further top-up only adds Spare Steps; never lowers
await sync('steps=60&yesterday=13000'); s = await st(A); assert.equal(s.bank, 7000); assert.equal(s.hostage.streak, 2);
await sync('steps=70&yesterday=11000'); s = await st(A); assert.equal(s.bank, 7000);
// after 10 AM: ignored
at('2026-10-11T10:30:00-07:00'); await sync('steps=80&yesterday=20000'); s = await st(A); assert.equal(s.bank, 7000);
// Garmin never lowers a higher shortcut count
await sync('steps=9000'); await sync('steps=700&src=garmin'); s = await st(A); assert.equal(s.todaySteps, 9000);
await sync('steps=9500&src=garmin'); s = await st(A); assert.equal(s.todaySteps, 9500);
await sync('steps=9500'); s = await st(A); assert.equal(s.syncLog[0].same, true, 'not higher -> flagged');
// sync log: 50 kept + last of each of 7 days, all in the player record
for (let i = 0; i < 60; i++) await sync('steps=' + (9600 + i));
s = await st(A); assert.ok(s.syncLog.length >= 50 && s.syncLog.length <= 57);
assert.ok(s.syncLog.some(e => e.date === '2026-10-09'), 'older day kept');
const ks = [...env.PH.m.keys()]; assert.ok(!ks.some(k => /log/.test(k)), 'no new keys');
process.stdout.write('✓ v0.6.5 top-up (re-settle, earn, raise-only, 10 AM cutoff), Garmin never lowers, blank/0 safe, 50+7-day sync log\n');

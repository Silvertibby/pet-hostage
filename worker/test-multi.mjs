// Multi-player integration sim: the real Worker against an in-memory KV, with a fake clock.
import assert from 'node:assert';
import worker, { _resetLegacyFlag } from './src/index.js';
const silent = console.log; console.log = () => {};
class KV { constructor() { this.m = new Map(); }
  async get(k) { return this.m.has(k) ? this.m.get(k) : null; } async put(k, v) { this.m.set(k, v); } async delete(k) { this.m.delete(k); }
  async list({ prefix = '' } = {}) { return { keys: [...this.m.keys()].filter(k => k.startsWith(prefix)).sort().map(name => ({ name })), list_complete: true }; } }
const env = { PH: new KV(), APP_URL: 'x', VAPID_PUBLIC_KEY: 'x' };
const realNow = Date.now; let fake = Date.parse('2026-10-09T20:00:00-07:00'); Date.now = () => fake;
const at = iso => { fake = Date.parse(iso); };
const W = 'https://w.test';
const call = async (path, body) => { const r = await worker.fetch(new Request(W + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}), env); const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; } return { status: r.status, body: j }; };
const cron = () => worker.scheduled({}, env, {});

// 1) Legacy single-player state migrates to player:<code>, intact
const legacy = { v: 2, code: '3YS267ZCSA', started: '2026-10-09', pets: [{ species: 'bunny', name: 'Fluffy', deaths: 0, injuries: [], rescuedOn: null, rescues: 0, firstKidnapped: '2026-10-09' }],
  hostage: { rung: 0, streak: 0, since: '2026-10-09', settledThrough: '2026-10-08' }, days: { '2026-10-09': 2238 }, lastSync: 1, lastSteps: 2238, sub: null, sent: {}, events: [],
  syncLog: [{ at: 1, ok: true, steps: 2238 }], deathCount: 0, deathSeen: 0, lastDeath: null, deathLog: [], bestRung: 0, stats: { metDays: 0, missedDays: 0, rescues: 0 } };
await env.PH.put('state', JSON.stringify(legacy)); _resetLegacyFlag();
let r = await call('/state?code=3YS267ZCSA');
assert.equal(r.status, 200); assert.equal(r.body.code, '3YS267ZCSA'); assert.equal(r.body.hostage.name, 'Fluffy'); assert.equal(r.body.todaySteps, 2238); assert.equal(r.body.syncLog.length, 1);
assert.equal(await env.PH.get('state'), null); assert.ok(await env.PH.get('legacy:state')); assert.ok(await env.PH.get('player:3YS267ZCSA'));
// Ben's exact Shortcut URL still works
r = await call('/sync?code=3YS267ZCSA&steps=3000'); assert.equal(r.status, 200); assert.match(r.body, /Got 3,000 steps/);
// 2) a friend claims: own code, own fresh ladder
r = await call('/claim', {}); assert.equal(r.status, 200); const F = r.body.code; assert.notEqual(F, '3YS267ZCSA');
assert.equal(r.body.state.hostage.name, 'Chompsky'); assert.equal(r.body.state.todaySteps, 0); assert.equal(r.body.state.syncLog.length, 0);
// 3) no cross-talk
await call(`/sync?code=${F}&steps=12000`);
let ben = (await call('/state?code=3YS267ZCSA')).body, fr = (await call(`/state?code=${F}`)).body;
assert.equal(ben.todaySteps, 3000); assert.equal(fr.todaySteps, 12000); assert.equal(ben.syncLog.length, 2); assert.equal(fr.syncLog.length, 1);
await call('/settings', { code: F, name: 'Bun Bun' });
assert.equal((await call('/state?code=3YS267ZCSA')).body.hostage.name, 'Fluffy'); assert.equal((await call(`/state?code=${F}`)).body.hostage.name, 'Bun Bun');
// 4) unknown / missing code is rejected and stored nowhere
const before = JSON.stringify([...env.PH.m.entries()]);
r = await call('/sync?code=NOPE123456&steps=99999'); assert.equal(r.status, 404); assert.match(r.body, /Unknown code NOPE123456/);
r = await call('/sync?steps=99999'); assert.equal(r.status, 400); assert.match(r.body, /No code/);
r = await call('/state'); assert.equal(r.status, 400); assert.equal(r.body.error, 'code required');
r = await call('/state?code=NOPE123456'); assert.equal(r.status, 404); assert.equal(r.body.error, 'unknown code');
assert.equal(JSON.stringify([...env.PH.m.entries()]), before);
// 5) midnight: cron settles each player separately. Ben 3,000 (bunny dies, patched), friend 12,000 (day 1 banked)
at('2026-10-10T00:05:00-07:00'); await cron();
ben = (await call('/state?code=3YS267ZCSA')).body; fr = (await call(`/state?code=${F}`)).body;
assert.equal(ben.hostage.deaths, 1); assert.deepEqual(ben.hostage.injuries, ['pop']); assert.equal(ben.lastDeath.name, 'Fluffy'); assert.equal(ben.hostage.streak, 0);
assert.equal(fr.hostage.deaths, 0); assert.equal(fr.hostage.streak, 1); assert.equal(fr.lastDeath, null);
// friend keeps going and rescues; Ben unaffected
for (const d of ['2026-10-10', '2026-10-11']) { at(d + 'T21:00:00-07:00'); await call(`/sync?code=${F}&steps=10001`); }
at('2026-10-12T00:05:00-07:00'); await cron();
fr = (await call(`/state?code=${F}`)).body; ben = (await call('/state?code=3YS267ZCSA')).body;
assert.equal(fr.shelf.length, 1); assert.equal(fr.hostage.name, 'Nugget');
assert.equal(ben.shelf.length, 0); assert.equal(ben.hostage.rung, 0); assert.equal(ben.stats.missedDays, 3); // Ben missed 9th, 10th, 11th
// seen-death is per player
await call('/seen-death', { code: '3YS267ZCSA', id: ben.lastDeath.id });
assert.equal((await call('/state?code=3YS267ZCSA')).body.deathSeen, ben.lastDeath.id); assert.equal((await call(`/state?code=${F}`)).body.deathSeen, 0);
Date.now = realNow; console.log = silent;
console.log('✓ multi-player sim (legacy migration, Ben\'s URL, separate claims/steps/names/settlement, unknown code rejected and stored nowhere)');

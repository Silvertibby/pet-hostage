// v0.5.0: friends (public IDs), Spare Steps bank, Raccoon Pause.
import assert from 'node:assert';
import worker from './src/index.js';
console.log = () => {};
class KV { constructor() { this.m = new Map(); }
  async get(k) { return this.m.has(k) ? this.m.get(k) : null; } async put(k, v) { this.m.set(k, v); } async delete(k) { this.m.delete(k); }
  async list({ prefix = '' } = {}) { return { keys: [...this.m.keys()].filter(k => k.startsWith(prefix)).sort().map(name => ({ name })), list_complete: true }; } }
const env = { PH: new KV(), APP_URL: 'x', VAPID_PUBLIC_KEY: 'x' };
let fake = Date.parse('2026-10-09T12:00:00-07:00'); Date.now = () => fake;
const at = iso => { fake = Date.parse(iso); };
const call = async (path, body) => { const r = await worker.fetch(new Request('https://w.test' + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}), env); const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; } return { status: r.status, body: j }; };
const st = async c => (await call('/state?code=' + c)).body;

// an existing (pre-v0.5) player: migrates with bank 0, gets a friend ID, nothing else changes
const old = { v: 2, code: 'OLDPLAYER1', started: '2026-10-01', pets: [{ species: 'bunny', name: 'Fluffy', deaths: 0, injuries: [], rescuedOn: null, rescues: 0, firstKidnapped: '2026-10-01' }],
  hostage: { rung: 0, streak: 1, since: '2026-10-07', settledThrough: '2026-10-08' }, days: { '2026-10-07': 25000, '2026-10-08': 18000 }, lastSync: 1, lastSteps: 1, sub: null, sent: {}, events: [],
  syncLog: [], deathCount: 0, deathSeen: 0, lastDeath: null, deathLog: [], bestRung: 0, stats: { metDays: 1, missedDays: 0, rescues: 0 } };
await env.PH.put('player:OLDPLAYER1', JSON.stringify(old));
let s = await st('OLDPLAYER1');
assert.equal(s.bank, 0, 'no backfill'); assert.equal(s.hostage.streak, 1); assert.equal(s.todaySteps, 0);
assert.match(s.friendId, /^[A-Z2-9]{6}$/); assert.notEqual(s.friendId, 'OLDPLAYER1');
assert.equal(await env.PH.get('fid:' + s.friendId), 'OLDPLAYER1');
const oldFid = s.friendId; assert.equal((await st('OLDPLAYER1')).friendId, oldFid, 'stable');

// new player: earn above goal at day close
const A = (await call('/claim', {})).body.code;
await call(`/sync?code=${A}&steps=14000`); // Oct 9: day 1, goal 10k -> +4000
at('2026-10-10T12:00:00-07:00'); s = await st(A);
assert.equal(s.bank, 4000); assert.equal(s.bankLog[0].kind, 'earn'); assert.equal(s.hostage.streak, 1);
await call(`/sync?code=${A}&steps=40000`); // Oct 10: day 2 -> +30000
at('2026-10-11T12:00:00-07:00'); s = await st(A);
assert.equal(s.bank, 34000); assert.equal(s.hostage.day, 3); assert.equal(s.goal, 15000);

// pause: needs confirm, costs 30k, one per day, today doesn't count
let r = await call('/pause', { code: A }); assert.equal(r.status, 400);
r = await call('/pause', { code: A, confirm: true }); assert.equal(r.status, 200); assert.equal(r.body.state.bank, 4000); assert.equal(r.body.state.pausedToday, true); assert.equal(r.body.state.hostage.paused, true);
r = await call('/pause', { code: A, confirm: true }); assert.equal(r.status, 409); assert.equal(r.body.error, 'already paused today');
await call(`/sync?code=${A}&steps=500`); // would be a death on the 15k final day
at('2026-10-12T12:00:00-07:00'); s = await st(A);
assert.equal(s.hostage.streak, 2, 'no progress, no miss'); assert.equal(s.hostage.day, 3); assert.equal(s.stats.missedDays, 0); assert.equal(s.deathCount ?? s.deathLog.length, 0);
assert.equal(s.bank, 4000); assert.ok(s.days.find(d => d.date === '2026-10-11').paused); assert.equal(s.pausedToday, false);
// not enough for another pause
r = await call('/pause', { code: A, confirm: true }); assert.equal(r.status, 409); assert.equal(r.body.error, 'not enough Spare Steps');
// final day 15k met with extra: +3000 above 15k, rescue
await call(`/sync?code=${A}&steps=18000`);
at('2026-10-13T12:00:00-07:00'); s = await st(A);
assert.equal(s.bank, 7000); assert.equal(s.shelf.length, 1);
// death resets the whole bank
at('2026-10-14T12:00:00-07:00'); s = await st(A);
assert.equal(s.bank, 0); assert.equal(s.bankLog[0].kind, 'reset'); assert.equal(s.bankLog[0].amount, -7000); assert.equal(s.stats.missedDays, 1);

// friends: public view by ID, no code, unknown 404
const fid = s.friendId;
r = await call('/friend?id=' + fid.toLowerCase()); assert.equal(r.status, 200);
assert.ok(!JSON.stringify(r.body).includes(A), 'code never exposed'); assert.equal(r.body.name, s.hostage.name); assert.equal(r.body.day, s.hostage.day); assert.equal(r.body.goal, s.goal);
for (const k of ['code', 'syncLog', 'sub', 'bank', 'bankLog']) assert.ok(!(k in r.body), k);
r = await call('/friend?id=ZZZZZZ'); assert.equal(r.status, 404);
r = await call('/friend?id=' + A); assert.equal(r.status, 404, 'a sync code is not a friend ID');
r = await call(`/friends?ids=${fid},${oldFid},NOPE22`); assert.equal(r.body.friends.length, 3); assert.equal(r.body.friends[2].missing, true); assert.ok(['Fluffy', 'Spud'].includes(r.body.friends[1].name)); // v0.6.9: idle 5+ days on the bunny -> potato
// friend view shows paused
at('2026-10-15T09:00:00-07:00');
const B = (await call('/claim', {})).body.code; const Bs = JSON.parse(await env.PH.get('player:' + B)); Bs.bank = 31000; await env.PH.put('player:' + B, JSON.stringify(Bs));
r = await call('/pause', { code: B, confirm: true }); assert.equal(r.status, 200);
const bf = (await st(B)).friendId; r = await call('/friend?id=' + bf); assert.equal(r.body.paused, true);
// reading a friend doesn't write their record
const snap = await env.PH.get('player:OLDPLAYER1'); await call('/friend?id=' + oldFid); assert.equal(await env.PH.get('player:OLDPLAYER1'), snap);
process.stdout.write('bank/pause/friends tests passed\n');

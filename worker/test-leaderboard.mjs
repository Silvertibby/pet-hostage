// v0.4.7 leaderboard: streak math, names/filter, hide, ordering, KV index, no code leaks, game state untouched.
import assert from 'node:assert';
import worker, { _resetLegacyFlag } from './src/index.js';
import { streakOf, cleanName, boardView, lbId, tagOf, NAME_MAX } from './src/leaderboard.js';
import { newState, settle, addDays } from './src/game.js';
const silent = console.log; console.log = () => {};
class KV { constructor() { this.m = new Map(); this.puts = 0; this.lists = 0; }
  async get(k) { return this.m.has(k) ? this.m.get(k) : null; } async put(k, v) { this.puts++; this.m.set(k, v); } async delete(k) { this.m.delete(k); }
  async list({ prefix = '' } = {}) { this.lists++; return { keys: [...this.m.keys()].filter(k => k.startsWith(prefix)).sort().map(name => ({ name })), list_complete: true }; } }
const env = { PH: new KV(), APP_URL: 'x', VAPID_PUBLIC_KEY: 'x' };
let fake = Date.parse('2026-10-09T20:00:00-07:00'); Date.now = () => fake; const at = iso => { fake = Date.parse(iso); };
const call = async (path, body) => { const r = await worker.fetch(new Request('https://w.test' + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}), env); const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; } return { status: r.status, body: j, raw: t }; };
const cron = () => worker.scheduled({}, env, {});

// ---- pure: streak across pets, deaths reset it, today counts once banked, final day needs 15k ----
{ const D = '2026-10-01', st = newState('S', D); for (let i = 0; i < 5; i++) st.days[addDays(D, i)] = 15000; settle(st, addDays(D, 5)); // bunny rescued on day 3, hamster day 2
  assert.equal(st.hostage.rung, 1); assert.equal(st.hostage.streak, 2); assert.deepEqual(streakOf(st, addDays(D, 5)), { run: 5, todayMet: false });
  st.days[addDays(D, 5)] = 10500; assert.equal(streakOf(st, addDays(D, 5)).todayMet, true);
  st.days[addDays(D, 6)] = 100; settle(st, addDays(D, 7)); assert.equal(streakOf(st, addDays(D, 7)).run, 0); // a miss (death) resets
  st.days[addDays(D, 7)] = 11000; settle(st, addDays(D, 8)); assert.equal(streakOf(st, addDays(D, 8)).run, 1);
  const f = newState('F', D); f.days[D] = 11000; f.days[addDays(D, 1)] = 11000; settle(f, addDays(D, 2)); f.days[addDays(D, 2)] = 12000; // final day, 12k
  assert.equal(streakOf(f, addDays(D, 2)).todayMet, false); f.days[addDays(D, 2)] = 15000; assert.equal(streakOf(f, addDays(D, 2)).todayMet, true); }
// ---- names ----
assert.equal(cleanName('  Ben  ').name, 'Ben'); assert.equal(cleanName('').name, null); assert.equal(cleanName(null).name, null);
assert.equal([...cleanName('A very long display name here').name].length <= NAME_MAX, true);
for (const bad of ['fuck', 'Sh1t Lord', 'b!tch', 'nazi99']) assert.ok(cleanName(bad).error, bad);
for (const ok of ['Grape Ape', 'Peacock', 'Spicy', 'Zoë 🐰', "Ben's mom"]) assert.ok(cleanName(ok).name, ok);
assert.ok(cleanName('<script>').error);
assert.match(tagOf('a1b2c3'), /^[A-Z2-9]{2}$/);

// ---- integration ----
const legacy = { v: 2, code: '3YS267ZCSA', started: '2026-10-09', pets: [{ species: 'bunny', name: 'Fluffy', deaths: 0, injuries: [], rescuedOn: null, rescues: 0, firstKidnapped: '2026-10-09' }],
  hostage: { rung: 0, streak: 0, since: '2026-10-09', settledThrough: '2026-10-08' }, days: { '2026-10-09': 10200 }, lastSync: 1, lastSteps: 10200, sub: null, sent: {}, events: [],
  syncLog: [], deathCount: 0, deathSeen: 0, lastDeath: null, deathLog: [], bestRung: 0, stats: { metDays: 0, missedDays: 0, rescues: 0 } };
await env.PH.put('state', JSON.stringify(legacy)); _resetLegacyFlag();
await call('/state?code=3YS267ZCSA');
const A = (await call('/claim', {})).body.code, B = (await call('/claim', {})).body.code;
await cron(); // rebuild: picks up Ben (legacy -> default name "Ben") and the two claims
let b = (await call('/leaderboard?code=3YS267ZCSA')).body;
assert.equal(b.count, 3); assert.equal(b.me.name, 'Ben'); assert.equal(b.me.custom, false);
assert.equal(b.rows[0].name, 'Ben'); assert.equal(b.rows[0].streak, 1); assert.ok(b.rows[0].you); // Ben banked today
assert.ok(b.rows.slice(1).every(r => /^Chompsky·[A-Z2-9]{2}$/.test(r.name) && r.streak === 0 && !r.you));
// never leaks codes (or the hashed ids)
const raw = (await call('/leaderboard')).raw; for (const c of ['3YS267ZCSA', A, B]) assert.ok(!raw.includes(c));
assert.ok(!raw.includes(await lbId(A))); assert.ok(!(await env.PH.get('leaderboard')).includes(A));
// A banks today -> ties Ben on streak 1 and saved 0; Ben got there first (no paidAt for him = later?) -> A crossed at a known time
at('2026-10-09T21:00:00-07:00'); await call(`/sync?code=${A}&steps=10400`);
b = (await call('/leaderboard')).body; assert.deepEqual(b.rows.map(r => r.streak), [1, 1, 0]);
at('2026-10-09T21:30:00-07:00'); await call('/sync?code=3YS267ZCSA&steps=10600'); // no crossing (already over): Ben keeps no crossing time
// profile: set name, filter, hide; game state untouched
const before = JSON.parse(await env.PH.get('player:' + A)); delete before.profile;
let r = await call('/profile', { code: A, name: 'Speedy' }); assert.equal(r.status, 200); assert.equal(r.body.board.me.name, 'Speedy');
r = await call('/profile', { code: A, name: 'fuckface' }); assert.equal(r.status, 400); assert.ok(r.body.error);
r = await call('/profile', { code: 'NOPE123456', name: 'x' }); assert.equal(r.status, 404);
const after = JSON.parse(await env.PH.get('player:' + A)); assert.deepEqual(after.profile, { name: 'Speedy' }); delete after.profile; assert.deepEqual(after, before);
b = (await call('/leaderboard')).body; assert.ok(b.rows.some(x => x.name === 'Speedy'));
r = await call('/profile', { code: B, hidden: true }); assert.equal(r.body.board.me.hidden, true); assert.equal(r.body.board.me.rank, undefined);
b = (await call('/leaderboard')).body; assert.equal(b.count, 2);
// midnight: cron settles + rebuilds; Ben 2 days? (only today was a success: run 1), A run 1, B 0 and hidden
at('2026-10-10T00:05:00-07:00'); await cron();
b = (await call(`/leaderboard?code=${B}`)).body; assert.equal(b.count, 2); assert.deepEqual(b.rows.map(x => x.streak), [1, 1]); assert.equal(b.me.hidden, true);
// day 2: A banks at 9am, Ben at 8pm -> both streak 2, saved 0; A reached it first
at('2026-10-10T09:00:00-07:00'); await call(`/sync?code=${A}&steps=10001`);
at('2026-10-10T20:00:00-07:00'); await call('/sync?code=3YS267ZCSA&steps=10002');
b = (await call('/leaderboard')).body; assert.deepEqual(b.rows.map(x => [x.name, x.streak]), [['Speedy', 2], ['Ben', 2]]);
// pets saved breaks the streak tie, and the saved sort puts savers first
const ix = JSON.parse(await env.PH.get('leaderboard')); const bid = await lbId('3YS267ZCSA'); ix.rows[bid].saved = 3;
assert.deepEqual(boardView(ix, null).rows.map(x => x.name), ['Ben', 'Speedy']);
ix.rows[bid].saved = 0; ix.rows[bid].run = 0; ix.rows[bid].met = null; ix.rows[await lbId(A)].saved = 0; ix.rows[bid].saved = 1;
assert.deepEqual(boardView(ix, null, 'saved').rows.map(x => x.name), ['Ben', 'Speedy']); assert.deepEqual(boardView(ix, null).rows.map(x => x.name), ['Speedy', 'Ben']);
// cost: a no-change cron writes nothing; a no-change sync doesn't rewrite the board
await cron(); const p0 = env.PH.puts; await cron(); assert.equal(env.PH.puts, p0, 'idle cron = 0 writes');
await call('/sync?code=3YS267ZCSA&steps=10002'); const lb1 = await env.PH.get('leaderboard'); const p1 = env.PH.puts; await call('/sync?code=3YS267ZCSA&steps=10002');
assert.equal(env.PH.puts - p1, 1, 'repeat sync = player write only'); assert.equal(await env.PH.get('leaderboard'), lb1);
// reading the board never lists keys
const l0 = env.PH.lists; await call('/leaderboard'); assert.equal(env.PH.lists, l0);
console.log = silent;
console.log('✓ leaderboard (streak across pets, 15k final day, names/filter/hide, tie-breaks, saved sort, no code leaks, state untouched, KV-cheap)');

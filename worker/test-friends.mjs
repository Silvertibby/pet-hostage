// v0.6.1 mutual friendships: link keys per direction, backfill from synced lists, remove = your side only
import assert from 'node:assert';
import worker, { _resetLinksFlag } from './src/index.js';
console.log = () => {};
class KV { constructor() { this.m = new Map(); } async get(k) { return this.m.has(k) ? this.m.get(k) : null; } async put(k, v) { this.m.set(k, v); } async delete(k) { this.m.delete(k); }
  async list({ prefix = '' } = {}) { return { keys: [...this.m.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; } }
const env = { PH: new KV(), APP_URL: 'x', VAPID_PUBLIC_KEY: 'x' };
let fake = Date.parse('2026-10-09T12:00:00-07:00'); Date.now = () => fake;
const call = async (path, body) => { const r = await worker.fetch(new Request('https://w.test' + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}), env); return { status: r.status, body: await r.json() }; };
const st = async c => (await call('/state?code=' + c)).body;
const [A, B, C] = [(await call('/claim', {})).body.code, (await call('/claim', {})).body.code, (await call('/claim', {})).body.code];
const [fa, fb, fc] = [(await st(A)).friendId, (await st(B)).friendId, (await st(C)).friendId];
const rev = c => JSON.parse(env.PH.m.get('player:' + c)).rev;
// A adds B -> B has A too, flagged new; B's record is not rewritten by A's add
const rb = rev(B);
let r = await call('/friends/save', { code: A, ids: [fb, 'NOPE99'] }); assert.deepEqual(r.body.friends, [fb]);
assert.equal(rev(B), rb, 'other record untouched');
let b = await st(B); assert.deepEqual(b.friends, [fa]); assert.deepEqual(b.newFriends, [fa]);
assert.deepEqual((await st(A)).newFriends, [], 'the adder sees no dot');
r = await call('/friends/seen', { code: B }); assert.deepEqual(r.body.state.newFriends, []); assert.deepEqual((await st(B)).newFriends, []);
// saving never removes; adding again is a no-op
r = await call('/friends/save', { code: A, ids: [] }); assert.deepEqual(r.body.friends, [fb]);
// B can now cheer A without having added A themselves
await (async () => { const s = JSON.parse(env.PH.m.get('player:' + B)); s.bank = 2000; env.PH.m.set('player:' + B, JSON.stringify(s)); })();
r = await call('/cheer', { code: B, to: fa, msg: 'go' }); assert.equal(r.status, 200);
// remove: only your side
r = await call('/friends/remove', { code: A, id: fb }); assert.deepEqual(r.body.state.friends, []);
assert.deepEqual((await st(B)).friends, [fa], 'B keeps A');
// backfill: a one-way list synced before v0.6.1 becomes mutual on the first request
{ const s = JSON.parse(env.PH.m.get('player:' + C)); s.friends = [fa, 'GONE00']; env.PH.m.set('player:' + C, JSON.stringify(s)); }
env.PH.m.delete('mig:links'); _resetLinksFlag();
const ra = rev(A);
const a = await st(A); assert.ok(a.friends.includes(fc)); assert.ok(a.newFriends.includes(fc));
assert.ok((await st(C)).friends.includes(fa)); assert.ok(!(await st(C)).friends.includes('GONE00'));
assert.ok(env.PH.m.get('mig:links'));
process.stdout.write('✓ friends (mutual links, new-friend flag, others untouched, remove one side, backfill)\n');
// v0.6.2 quota: polling /state and a cron tick on unchanged players do no writes and no list() calls
{ let puts = 0, lists = 0; const p0 = env.PH.put.bind(env.PH), l0 = env.PH.list.bind(env.PH);
  env.PH.put = async (k, v) => { puts++; return p0(k, v); }; env.PH.list = async o => { lists++; return l0(o); };
  for (const c of [A, B, C]) { await st(c); await st(c); }
  puts = 0; lists = 0;
  for (let i = 0; i < 5; i++) for (const c of [A, B, C]) await st(c);
  assert.equal(puts, 0, 'no writes on unchanged polls'); assert.equal(lists, 0, 'no list() on polls');
  fake += 60000; await worker.scheduled({}, env, {}); puts = 0; lists = 0; fake += 60000; await worker.scheduled({}, env, {});
  assert.equal(lists, 0, 'cron uses the player index'); assert.ok(puts <= 0, 'cron skips unchanged players: ' + puts);
  env.PH.put = p0; env.PH.list = l0; }
process.stdout.write('✓ quota (no writes/lists on unchanged polls or cron)\n');
// v0.6.3: a cheerer never gets one of their last 10 'made it' lines again
{ const { _upsertItems } = await import('./src/index.js'); const got = [];
  for (let i = 0; i < 30; i++) { const it = { id: 'r-x' + i, kind: 'win', pick: 'win', msg: null, at: fake + i, date: '2026-10-10' }; await _upsertItems(env, 'LINES1', [it]); got.push(it.msg); }
  for (let i = 10; i < got.length; i++) assert.ok(!got.slice(i - 10, i).includes(got[i]), 'repeat within 10');
  const raw = JSON.parse(env.PH.m.get('ibx:LINES1')); assert.equal(raw.find(x => x.id === '_recent').used.win.length, 10); }
process.stdout.write('✓ reply lines (no repeats within the last 10 per cheerer)\n');

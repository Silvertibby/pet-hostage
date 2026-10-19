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

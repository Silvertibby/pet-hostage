// v0.5.8 friend cheers: 1,000 Spare Steps, friend-list check, daily limit, today-only banner, reply adds the friend
import assert from 'node:assert';
import fs from 'node:fs';
import worker from './src/index.js';
import { CHEERS, CHEER_COST } from './src/cheers.js';
console.log = () => {};
assert.equal(fs.readFileSync('src/cheers.js', 'utf8'), fs.readFileSync('../app/cheers.js', 'utf8'), 'app/cheers.js must match');
class KV { constructor() { this.m = new Map(); } async get(k) { return this.m.has(k) ? this.m.get(k) : null; } async put(k, v) { this.m.set(k, v); } async delete(k) { this.m.delete(k); }
  async list({ prefix = '' } = {}) { return { keys: [...this.m.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; } }
const env = { PH: new KV(), APP_URL: 'x', VAPID_PUBLIC_KEY: 'x' };
let fake = Date.parse('2026-10-09T12:00:00-07:00'); Date.now = () => fake;
const call = async (path, body) => { const r = await worker.fetch(new Request('https://w.test' + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}), env); return { status: r.status, body: await r.json() }; };
const A = (await call('/claim', {})).body.code, B = (await call('/claim', {})).body.code;
const poke = async (c, f) => { const s = JSON.parse(await env.PH.get('player:' + c)); f(s); await env.PH.put('player:' + c, JSON.stringify(s)); };
let a2; let a = (await call('/state?code=' + A)).body, b = (await call('/state?code=' + B)).body;
const fa = a.friendId, fb = b.friendId; assert.ok(fa && fb);
assert.deepEqual(a.cheers, []); assert.equal(a.cheersTotal, 0);
// not on the friend list yet
let r = await call('/cheer', { code: A, to: fb, msg: 'go' }); assert.equal(r.status, 409); assert.equal(r.body.error, 'not a friend');
r = await call('/friends/save', { code: A, ids: [fb, fa, 'zzzzzz', fb] }); assert.deepEqual(r.body.friends, [fb, 'ZZZZZZ']);
// balance check
r = await call('/cheer', { code: A, to: fb, msg: 'go' }); assert.equal(r.body.error, 'not enough Spare Steps');
await poke(A, s => { s.bank = 10000; });
r = await call('/cheer', { code: A, to: fb, msg: 'free text!' }); assert.equal(r.body.error, 'no such cheer');
r = await call('/cheer', { code: A, to: 'ZZZZZZ', msg: 'go' }); assert.equal(r.body.error, 'not a friend'); // unknown player
r = await call('/cheer', { code: A, to: fb, msg: 'heart' }); assert.equal(r.status, 200); assert.equal(r.body.state.bank, 9000); assert.equal(r.body.state.bankLog[0].kind, 'cheer');
// sender name: their current pet's name by default, display name once set
b = (await call('/state?code=' + B)).body; assert.equal(b.cheers.length, 1); assert.equal(b.cheersTotal, 1);
assert.deepEqual([b.cheers[0].from, b.cheers[0].name, b.cheers[0].msg], [fa, 'Chompsky', 'heart']);
assert.ok(!JSON.stringify(b).includes(A), 'never the sender code');
await call('/settings', { code: A, displayName: '  Ben <3 ' }); r = await call('/cheer', { code: A, to: fb, msg: 'go' });
b = (await call('/state?code=' + B)).body; assert.equal(b.cheers[1].name, 'Ben 3');
// friend view never shows cheers or codes
const pub = (await call('/friend?id=' + fb)).body; assert.ok(!('cheers' in pub) && !JSON.stringify(pub).includes(B));
// daily limit: 3 per friend per day
r = await call('/cheer', { code: A, to: fb, msg: 'star' }); assert.equal(r.status, 200);
r = await call('/cheer', { code: A, to: fb, msg: 'fire' }); assert.equal(r.body.error, 'cheer limit'); assert.equal(r.body.state.bank, 7000);
// seen: dismissing removes it from the banner queue; the total stays
r = await call('/cheer/seen', { code: B, id: b.cheers[0].id }); assert.equal(r.body.state.cheers.length, 2); assert.equal(r.body.state.cheersTotal, 3);
// reply: free, one per received cheer, only after today's goal; auto-adds the sender; arrives as a normal (reply) banner
await poke(B, s => { s.bank = 0; });
const cid = r.body.state.cheers[0].id;
r = await call('/cheer', { code: B, to: fa, msg: 'paws', reply: cid }); assert.equal(r.body.error, 'goal first');
await poke(B, s => { s.days['2026-10-09'] = 10500; });
r = await call('/cheer', { code: B, to: fb, msg: 'paws', reply: cid }); assert.equal(r.body.error, 'no such cheer'); // must go back to that cheer's sender
r = await call('/cheer', { code: B, to: fa, msg: 'paws', reply: cid }); assert.equal(r.status, 200); assert.equal(r.body.state.bank, 0); assert.deepEqual(r.body.state.friends, [fa]);
assert.equal(r.body.state.cheers.length, 1, 'the replied cheer counts as seen');
r = await call('/cheer', { code: B, to: fa, msg: 'go', reply: cid }); assert.equal(r.body.error, 'no such cheer'); // one reply per cheer
a2 = (await call('/state?code=' + A)).body; assert.equal(a2.cheers.length, 1); assert.deepEqual([a2.cheers[0].from, a2.cheers[0].msg, a2.cheers[0].reply], [fb, 'paws', true]);
{ const rl = r.body.state.bankLog[0]; assert.deepEqual([rl.kind, rl.amount, rl.to], ['reply', 0, fa]); assert.ok(rl.name); }
assert.ok(a2.bankLog.some(e => e.kind === 'cheer' && e.to === fb && e.name), 'cheer ledger carries recipient id + name');
// a new (non-reply) cheer still costs 1,000
r = await call('/cheer', { code: B, to: fa, msg: 'go' }); assert.equal(r.body.error, 'not enough Spare Steps');
// cheers only live for the Pacific day they were sent: gone after midnight PT even if never seen; history keeps the count
fake = Date.parse('2026-10-10T00:05:00-07:00');
b = (await call('/state?code=' + B)).body; assert.deepEqual(b.cheers, []); assert.equal(b.cheersTotal, 3);
a = (await call('/state?code=' + A)).body; assert.deepEqual(a.cheers, []); assert.equal(a.cheersTotal, 1); assert.equal(a.bank, 0);
assert.equal(JSON.parse(await env.PH.get('player:' + B)).cheers.length, 0, 'cleaned up in storage');
// the daily limit resets with the new day
await poke(A, s => { s.bank = 5000; }); r = await call('/cheer', { code: A, to: fb, msg: 'go' }); assert.equal(r.status, 200);
assert.equal(CHEERS.length, 6); assert.equal(CHEER_COST, 1000);
process.stdout.write('✓ cheers (friend check, cost, presets only, daily limit, display name, seen, reply adds friend, today only)\n');

// v0.5.8 friend cheers: 1,000 Spare Steps, friend-list check, daily limit, today-only banner, reply adds the friend
import assert from 'node:assert';
import fs from 'node:fs';
import worker from './src/index.js';
import { CHEERS, CHEER_COST, WIN_LINES, MISS_LINES } from './src/cheers.js';
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
r = await call('/friends/save', { code: A, ids: [fb, fa, 'zzzzzz', fb] }); assert.deepEqual(r.body.friends, [fb]); // v0.6.1: unknown IDs are not linked
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
// v0.6.0: cheers live in the recipient's inbox keys; the recipient's player record is never rewritten by a sender
const revB = JSON.parse(await env.PH.get('player:' + B)).rev;
await poke(A, s => { s.cheerSent = {}; }); r = await call('/cheer', { code: A, to: fb, msg: 'walk' }); assert.equal(r.status, 200);
assert.equal(JSON.parse(await env.PH.get('player:' + B)).rev, revB, 'recipient record untouched');
assert.ok([...env.PH.m.keys()].some(k => k === 'ibx:' + fb));
// no manual replies any more
r = await call('/cheer', { code: B, to: fa, msg: 'paws', reply: 1 }); assert.ok(r.body.error); // v0.6.1: mutual now, but a 'reply' is just a paid cheer
// auto 'win' reply: the sync that crosses B's goal sends ONE free reply to A (however many cheers A sent)
r = await call('/sync', { code: B, steps: 9000 }); a2 = (await call('/state?code=' + A)).body; assert.equal(a2.cheers.length, 0);
r = await call('/sync', { code: B, steps: 10400 }); assert.equal(r.status, 200);
a2 = (await call('/state?code=' + A)).body; assert.equal(a2.cheers.length, 1); assert.deepEqual([a2.cheers[0].kind, a2.cheers[0].from], ['win', fb]);
assert.ok(WIN_LINES.some(l => l.id === a2.cheers[0].msg));
{ const ib = JSON.parse(env.PH.m.get('ibx:' + fa)), meta = ib.find(x => x.id === '_recent'); assert.deepEqual(meta.used.win, [a2.cheers[0].msg]); assert.ok(WIN_LINES.length >= 40); }
{ const e = a2.bankLog.find(x => x.kind === 'reply'); assert.deepEqual([e.amount, e.to, e.outcome, e.dir], [0, fb, 'win', 'in']); }
{ const bs = (await call('/state?code=' + B)).body; const e = bs.bankLog.find(x => x.kind === 'reply'); assert.deepEqual([e.amount, e.to, e.outcome, e.dir], [0, fa, 'win', 'out']);
  assert.equal(bs.bankLog.filter(x => x.kind === 'reply').length, 1); }
await call('/sync', { code: B, steps: 12000 }); a2 = (await call('/state?code=' + A)).body; assert.equal(a2.bankLog.filter(x => x.kind === 'reply').length, 1, 'no repeat');
assert.ok(a2.bankLog.some(e => e.kind === 'cheer' && e.to === fb && e.name), 'cheer ledger carries recipient id + name');
// auto 'miss' reply: B cheers A, A ends the day short -> just after midnight A's game sends 'miss' to B, valid for the new day
await poke(B, s => { s.bank = 3000; s.friends = [fa]; });
r = await call('/cheer', { code: B, to: fa, msg: 'go' }); assert.equal(r.status, 200);
fake = Date.parse('2026-10-10T00:05:00-07:00');
a = (await call('/state?code=' + A)).body; assert.ok(a.cheers.every(c => c.date === '2026-10-10'), 'yesterday banners gone');
b = (await call('/state?code=' + B)).body; assert.equal(b.cheers.length, 1); assert.deepEqual([b.cheers[0].kind, b.cheers[0].date], ['miss', '2026-10-10']);
assert.ok(MISS_LINES.some(l => l.id === b.cheers[0].msg));
assert.ok(b.bankLog.some(e => e.kind === 'reply' && e.outcome === 'miss' && e.dir === 'in'));
assert.equal(b.cheersTotal, 4);
// double-spend guard: two cheers at once with exactly 1,000 banked -> one goes through
await poke(A, s => { s.bank = 1000; s.cheerSent = {}; s.friends = [fb, 'ZZZZZZ']; });
const both = await Promise.all([call('/cheer', { code: A, to: fb, msg: 'go' }), call('/cheer', { code: A, to: fb, msg: 'star' })]);
assert.deepEqual(both.map(x => x.status).sort(), [200, 409]); a = (await call('/state?code=' + A)).body; assert.equal(a.bank, 0);
assert.equal(a.bankLog.filter(e => e.kind === 'cheer' && e.date === '2026-10-10').length, 1);
// v0.5.8 cheers stored on the record migrate into the inbox
await poke(B, s => { s.inboxV = 0; s.cheers = [{ id: 5, from: fa, name: 'Old', msg: 'go', at: fake - 1000, date: '2026-10-10' }]; });
b = (await call('/state?code=' + B)).body; assert.ok(b.cheers.some(c => c.name === 'Old' && typeof c.id === 'string'));
assert.equal(CHEERS.length, 6); assert.equal(CHEER_COST, 1000);
process.stdout.write('✓ cheers (friend check, cost, presets, limit, name, seen, inbox keys, auto win/miss replies, double-spend guard, migration)\n');

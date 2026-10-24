// v0.7.8 Premium Cheer + achievements (local mock KV only)
import assert from 'node:assert';
import fs from 'node:fs';
import worker from './src/index.js';
import { PREMIUM_TIERS, PREMIUM_LINES, ACHIEVEMENTS } from "./src/cheers.js";
console.log = () => {};
assert.equal(fs.readFileSync('src/cheers.js', 'utf8'), fs.readFileSync('../app/cheers.js', 'utf8'), 'app/cheers.js must match');
class KV { constructor() { this.m = new Map(); } async get(k) { return this.m.has(k) ? this.m.get(k) : null; } async put(k, v) { this.m.set(k, v); } async delete(k) { this.m.delete(k); }
  async list({ prefix = '' } = {}) { return { keys: [...this.m.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; } }
const env = { PH: new KV(), APP_URL: 'x', VAPID_PUBLIC_KEY: 'x' };
let fake = Date.parse('2026-10-09T12:00:00-07:00'); Date.now = () => fake;
const call = async (path, body) => { const r = await worker.fetch(new Request('https://w.test' + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}), env); return { status: r.status, body: await r.json() }; };
const A = (await call('/claim', {})).body.code, B = (await call('/claim', {})).body.code;
const poke = async (c, f) => { const s = JSON.parse(await env.PH.get('player:' + c)); f(s); await env.PH.put('player:' + c, JSON.stringify(s)); };
const fa = (await call('/state?code=' + A)).body.friendId, fb = (await call('/state?code=' + B)).body.friendId;
await call('/friends/save', { code: A, ids: [fb] });
await poke(A, s => { s.bank = 12000; });
let r = await call('/premiumCheer', { code: A, to: fb, tier: 'p' }); assert.equal(r.body.error, 'not a boss day');
r = await call('/premiumCheer', { code: A, to: fb, tier: 'zzz' }); assert.equal(r.body.error, 'no such tier');
await poke(B, s => { s.hostage.bosses = [1]; });
r = await call('/premiumCheer', { code: A, to: fb, tier: 'p' }); assert.equal(r.status, 200, JSON.stringify(r.body.error)); assert.equal(r.body.state.bank, 7000);
assert.equal(r.body.state.bankLog[0].kind, 'premium'); assert.equal(r.body.state.pSent.length, 1);
r = await call('/premiumCheer', { code: A, to: fb, tier: 'mega' }); assert.equal(r.body.error, 'not enough Spare Steps');
await poke(A, s => { s.bank += 10000; });
r = await call('/premiumCheer', { code: A, to: fb, tier: 'mega' }); assert.equal(r.status, 200); assert.equal(r.body.state.bank, 7000);
let b = (await call('/state?code=' + B)).body; assert.equal(b.premium.length, 2); assert.equal(b.cheers.length, 0);
const [p1, p2] = b.premium; assert.ok(PREMIUM_LINES[p1.tier].some(l => l.id === p1.msg)); assert.equal(p2.reward, 5000);
const bank0 = b.bank;
r = await call('/claimCheer', { code: B, id: p1.id }); assert.equal(r.body.error, 'goal not met');
await call('/sync', { code: B, steps: 15200 });
r = await call('/claimCheer', { code: B, id: p1.id }); assert.equal(r.status, 200); assert.equal(r.body.state.bank, bank0 + 2500);
assert.ok(r.body.state.premium.find(x => x.id === p1.id).claimed);
r = await call('/claimCheer', { code: B, id: p1.id }); assert.equal(r.body.error, 'already claimed');
r = await call('/claimCheer', { code: B, id: p2.id }); assert.equal(r.body.state.bank, bank0 + 7500);
assert.equal(r.body.state.bankLog.filter(e => e.kind === 'pclaim').length, 2);
let a = (await call('/state?code=' + A)).body; assert.ok(a.pSent.every(x => x.claimed)); assert.ok(!a.bankLog.some(e => e.kind === 'reply'));
// v0.8.0: on a 20k day the cheer carries that goal; 15k isn't enough to claim
await poke(B, s => { s.hostage.bosses = []; s.hostage.big = [s.hostage.streak + 1]; });
await poke(A, s => { s.bank = 60000; });
r = await call('/premiumCheer', { code: A, to: fb, tier: 'p' }); assert.equal(r.status, 200, JSON.stringify(r.body.error));
b = (await call('/state?code=' + B)).body; assert.equal(b.goal, 20000); const p3 = b.premium.find(x => !x.claimed); assert.equal(p3.goal, 20000);
r = await call('/claimCheer', { code: B, id: p3.id }); assert.equal(r.body.error, 'goal not met');
await call('/sync', { code: B, steps: 20000 }); r = await call('/claimCheer', { code: B, id: p3.id }); assert.equal(r.status, 200, JSON.stringify(r.body.error));
// expires at midnight
fake += 86400000; b = (await call('/state?code=' + B)).body; assert.equal(b.premium.length, 0);
r = await call('/claimCheer', { code: B, id: p1.id }); assert.equal(r.status, 409);
// achievements: retroactive rescues, streaks, claim once
assert.equal(ACHIEVEMENTS.length, 13);
await poke(A, s => { s.bestRung = 3; const t = '2026-10-10'; s.days['2026-10-08'] = 21000; s.days['2026-10-09'] = 20500; s.days[t] = 20001; });
a = (await call('/state?code=' + A)).body; const e = a.ach.earned;
assert.ok(e.r1 && e.r3 && !e.r4 && e.s15 && e.s20 && !e.s25, JSON.stringify(e));
const bk = a.bank; r = await call('/achievements/claim', { code: A, id: 'r3' }); assert.equal(r.body.state.bank, bk + 3000);
r = await call('/achievements/claim', { code: A, id: 'r3' }); assert.equal(r.body.error, 'already claimed');
r = await call('/achievements/claim', { code: A, id: 'r4' }); assert.equal(r.body.error, 'not earned');
r = await call('/achievements/claim', { code: A, id: 's20' }); assert.equal(r.body.state.bank, bk + 13000); assert.equal(r.body.state.bankLog[0].kind, 'ach');
process.stdout.write('premium+ach ok\n');

import assert from 'node:assert';
import fs from 'node:fs';
import worker from './src/index.js';
import { VILLAINS, REWARDS } from './src/shop.js';
console.log = () => {};
class KV { constructor() { this.m = new Map(); } async get(k) { return this.m.has(k) ? this.m.get(k) : null; } async put(k, v) { this.m.set(k, v); } async delete(k) { this.m.delete(k); }
  async list({ prefix = '' } = {}) { return { keys: [...this.m.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; } }
const env = { PH: new KV(), APP_URL: 'x', VAPID_PUBLIC_KEY: 'x' };
let fake = Date.parse('2026-10-09T12:00:00-07:00'); Date.now = () => fake;
const call = async (path, body) => { const r = await worker.fetch(new Request('https://w.test' + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}), env); return { status: r.status, body: await r.json() }; };
const C = (await call('/claim', {})).body.code;
const poke = async f => { const s = JSON.parse(await env.PH.get('player:' + C)); f(s); await env.PH.put('player:' + C, JSON.stringify(s)); };
// v0.5.4 rescue rewards: free, server-side, permanent, backfilled, per villain
assert.deepEqual(REWARDS.raccoon.map(r => r.at), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
assert.equal(REWARDS.raccoon.find(r => r.style === 'tophat').at, 3);
for (const r of REWARDS.raccoon) assert.ok(VILLAINS.raccoon.styles[r.slot].includes(r.style), r.style);
let s = (await call('/state?code=' + C)).body; assert.deepEqual(s.cosmetics.unlocked, { raccoon: [] });
let r = await call('/shop/style', { code: C, slot: 'hat', style: 'tophat' }); assert.equal(r.status, 409); assert.equal(r.body.error, 'not unlocked');
// backfill an existing player by shelf (3 rescued): monocle, bowler, top hat; not auto-worn
await poke(s => { delete s.cosmetics; s.hostage.rung = 3; s.bestRung = 3; });
s = (await call('/state?code=' + C)).body; assert.deepEqual(s.cosmetics.unlocked.raccoon, ['glasses:monocle', 'hat:bowler', 'hat:tophat']);
assert.equal((s.cosmetics.equipped.raccoon || {}).styles, undefined);
r = await call('/shop/style', { code: C, slot: 'hat', style: 'tophat' }); assert.equal(r.status, 200); assert.equal(r.body.state.cosmetics.equipped.raccoon.styles.hat, 'tophat'); assert.equal(r.body.state.bank, 0);
r = await call('/shop/style', { code: C, slot: 'hat', style: 'crown' }); assert.equal(r.body.error, 'not unlocked');
r = await call('/shop/style', { code: C, slot: 'hat', style: 'sombrero' }); assert.equal(r.body.error, 'no such style');
r = await call('/shop/style', { code: C, villain: 'badger', slot: 'hat', style: 'tophat' }); assert.equal(r.body.error, 'no such slot');
r = await call('/shop/style', { code: C, slot: 'glasses', style: 'monocle' }); r = await call('/shop/style', { code: C, slot: 'glasses', style: 'default' });
assert.equal(r.body.state.cosmetics.equipped.raccoon.styles.glasses, undefined);
// the top hat takes the hat color (the shop palette still applies)
await poke(s => { s.bank = 5000; }); r = await call('/shop/buy', { code: C, slot: 'hat', color: 'black' }); assert.equal(r.status, 200);
const fid = r.body.state.friendId; let f = (await call('/friend?id=' + fid)).body; assert.deepEqual(f.look, { hat: 'black', styles: { hat: 'tophat' } });
// a rescue awards the next item and wears it
await poke(s => { s.hostage.streak = 8; s.hostage.bosses = []; s.days['2026-10-09'] = 16000; });
fake = Date.parse('2026-10-10T09:00:00-07:00');
s = (await call('/state?code=' + C)).body; assert.equal(s.hostage.rung, 4); assert.ok(s.cosmetics.unlocked.raccoon.includes('bowtie:scarf'));
assert.equal(s.cosmetics.equipped.raccoon.styles.bowtie, 'scarf'); assert.deepEqual(s.events.at(-1).gifts.map(g => g.style), ['scarf']);
// a death drops a rung but keeps every reward
fake = Date.parse('2026-10-11T09:00:00-07:00');
s = (await call('/state?code=' + C)).body; assert.equal(s.hostage.rung, 3); assert.equal(s.cosmetics.unlocked.raccoon.length, 4); assert.equal(s.cosmetics.equipped.raccoon.styles.hat, 'tophat');
process.stdout.write('✓ rescue rewards (ladder, backfill, server-side style equip, auto-award on rescue, kept through death, friend look)\n');

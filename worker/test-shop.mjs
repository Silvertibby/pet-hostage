// v0.5.3 Raccoon Shop: server-authoritative purchases, permanent ownership, shared bank with Pause
import assert from 'node:assert';
import fs from 'node:fs';
import worker from './src/index.js';
import { COLORS, VILLAINS } from './src/shop.js';
console.log = () => {};
assert.equal(fs.readFileSync('src/shop.js', 'utf8'), fs.readFileSync('../app/shop.js', 'utf8'), 'app/shop.js must match');
const price = id => COLORS.find(c => c.id === id).price;
assert.equal(price('black'), 5000); assert.equal(Math.min(...COLORS.map(c => c.price)), 5000);
for (let i = 1; i < COLORS.length; i++) assert.ok(COLORS[i].price > COLORS[i - 1].price, 'brighter costs more');
assert.equal(price('gold'), 250000); assert.equal(price('rainbow'), 500000);
assert.deepEqual(VILLAINS.raccoon.slots, ['shirt', 'hat', 'bowtie', 'glasses']);
class KV { constructor() { this.m = new Map(); } async get(k) { return this.m.has(k) ? this.m.get(k) : null; } async put(k, v) { this.m.set(k, v); } async delete(k) { this.m.delete(k); }
  async list({ prefix = '' } = {}) { return { keys: [...this.m.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; } }
const env = { PH: new KV(), APP_URL: 'x', VAPID_PUBLIC_KEY: 'x' };
let fake = Date.parse('2026-10-09T12:00:00-07:00'); Date.now = () => fake;
const call = async (path, body) => { const r = await worker.fetch(new Request('https://w.test' + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}), env); return { status: r.status, body: await r.json() }; };
const C = (await call('/claim', {})).body.code;
const poke = async f => { const s = JSON.parse(await env.PH.get('player:' + C)); f(s); await env.PH.put('player:' + C, JSON.stringify(s)); };
// old record without cosmetics: defaults in
let s = (await call('/state?code=' + C)).body; assert.deepEqual(s.cosmetics, { owned: {}, equipped: {}, unlocked: { raccoon: [] } });
// not enough
let r = await call('/shop/buy', { code: C, villain: 'raccoon', slot: 'hat', color: 'black' }); assert.equal(r.status, 409); assert.equal(r.body.error, 'not enough Spare Steps');
await poke(s => { s.bank = 40000; });
// client can't set ownership or price: unknown fields are ignored, bad items rejected
r = await call('/shop/buy', { code: C, villain: 'raccoon', slot: 'hat', color: 'black', price: 1, owned: true }); assert.equal(r.status, 200);
assert.equal(r.body.state.bankLog[0].item, 'raccoon:hat:black'); // v0.5.9 ledger context
assert.equal(r.body.state.bank, 35000); assert.deepEqual(r.body.state.cosmetics.owned.raccoon.hat, ['black']); assert.equal(r.body.state.cosmetics.equipped.raccoon.hat, 'black');
assert.equal(r.body.state.bankLog[0].kind, 'shop');
r = await call('/shop/buy', { code: C, villain: 'raccoon', slot: 'hat', color: 'black' }); assert.equal(r.body.error, 'already owned');
r = await call('/shop/buy', { code: C, villain: 'raccoon', slot: 'cape', color: 'black' }); assert.equal(r.body.error, 'no such item');
r = await call('/shop/buy', { code: C, villain: 'badger', slot: 'hat', color: 'black' }); assert.equal(r.body.error, 'no such item');
r = await call('/shop/buy', { code: C, villain: 'raccoon', slot: 'hat', color: 'neon' }); assert.equal(r.body.error, 'no such item');
// shelf gates
await poke(s => { s.bank = 2000000; });
r = await call('/shop/buy', { code: C, villain: 'raccoon', slot: 'shirt', color: 'gold' }); assert.equal(r.body.error, 'needs 5 on the shelf');
await poke(s => { s.hostage.rung = 5; });
r = await call('/shop/buy', { code: C, villain: 'raccoon', slot: 'shirt', color: 'gold' }); assert.equal(r.status, 200); assert.equal(r.body.state.bank, 1750000);
r = await call('/shop/buy', { code: C, villain: 'raccoon', slot: 'bowtie', color: 'rainbow' }); assert.equal(r.body.error, 'needs 10 on the shelf');
await poke(s => { s.hostage.rung = 10; });
r = await call('/shop/buy', { code: C, villain: 'raccoon', slot: 'bowtie', color: 'rainbow' }); assert.equal(r.status, 200); assert.equal(r.body.state.bank, 1250000);
// equip / unequip for free; only owned
r = await call('/shop/equip', { code: C, villain: 'raccoon', slot: 'hat', color: null }); assert.equal(r.status, 200); assert.equal(r.body.state.cosmetics.equipped.raccoon.hat, undefined); assert.equal(r.body.state.bank, 1250000);
r = await call('/shop/equip', { code: C, villain: 'raccoon', slot: 'hat', color: 'red' }); assert.equal(r.body.error, 'not owned');
r = await call('/shop/equip', { code: C, villain: 'raccoon', slot: 'hat', color: 'black' }); assert.equal(r.body.state.cosmetics.equipped.raccoon.hat, 'black');
// pause shares the bank
r = await call('/pause', { code: C, confirm: true }); assert.equal(r.status, 200); assert.equal(r.body.state.bank, 1220000);
// friend view shows the look, not the bank
const fid = r.body.state.friendId; const f = (await call('/friend?id=' + fid)).body;
assert.deepEqual(f.look, { shirt: 'gold', bowtie: 'rainbow', hat: 'black' }); assert.ok(!('bank' in f) && !('cosmetics' in f));
// a death empties the bank but keeps every item
fake = Date.parse('2026-10-11T12:00:00-07:00'); // Oct 10 had 0 steps -> death
s = (await call('/state?code=' + C)).body; assert.equal(s.bank, 0); assert.ok(s.stats.missedDays >= 1);
assert.deepEqual(s.cosmetics.owned.raccoon, { hat: ['black'], shirt: ['gold'], bowtie: ['rainbow'] }); assert.equal(s.cosmetics.equipped.raccoon.shirt, 'gold');
process.stdout.write('✓ raccoon shop (catalog, prices, server-side buy/equip, shelf gates, shared bank, kept through death, friend look)\n');

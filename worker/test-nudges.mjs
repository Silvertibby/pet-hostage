// Twice-daily nudge schedule + voices.
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import worker, { planNudge, NUDGES2 } from './src/index.js';
import { PLEAD, TAUNT, PLEAD_SP, TAUNT_SP, PLEAD_FINAL, TAUNT_FINAL, nudgeText, DISH, ITEM } from './src/messages.js';
import { newState, ANIMALS, petAt } from './src/game.js';
const D = '2026-10-10', np = (h, m) => ({ date: D, hour: h, minute: m });
const st = newState('ABCDEFGHJK', D); st.days[D] = 3800;
// nothing outside the two slots
for (const [h, m] of [[8, 0], [12, 30], [14, 30], [19, 0], [21, 0], [23, 30]]) assert.equal(planNudge(st, np(h, m)), null, `${h}:${m}`);
const a = planNudge(st, np(13, 0)), b0 = planNudge(st, np(14, 0)); // late cron tick still inside the window
assert.ok(a && b0 && a.id === 'n1300'); st.sent[D] = ['n1300'];
assert.equal(planNudge(st, np(13, 30)), null); // once per slot
const b = planNudge(st, np(19, 30)); assert.equal(b.id, 'n1930');
assert.notEqual(a.voice, b.voice, 'one pet + one raccoon per day');
const petN = a.voice === 'pet' ? a : b, racN = a.voice === 'pet' ? b : a;
assert.equal(petN.title, '🐰 Chompsky'); assert.equal(racN.title, '🦝 The Raccoon');
assert.match(a.body + b.body, /6,200/); // 10,000 - 3,800 filled in
// banked = silent
st.sent[D] = []; st.days[D] = 10000; assert.equal(planNudge(st, np(13, 0)), null); assert.equal(planNudge(st, np(19, 30)), null);
// final day (day 3/3): 12,000 is NOT banked, so the nudges still come; 15,000 silences them
{ const f = newState('ABCDEFGHJK', D); f.hostage.streak = 2; f.days[D] = 12000;
  assert.ok(planNudge(f, np(13, 0))); assert.ok(planNudge(f, np(19, 30)));
  f.days[D] = 15000; assert.equal(planNudge(f, np(13, 0)), null); assert.equal(planNudge(f, np(19, 30)), null); }
// voice order varies by day (randomized per player/day) but always alternates within the day
const order = new Set(); for (let d = 1; d <= 20; d++) { const s2 = newState('ABCDEFGHJK', `2026-11-${String(d).padStart(2, '0')}`); const dd = s2.started; order.add(planNudge(s2, { date: dd, hour: 13, minute: 0 }).voice); }
assert.equal(order.size, 2);
// per-animal pools: every ladder animal (incl. the v0.4.3 capybara) has the same number of its own lines, in the worker AND the app
{ const n0 = [PLEAD_SP.bunny.length, TAUNT_SP.bunny.length];
  for (const an of ANIMALS) { assert.deepEqual([PLEAD_SP[an.species]?.length, TAUNT_SP[an.species]?.length], n0, an.species); assert.ok(DISH[an.species] && ITEM[an.species], an.species); }
  const app = readFileSync(new URL('../app/app.js', import.meta.url), 'utf8'), SL = JSON.parse(app.match(/const SPECIES_LINES = (\{.*\});/)[1]);
  const shape = o => ['pet', 'raccoon'].flatMap(w => ['behind', 'banked'].map(m => o?.[w]?.[m]?.length));
  for (const an of ANIMALS) assert.deepEqual(shape(SL[an.species]), shape(SL.bunny), 'app lines ' + an.species);
  for (const an of ANIMALS) assert.ok(new RegExp(an.species + ': ["\']').test(app.match(/const DISH = \{.*?\};/)[0]), 'app DISH ' + an.species); }
// every line renders for every animal with no leftover {placeholders}
let n = 0;
for (const an of ANIMALS) for (const voice of ['pet', 'raccoon']) for (const slot of ['afternoon', 'evening']) for (const line of [...(voice === 'pet' ? PLEAD : TAUNT)[slot], ...(voice === 'pet' ? PLEAD_SP : TAUNT_SP)[an.species], ...(voice === 'pet' ? PLEAD_FINAL : TAUNT_FINAL)]) {
  const out = line.replace(/\{(\w+)\}/g, (_, k) => ({ name: an.name, animal: an.species, left: '1,234', steps: '8,766', dish: DISH[an.species], item: ITEM[an.species], day: 2, need: 3, goal: '15,000' })[k] ?? `{${k}}`);
  assert.ok(!/\{\w+\}/.test(out), out); n++;
}
assert.ok(PLEAD.afternoon.length + PLEAD.evening.length >= 60 && TAUNT.afternoon.length + TAUNT.evening.length >= 60);
for (const an of ANIMALS) assert.ok(PLEAD_SP[an.species].length >= 4 && TAUNT_SP[an.species].length >= 4, an.species);
assert.ok(nudgeText('pet', 'evening', { species: 'panda', name: 'Bao', left: '1' }).length > 0);
// cron (fake KV + clock): two players, one under, one banked; only the one under gets the nudge recorded
const log = console.log; console.log = () => {};
class KV { constructor() { this.m = new Map(); } async get(k) { return this.m.get(k) ?? null; } async put(k, v) { this.m.set(k, v); } async delete(k) { this.m.delete(k); }
  async list({ prefix = '' } = {}) { return { keys: [...this.m.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; } }
const env = { PH: new KV() };
const p1 = newState('PLAYERONE1', D), p2 = newState('PLAYERTWO2', D); p1.days[D] = 2000; p2.days[D] = 12000;
await env.PH.put('player:PLAYERONE1', JSON.stringify(p1)); await env.PH.put('player:PLAYERTWO2', JSON.stringify(p2));
const real = Date.now; Date.now = () => Date.parse('2026-10-10T13:00:00-07:00'); await worker.scheduled({}, env, {});
Date.now = () => Date.parse('2026-10-10T13:30:00-07:00'); await worker.scheduled({}, env, {});
Date.now = () => Date.parse('2026-10-10T19:30:00-07:00'); await worker.scheduled({}, env, {});
const s1 = JSON.parse(await env.PH.get('player:PLAYERONE1')), s2 = JSON.parse(await env.PH.get('player:PLAYERTWO2'));
assert.deepEqual(s1.sent[D], ['n1300', 'n1930']); assert.equal(s2.sent[D], undefined);
Date.now = real; console.log = log;
console.log(`✓ nudges (2 slots/day, under-10k only, pet + raccoon voices, ${n} line renders, per-player cron)`);

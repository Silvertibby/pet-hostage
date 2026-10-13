// v0.4.9 revived-pet lines: same file in app + worker, counts, placeholders, length, selection only when deaths > 0.
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { REVIVED, HOW, PATCH, REVIVED_WEIGHT, revivedVars, revivedPool, maybeRevived, tierOf } from './src/revived.js';
import { nudgeText, DISH } from './src/messages.js';
import { newState } from './src/game.js';
import { planNudge } from './src/index.js';
console.log = () => {};
assert.equal(readFileSync('src/revived.js', 'utf8'), readFileSync('../app/revived.js', 'utf8'), 'app/revived.js must be a copy of worker/src/revived.js');
const SPECIES = ['bunny', 'hamster', 'squirrel', 'hedgehog', 'kitten', 'duckling', 'piglet', 'panda', 'capybara'];
let total = 0;
for (const who of ['pet', 'raccoon']) {
  for (const t of [1, 2, 3]) { const n = REVIVED[who][t].length; assert.ok(n >= 15 && n <= 25, `${who} tier ${t}: ${n}`); total += n; }
  assert.ok(REVIVED.final[who].length >= 8, who + ' final'); total += REVIVED.final[who].length;
  for (const sp of SPECIES) { const n = REVIVED.species[sp][who].length; assert.ok(n >= 2 && n <= 3, `${sp} ${who}`); total += n; }
}
const ALLOWED = new Set(['name', 'left', 'steps', 'goal', 'dish', 'how', 'patch', 'deaths', 'next']);
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => { assert.ok(ALLOWED.has(k), 'unknown placeholder ' + k + ' in: ' + s); return v[k]; });
const all = sp => [1, 2, 3].flatMap(t => [...REVIVED.pet[t], ...REVIVED.raccoon[t]]).concat(REVIVED.final.pet, REVIVED.final.raccoon, REVIVED.species[sp].pet, REVIVED.species[sp].raccoon);
for (const sp of SPECIES) for (const type of Object.keys(HOW)) {
  const v = { name: 'Chompsky', left: '15,000', steps: '14,999', goal: '15,000', dish: DISH[sp], ...revivedVars([type], 12) };
  for (const line of all(sp)) { const out = fill(line, v); assert.ok(!/[{}]/.test(out), out); assert.ok(out.length <= 88, `${out.length}: ${out}`); }
}
assert.deepEqual(revivedVars(['zap', 'pop'], 2), { how: HOW.pop, patch: PATCH.pop, deaths: '2', next: '3' }); // most recent death wins
assert.equal(tierOf(1), 1); assert.equal(tierOf(2), 2); assert.equal(tierOf(3), 3); assert.equal(tierOf(9), 3);
// selection: never when deaths = 0; tiered; ~60% when deaths > 0
for (let i = 0; i < 200; i++) { assert.equal(maybeRevived('pet', 'bunny', 0, false), null); assert.equal(maybeRevived('raccoon', 'kitten', 0, true), null); }
assert.deepEqual(revivedPool('pet', 'bunny', 0), []);
assert.ok(revivedPool('raccoon', 'panda', 5).includes(REVIVED.raccoon[3][0]) && !revivedPool('raccoon', 'panda', 5).includes(REVIVED.raccoon[1][0]));
assert.ok(revivedPool('pet', 'panda', 1, true).includes(REVIVED.final.pet[0]) && !revivedPool('pet', 'panda', 1, false).includes(REVIVED.final.pet[0]));
const isRev = (line, sp) => all(sp).some(l => l.split(/\{\w+\}/)[0] === line.slice(0, l.split(/\{\w+\}/)[0].length) && l.split(/\{\w+\}/)[0].length > 6);
const base = { name: 'Chompsky', species: 'bunny', animal: 'bunny', steps: '1,200', left: '8,800', goal: '10,000', dish: DISH.bunny, item: 'a hat', day: 1, need: 3, final: false };
let hits = 0; const N = 3000;
for (let i = 0; i < N; i++) { const out = nudgeText(i % 2 ? 'pet' : 'raccoon', i % 3 ? 'afternoon' : 'evening', { ...base, ...revivedVars(['pop'], 2), deaths: 2 }); assert.ok(!/[{}]/.test(out), out); if (isRev(out, 'bunny')) hits++; }
assert.ok(hits / N > REVIVED_WEIGHT - 0.08 && hits / N < REVIVED_WEIGHT + 0.08, 'revived share ' + hits / N);
for (let i = 0; i < 1500; i++) assert.ok(!isRev(nudgeText(i % 2 ? 'pet' : 'raccoon', 'evening', { ...base, deaths: 0 }), 'bunny'), 'revived line for a pet that never died');
// planNudge passes the pet's deaths/injuries through
const st = newState('TESTCODE01', '2026-10-12'); const p = st.pets[0]; p.deaths = 1; p.injuries = ['pop'];
let seen = 0; for (let i = 0; i < 60; i++) { st.sent = {}; const nn = planNudge(st, { date: '2026-10-12', hour: 13, minute: 5 }); assert.ok(nn && !/[{}]/.test(nn.body)); if (isRev(nn.body, p.species)) seen++; }
assert.ok(seen > 10, 'planNudge used revived lines ' + seen);
console.error(`✓ revived lines (${total} lines; app copy matches; placeholders + ≤88 chars for 9 species × 4 death types; deaths=0 never; ~${Math.round(hits / N * 100)}% when revived)`);

// v0.6.9 Easter egg: 3 missed bunny days (each one a death) in a row -> a pet potato (1 made day, misses don't kill) -> back to the bunny
import assert from 'node:assert';
import { newState, settle, view, publicView, addDays, POTATO_RUNG, goalToday, RESETTLE_KEYS } from './src/game.js';
import { topUpYesterday } from './src/index.js';
let d0 = '2026-10-01', st = newState('POTATO1', d0);
const day = i => addDays(d0, i);
const run = (i, steps, paused) => { st.days[day(i)] = steps; if (paused) st.paused[day(i)] = true; return settle(st, day(i + 1)); };
// 2 bunny deaths, a pause (doesn't count or reset), 1 more death -> potato
run(0, 100); run(1, 100);
assert.equal(st.hostage.rung, 0); assert.equal(st.bunnyMisses, 2);
run(2, 0, true); run(3, 0, true); assert.equal(st.bunnyMisses, 2, 'pause is not a miss');
run(4, 0, true); assert.equal(st.bunnyMisses, 2);
st.bank = 0; let ev = run(5, 100);
assert.equal(st.hostage.rung, POTATO_RUNG); assert.equal(st.bunnyMisses, 0);
const death = ev.find(e => e.kind === 'death'); assert.equal(death.rekidnap.species, 'potato'); assert.equal(death.rekidnap.need, 1);
assert.equal(st.pets[0].deaths, 3); assert.equal(goalToday(st), 10000, 'potato needs the normal goal');
const v = view(st, Date.parse(day(6) + 'T12:00:00-07:00')); assert.equal(v.hostage.species, 'potato'); assert.equal(v.hostage.need, 1); assert.equal(v.hostage.finalDay, false);
assert.ok(!JSON.stringify(st).includes('"-1"'), 'potato kept off the pets array');
assert.equal(publicView(st, Date.parse(day(6) + 'T12:00:00-07:00')).shelf, 0);
// potato misses: no death, no bank reset, no escalation
st.bank = 500; const dc = st.deathCount;
run(6, 3000); run(7, 9999);
assert.equal(st.hostage.rung, POTATO_RUNG); assert.equal(st.deathCount, dc); assert.equal(st.bank, 500); assert.equal(st.potato.deaths, 0);
// a made day frees the potato; back to the bunny, Spare Steps earned, no rewards/bestRung change
const best = st.bestRung, unl = JSON.stringify(st.cosmetics.unlocked);
ev = run(8, 12000);
assert.equal(st.hostage.rung, 0); assert.equal(st.hostage.streak, 0); assert.equal(st.bank, 2500); assert.ok(st.potato.rescuedOn);
assert.ok(ev.some(e => e.kind === 'rescue' && e.potato)); assert.equal(st.bestRung, best); assert.equal(JSON.stringify(st.cosmetics.unlocked), unl);
// can happen again after 3 more in a row; a made bunny day resets the count
for (let i = 9; i < 11; i++) run(i, 0); assert.equal(st.hostage.rung, 0); assert.equal(st.bunnyMisses, 2); run(11, 11000); assert.equal(st.bunnyMisses, 0, 'a made day resets');
for (let i = 12; i < 15; i++) run(i, 0); assert.equal(st.hostage.rung, POTATO_RUNG, 'again');
// morning top-up: the 3rd miss raised over the goal -> undone, no potato
d0 = '2026-11-01'; st = newState('POTATO2', d0);
for (let i = 0; i < 2; i++) run(i, 0);
st.days[day(2)] = 5000; settle(st, day(3)); assert.equal(st.hostage.rung, POTATO_RUNG);
assert.ok(RESETTLE_KEYS.includes('potato') && RESETTLE_KEYS.includes('bunnyMisses'));
const note = topUpYesterday(st, day(3), 7, 10500); assert.ok(note);
assert.equal(st.hostage.rung, 0); assert.equal(st.hostage.streak, 1); assert.equal(st.bunnyMisses, 0); assert.ok(!st.potato || !st.potato.firstKidnapped);
process.stdout.write('✓ potato egg (3 missed bunny days, pause ignored, 10k, no-death misses, back to bunny, repeatable, top-up undo)\n');

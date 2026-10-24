// v0.5.2 mini-boss days
import assert from 'node:assert';
import { PLAN_V } from './src/plan.js';
import { bossDaysFor, needFor, settle, view, goalToday, newState, addDays } from './src/game.js';
assert.deepEqual(bossDaysFor(0), []); assert.deepEqual(bossDaysFor(1), []);
for (let r = 4; r < 9; r++) { // v0.8.0: rungs 9+ use the late plan; v0.8.1: Acorn/Prickles hand-set (test-plan.mjs)
  const n = needFor(r), b = bossDaysFor(r);
  assert.equal(b.length, Math.floor((n - 4) / 3), 'count r' + r);
  for (const d of b) { assert.ok(d >= 2 && d <= n - 2, `r${r} d${d}`); }
  assert.deepEqual([...b].sort((x, y) => x - y), b);
}
assert.deepEqual(bossDaysFor(2), [3, 5]); assert.deepEqual(bossDaysFor(5), [4, 7, 10]);
// a fresh Acorn run: day 4 asks 15k, earns above 15k
const st = newState('TESTBOSS01', '2026-10-01');
st.hostage = { rung: 2, streak: 0, since: '2026-10-01', settledThrough: '2026-09-30', bosses: [4], big: [], plan: PLAN_V }; // the v0.5.2 Acorn layout st.pets[2] = { species: 'squirrel', name: 'Acorn', deaths: 0, injuries: [], rescuedOn: null, rescues: 0 };
const days = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'];
st.days = { [days[0]]: 10500, [days[1]]: 11000, [days[2]]: 10000, [days[3]]: 16000 };
settle(st, '2026-10-04'); assert.equal(st.hostage.streak, 3); assert.equal(goalToday(st), 15000, 'day 4 is a 15k day');
const v = view(st, Date.parse('2026-10-04T12:00:00-07:00')); assert.equal(v.hostage.bossToday, true); assert.equal(v.goal, 15000); assert.deepEqual(v.hostage.bosses, [4]);
settle(st, '2026-10-05'); assert.equal(st.hostage.streak, 4); assert.equal(st.bank, 500 + 1000 + 1000, 'bank uses that day\'s goal'); assert.equal(st.dayGoals[days[3]], 15000);
// 14,999 on a mini-boss day = death
const s2 = newState('TESTBOSS02', '2026-10-01'); s2.hostage = { rung: 2, streak: 3, since: '2026-09-28', settledThrough: '2026-10-03', bosses: [4] }; s2.pets[1] = { species: 'hamster', name: 'Nugget', deaths: 0, injuries: [], rescuedOn: '2026-09-27', rescues: 1 }; s2.pets[2] = { species: 'squirrel', name: 'Acorn', deaths: 0, injuries: [], rescuedOn: null, rescues: 0 };
s2.days['2026-10-04'] = 14999; settle(s2, '2026-10-05'); assert.equal(s2.stats.missedDays, 1); assert.equal(s2.hostage.rung, 1);
assert.deepEqual(s2.hostage.bosses, [], 'rekidnapped hamster: no mini-bosses');
// migration: a run in progress keeps today and closed days; only later days become bosses
const m = newState('TESTBOSS03', '2026-10-01'); m.hostage = { rung: 4, streak: 3, since: '2026-10-01', settledThrough: '2026-10-03' }; // today = day 4 (a boss slot) -> not a boss
settle(m, '2026-10-04'); assert.deepEqual(m.hostage.bosses, [8]); assert.equal(goalToday(m), 10000);
const m2 = newState('TESTBOSS04', '2026-10-01'); m2.hostage = { rung: 2, streak: 2, since: '2026-10-01', settledThrough: '2026-10-02' }; // today = day 3 -> day 4 still ahead
settle(m2, '2026-10-03'); assert.deepEqual(m2.hostage.bosses, [5]); // v0.8.1 Acorn plan: day 3 is today (kept 10k), day 5 ahead
// unsettled gap: settledThrough two days back, today could be day streak+2 -> that slot is excluded
const m3 = newState('TESTBOSS05', '2026-10-01'); m3.hostage = { rung: 2, streak: 2, since: '2026-10-01', settledThrough: '2026-10-01' }; m3.days['2026-10-02'] = 12000;
settle(m3, '2026-10-03'); assert.deepEqual(m3.hostage.bosses, [5], 'day 4 could be today: left alone; day 5 ahead');
// old players below Acorn: nothing changes
const b = newState('TESTBOSS06', '2026-10-01'); delete b.hostage.bosses; b.hostage.rung = 1; settle(b, '2026-10-01'); assert.deepEqual(b.hostage.bosses, []);
console.log('✓ mini-boss days (counts/placement r4..r8, 15k goal, bank vs day goal, death on miss, safe migration)');

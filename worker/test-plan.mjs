// v0.8.0 day plans: 20k finals after Acorn, escalating late plan, mid-run migration keeps today's goal
import assert from 'node:assert';
import fs from 'node:fs';
import { planFor, legacyBossDays, dayGoal } from './src/plan.js';
import { settle, newState, goalToday, view, needFor } from './src/game.js';
assert.equal(fs.readFileSync('src/plan.js', 'utf8'), fs.readFileSync('../app/plan.js', 'utf8'), 'app/plan.js must match');
const goals = r => { const n = needFor(r), p = planFor(r); return Array.from({ length: n }, (_, i) => dayGoal(i + 1, n, p.bosses, p.big)); };
// Bunny, Hamster, Acorn unchanged
for (const r of [0, 1, 2]) { assert.deepEqual(planFor(r), { bosses: legacyBossDays(r), big: [] }); assert.equal(goals(r).at(-1), 15000); }
assert.deepEqual(goals(2), [10000, 10000, 10000, 15000, 10000, 10000, 15000]);
// Prickles..Yuzu: same mini-bosses, 20k final
for (let r = 3; r <= 8; r++) { const g = goals(r); assert.deepEqual(planFor(r).bosses, legacyBossDays(r)); assert.equal(g.at(-1), 20000); assert.equal(g.filter(x => x === 20000).length, 1); }
// late plan (Marmalade+): more hard days than before, escalating, with breathers
let prev = { m: 0, b: 0 };
for (let r = 9; r <= 25; r++) {
  const g = goals(r), n = g.length, m = g.filter(x => x === 15000).length, b = g.filter(x => x === 20000).length;
  assert.ok(m > legacyBossDays(r).length, 'more 15k r' + r); assert.ok(b >= 3, 'extra 20k r' + r);
  assert.ok(m + b >= prev.m + prev.b && b >= prev.b, 'escalates r' + r); prev = { m, b };
  assert.equal(g[0], 10000); assert.equal(g[1], 10000); assert.equal(g[n - 2], 10000, 'breather before final'); assert.equal(g[n - 1], 20000);
  for (let i = 1; i < n - 1; i++) { assert.ok(!(g[i - 1] > 10000 && g[i] > 10000 && g[i + 1] > 10000), `3 hard in a row r${r}`);
    if (g[i] === 20000) assert.ok(g[i - 1] === 10000 && g[i + 1] === 10000, `20k flanked r${r} d${i + 1}`); }
  assert.ok(g.filter(x => x === 10000).length >= n / 2, 'mostly breathers r' + r);
}
// new runs get the plan
{ const st = newState('PLAN000001', '2026-10-01'); assert.equal(st.hostage.plan, 2);
  st.hostage = { rung: 8, streak: 18, since: '2026-09-12', settledThrough: '2026-09-30', bosses: planFor(8).bosses, big: [19], plan: 2 };
  for (let r = 0; r <= 8; r++) st.pets[r] = st.pets[r] || { species: 'x', name: 'x', deaths: 0, injuries: [], rescuedOn: r < 8 ? '2026-09-01' : null, rescues: r < 8 ? 1 : 0 };
  st.days['2026-10-01'] = 19999; settle(st, '2026-10-02'); assert.equal(st.hostage.rung, 7, '19,999 on a 20k final = death');
  st.hostage = { rung: 8, streak: 18, since: '2026-09-12', settledThrough: '2026-10-02', bosses: planFor(8).bosses, big: [19], plan: 2 };
  st.days['2026-10-03'] = 20000; settle(st, '2026-10-04'); assert.equal(st.hostage.rung, 9, 'rescued Yuzu');
  assert.equal(st.hostage.plan, 2); assert.deepEqual(st.hostage.big, planFor(9).big); assert.deepEqual(st.hostage.bosses, planFor(9).bosses); }
// migration: Prickles on its (old 15k) final day TODAY keeps 15k; tomorrow-onwards days follow the new plan
{ const st = newState('PLAN000002', '2026-10-01'); st.hostage = { rung: 3, streak: 8, since: '2026-09-23', settledThrough: '2026-09-30', bosses: [5] };
  settle(st, '2026-10-01'); assert.equal(goalToday(st), 15000, 'final day today stays 15k'); assert.deepEqual(st.hostage.big, []); assert.equal(st.hostage.plan, 2);
  assert.equal(view(st, Date.parse('2026-10-01T12:00:00-07:00')).hostage.finalGoal ?? 15000, 15000); }
// migration: Prickles on day 3 -> final day 9 becomes 20k, today stays 10k, past/boss days unchanged
{ const st = newState('PLAN000003', '2026-10-01'); st.hostage = { rung: 3, streak: 2, since: '2026-09-29', settledThrough: '2026-09-30', bosses: [5] };
  settle(st, '2026-10-01'); assert.equal(goalToday(st), 10000); assert.deepEqual(st.hostage.bosses, [5]); assert.deepEqual(st.hostage.big, [9]); }
// migration: Marmalade on day 8 (old 15k mini-boss today) keeps it; later days follow the late plan
{ const st = newState('PLAN000004', '2026-10-01'); st.hostage = { rung: 9, streak: 7, since: '2026-09-24', settledThrough: '2026-09-30', bosses: [4, 8, 11, 14, 18] };
  settle(st, '2026-10-01'); assert.equal(goalToday(st), 15000); const p = planFor(9);
  assert.deepEqual(st.hostage.bosses, [4, 8, ...p.bosses.filter(d => d > 8)]); assert.deepEqual(st.hostage.big, p.big.filter(d => d > 8)); }
// unsynced gap: yesterday unsettled, today could be day streak+2 -> both slots keep the old goal
{ const st = newState('PLAN000005', '2026-10-01'); st.hostage = { rung: 3, streak: 7, since: '2026-09-23', settledThrough: '2026-09-29', bosses: [5] };
  st.days['2026-09-30'] = 12000; settle(st, '2026-10-01'); assert.equal(st.hostage.streak, 8); assert.equal(goalToday(st), 15000, 'day 9 could have been today'); }
console.log('✓ v0.8.0 day plans (legacy rungs unchanged, 20k finals r3+, escalating late plan, mid-day-safe migration)');

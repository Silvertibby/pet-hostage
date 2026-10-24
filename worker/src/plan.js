// v0.8.0 day plans (shared by worker + app; the two copies must match). Goals per day of a rescue run:
//  - Bunny, Hamster, Acorn (rungs 0-2): unchanged. Final day 15k; Acorn has the v0.5.2 15k mini-boss.
//  - Prickles .. Yuzu (rungs 3-8): v0.5.2 15k mini-bosses unchanged, final day 20k.
//  - Marmalade on (rung 9+, runs of 21+ days): an escalating plan. Warm-up (first ~30%) has a 15k every 3rd
//    day; after that a repeating 7-day block of 15k/20k/15k+15k with 10k breathers. A 20k day always sits between
//    10k days, never 3 hard days in a row, the day before the final is always a 10k breather, final day 20k.
export const GOAL = 10000, MID_GOAL = 15000, BIG_GOAL = 20000;
export const MINIBOSS_FROM_RUNG = 2, BIG_FINAL_FROM_RUNG = 3, LATE_PLAN_FROM_RUNG = 9;
const runDays = rung => 3 + 2 * rung;
export function legacyBossDays(rung) { // v0.5.2: floor((days-4)/3) 15k days spread evenly, never day 1 or the day before the final
  const n = runDays(rung); if (rung < MINIBOSS_FROM_RUNG) return [];
  const k = Math.floor((n - 4) / 3), out = [];
  for (let i = 1; i <= k; i++) { const d = Math.min(n - 2, Math.max(2, Math.round(1 + i * (n - 1) / (k + 1)))); if (!out.includes(d)) out.push(d); }
  return out;
}
const UNIT = [15, 10, 20, 10, 15, 15, 10]; // laid backward from 2 days before the final
// { bosses: [15k days before the final], big: [20k days, incl. the final when it's 20k] }
export function planFor(rung) {
  const n = runDays(rung);
  if (rung < BIG_FINAL_FROM_RUNG) return { bosses: legacyBossDays(rung), big: [] };
  if (rung < LATE_PLAN_FROM_RUNG) return { bosses: legacyBossDays(rung), big: [n] };
  const g = Array(n + 2).fill(10), a = Math.round(n * 0.3); g[n] = 20;
  for (let d = n - 2, i = 0; d > a; d--, i++) g[d] = UNIT[i % UNIT.length];
  for (let d = 4; d <= a; d += 3) if (g[d + 1] === 10 || d + 1 > a) g[d] = 15;
  for (let d = 2; d < n; d++) if (g[d] === 20) { if (g[d - 1] === 15) g[d - 1] = 10; if (g[d + 1] === 15) g[d + 1] = 10; }
  for (let d = 2; d < n; d++) if (g[d] > 10 && g[d - 1] > 10 && g[d + 1] > 10) g[d] = 10;
  const bosses = [], big = []; for (let d = 1; d <= n; d++) { if (g[d] === 15) bosses.push(d); if (g[d] === 20) big.push(d); }
  return { bosses, big };
}
// The goal of day `day` of a run of `need` days, given the run's 15k and 20k day lists.
export function dayGoal(day, need, bosses = [], big = []) {
  if (big.includes(day)) return BIG_GOAL;
  if ((need > 1 && day >= need) || bosses.includes(day)) return MID_GOAL;
  return GOAL;
}

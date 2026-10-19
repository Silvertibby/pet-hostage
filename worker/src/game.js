import { itemFor, owns, emptyCosmetics, VILLAINS, REWARDS, styleKey, hasStyle } from './shop.js';
// Pet Hostage v0.2 rules: a rescue LADDER. Tunable constants up top.
export const RULES = {
  GOAL: 10000,          // 10,000 a day. Not editable.
  FINAL_GOAL: 15000,    // v0.4.2: the last day before a rescue (day N of N) needs 15,000
  BASE_DAYS: 3,         // rung 0 (the bunny) needs 3 days in a row
  STEP_DAYS: 2,         // each rung after that needs +2
  TZ: 'America/Vancouver',
  HISTORY_DAYS: 60,
  DEATH_LOG_MAX: 30,
  PAUSE_COST: 30000,    // v0.5.0: Spare Steps for a Raccoon Pause (today doesn't count)
  BANK_LOG_MAX: 30,
};
// The ladder. After the last animal it loops with "II", "III"... (and keeps the +2 days).
export const ANIMALS = [
  { species: 'bunny', name: 'Chompsky' },
  { species: 'hamster', name: 'Nugget' },
  { species: 'squirrel', name: 'Acorn' },
  { species: 'hedgehog', name: 'Prickles' },
  { species: 'kitten', name: 'Mittens' },
  { species: 'duckling', name: 'Puddles' },
  { species: 'piglet', name: 'Truffle' },
  { species: 'panda', name: 'Bao' },
  { species: 'capybara', name: 'Yuzu' }, // v0.4.3: appended so nobody's rungs shift
  { species: 'unicorn', name: 'Marmalade' }, // v0.5.7: appended the same way (rung 9, 21 days)
];
// Cartoon deaths, in the order a pet meets them (offset by rung so the ladder varies). Each leaves its own patch-up.
export const DEATHS = ['pop', 'anvil', 'catapult', 'zap'];
export const DEATH_TEXT = {
  pop: 'had its head pop clean off',
  anvil: 'was flattened by an anvil',
  catapult: 'was launched off a catapult',
  zap: 'was struck by a very small lightning bolt',
};
const ROMAN = ['', '', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X'];

export const needFor = rung => RULES.BASE_DAYS + RULES.STEP_DAYS * rung;
// The goal for the hostage's next unsettled day: day (streak+1) of need. The final day is the 15k challenge.
export const isFinalDay = (streak, need) => streak + 1 >= need;
// v0.5.2 mini-bosses: from Acorn (rung 2, 7 days) on, floor((days-4)/3) extra 15k days, spread evenly,
// never day 1 and never the day before the final day. The final day stays the 15k boss.
export const MINIBOSS_FROM_RUNG = 2;
export function bossDaysFor(rung) {
  const n = needFor(rung); if (rung < MINIBOSS_FROM_RUNG) return [];
  const k = Math.floor((n - 4) / 3), out = [];
  for (let i = 1; i <= k; i++) { const d = Math.min(n - 2, Math.max(2, Math.round(1 + i * (n - 1) / (k + 1)))); if (!out.includes(d)) out.push(d); }
  return out;
}
// the run's mini-boss days; older runs (pre-v0.5.2) only get the ones still ahead (set at migration)
export const runBosses = h => Array.isArray(h.bosses) ? h.bosses : bossDaysFor(h.rung);
export const isBossDay = (h, day) => runBosses(h).includes(day);
export const goalFor = (streak, need, bosses = []) => isFinalDay(streak, need) || bosses.includes(streak + 1) ? RULES.FINAL_GOAL : RULES.GOAL;
export const goalToday = st => goalFor(st.hostage.streak, needFor(st.hostage.rung), runBosses(st.hostage));
export function animalFor(rung) {
  const a = ANIMALS[rung % ANIMALS.length], lap = Math.floor(rung / ANIMALS.length) + 1;
  return { species: a.species, name: a.name + (ROMAN[lap] ?? ' #' + lap) };
}
export const deathTypeFor = (rung, priorDeaths) => DEATHS[(rung + priorDeaths) % DEATHS.length];

export function localParts(ts = Date.now(), tz = RULES.TZ) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const p = Object.fromEntries(f.formatToParts(new Date(ts)).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: +p.hour, minute: +p.minute };
}
export function addDays(date, n) {
  const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function petAt(st, rung) {
  if (!st.pets[rung]) { const a = animalFor(rung); st.pets[rung] = { ...a, deaths: 0, injuries: [], rescuedOn: null, rescues: 0, firstKidnapped: null }; }
  return st.pets[rung];
}
function kidnap(st, rung, date) {
  const p = petAt(st, rung);
  p.rescuedOn = null; if (!p.firstKidnapped) p.firstKidnapped = date;
  st.hostage = { rung, streak: 0, since: date, settledThrough: st.hostage ? st.hostage.settledThrough : addDays(date, -1), bosses: bossDaysFor(rung) };
}

export function newState(code, today) {
  const st = { v: 2, code, started: today, pets: [], hostage: null, days: {}, lastSync: null, lastSteps: null, sub: null, sent: {}, events: [],
    syncLog: [], bank: 0, bankLog: [], paused: {}, deathCount: 0, deathSeen: 0, lastDeath: null, deathLog: [], bestRung: 0, stats: { metDays: 0, missedDays: 0, rescues: 0 } };
  kidnap(st, 0, today);
  return st;
}

// v0.1 -> v0.2: keep code, steps, sync log, push sub, sent nudges. The bunny becomes rung 1, streak 0, no deaths.
// The start day counts like any other: 10k = day 1, under 10k = the bunny dies (and comes back patched up).
export function migrate(old, today) {
  if (old && old.v === 2) return old;
  const st = newState(old.code, today);
  for (const k of ['days', 'lastSync', 'lastSteps', 'sub', 'sent', 'syncLog', 'lastPush']) if (old[k] !== undefined) st[k] = old[k];
  st.days = st.days || {}; st.sent = st.sent || {}; st.syncLog = st.syncLog || [];
  if (old.pet && old.pet.name && old.pet.name !== 'Chompsky') st.pets[0].name = old.pet.name;
  st.migratedFrom = { v: old.v || 1, at: today, petBorn: old.pet?.born };
  return st;
}

// Settle every finished day (< today). Returns events:
// {kind:'day', date, steps, met, rung, name, streak, need}
// {kind:'rescue', date, rung, name, species, next:{rung,name,species,need}}
// {kind:'death', date, steps, rung, name, species, type, deaths, rekidnap:{rung,name,species,need,same}}
// v0.5.0: Spare Steps. Older players start at 0 (no backfill).
export function normalize(st, today = localParts().date) {
  if (typeof st.bank !== 'number') st.bank = 0;
  if (!Array.isArray(st.bankLog)) st.bankLog = [];
  if (!st.paused || typeof st.paused !== 'object') st.paused = {};
  if (!st.dayGoals || typeof st.dayGoals !== 'object') st.dayGoals = {};
  if (!st.cosmetics || typeof st.cosmetics !== 'object') st.cosmetics = emptyCosmetics(); // v0.5.3: kept forever, deaths only empty the bank
  if (!st.cosmetics.unlocked || typeof st.cosmetics.unlocked !== 'object') st.cosmetics.unlocked = {};
  // v0.5.8 cheers: server copy of the friend list (by public friend ID), today's received cheers, per-day send counts
  if (!Array.isArray(st.friends)) st.friends = [];
  if (!Array.isArray(st.cheers)) st.cheers = [];
  if (typeof st.cheersTotal !== 'number') st.cheersTotal = 0;
  if (!st.cheerSent || typeof st.cheerSent !== 'object') st.cheerSent = {};
  st.cheers = st.cheers.filter(c => c.date === today); // a cheer only lives for the Pacific day it was sent
  for (const d of Object.keys(st.cheerSent)) if (d !== today) delete st.cheerSent[d];
  if (st.hostage) awardRewards(st); // v0.5.4 backfill: everything earned by the best shelf so far (not auto-worn)
  // v0.5.2 migration: a run already in progress keeps today and every closed day as they were; only days after today can be mini-bosses
  if (st.hostage && !Array.isArray(st.hostage.bosses)) {
    let open = 0; for (let d = addDays(st.hostage.settledThrough, 1); d <= today && open < 400; d = addDays(d, 1)) open++; // unsettled days incl. today
    const lastLocked = st.hostage.streak + Math.max(1, open); // the furthest day number that could be today
    st.hostage.bosses = bossDaysFor(st.hostage.rung).filter(d => d > lastLocked);
  }
  return st;
}
// v0.5.4: free styles for rescues, per villain. Permanent; returns what was newly given.
export const rescuedCount = st => Math.max(st.bestRung || 0, st.hostage ? st.hostage.rung : 0);
export function awardRewards(st, wear = false) {
  const n = rescuedCount(st), got = [];
  for (const [villain, list] of Object.entries(REWARDS)) {
    const u = st.cosmetics.unlocked[villain] = st.cosmetics.unlocked[villain] || [];
    for (const r of list) if (r.at <= n && !u.includes(styleKey(r.slot, r.style))) {
      u.push(styleKey(r.slot, r.style)); got.push({ villain, ...r });
      if (wear) { const eq = st.cosmetics.equipped[villain] = st.cosmetics.equipped[villain] || {}; (eq.styles = eq.styles || {})[r.slot] = r.style; }
    }
  }
  return got;
}
export function equipStyle(st, villain, slot, style) {
  normalize(st);
  const v = VILLAINS[villain]; if (!v || !v.styles || !v.styles[slot]) return { ok: false, error: 'no such slot' };
  if (style == null || style === '' || style === 'default') style = v.styles[slot][0];
  if (!v.styles[slot].includes(style)) return { ok: false, error: 'no such style' };
  if (!hasStyle(st.cosmetics, villain, slot, style)) return { ok: false, error: 'not unlocked' };
  const eq = st.cosmetics.equipped[villain] = st.cosmetics.equipped[villain] || {}, sty = eq.styles = eq.styles || {};
  if (style === v.styles[slot][0]) delete sty[slot]; else sty[slot] = style;
  return { ok: true };
}
export function bankMove(st, date, kind, amount) {
  st.bank = Math.max(0, st.bank + amount);
  st.bankLog = [{ date, kind, amount, bal: st.bank }, ...st.bankLog].slice(0, RULES.BANK_LOG_MAX);
}
// Raccoon Pause: today (PT) won't count at all. Paid up front, irreversible, one per day, only before today closes.
export function buyPause(st, today) {
  normalize(st);
  if (st.paused[today]) return { ok: false, error: 'already paused today' };
  if (today <= st.hostage.settledThrough) return { ok: false, error: 'today is already closed' };
  if (st.bank < RULES.PAUSE_COST) return { ok: false, error: 'not enough Spare Steps' };
  bankMove(st, today, 'pause', -RULES.PAUSE_COST);
  st.paused[today] = true;
  return { ok: true };
}

// v0.5.3 villain shop. Server-authoritative: validates item, shelf requirement and balance; ownership is permanent.
export function buyItem(st, today, villain, slot, color) {
  normalize(st, today);
  const it = itemFor(villain, slot, color);
  if (!it) return { ok: false, error: 'no such item' };
  if (owns(st.cosmetics, villain, slot, it.color)) return { ok: false, error: 'already owned' };
  if (st.hostage.rung < it.needShelf) return { ok: false, error: `needs ${it.needShelf} on the shelf` };
  if (st.bank < it.price) return { ok: false, error: 'not enough Spare Steps' };
  bankMove(st, today, 'shop', -it.price);
  const o = st.cosmetics.owned[villain] = st.cosmetics.owned[villain] || {};
  o[slot] = [...(o[slot] || []), it.color];
  (st.cosmetics.equipped[villain] = st.cosmetics.equipped[villain] || {})[slot] = it.color; // wear it straight away
  return { ok: true };
}
export function equipItem(st, villain, slot, color) {
  normalize(st);
  const v = VILLAINS[villain]; if (!v || !v.slots.includes(slot)) return { ok: false, error: 'no such slot' };
  const eq = st.cosmetics.equipped[villain] = st.cosmetics.equipped[villain] || {};
  if (color == null || color === '' || color === 'default') { delete eq[slot]; return { ok: true }; }
  if (!owns(st.cosmetics, villain, slot, color)) return { ok: false, error: 'not owned' };
  eq[slot] = color; return { ok: true };
}

export function settle(st, today) {
  normalize(st, today);
  const events = []; const h = st.hostage;
  let d = addDays(h.settledThrough, 1);
  while (d < today) {
    const r = st.hostage.rung, p = petAt(st, r), need = needFor(r);
    if (st.paused[d]) { // bought a pause: no progress, no miss, no death
      events.push({ kind: 'paused', date: d, steps: st.days[d] || 0, rung: r, name: p.name });
      st.hostage.settledThrough = d; d = addDays(d, 1); continue;
    }
    const goal = goalFor(st.hostage.streak, need, runBosses(st.hostage)), steps = st.days[d] || 0, met = steps >= goal;
    st.dayGoals[d] = goal; // what that day asked for (history shows 15k days)
    if (met) {
      st.hostage.streak++; st.stats.metDays++;
      if (steps > goal) bankMove(st, d, 'earn', steps - goal);
      events.push({ kind: 'day', date: d, steps, goal, met, rung: r, name: p.name, streak: st.hostage.streak, need });
      if (st.hostage.streak >= need) {
        p.rescuedOn = d; p.rescues++; st.stats.rescues++;
        kidnap(st, r + 1, addDays(d, 1));
        st.bestRung = Math.max(st.bestRung, r + 1);
        const n = petAt(st, r + 1), gifts = awardRewards(st, true);
        events.push({ kind: 'rescue', date: d, rung: r, name: p.name, species: p.species, gifts, next: { rung: r + 1, name: n.name, species: n.species, need: needFor(r + 1) } });
      }
    } else { // every day counts, including the first (no free starting day)
      const type = deathTypeFor(r, p.deaths);
      p.deaths++; p.injuries.push(type); st.stats.missedDays++;
      if (st.bank > 0) bankMove(st, d, 'reset', -st.bank); // a death empties the whole bank
      const back = Math.max(0, r - 1);
      kidnap(st, back, addDays(d, 1));
      const b = petAt(st, back);
      st.deathCount++;
      const ev = { kind: 'death', id: st.deathCount, date: d, steps, goal, rung: r, name: p.name, species: p.species, type, deaths: p.deaths,
        rekidnap: { rung: back, name: b.name, species: b.species, need: needFor(back), same: back === r } };
      st.lastDeath = ev;
      st.deathLog = [ev, ...(st.deathLog || [])].slice(0, RULES.DEATH_LOG_MAX);
      events.push(ev);
    }
    st.hostage.settledThrough = d;
    d = addDays(d, 1);
  }
  for (const k of Object.keys(st.dayGoals)) if (k < addDays(today, -RULES.HISTORY_DAYS)) delete st.dayGoals[k];
  for (const k of Object.keys(st.paused)) if (k < addDays(today, -RULES.HISTORY_DAYS)) delete st.paused[k];
  const keys = Object.keys(st.days).sort();
  while (keys.length > RULES.HISTORY_DAYS) delete st.days[keys.shift()];
  if (events.length) st.events = [...(st.events || []), ...events].slice(-20);
  return events;
}

export function mood(st, np) {
  if (st.paused && st.paused[np.date]) return 'happy';
  const steps = st.days[np.date] || 0, prog = steps / goalToday(st);
  if (prog >= 1) return 'happy';
  if (np.hour >= 21) return 'scared';
  const expected = Math.max(0, Math.min(1, (np.hour - 8) / 14)); // 8am..10pm
  if (np.hour >= 15 && prog < expected * 0.7) return 'worried';
  return 'happy';
}

const petView = (st, r) => { const p = petAt(st, r); return { rung: r, name: p.name, species: p.species, need: needFor(r), deaths: p.deaths, injuries: p.injuries, rescuedOn: p.rescuedOn, rescues: p.rescues }; };

export function view(st, now = Date.now()) {
  const np = localParts(now);
  const days = [];
  normalize(st, np.date);
  for (let i = 13; i >= 0; i--) { const d = addDays(np.date, -i); days.push({ date: d, steps: st.days[d] ?? null, paused: !!st.paused[d], goal: d === np.date ? goalToday(st) : (st.dayGoals[d] ?? null) }); }
  const h = st.hostage, todaySteps = st.days[np.date] || 0, goal = goalToday(st);
  const hostage = { ...petView(st, h.rung), streak: h.streak, since: h.since, todayMet: todaySteps >= goal, finalDay: isFinalDay(h.streak, needFor(h.rung)), goal };
  hostage.day = h.streak + 1; // today's day number toward rescue
  hostage.paused = !!st.paused[np.date];
  hostage.bosses = runBosses(h); hostage.bossToday = isBossDay(h, hostage.day) && !hostage.finalDay;
  const shelf = []; for (let r = 0; r < h.rung; r++) shelf.push(petView(st, r));
  const top = Math.max(st.bestRung, h.rung) + 1, ladder = [];
  for (let r = 0; r <= Math.max(top, ANIMALS.length - 1); r++) {
    const known = !!st.pets[r];
    const a = known ? st.pets[r] : animalFor(r);
    ladder.push({ rung: r, need: needFor(r), species: a.species, name: a.name, known, status: r < h.rung ? 'rescued' : r === h.rung ? 'hostage' : 'locked', deaths: known ? st.pets[r].deaths : 0, injuries: known ? st.pets[r].injuries : [] });
  }
  return {
    v: 2, today: np.date, hour: np.hour, goal, baseGoal: RULES.GOAL, finalGoal: RULES.FINAL_GOAL, todaySteps,
    lastSync: st.lastSync, lastSteps: st.lastSteps,
    hostage, shelf, ladder, mood: mood(st, np), days,
    lastDeath: st.lastDeath, deathSeen: st.deathSeen || 0, deathLog: (st.deathLog || []).slice(0, 10),
    stats: st.stats, bestRung: st.bestRung, started: st.started,
    push: !!st.sub, events: (st.events || []).slice(-5),
    cheers: st.cheers.filter(c => c.date === np.date).map(({ id, from, name, msg, at, date, reply }) => ({ id, from, name, msg, at, date, reply: !!reply })), cheersTotal: st.cheersTotal, displayName: st.displayName || null, friends: st.friends,
    bank: st.bank, bankLog: st.bankLog.slice(0, 10), cosmetics: st.cosmetics, pauseCost: RULES.PAUSE_COST, pausedToday: !!st.paused[np.date], friendId: st.friendId || null,
    code: st.code, syncLog: (st.syncLog || []).slice(0, 5),
    garmin: st.garmin ? { lastSync: st.garmin.lastSync || null, lastSteps: st.garmin.lastSteps ?? null, lastError: st.garmin.lastError || null, lastErrorAt: st.garmin.lastErrorAt || null } : null,
    android: st.android ? { lastSync: st.android.lastSync || null, lastSteps: st.android.lastSteps ?? null, app: st.android.app || null } : null,
    // v0.1 app compat (a stale cached app shouldn't crash before it updates)
    pet: { name: hostage.name, born: h.since, alive: true, died: null, peril: 0, streak: h.streak, bestStreak: h.streak, metDays: st.stats.metDays, missedDays: st.stats.missedDays },
    perilLabel: `Day ${hostage.day} of ${hostage.need}`, deathAt: 1, graveyard: [],
  };
}

// v0.5.0: what a friend may see. Never includes the sync code, logs, push sub or bank details.
export function publicView(st, now = Date.now()) {
  normalize(st);
  const np = localParts(now), h = st.hostage, p = petAt(st, h.rung), need = needFor(h.rung), goal = goalToday(st), todaySteps = st.days[np.date] || 0;
  return { friendId: st.friendId, today: np.date, hour: np.hour, name: p.name, species: p.species, rung: h.rung, need, day: h.streak + 1, streak: h.streak,
    goal, todaySteps, todayMet: todaySteps >= goal, finalDay: isFinalDay(h.streak, need), paused: !!st.paused[np.date], mood: mood(st, np),
    deaths: p.deaths, injuries: p.injuries, shelf: h.rung, lastSync: st.lastSync, look: (st.cosmetics.equipped || {}).raccoon || {}, bosses: runBosses(h), bossToday: isBossDay(h, h.streak + 1) && !isFinalDay(h.streak, need) };
}

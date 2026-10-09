// Pet Hostage v0.2 rules: a rescue LADDER. Tunable constants up top.
export const RULES = {
  GOAL: 10000,          // always 10,000. Not editable.
  BASE_DAYS: 3,         // rung 0 (the bunny) needs 3 days in a row
  STEP_DAYS: 2,         // each rung after that needs +2
  TZ: 'America/Vancouver',
  HISTORY_DAYS: 60,
  DEATH_LOG_MAX: 30,
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
  st.hostage = { rung, streak: 0, since: date, settledThrough: st.hostage ? st.hostage.settledThrough : addDays(date, -1) };
}

export function newState(code, today) {
  const st = { v: 2, code, started: today, pets: [], hostage: null, days: {}, lastSync: null, lastSteps: null, sub: null, sent: {}, events: [],
    syncLog: [], deathCount: 0, deathSeen: 0, lastDeath: null, deathLog: [], bestRung: 0, stats: { metDays: 0, missedDays: 0, rescues: 0 } };
  kidnap(st, 0, today);
  return st;
}

// v0.1 -> v0.2: keep code, steps, sync log, push sub, sent nudges. The bunny becomes rung 1, streak 0, no deaths.
// The start day counts toward day 1 if it reaches 10k, and can't kill anyone if it doesn't (same as v0.1's adoption day).
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
// {kind:'day', date, steps, met, grace?, rung, name, streak, need}
// {kind:'rescue', date, rung, name, species, next:{rung,name,species,need}}
// {kind:'death', date, steps, rung, name, species, type, deaths, rekidnap:{rung,name,species,need,same}}
export function settle(st, today) {
  const events = []; const h = st.hostage;
  let d = addDays(h.settledThrough, 1);
  while (d < today) {
    const steps = st.days[d] || 0, met = steps >= RULES.GOAL;
    const r = st.hostage.rung, p = petAt(st, r), need = needFor(r);
    if (met) {
      st.hostage.streak++; st.stats.metDays++;
      events.push({ kind: 'day', date: d, steps, met, rung: r, name: p.name, streak: st.hostage.streak, need });
      if (st.hostage.streak >= need) {
        p.rescuedOn = d; p.rescues++; st.stats.rescues++;
        kidnap(st, r + 1, addDays(d, 1));
        st.bestRung = Math.max(st.bestRung, r + 1);
        const n = petAt(st, r + 1);
        events.push({ kind: 'rescue', date: d, rung: r, name: p.name, species: p.species, next: { rung: r + 1, name: n.name, species: n.species, need: needFor(r + 1) } });
      }
    } else if (d === st.started) {
      events.push({ kind: 'day', date: d, steps, met, grace: true, rung: r, name: p.name, streak: st.hostage.streak, need });
    } else {
      const type = deathTypeFor(r, p.deaths);
      p.deaths++; p.injuries.push(type); st.stats.missedDays++;
      const back = Math.max(0, r - 1);
      kidnap(st, back, addDays(d, 1));
      const b = petAt(st, back);
      st.deathCount++;
      const ev = { kind: 'death', id: st.deathCount, date: d, steps, rung: r, name: p.name, species: p.species, type, deaths: p.deaths,
        rekidnap: { rung: back, name: b.name, species: b.species, need: needFor(back), same: back === r } };
      st.lastDeath = ev;
      st.deathLog = [ev, ...(st.deathLog || [])].slice(0, RULES.DEATH_LOG_MAX);
      events.push(ev);
    }
    st.hostage.settledThrough = d;
    d = addDays(d, 1);
  }
  const keys = Object.keys(st.days).sort();
  while (keys.length > RULES.HISTORY_DAYS) delete st.days[keys.shift()];
  if (events.length) st.events = [...(st.events || []), ...events].slice(-20);
  return events;
}

export function mood(st, np) {
  const steps = st.days[np.date] || 0, prog = steps / RULES.GOAL;
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
  for (let i = 13; i >= 0; i--) { const d = addDays(np.date, -i); days.push({ date: d, steps: st.days[d] ?? null }); }
  const h = st.hostage, todaySteps = st.days[np.date] || 0;
  const hostage = { ...petView(st, h.rung), streak: h.streak, since: h.since, todayMet: todaySteps >= RULES.GOAL };
  hostage.day = h.streak + 1; // today's day number toward rescue
  const shelf = []; for (let r = 0; r < h.rung; r++) shelf.push(petView(st, r));
  const top = Math.max(st.bestRung, h.rung) + 1, ladder = [];
  for (let r = 0; r <= Math.max(top, ANIMALS.length - 1); r++) {
    const known = !!st.pets[r];
    const a = known ? st.pets[r] : animalFor(r);
    ladder.push({ rung: r, need: needFor(r), species: a.species, name: a.name, known, status: r < h.rung ? 'rescued' : r === h.rung ? 'hostage' : 'locked', deaths: known ? st.pets[r].deaths : 0, injuries: known ? st.pets[r].injuries : [] });
  }
  return {
    v: 2, today: np.date, hour: np.hour, goal: RULES.GOAL, todaySteps,
    lastSync: st.lastSync, lastSteps: st.lastSteps,
    hostage, shelf, ladder, mood: mood(st, np), days,
    lastDeath: st.lastDeath, deathSeen: st.deathSeen || 0, deathLog: (st.deathLog || []).slice(0, 10),
    stats: st.stats, bestRung: st.bestRung, started: st.started,
    push: !!st.sub, events: (st.events || []).slice(-5),
    code: st.code, syncLog: (st.syncLog || []).slice(0, 5),
    // v0.1 app compat (a stale cached app shouldn't crash before it updates)
    pet: { name: hostage.name, born: h.since, alive: true, died: null, peril: 0, streak: h.streak, bestStreak: h.streak, metDays: st.stats.metDays, missedDays: st.stats.missedDays },
    perilLabel: `Day ${hostage.day} of ${hostage.need}`, deathAt: 1, graveyard: [],
  };
}

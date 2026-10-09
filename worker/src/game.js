// Pet Hostage rules. Tunable constants up top.
export const RULES = {
  DEFAULT_GOAL: 10000,
  DEATH_AT: 3,          // missed days in a row (peril stages) until the pet is gone
  TZ: 'America/Vancouver',
  DEFAULT_PET: 'Chompsky',
  SPECIES: 'bunny',
  GRAVEYARD_MAX: 30,
  HISTORY_DAYS: 60,
};
export const PERIL_LABELS = ['Caged (oblivious)', 'Tied to a chair', 'Dangling over the stew pot', 'Gone'];

export function localParts(ts = Date.now(), tz = RULES.TZ) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const p = Object.fromEntries(f.formatToParts(new Date(ts)).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: +p.hour, minute: +p.minute };
}
export function addDays(date, n) {
  const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function newPet(name, today) {
  return { name: (name || RULES.DEFAULT_PET).slice(0, 24), species: RULES.SPECIES, born: today, alive: true, died: null, peril: 0, streak: 0, bestStreak: 0, settledThrough: addDays(today, -1), metDays: 0, missedDays: 0 };
}
export function newState(code, today) {
  return { v: 1, code, goal: RULES.DEFAULT_GOAL, pet: newPet(null, today), days: {}, lastSync: null, lastSteps: null, graveyard: [], sub: null, sent: {}, events: [] };
}

// Settle every finished day (< today). Returns list of events {date, met, steps, peril, died}.
export function settle(state, today) {
  const pet = state.pet; const events = [];
  if (!pet.alive) return events;
  let d = addDays(pet.settledThrough, 1);
  while (d < today && pet.alive) {
    const steps = state.days[d] || 0;
    const met = steps >= state.goal;
    const grace = d === pet.born; // adoption day can only help you
    if (met) {
      pet.streak++; pet.metDays++; pet.bestStreak = Math.max(pet.bestStreak, pet.streak);
      pet.peril = Math.max(0, pet.peril - 1);
    } else if (!grace) {
      pet.streak = 0; pet.missedDays++; pet.peril++;
      if (pet.peril >= RULES.DEATH_AT) { pet.alive = false; pet.died = d; }
    }
    pet.settledThrough = d;
    events.push({ date: d, met, steps, peril: pet.peril, died: !pet.alive, grace: grace && !met });
    d = addDays(d, 1);
  }
  // trim old history
  const keys = Object.keys(state.days).sort();
  while (keys.length > RULES.HISTORY_DAYS) delete state.days[keys.shift()];
  if (events.length) { state.events = [...(state.events || []), ...events].slice(-20); }
  return events;
}

export function mood(state, nowParts) {
  const pet = state.pet;
  if (!pet.alive) return 'ghost';
  const steps = state.days[nowParts.date] || 0;
  const prog = steps / state.goal;
  if (prog >= 1) return 'happy';
  if (pet.peril >= 2) return 'peril';
  if (pet.peril === 1) return 'scared';
  // peril 0: worry as the day goes on and you're behind pace
  const expected = Math.max(0, Math.min(1, (nowParts.hour - 8) / 14)); // 8am..10pm
  if (nowParts.hour >= 15 && prog < expected * 0.7) return 'worried';
  return 'happy';
}

export function view(state, now = Date.now()) {
  const np = localParts(now);
  const days = [];
  for (let i = 13; i >= 0; i--) { const d = addDays(np.date, -i); days.push({ date: d, steps: state.days[d] ?? null }); }
  return {
    today: np.date, hour: np.hour, goal: state.goal,
    todaySteps: state.days[np.date] || 0,
    lastSync: state.lastSync, lastSteps: state.lastSteps,
    pet: state.pet, mood: mood(state, np), perilLabel: PERIL_LABELS[Math.min(state.pet.peril, 3)],
    deathAt: RULES.DEATH_AT, graveyard: state.graveyard, days,
    push: !!state.sub, events: (state.events || []).slice(-5),
  };
}

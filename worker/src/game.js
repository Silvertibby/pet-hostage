import { ACHIEVEMENTS, achById } from './cheers.js';
import { colorById, itemFor, owns, emptyCosmetics, VILLAINS, REWARDS, styleKey, hasStyle, wallById, wallPrice, wallNeed, roomOf, BULBS, BULB_PRICE, WALL_NEED_RESCUED } from './shop.js';
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
export const isFinalDay = (streak, need) => need > 1 && streak + 1 >= need; // the 1-day potato has no 15k final
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
// v0.6.9 Easter egg: five bunny deaths in a row and a pet potato (rung -1, 1 day at 10k) is taken instead.
// Its misses don't kill or escalate; one made day sends you back to the bunny. Can happen again after 5 more.
export const POTATO_RUNG = -1, POTATO_AFTER = 5, POTATO = { species: 'potato', name: 'Couch Potato' };
export function animalFor(rung) {
  if (rung === POTATO_RUNG) return { ...POTATO };
  const a = ANIMALS[rung % ANIMALS.length], lap = Math.floor(rung / ANIMALS.length) + 1;
  return { species: a.species, name: a.name + (ROMAN[lap] ?? ' #' + lap) };
}
export const deathTypeFor = (rung, priorDeaths) => DEATHS[(((rung + priorDeaths) % DEATHS.length) + DEATHS.length) % DEATHS.length];

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
  if (rung === POTATO_RUNG) { if (st.potato && st.potato.name === 'Spud') st.potato.name = POTATO.name; // v0.7.0 rename
    if (!st.potato) { st.potato = { ...POTATO, deaths: 0, injuries: [], rescuedOn: null, rescues: 0, firstKidnapped: null }; } return st.potato; }
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
  if (today) backfillLedger(st, today);
  for (const d of Object.keys(st.cheerSent)) if (d !== today) delete st.cheerSent[d];
  if (today && !st.stockRefund) refundStockColors(st, today);
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
// ctx (v0.5.9): what it was for. shop: { item: 'villain:slot:color' }; cheer/reply: { to: friendId, name: their name at send time }
export function bankMove(st, date, kind, amount, ctx) {
  st.bank = Math.max(0, st.bank + amount);
  st.bankLog = [{ date, kind, amount, bal: st.bank, ...(ctx || {}) }, ...st.bankLog].slice(0, RULES.BANK_LOG_MAX);
}
// v0.6.0: paid colors that matched a slot's stock color were removed. Anyone who bought one gets the price back
// (noted in history) and that slot goes back to default. Runs once per player.
function refundStockColors(st, today) {
  for (const [v, slots] of Object.entries(st.cosmetics.owned || {})) for (const [sl, cols] of Object.entries(slots || {})) {
    for (const cid of [...(cols || [])]) { const c = colorById(cid); if (!c || !(c.notFor || []).includes(sl)) continue;
      slots[sl] = slots[sl].filter(x => x !== cid);
      bankMove(st, today, 'refund', c.price, { item: `${v}:${sl}:${cid}` });
      const eq = st.cosmetics.equipped[v]; if (eq && eq[sl] === cid) delete eq[sl]; }
  }
  st.stockRefund = 1;
}
// Backfill context on old ledger entries where it can be derived without guessing.
function backfillLedger(st, today) {
  const shop = st.bankLog.filter(e => e.kind === 'shop' && !e.item);
  if (shop.length) {
    const taken = new Set(st.bankLog.filter(e => e.item).map(e => e.item)), all = [];
    for (const [v, slots] of Object.entries(st.cosmetics.owned || {})) for (const [sl, cols] of Object.entries(slots || {})) for (const c of cols || []) { const it = itemFor(v, sl, c); if (it) all.push({ key: `${v}:${sl}:${c}`, price: it.price }); }
    for (const e of shop) { const m = all.filter(x => !taken.has(x.key) && x.price === -e.amount); if (m.length === 1) { e.item = m[0].key; taken.add(m[0].key); } } // only a unique price match
  }
  const sent = st.cheerSent[today] || {}, tos = Object.keys(sent);
  if (tos.length === 1) for (const e of st.bankLog) if (e.kind === 'cheer' && !e.to && e.date === today) e.to = tos[0]; // one recipient today: unambiguous
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
  if (villain === 'room' && slot === 'bulb') { // v0.7.7 bulb skins
    const id = color; if (!id || id === 'basic' || !BULBS[id]) return { ok: false, error: 'no such item' };
    const r = roomOf(st.cosmetics); if (r.bulbs.includes(id)) return { ok: false, error: 'already owned' };
    if (rescuedCount(st) < WALL_NEED_RESCUED) return { ok: false, error: `needs ${WALL_NEED_RESCUED} on the shelf` };
    if (st.bank < BULB_PRICE) return { ok: false, error: 'not enough Spare Steps' };
    bankMove(st, today, 'shop', -BULB_PRICE, { item: `room:bulb:${id}` });
    st.cosmetics.room = { ...r, bulbs: [...r.bulbs, id], bulb: id }; return { ok: true };
  }
  if (villain === 'room') { // v0.7.3 brick walls
    const w = slot === 'wall' && wallById(color); if (!w) return { ok: false, error: 'no such item' };
    const r = roomOf(st.cosmetics); if (r.walls.includes(w.id)) return { ok: false, error: 'already owned' };
    if (rescuedCount(st) < wallNeed(w)) return { ok: false, error: `needs ${wallNeed(w)} on the shelf` };
    if (st.bank < wallPrice(w)) return { ok: false, error: 'not enough Spare Steps' };
    bankMove(st, today, 'shop', -wallPrice(w), { item: `room:wall:${w.id}` });
    st.cosmetics.room = { ...r, walls: [...r.walls, w.id], wall: w.id }; return { ok: true };
  }
  const it = itemFor(villain, slot, color);
  if (!it) return { ok: false, error: 'no such item' };
  if (owns(st.cosmetics, villain, slot, it.color)) return { ok: false, error: 'already owned' };
  if (st.hostage.rung < it.needShelf) return { ok: false, error: `needs ${it.needShelf} on the shelf` };
  if (st.bank < it.price) return { ok: false, error: 'not enough Spare Steps' };
  bankMove(st, today, 'shop', -it.price, { item: `${villain}:${slot}:${it.color}` });
  const o = st.cosmetics.owned[villain] = st.cosmetics.owned[villain] || {};
  o[slot] = [...(o[slot] || []), it.color];
  (st.cosmetics.equipped[villain] = st.cosmetics.equipped[villain] || {})[slot] = it.color; // wear it straight away
  return { ok: true };
}
export function equipItem(st, villain, slot, color) {
  normalize(st);
  if (villain === 'room' && slot === 'bulb') { const r = roomOf(st.cosmetics);
    if (color == null || color === '' || color === 'default' || color === 'basic') { st.cosmetics.room = { ...r, bulb: 'basic' }; return { ok: true }; }
    if (!r.bulbs.includes(color)) return { ok: false, error: 'not owned' };
    st.cosmetics.room = { ...r, bulb: color }; return { ok: true }; }
  if (villain === 'room') { if (slot !== 'wall') return { ok: false, error: 'no such slot' };
    const r = roomOf(st.cosmetics);
    if (color == null || color === '' || color === 'default') { st.cosmetics.room = { ...r, wall: null }; return { ok: true }; }
    if (!r.walls.includes(color)) return { ok: false, error: 'not owned' };
    st.cosmetics.room = { ...r, wall: color }; return { ok: true }; }
  const v = VILLAINS[villain]; if (!v || !v.slots.includes(slot)) return { ok: false, error: 'no such slot' };
  const eq = st.cosmetics.equipped[villain] = st.cosmetics.equipped[villain] || {};
  if (color == null || color === '' || color === 'default') { delete eq[slot]; return { ok: true }; }
  if (!owns(st.cosmetics, villain, slot, color)) return { ok: false, error: 'not owned' };
  eq[slot] = color; return { ok: true };
}

export const RESETTLE_KEYS = ['hostage', 'pets', 'potato', 'bunnyMisses', 'stats', 'bank', 'deathCount', 'lastDeath', 'deathLog', 'bestRung', 'dayGoals'];
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
    // v0.6.5 morning top-up: before yesterday settles as a miss, keep what it undoes (inside this record, no extra writes)
    if (d === addDays(today, -1)) { if (met) delete st.resettle; } if (!met && d === addDays(today, -1)) st.resettle = { date: d, snap: JSON.parse(JSON.stringify(RESETTLE_KEYS.reduce((o, k) => (o[k] = st[k], o), {}))) };
    st.dayGoals[d] = goal; // what that day asked for (history shows 15k days)
    if (r === POTATO_RUNG) { // the potato: a made day frees it, a miss just keeps it (no death, no bank reset)
      if (met) { st.hostage.streak++; st.stats.metDays++; if (steps > goal) bankMove(st, d, 'earn', steps - goal);
        p.rescuedOn = d; p.rescues++; st.bunnyMisses = 0; kidnap(st, 0, addDays(d, 1));
        const n = petAt(st, 0);
        events.push({ kind: 'day', date: d, steps, goal, met, rung: r, name: p.name, streak: 1, need });
        events.push({ kind: 'rescue', date: d, rung: r, name: p.name, species: p.species, gifts: [], potato: true, next: { rung: 0, name: n.name, species: n.species, need: needFor(0) } });
      } else { st.stats.missedDays++; events.push({ kind: 'day', date: d, steps, goal, met, rung: r, name: p.name, streak: 0, need }); }
      st.hostage.settledThrough = d; d = addDays(d, 1); continue;
    }
    if (met) {
      st.bunnyMisses = 0;
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
      st.bunnyMisses = r === 0 ? (st.bunnyMisses || 0) + 1 : 0;
      let back = Math.max(0, r - 1);
      if (r === 0 && st.bunnyMisses >= POTATO_AFTER) { back = POTATO_RUNG; st.bunnyMisses = 0; }
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

// last 14 days for the history chart (also shown to friends: counts, goals, paused only)
const dayChart = (st, today) => { const days = []; for (let i = 13; i >= 0; i--) { const d = addDays(today, -i); days.push({ date: d, steps: st.days[d] ?? null, paused: !!st.paused[d], goal: d === today ? goalToday(st) : (st.dayGoals[d] ?? null) }); } return days; };
export function view(st, now = Date.now()) {
  const np = localParts(now);
  normalize(st, np.date); updateAch(st, np.date);
  const days = dayChart(st, np.date);
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
    cheers: st.cheers.filter(c => c.date === np.date).map(({ id, kind, from, name, msg, at, date }) => ({ id, kind: kind || 'cheer', from, name, msg, at, date })), cheersTotal: st.cheersTotal, displayName: st.displayName || null, friends: st.friends, newFriends: st.newFriends || [],
    bank: st.bank, bankLog: st.bankLog.slice(0, 10), cosmetics: st.cosmetics, pauseCost: RULES.PAUSE_COST, pausedToday: !!st.paused[np.date], friendId: st.friendId || null,
    code: st.code, syncLog: st.syncLog || [], ach: st.ach || { earned: {}, claimed: {} }, pSent: (st.pSent || []).filter(x => x.date === np.date),
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
    deaths: p.deaths, injuries: p.injuries, shelf: Math.max(0, h.rung), lastSync: st.lastSync, look: (st.cosmetics.equipped || {}).raccoon || {}, room: { wall: roomOf(st.cosmetics).wall, bulb: roomOf(st.cosmetics).bulb }, bosses: runBosses(h), bossToday: isBossDay(h, h.streak + 1) && !isFinalDay(h.streak, need),
    days: dayChart(st, np.date), started: st.started, baseGoal: RULES.GOAL }; // v0.6.7 friend history
}

// v0.7.8 achievements. Earned flags are stored (so they survive history pruning) and only written when one is new.
// Past rescues count retroactively (rescuedCount). Streaks may include today.
export function updateAch(st, today) {
  const a = st.ach && typeof st.ach === 'object' ? st.ach : (st.ach = { earned: {}, claimed: {} });
  a.earned = a.earned || {}; a.claimed = a.claimed || {};
  const earn = id => { if (!a.earned[id]) a.earned[id] = today; };
  for (let i = 1; i <= Math.min(10, rescuedCount(st)); i++) earn('r' + i);
  const keys = Object.keys(st.days || {}).filter(d => d <= today).sort();
  for (const d of keys) {
    const v = st.days[d] || 0;
    for (const [id, min] of [['s15', 15000], ['s20', 20000], ['s25', 25000]])
      if (v >= min && (st.days[addDays(d, -1)] || 0) >= min && (st.days[addDays(d, -2)] || 0) >= min) earn(id);
  }
  return a;
}
export function claimAch(st, today, id) {
  const x = achById(id); if (!x) return { ok: false, error: 'no such achievement' };
  const a = updateAch(st, today);
  if (!a.earned[id]) return { ok: false, error: 'not earned' };
  if (a.claimed[id]) return { ok: false, error: 'already claimed' };
  a.claimed[id] = today; bankMove(st, today, 'ach', x.amount, { ach: id }); return { ok: true };
}

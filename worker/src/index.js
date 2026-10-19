import { RULES, localParts, newState, migrate, settle, view, petAt, needFor, goalToday, DEATH_TEXT, normalize, addDays, buyPause, publicView, buyItem, equipItem, equipStyle } from './game.js';
import { note, nudgeText, DISH, ITEM, PET_EMOJI } from './messages.js';
import { sendPush } from './push.js';
import { revivedVars } from './revived.js';
import { CHEER_COST, CHEER_DAILY_MAX, cheerById, cleanName, WIN_LINES, MISS_LINES } from './cheers.js';
import { bankMove } from './game.js';

// Multi-player: one KV key per player, "player:<CODE>". The old single-player key "state" is migrated once.
const PKEY = c => 'player:' + c;
const LEGACY = 'state';
// Twice-daily nudges (PT minutes after midnight), only while today is under 10k. Two voices: the hostage
// pleading and The Raccoon taunting; one of each per day, order picked per player per day. Morning report at REPORT_HOUR.
export const NUDGES2 = [{ id: 'n1300', at: 13 * 60, slot: 'afternoon' }, { id: 'n1930', at: 19 * 60 + 30, slot: 'evening' }];
const NUDGE_WINDOW = 90; // minutes: a missed cron tick still sends, a stale one doesn't
const REPORT_HOUR = 8;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', ...cors } });
const text = (t, s = 200) => new Response(t, { status: s, headers: { 'Content-Type': 'text/plain; charset=utf-8', ...cors } });

const normCode = c => (c || '').toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
// Old states (v0.1 shape) are upgraded on read, keeping code, steps, sync log and push subscription.
const load = async (env, code) => {
  if (!code) return null;
  const s = await env.PH.get(PKEY(code)); if (!s) return null;
  let st = JSON.parse(s);
  if (st.v !== 2) { st = migrate(st, localParts().date); await env.PH.put(PKEY(code), JSON.stringify(st)); }
  const needsBosses = !(st.hostage && Array.isArray(st.hostage.bosses));
  normalize(st);
  if (needsBosses) await env.PH.put(PKEY(code), JSON.stringify(st)); // v0.5.2: lock in the remaining mini-boss days once
  if (!st.friendId) await assignFriendId(env, st);
  return st;
};
// v0.5.0: a public friend ID, separate from the secret sync code. Index: fid:<ID> -> code.
const FKEY = id => 'fid:' + id;
const normFid = id => (id || '').toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
async function assignFriendId(env, st) {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let id; do { id = [...crypto.getRandomValues(new Uint8Array(6))].map(x => alphabet[x % alphabet.length]).join(''); } while (await env.PH.get(FKEY(id)));
  st.friendId = id;
  await env.PH.put(FKEY(id), st.code);
  await env.PH.put(PKEY(st.code), JSON.stringify(st)); // only adds the friendId field
}
async function loadFriend(env, id) {
  id = normFid(id); if (!id) return null;
  const c = await env.PH.get(FKEY(id)); if (!c) return null;
  const st = await load(env, c); if (!st || st.friendId !== id) return null;
  settle(st, localParts().date); // read-only: settled in memory for an up-to-date view, never saved here
  return publicView(st);
}
// v0.6.0 double-spend guard: every save re-reads the record and refuses if someone else saved since we loaded it
// (rev mismatch). The request is then re-run from a fresh load (see fetch). KV has no compare-and-swap, so this
// narrows the window to the re-read/write gap rather than closing it completely.
// Requests for one player run one at a time inside this worker instance (the rev check covers other instances).
const locks = new Map();
async function withLock(key, fn) {
  if (!key) return fn();
  const prev = locks.get(key) || Promise.resolve(); let release; const mine = new Promise(r => { release = r; });
  const chain = prev.then(() => mine); locks.set(key, chain);
  try { await prev; return await fn(); } finally { release(); if (locks.get(key) === chain) locks.delete(key); }
}
class Conflict extends Error { constructor() { super('conflict'); this.conflict = true; } }
const save = async (env, st) => {
  const cur = await env.PH.get(PKEY(st.code));
  if (cur && (JSON.parse(cur).rev || 0) !== (st.rev || 0)) throw new Conflict();
  st.rev = (st.rev || 0) + 1;
  await env.PH.put(PKEY(st.code), JSON.stringify(st));
};
// ---- v0.6.0 inbox: cheers and replies live under their own keys (inbox:<friendId>:<id>), never inside the
// recipient's player record, so sending one can't overwrite anyone's game. Only the owner rewrites its items.
const IKEY = (fid, id) => `inbox:${fid}:${id}`;
const INBOX_TTL = 3 * 86400;
const putItem = (env, fid, it) => env.PH.put(IKEY(fid, it.id), JSON.stringify(it), { expirationTtl: INBOX_TTL });
const rid = () => Date.now().toString(36) + '-' + [...crypto.getRandomValues(new Uint8Array(3))].map(x => x.toString(16).padStart(2, '0')).join('');
async function readInbox(env, fid) {
  const out = []; let cursor;
  do { const r = await env.PH.list({ prefix: `inbox:${fid}:`, cursor });
    for (const k of r.keys) { const v = await env.PH.get(k.name); if (v) try { out.push(JSON.parse(v)); } catch {} }
    cursor = r.list_complete ? null : r.cursor; } while (cursor);
  return out.sort((a, b) => a.at - b.at);
}
const myName = st => st.displayName || petAt(st, st.hostage.rung).name; // display name, else their current pet's name
const pick = (arr, seed) => { let h = 7; for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return arr[h % arr.length]; };
// Runs on every request and cron tick. Fills st.cheers (today's unseen banners), counts new cheers, books replies in the
// ledger, and sends the automatic replies: 'win' as soon as today's goal is met, 'miss' once a cheered day closed short.
// Returns writes to do AFTER the player record saved, so a conflict-retry never double-sends.
async function syncInbox(env, st, today, prev) {
  if (!st.friendId) return { changed: false, after: [] };
  const after = []; let changed = false;
  if (st.cheers.length && !st.inboxV) { // v0.5.8 cheers stored on the record: move them to the inbox
    for (const c of st.cheers) after.push(() => putItem(env, st.friendId, { id: 'm' + c.id + '-' + c.at, kind: 'cheer', from: c.from, name: c.name, msg: c.msg, at: c.at, date: c.date, counted: true }));
  }
  if (!st.inboxV) { st.inboxV = 1; changed = true; }
  if (!st.replied || typeof st.replied !== 'object') st.replied = {};
  for (const k of Object.keys(st.replied)) if (k < addDays(today, -3)) delete st.replied[k];
  const items = prev ? prev.items : [...await readInbox(env, st.friendId), ...st.cheers.filter(c => typeof c.id === 'number').map(c => ({ id: 'm' + c.id + '-' + c.at, kind: 'cheer', from: c.from, name: c.name, msg: c.msg, at: c.at, date: c.date, counted: true }))];
  const seenIds = new Set(); const uniq = items.filter(i => !seenIds.has(i.id) && seenIds.add(i.id));
  const me = myName(st);
  for (const it of uniq) {
    let dirty = false;
    if (it.kind === 'cheer' && !it.counted) { st.cheersTotal++; it.counted = true; dirty = changed = true; }
    if (it.kind !== 'cheer' && !it.booked) { bankMove(st, it.date, 'reply', 0, { to: it.from, name: it.name, outcome: it.kind, dir: 'in' }); it.booked = true; dirty = changed = true; }
    if (it.kind === 'cheer' && !it.done) {
      const d = it.date, steps = st.days[d] || 0, met = d === today ? steps >= goalToday(st) : steps >= (st.dayGoals[d] || RULES.GOAL);
      let outcome = null;
      if (st.paused[d]) { if (d < today) { it.done = 'paused'; dirty = true; } } // paused days stay silent
      else if (met) outcome = 'win';
      else if (d < today) outcome = 'miss';
      const rep = st.replied[d] = st.replied[d] || [];
      if (outcome && rep.includes(it.from)) { it.done = outcome; dirty = true; outcome = null; } // one reply per cheerer per day
      if (outcome) { rep.push(it.from);
        const line = pick(outcome === 'win' ? WIN_LINES : MISS_LINES, it.id);
        const reply = { id: `r-${d}-${st.friendId}`, kind: outcome, from: st.friendId, name: me, msg: line.id, at: Date.now(), date: today, re: it.id };
        bankMove(st, today, 'reply', 0, { to: it.from, name: it.name, outcome, dir: 'out' });
        it.done = outcome; dirty = changed = true;
        after.push(async () => { await putItem(env, it.from, reply); // deterministic id: a retry overwrites, never duplicates
          const sc = await env.PH.get(FKEY(it.from)), sst = sc && JSON.parse(await env.PH.get(PKEY(sc)) || 'null'); // read-only, for the push subscription
          if (sst && sst.sub) await push(env, sst, '↩ ' + me, line.text, 'ph-reply-' + reply.id); });
      }
    }
    if (dirty) after.push(() => putItem(env, st.friendId, it));
    if (it.date < addDays(today, -2)) after.push(() => env.PH.delete(IKEY(st.friendId, it.id))); // old ones (TTL also cleans up)
  }
  const show = uniq.filter(i => i.date === today && !i.seen).map(({ id, kind, from, name, msg, at, date }) => ({ id, kind, from, name, msg, at, date }));
  if (JSON.stringify(show) !== JSON.stringify(st.cheers)) { st.cheers = show; }
  return { changed, after, items: uniq };
}
// Save the player, then do the inbox writes that depend on it.
// base = this request's first inbox pass: re-run on the same in-memory items (picks up a goal just crossed) without double counting.
async function commit(env, st, today, pre, base) {
  let r = pre;
  if (!r) { const r2 = await syncInbox(env, st, today, base); r = base ? { after: [...base.after, ...r2.after] } : r2; }
  await save(env, st);
  for (const f of r.after) await f();
}
// One-time move of the single-player "state" key to player:<its code>. A copy stays under legacy:state.
let legacyChecked = false;
export async function migrateLegacy(env) {
  if (legacyChecked) return;
  const s = await env.PH.get(LEGACY);
  if (s) {
    let st = JSON.parse(s);
    if (st.v !== 2) st = migrate(st, localParts().date);
    if (st.code && !(await env.PH.get(PKEY(st.code)))) await env.PH.put(PKEY(st.code), JSON.stringify(st));
    await env.PH.put('legacy:state', s);
    await env.PH.delete(LEGACY);
    console.log('migrated legacy state to', PKEY(st.code));
  }
  legacyChecked = true;
}
export const _resetLegacyFlag = () => { legacyChecked = false; }; // tests
async function allCodes(env) {
  const codes = []; let cursor;
  do { const r = await env.PH.list({ prefix: 'player:', cursor }); for (const k of r.keys) codes.push(k.name.slice(7)); cursor = r.list_complete ? null : r.cursor; } while (cursor);
  return codes;
}

function makeCode() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const b = crypto.getRandomValues(new Uint8Array(10));
  return [...b].map(x => alphabet[x % alphabet.length]).join('');
}
function parseSteps(v) {
  if (v == null) return NaN;
  const m = String(v).replace(/[,\s\u00a0\u202f]/g, '').match(/\d+(\.\d+)?/);
  return m ? Math.round(parseFloat(m[0])) : NaN;
}
const n = x => Number(x).toLocaleString('en-US');
const vars = st => {
  const t = localParts().date; const steps = st.days[t] || 0;
  const h = st.hostage, p = petAt(st, h.rung), need = needFor(h.rung);
  const goal = goalToday(st);
  return { name: p.name, species: p.species, steps: n(steps), goal: n(goal), left: n(Math.max(0, goal - steps)), day: h.streak + 1, need, streak: h.streak, togo: need - h.streak };
};

async function push(env, st, title, body, tag) {
  if (!st.sub) return { ok: false, status: 0, text: 'no subscription' };
  if (!env.VAPID_PRIVATE_JWK) return { ok: false, status: 0, text: 'VAPID_PRIVATE_JWK secret missing' };
  try {
    const r = await sendPush(st.sub, { title, body, tag, url: env.APP_URL }, {
      publicKey: env.VAPID_PUBLIC_KEY, privateJwk: JSON.parse(env.VAPID_PRIVATE_JWK), subject: env.VAPID_SUBJECT,
    });
    if (r.gone) st.sub = null;
    st.lastPush = { at: Date.now(), status: r.status, ok: r.ok, text: r.text };
    return r;
  } catch (e) {
    st.lastPush = { at: Date.now(), status: 0, ok: false, text: String(e) };
    return { ok: false, status: 0, text: String(e) };
  }
}

// Morning report on newly settled days: one push, the most dramatic thing that happened (death > rescue > paid day).
async function reportEvents(env, st, events) {
  if (!events.length) return;
  const v = vars(st);
  const death = events.filter(e => e.kind === 'death').pop(), rescue = events.filter(e => e.kind === 'rescue').pop(), day = events.filter(e => e.kind === 'day' && e.met).pop();
  if (death) {
    const many = events.filter(e => e.kind === 'death').length;
    await push(env, st, '☠ RIP ' + death.name + (many > 1 ? ` (+${many - 1} more)` : ''), note(death.rekidnap.same ? 'diedSame' : 'died', { ...v, dead: death.name, how: DEATH_TEXT[death.type], re: death.rekidnap.name, need: death.rekidnap.need }), 'ph-report');
  } else if (rescue) {
    await push(env, st, '🎉 ' + rescue.name + ' rescued!', note('rescued', { ...v, dead: rescue.name, name: rescue.next.name, need: rescue.next.need }), 'ph-report');
  } else if (day) {
    await push(env, st, '🥕 Ransom paid', note(v.day >= v.need ? 'metFinal' : 'met', v), 'ph-report');
  }
}

// Single-user personal app: the code is NOT required (cheating is irrelevant and a lost code
// used to make the pet look "gone"). A code that is sent is still accepted, so existing Shortcut URLs keep working.
async function readBody(req) {
  let body = {};
  if (req.method === 'POST') {
    const ct = req.headers.get('content-type') || '';
    try {
      if (ct.includes('json')) body = await req.json();
      else if (ct.includes('form')) body = Object.fromEntries(await req.formData());
      else { const t = await req.text(); try { body = JSON.parse(t); } catch { body = { raw: t }; } }
    } catch { body = {}; }
  }
  return body;
}

const ROUTES = new Set(['/state', '/sync', '/settings', '/subscribe', '/sync-log/clear-test', '/unsubscribe', '/test-nudge', '/seen-death', '/pause', '/shop/buy', '/shop/equip', '/shop/style', '/friends/save', '/cheer', '/cheer/seen']);
const SYNC_LOG_MAX = 10;
function logSync(st, entry) {
  st.syncLog = [{ at: Date.now(), ...entry }, ...(st.syncLog || [])].slice(0, SYNC_LOG_MAX);
  console.log('sync', JSON.stringify(entry));
}
const clip = v => v == null ? null : String(v).slice(0, 80);

export default {
  async fetch(req, env) {
    let code = ''; try { code = normCode(new URL(req.url).searchParams.get('code') || (await readBody(req.clone())).code); } catch {}
    return withLock(code, async () => {
      for (let i = 0; i < 4; i++) {
        try { return await handle(req.clone(), env); } catch (e) { if (!e.conflict) throw e; }
      }
      return json({ error: 'busy, try again' }, 409);
    });
  },
  scheduled,
};
async function handle(req, env) {
  {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const today = localParts().date;

    if (path === '/') return text('Pet Hostage worker. The Raccoon is listening.');
    if (path === '/vapid') return json({ publicKey: env.VAPID_PUBLIC_KEY });
    await migrateLegacy(env);
    if (path === '/status') return json({ multiplayer: true });
    if (path === '/claim' && req.method === 'POST') { // every fresh player gets their own code + ladder
      let c; do { c = makeCode(); } while (await env.PH.get(PKEY(c)));
      const st = newState(c, today); await save(env, st);
      console.log('claim', c);
      return json({ code: st.code, state: view(st) });
    }

    if (path === '/friend') { // read-only, by public friend ID; no code needed or revealed
      const f = await loadFriend(env, url.searchParams.get('id'));
      return f ? json(f) : json({ error: 'unknown friend ID' }, 404);
    }
    if (path === '/friends') {
      const ids = [...new Set((url.searchParams.get('ids') || '').split(',').map(normFid).filter(Boolean))].slice(0, 50);
      const list = await Promise.all(ids.map(async id => (await loadFriend(env, id)) || { friendId: id, missing: true }));
      return json({ friends: list });
    }
    if (!ROUTES.has(path)) return json({ error: 'not found' }, 404); // unknown paths: 404 before any code lookup
    const body = await readBody(req);
    const code = normCode(url.searchParams.get('code') || body.code);
    const st = await load(env, code);
    if (!st) {
      // Codes separate players: never let a sync or read land in someone else's game.
      const error = code ? 'unknown code' : 'code required';
      if (path === '/sync') {
        console.log('sync', JSON.stringify({ ok: false, error, code: code || null, steps: clip(url.searchParams.get('steps') ?? body.steps) }));
        const msg = code ? `Unknown code ${code}. Nothing was saved. Open Pet Hostage → Step sync and copy your sync URL again.` : 'No code in the URL. Nothing was saved. Open Pet Hostage → Step sync and copy your sync URL.';
        if (req.method === 'GET' || url.searchParams.has('plain')) return text(msg, code ? 404 : 400);
        return json({ error, reason: msg }, code ? 404 : 400);
      }
      return json({ error }, code ? 404 : 400);
    }
    const events = settle(st, today);
    if (events.length) st.pendingReport = [...(st.pendingReport || []), ...events]; // pushed at the morning report

    const inbox = await syncInbox(env, st, today);
    if (path === '/state') { if (events.length || inbox.changed || inbox.after.length) await commit(env, st, today, inbox); return json(view(st)); }

    if (path === '/sync') {
      const src = clip(url.searchParams.get('src') ?? body.src ?? null) || undefined; // 'garmin' = server-side Garmin job
      const isGarmin = src === 'garmin';
      // The Android companion app reads Health Connect's deduped daily total (Garmin writes there too). Trusted like
      // Garmin in one way: it can only ever raise a day's count, never lower it.
      const isAndroid = src === 'android';
      const failure = url.searchParams.get('error') ?? body.error ?? null;
      if (isGarmin && failure != null) { // the Garmin job reports a failed attempt (reason only, never secrets)
        const reason = 'Garmin: ' + String(failure).slice(0, 160);
        st.garmin = { ...(st.garmin || {}), lastError: reason, lastErrorAt: Date.now() };
        logSync(st, { ok: false, src, reason, method: req.method, test: url.searchParams.has('test') || undefined });
        await commit(env, st, today, null, inbox);
        return json({ ok: false, logged: true, reason });
      }
      const raw = url.searchParams.get('steps') ?? body.steps ?? body.raw ?? null;
      // A steps param that is present but blank (e.g. "&steps=" when Health has no samples yet today, so the
      // Shortcut's Sum is empty) counts as 0: a valid sync that never lowers the day. No steps param at all is still an error.
      const hasSteps = url.searchParams.has('steps') || Object.prototype.hasOwnProperty.call(body, 'steps');
      const empty = hasSteps && (raw == null || String(raw).trim() === '');
      const test = url.searchParams.has('test') || !!body.test || undefined; // test entries can be cleared later
      const dry = url.searchParams.has('dry') || !!body.dry || undefined;     // validate + log only, never stores steps
      const codeNote = undefined; // the code always matches now: it's how we found this player
      const steps = empty ? 0 : parseSteps(raw);
      if (!Number.isFinite(steps) || steps < 0 || steps > 300000) {
        const reason = raw == null || raw === '' ? 'steps missing (is the Statistics Result variable after steps= ?)' : 'steps not a number: ' + clip(raw);
        logSync(st, { ok: false, reason, raw: clip(raw), method: req.method, codeNote, test, dry, src });
        await commit(env, st, today, null, inbox);
        return json({ error: 'steps missing or weird', reason, got: clip(raw) }, 400);
      }
      const date = /^\d{4}-\d{2}-\d{2}$/.test(body.date || url.searchParams.get('date') || '') ? (body.date || url.searchParams.get('date')) : today;
      if (dry) {
        logSync(st, { ok: true, dry, test, steps, raw: clip(raw), date, method: req.method, codeNote, reason: 'dry run, nothing stored' });
        await commit(env, st, today, null, inbox);
        return json({ ok: true, dry: true, steps, date });
      }
      const before = st.days[date] || 0;
      // Garmin (src=garmin) is authoritative: it sets the day's count. Once Garmin has reported a day, a laggy
      // Shortcut/Health sync can only raise the count, never lower it. Days with no Garmin report: latest wins.
      const g = st.garmin || (st.garmin = {});
      g.days = g.days || {};
      let stored = steps, note2;
      if (isGarmin) {
        g.days[date] = Math.max(g.days[date] || 0, steps);
        stored = g.days[date];
        g.lastSync = Date.now(); g.lastSteps = stored; g.lastError = null; g.lastErrorAt = null;
        for (const k of Object.keys(g.days).sort().slice(0, -7)) delete g.days[k];
      } else if (isAndroid) {
        stored = Math.max(g.days[date] || 0, before, steps);
        if (stored !== steps) note2 = `kept ${stored} (higher than the ${steps} Android sent)`;
        st.android = { lastSync: Date.now(), lastSteps: steps, app: clip(url.searchParams.get('app') ?? body.app ?? null) };
      } else if (empty) {
        stored = Math.max(g.days[date] || 0, before, 0);
        note2 = stored ? `empty steps= counted as 0; kept ${stored}` : 'empty steps= counted as 0 (no Health samples yet?)';
      } else if (g.days[date] != null) {
        stored = Math.max(g.days[date], before, steps);
        if (stored !== steps) note2 = `kept ${stored} (Garmin is authoritative; shortcut sent ${steps})`;
      }
      st.days[date] = stored;
      st.lastSync = Date.now(); st.lastSteps = stored;
      logSync(st, { ok: true, steps: stored, raw: clip(raw), date, method: req.method, codeNote, test, src, reason: note2 });
      const v = vars(st);
      const goal = goalToday(st);
      if (date === today && before < goal && stored >= goal && !(st.sent[today] || []).includes('paid')) {
        st.sent[today] = [...(st.sent[today] || []), 'paid'];
        const last = v.day >= v.need;
        await push(env, st, last ? '🗝 Final payment!' : '🥕 Ransom paid!', note(last ? 'paidLast' : 'paid', v), 'ph-paid');
      }
      await commit(env, st, today, null, inbox);
      const left = Math.max(0, goal - stored);
      if (url.searchParams.has('plain') || req.method === 'GET') return text(left
        ? `Got ${n(stored)} steps. ${n(left)} to go or ${v.name} gets it. (Day ${v.day} of ${v.need})`
        : `Got ${n(stored)} steps. Ransom paid. Day ${v.day} of ${v.need} for ${v.name}.${v.day >= v.need ? ' Rescue at midnight!' : ''}`);
      return json({ ok: true, steps: stored, state: view(st) });
    }

    if (req.method !== 'POST') return json({ error: 'not found' }, 404);

    if (path === '/settings') {
      // The goal is fixed by the rules (10,000; 15,000 on a final day) and ignored if sent. Only the current hostage's name can change.
      if (typeof body.name === 'string' && body.name.trim()) petAt(st, st.hostage.rung).name = body.name.trim().slice(0, 24);
      if (typeof body.displayName === 'string') { const d = cleanName(body.displayName); if (d) st.displayName = d; else delete st.displayName; } // v0.5.8: shown on cheers
      await commit(env, st, today, null, inbox); return json(view(st));
    }
    if (path === '/subscribe') {
      const s = body.subscription;
      if (!s || !s.endpoint || !s.keys || !s.keys.p256dh || !s.keys.auth) return json({ error: 'bad subscription' }, 400);
      st.sub = { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } };
      await commit(env, st, today, null, inbox); return json({ ok: true });
    }
    if (path === '/sync-log/clear-test') {
      const n = (st.syncLog || []).length;
      st.syncLog = (st.syncLog || []).filter(e => !e.test);
      await commit(env, st, today, null, inbox); return json({ ok: true, removed: n - st.syncLog.length });
    }
    if (path === '/unsubscribe') { st.sub = null; await commit(env, st, today, null, inbox); return json({ ok: true }); }
    if (path === '/test-nudge') {
      const r = await push(env, st, '🦝 The Raccoon', note('test', vars(st)), 'ph-test');
      await commit(env, st, today, null, inbox); return json({ ok: r.ok, status: r.status, detail: r.text || undefined }, r.ok ? 200 : 502);
    }
    if (path === '/pause') { // Raccoon Pause: needs an explicit confirm flag from the app's dialog
      if (body.confirm !== true) return json({ error: 'confirm required' }, 400);
      const r = buyPause(st, today);
      if (!r.ok) return json({ error: r.error, state: view(st) }, 409);
      await commit(env, st, today, null, inbox); console.log('pause', st.code, today);
      return json({ ok: true, state: view(st) });
    }
    if (path === '/shop/buy') { // price, shelf requirement and balance are checked here; the client never sets ownership
      const r = buyItem(st, today, String(body.villain || 'raccoon'), String(body.slot || ''), String(body.color || ''));
      if (!r.ok) return json({ error: r.error, state: view(st) }, 409);
      await commit(env, st, today, null, inbox); console.log('shop', st.code, body.slot, body.color);
      return json({ ok: true, state: view(st) });
    }
    if (path === '/shop/equip') {
      const r = equipItem(st, String(body.villain || 'raccoon'), String(body.slot || ''), body.color == null ? null : String(body.color));
      if (!r.ok) return json({ error: r.error, state: view(st) }, 409);
      await commit(env, st, today, null, inbox); return json({ ok: true, state: view(st) });
    }
    if (path === '/shop/style') { // v0.5.4: wear a rescue-reward style (only ones the server has unlocked)
      const r = equipStyle(st, String(body.villain || 'raccoon'), String(body.slot || ''), body.style == null ? null : String(body.style));
      if (!r.ok) return json({ error: r.error, state: view(st) }, 409);
      await commit(env, st, today, null, inbox); return json({ ok: true, state: view(st) });
    }
    if (path === '/friends/save') { // v0.5.8: server copy of this device's friend list (public friend IDs only), so cheers can be checked
      const ids = [...new Set((Array.isArray(body.ids) ? body.ids : []).map(normFid).filter(id => id && id !== st.friendId))].slice(0, 50);
      st.friends = ids; await commit(env, st, today, null, inbox); return json({ ok: true, friends: st.friends });
    }
    if (path === '/cheer') { // 1,000 Spare Steps -> a preset cheer in the friend's inbox (shown today only) + a push
      const to = normFid(body.to), c = cheerById(String(body.msg || ''));
      if (!c) return json({ error: 'no such cheer', state: view(st) }, 409);
      if (!to || to === st.friendId) return json({ error: 'not a friend', state: view(st) }, 409);
      if (!st.friends.includes(to)) {
        if (body.add && (await env.PH.get(FKEY(to)))) st.friends = [...st.friends, to].slice(-50);
        else return json({ error: 'not a friend', state: view(st) }, 409);
      }
      const sent = st.cheerSent[today] = st.cheerSent[today] || {};
      if ((sent[to] || 0) >= CHEER_DAILY_MAX) return json({ error: 'cheer limit', state: view(st) }, 409);
      if (st.bank < CHEER_COST) return json({ error: 'not enough Spare Steps', state: view(st) }, 409);
      const rc = await env.PH.get(FKEY(to)), raw = rc && await env.PH.get(PKEY(rc)), rst = raw && JSON.parse(raw); // read-only: never saved
      if (!rst || rst.friendId !== to) return json({ error: 'not a friend', state: view(st) }, 409);
      const name = myName(st), toName = rst.displayName || petAt(rst, rst.hostage.rung).name;
      const cheer = { id: rid(), kind: 'cheer', from: st.friendId, name, msg: c.id, at: Date.now(), date: today };
      bankMove(st, today, 'cheer', -CHEER_COST, { to, name: toName }); sent[to] = (sent[to] || 0) + 1;
      await commit(env, st, today, { changed: true, after: [...inbox.after, () => putItem(env, to, cheer), () => push(env, rst, '📣 ' + name, c.text, 'ph-cheer-' + cheer.id)] }); // paid first, then delivered
      console.log('cheer', st.friendId, '->', to, c.id);
      return json({ ok: true, state: view(st) });
    }
    if (path === '/cheer/seen') { // dismissed on the home screen
      const id = String(body.id || ''), it = st.cheers.find(c => c.id === id);
      st.cheers = st.cheers.filter(c => c.id !== id);
      const full = it && inbox.items.find(x => x.id === id);
      await commit(env, st, today, { changed: true, after: [...inbox.after, ...(full ? [() => putItem(env, st.friendId, { ...full, seen: true })] : [])] }); return json({ ok: true, state: view(st) });
    }
    if (path === '/seen-death') { // the app played the death animation; don't replay it on other devices
      const id = parseInt(body.id, 10);
      if (Number.isFinite(id) && id > (st.deathSeen || 0) && id <= st.deathCount) st.deathSeen = id;
      await commit(env, st, today, null, inbox); return json({ ok: true, deathSeen: st.deathSeen });
    }
    return json({ error: 'not found' }, 404);
  }
}

async function scheduled(event, env, ctx) {
    await migrateLegacy(env);
    for (const code of await allCodes(env)) {
      try { await withLock(code, () => tickPlayer(env, code)); } catch (e) { console.log('cron error', code, String(e)); }
    }
}

// Hourly: settle finished days, morning report, nudges. One player at a time.
async function tickPlayer(env, code) {
    const st = await load(env, code);
    if (!st) return;
    const np = localParts();
    const events = settle(st, np.date);
    const sent = st.sent[np.date] || [];
    if (events.length) st.pendingReport = [...(st.pendingReport || []), ...events];
    if (np.hour >= REPORT_HOUR && st.pendingReport && st.pendingReport.length) {
      await reportEvents(env, st, st.pendingReport); st.pendingReport = null;
    }
    const nn = planNudge(st, np);
    if (nn) {
      await push(env, st, nn.title, nn.body, 'ph-nudge');
      st.sent[np.date] = [...(st.sent[np.date] || []), nn.id];
    }
    for (const k of Object.keys(st.sent)) if (k < np.date) delete st.sent[k];
    await commit(env, st, np.date); // (no base: one pass)
    // midnight: 'miss' replies for cheered days that closed short
}

// Which nudge (if any) is due now for this player. Pure, so the tests can drive it.
function dayCoin(code, date) { let h = 2166136261; for (const ch of code + date) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) % 2; }
export function planNudge(st, np) {
  const steps = st.days[np.date] || 0, goal = goalToday(st);
  if (steps >= goal) return null; // banked: no nagging
  if (st.paused && st.paused[np.date]) return null; // paused: today doesn't count, so no nagging
  const mins = np.hour * 60 + np.minute, sent = st.sent[np.date] || [];
  const idx = NUDGES2.findIndex(n => mins >= n.at && mins < n.at + NUDGE_WINDOW && !sent.includes(n.id));
  if (idx < 0) return null;
  const n = NUDGES2[idx];
  const voice = (dayCoin(st.code, np.date) + idx) % 2 === 0 ? 'pet' : 'raccoon'; // one of each per day
  const h = st.hostage, p = petAt(st, h.rung), need = needFor(h.rung);
  const v = { name: p.name, species: p.species, animal: p.species === 'panda' ? 'panda cub' : p.species, steps: steps.toLocaleString('en-US'), left: (goal - steps).toLocaleString('en-US'), goal: goal.toLocaleString('en-US'),
    dish: DISH[p.species] || 'stew', item: ITEM[p.species] || 'a hat', day: h.streak + 1, need, final: h.streak + 1 >= need, ...revivedVars(p.injuries, p.deaths || 0), deaths: p.deaths || 0 };
  return { id: n.id, voice, title: voice === 'pet' ? `${PET_EMOJI[p.species] || '🐾'} ${p.name}` : '🦝 The Raccoon', body: nudgeText(voice, n.slot, v) };
}

import { RULES, localParts, newState, migrate, settle, view, petAt, needFor, DEATH_TEXT } from './game.js';
import { note, nudgeText, DISH, ITEM, PET_EMOJI } from './messages.js';
import { sendPush } from './push.js';

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
  const st = JSON.parse(s);
  if (st.v !== 2) { const m = migrate(st, localParts().date); await env.PH.put(PKEY(code), JSON.stringify(m)); return m; }
  return st;
};
const save = (env, st) => env.PH.put(PKEY(st.code), JSON.stringify(st));
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
  return { name: p.name, species: p.species, steps: n(steps), goal: n(RULES.GOAL), left: n(Math.max(0, RULES.GOAL - steps)), day: h.streak + 1, need, streak: h.streak, togo: need - h.streak };
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
    await push(env, st, '🥕 Ransom paid', note('met', v), 'ph-report');
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

const SYNC_LOG_MAX = 10;
function logSync(st, entry) {
  st.syncLog = [{ at: Date.now(), ...entry }, ...(st.syncLog || [])].slice(0, SYNC_LOG_MAX);
  console.log('sync', JSON.stringify(entry));
}
const clip = v => v == null ? null : String(v).slice(0, 80);

export default {
  async fetch(req, env) {
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

    if (path === '/state') { if (events.length) await save(env, st); return json(view(st)); }

    if (path === '/sync') {
      const src = clip(url.searchParams.get('src') ?? body.src ?? null) || undefined; // 'garmin' = server-side Garmin job
      const isGarmin = src === 'garmin';
      const failure = url.searchParams.get('error') ?? body.error ?? null;
      if (isGarmin && failure != null) { // the Garmin job reports a failed attempt (reason only, never secrets)
        const reason = 'Garmin: ' + String(failure).slice(0, 160);
        st.garmin = { ...(st.garmin || {}), lastError: reason, lastErrorAt: Date.now() };
        logSync(st, { ok: false, src, reason, method: req.method, test: url.searchParams.has('test') || undefined });
        await save(env, st);
        return json({ ok: false, logged: true, reason });
      }
      const raw = url.searchParams.get('steps') ?? body.steps ?? body.raw ?? null;
      const test = url.searchParams.has('test') || !!body.test || undefined; // test entries can be cleared later
      const dry = url.searchParams.has('dry') || !!body.dry || undefined;     // validate + log only, never stores steps
      const codeNote = undefined; // the code always matches now: it's how we found this player
      const steps = parseSteps(raw);
      if (!Number.isFinite(steps) || steps < 0 || steps > 300000) {
        const reason = raw == null || raw === '' ? 'steps missing (is the Statistics Result variable after steps= ?)' : 'steps not a number: ' + clip(raw);
        logSync(st, { ok: false, reason, raw: clip(raw), method: req.method, codeNote, test, dry, src });
        await save(env, st);
        return json({ error: 'steps missing or weird', reason, got: clip(raw) }, 400);
      }
      const date = /^\d{4}-\d{2}-\d{2}$/.test(body.date || url.searchParams.get('date') || '') ? (body.date || url.searchParams.get('date')) : today;
      if (dry) {
        logSync(st, { ok: true, dry, test, steps, raw: clip(raw), date, method: req.method, codeNote, reason: 'dry run, nothing stored' });
        await save(env, st);
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
      } else if (g.days[date] != null) {
        stored = Math.max(g.days[date], before, steps);
        if (stored !== steps) note2 = `kept ${stored} (Garmin is authoritative; shortcut sent ${steps})`;
      }
      st.days[date] = stored;
      st.lastSync = Date.now(); st.lastSteps = stored;
      logSync(st, { ok: true, steps: stored, raw: clip(raw), date, method: req.method, codeNote, test, src, reason: note2 });
      const v = vars(st);
      if (date === today && before < RULES.GOAL && stored >= RULES.GOAL && !(st.sent[today] || []).includes('paid')) {
        st.sent[today] = [...(st.sent[today] || []), 'paid'];
        const last = v.day >= v.need;
        await push(env, st, last ? '🗝 Final payment!' : '🥕 Ransom paid!', note(last ? 'paidLast' : 'paid', v), 'ph-paid');
      }
      await save(env, st);
      const left = Math.max(0, RULES.GOAL - stored);
      if (url.searchParams.has('plain') || req.method === 'GET') return text(left
        ? `Got ${n(stored)} steps. ${n(left)} to go or ${v.name} gets it. (Day ${v.day} of ${v.need})`
        : `Got ${n(stored)} steps. Ransom paid. Day ${v.day} of ${v.need} for ${v.name}.${v.day >= v.need ? ' Rescue at midnight!' : ''}`);
      return json({ ok: true, steps: stored, state: view(st) });
    }

    if (req.method !== 'POST') return json({ error: 'not found' }, 404);

    if (path === '/settings') {
      // The goal is always 10,000 (ignored if sent). Only the current hostage's name can change.
      if (typeof body.name === 'string' && body.name.trim()) petAt(st, st.hostage.rung).name = body.name.trim().slice(0, 24);
      await save(env, st); return json(view(st));
    }
    if (path === '/subscribe') {
      const s = body.subscription;
      if (!s || !s.endpoint || !s.keys || !s.keys.p256dh || !s.keys.auth) return json({ error: 'bad subscription' }, 400);
      st.sub = { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } };
      await save(env, st); return json({ ok: true });
    }
    if (path === '/sync-log/clear-test') {
      const n = (st.syncLog || []).length;
      st.syncLog = (st.syncLog || []).filter(e => !e.test);
      await save(env, st); return json({ ok: true, removed: n - st.syncLog.length });
    }
    if (path === '/unsubscribe') { st.sub = null; await save(env, st); return json({ ok: true }); }
    if (path === '/test-nudge') {
      const r = await push(env, st, '🦝 The Raccoon', note('test', vars(st)), 'ph-test');
      await save(env, st); return json({ ok: r.ok, status: r.status, detail: r.text || undefined }, r.ok ? 200 : 502);
    }
    if (path === '/seen-death') { // the app played the death animation; don't replay it on other devices
      const id = parseInt(body.id, 10);
      if (Number.isFinite(id) && id > (st.deathSeen || 0) && id <= st.deathCount) st.deathSeen = id;
      await save(env, st); return json({ ok: true, deathSeen: st.deathSeen });
    }
    return json({ error: 'not found' }, 404);
  },

  async scheduled(event, env, ctx) {
    await migrateLegacy(env);
    for (const code of await allCodes(env)) {
      try { await tickPlayer(env, code); } catch (e) { console.log('cron error', code, String(e)); }
    }
  },
};

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
    await save(env, st);
}

// Which nudge (if any) is due now for this player. Pure, so the tests can drive it.
function dayCoin(code, date) { let h = 2166136261; for (const ch of code + date) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) % 2; }
export function planNudge(st, np) {
  const steps = st.days[np.date] || 0;
  if (steps >= RULES.GOAL) return null; // banked: no nagging
  const mins = np.hour * 60 + np.minute, sent = st.sent[np.date] || [];
  const idx = NUDGES2.findIndex(n => mins >= n.at && mins < n.at + NUDGE_WINDOW && !sent.includes(n.id));
  if (idx < 0) return null;
  const n = NUDGES2[idx];
  const voice = (dayCoin(st.code, np.date) + idx) % 2 === 0 ? 'pet' : 'raccoon'; // one of each per day
  const h = st.hostage, p = petAt(st, h.rung), need = needFor(h.rung);
  const v = { name: p.name, animal: p.species === 'panda' ? 'panda cub' : p.species, steps: steps.toLocaleString('en-US'), left: (RULES.GOAL - steps).toLocaleString('en-US'),
    dish: DISH[p.species] || 'stew', item: ITEM[p.species] || 'a hat', day: h.streak + 1, need };
  return { id: n.id, voice, title: voice === 'pet' ? `${PET_EMOJI[p.species] || '🐾'} ${p.name}` : '🦝 The Raccoon', body: nudgeText(voice, n.slot, v) };
}

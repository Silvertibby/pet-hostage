import { RULES, localParts, newState, migrate, settle, view, petAt, needFor, DEATH_TEXT } from './game.js';
import { note } from './messages.js';
import { sendPush } from './push.js';

const KEY = 'state';
// Nudge slots (PT hour -> send if today's progress below this fraction). Morning report at REPORT_HOUR.
const NUDGE_SLOTS = { 12: 0.3, 15: 0.5, 18: 0.75, 21: 1 };
const REPORT_HOUR = 8;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', ...cors } });
const text = (t, s = 200) => new Response(t, { status: s, headers: { 'Content-Type': 'text/plain; charset=utf-8', ...cors } });

// Old (v0.1) states are migrated on first read, keeping code, steps, sync log and push subscription.
const load = async env => {
  const s = await env.PH.get(KEY); if (!s) return null;
  const st = JSON.parse(s);
  if (st.v !== 2) { const m = migrate(st, localParts().date); await env.PH.put(KEY, JSON.stringify(m)); return m; }
  return st;
};
const save = (env, st) => env.PH.put(KEY, JSON.stringify(st));

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
    if (path === '/status') { const st = await load(env); return json({ claimed: !!st }); }
    if (path === '/claim' && req.method === 'POST') {
      if (await load(env)) return json({ error: 'already claimed' }, 409);
      const st = newState(makeCode(), today); await save(env, st);
      return json({ code: st.code, state: view(st) });
    }

    const body = await readBody(req);
    const st = await load(env);
    if (!st) { if (path === '/sync') console.log('sync', 'unclaimed'); return json({ error: 'unclaimed' }, 404); }
    const code = (url.searchParams.get('code') || body.code || '').toString().trim().toUpperCase();
    const events = settle(st, today);
    if (events.length) st.pendingReport = [...(st.pendingReport || []), ...events]; // pushed at the morning report

    if (path === '/state') { if (events.length) await save(env, st); return json(view(st)); }

    if (path === '/sync') {
      const raw = url.searchParams.get('steps') ?? body.steps ?? body.raw ?? null;
      const test = url.searchParams.has('test') || !!body.test || undefined; // test entries can be cleared later
      const dry = url.searchParams.has('dry') || !!body.dry || undefined;     // validate + log only, never stores steps
      const codeNote = !code ? 'no code' : code === st.code ? undefined : 'code mismatch (accepted)';
      const steps = parseSteps(raw);
      if (!Number.isFinite(steps) || steps < 0 || steps > 300000) {
        const reason = raw == null || raw === '' ? 'steps missing (is the Statistics Result variable after steps= ?)' : 'steps not a number: ' + clip(raw);
        logSync(st, { ok: false, reason, raw: clip(raw), method: req.method, codeNote, test, dry });
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
      st.days[date] = steps; // Health's daily total; latest wins
      st.lastSync = Date.now(); st.lastSteps = steps;
      logSync(st, { ok: true, steps, raw: clip(raw), date, method: req.method, codeNote, test });
      const v = vars(st);
      if (date === today && before < RULES.GOAL && steps >= RULES.GOAL && !(st.sent[today] || []).includes('paid')) {
        st.sent[today] = [...(st.sent[today] || []), 'paid'];
        const last = v.day >= v.need;
        await push(env, st, last ? '🗝 Final payment!' : '🥕 Ransom paid!', note(last ? 'paidLast' : 'paid', v), 'ph-paid');
      }
      await save(env, st);
      const left = Math.max(0, RULES.GOAL - steps);
      if (url.searchParams.has('plain') || req.method === 'GET') return text(left
        ? `Got ${n(steps)} steps. ${n(left)} to go or ${v.name} gets it. (Day ${v.day} of ${v.need})`
        : `Got ${n(steps)} steps. Ransom paid. Day ${v.day} of ${v.need} for ${v.name}.${v.day >= v.need ? ' Rescue at midnight!' : ''}`);
      return json({ ok: true, steps, state: view(st) });
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
    const st = await load(env);
    if (!st) return;
    const np = localParts();
    const events = settle(st, np.date);
    const sent = st.sent[np.date] || [];
    if (events.length) st.pendingReport = [...(st.pendingReport || []), ...events];
    if (np.hour >= REPORT_HOUR && st.pendingReport && st.pendingReport.length) {
      await reportEvents(env, st, st.pendingReport); st.pendingReport = null;
    }
    const slot = NUDGE_SLOTS[np.hour];
    if (slot != null && !sent.includes('n' + np.hour)) {
      const steps = st.days[np.date] || 0;
      if (steps < RULES.GOAL * slot) {
        await push(env, st, '🦝 ' + (np.hour >= 21 ? 'FINAL NOTICE' : 'A note from The Raccoon'), note('nudge', vars(st), np.hour), 'ph-nudge');
        st.sent[np.date] = [...sent, 'n' + np.hour];
      }
    }
    for (const k of Object.keys(st.sent)) if (k < np.date) delete st.sent[k];
    await save(env, st);
  },
};

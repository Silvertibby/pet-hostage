import { RULES, localParts, newState, newPet, settle, view } from './game.js';
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

const load = async env => { const s = await env.PH.get(KEY); return s ? JSON.parse(s) : null; };
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
const vars = st => {
  const t = localParts().date; const steps = st.days[t] || 0;
  return { name: st.pet.name, steps: steps.toLocaleString('en-US'), goal: st.goal.toLocaleString('en-US'), left: Math.max(0, st.goal - steps).toLocaleString('en-US'), peril: st.pet.peril, death: RULES.DEATH_AT };
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

// Report on newly settled days (only the latest one, to avoid spam after a gap).
async function reportEvents(env, st, events) {
  if (!events.length) return;
  const last = events[events.length - 1];
  const v = vars(st);
  if (last.died) await push(env, st, '☠ RIP ' + st.pet.name, note('died', v), 'ph-report');
  else if (last.met) await push(env, st, '🥕 Ransom paid', note('met', v), 'ph-report');
  else if (!last.grace) await push(env, st, '📮 Ransom missed', note('missed', v), 'ph-report');
}

async function authed(req, env, url) {
  let body = {};
  if (req.method === 'POST') {
    const ct = req.headers.get('content-type') || '';
    try {
      if (ct.includes('json')) body = await req.json();
      else if (ct.includes('form')) body = Object.fromEntries(await req.formData());
      else { const t = await req.text(); try { body = JSON.parse(t); } catch { body = { raw: t }; } }
    } catch { body = {}; }
  }
  const code = (url.searchParams.get('code') || body.code || '').toString().trim().toUpperCase();
  const st = await load(env);
  if (!st) return { err: json({ error: 'unclaimed' }, 404) };
  if (!code || code !== st.code) return { err: json({ error: 'bad code' }, 403) };
  return { st, body };
}

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

    const a = await authed(req, env, url);
    if (a.err) return a.err;
    const { st, body } = a;
    const events = settle(st, today);
    if (events.length) st.pendingReport = [...(st.pendingReport || []), ...events]; // pushed at the morning report

    if (path === '/state') { if (events.length) await save(env, st); return json(view(st)); }

    if (path === '/sync') {
      const steps = parseSteps(url.searchParams.get('steps') ?? body.steps ?? body.raw);
      if (!Number.isFinite(steps) || steps < 0 || steps > 300000) { if (events.length) await save(env, st); return json({ error: 'steps missing or weird', got: url.searchParams.get('steps') ?? body.steps ?? null }, 400); }
      const date = /^\d{4}-\d{2}-\d{2}$/.test(body.date || url.searchParams.get('date') || '') ? (body.date || url.searchParams.get('date')) : today;
      const before = st.days[date] || 0;
      st.days[date] = steps; // Health's daily total; latest wins
      st.lastSync = Date.now(); st.lastSteps = steps;
      if (date === today && st.pet.alive && before < st.goal && steps >= st.goal) {
        st.sent[today] = [...(st.sent[today] || []), 'paid'];
        await push(env, st, '🥕 Ransom paid!', note('paid', vars(st)), 'ph-paid');
      }
      await save(env, st);
      const left = Math.max(0, st.goal - steps);
      if (url.searchParams.has('plain') || req.method === 'GET') return text(st.pet.alive ? (left ? `Got ${steps.toLocaleString('en-US')} steps. ${left.toLocaleString('en-US')} to go or ${st.pet.name} gets it.` : `Got ${steps.toLocaleString('en-US')} steps. Ransom paid. ${st.pet.name} lives.`) : `Got ${steps.toLocaleString('en-US')} steps. ${st.pet.name} is a ghost though.`);
      return json({ ok: true, steps, state: view(st) });
    }

    if (req.method !== 'POST') return json({ error: 'not found' }, 404);

    if (path === '/settings') {
      const g = parseInt(body.goal, 10);
      if (Number.isFinite(g) && g >= 500 && g <= 100000) st.goal = g;
      if (typeof body.name === 'string' && body.name.trim()) st.pet.name = body.name.trim().slice(0, 24);
      await save(env, st); return json(view(st));
    }
    if (path === '/subscribe') {
      const s = body.subscription;
      if (!s || !s.endpoint || !s.keys || !s.keys.p256dh || !s.keys.auth) return json({ error: 'bad subscription' }, 400);
      st.sub = { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } };
      await save(env, st); return json({ ok: true });
    }
    if (path === '/unsubscribe') { st.sub = null; await save(env, st); return json({ ok: true }); }
    if (path === '/test-nudge') {
      const r = await push(env, st, '🦝 The Raccoon', note('test', vars(st)), 'ph-test');
      await save(env, st); return json({ ok: r.ok, status: r.status, detail: r.text || undefined }, r.ok ? 200 : 502);
    }
    if (path === '/adopt') {
      if (st.pet.alive && !body.force) return json({ error: 'pet still alive' }, 409);
      const old = st.pet;
      st.graveyard = [{ name: old.name, species: old.species, born: old.born, died: old.died || today, bestStreak: old.bestStreak, metDays: old.metDays, released: old.alive || undefined }, ...st.graveyard].slice(0, RULES.GRAVEYARD_MAX);
      st.pet = newPet(body.name, today);
      await save(env, st); return json(view(st));
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
    if (slot != null && st.pet.alive && !sent.includes('n' + np.hour)) {
      const steps = st.days[np.date] || 0;
      if (steps < st.goal * slot) {
        await push(env, st, '🦝 ' + (np.hour >= 21 ? 'FINAL NOTICE' : 'A note from The Raccoon'), note('nudge', vars(st), np.hour), 'ph-nudge');
        st.sent[np.date] = [...sent, 'n' + np.hour];
      }
    }
    for (const k of Object.keys(st.sent)) if (k < np.date) delete st.sent[k];
    await save(env, st);
  },
};

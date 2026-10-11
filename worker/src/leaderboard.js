// v0.4.7 leaderboard. One small KV key ("leaderboard") holds a row per player, keyed by an opaque hash of the
// sync code (codes are never stored in it or returned). Rows are upserted on sync/claim/profile changes and the
// whole index is rebuilt by the cron (which already reads every player), so GET /leaderboard is a single KV read.
import { addDays, goalToday } from './game.js';

export const LB_KEY = 'leaderboard';
export const NAME_MAX = 16;

export async function lbId(code) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('ph-lb:' + code)));
  return [...d.slice(0, 8)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const TAG = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const tagOf = id => TAG[parseInt(id.slice(0, 2), 16) % TAG.length] + TAG[parseInt(id.slice(2, 4), 16) % TAG.length];

const dayDiff = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
// Current streak of goal days (10k, or 15k on a final day), across pets. Every settled day is either a success or a
// death, so the run is the settled days since the latest death (capped by total successes for older migrated saves).
// Today counts as soon as it's banked. Pure: reads the state, changes nothing.
export function streakOf(st, today) {
  const h = st.hostage, settled = h.settledThrough;
  const from = st.lastDeath ? st.lastDeath.date : addDays(st.started, -1);
  const run = Math.max(0, Math.min(dayDiff(from, settled), st.stats?.metDays ?? 0));
  const todayMet = settled < today && (st.days[today] || 0) >= goalToday(st);
  return { run, todayMet };
}
export const savedOf = st => (st.pets || []).filter(p => p && p.rescuedOn).length;

// Light profanity filter: normalise leetspeak, then look for a short list of slurs/obscenities as substrings.
const BAD = ['fuck', 'shit', 'cunt', 'bitch', 'nigg', 'faggot', 'slut', 'whore', 'rapist', 'nazi', 'hitler', 'dickhead', 'pussy', 'penis', 'vagina', 'porn', 'retard', 'kike', 'chink', 'twat', 'wank', 'asshole', 'bastard'];
const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i', '|': 'i' };
export function cleanName(raw) {
  if (raw == null) return { name: null };
  let s = String(raw).normalize('NFKC').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, '').replace(/\s+/g, ' ').trim();
  if (!s) return { name: null }; // blank = back to the default name
  if (!/^[\p{L}\p{N}\p{Extended_Pictographic}\u200d\ufe0f .,'!?&_\-+#]+$/u.test(s)) return { error: 'Letters, numbers and a little punctuation only.' };
  s = [...s].slice(0, NAME_MAX).join('').trim();
  const flat = s.toLowerCase().replace(/[01345 7@$!|]/g, c => LEET[c] ?? '').replace(/[^a-z]/g, '');
  if (BAD.some(w => flat.includes(w))) return { error: 'The Raccoon says pick another name.' };
  return { name: s };
}

export function rowOf(st, id, today) {
  const { run, todayMet } = streakOf(st, today), h = st.hostage, p = st.pets[h.rung] || {};
  const prof = st.profile || {};
  return { name: prof.name || null, hidden: !!prof.hidden, species: p.species || 'bunny', pet: p.name || '',
    run, settled: h.settledThrough, met: todayMet ? today : null,
    at: todayMet && st.paidAt && st.paidAt.date === today ? st.paidAt.at : null, // when today's goal was crossed (if known)
    saved: savedOf(st), started: st.started };
}
const displayName = (r, id, legacyId) => r.name || (id === legacyId ? 'Ben' : `${r.pet || 'Pet'}·${tagOf(id)}`);
// Streak as of now from a stored row: the settled run, plus one if its newest banked day isn't settled yet.
const liveStreak = r => r.run + (r.met && r.met > r.settled ? 1 : 0);
const reachedAt = r => r.met && r.met > r.settled ? r.at ?? 9e15 : Date.parse(r.settled + 'T23:59:59-07:00');

export function boardView(idx, meId, sort = 'streak') {
  const all = Object.entries(idx.rows || {}).map(([id, r]) => ({ id, r, name: displayName(r, id, idx.legacyId), streak: liveStreak(r), saved: r.saved || 0 }));
  const cmp = sort === 'saved'
    ? (a, b) => b.saved - a.saved || b.streak - a.streak || reachedAt(a.r) - reachedAt(b.r) || (a.r.started < b.r.started ? -1 : 1)
    : (a, b) => b.streak - a.streak || b.saved - a.saved || reachedAt(a.r) - reachedAt(b.r) || (a.r.started < b.r.started ? -1 : 1);
  all.sort(cmp);
  const rows = []; let me = null;
  for (const x of all) {
    const you = x.id === meId;
    if (you) me = { name: x.name, custom: !!x.r.name, hidden: x.r.hidden, streak: x.streak, saved: x.saved };
    if (x.r.hidden) continue;
    const row = { rank: rows.length + 1, name: x.name, species: x.r.species, streak: x.streak, saved: x.saved };
    if (you) { row.you = true; me.rank = row.rank; }
    rows.push(row);
  }
  return { sort, updated: idx.updated || null, count: rows.length, rows, me };
}

export async function readIndex(env) { const s = await env.PH.get(LB_KEY); return s ? JSON.parse(s) : { v: 1, rows: {} }; }
// Upsert one player's row; writes only if something changed (KV writes are the scarce free-tier resource).
export async function upsertRow(env, st, today) {
  const id = await lbId(st.code), idx = await readIndex(env), row = rowOf(st, id, today);
  if (JSON.stringify(idx.rows[id]) === JSON.stringify(row)) return idx;
  idx.rows[id] = row; idx.updated = Date.now();
  await env.PH.put(LB_KEY, JSON.stringify(idx)); return idx;
}

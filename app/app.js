import { drawScene, drawDeath, drawShelfPet, raccoon, blit, VIEW_W, VIEW_H, DEATH_LEN, SPECIES } from './art.js';

// ---- tunables ----
const VERSION = 'v0.2.0';
const GOAL = 10000;
const WORKER = 'https://pet-hostage.silvertibby.workers.dev';
const APP_URL = 'https://silvertibby.github.io/pet-hostage/';
const SHORTCUT_NAME = 'Pet Hostage Sync';
const BAR_SEGMENTS = 20;
const REFRESH_MS = 60_000;

const $ = s => document.querySelector(s);
const view = $('#view');
const qs = new URLSearchParams(location.search);
const DEMO = qs.get('demo');
const isStandalone = () => window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
$('#ver').textContent = VERSION;

let code = localStorage.getItem('ph.code') || '';
let state = null, tab = 'home', anim = null, lastFetch = 0, unclaimed = false, deathPlaying = false;

// Pick up a code from the URL (?c=CODE or #c=CODE), e.g. after Add to Home Screen.
{
  const c = (qs.get('c') || new URLSearchParams(location.hash.slice(1)).get('c') || '').toUpperCase();
  if (c && /^[A-Z0-9]{6,20}$/.test(c)) { code = c; localStorage.setItem('ph.code', c); }
}
function rememberInUrl() {
  // So "Add to Home Screen" carries the code into the home-screen app (it has separate storage on iPhone).
  if (!code || DEMO) return;
  const u = new URL(location.href); u.search = '?c=' + code; u.hash = '';
  history.replaceState(null, '', u);
  const m = { name: 'Pet Hostage', short_name: 'Pet Hostage', start_url: APP_URL + '?c=' + code, scope: APP_URL, display: 'standalone', background_color: '#1b1626', theme_color: '#1b1626',
    icons: [{ src: APP_URL + 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: APP_URL + 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }] };
  $('#manifest').href = 'data:application/manifest+json,' + encodeURIComponent(JSON.stringify(m));
}

// The server is the source of truth for the code (single-user app); keep a local copy but never delete it.
function adoptCode(s) {
  if (s && s.code && s.code !== code) { code = s.code; localStorage.setItem('ph.code', code); rememberInUrl(); }
  return s;
}
function toast(msg, ms = 2600) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, ms); }
const fmt = n => Number(n || 0).toLocaleString('en-US');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function timePT(ms) { return new Date(ms).toLocaleTimeString('en-US', { timeZone: 'America/Vancouver', hour: 'numeric', minute: '2-digit' }) + ' PT'; }
function ago(ms) { const m = Math.round((Date.now() - ms) / 60000); if (m < 1) return 'just now'; if (m < 60) return m + ' min ago'; const h = Math.round(m / 60); if (h < 24) return h + 'h ago'; return Math.round(h / 24) + 'd ago'; }

async function api(path, body) {
  const opt = body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, ...body }) } : {};
  const r = await fetch(WORKER + path + (body || !code ? '' : (path.includes('?') ? '&' : '?') + 'code=' + encodeURIComponent(code)), opt);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || ('HTTP ' + r.status)); e.status = r.status; e.body = j; throw e; }
  return j;
}

// ---- kidnapper notes on the home screen ----
function seeded(seed) { let h = 2166136261; for (const ch of seed) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; }; }
const DEATH_TEXT = { pop: 'had its head pop clean off', anvil: 'was flattened by an anvil', catapult: 'was launched off a catapult', zap: 'got zapped by a very small lightning bolt' };
const PATCH_TEXT = { pop: 'stitches', anvil: 'bandages', catapult: 'an eye patch', zap: 'band-aids' };
function homeNote(s) {
  const h = s.hostage, left = Math.max(0, s.goal - s.todaySteps), hr = s.hour;
  const r = seeded(s.today + s.mood + h.rung + Math.floor(Date.now() / 3.6e6));
  const pick = a => a[Math.floor(r() * a.length)].replace(/\{name\}/g, h.name).replace(/\{left\}/g, fmt(left)).replace(/\{goal\}/g, fmt(s.goal)).replace(/\{steps\}/g, fmt(s.todaySteps))
    .replace(/\{day\}/g, h.day).replace(/\{need\}/g, h.need).replace(/\{species\}/g, speciesLabel(h.species));
  const ld = s.lastDeath;
  if (ld && ld.date === addDay(s.today, -1)) { // died last night
    const t = `${ld.name} ${DEATH_TEXT[ld.type] || 'met a cartoon end'}. `;
    return ld.rekidnap.same ? t + pick(['I stitched him back together. Mostly the right way round. Day 1 of {need}. Again.', 'Good news: he is fixed. Bad news: back in the cage. {need} days.'])
      : t + pick([`So I took ${ld.rekidnap.name} back off your shelf. {need} days. Same as before.`, `Anyway. ${ld.rekidnap.name} is back in my cage. {need} days, like last time.`]);
  }
  const lr = (s.shelf || []).find(p => p.rescuedOn === addDay(s.today, -1));
  if (lr && h.streak === 0) return pick([`FINE. ${lr.name} walks free. But I have acquired {name}. {need} days in a row this time.`, `${lr.name} is on your shelf. Meet my new guest, {name}. Ransom: {need} days.`]);
  if (!s.lastSync) return pick(['I have your {species}. Set up step sync so I can see your payments.', 'No payments received. Because you have not set up step sync. Do it.']);
  if (left === 0) return h.day >= h.need ? pick(['Final payment received. {name} walks free at midnight. I hate this.', 'That is {need} of {need}. {name} is packing a tiny suitcase.'])
    : pick(['Ransom paid. Day {day} of {need} banked. {name} did a happy wiggle.', '{goal} steps. Fine. FINE. {name} lives. Day {day} of {need}.']);
  if (h.deaths > 0 && hr < 15) return pick([`{name} has ${h.deaths === 1 ? 'some ' + PATCH_TEXT[h.injuries[0]] : h.deaths + ' sets of patch-ups'} now. Let's not add more. {left} steps.`, 'Remember last time? {name} does. {left} steps.']);
  if (hr < 11) return pick(['Good morning. {name} has been up since 5 AM doing zoomies. {left} steps today.', 'New day, new ransom: {goal} steps. Day {day} of {need}.']);
  if (hr < 17) return pick(['{steps} so far. {left} to go. {name} is fine. For now.', 'Tick tock. {left} steps. I just bought an anvil. Unrelated.']);
  if (hr < 21) return pick(['Evening. {left} steps or the catapult gets a test pilot.', 'Dinner time. {left} steps. Miss today and {name} goes POP.']);
  return pick(['LAST CALL. {left} steps before midnight or the {species} gets it.', 'Pace the hallway. {left} steps. MOVE.']);
}
function addDay(d, n) { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }
const speciesLabel = sp => (SPECIES[sp] && SPECIES[sp].label) || sp;
const fmtDate = d => d ? new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : '';
function cutout(text) {
  const r = seeded(text);
  const fonts = ["Georgia, serif", "Impact, Haettenschweiler, 'Arial Narrow', sans-serif", "'Courier New', Courier, monospace", "'Arial Black', Arial, sans-serif", "'Times New Roman', Times, serif", "'Trebuchet MS', Futura, sans-serif", "'Press Start 2P', monospace"];
  const bgs = ['#f3ead2', '#ffffff', '#ffe066', '#ffc2d6', '#cde7ff', '#e9e4d8', '#111111', '#d8f5c4'];
  return text.split(/\s+/).map(w => '<span class="w">' + [...w].map(ch => {
    const bg = bgs[Math.floor(r() * bgs.length)], dark = bg === '#111111';
    const st = `font-family:${fonts[Math.floor(r() * fonts.length)]};background:${bg};color:${dark ? '#fff' : (r() < 0.2 ? '#c0203a' : '#111')};transform:rotate(${((r() - 0.5) * 12).toFixed(1)}deg);font-size:${16 + Math.floor(r() * 7)}px`;
    return `<span class="l" style="${st}">${esc(r() < 0.5 ? ch.toUpperCase() : ch)}</span>`;
  }).join('') + '</span>').join(' ');
}

// ---- screens ----
function stopAnim() { if (anim) cancelAnimationFrame(anim); anim = null; }
function startScene(canvas) {
  const ctx = canvas.getContext('2d');
  const t0 = performance.now();
  const loop = now => {
    if (!state || !canvas.isConnected) return;
    const h = state.hostage || {};
    drawScene(ctx, { mood: state.mood, species: h.species, injuries: h.injuries }, (now - t0) / 1000);
    anim = requestAnimationFrame(loop);
  };
  anim = requestAnimationFrame(loop);
}
function noteAvatar(canvas) { blit(canvas.getContext('2d'), raccoon(0, -1), 0, 0); }

function renderHome() {
  const s = state, h = s.hostage;
  const prog = Math.min(1, s.todaySteps / s.goal);
  const filled = Math.floor(prog * BAR_SEGMENTS);
  const pips = Array.from({ length: h.need }, (_, i) => `<span class="dpip ${i < h.streak ? 'on' : i === h.streak ? (h.todayMet ? 'on today' : 'today') : ''}"></span>`).join('');
  const maxSteps = Math.max(s.goal * 1.3, ...s.days.map(d => d.steps || 0));
  const chart = s.days.map(d => {
    const cls = d.steps == null ? (d.date < s.started || d.date === s.today ? '' : 'none') : (d.steps >= s.goal ? 'met' : d.date === s.today ? '' : 'miss');
    return `<div class="${cls} ${d.date === s.today ? 'today' : ''}" style="height:${Math.round(100 * (d.steps || 0) / maxSteps)}%" title="${d.date}: ${d.steps ?? 'no data'}"></div>`;
  }).join('');
  view.innerHTML = `
    <div class="status"><span class="name">${esc(h.name)}</span><span class="rung">Rung ${h.rung + 1} · ${esc(speciesLabel(h.species))}</span></div>
    <canvas id="scene" class="px" width="${VIEW_W}" height="${VIEW_H}"></canvas>
    <div class="quest"><div class="qhead"><b>Day ${h.day} of ${h.need}</b><span class="dim">${h.todayMet ? (h.day >= h.need ? 'rescue at midnight!' : 'today banked ✓') : `${h.need - h.streak} to go`}</span></div>
      <div class="dpips">${pips}</div>
      ${h.deaths ? `<div class="dim small">Patched up after ${h.deaths} death${h.deaths > 1 ? 's' : ''}. Miss one day and it happens again.</div>` : `<div class="dim small">10,000 steps a day, ${h.need} days in a row, to rescue ${esc(h.name)}. Miss one and, well.</div>`}</div>
    <div class="steps"><b>${fmt(s.todaySteps)}</b><span>/ ${fmt(s.goal)} steps today</span></div>
    <div class="bar ${prog >= 1 ? 'done' : ''}">${Array.from({ length: BAR_SEGMENTS }, (_, i) => `<i class="${i < filled ? 'f' : ''}"></i>`).join('')}</div>
    <div class="sync">${s.lastSync ? `<span>Last sync ${timePT(s.lastSync)} · ${ago(s.lastSync)}</span>` : `<span class="hint">No steps synced yet</span>`}
      ${s.lastSync ? `<button class="btn small ghost" id="syncnow">Sync now</button>` : `<button class="btn small acc" id="gosetup">Set up step sync</button>`}</div>
    <div class="note"><canvas class="px" id="rac" width="30" height="28"></canvas><div class="from">From: The Raccoon</div><div class="cut">${cutout(homeNote(s))}</div></div>
    <div class="legend"><span>🏆 ${s.shelf.length} on the shelf</span><span>${s.stats.metDays} paid · ${s.stats.missedDays} missed</span></div>
    <h2>LAST 14 DAYS</h2>
    <div class="chart">${chart}</div>
    <div class="legend"><span>${s.days[0].date.slice(5)}</span><span>today</span></div>
  `;
  startScene($('#scene')); noteAvatar($('#rac'));
  $('#gosetup')?.addEventListener('click', () => go('sync'));
  $('#syncnow')?.addEventListener('click', () => { location.href = 'shortcuts://run-shortcut?name=' + encodeURIComponent(SHORTCUT_NAME); });
}

// ---- the rescued shelf + the ladder ----
function petCard(p, extra) {
  return `<div class="pcard ${p.locked ? 'locked' : ''} ${p.status || ''}"><canvas class="px shelfpet" width="40" height="42" data-i="${shelfPets.length}"></canvas>
    <div class="pname">${p.locked ? '???' : esc(p.name)}</div><div class="dim small">${extra}</div></div>`;
}
let shelfPets = [];
function animateShelf() {
  const cs = [...view.querySelectorAll('canvas.shelfpet')];
  const t0 = performance.now();
  const loop = now => {
    if (!cs.length || !cs[0].isConnected) return;
    const t = (now - t0) / 1000;
    cs.forEach(c => drawShelfPet(c.getContext('2d'), shelfPets[+c.dataset.i], t));
    anim = requestAnimationFrame(loop);
  };
  anim = requestAnimationFrame(loop);
}
const scars = p => p.deaths ? `<br>patched up ×${p.deaths}` : '';
function renderShelf() {
  const s = state; shelfPets = [];
  const reveal = DEMO === 'lineup';
  const cards = arr => arr.map(x => { const html = petCard(x.p, x.extra); shelfPets.push(x.p); return html; }).join('');
  const shelf = s.shelf.map(p => ({ p, extra: `rescued ${fmtDate(p.rescuedOn)}${scars(p)}` }));
  const ladder = s.ladder.map(l => {
    const p = { ...l, locked: !reveal && l.status === 'locked' && !l.known, injuries: l.injuries || [] };
    const tag = l.status === 'rescued' ? '✅ rescued' : l.status === 'hostage' ? '🔒 hostage' : p.locked ? '' : speciesLabel(l.species);
    return { p, extra: `${l.need} days${tag ? ' · ' + tag : ''}` };
  });
  view.innerHTML = `
    <h2>RESCUED SHELF</h2>
    <div class="shelf">${shelf.length ? `<div class="pgrid">${cards(shelf)}</div><div class="plank"></div>` : `<div class="card dim">Empty. Rescue ${esc(s.hostage.name)} (${s.hostage.need} days of 10,000 in a row) to put someone here.</div>`}</div>
    <p class="dim small">Miss a day and the current hostage dies. Then The Raccoon takes the last pet on this shelf back, and you rescue it again with its original day count.</p>
    <h2>THE LADDER</h2>
    <div class="pgrid ladder">${cards(ladder)}</div>
    <h2>OBITUARIES</h2>
    <div class="card">${(s.deathLog || []).length ? s.deathLog.map(d => `<div class="grave"><span>🪦</span><span><b>${esc(d.name)}</b> <span class="dim">${fmtDate(d.date)} · ${esc(DEATH_TEXT[d.type] || '')}. ${d.rekidnap.same ? 'Stitched back up.' : esc(d.rekidnap.name) + ' re-kidnapped.'}</span></span></div>`).join('') : '<span class="dim">Nobody has died. Yet.</span>'}</div>
  `;
  animateShelf();
}

// ---- death replay: plays once, the next time the app opens after a death ----
function seenDeathId() { return Math.max(state?.deathSeen || 0, +(localStorage.getItem('ph.deathSeen') || 0)); }
function maybePlayDeath() {
  const d = state && state.lastDeath;
  if (!d || deathPlaying || DEMO) return;
  if (d.id > seenDeathId()) playDeath(d);
}
function playDeath(d, freezeAt) {
  deathPlaying = true;
  const ov = $('#overlay'); ov.hidden = false;
  const p = (state.ladder || []).find(x => x.rung === d.rung) || {};
  const injBefore = (p.injuries || []).slice(0, Math.max(0, (d.deaths || 1) - 1)); // as it looked before this death
  const re = d.rekidnap;
  const msg = `${d.name} ${DEATH_TEXT[d.type] || 'met a cartoon end'}. ` + (re.same ? `I stitched him back together. ${re.need} days in a row. Again.` : `So I took ${re.name} back off your shelf. ${re.need} days. Same as before.`);
  ov.innerHTML = `<div class="ovbox"><h2>☠ ${fmtDate(d.date)}: YOU MISSED A DAY</h2><canvas id="dscene" class="px" width="${VIEW_W}" height="${VIEW_H}"></canvas>
    <div class="note" id="dnote" style="visibility:hidden"><canvas class="px" id="drac" width="30" height="28"></canvas><div class="from">From: The Raccoon</div><div class="cut">${cutout(msg)}</div></div>
    <div class="row" style="justify-content:space-between"><button class="btn ghost small" id="dreplay">Replay</button><button class="btn acc" id="dok" style="visibility:hidden">${re.same ? 'Try again' : 'Rescue ' + esc(re.name)}</button></div></div>`;
  noteAvatar($('#drac'));
  const ctx = $('#dscene').getContext('2d');
  let t0 = performance.now(), raf;
  const show = () => { $('#dnote').style.visibility = 'visible'; $('#dok').style.visibility = 'visible'; };
  const loop = now => {
    const t = freezeAt != null ? freezeAt : (now - t0) / 1000;
    drawDeath(ctx, { species: d.species, injuries: injBefore, type: d.type }, Math.min(t, DEATH_LEN + 30));
    if (t > DEATH_LEN - 1.2 || freezeAt >= DEATH_LEN - 1.2) show();
    if (freezeAt == null && $('#dscene')) raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  $('#dreplay').addEventListener('click', () => { t0 = performance.now(); });
  $('#dok').addEventListener('click', () => {
    cancelAnimationFrame(raf); ov.hidden = true; ov.innerHTML = ''; deathPlaying = false;
    localStorage.setItem('ph.deathSeen', String(d.id)); if (state) state.deathSeen = d.id;
    if (!DEMO) api('/seen-death', { id: d.id }).catch(() => {});
    render();
  });
}

function syncLogHtml(s) {
  const log = (s.syncLog || []);
  if (!log.length) return `<span class="dim">Nothing has reached The Raccoon yet. Run the "${SHORTCUT_NAME}" shortcut once by hand, then tap "I ran it, check steps" below.</span>`;
  const line = e => `${e.ok ? '✅' : '❌'} ${timePT(e.at)} · ${ago(e.at)} · ${e.ok ? (e.dry ? 'dry run, ' : '') + fmt(e.steps) + ' steps' : esc(e.reason || 'failed')}${e.raw != null && !e.ok ? ` <span class="dim">(got "${esc(e.raw)}")</span>` : ''}${e.codeNote ? ` <span class="dim">· ${esc(e.codeNote)}</span>` : ''}`;
  return `<div>${line(log[0])}</div>` + (log.length > 1 ? `<div class="dim" style="margin-top:6px">Earlier:<br>${log.slice(1).map(line).join('<br>')}</div>` : '');
}
function syncUrl() { return `${WORKER}/sync?code=${code}&steps=`; }
function renderSync() {
  view.innerHTML = `
    <h2>LAST SYNC ATTEMPT</h2>
    <div class="card" id="synclog">${syncLogHtml(state)}</div>
    <h2>SET UP STEP SYNC</h2>
    <p class="dim">Your iPhone counts steps into Apple Health (Garmin steps land there too). A Shortcut sends today's total to The Raccoon. Build it once, then automate it.</p>
    <div class="card">
      <div class="dim">Your sync code</div>
      <div class="row" style="justify-content:space-between"><span class="big-code">${esc(code)}</span><button class="btn small" data-copy="${esc(code)}">Copy</button></div>
      <div class="dim" style="margin-top:10px">Sync URL (paste into the Shortcut)</div>
      <div class="code" id="surl">${esc(syncUrl())}</div>
      <p><button class="btn acc" data-copy="${esc(syncUrl())}">Copy sync URL</button></p>
    </div>
    <h2>1. BUILD THE SHORTCUT</h2>
    <ol class="guide">
      <li>Open the <b>Shortcuts</b> app, tap <b>+</b>, and name it <b>${SHORTCUT_NAME}</b> (exact name, so the Sync now button can find it).</li>
      <li>Add <b>Find Health Samples</b>. Set Type to <b>Steps</b>, add the filter <b>Start Date is Today</b>, and set <b>Group By</b> to <b>Day</b> (this gives Health's real daily total with no double counting from phone + watch).</li>
      <li>Add <b>Calculate Statistics</b>, set it to <b>Sum</b> of the Health Samples.</li>
      <li>Add <b>Get Contents of URL</b>. Paste the sync URL above, then tap right after <b>steps=</b> and insert the <b>Statistics Result</b> variable.</li>
      <li>Optional: add <b>Show Result</b> on <b>Contents of URL</b> to see The Raccoon's reply.</li>
      <li>Tap ▶︎ once. Allow Health access and allow it to connect to <b>workers.dev</b>.</li>
    </ol>
    <h2>2. AUTOMATE IT</h2>
    <ol class="guide">
      <li>In Shortcuts, open the <b>Automation</b> tab, tap <b>+</b> (or New Automation).</li>
      <li>Pick <b>Time of Day</b>, set <b>11:30 PM</b>, <b>Daily</b>, and choose <b>Run Immediately</b> (turn off Notify When Run).</li>
      <li>Tap Next and pick <b>${SHORTCUT_NAME}</b>.</li>
      <li>Repeat for a few daytime times (e.g. <b>12 PM, 3 PM, 6 PM, 9 PM</b>) so The Raccoon's nudges know how you're doing. One automation per time.</li>
    </ol>
    <p class="dim">The 11:30 PM sync is the one that matters: a day is judged at midnight Pacific with whatever steps were synced last.</p>
    <h2>TEST IT</h2>
    <p><button class="btn" id="refresh">I ran it, check steps</button></p>
    <div id="synctest" class="dim"></div>
  `;
  view.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); toast('Copied'); } catch { toast('Copy failed, long-press to select'); }
  }));
  $('#refresh').addEventListener('click', async () => {
    await refresh(true);
    $('#synclog').innerHTML = syncLogHtml(state);
    $('#synctest').textContent = state.lastSync ? `Last sync ${timePT(state.lastSync)} (${ago(state.lastSync)}): ${fmt(state.lastSteps)} steps.` : 'Nothing received yet.';
  });
}

function renderSettings() {
  const s = state;
  const pushSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  let pushHint = '';
  if (isIOS && !isStandalone()) pushHint = 'On iPhone, notifications only work from the home-screen app: Share → Add to Home Screen, then open Pet Hostage from there.';
  else if (!pushSupported) pushHint = 'This browser can\'t do web push.';
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  view.innerHTML = `
    <h2>NOTIFICATIONS</h2>
    <div class="card">
      <p>The Raccoon sends "encouragement" around noon, 3, 6 and 9 PM if you're behind, a note when you pay, and a morning report on yesterday (rescues, deaths, re-kidnappings).</p>
      <p class="dim">Status: ${s.push ? 'subscribed ✅' : 'off'} · permission: ${perm}</p>
      ${pushHint ? `<p class="hint">${pushHint}</p>` : ''}
      <div class="row">
        <button class="btn acc" id="pushon" ${pushHint ? 'disabled' : ''}>${s.push ? 'Re-enable' : 'Enable notifications'}</button>
        <button class="btn" id="pushtest" ${s.push ? '' : 'disabled'}>Send test nudge</button>
      </div>
      <div id="pushmsg" class="dim" style="margin-top:8px"></div>
    </div>
    <h2>RANSOM</h2>
    <div class="card">
      <label for="pname">Current hostage's name</label><input type="text" id="pname" maxlength="24" value="${esc(s.hostage.name)}">
      <p><button class="btn" id="save">Save</button></p>
      <p class="dim">Rules: the ransom is always <b>10,000 steps a day</b>, judged at midnight Pacific. Each pet on the ladder needs a streak to rescue: 3 days for the bunny, then 5, 7, 9... Rescued pets go on the shelf and The Raccoon grabs the next animal. Miss a single day and the current hostage meets a cartoon end, then The Raccoon takes your last rescued pet back, and you rescue it again with its original day count. Pets that died come back patched up.</p>
    </div>
    <h2>THIS DEVICE</h2>
    <div class="card">
      <p class="dim">Sync code <span class="code">${esc(code)}</span>. Your hostages live on the server, so any device that opens <span class="code">${APP_URL}</span> shows him.</p>
    </div>
    <p class="dim">${VERSION}</p>
  `;
  $('#save').addEventListener('click', async () => {
    try { state = await api('/settings', { name: $('#pname').value }); toast('Saved. The Raccoon has updated his notes.'); } catch (e) { toast('Save failed: ' + e.message); }
  });
  $('#pushon').addEventListener('click', enablePush);
  $('#pushtest').addEventListener('click', async () => {
    $('#pushmsg').textContent = 'Sending…';
    try { await api('/test-nudge', {}); $('#pushmsg').textContent = 'Sent. It should pop up in a few seconds.'; }
    catch (e) { $('#pushmsg').textContent = 'Push failed: ' + (e.body?.status ? 'push service said ' + e.body.status + ' ' : '') + (e.body?.detail || e.message); }
  });
}

function b64uToBytes(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); }
async function enablePush() {
  const msg = $('#pushmsg');
  try {
    const perm = await Notification.requestPermission(); // must be first thing in the tap handler on iOS
    if (perm !== 'granted') { msg.textContent = 'Permission ' + perm + '. You can change it in iPhone Settings → Notifications → Pet Hostage.'; return; }
    msg.textContent = 'Subscribing…';
    const reg = await navigator.serviceWorker.ready;
    const { publicKey } = await (await fetch(WORKER + '/vapid')).json();
    let sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe().catch(() => {});
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToBytes(publicKey) });
    await api('/subscribe', { subscription: sub.toJSON() });
    await refresh(true);
    toast('Notifications on. The Raccoon can reach you now.');
    render();
  } catch (e) { msg.textContent = 'Could not enable: ' + e.message; }
}

function renderWelcome() {
  const notHome = isIOS && !isStandalone();
  view.innerHTML = `<div class="welcome">
    <canvas id="scene" class="px" width="${VIEW_W}" height="${VIEW_H}"></canvas>
    <p>A raccoon in a fedora has taken a bunny hostage.</p>
    <p class="dim">The ransom: <b>10,000 steps a day</b>, 3 days in a row. Then he grabs someone else. Miss a single day and, well.</p>
    ${notHome ? `<p class="hint">Tip: tap Share → <b>Add to Home Screen</b> first. The home-screen app is the one that can get notifications.</p>` : ''}
    <p><button class="btn acc" id="claim">Accept the terms</button></p>
  </div>`;
  state = { mood: 'scared', hostage: { species: 'bunny', injuries: [] } };
  startScene($('#scene'));
  $('#claim')?.addEventListener('click', async () => {
    try { const r = await api('/claim', {}); code = r.code; localStorage.setItem('ph.code', code); state = r.state; rememberInUrl(); go('sync'); toast('Deal. Now set up step sync.'); }
    catch (e) { if (e.status === 409) boot2(); else toast('Could not reach The Raccoon: ' + e.message); }
  });
}

function render() {
  stopAnim();
  $('#tabs').hidden = !state;
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  if (tab === 'sync') renderSync(); else if (tab === 'settings') renderSettings(); else if (tab === 'shelf') renderShelf(); else renderHome();
  maybePlayDeath();
}
function go(t) { tab = t; render(); window.scrollTo(0, 0); }
document.querySelectorAll('#tabs button').forEach(b => b.addEventListener('click', () => go(b.dataset.tab)));

async function refresh(force) {
  if (DEMO) return;
  if (!force && Date.now() - lastFetch < 5000) return;
  lastFetch = Date.now();
  try { state = adoptCode(await api('/state')); }
  catch (e) {
    // Never forget the code. Only a server that has truly never been claimed shows the welcome screen.
    if (e.status === 404 && e.body?.error === 'unclaimed') { state = null; unclaimed = true; return; }
    toast('Offline? ' + e.message);
  }
}
function renderOffline() {
  $('#tabs').hidden = true;
  view.innerHTML = `<div class="welcome"><p>Can't reach The Raccoon right now. Your pets are safe on the server.</p><p><button class="btn acc" id="retry">Try again</button></p></div>`;
  $('#retry').addEventListener('click', boot2);
}

function demoState(m) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Vancouver' });
  const day = n => addDay(today, n);
  const hist = [11200, 10400, 8300, 12900, 10100, 10400, 10800, 13100, 9100, 10050, 11800, 11900, 10900];
  const sp = ['bunny', 'hamster', 'squirrel', 'hedgehog', 'kitten', 'duckling', 'piglet', 'panda'], nm = ['Chompsky', 'Nugget', 'Acorn', 'Prickles', 'Mittens', 'Puddles', 'Truffle', 'Bao'];
  const need = r => 3 + 2 * r;
  let rung = 2, streak = 2, inj = { 0: ['pop'], 1: [], 2: ['catapult'] }, todaySteps = 6120, hour = 18, mood = 'worried', lastDeath = null;
  if (m === 'happy') { todaySteps = 10342; mood = 'happy'; hour = 20; }
  if (m === 'stitched') { rung = 0; streak = 1; inj = { 0: ['pop', 'anvil', 'catapult', 'zap'] }; todaySteps = 10120; mood = 'happy'; hour = 20; }
  if (m === 'nosync') { rung = 0; streak = 0; inj = {}; todaySteps = 0; hour = 10; mood = 'happy'; }
  if (m === 'death' || m === 'rekidnap') { rung = 1; streak = 0; inj = { 0: ['pop'], 1: [], 2: ['catapult', qs.get('type') || 'pop'] }; todaySteps = 840; hour = 9; mood = 'happy';
    lastDeath = { id: 3, date: day(-1), rung: 2, name: 'Acorn', species: 'squirrel', type: qs.get('type') || 'pop', deaths: 2, rekidnap: { rung: 1, name: 'Nugget', species: 'hamster', need: 5, same: false } }; }
  const pet = r => ({ rung: r, name: nm[r], species: sp[r], need: need(r), deaths: (inj[r] || []).length, injuries: inj[r] || [], rescuedOn: r < rung ? day(-30 + r * 9) : null, rescues: 1 });
  const shelf = Array.from({ length: rung }, (_, r) => pet(r));
  const hostage = { ...pet(rung), streak, since: day(-streak), todayMet: todaySteps >= GOAL, day: streak + 1 };
  const top = Math.max(rung, m === 'death' ? 2 : rung) + 1;
  const ladder = Array.from({ length: 8 }, (_, r) => ({ rung: r, need: need(r), species: sp[r], name: nm[r], known: r <= top - 1 || m === 'lineup', status: r < rung ? 'rescued' : r === rung ? 'hostage' : 'locked', deaths: (inj[r] || []).length, injuries: inj[r] || [] }));
  return {
    v: 2, today, hour, goal: GOAL, todaySteps, lastSync: m === 'nosync' ? null : Date.now() - 23 * 60000, lastSteps: todaySteps, started: day(-40),
    hostage, shelf, ladder, mood, lastDeath, deathSeen: 0,
    deathLog: [lastDeath, { id: 2, date: day(-21), rung: 2, name: 'Acorn', species: 'squirrel', type: 'catapult', rekidnap: { name: 'Nugget', same: false } }, { id: 1, date: day(-33), rung: 0, name: 'Chompsky', species: 'bunny', type: 'pop', rekidnap: { name: 'Chompsky', same: true } }].filter(Boolean),
    stats: { metDays: 27, missedDays: 3, rescues: 4 }, push: true,
    days: Array.from({ length: 14 }, (_, i) => ({ date: day(i - 13), steps: i === 13 ? (todaySteps || null) : (m === 'nosync' ? null : hist[i]) })),
  };
}

async function boot2() {
  unclaimed = false;
  await refresh(true);
  if (state) { $('#tabs').hidden = false; render(); }
  else if (unclaimed) renderWelcome();
  else renderOffline();
}
async function boot() {
  if ('serviceWorker' in navigator && !DEMO) navigator.serviceWorker.register('sw.js').catch(() => {});
  if (DEMO) {
    code = 'DEMO123456'; state = demoState(DEMO); tab = qs.get('tab') || (DEMO === 'lineup' ? 'shelf' : 'home'); render();
    if (DEMO === 'death') playDeath(state.lastDeath, qs.has('f') ? +qs.get('f') : undefined);
    return;
  }
  rememberInUrl();
  await boot2();
  setInterval(() => { if (state && document.visibilityState === 'visible' && tab === 'home') refresh().then(() => state && tab === 'home' && !deathPlaying && render()); }, REFRESH_MS);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && state) refresh(true).then(() => state && !deathPlaying && (tab === 'home' ? render() : maybePlayDeath())); });
}
boot();

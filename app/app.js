import { drawScene, raccoon, blit, VIEW_W, VIEW_H } from './art.js';

// ---- tunables ----
const VERSION = 'v0.1.1';
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
let state = null, tab = 'home', anim = null, lastFetch = 0, unclaimed = false;

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
function homeNote(s) {
  const name = s.pet.name, left = Math.max(0, s.goal - s.todaySteps), h = s.hour;
  const r = seeded(s.today + s.mood + Math.floor(Date.now() / 3.6e6));
  const pick = a => a[Math.floor(r() * a.length)].replace(/\{name\}/g, name).replace(/\{left\}/g, fmt(left)).replace(/\{goal\}/g, fmt(s.goal)).replace(/\{steps\}/g, fmt(s.todaySteps));
  if (s.mood === 'ghost') return pick(['{name} is a little ghost now. Still adorable. Somehow worse.', 'You stopped paying. I kept my word. Adopt another?', 'Boo. That was {name}. He says hi from the other side.']);
  if (!s.lastSync) return pick(['I have your bunny. Set up step sync so I can see your payments.', 'No payments received. Because you have not set up step sync. Do it.']);
  if (left === 0) return pick(['Ransom paid. {name} lives. {name} is doing a happy little binky.', '{goal} steps. Fine. FINE. {name} gets a carrot.', 'Paid in full. {name} nibbled the cage bars to celebrate. I am replacing them.']);
  if (s.pet.peril >= 2) return pick(['One more missed day and {name} becomes stew. {left} steps.', '{name} is dangling over the pot, being very brave. {left} steps. Save the bunny.']);
  if (s.pet.peril === 1) return pick(['{name} is tied to a chair. Pay {left} steps and he moves back to the cage.', 'You missed a day. The chair is the warning. The pot is next. {left} steps.']);
  if (h < 11) return pick(['Good morning. {name} has been up since 5 AM doing zoomies. {left} steps today.', 'New day, new ransom: {goal} steps.']);
  if (h < 17) return pick(['{steps} so far. {left} to go. {name} is fine. For now.', 'Tick tock. {left} steps. The pot is in the closet, just saying.']);
  if (h < 21) return pick(['Evening. {left} steps or the stove comes on.', 'Dinner time. Rabbit is ALSO dinner. {left} steps.']);
  return pick(['LAST CALL. {left} steps before midnight.', 'Pace the hallway. {left} steps. MOVE.']);
}
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
    drawScene(ctx, { mood: state.mood, peril: state.pet.peril }, (now - t0) / 1000);
    anim = requestAnimationFrame(loop);
  };
  anim = requestAnimationFrame(loop);
}
function noteAvatar(canvas) {
  const ctx = canvas.getContext('2d');
  const g = raccoon(0, -1);
  blit(ctx, g, 0, 0);
}

function renderHome() {
  const s = state, pet = s.pet;
  const prog = Math.min(1, s.todaySteps / s.goal);
  const filled = Math.floor(prog * BAR_SEGMENTS);
  const captiveDays = Math.round((new Date(s.today) - new Date(pet.born)) / 864e5) + 1;
  const pips = Array.from({ length: s.deathAt }, (_, i) => `<span class="pip ${i < pet.peril ? 'on' : ''}">💀</span>`).join('');
  const maxSteps = Math.max(s.goal * 1.3, ...s.days.map(d => d.steps || 0));
  const chart = s.days.map(d => {
    const cls = d.steps == null ? (d.date < pet.born || d.date === s.today ? '' : 'none') : (d.steps >= s.goal ? 'met' : d.date === s.today ? '' : 'miss');
    return `<div class="${cls} ${d.date === s.today ? 'today' : ''}" style="height:${Math.round(100 * (d.steps || 0) / maxSteps)}%" title="${d.date}: ${d.steps ?? 'no data'}"></div>`;
  }).join('');
  view.innerHTML = `
    <div class="status"><span class="name">${esc(pet.name)}</span><span class="pips" title="Missed days">${pips}</span></div>
    <canvas id="scene" class="px" width="${VIEW_W}" height="${VIEW_H}"></canvas>
    <div class="status"><span class="dim">${pet.alive ? 'Captivity day ' + captiveDays : 'Died ' + esc(pet.died || '')}</span><span class="stage">${esc(s.perilLabel)}</span></div>
    ${pet.alive ? `
    <div class="steps"><b>${fmt(s.todaySteps)}</b><span>/ ${fmt(s.goal)} steps today</span></div>
    <div class="bar ${prog >= 1 ? 'done' : ''}">${Array.from({ length: BAR_SEGMENTS }, (_, i) => `<i class="${i < filled ? 'f' : ''}"></i>`).join('')}</div>
    <div class="sync">${s.lastSync ? `<span>Last sync ${timePT(s.lastSync)} · ${ago(s.lastSync)}</span>` : `<span class="hint">No steps synced yet</span>`}
      ${s.lastSync ? `<button class="btn small ghost" id="syncnow">Sync now</button>` : `<button class="btn small acc" id="gosetup">Set up step sync</button>`}</div>` : `
    <div class="card"><p>${esc(pet.name)} missed ${s.deathAt} ransoms in a row and is now a very cheerful ghost.</p>
      <label>Name your next hostage</label><input type="text" id="newname" maxlength="24" placeholder="Chompsky II">
      <p><button class="btn acc" id="adopt">Adopt a new bunny</button></p></div>`}
    <div class="note"><canvas class="px" id="rac" width="30" height="28"></canvas><div class="from">From: The Raccoon</div><div class="cut">${cutout(homeNote(s))}</div></div>
    <div class="legend"><span>🔥 Streak ${pet.streak} · best ${pet.bestStreak}</span><span>${pet.metDays} paid · ${pet.missedDays} missed</span></div>
    <h2>LAST 14 DAYS</h2>
    <div class="chart">${chart}</div>
    <div class="legend"><span>${s.days[0].date.slice(5)}</span><span>today</span></div>
  `;
  startScene($('#scene')); noteAvatar($('#rac'));
  $('#gosetup')?.addEventListener('click', () => go('sync'));
  $('#syncnow')?.addEventListener('click', () => { location.href = 'shortcuts://run-shortcut?name=' + encodeURIComponent(SHORTCUT_NAME); });
  $('#adopt')?.addEventListener('click', async () => {
    try { state = await api('/adopt', { name: $('#newname').value.trim() || undefined }); toast('A new bunny has been "acquired".'); render(); } catch (e) { toast('Adopt failed: ' + e.message); }
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
      <p>The Raccoon sends "encouragement" around noon, 3, 6 and 9 PM if you're behind, a note when you pay, and a morning report on yesterday.</p>
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
      <label for="goal">Daily step goal</label><input type="number" id="goal" min="500" max="100000" step="500" value="${s.goal}">
      <label for="pname">Hostage name</label><input type="text" id="pname" maxlength="24" value="${esc(s.pet.name)}">
      <p><button class="btn" id="save">Save</button></p>
      <p class="dim">Rules: pay the goal each day (midnight Pacific). Miss one and the bunny moves closer to the pot. Pay again and he moves back one step. ${s.deathAt} misses in a row and he's a ghost. Adoption day only counts if you pay.</p>
    </div>
    <h2>GRAVEYARD</h2>
    <div class="card">${s.graveyard.length ? s.graveyard.map(g => `<div class="grave"><span>🪦</span><span><b>${esc(g.name)}</b> <span class="dim">${esc(g.born)} → ${esc(g.died)} · best streak ${g.bestStreak}${g.released ? ' · released' : ''}</span></span></div>`).join('') : '<span class="dim">Empty. For now.</span>'}</div>
    <h2>THIS DEVICE</h2>
    <div class="card">
      <p class="dim">Sync code <span class="code">${esc(code)}</span>. Your bunny lives on the server, so any device that opens <span class="code">${APP_URL}</span> shows him.</p>
    </div>
    <p class="dim">${VERSION}</p>
  `;
  $('#save').addEventListener('click', async () => {
    try { state = await api('/settings', { goal: +$('#goal').value, name: $('#pname').value }); toast('Saved. The Raccoon has updated his demands.'); } catch (e) { toast('Save failed: ' + e.message); }
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
    <p class="dim">The ransom: <b>10,000 steps a day</b>. Miss a day and things get worse. Miss three in a row and, well.</p>
    ${notHome ? `<p class="hint">Tip: tap Share → <b>Add to Home Screen</b> first. The home-screen app is the one that can get notifications.</p>` : ''}
    <p><button class="btn acc" id="claim">Accept the terms</button></p>
  </div>`;
  state = { mood: 'scared', pet: { peril: 0 } };
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
  if (tab === 'sync') renderSync(); else if (tab === 'settings') renderSettings(); else renderHome();
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
  view.innerHTML = `<div class="welcome"><p>Can't reach The Raccoon right now. Your bunny is safe on the server.</p><p><button class="btn acc" id="retry">Try again</button></p></div>`;
  $('#retry').addEventListener('click', boot2);
}

function demoState(m) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Vancouver' });
  const day = n => { const d = new Date(today + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const hist = [11200, 10400, 8300, 12900, 10100, 6400, 10800, 13100, 9100, 10050, 7800, 11900, 6900];
  const peril = { happy: 0, worried: 0, scared: 1, peril: 2, ghost: 3, nosync: 0 }[m] ?? 0;
  const todaySteps = { happy: 10342, worried: 3120, scared: 4410, peril: 6120, ghost: 0, nosync: 0 }[m] ?? 0;
  return {
    today, hour: m === 'happy' ? 20 : 18, goal: 10000, todaySteps, lastSync: m === 'nosync' ? null : Date.now() - 23 * 60000, lastSteps: todaySteps,
    pet: { name: 'Chompsky', born: day(-13), alive: m !== 'ghost', died: m === 'ghost' ? day(-1) : null, peril, streak: m === 'happy' ? 4 : 0, bestStreak: 6, metDays: 8, missedDays: 4 },
    mood: m === 'nosync' ? 'happy' : m, perilLabel: ['Caged (oblivious)', 'Tied to a chair', 'Dangling over the stew pot', 'Gone'][peril], deathAt: 3,
    graveyard: m === 'ghost' ? [] : [{ name: 'Nibbles', born: day(-40), died: day(-14), bestStreak: 5, metDays: 20 }], push: true,
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
  if (DEMO) { code = 'DEMO123456'; state = demoState(DEMO); tab = qs.get('tab') || 'home'; render(); return; }
  rememberInUrl();
  await boot2();
  setInterval(() => { if (state && document.visibilityState === 'visible' && tab === 'home') refresh().then(() => state && tab === 'home' && render()); }, REFRESH_MS);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && state) refresh(true).then(() => state && (tab === 'home') && render()); });
}
boot();

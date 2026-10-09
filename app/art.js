// Pet Hostage pixel art: everything is drawn in code on tiny grids, then scaled up crisp.
// Shapes are filled on a grid and auto-outlined, which keeps the chunky 16-bit look.
const PAL = {
  k: '#5a3f66', w: '#fffaf4', g: '#f3e3ea', G: '#e2cbd8', p: '#ffc1d8', P: '#ff8fb8', r: '#ff7a96', R: '#c44a6a',
  t: '#ffffff', b: '#3a2340', B: '#6b4a8a', s: '#8fd8ff', y: '#ffe27a', o: '#ff9a2a',
};
const GHOST = { ...PAL, w: '#eaf7ff', g: '#cfe9fb', G: '#b5daf3', k: '#7a9cc6', p: '#d9eeff', P: '#b8dcf7', r: '#9cc8ee', R: '#7aa6d6', b: '#5a7fb0', B: '#7d9fcc' };

function grid(w, h) { return { w, h, a: new Array(w * h).fill(null) }; }
function set(g, x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < g.w && y < g.h) g.a[y * g.w + x] = c; }
function get(g, x, y) { return x >= 0 && y >= 0 && x < g.w && y < g.h ? g.a[y * g.w + x] : null; }
function ell(g, cx, cy, rx, ry, c, opt = {}) {
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++)
    for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy > 1) continue;
      if (opt.lower && y + 0.5 < cy) continue;
      if (opt.upper && y + 0.5 > cy) continue;
      let col = c;
      if (opt.shade) { const sx = (x + 0.5 - cx + opt.sd) / rx, sy = (y + 0.5 - cy + opt.sd) / ry; if (sx * sx + sy * sy > 1) col = opt.shade; }
      set(g, x, y, col);
    }
}
function rect(g, x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(g, x + i, y + j, c); }
function outline(g, c) {
  const add = [];
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    if (get(g, x, y)) continue;
    if (get(g, x - 1, y) || get(g, x + 1, y) || get(g, x, y - 1) || get(g, x, y + 1)) add.push([x, y]);
  }
  for (const [x, y] of add) set(g, x, y, c);
}
// An ear: a tall ellipse that can lean (shear) and flop its tip.
function ear(g, cx, baseY, len, lean, col, inner, shade) {
  for (let y = baseY - len; y <= baseY; y++) {
    const f = (baseY - y) / len; // 0 at base, 1 at tip
    const x0 = cx + lean * f * f * len * 0.5;
    const half = 2.8 * Math.sqrt(Math.max(0, 1 - Math.pow((f - 0.45) / 0.58, 2)));
    for (let x = Math.floor(x0 - half); x <= x0 + half; x++) {
      const inside = Math.abs(x + 0.5 - x0) < half * 0.42 && f > 0.15 && f < 0.85;
      set(g, x, y, inside ? inner : (x + 0.5 > x0 + half * 0.55 ? shade : col));
    }
  }
}

// mood: happy | worried | scared | peril | ghost. Cute first: big head, big shiny eyes, round body, tiny buck-tooth grin.
export function bunny(mood, t) {
  const g = grid(36, 38);
  const ghost = mood === 'ghost';
  const cx = 18;
  const droop = mood === 'scared' || mood === 'peril';
  // ears: soft and rounded; one flops when worried, both droop when scared
  ear(g, cx - 5, 12, droop ? 8 : 10, droop ? -1.1 : -0.25 + Math.sin(t * 2.2) * 0.05, 'w', 'p', 'g');
  ear(g, cx + 5, 12, droop ? 8 : 10, droop ? 1.1 : mood === 'worried' ? 0.9 : 0.3 + Math.sin(t * 2.2 + 1) * 0.06, 'w', 'p', 'g');
  if (!ghost) {
    ell(g, cx, 31, 7.2, 5.6, 'w', { shade: 'g', sd: 1.4 });
    ell(g, cx - 4.5, 35.6, 2.8, 1.5, 'w', { shade: 'g', sd: 0.6 });
    ell(g, cx + 4.5, 35.6, 2.8, 1.5, 'w', { shade: 'g', sd: 0.6 });
    ell(g, cx + 7.5, 32.5, 2, 2, 'w'); // cotton tail peeking out
  } else {
    for (let y = 0; y < 10; y++) {
      const w = 7 - y * 0.5 + Math.sin(t * 4 + y * 0.9) * 0.7, x0 = cx + Math.sin(t * 2 + y * 0.6) * (y * 0.3);
      for (let x = Math.floor(x0 - w); x <= x0 + w; x++) set(g, x, 27 + y, y > 6 && (x + y) % 3 === 0 ? null : 'w');
    }
  }
  const armsUp = mood === 'happy' && Math.sin(t * 5) > 0.3;
  ell(g, cx - 6.5, armsUp ? 26 : 30.5, 1.8, 2.4, 'w', { shade: 'g', sd: 0.6 });
  ell(g, cx + 6.5, armsUp ? 26 : 30.5, 1.8, 2.4, 'w', { shade: 'g', sd: 0.6 });
  ell(g, cx, 20.5, 11.6, 9.4, 'w', { shade: 'g', sd: 1.8 }); // big round head
  if (!ghost) ell(g, cx, 32, 3.8, 3, 'g');
  outline(g, 'k');

  const blink = (t % 4.2) < 0.13;
  const sparkle = (ex, ey, big) => { // big shiny eyes
    ell(g, ex, ey, 2.7, 3.3, 'b'); ell(g, ex, ey + 1.2, 2.2, 1.6, 'B', { lower: true });
    rect(g, ex - 1.6, ey - 2, 2, 2, 't'); set(g, ex + 1, ey + 1.5, 't');
    if (big) set(g, ex - 0.6, ey + 2, 't');
  };
  const eyesY = 20.5, lx = cx - 5, rx = cx + 5;
  if (ghost) { // peaceful closed eyes (u u)
    for (const ex of [lx, rx]) { set(g, ex - 1.5, eyesY, 'b'); set(g, ex - 0.5, eyesY + 1, 'b'); set(g, ex + 0.5, eyesY + 1, 'b'); set(g, ex + 1.5, eyesY, 'b'); }
  } else if (blink) {
    for (const ex of [lx, rx]) rect(g, ex - 1.5, eyesY + 0.5, 4, 1, 'b');
  } else if (mood === 'happy' && Math.sin(t * 1.3) > 0.85) { // ^ ^ joy squint
    for (const ex of [lx, rx]) { set(g, ex - 1.5, eyesY + 1, 'b'); set(g, ex - 0.5, eyesY, 'b'); set(g, ex + 0.5, eyesY, 'b'); set(g, ex + 1.5, eyesY + 1, 'b'); }
  } else {
    sparkle(lx, eyesY, mood !== 'happy'); sparkle(rx, eyesY, mood !== 'happy');
  }
  if (mood === 'worried' || mood === 'scared' || mood === 'peril') { // worried brows
    for (let i = 0; i < 3; i++) { set(g, lx - 1 + i, eyesY - 4.5 - i * 0.4, 'k'); set(g, rx + 1 - i, eyesY - 4.5 - i * 0.4, 'k'); }
  }
  // blush + tiny nose
  rect(g, lx - 4, 24, 3, 1.6, 'p'); rect(g, rx + 2, 24, 3, 1.6, 'p');
  rect(g, cx - 1, 23.5, 2, 1, 'P');
  // mouth: a small mischievous buck-tooth grin
  if (mood === 'happy' || ghost) {
    ell(g, cx, 25, 3, 2.6, 'k', { lower: true }); ell(g, cx, 25, 2.1, 1.8, 'R', { lower: true });
    set(g, cx - 1.5, 26.4, 'r'); set(g, cx - 0.5, 26.4, 'r');
    rect(g, cx - 2, 25, 2, 1.5, 't'); rect(g, cx + 0.1, 25, 2, 1.5, 't');
  } else if (mood === 'worried') {
    for (let x = -2; x <= 2; x++) set(g, cx + x, 25.5 + (Math.abs(x) === 1 ? -0.6 : 0), 'k');
    rect(g, cx - 1, 26, 2, 1, 't');
  } else { // scared / peril: little wobbly "o" with chattering teeth
    const open = Math.sin(t * 16) > 0 ? 1.7 : 1.2;
    ell(g, cx, 26, 1.9, open + 0.6, 'k'); ell(g, cx, 26, 1.1, open - 0.2, 'R');
    rect(g, cx - 1, 25, 2, 1, 't');
  }
  // sweat drop / tears
  if (mood === 'worried' || mood === 'peril') {
    const d = (t * 6) % 5;
    set(g, cx + 11, 12 + d, 's'); set(g, cx + 11, 13 + d, 's'); set(g, cx + 12, 13 + d, 's');
  }
  if (mood === 'scared' || mood === 'peril') {
    const d = Math.floor(t * 8) % 4;
    set(g, lx - 2, eyesY + 3 + d, 's'); set(g, rx + 2, eyesY + 3 + ((d + 2) % 4), 's');
  }
  if (ghost) for (let x = -5; x <= 5; x++) set(g, cx + x, 1 + (Math.abs(x) > 3 ? 1 : 0), 'y');
  g.pal = ghost ? GHOST : PAL; g.alpha = ghost ? 0.88 : 1;
  return g;
}

// The kidnapper: a raccoon in a fedora with shifty eyes.
export function raccoon(t, look = 0) {
  const g = grid(30, 28);
  ell(g, 7, 9, 3.2, 3.6, 'h'); ell(g, 23, 9, 3.2, 3.6, 'h');
  ell(g, 15, 16, 10.5, 8.2, 'h', { shade: 'H', sd: 1.5 });
  ell(g, 15, 21, 5.6, 3.8, 'm');
  outline(g, 'k');
  ell(g, 7, 9.5, 1.6, 2, 'd'); ell(g, 23, 9.5, 1.6, 2, 'd');
  ell(g, 10, 15.5, 4.6, 2.6, 'd'); ell(g, 20, 15.5, 4.6, 2.6, 'd');
  const sh = look || (Math.sin(t * 1.3) > 0.3 ? 1 : Math.sin(t * 1.3) < -0.3 ? -1 : 0);
  rect(g, 9, 15, 3, 2, 'e'); rect(g, 19, 15, 3, 2, 'e');
  rect(g, 10 + sh, 15, 1, 2, 'b'); rect(g, 20 + sh, 15, 1, 2, 'b');
  for (let i = 0; i < 4; i++) { set(g, 8 + i, 12 + i * 0.35, 'k'); set(g, 23 - i, 12 + i * 0.35, 'k'); } // angry brows
  rect(g, 14, 19, 3, 2, 'b');
  for (let x = 13; x <= 19; x++) set(g, x, 23 - (x > 16 ? (x - 16) * 0.4 : 0), 'k'); // smirk
  // fedora
  rect(g, 3, 8, 24, 2, 'f'); rect(g, 7, 2, 16, 6, 'f'); rect(g, 7, 6, 16, 1, 'F'); rect(g, 8, 2, 14, 1, 'Q');
  for (let x = 2; x <= 27; x++) { if (!get(g, x, 7) || get(g, x, 7) === 'k') set(g, x, 7, x >= 3 && x <= 26 && (x < 7 || x > 22) ? 'k' : get(g, x, 7)); }
  rect(g, 6, 1, 18, 1, 'k'); rect(g, 2, 10, 26, 1, 'k'); set(g, 2, 8, 'k'); set(g, 2, 9, 'k'); set(g, 27, 8, 'k'); set(g, 27, 9, 'k');
  for (let y = 1; y < 8; y++) { set(g, 6, y, 'k'); set(g, 23, y, 'k'); }
  g.pal = { k: '#1d1622', h: '#8d93a6', H: '#6b7088', m: '#ece6da', d: '#2b2a38', e: '#ffffff', b: '#0b0710', f: '#5a3d2b', F: '#1a1010', Q: '#7a5640' };
  g.alpha = 1;
  return g;
}

export function blit(ctx, g, ox, oy, opt = {}) {
  ctx.save(); ctx.globalAlpha = (opt.alpha ?? 1) * (g.alpha ?? 1);
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    const c = g.a[y * g.w + x]; if (!c) continue;
    ctx.fillStyle = g.pal[c] || c;
    const dx = opt.flipX ? g.w - 1 - x : x, dy = opt.flipY ? g.h - 1 - y : y;
    ctx.fillRect(Math.round(ox) + dx, Math.round(oy) + dy, 1, 1);
  }
  ctx.restore();
}

// ---- the scene (128 x 112 logical pixels) ----
export const SCENE_W = 128, SCENE_H = 112;
// The visible window is a zoomed crop of the room so the bunny reads big on a phone.
export const VIEW_W = 100, VIEW_H = 88, VIEW_X = 14, VIEW_Y = 14;
function px(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }

function room(ctx, t, dark) {
  px(ctx, 0, 0, SCENE_W, SCENE_H, dark ? '#1b1626' : '#2c2340');
  for (let y = 0; y < 92; y += 6) for (let x = (y / 6) % 2 ? -6 : 0; x < SCENE_W; x += 12) {
    px(ctx, x, y, 11, 5, dark ? '#211b2e' : '#352a4b'); px(ctx, x, y, 11, 1, dark ? '#251f33' : '#3e3256');
  }
  px(ctx, 0, 92, SCENE_W, 20, '#3a2b25');
  for (let x = 0; x < SCENE_W; x += 16) px(ctx, x, 92, 1, 20, '#2a1d19');
  px(ctx, 0, 92, SCENE_W, 1, '#55403a');
  // swinging bulb + light
  const sw = Math.sin(t * 1.4) * 3;
  for (let y = 0; y < 20; y++) px(ctx, 64 + sw * (y / 20), y, 1, 1, '#111');
  ctx.save(); ctx.globalAlpha = dark ? 0.05 : 0.09; ctx.fillStyle = '#ffe9a0';
  ctx.beginPath(); ctx.moveTo(64 + sw, 22); ctx.lineTo(18 + sw * 3, 112); ctx.lineTo(110 + sw * 3, 112); ctx.closePath(); ctx.fill(); ctx.restore();
  px(ctx, 62 + sw, 20, 5, 4, dark ? '#776a3a' : '#ffe27a'); px(ctx, 63 + sw, 24, 3, 1, dark ? '#776a3a' : '#ffd84a'); px(ctx, 63 + sw, 19, 3, 1, '#666');
}
function cage(ctx, x, y, w, h) {
  px(ctx, x, y, w, 2, '#9aa0ad'); px(ctx, x, y + h - 2, w, 2, '#9aa0ad');
  for (let i = 0; i <= w; i += 8) { px(ctx, x + i, y, 1, h, '#c5cad6'); }
  const lx = x + w - 12, ly = y + h - 14;
  px(ctx, lx, ly, 7, 6, '#e0b43a'); px(ctx, lx + 1, ly - 3, 5, 3, '#9aa0ad'); px(ctx, lx + 2, ly - 2, 3, 2, '#2c2340'); px(ctx, lx + 3, ly + 2, 1, 2, '#5a3d10');
}
function chair(ctx, x, y) {
  const c = '#7a4a2a', d = '#4e2e1a';
  px(ctx, x, y, 3, 44, d); px(ctx, x + 33, y, 3, 44, d);
  px(ctx, x, y, 36, 3, c); px(ctx, x, y + 8, 36, 2, c);
  px(ctx, x - 2, y + 30, 40, 4, c); px(ctx, x, y + 34, 3, 14, d); px(ctx, x + 33, y + 34, 3, 14, d);
}
function rope(ctx, x, y, w) {
  for (let i = 0; i < w; i++) px(ctx, x + i, y, 1, 3, (i % 3 === 0) ? '#8a5a2a' : '#d9a35a');
}
function pot(ctx, t, x, y, hot) {
  if (hot) for (let i = 0; i < 6; i++) { const f = Math.sin(t * 12 + i * 2) * 2; px(ctx, x + 8 + i * 6, y + 20 - f, 4, 4 + f, i % 2 ? '#ff6a1a' : '#ffc23a'); }
  px(ctx, x, y, 48, 4, '#3c3c46'); px(ctx, x + 2, y + 4, 44, 14, '#26262e'); px(ctx, x + 6, y + 18, 36, 3, '#26262e');
  px(ctx, x - 3, y + 1, 4, 3, '#3c3c46'); px(ctx, x + 47, y + 1, 4, 3, '#3c3c46');
  px(ctx, x + 2, y + 1, 44, 2, hot ? '#e0742a' : '#6c6a5a');
  if (hot) {
    for (let i = 0; i < 4; i++) { const b = (t * 2 + i * 0.37) % 1; px(ctx, x + 6 + i * 11, y - b * 3, 2, 2, '#f39a4a'); }
    px(ctx, x + 12, y, 5, 2, '#ff8a00'); px(ctx, x + 30, y + 1, 5, 2, '#ff8a00'); px(ctx, x + 34, y - 1, 2, 2, '#4caf50');
    ctx.save(); ctx.globalAlpha = 0.25;
    for (let i = 0; i < 3; i++) { const s = (t * 0.6 + i / 3) % 1; px(ctx, x + 10 + i * 13 + Math.sin(t * 2 + i) * 3, y - 4 - s * 30, 4, 4, '#ffffff'); }
    ctx.restore();
  }
}
function tomb(ctx, x, y) {
  px(ctx, x + 2, y, 12, 2, '#8a8f9c'); px(ctx, x, y + 2, 16, 16, '#8a8f9c'); px(ctx, x + 1, y + 1, 14, 1, '#8a8f9c');
  px(ctx, x + 7, y + 4, 2, 9, '#5d6170'); px(ctx, x + 4, y + 6, 8, 2, '#5d6170'); px(ctx, x - 2, y + 18, 20, 2, '#4a3a2a');
}

export function drawScene(ctx, st, t) {
  ctx.save(); ctx.translate(-VIEW_X, -VIEW_Y);
  const mood = st.mood, peril = st.peril;
  room(ctx, t, mood === 'ghost');
  const b = bunny(mood, t);
  if (mood === 'ghost') {
    pot(ctx, t, 40, 80, false); tomb(ctx, 98, 76);
    blit(ctx, b, 46, 26 + Math.sin(t * 2) * 4);
  } else if (peril >= 2) {
    pot(ctx, t, 40, 80, true);
    const sw = Math.sin(t * 1.8) * 4;
    for (let y = 0; y < 48; y++) px(ctx, 64 + sw * (y / 48), y, 1, 1, '#d9a35a');
    blit(ctx, b, 46 + sw, 18);
    rope(ctx, 56 + sw, 46, 17);
  } else if (peril === 1) {
    chair(ctx, 46, 50);
    const shake = mood === 'scared' ? (Math.sin(t * 18) > 0.6 ? 1 : 0) : 0;
    blit(ctx, b, 46 + shake, 54);
    rope(ctx, 50 + shake, 80, 28); rope(ctx, 51 + shake, 84, 26);
  } else {
    const hop = mood === 'happy' ? Math.abs(Math.sin(t * 4)) * 6 : Math.abs(Math.sin(t * 2)) * 1.5;
    blit(ctx, b, 46, 54 - hop);
    cage(ctx, 36, 46, 56, 47);
  }
  // the kidnapper peeks in from the right
  const r = raccoon(t);
  const peek = 92 + Math.round(Math.sin(t * 0.7) * 2);
  blit(ctx, r, peek, 40 + Math.round(Math.sin(t * 2.1)));
  ctx.restore();
}

// Round 3 bunny candidates: 5 genuinely different pixel styles, all tuned for "too cute to let die".
// Each style is a function (mood, t, opts) -> grid with its own palette; opts.walk = phase for a walk frame.
// Same grid/outline primitives as app/art.js so any of these can be dropped into critter() later.
import { _draw } from '../app/art.js';
const { grid, set, get, ell, rect, outline } = _draw;

const stamp = (g, l) => { for (let i = 0; i < l.a.length; i++) if (l.a[i]) g.a[i] = l.a[i]; };
// draw a part on its own layer, outline it, stack it on top (gives inner contour lines between parts)
function layer(g, draw, oc) { const l = grid(g.w, g.h); draw(l); if (oc) outline(l, oc); stamp(g, l); return l; }
// tapering thick polyline
function stroke(g, pts, r0, r1, col) {
  const L = []; let tot = 0;
  for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); L.push(l); tot += l; }
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.ceil(L[i] * 3);
    for (let k = 0; k <= n; k++) { const f = (acc + L[i] * k / n) / tot, r = r0 + (r1 - r0) * f; ell(g, x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, r, r, col); }
    acc += L[i]; }
}
// stamp a hand-pixelled pattern ('.' = skip); flip mirrors it horizontally
function pat(g, x, y, rows, flip = false) {
  rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const c = r[flip ? r.length - 1 - i : i]; if (c !== '.' && c !== ' ') set(g, x + i, y + j, c); } });
}
const recolor = (g, from, to, test = () => true) => { for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (get(g, x, y) === from && test(x, y)) set(g, x, y, to); };
// sphere-lit ellipse with a colour ramp (dark -> light), banded with a checker dither on band edges (SNES-style)
const LIGHT = (() => { const v = [-0.5, -0.7, 0.55], m = Math.hypot(...v); return v.map(a => a / m); })();
function litEll(g, cx, cy, rx, ry, ramp, bias = 0) {
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, q = nx * nx + ny * ny; if (q > 1) continue;
    const nz = Math.sqrt(1 - q), d = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
    const v = Math.max(0, Math.min(0.999, (d + 0.25 + bias) / 1.15)) * ramp.length, i = Math.floor(v), f = v - i;
    const k = f > 0.62 ? i + 1 : f < 0.38 ? i : i + ((x + y) & 1);
    set(g, x, y, ramp[Math.min(ramp.length - 1, k)]);
  }
}
const mirrorX = (W, x) => W - 1 - x;
const tearFrame = t => Math.floor(t * 5) % 3;

// ---------------------------------------------------------------- 1. Chibi: giant head, huge sparkle eyes
function chibi(mood, t = 0, o = {}) {
  const W = 40, H = 47, g = grid(W, H), wor = mood === 'worried', walk = o.walk != null, ph = o.walk || 0;
  const bob = walk ? -Math.round(Math.abs(Math.sin(ph)) * 2) : 0, hy = 21 + bob, M = x => mirrorX(W, x);
  const dr = wor ? 1 : 0, sway = walk ? Math.sin(ph) * 1.2 : 0;
  layer(g, l => { // ears
    for (const s of [-1, 1]) { const b = 20 + s * 6;
      stroke(l, [[b, hy - 6], [b + s * (1.5 + dr * 2) + sway, hy - 13 + dr * 2], [b + s * (3 + dr * 6) + sway * 1.5, hy - 18 + dr * 5]], 3.6, 2.7, 'w');
      stroke(l, [[b + s * 0.6, hy - 9], [b + s * (1.9 + dr * 2) + sway, hy - 13 + dr * 2], [b + s * (3 + dr * 5.5) + sway * 1.5, hy - 16.5 + dr * 5]], 1.6, 1.2, 'p'); }
  }, 'k');
  const fL = walk ? Math.sin(ph) * 1.6 : 0, fR = -fL;
  layer(g, l => { ell(l, 14.8 + fL, 43 - Math.max(0, fL), 3.6, 2.2, 'w', { shade: 'g', sd: 0.8 }); ell(l, 25.2 + fR, 43 - Math.max(0, fR), 3.6, 2.2, 'w', { shade: 'g', sd: 0.8 }); }, 'k');
  layer(g, l => ell(l, 20, 37 + bob, 8.2, 6.4, 'w', { shade: 'g', sd: 1.6 }), 'k');                       // body
  layer(g, l => ell(l, 20, hy, 14.2, 11.6, 'w', { shade: 'g', sd: 1.4 }), 'k');                           // big head
  layer(g, l => { const py = wor ? 34 : 35.4; ell(l, 17.2, py + bob, 1.8, 1.6, 'w'); ell(l, 22.8, py + bob, 1.8, 1.6, 'w'); }, 'k'); // tiny paws
  // head fluff curl
  for (const [x, y] of [[19, -12], [20, -12], [21, -13], [18, -11]]) set(g, x, hy + y, 'k');
  set(g, 19, hy - 11, 'w'); set(g, 20, hy - 11, 'w');
  // eyes 5x7
  const E = wor
    ? ['.eee.', 'ettee', 'ettee', 'eeeie', 'esSse', 'SsssS', '.SSS.']
    : ['.eee.', 'ettee', 'ettee', 'eeiie', 'eiiIe', 'eiItI', '.IjI.'];
  const ey = hy - 1;
  pat(g, 11, ey, E); pat(g, M(15), ey, E);
  if (!wor) { set(g, 10, ey + 1, 'e'); set(g, M(10), ey + 1, 'e'); } // lash flick
  // blush
  ell(g, 9.6, hy + 5.6, 2.6, 1.3, 'c'); ell(g, W - 9.6, hy + 5.6, 2.6, 1.3, 'c');
  set(g, 9, hy + 5, 't'); set(g, M(10), hy + 5, 't');
  set(g, 19, hy + 3, 'P'); set(g, 20, hy + 3, 'P'); // nose
  if (!wor) { for (const [x, y] of [[17, 4], [19, 4], [20, 4], [22, 4], [18, 5], [21, 5]]) set(g, x, hy + y, 'm'); }
  else {
    for (const [x, y] of [[18, 5], [19, 5], [20, 5], [21, 5], [17, 6], [22, 6]]) set(g, x, hy + y, 'm');
    set(g, 18, hy + 6, 'n'); set(g, 19, hy + 6, 'n'); set(g, 20, hy + 6, 'n'); set(g, 21, hy + 6, 'n'); for (let x = 18; x <= 21; x++) set(g, x, hy + 7, 'm');
    for (const [x, y] of [[11, -3], [12, -3], [13, -4], [14, -4]]) { set(g, x, hy + y, 'k'); set(g, M(x), hy + y, 'k'); } // worried brows
    const d = tearFrame(t); for (let k = 0; k < 3; k++) { set(g, 10, ey + 6 + d + k, 's'); set(g, M(10), ey + 6 + d + k, 's'); }
  }
  g.pal = { w: '#ffffff', g: '#f1dfee', k: '#9a6b8f', p: '#ffc4da', P: '#ff7fae', c: '#ffb0c8', e: '#2e1d45', i: '#5a48a6', I: '#9a86ea', j: '#d6ccff',
    t: '#ffffff', s: '#7fcfff', S: '#c4ecff', m: '#7a3552', n: '#ff8fa8' };
  return g;
}

// ---------------------------------------------------------------- 2. Mochi: squishy rice-cake blob
function mochi(mood, t = 0, o = {}) {
  const W = 38, H = 34, g = grid(W, H), wor = mood === 'worried', walk = o.walk != null, ph = o.walk || 0;
  const hop = walk ? Math.abs(Math.sin(ph)) : 0, lift = Math.round(hop * 3);
  const sx = walk ? 1 - hop * 0.1 + (1 - hop) * 0.06 : wor ? 0.94 : 1, sy = walk ? 1 + hop * 0.1 - (1 - hop) * 0.06 : wor ? 0.92 : 1;
  const jit = wor ? (Math.floor(t * 14) % 2) : 0, cx = 19 + jit * 0.5, base = 30 - lift, rx = 15.5 * sx, ry = 11 * sy, cy = base - ry + 2;
  ell(g, 19, 31.2, 11 - lift * 1.5, 1.4, 'h'); // ground shadow
  layer(g, l => { const ex = wor ? 5.5 : 5; // ears: short nubs, one flopped
    ell(l, cx - ex, cy - ry + 1, 2.9, 5, 'w'); stroke(l, [[cx + ex, cy - ry + 3], [cx + ex + 2, cy - ry - 1], [cx + ex + 5, cy - ry - 0.5]], 2.7, 2.4, 'w');
    ell(l, cx - ex, cy - ry + 0.5, 1.2, 3.2, 'p'); stroke(l, [[cx + ex + 1.5, cy - ry], [cx + ex + 4.4, cy - ry - 0.3]], 1.1, 1, 'p');
  }, 'k');
  layer(g, l => { ell(l, cx, cy, rx, ry, 'w', { shade: 'g', sd: 2.2 }); for (let y = base - 1; y < H; y++) for (let x = 0; x < W; x++) set(l, x, y, null);
    for (let x = 0; x < W; x++) if (get(l, x, base - 2)) set(l, x, base - 2, 'g'); }, 'k');
  ell(g, cx - 8, cy - 5, 2.6, 1.4, 't'); set(g, Math.round(cx - 4), Math.round(cy - 6.5), 't'); // glossy shine
  pat(g, Math.round(cx) - 2, Math.round(cy - ry) + 1, ['.f.', 'fyf', '.f.']); // little blossom
  const fy = Math.round(cy + 1), M = x => Math.round(2 * cx - 1 - x);
  const happyEye = ['.ee.', 'e..e', 'e..e'], glossy = wor ? ['.ee.', 'etee', 'eeee', 'ssss', '.s..'] : ['.ee.', 'etee', 'eeee', '.ee.'];
  if (wor) { pat(g, Math.round(cx) - 10, fy - 2, glossy); pat(g, M(Math.round(cx) - 10) - 3, fy - 2, glossy); }
  else { pat(g, Math.round(cx) - 10, fy - 1, happyEye); pat(g, M(Math.round(cx) - 10) - 3, fy - 1, happyEye); }
  ell(g, cx - 10.5, fy + 2.4, 2.6, 1.3, 'c'); ell(g, cx + 10.5, fy + 2.4, 2.6, 1.3, 'c');
  for (const x of [-11, -10]) { set(g, Math.round(cx) + x, fy + 2, 'C'); } for (const x of [9, 10]) set(g, Math.round(cx) + x, fy + 2, 'C');
  const mx = Math.round(cx) - 3;
  if (!wor) { for (const [x, y] of [[0, 0], [2, 0], [3, 0], [5, 0], [1, 1], [4, 1]]) set(g, mx + x, fy + 1 + y, 'm'); }
  else {
    for (const [x, y] of [[0, 1], [1, 0], [2, 1], [3, 1], [4, 0], [5, 1]]) set(g, mx + x, fy + 2 + y, 'm');
    const d = tearFrame(t); for (let k = 0; k < 2; k++) { set(g, Math.round(cx) - 9, fy + 3 + d + k, 's'); set(g, Math.round(cx) + 8, fy + 3 + d + k, 's'); }
    pat(g, Math.round(cx + rx) - 1, Math.round(cy - 6), ['.s.', 'sSs', 'sss', '.s.']); // sweat drop
    for (const yy of [0, 2]) { set(g, 1, Math.round(cy) + yy, 'k'); set(g, W - 2, Math.round(cy) + yy, 'k'); } // shiver marks
  }
  g.pal = { w: '#fff3f5', g: '#ffd6e0', k: '#d0849b', p: '#ffadc3', t: '#ffffff', f: '#ff9cc2', y: '#ffe27a', e: '#4a2a3a', m: '#9a4a62',
    c: '#ffb3c6', C: '#ff9ab3', s: '#7fcfff', S: '#c4ecff', h: '#00000030' };
  return g;
}

// ---------------------------------------------------------------- 3. Velvet: soft-lit 16-bit SNES sprite
function velvet(mood, t = 0, o = {}) {
  const W = 48, H = 57, g = grid(W, H), wor = mood === 'worried', walk = o.walk != null, ph = o.walk || 0, M = x => mirrorX(W, x);
  const bob = walk ? -Math.round(Math.abs(Math.sin(ph)) * 2) : 0, hy = 26 + bob;
  const F = ['1', '2', '3', '4', '5'], Q = ['q', 'Q', 'Q'];
  const tilt = wor ? 2 : 0, sw = walk ? Math.sin(ph) : 0;
  layer(g, l => { litEll(l, 16.5 - tilt + sw, hy - 14 + tilt, 3.9, 10.5, F, 0.05); litEll(l, 31.5 + tilt + sw, hy - 14 + tilt, 3.9, 10.5, F, 0.05);
    ell(l, 16.8 - tilt + sw, hy - 12 + tilt, 1.7, 7, 'p'); ell(l, 31.2 + tilt + sw, hy - 12 + tilt, 1.7, 7, 'p');
    ell(l, 16.4 - tilt + sw, hy - 12.5 + tilt, 0.7, 5, 'P'); ell(l, 30.8 + tilt + sw, hy - 12.5 + tilt, 0.7, 5, 'P'); }, 'k');
  const fA = walk ? Math.sin(ph) * 2 : 0;
  layer(g, l => litEll(l, 24, 44 + bob, 11, 9, F), 'k');
  ell(g, 24, 46.5 + bob, 6.4, 5.6, 'Q', { shade: 'q', sd: 1.3 });
  layer(g, l => { litEll(l, 16.5 + fA, 53 - Math.max(0, fA) * 0.6, 5, 2.4, F, 0.1); litEll(l, 31.5 - fA, 53 - Math.max(0, -fA) * 0.6, 5, 2.4, F, 0.1); }, 'k');
  layer(g, l => { litEll(l, 24, hy, 14.5, 12.2, F);
    for (const [x, y] of [[-15, 1], [-16, 2], [-15, 3], [-16, 4], [-15, 5]]) { set(l, 24 + x, hy + y, '3'); set(l, M(24 + x), hy + y, '2'); } }, 'k'); // cheek fluff
  ell(g, 24, hy + 4.6, 5.6, 3.6, 'Q', { shade: 'q', sd: 1.2 }); // muzzle
  layer(g, l => { const py = wor ? 40 : 42; litEll(l, 20, py + bob, 2.7, 2.4, F, 0.2); litEll(l, 28, py + bob, 2.7, 2.4, F, 0.2); }, 'k');
  const E = wor
    ? ['.eeeee.', 'eeeeeee', 'ettteie', 'etteiie', 'eeiiIie', 'eSsssSe', '.sSSSs.', '..sss..']
    : ['.eeeee.', 'eeeeeee', 'ettteie', 'etteiie', 'eeiiIie', 'eiIIjIe', 'eiIjjte', '.eeeee.'];
  const ey = hy - 4;
  pat(g, 13, ey, E); pat(g, M(19), ey, E);
  set(g, 12, ey + 1, 'e'); set(g, 11, ey, 'e'); set(g, M(12), ey + 1, 'e'); set(g, M(11), ey, 'e'); // lashes
  for (const [x, c] of [[13, 'c'], [14, 'c'], [15, 'c'], [16, 'c']]) { set(g, x - 1, hy + 5, c); set(g, M(x - 1), hy + 5, c); }
  for (const x of [12, 14]) { set(g, x, hy + 6, 'c'); set(g, M(x), hy + 6, 'c'); }
  set(g, 23, hy + 2, 'n'); set(g, 24, hy + 2, 'n'); set(g, 23, hy + 1, 'N'); set(g, 24, hy + 1, 'n');
  if (!wor) { for (const [x, y] of [[23, 3], [24, 3], [22, 4], [25, 4], [21, 4], [26, 4], [20, 3], [27, 3]]) set(g, x, hy + y, 'm');
    set(g, 23, hy + 4, 't'); set(g, 24, hy + 4, 't'); }
  else { for (const [x, y] of [[23, 3], [24, 3], [22, 5], [23, 4], [24, 4], [25, 5], [21, 6], [26, 6]]) set(g, x, hy + y, 'm');
    for (const [x, y] of [[13, -6], [14, -6], [15, -7], [16, -7], [17, -8]]) { set(g, x, hy + y, '1'); set(g, M(x), hy + y, '1'); }
    const d = tearFrame(t); for (let k = 0; k < 3; k++) { set(g, 13, ey + 8 + d + k, 's'); set(g, M(13), ey + 8 + d + k, 's'); } }
  g.pal = { 1: '#6a5590', 2: '#9783bb', 3: '#bbacd9', 4: '#dcd2f0', 5: '#f8f4ff', k: '#46365f', q: '#eadcf2', Q: '#fffaf6',
    p: '#ea9cbb', P: '#ffc6db', e: '#25163b', i: '#5c3a92', I: '#9b6ad6', j: '#d4b4ff', t: '#ffffff', c: '#ff9ec2',
    n: '#ff7ea8', N: '#ffd0e0', m: '#5b3150', s: '#7fcfff', S: '#c9eeff' };
  return g;
}

// ---------------------------------------------------------------- 4. Lop: droopy ears, puppy eyes, carrot hug
function lop(mood, t = 0, o = {}) {
  const W = 40, H = 43, g = grid(W, H), wor = mood === 'worried', walk = o.walk != null, ph = o.walk || 0, M = x => mirrorX(W, x);
  const bob = walk ? -Math.round(Math.abs(Math.sin(ph)) * 1.6) : 0, hy = 17 + bob, sw = walk ? Math.sin(ph) * 1.3 : 0, dr = wor ? 1.5 : 0;
  const fL = walk ? Math.sin(ph) * 1.6 : 0;
  layer(g, l => { ell(l, 20, 33 + bob, 9.4, 7.4, 'w', { shade: 'g', sd: 1.6 }); }, 'k');
  ell(g, 20, 34.6 + bob, 5.6, 5, 'c', { shade: 'C', sd: 1 });
  layer(g, l => { ell(l, 14.5 + fL, 40.4 - Math.max(0, fL), 3.8, 2.1, 'w', { shade: 'g', sd: 0.8 }); ell(l, 25.5 - fL, 40.4 - Math.max(0, -fL), 3.8, 2.1, 'w', { shade: 'g', sd: 0.8 }); }, 'k');
  layer(g, l => { ell(l, 20, hy, 12.4, 10.4, 'w', { shade: 'g', sd: 1.4 }); for (const [x, y] of [[18, -11], [19, -11], [19, -12], [20, -11], [20, -12], [21, -13], [21, -12], [22, -11]]) set(l, x, hy + y, 'w'); }, 'k');
  ell(g, 20, hy + 5, 7.6, 4.6, 'c', { shade: 'C', sd: 0.8 }); rect(g, 19, hy - 7, 2, 8, 'c'); set(g, 19, hy - 8, 'c'); // cream blaze
  layer(g, l => { // lop ears hanging down the cheeks
    for (const s of [-1, 1]) { const b = 20 + s * 8.5;
      stroke(l, [[b, hy - 7], [b + s * (3 + dr * 0.3), hy - 1], [b + s * (3.4 - dr) + sw * s * 0.3 + sw, hy + 9 + dr]], 3.6, 3.4, 'w');
    }
  }, 'k');
  if (!wor && !walk) layer(g, l => { // carrot hug
    pat(l, 23, 23, ['.l..l', '.lLl.', 'lLLLl', '.lLl.']);
    stroke(l, [[12.5, 39], [24.5, 27.5]], 0.7, 2.6, 'o');
  }, 'k');
  if (wor || walk) layer(g, l => { const px = wor ? 2.2 : 4.6, py = wor ? 29 : 32; ell(l, 20 - px, py + bob, 2.1, 1.9, 'w'); ell(l, 20 + px, py + bob, 2.1, 1.9, 'w'); }, 'k');
  else { for (const [x, y] of [[14, 36], [15, 35], [18, 33], [19, 32], [22, 30], [23, 29]]) set(g, x, y, 'O');
    layer(g, l => { ell(l, 15.2, 37.6, 2, 1.8, 'w'); ell(l, 20.6, 32.4, 2, 1.8, 'w'); }, 'k'); }
  const E = wor
    ? ['.eeee.', 'etteee', 'etteie', 'eeiiie', 'esSSse', 'SssssS', '.SSSS.']
    : ['.eeee.', 'etteee', 'etteie', 'eeiiie', 'eiIIie', 'eiIIte', '.eeee.'];
  const ey = hy - 2;
  pat(g, 12, ey, E); pat(g, M(17), ey, E);
  ell(g, 12.2, hy + 5, 2.3, 1.2, 'b'); ell(g, W - 12.2, hy + 5, 2.3, 1.2, 'b');
  set(g, 19, hy + 4, 'P'); set(g, 20, hy + 4, 'P'); set(g, 19, hy + 5, 'm'); set(g, 20, hy + 5, 'm');
  if (!wor) { for (const x of [17, 18, 21, 22]) set(g, x, hy + 6, 'm'); set(g, 16, hy + 5, 'm'); set(g, 23, hy + 5, 'm'); set(g, 19, hy + 6, 't'); set(g, 20, hy + 6, 't'); set(g, 19, hy + 7, 'm'); set(g, 20, hy + 7, 'm'); }
  else { for (const x of [18, 21]) set(g, x, hy + 6, 'm'); set(g, 17, hy + 7, 'm'); set(g, 22, hy + 7, 'm');
    for (const [x, y] of [[12, -4], [13, -4], [14, -5], [15, -5]]) { set(g, x, hy + y, 'G'); set(g, M(x), hy + y, 'G'); }
    const d = tearFrame(t); for (let k = 0; k < 3; k++) { set(g, 12, ey + 7 + d + k, 's'); set(g, M(12), ey + 7 + d + k, 's'); } }
  g.pal = { w: '#ecbd8f', g: '#d79f6f', G: '#9c6844', c: '#fff4e4', C: '#f3dcc2', k: '#7a4b3a', p: '#f6a9a6', P: '#e8707e', e: '#2a1810',
    i: '#6b3d22', I: '#b07440', t: '#ffffff', s: '#7fcfff', S: '#c4ecff', b: '#ff9fae', m: '#5a2e24', o: '#ff9a3a', O: '#d8701e', l: '#7bc86a', L: '#4f9a4a' };
  return g;
}

// ---------------------------------------------------------------- 5. Pocket: tiny 4-shade handheld sprite (hand-pixelled)
const POCKET_TOP = [
  '.....ddd....ddd.....',
  '....dwwwd..dwwwd....',
  '....dwmwd..dwmwd....',
  '....dwmwd..dwmwd....',
  '....dwmwd..dwmwd....',
  '...dwwmwwddwwmwwd...',
  '..dwwwwwwwwwwwwwwd..',
  '.dwwwwwwwwwwwwwwwwd.',
];
const POCKET_FACE = {
  happy: [
    '.dwwwwwwwwwwwwwwwwd.',
    'dwwwwddwwwwwwddwwwwd',
    'dwwwwddwwwwwwddwwwwd',
    'dwmmwddwwmmwwddwmmwd',
    'dwmmwwwdwddwdwwwmmwd',
    'dwwwwwwwdwwdwwwwwwwd',
    '.dlwwwwwwwwwwwwwwld.',
    '..dllwwwwwwwwwwlld..',
  ],
  worried: [
    '.dwwwwwwwwwwwwwwwwd.',
    'dwwwwddwwwwwwddwwwwd',
    'dwwwwddwwwwwwddwwwwd',
    'dwmmwddwwmmwwddwmmwd',
    'dwmmwwwwddddwwwwmmwd',
    'dwwwwwwdwwwwdwwwwwwd',
    '.dlwwwwwwwwwwwwwwld.',
    '..dllwwwwwwwwwwlld..',
  ],
};
const POCKET_BODY = {
  stand: [
    '....ddwwwwwwwwdd....',
    '...dwwwwwwwwwwwwd...',
    '...dwwllwwwwllwwd...',
    '...dlwwwwwwwwwwld...',
    '...dllwwwwwwwwlld...',
    '..dwwwddddddddwwwd..',
    '...ddd........ddd...',
  ],
  walk: [
    '....ddwwwwwwwwdd....',
    '...dwwwwwwwwwwwwd...',
    '...dwwllwwwwllwwd...',
    '...dlwwwwwwwwwwld...',
    '...dllwwwwwwwwlld...',
    '...dwwddddddddwwwd..',
    '....dd.......ddd....',
  ],
};
const POCKET_BROWS = ['..dwwwdwwwwwwdwwwd..', '.dwwwdwwwwwwwwdwwwd.'];
function pocket(mood, t = 0, o = {}) {
  const W = 20, H = 24, g = grid(W, H), walk = o.walk != null, bob = walk ? 1 : 0;
  const face = POCKET_FACE[mood === 'worried' ? 'worried' : 'happy'];
  const top = mood === 'worried' ? [...POCKET_TOP.slice(0, 6), ...POCKET_BROWS] : POCKET_TOP;
  const rows = [...top, ...face, ...(walk ? POCKET_BODY.walk : POCKET_BODY.stand)];
  pat(g, 0, 1 - bob, rows);
  if (mood === 'worried') { const d = tearFrame(t); set(g, 4, 12 + d - bob, 's'); set(g, 15, 12 + d - bob, 's'); }
  g.pal = { d: '#4a2b4f', m: '#f2a0bd', l: '#c9a3c8', w: '#fff3e8', s: '#8ac6e8' };
  return g;
}

export const BUNNIES3 = [
  { label: 'Mimi', style: 'Chibi kawaii', desc: 'Giant head, tiny body, huge sparkly purple eyes, rosy cheeks and a little w-mouth.', fn: chibi },
  { label: 'Mochi', style: 'Rice-cake blob', desc: 'A squishy round mochi with nub ears (one flopped), a blossom on top and hop-squish walking.', fn: mochi },
  { label: 'Velvet', style: '16-bit SNES shaded', desc: 'Soft lavender plush with light-shaded fur, big glossy anime eyes and cheek fluff.', fn: velvet },
  { label: 'Biscuit', style: 'Lop-eared puppy eyes', desc: 'Caramel lop with droopy ears, buck teeth and huge puppy eyes, hugging a carrot; begs with clasped paws.', fn: lop },
  { label: 'Pip', style: 'Handheld 4-shade', desc: 'Tiny hand-pixelled 4-colour pocket sprite, the purest little guy.', fn: pocket },
];

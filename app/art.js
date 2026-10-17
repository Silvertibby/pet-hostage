import { colorById } from './shop.js';
// Pet Hostage pixel art: everything is drawn in code on tiny grids, then scaled up crisp.
// Shapes are filled on a grid and auto-outlined, which keeps the chunky 16-bit look.
const PAL = {
  k: '#5a3f66', w: '#fffaf4', g: '#f3e3ea', G: '#e2cbd8', p: '#ffc1d8', P: '#ff8fb8', r: '#ff7a96', R: '#c44a6a',
  t: '#ffffff', b: '#3a2340', B: '#6b4a8a', s: '#8fd8ff', y: '#ffe27a', o: '#ff9a2a',
};


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

// ---- the critters ----
// v0.4 "chibi" set (after Mimi, Ben's pick): giant round head, tiny body, huge sparkly eyes,
// rosy cheeks and a little w-mouth. Every pet shares the body; species add ears, tails, markings, palette.
const FIX = { t: '#ffffff', s: '#7fcfff', S: '#c4ecff', y: '#ffe27a', o: '#ff9a2a',
  x: '#4a2236', X: '#c4405e', v: '#f6efdc', V: '#d9c9a6', a: '#f2bd86', A: '#d1925c', z: '#1d1622', Z: '#3a3040' };
function tri(g, x1, y1, x2, y2, x3, y3, c) {
  const minX = Math.floor(Math.min(x1, x2, x3)), maxX = Math.ceil(Math.max(x1, x2, x3)), minY = Math.floor(Math.min(y1, y2, y3)), maxY = Math.ceil(Math.max(y1, y2, y3));
  const s = (ax, ay, bx, by, px, py) => (bx - ax) * (py - ay) - (by - ay) * (px - ax);
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const px = x + 0.5, py = y + 0.5, a = s(x1, y1, x2, y2, px, py), b = s(x2, y2, x3, y3, px, py), d = s(x3, y3, x1, y1, px, py);
    if ((a >= 0 && b >= 0 && d >= 0) || (a <= 0 && b <= 0 && d <= 0)) set(g, x, y, c);
  }
}
function line(g, x0, y0, x1, y1, c) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let i = 0; i <= n; i++) set(g, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c); }
const pointyEar = (g, x, baseY, h, half, lean, col, inner, tip) => {
  tri(g, x - half, baseY, x + half, baseY, x + lean, baseY - h, col);
  if (inner) tri(g, x - half + 1.6, baseY - 0.5, x + half - 1.6, baseY - 0.5, x + lean * 0.8, baseY - h + 2.6, inner);
  if (tip) { set(g, x + lean, baseY - h - 1, tip); set(g, x + lean - 1, baseY - h, tip); set(g, x + lean + 1, baseY - h - 1.5, tip); }
};
// Layout of the 36x38 chibi sprite (mirror axis between pixels 17 and 18).
const CX = 18, HY = 18, HRX = 13, HRY = 10.5, M = x => 35 - x, MC = c => 36 - c;
const inHead = (x, y) => { const dx = (x + 0.5 - CX) / HRX, dy = (y + 0.5 - HY) / HRY; return dx * dx + dy * dy <= 1; };
const stampL = (g, l) => { for (let i = 0; i < l.a.length; i++) if (l.a[i]) g.a[i] = l.a[i]; };
function layer(g, draw, oc) { const l = grid(g.w, g.h); draw(l); if (oc) outline(l, oc); stampL(g, l); return l; }
function stroke(g, pts, r0, r1, col) { // tapering thick polyline
  const L = []; let tot = 0;
  for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); L.push(l); tot += l; }
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.ceil(L[i] * 3);
    for (let k = 0; k <= n; k++) { const f = (acc + L[i] * k / n) / tot; ell(g, x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, r0 + (r1 - r0) * f, r0 + (r1 - r0) * f, col); }
    acc += L[i]; }
}
function pat(g, x, y, rows, map = {}) { rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const c = r[i]; if (c !== '.') set(g, x + i, y + j, map[c] || c); } }); }
const both = (g, x, y, c) => { set(g, x, y, c); set(g, M(x), y, c); };

// shared soft eye colours (species may override): e outline/pupil, i iris, I iris light, j sparkle-light
const EYE = { e: '#2e1d45', i: '#5a48a6', I: '#9a86ea', j: '#d6ccff' };
export const SPECIES = {
  bunny: { label: 'bunny', pal: { k: '#9a6b8f', w: '#ffffff', g: '#f1dfee', p: '#ffc4da', P: '#ff7fae', q: '#ffb0c8', m: '#7a3552', n: '#ff8fa8' },
    ears(l, t, dr, sway) {
      for (const s of [-1, 1]) { const b = CX + s * 5.5, w = Math.sin(t * 2.2 + (s > 0 ? 1 : 0)) * 0.25;
        stroke(l, [[b, HY - 5], [b + s * (1.4 + dr * 2) + sway + w, HY - 11 + dr * 2], [b + s * (2.6 + dr * 5) + sway * 1.5 + w * 2, HY - 15 + dr * 4]], 3.3, 2.5, 'w');
        stroke(l, [[b + s * 0.6, HY - 8], [b + s * (1.7 + dr * 2) + sway + w, HY - 11 + dr * 2], [b + s * (2.6 + dr * 4.6) + sway * 1.5 + w * 2, HY - 13.6 + dr * 4]], 1.5, 1.1, 'p'); }
    },
    head(g) { for (const [x, y] of [[17, 6], [18, 6], [19, 5], [16, 7]]) set(g, x, y, 'k'); set(g, 17, 7, 'w'); set(g, 18, 7, 'w'); } },
  hamster: { label: 'hamster', pal: { k: '#a8705a', w: '#ffd8a8', g: '#f3bf8a', c: '#fff6ea', p: '#ffb3c6', P: '#ff8fa8', q: '#ffa0b4', m: '#7a3a2a', e: '#3a2018', i: '#7a4a2a', I: '#c08a5a', j: '#f4dcb8' },
    ears(l, t, dr) { const dy = dr * 1.2; for (const c of [7.8, MC(7.8)]) { ell(l, c, 9.6 + dy, 3.4, 3.2, 'w'); ell(l, c, 9.9 + dy, 1.8, 1.7, 'p'); } },
    head(g) { ell(g, 7.6, 23, 4.2, 3.4, 'c'); ell(g, MC(7.6), 23, 4.2, 3.4, 'c'); ell(g, CX, 23.4, 4.4, 2.8, 'c'); for (let y = 8; y < 13; y++) { set(g, 17, y, 'g'); set(g, 18, y, 'g'); } },
    belly: 'c' },
  squirrel: { label: 'squirrel', pal: { k: '#9a5a3e', w: '#f4ad78', g: '#e19463', G: '#c4774a', c: '#fff0dc', p: '#ffc4ae', P: '#8a4a3a', q: '#ff9ea0', m: '#6a3022', e: '#2e1a12', i: '#6a3a22', I: '#b0703e', j: '#ecc8a0', T: '#e99a62', U: '#ffd9b0' },
    back(l, t) { const sw = Math.sin(t * 2.4) * 0.5; ell(l, 30.5 + sw, 28, 4.6, 7.5, 'T'); ell(l, 32 + sw, 17.5, 3.8, 6, 'T'); ell(l, 30.5 + sw, 11.5, 3.6, 3.4, 'T'); ell(l, 31.4 + sw, 23, 1.4, 5, 'U'); },
    ears(l, t, dr) { const d = dr * 1.6; pointyEar(l, 9.5, 11, 9, 3.4, -1 - d, 'w', 'p', 'G'); pointyEar(l, MC(9.5), 11, 9, 3.4, 1 + d, 'w', 'p', 'G'); },
    head(g) { ell(g, CX, 23.6, 5.2, 3, 'c'); ell(g, CX, 9.6, 2.2, 1.2, 'g'); },
    belly: 'c' },
  hedgehog: { label: 'hedgehog', pal: { k: '#7a5440', w: '#fbe8d0', g: '#efd4b2', h: '#b98a62', H: '#94684a', p: '#ffb7c4', P: '#4a3028', q: '#ffa6b4', m: '#6a3a2a', e: '#2a1a14', i: '#5a3a2a', I: '#9a6a4a', j: '#e8c8a8' },
    back(l, t) { ell(l, CX, HY - 0.5, HRX + 1, HRY + 0.6, 'h');
      for (let i = 0; i <= 12; i++) { const a = Math.PI * (0.95 + i * 1.1 / 12), w = 0.17, R = 12.5, L = 16.4 + Math.sin(t * 3 + i) * 0.35;
        tri(l, CX + Math.cos(a - w) * R, HY + Math.sin(a - w) * R * 0.86, CX + Math.cos(a + w) * R, HY + Math.sin(a + w) * R * 0.86, CX + Math.cos(a) * L, HY + Math.sin(a) * L * 0.86, i % 2 ? 'h' : 'H'); } },
    ears(l) { for (const c of [6.6, MC(6.6)]) { ell(l, c, 12, 2.4, 2.2, 'w'); ell(l, c, 12.3, 1.2, 1.1, 'p'); } },
    head(g) { for (let y = 6; y < 16; y++) for (let x = 4; x < 32; x++) if (inHead(x, y) && y < 11.6 + Math.abs(x + 0.5 - CX) * 0.42 && !(Math.abs(x + 0.5 - CX) < 1.6 && y > 12)) set(g, x, y, (x + y) % 3 ? 'h' : 'H'); } },
  kitten: { label: 'kitten', pal: { k: '#7a7096', w: '#e6e2f0', g: '#d0cae0', d: '#a59cc0', c: '#fbf9ff', p: '#ffb7cf', P: '#ff8fb0', q: '#ffa8c4', m: '#6a4060', e: '#1e2a3a', i: '#2f6a8a', I: '#5ab0d0', j: '#bdeeff' },
    back(l, t) { const sw = Math.sin(t * 2) * 1; stroke(l, [[25, 34], [30, 32], [32.5 + sw, 26], [31.5 + sw, 21]], 1.7, 1.9, 'w'); ell(l, 31.5 + sw, 21, 1.9, 1.9, 'd'); },
    ears(l, t, dr) { const d = dr * 2; pointyEar(l, 9.5, 12, 9.5, 4.4, -1.6 - d, 'w', 'p'); pointyEar(l, MC(9.5), 12, 9.5, 4.4, 1.6 + d, 'w', 'p'); },
    head(g) { for (const x of [15, 17, 18, 20]) { set(g, x, 8, 'd'); set(g, x, 9, 'd'); } set(g, 17, 10, 'd'); set(g, 18, 10, 'd');
      for (const [x, y] of [[5, 16], [6, 16], [5, 18], [6, 18]]) both(g, x, y, 'd'); ell(g, CX, 23.5, 4.6, 2.6, 'c'); },
    belly: 'c', whiskers: true },
  duckling: { label: 'duckling', pal: { k: '#b08a2a', w: '#ffea86', g: '#f7d458', p: '#fff3b8', n: '#ffa83e', N: '#e07a20', q: '#ffb08a', m: '#a85a1a', e: '#2a1e10', i: '#5a4020', I: '#9a7a40', j: '#ecdca8' },
    ears(l, t) { const w = Math.sin(t * 3) * 0.5; ell(l, 17.5 + w, 6.4, 1.6, 2.6, 'w'); ell(l, 19.8 + w, 6.9, 1.3, 2.1, 'w'); ell(l, 15.4 + w, 7.4, 1.1, 1.6, 'w'); },
    feet: 'n', mouth: 'beak' },
  piglet: { label: 'piglet', pal: { k: '#b0607e', w: '#ffd4e2', g: '#f7bacd', p: '#ff9fbd', n: '#ffb8cc', N: '#e07898', q: '#ff8fae', m: '#8a3050', e: '#3a1a2a', i: '#6a3050', I: '#b06a8a', j: '#f4c8dc' },
    back(l, t) { const o = Math.sin(t * 6) > 0 ? 0 : 1; for (const [x, y] of [[26, 30], [27, 29], [28, 29 + o], [28, 30], [27, 31]]) set(l, x, y, 'N'); },
    ears(l, t, dr) { const f = dr ? 2.4 : Math.sin(t * 2.2) * 0.4; tri(l, 5, 13, 12, 8.5, 4 - f, 4 + f, 'w'); tri(l, 31, 13, 24, 8.5, 32 + f, 4 + f, 'w'); tri(l, 6.4, 11.4, 10.4, 9.2, 5.4 - f, 6 + f, 'p'); tri(l, 29.6, 11.4, 25.6, 9.2, 30.6 + f, 6 + f, 'p'); },
    mouth: 'snout' },
  panda: { label: 'panda cub', pal: { k: '#4a4658', w: '#ffffff', g: '#ecebf2', d: '#4a4658', D: '#36323f', p: '#ffc1d8', P: '#2e2a36', q: '#ffb0c8', m: '#3a2a40', e: '#140f1a', i: '#4a3a7a', I: '#8a7ab8', j: '#cfc4f0' },
    ears(l, t, dr) { for (const c of [7.4, MC(7.4)]) ell(l, c, 9.6 + dr, 3.6, 3.4, 'd'); },
    head(g) { for (const [ex, s] of [[11, -1], [24, 1]]) for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) {
      const rx = (x + 0.5 - s * 0.35 * (y + 0.5)) / 4.2, ry = (y + 0.5) / 4.8; if (rx * rx + ry * ry <= 1) set(g, ex + x, 20 + y, 'D'); } },
    arms: 'd', feet: 'd', lightX: true },
  // v0.4.3: the capybara. Chill: half-lidded eyes when happy, a big soft muzzle, and a yuzu balanced on its head.
  capybara: { label: 'capybara', chill: true, pal: { k: '#7a5236', w: '#c99668', g: '#b17f55', c: '#e3c29a', p: '#9a6448', P: '#4a2e22', q: '#ff9c94', m: '#5a3020', e: '#2a1a12', i: '#5a3a22', I: '#9a6a42', j: '#e8c8a0', u: '#ffb52e', U: '#e0880e', L: '#5aa84a' },
    ears(l, t, dr) { for (const c of [9.4, MC(9.4)]) { ell(l, c, 9.9 + dr * 0.8, 2, 1.8, 'w'); ell(l, c, 10.2 + dr * 0.8, 1, 0.9, 'p'); } },
    mouth: 'capy',
    head(g, t) {
      for (const [x, y] of [[15, 9], [17, 8], [19, 8], [21, 9]]) set(g, x, y, 'g'); // fur tufts
      ell(g, CX, 24.2, 6.4, 3.6, 'c'); ell(g, CX, 22.4, 4.6, 1.6, 'c'); // big soft blocky muzzle
      const bob = Math.sin(t * 1.6) > 0.7 ? 1 : 0; // the yuzu wobbles now and then
      layer(g, l => ell(l, 22.5 + bob * 0.4, 5.8, 2.9, 2.5, 'u'), 'k');
      set(g, 21, 4, 't'); set(g, 24, 7, 'U'); set(g, 23, 7, 'U'); set(g, 25, 6, 'U');
      set(g, 23, 2, 'L'); set(g, 24, 2, 'L'); set(g, 24, 1, 'L'); set(g, 22, 3, 'k');
    } },
};
export const SPECIES_ORDER = ['bunny', 'hamster', 'squirrel', 'hedgehog', 'kitten', 'duckling', 'piglet', 'panda', 'capybara'];

function mixHex(h, to, w) { const n = parseInt(h.slice(1, 7), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return '#' + [r, g, b].map((v, i) => Math.round(v * (1 - w) + to[i] * w).toString(16).padStart(2, '0')).join(''); }
function ghostPal(pal) { const o = {}; for (const k in pal) o[k] = mixHex(pal[k], [208, 236, 255], k === 'e' || k === 'k' ? 0.45 : 0.62); return o; }
function charPal(pal) { const o = {}; for (const k in pal) o[k] = mixHex(pal[k], [24, 20, 30], k === 'k' ? 0.6 : 0.78); o.t = '#ffffff'; o.q = '#ff8a9a'; return o; }

// Patch-ups after each death. k = how many times this pet already got this kind of death.
const MARKS = {
  pop: [ // head came off: stitched neck, then more scars
    (g) => { for (let x = 11; x <= 24; x++) set(g, x, 27, 'X'); for (let x = 11; x <= 24; x += 2) { set(g, x, 26, 'x'); set(g, x, 28, 'x'); } },
    (g) => { for (let y = 12; y <= 18; y++) set(g, 7, y, 'X'); for (let y = 12; y <= 18; y += 2) { set(g, 6, y, 'x'); set(g, 8, y, 'x'); } },
    (g) => { for (let x = 14; x <= 21; x++) set(g, x, 32, 'X'); for (let x = 14; x <= 21; x += 2) { set(g, x, 31, 'x'); set(g, x, 33, 'x'); } },
  ],
  anvil: [ // flattened: bandage wrap round the head (with a little bow), then the body, then a foot
    (g) => { for (let y = 10; y <= 12; y++) for (let x = 0; x < 36; x++) if (inHead(x, y)) set(g, x, y, y === 12 ? 'V' : 'v'); ell(g, 31, 9.6, 1.7, 1.4, 'v'); ell(g, 31, 13, 1.7, 1.4, 'v'); set(g, 30, 11, 'V'); },
    (g) => { for (let y = 30; y <= 32; y++) for (let x = 10; x <= 25; x++) { const dx = (x + 0.5 - CX) / 7.4, dy = (y + 0.5 - 31.5) / 5.4; if (dx * dx + dy * dy <= 1) set(g, x, y, y === 32 ? 'V' : 'v'); } },
    (g) => { ell(g, 12.8, 35.4, 2.6, 1.3, 'v'); set(g, 12, 35, 'V'); },
  ],
  catapult: [ // launched: eye patch, then an arm sling, then a forehead plaster
    (g, E) => { ell(g, E.rx, E.eyesY, 3.3, 3.9, 'z'); set(g, E.rx - 1, E.eyesY - 2, 'Z'); set(g, E.rx, E.eyesY - 2, 'Z'); line(g, E.rx - 2, E.eyesY - 3.5, 7, 11, 'z'); line(g, E.rx + 3, E.eyesY - 2, 31, 13, 'z'); },
    (g) => { ell(g, 14.6, 30.4, 2.2, 2, 'v'); set(g, 14, 30, 'V'); set(g, 15, 30, 'V'); },
    (g) => { rect(g, 14, 9, 8, 2, 'a'); rect(g, 17, 9, 2, 2, 'A'); },
  ],
  zap: [ // zapped: crossed band-aids on the cheek, then a frazzled tuft, then another plaster
    (g) => { const cx = 7, cy = 19; for (let i = -2; i <= 2; i++) { set(g, cx + i, cy + i, 'a'); set(g, cx + i, cy - i, 'a'); } set(g, cx, cy, 'A'); },
    (g) => { for (const [x, y] of [[14, 8], [15, 7], [16, 8], [17, 6], [18, 8], [19, 7], [20, 8], [21, 7]]) set(g, x, y, 'z'); },
    (g) => { rect(g, 20, 31, 5, 2, 'a'); rect(g, 22, 31, 1, 2, 'A'); },
  ],
};
function drawInjuries(g, injuries, E) {
  const seen = {};
  for (const type of injuries || []) {
    const k = seen[type] = (seen[type] ?? -1) + 1, list = MARKS[type]; if (!list) continue;
    list[Math.min(k, list.length - 1)](g, E);
  }
}

// eye patterns (5x7), always lit from the top-left
const EYES = {
  open: ['.eee.', 'ettee', 'ettee', 'eeiie', 'eiiIe', 'eiItI', '.IjI.'],
  teary: ['.eee.', 'ettee', 'ettee', 'eeeie', 'esSse', 'SsssS', '.SSS.'],
  squint: ['.....', '.....', '.eee.', 'e...e', '.....'],
  blink: ['.....', '.....', '.....', 'eeeee', '.....'],
  ghost: ['.....', '.....', '.....', 'e...e', '.eee.'],
  x: ['.....', 'e...e', '.e.e.', '..e..', '.e.e.', 'e...e'],
  chill: ['.....', '.....', '.....', 'eeeee', 'eiiIe', 'eiItI', '.eee.'], // half-lidded (capybara, happy)
};

// mood: happy | worried | scared | ghost | dead | char. injuries: ['pop','anvil',...]. opts.walk = phase (radians)
export function critter(species, mood, t, injuries = [], opts = {}) {
  const sp = SPECIES[species] || SPECIES.bunny;
  const g = grid(36, 38), k = 'k';
  const ghost = mood === 'ghost', dead = mood === 'dead' || mood === 'char';
  const dr = mood === 'worried' ? 1 : mood === 'scared' || dead ? 1.5 : 0;
  const walk = opts.walk != null, ph = opts.walk || 0, sway = walk ? Math.sin(ph) * 1 : 0;
  if (sp.back && !ghost) layer(g, l => sp.back(l, t, mood), k);
  layer(g, l => sp.ears(l, t, dr, sway), k);
  const fL = walk ? Math.sin(ph) * 1.5 : 0, fR = -fL, feet = sp.feet || 'w';
  if (!ghost) {
    layer(g, l => { ell(l, 12.8 + fL, 35.2 - Math.max(0, fL), 3.3, 1.9, feet, { shade: sp.feet ? null : 'g', sd: 0.7 }); ell(l, 23.2 + fR, 35.2 - Math.max(0, fR), 3.3, 1.9, feet, { shade: sp.feet ? null : 'g', sd: 0.7 }); }, k);
    layer(g, l => { ell(l, CX, 31.2, 7.6, 5.6, 'w', { shade: 'g', sd: 1.4 }); if (sp.belly) ell(l, CX, 32.2, 4, 3.2, sp.belly); }, k);
  } else {
    layer(g, l => { for (let y = 0; y < 10; y++) {
      const w = 7 - y * 0.55 + Math.sin(t * 4 + y * 0.9) * 0.7, x0 = CX + Math.sin(t * 2 + y * 0.6) * (y * 0.3);
      for (let x = Math.floor(x0 - w); x <= x0 + w; x++) set(l, x, 26 + y, y > 6 && (x + y) % 3 === 0 ? null : 'w'); } }, k);
  }
  layer(g, l => ell(l, CX, HY, HRX, HRY, 'w', { shade: 'g', sd: 1.3 }), k); // big round head
  if (sp.head) sp.head(g, t);
  // tiny paws: tucked on the tummy, raised in a little cheer when happy, clasped when pleading
  if (!ghost) {
    const cheer = mood === 'happy' && !walk && Math.sin(t * 5) > 0.3, plead = mood === 'worried';
    const [px, py] = cheer ? [7.5, 26] : plead ? [16.2, 29.4] : [15, 30.4], arms = sp.arms || 'w';
    layer(g, l => { ell(l, px, py, 1.7, 1.5, arms); ell(l, MC(px), py, 1.7, 1.5, arms); }, k);
  }
  const E = { cx: CX, eyesY: 20, lx: 11, rx: 24 };
  // eyes
  const blink = (t % 4.2) < 0.13 && !dead && !ghost;
  let ep = mood === 'worried' || mood === 'scared' ? EYES.teary : EYES.open;
  if (ghost) ep = EYES.ghost; else if (dead) ep = EYES.x; else if (blink) ep = EYES.blink; else if (mood === 'happy' && sp.chill) ep = EYES.chill; else if (mood === 'happy' && Math.sin(t * 1.3) > 0.85) ep = EYES.squint;
  const emap = mood === 'char' || (dead && sp.lightX) ? { e: 't' } : {};
  pat(g, 9, 17, ep, emap); pat(g, M(13), 17, ep, emap);
  if (ep === EYES.open) both(g, 8, 18, 'e'); // lash flick
  // blush
  ell(g, 7.6, 23.6, 2.5, 1.3, 'q'); ell(g, MC(7.6), 23.6, 2.5, 1.3, 'q'); both(g, 7, 23, 't');
  if (sp.whiskers) for (const [x, y] of [[3, 22], [4, 22], [3, 24], [4, 24]]) both(g, x, y, 'd');
  // nose + mouth
  const face = ghost ? 'calm' : dead ? 'dead' : mood;
  if (sp.mouth === 'beak') {
    const open = face === 'scared' || face === 'dead' ? 1.4 : face === 'worried' ? 0.6 : 0.9;
    layer(g, l => { ell(l, CX, 22.6, 3.4, 1.5, 'n'); ell(l, CX, 23.8 + open * 0.3, 2.6, open, 'N'); }, 'N');
    set(g, 17, 22, 't');
  } else {
    let my = 22;
    if (sp.mouth === 'snout') { layer(g, l => ell(l, CX, 22, 3, 1.9, 'n'), 'N'); set(g, 16, 22, 'N'); set(g, 19, 22, 'N'); my = 24.4; }
    else if (sp.mouth === 'capy') { for (let x = 15; x <= 20; x++) set(g, x, 22, x === 15 || x === 20 ? 'k' : 'P'); for (let x = 16; x <= 19; x++) set(g, x, 21, 'k'); set(g, 16, 22, 't'); set(g, 17, 23, 'P'); set(g, 18, 23, 'P'); my = 23.5; } // wide flat capybara nose
    else { set(g, 17, 21, 'P'); set(g, 18, 21, 'P'); }
    const y = Math.round(my) - 22;
    if (face === 'happy' || face === 'calm') for (const [x, dy] of [[15, 1], [17, 1], [18, 1], [20, 1], [16, 2], [19, 2]]) set(g, x, 21 + y + dy, 'm');
    else if (face === 'worried') { for (let x = 16; x <= 19; x++) { set(g, x, 23 + y, 'm'); set(g, x, 24 + y, 'n'); set(g, x, 25 + y, 'm'); } both(g, 15, 24 + y, 'm'); }
    else if (face === 'scared') { const o = Math.sin(t * 16) > 0 ? 1 : 0; for (let x = 16; x <= 19; x++) { set(g, x, 23 + y, 'm'); set(g, x, 25 + y + o, 'm'); set(g, x, 24 + y, 'n'); if (o) set(g, x, 25 + y, 'n'); } both(g, 15, 24 + y, 'm'); if (o) both(g, 15, 25 + y, 'm'); }
    else for (const [x, dy] of [[15, 2], [16, 1], [17, 2], [18, 2], [19, 1], [20, 2]]) set(g, x, 21 + y + dy, 'm'); // dead: wobbly line
  }
  if (mood === 'worried' || mood === 'scared') { for (const [x, y] of [[9, 15], [10, 15], [11, 14], [12, 14]]) both(g, x, y, k); } // worried brows
  if (!ghost) drawInjuries(g, injuries, E);
  if (mood === 'worried') { const d = Math.floor(t * 5) % 4; for (let i = 0; i < 3; i++) both(g, 8, 23 + d + i, 's'); }
  if (mood === 'scared') { const d = Math.floor(t * 8) % 4; for (let i = 0; i < 2; i++) { set(g, 8, 23 + d + i, 's'); set(g, M(8), 23 + ((d + 2) % 4) + i, 's'); } }
  if (ghost) for (let x = -5; x <= 4; x++) set(g, CX + x, 1 + (x < -3 || x > 2 ? 1 : 0), 'y');
  if (mood === 'char') for (const [x, y] of [[9, 4], [11, 2], [26, 3], [24, 1], [18, 5]]) set(g, x, y, 'Z'); // frizz
  const pal = { ...FIX, ...EYE, n: '#ff8fa8', N: '#d86a8e', c: '#fff6ea', d: '#8a8098', ...sp.pal };
  g.pal = ghost ? ghostPal(pal) : mood === 'char' ? charPal(pal) : pal;
  g.alpha = ghost ? 0.88 : 1;
  return g;
}
export const bunny = (mood, t) => critter('bunny', mood, t);
export function silhouette(species, t) { const g = critter(species, 'happy', t); const pal = {}; for (const k in g.pal) pal[k] = '#3a3050'; pal.k = '#4d4266'; g.pal = pal; return g; }

// v0.5.3: the villain's outfit (Raccoon Shop). LOOK = { shirt, hat, bowtie, glasses } color ids; missing = default look.
let LOOK = {};
export function setRaccoonLook(look) { LOOK = look || {}; }
const hsl = (h, s, l) => { s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join(''); };
// [base, shade, highlight] for a slot right now (gold shimmers, rainbow cycles), or null for the default
function lookPal(slot, t, off = 0) {
  const c = colorById(LOOK[slot]); if (!c) return null;
  if (c.anim === 'gold') { const w = (Math.sin(t * 3.2 + off) + 1) / 2; return [w > 0.75 ? '#ffd860' : '#e8b830', w > 0.6 ? '#c8961e' : '#b0841c', w > 0.5 ? '#fff6c8' : '#fff0a0']; }
  if (c.anim === 'rainbow') { const h = (t * 80 + off * 40) % 360; return [hsl(h, 85, 58), hsl(h, 80, 40), hsl((h + 40) % 360, 95, 75)]; }
  return c.hex;
}
// The kidnapper: a raccoon in a fedora with shifty eyes.
export function raccoon(t, look = 0, annoyed = false) {
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
  if (annoyed) { rect(g, 9, 15, 3, 1, 'd'); rect(g, 19, 15, 3, 1, 'd'); } // half-lidded, unimpressed
  if ((t + 1.1) % 3.7 < 0.14) { rect(g, 9, 15, 3, 2, 'd'); rect(g, 19, 15, 3, 2, 'd'); } // blink
  rect(g, 14, 19, 3, 2, 'b');
  for (let x = 13; x <= 19; x++) set(g, x, 23 - (x > 16 ? (x - 16) * 0.4 : 0), 'k'); // smirk
  const sty = LOOK.styles || {}, hs = sty.hat || 'fedora', gs = sty.glasses || 'shades';
  if (sty.face === 'mustache') pat2(g, 9, 20, ['n..nn...nn..n', '.nnnnn.nnnnn.']); // v0.5.4 rescue rewards
  if (hs === 'tophat') layer(g, l => { rect(l, 11, 1, 9, 8, 'f'); rect(l, 10, 1, 11, 1, 'f'); rect(l, 11, 6, 9, 2, 'F'); rect(l, 12, 1, 1, 4, 'Q'); rect(l, 5, 9, 21, 1, 'f'); set(l, 4, 8, 'f'); set(l, 26, 8, 'f'); }, 'k');
  else if (hs === 'bowler') layer(g, l => { ell(l, 15, 7.5, 7.6, 6, 'f'); for (let y = 8; y < 14; y++) for (let x = 0; x < 30; x++) set(l, x, y, null);
    rect(l, 8, 6, 15, 1, 'F'); set(l, 11, 3, 'Q'); set(l, 12, 2, 'Q'); set(l, 10, 4, 'Q'); rect(l, 5, 8, 21, 1, 'f'); rect(l, 6, 9, 19, 1, 'F'); }, 'k');
  else if (hs === 'crown') layer(g, l => { rect(l, 8, 6, 15, 3, 'f'); rect(l, 8, 8, 15, 1, 'F');
    for (const x of [9, 15, 21]) { rect(l, x - 1, 4, 3, 2, 'f'); set(l, x, 3, 'f'); set(l, x, 2, 'Q'); }
    for (const x of [12, 18]) { rect(l, x - 1, 5, 3, 1, 'f'); set(l, x, 4, 'f'); }
    for (const x of [11, 15, 19]) set(l, x, 7, 'j'); set(l, 9, 6, 'Q'); }, 'k');
  else if (hs !== 'none') { // fedora
  rect(g, 3, 8, 24, 2, 'f'); rect(g, 7, 2, 16, 6, 'f'); rect(g, 7, 6, 16, 1, 'F'); rect(g, 8, 2, 14, 1, 'Q');
  for (let x = 2; x <= 27; x++) { if (!get(g, x, 7) || get(g, x, 7) === 'k') set(g, x, 7, x >= 3 && x <= 26 && (x < 7 || x > 22) ? 'k' : get(g, x, 7)); }
  rect(g, 6, 1, 18, 1, 'k'); rect(g, 2, 10, 26, 1, 'k'); set(g, 2, 8, 'k'); set(g, 2, 9, 'k'); set(g, 27, 8, 'k'); set(g, 27, 9, 'k');
  for (let y = 1; y < 8; y++) { set(g, 6, y, 'k'); set(g, 23, y, 'k'); }
  }
  const hat = lookPal('hat', t), gl = lookPal('glasses', t, 2);
  if (gs === 'monocle') { for (let x = 18; x <= 22; x++) { set(g, x, 13, 'g'); set(g, x, 17, 'g'); } for (let y = 14; y <= 16; y++) { set(g, 18, y, 'g'); set(g, 22, y, 'g'); }
    set(g, 19, 13, 'G'); for (const [x, y] of [[23, 18], [23, 20], [24, 22], [24, 24]]) set(g, x, y, 'g'); }
  else if (gs === 'aviator') { for (const x0 of [8, 18]) { rect(g, x0, 14, 5, 2, 'g'); rect(g, x0 + 1, 16, 3, 1, 'g'); set(g, x0 + 1, 14, 'G'); } for (let x = 9; x <= 21; x++) set(g, x, 13, 'k'); }
  else if (gl && gs === 'shades') { rect(g, 8, 14, 5, 3, 'g'); rect(g, 18, 14, 5, 3, 'g'); for (let x = 13; x <= 17; x++) set(g, x, 14, 'k'); set(g, 9, 14, 'G'); set(g, 19, 14, 'G'); } // shades over the mask
  g.pal = { k: '#1d1622', h: '#8d93a6', H: '#6b7088', m: '#ece6da', d: '#2b2a38', e: '#ffffff', b: '#0b0710', f: '#5a3d2b', F: '#1a1010', Q: '#7a5640',
    n: '#2a1e1a', j: '#d8405e',
    ...(hs === 'tophat' ? { f: '#2b2533', F: '#7a2438', Q: '#4a4256' } : hs === 'bowler' ? { f: '#3a2a22', F: '#1a1010', Q: '#5e4636' } : hs === 'crown' ? { f: '#e8b830', F: '#b0841c', Q: '#fff0a0' } : {}),
    ...(gs === 'monocle' ? { g: '#e8b830', G: '#fff0a0' } : gs === 'aviator' ? { g: '#3c4a68', G: '#9ab8ff' } : {}),
    ...(hat ? { f: hat[0], F: hat[1], Q: hat[2] } : {}), ...(gl ? { g: gl[0], G: gl[2] } : {}) };
  g.alpha = 1;
  return g;
}

// The Raccoon, full body (v0.4.1): chibi villain in a trench coat with a red bow tie, striped tail, little dark paws.
// pose: idle | smug (rubbing paws, leaning at the cage) | sulk (arms crossed, half-lidded) | leash (holding the chain) | glee (paws up, hopping) | walk
// 34x48 grid; feet rest on row 46. Faces left (toward the cage). Chain paw (leash pose) is at RACCOON_PAW.
export const RACCOON_W = 34, RACCOON_H = 48, RACCOON_PAW = { x: 5, y: 33 };
// v0.4.2 final-day poses: where his working paw is (sprite coords), so the scene can hang a ladle/crank/cord off it
export function racPaw(pose, t) {
  if (pose === 'stir') return [4 + Math.round(Math.sin(t * 5) * 1.5), 35 + Math.round(Math.cos(t * 5))];
  if (pose === 'crank') return [5 + Math.round(Math.cos(t * 5) * 2), 33 + Math.round(Math.sin(t * 5) * 2)];
  return [12, 33];
}
export function raccoonBody(t, pose = 'idle', opts = {}) {
  const g = grid(RACCOON_W, RACCOON_H), k = 'k';
  const glee = pose === 'glee', sulk = pose === 'sulk' || pose === 'leash', walk = pose === 'walk';
  const hop = glee ? Math.round(Math.abs(Math.sin(t * 7)) * 2) : 0;
  const lean = pose === 'smug' ? Math.round((Math.sin(t * 0.9) + 1) * 0.75) : 0; // leans in toward the cage now and then
  const by = -hop;
  // tail (behind): striped, swishing; droops when sulking, wags when gleeful
  const sw = Math.sin(t * (glee ? 9 : 2.4)) * (glee ? 2.2 : 1.4), droop = sulk ? 5 : 0;
  const tp = [[23, 39 + by], [28, 37 + by + droop * 0.4], [31 + sw * 0.5, 31 + by + droop], [30 + sw, 24 + by + droop * 1.4]];
  layer(g, l => { stroke(l, tp, 3, 2.6, 'h');
    for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) if (get(l, x, y) && Math.floor((y - by + x * 0.35) / 2.6) % 2) set(l, x, y, 'd');
    const [ex, ey] = tp[3]; ell(l, ex, ey - 0.5, 2.2, 2, 'd'); }, k);
  // legs + feet
  const st = walk ? Math.sin(t * 9) * 1.6 : 0;
  layer(g, l => { ell(l, 13 + st, 45 - Math.max(0, st) + (glee ? by : 0), 3.2, 1.8, 'd'); ell(l, 21 - st, 45 - Math.max(0, -st) + (glee ? by : 0), 3.2, 1.8, 'd'); }, k);
  // coat
  layer(g, l => { ell(l, 17, 35 + by, 8, 8, 'c', { shade: 'C', sd: 1.6 }); rect(l, 10, 39 + by, 15, 4, 'c'); for (let x = 10; x < 25; x++) set(l, x, 42 + by, x % 3 ? 'C' : 'c'); }, k);
  for (let y = 28; y < 43; y++) set(g, 17, y + by, 'C'); // coat seam
  set(g, 18, 33 + by, 'y'); set(g, 18, 37 + by, 'y'); // buttons
  // arms by pose (shoulders at 11 / 23, row 30)
  const rub = Math.sin(t * 10) > 0 ? 1 : 0;
  const arms = glee ? [[[11, 30], [6, 22]], [[23, 30], [28, 22]]]
    : pose === 'smug' ? [[[11, 30], [14 + rub, 34]], [[23, 30], [19 + rub, 34]]]
    : pose === 'leash' ? [[[11, 30], [RACCOON_PAW.x + 1, RACCOON_PAW.y]], [[23, 30], [20, 35]]]
    : pose === 'stir' || pose === 'crank' ? [[[11, 30], racPaw(pose, t)], [[23, 30], [25, 37]]]
    : pose === 'recipe' ? [[[11, 30], [12, 33]], [[23, 30], [22, 33]]]
    : sulk ? [[[11, 31], [20, 33]], [[23, 31], [14, 34]]]
    : walk ? [[[11, 30], [9 - st, 36]], [[23, 30], [25 + st, 36]]]
    : [[[11, 30], [9, 37]], [[23, 30], [25, 37]]];
  layer(g, l => { for (const [[x0, y0], [x1, y1]] of arms) { stroke(l, [[x0, y0 + by], [x1, y1 + by]], 1.7, 1.5, 'c'); } }, k);
  const cane = (LOOK.styles || {}).hand === 'cane' && !glee && arms[1][1][1] >= 33;
  if (cane) layer(g, l => { const [px, py] = arms[1][1], x = Math.round(px + 1.5), y0 = Math.round(py + by);
    for (let y = y0 - 2; y <= 45; y++) set(l, x, y, 'w'); set(l, x - 1, y0 - 3, 'W'); set(l, x - 2, y0 - 3, 'W'); set(l, x - 3, y0 - 2, 'W'); set(l, x, y0 - 3, 'W'); set(l, x, 46, 'y'); }, k);
  layer(g, l => { for (const [, [x1, y1]] of arms) ell(l, x1 + (x1 < 17 ? -0.6 : 0.6), y1 + by, 1.8, 1.6, 'd'); }, k);
  // head (the classic fedora head) + red bow tie
  const head = raccoon(t, opts.look ?? (pose === 'smug' || pose === 'leash' || pose === 'stir' || pose === 'crank' || pose === 'recipe' || walk ? -1 : 0), sulk);
  const hx = 2 - lean, hy = 1 + by + (sulk ? 1 : 0);
  for (let y = 0; y < head.h; y++) for (let x = 0; x < head.w; x++) { const c = head.a[y * head.w + x]; if (c) set(g, x + hx, y + hy, c); }
  const bsty = LOOK.styles || {}, ny = 26 + by + (sulk ? 1 : 0);
  if (bsty.bowtie === 'scarf') { const bx = 14 - lean; rect(g, bx - 3, ny, 12, 2, 'r'); for (let x = bx - 3; x < bx + 9; x++) set(g, x, ny + 1, x % 2 ? 'R' : 'r');
    for (let y = ny + 2; y < ny + 8; y++) { set(g, bx + 5, y, 'r'); set(g, bx + 6, y, 'R'); } set(g, bx + 5, ny + 8, 'R'); set(g, bx + 6, ny + 8, 'r'); }
  else if (bsty.bowtie !== 'none') pat2(g, 14 - lean, ny, ['rr.rr', 'rRRRr', 'rr.rr']);
  if (bsty.pin === 'flower') { pat2(g, 12, 30 + by, ['.p.', 'pyp', '.p.']); set(g, 13, 33 + by, 'v'); }
  if (glee) { for (let x = 13; x <= 19; x++) { set(g, x + hx, 22 + hy, 'b'); set(g, x + hx, 23 + hy, x % 2 ? 'e' : 'b'); } set(g, 12 + hx, 21 + hy, 'k'); set(g, 20 + hx, 21 + hy, 'k'); } // big grin
  if (sulk) for (let x = 13; x <= 19; x++) { set(g, x + hx, 22 + hy, null); set(g, x + hx, 23 + hy, x === 13 || x === 19 ? 'k' : null); set(g, x + hx, 22 + hy, x > 13 && x < 19 ? 'k' : 'm'); } // flat frown
  const coat = lookPal('shirt', t, 1), bow = lookPal('bowtie', t, 3);
  g.pal = { ...head.pal, c: '#4a3858', C: '#33263f', r: '#d8405e', R: '#a02a46', y: '#ffd84a', p: '#ff6fa8', v: '#3e9a4a', w: '#8a5a3a', W: '#e8b830', ...(coat ? { c: coat[0], C: coat[1] } : {}), ...(bow ? { r: bow[0], R: bow[1] } : {}) };
  g.alpha = 1;
  return g;
}
function pat2(g, x, y, rows) { rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] !== '.') set(g, x + i, y + j, r[i]); }); }

// v0.5.4: one outfit item on its own (shop tiles, shelf rewards): the pixels it adds to the raccoon, cropped. dark = silhouette.
const HEAD_SLOTS = ['hat', 'glasses', 'face'];
export function itemSprite(slot, style, color, dark = false, t = 0) {
  const prev = LOOK, head = HEAD_SLOTS.includes(slot);
  const c = color || (slot === 'glasses' && style === 'shades' ? 'black' : null);
  const draw = lk => { LOOK = lk; return head ? raccoon(t, 0) : raccoonBody(t, 'idle'); };
  let a, b;
  try { b = draw({ styles: { [slot]: 'none' } }); a = draw({ styles: { [slot]: style }, ...(c ? { [slot]: c } : {}) }); } finally { LOOK = prev; }
  let x0 = a.w, y0 = a.h, x1 = -1, y1 = -1;
  for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) { const i = y * a.w + x; if (a.a[i] && a.a[i] !== b.a[i]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } }
  if (x1 < 0) return null;
  const g = grid(x1 - x0 + 1, y1 - y0 + 1);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = y * a.w + x; if (a.a[i] && a.a[i] !== b.a[i]) set(g, x - x0, y - y0, a.a[i]); }
  g.pal = a.pal; if (dark) { const pal = {}; for (const k in a.pal) pal[k] = '#0e0b14'; g.pal = pal; }
  g.alpha = 1; return g;
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

// Scaled blit (for squash/stretch). Anchored at the bottom-centre of the sprite.
export function blitScaled(ctx, g, ox, oy, sx, sy, opt = {}) {
  ctx.save(); ctx.globalAlpha = (opt.alpha ?? 1) * (g.alpha ?? 1);
  const w = g.w * sx, h = g.h * sy, x0 = ox + (g.w - w) / 2, y0 = oy + g.h - h;
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    const c = g.a[y * g.w + x]; if (!c) continue;
    ctx.fillStyle = g.pal[c] || c;
    const dx = opt.flipX ? g.w - 1 - x : x, dy = opt.flipY ? g.h - 1 - y : y;
    ctx.fillRect(Math.floor(x0 + dx * sx), Math.floor(y0 + dy * sy), Math.ceil(sx), Math.ceil(sy));
  }
  ctx.restore();
}
function split(g, row) { // [top, bottom] copies of a sprite cut at a row
  const top = { ...g, a: g.a.map((c, i) => Math.floor(i / g.w) < row ? c : null) };
  const bot = { ...g, a: g.a.map((c, i) => Math.floor(i / g.w) >= row ? c : null) };
  return [top, bot];
}
// Tiny 3x5 pixel font for sound effects.
const FONT = { U: '101101101101111', S: '111100111001111', D: '110101101101110', L: '100100100100111', C: '111100100100111', A: '010101111101101', B: '110101110101110', E: '111100110100111', H: '101101111101101', I: '111010010010111', K: '101101110101101', N: '110101101101101', O: '111101101101111', P: '110101110100100', R: '110101110101101', W: '101101101111101', Z: '111001010100111', '!': '010010010000010', ' ': '000000000000000' };
export function pxText(ctx, str, x, y, c, s = 1, shadow = '#000') {
  const draw = (ox, oy, col) => { ctx.fillStyle = col; let cx = ox; for (const ch of str) { const f = FONT[ch] || FONT[' ']; for (let i = 0; i < 15; i++) if (f[i] === '1') ctx.fillRect(cx + (i % 3) * s, oy + Math.floor(i / 3) * s, s, s); cx += 4 * s; } };
  if (shadow) draw(Math.round(x) + s, Math.round(y) + s, shadow); draw(Math.round(x), Math.round(y), c);
}
export const textW = (str, s = 1) => str.length * 4 * s - s;

// ---- the scene (128 x 112 logical pixels) ----
export const SCENE_W = 128, SCENE_H = 112;
export const VIEW_W = 100, VIEW_H = 88, VIEW_X = 14, VIEW_Y = 14;
function px(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }

// Layout (v0.4.1): cage on the left, The Raccoon standing on the right, all inside the visible 100x88 window.
const LAMP0 = 50, CAGE_X = 20, PET_X = 30, RAC_X = 80, RAC_Y = 45;
function room(ctx, t, dark, LAMP = LAMP0) {
  px(ctx, 0, 0, SCENE_W, SCENE_H, dark ? '#1b1626' : '#2c2340');
  for (let y = 0; y < 92; y += 6) for (let x = (y / 6) % 2 ? -6 : 0; x < SCENE_W; x += 12) {
    px(ctx, x, y, 11, 5, dark ? '#211b2e' : '#352a4b'); px(ctx, x, y, 11, 1, dark ? '#251f33' : '#3e3256');
  }
  px(ctx, 0, 92, SCENE_W, 20, '#3a2b25');
  for (let x = 0; x < SCENE_W; x += 16) px(ctx, x, 92, 1, 20, '#2a1d19');
  px(ctx, 0, 92, SCENE_W, 1, '#55403a');
  const sw = Math.sin(t * 1.4) * 3;
  for (let y = 0; y < 20; y++) px(ctx, LAMP + sw * (y / 20), y, 1, 1, '#111');
  ctx.save(); ctx.globalAlpha = dark ? 0.05 : 0.09; ctx.fillStyle = '#ffe9a0';
  ctx.beginPath(); ctx.moveTo(LAMP + sw, 22); ctx.lineTo(LAMP - 46 + sw * 3, 112); ctx.lineTo(LAMP + 46 + sw * 3, 112); ctx.closePath(); ctx.fill(); ctx.restore();
  if (!dark) for (let i = 0; i < 9; i++) { // dust motes drifting in the lamp light
    const f = ((t * (0.03 + i * 0.004) + i * 0.137) % 1), y = 30 + f * 70, x = LAMP + sw * 2 + Math.sin(t * 0.7 + i * 2.1) * (6 + f * 30);
    ctx.save(); ctx.globalAlpha = 0.35 * Math.sin(Math.PI * f); px(ctx, x, y, 1, 1, '#fff3c4'); ctx.restore(); }
  px(ctx, LAMP - 2 + sw, 20, 5, 4, dark ? '#776a3a' : '#ffe27a'); px(ctx, LAMP - 1 + sw, 24, 3, 1, dark ? '#776a3a' : '#ffd84a'); px(ctx, LAMP - 1 + sw, 19, 3, 1, '#666');
}
function cage(ctx, x, y, w, h, open = 0) {
  px(ctx, x, y, w, 2, '#9aa0ad'); px(ctx, x, y + h - 2, w, 2, '#9aa0ad');
  for (let i = 0; i <= w; i += 8) { if (open && i > 0 && i < w) continue; px(ctx, x + i, y, 1, h, '#c5cad6'); }
  if (open) return;
  const lx = x + w - 12, ly = y + h - 14;
  px(ctx, lx, ly, 7, 6, '#e0b43a'); px(ctx, lx + 1, ly - 3, 5, 3, '#9aa0ad'); px(ctx, lx + 2, ly - 2, 3, 2, '#2c2340'); px(ctx, lx + 3, ly + 2, 1, 2, '#5a3d10');
}
function tomb(ctx, x, y) {
  px(ctx, x + 2, y, 12, 2, '#8a8f9c'); px(ctx, x, y + 2, 16, 16, '#8a8f9c'); px(ctx, x + 1, y + 1, 14, 1, '#8a8f9c');
  px(ctx, x + 7, y + 4, 2, 9, '#5d6170'); px(ctx, x + 4, y + 6, 8, 2, '#5d6170'); px(ctx, x - 2, y + 18, 20, 2, '#4a3a2a');
}
function stars(ctx, cx, cy, t, r = 12) { for (let i = 0; i < 5; i++) { const a = t * 5 + i * 1.256; const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.35; px(ctx, x, y, 2, 2, '#ffe27a'); px(ctx, x - 1, y + 0.5, 4, 1, '#ffe27a'); } }
function anvil(ctx, x, y) {
  px(ctx, x, y, 30, 5, '#4a4f5c'); px(ctx, x - 6, y, 8, 3, '#4a4f5c'); px(ctx, x + 6, y + 5, 18, 5, '#3a3e48'); px(ctx, x + 2, y + 10, 26, 4, '#4a4f5c');
  px(ctx, x, y, 30, 1, '#8a90a0');
}
function puff(ctx, x, y, t, n = 5, col = '#d8d2e0') { ctx.save(); for (let i = 0; i < n; i++) { const a = i * 2.4, r = 4 + t * 14; ctx.globalAlpha = Math.max(0, 0.8 - t); px(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6 - t * 6, 5, 4, col); } ctx.restore(); }

// Home scene: the current hostage in the cage, the raccoon peeking in.
// Freed-but-chained (today's 10k banked): the pet strolls back and forth in front of the open cage,
// chained by the ankle to the raccoon's post. Every few laps it stops for a happy hop or a big stretch.
const WALK_MIN = 13, WALK_MAX = 44, WALK_SPEED = 11; // px/s; the chain runs to The Raccoon's paw
function walker(t) {
  const span = WALK_MAX - WALK_MIN, lap = span / WALK_SPEED, pause = 1.4, cycle = 2 * lap + 2 * pause;
  const u = t % cycle, n = Math.floor(t / cycle);
  if (u < lap) return { x: WALK_MIN + u * WALK_SPEED, dir: 1, walking: true };
  if (u < lap + pause) return { x: WALK_MAX, dir: 1, walking: false, trick: n % 2 ? 'hop' : 'stretch', p: (u - lap) / pause };
  if (u < 2 * lap + pause) return { x: WALK_MAX - (u - lap - pause) * WALK_SPEED, dir: -1, walking: true };
  return { x: WALK_MIN, dir: -1, walking: false, trick: n % 2 ? 'stretch' : 'hop', p: (u - 2 * lap - pause) / pause };
}
function chain(ctx, x0, y0, x1, y1, len) {
  const d = Math.hypot(x1 - x0, y1 - y0), sag = Math.max(0, len - d) * 0.35, n = Math.max(6, Math.round(len / 3));
  for (let i = 0; i <= n; i++) {
    const f = i / n; let x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f + Math.sin(Math.PI * f) * sag;
    y = Math.min(y, 94); // drags along the floor
    if (i % 2) { px(ctx, x - 1, y, 3, 2, '#5d6170'); px(ctx, x, y, 1, 1, '#c5cad6'); } else { px(ctx, x, y - 1, 2, 3, '#5d6170'); px(ctx, x, y - 1, 1, 1, '#d8dce6'); }
  }
}
const reactAmt = (st, who, t) => { const r = st.react; if (!r || r.who !== who) return 0; const u = (t - r.at) / 0.7; return u >= 0 && u < 1 ? Math.sin(Math.PI * u) : 0; };
// Tap targets in view pixels (the visible 100x88 window), padded for thumbs.
export function hitBoxes(st, t) {
  const pad = 5, box = (x, y, w, h) => ({ x: x - VIEW_X - pad, y: y - VIEW_Y - pad, w: w + 2 * pad, h: h + 2 * pad });
  const rac = box(RAC_X + 4, RAC_Y + 1, 28, 46);
  if (st.mode === 'death') return { pet: box(14, 6, 64, 90), raccoon: rac };
  if (st.freed) { const w = walker(t); return { pet: box(w.x + 2, 46, 32, 46), raccoon: rac }; }
  if (st.final) return { pet: box(PET_X - 2, 28, 40, 50), raccoon: rac };
  return { pet: box(PET_X, 46, 36, 46), raccoon: rac };
}
// The Raccoon in the scene: idles, smirks and rubs his paws; a tap makes him jolt.
function drawRaccoon(ctx, st, t, pose, x = RAC_X) {
  const rr = st ? reactAmt(st, 'raccoon', t) : 0;
  blit(ctx, raccoonBody(t, pose), x + (rr ? (Math.sin(t * 40) > 0 ? 1 : -1) : 0), RAC_Y - Math.round(rr * 4));
  return rr;
}
function drawFreed(ctx, st, t) {
  room(ctx, t, false, st.final ? (PERIL_LAMP[st.species] || LAMP0) : LAMP0);
  if (st.final) { ctx.save(); ctx.globalAlpha = 0.75; (PERIL[st.species] || PERIL.bunny)(ctx, st, t, true); ctx.restore(); } // final day banked: the defused contraption
  else cage(ctx, CAGE_X, 46, 56, 47, 1); // empty, door off
  const pose = 'leash';
  const rr = drawRaccoon(ctx, st, t, pose);
  if (Math.sin(t * 1.7) > 0.6 || rr) { const ax = RAC_X + 22, ay = RAC_Y + 3; px(ctx, ax, ay, 2, 1, '#ff5a5a'); px(ctx, ax - 1, ay + 1, 1, 2, '#ff5a5a'); px(ctx, ax + 2, ay + 1, 1, 2, '#ff5a5a'); px(ctx, ax, ay + 3, 2, 1, '#ff5a5a'); } // anger mark
  const w = walker(t);
  let y = 55, sx = 1, sy = 1, phase;
  if (w.walking) { phase = t * 9; y -= Math.abs(Math.sin(phase)) * 1.5; }
  else if (w.trick === 'hop') { y -= Math.sin(Math.PI * Math.min(1, w.p * 1.4)) * 10; }
  else { const k = Math.sin(Math.PI * w.p); sx = 1 - 0.08 * k; sy = 1 + 0.12 * k; }
  const g = critter(st.species || 'bunny', 'happy', w.trick === 'stretch' ? 2.5 : t, st.injuries, phase != null ? { walk: phase } : {});
  const pr = reactAmt(st, 'pet', t); y -= pr * 9;
  const ax = w.x + 13 + (w.dir < 0 ? 10 : 0), ay = y + 36; // ankle (left or right foot depending on facing)
  chain(ctx, RAC_X + RACCOON_PAW.x, RAC_Y + RACCOON_PAW.y, ax, Math.min(ay, 92), 80);
  if (sx !== 1 || sy !== 1) blitScaled(ctx, g, w.x, y, sx, sy, { flipX: w.dir < 0 }); else blit(ctx, g, w.x, y, { flipX: w.dir < 0 });
  if (st.final && (st.deaths || 0) > 0) taped(ctx, g, w.x, Math.round(y + g.h * (1 - sy)), w.dir < 0); // revived + 15k banked: head taped back on
  px(ctx, ax - 2, Math.min(ay, 92) - 1, 5, 2, '#8a8f9c'); // ankle cuff
  px(ctx, RAC_X + RACCOON_PAW.x - 1, RAC_Y + RACCOON_PAW.y - 1, 3, 3, '#8a8f9c'); // chain end in his paw
}

// ---- v0.4.2: final-day peril scenes (day N of N, 15k). One per species; `calm` = the relief backdrop once 15k is banked ----
const lerp = (a, b, f) => a + (b - a) * f;
function pline(ctx, x0, y0, x1, y1, c, w = 1) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let i = 0; i <= n; i++) px(ctx, lerp(x0, x1, i / n), lerp(y0, y1, i / n), w, w, c); }
function flames(ctx, x, y, w, t) {
  for (let i = 0; i < w; i += 2) {
    const h = 2 + Math.round((Math.sin(t * 13 + i * 1.7) * 0.5 + 0.5) * 4 + (Math.sin(t * 7.3 + i * 0.9) * 0.5 + 0.5) * 2);
    px(ctx, x + i, y - h, 2, h, '#ff5a2a'); px(ctx, x + i, y - Math.max(1, h - 2), 2, Math.max(1, h - 2), '#ffa83a'); if (h > 5) px(ctx, x + i, y - 2, 2, 2, '#ffe27a');
  }
  ctx.save(); ctx.globalAlpha = 0.12 + 0.04 * Math.sin(t * 9); px(ctx, x - 8, y - 14, w + 16, 16, '#ff9a3a'); ctx.restore();
}
function steam(ctx, x, y, w, t, n = 6, calm = false) {
  ctx.save();
  for (let i = 0; i < n; i++) {
    const f = (t * (calm ? 0.12 : 0.35) + i / n) % 1, sx = x + ((i * 37) % w) + Math.sin(t * 1.5 + i) * 4 * f;
    ctx.globalAlpha = (calm ? 0.22 : 0.5) * Math.sin(Math.PI * f); px(ctx, sx, y - f * 28, 3 + Math.round(f * 3), 2 + Math.round(f * 2), '#ece6f4');
  }
  ctx.restore();
}
function bubbles(ctx, x, y, w, t, col, n = 7) {
  for (let i = 0; i < n; i++) { const f = (t * 1.7 + i * 0.37) % 1, bx = x + ((i * 13 + Math.floor(t * 1.7 + i * 0.37) * 7) % w);
    if (f < 0.75) px(ctx, bx, y - Math.round(f * 2), 2, 2, col); else { px(ctx, bx - 1, y - 2, 1, 1, col); px(ctx, bx + 2, y - 2, 1, 1, col); } }
}
function rope(ctx, x, y0, y1, t, fray) {
  for (let y = y0; y < y1; y++) {
    const thin = fray && y >= y0 + 3 && y <= y0 + 6;
    px(ctx, x, y, thin ? 1 : 2, 1, (y + Math.floor(x)) % 2 ? '#d2ae72' : '#a7824c');
  }
  if (fray) { const f = Math.sin(t * 6) > 0 ? 1 : 0; px(ctx, x - 1 - f, y0 + 4, 1, 1, '#d2ae72'); px(ctx, x + 2 + f, y0 + 5, 1, 1, '#a7824c'); px(ctx, x + 2, y0 + 3 + f, 1, 1, '#d2ae72'); }
}
function beam(ctx) { px(ctx, 14, 14, 72, 3, '#4a3828'); px(ctx, 14, 17, 72, 1, '#2e2018'); }
function pulley(ctx, x, y) { px(ctx, x - 2, y - 2, 5, 5, '#8a8f9c'); px(ctx, x - 1, y - 1, 3, 3, '#5d6170'); px(ctx, x, y, 1, 1, '#c5cad6'); }
function winch(ctx, x, y, t) { px(ctx, x - 3, y - 3, 7, 7, '#6a4a32'); px(ctx, x - 2, y - 2, 5, 5, '#8a6a48'); const a = t * 5; px(ctx, x + Math.round(Math.cos(a) * 2), y + Math.round(Math.sin(a) * 2), 1, 1, '#2e2018'); }
function petAt(ctx, st, t, x, y, opts = {}) {
  const mood = st.mood === 'scared' ? 'scared' : 'worried', pr = reactAmt(st, 'pet', t);
  const shake = (Math.sin(t * 17) > 0.7 ? 1 : 0) + (pr ? (Math.sin(t * 30) > 0 ? 1 : -1) : 0);
  const g = critter(st.species || 'bunny', mood, t, st.injuries, opts), X = Math.round(x + shake), Y = Math.round(y - pr * 4);
  if ((st.deaths || 0) > 0) unstitched(ctx, g, X, Y, t, st.deaths, !!opts.flip); else blit(ctx, g, X, Y, { flipX: !!opts.flip });
}
// v0.4.9: a pet that died before, in its final-day peril: the stitched neck comes half undone. Hinged on the left,
// the body sags away on the right, stuffing peeks out, stitches pop and fly, a loose thread swings. Cute-grim, no gore.
const NECK = 27, THREAD = '#c4405e';
const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function unstitched(ctx, g, X, Y, t, deaths, flip) {
  // v0.4.11: a hinge. Fully attached on the left; the seam peels open toward the right (0px -> ~2-3px),
  // as if gravity is tearing the body off the stitches from the right first (body tilts clockwise round the left neck point).
  const NECK = 28;
  const sx = x => X + (flip ? g.w - 1 - x : x);
  let lo = g.w, hi = -1;
  for (let x = 0; x < g.w; x++) if (g.a[NECK * g.w + x]) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
  const span = Math.max(1, hi - lo), swing = Math.sin(t * 1.8) * 0.4; // tied to the rope's swing
  const max = 3.6 + Math.min(3, deaths) * 0.6 + swing; // ~4 px base, up to ~5.8 with deaths, at the right edge
  const gap = x => Math.max(0, Math.round(max * Math.max(0, (x - lo) / span) ** 1.3));
  ctx.save(); ctx.globalAlpha = g.alpha ?? 1;
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    const c = g.a[y * g.w + x]; if (!c) continue;
    ctx.fillStyle = g.pal[c] || c; ctx.fillRect(sx(x), Y + y + (y < NECK ? 0 : gap(x)), 1, 1);
  }
  ctx.fillStyle = '#fff6ea'; // a tuft of stuffing where the tear is widest
  if (hi > lo) { const x = hi - 1, n = gap(x); if (n >= 2) ctx.fillRect(sx(x), Y + NECK + n - 1, 1, 1); }
  ctx.fillStyle = THREAD;
  const cyc = Math.floor(t * 1.2);
  [Math.round(lo + span * 0.62), Math.round(lo + span * 0.86)].forEach((x, i) => {
    const n = gap(x); if (n < 1) return;
    if (i === 1 && hash(x, cyc) < 0.35) return; // this one keeps popping
    for (let k = -1; k <= n; k++) ctx.fillRect(sx(x), Y + NECK + k, 1, 1);
  });
  { const p = (t * 1.1) % 1, fx = lo + span * 0.86 + p * 6, fy = NECK - p * 9 + p * p * 13; // popped stitch flying off
    ctx.globalAlpha = (g.alpha ?? 1) * (1 - p); for (const [dx, dy] of [[0, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]) ctx.fillRect(sx(Math.round(fx + dx)), Y + Math.round(fy + dy), 1, 1); ctx.globalAlpha = g.alpha ?? 1; }
  if (hi > lo) { const x0 = hi, y0 = NECK + Math.floor(gap(hi) / 2), ex = x0 + 2 + Math.sin(t * 4) * 2.5, ey = y0 + 7; // loose thread
    for (let i = 0; i <= 8; i++) { const u = i / 8; ctx.fillRect(sx(Math.round(x0 + (ex - x0) * u + Math.sin(u * 3) * 0.6)), Y + Math.round(y0 + (ey - y0) * u), 1, 1); } }
  ctx.restore();
}
// relief: the head is taped back on (masking tape round the neck, a little X, a dangling tab)
function taped(ctx, g, X, Y, flip) {
  const sx = x => X + (flip ? g.w - 1 - x : x);
  for (let x = 9; x <= 27; x++) {
    if (!g.a[NECK * g.w + x]) continue;
    ctx.fillStyle = '#efe3c2'; ctx.fillRect(sx(x), Y + NECK - 1, 1, 2);
    ctx.fillStyle = '#c9b98e'; ctx.fillRect(sx(x), Y + NECK + 1, 1, 1);
  }
  ctx.fillStyle = '#c9b98e'; for (const [x, y] of [[16, -2], [17, -1], [18, 0], [19, 1], [19, -2], [18, -1], [17, 0], [16, 1]]) ctx.fillRect(sx(x), Y + NECK + y, 1, 1);
  ctx.fillStyle = '#efe3c2'; ctx.fillRect(sx(25), Y + NECK + 2, 2, 2); ctx.fillRect(sx(26), Y + NECK + 4, 1, 1);
}
function racWithPaw(ctx, st, t, pose) { const rr = drawRaccoon(ctx, st, t, pose); const [qx, qy] = racPaw(pose, t); return [RAC_X + qx + (rr ? (Math.sin(t * 40) > 0 ? 1 : -1) : 0), RAC_Y + qy - Math.round(rr * 4)]; }
function recipeCard(ctx, t) {
  const x = RAC_X + 9, y = RAC_Y + 27 + (Math.sin(t * 2) > 0.9 ? 1 : 0);
  px(ctx, x, y, 15, 11, '#f3ead2'); px(ctx, x, y, 15, 1, '#fffaf0'); px(ctx, x + 2, y + 2, 9, 1, '#d8405e');
  for (let j = 0; j < 3; j++) px(ctx, x + 2, y + 5 + j * 2, 7 + (j % 2) * 3, 1, '#8a7f6a');
  px(ctx, x - 1, y + 4, 2, 3, '#1f1a28'); px(ctx, x + 14, y + 4, 2, 3, '#1f1a28'); // paws
}
// each returns nothing; peril draws pet + raccoon, calm draws only the defused props (drawFreed adds the chained walk)
const PERIL = {
  bunny(ctx, st, t, calm) { // dangling by the ears over a bubbling pot
    beam(ctx); px(ctx, 38, 17, 5, 2, '#8a8f9c');
    const sw = calm ? 0 : Math.sin(t * 1.8) * 2.5, HX = 40;
    if (!calm) flames(ctx, 16, 92, 60, t); else { px(ctx, 22, 89, 48, 3, '#3a2a22'); px(ctx, 28, 88, 12, 2, '#5a4a3a'); px(ctx, 48, 88, 14, 2, '#4a3a2e'); }
    if (calm) { rope(ctx, HX, 19, 30, t, true); px(ctx, HX - 1, 30, 1, 2, '#d2ae72'); px(ctx, HX + 2, 30, 1, 2, '#a7824c'); }
    else { pline(ctx, HX, 19, HX + sw, 36, '#c9a46a', 2); rope(ctx, HX, 19, 24, t, true); petAt(ctx, st, t, HX - 18 + sw, 24); px(ctx, HX - 3 + sw, 33, 8, 2, '#a7824c'); }
    // cauldron: rim, water, round belly, little legs
    px(ctx, 16, 63, 58, 2, '#8a8c9a'); px(ctx, 18, 65, 54, 2, calm ? '#6fa8c4' : '#8fd3f0');
    if (!calm) bubbles(ctx, 19, 66, 50, t, '#e8f8ff', 9);
    px(ctx, 16, 67, 58, 2, '#6e7080'); px(ctx, 16, 67, 58, 1, '#9a9cac');
    for (let j = 0; j < 20; j++) { const o = Math.round(Math.max(0, Math.abs(j - 7) - 3) ** 2 / 5) - (j > 2 && j < 12 ? 2 : 0); px(ctx, 18 + o, 69 + j, 54 - 2 * o, 1, '#33353f'); px(ctx, 21 + o, 69 + j, 3, 1, '#545666'); }
    px(ctx, 24, 88, 3, 4, '#2a2c34'); px(ctx, 63, 88, 3, 4, '#2a2c34');
    steam(ctx, 22, 64, 46, t, calm ? 3 : 8, calm);
    if (!calm) { const [ax, ay] = racWithPaw(ctx, st, t, 'stir'); pline(ctx, ax, ay, 64, 65, '#c8a070'); px(ctx, ax - 1, ay - 1, 3, 3, '#1f1a28'); }
  },
  hamster(ctx, st, t, calm) { // running for dear life in a wheel over the grill
    const cx = 47, cy = 44, R = 22, rot = calm ? 0.3 : t * 3.2;
    px(ctx, 46, 14, 2, 30, '#5d6170');
    if (!calm) flames(ctx, 22, 78, 50, t);
    for (let i = 0; i < 4; i++) { const a = rot + i * Math.PI / 4 * 2; pline(ctx, cx, cy, cx + Math.cos(a) * R, cy + Math.sin(a) * R, '#7a8090'); }
    for (let a = 0; a < Math.PI * 2; a += 0.06) { px(ctx, cx + Math.cos(a) * R, cy + Math.sin(a) * R, 1, 1, '#c5cad6'); px(ctx, cx + Math.cos(a) * (R - 1), cy + Math.sin(a) * (R - 1), 1, 1, '#9aa0ad'); }
    for (let i = 0; i < 12; i++) { const a = rot + i * Math.PI / 6; px(ctx, cx + Math.cos(a) * (R - 2), cy + Math.sin(a) * (R - 2), 1, 1, '#e8ecf4'); }
    px(ctx, cx - 2, cy - 2, 5, 5, '#8a8f9c'); px(ctx, cx - 1, cy - 1, 3, 3, '#c5cad6');
    if (!calm) { const [ax, ay] = racWithPaw(ctx, st, t, 'crank'); const off = Math.floor(t * 10) % 2; // drive belt runs behind the hamster
      const n = Math.hypot(ax - cx, ay - cy); for (let i = 0; i <= n; i++) px(ctx, lerp(cx, ax, i / n), lerp(cy, ay, i / n), 1, 1, (i + off) % 2 ? '#2e2018' : '#9a7a50');
      winch(ctx, ax, ay, t); petAt(ctx, st, t, 29, 28, { walk: t * 15 }); }
    px(ctx, 20, 78, 56, 1, '#9aa0ad'); for (let x = 20; x < 76; x += 4) px(ctx, x, 77, 1, 3, '#9aa0ad');
    px(ctx, 22, 79, 52, 2, calm ? '#3a3036' : (Math.sin(t * 6) > 0 ? '#ff4a2a' : '#d8302a'));
    px(ctx, 22, 81, 52, 8, '#3a3c48'); px(ctx, 22, 81, 52, 1, '#565868'); px(ctx, 24, 89, 3, 3, '#2a2c34'); px(ctx, 69, 89, 3, 3, '#2a2c34');
  },
  squirrel(ctx, st, t, calm) { // sat in a pie tin while the top crust comes down
    const ly = calm ? 24 : Math.round(28 + (Math.sin(t * 0.9) * 0.5 + 0.5) * 9);
    px(ctx, 30, 14, 1, ly - 18, '#a7824c'); px(ctx, 63, 14, 1, ly - 18, '#a7824c');
    for (let j = 0; j < 7; j++) { const o = Math.round((6 - j) ** 2 / 2.2); px(ctx, 22 + o, ly - 6 + j, 50 - 2 * o, 1, '#e8b060'); }
    for (let x = 24; x < 72; x += 5) pline(ctx, x, ly, Math.min(70, x + 5), ly - 5, '#c88a40');
    px(ctx, 46, ly - 9, 3, 3, '#c88a40'); for (const x of [36, 47, 58]) px(ctx, x, ly - 4, 2, 1, '#7a4a20');
    for (let x = 22; x < 72; x += 2) px(ctx, x, ly, 2, 1, x % 4 ? '#f4c878' : '#c88a40');
    px(ctx, 16, 80, 62, 3, '#8a5a3a'); px(ctx, 16, 80, 62, 1, '#a8704a'); px(ctx, 18, 83, 58, 2, '#6a4028'); px(ctx, 20, 85, 3, 7, '#6a4028'); px(ctx, 71, 85, 3, 7, '#6a4028');
    if (!calm) petAt(ctx, st, t, 29, 40);
    px(ctx, 22, 74, 50, 6, '#b0b4c0'); px(ctx, 22, 74, 50, 1, '#d8dce6'); px(ctx, 24, 79, 46, 1, '#8a8f9c');
    for (let x = 22; x < 72; x += 2) px(ctx, x, 73, 2, 1, x % 4 ? '#e8b060' : '#c88a40');
    px(ctx, 60, 77, 5, 2, '#7a3a8a'); px(ctx, 30, 77, 4, 2, '#7a3a8a');
    if (!calm) { racWithPaw(ctx, st, t, 'recipe'); recipeCard(ctx, t); }
  },
  hedgehog(ctx, st, t, calm) { // in the fryer basket, being lowered
    const bb = calm ? 40 : Math.round(60 + (Math.sin(t * 0.8) * 0.5 + 0.5) * 7), top = bb - 18;
    pulley(ctx, 47, 18); pulley(ctx, 76, 18);
    px(ctx, 47, 18, 29, 1, '#a7824c'); px(ctx, 47, 18, 1, top - 21, '#a7824c');
    for (let x = 30; x < 65; x++) { const y = top - 3 - Math.round(Math.sin(Math.PI * (x - 30) / 35) * 2); px(ctx, x, y, 1, 1, '#8a8f9c'); }
    if (!calm) petAt(ctx, st, t, 29, bb - 37);
    ctx.save(); ctx.globalAlpha = 0.85;
    for (let x = 26; x <= 68; x += 3) px(ctx, x, top, 1, 18, '#c5cad6'); for (let y = top; y <= bb; y += 3) px(ctx, 26, y, 43, 1, '#c5cad6');
    ctx.restore(); px(ctx, 26, bb, 43, 1, '#e8ecf4'); px(ctx, 26, top, 43, 1, '#e8ecf4');
    px(ctx, 20, 69, 54, 2, '#c5cad6'); px(ctx, 22, 70, 50, 3, calm ? '#a87828' : '#e0a030');
    if (!calm) { bubbles(ctx, 23, 71, 46, t, '#ffe08a', 9); for (let i = 0; i < 4; i++) if (Math.sin(t * 11 + i * 2) > 0.7) px(ctx, 26 + i * 12, 64 - (i % 2) * 3, 1, 1, '#ffe08a'); }
    px(ctx, 20, 73, 54, 19, '#9aa0ad'); px(ctx, 20, 73, 54, 1, '#c5cad6'); px(ctx, 24, 78, 46, 9, '#7a8090'); px(ctx, 28, 81, 6, 2, '#ff5a5a'); px(ctx, 60, 81, 3, 3, '#3a3c48');
    if (!calm) { const [ax, ay] = racWithPaw(ctx, st, t, 'crank'); pline(ctx, 76, 18, ax, ay, '#a7824c'); winch(ctx, ax, ay, t); }
    else pline(ctx, 76, 18, 78, 60, '#a7824c');
  },
  kitten(ctx, st, t, calm) { // in the mixing bowl, under the mixer
    const by = calm ? 0 : Math.round((Math.sin(t * 0.7) * 0.5 + 0.5) * 6);
    px(ctx, 47, 14, 1, 3, '#5d6170'); px(ctx, 32, 17, 30, 9, '#ff9ac0'); px(ctx, 32, 17, 30, 1, '#ffc4dc'); px(ctx, 34, 25, 26, 1, '#d86a98'); px(ctx, 52, 19, 6, 2, '#ffffff');
    for (const bx of [39, 53]) {
      const len = calm ? 4 : 12 + by; px(ctx, bx, 26, 1, len, '#c5cad6');
      const y0 = 26 + len, f = calm ? 0 : Math.floor(t * 18) % 2;
      for (let j = 0; j < 7; j++) { const w = [2, 4, 5, 6, 5, 4, 2][j]; px(ctx, bx - (f ? w - 1 : 1) + (f ? 0 : 0), y0 + j, 1, 1, '#e8ecf4'); px(ctx, bx + (f ? 1 : w - 1), y0 + j, 1, 1, '#e8ecf4'); }
      if (!calm) for (let i = 0; i < 2; i++) if (Math.sin(t * 20 + i * 3 + bx) > 0.5) px(ctx, bx + (i ? 5 : -6), y0 + 2 + i, 2, 1, '#ffffff');
    }
    px(ctx, 18, 64, 58, 3, '#d8c8b0'); px(ctx, 20, 65, 54, 2, calm ? '#e8d8a8' : '#f8e8c0');
    if (!calm) petAt(ctx, st, t, 29, 40);
    for (let j = 0; j < 26; j++) { const o = Math.round(j * j / 42); px(ctx, 18 + o, 67 + j, 58 - 2 * o, 1, j === 5 || j === 6 ? '#7fb8e0' : '#f2e6d8'); px(ctx, 20 + o, 67 + j, 2, 1, '#fffaf2'); }
    if (!calm) { const [ax, ay] = racWithPaw(ctx, st, t, 'crank');
      for (let i = 0; i <= 20; i++) { const f = i / 20; px(ctx, lerp(62, ax, f), lerp(21, ay, f) + Math.sin(Math.PI * f) * 6, 1, 1, '#9aa0ad'); }
      px(ctx, ax - 3, ay - 3, 7, 7, '#e8e4ec'); px(ctx, ax - 1, ay - 1, 3, 3, '#d8405e'); px(ctx, ax + Math.round(Math.cos(t * 5) * 2), ay + Math.round(Math.sin(t * 5) * 2), 1, 1, '#1f1a28'); }
  },
  duckling(ctx, st, t, calm) { // running the wrong way on a conveyor into the oven
    px(ctx, 14, 44, 22, 48, '#5a5e6a'); px(ctx, 14, 44, 22, 2, '#7a7e8a'); for (let i = 0; i < 3; i++) px(ctx, 17 + i * 6, 48, 3, 3, '#2e2e38');
    const glow = calm ? '#2a2630' : (Math.sin(t * 8) > 0 ? '#ff8a3a' : '#ff6a2a');
    px(ctx, 17, 56, 16, 26, '#2e2e38'); px(ctx, 18, 57, 14, 24, glow);
    if (!calm) { ctx.save(); ctx.globalAlpha = 0.18; px(ctx, 32, 54, 14, 30, '#ffb04a'); ctx.restore(); for (let i = 0; i < 3; i++) px(ctx, 20 + i * 4, 60 + Math.round(Math.sin(t * 6 + i) * 2), 1, 3, '#ffd870'); }
    const off = calm ? 0 : Math.floor(t * 14) % 6;
    px(ctx, 32, 84, 48, 3, '#3a3c48'); px(ctx, 32, 87, 48, 5, '#2a2c34');
    for (let x = 32 + (6 - off); x < 80; x += 6) px(ctx, x, 84, 2, 1, '#6a6e7a');
    for (const rx of [34, 77]) { px(ctx, rx - 2, 86, 5, 5, '#8a8f9c'); px(ctx, rx, 88, 1, 1, '#2a2c34'); }
    for (let i = 0; i < 3; i++) { const ox = calm ? 40 + i * 13 : 80 - ((t * 14 + i * 16) % 48); if (ox > 33 && ox < 77) { px(ctx, ox, 82, 5, 2, '#ff9a2a'); px(ctx, ox + 1, 82, 3, 1, '#ffd870'); } }
    if (!calm) { petAt(ctx, st, t, 42 + Math.sin(t * 0.7) * 3, 47, { walk: t * 18 }); if (Math.sin(t * 3) > 0) px(ctx, 62, 52, 1, 2, '#8fd3f0');
      const [ax, ay] = racWithPaw(ctx, st, t, 'crank'); pline(ctx, 77, 88, ax, ay, '#8a8f9c'); px(ctx, ax - 1, ay - 1, 3, 3, '#1f1a28'); }
  },
  piglet(ctx, st, t, calm) { // hot-footing it in a frying pan
    px(ctx, 16, 80, 62, 12, '#e8e4ec'); px(ctx, 16, 80, 62, 1, '#ffffff'); for (let i = 0; i < 4; i++) px(ctx, 22 + i * 14, 86, 3, 3, '#3a3c48'); px(ctx, 18, 90, 58, 1, '#b8b4c0');
    if (!calm) flames(ctx, 24, 80, 46, t);
    if (!calm) petAt(ctx, st, t, 29, 34 - Math.abs(Math.sin(t * 6)) * 5);
    px(ctx, 20, 72, 52, 5, '#2e2e38'); px(ctx, 20, 72, 52, 1, '#5a5a6a'); px(ctx, 22, 77, 48, 1, '#24242c'); px(ctx, 72, 73, 10, 2, '#5a3a28');
    for (const ex of [21, 63]) { px(ctx, ex, 70, 8, 2, '#ffffff'); px(ctx, ex + 1, 69, 6, 1, '#ffffff'); px(ctx, ex + 3, 69, 2, 2, '#ffc83a'); }
    if (!calm) { for (let i = 0; i < 6; i++) if (Math.sin(t * 13 + i * 1.9) > 0.6) px(ctx, 24 + i * 8, 66 - (i % 3) * 2, 1, 1, i % 2 ? '#ffffff' : '#ffe27a');
      steam(ctx, 26, 70, 40, t, 4);
      const [ax, ay] = racWithPaw(ctx, st, t, 'stir'); pline(ctx, ax, ay, 66, 66, '#c8a070'); px(ctx, 63, 64, 5, 2, '#8a8f9c'); px(ctx, ax - 1, ay - 1, 3, 3, '#1f1a28'); }
  },
  panda(ctx, st, t, calm) { // in the bamboo steamer, lid coming down
    const ly = calm ? 16 : Math.round(19 + (Math.sin(t * 0.8) * 0.5 + 0.5) * 8);
    pulley(ctx, 47, 14); pulley(ctx, 74, 14); px(ctx, 47, 14, 27, 1, '#a7824c'); px(ctx, 47, 14, 1, ly - 15, '#a7824c');
    px(ctx, 44, ly - 1, 6, 2, '#a88848'); px(ctx, 32, ly + 1, 30, 2, '#d8b878'); px(ctx, 27, ly + 3, 40, 3, '#d8b878'); px(ctx, 27, ly + 5, 40, 1, '#a88848');
    for (let x = 30; x < 66; x += 5) px(ctx, x, ly + 2, 1, 3, '#a88848'); px(ctx, 56, ly - 1, 4, 2, '#5aa84a');
    if (!calm) flames(ctx, 24, 92, 46, t);
    for (let j = 0; j < 10; j++) { const o = Math.round(j * j / 9); px(ctx, 18 + o, 80 + j, 58 - 2 * o, 1, '#2e2e38'); } px(ctx, 18, 80, 58, 1, '#5a5a6a');
    if (!calm) petAt(ctx, st, t, 29, 30);
    px(ctx, 24, 62, 46, 18, '#d8b878'); for (const y of [62, 70, 78]) px(ctx, 24, y, 46, 2, '#a88848'); for (let x = 27; x < 70; x += 6) px(ctx, x, 64, 1, 6, '#c0a060');
    steam(ctx, 24, 62, 46, t, calm ? 3 : 9, calm); if (!calm) { steam(ctx, 18, 70, 6, t + 0.3, 2); steam(ctx, 70, 70, 6, t + 0.6, 2); }
    if (!calm) { const [ax, ay] = racWithPaw(ctx, st, t, 'crank'); pline(ctx, 74, 14, ax, ay, '#a7824c'); winch(ctx, ax, ay, t); }
    else pline(ctx, 74, 14, 76, 60, '#a7824c');
  },
  capybara(ctx, st, t, calm) { // v0.4.3: a relaxing hot spring that is quietly becoming hot pot
    // wall thermometer creeping into the red
    const lvl = calm ? 0.2 : 0.72 + Math.sin(t * 1.3) * 0.12;
    px(ctx, 15, 28, 5, 34, '#e8e4ec'); px(ctx, 16, 29, 3, 32, '#3a3442'); px(ctx, 16, 29 + 32 * (1 - lvl), 3, 32 * lvl, lvl > 0.6 ? '#ff4a3a' : '#5ab0e0'); px(ctx, 14, 61, 7, 5, lvl > 0.6 ? '#ff4a3a' : '#5ab0e0');
    for (let y = 31; y < 60; y += 4) px(ctx, 20, y, 1, 1, '#8a8f9c'); px(ctx, 15, 28, 5, 3, '#ff9a8a');
    if (!calm) flames(ctx, 26, 92, 46, t); else { px(ctx, 28, 89, 40, 3, '#3a2a22'); px(ctx, 34, 88, 10, 2, '#5a4a3a'); }
    // the little sign: a hot-spring mark, with a sneaky "+ soup" plank nailed under it
    px(ctx, 54, 20, 16, 12, '#8a5a36'); px(ctx, 55, 21, 14, 10, '#c89a68'); px(ctx, 58, 27, 8, 2, '#d8405e'); for (const x of [60, 63, 66]) px(ctx, x - 1, 23 + (x % 2), 1, 3, '#d8405e');
    if (!calm) { px(ctx, 55, 33, 14, 4, '#a8703e'); px(ctx, 57, 34, 10, 1, '#4a2a18'); px(ctx, 56, 35, 1, 1, '#2e2018'); px(ctx, 67, 35, 1, 1, '#2e2018'); }
    if (!calm) petAt(ctx, st, t, 30, 32 + (Math.sin(t * 1.2) > 0 ? 0 : 1));
    // wooden bath tub with hoops; the water has 'ingredients' in it
    px(ctx, 24, 64, 48, 2, '#8a5a36'); px(ctx, 25, 66, 46, 3, calm ? '#6aa8b8' : '#c8884a');
    if (!calm) { bubbles(ctx, 27, 67, 42, t, '#ffd8a0', 8);
      for (const [vx, c] of [[30, '#ff8a2a'], [44, '#7ac84a'], [58, '#ff8a2a'], [52, '#f4f0e0']]) px(ctx, vx + Math.round(Math.sin(t * 2 + vx) * 1.5), 66 + (Math.sin(t * 3 + vx) > 0 ? 0 : 1), 3, 2, c); }
    else { px(ctx, 48, 66, 4, 3, '#ffb52e'); px(ctx, 49, 65, 2, 1, '#5aa84a'); } // just a yuzu floating, the way it should be
    for (let x = 24; x < 72; x += 4) px(ctx, x, 69, 4, 20, (x / 4) % 2 ? '#a8703e' : '#94602f');
    px(ctx, 24, 69, 48, 1, '#6a4020'); for (const y of [73, 83]) { px(ctx, 23, y, 50, 2, '#5d6170'); px(ctx, 23, y, 50, 1, '#8a8f9c'); }
    px(ctx, 26, 89, 3, 3, '#4a3020'); px(ctx, 67, 89, 3, 3, '#4a3020');
    steam(ctx, 26, 64, 44, t, calm ? 3 : 8, calm);
    if (!calm) { const [ax, ay] = racWithPaw(ctx, st, t, 'stir'); pline(ctx, ax, ay, 66, 64, '#c8a070'); px(ctx, 63, 66, 5, 2, '#a8703e'); px(ctx, ax - 1, ay - 1, 3, 3, '#1f1a28'); }
  },
};
export const PERIL_SPECIES = Object.keys(PERIL);
const PERIL_LAMP = { bunny: 66, hamster: 68, kitten: 70, hedgehog: 62, panda: 62, capybara: 38 }; // keep the lamp clear of the ropes
function drawPeril(ctx, st, t) {
  room(ctx, t, false, PERIL_LAMP[st.species] || LAMP0);
  (PERIL[st.species] || PERIL.bunny)(ctx, st, t, false);
}

export function drawScene(ctx, st, t) { // st.look (optional) = whose villain outfit to draw, e.g. a friend's
  const prev = LOOK; if (st && 'look' in st) LOOK = st.look || {};
  try { drawScene0(ctx, st, t); } finally { LOOK = prev; }
}
function drawScene0(ctx, st, t) {
  ctx.save(); ctx.translate(-VIEW_X, -VIEW_Y);
  if (st.paused) { drawPaused(ctx, st, t); ctx.restore(); return; }
  if (st.freed) { drawFreed(ctx, st, t); ctx.restore(); return; }
  if (st.final) { drawPeril(ctx, st, t); ctx.restore(); return; }
  const mood = st.mood;
  room(ctx, t, false);
  const b = critter(st.species || 'bunny', mood, t, st.injuries);
  const pr = reactAmt(st, 'pet', t);
  const hop = (mood === 'happy' ? Math.abs(Math.sin(t * 4)) * 6 : Math.abs(Math.sin(t * 2)) * 1.5) + pr * 7;
  const shake = (mood === 'scared' ? (Math.sin(t * 18) > 0.6 ? 1 : 0) : 0) + (pr ? (Math.sin(t * 30) > 0 ? 1 : -1) : 0);
  blit(ctx, b, PET_X + shake, 54 - hop);
  cage(ctx, CAGE_X, 46, 56, 47);
  // behind on steps: smug, rubbing his paws and leaning at the cage. Otherwise he just loiters.
  drawRaccoon(ctx, st, t, mood === 'worried' || mood === 'scared' ? 'smug' : 'idle');
  ctx.restore();
}

// v0.5.0 Raccoon Pause: the day is bought off. He counts the Spare Steps into his sack; the cage is shut for the day.
function drawPaused(ctx, st, t) {
  room(ctx, t, false);
  const b = critter(st.species || 'bunny', 'happy', t, st.injuries);
  blit(ctx, b, PET_X, 54 - Math.abs(Math.sin(t * 1.5)) * 1.5);
  cage(ctx, CAGE_X, 46, 56, 47);
  // a little sign on the cage
  px(ctx, CAGE_X + 13, 40, 30, 11, '#5e3a20'); px(ctx, CAGE_X + 14, 41, 28, 9, '#e8d6a8'); pline(ctx, CAGE_X + 18, 40, CAGE_X + 28, 34, '#4e2e1a'); pline(ctx, CAGE_X + 38, 40, CAGE_X + 28, 34, '#4e2e1a');
  pxText(ctx, 'PAUSED', CAGE_X + 17, 43, '#8a2a2a', 1, null);
  if (Math.floor(t * 1.2) % 2) pxText(ctx, 'Z', PET_X + 34, 50 - (t * 6) % 6, '#cfe9fb', 1);
  drawRaccoon(ctx, st, t, 'glee');
  // his money sack, by his paw, getting fed coins
  const sx = RAC_X - 6, sy = RAC_Y + 30;
  px(ctx, sx - 1, sy, 12, 12, '#8a6a3a'); px(ctx, sx, sy - 1, 10, 13, '#a7824c'); px(ctx, sx + 2, sy - 3, 6, 3, '#7a5a2a'); px(ctx, sx + 3, sy - 4, 4, 1, '#c4405e');
  px(ctx, sx + 3, sy + 4, 1, 5, '#ffe27a'); px(ctx, sx + 2, sy + 4, 3, 1, '#ffe27a'); px(ctx, sx + 2, sy + 6, 3, 1, '#ffe27a'); px(ctx, sx + 2, sy + 8, 3, 1, '#ffe27a'); // $-ish
  for (let i = 0; i < 3; i++) { // coins hop from the cage into the sack
    const p = (t * 0.9 + i / 3) % 1, x0 = CAGE_X + 50, x1 = sx + 5, x = x0 + (x1 - x0) * p, y = 60 - Math.sin(p * Math.PI) * 18 + p * (sy - 64);
    px(ctx, x - 1, y - 1, 3, 3, '#ffe27a'); px(ctx, x, y, 1, 1, '#c99a2e');
  }
}

// Death animation (DEATH_LEN seconds): caged and nervous -> cartoon death -> little ghost floats up.
export const DEATH_LEN = 8; // v0.4.9: + the raccoon's plunger, + revival / re-kidnap phase
export function drawDeath(ctx, d, t) {
  const prev = LOOK; if (d && 'look' in d) LOOK = d.look || {};
  try { drawDeath0(ctx, d, t); } finally { LOOK = prev; }
}
function drawDeath0(ctx, d, t) {
  ctx.save(); ctx.translate(-VIEW_X, -VIEW_Y);
  room(ctx, t, t > 3.2);
  const sp = d.species, inj = d.injuries || [], X = PET_X, Y = 54;
  const A = 1.0, B = 3.4, C = 5.4; // phase boundaries: walk-in, execution, ghost, revival/re-kidnap
  if (t < A) { // nervous in the cage, raccoon walks up
    blit(ctx, critter(sp, 'scared', t, inj), X + (Math.sin(t * 30) > 0 ? 1 : 0), Y);
    cage(ctx, CAGE_X, 46, 56, 47);
    blit(ctx, raccoonBody(t, 'walk'), Math.round(RAC_X + 34 * (1 - t / A)), RAC_Y); // strolls in
  } else if (t < B) {
    const u = t - A;
    cage(ctx, CAGE_X, 46, 56, 47, 1);
    blit(ctx, raccoonBody(t, u < 0.4 ? 'smug' : 'glee'), RAC_X, RAC_Y);
    { // he does it himself: a big red plunger box, wired to the cage, pushed down with gusto
      const bx = RAC_X - 9, by = RAC_Y + 38, down = u > 0.25 ? 3 : Math.round(u / 0.25 * 1);
      pline(ctx, bx, by + 4, X + 30, 88, '#2a2230'); px(ctx, bx - 4, by, 9, 7, '#8a2a2a'); px(ctx, bx - 4, by, 9, 1, '#c04040');
      px(ctx, bx, by - 6 + down, 1, 6 - down, '#8a8f9c'); px(ctx, bx - 3, by - 7 + down, 7, 2, '#c5cad6');
      if (u > 0.25 && u < 0.5) pxText(ctx, 'K', bx - 8, by - 12, '#ffe27a', 1);
    }
    if (d.type === 'anvil') {
      const drop = Math.min(1, u / 0.45), ay = -20 + drop * drop * (Y + 24 - 18 - -20);
      if (drop < 1) { blit(ctx, critter(sp, 'scared', t, inj), X, Y); anvil(ctx, X + 3, ay); }
      else { const sq = 0.22 + Math.max(0, 0.08 - (u - 0.45) * 0.2) * Math.sin(u * 30);
        blitScaled(ctx, critter(sp, 'dead', t, inj), X, Y, 1.25, sq); anvil(ctx, X + 3, Y + 38 - 38 * sq - 14); stars(ctx, X + 18, Y + 18, u, 16);
        if (u < 1.4) pxText(ctx, 'BONK!', X + 2, Y - 10, '#ffe27a', 2); }
    } else if (d.type === 'pop') {
      const [head, body] = split(critter(sp, u < 0.35 ? 'scared' : 'dead', t, inj), 29);
      if (u < 0.35) { blit(ctx, critter(sp, 'scared', t, inj), X + (Math.sin(u * 60) > 0 ? 1 : -1), Y - u * 3); }
      else { const v = u - 0.35, air = Math.min(v, 1.1);
        blit(ctx, body, X, Y);
        const hx = X - air * 30, hy = Y - 34 * air + 38 * air * air; // arc up and over to the left, bounce
        blit(ctx, head, hx, Math.min(hy, Y + 8), { flipY: v > 0.55 });
        for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.3, r = v * 26; px(ctx, X + 18 + Math.cos(a) * r, Y + 26 - Math.sin(a) * r + v * v * 20, 2, 2, i % 2 ? '#ff8fb8' : '#ffe27a'); }
        if (v < 1.2) pxText(ctx, 'POP!', X + 22, Y - 12, '#ff8fb8', 2);
        if (v > 1.1) stars(ctx, hx + 18, Y + 18, v, 10); }
    } else if (d.type === 'catapult') {
      const fire = 0.6, arm = u < fire ? 0 : Math.min(1, (u - fire) / 0.15);
      const pxv = X + 4, pyv = 88; // pivot
      px(ctx, X - 4, 88, 44, 4, '#7a4a2a'); px(ctx, X - 2, 92, 4, 2, '#4e2e1a'); px(ctx, X + 34, 92, 4, 2, '#4e2e1a'); px(ctx, pxv + 10, 76, 4, 12, '#5e3a20');
      const ang = -0.15 - arm * 1.2; ctx.save(); ctx.fillStyle = '#9a6a3a';
      for (let i = 0; i < 34; i++) ctx.fillRect(Math.round(pxv + 12 + Math.cos(ang) * (i - 8)), Math.round(pyv - 10 + Math.sin(ang) * (i - 8)), 2, 2); ctx.restore();
      if (u < fire) blit(ctx, critter(sp, 'scared', t, inj), X + 8 + (Math.sin(u * 50) > 0 ? 1 : 0), Y - 4);
      else { const v = u - fire; const fx = X + 8 + v * 70, fy = Y - 4 - v * 90 + v * v * 10;
        if (fy > -40) blit(ctx, critter(sp, 'dead', t, inj), fx, fy, { flipX: Math.floor(v * 10) % 2 === 1, flipY: Math.floor(v * 10) % 4 >= 2 });
        if (v < 1) pxText(ctx, 'WHEE', X - 6, Y - 14, '#ffe27a', 2);
        if (v > 1.2) { const tw = Math.sin(v * 20) > 0; px(ctx, 118, 22, 1, tw ? 5 : 3, '#fff'); px(ctx, 116 + (tw ? 0 : 1), 24, tw ? 5 : 3, 1, '#fff'); } }
    } else { // zap
      const strike = 0.7;
      px(ctx, X + 2, 22 + Math.sin(u * 3) * 1, 34, 8, '#5a5670'); px(ctx, X - 2, 26, 42, 6, '#4a4660'); px(ctx, X + 8, 19, 18, 4, '#5a5670');
      if (u < strike) blit(ctx, critter(sp, 'scared', t, inj), X + (Math.sin(u * 40) > 0 ? 1 : 0), Y);
      else {
        const v = u - strike;
        if (v < 0.35) { ctx.save(); ctx.globalAlpha = 0.5 * (1 - v / 0.35); px(ctx, 0, 0, SCENE_W, SCENE_H, '#ffffff'); ctx.restore();
          let x = X + 18, y = 32; ctx.fillStyle = '#ffe27a'; for (let i = 0; i < 6; i++) { const nx = x + (i % 2 ? 5 : -5), ny = y + 5; for (let k = 0; k < 5; k++) ctx.fillRect(Math.round(x + (nx - x) * k / 5), Math.round(y + k), 3, 1); x = nx; y = ny; } }
        blit(ctx, critter(sp, 'char', t, inj), X, Y);
        puff(ctx, X + 18, Y + 4, (v % 1.2) / 1.2, 5, '#6a6474');
        if (v < 1.5) pxText(ctx, 'ZAP!', X + 2, Y - 14, '#ffe27a', 2);
      }
    }
  } else if (t < C || !d.re) { // ghost floats up; little tombstone
    const u = t - B;
    tomb(ctx, X + 24, 74);
    blit(ctx, raccoonBody(t, 'glee'), RAC_X, RAC_Y);
    const gy = Y - u * 14;
    blit(ctx, critter(sp, 'ghost', t), X + 14, gy + Math.sin(t * 2) * 2, { alpha: Math.max(0.15, 1 - u * 0.25) });
    pxText(ctx, 'RIP', 19, 58, '#cfe9fb', 2);
  } else { // revival: stitched back together (same pet) or the next one dragged into the cage
    const u = t - C, re = d.re;
    if (re.same) {
      const g = critter(sp, u < 1.4 ? 'dead' : 'worried', t, re.injuries || inj);
      blit(ctx, g, X, Y);
      if (u < 1.4) { // ghost sinks back in, needle zigzags along the neck
        blit(ctx, critter(sp, 'ghost', t), X, Y - 14 + u * 10, { alpha: Math.max(0, 0.7 - u * 0.5) });
        const nx = X + 11 + (u / 1.4) * 14, ny = Y + 27 + (Math.floor(u * 12) % 2 ? -2 : 2);
        pline(ctx, X + 11, Y + 27, nx, ny, '#c4405e'); px(ctx, nx, ny - 3, 1, 4, '#d8dce6'); px(ctx, nx, ny - 4, 1, 1, '#ffffff');
      } else if (u < 2) stars(ctx, X + 18, Y + 6, u, 9);
      cage(ctx, CAGE_X, 46, 56, 47);
      blit(ctx, raccoonBody(t, 'smug'), RAC_X, RAC_Y);
    } else {
      const k = Math.min(1, u / 1.2), rx = Math.round(RAC_X + 30 * (1 - k)); // he hauls the next one in from the right
      if (k < 1) { blit(ctx, critter(re.species, 'scared', t, re.injuries || []), Math.round(lerp(RAC_X + 14, X, k)), Y); cage(ctx, CAGE_X, 46, 56, 47, 1); blit(ctx, raccoonBody(t, 'walk'), rx, RAC_Y); }
      else { blit(ctx, critter(re.species, 'worried', t, re.injuries || []), X, Y); cage(ctx, CAGE_X, 46, 56, 47); blit(ctx, raccoonBody(t, 'smug'), RAC_X, RAC_Y); }
    }
  }
  ctx.restore();
}

// A pet sitting on the shelf (or a locked silhouette). 36x38 sprite on a 40x42 canvas.
export function drawShelfPet(ctx, p, t) {
  ctx.clearRect(0, 0, 40, 42);
  const g = p.locked ? silhouette(p.species, 0) : critter(p.species, 'happy', t, p.injuries);
  const hop = p.locked ? 0 : Math.abs(Math.sin(t * 3 + (p.rung || 0))) * 2;
  blit(ctx, g, 2, 3 - hop + 1);
}

// Drawing helpers for extra sprite sets (tools/).
export const _draw = { grid, set, get, ell, rect, outline, ear, tri, line, pointyEar };

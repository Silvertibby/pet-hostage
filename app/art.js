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
};
export const SPECIES_ORDER = ['bunny', 'hamster', 'squirrel', 'hedgehog', 'kitten', 'duckling', 'piglet', 'panda'];

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
  if (ghost) ep = EYES.ghost; else if (dead) ep = EYES.x; else if (blink) ep = EYES.blink; else if (mood === 'happy' && Math.sin(t * 1.3) > 0.85) ep = EYES.squint;
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
const FONT = { A: '010101111101101', B: '110101110101110', E: '111100110100111', H: '101101111101101', I: '111010010010111', K: '101101110101101', N: '110101101101101', O: '111101101101111', P: '110101110100100', R: '110101110101101', W: '101101101111101', Z: '111001010100111', '!': '010010010000010', ' ': '000000000000000' };
export function pxText(ctx, str, x, y, c, s = 1, shadow = '#000') {
  const draw = (ox, oy, col) => { ctx.fillStyle = col; let cx = ox; for (const ch of str) { const f = FONT[ch] || FONT[' ']; for (let i = 0; i < 15; i++) if (f[i] === '1') ctx.fillRect(cx + (i % 3) * s, oy + Math.floor(i / 3) * s, s, s); cx += 4 * s; } };
  if (shadow) draw(Math.round(x) + s, Math.round(y) + s, shadow); draw(Math.round(x), Math.round(y), c);
}
export const textW = (str, s = 1) => str.length * 4 * s - s;

// ---- the scene (128 x 112 logical pixels) ----
export const SCENE_W = 128, SCENE_H = 112;
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
  const sw = Math.sin(t * 1.4) * 3;
  for (let y = 0; y < 20; y++) px(ctx, 64 + sw * (y / 20), y, 1, 1, '#111');
  ctx.save(); ctx.globalAlpha = dark ? 0.05 : 0.09; ctx.fillStyle = '#ffe9a0';
  ctx.beginPath(); ctx.moveTo(64 + sw, 22); ctx.lineTo(18 + sw * 3, 112); ctx.lineTo(110 + sw * 3, 112); ctx.closePath(); ctx.fill(); ctx.restore();
  if (!dark) for (let i = 0; i < 9; i++) { // dust motes drifting in the lamp light
    const f = ((t * (0.03 + i * 0.004) + i * 0.137) % 1), y = 30 + f * 70, x = 64 + sw * 2 + Math.sin(t * 0.7 + i * 2.1) * (6 + f * 30);
    ctx.save(); ctx.globalAlpha = 0.35 * Math.sin(Math.PI * f); px(ctx, x, y, 1, 1, '#fff3c4'); ctx.restore(); }
  px(ctx, 62 + sw, 20, 5, 4, dark ? '#776a3a' : '#ffe27a'); px(ctx, 63 + sw, 24, 3, 1, dark ? '#776a3a' : '#ffd84a'); px(ctx, 63 + sw, 19, 3, 1, '#666');
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
const POST_X = 88, ANCHOR = { x: 89, y: 89 }, WALK_MIN = 6, WALK_MAX = 58, WALK_SPEED = 13; // px/s
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
function post(ctx) {
  px(ctx, POST_X - 1, 58, 6, 36, '#5e3a20'); px(ctx, POST_X - 1, 58, 2, 36, '#7a4a2a'); px(ctx, POST_X - 2, 56, 8, 3, '#4e2e1a');
  px(ctx, ANCHOR.x - 2, ANCHOR.y - 2, 5, 5, '#8a8f9c'); px(ctx, ANCHOR.x - 1, ANCHOR.y - 1, 3, 3, '#3a3040'); // ring
}
const reactAmt = (st, who, t) => { const r = st.react; if (!r || r.who !== who) return 0; const u = (t - r.at) / 0.7; return u >= 0 && u < 1 ? Math.sin(Math.PI * u) : 0; };
// Tap targets in view pixels (the visible 100x88 window), padded for thumbs.
export function hitBoxes(st, t) {
  const pad = 5, box = (x, y, w, h) => ({ x: x - VIEW_X - pad, y: y - VIEW_Y - pad, w: w + 2 * pad, h: h + 2 * pad });
  if (st.mode === 'death') return { pet: box(30, 6, 60, 90), raccoon: box(90, 38, 30, 30) };
  if (st.freed) { const w = walker(t); return { pet: box(w.x + 2, 46, 32, 46), raccoon: box(92, 38, 30, 30) }; }
  return { pet: box(46, 46, 36, 46), raccoon: box(92, 38, 30, 30) };
}
function drawFreed(ctx, st, t) {
  room(ctx, t, false);
  cage(ctx, 36, 46, 56, 47, 1); // empty, door off
  post(ctx);
  const r = raccoon(t, -1, true);
  const rr = reactAmt(st, 'raccoon', t);
  blit(ctx, r, 92 + Math.round(Math.sin(t * 0.5)) + (rr ? (Math.sin(t * 40) > 0 ? 1 : -1) : 0), 40 - rr * 3);
  if (Math.sin(t * 1.7) > 0.6 || rr) { px(ctx, 95, 39, 2, 1, '#ff5a5a'); px(ctx, 94, 40, 1, 2, '#ff5a5a'); px(ctx, 97, 40, 1, 2, '#ff5a5a'); px(ctx, 95, 42, 2, 1, '#ff5a5a'); } // anger mark
  const w = walker(t);
  let y = 55, sx = 1, sy = 1, phase;
  if (w.walking) { phase = t * 9; y -= Math.abs(Math.sin(phase)) * 1.5; }
  else if (w.trick === 'hop') { y -= Math.sin(Math.PI * Math.min(1, w.p * 1.4)) * 10; }
  else { const k = Math.sin(Math.PI * w.p); sx = 1 - 0.08 * k; sy = 1 + 0.12 * k; }
  const mood = w.walking || w.trick === 'hop' ? 'happy' : 'happy';
  const g = critter(st.species || 'bunny', mood, w.trick === 'stretch' ? 2.5 : t, st.injuries, phase != null ? { walk: phase } : {});
  const pr = reactAmt(st, 'pet', t); y -= pr * 9;
  const ax = w.x + 13 + (w.dir < 0 ? 10 : 0), ay = y + 36; // ankle (left or right foot depending on facing)
  chain(ctx, ANCHOR.x, ANCHOR.y, ax, Math.min(ay, 92), 104);
  if (sx !== 1 || sy !== 1) blitScaled(ctx, g, w.x, y, sx, sy, { flipX: w.dir < 0 }); else blit(ctx, g, w.x, y, { flipX: w.dir < 0 });
  px(ctx, ax - 2, Math.min(ay, 92) - 1, 5, 2, '#8a8f9c'); // ankle cuff
}

export function drawScene(ctx, st, t) {
  ctx.save(); ctx.translate(-VIEW_X, -VIEW_Y);
  if (st.freed) { drawFreed(ctx, st, t); ctx.restore(); return; }
  const mood = st.mood;
  room(ctx, t, false);
  const b = critter(st.species || 'bunny', mood, t, st.injuries);
  const pr = reactAmt(st, 'pet', t), rr = reactAmt(st, 'raccoon', t);
  const hop = (mood === 'happy' ? Math.abs(Math.sin(t * 4)) * 6 : Math.abs(Math.sin(t * 2)) * 1.5) + pr * 7;
  const shake = (mood === 'scared' ? (Math.sin(t * 18) > 0.6 ? 1 : 0) : 0) + (pr ? (Math.sin(t * 30) > 0 ? 1 : -1) : 0);
  blit(ctx, b, 46 + shake, 54 - hop);
  cage(ctx, 36, 46, 56, 47);
  const r = raccoon(t, rr ? -1 : 0);
  blit(ctx, r, 92 + Math.round(Math.sin(t * 0.7) * 2) - Math.round(rr * 3), 40 + Math.round(Math.sin(t * 2.1)) - Math.round(rr * 2));
  ctx.restore();
}

// Death animation (DEATH_LEN seconds): caged and nervous -> cartoon death -> little ghost floats up.
export const DEATH_LEN = 5.2;
export function drawDeath(ctx, d, t) {
  ctx.save(); ctx.translate(-VIEW_X, -VIEW_Y);
  room(ctx, t, t > 3.2);
  const sp = d.species, inj = d.injuries || [], X = 46, Y = 54;
  const A = 1.0, B = 3.4; // phase boundaries
  if (t < A) { // nervous in the cage, raccoon walks up
    blit(ctx, critter(sp, 'scared', t, inj), X + (Math.sin(t * 30) > 0 ? 1 : 0), Y);
    cage(ctx, 36, 46, 56, 47);
    blit(ctx, raccoon(t, -1), 104 - t * 10, 40);
  } else if (t < B) {
    const u = t - A;
    cage(ctx, 36, 46, 56, 47, 1);
    blit(ctx, raccoon(t, -1), 94, 40);
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
  } else { // ghost floats up; little tombstone
    const u = t - B;
    tomb(ctx, 88, 74);
    const gy = Y - u * 14;
    blit(ctx, critter(sp, 'ghost', t), X, gy + Math.sin(t * 2) * 2, { alpha: Math.max(0.15, 1 - u * 0.25) });
    pxText(ctx, 'RIP', 19, 58, '#cfe9fb', 2);
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

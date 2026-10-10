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
// One shared cute body (big round head, big shiny eyes, round body, blush, little mischievous grin),
// with per-species ears, tails, faces and palettes. Chompsky the bunny is the original v0.1 sprite.
const FIX = { t: '#ffffff', b: '#3a2340', B: '#6b4a8a', s: '#8fd8ff', y: '#ffe27a', o: '#ff9a2a',
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
const inHead = (x, y) => { const dx = (x + 0.5 - 18) / 11.6, dy = (y + 0.5 - 20.5) / 9.4; return dx * dx + dy * dy <= 1; };
const pointyEar = (g, x, baseY, h, half, lean, col, inner, tip) => {
  tri(g, x - half, baseY, x + half, baseY, x + lean, baseY - h, col);
  if (inner) tri(g, x - half + 1.6, baseY - 0.5, x + half - 1.6, baseY - 0.5, x + lean * 0.8, baseY - h + 2.6, inner);
  if (tip) { set(g, x + lean, baseY - h - 1, tip); set(g, x + lean - 1, baseY - h, tip); set(g, x + lean + 1, baseY - h - 1.5, tip); }
};

export const SPECIES = {
  bunny: { label: 'bunny', pal: { k: '#5a3f66', w: '#fffaf4', g: '#f3e3ea', G: '#e2cbd8', p: '#ffc1d8', P: '#ff8fb8', r: '#ff7a96', R: '#c44a6a' },
    ears(g, t, m, droop) {
      ear(g, 13, 12, droop ? 8 : 10, droop ? -1.1 : -0.25 + Math.sin(t * 2.2) * 0.05, 'w', 'p', 'g');
      ear(g, 23, 12, droop ? 8 : 10, droop ? 1.1 : m === 'worried' ? 0.9 : 0.3 + Math.sin(t * 2.2 + 1) * 0.06, 'w', 'p', 'g');
    },
    tail(g) { ell(g, 25.5, 32.5, 2, 2, 'w'); }, mouth: 'buck' },
  hamster: { label: 'hamster', pal: { k: '#7a4a3a', w: '#ffd49a', g: '#f3bd7c', G: '#e2a564', p: '#ffb3c6', P: '#ff8fa8', r: '#ff8a9a', R: '#c4506a', c: '#fff4e2' },
    ears(g, t, m, droop) { const dy = droop ? 2 : 0; ell(g, 9.5, 12.5 + dy, 3.4, 3.2, 'w', { shade: 'g', sd: 0.8 }); ell(g, 26.5, 12.5 + dy, 3.4, 3.2, 'w', { shade: 'g', sd: 0.8 }); ell(g, 9.5, 12.8 + dy, 1.8, 1.7, 'p'); ell(g, 26.5, 12.8 + dy, 1.8, 1.7, 'p'); },
    head(g) { ell(g, 9, 24.5, 4.6, 3.8, 'c'); ell(g, 27, 24.5, 4.6, 3.8, 'c'); ell(g, 18, 26, 4.2, 2.6, 'c'); for (let y = 12; y < 18; y++) set(g, 18, y, 'G'); set(g, 17, 12, 'G'); set(g, 19, 12, 'G'); },
    belly: 'c', mouth: 'buck' },
  squirrel: { label: 'squirrel', pal: { k: '#6a3a2a', w: '#eea066', g: '#d9874e', G: '#bf6c3c', p: '#ffc1a8', P: '#7a3a2a', r: '#ff8a7a', R: '#b84a4a', c: '#fff0dc' },
    back(g, t) { const sw = Math.sin(t * 2.4) * 0.6; ell(g, 29 + sw, 25, 5.4, 9.5, 'w', { shade: 'g', sd: 1.2 }); ell(g, 27.5 + sw, 15.5, 4.6, 3.8, 'w', { shade: 'g', sd: 1 }); ell(g, 29.5 + sw, 26, 2.2, 6, 'G'); },
    ears(g, t, m, droop) { const l = droop ? -2 : 0; pointyEar(g, 10, 14, 8, 3.4, -1 + l, 'w', 'p', 'G'); pointyEar(g, 26, 14, 8, 3.4, 1 - l, 'w', 'p', 'G'); },
    head(g) { ell(g, 18, 26, 5, 3, 'c'); ell(g, 18, 15.5, 2.6, 1.6, 'G'); },
    belly: 'c', mouth: 'buck' },
  hedgehog: { label: 'hedgehog', pal: { k: '#4e3428', w: '#f8e6cc', g: '#ecd2b0', G: '#d9b98e', p: '#ffb7c4', P: '#3e2a22', r: '#ff8a9a', R: '#b84a5a', e: '#a8784e', E: '#80563a', c: '#fff6e8' },
    back(g, t) {
      ell(g, 18, 20, 12.6, 10.4, 'e', { shade: 'E', sd: 1.6 });
      for (let i = 0; i <= 12; i++) { const a = Math.PI * (0.92 + i * 1.16 / 12), w = 0.16; const R = 12, L = 16.8 + Math.sin(t * 3 + i) * 0.4;
        tri(g, 18 + Math.cos(a - w) * R, 20 + Math.sin(a - w) * R * 0.85, 18 + Math.cos(a + w) * R, 20 + Math.sin(a + w) * R * 0.85, 18 + Math.cos(a) * L, 20 + Math.sin(a) * L * 0.85, i % 2 ? 'e' : 'E'); }
      ell(g, 18, 31, 8.6, 6.4, 'e', { shade: 'E', sd: 1.4 });
    },
    ears(g) { ell(g, 9, 13, 2.4, 2.2, 'w'); ell(g, 27, 13, 2.4, 2.2, 'w'); ell(g, 9, 13.3, 1.2, 1.1, 'p'); ell(g, 27, 13.3, 1.2, 1.1, 'p'); },
    head(g) { for (let y = 10; y < 17; y++) for (let x = 6; x < 31; x++) if (inHead(x, y) && y < 13.2 + Math.abs(x + 0.5 - 18) * 0.38 && !(Math.abs(x + 0.5 - 18) < 2.2 && y > 14)) set(g, x, y, (x + y) % 3 ? 'e' : 'E'); },
    body: 'c', mouth: 'fang' },
  kitten: { label: 'kitten', pal: { k: '#4e4462', w: '#d9d5e4', g: '#c2bdd2', G: '#a7a0bc', p: '#ffb7cf', P: '#ff8fb0', r: '#ff8aa6', R: '#c44a6a', d: '#8d85a8', c: '#fbf9ff' },
    back(g, t) { const sw = Math.sin(t * 2) * 1.5; for (let i = 0; i < 9; i++) ell(g, 26 + i * 0.7 + Math.sin(i * 0.5) * 0.8, 33 - i * 1.6, 1.6, 1.6, i > 6 ? 'd' : 'w'); set(g, 31 + sw, 18, 'd'); },
    ears(g, t, m, droop) { const l = droop ? -2.4 : 0; pointyEar(g, 10.5, 15, 9, 4.6, -2 + l, 'w', 'p'); pointyEar(g, 25.5, 15, 9, 4.6, 2 - l, 'w', 'p'); },
    head(g) { ell(g, 18, 26, 5.6, 3.2, 'c'); for (const x of [16, 18, 20]) { set(g, x, 12, 'd'); set(g, x, 13, 'd'); } set(g, 18, 14, 'd');
      for (const [x, y] of [[7, 19], [8, 19], [7, 21], [8, 21], [28, 19], [29, 19], [28, 21], [29, 21]]) set(g, x, y, 'd'); },
    feet: 'c', mouth: 'cat' },
  duckling: { label: 'duckling', pal: { k: '#86621e', w: '#ffe46e', g: '#f7cf4a', G: '#e8b632', p: '#ffb38a', P: '#ff9a2a', r: '#ff8a6a', R: '#c4502a', n: '#ffa236', N: '#d9701c' },
    ears(g, t) { const w = Math.sin(t * 3) * 0.6; ell(g, 17 + w, 9.6, 1.6, 2.4, 'w'); ell(g, 19.4 + w, 10, 1.4, 2, 'w'); ell(g, 15.2 + w, 10.6, 1.2, 1.6, 'w'); },
    feet: 'n', mouth: 'beak' },
  piglet: { label: 'piglet', pal: { k: '#8a4a62', w: '#ffcadb', g: '#f7b1c7', G: '#eb98b2', p: '#ff9fbd', P: '#e07898', r: '#ff7a96', R: '#b8405e', n: '#ffadc6', N: '#d86a8e' },
    tail(g, t) { const o = Math.sin(t * 6) > 0 ? 0 : 1; for (const [x, y] of [[26, 31], [27, 30], [28, 30 + o], [28, 31], [27, 32]]) set(g, x, y, 'P'); },
    ears(g, t, m, droop) { const f = droop ? 2 : Math.sin(t * 2.2) * 0.5; tri(g, 7, 15, 13, 11, 6 - f, 7 + f, 'w'); tri(g, 29, 15, 23, 11, 30 + f, 7 + f, 'w'); tri(g, 8, 13.5, 11.5, 11.5, 7.4 - f, 9 + f, 'p'); tri(g, 28, 13.5, 24.5, 11.5, 28.6 + f, 9 + f, 'p'); },
    mouth: 'snout' },
  panda: { label: 'panda cub', pal: { k: '#2a2632', w: '#fbfbf6', g: '#e8e8ef', G: '#d2d2dc', p: '#ffc1d8', P: '#2e2a36', r: '#ff7a96', R: '#b8405e', d: '#33303d', b: '#140f1a', B: '#3d2f52' },
    ears(g, t, m, droop) { const dy = droop ? 2 : 0; ell(g, 8.5, 12.5 + dy, 3.6, 3.4, 'd'); ell(g, 27.5, 12.5 + dy, 3.6, 3.4, 'd'); },
    face(g, E) { for (const ex of [E.lx, E.rx]) { const s = ex < 18 ? -1 : 1; for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) { const rx = (x + 0.5 + s * 0.3 * (y + 0.5)) / 3.7, ry = (y + 0.5) / 4.4; if (rx * rx + ry * ry <= 1) set(g, ex + x, E.eyesY + 0.6 + y, 'd'); } } },
    arms: 'd', feet: 'd', mouth: 'fang' },
};
export const SPECIES_ORDER = ['bunny', 'hamster', 'squirrel', 'hedgehog', 'kitten', 'duckling', 'piglet', 'panda'];

function ghostPal(pal) {
  const mix = (h, w) => { const n = parseInt(h.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, t = [208, 236, 255];
    return '#' + [r, g, b].map((v, i) => Math.round(v * (1 - w) + t[i] * w).toString(16).padStart(2, '0')).join(''); };
  const o = {}; for (const k in pal) o[k] = mix(pal[k], k === 'b' || k === 'k' ? 0.45 : 0.62); return o;
}
const CHAR = { k: '#120e14', w: '#3a3440', g: '#2e2934', G: '#25212a', p: '#4a4250', P: '#18141c', c: '#433c4a', e: '#2a2530', E: '#1e1a22', d: '#1c1820', n: '#3a3036', N: '#2a2228', r: '#ff8a9a', R: '#6a2a3a' };

// Patch-ups after each death. k = how many times this pet already got this kind of death.
const MARKS = {
  pop: [ // head came off: stitched neck, then more scars
    (g, E) => { for (let x = 13; x <= 23; x++) set(g, x, 29, 'X'); for (let x = 13; x <= 23; x += 2) { set(g, x, 28, 'x'); set(g, x, 30, 'x'); } },
    (g) => { for (let y = 15; y <= 21; y++) set(g, 7, y, 'X'); for (let y = 15; y <= 21; y += 2) { set(g, 6, y, 'x'); set(g, 8, y, 'x'); } },
    (g) => { for (let x = 14; x <= 22; x++) set(g, x, 33, 'X'); for (let x = 14; x <= 22; x += 2) { set(g, x, 32, 'x'); set(g, x, 34, 'x'); } },
  ],
  anvil: [ // flattened: bandage wrap round the head (with a little bow), then the body
    (g) => { for (let y = 12; y <= 14; y++) for (let x = 0; x < 36; x++) if (inHead(x, y)) set(g, x, y, y === 14 ? 'V' : 'v'); ell(g, 30.5, 11.5, 1.6, 1.4, 'v'); ell(g, 30.5, 15, 1.6, 1.4, 'v'); set(g, 29, 13, 'V'); },
    (g) => { for (let y = 31; y <= 33; y++) for (let x = 11; x <= 25; x++) { const dx = (x + 0.5 - 18) / 7.2, dy = (y + 0.5 - 31) / 5.6; if (dx * dx + dy * dy <= 1) set(g, x, y, y === 33 ? 'V' : 'v'); } },
    (g) => { ell(g, 13.5, 35.6, 2.4, 1.2, 'v'); set(g, 13, 35, 'V'); },
  ],
  catapult: [ // launched: eye patch, then an arm cast, then a forehead plaster
    (g, E) => { ell(g, E.rx, E.eyesY, 3, 3.4, 'z'); set(g, E.rx - 1, E.eyesY - 1, 'Z'); line(g, E.rx - 2, E.eyesY - 3, 8, 14, 'z'); line(g, E.rx + 2, E.eyesY - 3, 28, 14, 'z'); },
    (g) => { ell(g, 11.5, 30.5, 1.8, 2.4, 'v'); set(g, 11, 30, 'V'); set(g, 12, 30, 'V'); },
    (g) => { rect(g, 15, 11, 6, 2, 'a'); rect(g, 17, 11, 2, 2, 'A'); },
  ],
  zap: [ // zapped: crossed band-aids on the cheek, then a frazzled tuft, then another plaster
    (g, E) => { const cx = E.lx - 3, cy = 25; for (let i = -2; i <= 2; i++) { set(g, cx + i, cy + i, 'a'); set(g, cx + i, cy - i, 'a'); } set(g, cx, cy, 'A'); },
    (g) => { for (const [x, y] of [[15, 10], [16, 9], [17, 10], [18, 8], [19, 10], [20, 9], [21, 10]]) set(g, x, y, 'z'); },
    (g) => { rect(g, 24, 29, 5, 2, 'a'); rect(g, 26, 29, 1, 2, 'A'); },
  ],
};
function drawInjuries(g, injuries, E) {
  const seen = {};
  for (const type of injuries || []) {
    const k = seen[type] = (seen[type] ?? -1) + 1, list = MARKS[type]; if (!list) continue;
    list[Math.min(k, list.length - 1)](g, E);
  }
}

// mood: happy | worried | scared | ghost | dead | char. injuries: ['pop','anvil',...]
export function critter(species, mood, t, injuries = [], opts = {}) {
  const sp = SPECIES[species] || SPECIES.bunny;
  const g = grid(36, 38);
  const ghost = mood === 'ghost', cx = 18;
  const droop = mood === 'scared' || mood === 'dead' || mood === 'char';
  if (sp.back && !ghost) sp.back(g, t, mood);
  sp.ears(g, t, mood, droop);
  if (!ghost) {
    const [brx, bry] = sp.bodyR || [7.2, 5.6];
    ell(g, cx, 31, brx, bry, sp.body || 'w', { shade: 'g', sd: 1.4 });
    // walk cycle: feet take turns lifting (opts.walk = phase in radians)
    const wl = opts.walk != null ? Math.max(0, Math.sin(opts.walk)) * 1.6 : 0, wr = opts.walk != null ? Math.max(0, -Math.sin(opts.walk)) * 1.6 : 0;
    ell(g, cx - 4.5, 35.6 - wl, 2.8, 1.5, sp.feet || 'w', { shade: sp.feet ? null : 'g', sd: 0.6 });
    ell(g, cx + 4.5, 35.6 - wr, 2.8, 1.5, sp.feet || 'w', { shade: sp.feet ? null : 'g', sd: 0.6 });
    if (sp.tail) sp.tail(g, t);
  } else {
    for (let y = 0; y < 10; y++) {
      const w = 7 - y * 0.5 + Math.sin(t * 4 + y * 0.9) * 0.7, x0 = cx + Math.sin(t * 2 + y * 0.6) * (y * 0.3);
      for (let x = Math.floor(x0 - w); x <= x0 + w; x++) set(g, x, 27 + y, y > 6 && (x + y) % 3 === 0 ? null : 'w');
    }
  }
  const armsUp = mood === 'happy' && Math.sin(t * 5) > 0.3;
  ell(g, cx - 6.5, armsUp ? 26 : 30.5, 1.8, 2.4, sp.arms || 'w', { shade: sp.arms ? null : 'g', sd: 0.6 });
  ell(g, cx + 6.5, armsUp ? 26 : 30.5, 1.8, 2.4, sp.arms || 'w', { shade: sp.arms ? null : 'g', sd: 0.6 });
  const [hrx, hry] = sp.headR || [11.6, 9.4];
  ell(g, cx, 20.5, hrx, hry, 'w', { shade: 'g', sd: 1.8 }); // big round head
  if (sp.shade2 && !ghost) sp.shade2(g, t);
  if (!ghost) ell(g, cx, 32, 3.8, 3, sp.belly || 'g');
  if (sp.head) sp.head(g, t);
  outline(g, 'k');

  const E = { cx, eyesY: 20.5, lx: cx - 5, rx: cx + 5 };
  if (sp.face) sp.face(g, E);
  const blink = (t % 4.2) < 0.13;
  const sparkle = (ex, ey, big) => {
    const [erx, ery] = sp.eyeR || [2.7, 3.3];
    ell(g, ex, ey, erx, ery, 'b'); ell(g, ex, ey + 1.2, sp.eyeR ? erx - 0.5 : 2.2, sp.eyeR ? ery * 0.5 : 1.6, 'B', { lower: true });
    rect(g, ex - 1.6, ey - 2, 2, 2, 't'); set(g, ex + 1, ey + 1.5, 't');
    if (big) set(g, ex - 0.6, ey + 2, 't');
  };
  const { eyesY, lx, rx } = E;
  if (ghost) {
    for (const ex of [lx, rx]) { set(g, ex - 1.5, eyesY, 'b'); set(g, ex - 0.5, eyesY + 1, 'b'); set(g, ex + 0.5, eyesY + 1, 'b'); set(g, ex + 1.5, eyesY, 'b'); }
  } else if (mood === 'dead' || mood === 'char') { // cartoon X X eyes
    for (const ex of [lx, rx]) for (let i = -1.5; i <= 1.5; i++) { set(g, ex + i, eyesY + i, mood === 'char' ? 't' : 'b'); set(g, ex + i, eyesY - i, mood === 'char' ? 't' : 'b'); }
  } else if (blink) {
    for (const ex of [lx, rx]) rect(g, ex - 1.5, eyesY + 0.5, 4, 1, 'b');
  } else if (mood === 'happy' && Math.sin(t * 1.3) > 0.85) {
    for (const ex of [lx, rx]) { set(g, ex - 1.5, eyesY + 1, 'b'); set(g, ex - 0.5, eyesY, 'b'); set(g, ex + 0.5, eyesY, 'b'); set(g, ex + 1.5, eyesY + 1, 'b'); }
  } else {
    sparkle(lx, eyesY, mood !== 'happy'); sparkle(rx, eyesY, mood !== 'happy');
  }
  if (mood === 'worried' || mood === 'scared') {
    for (let i = 0; i < 3; i++) { set(g, lx - 1 + i, eyesY - 4.5 - i * 0.4, 'k'); set(g, rx + 1 - i, eyesY - 4.5 - i * 0.4, 'k'); }
  }
  rect(g, lx - 4, 24, 3, 1.6, 'p'); rect(g, rx + 2, 24, 3, 1.6, 'p'); // blush
  const sad = mood === 'worried' ? 'worried' : (mood === 'scared' || mood === 'dead' || mood === 'char') ? 'scared' : 'happy';
  const mt = sp.mouth;
  if (mt === 'beak') {
    const open = sad === 'scared' ? 1.6 : sad === 'happy' ? 1 : 0.4;
    ell(g, cx, 24.6, 4.6, 1.8, 'N'); ell(g, cx, 24.2, 4.2, 1.3, 'n');
    if (open > 0.5) { ell(g, cx, 26 + open * 0.4, 3.2, open, 'N'); ell(g, cx, 25.8 + open * 0.4, 2.2, open * 0.6, 'R'); }
    set(g, cx - 4.5, 23.6, 'N'); set(g, cx + 4.5, 23.6, 'N'); // smug upturned corners
    set(g, cx - 1, 23.6, 'N'); set(g, cx + 1, 23.6, 'N');
  } else if (mt === 'snout') {
    ell(g, cx, 24.2, 3.6, 2.5, 'N'); ell(g, cx, 24, 3, 2, 'n'); rect(g, cx - 1.5, 23.5, 1, 1.5, 'N'); rect(g, cx + 0.5, 23.5, 1, 1.5, 'N');
    if (sad === 'happy') { for (let x = -2; x <= 2; x++) set(g, cx + x, 27.4 - (Math.abs(x) === 2 ? 0.8 : 0), 'k'); set(g, cx + 1, 28, 't'); }
    else if (sad === 'worried') for (let x = -2; x <= 2; x++) set(g, cx + x, 27.6, 'k');
    else { ell(g, cx, 28, 1.6, 1.2, 'k'); }
  } else {
    rect(g, cx - 1, 23.5, 2, 1, 'P'); // tiny nose
    if (sad === 'happy') {
      if (mt === 'cat') { // little "w" grin with one fang
        ell(g, cx, 25.4, 2.8, 2.2, 'k', { lower: true }); ell(g, cx, 25.4, 2, 1.5, 'R', { lower: true });
        set(g, cx - 1.5, 25, 'k'); set(g, cx + 0.5, 25, 'k'); set(g, cx - 0.5, 24.5, 'k'); set(g, cx + 1.5, 25.6, 't'); set(g, cx - 0.5, 26.4, 'r');
      } else {
        ell(g, cx, 25, 3, 2.6, 'k', { lower: true }); ell(g, cx, 25, 2.1, 1.8, 'R', { lower: true });
        set(g, cx - 1.5, 26.4, 'r'); set(g, cx - 0.5, 26.4, 'r');
        if (mt === 'fang') { set(g, cx - 1.5, 25, 't'); set(g, cx + 1.5, 25, 't'); set(g, cx + 1.5, 25.8, 't'); }
        else { rect(g, cx - 2, 25, 2, 1.5, 't'); rect(g, cx + 0.1, 25, 2, 1.5, 't'); }
      }
    } else if (sad === 'worried') {
      for (let x = -2; x <= 2; x++) set(g, cx + x, 25.5 + (Math.abs(x) === 1 ? -0.6 : 0), 'k');
      rect(g, cx - 1, 26, 2, 1, 't');
    } else {
      const open = Math.sin(t * 16) > 0 ? 1.7 : 1.2;
      ell(g, cx, 26, 1.9, open + 0.6, 'k'); ell(g, cx, 26, 1.1, open - 0.2, 'R');
      rect(g, cx - 1, 25, 2, 1, 't');
    }
  }
  if (sp.after) sp.after(g, t, mood, E);
  if (!ghost) drawInjuries(g, injuries, E);
  if (mood === 'worried') { const d = (t * 6) % 5; set(g, cx + 11, 12 + d, 's'); set(g, cx + 11, 13 + d, 's'); set(g, cx + 12, 13 + d, 's'); }
  if (mood === 'scared') { const d = Math.floor(t * 8) % 4; set(g, lx - 2, eyesY + 3 + d, 's'); set(g, rx + 2, eyesY + 3 + ((d + 2) % 4), 's'); }
  if (ghost) for (let x = -5; x <= 5; x++) set(g, cx + x, 1 + (Math.abs(x) > 3 ? 1 : 0), 'y');
  if (mood === 'char') for (const [x, y] of [[9, 6], [11, 4], [26, 5], [24, 3], [18, 7]]) set(g, x, y, 'Z'); // frizz
  const pal = { ...FIX, c: '#fff6ea', d: '#555', e: '#888', E: '#666', n: '#fa3', N: '#c70', ...sp.pal };
  g.pal = ghost ? ghostPal(pal) : mood === 'char' ? { ...pal, ...CHAR } : pal;
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

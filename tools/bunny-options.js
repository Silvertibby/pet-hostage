// Five candidate bunny designs for Chompsky (not live). Registered as extra species on the shared critter() body,
// so moods, walk cycle, ghost/char palettes and injury overlays all work the same way.
import { SPECIES, _draw } from '../app/art.js';
const { set, ell, rect, tri, line } = _draw;

// a soft long ear: tapered ellipse that can lean/flop; w = half-width at its widest
function longEar(g, cx, baseY, len, lean, w, col, inner, shade) {
  for (let y = baseY - len; y <= baseY; y++) {
    const f = (baseY - y) / len, x0 = cx + lean * f * f * len * 0.5;
    const half = w * Math.sqrt(Math.max(0, 1 - Math.pow((f - 0.45) / 0.58, 2)));
    for (let x = Math.floor(x0 - half); x <= x0 + half; x++) {
      const inside = inner && Math.abs(x + 0.5 - x0) < half * 0.45 && f > 0.15 && f < 0.85;
      set(g, x, y, inside ? inner : (shade && x + 0.5 > x0 + half * 0.55 ? shade : col));
    }
  }
}
// a hanging (lop) ear: falls from the top of the head down beside the cheek
function lopEar(g, topX, topY, dir, len, w, col, inner, sway) {
  for (let i = 0; i <= len; i++) {
    const f = i / len, x0 = topX + dir * (2.5 * Math.sin(f * 1.6)) + sway * f, half = w * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, f * 1.15)));
    for (let x = Math.floor(x0 - half); x <= x0 + half; x++) set(g, x, topY + i, inner && f > 0.25 && f < 0.85 && Math.abs(x + 0.5 - x0) < half * 0.4 ? inner : col);
  }
}

export const OPTIONS = [
  { key: 'bunny', label: 'Current', desc: 'Chompsky as he is now: white, tall soft ears, buck-tooth grin.' },
  { key: 'bunny_mochi', label: 'Mochi', desc: 'Chubby round pastel-pink mochi bun: extra-wide head and body, tiny nub ears, shiny highlight, big blush.' },
  { key: 'bunny_lop', label: 'Lop', desc: 'Floppy lop-eared cream bunny with chocolate-brown ears, eye patch spot and forelock.' },
  { key: 'bunny_fluff', label: 'Fluff', desc: 'Big fuzzy grey bunny: shaggy fur edges, tufted cheeks, chest ruff, tufted ear tips.' },
  { key: 'bunny_chibi', label: 'Chibi', desc: 'Tiny white/lilac chibi: oversized droopy ears, extra-big sparkly eyes, little lilac bow.' },
  { key: 'bunny_snes', label: 'SNES', desc: 'Classic 16-bit tall-eared bunny in white/ice-blue with two-tone shading, rim light and blue eyes.' },
];

SPECIES.bunny_mochi = { label: 'bunny',
  pal: { k: '#a24f72', w: '#ffd9e6', g: '#f7bdd2', G: '#ec9fbd', p: '#ff9fc2', P: '#ff6f9f', r: '#ff7a96', R: '#c44a6a', c: '#fff0f5' },
  headR: [12.8, 9.9], bodyR: [8.6, 6.0],
  ears(g, t, m, droop) { const l = droop ? -1.6 : -0.5 + Math.sin(t * 2.5) * 0.06, r = droop ? 1.6 : 0.5 + Math.sin(t * 2.5 + 1) * 0.06;
    longEar(g, 13.5, 12, 7, l, 2.2, 'w', 'p', 'g'); longEar(g, 22.5, 12, 7, r, 2.2, 'w', 'p', 'g'); },
  tail(g) { ell(g, 26.6, 33, 2.2, 2, 'c'); },
  belly: 'c', mouth: 'buck',
  after(g, t, m) { set(g, 10, 15, 't'); set(g, 11, 14, 't'); set(g, 12, 14, 't'); set(g, 10, 16, 'c'); // shine
    rect(g, 7, 23.6, 4, 2, 'p'); rect(g, 25, 23.6, 4, 2, 'p'); set(g, 8, 23.6, 't'); set(g, 26, 23.6, 't'); }, // big blush w/ sparkle
};
SPECIES.bunny_lop = { label: 'bunny',
  pal: { k: '#6a4330', w: '#fff3dc', g: '#f1dcb6', G: '#dcc196', p: '#ffb9a8', P: '#e07a6a', r: '#ff8a7a', R: '#b84a4a', d: '#b47a4c', D: '#93603a', c: '#fffaf0' },
  ears(g, t) { set(g, 18, 10, 'd'); },
  head(g, t) { const s = Math.sin(t * 2) * 0.6; // lop ears in front of the head sides (part of the silhouette)
    lopEar(g, 10.5, 11, -1, 20, 3, 'd', 'D', -s); lopEar(g, 25.5, 11, 1, 20, 3, 'd', 'D', s);
    ell(g, 21.5, 15.5, 2.6, 1.8, 'd'); }, // one brown spot on the forehead
  after(g) { set(g, 17, 22.5, 'd'); set(g, 18, 22.5, 'd'); },
  tail(g) { ell(g, 25.5, 32.5, 2, 2, 'c'); }, belly: 'c', mouth: 'buck',
};
SPECIES.bunny_fluff = { label: 'bunny',
  pal: { k: '#55506a', w: '#dcd9e6', g: '#c3bfd2', G: '#a9a3bd', p: '#ffc1d4', P: '#ff8fb0', r: '#ff8aa6', R: '#c44a6a', c: '#f7f5fb' },
  headR: [12, 9.6], bodyR: [8, 6],
  ears(g, t, m, droop) {
    longEar(g, 12.5, 12, droop ? 8 : 10, droop ? -1 : -0.35 + Math.sin(t * 2) * 0.05, 3.2, 'w', 'p', 'g');
    longEar(g, 23.5, 12, droop ? 8 : 10, droop ? 1 : 0.35 + Math.sin(t * 2 + 1) * 0.05, 3.2, 'w', 'p', 'g');
    for (const [x, y] of [[10, 1], [11, 0], [12, 1], [25, 1], [26, 0], [24, 1]]) set(g, x, y + (droop ? 3 : 0), 'w'); },
  head(g, t) { // shaggy edge + cheek tufts + chest ruff (drawn before the outline so the silhouette gets fuzzy)
    for (let i = 0; i < 26; i++) { const a = Math.PI * 2 * i / 26; if (Math.sin(a) < -0.85) continue; const x = 18 + Math.cos(a) * 12.4, y = 20.5 + Math.sin(a) * 10; if (i % 2) set(g, x, y, 'w'); }
    tri(g, 6.5, 21, 7.5, 26, 2.5, 25, 'w'); tri(g, 7, 23, 8, 27, 3.5, 28, 'w'); tri(g, 29.5, 21, 28.5, 26, 33.5, 25, 'w'); tri(g, 29, 23, 28, 27, 32.5, 28, 'w');
    for (let x = 12; x <= 24; x += 2) tri(g, x - 1.5, 29, x + 1.5, 29, x, 33 + (x % 4 ? 0 : 1), 'c');
    tri(g, 15, 12, 18, 11.5, 16, 7.5, 'w'); tri(g, 17, 12, 20, 12, 18.6, 7, 'w'); tri(g, 19, 12, 22, 12, 21, 8, 'w'); // fluffy top tuft
    tri(g, 4.5, 18, 7, 22, 3, 22.5, 'w'); tri(g, 31.5, 18, 29, 22, 33, 22.5, 'w'); },
  tail(g) { ell(g, 26.5, 32.5, 2.6, 2.4, 'c'); }, belly: 'c', mouth: 'buck',
  after(g) { for (const [x, y] of [[9, 26], [27, 26], [17, 12], [19, 12]]) set(g, x, y, 'G'); },
};
SPECIES.bunny_chibi = { label: 'bunny',
  pal: { k: '#7a5a9a', w: '#fffbff', g: '#efe4f8', G: '#dccbee', p: '#e2c4ff', P: '#c08cff', r: '#ff8ab4', R: '#c44a7a', l: '#b98cff', L: '#8f5fe0', c: '#ffffff' },
  bodyR: [6, 4.6], eyeR: [3.1, 3.8],
  ears(g, t, m) { const s = Math.sin(t * 1.8) * 0.4; // big droopy ears, out to the sides and down
    for (const dir of [-1, 1]) {
      for (let i = 0; i <= 22; i++) { const f = i / 22, x0 = 18 + dir * (5 + 10 * Math.sin(f * 1.4)) + dir * s * f, y0 = 12 - 6 * Math.sin(f * 2.6) + 22 * f * f, half = 3 * Math.sin(Math.PI * (0.2 + 0.7 * f)) + 0.7;
        ell(g, x0, y0, half, half * 0.95, 'w'); if (f > 0.25 && f < 0.85) ell(g, x0, y0, half * 0.45, half * 0.4, 'p'); }
    } },
  tail(g) { ell(g, 24.5, 33, 1.8, 1.8, 'c'); }, belly: 'g', mouth: 'buck',
  after(g, t) { // bow on top of the head
    tri(g, 18, 11, 13.5, 8.5, 13.5, 13, 'l'); tri(g, 18, 11, 22.5, 8.5, 22.5, 13, 'l'); ell(g, 18, 11, 1.4, 1.4, 'L');
    set(g, 14, 10, 'c'); set(g, 21, 10, 'c'); set(g, 15, 15, 'L'); set(g, 21, 15, 'L'); },
};
SPECIES.bunny_snes = { label: 'bunny',
  pal: { k: '#33507e', w: '#f5fbff', g: '#d3e8f8', G: '#a9cbe9', p: '#ffc7dc', P: '#ff8fb6', r: '#ff7a9e', R: '#c0466e', b: '#1d2e5c', B: '#4a7ad0', c: '#ffffff', s: '#8fd8ff' },
  ears(g, t, m, droop) {
    for (const [cx, l] of [[13, -1], [23, 1]]) {
      const lean = droop ? l * 1.2 : l * 0.15 + Math.sin(t * 2.2 + (l > 0 ? 1 : 0)) * 0.04, len = droop ? 9 : 13;
      longEar(g, cx, 12.5, len, lean, 2.9, 'w', 'p', 'G');
      if (!droop) for (let y = 12.5 - len + 3; y < 11; y += 1) set(g, cx - 2 + lean * 0, y, 'g'); // inner-edge shade line
    } },
  shade2(g) { // second, deeper shade band (bottom-right) + dither for the 16-bit look
    for (let y = 11; y <= 30; y++) for (let x = 6; x <= 30; x++) {
      const dx = (x + 0.5 - 18) / 11.6, dy = (y + 0.5 - 20.5) / 9.4, sx = (x + 0.5 - 18 + 3.6) / 11.6, sy = (y + 0.5 - 20.5 + 3.6) / 9.4;
      const r2 = sx * sx + sy * sy;
      if (dx * dx + dy * dy <= 1 && r2 > 1.18 && dx * dx + dy * dy > 0.55) set(g, x, y, 'G');
      else if (dx * dx + dy * dy <= 1 && r2 > 1.05 && dx * dx + dy * dy > 0.55 && (x + y) % 2) set(g, x, y, 'G');
    } },
  tail(g) { ell(g, 25.5, 32.5, 2.2, 2.2, 'c'); }, belly: 'c', mouth: 'buck',
  after(g, t, m, E) { for (const [x, y] of [[9, 15], [10, 14], [11, 13], [12, 12], [13, 12]]) set(g, x, y, 't'); // rim light
    if (m !== 'ghost') for (const ex of [E.lx, E.rx]) { set(g, ex + 1, E.eyesY - 1.5, 'B'); set(g, ex - 1, E.eyesY + 1.6, 'B'); }
    for (const x of [13, 14.5, 21.5, 23]) set(g, x, 35.6, 'G'); }, // toe lines
};

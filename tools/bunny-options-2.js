// Round 2 bunny candidates, in a chunky low-res "lanky cartoon rabbit" style (after Ben's reference):
// flat cream body, warm tan outline, very tall skinny ears with a pink stripe, wide-set dot eyes,
// tiny pink nose, big toothy grin, lanky 3/4 standing body with big feet. Original characters.
import { _draw } from '../app/art.js';
const { grid, set, get, ell, rect, outline } = _draw;

function stroke(g, pts, r, col) { // thick polyline (ear shape)
  for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
    for (let k = 0; k <= n; k++) ell(g, x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, r, r, col); }
}
function along(pts, f) { // point at fraction f of a polyline
  const L = []; let tot = 0; for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); L.push(l); tot += l; }
  let d = f * tot; for (let i = 0; i < L.length; i++) { if (d <= L[i]) { const u = d / L[i]; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u]; } d -= L[i]; }
  return pts[pts.length - 1];
}
const shift = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);

export const LANKY = [
  { label: 'Grinner', desc: 'Classic cream manic grinner: both ears bolt upright, widest grin of the bunch, wild little eyes.',
    pal: { w: '#fbf3e2', g: '#dccfb8', k: '#c4996a', p: '#e2707c', P: '#ec8a8a', t: '#ffffff', m: '#d9cfbf', b: '#1c130e' },
    earL: [[10.5, 15], [9.5, 8], [8.5, 1]], earR: [[18, 15], [18.6, 8], [19.4, 1.5]], grin: 1 },
  { label: 'Bendy', desc: 'Grey bunny with one ear bent over at the tip and a gap-tooth grin; a bit goofy, a bit sweet.',
    pal: { w: '#e6e4e9', g: '#bfbac7', k: '#9c8775', p: '#e07a8c', P: '#ea8a96', t: '#ffffff', m: '#cfcbd4', b: '#1c1418' },
    earL: [[10.5, 15], [8.5, 8], [6, 2]], earR: [[18, 15], [19, 8], [21.5, 4.5], [25, 7], [26.5, 10]], gap: true, grin: 0 },
  { label: 'Squinty', desc: 'Tan/brown bunny with a cream muzzle and a cheeky one-eyed squint, ears leaning back like it is up to something.',
    pal: { w: '#e8c99c', g: '#caa577', k: '#8a5a34', p: '#e8807e', P: '#e57b7b', t: '#ffffff', m: '#e0d2bd', b: '#1c120a', c: '#fff3e0' },
    earL: [[10.5, 15], [7.5, 9], [4.5, 4]], earR: [[17.5, 15], [16.5, 8], [15, 2]], squint: true, muzzle: true, grin: 0 },
  { label: 'Bandit', desc: 'Pink-ish bunny in a red polka-dot bandana with a little bow on one ear; small but scrappy grin.',
    pal: { w: '#ffe4e7', g: '#f1c3ca', k: '#c2877a', p: '#e86a7a', P: '#e86a7a', t: '#ffffff', m: '#efd7d9', b: '#22141a', r: '#d93a4a', R: '#a8283a' },
    earL: [[10.5, 15], [9, 8], [7.5, 1.5]], earR: [[18, 15], [19.5, 8], [21.5, 2]], bandana: true, bow: true, grin: -1 },
  { label: 'Smudge', desc: 'Bright white bunny with freckles, half-lidded smug eyes and a big lopsided grin that knows something.',
    pal: { w: '#ffffff', g: '#e1e5ea', k: '#b6926a', p: '#f08a9a', P: '#f08a9a', t: '#ffffff', m: '#dfe3e8', b: '#1a1410', f: '#c9805a' },
    earL: [[10.5, 15], [10, 8], [9.5, 1]], earR: [[18, 15], [20, 9], [23, 3.5]], smug: true, freckles: true, grin: 2 },
];

// mood: happy | worried. opts.walk = phase (radians) for a walk frame.
const DY = 4; // top margin so the tall ears never clip
export function lanky(spec, mood, t = 0, opts = {}) {
  const H = 50, g = grid(32, H), cx = 14.5, worried = mood === 'worried';
  const walking = opts.walk != null, ph = opts.walk || 0;
  const bob = walking ? -Math.round(Math.abs(Math.sin(ph))) : 0;
  const droop = worried ? 1 : 0;
  const P = (x, y, c) => set(g, x, y + DY, c);
  // cel-style parts: each drawn on its own layer, outlined, then stacked back to front (gives inner lines)
  const part = draw => { const l = grid(32, H); draw(l, (x, y) => [x, y + DY]); outline(l, 'k'); for (let i = 0; i < l.a.length; i++) if (l.a[i]) g.a[i] = l.a[i]; return l; };
  const E = (l, x, y, rx, ry, c) => ell(l, x, y + DY, rx, ry, c), R = (l, x, y, w, h, c) => rect(l, Math.round(x), Math.round(y + DY), w, h, c);
  const fF = walking ? Math.sin(ph) * 2.2 : 0, lF = walking ? Math.max(0, Math.sin(ph)) * 1.4 : 0, lB = walking ? Math.max(0, -Math.sin(ph)) * 1.4 : 0;
  const sw = walking ? Math.sin(ph) * 1.2 : 0;
  const eL = shift(spec.earL, -droop * 0.5, bob + DY), eR = shift(spec.earR, droop * 0.5, bob + DY);
  part(l => { R(l, 17 - fF * 0.4, 36, 3, 5, 'g'); E(l, 20 - fF, 41.6 - lB, 4.2, 1.5, 'g'); });       // back leg + foot
  part(l => E(l, 20.6 - sw * 0.5, 31.5 + bob, 1.5, 3.6, 'g'));                                        // back arm
  part(l => { E(l, cx, 32 + bob, 6.2, 6.4, 'w'); R(l, 12, 24 + bob, 5, 3, 'w'); });                   // body + neck
  for (let y = 0; y < H; y++) for (let x = 18; x < 23; x++) if (get(g, x, y) === 'w') set(g, x, y, 'g'); // far side in shade
  part(l => { stroke(l, eL, 2, 'w'); stroke(l, eR, 2, 'w'); E(l, cx, 19.5 + bob, 8.6, 5.3, 'w'); R(l, 6, 17 + bob, 17, 4, 'w');
    if (spec.muzzle) E(l, cx, 22.2 + bob, 6.4, 2.6, 'c'); });                                         // head + ears
  part(l => { R(l, 10 + fF * 0.4, 36, 3, 5, 'w'); E(l, 10.5 + fF, 42.2 - lF, 4.7, 1.6, 'w'); });     // front leg + foot
  part(l => { E(l, 8.6 + sw, 30.5 + bob, 1.7, 3.6, 'w'); E(l, 8.2 + sw, 34.5 + bob, 2.2, 1.8, 'w'); }); // front arm
  // pink stripe up each ear
  for (const pts of [eL, eR]) for (let f = 0.22; f <= 0.86; f += 0.01) { const [x, y] = along(pts, f); set(g, Math.floor(x), Math.floor(y), 'p'); }
  if (spec.bow) { const [x, y] = along(eL, 0.1); const X = Math.floor(x), Y = Math.floor(y);
    for (const [dx, dy, c] of [[-3, -1, 'r'], [-3, 0, 'r'], [-3, 1, 'r'], [-2, 0, 'R'], [-1, -1, 'r'], [-1, 0, 'r'], [-1, 1, 'r'], [-4, 0, 'R']]) set(g, X + dx, Y + dy, c); }
  P(17, 32 + bob, 'k'); P(18, 32 + bob, 'k'); // suit-fold crease
  // face
  const ey = 17 + bob, lx = 9, rx = 20;
  if (spec.smug && !worried) { for (const x of [lx, rx]) { P(x, ey + 1, 'b'); P(x - 1, ey, 'k'); P(x, ey, 'k'); P(x + 1, ey, 'k'); } }
  else if (spec.squint && !worried) { P(lx, ey, 'b'); P(lx, ey + 1, 'b'); P(lx - 1, ey + 1, 'g'); P(rx - 1, ey + 1, 'b'); P(rx, ey, 'b'); P(rx + 1, ey + 1, 'b'); }
  else for (const x of [lx, rx]) { P(x, ey, 'b'); P(x, ey + 1, 'b'); P(x - 1, ey + 1, 'g'); }
  if (worried) { P(lx - 2, ey - 1, 'k'); P(lx - 1, ey - 1, 'k'); P(lx, ey - 2, 'k'); P(lx + 1, ey - 2, 'k'); P(rx + 2, ey - 1, 'k'); P(rx + 1, ey - 1, 'k'); P(rx, ey - 2, 'k'); P(rx - 1, ey - 2, 'k');
    const d = Math.floor(t * 6) % 3; P(24, 14 + d, 's'); P(24, 15 + d, 's'); P(25, 15 + d, 's'); }
  P(14, 19 + bob, 'P'); P(15, 19 + bob, 'P'); // nose
  if (spec.freckles) for (const [x, y] of [[7, 19], [8, 20], [6, 20], [21, 19], [22, 20], [23, 19]]) P(x, y + bob, 'f');
  const y0 = 21 + bob, e = spec.grin || 0;
  if (!worried) { // big toothy grin, corners curling up
    const a = 8 - e, b = 21 + Math.max(0, e - 1);
    for (let x = a; x <= b; x++) P(x, y0, 'k');
    P(a - 1, y0 - 1, 'k'); P(b + 1, y0 - 1, 'k'); if (spec.smug) { P(b + 1, y0 - 1, null); P(b + 1, y0 - 1, 'k'); P(b + 2, y0 - 2, 'k'); }
    for (let x = a + 1; x <= b - 1; x++) { P(x, y0 + 1, (x - a) % 3 === 0 ? 'm' : 't'); P(x, y0 + 2, (x - a) % 2 ? 't' : 'm'); }
    for (let x = a + 2; x <= b - 2; x++) P(x, y0 + 3, 'k');
    if (spec.gap) { P(14, y0 + 1, 'b'); P(14, y0 + 2, 'b'); }
  } else { // clenched grimace: flat teeth, corners pulled down
    const a = 9, b = 20;
    for (let x = a; x <= b; x++) { P(x, y0, 'k'); P(x, y0 + 3, 'k'); }
    P(a - 1, y0 + 2, 'k'); P(a - 1, y0 + 3, 'k'); P(b + 1, y0 + 2, 'k'); P(b + 1, y0 + 3, 'k'); P(a, y0 + 1, 'k'); P(b, y0 + 1, 'k');
    for (let x = a + 1; x <= b - 1; x++) { P(x, y0 + 1, 't'); P(x, y0 + 2, (x - a) % 2 ? 'm' : 't'); }
    if (spec.gap) { P(14, y0 + 1, 'b'); P(14, y0 + 2, 'b'); }
  }
  if (spec.bandana) { // red polka-dot bandana knotted at the neck
    for (let x = 10; x <= 19; x++) P(x, 25 + bob, 'r');
    for (let x = 11; x <= 18; x++) P(x, 26 + bob, 'r');
    for (let x = 12; x <= 17; x++) P(x, 27 + bob, 'r'); P(13, 28 + bob, 'r'); P(14, 28 + bob, 'r'); P(14, 29 + bob, 'R');
    for (let x = 10; x <= 19; x++) P(x, 24 + bob, 'R');
    P(12, 26 + bob, 't'); P(16, 25 + bob, 't'); P(15, 27 + bob, 't'); P(20, 25 + bob, 'R'); P(21, 24 + bob, 'r'); P(21, 26 + bob, 'r');
  }
  g.pal = { s: '#8fd8ff', ...spec.pal }; g.alpha = 1;
  return g;
}

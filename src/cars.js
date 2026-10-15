// One car model for the whole game, at world scale: 2.25 tiles long (72 world px = 144 screen px at ZOOM 2), one 48px lane wide (40px across), 2x chunky pixels.
// Views: 'side' (east/west travel, flipped for west), 'front' (driving toward camera = south), 'back' (driving away = north).
import { TILE, ROADS, AVENUE } from './world.js';
import { hires } from './hires.js';
import { shadeSprite } from './detail.js';
// Detail pass at 2x (coords below are hi-res px = 2 x native): gloss shading, door panel seams, spoked chrome rims,
// lit head/tail lamp lenses, chrome specular, glass reflections. Same palette family; cached with the sprite.
function carDetail(cv, view, kind) { if (globalThis.__noDetail || !cv.k) return cv;
  shadeSprite(cv, { r: 2, light: 0.32, dark: 0.22, grad: 0.22, skipInk: 30 }); const c = cv.getContext('2d'), Q = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  c.save(); c.globalCompositeOperation = 'source-atop';
  if (view === 'side') {
    if (kind !== 'pickup') { Q(28, 21, 1, 9, 'rgba(10,14,30,.45)'); Q(46, 21, 1, 9, 'rgba(10,14,30,.45)'); Q(29, 21, 1, 9, 'rgba(255,255,255,.18)'); } // door seams
    Q(4, 21, 62, 1, 'rgba(255,255,255,.45)'); Q(10, 21, 6, 1, 'rgba(255,255,255,.9)'); Q(40, 21, 4, 1, 'rgba(255,255,255,.85)'); // gloss specular
    Q(66, 22, 4, 4, '#fffbe8'); Q(67, 23, 2, 2, '#ffffff'); Q(65, 22, 1, 4, '#d8c070'); // headlamp lens
    Q(2, 22, 4, 4, '#ff5a5a'); Q(3, 23, 2, 1, '#ffd0d0'); // tail lens
    for (const wx of [5, 24]) { const cx = 2 * wx + 7, cy = 33; // spoked rims
      Q(cx - 4, cy - 4, 8, 8, '#22232c'); Q(cx - 3, cy - 4, 6, 8, '#9aa0b4'); Q(cx - 4, cy - 3, 8, 6, '#9aa0b4'); Q(cx - 2, cy - 3, 4, 6, '#5a6074'); Q(cx - 3, cy - 2, 6, 4, '#5a6074');
      Q(cx - 1, cy - 4, 2, 8, '#d8dce8'); Q(cx - 4, cy - 1, 8, 2, '#d8dce8'); Q(cx - 1, cy - 1, 2, 2, '#141a2e'); Q(cx - 3, cy - 4, 2, 1, '#ffffff'); }
    c.globalAlpha = 0.6; c.fillStyle = '#ffffff'; for (let i = 0; i < 5; i++) c.fillRect(20 + i, 8 + i, 1, 2); c.globalAlpha = 1; // glass streak
  } else {
    Q(19, 4, 2, 70, 'rgba(255,255,255,.12)'); Q(6, 3, 1, 68, 'rgba(255,255,255,.4)'); // centre line + side gloss
    c.globalAlpha = 0.7; c.fillStyle = '#ffffff'; for (let i = 0; i < 6; i++) c.fillRect(10 + i, (view === 'front' ? 12 : 20) + i, 2, 1); c.globalAlpha = 1;
    const ly = 70; if (view === 'front') { Q(7, ly, 6, 3, '#ffffff'); Q(27, ly, 6, 3, '#ffffff'); } else { Q(7, ly, 6, 3, '#ff6a6a'); Q(27, ly, 6, 3, '#ff6a6a'); }
  }
  c.restore(); return cv; }
export const CAR_LEN = 72, CAR_W = 40, U = 2, LANE = 48; // world px; U = one native pixel
export const LANES = { // 3-tile roads = two 48px lanes, right-hand traffic
  rows: ROADS, avenue: AVENUE, // horizontal roads occupy rows r..r+2; avenue occupies cols 31-33
  east: (r) => r * TILE + 2 * LANE - 4, west: (r) => r * TILE + LANE - 6, // side-view baseline (wheel contact) inside the lane
  south: () => AVENUE * TILE + LANE / 2, north: () => AVENUE * TILE + LANE * 1.5,
};
const INK = '#141a2e', GLASS = '#9fd8f5', GLASS_L = '#e6f7ff', TIRE = '#22232c', HUB = '#9aa0b4', HEAD = '#fff6c8', TAIL = '#e8343c', CHROME = '#c9cede';
const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); return '#' + [16, 8, 0].map((s) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f))).toString(16).padStart(2, '0')).join(''); };
const cache = new Map();
// cabin [x0, x1, roofY] per model; body/wheels shared so every model keeps the same footprint + scale
const CABIN = { sedan: [9, 27, 2], coupe: [12, 24, 4], limo: [9, 27, 2], hatch: [4, 24, 2], suv: [4, 28, 1], pickup: [17, 28, 3], supercar: [14, 26, 6], convertible: [0, 0, 9] };
function mk(w, h) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d'); return [cv, c]; }
const P = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

function side(col, kind) { // 40 x 20 native, nose at the right, wheels touch y=20
  const [cv, c] = mk(36, 20), L = shade(col, 1.3), D = shade(col, 0.68), [cx0, cx1, cy] = CABIN[kind] || CABIN.sedan;
  if (kind === 'convertible') { P(c, 22, 5, 1, 5, INK); P(c, 23, 4, 2, 6, GLASS); P(c, 23, 4, 1, 2, GLASS_L); P(c, 11, 6, 3, 4, '#5e3c22'); P(c, 17, 6, 3, 4, '#5e3c22'); P(c, 11, 6, 3, 1, '#8a5a30'); P(c, 17, 6, 3, 1, '#8a5a30'); }
  else {
  P(c, cx0, cy - 1, cx1 - cx0, 1, INK); P(c, cx0 - 1, cy, 1, 10 - cy, INK); P(c, cx1, cy, 1, 10 - cy, INK); // cabin outline
  P(c, cx0, cy, cx1 - cx0, 10 - cy, col); P(c, cx0, cy, cx1 - cx0, 1, L);
  P(c, cx0 + 1, cy + 1, cx1 - cx0 - 2, 8 - cy, GLASS); P(c, cx0 + 1, cy + 1, 4, 1, GLASS_L); P(c, cx0 + 2, cy + 2, 1, 2, GLASS_L);
  P(c, Math.round((cx0 + cx1) / 2), cy + 1, 1, 8 - cy, col); // B-pillar
  if (kind === 'limo') P(c, cx0 + 5, cy + 1, 1, 8 - cy, col);
  if (kind === 'suv') { P(c, cx0 + 1, 0, cx1 - cx0 - 2, 1, '#6e7386'); for (const x of [cx0 + 2, cx1 - 3]) P(c, x, 0, 1, 1, INK); }
  }
  if (kind === 'pickup') { P(c, 1, 7, 15, 3, INK); P(c, 2, 8, 13, 2, D); P(c, 2, 7, 13, 1, L); }
  if (kind === 'supercar') { P(c, 0, 6, 6, 2, INK); P(c, 1, 6, 4, 1, L); P(c, 2, 8, 1, 2, INK); P(c, 28, 9, 7, 1, D); }
  P(c, 1, 9, 34, 1, INK); P(c, 0, 10, 1, 7, INK); P(c, 35, 10, 1, 7, INK); P(c, 1, 17, 34, 1, INK); // body outline
  P(c, 1, 10, 34, 7, col); P(c, 1, 10, 34, 1, L); P(c, 1, 15, 34, 2, D); P(c, 5, 13, 26, 1, D); // body, highlight, crease
  P(c, 15, 11, 3, 1, CHROME); P(c, 23, 11, 3, 1, CHROME); // door handles
  P(c, 33, 11, 2, 2, HEAD); P(c, 1, 11, 2, 2, TAIL); P(c, 31, 15, 4, 1, CHROME); P(c, 1, 15, 4, 1, CHROME); // lamps + bumpers
  for (const wx of [5, 24]) { P(c, wx - 1, 12, 9, 1, D); P(c, wx, 13, 7, 7, INK); P(c, wx + 1, 14, 5, 5, TIRE); P(c, wx + 2, 15, 3, 3, HUB); P(c, wx + 3, 16, 1, 1, INK); } // wheels + arches
  if (kind === 'limo') P(c, 1, 12, 34, 1, '#fff1b0');
  return cv;
}
function top(col, kind, view) { // 20 x 40 native (16 body + wheel nubs), front at the bottom for 'front'
  const [cv, c] = mk(20, 40), L = shade(col, 1.3), D = shade(col, 0.68);
  for (const wy of [5, 26]) { P(c, 0, wy, 2, 7, INK); P(c, 18, wy, 2, 7, INK); } // tyres poking out
  P(c, 3, 0, 14, 1, INK); P(c, 2, 1, 1, 34, INK); P(c, 17, 1, 1, 34, INK); P(c, 3, 35, 14, 1, INK);
  P(c, 3, 1, 14, 34, col); P(c, 3, 1, 2, 34, L); P(c, 15, 1, 2, 34, D);
  const glass = (y, h) => { P(c, 4, y, 12, h, GLASS); P(c, 4, y, 5, 1, GLASS_L); };
  const nose = (lc) => { P(c, 3, 35, 14, 4, D); P(c, 3, 39, 14, 1, INK); P(c, 3, 35, 4, 2, lc); P(c, 13, 35, 4, 2, lc); P(c, 8, 37, 4, 1, CHROME); };
  if (view === 'front') { glass(6, 4); P(c, 4, 11, 12, 10, L); P(c, 5, 12, 10, 8, col); glass(22, 4); P(c, 4, 27, 12, 1, D); nose(HEAD); }
  else { glass(10, 4); P(c, 4, 15, 12, 10, L); P(c, 5, 16, 10, 8, col); glass(26, 3); P(c, 4, 8, 12, 1, D); nose(TAIL); }
  if (kind === 'limo') P(c, 9, 1, 2, 34, '#fff1b0');
  if (kind === 'convertible') { P(c, 4, 12, 12, 13, '#5e3c22'); for (const y of [14, 20]) { P(c, 5, y, 4, 3, '#8a5a30'); P(c, 11, y, 4, 3, '#8a5a30'); } }
  if (kind === 'pickup') { const y0 = view === 'front' ? 3 : 20; P(c, 4, y0, 12, 13, INK); P(c, 5, y0 + 1, 10, 11, D); }
  if (kind === 'supercar') { P(c, 9, 1, 2, 34, '#141a2e'); P(c, 3, view === 'front' ? 1 : 33, 14, 2, INK); }
  if (kind === 'suv') { P(c, 5, 12, 1, 12, '#6e7386'); P(c, 14, 12, 1, 12, '#6e7386'); }
  return cv;
}
export function carSprite(col, view = 'side', kind = 'sedan') {
  const k = col + view + kind; let s = cache.get(k); if (!s) { s = carDetail(hires(view === 'side' ? side(col, kind) : top(col, kind, view)), view, kind); cache.set(k, s); } return s;
}
// Draw a car whose ground contact is (x, base): x = centre, base = bottom of wheels (side) / bottom of bumper (front/back).
export function drawCar(c, x, base, { col = '#c8323c', dir = 'east', kind = 'sedan', alpha = 1, glow = null } = {}) {
  const view = dir === 'south' ? 'front' : dir === 'north' ? 'back' : 'side', spr = carSprite(col, view, kind);
  const w = spr.width * U / (spr.k || 1), h = spr.height * U / (spr.k || 1), X = Math.round(x - w / 2), Y = Math.round(base - h);
  c.save(); c.globalAlpha = alpha; c.fillStyle = 'rgba(16,24,48,.32)';
  if (view === 'side') { c.fillRect(X + 4, Math.round(base) - 4, w - 6, 4); c.fillRect(X + 8, Math.round(base), w - 14, 2); }
  else { c.fillRect(X + 4, Y + 6, w - 4, h - 4); }
  if (dir === 'west') { c.translate(X + w, Y); c.scale(-1, 1); c.drawImage(spr, 0, 0, w, h); } else c.drawImage(spr, X, Y, w, h);
  if (glow && globalThis.__noDetail) { c.globalAlpha = 0.45; c.fillStyle = glow; c.fillRect(X - 4, Math.round(base) - 6, w + 8, 8); c.fillRect(X + 4, Y - 4, w - 8, 4); c.globalAlpha = 1; }
  else if (glow) { c.save(); c.globalCompositeOperation = 'lighter'; const gx = X + w / 2, gy = Math.round(base) - 2, g = c.createRadialGradient(gx, gy, 2, gx, gy, w * 0.62);
    g.addColorStop(0, glow); g.addColorStop(0.5, glow + '66'); g.addColorStop(1, glow + '00'); c.globalAlpha = 0.75; c.fillStyle = g; c.beginPath(); c.ellipse(gx, gy, w * 0.62, 9, 0, 0, 7); c.fill(); // underglow pool
    c.globalAlpha = 0.9; c.fillStyle = glow; c.fillRect(X + 6, Math.round(base) - 3, w - 12, 1); c.fillStyle = '#ffffff'; c.globalAlpha = 0.6; c.fillRect(X + 10, Math.round(base) - 3, w - 20, 1); c.restore(); } // neon strip + hot core
  c.restore();
}

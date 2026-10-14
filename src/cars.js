// One car model for the whole game, at world scale: 2.25 tiles long (72 world px = 144 screen px at ZOOM 2), one 48px lane wide (40px across), 2x chunky pixels.
// Views: 'side' (east/west travel, flipped for west), 'front' (driving toward camera = south), 'back' (driving away = north).
import { TILE, ROADS, AVENUE } from './world.js';
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
  const k = col + view + kind; let s = cache.get(k); if (!s) { s = view === 'side' ? side(col, kind) : top(col, kind, view); cache.set(k, s); } return s;
}
// Draw a car whose ground contact is (x, base): x = centre, base = bottom of wheels (side) / bottom of bumper (front/back).
export function drawCar(c, x, base, { col = '#c8323c', dir = 'east', kind = 'sedan', alpha = 1 } = {}) {
  const view = dir === 'south' ? 'front' : dir === 'north' ? 'back' : 'side', spr = carSprite(col, view, kind);
  const w = spr.width * U, h = spr.height * U, X = Math.round(x - w / 2), Y = Math.round(base - h);
  c.save(); c.globalAlpha = alpha; c.fillStyle = 'rgba(16,24,48,.32)';
  if (view === 'side') { c.fillRect(X + 4, Math.round(base) - 4, w - 6, 4); c.fillRect(X + 8, Math.round(base), w - 14, 2); }
  else { c.fillRect(X + 4, Y + 6, w - 4, h - 4); }
  if (dir === 'west') { c.translate(X + w, Y); c.scale(-1, 1); c.drawImage(spr, 0, 0, w, h); } else c.drawImage(spr, X, Y, w, h);
  c.restore();
}

// One car model for the whole game, at world scale: 2 tiles long (64px), one lane wide (<=28px across), 2x chunky pixels.
// Views: 'side' (east/west travel, flipped for west), 'front' (driving toward camera = south), 'back' (driving away = north).
import { TILE } from './world.js';
export const CAR_LEN = 2 * TILE, CAR_W = 28, U = 2; // world px; U = one native pixel
export const LANES = { // lane centres / baselines (2-lane roads at TILE 32, right-hand traffic)
  rows: [20, 31, 43], avenue: 31, // horizontal roads occupy rows r and r+1; avenue occupies cols 31-32
  east: (r) => (r + 2) * TILE, west: (r) => (r + 1) * TILE, // side-view baseline = lane's bottom edge (car fills exactly its lane)
  south: () => 31 * TILE + 16, north: () => 32 * TILE + 16,
};
const INK = '#141a2e', GLASS = '#9fd8f5', GLASS_L = '#e6f7ff', TIRE = '#22232c', HUB = '#9aa0b4', HEAD = '#fff6c8', TAIL = '#e8343c', CHROME = '#c9cede';
const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); return '#' + [16, 8, 0].map((s) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f))).toString(16).padStart(2, '0')).join(''); };
const cache = new Map();
function mk(w, h) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d'); return [cv, c]; }
const P = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

function side(col, kind) { // 32 x 16 native, nose at the right, wheels touch y=16
  const [cv, c] = mk(32, 16), L = shade(col, 1.3), D = shade(col, 0.68), cab = kind === 'coupe' ? [11, 21, 4] : [8, 23, 2];
  const [cx0, cx1, cy] = cab;
  P(c, cx0, cy - 1, cx1 - cx0, 1, INK); P(c, cx0 - 1, cy, 1, 7 - cy + 1, INK); P(c, cx1, cy, 1, 7 - cy + 1, INK); // cabin outline
  P(c, cx0, cy, cx1 - cx0, 8 - cy, col); P(c, cx0, cy, cx1 - cx0, 1, L);
  P(c, cx0 + 1, cy + 1, cx1 - cx0 - 2, 6 - cy, GLASS); P(c, cx0 + 1, cy + 1, 3, 1, GLASS_L);
  P(c, Math.round((cx0 + cx1) / 2), cy + 1, 1, 6 - cy, col); // B-pillar
  if (kind === 'limo') P(c, cx0 + 4, cy + 1, 1, 6 - cy, col);
  P(c, 1, 7, 30, 1, INK); P(c, 0, 8, 1, 5, INK); P(c, 31, 8, 1, 5, INK); P(c, 1, 13, 30, 1, INK); // body outline
  P(c, 1, 8, 30, 5, col); P(c, 1, 8, 30, 1, L); P(c, 1, 12, 30, 1, D); P(c, 4, 10, 24, 1, D); // body, highlight, crease
  P(c, 14, 9, 2, 1, CHROME); P(c, 22, 9, 2, 1, CHROME); // door handles
  P(c, 30, 9, 1, 2, HEAD); P(c, 1, 9, 1, 2, TAIL); P(c, 29, 12, 2, 1, CHROME); P(c, 1, 12, 2, 1, CHROME); // lamps + bumpers
  for (const wx of [5, 22]) { P(c, wx, 11, 5, 5, INK); P(c, wx + 1, 12, 3, 3, TIRE); P(c, wx + 2, 13, 1, 1, HUB); P(c, wx - 1, 10, 7, 1, D); } // wheels + arches
  if (kind === 'limo') { P(c, 1, 10, 30, 1, '#fff1b0'); }
  return cv;
}
function top(col, kind, view) { // 16 x 31 native (14 body + wheel nubs), front at the bottom for 'front'
  const [cv, c] = mk(16, 31), L = shade(col, 1.3), D = shade(col, 0.68);
  for (const wy of [4, 20]) { P(c, 0, wy, 2, 5, INK); P(c, 14, wy, 2, 5, INK); } // tyres poking out
  P(c, 2, 0, 12, 1, INK); P(c, 1, 1, 1, 26, INK); P(c, 14, 1, 1, 26, INK); P(c, 2, 27, 12, 1, INK);
  P(c, 2, 1, 12, 26, col); P(c, 2, 1, 2, 26, L); P(c, 12, 1, 2, 26, D);
  const glass = (y, h) => { P(c, 3, y, 10, h, GLASS); P(c, 3, y, 4, 1, GLASS_L); };
  if (view === 'front') { glass(5, 3); P(c, 3, 9, 10, 7, L); P(c, 4, 10, 8, 5, col); glass(17, 3); P(c, 3, 21, 10, 1, D); P(c, 2, 27, 12, 3, D); P(c, 2, 30, 12, 1, INK); P(c, 2, 27, 3, 2, HEAD); P(c, 11, 27, 3, 2, HEAD); P(c, 6, 28, 4, 1, CHROME); }
  else { glass(8, 3); P(c, 3, 12, 10, 7, L); P(c, 4, 13, 8, 5, col); glass(19, 2); P(c, 3, 6, 10, 1, D); P(c, 2, 27, 12, 3, D); P(c, 2, 30, 12, 1, INK); P(c, 2, 27, 3, 2, TAIL); P(c, 11, 27, 3, 2, TAIL); P(c, 6, 28, 4, 1, CHROME); }
  if (kind === 'limo') P(c, 7, 1, 2, 26, '#fff1b0');
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

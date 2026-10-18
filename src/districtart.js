// Original pixel art for the Arcade Districts zone (districts.js): pavement, boulevard, pitch, track, crops; street props;
// cabinet storefronts and the five venues. Static parts are baked once per structure (and per night) into a small sprite,
// so a frame only blits what is on screen plus a few animated pixels (neon, flags). Inu Verse palette, no brand art.
import { cabinet, label, district } from './districts.js';
const ST = 32;
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
const hz = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
const INK = '#141a2e', CREAM = '#f6e7b8', GOLD = '#f2cc68';
const text = (c, s, x, y, col = CREAM, px = 6, align = 'center') => { c.fillStyle = col; c.font = `${px}px Silkscreen, monospace`; c.textAlign = align; c.textBaseline = 'middle'; c.fillText(s, x, y); };
// ---- floors (baked into the chunked ground) ----
export const FLOORS = {
  pave: (c, x, y, tx, ty) => { R(c, x, y, ST, ST, (tx + ty) % 2 ? '#d8d0c0' : '#cec5b3'); R(c, x, y, ST, 1, '#b8ae9a'); R(c, x, y, 1, ST, '#b8ae9a'); if (hz(tx, ty) < 0.15) R(c, x + 8 + hz(tx, ty, 1) * 14, y + 10, 4, 2, '#bdb39f'); },
  road: (c, x, y, tx, ty, sc) => { R(c, x, y, ST, ST, '#4a4e5c'); for (let i = 0; i < 3; i++) R(c, x + Math.floor(hz(tx, ty, i) * 28), y + Math.floor(hz(tx, ty, i + 4) * 28), 3, 2, '#555a69');
    const up = sc.at(tx, ty - 1), dn = sc.at(tx, ty + 1); if (up && up.floor !== 'road' && up.floor !== 'roadline') R(c, x, y, ST, 3, '#8a8e9a'); if (dn && dn.floor !== 'road' && dn.floor !== 'roadline') R(c, x, y + ST - 3, ST, 3, '#2e313b'); },
  roadline: (c, x, y, tx, ty, sc) => { FLOORS.road(c, x, y, tx, ty, sc); R(c, x + 4, y + 14, ST - 8, 4, '#f2e2a0'); },
  doorstep: (c, x, y, tx, ty) => { FLOORS.pave(c, x, y, tx, ty); R(c, x + 3, y + 2, ST - 6, ST - 6, '#8a4a3a'); R(c, x + 5, y + 4, ST - 10, ST - 10, '#b4423c'); R(c, x + 14, y + 8, 4, 12, GOLD); R(c, x + 10, y + 10, 12, 3, GOLD); }, // welcome mat: up arrow
  crop: (c, x, y, tx, ty) => { R(c, x, y, ST, ST, '#8a5a34'); for (let i = 0; i < 4; i++) { R(c, x + i * 8 + 2, y + 6, 4, 20, '#6e4426'); R(c, x + i * 8 + 3, y + 4 + (hz(tx, ty, i) * 4 | 0), 3, 6, '#7cbf5a'); } },
  turf: (c, x, y, tx) => { R(c, x, y, ST, ST, tx % 2 ? '#5aa84a' : '#4f9c40'); },
  turfline: (c, x, y, tx) => { FLOORS.turf(c, x, y, tx); R(c, x + 14, y, 4, ST, '#f2f2e8'); },
  track: (c, x, y, tx, ty, sc) => { R(c, x, y, ST, ST, '#b4523c'); const g = (dx, dy) => sc.at(tx + dx, ty + dy)?.floor === 'grass'; if (g(0, -1)) R(c, x, y, ST, 2, '#f2f2e8'); if (g(0, 1)) R(c, x, y + ST - 2, ST, 2, '#f2f2e8'); if (ty % 2 === 0) R(c, x + 6, y + 15, 20, 2, 'rgba(255,255,255,.35)'); },
};
// ---- single-tile props (depth-sorted with actors) ----
export const PROPS = {
  streetlamp: (c, x, y, tx, ty, t, night) => { R(c, x + 14, y - 22, 4, 50, '#3a3e4a'); R(c, x + 9, y - 28, 14, 7, '#2a2e3a'); R(c, x + 11, y - 22, 10, 3, night ? '#ffe9a0' : '#e8e0c0'); R(c, x + 10, y + 26, 12, 4, '#2a2e3a'); if (night) { c.fillStyle = 'rgba(255,233,160,.16)'; c.fillRect(x - 6, y - 18, 44, 48); } },
  dsign: (c, x, y, tx, ty, t, night, sc) => { const d = sc.districtAt?.(tx); const col = d?.col || '#6c4fd0'; R(c, x + 14, y - 8, 4, 36, '#5a4a3a'); R(c, x - 14, y - 34, 60, 26, INK); R(c, x - 13, y - 33, 58, 24, col); R(c, x - 11, y - 31, 54, 20, shade(col, 0.75)); text(c, (d?.name || '').toUpperCase(), x + 16, y - 24, CREAM, 5); text(c, '< TOWN   FAST TRAVEL', x + 16, y - 15, GOLD, 4); },
  kiosk: (c, x, y, tx, ty, t, night) => { R(c, x + 4, y - 18, 24, 46, INK); R(c, x + 5, y - 17, 22, 44, '#2a6a8a'); R(c, x + 7, y - 14, 18, 14, night ? '#bfe8ff' : '#9fd6f0'); for (let i = 0; i < 3; i++) R(c, x + 9, y - 12 + i * 4, 6 + i * 3, 2, '#2a6a8a');
    R(c, x + 8, y + 4, 16, 6, GOLD); text(c, 'GO', x + 16, y + 7.5, INK, 4); R(c, x + 2, y - 24, 28, 7, '#f2cc68'); text(c, 'TRAVEL', x + 16, y - 20.5, INK, 4); },
  scarecrow: (c, x, y, tx, ty, t) => { const sw = Math.round(Math.sin(t * 1.5) * 1); R(c, x + 15, y - 10, 3, 40, '#6a4428'); R(c, x + 4 + sw, y - 2, 24, 3, '#6a4428'); R(c, x + 10 + sw, y - 4, 12, 16, '#c0392b'); R(c, x + 11 + sw, y - 16, 10, 10, '#f2d8a0'); R(c, x + 8 + sw, y - 18, 16, 3, '#d4a640'); R(c, x + 13 + sw, y - 12, 2, 2, INK); R(c, x + 17 + sw, y - 12, 2, 2, INK); },
  goal: (c, x, y, tx, ty, t, night, sc) => { const top = sc.at(tx, ty - 1)?.prop !== 'goal'; R(c, x + 12, y - 4, 4, 36, '#f2f2e8'); if (top) R(c, x + 12, y - 8, 4, 6, '#f2f2e8'); for (let i = 0; i < 4; i++) R(c, x + (tx < 80 ? 2 : 18), y - 2 + i * 8, 12, 1, 'rgba(255,255,255,.5)'); },
  block: (c, x, y, tx, ty) => { const col = ['#e08a2a', '#3a7ad0', '#7cbf5a'][(tx + ty) % 3]; R(c, x + 1, y - 6, 30, 36, INK); R(c, x + 2, y - 5, 28, 34, col); R(c, x + 2, y - 5, 28, 5, shade(col, 1.25)); R(c, x + 6, y + 4, 20, 2, shade(col, 0.75)); R(c, x + 6, y + 14, 20, 2, shade(col, 0.75)); },
  cone: (c, x, y) => { R(c, x + 8, y + 24, 16, 4, '#2a2e3a'); R(c, x + 11, y + 6, 10, 18, '#f08030'); R(c, x + 13, y, 6, 8, '#f08030'); R(c, x + 11, y + 12, 10, 3, '#fff'); },
  flagpole: (c, x, y, tx, ty, t) => { R(c, x + 14, y - 34, 3, 62, '#c8c8d2'); const w = Math.round(Math.sin(t * 4 + tx) * 2); R(c, x + 17, y - 34, 14, 9, '#d0503a'); R(c, x + 17 + 14, y - 33 + w, 2, 7, '#d0503a'); R(c, x + 19, y - 32, 6, 2, GOLD); R(c, x + 10, y + 24, 12, 4, '#8a8a94'); },
};
// ---- structures: one baked sprite per (struct, night), animated bits drawn on top ----
const sprite = new Map(), PAD = 30, K = 2; // pixels of roof/sign allowed above the top tile
function bake(s, night) { const k = s.id + (night ? ':n' : ''); let cv = sprite.get(k); if (cv) return cv; const w = s.w * ST, h = s.h * ST + PAD;
  cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w * K, h * K) : Object.assign(document.createElement('canvas'), { width: w * K, height: h * K }); const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.scale(K, K); // 2x so sign text stays crisp at zoom 2
  (BAKE[s.kind] || BAKE.hallside)(c, s, w, h - PAD, PAD, night); sprite.set(k, cv); return cv; }
const doorFace = (c, s, x, y, cab, night) => { // shared cabinet door: OPEN = lit doorway, COMING SOON = pulled shutter + sign
  if (!cab) return; if (cab.live) { R(c, x - 1, y - 1, 26, 34, INK); R(c, x, y, 24, 32, night ? '#ffe9a0' : '#f8e6b0'); R(c, x + 2, y + 2, 20, 30, night ? '#ffd670' : '#ffefc0'); R(c, x + 11, y + 6, 2, 22, 'rgba(120,80,30,.35)'); }
  else { R(c, x - 1, y - 1, 26, 34, INK); R(c, x, y, 24, 32, '#8a8e9a'); for (let i = 0; i < 8; i++) R(c, x, y + 2 + i * 4, 24, 1, '#5a5e6a'); R(c, x - 6, y + 8, 36, 11, INK); R(c, x - 5, y + 9, 34, 9, GOLD); text(c, 'SOON', x + 12, y + 13.5, INK, 5); } };
const BAKE = {
  hallside: (c, s, w, h, o) => { R(c, 0, o, w, h, '#5a3a8a'); R(c, 0, o, w, 6, '#7a5ab0'); for (let i = 0; i < 4; i++) R(c, 6 + (i % 2) * 28, o + 14 + Math.floor(i / 2) * 50, 20, 30, '#2a1a4a'); text(c, '< HALL', w / 2, o + h - 12, GOLD, 6); },
  booth: (c, s, w, h, o, night) => { const cab = cabinet(s.id), col = ['#6c4fd0', '#d0503a', '#3a9a6a', '#e08a2a', '#3a7ad0', '#c04a8a', '#7a9a3a', '#d4a640'][Math.max(0, ['kibble-chomp', 'bark-invaders', 'pup-crossing', 'bone-breaker', 'street-sniffer', 'paw-fu-tower', 'bone-digger', 'pips-big-bark'].indexOf(s.id))];
    R(c, 0, o + 10, w, h - 10, INK); R(c, 2, o + 12, w - 4, h - 12, shade(col, 0.7)); R(c, 2, o + 12, w - 4, 6, shade(col, 1.15));
    R(c, -2 + 2, o - 2, w - 4, 26, INK); R(c, 3, o - 1, w - 6, 24, cab.live ? col : '#5a5e6a'); R(c, 5, o + 1, w - 10, 20, cab.live ? shade(col, 0.55) : '#3a3e4a'); // marquee
    const nm = label(cab).toUpperCase(), two = nm.length > 12 && nm.includes(' '); if (two) { const i = nm.lastIndexOf(' ', 12) > 0 ? nm.lastIndexOf(' ', 12) : nm.indexOf(' '); text(c, nm.slice(0, i), w / 2, o + 7, cab.live ? CREAM : '#c8c8d2', 5); text(c, nm.slice(i + 1), w / 2, o + 15, cab.live ? CREAM : '#c8c8d2', 5); } else text(c, nm, w / 2, o + 11, cab.live ? CREAM : '#c8c8d2', nm.length > 10 ? 5 : 6);
    R(c, 6, o + 34, w - 12, 40, INK); R(c, 8, o + 36, w - 16, 36, night ? '#2a3a6a' : '#3a4a7a'); R(c, 12, o + 40, w - 24, 18, cab.live ? shade(col, 1.3) : '#4a4e5c'); for (let i = 0; i < 3; i++) R(c, 14 + i * 22, o + 62, 8, 6, cab.live ? GOLD : '#6a6e7a'); // window with a cabinet screen
    doorFace(c, s, Math.round(w / 2 - 12), o + h - 34, cab, night); R(c, 0, o + h - 2, w, 2, '#2a2e3a'); },
  arena: (c, s, w, h, o, night) => venue(c, s, w, h, o, night, { wall: '#d0503a', roof: '#8a2a1e', title: 'THE ARENA', dome: true }),
  barn: (c, s, w, h, o, night) => venue(c, s, w, h, o, night, { wall: '#a0442e', roof: '#6a5a3a', title: 'FUD FIELD', barn: true }),
  stadium: (c, s, w, h, o, night) => venue(c, s, w, h, o, night, { wall: '#3a7ad0', roof: '#24508a', title: 'STADIUM', stands: true }),
  tower: (c, s, w, h, o, night) => venue(c, s, w, h, o, night, { wall: '#e08a2a', roof: '#8a4a1a', title: 'PARKOUR PARK', blocks: true }),
  grandstand: (c, s, w, h, o, night) => venue(c, s, w, h, o, night, { wall: '#c0392b', roof: '#3a3e4a', title: 'RACE PARK', checker: true }),
};
function venue(c, s, w, h, o, night, v) { const cab = cabinet(s.id), top = o + 12;
  if (v.dome) { c.fillStyle = INK; c.beginPath(); c.ellipse(w / 2, top + 26, w / 2 - 6, 40, 0, Math.PI, 0); c.fill(); c.fillStyle = v.roof; c.beginPath(); c.ellipse(w / 2, top + 26, w / 2 - 8, 38, 0, Math.PI, 0); c.fill(); for (let i = 1; i < 6; i++) R(c, (w / 6) * i - 1, top - 4 + Math.abs(3 - i) * 4, 2, 30, shade(v.roof, 1.3)); }
  if (v.barn) { for (let i = 0; i < 24; i++) { const ww = w - 8 - Math.abs(12 - i) * 0; R(c, 4 + Math.max(0, 12 - i) * 0, top - 24 + i * 2, ww, 2, i < 2 ? INK : v.roof); } R(c, w / 2 - 20, top - 30, 40, 8, INK); R(c, w / 2 - 18, top - 29, 36, 6, '#f2e2c0'); }
  if (v.stands) { for (let i = 0; i < 5; i++) { R(c, 6 + i * 4, top - 22 + i * 6, w - 12 - i * 8, 6, i % 2 ? shade(v.wall, 1.2) : v.roof); for (let j = 0; j < (w - 20) / 10; j++) if (hz(j, i, 7) < 0.55) R(c, 12 + i * 4 + j * 10, top - 26 + i * 6, 4, 4, ['#f2cc68', '#ff9ac0', '#9fd6f0', '#fff'][(i + j) % 4]); } for (const fx of [8, w - 12]) { R(c, fx, top - 40, 4, 30, '#c8c8d2'); R(c, fx - 6, top - 46, 16, 8, night ? '#fff6c0' : '#e8e8f0'); } }
  if (v.blocks) { for (const [bx, by, bw, bh, col] of [[6, -26, 40, 26, '#3a7ad0'], [52, -40, 36, 40, '#7cbf5a'], [96, -30, 44, 30, '#e08a2a'], [146, -50, 34, 50, '#d0503a'], [190, -22, 40, 22, '#3a7ad0'], [236, -36, 40, 36, '#7cbf5a'], [282, -26, 40, 26, '#d4a640'], [326, -44, 50, 44, '#3a7ad0']]) if (bx + bw < w) { R(c, bx, top + by, bw, bh + 2, INK); R(c, bx + 2, top + by + 2, bw - 4, bh, col); R(c, bx + 2, top + by + 2, bw - 4, 4, shade(col, 1.25)); } }
  if (v.checker) { for (let i = 0; i < w / 8; i++) for (let j = 0; j < 3; j++) R(c, i * 8, top - 22 + j * 6, 8, 6, (i + j) % 2 ? INK : '#f2f2e8'); R(c, 0, top - 4, w, 4, v.roof); }
  if (!v.dome && !v.barn && !v.stands && !v.blocks && !v.checker) R(c, 0, top - 10, w, 10, v.roof);
  R(c, 2, top, w - 4, h - (top - o), INK); R(c, 4, top + 2, w - 8, h - (top - o) - 2, v.wall); R(c, 4, top + 2, w - 8, 5, shade(v.wall, 1.2)); for (let i = 0; i < Math.floor(w / 40); i++) { const wx = 18 + i * 40; if (Math.abs(wx + 12 - w / 2) < 40) continue; R(c, wx, top + 30, 24, 28, INK); R(c, wx + 2, top + 32, 20, 24, night ? '#ffe9a0' : '#9fd6f0'); R(c, wx + 11, top + 32, 2, 24, INK); }
  // banner: district name (generic) + cabinet label on a plaque over the door
  const bw = Math.min(w - 40, 150); R(c, w / 2 - bw / 2 - 2, top + 8, bw + 4, 18, INK); R(c, w / 2 - bw / 2, top + 10, bw, 14, GOLD); text(c, v.title, w / 2, top + 17.5, INK, 7);
  const pl = label(cab).toUpperCase(), pw = Math.min(w - 20, Math.max(80, pl.length * 6 + 16)); R(c, w / 2 - pw / 2 - 2, o + h - 60, pw + 4, 16, INK); R(c, w / 2 - pw / 2, o + h - 58, pw, 12, cab.live ? '#2a8a4a' : '#5a5e6a'); text(c, cab.live ? pl : `${pl} - SOON`, w / 2, o + h - 52, CREAM, 5);
  doorFace(c, s, Math.round(w / 2 - 12), o + h - 34, cab, night); R(c, 0, o + h - 2, w, 2, '#2a2e3a'); }
// depth prop for one structure: blit the baked sprite; live doors get a soft blinking OPEN light, venue flags wave
export function structProp(s, t, night, rm) { const x = s.x * ST, y = s.y * ST, cab = cabinet(s.id);
  return { y: (s.y + s.h - 1) * ST + 2, d: (c) => { /* sorted at the alcove's top edge so a pup in the doorway draws in front */ c.drawImage(bake(s, night), x, y - PAD, s.w * ST, s.h * ST + PAD); if (!cab) return; const dx = (s.door[0]) * ST, dy = (s.y + s.h) * ST;
    if (cab.live) { const on = rm || Math.sin(t * 3 + s.x) > -0.3; R(c, dx + 4, dy - 44, 24, 8, INK); R(c, dx + 5, dy - 43, 22, 6, on ? '#5aff9a' : '#2a8a4a'); text(c, 'OPEN', dx + 16, dy - 39.5, INK, 4); }
    if (s.kind !== 'booth') { const fx = x + 10, w = rm ? 0 : Math.round(Math.sin(t * 4 + s.x) * 2); R(c, fx, y - 48, 2, 22, '#c8c8d2'); R(c, fx + 2, y - 48, 12, 7, district(s.district)?.col || GOLD); R(c, fx + 14, y - 47 + w, 2, 5, district(s.district)?.col || GOLD); } } }; }
// hub signpost beside the Arcade hall pointing at the districts gate
export function hubSignProp(tx, ty, t) { const x = tx * ST, y = ty * ST; return { y: y + ST - 2, d: (c) => { R(c, x + 14, y - 14, 4, 44, '#5a4a3a'); R(c, x - 18, y - 36, 68, 24, INK); R(c, x - 17, y - 35, 66, 22, '#6c4fd0'); text(c, 'ARCADE DISTRICTS', x + 16, y - 28, CREAM, 4); text(c, 'EAST >   A: TRAVEL', x + 16, y - 19, GOLD, 4); } }; }
export const clearArtCache = () => sprite.clear();
// signs are baked text: re-bake once the pixel font is ready (otherwise the fallback font would stick)
try { globalThis.document?.fonts?.load?.('8px Silkscreen').then(() => sprite.clear()).catch(() => {}); } catch {}

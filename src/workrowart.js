// Living-town preview art: Orchard Row buildings, work stations, carried goods, tools, moods and town-event scenery.
// All pixel art is drawn in code with the building kit from bldgfx.js, so it shares the town's ink outlines, top-left sun,
// night windows, rain sheen and seasonal decorations. Workers themselves are the game's own Shiba sprites (drawShiba).
import { TILE } from './world.js';
import { lotById } from './townproposal.js';
import { drawBuilding, registerPainter, KIT, ptext, nightK, shade, INK } from './bldgfx.js';

const WORKPLACE_X = { candles: 87.2 };
const { R, A, hash, wall, gable, roofBand, chimney, win, flowerBox, awning, door, sign, streetLamp, dropShadow, steam, picket, slatFence, planks, flagpole, wavingFlag } = KIT;

export const ROW_F = Object.freeze({
  orchard: { wall: '#b8743a', roof: '#6a3a1e', accent: '#ff7a5a', trim: '#fff4e0', signBg: '#3a2410', sign: '#ffd8a0', glow: '#ffb070' },
  apiary: { wall: '#e8b838', roof: '#6a4a14', accent: '#ffe07a', trim: '#fff8e0', signBg: '#3a2a08', sign: '#ffe890', glow: '#ffd060' },
  dairy: { wall: '#c8382e', roof: '#5a2a24', accent: '#f4f0e8', trim: '#ffffff', signBg: '#3a1410', sign: '#fff0e0', glow: '#ffd8a0' },
  pottery: { wall: '#c86a48', roof: '#5a3428', accent: '#f0b088', trim: '#fff0e0', signBg: '#3a1c14', sign: '#ffd0b0', glow: '#ff9a60' },
  carpentry: { wall: '#9a6a3a', roof: '#4a3020', accent: '#e8c890', trim: '#f8ecd8', signBg: '#2a1a0e', sign: '#ffe0a8', glow: '#e8b060' },
  post: { wall: '#2f5fa8', roof: '#1a2c58', accent: '#e83a3a', trim: '#f4f4fa', signBg: '#a82828', sign: '#fff4d0', glow: '#ffd060' },
  print: { wall: '#4a4a5a', roof: '#22222c', accent: '#2ec8d8', trim: '#e8f0f4', signBg: '#141a2e', sign: '#9ff4ff', glow: '#7ae8ff' },
  sheep: { wall: '#d8c8a0', roof: '#5a4a3a', accent: '#f4f0e8', trim: '#fffaf0', signBg: '#2a2418', sign: '#fff4dc', glow: '#ffe0a0' },
  teagarden: { wall: '#5a8a4a', roof: '#2a4a24', accent: '#c8e890', trim: '#f4fae8', signBg: '#1a2a14', sign: '#d8ffb0', glow: '#e8ffa0' },
  candles: { wall: '#8a3a5a', roof: '#3a1a2a', accent: '#ffd84a', trim: '#fff0f4', signBg: '#2a0e1a', sign: '#ffe0a0', glow: '#ffb040' },
});

const geoBox = (b) => ({ x: b.x * TILE, y: b.y * TILE, w: b.w * TILE, h: b.h * TILE, base: (b.y + b.h) * TILE });
const doorX = (b) => (b.door[0] + 0.5) * TILE;

// ---------------------------------------------------------------- building painters (cached static layers)
function smallShed(c, x, base, w, h, F, V, label, ic) {
  const top = base - h;
  dropShadow(c, x, base, w);
  wall(c, x, top, w, h, F.wall, 'plank', V, { ph: 6 });
  gable(c, x - 6, x + w + 6, top + 2, top - 22, F.roof, { style: 'shingle' });
  sign(c, x + w / 2, top - 30, label, F, V, { maxW: Math.max(90, w + 30), icon: ic, k: 1 });
}
registerPainter('orchard', {
  paint(c, b, F, V, g) { const { x, y, w, base } = g;
    // tilled rows and a fruit shed at the back left; trees are separate props so pickers can stand between them
    R(c, x, y + 30, w, base - y - 30, '#6aa04a');
    for (let yy = y + 40; yy < base - 8; yy += 14) { R(c, x + 6, yy, w - 12, 4, '#7a5a34'); R(c, x + 6, yy, w - 12, 1, '#9a7a4a'); }
    smallShed(c, x + 4, y + 50, 60, 40, F, V, 'ORCHARD', 'star');
    R(c, x + 18, y + 38, 22, 12, INK); R(c, x + 19, y + 39, 20, 10, V.night ? '#ffd27a' : '#3a2410');
  },
});
registerPainter('apiary', {
  paint(c, b, F, V, g) { const { x, y, w, base } = g;
    R(c, x, y + 30, w, base - y - 30, '#78b050');
    for (let i = 0; i < 26; i++) { const fx = x + 6 + hash(i, 3, 7) * (w - 12), fy = y + 50 + hash(i, 4, 7) * (base - y - 60); R(c, fx, fy, 3, 3, ['#ffd84a', '#ffffff', '#c88aff', '#ff7aa8'][i % 4]); R(c, fx + 1, fy + 3, 1, 3, '#2e6e30'); }
    smallShed(c, x + w - 66, y + 52, 58, 40, F, V, 'APIARY', 'paw');
    R(c, x + w - 44, y + 34, 14, 18, INK); R(c, x + w - 43, y + 35, 12, 17, '#6a4a14');
  },
});
registerPainter('dairy', {
  paint(c, b, F, V, g) { const { x, y, w, base } = g;
    R(c, x, y + 40, w, base - y - 40, '#7ab050');
    // red barn at the back
    const bx = x + 6, bw = 92, top = y + 10, bb = y + 64;
    dropShadow(c, bx, bb, bw);
    wall(c, bx, top, bw, bb - top, F.wall, 'plank', V, { ph: 5, vertical: true });
    gable(c, bx - 8, bx + bw + 8, top + 2, top - 28, F.roof, { style: 'shingle' });
    R(c, bx + 30, top + 18, 32, bb - top - 18, INK); R(c, bx + 32, top + 20, 28, bb - top - 20, '#f4f0e8'); R(c, bx + 34, top + 22, 24, bb - top - 22, F.wall);
    R(c, bx + 34, top + 22, 24, 2, '#f4f0e8'); for (let k = 0; k < 24; k += 2) { R(c, bx + 34 + k, top + 22 + k * ((bb - top - 22) / 24), 2, 2, '#f4f0e8'); R(c, bx + 56 - k, top + 22 + k * ((bb - top - 22) / 24), 2, 2, '#f4f0e8'); }
    sign(c, bx + bw / 2, top - 40, 'DAIRY', F, V, { maxW: 110, icon: 'cup', k: 1 });
    // silo
    const sx = x + w - 54; R(c, sx - 2, y - 6, 34, 72, INK); R(c, sx, y - 4, 30, 68, '#c8ccd8'); for (let yy = y; yy < y + 62; yy += 8) R(c, sx, yy, 30, 1, '#9aa0b4'); R(c, sx, y - 4, 6, 68, '#e8ecf4');
    R(c, sx - 2, y - 14, 34, 10, INK); R(c, sx, y - 12, 30, 7, '#8a909c');
  },
});
registerPainter('pottery', {
  paint(c, b, F, V, g) { const { x, y, w, base } = g, top = y + 36;
    dropShadow(c, x, base, w);
    chimney(c, x + 20, y - 4, 30, '#7a4a3a'); // kiln flue
    wall(c, x, top, w, base - top, F.wall, 'stucco', V);
    roofBand(c, x - 6, top - 22, w + 12, 24, F.roof, { style: 'tile' });
    sign(c, x + w / 2, top - 44, b.name || 'POTTERY', F, V, { maxW: w + 20, icon: 'cup', k: 1 });
    win(c, x + 12, top + 18, 34, 28, F, V, { panes: [2, 2], curtains: false, inner: (cc, wx, wy, ww, wh) => { for (let i = 0; i < 3; i++) { R(cc, wx + 4 + i * 10, wy + wh - 12, 8, 10, ['#c86a48', '#e8c8a0', '#6a8ac8'][i]); R(cc, wx + 5 + i * 10, wy + wh - 14, 6, 2, INK); } } });
    if (g.dx != null) door(c, g.dx, base, F, V, { w: 24, h: 36, col: '#5a3428', lamps: false });
    // shelf of pots outside
    R(c, x + w - 46, base - 30, 42, 3, INK); R(c, x + w - 45, base - 29, 40, 2, '#8a5a3a'); R(c, x + w - 44, base - 27, 2, 27, INK); R(c, x + w - 8, base - 27, 2, 27, INK);
  },
  anim(c, b, F, t, g) { steam(c, g.x + 26, g.y - 12, t * 0.7, 4, '#d0c8c0'); },
});
registerPainter('carpentry', {
  paint(c, b, F, V, g) { const { x, y, w, base } = g, top = y + 18;
    dropShadow(c, x, base, w);
    wall(c, x, top, w, base - top, F.wall, 'plank', V, { ph: 6 });
    gable(c, x - 8, x + w + 8, top + 2, y - 26, F.roof, { style: 'shingle' });
    sign(c, x + w / 2, y - 18, "CARPENTER", F, V, { maxW: w + 30, icon: 'chair', k: 1 });
    // wide workshop doors open on a lit bench
    R(c, x + 8, top + 22, 70, base - top - 24, INK); R(c, x + 10, top + 24, 66, base - top - 26, V.night ? '#5a3a1a' : '#3a2410');
    for (let i = 0; i < 4; i++) R(c, x + 14 + i * 15, top + 30, 3, 14, ['#c9cede', '#9a6a3c', '#c9cede', '#e8c890'][i]);
    if (g.dx != null && Math.abs(g.dx - (x + 43)) > 40) door(c, g.dx, base, F, V, { w: 22, h: 34, col: '#5a3a20', lamps: false });
    win(c, x + w - 46, top + 22, 34, 24, F, V, { panes: [2, 2], curtains: false });
  },
});
registerPainter('post', {
  paint(c, b, F, V, g) { const { x, y, w, base } = g, top = y + 16;
    dropShadow(c, x, base, w);
    wall(c, x, top, w, base - top, F.wall, 'brick', V);
    roofBand(c, x - 6, top - 20, w + 12, 22, F.roof, { style: 'tile' });
    sign(c, x + w / 2, top - 38, 'POST OFFICE', F, V, { maxW: w + 40, icon: 'star', k: 1 });
    awning(c, x + 6, top + 6, w - 12, F.accent, '#f4f4fa', { h: 10, stripe: 8 });
    win(c, x + w - 54, top + 26, 44, 30, F, V, { panes: [3, 2], curtains: false });
    if (g.dx != null) door(c, g.dx, base, F, V, { w: 24, h: 34, col: '#1a2c58', glass: true, lamps: false });
    // red post box
    const px = x + w - 14; R(c, px - 1, base - 34, 14, 34, INK); R(c, px, base - 33, 12, 33, '#d82828'); R(c, px, base - 33, 12, 3, '#ff5a5a'); R(c, px + 2, base - 24, 8, 2, INK);
  },
  anim(c, b, F, t, g) { wavingFlag(c, { x: g.x + 6, y: g.y - 38, col: '#e83a3a', col2: '#f4f4fa' }, t, 14, 8); },
});
registerPainter('print', {
  paint(c, b, F, V, g) { const { x, y, w, base } = g, top = y + 16;
    dropShadow(c, x, base, w);
    chimney(c, x + w - 30, y - 10, 30, '#5a5a6a');
    wall(c, x, top, w, base - top, F.wall, 'panel', V, { pw: 24, ph: 16 });
    roofBand(c, x - 6, top - 18, w + 12, 20, F.roof, { style: 'shingle' });
    sign(c, x + w / 2, top - 36, 'PRINT SHOP', F, V, { maxW: w + 30, icon: 'bone', k: 1 });
    win(c, x + 8, top + 22, 62, 34, F, V, { panes: [3, 1], curtains: false, inner: (cc, wx, wy, ww, wh) => { R(cc, wx + 10, wy + 10, ww - 20, wh - 14, '#2a2a34'); R(cc, wx + 14, wy + 14, ww - 28, 6, '#9aa0b4'); R(cc, wx + 14, wy + 22, ww - 28, 3, '#f4f4f4'); } });
    if (g.dx != null && Math.abs(g.dx - (x + 39)) > 40) door(c, g.dx, base, F, V, { w: 22, h: 34, col: '#22222c', lamps: false });
  },
  anim(c, b, F, t, g) { steam(c, g.x + g.w - 24, g.y - 16, t * 0.8, 3, '#b8b8c4'); },
});

// Meadow Row (go-live pass): sheep meadow, tea garden, candle works.
registerPainter('sheep', {
  paint(c, b, F, V, g) { const { x, y, w, base } = g;
    R(c, x, y + 30, w, base - y - 30, '#86b858');
    for (let i = 0; i < 18; i++) { const fx = x + 6 + hash(i, 5, 9) * (w - 12), fy = y + 46 + hash(i, 6, 9) * (base - y - 56); R(c, fx, fy, 2, 3, '#5e9a3e'); }
    smallShed(c, x + w - 62, y + 54, 56, 40, F, V, 'SHEEP', 'star');
    R(c, x + w - 42, y + 36, 14, 18, INK); R(c, x + w - 41, y + 37, 12, 17, V.night ? '#ffd27a' : '#3a2a18');
    // wool bales by the shed
    for (let i = 0; i < 2; i++) { R(c, x + w - 76 + i * 12, y + 44, 12, 10, INK); R(c, x + w - 75 + i * 12, y + 45, 10, 8, '#f4f0e8'); }
  },
});
registerPainter('teagarden', {
  paint(c, b, F, V, g) { const { x, y, w, base } = g;
    R(c, x, y + 30, w, base - y - 30, '#7a5a34');
    // terraced tea rows; the bushes themselves are props so the picker can stand between them
    for (let yy = y + 44; yy < base - 6; yy += 18) { R(c, x + 4, yy + 10, w - 8, 3, '#5a4024'); }
    smallShed(c, x + 4, y + 46, 54, 36, F, V, 'TEA', 'cup');
    R(c, x + 22, y + 32, 14, 14, INK); R(c, x + 23, y + 33, 12, 13, V.night ? '#ffd27a' : '#1a2a14');
  },
});
registerPainter('candles', {
  paint(c, b, F, V, g) { const { x, y, w, base } = g, top = y + 18;
    dropShadow(c, x, base, w);
    chimney(c, x + 14, y - 6, 26, '#6a4a5a');
    wall(c, x, top, w, base - top, F.wall, 'brick', V, {});
    roofBand(c, x - 6, top - 18, w + 12, 20, F.roof, { style: 'shingle' });
    sign(c, x + w / 2, top - 36, 'CANDLES', F, V, { maxW: w + 30, icon: 'lamp', k: 1 });
    win(c, x + 10, top + 22, 56, 32, F, V, { panes: [2, 1], curtains: false, inner: (cc, wx, wy, ww, wh) => { for (let i = 0; i < 5; i++) { R(cc, wx + 6 + i * 10, wy + wh - 16, 4, 12, '#f8f0dc'); R(cc, wx + 7 + i * 10, wy + wh - 20, 2, 4, '#ffb030'); } } });
    if (g.dx != null && Math.abs(g.dx - (x + 38)) > 36) door(c, g.dx, base, F, V, { w: 22, h: 34, col: '#3a1a2a', lamps: true });
  },
  anim(c, b, F, t, g) { steam(c, g.x + 26, g.y - 8, t * 0.6, 2, '#c8b8c4'); },
});

export function drawRowBuilding(c, id) {
  const lot = lotById(id); if (!lot) return false;
  return drawBuilding(c, { id, name: lot.name, x: lot.x, y: lot.y, w: lot.w, h: lot.h, door: { tx: lot.door[0] } }, ROW_F[id]);
}

// ---------------------------------------------------------------- stations (dynamic props with their own depth)
const FRUIT_COL = { strawberries: '#e8283a', peaches: '#ffa060', apples: '#d8322a', lemons: '#ffe03a' };
function tree(c, x, base, season, harvest, t, k) {
  R(c, x - 3, base - 26, 6, 26, INK); R(c, x - 2, base - 26, 4, 26, '#7a4a24'); R(c, x - 2, base - 26, 1, 26, '#9a6a3c');
  A(c, 0.25, () => R(c, x - 14, base - 3, 28, 5, '#0a0e1e'));
  if (season === 'winter' && harvest !== 'lemons') { for (const [dx, dy] of [[-10, -34], [8, -36], [0, -44]]) R(c, x + dx, base + dy, 3, 12, '#7a4a24'); return; }
  const leaf = season === 'autumn' ? '#c8782a' : '#3f8a3a', leafL = season === 'autumn' ? '#e8a04a' : '#5aaa4a';
  R(c, x - 18, base - 52, 36, 30, INK); R(c, x - 16, base - 50, 32, 26, leaf); R(c, x - 12, base - 58, 24, 10, INK); R(c, x - 10, base - 56, 20, 8, leaf);
  R(c, x - 14, base - 48, 12, 6, leafL); R(c, x - 8, base - 55, 8, 4, leafL);
  if (season === 'spring') for (let i = 0; i < 9; i++) R(c, x - 14 + hash(i, x, 2) * 28, base - 54 + hash(i, x, 3) * 26, 3, 3, i % 3 ? '#ffd0e0' : '#ffffff');
  const col = FRUIT_COL[harvest] || '#d8322a';
  const n = Math.max(1, 5 - k);
  for (let i = 0; i < n; i++) R(c, x - 12 + hash(i, x, 5) * 24, base - 46 + hash(i, x, 6) * 18, 4, 4, col);
  if (season === 'autumn' && Math.floor(t * 2 + x) % 5 === 0) R(c, x - 10 + ((t * 9) % 20), base - 20 + ((t * 13) % 18), 3, 2, '#e8a04a');
}
function hive(c, x, base, t, active) {
  R(c, x - 11, base - 26, 22, 26, INK); R(c, x - 10, base - 25, 20, 8, '#f4d06a'); R(c, x - 10, base - 16, 20, 7, '#e8b838'); R(c, x - 10, base - 8, 20, 6, '#d8a028');
  R(c, x - 12, base - 28, 24, 4, INK); R(c, x - 11, base - 27, 22, 2, '#8a6a2a'); R(c, x - 3, base - 6, 6, 2, INK);
  if (!active) return;
  for (let i = 0; i < 3; i++) { const a = t * (3 + i) + i * 2 + x, bx = x + Math.cos(a) * (8 + i * 3), by = base - 34 + Math.sin(a * 1.3) * 6; R(c, bx, by, 3, 2, '#141a2e'); R(c, bx + 1, by - 1, 2, 1, '#ffd84a'); }
}
function cow(c, x, base, t, flip, blanket) {
  const s = flip ? -1 : 1, X = (v) => x + v * s - (s < 0 ? 1 : 0);
  A(c, 0.25, () => R(c, x - 20, base - 3, 40, 5, '#0a0e1e'));
  for (const lx of [-14, -8, 8, 13]) R(c, X(lx) - 2, base - 12, 4, 12, INK);
  R(c, x - 18, base - 30, 36, 20, INK); R(c, x - 17, base - 29, 34, 18, '#f4f0e8');
  R(c, X(-10) - 4, base - 28, 9, 7, '#2a2a34'); R(c, X(6) - 3, base - 22, 8, 6, '#2a2a34');
  if (blanket) { R(c, x - 12, base - 30, 20, 12, '#c8382e'); R(c, x - 12, base - 26, 20, 2, '#ffd84a'); }
  const nod = Math.round(Math.sin(t * 1.6 + x) * 1.5);
  R(c, X(18) - 1, base - 32 + nod, 12, 12, INK); R(c, X(19), base - 31 + nod, 10, 10, '#f4f0e8'); R(c, X(24), base - 26 + nod, 6, 5, '#f0a8b0'); R(c, X(20), base - 30 + nod, 2, 2, INK);
  R(c, X(19), base - 34 + nod, 3, 3, '#d8c8a0'); R(c, X(26), base - 34 + nod, 3, 3, '#d8c8a0');
  const sw = Math.round(Math.sin(t * 3 + x) * 3); R(c, X(-19) - 1, base - 28, 2, 12, INK); R(c, X(-20) + sw * s, base - 17, 3, 4, '#2a2a34');
}
function pot(c, x, base, col) { R(c, x - 5, base - 12, 10, 12, INK); R(c, x - 4, base - 11, 8, 10, col); R(c, x - 3, base - 13, 6, 2, INK); R(c, x - 3, base - 11, 2, 8, shade(col, 1.2)); }
function chair(c, x, base) { R(c, x - 7, base - 22, 3, 22, INK); R(c, x - 6, base - 22, 1, 22, '#c89060'); R(c, x - 7, base - 12, 14, 3, INK); R(c, x - 6, base - 12, 12, 2, '#c89060'); R(c, x + 4, base - 10, 3, 10, INK); R(c, x - 7, base - 22, 14, 3, INK); R(c, x - 6, base - 21, 12, 1, '#e8b080'); }
function crate(c, x, base, col) { R(c, x - 8, base - 12, 16, 12, INK); R(c, x - 7, base - 11, 14, 10, '#b8844a'); R(c, x - 7, base - 7, 14, 1, '#7a5a34'); for (let i = 0; i < 4; i++) R(c, x - 6 + i * 3, base - 14, 3, 3, col); }
function jar(c, x, base) { R(c, x - 4, base - 10, 8, 10, INK); R(c, x - 3, base - 9, 6, 8, '#ffb020'); R(c, x - 3, base - 11, 6, 2, '#f4f0e8'); R(c, x - 2, base - 8, 1, 5, '#ffe080'); }
function churn(c, x, base) { R(c, x - 5, base - 16, 10, 16, INK); R(c, x - 4, base - 15, 8, 14, '#c8ccd8'); R(c, x - 4, base - 15, 2, 14, '#eef0f6'); R(c, x - 3, base - 18, 6, 3, INK); R(c, x - 4, base - 9, 8, 2, '#8a909c'); }
function bundle(c, x, base) { R(c, x - 8, base - 8, 16, 8, INK); R(c, x - 7, base - 7, 14, 6, '#f4f4ee'); R(c, x - 7, base - 5, 14, 1, '#9aa0b4'); R(c, x - 1, base - 8, 2, 8, '#c8382e'); }
function sheep(c, x, base, t, flip, shorn) {
  const s = flip ? -1 : 1, X = (v) => x + v * s - (s < 0 ? 1 : 0);
  A(c, 0.25, () => R(c, x - 14, base - 3, 28, 4, '#0a0e1e'));
  for (const lx of [-9, -4, 5, 9]) R(c, X(lx) - 1, base - 9, 3, 9, INK);
  const body = shorn ? '#e8dcc0' : '#f8f6f0', bw = shorn ? 22 : 28;
  R(c, x - bw / 2 - 1, base - 23, bw + 2, 16, INK); R(c, x - bw / 2, base - 22, bw, 14, body);
  if (!shorn) for (let i = 0; i < 4; i++) R(c, x - 11 + i * 6, base - 24, 5, 3, body);
  const nod = Math.round(Math.sin(t * 1.8 + x) * 1.5);
  R(c, X(12) - 1, base - 24 + nod, 9, 9, INK); R(c, X(13), base - 23 + nod, 7, 7, '#2a2a34'); R(c, X(17), base - 21 + nod, 2, 2, '#f4f4f4');
}
function teaBush(c, x, base, picked) {
  R(c, x - 13, base - 14, 26, 14, INK); R(c, x - 12, base - 13, 24, 12, '#3e7a32'); R(c, x - 12, base - 13, 24, 3, '#5ea048');
  const tips = Math.max(0, 5 - picked); for (let i = 0; i < tips; i++) R(c, x - 10 + i * 5, base - 16, 3, 3, '#a8e070');
}
function candle(c, x, base) { R(c, x - 3, base - 12, 6, 12, INK); R(c, x - 2, base - 11, 4, 10, '#f8f0dc'); R(c, x - 1, base - 15, 2, 3, '#ffb030'); }
function woolBale(c, x, base) { R(c, x - 7, base - 10, 14, 10, INK); R(c, x - 6, base - 9, 12, 8, '#f4f0e8'); R(c, x - 6, base - 6, 12, 1, '#c8c0b0'); }
function teaChest(c, x, base) { R(c, x - 7, base - 10, 14, 10, INK); R(c, x - 6, base - 9, 12, 8, '#7a4a24'); R(c, x - 4, base - 7, 8, 4, '#a8e070'); }
function letter(c, x, base) { R(c, x - 5, base - 6, 10, 6, INK); R(c, x - 4, base - 5, 8, 4, '#f8f0dc'); R(c, x - 4, base - 5, 8, 1, '#c8382e'); }

const DROP_ART = { fruit: crate, honey: jar, milk: churn, pots: (c, x, b) => pot(c, x, b, '#c86a48'), chairs: chair, letters: letter, papers: bundle, wool: woolBale, tea: teaChest, candles: (c, x, b) => { candle(c, x - 4, b); candle(c, x + 4, b); } };
// a short world-space puff where a delivery was just used: steam for drinks and baking, a warm glow for candles, a stitch spark for wool
const SERVE_FX = {
  // a mug with steam rising: the drink (or bake) was just served
  steam: (c, x, b, k, t) => { A(c, Math.max(0.6, k), () => { R(c, x - 7, b - 14, 14, 12, INK); R(c, x - 6, b - 13, 12, 10, '#f4f0e8'); R(c, x - 6, b - 13, 12, 3, '#c89060'); R(c, x + 6, b - 11, 4, 6, INK); R(c, x + 7, b - 10, 2, 4, '#f4f0e8'); });
    for (let i = 0; i < 3; i++) { const ph = (t * 0.9 + i / 3) % 1; A(c, (1 - ph) * k, () => R(c, x - 5 + i * 4, b - 18 - ph * 20, 3, 5, '#ffffff')); } },
  // a lit candle with a warm halo: the candle is burning in the window
  glow: (c, x, b, k, t) => { A(c, 0.45 * k * (0.8 + 0.2 * Math.sin(t * 9)), () => R(c, x - 12, b - 28, 24, 24, '#ffd060')); A(c, Math.max(0.6, k), () => { R(c, x - 3, b - 14, 6, 14, INK); R(c, x - 2, b - 13, 4, 12, '#f8f0dc'); R(c, x - 2, b - 19, 4, 5, '#ffb030'); R(c, x - 1, b - 21, 2, 2, '#fff0a0'); }); },
  // a four-point sparkle over the door: the goods were put to use
  spark: (c, x, b, k, t) => { const f = Math.floor(t * 6) % 2, s = 4 + f * 2; A(c, Math.max(0.6, k), () => { R(c, x - 1, b - 22 - s, 3, s * 2 + 1, '#ffd84a'); R(c, x - 1 - s, b - 22, s * 2 + 3, 3, '#ffd84a'); R(c, x, b - 22, 1, 1, '#ffffff'); }); },
};
const FX_OF = { milk: 'steam', tea: 'steam', honey: 'steam', candles: 'glow' };

/** props for stations, delivered goods and lane scenery. env: { workers: [{w, at}], season, harvest, t, upgrades, fire, hall, market, night } */
export function rowProps(env) {
  const list = [];
  const t = env.t || 0;
  const push = (y, d) => list.push({ y, d });
  // yard lots: back layer first (sorted at the top of the lot), front fence at the bottom
  for (const id of ['orchard', 'apiary', 'dairy']) {
    const lot = lotById(id); if (!lot) continue; const g = geoBox(lot);
    push(g.y + 8, (c) => drawRowBuilding(c, id));
    push(g.base - 1, (c) => { if (id === 'dairy') slatFence(c, g.x + 2, g.x + g.w - 2, g.base, [doorX(lot) - 14, doorX(lot) + 14]); else picket(c, g.x + 2, g.x + g.w - 2, g.base, '#f8f4ec', [doorX(lot) - 14, doorX(lot) + 14]); });
  }
  for (const id of ['pottery', 'carpentry', 'post', 'print']) { const lot = lotById(id); if (lot) push((lot.y + lot.h) * TILE - 1, (c) => drawRowBuilding(c, id)); }
  for (const id of ['sheep', 'teagarden']) {
    const lot = lotById(id); if (!lot) continue; const g = geoBox(lot);
    push(g.y + 8, (c) => drawRowBuilding(c, id));
    push(g.base - 1, (c) => { if (id === 'sheep') slatFence(c, g.x + 2, g.x + g.w - 2, g.base, [doorX(lot) - 14, doorX(lot) + 14]); else picket(c, g.x + 2, g.x + g.w - 2, g.base, '#e8f0d8', [doorX(lot) - 14, doorX(lot) + 14]); });
  }
  { const lot = lotById('candles'); if (lot) push((lot.y + lot.h) * TILE - 1, (c) => drawRowBuilding(c, 'candles')); }
  const W = Object.fromEntries((env.workers || []).map((r) => [r.w.id, r.at]));
  // orchard trees (fruit thins out as the picker works through the day)
  { const lot = lotById('orchard'); if (lot) { const g = geoBox(lot), k = W.pip ? Math.min(4, W.pip.made) : 0;
    for (const [dx, dy] of [[108, 62], [150, 62], [196, 62], [86, 104], [128, 104], [172, 104], [212, 104]]) if (dx < g.w - 6) push(g.y + dy, (c) => tree(c, g.x + dx, g.y + dy, env.season, env.harvest, t, k)); } }
  { const lot = lotById('apiary'); if (lot) { const g = geoBox(lot), active = !env.rain && env.season !== 'winter' && !env.night;
    for (const [dx, dy] of [[16, 76], [44, 76], [16, 112], [44, 112], [130, 112]]) push(g.y + dy, (c) => hive(c, g.x + dx, g.y + dy, t, active)); } }
  { const lot = lotById('dairy'); if (lot) { const g = geoBox(lot); const winter = env.season === 'winter';
    push(g.y + 96, (c) => cow(c, g.x + 130, g.y + 96, t, false, winter)); push(g.y + 112, (c) => cow(c, g.x + 46, g.y + 112, t, true, winter));
    const made = W.clover ? Math.min(3, W.clover.made % 4) : 0; for (let i = 0; i < made; i++) push(g.y + 120, (c) => churn(c, g.x + 150 + i * 12, g.y + 120)); } }
  // sheep in the meadow: the one next to the shepherd is shorn while Woolly works; wool bales pile by the gate until carried off
  { const lot = lotById('sheep'); if (lot) { const g = geoBox(lot), wk = W.woolly && W.woolly.kind === 'work';
    push(g.y + 104, (c) => sheep(c, g.x + 30, g.y + 104, t, false, wk && W.woolly.f > 0.5));
    push(g.y + 80, (c) => sheep(c, g.x + 70, g.y + 80, t, true, false));
    push(g.y + 116, (c) => sheep(c, g.x + 96, g.y + 116, t, true, false));
    const bales = W.woolly ? Math.max(0, Math.min(3, W.woolly.made - W.woolly.delivered - (W.woolly.carry === 'wool' ? 1 : 0))) : 0;
    for (let i = 0; i < bales; i++) push(g.base - 2, (c) => woolBale(c, g.x + 14 + i * 16, g.base - 4)); } }
  // tea bushes thin out while Matcha picks; picked leaves fill the basket chest by the shed
  { const lot = lotById('teagarden'); if (lot) { const g = geoBox(lot), k = W.matcha ? Math.min(4, W.matcha.made) : 0;
    for (const [dx, dy] of [[80, 70], [120, 70], [70, 106], [110, 106], [146, 106]]) if (dx < g.w - 8) push(g.y + dy, (c) => teaBush(c, g.x + dx, g.y + dy, k)); } }
  // candle works: dipping vat in front, finished candles on the rack
  { const lot = lotById('candles'); if (lot) { const g = geoBox(lot), vx = WORKPLACE_X.candles * TILE + 26, base = g.base + 10;
    const dipping = W.taper && W.taper.kind === 'work';
    push(base - 2, (c) => { R(c, vx - 10, base - 14, 20, 14, INK); R(c, vx - 9, base - 13, 18, 12, '#5a5a6a'); R(c, vx - 8, base - 13, 16, 3, '#f8e8b0'); if (dipping) A(c, 0.6, () => R(c, vx - 4, base - 20 - (Math.floor(t * 3) % 2) * 2, 3, 4, '#f4f4fa')); });
    const rack = W.taper ? Math.max(0, Math.min(4, W.taper.made * 2 - W.taper.delivered * 2 - (W.taper.carry === 'candles' ? 2 : 0))) : 0;
    for (let i = 0; i < rack; i++) push(g.base - 1, (c) => candle(c, g.x + g.w - 34 + i * 7, g.base - 2)); } }
  // pottery wheel + finished pots on the shelf
  { const lot = lotById('pottery'); if (lot) { const g = geoBox(lot), wx = (82.2) * TILE, base = g.base + 6;
    const working = W.kiln && W.kiln.kind === 'work';
    push(base - 2, (c) => { R(c, wx - 10, base - 10, 20, 4, INK); R(c, wx - 9, base - 9, 18, 2, '#8a909c'); R(c, wx - 2, base - 6, 4, 6, INK);
      if (working) { const f = Math.floor(t * 10) % 2; R(c, wx - 5, base - 20, 10, 10, INK); R(c, wx - 4, base - 19, 8, 9, '#c86a48'); R(c, wx - 4 + f * 4, base - 18, 2, 7, '#e8a080'); } });
    const shelf = W.kiln ? Math.min(4, W.kiln.made - W.kiln.delivered + (W.kiln.kind === 'walk' && W.kiln.carry === 'pots' ? -1 : 0)) : 0;
    for (let i = 0; i < Math.max(0, shelf); i++) push(g.base - 2, (c) => pot(c, g.x + g.w - 38 + i * 10, g.base - 30, ['#c86a48', '#6a8ac8', '#e8c8a0', '#6aa04a'][i])); } }
  // carpenter bench + finished chairs
  { const lot = lotById('carpentry'); if (lot) { const g = geoBox(lot), bx = 62.0 * TILE, base = g.base + 4;
    push(base - 4, (c) => { R(c, bx - 18, base - 16, 36, 4, INK); R(c, bx - 17, base - 15, 34, 2, '#c89060'); R(c, bx - 16, base - 12, 3, 12, INK); R(c, bx + 13, base - 12, 3, 12, INK);
      if (W.chip && W.chip.kind === 'work') { R(c, bx - 10, base - 20, 22, 4, INK); R(c, bx - 9, base - 19, 20, 2, '#e8c890'); if (Math.floor(t * 8) % 2) R(c, bx + 12, base - 8, 3, 2, '#e8c890'); } });
    const done = W.chip ? Math.max(0, Math.min(3, W.chip.made - W.chip.delivered - (W.chip.carry === 'chair' ? 1 : 0))) : 0;
    for (let i = 0; i < done; i++) push(base, (c) => chair(c, g.x + g.w - 18 - i * 14, base)); } }
  // post office sorting table, print shop bundle stack
  { const lot = lotById('post'); if (lot) { const g = geoBox(lot), bx = 73.1 * TILE, base = g.base + 4;
    push(base - 4, (c) => { R(c, bx - 16, base - 14, 32, 4, INK); R(c, bx - 15, base - 13, 30, 2, '#8a5a3a'); R(c, bx - 14, base - 10, 3, 10, INK); R(c, bx + 11, base - 10, 3, 10, INK);
      if (W.letty && W.letty.kind === 'work') for (let i = 0; i < 3; i++) letter(c, bx - 9 + i * 9, base - 13 + ((Math.floor(t * 3) + i) % 2)); }); } }
  { const lot = lotById('print'); if (lot) { const g = geoBox(lot), px = 79.1 * TILE, base = g.base + 4;
    push(base - 4, (c) => { R(c, px - 16, base - 22, 32, 22, INK); R(c, px - 15, base - 21, 30, 20, '#3a3a48'); const k = W.inky && W.inky.kind === 'work' ? Math.floor(t * 4) % 2 : 0; R(c, px - 12, base - 18 + k * 4, 24, 4, '#9aa0b4'); R(c, px - 10, base - 6, 20, 3, '#f4f4ee'); });
    const stack = W.inky && W.inky.kind === 'work' ? Math.min(3, Math.floor(W.inky.f * 4)) : 0; for (let i = 0; i < stack; i++) push(base, (c) => bundle(c, g.x + g.w - 16, base - i * 7)); } }
  // delivered goods sit by the door they went to (today's count, a few shown)
  // the pile is what is still waiting (delivered minus used); when the place uses one, a short puff shows the service
  const slot = new Map();
  for (const p of env.stock || []) { const lot = lotById(p.lot); if (!lot) continue; const art = DROP_ART[p.good]; if (!art) continue;
    const k = slot.get(p.lot) || 0; slot.set(p.lot, k + 1);
    const bx = (lot.door[0] + 0.5) * TILE + 22 + k * 34, by = (lot.door[1] + 0.5) * TILE + 2, n = Math.min(4, p.stock);
    for (let i = 0; i < n; i++) push(by + i * 0.01, (c) => art(c, bx + (i % 2) * 16, by - Math.floor(i / 2) * 10));
    if (p.servedAgo != null && p.servedAgo < (env.serveFxS || 12)) { const kk = 1 - p.servedAgo / (env.serveFxS || 12), fx = SERVE_FX[FX_OF[p.good] || 'spark'], fx0 = (lot.door[0] + 0.5) * TILE + 14; push(by + 0.05, (c) => fx(c, fx0, by - 4, kk, t)); } }
  // town events
  if (env.fire && (env.fire.on || env.fire.after)) push(((lotById(env.fire.lot)?.y || 0) + (lotById(env.fire.lot)?.h || 0)) * TILE + 0.5, (c) => drawFire(c, env.fire, t));
  if (env.hall) push((59 + 5) * TILE - 1, (c) => drawHall(c, env.hall, t, env.upgrades));
  if (env.market) push((58 + 3) * TILE + 6, (c) => drawMarket(c, t, env.harvest));
  // town-wide upgrades along Orchard Lane
  const up = new Set(env.upgrades?.done || []);
  if (up.has('lamps')) for (const tx of [66, 71, 77, 84]) push(28 * TILE - 2, (c) => streetLamp(c, tx * TILE + 16, 28 * TILE - 2, { night: nightK() > 0.5 }));
  if (up.has('flowers')) for (const id of ['pottery', 'carpentry', 'post', 'print']) { const lot = lotById(id); if (lot) push((lot.y + lot.h) * TILE + 0.2, (c) => flowerBox(c, lot.x * TILE + 8, (lot.y + lot.h) * TILE - 6, 30)); }
  if (up.has('benches')) for (const tx of [69, 81]) push(28.3 * TILE, (c) => { const x = tx * TILE, b = 28.3 * TILE; R(c, x - 1, b - 12, 30, 4, INK); R(c, x, b - 11, 28, 2, '#a87048'); R(c, x + 2, b - 8, 3, 8, INK); R(c, x + 23, b - 8, 3, 8, INK); });
  if (up.has('arch')) push(26.2 * TILE, (c) => { const x0 = 61 * TILE - 6, x1 = 62 * TILE + 38, top = 26 * TILE - 70; R(c, x0, top, 6, 72, INK); R(c, x1, top, 6, 72, INK); R(c, x0 + 1, top, 4, 72, '#c89060'); R(c, x1 + 1, top, 4, 72, '#c89060'); R(c, x0 - 4, top - 14, x1 - x0 + 14, 16, INK); R(c, x0 - 3, top - 13, x1 - x0 + 12, 14, '#3a2410'); ptext(c, 'ORCHARD ROW', (x0 + x1 + 6) / 2, top - 6, '#ffd8a0', 1); });
  return list;
}

function drawFire(c, fire, t) {
  const lot = lotById(fire.lot); if (!lot) return;
  const x = (lot.x + lot.w / 2) * TILE, y = lot.y * TILE + 40;
  if (fire.on) { const k = Math.max(0.25, fire.k);
    const tongue = (fx, h, w, col) => { for (let r = 0; r < h; r += 2) { const ww = Math.max(2, Math.round(w * (1 - r / h) * (0.8 + 0.2 * Math.sin(t * 13 + fx + r)))); R(c, Math.round(fx - ww / 2 + Math.sin(t * 7 + r * 0.3 + fx) * 1.5), y - r - 2, ww, 2, col); } };
    for (let i = 0; i < 7; i++) { const fx = x - 42 + i * 14, h = Math.round((22 + 18 * Math.abs(Math.sin(t * 5 + i * 1.7))) * k);
      tongue(fx, h + 4, 18, '#c83a10'); tongue(fx, h, 14, '#ff7a1e'); tongue(fx, Math.round(h * 0.6), 8, '#ffd84a'); }
    A(c, 0.25 + 0.1 * Math.sin(t * 8), () => R(c, lot.x * TILE + 8, y, lot.w * TILE - 16, 40, '#ff8a2a'));
    // water arcs from the bucket line
    const d = lot.door; const bx = (d[0] + 0.5) * TILE;
    for (let i = 0; i < 5; i++) { const u = ((t * 1.6 + i / 5) % 1); R(c, bx + (x - bx) * u - 1, (d[1] + 0.5) * TILE - 30 - Math.sin(u * Math.PI) * 50 + (y - (d[1] + 0.5) * TILE + 30) * u, 3, 3, '#8ad0ff'); }
  }
  for (let i = 0; i < 4; i++) { const ph = (t * 0.5 + i / 4) % 1; A(c, (1 - ph) * (fire.on ? 0.6 : 0.4), () => R(c, x - 8 + Math.sin(t + i) * 6, y - 20 - ph * 40, 10 + ph * 8, 8 + ph * 6, '#9aa0b4')); }
  if (fire.after) { R(c, x - 32, y - 52, 64, 14, INK); R(c, x - 31, y - 51, 62, 12, '#2e7a3a'); ptext(c, 'ALL CLEAR', x, y - 45, '#e8ffe0', 1); }
}

function drawHall(c, hall, t, upgrades) {
  const x = 40 * TILE, y = 59 * TILE, w = 6 * TILE, base = (59 + 5) * TILE, s = hall.stage;
  // pegs + string line
  for (const [px, py] of [[x + 4, y + 30], [x + w - 6, y + 30], [x + 4, base - 6], [x + w - 6, base - 6]]) { R(c, px, py - 8, 3, 9, INK); R(c, px, py - 8, 2, 8, '#c89060'); }
  R(c, x + 5, y + 24, w - 10, 1, '#f4f4f4'); R(c, x + 5, base - 12, w - 10, 1, '#f4f4f4');
  if (s >= 1) { R(c, x + 6, base - 22, w - 12, 18, INK); R(c, x + 7, base - 21, w - 14, 16, '#a8a49a'); for (let i = 10; i < w - 12; i += 16) R(c, x + i, base - 21, 1, 16, '#8a867c'); }
  if (s >= 2) for (let i = 0; i < 5; i++) { const px = x + 14 + i * ((w - 30) / 4); R(c, px, y + 10, 4, base - y - 30, INK); R(c, px + 1, y + 10, 2, base - y - 30, '#c89060'); }
  if (s >= 2) { R(c, x + 12, y + 8, w - 24, 4, INK); R(c, x + 13, y + 9, w - 26, 2, '#c89060'); }
  if (s >= 3) { R(c, x + 12, y + 30, w - 24, base - y - 52, INK); R(c, x + 13, y + 31, w - 26, base - y - 54, '#e8dcc8'); for (const wx of [x + 26, x + w - 54]) { R(c, wx, y + 44, 28, 26, INK); R(c, wx + 1, y + 45, 26, 24, '#7ab0e0'); } }
  if (s >= 4) gable(c, x + 6, x + w - 6, y + 12, y - 30, '#4a3a6a', { style: 'tile' });
  if (s >= 5) { R(c, x + w / 2 - 14, base - 54, 28, 32, INK); R(c, x + w / 2 - 13, base - 53, 26, 31, '#6a3e1e'); R(c, x + 10, y + 16, w - 20, 12, INK); R(c, x + 11, y + 17, w - 22, 10, '#1f2d5c'); ptext(c, 'TOWN HALL', x + w / 2, y + 22, '#ffd84a', 1);
    if (upgrades?.done?.includes('clock')) { R(c, x + w / 2 - 9, y - 24, 18, 18, INK); R(c, x + w / 2 - 8, y - 23, 16, 16, '#f4f0e8'); const a = t * 0.2; R(c, x + w / 2, y - 15, Math.round(Math.cos(a) * 5) || 1, 1, INK); R(c, x + w / 2, y - 15, 1, -5, INK); } }
  if (s >= 2 && s < 5) { // light scaffold at the two sides only
    for (const px of [x + 2, x + w - 6]) { R(c, px, y - 6, 4, base - y, INK); R(c, px + 1, y - 6, 2, base - y, '#9aa0b4'); }
    for (const yy of [y + 20, y + 70]) { R(c, x + 2, yy, 10, 3, '#9aa0b4'); R(c, x + w - 12, yy, 10, 3, '#9aa0b4'); }
  }
  if (s < 5) { // materials + progress board
    for (let i = 0; i < 3; i++) { R(c, x + 10, base - 8 - i * 4, 30, 4, INK); R(c, x + 11, base - 7 - i * 4, 28, 2, '#c89060'); }
    for (let i = 0; i < 2; i++) for (let j = 0; j < 3 - i; j++) { R(c, x + w - 46 + j * 9 + i * 4, base - 10 - i * 6, 8, 6, INK); R(c, x + w - 45 + j * 9 + i * 4, base - 9 - i * 6, 6, 4, '#b4583a'); }
    const bw = 76, bx = x + w / 2 - bw / 2, by = base + 2; R(c, bx + 8, by - 4, 3, 10, INK); R(c, bx + bw - 11, by - 4, 3, 10, INK);
    R(c, bx, by - 26, bw, 24, INK); R(c, bx + 1, by - 25, bw - 2, 22, '#f4e8c8');
    ptext(c, 'TOWN HALL', bx + bw / 2, by - 21, '#3a2410', 1, null); ptext(c, hall.name.toUpperCase(), bx + bw / 2, by - 13, '#7a4a20', 1, null);
    R(c, bx + 4, by - 7, bw - 8, 3, '#8a7a5a'); R(c, bx + 4, by - 7, Math.round((bw - 8) * hall.pct / 100), 3, '#2e8a3a');
  }
}

function drawMarket(c, t, harvest) {
  const x = 36 * TILE, base = (58 + 3) * TILE + 6;
  for (let i = 0; i < 3; i++) { const sx = x - 30 + i * 52;
    R(c, sx, base - 34, 3, 34, INK); R(c, sx + 40, base - 34, 3, 34, INK);
    R(c, sx - 3, base - 42, 49, 10, INK); for (let k = 0; k < 47; k += 6) R(c, sx - 2 + k, base - 41, 6, 8, (k / 6) % 2 ? '#fff4e0' : ['#e8382e', '#2e8a3a', '#2f5fa8'][i]);
    R(c, sx, base - 16, 43, 6, INK); R(c, sx + 1, base - 15, 41, 4, '#b8844a');
    for (let k = 0; k < 4; k++) R(c, sx + 4 + k * 9, base - 20, 6, 5, [FRUIT_COL[harvest] || '#d8322a', '#ffb020', '#f4f0e8', '#c86a48'][(i + k) % 4]); }
  KIT.bunting(c, x - 30, x + 124, base - 50, ['#e8382e', '#ffd84a', '#2f5fa8', '#2e8a3a'], t, true);
}

// ---------------------------------------------------------------- worker overlays (screen scale: 2 units per world px, feet at 0,0)
const CARRY = {
  wool: (c) => { woolBale(c, 0, -34); woolBale(c, 0, -44); },
  tea: (c) => { teaChest(c, 0, -34); },
  wax: (c) => { R(c, -8, -44, 16, 10, INK); R(c, -7, -43, 14, 8, '#f8e8b0'); R(c, -7, -43, 14, 2, '#fff8d8'); },
  candles: (c) => { R(c, -12, -36, 24, 4, INK); R(c, -11, -35, 22, 2, '#8a5a3a'); for (let i = 0; i < 4; i++) candle(c, -8 + i * 5, -36); },
  fruit: (c) => { crate(c, 0, -34, '#e8283a'); },
  honey: (c) => { jar(c, -6, -34); jar(c, 6, -34); },
  milk: (c) => { churn(c, 18, -2); },
  clay: (c) => { R(c, -10, -46, 20, 12, INK); R(c, -9, -45, 18, 10, '#a86a48'); R(c, -9, -45, 18, 3, '#c88a68'); },
  pots: (c) => { R(c, -14, -36, 28, 4, INK); R(c, -13, -35, 26, 2, '#8a5a3a'); pot(c, -7, -36, '#c86a48'); pot(c, 6, -36, '#6a8ac8'); },
  planks: (c) => { R(c, -30, -50, 60, 8, INK); R(c, -29, -49, 58, 6, '#c89060'); R(c, -29, -49, 58, 1, '#e8b080'); R(c, -29, -46, 58, 1, '#9a6a3c'); },
  chair: (c) => { chair(c, 0, -28); },
  mail: (c) => { R(c, 10, -40, 3, 22, INK); R(c, 8, -22, 18, 18, INK); R(c, 9, -21, 16, 16, '#7a4a24'); R(c, 10, -21, 14, 3, '#9a6a3c'); letter(c, 17, -22); },
  papers: (c) => { bundle(c, 0, -34); bundle(c, 0, -42); },
};
const TOOL = {
  shears: (c, t) => { const o = Math.round(Math.abs(Math.sin(t * 8)) * 4); R(c, 12, -34 - o, 14, 3, INK); R(c, 12, -30 + o, 14, 3, INK); R(c, 13, -33 - o, 12, 1, '#c9cede'); R(c, 13, -29 + o, 12, 1, '#c9cede'); R(c, 8, -34, 5, 8, '#9a6a3c'); },
  leaf: (c, t) => { const lift = Math.round(Math.abs(Math.sin(t * 3.4)) * 8); R(c, -18, -22, 20, 14, INK); R(c, -17, -21, 18, 12, '#c8a060'); for (let i = 0; i < 3; i++) R(c, -15 + i * 5, -24, 4, 3, '#a8e070'); R(c, 14, -50 - lift, 5, 4, '#a8e070'); R(c, 14, -46 - lift, 3, 16, INK); },
  dip: (c, t) => { const d = Math.round((Math.sin(t * 2.6) + 1) * 7); R(c, 8, -52 + d, 22, 3, INK); for (let i = 0; i < 3; i++) { R(c, 10 + i * 7, -49 + d, 4, 14, INK); R(c, 11 + i * 7, -48 + d, 2, 12, '#f8f0dc'); } },
  basket: (c, t) => { const lift = Math.round(Math.abs(Math.sin(t * 3)) * 10); R(c, 14, -60 - lift, 4, 22, INK); R(c, 14, -60 - lift, 3, 3, '#e8283a'); R(c, -18, -22, 22, 14, INK); R(c, -17, -21, 20, 12, '#c8a060'); for (let i = 0; i < 3; i++) R(c, -15 + i * 6, -24, 5, 4, '#e8283a'); },
  smoker: (c, t) => { R(c, 12, -40, 10, 14, INK); R(c, 13, -39, 8, 12, '#9aa0b4'); for (let i = 0; i < 3; i++) { const ph = (t * 0.8 + i / 3) % 1; A(c, 1 - ph, () => R(c, 16 + ph * 10, -46 - ph * 26, 6 + ph * 6, 5, '#e8e8f0')); } R(c, -16, -50, 30, 8, 'rgba(240,240,220,.55)'); },
  pail: (c, t) => { const s = Math.round(Math.sin(t * 6) * 2); R(c, -6, -14, 14, 14, INK); R(c, -5, -13, 12, 12, '#c8ccd8'); R(c, -4, -12, 10, 3, '#ffffff'); R(c, 12 + s, -30, 4, 10, '#f4d0c0'); },
  clay: (c, t) => { const f = Math.floor(t * 8) % 2; R(c, -12, -30, 24, 6, INK); R(c, -11, -29, 22, 4, '#8a909c'); R(c, -6, -42, 12, 12, INK); R(c, -5, -41, 10, 11, '#c86a48'); R(c, -5 + f * 6, -40, 3, 9, '#e8a080'); },
  saw: (c, t) => { const s = Math.round(Math.sin(t * 10) * 6); R(c, 8 + s, -36, 24, 6, INK); R(c, 9 + s, -35, 22, 4, '#c9cede'); for (let i = 0; i < 22; i += 3) R(c, 9 + s + i, -31, 2, 2, '#8a909c'); R(c, 30 + s, -38, 6, 10, '#9a6a3c'); },
  stamp: (c, t) => { const d = Math.abs(Math.sin(t * 5)) * 10; R(c, 10, -46 + d, 8, 14, INK); R(c, 11, -45 + d, 6, 8, '#9a6a3c'); R(c, 10, -32 + d, 8, 4, '#c8382e'); },
  roller: (c, t) => { const s = Math.round(Math.sin(t * 5) * 8); R(c, 6 + s, -34, 22, 8, INK); R(c, 7 + s, -33, 20, 6, '#141a2e'); R(c, 15 + s, -40, 3, 8, '#9a6a3c'); },
  hammer: (c, t) => { const a = Math.sin(t * 7), dy = Math.round(a * 14); R(c, 14, -50 + dy, 4, 24, INK); R(c, 15, -50 + dy, 2, 24, '#9a6a3c'); R(c, 8, -56 + dy, 16, 8, INK); R(c, 9, -55 + dy, 14, 6, '#8a909c'); if (a > 0.85) { R(c, 22, -10, 4, 2, '#ffd84a'); R(c, 28, -14, 2, 2, '#ffd84a'); } },
};
const MOOD_ICON = {
  cheerful: (c) => { R(c, -6, -4, 12, 10, '#ffd84a'); R(c, -3, -1, 2, 2, INK); R(c, 2, -1, 2, 2, INK); R(c, -3, 3, 7, 1, INK); },
  chuffed: (c) => { R(c, -6, -4, 5, 5, '#ff6a9a'); R(c, 1, -4, 5, 5, '#ff6a9a'); R(c, -5, 0, 10, 4, '#ff6a9a'); R(c, -3, 4, 6, 2, '#ff6a9a'); },
  busy: (c) => { R(c, -6, -2, 12, 4, '#9aa0b4'); R(c, -2, -6, 4, 12, '#9aa0b4'); R(c, -2, -2, 4, 4, INK); },
  content: (c) => { R(c, -6, -4, 12, 10, '#a8e090'); R(c, -3, -1, 2, 1, INK); R(c, 2, -1, 2, 1, INK); R(c, -2, 3, 5, 1, INK); },
  tired: (c) => { ptext(c, 'Z', -3, 0, '#cfe8ff', 1); ptext(c, 'Z', 4, -6, '#cfe8ff', 1); },
  peckish: (c) => { R(c, -7, 0, 14, 5, '#e8c890'); R(c, -6, 5, 12, 2, '#c89060'); R(c, -2, -4, 2, 3, '#f4f4f4'); R(c, 2, -6, 2, 4, '#f4f4f4'); },
  soggy: (c) => { R(c, -2, -6, 4, 4, '#7ac8ff'); R(c, -4, -2, 8, 6, '#7ac8ff'); R(c, -2, 4, 4, 2, '#7ac8ff'); },
  alarmed: (c) => { R(c, -2, -7, 4, 9, '#ff5a3a'); R(c, -2, 4, 4, 3, '#ff5a3a'); },
};
export function rowOverlay(r, t, near) {
  const { at, mood, foreman } = r;
  return {
    behind: false,
    draw(c) {
      c.save(); c.imageSmoothingEnabled = false;
      const flip = at.face === 'left'; if (flip) c.scale(-1, 1);
      if (at.firefight) { R(c, 10, -40, 14, 14, INK); R(c, 11, -39, 12, 12, '#c8ccd8'); R(c, 12, -38, 10, 3, '#8ad0ff'); }
      else if (at.kind === 'work' && !at.sheltering) TOOL[r.w.tool]?.(c, t);
      else if (at.carry && r.cart && at.moving) { // town upgrade: a little handcart in front (cosmetic)
        const b = Math.floor(t * 8) % 2; R(c, 14, -26, 4, 16, INK); R(c, 16, -14, 40, 4, INK); R(c, 18, -30, 36, 18, INK); R(c, 19, -29, 34, 16, '#a87048'); R(c, 19, -29, 34, 3, '#c89060');
        for (const wx of [24, 46]) { R(c, wx - 5, -12 + b, 10, 10, INK); R(c, wx - 4, -11 + b, 8, 8, '#5a5a6a'); R(c, wx - 1, -8 + b, 2, 2, '#c8ccd8'); }
        c.save(); c.translate(36, -24); c.scale(0.8, 0.8); CARRY[at.carry]?.(c, t); c.restore(); }
      else if (at.carry && CARRY[at.carry]) CARRY[at.carry](c, t);
      if (flip) c.scale(-1, 1);
      if (foreman) { R(c, -16, -100, 32, 6, INK); R(c, -15, -99, 30, 4, '#ffc81e'); R(c, -10, -108, 20, 9, INK); R(c, -9, -107, 18, 8, '#ffd84a'); R(c, -9, -107, 18, 2, '#fff0a0'); }
      if (near && mood && MOOD_ICON[mood]) { c.save(); c.translate(26, -112); R(c, -10, -9, 20, 18, INK); R(c, -9, -8, 18, 16, '#121a36'); MOOD_ICON[mood](c); c.restore(); }
      c.restore();
    },
  };
}

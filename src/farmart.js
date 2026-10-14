// Original pixel art for the farmland district + business lots (procedural, crisp integer rects).
import { TILE, FIELDS, BARN, POND, MARKET, CRAFT, PEN, ORCHARD, FARM_SIGNS, LOTS } from './world.js';
import { CROPS, ensureFarm, stageOf, COSMETICS } from './farm.js';
import { ensureBiz, TYPES, rivalAt, PREMIUM_LOOKS } from './biz.js';
const N = 16, INK = '#141a2e';
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
function txt(c, s, x, y, size = 7, col = '#fff', align = 'center') { c.font = `${size}px Silkscreen, monospace`; c.textAlign = align; c.fillStyle = INK; c.fillText(s, x, y + 1); c.fillStyle = col; c.fillText(s, x, y); }
// ground (native px, N per tile): tilled soil rows, pond dock, pen dirt
export function farmGround(c) {
  for (const f of FIELDS) { const x = f.x * N, y = f.y * N, w = f.w * N, h = f.h * N; R(c, x - 1, y - 1, w + 2, h + 2, '#5a3a1e'); R(c, x, y, w, h, '#7a5030');
    for (let r = 0; r < h; r += 4) { R(c, x, y + r, w, 1, '#8e6038'); R(c, x, y + r + 3, w, 1, '#5e3c20'); } }
  R(c, PEN.x * N + 2, PEN.y * N + 2, PEN.w * N - 4, PEN.h * N - 4, '#a58a52'); for (let i = 0; i < 40; i++) R(c, PEN.x * N + ((i * 37) % (PEN.w * N - 8)) + 4, PEN.y * N + ((i * 53) % (PEN.h * N - 8)) + 4, 2, 1, '#8a7040');
  R(c, (POND.x + 4) * N, (POND.y - 1) * N + 6, N * 2, N + 4, '#9a6a3a'); for (let i = 0; i < 4; i++) R(c, (POND.x + 4) * N, (POND.y - 1) * N + 6 + i * 5, N * 2, 1, '#6a4422'); // dock
}
function fence(c, x, y, horiz) { R(c, x + 2, y + 6, 4, 22, '#6a4422'); R(c, x + 26, y + 6, 4, 22, '#6a4422'); if (horiz) { R(c, x, y + 10, 32, 4, '#c08a4a'); R(c, x, y + 20, 32, 4, '#c08a4a'); R(c, x, y + 10, 32, 1, '#e0b070'); } else { R(c, x + 12, y, 8, 30, '#c08a4a'); R(c, x + 12, y, 2, 30, '#e0b070'); } }
function stall(c, b, label, awn) { const x = b.x * TILE, y = b.y * TILE, w = b.w * TILE, h = b.h * TILE; R(c, x + 2, y + 30, w - 4, h - 30, '#b07a44'); R(c, x + 2, y + 30, w - 4, 3, '#d8a060');
  for (let i = 0; i < w - 4; i += 16) R(c, x + 2 + i, y + 8, 8, 24, awn), R(c, x + 10 + i, y + 8, 8, 24, '#f4ead2'); R(c, x, y + 4, w, 6, INK); R(c, x + 4, y + h - 34, w - 8, 12, '#8a5a2a');
  R(c, x + 6, y + 30, 4, h - 30, '#6a4422'); R(c, x + w - 10, y + 30, 4, h - 30, '#6a4422'); R(c, x + w / 2 - 40, y - 14, 80, 16, INK); R(c, x + w / 2 - 39, y - 13, 78, 14, '#fff1d0'); txt(c, label, x + w / 2, y - 3, 7, '#6a3a10'); }
export function farmStatic() { const out = [];
  for (const d of [[PEN.x, PEN.w, PEN.y], [PEN.x, PEN.w, PEN.y + PEN.h - 1]]) for (let x = d[0]; x < d[0] + d[1]; x++) if (!(d[2] === PEN.y && (x === 42 || x === 43))) out.push({ y: d[2] * TILE + 28, d: (c) => fence(c, x * TILE, d[2] * TILE, true) });
  for (let y = PEN.y + 1; y < PEN.y + PEN.h - 1; y++) for (const x of [PEN.x, PEN.x + PEN.w - 1]) out.push({ y: y * TILE + 28, d: (c) => fence(c, x * TILE, y * TILE, false) });
  out.push({ y: (MARKET.y + MARKET.h) * TILE - 1, d: (c) => { stall(c, MARKET, 'FARMERS MARKET', '#d8483a'); for (let i = 0; i < 5; i++) R(c, MARKET.x * TILE + 14 + i * 34, (MARKET.y + MARKET.h) * TILE - 32, 22, 8, ['#ff8a2a', '#e8344a', '#e8c95a', '#6cbf4a', '#f07a1a'][i]); } });
  out.push({ y: (CRAFT.y + CRAFT.h) * TILE - 1, d: (c) => { stall(c, CRAFT, 'CRAFTING', '#4a7ad0'); const x = CRAFT.x * TILE, y = (CRAFT.y + CRAFT.h) * TILE; R(c, x + 16, y - 34, 14, 10, '#e8344a'); R(c, x + 40, y - 34, 18, 10, '#ffd86a'); R(c, x + 70, y - 34, 26, 10, '#c08a4a'); txt(c, 'JAM  CHEESE  TREATS', x + 64, y - 40, 5, '#fff'); } });
  out.push({ y: (POND.y - 1) * TILE, d: (c) => { const x = (POND.x + 5) * TILE, y = (POND.y - 1) * TILE; R(c, x + 18, y - 26, 3, 30, '#6a4422'); R(c, x + 20, y - 26, 26, 1, '#ddd'); R(c, x + 45, y - 26, 1, 22, '#ddd'); R(c, x + 43, y - 4, 5, 4, '#e8344a'); } });
  for (const [k, s] of Object.entries(FARM_SIGNS)) out.push({ y: s.y * TILE + 30, d: (c) => { const x = s.x * TILE - 20, y = s.y * TILE - 18; R(c, x + 30, y + 30, 4, 18, '#6a4422'); R(c, x - 2, y - 2, 76, 36, INK); R(c, x, y, 72, 32, k === 'farmboard' ? '#3f7a3a' : '#5a3a8a'); R(c, x, y, 72, 2, '#e8c95a');
    txt(c, k === 'farmboard' ? 'TOP FARMER' : 'TOP BUSINESS', x + 36, y + 13, 6, '#ffe7a3'); txt(c, 'WEEKLY PRIZES', x + 36, y + 25, 5, '#fff'); } });
  out.push({ y: 80 * TILE + 30, d: (c) => { const x = 27 * TILE, y = 80 * TILE - 6; R(c, x + 10, y + 18, 4, 18, '#6a4422'); R(c, x + 74, y + 18, 4, 18, '#6a4422'); R(c, x, y, 88, 22, INK); R(c, x + 1, y + 1, 86, 20, '#a8744a'); txt(c, 'FARMLAND  v', x + 44, y + 14, 8, '#fff1d0'); } });
  return out; }
function barnDraw(c, look) { const x = BARN.x * TILE, y = BARN.y * TILE, w = BARN.w * TILE, h = BARN.h * TILE, wall = look === 'barn_blue' ? '#3a5aa8' : look === 'barn_gold' ? '#b8323a' : '#b8323a', trim = look === 'barn_gold' ? '#ffd23a' : '#f4ead2';
  R(c, x - 6, y - 10, w + 12, 40, INK); R(c, x - 4, y - 8, w + 8, 36, '#5a3a2a'); for (let i = 0; i < w + 8; i += 12) R(c, x - 4 + i, y - 8, 2, 36, '#4a2e20');
  R(c, x, y + 26, w, h - 26, wall); for (let i = 0; i < w; i += 8) R(c, x + i, y + 26, 1, h - 26, 'rgba(0,0,0,.18)'); R(c, x, y + 26, w, 3, trim); R(c, x, y + h - 3, w, 3, trim);
  const dx = x + w / 2 - 34; R(c, dx - 3, y + 60, 74, h - 60, trim); R(c, dx, y + 63, 68, h - 63, '#5a2a1a'); c.strokeStyle = trim; c.lineWidth = 3; c.beginPath(); c.moveTo(dx, y + 63); c.lineTo(dx + 68, y + h); c.moveTo(dx + 68, y + 63); c.lineTo(dx, y + h); c.stroke();
  R(c, x + w / 2 - 14, y + 34, 28, 20, trim); R(c, x + w / 2 - 11, y + 37, 22, 14, '#2a1a10'); for (const wx of [x + 16, x + w - 46]) { R(c, wx, y + 70, 30, 24, trim); R(c, wx + 3, y + 73, 24, 18, '#ffe7a3'); R(c, wx + 14, y + 73, 2, 18, trim); }
  txt(c, 'BIG BARN', x + w / 2, y + 6, 8, '#ffe7a3'); }
function wheel(c, cx, cy, r) { for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy)); R(c, cx - w, cy + dy, w * 2, 1, INK); } for (let dy = -r + 3; dy <= r - 3; dy++) { const w = Math.round(Math.sqrt((r - 3) ** 2 - dy * dy)); R(c, cx - w, cy + dy, w * 2, 1, '#3a3a44'); } R(c, cx - 2, cy - 2, 4, 4, '#e8c95a'); }
function tractor(c, x, y, look) { const col = look === 'tractor_pink' ? '#ff8ab8' : look === 'tractor_chrome' ? '#cfd8e4' : '#3f9c4a', dk = look === 'tractor_pink' ? '#d0608a' : look === 'tractor_chrome' ? '#8a96a8' : '#2a6a32';
  R(c, x - 2, y - 30, 46, 16, INK); R(c, x, y - 28, 42, 12, col); R(c, x, y - 18, 42, 2, dk); R(c, x + 2, y - 26, 12, 3, 'rgba(255,255,255,.35)'); // hood + body
  R(c, x + 24, y - 54, 22, 26, INK); R(c, x + 26, y - 52, 18, 24, col); R(c, x + 28, y - 49, 14, 10, '#bfe6ff'); R(c, x + 28, y - 49, 4, 10, '#e8f6ff'); R(c, x + 22, y - 56, 26, 4, dk); // cab
  R(c, x + 6, y - 40, 4, 12, '#555'); R(c, x + 5, y - 42, 6, 3, '#333'); R(c, x - 4, y - 24, 5, 6, '#ffe07a'); // exhaust + headlight
  wheel(c, x + 8, y - 8, 8); wheel(c, x + 34, y - 12, 12); }
function crop(c, x, y, cropId, st, t) { const C = CROPS[cropId], sw = Math.sin(t * 2 + x) * 0.8; if (st === 1) { R(c, x - 1, y - 4, 2, 4, C.leaf); R(c, x - 3 + sw, y - 6, 3, 2, C.leaf); return; }
  if (st === 2) { R(c, x - 1, y - 9, 2, 9, C.leaf); R(c, x - 5 + sw, y - 9, 4, 3, C.leaf); R(c, x + 1 + sw, y - 7, 4, 3, C.leaf); return; }
  R(c, x - 1, y - 12, 2, 12, C.leaf); R(c, x - 6 + sw, y - 12, 5, 4, C.leaf); R(c, x + 1 + sw, y - 10, 5, 4, C.leaf); if (st === 3) { R(c, x - 2, y - 15, 4, 3, '#fff6c0'); return; }
  const big = cropId === 'pumpkin' || cropId === 'goldmelon'; R(c, x - (big ? 6 : 3), y - (big ? 8 : 6), big ? 12 : 6, big ? 8 : 6, C.color); R(c, x - (big ? 5 : 2), y - (big ? 7 : 5), 2, 2, 'rgba(255,255,255,.6)'); }
function chicken(c, x, y, t, i) { const b = Math.abs(Math.sin(t * 6 + i)) * 2; R(c, x - 5, y - 9 - b, 10, 8, '#fafafa'); R(c, x + 3, y - 13 - b, 5, 5, '#fafafa'); R(c, x + 4, y - 15 - b, 3, 2, '#e8344a'); R(c, x + 8, y - 11 - b, 2, 2, '#ffb02a'); R(c, x + 5, y - 12 - b, 1, 1, INK); R(c, x - 2, y - 1, 1, 2, '#ffb02a'); R(c, x + 2, y - 1, 1, 2, '#ffb02a'); }
function cow(c, x, y, t, i) { const b = Math.sin(t * 2 + i) > 0.6 ? 1 : 0; R(c, x - 14, y - 18, 28, 14, '#fafafa'); R(c, x - 8, y - 18, 8, 6, INK); R(c, x + 4, y - 12, 6, 6, INK); R(c, x + 12, y - 22 + b, 10, 10, '#fafafa'); R(c, x + 18, y - 16 + b, 5, 4, '#f2a6b0'); R(c, x + 14, y - 19 + b, 2, 2, INK);
  for (const lx of [-12, -6, 6, 10]) R(c, x + lx, y - 4, 3, 5, '#ddd'); R(c, x - 4, y - 5, 6, 3, '#f2a6b0'); }
function fruitTree(c, x, y, fruit, ready, i) { R(c, x + 6, y + 4, 22, 5, 'rgba(0,0,0,.18)'); R(c, x + 13, y - 14, 6, 20, '#6a4422'); R(c, x + 13, y - 14, 2, 20, '#8a5a32');
  const rows = [[10, 12], [4, 24], [0, 32], [0, 32], [2, 28], [8, 16]]; rows.forEach(([o, w], k) => { R(c, x + o, y - 44 + k * 5, w, 5, k < 2 ? '#4caf50' : k > 3 ? '#2a6a32' : '#3a8c3e'); }); R(c, x + 8, y - 38, 8, 4, '#7ad06a');
  if (fruit && ready > 0) for (let k = 0; k < Math.min(6, Math.ceil(ready / 2)); k++) { const fx = x + 4 + ((k * 11 + i * 7) % 22), fy = y - 38 + ((k * 7 + i * 5) % 18); R(c, fx, fy, 5, 5, fruit === 'apple' ? '#e8344a' : '#ffa07a'); R(c, fx + 1, fy + 1, 2, 1, '#fff'); } }
function storefront(c, L, m, rival, t) { const x = L.x * TILE, y = L.y * TILE, w = L.w * TILE, h = L.h * TILE; const type = m ? m.type : rival?.type, T = TYPES[type], col = T ? T.color : '#9aa0b0', look = m?.look;
  R(c, x - 4, y - 8, w + 8, 18, INK); R(c, x - 2, y - 6, w + 4, 14, look === 'gold' ? '#c9a23a' : look === 'marble' ? '#e8e4dc' : '#5a4a6a');
  R(c, x, y + 8, w, h - 8, look === 'marble' ? '#f2efe8' : look === 'gold' ? '#2a2440' : look === 'sakura' ? '#ffd6e4' : '#e8dcc4'); for (let r = y + 16; r < y + h; r += 8) R(c, x, r, w, 1, 'rgba(0,0,0,.08)');
  if (T) { for (let i = 0; i < w; i += 16) { R(c, x + i, y + 36, 8, 14, col); R(c, x + i + 8, y + 36, 8, 14, '#fff'); } R(c, x, y + 50, w, 3, INK); }
  R(c, x + 10, y + 56, 60, h - 60, T ? '#bfe6ff' : '#6a7080'); R(c, x + 10, y + 56, 60, 3, '#fff'); R(c, x + w - 54, y + 58, 40, h - 58, T ? '#7a4a2a' : '#4a5060'); R(c, x + w - 22, y + 84, 4, 4, '#ffd23a');
  if (T) for (let k = 0; k < 4; k++) R(c, x + 16 + k * 13, y + h - 20 - (k % 2) * 6, 8, 8, ['#ffd86a', '#e87aa8', '#9fd8c0', '#c08a4a'][k]);
  const name = m ? m.name : rival ? rival.name : 'FOR LEASE'; R(c, x + 8, y + 14, w - 16, 18, INK); R(c, x + 9, y + 15, w - 18, 16, T ? col : '#fff1d0'); txt(c, name.toUpperCase().slice(0, 16), x + w / 2, y + 26, 7, T ? '#fff' : '#a8323a');
  if (!T) { R(c, x + 16, y + 60, 40, 22, '#fff'); txt(c, L.prime ? 'PRIME' : 'LEASE', x + 36, y + 70, 6, '#a8323a'); txt(c, `${L.rent}/DAY`, x + 36, y + 79, 5, INK); }
  if (L.prime) { R(c, x + w - 18, y - 22, 14, 14, '#c9a23a'); txt(c, 'P', x + w - 11, y - 11, 8, INK); }
  if (m?.decor?.awning) for (let i = 0; i < w; i += 12) R(c, x + i, y + 33, 6, 4, '#ff6a6a');
  if (m?.decor?.planters) for (const px of [x - 2, x + w - 12]) { R(c, px, y + h - 14, 14, 12, '#8a5a2a'); R(c, px + 1, y + h - 22, 12, 9, '#4caf50'); R(c, px + 4, y + h - 22, 3, 3, '#ff8fb6'); }
  if (m?.decor?.neon) { const on = 0.6 + Math.sin(t * 4) * 0.4; c.globalAlpha = on; R(c, x + 74, y + 58, 26, 10, '#ff4fd8'); c.globalAlpha = 1; txt(c, 'OPEN', x + 87, y + 66, 5, '#fff'); }
  if (m?.decor?.bench) { R(c, x + 12, y + h + 2, 40, 4, '#a8744a'); R(c, x + 14, y + h + 6, 3, 4, '#6a4422'); R(c, x + 47, y + h + 6, 3, 4, '#6a4422'); }
  if (m?.staff) for (let k = 0; k < m.staff; k++) R(c, x + 18 + k * 14, y + 64, 8, 10, '#e8a23a'); }
export function farmDynamic(state, t) { const out = []; if (!state) return out; const f = ensureFarm(state), b = ensureBiz(state);
  out.push({ y: (BARN.y + BARN.h) * TILE - 1, d: (c) => barnDraw(c, f.look.barn) }); out.push({ y: (BARN.y + BARN.h + 1) * TILE, d: (c) => tractor(c, (BARN.x + BARN.w + 0.3) * TILE, (BARN.y + BARN.h + 1) * TILE - 4, f.look.tractor) });
  FIELDS.forEach((F, i) => { const fl = f.fields[i], st = stageOf(fl); if (!st) return; for (let r = 0; r < F.h; r++) out.push({ y: (F.y + r) * TILE + 26, d: (c) => { for (let k = 0; k < F.w * 2; k++) crop(c, F.x * TILE + 8 + k * 16, (F.y + r) * TILE + 26, fl.crop, st, t); } });
    if (fl.watered > 0) out.push({ y: F.y * TILE, flat: true, d: (c) => { c.fillStyle = 'rgba(40,60,120,.18)'; c.fillRect(F.x * TILE, F.y * TILE, F.w * TILE, F.h * TILE); } }); });
  ORCHARD.forEach(([x, y], i) => out.push({ y: y * TILE + 30, d: (c) => fruitTree(c, x * TILE, y * TILE + 22, f.orchard.fruit, f.orchard.ready, i) }));
  const nC = Math.max(f.animals.chicken, 2), nW = f.animals.cow; // two farm-yard chickens always roam
  for (let i = 0; i < nC; i++) { const x = (PEN.x + 1.5 + ((i * 2.3 + Math.sin(t * 0.4 + i) * 1.5 + 10) % (PEN.w - 3))) * TILE, y = (PEN.y + 1.5 + (i % 3) * 1.4) * TILE + Math.cos(t * 0.5 + i) * 8; out.push({ y, d: (c) => chicken(c, x, y, t, i) }); }
  for (let i = 0; i < nW; i++) { const x = (PEN.x + 2 + i * 2.5 + Math.sin(t * 0.15 + i) * 0.8) * TILE, y = (PEN.y + 4.6) * TILE; out.push({ y, d: (c) => cow(c, x, y, t, i) }); }
  if (Object.values(f.pen).some((n) => n > 0)) out.push({ y: (PEN.y + 1) * TILE, d: (c) => { R(c, 43 * TILE - 6, PEN.y * TILE - 22, 12, 12, INK); R(c, 43 * TILE - 5, PEN.y * TILE - 21, 10, 10, '#fff'); txt(c, '!', 43 * TILE, PEN.y * TILE - 13, 8, '#e8344a'); } });
  for (const L of LOTS) { const mine = b.mine?.lot === L.id ? b.mine : null; out.push({ y: (L.y + L.h) * TILE - 1, d: (c) => storefront(c, L, mine, rivalAt(L.id), t) }); }
  return out; }
export { COSMETICS, PREMIUM_LOOKS };

// Pixel-art world rendering: chunky gold-trimmed buildings, navy/gold palette.
import { TILE, MAP_W, MAP_H, MAP, T, BUILDINGS, PLOTS, NPC_HOMES, STALL_SLOTS } from './world.js';
import { NPC_INTERIORS } from './homes.js';
import { WALLS } from './furniture.js';

export const GOLD = '#d4a640', GOLD_L = '#f2cc68', GOLD_D = '#8f6a22', NAVY = '#121a36', NAVY_L = '#24305c', INK = '#0c1022';
export const FONT = 'Silkscreen, "Press Start 2P", monospace';
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const ch = (v) => Math.max(0, Math.min(255, Math.round(v * f))); return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => ch(v).toString(16).padStart(2, '0')).join(''); };

// 5x5-ish pixel paw at unit s
export function paw(c, x, y, s, col) {
  for (const [px, py] of [[0, 1], [2, 0], [4, 1], [5, 3], [-1, 3]]) R(c, x + px * s, y + py * s, s, s, col);
  R(c, x + s, y + 3 * s, 3 * s, 2 * s, col); R(c, x + 0.5 * s, y + 4 * s, 4 * s, s, col);
}

function pixelText(c, text, cx, cy, maxW, size, col, shadowCol = INK) {
  let s = size; c.font = `${s}px ${FONT}`; while (c.measureText(text).width > maxW && s > 6) { s -= 1; c.font = `${s}px ${FONT}`; }
  c.textAlign = 'center'; c.textBaseline = 'middle';
  if (shadowCol) { c.fillStyle = shadowCol; c.fillText(text, Math.round(cx) + 1, Math.round(cy) + 1); }
  c.fillStyle = col; c.fillText(text, Math.round(cx), Math.round(cy)); return s;
}

function flag(c, x, y) { // pole base at (x,y)
  R(c, x - 1, y - 30, 3, 30, GOLD_D); R(c, x - 1, y - 30, 1, 30, GOLD_L); R(c, x - 3, y - 34, 6, 5, GOLD_L);
  R(c, x + 2, y - 30, 20, 12, GOLD); R(c, x + 18, y - 27, 6, 6, GOLD); R(c, x + 2, y - 19, 20, 2, GOLD_D);
  paw(c, x + 7, y - 28, 1.6, NAVY);
}
function pottedTree(c, x, y, s = 1) { // base centre
  R(c, x - 6 * s, y - 8 * s, 12 * s, 8 * s, GOLD_D); R(c, x - 6 * s, y - 8 * s, 12 * s, 2 * s, GOLD); R(c, x - 5 * s, y - 6 * s, 10 * s, 5 * s, '#3a2a1e');
  R(c, x - 1 * s, y - 12 * s, 2 * s, 4 * s, '#5a3a22');
  for (const [dx, dy, w, h, col] of [[-6, -18, 12, 6, '#1f5a34'], [-5, -24, 10, 6, '#2a7442'], [-3, -29, 6, 5, '#3a9152'], [-2, -31, 3, 2, '#5cb86a']]) R(c, x + dx * s, y + dy * s, w * s, h * s, col);
  R(c, x + 3 * s, y - 22 * s, 2 * s, 2 * s, '#1f5a34'); R(c, x - 5 * s, y - 16 * s, 2 * s, 2 * s, '#174628');
}

const THEMES = {
  cafe:    { wall: '#8e2430', roof: '#6a1822', accent: '#f2a3b4', label: 'Barista job' },
  shop:    { wall: '#1f5a5a', roof: '#163f42', accent: '#9fe3d8', label: 'Furniture' },
  fashion: { wall: '#5a2352', roof: '#3f1739', accent: '#f0a6dc', label: 'Clothing' },
  launch:  { wall: '#22377a', roof: '#18275a', accent: '#7fb4ff', label: 'Demo tokens' },
  cars:    { wall: '#2a2a33', roof: '#1c1c24', accent: '#c9c9d6', label: 'Coming soon' },
};

// Chunky pseudo-isometric storefront filling footprint (x,y,w,h); flag pokes above.
export function storefront(c, x, y, w, h, th, name, { small = false } = {}) {
  const side = small ? 8 : 14, plH = small ? 8 : 12, fw = w - side - 8, fx = x + 4;
  const roofH = Math.round(h * (small ? 0.36 : 0.34)), wallTop = y + roofH, wallBot = y + h - plH;
  // shadow
  R(c, x + 8, y + h - 4, w - 4, 8, 'rgba(8,10,24,0.35)');
  // plinth
  R(c, x, y + h - plH, w, plH, '#3b3550'); R(c, x, y + h - plH, w, 2, GOLD); R(c, x, y + h - 2, w, 2, GOLD_D);
  for (let i = 8; i < w; i += 16) R(c, x + i, y + h - plH + 4, 8, 2, '#4d4666');
  // right side face (depth)
  const sw = shade(th.wall, 0.62);
  R(c, fx + fw, wallTop + side / 2, side, wallBot - wallTop - side / 2, sw);
  for (let i = 0; i < side; i += 2) R(c, fx + fw + i, wallTop + i / 2, 2, side / 2 - i / 2 + 1, sw);
  R(c, fx + fw + side - 2, wallTop + side / 2, 2, wallBot - wallTop - side / 2, GOLD_D);
  // front wall bricks
  R(c, fx, wallTop, fw, wallBot - wallTop, th.wall);
  const bd = shade(th.wall, 0.8), bl = shade(th.wall, 1.18);
  for (let yy = wallTop + 4, r = 0; yy < wallBot - 2; yy += 6, r++) for (let xx = fx + (r % 2 ? 6 : 0); xx < fx + fw - 2; xx += 12) { R(c, xx, yy, 10, 1, bd); if (hash(xx, yy) < 0.25) R(c, xx + 2, yy - 3, 6, 1, bl); }
  R(c, fx, wallTop, 3, wallBot - wallTop, GOLD); R(c, fx + fw - 3, wallTop, 3, wallBot - wallTop, GOLD_D); R(c, fx + fw - 3, wallTop, 1, wallBot - wallTop, GOLD);
  // stepped roof
  const steps = small ? 3 : 4, rd = shade(th.roof, 0.8), rl = shade(th.roof, 1.2);
  for (let i = 0; i < steps; i++) {
    const inset = 6 + i * (fw / (2 * steps + 2)), ry = wallTop - (i + 1) * (roofH - 6) / steps, rh = (roofH - 6) / steps + 1;
    R(c, fx + inset, ry, fw - inset * 2 + side * (1 - i / steps), rh, i % 2 ? th.roof : rd);
    for (let xx = fx + inset + 2; xx < fx + fw - inset; xx += 8) R(c, xx, ry + 2, 4, 1, rl);
    R(c, fx + inset, ry, 2, rh, GOLD_D);
  }
  const apexY = wallTop - (roofH - 6) - 2;
  R(c, x + fw / 2 + 2, apexY - 2, 8, 4, GOLD); 
  flag(c, x + fw / 2 + 6, apexY - 1);
  // cornice
  R(c, fx - 4, wallTop - 4, fw + 8, 6, GOLD); R(c, fx - 4, wallTop + 2, fw + 8, 2, GOLD_D); R(c, fx - 4, wallTop - 4, fw + 8, 1, GOLD_L);
  for (const cx of [fx - 6, fx + fw - 2]) { R(c, cx, wallTop - 8, 8, 8, GOLD_L); R(c, cx + 2, wallTop - 6, 4, 4, GOLD_D); }
  // signboard
  const sgW = Math.min(fw - 20, small ? fw - 12 : 200), sgH = small ? 18 : 28, sgX = fx + fw / 2 - sgW / 2, sgY = wallTop - sgH / 2 - (small ? 4 : 8);
  R(c, sgX - 3, sgY - 3, sgW + 6, sgH + 6, GOLD_D); R(c, sgX - 2, sgY - 2, sgW + 4, sgH + 4, GOLD); R(c, sgX, sgY, sgW, sgH, NAVY);
  for (const [qx, qy] of [[sgX - 3, sgY - 3], [sgX + sgW - 1, sgY - 3], [sgX - 3, sgY + sgH - 1], [sgX + sgW - 1, sgY + sgH - 1]]) R(c, qx, qy, 4, 4, GOLD_L);
  pixelText(c, name.toUpperCase(), sgX + sgW / 2, sgY + sgH / 2 + 1, sgW - 10, small ? 9 : 14, GOLD_L);
  // door + awning + steps
  const dW = small ? 22 : 34, dH = small ? 26 : 38, dX = fx + fw / 2 - dW / 2, dY = wallBot - dH;
  R(c, dX - 4, dY - 4, dW + 8, dH + 4, GOLD); R(c, dX - 2, dY - 2, dW + 4, dH + 2, GOLD_D);
  R(c, dX, dY, dW, dH, '#3a2216'); R(c, dX + dW / 2 - 1, dY, 2, dH, GOLD_D);
  for (const ox of [3, dW / 2 + 3]) { R(c, dX + ox, dY + 4, dW / 2 - 6, dH * 0.4, '#f6d27a'); R(c, dX + ox, dY + 4, dW / 2 - 6, 2, '#fff1b8'); }
  R(c, dX + dW / 2 - 4, dY + dH * 0.6, 2, 3, GOLD_L); R(c, dX + dW / 2 + 2, dY + dH * 0.6, 2, 3, GOLD_L);
  const aW = dW + (small ? 18 : 30), aX = fx + fw / 2 - aW / 2, aY = dY - (small ? 12 : 16), aH = small ? 8 : 12, sN = small ? 6 : 8;
  for (let i = 0; i < sN; i++) { const col = i % 2 ? NAVY : GOLD; const sx = aX + (aW / sN) * i; R(c, sx, aY, aW / sN + 1, aH, col); R(c, sx + 1, aY + aH, aW / sN - 2, 3, col); }
  R(c, aX - 2, aY - 2, aW + 4, 3, GOLD_D);
  R(c, dX - 8, wallBot, dW + 16, 3, '#6a6080'); R(c, dX - 4, wallBot + 3, dW + 8, 3, '#857ca0');
  // windows (upper row lit)
  const winY = wallTop + (small ? 10 : 14), winW = small ? 14 : 22, winH = small ? 12 : 18;
  const winXs = small ? [fx + 8, fx + fw - 8 - winW] : [fx + 12, fx + fw / 2 - winW / 2, fx + fw - 12 - winW];
  for (const wx of winXs) {
    if (!small && wx === fx + fw / 2 - winW / 2 && winY + winH > aY - 4) continue;
    R(c, wx - 2, winY - 2, winW + 4, winH + 4, GOLD_D); R(c, wx, winY, winW, winH, '#f6c85a'); R(c, wx, winY, winW, 3, '#fff1b8'); R(c, wx + winW / 2 - 1, winY, 2, winH, GOLD_D); R(c, wx, winY + winH / 2, winW, 2, GOLD_D);
  }
  // paw banners beside door (non-small)
  if (!small) {
    const bW = 26, bH = Math.min(46, wallBot - winY - winH - 14), bY = winY + winH + 8;
    for (const bx of [dX - 30 - bW, dX + dW + 30]) {
      if (bx < fx + 6 || bx + bW > fx + fw - 6 || bH < 26) continue;
      R(c, bx - 2, bY - 2, bW + 4, bH + 4, GOLD); R(c, bx, bY, bW, bH, NAVY);
      paw(c, bx + bW / 2 - 5, bY + bH / 2 - 6, 2, GOLD_L);
      R(c, bx, bY + bH - 4, bW, 2, th.accent);
    }
  }
  // potted trees
  pottedTree(c, dX - 12, wallBot + 4, small ? 0.7 : 1); pottedTree(c, dX + dW + 12, wallBot + 4, small ? 0.7 : 1);
  if (!small) { pottedTree(c, fx + 10, y + h - plH + 2, 0.8); pottedTree(c, fx + fw - 6, y + h - plH + 2, 0.8); }
}

function building(c, b) {
  const x = b.x * TILE, y = b.y * TILE, w = b.w * TILE, h = b.h * TILE, th = THEMES[b.id];
  storefront(c, x, y, w, h, th, b.name);
  // small tag plate under sign
  c.font = `8px ${FONT}`; const tw = c.measureText(th.label.toUpperCase()).width + 10;
  R(c, x + w / 2 - tw / 2 - 4, y + h - 10, tw, 9, NAVY); R(c, x + w / 2 - tw / 2 - 4, y + h - 2, tw, 1, GOLD);
  c.fillStyle = th.accent; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(th.label.toUpperCase(), x + w / 2 - 4, y + h - 5);
  if (b.id === 'cars') for (const [cx, col] of [[x - 2, '#b3202c'], [x + w - 62, '#2f6f8f']]) { const cy = y + h + 36; R(c, cx + 2, cy + 22, 60, 6, 'rgba(8,10,24,.35)'); R(c, cx, cy + 6, 60, 16, col); R(c, cx + 12, cy, 34, 8, col); R(c, cx + 15, cy + 2, 28, 5, '#bfe6f7'); R(c, cx, cy + 6, 60, 2, GOLD); for (const wx of [cx + 8, cx + 42]) { R(c, wx, cy + 18, 10, 8, INK); R(c, wx + 3, cy + 21, 4, 3, GOLD); } }
}

export function house(c, x, y, w, h, roof, wallCol, label) {
  // yard with hedge border
  R(c, x + 2, y + 2, w - 4, h - 4, '#5d9a4a');
  for (let i = x + 2; i < x + w - 2; i += 8) { R(c, i, y + 2, 6, 6, '#2f6a36'); R(c, i, y + 2, 6, 2, '#3f8446'); }
  for (let j = y + 8; j < y + h - 2; j += 8) { R(c, x + 2, j, 6, 6, '#2f6a36'); R(c, x + w - 8, j, 6, 6, '#2f6a36'); }
  const hx = x + 18, hy = y + 26, hw = w - 36, hh = h - 44;
  R(c, x + w / 2 - 8, hy + hh, 16, y + h - hy - hh - 2, '#c8b48c');
  storefront(c, hx, hy, hw, hh, { wall: wallCol, roof, accent: GOLD_L }, label || 'Home', { small: true });
}
function npcHouse(c, h) { const I = NPC_INTERIORS[h.id]; house(c, h.x * TILE, h.y * TILE, h.w * TILE, h.h * TILE, I.roof, shade(WALLS[I.wall].color, 0.7), `${h.owner}'s`); }

function tree(c, x, y) {
  R(c, x - 12, y + 10, 24, 5, 'rgba(8,20,16,0.3)'); R(c, x - 3, y, 6, 13, '#5a3a22'); R(c, x - 3, y, 2, 13, '#7a5232');
  for (const [dx, dy, w, h, col] of [[-14, -10, 28, 12, '#1c4f2e'], [-12, -18, 24, 10, '#256a3a'], [-9, -25, 18, 8, '#2f8046'], [-5, -30, 10, 6, '#3d9a54'], [-10, -16, 6, 4, '#3d9a54'], [4, -12, 6, 3, '#174028'], [-3, -27, 4, 3, '#5cb86a']]) R(c, x + dx, y + dy, w, h, col);
}

export function prerenderMap() {
  const cv = document.createElement('canvas'); cv.width = MAP_W * TILE; cv.height = MAP_H * TILE; const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const t = MAP[y][x], px = x * TILE, py = y * TILE, r = hash(x, y);
    R(c, px, py, TILE, TILE, r < 0.5 ? '#4f8f45' : '#53944a');
    if (t === T.GRASS || t === T.TREE || t === T.FLOWER || t === T.BUILDING || t === T.HOME) for (let i = 0; i < 4; i++) { const a = hash(x + i * 7, y), b = hash(x, y + i * 9); R(c, px + Math.floor(a * 14) * 2, py + Math.floor(b * 14) * 2, 2, 4, i % 2 ? '#3f7a3a' : '#66a85a'); }
    if (t === T.FLOWER) for (let i = 0; i < 3; i++) { const a = hash(x + i, y * 3), b = hash(x * 5, y + i); const fx = px + 4 + Math.floor(a * 11) * 2, fy = py + 4 + Math.floor(b * 11) * 2; R(c, fx, fy, 4, 4, ['#f6efe0', GOLD_L, '#f08cb0'][i]); R(c, fx + 1, fy + 1, 2, 2, '#c9763a'); }
    if (t === T.ROAD) { R(c, px, py, TILE, TILE, '#2e3448'); if (r < 0.6) R(c, px + Math.floor(r * 12) * 2, py + Math.floor(hash(y, x) * 12) * 2, 4, 2, '#394058'); }
    if (t === T.WALK) { R(c, px, py, TILE, TILE, '#b9a888'); for (let j = 0; j < 4; j++) { R(c, px, py + j * 8, TILE, 1, '#9a8a6c'); R(c, px + ((j % 2) ? 4 : 12) + (x % 2) * 16, py + j * 8, 1, 8, '#9a8a6c'); } }
    if (t === T.PLAZA) { R(c, px, py, TILE, TILE, '#c9b893'); R(c, px, py, TILE, 1, '#a8976f'); R(c, px, py, 1, TILE, '#a8976f'); R(c, px + 1, py + 1, TILE - 2, 1, '#dccca8'); if ((x + y) % 4 === 0) { R(c, px + 13, py + 13, 6, 6, GOLD); R(c, px + 15, py + 15, 2, 2, GOLD_D); } }
    if (t === T.WATER) { R(c, px, py, TILE, TILE, '#1f5a86'); if (r < 0.7) { R(c, px + 4 + Math.floor(r * 8) * 2, py + 10 + (x % 3) * 4, 8, 2, '#4a8fc0'); R(c, px + 18 - Math.floor(r * 4) * 2, py + 22, 6, 2, '#2f75a6'); } }
    if (t === T.PLOT) { R(c, px, py, TILE, TILE, '#8a6a46'); R(c, px + Math.floor(r * 12) * 2, py + Math.floor(hash(y, x) * 12) * 2, 4, 2, '#7a5c3c'); R(c, px + 6, py + 20, 2, 2, '#9c7c54'); }
  }
  // road dashes (gold)
  for (let x = 1; x < MAP_W - 1; x++) { R(c, x * TILE + 8, 21 * TILE - 2, 14, 4, GOLD); R(c, x * TILE + 8, 32 * TILE - 2, 14, 4, GOLD); }
  for (let y = 6; y < 41; y++) if (y < 19 || (y > 22 && y < 30) || y > 33) R(c, 32 * TILE - 2, y * TILE + 8, 4, 14, GOLD);
  // pond stone edges + lily pads
  for (const [x0, y0, w, h] of [[5, 3, 9, 5], [37, 35, 18, 4]]) {
    for (let i = 0; i < w * TILE; i += 8) { R(c, x0 * TILE + i, y0 * TILE - 4, 7, 6, (i / 8) % 2 ? '#8c8aa0' : '#a4a2b8'); R(c, x0 * TILE + i, (y0 + h) * TILE - 2, 7, 6, (i / 8) % 2 ? '#8c8aa0' : '#a4a2b8'); }
    for (let j = 0; j < h * TILE; j += 8) { R(c, x0 * TILE - 4, y0 * TILE + j, 6, 7, '#9896ac'); R(c, (x0 + w) * TILE - 2, y0 * TILE + j, 6, 7, '#9896ac'); }
    for (let i = 0; i < w; i += 2) { const lx = (x0 + i + 1) * TILE - 6, ly = (y0 + 1) * TILE - 4; R(c, lx, ly, 12, 8, '#3f8a4a'); R(c, lx + 2, ly + 2, 4, 2, '#5cb86a'); R(c, lx + 6, ly - 2, 4, 4, '#f08cb0'); }
  }
  for (const h of NPC_HOMES) npcHouse(c, h);
  for (const b of BUILDINGS) building(c, b);
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (MAP[y][x] === T.TREE) tree(c, x * TILE + 16, y * TILE + 14);
  // bench + gold lamp posts
  R(c, 17 * TILE, 6 * TILE + 8, 56, 6, '#7a4a2a'); R(c, 17 * TILE, 6 * TILE + 16, 56, 4, '#5a3420'); R(c, 17 * TILE + 4, 6 * TILE + 20, 4, 6, INK); R(c, 17 * TILE + 48, 6 * TILE + 20, 4, 6, INK);
  for (const [lx, ly] of [[8, 18], [24, 18], [40, 23], [52, 18], [12, 29], [44, 29], [20, 33], [50, 33]]) { const X = lx * TILE + 14, Y = ly * TILE; R(c, X - 2, Y + 18, 8, 4, GOLD_D); R(c, X, Y - 10, 4, 30, NAVY_L); R(c, X + 1, Y - 10, 1, 30, '#3a4880'); R(c, X - 4, Y - 20, 12, 10, GOLD); R(c, X - 2, Y - 18, 8, 6, '#fff1b8'); R(c, X - 2, Y - 23, 8, 3, GOLD_D); }
  const label = (txt, x, y) => { c.font = `10px ${FONT}`; const w = c.measureText(txt).width + 14; R(c, x - 2, y - 2, w + 4, 18, GOLD); R(c, x, y, w, 14, NAVY); c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = GOLD_L; c.fillText(txt, x + 7, y + 7); };
  label('MARKET ROW - LAUNCHED TOKEN STALLS', 34 * TILE, 6 * TILE + 2);
  label('SAKURA POND', 7 * TILE, 2 * TILE + 6);
  label('SAKURA LANE', 2 * TILE, 34 * TILE + 2);
  return cv;
}

export function drawPlots(c, state, t) {
  for (const p of PLOTS) {
    const x = p.x * TILE, y = p.y * TILE, w = p.w * TILE, h = p.h * TILE, home = state.plots[p.id];
    if (home) house(c, x, y, w, h, home.roof, shade(WALLS[home.wall].color, 0.7), `${state.player.name}'s Home`);
    else {
      for (let i = 0; i <= 6; i++) { const fx = x + i * 32 - 2 + (i === 6 ? -3 : 0); R(c, fx, y, 6, 14, '#7a5232'); R(c, fx, y, 6, 2, GOLD); }
      R(c, x, y + 4, w, 3, '#9c6c40');
      const sx = x + w / 2, sy = Math.round(y + h / 2 + Math.sin(t * 2 + p.x) * 1.5);
      R(c, sx - 2, sy - 4, 5, 34, '#5a3a22');
      R(c, sx - 44, sy - 32, 88, 36, GOLD); R(c, sx - 42, sy - 30, 84, 32, NAVY);
      pixelText(c, 'FOR CLAIM', sx, sy - 21, 78, 10, GOLD_L); pixelText(c, '300 BONES', sx, sy - 8, 78, 8, '#f6e7b8', null);
    }
  }
}

export function drawStalls(c, state, t) {
  state.tokens.forEach((tok, i) => {
    if (i >= STALL_SLOTS.length) return;
    const s = STALL_SLOTS[i], x = s.x * TILE, y = s.y * TILE;
    R(c, x + 6, y + 56, 84, 6, 'rgba(8,10,24,.3)');
    R(c, x + 4, y + 28, 84, 30, '#6a4428'); R(c, x + 4, y + 28, 84, 3, GOLD); R(c, x + 4, y + 55, 84, 3, '#4a2e1a');
    R(c, x + 6, y + 6, 3, 24, GOLD_D); R(c, x + 83, y + 6, 3, 24, GOLD_D);
    for (let k = 0; k < 6; k++) { R(c, x + 4 + k * 14, y + 4, 14, 14, k % 2 ? '#f6efe0' : tok.color); R(c, x + 5 + k * 14, y + 18, 12, 3, k % 2 ? '#f6efe0' : tok.color); }
    R(c, x + 2, y + 2, 88, 3, GOLD);
    R(c, x + 34, y + 32, 24, 20, tok.color); R(c, x + 34, y + 32, 24, 2, '#ffffff55');
    pixelText(c, tok.ticker.slice(0, 4), x + 46, y + 42, 22, 7, '#fff', INK);
    c.font = `8px ${FONT}`; const lbl = '$' + tok.ticker + (tok.curve.graduated ? ' *' : ''); const lw = c.measureText(lbl).width + 8;
    R(c, x + 46 - lw / 2, y - 12, lw, 12, NAVY); R(c, x + 46 - lw / 2, y - 1, lw, 1, GOLD);
    c.fillStyle = GOLD_L; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(lbl, x + 46, y - 6);
  });
}

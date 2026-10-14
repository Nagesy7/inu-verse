// Pixel-art world rendering: chunky gold-trimmed buildings, navy/gold palette.
import { TILE, MAP_W, MAP_H, MAP, T, BUILDINGS, PLOTS, NPC_HOMES, STALL_SLOTS, CLUBHOUSE, MALL_BUILDINGS, LEADERS, BRIDGES, DECOR } from './world.js';
import { N, SCALE, PAL, buildGround, sprites, shadowEllipse, hash, mk, P } from './tiles.js';
import { LAMP_TILES, unreadMail } from './ambient.js';
import { drawCar } from './cars.js';
import { drawEmblem, ART } from './art.js';
import { NPC_INTERIORS } from './homes.js';
import { WALLS } from './furniture.js';

export const GOLD = '#d4a640', GOLD_L = '#f2cc68', GOLD_D = '#8f6a22', NAVY = '#121a36', NAVY_L = '#24305c', INK = '#0c1022';
export const FONT = 'Silkscreen, "Press Start 2P", monospace';
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
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
  mall:    { wall: '#6a4a14', roof: '#3a2a0a', accent: '#fff1b0', label: 'Luxury - demo KIBBLE' },
  jewel:   { wall: '#24305c', roof: '#121a36', accent: '#cfe8ff', label: 'Jewelry' },
  designer:{ wall: '#5a2352', roof: '#3f1739', accent: '#f0a6dc', label: 'Designer outfits' },
  goldden: { wall: '#7a4a24', roof: '#4a2a14', accent: '#f2cc68', label: 'Gold furniture' },
  luxauto: { wall: '#1c1c24', roof: '#0c0c12', accent: '#e3b341', label: 'Car previews' },
  office:  { wall: '#2a1a4a', roof: '#1a1030', accent: '#f2cc68', label: "President Inu" },
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

function legacyBuilding(c, b) {
  const x = b.x * TILE, y = b.y * TILE, w = b.w * TILE, h = b.h * TILE, th = THEMES[b.id];
  const im = ART['building-' + b.id];
  if (im) { // reference-art building, bottom-aligned on its footprint
    const H = Math.min(h + 4 * TILE, (w + TILE) * im.height / im.width), W = H * im.width / im.height;
    R(c, x + 4, y + h - 6, w - 8, 10, 'rgba(8,10,24,0.35)');
    c.drawImage(im, Math.round(x + w / 2 - W / 2), Math.round(y + h + 10 - H), Math.round(W), Math.round(H));
    return;
  }
  storefront(c, x, y, w, h, th, b.name);
  // small tag plate under sign
  c.font = `8px ${FONT}`; const tw = c.measureText(th.label.toUpperCase()).width + 10;
  R(c, x + w / 2 - tw / 2 - 4, y + h - 10, tw, 9, NAVY); R(c, x + w / 2 - tw / 2 - 4, y + h - 2, tw, 1, GOLD);
  c.fillStyle = th.accent; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(th.label.toUpperCase(), x + w / 2 - 4, y + h - 5);
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
function legacyNpcHouse(c, h) { const I = NPC_INTERIORS[h.id]; house(c, h.x * TILE, h.y * TILE, h.w * TILE, h.h * TILE, I.roof, shade(WALLS[I.wall].color, 0.7), `${h.owner}'s`); }


// ---------- square front-facing building art (drop-in: assets/buildings/<id>.png + manifest.json) ----------
export const BIMG = {};
export const buildingsReady = typeof Image === 'undefined' ? Promise.resolve() : fetch('assets/buildings/manifest.json').then((r) => r.json()).then((m) => Promise.all(m.buildings.map((b) => new Promise((res) => {
  const im = new Image(); im.onload = () => { BIMG[b.id] = im; res(); }; im.onerror = () => res(); im.src = 'assets/buildings/' + b.file; })))).catch(() => {});
const HOUSE_ART = { h1: 'house_1', h2: 'house_2', h3: 'house_3', h4: 'house_4' };
// draw a building image bottom-aligned on footprint (fx,fy,fw,fh in tiles); returns false if art missing
function drawBuildingArt(c, id, fx, fy, fw, fh) {
  const im = BIMG[id]; if (!im) return false;
  const k = Math.max(1, Math.floor((fw * TILE) / im.width)), w = im.width * k, h = im.height * k; // integer upscale when the art is smaller than its footprint
  c.drawImage(im, fx * TILE + Math.round((fw * TILE - w) / 2), (fy + fh) * TILE - h, w, h); return true;
}
function plaque(c, text, cx, y) {
  c.font = `8px ${FONT}`; const w = Math.ceil(c.measureText(text).width) + 10;
  R(c, cx - w / 2 - 1, y - 1, w + 2, 13, INK); R(c, cx - w / 2, y, w, 11, NAVY); R(c, cx - w / 2, y + 10, w, 1, GOLD);
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = GOLD_L; c.fillText(text, Math.round(cx), y + 6);
}
const sp = (spr, wx, wy, base) => ({ y: base, d: (c) => c.drawImage(spr, wx, wy, spr.width * SCALE, spr.height * SCALE) });

let yardCv = null;
function yard() { // pre-rendered grass yard for claimed plots (6x6 tiles, native)
  if (yardCv) return yardCv; const [cv, c] = mk(6 * N, 6 * N);
  c.fillStyle = PAL.g2; c.fillRect(0, 0, cv.width, cv.height);
  for (let i = 0; i < 260; i++) P(c, hash(i, 1) * cv.width | 0, hash(i, 2) * cv.height | 0, hash(i, 3) < 0.5 ? PAL.g1 : PAL.g3);
  for (let i = 0; i < 14; i++) { const x = hash(i, 4) * 88 | 0, y = hash(i, 5) * 88 | 0; P(c, x, y + 2, PAL.g0, 5, 1); P(c, x, y, PAL.g4); P(c, x + 2, y - 1, PAL.g4); P(c, x + 4, y, PAL.g4); }
  P(c, 0, 0, PAL.g0, cv.width, 1); return (yardCv = cv);
}

function groundExtras(c) {
  const S = sprites(), shTree = (x, y) => shadowEllipse(c, x * N + 8, y * N + 14, 9, 3, 0.3);
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (MAP[y][x] === T.TREE) shTree(x, y);
  for (const b of [...BUILDINGS, ...MALL_BUILDINGS, ...NPC_HOMES, CLUBHOUSE, LEADERS]) { // soft cast shadow (sun from top-left)
    c.fillStyle = 'rgba(16,24,48,.28)'; c.fillRect(b.x * N + 4, (b.y + b.h) * N, b.w * N, 3); c.fillRect((b.x + b.w) * N, b.y * N + 6 - 2 * N, 4, b.h * N + 2 * N - 3);
    c.fillStyle = 'rgba(16,24,48,.14)'; c.fillRect(b.x * N + 6, (b.y + b.h) * N + 3, b.w * N, 2);
  }
  for (const [lx, ly] of LAMP_TILES) shadowEllipse(c, lx * N + 8, ly * N + 12, 4, 1, 0.3);
  // lily pads + reeds on ponds
  for (const [x0, y0, w, h] of [[5, 3, 9, 5], [37, 35, 18, 4]]) for (let i = 0; i < w; i += 3) {
    if (BRIDGES.some((b) => x0 + i + 1 >= b.x - 1 && x0 + i + 1 <= b.x + b.w)) continue;
    const lx = (x0 + i + 1) * N + 2, ly = (y0 + 1 + (i % 2) * (h - 3)) * N + 6;
    P(c, lx, ly, '#2c7a3c', 7, 4); P(c, lx + 1, ly - 1, '#2c7a3c', 5, 1); P(c, lx + 2, ly, '#4fa858', 3, 1); P(c, lx + 3, ly + 2, PAL.w1, 1, 2); if (i % 2 === 0) { P(c, lx + 5, ly - 2, PAL.pink2, 2, 2); P(c, lx + 5, ly - 2, PAL.pink3); }
  }
}

export function prerenderMap() {
  const S = sprites(), props = [];
  const ground = buildGround(groundExtras);
  // trees: sakura near the ponds/Sakura Lane, green elsewhere
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (MAP[y][x] === T.TREE) {
    const sak = (x < 29 && y < 11) || (y > 33 && y < 42 && x < 30) || (x > 33 && y > 33 && y < 41) ? hash(x, y, 5) < 0.75 : hash(x, y, 5) < 0.12, spr = sak ? S.sakura : S.tree;
    props.push({ y: (y + 1) * TILE - 4, d: (c) => c.drawImage(spr, x * TILE + 16 - 48, (y + 1) * TILE - 132 + 3, spr.width * 3, spr.height * 3) }); // park trees at 3 native px (2.4x a Shiba)
  }
  for (const [lx, ly] of LAMP_TILES) props.push(sp(S.lamp, lx * TILE + 4, ly * TILE + 24 - 68, ly * TILE + 24));
  for (const [bx, by] of [[17, 6], [11, 8], [39, 34.2], [50, 34.2], [22, 52], [41, 52], [28, 47]]) props.push(sp(S.bench, bx * TILE, by * TILE + 4, by * TILE + 28));
  for (const [cx, cy] of [[61, 6], [61, 7], [60.6, 6.5], [34.3, 9.2], [26.4, 19.0]]) props.push(sp(S.crate, cx * TILE, cy * TILE, cy * TILE + 28));
  // flowering bushes flanking each shop door, hedges at NPC home fronts
  for (const d of DECOR) if (d.kind === 'planter') props.push({ y: d.y * TILE + 28, d: (c) => c.drawImage(S.streetTree, d.x * TILE - 14, d.y * TILE + 28 - S.streetTree.height * 3, 60, S.streetTree.height * 3) }); // street trees at 3x else if (d.kind !== 'car') props.push(d.kind === 'hedge' ? sp(S.hedge, d.x * TILE, d.y * TILE + 4, d.y * TILE + 30) : sp(S[d.kind], d.x * TILE - 2, d.y * TILE + 4, d.y * TILE + 30));
  for (const h of NPC_HOMES) props.push(sp(S.mailbox, (h.x + 5) * TILE + 6, (h.y + h.h + 1) * TILE - 34, (h.y + h.h + 1) * TILE - 2));
  // buildings (square front-facing art; legacy procedural storefront if the PNG is missing)
  for (const b of [...BUILDINGS, ...MALL_BUILDINGS]) props.push({ y: (b.y + b.h) * TILE - 1, d: (c) => { if (!drawBuildingArt(c, b.id, b.x, b.y, b.w, b.h)) legacyBuilding(c, b); } });
  for (const h of NPC_HOMES) props.push({ y: (h.y + h.h) * TILE - 1, d: (c) => { if (!drawBuildingArt(c, HOUSE_ART[h.id], h.x, h.y, h.w, h.h)) legacyNpcHouse(c, h); plaque(c, `${h.owner.toUpperCase()}'S`, (h.x + 1.5) * TILE, (h.y + h.h) * TILE - 22); } });
  props.push({ y: (LEADERS.y + LEADERS.h) * TILE - 1, d: (c) => { if (drawBuildingArt(c, 'leaders', LEADERS.x, LEADERS.y, LEADERS.w, LEADERS.h)) return;
    const x = LEADERS.x * TILE, y = LEADERS.y * TILE - 20; R(c, x + 6, y + 40, 4, 44, GOLD_D); R(c, x + 86, y + 40, 4, 44, GOLD_D);
    R(c, x - 4, y - 4, 104, 68, GOLD); R(c, x, y, 96, 60, NAVY); pixelText(c, 'LEADERBOARDS', x + 48, y + 10, 90, 8, GOLD_L); } });
  // district signposts (wooden plank sign on two posts)
  const signpost = (txt, tx, ty) => { const [cv, c] = mk(1, 1); c.font = `8px ${FONT}`; const w = Math.ceil(c.measureText(txt).width) + 16; cv.width = w; cv.height = 34; const k = cv.getContext('2d');
    R(k, 6, 16, 4, 18, PAL.woodD); R(k, w - 10, 16, 4, 18, PAL.woodD); R(k, 7, 16, 1, 18, PAL.woodL); R(k, w - 9, 16, 1, 18, PAL.woodL);
    R(k, 0, 0, w, 20, INK); R(k, 1, 1, w - 2, 18, PAL.wood); R(k, 1, 1, w - 2, 2, PAL.woodL); R(k, 1, 17, w - 2, 2, PAL.woodD); for (const xx of [3, w - 5]) R(k, xx, 8, 2, 2, GOLD);
    k.font = `8px ${FONT}`; k.textAlign = 'center'; k.textBaseline = 'middle'; k.fillStyle = '#3a2210'; k.fillText(txt, w / 2, 11); k.fillStyle = '#fff1d0'; k.fillText(txt, w / 2, 10);
    props.push({ y: ty * TILE + 30, d: (c) => c.drawImage(cv, Math.round(tx * TILE), ty * TILE - 4) }); };
  signpost('MARKET ROW - TOKEN STALLS', 34, 5); signpost('SAKURA POND', 14.5, 2); signpost('SAKURA LANE', 2, 41); signpost('KIBBLE MALL DISTRICT', 9, 46); signpost('DEMO KIBBLE ONLY', 49, 46);
  // dealership + luxury showroom display cars on the forecourt (same model/scale as traffic)
  for (const [tx, ty, col, kind, dir] of [[50.2, 18.9, '#c8323c', 'sedan', 'east'], [58.8, 18.9, '#2f6fbd', 'coupe', 'west'], [45.4, 66.9, '#e3b341', 'limo', 'east'], [55.0, 66.9, '#141a2e', 'coupe', 'west']])
    props.push({ y: ty * TILE, d: (c) => drawCar(c, tx * TILE, ty * TILE, { col, kind, dir }) });
  props.sort((a, b) => a.y - b.y);
  return { ground, props };
}

// Dynamic, y-sortable drawables: claimed homes, unclaimed plots, stalls, clubhouse.
export function dynamicProps(state, t, pack) {
  const out = [], S = sprites();
  { const ph = t % 12, st = ph < 5 ? 2 : ph < 6 ? 1 : 0, av = ph >= 6 && ph < 11 ? 2 : ph >= 11 ? 1 : 0; // main junction traffic lights
    for (const [lx, ly, street] of [[30, 19, 0], [34, 19, 1], [30, 23, 1], [34, 23, 0]]) { const spr = S['light' + (street ? st : av)], X = lx * TILE + (lx < 31 ? 16 : 4), B = ly * TILE + (ly < 20 ? 22 : 28);
      out.push({ y: B, d: (c) => c.drawImage(spr, X, B - spr.height * 2, spr.width * 2, spr.height * 2) }); } }
  PLOTS.forEach((p, i) => {
    const x = p.x * TILE, y = p.y * TILE, w = p.w * TILE, h = p.h * TILE, home = state.plots[p.id];
    if (home) {
      out.push({ y: y - 1, flat: true, d: (c) => c.drawImage(yard(), x, y, w, h) });
      out.push({ y: y + h - 1, d: (c) => { if (!drawBuildingArt(c, 'house_' + ((i % 4) + 1), p.x, p.y + 1, p.w, p.h - 1)) house(c, x, y, w, h, home.roof, shade(WALLS[home.wall].color, 0.7), `${state.player.name}'s Home`); plaque(c, 'YOUR HOME', x + 1.5 * TILE, y + h - 22); } });
      const mx = (p.x + 5) * TILE + 8, my = (p.y + p.h + 1) * TILE - 2, un = unreadMail(state);
      out.push({ y: my, d: (c) => { c.drawImage(S.mailbox, mx, my - 36, 20, 36); if (un) { const b = Math.round(Math.sin(t * 4) * 2); R(c, mx + 18, my - 44 + b, 2, 12, GOLD_D); R(c, mx + 20, my - 44 + b, 8, 5, '#ffd84a'); } } });
    } else {
      for (let k = 0; k < p.w; k++) out.push(sp(S.fence, x + k * TILE, y - 10, y + 12));
      out.push({ y: y + h * 0.5 + 30, d: (c) => { const sx = x + w / 2, sy = Math.round(y + h / 2 + Math.sin(t * 2 + p.x) * 1.5);
        R(c, sx - 2, sy - 4, 5, 34, PAL.woodD); R(c, sx - 1, sy - 4, 1, 34, PAL.woodL); R(c, sx - 45, sy - 33, 90, 38, INK);
        R(c, sx - 44, sy - 32, 88, 36, GOLD); R(c, sx - 42, sy - 30, 84, 32, NAVY); pixelText(c, 'FOR CLAIM', sx, sy - 21, 78, 8, GOLD_L); pixelText(c, '300 BONES', sx, sy - 9, 78, 8, '#f6e7b8', null); } });
    }
  });
  state.tokens.forEach((tok, i) => { if (i < STALL_SLOTS.length) { const s = STALL_SLOTS[i]; out.push({ y: s.y * TILE + 58, d: (c) => drawStall(c, tok, s) }); } });
  out.push(...clubhouseProps(state, t, pack));
  return out;
}
function drawStall(c, tok, s) {
  const x = s.x * TILE, y = s.y * TILE;
  R(c, x + 6, y + 56, 84, 6, 'rgba(16,24,48,.3)');
  R(c, x + 3, y + 27, 86, 32, INK); R(c, x + 4, y + 28, 84, 30, '#6a4428'); R(c, x + 4, y + 28, 84, 3, GOLD); R(c, x + 4, y + 55, 84, 3, '#4a2e1a'); for (let k = 0; k < 6; k++) R(c, x + 8 + k * 14, y + 34, 1, 20, '#5a3820');
  R(c, x + 6, y + 6, 3, 24, GOLD_D); R(c, x + 83, y + 6, 3, 24, GOLD_D);
  for (let k = 0; k < 6; k++) { R(c, x + 4 + k * 14, y + 4, 14, 14, k % 2 ? '#f6efe0' : tok.color); R(c, x + 5 + k * 14, y + 18, 12, 3, k % 2 ? '#f6efe0' : tok.color); R(c, x + 4 + k * 14, y + 4, 14, 2, '#ffffff40'); }
  R(c, x + 2, y + 2, 88, 3, GOLD);
  R(c, x + 34, y + 32, 24, 20, tok.color); R(c, x + 34, y + 32, 24, 2, '#ffffff55');
  pixelText(c, tok.ticker.slice(0, 4), x + 46, y + 42, 22, 7, '#fff', INK);
  c.font = `8px ${FONT}`; const lbl = '$' + tok.ticker + (tok.curve.graduated ? ' *' : ''); const lw = c.measureText(lbl).width + 8;
  R(c, x + 46 - lw / 2, y - 12, lw, 12, NAVY); R(c, x + 46 - lw / 2, y - 1, lw, 1, GOLD);
  c.fillStyle = GOLD_L; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(lbl, x + 46, y - 6);
}
// kept for drop-in compatibility (flat passes are now part of dynamicProps)
export function drawPlots() {} export function drawStalls() {}
export function drawClubhouse(c, state, t, pack) { for (const p of clubhouseProps(state, t, pack)) p.d(c); }

function clubhouseProps(state, t, pack) {
  const b = CLUBHOUSE, x = b.x * TILE, y = b.y * TILE, w = b.w * TILE, h = b.h * TILE, S = sprites();
  if (!pack) return [...Array.from({ length: b.w }, (_, k) => sp(S.fence, x + k * TILE, y + h - 22, y + h)), { y: y + h - 10, d: (c) => {
    const sx = x + w / 2, sy = y + h / 2 + 4; R(c, sx - 2, sy, 5, 30, PAL.woodD);
    R(c, sx - 71, sy - 31, 142, 42, INK); R(c, sx - 70, sy - 30, 140, 40, GOLD); R(c, sx - 68, sy - 28, 136, 36, NAVY);
    pixelText(c, 'PACK CLUBHOUSE', sx, sy - 18, 128, 8, GOLD_L); pixelText(c, 'FOUND OR JOIN A PACK', sx, sy - 5, 128, 8, '#f6e7b8', null); } }];
  const ch = pack.clubhouse;
  return [{ y: y + h - 1, d: (c) => {
    if (!drawBuildingArt(c, 'clubhouse', b.x, b.y, b.w, b.h)) house(c, x, y, w, h, ch.roof || pack.color, shade(WALLS[ch.wall]?.color || '#f3e6cf', 0.7), `${pack.name}`);
    const px = x + w + 6, top = y - 40;
    R(c, px - 2, top, 4, h + 34, GOLD_D); R(c, px - 1, top, 1, h + 34, GOLD_L); R(c, px - 4, top - 5, 8, 6, GOLD_L); R(c, px - 6, y + h - 8, 12, 4, GOLD_D);
    const bw = 46, bh = 30;
    for (let i = 0; i < bw; i += 2) { const wave = Math.round(Math.sin(t * 4 - i * 0.18) * 2 * (i / bw));
      R(c, px + 2 + i, top + 2 + wave, 2, bh, pack.color); R(c, px + 2 + i, top + 2 + wave, 2, 2, shade(pack.color, 1.3)); R(c, px + 2 + i, top + bh + wave, 2, 2, shade(pack.color, 0.6)); if (i % 8 === 0) R(c, px + 2 + i, top + bh + 2 + wave, 2, 3, GOLD); }
    const wv = Math.round(Math.sin(t * 4 - 10 * 0.18) * 2 * 0.4);
    R(c, px + 9, top + 6 + wv, 14, 14, '#fff6e0'); drawEmblem(c, pack.emblem, px + 10, top + 7 + wv, 2.4, pack.color);
    pixelText(c, pack.tag, px + 35, top + 14 + wv, 20, 8, '#fff6e0', INK);
    plaque(c, pack.name.toUpperCase().slice(0, 18), x + w / 2, y + h + 2);
  } }];
}

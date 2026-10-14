// Kibble Mall luxury district: marble forecourt, tiered fountain, parterres, topiary, palms, facade, sparkles, night uplighting.
// Original pixel art. Ground bits are painted at native res (N=16/tile); props are native sprites drawn at 2x (U=2).
import { TILE, FOUNTAIN, FORECOURT, MALL_BUILDINGS, BUILDINGS, DECOR } from './world.js';
import { N, PAL, mk, P, hash } from './tiles.js';
import { drawCar } from './cars.js';

const MARBLE = '#f3efe6', MARBLE_D = '#d9d2c4', VEIN = '#c6bfb2', GOLD = '#e3b341', GOLD_L = '#ffe08a', GOLD_D = '#9c7424', RED = '#b3202c', RED_L = '#d8404a', RED_D = '#7a1018', BOX = '#2f6e3a', BOX_L = '#4f9a4a', BOX_D = '#1e4a28';
const blob = (c, cx, cy, r, col) => { for (let yy = -r; yy <= r; yy++) { const hw = Math.round(Math.sqrt(r * r - yy * yy)); P(c, cx - hw, cy + yy, col, hw * 2 + 1, 1); } };
const SHOPS = [...BUILDINGS, ...MALL_BUILDINGS.filter((b) => b.id !== 'mall' && b.id !== 'office')];
export const MALL = MALL_BUILDINGS.find((b) => b.id === 'mall');
export const FCX = (FOUNTAIN.x + FOUNTAIN.w / 2) * TILE, FCY = (FOUNTAIN.y + FOUNTAIN.h / 2) * TILE; // fountain centre (world)

// ---------- ground (native) ----------
export function luxuryGround(c) {
  const F = FORECOURT, x0 = F.x * N, y0 = F.y * N, w = F.w * N, h = F.h * N;
  for (let ty = 0; ty < F.h * 2; ty++) for (let tx = 0; tx < F.w * 2; tx++) { const px = x0 + tx * 8, py = y0 + ty * 8; // polished 8px marble slabs
    P(c, px, py, (tx + ty) % 2 ? MARBLE : '#ebe5d8', 8, 8); P(c, px, py, '#fbf8f1', 8, 1); P(c, px + 7, py, MARBLE_D, 1, 8);
    if (hash(tx, ty, 61) < 0.35) { const vx = px + (hash(tx, ty, 62) * 5 | 0); P(c, vx, py + 2, VEIN, 2, 1); P(c, vx + 2, py + 3, VEIN, 2, 1); P(c, vx + 3, py + 4, VEIN, 1, 2); } }
  P(c, x0, y0, GOLD_D, w, 1); P(c, x0, y0 + h - 2, GOLD_D, w, 2); P(c, x0, y0, GOLD_D, 2, h); P(c, x0 + w - 2, y0, GOLD_D, 2, h); P(c, x0 + 2, y0 + h - 3, GOLD, w - 4, 1);
  // gold-inlaid medallion ring around the fountain
  const cx = FCX / 2, cy = FCY / 2;
  for (let yy = -40; yy <= 40; yy++) for (let xx = -52; xx <= 52; xx++) { const d = Math.hypot(xx / 1.3, yy); if (d > 40) continue;
    if (d > 38) P(c, cx + xx, cy + yy, GOLD_D); else if (d > 36) P(c, cx + xx, cy + yy, (Math.floor(Math.atan2(yy, xx) * 10) % 2) ? GOLD : GOLD_L); else if (d > 35) P(c, cx + xx, cy + yy, GOLD_D); }
  // red carpet from the grand stairs down to the fountain
  const rx = 31 * N + 2, rw = 2 * N - 4, ry0 = (MALL.y + MALL.h) * N, ry1 = FOUNTAIN.y * N - 8;
  P(c, rx - 1, ry0, RED_D, rw + 2, ry1 - ry0 + 1); P(c, rx, ry0, RED, rw, ry1 - ry0); P(c, rx + 1, ry0, RED_L, 1, ry1 - ry0); P(c, rx + 2, ry0, GOLD, 1, ry1 - ry0); P(c, rx + rw - 3, ry0, GOLD, 1, ry1 - ry0);
  P(c, rx, ry1, GOLD_D, rw, 2); for (let x = rx + 2; x < rx + rw - 2; x += 3) P(c, x, ry1 + 2, GOLD, 1, 2); // tasselled end
  // parterres: clipped boxwood knot with roses, tulips and lavender in neat rows
  for (const d of DECOR) if (d.kind === 'parterre') { const px = d.x * N, py = d.y * N; P(c, px, py, '#5a8a3a', N, N); for (let i = 0; i < 6; i++) P(c, px + (hash(d.x, d.y, i) * 15 | 0), py + (hash(d.y, d.x, i) * 15 | 0), '#4a7a32'); }
  for (const x of [26, 35]) { const px = x * N, py = 61 * N, W = 3 * N, H = 8 * N;
    const hedge = (hx, hy, hw, hh) => { P(c, hx, hy + 1, BOX_D, hw, hh); P(c, hx, hy, BOX, hw, hh); P(c, hx, hy, BOX_L, hw, 1); };
    hedge(px, py, W, 3); hedge(px, py + H - 4, W, 3); hedge(px, py, 3, H - 1); hedge(px + W - 3, py, 3, H - 1); hedge(px + W / 2 - 1, py + 3, 3, H - 7); // frame + spine
    for (let k = 0; k < 4; k++) { const by = py + 6 + k * 30; hedge(px + 3, by + 12, W - 6, 2); // cross ribs between beds
      const kinds = [['#d8283c', '#ff7080'], ['#ff8fc0', '#ffe08a'], ['#8a5ad0', '#b48cf0'], ['#d8283c', '#ff7080']][k];
      for (let r = 0; r < 3; r++) for (let fx = px + 5; fx < px + W - 4; fx += 4) { if (Math.abs(fx - (px + W / 2)) < 3) continue; const fy = by + r * 4;
        P(c, fx, fy + 2, BOX_D, 2, 1); if (k === 2) { P(c, fx, fy, kinds[0], 1, 2); P(c, fx + 1, fy - 1, kinds[1], 1, 2); } else { P(c, fx, fy, kinds[0], 2, 2); P(c, fx, fy, kinds[1]); } } } }
}

// ---------- sprites (native) ----------
const SP = {};
function topiary(kind) { const [cv, c] = mk(18, 34); // in a gold-rimmed stone urn
  P(c, 3, 26, '#141a2e', 12, 8); P(c, 4, 27, '#e8e2d6', 10, 6); P(c, 4, 27, GOLD, 10, 1); P(c, 4, 32, '#b8b0a2', 10, 1); P(c, 8, 22, '#5e3c22', 2, 5);
  const g = (cx, cy, r) => { blob(c, cx, cy, r + 1, '#141a2e'); blob(c, cx, cy, r, BOX); blob(c, cx - 1, cy - 1, r - 2, BOX_L); P(c, cx - r + 2, cy - r + 2, '#8fd06a'); };
  if (kind === 'topBall') { g(9, 19, 5); g(9, 9, 6); }
  else if (kind === 'topSpiral') { for (let i = 0; i < 6; i++) g(9 + (i % 2 ? 2 : -2), 22 - i * 4, 5 - (i >> 1)); P(c, 9, 0, GOLD_L, 1, 2); }
  else { g(6, 18, 4); g(12, 18, 4); g(9, 14, 5); g(14, 9, 4); P(c, 16, 6, BOX, 2, 3); P(c, 12, 4, BOX, 2, 3); P(c, 3, 11, BOX, 2, 4); P(c, 15, 9, '#141a2e'); } // dog: body, head, ears, tail
  return cv; }
function palm() { const [cv, c] = mk(36, 60);
  for (let i = 0; i < 26; i++) { const x = 17 + Math.round(Math.sin(i / 7) * 2); P(c, x, 18 + i, i % 3 ? '#9a6a3c' : '#6a4428', 3, 1); }
  const frond = (dx, dy) => { for (let i = 0; i < 14; i++) { const x = 18 + Math.round(dx * i), y = 16 + Math.round(dy * i + (i * i) / 18); P(c, x, y, i % 2 ? PAL.leaf2 : PAL.leaf1, 2, 2); P(c, x, y + 2, PAL.leaf0, 2, 1); } };
  for (const [dx, dy] of [[-1.2, -0.5], [1.2, -0.5], [-1.1, 0.1], [1.1, 0.1], [-0.5, -0.9], [0.5, -0.9], [0, -1]]) frond(dx, dy);
  blob(c, 18, 17, 2, '#6a4428'); P(c, 17, 16, PAL.leaf4, 2, 1);
  P(c, 8, 44, '#141a2e', 20, 16); P(c, 9, 45, GOLD, 18, 14); P(c, 9, 45, GOLD_L, 18, 2); P(c, 9, 57, GOLD_D, 18, 2); for (let x = 11; x < 26; x += 4) P(c, x, 49, GOLD_D, 2, 6); P(c, 10, 44, '#4a2e1c', 16, 2);
  return cv; }
function ornateLamp() { const [cv, c] = mk(16, 52);
  P(c, 3, 46, '#141a2e', 10, 6); P(c, 4, 47, GOLD_D, 8, 4); P(c, 7, 12, '#141a2e', 2, 35); P(c, 7, 12, '#2c3350', 1, 35); P(c, 6, 30, GOLD, 4, 2);
  for (const sx of [1, 11]) { P(c, sx, 4, '#141a2e', 4, 8); P(c, sx + 1, 5, PAL.glass, 2, 6); P(c, sx, 3, GOLD, 4, 1); } P(c, 3, 11, GOLD, 10, 2); P(c, 6, 1, '#141a2e', 4, 11); P(c, 7, 2, PAL.glass, 2, 8); P(c, 6, 0, GOLD_L, 4, 1);
  return cv; }
function stanchion() { const [cv, c] = mk(6, 16); P(c, 1, 14, GOLD_D, 4, 2); P(c, 2, 3, GOLD, 2, 11); P(c, 2, 3, GOLD_L, 1, 11); P(c, 1, 0, GOLD_L, 4, 3); return cv; }
function valet() { const [cv, c] = mk(16, 24); P(c, 2, 8, '#141a2e', 12, 16); P(c, 3, 9, '#2a1a4a', 10, 14); P(c, 3, 9, GOLD, 10, 1); P(c, 0, 0, '#141a2e', 16, 8); P(c, 1, 1, GOLD, 14, 6); P(c, 2, 3, '#2a1a4a', 12, 2); P(c, 5, 15, GOLD_L, 6, 3); return cv; }
function banner(col) { const [cv, c] = mk(10, 30); P(c, 0, 0, GOLD, 10, 2); P(c, 1, 2, '#141a2e', 8, 26); P(c, 2, 2, col, 6, 24); P(c, 2, 26, col, 2, 2); P(c, 6, 26, col, 2, 2); P(c, 3, 8, GOLD_L, 4, 4); P(c, 4, 9, col, 2, 2); P(c, 2, 4, GOLD, 6, 1); return cv; }
function windowBox(seed) { const [cv, c] = mk(28, 12), fl = [['#d8283c', '#ff7080'], ['#ff8fc0', '#fff1b8'], ['#8a5ad0', '#b48cf0'], ['#ffd84a', '#fff6ea']];
  P(c, 0, 5, '#141a2e', 28, 7); P(c, 1, 6, '#5e3c22', 26, 5); P(c, 1, 6, GOLD, 26, 1); P(c, 1, 10, GOLD_D, 26, 1);
  for (let x = 2; x < 26; x += 3) { const [a, b] = fl[(x + seed) % 4]; P(c, x, 4, BOX, 2, 2); P(c, x, 1 + (x % 2), a, 2, 2); P(c, x, 1 + (x % 2), b); } return cv; }
function display(seed) { const [cv, c] = mk(18, 26); // glass window-display case on a gold-trim plinth
  P(c, 1, 18, '#141a2e', 16, 8); P(c, 2, 19, '#2a1a4a', 14, 6); P(c, 2, 19, GOLD, 14, 1); P(c, 0, 0, '#141a2e', 18, 19); P(c, 1, 1, '#cfeefa', 16, 17); P(c, 2, 2, '#ffffff', 2, 8);
  const goods = [() => { blob(c, 9, 11, 3, GOLD); blob(c, 9, 11, 1, '#cfeefa'); P(c, 8, 7, '#9fe8ff', 2, 2); }, () => { P(c, 6, 6, '#c8323c', 6, 10); P(c, 7, 4, '#141a2e', 4, 2); P(c, 6, 9, GOLD, 6, 1); }, () => { P(c, 4, 12, GOLD_D, 10, 4); P(c, 5, 8, '#8e2452', 8, 4); P(c, 5, 8, '#c84a82', 8, 1); }];
  goods[seed % 3](); P(c, 1, 17, GOLD_D, 16, 1); return cv; }
function aboard() { const [cv, c] = mk(14, 18); P(c, 1, 0, '#141a2e', 12, 16); P(c, 2, 1, '#2a2f44', 10, 13); P(c, 2, 1, GOLD, 10, 1); for (let y = 4; y < 13; y += 3) P(c, 3, y, '#f4f2ea', 4 + (y % 5), 1); P(c, 1, 16, '#5e3c22', 2, 2); P(c, 11, 16, '#5e3c22', 2, 2); return cv; }
function sprites() { if (!SP.palm) Object.assign(SP, { wb0: windowBox(0), wb1: windowBox(1), dc0: display(0), dc1: display(1), dc2: display(2), aboard: aboard(), topBall: topiary('topBall'), topSpiral: topiary('topSpiral'), topDog: topiary('topDog'), palm: palm(), lamp: ornateLamp(), stan: stanchion(), valet: valet(), banR: banner('#8e1a28'), banN: banner('#1e2a6a') }); return SP; }
const at2 = (spr, x, base) => ({ y: base, d: (c) => c.drawImage(spr, Math.round(x - spr.width), base - spr.height * 2, spr.width * 2, spr.height * 2) });

export const LUX_LAMPS = [[29, 60], [35, 60], [29, 69], [35, 69]];
export function luxuryProps() { const S = sprites(), out = [];
  for (const d of DECOR) if (S[d.kind]) out.push(at2(S[d.kind], d.x * TILE + 16, d.y * TILE + 30));
  for (const [x, y] of LUX_LAMPS) out.push(at2(S.lamp, x * TILE + 16, y * TILE + 28));
  const cy0 = (MALL.y + MALL.h) * TILE + 6, cy1 = FOUNTAIN.y * TILE - 20; // velvet ropes along the carpet
  for (const x of [31 * TILE - 2, 33 * TILE + 2]) { for (let y = cy0 + 16; y <= cy1; y += 40) out.push(at2(S.stan, x, y));
    out.push({ y: cy0 + 16, d: (c) => { for (let y = cy0 + 16; y + 40 <= cy1 + 1; y += 40) { c.fillStyle = RED_D; for (let k = 0; k <= 40; k += 2) c.fillRect(x - 1, y - 22 + k + Math.round(Math.sin((k / 40) * Math.PI) * 3), 2, 2); } } }); }
  out.push(at2(S.valet, 41 * TILE + 8, 59 * TILE - 2));
  // upscale storefronts across the outer shopping district: flower window boxes, glass window displays, A-board signs
  SHOPS.forEach((b, i) => { const cx = (b.x + b.w / 2) * TILE, base = (b.y + b.h) * TILE;
    for (const sx of [-1, 1]) { out.push(at2(S['wb' + (i % 2)], cx + sx * 64, base + 6)); out.push(at2(S['dc' + ((i + (sx > 0)) % 3)], cx + sx * 104, base + 22)); }
    out.push(at2(S.aboard, cx + 40, base + 30)); });
  out.push({ y: 59 * TILE, d: (c) => drawCar(c, 43 * TILE, 59 * TILE - 2, { col: GOLD, kind: 'limo', dir: 'west' }) });
  return out; }

// ---------- facade (native 224x128 for a 14x8 footprint, drawn at 2x) ----------
let FAC = null;
function facade() { const W = MALL.w * N, H = MALL.h * N, [cv, c] = mk(W, H), cx = W / 2;
  // body
  P(c, 4, 46, '#141a2e', W - 8, H - 60); P(c, 5, 47, MARBLE, W - 10, H - 62);
  for (let i = 0; i < 40; i++) { const x = 6 + (hash(i, 1, 9) * (W - 14) | 0), y = 50 + (hash(i, 2, 9) * (H - 70) | 0); P(c, x, y, VEIN, 3, 1); P(c, x + 2, y + 1, VEIN, 2, 1); }
  P(c, 2, 42, GOLD_D, W - 4, 6); P(c, 2, 42, GOLD, W - 4, 3); P(c, 2, 42, GOLD_L, W - 4, 1); for (let x = 6; x < W - 6; x += 6) P(c, x, 45, GOLD_D, 2, 2); // gold cornice
  // pediment + dome
  for (let i = 0; i < 18; i++) P(c, cx - 50 + i * 2.6, 42 - i, MARBLE, 100 - i * 5.2, 1); P(c, cx - 52, 41, GOLD, 104, 2);
  for (let i = 0; i < 18; i++) { P(c, cx - 50 + i * 2.6 - 1, 42 - i, GOLD, 2, 1); P(c, cx + 50 - i * 2.6 - 1, 42 - i, GOLD, 2, 1); }
  for (let yy = -26; yy <= 0; yy++) { const hw = Math.round(Math.sqrt(26 * 26 - yy * yy) * 1.15); P(c, cx - hw - 1, 24 + yy, '#141a2e', hw * 2 + 2, 1); P(c, cx - hw, 24 + yy, '#4fb0a0', hw * 2, 1); P(c, cx - hw, 24 + yy, '#8fe0d0', Math.round(hw * 0.5), 1); P(c, cx + Math.round(hw * 0.6), 24 + yy, '#2f7a72', Math.round(hw * 0.4), 1); }
  for (const dx of [-20, -10, 0, 10, 20]) for (let y = 0; y < 26; y++) { const x = cx + Math.round(dx * Math.cos(((24 - y) / 26) * 1.2)); P(c, x, y, GOLD); }
  P(c, cx - 31, 22, GOLD, 62, 3); P(c, cx - 31, 22, GOLD_L, 62, 1); P(c, cx - 1, -2 + 0, GOLD_L, 2, 4); blob(c, cx, 1, 1, GOLD_L); // gold trim + finial
  P(c, cx - 30, 25, '#141a2e', 60, 8); P(c, cx - 29, 26, MARBLE, 58, 6); for (let x = cx - 26; x < cx + 26; x += 6) P(c, x, 27, '#9fd8f5', 3, 4); // drum windows
  // columns across the portico
  const colY0 = 52, colY1 = H - 22;
  for (let k = 0; k < 8; k++) { const x = cx - 63 + k * 18; P(c, x - 1, colY0 - 2, GOLD, 10, 3); P(c, x - 1, colY0 - 2, GOLD_L, 10, 1); P(c, x, colY0 + 1, '#ffffff', 8, colY1 - colY0); P(c, x + 1, colY0 + 1, '#f8f6f0', 2, colY1 - colY0); P(c, x + 5, colY0 + 1, MARBLE_D, 3, colY1 - colY0); P(c, x + 3, colY0 + 1, '#e8e2d6', 1, colY1 - colY0); P(c, x - 1, colY1, GOLD_D, 10, 2); }
  // arched windows in the wings
  for (const wx of [10, 24, W - 34, W - 20]) for (const wy of [54, 76]) { P(c, wx - 1, wy - 1, GOLD_D, 12, 16); P(c, wx, wy, '#ffe9a8', 10, 14); P(c, wx + 1, wy - 1, GOLD_D, 8, 1); P(c, wx, wy + 6, GOLD_D, 10, 1); P(c, wx + 4, wy, GOLD_D, 1, 14); P(c, wx + 1, wy + 1, '#fff8dc', 2, 3); }
  // glass doors with glow (between the middle columns)
  const dx0 = cx - 18, dy0 = colY1 - 30; P(c, dx0 - 2, dy0 - 4, GOLD_D, 40, 34); P(c, dx0 - 2, dy0 - 4, GOLD, 40, 2);
  for (const k of [0, 1]) { const x = dx0 + k * 18; P(c, x, dy0, '#9fd8f5', 16, 30); P(c, x + 1, dy0 + 1, '#fff3c0', 14, 28); P(c, x + 3, dy0 + 3, '#ffffff', 2, 10); P(c, x + (k ? 1 : 13), dy0 + 13, GOLD_L, 2, 5); P(c, x, dy0, GOLD, 16, 1); }
  // grand staircase
  for (let s = 0; s < 5; s++) { const sw = 70 + s * 12, sy = colY1 + 2 + s * 4; P(c, cx - sw / 2, sy, s % 2 ? MARBLE_D : '#ffffff', sw, 4); P(c, cx - sw / 2, sy + 3, '#b8b0a2', sw, 1); }
  P(c, cx - 14, colY1 + 2, RED, 28, 20); P(c, cx - 13, colY1 + 2, RED_L, 2, 20); P(c, cx - 12, colY1 + 2, GOLD, 1, 20); P(c, cx + 11, colY1 + 2, GOLD, 1, 20); for (let s = 0; s < 5; s++) P(c, cx - 14, colY1 + 5 + s * 4, RED_D, 28, 1);
  return cv; }
export function drawMallFacade(c, pixelText) { if (!FAC) FAC = facade(); const S = sprites(), x = MALL.x * TILE, y = MALL.y * TILE;
  c.drawImage(FAC, x, y, FAC.width * 2, FAC.height * 2);
  for (const [k, bx] of [[0, 52], [1, 80], [0, MALL.w * TILE - 72], [1, MALL.w * TILE - 100]]) c.drawImage(k ? S.banN : S.banR, x + bx, y + 104, 20, 60); // hanging banners
  const sx = x + MALL.w * TILE / 2, sy = y + 92; // gold signage on the frieze
  c.fillStyle = '#141a2e'; c.fillRect(sx - 92, sy - 12, 184, 24); c.fillStyle = GOLD; c.fillRect(sx - 90, sy - 10, 180, 20); c.fillStyle = '#2a1a4a'; c.fillRect(sx - 86, sy - 6, 172, 12);
  pixelText(c, 'KIBBLE MALL', sx, sy + 1, 166, 12, GOLD_L); }

// ---------- animated: fountain + gold sparkles ----------
const SPARKS = [];
export function luxuryDynamic(t, night) { const out = [];
  out.push({ y: (FOUNTAIN.y + FOUNTAIN.h) * TILE - 4, d: (c) => drawFountain(c, t, night) });
  if (!SPARKS.length) { const m = MALL.x * TILE, my = MALL.y * TILE; for (let i = 0; i < 26; i++) SPARKS.push([m + 40 + hash(i, 4) * (MALL.w * TILE - 80), my + 30 + hash(i, 5) * 70, hash(i, 6) * 6]);
    for (const d of DECOR) if (d.kind === 'palm') SPARKS.push([d.x * TILE + 16, d.y * TILE + 14, hash(d.x, d.y) * 6]); for (let i = 0; i < 8; i++) SPARKS.push([FCX - 40 + i * 11, FCY + 18, i]); }
  out.push({ y: 1e9, d: (c) => { for (const [x, y, p] of SPARKS) { const k = (t * 1.3 + p) % 3; if (k > 0.5) continue; const s = k < 0.25 ? 2 : 1, a = 1 - Math.abs(k - 0.25) * 4;
    c.globalAlpha = a; c.fillStyle = '#fff8d0'; c.fillRect(Math.round(x) - 1, Math.round(y) - 1 - s * 2, 2, 2 + s * 4); c.fillRect(Math.round(x) - 1 - s * 2, Math.round(y) - 1, 2 + s * 4, 2); c.globalAlpha = 1; } } });
  return out; }
function ellipse(c, cx, cy, rx, ry, col) { c.fillStyle = col; for (let yy = -ry; yy <= ry; yy += 2) { const hw = Math.round((rx * Math.sqrt(1 - (yy / (ry + 1)) ** 2)) / 2) * 2; c.fillRect(Math.round(cx - hw), Math.round(cy + yy), hw * 2, 2); } }
function drawFountain(c, t, night) { const cx = FCX, cy = FCY + 6;
  // lower basin
  ellipse(c, cx + 4, cy + 34, 66, 16, 'rgba(16,24,48,.3)'); ellipse(c, cx, cy + 24, 66, 22, '#141a2e'); ellipse(c, cx, cy + 20, 64, 20, '#e8e2d6'); ellipse(c, cx, cy + 16, 58, 16, GOLD); ellipse(c, cx, cy + 16, 54, 14, '#2f6cbd');
  for (let i = 0; i < 10; i++) { const a = t * 0.8 + i * 0.63, rx = Math.cos(a) * (20 + (i % 3) * 10), ry = Math.sin(a) * (5 + (i % 3) * 2.5); c.fillStyle = i % 2 ? '#8cc6f4' : '#4b8fe0'; c.fillRect(Math.round(cx + rx), Math.round(cy + 16 + ry), 6, 2); }
  if (night) { c.fillStyle = 'rgba(255,230,150,.55)'; for (let i = 0; i < 6; i++) { const a = i * 1.047; c.fillRect(Math.round(cx + Math.cos(a) * 48), Math.round(cy + 16 + Math.sin(a) * 11), 4, 2); } }
  P(c, cx - 66, cy + 20, '#cfc8ba', 132, 4); P(c, cx - 64, cy + 24, '#b8b0a2', 128, 6);
  // column + middle tier + top tier
  P(c, cx - 8, cy - 26, '#141a2e', 16, 44); P(c, cx - 6, cy - 26, '#f3efe6', 12, 44); P(c, cx - 6, cy - 26, '#ffffff', 3, 44); P(c, cx + 3, cy - 26, '#d9d2c4', 3, 44);
  ellipse(c, cx, cy - 14, 32, 8, '#141a2e'); ellipse(c, cx, cy - 16, 30, 7, '#f3efe6'); ellipse(c, cx, cy - 17, 26, 5, '#4b8fe0'); P(c, cx - 30, cy - 14, GOLD, 60, 2);
  ellipse(c, cx, cy - 42, 16, 5, '#141a2e'); ellipse(c, cx, cy - 44, 14, 4, '#f3efe6'); P(c, cx - 14, cy - 42, GOLD, 28, 2); P(c, cx - 4, cy - 58, GOLD, 8, 14); P(c, cx - 2, cy - 62, GOLD_L, 4, 4);
  // falling water: animated droplets from each tier
  for (let i = 0; i < 18; i++) { const side = i % 2 ? 1 : -1, ph = (t * 1.8 + i * 0.37) % 1, tier = i % 3;
    const [sx, sy, dy, spread] = tier === 0 ? [cx, cy - 62, 22, 14] : tier === 1 ? [cx, cy - 44, 28, 26] : [cx, cy - 18, 34, 44];
    const x = sx + side * (4 + ph * spread), y = sy + ph * ph * dy + (tier === 0 ? -Math.sin(ph * 3.14) * 8 : 0);
    c.fillStyle = ph > 0.8 ? '#e8f7ff' : '#8cc6f4'; c.fillRect(Math.round(x), Math.round(y), 2, 4); }
  for (let i = 0; i < 6; i++) { const a = (t * 3 + i) % 1; c.fillStyle = `rgba(232,247,255,${1 - a})`; c.fillRect(Math.round(cx - 40 + i * 16), Math.round(cy + 12 - a * 6), 2, 2); } // splash
}
// night: warm uplights on the facade + fountain lights
export function luxuryLights() { const L = [], x = MALL.x * TILE, base = (MALL.y + MALL.h) * TILE;
  for (let k = 0; k < 8; k++) L.push({ x: x + 96 + k * 36, y: base - 120, gy: base - 60, r: 70, glow: true, core: 16, flat: 1.4 });
  L.push({ x: x + MALL.w * TILE / 2, y: MALL.y * TILE + 30, r: 90, glow: true, core: 30, flat: 0.9 });
  L.push({ x: FCX, y: FCY, gy: FCY + 20, r: 120, glow: true, core: 34, flat: 0.6 });
  for (const [lx, ly] of LUX_LAMPS) L.push({ x: lx * TILE + 16, y: ly * TILE - 64, gy: ly * TILE + 26, r: 80, glow: true, core: 18 });
  return L; }

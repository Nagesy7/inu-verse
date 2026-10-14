import { TILE, MAP_W, MAP_H, MAP, T, BUILDINGS, PLOTS, NPC_HOMES, STALL_SLOTS } from './world.js';
import { NPC_INTERIORS } from './homes.js';
import { WALLS } from './furniture.js';
import { drawShiba, drawBoneIcon } from './art.js';

const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); };
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

function tree(c, x, y, s = 1) {
  c.fillStyle = 'rgba(30,60,30,0.25)'; c.beginPath(); c.ellipse(x, y + 12 * s, 14 * s, 5 * s, 0, 0, 7); c.fill();
  c.fillStyle = '#7a5032'; c.fillRect(x - 3 * s, y, 6 * s, 12 * s);
  for (const [dx, dy, r, col] of [[0, -6, 15, '#3f8f4f'], [-7, -2, 10, '#4aa25a'], [7, -3, 10, '#4aa25a'], [-2, -12, 9, '#5cb86a'], [3, -9, 6, '#7ccf7f']]) { c.fillStyle = col; c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, 7); c.fill(); }
}

function building(c, b) {
  const x = b.x * TILE, y = b.y * TILE, w = b.w * TILE, h = b.h * TILE;
  const th = { cafe: ['#fbe7d0', '#e0735a', '#f7b6c2'], shop: ['#dfeefa', '#4f7fd0', '#ffd27a'], launch: ['#e9e2fb', '#6c4fd0', '#ffcf5a'], cars: ['#eef0f2', '#4a4f5c', '#e94f4f'] }[b.id];
  c.fillStyle = 'rgba(0,0,0,0.18)'; rr(c, x + 6, y + 10, w, h, 10); c.fill();
  // wall
  c.fillStyle = th[0]; rr(c, x + 4, y + h * 0.35, w - 8, h * 0.65, 6); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 2; c.stroke();
  // roof
  c.fillStyle = th[1]; rr(c, x, y, w, h * 0.42, 10); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.14)'; for (let i = 0; i < w; i += 16) c.fillRect(x + i, y + 4, 8, h * 0.42 - 8);
  if (b.id === 'launch') { c.fillStyle = '#b9a6ff'; c.beginPath(); c.arc(x + w / 2, y + 10, 34, Math.PI, 0); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x + w / 2, y + 2, 10, 0, 7); c.fill(); drawBoneIcon(c, x + w / 2, y + 2, 1.1, '#ffcf5a'); }
  // awning
  if (b.id === 'cafe' || b.id === 'shop') { const aw = h * 0.12; for (let i = 0; i < (w - 16) / 16; i++) { c.fillStyle = i % 2 ? '#fff' : th[2]; c.beginPath(); c.moveTo(x + 8 + i * 16, y + h * 0.42); c.lineTo(x + 24 + i * 16, y + h * 0.42); c.lineTo(x + 24 + i * 16, y + h * 0.42 + aw); c.arc(x + 16 + i * 16, y + h * 0.42 + aw, 8, 0, Math.PI); c.fill(); } }
  // windows
  for (const wx of [x + 18, x + w - 18 - 44]) { c.fillStyle = '#6d5a4a'; rr(c, wx - 3, y + h * 0.6 - 3, 50, 38, 5); c.fill(); c.fillStyle = '#a8def5'; rr(c, wx, y + h * 0.6, 44, 32, 4); c.fill(); c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(wx + 6, y + h * 0.6 + 4, 6, 24); }
  // door
  const dx = x + w / 2 - 16; c.fillStyle = '#7a5032'; rr(c, dx, y + h - 46, 32, 46, [12, 12, 0, 0]); c.fill(); c.fillStyle = '#ffd25a'; c.beginPath(); c.arc(dx + 25, y + h - 22, 2.5, 0, 7); c.fill();
  // sign
  c.font = 'bold 15px "Trebuchet MS",sans-serif'; c.textAlign = 'center'; const tw = c.measureText(b.name).width + 24;
  c.fillStyle = '#3a2a22'; rr(c, x + w / 2 - tw / 2, y + h * 0.42 - 30, tw, 24, 8); c.fill(); c.fillStyle = th[2]; c.fillText(b.name, x + w / 2, y + h * 0.42 - 13);
  if (b.id === 'cafe') { c.fillStyle = '#fff'; c.font = 'bold 11px sans-serif'; c.fillText('JOB: Barista ★', x + w / 2, y + 20); }
  if (b.id === 'shop') { c.fillStyle = '#fff'; c.font = 'bold 11px sans-serif'; c.fillText('Furniture', x + w / 2, y + 20); }
  if (b.id === 'launch') { c.fillStyle = '#fff'; c.font = 'bold 11px sans-serif'; c.fillText('DEMO · simulated tokens', x + w / 2, y + 52); }
  if (b.id === 'cars') {
    c.fillStyle = '#fff'; c.font = 'bold 11px sans-serif'; c.fillText('COMING SOON', x + w / 2, y + 20);
    for (const [cx, col] of [[x - 2, '#e94f4f'], [x + w - 58, '#3fb6a8']]) { const cy = y + h + 36; c.fillStyle = 'rgba(0,0,0,0.2)'; rr(c, cx + 2, cy + 4, 60, 26, 10); c.fill(); c.fillStyle = col; rr(c, cx, cy, 60, 24, 10); c.fill(); c.fillStyle = '#bfe6f7'; rr(c, cx + 14, cy + 4, 30, 10, 4); c.fill(); c.fillStyle = '#222'; for (const wx of [cx + 12, cx + 48]) { c.beginPath(); c.arc(wx, cy + 24, 6, 0, 7); c.fill(); } }
  }
}

function npcHouse(c, h) {
  const x = h.x * TILE, y = h.y * TILE, w = h.w * TILE, hh = h.h * TILE, I = NPC_INTERIORS[h.id];
  house(c, x, y, w, hh, I.roof, WALLS[I.wall].color, `${h.owner}'s`);
}
export function house(c, x, y, w, h, roof, wallCol, label) {
  // yard
  c.fillStyle = '#9fd47f'; rr(c, x + 2, y + 2, w - 4, h - 4, 8); c.fill();
  c.strokeStyle = '#fff8e8'; c.lineWidth = 3; c.setLineDash([6, 4]); rr(c, x + 3, y + 3, w - 6, h - 6, 8); c.stroke(); c.setLineDash([]);
  const hx = x + 22, hy = y + 34, hw = w - 44, hh = h - 60;
  c.fillStyle = 'rgba(0,0,0,0.18)'; rr(c, hx + 4, hy + 8, hw, hh, 6); c.fill();
  c.fillStyle = wallCol; rr(c, hx, hy + hh * 0.35, hw, hh * 0.65, 4); c.fill();
  c.fillStyle = roof; c.beginPath(); c.moveTo(hx - 10, hy + hh * 0.42); c.lineTo(hx + hw / 2, hy - 14); c.lineTo(hx + hw + 10, hy + hh * 0.42); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.moveTo(hx + hw / 2, hy - 14); c.lineTo(hx + hw + 10, hy + hh * 0.42); c.lineTo(hx + hw / 2, hy + hh * 0.42); c.fill();
  c.fillStyle = '#7a5032'; rr(c, hx + hw / 2 - 10, hy + hh - 28, 20, 28, [8, 8, 0, 0]); c.fill();
  c.fillStyle = '#a8def5'; rr(c, hx + 10, hy + hh * 0.55, 22, 18, 3); c.fill(); rr(c, hx + hw - 32, hy + hh * 0.55, 22, 18, 3); c.fill();
  // path + bushes
  c.fillStyle = '#e8d9b8'; c.fillRect(hx + hw / 2 - 8, hy + hh, 16, y + h - hy - hh - 4);
  if (label) { c.font = 'bold 11px "Trebuchet MS",sans-serif'; c.textAlign = 'center'; c.fillStyle = '#3a2a22'; c.fillText(label, x + w / 2, y + 16); }
}

export function prerenderMap() {
  const cv = document.createElement('canvas'); cv.width = MAP_W * TILE; cv.height = MAP_H * TILE; const c = cv.getContext('2d');
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const t = MAP[y][x], px = x * TILE, py = y * TILE, r = hash(x, y);
    c.fillStyle = r < 0.5 ? '#8fcf6f' : '#93d374'; c.fillRect(px, py, TILE, TILE);
    if (t === T.GRASS || t === T.TREE || t === T.FLOWER) { c.fillStyle = '#7fbf62'; for (let i = 0; i < 3; i++) { const a = hash(x + i * 7, y), b = hash(x, y + i * 9); c.fillRect(px + a * 28, py + b * 28, 2, 4); } }
    if (t === T.FLOWER) { for (let i = 0; i < 3; i++) { const a = hash(x + i, y * 3), b = hash(x * 5, y + i); c.fillStyle = ['#fff', '#ffd25a', '#f59ab8'][i]; c.beginPath(); c.arc(px + 6 + a * 20, py + 6 + b * 20, 2.5, 0, 7); c.fill(); } }
    if (t === T.ROAD) { c.fillStyle = '#5e6470'; c.fillRect(px, py, TILE, TILE); c.fillStyle = 'rgba(255,255,255,0.04)'; c.fillRect(px + r * 20, py + r * 10, 6, 3); }
    if (t === T.WALK || t === T.PLAZA) { c.fillStyle = t === T.WALK ? '#d9d2c4' : '#e8dcc2'; c.fillRect(px, py, TILE, TILE); c.strokeStyle = 'rgba(0,0,0,0.08)'; c.strokeRect(px + 0.5, py + 0.5, TILE / 2, TILE / 2); c.strokeRect(px + 16.5, py + 16.5, TILE / 2 - 1, TILE / 2 - 1); }
    if (t === T.WATER) { c.fillStyle = '#5bb8e0'; c.fillRect(px, py, TILE, TILE); c.strokeStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(px + 10 + r * 10, py + 16, 5, 3.4, 6); c.stroke(); }
    if (t === T.PLOT) { c.fillStyle = '#c9a77a'; c.fillRect(px, py, TILE, TILE); c.fillStyle = 'rgba(0,0,0,0.05)'; c.fillRect(px + r * 24, py + hash(y, x) * 24, 5, 3); }
  }
  // road dashes
  c.fillStyle = '#f5e7a8';
  for (let x = 1; x < MAP_W - 1; x++) { c.fillRect(x * TILE + 4, 21 * TILE - 2, 16, 3); c.fillRect(x * TILE + 4, 32 * TILE - 2, 16, 3); }
  for (let y = 6; y < 41; y++) if (y < 19 || (y > 22 && y < 30) || y > 33) c.fillRect(32 * TILE - 2, y * TILE + 4, 3, 16);
  // pond edge softening
  for (const [x0, y0, w, h] of [[5, 3, 9, 5], [37, 35, 18, 4]]) { c.strokeStyle = '#e6d3a3'; c.lineWidth = 6; rr(c, x0 * TILE, y0 * TILE, w * TILE, h * TILE, 18); c.stroke(); c.fillStyle = '#4fae8a'; for (let i = 0; i < w; i += 2) { c.beginPath(); c.ellipse((x0 + i + 1) * TILE, (y0 + 1) * TILE, 10, 6, 0, 0, 7); c.fill(); c.fillStyle = '#f59ab8'; c.beginPath(); c.arc((x0 + i + 1) * TILE + 3, (y0 + 1) * TILE - 2, 3, 0, 7); c.fill(); c.fillStyle = '#4fae8a'; } }
  for (const b of BUILDINGS) building(c, b);
  for (const h of NPC_HOMES) npcHouse(c, h);
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (MAP[y][x] === T.TREE) tree(c, x * TILE + 16, y * TILE + 14, 1.05);
  // park bench + lamp posts
  c.fillStyle = '#9c6a3c'; rr(c, 17 * TILE, 6 * TILE + 8, 56, 14, 4); c.fill();
  for (const [lx, ly] of [[8, 18], [24, 18], [40, 23], [52, 18], [12, 29], [44, 29], [20, 33], [50, 33]]) { c.fillStyle = '#4a4f5c'; c.fillRect(lx * TILE + 14, ly * TILE - 8, 4, 30); c.fillStyle = '#ffe9a0'; c.beginPath(); c.arc(lx * TILE + 16, ly * TILE - 10, 6, 0, 7); c.fill(); }
  c.font = 'bold 13px "Trebuchet MS",sans-serif'; c.textAlign = 'left'; c.fillStyle = '#5a4030'; c.fillText('Market Row — launched token stalls', 34 * TILE, 6 * TILE + 14);
  c.fillText('Sakura Pond', 7 * TILE, 2 * TILE + 20);
  return cv;
}

export function drawPlots(c, state, t) {
  for (const p of PLOTS) {
    const x = p.x * TILE, y = p.y * TILE, w = p.w * TILE, h = p.h * TILE, home = state.plots[p.id];
    if (home) house(c, x, y, w, h, home.roof, WALLS[home.wall].color, `${state.player.name}'s Home`);
    else {
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.setLineDash([5, 5]); c.lineWidth = 2; c.strokeRect(x + 4, y + 4, w - 8, h - 8); c.setLineDash([]);
      // fence posts
      c.fillStyle = '#b8875a'; for (let i = 0; i <= 6; i++) { c.fillRect(x + i * 32 - 2 + (i === 6 ? -2 : 0), y, 5, 12); }
      // sign
      const sx = x + w / 2, sy = y + h / 2 + Math.sin(t * 2 + p.x) * 1.5;
      c.fillStyle = '#7a5032'; c.fillRect(sx - 2, sy - 4, 5, 34);
      c.fillStyle = '#fff3d6'; rr(c, sx - 40, sy - 28, 80, 34, 6); c.fill(); c.strokeStyle = '#7a5032'; c.lineWidth = 2; c.stroke();
      c.fillStyle = '#c0392b'; c.font = 'bold 12px "Trebuchet MS",sans-serif'; c.textAlign = 'center'; c.fillText('For claim', sx, sy - 13);
      c.fillStyle = '#5a4030'; c.font = '10px sans-serif'; c.fillText('300 bones', sx, sy);
    }
  }
}

export function drawStalls(c, state, t) {
  state.tokens.forEach((tok, i) => {
    if (i >= STALL_SLOTS.length) return;
    const s = STALL_SLOTS[i], x = s.x * TILE, y = s.y * TILE;
    c.fillStyle = 'rgba(0,0,0,0.18)'; rr(c, x + 6, y + 10, 84, 52, 6); c.fill();
    c.fillStyle = '#c99a5a'; rr(c, x + 4, y + 26, 84, 34, 4); c.fill();
    for (let k = 0; k < 6; k++) { c.fillStyle = k % 2 ? '#fff' : tok.color; c.fillRect(x + 4 + k * 14, y + 4, 14, 20); }
    c.fillStyle = tok.color; c.beginPath(); c.arc(x + 46, y + 42, 12, 0, 7); c.fill(); c.fillStyle = '#fff'; c.font = 'bold 9px sans-serif'; c.textAlign = 'center'; c.fillText(tok.ticker.slice(0, 4), x + 46, y + 45);
    c.fillStyle = '#3a2a22'; c.font = 'bold 11px "Trebuchet MS",sans-serif'; c.fillText('$' + tok.ticker + (tok.curve.graduated ? ' ★' : ''), x + 46, y - 3);
  });
}

// Pixel art for the Rescue Station and Trainer Gate (procedural, crisp integer rects, same style as arcadeart.js).
import { TILE, GAME_DOORS, BANK, COMMUNITY } from './world.js';
const INK = '#1a1424', R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const txt = (c, s, x, y, size, col) => { c.font = `${size}px Silkscreen, monospace`; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillStyle = INK; c.fillText(s, x + 1, y + 1); c.fillStyle = col; c.fillText(s, x, y); };
const night = () => !!globalThis.__inuNight;
function glow(c, x, y, r, col, a) { const gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.save(); c.globalAlpha = a; c.globalCompositeOperation = 'lighter'; c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore(); }
function bricks(c, x, y, w, h, base, mortar, hi) { R(c, x, y, w, h, base); for (let r = 0, k = y; k < y + h; k += 6, r++) { R(c, x, k, w, 1, mortar); for (let j = (r % 2) * 7; j < w; j += 14) { R(c, x + j, k, 1, 6, mortar); R(c, x + j + 2, k + 1, 4, 1, hi); } } }
function win(c, x, y, w, h, lit) { R(c, x - 2, y - 2, w + 4, h + 4, INK); R(c, x - 1, y - 1, w + 2, h + 2, '#f4e3c8'); R(c, x, y, w, h, lit ? '#ffd27a' : '#6fa8d8'); R(c, x, y, w, 3, lit ? '#fff0b8' : '#a8d4f4'); R(c, x + w / 2 - 1, y, 2, h, '#f4e3c8'); R(c, x, y + h / 2 - 1, w, 2, '#f4e3c8'); R(c, x - 3, y + h + 1, w + 6, 3, '#d8c4a0'); R(c, x - 3, y + h + 4, w + 6, 1, INK); }
// Rescue Station: brick fire-rescue house. Front door on the door tile, roll-up bay with the rescue van, siren bar, emblem, framed windows, awning, hose reel, planter, pup kennel; sign + windows light up at night.
function rescue(c, g, t) { const x = g.x * TILE, y = g.y * TILE, w = g.w * TILE, h = g.h * TILE, dx = (g.door.tx - g.x) * TILE, n = night(), on = Math.floor(t * 3) % 2;
  c.save(); c.globalAlpha = 0.25; R(c, x - 2, y + h - 2, w + 40, 6, '#000'); c.restore(); // ground shadow
  R(c, x - 3, y - 27, w + 6, h + 27, INK); bricks(c, x, y - 12, w, h + 12, '#b8322e', '#7e1c20', '#cf4a40'); // brick body
  R(c, x - 3, y - 27, w + 6, 16, INK); R(c, x - 1, y - 25, w + 2, 12, '#8a1a22'); R(c, x - 1, y - 25, w + 2, 2, '#c8484a'); R(c, x - 3, y - 13, w + 6, 3, '#f4e3c8'); R(c, x - 3, y - 10, w + 6, 1, INK); // parapet + cornice
  R(c, x + w / 2 - 15, y - 33, 30, 8, INK); R(c, x + w / 2 - 13, y - 31, 12, 5, on ? '#ff3a3a' : '#7a1a1a'); R(c, x + w / 2 + 1, y - 31, 12, 5, on ? '#6a8aff' : '#1a2a6a'); glow(c, x + w / 2 + (on ? -7 : 7), y - 29, n ? 34 : 18, on ? '#ff4a4a' : '#5a7aff', n ? 0.8 : 0.35); // siren bar
  R(c, x + 2, y - 8, w - 4, 16, INK); R(c, x + 4, y - 6, w - 8, 12, n ? '#fff2c8' : '#f4e3c8'); txt(c, 'RESCUE STATION', x + w / 2, y + 4, 8, '#c8282e'); if (n) glow(c, x + w / 2, y, 70, '#ffd27a', 0.45); // lit sign
  const ex = x + 16, ey = y + 26; R(c, ex - 10, ey - 10, 20, 20, INK); R(c, ex - 9, ey - 9, 18, 18, '#ffd84a'); R(c, ex - 7, ey - 7, 14, 14, '#c8282e'); R(c, ex - 3, ey - 1, 6, 5, '#ffd84a'); for (const [px, py] of [[-5, -4], [-2, -6], [1, -6], [4, -4]]) R(c, ex + px, ey + py, 2, 2, '#ffd84a'); // paw emblem
  win(c, x + 74, y + 18, 18, 16, n); win(c, x + 100, y + 18, 18, 16, n); win(c, x + 40, y + 18, 16, 16, n); // framed windows
  const by = y + 52, bx = x + 68, bw = w - 74, bh = h - 52; R(c, bx - 3, by - 3, bw + 6, bh + 3, '#f4e3c8'); R(c, bx - 2, by - 2, bw + 4, bh + 2, INK); R(c, bx, by, bw, bh, '#2a2230'); // bay opening
  const vy = by + 16; R(c, bx + 4, vy, bw - 8, bh - 18, INK); R(c, bx + 5, vy + 1, bw - 10, bh - 20, '#f4f4f0'); R(c, bx + 5, vy + 12, bw - 10, 4, '#c8282e'); R(c, bx + 9, vy + 3, bw - 18, 7, n ? '#ffe6a0' : '#7ab8e0'); R(c, bx + 7, vy - 3, 6, 3, on ? '#ff3a3a' : '#7a1a1a'); R(c, bx + bw - 13, vy - 3, 6, 3, on ? '#6a8aff' : '#1a2a6a'); // rescue van
  R(c, bx + 8, vy + bh - 21, 8, 4, n ? '#fff6c0' : '#e8e0a0'); R(c, bx + bw - 16, vy + bh - 21, 8, 4, n ? '#fff6c0' : '#e8e0a0'); if (n) { glow(c, bx + 12, vy + bh - 19, 22, '#fff0b0', 0.6); glow(c, bx + bw - 12, vy + bh - 19, 22, '#fff0b0', 0.6); }
  for (let k = 0; k < 14; k += 3) R(c, bx, by + k, bw, 2, k % 6 ? '#c8c8c0' : '#e4e4dc'); R(c, bx, by + 14, bw, 2, INK); R(c, bx + bw / 2 - 4, by + 12, 8, 2, '#8a8a80'); // roll-up door, raised
  R(c, x + 26, y + h - 39, 36, 4, INK); for (let k = 0; k < 36; k += 6) R(c, x + 27 + k, y + h - 40, 5, 9, k % 12 ? '#f4e3c8' : '#c8282e'); R(c, x + 26, y + h - 32, 36, 1, INK); // striped awning
  R(c, x + dx + 1, y + h - 30, 30, 30, INK); R(c, x + dx + 3, y + h - 28, 26, 28, '#7a2a1a'); R(c, x + dx + 7, y + h - 24, 18, 9, n ? '#ffd27a' : '#a8d4f4'); R(c, x + dx + 23, y + h - 13, 3, 3, '#f0c840'); R(c, x + dx + 3, y + h - 28, 26, 2, '#9a4a2a'); if (n) glow(c, x + dx + 16, y + h - 20, 26, '#ffc860', 0.5); // front door
  const hx = x + 14, hy = y + 64; R(c, hx - 9, hy - 9, 18, 18, INK); R(c, hx - 8, hy - 8, 16, 16, '#c8282e'); for (let r = 6; r > 0; r -= 2) R(c, hx - r, hy - r, r * 2, r * 2, r % 4 ? '#e8d070' : '#b89a40'); R(c, hx - 1, hy - 1, 2, 2, INK); R(c, hx + 6, hy + 4, 3, 18, '#e8d070'); R(c, hx + 4, hy + 22, 6, 3, '#9a9a90'); // hose reel
  R(c, x + 2, y + h - 12, 18, 12, INK); R(c, x + 3, y + h - 11, 16, 10, '#8a5a2a'); R(c, x + 3, y + h - 11, 16, 2, '#a8723a'); for (const [px, col] of [[4, '#e85a7a'], [9, '#ffd84a'], [14, '#e85a7a']]) { R(c, x + px, y + h - 18, 3, 7, '#3a8a3a'); R(c, x + px - 1, y + h - 20, 4, 3, col); } // planter
  const kx = x + w + 6, ky = y + h - 26; c.fillStyle = INK; c.beginPath(); c.moveTo(kx - 2, ky + 9); c.lineTo(kx + 14, ky - 4); c.lineTo(kx + 30, ky + 9); c.fill(); c.fillStyle = '#c8282e'; c.beginPath(); c.moveTo(kx + 1, ky + 8); c.lineTo(kx + 14, ky - 1); c.lineTo(kx + 27, ky + 8); c.fill(); // kennel roof
  R(c, kx, ky + 8, 28, 18, INK); R(c, kx + 1, ky + 9, 26, 16, '#d8a868'); for (let k = ky + 12; k < ky + 25; k += 4) R(c, kx + 1, k, 26, 1, '#b8884a'); R(c, kx + 9, ky + 13, 10, 12, '#2a1a14'); R(c, kx + 10, ky + 18, 8, 6, '#e8a050'); R(c, kx + 11, ky + 16, 2, 3, '#e8a050'); R(c, kx + 15, ky + 16, 2, 3, '#e8a050'); R(c, kx + 12, ky + 20, 1, 1, INK); R(c, kx + 15, ky + 20, 1, 1, INK); R(c, kx + 3, ky + 11, 6, 3, '#f4e3c8'); // kennel + pup
  R(c, kx + 30, ky + 4, 2, 22, INK); R(c, kx + 24, ky - 6, 26, 11, INK); R(c, kx + 25, ky - 5, 24, 9, '#f4e3c8'); txt(c, 'PUPS', kx + 37, ky + 2, 6, '#c8282e'); // 'pups in need' plaque, clear of the door
  for (const lx of [x + 26, x + 62]) { R(c, lx - 2, y + h - 48, 4, 5, INK); R(c, lx - 1, y + h - 47, 2, 3, n ? '#fff0b0' : '#d8c890'); if (n) glow(c, lx, y + h - 44, 22, '#ffd27a', 0.55); } } // wall lamps
// Trainer Gate: stone gym gate. Shaded stone blocks, red lacquer pillars with caps, tiled lintel roof, banners, paw medallion, lanterns, steps.
function gate(c, g, t) { const x = g.x * TILE, y = g.y * TILE, w = g.w * TILE, h = g.h * TILE, dx = (g.door.tx - g.x) * TILE, n = night();
  c.save(); c.globalAlpha = 0.25; R(c, x - 2, y + h - 2, w + 4, 6, '#000'); c.restore();
  R(c, x - 2, y + 18, w + 4, h - 18, INK); R(c, x, y + 20, w, h - 20, '#6a7a8a'); for (let r = 0, k = y + 20; k < y + h; k += 10, r++) for (let j = (r % 2) * 10 - 10; j < w; j += 20) { const bx = Math.max(x, x + j), bw = Math.min(x + w, x + j + 19) - bx; if (bw > 0) { R(c, bx, k, bw, 9, '#8494a4'); R(c, bx, k, bw, 1, '#a4b4c4'); R(c, bx, k + 8, bw, 1, '#5a6a7a'); } } // stone blocks
  R(c, x + dx - 6, y + 20, 44, h - 20, INK); R(c, x + dx - 4, y + 22, 40, h - 22, '#1e1a2c'); R(c, x + dx - 4, y + 22, 40, 4, '#00000060'); // opening
  for (const px of [x + dx - 16, x + dx + 36]) { R(c, px - 2, y - 2, 14, h + 2, INK); R(c, px, y, 10, h, '#c8282e'); R(c, px, y, 3, h, '#e8484a'); R(c, px + 8, y, 2, h, '#8a1a22'); R(c, px - 4, y + h - 8, 18, 8, INK); R(c, px - 3, y + h - 7, 16, 6, '#3a3a4a'); } // pillars + bases
  R(c, x - 10, y - 22, w + 20, 12, INK); R(c, x - 8, y - 20, w + 16, 8, '#2a2a3a'); for (let k = 0; k < w + 16; k += 6) R(c, x - 8 + k, y - 20, 3, 8, '#3a3a50'); R(c, x - 14, y - 24, 8, 6, INK); R(c, x + w + 6, y - 24, 8, 6, INK); // tiled roof w/ upturned ends
  R(c, x - 6, y - 10, w + 12, 10, INK); R(c, x - 4, y - 8, w + 8, 6, '#c8282e'); R(c, x - 4, y - 8, w + 8, 1, '#e8484a'); R(c, x + 2, y + 2, w - 4, 4, INK); R(c, x + 4, y + 3, w - 8, 2, '#8a1a22'); // lintels
  R(c, x + 8, y + 6, w - 16, 13, INK); R(c, x + 10, y + 8, w - 20, 9, '#1f2d5c'); txt(c, 'TRAINER GATE', x + w / 2, y + 16, 7, '#ffd84a');
  for (const bx of [x + 4, x + w - 20]) { R(c, bx, y + 22, 16, 28, INK); R(c, bx + 1, y + 23, 14, 24, '#2a4a9a'); R(c, bx + 1, y + 46, 7, 4, '#2a4a9a'); R(c, bx + 8, y + 46, 7, 2, '#2a4a9a'); R(c, bx + 5, y + 30, 6, 6, '#ffd84a'); } // banners
  const b = Math.sin(t * 2) * 1.5, cx = x + dx + 16, cy = y + 40 + b; R(c, cx - 9, cy - 9, 18, 18, INK); R(c, cx - 8, cy - 8, 16, 16, '#ffd84a'); R(c, cx - 8, cy - 8, 16, 2, '#fff3b0'); R(c, cx - 3, cy - 1, 6, 5, '#7a4a18'); for (const [px, py] of [[-5, -4], [-2, -6], [2, -6], [5, -4]]) R(c, cx + px - 1, cy + py, 3, 3, '#7a4a18'); // medallion
  for (const lx of [x + dx - 24, x + dx + 56]) { R(c, lx - 1, y + h - 30, 2, 22, INK); R(c, lx - 5, y + h - 40, 10, 12, INK); R(c, lx - 4, y + h - 39, 8, 10, n ? '#ffe08a' : '#e8d8b0'); R(c, lx - 6, y + h - 42, 12, 3, INK); if (n) glow(c, lx, y + h - 34, 24, '#ffc860', 0.6); } // stone lanterns
  R(c, x + dx - 8, y + h, 48, 4, '#9aa4b0'); R(c, x + dx - 8, y + h + 4, 48, 1, INK); }
function bank(c, g, t) { const x = g.x * TILE, y = g.y * TILE, w = g.w * TILE, h = g.h * TILE, dx = (g.door.tx - g.x) * TILE;
  R(c, x - 4, y - 18, w + 8, h + 18, INK); R(c, x - 2, y - 16, w + 4, 12, '#e8dcc0'); // pediment
  c.fillStyle = '#e8dcc0'; c.beginPath(); c.moveTo(x - 6, y - 16); c.lineTo(x + w / 2, y - 34); c.lineTo(x + w + 6, y - 16); c.closePath(); c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
  R(c, x + w / 2 - 7, y - 28, 14, 10, '#d4a640'); R(c, x + w / 2 - 3, y - 26, 6, 6, '#fff3b0');
  R(c, x, y - 4, w, h + 4, '#d8ccb0'); R(c, x, y + 8, w, 14, '#1f2d5c'); txt(c, 'KIBBLE BANK', x + w / 2, y + 19, 10, '#ffd84a');
  for (let i = 0; i < 5; i++) { const cx = x + 8 + i * ((w - 22) / 4); R(c, cx, y + 26, 8, h - 28, '#f4ead4'); R(c, cx - 2, y + 24, 12, 3, '#bfb294'); R(c, cx - 2, y + h - 4, 12, 3, '#bfb294'); R(c, cx + 2, y + 28, 1, h - 34, '#d4c8a8'); }
  R(c, x + dx - 8, y + h - 30, 32, 30, INK); R(c, x + dx - 6, y + h - 28, 28, 28, '#5a3a1a'); R(c, x + dx + 7, y + h - 28, 2, 28, '#3a240e'); R(c, x + dx + 2, y + h - 14, 3, 3, '#f0c840'); R(c, x + dx + 11, y + h - 14, 3, 3, '#f0c840');
  R(c, x - 6, y + h, w + 12, 4, '#bfb294'); const gl = 0.5 + 0.5 * Math.sin(t * 3); c.save(); c.globalAlpha = gl; R(c, x + w - 18, y + 10, 4, 4, '#fff'); c.restore(); }

// New game buildings (Inu Empires, Ribbit Nugs, Meme Brawl, Kibble Pay): one themed pixel facade each, same crisp-rect style.
const THEME = {
  empires: { wall: '#8a8478', hi: '#a8a294', lo: '#6a6458', roof: '#3a5a9a', sign: 'INU EMPIRES', signBg: '#2a2030', signCol: '#ffd84a', door: '#5a3a1a' },
  pepeballz: { wall: '#3f9a4a', hi: '#62b86a', lo: '#2a7034', roof: '#f2efe6', sign: 'RIBBIT NUGS', signBg: '#1a3a20', signCol: '#c8ff7a', door: '#1e2a3a' },
  memebrawl: { wall: '#9a2a34', hi: '#c8404a', lo: '#6a1a22', roof: '#1e1a2c', sign: 'MEME BRAWL', signBg: '#1e1a2c', signCol: '#ff8a3a', door: '#2a1a14' },
  kibblepay: { wall: '#1f2d5c', hi: '#2f3f7a', lo: '#141e40', roof: '#d4a640', sign: 'KIBBLE PAY', signBg: '#d4a640', signCol: '#1f2d5c', door: '#0e1630' } };
function studio(c, g, t) { const T = THEME[g.id], x = g.x * TILE, y = g.y * TILE, w = g.w * TILE, h = g.h * TILE, dx = (g.door.tx - g.x) * TILE, n = night();
  c.save(); c.globalAlpha = 0.25; R(c, x - 2, y + h - 2, w + 4, 6, '#000'); c.restore();
  R(c, x - 2, y + 14, w + 4, h - 14, INK); R(c, x, y + 16, w, h - 16, T.wall); for (let k = y + 22; k < y + h; k += 8) { R(c, x, k, w, 1, T.lo); R(c, x, k + 1, w, 1, T.hi); }
  if (g.id === 'empires') { for (const tx of [x - 6, x + w - 18]) { R(c, tx - 2, y - 18, 28, h + 18, INK); R(c, tx, y - 16, 24, h + 16, T.wall); R(c, tx, y - 16, 24, 2, T.hi); for (let k = 0; k < 24; k += 8) R(c, tx + k, y - 22, 5, 6, INK), R(c, tx + k + 1, y - 21, 3, 5, T.wall); R(c, tx + 9, y - 2, 6, 10, INK); }
    for (const [fx, col] of [[x + 6, '#c8282e'], [x + w - 6, '#2a4a9a']]) { R(c, fx, y - 44, 2, 24, INK); const wv = Math.floor(t * 4) % 2; R(c, fx + 2, y - 44 + wv, 12, 8, INK); R(c, fx + 2, y - 43 + wv, 11, 6, col); }
    for (let k = 0; k < w; k += 10) R(c, x + k, y + 8, 6, 8, INK), R(c, x + k + 1, y + 9, 4, 7, T.wall); }
  else if (g.id === 'pepeballz') { c.fillStyle = INK; c.beginPath(); c.ellipse(x + w / 2, y + 18, w / 2 + 4, 34, 0, Math.PI, 0); c.fill(); c.fillStyle = T.roof; c.beginPath(); c.ellipse(x + w / 2, y + 18, w / 2 + 2, 32, 0, Math.PI, 0); c.fill();
    for (let k = -3; k <= 3; k++) R(c, x + w / 2 + k * 16 - 1, y - 6 + Math.abs(k) * 4, 2, 24 - Math.abs(k) * 4, '#d8d2c4');
    const by = y - 20 + Math.abs(Math.sin(t * 3)) * -6; R(c, x + w / 2 - 8, by - 8, 16, 16, INK); R(c, x + w / 2 - 7, by - 7, 14, 14, '#7ac84a'); R(c, x + w / 2 - 5, by - 5, 4, 4, '#fff'); R(c, x + w / 2 + 1, by - 5, 4, 4, '#fff'); R(c, x + w / 2 - 4, by - 4, 2, 2, INK); R(c, x + w / 2 + 2, by - 4, 2, 2, INK); R(c, x + w / 2 - 4, by + 2, 8, 2, '#c8323c'); }
  else if (g.id === 'memebrawl') { R(c, x - 8, y - 6, w + 16, 22, INK); R(c, x - 6, y - 4, w + 12, 18, T.roof); for (let k = 0; k < w + 12; k += 8) { const on = (Math.floor(t * 6) + k / 8) % 2 < 1; R(c, x - 6 + k + 2, y - 2, 3, 3, on ? '#ffd84a' : '#6a5a2a'); R(c, x - 6 + k + 2, y + 9, 3, 3, on ? '#6a5a2a' : '#ffd84a'); }
    for (const fx of [x + 14, x + w - 26]) { R(c, fx, y + 26, 12, 12, INK); R(c, fx + 1, y + 27, 10, 10, '#ffd84a'); R(c, fx + 3, y + 29, 6, 6, '#e8a050'); R(c, fx + 1, y + 27, 10, 2, '#fff3b0'); } }
  else { R(c, x - 6, y + 2, w + 12, 14, INK); R(c, x - 4, y + 4, w + 8, 10, T.roof); for (let k = 0; k < w + 8; k += 12) R(c, x - 4 + k, y + 4, 6, 10, '#f0c860');
    const cy = y - 14 + Math.sin(t * 2) * 1.5; R(c, x + w / 2 - 11, cy - 11, 22, 22, INK); R(c, x + w / 2 - 10, cy - 10, 20, 20, '#d4a640'); R(c, x + w / 2 - 6, cy - 6, 12, 12, '#f0c860'); R(c, x + w / 2 - 2, cy - 7, 4, 14, '#8a5a1a'); }
  R(c, x + 6, y + 16, w - 12, 12, INK); R(c, x + 8, y + 17, w - 16, 10, T.signBg); txt(c, T.sign, x + w / 2, y + 25, 7, T.signCol);
  for (const wx of [x + 8, x + w - 24]) win(c, wx, y + 42, 16, 14, n);
  R(c, x + dx - 6, y + h - 32, 44, 32, INK); R(c, x + dx - 4, y + h - 30, 40, 30, T.door); R(c, x + dx + 15, y + h - 30, 2, 30, INK); R(c, x + dx - 4, y + h - 30, 40, 3, T.hi);
  R(c, x + dx + 8, y + h - 16, 3, 3, '#f0c840'); R(c, x + dx + 21, y + h - 16, 3, 3, '#f0c840'); R(c, x + dx - 8, y + h, 48, 4, '#9aa4b0'); R(c, x + dx - 8, y + h + 4, 48, 1, INK);
  if (n) glow(c, x + dx + 16, y + h - 14, 40, '#ffd27a', 0.45); }
// Community board (Telegram invite): wooden notice board with a paper-plane poster.
function board(c, t) { const x = COMMUNITY.x * TILE, y = COMMUNITY.y * TILE;
  for (const px of [x + 4, x + 26]) { R(c, px, y - 4, 3, 36, INK); R(c, px + 1, y - 4, 1, 36, '#8a5a2a'); }
  R(c, x - 2, y - 30, 36, 30, INK); R(c, x, y - 28, 32, 26, '#b8844a'); R(c, x, y - 28, 32, 2, '#d8a468'); R(c, x + 3, y - 25, 26, 20, '#2aa0e0'); R(c, x + 3, y - 25, 26, 2, '#6ac8f4');
  c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x + 7, y - 15); c.lineTo(x + 25, y - 22); c.lineTo(x + 20, y - 8); c.lineTo(x + 15, y - 13); c.closePath(); c.fill(); R(c, x + 14, y - 13, 2, 4, '#c8e8f8');
  R(c, x - 4, y - 38, 40, 9, INK); R(c, x - 3, y - 37, 38, 7, '#1f2d5c'); txt(c, 'COMMUNITY', x + 16, y - 31, 5, '#ffd84a'); }
export function doorProps(t) { return [...GAME_DOORS.map((g) => ({ y: (g.y + g.h) * TILE - 1, d: (c) => (g.id === 'rescue' ? rescue(c, g, t) : g.id === 'quest' ? gate(c, g, t) : studio(c, g, t)) })), { y: (COMMUNITY.y + 1) * TILE - 1, d: (c) => board(c, t) }, { y: (BANK.y + BANK.h) * TILE - 1, d: (c) => bank(c, BANK, t) }]; }
// Night light sources for these buildings (fed into the atmosphere pass so they glow through the dark overlay).
export function doorLights() { const L = [], P = (x, y, r, core, gy) => L.push({ x, y, gy, r, glow: true, core, flat: 0.6 });
  for (const g of [...GAME_DOORS, BANK]) { const x = g.x * TILE, y = g.y * TILE, w = g.w * TILE, h = g.h * TILE, dx = (g.door.tx - g.x) * TILE;
    P(x + dx + 16, y + h - 14, 64, 22, y + h + 18); // doorway pool
    if (g.id === 'rescue') { P(x + w / 2, y, 70, 30); P(x + w / 2, y - 29, 40, 12); for (const wx of [48, 83, 109]) P(x + wx, y + 26, 22, 12); P(x + 26, y + h - 44, 30, 10); P(x + 62, y + h - 44, 30, 10); P(x + 96, y + h - 20, 50, 16); }
    else if (g.id === 'quest') { P(x + dx + 16, y + 22, 40, 16); P(x + w / 2, y + h - 8, 50, 14); }
    else { P(x + w / 2, y + 15, 60, 20); P(x + w / 2, y - 23, 26, 10); } }
  return L; }

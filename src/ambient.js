// Ambient life: day/night, weather, wildlife, street life, emotes, mail. Purely cosmetic.
// Pure helpers (dayPhase, makeAmbient, stepAmbient, addMail) are headless-testable; draw* need a canvas.
import { TILE, MAP_W, MAP_H, MAP, T, BUILDINGS, PLOTS, MALL_BUILDINGS, NPC_HOMES } from './world.js';
import { mulberry32 } from './rng.js';

export const DAY_LEN = 720; // seconds per in-game day (~12 real minutes)
export const LAMP_TILES = [[8, 18], [24, 18], [40, 23], [52, 18], [12, 29], [44, 29], [20, 33], [50, 33], [13, 46], [50, 46], [24, 56], [40, 56], [29, 5], [45, 34]];
export const LAMPS = LAMP_TILES.map(([x, y]) => ({ x: x * TILE + 16, y: y * TILE - 34, gy: y * TILE + 22 }));
export const PONDS = [[5, 3, 9, 5], [37, 35, 18, 4]];
export const EMOTES = { wave: 'HI!', sit: 'SIT', zoomies: 'ZOOM', dance: '♪♫', heart: 'heart', bork: 'BORK!' };
import { drawEmblem } from './art.js';

// t seconds since start -> { hour 0-24, dark 0..1, tint [r,g,b,a], label }
export function dayPhase(t) {
  const hour = ((t / DAY_LEN) * 24 + 9) % 24; // starts 09:00
  let dark = 0, tint = [0, 0, 0, 0], label = 'day';
  if (hour >= 17 && hour < 19.5) { const k = (hour - 17) / 2.5; tint = [255, 120, 60, 0.22 * k]; dark = 0.25 * k; label = 'sunset'; }
  else if (hour >= 19.5 || hour < 5) { dark = 0.62; tint = [10, 16, 60, 0.55]; label = 'night'; }
  else if (hour >= 5 && hour < 7) { const k = 1 - (hour - 5) / 2; dark = 0.62 * k; tint = [255, 170, 120, 0.15 * (1 - k)]; label = 'dawn'; }
  return { hour, dark, tint, label };
}
export const timeForHour = (h) => (((h - 9 + 24) % 24) / 24) * DAY_LEN;

const tileIs = (x, y, ...ts) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H && ts.includes(MAP[y][x]);
function spots(type, rng, n) { const out = []; for (let k = 0; k < 4000 && out.length < n; k++) { const x = 1 + rng.int(MAP_W - 2), y = 1 + rng.int(MAP_H - 2); if (tileIs(x, y, ...type)) out.push([x, y]); } return out; }

export function makeAmbient(seed = 7) {
  const rng = mulberry32(seed), A = { rng, t: 0 };
  A.birds = spots([T.GRASS, T.WALK, T.PLAZA], rng, 10).map(([x, y]) => ({ hx: (x + .5) * TILE, hy: (y + .5) * TILE, x: (x + .5) * TILE, y: (y + .5) * TILE, z: 0, vx: 0, vy: 0, state: 'ground', hop: rng() * 3, col: rng.pick(['#7a5a3a', '#4a5a7a', '#c86a4a']) }));
  A.flyers = Array.from({ length: 3 }, (_, i) => ({ x: rng() * MAP_W * TILE, y: rng() * MAP_H * TILE, vx: 40 + rng() * 30, vy: (rng() - .5) * 12, i }));
  A.ducks = PONDS.flatMap(([x, y, w, h], j) => Array.from({ length: j ? 4 : 3 }, (_, i) => ({ cx: (x + w / 2) * TILE, cy: (y + h / 2) * TILE, rx: (w / 2 - 1) * TILE, ry: (h / 2 - 1) * TILE, a: rng() * 6.28, s: (0.12 + rng() * 0.1) * (i % 2 ? 1 : -1) })));
  A.butterflies = spots([T.FLOWER], rng, 9).map(([x, y]) => ({ hx: (x + .5) * TILE, hy: (y + .5) * TILE, p: rng() * 9, col: rng.pick(['#f6efe0', '#f2cc68', '#f08cb0', '#9fd0ff']) }));
  A.squirrels = spots([T.TREE], rng, 40).filter(([x, y]) => x > 0 && y > 0 && x < MAP_W - 1 && y < MAP_H - 1).slice(0, 3).map(([x, y]) => ({ x: (x + .5) * TILE, y: (y + 1.2) * TILE, hx: (x + .5) * TILE, p: rng() * 9 }));
  A.fireflies = Array.from({ length: 40 }, () => ({ x: rng() * MAP_W * TILE, y: rng() * MAP_H * TILE, p: rng() * 9 }));
  A.cars = [{ x: 0, y: 20.5 * TILE, vx: 120, col: '#b3202c' }, { x: MAP_W * TILE, y: 31.5 * TILE, vx: -100, col: '#2f6f8f' }, { x: 31.5 * TILE, y: 0, vy: 90, col: '#d4a640', vert: true }];
  A.rain = 0; A.rainTarget = 0; A.weatherT = 90; A.drops = []; A.petals = Array.from({ length: 30 }, () => ({ x: rng() * 1600, y: rng() * 1000, p: rng() * 9 }));
  A.puddles = spots([T.WALK, T.PLAZA, T.ROAD], rng, 14).map(([x, y]) => ({ x: (x + .5) * TILE, y: (y + .5) * TILE, w: 10 + rng.int(14) }));
  A.ball = null; A.notes = [];
  return A;
}

// step everything; player {x,y}; npcs list (fetch target); returns events like {kind:'flush'} for sounds
export function stepAmbient(A, dt, player, npcs = []) {
  const r = A.rng, ev = []; A.t += dt;
  for (const b of A.birds) {
    const d = Math.hypot(player.x - b.x, player.y - b.y);
    if (b.state === 'ground') {
      b.hop -= dt; if (b.hop < 0) { b.hop = 0.6 + r() * 2; b.x = b.hx + (r() - .5) * 20; b.y = b.hy + (r() - .5) * 12; }
      if (d < 70) { b.state = 'fly'; const a = Math.atan2(b.y - player.y, b.x - player.x); b.vx = Math.cos(a) * 160; b.vy = Math.sin(a) * 160 - 40; ev.push({ kind: 'flush' }); }
    } else { b.x += b.vx * dt; b.y += b.vy * dt; b.z = Math.min(140, b.z + 90 * dt); b.away = (b.away || 0) + dt; if (b.away > 6) { b.state = 'ground'; b.away = 0; b.z = 0; b.x = b.hx; b.y = b.hy; } }
  }
  for (const f of A.flyers) { f.x += f.vx * dt; f.y += f.vy * dt; if (f.x > MAP_W * TILE + 80) { f.x = -80; f.y = r() * MAP_H * TILE; } }
  for (const k of A.ducks) k.a += k.s * dt;
  for (const c of A.cars) { if (c.vert) { c.y += c.vy * dt; if (c.y > MAP_H * TILE + 60) c.y = -60; } else { c.x += c.vx * dt; if (c.vx > 0 && c.x > MAP_W * TILE + 60) c.x = -60; if (c.vx < 0 && c.x < -60) c.x = MAP_W * TILE + 60; } }
  A.weatherT -= dt; if (A.weatherT < 0) { A.rainTarget = A.rainTarget ? 0 : (r() < 0.45 ? 1 : 0); A.weatherT = 60 + r() * 120; }
  A.rain += Math.sign(A.rainTarget - A.rain) * Math.min(Math.abs(A.rainTarget - A.rain), dt * 0.2);
  if (A.ball) {
    const B = A.ball;
    if (B.state === 'air') { B.t += dt; const k = Math.min(1, B.t / 0.8); B.x = B.sx + (B.tx - B.sx) * k; B.y = B.sy + (B.ty - B.sy) * k; B.z = Math.sin(k * Math.PI) * 50; if (k >= 1) { B.state = 'ground'; B.z = 0; ev.push({ kind: 'bounce' }); } }
    if (B.state !== 'air' && B.dog) {
      const n = B.dog, goal = B.state === 'ground' ? B : player, dx = goal.x - n.x, dy = goal.y - n.y, d = Math.hypot(dx, dy), sp = 160 * dt;
      n.path = []; n.moving = true; n.phase += dt * 14; n.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      if (d > 20) { n.x += dx / d * sp; n.y += dy / d * sp; } else if (B.state === 'ground') B.state = 'carried'; else { A.ball = null; n.emote = { kind: 'heart', t: 2 }; ev.push({ kind: 'fetched', who: n.name }); }
      if (B.state === 'carried') { B.x = n.x + 6; B.y = n.y - 4; }
    }
  }
  for (const n of A.notes) { n.y -= 18 * dt; n.life -= dt; } A.notes = A.notes.filter((n) => n.life > 0);
  if (r() < dt * 1.2) A.notes.push({ x: 45.5 * TILE + (r() - .5) * 20, y: 8 * TILE, life: 2, ch: r() < .5 ? '♪' : '♫' });
  return ev;
}

export function throwBall(A, player, face, npcs) {
  const d = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[face] || [0, 1];
  const tx = player.x + d[0] * 150, ty = player.y + d[1] * 150;
  let dog = null, best = 1e9; for (const n of npcs) { const q = Math.hypot(n.x - tx, n.y - ty); if (q < best && q < 600) { best = q; dog = n; } }
  A.ball = { sx: player.x, sy: player.y, x: player.x, y: player.y, tx, ty, t: 0, z: 0, state: 'air', dog };
  return dog;
}

// ---- mailbox (persisted in state.mail) ----
const NOTES = [['Mochi', 'Dropped by with biscuits - your garden looks lovely!'], ['Kuro', 'Saw your lights on last night. Cosy place!'], ['Hana', 'Fancy a walk round Sakura Pond tomorrow?'], ['Taro', 'Thanks for the café latte, best in town.'], ['Yuzu', 'Your rug choice is impeccable.'], ['Goma', 'Left you a stick by the door. You are welcome.']];
export function addMail(s, rng = Math.random) {
  if (!Object.keys(s.plots || {}).length) return null;
  s.mail ||= []; const [from, text] = NOTES[Math.floor(rng() * NOTES.length)];
  const m = { id: (s.mailSeq = (s.mailSeq || 0) + 1), from, text, read: false };
  s.mail.unshift(m); if (s.mail.length > 20) s.mail.length = 20; return m;
}
export const unreadMail = (s) => (s.mail || []).filter((m) => !m.read).length;

// ---------------- drawing (world space, inside camera transform) ----------------
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
export function drawGroundLife(c, A, phase) {
  const t = A.t;
  for (const p of A.puddles) if (A.rain > 0.05) { c.globalAlpha = A.rain * 0.7; R(c, p.x - p.w / 2, p.y - 3, p.w, 6, '#4a6a9a'); R(c, p.x - p.w / 2 + 2, p.y - 2, p.w / 2, 1, '#9ec0e8'); c.globalAlpha = 1; }
  for (const k of A.ducks) { const x = k.cx + Math.cos(k.a) * k.rx, y = k.cy + Math.sin(k.a) * k.ry, f = Math.sin(k.a) * k.s > 0 ? 1 : -1, bob = Math.sin(t * 3 + k.a) * 1;
    R(c, x - 9, y + 3, 18, 2, '#4a8fc0'); R(c, x - 7, y - 4 + bob, 14, 7, '#f6efe0'); R(c, x - 7, y + 1 + bob, 14, 2, '#d8d0c0'); R(c, x + f * 4 - 2, y - 9 + bob, 6, 6, '#3f8a4a'); R(c, x + f * 8 - (f < 0 ? 4 : 0), y - 7 + bob, 4, 2, '#f0a030'); R(c, x + f * 5, y - 8 + bob, 1, 1, '#111'); }
  for (const s of A.squirrels) { const run = Math.sin(t * 0.7 + s.p), x = s.hx + run * 24, hop = Math.abs(Math.sin(t * 8 + s.p)) * 3 * (Math.abs(Math.cos(t * .7 + s.p)) > .3);
    R(c, x - 4, s.y - 6 - hop, 8, 6, '#b0602a'); R(c, x + (run > 0 ? 3 : -6), s.y - 9 - hop, 4, 4, '#b0602a'); R(c, x + (run > 0 ? -8 : 4), s.y - 14 - hop, 4, 10, '#c8783a'); R(c, x + (run > 0 ? -8 : 5), s.y - 15 - hop, 3, 3, '#e0a060'); }
  for (const b of A.birds) if (b.state === 'ground') { const hop = Math.max(0, Math.sin(b.hop * 6)) * 2; R(c, b.x - 4, b.y - 5 - hop, 8, 5, b.col); R(c, b.x + 2, b.y - 7 - hop, 4, 4, b.col); R(c, b.x + 6, b.y - 6 - hop, 2, 1, '#f0a030'); R(c, b.x - 2, b.y - hop, 1, 2, '#333'); }
  // street life: food cart + busker spot + cars
  drawCart(c, 27 * TILE, 18.6 * TILE, t);
  for (const n of A.notes) { c.globalAlpha = Math.min(1, n.life); c.fillStyle = '#f2cc68'; c.font = '14px sans-serif'; c.fillText(n.ch, n.x, n.y); c.globalAlpha = 1; }
  for (const car of A.cars) drawCar(c, car);
  if (A.ball) { const B = A.ball; R(c, B.x - 4, B.y + 2, 8, 3, 'rgba(0,0,0,.25)'); R(c, B.x - 4, B.y - 4 - B.z, 8, 8, '#d8f040'); R(c, B.x - 2, B.y - 3 - B.z, 3, 2, '#fff'); }
}
function drawCart(c, x, y, t) {
  R(c, x, y + 18, 56, 4, 'rgba(8,10,24,.3)'); R(c, x, y - 10, 56, 28, '#8e2430'); R(c, x, y - 10, 56, 3, '#d4a640');
  for (let i = 0; i < 7; i++) R(c, x - 4 + i * 9, y - 26, 9, 8, i % 2 ? '#f6efe0' : '#d4a640'); R(c, x + 2, y - 18, 3, 10, '#6a4428'); R(c, x + 51, y - 18, 3, 10, '#6a4428');
  R(c, x + 6, y - 4, 44, 9, '#121a36'); c.fillStyle = '#f2cc68'; c.font = '7px Silkscreen, monospace'; c.textAlign = 'left'; c.fillText('TAIYAKI', x + 10, y + 2);
  for (const wx of [x + 8, x + 40]) { R(c, wx, y + 14, 9, 9, '#1a1420'); R(c, wx + 3, y + 17, 3, 3, '#d4a640'); }
  if (Math.sin(t * 2) > 0) R(c, x + 20, y - 34 - (t * 10 % 8), 3, 3, 'rgba(255,255,255,.6)');
}
function drawCar(c, car) {
  const { x, y, col } = car;
  if (car.vert) { R(c, x - 9, y - 18, 18, 36, col); R(c, x - 7, y - 10, 14, 8, '#bfe6f7'); R(c, x - 11, y - 12, 3, 8, '#111'); R(c, x + 8, y - 12, 3, 8, '#111'); R(c, x - 11, y + 6, 3, 8, '#111'); R(c, x + 8, y + 6, 3, 8, '#111'); return; }
  const f = car.vx > 0 ? 1 : -1; R(c, x - 22, y + 8, 44, 4, 'rgba(8,10,24,.35)'); R(c, x - 22, y - 6, 44, 14, col); R(c, x - 12, y - 14, 24, 9, col); R(c, x - 9, y - 12, 18, 6, '#bfe6f7');
  R(c, x + f * 20 - 2, y - 3, 4, 3, '#fff1b0'); for (const wx of [x - 16, x + 8]) R(c, wx, y + 5, 8, 7, '#111');
}
export function drawSkyLife(c, A, phase) {
  const t = A.t;
  for (const b of A.birds) if (b.state === 'fly') { const w = Math.sin(t * 20) > 0 ? 3 : -2; R(c, b.x - 3, b.y + 4, 6, 2, 'rgba(0,0,0,.18)'); R(c, b.x - 5, b.y - b.z + w, 4, 2, b.col); R(c, b.x + 1, b.y - b.z + w, 4, 2, b.col); R(c, b.x - 1, b.y - b.z, 3, 3, b.col); }
  for (const f of A.flyers) { const w = Math.sin(t * 9 + f.i) > 0 ? 3 : -3; R(c, f.x + 30, f.y + 70, 8, 3, 'rgba(10,14,30,.2)'); R(c, f.x - 7, f.y + w, 6, 2, '#2a2430'); R(c, f.x + 1, f.y + w, 6, 2, '#2a2430'); R(c, f.x - 1, f.y, 3, 3, '#2a2430'); }
  for (const b of A.butterflies) { const x = b.hx + Math.sin(t * 1.3 + b.p) * 18, y = b.hy - 10 + Math.sin(t * 2.1 + b.p * 2) * 8, w = Math.sin(t * 16 + b.p) > 0 ? 3 : 1; R(c, x - w, y, w, 3, b.col); R(c, x + 1, y, w, 3, b.col); R(c, x, y, 1, 3, '#222'); }
  if (phase.dark > 0.3) { c.globalCompositeOperation = 'lighter'; for (const f of A.fireflies) { const a = (Math.sin(t * 2 + f.p * 3) + 1) / 2 * phase.dark; const x = f.x + Math.sin(t * .5 + f.p) * 20, y = f.y + Math.cos(t * .4 + f.p) * 14; c.fillStyle = `rgba(200,255,120,${a * .35})`; c.fillRect(x - 3, y - 3, 7, 7); c.fillStyle = `rgba(240,255,170,${a})`; c.fillRect(x, y, 2, 2); }
    for (const L of LAMPS) for (let k = 0; k < 3; k++) { const a = t * 3 + k * 2.1 + L.x, x = L.x + Math.cos(a) * 9, y = L.y + Math.sin(a * 1.3) * 6; c.fillStyle = 'rgba(255,240,200,.8)'; c.fillRect(x, y, 2, 2); }
    c.globalCompositeOperation = 'source-over'; }
}
// Screen-space overlay: colour grade (multiply) with additive light pools, then weather.
const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
export function gradeFor(phase, rain = 0) {
  let g = [255, 255, 255];
  if (phase.dark > 0) g = mix(g, [44, 54, 118], Math.min(1, phase.dark / 0.62));
  if (phase.tint[3] > 0) g = mix(g, [255, 168, 120], Math.min(1, phase.tint[3] * 1.6));
  if (rain > 0) g = mix(g, [168, 182, 214], rain * 0.6);
  return g;
}
export function drawAtmosphere(c, A, phase, cam, vw, vh, lights) {
  const ox = Math.round(vw / 2 - cam.x), oy = Math.round(vh / 2 - cam.y), g = gradeFor(phase, A.rain), night = Math.min(1, phase.dark / 0.62);
  if (g.some((v) => v < 254)) {
    if (!A.lcv) A.lcv = document.createElement('canvas');
    const L = A.lcv; if (L.width !== vw || L.height !== vh) { L.width = vw; L.height = vh; }
    const x = L.getContext('2d'); x.globalCompositeOperation = 'source-over'; x.fillStyle = `rgb(${g})`; x.fillRect(0, 0, vw, vh);
    if (night > 0.15) { x.globalCompositeOperation = 'lighter';
      for (const l of lights) { const lx = l.x + ox, ly = (l.gy ?? l.y) + oy; if (lx < -l.r || ly < -l.r || lx > vw + l.r || ly > vh + l.r) continue;
        const gr = x.createRadialGradient(lx, ly, 0, lx, ly, l.r); gr.addColorStop(0, `rgba(255,206,140,${0.72 * night})`); gr.addColorStop(0.55, `rgba(170,120,70,${0.25 * night})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = gr; x.beginPath(); x.ellipse(lx, ly, l.r, l.r * (l.flat ?? 0.6), 0, 0, 7); x.fill(); } }
    c.save(); c.globalCompositeOperation = 'multiply'; c.drawImage(L, 0, 0); c.restore();
    if (night > 0.15) { c.save(); c.globalCompositeOperation = 'lighter';
      for (const l of lights) if (l.glow) { const lx = l.x + ox, ly = l.y + oy; if (lx < -60 || ly < -60 || lx > vw + 60 || ly > vh + 60) continue; const r = l.core || 26;
        const gr = c.createRadialGradient(lx, ly, 0, lx, ly, r); gr.addColorStop(0, `rgba(255,220,140,${0.55 * night})`); gr.addColorStop(1, 'rgba(255,170,80,0)'); c.fillStyle = gr; c.fillRect(lx - r, ly - r, r * 2, r * 2); }
      c.restore(); }
    if (phase.tint[3] > 0) { const gr = c.createLinearGradient(0, 0, 0, vh); gr.addColorStop(0, `rgba(255,150,90,${phase.tint[3] * 0.5})`); gr.addColorStop(1, 'rgba(255,120,80,0)'); c.save(); c.globalCompositeOperation = 'soft-light'; c.fillStyle = gr; c.fillRect(0, 0, vw, vh); c.restore(); }
  }
  const t = A.t;
  if (A.rain > 0.02) { // pixel rain streaks (two depths) + ground splashes
    const n = Math.floor(220 * A.rain);
    for (let i = 0; i < n; i++) { const far = i % 3 === 0, sp = far ? 520 : 820, x = Math.round(((i * 97.3 + t * (far ? 90 : 140)) % (vw + 40)) - 20), y = Math.round((i * 53.7 + t * sp + i * i * 0.37) % (vh + 30)) - 15;
      c.fillStyle = far ? `rgba(170,190,240,${A.rain * 0.35})` : `rgba(210,225,255,${A.rain * 0.6})`; for (let k = 0; k < (far ? 3 : 5); k++) c.fillRect(x - k, y + k * 3, 1, 3); }
    for (let i = 0; i < Math.floor(40 * A.rain); i++) { const ph = (t * 3 + i * 0.37) % 1, x = Math.round((i * 211.7 + Math.floor(t * 3 + i * 0.37) * 97) % vw), y = Math.round((i * 137.3 + Math.floor(t * 3 + i * 0.37) * 61) % vh), r = 1 + Math.floor(ph * 4);
      c.fillStyle = `rgba(220,235,255,${(1 - ph) * 0.6 * A.rain})`; c.fillRect(x - r, y, 1, 1); c.fillRect(x + r, y, 1, 1); c.fillRect(x - r + 1, y - 1, r * 2 - 1, 1); c.fillRect(x - r + 1, y + 1, r * 2 - 1, 1); }
  } else if (night < 0.5) for (const p of A.petals) { // sakura petals: tumbling 3-frame sprites drifting on the breeze
    const x = Math.round(((p.x + t * 22 + Math.sin(t * 0.8 + p.p) * 34) % (vw + 40)) - 20), y = Math.round(((p.y + t * 16 + Math.sin(t * 1.7 + p.p) * 6) % (vh + 40)) - 20), f = Math.floor(t * 6 + p.p * 3) % 4;
    const a = p.p > 4.5 ? '#ffd0de' : '#f59ab8', b = '#d86a92'; c.fillStyle = a;
    if (f === 0) { c.fillRect(x, y, 4, 2); c.fillRect(x + 1, y + 2, 2, 1); c.fillStyle = b; c.fillRect(x + 3, y + 1, 1, 1); }
    else if (f === 1 || f === 3) { c.fillRect(x + 1, y, 2, 3); c.fillStyle = b; c.fillRect(x + 1, y + 2, 1, 1); }
    else { c.fillRect(x, y + 1, 4, 1); }
  }
}
export function drawEmote(c, x, y, kind, t) {
  const icon = EMOTES[kind]; if (!icon) return;
  const yy = y - 110 + Math.sin(t * 6) * 3;
  c.fillStyle = '#121a36'; c.fillRect(x - 13, yy - 13, 26, 24); c.fillStyle = '#d4a640'; c.fillRect(x - 13, yy + 11, 26, 2); c.fillRect(x - 3, yy + 13, 6, 3);
  if (kind === 'heart') return drawEmblem(c, 'heart', x - 7.5, yy - 8, 3, '#ff5a7a');
  c.font = kind === 'dance' ? '14px sans-serif' : '8px Silkscreen, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#f2cc68'; c.fillText(icon, x, yy);
}
export function lightsFor(state, phase, playerHome) {
  const L = LAMPS.map((l) => ({ x: l.x, y: l.y, gy: l.gy, r: 92, glow: true, core: 20 }));
  for (const b of [...BUILDINGS, ...MALL_BUILDINGS, ...NPC_HOMES]) { // lit doorway pool + window glows
    L.push({ x: (b.x + b.w / 2) * TILE, y: (b.y + b.h - 0.8) * TILE, gy: (b.y + b.h + 0.6) * TILE, r: 84, glow: true, core: 30, flat: 0.5 });
    for (let k = 1; k < b.w; k += 3) L.push({ x: (b.x + k + 0.5) * TILE, y: (b.y + b.h - 2.6) * TILE, r: 34, glow: true, core: 16, flat: 0.8 }); }
  for (const p of PLOTS) if (state.plots[p.id]) L.push({ x: (p.x + 3) * TILE, y: (p.y + 5) * TILE, gy: (p.y + 6.5) * TILE, r: playerHome === p.id ? 150 : 80, glow: true, core: 28 });
  return L;
}

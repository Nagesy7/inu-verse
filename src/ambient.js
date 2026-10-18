import { MARKET, CRAFT, LOTS, BARN, CHAPEL } from './world.js';
import { doorLights } from './doorart.js';
import { luxuryLights } from './luxury.js';
// Ambient life: day/night, weather, wildlife, street life, emotes, mail. Purely cosmetic.
// Pure helpers (dayPhase, makeAmbient, stepAmbient, addMail) are headless-testable; draw* need a canvas.
import { TILE, MAP_W, MAP_H, MAP, T, BUILDINGS, PLOTS, MALL_BUILDINGS, NPC_HOMES, findPath, isSolid } from './world.js';
import { mulberry32 } from './rng.js';
import { reducedMotion, inView } from './alive.js';

export const DAY_LEN = 720; // seconds per in-game day (~12 real minutes)
export const LAMP_TILES = [[8, 18], [24, 18], [40, 23], [52, 18], [12, 29], [44, 29], [20, 34], [50, 34], [13, 46], [50, 46], [24, 56], [40, 56], [29, 5], [45, 34]];
export const LAMPS = LAMP_TILES.map(([x, y]) => ({ x: x * TILE + 16, y: y * TILE - 34, gy: y * TILE + 22 }));
export const PONDS = [[5, 3, 9, 5], [37, 35, 18, 4]];
export const EMOTES = { wave: 'HI!', sit: 'SIT', zoomies: 'ZOOM', dance: '♪♫', heart: 'heart', bork: 'BORK!', happy: 'YAY', note: 'OK', angry: 'HMPH' };
import { drawEmblem } from './art.js';
import { drawCar, LANES, CAR_LEN } from './cars.js';

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
  // ducks paddle in the pond sections either side of the bridges (never across the planks)
  A.ducks = [[5, 3, 4, 5], [11, 3, 3, 5], [37, 35, 9, 4], [48, 35, 7, 4]].flatMap(([x, y, w, h], j) => Array.from({ length: j % 2 ? 1 : 2 }, (_, i) => ({ cx: (x + w / 2) * TILE, cy: (y + h / 2) * TILE, rx: Math.max(10, (w / 2 - 0.9) * TILE), ry: Math.max(8, (h / 2 - 1) * TILE), a: rng() * 6.28, s: (0.12 + rng() * 0.1) * (i % 2 ? 1 : -1) })));
  A.butterflies = spots([T.FLOWER], rng, 9).map(([x, y]) => ({ hx: (x + .5) * TILE, hy: (y + .5) * TILE, p: rng() * 9, col: rng.pick(['#f6efe0', '#f2cc68', '#f08cb0', '#9fd0ff']) }));
  A.squirrels = spots([T.TREE], rng, 40).filter(([x, y]) => x > 0 && y > 0 && x < MAP_W - 1 && y < MAP_H - 1).slice(0, 3).map(([x, y]) => ({ x: (x + .5) * TILE, y: (y + 1.2) * TILE, hx: (x + .5) * TILE, p: rng() * 9 }));
  A.fireflies = Array.from({ length: 40 }, () => ({ x: rng() * MAP_W * TILE, y: rng() * MAP_H * TILE, p: rng() * 9 }));
  // street traffic: two lanes per road, right-hand traffic (east in the lower lane, west in the upper; south on the avenue's west lane)
  A.cars = [
    { dir: 'east', row: 20, x: 3 * TILE, v: 110, col: '#c8323c' }, { dir: 'west', row: 20, x: 40 * TILE, v: 95, col: '#2f6fbd', kind: 'coupe' },
    { dir: 'east', row: 31, x: 50 * TILE, v: 100, col: '#3f9450' }, { dir: 'west', row: 31, x: 12 * TILE, v: 120, col: '#e3b341' },
    { dir: 'east', row: 42, x: 20 * TILE, v: 90, col: '#f2efe6', kind: 'coupe' }, { dir: 'west', row: 42, x: 55 * TILE, v: 105, col: '#8e2452' },
    { dir: 'south', y: 8 * TILE, v: 85, col: '#e07a2c' }, { dir: 'north', y: 40 * TILE, v: 80, col: '#4a5478', kind: 'coupe' }];
  for (const c of A.cars) { if (c.row != null) c.y = c.dir === 'east' ? LANES.east(c.row) : LANES.west(c.row); else c.x = c.dir === 'south' ? LANES.south() : LANES.north(); }
  A.rain = 0; A.rainTarget = 0; A.weatherT = 90; A.drops = []; A.petals = Array.from({ length: 30 }, () => ({ x: rng() * 1600, y: rng() * 1000, p: rng() * 9 }));
  A.puddles = spots([T.WALK, T.PLAZA, T.ROAD], rng, 14).map(([x, y]) => ({ x: (x + .5) * TILE, y: (y + .5) * TILE, w: 10 + rng.int(14) }));
  A.ball = null; A.notes = [];
  A.cats = CATS.map((k, i) => { const P = CAT_PERCHES[k.perch]; return { ...k, i, x: P.x0 + (P.x1 - P.x0) * 0.5, st: 'nap', alpha: 1, ph: i * 1.7 }; });
  return A;
}

// ---------------- Ambient life pass: shop cats, bird scatter, dog walks ----------------
// Cats nap on shop awnings (rival lot storefronts + the market/craft stall roofs), always in the sunny end: the morning
// sun is in the east so they lie at the right, at noon in the middle, by late afternoon at the left; after dark they
// curl up by the warm lantern; in rain they slip inside. They pad along the awning when the sunny spot moves.
const lotRect = (id) => LOTS.find((l) => l.id === id);
export const CAT_PERCHES = {
  L3: (() => { const L = lotRect('L3'); return { x0: L.x * TILE + 10, x1: (L.x + L.w) * TILE - 14, y: L.y * TILE + 49, base: (L.y + L.h) * TILE - 1, lamp: 0.86 }; })(),
  P2: (() => { const L = lotRect('P2'); return { x0: L.x * TILE + 10, x1: (L.x + L.w) * TILE - 14, y: L.y * TILE + 49, base: (L.y + L.h) * TILE - 1, lamp: 0.86 }; })(),
  market: { x0: MARKET.x * TILE + 12, x1: (MARKET.x + MARKET.w) * TILE - 12, y: MARKET.y * TILE + 3, base: (MARKET.y + MARKET.h) * TILE, lamp: 0.04 },
};
export const CATS = [{ name: 'Miso', perch: 'L3', pal: ['#e8923a', '#b8641e', '#fff1e0'] }, { name: 'Yuki', perch: 'P2', pal: ['#8a8f9e', '#5a5f6e', '#e8e8f0'] }, { name: 'Kinako', perch: 'market', pal: ['#f4efe6', '#d88a3a', '#3a3030'] }];
// where on its awning a cat wants to be (0 = west end, 1 = east end) at an in-game hour; null = indoors (rain)
export function catSpot(hour, dark = 0, rain = 0, lamp = 0.5, i = 0) { if (rain > 0.3) return null; const j = ((i * 37) % 10) / 100;
  if (dark > 0.35 || hour < 6 || hour >= 19.5) return lamp; return Math.max(0.02, Math.min(0.98, 1 - (hour - 6) / 12.5 + j - 0.05)); }
function stepCats(A, dt, hour, dark, rain) { const RM = reducedMotion();
  for (const k of A.cats) { const P = CAT_PERCHES[k.perch], f = catSpot(hour, dark, rain, P.lamp, k.i);
    if (f == null) { k.alpha = Math.max(0, k.alpha - dt * (RM ? 99 : 1.2)); continue; } k.alpha = Math.min(1, k.alpha + dt * (RM ? 99 : 1.2));
    const tx = P.x0 + (P.x1 - P.x0) * f, dx = tx - k.x; if (RM || Math.abs(dx) < 1) { k.x = RM ? tx : k.x; k.st = 'nap'; k.dir = k.dir || 1; continue; }
    k.st = 'walk'; k.dir = Math.sign(dx); k.x += Math.sign(dx) * Math.min(Math.abs(dx), 16 * dt); } }
const CATSPR = new Map();
function catSprite(pal, frame) { const key = pal.join('') + frame; let cv = CATSPR.get(key); if (cv) return cv; // native 16x9, original pixel cat
  cv = document.createElement('canvas'); cv.width = 16; cv.height = 9; const c = cv.getContext('2d'), [a, b, e] = pal, I = '#141a2e', P = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  if (frame < 2) { const br = frame; // curled loaf, breathing
    P(2, 3 - br, 10, 6 + br, I); P(3, 4 - br, 8, 4 + br, a); P(4, 4 - br, 3, 1, b); P(8, 5 - br, 2, 1, b); P(10, 2, 5, 6, I); P(11, 3, 3, 4, a); P(10, 1, 2, 2, I); P(13, 1, 2, 2, I); P(11, 5, 1, 1, I); P(13, 5, 1, 1, I); P(12, 6, 1, 1, '#e88a9a');
    P(1, 6, 9, 2, I); P(2, 6, 7, 1, b); P(3, 7, 4, 1, e); }
  else { const st = frame - 2; // walking
    P(2, 2, 10, 5, I); P(3, 3, 8, 3, a); P(5, 3, 2, 1, b); P(8, 3, 2, 1, b); P(10, 0, 5, 5, I); P(11, 1, 3, 3, a); P(10, 0, 1, 1, I); P(14, 0, 1, 1, I); P(13, 2, 1, 1, I); P(0, 0 + st, 2, 4, I); P(0, 1 + st, 1, 2, b);
    for (const [lx, o] of [[3, st], [5, 1 - st], [9, 1 - st], [11, st]]) P(lx, 7 - o, 1, 2 - (1 - o), I); P(4, 6, 6, 1, e); }
  CATSPR.set(key, cv); return cv; }
// depth-sorted cat props (drawn just after the storefront they sit on); only the ones in view
export function catProps(A, view) { const out = []; if (!A.cats) return out;
  for (const k of A.cats) { const P = CAT_PERCHES[k.perch]; if (k.alpha <= 0 || !inView(k.x, P.y, view, 40)) continue;
    out.push({ y: P.base + 0.5, cat: k, d: (c) => { const fr = k.st === 'walk' ? 2 + (Math.floor(A.t * 6) % 2) : Math.floor(A.t * 0.8 + k.ph) % 2, spr = catSprite(k.pal, fr);
      c.save(); c.globalAlpha = k.alpha; c.translate(Math.round(k.x), P.y); if (k.dir < 0) c.scale(-1, 1); c.drawImage(spr, -16, -18, 32, 18); c.restore();
      if (k.st === 'nap' && k.alpha > 0.9 && Math.sin(A.t * 0.7 + k.ph) > 0.6) { c.fillStyle = '#f6efe0'; c.font = '6px Silkscreen, monospace'; c.textAlign = 'center'; c.fillText('z', Math.round(k.x + 10), Math.round(P.y - 20 - (A.t * 4 % 6))); } } }); }
  return out; }

// Birds: walking right up to a ground bird still makes it hop off; SPRINTING spooks every bird within BIRD_RUN_R. They
// scatter away from you, circle off for a few seconds, then glide back down to their own patch (they wait while you are
// still tearing about next to it). Reduced motion: they just vanish and quietly reappear.
export const BIRD_WALK_R = 46, BIRD_RUN_R = 150;
function stepBirds(A, dt, player, running, ev) { const r = A.rng, RM = reducedMotion(), R0 = running ? BIRD_RUN_R : BIRD_WALK_R;
  for (const b of A.birds) { const d = Math.hypot(player.x - b.x, player.y - b.y);
    if (b.state === 'ground') { b.hop -= dt; if (b.hop < 0) { b.hop = 0.6 + r() * 2; b.x = b.hx + (r() - .5) * 20; b.y = b.hy + (r() - .5) * 12; }
      if (d < R0) { const a = Math.atan2(b.y - player.y, b.x - player.x) + (r() - .5) * 0.6, sp = running ? 200 : 160; b.state = RM ? 'gone' : 'fly'; b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp - 40; b.away = 0; ev.push({ kind: 'flush', run: !!running }); } }
    else if (b.state === 'gone') { b.away += dt; if (b.away > 5 && Math.hypot(player.x - b.hx, player.y - b.hy) > BIRD_RUN_R) { b.state = 'ground'; b.x = b.hx; b.y = b.hy; b.z = 0; } }
    else if (b.state === 'fly') { b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= 1 - dt * 0.25; b.vy *= 1 - dt * 0.25; b.z = Math.min(140, b.z + 90 * dt); b.away += dt;
      if (b.away > 3.2 && Math.hypot(player.x - b.hx, player.y - b.hy) > (running ? BIRD_RUN_R : BIRD_WALK_R) + 20) { b.state = 'return'; b.fx = b.x; b.fy = b.y; b.fz = b.z; b.k = 0; b.dur = Math.max(1.2, Math.hypot(b.hx - b.x, b.hy - b.y) / 150); } }
    else if (b.state === 'return') { b.k = Math.min(1, b.k + dt / b.dur); const e = b.k * b.k * (3 - 2 * b.k); b.x = b.fx + (b.hx - b.fx) * e; b.y = b.fy + (b.hy - b.fy) * e; b.z = b.fz * (1 - e) + Math.sin(b.k * Math.PI) * 18;
      if (running && d < BIRD_RUN_R && b.k > 0.5) { b.state = 'fly'; b.away = 0; b.vx = (b.x - player.x) / (d || 1) * 180; b.vy = -60; } // spooked again on the way in
      else if (b.k >= 1) { b.state = 'ground'; b.z = 0; b.x = b.hx; b.y = b.hy; b.hop = 0.4; } } } }

// Dog walks: townsfolk walking their dogs on fixed loops. Position is a pure function of the shared wall clock (epoch ms),
// so every client sees the same walker at the same spot at the same moment. Routes are fixed waypoint loops joined by the
// map's own path-finder (deterministic); the per-walker start offset, sniff-stop lengths and pace come from a fixed seed.
export const WALK_SEED = 20261019, WALK_SPEED = 38;
export const DOG_WALKERS = [
  { name: 'Sumi', coat: 'cream', outfit: { top: 'hoodie_maroon', bottom: 'jeans_ripped', feet: 'sneakers_red' }, dog: 'Pip', dogCoat: 'red', band: '#3a7ae0', loop: [[3, 19], [28, 19], [29, 23], [3, 23]] },
  { name: 'Ren', coat: 'gray', outfit: { top: 'jacket_black', bottom: 'slacks_black', feet: 'loafers' }, dog: 'Biscuit', dogCoat: 'golden', band: '#e0405a', loop: [[36, 19], [60, 19], [61, 23], [36, 23]] },
  { name: 'Nori', coat: 'dark', outfit: { top: 'hawaiian', bottom: 'chinos', feet: 'sneakers_red' }, dog: 'Dango', dogCoat: 'cream', band: '#f2c84a', loop: [[8, 46], [56, 47], [56, 58], [24, 58], [8, 58]] },
  { name: 'Aki', coat: 'tan', outfit: { top: 'suit_navy', bottom: 'slacks_navy', neck: 'tie_red', feet: 'loafers' }, dog: 'Waffles', dogCoat: 'dark', band: '#3fb04a', loop: [[2, 86], [33, 86], [61, 86], [61, 95], [33, 95], [2, 95]] },
  { name: 'Hiro', coat: 'golden', outfit: { top: 'tux_black', bottom: 'slacks_black', neck: 'bowtie', feet: 'loafers' }, dog: 'Mame', dogCoat: 'tan', band: '#c86ad8', loop: [[36, 39], [60, 39], [60, 34], [37, 34]] },
];
const ROUTES = [];
// build (once, lazily) one walker's route: px points with cumulative time, sniff stops at each waypoint
export function walkRoute(i) { if (ROUTES[i]) return ROUTES[i]; const W = DOG_WALKERS[i], rng = mulberry32(WALK_SEED + i * 7919), pts = [], stops = [];
  for (let k = 0; k < W.loop.length; k++) { const a = W.loop[k], b = W.loop[(k + 1) % W.loop.length], p = findPath(a[0], a[1], b[0], b[1]) || [a, b];
    stops.push({ at: pts.length, wait: 2 + rng() * 3 }); for (let j = k === 0 ? 0 : 1; j < p.length; j++) pts.push([(p[j][0] + 0.5) * TILE, (p[j][1] + 0.7) * TILE]); }
  if (pts.length > 1 && pts[pts.length - 1][0] === pts[0][0] && pts[pts.length - 1][1] === pts[0][1]) pts.pop();
  const speed = WALK_SPEED * (0.9 + rng() * 0.2), seg = [], waitAt = new Map(stops.map((s) => [s.at, s.wait])); let t = 0;
  for (let k = 0; k < pts.length; k++) { const a = pts[k], b = pts[(k + 1) % pts.length], w = waitAt.get(k) || 0; if (w) { seg.push({ t0: t, t1: t + w, a, b: a, wait: true }); t += w; } const d = Math.hypot(b[0] - a[0], b[1] - a[1]) / speed; seg.push({ t0: t, t1: t + d, a, b }); t += d; }
  return (ROUTES[i] = { seg, period: t, offset: rng() * t, pts }); }
const segAt = (R, t) => { let lo = 0, hi = R.seg.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (R.seg[m].t1 <= t) lo = m + 1; else hi = m; } return R.seg[lo]; };
const posAt = (R, t) => { t = ((t % R.period) + R.period) % R.period; const s = segAt(R, t), k = s.t1 > s.t0 ? (t - s.t0) / (s.t1 - s.t0) : 0; return { x: s.a[0] + (s.b[0] - s.a[0]) * k, y: s.a[1] + (s.b[1] - s.a[1]) * k, dx: s.b[0] - s.a[0], dy: s.b[1] - s.a[1], wait: !!s.wait }; };
const faceOf = (dx, dy, f) => (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01 ? f : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
// where walker i and their dog are at wall-clock nowMs (pure)
export function dogWalkAt(i, nowMs) { const R = walkRoute(i), t = nowMs / 1000 + R.offset, o = posAt(R, t), lead = posAt(R, t + 0.75), face = faceOf(o.dx, o.dy, 'down');
  const sniff = o.wait ? Math.sin(t * 1.3 + i) * 10 : 0; return { x: o.x, y: o.y, face, moving: !o.wait, dogX: (o.wait ? o.x + 18 : lead.x) + sniff, dogY: (o.wait ? o.y + 4 : lead.y + 3), dogFace: o.wait ? (sniff > 0 ? 'right' : 'left') : faceOf(lead.dx, lead.dy, face), phase: t * 10 }; }
// pooled, culled actors for the depth sort: owner Shibas + dogs (small pups with a bandana) + leash props, view = world rect
const WPOOL = DOG_WALKERS.map((W) => ({ owner: { x: 0, y: 0, coat: W.coat, outfit: W.outfit, face: 'down', phase: 0, moving: true, walker: W.name }, dog: { x: 0, y: 0, coat: W.dogCoat, outfit: {}, face: 'down', phase: 0, moving: true, pupScale: 0.8, pupPatch: W.band, pupHex: '#f6efe0', walkerDog: W.dog } }));
export function dogWalkActors(view, nowMs, artKey = null, out = []) { const RM = reducedMotion();
  for (let i = 0; i < DOG_WALKERS.length; i++) { const p = dogWalkAt(i, nowMs); if (!inView(p.x, p.y, view, 90) && !inView(p.dogX, p.dogY, view, 90)) continue;
    const P = WPOOL[i], o = P.owner, d = P.dog; o.x = p.x; o.y = p.y; o.face = p.face; o.moving = p.moving; o.phase = RM ? 0 : p.phase; d.x = p.dogX; d.y = p.dogY; d.face = p.dogFace; d.moving = p.moving || !RM; d.phase = RM ? 0 : p.phase * 1.4;
    if (artKey && !o.art) { o.art = artKey(o.coat, o.outfit); d.art = artKey(d.coat, {}); } out.push(o, d); }
  return out; }
export function leashProps(view, nowMs) { const out = [];
  for (let i = 0; i < DOG_WALKERS.length; i++) { const p = dogWalkAt(i, nowMs); if (!inView(p.x, p.y, view, 90)) continue; const s = p.face === 'left' ? -1 : 1, hx = p.x + s * 7, hy = p.y - 9, dx = p.dogX, dy = p.dogY - 6;
    out.push({ y: Math.max(p.y, p.dogY) + 7, d: (c) => { c.strokeStyle = '#141a2e'; c.lineWidth = 1; c.beginPath(); c.moveTo(Math.round(hx), Math.round(hy)); c.quadraticCurveTo((hx + dx) / 2, Math.max(hy, dy) + 5, Math.round(dx), Math.round(dy)); c.stroke(); } }); }
  return out; }
// Taro's bread basket (drawn in actor space after the Shiba; scale 0.5 world px per unit)
export function drawBreadBasket(c, face) { const s = face === 'left' ? -1 : 1, x = 12 * s - (s < 0 ? 18 : 0), y = -34;
  R(c, x - 1, y - 1, 20, 12, '#141a2e'); R(c, x, y, 18, 10, '#c8925a'); for (let i = 0; i < 18; i += 4) R(c, x + i, y + 2, 2, 8, '#a8723a'); R(c, x, y, 18, 2, '#e8b878');
  R(c, x + 2, y - 7, 5, 9, '#141a2e'); R(c, x + 3, y - 6, 3, 8, '#e0a050'); R(c, x + 9, y - 5, 8, 6, '#141a2e'); R(c, x + 10, y - 4, 6, 4, '#d88a3a'); R(c, x + 11, y - 4, 4, 1, '#f6d28a'); }

// step everything; player {x,y}; npcs list (fetch target); returns events like {kind:'flush'} for sounds
// opts: { running (player sprinting), hour (in-game), dark (0..1) } - all cosmetic
export function stepAmbient(A, dt, player, npcs = [], opts = {}) {
  const r = A.rng, ev = []; A.t += dt;
  stepBirds(A, dt, player, opts.running ?? player.running, ev);
  if (A.cats) stepCats(A, dt, opts.hour ?? 12, opts.dark ?? 0, A.rain);
  for (const f of A.flyers) { f.x += f.vx * dt; f.y += f.vy * dt; if (f.x > MAP_W * TILE + 80) { f.x = -80; f.y = r() * MAP_H * TILE; } }
  for (const k of A.ducks) k.a += k.s * dt;
  for (const c of A.cars) { const d = c.v * dt, lo = 6 * TILE + CAR_LEN, hi = 45 * TILE; // avenue is a 6..45 cul-de-sac: wrap with a fade at each end
    if (c.dir === 'east') { c.x += d; if (c.x > MAP_W * TILE + 80) c.x = -80; } else if (c.dir === 'west') { c.x -= d; if (c.x < -80) c.x = MAP_W * TILE + 80; }
    else if (c.dir === 'south') { c.y += d; if (c.y > hi) c.y = lo; } else { c.y -= d; if (c.y < lo) c.y = hi; }
    c.alpha = c.row != null ? 1 : Math.max(0, Math.min(1, (c.y - lo) / 40, (hi - c.y) / 40)); }
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
export function drawGroundLife(c, A, phase, view = null) {
  const t = A.t, V = (x, y, m = 40) => !view || inView(x, y, view, m);
  for (const p of A.puddles) if (A.rain > 0.05 && V(p.x, p.y)) { c.globalAlpha = A.rain * 0.7; R(c, p.x - p.w / 2, p.y - 3, p.w, 6, '#4a6a9a'); R(c, p.x - p.w / 2 + 2, p.y - 2, p.w / 2, 1, '#9ec0e8'); c.globalAlpha = 1; }
  for (const k of A.ducks) { const x = k.cx + Math.cos(k.a) * k.rx, y = k.cy + Math.sin(k.a) * k.ry, f = Math.sin(k.a) * k.s > 0 ? 1 : -1, bob = Math.sin(t * 3 + k.a) * 1; if (!V(x, y)) continue;
    R(c, x - 9, y + 3, 18, 2, '#4a8fc0'); R(c, x - 7, y - 4 + bob, 14, 7, '#f6efe0'); R(c, x - 7, y + 1 + bob, 14, 2, '#d8d0c0'); R(c, x + f * 4 - 2, y - 9 + bob, 6, 6, '#3f8a4a'); R(c, x + f * 8 - (f < 0 ? 4 : 0), y - 7 + bob, 4, 2, '#f0a030'); R(c, x + f * 5, y - 8 + bob, 1, 1, '#111'); }
  for (const s of A.squirrels) { if (!V(s.hx, s.y, 60)) continue; const run = Math.sin(t * 0.7 + s.p), x = s.hx + run * 24, hop = Math.abs(Math.sin(t * 8 + s.p)) * 3 * (Math.abs(Math.cos(t * .7 + s.p)) > .3);
    R(c, x - 4, s.y - 6 - hop, 8, 6, '#b0602a'); R(c, x + (run > 0 ? 3 : -6), s.y - 9 - hop, 4, 4, '#b0602a'); R(c, x + (run > 0 ? -8 : 4), s.y - 14 - hop, 4, 10, '#c8783a'); R(c, x + (run > 0 ? -8 : 5), s.y - 15 - hop, 3, 3, '#e0a060'); }
  for (const b of A.birds) if (b.state === 'ground' && V(b.x, b.y)) { const hop = Math.max(0, Math.sin(b.hop * 6)) * 2; R(c, b.x - 4, b.y - 5 - hop, 8, 5, b.col); R(c, b.x + 2, b.y - 7 - hop, 4, 4, b.col); R(c, b.x + 6, b.y - 6 - hop, 2, 1, '#f0a030'); R(c, b.x - 2, b.y - hop, 1, 2, '#333'); }
  // street life: food cart + busker spot + cars
  if (V(27 * TILE, 18.6 * TILE, 80)) drawCart(c, 27 * TILE, 18.6 * TILE, t);
  for (const n of A.notes) { c.globalAlpha = Math.min(1, n.life); c.fillStyle = '#f2cc68'; c.font = '14px sans-serif'; c.fillText(n.ch, n.x, n.y); c.globalAlpha = 1; }
  if (A.ball) { const B = A.ball; R(c, B.x - 4, B.y + 2, 8, 3, 'rgba(0,0,0,.25)'); R(c, B.x - 4, B.y - 4 - B.z, 8, 8, '#d8f040'); R(c, B.x - 2, B.y - 3 - B.z, 3, 2, '#fff'); }
}
function drawCart(c, x, y, t) {
  R(c, x, y + 18, 56, 4, 'rgba(8,10,24,.3)'); R(c, x, y - 10, 56, 28, '#8e2430'); R(c, x, y - 10, 56, 3, '#d4a640');
  for (let i = 0; i < 7; i++) R(c, x - 4 + i * 9, y - 26, 9, 8, i % 2 ? '#f6efe0' : '#d4a640'); R(c, x + 2, y - 18, 3, 10, '#6a4428'); R(c, x + 51, y - 18, 3, 10, '#6a4428');
  R(c, x + 6, y - 4, 44, 9, '#121a36'); c.fillStyle = '#f2cc68'; c.font = '7px Silkscreen, monospace'; c.textAlign = 'left'; c.fillText('TAIYAKI', x + 10, y + 2);
  for (const wx of [x + 8, x + 40]) { R(c, wx, y + 14, 9, 9, '#1a1420'); R(c, wx + 3, y + 17, 3, 3, '#d4a640'); }
  if (Math.sin(t * 2) > 0) R(c, x + 20, y - 34 - (t * 10 % 8), 3, 3, 'rgba(255,255,255,.6)');
}
// traffic as depth-sortable drawables (y = ground contact)
export const carProps = (A) => A.cars.map((car) => ({ y: car.y, car: true, d: (c) => drawCar(c, car.x, car.y, car) }));
export function drawSkyLife(c, A, phase, view = null) {
  const t = A.t, V = (x, y, m = 40) => !view || inView(x, y, view, m);
  for (const b of A.birds) if ((b.state === 'fly' || b.state === 'return') && V(b.x, b.y - b.z, 60)) { const w = Math.sin(t * 20) > 0 ? 3 : -2; R(c, b.x - 3, b.y + 4, 6, 2, 'rgba(0,0,0,.18)'); R(c, b.x - 5, b.y - b.z + w, 4, 2, b.col); R(c, b.x + 1, b.y - b.z + w, 4, 2, b.col); R(c, b.x - 1, b.y - b.z, 3, 3, b.col); }
  for (const f of A.flyers) { if (!V(f.x, f.y, 90)) continue; const w = Math.sin(t * 9 + f.i) > 0 ? 3 : -3; R(c, f.x + 30, f.y + 70, 8, 3, 'rgba(10,14,30,.2)'); R(c, f.x - 7, f.y + w, 6, 2, '#2a2430'); R(c, f.x + 1, f.y + w, 6, 2, '#2a2430'); R(c, f.x - 1, f.y, 3, 3, '#2a2430'); }
  for (const b of A.butterflies) { if (!V(b.hx, b.hy)) continue; const x = b.hx + Math.sin(t * 1.3 + b.p) * 18, y = b.hy - 10 + Math.sin(t * 2.1 + b.p * 2) * 8, w = Math.sin(t * 16 + b.p) > 0 ? 3 : 1; R(c, x - w, y, w, 3, b.col); R(c, x + 1, y, w, 3, b.col); R(c, x, y, 1, 3, '#222'); }
  if (phase.dark > 0.3) { c.globalCompositeOperation = 'lighter'; for (const f of A.fireflies) { if (!V(f.x, f.y, 30)) continue; const a = (Math.sin(t * 2 + f.p * 3) + 1) / 2 * phase.dark; const x = f.x + Math.sin(t * .5 + f.p) * 20, y = f.y + Math.cos(t * .4 + f.p) * 14; c.fillStyle = `rgba(200,255,120,${a * .35})`; c.fillRect(x - 3, y - 3, 7, 7); c.fillStyle = `rgba(240,255,170,${a})`; c.fillRect(x, y, 2, 2); }
    for (const L of LAMPS) if (V(L.x, L.y)) for (let k = 0; k < 3; k++) { const a = t * 3 + k * 2.1 + L.x, x = L.x + Math.cos(a) * 9, y = L.y + Math.sin(a * 1.3) * 6; c.fillStyle = 'rgba(255,240,200,.8)'; c.fillRect(x, y, 2, 2); }
    c.globalCompositeOperation = 'source-over'; }
}
// Screen-space overlay: colour grade (multiply) with additive light pools, then weather.
const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
export function gradeFor(phase, rain = 0) {
  let g = [255, 255, 255];
  if (phase.dark > 0) g = mix(g, [52, 62, 128], Math.min(1, phase.dark / 0.62));
  const warm = phase.label === 'sunset' || phase.label === 'dawn' ? phase.tint[3] : 0; // night's tint is cool, not a sunset glow
  if (warm > 0) g = mix(g, [255, 168, 120], Math.min(1, warm * 1.6));
  if (rain > 0) g = mix(g, [168, 182, 214], rain * 0.6);
  return g;
}
export function drawAtmosphere(c, A, phase, cam, vw, vh, lightsArg) {
  let lights = lightsArg; if (typeof lights === 'function') lights = phase.dark / 0.62 > 0.15 ? lights() : []; // lazy: the light list is only built when it is dark enough to use it
  const ox = Math.round(vw / 2 - cam.x), oy = Math.round(vh / 2 - cam.y), g = gradeFor(phase, A.rain), night = Math.min(1, phase.dark / 0.62);
  if (g.some((v) => v < 254)) {
    if (!A.lcv) A.lcv = document.createElement('canvas');
    const L = A.lcv; if (L.width !== vw || L.height !== vh) { L.width = vw; L.height = vh; }
    const x = L.getContext('2d'); x.globalCompositeOperation = 'source-over'; x.fillStyle = `rgb(${g})`; x.fillRect(0, 0, vw, vh);
    if (night > 0.15) { x.globalCompositeOperation = 'lighter';
      for (const l of lights) { const lx = l.x + ox, ly = (l.gy ?? l.y) + oy; if (lx < -l.r || ly < -l.r || lx > vw + l.r || ly > vh + l.r) continue;
        const gr = x.createRadialGradient(lx, ly, 0, lx, ly, l.r); gr.addColorStop(0, `rgba(255,196,124,${0.52 * night})`); gr.addColorStop(0.55, `rgba(150,100,60,${0.16 * night})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = gr; x.beginPath(); x.ellipse(lx, ly, l.r, l.r * (l.flat ?? 0.6), 0, 0, 7); x.fill(); } }
    c.save(); c.globalCompositeOperation = 'multiply'; c.drawImage(L, 0, 0); c.restore();
    if (night > 0.15) { c.save(); c.globalCompositeOperation = 'lighter';
      for (const l of lights) if (l.glow) { const lx = l.x + ox, ly = l.y + oy; if (lx < -60 || ly < -60 || lx > vw + 60 || ly > vh + 60) continue; const r = l.core || 26;
        const gr = c.createRadialGradient(lx, ly, 0, lx, ly, r); gr.addColorStop(0, `rgba(255,220,140,${0.42 * night})`); gr.addColorStop(1, 'rgba(255,170,80,0)'); c.fillStyle = gr; c.fillRect(lx - r, ly - r, r * 2, r * 2); }
      c.restore(); }
    if (phase.tint[3] > 0 && phase.label !== 'night') { const gr = c.createLinearGradient(0, 0, 0, vh); gr.addColorStop(0, `rgba(255,150,90,${phase.tint[3] * 0.5})`); gr.addColorStop(1, 'rgba(255,120,80,0)'); c.save(); c.globalCompositeOperation = 'soft-light'; c.fillStyle = gr; c.fillRect(0, 0, vw, vh); c.restore(); }
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
  const L = LAMPS.map((l) => ({ x: l.x, y: l.y, gy: l.gy, r: 72, glow: true, core: 18 }));
  for (const b of [...BUILDINGS, ...MALL_BUILDINGS, ...NPC_HOMES]) { // lit doorway pool + window glows
    L.push({ x: (b.x + b.w / 2) * TILE, y: (b.y + b.h - 0.8) * TILE, gy: (b.y + b.h + 0.6) * TILE, r: 64, glow: true, core: 24, flat: 0.5 });
    for (let k = 1; k < b.w; k += 3) L.push({ x: (b.x + k + 0.5) * TILE, y: (b.y + b.h - 2.6) * TILE, r: 26, glow: true, core: 14, flat: 0.8 }); }
  L.push(...luxuryLights(), ...doorLights());
  for (const b of [MARKET, CRAFT]) for (const fx of [0.05, 0.95]) L.push({ x: (b.x + b.w * fx) * TILE, y: b.y * TILE + 18, gy: (b.y + b.h) * TILE, r: 60, glow: true, core: 14, flat: 0.6 });
  for (const b of [...LOTS, BARN, CHAPEL]) L.push({ x: (b.x + b.w / 2) * TILE, y: (b.y + b.h - 1) * TILE, gy: (b.y + b.h + 0.4) * TILE, r: 70, glow: true, core: 22, flat: 0.5 });
  for (const p of PLOTS) if (state.plots[p.id]) L.push({ x: (p.x + 3) * TILE, y: (p.y + 5) * TILE, gy: (p.y + 6.5) * TILE, r: playerHome === p.id ? 150 : 80, glow: true, core: 28 });
  return L;
}

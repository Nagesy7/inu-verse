// City 'alive' layer: tree species with per-tree wind sway, drifting leaves/petals, canopy birds, squirrels, butterflies,
// clouds + ground shadows, bird flocks, the occasional plane/blimp, park kites, bare-grass flowers/bushes and extra ducks.
// Budget: everything is culled to the view rect, particles are capped (CAPS), sprites are cached native-px canvases drawn
// at 3x, and prefers-reduced-motion turns off sway/particles/fly-overs (static scenery stays).
import { TILE, MAP_W, MAP_H, MAP, T } from './world.js';
export const CAPS = { leaves: 36, canopyBirds: 8, flockBirds: 7, kites: 3, clouds: 8, butterflies: 12, squirrels: 6, visibleDecor: 220 };
// one cached MediaQueryList (matchMedia() per call used to run for every visible tree every frame)
let MQ; const mq = () => (MQ === undefined ? (MQ = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)') || null) : MQ);
export const reducedMotion = () => !!(globalThis.__reducedMotion ?? mq()?.matches);
export const inView = (x, y, v, m = 0) => x > v.x0 - m && x < v.x1 + m && y > v.y0 - m && y < v.y1 + m;
export function capPush(arr, item, cap) { if (arr.length >= cap) return false; arr.push(item); return true; }
const hash = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 2246822519) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const tileAt = (x, y) => (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H ? -1 : MAP[y][x]);
const nearType = (x, y, t, r) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (tileAt(x + i, y + j) === t) return true; return false; };
export function treeSpecies(x, y) {
  if (nearType(x, y, T.WATER, 2) && hash(x, y, 9) < 0.55) return 'palm';
  const sak = (x < 29 && y < 11) || (y > 33 && y < 42 && x < 30) || (x > 33 && y > 33 && y < 41) ? hash(x, y, 5) < 0.75 : hash(x, y, 5) < 0.12; // original sakura zones
  if (sak) return 'blossom';
  if (y >= 76 && hash(x, y, 11) < 0.5) return 'autumn';
  if ((y < 14 && x > 40) || hash(x, y, 13) < 0.3) return 'pine';
  return 'round';
}
// ---------------- sprites (lazy, browser only) ----------------
const PALS = { round: ['#1e4f30', '#2c7040', '#3f9450', '#62b862', '#a3e07a'], blossom: ['#a8456a', '#d86a92', '#f095b4', '#ffc8dc', '#fff0f6'], autumn: ['#7a2e14', '#b8501e', '#e07a2a', '#f2a83a', '#ffd88a'], pine: ['#123a2a', '#1c5236', '#2a6e44', '#3f8a52', '#7cc07a'], palm: ['#1f5a2a', '#2f7a34', '#4a9a3e', '#7cc456', '#bfe88a'] };
const INK = '#141a2e', BARK = ['#4a2e1c', '#6a4428', '#8c5e38'];
const SPR = {}; const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
function treeSprites(kind) { if (SPR[kind]) return SPR[kind]; const L = PALS[kind], P = (c, x, y, col, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  const [tr, t] = mk(32, 44), [cn, c] = mk(32, 34); const blob = (cx, cy, r, col) => { for (let yy = -r; yy <= r; yy++) { const hw = Math.round(Math.sqrt(r * r - yy * yy)); P(c, cx - hw, cy + yy, col, hw * 2 + 1, 1); } };
  if (kind === 'palm') { for (let y = 14; y < 44; y++) { const x = 14 + Math.round(Math.sin(y / 9) * 2); P(t, x - 1, y, INK, 5); P(t, x, y, BARK[1], 3); if (y % 3 === 0) P(t, x, y, BARK[2], 3); } P(t, 12, 42, BARK[0], 8, 2);
    for (const [a, len] of [[-2.6, 14], [-1.9, 15], [-1.2, 15], [-0.5, 14], [0.2, 12], [2.9, 12]]) for (let s = 0; s < len; s++) { const x = 16 + Math.cos(a) * s, y = 14 + Math.sin(a) * s * 0.7 + (s * s) / 30; P(c, x - 1, y - 1, INK, 4, 3); }
    for (const [a, len] of [[-2.6, 14], [-1.9, 15], [-1.2, 15], [-0.5, 14], [0.2, 12], [2.9, 12]]) for (let s = 0; s < len; s++) { const x = 16 + Math.cos(a) * s, y = 14 + Math.sin(a) * s * 0.7 + (s * s) / 30; P(c, x, y, s % 3 ? L[2] : L[1], 2, 1); P(c, x, y - 1, L[3]); }
    P(c, 14, 13, '#6a4a28', 3, 3); P(c, 17, 14, '#6a4a28', 2, 2); }
  else if (kind === 'pine') { P(t, 14, 30, BARK[0], 4, 12); P(t, 15, 30, BARK[1], 2, 12); P(t, 12, 41, BARK[0], 8, 2);
    for (const [y0, hw] of [[2, 5], [9, 9], [17, 12], [24, 14]]) for (let r = 0; r < 9; r++) { const w = Math.round(hw * (r + 2) / 10); P(c, 16 - w - 1, y0 + r, INK, w * 2 + 2); P(c, 16 - w, y0 + r, r > 5 ? L[0] : L[1], w * 2); P(c, 16 - w, y0 + r, L[2], Math.max(1, w - 1)); if (r % 3 === 1) P(c, 16 - w + 1, y0 + r, L[3], Math.max(1, (w / 2) | 0)); }
    P(c, 15, 1, L[4], 2, 2); }
  else { P(t, 13, 30, BARK[0], 6, 12); P(t, 14, 30, BARK[1], 4, 12); P(t, 14, 30, BARK[2], 1, 12); P(t, 11, 40, BARK[0], 3, 2); P(t, 18, 40, BARK[0], 3, 2);
    const B = [[16, 15, 13], [8, 19, 8], [24, 19, 8], [16, 24, 9]]; for (const [x, y, r] of B) blob(x, y, r + 1, INK); for (const [x, y, r] of B) blob(x, y, r, L[0]);
    for (const [x, y, r] of [[15, 14, 11], [8, 18, 6], [23, 18, 6], [16, 22, 7]]) blob(x, y, r, L[1]); for (const [x, y, r] of [[14, 12, 8], [8, 17, 4], [21, 15, 5]]) blob(x, y, r, L[2]);
    for (const [x, y, r] of [[12, 9, 4], [20, 12, 3], [7, 16, 2]]) blob(x, y, r, L[3]); for (const [x, y] of [[10, 7], [11, 6], [13, 7], [19, 11], [6, 15]]) P(c, x, y, L[4]);
    if (kind === 'blossom') for (let i = 0; i < 10; i++) P(c, 5 + (hash(i, 1, 3) * 22 | 0), 5 + (hash(i, 2, 3) * 20 | 0), '#fff6fa');
    if (kind === 'autumn') for (let i = 0; i < 8; i++) P(c, 5 + (hash(i, 1, 4) * 22 | 0), 6 + (hash(i, 2, 4) * 20 | 0), '#c83a1e'); }
  return (SPR[kind] = { trunk: tr, canopy: cn }); }
function deco(kind) { const k = 'd' + kind; if (SPR[k]) return SPR[k]; const P = (c, x, y, col, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  const [cv, c] = mk(12, 10);
  if (kind.startsWith('bush')) { const berry = { bushR: '#e0405a', bushY: '#ffd84a', bush: null }[kind]; P(c, 1, 3, INK, 10, 7); P(c, 2, 2, INK, 8, 1); P(c, 2, 3, '#2c7040', 8, 6); P(c, 3, 3, '#3f9450', 5, 3); P(c, 4, 3, '#62b862', 2, 1); if (berry) for (const [x, y] of [[3, 6], [7, 5], [5, 7], [8, 7]]) P(c, x, y, berry); }
  else { const col = { fR: '#ff6f8a', fY: '#ffd84a', fW: '#f6efe0', fB: '#8ab8ff' }[kind]; for (const [x, y] of [[2, 5], [6, 3], [9, 6]]) { P(c, x, y + 1, '#2f7a34', 1, 3); P(c, x - 1, y, col, 3, 1); P(c, x, y - 1, col); P(c, x, y + 1, col); P(c, x, y, '#ffe9a0'); } }
  return (SPR[k] = cv); }
// ---------------- state ----------------
// ---------------- wind (shared by trees, awnings and flags) ----------------
// The global breeze (ALIVE.wind, a slow wander) plus gusts that roll west -> east across the map, so a row of trees,
// shop awnings and flags lean one after another instead of in lock-step. Pure: x in world px, t in seconds.
export function windAt(x, t = ALIVE.t, w = ALIVE.wind) { return w * (0.7 + 0.45 * Math.max(0, Math.sin(t * 0.55 - x * 0.0035))); }
// horizontal sway (world px, or a fraction when amp is a fraction) for something at world x with its own phase; 0 under reduced motion
export function swayAt(x, ph, amp, freq = 1.6, t = ALIVE.t, rm = ALIVE.rm) { return rm ? 0 : Math.sin(t * freq + ph) * windAt(x, t) * amp; }
// fluttering awning valance: a row of scalloped tabs hanging under an awning's bottom edge (x,y), alternating colA/colB every
// `stripe` px. Each tab drifts and lifts with the wind at its own phase; at rest (or reduced motion) it is the classic scallop row.
export function drawAwningFlap(c, x, y, w, stripe, colA, colB, seed = 0) { const rm = ALIVE.rm;
  for (let i = 0, k = 0; i < w; i += stripe, k++) { const s = rm ? 0 : swayAt(x + i, seed + k * 0.7, 1.4, 3.1), dx = Math.round(s), lift = Math.max(0, Math.round(s * 0.8)), tw = Math.min(stripe - 2, w - i - 1);
    if (tw <= 0) break; c.fillStyle = k % 2 ? colB : colA; c.fillRect(x + i + 1 + dx, y, tw, 3 - Math.min(1, lift)); c.fillStyle = INK; c.fillRect(x + i + 2 + dx, y + 3 - Math.min(1, lift), Math.max(1, tw - 2), 1); } }
// pennant cloth offset for a flag whose pole is at world x: returns [dx at the tip, dy at the tip]
export function flagWave(x, t = ALIVE.t) { if (ALIVE.rm) return [0, 0]; const w = windAt(x, t); return [Math.round(Math.sin(t * 4.2 + x * 0.05) * w * 1.5), Math.round(Math.sin(t * 3.1 + x * 0.03) * w * 1.6)]; }
export const ALIVE = { t: 0, wind: 1, rm: false, trees: [], decor: [], leaves: [], cbirds: [], flock: null, fly: null, flyT: 40, clouds: [], kites: [], bfly: [], squirrels: [], ducks: [] };
export function makeAlive(seed = 3) { const A = ALIVE; A.trees = []; A.decor = [];
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) { const v = MAP[y][x];
    if (v === T.TREE) A.trees.push({ x, y, kind: treeSpecies(x, y), ph: hash(x, y, 21) * 6.28, amp: 0.6 + hash(x, y, 22) * 0.6 });
    else if (v === T.GRASS && !nearType(x, y, T.ROAD, 1) && !nearType(x, y, T.BUILDING, 1) && !nearType(x, y, T.HOME, 1) && hash(x, y, seed) < 0.16) {
      const r = hash(x, y, seed + 1), kind = r < 0.22 ? 'bush' : r < 0.32 ? 'bushR' : r < 0.4 ? 'bushY' : ['fR', 'fY', 'fW', 'fB'][(r * 40 | 0) % 4];
      A.decor.push({ x: (x + 0.2 + hash(x, y, 7) * 0.6) * TILE, y: (y + 0.3 + hash(x, y, 8) * 0.5) * TILE, kind }); } }
  A.clouds = Array.from({ length: CAPS.clouds }, (_, i) => ({ x: hash(i, 1, 30) * MAP_W * TILE, y: hash(i, 2, 30) * MAP_H * TILE, s: 0.7 + hash(i, 3, 30) * 0.8 }));
  A.kites = [[14, 84, '#e0405a'], [22, 86, '#3a7ae0'], [28, 83, '#f2c84a']].slice(0, CAPS.kites).map(([x, y, col], i) => ({ ax: x * TILE, ay: y * TILE, col, ph: i * 2.1 }));
  A.ducks = [[6, 97, 10, 5, 3], [37, 35, 9, 4, 4]].flatMap(([x, y, w, h, n], j) => Array.from({ length: n }, (_, i) => ({ cx: (x + w / 2) * TILE, cy: (y + h / 2) * TILE, rx: (w / 2 - 1.2) * TILE, ry: (h / 2 - 1) * TILE, a: j * 2 + (i ? -0.18 * i : 0), s: 0.12 + 0.02 * j, kid: i > 0 && j === 1 })));
  A.leaves.length = 0; A.cbirds.length = 0; A.bfly.length = 0; A.squirrels.length = 0; A.flock = null; A.fly = null; return A; }
const visTrees = (A, v) => A.trees.filter((t) => inView((t.x + 0.5) * TILE, (t.y + 1) * TILE, v, 60));
// ---------------- step ----------------
export function stepAlive(A, dt, v, rng = Math.random, sprint = null) { A.t += dt; const RM = (A.rm = reducedMotion()); A.wind = 0.8 + Math.sin(A.t * 0.13) * 0.35 + Math.sin(A.t * 0.71) * 0.15;
  for (const c of A.clouds) { c.x += (RM ? 2 : 10) * A.wind * dt; if (c.x > MAP_W * TILE + 300) c.x = -300; }
  for (const d of A.ducks) d.a += d.s * dt * (RM ? 0.3 : 1);
  if (RM) { A.leaves.length = 0; A.cbirds.length = 0; A.flock = null; A.fly = null; A.bfly.length = 0; A.squirrels.length = 0; return A; }
  const vt = visTrees(A, v);
  // leaves / petals from visible deciduous trees
  for (const t of vt) if (t.kind !== 'pine' && t.kind !== 'palm' && rng() < dt * (t.kind === 'autumn' ? 0.5 : 0.12) * A.wind)
    capPush(A.leaves, { x: (t.x + 0.5) * TILE + (rng() - 0.5) * 60, y: (t.y + 1) * TILE - 90 + rng() * 40, z: 0, gy: (t.y + 1) * TILE + rng() * 30, vx: 8 + rng() * 10, ph: rng() * 6, col: PALS[t.kind][2 + (rng() * 2 | 0)] }, CAPS.leaves);
  for (const l of A.leaves) { if (l.y < l.gy) { l.y += 14 * dt; l.x += (l.vx * A.wind + Math.sin(A.t * 3 + l.ph) * 14) * dt; } else l.z += dt; }
  A.leaves = A.leaves.filter((l) => l.z < 2.5 && inView(l.x, l.y, v, 120));
  // canopy birds: pop out of a visible leafy tree, hop on top, fly to another, dive back in
  if (vt.length > 1 && rng() < dt * 0.8) { const a = vt[(rng() * vt.length) | 0]; if (a.kind !== 'palm') capPush(A.cbirds, { tree: a, st: 'perch', t: 1.5 + rng() * 3, x: (a.x + 0.5) * TILE + (rng() - 0.5) * 30, y: (a.y + 1) * TILE - 118, col: ['#7a5a3a', '#4a5a7a', '#c86a4a', '#e0c040'][(rng() * 4) | 0] }, CAPS.canopyBirds); }
  for (const b of A.cbirds) { b.t -= dt; if (b.st === 'perch' && b.t < 0) { const to = vt[(rng() * vt.length) | 0] || b.tree; b.st = 'fly'; b.fx = b.x; b.fy = b.y; b.tx = (to.x + 0.5) * TILE; b.ty = (to.y + 1) * TILE - 110; b.k = 0; }
    if (b.st === 'fly') { b.k += dt / Math.max(0.6, Math.hypot(b.tx - b.fx, b.ty - b.fy) / 160); const k = Math.min(1, b.k); b.x = b.fx + (b.tx - b.fx) * k; b.y = b.fy + (b.ty - b.fy) * k - Math.sin(k * Math.PI) * 40; if (k >= 1) { b.st = 'in'; b.t = 0.3; } } }
  if (sprint) for (const b of A.cbirds) if (b.st === 'perch' && Math.hypot(b.x - sprint.x, b.y + 90 - sprint.y) < 170) { // sprinting under a tree startles its birds: they fly off away from you to another tree
    const away = vt.filter((t) => Math.sign((t.x + 0.5) * TILE - sprint.x) === Math.sign(b.x - sprint.x || 1) && Math.hypot((t.x + 0.5) * TILE - sprint.x, (t.y + 1) * TILE - sprint.y) > 200), to = away[(rng() * away.length) | 0];
    b.st = 'fly'; b.fx = b.x; b.fy = b.y; b.k = 0; b.spooked = true; if (to) { b.tx = (to.x + 0.5) * TILE; b.ty = (to.y + 1) * TILE - 110; } else { b.tx = b.x + Math.sign(b.x - sprint.x || 1) * 260; b.ty = b.y - 120; } }
  A.cbirds = A.cbirds.filter((b) => !(b.st === 'in' && b.t < 0) && inView(b.x, b.y, v, 200));
  // squirrels scurry between visible trees (and up the trunk)
  if (vt.length > 1 && rng() < dt * 0.3) { const a = vt[(rng() * vt.length) | 0], b = vt[(rng() * vt.length) | 0]; if (a !== b && Math.hypot(a.x - b.x, a.y - b.y) < 6) capPush(A.squirrels, { fx: (a.x + 0.5) * TILE, fy: (a.y + 1) * TILE + 4, tx: (b.x + 0.5) * TILE, ty: (b.y + 1) * TILE + 4, k: 0, climb: 0 }, CAPS.squirrels); }
  for (const s of A.squirrels) { if (s.k < 1) s.k += dt / Math.max(1, Math.hypot(s.tx - s.fx, s.ty - s.fy) / 70); else s.climb += dt; }
  A.squirrels = A.squirrels.filter((s) => s.climb < 1.6);
  // butterflies over visible flowers
  if (rng() < dt * 0.6) { const fl = A.decor.filter((d) => d.kind[0] === 'f' && inView(d.x, d.y, v)); if (fl.length) { const f = fl[(rng() * fl.length) | 0]; capPush(A.bfly, { hx: f.x, hy: f.y, life: 6 + rng() * 6, p: rng() * 9, col: ['#f6efe0', '#f2cc68', '#f08cb0', '#9fd0ff'][(rng() * 4) | 0] }, CAPS.butterflies); } }
  for (const b of A.bfly) b.life -= dt; A.bfly = A.bfly.filter((b) => b.life > 0 && inView(b.hx, b.hy, v, 80));
  // flock crossing the view; occasional plane or blimp
  if (!A.flock && rng() < dt / 20) A.flock = { x: v.x0 - 120, y: v.y0 + (v.y1 - v.y0) * (0.2 + rng() * 0.5), vx: 70, vy: (rng() - 0.5) * 12 };
  if (A.flock) { A.flock.x += A.flock.vx * dt; A.flock.y += A.flock.vy * dt; if (A.flock.x > v.x1 + 200) A.flock = null; }
  A.flyT -= dt; if (!A.fly && A.flyT < 0) { const blimp = rng() < 0.35; A.fly = { kind: blimp ? 'blimp' : 'plane', x: v.x1 + 160, y: v.y0 + (v.y1 - v.y0) * (0.15 + rng() * 0.3), vx: blimp ? -22 : -120 }; A.flyT = 60 + rng() * 60; }
  if (A.fly) { A.fly.x += A.fly.vx * dt; if (A.fly.x < v.x0 - 260) A.fly = null; }
  return A; }
// ---------------- draw ----------------
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
// depth-sorted tree prop (replaces the static tree sprite); sways with wind at its own phase
export function treeProp(x, y) { const t = ALIVE.trees.find((q) => q.x === x && q.y === y) || { x, y, kind: treeSpecies(x, y), ph: hash(x, y, 21) * 6.28, amp: 0.6 + hash(x, y, 22) * 0.6 };
  return { y: (y + 1) * TILE - 4, tree: t, d: (c) => { const S = treeSprites(t.kind), X = x * TILE + 16 - 48, Y = (y + 1) * TILE - 132 + 3;
    c.drawImage(S.trunk, X, Y, 96, 132);
    const sway = swayAt(x * TILE, t.ph, t.amp * (t.kind === 'pine' ? 0.025 : 0.04), t.kind === 'palm' ? 1.1 : 1.6);
    if (!sway) { c.drawImage(S.canopy, X, Y, 96, 102); return; }
    const W = S.canopy.width, H = S.canopy.height, k = H / 102, dx = sway * 96; for (const [a, b, f] of [[0, 34, 1], [34, 68, 0.55], [68, 102, 0]]) c.drawImage(S.canopy, 0, Math.round(a * k), W, Math.round((b - a) * k), X + Math.round(dx * f), Y + a, 96, b - a); } }; }
// extra palms on grass right at the water's edge (visual only, not solid)
export function extraTreeProps() { const out = []; for (let y = 1; y < MAP_H - 1; y++) for (let x = 1; x < MAP_W - 1; x++) if (MAP[y][x] === T.GRASS && nearType(x, y, T.WATER, 1) && !nearType(x, y, T.WALK, 1) && !nearType(x, y, T.ROAD, 1) && hash(x, y, 41) < 0.22) {
  const p = treeProp(x, y); p.tree.kind = 'palm'; out.push(p); } return out; }
const CLOUD = {}; function cloudSprite(col) { if (CLOUD[col]) return CLOUD[col]; const k = document.createElement('canvas'); k.width = 96; k.height = 48; const g = k.getContext('2d'); g.fillStyle = col; g.beginPath(); for (const [ox, oy, r] of [[0, 0, 90], [70, 10, 70], [-70, 14, 60], [20, -24, 60]]) g.ellipse(48 + ox * 0.3, 26 + oy * 0.3, r * 0.3, r * 0.18, 0, 0, 7); g.fill(); return (CLOUD[col] = k); }
const drawCloud = (c, col, x, y, s) => c.drawImage(cloudSprite(col), x - 160 * s, y - 86 * s, 320 * s, 160 * s);
export function drawAliveGround(c, A, v, phase) { let n = 0;
  for (const d of A.decor) { if (!inView(d.x, d.y, v, 20)) continue; if (++n > CAPS.visibleDecor) break; c.drawImage(deco(d.kind), d.x - 18, d.y - 15, 36, 30); }
  const dark = phase?.dark || 0; if (dark < 0.6) { c.globalAlpha = 0.13 * (1 - dark); for (const cl of A.clouds) { const sx = cl.x + 160, sy = cl.y + 220; if (!inView(sx, sy, v, 260)) continue; drawCloud(c, '#141e3c', sx, sy, cl.s); } c.globalAlpha = 1; }
  for (const s of A.squirrels) { const k = Math.min(1, s.k), x = s.fx + (s.tx - s.fx) * k, y = s.fy + (s.ty - s.fy) * k - s.climb * 50, f = s.tx > s.fx ? 1 : -1, hop = k < 1 ? Math.abs(Math.sin(A.t * 14)) * 3 : 0;
    R(c, x - 4, y - 6 - hop, 8, 6, '#b0602a'); R(c, x + (f > 0 ? 3 : -6), y - 9 - hop, 4, 4, '#b0602a'); R(c, x + (f > 0 ? -8 : 4), y - 14 - hop, 4, 10, '#c8783a'); R(c, x + (f > 0 ? -8 : 5), y - 15 - hop, 3, 3, '#e0a060'); }
  for (const k of A.ducks) { const x = k.cx + Math.cos(k.a) * k.rx, y = k.cy + Math.sin(k.a) * k.ry; if (!inView(x, y, v, 20)) continue; const f = Math.sin(k.a) * k.s > 0 ? -1 : 1, s = k.kid ? 0.6 : 1, bob = Math.sin(A.t * 3 + k.a) * 1;
    R(c, x - 9 * s, y + 3, 18 * s, 2, '#4a8fc0'); R(c, x - 7 * s, y - 4 * s + bob, 14 * s, 7 * s, k.kid ? '#f2d860' : '#a8784a'); R(c, x + f * 4 * s - 2, y - 9 * s + bob, 6 * s, 6 * s, k.kid ? '#f2d860' : '#5a3a22'); R(c, x + f * 8 * s - (f < 0 ? 3 : 0), y - 7 * s + bob, 3, 2, '#f0a030'); } }
export function drawAliveSky(c, A, v, phase) { const t = A.t;
  for (const l of A.leaves) { const flip = Math.sin(t * 6 + l.ph) > 0; c.globalAlpha = l.z ? Math.max(0, 1 - l.z / 2.5) : 1; R(c, l.x, l.y, flip ? 4 : 2, flip ? 2 : 3, l.col); } c.globalAlpha = 1;
  for (const b of A.cbirds) { const w = b.st === 'fly' ? (Math.sin(t * 22) > 0 ? 3 : -2) : 0, hop = b.st === 'perch' ? Math.max(0, Math.sin(t * 7 + b.x)) * 3 : 0;
    R(c, b.x - 4, b.y - 4 - hop, 8, 5, b.col); R(c, b.x + 2, b.y - 7 - hop, 4, 4, b.col); R(c, b.x + 6, b.y - 6 - hop, 2, 1, '#f0a030'); if (w) { R(c, b.x - 6, b.y - 6 + w, 5, 2, b.col); R(c, b.x + 1, b.y - 6 + w, 5, 2, b.col); } }
  for (const b of A.bfly) { const x = b.hx + Math.sin(t * 1.3 + b.p) * 18, y = b.hy - 12 + Math.sin(t * 2.1 + b.p * 2) * 8, w = Math.sin(t * 16 + b.p) > 0 ? 3 : 1; R(c, x - w, y, w, 3, b.col); R(c, x + 1, y, w, 3, b.col); R(c, x, y, 1, 3, '#222'); }
  for (const k of A.kites) { if (!inView(k.ax, k.ay, v, 200)) continue; const RM = reducedMotion(), kx = k.ax + 40 + (RM ? 0 : Math.sin(t * 0.9 + k.ph) * 16), ky = k.ay - 110 + (RM ? 0 : Math.sin(t * 1.7 + k.ph) * 8);
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(k.ax, k.ay); c.quadraticCurveTo(k.ax + 30, ky + 60, kx, ky + 10); c.stroke();
    c.fillStyle = INK; c.beginPath(); c.moveTo(kx, ky - 11); c.lineTo(kx + 9, ky); c.lineTo(kx, ky + 12); c.lineTo(kx - 9, ky); c.fill(); c.fillStyle = k.col; c.beginPath(); c.moveTo(kx, ky - 9); c.lineTo(kx + 7, ky); c.lineTo(kx, ky + 10); c.lineTo(kx - 7, ky); c.fill(); R(c, kx - 1, ky - 8, 2, 17, 'rgba(255,255,255,.5)');
    for (let i = 0; i < 4; i++) R(c, kx - 1 + Math.sin(t * 4 + i) * 3, ky + 12 + i * 5, 3, 2, i % 2 ? '#fff' : k.col); R(c, k.ax - 2, k.ay - 2, 4, 4, '#6a4428'); }
  if (A.flock) { const F = A.flock, w = Math.sin(t * 10) > 0 ? 2 : -2; for (let i = 0; i < CAPS.flockBirds; i++) { const k = i - 3, x = F.x - Math.abs(k) * 14, y = F.y + k * 10; R(c, x - 4, y + w, 4, 2, '#2a2430'); R(c, x + 1, y + w, 4, 2, '#2a2430'); R(c, x - 1, y, 3, 2, '#2a2430'); } }
  if (A.fly) { const P = A.fly; c.fillStyle = 'rgba(10,14,30,.16)'; c.beginPath(); c.ellipse(P.x + 90, P.y + 160, P.kind === 'blimp' ? 50 : 26, P.kind === 'blimp' ? 16 : 8, 0, 0, 7); c.fill();
    if (P.kind === 'blimp') { c.fillStyle = INK; c.beginPath(); c.ellipse(P.x, P.y, 46, 16, 0, 0, 7); c.fill(); c.fillStyle = '#e8e2d6'; c.beginPath(); c.ellipse(P.x, P.y - 1, 44, 14, 0, 0, 7); c.fill(); R(c, P.x - 30, P.y - 3, 60, 6, '#d4a640'); c.fillStyle = INK; c.font = '7px Silkscreen, monospace'; c.textAlign = 'center'; c.fillText('INU VERSE', P.x, P.y + 2); R(c, P.x - 8, P.y + 14, 16, 5, '#6a6080'); R(c, P.x + 40, P.y - 10, 8, 20, '#b8323a'); }
    else { R(c, P.x - 18, P.y - 3, 36, 6, '#f2efe6'); R(c, P.x - 18, P.y + 1, 36, 2, '#c8c2b6'); R(c, P.x - 4, P.y - 16, 8, 32, '#e8e2d6'); R(c, P.x + 14, P.y - 8, 4, 16, '#e8e2d6'); R(c, P.x - 20, P.y - 2, 3, 4, '#5ab8f0'); R(c, P.x + 16, P.y - 4, 3, 2, '#e0405a');
      c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(Math.round(P.x + 20), Math.round(P.y - 1), 60, 2); } }
  const dark = phase?.dark || 0; if (dark < 0.8) for (const cl of A.clouds) { if (!inView(cl.x, cl.y, v, 200)) continue; c.globalAlpha = 0.28 * (1 - dark); drawCloud(c, '#ffffff', cl.x, cl.y, cl.s); c.globalAlpha = 1; } }

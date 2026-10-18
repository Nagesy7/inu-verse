// Mobility (Round 1): A* tap-to-walk, smooth accel/decel, run/sprint, input arbitration. Headless + unit tested.
// Coordinates: tiles for pathfinding, world px for motion. Rendering stays pixel-snapped in main.js (camera + actors on one grid).
export const WALK_SPEED = 92;      // world px/s (unchanged feel from before)
export const RUN_MULT = 1.75;      // sprint speed = 161 px/s
export const ACCEL = 900;          // px/s² -> 0 to walk speed in ~0.10s
export const DECEL = 1400;         // px/s² -> walk speed to stop in ~0.066s (snappy, no slide)
export const STICK_RUN = 0.92;     // stick pushed to the edge = run
export const DOUBLE_TAP_MS = 320;

// ---- A* on the tile grid: 8-way, no corner cutting, octile heuristic, binary heap ----
export function astar(sx, sy, tx, ty, solid, { w, h, maxNodes = 20000 } = {}) {
  if (sx === tx && sy === ty) return [[sx, sy]];
  if (solid(tx, ty)) { const alt = nearestOpen(tx, ty, solid, sx, sy); if (!alt) return null; [tx, ty] = alt; }
  const K = (x, y) => y * w + x, g = new Map(), prev = new Map(), closed = new Set(), heap = [];
  const H = (x, y) => { const dx = Math.abs(x - tx), dy = Math.abs(y - ty); return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy); };
  const push = (n) => { heap.push(n); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  g.set(K(sx, sy), 0); push([H(sx, sy), sx, sy]); let n = 0;
  while (heap.length && n++ < maxNodes) {
    const [, x, y] = pop(), k = K(x, y); if (closed.has(k)) continue; closed.add(k);
    if (x === tx && y === ty) { const out = []; let c = k; while (c !== undefined) { out.push([c % w, Math.floor(c / w)]); c = prev.get(c); } return out.reverse(); }
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || solid(nx, ny)) continue;
      if (dx && dy && (solid(x + dx, y) || solid(x, y + dy))) continue; // no squeezing past corners
      const nk = K(nx, ny), ng = g.get(k) + (dx && dy ? Math.SQRT2 : 1); if (ng >= (g.get(nk) ?? Infinity)) continue;
      g.set(nk, ng); prev.set(nk, k); push([ng + H(nx, ny), nx, ny]); } }
  return null;
}
// closest walkable tile to a solid target (ring search), tie-broken toward the walker
export function nearestOpen(tx, ty, solid, sx = tx, sy = ty, R = 3) {
  for (let r = 1; r <= R; r++) { let best = null, bd = Infinity;
    for (let y = ty - r; y <= ty + r; y++) for (let x = tx - r; x <= tx + r; x++) { if (Math.max(Math.abs(x - tx), Math.abs(y - ty)) !== r || solid(x, y)) continue; const d = Math.hypot(x - sx, y - sy); if (d < bd) { bd = d; best = [x, y]; } }
    if (best) return best; }
  return null;
}
// Line of sight between tile centres (supercover walk, conservative at corners): used to string-pull the path into few straight legs.
export function lineClear(ax, ay, bx, by, solid) {
  let x = ax, y = ay; const dx = Math.abs(bx - ax), dy = Math.abs(by - ay), sx = Math.sign(bx - ax), sy = Math.sign(by - ay); let ix = 0, iy = 0;
  while (ix < dx || iy < dy) { const d = (0.5 + ix) / (dx || 1) - (0.5 + iy) / (dy || 1);
    if (dy === 0 || (dx && d < 0)) { x += sx; ix++; } else if (dx === 0 || d > 0) { y += sy; iy++; } else { if (solid(x + sx, y) || solid(x, y + sy)) return false; x += sx; y += sy; ix++; iy++; }
    if (solid(x, y)) return false; }
  return true;
}
// body-sized sweep (px): the walker's collision box (r) must stay clear along the whole leg, not just the centre line
export function segClear(a, b, solid, tile = 32, r = 7) { const ax = (a[0] + 0.5) * tile, ay = (a[1] + 0.5) * tile, bx = (b[0] + 0.5) * tile, by = (b[1] + 0.5) * tile, n = Math.ceil(Math.hypot(bx - ax, by - ay) / 4);
  for (let i = 0; i <= n; i++) { const x = ax + (bx - ax) * i / n, y = ay + (by - ay) * i / n;
    for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r * 0.6], [r, r * 0.6]]) if (solid(Math.floor((x + ox) / tile), Math.floor((y + oy) / tile))) return false; }
  return true; }
export function smoothPath(path, solid, tile = 32) { if (!path || path.length < 3) return path; const out = [path[0]]; let a = 0;
  while (a < path.length - 1) { let b = path.length - 1; while (b > a + 1 && !(lineClear(path[a][0], path[a][1], path[b][0], path[b][1], solid) && segClear(path[a], path[b], solid, tile))) b--; out.push(path[b]); a = b; }
  return out; }

// ---- velocity: accelerate toward desired velocity, decelerate faster; diagonal input normalised ----
export function normInput(dx, dy) { const l = Math.hypot(dx, dy); return l > 1 ? { x: dx / l, y: dy / l } : { x: dx, y: dy }; }
export function stepVelocity(v, want, dt, { accel = ACCEL, decel = DECEL } = {}) {
  const ex = want.x - v.x, ey = want.y - v.y, e = Math.hypot(ex, ey); if (e < 1e-6) return { x: want.x, y: want.y };
  const wl = Math.hypot(want.x, want.y), vl = Math.hypot(v.x, v.y), slowing = wl < vl - 1e-6 || (want.x * v.x + want.y * v.y) < 0;
  const step = (slowing ? decel : accel) * dt; if (step >= e) return { x: want.x, y: want.y };
  return { x: v.x + (ex / e) * step, y: v.y + (ey / e) * step };
}

// ---- input arbitration: keys / stick always win and cancel path-walking ----
export function pickInput({ keys = { x: 0, y: 0 }, stick = { x: 0, y: 0 }, stickMag = 0, shift = false, holdRun = false, path = false, pathRun = false }) {
  if (stick.x || stick.y) { const d = normInput(stick.x, stick.y); return { source: 'stick', dir: d, run: stickMag >= STICK_RUN || holdRun, cancelPath: true }; }
  if (keys.x || keys.y) return { source: 'keys', dir: normInput(keys.x, keys.y), run: shift, cancelPath: true };
  if (path) return { source: 'path', dir: null, run: pathRun || shift, cancelPath: false };
  return { source: 'none', dir: { x: 0, y: 0 }, run: false, cancelPath: false };
}
// double-tap detector (stick double-tap-hold => run; ground double-tap => run to the spot)
export function makeTapper(ms = DOUBLE_TAP_MS) { let last = -1e9; return (now) => { const dbl = now - last <= ms; last = dbl ? -1e9 : now; return dbl; }; }

// ---- path follower: steers along waypoints with arrival easing; reports stuck so the caller can re-plan ----
export function makePathWalker() { return { pts: [], goal: null, run: false, stuckT: 0, replans: 0, lastD: Infinity }; }
export function followStep(pw, pos, speed, dt, tile) {
  if (!pw.pts.length) return null;
  const [tx, ty] = pw.pts[0], gx = (tx + 0.5) * tile, gy = (ty + 0.5) * tile, dx = gx - pos.x, dy = gy - pos.y, d = Math.hypot(dx, dy);
  const last = pw.pts.length === 1, reach = last ? 1.5 : Math.max(4, speed * dt * 1.5);
  if (d <= reach) { pw.pts.shift(); pw.stuckT = 0; pw.lastD = Infinity; return pw.pts.length ? followStep(pw, pos, speed, dt, tile) : { arrive: true, want: { x: 0, y: 0 }, snap: last ? { x: gx, y: gy } : null }; }
  if (d < pw.lastD - 0.25) { pw.lastD = d; pw.stuckT = 0; } else pw.stuckT += dt;
  const s = last ? Math.min(speed, d * 8) : speed; // ease into the final tile, no overshoot wobble
  return { want: { x: (dx / d) * s, y: (dy / d) * s }, stuck: pw.stuckT > 0.45 };
}
// face from a velocity, with hysteresis so near-diagonal motion does not flicker left/up/left
export function faceOf(vx, vy, prev = 'down') { const ax = Math.abs(vx), ay = Math.abs(vy); if (ax < 1 && ay < 1) return prev;
  const horiz = prev === 'left' || prev === 'right'; if (horiz ? ax * 1.25 >= ay : ax > ay * 1.25) return vx > 0 ? 'right' : 'left'; return vy > 0 ? 'down' : 'up'; }

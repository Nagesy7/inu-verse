// Hand-built 16px pixel tileset (original art), drawn at 2x with nearest-neighbour.
// Ground is pre-rendered once into a native-res canvas; props are tiny native sprites y-sorted with actors.
import { TILE, MAP_W, MAP_H, MAP, T, BRIDGES, ROADS, AVENUE, STATUE } from './world.js';

export const N = 16, SCALE = TILE / N; // native tile px, display zoom (2)
export const PAL = {
  ink: '#141a2e', g0: '#2f6e3a', g1: '#3f8a40', g2: '#52a349', g3: '#6cbd55', g4: '#9bdc6e',
  sand: '#ead9a0', sandD: '#c9b278', w0: '#24539a', w1: '#2f6cbd', w2: '#4b8fe0', w3: '#8cc6f4', foam: '#e8f7ff',
  road: '#474b5c', roadL: '#545a6c', roadD: '#3b3e4d', roadW: '#5b6072', oil: '#2e303b', line: '#f0f0ea', yel: '#f2c84a',
  walk: '#dcd3bc', walkL: '#efe8d4', walkD: '#b5aa90', curb: '#a9a3b8', curbD: '#6e6884',
  brick: '#d6b383', brickL: '#ead0a4', brickD: '#a8845a', mortar: '#b8966a',
  dirt: '#a8764a', dirtD: '#835a36', dirtL: '#c09062',
  bark: '#6a4428', barkD: '#4a2e1c', barkL: '#8c5e38',
  leaf0: '#1e4f30', leaf1: '#2c7040', leaf2: '#3f9450', leaf3: '#62b862', leaf4: '#a3e07a',
  pink0: '#a8456a', pink1: '#d86a92', pink2: '#f095b4', pink3: '#ffc8dc',
  wood: '#9a6a3c', woodL: '#c08a52', woodD: '#5e3c22', iron: '#2c3350', ironL: '#4a5478', gold: '#e3b341', goldL: '#ffe08a', glass: '#fff3c0',
  shadow: 'rgba(16,24,48,0.32)',
};
const hash = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 2246822519) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const P = (c, x, y, col, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
const mk = (w, h) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; return [cv, c]; };
const isBridge = (x, y) => BRIDGES.some((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
const at = (x, y) => (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H ? T.TREE : isBridge(x, y) ? T.WATER : MAP[y][x]);
const PAVED = new Set([T.ROAD, T.WALK, T.PLAZA]);
const GREEN = (t) => t === T.GRASS || t === T.FLOWER || t === T.TREE || t === T.HOME || t === T.PLOT;

function grass(c, px, py, x, y) {
  P(c, px, py, PAL.g2, N, N);
  for (let i = 0; i < 16; i++) { const r = hash(x, y, i), q = hash(y, x, i + 40); P(c, px + (r * N | 0), py + (q * N | 0), r < 0.5 ? PAL.g1 : PAL.g3); }
  if (hash(x >> 2, y >> 2, 9) < 0.35) for (let i = 0; i < 10; i++) P(c, px + (hash(x, y, i + 90) * 15 | 0), py + (hash(x, y, i + 120) * 15 | 0), PAL.g3, 2, 1); // lighter meadow patches
  const tufts = hash(x, y, 7) < 0.55 ? 1 + (hash(x, y, 8) * 2 | 0) : 0;
  for (let i = 0; i < tufts; i++) { const tx = px + 2 + (hash(x, y, 20 + i) * 11 | 0), ty = py + 3 + (hash(x, y, 30 + i) * 10 | 0);
    P(c, tx, ty + 2, PAL.g0, 5, 1); P(c, tx, ty, PAL.g4); P(c, tx + 2, ty - 1, PAL.g4); P(c, tx + 4, ty, PAL.g4); P(c, tx + 1, ty + 1, PAL.g3); P(c, tx + 3, ty + 1, PAL.g3); P(c, tx + 2, ty, PAL.g3, 1, 2); }
}
function flowers(c, px, py, x, y) {
  const cols = [['#fff6ea', '#f2cc68'], ['#ffd84a', '#c9763a'], ['#ff8fb6', '#fff1b8'], ['#9fc8ff', '#fff6ea'], ['#ff6a5a', '#ffd84a']];
  const n = 2 + (hash(x, y, 3) * 3 | 0);
  for (let i = 0; i < n; i++) { const fx = px + 2 + (hash(x, y, 50 + i) * 11 | 0), fy = py + 2 + (hash(x, y, 60 + i) * 11 | 0), [pc, cc] = cols[(hash(x, y, 70 + i) * cols.length) | 0];
    P(c, fx, fy + 3, PAL.g0, 3, 1); P(c, fx + 1, fy + 2, PAL.g1); P(c, fx + 1, fy - 1, pc); P(c, fx, fy, pc); P(c, fx + 2, fy, pc); P(c, fx + 1, fy + 1, pc); P(c, fx + 1, fy, cc); }
}
function road(c, px, py, x, y) { // asphalt: base + speckle + soft wear patches + occasional crack / oil stain
  P(c, px, py, PAL.road, N, N);
  if (hash(x >> 1, y >> 1, 41) < 0.3) for (let i = 0; i < 14; i++) P(c, px + (hash(x, y, i + 200) * 13 | 0), py + (hash(x, y, i + 230) * 14 | 0), PAL.roadW, 3, 2); // worn lighter patch
  for (let i = 0; i < 22; i++) P(c, px + (hash(x, y, i) * N | 0), py + (hash(y, x, i) * N | 0), hash(x, y, i + 9) < 0.5 ? PAL.roadL : PAL.roadD);
  const h = hash(x, y, 77);
  if (h < 0.06) { const ox = px + 3 + (hash(x, y, 78) * 6 | 0), oy = py + 4 + (hash(x, y, 79) * 6 | 0); P(c, ox, oy, PAL.roadD, 3, 1); P(c, ox + 3, oy + 1, PAL.roadD, 2, 1); P(c, ox + 5, oy + 2, PAL.roadD, 1, 2); P(c, ox + 1, oy - 1, PAL.roadD); }
  else if (h < 0.1) { const ox = px + 4 + (hash(x, y, 80) * 5 | 0), oy = py + 5 + (hash(x, y, 81) * 5 | 0); P(c, ox, oy + 1, PAL.oil, 6, 2); P(c, ox + 1, oy, PAL.oil, 4, 4); P(c, ox + 2, oy + 1, '#3a3550', 1, 1); }
}
function walk(c, px, py, x, y) {
  P(c, px, py, PAL.walk, N, N);
  for (const [sx, sy] of [[0, 0], [8, 0], [0, 8], [8, 8]]) { const ox = px + sx, oy = py + sy; P(c, ox, oy, PAL.walkL, 7, 1); P(c, ox, oy, PAL.walkL, 1, 7); P(c, ox + 7, oy, PAL.walkD, 1, 8); P(c, ox, oy + 7, PAL.walkD, 8, 1); if (hash(x * 2 + sx, y * 2 + sy) < 0.2) P(c, ox + 3, oy + 3, PAL.walkD, 2, 1); }
}
function plaza(c, px, py, x, y) {
  P(c, px, py, PAL.mortar, N, N);
  for (let r = 0; r < 4; r++) for (let k = -1; k < 3; k++) { const bx = px + k * 6 + (r % 2 ? 3 : 0), by = py + r * 4; const x0 = Math.max(px, bx), x1 = Math.min(px + N, bx + 5); if (x1 <= x0) continue;
    const t = hash(x * 4 + k, y * 4 + r); P(c, x0, by, t < 0.3 ? PAL.brickD : t > 0.8 ? PAL.brickL : PAL.brick, x1 - x0, 3); P(c, x0, by, PAL.brickL, x1 - x0, 1); }
  if ((x + y) % 6 === 0 && hash(x, y, 5) < 0.5) { P(c, px + 6, py + 6, PAL.gold, 4, 4); P(c, px + 7, py + 7, PAL.goldL, 2, 1); P(c, px + 6, py + 9, '#9c7424', 4, 1); }
}
function plot(c, px, py, x, y) { P(c, px, py, PAL.dirt, N, N); for (let r = 1; r < N; r += 4) { P(c, px, py + r, PAL.dirtD, N, 1); P(c, px, py + r + 1, PAL.dirtL, N, 1); } for (let i = 0; i < 4; i++) P(c, px + (hash(x, y, i) * 15 | 0), py + (hash(y, x, i) * 15 | 0), PAL.dirtD); }
function water(c, px, py, x, y) { P(c, px, py, PAL.w1, N, N); for (let i = 0; i < 6; i++) P(c, px + (hash(x, y, i) * 14 | 0), py + (hash(y, x, i) * 15 | 0), PAL.w0, 3, 1); }

// edges/autotile overlays per tile, using 4 + diagonal neighbours
function edges(c, px, py, x, y) {
  const t = at(x, y), n = at(x, y - 1), s = at(x, y + 1), w = at(x - 1, y), e = at(x + 1, y);
  if (t === T.WATER) { // shoreline: sand lip + foam line; inner corners
    const dry = (q) => q !== T.WATER, sd = [[dry(n), 0, 0, N, 3, 0, 3, N, 1], [dry(s), 0, N - 3, N, 3, 0, N - 4, N, 1], [dry(w), 0, 0, 3, N, 3, 0, 1, N], [dry(e), N - 3, 0, 3, N, N - 4, 0, 1, N]];
    for (const [on, ax, ay, aw, ah, fx, fy, fw, fh] of sd) if (on) { P(c, px + ax, py + ay, PAL.sand, aw, ah); P(c, px + fx, py + fy, PAL.foam, fw, fh); }
    if (dry(n)) P(c, px, py + 2, PAL.sandD, N, 1); if (dry(w)) P(c, px + 2, py, PAL.sandD, 1, N);
    if (dry(n)) { P(c, px, py + 4, PAL.w0, N, 2); } // shadow of bank on water
    for (const [dx, dy, cx, cy] of [[-1, -1, 0, 0], [1, -1, N - 3, 0], [-1, 1, 0, N - 3], [1, 1, N - 3, N - 3]]) if (dry(at(x + dx, y + dy)) && !dry(at(x + dx, y)) && !dry(at(x, y + dy))) { P(c, px + cx, py + cy, PAL.sand, 3, 3); P(c, px + cx + (dx < 0 ? 3 : -1), py + cy + (dy < 0 ? 3 : -1), PAL.foam); }
    for (const [dx, dy, cx, cy] of [[-1, -1, 0, 0], [1, -1, N - 1, 0], [-1, 1, 0, N - 1], [1, 1, N - 1, N - 1]]) if (dry(at(x + dx, y)) && dry(at(x, y + dy))) P(c, px + cx, py + cy, PAL.g2); // round outer corner
    return;
  }
  if (PAVED.has(t)) {
    // grass fringe spilling over paved edges (darker outline + tuft pixels)
    const fr = (q) => GREEN(q) || q === T.BUILDING && false;
    if (fr(n)) { P(c, px, py, PAL.g1, N, 1); P(c, px, py + 1, 'rgba(20,40,20,.25)', N, 1); for (let i = 0; i < N; i += 3) if (hash(x * 16 + i, y, 1) < 0.6) P(c, px + i, py + 1, PAL.g2); }
    if (fr(s)) { P(c, px, py + N - 1, PAL.g0, N, 1); for (let i = 1; i < N; i += 3) if (hash(x * 16 + i, y, 2) < 0.6) P(c, px + i, py + N - 2, PAL.g2); }
    if (fr(w)) { P(c, px, py, PAL.g1, 1, N); for (let i = 0; i < N; i += 3) if (hash(x, y * 16 + i, 3) < 0.6) P(c, px + 1, py + i, PAL.g2); }
    if (fr(e)) { P(c, px + N - 1, py, PAL.g0, 1, N); for (let i = 1; i < N; i += 3) if (hash(x, y * 16 + i, 4) < 0.6) P(c, px + N - 2, py + i, PAL.g2); }
    if (fr(n) && fr(w)) P(c, px, py, PAL.g2, 2, 2); if (fr(n) && fr(e)) P(c, px + N - 2, py, PAL.g2, 2, 2);
    if (fr(s) && fr(w)) P(c, px, py + N - 2, PAL.g2, 2, 2); if (fr(s) && fr(e)) P(c, px + N - 2, py + N - 2, PAL.g2, 2, 2);
  }
  if (t === T.WALK && !isBridge(x, y)) { // raised curb lip where sidewalk meets road (lit top, face, shadow on the road)
    const R = (q) => q === T.ROAD;
    if (R(s)) { P(c, px, py + N - 3, PAL.walkL, N, 1); P(c, px, py + N - 2, PAL.curb, N, 1); P(c, px, py + N - 1, PAL.curbD, N, 1); }
    if (R(n)) { P(c, px, py, PAL.curbD, N, 1); P(c, px, py + 1, PAL.curb, N, 1); P(c, px, py + 2, PAL.walkL, N, 1); }
    if (R(w)) { P(c, px, py, PAL.curbD, 1, N); P(c, px + 1, py, PAL.curb, 1, N); P(c, px + 2, py, PAL.walkL, 1, N); }
    if (R(e)) { P(c, px + N - 3, py, PAL.walkL, 1, N); P(c, px + N - 2, py, PAL.curb, 1, N); P(c, px + N - 1, py, PAL.curbD, 1, N); }
    // rounded corners: sidewalk tile with road on two orthogonal sides gets a quarter-circle curb
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { if (!R(at(x + sx, y)) || !R(at(x, y + sy))) continue;
      const cx = sx > 0 ? px : px + N, cy = sy > 0 ? py : py + N, r = N - 2; // circle centre in the far corner
      for (let yy = 0; yy < N; yy++) for (let xx = 0; xx < N; xx++) { const d = Math.hypot(px + xx + 0.5 - cx, py + yy + 0.5 - cy);
        if (d > r + 0.5) P(c, px + xx, py + yy, PAL.road, 1, 1); else if (d > r - 0.5) P(c, px + xx, py + yy, sy > 0 ? PAL.curbD : PAL.curb); else if (d > r - 1.5) P(c, px + xx, py + yy, sy > 0 ? PAL.curb : PAL.walkL); } }
  }
  if (t === T.ROAD) { // shadow cast by the raised curb onto the road
    if (n === T.WALK && !isBridge(x, y - 1)) P(c, px, py, 'rgba(14,14,30,.4)', N, 2);
    if (w === T.WALK) P(c, px, py, 'rgba(14,14,30,.3)', 2, N); if (e === T.WALK) P(c, px + N - 1, py, 'rgba(14,14,30,.18)', 1, N);
  }
  if (t === T.PLAZA && (n === T.WALK || n === T.ROAD)) P(c, px, py, PAL.brickD, N, 1);
}

// ---- road furniture painted into the ground: lines, crossings, stop lines, drains, manholes, mall roundabout ----
const isAve = (x) => x >= AVENUE && x < AVENUE + 3, isStreet = (y) => ROADS.some((r) => y >= r && y < r + 3);
function grate(c, x, y, w, h) { P(c, x, y, PAL.ink, w, h); for (let i = 1; i < w - 1; i += 2) P(c, x + i, y + 1, '#5d6274', 1, h - 2); P(c, x, y, '#6e7386', w, 1); }
function manhole(c, cx, cy) { for (let yy = -3; yy <= 3; yy++) { const hw = Math.round(Math.sqrt(12.25 - yy * yy)); P(c, cx - hw, cy + yy, PAL.ink, hw * 2, 1); if (Math.abs(yy) < 3) P(c, cx - hw + 1, cy + yy, yy % 2 ? '#5a5f70' : '#6a7082', hw * 2 - 2, 1); } P(c, cx - 1, cy - 3, '#80869a', 2, 1); }
function roadMarkings(c) {
  const W = PAL.line, X0 = AVENUE * N, X1 = (AVENUE + 3) * N;
  for (const r of ROADS) { const y0 = r * N, y1 = (r + 3) * N, mid = y0 + 24;
    for (let x = 1; x < MAP_W - 1; x++) { if (at(x, r) !== T.ROAD || (x >= AVENUE - 2 && x <= AVENUE + 4)) continue; const px = x * N;
      P(c, px, y0 + 3, W, N, 1); P(c, px, y1 - 4, W, N, 1); // crisp white edge lines
      P(c, px + 4, mid - 1, W, 8, 2); // dashed white centre
      if (x % 7 === 3) { grate(c, px + 5, y0 + 1, 6, 3); grate(c, px + 5, y1 - 3, 6, 3); } // drain grates at the curb
      if (x % 11 === 6) manhole(c, px + 8, y0 + 12 + (x % 2) * 24); }
    // zebra crossings either side of the avenue + stop lines before them (right-hand traffic)
    for (const zx of [AVENUE - 2, AVENUE + 4]) for (let i = 0; i < 11; i++) P(c, zx * N + 2, y0 + 3 + i * 4, '#f4f2ea', 12, 2);
    P(c, (AVENUE - 2) * N - 3, mid, W, 2, 24); P(c, (AVENUE + 5) * N + 1, y0, W, 2, 24);
  }
  for (let y = 6; y < 45; y++) { if (at(AVENUE, y) !== T.ROAD || isStreet(y) || isStreet(y - 1) || isStreet(y + 1)) continue; const py = y * N;
    P(c, X0 + 3, py, W, 1, N); P(c, X1 - 4, py, W, 1, N); // edge lines
    P(c, X0 + 22, py, PAL.yel, 1, N); P(c, X0 + 25, py, PAL.yel, 1, N); // double yellow centre on the avenue
    if (y % 6 === 2) { grate(c, X0 + 1, py + 5, 3, 6); grate(c, X1 - 3, py + 5, 3, 6); }
    if (y % 9 === 4) manhole(c, X0 + 12 + (y % 2) * 24, py + 8); }
  for (const r of ROADS) { if (at(AVENUE, r - 2) !== T.ROAD) continue; // avenue zebras + stop lines at each junction
    for (const zy of [r - 1, r + 3]) { if (at(AVENUE, zy) !== T.ROAD) continue; for (let i = 0; i < 11; i++) P(c, X0 + 3 + i * 4, zy * N + 2, '#f4f2ea', 2, 12); }
    P(c, X0, (r - 2) * N + N - 3, W, 24, 2); if (at(AVENUE, r + 4) === T.ROAD) P(c, X0 + 24, (r + 4) * N + 1, W, 24, 2); }
  // Kibble Mall roundabout plaza: paved ring of gold mosaic around the statue
  const cx = (STATUE.x + 1) * N, cy = STATUE.y * N + 10;
  for (let yy = -44; yy <= 44; yy++) for (let xx = -44; xx <= 44; xx++) { const d = Math.hypot(xx, yy), tx = Math.floor((cx + xx) / N), ty = Math.floor((cy + yy) / N);
    if (d > 44 || at(tx, ty) !== T.PLAZA) continue;
    const col = d > 42 ? PAL.brickD : d > 39 ? (Math.floor(Math.atan2(yy, xx) * 12) % 2 ? PAL.gold : PAL.goldL) : d > 37 ? PAL.brickD : d > 20 ? ((Math.floor(d / 4) + Math.floor((Math.atan2(yy, xx) + 4) * 6)) % 2 ? '#e6dcc4' : '#d2c6a8') : d > 18 ? PAL.brickD : '#7cbf5a';
    P(c, cx + xx, cy + yy, col); }
}

// soft pixel drop shadow (ellipse) at native res
export function shadowEllipse(c, cx, cy, rx, ry, a = 0.28) {
  c.fillStyle = `rgba(16,24,48,${a})`;
  for (let yy = -ry; yy <= ry; yy++) { const hw = Math.round(rx * Math.sqrt(1 - (yy / (ry + 0.5)) ** 2)); c.fillRect(Math.round(cx - hw), Math.round(cy + yy), hw * 2, 1); }
}

export function buildGround(extra) {
  const [cv, c] = mk(MAP_W * N, MAP_H * N);
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const t = MAP[y][x], px = x * N, py = y * N;
    if (t === T.ROAD) road(c, px, py, x, y); else if (t === T.WALK) (isBridge(x, y) ? water : walk)(c, px, py, x, y); else if (t === T.PLAZA) plaza(c, px, py, x, y);
    else if (t === T.WATER) water(c, px, py, x, y); else if (t === T.PLOT) plot(c, px, py, x, y);
    else if (t === T.BUILDING) { let yy = y; while (at(x, yy) === T.BUILDING) yy++; (PAVED.has(at(x, yy)) ? plaza : grass)(c, px, py, x, y); }
    else { grass(c, px, py, x, y); if (t === T.FLOWER) flowers(c, px, py, x, y); }
  }
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) edges(c, x * N, y * N, x, y);
  for (const b of BRIDGES) { // wooden plank bridges with rails + shadow on the water
    const x0 = b.x * N, y0 = b.y * N - 3, w = b.w * N, h = b.h * N + 6;
    P(c, x0 + 1, y0 + 2, 'rgba(10,20,50,.35)', w + 2, h);
    P(c, x0, y0, PAL.ink, w, h); for (let yy = 1; yy < h - 1; yy += 3) { P(c, x0 + 2, y0 + yy, yy % 2 ? PAL.woodL : PAL.wood, w - 4, 2); P(c, x0 + 2, y0 + yy + 2, PAL.woodD, w - 4, 1); }
    P(c, x0, y0, PAL.woodD, 2, h); P(c, x0 + w - 2, y0, PAL.woodD, 2, h); P(c, x0, y0, PAL.woodL, 1, h);
    for (let yy = 0; yy < h; yy += 8) { P(c, x0 - 1, y0 + yy, PAL.ink, 3, 3); P(c, x0 + w - 2, y0 + yy, PAL.ink, 3, 3); }
  }
  roadMarkings(c);
  if (extra) extra(c);
  return cv;
}

// animated water overlay: ripples + sparkles on visible water tiles (native coords, caller scales)
export function drawWater(c, t, x0, y0, x1, y1) {
  for (let y = Math.max(0, y0); y < Math.min(MAP_H, y1); y++) for (let x = Math.max(0, x0); x < Math.min(MAP_W, x1); x++) {
    if (MAP[y][x] !== T.WATER && !isBridge(x, y)) continue;
    const px = x * N, py = y * N, ph = t * 1.6 + hash(x, y, 11) * 6.28;
    for (let k = 0; k < 2; k++) { const wx = px + 2 + ((hash(x, y, k + 3) * 9 + Math.sin(ph + k * 2) * 2) | 0), wy = py + 5 + k * 5 + (Math.sin(ph * 0.7 + k) > 0 ? 0 : 1);
      if (wy > py + 3 && wy < py + 13) { P(c, wx, wy, PAL.w2, 4, 1); P(c, wx + 1, wy - 1, PAL.w3, 2, 1); } }
    const sp = (t * 2 + hash(x, y, 13) * 10) % 10; if (sp < 0.6 && hash(x, y, 14) < 0.5) { const sx = px + 3 + (hash(x, y, 15) * 9 | 0), sy = py + 4 + (hash(x, y, 16) * 8 | 0); P(c, sx, sy, '#ffffff'); if (sp < 0.3) { P(c, sx - 1, sy, PAL.w3); P(c, sx + 1, sy, PAL.w3); P(c, sx, sy - 1, PAL.w3); P(c, sx, sy + 1, PAL.w3); } }
  }
}

// ---------- prop sprites (native px) ----------
const SPR = {};
function tree(kind) {
  const [cv, c] = mk(32, 44), L = kind === 'sakura' ? [PAL.pink0, PAL.pink1, PAL.pink2, PAL.pink3, '#fff0f6'] : [PAL.leaf0, PAL.leaf1, PAL.leaf2, PAL.leaf3, PAL.leaf4];
  // trunk with roots
  P(c, 13, 30, PAL.barkD, 6, 12); P(c, 14, 30, PAL.bark, 4, 12); P(c, 14, 30, PAL.barkL, 1, 12); P(c, 11, 40, PAL.barkD, 3, 2); P(c, 18, 40, PAL.barkD, 3, 2); P(c, 16, 34, PAL.barkD, 1, 2);
  const blob = (cx, cy, r, col) => { for (let yy = -r; yy <= r; yy++) { const hw = Math.round(Math.sqrt(r * r - yy * yy)); P(c, cx - hw, cy + yy, col, hw * 2 + 1, 1); } };
  // outline, then layered canopy dark->light from bottom-right to top-left
  for (const [x, y, r] of [[16, 16, 14], [8, 20, 8], [24, 20, 8], [16, 26, 9]]) blob(x, y, r + 1, PAL.ink);
  for (const [x, y, r] of [[16, 16, 14], [8, 20, 8], [24, 20, 8], [16, 26, 9]]) blob(x, y, r, L[0]);
  for (const [x, y, r] of [[15, 15, 12], [8, 19, 6], [23, 19, 6], [16, 23, 7]]) blob(x, y, r, L[1]);
  for (const [x, y, r] of [[14, 13, 9], [8, 18, 4], [21, 16, 5]]) blob(x, y, r, L[2]);
  for (const [x, y, r] of [[12, 10, 5], [20, 13, 3], [7, 17, 2]]) blob(x, y, r, L[3]);
  for (const [x, y] of [[10, 8], [11, 7], [13, 8], [19, 12], [6, 16]]) P(c, x, y, L[4]);
  for (let i = 0; i < 18; i++) { const x = 4 + (hash(i, kind.length, 1) * 24 | 0), y = 6 + (hash(i, 3, 2) * 22 | 0); if (c.getImageData(x, y, 1, 1).data[3]) P(c, x, y, hash(i, 5) < 0.5 ? L[0] : L[3]); } // leaf texture
  if (kind === 'sakura') for (const [x, y] of [[6, 30], [22, 31], [26, 28]]) P(c, x, y, PAL.pink2);
  return cv;
}
function lamp() { const [cv, c] = mk(12, 34);
  P(c, 3, 30, PAL.iron, 6, 3); P(c, 4, 29, PAL.ironL, 4, 1); P(c, 5, 8, PAL.iron, 2, 22); P(c, 5, 8, PAL.ironL, 1, 22);
  P(c, 1, 2, PAL.iron, 10, 7); P(c, 2, 3, PAL.glass, 8, 5); P(c, 2, 3, '#ffffff', 2, 2); P(c, 5, 3, PAL.iron, 2, 5); P(c, 0, 1, PAL.gold, 12, 2); P(c, 4, 0, PAL.goldL, 4, 1); P(c, 1, 9, PAL.gold, 10, 1); return cv; }
function bench() { const [cv, c] = mk(28, 14);
  P(c, 1, 0, PAL.woodD, 26, 5); P(c, 1, 0, PAL.wood, 26, 2); P(c, 1, 3, PAL.woodL, 26, 1); P(c, 0, 6, PAL.woodD, 28, 4); P(c, 0, 6, PAL.woodL, 28, 2);
  for (const x of [2, 24]) { P(c, x, 10, PAL.iron, 2, 4); P(c, x, 4, PAL.iron, 2, 3); } return cv; }
function sign() { const [cv, c] = mk(16, 20);
  P(c, 7, 8, PAL.woodD, 2, 12); P(c, 7, 8, PAL.wood, 1, 12); P(c, 1, 1, PAL.ink, 14, 9); P(c, 2, 2, PAL.woodL, 12, 7); P(c, 2, 2, '#e0aa6a', 12, 1); P(c, 2, 8, PAL.wood, 12, 1);
  for (let i = 0; i < 3; i++) P(c, 4, 4 + i * 2, PAL.woodD, 4 + (i * 3) % 7, 1); return cv; }
function crate() { const [cv, c] = mk(14, 14);
  P(c, 0, 0, PAL.ink, 14, 14); P(c, 1, 1, PAL.wood, 12, 12); P(c, 1, 1, PAL.woodL, 12, 2); P(c, 1, 1, PAL.woodL, 2, 12); P(c, 11, 1, PAL.woodD, 2, 12); P(c, 1, 11, PAL.woodD, 12, 2);
  for (let i = 0; i < 9; i++) P(c, 3 + i, 3 + i, PAL.woodD); P(c, 1, 6, PAL.woodD, 12, 1); return cv; }
function bush(flower) { const [cv, c] = mk(18, 14);
  const blob = (cx, cy, r, col) => { for (let yy = -r; yy <= r; yy++) { const hw = Math.round(Math.sqrt(r * r - yy * yy)); P(c, cx - hw, cy + yy, col, hw * 2 + 1, 1); } };
  for (const [x, y, r] of [[5, 8, 5], [12, 8, 5], [9, 6, 5]]) blob(x, y, r + 1, PAL.ink);
  for (const [x, y, r] of [[5, 8, 5], [12, 8, 5], [9, 6, 5]]) blob(x, y, r, PAL.leaf1);
  for (const [x, y, r] of [[5, 7, 3], [11, 6, 3], [8, 4, 2]]) blob(x, y, r, PAL.leaf2); P(c, 7, 3, PAL.leaf4, 2, 1); P(c, 4, 5, PAL.leaf3, 2, 1);
  if (flower) for (const [x, y] of [[4, 6], [10, 4], [13, 8], [7, 9]]) { P(c, x, y, flower); P(c, x + 1, y, '#fff6ea'); }
  return cv; }
function hedge() { const [cv, c] = mk(16, 14);
  P(c, 0, 2, PAL.ink, 16, 12); P(c, 0, 3, PAL.leaf1, 16, 10); P(c, 0, 3, PAL.leaf2, 16, 4); P(c, 0, 3, PAL.leaf3, 16, 1);
  for (let i = 0; i < 16; i += 4) { P(c, i + 1, 2, PAL.leaf2, 2, 1); P(c, i + 2, 5, PAL.leaf4); P(c, i, 10, PAL.leaf0, 3, 1); } P(c, 0, 12, PAL.leaf0, 16, 1); return cv; }
function fence() { const [cv, c] = mk(16, 12);
  for (const x of [1, 13]) { P(c, x, 0, PAL.ink, 3, 12); P(c, x + 1, 1, '#f4ecd8', 1, 10); }
  P(c, 0, 3, PAL.ink, 16, 3); P(c, 0, 4, '#f4ecd8', 16, 1); P(c, 0, 7, PAL.ink, 16, 3); P(c, 0, 8, '#e0d6bc', 16, 1); return cv; }
function mailbox() { const [cv, c] = mk(10, 18);
  P(c, 4, 8, PAL.woodD, 2, 10); P(c, 0, 1, PAL.ink, 10, 8); P(c, 1, 2, '#c8323c', 8, 6); P(c, 1, 2, '#e85a5a', 8, 1); P(c, 1, 7, '#8e1a20', 8, 1); P(c, 2, 0, PAL.ink, 6, 1); return cv; }
function rail() { const [cv, c] = mk(16, 4); P(c, 0, 0, PAL.ink, 16, 4); P(c, 0, 1, PAL.woodL, 16, 1); P(c, 0, 2, PAL.wood, 16, 1); for (const x of [0, 8]) P(c, x, 0, PAL.woodD, 2, 4); return cv; }
function streetTree() { const [cv, c] = mk(20, 40); // young tree in a stone planter box
  const blob = (cx, cy, r, col) => { for (let yy = -r; yy <= r; yy++) { const hw = Math.round(Math.sqrt(r * r - yy * yy)); P(c, cx - hw, cy + yy, col, hw * 2 + 1, 1); } };
  P(c, 9, 18, PAL.barkD, 3, 14); P(c, 10, 18, PAL.bark, 1, 14);
  blob(10, 11, 10, PAL.ink); blob(10, 11, 9, PAL.leaf1); blob(9, 9, 7, PAL.leaf2); blob(8, 7, 4, PAL.leaf3); P(c, 6, 4, PAL.leaf4, 2, 1); P(c, 13, 14, PAL.leaf0, 3, 1);
  P(c, 1, 30, PAL.ink, 18, 10); P(c, 2, 31, '#b9b3c6', 16, 8); P(c, 2, 31, '#d8d3e2', 16, 1); P(c, 2, 37, PAL.curbD, 16, 2); P(c, 4, 31, PAL.dirtD, 12, 2); P(c, 5, 31, PAL.dirt, 3, 1);
  return cv; }
function trafficLight(lit) { const [cv, c] = mk(10, 36); // lit: 0 red, 1 amber, 2 green
  P(c, 3, 33, PAL.iron, 5, 3); P(c, 4, 10, PAL.iron, 2, 24); P(c, 4, 10, PAL.ironL, 1, 24);
  P(c, 1, 0, PAL.ink, 8, 12); P(c, 2, 1, '#2a2f44', 6, 10);
  [['#ff4a3a', '#5a1e1e'], ['#ffc23a', '#5a4a1e'], ['#5ef08a', '#1e4a2c']].forEach(([on, off], i) => P(c, 3, 2 + i * 3, i === lit ? on : off, 4, 2));
  return cv; }
export function sprites() {
  if (!SPR.tree) Object.assign(SPR, { tree: tree('green'), sakura: tree('sakura'), lamp: lamp(), bench: bench(), sign: sign(), crate: crate(), bush: bush(null), bushP: bush('#ff8fb6'), bushY: bush('#ffd84a'), hedge: hedge(), fence: fence(), mailbox: mailbox(), rail: rail(), streetTree: streetTree(), light0: trafficLight(0), light1: trafficLight(1), light2: trafficLight(2) });
  return SPR;
}
export { hash, mk, P };

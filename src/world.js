export const TILE = 32, MAP_W = 64, MAP_H = 42;
export const T = { GRASS: 0, ROAD: 1, WALK: 2, BUILDING: 3, WATER: 4, TREE: 5, PLOT: 6, FLOWER: 7, PLAZA: 8, HOME: 9 };
const SOLID = new Set([T.BUILDING, T.WATER, T.TREE, T.PLOT, T.HOME]);

export const BUILDINGS = [
  { id: 'cafe', name: 'Shiba Sips Café', x: 3, y: 12, w: 8, h: 6 },
  { id: 'shop', name: 'Paws & Pillows', x: 13, y: 12, w: 9, h: 6 },
  { id: 'launch', name: 'Launch Hall', x: 35, y: 11, w: 12, h: 7 },
  { id: 'cars', name: 'Zoomies Motors', x: 50, y: 12, w: 10, h: 6 },
];
export const PLOT_COST = 300;
export const PLOTS = [2, 9, 16, 23, 35, 42, 49, 56].map((x, i) => ({ id: 'p' + (i + 1), x, y: 24, w: 6, h: 6 }));
export const NPC_HOMES = [
  { id: 'h1', owner: 'Mochi', x: 2, y: 35, w: 6, h: 5 },
  { id: 'h2', owner: 'Kuro', x: 9, y: 35, w: 6, h: 5 },
  { id: 'h3', owner: 'Hana', x: 16, y: 35, w: 6, h: 5 },
  { id: 'h4', owner: 'Taro', x: 23, y: 35, w: 6, h: 5 },
];
export const STALL_SLOTS = Array.from({ length: 9 }, (_, i) => ({ x: 34 + i * 3, y: 7 }));

export function buildMap() {
  const g = Array.from({ length: MAP_H }, () => new Array(MAP_W).fill(T.GRASS));
  const fill = (x0, y0, w, h, t) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (g[y] && g[y][x] !== undefined) g[y][x] = t; };
  // decorative flowers (deterministic)
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (((x * 73856093) ^ (y * 19349663)) % 23 === 0) g[y][x] = T.FLOWER;
  fill(1, 19, MAP_W - 2, 1, T.WALK); fill(1, 20, MAP_W - 2, 2, T.ROAD); fill(1, 22, MAP_W - 2, 1, T.WALK);
  fill(1, 30, MAP_W - 2, 1, T.WALK); fill(1, 31, MAP_W - 2, 2, T.ROAD); fill(1, 33, MAP_W - 2, 1, T.WALK);
  fill(30, 6, 1, 35, T.WALK); fill(31, 6, 2, 35, T.ROAD); fill(33, 6, 1, 35, T.WALK);
  fill(33, 6, 29, 4, T.PLAZA);
  fill(5, 3, 9, 5, T.WATER);
  for (const b of BUILDINGS) { fill(b.x, b.y, b.w, b.h, T.BUILDING); fill(b.x - 1, b.y + b.h, b.w + 2, 1, T.PLAZA); }
  for (const p of PLOTS) fill(p.x, p.y, p.w, p.h, T.PLOT);
  for (const h of NPC_HOMES) fill(h.x, h.y, h.w, h.h, T.HOME);
  fill(37, 35, 18, 4, T.WATER);
  // trees: border + some park trees
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1) g[y][x] = T.TREE;
  for (const [x, y] of [[2, 2], [16, 3], [19, 5], [22, 2], [25, 7], [3, 9], [27, 3], [15, 9], [24, 13], [27, 15], [61, 14], [60, 24], [34, 38], [57, 36], [58, 39], [35, 35]])
    if (g[y][x] === T.GRASS || g[y][x] === T.FLOWER) g[y][x] = T.TREE;
  return g;
}

export const MAP = buildMap();
export const isSolid = (tx, ty) => tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H || SOLID.has(MAP[ty][tx]);

// Interaction points: tile player should stand on
export function interactables(state) {
  const list = [];
  for (const b of BUILDINGS) list.push({ kind: 'building', id: b.id, name: b.name, tx: b.x + Math.floor(b.w / 2), ty: b.y + b.h });
  for (const p of PLOTS) {
    const owned = !!state?.plots?.[p.id];
    list.push({ kind: 'plot', id: p.id, name: owned ? 'Your Home' : 'Plot for claim', tx: p.x + 3, ty: p.y - 1 });
  }
  for (const h of NPC_HOMES) list.push({ kind: 'visit', id: h.id, name: `${h.owner}'s Home`, tx: h.x + 3, ty: h.y - 1 });
  (state?.tokens || []).forEach((tok, i) => { const s = STALL_SLOTS[i % STALL_SLOTS.length]; list.push({ kind: 'stall', id: tok.id, name: `$${tok.ticker} stall`, tx: s.x + 1, ty: s.y + 2 }); });
  return list;
}

export function nearestInteractable(state, px, py, maxDist = 1.6) {
  let best = null, bd = maxDist;
  for (const it of interactables(state)) {
    const d = Math.hypot(px / TILE - (it.tx + 0.5), py / TILE - (it.ty + 0.5));
    if (d < bd) { bd = d; best = it; }
  }
  return best;
}

export function findPath(sx, sy, tx, ty) {
  if (isSolid(tx, ty)) return null;
  const key = (x, y) => y * MAP_W + x;
  const prev = new Map([[key(sx, sy), -1]]);
  const q = [[sx, sy]];
  let head = 0;
  while (head < q.length) {
    const [x, y] = q[head++];
    if (x === tx && y === ty) {
      const path = []; let k = key(x, y);
      while (k !== -1) { path.push([k % MAP_W, Math.floor(k / MAP_W)]); k = prev.get(k); }
      return path.reverse();
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, nk = key(nx, ny);
      if (!isSolid(nx, ny) && !prev.has(nk)) { prev.set(nk, key(x, y)); q.push([nx, ny]); }
    }
  }
  return null;
}

// Move a circle-ish body with axis-separated collision
export function moveBody(b, dx, dy, r = 10) {
  const blocked = (x, y) => isSolid(Math.floor((x - r) / TILE), Math.floor((y - r) / TILE)) || isSolid(Math.floor((x + r) / TILE), Math.floor((y - r) / TILE)) ||
    isSolid(Math.floor((x - r) / TILE), Math.floor((y + r * 0.6) / TILE)) || isSolid(Math.floor((x + r) / TILE), Math.floor((y + r * 0.6) / TILE));
  if (!blocked(b.x + dx, b.y)) b.x += dx;
  if (!blocked(b.x, b.y + dy)) b.y += dy;
}

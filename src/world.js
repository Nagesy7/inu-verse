export const TILE = 32, MAP_W = 64, MAP_H = 70;
export const T = { GRASS: 0, ROAD: 1, WALK: 2, BUILDING: 3, WATER: 4, TREE: 5, PLOT: 6, FLOWER: 7, PLAZA: 8, HOME: 9 };
const SOLID = new Set([T.BUILDING, T.WATER, T.TREE, T.PLOT, T.HOME]);

export const ROADS = [20, 31, 42], AVENUE = 31; // first row of each 3-row street; first column of the 3-col avenue
export const BUILDINGS = [
  { id: 'cafe', name: 'Shiba Sips Café', x: 3, y: 12, w: 8, h: 6 },
  { id: 'shop', name: 'Paws & Pillows', x: 13, y: 12, w: 9, h: 6 },
  { id: 'fashion', name: 'Fetch Fashion', x: 23, y: 12, w: 7, h: 6 },
  { id: 'launch', name: 'Launch Hall', x: 35, y: 11, w: 12, h: 7 },
  { id: 'cars', name: 'Zoomies Motors', x: 50, y: 12, w: 10, h: 6 },
];
// Kibble Mall district (south). Owned by President Inu. Stores open the Mall panel filtered by category.
export const MALL_BUILDINGS = [
  { id: 'mall', name: 'Kibble Mall', x: 25, y: 50, w: 14, h: 8, cat: 'all' },
  { id: 'jewel', name: 'Gilded Collar Jewelers', x: 10, y: 49, w: 8, h: 6, cat: 'jewelry' },
  { id: 'designer', name: 'Royal Paws Designer', x: 46, y: 49, w: 8, h: 6, cat: 'outfit' },
  { id: 'goldden', name: 'Golden Den Furniture', x: 10, y: 60, w: 8, h: 6, cat: 'furniture' },
  { id: 'luxauto', name: 'Zoomies Luxury Autos', x: 46, y: 60, w: 8, h: 6, cat: 'car' },
  { id: 'office', name: "President's Office", x: 27, y: 62, w: 10, h: 5, cat: 'office' },
];
export const STATUE = { x: 31, y: 59 };
export const LEADERS = { x: 18, y: 55, w: 6, h: 3 }; // Leaderboards Hall (art is drawn at an integer 2x to fill this footprint)
export const PLOT_COST = 300;
export const PLOTS = [2, 9, 16, 23, 35, 42, 49, 56].map((x, i) => ({ id: 'p' + (i + 1), x, y: 24, w: 6, h: 6 }));
export const NPC_HOMES = [
  { id: 'h1', owner: 'Mochi', x: 2, y: 35, w: 6, h: 5 },
  { id: 'h2', owner: 'Kuro', x: 9, y: 35, w: 6, h: 5 },
  { id: 'h3', owner: 'Hana', x: 16, y: 35, w: 6, h: 5 },
  { id: 'h4', owner: 'Taro', x: 23, y: 35, w: 6, h: 5 },
];
// Pack clubhouse lot (north of Market Row). Shows the clubhouse of the Pack you belong to.
export const CLUBHOUSE = { id: 'clubhouse', x: 47, y: 1, w: 9, h: 5 };
export const BRIDGES = [{ x: 9, y: 3, w: 2, h: 5 }, { x: 46, y: 35, w: 2, h: 4 }]; // walkable plank bridges over the ponds
export const STALL_SLOTS = Array.from({ length: 9 }, (_, i) => ({ x: 34 + i * 3, y: 7 }));

export function buildMap() {
  const g = Array.from({ length: MAP_H }, () => new Array(MAP_W).fill(T.GRASS));
  const fill = (x0, y0, w, h, t) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (g[y] && g[y][x] !== undefined) g[y][x] = t; };
  // decorative flowers (deterministic)
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (((x * 73856093) ^ (y * 19349663)) % 23 === 0) g[y][x] = T.FLOWER;
  // streets: 3-tile (96px) roads = two 1.5-tile lanes, sidewalks either side
  for (const r of ROADS) { fill(1, r - 1, MAP_W - 2, 1, T.WALK); fill(1, r, MAP_W - 2, 3, T.ROAD); fill(1, r + 3, MAP_W - 2, 1, T.WALK); }
  fill(AVENUE - 1, 6, 1, 40, T.WALK); fill(AVENUE, 6, 3, 39, T.ROAD); fill(AVENUE + 3, 6, 1, 40, T.WALK);
  fill(34, 6, 28, 4, T.PLAZA);
  fill(5, 3, 9, 5, T.WATER);
  for (const b of BUILDINGS) { fill(b.x, b.y, b.w, b.h, T.BUILDING); fill(b.x - 1, b.y + b.h, b.w + 2, 1, T.PLAZA); }
  for (const p of PLOTS) fill(p.x, p.y, p.w, p.h, T.PLOT);
  for (const h of NPC_HOMES) fill(h.x, h.y, h.w, h.h, T.HOME);
  fill(CLUBHOUSE.x, CLUBHOUSE.y, CLUBHOUSE.w, CLUBHOUSE.h, T.HOME);
  fill(37, 35, 18, 4, T.WATER);
  for (const b of BRIDGES) fill(b.x, b.y, b.w, b.h, T.WALK);
  // south: Kibble Mall district
  fill(AVENUE, 41, 3, 4, T.ROAD); // avenue joins the south road
  fill(7, 46, 50, 22, T.PLAZA);
  for (const b of MALL_BUILDINGS) fill(b.x, b.y, b.w, b.h, T.BUILDING);
  fill(STATUE.x, STATUE.y, 2, 1, T.BUILDING); fill(LEADERS.x, LEADERS.y, LEADERS.w, LEADERS.h, T.BUILDING);
  // trees: border + some park trees
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1) g[y][x] = T.TREE;
  for (const [x, y] of [[2, 2], [16, 3], [19, 5], [22, 2], [25, 7], [3, 9], [27, 3], [15, 9], [61, 14], [60, 24], [34, 38], [57, 36], [58, 39], [35, 35]])
    if (g[y][x] === T.GRASS || g[y][x] === T.FLOWER) g[y][x] = T.TREE;
  return g;
}

export const MAP = buildMap();
// Solid decor: flowering bushes flanking shop doors + hedges along NPC home fronts (door columns left open).
export const DECOR = [];
{ const ok = (x, y) => [T.GRASS, T.FLOWER, T.PLAZA].includes(MAP[y]?.[x]);
  for (const b of [...BUILDINGS, ...MALL_BUILDINGS]) { if (ok(b.x - 1, b.y + b.h - 1)) DECOR.push({ x: b.x - 1, y: b.y + b.h - 1, kind: 'bushP' }); if (ok(b.x + b.w, b.y + b.h - 1)) DECOR.push({ x: b.x + b.w, y: b.y + b.h - 1, kind: 'bushY' }); }
  for (const h of NPC_HOMES) for (const dx of [0, 1, 4, 5]) DECOR.push({ x: h.x + dx, y: h.y + h.h, kind: 'hedge' });
  for (const [xs, y] of [[[2, 12, 21, 38, 46, 61], 19], [[8, 15, 22, 41, 48, 55], 23], [[8, 15, 22, 36, 42, 52, 58], 34]]) for (const x of xs) if (MAP[y][x] === T.WALK) DECOR.push({ x, y, kind: 'planter' }); // street trees
  for (const [x, y] of [[49, 18], [50, 18], [58, 18], [59, 18], [44, 66], [45, 66], [54, 66], [55, 66]]) DECOR.push({ x, y, kind: 'car' }); } // showroom display cars
const DECOR_SET = new Set(DECOR.map((d) => d.y * MAP_W + d.x));
export const isSolid = (tx, ty) => tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H || SOLID.has(MAP[ty][tx]) || DECOR_SET.has(ty * MAP_W + tx);

// Interaction points: tile player should stand on
export function interactables(state) {
  const list = [];
  for (const b of BUILDINGS) list.push({ kind: 'building', id: b.id, name: b.name, tx: b.x + Math.floor(b.w / 2), ty: b.y + b.h });
  for (const b of MALL_BUILDINGS) list.push({ kind: 'mall', id: b.id, name: b.name, cat: b.cat, tx: b.x + Math.floor(b.w / 2), ty: b.y + b.h });
  list.push({ kind: 'mall', id: 'board', name: 'Mall prize-pool board', cat: 'board', tx: STATUE.x + 3, ty: STATUE.y });
  list.push({ kind: 'mall', id: 'leaders', name: 'Leaderboards Hall', cat: 'leaders', tx: LEADERS.x + 3, ty: LEADERS.y + LEADERS.h });
  for (const p of PLOTS) {
    const owned = !!state?.plots?.[p.id];
    list.push({ kind: 'plot', id: p.id, name: owned ? 'Your Home' : 'Plot for claim', tx: p.x + 3, ty: p.y + p.h });
  }
  for (const h of NPC_HOMES) list.push({ kind: 'visit', id: h.id, name: `${h.owner}'s Home`, tx: h.x + 3, ty: h.y + h.h });
  list.push({ kind: 'clubhouse', id: CLUBHOUSE.id, name: state?.packs?.joined ? 'Pack Clubhouse' : 'Pack Clubhouse lot', tx: CLUBHOUSE.x + 4, ty: CLUBHOUSE.y + CLUBHOUSE.h });
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

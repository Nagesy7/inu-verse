// Phase D layout proposal. Nothing in the game imports this file.
// The live map, save load, joystick and HUD stay as they are until Zachary says to build it.
import { TILE } from './world.js';
import { WALK_SPEED } from './mobility.js';

export const APPLIED = false;
export const TILE_PX = TILE;
export const WALK_PX_PER_SEC = WALK_SPEED;
export const PROPOSAL_W = 96;
export const PROPOSAL_H = 90;
export const T = Object.freeze({
  GRASS: 0, ROAD: 1, WALK: 2, BUILDING: 3, WATER: 4, TREE: 5, PLAZA: 8, RESERVED: 11,
});
const BLOCKED = new Set([T.BUILDING, T.WATER, T.TREE]);

// Spawn stands on the crossing of Main Street and Center Avenue, inside the plaza.
export const SPAWN = Object.freeze({ tx: 39, ty: 31 });

const ROAD_H = [
  { name: 'North Street', y: 14 },
  { name: 'Main Street', y: 30 },
  { name: 'Market Street', y: 56 },
  { name: 'South Street', y: 77 },
];
const ROAD_V = [{ name: 'Center Avenue', x: 38 }];

function lot(id, name, district, x, y, w, h, door, extra = {}) {
  return Object.freeze({ id, name, district, x, y, w, h, door: Object.freeze(door), ...extra });
}

// Doors are the sidewalk tile a player stands on. Reserved lots are not solid.
export const LOTS = Object.freeze([
  lot('rescue', 'Rescue Station', 'portals', 2, 9, 4, 4, [4, 13]),
  lot('quest', 'Trainer Gate', 'portals', 7, 9, 4, 4, [9, 13]),
  lot('empires', 'Empire Keep', 'portals', 14, 9, 4, 4, [16, 13]),
  lot('pepeballz', 'Ribbit Nugs Dome', 'portals', 19, 9, 4, 4, [21, 13]),
  lot('memebrawl', 'Meme Brawl Arena', 'portals', 24, 9, 4, 4, [26, 13]),
  lot('kibblepay', 'Kibble Pay Office', 'portals', 29, 9, 4, 4, [31, 13]),
  lot('arcade', 'Inu Arcade', 'portals', 42, 7, 6, 6, [45, 13]),
  lot('bank', 'Kibble Bank', 'portals', 49, 9, 5, 4, [51, 13]),
  lot('lounge', '$KIBBLE Holder Lounge', 'portals', 55, 9, 6, 4, [58, 13]),
  lot('academy', 'Good Boy Academy', 'civic', 62, 8, 10, 5, [67, 13]),

  lot('launch', 'Launch Hall', 'civic', 2, 22, 12, 7, [8, 29]),
  lot('clubhouse', 'Pack Clubhouse', 'civic', 15, 24, 9, 5, [19, 29]),
  lot('chapel', 'Park Chapel', 'plaza', 24, 22, 7, 5, [27, 27]),
  lot('fountain', 'Plaza Fountain', 'plaza', 32, 22, 4, 3, [32, 25]),
  lot('well', 'Well', 'plaza', 33, 26, 2, 2, [33, 28], { reserved: true }),
  lot('jobs', 'Jobs Board', 'plaza', 44, 22, 2, 2, [44, 24], { reserved: true }),

  lot('lumber', 'Lumber Yard', 'timber', 42, 25, 6, 4, [45, 29]),
  lot('sawmill', 'Sawmill', 'timber', 49, 25, 5, 4, [51, 29]),
  lot('office', "President's Office", 'civic', 58, 24, 10, 5, [63, 29]),

  lot('cafe', 'Shiba Sips Café', 'food', 2, 34, 8, 6, [6, 33]),
  lot('bakery', 'Bakery', 'food', 11, 34, 5, 4, [13, 33]),
  lot('mill', 'Flour Mill', 'food', 17, 34, 5, 4, [19, 33]),
  lot('farm', 'Wheat Farm', 'food', 23, 34, 6, 4, [26, 33]),
  lot('leaders', 'Leaderboards Hall', 'plaza', 30, 34, 6, 3, [33, 33]),

  lot('mine', 'Mine', 'metal', 42, 34, 5, 4, [44, 33]),
  lot('smelter', 'Smelter', 'metal', 48, 34, 5, 4, [50, 33]),
  lot('forge', 'Forge', 'metal', 54, 34, 5, 4, [56, 33]),
  lot('mechanic', "Mechanic's Shop", 'metal', 60, 34, 5, 4, [62, 33]),
  lot('scrap', 'Scrap Yard', 'metal', 66, 34, 6, 4, [69, 33]),
  lot('water', 'Water Tower', 'metal', 74, 34, 4, 4, [76, 33], { reserved: true }),

  lot('cafe-queued', 'Queued Café', 'food', 2, 43, 6, 4, [5, 42], { reserved: true }),
  lot('cloth', 'Cloth Mill', 'food', 9, 43, 5, 4, [11, 42], { reserved: true }),
  lot('tailor', 'Tailor', 'food', 15, 43, 5, 4, [17, 42]),
  lot('vet', 'Vet', 'food', 21, 43, 5, 4, [23, 42], { reserved: true }),
  lot('quarry', 'Quarry', 'metal', 42, 43, 6, 4, [45, 42], { reserved: true }),
  lot('builders', "Builders' Yard", 'metal', 49, 43, 6, 4, [52, 42], { reserved: true }),
  lot('factory', 'Car Factory', 'metal', 56, 43, 8, 5, [60, 42], { reserved: true }),
  lot('depot', 'Depot', 'metal', 66, 43, 6, 4, [69, 42], { reserved: true }),
  lot('power', 'Power House', 'metal', 74, 43, 4, 4, [76, 42], { reserved: true }),

  lot('L1', 'Farm Lane Lot 1', 'homes', 2, 51, 6, 4, [5, 55]),
  lot('L2', 'Farm Lane Lot 2', 'homes', 9, 51, 6, 4, [12, 55]),
  lot('L3', 'Farm Lane Lot 3', 'homes', 16, 51, 6, 4, [19, 55]),
  lot('L4', 'Farm Lane Lot 4', 'homes', 23, 51, 6, 4, [26, 55]),
  lot('market', 'Farmers Market', 'homes', 30, 52, 6, 3, [33, 55]),
  lot('h1', "Mochi's Home", 'homes', 42, 50, 6, 5, [45, 55]),
  lot('h2', "Kuro's Home", 'homes', 48, 50, 6, 5, [51, 55]),
  lot('h3', "Hana's Home", 'homes', 54, 50, 6, 5, [57, 55]),
  lot('h4', "Taro's Home", 'homes', 60, 50, 6, 5, [63, 55]),
  lot('P1', 'Prime Lot 1', 'homes', 68, 51, 6, 4, [71, 55]),
  lot('P2', 'Prime Lot 2', 'homes', 74, 51, 6, 4, [77, 55]),
  lot('cottage1', 'Cottage 1', 'homes', 81, 50, 4, 4, [83, 55], { reserved: true }),
  lot('cottage2', 'Cottage 2', 'homes', 86, 50, 4, 4, [88, 55], { reserved: true }),
  lot('cottage3', 'Cottage 3', 'homes', 81, 43, 4, 4, [83, 42], { reserved: true }),
  lot('cottage4', 'Cottage 4', 'homes', 86, 43, 4, 4, [88, 42], { reserved: true }),

  lot('p1', 'Plot 1', 'homes', 42, 60, 6, 6, [45, 59]),
  lot('p2', 'Plot 2', 'homes', 48, 60, 6, 6, [51, 59]),
  lot('p3', 'Plot 3', 'homes', 54, 60, 6, 6, [57, 59]),
  lot('p4', 'Plot 4', 'homes', 60, 60, 6, 6, [63, 59]),
  lot('p5', 'Plot 5', 'homes', 66, 60, 6, 6, [69, 59]),
  lot('p6', 'Plot 6', 'homes', 72, 60, 6, 6, [75, 59]),
  lot('p7', 'Plot 7', 'homes', 78, 60, 6, 6, [81, 59]),
  lot('p8', 'Plot 8', 'homes', 84, 60, 6, 6, [87, 59]),

  lot('cars', 'Zoomies Motors', 'market', 2, 70, 10, 6, [7, 76]),
  lot('shop', 'Paws & Pillows', 'market', 13, 70, 9, 6, [17, 76]),
  lot('fashion', 'Fetch Fashion', 'market', 23, 70, 7, 6, [26, 76]),
  lot('mall', 'Kibble Mall', 'market', 31, 68, 14, 8, [38, 76]),
  lot('jewel', 'Gilded Collar Jewelers', 'market', 46, 70, 8, 6, [50, 76]),
  lot('designer', 'Royal Paws Designer', 'market', 55, 70, 8, 6, [59, 76]),
  lot('goldden', 'Golden Den Furniture', 'market', 64, 70, 8, 6, [68, 76]),
  lot('luxauto', 'Zoomies Luxury Autos', 'market', 73, 70, 8, 6, [77, 76]),
  lot('petshop', 'Pawsome Pets', 'market', 82, 70, 8, 6, [86, 76]),

  lot('f0', 'Field 1', 'fields', 2, 81, 6, 4, [5, 80]),
  lot('f1', 'Field 2', 'fields', 9, 81, 6, 4, [12, 80]),
  lot('f2', 'Field 3', 'fields', 16, 81, 6, 4, [19, 80]),
  lot('f3', 'Field 4', 'fields', 23, 81, 6, 4, [26, 80]),
  lot('barn', 'Big Barn', 'fields', 30, 81, 8, 5, [34, 80]),
  lot('pond', 'Fishing Pond', 'fields', 40, 82, 10, 4, [44, 80], { water: true }),
  lot('dock', 'Fishing Dock', 'fields', 40, 80, 8, 1, [44, 80], { reserved: true }),
  lot('craft', 'Crafting Station', 'fields', 51, 81, 4, 3, [53, 80]),
  lot('pen', 'Animal Pen', 'fields', 56, 81, 10, 7, [61, 80]),
  lot('cosy', 'Cosy Corner Furniture', 'fields', 67, 81, 5, 5, [69, 80]),
  lot('royal', 'Maison Royale', 'fields', 73, 81, 7, 5, [76, 80]),
  lot('rail', 'Cart / Rail Line', 'reserve', 93, 14, 2, 72, [93, 31], { reserved: true }),
]);

export const STONES = Object.freeze([
  { id: 'civic', name: 'North Street', tx: 5, ty: 17 },
  { id: 'plaza', name: 'Central Plaza', tx: 34, ty: 27 },
  { id: 'timber', name: 'Timber Lane', tx: 55, ty: 24 },
  { id: 'food', name: 'Food Lane', tx: 6, ty: 41 },
  { id: 'metal', name: 'Metal Lane', tx: 50, ty: 41 },
  { id: 'homes', name: 'Home Street', tx: 5, ty: 49 },
  { id: 'mall', name: 'Market Street', tx: 40, ty: 76 },
  { id: 'fields', name: 'Field Lane', tx: 14, ty: 80 },
]);

function paint(grid, x, y, w, h, tile) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      if (yy >= 0 && xx >= 0 && yy < PROPOSAL_H && xx < PROPOSAL_W) grid[yy][xx] = tile;
    }
  }
}

export function buildProposalGrid() {
  const grid = Array.from({ length: PROPOSAL_H }, () => new Array(PROPOSAL_W).fill(T.GRASS));
  paint(grid, 18, 18, 44, 24, T.PLAZA);
  for (const road of ROAD_H) {
    paint(grid, 1, road.y - 1, PROPOSAL_W - 2, 1, T.WALK);
    paint(grid, 1, road.y, PROPOSAL_W - 2, 3, T.ROAD);
    paint(grid, 1, road.y + 3, PROPOSAL_W - 2, 1, T.WALK);
  }
  for (const road of ROAD_V) {
    paint(grid, road.x - 1, 1, 1, PROPOSAL_H - 2, T.WALK);
    paint(grid, road.x, 1, 3, PROPOSAL_H - 2, T.ROAD);
    paint(grid, road.x + 3, 1, 1, PROPOSAL_H - 2, T.WALK);
  }
  paint(grid, 2, 41, 36, 2, T.WALK);
  paint(grid, 42, 41, 36, 2, T.WALK);
  for (let y = 0; y < PROPOSAL_H; y++) {
    for (let x = 0; x < PROPOSAL_W; x++) {
      if (x === 0 || y === 0 || x === PROPOSAL_W - 1 || y === PROPOSAL_H - 1) grid[y][x] = T.TREE;
    }
  }
  for (const b of LOTS) {
    if (b.water) paint(grid, b.x, b.y, b.w, b.h, T.WATER);
    else if (b.reserved) paint(grid, b.x, b.y, b.w, b.h, T.RESERVED);
    else paint(grid, b.x, b.y, b.w, b.h, T.BUILDING);
  }
  return grid;
}

export const GRID = buildProposalGrid();

export function tileAt(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= PROPOSAL_W || ty >= PROPOSAL_H) return null;
  return GRID[ty][tx];
}

export function isBlocked(tx, ty) {
  const tile = tileAt(tx, ty);
  return tile == null || BLOCKED.has(tile);
}

export function proposalPath(sx, sy, tx, ty) {
  if (isBlocked(sx, sy) || isBlocked(tx, ty)) return null;
  const key = (x, y) => y * PROPOSAL_W + x;
  const prev = new Map([[key(sx, sy), -1]]);
  const q = [[sx, sy]];
  let head = 0;
  while (head < q.length) {
    const [x, y] = q[head++];
    if (x === tx && y === ty) {
      const path = [];
      let k = key(x, y);
      while (k !== -1) { path.push([k % PROPOSAL_W, Math.floor(k / PROPOSAL_W)]); k = prev.get(k); }
      return path.reverse();
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const nk = key(nx, ny);
      if (!isBlocked(nx, ny) && !prev.has(nk)) { prev.set(nk, key(x, y)); q.push([nx, ny]); }
    }
  }
  return null;
}

export function walkSeconds(steps) {
  return steps * TILE_PX / WALK_PX_PER_SEC;
}

export function lotById(id) {
  return LOTS.find((b) => b.id === id) || null;
}

// A player whose tile is solid on the proposed map moves to the nearest open tile.
// Ties go to the smaller row, then the smaller column. Open tiles keep their exact pixel.
export function relocate(px, py) {
  const tx = Math.floor(px / TILE_PX);
  const ty = Math.floor(py / TILE_PX);
  if (!isBlocked(tx, ty)) return { x: px, y: py, moved: false, tx, ty };
  let best = null;
  let bestD = Infinity;
  for (let y = 1; y < PROPOSAL_H - 1; y++) {
    for (let x = 1; x < PROPOSAL_W - 1; x++) {
      if (isBlocked(x, y)) continue;
      const d = Math.abs(x - tx) + Math.abs(y - ty);
      if (d < bestD || (d === bestD && best && (y < best.ty || (y === best.ty && x < best.tx)))) {
        bestD = d;
        best = { tx: x, ty: y };
      }
    }
  }
  if (!best) return { x: px, y: py, moved: false, tx, ty, failed: true };
  return {
    x: (best.tx + 0.5) * TILE_PX,
    y: (best.ty + 0.5) * TILE_PX,
    moved: true,
    tx,
    ty,
    to: best,
    steps: bestD,
  };
}

export function overlaps() {
  const seen = new Map();
  const hits = [];
  for (const b of LOTS) {
    for (let y = b.y; y < b.y + b.h; y++) {
      for (let x = b.x; x < b.x + b.w; x++) {
        const k = `${x},${y}`;
        if (seen.has(k)) hits.push([seen.get(k), b.id, k]);
        else seen.set(k, b.id);
      }
    }
  }
  return hits;
}

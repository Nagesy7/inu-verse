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
  GRASS: 0, ROAD: 1, WALK: 2, BUILDING: 3, WATER: 4, TREE: 5, PLAZA: 8, RESERVED: 11, FENCE: 12, HILL: 13,
});
const BLOCKED = new Set([T.BUILDING, T.WATER, T.TREE, T.FENCE, T.HILL]);

// Spawn is on the bend where the main path meets the avenue, inside the plaza.
export const SPAWN = Object.freeze({ tx: 46, ty: 31 });

// Centerlines. The main path and the avenue bend. Shortcuts are the narrow cuts between districts.
export const PATHS = Object.freeze({
  main: [[8, 46], [18, 42], [30, 36], [46, 31], [60, 35], [72, 40], [86, 37]],
  avenue: [[40, 8], [42, 16], [44, 24], [46, 31], [48, 42], [44, 54], [48, 66], [44, 76]],
  shortcuts: [
    [[14, 36], [24, 30], [34, 22]],
    [[64, 44], [56, 50], [48, 56]],
    [[10, 50], [16, 56], [24, 60]],
  ],
});

function lot(id, name, district, x, y, w, h, door, extra = {}) {
  return Object.freeze({ id, name, district, x, y, w, h, door: Object.freeze(door), ...extra });
}

// Doors are the sidewalk tile a player stands on. Reserved lots are not solid.
export const LOTS = Object.freeze([
  lot('rescue', 'Rescue Station', 'portals', 4, 6, 4, 4, [6, 10]),
  lot('quest', 'Trainer Gate', 'portals', 10, 9, 4, 4, [12, 13]),
  lot('empires', 'Empire Keep', 'portals', 16, 5, 4, 4, [18, 9]),
  lot('pepeballz', 'Ribbit Nugs Dome', 'portals', 22, 10, 4, 4, [24, 9]),
  lot('memebrawl', 'Meme Brawl Arena', 'portals', 28, 6, 4, 4, [30, 10]),
  lot('kibblepay', 'Kibble Pay Office', 'portals', 34, 11, 4, 4, [36, 15]),
  lot('arcade', 'Inu Arcade', 'portals', 52, 5, 6, 6, [55, 11]),
  lot('bank', 'Kibble Bank', 'portals', 60, 8, 5, 4, [62, 12]),
  lot('lounge', '$KIBBLE Holder Lounge', 'portals', 67, 5, 6, 4, [70, 9]),
  lot('academy', 'Good Boy Academy', 'civic', 74, 10, 10, 5, [79, 15]),

  lot('launch', 'Launch Hall', 'civic', 4, 18, 12, 7, [10, 25]),
  lot('clubhouse', 'Pack Clubhouse', 'civic', 18, 20, 9, 5, [22, 25]),
  lot('chapel', 'Park Chapel', 'plaza', 28, 18, 7, 5, [31, 23]),
  lot('fountain', 'Plaza Fountain', 'plaza', 40, 24, 4, 3, [42, 27]),
  lot('well', 'Well', 'plaza', 36, 28, 2, 2, [36, 30], { reserved: true }),
  lot('jobs', 'Jobs Board', 'plaza', 52, 26, 2, 2, [54, 27], { reserved: true }),
  lot('leaders', 'Leaderboards Hall', 'plaza', 6, 30, 6, 3, [9, 33]),

  lot('lumber', 'Lumber Yard', 'timber', 24, 14, 6, 4, [27, 18]),
  lot('sawmill', 'Sawmill', 'timber', 40, 16, 5, 4, [42, 20]),
  lot('office', "President's Office", 'civic', 58, 16, 10, 5, [63, 21]),

  lot('cafe', 'Shiba Sips Café', 'food', 4, 38, 8, 6, [8, 44]),
  lot('bakery', 'Bakery', 'food', 14, 34, 5, 4, [16, 38]),
  lot('mill', 'Flour Mill', 'food', 20, 42, 5, 4, [22, 41]),
  lot('farm', 'Wheat Farm', 'food', 26, 32, 6, 4, [29, 36]),

  lot('mine', 'Mine', 'metal', 54, 30, 5, 4, [56, 34]),
  lot('smelter', 'Smelter', 'metal', 60, 36, 5, 4, [62, 35]),
  lot('forge', 'Forge', 'metal', 66, 31, 5, 4, [68, 35]),
  lot('mechanic', "Mechanic's Shop", 'metal', 72, 37, 5, 4, [74, 36]),
  lot('scrap', 'Scrap Yard', 'metal', 78, 32, 6, 4, [81, 36]),
  lot('water', 'Water Tower', 'metal', 86, 28, 4, 4, [88, 32], { reserved: true }),

  lot('cafe-queued', 'Queued Café', 'food', 4, 50, 6, 4, [7, 49], { reserved: true }),
  lot('cloth', 'Cloth Mill', 'food', 12, 54, 5, 4, [14, 53], { reserved: true }),
  lot('tailor', 'Tailor', 'food', 18, 48, 5, 4, [20, 52]),
  lot('vet', 'Vet', 'food', 26, 52, 5, 4, [28, 51], { reserved: true }),
  lot('quarry', 'Quarry', 'metal', 54, 44, 6, 4, [57, 43], { reserved: true }),
  lot('builders', "Builders' Yard", 'metal', 62, 48, 6, 4, [65, 47], { reserved: true }),
  lot('factory', 'Car Factory', 'metal', 70, 44, 8, 5, [74, 43], { reserved: true }),
  lot('depot', 'Depot', 'metal', 80, 48, 6, 4, [83, 47], { reserved: true }),
  lot('power', 'Power House', 'metal', 88, 42, 4, 4, [88, 46], { reserved: true }),

  lot('L1', 'Farm Lane Lot 1', 'homes', 4, 60, 6, 4, [7, 59]),
  lot('L2', 'Farm Lane Lot 2', 'homes', 12, 64, 6, 4, [15, 63]),
  lot('L3', 'Farm Lane Lot 3', 'homes', 20, 59, 6, 4, [23, 63]),
  lot('L4', 'Farm Lane Lot 4', 'homes', 28, 64, 6, 4, [31, 63]),
  lot('market', 'Farmers Market', 'homes', 36, 58, 6, 3, [39, 57]),
  lot('h1', "Mochi's Home", 'homes', 44, 52, 6, 5, [47, 57]),
  lot('h2', "Kuro's Home", 'homes', 52, 58, 6, 5, [55, 57]),
  lot('h3', "Hana's Home", 'homes', 60, 52, 6, 5, [63, 57]),
  lot('h4', "Taro's Home", 'homes', 68, 58, 6, 5, [71, 57]),
  lot('P1', 'Prime Lot 1', 'homes', 76, 54, 6, 4, [79, 53]),
  lot('P2', 'Prime Lot 2', 'homes', 84, 58, 6, 4, [87, 57]),
  lot('cottage1', 'Cottage 1', 'homes', 86, 50, 4, 4, [86, 54], { reserved: true }),
  lot('cottage2', 'Cottage 2', 'homes', 4, 70, 4, 4, [6, 69], { reserved: true }),
  lot('cottage3', 'Cottage 3', 'homes', 84, 66, 4, 4, [86, 65], { reserved: true }),
  lot('cottage4', 'Cottage 4', 'homes', 90, 52, 4, 4, [90, 56], { reserved: true }),

  lot('p1', 'Plot 1', 'homes', 34, 66, 6, 6, [37, 65]),
  lot('p2', 'Plot 2', 'homes', 42, 70, 6, 6, [45, 69]),
  lot('p3', 'Plot 3', 'homes', 50, 65, 6, 6, [53, 71]),
  lot('p4', 'Plot 4', 'homes', 58, 70, 6, 6, [61, 69]),
  lot('p5', 'Plot 5', 'homes', 66, 66, 6, 6, [69, 72]),
  lot('p6', 'Plot 6', 'homes', 12, 72, 6, 6, [15, 71]),
  lot('p7', 'Plot 7', 'homes', 20, 68, 6, 6, [23, 74]),
  lot('p8', 'Plot 8', 'homes', 74, 70, 6, 6, [77, 69]),

  lot('cars', 'Zoomies Motors', 'market', 4, 80, 10, 6, [9, 79]),
  lot('shop', 'Paws & Pillows', 'market', 16, 78, 9, 6, [20, 77]),
  lot('fashion', 'Fetch Fashion', 'market', 28, 82, 7, 6, [31, 81]),
  lot('mall', 'Kibble Mall', 'market', 36, 76, 14, 8, [43, 84]),
  lot('jewel', 'Gilded Collar Jewelers', 'market', 52, 80, 8, 6, [56, 79]),
  lot('designer', 'Royal Paws Designer', 'market', 62, 76, 8, 6, [66, 82]),
  lot('goldden', 'Golden Den Furniture', 'market', 72, 80, 8, 6, [76, 79]),
  lot('luxauto', 'Zoomies Luxury Autos', 'market', 82, 76, 8, 6, [86, 82]),
  lot('petshop', 'Pawsome Pets', 'market', 16, 86, 8, 3, [20, 85]),

  lot('f0', 'Field 1', 'fields', 4, 74, 6, 4, [7, 73]),
  lot('f1', 'Field 2', 'fields', 36, 86, 6, 3, [39, 85]),
  lot('f2', 'Field 3', 'fields', 44, 60, 6, 4, [47, 64]),
  lot('f3', 'Field 4', 'fields', 4, 66, 6, 3, [7, 65]),
  lot('barn', 'Big Barn', 'fields', 26, 74, 8, 5, [30, 73]),
  lot('pond', 'Fishing Pond', 'fields', 6, 86, 8, 3, [15, 84], { water: true }),
  lot('dock', 'Fishing Dock', 'fields', 14, 84, 2, 2, [15, 83], { reserved: true }),
  lot('craft', 'Crafting Station', 'fields', 52, 74, 4, 3, [54, 73]),
  lot('pen', 'Animal Pen', 'fields', 70, 86, 10, 3, [69, 87]),
  lot('cosy', 'Cosy Corner Furniture', 'fields', 82, 84, 5, 5, [84, 83]),
  lot('royal', 'Maison Royale', 'fields', 58, 86, 7, 3, [61, 85]),
  lot('rail', 'Cart / Rail Line', 'reserve', 90, 18, 4, 6, [90, 24], { reserved: true }),
]);

export const STONES = Object.freeze([
  { id: 'civic', name: 'North Bend', tx: 8, ty: 14 },
  { id: 'plaza', name: 'Central Plaza', tx: 34, ty: 28 },
  { id: 'timber', name: 'Timber Lane', tx: 46, ty: 18 },
  { id: 'food', name: 'Food Lane', tx: 10, ty: 46 },
  { id: 'metal', name: 'Metal Lane', tx: 64, ty: 40 },
  { id: 'homes', name: 'Home Green', tx: 40, ty: 62 },
  { id: 'mall', name: 'Mall Bend', tx: 48, ty: 74 },
  { id: 'fields', name: 'Pond Shore', tx: 22, ty: 80 },
]);

function paint(grid, x, y, w, h, tile) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      if (yy >= 0 && xx >= 0 && yy < PROPOSAL_H && xx < PROPOSAL_W) grid[yy][xx] = tile;
    }
  }
}

function disk(grid, cx, cy, r, tile) {
  const R = Math.ceil(r);
  for (let y = Math.floor(cy) - R; y <= Math.ceil(cy) + R; y++) {
    for (let x = Math.floor(cx) - R; x <= Math.ceil(cx) + R; x++) {
      if (x < 1 || y < 1 || x >= PROPOSAL_W - 1 || y >= PROPOSAL_H - 1) continue;
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r * r) grid[y][x] = tile;
    }
  }
}

function stroke(grid, points, radius, tile) {
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
    for (let s = 0; s <= n; s++) {
      const t = s / n;
      disk(grid, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, radius, tile);
    }
  }
}

function wide(grid, points) {
  stroke(grid, points, 2.35, T.WALK);
  stroke(grid, points, 1.25, T.ROAD);
}

export function buildProposalGrid() {
  const grid = Array.from({ length: PROPOSAL_H }, () => new Array(PROPOSAL_W).fill(T.GRASS));
  // Irregular plaza: an oval plus a lobe, with a bite taken out so it is not a disk.
  for (let y = 1; y < PROPOSAL_H - 1; y++) {
    for (let x = 1; x < PROPOSAL_W - 1; x++) {
      const dx = (x + 0.5 - 46) / 16;
      const dy = (y + 0.5 - 31) / 11;
      const lobe = ((x + 0.5 - 34) / 6) ** 2 + ((y + 0.5 - 26) / 5) ** 2;
      if (dx * dx + dy * dy <= 1 || lobe <= 1) grid[y][x] = T.PLAZA;
    }
  }
  disk(grid, 58, 36, 4.2, T.GRASS);
  wide(grid, PATHS.main);
  wide(grid, PATHS.avenue);
  wide(grid, [[6, 12], [18, 11], [30, 13], [40, 12]]);
  wide(grid, [[52, 12], [64, 11], [76, 14], [42, 16]]);
  for (const lane of PATHS.shortcuts) stroke(grid, lane, 1.35, T.WALK);
  stroke(grid, [[90, 20], [88, 32], [92, 46], [89, 58], [92, 70], [88, 82]], 1.15, T.RESERVED);
  // Pond shore is a blob, not a rectangle. The dock is the walkable lip.
  for (let y = 85; y <= 88; y++) {
    for (let x = 6; x <= 16; x++) {
      const dx = (x - 10) / 5;
      const dy = (y - 87) / 2.4;
      const bite = ((x - 14) / 2) ** 2 + ((y - 88) / 1.4) ** 2;
      if (dx * dx + dy * dy <= 1 && bite > 0.4) grid[y][x] = T.WATER;
    }
  }
  disk(grid, 10, 22, 2.4, T.HILL);
  disk(grid, 88, 70, 2.6, T.HILL);
  for (let y = 1; y < PROPOSAL_H - 1; y++) {
    for (let x = 1; x < PROPOSAL_W - 1; x++) {
      if (grid[y][x] === T.HILL && (Math.abs(x - 46) < 3 && Math.abs(y - 31) < 3)) grid[y][x] = T.GRASS;
    }
  }
  stroke(grid, [[70, 84], [74, 84], [78, 85], [82, 84]], 0.6, T.FENCE);
  for (const b of LOTS) {
    if (b.water) continue;
    else if (b.reserved) paint(grid, b.x, b.y, b.w, b.h, T.RESERVED);
    else paint(grid, b.x, b.y, b.w, b.h, T.BUILDING);
  }
  for (let y = 1; y < PROPOSAL_H - 1; y++) {
    for (let x = 1; x < PROPOSAL_W - 1; x++) {
      if (grid[y][x] !== T.GRASS) continue;
      const edge = x < 2 + Math.round(Math.sin(y * 0.37) * 1.4 + 1)
        || x > PROPOSAL_W - 4 - Math.round(Math.sin(y * 0.23 + 1) * 1.6)
        || y < 2 + Math.round(Math.sin(x * 0.31) * 1.2)
        || y > PROPOSAL_H - 4 - Math.round(Math.cos(x * 0.19) * 1.5);
      if (edge) grid[y][x] = T.TREE;
    }
  }
  for (const [cx, cy, r] of [[14, 28, 1.6], [70, 22, 1.5], [24, 70, 1.7]]) {
    const R = Math.ceil(r);
    for (let y = cy - R; y <= cy + R; y++) {
      for (let x = cx - R; x <= cx + R; x++) {
        if (grid[y]?.[x] !== T.GRASS) continue;
        if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) grid[y][x] = T.TREE;
      }
    }
  }
  for (let y = 0; y < PROPOSAL_H; y++) {
    for (let x = 0; x < PROPOSAL_W; x++) {
      if (x === 0 || y === 0 || x === PROPOSAL_W - 1 || y === PROPOSAL_H - 1) {
        if (grid[y][x] === T.GRASS || grid[y][x] === T.TREE) grid[y][x] = T.TREE;
      }
    }
  }
  const openUp = new Set([T.TREE, T.HILL, T.GRASS]);
  const carve = (points) => {
    for (let i = 0; i < points.length - 1; i++) {
      const [x0, y0] = points[i];
      const [x1, y1] = points[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
      for (let s = 0; s <= n; s++) {
        const t = s / n;
        const cx = x0 + (x1 - x0) * t;
        const cy = y0 + (y1 - y0) * t;
        for (let y = Math.floor(cy) - 1; y <= Math.ceil(cy) + 1; y++) {
          for (let x = Math.floor(cx) - 1; x <= Math.ceil(cx) + 1; x++) {
            if (!grid[y] || !openUp.has(grid[y][x])) continue;
            if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= 1.4) grid[y][x] = T.WALK;
          }
        }
      }
    }
  };
  carve([[44, 76], [50, 82], [56, 87]]);
  carve([[14, 78], [15, 84]]);
  for (const b of LOTS) {
    const [x, y] = b.door;
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx;
      const yy = y + dy;
      if (grid[yy] && openUp.has(grid[yy][xx])) grid[yy][xx] = T.WALK;
    }
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

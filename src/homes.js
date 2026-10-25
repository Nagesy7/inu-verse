// Pre-made decorated NPC homes to visit + walkable home scene builder.
// Homes use the same Round-2 room runtime as the café (WASD / stick / tap-walk, same speeds),
// with placed furniture as solid footprints — movement feels like outside. Decorate opens build mode.
import { FURNITURE, ROOM_W, ROOM_H, footprint } from './furniture.js';
import { putScene } from './scenes.js';

export const NPC_INTERIORS = {
  h1: { wall: 2, floor: 1, roof: '#e58fa8', items: [[ 'bed', 0, 0, 0 ], [ 'rug', 3, 3, 0 ], [ 'table', 4, 3, 0 ], [ 'plant', 9, 0, 0 ], [ 'lamp', 2, 0, 0 ], [ 'bowl', 8, 6, 0 ], [ 'kennel', 8, 3, 0 ], [ 'shelf', 5, 0, 0 ]] },
  h2: { wall: 1, floor: 3, roof: '#4b5a7a', items: [[ 'tv', 4, 0, 0 ], [ 'sofa', 3, 3, 0 ], [ 'arcade', 0, 0, 0 ], [ 'arcade', 1, 0, 0 ], [ 'lamp', 7, 0, 0 ], [ 'rug', 3, 4, 0 ], [ 'bed', 7, 5, 1 ], [ 'plant', 0, 6, 0 ]] },
  h3: { wall: 3, floor: 2, roof: '#69b67a', items: [[ 'plant', 0, 0, 0 ], [ 'plant', 9, 0, 0 ], [ 'plant', 0, 6, 0 ], [ 'plant', 9, 6, 0 ], [ 'table', 4, 2, 0 ], [ 'chair', 3, 2, 0 ], [ 'chair', 6, 3, 0 ], [ 'rug', 3, 4, 0 ], [ 'shelf', 2, 0, 0 ], [ 'shelf', 6, 0, 0 ]] },
  h4: { wall: 0, floor: 0, roof: '#d6a24a', items: [[ 'kennel', 0, 0, 0 ], [ 'bowl', 2, 0, 0 ], [ 'bowl', 3, 0, 0 ], [ 'sofa', 5, 5, 0 ], [ 'tv', 5, 0, 0 ], [ 'lamp', 9, 0, 0 ], [ 'rug', 5, 2, 0 ], [ 'bed', 0, 4, 1 ]] },
};
export function npcHome(id) {
  const h = NPC_INTERIORS[id];
  return { wall: h.wall, floor: h.floor, roof: h.roof, items: h.items.map(([id, x, y, rot], i) => ({ uid: 1000 + i, id, x, y, rot })) };
}

// Interior legend (same as scenes.js IN) — kept local so homes don't depend on private consts.
const LEGEND = {
  '#': ['wall', null, 1], 'W': ['wall', 'window', 1], '.': ['floor', null, 0], ',': ['rug', null, 0], 'E': ['mat', null, 0],
  'P': ['floor', 'plant', 1], 'L': ['floor', 'lamp', 1], 'N': ['floor', 'board', 1],
};

// Floor grid offset inside the scene map (walls + trim around ROOM_W × ROOM_H).
export const HOME_OX = 2, HOME_OY = 2;
export const HOME_MAP_W = ROOM_W + 4, HOME_MAP_H = ROOM_H + 3; // walls + door row

export function furnitureSolids(items = []) {
  const out = [];
  for (const it of items) {
    const d = FURNITURE[it.id]; if (!d || d.layer === 'floor') continue; // rugs are walkable like outdoor paths
    const f = footprint(it.id, it.rot | 0);
    for (let dy = 0; dy < f.h; dy++) for (let dx = 0; dx < f.w; dx++) {
      const x = HOME_OX + (it.x | 0) + dx, y = HOME_OY + (it.y | 0) + dy;
      if (x > 0 && y > 0 && x < HOME_MAP_W - 1 && y < HOME_MAP_H - 1) out.push({ x, y });
    }
  }
  return out;
}

function baseMap() {
  const rows = [];
  rows.push('#'.repeat(HOME_MAP_W));
  rows.push('#' + 'W'.repeat(HOME_MAP_W - 2) + '#');
  for (let y = 0; y < ROOM_H; y++) rows.push('#' + '.'.repeat(HOME_MAP_W - 2) + '#');
  // door row: mat centred
  const door = Math.floor(HOME_MAP_W / 2) - 1;
  let bottom = '#'.repeat(HOME_MAP_W);
  bottom = bottom.slice(0, door) + 'EE' + bottom.slice(door + 2);
  rows.push(bottom);
  return rows;
}

/** Build a Round-2 scene def for a home layout. Movement = same room runtime as café/outdoors. */
export function makeHomeDef(home, { plotId, name = 'Home', readOnly = false, shared = null } = {}) {
  const items = home?.items || [];
  const map = baseMap();
  const door = Math.floor(HOME_MAP_W / 2) - 1;
  const spots = [];
  if (!readOnly && !shared) spots.push({ id: 'decor', tx: HOME_OX + ROOM_W - 1, ty: HOME_OY, face: 'up', name: 'Decorate', act: { build: plotId }, label: 'Decorate home' });
  if (shared) spots.push({ id: 'guestbook', tx: HOME_OX + 1, ty: HOME_OY, face: 'up', name: 'Guestbook', act: { build: 'share' }, label: 'Guestbook & look around' });
  if (readOnly && !shared) spots.push({ id: 'look', tx: HOME_OX + 1, ty: HOME_OY, face: 'up', name: 'Look around', act: { build: plotId }, label: 'Peek at the layout' });
  return {
    name: name || 'Home', kind: 'interior', floor: 'wood', wall: '#c9a07a', legend: LEGEND, map,
    homeLayout: home, homeItems: items, plotId: plotId || null, shared: shared || null, readOnly: !!readOnly,
    furnSolids: furnitureSolids(items),
    spawns: { door: [door, HOME_MAP_H - 2, 'up'] },
    exits: [{ tiles: [[door, HOME_MAP_H - 1], [door + 1, HOME_MAP_H - 1]], face: 'down', to: 'hub', door: plotId || 'share' }],
    spots, npcs: [],
  };
}

export function installHomeScene(sceneId, home, opts = {}) {
  return putScene(sceneId, makeHomeDef(home, opts));
}

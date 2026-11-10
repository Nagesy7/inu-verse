// Phase D is a proposal. These tests lock the migration rules and the district walks.
// They do not change the live map or the save loader.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TILE, findPath, doorTile, BUILDINGS, MALL_BUILDINGS, GAME_DOORS, ARCADE } from '../src/world.js';
import { newGame } from '../src/game.js';
import { save, load, MemoryStorage } from '../src/save.js';
import { FARM, MILL, BAKERY, LUMBER, SAWMILL, MECHANIC, SCRAP, MINE, SMELTER, FORGE } from '../src/npcbuildings.js';
import {
  APPLIED, FADE_MS, GRID, LIVE_SAVE_KEY, LOTS, NEIGHBOURHOODS, NOOKS, PATHS, PROPOSAL_H, PROPOSAL_W, SPAWN, STOP_KEY, STOP_PX, STOPS, T, TILE_PX,
  hop, isBlocked, loadStops, lotById, overlaps, proposalPath, relocate, tileAt, tripSeconds, visitDistrict, walkSeconds,
} from '../src/townproposal.js';

const LIVE_SPAWN = { x: 31.5 * TILE, y: 23.5 * TILE };

function liveDoor(id) {
  const npc = { farm: FARM, mill: MILL, bakery: BAKERY, lumber: LUMBER, sawmill: SAWMILL, mechanic: MECHANIC, scrap: SCRAP, mine: MINE, smelter: SMELTER, forge: FORGE }[id];
  if (npc) return npc.door;
  const g = [...GAME_DOORS, ARCADE].find((x) => x.id === id);
  if (g) return [g.door.tx, g.door.ty];
  const b = [...BUILDINGS, ...MALL_BUILDINGS].find((x) => x.id === id);
  const d = doorTile(b);
  return [d.tx, d.ty];
}

function liveSteps(door) {
  const path = findPath(Math.floor(LIVE_SPAWN.x / TILE), Math.floor(LIVE_SPAWN.y / TILE), door[0], door[1]);
  return path ? path.length - 1 : null;
}

test('the proposal is not applied to the game', () => {
  assert.equal(APPLIED, false);
  const game = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  const saveSrc = readFileSync(new URL('../src/save.js', import.meta.url), 'utf8');
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.equal(game.includes('townproposal'), false);
  assert.equal(saveSrc.includes('townproposal'), false);
  assert.equal(main.includes('townproposal'), false);
  const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  assert.match(css, /#stick\{[^}]*width:120px;height:120px;border-radius:50%/);
});

test('an old save still loads on the same pixel', () => {
  const store = new MemoryStorage();
  const game = newGame({ name: 'Kabo', coat: 'tan' });
  game.player.x = 2.2 * TILE_PX;
  game.player.y = 34.2 * TILE_PX;
  save(game, store);
  const loaded = load(store);
  assert.equal(loaded.player.x, game.player.x);
  assert.equal(loaded.player.y, game.player.y);
  assert.equal(loaded.bones, game.bones);
});

test('footprints do not overlap, and every door is a free tile on a path from spawn', () => {
  assert.deepEqual(overlaps(), []);
  for (const b of LOTS) {
    assert.ok(b.x > 0 && b.y > 0 && b.x + b.w < PROPOSAL_W && b.y + b.h < PROPOSAL_H, b.id);
    assert.equal(isBlocked(b.door[0], b.door[1]), false, `${b.id} door`);
    if (!b.reserved && !b.water) {
      assert.equal(tileAt(b.x, b.y), T.BUILDING, b.id);
    }
    const path = proposalPath(SPAWN.tx, SPAWN.ty, b.door[0], b.door[1]);
    assert.ok(path && path.length > 1, `${b.id} reachable`);
  }
});

test('the streets bend, the plaza is not a block, and the paths stay wide', () => {
  assert.equal(isBlocked(SPAWN.tx, SPAWN.ty), false);
  assert.ok(GRID[SPAWN.ty][SPAWN.tx] === T.ROAD || GRID[SPAWN.ty][SPAWN.tx] === T.PLAZA);
  let plaza = 0;
  let minX = 99;
  let maxX = 0;
  let minY = 99;
  let maxY = 0;
  let widest = 0;
  for (let y = 0; y < PROPOSAL_H; y++) {
    let road = 0;
    for (let x = 0; x < PROPOSAL_W; x++) {
      if (GRID[y][x] === T.ROAD) road += 1;
      if (GRID[y][x] !== T.PLAZA) continue;
      plaza += 1;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    widest = Math.max(widest, road);
  }
  const box = (maxX - minX + 1) * (maxY - minY + 1);
  assert.ok(plaza / box < 0.82, `plaza fill ${plaza / box}`);
  assert.ok(widest < 40, `a road row is ${widest} tiles, still a straight street`);
  const open = (x, y) => {
    const t = tileAt(x, y);
    return t === T.ROAD || t === T.WALK || t === T.PLAZA;
  };
  let wide = 0;
  for (const [x, y] of PATHS.main) {
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => open(x + dx, y + dy)).length;
    if (n >= 2) wide += 1;
  }
  assert.ok(wide >= PATHS.main.length - 1, 'main path is wide enough to read');
  const foodY = new Set(['cafe', 'bakery', 'mill', 'farm'].map((id) => lotById(id).y));
  assert.ok(foodY.size >= 3, 'food buildings share one setback');
  assert.ok(GRID.some((row) => row.includes(T.HILL)));
  assert.ok(GRID.some((row) => row.includes(T.FENCE)));
  assert.ok(GRID.some((row) => row.includes(T.WATER)));
  const edgeGrass = GRID.some((row, y) => y > 2 && y < PROPOSAL_H - 3 && (row[2] === T.GRASS || row[PROPOSAL_W - 3] === T.GRASS));
  assert.equal(edgeGrass, true);
});

test('a player on an open tile keeps the pixel, and a player inside a moved building goes to the nearest safe tile', () => {
  const open = relocate(SPAWN.tx * TILE_PX + 4, SPAWN.ty * TILE_PX + 8);
  assert.equal(open.moved, false);
  assert.equal(open.x, SPAWN.tx * TILE_PX + 4);

  const cafe = lotById('cafe');
  const buried = relocate((cafe.x + 0.2) * TILE_PX, (cafe.y + 0.2) * TILE_PX);
  assert.equal(buried.moved, true);
  assert.equal(isBlocked(buried.to.tx, buried.to.ty), false);
  assert.ok(buried.steps > 0 && buried.steps <= 3);
  assert.equal(buried.x, (buried.to.tx + 0.5) * TILE_PX);
  assert.deepEqual(relocate((cafe.x + 0.2) * TILE_PX, (cafe.y + 0.2) * TILE_PX), buried);

  const outside = relocate(LIVE_SPAWN.x, LIVE_SPAWN.y);
  assert.equal(outside.moved, false);
  assert.equal(outside.x, LIVE_SPAWN.x);
  assert.equal(outside.y, LIVE_SPAWN.y);
});

test('someone standing on the old south quarter is brought back onto the map', () => {
  const spot = relocate(50.5 * TILE_PX, 96.5 * TILE_PX);
  assert.equal(spot.moved, true);
  assert.equal(isBlocked(spot.to.tx, spot.to.ty), false);
  assert.ok(spot.to.ty < PROPOSAL_H - 1);
  assert.ok(proposalPath(SPAWN.tx, SPAWN.ty, spot.to.tx, spot.to.ty));
});

test('each trade chain sits on one short walk, and the long hikes get shorter', () => {
  const food = ['farm', 'mill', 'bakery', 'cafe'].map((id) => lotById(id).door);
  const metal = ['mine', 'smelter', 'forge', 'mechanic', 'scrap'].map((id) => lotById(id).door);
  const timber = ['lumber', 'sawmill'].map((id) => lotById(id).door);
  for (const group of [food, metal, timber]) {
    for (let i = 1; i < group.length; i++) {
      const path = proposalPath(group[0][0], group[0][1], group[i][0], group[i][1]);
      assert.ok(path.length - 1 <= 36, `${group[i]} chain ${path.length - 1}`);
    }
  }
  const watch = ['cafe', 'bakery', 'farm', 'mill', 'lumber', 'sawmill', 'mechanic', 'mine', 'mall', 'rescue'];
  const shorter = new Set(['bakery', 'farm', 'mill', 'lumber', 'sawmill', 'mine']);
  for (const id of watch) {
    const now = liveSteps(liveDoor(id));
    const next = proposalPath(SPAWN.tx, SPAWN.ty, ...lotById(id).door);
    assert.ok(now > 0, id);
    assert.ok(walkSeconds(next.length - 1) < 26, `${id} ${next.length - 1}`);
    if (shorter.has(id)) assert.ok(next.length - 1 < now, `${id} ${next.length - 1} vs ${now}`);
  }
});

test('each district has one cart stop, unlocked only in the preview save', () => {
  const districts = new Set(STOPS.map((s) => s.district));
  assert.equal(districts.size, STOPS.length);
  assert.equal(STOP_PX, 64);
  assert.ok(STOP_PX >= 44);
  for (const s of STOPS) {
    assert.equal(tileAt(s.tx, s.ty), T.STOP, s.district);
    assert.equal(isBlocked(s.tx, s.ty), false);
    assert.ok(proposalPath(SPAWN.tx, SPAWN.ty, s.tx, s.ty), s.district);
    for (const b of LOTS) {
      const hit = s.tx < b.x + b.w && s.tx + 2 > b.x && s.ty < b.y + b.h && s.ty + 2 > b.y;
      assert.equal(hit, false, `${s.district} overlaps ${b.id}`);
    }
  }
  const store = new MemoryStorage();
  store.setItem(LIVE_SAVE_KEY, '{"v":1,"bones":3}');
  assert.deepEqual(loadStops(store).unlocked, []);
  visitDistrict(store, 'food');
  assert.deepEqual(loadStops(store).unlocked, ['food']);
  assert.equal(hop(store, 'food', 'metal').ok, false);
  visitDistrict(store, 'metal');
  const ride = hop(store, 'food', 'metal');
  assert.equal(ride.ok, true);
  assert.equal(ride.fadeMs, FADE_MS);
  assert.equal(store.getItem(LIVE_SAVE_KEY), '{"v":1,"bones":3}');
  assert.ok(store.getItem(STOP_KEY).includes('food'));
  const walking = tripSeconds('food', 'metal', []);
  const riding = tripSeconds('food', 'metal', ['food', 'metal']);
  assert.ok(walking > 5);
  assert.equal(riding, FADE_MS / 1000);
  assert.ok(riding < walking);
});

test('hidden corners sit off the road and give nothing', () => {
  assert.ok(NOOKS.some((n) => n.hook === 'lore:mine-ruins'));
  for (const n of NOOKS) {
    assert.equal(n.bones, 0);
    assert.equal(n.cosmetic, false);
    assert.notEqual(tileAt(n.tx, n.ty), T.ROAD, n.id);
    assert.equal(isBlocked(n.tx, n.ty), false, n.id);
    assert.ok(proposalPath(SPAWN.tx, SPAWN.ty, n.tx, n.ty), n.id);
  }
  const files = NEIGHBOURHOODS.flatMap((n) => n.need);
  assert.deepEqual(files, ['brick-ground 16×16, one tile, warm', 'awning 32×16, shared by the bakery and the tailor', 'soot-decal 16×16']);
  for (const n of NEIGHBOURHOODS) assert.ok(n.reuse.length > 0, n.id);
});

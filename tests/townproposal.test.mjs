// Phase D is a proposal. These tests lock the migration rules and the district walks.
// They do not change the live map or the save loader.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TILE, findPath, doorTile, BUILDINGS, MALL_BUILDINGS, GAME_DOORS, ARCADE, isSolid, setPreviewCollision, previewCollisionOn, DOORS } from '../src/world.js';
import { pathKerbPlan, pathVariant } from '../src/tiles.js';
import { previewDoor, previewShowsPorch } from '../src/render.js';
import { newGame } from '../src/game.js';
import { save, load, MemoryStorage } from '../src/save.js';
import { FARM, MILL, BAKERY, LUMBER, SAWMILL, MECHANIC, SCRAP, MINE, SMELTER, FORGE } from '../src/npcbuildings.js';
import {
  APPLIED, FADE_MS, GRID, LIVE_SAVE_KEY, LOTS, NEIGHBOURHOODS, NOOKS, OVAL_CENTRE, PATHS, PLAZA_INLAY, PROPOSAL_H, PROPOSAL_W, SPAWN, STOP_KEY, STOP_PX, STOPS, T, TILE_PX,
  plazaPlanters, CAFE_PROPS, PNG_DOOR, pngDoorTile, SHOP_PROPS,
  brickFill, edgePlan, EXPANSIONS, hop, isBlocked, isBrickTile, loadStops, lotById, overlaps, preparePreviewPlayer, proposalPath, relocate, sootTiles, stubApproach, stubPast, tileAt, tripSeconds, visitDistrict, walkSeconds, yardTiles,
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

test('a south-quarter save is rescued in the preview and the live coordinates are what get stored', () => {
  const game = newGame({ name: 'Kabo', coat: 'tan' });
  game.player.x = 50.5 * TILE;
  game.player.y = 96.5 * TILE;
  const homeY = game.player.y;
  const moved = preparePreviewPlayer(game.player);
  assert.equal(moved.moved, true);
  assert.notEqual(game.player.y, homeY);
  assert.equal(isBlocked(Math.floor(game.player.x / TILE), Math.floor(game.player.y / TILE)), false);
  const store = new MemoryStorage();
  save(game, store);
  const raw = JSON.parse(store.getItem('inuverse.save.v1'));
  assert.equal(raw.player.y, homeY);
  assert.equal(raw.player.previewHome, undefined);
  setPreviewCollision({ solid: isBlocked, find: proposalPath, size: { w: PROPOSAL_W, h: PROPOSAL_H } });
  assert.equal(previewCollisionOn(), true);
  assert.equal(isSolid(0, 0), true);
  setPreviewCollision(null);
  assert.equal(previewCollisionOn(), false);
});

test('the proposal is not applied to the game', () => {
  assert.equal(APPLIED, false);
  const game = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  const saveSrc = readFileSync(new URL('../src/save.js', import.meta.url), 'utf8');
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.equal(game.includes('townproposal'), false);
  assert.equal(saveSrc.includes('townproposal'), false);
  assert.equal(main.includes('setPreviewCollision'), true);
  assert.equal(previewCollisionOn(), false);
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
  assert.deepEqual(NEIGHBOURHOODS.flatMap((n) => n.need), []);
  for (const n of NEIGHBOURHOODS) assert.ok(n.reuse.length > 0, n.id);
});

test('district sheets sit on the preview ground and do not change collision', async () => {
  const { access } = await import('node:fs/promises');
  for (const file of [
    'assets/district/brick-ground.png',
    'assets/district/brick-edge-grass.png',
    'assets/district/brick-edge-dirt.png',
    'assets/district/awning.png',
    'assets/district/soot-decal.png',
    'assets/pets/stray-pebble.png',
    'assets/pets/stray-honey.png',
    'assets/news/paper-pup.png',
  ]) await access(file);
  const { readFile } = await import('node:fs/promises');
  const draw = await readFile(new URL('../src/npcwork.js', import.meta.url), 'utf8');
  assert.equal(draw.includes("fillText('AWNING'"), false);
  assert.equal(draw.includes("fillText('BRICK'"), false);
  assert.equal(draw.includes("fillText('SOOT'"), false);
  assert.equal(draw.includes('assets/district/awning.png'), true);
  const ground = await readFile(new URL('../src/townproposal.js', import.meta.url), 'utf8');
  assert.equal(ground.includes('buildGridGround'), true);
  assert.equal(ground.includes('#606878'), false);
  let roadBrick = 0;
  for (let y = 0; y < PROPOSAL_H; y++) for (let x = 0; x < PROPOSAL_W; x++) {
    if (isBrickTile(x, y) && GRID[y][x] === T.ROAD) roadBrick++;
    if (isBrickTile(x, y)) assert.ok(GRID[y][x] === T.PLAZA || GRID[y][x] === T.WALK, `${x},${y}`);
  }
  assert.equal(roadBrick, 0);
  let both = 0;
  let brick = 0;
  for (let y = 0; y < PROPOSAL_H; y++) for (let x = 0; x < PROPOSAL_W; x++) {
    if (!isBrickTile(x, y)) continue;
    brick++;
    const t = GRID[y][x];
    assert.equal(isBlocked(x, y), false, `${x},${y}`);
    assert.notEqual(t, T.BUILDING);
    const plan = edgePlan(x, y);
    const mats = plan.map((p) => p.mat);
    const dirtAt = mats.indexOf('dirt');
    const grassAt = mats.indexOf('grass');
    if (dirtAt >= 0 && grassAt >= 0) {
      both++;
      assert.ok(dirtAt < grassAt);
    }
  }
  assert.ok(brick > 20);
  assert.ok(both > 0);
  const yard = yardTiles();
  const soot = sootTiles();
  assert.ok(yard.length > 8);
  assert.ok(Math.abs(soot.length / yard.length - 0.25) < 0.12);
});

test('expansion stubs are closed gates with a wide way back to the streets', () => {
  const edges = new Set(EXPANSIONS.map((s) => s.edge));
  for (const edge of ['N', 'E', 'S', 'W']) assert.ok(edges.has(edge), edge);
  assert.equal(EXPANSIONS.filter((s) => s.id === 'frog-shore').length, 1);
  const ids = new Set();
  const perp = { north: [1, 0], south: [1, 0], east: [0, 1], west: [0, 1] };
  for (const stub of EXPANSIONS) {
    assert.equal(ids.has(stub.id), false, stub.id);
    ids.add(stub.id);
    assert.equal(stub.connectsTo, null, stub.id);
    assert.ok(['north', 'south', 'east', 'west'].includes(stub.direction), stub.id);
    assert.equal(isBlocked(...stub.tile), true, stub.id);
    const past = stubPast(stub);
    assert.equal(isBlocked(...past), true, `${stub.id} past`);
    const [ax, ay] = stubApproach(stub);
    assert.equal(isBlocked(ax, ay), false, `${stub.id} approach`);
    assert.equal(tileAt(ax, ay), T.WALK, stub.id);
    assert.ok(proposalPath(SPAWN.tx, SPAWN.ty, ax, ay), stub.id);
    const [px, py] = perp[stub.direction];
    for (const side of [-1, 0, 1]) {
      const x = ax + px * side;
      const y = ay + py * side;
      assert.equal(tileAt(x, y), T.WALK, `${stub.id} ${x},${y}`);
      assert.equal(STOPS.some((s) => x >= s.tx && x < s.tx + 2 && y >= s.ty && y < s.ty + 2), false);
      assert.equal(NOOKS.some((n) => n.tx === x && n.ty === y), false);
      assert.equal(LOTS.some((b) => !b.water && x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h), false);
    }
  }
});

test('bakery brick prefers the tan fill and does not put worn tiles side by side', () => {
  let tan = 0;
  let fade = 0;
  let worn = 0;
  const cells = [];
  for (let y = 0; y < PROPOSAL_H; y++) for (let x = 0; x < PROPOSAL_W; x++) {
    if (!isBrickTile(x, y)) continue;
    const v = brickFill(x, y);
    cells.push([x, y, v]);
    if (v === 0) tan++;
    else if (v === 1) fade++;
    else worn++;
  }
  const n = cells.length;
  assert.ok(tan / n > 0.6 && tan / n < 0.85, tan / n);
  assert.ok(fade / n > 0.1 && fade / n < 0.3, fade / n);
  assert.ok(worn / n > 0.02 && worn / n < 0.12, worn / n);
  for (const [x, y, v] of cells) {
    if (v !== 2) continue;
    assert.notEqual(brickFill(x + 1, y), 2);
    assert.notEqual(brickFill(x, y + 1), 2);
  }
  assert.equal(brickFill(4, 8), brickFill(4, 8));
});

test('the cotton field and cloth mill are solid and clear of the gates', () => {
  for (const id of ['cotton', 'cloth']) {
    const lot = lotById(id);
    assert.equal(lot.reserved, undefined, id);
    for (let y = lot.y; y < lot.y + lot.h; y++) for (let x = lot.x; x < lot.x + lot.w; x++) assert.equal(isBlocked(x, y), true, `${id} ${x},${y}`);
    assert.equal(isBlocked(...lot.door), false, id);
    assert.ok(proposalPath(SPAWN.tx, SPAWN.ty, lot.door[0], lot.door[1]), id);
    for (const s of STOPS) {
      const hit = lot.x < s.tx + 2 && lot.x + lot.w > s.tx && lot.y < s.ty + 2 && lot.y + lot.h > s.ty;
      assert.equal(hit, false, id + s.district);
    }
    for (const n of NOOKS) {
      const inside = n.tx >= lot.x && n.tx < lot.x + lot.w && n.ty >= lot.y && n.ty < lot.y + lot.h;
      assert.equal(inside, false, id + n.id);
    }
    for (const stub of EXPANSIONS) {
      for (const [x, y] of [stub.tile, stubApproach(stub)]) {
        const inside = x >= lot.x && x < lot.x + lot.w && y >= lot.y && y < lot.y + lot.h;
        assert.equal(inside, false, id + stub.id);
      }
    }
  }
  assert.equal(lotById('cotton').door[0], lotById('cotton').x + 2);
  assert.equal(lotById('cloth').door[0], lotById('cloth').x + 4);
});

test('the new workplaces are solid and clear of the gates, stops, nooks and future sites', () => {
  const ids = ['goods', 'depot', 'tower', 'shed', 'sip', 'vet', 'cot0', 'cot1', 'cot2'];
  const doors = { goods: [5, 4], depot: [2, 4], tower: [1, 3], shed: [3, 3], sip: [3, 4], vet: [3, 4], cot0: [1, 3], cot1: [1, 3], cot2: [1, 3] };
  const keeps = [
    ['hall', 40, 59, 6, 5],
    ['hall-step', 40, 64, 6, 1],
    ['station', 56, 75, 6, 4],
    ['station-step', 56, 79, 6, 1],
    ['band', 18, 66, 3, 2],
    ['skate', 46, 67, 1, 1],
  ];
  for (const id of ids) {
    const lot = lotById(id);
    assert.equal(lot.reserved, undefined, id);
    assert.deepEqual([lot.door[0] - lot.x, lot.door[1] - lot.y], doors[id], id);
    for (let y = lot.y; y < lot.y + lot.h; y++) for (let x = lot.x; x < lot.x + lot.w; x++) assert.equal(isBlocked(x, y), true, `${id} ${x},${y}`);
    assert.equal(isBlocked(...lot.door), false, id);
    assert.ok(proposalPath(SPAWN.tx, SPAWN.ty, lot.door[0], lot.door[1]), id);
    for (const s of STOPS) {
      const hit = lot.x < s.tx + 2 && lot.x + lot.w > s.tx && lot.y < s.ty + 2 && lot.y + lot.h > s.ty;
      assert.equal(hit, false, id + s.district);
    }
    for (const n of NOOKS) {
      const inside = n.tx >= lot.x && n.tx < lot.x + lot.w && n.ty >= lot.y && n.ty < lot.y + lot.h;
      assert.equal(inside, false, id + n.id);
    }
    for (const stub of EXPANSIONS) {
      for (const [x, y] of [stub.tile, stubApproach(stub)]) {
        const inside = x >= lot.x && x < lot.x + lot.w && y >= lot.y && y < lot.y + lot.h;
        assert.equal(inside, false, id + stub.id);
      }
    }
    for (const [name, x, y, w, h] of keeps) {
      const hit = lot.x < x + w && lot.x + lot.w > x && lot.y < y + h && lot.y + lot.h > y;
      assert.equal(hit, false, id + name);
    }
  }
  assert.equal(lotById('town-hall').reserved, true);
  assert.equal(lotById('station').reserved, true);
  assert.equal(lotById('bandstand').reserved, true);
  assert.equal(NOOKS.some((n) => n.id === 'stargaze' && n.bones === 0 && n.tx === 57 && n.ty === 86), true);
  assert.equal(LOTS.some((b) => b.x <= 46 && b.x + b.w > 46 && b.y <= 67 && b.y + b.h > 67), false);
});

test('the v1.7 workplaces stay clear of the station, town hall and stargazing', () => {
  const ids = ['quarry', 'builders', 'stage', 'pay', 'drawwell', 'eastdock', 'jobs'];
  const keeps = [[40, 59, 6, 5], [40, 64, 6, 1], [56, 75, 6, 4], [56, 79, 6, 1], [57, 86, 1, 1]];
  for (const id of ids) {
    const lot = lotById(id);
    assert.equal(lot.reserved, undefined, id);
    assert.equal(isBlocked(...lot.door), false, id);
    assert.ok(proposalPath(SPAWN.tx, SPAWN.ty, lot.door[0], lot.door[1]), id);
    for (const [x, y, w, h] of keeps) {
      const hit = lot.x < x + w && lot.x + lot.w > x && lot.y < y + h && lot.y + lot.h > y;
      assert.equal(hit, false, id);
    }
  }
  const dock = lotById('eastdock');
  assert.equal(dock.deck, true);
  assert.equal(tileAt(dock.x + dock.w - 1, dock.y), T.WATER);
  assert.equal(tileAt(dock.x, dock.y), T.BUILDING);
  assert.deepEqual([...dock.door], [dock.x, dock.y + dock.h]);
  assert.equal(tileAt(lotById('eastpond').x, lotById('eastpond').y), T.WATER);
  assert.equal(lotById('town-hall').reserved, true);
  assert.equal(lotById('station').reserved, true);
  assert.equal(NOOKS.some((n) => n.id === 'stargaze' && n.tx === 57 && n.ty === 86 && n.bones === 0), true);
});

test('the car factory is a solid metal lot clear of the gates, stops and nooks', () => {
  const factory = lotById('factory');
  assert.equal(factory.reserved, undefined);
  assert.equal(factory.district, 'metal');
  for (let y = factory.y; y < factory.y + factory.h; y++) {
    for (let x = factory.x; x < factory.x + factory.w; x++) assert.equal(isBlocked(x, y), true, `${x},${y}`);
  }
  assert.equal(isBlocked(...factory.door), false);
  assert.ok(proposalPath(SPAWN.tx, SPAWN.ty, factory.door[0], factory.door[1]));
  const hits = overlaps().filter((row) => row[0] === 'factory' || row[1] === 'factory');
  assert.deepEqual(hits, []);
  for (const s of STOPS) {
    const hit = factory.x < s.tx + 2 && factory.x + factory.w > s.tx && factory.y < s.ty + 2 && factory.y + factory.h > s.ty;
    assert.equal(hit, false, s.district);
  }
  for (const n of NOOKS) {
    const inside = n.tx >= factory.x && n.tx < factory.x + factory.w && n.ty >= factory.y && n.ty < factory.y + factory.h;
    assert.equal(inside, false, n.id);
  }
  for (const stub of EXPANSIONS) {
    const [ax, ay] = stubApproach(stub);
    for (const [x, y] of [[ax, ay], stub.tile]) {
      const inside = x >= factory.x && x < factory.x + factory.w && y >= factory.y && y < factory.y + factory.h;
      assert.equal(inside, false, stub.id);
    }
  }
});

test('option C paves the preview and leaves the live path painters in place', async () => {
  const { access, readFile } = await import('node:fs/promises');
  await access('assets/path/option-C-tiles.png');
  await access('assets/path/option-C-edges.png');
  const tiles = await readFile(new URL('../src/tiles.js', import.meta.url), 'utf8');
  const ground = await readFile(new URL('../src/townproposal.js', import.meta.url), 'utf8');
  const draw = await readFile(new URL('../src/npcwork.js', import.meta.url), 'utf8');
  assert.match(tiles, /function buildGround/);
  assert.equal(tiles.includes('option-C'), false);
  assert.match(tiles, /\(x \+ y\) % 6 === 0/);
  assert.match(draw, /assets\/path\/option-C-tiles\.png/);
  assert.match(draw, /assets\/path\/option-C-edges\.png/);
  assert.equal(draw.includes('option-A'), false);
  assert.equal(draw.includes('option-B'), false);
  assert.match(ground, /if \(pathOn\)/);
  assert.match(draw, /plaza-centre-inlay-C\.png/);
  await access('assets/path/plaza-centre-inlay-C.png');
  await access('assets/race/ribbon-book-pager.png');
  assert.equal(draw.includes('ribbon-book-pager'), false);
  assert.equal(OVAL_CENTRE.x, 46);
  assert.equal(OVAL_CENTRE.y, 31);
  const quad = [[45, 30], [46, 30], [45, 31], [46, 31]];
  assert.equal(quad.every(([x, y]) => GRID[y][x] === T.PLAZA || GRID[y][x] === T.WALK), false);
  assert.equal(PLAZA_INLAY.kind, 'single');
  assert.equal(GRID[PLAZA_INLAY.ty][PLAZA_INLAY.tx], T.PLAZA);
  assert.equal(isBlocked(PLAZA_INLAY.tx, PLAZA_INLAY.ty), false);
  let nearer = false;
  for (let y = 0; y < PROPOSAL_H; y++) for (let x = 0; x < PROPOSAL_W; x++) {
    if (GRID[y][x] !== T.PLAZA) continue;
    const d = (x + 0.5 - 46) ** 2 + (y + 0.5 - 31) ** 2;
    const here = (PLAZA_INLAY.tx + 0.5 - 46) ** 2 + (PLAZA_INLAY.ty + 0.5 - 31) ** 2;
    if (d < here) nearer = true;
  }
  assert.equal(nearer, false);
  assert.deepEqual(pathKerbPlan(8, 2, 8, 2), []);
  assert.deepEqual(pathKerbPlan(2, 1, 2, 2), [1]);
  const fountain = lotById('fountain');
  const shadow = pathKerbPlan(GRID[fountain.y + fountain.h - 1][fountain.x], T.PLAZA, T.PLAZA, T.PLAZA);
  assert.deepEqual(shadow, [8]);
  assert.ok(plazaPlanters().length > 4);
  assert.equal(plazaPlanters().some(([x, y]) => x === PLAZA_INLAY.tx && y === PLAZA_INLAY.ty), false);
  assert.deepEqual(pathKerbPlan(2, 2, 2, 2), []);
  assert.deepEqual(pathKerbPlan(8, 14, 2, 2), []);
  assert.deepEqual(pathKerbPlan(3, 2, 2, 2), [8]);
  assert.deepEqual(pathKerbPlan(0, 2, 2, 2), [0]);
  assert.deepEqual(pathKerbPlan(2, 3, 0, 1), [1, 2, 3]);
  assert.equal(pathVariant(16, 38), pathVariant(16, 38));
  assert.ok(pathVariant(16, 38) >= 0 && pathVariant(16, 38) <= 2);
  const seen = new Set();
  for (let i = 0; i < 40; i++) seen.add(pathVariant(i, 7));
  assert.ok(seen.size >= 2);
});

test('preview cafe furniture is a small block and the live painters stay in front', async () => {
  const { readFile, access } = await import('node:fs/promises');
  const sheets = ['cafe', 'goldden', 'jewel', 'designer', 'shop', 'cars', 'fashion', 'luxauto', 'office', 'clubhouse', 'launch'];
  for (const id of sheets) {
    await access(`assets/buildings/${id}.png`);
    await access(`assets/buildings/${id}-night-lit.png`);
  }
  for (const piece of SHOP_PROPS) await access(`assets/props/${piece.id}.png`);
  await access('assets/buildings/cafe-easel.png');
  await access('assets/buildings/cafe-table.png');
  const render = await readFile(new URL('../src/render.js', import.meta.url), 'utf8');
  assert.match(render, /if \(b\.id === 'mall'\) return drawMallFacade/);
  assert.match(render, /drawTypedFacade\(c, b\)/);
  assert.match(render, /else drawDoors\(c, b\)/);
  assert.match(render, /PREVIEW_SHOPS/);
  assert.equal(render.includes('drawDoors(c, lot)'), false);
  const cafe = lotById('cafe');
  const front = cafe.y + cafe.h - 1;
  for (const prop of CAFE_PROPS) {
    assert.equal(prop.ty, front);
    assert.equal(isBlocked(prop.tx, prop.ty), true, prop.id);
  }
  for (const dx of [1, 2, 4, 5, 7]) assert.equal(isBlocked(cafe.x + dx, front), false, dx);
  assert.equal(isBlocked(cafe.door[0], cafe.door[1]), false);
  assert.ok(proposalPath(SPAWN.tx, SPAWN.ty, cafe.door[0], cafe.door[1]));
  const den = [...BUILDINGS, ...MALL_BUILDINGS].find((b) => b.id === 'goldden');
  const stand = doorTile(den);
  assert.equal(DOORS.goldden.side, 'right');
  assert.equal(stand.tx, den.x + den.w);
  assert.equal(stand.ty, den.y + den.h - 1);
  assert.equal(stand.tx - (den.x + 7), 1);
  assert.equal(stand.ty, den.y + 5);
  assert.equal(den.x + PNG_DOOR.goldden[0], 17);
  assert.equal(den.y + PNG_DOOR.goldden[1], 65);
});

test('png shop interact tiles sit on the manifest door, and an old doorway still loads', () => {
  for (const id of Object.keys(PNG_DOOR)) {
    const lot = lotById(id);
    assert.deepEqual([...lot.door], pngDoorTile(id), id);
    assert.equal(isBlocked(lot.door[0], lot.door[1]), false, id);
    assert.ok(proposalPath(SPAWN.tx, SPAWN.ty, lot.door[0], lot.door[1]), id);
  }
  const preview = lotById('goldden');
  assert.deepEqual([...preview.door], [79, 85]);
  assert.deepEqual(previewDoor('goldden'), { dx: 7, side: 'front' });
  assert.equal(previewShowsPorch('goldden'), false);
  assert.equal(DOORS.goldden.dx, 0);
  const painted = { jewel: [0, 5], designer: [6, 5], shop: [7, 5], cars: [2, 5], fashion: [6, 5], luxauto: [1, 5], office: [5, 4], clubhouse: [4, 4], launch: [6, 6] };
  for (const [id, off] of Object.entries(painted)) assert.deepEqual([...PNG_DOOR[id]], off, id);
  assert.deepEqual(previewDoor('jewel'), { dx: 0, side: 'front' });
  assert.deepEqual(previewDoor('fashion'), { dx: 6, side: 'front' });
  assert.equal(previewShowsPorch('jewel'), false);
  assert.equal(previewShowsPorch('fashion'), false);
  assert.equal(DOORS.jewel.side, 'left');
  assert.equal(DOORS.jewel.dx, 0);
  assert.equal(DOORS.fashion.side, 'right');
  assert.equal(DOORS.fashion.dx, 0);
  assert.deepEqual(DOORS.shop, { dx: 7, side: 'front' });
  for (const piece of SHOP_PROPS) {
    const shop = piece.id.split('-')[0];
    const door = pngDoorTile(shop);
    for (let x = piece.tx; x < piece.tx + piece.tw; x++) {
      assert.equal(x === door[0] && (piece.ty === door[1] || piece.ty === door[1] + 1), false, piece.id);
      assert.equal(isBlocked(x, piece.ty), true, `${piece.id} ${x}`);
      assert.notEqual(tileAt(x, piece.ty), T.RESERVED, piece.id);
      assert.notEqual(tileAt(x, piece.ty), T.WATER, piece.id);
    }
    assert.ok(proposalPath(SPAWN.tx, SPAWN.ty, door[0], door[1]), shop);
  }
  const faceY = preview.y + preview.h - 1;
  for (let y = faceY + 1; y <= faceY + 2; y++) {
    for (let x = preview.x; x < preview.x + preview.w; x++) {
      assert.notEqual(tileAt(x, y), T.TREE, `${x},${y} tree`);
      assert.notEqual(tileAt(x, y), T.FENCE, `${x},${y} fence`);
      assert.notEqual(tileAt(x, y), T.BUILDING, `${x},${y} prop`);
    }
  }
  assert.equal(tileAt(80, 85), T.WALK);
  assert.ok(proposalPath(SPAWN.tx, SPAWN.ty, 80, 85));
  const pond = lotById('eastpond');
  const dock = lotById('eastdock');
  assert.ok(pond.w >= 6 && pond.h >= 4);
  assert.equal(pond.x, dock.x + dock.w);
  for (let y = pond.y; y < pond.y + pond.h; y++) {
    for (let x = pond.x; x < pond.x + pond.w; x++) assert.equal(tileAt(x, y), T.WATER, `${x},${y}`);
  }
  assert.equal(tileAt(dock.x + dock.w - 1, dock.y + 1), T.WATER);
  const live = [...BUILDINGS, ...MALL_BUILDINGS].find((b) => b.id === 'goldden');
  assert.deepEqual([doorTile(live).tx, doorTile(live).ty], [18, 65]);
  const oldDoor = relocate(76.5 * TILE_PX, 79.5 * TILE_PX);
  assert.equal(oldDoor.moved, false);
  assert.equal(isBlocked(oldDoor.tx, oldDoor.ty), false);
  const oldStand = relocate(80.5 * TILE_PX, 85.5 * TILE_PX);
  assert.equal(oldStand.moved, false);
  assert.equal(isBlocked(oldStand.tx, oldStand.ty), false);
  const buried = relocate(56.5 * TILE_PX, 46.5 * TILE_PX);
  assert.equal(buried.moved, true);
  assert.equal(isBlocked(buried.to.tx, buried.to.ty), false);
  const game = newGame({ name: 'Kabo', coat: 'tan' });
  game.player.x = 76.5 * TILE_PX;
  game.player.y = 79.5 * TILE_PX;
  preparePreviewPlayer(game.player);
  assert.equal(isBlocked(Math.floor(game.player.x / TILE_PX), Math.floor(game.player.y / TILE_PX)), false);
});

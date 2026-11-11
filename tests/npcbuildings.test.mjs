// Workplace preview: paths stay on path tiles, each chain conserves stock, old saves do not move.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { MAP, PLOTS, TOWN_H, TOWN_W, isSolid } from '../src/world.js';
import { newGame } from '../src/game.js';
import { save, load, MemoryStorage } from '../src/save.js';
import {
  BAKERY, CHOP_CAP, CLOTH, CLOTH_STOCK, DAILY_ISSUE, FARM, FLOUR_STOCK, FORGE, JOIN_WAS, LUMBER, MECHANIC, MILL, MINE, ORE_CAP, ROUTES, SAWMILL, SCRAP, SIGN, SMELTER, TAILOR, WEAR_CAP, WORK_JOIN,
  advance, bakeOne, clothHeld, conserved, crewView, fieldHeld, flourHeld, goodsHeld, leftHeld, logLedger, lotProof, metalHeld, onPath, partsHeld, plankTotal, repairTool, replaceTool, sawOne, scrapHeld, seek, seedState, smeltScrap,
} from '../src/npcbuildings.js';

const TOWN_HASH = '160103ee7669ccba0c95572ac9d543d889f037653d361b61996ad8c9b32d2296';

test('lumber and mechanic stay on empty grass; the new trades sit on the south quarter', () => {
  const proof = lotProof();
  assert.equal(proof.length, 11);
  for (const lot of proof) {
    assert.deepEqual(lot.claimPlots, []);
    assert.equal(lot.doorOnPath, true, lot.id);
    assert.equal(PLOTS.some((p) => p.x === lot.x && p.y === lot.y), false);
  }
  const legacy = proof.filter((lot) => !lot.expansion);
  const added = proof.filter((lot) => lot.expansion);
  assert.deepEqual(legacy.map((lot) => lot.id), ['lumber', 'mechanic']);
  for (const lot of legacy) assert.equal(lot.allEmptyGrass, true, lot.id);
  assert.deepEqual(added.filter((lot) => !lot.hidden).map((lot) => lot.id), ['sawmill', 'tailor', 'bakery', 'scrap', 'farm', 'mill', 'mine', 'smelter', 'forge']);
  assert.deepEqual(added.filter((lot) => lot.hidden).map((lot) => lot.id), []);
  for (const lot of added) {
    assert.equal(lot.onNewGround, true, lot.id);
    assert.ok(lot.tiles.every((t) => t.tile === 3), lot.id);
  }
  assert.deepEqual(LUMBER.door, [50, 95]);
  assert.deepEqual(MECHANIC.door, [30, 6]);
  assert.equal(SAWMILL.w, 5);
  assert.equal(BAKERY.w, 5);
  assert.equal(SCRAP.w, 6);
  assert.deepEqual([...SAWMILL.door], [SAWMILL.x + 2, SAWMILL.y + 4]);
  assert.deepEqual([...BAKERY.door], [BAKERY.x + 4, BAKERY.y + 4]);
  assert.deepEqual([...SCRAP.door], [SCRAP.x + 3, SCRAP.y + 4]);
  assert.deepEqual([...TAILOR.door], [TAILOR.x + 4, TAILOR.y + 4]);
  assert.deepEqual([...FARM.door], [FARM.x + 3, FARM.y + 4]);
  assert.equal(FARM.w, 6);
  assert.deepEqual([...MILL.door], [MILL.x + 2, MILL.y + 4]);
  assert.equal(MILL.w, 5);
  for (const lot of [MINE, SMELTER, FORGE]) {
    assert.equal(lot.hidden, undefined);
    assert.equal(lot.w, 5);
    assert.equal(lot.h, 4);
    assert.deepEqual([...lot.door], [lot.x + 2, lot.y + 4]);
    assert.equal(isSolid(lot.x + 1, lot.y + 1), true, lot.id);
    assert.equal(isSolid(lot.door[0], lot.door[1]), false, lot.id);
    assert.equal(onPath(lot.door[0], lot.door[1]), true, lot.id);
  }
  assert.equal(MECHANIC.w, 5);
  assert.deepEqual(SIGN, [33, 6]);
  assert.equal(onPath(SIGN[0], SIGN[1]), true);
  assert.equal(onPath(CLOTH[0], CLOTH[1]), true);
});

test('the south quarter joins the farm walk without shifting any other town tile', () => {
  assert.deepEqual(WORK_JOIN, [[52, 104], [52, 105]]);
  assert.equal(MAP[104][52], 2);
  assert.equal(MAP[105][52], 2);
  const hash = createHash('sha256');
  for (let y = 0; y < TOWN_H; y++) {
    const row = MAP[y].slice();
    for (const [x, yy] of WORK_JOIN) if (yy === y) row[x] = JOIN_WAS[`${x},${yy}`];
    hash.update(row.join(','));
  }
  assert.equal(hash.digest('hex'), TOWN_HASH);
  assert.equal(TOWN_W, 64);
  assert.equal(TOWN_H, 106);
  assert.ok(SAWMILL.y >= TOWN_H && TAILOR.y >= TOWN_H && BAKERY.y >= TOWN_H && SCRAP.y >= TOWN_H);
});

test('an old save reloads the player on the same tile', () => {
  const st = new MemoryStorage();
  const game = newGame({ name: 'Kabo', coat: 'tan' });
  const x = game.player.x;
  const y = game.player.y;
  save(game, st);
  const loaded = load(st);
  assert.equal(loaded.player.x, x);
  assert.equal(loaded.player.y, y);
  const tx = Math.floor(x / 32);
  const ty = Math.floor(y / 32);
  assert.ok(tx > 0 && ty > 0 && tx < TOWN_W && ty < TOWN_H);
  assert.equal(WORK_JOIN.some(([jx, jy]) => jx === tx && jy === ty), false);
  assert.equal(isSolid(tx, ty), false);
  assert.equal(MAP[ty][tx], MAP[ty][tx]);
  const again = load(st);
  assert.equal(again.player.x, x);
  assert.equal(again.player.y, y);
});

test('every commute tile is a path tile', () => {
  for (const [name, route] of Object.entries(ROUTES)) {
    assert.ok(route.length >= 3, name);
    for (const [x, y] of route) assert.equal(onPath(x, y), true, `${name} ${x},${y} tile ${MAP[y][x]} solid ${isSolid(x, y)}`);
  }
  assert.ok(ROUTES.sawToSign.length > 16);
  assert.ok(ROUTES.timber.length > 16);
  assert.ok(ROUTES.signToScrap.length > 16);
});

test('nothing is produced while the crew is still walking', () => {
  const s = seek('walking');
  const crew = crewView(s);
  assert.equal(s.logs, 0);
  assert.equal(s.planks, 0);
  assert.equal(s.cart, 'broken');
  assert.equal(s.cargo, null);
  assert.equal(crew.timber.moving, true);
  assert.equal(crew.timber.place, 'path');
  assert.equal(crew.wrench.moving, true);
  assert.equal(crew.porter.moving, true);
  assert.equal(s.chits, DAILY_ISSUE);
  assert.equal(conserved(s), true);
});

test('timber chops at the yard, then the saw turns one delivered log into one plank', () => {
  const home = seek('home');
  assert.equal(home.beat, 'home');
  assert.equal(crewView(home).timber.place, 'home');
  assert.equal(home.chits, 0);
  const yard = seek('working-lumber');
  const y = crewView(yard);
  assert.equal(y.timber.place, 'lumber');
  assert.equal(y.timber.moving, false);
  assert.equal(y.timber.face, 'up');
  assert.equal(y.timber.tx, LUMBER.door[0]);
  assert.equal(y.timber.working, true);
  assert.equal(yard.logs, CHOP_CAP);
  assert.equal(yard.sawed, 0);
  const mill = seek('working-saw');
  assert.equal(mill.millLogs, 1);
  assert.equal(mill.logs, 3);
  assert.equal(crewView(mill).saw.place, 'sawmill');
  assert.equal(crewView(mill).saw.working, true);
  const shop = seek('working-mechanic');
  assert.equal(shop.plankUsed, 1);
  assert.equal(shop.shortage, 'FILLED');
  assert.equal(shop.bay, 'bonnet');
  assert.equal(shop.logs, 3);
  assert.equal(logLedger(shop).sum, CHOP_CAP);
  assert.equal(conserved(yard) && conserved(mill) && conserved(shop), true);
});

test('the porter stands at the mechanic sign with the single plank, and a second pass does not mint another', () => {
  const mid = seek('delivery');
  const p = crewView(mid);
  assert.equal(mid.cargo, 'plank');
  assert.equal(mid.shopPlanks, 0);
  assert.equal(plankTotal(mid), 1);
  assert.equal(p.porter.tx, SIGN[0]);
  assert.equal(p.porter.ty, SIGN[1]);
  assert.equal(p.porter.place, 'sign');
  assert.equal(p.porter.face, 'down');
  assert.notEqual(p.porter.ty, 55);
  assert.equal(mid.shortage, 'SHORT 1 PLANK');
  const done = seek('nextdawn');
  const home = crewView(done);
  assert.equal(done.day, 2);
  assert.equal(done.plankUsed, 1);
  assert.equal(done.shopPlanks, 0);
  assert.equal(done.sawed, 1);
  assert.equal(done.logs, 3);
  assert.equal(done.millLogs, 0);
  assert.equal(done.cut, 4);
  assert.equal(logLedger(done).sum, 4);
  assert.equal(done.cart, 'fixed');
  assert.equal(done.car, 'out');
  assert.equal(done.shortage, 'FILLED');
  assert.equal(done.scrapUsed, 1);
  assert.equal(done.pressed, 1);
  assert.equal(partsHeld(done), 1);
  assert.equal(leftHeld(done), 1);
  assert.equal(scrapHeld(done), 1);
  assert.equal(home.timber.place, 'home');
  assert.equal(home.wrench.place, 'home');
  assert.equal(home.porter.place, 'home');
  assert.equal(done.chits, DAILY_ISSUE * 2);
  assert.equal(conserved(done), true);
  const again = advance(done);
  assert.equal(again.sawed, 1);
  assert.equal(again.scrapUsed, 1);
  assert.equal(again.chits, DAILY_ISSUE * 2);
  assert.equal(again.cut, 4);
});

test('leftover logs and flour are finite and a second conversion does not mint', () => {
  const done = seek('nextdawn');
  assert.equal(done.logs, 3);
  assert.equal(done.flour, 2);
  assert.equal(done.flourDelivered, 1);
  assert.equal(done.harvested, 1);
  assert.equal(done.eaten, 1);
  assert.equal(done.meal, 1);
  let sawn = 0;
  while (sawOne(done)) sawn += 1;
  assert.equal(sawn, 3);
  assert.equal(done.logs, 0);
  assert.equal(done.sawed, 4);
  assert.equal(logLedger(done).planks, 4);
  assert.equal(sawOne(done), false);
  assert.equal(done.sawed, 4);
  let baked = 0;
  while (bakeOne(done)) baked += 1;
  assert.equal(baked, 2);
  assert.equal(done.flour, 0);
  assert.equal(flourHeld(done), FLOUR_STOCK + 1);
  assert.equal(bakeOne(done), false);
  assert.equal(conserved(done), true);
});

test('the mechanic stays 5x4 and the car leaves on path tiles', () => {
  assert.equal(MECHANIC.w, 5);
  assert.equal(MECHANIC.h, 4);
  for (const [x, y] of ROUTES.carExit) assert.equal(onPath(x, y), true, `${x},${y}`);
  const mid = seek('working-mechanic');
  assert.equal(mid.plankUsed, 1);
  let s = mid;
  for (let n = 0; n < 80 && s.car !== 'out'; n++) s = advance(s);
  assert.equal(s.car, 'out');
  assert.equal(s.cart, 'fixed');
  const again = advance(s);
  assert.equal(again.car, 'out');
  assert.equal(again.plankUsed, 1);
});

test('one cloth bolt becomes one test coat and is not minted twice', () => {
  for (const [x, y] of ROUTES.clothToTailor) assert.equal(onPath(x, y), true);
  for (const [x, y] of ROUTES.tailorToRack) assert.equal(onPath(x, y), true);
  assert.equal(onPath(TAILOR.rack[0], TAILOR.rack[1]), true);
  const sewing = seek('working-tailor');
  assert.equal(sewing.mannequin, 'bare');
  assert.equal(sewing.shopBolt, 1);
  assert.equal(goodsHeld(sewing).sum, 1);
  assert.equal(crewView(sewing).stitch.place, 'tailor');
  assert.equal(crewView(sewing).stitch.working, true);
  const done = seek('nextdawn');
  assert.equal(done.rack, 1);
  assert.equal(done.mannequin, 'dressed');
  assert.equal(done.clothStock, 0);
  assert.equal(clothHeld(done), CLOTH_STOCK);
  assert.equal(goodsHeld(done).sum, 1);
  const twice = advance(done);
  assert.equal(twice.rack, 1);
  assert.equal(goodsHeld(twice).sum, 1);
  assert.equal(twice.clothStock, 0);
});

test('scrap comes only from the repaired tool and the leftover, and bread gates the next shift', () => {
  const scrap = seek('working-scrap');
  assert.equal(scrap.yardTool, 1);
  assert.equal(scrap.yardLeft, 1);
  assert.equal(scrap.scrap, 0);
  assert.equal(scrap.pressed, 0);
  assert.equal(crewView(scrap).bolt.working, true);
  const bake = seek('working-bakery');
  assert.equal(bake.oven, 'knead');
  assert.equal(bake.flour, FLOUR_STOCK);
  assert.equal(crewView(bake).crumb.working, true);
  const done = seek('nextdawn');
  assert.equal(done.meal, 1);
  assert.equal(done.eaten, 1);
  assert.equal(done.bread, 0);
  assert.equal(flourHeld(done), FLOUR_STOCK + 1);
  assert.equal(done.harvested, 1);
  assert.equal(fieldHeld(done), 1);
  assert.equal(done.scrapUsed, 1);
  assert.equal(conserved(done), true);
});

test('wheat is grown once, ground once, and the sack is the bakery flour', () => {
  for (const [x, y] of ROUTES.farmToMill) assert.equal(onPath(x, y), true);
  for (const [x, y] of ROUTES.millToBakery) assert.equal(onPath(x, y), true);
  const ripe = seek('working-farm');
  assert.equal(ripe.crop, 3);
  assert.equal(ripe.harvested, 0);
  assert.equal(crewView(ripe).sprout.place, 'farm');
  const mill = seek('working-mill');
  assert.equal(mill.grain, 1);
  assert.equal(mill.milled, 0);
  assert.equal(mill.sailFrame > 0, true);
  assert.equal(crewView(mill).dusty.place, 'mill');
  const done = seek('nextdawn');
  assert.equal(done.crop, 4);
  assert.equal(done.harvested, 1);
  assert.equal(done.milled, 1);
  assert.equal(done.flourDelivered, 1);
  assert.equal(done.sheaf, 0);
  assert.equal(done.grain, 0);
  const again = advance(done);
  assert.equal(again.harvested, 1);
  assert.equal(again.milled, 1);
  assert.equal(conserved(done), true);
});

test('ore is finite in this chain, a tool is repaired before it is replaced, and scrap smelts once', () => {
  for (const route of [ROUTES.mineToSmelter, ROUTES.smelterToForge, ROUTES.forgeToLumber, ROUTES.forgeToSign, ROUTES.lumberToScrap]) {
    for (const [x, y] of route) assert.equal(onPath(x, y), true);
  }
  const done = seek('nextdawn');
  assert.equal(done.dug, ORE_CAP);
  assert.equal(done.vein, 0);
  assert.equal(done.axeAtYard, 1);
  assert.equal(done.partAtShop, 1);
  assert.equal(done.bars, 0);
  assert.equal(done.wear, 0);
  assert.equal(done.repaired, 1);
  assert.equal(done.replaced, 0);
  assert.equal(metalHeld(done), ORE_CAP);
  assert.equal(done.scrapFeed, 0);
  const fresh = seedState();
  fresh.scrapFeed = 1;
  assert.equal(smeltScrap(fresh), true);
  assert.equal(fresh.bars, 1);
  assert.equal(fresh.barsFromScrap, 1);
  assert.equal(smeltScrap(fresh), false);
  assert.equal(metalHeld(fresh), 1);
  fresh.wear = WEAR_CAP;
  assert.equal(replaceTool(fresh), true);
  assert.equal(fresh.bars, 0);
  assert.equal(fresh.replaced, 1);
  assert.equal(replaceTool(fresh), false);
  assert.equal(repairTool(fresh), false);
  assert.equal(conserved(fresh), true);
  assert.equal(conserved(done), true);
  const draw = readFileSync(new URL('../src/npcwork.js', import.meta.url), 'utf8');
  assert.equal(draw.includes('mine.png'), true);
  assert.equal(draw.includes('smelter.png'), true);
  assert.equal(draw.includes('forge.png'), true);
  assert.equal(draw.includes('work-ore-in.png'), true);
  assert.equal(crewView(done).smith.name, 'Anvil');
  assert.equal(draw.includes('wheat-farm.png'), true);
  assert.equal(draw.includes('windmill.png'), true);
  assert.equal(draw.includes("beat === 'grind'"), true);
});

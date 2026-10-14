import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, claimPlot, buyFurniture, placeFurniture, moveFurniture, sellPlaced, sellFromInventory, storeFurniture, upgrade, swapBonesToKibble, START_BONES, BONES_PER_KIBBLE } from '../src/game.js';
import { canPlace, FURNITURE } from '../src/furniture.js';
import { PLOT_COST } from '../src/world.js';
import { newShift, tickShift, addToTray, serve, finishShift } from '../src/cafe.js';
import { mulberry32 } from '../src/rng.js';
import { createToken, playerBuy, playerSell, simulateTick, seedTokens, holderCount, PLAYER } from '../src/launch.js';

test('starts with 500 bones', () => assert.equal(newGame().bones, START_BONES));
test('plot claim costs bones and is exclusive', () => {
  const s = newGame(); assert.ok(claimPlot(s, 'p1').ok); assert.equal(s.bones, 500 - PLOT_COST);
  assert.equal(claimPlot(s, 'p1').ok, false); assert.equal(claimPlot(s, 'p2').ok, false, 'insufficient bones');
  assert.equal(claimPlot(s, 'nope').ok, false);
});
test('furniture: buy, place, collide, rotate, move, sell back', () => {
  const s = newGame(); claimPlot(s, 'p1');
  assert.equal(placeFurniture(s, 'p1', 'sofa', 0, 0).ok, false, 'must own item');
  assert.ok(buyFurniture(s, 'sofa').ok); assert.ok(buyFurniture(s, 'table').ok); assert.ok(buyFurniture(s, 'rug').ok);
  assert.equal(s.bones, 200 - 90 - 60 - 45);
  assert.ok(placeFurniture(s, 'p1', 'sofa', 0, 0, 0).ok);
  assert.equal(placeFurniture(s, 'p1', 'table', 2, 0, 0).ok, false, 'overlap blocked');
  assert.equal(placeFurniture(s, 'p1', 'table', 9, 0, 0).ok, false, 'out of bounds');
  assert.ok(placeFurniture(s, 'p1', 'table', 3, 0, 0).ok);
  assert.ok(placeFurniture(s, 'p1', 'rug', 0, 0, 0).ok, 'rug on floor layer can go under sofa');
  const sofa = s.plots.p1.items[0];
  assert.equal(moveFurniture(s, 'p1', sofa.uid, 0, 0, 1).ok, true, 'rotate in place to 1x3');
  assert.equal(moveFurniture(s, 'p1', sofa.uid, 3, 0, 0).ok, false, 'move onto table blocked');
  const before = s.bones; const r = sellPlaced(s, 'p1', sofa.uid); assert.ok(r.ok);
  assert.equal(s.bones - before, FURNITURE.sofa.price / 2); assert.equal(s.plots.p1.items.length, 2);
  const tbl = s.plots.p1.items.find((i) => i.id === 'table'); assert.ok(storeFurniture(s, 'p1', tbl.uid).ok); assert.equal(s.inventory.table, 1);
  assert.ok(sellFromInventory(s, 'table').ok); assert.equal(s.inventory.table, undefined);
});
test('canPlace rotation footprint', () => {
  const home = { items: [] }; assert.equal(canPlace(home, 'bed', 8, 0, 0), true); assert.equal(canPlace(home, 'bed', 8, 5, 1), false); assert.equal(canPlace(home, 'bed', 7, 5, 1), true);
});
test('wall/floor upgrades cost bones', () => {
  const s = newGame(); claimPlot(s, 'p1'); assert.ok(upgrade(s, 'p1', 'wall', 1).ok); assert.equal(s.bones, 120); assert.equal(upgrade(s, 'p1', 'floor', 3).ok, false);
});
test('cafe shift earns bones', () => {
  const s = newGame(); const rng = mulberry32(7); const sh = newShift(rng); tickShift(sh, 0.5, rng);
  assert.ok(sh.orders.length >= 1); const o = sh.orders[0];
  assert.equal(serve(sh, o.id).ok, false, 'empty tray wrong');
  o.items.forEach((i) => addToTray(sh, i)); const r = serve(sh, o.id); assert.ok(r.ok); assert.ok(r.pay > 0);
  while (!sh.over) tickShift(sh, 1, rng);
  const total = finishShift(s, sh); assert.equal(s.bones, 500 + total); assert.ok(total >= r.pay); assert.equal(s.stats.shifts, 1);
});
test('swap bones to demo KIBBLE', () => {
  const s = newGame(); const r = swapBonesToKibble(s, 100); assert.ok(r.ok); assert.equal(s.kibble, 20 + 100 / BONES_PER_KIBBLE); assert.equal(swapBonesToKibble(s, 99999).ok, false);
});
test('launch: create token, buy/sell, NPC holders, KIBBLE conserved', () => {
  const s = newGame(); const rng = mulberry32(3); seedTokens(s, rng);
  const r = createToken(s, { name: 'Shiba Star', ticker: 'star', color: '#f00' }); assert.ok(r.ok); assert.equal(r.token.ticker, 'STAR');
  assert.equal(createToken(s, { name: 'x', ticker: 'STAR' }).ok, false);
  const kibble0 = s.kibble; const b = playerBuy(s, r.token.id, 5); assert.ok(b.ok); assert.ok(Math.abs(s.kibble - (kibble0 - 5)) < 1e-9);
  const total = () => s.kibble + s.tokens.reduce((a, t) => a + t.curve.realKibble + t.curve.fees, 0);
  for (let i = 0; i < 100; i++) simulateTick(s, rng);
  assert.ok(holderCount(r.token) > 1);
  const t0 = total(); const sl = playerSell(s, r.token.id, r.token.holders[PLAYER]); assert.ok(sl.ok); assert.ok(Math.abs(total() - t0) < 1e-9);
  assert.equal(r.token.holders[PLAYER], undefined); assert.ok(r.token.history.length > 10);
});

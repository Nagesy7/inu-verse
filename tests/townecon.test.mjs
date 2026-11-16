// Town economy model + Town Exchange + Town Hall needs (preview). Pure and deterministic.
import test from 'node:test';
import assert from 'node:assert/strict';
import { production, deliveries, ledger, GOODS, GOOD_IDS } from '../src/townecon.js';
import { NEEDS, needOf, needStatus, CREW_SHARE } from '../src/townneeds.js';
import { lotById, SPAWN } from '../src/townproposal.js';
import { fastPath } from '../src/workrow.js';
import { SCENES } from '../src/scenes.js';
import { PLACES, placeDoor } from '../src/townx.js';

test('nothing is made before the crews start; output only grows through the day', () => {
  const p6 = production(6 * 60); assert.ok(GOOD_IDS.every((g) => p6[g] === 0));
  let prev = production(7 * 60); for (let h = 8; h <= 18; h++) { const p = production(h * 60); for (const g of GOOD_IDS) assert.ok(p[g] >= prev[g], `${g} at ${h}`); prev = p; }
  assert.ok(production(16 * 60).planks > 20 && production(16 * 60).fruit > 0);
});
test('delivery routes run between real lots, row and base chains both', () => {
  const r = deliveries(12 * 60); assert.ok(r.length > 8);
  for (const d of r) { assert.ok(lotById(d.to), 'to ' + d.to); assert.ok(lotById(d.fromLot), 'from ' + d.fromLot); assert.ok(d.n > 0); }
  for (const g of ['planks', 'ore', 'fish', 'stone', 'fruit', 'wool']) assert.ok(r.some((d) => d.good === g), g);
});
test('ledger: used comes off stock, and wanting more than the stock is a shortage', () => {
  const L = ledger(12 * 60, { used: { bread: 2 }, wanted: { tools: 999 } });
  const bread = L.rows.find((r) => r.good === 'bread'); assert.equal(bread.stock, bread.made - 2);
  assert.ok(L.shortages.includes('tools')); assert.ok(!L.shortages.includes('bread'));
  assert.equal(L.rows.length, GOOD_IDS.length); assert.equal(L.hour, 12);
});
test('Town Hall posts one need per sky day; crews chip in part, your shifts can finish it', () => {
  assert.ok(NEEDS.some((n) => n.good === 'planks' && n.n === 20 && /bridge/.test(n.what)));
  assert.equal(needOf(41).id, needOf(41).id); const ids = new Set(Array.from({ length: 30 }, (_, d) => needOf(d).id)); assert.ok(ids.size >= 4, 'the need changes from day to day');
  const d = Array.from({ length: 60 }, (_, i) => i).find((i) => needOf(i).id === 'bridge'); const sec = 12 * 60;
  const a = needStatus(d, sec); assert.equal(a.crew, Math.min(20, Math.floor(production(sec).planks * CREW_SHARE))); assert.equal(a.title, '20 planks for the bridge');
  const b = needStatus(d, sec, { planks: 20 }); assert.equal(b.complete, true); assert.equal(b.you, 20); assert.equal(b.left, 0); assert.equal(b.done, 'The bridge is fixed!');
});
test('the Town Exchange and the civic row stand on real lots you can walk to', () => {
  for (const id of ['exchange', 'police', 'hospital', 'firehouse']) { const l = lotById(id); assert.ok(l, id); assert.ok(fastPath([SPAWN.tx, SPAWN.ty], l.door), id + ' door is reachable from spawn'); }
  for (const id of ['exchange', 'townhall']) assert.ok(placeDoor(id), id);
  assert.deepEqual(SCENES.exchange.exits[0], { tiles: [[7, 8], [8, 8]], face: 'down', to: 'hub', door: 'exchange' });
  const sc = SCENES.exchange; assert.deepEqual(sc.spots.map((s) => s.act.opts.tab).sort(), ['needs', 'production', 'routes', 'spending', 'wanted']);
  assert.equal(PLACES.exchange.civic, 'exchange');
});

import test from 'node:test'; import assert from 'node:assert/strict';
const F = await import('../src/farm.js'); const B = await import('../src/biz.js'); const W = await import('../src/world.js'); const { mulberry32 } = await import('../src/rng.js');
const st = () => ({ bones: 2000, kibble: 50, player: { name: 'Kabosu' }, stats: {} });
test('crops grow in real time; seasons and rain change the speed', () => { const a = st(), b = st(), c = st();
  for (const s of [a, b, c]) { F.buySeeds(s, 'turnip', 1); F.plant(s, 0, 'turnip'); }
  F.tickFarm(a, 60, { season: 'spring' }); F.tickFarm(b, 60, { season: 'summer' }); F.tickFarm(c, 60, { season: 'spring', rain: true });
  assert.ok(Math.abs(a.farm.fields[0].grown - 0.5) < 1e-9); assert.ok(b.farm.fields[0].grown < a.farm.fields[0].grown); assert.ok(c.farm.fields[0].grown > a.farm.fields[0].grown);
  assert.equal(F.harvest(a, 0).ok, false); F.tickFarm(a, 61, { season: 'spring' }); const r = F.harvest(a, 0); assert.ok(r.ok && a.farm.inv.turnip === 6); });
test('animals produce (faster when fed), orchard by season, fishing, crafting', () => { const s = st(); F.buyAnimal(s, 'chicken'); F.buyAnimal(s, 'cow'); F.feedAnimals(s);
  F.tickFarm(s, 150, { season: 'winter' }); assert.ok(s.farm.pen.egg >= 1 && s.farm.pen.milk >= 1); assert.equal(s.farm.orchard.ready, 0); F.collectPen(s);
  F.tickFarm(s, 200, { season: 'autumn' }); assert.equal(F.pickOrchard(s).item, 'apple');
  assert.equal(F.fishCatch(s, 0.99, 0.05).item, 'koi'); assert.equal(F.fishCatch(s, 0.5, 2).ok, false);
  s.farm.inv.milk = 2; assert.ok(F.craft(s, 'cheese').ok && s.farm.inv.cheese === 1 && !s.farm.inv.milk); assert.equal(F.craft(s, 'cheese').ok, false); });
test('supply & demand: selling lowers price, it recovers; café pays more; 5% to the farmer pool', () => { const s = st(); F.ensureFarm(s).inv.milk = 30; const p0 = F.priceOf(s, 'milk', 'market', 3);
  assert.ok(F.priceOf(s, 'milk', 'cafe', 3) > p0); const pool = s.farm.pool, r = F.sell(s, 'milk', 20, 'market', 3); assert.ok(r.ok && F.priceOf(s, 'milk', 'market', 3) < p0); assert.equal(s.farm.pool - pool, r.fee); assert.equal(s.farm.weekValue, r.total);
  for (let i = 0; i < 30; i++) F.marketHour(s); assert.equal(F.priceOf(s, 'milk', 'market', 3), p0); assert.equal(F.sell(s, 'turnip', 1, 'cafe').ok, false); });
test('weekly Top Farmer board pays the pool by rank', () => { const s = st(); F.ensureFarm(s).weekValue = 99999; const rows = F.farmBoard(s); assert.equal(rows[0].me, true); assert.ok(rows.length === 6);
  const b0 = s.bones, r = F.rollFarmWeek(s, 1); assert.equal(r.rank, 1); assert.equal(s.bones - b0, 150); assert.equal(s.farm.weekValue, 0); assert.equal(F.rollFarmWeek(s, 1), null); });
test('business: lease, stock, NPC demand responds to price, ledger, prime rent to treasury', () => { const s = st(); assert.equal(B.lease(s, 'P2', 'cafe', 'X', 0).ok, false); // rival lot
  assert.ok(B.lease(s, 'P1', 'bakery', 'Kabosu Bakes', 0).ok); assert.equal(s.biz.treasuryRent, 240); B.stockFromMarket(s, 'bread', 15); B.stockFromMarket(s, 'cake', 5);
  const rng = mulberry32(3); let sold = 0; for (let h = 8; h < 20; h++) sold += B.bizHour(s, h, rng).sold; assert.ok(sold > 0); assert.equal(B.bizHour(s, 2, rng).shoppers, 0);
  const row = B.bizDay(s, 0); assert.equal(row.rent, 120); assert.equal(row.profit, row.revenue - row.cogs - row.wages - row.rent); assert.equal(s.biz.treasuryRent, 360);
  assert.ok(B.buyChance(10, 14) > B.buyChance(30, 14)); });
test('staff, decor, upgrades, farm stand takes player produce; Top Business board', () => { const s = st(); B.lease(s, 'L1', 'stand', 'Stand', 0); F.ensureFarm(s).inv.carrot = 10;
  assert.equal(B.stockFromFarm(s, 'carrot', 99).n, 10); assert.equal(B.stockFromFarm(s, 'jam', 1).ok, false); const a0 = B.appeal(s.biz.mine); B.buyDecor(s, 'awning'); B.buyUpgrade(s, 'display'); B.hire(s); assert.ok(B.appeal(s.biz.mine) > a0); assert.equal(B.capOf(s.biz.mine), 20);
  B.buyUpgrade(s, 'shelves'); assert.equal(B.capOf(s.biz.mine), 40); s.biz.weekProfit = 99999; assert.equal(B.bizBoard(s)[0].me, true); const b0 = s.bones, exp = Math.floor(s.biz.pool * 0.5); assert.equal(B.rollBizWeek(s, 1).paid, exp); assert.equal(s.bones - b0, exp); });
test('farmland map: every farm/lot interactable reachable from the mall; lots do not block heli spot or doors', () => { const it = W.interactables({}).filter((i) => ['field', 'farm', 'lot', 'biz'].includes(i.kind)); assert.ok(it.length >= 17);
  for (const i of it) { assert.equal(W.isSolid(i.tx, i.ty), false, i.id); assert.ok(W.findPath(32, 47, i.tx, i.ty), 'reach ' + i.id); } assert.equal(W.isSolid(21, 71), false); });

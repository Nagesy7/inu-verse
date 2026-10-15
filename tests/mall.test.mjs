import test from 'node:test'; import assert from 'node:assert/strict';
import { feeSplit, quote, buyMallItem, ensureMall, payout, rollPeriods, toU, U, FEE_LABEL, MALL_ITEMS, OWNER_WALLET } from '../src/mall.js';
import { newGame } from '../src/game.js';
import { save, load, MemoryStorage } from '../src/save.js';
test('fee split is exact: 1% owner, .25/.5/.25 pools, no rounding loss', () => {
  const q = feeSplit(toU(12)); assert.equal(q.fee, 240000); assert.equal(q.owner, 120000); assert.equal(q.daily, 30000); assert.equal(q.weekly, 60000); assert.equal(q.monthly, 30000); assert.equal(q.total, toU(12)); // fee-inclusive
  for (const p of [1, 3, 7, 33, 101, 999999, 1234567, 5.25 * U, 9.5 * U]) { const f = feeSplit(p); assert.equal(f.owner + f.daily + f.weekly + f.monthly, f.fee, `p=${p}`); assert.equal(f.fee, Math.floor(p * 0.02)); assert.ok(f.owner >= Math.floor(p / 100)); }
  assert.match(FEE_LABEL, /price includes 2%/); assert.equal(OWNER_WALLET, 'BzLYTFAfUsjzQ5x8bx5BbPK4DFtaHrLCuferkvkxTNGJ');
});
test('purchase charges exactly the (fee-inclusive) price, accrues treasury and pools, grants item', () => {
  const s = newGame(); s.kibble = 100; const r = buyMallItem(s, 'gold_suit'); assert.ok(r.ok);
  assert.equal(toU(s.kibble), toU(100 - 12)); const m = ensureMall(s);
  assert.equal(m.treasury, 120000); assert.deepEqual(m.pools, { daily: 30000, weekly: 60000, monthly: 30000 }); assert.ok(s.wardrobe.owned.includes('gold_suit'));
  assert.equal(buyMallItem(s, 'gold_suit').ok, false, 'no duplicates'); buyMallItem(s, 'gold_throne'); assert.equal(s.inventory.gold_throne, 1);
  const poor = newGame(); poor.kibble = 11.99; assert.equal(buyMallItem(poor, 'gold_suit').ok, false, 'price must be covered');
  let sum = 0; for (const id of Object.keys(MALL_ITEMS)) sum += quote(id).fee; assert.ok(sum > 0);
});
test('payouts go to the top score (skill based, deterministic) and pools reset', () => {
  const s = newGame(); const m = ensureMall(s); m.pools = { daily: 500, weekly: 900, monthly: 300 };
  assert.equal(payout(m, 'daily', []), null); const w = payout(m, 'daily', [{ id: 'a', name: 'A', score: 5 }, { id: 'you', name: 'Me', score: 9 }, { id: 'b', name: 'B', score: 9 }]);
  assert.equal(w.id, 'you'); assert.equal(w.amount, 500); assert.equal(m.pools.daily, 0);
  s.kibble = 0; m.pools.daily = 2 * U; m.pools.weekly = 3 * U; m.pools.monthly = U;
  const ent = (pool) => pool === 'monthly' ? [{ id: 'pk_bark', name: 'Barkers', score: 99 }] : [{ id: 'you', name: 'Me', score: 1 }];
  const r = rollPeriods(s, 7, ent); assert.deepEqual(r.map((x) => x.pool), ['daily', 'weekly']); assert.equal(s.kibble, 5); assert.equal(m.pools.monthly, U);
  rollPeriods(s, 28, ent); assert.equal(m.pools.monthly, 0); assert.equal(s.packs.all.pk_bark.kibblePrize, U);
});
test('mall state survives save/load', () => { const st = new MemoryStorage(), s = newGame(); s.kibble = 50; buyMallItem(s, 'crown'); save(s, st); assert.deepEqual(load(st).mall, JSON.parse(JSON.stringify(s.mall))); });

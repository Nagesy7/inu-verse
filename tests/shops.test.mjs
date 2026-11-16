// Shops sell what workers make; buying builds a relationship with the owner (preview). Bones are in-game only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SHOPS, SHOP_IDS, TIERS, tierOf, priceFor, buy, relOf, itemStock, playerUsed, brawlResult, MEME_BRAWL_URL } from '../src/shops.js';
import { ledger, production, GOODS } from '../src/townecon.js';
import { PLACES } from '../src/townx.js';

test('tiers are Stranger / Regular / Friend / Bestie at 0 / 5 / 10 / 15% off', () => {
  assert.deepEqual(TIERS.map((t) => [t.name, t.off]), [['Stranger', 0], ['Regular', 0.05], ['Friend', 0.1], ['Bestie', 0.15]]);
  assert.equal(tierOf(0).name, 'Stranger'); assert.equal(tierOf(3).name, 'Regular'); assert.equal(tierOf(8).name, 'Friend'); assert.equal(tierOf(15).name, 'Bestie');
  const jacket = SHOPS.tailor.items.find((i) => i.id === 'jacket'); assert.deepEqual([0, 3, 8, 15].map((b) => priceFor(jacket, b)), [40, 38, 36, 34]);
});
test('every shop sells goods a town workplace makes, at a door in the town', () => {
  for (const id of SHOP_IDS) { for (const it of SHOPS[id].items) assert.ok(GOODS[it.good], `${id}:${it.id} -> ${it.good}`); assert.ok(Object.values(PLACES).some((p) => p.shop === id), id + ' has a place'); }
});
test('buying costs Bones, builds the relationship, applies the discount, and stops when sold out or short', () => {
  const s = { bones: 1000 }; const prices = []; let up = null;
  for (let i = 0; i < 16; i++) { const r = buy(s, 'tailor', 'jacket', { skyDay: 3, stock: 5 }); assert.ok(r.ok); prices.push(r.paid); if (r.tierUp) up = up || r.tier.name; }
  assert.equal(prices[0], 40); assert.equal(prices[3], 38); assert.equal(prices[8], 36); assert.equal(prices[15], 34); assert.equal(up, 'Regular');
  assert.equal(relOf(s, 'tailor').buys, 16); assert.equal(s.bones, 1000 - prices.reduce((a, b) => a + b, 0));
  assert.equal(buy(s, 'tailor', 'scarf', { stock: 0 }).ok, false); assert.match(buy(s, 'tailor', 'scarf', { stock: 0 }).reason, /ordered more/);
  const poor = { bones: 2 }; assert.equal(buy(poor, 'bakery', 'loaf', { stock: 3 }).ok, false); assert.equal(poor.bones, 2);
});
test('Besties get an occasional small gift, at most once a sky day per shop', () => {
  let gifts = 0, days = 0;
  for (let d = 0; d < 30; d++) { const s = { bones: 9999, townx: { shops: { bakery: { buys: 20, spent: 0, lastGift: -1, brawls: { won: 0, lost: 0 } } } } };
    const a = buy(s, 'bakery', 'loaf', { skyDay: d, stock: 9 }), b = buy(s, 'bakery', 'loaf', { skyDay: d, stock: 9 }); assert.equal(b.gift, null); if (a.gift) gifts++; days++; }
  assert.ok(gifts > 3 && gifts < days - 5, `gifts ${gifts}/${days} should be occasional`);
});
test('shelf stock comes from what the workers made, and what you buy is used up', () => {
  const sec = 14 * 60, rows = ledger(sec).rows; const loaf = itemStock('bakery', 'loaf', rows); assert.ok(loaf > 0);
  assert.equal(itemStock('bakery', 'loaf', ledger(6 * 60).rows), 0, 'nothing baked before the crews start');
  const s = { bones: 500 }; for (let i = 0; i < 3; i++) buy(s, 'bakery', 'loaf', { skyDay: 4, stock: 9 });
  assert.deepEqual(playerUsed(s, 4), { bread: 3 }); assert.equal(ledger(sec, { used: playerUsed(s, 4) }).rows.find((r) => r.good === 'bread').stock, production(sec).bread - 3);
  assert.ok(ledger(sec, { made: { planks: 7 } }).rows.find((r) => r.good === 'planks').made === production(sec).planks + 7, 'your job shifts add goods');
});
test('Meme Brawl: the owner talks before and reacts after a win or a loss; a loss is a cartoon bruise', () => {
  const s = { bones: 0 }; const w = brawlResult(s, 'forge', true); assert.equal(w.line, SHOPS.forge.lines.brawlLose); assert.deepEqual(w.record, { won: 1, lost: 0 });
  const l = brawlResult(s, 'forge', false); assert.equal(l.line, SHOPS.forge.lines.brawlWin); assert.equal(s.townx.injury.kind, 'brawl');
  for (const id of SHOP_IDS) for (const k of ['brawlPre', 'brawlWin', 'brawlLose', 'gift', 'tierUp']) assert.ok(SHOPS[id].lines[k], id + ' ' + k);
  assert.equal(MEME_BRAWL_URL, 'https://meme-brawl.vercel.app/');
});

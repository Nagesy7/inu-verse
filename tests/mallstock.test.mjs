// Luxury mall stock: Gilded Collar Jewelers, Golden Den Furniture and Royal Paws Designer each carry 8-10 original cosmetic items
// at fixed $KIBBLE prices on the existing ladder; cosmetic only (outfit / furniture grants, no stats); every wearable has layered
// art for all coats; every piece of furniture has a drawing kind.
import test from 'node:test'; import assert from 'node:assert/strict';
import { MALL_ITEMS } from '../src/mall.js'; import { MALL_BUILDINGS } from '../src/world.js'; import { OUTFITS, buyOutfit } from '../src/outfits.js'; import { FURNITURE } from '../src/furniture.js'; import { OUTFIT_ATLAS } from '../src/outfit-atlas.js';
const LADDER = { jewelry: [40000, 120000], furniture: [20000, 100000], outfit: [90000, 150000] };
test('each luxury store stocks 8-10 items', () => { for (const id of ['jewel', 'goldden', 'designer']) { const st = MALL_BUILDINGS.find((b) => b.id === id), items = Object.values(MALL_ITEMS).filter((it) => it.cat === st.cat);
  assert.ok(items.length >= 8 && items.length <= 10, `${st.name}: ${items.length}`); assert.equal(new Set(items.map((i) => i.name)).size, items.length); } });
test('fixed prices on the existing ladder, cosmetic grants only', () => { for (const [k, it] of Object.entries(MALL_ITEMS)) { if (it.cat === 'car') continue; const [lo, hi] = LADDER[it.cat];
  assert.ok(Number.isInteger(it.price) && it.price >= lo && it.price <= hi, `${k} ${it.price}`); assert.deepEqual(Object.keys(it).sort(), ['cat', 'grants', 'name', 'price']);
  const g = Object.keys(it.grants); assert.equal(g.length, 1); assert.ok(['outfit', 'furniture'].includes(g[0]), k);
  if (it.grants.outfit) { const o = OUTFITS[it.grants.outfit]; assert.ok(o?.mall, k); assert.deepEqual(Object.keys(o).filter((x) => !['slot', 'name', 'price', 'mall', 'full', 'look'].includes(x)), [], `${k}: no stat fields`); assert.equal(buyOutfit({ bones: 1e9, wardrobe: { owned: [], equipped: {} } }, it.grants.outfit).ok, false, 'not for Bones');
    const a = OUTFIT_ATLAS.items[it.grants.outfit]; assert.ok(a && a.coats.length === 6, `${k} art`); }
  if (it.grants.furniture) { const f = FURNITURE[it.grants.furniture]; assert.ok(f?.mall, k); assert.ok(!f.store, `${k} not in the Bones/royal furniture stores`); assert.deepEqual(Object.keys(f).filter((x) => !['name', 'w', 'h', 'price', 'color', 'layer', 'mall', 'draw'].includes(x)), [], `${k}: no stat fields`); } } });

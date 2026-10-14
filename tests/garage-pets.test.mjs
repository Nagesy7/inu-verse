import test from 'node:test'; import assert from 'node:assert/strict';
const { CAR_MODELS, buyCar, ensureGarage } = await import('../src/garage.js');
const { PETS, buyPet, activePet, followStep } = await import('../src/pets.js');
const { ensureMall, OWNER_WALLET } = await import('../src/mall.js');
const { setWallet, SimWallet, TREASURY } = await import('../src/wallet.js');
const { BUILDINGS, MALL_BUILDINGS, doorTile, isSolid, findPath, interactables } = await import('../src/world.js');
const S = () => ({ bones: 2000, kibble: 200, inventory: {} });
test('6-10 distinct car models across both dealers', () => { const ms = Object.values(CAR_MODELS); assert.ok(ms.length >= 6 && ms.length <= 10); assert.equal(new Set(ms.map((m) => m.kind)).size, ms.length);
  assert.ok(ms.some((m) => m.dealer === 'cars' && m.cur === 'bones')); assert.ok(ms.some((m) => m.dealer === 'luxauto' && m.cur === 'kibble')); });
test('everyday car costs bones; luxury car costs KIBBLE + 2% split to treasury', () => { const s = S(); assert.ok(buyCar(s, 'hatch', 'Blue').ok); assert.equal(s.bones, 1600);
  const r = buyCar(s, 'supercar', 'Gold'); assert.ok(r.ok); assert.ok(Math.abs(s.kibble - (200 - 90 * 1.02)) < 1e-9); const m = ensureMall(s); assert.equal(m.ledger[0].to, OWNER_WALLET); assert.equal(m.treasury, 900000); assert.equal(m.pools.weekly, 450000);
  assert.equal(ensureGarage(s).cars.length, 2); assert.equal(buyCar({ bones: 1, kibble: 0 }, 'sedan').ok, false); });
test('pets: common for bones, exotic for KIBBLE via the swappable wallet adapter', async () => { const s = S(); assert.ok(buyPet(s, 'kitten', 'Miso').ok); assert.equal(s.bones, 1850); assert.equal(activePet(s).name, 'Miso');
  let called = null; setWallet({ ...SimWallet, purchaseSync(o) { called = o; return SimWallet.purchaseSync(o); } }); assert.ok(buyPet(s, 'dragon').ok); assert.equal(called.itemId, 'pet-dragon'); setWallet(null);
  assert.equal(TREASURY, 'BzLYTFAfUsjzQ5x8bx5BbPK4DFtaHrLCuferkvkxTNGJ'); assert.equal(Object.values(PETS).filter((p) => p.exotic).length, 7); assert.equal(Object.values(PETS).filter((p) => !p.exotic).length, 5);
  const f = { x: 0, y: 0 }; for (let i = 0; i < 60; i++) followStep(f, 200, 0, 0.05); assert.ok(f.x > 150 && f.x < 190); });
test('every (varied) door interact tile is walkable and reachable', () => { for (const b of [...BUILDINGS, ...MALL_BUILDINGS]) { const d = doorTile(b); assert.equal(isSolid(d.tx, d.ty), false, b.id); assert.ok(findPath(4, 19, d.tx, d.ty), 'reach ' + b.id); }
  const sides = new Set([...BUILDINGS, ...MALL_BUILDINGS].map((b) => doorTile(b).side)); assert.ok(sides.has('left') && sides.has('right') && sides.has('front')); assert.ok(interactables().length > 10); });

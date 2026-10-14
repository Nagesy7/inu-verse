import test from 'node:test'; import assert from 'node:assert/strict';
import { OUTFITS, SLOTS, buyOutfit, equipOutfit, unequipSlot, ensureWardrobe, outfitLook, owns } from '../src/outfits.js';
import { newGame, COATS, normalizeCoat } from '../src/game.js';
import { save, load, MemoryStorage, SAVE_KEY } from '../src/save.js';
import { BUILDINGS, interactables } from '../src/world.js';

test('six starter coats only', () => {
  assert.deepEqual(Object.keys(COATS), ['tan', 'cream', 'red', 'dark', 'golden', 'gray']);
  assert.equal(normalizeCoat('sesame'), 'tan'); assert.equal(normalizeCoat('black'), 'dark'); assert.equal(normalizeCoat('nope'), 'tan');
  assert.equal(newGame({ coat: 'golden' }).player.coat, 'golden');
});
test('catalog covers required clothing and valid slots', () => {
  for (const d of Object.values(OUTFITS)) { assert.ok(SLOTS.includes(d.slot)); assert.ok(d.price > 0); }
  for (const id of ['cap_red', 'suit_navy', 'tux_black', 'hoodie_maroon', 'jacket_black', 'gown_white', 'hawaiian', 'shades', 'chain_gold', 'sneakers_red']) assert.ok(OUTFITS[id], id);
});
test('buy deducts bones, rejects duplicates and insufficient funds', () => {
  const s = newGame(); const b0 = s.bones;
  assert.equal(buyOutfit(s, 'cap_red').ok, true); assert.equal(s.bones, b0 - OUTFITS.cap_red.price); assert.ok(owns(s, 'cap_red'));
  assert.equal(buyOutfit(s, 'cap_red').reason, 'Already owned');
  s.bones = 10; const r = buyOutfit(s, 'tux_black'); assert.equal(r.ok, false); assert.equal(s.bones, 10); assert.ok(!owns(s, 'tux_black'));
  assert.equal(buyOutfit(s, 'bogus').ok, false);
});
test('equip requires ownership; slots replace; gown clears bottoms', () => {
  const s = newGame(); s.bones = 5000;
  assert.equal(equipOutfit(s, 'suit_navy').ok, false);
  for (const id of ['suit_navy', 'tux_black', 'slacks_navy', 'gown_white', 'cap_red']) buyOutfit(s, id);
  equipOutfit(s, 'suit_navy'); equipOutfit(s, 'slacks_navy'); equipOutfit(s, 'cap_red');
  assert.deepEqual(s.wardrobe.equipped, { top: 'suit_navy', bottom: 'slacks_navy', hat: 'cap_red' });
  equipOutfit(s, 'tux_black'); assert.equal(s.wardrobe.equipped.top, 'tux_black');
  equipOutfit(s, 'gown_white'); assert.equal(s.wardrobe.equipped.bottom, undefined);
  equipOutfit(s, 'slacks_navy'); assert.equal(s.wardrobe.equipped.top, undefined);
  assert.equal(unequipSlot(s, 'hat').ok, true); assert.equal(unequipSlot(s, 'hat').ok, false);
  assert.equal(outfitLook(s.wardrobe.equipped).bottom.c, OUTFITS.slacks_navy.look.c);
});
test('wardrobe survives save/load; old saves migrate', () => {
  const st = new MemoryStorage(); const s = newGame({ name: 'Kabo', coat: 'red' }); s.bones = 2000;
  buyOutfit(s, 'hoodie_maroon'); buyOutfit(s, 'chain_gold'); equipOutfit(s, 'hoodie_maroon'); equipOutfit(s, 'chain_gold');
  save(s, st); const l = load(st);
  assert.deepEqual(l.wardrobe, { owned: ['hoodie_maroon', 'chain_gold'], equipped: { top: 'hoodie_maroon', neck: 'chain_gold' } }); assert.equal(l.bones, s.bones);
  const old = JSON.parse(JSON.stringify(s)); delete old.wardrobe; old.player.coat = 'sesame'; st.setItem(SAVE_KEY, JSON.stringify(old));
  const m = load(st); assert.deepEqual(m.wardrobe, { owned: [], equipped: {} }); assert.equal(m.player.coat, 'tan');
  const bad = JSON.parse(JSON.stringify(s)); bad.wardrobe.equipped.hat = 'cap_red'; st.setItem(SAVE_KEY, JSON.stringify(bad));
  assert.equal(load(st).wardrobe.equipped.hat, undefined, 'unowned equip stripped');
  ensureWardrobe(m);
});
test('Fetch Fashion is a reachable building', () => {
  assert.ok(BUILDINGS.find((b) => b.id === 'fashion'));
  assert.ok(interactables(newGame()).find((i) => i.id === 'fashion'));
});

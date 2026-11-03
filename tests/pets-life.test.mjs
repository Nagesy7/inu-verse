// Pets & companions (src/petlife.js): free starter, Bones-only pet gear, emote reactions, idles, multiplayer cosmetic field,
// remote-pet caps for phones / ?fx=low. No $KIBBLE pricing, no wagers or fees.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as PL from '../src/petlife.js';
import { PETS, buyPet, activePet, ensurePets } from '../src/pets.js';
import { cleanLook } from '../src/mpshared.js';

const fresh = (bones = 1000) => ({ bones, pets: null });

test('one free starter, claimed once, cannot be bought', () => {
  const s = fresh(0); assert.equal(PL.canClaimStarter(s), true);
  const r = PL.claimStarter(s, 'Quackers'); assert.ok(r.ok); assert.equal(r.pet.species, PL.STARTER); assert.equal(s.bones, 0);
  assert.equal(activePet(s).name, 'Quackers'); assert.equal(PL.canClaimStarter(s), false); assert.equal(PL.claimStarter(s).ok, false);
  assert.equal(PETS[PL.STARTER].price, 0); assert.equal(PETS[PL.STARTER].cur, 'bones');
  assert.equal(buyPet(fresh(), PL.STARTER).ok, false);
  assert.equal(PETS.minipup.cur, 'bones');
});

test('pet gear costs Bones (or is free), is season-gated and equips on the active pet', () => {
  for (const [id, g] of Object.entries(PL.PET_GEAR)) { assert.ok(Number.isInteger(g.price) && g.price >= 0, id); assert.ok(g.slot === 'collar' || g.slot === 'hat', id); assert.equal(g.cur, undefined); }
  const s = fresh(30); PL.claimStarter(s);
  assert.equal(PL.buyGear(s, 'cg').ok, false, 'not enough bones');
  const r = PL.buyGear(s, 'cr'); assert.ok(r.ok); assert.equal(s.bones, 5); assert.equal(PL.buyGear(s, 'cr').ok, false, 'owned once');
  assert.ok(PL.equipGear(s, 'cr').ok); assert.equal(activePet(s).gear.collar, 'cr');
  assert.ok(PL.equipGear(s, null, 'collar').ok); assert.equal(activePet(s).gear.collar, null);
  globalThis.__season = 'halloween'; try { assert.equal(PL.gearOnSale('hs'), false); assert.equal(PL.gearOnSale('hw'), true); } finally { delete globalThis.__season; globalThis.__seasonDirty = true; }
  globalThis.__season = 'xmas'; try { const t = fresh(0); PL.claimStarter(t); assert.ok(PL.buyGear(t, 'hs').ok, 'free xmas hat'); assert.equal(PL.buyGear(t, 'hw').ok, false, 'out of season'); } finally { delete globalThis.__season; globalThis.__seasonDirty = true; }
});

test('wire field round-trips and survives the server look cleaner', () => {
  const pet = { species: 'duckling', gear: { collar: 'cr', hat: 'hp' } };
  const w = PL.petWire(pet); assert.equal(w, 'duckling-cr-hp'); assert.deepEqual(PL.fromPetWire(w), { species: 'duckling', gear: { collar: 'cr', hat: 'hp' } });
  assert.equal(PL.fromPetWire('griffin-cr-x'), null); assert.equal(PL.fromPetWire('kitten-zz-x').gear.collar, null); assert.equal(PL.fromPetWire(42), null);
  const pl = PL.withPetLook({ look: { fur: 'tan' }, outfit: {} }, pet); assert.equal(pl.look[PL.WIRE_KEY], w);
  const full = { look: Object.fromEntries(Array.from({ length: 12 }, (_, i) => ['k' + i, 'v'])), outfit: {} };
  assert.equal(PL.withPetLook(full, pet).look[PL.WIRE_KEY], undefined, 'never pushes a real look key out');
  const c = cleanLook({ coat: 'tan', eq: {}, pl }); assert.equal(c.pl.look[PL.WIRE_KEY], w);
  assert.equal(PL.withPetLook(null, pet).look[PL.WIRE_KEY], w); assert.equal(PL.withPetLook(null, null), null);
});

test('emotes trigger reactions; idles progress sniff → sit → nap; reduced effects stays still', () => {
  const f = { x: 0, y: 0, moving: false };
  PL.petReact(f, 'heart', 1); assert.equal(f.react.kind, 'love');
  PL.petReact(f, 'dance', 2); assert.equal(f.react.kind, 'spin');
  PL.petReact(f, 'sleep', 3); assert.equal(f.react.kind, 'nap');
  const g = { moving: false }; for (let i = 0; i < 160; i++) PL.petIdle(g, i * 0.1, 0.1, false); assert.equal(g.idle, 'nap');
  assert.equal(PL.petPose(g, 16, false).zz, true);
  PL.petIdle(g, 17, 0.1, true); assert.equal(g.idle, null);
  const h = {}; PL.petReact(h, 'dance', 0); const lo = PL.petPose(h, 0.3, true); assert.equal(lo.hop, 0); assert.equal(lo.flip, 1);
});

test('remote pets are capped (8 full, 3 low) and nearest first', () => {
  const M = new Map(), owners = Array.from({ length: 20 }, (_, i) => ({ id: 'p' + i, x: i * 50, y: 0, pet: { species: 'kitten', gear: {} } }));
  const follow = (f, x, y) => { f.x = x; f.y = y; };
  assert.equal(PL.stepRemotePets(M, owners, 0.016, { follow, me: { x: 0, y: 0 } }).length, PL.REMOTE_CAP.full);
  const lo = PL.stepRemotePets(M, owners, 0.016, { low: true, follow, me: { x: 0, y: 0 } }); assert.equal(lo.length, PL.REMOTE_CAP.low);
  assert.deepEqual(lo.map((r) => r.o.id), ['p0', 'p1', 'p2']); assert.ok(M.size <= PL.REMOTE_CAP.full);
  assert.equal(PL.stepRemotePets(M, [{ id: 'q', x: 0, y: 0 }], 0.016, { follow }).length, 0);
});

test('no $KIBBLE pricing, wagers or fees in pet life; wiring present in main.js / multiplayer.js', () => {
  const src = fs.readFileSync(new URL('../src/petlife.js', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(src, /kibble|wager|purchaseSync|treasury|fee/i);
  const main = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /PL\.petIdle\(petF/); assert.match(main, /PL\.petReact\(petF/); assert.match(main, /PL\.drawPetGear\(/);
  assert.match(main, /PL\.withPetLook\(cpLook\(/); assert.match(main, /PL\.claimStarter\(/); assert.match(main, /remotePetActors\(mpActs\)/);
  const mp = fs.readFileSync(new URL('../src/multiplayer.js', import.meta.url), 'utf8');
  assert.match(mp, /fromPetWire\(/); assert.match(mp, /delete l\.pl\.look\[PET_KEY\]/);
});

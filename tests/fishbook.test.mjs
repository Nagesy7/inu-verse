import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as FB from '../src/fishbook.js';
import { fishCatch, ensureFarm, GOODS } from '../src/farm.js';
import { FURNITURE } from '../src/furniture.js';

const fresh = () => ({ bones: 100, inventory: {} });

test('every species maps to an existing farm good, has a rarity and a sane size range', () => {
  assert.ok(FB.SPECIES.length >= 12);
  for (const sp of FB.SPECIES) { assert.ok(GOODS[sp.good], sp.id); assert.ok(FB.RARITY[sp.rarity], sp.id); assert.ok(sp.min > 0 && sp.max > sp.min, sp.id); }
  assert.equal(new Set(FB.SPECIES.map((s) => s.id)).size, FB.SPECIES.length);
});

test('species pool respects night / rain / season and the pick is deterministic + rarity weighted', () => {
  const day = { night: false, rain: false, season: 'autumn' };
  assert.deepEqual(FB.pool('koi', day).map((s) => s.id), ['golden_koi', 'kohaku_koi']);
  assert.ok(FB.pool('koi', { ...day, night: true }).some((s) => s.id === 'moonlit_koi'));
  assert.ok(FB.pool('koi', { ...day, rain: true }).some((s) => s.id === 'rainbow_koi'));
  assert.ok(!FB.pool('minnow', day).some((s) => s.id === 'snow_smelt')); assert.ok(FB.pool('minnow', { ...day, season: 'winter' }).some((s) => s.id === 'snow_smelt'));
  assert.equal(FB.pickSpecies('carp', 0.1, day).id, FB.pickSpecies('carp', 0.1, day).id);
  const n = {}; for (let i = 0; i < 1000; i++) { const s = FB.pickSpecies('minnow', i / 1000, { night: true, season: 'spring' }); n[s.rarity] = (n[s.rarity] || 0) + 1; }
  assert.ok(n.common > n.rare && n.rare > 0);
  assert.equal(FB.pickSpecies('nope', 0.5, day), null);
});

test('size grows with luck and a quick reel, stays inside the species range', () => {
  const sp = FB.BY_ID.pond_carp;
  assert.equal(FB.rollSize(sp, 0, 0.9), sp.min); assert.equal(FB.rollSize(sp, 1, 0), sp.max);
  assert.ok(FB.rollSize(sp, 0.5, 0.1) > FB.rollSize(sp, 0.5, 0.8));
  for (const r of [-1, 2]) { const z = FB.rollSize(sp, r, 5); assert.ok(z >= sp.min && z <= sp.max); }
});

test('recordCatch tracks counts, biggest size, first catch and records', () => {
  const s = fresh();
  let r = FB.recordCatch(s, 'pond_carp', 40, 1000); assert.ok(r.first); assert.ok(!r.record);
  r = FB.recordCatch(s, 'pond_carp', 35); assert.ok(!r.first && !r.record);
  r = FB.recordCatch(s, 'pond_carp', 52.5); assert.ok(r.record);
  assert.deepEqual(s.fishbook.caught.pond_carp, { n: 3, best: 52.5, first: 1000 });
  assert.deepEqual(FB.summary(s), { seen: 1, total: FB.SPECIES.length, catches: 3 });
  assert.equal(FB.recordCatch(s, 'shark', 9), null);
});

test('completing sets unlocks cosmetic badge + title (and the full book a home trophy), never Bones', () => {
  const s = fresh();
  for (const id of FB.SETS.koikeeper.need) FB.recordCatch(s, id, 60);
  assert.ok(s.fishbook.sets.koikeeper); assert.ok(s.engage.badges.includes('🏮')); assert.equal(s.bones, 100);
  assert.deepEqual(FB.titlesOf(s), ['Koi Keeper']);
  assert.equal(FB.setTitle(s, 'Master Angler').ok, false); assert.ok(FB.setTitle(s, 'Koi Keeper').ok); assert.equal(FB.titleOf(s), 'Koi Keeper');
  let got = []; for (const sp of FB.SPECIES) got.push(...FB.recordCatch(s, sp.id, sp.max).sets.map((p) => p.id));
  assert.ok(got.includes('master') && got.includes('smallfry') && got.includes('carpclub') && got.includes('nightowl') && !got.includes('koikeeper'));
  assert.equal(s.inventory.trophy_fish, 1); assert.ok(FURNITURE.trophy_fish?.trophy); assert.equal(s.bones, 100);
  assert.equal(FB.checkSets(s).length, 0); assert.equal(s.inventory.trophy_fish, 1); // idempotent
  assert.ok(FB.setTitle(s, null).ok); assert.equal(FB.titleOf(s), null);
});

test('farm catch economy unchanged: the good still lands in the farm inventory', () => {
  const s = fresh(); const r = fishCatch(s, 0.99, 0.05); assert.equal(r.item, 'koi'); assert.equal(ensureFarm(s).inv.koi, 1);
  const sp = FB.pickSpecies(r.item, 0.3, { night: false, rain: false, season: 'spring' }); assert.equal(sp.good, 'koi');
});

test('survives a save round trip and the UI + menu are wired (no $KIBBLE / wallet in the book)', () => {
  const s = fresh(); FB.recordCatch(s, 'glow_minnow', 7.5); const back = JSON.parse(JSON.stringify(s)); assert.equal(back.fishbook.caught.glow_minnow.best, 7.5); assert.equal(FB.summary(back).seen, 1);
  const ui = readFileSync(new URL('../src/fishbookui.js', import.meta.url), 'utf8'), lib = readFileSync(new URL('../src/fishbook.js', import.meta.url), 'utf8');
  assert.ok(!/wallet|purchase|kibble-pay/i.test(ui + lib)); assert.match(ui, /'\?\?\?'/);
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8'), menu = readFileSync(new URL('../src/hudmenu.js', import.meta.url), 'utf8'), html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(main, /kind === 'fishbook'/); assert.match(menu, /'btn-fishbook'/); assert.match(html, /id="btn-fishbook"/);
});

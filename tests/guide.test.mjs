import test from 'node:test'; import assert from 'node:assert/strict';
import * as GD from '../src/guide.js';
import { BUILDINGS, MALL_BUILDINGS, GAME_DOORS, ARCADE, PLOTS, NPC_HOMES, FIELDS, isSolid, findPath, interactables } from '../src/world.js';
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), m }; };
const W = 'BzLYTFAfUsjzQ5x8bx5BbPK4DFtaHrLCuferkvkxTNGJ', W2 = '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin';
test('tour triggers on first visit only (device flag)', () => {
  const ls = mem(); assert.equal(GD.shouldStartTour({ ls }), true);
  GD.markTourSeen({ ls, how: 'skipped' }); assert.equal(GD.shouldStartTour({ ls }), false); assert.match(ls.getItem(GD.TOUR_KEY), /^skipped:/);
});
test('tour per wallet: signed-in wallet with the profile flag is not toured again on a new device', () => {
  assert.equal(GD.shouldStartTour({ ls: mem(), wallet: W, profile: { cosmetics: [GD.TOUR_MARK] } }), false);
  assert.equal(GD.shouldStartTour({ ls: mem(), wallet: W, profile: { cosmetics: [] } }), true);
  const ls = mem(); ls.setItem(GD.TOUR_KEY + ':' + W, 'done'); assert.equal(GD.shouldStartTour({ ls, wallet: W }), false); assert.equal(GD.shouldStartTour({ ls, wallet: W2 }), true);
  assert.equal(GD.shouldStartTour({ ls: mem(), wallet: 'local-kabosu-1', profile: { cosmetics: [GD.TOUR_MARK] } }), true, 'local (unsigned) ids are not wallets');
  const s = {}; const l2 = mem(); GD.markTourSeen({ ls: l2, wallet: W, how: 'done', state: s }); assert.equal(s.tourDone, 'done'); assert.ok(l2.getItem(GD.TOUR_KEY + ':' + W));
});
test('profile carries the per-wallet tour flag once the tour is seen', async () => {
  const { profileFromState } = await import('../src/profile.js'); const { newGame } = await import('../src/game.js');
  const s = newGame({ name: 'Mochi', coat: 'tan' }); assert.ok(!profileFromState(s).cosmetics.includes(GD.TOUR_MARK)); s.tourDone = 'done'; assert.ok(profileFromState(s).cosmetics.includes(GD.TOUR_MARK));
});
test('places registry covers every door/building and every interactable, all reachable', () => {
  const s = { plots: {} }, P = GD.places(s), ids = new Set(P.map((p) => p.kind + ':' + p.id));
  for (const b of BUILDINGS) assert.ok(ids.has('building:' + b.id), b.id);
  for (const b of MALL_BUILDINGS) assert.ok(ids.has('mall:' + b.id), b.id);
  for (const g of GAME_DOORS) assert.ok(ids.has('gamedoor:' + g.id), g.id); assert.ok(ids.has('arcade:' + ARCADE.id));
  for (const p of PLOTS) assert.ok(ids.has('plot:' + p.id)); for (const h of NPC_HOMES) assert.ok(ids.has('visit:' + h.id)); for (const f of FIELDS) assert.ok(ids.has('field:' + f.id));
  for (const id of ['leaders', 'board', 'pools', 'burn', 'quests', 'bb1', 'bb2', 'barn', 'market', 'chapel']) assert.ok(P.some((p) => p.id === id), id);
  for (const it of interactables(s)) if (it.kind !== 'stall') assert.ok(ids.has(it.kind + ':' + it.id), 'interactable ' + it.id);
  for (const p of P) { assert.ok(GD.GROUPS.includes(p.group), p.id); assert.equal(isSolid(p.tx, p.ty), false, 'stand tile ' + p.id); assert.ok(findPath(4, 19, p.tx, p.ty), 'reach ' + p.id); }
});
test('tour steps all resolve to a place (or the player) and cover the requested topics', () => {
  const s = { plots: {} }; for (const st of GD.TOUR) assert.ok(!st.place || GD.stepPlace(s, st), st.place);
  const all = GD.TOUR.map((t) => t.title + ' ' + t.text).join(' ').toLowerCase();
  for (const w of ['wasd', 'stick', 'mall', 'arcade', 'rescue', 'trainer gate', 'leaderboards', 'prize', 'café', 'jobs', 'plot', 'vip', 'burn', 'billboard', 'places', 'guide']) assert.ok(all.includes(w), w);
  assert.equal(GD.stepPlace({ plots: { p3: {} } }, { place: 'home' }) !== null, true);
});
test('search + grouping + map pick + arrival', () => {
  const P = GD.places({ plots: {} });
  assert.equal(GD.searchPlaces(P, 'trainer')[0].id, 'quest'); assert.ok(GD.searchPlaces(P, 'jobs').some((p) => p.id === 'cafe')); assert.ok(GD.searchPlaces(P, 'vip').some((p) => p.id === 'pools'));
  assert.equal(GD.searchPlaces(P, 'zzzz').length, 0); assert.equal(GD.grouped(P)[0][0], 'Featured'); assert.deepEqual(GD.grouped(P)[0][1].map((p) => p.id), ['launch', 'bank']); assert.ok(GD.grouped(P)[0][1].every((p) => p.featured));
  const arc = P.find((p) => p.id === 'arcade'); assert.equal(GD.placeAt(P, arc.fx, arc.fy).id, 'arcade');
  assert.equal(GD.arrived((arc.tx + 0.5) * 32, (arc.ty + 0.5) * 32, arc), true); assert.equal(GD.arrived(0, 0, arc), false);
  const path = GD.guidePath(4.5 * 32, 19.5 * 32, arc); assert.ok(path && path.length > 5); assert.match(GD.distLabel(path, 0, 0, arc), /^\d+ m$/);
});
test('Launch Hall is the highlight (early, honest "simulated"), Kibble Bank featured second; first arrow after the tour -> Launch Hall', async () => {
  assert.equal(GD.TOUR[1].place, 'launch'); assert.ok(GD.TOUR[1].highlight); assert.match(GD.TOUR[1].text, /SIMULATION/); assert.match(GD.TOUR[1].text, /no real money/);
  assert.equal(GD.TOUR[2].place, 'bank'); assert.ok(GD.TOUR[2].featured); assert.match(GD.TOUR[2].text, /No deposits, lending or yield/);
  assert.equal(GD.TOUR.filter((t) => t.highlight).length, 1, 'only one main highlight'); assert.ok(GD.TOUR.some((t) => t.place === 'market' && !t.highlight), 'markets stay in, not the highlight');
  assert.equal(GD.AFTER_TOUR, 'launch'); const { BANK, isSolid, findPath } = await import('../src/world.js');
  assert.equal(isSolid(BANK.x + 1, BANK.y + 1), true); assert.equal(isSolid(BANK.door.tx, BANK.door.ty), false); assert.ok(findPath(4, 19, BANK.door.tx, BANK.door.ty));
  const b = GD.placeById({ plots: {} }, 'bank'); assert.equal(b.group, 'Featured'); assert.ok(b.featured); assert.ok(GD.searchPlaces(GD.places({ plots: {} }), 'history').some((p) => p.id === 'bank'));
});

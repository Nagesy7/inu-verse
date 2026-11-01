// Club features: Kennel, Pet Pups, Stamp Book, monthly parties, pin hunts, Inu Times; save v1 -> v2 migration.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { newGame, placeFurniture, moveFurniture, storeFurniture, sellPlaced, sellFromInventory, buyFurniture } from '../src/game.js';
import { save, load, MemoryStorage, SAVE_KEY } from '../src/save.js';
import { SAVE_V, KENNEL_ID, ensureClub, kennelOf, roomOf, migrateSave, STARTER_KENNEL } from '../src/club/state.js';
import { STAMPS, award, visit, book, stampCount, hasStamp, EXPLORER_N } from '../src/club/stamps.js';
import { partyAt, nextParty, claimItem, attend, sydneyYMD, PARTIES, BOOTH } from '../src/club/parties.js';
import { huntAt, huntSpots, pinsOfHunt, collect, foundIn, PINS, HUNT_ROOMS, HUNT_DAYS, reachable } from '../src/club/hunts.js';
import { adoptPup, feedPup, playPup, walkPup, homePup, renamePup, careNow, mood, pupsOf, ADOPT_PRICE, SNACK_PRICE, MAX_PUPS, PUP_COATS } from '../src/club/pups.js';
import { edition } from '../src/club/times.js';
import { ICONS, PARTY_SPRITES } from '../src/club/iconmap.js';
import { FURNITURE } from '../src/furniture.js';
import { tradeInfo } from '../src/trade.js';
import { scene as sceneOf, solidAt } from '../src/scenes.js';
import { interactables, isSolid } from '../src/world.js';

const T = (iso) => Date.parse(iso);

test('new games are save v2 with the club slice and a starter Kennel', () => {
  const s = newGame({ name: 'Kabosu' }); assert.equal(s.v, SAVE_V); assert.equal(SAVE_V, 2);
  const c = ensureClub(s); assert.deepEqual(Object.keys(c.stamps), []); assert.equal(kennelOf(s).items.length, STARTER_KENNEL.length);
  assert.ok(kennelOf(s).items.every((it) => FURNITURE[it.id]), 'starter items exist'); assert.equal(new Set(kennelOf(s).items.map((i) => i.uid)).size, STARTER_KENNEL.length);
  const st = new MemoryStorage(); save(s, st); const l = load(st); assert.equal(l.v, 2); assert.equal(kennelOf(l).items.length, STARTER_KENNEL.length);
});
test('a v1 save loads, migrates to v2 and keeps everything', () => {
  const s = newGame({ name: 'Old' }); delete s.club; s.v = 1; s.bones = 777; s.plots.p1 = { wall: 1, floor: 2, items: [{ uid: 1, id: 'bed', x: 0, y: 0, rot: 0 }] };
  const st = new MemoryStorage(); st.setItem(SAVE_KEY, JSON.stringify(s)); const l = load(st);
  assert.equal(l.v, 2); assert.equal(l.bones, 777); assert.equal(l.plots.p1.items[0].id, 'bed'); assert.ok(l.club && kennelOf(l).items.length > 0);
  assert.equal(migrateSave(l), l); assert.equal(l.v, 2); // idempotent
  const bad = new MemoryStorage(); bad.setItem(SAVE_KEY, JSON.stringify({ ...s, v: 99 })); assert.equal(load(bad), null);
});
test('Kennel uses the normal furniture code paths', () => {
  const s = newGame(); assert.equal(roomOf(s, KENNEL_ID), kennelOf(s)); assert.equal(roomOf(s, 'p1'), undefined);
  s.bones = 1000; assert.ok(buyFurniture(s, 'lamp').ok); const r = placeFurniture(s, KENNEL_ID, 'lamp', 0, 5); assert.ok(r.ok, r.reason);
  assert.ok(moveFurniture(s, KENNEL_ID, r.item.uid, 1, 5, 0).ok); assert.ok(storeFurniture(s, KENNEL_ID, r.item.uid).ok); assert.equal(s.inventory.lamp, 1);
  assert.equal(placeFurniture(s, 'p3', 'lamp', 0, 5).ok, false, 'unowned plot still refused');
});
test('stamps: award once, visits, explorer and the 10-stamp stamp', () => {
  const s = newGame(); const t = T('2026-11-05T00:00:00Z');
  assert.equal(award(s, 'emote', t).length, 1); assert.equal(award(s, 'emote', t).length, 0); assert.equal(award(s, 'nope', t).length, 0);
  assert.deepEqual(visit(s, 'home:kennel', t), []); assert.ok(visit(s, 'cafe', t).some((x) => x.id === 'visit-cafe'));
  for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) visit(s, 'zone-' + id, t); assert.ok(ensureClub(s).visited.length >= EXPLORER_N); assert.ok(hasStamp(s, 'explorer'));
  for (const x of STAMPS) award(s, x.id, t); assert.equal(stampCount(s), STAMPS.length); assert.ok(hasStamp(s, 'stamp-10'));
  assert.equal(book(s).flatMap((p) => p.stamps).length, STAMPS.length);
  for (const x of STAMPS) assert.ok(ICONS[x.icon], 'icon for stamp ' + x.id);
});
test('parties switch by Sydney month and the item is claimable once', () => {
  assert.equal(partyAt(T('2026-11-15T02:00:00Z')).key, 'jacaranda'); assert.equal(partyAt(T('2026-12-15T02:00:00Z')).key, 'summerlights');
  assert.equal(partyAt(T('2026-10-31T13:30:00Z')).key, 'jacaranda', '31 Oct 13:30 UTC = 1 Nov 00:30 in Sydney (AEDT)'); assert.equal(partyAt(T('2026-10-31T13:30:00Z')).daysLeft, 29);
  assert.equal(partyAt(T('2026-10-31T12:30:00Z')), null, '31 Oct 23:30 Sydney: not yet');
  assert.equal(partyAt(T('2026-10-15T00:00:00Z')), null); assert.equal(nextParty(T('2026-10-15T00:00:00Z')).key, 'jacaranda');
  assert.equal(partyAt(T('2026-11-15T00:00:00Z'), 'off'), null); assert.equal(partyAt(T('2026-10-15T00:00:00Z'), '12').key, 'summerlights');
  assert.deepEqual(sydneyYMD(T('2026-11-30T13:30:00Z')), { y: 2026, m: 12, d: 1 });
  const s = newGame(), p = partyAt(T('2026-11-03T00:00:00Z'));
  const r = claimItem(s, p, T('2026-11-03T00:00:00Z')); assert.ok(r.ok); assert.equal(s.inventory.jaca_lantern, 1); assert.ok(hasStamp(s, 'party-item') && hasStamp(s, 'party-attend'));
  assert.equal(claimItem(s, p, T('2026-11-04T00:00:00Z')).ok, false); assert.equal(s.inventory.jaca_lantern, 1);
  assert.equal(claimItem(s, null).ok, false); assert.ok(attend(s, p).length === 0);
  for (const q of Object.values(PARTIES)) { assert.ok(FURNITURE[q.item]?.party, q.item); assert.ok(PARTY_SPRITES['post_' + q.key] && PARTY_SPRITES['booth_' + q.key]); }
});
test('party items are keepsakes: cannot be sold or traded, and cost nothing', () => {
  const s = newGame(); s.inventory.jaca_lantern = 1; const b0 = s.bones;
  assert.equal(sellFromInventory(s, 'jaca_lantern').ok, false); assert.equal(s.bones, b0);
  const r = placeFurniture(s, KENNEL_ID, 'jaca_lantern', 0, 6); assert.ok(r.ok, r.reason); assert.equal(sellPlaced(s, KENNEL_ID, r.item.uid).ok, false);
  for (const id of ['jaca_lantern', 'star_garland']) { assert.equal(FURNITURE[id].price, 0); assert.ok(!tradeInfo(id)?.tradeable); }
});
test('party decor sits on walks / grass and the booth is a reachable interactable', () => {
  const b = interactables({ plots: {} }).find((i) => i.id === 'partybooth'); assert.deepEqual([b.tx, b.ty], BOOTH); assert.equal(isSolid(b.tx, b.ty), false);
  for (const [x, y] of PARTIES[11].posts.filter(([, y]) => y === 19)) assert.equal(isSolid(x, y), false, `post ${x},${y}`); // row-23 bunting ties onto the street trees
});
test('pin hunts rotate every 14 days with walkable, reachable hiding spots', () => {
  const h0 = huntAt(T('2026-11-01T00:00:00Z')), h1 = huntAt(T('2026-11-01T00:00:00Z') + HUNT_DAYS * 864e5); assert.equal(h1.n, h0.n + 1);
  assert.notDeepEqual(pinsOfHunt(h0.n).map((p) => p.id), pinsOfHunt(h1.n).map((p) => p.id));
  for (let n = 0; n < 12; n++) { const sp = huntSpots(n, sceneOf); assert.equal(sp.length, 3); assert.equal(new Set(sp.map((x) => x.room)).size, 3, 'distinct rooms');
    assert.deepEqual(huntSpots(n, sceneOf), sp, 'deterministic');
    for (const x of sp) { assert.ok(HUNT_ROOMS.includes(x.room)); const sc = sceneOf(x.room); assert.equal(solidAt(sc, x.tx, x.ty), false); assert.ok(reachable(sc).some(([a, b]) => a === x.tx && b === x.ty), `${x.room} ${x.tx},${x.ty}`); } }
  for (const p of PINS) assert.ok(ICONS[p.icon], 'icon ' + p.id);
});
test('collecting a pin works once per hunt, and again in a later hunt', () => {
  const s = newGame(), n = 3, [a, b, c] = pinsOfHunt(n);
  assert.ok(collect(s, n, a.id, 1).ok); assert.equal(collect(s, n, a.id, 2).ok, false); assert.ok(hasStamp(s, 'pin-first'));
  assert.equal(collect(s, n, 'not-in-hunt', 3).ok, false); collect(s, n, b.id, 4); const r = collect(s, n, c.id, 5); assert.ok(r.all); assert.ok(hasStamp(s, 'pin-all'));
  assert.deepEqual(foundIn(s, n).sort(), [a.id, b.id, c.id].sort()); assert.deepEqual(foundIn(s, n + 1), []);
  const again = pinsOfHunt(n + 4).find((p) => p.id === a.id); if (again) assert.ok(collect(s, n + 4, a.id, 6).ok);
});
test('pups: adopt for Bones (no KIBBLE), feed, play, decay, walk, cap', () => {
  const s = newGame(); s.bones = 1000; const k0 = s.kibble, t = T('2026-11-02T00:00:00Z');
  const r = adoptPup(s, 'mint', '  <b>Rex</b> ', t); assert.ok(r.ok); assert.equal(s.bones, 1000 - ADOPT_PRICE); assert.equal(s.kibble, k0); assert.equal(r.pup.name.includes('<'), false);
  assert.equal(r.pup.species, 'pup'); assert.deepEqual(r.pup.pal, PUP_COATS.mint.pal);
  assert.equal(mood(r.pup, t), 'happy'); const later = t + 24 * 3600e3; assert.equal(careNow(r.pup, later).food, 0); assert.equal(mood(r.pup, later), 'hungry');
  const f = feedPup(s, r.pup.id, later); assert.ok(f.ok); assert.equal(s.bones, 1000 - ADOPT_PRICE - SNACK_PRICE); assert.ok(careNow(r.pup, later).food >= 35);
  const b1 = s.bones; assert.ok(playPup(s, r.pup.id, later).ok); assert.equal(s.bones, b1, 'playing is free');
  homePup(s); assert.equal(s.pets.active, null); walkPup(s, r.pup.id); assert.equal(s.pets.active, r.pup.id); assert.ok(renamePup(s, r.pup.id, 'Bun').ok);
  while (pupsOf(s).length < MAX_PUPS) assert.ok(adoptPup(s, 'sky', 'P', t).ok); assert.equal(adoptPup(s, 'sky', 'P', t).ok, false);
  const poor = newGame(); poor.bones = ADOPT_PRICE - 1; assert.equal(adoptPup(poor, 'sky', 'X', t).ok, false); assert.equal(pupsOf(poor).length, 0);
  assert.ok(hasStamp(s, 'pup-adopt') && hasStamp(s, 'pup-pack'));
});
test('Inu Times: real features only, no prices or money talk beyond Bones', () => {
  for (const when of ['2026-11-10T00:00:00Z', '2026-10-10T00:00:00Z', '2027-01-10T00:00:00Z']) {
    const ed = edition(T(when)); const txt = JSON.stringify(ed);
    assert.ok(ed.stories.length >= 6); assert.doesNotMatch(txt, /\$|\bKIBBLE\b|\bSOL\b|USD|[Ww]allet|%|token/, when);
    for (const n of txt.match(/\d+ Bones/g) || []) assert.ok([`${ADOPT_PRICE} Bones`].includes(n), 'only real prices: ' + n);
    for (const st of ed.stories) assert.ok(st.h && st.body && st.how);
  }
  assert.equal(edition(T('2026-11-10T00:00:00Z')).no, 1); assert.equal(edition(T('2026-12-10T00:00:00Z')).no, 2);
  const src = fs.readFileSync(new URL('../src/club/times.js', import.meta.url), 'utf8'); assert.doesNotMatch(src, /Club Penguin|Puffle|Igloo|Coffee Shop|Herbert/i);
});
test('Club menu section lists the five club buttons', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8'), menu = fs.readFileSync(new URL('../src/hudmenu.js', import.meta.url), 'utf8');
  for (const id of ['btn-kennel', 'btn-pups', 'btn-stamps', 'btn-party', 'btn-times']) { assert.match(html, new RegExp(`id="${id}"`)); assert.match(menu, new RegExp(`'${id}'`)); }
});

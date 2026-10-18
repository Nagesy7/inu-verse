// Arcade Districts (contract /workspace/inu-shared/verse-districts.md v2): frozen ids, door URLs, return parsing, framed
// messages, gates, map/doors/spawns, fast travel, chunked ground + culled props, and no brand/gambling words.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as D from '../src/districts.js';
import { SCENES, scene, solidAt, spawnOf, HUB_GATES, walkInExits, nearestSpot, ST } from '../src/scenes.js';
import { isSolid, interactables } from '../src/world.js';

const CONTRACT = readFileSync('/workspace/inu-shared/verse-districts.md', 'utf8');
test('frozen district + cabinet ids match the contract (§2.1), arcade-row has the 8 live cabinets', () => {
  assert.deepEqual(D.DISTRICTS.map((d) => d.id), ['arcade-row', 'arena', 'fud-field', 'stadium', 'parkour', 'race-park']);
  const want = { 'arcade-row': ['kibble-chomp', 'bark-invaders', 'pup-crossing', 'bone-breaker', 'street-sniffer', 'paw-fu-tower', 'bone-digger', 'pips-big-bark'], arena: ['shiba-scuffle'], 'fud-field': ['fud-swarm'], stadium: ['zoomie-goals'], parkour: ['barkour'], 'race-park': ['last-pup-standing'] };
  for (const [d, ids] of Object.entries(want)) { assert.deepEqual(D.CABINETS.filter((c) => c.district === d).map((c) => c.id), ids, d); for (const id of ids) assert.ok(CONTRACT.includes('`' + id + '`'), id); }
  assert.ok(Object.isFrozen(D.CABINETS) && Object.isFrozen(D.CABINETS[0]));
});
test('gates: the 8 arcade-row cabinets + Shiba Scuffle are open; the other four are coming soon with generic labels', () => {
  assert.deepEqual(D.CABINETS.filter((c) => c.live).map((c) => c.id).sort(), ['bark-invaders', 'bone-breaker', 'bone-digger', 'kibble-chomp', 'paw-fu-tower', 'pips-big-bark', 'pup-crossing', 'shiba-scuffle', 'street-sniffer']);
  for (const id of ['fud-swarm', 'zoomie-goals', 'barkour', 'last-pup-standing']) { const c = D.cabinet(id); assert.equal(c.live, false); assert.equal(D.doorUrl(c), null); assert.equal(D.gateText(c), 'COMING SOON'); assert.match(D.label(c), /Cabinet$/); }
  assert.equal(D.label(D.cabinet('shiba-scuffle')), 'Shiba Scuffle'); assert.equal(D.label(D.cabinet('street-sniffer')), 'Cabinet 5');
  const S = SCENES.districts, data = JSON.stringify([S.name, S.spots.map((q) => [q.name, q.label, q.act.say]), S.npcs.map((q) => q.lines), D.CABINETS.map(D.label), D.DISTRICTS.map((d) => d.name)]); // working names stay off signage until named
  for (const w of ['FUD Swarm', 'Zoomie Goals', 'Barkour', 'Last Pup Standing', 'Street Sniffer', 'Paw-Fu', 'Bone Digger']) assert.ok(!data.toLowerCase().includes(w.toLowerCase()), w);
});
test('door URL = contract §3.3/§3.4 exactly (Kibble Chomp example, Zoomie Goals example once live); hints only', () => {
  assert.equal(D.doorUrl(D.cabinet('kibble-chomp')), 'https://inu-arcade.vercel.app/kibble-chomp?from=verse&district=arcade-row&spawn=door-kibble-chomp&return=https%3A%2F%2Finu-verse-tawny.vercel.app%2F%3Fspawn%3Ddoor-kibble-chomp%26district%3Darcade-row');
  assert.ok(CONTRACT.includes(D.doorUrl(D.cabinet('kibble-chomp'))));
  assert.ok(CONTRACT.includes(D.doorUrl({ ...D.cabinet('zoomie-goals'), live: true })));
  const s = D.doorUrl(D.cabinet('shiba-scuffle')); assert.ok(s.startsWith('https://inu-arcade.vercel.app/shiba-scuffle?from=verse&district=arena&spawn=door-shiba-scuffle&return='));
  assert.equal(new URL(new URL(s).searchParams.get('return')).origin, D.VERSE_ORIGIN);
  const w = 'BzLYTFAfUsjzQ5x8bx5BbPK4DFtaHrLCuferkvkxTNGJ', u = new URL(D.doorUrl(D.cabinet('kibble-chomp'), { wallet: w, p: 'eyJhIjoxfQ' }));
  assert.equal(u.searchParams.get('wallet'), w); assert.equal(u.searchParams.get('p'), 'eyJhIjoxfQ');
  const bad = new URL(D.doorUrl(D.cabinet('kibble-chomp'), { wallet: 'not a wallet; session=abc', p: '<script>' })); assert.equal(bad.searchParams.get('wallet'), null); assert.equal(bad.searchParams.get('p'), null);
  for (const k of new URL(s).searchParams.keys()) assert.ok(['from', 'district', 'spawn', 'return', 'wallet', 'p'].includes(k));
});
test('return: ?spawn=door-<id>&district=<id> resolves to that door; mismatches/unknown/junk ignored', () => {
  assert.deepEqual(D.parseReturn('?spawn=door-shiba-scuffle&district=arena'), { district: 'arena', cabinet: 'shiba-scuffle', spawn: 'door-shiba-scuffle' });
  assert.deepEqual(D.parseReturn('?spawn=door-kibble-chomp'), { district: 'arcade-row', cabinet: 'kibble-chomp', spawn: 'door-kibble-chomp' });
  assert.deepEqual(D.parseReturn('?district=stadium'), { district: 'stadium', cabinet: null, spawn: null });
  for (const q of ['?spawn=door-shiba-scuffle&district=stadium', '?spawn=door-nope&district=arena', '?spawn=arcade', '?spawn=rescue', '?district=moon', '?spawn=door-<x>', '', '%%%']) assert.equal(D.parseReturn(q), null, q);
  assert.equal(D.parseReturn(new URL(D.returnUrl(D.cabinet('pips-big-bark'))).search).cabinet, 'pips-big-bark');
  for (const c of D.CABINETS) { const sp = spawnOf('districts', D.spawnId(c)), [tx, ty] = [Math.floor(sp.x / ST), Math.floor(sp.y / ST)]; assert.ok(!solidAt(scene('districts'), tx, ty), c.id); assert.equal(scene('districts').spawns[D.spawnId(c)][1], D.DOOR_Y); }
});
test('framed messages: Arcade origin only; ready / exit (+close, +inu:back-to-verse) / score; score is sanitised UX only', () => {
  const O = D.ARCADE_ORIGIN, m = (data, origin = O) => D.arcadeMessage({ origin, data });
  assert.deepEqual(m({ type: 'inu-arcade:ready', cabinetId: 'shiba-scuffle', embed: true }), { kind: 'ready', cabinetId: 'shiba-scuffle' });
  for (const t of ['inu-arcade:exit', 'inu-arcade:close', 'inu:back-to-verse']) assert.equal(m({ type: t, cabinetId: 'arcade', reason: 'home' }).kind, 'exit', t);
  assert.deepEqual(m({ type: 'inu-arcade:score', cabinetId: 'kibble-chomp', score: 1234.9, mode: 'classic', durationMs: 5 }), { kind: 'score', cabinetId: 'kibble-chomp', score: 1234, mode: 'classic' });
  for (const bad of [{ type: 'inu-arcade:score', score: -1 }, { type: 'inu-arcade:score', score: 'lots' }, { type: 'inu-arcade:skin' }, { type: 'nope' }, null, 'inu-arcade:exit']) assert.equal(m(bad), null);
  assert.equal(m({ type: 'inu-arcade:exit' }, 'https://evil.example'), null); assert.equal(m({ type: 'inu-arcade:ready' }, D.VERSE_ORIGIN), null);
  assert.equal(m({ type: 'inu-arcade:ready', cabinetId: '<img>' }).cabinetId, null);
  const t = D.scoreToast(m({ type: 'inu-arcade:score', cabinetId: 'shiba-scuffle', score: 4200 })); assert.match(t, /Shiba Scuffle: 4,200 points/); assert.ok(!/bone|kibble|prize|\$/i.test(t));
  const src = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8'), at = src.indexOf("m.kind === 'score'"); assert.ok(at > 0); assert.ok(!/bones|kibble|addScore|award|grant/i.test(src.slice(at, at + 120)), 'score handler is a toast only');
});
test('zone: doors in alcoves (walk in from the sidewalk), spots reachable, signage + fast travel posts per district, hub gate open', () => {
  const sc = scene('districts'); assert.equal(sc.w, D.W); assert.equal(sc.h, D.H); assert.ok(sc.map.every((r) => r.length === D.W));
  const walk = walkInExits(sc); for (const c of D.CABINETS) { const [x, y] = D.doorOf(c.id); assert.ok(!solidAt(sc, x, y)); assert.ok(solidAt(sc, x - 1, y) && solidAt(sc, x + 1, y) && solidAt(sc, x, y - 1), c.id + ' alcove'); assert.ok(walk.some((e) => e.spot.act.opts?.id === c.id), c.id + ' walk-in');
    assert.equal(nearestSpot(sc, (x + 0.5) * ST, (y + 0.5) * ST).act.opts.id, c.id); }
  for (const d of D.DISTRICTS) { assert.ok(sc.spots.some((s) => s.id === 'kiosk-' + d.id && s.act.panel === 'fasttravel')); assert.ok(sc.spots.some((s) => s.id === 'sign-' + d.id)); assert.equal(sc.at(d.x0 + 1, D.DOOR_Y + 1).prop, 'dsign'); assert.ok(sc.spawns['d-' + d.id]); }
  assert.deepEqual(D.fastTravel().map((f) => f.id), [...D.DISTRICTS.map((d) => d.id), 'town']); assert.equal(D.fastTravel()[1].open, 1);
  const g = HUB_GATES.find((q) => q.id === 'arcade'); assert.ok(g && g.to === 'districts'); assert.ok(!isSolid(g.tx, g.ty) && !isSolid(g.out[0], g.out[1])); assert.equal(sc.exits[0].gate, 'arcade');
  assert.ok(interactables(null).some((i) => i.kind === 'shuttle' && !isSolid(i.tx, i.ty)));
  for (let x = 1; x < D.W - 1; x++) assert.ok(!solidAt(sc, x, D.ROAD + 1), 'boulevard open at ' + x); // one continuous road through every district
});
// minimal canvas stand-in so the chunk baker runs headless
class FakeCanvas { constructor(w, h) { this.width = w; this.height = h; } getContext() { return new Proxy({}, { get: (_, k) => (k === 'measureText' ? () => ({ width: 10 }) : () => {}), set: () => true }); } }
test('chunked ground: only chunks in view are baked/blitted, LRU-capped; props are culled to the view in x and y', async () => {
  globalThis.OffscreenCanvas = FakeCanvas; const A = await import('../src/sceneart.js'); const sc = scene('districts');
  let blits = 0; const c = { drawImage: () => { blits++; } }; const vw = 844 / 2, vh = 390 / 2; // phone landscape at zoom 2
  const n = A.drawSceneGround(c, sc, false, 40 * ST, 0, 40 * ST + vw, vh); assert.ok(n >= 1 && n <= 4, `blitted ${n}`); assert.equal(blits, n);
  for (let x = 0; x < D.W * ST; x += 200) A.drawSceneGround(c, sc, false, x, 300, x + vw, 300 + vh); assert.ok(A.chunkStats().cached <= 24);
  const all = A.scenePropsIn(sc, 0, false, -1e6, -1e6, 1e6, 1e6).length, view = A.scenePropsIn(sc, 0, false, 40 * ST, 0, 40 * ST + vw, vh + 300).length;
  assert.ok(view > 0 && view < all / 4, `${view} of ${all}`);
  const structsIn = A.scenePropsIn(sc, 0, false, 100 * ST, 0, 100 * ST + vw, vh + 300).length; assert.ok(structsIn < all / 4);
});
test('no trademarked game names, no gambling, no economy hooks, nothing Mememon in the districts code', () => {
  const src = ['districts.js', 'districtart.js'].map((f) => readFileSync(new URL('../src/' + f, import.meta.url), 'utf8')).join('\n').toLowerCase();
  for (const w of ['mememon', 'pokemon', 'pokémon', 'nintendo', 'sega', 'pac-man', 'pacman', 'space invaders', 'frogger', 'arkanoid', 'breakout', 'tetris', 'mario', 'sonic', 'street fighter', 'casino', 'jackpot', 'slot machine', 'roulette', 'lottery', 'gamble', 'wager'])
    assert.ok(!src.includes(w), w);
  assert.ok(!/\bbet\b|\bodds\b|addbones|state\.bones|kibble\s*\+|payout/.test(src));
});

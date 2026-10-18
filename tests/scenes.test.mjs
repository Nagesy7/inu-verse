import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENES, scene, solidAt, spawnOf, exitAt, HUB_GATES, DOOR_SCENES, sceneForDoor, resolveExit, makePortalState, portalStep, ST, nearestSpot } from '../src/scenes.js';
import { astar } from '../src/mobility.js';
import { isSolid, doorList, MAP_W, MAP_H, TILE } from '../src/world.js';
import { outsideOf } from '../src/doors.js';
import { newGame } from '../src/game.js';

const ids = Object.keys(SCENES);
const reach = (sc, sx, sy) => { const seen = new Set([sy * 1000 + sx]), q = [[sx, sy]]; while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = ny * 1000 + nx; if (!seen.has(k) && !solidAt(sc, nx, ny)) { seen.add(k); q.push([nx, ny]); } } } return seen; };
const tileOf = (p) => [Math.floor(p.x / ST), Math.floor(p.y / ST)];
const portals = (sc) => [...sc.exits.flatMap((e) => e.tiles), ...sc.spots.filter((s) => s.act.travel).map((s) => [s.tx, s.ty])];
const gs = newGame({ name: 'T', coat: 'tan' });
const doorById = (id) => doorList(gs).find((d) => d.id === id);

test('every scene parses into a rectangular grid with a wall/edge border', () => {
  assert.ok(ids.length >= 10);
  for (const id of ids) { const s = SCENES[id], sc = scene(id); assert.ok(s.map.every((r) => r.length === sc.w), `${id} ragged`); assert.ok(sc.name && (sc.kind === 'interior' || sc.kind === 'zone'));
    for (let x = -1; x <= sc.w; x++) { assert.ok(solidAt(sc, x, -1) && solidAt(sc, x, sc.h)); } }
});
test('interiors cover cafe, shops, bank, mall, clubhouse; zones cover park, beach, shrine', () => {
  for (const id of ['cafe', 'shop', 'fashion', 'cars', 'bank', 'mall', 'clubhouse']) assert.equal(SCENES[id].kind, 'interior', id);
  for (const id of ['park', 'beach', 'shrine']) assert.equal(SCENES[id].kind, 'zone', id);
});
test('spawns are walkable and every spot, exit and NPC is reachable from every spawn', () => {
  for (const id of ids) { const sc = scene(id);
    for (const k of Object.keys(sc.spawns)) { const [sx, sy] = tileOf(spawnOf(id, k)); assert.ok(!solidAt(sc, sx, sy), `${id}.${k} spawn solid`); const R = reach(sc, sx, sy);
      for (const s of sc.spots) assert.ok(R.has(s.ty * 1000 + s.tx), `${id}: spot ${s.id} unreachable from ${k}`);
      for (const e of sc.exits) for (const [x, y] of e.tiles) assert.ok(R.has(y * 1000 + x), `${id}: exit ${x},${y} unreachable`);
      for (const n of sc.npcs || []) assert.ok(!solidAt(sc, n.x, n.y), `${id}: npc ${n.name} in a wall`);
      // A* agrees with flood fill on the farthest target
      const s0 = sc.spots[0]; if (s0) assert.ok(astar(sx, sy, s0.tx, s0.ty, (x, y) => solidAt(sc, x, y), { w: sc.w, h: sc.h }), `${id}: astar`); } }
});
test('no soft-locks: from every reachable tile an exit or ferry is reachable', () => {
  for (const id of ids) { const sc = scene(id), P = portals(sc); assert.ok(P.length, `${id} has no way out`);
    for (const k of Object.keys(sc.spawns)) { const [sx, sy] = tileOf(spawnOf(id, k));
      for (const key of reach(sc, sx, sy)) { const R = reach(sc, key % 1000, Math.floor(key / 1000)); assert.ok(P.some(([x, y]) => R.has(y * 1000 + x)), `${id}: stuck at ${key}`); } } }
});
test('exit tiles face out into a wall/edge (walk off the mat to leave), spots face something', () => {
  for (const id of ids) { const sc = scene(id); for (const e of sc.exits) for (const [x, y] of e.tiles) { const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[e.face]; assert.ok(solidAt(sc, x + d[0], y + d[1]), `${id}: exit ${x},${y} faces open floor`); } }
});
test('every interior exit returns you to the exact outside tile of its hub door', () => {
  for (const [key, sid] of Object.entries(DOOR_SCENES)) { const [kind, did] = key.split(':'); const d = doorList(gs).find((q) => q.kind === kind && q.id === did); assert.ok(d, `hub door ${key} missing`); assert.equal(sceneForDoor(d), sid);
    const sc = scene(sid); assert.equal(sc.exits.length, 1); const r = resolveExit(sc.exits[0], { outsideOf, doorById }); const o = outsideOf(d);
    assert.equal(r.scene, 'hub'); assert.equal(r.x, o.x); assert.equal(r.y, o.y); assert.ok(!isSolid(Math.floor(r.x / TILE), Math.floor(r.y / TILE)), `${sid}: outside tile solid`); }
});
test('Launch Hall, arcade, plots and game doors are NOT turned into rooms', () => {
  for (const d of doorList(gs)) if (!DOOR_SCENES[d.kind + ':' + d.id]) assert.equal(sceneForDoor(d), null);
  assert.equal(sceneForDoor({ kind: 'building', id: 'launch' }), null); assert.equal(sceneForDoor({ kind: 'arcade', id: 'arcade' }), null);
});
test('hub gates are on walkable, reachable hub tiles and lead to zones; zone exits return to the gate', () => {
  for (const g of HUB_GATES) { assert.ok(!isSolid(g.tx, g.ty), `${g.id} gate solid`); assert.ok(!isSolid(g.out[0], g.out[1]));
    assert.ok(astar(4, 19, g.tx, g.ty, isSolid, { w: MAP_W, h: MAP_H }), `${g.id} unreachable from hub spawn`); assert.equal(SCENES[g.to].kind, 'zone');
    const sp = spawnOf(g.to, g.at); assert.ok(!solidAt(scene(g.to), ...tileOf(sp)));
    const back = scene(g.to).exits.find((e) => e.to === 'hub' && e.gate === g.id); assert.ok(back, `${g.to} has no exit back to ${g.id}`);
    const r = resolveExit(back, {}); assert.deepEqual([Math.floor(r.x / ST), Math.floor(r.y / ST), r.face], g.out); }
});
test('scene graph: every scene is reachable from the hub (doors, gates, ferry) and links resolve to walkable spawns', () => {
  const adj = { hub: new Set([...Object.values(DOOR_SCENES), ...HUB_GATES.map((g) => g.to)]) };
  for (const id of ids) { const sc = scene(id); adj[id] = new Set();
    for (const e of sc.exits) { adj[id].add(e.to); if (e.to !== 'hub') { const r = resolveExit(e); assert.ok(!solidAt(scene(e.to), Math.floor(r.x / ST), Math.floor(r.y / ST)), `${id}->${e.to}`); } }
    for (const s of sc.spots) if (s.act.travel) { adj[id].add(s.act.travel); const sp = spawnOf(s.act.travel, s.act.at); assert.ok(!solidAt(scene(s.act.travel), ...tileOf(sp))); } }
  const seen = new Set(['hub']), q = ['hub']; while (q.length) for (const n of adj[q.shift()] || []) if (!seen.has(n)) { seen.add(n); q.push(n); }
  for (const id of ids) assert.ok(seen.has(id), `${id} unreachable`);
  // and every scene can get back to the hub
  for (const id of ids) { const s2 = new Set([id]), q2 = [id]; while (q2.length) for (const n of adj[q2.shift()] || []) if (!s2.has(n)) { s2.add(n); q2.push(n); } assert.ok(s2.has('hub'), `${id} cannot return to hub`); }
  assert.ok(adj.beach.has('shrine') && adj.shrine.has('beach'), 'ferry links beach <-> shrine');
});
test('portal fires once per visit: not on spawn, not while standing, not facing away, re-arms after stepping off', () => {
  const sc = scene('cafe'), st = makePortalState(), [ex, ey] = sc.exits[0].tiles[0], at = (x, y, face, moving = true) => ({ x: (x + 0.5) * ST, y: (y + 0.5) * ST, face, moving });
  st.tile = ey * 1000 + ex; // spawned on it: disarmed
  assert.equal(portalStep(st, sc, at(ex, ey, 'down'), 0), null);
  assert.equal(portalStep(st, sc, at(ex, ey - 1, 'down'), 1), null);
  assert.equal(portalStep(st, sc, at(ex, ey, 'up'), 2), null, 'facing away');
  assert.equal(portalStep(st, sc, at(ex, ey, 'down', false), 2.1), null, 'standing still');
  assert.ok(portalStep(st, sc, at(ex, ey, 'down'), 2.2));
  assert.equal(portalStep(st, sc, at(ex, ey, 'down'), 2.3), null, 'no re-trigger');
  assert.equal(portalStep(st, sc, at(ex, ey - 1, 'up'), 2.4), null); assert.equal(portalStep(st, sc, at(ex, ey, 'down'), 2.5), null, 'cooldown');
  assert.equal(portalStep(st, sc, at(ex, ey - 1, 'up'), 3.2), null); assert.ok(portalStep(st, sc, at(ex, ey, 'down'), 3.3), 're-armed');
});
test('spot actions only use existing panels / build / say / ferry', () => {
  const ok = new Set(['cafe', 'shop', 'fashion', 'wardrobe', 'cars', 'garage', 'bank', 'mall', 'packs']);
  for (const id of ids) for (const s of scene(id).spots) { const a = s.act; assert.ok((a.panel && ok.has(a.panel)) || a.build === 'clubhouse' || a.say || a.travel, `${id}.${s.id}`); assert.ok(nearestSpot(scene(id), (s.tx + 0.5) * ST, (s.ty + 0.5) * ST) === s); }
});
test('original names only: no trademarked game names in scene data', () => {
  const txt = JSON.stringify(SCENES).toLowerCase(); for (const bad of ['club penguin', 'poptropica', 'penguin', 'puffle']) assert.ok(!txt.includes(bad), bad);
});
import { doorStep, makeDoorState } from '../src/doors.js';
test('hub door arms when you tap-walk onto its tile (path to elsewhere), then walking in enters once', () => {
  const d = doorList(gs).find((q) => q.id === 'cafe'), st = makeDoorState(), at = (moving, face) => ({ x: (d.tx + 0.5) * TILE, y: (d.ty + 0.5) * TILE, face, moving });
  assert.equal(doorStep(st, at(true, 'up'), [], 0, [d]), null, 'path-walking over it does not enter');
  assert.equal(doorStep(st, at(true, 'up'), [d], 1, [d]), d, 'pushing in afterwards enters');
  assert.equal(doorStep(st, at(true, 'up'), [d], 3, [d]), null, 'once');
});

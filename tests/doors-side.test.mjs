// Doors/portals enter from ANY side (front, left, right, diagonals, pushing against the wall beside it), exactly once,
// and never on spawn or when walking away. Kinematic walk (straight line, stops at solid tiles) through the real trigger code.
// The browser version of the same matrix (real movement, keyboard/sprint/joystick/tap, desktop + phone landscape) is
// scripts/doors-e2e.mjs; its results are in proof/doors-side-results-*.json.
import test from 'node:test'; import assert from 'node:assert/strict';
import { TILE, doorList, doorDir, isSolid, interactables } from '../src/world.js';
import { makeDoorState, doorStep, doorExit, outsideOf, doorZone } from '../src/doors.js';
import { SCENES, scene, makePortalState, portalStep, walkInExits, solidAt, HUB_GATES, ST } from '../src/scenes.js';
const state = { plots: Object.fromEntries(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'].map((id) => [id, { items: [] }])) };
const EXTRA = new Set(['raidgate', 'kwall', 'barn', 'chapel']);
const DOORS = [...doorList(state), ...interactables(state).filter((i) => EXTRA.has(i.id))];
const add = (a, k, v) => [a[0] + k * v[0], a[1] + k * v[1]];
function approaches(T, iv, solid) { const lv = [Math.abs(iv[1]), Math.abs(iv[0])], ov = [-iv[0], -iv[1]], out = [];
  if (!solid(add(T, 1, ov))) out.push(['front', add(T, 2, ov), iv]); // the tile in front must be open to come from the front
  for (const sg of [-1, 1]) { const side = add(T, sg, lv), dir = [-sg * lv[0], -sg * lv[1]]; if (solid(side)) continue;
    out.push(['side', add(T, 2 * sg, lv), dir], ['wall', add(side, 1, ov), iv]);
    if (!solid(add(side, 1, ov))) out.push(['diag', add(add(T, 2 * sg, lv), 2, ov), [dir[0] + iv[0], dir[1] + iv[1]]]); }
  return out.filter(([, s]) => !solid(s)); }
// walk from tile s along v at walking speed for 3 s; the body stops at solid tiles (per axis, like moveBody); after a fire the
// game stops the body (enterDoor/stopWalk) but the key or stick may still be held, which must not fire again
function walk(stepFn, s, v, solid, { ms = 3000, speed = 92 } = {}) { let x = (s[0] + 0.5) * TILE, y = (s[1] + 0.5) * TILE, fired = 0; const l = Math.hypot(...v);
  for (let t = 0; t < ms; t += 1000 / 60) { if (fired) { if (stepFn({ x, y, face: 'down', moving: false, push: { x: v[0], y: v[1] } }, t / 1000 + 100)) fired++; continue; } // entering stops you (input still held)
    const nx = x + (v[0] / l) * speed / 60, ny = y + (v[1] / l) * speed / 60;
    if (!solid([Math.floor(nx / TILE), Math.floor(y / TILE)])) x = nx; if (!solid([Math.floor(x / TILE), Math.floor(ny / TILE)])) y = ny;
    if (stepFn({ x, y, face: 'down', moving: true, push: { x: v[0], y: v[1] } }, t / 1000 + 100)) fired++; }
  return fired; }
const wsolid = ([x, y]) => isSolid(x, y);
test('every hub door / walk-in spot enters exactly once from front, sides, diagonals and against the wall beside it', () => {
  let n = 0; const bad = [];
  for (const d of DOORS) { const r = doorDir(d), iv = [r.dx, r.dy];
    for (const [nm, s, v] of approaches([d.tx, d.ty], iv, wsolid)) { const st = makeDoorState(); doorExit(st, 0); st.until = 0;
      const f = walk((p, t) => doorStep(st, p, DOORS, t), s, v, wsolid); n++; if (f !== 1) bad.push(`${d.id} ${nm} fired ${f}`); } }
  assert.deepEqual(bad, []); assert.ok(n > 150, 'ran ' + n); });
test('spawn outside a door and walking away (straight or diagonal) never enters', () => {
  const bad = []; for (const d of DOORS) { const r = doorDir(d), o = outsideOf(d), s = [Math.floor(o.x / TILE), Math.floor(o.y / TILE)], lv = [Math.abs(r.dy), Math.abs(r.dx)];
    for (const v of [[-r.dx, -r.dy], add([-r.dx, -r.dy], 1, lv), add([-r.dx, -r.dy], -1, lv)]) { const st = makeDoorState(); doorExit(st, 99);
      const f = walk((p, t) => doorStep(st, p, [d], t + 1), s, v, wsolid, { ms: 1500 }); /* only this door: walking away may legitimately reach another one */ if (f) bad.push(`${d.id} ${v} fired ${f}`); } }
  assert.deepEqual(bad, []); });
test('doorZone: door tile, both sides along the front, both diagonals in front', () => {
  const d = DOORS.find((q) => q.id === 'cafe'); assert.deepEqual(doorZone(d).map((z) => z.slice(0, 2) + ''), [[d.tx, d.ty], [d.tx - 1, d.ty], [d.tx + 1, d.ty], [d.tx - 1, d.ty + 1], [d.tx + 1, d.ty + 1]].map(String));
  const side = DOORS.find((q) => q.side === 'left'); if (side) assert.deepEqual(doorZone(side)[1].slice(0, 2), [side.tx, side.ty - 1]); });
test('every room/zone exit, hub gate and ferry enters exactly once from any side, never from its own spawn', () => {
  const bad = []; let n = 0; const FV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  for (const id of Object.keys(SCENES)) { const sc = scene(id), rs = ([x, y]) => solidAt(sc, x, y), list = [...sc.exits, ...walkInExits(sc)];
    for (const e of list) for (const [nm, s, v] of approaches(e.tiles[0], FV[e.face], rs)) { const st = makePortalState(); st.tile = s[1] * 1000 + s[0];
      const f = walk((p, t) => portalStep(st, sc, p, t, list), s, v, rs); n++; if (f !== 1) bad.push(`${id}:${e.to || e.spot.id} ${nm} fired ${f}`); }
    for (const [k, sp] of Object.entries(sc.spawns)) { const s = [sp[0], sp[1]], st = makePortalState(); st.tile = s[1] * 1000 + s[0]; const v = FV[sp[2]];
      const f = walk((p, t) => portalStep(st, sc, p, t, list), s, v, rs, { ms: 1200 }); if (f) bad.push(`${id} spawn ${k} fired ${f}`); } }
  const G = HUB_GATES.map((g) => ({ tiles: [[g.tx, g.ty]], face: g.face, gate: g }));
  for (const e of G) for (const [nm, s, v] of approaches(e.tiles[0], FV[e.face], wsolid)) { const st = makePortalState(); st.tile = s[1] * 1000 + s[0]; const f = walk((p, t) => portalStep(st, null, p, t, G), s, v, wsolid); n++; if (f !== 1) bad.push(`gate ${e.gate.id} ${nm} fired ${f}`); }
  assert.deepEqual(bad, []); assert.ok(n > 20, 'ran ' + n); });
test('doors: after an exit/panel close the tile you stand on never arms, but the next step into the trigger does', () => {
  const d = DOORS.find((q) => q.id === 'launch'), st = makeDoorState(), r = doorDir(d), lx = r.dy ? 1 : 0, ly = r.dy ? 0 : 1;
  const at = (t) => ({ x: (t[0] + 0.5) * TILE, y: (t[1] + 0.5) * TILE, push: { x: r.dx * 92, y: r.dy * 92 } });
  const front = [d.tx - r.dx, d.ty - r.dy], side = [d.tx - lx, d.ty - ly], diagFront = [side[0] - r.dx, side[1] - r.dy];
  doorStep(st, at(diagFront), [d], 0); doorExit(st, 0); st.until = 0; // e.g. a panel closed while you stood here (same tile as before)
  assert.equal(doorStep(st, at(diagFront), [d], 1), null); assert.equal(doorStep(st, at(side), [d], 1.1)?.id, 'launch');
  void front; });

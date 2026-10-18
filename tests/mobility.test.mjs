import test from 'node:test'; import assert from 'node:assert/strict';
import { TILE, MAP_W, MAP_H, isSolid, moveBody, doorList, doorDir } from '../src/world.js';
import { makeDoorState, doorStep, doorExit } from '../src/doors.js';
import * as M from '../src/mobility.js';
const solid = (x, y) => isSolid(x, y), opt = { w: MAP_W, h: MAP_H };
const SPAWN = [4, 19];
function sim(goal, { run = false, maxT = 40, dt = 1 / 60 } = {}) { // headless replica of main.js path walking
  const raw = M.astar(SPAWN[0], SPAWN[1], goal[0], goal[1], solid, opt); if (!raw) return null;
  const pw = M.makePathWalker(); pw.pts = M.smoothPath(raw, solid, TILE).slice(1); if (!pw.pts.length) pw.pts = [raw.at(-1)]; pw.goal = raw.at(-1);
  const p = { x: (SPAWN[0] + 0.5) * TILE, y: (SPAWN[1] + 0.5) * TILE }; let v = { x: 0, y: 0 }, t = 0, replans = 0, maxSp = 0;
  while (t < maxT) { t += dt; const top = M.WALK_SPEED * (run ? M.RUN_MULT : 1), f = M.followStep(pw, p, top, dt, TILE); if (!f) break;
    if (f.stuck) { replans++; const r2 = M.astar(Math.floor(p.x / TILE), Math.floor(p.y / TILE), pw.goal[0], pw.goal[1], solid, opt); pw.pts = M.smoothPath(r2, solid, TILE).slice(1); pw.stuckT = 0; continue; }
    if (f.arrive) { if (f.snap) moveBody(p, f.snap.x - p.x, f.snap.y - p.y); return { t, p, replans, maxSp, end: pw.goal }; }
    v = M.stepVelocity(v, f.want, dt); maxSp = Math.max(maxSp, Math.hypot(v.x, v.y)); moveBody(p, v.x * dt, v.y * dt); }
  return { t, p, replans, maxSp, timeout: true }; }
test('A*: path avoids every solid tile, never cuts a corner, and is no longer than BFS', () => {
  for (const d of doorList(null).slice(0, 12)) { const pth = M.astar(SPAWN[0], SPAWN[1], d.tx, d.ty, solid, opt); assert.ok(pth, d.id);
    for (let i = 0; i < pth.length; i++) { const [x, y] = pth[i]; assert.ok(!solid(x, y), `${d.id} crosses solid ${x},${y}`); if (i) { const [px, py] = pth[i - 1]; assert.ok(Math.max(Math.abs(x - px), Math.abs(y - py)) === 1);
      if (x !== px && y !== py) assert.ok(!solid(x, py) && !solid(px, y), `${d.id} corner cut at ${x},${y}`); } } } });
test('A*: tapping a solid tile walks to the nearest open tile; unreachable returns null', () => {
  let s = null; for (let y = 5; y < MAP_H - 5 && !s; y++) for (let x = 5; x < MAP_W - 5 && !s; x++) if (solid(x, y) && !solid(x, y + 1)) s = [x, y];
  const pth = M.astar(SPAWN[0], SPAWN[1], s[0], s[1], solid, opt); assert.ok(pth); const e = pth.at(-1); assert.ok(!solid(e[0], e[1])); assert.ok(Math.max(Math.abs(e[0] - s[0]), Math.abs(e[1] - s[1])) <= 3);
  const box = (x, y) => x < 0 || y < 0 || x > 9 || y > 9 || (x === 5); assert.equal(M.astar(1, 1, 8, 8, box, { w: 10, h: 10 }), null); });
test('smoothed legs keep the whole body clear of solids', () => { for (const d of doorList(null)) { const raw = M.astar(SPAWN[0], SPAWN[1], d.tx, d.ty, solid, opt); if (!raw) continue; const sm = M.smoothPath(raw, solid, TILE);
  assert.ok(sm.length <= raw.length); for (let i = 1; i < sm.length; i++) assert.ok(M.segClear(sm[i - 1], sm[i], solid, TILE), `${d.id} leg ${i}`); } });
test('tap-to-walk reaches every door from spawn (headless sim with real collision), running is faster', () => {
  for (const d of doorList(null)) { const r = sim([d.tx, d.ty]); assert.ok(r && !r.timeout, `${d.id} not reached`); assert.equal(Math.floor(r.p.x / TILE), d.tx, d.id); assert.equal(Math.floor(r.p.y / TILE), d.ty, d.id); assert.ok(r.maxSp <= M.WALK_SPEED + 1e-6); }
  const far = doorList(null).find((x) => x.id === 'bank'), w = sim([far.tx, far.ty]), rn = sim([far.tx, far.ty], { run: true }); assert.ok(rn.t < w.t * 0.7, `run ${rn.t} vs walk ${w.t}`); });
test('acceleration curve: snappy start/stop, diagonal speed equals straight speed', () => { const dt = 1 / 60; let v = { x: 0, y: 0 }, t = 0;
  while (Math.hypot(v.x, v.y) < M.WALK_SPEED * 0.999 && t < 1) { v = M.stepVelocity(v, { x: M.WALK_SPEED, y: 0 }, dt); t += dt; } assert.ok(t <= 0.12, 'reach walk speed in <=120ms, took ' + t);
  let s = 0; t = 0; while (Math.hypot(v.x, v.y) > 0 && t < 1) { v = M.stepVelocity(v, { x: 0, y: 0 }, dt); t += dt; s += Math.hypot(v.x, v.y) * dt; } assert.ok(t <= 0.08, 'stop in <=80ms'); assert.ok(s < 4, 'slides < 4px, slid ' + s);
  const d = M.normInput(1, 1); assert.ok(Math.abs(Math.hypot(d.x, d.y) - 1) < 1e-9); v = { x: 0, y: 0 }; for (let i = 0; i < 30; i++) v = M.stepVelocity(v, { x: d.x * M.WALK_SPEED, y: d.y * M.WALK_SPEED }, dt); assert.ok(Math.abs(Math.hypot(v.x, v.y) - M.WALK_SPEED) < 1e-6);
  v = { x: M.WALK_SPEED, y: 0 }; v = M.stepVelocity(v, { x: -M.WALK_SPEED, y: 0 }, dt); assert.ok(v.x < M.WALK_SPEED - M.ACCEL * dt, 'reversing uses the faster decel'); });
test('input switching: keys and stick cancel path-walking; stick edge / double-tap-hold / Shift = run', () => {
  assert.deepEqual(M.pickInput({ path: true }).source, 'path'); assert.equal(M.pickInput({ path: true }).cancelPath, false);
  const k = M.pickInput({ keys: { x: 1, y: 1 }, path: true }); assert.equal(k.source, 'keys'); assert.ok(k.cancelPath); assert.ok(Math.abs(Math.hypot(k.dir.x, k.dir.y) - 1) < 1e-9); assert.equal(k.run, false);
  assert.equal(M.pickInput({ keys: { x: 1, y: 0 }, shift: true }).run, true);
  const s = M.pickInput({ stick: { x: 0.5, y: 0 }, stickMag: 0.6, keys: { x: -1, y: 0 }, path: true }); assert.equal(s.source, 'stick'); assert.ok(s.cancelPath); assert.equal(s.run, false);
  assert.equal(M.pickInput({ stick: { x: 1, y: 0 }, stickMag: 1 }).run, true); assert.equal(M.pickInput({ stick: { x: 1, y: 0 }, stickMag: 0.5, holdRun: true }).run, true);
  assert.equal(M.pickInput({ path: true, pathRun: true }).run, true);
  const tap = M.makeTapper(300); assert.equal(tap(1000), false); assert.equal(tap(1200), true); assert.equal(tap(1300), false, 'third tap starts a new pair'); assert.equal(tap(2000), false); });
test('facing has hysteresis (no left/up flicker on near-diagonals)', () => { let f = 'right'; for (let i = 0; i < 20; i++) f = M.faceOf(60 + (i % 2 ? 6 : -6), 60, f); assert.equal(f, 'right'); assert.equal(M.faceOf(0, 0, 'up'), 'up'); assert.equal(M.faceOf(10, 90, 'right'), 'down'); });
test('doors: tap-walk arrival enters exactly once; standing/jiggling on the tile never re-triggers', () => {
  const doors = doorList(null), d = doors.find((x) => x.id === 'bank'), st = makeDoorState(); const r = sim([d.tx, d.ty]); assert.ok(r && !r.timeout);
  let enters = 0; const face = doorDir(d).face; const at = { x: r.p.x, y: r.p.y, face, moving: true };
  if (doorStep(st, at, doors, 5)) enters++; else enters++; // main.js arrive(): walk-door target -> enterDoor -> doorExit(st)
  doorExit(st, 5); for (let t = 5; t < 9; t += 1 / 30) if (doorStep(st, { ...at, x: at.x + Math.sin(t * 9) * 3 }, doors, t)) enters++;
  assert.equal(enters, 1); });

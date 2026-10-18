// Ambient life pass: wind sway (trees/awnings/flags), bird scatter on sprint, awning cats, seeded dog walks, Taro's bread round.
import test from 'node:test'; import assert from 'node:assert/strict';
import { makeAmbient, stepAmbient, catSpot, catProps, CAT_PERCHES, CATS, BIRD_RUN_R, BIRD_WALK_R, DOG_WALKERS, walkRoute, dogWalkAt, dogWalkActors, leashProps, drawAtmosphere, dayPhase, timeForHour } from '../src/ambient.js';
import { ALIVE, makeAlive, stepAlive, windAt, swayAt, flagWave, drawAwningFlap, reducedMotion } from '../src/alive.js';
import { BREAD_ROUND, breadRound, sydneyMinutes, PLACES, makeTown, lineFor } from '../src/townai.js';
import { isSolid, TILE, MAP, T } from '../src/world.js';
import { mulberry32 } from '../src/rng.js';
import fs from 'node:fs';
const V = { x0: 0, y0: 0, x1: 2048, y1: 3400 };
const mockCtx = () => { const calls = []; return { calls, set fillStyle(v) { calls.push(['fill', v]); }, fillRect: (...a) => calls.push(['rect', ...a]) }; };

test('wind: gusts roll across the map, sway is 0 under reduced motion', () => {
  const xs = [0, 400, 800, 1200].map((x) => windAt(x, 10, 1)); assert.ok(new Set(xs.map((v) => v.toFixed(3))).size > 1, 'wind differs along x'); for (const v of xs) assert.ok(v >= 0.69 && v <= 1.16);
  assert.equal(swayAt(100, 0.3, 2, 1.6, 5, true), 0); assert.notEqual(swayAt(100, 0.3, 2, 1.6, 5, false), 0);
  ALIVE.rm = true; assert.deepEqual(flagWave(300), [0, 0]); ALIVE.rm = false; ALIVE.t = 3.3; const w = flagWave(300); assert.ok(Math.abs(w[0]) <= 3 && Math.abs(w[1]) <= 3);
});
test('awning valance: one tab per stripe, at rest it is the static scallop row', () => {
  ALIVE.rm = true; const c = mockCtx(); drawAwningFlap(c, 100, 50, 64, 8, '#f00', '#fff'); const rects = c.calls.filter((k) => k[0] === 'rect');
  assert.equal(rects.length, 16); assert.deepEqual(rects[0].slice(1), [101, 50, 6, 3]); assert.deepEqual(rects[1].slice(1), [102, 53, 4, 1]);
  ALIVE.rm = false; ALIVE.t = 0; let moved = false; for (let t = 0; t < 6 && !moved; t += 0.25) { ALIVE.t = t; const d = mockCtx(); drawAwningFlap(d, 100, 50, 64, 8, '#f00', '#fff'); moved = d.calls.some((k) => k[0] === 'rect' && k[1] !== 101 + Math.floor((k[1] - 100) / 8) * 8 && k[4] === 3); }
  assert.ok(moved, 'tabs drift with the wind');
});
test('trees and canopy birds: sprinting under trees spooks perched birds', () => {
  globalThis.__reducedMotion = false; makeAlive(); const v = { x0: 0, y0: 100, x1: 900, y1: 600 };
  for (let i = 0; i < 1200 && !ALIVE.cbirds.some((b) => b.st === 'perch'); i++) stepAlive(ALIVE, 1 / 60, v, mulberry32(i));
  const b = ALIVE.cbirds.find((q) => q.st === 'perch'); assert.ok(b, 'a bird perched'); stepAlive(ALIVE, 1 / 60, v, Math.random, { x: b.x + 20, y: b.y + 100 });
  assert.equal(b.st, 'fly'); assert.ok(b.spooked); globalThis.__reducedMotion = undefined;
});
test('ground birds: walking only flushes up close, sprinting scatters from far, then they glide home', () => {
  const A = makeAmbient(9), b = A.birds[0], far = { x: b.hx + 100, y: b.hy };
  stepAmbient(A, 0.016, far, [], { running: false }); assert.equal(b.state, 'ground', 'a walker 100px away does not spook it');
  assert.ok(100 > BIRD_WALK_R && 100 < BIRD_RUN_R); const ev = stepAmbient(A, 0.016, { ...far, running: true }, [], { running: true }); assert.equal(b.state, 'fly'); assert.ok(ev.some((e) => e.kind === 'flush' && e.run));
  const gone = { x: -5000, y: -5000 }; let seen = new Set(); for (let i = 0; i < 900; i++) { stepAmbient(A, 1 / 60, gone, [], { running: false }); seen.add(b.state); }
  assert.ok(seen.has('return'), 'flies back in'); assert.equal(b.state, 'ground'); assert.ok(Math.hypot(b.x - b.hx, b.y - b.hy) < 12, 'back on its own patch');
});
test('ground birds under reduced motion: vanish and reappear without flight', () => {
  globalThis.__reducedMotion = true; const A = makeAmbient(9), b = A.birds[0]; stepAmbient(A, 0.016, { x: b.hx + 20, y: b.hy }, [], { running: true }); assert.equal(b.state, 'gone');
  for (let i = 0; i < 400; i++) stepAmbient(A, 1 / 60, { x: -5000, y: -5000 }, []); assert.equal(b.state, 'ground'); globalThis.__reducedMotion = undefined;
});
test('cats: sunny end of the awning by time of day, lantern at night, indoors in rain', () => {
  assert.ok(catSpot(7, 0, 0) > 0.8, 'morning sun in the east -> right end'); assert.ok(Math.abs(catSpot(12.3, 0, 0) - 0.5) < 0.1); assert.ok(catSpot(17, 0, 0) < 0.2, 'afternoon -> west end');
  assert.equal(catSpot(23, 0.62, 0, 0.86), 0.86); assert.equal(catSpot(12, 0, 0.8), null);
  for (const k of CATS) { const P = CAT_PERCHES[k.perch]; assert.ok(P && P.x1 > P.x0, k.name); }
  const A = makeAmbient(1), k = A.cats[0], P = CAT_PERCHES[k.perch];
  for (let i = 0; i < 60 * 40; i++) stepAmbient(A, 1 / 60, { x: 0, y: 0 }, [], { hour: 7 }); assert.ok(k.x > P.x0 + (P.x1 - P.x0) * 0.75 && k.st === 'nap');
  let walked = false; for (let i = 0; i < 60 * 40; i++) { stepAmbient(A, 1 / 60, { x: 0, y: 0 }, [], { hour: 17 }); walked ||= k.st === 'walk'; } assert.ok(walked, 'pads along to the new sunny spot'); assert.ok(k.x < P.x0 + (P.x1 - P.x0) * 0.25);
  A.rain = 1; for (let i = 0; i < 120; i++) stepAmbient(A, 1 / 60, { x: 0, y: 0 }, [], { hour: 12 }); assert.equal(k.alpha, 0); assert.equal(catProps(A, V).length, 0, 'none drawn while indoors');
});
test('cats are culled off-screen', () => { const A = makeAmbient(1); assert.equal(catProps(A, { x0: 0, y0: 0, x1: 300, y1: 300 }).length, 0); assert.equal(catProps(A, V).length, CATS.length); });
test('dog walks: walkable loops, pure function of the wall clock (same on every client)', () => {
  for (let i = 0; i < DOG_WALKERS.length; i++) { const R = walkRoute(i); assert.ok(R.period > 30 && R.pts.length > 10, DOG_WALKERS[i].name);
    for (const [x, y] of R.pts) assert.ok(!isSolid(Math.floor(x / TILE), Math.floor(y / TILE)), `${DOG_WALKERS[i].name} walks on open tiles`);
    for (let k = 1; k < R.pts.length; k++) assert.ok(Math.hypot(R.pts[k][0] - R.pts[k - 1][0], R.pts[k][1] - R.pts[k - 1][1]) <= TILE + 0.01, 'steps one tile at a time'); }
  const now = 1792000000000; assert.deepEqual(dogWalkAt(2, now), dogWalkAt(2, now)); const a = dogWalkAt(2, now), b = dogWalkAt(2, now + walkRoute(2).period * 1000); assert.ok(Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6, 'loops exactly');
  const c = dogWalkAt(2, now + 4000); assert.ok(Math.hypot(c.x - a.x, c.y - a.y) < 4.2 * 45, 'walks at a stroll'); assert.ok(Math.hypot(a.dogX - a.x, a.dogY - a.y) < 50, 'dog stays on the leash');
});
test('dog walks: pooled actors, culled off-screen', () => {
  const now = 1792000000000, all = dogWalkActors(V, now); assert.equal(all.length, DOG_WALKERS.length * 2); const again = dogWalkActors(V, now + 5000); assert.equal(again[0], all[0], 'actor objects are reused');
  assert.equal(dogWalkActors({ x0: -9000, y0: -9000, x1: -8000, y1: -8000 }, now).length, 0); assert.equal(leashProps({ x0: -9000, y0: -9000, x1: -8000, y1: -8000 }, now).length, 0);
  const p = dogWalkAt(0, now), near = dogWalkActors({ x0: p.x - 200, y0: p.y - 100, x1: p.x + 200, y1: p.y + 100 }, now); assert.ok(near.some((q) => q.walker === DOG_WALKERS[0].name));
});
test("Taro's bread round runs on Sydney time and only steers his walk", () => {
  assert.equal(BREAD_ROUND.who, 'Taro'); assert.equal(breadRound(5 * 60 + 59), null); assert.equal(breadRound(9 * 60), null);
  assert.equal(breadRound(6 * 60).stop, 'L3'); assert.equal(breadRound(6 * 60 + 35).stop, 'cafe'); assert.deepEqual(breadRound(6 * 60 + 35).goal, PLACES.cafe); assert.equal(breadRound(8 * 59).carrying, true); assert.equal(breadRound(8 * 60 + 40).carrying, false);
  for (const s of BREAD_ROUND.stops) assert.ok(PLACES[s], s);
  assert.equal(sydneyMinutes(Date.UTC(2026, 6, 1, 0, 0)), 10 * 60, 'AEST is UTC+10 in July'); assert.equal(sydneyMinutes(Date.UTC(2026, 0, 1, 0, 0)), 11 * 60, 'AEDT is UTC+11 in January');
  const town = makeTown(mulberry32(4)); town.folk.Taro.round = breadRound(7 * 60 + 5); assert.match(lineFor(town, 'Taro', () => 0.9), /bread for the market/);
});
test('lights list is built lazily (only when dark enough to use)', () => {
  let built = 0; const A = makeAmbient(2), c = { save() {}, restore() {}, drawImage() {}, fillRect() {} };
  drawAtmosphere(c, A, dayPhase(timeForHour(12)), { x: 0, y: 0 }, 400, 200, () => { built++; return []; }); assert.equal(built, 0);
});
test('ambient life pass stays cosmetic: no economy, wallet, prize or Mememon hooks', () => {
  for (const f of ['src/ambient.js', 'src/alive.js']) { const src = fs.readFileSync(f, 'utf8'); assert.doesNotMatch(src, /bones\s*[+-]=|state\.bones|kibble-pay|wallet\(|prize|mememon/i, f); }
  const ta = fs.readFileSync('src/townai.js', 'utf8').split('// ---- Taro')[1].split('// things the player did')[0]; assert.doesNotMatch(ta, /bones|kibble|wallet|money|needs/i);
});

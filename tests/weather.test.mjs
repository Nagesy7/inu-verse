import test from 'node:test'; import assert from 'node:assert/strict';
import * as SKY from '../src/weather.js';
import { dayPhase, makeAmbient, stepAmbient, DAY_LEN, gradeFor } from '../src/ambient.js';
import { MAP, T } from '../src/world.js';
const H = 3600e3, NOV3 = Date.UTC(2026, 10, 3, 2, 0, 0);

test('sky clock: 24 real minutes per in-game day, deterministic from the wall clock', () => {
  assert.equal(SKY.SKY_DAY_MS, 24 * 60e3);
  assert.equal(SKY.skyHour(NOV3), SKY.skyHour(NOV3)); // every client with the same clock agrees
  assert.ok(Math.abs(SKY.skyHour(NOV3 + 60e3) - ((SKY.skyHour(NOV3) + 1) % 24)) < 1e-6, 'one in-game hour per real minute');
  assert.equal(SKY.skyHour(NOV3 + SKY.SKY_DAY_MS), SKY.skyHour(NOV3), 'repeats each 24 min');
  for (let k = 0; k < 50; k++) { const ms = NOV3 + k * 61_337; const t = SKY.skyWorldT(ms, DAY_LEN);
    assert.ok(Math.abs(dayPhase(t).hour - SKY.skyHour(ms)) < 1e-4, 'ambient dayPhase sees the same hour'); }
  assert.ok(SKY.skyWorldT(NOV3 + 1, DAY_LEN) > SKY.skyWorldT(NOV3, DAY_LEN), 'monotonic (hour-scheduled systems never go backwards)');
});
test('phase bands: dawn / day / dusk / night, and every phase occurs each sky day', () => {
  assert.deepEqual([5.5, 12, 18, 23, 2].map(SKY.todOf), ['dawn', 'day', 'dusk', 'night', 'night']);
  for (const [tod, h] of Object.entries(SKY.TOD_PIN)) assert.equal(SKY.todOf(h), tod, `pin for ${tod}`);
  const seen = new Set(); for (let m = 0; m < 24; m++) seen.add(SKY.todOf(SKY.skyHour(NOV3 + m * 60e3))); assert.deepEqual([...seen].sort(), [...SKY.TODS].sort());
});
test('weather: deterministic from the UTC date + hour, all kinds occur, odds roughly as declared', () => {
  assert.equal(SKY.weatherKind(NOV3), SKY.weatherKind(NOV3 + 59 * 60e3), 'same for the whole hour');
  assert.equal(SKY.weatherKey(NOV3), '2026-11-3-2');
  const n = { clear: 0, cloudy: 0, rain: 0 }; for (let h = 0; h < 24 * 120; h++) n[SKY.weatherKind(NOV3 + h * H)]++;
  const tot = 24 * 120; assert.ok(n.rain / tot > 0.1 && n.rain / tot < 0.26, `rain ${n.rain}`); assert.ok(n.cloudy / tot > 0.22 && n.cloudy / tot < 0.42, `cloudy ${n.cloudy}`); assert.ok(n.clear > n.rain);
  assert.deepEqual(SKY.weatherVals('rain'), { kind: 'rain', rain: 1, cloud: 1 }); assert.deepEqual(SKY.weatherVals('clear'), { kind: 'clear', rain: 0, cloud: 0 });
});
test('debug params only accept known visual values', () => {
  assert.deepEqual(SKY.parseSkyParams('?tod=night&wx=rain'), { tod: 'night', wx: 'rain', low: false });
  assert.deepEqual(SKY.parseSkyParams('?tod=<script>&wx=snow&fx=low'), { tod: null, wx: null, low: true });
});
test('rain pool: preallocated, never above caps, low-fx cuts it, hidden tab freezes', () => {
  const S = SKY.makeSky(() => 0.5); assert.equal(S.drops.length, SKY.CAPS.rain); assert.ok(SKY.CAPS.rain <= 120 && SKY.CAPS.splash <= 24 && SKY.CAPS.fireflies <= 30);
  const ref = S.drops[0]; let max = 0, maxSp = 0;
  for (let i = 0; i < 600; i++) { max = Math.max(max, SKY.stepSky(S, 1 / 60, 1.5, 844, 390, { hidden: false })); maxSp = Math.max(maxSp, SKY.liveSplashes(S)); }
  assert.equal(max, SKY.CAPS.rain); assert.ok(maxSp > 0 && maxSp <= SKY.CAPS.splash); assert.equal(S.drops[0], ref, 'objects reused, not reallocated'); assert.equal(S.drops.length, SKY.CAPS.rain);
  assert.equal(SKY.stepSky(S, 1 / 60, 1, 844, 390, { hidden: false, reduced: true }), SKY.LOW_CAPS.rain);
  const t0 = S.t; SKY.stepSky(S, 1 / 60, 1, 844, 390, { hidden: true }); assert.equal(S.t, t0);
  assert.equal(SKY.stepSky(S, 1 / 60, 0, 844, 390, { hidden: false }), 0);
  const slow = SKY.makeSky(); for (let i = 0; i < 400; i++) SKY.stepSky(slow, 1 / 20, 1, 844, 390, { hidden: false }); assert.ok(slow.slow && slow.active === SKY.LOW_CAPS.rain, 'sustained slow frames drop to the low path');
});
test('fireflies: <= 30, only over park grass / flower beds', () => {
  const A = makeAmbient(42); assert.ok(A.fireflies.length > 10 && A.fireflies.length <= SKY.CAPS.fireflies);
  for (const f of A.fireflies) assert.ok([T.GRASS, T.FLOWER].includes(MAP[f.ty][f.tx]) && SKY.isParkTile(f.tx, f.ty));
});
test('ambient follows the shared weather and clouds grade the scene', () => {
  const A = makeAmbient(1); for (let i = 0; i < 400; i++) stepAmbient(A, 1 / 30, { x: 0, y: 0 }, [], { hour: 12, weather: SKY.weatherVals('rain') });
  assert.equal(A.rain, 1); assert.equal(A.cloud, 1);
  for (let i = 0; i < 400; i++) stepAmbient(A, 1 / 30, { x: 0, y: 0 }, [], { hour: 12, weather: SKY.weatherVals('cloudy') }); assert.equal(A.rain, 0); assert.equal(A.cloud, 1);
  const day = dayPhase(0), g0 = gradeFor(day, 0, 0), g1 = gradeFor(day, 0, 1); assert.deepEqual(g0, [255, 255, 255]); assert.ok(g1.every((v, i) => v < g0[i]));
});
test('firefly draw is capped and culled (fake canvas)', () => {
  const c = { save() {}, restore() {}, fillRect() {}, set fillStyle(v) {}, set globalCompositeOperation(v) {} };
  const many = Array.from({ length: 200 }, (_, i) => ({ x: (i % 20) * 10, y: Math.floor(i / 20) * 10, p: i }));
  assert.ok(SKY.drawFireflies(c, many, 1, 0.62, 0, 0, 844, 390) <= SKY.CAPS.fireflies);
  assert.ok(SKY.drawFireflies(c, many, 1, 0.62, 0, 0, 844, 390, true) <= SKY.LOW_CAPS.fireflies);
  assert.equal(SKY.drawFireflies(c, many, 1, 0.62, -5000, -5000, 844, 390), 0, 'off-screen: nothing drawn');
});

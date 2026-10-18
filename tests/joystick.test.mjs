import test from 'node:test'; import assert from 'node:assert/strict';
import { joyVector, joyPref, JOY, JOY_KEY } from '../src/joystick.js';
const ls = (v) => ({ getItem: (k) => (k === JOY_KEY ? v : null) });
test('joystick: dead zone, axis snap, clamp and sprint at the edge', () => {
  assert.deepEqual([joyVector(3, 2).x, joyVector(3, 2).y], [0, 0]);
  const r = joyVector(40, 0); assert.equal(r.y, 0); assert.ok(r.x > 0.99); assert.ok(r.mag < JOY.RUN);
  const e = joyVector(200, 0); assert.ok(e.mag >= JOY.RUN); assert.ok(Math.abs(e.kx - JOY.R) < 1e-9);
  const d = joyVector(30, 30); assert.ok(d.x > 0 && d.y > 0);
});
test('joystick: OFF by default; save setting wins over localStorage', () => {
  assert.equal(joyPref({}, ls(null)), false); assert.equal(joyPref({ settings: {} }, ls('1')), true);
  assert.equal(joyPref({ settings: { joystick: false } }, ls('1')), false); assert.equal(joyPref({ settings: { joystick: true } }, ls(null)), true);
});

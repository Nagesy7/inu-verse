import test from 'node:test'; import assert from 'node:assert/strict'; import { scale2xData } from '../src/hires.js';
test('scale2x doubles size, keeps palette, rounds a staircase', () => {
  const X = 1, O = 0, src = Uint32Array.from([X, O, X, X]); const out = scale2xData(src, 2, 2);
  assert.equal(out.length, 16); assert.ok([...out].every((v) => v === X || v === O));
  const flat = Uint32Array.from([5, 5, 5, 5]); assert.deepEqual([...scale2xData(flat, 2, 2)], new Array(16).fill(5));
});

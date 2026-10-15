// Audio manager: per-SFX cooldown + concurrent-voice cap (no stacking when a sound is triggered every frame).
import test from 'node:test'; import assert from 'node:assert/strict';
import { gate, MAX_VOICES } from '../src/audio.js';
test('same SFX inside its cooldown is dropped; plays again after it', () => {
  assert.equal(gate('t-a', 0.1, 0.05, 100), true); assert.equal(gate('t-a', 0.1, 0.05, 100.05), false); assert.equal(gate('t-a', 0.1, 0.05, 100.2), true);
});
test('per-frame spam for 1s yields at most 1 / cooldown plays', () => {
  let n = 0; for (let f = 0; f < 60; f++) if (gate('t-spam', 0.12, 0.05, 200 + f / 60)) n++; assert.ok(n <= 9, `played ${n}`);
});
test('concurrent voices are capped', () => {
  let n = 0; for (let i = 0; i < 40; i++) if (gate('t-v' + i, 0, 5, 300)) n++; assert.equal(n, MAX_VOICES);
  assert.equal(gate('t-late', 0, 0.1, 306), true, 'voices free up once they end');
});

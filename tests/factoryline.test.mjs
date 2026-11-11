import test from 'node:test';
import assert from 'node:assert/strict';
import { FACTORY_LINE, factoryFrame } from '../src/factoryline.js';
import { seedState, advance } from '../src/npcbuildings.js';

test('the body drops at slot 3 and the weld and wheel slots are the delta positions', () => {
  const drop = FACTORY_LINE.find((s) => s.id === 'drop');
  const weld = FACTORY_LINE.find((s) => s.id === 'weld');
  const wheels = FACTORY_LINE.find((s) => s.id === 'wheels');
  assert.deepEqual(drop.ms, [260, 200]);
  assert.deepEqual(drop.slot, [128, 92]);
  assert.deepEqual(weld.slot, [30, 24]);
  assert.deepEqual(wheels.slot, [126, 24]);
  assert.equal(factoryFrame(0).stage, 'weld');
  let ms = 0;
  for (const stage of FACTORY_LINE) {
    if (stage.id === 'drop') break;
    ms += stage.ms.reduce((a, b) => a + b, 0);
  }
  assert.equal(factoryFrame(ms).stage, 'drop');
  assert.equal(factoryFrame(ms).frame, 0);
  assert.equal(factoryFrame(ms + 260).stage, 'drop');
  assert.equal(factoryFrame(ms + 260).frame, 1);
  assert.equal(factoryFrame(ms + 260 + 200).stage, 'paint');
});

test('the factory line does not change the workplace ledger', () => {
  const before = seedState();
  const snap = JSON.stringify(before);
  factoryFrame(5000);
  advance(before);
  assert.notEqual(JSON.stringify(before), snap);
  const again = seedState();
  factoryFrame(9000);
  assert.equal(JSON.stringify(again), snap);
});

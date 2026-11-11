import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { clothFrame } from '../src/clothline.js';
import { seedState } from '../src/npcbuildings.js';

test('the cotton picker is Boll and the chain does not touch the ledger', () => {
  const src = readFileSync(new URL('../src/npcwork.js', import.meta.url), 'utf8');
  assert.match(src, /name: 'Boll'/);
  assert.match(src, /hand\('pip', 'Pip'/);
  assert.equal(/function clothHands\(\)[\s\S]*?function drawCotton/.test(src) && /function clothHands\(\)[\s\S]*?function drawCotton/.exec(src)[0].includes('Pip'), false);
  assert.equal(clothFrame(0).stage, 'grow');
  let ms = 0;
  while (clothFrame(ms).stage !== 'pick') ms += 20;
  assert.equal(clothFrame(ms).who, 'boll');
  while (clothFrame(ms).stage !== 'weave') ms += 20;
  assert.equal(clothFrame(ms).who, 'twill');
  const snap = JSON.stringify(seedState());
  clothFrame(8000);
  assert.equal(JSON.stringify(seedState()), snap);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { displayBand, marketShown, cafeFrame, BREAK_MS, serveFrame, powerFrame, depotFrame, vetFrame } from '../src/townline.js';
import { seedState } from '../src/npcbuildings.js';

test('market shelves use four fullness bands, not the raw count', () => {
  assert.equal(displayBand(0), 0);
  assert.equal(displayBand(1), 1);
  assert.equal(displayBand(3), 2);
  assert.equal(displayBand(6), 3);
  assert.notEqual(displayBand(6), 6);
  const empty = marketShown(0, { bread: 0, coats: 0, planks: 0, metal: 0, car: 0 });
  assert.equal(empty.frame, 0);
  const mid = marketShown(900, { bread: 0 });
  assert.equal(mid.kind, 'bread');
  assert.equal(mid.frame, 2);
  const full = marketShown(0, { bread: 8 });
  assert.equal(full.frame, 3);
});

test('the café break is four frames and hides Bean, and the ledger stays put', () => {
  assert.equal(BREAK_MS.length, 4);
  const snap = JSON.stringify(seedState());
  assert.equal(cafeFrame(0).stage, 'barista');
  assert.equal(cafeFrame(0).who, 'bean');
  let ms = 0;
  while (cafeFrame(ms).stage !== 'break') ms += 20;
  assert.equal(cafeFrame(ms).who, 'bean');
  assert.equal(cafeFrame(ms).frame, 0);
  const last = ms + BREAK_MS[0] + BREAK_MS[1] + BREAK_MS[2] + 10;
  assert.equal(cafeFrame(last).frame, 3);
  assert.equal(serveFrame(0).who, 'pip');
  assert.equal(powerFrame(0).stage, 'pump');
  assert.equal(powerFrame(0).who, 'watt');
  assert.equal(depotFrame(0).who, 'dash');
  assert.equal(vetFrame(0).who, 'clover');
  cafeFrame(4000);
  marketShown(4000, { bread: 4 });
  assert.equal(JSON.stringify(seedState()), snap);
});

import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame } from '../src/game.js';
import { newShift, tickShift, finishShift } from '../src/cafe.js';
import { fmtPrice } from '../src/curve.js';
import { mulberry32 } from '../src/rng.js';
import { ensurePacks, joinPack, recordActivity, myPack, packScore, leaderboard } from '../src/packs.js';
import { boardRows } from '../src/leaderboards.js';
import { isSolid, BRIDGES } from '../src/world.js';
import { makeAmbient, stepAmbient } from '../src/ambient.js';

test('a café shift is counted and paid exactly once, even if settled repeatedly (incl. zero-pay shifts)', () => {
  const s = newGame(), sh = newShift(mulberry32(1)); sh.over = true; // nobody served -> pays 0
  for (let i = 0; i < 500; i++) finishShift(s, sh); // UI loop calling every frame
  assert.equal(s.stats.shifts, 1); assert.equal(s.bones, 500);
  const sh2 = newShift(mulberry32(2)); sh2.earned = 40; sh2.over = true; assert.equal(finishShift(s, sh2), 40); assert.equal(finishShift(s, sh2), 0);
  assert.equal(s.stats.shifts, 2); assert.equal(s.bones, 540);
});
test('prices never use scientific notation', () => {
  assert.equal(fmtPrice(3.781e-8), '0.0₇3781'); assert.equal(fmtPrice(0.000012345), '0.0₄1235');
  assert.equal(fmtPrice(0.0123), '0.01230'); assert.equal(fmtPrice(1.5), '1.5');
  for (const p of [1e-12, 4.2e-9, 7e-6, 0.5, 12345.678]) assert.ok(!/e/i.test(fmtPrice(p)), fmtPrice(p));
});
test('Leaderboards monthly pack score == Pack panel score (single source)', () => {
  const s = newGame(); ensurePacks(s); const id = leaderboard(s)[0].id; joinPack(s, id); for (let i = 0; i < 7; i++) recordActivity(s, 'shift');
  const row = boardRows(s, 'verse', 'monthly').find((r) => r.id === myPack(s).id); assert.equal(row.score, packScore(myPack(s)));
});
test('bridges are walkable; ducks never sit on a bridge', () => {
  for (const b of BRIDGES) assert.equal(isSolid(b.x, b.y), false);
  const A = makeAmbient(3); for (let i = 0; i < 2000; i++) { stepAmbient(A, 0.05, { x: 0, y: 0 }); for (const k of A.ducks) { const x = k.cx + Math.cos(k.a) * k.rx, y = k.cy + Math.sin(k.a) * k.ry; for (const b of BRIDGES) assert.ok(!(x > b.x * 32 - 12 && x < (b.x + b.w) * 32 + 12 && y > b.y * 32 - 8 && y < (b.y + b.h) * 32 + 8), 'duck on bridge'); } }
});

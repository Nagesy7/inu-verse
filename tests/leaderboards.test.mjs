import test from 'node:test'; import assert from 'node:assert/strict';
import { GAMES, boardRows, poolEntries } from '../src/leaderboards.js';
import { newGame, claimPlot, buyFurniture, placeFurniture } from '../src/game.js';
import { ensureMall, rollPeriods } from '../src/mall.js';
test('three games, each board states its winning skill criterion', () => {
  assert.deepEqual(Object.keys(GAMES), ['verse', 'empires', 'quest']); assert.equal(GAMES.verse.status, 'live');
  for (const g of Object.values(GAMES)) for (const b of g.boards) { assert.ok(b.criterion && ['daily', 'weekly', 'monthly'].includes(b.pool)); }
  assert.ok(boardRows(newGame(), 'empires', 'rating').every((r) => r.sample));
});
test('live Inu Verse rows rank by score and feed pool payouts', () => {
  const s = newGame(); s.bones = 2000; claimPlot(s, 'p1'); for (let i = 0; i < 14; i++) { buyFurniture(s, 'plant'); placeFurniture(s, 'p1', 'plant', i % 10, i < 10 ? 0 : 1); }
  const w = boardRows(s, 'verse', 'weekly'); assert.equal(w[0].id, 'you'); assert.equal(w[0].score, 140);
  ensureMall(s).activity.dayBones = 9999; assert.equal(boardRows(s, 'verse', 'daily')[0].id, 'you');
  s.mall.pools.daily = 1000; s.mall.pools.weekly = 500; const k0 = s.kibble; rollPeriods(s, 7, poolEntries(s)); assert.ok(s.kibble > k0);
});

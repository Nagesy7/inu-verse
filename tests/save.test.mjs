import test from 'node:test'; import assert from 'node:assert/strict';
import { save, load, clearSave, MemoryStorage, SAVE_KEY } from '../src/save.js';
import { newGame, claimPlot, buyFurniture, placeFurniture } from '../src/game.js';
import { createToken } from '../src/launch.js';
test('save/load round trip keeps plot, furniture, bones, tokens', () => {
  const st = new MemoryStorage(); const s = newGame({ name: 'Kabo', coat: 'gray' });
  claimPlot(s, 'p3'); buyFurniture(s, 'lamp'); placeFurniture(s, 'p3', 'lamp', 2, 2, 0); createToken(s, { name: 'Doge Den', ticker: 'DEN' });
  save(s, st); const l = load(st);
  assert.deepEqual(l, JSON.parse(JSON.stringify(s))); assert.equal(l.plots.p3.items[0].id, 'lamp'); assert.equal(l.tokens[0].ticker, 'DEN'); assert.equal(l.player.coat, 'gray');
});
test('load rejects garbage and empty', () => {
  const st = new MemoryStorage(); assert.equal(load(st), null); st.setItem(SAVE_KEY, '{bad'); assert.equal(load(st), null);
  st.setItem(SAVE_KEY, JSON.stringify({ v: 9 })); assert.equal(load(st), null); clearSave(st); assert.equal(st.getItem(SAVE_KEY), null);
});

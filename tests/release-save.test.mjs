// A live save from the shipped town must open on the new map without touching Bones.
import test from 'node:test';
import assert from 'node:assert/strict';
import { TILE } from '../src/world.js';
import { load, save, MemoryStorage } from '../src/save.js';
import { isBlocked, preparePreviewPlayer } from '../src/townproposal.js';

const LIVE = 'inuverse.save.v1';

function liveSave(player) {
  return {
    v: 1,
    bones: 500,
    kibble: 12,
    player: { name: 'Kabo', coat: 'cream', ...player },
    wardrobe: { owned: ['cap_red'], equipped: { hat: 'cap_red' } },
    stats: { shifts: 3, bonesEarned: 40, served: 1 },
    plots: { p1: { wall: 0, floor: 0, items: [] } },
    inventory: { flour: 2 },
  };
}

function roundTrip(player) {
  const store = new MemoryStorage();
  const raw = liveSave(player);
  store.setItem(LIVE, JSON.stringify(raw));
  const loaded = load(store);
  assert.equal(loaded.bones, 500);
  assert.equal(loaded.kibble, 12);
  assert.equal(loaded.player.name, 'Kabo');
  assert.equal(loaded.player.coat, 'cream');
  assert.deepEqual(loaded.wardrobe.equipped, { hat: 'cap_red' });
  assert.deepEqual(loaded.wardrobe.owned, ['cap_red']);
  assert.equal(loaded.stats.bonesEarned, 40);
  assert.equal(loaded.inventory.flour, 2);
  const placed = preparePreviewPlayer(loaded.player);
  assert.equal(loaded.bones, 500);
  assert.equal(isBlocked(Math.floor(loaded.player.x / TILE), Math.floor(loaded.player.y / TILE)), false);
  save(loaded, store);
  const again = JSON.parse(store.getItem(LIVE));
  assert.equal(again.bones, 500);
  assert.equal(again.kibble, 12);
  assert.equal(again.stats.bonesEarned, 40);
  assert.deepEqual(again.wardrobe.equipped, { hat: 'cap_red' });
  assert.equal(again.player.name, 'Kabo');
  assert.equal(store.getItem('inuverse.preview.npcwork.v1'), null);
  return { loaded, placed, again };
}

test('an open 276e094 save keeps its pixel, bones, and wardrobe', () => {
  const spot = roundTrip({ x: 46.5 * TILE, y: 31.5 * TILE });
  assert.equal(spot.placed.moved, false);
  assert.equal(spot.again.player.x, 46.5 * TILE);
  assert.equal(spot.again.player.y, 31.5 * TILE);
});

test('a 276e094 save standing inside a new building is moved, and Bones stay 500', () => {
  const buried = { x: 56.5 * TILE, y: 83.5 * TILE };
  const spot = roundTrip(buried);
  assert.equal(spot.placed.moved, true);
  assert.ok(spot.loaded.player.x !== buried.x || spot.loaded.player.y !== buried.y);
  assert.equal(spot.again.player.x, buried.x);
  assert.equal(spot.again.player.y, buried.y);
  assert.equal(spot.again.bones, 500);
});

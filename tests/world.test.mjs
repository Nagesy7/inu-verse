import test from 'node:test'; import assert from 'node:assert/strict';
import { PLOTS, BUILDINGS, isSolid, findPath, interactables, nearestInteractable, TILE } from '../src/world.js';
import { newGame } from '../src/game.js';
test('8 plots and 7 buildings', () => { assert.equal(PLOTS.length, 8); assert.deepEqual(BUILDINGS.map((b) => b.id), ['cafe', 'shop', 'fashion', 'launch', 'cars', 'academy', 'lounge']); });
test('every interactable reachable from spawn', () => {
  const s = newGame(); const sx = Math.floor(s.player.x / TILE), sy = Math.floor(s.player.y / TILE); assert.equal(isSolid(sx, sy), false);
  for (const it of interactables(s)) assert.ok(findPath(sx, sy, it.tx, it.ty), it.id);
});
test('nearest interactable', () => { const s = newGame(); const it = interactables(s).find((i) => i.id === 'cafe'); assert.equal(nearestInteractable(s, (it.tx + 0.5) * TILE, (it.ty + 0.5) * TILE).id, 'cafe'); });
import { NPC_INTERIORS, npcHome } from '../src/homes.js';
import { canPlace } from '../src/furniture.js';
test('pre-made NPC homes have valid non-overlapping furniture', () => {
  for (const id of Object.keys(NPC_INTERIORS)) { const h = npcHome(id); for (const it of h.items) assert.ok(canPlace(h, it.id, it.x, it.y, it.rot, it.uid), `${id} ${it.id}`); }
});

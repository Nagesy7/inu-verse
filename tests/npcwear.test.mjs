// Townsfolk wear (beanie / scarf / jacket) are outfit-atlas layers drawn with the body, not flat overlay rectangles.
import test from 'node:test';
import assert from 'node:assert/strict';
import { OUTFITS } from '../src/outfits.js';
import { OUTFIT_ATLAS } from '../src/outfit-atlas.js';
import { outfitLayers, NPC_WEAR_IDS } from '../src/art.js';
import { WEAR_ITEM, folkOutfit } from '../src/folkart.js';
const COATS = ['tan', 'cream', 'red', 'dark', 'golden', 'gray'], VIEWS = ['front', 'side', 'back'];
test('every townsfolk wear item has a layer for all 6 coats, 3 views, 4 walk frames', () => {
  for (const { slot, id } of Object.values(WEAR_ITEM)) {
    assert.ok(NPC_WEAR_IDS.has(id)); assert.equal(OUTFIT_ATLAS.items[id]?.slot, slot);
    for (const c of COATS) for (const v of VIEWS) for (let f = 0; f < 4; f++) assert.ok(OUTFIT_ATLAS.frames[c][`${id}|${v}|${f}`], `${id} ${c} ${v} ${f}`);
  }
});
test('townsfolk wear is never a player item (not sold, equipped or traded)', () => { for (const id of NPC_WEAR_IDS) assert.equal(OUTFITS[id], undefined); });
test('folkOutfit puts the worn item in its slot and the layer stack draws it after the base', () => {
  assert.deepEqual(folkOutfit({}, 'beanie'), { hat: 'npc_beanie' }); assert.deepEqual(folkOutfit({ top: 'x' }, 'scarf'), { top: 'x', neck: 'npc_scarf' }); assert.deepEqual(folkOutfit({}, null), {});
  assert.deepEqual(outfitLayers('tan', 'side', 1, folkOutfit({}, 'jacket')), ['base|side|1', 'npc_jacket|side|1']);
  assert.deepEqual(outfitLayers('dark', 'back', 3, { hat: 'npc_beanie', neck: 'npc_scarf' }), ['base|back|3', 'npc_scarf|back|3', 'npc_beanie|back|3']);
});

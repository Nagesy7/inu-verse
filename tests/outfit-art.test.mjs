import test from 'node:test';
import assert from 'node:assert/strict';
import { OUTFITS, SLOTS } from '../src/outfits.js';
import { OUTFIT_ATLAS } from '../src/outfit-atlas.js';
import { COATS } from '../src/game.js';
const COAT_KEYS = ['tan', 'cream', 'red', 'dark', 'golden', 'gray'];
test('every coat has layered base art for all views/frames', () => {
  for (const c of COAT_KEYS) { assert.ok(COATS[c]); for (const v of ['front', 'side', 'back']) for (let f = 0; f < 4; f++) assert.ok(OUTFIT_ATLAS.frames[c]?.[`base|${v}|${f}`], `${c} base ${v} ${f}`); }
});
test('every outfits.js item has a manifest layer (matching slot) for all 6 coats', () => {
  for (const [id, d] of Object.entries(OUTFITS)) {
    const it = OUTFIT_ATLAS.items[id]; assert.ok(it, `manifest missing ${id}`);
    assert.equal(it.slot, d.slot, `${id} slot`); assert.ok(SLOTS.includes(it.slot));
    assert.equal(it.replacesBottom, !!d.full, `${id} replacesBottom vs full`);
    for (const c of COAT_KEYS) { assert.ok(it.coats.includes(c), `${id} has no layer files for ${c}`); assert.ok([0, 1, 2, 3].every((f) => OUTFIT_ATLAS.frames[c][`${id}|front|${f}`]), `${id} ${c} front pixels`); }
  }
});

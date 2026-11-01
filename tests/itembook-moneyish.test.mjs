// moneyish() / the item-book offer gate must agree with the Trading Post catalog rule (src/trade.js):
// only real currency ids are refused, never item ids that merely contain "bone"/"kibble" as a word or substring.
import test from 'node:test';
import assert from 'node:assert/strict';
import { moneyish, offerItems, guardItemData } from '../src/sim/itembook.js';
import { tradeableIds, isTradeable } from '../src/trade.js';

test('moneyish matches real currency ids (exact) and currency-named items (leading whole word), not substrings', () => {
  for (const k of ['bones', 'BONES', 'bone', 'kibble', '$KIBBLE', 'pawmarks', 'PAWMARK', 'paw_marks', 'sol', 'usdc', 'lamports', 'coins', 'treasury', 'payout', 'kibble_bag', 'bone_pile', 'bonesX10'])
    assert.equal(moneyish(k), true, k);
  for (const k of ['cosy_bone_street_sketch', 'trombone', 'bonearm', 'kibbleish', 'cosy_kibble_corner', 'top_hat', 'chair', '', null])
    assert.equal(moneyish(k), false, String(k));
});
test('f:cosy_bone_street_sketch: tradeable in the Trading Post AND accepted by the server offer gate', () => {
  assert.equal(isTradeable('f:cosy_bone_street_sketch'), true);
  assert.deepEqual(offerItems({ a: ['f:cosy_bone_street_sketch'], b: ['w:top_hat'] }), { a: ['f:cosy_bone_street_sketch'], b: ['w:top_hat'] });
});
test('every item the client lists as tradeable passes the server offer gate (client and server agree)', () => {
  for (const id of tradeableIds()) assert.doesNotThrow(() => offerItems({ a: [id], b: [id === 'w:top_hat' ? 'w:shades' : 'w:top_hat'] }), id);
});
test('currency-named ids and currency data keys are still refused', () => {
  for (const id of ['f:pawmarks', 'w:bones', 'f:kibble', 'w:coins', 'w:kibble_bag', 'f:bone_pile'])
    assert.throws(() => offerItems({ a: [id], b: ['w:top_hat'] }), (e) => e.kind === 'economy', id);
  for (const d of [{ bones: 1 }, { bonesPaid: 2 }, { kibble_amount: 3 }, { note: { treasury: 1 } }])
    assert.throws(() => guardItemData(d), (e) => e.kind === 'economy', JSON.stringify(d));
  assert.doesNotThrow(() => guardItemData({ note: 'cosy_bone_street_sketch', item: 'f:cosy_bone_street_sketch' }));
});

import test from 'node:test'; import assert from 'node:assert/strict';
import { createCurve, buy, sell, quoteBuy, price, CURVE, progress } from '../src/curve.js';
test('buy then sell round-trips with zero fee', () => {
  const c = createCurve({ feeBps: 0 });
  const q = buy(c, 5); const r = sell(c, q.tokensOut);
  assert.ok(Math.abs(r.kibbleOut - 5) < 1e-9); assert.ok(c.realKibble < 1e-9); assert.ok(Math.abs(c.vKib - CURVE.virtualKibble) < 1e-9);
});
test('fee round trip loses exactly fees, KIBBLE conserved', () => {
  const c = createCurve(); let wallet = 10;
  const q = buy(c, 4); wallet -= q.kibbleUsed; const r = sell(c, q.tokensOut); wallet += r.kibbleOut;
  assert.ok(Math.abs(wallet + c.realKibble + c.fees - 10) < 1e-9);
  assert.ok(wallet < 10);
});
test('price rises with buys and k is preserved', () => {
  const c = createCurve(); const k = c.vKib * c.vTok; const p0 = price(c);
  buy(c, 3); assert.ok(price(c) > p0); assert.ok(Math.abs(c.vKib * c.vTok / k - 1) < 1e-12);
});
test('many random trades conserve KIBBLE and token supply', () => {
  const c = createCurve(); let kibbleOut = 0, kibbleIn = 0, held = 0;
  for (let i = 0; i < 500; i++) {
    if (i % 3 !== 2) { const q = buy(c, 0.5 + (i % 7)); kibbleIn += q.kibbleUsed; held += q.tokensOut; }
    else { const r = sell(c, held * 0.4); kibbleOut += r.kibbleOut; held -= r.tokensIn; }
  }
  assert.ok(Math.abs(kibbleIn - kibbleOut - c.realKibble - c.fees) < 1e-6);
  assert.ok(Math.abs(held - c.sold) < 1e-3);
});
test('graduates when curve fills and caps tokens', () => {
  const c = createCurve(); const q = buy(c, 10000);
  assert.ok(c.graduated); assert.ok(q.graduatedNow); assert.ok(Math.abs(c.sold - CURVE.curveSupply) < 1);
  assert.ok(q.kibbleUsed < 10000); assert.equal(progress(c), 1);
});
test('cannot sell more than sold', () => { const c = createCurve(); const r = sell(c, 1000); assert.equal(r.tokensIn, 0); });
test('quote matches execution', () => { const c = createCurve(); const q = quoteBuy(c, 2); const e = buy(c, 2); assert.equal(q.tokensOut, e.tokensOut); });

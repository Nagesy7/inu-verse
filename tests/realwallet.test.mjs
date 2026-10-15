// Real (non-demo) wallet adapter: launching-soon before the mint, inventory credits, async pay -> tap again to receive.
import test from 'node:test'; import assert from 'node:assert/strict';
import { kibblePayWallet, setWallet, setDemo, SOON, PendingWallet, wallet } from '../src/wallet.js';
import { buyPet } from '../src/pets.js'; import { buyMallItem } from '../src/mall.js'; import { newGame } from '../src/game.js';
const ev = () => { const l = []; return { l, dispatchEvent: (e) => l.push(e) }; };
globalThis.CustomEvent ??= class { constructor(type, o) { this.type = type; this.detail = o?.detail; } };
test('real mode, mint not set: purchases say KIBBLE launching soon and never touch state.kibble', () => {
  setDemo(false); setWallet(null); assert.equal(wallet(), PendingWallet);
  const s = newGame(); s.kibble = 0; const r = buyPet(s, 'dragon'); assert.equal(r.ok, false); assert.equal(r.reason, SOON); assert.equal(s.kibble, 0);
  const kp = { cfg: { provisioned: false }, session: 't', address: 'W', inventory: async () => ({}) }; setWallet(kibblePayWallet(kp, { events: ev() }));
  assert.equal(buyMallItem(s, 'gold_suit').reason, SOON); setWallet(null); setDemo(true);
});
test('real mode, live: buy starts a Phantom payment (catalog id only), paid event, tap again delivers once', async () => {
  setDemo(false); const calls = []; let resolve; const E = ev();
  const kp = { cfg: { provisioned: true }, session: 't', address: 'W', buy: (o) => { calls.push(o); return new Promise((r) => (resolve = r)); }, inventory: async () => ({ 'inu-verse': {} }), balance: async () => ({ ui: '5' }) };
  setWallet(kibblePayWallet(kp, { events: E })); const s = newGame(); s.kibble = 0;
  const r1 = buyPet(s, 'dragon'); assert.equal(r1.ok, false); assert.ok(r1.pending); assert.deepEqual(calls, [{ itemId: 'inu-verse:pet-dragon', game: 'inu-verse' }]);
  buyPet(s, 'dragon'); assert.equal(calls.length, 1, 'no double payment while pending');
  resolve({ ok: true, signature: 'sig' }); await new Promise((r) => setTimeout(r, 0)); assert.equal(E.l[0].type, 'kibble:paid');
  const r2 = buyPet(s, 'dragon'); assert.ok(r2.ok); assert.equal(s.pets.owned.length, 1); assert.equal(s.kibble, 0, 'no fake balance');
  assert.equal(buyPet(s, 'dragon').ok, false, 'one payment = one item'); setWallet(null); setDemo(true);
});
test('real mode: items the wallet already owns (server inventory) are delivered after sign-in on any device', async () => {
  setDemo(false); const kp = { cfg: { provisioned: true }, session: 't', address: 'W', inventory: async () => ({ 'inu-verse': { 'inu-verse:mall-gold_suit': 1 } }), balance: async () => ({ ui: '0' }) };
  const w = setWallet(kibblePayWallet(kp, { events: ev() })); await w.refresh(); const s = newGame(); s.kibble = 0;
  assert.ok(buyMallItem(s, 'gold_suit').ok); assert.ok(s.wardrobe.owned.includes('gold_suit')); setWallet(null); setDemo(true);
});

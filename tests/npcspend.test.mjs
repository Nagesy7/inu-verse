// NPC spending (preview): wallets, wants, saving up, buying, wearing, showing off, extra shifts, restock on demand.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as N from '../src/npcspend.js';
import { SHOPS } from '../src/shops.js';
import { stockOf } from '../src/townxui.js';
import { folkOverlay } from '../src/folkart.js';

test('every townsfolk worker and hauler has a Bones purse: wage in, food and home out, deterministic', () => {
  assert.equal(N.FOLK.length, 14);
  for (const f of N.FOLK) { const a = N.folkDay(f.id, 30), b = N.folkDay(f.id, 30); assert.deepEqual(a, b); assert.ok(a.pay >= 18); assert.equal(a.food, N.SPEND.FOOD); assert.equal(a.home, N.SPEND.HOME); assert.ok(a.savings >= 0); assert.ok(SHOPS[a.lunch.shop].items.some((i) => i.id === a.lunch.item)); }
});
test('wants -> saves up when short -> buys a couple of days later -> wears it after', () => {
  let seen = 0;
  for (const f of N.FOLK) for (let d = 3; d < 80; d++) { const t = N.folkDay(f.id, d); if (!t.bought) continue; const y = N.folkDay(f.id, d - 1);
    assert.equal(y.want.id, t.bought.id, 'they wanted it the day before'); assert.ok(d - y.wantSince >= N.WANT_MIN_DAYS, 'a couple of days later');
    if (t.bought.wear) { const later = N.folkStatus(f.id, d + 1); if (!N.folkDay(f.id, d + 1).bought?.wear) { assert.equal(later.wearing, t.bought.wear); seen++; } } }
  assert.ok(seen > 20, 'lots of wear purchases show up on the NPC');
  const saving = N.FOLK.flatMap((f) => Array.from({ length: 60 }, (_, d) => N.folkStatus(f.id, d))).filter((s) => s.status === 'saving up');
  assert.ok(saving.length > 10); for (const s of saving) { assert.ok(s.want.short > 0); assert.match(N.wantLine(s), /^Oh, I want that .+! Saving up, \d+ Bones to go\.$/); }
});
test('they show off new things, broke workers take an extra shift, plenty saved goes on the home', () => {
  const all = N.FOLK.flatMap((f) => Array.from({ length: 60 }, (_, d) => ({ f, d, s: N.folkStatus(f.id, d) })));
  const show = all.find((x) => x.s.showOff?.wear); assert.match(N.showOffLine(show.s), /^Check out my new (scarf|beanie|jacket)!$/);
  const extra = all.filter((x) => x.s.extraShift); assert.ok(extra.length > 3);
  for (const x of extra) { assert.ok(N.folkDay(x.f.id, x.d - 1).broke, 'only after a broke day'); assert.equal(x.s.pay, Math.round(N.wageOf(x.f.id) * 1.5)); assert.ok(N.shiftLine(x.s)); }
  assert.ok(all.some((x) => x.s.homeUpgrade), 'home upgrades happen'); assert.ok(all.some((x) => x.s.homeItems.includes('lantern')));
});
test('wants become shop demand; shops restock on demand and the shelf shows it', () => {
  const d = Array.from({ length: 80 }, (_, i) => i).find((i) => N.townWants(i).wanted.some((w) => w.shop === 'tailor'));
  const W = N.townWants(d), w = W.wanted.find((x) => x.shop === 'tailor');
  assert.ok(W.demand.wool >= w.who.length); const r = N.restockOf('tailor', w.id, d); assert.equal(r.n, w.who.length * N.RESTOCK_PER_WANT);
  const rows = [{ good: 'wool', stock: 0 }]; assert.equal(stockOf('tailor', w.id, rows, d), r.n, 'sold out, but restocked for the folks who want it');
  assert.equal(N.spendingRows(d).length, 14);
});
test('NPC money copy never says real earnings, $KIBBLE or wallet', () => {
  const txt = JSON.stringify([N.spendingRows(40), N.townWants(40).wanted, N.FOLK.map((f) => [N.wantLine(N.folkStatus(f.id, 40)), N.showOffLine(N.folkStatus(f.id, 40))])]).toLowerCase();
  for (const bad of ['kibble', '$', 'real earn', 'wallet', 'usd', 'crypto']) assert.ok(!txt.includes(bad), bad);
});
test('wear overlay keeps the worker\'s own overlay and adds the bubble', () => {
  let drew = 0; const base = { draw: () => { drew++; } };
  const c = { save() {}, restore() {}, fillRect() {}, measureText: (t) => ({ width: t.length * 9 }), fillText() {}, set fillStyle(v) {}, set font(v) {}, set textAlign(v) {}, set textBaseline(v) {}, set imageSmoothingEnabled(v) {} };
  folkOverlay(base, 'jacket', 'Check out my new jacket!', 'down').draw(c); assert.equal(drew, 1); assert.equal(folkOverlay(base, null, null, 'down'), base);
});

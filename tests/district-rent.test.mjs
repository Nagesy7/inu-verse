import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as R from '../src/district-rent.js';
import * as D from '../src/districts.js';
R.setDistrictRentEnabled(true); // these tests cover the logic itself; the release flag is off by default (see district-rent-off.test.mjs)

const S = (bones = 500) => ({ bones });
test('approved table: 15/35/50/80 Bones per day, deposit 2 days, close after 3 unpaid, one lease, no skim', () => {
  assert.deepEqual(R.BOOTH_IDS.map((c) => [c, R.BOOTHS[c].rent, R.deposit(c)]), [['row_plaque', 15, 30], ['row_booth', 35, 70], ['district_kiosk', 50, 100], ['district_venue_skin', 80, 160]]);
  assert.equal(R.DEPOSIT_DAYS, 2); assert.equal(R.UNPAID_CLOSE, 3); assert.equal(R.MAX_LEASES, 1); assert.equal(R.POOL_SHARE, 0);
  const biz = readFileSync(new URL('../src/biz.js', import.meta.url), 'utf8'); assert.match(biz, /LEASE_DEPOSIT = 2\b/);
  assert.ok(!/pool/i.test(readFileSync(new URL('../src/district-rent.js', import.meta.url), 'utf8').replace(/POOL_SHARE = 0|no 10% skim|pure Bones sink|pure sink/g, '').replace(/\/\/.*$/gm, '')));
});
test('districts: plaque/booth on arcade-row only; kiosk/banner only where a cabinet is live', () => {
  for (const c of R.BOOTH_IDS) for (const d of R.BOOTHS[c].districts) assert.ok(D.DISTRICTS.some((x) => x.id === d), d);
  assert.ok(R.offered('row_plaque', 'arcade-row')); assert.ok(!R.offered('row_plaque', 'arena'));
  assert.ok(R.offered('district_kiosk', 'arena')); // Shiba Scuffle is live
  assert.ok(!R.offered('district_kiosk', 'fud-field')); assert.ok(!R.offered('district_kiosk', 'arcade-row'));
  assert.ok(R.offered('district_venue_skin', 'arcade-row')); assert.ok(!R.offered('nope', 'arcade-row')); assert.ok(!R.offered('row_plaque', 'mars'));
});
test('lease: charges deposit, one active lease, refuses when short', () => {
  const s = S(100); assert.equal(R.leaseBooth(s, 'district_venue_skin', 'arena', 0).ok, false); assert.equal(s.bones, 100);
  const r = R.leaseBooth(s, 'row_booth', 'arcade-row', 5); assert.ok(r.ok); assert.equal(s.bones, 30); assert.equal(s.districtRent.lease.paidThrough, 7);
  assert.equal(R.leaseBooth(s, 'row_plaque', 'arcade-row', 5).reason, 'You already lease a booth');
  assert.equal(R.boothIn(s, 'arcade-row').id, 'row_booth'); assert.equal(R.boothIn(s, 'arena'), null);
});
test('tickDay: deposit covers 2 days, then daily rent; 3 unpaid days close; Bones never negative', () => {
  const s = S(30); R.leaseBooth(s, 'row_plaque', 'arcade-row', 0); assert.equal(s.bones, 0);
  assert.ok(R.tickDay(s, 0).covered); assert.ok(R.tickDay(s, 1).covered);
  s.bones = 20; assert.equal(R.tickDay(s, 2).paid, 15); assert.equal(s.bones, 5);
  assert.equal(R.tickDay(s, 3).unpaid, 1); assert.equal(R.tickDay(s, 4).unpaid, 2); assert.equal(s.bones, 5);
  const c = R.tickDay(s, 5); assert.ok(c.closed); assert.equal(s.districtRent.lease, null); assert.equal(s.districtRent.history[0].why, 'unpaid'); assert.ok(s.bones >= 0);
  assert.equal(s.districtRent.spent, 45); assert.equal(R.tickDay(s, 6), null);
});
test('unpaid streak resets on a paid day; voluntary end has no refund', () => {
  const s = S(70); R.leaseBooth(s, 'row_plaque', 'arcade-row', 0); s.bones = 0; R.tickDay(s, 2); R.tickDay(s, 3); s.bones = 15; R.tickDay(s, 4); assert.equal(s.districtRent.lease.unpaid, 0);
  const b = s.bones; assert.ok(R.endLease(s).ok); assert.equal(s.bones, b); assert.equal(R.endLease(s).ok, false);
});
test('affordability: casual earn (60-120/day) holds plaque or booth; soft-cap warn per spec', () => {
  assert.equal(R.rentWarn('row_plaque', 60), false); assert.equal(R.rentWarn('row_booth', 80), false);
  assert.equal(R.rentWarn('district_kiosk', 60), true); assert.equal(R.rentWarn('district_kiosk', 120), false); assert.equal(R.rentWarn('district_venue_skin', 120), true);
  assert.equal(R.rentWarn('row_booth', 80, 40), true); // stacking on a Farm Lane lot warns
});
test('copy: cosmetic only, cabinets free, no $KIBBLE / prize / MC words in the module', () => {
  assert.equal(R.LEASE_COPY, 'Cosmetic booth only. Cabinets stay free. Bones never cash out.');
  const code = readFileSync(new URL('../src/district-rent.js', import.meta.url), 'utf8').replace(/\/\/.*$/gm, '');
  for (const w of ['kibble', 'prize', 'odds', 'market cap', 'wallet']) assert.ok(!code.toLowerCase().includes(w), w);
  assert.ok(Object.isFrozen(R.BOOTHS) && Object.isFrozen(R.BOOTHS.row_plaque));
});

// District booth rent is released: flag ON by default. The off-switch still no-ops writes.
// Fresh imports so this file never mutates the shared ENABLED flag other tests use.
import test from 'node:test';
import assert from 'node:assert/strict';

test('district rent flag is ON by default so the live app can lease booths', async () => {
  const R = await import('../src/district-rent.js?on=' + Date.now());
  assert.equal(R.DISTRICT_RENT_DEFAULT, true);
  assert.equal(R.districtRentEnabled(), true);
});

test('setDistrictRentEnabled(false) still makes every write path a no-op', async () => {
  const R = await import('../src/district-rent.js?off=' + Date.now());
  R.setDistrictRentEnabled(false);
  const s = { bones: 1000 };
  assert.equal(R.ensureDistrictRent(s), null);
  const r = R.leaseBooth(s, 'row_plaque', 'arcade-row', 1); assert.equal(r.ok, false); assert.equal(r.off, true);
  assert.equal(R.tickDay(s, 5), null); assert.equal(R.endLease(s).ok, false); assert.equal(R.boothIn(s, 'arcade-row'), null);
  assert.deepEqual(s, { bones: 1000 });
});

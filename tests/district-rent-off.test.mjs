// District booth rent (837b452) must stay inert in the live app until Zachary approves its release.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

test('district rent flag is OFF by default and every write path is a no-op', async () => {
  const R = await import('../src/district-rent.js?off=' + Date.now());
  assert.equal(R.DISTRICT_RENT_DEFAULT, false); assert.equal(R.districtRentEnabled(), false);
  const s = { bones: 1000 };
  assert.equal(R.ensureDistrictRent(s), null);
  const r = R.leaseBooth(s, 'row_plaque', 'arcade-row', 1); assert.equal(r.ok, false); assert.equal(r.off, true);
  assert.equal(R.tickDay(s, 5), null); assert.equal(R.endLease(s).ok, false); assert.equal(R.boothIn(s, 'arcade-row'), null);
  assert.deepEqual(s, { bones: 1000 }); // no Bones charged, no s.districtRent written
});

test('nothing in the shipped app imports district-rent.js', () => {
  const hits = []; const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) { if (!/node_modules|tests|proof|\.git/.test(f)) walk(p); } else if (/\.(m?js|html)$/.test(f) && !/district-rent\.js$/.test(f) && /district-rent/.test(readFileSync(p, 'utf8'))) hits.push(p); } };
  walk(new URL('..', import.meta.url).pathname); assert.deepEqual(hits, []);
});

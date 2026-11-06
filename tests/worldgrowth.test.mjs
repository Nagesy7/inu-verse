import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as W from '../src/worldgrowth.js';
import { makeHandler, KEY } from '../api/kibble-mood.js';
import { memoryKv } from '../api/_lib/kv.js';
import * as KM from '../src/kibblemood.js';

test('tiers match growth-map v1.1 (no invented item grants or Bones amounts)', () => {
  assert.deepEqual(W.TIERS.map((t) => [t.id, t.name, t.mcUsd]), [
    ['seed', 'Seed Town', 0],
    ['puppy_block', 'Puppy Block', 50000],
    ['neighbourhood', 'Neighbourhood', 100000],
    ['borough', 'Borough', 250000],
    ['city_ward', 'City Ward', 500000],
    ['capital_district', 'Capital District', 1000000],
    ['metropolis', 'Metropolis', 5000000],
  ]);
  assert.ok(Object.isFrozen(W.TIERS) && Object.isFrozen(W.TIERS[0]) && Object.isFrozen(W.TIERS[1].unlocks));
  const src = readFileSync(new URL('../src/worldgrowth.js', import.meta.url), 'utf8');
  for (const w of ['grantItem', 'grant(', 'awardKibble', 'kibble +=', 'swapBones', 'inu-verse:']) assert.ok(!src.includes(w), w);
});

test('tierFromMc picks by live marketCapUsd; unknown/negative MC is no tier', () => {
  assert.equal(W.tierFromMc(0).id, 'seed');
  assert.equal(W.tierFromMc(49999).id, 'seed');
  assert.equal(W.tierFromMc(50000).id, 'puppy_block');
  assert.equal(W.tierFromMc(99999).id, 'puppy_block');
  assert.equal(W.tierFromMc(100000).id, 'neighbourhood');
  assert.equal(W.tierFromMc(249999).id, 'neighbourhood');
  assert.equal(W.tierFromMc(250000).id, 'borough');
  assert.equal(W.tierFromMc(499999).id, 'borough');
  assert.equal(W.tierFromMc(500000).id, 'city_ward');
  assert.equal(W.tierFromMc(999999).id, 'city_ward');
  assert.equal(W.tierFromMc(1000000).id, 'capital_district');
  assert.equal(W.tierFromMc(4999999).id, 'capital_district');
  assert.equal(W.tierFromMc(5000000).id, 'metropolis');
  assert.equal(W.tierFromMc(9e12).id, 'metropolis');
  assert.equal(W.tierFromMc(null), null);
  assert.equal(W.tierFromMc(-1), null);
  assert.equal(W.mcOf({ marketCapUsd: 4600 }), 4600);
  assert.equal(W.tierFromMc(W.mcOf({ marketCapUsd: 4600 })).id, 'seed');
});

test('2-poll hysteresis matches mood: first reading accepted, a new tier needs two consecutive polls', () => {
  let h = W.stepWorld(null, 'seed');
  assert.equal(h.tier, 'seed');
  h = W.stepWorld(h, 'puppy_block');
  assert.equal(h.tier, 'seed', '1st poll of Puppy Block: still Seed Town');
  assert.equal(h.pending, 'puppy_block');
  h = W.stepWorld(h, 'seed');
  assert.equal(h.tier, 'seed');
  assert.equal(h.pending, null, 'flap back resets');
  h = W.stepWorld(h, 'puppy_block');
  h = W.stepWorld(h, 'neighbourhood');
  assert.equal(h.tier, 'seed', 'different new tiers do not add up');
  assert.equal(h.count, 1);
  h = W.stepWorld(h, 'neighbourhood');
  assert.equal(h.tier, 'neighbourhood', '2nd consecutive neighbourhood poll switches');
  h = W.stepWorld(h, null);
  assert.equal(h.tier, 'neighbourhood', 'missing MC keeps the last good tier');
  assert.equal(W.HOLD_POLLS, 2);
});

test('?worldTier= preview and statue line never print a live MC snapshot', () => {
  assert.equal(W.parseWorldTier('borough').id, 'borough');
  assert.equal(W.parseWorldTier('city-ward').id, 'city_ward');
  assert.equal(W.parseWorldTier('capital').id, 'capital_district');
  assert.equal(W.parseWorldTier('Seed Town').id, 'seed');
  assert.equal(W.parseWorldTier('nope'), null);
  const ov = W.readGrowth({ marketCapUsd: 4600, worldTier: 'seed' }, { search: '?worldTier=borough' });
  assert.equal(ov.worldTier, 'borough');
  assert.equal(ov.override, true);
  assert.equal(ov.nextTier, 'city_ward');
  assert.equal(ov.nextAt, 500000);
  assert.equal(W.statueLine(W.readGrowth({ marketCapUsd: 4600 })), 'Seed Town · next unlock at Puppy Block ($50K).');
  assert.equal(W.statueLine(W.snapshotOf('metropolis')), 'Metropolis.');
  assert.equal(W.statueLine(W.snapshotOf(null)), 'Town growth follows the live $KIBBLE market cap. No live figure is printed here.');
  assert.match(W.statueLine(ov), /Borough · next unlock at City Ward \(\$500K\) · preview/);
  assert.ok(!/\$4\.6/.test(W.statueLine(W.readGrowth({ marketCapUsd: 4600 }))));
});

test('card lists coming-soon presence, keeps already-live weather/seasons, never grants or sells', () => {
  assert.equal(typeof W.grant, 'undefined');
  const html = W.cardHtml((s) => s, { snap: W.snapshotOf('seed') });
  assert.match(html, /Town growth/);
  assert.match(html, /Seed Town · next unlock at Puppy Block \(\$50K\)\./);
  assert.match(html, /coming soon/);
  assert.match(html, /Community Hall shell/);
  assert.match(html, /not a vote/);
  assert.match(html, /no Bones, Treats or \$KIBBLE drops/);
  assert.match(html, /already live/);
  assert.match(html, /mood API, not market cap/);
  assert.match(html, /Seasons pack/);
  assert.match(html, /stay off until a live calendar is approved/);
  assert.match(html, /does not grant items/);
  assert.ok(!/buy now|moon|invest|earn yield|stake for rewards/i.test(html));
  assert.ok(!html.includes('inu-verse:'));
});

test('readGrowth prefers the mood API worldTier fields when present', () => {
  const snap = W.readGrowth({ marketCapUsd: 999999, worldTier: 'seed', nextTier: 'puppy_block', nextAt: 50000 });
  assert.equal(snap.worldTier, 'seed', 'display follows the API hysteresis, not the raw MC');
  assert.equal(snap.nextAt, 50000);
  const fallback = W.readGrowth({ marketCapUsd: 250000 });
  assert.equal(fallback.worldTier, 'borough');
});

const dex = (mc, h1 = 1, h24 = 1) => [{ baseToken: { address: KM.MINT }, priceUsd: '0.00001', priceChange: { h1, h24 }, liquidity: { usd: 5000 }, marketCap: mc }];
function fakeFetch(state) {
  return async (u) => {
    if (String(u).includes('dexscreener')) return { ok: true, json: async () => state.dex };
    return { ok: false, status: 503 };
  };
}
const call = (h) => new Promise((done) => {
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { done({ code: this.statusCode, body: JSON.parse(b) }); } };
  h({ method: 'GET', url: '/api/kibble-mood', headers: {} }, res);
});

test('mood API exposes worldTier / nextTier / nextAt from live marketCapUsd with 2-poll hysteresis', async () => {
  let t = 2_000_000; const kv = memoryKv(() => t); const st = { dex: dex(4600) };
  const h = makeHandler({ env: {}, kv, f: fakeFetch(st), now: () => t });
  let r = await call(h);
  assert.equal(r.body.worldTier, 'seed');
  assert.equal(r.body.nextTier, 'puppy_block');
  assert.equal(r.body.nextAt, 50000);
  assert.equal(r.body.pendingWorldTier, null);
  st.dex = dex(60000); t += 61_000; r = await call(h);
  assert.equal(r.body.worldTier, 'seed', 'first Puppy Block poll held back');
  assert.equal(r.body.pendingWorldTier, 'puppy_block');
  t += 61_000; r = await call(h);
  assert.equal(r.body.worldTier, 'puppy_block');
  assert.equal(r.body.nextTier, 'neighbourhood');
  assert.equal(r.body.nextAt, 100000);
  assert.ok(await kv.get(KEY));
});

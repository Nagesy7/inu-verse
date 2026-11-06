import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as G from '../src/growth.js';

test('growth bands match the economy-loop v1.1 flavour table (no invented item grants)', () => {
  assert.deepEqual(G.BANDS.map((b) => [b.id, b.name, b.mcUsdMin, b.mcUsdMax]), [
    ['puppy_town', 'Puppy Town', 0, 50000],
    ['growing_kennel', 'Growing Kennel', 50000, 250000],
    ['pack_city', 'Pack City', 250000, 1000000],
    ['capital', 'Capital', 1000000, 5000000],
    ['inuted_states', 'Inuted States', 5000000, null],
  ]);
  assert.equal(G.BANDS[0].flavour, 'Core plaza mood; starter cosmetic spotlight');
  assert.equal(G.BANDS[1].flavour, 'Busier ambient density; Guard Dog flair campaign');
  assert.equal(G.BANDS[2].flavour, 'Seasonal mall drop set (fixed prices)');
  assert.equal(G.BANDS[3].flavour, 'Alpha / Top Dog cosmetic spotlight week');
  assert.equal(G.BANDS[4].flavour, 'Full Living World traffic density; festival cosmetics');
  assert.ok(Object.isFrozen(G.BANDS) && Object.isFrozen(G.BANDS[0]));
});

test('bandFor picks by MC; unknown/negative MC is no band', () => {
  assert.equal(G.bandFor(0).id, 'puppy_town');
  assert.equal(G.bandFor(49999).id, 'puppy_town');
  assert.equal(G.bandFor(50000).id, 'growing_kennel');
  assert.equal(G.bandFor(249999).id, 'growing_kennel');
  assert.equal(G.bandFor(250000).id, 'pack_city');
  assert.equal(G.bandFor(999999).id, 'pack_city');
  assert.equal(G.bandFor(1000000).id, 'capital');
  assert.equal(G.bandFor(4999999).id, 'capital');
  assert.equal(G.bandFor(5000000).id, 'inuted_states');
  assert.equal(G.bandFor(9e12).id, 'inuted_states');
  assert.equal(G.bandFor(null), null);
  assert.equal(G.bandFor(-1), null);
  assert.equal(G.mcOf({ marketCapUsd: 182000 }), 182000);
  assert.equal(G.bandFor(G.mcOf({ marketCapUsd: 182000 })).id, 'growing_kennel');
});

test('module never grants items or $KIBBLE; card is flavour-only', () => {
  assert.equal(typeof G.grant, 'undefined');
  const src = readFileSync(new URL('../src/growth.js', import.meta.url), 'utf8');
  for (const w of ['grantItem', 'grant(', 'awardKibble', 'kibble +=', 'swapBones', 'inu-verse:']) assert.ok(!src.includes(w), w);
  assert.match(G.NOTE, /never \$KIBBLE from play/);
  const html = G.cardHtml((s) => s, { band: G.BANDS[1] });
  assert.match(html, /Town growth/);
  assert.match(html, /Growing Kennel/);
  assert.match(html, /not a district gate/);
  assert.ok(!/buy now|moon|invest|earn yield/i.test(html));
});

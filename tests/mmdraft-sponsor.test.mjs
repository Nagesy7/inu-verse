// ⭐ Sponsored sides in the Launch Hall draft desk: coin only from the live sponsors list, own mint only.
import test from 'node:test'; import assert from 'node:assert/strict';
import * as MD from '../src/mmdraft.js';

const MINT = '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump', ID = 'a1b2c3d4e5f6';
const row = (o = {}) => ({ id: ID, ticker: 'FARTCOIN', name: 'Test Sponsor', mint: MINT, color: '#33cc99', tierName: 'Featured', expiresAt: Date.now() + 864e5,
  art: `${MD.KIBBLE_API}/api/cabal?op=sponsor-img&id=${ID}&k=art`, ...o });
const link = (o = {}) => '#' + new URLSearchParams({ v: '1', family: 'sponsor', sister: 'FARTCOIN', sponsor: ID, name: 'Gm Frens', ticker: 'GF', desc: 'gm $FARTCOIN and $BTC to the moon', ...o });

test('registry: only live, Kibble Pay art, no locked coins or copycats', () => {
  const reg = MD.buildSponsorRegistry([row(), row({ id: 'bbbbbbbbbbbb', ticker: 'BTC', mint: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr' }),
    row({ id: 'cccccccccccc', ticker: 'OLD', mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', expiresAt: Date.now() - 1 }),
    row({ id: 'dddddddddddd', ticker: 'EVIL', mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', art: 'https://evil.example/a.png' }),
    row({ id: 'eeeeeeeeeeee', ticker: 'KIBB', mint: MD.KIBBLE_MINT })]);
  assert.deepEqual([...reg.keys()], [ID]);
});
test('parseDraft: sponsored draft pairs only with its own mint; refuses unknown / unloaded', () => {
  const sponsors = MD.buildSponsorRegistry([row()]);
  const r = MD.parseDraft(link(), { sponsors });
  assert.equal(r.ok, true); assert.equal(r.draft.coin.mint, MINT); assert.equal(r.draft.side, 'sponsor'); assert.equal(r.draft.sponsored.id, ID);
  assert.ok(!/\$BTC|moon/i.test(r.draft.desc), 'foreign ticker + promise stripped');
  assert.ok(r.notes.some((n) => /not an endorsement/.test(n)));
  assert.equal(MD.parseDraft(link({ parent: 'BTC', ca: MD.SISTERS.BTC.mint }), { sponsors }).draft.coin.mint, MINT, 'parent/ca in link ignored');
  assert.equal(MD.parseDraft(link(), {}).reason, 'sponsor-unavailable');
  assert.equal(MD.parseDraft(link({ sponsor: 'ffffffffffff' }), { sponsors }).reason, 'sponsor-unknown');
  assert.equal(MD.parseDraft(link({ sister: 'BTC' }), { sponsors }).reason, 'sponsor-unknown', 'ticker must match the application');
  assert.equal(MD.parseDraft(link({ family: 'cabal' }), { sponsors }).reason, 'pending', 'not a Cabal sister');
  assert.equal(MD.parseDraft(link({ ticker: 'FARTCOIN' }), { sponsors }).draft.ticker !== 'FARTCOIN', true, 'no copycat ticker');
});
test('existing drafts unchanged', () => {
  const r = MD.parseDraft('#v=1&family=cabal&sister=BTC&name=X&ticker=XX');
  assert.equal(r.ok, true); assert.equal(r.draft.side, 'cabal'); assert.equal(r.draft.color, '#f7931a'); assert.equal(r.draft.sponsored, null);
});

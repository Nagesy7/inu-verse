import test from 'node:test'; import assert from 'node:assert/strict';
import * as MD from '../src/mmdraft.js';
const P = (f) => MD.parseDraft(new URL(MD.draftUrl('https://inu-verse-tawny.vercel.app/launch-draft.html', f)).hash);
test('BTC draft: fields kept, parent locked to $BTC', () => { const r = P({ sister: 'BTC', name: 'Big Titty Junior', ticker: 'btcjr', desc: 'gm from the Cabal', reward: '5', src: 'pairs' });
  assert.equal(r.ok, true); assert.equal(r.draft.coin.mint, 'C5xph2yL6gMdxmuLGxJBkGpmuDFfyi5fqkBNhvL6pump'); assert.equal(r.draft.ticker, 'BTCJR'); assert.equal(r.draft.reward, 5); assert.equal(r.draft.fromPairBuilder, true); });
test('ETH draft pairs with $ETH only', () => { const r = P({ sister: 'ETH' }); assert.equal(r.draft.coin.mint, 'CXWNzqBE98SSmkGgHogJZd9vjsLdgaMAFpVfV22ypump'); assert.equal(r.draft.name, 'Extra Thick Hoe Meme'); assert.equal(r.draft.ticker, 'ETHMEME'); });
test('a parent / CA in the link can never override the sister coin', () => { const r = P({ sister: 'BTC', parent: MD.KIBBLE_MINT, ca: 'CXWNzqBE98SSmkGgHogJZd9vjsLdgaMAFpVfV22ypump' });
  assert.equal(r.draft.coin.ticker, 'BTC'); assert.equal(r.notes.filter((n) => /Ignored/.test(n)).length, 2); });
test('pending sisters, Inu and $KIBBLE are refused', () => { for (const s of ['SOL', 'XRP', 'XLM', 'GOLD', 'FOO']) assert.equal(P({ sister: s }).reason, 'pending');
  assert.equal(P({ sister: 'KIBBLE' }).reason, 'inu'); assert.equal(P({ family: 'inu', sister: 'BTC' }).reason, 'inu'); assert.equal(MD.parseDraft('').reason, 'empty'); });
test('description: foreign CAs, tickers and price promises removed; own coin kept', () => { const r = P({ sister: 'BTC', ticker: 'JR', desc: `$BTC and $JR, 100x guaranteed $ETH ${MD.KIBBLE_MINT} to the moon, risk-free C5xph2yL6gMdxmuLGxJBkGpmuDFfyi5fqkBNhvL6pump` });
  assert.ok(!/ETH|4VE9|100x|guarantee|moon|risk/i.test(r.draft.desc), r.draft.desc); assert.ok(/\$BTC/.test(r.draft.desc) && /\$JR/.test(r.draft.desc) && /C5xph2/.test(r.draft.desc)); });
test('ticker $KIBBLE is reset; name/ticker limits; html stripped', () => { const r = P({ sister: 'ETH', ticker: 'KIBBLE', name: '<b>x</b>'.repeat(20) });
  assert.equal(r.draft.ticker, 'ETHMEME'); assert.ok(r.draft.name.length <= 32 && !/[<>]/.test(r.draft.name)); assert.equal(P({ sister: 'ETH', ticker: 'ABCDEFGHIJKLMN' }).draft.ticker.length, 10); });
test('images: only maker-hosted /assets art by URL; data URLs validated', () => {
  assert.equal(P({ sister: 'BTC', img: 'https://evil.example/x.png' }).draft.image, MD.SISTERS.BTC.art);
  assert.equal(P({ sister: 'BTC', img: 'https://cabal-meme-maker.vercel.app/assets/eth-mascot.png' }).draft.imageSource, 'preset');
  assert.equal(MD.safeImageUrl('https://cabal-meme-maker.vercel.app/assets/../x.png'), null);
  assert.ok(MD.safeDataUrl('data:image/png;base64,iVBORw0KGgo=')); assert.equal(MD.safeDataUrl('data:text/html;base64,PGI+'), null); assert.equal(MD.safeDataUrl('javascript:alert(1)'), null); });
test('origins + back link', () => { assert.ok(MD.isMakerOrigin('https://cabal-meme-maker.vercel.app')); assert.ok(MD.isMakerOrigin('https://cabal-meme-maker-abc123-prosper33.vercel.app'));
  assert.ok(!MD.isMakerOrigin('https://cabal-meme-maker.vercel.app.evil.com')); assert.ok(!MD.isMakerOrigin('https://evil.vercel.app'));
  assert.equal(P({ sister: 'BTC', from: 'https://evil.example/' }).draft.back, MD.MAKER_URL); assert.equal(P({ sister: 'BTC', from: 'https://cabal-meme-maker.vercel.app/#k=BTC&t=x' }).draft.back, 'https://cabal-meme-maker.vercel.app/#k=BTC&t=x'); });
test('reward clamps to 0..100; launch sheet is NFA', () => { assert.equal(P({ sister: 'BTC', reward: '250' }).draft.reward, 100); assert.equal(P({ sister: 'BTC', reward: '-3' }).draft.reward, null);
  assert.match(MD.launchSheet(P({ sister: 'BTC', reward: 2 }).draft), /NFA/); });
test('copycat protection: parent name/ticker cannot be reused', () => { const r = P({ sister: 'BTC', name: 'big titty coin', ticker: '$BTC' });
  assert.equal(r.draft.name, 'Big Titty Coin Meme'); assert.equal(r.draft.ticker, 'BTCMEME'); assert.equal(r.notes.length, 2); });
test('leaderboard: top creator per verified sister only, text cleaned', () => {
  const lb = { boards: [{ sister: 'BTC', topCreator: { name: '<b>zach</b>', points: 7 }, memes: [{ headline: 'gm $ETH 100x guaranteed', score: 7, creator: 'zach' }] },
    { sister: 'ETH', topCreator: null, memes: [] }, { sister: 'SOL', topCreator: { name: 'x', points: 1 }, memes: [] }] };
  const t = MD.topCreators(lb);
  assert.deepEqual(t.map((x) => x.sister), ['BTC', 'ETH']); assert.ok(!/[<>]/.test(t[0].top.name)); assert.ok(!/ETH|100x|guarantee/i.test(t[0].meme.headline), t[0].meme.headline);
  assert.equal(t[1].top, null); assert.deepEqual(MD.topCreators(null), []); });
// Pair-of-pairs (fixture registry: FAKE test mints, never shipped; the real PAIRS list stays empty until Zachary adds one)
const FX = MD.buildPairRegistry([
  { id: 'BTCJR', name: 'Big Titty Junior', ticker: '$BTCJR', ca: 'TestJr1111111111111111111111111111111111', parent: 'BTC' },
  { id: 'BTCJR2', name: 'Junior Junior', ticker: 'JRJR', ca: 'TestJrJr22222222222222222222222222222222', parent: 'BTCJR' },
  { id: 'ORPHAN', name: 'x', ticker: 'ORF', ca: 'TestOrph3333333333333333333333333333333', parent: 'NOPE' },
  { id: 'DUPE', name: 'x', ticker: 'DUP', ca: 'C5xph2yL6gMdxmuLGxJBkGpmuDFfyi5fqkBNhvL6pump', parent: 'BTC' },
  { id: 'KIBKID', name: 'x', ticker: 'KK', ca: 'TestKib4444444444444444444444444444444444', parent: 'KIBBLE' }]);
const PF = (f) => MD.parseDraft(new URL(MD.draftUrl('https://x.test/launch-draft.html', f)).hash, { pairs: FX });
test('pair registry: chains to a sister only; orphans, locked mints, Inu parents dropped', () => {
  assert.deepEqual([...FX.keys()], ['BTCJR', 'BTCJR2']); assert.equal(FX.get('BTCJR2').root, 'BTC'); assert.equal(FX.get('BTCJR2').depth, 2);
  assert.equal(MD.PAIRS.length, 0); assert.equal(MD.buildPairRegistry().size, 0); });
test('pair-of-pairs: parent id resolves its CA from the registry only', () => {
  const r = PF({ sister: 'BTC', parent: 'BTCJR2', name: 'Triple Jr', ticker: 'JR3', desc: 'for $JRJR and $BTC holders, $ETH nope' });
  assert.equal(r.ok, true); assert.equal(r.draft.coin.mint, 'TestJrJr22222222222222222222222222222222'); assert.equal(r.draft.coin.ticker, 'JRJR');
  assert.deepEqual(r.draft.parentPair.chain, ['$BTC', '$BTCJR', '$JRJR']); assert.ok(/\$JRJR/.test(r.draft.desc) && /\$BTC/.test(r.draft.desc) && !/ETH/.test(r.draft.desc));
  assert.match(MD.launchSheet(r.draft), /TestJrJr2222/); });
test('pair-of-pairs: CA / unknown id / wrong sister in the link fall back to the sister coin', () => {
  const c = PF({ sister: 'BTC', parent: 'TestJr1111111111111111111111111111111111' }); assert.equal(c.draft.parentPair, null); assert.equal(c.draft.coin.ticker, 'BTC'); assert.ok(c.notes.some((n) => /Ignored "parent"/.test(n)));
  for (const [sister, parent] of [['BTC', 'NOTREAL'], ['ETH', 'BTCJR']]) { const r = PF({ sister, parent }); assert.equal(r.ok, false); assert.equal(r.reason, 'unregistered-parent'); }
  const r = PF({ sister: 'BTC', parent: 'BTCJR', ca: 'TestJrJr22222222222222222222222222222222' }); assert.equal(r.draft.coin.ticker, 'BTCJR'); assert.ok(r.notes.some((n) => /Ignored "ca"/.test(n)));
  assert.equal(P({ sister: 'BTC', parent: 'BTCJR' }).reason, 'unregistered-parent'); assert.equal(P({ sister: 'BTC', parent: '$BTC' }).draft.coin.ticker, 'BTC'); });
test('pair-of-pairs copycat: cannot reuse the parent pair name/ticker', () => { const r = PF({ sister: 'BTC', parent: 'BTCJR', name: 'big titty junior', ticker: 'BTCJR' });
  assert.equal(r.draft.name, 'Big Titty Junior Meme'); assert.equal(r.draft.ticker, 'BTCJRMEME'); });
test('$CRIME is its own side: exact mint only, never crosses with the Cabal sisters or Inu', () => {
  const CR = 'BN4Z5NtntHhu6p3atEqkeAVi8Bn9Ri2QTv8FD7iupump';
  const r = P({ sister: 'CRIME', family: 'crime', name: 'Crime Kitten', ticker: 'ckit', desc: 'a $CRIME kid, not $BTC or $KIBBLE', kit: 'Crime Cat', img: 'https://cabal-meme-maker.vercel.app/assets/crime/crime-logo.jpg' });
  assert.equal(r.ok, true); assert.equal(r.draft.coin.mint, CR); assert.equal(r.draft.coin.ticker, 'CRIME'); assert.equal(r.draft.imageSource, 'preset');
  assert.ok(/\$CRIME/.test(r.draft.desc) && !/\$BTC|\$KIBBLE/.test(r.draft.desc), r.draft.desc);
  assert.equal(P({ sister: 'CRIME' }).draft.image, MD.SISTERS.CRIME.art);
  // cross-side links refused both ways
  assert.equal(P({ sister: 'CRIME', family: 'cabal' }).reason, 'side-mismatch');
  assert.equal(P({ sister: 'BTC', family: 'crime' }).reason, 'side-mismatch');
  assert.equal(P({ sister: 'CRIME', family: 'inu' }).reason, 'inu');
  // a link can't swap the CRIME parent (copycat CA / ticker) and CRIME can't be reused as a draft ticker
  const c = P({ sister: 'CRIME', family: 'crime', ca: '7M3gExampleCopycatCAxxxxxxxxxxxxxxxxxxxxpump', ticker: 'CRIME' });
  assert.equal(c.draft.coin.mint, CR); assert.notEqual(c.draft.ticker, 'CRIME');
  assert.equal(P({ sister: 'BTC', ticker: 'CRIME' }).draft.ticker, 'BTCMEME', 'no parent ticker from another side either');
});

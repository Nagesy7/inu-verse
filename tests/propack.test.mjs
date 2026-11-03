// Launch Pro Pack pure helpers: guard (Inu/KIBBLE free), pump.fun fields + limits, socials, sheet, checklist, zip writer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as PP from '../src/propack.js';
import { cleanProps } from '../src/va.js';

const D = { side: 'cabal', sister: 'BTC', color: '#f7931a', name: 'Pepe Cabal', ticker: 'PEPEC', desc: 'The frog that runs the cabal. Fan meme coin.', coin: { ticker: 'BTC', name: 'Big Titty Coin', mint: 'So11111111111111111111111111111111111111112' } };

test('guard: Inu / $KIBBLE drafts never get a pack; cabal/crime/sponsor do', () => {
  assert.equal(PP.propackAllowed(D), true);
  assert.equal(PP.propackAllowed({ ...D, side: 'crime' }), true);
  assert.equal(PP.propackAllowed({ ...D, side: 'inu' }), false);
  assert.equal(PP.propackAllowed({ ...D, coin: { ...D.coin, ticker: 'KIBBLE' } }), false);
  assert.equal(PP.propackAllowed(null), false);
});
test('socials normalise to https links; junk is dropped', () => {
  assert.equal(PP.normSocial('x', '@pepe_cabal'), 'https://x.com/pepe_cabal');
  assert.equal(PP.normSocial('x', 'https://twitter.com/pepe_cabal/'), 'https://x.com/pepe_cabal');
  assert.equal(PP.normSocial('tg', 't.me/pepecabal'), 'https://t.me/pepecabal');
  assert.equal(PP.normSocial('web', 'pepecabal.xyz'), 'https://pepecabal.xyz/');
  assert.equal(PP.normSocial('web', 'javascript:alert(1)'), '');
  assert.equal(PP.normSocial('web', 'http://pepecabal.xyz'), '');
  assert.equal(PP.normSocial('x', 'not a handle!!'), '');
});
test('pump.fun fields: order, limits, files, pair CA, notes', () => {
  const f = PP.pumpFields(D, { x: '@pepe_cabal', tg: 'bad tg!!' });
  assert.deepEqual(f.map((x) => x.key), ['name', 'ticker', 'desc', 'image', 'banner', 'website', 'x', 'telegram', 'pair']);
  assert.equal(f[1].value, 'PEPEC'); assert.match(f[0].note, /10\/32/);
  assert.equal(f.find((x) => x.key === 'x').value, 'https://x.com/pepe_cabal');
  assert.match(f.find((x) => x.key === 'telegram').note, /not a valid/);
  assert.equal(f.find((x) => x.key === 'pair').value, D.coin.mint);
  assert.match(PP.pumpFields({ ...D, name: 'x'.repeat(40) })[0].note, /too long: 40\/32/);
  const txt = PP.sheetText(D, f), html = PP.sheetHtml({ ...D, name: '<img onerror=1>' }, f);
  assert.match(txt, /Ticker:\nPEPEC/); assert.match(txt, /Not financial advice/);
  assert.doesNotMatch(html, /<img onerror/); assert.equal((html.match(/data-v=/g) || []).length, 5, 'copy buttons for the text fields that have values');
});
test('checklist: pair-only rule, safety, NFA', () => {
  const cl = PP.checklist(D, PP.pumpFields(D, {})), t = PP.checklistText(D, cl);
  assert.equal(cl.length, 4); assert.match(t, /\[ \] Pair: choose Custom and paste the \$BTC address/); assert.match(t, /seed phrase/); assert.match(t, /NFA/);
  assert.match(t, /So11…1112/);
});
test('zip: valid STORE archive that unzip can list and extract (crc ok)', () => {
  assert.equal(PP.crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 255]);
  const z = PP.makeZip([{ name: 'logo-1000.png', data: png }, { name: 'token-sheet.txt', data: 'Name:\nPepe Cabal ✓' }]);
  const dir = mkdtempSync(join(tmpdir(), 'ppzip-')), file = join(dir, 'p.zip'); writeFileSync(file, z);
  let ok = true; try { execFileSync('unzip', ['-v'], { stdio: 'ignore' }); } catch { ok = false; }
  if (ok) {
    assert.match(execFileSync('unzip', ['-t', file]).toString(), /No errors detected/);
    execFileSync('unzip', ['-o', '-q', file, '-d', dir]);
    assert.deepEqual([...readFileSync(join(dir, 'logo-1000.png'))], [...png]); assert.equal(readFileSync(join(dir, 'token-sheet.txt'), 'utf8'), 'Name:\nPepe Cabal ✓');
  }
});
test('readme + files list; analytics props carry no wallet data', () => {
  assert.equal(PP.FILES.length, 9); assert.match(PP.readme(D, { id: 'abc123', sig: 'xyz' }), /Order abc123/);
  assert.deepEqual(cleanProps({ wallet: '7rPVPVBi8sDAcLNkEK6zdEnreeK3SV56ARaXzhnRUNRg', side: 'cabal', coin: 'BTC', result: 'unlocked' }), { side: 'cabal', coin: 'BTC', result: 'unlocked' });
  assert.equal(PP.PRICE_FALLBACK.priceFinal, true); assert.equal(PP.PRICE_FALLBACK.refundFinal, true); assert.equal(PP.PRICE_FALLBACK.sol, 0.25);
});

test('Launch Bundle: PROPOSAL 0.65 SOL fallback, proposal refund wording, ops per product, side link to the maker', () => {
  const B = PP.BUNDLE_FALLBACK;
  assert.equal(B.sol, 0.65); assert.equal(B.separately, 0.75); assert.equal(B.priceFinal, false); assert.equal(B.refundFinal, false);
  assert.match(B.refund, /Pro Pack part is non-refundable once it's unlocked.*0\.5 SOL by hand/);
  assert.deepEqual(PP.opsFor('bundle'), { message: 'bundle-message', order: 'bundle-order', check: 'bundle-pay-check', status: 'bundle-status', config: 'bundle-config' });
  assert.equal(PP.opsFor('propack').check, 'propack-pay-check'); assert.equal(PP.opsFor(undefined).order, 'propack-order');
  assert.equal(PP.bundleSideUrl('https://cabal-meme-maker.vercel.app/', 'a1b2c3d4e5f6'), 'https://cabal-meme-maker.vercel.app/#sponsor?bundle=a1b2c3d4e5f6');
  assert.equal(PP.bundleSideUrl('http://localhost:4187', 'x y'), 'http://localhost:4187/#sponsor?bundle=x%20y');
  assert.equal(PP.kitNeedsCoin({ kit: { status: 'needs-details' } }), true); assert.equal(PP.kitNeedsCoin({ kit: { status: 'not-added' } }), true);
  assert.equal(PP.kitNeedsCoin({ kit: { status: 'in-review' } }), false); assert.equal(PP.kitNeedsCoin(null), false);
  assert.equal(PP.propackAllowed({ ...D, side: 'inu' }), false, 'no bundle on Inu drafts either (the whole card is removed)');
});
test('Launch Bundle analytics props carry no wallet data', () => {
  const p = cleanProps({ kind: 'bundle', paid: true, from: 'lh-card', wallet: '7rPVPVBi8sDAcLNkEK6zdEnreeK3SV56ARaXzhnRUNRg', x: '7rPVPVBi8sDAcLNkEK6zdEnreeK3SV56ARaXzhnRUNRg' });
  assert.deepEqual(Object.keys(p).sort(), ['from', 'kind', 'paid']);
});

// Regression: opening Friends with an EMPTY list froze the page (refreshWho returned without stamping FRS.at, and renderFriends
// re-rendered after every refresh -> endless microtask loop). The panel must open and the page keep running, with mp on or off.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { chromium } from 'playwright'; import { serveRoot } from './serve-root.mjs';

test('source: an empty friends list stamps FRS.at before returning', () => {
  const src = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(src, /if \(!names\.length\) \{ FRS\.who = \{\}; FRS\.at = Date\.now\(\); return FRS\.who; \}/);
});

test('browser 844x390: Friends opens with no friends and the page stays responsive', { timeout: 90000 }, async () => {
  const srv = await serveRoot(), b = await chromium.launch(), errs = [];
  try { const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }), p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    await p.route(/kibble-pay|_vercel/, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' })); await p.route('**/api/**', (r) => r.abort());
    await p.goto(srv.url + '?mp=off'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:test'); }); await p.reload(); await p.waitForTimeout(700); await p.click('#start'); await p.waitForTimeout(1000);
    await p.evaluate(() => document.getElementById('btn-friends').click());
    const r = await Promise.race([p.evaluate(() => new Promise((d) => setTimeout(() => d(document.querySelector('#panel #fr-name') ? 'open' : 'no-input'), 300))), new Promise((d) => setTimeout(() => d('HUNG'), 8000))]);
    assert.equal(r, 'open', 'Friends panel open and timers still run');
    await ctx.close(); assert.deepEqual(errs, []); } finally { await b.close(); srv.close(); }
});

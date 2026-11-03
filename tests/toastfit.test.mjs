import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { toastSlot, TF } from '../src/toastfit.js';
import { serveRoot, overlaps } from './serve-root.mjs';

test('toastSlot: bottom strip above the lowest obstacle, never above the pup\'s feet; one line when only one fits; top row when none', () => {
  assert.deepEqual(toastSlot(390, []), { low: true, bottom: TF.EDGE, one: false });
  const ev = toastSlot(390, [271]); assert.equal(ev.low, true); assert.equal(ev.bottom, 390 - 271 + TF.GAP); assert.equal(ev.one, true, '271 - 6 - (195 + 18) = 52 px: newest only');
  assert.equal(toastSlot(390, [330]).one, false, 'two fit above a short chat bar');
  assert.deepEqual(toastSlot(390, [220]), { low: false, bottom: null, one: false }, 'no room (tall chat log): back to the top row');
  assert.equal(toastSlot(390, [300, 271]).bottom, 125, 'highest obstacle wins');
});

test('css: low toasts only in phone landscape, clear of the ticker, stick and A/B pad', () => {
  const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8'), i = css.indexOf('/* Toasts off the player'); assert.ok(i > 0);
  const block = css.slice(i, css.indexOf('\n}\n', i));
  assert.match(block, /@media \(orientation:landscape\) and \(max-height:500px\)\{/);
  assert.match(block, /body\.inworld\.toast-low #toast\{top:auto!important;bottom:var\(--toast-b,10px\)!important;max-width:calc\(100vw - 2 \* max\(176px,24vw \+ 16px\)\)!important\}/);
  assert.match(block, /toast-one #toast \.toast:nth-last-child\(n\+2\)\{display:none\}/);
  assert.ok(css.indexOf('body.inworld.banner-up #toast{top:var(--banner-b)!important}') < i, 'comes after the banner rule so it wins');
});

test('browser: toasts never cover the player in the middle of the screen at 844x390 / 667x375 (with and without the event banner)', { timeout: 120000 }, async () => {
  const srv = await serveRoot(), b = await chromium.launch(), errs = [];
  try { for (const vp of [{ width: 844, height: 390 }, { width: 667, height: 375 }]) {
    const ctx = await b.newContext({ viewport: vp, isMobile: true, hasTouch: true }), p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    await p.route(/kibble-pay|_vercel/, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
    await p.goto(srv.url + '?mp=off'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:test'); }); await p.reload(); await p.waitForTimeout(700); await p.click('#start'); await p.waitForTimeout(1200);
    for (const ev of [true, false]) {
      await p.evaluate((ev) => { const e = document.getElementById('ev-banner'); if (e) { e.hidden = !ev; e.style.opacity = ev ? '1' : '0'; clearTimeout(e._t); }
        const t = document.getElementById('toast'); t.innerHTML = ''; for (const m of ['Older line', 'Login streak: day 1', 'Welcome to Inu Verse, Kabosu!']) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = m; t.appendChild(d); } }, ev);
      await p.waitForTimeout(500);
      const R = await p.evaluate(() => { const q = (e) => { if (!e) return null; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width && cs.display !== 'none' && cs.visibility !== 'hidden' ? [r.x, r.y, r.width, r.height] : null; };
        return { toasts: [...document.querySelectorAll('#toast .toast')].map(q).filter(Boolean), ev: q(document.getElementById('ev-banner')), o: ['stick', 'btn-a', 'btn-emo'].map((id) => q(document.getElementById(id))) }; });
      const pup = [vp.width / 2 - 28, vp.height / 2 - 100, 56, 100]; // camera-centred pup: name tag to feet
      const at = `ev:${ev} @${vp.width}x${vp.height}`; assert.ok(R.toasts.length >= 1, 'a toast shows ' + at);
      for (const t of R.toasts) { assert.ok(!overlaps(t, pup), `toast ${t} on the pup ${at}`); if (R.ev) assert.ok(!overlaps(t, R.ev), 'toast on the event banner ' + at); for (const o of R.o) assert.ok(!overlaps(t, o), `toast ${t} on control ${o} ${at}`); }
    }
    await ctx.close(); }
    assert.deepEqual(errs, []); } finally { await b.close(); srv.close(); }
});

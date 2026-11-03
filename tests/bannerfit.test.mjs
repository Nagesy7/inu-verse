// Town crier banner nudge (phone landscape): the crier / president banner sits in the centre slot under the prompt row, never on
// the HUD top bar, the town-news ticker, the minimap or the Connect Wallet pill; toasts stack just under it (src/bannerfit.js).
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { chromium } from 'playwright';
import * as BF from '../src/bannerfit.js';
import { EVENT_TYPES } from '../src/feed.js';
import { serveRoot, overlaps } from './serve-root.mjs';

test('bannerBottom / toastTop: lowest visible banner wins, never above the default toast row, null when none shows', () => {
  assert.equal(BF.bannerBottom([]), null); assert.equal(BF.bannerBottom([{ width: 0, height: 0, bottom: 90 }]), null, 'zero-size = hidden');
  assert.equal(BF.bannerBottom([{ width: 200, height: 57, bottom: 165 }, { width: 200, height: 84, bottom: 192 }]), 192);
  assert.equal(BF.toastTop(null, 100), null); assert.equal(BF.toastTop(192, 100), 198); assert.equal(BF.toastTop(40, 100), 100, 'never above the default row');
  assert.ok(BF.isShortLandscape(844, 390) && BF.isShortLandscape(667, 375) && !BF.isShortLandscape(390, 844) && !BF.isShortLandscape(1280, 800));
});

test('bannerfit is DOM-only: no network, currency or game state', () => {
  const src = fs.readFileSync(new URL('../src/bannerfit.js', import.meta.url), 'utf8');
  assert.ok(!/fetch\(|XMLHttpRequest|WebSocket|bones|kibble|localStorage/i.test(src.replace(/^\/\/.*$/gm, '')));
  const css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8'); assert.match(css, /body\.inworld\.banner-up #toast\{top:var\(--banner-b\)!important\}/);
  assert.match(fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8'), /syncChat\(document, window\); fitBanners\(document, window\);/, 'fitted from the throttled loop hook');
});

const STUB = () => { document.querySelectorAll('#inu-profile-badge,#inu-wallet').forEach((e) => e.remove()); // kibble-pay widgets are external: same inline styles it sets
  const add = (html) => { const d = document.createElement('div'); d.innerHTML = html; const e = d.firstElementChild; document.body.appendChild(e); return e; };
  add('<div id="inu-wallet" style="position:fixed;z-index:10001;top:62px;right:8px"><button id="inu-wallet-btn" style="width:134px;height:44px">Connect Wallet</button></div>'); };

test('browser: crier + president banners clear of HUD bar, ticker (closed/open), minimap, wallet pill; toasts under them, clear of the event banner', { timeout: 150000 }, async () => {
  const srv = await serveRoot(), b = await chromium.launch(), errs = [], k = Object.keys(EVENT_TYPES)[0];
  try { for (const vp of [{ width: 844, height: 390 }, { width: 740, height: 360 }, { width: 667, height: 375 }]) {
    const ctx = await b.newContext({ viewport: vp, isMobile: true, hasTouch: true }), p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    await p.route(/kibble-pay|_vercel/, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
    await p.goto(srv.url + '?mp=off&event=derby'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:test'); }); await p.reload(); await p.waitForTimeout(700); await p.click('#start'); await p.waitForTimeout(1200);
    await p.evaluate(STUB);
    for (const tick of ['closed', 'open']) for (const kind of ['crier', 'pres']) {
      await p.evaluate(({ k, tick, kind }) => { const F = __feed.ui; F.S.events = [{ i: 'abc123', k, n: 'Tora', x: '', t: Date.now(), v: 1 }, { i: 'abc124', k, n: 'Mochi', x: '', t: Date.now() - 1000, v: 1 }]; F.S.collapsed = false; F.S.open = tick === 'open'; F.render();
        const c = document.getElementById('crier-banner') || Object.assign(document.body.appendChild(document.createElement('div')), { id: 'crier-banner' });
        const pr = document.getElementById('pres-banner') || Object.assign(document.body.appendChild(document.createElement('div')), { id: 'pres-banner' });
        if (kind === 'crier') { c.innerHTML = '<b>CRIER BARKLEY</b><span>Hear ye! A long town crier line that wraps to two or three lines on a small phone screen today.</span>'; c.className = 'show mood-happy'; pr.hidden = true; }
        else { c.className = ''; pr.style.cssText = 'position:fixed;left:50%;top:64px;transform:translateX(-50%);z-index:40;padding:10px 22px;font:14px Silkscreen,monospace'; pr.textContent = '★ The President is visiting Kibble Plaza! ★'; pr.hidden = false; }
        const t = document.getElementById('toast'); t.innerHTML = ''; for (const m of ['Older toast line', 'Login streak: day 1 (device-only)', 'Welcome to Inu Verse, Kabosu! Hard worker: +10% pay']) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = m; t.appendChild(d); }
        const ev = document.getElementById('ev-banner'); if (ev) { ev.hidden = false; ev.style.opacity = '1'; clearTimeout(ev._t); } }, { k, tick, kind });
      await p.waitForTimeout(300); await p.waitForFunction(() => { const b = document.querySelector('#crier-banner.show') || document.getElementById('pres-banner'), r = b.getBoundingClientRect(), t = document.getElementById('toast').getBoundingClientRect(); return t.top >= r.bottom; }, null, { timeout: 3000 }).catch(() => {}); // fitted from the ~200 ms loop hook
      const R = await p.evaluate(() => { const q = (e) => { if (!e) return null; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width && cs.display !== 'none' && cs.visibility !== 'hidden' ? [r.x, r.y, r.width, r.height] : null; };
        const toasts = [...document.querySelectorAll('#toast .toast')].map(q).filter(Boolean);
        const ft = document.getElementById('feed-tick'), list = ft?.querySelector('.ft-list');
        return { banner: q(document.querySelector('#crier-banner.show')) || q(document.getElementById('pres-banner')), toasts, hud: [...document.querySelectorAll('#hud > *')].map(q).filter(Boolean), tick: q(ft?.querySelector('.ft-row')), list: q(list), ev: q(document.getElementById('ev-banner')),
          o: ['menu-btn', 'minimap-wrap', 'inu-wallet-btn', 'stick', 'btn-a', 'btn-emo', 'prompt'].map((id) => [id, q(document.getElementById(id))]) }; });
      const at = `${kind} ticker:${tick} @${vp.width}x${vp.height}`;
      assert.ok(R.banner, 'banner shown ' + at); assert.ok(R.tick, 'ticker shown ' + at); assert.ok(R.ev, 'event banner shown ' + at);
      for (const h of R.hud) assert.ok(!overlaps(R.banner, h), `banner ${R.banner} on HUD top bar ${h} ${at}`);
      assert.ok(R.banner[1] >= Math.max(...R.hud.map((h) => h[1] + h[3])), 'banner below the HUD bar ' + at);
      assert.ok(!overlaps(R.banner, R.tick) && !overlaps(R.banner, R.list), `banner on the ticker ${at}`);
      for (const [id, r] of R.o) if (r) assert.ok(!overlaps(R.banner, r), `banner on ${id} ${at}`);
      assert.equal(R.toasts.length, 1, 'newest toast only while a banner shows ' + at);
      for (const t of R.toasts) { assert.ok(!overlaps(t, R.banner), `toast ${t} under banner ${R.banner} ${at}`); assert.ok(!overlaps(t, R.ev), `toast on the event banner ${at}`); assert.ok(!overlaps(t, R.tick) && !overlaps(t, R.list), 'toast on ticker ' + at); }
      assert.ok(!overlaps(R.ev, R.banner), 'event banner vs crier ' + at);
    }
    // banner gone: toasts go back to their row (no stale offset)
    await p.evaluate(() => { document.getElementById('crier-banner').className = ''; document.getElementById('pres-banner').hidden = true; }); await p.waitForTimeout(400);
    assert.equal(await p.evaluate(() => document.body.classList.contains('banner-up')), false);
    await ctx.close(); }
    assert.deepEqual(errs, []); } finally { await b.close(); srv.close(); }
});

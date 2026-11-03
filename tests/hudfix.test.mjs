// Quick fixes before the feature batch: (1) the crier banner never touches the HUD chip row (sound chip) at phone landscape;
// (2) on the title screen the shared Kibble Pay profile pill (expanded) never covers the Connect Wallet pill or the legal footer.
// The kibble-pay widgets are external, so the test stubs them with the same inline styles kibble-pay sets (bottom-left pill).
import test from 'node:test'; import assert from 'node:assert/strict'; import { chromium } from 'playwright'; import { serveRoot, overlaps } from './serve-root.mjs';
const STUB = () => { document.querySelectorAll('#inu-profile-badge,#inu-wallet,#inu-legal').forEach((e) => e.remove());
  const add = (html) => { const d = document.createElement('div'); d.innerHTML = html; const e = d.firstElementChild; document.body.appendChild(e); return e; };
  add('<div id="inu-profile-badge" style="position:fixed;z-index:9998;display:flex;max-width:min(220px,55vw);left:calc(8px + env(safe-area-inset-left,0px));bottom:calc(8px + env(safe-area-inset-bottom,0px));top:auto;right:auto"><span style="display:inline-block;width:184px;height:30px"></span></div>');
  add('<div id="inu-wallet" style="position:fixed;z-index:10001;top:12px;left:50%;transform:translateX(-50%)"><button id="inu-wallet-btn" style="width:134px;height:44px">Connect Wallet</button></div>');
  add('<div id="inu-legal" style="position:fixed;z-index:9999;left:4px;bottom:2px;width:188px;height:16px"></div>'); };
const rect = (p, id) => p.evaluate((id) => { const e = document.getElementById(id); if (!e) return null; const c = e.getBoundingClientRect(); return c.width ? [c.left, c.top, c.width, c.height] : null; }, id);
test('phone landscape: title profile pill clear of wallet + footer; crier banner clear of the HUD chip row', { timeout: 90000 }, async () => {
  const S = await serveRoot(), b = await chromium.launch(), errs = [];
  try { for (const vp of [{ width: 844, height: 390 }, { width: 667, height: 375 }]) {
    const ctx = await b.newContext({ viewport: vp, isMobile: true, hasTouch: true }), p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    await p.route(/kibble-pay\.vercel\.app|_vercel/, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
    await p.goto(S.url); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:test'); }); await p.reload(); await p.waitForTimeout(800);
    await p.evaluate(STUB); await p.waitForTimeout(50);
    const badge = await rect(p, 'inu-profile-badge'), wallet = await rect(p, 'inu-wallet-btn'), legal = await rect(p, 'inu-legal');
    assert.ok(!overlaps(badge, wallet), `title badge ${badge} vs wallet ${wallet} @${vp.width}`);
    assert.ok(!overlaps(badge, legal), `title badge ${badge} vs legal ${legal} @${vp.width}`);
    assert.ok(badge[1] >= 0 && badge[1] + badge[3] <= vp.height, 'badge on screen');
    await p.click('#start'); await p.waitForTimeout(1500);
    await p.evaluate(() => { let c = document.getElementById('crier-banner'); if (!c) { c = document.createElement('div'); c.id = 'crier-banner'; document.body.appendChild(c); } c.innerHTML = '<b>CRIER</b><span>Hear ye! A long enough line to wrap on a small phone screen, two lines.</span>'; c.classList.add('show'); });
    await p.waitForTimeout(400);
    const crier = await rect(p, 'crier-banner');
    for (const id of ['btn-sound', 'clock', 'menu-btn']) { const r = await rect(p, id); if (r) assert.ok(!overlaps(crier, r), `crier ${crier} touches ${id} ${r} @${vp.width}`); }
    await ctx.close(); } } finally { await b.close(); S.close(); }
  assert.deepEqual(errs, []); });

// Title-screen badge fix: the shared Kibble Pay profile badge renders as a one-row pill at its natural size on the title screen
// (a past bug drew it as a tall thin column) and never sits on the Connect Wallet pill, the legal footer or Start.
// kibble-pay is external, so the test injects the badge with the same inline style + markup inu-profile.js uses.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { chromium } from 'playwright';
import { serveRoot, overlaps } from './serve-root.mjs';

const VENDOR_STYLE = 'position:fixed;z-index:9998;display:flex;align-items:center;gap:6px;max-width:min(220px,55vw);padding:2px 7px 2px 2px;border-radius:999px;background:rgba(16,18,34,.72);border:1px solid rgba(255,216,74,.4);opacity:.9;color:#f4f1ea;font:600 10px/1.2 system-ui,sans-serif;left:calc(8px + env(safe-area-inset-left, 0px));bottom:calc(8px + env(safe-area-inset-bottom, 0px));top:auto;right:auto';
const AV = '<span style="width:20px;height:20px;border-radius:50%;background:#2b2f4a;display:inline-flex;align-items:center;justify-content:center;font-size:12px;flex:none">🐕</span>';
const BODY = {
  min: AV,
  guest: AV + '<span style="display:flex;flex-direction:column;min-width:0"><span style="white-space:nowrap">Guest · <a style="color:#ffd84a">connect to save scores</a></span><a style="color:#9fd8ff;white-space:nowrap">Get cosmetics in Kibble Pay</a></span>',
  profile: '<img alt="" width="20" height="24" style="width:20px;height:24px;border-radius:50%;flex:none"><span style="display:flex;flex-direction:column;min-width:0"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px"><b>KabosuTheGreatOne</b> · <span>🦴 12,345</span></span><a style="color:#9fd8ff;white-space:nowrap">Get cosmetics in Kibble Pay</a></span>',
  // the column bug: the pill kept a squeezed width (collapsed size / column flex) while expanded
  squeezed: AV + '<span style="display:flex;flex-direction:column;min-width:0"><span>Guest · <a>connect to save scores</a></span><a>Get cosmetics in Kibble Pay</a></span>',
};

test('title badge CSS: one-row pill, natural width, capped height, lifted above the legal footer off phone landscape', () => {
  const css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  const m = css.match(/body:not\(\.inworld\) #inu-profile-badge\{([^}]*)\}/); assert.ok(m, 'title rule present');
  for (const d of ['width:max-content!important', 'flex-direction:row!important', 'flex-wrap:nowrap!important', 'max-height:40px!important', 'height:auto!important']) assert.ok(m[1].includes(d), d);
  assert.match(css, /body:not\(\.inworld\):not\(\.short\) #inu-profile-badge\{top:auto!important;bottom:calc\(max\(6px,env\(safe-area-inset-bottom\)\) \+ 24px\)!important\}/);
});

test('browser: title badge is a proper pill (never a tall thin column), on screen, clear of wallet / footer / Start', { timeout: 150000 }, async () => {
  const srv = await serveRoot(), b = await chromium.launch(), errs = [];
  try { for (const vp of [{ width: 844, height: 390 }, { width: 667, height: 375 }, { width: 740, height: 360 }, { width: 390, height: 844 }, { width: 1280, height: 720 }]) {
    const ctx = await b.newContext({ viewport: vp, isMobile: vp.width < 1000, hasTouch: vp.width < 1000 }), p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    await p.route(/kibble-pay|_vercel/, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
    await p.goto(srv.url + '?mp=off'); await p.waitForTimeout(800);
    for (const [st, html] of Object.entries(BODY)) {
      await p.evaluate(({ html, style, st }) => { document.getElementById('inu-profile-badge')?.remove(); const e = document.createElement('div'); e.id = 'inu-profile-badge'; e.setAttribute('style', style + (st === 'squeezed' ? ';width:26px;flex-direction:column;flex-wrap:wrap;height:120px' : '')); e.innerHTML = html; document.body.appendChild(e); }, { html, style: VENDOR_STYLE, st });
      await p.waitForTimeout(60);
      const r = await p.evaluate(() => { const q = (id) => { const e = document.getElementById(id); if (!e) return null; const c = e.getBoundingClientRect(); return c.width ? [c.left, c.top, c.width, c.height] : null; }; return { badge: q('inu-profile-badge'), wallet: q('inu-wallet-btn'), legal: q('inu-legal'), start: q('start') }; });
      const at = `${st} @${vp.width}x${vp.height}`, [x, y, w, h] = r.badge;
      assert.ok(h <= 40 && h >= 20, `badge height ${h} ${at}`); assert.ok(w >= h, `badge is a row, not a column (${w}x${h}) ${at}`);
      if (st !== 'min') assert.ok(w >= (vp.width > vp.height ? 120 : 2 * h), `expanded badge keeps its text on one row (${w}px) ${at}`); else assert.ok(w <= 32, 'collapsed = just the icon ' + at);
      assert.ok(x >= 0 && y >= 0 && x + w <= vp.width && y + h <= vp.height, 'on screen ' + at);
      for (const k of ['wallet', 'legal', 'start']) if (r[k]) assert.ok(!overlaps(r.badge, r[k]), `badge ${r.badge} overlaps ${k} ${r[k]} ${at}`);
    }
    await ctx.close(); }
    assert.deepEqual(errs, []); } finally { await b.close(); srv.close(); }
});

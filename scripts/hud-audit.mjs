// HUD audit: lists every visible button/overlay control with its size, screenshots each viewport. URL= TAG= node scripts/hud-audit.mjs
import { chromium } from 'playwright';
const URL = process.env.URL || 'http://localhost:8642/', TAG = process.env.TAG || 'after', errs = [];
const b = await chromium.launch(); const out = {};
for (const [name, vp, mob] of [['844', { width: 844, height: 390 }, true], ['667', { width: 667, height: 375 }, true], ['desktop', { width: 1280, height: 800 }, false]]) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: mob, hasTouch: mob }); const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(name + ': ' + e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(name + ': ' + m.text()));
  await p.goto(URL); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); }); await p.reload(); await p.waitForTimeout(900); await p.click('#start'); await p.waitForTimeout(2500);
  await p.evaluate(() => { globalThis.__guide?.endTour?.('skipped'); __inu.setHour(11); document.querySelectorAll('.toast').forEach((t) => t.remove()); }); await p.waitForTimeout(500);
  out[name] = await p.evaluate(() => { const pl = __inu.state.player, z = __inu.zoom, cam = __inu.cam; const px = innerWidth / 2 + (pl.x - cam.x) * z, py = innerHeight / 2 + (pl.y - cam.y) * z;
    return { player: [Math.round(px), Math.round(py)], controls: [...document.querySelectorAll('button, a.btn, [role=button], #minimap-wrap, .chip')].filter((e) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && r.bottom > 0 && r.top < innerHeight && !e.closest('[hidden]'); })
      .map((e) => { const r = e.getBoundingClientRect(); return { id: e.id || e.className, text: (e.textContent || '').trim().slice(0, 24), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), coversPlayer: px > r.left - 20 && px < r.right + 20 && py > r.top - 30 && py < r.bottom + 10 }; }) }; });
  await p.screenshot({ path: `/tmp/hud-${TAG}-${name}.png` });
  if (await p.$('#menu-btn')) { await p.click('#menu-btn'); await p.waitForTimeout(300); await p.screenshot({ path: `/tmp/hud-${TAG}-${name}-menu.png` }); }
  await ctx.close(); }
console.log(JSON.stringify(out, null, 0)); console.log('errors', errs); await b.close();

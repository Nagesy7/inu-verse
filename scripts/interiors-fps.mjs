// Street FPS by the business lots (before/after comparison), 844x390 + 667x375, DPR 2, CPU x1 and x4. avg + 1% low.
// URL=<site> SETUP=1 node scripts/interiors-fps.mjs  (SETUP=1 leases P1 as a bakery with Window Display, works on old builds too)
import { chromium } from 'playwright';
const URL = process.env.URL || 'http://localhost:8661/', b = await chromium.launch(), out = {};
for (const vp of [{ width: 844, height: 390 }, { width: 667, height: 375 }]) { const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: true, hasTouch: true }), p = await ctx.newPage();
  await p.goto(URL + '?mp=off'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); }); await p.reload(); await p.waitForTimeout(900); await p.click('#start'); await p.waitForTimeout(5000);
  await p.evaluate(async () => { globalThis.__guide?.endTour?.('skipped'); const B = await import('./src/biz.js'); const s = __inu.state; s.bones = 9999; B.lease(s, 'P1', 'bakery', "Kabosu's Bakes", 0); s.biz.mine.up.display = 1; __inu.setHour?.(11); __inu.setZoom?.(2); globalThis.__camLock = { x: 47 * 32, y: 78 * 32 }; });
  const cdp = await ctx.newCDPSession(p);
  for (const rate of [1, 4]) { await cdp.send('Emulation.setCPUThrottlingRate', { rate }); await p.waitForTimeout(1200);
    out[`${vp.width}x${vp.height}@cpu${rate}`] = await p.evaluate(() => new Promise((r) => { const d = []; let last = 0, t0 = 0; const go = (t) => { if (!t0) { t0 = last = t; return requestAnimationFrame(go); } d.push(t - last); last = t; if (t - t0 < 4000) requestAnimationFrame(go); else { const s = [...d].sort((a, b) => b - a), n = Math.max(1, Math.floor(d.length / 100)); r({ avg: +(1000 / (d.reduce((a, b) => a + b, 0) / d.length)).toFixed(1), low1: +(1000 / (s.slice(0, n).reduce((a, b) => a + b, 0) / n)).toFixed(1) }); } }; requestAnimationFrame(go); })); }
  await ctx.close(); }
console.log(JSON.stringify(out)); await b.close();

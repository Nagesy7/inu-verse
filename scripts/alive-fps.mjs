// fps at 844x390 DPR2 across areas, with CDP CPU throttling. URL=<site> node scripts/alive-fps.mjs
import { chromium } from 'playwright';
const URL = process.env.URL || 'http://localhost:8642/';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); const p = await ctx.newPage();
await p.goto(URL); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); }); await p.reload(); await p.waitForTimeout(900); await p.click('#start'); await p.waitForTimeout(2500);
const cdp = await ctx.newCDPSession(p); const out = {};
for (const rate of [1, 4]) { await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  for (const [n, [x, y]] of Object.entries({ grove: [4, 6], park: [18, 82], sakuralane: [14, 37], groveAgain: [4, 6] })) {
    await p.evaluate(([x, y]) => { globalThis.__guide?.endTour?.('skipped'); __inu.setHour(11); globalThis.__camLock = { x: x * 32, y: y * 32 }; }, [x, y]); await p.waitForTimeout(1200);
    out[`${n}@${rate}x`] = await p.evaluate(() => new Promise((r) => { let f = 0; const t0 = performance.now(); const go = () => { f++; if (performance.now() - t0 < 3000) requestAnimationFrame(go); else r(Math.round(f / ((performance.now() - t0) / 1000))); }; requestAnimationFrame(go); })); } }
console.log(JSON.stringify(out)); await b.close();

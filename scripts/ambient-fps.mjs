// Ambient life pass FPS: phone landscape 844x390 + 667x375 (DPR 2, touch), 1x and 4x CPU throttle, per area, median of 3 x 3 s runs.
// URL=<site> TAG=before|after node scripts/ambient-fps.mjs  -> proof/ambient-fps-<TAG>.json
import { chromium } from 'playwright'; import fs from 'node:fs';
const URL = process.env.URL || 'http://localhost:8711/', TAG = process.env.TAG || 'after', RUNS = +(process.env.RUNS || 3);
const AREAS = { street: [26, 18], sakuralane: [14, 37], bakery: [46, 84], park: [18, 82] };
const out = { url: URL, tag: TAG, when: new Date().toISOString(), method: 'rAF frames counted over 3 s, median of ' + RUNS + ' runs, in-game 11:00, no rain, camera locked on area', results: {} };
const b = await chromium.launch({ args: ['--disable-gpu-vsync'] });
for (const [W, H] of [[844, 390], [667, 375]]) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }), p = await ctx.newPage();
  await p.goto(URL); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); }); await p.reload(); await p.waitForTimeout(1200); await p.click('#start'); await p.waitForTimeout(3000);
  const cdp = await ctx.newCDPSession(p);
  for (const rate of [1, 4]) { await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    for (const [n, [x, y]] of Object.entries(AREAS)) {
      await p.evaluate(([x, y]) => { globalThis.__guide?.endTour?.('skipped'); __inu.setHour(11); __inu.setRain(false); globalThis.__camLock = { x: x * 32, y: y * 32 }; const s = __inu.state; s.player.x = x * 32; s.player.y = (y + 1) * 32; }, [x, y]); await p.waitForTimeout(1500);
      const runs = []; for (let i = 0; i < RUNS; i++) runs.push(await p.evaluate(() => new Promise((r) => { let f = 0; const t0 = performance.now(); const go = () => { f++; if (performance.now() - t0 < 3000) requestAnimationFrame(go); else r(+(f / ((performance.now() - t0) / 1000)).toFixed(1)); }; requestAnimationFrame(go); })));
      runs.sort((a, c) => a - c); out.results[`${W}x${H} ${n} @${rate}x`] = { median: runs[(runs.length / 2) | 0], runs }; console.log(`${W}x${H} ${n} @${rate}x`, runs); } }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await ctx.close(); }
await b.close(); fs.writeFileSync(`proof/ambient-fps-${TAG}.json`, JSON.stringify(out, null, 2)); console.log('wrote', `proof/ambient-fps-${TAG}.json`);

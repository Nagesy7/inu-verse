// Arcade Districts FPS (LOCAL): phone landscape 844x390 + 667x375 (DPR 2, touch), 1x and 4x CPU throttle, median of 3 x 3 s runs.
// Baseline = hub street (same build). Districts spots stand the player on the sidewalk outside each district's kiosk.
// URL=<site> node scripts/districts-fps.mjs  -> proof/districts-local-fps.json
import { chromium } from 'playwright'; import fs from 'node:fs';
const URL = process.env.URL || 'http://127.0.0.1:8731/', RUNS = +(process.env.RUNS || 3), OUTF = process.env.OUTF || 'proof/districts-local-fps.json';
const SPOTS = ['hub-street', 'd-arcade-row', 'd-arena', 'd-fud-field', 'd-stadium', 'd-parkour', 'd-race-park'];
const out = { label: 'LOCAL build (static server), not deployed', url: URL, when: new Date().toString(), method: 'rAF frames over 3 s, median of ' + RUNS + ' runs, in-game 11:00, no rain, player idle', results: {}, chunks: {} };
const b = await chromium.launch({ args: ['--disable-gpu-vsync'] });
const fps = (p) => p.evaluate(() => new Promise((r) => { let f = 0; const t0 = performance.now(); const go = () => { f++; if (performance.now() - t0 < 3000) requestAnimationFrame(go); else r(+(f / ((performance.now() - t0) / 1000)).toFixed(1)); }; requestAnimationFrame(go); }));
for (const [W, H] of [[844, 390], [667, 375]]) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }), p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  for (const rate of [1, 4]) { await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await p.goto(URL); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); }); await p.reload(); await p.waitForTimeout(1200); await p.click('#start'); await p.waitForTimeout(3000);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    for (const s of SPOTS) {
      await p.evaluate((s) => { globalThis.__guide?.endTour?.('skipped'); __inu.setHour(11); __inu.setRain(false);
        if (s === 'hub-street') { globalThis.__camLock = { x: 26 * 32, y: 18 * 32 }; const st = __inu.state; st.player.x = 26 * 32; st.player.y = 19 * 32; }
        else { globalThis.__camLock = null; globalThis.__goScene('districts', s); } }, s); await p.waitForTimeout(1800);
      const runs = []; for (let i = 0; i < RUNS; i++) runs.push(await fps(p)); runs.sort((a, c) => a - c);
      const k = `${W}x${H} ${s} @${rate}x`; out.results[k] = { median: runs[(runs.length / 2) | 0], runs, room: await p.evaluate(() => globalThis.__room?.()?.id || 'hub') }; console.log(k, runs); } }
  out.chunks[`${W}x${H}`] = await p.evaluate(() => ({ chunkBakes: globalThis.__chunkBakes || 0 }));
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await ctx.close(); }
await b.close(); fs.writeFileSync(OUTF, JSON.stringify(out, null, 2)); console.log('wrote', OUTF);

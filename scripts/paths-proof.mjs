// Dirt-path proof: phone-landscape shots of each newly linked place + whole-map ground overview. URL=<site> TAG=before|after node scripts/paths-proof.mjs
import { chromium } from 'playwright';
const URL = process.env.URL || 'http://localhost:8642/', TAG = process.env.TAG || 'after';
const AREAS = { homes: [15, 40], farm: [18, 94], barn: [44, 92], park: [20, 82], gamedoors: [5, 55], royal: [56, 73] };
const b = await chromium.launch(), errs = []; const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }), p = await ctx.newPage();
p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await p.goto(URL); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); }); await p.reload(); await p.waitForTimeout(900); await p.click('#start'); await p.waitForTimeout(2500);
for (const [n, [x, y]] of Object.entries(AREAS)) { await p.evaluate(([x, y]) => { globalThis.__guide?.endTour?.('skipped'); __inu.setHour(11); __inu.setRain(false); globalThis.__camLock = { x: x * 32, y: y * 32 }; const s = __inu.state; s.player.x = (x + 0.5) * 32; s.player.y = (y + 0.5) * 32; document.querySelectorAll('.toast,.guide-card,#tour').forEach((t) => t.remove()); }, [x, y]); await p.waitForTimeout(1000); await p.screenshot({ path: `/tmp/paths-${TAG}-${n}.png` }); }
const url = await p.evaluate(async () => (await import('/src/tiles.js')).buildGround().toDataURL());
(await import('fs')).writeFileSync(`/tmp/paths-${TAG}-map.png`, Buffer.from(url.split(',')[1], 'base64'));
console.log('errors', errs); await b.close();

// City 'alive' proof: phone landscape shots per area + GIF frames. URL=<site> TAG=before|after [GIF=1] node scripts/alive-proof.mjs
import { chromium } from 'playwright'; import fs from 'node:fs';
const URL = process.env.URL || 'http://localhost:8642/', TAG = process.env.TAG || 'after';
const AREAS = { ponds: [8, 4], sakuralane: [14, 37], eastpond: [44, 34], park: [18, 82], farmpond: [9, 97], orchard: [52, 89], mainst: [26, 18], homes: [10, 25], grove: [4, 6], south: [6, 63] };
const b = await chromium.launch(), errs = [];
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }), p = await ctx.newPage();
p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await p.goto(URL); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); }); await p.reload(); await p.waitForTimeout(900);
await p.click('#start'); await p.waitForTimeout(2500);
const prep = async (x, y) => p.evaluate(([x, y]) => { globalThis.__guide?.endTour?.('skipped'); __inu.setHour(11); __inu.setRain(false); globalThis.__camLock = { x: x * 32, y: y * 32 }; const s = __inu.state; s.player.x = (x + 2.5) * 32; s.player.y = (y + 3.5) * 32; document.querySelectorAll('.toast,.guide-card,#tour').forEach((t) => t.remove()); }, [x, y]);
for (const [name, [x, y]] of Object.entries(AREAS)) { await prep(x, y); await p.waitForTimeout(900); await p.screenshot({ path: `proof/alive-${TAG}-${name}.png` }); }
if (process.env.GIF) { fs.mkdirSync('/tmp/ivgif', { recursive: true }); for (const f of fs.readdirSync('/tmp/ivgif')) fs.unlinkSync('/tmp/ivgif/' + f);
  await prep(+(process.env.GX || 14), +(process.env.GY || 37)); await p.waitForTimeout(800); for (let i = 0; i < 48; i++) { await p.screenshot({ path: `/tmp/ivgif/f${String(i).padStart(3, '0')}.png` }); await p.waitForTimeout(60); } }
console.log('errors', JSON.stringify(errs)); await b.close();

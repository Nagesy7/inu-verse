// Proof for "alive" phase 1 (day/night + weather) at phone landscape 844x390. Uses ?tod= / ?wx= (visual-only pins).
// URL=https://inu-verse-tawny.vercel.app/ node scripts/alive-p1-proof.mjs   (default: local static server)
import { chromium } from 'playwright'; import fs from 'fs';
const BASE = process.env.URL || 'http://127.0.0.1:8642/', OUT = process.env.OUT || 'proof', P = process.env.PREFIX || 'alive-p1';
fs.mkdirSync(OUT, { recursive: true }); const errs = [], log = {};
const quiet = /Failed to load resource|net::|kibble-pay|dexscreener|api\/|WebSocket|favicon|status of 404|insights/i;
const b = await chromium.launch();
const SHOTS = [
  ['day', '?tod=day&wx=clear', 'lamp'], ['dusk-lamps', '?tod=dusk&wx=clear', 'lamp'], ['night-fireflies', '?tod=night&wx=clear', 'fireflies'],
  ['rain', '?tod=day&wx=rain', 'lamp'], ['night-rain', '?tod=night&wx=rain', 'lamp'], ['cloudy', '?tod=day&wx=cloudy', 'lamp'], ['dusk-lowfx', '?tod=dusk&wx=rain&fx=low', 'lamp']];
for (const [name, q, where] of SHOTS) {
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true }), p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(`${name} pageerror ${e.message}`)); p.on('console', (m) => { if (m.type() === 'error' && !quiet.test(m.text())) errs.push(`${name} ${m.text().slice(0, 160)}`); });
  await p.goto(BASE + q); await p.evaluate(() => { localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); }); await p.reload(); await p.waitForTimeout(1200);
  await p.click('#start'); await p.waitForTimeout(2500);
  await p.evaluate((where) => { globalThis.__guide?.endTour?.('skipped'); globalThis.__guide?.clearGuide?.(); const A = __inu.amb, s = __inu.state; let x = 24.5 * 32, y = 19 * 32;
    if (where === 'fireflies') { let best = null, bn = -1; for (const f of A.fireflies) { const n = A.fireflies.filter((g) => Math.abs(g.x - f.x) < 400 && Math.abs(g.y - f.y) < 180).length; if (n > bn) { bn = n; best = f; } } x = best.x; y = best.y; globalThis.__ffNear = bn; }
    s.player.x = x - 40; s.player.y = y + 40; globalThis.__camLock = { x, y }; document.querySelectorAll('#toast .toast,.toast,.guide-card,#tour').forEach((t) => t.remove()); }, where);
  await p.waitForTimeout(6500); // weather ramps in over ~5 s
  await p.evaluate(() => document.querySelectorAll('#toast .toast,.toast,.guide-card,#tour').forEach((t) => t.remove()));
  log[name] = await p.evaluate(() => { const A = __inu.amb, c = document.getElementById('clock'), r = c.getBoundingClientRect(), hud = document.getElementById('hud').getBoundingClientRect();
    return { clock: c.textContent, tod: c.dataset.tod, wx: c.dataset.wx, title: c.title, rain: +A.rain.toFixed(2), cloud: +(A.cloud || 0).toFixed(2), drops: A.sky?.active, low: A.sky?.low, fireflies: A.fireflies.length, ffNear: globalThis.__ffNear,
      clockBox: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], hudBottom: Math.round(hud.bottom), clockVisible: r.width > 0 && r.right <= innerWidth }; });
  await p.screenshot({ path: `${OUT}/${P}-${name}.png` }); await ctx.close(); }
await b.close();
console.log(JSON.stringify({ base: BASE, log, errs }, null, 1));

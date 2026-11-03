// Building graphics proof: same buildings at 844x390 phone landscape (½x whole façade) + 1x close-up, day and night.
// URL=<site> TAG=bldg-gfx-after OUT=proof node scripts/bldg-gfx-proof.mjs
import { chromium } from 'playwright'; import fs from 'fs';
const URL = process.env.URL || 'https://inu-verse-tawny.vercel.app/', OUT = process.env.OUT || 'proof', TAG = process.env.TAG || 'bldg-gfx-before';
const IDS = (process.env.IDS || 'cafe,shop,fashion,launch,cars,bank,arcade,mall,jewel,petshop,lounge,office,cosy,royal,academy,h1').split(',');
const TODS = (process.env.TODS || 'day,night').split(','), ZS = (process.env.ZS || 'phone,close').split(',');
fs.mkdirSync(OUT, { recursive: true }); const errs = [], perf = {};
const b = await chromium.launch();
for (const tod of TODS) {
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true }); const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(`${tod} pageerror ${e.message}`));
  await p.goto(URL + `?tod=${tod}&wx=clear`); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); });
  await p.reload(); await p.waitForTimeout(1500); await p.click('#start'); await p.waitForTimeout(2500);
  await p.addStyleTag({ content: '#crier-banner,.toast,.guide-card,#tour,#prompt,#alive-feed,#feed{visibility:hidden!important}' });
  await p.evaluate(() => { globalThis.__guide?.endTour?.('skipped'); globalThis.__noNav = true; });
  const spots = await p.evaluate(async () => { const W = await import('/src/world.js'); const all = [...W.BUILDINGS, ...W.MALL_BUILDINGS, W.BANK, W.ARCADE, ...W.NPC_HOMES];
    return Object.fromEntries(all.filter(Boolean).map((q) => { const d = W.NPC_HOMES.includes(q) ? { tx: q.x + 3, ty: q.y + q.h } : W.doorTile(q); return [q.id, [q.x, q.y, q.w, q.h, d.tx, d.ty]]; })); });
  for (const z of ZS) {
    await p.evaluate((z) => __inu.setZoom(z === 'phone' ? 1 : 2), z);
    for (const id of IDS) { const s = spots[id]; if (!s) continue; const [x, y, w, h, tx, ty] = s;
      if (z === 'door') { // real follow camera, player standing on the door tile (HUD-clipping check)
        await p.evaluate(([tx, ty]) => { delete globalThis.__camLock; const st = __inu.state; st.player.x = tx * 32 + 16; st.player.y = ty * 32 + 18; }, [tx, ty]);
        await p.waitForTimeout(2600); await p.screenshot({ path: `${OUT}/${TAG}-${tod}-${z}-${id}.png` }); continue; }
      await p.evaluate(([x, y, w, h, z]) => { const st = __inu.state; st.player.x = (x + w + 1.5) * 32; st.player.y = (y + h + 1.5) * 32; globalThis.__camLock = { x: (x + w / 2) * 32, y: (y + h * (z === 'phone' ? 0.6 : 0.42)) * 32 }; }, [x, y, w, h, z]);
      await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/${TAG}-${tod}-${z}-${id}.png` }); }
  }
  // quick frame-time sample at ½x over the mall district
  await p.evaluate(() => __inu.setZoom(1)); await p.evaluate(() => { globalThis.__camLock = { x: 32 * 32, y: 56 * 32 }; });
  perf[tod] = await p.evaluate(() => new Promise((res) => { const ts = []; let last = performance.now(); const f = (n) => { ts.push(n - last); last = n; if (ts.length < 120) requestAnimationFrame(f); else { ts.sort((a, b) => a - b); res({ median: +ts[60].toFixed(2), p90: +ts[108].toFixed(2) }); } }; requestAnimationFrame(f); }));
  await ctx.close();
}
console.log(JSON.stringify({ errs, perf }, null, 1)); await b.close();

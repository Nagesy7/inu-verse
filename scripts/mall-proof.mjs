import { chromium } from 'playwright';
const URL = process.env.URL || 'http://localhost:8643/', PRE = process.env.PRE || 'proof/mall-after', b = await chromium.launch(), errs = [];
const page = await b.newPage({ viewport: { width: 1280, height: 800 } }); page.on('pageerror', (e) => errs.push(e.message));
await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(800); await page.click('#start'); await page.waitForTimeout(1300);
const tp = (x, y) => page.evaluate(([x, y]) => { const s = __inu.state; s.player.x = x * 32; s.player.y = y * 32; __inu.cam.x = s.player.x; __inu.cam.y = s.player.y; document.querySelectorAll('.toast').forEach((t) => t.remove()); }, [x, y]);
for (const [n, h] of [['day', 11], ['night', 22]]) { await page.evaluate((h) => __inu.setHour(h), h);
  await page.setViewportSize({ width: 1280, height: 1200 }); await tp(30, 59.4); await page.evaluate(() => { globalThis.__camLock = { x: 32 * 32, y: 56 * 32 }; }); await page.waitForTimeout(900); await page.screenshot({ path: `${PRE}-${n}-1-facade.png` }); await page.evaluate(() => { globalThis.__camLock = null; }); await page.setViewportSize({ width: 1280, height: 800 });
  await tp(32, 66.5); await page.waitForTimeout(700); await page.screenshot({ path: `${PRE}-${n}-2-fountain-gardens.png` });
  await tp(14, 56.5); await page.waitForTimeout(700); await page.screenshot({ path: `${PRE}-${n}-3-shops.png` }); }
console.log('errors', JSON.stringify(errs)); await b.close();

import { chromium, devices } from 'playwright';
const URL = process.env.URL || 'http://localhost:8642/', PRE = process.env.PRE || 'proof/scale-after', b = await chromium.launch(), errs = [];
async function open(ctxOpts) { const ctx = await b.newContext(ctxOpts), page = await ctx.newPage(); page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(800); await page.click('#start'); await page.waitForTimeout(1300); return page; }
const tp = (page, x, y) => page.evaluate(([x, y]) => { const s = __inu.state; s.player.x = x * 32; s.player.y = y * 32; __inu.cam.x = s.player.x; __inu.cam.y = s.player.y; document.querySelectorAll('.toast').forEach((t) => t.remove()); }, [x, y]);
let page = await open({ viewport: { width: 1280, height: 800 } });
await tp(page, 53.6, 19.5); await page.waitForTimeout(900); await page.screenshot({ path: `${PRE}-01-shiba-beside-car.png` });
await tp(page, 8.6, 19.3); await page.waitForTimeout(800); await page.screenshot({ path: `${PRE}-02-shiba-door-tree-lamp.png` });
await tp(page, 39.6, 34.8); await page.waitForTimeout(800); await page.screenshot({ path: `${PRE}-03-shiba-bench-tree-planter.png` });
await page.evaluate(() => { const C = __inu.amb.cars; C[0].x = 27 * 32; C[1].x = 37 * 32; C[6].y = 15 * 32; C[7].y = 28 * 32; for (const c of C) c.v = 0; });
await tp(page, 32.5, 21.5); await page.waitForTimeout(800); await page.screenshot({ path: `${PRE}-04-street-scene.png` });
await tp(page, 10, 25); await page.waitForTimeout(800); await page.screenshot({ path: `${PRE}-05-plots.png` });
await tp(page, 45, 37); await page.waitForTimeout(800); await page.screenshot({ path: `${PRE}-06-pond-bridge-ducks.png` });
for (const [n, d] of [['iphone13', devices['iPhone 13 landscape']], ['pixel7', devices['Pixel 7 landscape']], ['portrait', devices['iPhone 13']]]) {
  page = await open(d); await tp(page, 53.6, 19.5); await page.waitForTimeout(900); await page.screenshot({ path: `${PRE}-07-phone-${n}.png` }); await page.context().close(); }
console.log('errors', JSON.stringify(errs)); await b.close();

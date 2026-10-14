import { chromium, devices } from 'playwright';
const URL = process.env.URL || 'http://localhost:8643/', b = await chromium.launch(), errs = [];
for (const [n, opts] of [['desktop', { viewport: { width: 1280, height: 800 } }], ['phone', devices['iPhone 13 landscape']]]) {
  const ctx = await b.newContext(opts), page = await ctx.newPage(); page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(800); await page.click('#start'); await page.waitForTimeout(1200);
  await page.evaluate(() => { const s = __inu.state; s.player.x = 32 * 32; s.player.y = 40 * 32; });
  for (const z of [2, 1, 0.5]) { if (n === 'desktop') { while ((await page.evaluate(() => __inu.zoom)) > z) { await page.mouse.move(640, 400); await page.mouse.wheel(0, 300); await page.waitForTimeout(250); } } else { while ((await page.evaluate(() => __inu.zoom)) > z) { await page.tap('#zout'); await page.waitForTimeout(250); } }
    await page.waitForTimeout(500); await page.screenshot({ path: `proof/zoom-${n}-${z === 2 ? 'in' : z === 1 ? 'mid' : 'out'}.png` }); }
  if (n === 'desktop') { await page.keyboard.press('='); await page.keyboard.press('='); await page.waitForTimeout(200); console.log('keys back to', await page.evaluate(() => __inu.zoom)); }
  await ctx.close(); }
console.log('errors', JSON.stringify(errs)); await b.close();

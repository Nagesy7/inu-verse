import { chromium } from 'playwright';
const URL = process.env.URL || 'http://localhost:8643/', PRE = process.env.PRE || '', b = await chromium.launch(), errs = [];
const shots = [['billboard-day', [44, 45], 11], ['billboard-night', [44, 45], 22], ['mainstreet-banners', [24, 17], 11], ['launchhall-trending', [41, 15], 21], ['mall-facade-flags-night', [32, 58], 22], ['mall-shop-signs', [16, 56], 12], ['phone-landscape', [32, 58], 21, { width: 844, height: 390 }]];
for (const [name, at, hour, vp] of shots) {
  const page = await b.newPage({ viewport: vp || { width: 1280, height: 800 }, hasTouch: !!vp, isMobile: !!vp }); page.on('pageerror', (e) => errs.push(name + ': ' + e.message));
  await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(800); await page.click('#start'); await page.waitForTimeout(600);
  await page.evaluate(([at, h]) => { __inu.setHour(h); const s = __inu.state; s.player.x = at[0] * 32 + 70; s.player.y = at[1] * 32 + 40; globalThis.__camLock = { x: at[0] * 32, y: at[1] * 32 }; }, [at, hour]);
  await page.waitForTimeout(1200); await page.screenshot({ path: `proof/${PRE}coinads-${name}.png` });
  if (name === 'billboard-day') { const before = await page.evaluate(() => __ads().trend.map((t) => t.ticker + ' ' + t.pct.toFixed(1)).join(', '));
    await page.evaluate(() => { const s = __inu.state; s.player.x = 30 * 32; s.player.y = 47 * 32; }); await page.waitForTimeout(300);
    const pt = await page.evaluate(() => { const c = __inu.cam, z = __inu.zoom; return { x: (41 * 32 + 60 - c.x) * z + innerWidth / 2, y: (44.3 * 32 + 12 - c.y) * z + innerHeight / 2 }; });
    await page.mouse.click(pt.x, pt.y); await page.waitForTimeout(600); await page.screenshot({ path: `proof/${PRE}coinads-tap-opens-launchhall.png` });
    console.log('trend', before, '| panel', JSON.stringify(await page.evaluate(() => ({ kind: __inu.panel, sel: __inu.panelObj?.sel })))); }
  await page.close(); }
console.log('errors', JSON.stringify(errs)); await b.close();

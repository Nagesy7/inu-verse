import { chromium } from 'playwright';
const URL = process.env.URL || 'http://localhost:8642/', b = await chromium.launch(), page = await b.newPage({ viewport: { width: 1280, height: 800 } }), errs = [];
page.on('pageerror', (e) => errs.push(e.message));
await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(700); await page.click('#start'); await page.waitForTimeout(1300);
const tp = (x, y) => page.evaluate(([x, y]) => { const s = __inu.state; s.player.x = x * 32; s.player.y = y * 32; __inu.cam.x = s.player.x; __inu.cam.y = s.player.y; document.querySelectorAll('.toast').forEach((t) => t.remove()); }, [x, y]);
await tp(52.6, 18.6); await page.waitForTimeout(900);
await page.screenshot({ path: 'proof/cars-01-shiba-beside-car-scale.png', clip: { x: 340, y: 200, width: 600, height: 400 } });
await page.screenshot({ path: 'proof/cars-02-zoomies-motors-showroom.png' });
// freeze a few cars around the main junction so the shot shows all 4 directions
await page.evaluate(() => { const C = __inu.amb.cars; C[0].x = 26 * 32; C[1].x = 37 * 32; C[6].y = 16 * 32; C[7].y = 27 * 32; for (const c of C) c.v0 = c.v, c.v = 0; });
await tp(31.5, 21.5); await page.waitForTimeout(700); await page.screenshot({ path: 'proof/cars-03-street-traffic-lanes.png' });
await page.evaluate(() => { for (const c of __inu.amb.cars) c.v = c.v0; });
await tp(50, 65); await page.waitForTimeout(800); await page.screenshot({ path: 'proof/cars-04-luxury-autos-showroom.png' });
await tp(50.5, 66.5); await page.keyboard.press('e'); await page.waitForTimeout(700); await page.screenshot({ path: 'proof/cars-05-mall-car-icons.png' });
console.log('errors', JSON.stringify(errs)); await b.close();

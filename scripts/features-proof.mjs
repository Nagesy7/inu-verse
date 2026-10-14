import { chromium, devices } from 'playwright';
const URL = process.env.URL || 'http://localhost:8643/', b = await chromium.launch(), errs = [];
const page = await b.newPage({ viewport: { width: 1280, height: 800 } }); page.on('pageerror', (e) => errs.push(e.message));
await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(800); await page.click('#start'); await page.waitForTimeout(1300);
const tp = (x, y) => page.evaluate(([x, y]) => { const s = __inu.state; s.player.x = x * 32; s.player.y = y * 32; __inu.cam.x = s.player.x; __inu.cam.y = s.player.y; document.querySelectorAll('.toast').forEach((t) => t.remove()); }, [x, y]);
await page.evaluate(() => { __inu.state.bones = 5000; __inu.state.kibble = 500; });
await tp(52.5, 18.5); await page.keyboard.press('e'); await page.waitForTimeout(600); await page.screenshot({ path: 'proof/feat-01-zoomies-motors-showroom.png' });
await page.click('[data-col="Blue"][data-car="suv"]'); await page.click('[data-buycar="suv"]'); await page.waitForTimeout(300); await page.keyboard.press('Escape');
await tp(47.5, 66.5); await page.keyboard.press('e'); await page.waitForTimeout(600); await page.click('[data-buycar="supercar"]'); await page.waitForTimeout(300); await page.screenshot({ path: 'proof/feat-02-luxury-autos-showroom.png' }); await page.keyboard.press('Escape');
await tp(16.5, 76.5); await page.keyboard.press('e'); await page.waitForTimeout(600); await page.fill('#petname', 'Ember'); await page.click('[data-buypet="redpanda"]'); await page.waitForTimeout(300); await page.screenshot({ path: 'proof/feat-03-pet-shop.png' });
await page.fill('#petname', 'Miso'); await page.click('[data-buypet="kitten"]'); await page.keyboard.press('Escape');
await tp(8, 20); await page.keyboard.down('d'); await page.waitForTimeout(1200); await page.keyboard.up('d'); await page.waitForTimeout(500); await page.screenshot({ path: 'proof/feat-04-pet-following.png' });
await page.click('#btn-garage'); await page.waitForTimeout(400); await page.screenshot({ path: 'proof/feat-05-garage.png' });
await page.click('[data-drive^="c2"]'); await tp(10, 21.6); await page.keyboard.down('d'); await page.waitForTimeout(1500); await page.keyboard.press('h'); await page.waitForTimeout(150); await page.screenshot({ path: 'proof/feat-06-driving-honk.png' }); await page.keyboard.up('d');
await page.waitForTimeout(1200); await page.keyboard.press('e'); await page.waitForTimeout(400); await page.screenshot({ path: 'proof/feat-07-parked.png' });
await page.evaluate(() => { __inu.state.bones += 300; }); await tp(4.5, 30.5); await page.keyboard.press('e'); await page.waitForTimeout(400); const claim = await page.$('#claim'); if (claim) { await claim.click(); await page.waitForTimeout(500); await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
await page.evaluate(() => { if (__inu.mode !== 'world') document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); }); await page.waitForTimeout(400); await tp(5, 31.5); await page.waitForTimeout(600); await page.screenshot({ path: 'proof/feat-08-home-driveway-car.png' });
await page.setViewportSize({ width: 1280, height: 1000 });
for (const [n, x, y] of [['cafe-shop', 12, 19.6], ['fashion-side', 29, 19.6], ['jewel-side-goldden', 12, 57.5]]) { await tp(x, y); await page.waitForTimeout(600); await page.screenshot({ path: `proof/doors-${n}.png` }); }
console.log('errors', JSON.stringify(errs), JSON.stringify(await page.evaluate(() => ({ cars: __inu.state.garage.cars.length, pets: __inu.state.pets.owned.length, k: __inu.state.kibble, bones: __inu.state.bones })))); await b.close();

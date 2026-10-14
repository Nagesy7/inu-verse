// Before/after polish screenshots at fixed spots. usage: TAG=before|after node scripts/polish-shots.mjs
import { chromium } from 'playwright';
const URL = process.env.URL || 'http://localhost:8642/', TAG = process.env.TAG || 'after';
const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(800);
await page.click('#start'); await page.waitForTimeout(1500);
const spot = async (n, tx, ty, { hour = 11, rain = 0, face = 'down', extra } = {}) => {
  await page.evaluate(([tx, ty, h, r]) => { const s = __inu.state; s.player.x = (tx + .5) * 32; s.player.y = (ty + .5) * 32; __inu.cam.x = s.player.x; __inu.cam.y = s.player.y; if (__inu.cam.snap) __inu.cam.snap(); __inu.setHour(h); __inu.setRain(r); document.querySelectorAll('.toast').forEach((t) => t.remove()); }, [tx, ty, hour, rain]);
  if (extra) await page.evaluate(extra);
  await page.waitForTimeout(900); await page.evaluate(() => document.querySelectorAll('.toast').forEach((t) => t.remove()));
  await page.screenshot({ path: `proof/polish-${TAG}-${n}.png` }); console.log('shot', n);
};
await spot('01-sakura-pond', 9, 9);
await spot('02-main-street', 14, 20);
await spot('03-market-plaza', 41, 9);
await spot('04-east-pond-trees', 45, 33);
await spot('05-night-lamps', 24, 19, { hour: 22 });
await spot('06-sunset-homes', 12, 33, { hour: 18.3 });
await spot('07-rain', 20, 21, { rain: 1 });
await spot('08-mall-district', 31, 47);
await page.evaluate(() => { const s = __inu.state; s.player.x = 7.5 * 32; s.player.y = 18.5 * 32; });
await page.keyboard.press('e'); await page.waitForTimeout(700);
await page.screenshot({ path: `proof/polish-${TAG}-09-panel.png` });
console.log('errors', JSON.stringify(errs)); await b.close();

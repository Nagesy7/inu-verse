import { chromium } from 'playwright';
const URL = process.env.URL || 'http://localhost:8643/', PRE = process.env.PRE || '', b = await chromium.launch(), errs = [];
const shots = [['sweeper', 'w1', 10], ['gardener', 'w2', 10], ['electrician', null, 19, [16, 18]], ['billboard', null, 11, [43, 46]], ['roadcrew', 'w4', 10], ['phone', 'w2', 10]];
for (const [name, wid, hour, at] of shots) {
  const vp = name === 'phone' ? { width: 390, height: 844 } : { width: 1280, height: 800 };
  const page = await b.newPage({ viewport: vp }); page.on('pageerror', (e) => errs.push(name + ': ' + e.message));
  await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(800); await page.click('#start'); await page.waitForTimeout(600);
  await page.evaluate((h) => __inu.setHour(h), hour); await page.waitForTimeout(500);
  await page.evaluate(([wid, at]) => { const s = __inu.state; let x, y; if (wid) { const w = __crew.find((c) => c.id === wid); x = w.x; y = w.y; } else { x = at[0] * 32; y = at[1] * 32; } s.player.x = x + 30; s.player.y = y + 6; globalThis.__camLock = { x, y }; }, [wid, at]);
  await page.waitForTimeout(700);
  if (name === 'gardener') { await page.evaluate(() => { const w = __crew.find((c) => c.id === 'w2'); w.work = 99; const s = __inu.state; s.player.x = w.x + 26; s.player.y = w.y; }); await page.keyboard.press('e'); await page.waitForTimeout(300); await page.screenshot({ path: `proof/${PRE}workers-chat.png` }); for (let k = 0; k < 4 && (await page.evaluate(() => __inu.state.bones)) === 500; k++) { await page.waitForTimeout(900); await page.keyboard.press('e'); } await page.waitForTimeout(300); }
  await page.screenshot({ path: `proof/${PRE}workers-${name}.png` });
  console.log(name, JSON.stringify(await page.evaluate(() => ({ on: __crew.filter((w) => w.on).map((w) => w.id), bones: __inu.state.bones })))); await page.close(); }
console.log('errors', JSON.stringify(errs)); await b.close();

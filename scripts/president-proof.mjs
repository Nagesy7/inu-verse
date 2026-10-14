import { chromium } from 'playwright';
const URL = process.env.URL || 'http://localhost:8643/', b = await chromium.launch(), errs = [];
const spots = { limo: [32, 46], heli: [21, 68], smoke: [32, 66], walk: [5, 45] };
for (const k of ['limo', 'heli', 'smoke', 'walk']) {
  const page = await b.newPage({ viewport: { width: 1280, height: 800 } }); page.on('pageerror', (e) => errs.push(k + ': ' + e.message));
  await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(800); await page.click('#start'); await page.waitForTimeout(800);
  await page.evaluate(([x, y, k]) => { const s = __inu.state; s.player.x = (x + 4) * 32; s.player.y = (y + 1) * 32; globalThis.__camLock = { x: x * 32 + 16, y: y * 32 }; __inu.setHour(11); __inu.presVisit(k); }, [...spots[k], k]);
  const shots = { limo: [3, 8.5], heli: [2.5, 6.2], smoke: [1.6, 3.4], walk: [3] }[k]; let last = 0;
  for (const [i, t] of shots.entries()) { await page.waitForTimeout((t - last) * 1000); last = t; await page.screenshot({ path: `proof/president-${k}-${i + 1}-entrance.png` }); }
  await page.waitForTimeout(1500);
  if (k === 'limo') { // talk + pet tip
    await page.evaluate(() => { const P = __inu.president; P.path = []; P.wait = 99; const s = __inu.state; s.player.x = P.x + 24; s.player.y = P.y + 4; globalThis.__camLock = null; }); await page.waitForTimeout(400); await page.keyboard.press('e'); await page.waitForTimeout(600);
    await page.screenshot({ path: 'proof/president-talk-and-tip.png' }); }
  await page.evaluate(([x, y]) => { const P = __inu.president; P.t = P.stay + 1; globalThis.__camLock = { x: x * 32 + 16, y: y * 32 }; }, spots[k]);
  await page.waitForTimeout(k === 'heli' ? 4500 : k === 'smoke' ? 2500 : 3000); await page.screenshot({ path: `proof/president-${k}-9-exit.png` });
  console.log(k, JSON.stringify(await page.evaluate(() => ({ stage: __inu.president.stage, on: __inu.president.on, bones: __inu.state.bones })))); await page.close(); }
console.log('errors', JSON.stringify(errs)); await b.close();

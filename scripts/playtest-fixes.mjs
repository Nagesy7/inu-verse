// Re-check playtest bugs on the current build. Desktop + portrait 390x844 + iPhone 13 / Pixel 7 landscape (real touch).
import { chromium, devices } from 'playwright';
const URL = process.env.URL || 'http://localhost:8642/', b = await chromium.launch(), errs = [], out = (...a) => console.log(...a);
const boot = async (page) => { page.on('pageerror', (e) => errs.push(e.message)); await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(700); };
const tp = (page, x, y) => page.evaluate(([x, y]) => { const s = __inu.state; s.player.x = (x + .5) * 32; s.player.y = (y + .5) * 32; __inu.cam.x = s.player.x; __inu.cam.y = s.player.y; }, [x, y]);
const myScore = (page) => page.evaluate(() => { const P = __inu.state.packs; return document.querySelector(`[data-pscore="${P.joined}"]`)?.textContent; });
{ const page = await b.newPage({ viewport: { width: 1280, height: 800 } }); await boot(page); await page.click('#start'); await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelector('#btn-pack').click()); await page.waitForTimeout(400);
  await page.locator('#panel-body button.green').first().click(); await page.waitForTimeout(300); await page.evaluate(() => document.querySelector('#panel-close').click());
  const me = () => page.evaluate(() => { const P = __inu.state.packs; const m = P.all[P.joined].members.find((m) => !m.npc); return { shifts: __inu.state.stats.shifts, packShifts: m?.stats.shifts, toasts: [...document.querySelectorAll('#toast .toast')].map((t) => t.textContent) }; });
  const r0 = await me();
  await tp(page, 7, 18); await page.keyboard.press('e'); await page.waitForTimeout(400); await page.click('#cstart');
  await page.evaluate(() => { __inu.panelObj.shift.time = 0.2; }); await page.waitForTimeout(3200);
  out('BUG1/2 before', JSON.stringify(r0), '| after one zero-pay shift + 3s on result screen', JSON.stringify(await me()));
  await page.screenshot({ path: 'proof/fix-01-cafe-shift-counted-once.png' });
  await page.evaluate(() => document.querySelector('#panel-close').click());
  await tp(page, 41, 18); await page.keyboard.press('e'); await page.waitForTimeout(800);
  out('BUG4 price', await page.textContent('#st-price')); await page.screenshot({ path: 'proof/fix-04-launch-price.png' });
  await page.evaluate(() => document.querySelector('#panel-close').click());
  await page.evaluate(() => document.querySelector('#btn-pack').click()); await page.waitForTimeout(300); const a = await myScore(page); await page.evaluate(() => document.querySelector('#panel-close').click());
  await tp(page, 21, 58); await page.keyboard.press('e'); await page.waitForTimeout(400); const c = await myScore(page);
  await page.waitForTimeout(6800); const c2 = await myScore(page); const model = await page.evaluate(() => { const P = __inu.state.packs; return P.all[P.joined].members.reduce((s, m) => s + m.stats.shifts * 10 + m.stats.tokens * 25 + m.stats.decor * 5 + Math.floor(m.stats.contributed / 10), 0); });
  out('BUG5 pack panel', a, '| leaderboards', c, '| leaderboards after a sim tick (live)', c2, '| packScore()', model);
  await page.screenshot({ path: 'proof/fix-05-leaderboards-live-score.png' }); await page.evaluate(() => document.querySelector('#panel-close').click());
  await page.evaluate(() => __inu.setHour(22)); await tp(page, 24, 19); await page.waitForTimeout(800); await page.screenshot({ path: 'proof/fix-06-night-toned-down.png' }); await page.evaluate(() => __inu.setHour(11));
  await tp(page, 46, 33); await page.waitForTimeout(800); await page.screenshot({ path: 'proof/fix-07-ducks-avoid-bridge.png' });
  await tp(page, 21, 61); await page.waitForTimeout(800); await page.screenshot({ path: 'proof/fix-08-leaderboards-hall.png' });
  await tp(page, 2, 41); await page.keyboard.down('w'); await page.waitForTimeout(900); await page.keyboard.up('w'); out('hedge solid: walked up into hedge at (2,40); player now tile y =', await page.evaluate(() => (__inu.state.player.y / 32).toFixed(2)));
  await page.close(); }
for (const [dev, tag] of [['iPhone 13', 'portrait-390x844'], ['iPhone 13 landscape', 'iphone13-landscape'], ['Pixel 7 landscape', 'pixel7-landscape']]) {
  const ctx = await b.newContext({ ...devices[dev] }), page = await ctx.newPage(); await boot(page);
  await page.locator('#start').scrollIntoViewIfNeeded(); const s2 = await page.locator('#start').boundingBox(); await page.touchscreen.tap(s2.x + s2.width / 2, s2.y + s2.height / 2); await page.waitForTimeout(1200);
  await tp(page, 7, 18.2); await page.waitForTimeout(500);
  const hud = await page.evaluate(() => ({ vw: innerWidth, vh: innerHeight, a: document.querySelector('#btn-a').textContent, prompt: document.querySelector('#prompt').textContent, offscreen: [...document.querySelectorAll('#hud > *')].filter((e) => getComputedStyle(e).display !== 'none').filter((e) => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1; }).map((e) => e.id || e.className) }));
  out(tag, 'HUD', JSON.stringify(hud)); await page.screenshot({ path: `proof/fix-03-${tag}-hud.png` });
  const m = await page.locator('#btn-menu').boundingBox(); await page.touchscreen.tap(m.x + m.width / 2, m.y + m.height / 2); await page.waitForTimeout(300);
  const open = await page.evaluate(() => [...document.querySelectorAll('#hud .btn')].map((e) => { const r = e.getBoundingClientRect(); return [e.id, getComputedStyle(e).display !== 'none' && r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight]; }));
  out(tag, 'menu open: all', open.length, 'HUD buttons on-screen =', open.every((x) => x[1]), JSON.stringify(open.filter((x) => !x[1])));
  await page.screenshot({ path: `proof/fix-03-${tag}-menu.png` });
  const w = await page.locator('#btn-wardrobe').boundingBox(); await page.touchscreen.tap(w.x + w.width / 2, w.y + w.height / 2); await page.waitForTimeout(500); out(tag, 'tap Wardrobe ->', await page.evaluate(() => __inu.panel));
  await page.evaluate(() => { document.querySelector('#panel-close').click(); document.body.classList.remove('menu-open'); }); await page.waitForTimeout(300);
  const a = await page.locator('#btn-a').boundingBox(); await page.touchscreen.tap(a.x + a.width / 2, a.y + a.height / 2); await page.waitForTimeout(500); out(tag, 'tap A ->', await page.evaluate(() => __inu.panel));
  await page.screenshot({ path: `proof/fix-03-${tag}-tap-a-cafe.png` }); await ctx.close(); }
out('errors', JSON.stringify(errs)); await b.close();

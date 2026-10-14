import { chromium } from 'playwright';
const URL = process.env.URL || 'http://localhost:8643/', PRE = process.env.PRE || '', ONLY = process.env.ONLY, b = await chromium.launch(), errs = [];
const JOBS = (ONLY || 'cafe,delivery,sweeper,pond,window,painter,roadcrew,gardener,electrician,bins,billboard').split(',');
async function boot(vp) { const page = await b.newPage({ viewport: vp || { width: 1280, height: 800 }, hasTouch: !!vp, isMobile: !!vp }); page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(800); await page.click('#start'); await page.waitForTimeout(500); return page; }
let p = await boot();
for (const [i, id] of JOBS.entries()) { await p.evaluate((id) => __playJob(id), id); await p.waitForTimeout(500); if (i < 2) await p.screenshot({ path: `proof/${PRE}jobs-${id}-0-intro.png` });
  await p.evaluate(() => { __mg.state.auto = true; }); await p.waitForTimeout(3300 + 6000); await p.screenshot({ path: `proof/${PRE}jobs-${id}-1-play.png` });
  await p.evaluate(() => { const g = __mg.state.game; g.t = g.dur - 0.05; }); await p.waitForTimeout(400); await p.screenshot({ path: `proof/${PRE}jobs-${id}-2-results.png` });
  console.log(id, JSON.stringify(await p.evaluate(() => ({ score: __mg.state.game.score, combo: __mg.state.game.maxCombo, ...__mg.state.res })))); await p.keyboard.press('Escape'); await p.waitForTimeout(200); }
// KEYBOARD: real key presses only (no auto flag). Delivery with arrow keys, road crew + billboard with Space.
const kb = {};
await p.evaluate(() => __playJob('delivery')); await p.waitForTimeout(3700); let lanes = new Set();
for (let k = 0; k < 90; k++) { const st = await p.evaluate(() => { const g = __mg.state.game; const a = g.auto(); return { lane: g.lane, want: Math.round((a.x - 60) / 120) }; }); lanes.add(st.lane);
  if (st.want < st.lane) await p.keyboard.press('ArrowLeft'); else if (st.want > st.lane) await p.keyboard.press('ArrowRight'); await p.waitForTimeout(90); }
kb.delivery = await p.evaluate(() => ({ hits: __mg.state.game.hits, misses: __mg.state.game.misses })); kb.delivery.lanesVisited = lanes.size; await p.screenshot({ path: `proof/${PRE}jobs-keyboard-delivery.png` }); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
for (const id of ['roadcrew', 'billboard']) { await p.evaluate((id) => __playJob(id), id); await p.waitForTimeout(3700); const t0 = Date.now();
  while (Date.now() - t0 < 9000) { if (await p.evaluate(() => !!__mg.state.game.auto().tap)) await p.keyboard.press(' '); }
  kb[id] = await p.evaluate(() => ({ hits: __mg.state.game.hits, misses: __mg.state.game.misses })); await p.screenshot({ path: `proof/${PRE}jobs-keyboard-${id}.png` }); await p.keyboard.press('Escape'); await p.waitForTimeout(200); }
console.log('keyboard', JSON.stringify(kb)); for (const [id, r] of Object.entries(kb)) if (!(r.hits >= 3 && r.hits > r.misses)) errs.push(`keyboard play failed for ${id}: ${JSON.stringify(r)}`);
if (kb.delivery.lanesVisited < 2) errs.push('arrow keys never changed lane');
await p.evaluate(() => __open('cafe')); await p.waitForTimeout(400); await p.screenshot({ path: `proof/${PRE}jobs-cafe-panel-ranks.png` });
await p.close(); p = await boot({ width: 844, height: 390 }); await p.evaluate(() => __playJob('bins')); await p.waitForTimeout(3900); for (let k = 0; k < 8; k++) { await p.touchscreen.tap(200 + k * 60, 300); await p.waitForTimeout(150); } await p.screenshot({ path: `proof/${PRE}jobs-phone-landscape-touch.png` });
await p.close(); p = await boot({ width: 390, height: 844 }); await p.evaluate(() => __playJob('window')); await p.waitForTimeout(3900); await p.evaluate(() => { __mg.state.auto = true; }); await p.waitForTimeout(3000); await p.screenshot({ path: `proof/${PRE}jobs-phone-portrait.png` });
console.log('errors', JSON.stringify(errs)); await b.close();

// Onboarding + wayfinding proof: first visit tour, highlight Launch Hall, Bank, skip, no re-trigger, replay, Places list -> guide -> walk -> arrive, map tap -> guide, Bank panel.
// Desktop 1280x800 + iPhone 13 landscape (touch). Screenshots proof/onboard-*.png
import { chromium, devices } from 'playwright';
const URL = process.env.URL || 'http://localhost:8643/', b = await chromium.launch(), errs = [], fails = [];
const ok = (c, m) => { console.log(c ? 'PASS' : 'FAIL', m); if (!c) fails.push(m); };
const inter = (a, c) => a && c && a.x < c.x + c.width - 1 && c.x < a.x + a.width - 1 && a.y < c.y + c.height - 1 && c.y < a.y + a.height - 1;
const ds = (p, k) => p.evaluate((k) => document.body.dataset[k] ?? null, k);
for (const [tag, opts] of [['desktop', { viewport: { width: 1280, height: 800 } }], ['iphone', devices['iPhone 13 landscape']]]) {
  const ctx = await b.newContext(opts), p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(tag + ': ' + e.message));
  const shot = (n) => p.screenshot({ path: `proof/onboard-${tag}-${n}.png` });
  const tp = (x, y) => p.evaluate(([x, y]) => { const s = __inu.state; s.player.x = (x + 0.5) * 32; s.player.y = (y + 0.5) * 32; __inu.player.path = []; __inu.cam.x = s.player.x; __inu.cam.y = s.player.y; }, [x, y]);
  const click = async (sel) => { if (tag === 'iphone') await p.tap(sel); else await p.click(sel); };
  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(900);
  await click('#start');
  ok(await p.waitForSelector('#tour:not([hidden])', { timeout: 8000 }).then(() => true).catch(() => false), `${tag}: tour starts automatically on first visit after the creator`);
  ok(await ds(p, 'tourStep') === '0', `${tag}: step 1 = welcome/controls`); await p.waitForTimeout(500); await shot('1-welcome');
  if (tag === 'iphone') { const card = await p.locator('#tour').boundingBox(); for (const sel of ['#stick', '#btn-a', '#btn-b', '#btn-menu']) ok(!inter(card, await p.locator(sel).boundingBox()), `${tag}: tour card clear of ${sel}`); }
  await click('#t-next'); await p.waitForTimeout(1800);
  ok(await ds(p, 'tourPlace') === 'launch' && await p.locator('#tour.hl').count() === 1, `${tag}: step 2 = Launch Hall highlight`);
  ok(/Practice/.test(await p.textContent('#tour .ttext')), `${tag}: Launch Hall labelled simulated`); await shot('2-launch-highlight');
  await click('#t-next'); await p.waitForTimeout(1800); ok(await ds(p, 'tourPlace') === 'bank', `${tag}: step 3 = Kibble Bank`); await shot('3-bank');
  await click('#t-next'); await p.waitForTimeout(250); await shot('3b-panning-edge-arrow'); await p.waitForTimeout(1600); await shot('4-mall');
  await click('#t-skip'); await p.waitForTimeout(900);
  ok(await p.locator('#tour').isHidden(), `${tag}: skip closes the tour`);
  ok(/^skipped:/.test(await p.evaluate(() => localStorage.getItem('inuverse.tour.v1')) || ''), `${tag}: skip saves the first-visit flag`);
  ok(await ds(p, 'guide') === 'launch', `${tag}: first guide arrow after the tour points to the Launch Hall`); await p.waitForTimeout(500); await shot('5-after-tour-arrow-launch');
  // reload + continue: no tour again
  await p.reload(); await p.waitForTimeout(900); await click('#continue'); await p.waitForTimeout(2600);
  ok(await p.locator('#tour').isHidden(), `${tag}: tour does not re-trigger once seen`);
  // replay from Guide
  await click('#w-guide'); await p.waitForTimeout(400); ok(await p.locator('#tour').isVisible() && await ds(p, 'tourStep') === '0', `${tag}: Guide button replays the tour`);
  for (let i = 0; i < 20 && await p.locator('#tour').isVisible(); i++) { await click('#t-next'); await p.waitForTimeout(120); }
  ok(/^done:/.test(await p.evaluate(() => localStorage.getItem('inuverse.tour.v1')) || ''), `${tag}: finishing the replay marks done`);
  // Places list -> guide -> walk -> arrive
  await p.evaluate(() => __guide.clearGuide()); await click('#w-places'); await p.waitForSelector('#places:not([hidden])');
  const first = await p.locator('#pl-list h3').first().textContent(); ok(first === 'Featured', `${tag}: Places: Featured group first (${first})`);
  ok((await p.locator('#pl-list .pl-item.feat b').allTextContents()).join('|') === '★ Launch Hall ($KIBBLE + your coins)|★ Kibble Bank', `${tag}: Launch Hall + Kibble Bank pinned with stars`);
  await shot('6-places'); await p.fill('#pl-q', 'trainer'); await p.waitForTimeout(150); await shot('7-places-search');
  await click('#pl-list [data-place="quest"]'); await p.waitForTimeout(300);
  ok(await ds(p, 'guide') === 'quest' && await p.locator('#guidechip').isVisible(), `${tag}: picking a place starts the guide (${await p.textContent('#guidechip .gdist')})`);
  await tp(14, 60); await p.waitForTimeout(700); await shot('8-guide-arrow-path');
  if (tag === 'iphone') { const ch = await p.locator('#guidechip').boundingBox(), w = await p.locator('#wayctl').boundingBox(); for (const sel of ['#stick', '#btn-a', '#btn-b', '#btn-menu']) { const bb = await p.locator(sel).boundingBox(); ok(!inter(ch, bb) && !inter(w, bb), `${tag}: guide chip + wayfinding buttons clear of ${sel}`); } }
  await click('#g-walk'); const arrived = await p.waitForFunction(() => document.body.dataset.arrived === 'quest', null, { timeout: 45000 }).then(() => true).catch(() => false);
  ok(arrived && !(await p.locator('#guidechip').isVisible()), `${tag}: Walk me there auto-walks; arrival clears the guide`); await shot('9-arrived');
  // full map tap -> guide to the bank
  await click('#w-map'); await p.waitForSelector('#mapfull:not([hidden])'); await p.waitForTimeout(400); await shot('10-map');
  const cv = await p.locator('#mapcv').boundingBox(); const bank = await p.evaluate(() => { const b = __guide && 0; return null; });
  await (tag === 'iphone' ? p.touchscreen.tap(cv.x + cv.width * (42.5 / 64), cv.y + cv.height * (55 / 106)) : p.mouse.click(cv.x + cv.width * (42.5 / 64), cv.y + cv.height * (55 / 106)));
  await p.waitForTimeout(300); ok(await ds(p, 'guide') === 'bank' && await p.locator('#mapfull').isHidden(), `${tag}: map tap selects Kibble Bank and guides there`);
  await p.click('#minimap-wrap canvas', { force: true }).catch(() => {}); await p.waitForTimeout(200); ok(await p.locator('#mapfull').isVisible(), `${tag}: tapping the minimap expands the full map`); await click('#mp-close');
  // bank panel
  await tp(42, 57); await p.waitForTimeout(600); await p.evaluate(() => document.querySelector('#prompt')?.click()); await p.waitForTimeout(600);
  ok(await p.evaluate(() => __inu.panel) === 'bank' && /No deposits, no lending, no yield/.test(await p.textContent('#panel-body')), `${tag}: Kibble Bank panel opens (read-only, no deposits/lending/yield)`);
  ok(/soon/i.test(await p.textContent('#bk-bal')), `${tag}: bank balance says soon (mint not set)`); await shot('11-bank-panel');
  await ctx.close();
}
console.log('errors', JSON.stringify(errs)); await b.close(); if (fails.length || errs.length) process.exit(1); console.log('ALL PASS');

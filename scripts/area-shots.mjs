// Before/after screenshots of buildings and markets: camera-locked, day (+ night for markets), desktop + phone landscape.
// URL=<site> SET=bldg|market PRE=before|after node scripts/area-shots.mjs
import { chromium, devices } from 'playwright';
const URL = process.env.URL || 'http://localhost:8643/', SET = process.env.SET || 'bldg', PRE = process.env.PRE || 'after';
const AREAS = {
  bldg: { rescue: [4, 51], gate: [4, 57], arcade: [60, 53], bank: [42, 55], leaders: [21, 56], mall: [32, 54], jewelers: [14, 52], cafe: [7, 15], shops: [21, 15], launch: [41, 15], cars: [55, 15], homes: [12, 28], npchomes: [12, 38], clubhouse: [51, 4], barn: [42, 90], chapel: [24, 83], office: [32, 77], petshop: [14, 73] },
  market: { farmersmarket: [24, 99], marketrow: [42, 9], mallfronts: [20, 63], craft: [30, 99], lots: [52, 81] },
};
const b = await chromium.launch(), errs = [];
for (const [tag, opts] of [['desktop', { viewport: { width: 1280, height: 800 } }], ['phone', devices['iPhone 13 landscape']]]) {
  const ctx = await b.newContext(opts), p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); }); await p.reload(); await p.waitForTimeout(900);
  await p.click('#start'); await p.waitForTimeout(2500); await p.evaluate(() => { document.querySelectorAll('.toast').forEach((t) => t.remove()); globalThis.__guide?.endTour?.("skipped"); globalThis.__guide?.clearGuide?.(); });
  for (const [name, [x, y]] of Object.entries(AREAS[SET]).filter(([k]) => !process.env.ONLY || process.env.ONLY.split(',').includes(k))) for (const [tod, h] of SET === 'market' || ['rescue', 'arcade', 'bank', 'gate'].includes(name) ? [['day', 11], ['night', +(process.env.NH || 22)]] : [['day', 11]]) {
    await p.evaluate(([x, y, h]) => { __inu.setHour(h); globalThis.__camLock = { x: x * 32, y: y * 32 }; const s = __inu.state; s.player.x = (x + 2.5) * 32; s.player.y = (y + 3.5) * 32; document.querySelectorAll('.toast').forEach((t) => t.remove()); }, [x, y, h]);
    await p.waitForTimeout(700); await p.screenshot({ path: `proof/${SET}-${PRE}-${name}-${tod}-${tag}.png` }); }
  await ctx.close();
}
console.log('errors', JSON.stringify(errs)); await b.close();

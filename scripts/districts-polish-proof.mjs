// LOCAL proof for the districts polish pass (no deploy): town minimap + full map marker, Places search, tour step,
// and the zoom-2 title banners pinned below the top bar. 844x390 + 667x375.  URL=http://127.0.0.1:8732/ node scripts/districts-polish-proof.mjs
import { chromium } from 'playwright'; import fs from 'fs';
const LOCAL = process.env.URL || 'http://127.0.0.1:8732/', OUT = process.env.OUT || 'proof', P = 'districts-local-polish';
fs.mkdirSync(OUT, { recursive: true }); const res = { label: 'LOCAL build (static server), not deployed', at: new Date().toString(), sizes: {} }, errs = [];
const D = await import('../src/districts.js'), GD = await import('../src/guide.js'), A = await import('../src/districtart.js');
const quiet = /Failed to load resource|net::|kibble-pay|dexscreener|api\/|WebSocket|favicon|status of 404/i;
const b = await chromium.launch();
for (const [W, H] of [[844, 390], [667, 375]]) { const tag = `${W}x${H}`, r = res.sizes[tag] = {};
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true }), p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(`${tag} pageerror ${e.message}`)); p.on('console', (m) => { if (m.type() === 'error' && !quiet.test(m.text())) errs.push(`${tag} ${m.text().slice(0, 160)}`); });
  const shot = (n) => p.screenshot({ path: `${OUT}/${P}-${n}-${tag}.png` });
  await p.goto(LOCAL); await p.evaluate(() => { localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); localStorage.setItem('inuverse.minimap', '1'); }); await p.reload(); await p.waitForTimeout(900);
  await p.click('#start'); await p.waitForTimeout(2300); await p.evaluate(() => { globalThis.__guide?.endTour?.('skipped'); __inu.setHour(11); __inu.setRain(0); });
  // 1) tour step for the districts
  const ti = GD.TOUR.findIndex((t) => t.place === 'shuttle'); await p.evaluate((ti) => { const g = globalThis.__guide; g.startTour(true); for (let i = 0; i < ti; i++) g.go(1); }, ti); await p.waitForTimeout(2200);
  r.tour = await p.evaluate(() => ({ step: document.body.dataset.tourStep, place: document.body.dataset.tourPlace, title: document.querySelector('#tour h3, #tour .ttitle, #tour b')?.textContent || null })); await shot('01-tour-step');
  await p.evaluate(() => { globalThis.__guide.endTour('skipped'); globalThis.__guide.clearGuide(); document.querySelectorAll('#toast .toast').forEach((t) => t.remove()); }); await p.waitForTimeout(500);
  // 2) minimap: player beside the Arcade hall, districts gate marker at the east edge
  await p.evaluate(() => { const s = __inu.state; s.player.x = 57.5 * 32; s.player.y = 58.5 * 32; }); await p.waitForTimeout(1200);
  r.minimap = await p.evaluate(() => ({ on: document.body.classList.contains('mm-on'), visible: !document.getElementById('minimap-wrap').hidden })); await shot('02-minimap-gate');
  // 3) full map + Places search
  await p.evaluate(() => { globalThis.__guide.clearGuide(); globalThis.__guide.openMap(); }); await p.waitForTimeout(900); await p.evaluate(() => document.querySelectorAll('#toast .toast').forEach((t) => t.remove())); await shot('03-full-map'); await p.evaluate(() => globalThis.__guide.closeMap());
  await p.evaluate(() => globalThis.__guide.openPlaces()); await p.waitForTimeout(400); await p.fill('#pl-q', 'districts'); await p.waitForTimeout(500);
  r.places = await p.evaluate(() => [...document.querySelectorAll('#places button, #places li')].map((e) => e.textContent.trim()).filter((t) => /District/.test(t)).slice(0, 3)); await shot('04-places-search');
  await p.evaluate(() => globalThis.__guide.closePlaces()); await p.waitForTimeout(300);
  // 4) zoom 2: title banners pinned below the top bar (before: districts-local-11-*-street.png)
  for (const [n, id] of [['05-arena-banner-zoom2', 'shiba-scuffle'], ['06-arcade-row-marquees-zoom2', 'pup-crossing'], ['07-stadium-banner-zoom2', 'zoomie-goals']]) { const door = D.doorOf(id);
    await p.evaluate(([x]) => { globalThis.__goScene('districts', { x: (x + 0.5) * 32, y: 8.6 * 32, face: 'up' }); __inu.setZoom(2); }, door); await p.waitForTimeout(2600); // let the zone-name toast clear
    r[n] = await p.evaluate(() => ({ hudBottom: Math.round(document.getElementById('hud').getBoundingClientRect().bottom), room: globalThis.__room?.()?.id, cam: globalThis.__room?.()?.cam })); await shot(n); }
  await p.evaluate(() => __inu.setZoom(1)); await p.waitForTimeout(500); await shot('08-arena-zoom1-unchanged');
  await ctx.close(); }
await b.close(); res.errors = errs; fs.writeFileSync(`${OUT}/${P}-results.json`, JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1));

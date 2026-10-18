// Ambient life pass proof shots at 844x390 + 667x375 (DPR 2, touch). URL=<site> OUT=proof node scripts/ambient-proof.mjs
// ?sydney=06:40 pins the Sydney clock (cosmetic, proof only) so Taro's 06:00-09:00 bread round is visible at any hour.
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.env.URL || 'http://localhost:8711/', OUT = process.env.OUT || 'proof', LABEL = process.env.LABEL || 'local';
const log = { url: BASE, label: LABEL, when: new Date().toISOString(), shots: [], errors: [] };
const b = await chromium.launch();
for (const [W, H] of [[844, 390], [667, 375]]) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }), p = await ctx.newPage();
  p.on('pageerror', (e) => log.errors.push(`${W}x${H} ${e.message}`));
  await p.goto(BASE + '?sydney=06:40'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); }); await p.reload(); await p.waitForTimeout(1200); await p.click('#start'); await p.waitForTimeout(2500);
  const shot = async (name, note) => { await p.evaluate(() => document.querySelectorAll('.toast').forEach((t) => t.remove())); const f = `${OUT}/ambient-${LABEL}-${name}-${W}x${H}.png`; await p.screenshot({ path: f }); log.shots.push({ file: f, note }); };
  const at = (x, y, h, lock = true) => p.evaluate(([x, y, h, lock]) => { globalThis.__guide?.endTour?.('skipped'); __inu.setHour(h); __inu.setRain(false); globalThis.__camLock = lock ? { x, y } : null; }, [x, y, h, lock]);
  // cats: morning on the east (right) end of Taro Bakes' awning, late afternoon on the west end, night by the lantern
  await at(46 * 32, 84 * 32, 8); await p.waitForTimeout(1500); await p.evaluate(() => { for (const k of __inu.amb.cats) k.x = k.x; }); await p.waitForTimeout(45000 / 10); await shot('cat-morning-bakery', 'Miso naps at the sunny east end of the Taro Bakes awning (in-game 08:00); awning valance flutters');
  await at(46 * 32, 84 * 32, 17); await p.waitForTimeout(16000); await shot('cat-afternoon-bakery', 'in-game 17:00: Miso has padded to the west end');
  await at(23 * 32, 97 * 32, 12); await p.waitForTimeout(6000); await shot('cat-market', 'Kinako on the market stall roof, striped valance in the wind');
  // dog walk (pure function of the wall clock)
  const w = await p.evaluate(async () => { const A = await import('/src/ambient.js'); const q = A.dogWalkAt(0, Date.now() + 1200); return q; }); await at(w.x, w.y - 30, 10); await p.waitForTimeout(1200); await shot('dogwalk', `seeded wall-clock dog walk: Sumi walking Pip (same position on every client at the same moment)`);
  // Taro's bread round: Sydney 06:40 -> heading to the cafe with a basket
  await p.evaluate(() => { const n = __inu.npcs.find((q) => q.name === 'Taro'); n.x = 9 * 32; n.y = 19.5 * 32; n.path = []; }); await at(0, 0, 9, false); await p.waitForTimeout(1200);
  await p.evaluate(() => { const n = __inu.npcs.find((q) => q.name === 'Taro'); globalThis.__camLock = { x: n.x, y: n.y - 20 }; }); await p.waitForTimeout(500); await shot('taro-bread-round', 'Taro on his 06:40 Sydney-time bread drop at the cafe, basket in paw');
  log.taro = await p.evaluate(() => __inu.state.town.folk.Taro.round);
  // birds scatter on sprint: start 5 tiles from a ground bird, sprint (tap-walk run) through it
  const bd = await p.evaluate(() => { const b = __inu.amb.birds.find((q) => q.state === 'ground'); const s = __inu.state; s.player.x = b.hx - 5 * 32; s.player.y = b.hy; globalThis.__camLock = { x: b.hx, y: b.hy - 30 }; __inu.setHour(11); return { x: b.hx, y: b.hy }; });
  await p.waitForTimeout(800); await shot('birds-before-sprint', 'ground bird on its patch before the sprint');
  await p.evaluate((b) => __walkTo(Math.floor(b.x / 32) + 3, Math.floor(b.y / 32), true), bd); await p.waitForTimeout(700); await shot('birds-scatter', 'sprinting past: the birds scatter away from you');
  log[`birds-${W}x${H}`] = await p.evaluate(() => __inu.amb.birds.map((b) => b.state).join(','));
  await p.evaluate(() => { const s = __inu.state; s.player.x -= 40 * 32; }); await p.waitForTimeout(9000); log[`birds-later-${W}x${H}`] = await p.evaluate(() => __inu.amb.birds.map((b) => b.state).join(','));
  await shot('birds-returned', 'a few seconds later they have glided back to their patch');
  // reduced motion: no sway (valance at rest), cats stay put
  await p.evaluate(() => { globalThis.__reducedMotion = true; }); await at(46 * 32, 84 * 32, 12); await p.waitForTimeout(1200); await shot('reduced-motion-bakery', 'prefers-reduced-motion: no sway, static scallops, no fly-overs'); await p.evaluate(() => { globalThis.__reducedMotion = undefined; });
  await ctx.close(); }
await b.close(); fs.writeFileSync(`${OUT}/ambient-${LABEL}-proof.json`, JSON.stringify(log, null, 2)); console.log(JSON.stringify({ shots: log.shots.length, errors: log.errors, taro: log.taro, birds: Object.fromEntries(Object.entries(log).filter(([k]) => k.startsWith('birds'))) }, null, 1));

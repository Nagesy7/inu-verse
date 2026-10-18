// Shop interiors proof: each theme (player-leased + NPC rival shops), the editor (place / rotate / remove by touch taps),
// Window Display from the street, FPS inside a shop (avg + 1% low, CPU x4) and cached-layer redraw counts.
// URL=<site> node scripts/interiors-proof.mjs   (screens: proof/interiors-*.png, log: proof/interiors-log.txt)
import { chromium } from 'playwright'; import fs from 'node:fs';
const URL = process.env.URL || 'http://localhost:8661/', b = await chromium.launch(), errs = [], log = []; const L = (...a) => { const t = a.join(' '); log.push(t); console.log(t); };
async function boot(vp) { const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); const page = await ctx.newPage(); page.on('pageerror', (e) => errs.push(`${vp.width}: ${e.message}`));
  await page.goto(URL + '?mp=off'); await page.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); }); await page.reload(); await page.waitForTimeout(900); await page.click("#start"); await page.waitForTimeout(6000);
  await page.evaluate(() => { globalThis.__guide?.endTour?.('skipped'); const s = __inu.state; s.bones = 50000; __inu.setHour?.(11); }); return { page, ctx }; }
const shot = (p, n) => p.screenshot({ path: `proof/interiors-${n}.png` });
const tapCell = async (p, x, y) => { const g = await p.evaluate(() => __shop.geom()); await p.touchscreen.tap(g.ox + (x + 0.5) * g.cell, g.oy + (y + 0.5) * g.cell); await p.waitForTimeout(150); };
async function lease(p, type) { await p.evaluate((type) => { const s = __inu.state; if (s.biz.mine) { __shop.build && __shop.exit(); } }, type); await p.waitForTimeout(200);
  await p.evaluate(async (type) => { const B = await import('./src/biz.js'); const s = __inu.state; if (s.biz.mine) B.closeBiz(s); const names = { bakery: "Kabosu's Bakes", cafe: 'Bean & Bark Café', flower: 'Petal Paws', boutique: 'Fetch Couture', groomer: 'Fluff & Puff Pets', stand: 'Sunny Farm Stand' }; B.lease(s, 'P1', type, names[type], 0); }, type); }
async function fps(p, secs = 3) { return p.evaluate((secs) => new Promise((r) => { const d = []; let last = performance.now(); const t0 = last; const r0 = __shop.layer.redraws;
  const go = (t) => { d.push(t - last); last = t; if (t - t0 < secs * 1000) requestAnimationFrame(go); else { d.shift(); const s = [...d].sort((a, b) => b - a), n = Math.max(1, Math.floor(d.length / 100)), worst = s.slice(0, n).reduce((a, b) => a + b, 0) / n; r({ avg: Math.round(1000 / (d.reduce((a, b) => a + b, 0) / d.length)), low1: Math.round(1000 / worst), frames: d.length, redraws: __shop.layer.redraws - r0 }); } };
  requestAnimationFrame((t) => { last = t; requestAnimationFrame(go); }); }), secs); }
// ---- 844x390: every theme + editor ----
let { page: p, ctx } = await boot({ width: 844, height: 390 });
for (const t of ['bakery', 'cafe', 'flower', 'boutique', 'groomer', 'stand']) { await lease(p, t); await p.evaluate(() => __shop.enter('P1')); await p.waitForTimeout(500); await shot(p, `theme-${t}-844x390`); L(`theme ${t}: props`, await p.evaluate(() => __shop.build.shop.items.length)); await p.evaluate(() => __shop.exit()); await p.waitForTimeout(300); }
for (const lot of ['P2', 'L3', 'L4']) { await p.evaluate((l) => __shop.enter(l), lot); await p.waitForTimeout(500); await shot(p, `rival-${lot}-844x390`); await p.evaluate(() => __shop.exit()); await p.waitForTimeout(300); }
// editor on the bakery
await lease(p, 'bakery'); await p.evaluate(() => { const s = __inu.state; s.biz.mine.up.shelves = 1; s.biz.mine.up.display = 1; }); await p.evaluate(() => __shop.enter('P1')); await p.waitForTimeout(400);
await p.evaluate(async () => { const IN = await import('./src/interiors.js'); IN.buySet(__inu.state, 'cosy'); IN.buySet(__inu.state, 'fittings'); }); await p.evaluate(() => __shop.exit()); await p.waitForTimeout(200); await p.evaluate(() => __shop.enter('P1')); await p.waitForTimeout(300);
await shot(p, 'editor-1-storeroom-844x390');
await p.tap('[data-sinv="bench"]'); await tapCell(p, 1, 5); await shot(p, 'editor-2-ghost-844x390'); // first tap shows the ghost at that cell? we place directly
L('after place bench:', await p.evaluate(() => __shop.build.shop.items.slice(-1)[0] && JSON.stringify(__shop.build.shop.items.slice(-1)[0])));
await tapCell(p, 1, 5); await shot(p, 'editor-3-picked-844x390'); await p.tap('#srot'); await p.waitForTimeout(150); L('after rotate:', await p.evaluate(() => JSON.stringify(__shop.build.shop.items[__shop.build.picked])));
await shot(p, 'editor-4-rotated-844x390'); await p.tap('#smove'); await tapCell(p, 3, 5); L('after move:', await p.evaluate(() => JSON.stringify(__shop.build.shop.items.slice(-1)[0])));
await tapCell(p, 3, 5); await p.tap('#srem'); await p.waitForTimeout(150); L('after remove: items', await p.evaluate(() => __shop.build.shop.items.length), 'storeroom bench', await p.evaluate(async () => (await import('./src/interiors.js')).invOf(__inu.state).bench));
await p.tap('[data-sinv="stool"]'); await tapCell(p, 5, 6); await shot(p, 'editor-5-door-refused-844x390'); await tapCell(p, 2, 5); await p.waitForTimeout(150); await shot(p, 'editor-6-arranged-844x390');
// cached layer: idle frames do not redraw
await p.evaluate(() => { __shop.build.sel = null; __shop.build.picked = -1; }); const cdp = await ctx.newCDPSession(p);
for (const rate of [1, 4]) { await cdp.send('Emulation.setCPUThrottlingRate', { rate }); L(`fps inside shop 844x390 cpu x${rate}:`, JSON.stringify(await fps(p))); }
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
await p.evaluate(() => __shop.exit()); await p.waitForTimeout(300);
// publish (owner key) + visit it as a visitor would from the multiplayer list ("Visit shop": fetch on entry). Needs the live API.
const pub = await p.evaluate(async () => { try { await __shop.publish(); return { ok: globalThis.__shopPublished || 0, id: __inu.state.homeShare?.id }; } catch (e) { return { err: String(e) }; } }); L('publish:', JSON.stringify(pub));
if (pub.ok) { const r = await p.evaluate((id) => fetch('/api/home?shop=s' + id.slice(1)).then((r) => r.json()), pub.id); L('GET shop:', JSON.stringify({ owner: r.owner, items: r.layout?.items?.length, type: r.layout?.type }));
  await p.evaluate((id) => __shop.visit(id, 'Kabosu'), pub.id); await p.waitForTimeout(1200); await shot(p, 'visitor-view-844x390'); L('visitor view items:', await p.evaluate(() => __shop.build?.shop?.items?.length), 'readOnly', await p.evaluate(() => __shop.build?.readOnly)); await p.evaluate(() => __shop.exit()); await p.waitForTimeout(300); }
for (const rate of [1, 4]) { await cdp.send('Emulation.setCPUThrottlingRate', { rate }); await p.evaluate(() => { globalThis.__camLock = { x: 44 * 32, y: 77 * 32 }; }); await p.waitForTimeout(800); L(`fps street by the shop 844x390 cpu x${rate}:`, JSON.stringify(await fps(p))); }
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await p.evaluate(() => { __inu.setZoom?.(2); globalThis.__camLock = { x: 44 * 32, y: 77 * 32 }; }); await p.waitForTimeout(800); await shot(p, 'window-display-street-844x390');
await ctx.close();
// ---- 667x375 phone check ----
({ page: p, ctx } = await boot({ width: 667, height: 375 }));
await lease(p, 'cafe'); await p.evaluate(() => __shop.enter('P1')); await p.waitForTimeout(500); await shot(p, 'phone-cafe-667x375');
await p.tap('[data-sinv]').catch(() => {}); await tapCell(p, 10, 2); await tapCell(p, 10, 2); await shot(p, 'phone-editor-picked-667x375');
const cdp2 = await ctx.newCDPSession(p); await p.evaluate(() => { __shop.build.sel = null; __shop.build.picked = -1; });
for (const rate of [1, 4]) { await cdp2.send('Emulation.setCPUThrottlingRate', { rate }); L(`fps inside shop 667x375 cpu x${rate}:`, JSON.stringify(await fps(p))); }
await ctx.close();
L('page errors:', JSON.stringify(errs)); fs.writeFileSync('proof/interiors-log.txt', log.join('\n') + '\n'); await b.close();

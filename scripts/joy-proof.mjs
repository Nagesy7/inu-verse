// Optional Joystick controls proof: OFF (default, unchanged) vs ON at 667x375, 750x342, 844x390 (touch) + desktop 1280x800,
// toggle in Settings (☰), persistence (localStorage + save -> wallet cloud save), multi-touch move + A at the same time, sprint
// at the edge, layout (in the bottom corners, never over the centre of the screen or the HUD).
//   URL=https://inu-verse-tawny.vercel.app/ node scripts/joy-proof.mjs
import { chromium } from 'playwright'; import fs from 'fs';
const URL = process.env.URL || 'http://127.0.0.1:8644/', OUT = process.env.OUT || 'proof'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(), res = { url: URL, viewports: {} }, errs = [];
const box = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const cs = getComputedStyle(e); if (cs.display === 'none' || e.closest('[hidden]')) return null; const r = e.getBoundingClientRect(); return r.width ? { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) } : null; }, sel);
const visible = async (p, sel) => !!(await box(p, sel));
const overlap = (a, c) => a && c && a.l < c.r && a.r > c.l && a.t < c.b && a.b > c.t;
async function boot(w, h, touch) { const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: touch, isMobile: false }); const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(`${w}x${h} ${e.message}`));
  await p.goto(URL); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); localStorage.setItem('inuverse.mp.off', '1'); });
  const start = async () => { await p.reload(); await p.waitForTimeout(900); await p.click('#start'); await p.waitForTimeout(2000); await p.evaluate(() => { globalThis.__guide?.endTour?.('skipped'); __inu.setHour(11); document.querySelectorAll('.toast').forEach((t) => t.remove()); }); };
  await start(); return { ctx, p, start }; }
for (const [w, h, touch] of [[667, 375, true], [750, 342, true], [844, 390, true], [1280, 800, false]]) {
  const tag = `${w}x${h}`, { ctx, p, start } = await boot(w, h, touch), r = res.viewports[tag] = {};
  r.off = { oldStick: await visible(p, '#stick'), oldA: await visible(p, '#btn-a'), newStick: await visible(p, '#joy2-pad'), label: await p.evaluate(() => document.getElementById('dr-joy')?.textContent) };
  await p.screenshot({ path: `${OUT}/joy-off-${tag}.png` });
  // toggle ON in Settings (☰ menu)
  await p.click('#menu-btn'); await p.waitForTimeout(250); await p.screenshot({ path: `${OUT}/joy-menu-toggle-${tag}.png` }); await p.click('#dr-joy'); await p.waitForTimeout(150);
  r.labelAfterToggle = await p.evaluate(() => document.getElementById('dr-joy').textContent); await p.click('#dr-close'); await p.waitForTimeout(250);
  const pad = await box(p, '#joy2-pad'), ba = await box(p, '#joy2-a'), bb = await box(p, '#joy2-b');
  const centre = { l: w * 0.3, r: w * 0.7, t: h * 0.25, b: h * 0.75 }, hud = await Promise.all(['#prompt', '#menu-btn', '#chat', '.kp-wallet-btn, #kp-connect, [id*="wallet"]'].map((s) => box(p, s)));
  r.on = { oldStick: await visible(p, '#stick'), newStick: !!pad, pad, a: ba, b: bb, inViewport: [pad, ba, bb].every((x) => x && x.l >= 0 && x.t >= 0 && x.r <= w && x.b <= h),
    clearOfCentre: ![pad, ba, bb].some((x) => overlap(x, centre)), clearOfHud: ![pad, ba, bb].some((x) => hud.some((y) => overlap(x, y))), padSize: pad && pad.r - pad.l };
  await p.screenshot({ path: `${OUT}/joy-on-${tag}.png` });
  // persistence: localStorage + the save (which the wallet cloud save syncs), survives a reload
  r.saved = await p.evaluate(() => ({ local: localStorage.getItem('inuverse.joystick'), save: JSON.parse(localStorage.getItem('inuverse.save.v1') || '{}').settings || null }));
  await start(); r.afterReload = { newStick: await visible(p, '#joy2-pad'), oldStick: await visible(p, '#stick'), label: await p.evaluate(() => document.getElementById('dr-joy')?.textContent) };
  if (touch) { // multi-touch: hold the stick right (finger 1) and press A (finger 2) at the same time
    const cdp = await ctx.newCDPSession(p), P = await box(p, '#joy2-pad'), A = await box(p, '#joy2-a'), cx = (P.l + P.r) / 2, cy = (P.t + P.b) / 2, R = (P.r - P.l) / 2;
    await p.evaluate(() => { const s = __inu.state; s.player.x = 30.5 * 32; s.player.y = 22.5 * 32; globalThis.__actCount = 0; });
    const x0 = await p.evaluate(() => __inu.state.player.x);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy, id: 1 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx + R * 0.7, y: cy, id: 1 }] });
    await p.waitForTimeout(500); const x1 = await p.evaluate(() => __inu.state.player.x);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx + R * 0.7, y: cy, id: 1 }, { x: (A.l + A.r) / 2, y: (A.t + A.b) / 2, id: 2 }] });
    await p.waitForTimeout(120); const mid = await p.evaluate(() => ({ acts: globalThis.__actCount, moving: __mob().moving }));
    await p.screenshot({ path: `${OUT}/joy-multitouch-${tag}.png` });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx + R * 0.7, y: cy + 1, id: 1 }, { x: (A.l + A.r) / 2, y: (A.t + A.b) / 2, id: 2 }] });
    await p.waitForTimeout(300); const x2 = await p.evaluate(() => __inu.state.player.x);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(400); const x3 = await p.evaluate(() => ({ x: __inu.state.player.x, moving: __mob().moving }));
    // sprint: a fresh touch held at the edge of the stick
    await p.evaluate(() => { const s = __inu.state; s.player.x = 30.5 * 32; s.player.y = 22.5 * 32; });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy, id: 3 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx + R * 1.3, y: cy, id: 3 }] });
    await p.waitForTimeout(500); const run = await p.evaluate(() => ({ running: __mob().running, v: __mob().v }));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(300);
    r.multitouch = { movedBeforeA: Math.round(x1 - x0), aPressedWhileMoving: mid.acts === 1 && mid.moving, keptMovingAfterA: x2 > x1 + 5, sprintAtEdge: run.running, sprintDbg: run, stopsOnRelease: !x3.moving }; }
  // toggle OFF again -> the old behaviour is back
  await p.click('#menu-btn'); await p.waitForTimeout(200); await p.click('#dr-joy'); await p.click('#dr-close'); await p.waitForTimeout(200);
  r.offAgain = { oldStick: await visible(p, '#stick'), newStick: await visible(p, '#joy2-pad'), saved: await p.evaluate(() => JSON.parse(localStorage.getItem('inuverse.save.v1')).settings) };
  await ctx.close(); }
res.errors = errs; fs.writeFileSync(`${OUT}/joy-results.json`, JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1)); await b.close();

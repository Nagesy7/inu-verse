// Extra proof: depth sorting, dialogue/'!' bubble, walk-cycle frames, phone landscape with real touch input.
import { chromium, devices } from 'playwright';
const URL = process.env.URL || 'http://localhost:8642/';
const b = await chromium.launch(); const errs = [];
const start = async (page) => { page.on('pageerror', (e) => errs.push(e.message)); await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(700); };
const tp = (page, tx, ty, face) => page.evaluate(([tx, ty]) => { const s = __inu.state; s.player.x = (tx + .5) * 32; s.player.y = (ty + .5) * 32; __inu.cam.x = s.player.x; __inu.cam.y = s.player.y; document.querySelectorAll('.toast').forEach((t) => t.remove()); }, [tx, ty]);
{ const page = await b.newPage({ viewport: { width: 1280, height: 800 } }); await start(page); await page.click('#start'); await page.waitForTimeout(1500);
  // depth: stand just north of the café roof line and behind a tree canopy
  await tp(page, 6, 11.2); await page.waitForTimeout(700); await page.screenshot({ path: 'proof/polish-depth-behind-roof.png' });
  await tp(page, 16, 2.2); await page.waitForTimeout(700); await page.screenshot({ path: 'proof/polish-depth-behind-tree.png' });
  // '!' bubble at the café door, then pet a pup -> typewriter dialogue
  await tp(page, 7, 18); await page.waitForTimeout(700); await page.screenshot({ path: 'proof/polish-interact-bubble.png' });
  await page.evaluate(() => { const n = __inu.npcs[0], s = __inu.state; n.x = s.player.x + 30; n.y = s.player.y + 40; n.path = []; }); await tp(page, 14, 27.6);
  await page.evaluate(() => { const n = __inu.npcs[0], s = __inu.state; n.x = s.player.x + 26; n.y = s.player.y; n.path = []; });
  await page.keyboard.press('e'); await page.waitForTimeout(900); await page.screenshot({ path: 'proof/polish-dialogue-typewriter.png' });
  // walking in world: down / side / back
  for (const [k, n] of [['s', 'front'], ['d', 'side'], ['w', 'back']]) { await tp(page, 20, 22); await page.keyboard.down(k); await page.waitForTimeout(520); await page.screenshot({ path: `proof/walk-world-${n}.png`, clip: { x: 440, y: 250, width: 400, height: 300 } }); await page.keyboard.up(k); }
  // walk cycle sheet: every coat's 4 frames x front/side/back, drawn by the game's own avatar renderer
  await page.addScriptTag({ type: 'module', content: `import { drawShiba } from '/src/art.js';
    const c = document.createElement('canvas'); c.width = 1280; c.height = 800; c.style.cssText = 'position:fixed;inset:0;z-index:99'; document.body.appendChild(c);
    const x = c.getContext('2d'); x.fillStyle = '#121a36'; x.fillRect(0, 0, 1280, 800); x.font = '14px Silkscreen'; x.fillStyle = '#f2cc68'; x.textAlign = 'center';
    x.fillText('WALK CYCLE - 4 FRAMES (CONTACT L / PASS / CONTACT R / PASS) - FRONT, SIDE, BACK', 640, 30);
    ['down', 'right', 'up'].forEach((face, r) => { x.fillText(['FRONT', 'SIDE', 'BACK'][r], 70, 160 + r * 250); for (let f = 0; f < 4; f++) { drawShiba(x, 260 + f * 270, 230 + r * 250, { coat: 'tan', art: 'layer:tan', face, moving: true, phase: f * 1.6 + 0.1, scale: 3, shadow: false, outfit: r === 1 ? { top: 'hawaiian' } : {} }); x.fillText('F' + f, 260 + f * 270, 250 + r * 250); } });
    window.__ws = 1;` });
  await page.waitForFunction(() => window.__ws === 1); await page.screenshot({ path: 'proof/walk-cycle-frames.png' });
  console.log('fps', await page.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(Math.round(n / ((performance.now() - t0) / 1000))); }; requestAnimationFrame(f); })));
  await page.close(); }
for (const [dev, tag] of [['iPhone 13 landscape', 'iphone13'], ['Pixel 7 landscape', 'pixel7']]) {
  const ctx = await b.newContext({ ...devices[dev] }); const page = await ctx.newPage(); await start(page);
  await page.screenshot({ path: `proof/landscape-${tag}-01-title.png` });
  await page.locator('#start').scrollIntoViewIfNeeded(); await page.screenshot({ path: `proof/landscape-${tag}-01-title.png` });
  await page.touchscreen.tap(...(await page.locator('#start').boundingBox().then((r) => [r.x + r.width / 2, r.y + r.height / 2]))); await page.waitForTimeout(1400);
  const before = await page.evaluate(() => ({ x: __inu.state.player.x, y: __inu.state.player.y, sw: document.scrollingElement.scrollHeight, h: innerHeight }));
  // real touch drag on the virtual stick (CDP touch events)
  const cdp = await ctx.newCDPSession(page); const st = await page.locator('#stick').boundingBox(); const cx = st.x + st.width / 2, cy = st.y + st.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] });
  for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx + i * 8, y: cy }] }); await page.waitForTimeout(30); }
  await page.waitForTimeout(800); await page.screenshot({ path: `proof/landscape-${tag}-02-world-touch-walk.png` });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const after = await page.evaluate(() => ({ x: __inu.state.player.x, y: __inu.state.player.y }));
  console.log(tag, 'stick moved player', Math.round(after.x - before.x), 'px; page scrollHeight', before.sw, 'viewport', before.h);
  // walk to café door and tap A
  await page.evaluate(() => { const s = __inu.state; s.player.x = 7.5 * 32; s.player.y = 18.5 * 32; });
  await page.waitForTimeout(300); const a = await page.locator('#btn-a').boundingBox(); await page.touchscreen.tap(a.x + a.width / 2, a.y + a.height / 2); await page.waitForTimeout(700);
  console.log(tag, 'A opened panel:', await page.evaluate(() => __inu.panel)); await page.screenshot({ path: `proof/landscape-${tag}-03-cafe-panel.png` });
  for (const [kind, sel] of [['wardrobe', '#btn-wardrobe'], ['launch', null], ['mall', null], ['leaders', null]]) {
    await page.evaluate(() => document.querySelector('#panel-close').click()); await page.waitForTimeout(250);
    if (sel) { const r = await page.locator(sel).boundingBox(); await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); }
    else { const pos = { launch: [41, 18], mall: [32, 58], leaders: [21, 58] }[kind]; await page.evaluate(([x, y]) => { const s = __inu.state; s.player.x = (x + .5) * 32; s.player.y = (y + .5) * 32; }, pos); await page.waitForTimeout(250); const r = await page.locator('#btn-a').boundingBox(); await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); }
    await page.waitForTimeout(600);
    const fit = await page.evaluate(() => { const c = document.querySelector('.panel-card').getBoundingClientRect(), p = document.querySelector('.panel-card'); return { inView: c.top >= 0 && c.bottom <= innerHeight + 1, scrolls: p.scrollHeight > p.clientHeight, docScroll: document.scrollingElement.scrollTop }; });
    // scroll inside the panel with a real touch swipe
    const pc = await page.locator('.panel-card').boundingBox();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pc.x + pc.width / 2, y: pc.y + pc.height - 30 }] });
    for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: pc.x + pc.width / 2, y: pc.y + pc.height - 30 - i * 20 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(300);
    const scrolled = await page.evaluate(() => document.querySelector('.panel-card').scrollTop);
    console.log(tag, kind, 'panel=', await page.evaluate(() => __inu.panel), JSON.stringify(fit), 'inner scrollTop after swipe', scrolled);
    await page.screenshot({ path: `proof/landscape-${tag}-04-${kind}.png` });
  }
  await page.evaluate(() => document.querySelector('#panel-close').click());
  // rotate to portrait live
  const vp = page.viewportSize(); await page.setViewportSize({ width: vp.height, height: vp.width }); await page.waitForTimeout(600);
  console.log(tag, 'portrait canvas', await page.evaluate(() => [document.querySelector('#game').width / devicePixelRatio, innerWidth, innerHeight]));
  await page.screenshot({ path: `proof/landscape-${tag}-05-rotated-portrait.png` }); await ctx.close();
}
console.log('errors', JSON.stringify(errs)); await b.close();

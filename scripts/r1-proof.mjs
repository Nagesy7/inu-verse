// Round 1 mobility proof: tap-to-walk (marker, A*), key cancel, tap door -> enters once, tap NPC -> talks, run (Shift / stick edge),
// fps at 844x390 + 667x375, GIF frames. URL=<site> node scripts/r1-proof.mjs
import { chromium } from 'playwright'; import fs from 'fs'; import { execSync } from 'child_process';
const URL = process.env.URL || 'http://localhost:8642/', OUT = 'proof', G = '/tmp/r1gif'; const res = {}, errs = [];
fs.rmSync(G, { recursive: true, force: true }); fs.mkdirSync(G);
const b = await chromium.launch();
async function boot(w, h) { const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(`${w}x${h} ${e.message}`)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::|kibble-pay|dexscreener|api\/coins/i.test(m.text())) errs.push(`${w}x${h} ${m.text()}`); });
  await p.goto(URL); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); }); await p.reload(); await p.waitForTimeout(900); await p.click('#start'); await p.waitForTimeout(2500);
  await p.evaluate(() => { globalThis.__guide?.endTour?.('skipped'); __inu.setHour(11); globalThis.__noNav = true; }); return { ctx, p }; }
const scr = (p, tx, ty) => p.evaluate(([tx, ty]) => ({ x: ((tx + 0.5) * 32 - __inu.cam.x) * __inu.zoom + innerWidth / 2, y: ((ty + 0.5) * 32 - __inu.cam.y) * __inu.zoom + innerHeight / 2 }), [tx, ty]);
const place = (p, tx, ty) => p.evaluate(([tx, ty]) => { const s = __inu.state; s.player.x = (tx + 0.5) * 32; s.player.y = (ty + 0.5) * 32; __inu.cam.x = s.player.x; __inu.cam.y = s.player.y; }, [tx, ty]);
const mob = (p) => p.evaluate(() => __mob());
async function frames(p, n, tag, ms = 90) { for (let i = 0; i < n; i++) { await p.screenshot({ path: `${G}/${tag}-${String(i).padStart(3, '0')}.png` }); await p.waitForTimeout(ms); } }
{ const { ctx, p } = await boot(844, 390);
  // 1) tap-to-walk around the bank (A* + marker), GIF frames
  const bank = await p.evaluate(() => { const d = __inu.state && (globalThis.__doorsFor?.() || null); return null; });
  await place(p, 20, 30); await p.waitForTimeout(400);
  const goal = await p.evaluate(() => { const S = __inu.state; let best = null; for (let r = 5; r <= 8 && !best; r++) for (const [dx, dy] of [[r, 2], [-r, 2], [r, -2], [-r, -2], [2, r], [2, -r]]) { const x = 20 + dx, y = 30 + dy; if (x > 0 && y > 0 && __walkTo(x, y)) { best = [x, y]; break; } } globalThis.__stopIt = true; return best; });
  await place(p, 20, 30); await p.waitForTimeout(300);
  let s = await scr(p, goal[0], goal[1]); await p.touchscreen.tap(s.x, s.y); await p.waitForTimeout(120);
  res.tapStarted = await mob(p); await p.screenshot({ path: `${OUT}/r1-tap-marker.png` }); await frames(p, 18, 'a');
  for (let i = 0; i < 40 && (await mob(p)).pts; i++) await p.waitForTimeout(100);
  const m1 = await mob(p); res.tapArrived = { tile: [Math.floor(m1.x / 32), Math.floor(m1.y / 32)], goal, markerCleared: !m1.mark };
  // 2) key press cancels path-walking
  s = await scr(p, goal[0] - 4, goal[1]); await p.touchscreen.tap(s.x, s.y); await p.waitForTimeout(150); const before = (await mob(p)).pts; await p.keyboard.down('ArrowDown'); await p.waitForTimeout(120); const afterKey = await mob(p); await p.keyboard.up('ArrowDown');
  res.keyCancels = { ptsBefore: before, ptsAfter: afterKey.pts, face: afterKey.face };
  // 3) run with Shift: speed + dust, GIF frames
  await place(p, 20, 30); await p.keyboard.down('Shift'); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(350); res.runShift = await mob(p); await p.screenshot({ path: `${OUT}/r1-run-dust.png` }); await frames(p, 12, 'b', 70);
  await p.keyboard.up('ArrowRight'); await p.keyboard.up('Shift'); await p.waitForTimeout(150); res.stopAfterRun = await mob(p);
  // 4) stick pushed to the edge = run
  const st = await p.locator('#stick').boundingBox(); if (st) { const cx = st.x + st.width / 2, cy = st.y + st.height / 2; await place(p, 20, 30);
    const cdp = await ctx.newCDPSession(p); const tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    await tp('touchStart', cx, cy); await tp('touchMove', cx - st.width, cy); await p.waitForTimeout(400); res.stickEdge = await mob(p); await tp('touchEnd'); await p.waitForTimeout(100);
    await tp('touchStart', cx, cy); await tp('touchMove', cx - st.width * 0.3, cy); await p.waitForTimeout(400); res.stickHalf = await mob(p); await tp('touchEnd'); }
  // 5) tap a door -> walks there and enters exactly once (fade), close -> no re-trigger
  const door = await p.evaluate(async () => { const W = await import('/src/world.js'); const d = W.doorList(__inu.state).find((x) => x.id === 'bank'); return d && { tx: d.tx, ty: d.ty }; });
  await place(p, door.tx - 3, door.ty + 2); await p.waitForTimeout(300); await p.evaluate(() => { globalThis.__doorEnters = 0; });
  s = await scr(p, door.tx, door.ty); await p.touchscreen.tap(s.x, s.y); await p.waitForTimeout(150); res.doorPlan = await p.evaluate(() => ({ ...__mob(), target: __inu.player.target?.id }));
  for (let i = 0; i < 50 && !(await p.evaluate(() => __inu.panel)); i++) await p.waitForTimeout(100);
  res.doorTap = await p.evaluate(() => ({ panel: __inu.panel, enters: __doorEnters, fade: document.getElementById('fade')?.classList.contains('go') })); await p.screenshot({ path: `${OUT}/r1-door-entered.png` });
  await p.evaluate(() => document.getElementById('panel-close').click()); await p.waitForTimeout(1500); res.doorAfterClose = await p.evaluate(() => ({ panel: __inu.panel, enters: __doorEnters }));
  // 6) tap an NPC -> walk up and talk
  const npc = await p.evaluate(async () => { const W = await import('/src/world.js'); const ok = (q) => !q.president && q.x > 400 && [1, 2, 3, 4].every((k) => !W.isSolid(Math.floor(q.x / 32) - k, Math.floor(q.y / 32))); const n = __inu.npcs.find(ok) || __inu.npcs[0]; n.held = 8; n.path = []; /* freeze for a reliable scripted tap */ return { name: n.name, x: n.x, y: n.y }; });
  await p.evaluate(({ x, y }) => { const S = __inu.state; S.player.x = x - 4 * 32; S.player.y = y; __inu.cam.x = S.player.x; __inu.cam.y = S.player.y; }, npc); await p.waitForTimeout(300);
  const ns = await p.evaluate(({ x, y }) => ({ x: (x - __inu.cam.x) * __inu.zoom + innerWidth / 2, y: (y - 14 - __inu.cam.y) * __inu.zoom + innerHeight / 2 }), npc); res.npcEl = await p.evaluate(({ x, y }) => { const e = document.elementFromPoint(x, y); return e && (e.id || e.className || e.tagName); }, ns); res.ns = ns; await p.touchscreen.tap(ns.x, ns.y); await p.waitForTimeout(150); res.npcPlan = await p.evaluate(() => ({ ...__mob(), npcT: !!__inu.player.npcT }));
  for (let i = 0; i < 50 && (await p.locator('#dialog').isHidden()) && !(await p.evaluate(() => __inu.panel)); i++) await p.waitForTimeout(100);
  res.npcEnd = await p.evaluate((nm) => { const n = __inu.npcs.find((q) => q.name === nm); const S = __inu.state; return { d: Math.hypot(n.x - S.player.x, n.y - S.player.y), ...__mob() }; }, npc.name); res.npcTap = { npc: npc.name, panel: await p.evaluate(() => __inu.panel), dialog: !(await p.locator('#dialog').isHidden()), text: await p.locator('#dialog .dname').textContent().catch(() => '') }; await p.screenshot({ path: `${OUT}/r1-npc-talk.png` });
  // 7) jitter: player screen position while walking must stay on the device-pixel grid
  await place(p, 20, 30); await p.keyboard.down('ArrowRight'); const js = []; for (let i = 0; i < 20; i++) { js.push(await p.evaluate(() => globalThis.__camDbg)); await p.waitForTimeout(40); } await p.keyboard.up('ArrowRight');
  const offGrid = js.filter((d) => d && (Math.abs(d.px * 2 - Math.round(d.px * 2)) > 0.01 || Math.abs((d.px - d.x) * 2 - Math.round((d.px - d.x) * 2)) > 0.01)).length; res.pixelSnap = { samples: js.length, offGrid, playerScreenX: [...new Set(js.map((d) => Math.round((d.px - d.x) * 100) / 100))].slice(0, 4) };
  await ctx.close(); }
// fps while walking + running at both phone sizes (4x CPU throttle too)
for (const [w, h] of [[844, 390], [667, 375]]) { const { ctx, p } = await boot(w, h); const cdp = await ctx.newCDPSession(p);
  for (const rate of [1, 4]) { await cdp.send('Emulation.setCPUThrottlingRate', { rate }); await place(p, 20, 30); await p.keyboard.down('Shift'); await p.keyboard.down('ArrowRight');
    res[`fps_${w}x${h}@${rate}x`] = await p.evaluate(() => new Promise((r) => { let f = 0; const t0 = performance.now(); const go = () => { f++; if (performance.now() - t0 < 3000) requestAnimationFrame(go); else r(Math.round(f / ((performance.now() - t0) / 1000))); }; requestAnimationFrame(go); }));
    await p.keyboard.up('ArrowRight'); await p.keyboard.up('Shift'); }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await p.screenshot({ path: `${OUT}/r1-${w}x${h}.png` }); await ctx.close(); }
await b.close();
execSync(`ffmpeg -y -loglevel error -framerate 10 -pattern_type glob -i '${G}/a-*.png' -vf "scale=560:-1:flags=neighbor,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse" ${OUT}/r1-tap-to-walk.gif`);
execSync(`ffmpeg -y -loglevel error -framerate 14 -pattern_type glob -i '${G}/b-*.png' -vf "scale=560:-1:flags=neighbor,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse" ${OUT}/r1-run.gif`);
res.errors = errs; fs.writeFileSync(`${OUT}/r1-results.json`, JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1));

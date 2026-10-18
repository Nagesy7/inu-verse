// Round 2 rooms & zones proof: walk into hub doors -> interior rooms (own camera, furniture, NPCs), use a spot -> existing panel,
// walk out the exit mat -> back outside the right door; hub gates -> park -> beach -> ferry -> shrine island -> back. fps + GIF.
// URL=<site> node scripts/r2-proof.mjs
import { chromium } from 'playwright'; import fs from 'fs'; import { execSync } from 'child_process';
const URL = process.env.URL || 'http://localhost:8642/', OUT = 'proof', G = '/tmp/r2gif'; const res = { url: URL, rooms: {}, zones: {} }, errs = [];
fs.rmSync(G, { recursive: true, force: true }); fs.mkdirSync(G); let fi = 0;
const b = await chromium.launch();
async function boot(w, h) { const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(`${w}x${h} ${e.message}`)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::|kibble-pay|dexscreener|api\/coins/i.test(m.text())) errs.push(`${w}x${h} ${m.text()}`); });
  await p.goto(URL); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); }); await p.reload(); await p.waitForTimeout(900); await p.click('#start'); await p.waitForTimeout(2500);
  await p.evaluate(() => { globalThis.__guide?.endTour?.('skipped'); __inu.setHour(11); globalThis.__noNav = true; }); return { ctx, p }; }
const scr = (p, tx, ty) => p.evaluate(([tx, ty]) => ({ x: ((tx + 0.5) * 32 - __inu.cam.x) * __inu.zoom + innerWidth / 2, y: ((ty + 0.5) * 32 - __inu.cam.y) * __inu.zoom + innerHeight / 2 }), [tx, ty]);
const place = (p, tx, ty) => p.evaluate(([tx, ty]) => { const s = __inu.state; s.player.x = (tx + 0.5) * 32; s.player.y = (ty + 0.5) * 32; __inu.cam.x = s.player.x; __inu.cam.y = s.player.y; }, [tx, ty]);
const room = (p) => p.evaluate(() => __room());
const hubTile = (p) => p.evaluate(() => [Math.floor(__inu.state.player.x / 32), Math.floor(__inu.state.player.y / 32)]);
const shot = (p) => p.screenshot({ path: `${G}/f-${String(fi++).padStart(4, '0')}.png` });
async function until(p, fn, ms = 6000, gif = false) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await p.evaluate(fn); if (v) return v; if (gif) await shot(p); await p.waitForTimeout(gif ? 60 : 80); } return null; }
const tapRoom = async (p, tx, ty) => { const s = await p.evaluate(([tx, ty]) => { const k = __roomCam; return { x: ((tx + 0.5) * 32 + k.ox) * k.Z, y: ((ty + 0.5) * 32 + k.oy) * k.Z }; }, [tx, ty]); if (s.y < 50 || s.y > innerH(p) - 20) res.offscreenTaps = (res.offscreenTaps || 0) + 1; await p.touchscreen.tap(s.x, s.y); };
const innerH = (p) => p.viewportSize().height;
const closePanel = (p) => p.evaluate(() => document.getElementById('panel-close').click());
const W = (p) => p.evaluate(async () => { const S = await import('/src/scenes.js'), Wd = await import('/src/world.js'), D = await import('/src/doors.js');
  return Object.entries(S.DOOR_SCENES).map(([k, sid]) => { const [kind, id] = k.split(':'); const d = Wd.doorList(__inu.state).find((q) => q.kind === kind && q.id === id); const o = D.outsideOf(d); const sc = S.scene(sid);
    return { sid, kind, id, tx: d.tx, ty: d.ty, face: Wd.doorDir(d).face, out: [Math.floor(o.x / 32), Math.floor(o.y / 32)], exit: sc.exits[0].tiles[0], spot: sc.spots[0] && [sc.spots[0].tx, sc.spots[0].ty], spotPanel: sc.spots[0]?.act.panel || null }; }); });
{ const { ctx, p } = await boot(844, 390); const doors = await W(p); const KEY = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
  // 1) café: TAP the door from the street -> walks in (A*) -> fade -> café room
  const cafe = doors.find((d) => d.sid === 'cafe'); await place(p, cafe.tx + 2, cafe.ty + 3); await p.waitForTimeout(400); await p.evaluate(() => { globalThis.__doorEnters = 0; });
  let s = await scr(p, cafe.tx, cafe.ty); await p.touchscreen.tap(s.x, s.y); await shot(p);
  const inCafe = await until(p, () => { const r = __room(); return r && r.id === 'cafe' && !r.busy && r; }, 8000, true); for (let i = 0; i < 6; i++) { await shot(p); await p.waitForTimeout(60); }
  res.cafeTapDoor = { entered: !!inCafe, room: inCafe, enters: await p.evaluate(() => __doorEnters), fadeCss: await p.evaluate(() => getComputedStyle(document.getElementById('fade')).animationDuration) };
  await p.screenshot({ path: `${OUT}/r2-cafe.png` });
  // tap the counter -> walks there -> café panel (existing)
  await p.evaluate(() => __roomWalk(8, 5)); await until(p, () => !__room().pts, 6000, true); await tapRoom(p, cafe.spot[0], cafe.spot[1] - 1); /* tap the counter itself */ const pc = await until(p, () => __inu.panel, 8000, true); res.cafeCounter = { panel: pc }; await p.screenshot({ path: `${OUT}/r2-cafe-counter-panel.png` }); await closePanel(p); await p.waitForTimeout(400);
  // tap the exit mat -> walks out -> back on the street outside the café door
  await p.evaluate(() => __roomWalk(9, 8)); await until(p, () => !__room().pts, 6000, true); await tapRoom(p, cafe.exit[0], cafe.exit[1]); const back = await until(p, () => !__room() && __inu.state && [Math.floor(__inu.state.player.x / 32), Math.floor(__inu.state.player.y / 32)], 8000, true); for (let i = 0; i < 8; i++) { await shot(p); await p.waitForTimeout(60); }
  res.cafeExit = { hubTile: back, expected: cafe.out, ok: !!back && back[0] === cafe.out[0] && back[1] === cafe.out[1] }; await p.screenshot({ path: `${OUT}/r2-exit-outside-cafe.png` });
  await p.waitForTimeout(1200); res.cafeNoReenter = !(await room(p));
  // 2) every interior: walk into its hub door with keys, use its spot, walk out with keys
  for (const d of doors) { const r = {}; const dd = { up: [0, 1], left: [1, 0], right: [-1, 0] }[d.face] || [0, 1];
    await place(p, d.out[0], d.out[1]); await p.waitForTimeout(250); await p.evaluate(([x, y]) => __walkTo(x, y), [d.tx, d.ty]); await until(p, () => !__mob().pts, 5000); await p.keyboard.down(KEY[d.face]); const ent = await until(p, () => { const r = __room(); return r && !r.busy && r; }, 4000); await p.keyboard.up(KEY[d.face]);
    r.entered = ent?.id; r.correct = ent?.id === d.sid; await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/r2-room-${d.sid}.png` });
    if (d.spot) { await p.evaluate(([x, y]) => __roomWalk(x, y), d.spot); await until(p, () => __inu.panel || (__room() && !__room().pts), 6000); await p.waitForTimeout(150); const pn = await p.evaluate(() => __inu.panel); if (!pn) { await p.keyboard.press('e'); await p.waitForTimeout(400); } r.spotPanel = await p.evaluate(() => __inu.panel || (document.getElementById('dialog')?.hidden === false ? 'dialog' : null)); r.spotExpected = d.spotPanel;
      if (await p.evaluate(() => __inu.panel)) { await closePanel(p); await p.waitForTimeout(300); } if (await p.evaluate(() => globalThis.__inu.mode === 'build')) { await p.evaluate(() => document.getElementById('build-done')?.click()); await p.waitForTimeout(400); } }
    await p.evaluate(([x, y]) => __roomWalk(x, y - 1), d.exit); await until(p, () => __room() && !__room().pts, 6000); await p.keyboard.down('ArrowDown'); const out = await until(p, () => !__room() && [Math.floor(__inu.state.player.x / 32), Math.floor(__inu.state.player.y / 32)], 4000); await p.keyboard.up('ArrowDown');
    r.out = out; r.expectedOut = d.out; r.exitOk = !!out && out[0] === d.out[0] && out[1] === d.out[1]; await p.waitForTimeout(1000); r.noReenter = !(await room(p)); res.rooms[d.sid] = r; }
  // 3) zones: hub east gate -> park -> beach -> ferry -> shrine -> ferry -> beach -> south gate -> hub
  await place(p, 58, 21); await p.waitForTimeout(300); s = await scr(p, 62, 21); await p.touchscreen.tap(s.x, s.y); await shot(p);
  const park = await until(p, () => { const r = __room(); return r && r.id === 'park' && !r.busy && r; }, 8000, true); for (let i = 0; i < 6; i++) { await shot(p); await p.waitForTimeout(60); } res.zones.gateToPark = park; await p.screenshot({ path: `${OUT}/r2-zone-park.png` });
  await p.evaluate(() => __roomWalk(13, 7)); await until(p, () => !__room().pts, 9000, true);
  await p.evaluate(() => __roomWalk(24, 13)); await until(p, () => !__room().pts, 9000, true); await tapRoom(p, 25, 15); const beach = await until(p, () => { const r = __room(); return r && r.id === 'beach' && !r.busy && r; }, 12000, true); res.zones.parkToBeach = beach; await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/r2-zone-beach.png` });
  await p.evaluate(() => __roomWalk(17, 7)); await until(p, () => !__room().pts, 9000, true); await tapRoom(p, 14, 9); const shrine = await until(p, () => { const r = __room(); return r && r.id === 'shrine' && !r.busy && r; }, 12000, true); for (let i = 0; i < 6; i++) { await shot(p); await p.waitForTimeout(60); } res.zones.ferryToShrine = shrine; await p.screenshot({ path: `${OUT}/r2-zone-shrine.png` });
  await p.evaluate(() => __roomWalk(12, 7)); await until(p, () => !__room().pts, 9000, true); await tapRoom(p, 12, 5); await until(p, () => document.getElementById('dialog')?.hidden === false, 9000, true); res.zones.bell = await p.evaluate(() => document.getElementById('dialog')?.innerText?.slice(0, 80)); await p.screenshot({ path: `${OUT}/r2-shrine-bell.png` });
  for (let i = 0; i < 4 && await p.evaluate(() => document.getElementById('dialog')?.hidden === false); i++) { await p.keyboard.press('e'); await p.waitForTimeout(300); }
  await p.evaluate(() => __roomWalk(13, 10)); await until(p, () => !__room().pts, 9000, true); await tapRoom(p, 12, 12); const beach2 = await until(p, () => { const r = __room(); return r && r.id === 'beach' && !r.busy && r; }, 12000, true); res.zones.ferryBack = beach2;
  await p.evaluate(() => __roomWalk(16, 1)); await until(p, () => !__room().pts, 9000, true); await p.keyboard.down('ArrowUp'); const hub = await until(p, () => !__room() && [Math.floor(__inu.state.player.x / 32), Math.floor(__inu.state.player.y / 32)], 12000, true); for (let i = 0; i < 6; i++) { await shot(p); await p.waitForTimeout(60); }
  await p.keyboard.up('ArrowUp'); res.zones.beachToHub = { tile: hub, expected: [34, 103] }; await p.screenshot({ path: `${OUT}/r2-hub-south-gate.png` });
  // park -> hub via west exit
  await place(p, 61, 21); await p.keyboard.down('ArrowRight'); await until(p, () => __room()?.id === 'park' && !__room().busy, 4000); await p.keyboard.up('ArrowRight'); await p.waitForTimeout(900);
  await p.keyboard.down('ArrowLeft'); const hub2 = await until(p, () => !__room() && [Math.floor(__inu.state.player.x / 32), Math.floor(__inu.state.player.y / 32)], 5000); await p.keyboard.up('ArrowLeft'); res.zones.parkToHub = { tile: hub2, expected: [61, 21] };
  // reload while "inside" a room -> you land outside the door (no soft-lock)
  const bk = doors.find((d) => d.sid === 'bank'); await place(p, bk.out[0], bk.out[1]); await p.evaluate(([x, y]) => __walkTo(x, y), [bk.tx, bk.ty]); await until(p, () => !__mob().pts, 5000); await p.keyboard.down('ArrowUp'); await until(p, () => __room()?.id === 'bank', 4000); await p.keyboard.up('ArrowUp'); await p.waitForTimeout(5800); // autosave tick
  await p.reload(); await p.waitForTimeout(900); await p.click('#continue'); await p.waitForTimeout(2500); res.reloadInRoom = { room: await room(p), tile: await hubTile(p), bankOutside: bk.out };
  await ctx.close(); }
// fps: room + zone, running, both phone sizes, normal + 4x CPU
for (const [w, h] of [[844, 390], [667, 375]]) { const { ctx, p } = await boot(w, h); const cdp = await ctx.newCDPSession(p);
  for (const [sid, a, bb] of [['cafe', [1, 5], [14, 5]], ['park', [2, 7], [27, 7]]]) { await p.evaluate((sid) => __goScene(sid), sid); await p.waitForTimeout(600);
    for (const rate of [1, 4]) { await cdp.send('Emulation.setCPUThrottlingRate', { rate });
      res[`fps_${sid}_${w}x${h}@${rate}x`] = await p.evaluate(([a, bb]) => new Promise((r) => { let f = 0, k = 0; const t0 = performance.now(); const go = () => { f++; if (!__room().pts) __roomWalk(...(k++ % 2 ? a : bb), true); if (performance.now() - t0 < 3000) requestAnimationFrame(go); else r(Math.round(f / ((performance.now() - t0) / 1000))); }; requestAnimationFrame(go); }), [a, bb]); }
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await p.screenshot({ path: `${OUT}/r2-${sid}-${w}x${h}.png` }); }
  await ctx.close(); }
await b.close();
execSync(`ffmpeg -y -loglevel error -framerate 12 -pattern_type glob -i '${G}/f-*.png' -vf "scale=560:-1:flags=neighbor,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse" ${OUT}/r2-rooms-zones.gif`);
res.gifFrames = fi; res.consoleErrors = errs; fs.writeFileSync(`${OUT}/r2-results.json`, JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1));

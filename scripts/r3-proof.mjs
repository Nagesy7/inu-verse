// Round 3 proof: the action wheel (☰ menu, multiplayer popover, G), poses, auto-sit/doze, and two headless clients seeing
// each other's dance live, in the city and inside a room/zone. Phone landscape 844x390 + 667x375.
//   URL=https://inu-verse-tawny.vercel.app/ MP=wss://... node scripts/r3-proof.mjs   (MP optional: default = site config)
import { chromium } from 'playwright'; import fs from 'fs'; import { execSync } from 'child_process';
const URL = process.env.URL || 'http://127.0.0.1:8643/', MPU = process.env.MP || '', OUT = process.env.OUT || 'proof', G = '/tmp/r3gif', G2 = '/tmp/r3gif2';
for (const d of [G, G2]) { fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d, { recursive: true }); } fs.mkdirSync(OUT, { recursive: true });
const res = {}, errs = [];
const b = await chromium.launch(/^https:/.test(URL) && /127\.0\.0\.1|localhost/.test(MPU) ? { args: ['--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests'] } : {});
async function boot(tag, guest, w, h, touch = false) { const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: touch, isMobile: false }); const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(`${tag} pageerror ${e.message}`)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::|kibble-pay|dexscreener|api\/coins|WebSocket connection/i.test(m.text())) errs.push(`${tag} ${m.text()}`); });
  await p.goto(URL + (MPU ? '?mp=' + encodeURIComponent(MPU) : '')); await p.evaluate((g) => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); localStorage.setItem('inuverse.mp.guest', g); }, guest);
  await p.reload(); await p.waitForTimeout(900); await p.click('#start'); await p.waitForTimeout(2200);
  await p.evaluate(() => { globalThis.__guide?.endTour?.('skipped'); __inu.setHour(11); globalThis.__noNav = true; document.querySelectorAll('.toast').forEach((t) => t.remove()); }); return { ctx, p, tag }; }
const place = (p, tx, ty) => p.evaluate(([tx, ty]) => { const s = __inu.state; s.player.x = (tx + 0.5) * 32; s.player.y = (ty + 0.5) * 32; }, [tx, ty]);
const lock = (p, tx, ty) => p.evaluate(([tx, ty]) => { globalThis.__camLock = { x: (tx + 0.5) * 32, y: (ty + 0.5) * 32 }; }, [tx, ty]);
const seen = (p, name) => p.evaluate((n) => { const a = __inu.mp.actors(null).find((q) => q.name === n); return a ? { name: a.name, act: a.act?.kind || null, x: Math.round(a.x), y: Math.round(a.y) } : null; }, name);
const shot = (p, n) => p.screenshot({ path: `${OUT}/${n}` });
let fi = 0, fj = 0; const frame = (p) => p.screenshot({ path: `${G}/f-${String(fi++).padStart(3, '0')}.png` }), frame2 = (p) => p.screenshot({ path: `${G2}/f-${String(fj++).padStart(3, '0')}.png` });

const A = await boot('A', 'Pup1001', 844, 390, true), B = await boot('B', 'Pup2002', 667, 375);
await place(A.p, 27, 22); await place(B.p, 30, 22); await lock(A.p, 28.5, 21.4); await lock(B.p, 28.5, 21.4); await A.p.waitForTimeout(1500);
res.mp = { A: await A.p.evaluate(() => ({ status: __inu.mp.status, count: __inu.mp.count })), B: await B.p.evaluate(() => ({ status: __inu.mp.status, count: __inu.mp.count })) };
// 1) open the wheel from the ☰ menu (touch phone, 844x390): Menu -> Fun -> Actions
await frame(A.p); await A.p.tap('#menu-btn'); await A.p.waitForTimeout(300); await frame(A.p); await shot(A.p, 'r3-1-menu-actions-844x390.png');
await A.p.tap('#btn-emote'); await A.p.waitForTimeout(350); for (let i = 0; i < 4; i++) { await frame(A.p); await A.p.waitForTimeout(120); }
await shot(A.p, 'r3-2-wheel-844x390.png');
res.wheel844 = await A.p.evaluate(() => [...document.querySelectorAll('#act-wheel button')].map((b) => { const r = b.getBoundingClientRect(); return [b.dataset.act || b.dataset.bub || 'close', Math.round(r.width), Math.round(r.top), Math.round(r.bottom)]; }));
// pick Spin Hop by tapping it; A dances; B (667x375, other browser) sees it
await A.p.tap('#act-wheel [data-act="dance2"]'); await A.p.waitForTimeout(120);
for (let i = 0; i < 14; i++) { await frame(A.p); await frame2(B.p); await A.p.waitForTimeout(90); }
res.B_sees_A = await seen(B.p, 'Pup1001'); await shot(B.p, 'r3-3-B-sees-A-spin-hop-667x375.png');
// 2) B opens the wheel with G (desktop hotkey) at 667x375 and picks Paw Shuffle with the 3 key; A sees it
await B.p.keyboard.press('g'); await B.p.waitForTimeout(300); await shot(B.p, 'r3-4-wheel-G-667x375.png');
res.wheel667 = await B.p.evaluate(() => [...document.querySelectorAll('#act-wheel button')].map((b) => { const r = b.getBoundingClientRect(); return [b.dataset.act || b.dataset.bub || 'close', Math.round(r.width), Math.round(r.top), Math.round(r.bottom)]; }));
for (let i = 0; i < 3; i++) await frame2(B.p);
await B.p.keyboard.press('3'); await B.p.waitForTimeout(400);
for (let i = 0; i < 12; i++) { await frame2(A.p); await frame(A.p); await A.p.waitForTimeout(90); }
res.A_sees_B = await seen(A.p, 'Pup2002'); await shot(A.p, 'r3-5-A-sees-B-paw-shuffle-844x390.png');
// both dancing together: A Tail Twist via the multiplayer chip popover
await A.p.tap('#mp-chip'); await A.p.waitForTimeout(250); await shot(A.p, 'r3-6-mp-popover-actions.png'); await A.p.tap('#mp-act'); await A.p.waitForTimeout(250); await A.p.tap('#act-wheel [data-act="dance3"]'); await A.p.waitForTimeout(500);
for (let i = 0; i < 10; i++) { await frame2(B.p); await B.p.waitForTimeout(90); }
res.B_sees_A_tailtwist = await seen(B.p, 'Pup1001'); await shot(B.p, 'r3-7-both-dancing-B-view.png');
// 3) moving cancels: A walks -> B sees A standing/walking again
await A.p.evaluate(() => { __inu.act.act && 0; }); await A.p.keyboard.down('ArrowRight'); await A.p.waitForTimeout(500); await A.p.keyboard.up('ArrowRight'); await B.p.waitForTimeout(400);
res.moveCancels = { A_local: await A.p.evaluate(() => __inu.act.act), B_sees_A: await seen(B.p, 'Pup1001') };
// 4) every action + bubble, posed on the normal renderer (A, 844x390)
await place(A.p, 28, 25); await lock(A.p, 28.5, 24); await A.p.waitForTimeout(300);
const gallery = {}; for (const k of ['sit', 'lie', 'wave', 'wag', 'sleep', 'bow']) { await A.p.evaluate((k) => { __inu.act.act = null; __inu.doAction(k); }, k); await A.p.waitForTimeout(k === 'bow' ? 500 : 700); await shot(A.p, `r3-8-pose-${k}.png`); gallery[k] = await seen(B.p, 'Pup1001'); }
res.gallery_seen_by_B = gallery;
await A.p.evaluate(() => { __inu.act.act = null; }); await A.p.tap('#menu-btn'); await A.p.tap('#btn-emote'); await A.p.waitForTimeout(200); await A.p.tap('#act-wheel [data-bub="heart"]'); await A.p.waitForTimeout(500); await shot(B.p, 'r3-9-bubble-heart-B-view.png');
// 5) long idle: auto-sit then doze (fast-forward the idle clock instead of waiting a minute)
await A.p.evaluate(() => { __inu.act.act = null; __inu.act.still = 24.5; }); await A.p.waitForTimeout(800); res.idleSit = await A.p.evaluate(() => __inu.act.act && { kind: __inu.act.act.kind, auto: __inu.act.act.auto }); await shot(A.p, 'r3-10-idle-autosit.png');
await A.p.evaluate(() => { __inu.act.still = 54.5; }); await A.p.waitForTimeout(1200); res.idleDoze = await A.p.evaluate(() => __inu.act.act && { kind: __inu.act.act.kind, auto: __inu.act.act.auto }); res.B_sees_doze = await seen(B.p, 'Pup1001'); await shot(A.p, 'r3-11-idle-doze.png');
// 6) inside a room and a zone: both walk into the same scene, A dances, B sees it
for (const [sc, tag] of [['cafe', 'room-cafe'], ['park', 'zone-park']]) {
  for (const c of [A, B]) await c.p.evaluate((s) => { __inu.act.act = null; globalThis.__goScene(s); }, sc);
  await A.p.waitForTimeout(2500); await A.p.evaluate(() => { const r = __room(); __roomWalk(r.tx + 1, r.ty); }); await A.p.waitForTimeout(1200);
  await A.p.evaluate(() => __inu.doAction('dance2')); await A.p.waitForTimeout(700);
  res[tag] = { A_room: await A.p.evaluate(() => __room()?.id), B_mp: await B.p.evaluate(() => ({ status: __inu.mp.status, room: __inu.mp.S.room })), B_sees_A: await seen(B.p, 'Pup1001') };
  if (tag === 'zone-park') for (let i = 0; i < 10; i++) { await frame2(B.p); await B.p.waitForTimeout(90); }
  await shot(B.p, `r3-12-${tag}-B-sees-A-dance.png`); await shot(A.p, `r3-12-${tag}-A-view.png`); }
res.errors = errs; fs.writeFileSync(`${OUT}/r3-results.json`, JSON.stringify(res, null, 1));
const gif = (dir, out, scale) => { try { execSync(`ffmpeg -y -loglevel error -framerate 8 -i ${dir}/f-%03d.png -vf "scale=${scale}:-1:flags=neighbor,split[a][b];[a]palettegen=max_colors=160[p];[b][p]paletteuse" ${out}`); } catch (e) { console.log('gif failed', e.message); } };
gif(G, `${OUT}/r3-wheel.gif`, 640); gif(G2, `${OUT}/r3-dance-seen-by-second-player.gif`, 600);
console.log(JSON.stringify(res, null, 1)); await b.close();

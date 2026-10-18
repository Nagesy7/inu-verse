// Live multiplayer proof: 3 headless clients in the same 'city' room via a local worker (wrangler dev on :8787),
// seeing each other move (interpolated), chat and emote; then the server is unreachable -> solo play, no errors.
//   (cd realtime && npx wrangler dev --port 8787) ; python3 -m http.server 8643 ; URL=http://127.0.0.1:8643/ node scripts/mp-proof.mjs
import { chromium } from 'playwright'; import fs from 'fs'; import { execSync } from 'child_process';
const URL = process.env.URL || 'http://127.0.0.1:8643/', MPU = process.env.MP || 'ws://127.0.0.1:8787', OUT = process.env.OUT || 'proof', G = '/tmp/mpgif';
fs.rmSync(G, { recursive: true, force: true }); fs.mkdirSync(G, { recursive: true }); fs.mkdirSync(OUT, { recursive: true });
const res = {}, errs = [];
// testing the LIVE https site against a LOCAL worker: Chrome's Local Network Access check blocks public->localhost sockets, so lift it for this test browser only
const b = await chromium.launch(/^https:/.test(URL) && /127\.0\.0\.1|localhost/.test(MPU) ? { args: ['--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests'] } : {});
async function boot(tag, guest, w = 844, h = 390, mp = MPU) { const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 }); const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(`${tag} pageerror ${e.message}`)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::|kibble-pay|dexscreener|api\/coins|WebSocket connection/i.test(m.text())) errs.push(`${tag} ${m.text()}`); });
  await p.goto(URL + '?mp=' + encodeURIComponent(mp)); await p.evaluate((g) => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); localStorage.setItem('inuverse.mp.guest', g); }, guest);
  await p.reload(); await p.waitForTimeout(900); await p.click('#start'); await p.waitForTimeout(2200);
  await p.evaluate(() => { globalThis.__guide?.endTour?.('skipped'); __inu.setHour(11); globalThis.__noNav = true; }); return { ctx, p, tag }; }
const place = (p, tx, ty) => p.evaluate(([tx, ty]) => { const s = __inu.state; s.player.x = (tx + 0.5) * 32; s.player.y = (ty + 0.5) * 32; }, [tx, ty]);
const lock = (p, tx, ty) => p.evaluate(([tx, ty]) => { globalThis.__camLock = { x: (tx + 0.5) * 32, y: (ty + 0.5) * 32 }; }, [tx, ty]);
const mp = (p) => p.evaluate(() => ({ status: __inu.mp.status, count: __inu.mp.count, players: __inu.mp.players().map((x) => x.name), chip: document.getElementById('mp-chip')?.textContent, drawn: __inu.mp.actors({ x0: -1e9, y0: -1e9, x1: 1e9, y1: 1e9 }, __inu.state.player).map((a) => [a.name, Math.round(a.x), Math.round(a.y), a.face, a.moving]) }));
const A = await boot('A', 'Pup1001'), B = await boot('B', 'Pup2002'), C = await boot('C', 'Pup3003');
for (const [c, dx] of [[A, 0], [B, 3], [C, 6]]) { await place(c.p, 26 + dx, 22); await lock(c.p, 29.5, 20.6); }
await A.p.waitForTimeout(1200);
res.seen = { A: await mp(A.p), B: await mp(B.p), C: await mp(C.p) };
await B.p.screenshot({ path: `${OUT}/mp-1-three-players.png` });
// A walks right (keyboard), B watches: record frames from B
await A.p.keyboard.down('ArrowRight'); for (let i = 0; i < 10; i++) { await B.p.screenshot({ path: `${G}/f-${String(i).padStart(3, '0')}.png` }); await B.p.waitForTimeout(80); }
await A.p.keyboard.up('ArrowRight'); await A.p.keyboard.down('ArrowLeft'); for (let i = 10; i < 20; i++) { await B.p.screenshot({ path: `${G}/f-${String(i).padStart(3, '0')}.png` }); await B.p.waitForTimeout(80); }
await A.p.keyboard.up('ArrowLeft'); await A.p.evaluate(() => { __inu.state.player.x = 26.5 * 32; });
// interpolation smoothness: sample A's drawn position on B every frame for 1 s while A walks
await A.p.keyboard.down('ArrowRight');
res.interp = await B.p.evaluate(async () => { const xs = []; for (let i = 0; i < 40; i++) { await new Promise(requestAnimationFrame); const a = __inu.mp.actors(null).find((q) => q.name === 'Pup1001'); if (a) xs.push(a.x); }
  const d = xs.slice(1).map((x, i) => +(x - xs[i]).toFixed(2)); return { samples: xs.length, maxStep: Math.max(...d.map(Math.abs)), distinctPositions: new Set(xs).size, steps: d.slice(0, 12) }; });
await A.p.keyboard.up('ArrowRight');
// chat + emotes (A types via the chip popover, C emotes)
await A.p.click('#mp-chip'); await A.p.fill('#mp-say', 'Hi pups! Race you to the cafe www.spam.xyz'); await A.p.keyboard.press('Enter');
await B.p.evaluate(() => __inu.mp.chat('Woof! Love the hat')); await C.p.waitForTimeout(250); await C.p.evaluate(() => __inu.emote('heart')); await B.p.waitForTimeout(350);
for (let i = 20; i < 34; i++) { await B.p.screenshot({ path: `${G}/f-${String(i).padStart(3, '0')}.png` }); await B.p.waitForTimeout(90); }
await B.p.screenshot({ path: `${OUT}/mp-2-chat-B-view.png` }); await C.p.screenshot({ path: `${OUT}/mp-3-chat-C-view.png` });
await A.p.screenshot({ path: `${OUT}/mp-4-popover-A.png` });
res.chatBlocked = await A.p.evaluate(() => { return [__inu.mp.chat('my seed: abandon ability able about above absent absorb abstract absurd abuse access accident'), __inu.mp.chat('send BzLYTFAfUsjzQ5x8bx5BbPK4DFtaHrLCuferkvkxTNGJ')]; });
// mute: C mutes A, A chats again (after the 2 s limit) -> C shows no bubble from A
await C.p.evaluate(() => __inu.mp.toggleMute('Pup1001')); await A.p.waitForTimeout(2100); await A.p.evaluate(() => __inu.mp.chat('can you hear me?')); await C.p.waitForTimeout(400);
const bub = (p) => p.evaluate(async () => { const ch = await import('/src/chat.js'); const ids = new Map(__inu.mp.players().map((q) => ['mp:' + q.id, q.name])); return ch.bubbles().filter((x) => x.text === 'can you hear me?').map((x) => ids.get(x.id) || x.id); });
res.mute = { C_muted_A_sees: await bub(C.p), B_not_muted_sees: await bub(B.p), C_muteList: await C.p.evaluate(() => __inu.mp.players().filter((q) => q.muted).map((q) => q.name)) };
// graceful offline: kill the local worker -> every client drops to solo with no page errors and keeps playing
execSync("pkill -f '[w]rangler dev'; pkill -f '[w]orkerd'; true"); await A.p.waitForTimeout(2500);
const bx0 = await B.p.evaluate(() => __inu.state.player.x); await B.p.keyboard.down('ArrowLeft'); await B.p.waitForTimeout(500); await B.p.keyboard.up('ArrowLeft');
res.offline = { A: await mp(A.p), B: await mp(B.p), C: await mp(C.p), BstillMoves: (await B.p.evaluate(() => __inu.state.player.x)) < bx0, mode: await B.p.evaluate(() => __inu.mode) };
await B.p.screenshot({ path: `${OUT}/mp-5-offline-solo.png` });
// never-configured + unreachable from the start
const D = await boot('D-off', 'Pup4004', 844, 390, 'off'); res.noConfig = { ...(await D.p.evaluate(() => ({ enabled: __inu.mp.enabled, chip: !!document.getElementById('mp-chip') && !document.getElementById('mp-chip').hidden }))) };
const E = await boot('E-dead', 'Pup5005', 844, 390, 'ws://127.0.0.1:9'); await E.p.waitForTimeout(1500); res.deadServer = await mp(E.p);
res.errors = errs; fs.writeFileSync(`${OUT}/mp-results.json`, JSON.stringify(res, null, 1));
try { execSync(`ffmpeg -y -loglevel error -framerate 9 -i ${G}/f-%03d.png -vf "scale=640:-1:flags=neighbor,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse" ${OUT}/mp-walk-chat.gif`); } catch (e) { console.log('gif failed', e.message); }
console.log(JSON.stringify(res, null, 1)); await b.close();

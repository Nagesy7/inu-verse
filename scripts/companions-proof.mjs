// LOCAL proof for Inu Quest companions (no deploy). Two headless clients + a local realtime worker:
//   python3 -m http.server 8721 ; (cd realtime && npx wrangler dev --port 8787) ; node scripts/companions-proof.mjs
// The profile comes from the sample fixture (?companions=fixture, localhost-only). Sprite CORS is production-only, so for the
// "prod sprites" shots this TEST browser proxies https://inu-quest.vercel.app/companions/v1/*.png and adds ACAO for the local
// origin (labelled 'prodsprites'); the 'fallback' shots load them for real and show the graceful fallback pup.
import { chromium } from 'playwright'; import fs from 'fs';
const URL = process.env.URL || 'http://127.0.0.1:8721/', MPU = process.env.MP || 'ws://127.0.0.1:8787', OUT = process.env.OUT || 'proof', P = 'companions-local';
fs.mkdirSync(OUT, { recursive: true }); const res = { label: 'LOCAL dev server + local wrangler worker; profile = sample fixture; not the live site', at: new Date().toString(), sizes: {} }, errs = [];
const b = await chromium.launch();
async function boot(tag, { w, h, fixture = 'fixture', proxy = true, guest = 'Pup1001', mp = true }) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true }); const p = await ctx.newPage(); const sprites = [];
  if (proxy) await ctx.route('https://inu-quest.vercel.app/companions/v1/**/*.png', async (r) => { const resp = await r.fetch(); sprites.push(r.request().url()); await r.fulfill({ response: resp, headers: { ...resp.headers(), 'access-control-allow-origin': '*' } }); });
  p.on('pageerror', (e) => errs.push(`${tag} pageerror ${e.message}`)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::|kibble-pay|dexscreener|api\/coins|WebSocket connection|CORS|inu-quest/i.test(m.text())) errs.push(`${tag} ${m.text()}`); });
  const q = `?companions=${fixture}` + (mp ? '&mp=' + encodeURIComponent(MPU) : '');
  await p.goto(URL + q); await p.evaluate((g) => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); localStorage.setItem('inuverse.mp.guest', g); }, guest);
  await p.reload(); await p.waitForTimeout(900); await p.click('#start'); await p.waitForTimeout(2200);
  await p.evaluate(() => { globalThis.__guide?.endTour?.('skipped'); __inu.setHour(11); __inu.setRain(0); globalThis.__noNav = true; }); return { ctx, p, tag, sprites }; }
const place = (p, tx, ty) => p.evaluate(([tx, ty]) => { const s = __inu.state; s.player.x = (tx + 0.5) * 32; s.player.y = (ty + 0.5) * 32; }, [tx, ty]);
const lock = (p, x, y) => p.evaluate(([x, y]) => { globalThis.__camLock = x == null ? null : { x: (x + 0.5) * 32, y: (y + 0.5) * 32 }; }, [x, y]);
const cmp = (p) => p.evaluate(() => { const F = __cmp.F, pl = __inu.state.player; return { status: __cmp.status, on: !!F.c, id: F.c?.id, name: F.c?.name, x: Math.round(F.x), y: Math.round(F.y), gap: Math.round(Math.hypot(F.x - pl.x, F.y - pl.y)), react: F.react, face: F.face, moving: F.moving, choice: __inu.state.companion, remotes: [...__cmp.remotes.entries()].map(([k, R]) => ({ k, id: R.c?.id, x: Math.round(R.x), y: Math.round(R.y), react: R.react })) }; });
const walk = async (p, key, ms) => { await p.keyboard.down(key); await p.waitForTimeout(ms); await p.keyboard.up(key); };
for (const [w, h] of [[844, 390], [667, 375]]) { const S = (res.sizes[`${w}x${h}`] = {}), tag = `${w}x${h}`;
  // 1) picker with the party (prod sprites, proxied in the test browser)
  const A = await boot('A' + tag, { w, h, guest: 'Pup1001' }); await place(A.p, 26, 22); await lock(A.p, 27, 21);
  await A.p.evaluate(() => __inu.open('companions')); await A.p.waitForTimeout(1500); S.picker = await A.p.evaluate(() => ({ cards: [...document.querySelectorAll('.cp-card')].map((c) => ({ id: c.dataset.cp, locked: c.disabled, text: c.innerText.replace(/\s+/g, ' ') })), toggle: document.getElementById('cp-toggle')?.textContent }));
  await A.p.screenshot({ path: `${OUT}/${P}-1-picker-prodsprites-${tag}.png` });
  await A.p.click('.cp-card[data-cp="inu:0"]'); await A.p.waitForTimeout(500); await A.p.screenshot({ path: `${OUT}/${P}-2-picker-chosen-${tag}.png` });
  await A.p.evaluate(() => document.querySelector('#panel .close, #panel-close, [data-close]')?.click()); await A.p.keyboard.press('Escape'); await A.p.waitForTimeout(400);
  // 2) follow: walk right then down; sample the gap every frame
  await lock(A.p, null); await walk(A.p, 'ArrowRight', 1100); S.followAfterWalk = await cmp(A.p);
  S.track = await A.p.evaluate(async () => { const out = []; for (let i = 0; i < 30; i++) { await new Promise(requestAnimationFrame); const F = __cmp.F, pl = __inu.state.player; out.push([Math.round(F.x), Math.round(F.y), Math.round(Math.hypot(F.x - pl.x, F.y - pl.y))]); } return out; });
  await A.p.keyboard.down('ArrowRight'); await A.p.waitForTimeout(500); await A.p.screenshot({ path: `${OUT}/${P}-3-follow-${tag}.png` }); await A.p.keyboard.up('ArrowRight'); await A.p.waitForTimeout(800); S.followSettled = await cmp(A.p);
  // 3) reactions: pond edge (water), café door, rain
  await place(A.p, 38, 34); await A.p.waitForTimeout(300); await walk(A.p, 'ArrowRight', 700); await A.p.waitForTimeout(500); S.water = await cmp(A.p); await A.p.screenshot({ path: `${OUT}/${P}-4-reaction-water-${tag}.png` });
  await place(A.p, 4, 19); await A.p.waitForTimeout(6500); S.cafe = await cmp(A.p); await A.p.screenshot({ path: `${OUT}/${P}-5-reaction-cafe-${tag}.png` });
  await place(A.p, 26, 22); await A.p.evaluate(() => __inu.setRain(1)); await A.p.waitForTimeout(6800); S.rain = await cmp(A.p); await A.p.screenshot({ path: `${OUT}/${P}-6-reaction-rain-${tag}.png` }); await A.p.evaluate(() => __inu.setRain(0));
  // 4) second client: B has beaten Wren and summons Biscuit; both stand together in the square
  const B = await boot('B' + tag, { w, h, guest: 'Pup2002', fixture: 'fixture-wren' }); await B.p.evaluate(() => __inu.open('companions')); await B.p.waitForTimeout(1200);
  await B.p.screenshot({ path: `${OUT}/${P}-7-picker-wren-beaten-${tag}.png` }); await B.p.click('.cp-card[data-cp="biscuit"]'); await B.p.keyboard.press('Escape');
  await place(A.p, 26, 22); await place(B.p, 29, 22); await lock(A.p, 27.5, 21.4); await lock(B.p, 27.5, 21.4); await A.p.waitForTimeout(6500); // looks go out at most every 5 s
  await walk(A.p, 'ArrowLeft', 500); await A.p.waitForTimeout(900);
  S.sync = { A: await cmp(A.p), B: await cmp(B.p), mpA: await A.p.evaluate(() => ({ status: __inu.mp.status, count: __inu.mp.count })) };
  S.sync.remoteOffsetOnB = await B.p.evaluate(() => __inu.mp.actors(null).filter((a) => a.cp).map((a) => ({ name: a.name, cp: a.cp.id, form: a.cp.form?.id || null, cpOff: a.cpOff })));
  S.sync.remoteOffsetOnA = await A.p.evaluate(() => __inu.mp.actors(null).filter((a) => a.cp).map((a) => ({ name: a.name, cp: a.cp.id, cpOff: a.cpOff })));
  await A.p.screenshot({ path: `${OUT}/${P}-8-sync-A-view-${tag}.png` }); await B.p.screenshot({ path: `${OUT}/${P}-9-sync-B-view-${tag}.png` });
  // persisted only in the Verse save
  S.saved = await A.p.evaluate(() => { const keys = Object.keys(localStorage); return { keys, companion: JSON.parse(localStorage.getItem('inuverse.save.v1') || '{}').companion || null }; });
  await A.ctx.close(); await B.ctx.close();
  // 5) no profile (signed out / no party) + 6) fallback pup when sprites cannot load (real local CORS)
  const N = await boot('N' + tag, { w, h, fixture: 'none', mp: false }); await N.p.evaluate(() => __inu.open('companions')); await N.p.waitForTimeout(600);
  S.noProfile = await N.p.evaluate(() => ({ text: document.querySelector('.cp-empty')?.innerText, follower: !!__cmp.F.c, status: __cmp.status })); await N.p.screenshot({ path: `${OUT}/${P}-10-no-profile-${tag}.png` }); await N.ctx.close();
  const F = await boot('F' + tag, { w, h, proxy: false, mp: false }); await F.p.evaluate(() => { __inu.state.companion = { on: true, id: 'inu:1', line: null }; }); await place(F.p, 26, 22); await lock(F.p, 26, 21.5);
  await walk(F.p, 'ArrowLeft', 400); await F.p.waitForTimeout(900); S.fallback = await cmp(F.p); await F.p.screenshot({ path: `${OUT}/${P}-11-fallback-sprite-${tag}.png` }); await F.ctx.close();
  S.proxiedSprites = [...new Set(A.sprites.concat(B.sprites))]; }
res.errors = errs; fs.writeFileSync(`${OUT}/${P}-results.json`, JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1)); await b.close();

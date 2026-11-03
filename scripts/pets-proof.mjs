// Pets proof at 844x390: free starter claim (Pawsome Pets panel), gear, follow, idle nap, emote reactions, and a second
// player seeing your pet (two browser contexts on the same live multiplayer room). URL=<site> OUT=proof node scripts/pets-proof.mjs
import { chromium } from 'playwright'; import fs from 'fs';
const URL = process.env.URL || 'https://inu-verse-tawny.vercel.app/', OUT = process.env.OUT || 'proof', TAG = process.env.TAG || 'feat-pets', Q = process.env.Q || '';
fs.mkdirSync(OUT, { recursive: true }); const errs = [], info = {};
const b = await chromium.launch();
async function open(name, tod = 'day', q2 = '') { const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true }); const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(`${name} pageerror ${e.message}`));
  await p.goto(URL + `?tod=${tod}&wx=clear${Q}${q2}`); await p.evaluate((n) => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); }, name);
  await p.reload(); await p.waitForTimeout(1500); await p.click('#start'); await p.waitForTimeout(2500);
  await p.addStyleTag({ content: '#ev-banner,#crier-banner,.toast,.guide-card,#tour,#prompt,#alive-feed,#feed{visibility:hidden!important}' });
  await p.evaluate((n) => { globalThis.__guide?.endTour?.('skipped'); globalThis.__noNav = true; __inu.state.player.name = n; }, name); return { ctx, p }; }
const shot = (p, n) => p.screenshot({ path: `${OUT}/${TAG}-${n}.png` });
const spot = (p, x, y, z = 2) => p.evaluate(([x, y, z]) => { __inu.setZoom(z); const st = __inu.state; st.player.x = x * 32; st.player.y = y * 32; delete globalThis.__camLock; }, [x, y, z]);
const A = await open('Pippa');
await A.p.evaluate(() => { __inu.state.bones = 500; __inu.open('pets'); }); await A.p.waitForTimeout(700); await shot(A.p, 'shop-starter');
await A.p.fill('#petname', 'Quackers').catch(() => {}); await A.p.click('[data-starter]'); await A.p.waitForTimeout(400);
await A.p.evaluate(() => document.querySelector('#petgear')?.scrollIntoView()); await A.p.waitForTimeout(300);
await A.p.click('[data-gearbuy="cr"]'); await A.p.waitForTimeout(300); await A.p.click('[data-gearbuy="hp"]').catch(() => {}); await A.p.waitForTimeout(400); await shot(A.p, 'shop-gear');
info.pets = await A.p.evaluate(() => ({ bones: __inu.state.bones, pets: __inu.state.pets }));
await A.p.evaluate(() => document.querySelector('#panel .close, [data-close], #panel-close')?.click()); await A.p.keyboard.press('Escape'); await A.p.waitForTimeout(300);
await spot(A.p, 34, 67); await A.p.waitForTimeout(1200);
for (let i = 0; i < 12; i++) { await A.p.evaluate((i) => { const st = __inu.state; st.player.x += 6; }, i); await A.p.waitForTimeout(60); } await A.p.waitForTimeout(150); await shot(A.p, 'follow');
await A.p.evaluate(() => (__inu.emote ? __inu.emote('heart') : __inu.emo.emote('heart'))); await A.p.waitForTimeout(500); await shot(A.p, 'react-heart');
await A.p.waitForTimeout(2500); await A.p.evaluate(() => __inu.emo.action('dance')); await A.p.waitForTimeout(450); await shot(A.p, 'react-dance');
await A.p.evaluate(() => __inu.emo.action('dance')); await A.p.evaluate(() => { const f = __inu.pet.f; f.react = null; f.still = 20; }); await A.p.waitForTimeout(600); await shot(A.p, 'idle-nap');
info.perf = await A.p.evaluate(() => new Promise((res) => { const ts = []; let last = performance.now(); const f = (n) => { ts.push(n - last); last = n; if (ts.length < 120) requestAnimationFrame(f); else { ts.sort((a, b) => a - b); res({ p50: ts[60].toFixed(1), p95: ts[114].toFixed(1) }); } }; requestAnimationFrame(f); }));
// second player sees Pippa's pet (multiplayer cosmetic field)
const B = await open('Bram'); await spot(B.p, 34, 67); await A.p.evaluate(() => { const st = __inu.state; st.player.x = 33 * 32; st.player.y = 66 * 32; });
let seen = null; for (let i = 0; i < 14 && !seen; i++) { await B.p.waitForTimeout(1000); seen = await B.p.evaluate(() => { const r = [...__inu.pet.remote.values()]; return r.length ? r.length : null; }); }
info.remoteSeen = seen; await B.p.waitForTimeout(800); await shot(B.p, 'remote-view');
await A.ctx.close(); await B.ctx.close();
// reduced effects + night
const L = await open('Lowfx', 'night', '&fx=low'); await L.p.evaluate(() => { __inu.state.bones = 100; __inu.open('pets'); }); await L.p.waitForTimeout(500); await L.p.click('[data-starter]'); await L.p.keyboard.press('Escape');
await spot(L.p, 34, 67); await L.p.waitForTimeout(1200); await L.p.evaluate(() => __inu.emo.action('dance')); await L.p.waitForTimeout(400); await shot(L.p, 'night-lowfx'); await L.ctx.close();
console.log(JSON.stringify({ errs, info }, null, 1)); await b.close();

// Live HUD-layout proof at phone landscape (844x390): interact prompt vs town-news ticker, toasts, crier banner, stick and A pad.
// URL=https://inu-verse-tawny.vercel.app/ OUT=/workspace/inu-verse/proof node scripts/hudfix-proof.mjs
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const URL = process.env.URL || 'http://127.0.0.1:8792/', OUT = process.env.OUT || '/tmp/hudproof', W = +(process.env.W || 844), H = +(process.env.H || 390);
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true }); const p = await ctx.newPage();
await p.goto(URL + '?tod=day&wx=clear'); await p.evaluate(() => localStorage.setItem('inuverse.tour.v1', 'skipped')); await p.reload(); await p.waitForTimeout(1500); await p.click('#start'); await p.waitForTimeout(3500);
await p.evaluate(async () => { globalThis.__guide?.endTour?.('skipped'); document.querySelectorAll('#toast .toast,#tour,#obcard').forEach((t) => t.remove()); document.getElementById('crier-banner')?.classList.remove('show');
  const Wd = await import('/src/world.js'), s = __inu.state; const it = Wd.interactables(s).find((q) => q.kind === 'square'); s.player.x = (it.tx + .5) * 32; s.player.y = (it.ty + 1.2) * 32; });
await p.waitForTimeout(900);
const rects = () => p.evaluate(() => { const o = {}; for (const s of ['#hud', '#prompt', '#feed-tick', '#feed-tick .ft-list', '#toast', '#crier-banner', '#stick', '#btn-a', '#tbtns', '#inu-wallet', '#menu-btn']) { const e = document.querySelector(s); if (!e || e.hidden || getComputedStyle(e).display === 'none' || (s === '#crier-banner' && !e.classList.contains('show'))) continue; const q = e.getBoundingClientRect(); if (q.width && q.height) o[s] = [q.left, q.top, q.right, q.bottom].map(Math.round); } return o; });
const hit = (a, c) => a && c && a[0] < c[2] && c[0] < a[2] && a[1] < c[3] && c[1] < a[3];
const checks = [], ok = (name, v) => { checks.push({ name, pass: !!v }); console.log((v ? 'PASS ' : 'FAIL ') + name); };
const scenes = {};
// A: prompt + live ticker (collapsed line), then with the news list opened
let r = scenes.ticker = await rects();
ok('prompt visible', r['#prompt']); ok('town-news ticker visible (live feed)', r['#feed-tick']);
ok('ticker does not cover prompt', !hit(r['#feed-tick'], r['#prompt'])); ok('ticker below HUD row', r['#feed-tick'] && r['#feed-tick'][1] >= r['#hud'][3]);
await p.screenshot({ path: OUT + '/feat-hudfix-prompt-ticker.png' });
await p.evaluate(() => document.querySelector('#feed-tick .ft-line')?.closest('.ft-row')?.click()); await p.waitForTimeout(400);
r = scenes.tickerOpen = await rects();
ok('open news list clear of prompt', !hit(r['#feed-tick'], r['#prompt'])); ok('open news list clear of joystick', !hit(r['#feed-tick'], r['#stick']));
await p.screenshot({ path: OUT + '/feat-hudfix-ticker-open.png' });
await p.evaluate(() => document.querySelector('#feed-tick .ft-list')?.click()); await p.waitForTimeout(300);
// B: three toasts at once
await p.evaluate(() => { const t = document.getElementById('toast'); for (const m of ['Jacaranda Bloom Party is on! Find the Party Booth east of the avenue, or Menu → Club → Party & Pins.', 'Bought a thing for 20 bones', 'Caught a GOLDEN KOI!']) { const d = document.createElement('div'); d.className = 'toast good'; d.textContent = m; t.appendChild(d); } });
await p.waitForTimeout(400);
r = scenes.toasts = await rects();
ok('toasts do not sit on prompt', !hit(r['#toast'], r['#prompt'])); ok('toasts clear of ticker', !hit(r['#toast'], r['#feed-tick']));
for (const k of ['#stick', '#btn-a', '#tbtns', '#inu-wallet', '#hud']) ok('toasts clear of ' + k, !hit(r['#toast'], r[k]));
await p.screenshot({ path: OUT + '/feat-hudfix-toasts.png' });
// C: town-crier banner while toasts are up
await p.evaluate(() => { const c = document.getElementById('crier-banner'); if (c) { if (!c.textContent.trim()) c.innerHTML = '<b>CRIER</b> <span>Hear ye! A quiet, steady day in the Verse.</span>'; c.classList.add('show'); } });
await p.waitForTimeout(500);
r = scenes.crier = await rects();
ok('crier banner clear of prompt', !hit(r['#crier-banner'], r['#prompt'])); ok('toasts step below crier', !hit(r['#toast'], r['#crier-banner'])); ok('toasts still clear of stick/A', !hit(r['#toast'], r['#stick']) && !hit(r['#toast'], r['#btn-a']));
await p.screenshot({ path: OUT + '/feat-hudfix-crier.png' });
const pass = checks.filter((c) => c.pass).length; console.log(`${pass}/${checks.length} checks`);
writeFileSync(OUT + '/feat-hudfix-proof.json', JSON.stringify({ url: URL, viewport: [W, H], at: new Date().toISOString(), checks, scenes }, null, 1));
await b.close(); process.exit(pass === checks.length ? 0 : 1);

// Proof for "alive" phase 4 (area music + ambient beds) at phone landscape 844x390. Audio can't be screenshotted, so every
// shot runs with ?audiodebug=1: the on-screen readout (and the JSON log) shows the active track, crossfade mix and beds.
// URL=https://inu-verse-tawny.vercel.app/ OUT=proof node scripts/alive-p4-proof.mjs   (default: local static server)
import { chromium } from 'playwright'; import fs from 'fs';
const BASE = process.env.URL || 'http://127.0.0.1:8642/', OUT = process.env.OUT || 'proof', P = process.env.PREFIX || 'alive-p4';
fs.mkdirSync(OUT, { recursive: true }); const errs = [], log = {};
const quiet = /Failed to load resource|net::|kibble-pay|dexscreener|api\/|WebSocket|favicon|status of 404|insights/i;
// [name, query, tile, extra]
const SHOTS = [
  ['toggle', '?tod=day&wx=clear', [32, 61], 'pop'],
  ['plaza', '?tod=day&wx=clear', [32, 61.5]],
  ['market', '?tod=day&wx=clear', [18, 19.5]],
  ['arcade', '?tod=day&wx=clear', [59, 58]],
  ['park', '?tod=day&wx=clear', [41, 33]],
  ['night', '?tod=night&wx=clear', [32, 61.5]],
  ['rain', '?tod=day&wx=rain', [41, 33]],
  ['crossfade', '?tod=day&wx=clear', [32, 61.5], 'xfade'],
  ['lowfx', '?tod=day&wx=clear&fx=low', [32, 61.5]],
  ['muted-persisted', '?tod=day&wx=clear', [32, 61.5], 'mute'],
];
const b = await chromium.launch({ args: ['--autoplay-policy=user-gesture-required'] });
const go = (p, [tx, ty]) => p.evaluate(([tx, ty]) => { const s = __inu.state; s.player.x = tx * 32; s.player.y = ty * 32; }, [tx, ty]);
const dbg = (p) => p.evaluate(() => __inu.audio.debug());
for (const [name, q, tile, extra] of SHOTS) {
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true }), p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(`${name} pageerror ${e.message}`)); p.on('console', (m) => { if (m.type() === 'error' && !quiet.test(m.text())) errs.push(`${name} ${m.text().slice(0, 160)}`); });
  await p.goto(BASE + q + '&audiodebug=1'); await p.evaluate(() => { localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); }); await p.reload(); await p.waitForTimeout(1200);
  const before = await dbg(p); await p.click('#start'); await p.waitForTimeout(2500);
  await p.evaluate(() => { globalThis.__guide?.endTour?.('skipped'); globalThis.__guide?.clearGuide?.(); document.querySelectorAll('#toast .toast,.toast,.guide-card,#tour').forEach((t) => t.remove()); });
  await go(p, tile); await p.waitForTimeout(3600); // area hold (0.9 s) + crossfade (2.4 s) settle
  const entry = { beforeGesture: before.ctx };
  if (extra === 'xfade') { await go(p, [59, 58]); await p.waitForTimeout(2200); entry.midFade = await dbg(p); }
  if (extra === 'pop') { await p.click('#btn-sound'); await p.waitForTimeout(400); const r = await p.evaluate(() => { const q = (id) => { const e = document.getElementById(id), r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round); };
    const hits = [...document.querySelectorAll('#hud > *, #inu-profile-badge, #inu-wallet-btn, #menu-btn')].filter((e) => e.id !== 'btn-sound' && e.getBoundingClientRect().width).filter((e) => { const a = document.getElementById('btn-sound').getBoundingClientRect(), c = e.getBoundingClientRect(); return a.left < c.right && a.right > c.left && a.top < c.bottom && a.bottom > c.top; }).map((e) => e.id || e.className);
    return { chip: q('btn-sound'), pop: q('sound-pop'), chipOverlaps: hits }; }); entry.ui = r; }
  if (extra === 'mute') { await p.click('#btn-sound'); await p.waitForTimeout(300); await p.click('#sp-mute'); await p.evaluate(() => { const i = document.querySelector('#sound-pop [data-vol=music]'); i.value = 40; i.dispatchEvent(new Event('input', { bubbles: true })); });
    entry.stored = await p.evaluate(() => localStorage.getItem('inuverse.audio.v1')); await p.reload(); await p.waitForTimeout(1200); await p.click('#start'); await p.waitForTimeout(2500); await go(p, tile); await p.waitForTimeout(1500);
    entry.afterReload = await p.evaluate(() => ({ settings: __inu.audio.settings(), chipTitle: document.getElementById('btn-sound').title, drawerBtn: document.getElementById('btn-mute')?.textContent })); }
  entry.audio = await dbg(p); log[name] = entry;
  await p.evaluate(() => document.querySelectorAll('#toast .toast,.toast,.guide-card,#tour').forEach((t) => t.remove()));
  await p.screenshot({ path: `${OUT}/${P}-${name}.png` }); await ctx.close(); }
await b.close();
console.log(JSON.stringify({ base: BASE, log, errs }, null, 1));

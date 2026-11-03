// Proof for "alive" phase 3 (wandering townsfolk) at phone landscape 844x390. Uses ?tod= / ?wx= / ?fx=low visual pins and
// __inu.folk.setSec() (debug: shifts only the local townsfolk clock) to stand at a moment when folk walk / sit / gather.
// URL=https://inu-verse-tawny.vercel.app/ node scripts/alive-p3-proof.mjs   (default: local static server)
import { chromium } from 'playwright'; import fs from 'fs';
const BASE = process.env.URL || 'http://127.0.0.1:8642/', OUT = process.env.OUT || 'proof', P = process.env.PREFIX || 'alive-p3';
fs.mkdirSync(OUT, { recursive: true }); const errs = [], log = {};
const quiet = /Failed to load resource|net::|kibble-pay|dexscreener|api\/|WebSocket|favicon|status of 404|insights/i;
const H = (h, m = 0) => h * 60 + m;
// [name, query, folk-second, focus folk, mode]
const SHOTS = [
  ['walking', '?tod=day&wx=clear', H(16, 40), ['Koko'], 'follow'],
  ['sitting', '?tod=day&wx=clear', H(14, 30), ['Ume', 'Haru'], 'still'],
  ['chatting', '?tod=day&wx=clear', H(14, 30), ['Sora', 'Koko', 'Fuku', 'Benji'], 'chat'],
  ['reacting', '?tod=day&wx=clear', H(16, 40), ['Koko'], 'react'],
  ['interact', '?tod=day&wx=clear', H(14, 40), ['Ume'], 'talk'],
  ['rain-umbrellas', '?tod=day&wx=rain', H(14, 30), ['Sora', 'Koko', 'Fuku', 'Benji'], 'chat'],
  ['night-stroll', '?tod=night&wx=clear', H(22, 40), ['Kiki'], 'follow'],
  ['lowfx', '?tod=day&wx=clear&fx=low', H(14, 30), ['Sora', 'Koko', 'Fuku', 'Benji'], 'still'],
];
const b = await chromium.launch();
for (const [name, q, sec, focus, mode] of SHOTS) {
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true }), p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(`${name} pageerror ${e.message}`)); p.on('console', (m) => { if (m.type() === 'error' && !quiet.test(m.text())) errs.push(`${name} ${m.text().slice(0, 160)}`); });
  await p.goto(BASE + q); await p.evaluate(() => { localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); }); await p.reload(); await p.waitForTimeout(1200);
  await p.click('#start'); await p.waitForTimeout(2500);
  const focusAt = (focus) => { const F = __inu.folk, s = F.sec(); let x = 0, y = 0; for (const n of focus) { const o = F.at(F.T.F.findIndex((q) => q.f.name === n), s); x += o.x; y += o.y; } return { x: x / focus.length, y: y / focus.length }; };
  await p.evaluate(([sec, focus, mode, fa]) => { const focusAt = eval(fa); globalThis.__guide?.endTour?.('skipped'); globalThis.__guide?.clearGuide?.(); __inu.folk.setSec(sec);
    const c = focusAt(focus), s = __inu.state; s.player.x = c.x + 420; s.player.y = c.y; globalThis.__camLock = { x: c.x, y: c.y - 10 };
    document.querySelectorAll('#toast .toast,.toast,.guide-card,#tour').forEach((t) => t.remove()); }, [sec, focus, mode, focusAt.toString()]);
  await p.waitForTimeout(1500);
  if (mode === 'react' || mode === 'talk') { await p.evaluate(([focus, fa]) => { const F = __inu.folk, i = F.T.F.findIndex((q) => q.f.name === focus[0]), o = focus[0] === 'Ume' ? F.at(i, F.sec()) : F.T.F[i].a, s = __inu.state;
      s.player.x = o.x + (focus[0] === 'Ume' ? 0 : 50); s.player.y = o.y + (focus[0] === 'Ume' ? 30 : 0); __inu.player.face = focus[0] === 'Ume' ? 'up' : 'left'; globalThis.__camLock = { x: o.x + 25, y: o.y - 20 }; }, [focus, focusAt.toString()]);
    await p.waitForTimeout(mode === 'talk' ? 900 : 500); }
  if (mode === 'talk') { await p.keyboard.press('e'); await p.waitForTimeout(900); }
  if (mode === 'chat') for (let k = 0; k < 12; k++) { const n = await p.evaluate(() => { const T = __inu.folk.T; T.chatT = 0; return T.F.filter((F) => F.bubbleUntil > __inu.time).length; }); if (n >= 2) break; await p.waitForTimeout(700); }
  if (mode === 'follow') await p.evaluate(([focus, fa]) => { const c = eval(fa)(focus); globalThis.__camLock = { x: c.x, y: c.y - 10 }; }, [focus, focusAt.toString()]);
  await p.evaluate(() => document.querySelectorAll('#toast .toast,.toast,.guide-card,#tour').forEach((t) => t.remove()));
  log[name] = await p.evaluate(() => { const T = __inu.folk.T, c = document.getElementById('clock');
    return { hud: c.dataset.wx + '/' + c.dataset.tod, rain: +__inu.amb.rain.toFixed(2), folkSec: Math.round(__inu.folk.sec()), onScreen: T.out.map((a) => `${a.folkName}:${T.F[a.folkIdx].p.doing}${a.act ? '/' + a.act.kind : ''}${a.umbrella ? '/umbrella' : ''}${a.emote ? '/wave' : ''}`),
      bubbles: T.F.filter((F) => F.bubbleUntil > __inu.time).map((F) => F.f.name), dialog: document.querySelector('#dialog:not([hidden]), .dialog:not([hidden])')?.textContent?.slice(0, 80) || null,
      mpActors: (__inu.mp?.players?.() || []).length }; });
  await p.screenshot({ path: `${OUT}/${P}-${name}.png` }); await ctx.close(); }
await b.close();
console.log(JSON.stringify({ base: BASE, log, errs }, null, 1));

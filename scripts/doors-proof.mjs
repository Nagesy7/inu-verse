// Walk-in door proof: new game buildings, prompt text, walking into Meme Brawl shows the transition (navigation stubbed), panel door, return spawn.
import { chromium } from 'playwright';
const URL = process.env.URL || 'http://localhost:8642/', TAG = process.env.TAG || 'after', errs = [];
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); const p = await ctx.newPage();
p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await p.goto(URL); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); }); await p.reload(); await p.waitForTimeout(900); await p.click('#start'); await p.waitForTimeout(2500);
const go = (x, y, cx, cy) => p.evaluate(([x, y, cx, cy]) => { globalThis.__guide?.endTour?.('skipped'); __inu.setHour(11); globalThis.__noNav = true; document.querySelectorAll('.toast').forEach((t) => t.remove()); const s = __inu.state; s.player.x = (x + 0.5) * 32; s.player.y = (y + 0.5) * 32; globalThis.__camLock = { x: cx * 32, y: cy * 32 }; }, [x, y, cx, cy]);
await go(4, 66, 7, 66); await p.waitForTimeout(900); await p.screenshot({ path: `proof/doors-${TAG}-west-games.png` });
await go(59, 65, 57, 62); await p.waitForTimeout(900); await p.screenshot({ path: `proof/doors-${TAG}-kibblepay.png` });
const res = {};
if (TAG === 'after') { await go(3, 78, 6, 75); await p.waitForTimeout(600); await p.screenshot({ path: 'proof/doors-after-prompt.png' });
  await p.keyboard.down('ArrowUp'); await p.waitForTimeout(700); await p.screenshot({ path: 'proof/doors-after-entering-memebrawl.png' }); await p.waitForTimeout(500); await p.keyboard.up('ArrowUp');
  res.nav = await p.evaluate(() => globalThis.__lastNav || null); res.saved = await p.evaluate(() => [Math.floor(__inu.state.player.x / 32), Math.floor(__inu.state.player.y / 32)]);
  await go(42, 57, 42, 55); await p.waitForTimeout(400); await p.keyboard.down('ArrowUp'); await p.waitForTimeout(600); await p.keyboard.up('ArrowUp'); res.panel = await p.evaluate(() => __inu.panel); await p.screenshot({ path: 'proof/doors-after-bank-walkin.png' });
  await p.evaluate(() => document.getElementById('panel-close').click()); await p.keyboard.down('ArrowUp'); await p.waitForTimeout(600); await p.keyboard.up('ArrowUp'); res.reopened = await p.evaluate(() => __inu.panel || null);
  await go(59, 65, 57, 62); await p.keyboard.press('e'); await p.waitForTimeout(300); res.aPress = await p.evaluate(() => [__inu.panel || null, [...document.querySelectorAll('.toast')].map((t) => t.textContent)]); }
console.log(JSON.stringify(res), 'errors', errs); await b.close();

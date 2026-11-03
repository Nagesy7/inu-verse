// Fish Book end-to-end proof at phone landscape 844x390: empty book (silhouettes), a real pond catch (cast -> bite -> reel),
// a completed set (seeded catches) with title, the title on the nameplate, and D-pad focus inside the book with a simulated pad.
// URL=https://inu-verse-tawny.vercel.app/ OUT=/workspace/inu-verse/proof node scripts/fishbook-proof.mjs
import { chromium } from 'playwright'; import fs from 'fs';
const BASE = process.env.URL || 'http://127.0.0.1:8792/', OUT = process.env.OUT || '/tmp/fbproof', W = +(process.env.W || 844), H = +(process.env.H || 390);
fs.mkdirSync(OUT, { recursive: true }); const log = { url: BASE, viewport: [W, H], checks: [] }, errs = [];
const ok = (c, m) => { log.checks.push(`${c ? 'PASS' : 'FAIL'} ${m}`); console.log(`${c ? 'PASS' : 'FAIL'} ${m}`); };
const FAKE = () => { const pads = [null, null, null, null]; Object.defineProperty(Navigator.prototype, 'getGamepads', { value: () => pads, configurable: true });
  const mk = (index, id) => ({ index, id, mapping: 'standard', connected: true, timestamp: 0, buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), axes: [0, 0, 0, 0] });
  globalThis.__fp = { pads, plug(i, id) { pads[i] = mk(i, id); const e = new Event('gamepadconnected'); Object.defineProperty(e, 'gamepad', { value: pads[i] }); dispatchEvent(e); }, btn(i, b, v) { const p = pads[i].buttons[b]; p.pressed = !!v; p.value = v ? 1 : 0; pads[i].timestamp++; } }; };
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true }); await ctx.addInitScript(FAKE); const p = await ctx.newPage();
p.on('pageerror', (e) => errs.push(e.message));
await p.goto(BASE + '?tod=day&wx=clear'); await p.evaluate(() => { localStorage.setItem('inuverse.tour.v1', 'skipped'); }); await p.reload(); await p.waitForTimeout(1500); await p.click('#start'); await p.waitForTimeout(3000);
log.served = await p.evaluate(async () => (await (await fetch('/src/fishbook.js', { cache: 'no-store' })).text()).includes('recordCatch')); ok(log.served, 'server serves src/fishbook.js');
const clean = () => p.evaluate(() => { globalThis.__guide?.endTour?.('skipped'); document.querySelectorAll('#toast .toast,#tour,#obcard').forEach((t) => t.remove()); document.getElementById('crier-banner')?.classList.remove('show'); });
await clean();
// 1) menu entry -> empty book
await p.click('#menu-btn'); await p.waitForTimeout(300); ok(await p.isVisible('#btn-fishbook'), 'Fish Book in the Menu (Me)');
await p.click('#btn-fishbook'); await p.waitForTimeout(500); await clean();
log.empty = await p.evaluate(() => ({ cards: document.querySelectorAll('#panel .fb-card').length, unknown: [...document.querySelectorAll('#panel .fb-card b')].filter((x) => x.textContent === '???').length, head: document.querySelector('#panel .sub')?.textContent }));
ok(log.empty.cards >= 12 && log.empty.unknown === log.empty.cards, `empty book: ${log.empty.cards} silhouettes`);
await p.screenshot({ path: `${OUT}/feat-fishbook-empty.png` });
await p.evaluate(() => __inu.close?.() ?? document.querySelector('#panel-close,#panel .close,[data-close]')?.click()); await p.keyboard.press('Escape'); await p.waitForTimeout(400);
// 2) real catch at the Fishing Pond
await p.evaluate(async () => { const Wd = await import('/src/world.js'), s = __inu.state; const it = Wd.interactables(s).find((q) => q.kind === 'farm' && q.id === 'pond'); s.player.x = (it.tx + 0.5) * 32; s.player.y = (it.ty + 1.2) * 32; __inu.open?.('farm', { id: 'pond' }); });
await p.waitForTimeout(600); if (!(await p.isVisible('#panel [data-act="cast"]'))) { await p.evaluate(() => document.querySelector('#btn-a')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); await p.waitForTimeout(600); }
await p.click('#panel [data-act="cast"]'); await p.waitForFunction(() => __farm.fish.state === 'bite', null, { timeout: 8000 }); await p.waitForTimeout(150);
await clean(); await p.click('#panel [data-act="reel"]'); await p.waitForTimeout(350);
log.catch = await p.evaluate(() => ({ toast: [...document.querySelectorAll('#toast .toast')].map((t) => t.textContent), book: __fishbook.FB.summary(__inu.state), inv: __inu.state.farm.inv }));
ok(log.catch.book.seen === 1 && log.catch.toast.some((t) => /NEW in your Fish Book/.test(t)), 'pond catch recorded: ' + log.catch.toast.join(' | '));
await p.screenshot({ path: `${OUT}/feat-fishbook-catch.png` });
await p.click('#panel [data-act="book"]'); await p.waitForTimeout(500); await clean();
log.afterOne = await p.evaluate(() => [...document.querySelectorAll('#panel .fb-card.got')].map((c) => c.innerText.replace(/\s+/g, ' ')));
ok(log.afterOne.length === 1 && /Caught ×1 · best/.test(log.afterOne[0]), 'book card shows count + biggest: ' + log.afterOne[0]);
// 3) seeded catches complete the Koi Keeper set -> badge + title
await p.evaluate(() => { const { FB } = __fishbook, s = __inu.state; for (const id of FB.SETS.koikeeper.need) FB.recordCatch(s, id, 70 + id.length); FB.recordCatch(s, 'pond_carp', 48.2); FB.recordCatch(s, 'glow_minnow', 8.1); __inu.open('fishbook'); });
await p.waitForTimeout(400); await clean();
log.sets = await p.evaluate(() => ({ seen: __fishbook.FB.summary(__inu.state), titles: __fishbook.FB.titlesOf(__inu.state), badges: __inu.state.engage?.badges, bones: __inu.state.bones }));
ok(log.sets.titles.includes('Koi Keeper') && log.sets.badges.includes('🏮'), 'Koi Keeper set -> badge + title');
await p.click('#panel [data-act="title:Koi Keeper"]'); await p.waitForTimeout(400);
await p.evaluate(() => document.querySelector('#panel .fb-grid')?.scrollIntoView()); await p.screenshot({ path: `${OUT}/feat-fishbook-progress.png` });
await p.evaluate(() => document.querySelector('#panel .fb-sets')?.scrollIntoView()); await p.waitForTimeout(150); await p.screenshot({ path: `${OUT}/feat-fishbook-sets.png` });
ok(await p.evaluate(() => __fishbook.FB.titleOf(__inu.state) === 'Koi Keeper'), 'title worn');
// 4) controller: D-pad walks the book's buttons
await p.evaluate(() => __fp.plug(0, 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)')); await p.waitForTimeout(400);
log.padSteps = []; for (const k of [13, 15, 15, 15]) { await p.evaluate((k) => __fp.btn(0, k, 1), k); await p.waitForTimeout(120); await p.evaluate((k) => __fp.btn(0, k, 0), k); await p.waitForTimeout(220); log.padSteps.push(await p.evaluate(() => document.querySelector(".padfocus")?.getAttribute("aria-label") || document.querySelector(".padfocus")?.textContent.trim().slice(0, 30))); }
console.log(log.padSteps);
log.pad = await p.evaluate(() => { const f = document.querySelector('.padfocus'); return f ? { text: f.textContent.trim().slice(0, 40), inPanel: !!f.closest('#panel') } : null; });
ok(log.pad?.inPanel, 'pad focus inside Fish Book: ' + (log.pad?.text || 'none')); await clean(); await p.screenshot({ path: `${OUT}/feat-fishbook-pad.png` });
// 5) close: title on the nameplate
await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.evaluate(async () => { const Wd = await import('/src/world.js'), s = __inu.state; const it = Wd.interactables(s).find((q) => q.kind === 'farm' && q.id === 'pond'); s.player.x = (it.tx - 5) * 32; s.player.y = (it.ty - 1.5) * 32; }); await p.waitForTimeout(2200); await clean();
log.nameplate = await p.evaluate(() => ({ name: __inu.state.player.name, title: __fishbook.FB.titleOf(__inu.state), panel: __inu.panel?.() ?? null, prompt: !document.getElementById('prompt')?.hidden })); await p.screenshot({ path: `${OUT}/feat-fishbook-title.png` });
log.errors = errs; ok(!errs.length, 'no page errors ' + errs.join(';'));
fs.writeFileSync(`${OUT}/feat-fishbook-proof.json`, JSON.stringify(log, null, 1)); await b.close();
const fails = log.checks.filter((c) => c.startsWith('FAIL')); console.log(`${log.checks.length - fails.length}/${log.checks.length} checks`); process.exit(fails.length ? 1 : 0);

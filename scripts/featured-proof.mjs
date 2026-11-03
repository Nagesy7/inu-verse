// Featured Home of the Day end-to-end proof at phone landscape 844x390: the API pick (a real home, public name only), the
// Explore menu entry -> panel -> Visit (walks into that home), D-pad focus on Visit, the Kibble Plaza signboard + its prompt,
// and the real feed line. URL=https://inu-verse-tawny.vercel.app/ OUT=/workspace/inu-verse/proof node scripts/featured-proof.mjs
import { chromium } from 'playwright'; import fs from 'fs';
const BASE = process.env.URL || 'http://127.0.0.1:8792/', OUT = process.env.OUT || '/tmp/featproof', W = +(process.env.W || 844), H = +(process.env.H || 390);
fs.mkdirSync(OUT, { recursive: true }); const log = { url: BASE, viewport: [W, H], checks: [] }, errs = [];
const ok = (c, m) => { log.checks.push(`${c ? 'PASS' : 'FAIL'} ${m}`); console.log(`${c ? 'PASS' : 'FAIL'} ${m}`); };
const FAKE = () => { const pads = [null, null, null, null]; Object.defineProperty(Navigator.prototype, 'getGamepads', { value: () => pads, configurable: true });
  const mk = (index, id) => ({ index, id, mapping: 'standard', connected: true, timestamp: 0, buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), axes: [0, 0, 0, 0] });
  globalThis.__fp = { pads, plug(i, id) { pads[i] = mk(i, id); const e = new Event('gamepadconnected'); Object.defineProperty(e, 'gamepad', { value: pads[i] }); dispatchEvent(e); }, btn(i, b, v) { const p = pads[i].buttons[b]; p.pressed = !!v; p.value = v ? 1 : 0; pads[i].timestamp++; } }; };
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true }); await ctx.addInitScript(FAKE); const p = await ctx.newPage();
p.on('pageerror', (e) => errs.push(e.message));
await p.goto(BASE + '?tod=day&wx=clear'); await p.evaluate(() => { localStorage.setItem('inuverse.tour.v1', 'skipped'); }); await p.reload(); await p.waitForTimeout(1500); await p.click('#start'); await p.waitForTimeout(3000);
const clean = () => p.evaluate(() => { globalThis.__guide?.endTour?.('skipped'); document.querySelectorAll('#toast .toast,#tour,#obcard').forEach((t) => t.remove()); document.getElementById('crier-banner')?.classList.remove('show'); });
await clean();
// 1) the API pick
log.api = await p.evaluate(async () => (await fetch('/api/home?featured=1', { cache: 'no-store' })).json());
const H0 = log.api.home; ok(H0 && /^h[0-9a-z]{12}$/.test(H0.id) && H0.items >= 3 && !/^keeper/i.test(H0.name), `API pick for ${log.api.day} (Sydney): ${H0?.name} · ${H0?.items} items`);
ok(H0 && Object.keys(H0).sort().join() === 'id,items,name,signs,updatedAt', 'API returns public fields only (no owner key / wallet / layout)');
const again = await p.evaluate(async () => (await fetch('/api/home?featured=1', { cache: 'no-store' })).json()); ok(again.home?.id === H0?.id, 'same pick on repeat request (deterministic for the day)');
const home = await p.evaluate(async (id) => (await fetch('/api/home?id=' + id)).json(), H0.id); log.realItems = home.layout?.items?.length; ok(log.realItems >= 3, `picked home really is published with ${log.realItems} items`);
// 2) Explore menu -> panel
await p.click('#menu-btn'); await p.waitForTimeout(300); ok(await p.isVisible('#btn-featured'), 'Featured Home in Menu → Explore');
await p.screenshot({ path: `${OUT}/feat-home-menu.png` });
await p.click('#btn-featured'); await p.waitForSelector('#panel [data-act="visit"]', { timeout: 8000 }); await clean();
log.panel = await p.evaluate(() => document.querySelector('#panel-body').innerText.replace(/\s+/g, ' ')); ok(log.panel.includes(H0.name + "'s home"), 'panel: ' + log.panel.slice(0, 140));
await p.screenshot({ path: `${OUT}/feat-home-panel.png` });
// 3) controller focus reaches Visit
await p.evaluate(() => __fp.plug(0, 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)')); await p.waitForTimeout(400);
log.padSteps = []; for (let n = 0; n < 6; n++) { const f = await p.evaluate(() => document.querySelector('.padfocus')?.dataset.act || document.querySelector('.padfocus')?.textContent.trim().slice(0, 30) || null); log.padSteps.push(f); if (f === 'visit') break;
  await p.evaluate(() => __fp.btn(0, 13, 1)); await p.waitForTimeout(120); await p.evaluate(() => __fp.btn(0, 13, 0)); await p.waitForTimeout(220); }
log.padSteps.push(await p.evaluate(() => document.querySelector('.padfocus')?.dataset.act || null)); ok(log.padSteps.includes('visit'), 'D-pad focus reaches Visit: ' + log.padSteps.join(' → '));
await clean(); await p.screenshot({ path: `${OUT}/feat-home-pad.png` });
// 4) Visit (A on the focused button) -> walk into that home
await p.evaluate(() => __fp.btn(0, 0, 1)); await p.waitForTimeout(120); await p.evaluate(() => __fp.btn(0, 0, 0));
await p.waitForFunction(() => __inu.mode === 'room', null, { timeout: 10000 }).catch(() => {}); await p.waitForTimeout(600);
log.visit = await p.evaluate((n) => ({ mode: __inu.mode, named: document.body.innerText.toLowerCase().includes(`${n}'s home`.toLowerCase()) }), H0.name); log.visit = log.visit.mode === 'room' && log.visit.named; ok(log.visit, `Visit (pad A) walked into ${H0.name}'s home`);
await p.waitForTimeout(800); await clean(); await p.screenshot({ path: `${OUT}/feat-home-visit.png` });
// 5) Kibble Plaza signboard + prompt + opens the same panel
await p.reload(); await p.waitForTimeout(1500); await p.click('#start'); await p.waitForTimeout(1500); await clean();
await p.evaluate(async () => { const Wd = await import('/src/world.js'), s = __inu.state; s.player.x = (Wd.FEATURED_SIGN.x + 0.5) * 32; s.player.y = (Wd.FEATURED_SIGN.y + 1.5) * 32; });
await p.waitForTimeout(2200); await clean();
log.prompt = await p.evaluate(() => document.getElementById('prompt')?.innerText || ''); ok(/Featured Home of the Day/i.test(log.prompt), 'plaza signboard prompt: ' + log.prompt.replace(/\s+/g, ' '));
await p.screenshot({ path: `${OUT}/feat-home-sign.png` });
await p.evaluate(async () => { const Wd = await import('/src/world.js'), s = __inu.state; s.player.x = (Wd.FEATURED_SIGN.x + 2.5) * 32; s.player.y = (Wd.FEATURED_SIGN.y + 0.5) * 32; });
await p.waitForTimeout(1500); await clean(); await p.screenshot({ path: `${OUT}/feat-home-sign-wide.png` });
await p.evaluate(async () => { const Wd = await import('/src/world.js'), s = __inu.state; s.player.x = (Wd.FEATURED_SIGN.x + 0.5) * 32; s.player.y = (Wd.FEATURED_SIGN.y + 1.5) * 32; }); await p.waitForTimeout(700);
await p.keyboard.press('e'); await p.waitForTimeout(400); if (!(await p.isVisible('#panel [data-act="visit"]'))) { await p.keyboard.press('Space'); await p.waitForTimeout(400); }
await p.waitForSelector('#panel [data-act="visit"]', { timeout: 6000 }).catch(() => {}); ok(await p.isVisible('#panel [data-act="visit"]'), 'interacting with the signboard opens the Featured Home panel');
await clean(); await p.screenshot({ path: `${OUT}/feat-home-sign-panel.png` });
// 6) the feed line is real (server-posted once, names the picked home's owner)
log.feed = await p.evaluate(async () => (await (await fetch('/api/feed', { cache: 'no-store' })).json()).events.filter((e) => e.k === 'featured'));
ok(log.feed.some((e) => e.n === H0.name), `feed has the real featured line for ${H0.name} (${log.feed.length} featured line(s))`);
log.errors = errs; ok(!errs.length, 'no page errors ' + errs.join(';'));
fs.writeFileSync(`${OUT}/feat-home-proof.json`, JSON.stringify(log, null, 1)); await b.close();
const fails = log.checks.filter((c) => c.startsWith('FAIL')); console.log(`${log.checks.length - fails.length}/${log.checks.length} checks`); process.exit(fails.length ? 1 : 0);

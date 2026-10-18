// Proof for the Weekly Pool Board (Pools Monument + City Board), login streaks (device-only, migration, pins, wallet mode),
// and the kibble-pay $KIBBLE prop purchase reaching the wallet-sign step with a FIXTURE wallet that never signs.
// URL=<site> node scripts/pools-streak-proof.mjs   -> proof/pools-*, proof/streak-*, proof/kp-purchase-*, proof/pools-streak-log.txt
import { chromium } from 'playwright'; import fs from 'node:fs';
const URL0 = (process.env.URL || 'http://localhost:8661/').replace(/\/?$/, '/'), VIEWS = [[844, 390], [667, 375]], b = await chromium.launch(), log = [], errs = [];
const L = (...a) => { const t = a.join(' '); log.push(t); console.log(t); };
async function boot(w, h, { wallet = false } = {}) { const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  if (wallet) await ctx.addInitScript((pk) => { // TEST FIXTURE wallet: public key only; signMessage records the request and NEVER resolves (nothing is signed)
    const key = { toString: () => pk, toBase58: () => pk }; window.__fixtureSignRequests = [];
    window.phantom = { solana: { isPhantom: true, publicKey: null, connect: async () => { window.phantom.solana.publicKey = key; return { publicKey: key }; }, signMessage: (bytes) => { window.__fixtureSignRequests.push(new TextDecoder().decode(bytes)); return new Promise(() => {}); }, signAndSendTransaction: () => { window.__fixtureSignRequests.push('TX'); return new Promise(() => {}); }, on() {} } };
    window.solana = window.phantom.solana; }, 'FixtureWa11et1111111111111111111111111111111');
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(`${w}: ${e.message}`));
  await p.goto(URL0 + '?mp=off'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); }); await p.reload(); await p.waitForTimeout(900); await p.click('#start'); await p.waitForTimeout(5000);
  await p.evaluate(() => { globalThis.__guide?.endTour?.('skipped'); __inu.setHour?.(11); }); return { p, ctx }; }
const clean = (p) => p.evaluate(() => document.querySelectorAll('.toast').forEach((t) => t.remove()));
const shot = async (p, n, keepToast = false) => { if (!keepToast) await clean(p); const f = `proof/${n}.png`; await p.screenshot({ path: f }); L('saved ' + f); };
const label = (p, t) => p.evaluate((t) => { document.getElementById('prooflbl')?.remove(); const d = document.createElement('div'); d.id = 'prooflbl'; d.textContent = t; d.style.cssText = 'position:fixed;left:50%;bottom:4px;transform:translateX(-50%);z-index:99999;background:#ff00aa;color:#fff;font:bold 10px monospace;padding:2px 6px;border:2px solid #000;pointer-events:none'; document.body.appendChild(d); }, t);
const unlabel = (p) => p.evaluate(() => document.getElementById('prooflbl')?.remove());
for (const [w, h] of VIEWS) { const tag = `${w}x${h}`; let { p, ctx } = await boot(w, h);
  // ---- (1) Weekly Pool Board ----
  await p.evaluate(async () => { const PB = await import('./src/poolboard.js'); await PB.load(fetch, { force: true }); __inu.setZoom?.(2.4); globalThis.__camLock = { x: 17.6 * 32, y: 80.4 * 32 }; }); await p.waitForTimeout(900);
  await shot(p, `pools-monument-${tag}`);
  await p.evaluate(() => { globalThis.__camLock = null; __inu.setZoom?.(1); __open('city', { tab: 'pools' }); }); await p.waitForTimeout(2500);
  await shot(p, `pools-board-${tag}`);
  const board = await p.evaluate(() => [...document.querySelectorAll('#pool-board tr[data-board]')].map((r) => r.innerText.replace(/\s+/g, ' ').trim()));
  L(tag, 'board rows:', JSON.stringify(board)); L(tag, 'board footer:', await p.evaluate(() => document.querySelector('#pool-board')?.innerText.split('\n').filter((x) => /Kennel|updated|Shared/.test(x)).join(' | ')));
  await p.evaluate(() => document.querySelector('#pool-board .pb-upd')?.scrollIntoView({ block: 'end' })); await p.waitForTimeout(200); await shot(p, `pools-board-wallet-${tag}`);
  await p.evaluate(() => document.querySelector('#panel .close, #panel-close, [data-close]')?.click()); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  // ---- (2) Login streak: migration from the old device streak (12 in-game days -> capped real days), device-only ----
  const mig = await p.evaluate(async () => { const LS = await import('./src/loginstreak.js'); const s = __inu.state; delete s.loginStreak; s.fly5.streak.count = 12; LS.ensureStreak(s); LS.deviceCheckIn(s); __inu.hud?.(); return s.loginStreak; });
  L(tag, 'migrated:', JSON.stringify(mig)); await p.evaluate(() => { __open('fly5', { tab: 'streak' }); }); await p.waitForTimeout(400); await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  await shot(p, `streak-hud-device-${tag}`);
  await p.evaluate(() => __open('fly5', { tab: 'streak' })); await p.waitForTimeout(400); await shot(p, `streak-tab-device-${tag}`);
  // pins: play 30 consecutive Sydney days on the device clock (simulated dates), wear the 30-day pin
  const pins = await p.evaluate(async () => { const LS = await import('./src/loginstreak.js'); const s = __inu.state, t0 = Date.now(); const got = []; for (let d = 1; d <= 30; d++) got.push(...LS.deviceCheckIn(s, t0 + d * 864e5).newPins); s.loginStreak.last = LS.sydneyDay(); LS.equipPin(s, 30); __inu.hud(); return { got, count: s.loginStreak.count, unlocked: s.loginStreak.unlocked }; });
  L(tag, 'device pins after 30 simulated days:', JSON.stringify(pins));
  await p.evaluate(() => __open('fly5', { tab: 'streak' })); await p.waitForTimeout(300); await p.evaluate(() => document.querySelector('.grid.pins')?.scrollIntoView({ block: 'center' })); await label(p, 'pins unlocked by 30 simulated Sydney days'); await shot(p, `streak-pins-${tag}`); await unlabel(p);
  await p.keyboard.press('Escape'); await p.evaluate(() => __open('wardrobe')); await p.waitForTimeout(400); await shot(p, `streak-profile-${tag}`); await p.keyboard.press('Escape');
  await p.evaluate(() => { __inu.setZoom?.(3); }); await p.waitForTimeout(700); await shot(p, `streak-worn-pin-${tag}`); await p.evaluate(() => __inu.setZoom?.(1));
  // wallet mode: what the save shows after a server check-in (server reply shape from kibble-pay api/_lib/loginstreak.js)
  await p.evaluate(async () => { const LS = await import('./src/loginstreak.js'); LS.applyServer(__inu.state, { ok: true, counted: true, count: 5, best: 5, last: LS.sydneyDay(), unlocked: [], migrated: { device: 12, granted: 5 } }, 'Akk3DdxeRRLZABfpkFKYoDBk6Zim5wNLRYemNFjv56fn'); __inu.hud?.(); __open('fly5', { tab: 'streak' }); });
  await p.waitForTimeout(300); await label(p, 'wallet mode: kibble-pay reply shape (fixture, no real session)'); await shot(p, `streak-tab-wallet-${tag}`); await unlabel(p);
  await ctx.close();
  // ---- (0) kibble-pay purchase of a $KIBBLE shop prop reaches the wallet-sign step (fixture wallet never signs) ----
  ({ p, ctx } = await boot(w, h, { wallet: true }));
  await p.evaluate(async () => { const B = await import('./src/biz.js'); const s = __inu.state; s.bones = 50000; if (!s.biz?.mine) B.lease(s, 'P1', 'bakery', "Kabosu's Bakes", 0); __open('lot', { id: 'P1' }); }); await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelector('[data-act="ikib:kb_chandelier"]')?.scrollIntoView({ block: 'center' })); await shot(p, `kp-purchase-0-prop-${tag}`);
  await p.click('[data-act="ikib:kb_chandelier"]'); await p.waitForTimeout(300); L(tag, 'buy tap (signed out) toast:', await p.evaluate(() => [...document.querySelectorAll('.toast')].map((t) => t.textContent).join(' | ')));
  await shot(p, `kp-purchase-1-signin-required-${tag}`, true);
  const wb = (await p.$('#inu-wallet-btn')) || (await p.$('#btn-phantom')); L(tag, 'wallet button:', await wb?.evaluate((e) => e.id + ' "' + e.textContent.trim() + '"'));
  await p.keyboard.press('Escape'); await p.waitForTimeout(200); await wb?.click(); await p.waitForTimeout(1500);
  for (const sel of ['#inu-wallet-pop button', '.inu-wallet button', 'text=/Phantom/i']) { const n = await p.$(sel); if (n && (await p.evaluate(() => window.__fixtureSignRequests.length)) === 0) { try { await n.click({ timeout: 1500 }); await p.waitForTimeout(1500); } catch {} } }
  const req = await p.evaluate(() => window.__fixtureSignRequests); L(tag, 'wallet sign requests (fixture, never signed):', JSON.stringify(req));
  await shot(p, `kp-purchase-2-wallet-sign-${tag}`, true); await ctx.close(); }
L('page errors:', JSON.stringify(errs)); fs.writeFileSync('proof/pools-streak-log.txt', log.join('\n') + '\n'); await b.close();

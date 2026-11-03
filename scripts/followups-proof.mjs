// 3 Nov follow-ups proof on the LIVE site at 844x390 (phone landscape): wallet pill vs players-online card, blocked players not drawn
// (live avatar + feed ghost), proof runs send test:1 and the public feed holds no test lines, toasts clear of the pup, featured skips agent homes.
// Feed POSTs are aborted (bodies captured) so this run never says hello / posts. Two live multiplayer players (guests Pup7311 / Pup7312).
// URL=https://inu-verse-tawny.vercel.app/ OUT=/workspace/inu-verse/proof node scripts/followups-proof.mjs
import { chromium } from 'playwright'; import fs from 'fs';
const BASE = process.env.URL || 'http://127.0.0.1:8792/', OUT = process.env.OUT || '/tmp/fu', W = +(process.env.W || 844), H = +(process.env.H || 390);
const GA = 'Pup7311', GB = 'Pup7312'; fs.mkdirSync(OUT, { recursive: true });
const log = { url: BASE, viewport: [W, H], checks: [], feedPosts: [] }, errs = [];
const ok = (c, m) => { log.checks.push(`${c ? 'PASS' : 'FAIL'} ${m}`); console.log(`${c ? 'PASS' : 'FAIL'} ${m}`); };
const ov = (a, b) => !!(a && b) && a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
const b = await chromium.launch();
async function boot(tag, name, guest) { const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true }); const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(`${tag} ${e.message}`));
  await p.route('**/api/feed', (r) => { if (r.request().method() !== 'POST') return r.continue(); try { log.feedPosts.push({ tag, body: JSON.parse(r.request().postData() || '{}') }); } catch {} return r.abort(); });
  await p.goto(BASE + '?tod=day&wx=clear'); await p.evaluate((g) => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped'); localStorage.setItem('inuverse.mp.guest', g); }, guest);
  await p.reload(); await p.waitForTimeout(1500); await p.click('#start'); await p.waitForTimeout(1500);
  await p.evaluate((n) => { globalThis.__guide?.endTour?.('skipped'); __inu.state.player.name = n; }, name); return { ctx, p, tag }; }
const clean = (p) => p.evaluate(() => { globalThis.__guide?.endTour?.('skipped'); document.querySelectorAll('#tour,#obcard').forEach((t) => t.remove()); document.getElementById('crier-banner')?.classList.remove('show'); });
const rect = (p, sel) => p.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width && !e.hidden && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0 ? [r.x, r.y, r.width, r.height] : null; }, sel);
const place = (p, tx, ty) => p.evaluate(([tx, ty]) => { const s = __inu.state; s.player.x = (tx + 0.5) * 32; s.player.y = (ty + 0.5) * 32; }, [tx, ty]);
const A = await boot('A', 'Natto', GA); const B = await boot('B', 'Hoshi', GB);
const SP = await A.p.evaluate(async () => (await import('/src/ghosts.js')).SPOTS);
await place(A.p, SP.plaza.tx + 2, SP.plaza.ty); await place(B.p, SP.plaza.tx - 1, SP.plaza.ty);
await B.p.waitForFunction((g) => __inu.mp.status === 'online' && __inu.mp.players().some((x) => x.name === g), GA, { timeout: 20000 }).catch(() => {});
// 1) wallet pill vs the players-online card
await clean(B.p); log.walletBefore = { wallet: await rect(B.p, '#inu-wallet'), badge: await rect(B.p, '#inu-profile-badge') };
await B.p.click('#mp-chip'); await B.p.waitForTimeout(500);
log.wallet = { pop: await rect(B.p, '#mp-pop'), wallet: await rect(B.p, '#inu-wallet'), badge: await rect(B.p, '#inu-profile-badge'), body: await B.p.evaluate(() => document.body.className) };
ok(!!log.wallet.pop && !ov(log.wallet.pop, log.wallet.wallet) && !ov(log.wallet.pop, log.wallet.badge), `players-online card open, wallet pill clear/hidden (pill before ${JSON.stringify(log.walletBefore.wallet)}, now ${JSON.stringify(log.wallet.wallet)}; body.mppop-open=${/mppop-open/.test(log.wallet.body)})`);
await B.p.screenshot({ path: `${OUT}/feat-wallethide-card-open.png` });
await B.p.click('#mp-chip'); await B.p.waitForTimeout(500); log.walletAfter = await rect(B.p, '#inu-wallet'); ok(!!log.walletAfter, 'card closed: wallet pill back ' + JSON.stringify(log.walletAfter));
// 2) blocked players are not drawn: live avatar + a feed ghost
const VIEW = { x0: -1e9, y0: -1e9, x1: 1e9, y1: 1e9 };
await B.p.evaluate(() => __feed.ghosts.set([{ n: 'Hachi', a: 'plaza', c: 'black', t: Date.now() - 15 * 60_000 }], new Set()));
await B.p.waitForTimeout(600); await clean(B.p);
log.preBlock = await B.p.evaluate(([g, V]) => ({ actor: __inu.mp.actors(V, null).some((a) => a.name === g), ghost: __feed.ghosts.list.map((x) => x.n) }), [GA, VIEW]);
ok(log.preBlock.actor && log.preBlock.ghost.includes('Hachi'), `before: B draws live ${GA} and ghost Hachi`); await B.p.screenshot({ path: `${OUT}/feat-blockghost-1-before.png` });
await B.p.evaluate((g) => { __friends.FRD.block(__inu.state, g); __friends.FRD.block(__inu.state, 'Hachi'); }, GA);
await B.p.waitForFunction(() => !__feed.ghosts.list.some((x) => x.n === 'Hachi'), null, { timeout: 15000 }).catch(() => {}); await B.p.waitForTimeout(500); await clean(B.p);
log.postBlock = await B.p.evaluate(([g, V]) => ({ actor: __inu.mp.actors(V, null).some((a) => a.name === g), listed: __inu.mp.players().some((x) => x.name === g), ghost: __feed.ghosts.list.map((x) => x.n) }), [GA, VIEW]);
ok(!log.postBlock.actor && log.postBlock.listed && !log.postBlock.ghost.includes('Hachi'), `after block: ${GA} not drawn (still on the card to unblock), ghost Hachi gone`);
await B.p.screenshot({ path: `${OUT}/feat-blockghost-2-after.png` });
await B.p.evaluate((g) => { __friends.FRD.unblock(__inu.state, g); __friends.FRD.unblock(__inu.state, 'Hachi'); }, GA);
// 3) feed: proof runs flag themselves; the public feed has no test lines
await B.p.waitForTimeout(2500);
const hellos = log.feedPosts.filter((x) => x.body.op === 'hello'); log.hellos = hellos.map((x) => ({ tag: x.tag, n: x.body.name || x.body.n, test: x.body.test }));
ok(hellos.length > 0 && hellos.every((x) => x.body.test === 1), `automation hellos carry test:1 (aborted here, nothing sent): ${JSON.stringify(log.hellos)}`);
log.feed = await B.p.evaluate(async () => (await fetch('/api/feed?_=' + Date.now(), { cache: 'no-store' })).json());
const names = [...log.feed.events.map((e) => e.n + ':' + e.k), ...log.feed.ghosts.map((g) => 'ghost:' + g.n)];
ok(!names.some((n) => /keeper|^tora:|^mochi:|^kabosu:|natto|hoshi/i.test(n)), 'live feed has no test lines: ' + JSON.stringify(names));
await B.p.evaluate(() => { document.querySelector('#feed-tick .ft-line')?.click(); }); await B.p.waitForTimeout(600); await clean(B.p);
log.tickerList = await B.p.evaluate(() => [...document.querySelectorAll('#feed-tick .ft-list li')].map((l) => l.innerText)); ok(!log.tickerList.some((l) => /keeper|tora|mochi|kabosu|natto|hoshi/i.test(l)), 'open ticker list: ' + JSON.stringify(log.tickerList)); await B.p.screenshot({ path: `${OUT}/feat-feedclean-ticker.png` }); await B.p.evaluate(() => document.querySelector('#feed-tick .ft-list')?.click()); await B.p.keyboard.press('Escape'); await B.p.waitForTimeout(300);
// 4) toasts clear of the pup (real toasts + a forced 3-stack)
await B.p.evaluate(() => { const t = document.getElementById('toast'); for (const m of ['Older line', 'Login streak: day 2', 'Following Pup7311 — you\'ll see when they\'re online']) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = m; t.appendChild(d); } });
await B.p.waitForTimeout(600); await clean(B.p);
log.toasts = await B.p.evaluate(() => ({ body: document.body.className, list: [...document.querySelectorAll('#toast .toast')].map((e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return cs.display === 'none' ? null : [r.x, r.y, r.width, r.height]; }).filter(Boolean) }));
const pup = [W / 2 - 28, H / 2 - 100, 56, 100];
ok(log.toasts.list.length >= 1 && log.toasts.list.every((t) => !ov(t, pup)), `toasts ${JSON.stringify(log.toasts.list.map((r) => r.map(Math.round)))} clear of the pup ${pup} (toast-low=${/toast-low/.test(log.toasts.body)})`);
await B.p.screenshot({ path: `${OUT}/feat-toasts-844x390.png` });
// 5) featured: no agent / test home
log.featured = await B.p.evaluate(async () => (await fetch('/api/home?featured=1&_=' + Date.now(), { cache: 'no-store' })).json());
ok(!log.featured.home || !['hlmn8dooxxj84', 'hizo71vjz5x0c'].includes(log.featured.home.id) && !/^(kabosu|biscuit|keeper)/i.test(log.featured.home.name || ''), 'featured pick is not an agent home: ' + JSON.stringify(log.featured));
await place(B.p, 0, 0); await B.p.evaluate(async () => { const Wd = await import('/src/world.js'), s = __inu.state; s.player.x = (Wd.FEATURED_SIGN.x + 0.5) * 32; s.player.y = (Wd.FEATURED_SIGN.y + 1.5) * 32; });
await B.p.waitForTimeout(2200); await clean(B.p); log.signPrompt = await B.p.evaluate(() => document.getElementById('prompt')?.innerText.replace(/\s+/g, ' ') || '');
await B.p.screenshot({ path: `${OUT}/feat-featured-fix-sign.png` });
log.errors = errs; ok(!errs.length, 'no page errors ' + errs.join(';'));
fs.writeFileSync(`${OUT}/feat-followups-proof.json`, JSON.stringify(log, null, 1)); await b.close();
const fails = log.checks.filter((c) => c.startsWith('FAIL')); console.log(`${log.checks.length - fails.length}/${log.checks.length} checks`); process.exit(fails.length ? 1 : 0);

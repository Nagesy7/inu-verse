// Round 4 proof: a decoratable home + guestbook with two headless clients.
//   A (phone landscape 844x390, touch) buys furniture at Paws & Pillows, claims a plot, places + rotates it in build mode,
//   exits (the layout is published to /api/home). B (667x375) opens the multiplayer list, taps "Visit home" next to A,
//   sees A's layout read-only and signs the guestbook (a link-only entry is refused, a second entry is rate-limited).
//   A reopens build mode -> Guestbook shows B's entry -> deletes it.
//   URL=https://inu-verse-tawny.vercel.app/ node scripts/r4-proof.mjs     (default: local dev server on :8644)
import { chromium } from 'playwright'; import fs from 'fs';
const URL = process.env.URL || 'http://127.0.0.1:8644/', OUT = process.env.OUT || 'proof', TAG = process.env.TAG || 'r4';
fs.mkdirSync(OUT, { recursive: true }); const res = { url: URL }, errs = [];
const b = await chromium.launch();
async function boot(tag, guest, w, h, touch = false, name = null) { const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: touch, isMobile: false }); const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(`${tag} pageerror ${e.message}`)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::|kibble-pay|dexscreener|api\/coins|WebSocket connection/i.test(m.text())) errs.push(`${tag} ${m.text()}`); });
  await p.goto(URL); await p.evaluate((g) => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); localStorage.setItem('inuverse.mp.guest', g); }, guest);
  await p.reload(); await p.waitForTimeout(900); await p.click('#start'); await p.waitForTimeout(2200);
  await p.evaluate(() => { globalThis.__guide?.endTour?.('skipped'); __inu.setHour(11); globalThis.__noNav = true; document.querySelectorAll('.toast').forEach((t) => t.remove()); }); if (name) await p.evaluate((n) => { __inu.state.player.name = n; }, name); return { ctx, p, tag }; }
const shot = (p, n) => p.screenshot({ path: `${OUT}/${TAG}-${n}` });
const tapCell = async (p, x, y) => { const g = await p.evaluate(() => __rel.geom()); await p.mouse.click(g.ox + (x + 0.5) * g.cell, g.oy + (y + 0.5) * g.cell); await p.waitForTimeout(150); };
const toasts = (p) => p.evaluate(() => [...document.querySelectorAll('#toast .toast')].map((t) => t.textContent));
const click = async (p, sel) => { await p.locator(sel).first().click(); await p.waitForTimeout(250); };
const A = await boot('A', 'Pup4101', 844, 390, true, 'Biscuit'), B = await boot('B', 'Pup4202', 667, 375, false, 'Mochi');
const NAME = await A.p.evaluate(() => __inu.state.player.name);
// --- A: buy at the existing shop, claim a plot, decorate (place + rotate) in build mode
await A.p.evaluate(() => { __inu.state.bones += 2000; });
await A.p.evaluate(() => __inu.open('shop')); await A.p.waitForTimeout(400);
for (const id of ['sofa', 'rug', 'lamp', 'plant', 'table', 'tv']) await click(A.p, `[data-buy="${id}"]`);
await shot(A.p, '1-shop-844x390.png');
res.inventory = await A.p.evaluate(() => ({ ...__inu.state.inventory }));
await A.p.evaluate(() => { document.querySelector('.close')?.click(); }); await A.p.waitForTimeout(300);
res.claim = await A.p.evaluate(() => __rel.claim('p3')); await A.p.evaluate(() => __rel.build('p3')); await A.p.waitForTimeout(500);
for (const [id, x, y] of [['rug', 3, 3], ['sofa', 3, 1], ['table', 4, 3], ['lamp', 8, 1], ['plant', 0, 6], ['tv', 7, 5]]) { await click(A.p, `[data-inv="${id}"]`); await tapCell(A.p, x, y); }
await tapCell(A.p, 7, 5); await click(A.p, '#prot'); // rotate the TV
res.layoutA = await A.p.evaluate(() => __inu.state.plots.p3.items.map((i) => [i.id, i.x, i.y, i.rot]));
await shot(A.p, '2-decorate-844x390.png');
res.buildbarA = await A.p.evaluate(() => { const r = document.querySelector('#buildbar').getBoundingClientRect(), g = __rel.geom(); return { bar: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], roomRight: g.ox + 10 * g.cell, roomBottom: g.oy + 7 * g.cell, cell: g.cell, side: !!g.side }; });
await click(A.p, '#bexit'); await A.p.waitForFunction(() => (globalThis.__homePublished || 0) > 0, null, { timeout: 15000 });
res.homeId = await A.p.evaluate(() => __inu.state.homeShare.id);
await A.p.waitForTimeout(2500); // the {t:'h'} update reaches the room
// --- B: multiplayer list -> Visit home -> sign the guestbook
await B.p.click('#mp-chip'); await B.p.waitForTimeout(400);
res.B_list = await B.p.evaluate(() => __inu.mp.players().map((p) => ({ name: p.name, h: p.h })));
await shot(B.p, '3-player-list-visit-home-667x375.png');
await B.p.locator(`[data-visit="${res.homeId}"]`).click(); await B.p.waitForTimeout(1200);
res.B_visiting = await B.p.evaluate(() => ({ shared: __rel.build_?.shared?.name, items: __rel.build_?.home?.items.length }));
await shot(B.p, '4-visit-readonly-667x375.png');
await B.p.fill('#gbtext', 'https://t.me/whatever'); await click(B.p, '#gbsign'); res.B_linkRefused = await toasts(B.p);
await B.p.fill('#gbtext', 'Love the rug and the cosy lamp! Woof from Mochi'); await click(B.p, '#gbsign'); await B.p.waitForTimeout(800);
res.B_signed = await B.p.evaluate(() => globalThis.__gbSigned || null); await shot(B.p, '5-signed-667x375.png');
await B.p.waitForTimeout(400); await B.p.fill('#gbtext', 'one more'); await click(B.p, '#gbsign'); await B.p.waitForTimeout(600); res.B_rateLimited = await toasts(B.p);
res.api_after_sign = await (await fetch(new globalThis.URL('/api/home?id=' + res.homeId, URL))).json().then((j) => ({ name: j.name, items: j.layout.items.length, book: j.book.map((e) => [e.name, e.text]) }));
// --- A: reopen build mode -> Guestbook -> delete the entry
await A.p.evaluate(() => __rel.build('p3')); await A.p.waitForTimeout(400); await click(A.p, '#bgb'); await A.p.waitForTimeout(1200);
await shot(A.p, '6-owner-guestbook-844x390.png');
res.A_book = await A.p.evaluate(() => [...document.querySelectorAll('#gbown .gbe')].map((e) => e.textContent.trim()));
await click(A.p, '#gbown [data-gbdel]'); await A.p.waitForTimeout(1200); await shot(A.p, '7-owner-deleted-844x390.png');
res.api_after_delete = await (await fetch(new globalThis.URL('/api/home?id=' + res.homeId, URL))).json().then((j) => j.book.length);
await click(A.p, '#bexit');
// desktop check of the normal build bar (no regression)
const D = await boot('D', 'Pup4303', 1280, 800); await D.p.evaluate(() => { __inu.state.bones += 500; __rel.claim('p5'); __inu.state.inventory = { sofa: 1 }; __rel.build('p5'); }); await D.p.waitForTimeout(500); await shot(D.p, '8-build-desktop-1280x800.png');
res.errors = errs; fs.writeFileSync(`${OUT}/${TAG}-results.json`, JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1)); await b.close();

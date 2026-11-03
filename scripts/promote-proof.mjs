// Promote proof (facades + text chat) at phone landscape 844x390. URL=<site> TAG=<prefix> node scripts/promote-proof.mjs
// Two headless sessions in the same room exchange a chat line over the configured realtime worker; a hostile line is blocked client-side.
import { chromium } from 'playwright'; import fs from 'fs';
const URL = process.env.URL || 'https://inu-verse-tawny.vercel.app/', OUT = process.env.OUT || 'proof', TAG = process.env.TAG || 'promote', MPU = process.env.MP || '';
fs.mkdirSync(OUT, { recursive: true }); const res = {}, errs = [];
const b = await chromium.launch();
async function boot(tag, guest) { const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true }); const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(`${tag} pageerror ${e.message}`));
  await p.goto(URL + (MPU ? '?mp=' + encodeURIComponent(MPU) : '')); await p.evaluate((g) => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); localStorage.setItem('inuverse.mp.guest', g); }, guest);
  await p.reload(); await p.waitForTimeout(1200); await p.click('#start'); await p.waitForTimeout(2500);
  await p.evaluate(() => { globalThis.__guide?.endTour?.('skipped'); __inu.setHour?.(11); __inu.setRain?.(false); globalThis.__noNav = true; document.querySelectorAll('.toast,.guide-card,#tour').forEach((t) => t.remove()); }); return { ctx, p }; }
const place = (p, tx, ty) => p.evaluate(([tx, ty]) => { const s = __inu.state; s.player.x = (tx + 0.5) * 32; s.player.y = (ty + 0.5) * 32; globalThis.__camLock = { x: s.player.x, y: s.player.y - 40 }; }, [tx, ty]);
const rect = (p, sel) => p.evaluate((sel) => { const e = document.querySelector(sel); if (!e || e.hidden || getComputedStyle(e).display === 'none') return null; const r = e.getBoundingClientRect(); return r.width ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null; }, sel);
const overlap = (a, c) => !!(a && c && a.x < c.x + c.w && c.x < a.x + a.w && a.y < c.y + c.h && c.y < a.y + a.h);
const A = await boot('A', 'Pup7101');
// facades (city day): player on the walkway below each building, camera on the façade; crier/guide cards hidden for a clear view
await A.p.addStyleTag({ content: 'body.pf-clear .toast,body.pf-clear #crier-banner{visibility:hidden!important}' }); await A.p.evaluate(() => document.body.classList.add('pf-clear')); await A.p.keyboard.press('-'); await A.p.waitForTimeout(300); // ½x so whole façades + signs fit the phone screen
const spots = await A.p.evaluate(async () => { const W = await import('/src/world.js'); const all = [...W.BUILDINGS, ...W.MALL_BUILDINGS, W.BANK, W.ARCADE];
  return Object.fromEntries(['cafe', 'fashion', 'cars', 'shop', 'launch', 'bank', 'arcade', 'mall', 'jewel', 'petshop'].map((id) => { const b = all.find((q) => q && q.id === id); return b && [id, [b.x, b.y, b.w, b.h]]; }).filter(Boolean)); });
for (const [k, [x, y, w, h]] of Object.entries(spots)) {
  await A.p.evaluate(([x, y, w, h]) => { const s = __inu.state; s.player.x = (x + w / 2 + 0.5) * 32; s.player.y = (y + h + 1.2) * 32; globalThis.__camLock = { x: (x + w / 2) * 32, y: (y + h * 0.75) * 32 };
    document.querySelectorAll('#crier-banner,.toast,.guide-card,#prompt').forEach((t) => { t.style.visibility = 'hidden'; }); }, [x, y, w, h]);
  await A.p.waitForTimeout(800); await A.p.screenshot({ path: `${OUT}/${TAG}-facade-${k}.png` }); }
await A.p.evaluate(() => { document.querySelectorAll('#crier-banner,#prompt').forEach((t) => { t.style.visibility = ''; }); }); await A.p.evaluate(() => document.body.classList.remove('pf-clear')); await A.p.keyboard.press('+'); await A.p.waitForTimeout(300);
// chat: B joins, both stand together
const B = await boot('B', 'Pup7202');
for (const [c, dx] of [[A, 0], [B, 2]]) await place(c.p, 29 + dx, 21);
await A.p.waitForTimeout(3500);
res.mpA = await A.p.evaluate(() => ({ status: __inu.mp?.status, players: __inu.mp?.players().map((x) => x.name) }));
res.mpB = await B.p.evaluate(() => ({ status: __inu.mp?.status, players: __inu.mp?.players().map((x) => x.name) }));
// layout: chat bar vs HUD / controls
const sels = ['#mp-chat', '#hud', '#mp-chip', '#joy', '#joystick', '#act-btn', '#minimap-wrap', '#menu-btn', '#inu-wallet', '#controls', '.touch-btns', '#feed', '#alive-feed'];
res.layout = {}; for (const s of sels) res.layout[s] = await rect(A.p, s);
res.chatOverlaps = Object.entries(res.layout).filter(([k, r]) => k !== '#mp-chat' && overlap(res.layout['#mp-chat'], r)).map(([k]) => k);
// A types into the bar and sends
await A.p.click('#mp-say'); await A.p.fill('#mp-say', 'Hi pup, nice cafe!'); await A.p.waitForTimeout(200); await A.p.screenshot({ path: `${OUT}/${TAG}-chat-typing-A.png` });
res.layoutFocused = await rect(A.p, '#mp-chat'); res.focusOverlaps = Object.entries(res.layout).filter(([k, r]) => k !== '#mp-chat' && overlap(res.layoutFocused, r)).map(([k]) => k);
await A.p.keyboard.press('Enter'); await B.p.waitForTimeout(1500);
res.logB = await B.p.evaluate(() => document.getElementById('mp-log')?.innerText); res.logA = await A.p.evaluate(() => document.getElementById('mp-log')?.innerText);
await B.p.screenshot({ path: `${OUT}/${TAG}-chat-received-B.png` }); await A.p.screenshot({ path: `${OUT}/${TAG}-chat-sent-A.png` });
await B.p.waitForTimeout(2200); await B.p.fill('#mp-say', 'Woof! Race you there'); await B.p.keyboard.press('Enter'); await A.p.waitForTimeout(1500);
res.logA2 = await A.p.evaluate(() => document.getElementById('mp-log')?.innerText);
await A.p.screenshot({ path: `${OUT}/${TAG}-chat-reply-A.png` });
// hostile line: refused client-side before it is sent
await A.p.waitForTimeout(2200); await A.p.fill('#mp-say', 'kys loser'); await A.p.keyboard.press('Enter'); await A.p.waitForTimeout(300);
res.hostileToast = await A.p.evaluate(() => [...document.querySelectorAll('.toast')].map((t) => t.textContent).join(' | ')); res.hostileStillInInput = await A.p.inputValue('#mp-say');
await A.p.screenshot({ path: `${OUT}/${TAG}-chat-blocked-A.png` }); await B.p.waitForTimeout(1200);
res.logBafterHostile = await B.p.evaluate(() => document.getElementById('mp-log')?.innerText);
res.errors = errs; fs.writeFileSync(`${OUT}/${TAG}-results.json`, JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1)); await b.close();

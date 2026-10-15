// Chat bubble proof at phone landscape: NPC greeting + NPC-NPC exchange + player emote, screenshots + GIF frames (/tmp/chatgif).
import { chromium } from 'playwright'; import fs from 'fs';
const URL = process.env.URL || 'http://localhost:8642/', DIR = '/tmp/chatgif'; fs.rmSync(DIR, { recursive: true, force: true }); fs.mkdirSync(DIR);
const b = await chromium.launch(), errs = []; const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); const p = await ctx.newPage();
p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await p.goto(URL); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); }); await p.reload(); await p.waitForTimeout(900); await p.click('#start'); await p.waitForTimeout(2500);
await p.evaluate(async () => { globalThis.__guide?.endTour?.('skipped'); __inu.setHour(10); __inu.setRain(false); document.querySelectorAll('.toast,.guide-card,#tour').forEach((t) => t.remove());
  const s = __inu.state, N = __inu.npcs; const [a, c] = N; for (const n of [a, c]) { n.path = []; n.moving = false; n.wait = 99; }
  const pin = () => { a.x = s.player.x + 60; a.y = s.player.y - 2; c.x = s.player.x + 125; c.y = s.player.y + 8; a.path = []; c.path = []; a.moving = c.moving = false; a.face = 'left'; c.face = 'left'; requestAnimationFrame(pin); }; pin(); globalThis.__camLock = { x: s.player.x + 50, y: s.player.y - 20 };
  const C = await import('/src/chat.js'); C.resetChat(); globalThis.__C = C; globalThis.__A = a; globalThis.__B = c; });
const fire = (js) => p.evaluate(js);
let k = 0; const shot = async (n) => { for (let i = 0; i < n; i++) { await p.screenshot({ path: `${DIR}/f${String(k++).padStart(3, '0')}.png` }); await p.waitForTimeout(70); } };
await fire(() => { __inu.emote('wave'); }); await p.waitForTimeout(400); await p.screenshot({ path: 'proof/chat-emote.png' }); await shot(10);
await fire(() => { __C.say(__A.name, 'Oh, hello! Ooh, cool outfit!', __inu.time, { force: true }); }); await p.waitForTimeout(400); await p.screenshot({ path: 'proof/chat-greeting.png' }); await shot(10);
await fire(() => { __C.say(__B.name, 'Did you hear that squirrel?', __inu.time, { force: true }); }); await shot(10);
await fire(() => { __C.say(__A.name, 'Where?! WHERE?!', __inu.time, { force: true }); }); await p.waitForTimeout(400); await p.screenshot({ path: 'proof/chat-exchange-stacked.png' }); await shot(10); await shot(26);
console.log('errors', errs, 'frames', k); await b.close();

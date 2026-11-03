// Friends "Online · <area>" by-name proof on the LIVE site at 844x390, spending exactly ONE feed hello (A). A = "Tora" says hello
// as an automated run (test:1 -> presence for Friends only: no arrival line, no ghost); B never posts (feed POSTs aborted), adds
// "Tora" by name in Menu -> Me -> Friends and must read "Online · <area>". Both ?mp=off so only the feed presence path is exercised.
// URL=https://inu-verse-tawny.vercel.app/ OUT=/workspace/inu-verse/proof node scripts/friends-online-proof.mjs   (8 hellos/IP/hour: run once)
import { chromium } from 'playwright'; import fs from 'fs';
const BASE = process.env.URL || 'http://127.0.0.1:8792/', OUT = process.env.OUT || '/tmp/fo', W = 844, H = 390, NA = process.env.NA || 'Tora';
fs.mkdirSync(OUT, { recursive: true }); const log = { url: BASE, viewport: [W, H], checks: [], aPosts: [], bPosts: 0 }, errs = [];
const ok = (c, m) => { log.checks.push(`${c ? 'PASS' : 'FAIL'} ${m}`); console.log(`${c ? 'PASS' : 'FAIL'} ${m}`); };
const b = await chromium.launch();
async function boot(tag, onPost) { const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true }); const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(`${tag} ${e.message}`)); await p.route('**/api/feed', (r) => (r.request().method() === 'POST' ? onPost(r) : r.continue()));
  await p.goto(BASE + '?mp=off&tod=day&wx=clear'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped'); }); await p.reload(); await p.waitForTimeout(1500);
  return { ctx, p }; }
const clean = (p) => p.evaluate(() => { globalThis.__guide?.endTour?.('skipped'); document.querySelectorAll('#tour,#obcard').forEach((t) => t.remove()); document.getElementById('crier-banner')?.classList.remove('show'); });
let aOpen = false, hellos = 0;
const A = await boot('A', async (r) => { let body = {}; try { body = JSON.parse(r.request().postData() || '{}'); } catch {}
  if (!aOpen || (body.op === 'hello' && hellos >= 1)) { log.aPosts.push({ op: body.op, blocked: true }); return r.abort(); }
  const res = await r.fetch(); let rb = null; try { rb = await res.json(); } catch {} if (body.op === 'hello' && res.status() === 200) hellos++;
  log.aPosts.push({ op: body.op, n: body.name, test: body.test, status: res.status(), at: new Date().toISOString(), ...(res.status() !== 200 ? { body: rb } : {}) }); return r.fulfill({ response: res }); });
// a rate-limited hello (429) is not counted by the server, so A's own 20 s client retry is free until the hourly window opens
await A.p.click('#start'); await A.p.waitForTimeout(1200); await clean(A.p);
await A.p.evaluate(async (n) => { __inu.state.player.name = n; const SP = (await import('/src/ghosts.js')).SPOTS, s = __inu.state; s.player.x = (SP.plaza.tx + 0.5) * 32; s.player.y = (SP.plaza.ty + 0.5) * 32; }, NA);
aOpen = true;
const until = Date.now() + (+process.env.WAIT_MIN || 15) * 60_000; while (!hellos && Date.now() < until) await new Promise((d) => setTimeout(d, 3000)); await new Promise((d) => setTimeout(d, 4000));
const hello = log.aPosts.find((x) => x.op === 'hello' && x.status === 200) || log.aPosts.filter((x) => x.op === 'hello').pop(); ok(hello && hello.status === 200 && hello.test === 1, 'A: one hello as ' + NA + ' (test:1) -> ' + JSON.stringify(hello));
const B = await boot('B', (r) => { log.bPosts++; return r.abort(); });
await B.p.click('#start'); await B.p.waitForTimeout(1200); await clean(B.p); await B.p.evaluate(() => { __inu.state.player.name = 'Hoshi'; });
await B.p.click('#menu-btn'); await B.p.waitForTimeout(500); await B.p.evaluate(() => document.getElementById('btn-friends').click()); await B.p.waitForTimeout(600);
await B.p.fill('#fr-name', NA); await B.p.click('#panel [data-act="add"]');
await B.p.waitForFunction((n) => [...document.querySelectorAll('#panel .fr-row')].some((r) => r.textContent.includes(n) && /Online/.test(r.textContent)), NA, { timeout: 45000, polling: 1000 }).catch(() => {});
log.row = await B.p.evaluate((n) => [...document.querySelectorAll('#panel .fr-list .fr-row')].map((r) => r.innerText.replace(/\s+/g, ' ')).find((r) => r.includes(n)) || null, NA);
ok(/Online\s*·\s*\S/.test(log.row || ''), 'B: friend added by name shows "Online · <area>": ' + log.row); await clean(B.p);
await B.p.screenshot({ path: `${OUT}/feat-friends-online.png` });
log.who = await B.p.evaluate(async (n) => (await fetch('/api/feed?who=' + n + '&_=' + Date.now(), { cache: 'no-store' })).json(), NA);
log.feed = await B.p.evaluate(async () => (await fetch('/api/feed?_=' + Date.now(), { cache: 'no-store' })).json());
const pub = [...log.feed.events.map((e) => e.n + ':' + e.k), ...log.feed.ghosts.map((g) => 'ghost:' + g.n)];
ok(!pub.some((x) => x.toLowerCase().startsWith(NA.toLowerCase() + ':') || /hoshi/i.test(x)), 'public feed stays clean (no arrival for the proof hello): ' + JSON.stringify(pub));
log.helloAttempts = log.aPosts.filter((x) => x.op === 'hello').length; ok(hellos === 1, `exactly one hello spent (A); B's ${log.bPosts} POSTs aborted`);
log.errors = errs; ok(!errs.length, 'no page errors ' + errs.join(';'));
fs.writeFileSync(`${OUT}/feat-friends-online.json`, JSON.stringify(log, null, 1)); await b.close();
const fails = log.checks.filter((c) => c.startsWith('FAIL')); console.log(`${log.checks.length - fails.length}/${log.checks.length} checks`); process.exit(fails.length ? 1 : 0);

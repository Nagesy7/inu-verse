// Friends list end-to-end proof at phone landscape 844x390 on the LIVE site with two real players (A = "Tora" / guest Pup7301,
// B = "Mochi" / guest Pup7302) on the live realtime server: B follows A from the players-online card and by public name, sees A
// online + their area (feed presence), Join warps B to A, the D-pad reaches the Join/Unfollow/Block buttons, block mutes + hides.
// URL=https://inu-verse-tawny.vercel.app/ OUT=/workspace/inu-verse/proof node scripts/friends-proof.mjs
// Note: /api/feed allows 8 hellos per IP per hour, so don't loop this script.
import { chromium } from 'playwright'; import fs from 'fs';
const BASE = process.env.URL || 'http://127.0.0.1:8792/', OUT = process.env.OUT || '/tmp/frproof', W = +(process.env.W || 844), H = +(process.env.H || 390);
const NA = process.env.NA || 'Tora', NB = process.env.NB || 'Mochi', GA = process.env.GA || 'Pup7301', GB = process.env.GB || 'Pup7302';
fs.mkdirSync(OUT, { recursive: true }); const log = { url: BASE, viewport: [W, H], checks: [] }, errs = [];
const ok = (c, m) => { log.checks.push(`${c ? 'PASS' : 'FAIL'} ${m}`); console.log(`${c ? 'PASS' : 'FAIL'} ${m}`); };
const FAKE = () => { const pads = [null, null, null, null]; Object.defineProperty(Navigator.prototype, 'getGamepads', { value: () => pads, configurable: true });
  const mk = (index, id) => ({ index, id, mapping: 'standard', connected: true, timestamp: 0, buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), axes: [0, 0, 0, 0] });
  globalThis.__fp = { pads, plug(i, id) { pads[i] = mk(i, id); const e = new Event('gamepadconnected'); Object.defineProperty(e, 'gamepad', { value: pads[i] }); dispatchEvent(e); }, btn(i, b, v) { const p = pads[i].buttons[b]; p.pressed = !!v; p.value = v ? 1 : 0; pads[i].timestamp++; } }; };
const b = await chromium.launch();
async function boot(tag, name, guest) { const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true }); await ctx.addInitScript(FAKE); const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(`${tag} ${e.message}`));
  let hold = true; await p.route('**/api/feed', (r) => (hold && r.request().method() === 'POST' ? r.abort() : r.continue())); // no feed hello until our test name is set
  await p.goto(BASE + '?tod=day&wx=clear'); await p.evaluate((g) => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped'); localStorage.setItem('inuverse.mp.guest', g); }, guest);
  await p.reload(); await p.waitForTimeout(1500); await p.click('#start'); await p.waitForTimeout(1500);
  await p.evaluate((n) => { globalThis.__guide?.endTour?.('skipped'); __inu.state.player.name = n; }, name); hold = false; return { ctx, p, tag }; }
const clean = (p) => p.evaluate(() => { globalThis.__guide?.endTour?.('skipped'); document.querySelectorAll('#tour,#obcard').forEach((t) => t.remove()); document.getElementById('crier-banner')?.classList.remove('show'); });
const place = (p, tx, ty) => p.evaluate(([tx, ty]) => { const s = __inu.state; s.player.x = (tx + 0.5) * 32; s.player.y = (ty + 0.5) * 32; }, [tx, ty]);
const A = await boot('A', NA, GA); const B = await boot('B', NB, GB);
const SP = await A.p.evaluate(async () => { const G = await import('/src/ghosts.js'); return G.SPOTS; });
await place(A.p, SP.plaza.tx + 2, SP.plaza.ty); await place(B.p, SP.plaza.tx - 1, SP.plaza.ty);
// both live in the same room
await B.p.waitForFunction((g) => __inu.mp.status === 'online' && __inu.mp.players().some((x) => x.name === g), GA, { timeout: 20000 }).catch(() => {});
log.mp = await B.p.evaluate(() => ({ status: __inu.mp.status, players: __inu.mp.players().map((x) => x.name) })); ok(log.mp.players.includes(GA), `live multiplayer: B sees ${GA} (${log.mp.status})`);
// 1) Follow from the players-online card
await clean(B.p); await B.p.click('#mp-chip'); await B.p.waitForTimeout(400);
await B.p.click(`#mp-pop [data-follow="${GA}"]`); await B.p.waitForTimeout(500);
log.card = await B.p.evaluate((g) => ({ btn: document.querySelector(`#mp-pop [data-follow="${g}"]`)?.textContent, following: __friends.FRD.isFollowing(__inu.state, g) }), GA);
ok(log.card.following && /Following/.test(log.card.btn), `Follow on the live player card -> "${log.card.btn}"`); await B.p.screenshot({ path: `${OUT}/feat-friends-card.png` });
// (the card stays open on purpose: opening a panel must close it)
// 2) Follow by public name from the Friends panel (Menu -> Me -> Friends)
await B.p.waitForFunction(async (n) => { const r = await (await fetch('/api/feed?who=' + n, { cache: 'no-store' })).json(); return r.who?.[n.toLowerCase()]?.on; }, NA, { timeout: 60000, polling: 3000 }).catch(() => {});
await B.p.click('#menu-btn'); await B.p.waitForTimeout(300); ok(await B.p.isVisible('#btn-friends'), 'Friends in Menu → Me'); await B.p.click('#btn-friends'); await B.p.waitForTimeout(600);
await B.p.fill('#fr-name', NA); await B.p.click('#panel [data-act="add"]'); await B.p.waitForTimeout(400);
await B.p.waitForFunction((n) => [...document.querySelectorAll('#panel .fr-row')].some((r) => r.textContent.includes(n) && /Online/.test(r.textContent)), NA, { timeout: 20000 }).catch(() => {});
log.list = await B.p.evaluate(() => [...document.querySelectorAll('#panel .fr-list .fr-row')].map((r) => r.innerText.replace(/\s+/g, ' ')));
ok(log.list.some((r) => r.includes(NA) && /Online/.test(r)), 'friend by name shows Online + area: ' + log.list.join(' | '));
ok(log.list.some((r) => r.includes(GA) && /Here with you/.test(r)), `card-followed ${GA} shows "Here with you"`);
await clean(B.p); await B.p.screenshot({ path: `${OUT}/feat-friends-list.png` });
// 3) A goes to the Fishing Pond; B's list shows the new area; Join warps B there
await B.p.keyboard.press('Escape'); await B.p.waitForTimeout(300);
await place(A.p, SP.pond.tx, SP.pond.ty); await A.p.waitForTimeout(26000); // feed ping: area change, >= 21 s after the last ping
await B.p.waitForFunction(async (n) => { const r = await (await fetch('/api/feed?who=' + n + '&_=' + Date.now(), { cache: 'no-store' })).json(); return r.who?.[n.toLowerCase()]?.a === 'pond'; }, NA, { timeout: 60000, polling: 4000 }).catch(() => {});
await B.p.evaluate(() => { __friends.FRS.at = 0; }); await B.p.click('#menu-btn'); await B.p.waitForTimeout(300); await B.p.click('#btn-friends');
await B.p.waitForFunction((n) => [...document.querySelectorAll('#panel .fr-row')].some((r) => r.textContent.includes(n) && /Fishing Pond/i.test(r.textContent)), NA, { timeout: 20000 }).catch(() => {});
log.area = await B.p.evaluate((n) => [...document.querySelectorAll('#panel .fr-row')].find((r) => r.textContent.includes(n))?.innerText.replace(/\s+/g, ' '), NA); ok(/Fishing Pond/i.test(log.area || ''), 'area updates: ' + log.area);
// controller: D-pad through the Friends panel reaches Join
await B.p.evaluate(() => __fp.plug(0, 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)')); await B.p.waitForTimeout(400);
log.padSteps = []; for (let n = 0; n < 8; n++) { const f = await B.p.evaluate(() => { const e = document.querySelector('.padfocus'); return e ? (e.dataset.act || e.id || e.textContent.trim().slice(0, 16)) : null; }); log.padSteps.push(f); if (f === 'join') break;
  await B.p.evaluate(() => __fp.btn(0, 13, 1)); await B.p.waitForTimeout(120); await B.p.evaluate(() => __fp.btn(0, 13, 0)); await B.p.waitForTimeout(220); }
ok(log.padSteps.includes('join'), 'D-pad reaches Join: ' + log.padSteps.join(' → ')); await clean(B.p); await B.p.screenshot({ path: `${OUT}/feat-friends-pad.png` });
const focusedK = await B.p.evaluate(() => document.querySelector('.padfocus')?.dataset.k); log.joinWho = focusedK;
await B.p.evaluate(() => __fp.btn(0, 0, 1)); await B.p.waitForTimeout(120); await B.p.evaluate(() => __fp.btn(0, 0, 0)); await B.p.waitForTimeout(1500); await clean(B.p);
log.join = await B.p.evaluate(([px, py]) => { const s = __inu.state; const d = Math.hypot(s.player.x / 32 - px, s.player.y / 32 - py); return { tile: [+(s.player.x / 32).toFixed(1), +(s.player.y / 32).toFixed(1)], dist: +d.toFixed(1), panel: __inu.panel?.() ?? null, toasts: [...document.querySelectorAll('#toast .toast')].map((t) => t.textContent) }; }, [SP.pond.tx, SP.pond.ty]);
ok(log.join.dist < 6, `pad A on Join (${focusedK}) warped B to A at the pond: ${log.join.tile} (${log.join.dist} tiles) ${log.join.toasts.join(' | ')}`);
await B.p.waitForTimeout(800); await B.p.screenshot({ path: `${OUT}/feat-friends-join.png` });
log.seesA = await B.p.evaluate((g) => __inu.mp.actors({ x0: -1e9, y0: -1e9, x1: 1e9, y1: 1e9 }, null).some((a) => a.name === g) || __inu.mp.players().some((x) => x.name === g), GA); ok(log.seesA, 'B sees A after joining');
// 4) block + unblock + unfollow
await B.p.evaluate(() => document.querySelector('#menu-btn').click()); await B.p.waitForTimeout(300); await B.p.click('#btn-friends'); await B.p.waitForTimeout(500);
await B.p.click(`#panel [data-act="block"][data-k="${GA.toLowerCase()}"]`); await B.p.waitForTimeout(400);
log.block = await B.p.evaluate((g) => ({ blocked: __friends.FRD.isBlocked(__inu.state, g), following: __friends.FRD.isFollowing(__inu.state, g), muted: __inu.mp.isMuted(g), rows: [...document.querySelectorAll('#panel .fr-list .fr-row')].map((r) => r.innerText.replace(/\s+/g, ' ')), blockedUi: document.querySelector('#panel .fr-blocked summary')?.textContent }), GA);
ok(log.block.blocked && !log.block.following && log.block.muted && !log.block.rows.some((r) => r.includes(GA) && /Unfollow/.test(r)), `block: unfollowed + chat muted + hidden (${log.block.blockedUi})`);
await B.p.evaluate(() => { const d = document.querySelector('#panel .fr-blocked'); if (d) d.open = true; }); await clean(B.p); await B.p.screenshot({ path: `${OUT}/feat-friends-block.png` });
await B.p.click(`#panel [data-act="unblock"][data-k="${GA.toLowerCase()}"]`); await B.p.waitForTimeout(300);
await B.p.click(`#panel [data-act="unfollow"][data-k="${NA.toLowerCase()}"]`); await B.p.waitForTimeout(300);
log.after = await B.p.evaluate((g) => ({ blocked: __friends.FRD.isBlocked(__inu.state, g), muted: __inu.mp.isMuted(g), list: __friends.FRD.ensureFriends(__inu.state).list.map((x) => x.n) }), GA);
ok(!log.after.blocked && !log.after.muted && !log.after.list.length, 'unblock restores chat; unfollow empties the list');
log.saved = await B.p.evaluate(() => { try { return JSON.parse(localStorage.getItem('inuverse.save.v1')).friends; } catch { return null; } }); ok(!!log.saved, 'friends persisted in the save: ' + JSON.stringify(log.saved));
log.errors = errs; ok(!errs.length, 'no page errors ' + errs.join(';'));
fs.writeFileSync(`${OUT}/feat-friends-proof.json`, JSON.stringify(log, null, 1)); await b.close();
const fails = log.checks.filter((c) => c.startsWith('FAIL')); console.log(`${log.checks.length - fails.length}/${log.checks.length} checks`); process.exit(fails.length ? 1 : 0);

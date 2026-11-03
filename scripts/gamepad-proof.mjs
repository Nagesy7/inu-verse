// Controller (Gamepad API) end-to-end proof at phone landscape 844x390 with a SIMULATED pad:
// navigator.getGamepads() is overridden and gamepadconnected / gamepaddisconnected are dispatched by hand.
// URL=https://inu-verse-tawny.vercel.app/ node scripts/gamepad-proof.mjs   (default: local static server)
import { chromium } from 'playwright'; import fs from 'fs';
const BASE = process.env.URL || 'http://127.0.0.1:8642/', OUT = process.env.OUT || 'proof', W = +(process.env.W || 844), Hh = +(process.env.H || 390);
fs.mkdirSync(OUT, { recursive: true }); const errs = [], log = {}, fails = [];
const quiet = /Failed to load resource|net::|kibble-pay|dexscreener|api\/|WebSocket|favicon|status of 404|insights/i;
const ok = (c, m) => { if (!c) fails.push(m); log.checks = [...(log.checks || []), `${c ? 'PASS' : 'FAIL'} ${m}`]; };
const PS = 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', XB = 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)';
const FAKE = () => { const pads = [null, null, null, null]; navigator.getGamepads = () => pads; Object.defineProperty(Navigator.prototype, 'getGamepads', { value: () => pads, configurable: true });
  const mk = (index, id) => ({ index, id, mapping: 'standard', connected: true, timestamp: 0, buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), axes: [0, 0, 0, 0] });
  const fire = (type, gp) => { const e = new Event(type); Object.defineProperty(e, 'gamepad', { value: gp }); dispatchEvent(e); };
  globalThis.__fp = { pads, plug(i, id) { pads[i] = mk(i, id); fire('gamepadconnected', pads[i]); }, unplug(i) { const gp = pads[i]; pads[i] = null; if (gp) { gp.connected = false; fire('gamepaddisconnected', gp); } },
    btn(i, b, v) { const p = pads[i].buttons[b]; p.pressed = !!v; p.value = v ? 1 : 0; pads[i].timestamp++; }, axes(i, x, y) { pads[i].axes[0] = x; pads[i].axes[1] = y; pads[i].timestamp++; } }; };
const b = await chromium.launch();
const MOB = W < 1000, ctx = await b.newContext({ viewport: { width: W, height: Hh }, deviceScaleFactor: 1, hasTouch: MOB, isMobile: MOB }), p = await ctx.newPage();
await ctx.addInitScript(FAKE);
p.on('pageerror', (e) => errs.push(`pageerror ${e.message}`)); p.on('console', (m) => { if (m.type() === 'error' && !quiet.test(m.text())) errs.push(m.text().slice(0, 160)); });
await p.goto(BASE + '?tod=day&wx=clear'); await p.evaluate(() => { localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); }); await p.reload(); await p.waitForTimeout(1500);
log.served = await p.evaluate(async () => { const r = await fetch('/src/gamepad.js', { cache: 'no-store' }); return r.ok && (await r.text()).includes('createGamepad'); });
await p.click('#start'); await p.waitForTimeout(2500);
const clean = () => p.evaluate(() => { globalThis.__guide?.endTour?.('skipped'); document.querySelectorAll('#toast .toast,.guide-card,#tour,#obcard,#crier-banner').forEach((t) => t.remove()); });
const tap = async (i, b, hold = 90) => { await p.evaluate(([i, b]) => __fp.btn(i, b, 1), [i, b]); await p.waitForTimeout(hold); await p.evaluate(([i, b]) => __fp.btn(i, b, 0), [i, b]); await p.waitForTimeout(160); };
const nearDoor = () => p.evaluate(async () => { const Wd = await import('/src/world.js'), s = __inu.state, T = Wd.TILE || 32;
  const it = Wd.interactables(s).find((q) => q.kind === 'square') || Wd.interactables(s).find((q) => q.kind === 'kibble') || Wd.interactables(s)[0]; s.player.x = (it.tx + 0.5) * T; s.player.y = (it.ty + 1.2) * T; return it.name || it.id; });
await clean(); log.door = await nearDoor(); await p.waitForTimeout(600);
log.beforePad = await p.evaluate(() => document.querySelector('#prompt')?.innerText);
// 1) PlayStation pad connects
await clean(); await p.evaluate((id) => __fp.plug(0, id), PS); await p.waitForTimeout(450);
log.ps = await p.evaluate(() => ({ toast: [...document.querySelectorAll('#toast .toast')].map((t) => t.textContent), prompt: document.querySelector('#prompt')?.innerText, body: document.body.className, kind: __pad.kind }));
ok(log.ps.toast.some((t) => /PlayStation controller connected · ✕ select · ○ back/.test(t)), 'PS toast with ✕ ○'); ok(/✕/.test(log.ps.prompt || ''), 'prompt shows ✕ for PS');
await p.screenshot({ path: `${OUT}/gamepad-ps-connected.png` }); await p.waitForTimeout(2300); await clean(); await p.screenshot({ path: `${OUT}/gamepad-ps-prompt.png` });
// 2) Swap to an Xbox pad (hot-plug: unplug PS, plug Xbox)
await p.evaluate(() => __fp.unplug(0)); await p.waitForTimeout(300); log.unplugToast = await p.evaluate(() => [...document.querySelectorAll('#toast .toast')].map((t) => t.textContent).pop());
ok(/Controller disconnected/.test(log.unplugToast || ''), 'disconnect toast');
await clean(); await p.evaluate((id) => __fp.plug(1, id), XB); await p.waitForTimeout(450);
log.xb = await p.evaluate(() => ({ toast: [...document.querySelectorAll('#toast .toast')].map((t) => t.textContent), prompt: document.querySelector('#prompt')?.innerText, kind: __pad.kind }));
ok(log.xb.toast.some((t) => /Xbox controller connected · A select · B back/.test(t)), 'Xbox toast with A B'); ok(/^A/.test(log.xb.prompt || ''), 'prompt shows A for Xbox');
await p.screenshot({ path: `${OUT}/gamepad-xbox-connected.png` }); await p.waitForTimeout(2300); await clean(); await p.screenshot({ path: `${OUT}/gamepad-xbox-prompt.png` });
// 3) keyboard takes the hints back, pad input takes them again
await p.keyboard.press('Shift'); await p.waitForTimeout(150); log.kbPrompt = await p.evaluate(() => document.querySelector('#prompt')?.innerText);
ok(/^(E|A)/i.test(log.kbPrompt || '') && !(await p.evaluate(() => document.body.classList.contains('pad-on'))), 'keyboard switches hints back');
// 4) Start opens the menu; D-pad moves a visible highlight; A activates; B closes
await clean(); await tap(1, 9); await p.waitForTimeout(300);
log.menuOpen = await p.evaluate(() => !document.getElementById('drawer').hidden); ok(log.menuOpen, 'Start opens the menu');
const foc = () => p.evaluate(() => { const e = document.querySelector('.padfocus'); return e ? (e.id || e.textContent.trim().slice(0, 24)) : null; });
const seq = [await foc()]; for (let k = 0; k < 3; k++) { await tap(1, 13); seq.push(await foc()); } await tap(1, 15); seq.push(await foc()); await tap(1, 12); seq.push(await foc());
log.menuFocus = seq; ok(seq.filter(Boolean).length >= 5 && new Set(seq).size >= 3, 'D-pad moves the menu highlight');
log.hintBar = await p.evaluate(() => document.getElementById('pad-hints')?.innerText); ok(/A\s*Select/.test(log.hintBar || ''), 'menu hint bar');
await p.screenshot({ path: `${OUT}/gamepad-menu-focus.png` });
await tap(1, 1); log.menuClosedByB = await p.evaluate(() => document.getElementById('drawer').hidden); ok(log.menuClosedByB, 'B closes the menu');
// A on "Help" opens a panel; navigate in it; B closes it
await tap(1, 9);
for (let k = 0; k < 40 && (await foc()) !== 'btn-garage'; k++) await tap(1, 13, 60);
log.garageFocused = await foc(); await tap(1, 0); await p.waitForTimeout(300); log.panelAfterA = await p.evaluate(() => __inu.panel); ok(log.garageFocused === 'btn-garage' && !!log.panelAfterA, 'A activates the focused menu item (Garage panel)');
await tap(1, 13); log.panelFocus = await foc(); await p.screenshot({ path: `${OUT}/gamepad-panel-focus.png` });
await tap(1, 1); log.panelAfterB = await p.evaluate(() => __inu.panel || null); ok(!log.panelAfterB, 'B closes the panel');
// 5) Left stick moves the player (radial deadzone: tiny drift doesn't)
await clean(); const p0 = await p.evaluate(() => ({ x: __inu.state.player.x, y: __inu.state.player.y }));
await p.evaluate(() => __fp.axes(1, 0.12, 0.1)); await p.waitForTimeout(500); const pD = await p.evaluate(() => ({ x: __inu.state.player.x, y: __inu.state.player.y }));
ok(Math.hypot(pD.x - p0.x, pD.y - p0.y) < 1, 'stick drift inside the deadzone does not move the player');
await p.evaluate(() => __fp.axes(1, 0.95, 0.05)); await p.waitForTimeout(900); const p1 = await p.evaluate(() => ({ x: __inu.state.player.x, y: __inu.state.player.y, moving: __inu.player.moving }));
await p.screenshot({ path: `${OUT}/gamepad-stick-moved.png` }); await p.evaluate(() => __fp.axes(1, 0, 0)); await p.waitForTimeout(300);
const p2 = await p.evaluate(() => ({ x: __inu.state.player.x, y: __inu.state.player.y })); await p.waitForTimeout(500); const p3 = await p.evaluate(() => ({ x: __inu.state.player.x, y: __inu.state.player.y }));
log.move = { p0, pD, p1, p2, dx: Math.round(p1.x - p0.x) }; ok(p1.x - p0.x > 40, 'stick moved the player right'); ok(Math.hypot(p3.x - p2.x, p3.y - p2.y) < 1, 'stick release stops');
// D-pad walk
const q0 = p2; await p.evaluate(() => __fp.btn(1, 13, 1)); await p.waitForTimeout(600); await p.evaluate(() => __fp.btn(1, 13, 0)); await p.waitForTimeout(200);
const q1 = await p.evaluate(() => ({ x: __inu.state.player.x, y: __inu.state.player.y })); log.dpad = { dy: Math.round(q1.y - q0.y) }; ok(q1.y - q0.y > 20, 'D-pad walks');
// 6) chat: Y focuses chat if online; B always exits it (not trapped)
log.chat = await p.evaluate(() => { const i = document.getElementById('mp-say'); return i ? { visible: !!i.getClientRects().length, disabled: i.disabled } : null; });
if (log.chat?.visible && !log.chat.disabled) { await tap(1, 3); log.chat.focused = await p.evaluate(() => document.activeElement?.id); await tap(1, 1); log.chat.afterB = await p.evaluate(() => document.activeElement?.id || 'body'); ok(log.chat.afterB !== 'mp-say', 'B exits chat input'); }
// 7) X opens the action wheel, B closes it
await tap(1, 2); await p.waitForTimeout(200); log.wheel = await p.evaluate(() => !!document.getElementById('act-wheel') && !document.getElementById('act-wheel').hidden);
await tap(1, 1); log.wheelAfterB = await p.evaluate(() => !!document.getElementById('act-wheel') && !document.getElementById('act-wheel').hidden); ok(log.wheel && !log.wheelAfterB, 'X opens action wheel, B closes it');
// 8) touch takes hints back
if (MOB) await p.touchscreen.tap(10, 200); else await p.mouse.click(W / 2, Hh / 2); await p.waitForTimeout(150); log.touchBack = await p.evaluate(() => !document.body.classList.contains('pad-on')); ok(log.touchBack, 'touch switches hints back');
// 9) unplug the last pad -> polling stops
await p.evaluate(() => __fp.unplug(1)); await p.waitForTimeout(200); log.after = await p.evaluate(() => ({ connected: __pad.connected, polls: __pad.P.polls })); await p.waitForTimeout(400);
ok((await p.evaluate(() => __pad.P.polls)) === log.after.polls && log.after.connected === 0, 'no polling once unplugged');
log.errors = errs; log.fails = fails; fs.writeFileSync(`${OUT}/gamepad-proof.json`, JSON.stringify(log, null, 1)); console.log(JSON.stringify(log, null, 1)); await b.close(); process.exit(fails.length ? 1 : 0);

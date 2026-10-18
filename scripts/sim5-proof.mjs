// Phase 5 proof: the Pawsley Pup Clinic in the world, its staff and a sim pup's call on the plaza, the clinic panel (You /
// Medic shift / Staff / Rules), opt-in, real triggers (stubbed paw by sprinting into a wall, sunburn by standing still,
// a bee sting by the flowerbeds, a tummy ache after the café), the hurt card + bump art + the x0.85 walk, every way out
// (walk it off, free treatment with and without the optional co-pay, bumps off), a medic shift (walk to the pup, the
// mini-task with a slip, paid an ordinary wage, anchored), the judge clear of the palm, the guide label off the
// courthouse sign on phones, and the ☰ check on the clinic panel. URL=http://localhost:8672/ OUT=proof node scripts/sim5-proof.mjs
import { chromium } from 'playwright'; import { writeFileSync, mkdirSync } from 'node:fs';
const URL = process.env.URL || 'http://localhost:8672/', OUT = (process.env.OUT || 'proof') + '/sim5-', TAG = process.env.TAG || '', ONLY = process.env.ONLY, b = await chromium.launch(), errs = [], notes = [], panels = {};
mkdirSync(process.env.OUT || 'proof', { recursive: true });
const VIEWS = [['desktop', { width: 1280, height: 800 }, false], ['667x375', { width: 667, height: 375 }, true], ['750x342', { width: 750, height: 342 }, true], ['844x390', { width: 844, height: 390 }, true]].filter((v) => !ONLY || ONLY.split(',').includes(v[0]));
for (const [name, viewport, phone] of VIEWS) { try { await runView(name, viewport, phone); } catch (e) { errs.push(`${name} proof step failed: ${e.message.split('\n')[0]}`); } }
async function runView(name, viewport, phone) {
  const ctx = await b.newContext({ viewport, isMobile: phone, hasTouch: phone, deviceScaleFactor: phone ? 2 : 1 }), page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(name + ': ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_|net::/.test(m.text())) errs.push(name + ' console: ' + m.text()); });
  await page.clock.install({ time: Date.now() - 30 * 60e3 }); await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(1200); await page.click('#start').catch(() => {}); await page.waitForTimeout(1200); await page.getByText(/skip tour/i).first().click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(400);
  await page.evaluate(() => { __inu.setHour(11); __inu.setRain?.(0); });
  const put = (x, y, cam = true) => page.evaluate(([x, y, cam]) => { const s = __inu.state; s.player.x = x * 32; s.player.y = y * 32; if (cam) globalThis.__camLock = { x: x * 32, y: y * 32 }; else globalThis.__camLock = null; }, [x, y, cam]);
  const cam = (x, y) => page.evaluate(([x, y]) => { globalThis.__camLock = { x: x * 32, y: y * 32 }; }, [x, y]);
  const close = () => page.evaluate(() => document.querySelector('#panel-close')?.click()), shot = async (k) => { await page.waitForTimeout(400); return page.screenshot({ path: `${OUT}${k}-${name}${TAG}.png` }); };
  const open = (o) => page.evaluate((o) => __inu.open('bureau', o), o), txt = (s) => page.evaluate((s) => document.querySelector(s)?.innerText.replace(/\s+/g, ' ') || 'none', s);
  const med = () => page.evaluate(async () => { const s = (await import('/src/sim/simstate.js')).pawWallet().state(); return { balance: s.balance, unsynced: s.unsynced, anchoredSeq: s.anchoredSeq, server: s.server, bumps: s.med.bumps, hurt: s.med.hurt?.live ? s.med.hurt.ail : null, slow: s.med.slow, injuriesToday: s.med.injuriesToday, treatsToday: s.med.treatsToday }; });
  const pos = () => page.evaluate(() => [__inu.state.player.x / 32, __inu.state.player.y / 32]);
  const card = () => txt('#pab-med:not([hidden])');
  const key = async (k, ms, run = false) => { if (run) await page.keyboard.down('Shift'); await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); if (run) await page.keyboard.up('Shift'); };
  // 1) the clinic in the world, and the judge + the guide label at the courthouse (the phones are where the label overlapped)
  await put(57.5, 50.6, false); await cam(58.5, 48.6); await page.waitForTimeout(1200); await shot('clinic');
  await put(43.5, 74.6, false); await cam(43.5, 71.2); await page.waitForTimeout(1500); await shot('courthouse');
  const lab = await page.evaluate(async () => { const B = await import('/src/sim/bureau.js'), C = await import('/src/sim/court.js'), z = 2, cv = document.querySelector('canvas'); const label = document.body.dataset.edgeLabel || '';
    const P = await import('/src/sim/place.js'), cam = globalThis.__camLock, sx = (wx) => (wx - cam.x) * 2 + innerWidth / 2, sy = (wy) => (wy - cam.y) * 2 + innerHeight / 2, H = P.COURTHOUSE, sign = { x: sx(H.x * 32 + 18), y: sy(H.y * 32 - 37), w: (H.w * 32 - 36) * 2, h: 12 };
    const [lx, ly, lw, lh] = label ? label.split(',').map(Number) : [0, 0, 0, 0], over = !!label && lx < sign.x + sign.w && lx + lw > sign.x && ly < sign.y + sign.h && ly + lh > sign.y;
    return { label, over, sign: [sign.x, sign.y, sign.w, sign.h].map(Math.round), signs: B.signRects().length }; }); notes.push(`${name} courthouse: guide label ${lab.label || '(none: guide target on screen)'} vs COURTHOUSE sign ${lab.sign}: overlap ${lab.over}; ${lab.signs} sign rects avoided`); if (lab.over) errs.push(`${name}: guide label over the courthouse sign`);
  // 2) the clinic panel: not joined, join, tabs, bumps on
  await open({ tab: 'clinic' }); await page.waitForTimeout(700); await shot('clinic-notjoined'); await page.click('[data-join]'); await page.waitForTimeout(500);
  for (const k of ['staff', 'rules', 'shift']) { await page.click(`[data-m="${k}"]`); await page.waitForTimeout(250); await shot(`clinic-${k}`); }
  await page.click('[data-m="you"]'); await page.waitForTimeout(250); await page.click('[data-on]'); await page.waitForTimeout(500); await shot('clinic-you'); notes.push(`${name} after opt-in: ${JSON.stringify(await med())}`);
  // the ☰ check on this panel
  const pr = await page.evaluate(() => { const c = document.getElementById('panel-close'), r = c.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2), m = document.getElementById('menu-btn'); const shown = !!m && getComputedStyle(m).display !== 'none'; const mr = shown ? m.getBoundingClientRect() : null;
    return { closeOnTop: hit === c || c.contains(hit), menuShown: shown, menuOverClose: !!(mr && !(mr.right <= r.left || mr.left >= r.right || mr.bottom <= r.top || mr.top >= r.bottom)) }; }); panels[name] = pr; notes.push(`${name} clinic panel: ${JSON.stringify(pr)}`); await close(); await page.waitForTimeout(300);
  // a desk shift first so there is something to chip in with (10 PM), then wait out the wage cooldown later
  await open({ tab: 'wallet' }); await page.waitForTimeout(500); await page.click('[data-shift]'); await page.evaluate(() => { for (const tr of document.querySelectorAll('#pab-shift [data-i]')) { const c = tr.querySelectorAll('code'); if (c[0].textContent !== c[1].textContent) { tr.click(); return; } } }); await page.waitForTimeout(500); await close();
  // 3) bump 1: a stubbed paw, sprinting north into the wall at tx 31 row 46; measure the slowdown, then walk it off
  const wallX = await page.evaluate(async () => { const W = await import('/src/world.js'); for (let x = 6; x < 60; x++) if (!W.isSolid(x, 47) && W.isSolid(x, 46) && !W.isSolid(x, 48) && !W.isSolid(x, 49)) return x; return 0; });
  for (let i = 0; i < 4 && !(await med()).hurt; i++) { await put(wallX + 0.5, 49.4); await page.waitForTimeout(200); await key('ArrowUp', 1500, true); await page.waitForTimeout(400); }
  await page.waitForTimeout(500); await shot('paw'); notes.push(`${name} paw: ${await card()} | ${JSON.stringify(await med())}`);
  const lane = await page.evaluate(async () => { const W = await import('/src/world.js'); for (let ty = 40; ty < 60; ty++) for (let tx = 10; tx < 50; tx++) { let ok = true; for (let i = 0; i < 16 && ok; i++) if (W.isSolid(tx + i, ty)) ok = false; if (ok) return [tx, ty]; } return [20, 47]; });
  const walk = async () => { await put(lane[0] + 0.5, lane[1] + 0.5); await page.waitForTimeout(300); const a = await pos(); await key('ArrowRight', 1000); await page.waitForTimeout(250); const c = await pos(); return +(c[0] - a[0]).toFixed(2); };
  const slowD = await walk(); notes.push(`${name} 1 s walk while hurt: ${slowD} tiles`);
  for (let i = 0; i < 6 && (await med()).hurt; i++) { await put(lane[0] + 0.5, lane[1] + 0.5); await key('ArrowRight', 2600); await page.waitForTimeout(300); } await shot('walkedoff'); notes.push(`${name} walk it off: ${await card()} | ${JSON.stringify(await med())}`);
  const normD = await walk(); notes.push(`${name} 1 s walk after: ${normD} tiles (ratio ${(slowD / normD).toFixed(2)})`);
  await page.clock.fastForward(5 * 60e3 + 2000); await page.waitForTimeout(500);
  // 4) bump 2: sunburn (desktop, 45 s still in the sun) or a bee sting by the park flowerbeds (phones); then free treatment at the clinic
  if (name === 'desktop') { await put(46.5, 46.6); for (let i = 0; i < 60 && !(await med()).hurt; i++) await page.waitForTimeout(1000); }
  else { const spot = await page.evaluate(async () => { const W = await import('/src/world.js'), P = await import('/src/sim/place.js'); for (let ty = P.PARK.y; ty < P.PARK.y + P.PARK.h; ty++) for (let tx = P.PARK.x; tx < P.PARK.x + P.PARK.w; tx++) { if (W.isSolid(tx, ty) || W.MAP[ty][tx] === W.T.FLOWER) continue; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if ((i || j) && !W.isSolid(tx + i, ty + j) && W.MAP[ty + j][tx + i] === W.T.FLOWER) return [tx, ty]; } return null; });
    for (let k = 0; k < 12 && !(await page.evaluate(async () => (await import('/src/sim/medical.js')).beesAbout(Date.now()))); k++) { await page.clock.fastForward(60e3); await page.waitForTimeout(100); }
    await put(spot[0] + 0.5, spot[1] + 0.5); for (let i = 0; i < 16 && !(await med()).hurt; i++) await page.waitForTimeout(500);
    notes.push(`${name} bee spot ${spot} ` + JSON.stringify(await page.evaluate(async () => ({ bees: (await import('/src/sim/medical.js')).beesAbout(Date.now()), can: (await import('/src/sim/simstate.js')).pawWallet().canInjure?.(), at: [__inu.state.player.x / 32, __inu.state.player.y / 32] })))); }
  await page.waitForTimeout(400); await shot(name === 'desktop' ? 'sunburn' : 'sting'); notes.push(`${name} bump 2: ${await card()} | ${JSON.stringify(await med())}`);
  await put(59.5, 49.7); await page.waitForTimeout(800); await shot('at-clinic'); notes.push(`${name} at the clinic: ${await card()}`);
  if (name === 'desktop') { await open({ tab: 'clinic' }); await page.waitForTimeout(600); await shot('clinic-treat'); const b0 = (await med()).balance; await page.click('[data-chip]'); await page.waitForTimeout(600); await shot('clinic-treated'); notes.push(`desktop chip-in: ${(await txt('#pab-body .pab-row')).slice(0, 160)} | balance ${b0} -> ${(await med()).balance}`); await close(); }
  else { const b0 = (await med()).balance; await page.click('#pab-med [data-k="treat"]'); await page.waitForTimeout(600); await shot('treated'); notes.push(`${name} free treatment (co-pay waived): ${await card()} | balance ${b0} -> ${(await med()).balance}`); }
  await page.clock.fastForward(5 * 60e3 + 2000); await page.waitForTimeout(500);
  // 5) bump 3: a tummy ache 15 s after a café visit, then bumps off from the card
  await put(4.5, 19.5); await page.evaluate(() => __inu.open('cafe', {})); await page.waitForTimeout(800); await close(); await page.waitForTimeout(300); await put(6.5, 20.5);
  for (let i = 0; i < 25 && !(await med()).hurt; i++) await page.waitForTimeout(1000); await shot('tummy'); notes.push(`${name} tummy: ${await card()} | ${JSON.stringify(await med())}`);
  await page.click('#pab-med [data-k="out"]').catch(() => {}); await page.waitForTimeout(600); notes.push(`${name} bumps off: ${JSON.stringify(await med())} | walk factor ${await page.evaluate(async () => (await import('/src/sim/bureau.js')).walkFactor())}`);
  // 6) a medic shift (the desk wage cooldown has passed): start, walk to the + , the mini-task with one slip, paid
  await open({ tab: 'clinic' }); await page.waitForTimeout(500); await page.click('[data-m="shift"]'); await page.waitForTimeout(300); await page.click('[data-start]'); await page.waitForTimeout(400); await shot('shift-start'); await close();
  const c = await page.evaluate(async () => { const m = await import('/src/sim/clinic.js'); const s = (await import('/src/sim/clinicui.js')).clinic().shift; return { x: s.c.x, y: s.c.y, start: s.c.start, name: s.c.name, ail: s.c.ail }; });
  const wait = c.start - (await page.evaluate(() => Date.now())); if (wait > 0) { await page.clock.fastForward(wait + 500); await page.waitForTimeout(300); }
  await put(c.x + 0.5, c.y + 0.9, false); await cam(c.x, c.y); await page.waitForTimeout(1500); await shot('shift-call');
  const order = await page.evaluate(async () => { const s = (await import('/src/sim/clinicui.js')).clinic().shift; return s?.state === 'task' ? s.order : null; }); notes.push(`${name} medic call: ${c.name} (${c.ail}) task ${order ? 'open' : 'NOT open'} | ${await card()}`);
  if (order) { await page.click(`#pab-med [data-i="${order.find((i) => i !== 0) ?? 1}"]`).catch(() => {}); await page.waitForTimeout(200); await shot('shift-task');
    for (let i = 0; i < 3; i++) { await page.click(`#pab-med [data-i="${i}"]`).catch(() => {}); await page.waitForTimeout(250); } await page.waitForTimeout(600); await shot('shift-paid'); notes.push(`${name} shift result: ${await card()}`);
    await page.waitForTimeout(1500); await shot('shift-treatedpup'); }
  for (let i = 0; i < 3; i++) { await page.clock.fastForward(3000); await page.waitForTimeout(1500); } notes.push(`${name} anchored: ${JSON.stringify(await med())}`);
  await open({ tab: 'clinic' }); await page.waitForTimeout(1200); await shot('clinic-record'); notes.push(`${name} record: ${(await txt('#pab-body')).slice(0, 420)}`); await close();
  await ctx.close();
}
writeFileSync(`${OUT}panels${TAG}.json`, JSON.stringify(panels, null, 1));
try { const r = await fetch(new globalThis.URL('/api/sim-audit', URL)); if (r.ok) { const j = await r.json(); writeFileSync(`${OUT}report${TAG}.json`, JSON.stringify(j, null, 2)); notes.push(`report JSON: ${j.summary.checks.pass}/12 checks, findings ${JSON.stringify(j.summary.findings)}`); } else notes.push('report JSON: HTTP ' + r.status); } catch (e) { notes.push('report JSON: ' + e.message); }
console.log(notes.join('\n')); console.log('errors', JSON.stringify(errs)); await b.close();

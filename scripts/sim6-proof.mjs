// Phase 6 proof: the Emberpaw Firehouse and the Crumb and Co. bakery kiosk in the world, the fire panel (Call board /
// Firefighter shift / Crew / Rules), join + town events on, a seeded incident at its hashed time (the engine roll-out from
// the bay with ONE siren, the crew at work, a bigger event with the constable's tape and a medic standing by, then "sorted"),
// a firefighter shift (walk to the incident, the mini-task with a slip, paid an ordinary wage, anchored), the card placement
// and the ☰ check on the fire panel. URL=http://localhost:8672/ OUT=proof node scripts/sim6-proof.mjs
import { chromium } from 'playwright'; import { writeFileSync, mkdirSync } from 'node:fs';
const URL = process.env.URL || 'http://localhost:8672/', OUT = (process.env.OUT || 'proof') + '/sim6-', TAG = process.env.TAG || '', ONLY = process.env.ONLY, b = await chromium.launch(), errs = [], notes = [], panels = {}, sirens = {};
mkdirSync(process.env.OUT || 'proof', { recursive: true });
const VIEWS = [['desktop', { width: 1280, height: 800 }, false], ['667x375', { width: 667, height: 375 }, true], ['750x342', { width: 750, height: 342 }, true], ['844x390', { width: 844, height: 390 }, true]].filter((v) => !ONLY || ONLY.split(',').includes(v[0]));
for (const [name, viewport, phone] of VIEWS) { try { await runView(name, viewport, phone); } catch (e) { errs.push(`${name} proof step failed: ${e.message.split('\n')[0]}`); } }
async function runView(name, viewport, phone) {
  const ctx = await b.newContext({ viewport, isMobile: phone, hasTouch: phone, deviceScaleFactor: phone ? 2 : 1 }), page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(name + ': ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_|net::/.test(m.text())) errs.push(name + ' console: ' + m.text()); });
  await page.clock.install({ time: Date.now() - 30 * 60e3 }); await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(1200); await page.click('#start').catch(() => {}); await page.waitForTimeout(1200); await page.getByText(/skip tour/i).first().click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(400);
  await page.evaluate(() => { __inu.setHour(11); __inu.setRain?.(0); });
  const put = (x, y, cam = true) => page.evaluate(([x, y, cam]) => { const s = __inu.state; s.player.x = x * 32; s.player.y = y * 32; globalThis.__camLock = cam ? { x: x * 32, y: y * 32 } : null; }, [x, y, cam]);
  const cam = (x, y) => page.evaluate(([x, y]) => { globalThis.__camLock = { x: x * 32, y: y * 32 }; }, [x, y]);
  const close = () => page.evaluate(() => document.querySelector('#panel-close')?.click()), shot = async (k) => { await page.waitForTimeout(400); return page.screenshot({ path: `${OUT}${k}-${name}${TAG}.png` }); };
  const open = (o) => page.evaluate((o) => __inu.open('bureau', o), o), txt = (s) => page.evaluate((s) => document.querySelector(s)?.innerText.replace(/\s+/g, ' ') || 'none', s);
  const fire = () => page.evaluate(async () => { const s = (await import('/src/sim/simstate.js')).pawWallet().state(), F = (await import('/src/sim/fireui.js')).firehouse(); return { balance: s.balance, unsynced: s.unsynced, anchoredSeq: s.anchoredSeq, server: s.server, events: s.fire.events, callsToday: s.fire.callsToday, calls: s.fire.calls, sirensAsked: F.sirens, sirensPlayed: globalThis.__inuSirens || 0 }; });
  const card = () => txt('#pab-fire:not([hidden])'), now = () => page.evaluate(() => Date.now());
  const ffTo = async (ms) => { const d = ms - (await now()); if (d > 0) await page.clock.fastForward(d); await page.waitForTimeout(300); };
  // 1) the station and the bakery kiosk in the world (events off: the crew wait at the bay)
  await put(58.5, 8.2, false); await cam(58.5, 5.6); await page.waitForTimeout(1200); await shot('station');
  await put(36.5, 42.2, false); await cam(36, 40.6); await page.waitForTimeout(900); await shot('bakery');
  // 2) the fire panel: not joined, join, tabs, town events on
  await open({ tab: 'fire' }); await page.waitForTimeout(700); await shot('fire-notjoined'); await page.click('#pab-body [data-join], [data-join]'); await page.waitForTimeout(500);
  for (const k of ['crew', 'rules', 'shift']) { await page.click(`[data-f="${k}"]`); await page.waitForTimeout(250); await shot(`fire-${k}`); }
  await page.click('[data-f="board"]'); await page.waitForTimeout(250); await page.click('[data-on]'); await page.waitForTimeout(500); await shot('fire-board'); notes.push(`${name} after opt-in: ${JSON.stringify(await fire())} | board: ${(await txt('#pab-body')).slice(0, 260)}`);
  const pr = await page.evaluate(() => { const c = document.getElementById('panel-close'), r = c.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2), m = document.getElementById('menu-btn'); const shown = !!m && getComputedStyle(m).display !== 'none'; const mr = shown ? m.getBoundingClientRect() : null;
    return { closeOnTop: hit === c || c.contains(hit), menuShown: shown, menuOverClose: !!(mr && !(mr.right <= r.left || mr.left >= r.right || mr.bottom <= r.top || mr.top >= r.bottom)) }; }); panels[name] = pr; notes.push(`${name} fire panel: ${JSON.stringify(pr)}`); await close(); await page.waitForTimeout(300);
  // 3) the next seeded incident (a bigger one on desktop and 844, an ordinary one on the other phones): roll-out + siren, at work, sorted
  const E = await page.evaluate(async (big) => { const F = await import('/src/sim/fire.js'), s0 = F.fireSlotAt(Date.now()); for (let k = 1; k < 200; k++) { const c = F.eventAt(s0 + k); if (!c.quiet && c.big === big) { const t = F.timeline(c); return { ...c, t }; } } }, name === 'desktop' || name === '844x390');
  const s0 = (await fire()).sirensAsked; await put(55.5, 8.0, false); await cam(55, 6.5); await ffTo(E.t.roll - 1200); await page.waitForTimeout(1500); await shot('roll'); await page.waitForTimeout(1500); const s1 = (await fire()).sirensAsked;
  await page.clock.fastForward(30e3); await page.waitForTimeout(400); const s2 = (await fire()).sirensAsked; // a second call inside the cooldown would be silent; the same run never sounds twice
  await put(E.stand[0] + 0.4, E.stand[1] + (E.road === 32 ? -1.6 : 2.4), false); await cam(E.stand[0], E.stand[1]); await ffTo(E.t.out + 4000); await page.waitForTimeout(800); await shot(E.big ? 'scene-big' : 'scene');
  const sc = await page.evaluate(async () => { const H = await import('/src/sim/firehouse.js'), s = H.sceneAt(Date.now(), { events: true }); return { incident: !!s.incident, working: Object.values(s.crew).filter((p) => p.working).length, constable: !!s.constable, engine: s.engine.beacon }; });
  await ffTo(E.t.done + 2500); await page.waitForTimeout(600); await shot('solved');
  sirens[name] = { atRoll: s1 - s0, after30s: s2 - s1, played: (await fire()).sirensPlayed };
  notes.push(`${name} incident ${E.kind} at ${E.name} (${E.big ? 'two-alarm' : 'ordinary'}): ${JSON.stringify(sc)}; sirens asked at roll-out ${s1 - s0}, in the next 30 s ${s2 - s1}, played by the audio gate ${sirens[name].played}`);
  if (s1 - s0 !== 1 || s2 - s1 !== 0) errs.push(`${name}: siren count ${s1 - s0}/${s2 - s1}`);
  // 4) a firefighter shift: start, walk to the incident, one slip, then the right order, paid
  await ffTo(E.t.home + 1000); await open({ tab: 'fire' }); await page.waitForTimeout(500); await page.click('[data-f="shift"]'); await page.waitForTimeout(300); await shot('shift-tab'); await page.click('[data-start]'); await page.waitForTimeout(400); await close();
  const c = await page.evaluate(async () => { const s = (await import('/src/sim/fireui.js')).firehouse().shift; return s ? { x: s.c.x, y: s.c.y, stand: s.c.stand, road: s.c.road, start: s.c.start, name: s.c.name, kind: s.c.kind } : null; });
  if (!c) { errs.push(`${name}: shift did not start`); await ctx.close(); return; }
  await page.waitForTimeout(500); await shot('shift-start'); notes.push(`${name} shift: ${c.kind} at ${c.name} | ${await card()}`);
  await ffTo(c.start + 500); await put(c.stand[0], c.stand[1], false); await cam(c.stand[0], c.stand[1]); await page.waitForTimeout(1500);
  const order = await page.evaluate(async () => { const s = (await import('/src/sim/fireui.js')).firehouse().shift; return s?.state === 'task' ? s.order : null; }); notes.push(`${name} at the incident: task ${order ? 'open' : 'NOT open'}`);
  if (order) { await page.click(`#pab-fire [data-i="${order.find((i) => i !== 0) ?? 1}"]`).catch(() => {}); await page.waitForTimeout(250); await shot('shift-task');
    for (let i = 0; i < 3; i++) { await page.click(`#pab-fire [data-i="${i}"]`).catch(() => {}); await page.waitForTimeout(250); } await page.waitForTimeout(600); await shot('shift-paid'); notes.push(`${name} shift result: ${await card()}`);
    const rect = await page.evaluate(() => { const r = document.querySelector('#pab-fire')?.getBoundingClientRect(), m = document.getElementById('menu-btn')?.getBoundingClientRect(), mm = document.querySelector('#minimap, canvas.minimap')?.getBoundingClientRect?.();
      const ov = (a, b) => !!(a && b && !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom)); return { card: r && [r.left, r.top, r.width, r.height].map(Math.round), inView: !!r && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, overMenu: ov(r, m), overMinimap: ov(r, mm) }; });
    notes.push(`${name} card placement: ${JSON.stringify(rect)}`); if (!rect.inView || rect.overMenu) errs.push(`${name}: fire card placement ${JSON.stringify(rect)}`);
    await page.waitForTimeout(1500); await shot('shift-sorted'); }
  for (let i = 0; i < 3; i++) { await page.clock.fastForward(3000); await page.waitForTimeout(1500); } notes.push(`${name} anchored: ${JSON.stringify(await fire())}`);
  await open({ tab: 'fire' }); await page.waitForTimeout(1000); await shot('fire-record'); notes.push(`${name} record: ${(await txt('#pab-body')).slice(0, 420)}`); await close();
  await ctx.close();
}
writeFileSync(`${OUT}panels${TAG}.json`, JSON.stringify({ panels, sirens }, null, 1));
try { const r = await fetch(new globalThis.URL('/api/sim-audit', URL)); if (r.ok) { const j = await r.json(); writeFileSync(`${OUT}report${TAG}.json`, JSON.stringify(j, null, 2)); notes.push(`report JSON: ${j.summary.checks.pass}/12 checks, findings ${JSON.stringify(j.summary.findings)}`); } else notes.push('report JSON: HTTP ' + r.status); } catch (e) { notes.push('report JSON: ' + e.message); }
console.log(notes.join('\n')); console.log('errors', JSON.stringify(errs)); await b.close();

// Phase 3 proof: police + rangers on patrol, precinct/ranger panels, warning -> fine -> detention with its ways out,
// ranger shift, notice-card placement at phone sizes, report JSON. URL=http://localhost:8671/ OUT=proof node scripts/sim3-proof.mjs
// Uses Playwright's fake clock only to skip the 60 s citation cooldown (fastForward); everything else is real gameplay.
import { chromium } from 'playwright'; import { writeFileSync, mkdirSync } from 'node:fs';
const URL = process.env.URL || 'http://localhost:8671/', OUT = (process.env.OUT || 'proof') + '/sim3-', TAG = process.env.TAG || '', ONLY = process.env.ONLY, b = await chromium.launch(), errs = [], notes = [];
mkdirSync(process.env.OUT || 'proof', { recursive: true });
const VIEWS = [['desktop', { width: 1280, height: 800 }, false], ['667x375', { width: 667, height: 375 }, true], ['750x342', { width: 750, height: 342 }, true], ['844x390', { width: 844, height: 390 }, true]].filter((v) => !ONLY || ONLY.split(',').includes(v[0]));
const WAYS = { desktop: 'walk it off', '667x375': 'bail', '750x342': 'leave the scene', '844x390': 'opt out' };
const boxes = (page) => page.evaluate(() => { const r = (s) => { const e = document.querySelector(s); if (!e || e.hidden || getComputedStyle(e).display === 'none' || getComputedStyle(e).visibility === 'hidden') return null; const b = e.getBoundingClientRect(); return b.width ? b : null; };
  const n = r('#pab-notice'); if (!n) return 'no notice'; const hit = []; for (const s of ['#stick', '#tbtns', '#btn-a', '#btn-b', '#prompt', '#guidechip', '#toast', '#minimap-wrap', '#hud', '#inu-wallet-btn', '#btn-menu']) { const o = r(s); if (o && !(o.right <= n.left || o.left >= n.right || o.bottom <= n.top || o.top >= n.bottom)) hit.push(s); }
  return `notice ${Math.round(n.width)}x${Math.round(n.height)} at ${Math.round(n.left)},${Math.round(n.top)}; overlaps: ${hit.join(', ') || 'none'}`; });
for (const [name, viewport, phone] of VIEWS) { try { await runView(name, viewport, phone); } catch (e) { errs.push(`${name} proof step failed: ${e.message.split('\n')[0]}`); } }
async function runView(name, viewport, phone) {
  const ctx = await b.newContext({ viewport, isMobile: phone, hasTouch: phone, deviceScaleFactor: phone ? 2 : 1 }), page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(name + ': ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_|net::/.test(m.text())) errs.push(name + ' console: ' + m.text()); });
  await page.clock.install(); await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(1200); await page.click('#start').catch(() => {}); await page.waitForTimeout(1200); await page.getByText(/skip tour/i).first().click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(400);
  await page.evaluate(() => { __inu.setHour(11); __inu.setRain?.(0); });
  const F = '/src/sim/force.js', put = (x, y, cam = true) => page.evaluate(([x, y, cam]) => { const s = __inu.state; s.player.x = x * 32; s.player.y = y * 32; if (cam) globalThis.__camLock = { x: x * 32, y: y * 32 }; }, [x, y, cam]);
  // 1) patrols in the world
  await put(14, 46.2); await page.waitForTimeout(1600); await page.screenshot({ path: `${OUT}precinct-kiosk-${name}${TAG}.png` });
  await put(39, 83); await page.waitForTimeout(1600); await page.screenshot({ path: `${OUT}ranger-station-${name}${TAG}.png` });
  const pipAt = async () => page.evaluate(async (F) => { const m = await import(F); const o = m.officersAt(__inu.time).find((x) => x.id === 'sim:pd-pip'); return [o.x, o.y]; }, F);
  { const [px] = await pipAt(); await put(Math.max(7, px - 1.5), 45.4); await page.waitForTimeout(1400); await page.screenshot({ path: `${OUT}police-patrol-${name}${TAG}.png` }); }
  // 2) not joined: standing in the road does nothing
  { for (let i = 0; i < 30; i++) { const [px] = await pipAt(); await put(Math.floor(px) + 0.5, 43.5); await page.waitForTimeout(100); } notes.push(`${name} not joined, 3 s in the road by Officer Pip: notice ${await page.evaluate(() => document.querySelector('#pab-notice:not([hidden])')?.innerText || 'none')}`); }
  // 3) join at the precinct, read the rules
  await page.evaluate(() => __inu.open('bureau', { tab: 'precinct' })); await page.waitForTimeout(900); await page.screenshot({ path: `${OUT}precinct-panel-${name}${TAG}.png` });
  await page.click('[data-join]'); await page.waitForTimeout(500); await page.click('[data-f="rules"]'); await page.waitForTimeout(300); await page.screenshot({ path: `${OUT}precinct-rules-${name}${TAG}.png` });
  if (name === 'desktop' || name === '844x390') { await page.click('[data-f="crew"]'); await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}precinct-officers-${name}${TAG}.png` }); }
  await page.evaluate(() => document.querySelector('#panel-close')?.click()); await page.waitForTimeout(300);
  await put(10.5, 46.5);
  // earn some wages first (3 desk shifts at the Bureau, 3 min apart) so fines and bail can be paid
  for (let k = 0; k < 3; k++) { await page.evaluate(() => __inu.open('bureau', { tab: 'wallet' })); await page.waitForTimeout(500); await page.click('[data-shift]');
    await page.evaluate(() => { for (const tr of document.querySelectorAll('#pab-shift [data-i]')) { const c = tr.querySelectorAll('code'); if (c[0].textContent !== c[1].textContent) { tr.click(); return; } } }); await page.waitForTimeout(400);
    await page.evaluate(() => document.querySelector('#panel-close')?.click()); await page.clock.fastForward(3 * 60e3 + 1000); await page.waitForTimeout(200); }
  notes.push(`${name} after 3 desk shifts: ${await page.evaluate(async () => (await import('/src/sim/simstate.js')).pawWallet().state().balance)} PM`);
  // 4) jaywalk three times (fake clock skips the 1-minute cooldown between citations)
  const jay = async (label) => { for (let i = 0; i < 40; i++) { const [px] = await pipAt(); await put(Math.floor(px) + 0.5, 43.5); await page.waitForTimeout(100); if (await page.evaluate(() => !document.querySelector('#pab-notice')?.hidden && /Warning|Citation|Detained/.test(document.querySelector('#pab-notice')?.innerText || ''))) break; }
    await page.waitForTimeout(250); const txt = await page.evaluate(() => document.querySelector('#pab-notice:not([hidden])')?.innerText.replace(/\s+/g, ' ') || 'none'); notes.push(`${name} ${label}: ${txt}`); };
  await jay('offence 1'); await page.screenshot({ path: `${OUT}warning-${name}${TAG}.png` }); notes.push(`${name} card placement: ${await boxes(page)}`);
  await put(10.5, 46.5); await page.clock.fastForward(61000); await page.waitForTimeout(300); await page.evaluate(() => document.querySelector('#pab-notice [data-k="x"]')?.click());
  await jay('offence 2'); await page.screenshot({ path: `${OUT}citation-${name}${TAG}.png` });
  await put(10.5, 46.5); await page.clock.fastForward(61000); await page.waitForTimeout(300); await page.evaluate(() => document.querySelector('#pab-notice [data-k="x"]')?.click());
  await jay('offence 3'); await page.evaluate(() => { __inu.state.player.y = 45.5 * 32; }); await page.waitForTimeout(600); await page.screenshot({ path: `${OUT}detained-${name}${TAG}.png` }); notes.push(`${name} detained card placement: ${await boxes(page)}`);
  // can still move + chat while detained: walk a few steps with the keyboard/stick
  const x0 = await page.evaluate(() => __inu.state.player.x); await page.evaluate(() => { globalThis.__camLock = null; });
  if (phone) { await page.evaluate(() => { const k = new KeyboardEvent('keydown', { key: 'd' }); window.dispatchEvent(k); }); } await page.keyboard.down('d'); await page.waitForTimeout(500); await page.keyboard.up('d');
  notes.push(`${name} moved while detained: ${Math.round((await page.evaluate(() => __inu.state.player.x)) - x0)} px; still detained: ${await page.evaluate(() => /Detained/.test(document.querySelector('#pab-notice')?.innerText || ''))}`);
  const way = WAYS[name];
  if (way === 'bail') await page.click('#pab-notice [data-k="bail"]');
  else if (way === 'opt out') await page.click('#pab-notice [data-k="out"]');
  else if (way === 'leave the scene') await put(25.5, 46.5, false);
  else { await page.click('#pab-notice [data-k="wait"]'); await page.waitForTimeout(300); await page.screenshot({ path: `${OUT}walk-it-off-${name}${TAG}.png` }); for (let i = 0; i < 47; i++) await page.clock.fastForward(1000); }
  await page.waitForTimeout(700); notes.push(`${name} way out "${way}": ${await page.evaluate(() => document.querySelector('#pab-notice:not([hidden])')?.innerText.replace(/\s+/g, ' ') || 'none')}`); await page.screenshot({ path: `${OUT}released-${name}${TAG}.png` });
  // 5) the record (evidence), at the precinct
  await page.evaluate(() => __inu.open('bureau', { tab: 'precinct' })); await page.waitForTimeout(900); await page.screenshot({ path: `${OUT}record-${name}${TAG}.png` });
  notes.push(`${name} record: ${await page.evaluate(() => document.querySelector('#pab-body')?.innerText.replace(/\s+/g, ' ').slice(0, 240))}`); await page.evaluate(() => document.querySelector('#panel-close')?.click());
  // 6) ranger shift (desktop + 844x390)
  if (name === 'desktop' || name === '844x390') { if (way === 'opt out') { await page.evaluate(() => __inu.open('bureau', { tab: 'rangers' })); await page.waitForTimeout(500); await page.click('[data-join]').catch(() => {}); await page.evaluate(() => document.querySelector('#panel-close')?.click()); }
    await page.clock.fastForward(3 * 60e3 + 1000); await put(38.5, 82.6); await page.evaluate(() => __inu.open('bureau', { tab: 'rangers' })); await page.waitForTimeout(800); await page.screenshot({ path: `${OUT}ranger-panel-${name}${TAG}.png` });
    await page.click('[data-start]'); await page.waitForTimeout(300); await page.evaluate(() => document.querySelector('#panel-close')?.click()); await page.waitForTimeout(600);
    const lit = await page.evaluate(async () => (await import('/src/sim/patrolui.js')).patrol().litter().map((l) => [l.x, l.y])); notes.push(`${name} litter: ${lit.map((l) => l.map((v) => v.toFixed(1)).join(',')).join(' | ')}`);
    await put(lit[0][0], lit[0][1] + 1.5); await page.waitForTimeout(900); await page.screenshot({ path: `${OUT}ranger-litter-${name}${TAG}.png` });
    for (const [x, y] of lit) { await put(x, y, true); await page.waitForTimeout(250); } await page.clock.fastForward(41000); await page.waitForTimeout(600); notes.push(`${name} shift debug: ${await page.evaluate(async () => { const P = (await import('/src/sim/patrolui.js')).patrol(); const w = (await import('/src/sim/simstate.js')).pawWallet(); return JSON.stringify({ shift: P.shift && { start: P.shift.start, now: Date.now(), got: P.shift.litter.filter((l) => l.got).length }, q: w.quote('wage'), mode: __inu.mode, panel: __inu.panel }); })}`);
    notes.push(`${name} ranger shift: ${await page.evaluate(() => document.querySelector('#pab-notice:not([hidden])')?.innerText.replace(/\s+/g, ' ') || 'none')}`); await page.screenshot({ path: `${OUT}ranger-paid-${name}${TAG}.png` }); }
  if (name === 'desktop') { await put(20, 45); await page.waitForTimeout(500); const fps = await page.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(Math.round(n / ((performance.now() - t0) / 1000))); }; requestAnimationFrame(f); })); notes.push(`desktop fps near police patrol: ${fps}`); }
  await ctx.close();
}
try { const r = await fetch(new globalThis.URL('/api/sim-audit', URL)); if (r.ok) { const j = await r.json(); writeFileSync(`${OUT}report${TAG}.json`, JSON.stringify(j, null, 2)); notes.push(`report JSON: ${j.summary.checks.pass}/12 checks, findings ${JSON.stringify(j.summary.findings)}; check 11 scope ${j.checks[10].scope}`); } else notes.push('report JSON: HTTP ' + r.status); } catch (e) { notes.push('report JSON: ' + e.message); }
console.log(notes.join('\n')); console.log('errors', JSON.stringify(errs)); await b.close();

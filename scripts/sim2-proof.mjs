// Phase 2 proof: Pawmarks wallet tab (join + desk shift + anchor sync), bank readout, Connect Wallet vs panel headers on
// phones, solid banner pole, report JSON + /api/sim-log. URL=http://localhost:8671/ OUT=proof node scripts/sim2-proof.mjs
import { chromium } from 'playwright'; import { writeFileSync, mkdirSync } from 'node:fs';
const URL = process.env.URL || 'http://localhost:8671/', OUT = (process.env.OUT || 'proof') + '/sim2-', TAG = process.env.TAG || '', b = await chromium.launch(), errs = [], notes = [];
mkdirSync(process.env.OUT || 'proof', { recursive: true });
const VIEWS = [['desktop', { width: 1280, height: 800 }, false], ['667x375', { width: 667, height: 375 }, true], ['750x342', { width: 750, height: 342 }, true], ['844x390', { width: 844, height: 390 }, true]];
const pill = (page) => page.evaluate(() => { const el = document.querySelector('#inu-wallet-btn'); if (!el) return 'absent'; const cs = getComputedStyle(el), r = el.getBoundingClientRect(); return `${cs.visibility}${r.width ? '' : ' (0 size)'}`; });
const overlap = (page) => page.evaluate(() => { const a = document.querySelector('#inu-wallet-btn'), h = document.querySelector('#panel h2, #panel .head, #panel header, #panel-title'); if (!a || !h) return 'n/a'; const x = a.getBoundingClientRect(), y = h.getBoundingClientRect(); const hit = !(x.right < y.left || x.left > y.right || x.bottom < y.top || x.top > y.bottom); return hit && getComputedStyle(a).visibility === 'visible' ? 'COVERS header' : 'clear'; });
for (const [name, viewport, phone] of VIEWS) {
  const ctx = await b.newContext({ viewport, isMobile: phone, hasTouch: phone, deviceScaleFactor: phone ? 2 : 1 }), page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(name + ': ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_|net::/.test(m.text())) errs.push(name + ' console: ' + m.text()); });
  await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(1200); await page.click('#start').catch(() => {}); await page.waitForTimeout(1200); await page.getByText(/skip tour/i).first().click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(500);
  notes.push(`${name} Connect Wallet, no panel open: ${await pill(page)}`); await page.screenshot({ path: `${OUT}wallet-pill-no-panel-${name}${TAG}.png` });
  // solid pole: try walking straight into it from the east
  if (name === 'desktop') { const r = await page.evaluate(async () => { const s = __inu.state; s.player.x = 21.5 * 32; s.player.y = 74.5 * 32; return null; }); await page.keyboard.down('a'); await page.waitForTimeout(1500); await page.keyboard.up('a');
    notes.push(`pole: player stopped at x=${await page.evaluate(() => (__inu.state.player.x / 32).toFixed(2))} (pole tile 19, so x must stay >= 20)`); await page.evaluate(() => { globalThis.__camLock = { x: 21 * 32, y: 75 * 32 }; }); await page.waitForTimeout(800); await page.screenshot({ path: `${OUT}pole-solid${TAG}.png` }); }
  await page.evaluate(() => { const s = __inu.state; s.player.x = 23.5 * 32; s.player.y = 76.6 * 32; s.player.face = 'up'; globalThis.__camLock = { x: 23.5 * 32, y: 76 * 32 }; __inu.setHour(11); __inu.setRain?.(0); });
  await page.waitForTimeout(1200); await page.evaluate(() => __inu.open('bureau')); await page.waitForTimeout(1500);
  notes.push(`${name} Connect Wallet with Bureau panel open: ${await pill(page)}; header ${await overlap(page)}`);
  await page.click('[data-pab="wallet"]'); await page.waitForTimeout(400); await page.screenshot({ path: `${OUT}wallet-tab-${name}${TAG}.png` });
  await page.click('[data-join]'); await page.waitForTimeout(600); await page.click('[data-shift]'); await page.waitForTimeout(300); await page.screenshot({ path: `${OUT}desk-shift-${name}${TAG}.png` });
  await page.evaluate(() => { for (const tr of document.querySelectorAll('#pab-shift [data-i]')) { const c = tr.querySelectorAll('code'); if (c[0].textContent !== c[1].textContent) { tr.click(); return; } } });
  await page.waitForTimeout(400); notes.push(`${name} shift: ${await page.evaluate(() => document.querySelector('#pab-shift')?.textContent.trim())}`); await page.waitForTimeout(3500);
  await page.screenshot({ path: `${OUT}wallet-paid-${name}${TAG}.png` });
  notes.push(`${name} wallet: ${await page.evaluate(() => document.querySelector('.pab-wal')?.innerText.replace(/\s+/g, ' '))} | header chip: ${await page.evaluate(() => document.querySelector('#pab-mine')?.textContent)}`);
  await page.evaluate(() => __inu.open('bank')); await page.waitForTimeout(1500); await page.evaluate(() => document.querySelector('[data-pab-readout]')?.scrollIntoView({ block: 'center' })); await page.waitForTimeout(300); notes.push(`${name} bank readout: ${await page.evaluate(() => document.querySelector('#panel-body .pab-bankpm, #panel-body [data-pab-readout]')?.innerText.replace(/\s+/g, ' ') || 'missing')}`);
  notes.push(`${name} Connect Wallet with Bank panel open: ${await pill(page)}; header ${await overlap(page)}`); await page.screenshot({ path: `${OUT}bank-readout-${name}${TAG}.png` });
  await page.evaluate(() => document.querySelector('#panel-close, #panel .close, [data-close]')?.click()); await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(600);
  notes.push(`${name} Connect Wallet after closing: ${await pill(page)}`);
  if (name === 'desktop') { const fps = await page.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(Math.round(n / ((performance.now() - t0) / 1000))); }; requestAnimationFrame(f); })); notes.push(`desktop fps: ${fps}`); }
  await ctx.close();
}
try { const r = await fetch(new globalThis.URL('/api/sim-audit', URL)); if (r.ok) { const j = await r.json(); writeFileSync(`${OUT}report${TAG}.json`, JSON.stringify(j, null, 2)); notes.push(`report JSON: ${j.summary.checks.pass}/12 checks, findings ${JSON.stringify(j.summary.findings)}`); } else notes.push('report JSON: HTTP ' + r.status); } catch (e) { notes.push('report JSON: ' + e.message); }
try { const r = await fetch(new globalThis.URL('/api/sim-log?pid=p0000000000000000', URL)); notes.push(`/api/sim-log GET: HTTP ${r.status} ${(await r.text()).slice(0, 120)}`); const p = await fetch(new globalThis.URL('/api/sim-log', URL), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pid: 'p0000000000000000', token: '0'.repeat(48), entries: [{ seq: 0, value: { amount: 99, unit: 'BONES' } }] }) }); notes.push(`/api/sim-log POST bogus: HTTP ${p.status} ${(await p.text()).slice(0, 120)}`); } catch (e) { notes.push('sim-log: ' + e.message); }
console.log(notes.join('\n')); console.log('errors', JSON.stringify(errs)); await b.close();

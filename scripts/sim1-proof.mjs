// Paw Audit Bureau proof: the desk + Watchdogs in the world, the report panel (3 tabs), phone landscape, and the report JSON.
// URL=http://localhost:8644/ node scripts/sim1-proof.mjs   (OUT=proof dir, default proof/)
import { chromium } from 'playwright'; import { writeFileSync, mkdirSync } from 'node:fs';
const URL = process.env.URL || 'http://localhost:8671/', OUT = (process.env.OUT || 'proof') + '/sim1-', TAG = process.env.TAG || '', b = await chromium.launch(), errs = [], notes = [];
mkdirSync(process.env.OUT || 'proof', { recursive: true });
const VIEWS = [['desktop', { width: 1280, height: 800 }, false], ['667x375', { width: 667, height: 375 }, true], ['750x342', { width: 750, height: 342 }, true], ['844x390', { width: 844, height: 390 }, true]];
for (const [name, viewport, phone] of VIEWS) {
  const ctx = await b.newContext({ viewport, isMobile: phone, hasTouch: phone, deviceScaleFactor: phone ? 2 : 1 }), page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(name + ': ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_|net::/.test(m.text())) errs.push(name + ' console: ' + m.text()); });
  await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(1200); await page.click('#start').catch(() => {}); await page.waitForTimeout(1200); await page.getByText(/skip tour/i).first().click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(300);
  await page.evaluate(() => { const s = __inu.state; s.player.x = 23.5 * 32; s.player.y = 76.6 * 32; s.player.face = 'up'; globalThis.__camLock = { x: 23.5 * 32, y: 76 * 32 }; __inu.setHour(11); __inu.setRain?.(0); });
  await page.waitForTimeout(2500); await page.screenshot({ path: `${OUT}bureau-office-${name}${TAG}.png` });
  const prompt = await page.evaluate(() => document.querySelector('#prompt')?.textContent || ''); notes.push(`${name} prompt: ${prompt}`);
  if (phone) await page.click('#prompt').catch(async () => page.evaluate(() => __inu.open('bureau'))); else await page.keyboard.press('e');
  await page.waitForTimeout(900); notes.push(`${name} panel: ${await page.evaluate(() => __inu.panel)}`);
  if (await page.evaluate(() => __inu.panel) !== 'bureau') await page.evaluate(() => __inu.open('bureau'));
  await page.waitForTimeout(1500); await page.screenshot({ path: `${OUT}report-panel-${name}${TAG}.png` });
  notes.push(`${name} live chip: ${await page.evaluate(() => document.querySelector('#pab-live')?.textContent)}`);
  if (name === 'desktop' || name === '844x390') { await page.click('[data-pab="team"]'); await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}members-${name}${TAG}.png` });
    await page.click('[data-pab="log"]'); await page.waitForTimeout(300); await page.screenshot({ path: `${OUT}action-log-${name}${TAG}.png` });
    await page.click('[data-t="edit"]'); await page.waitForTimeout(300); await page.screenshot({ path: `${OUT}action-log-tampered-${name}${TAG}.png` });
    notes.push(`${name} tamper: ${await page.evaluate(() => document.querySelector('.pab .pab-chip:nth-child(3)')?.textContent)}`); }
  if (name === 'desktop') { await page.evaluate(() => document.querySelector('#panel-close, .close, [data-close]')?.click()); await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    await page.evaluate(() => { globalThis.__camLock = { x: 26 * 32, y: 75.5 * 32 }; __inu.setZoom?.(2); }); await page.waitForTimeout(1500); await page.screenshot({ path: `${OUT}bureau-closeup${TAG}.png` });
    const fps = await page.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(Math.round(n / ((performance.now() - t0) / 1000))); }; requestAnimationFrame(f); })); notes.push(`desktop fps near the Bureau: ${fps}`); }
  await ctx.close();
}
try { const r = await fetch(new globalThis.URL('/api/sim-audit', URL)); if (r.ok) { const j = await r.json(); writeFileSync(`${OUT}report${TAG}.json`, JSON.stringify(j, null, 2)); notes.push(`report JSON: ${j.summary.checks.pass}/12 checks, findings ${JSON.stringify(j.summary.findings)}`); } else notes.push('report JSON: HTTP ' + r.status); } catch (e) { notes.push('report JSON: ' + e.message); }
console.log(notes.join('\n')); console.log('errors', JSON.stringify(errs)); await b.close();

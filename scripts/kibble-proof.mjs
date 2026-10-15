// Real-mode vs demo proof for $KIBBLE wiring. Asserts: no fake balance without ?demo=1, launching-soon purchases, footer legal links, demo still works.
import { chromium } from 'playwright';
const URL = process.env.URL || 'http://localhost:8643/', b = await chromium.launch(), errs = [], fails = [];
const ok = (c, m) => { console.log(c ? 'PASS' : 'FAIL', m); if (!c) fails.push(m); };
async function run(q, vp, tag) {
  const page = await b.newPage({ viewport: vp }); page.on('pageerror', (e) => errs.push(tag + ': ' + e.message));
  await page.goto(URL + q); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(900); await page.click('#start'); await page.waitForTimeout(1200);
  await page.waitForFunction(() => document.body.dataset.kibble, null, { timeout: 15000 }).catch(() => {});
  return page;
}
let p = await run('', { width: 1280, height: 800 }, 'real');
const mode = await p.evaluate(() => document.body.dataset.kibble); ok(['soon', 'live', 'offline'].includes(mode), 'real mode = ' + mode);
ok((await p.textContent('#kibble')) !== '20.00', 'HUD shows no fake KIBBLE: ' + (await p.textContent('#kibble')));
ok(await p.evaluate(() => __inu.state.kibble === 0), 'state.kibble = 0 in real mode');
ok(await p.locator('a[href*="terms.html"]').count() > 0 && await p.locator('a[href*="prize-rules.html"]').count() > 0, 'footer Terms + Prize Rules links');
const r = await p.evaluate(async () => { const m = await import('/src/pets.js'); return m.buyPet(__inu.state, 'dragon'); });
ok(!r.ok && /launching soon/i.test(r.reason), 'exotic pet purchase -> ' + r.reason);
await p.screenshot({ path: 'proof/kibble-real-mode.png' });
await p.evaluate(() => __inu.openPanel?.('mall', {})).catch(() => {}); await p.waitForTimeout(400); await p.screenshot({ path: 'proof/kibble-real-mall.png' });
p = await run('?demo=1', { width: 1280, height: 800 }, 'demo');
ok(await p.evaluate(() => document.body.dataset.kibble) === 'demo', 'demo mode with ?demo=1');
ok((await p.textContent('#kibble')) === '20.00', 'demo HUD 20.00 fake KIBBLE');
const d = await p.evaluate(async () => { const m = await import('/src/pets.js'); __inu.state.kibble = 500; return m.buyPet(__inu.state, 'dragon'); }); ok(d.ok, 'demo exotic pet buy works');
await p.screenshot({ path: 'proof/kibble-demo-mode.png' });
p = await run('', { width: 844, height: 390 }, 'phone'); await p.screenshot({ path: 'proof/kibble-phone-landscape.png' });
ok(await p.evaluate(() => document.body.classList.contains('landscape')), 'phone landscape layout');
console.log('errors', JSON.stringify(errs)); await b.close(); if (fails.length || errs.length) process.exit(1); console.log('ALL PASS');

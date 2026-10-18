// Proof for the $KIBBLE mood plaza, Clean Launch badges and Kibble Kennel cosmetics.
//   URL=https://inu-verse-tawny.vercel.app/ OUT=proof/kibble-live node scripts/kibble-features-proof.mjs [moods|card|clean|kennel|all]
import { chromium } from 'playwright';
import fs from 'node:fs';
const URL0 = (process.env.URL || 'http://localhost:8651/').replace(/\/?$/, '/'), OUT = process.env.OUT || 'proof/kibble', what = process.argv[2] || 'all';
const VIEWS = [[844, 390], [667, 375]];
fs.mkdirSync(OUT.replace(/\/[^/]*$/, '') || '.', { recursive: true });
const log = [], L = (m) => { console.log(m); log.push(m); };
const browser = await chromium.launch();
async function open(q, [w, h] = VIEWS[0], { touch = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.errs = errs;
  await p.goto(URL0 + q, { waitUntil: 'domcontentloaded' }); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.mp.off', '1'); }); await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#start'); await p.waitForTimeout(500); await p.click('#start'); await p.waitForTimeout(1200);
  for (let i = 0; i < 3; i++) { const sk = await p.$('#t-skip'); if (sk && await sk.isVisible()) { await sk.click(); await p.waitForTimeout(300); } }
  await p.evaluate(() => document.querySelectorAll('.toast').forEach((t) => t.remove()));
  return p; }
const at = (p, tx, ty, cam, z = 1) => p.evaluate(([tx, ty, cam, z]) => { __inu.setZoom(z); const s = __inu.state.player; s.x = (tx + 0.5) * 32; s.y = (ty + 0.5) * 32; __inu.player.face = 'up'; globalThis.__camLock = cam ? { x: cam[0] * 32, y: cam[1] * 32 } : null; }, [tx, ty, cam, z]);
const shot = async (p, n) => { await p.evaluate(() => document.querySelectorAll('.toast').forEach((t) => t.remove())); const f = `${OUT}-${n}.png`; await p.screenshot({ path: f, animations: 'disabled' }); L('saved ' + f); };

if (what === 'moods' || what === 'all') for (const mood of ['zoomies', 'happy', 'chill', 'grumpy', 'doghouse']) {
  const p = await open('?mood=' + mood); await at(p, 22, 50, [22, 47.5]); await p.waitForTimeout(mood === 'doghouse' ? 9000 : 2500);
  const m = await p.evaluate(() => __inu.mood); L(`${mood}: shown=${m.shown} override=${m.override} crier=${JSON.stringify(await p.evaluate(() => globalThis.__crierSaid || null))}`);
  await shot(p, `mood-${mood}`); if (p.errs.length) L('page errors: ' + p.errs.join(' | ')); await p.context().close(); }
if (what === 'card' || what === 'all') {
  const p = await open(''); await at(p, 20, 48, [21.5, 47.5]); await p.waitForTimeout(4000);
  const m = await p.evaluate(() => __inu.mood); L('live mood response: ' + JSON.stringify(m));
  const said = await p.evaluate(() => globalThis.__crierSaid || []); L('crier announced: ' + JSON.stringify(said)); await shot(p, 'crier');
  await p.evaluate(() => __inu.open('kibblemood')); await p.waitForTimeout(400); await shot(p, 'statue-card');
  const ca = await p.textContent('#kmood-ca'); L('card CA: ' + ca + ' · NFA: ' + (await p.textContent('.nfa')));
  await p.evaluate(() => __inu.open('dailybone')); await p.waitForTimeout(300); await shot(p, 'daily-bone'); await p.click('[data-npcrules]'); await p.waitForTimeout(400); await shot(p, 'npc-rules'); L('npc lines said so far today: ' + await p.evaluate(() => localStorage.getItem('inuverse.npc.lines')));
  await p.evaluate(() => document.getElementById('panel-close').click()); await p.reload(); await p.waitForTimeout(500); await p.click('#start').catch(() => {}); await p.waitForTimeout(3000);
  L('after reload crier announced again? ' + JSON.stringify(await p.evaluate(() => globalThis.__crierSaid || []))); await p.context().close();
  for (const v of VIEWS) { const q = await open('?mood=grumpy', v); await at(q, 22, 50, [22, 47.5]); await q.waitForTimeout(2500); await shot(q, `weather-grumpy-${v[0]}x${v[1]}`); await q.evaluate(() => __inu.open('kibblemood')); await q.waitForTimeout(300); await shot(q, `statue-card-${v[0]}x${v[1]}`); await q.context().close(); } }
if (what === 'clean' || what === 'all') for (const v of VIEWS) { const p = await open('', v); const tag = v === VIEWS[0] ? '' : `-${v[0]}x${v[1]}`;
  await p.evaluate(() => __inu.open('launch', { tab: 'kibble' })); await p.waitForFunction(() => { const d = document.querySelector('[data-cleanslot] .cl-badge'); return d && !/CHECKING/.test(d.textContent); }, null, { timeout: 60000 }).catch(() => L('badge still checking after 60s'));
  const r = await p.evaluate(() => __clean('4VE9sy4fEMJdZ6i7MkYPbnqDJd2oqzJQmg44WJ3opump')); if (!tag) L('KIBBLE clean: ' + JSON.stringify({ overall: r?.overall, checks: Object.fromEntries(Object.entries(r?.checks || {}).map(([k, c]) => [k, c.status + (c.value != null ? ' ' + c.value : '') + ' - ' + c.note])), rpcCalls: r?.rpcCalls, cached: r?.cached }, null, 1));
  await p.evaluate(() => document.querySelector('[data-cleanslot]').scrollIntoView({ block: 'center' }) || window.scrollTo(0, 0) || (document.body.scrollTop = 0)); await p.waitForTimeout(1200); await shot(p, 'clean-badge' + tag);
  await p.click('[data-cleanslot] summary'); await p.waitForTimeout(600); await p.evaluate(() => document.querySelector('[data-cleanslot] .cl-body').scrollIntoView({ block: 'start' }) || window.scrollTo(0, 0) || (document.body.scrollTop = 0)); await shot(p, 'clean-breakdown' + tag);
  if (!tag) { await p.evaluate(() => __inu.open('launch', { tab: 'board' })); await p.waitForTimeout(6000); const n = await p.evaluate(() => document.querySelectorAll('#regboard [data-cleanslot]').length); L('board coins with a badge: ' + n);
    await p.waitForTimeout(n ? 15000 : 0); L('board badges: ' + JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('#regboard [data-cleanslot]')].map((e) => e.dataset.cleanslot.slice(0, 6) + ' ' + e.querySelector('summary').textContent))));
    await shot(p, 'clean-board'); }
  if (p.errs.length) L('page errors: ' + p.errs.join(' | ')); await p.context().close(); }
fs.writeFileSync(`${OUT}-${what}-log.txt`, log.join('\n') + '\n');
await browser.close();

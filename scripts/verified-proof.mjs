// Proof for the Verified Launch badge + town crier news.
//   URL=https://inu-verse-tawny.vercel.app/ OUT=proof/verified node scripts/verified-proof.mjs
// Badge/revoked/crier shots use ?verifiedpreview=1: labelled TEST FIXTURE coins (the live board has no opted-in coin yet).
import { chromium } from 'playwright';
import fs from 'node:fs';
const URL0 = (process.env.URL || 'http://localhost:8661/').replace(/\/?$/, '/'), OUT = process.env.OUT || 'proof/verified';
const VIEWS = [[844, 390], [667, 375]], FIXPASS = 'TestFixtureVerifiedPass11111111111111111111', FIXREV = 'TestFixtureVerifiedRevoked111111111111111111';
fs.mkdirSync(OUT.replace(/\/[^/]*$/, '') || '.', { recursive: true });
const log = [], L = (m) => { console.log(m); log.push(m); };
const browser = await chromium.launch();
async function open(q, [w, h]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, timezoneId: 'Australia/Sydney', locale: 'en-AU' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.errs = errs;
  await p.goto(URL0 + q, { waitUntil: 'domcontentloaded' }); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.mp.off', '1'); }); await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#start'); await p.waitForTimeout(500); await p.click('#start'); await p.waitForTimeout(1200);
  await skip(p); return p; }
async function skip(p) { for (let i = 0; i < 3; i++) { const sk = await p.$('#t-skip'); if (sk && await sk.isVisible()) { await sk.click(); await p.waitForTimeout(300); } } }
const at = (p, tx, ty, cam, z = 1) => p.evaluate(([tx, ty, cam, z]) => { __inu.setZoom(z); const s = __inu.state.player; s.x = (tx + 0.5) * 32; s.y = (ty + 0.5) * 32; __inu.player.face = 'up'; globalThis.__camLock = cam ? { x: cam[0] * 32, y: cam[1] * 32 } : null; }, [tx, ty, cam, z]);
const shot = async (p, n) => { await skip(p); await p.evaluate(() => document.querySelectorAll('.toast').forEach((t) => t.remove())); const f = `${OUT}-${n}.png`; await p.screenshot({ path: f }); L('saved ' + f); };
const closePanel = (p) => p.evaluate(() => { document.querySelector('#panel .close')?.click(); });

for (const v of VIEWS) { const tag = `${v[0]}x${v[1]}`;
  // 1) opt-in checkboxes, no fixture needed (real UI)
  let p = await open('', v);
  await p.evaluate(() => __inu.open('launch', { tab: 'board' })); await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelector('#reg-verified')?.scrollIntoView({ block: 'center' })); await p.waitForTimeout(300); await shot(p, `optin-register-${tag}`);
  L(`[${tag}] register opt-in checkbox present=${await p.$('#reg-verified') !== null} checked=${await p.evaluate(() => document.querySelector('#reg-verified')?.checked)}`);
  await p.evaluate(() => document.querySelector('[data-tab="launch"]').click()); await p.waitForSelector('#nx-verified', { timeout: 15000 }).catch(() => {});
  await p.evaluate(() => { const c = document.querySelector('#nx-verified'); if (c) { c.click(); c.closest('label').scrollIntoView({ block: 'center' }); } }); await p.waitForTimeout(400); await shot(p, `optin-create-${tag}`);
  L(`[${tag}] create-flow opt-in checkbox present=${await p.$('#nx-verified') !== null}`);
  const live = await p.evaluate(async () => { try { const r = await fetch('/api/coins'); const j = await r.json(); return { coins: j.coins.length, optedIn: j.coins.filter((c) => c.verifiedOptIn).length }; } catch (e) { return String(e); } });
  L(`[${tag}] live registry: ${JSON.stringify(live)}`);
  const vprobe = await p.evaluate(async () => { try { const r = await fetch('/api/coins?verified=4VE9sy4fEMJdZ6i7MkYPbnqDJd2oqzJQmg44WJ3opump'); return { status: r.status, body: await r.json() }; } catch (e) { return String(e); } });
  L(`[${tag}] live GET /api/coins?verified=<$KIBBLE, not opted in>: ${JSON.stringify(vprobe)}`);
  const news = await p.evaluate(async () => { try { const r = await fetch('/api/coins?news=1'); return { status: r.status, body: await r.json() }; } catch (e) { return String(e); } }); L(`[${tag}] live GET /api/coins?news=1: ${JSON.stringify(news)}`);
  if (p.errs.length) L(`[${tag}] page errors: ` + p.errs.join(' | ')); await p.context().close();

  // 2) labelled fixtures: crier headline in the plaza, then ads, board, card, breakdown, revoked
  p = await open('?verifiedpreview=1', v); await at(p, 22, 50, [22, 48.3], 1.5);
  await p.waitForFunction(() => (globalThis.__crierNews || []).length > 0, null, { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(500);
  L(`[${tag}] crier announced: ${JSON.stringify(await p.evaluate(() => globalThis.__crierNews || []))} banner="${await p.evaluate(() => document.getElementById('crier-banner')?.innerText.replace(/\s+/g, ' '))}"`);
  await shot(p, `crier-headline-${tag}`);
  await p.evaluate(() => { document.getElementById('crier-banner').className = ''; }); await at(p, 40, 17, [41, 15.2], 2); await p.waitForTimeout(1200); await shot(p, `ad-launchhall-sign-${tag}`);
  // billboard bb1: wait for the rotation to land on the verified fixture coin, then tap it
  await at(p, 44, 47, [44, 45], 2); let ok = false;
  for (let i = 0; i < 50 && !ok; i++) { ok = await p.evaluate(() => { const a = __ads(); const t = a.trend; return t.length && t[(a.adRot + a.adIdx) % t.length]?.verified; }); if (!ok) await p.waitForTimeout(1000); }
  await p.waitForTimeout(300); await shot(p, `ad-billboard-${tag}`); L(`[${tag}] billboard showing verified coin: ${ok}`);
  const pt = await p.evaluate(() => { const c = __inu.cam, z = __inu.zoom; return { x: (41 * 32 + 60 - c.x) * z + innerWidth / 2, y: (44.3 * 32 + 12 - c.y) * z + innerHeight / 2 }; });
  await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(1500);
  L(`[${tag}] tap billboard -> panel=${JSON.stringify(await p.evaluate(() => ({ kind: __inu.panel, coin: __inu.panelObj?.coin, vfOpen: __inu.panelObj?.vfOpen })))}`);
  if (await p.evaluate(() => __inu.panel !== 'launch')) await p.evaluate((m) => __inu.open('launch', { tab: 'board', coin: m, vfOpen: true }), FIXPASS);
  await p.waitForTimeout(800); await p.evaluate(() => document.querySelector('[data-coincard]')?.scrollIntoView({ block: 'start' })); await shot(p, `card-breakdown-${tag}`);
  await p.evaluate(() => document.querySelector('[data-coincard] .vf-list')?.scrollIntoView({ block: 'end' })); await p.waitForTimeout(200); await shot(p, `card-breakdown-sources-${tag}`);
  L(`[${tag}] card badge text: ${await p.evaluate(() => document.querySelector('[data-coincard] .vf-txt')?.innerText)}`);
  await p.evaluate(() => document.querySelector('[data-cardclose]')?.click()); await p.waitForTimeout(300);
  await p.evaluate(() => document.getElementById('vfnews')?.scrollIntoView({ block: 'start' })); await p.waitForTimeout(300); await shot(p, `newspaper-card-${tag}`);
  await p.evaluate(() => document.getElementById('regboard')?.scrollIntoView({ block: 'start' })); await p.waitForTimeout(300); await shot(p, `board-${tag}`);
  const rows = await p.evaluate(() => [...document.querySelectorAll('.regcoin')].map((r) => r.querySelector('b').innerText + ' => ' + (r.querySelector('.vf-txt')?.innerText || '(nothing shown)')));
  L(`[${tag}] board rows: ${JSON.stringify(rows)}`);
  await p.evaluate((m) => { const d = document.querySelector(`#regboard details[data-vf="${m}"]`); d.open = true; d.closest('.regcoin').scrollIntoView({ block: 'start' }); }, FIXREV); await p.waitForTimeout(300); await shot(p, `revoked-fixture-${tag}`);
  L(`[${tag}] revoked: ${await p.evaluate((m) => document.querySelector(`#regboard details[data-vf="${m}"] .vf-why`)?.innerText, FIXREV)}`);
  if (p.errs.length) L(`[${tag}] page errors: ` + p.errs.join(' | ')); await p.context().close(); }
fs.writeFileSync(`${OUT}-log.txt`, log.join('\n') + '\n');
await browser.close();

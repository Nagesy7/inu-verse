// Proof for batch "meme-tech" (Oct 18): $KIBBLE-default Launch Hall route + fees, Boss Raids, One Inu Score, /reveal.
//   URL=https://inu-verse-tawny.vercel.app/ node scripts/mt-proof.mjs   → proof/mt-*.png + proof/mt-proof.log
// The launch review uses the live /api/launch dry run (simulation only; nothing is signed or sent).
import { chromium } from 'playwright';
import fs from 'node:fs';
const URL0 = (process.env.URL || 'https://inu-verse-tawny.vercel.app/').replace(/\/?$/, '/'), KP = 'https://kibble-pay.vercel.app';
const VIEWS = [[844, 390], [667, 375]], OUT = 'proof/mt', log = [], L = (m) => { console.log(m); log.push(m); };
const browser = await chromium.launch();
async function ctxPage([w, h], touch = true) { const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 2 }); const p = await ctx.newPage(); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); return p; }
async function open(v) { const p = await ctxPage(v);
  await p.goto(URL0, { waitUntil: 'domcontentloaded' }); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.mp.off', '1'); }); await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#start'); await p.waitForTimeout(500); await p.click('#start'); await p.waitForTimeout(1200);
  for (let i = 0; i < 3; i++) { const sk = await p.$('#t-skip'); if (sk && await sk.isVisible()) { await sk.click(); await p.waitForTimeout(300); } }
  return p; }
const clean = (p) => p.evaluate(() => { document.querySelectorAll('.toast').forEach((t) => t.remove()); const g = document.getElementById('guide-ui') || document.querySelector('.guide'); if (g) g.style.display = 'none'; });
const shot = async (p, n) => { await clean(p); const f = `${OUT}-${n}.png`; await p.screenshot({ path: f, animations: 'disabled' }); L('saved ' + f); };
for (const v of VIEWS) { const tag = `${v[0]}x${v[1]}`;
  // 1) Launch Hall: $KIBBLE default + route/fees preview, then the dry-run review card shown before the wallet opens
  let p = await open(v); await p.evaluate(() => __inu.open('launch', { tab: 'launch' })); await p.waitForSelector('#nx-pair'); await p.waitForTimeout(800);
  L(`[${tag}] default pair: ${await p.$eval('#nx-pair', (s) => s.value)}`);
  await p.fill('#nx-dev', '0.01'); await p.dispatchEvent('#nx-dev', 'change'); await p.waitForTimeout(300);
  await p.evaluate(() => document.getElementById('nx-plan').scrollIntoView({ block: 'center' })); await p.waitForTimeout(300); await shot(p, `launch-route-${tag}`);
  const built = await p.evaluate(async () => { const kit = await import('/src/vendor/phantom-kit.js'); const mint = kit.Keypair.generate().publicKey.toBase58(); // public key only; never used to sign
    const r = await fetch('/api/launch', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'build', player: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', mint, name: 'Sim Puppy', symbol: 'SIMP', uri: 'https://ipfs.io/ipfs/bafkreisimulationonly', pair: 'KIBBLE', devBuySol: 0.01, slippageBps: 300 }) }); return r.json(); });
  L(`[${tag}] live dry run: ok=${built.simulation?.ok} units=${built.simulation?.units} size=${built.size} lookupTable=${built.lookupTable} total=${built.route?.total?.text}`);
  await p.evaluate(async (b) => { const m = await import('/src/launchui.js'); m._state.review = { built: b, done() {} }; m._state.steps = ['meta', 'build', 'review']; document.getElementById('nx-pair').dispatchEvent(new Event('change')); }, built);
  await p.waitForSelector('#nx-review'); await p.evaluate(() => document.getElementById('nx-review').scrollIntoView({ block: 'start' })); await p.waitForTimeout(300); await shot(p, `launch-review-${tag}`);
  await p.evaluate(() => document.querySelector('#nx-review ul').scrollIntoView({ block: 'end' })); await shot(p, `launch-review-fees-${tag}`);
  if (p.errs.length) L(`[${tag}] page errors: ${p.errs.join(' | ')}`); await p.context().close();
  // 2) Boss Raids: gate in the world, a live fight, rules
  p = await open(v); await p.evaluate(() => { __inu.setZoom(1); const s = __inu.state.player; s.x = 39.5 * 32; s.y = 50.5 * 32; __inu.player.face = 'up'; globalThis.__camLock = { x: 38.5 * 32, y: 48 * 32 }; });
  await p.waitForTimeout(1500); await shot(p, `raid-gate-${tag}`);
  await p.evaluate(() => __inu.open('raid')); await p.waitForTimeout(1500); await shot(p, `raid-panel-${tag}`);
  await p.click('[data-raid="start"]'); await p.waitForTimeout(1200); for (const k of ['B', 'R', 'B', 'L', 'B', 'B']) { await p.click(`[data-in="${k}"]`); await p.waitForTimeout(220); }
  await shot(p, `raid-fight-${tag}`); L(`[${tag}] raid state: ${JSON.stringify(await p.evaluate(() => { const r = __raid().ui.run; return r && { boss: r.boss, tick: r.raid.s.tick, inputs: r.inputs.length, dmg: r.raid.s.dmg }; }))}`);
  await p.click('[data-rtab="rules"]'); await p.waitForTimeout(300); await shot(p, `raid-rules-${tag}`);
  if (p.errs.length) L(`[${tag}] page errors: ${p.errs.join(' | ')}`); await p.context().close();
  // 3) Reveal: published manifest first, then step 3
  p = await ctxPage(v, false); await p.goto(URL0 + 'reveal/?start=2026-10-20T19:00:00%2B11:00'); await p.waitForFunction(() => globalThis.__reveal); await p.waitForTimeout(800); await shot(p, `reveal-manifest-${tag}`);
  for (let i = 0; i < 3; i++) await p.keyboard.press('ArrowRight'); await p.waitForTimeout(700); await shot(p, `reveal-step3-${tag}`);
  L(`[${tag}] reveal: ${JSON.stringify(await p.evaluate(() => ({ step: __reveal.step, hashOk: __reveal.ok, hash: __reveal.hash })))}`); await p.context().close();
  // 4) One Inu Score public formula page (kibble-pay)
  p = await ctxPage(v, false); await p.goto(KP + '/inu-score?wallet=9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'); await p.waitForSelector('#games tr:nth-child(2)'); await p.waitForTimeout(800); await shot(p, `inu-score-${tag}`); await p.context().close();
}
// OBS 1080p frame for the stream layout
{ const p = await ctxPage([1920, 1080], false); await p.goto(URL0 + 'reveal/?step=2&obs=green&help=0'); await p.waitForFunction(() => globalThis.__reveal); await p.waitForTimeout(800); await p.screenshot({ path: `${OUT}-reveal-obs-1920x1080.png` }); L(`saved ${OUT}-reveal-obs-1920x1080.png`); await p.context().close(); }
fs.writeFileSync(`${OUT}-proof.log`, log.join('\n') + '\n'); await browser.close();

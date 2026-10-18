// Proof for the Kennel API v2 (hybrid: hold-streak tiers + separate Locked flair) mirror in Inu Verse.
//   URL=https://inu-verse-tawny.vercel.app/ OUT=proof/kennel2 node scripts/kennel2-proof.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
const URL0 = (process.env.URL || 'http://localhost:8653/').replace(/\/?$/, '/'), OUT = process.env.OUT || 'proof/kennel2';
const VIEWS = [[844, 390], [667, 375]], TREASURY = 'BzLYTFAfUsjzQ5x8bx5BbPK4DFtaHrLCuferkvkxTNGJ', API = 'https://kibble-pay.vercel.app/api/kennel';
fs.mkdirSync(OUT.replace(/\/[^/]*$/, '') || '.', { recursive: true });
const log = [], L = (m) => { console.log(m); log.push(m); };
const browser = await chromium.launch();
async function open(q, [w, h] = VIEWS[0]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.errs = errs;
  await p.goto(URL0 + q, { waitUntil: 'domcontentloaded' }); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.mp.off', '1'); }); await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#start'); await p.waitForTimeout(500); await p.click('#start'); await p.waitForTimeout(1200);
  for (let i = 0; i < 3; i++) { const sk = await p.$('#t-skip'); if (sk && await sk.isVisible()) { await sk.click(); await p.waitForTimeout(300); } }
  return p; }
const at = (p, tx, ty, cam, z = 1) => p.evaluate(([tx, ty, cam, z]) => { __inu.setZoom(z); const s = __inu.state.player; s.x = (tx + 0.5) * 32; s.y = (ty + 0.5) * 32; __inu.player.face = 'up'; globalThis.__camLock = cam ? { x: cam[0] * 32, y: cam[1] * 32 } : null; }, [tx, ty, cam, z]);
const shot = async (p, n) => { for (let i = 0; i < 3; i++) { const sk = await p.$('#t-skip'); if (sk && await sk.isVisible()) { await sk.click(); await p.waitForTimeout(300); } } await p.evaluate(() => document.querySelectorAll('.toast').forEach((t) => t.remove())); const f = `${OUT}-${n}.png`; await p.screenshot({ path: f, animations: 'disabled' }); L('saved ' + f); };
const remotes = (p) => p.evaluate(() => { const S = __inu.state.player, real = __inu.mp.actors.bind(__inu.mp);
  __inu.mp.actors = () => [{ x: S.x + 48, y: S.y, coat: 'black', art: 'layer:black', outfit: {}, face: 'down', phase: 0, moving: false, name: 'Rin', mp: true, id: 'mp:a', w: 'Akk3…56fn', kennel: 'pup', kflair: true },
    { x: S.x + 96, y: S.y, coat: 'cream', art: 'layer:cream', outfit: {}, face: 'down', phase: 0, moving: false, name: 'Sora', mp: true, id: 'mp:b', w: 'Fh2x…9QaB', kennel: null, kflair: true },
    { x: S.x + 144, y: S.y, coat: 'tan', art: 'layer:tan', outfit: {}, face: 'down', phase: 0, moving: false, name: 'NoWallet', mp: true, id: 'mp:c', w: null, kennel: 'top', kflair: true }, ...real()]; });

const live = await (await fetch(`${API}?wallet=${TREASURY}`)).json(), wall = await (await fetch(`${API}?wall=1`)).json();
L(`live API treasury: tier=${live.tier} tierSource=${live.tierSource} held=${live.held} locked.flair=${live.locked?.flair} source=${live.source} nextStep=${JSON.stringify(live.nextStep)}`);
L('live API pup streak: ' + JSON.stringify(live.streaks?.[0]));
L(`live API wall: count=${wall.count} empty=${JSON.stringify(wall.empty)} wall=${JSON.stringify(wall.wall)} source=${wall.source}`);
for (const v of VIEWS) { const tag = `${v[0]}x${v[1]}`;
  // 1) real wallet, live API (read-only peek while signed out)
  let p = await open('?kennelwallet=' + TREASURY, v); await at(p, 33, 49, [33, 47.6], 2); await p.waitForTimeout(3500);
  const k = await p.evaluate(() => __kennel()); L(`[${tag}] treasury peek: mine=${JSON.stringify(k.mine)} real.tier=${k.real?.tier} real.status=${k.real?.status} nextStep=${JSON.stringify(k.real?.nextStep)} wall=${JSON.stringify({ status: k.wall?.status, n: k.wall?.wall?.length, empty: k.wall?.empty })}`);
  await shot(p, `treasury-pup-${tag}`); await at(p, 33, 48, [33.5, 46.5], 1); await p.waitForTimeout(900); await shot(p, `plaza-wall-${tag}`);
  await p.evaluate(() => __inu.open('kennel')); await p.waitForTimeout(2500); await shot(p, `treasury-panel-${tag}`);
  const txt = await p.evaluate(() => document.querySelector('.kn-mine')?.innerText || ''); L(`[${tag}] panel mine: ${txt.replace(/\s+/g, ' ')}`);
  await p.evaluate(() => document.querySelector('.kn-mine')?.scrollIntoView({ block: 'start' })); await p.waitForTimeout(300); await shot(p, `treasury-progress-${tag}`);
  await p.evaluate(() => { const d = document.querySelector('details.card'); if (d) { d.open = true; d.scrollIntoView({ block: 'start' }); } }); await p.waitForTimeout(300); await shot(p, `how-tiers-${tag}`);
  if (p.errs.length) L(`[${tag}] page errors: ` + p.errs.join(' | ')); await p.context().close();
  // 2) labelled previews of the cosmetics: Pup + Locked flair, Top Dog; remote players (server-verified pup+flair, flair only, unverified -> nothing)
  for (const q of ['pup-locked', 'top']) { p = await open('?kennel=' + q, v); await at(p, 33, 49, [33.6, 48.6], 2); if (q === 'pup-locked') await remotes(p); await p.waitForTimeout(1800);
    L(`[${tag}] preview ${q}: mine=${JSON.stringify(await p.evaluate(() => __kennel().mine))}`); await shot(p, `preview-${q}-${tag}`); if (p.errs.length) L('page errors: ' + p.errs.join(' | ')); await p.context().close(); } }
fs.writeFileSync(`${OUT}-log.txt`, log.join('\n') + '\n');
await browser.close();

// Mobile HUD crowding proof: phone portrait (390x844), phone landscape (844x390) and desktop (1280x800).
// Title screen, in-world with the tour + a town crier banner (?mood=happy forces a real crier announcement), then the
// after-tour guide card (Launch Hall). Reports overlapping/clipped HUD boxes. URL= TAG= OUT= node scripts/hud-crowd-proof.mjs
import { chromium } from 'playwright';
const URL = process.env.URL || 'http://localhost:8642/', TAG = process.env.TAG || 'after', OUT = process.env.OUT || '/tmp';
const VPS = [['portrait', { width: 390, height: 844 }, true], ['landscape', { width: 844, height: 390 }, true], ['desktop', { width: 1280, height: 800 }, false]];
if (process.env.EXTRA) VPS.push(['se-landscape', { width: 667, height: 375 }, true], ['small-portrait', { width: 360, height: 740 }, true], ['max-landscape', { width: 932, height: 430 }, true], ['narrow-desktop', { width: 900, height: 700 }, false], ['tiny-desktop', { width: 720, height: 700 }, false], ['mid-desktop', { width: 1024, height: 768 }, false], ['edge-desktop', { width: 830, height: 700 }, false]);
const b = await chromium.launch(), report = {}, errs = [];
const boxes = () => { const sel = ['#inu-wallet-btn', '.title-card .logo', '.title-card .ctabs', '#hud .chip:has(#bones)', '#clock', '#menu-btn', '#tour', '#crier-banner', '#guidechip', '#prompt', '#mp-chip', '#tbtns', '#streak-chip'];
  const vis = (e) => { if (!e) return false; const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.05 && !e.closest('[hidden]'); };
  const R = {}; for (const s of sel) { const e = document.querySelector(s); if (vis(e)) { const r = e.getBoundingClientRect(); R[s] = { x: Math.round(r.left), y: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), w: Math.round(r.width) }; } }
  const ks = Object.keys(R), hit = [], clip = [];
  for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) { const a = R[ks[i]], c = R[ks[j]];     const ox = Math.min(a.r, c.r) - Math.max(a.x, c.x), oy = Math.min(a.b, c.b) - Math.max(a.y, c.y); if (ox > 2 && oy > 2) hit.push(`${ks[i]} x ${ks[j]} (${ox}x${oy})`); }
  for (const k of ks) { const a = R[k]; if (a.x < 0 || a.r > innerWidth || a.y < 0 || a.b > innerHeight) clip.push(k); }
  const ck = document.querySelector('#clock'); if (vis(ck) && ck.scrollWidth > ck.clientWidth + 1) clip.push('#clock text');
  const gc = document.querySelector('#guidechip'); if (vis(gc)) { const n = gc.querySelector('.gname'); if (n && (n.scrollWidth > n.clientWidth + 1 || n.scrollHeight > n.clientHeight + 1)) clip.push('#guidechip name ellipsised'); if (gc.getBoundingClientRect().width < 200) clip.push('#guidechip squeezed <200px'); }
  return { boxes: R, overlaps: hit, clipped: clip }; };
for (const [name, vp, mob] of VPS) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: mob, hasTouch: mob }); const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(name + ': ' + e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(name + ': ' + m.text()));
  await p.goto(URL + '?mood=happy'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(2500);
  report[name] = { title: await p.evaluate(boxes) }; await p.screenshot({ path: `${OUT}/verse-hud-${TAG}-${name}-1-title.png` });
  await p.click('#start'); await p.waitForTimeout(3500);
  report[name].tour = await p.evaluate(boxes); await p.screenshot({ path: `${OUT}/verse-hud-${TAG}-${name}-2-tour-crier.png` });
  await p.evaluate(() => { globalThis.__guide?.endTour?.('skipped'); document.querySelectorAll('.toast').forEach((t) => t.remove()); }); await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelectorAll('.toast').forEach((t) => t.remove()));
  report[name].guide = await p.evaluate(boxes); await p.screenshot({ path: `${OUT}/verse-hud-${TAG}-${name}-3-guide.png` });
  await ctx.close(); }
for (const [v, st] of Object.entries(report)) for (const [k, r] of Object.entries(st)) console.log(v, k, 'overlaps:', r.overlaps.join('; ') || 'none', '| clipped:', r.clipped.join('; ') || 'none');
console.log('errors', errs.filter((e) => !/Failed to load resource|404|ERR_|api\//.test(e))); console.log('all errors', errs.length);
if (process.env.JSON) console.log(JSON.stringify(report)); await b.close();

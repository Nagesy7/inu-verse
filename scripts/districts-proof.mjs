// LOCAL proof for the Arcade Districts (no deploy). Local Verse on a static server + the LIVE Inu Arcade for the round trip.
//   python3 -m http.server 8731 ; node scripts/districts-proof.mjs        (OUT=proof by default)
// The Arcade's return allowlist only accepts https://inu-verse-tawny.vercel.app (verse.js safeReturn), not localhost. So for
// the round trip the TEST browser serves that origin from this local checkout (Playwright route): the real live Shiba Scuffle
// page builds and follows its own 🏠 return URL, and the local build handles the landing. Also shown: the plain localhost
// simulated return. Framed ready/exit come from the live Arcade hall in the overlay; the score message is simulated (labelled).
import { chromium } from 'playwright'; import fs from 'fs';
const LOCAL = process.env.URL || 'http://127.0.0.1:8731/', OUT = process.env.OUT || 'proof', P = 'districts-local', VERSE = 'https://inu-verse-tawny.vercel.app';
fs.mkdirSync(OUT, { recursive: true }); const res = { label: 'LOCAL build (static server) – not deployed. Round trip uses the LIVE Inu Arcade; prod Verse origin is served from the local checkout inside the test browser only.', at: new Date().toString(), steps: {} }, errs = [];
const b = await chromium.launch();
const quiet = /Failed to load resource|net::|kibble-pay|dexscreener|api\/|WebSocket|favicon|status of 404/i;
async function boot(tag, { w = 844, h = 390, base = LOCAL, q = '', touch = true, verseLocal = false } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: touch, isMobile: false });
  if (verseLocal) await ctx.route(VERSE + '/**', async (r) => { const u = new URL(r.request().url()); try { const resp = await r.fetch({ url: LOCAL.replace(/\/$/, '') + u.pathname + u.search }); await r.fulfill({ response: resp }); } catch { await r.abort(); } });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(`${tag} pageerror ${e.message}`)); p.on('console', (m) => { if (m.type() === 'error' && !quiet.test(m.text())) errs.push(`${tag} ${m.text().slice(0, 160)}`); });
  p.on('dialog', (d) => d.accept()); await p.goto(base + q); await p.evaluate(() => { localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); }); await p.reload(); await p.waitForTimeout(900);
  if (await p.$('#start')) { await p.click('#start').catch(() => {}); await p.waitForTimeout(2300); }
  await p.evaluate(() => { globalThis.__guide?.endTour?.('skipped'); __inu.setHour(11); __inu.setRain(0); }); return { ctx, p }; }
const st = (p) => p.evaluate(() => ({ mode: globalThis.__doorTest?.st?.mode ?? null, room: globalThis.__room?.() || null, panel: document.querySelector('#panel:not([hidden]) h2')?.textContent || null, lastNav: globalThis.__lastNav || null }));
const goZone = (p, x, y = 8.5, face = 'up') => p.evaluate(([x, y, face]) => globalThis.__goScene('districts', { x: (x + 0.5) * 32, y: y * 32, face }), [x, y, face]);
const shot = (p, n) => p.screenshot({ path: `${OUT}/${P}-${n}.png` });
const D = await import('../src/districts.js');
// 1) hub: gate arch + signpost beside the Arcade hall; walk east through the gate into the zone
{ const { ctx, p } = await boot('hub'); await p.evaluate(() => { const s = __inu.state; s.player.x = 59.5 * 32; s.player.y = 57.5 * 32; }); await p.waitForTimeout(700); await shot(p, '01-hub-gate-sign');
  await p.keyboard.down('ArrowRight'); await p.waitForTimeout(1300); await p.keyboard.up('ArrowRight'); await p.waitForTimeout(800); res.steps.gate = await p.evaluate(() => ({ room: globalThis.__room?.()?.id || null, portals: globalThis.__portalFires || 0 }));
  await shot(p, '02-gate-arrival-arcade-row');
  // 2) each district: overview (zoom ½x) and street level (zoom 1x) at 844x390
  const per = {}; for (const d of D.DISTRICTS) { const cx = Math.round((d.x0 + d.x1) / 2); await goZone(p, cx, 9.5); await p.waitForTimeout(500); await p.evaluate(() => __inu.setZoom(1)); await p.waitForTimeout(400); await shot(p, `10-${d.id}-overview`);
    await p.evaluate(() => __inu.setZoom(2)); const door = D.doorOf(D.CABINETS.find((c) => c.district === d.id).id); await goZone(p, door[0], 8.6); await p.waitForTimeout(500); await shot(p, `11-${d.id}-street`); per[d.id] = await p.evaluate(() => globalThis.__room?.()); }
  res.steps.districts = per;
  // 3) arcade-row: all 8 doors (two halves at 1x) + walk into one door -> cabinet panel
  for (const [i, x] of [[0, 7], [1, 22]]) { await goZone(p, x, 9.2); await p.waitForTimeout(500); await shot(p, `20-arcade-row-doors-${i + 1}`); }
  const dc = D.doorOf('kibble-chomp'); await goZone(p, dc[0], 8.5); await p.waitForTimeout(400); await p.keyboard.down('ArrowUp'); await p.waitForTimeout(700); await p.keyboard.up('ArrowUp'); await p.waitForTimeout(500);
  res.steps.doorKibbleChomp = await st(p); await shot(p, '21-arcade-row-door-panel-open'); await p.keyboard.press('Escape');
  res.steps.arcadeRowUrls = Object.fromEntries(D.CABINETS.filter((c) => c.district === 'arcade-row').map((c) => [c.id, D.doorUrl(c)]));
  // 4) coming-soon gate (Stadium): walk in -> coming soon panel, no Play button, no navigation
  const ds = D.doorOf('zoomie-goals'); await goZone(p, ds[0], 8.5); await p.waitForTimeout(400); await p.keyboard.down('ArrowUp'); await p.waitForTimeout(700); await p.keyboard.up('ArrowUp'); await p.waitForTimeout(500);
  res.steps.comingSoon = { ...(await st(p)), play: !!(await p.$('#cab-go')), text: await p.evaluate(() => document.querySelector('#panel-body')?.innerText.replace(/\s+/g, ' ').slice(0, 200)) }; await shot(p, '30-gate-coming-soon-stadium'); await p.keyboard.press('Escape');
  for (const id of ['fud-swarm', 'barkour', 'last-pup-standing']) { const dd = D.doorOf(id); await goZone(p, dd[0], 9.3); await p.waitForTimeout(450); await shot(p, `31-gate-coming-soon-${id === 'fud-swarm' ? 'fud-field' : id === 'barkour' ? 'parkour' : 'race-park'}`); }
  // 5) fast travel from a post: panel, then hop to Race Park
  const k = D.kioskOf(D.DISTRICTS[1]); await goZone(p, k[0], k[1] - 0.5, 'down'); await p.waitForTimeout(300); await p.evaluate(() => document.getElementById('prompt')?.click()); await p.waitForTimeout(500);
  if (!(await st(p)).panel) await p.evaluate(() => __inu.open('fasttravel', { from: 'arena' })); await p.waitForTimeout(300); await shot(p, '40-fast-travel-panel');
  await p.click('[data-ft="race-park"]'); await p.waitForTimeout(900); res.steps.fastTravel = { ...(await st(p)), travels: await p.evaluate(() => globalThis.__fastTravels) }; await shot(p, '41-fast-travel-arrived-race-park');
  await p.evaluate(() => __inu.open('fasttravel', { from: 'race-park' })); await p.waitForTimeout(300); await p.click('[data-ft="town"]'); await p.waitForTimeout(900); res.steps.fastTravelTown = await p.evaluate(() => ({ room: globalThis.__room?.()?.id || null, x: Math.round(__inu.state.player.x / 32), y: Math.round(__inu.state.player.y / 32) }));
  await ctx.close(); }
// 6) phone 667x375: a district street + the door panel (layout check)
{ const { ctx, p } = await boot('small', { w: 667, h: 375 }); const d = D.doorOf('shiba-scuffle'); await goZone(p, d[0], 8.5); await p.waitForTimeout(600); await shot(p, '50-arena-street-667x375');
  await p.keyboard.down('ArrowUp'); await p.waitForTimeout(700); await p.keyboard.up('ArrowUp'); await p.waitForTimeout(500); await shot(p, '51-shiba-scuffle-door-panel-667x375'); await p.keyboard.press('Escape');
  await p.evaluate(() => __inu.open('fasttravel', { from: 'arena' })); await p.waitForTimeout(300); await shot(p, '52-fast-travel-667x375'); await ctx.close(); }
// 7) Shiba Scuffle ROUND TRIP against the LIVE Arcade. Outbound: walk in -> Play -> real top-level navigation.
{ const { ctx, p } = await boot('trip', { base: VERSE + '/', verseLocal: true }); const d = D.doorOf('shiba-scuffle'); await goZone(p, d[0], 8.5); await p.waitForTimeout(500);
  await p.keyboard.down('ArrowUp'); await p.waitForTimeout(700); await p.keyboard.up('ArrowUp'); await p.waitForTimeout(400); await shot(p, '60-roundtrip-1-door-panel');
  const nav = p.waitForURL(/inu-arcade\.vercel\.app\/shiba-scuffle/, { timeout: 20000 }); await p.click('#cab-go'); await p.waitForTimeout(150); await shot(p, '60-roundtrip-2-entering'); await nav;
  const outbound = p.url(); await p.waitForTimeout(4500); await shot(p, '60-roundtrip-3-live-shiba-scuffle');
  const home = await p.$('#inu-home'); res.steps.roundTrip = { outbound, outboundParams: Object.fromEntries(new URL(outbound).searchParams), homeButton: !!home, contractUrl: D.doorUrl(D.cabinet('shiba-scuffle')) };
  if (home) { const back = p.waitForURL(/inu-verse-tawny\.vercel\.app/, { timeout: 20000 }); await home.click(); await back; res.steps.roundTrip.returnUrl = p.url(); await p.waitForSelector('#start', { state: 'visible', timeout: 15000 }).catch(() => {}); await p.waitForTimeout(2500);
    const btn = (await p.$('#continue:not([hidden])')) ? '#continue' : '#start'; res.steps.titleButton = btn; await p.click(btn).catch(() => {}); await p.waitForTimeout(2600); await shot(p, '60-roundtrip-4-back-at-the-door');
    res.steps.roundTrip.landed = await p.evaluate(() => ({ room: globalThis.__room?.() || null, ret: globalThis.__districtReturn || null, toast: [...document.querySelectorAll('.toast')].map((t) => t.textContent).slice(-3) })); }
  await ctx.close(); }
// 7b) plain local simulated return (localhost is NOT on the Arcade allowlist, so this is what a localhost landing looks like)
{ const { ctx, p } = await boot('simret', { q: '?spawn=door-shiba-scuffle&district=arena' }); await p.waitForTimeout(800); res.steps.simulatedReturn = await p.evaluate(() => ({ room: globalThis.__room?.() || null, ret: globalThis.__districtReturn || null })); await shot(p, '61-simulated-return-localhost'); await ctx.close(); }
// 8) framed hall peek (desktop pointer) from the prod origin served locally: live Arcade posts ready; 🏠 inside -> exit closes overlay; score simulated
{ const { ctx, p } = await boot('framed', { base: VERSE + '/', verseLocal: true, touch: false }); await p.evaluate(() => globalThis.__arcade.open()); await p.waitForTimeout(7000);
  res.steps.framed = { afterOpen: await p.evaluate(() => ({ msgs: globalThis.__arcadeMsgs || [], bar: document.querySelector('#arcade-ov .arc-bar b')?.textContent, open: !document.getElementById('arcade-ov')?.hidden })) }; await shot(p, '70-framed-hall-ready');
  await p.evaluate(() => window.dispatchEvent(new MessageEvent('message', { origin: 'https://inu-arcade.vercel.app', data: { type: 'inu-arcade:score', cabinetId: 'shiba-scuffle', score: 4200, mode: 'classic', durationMs: 61000 } }))); await p.waitForTimeout(400); res.steps.framed.scoreToast = await p.evaluate(() => ({ toasts: [...document.querySelectorAll('#toast .toast')].map((t) => t.textContent), z: getComputedStyle(document.querySelector('#toast')).zIndex, ovOpen: !document.getElementById('arcade-ov')?.hidden })); await shot(p, '71-framed-score-toast-SIMULATED');
  const fr = p.frameLocator('#arc-frame'); try { await fr.locator('#inu-home').click({ timeout: 8000 }); } catch (e) { res.steps.framed.homeClickError = String(e).slice(0, 120); } await p.waitForTimeout(1500);
  res.steps.framed.afterHome = await p.evaluate(() => ({ msgs: globalThis.__arcadeMsgs || [], open: !document.getElementById('arcade-ov')?.hidden, url: location.href })); await shot(p, '72-framed-exit-closed'); await ctx.close(); }
res.errors = errs; fs.writeFileSync(`${OUT}/${P}-results.json`, JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1).slice(0, 9000)); await b.close();

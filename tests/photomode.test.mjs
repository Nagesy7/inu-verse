// Feature batch #2: photo mode — HUD hidden, free camera pan/zoom, filters + frames, poses, Save PNG (download / Web Share), share links; no uploads.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { chromium } from 'playwright';
import * as PHM from '../src/photomode.js';
import { serveRoot, overlaps } from './serve-root.mjs';

test('filters + frames: sepia, night glow, polaroid with the Inu Verse caption; cycling wraps', () => {
  const F = PHM.FILTERS.map((f) => f.id), R = PHM.FRAMES.map((f) => f.id);
  for (const k of ['none', 'sepia', 'glow']) assert.ok(F.includes(k), k); for (const k of ['none', 'polaroid']) assert.ok(R.includes(k), k);
  assert.equal(PHM.CAPTION, 'Inu Verse'); assert.equal(PHM.cycle(PHM.FILTERS, F.at(-1)), 'none'); assert.equal(PHM.cycle(PHM.FILTERS, 'none', -1), F.at(-1));
  const [sr, sg, sb] = PHM.filterPx('sepia', 128, 128, 128); assert.ok(sr > sg && sg > sb, 'sepia is warm'); const [gr, , gb] = PHM.filterPx('glow', 90, 90, 90); assert.ok(gb > gr, 'night glow is moonlit blue');
  const [mr, mg, mb] = PHM.filterPx('mono', 200, 40, 90); assert.ok(mr === mg && mg === mb); assert.deepEqual(PHM.filterPx('none', 1, 2, 3), [1, 2, 3]);
  for (const id of F) for (const c of [[0, 0, 0], [255, 255, 255], [255, 0, 128]]) for (const v of PHM.filterPx(id, ...c)) assert.ok(v >= 0 && v <= 255);
  const d = new Uint8ClampedArray([10, 20, 30, 255, 200, 100, 50, 128]); PHM.applyFilter(d, 'sepia'); assert.equal(d[3], 255); assert.equal(d[7], 128, 'alpha kept'); assert.deepEqual([...d.slice(0, 3)], PHM.filterPx('sepia', 10, 20, 30).map((v) => Math.round(v)));
  const bp = new Uint8ClampedArray([20, 20, 20, 255, 250, 250, 250, 255]); PHM.brightPass(bp, 150); assert.equal(bp[0], 0); assert.ok(bp[4] > 200);
  const L = PHM.frameLayout('polaroid', 800, 400); assert.ok(L.W > 800 && L.H > 400 && L.cap > L.u * 3, 'polaroid has a thick caption strip'); assert.deepEqual(PHM.frameLayout('none', 800, 400), { W: 800, H: 400, x: 0, y: 0, u: 18 });
});

test('camera: pan stays within reach of your pup, zoom stays in range, keys pan', () => {
  const c = PHM.makePhotoCam(2); PHM.panBy(c, 9999, 0); assert.ok(Math.abs(Math.hypot(c.pan.x, c.pan.y) - PHM.PAN_R) < 1e-6); PHM.panBy(c, -9999, -9999); assert.ok(Math.hypot(c.pan.x, c.pan.y) <= PHM.PAN_R + 1e-6);
  PHM.zoomBy(c, 100); assert.equal(PHM.photoZoom(c), 2 * PHM.Z_REL[1]); PHM.zoomBy(c, 0.001); assert.equal(PHM.photoZoom(c), 2 * PHM.Z_REL[0]);
  const lo = PHM.makePhotoCam(0.5); PHM.zoomBy(lo, 0.01); assert.ok(PHM.photoZoom(lo) >= PHM.Z_ABS[0]); PHM.resetCam(c); assert.deepEqual([c.z, c.pan.x, c.pan.y], [1, 0, 0]);
  PHM.panKeys(c, new Set(['arrowright']), 0.5); assert.equal(Math.round(c.pan.x), PHM.PAN_SPEED / 2); assert.equal(c.pan.y, 0);
});

test('share: X intent + Telegram share with the t.me/KibbleCoin text; nothing is uploaded', () => {
  const L = PHM.shareLinks('Mochi'); assert.match(L.x, /^https:\/\/x\.com\/intent\/tweet\?text=/); assert.match(L.tg, /^https:\/\/t\.me\/share\/url\?url=/);
  for (const u of [L.x, L.tg]) { const t = decodeURIComponent(new URL(u).searchParams.get('text')); assert.match(t, /t\.me\/KibbleCoin/); assert.match(t, /Inu Verse/); assert.match(t, /Mochi/); }
  assert.match(PHM.fileName(new Date(2026, 10, 3, 9, 5, 7)), /^inu-verse-20261103-090507\.png$/);
  const src = fs.readFileSync(new URL('../src/photomode.js', import.meta.url), 'utf8'); assert.doesNotMatch(src, /fetch\(|XMLHttpRequest|sendBeacon|FormData|WebSocket/, 'photo mode never talks to a server');
  assert.doesNotMatch(src.replace(/^\/\/.*$/gm, ''), /kibble-pay|\$KIBBLE|wager|fee/i); assert.doesNotMatch(src, /Math\.random/);
});

const boot = async (b, srv, vp) => { const ctx = await b.newContext({ viewport: vp, isMobile: true, hasTouch: true, acceptDownloads: true }), p = await ctx.newPage(), errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/kibble-pay|_vercel/, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await p.goto(srv.url + '?mp=off'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:test'); }); await p.reload(); await p.waitForTimeout(700); await p.click('#start'); await p.waitForTimeout(1500); return { ctx, p, errs }; };

test('browser: menu → photo mode hides the HUD, pans/zooms, poses, filters, polaroid PNG download, Web Share on phones, exit restores', { timeout: 150000 }, async () => {
  const srv = await serveRoot(); const b = await chromium.launch(); const all = [];
  try { for (const vp of [{ width: 844, height: 390 }, { width: 667, height: 375 }]) { const { ctx, p, errs } = await boot(b, srv, vp); all.push(errs);
    const z0 = await p.evaluate(() => __inu.zoom);
    await p.tap('#menu-btn'); await p.waitForTimeout(200); await p.tap('#btn-photo'); await p.waitForTimeout(400); assert.ok(await p.evaluate(() => __inu.photo.on));
    const vis = await p.evaluate(() => [...document.querySelectorAll('button,a,input')].filter((e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !e.closest('[hidden]'); }).map((e) => { const r = e.getBoundingClientRect(); return { id: e.id, r: [r.x, r.y, r.width, r.height] }; }));
    assert.deepEqual(vis.map((v) => v.id).sort(), ['pm-exit', 'pm-filter', 'pm-frame', 'pm-home', 'pm-pose', 'pm-save', 'pm-tg', 'pm-x', 'pm-zin', 'pm-zout'], 'only photo tools are visible (HUD hidden) @' + vp.width);
    for (const v of vis) { assert.ok(v.r[2] >= 44 && v.r[3] >= 44, v.id + ' 44px'); assert.ok(v.r[0] >= 0 && v.r[1] >= 0 && v.r[0] + v.r[2] <= vp.width && v.r[1] + v.r[3] <= vp.height, v.id + ' on screen'); }
    for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) assert.ok(!overlaps(vis[i].r, vis[j].r), `${vis[i].id}/${vis[j].id} overlap`);
    const pl0 = await p.evaluate(() => [__inu.state.player.x, __inu.state.player.y]);
    await p.mouse.move(400, 200); await p.mouse.down(); await p.mouse.move(250, 250, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(300);
    const pc = await p.evaluate(() => __inu.photo.cam); assert.ok(pc.pan.x > 40 && pc.pan.y < -10, 'drag pans: ' + JSON.stringify(pc)); assert.deepEqual(await p.evaluate(() => [__inu.state.player.x, __inu.state.player.y]), pl0, 'pup holds still');
    for (let i = 0; i < 8; i++) await p.tap('#pm-zin'); await p.waitForTimeout(100); assert.equal(await p.evaluate(() => __inu.zoom), z0 * PHM.Z_REL[1]);
    await p.tap('#pm-home'); await p.waitForTimeout(100); assert.equal(await p.evaluate(() => __inu.zoom), z0);
    await p.tap('#pm-pose'); await p.waitForTimeout(100); await p.tap('[data-pose=laugh]'); await p.waitForTimeout(100); assert.equal(await p.evaluate(() => __inu.emo.act?.kind), 'laugh', 'poses via emotes');
    await p.tap('#pm-filter'); assert.match(await p.evaluate(() => document.getElementById('game').style.filter), /sepia/);
    await p.tap('#pm-frame'); assert.equal(await p.evaluate(() => document.body.dataset.pfr), 'polaroid'); assert.ok(await p.evaluate(() => getComputedStyle(document.querySelector('#photo-frame .pf-cap')).display !== 'none'));
    if (vp.width === 844) { const [dl] = await Promise.all([p.waitForEvent('download'), p.tap('#pm-save')]); assert.match(dl.suggestedFilename(), /^inu-verse-\d{8}-\d{6}\.png$/);
      const buf = fs.readFileSync(await dl.path()); assert.deepEqual([...buf.subarray(1, 4)].map((c) => String.fromCharCode(c)).join(''), 'PNG');
      const W = buf.readUInt32BE(16), H = buf.readUInt32BE(20), cw = await p.evaluate(() => [document.getElementById('game').width, document.getElementById('game').height]), L = PHM.frameLayout('polaroid', cw[0], cw[1]); assert.deepEqual([W, H], [L.W, L.H], 'polaroid PNG size');
      // the saved pixels really are sepia: compose a known 2x1 canvas in the page and compare with filterPx
      const px = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 40; c.height = 20; const x = c.getContext('2d'); x.fillStyle = 'rgb(40,160,90)'; x.fillRect(0, 0, 40, 20); const o = __inu.photo.PHM.composePhoto(c, { filter: 'sepia', frame: 'polaroid' }); const L = __inu.photo.PHM.frameLayout('polaroid', 40, 20); return [...o.getContext('2d').getImageData(L.x + 2, L.y + 2, 1, 1).data.slice(0, 3)]; });
      PHM.filterPx('sepia', 40, 160, 90).forEach((v, i) => assert.ok(Math.abs(v - px[i]) <= 1, `sepia px ${px} vs ${PHM.filterPx('sepia', 40, 160, 90)}`));
      assert.ok(await p.evaluate(() => globalThis.__photoSaves === 1)); }
    else { await p.evaluate(() => { globalThis.__shared = null; navigator.canShare = (d) => !!d?.files?.length; navigator.share = async (d) => { globalThis.__shared = { n: d.files.length, type: d.files[0].type, text: d.text }; }; });
      await p.tap('#pm-save'); await p.waitForTimeout(500); const sh = await p.evaluate(() => globalThis.__shared); assert.equal(sh?.type, 'image/png', 'Web Share API used on phones'); assert.match(sh.text, /t\.me\/KibbleCoin/); }
    const L = await p.evaluate(() => [document.getElementById('pm-x').href, document.getElementById('pm-tg').href]); assert.match(L[0], /^https:\/\/x\.com\/intent\/tweet/); assert.match(L[1], /^https:\/\/t\.me\/share\/url/);
    await p.tap('#pm-exit'); await p.waitForTimeout(200);
    assert.deepEqual(await p.evaluate(() => [__inu.photo.on, __inu.zoom, document.getElementById('game').style.filter, getComputedStyle(document.getElementById('btn-a')).visibility]), [false, z0, '', 'visible']);
    await ctx.close(); } } finally { await b.close(); srv.close(); }
  for (const e of all) assert.deepEqual(e, []);
});

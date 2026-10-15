// Decluttered HUD: only essentials on screen at phone landscape, every former HUD button is inside the one menu drawer and still works.
import test from 'node:test'; import assert from 'node:assert/strict'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.json': 'application/json', '.css': 'text/css', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
const FORMER = ['btn-phantom', 'btn-pack', 'btn-wardrobe', 'btn-garage', 'btn-engage', 'btn-pools', 'btn-emote', 'btn-photo', 'btn-mute', 'btn-guide', 'btn-help', 'w-guide', 'w-places', 'w-map', 'zin', 'zout'];
test('phone HUD shows only essentials; every former button lives in the menu and works', { timeout: 120000 }, async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); const ff = f.endsWith('/') ? f + 'index.html' : f; fs.readFile(ff, (e, b) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', MIME[path.extname(ff)] || 'application/octet-stream'); r.end(b); }); });
  await new Promise((ok) => srv.listen(0, ok)); const b = await chromium.launch(); const errs = [];
  try { for (const vp of [{ width: 844, height: 390 }, { width: 667, height: 375 }]) {
    const ctx = await b.newContext({ viewport: vp, isMobile: true, hasTouch: true }), p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(`http://localhost:${srv.address().port}/`); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:test'); }); await p.reload(); await p.waitForTimeout(700); await p.click('#start'); await p.waitForTimeout(1800);
    const vis = await p.evaluate(() => [...document.querySelectorAll('button,a.btn')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('#drawer') && !e.closest('[hidden]') && getComputedStyle(e).visibility !== 'hidden'; }).map((e) => ({ id: e.id, w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height })));
    assert.deepEqual(vis.map((v) => v.id).sort(), ['btn-a', 'menu-btn'], 'on-screen buttons at ' + vp.width + ': ' + JSON.stringify(vis));
    for (const v of vis) assert.ok(v.w >= 44 && v.h >= 44, v.id + ' too small');
    const where = await p.evaluate((ids) => ids.map((id) => [id, !!document.getElementById(id)?.closest('#drawer')]), FORMER.filter((i) => i !== 'btn-guide'));
    for (const [id, inDrawer] of where) assert.ok(inDrawer, id + ' not in the menu');
    await p.tap('#menu-btn'); await p.waitForTimeout(200);
    const sizes = await p.evaluate(() => [...document.querySelectorAll('#drawer .dr-grid button, #drawer .dr-grid a')].filter((e) => e.offsetParent).map((e) => [e.id, Math.round(e.getBoundingClientRect().width), Math.round(e.getBoundingClientRect().height)]));
    for (const [id, w, h] of sizes) assert.ok(w >= 44 && h >= 44, `${id} ${w}x${h}`);
    const z0 = await p.evaluate(() => __inu.zoom); await p.tap('#zout'); assert.ok(await p.evaluate(() => !document.getElementById('drawer').hidden), 'zoom keeps menu open'); assert.notEqual(await p.evaluate(() => __inu.zoom), z0);
    await p.tap('#w-places'); await p.waitForTimeout(200); assert.ok(await p.evaluate(() => document.getElementById('drawer').hidden), 'menu closes after choosing'); assert.ok(await p.evaluate(() => !document.querySelector('#places, .places, #pl-q')?.closest('[hidden]')), 'Places opened');
    await ctx.close(); } } finally { await b.close(); srv.close(); }
  assert.deepEqual(errs, []);
});

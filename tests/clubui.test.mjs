// Club UI smoke: every Club panel opens, the Kennel is enterable from the menu, a hunt pin can be picked up, no page errors.
import test from 'node:test'; import assert from 'node:assert/strict'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.json': 'application/json', '.css': 'text/css', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
test('club panels, kennel and pin pickup work at phone landscape', { timeout: 120000 }, async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); const ff = f.endsWith('/') ? f + 'index.html' : f; fs.readFile(ff, (e, b) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', MIME[path.extname(ff)] || 'application/octet-stream'); r.end(b); }); });
  await new Promise((ok) => srv.listen(0, ok)); const b = await chromium.launch(); const errs = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }), p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    const base = `http://localhost:${srv.address().port}/`;
    await p.goto(base); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:test'); }); await p.goto(base + '?party=11'); await p.waitForTimeout(700); await p.click('#start'); await p.waitForTimeout(1500);
    assert.equal(await p.evaluate(() => __inu.state.v), 2);
    for (const k of ['pups', 'stamps', 'party', 'times']) { await p.evaluate((k) => __inu.open('club-' + k), k); await p.waitForTimeout(150); assert.equal(await p.evaluate(() => __inu.panel), 'club-' + k);
      assert.ok(await p.evaluate(() => document.querySelector('#panel-body .club') !== null), k + ' rendered'); }
    await p.evaluate(() => { __inu.state.bones = 500; __inu.open('club-pups'); }); await p.fill('#pupname', 'Kuro'); await p.click('#pupadopt'); await p.waitForTimeout(150);
    assert.equal(await p.evaluate(() => __inu.state.pets.owned.filter((x) => x.species === 'pup').length), 1); assert.equal(await p.evaluate(() => __inu.state.bones), 400);
    await p.evaluate(() => __inu.open('club-party')); await p.click('#pclaim'); assert.equal(await p.evaluate(() => __inu.state.inventory.jaca_lantern), 1);
    await p.evaluate(() => document.getElementById('panel-close').click()); await p.tap('#menu-btn'); await p.waitForTimeout(200);
    const r = await p.evaluate(() => document.getElementById('btn-kennel').getBoundingClientRect()); assert.ok(r.width >= 44 && r.height >= 44, 'kennel button size');
    await p.tap('#btn-kennel'); await p.waitForTimeout(900); assert.deepEqual(await p.evaluate(() => [__inu.mode, __inu.club.rp.id]), ['room', 'home:kennel']);
    const sp = await p.evaluate(() => __inu.club.hunt().spots[0]); await p.evaluate((sp) => __inu.club.room(sp.room), sp); await p.waitForTimeout(1200);
    await p.evaluate((sp) => { const R = __inu.club.rp.R; R.p.x = (sp.tx + 0.5) * 32; R.p.y = (sp.ty + 0.5) * 32; }, sp); await p.waitForTimeout(500);
    assert.ok(await p.evaluate((id) => !!__inu.state.club.pins[id], sp.pin.id), 'pin collected');
    const st = await p.evaluate(() => Object.keys(__inu.state.club.stamps)); for (const id of ['pup-adopt', 'party-item', 'kennel-home', 'pin-first', 'times']) assert.ok(st.includes(id), id);
    await ctx.close();
  } finally { await b.close(); srv.close(); }
  assert.deepEqual(errs, []);
});

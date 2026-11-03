// HUD top-row fit (src/hudfit.js): the live "N ONLINE" chip never sits on the HUD chip row in phone landscape (667x375 overlapped);
// it compacts to "● N", then the HUD chips drop their small sub-labels, only as far as needed, and steps back when there is room.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { chromium } from 'playwright';
import * as HF from '../src/hudfit.js';
import { serveRoot, overlaps } from './serve-root.mjs';

test('nextLevel / rowOverlap / compactLabel: step up on overlap, down only with room to spare, same row only', () => {
  assert.equal(HF.nextLevel(0, 10, [0, 0, 0]), 1); assert.equal(HF.nextLevel(1, 3, [0, 50, 0]), 2); assert.equal(HF.nextLevel(2, 5, [0, 50, 60]), 2, 'capped');
  assert.equal(HF.nextLevel(2, -30, [0, 50, 60]), 2, 'not enough room to undo level 2'); assert.equal(HF.nextLevel(2, -70, [0, 50, 60]), 1); assert.equal(HF.nextLevel(0, -100, [0, 0, 0]), 0);
  assert.equal(HF.rowOverlap([[8, 8, 100, 40], [450, 8, 46, 44]], [470, 18, 95, 37]), 450 + 46 + 6 - 470);
  assert.equal(HF.rowOverlap([[8, 8, 100, 40]], [8, 100, 95, 37]), -Infinity, 'a chip on another row never counts');
  assert.ok(HF.rowOverlap([[8, 8, 100, 40]], [300, 18, 95, 37]) < 0);
  assert.equal(HF.compactLabel('12 online'), '12'); assert.equal(HF.compactLabel(' 1 online'), '1'); assert.equal(HF.compactLabel('solo'), 'solo'); assert.equal(HF.compactLabel('…'), '…');
  const css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8'); assert.match(css, /body\.mp-tight #mp-chip\[data-n\]::after\{content:attr\(data-n\)\}/); assert.match(css, /body\.hud-tight #hud \.chip small\{display:none\}/);
  assert.match(fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8'), /fitToasts\(document, window\); fitHud\(document\);/);
});

// a fake realtime server: welcomes us into the room with N other pups (no positions, so nobody is drawn)
const FAKE_WS = () => { window.__fakeN = 11; window.WebSocket = class { constructor(u) { this.url = u; this.readyState = 0; setTimeout(() => { this.readyState = 1; this.onopen?.(); }, 30); }
  send(d) { let m; try { m = JSON.parse(d); } catch { return; } if (m.t === 'hi') { const room = new URL(this.url.replace(/^ws/, 'http')).searchParams.get('room');
    setTimeout(() => this.onmessage?.({ data: JSON.stringify({ t: 'w', id: 'me', name: 'Kabosu', inst: 1, room, players: Array.from({ length: window.__fakeN }, (_, i) => ({ id: 'p' + i, name: 'Pup' + i })) }) }), 30); } }
  close() { this.readyState = 3; } }; };

test('browser: the online chip clears the HUD chip row at 844x390 + 667x375 (and steps back on a wide screen)', { timeout: 150000 }, async () => {
  const srv = await serveRoot(), b = await chromium.launch(), errs = [];
  try { for (const vp of [{ width: 844, height: 390 }, { width: 667, height: 375 }, { width: 1280, height: 720 }]) {
    const ctx = await b.newContext({ viewport: vp, isMobile: vp.width < 1000, hasTouch: vp.width < 1000 }), p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(FAKE_WS); await p.route(/kibble-pay|_vercel/, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
    await p.goto(srv.url + '?mp=ws://fake.test'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:test'); }); await p.reload(); await p.waitForTimeout(700); await p.click('#start');
    await p.waitForFunction(() => /12 online/.test(document.getElementById('mp-chip')?.textContent || ''), null, { timeout: 8000 });
    const at = `@${vp.width}x${vp.height}`; let R;
    for (let i = 0; i < 20; i++) { await p.waitForTimeout(250); // the fit runs from the ~0.2 s HUD tick; wait until it settles clear
      R = await p.evaluate(() => { const q = (e) => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }, c = document.getElementById('mp-chip'), cs = getComputedStyle(c, '::after');
        return { chip: q(c), hud: [...document.querySelectorAll('#hud > *')].filter((e) => e.getBoundingClientRect().width && getComputedStyle(e).display !== 'none').map(q), menu: q(document.getElementById('menu-btn')), cls: document.body.className, after: cs.content, bones: document.getElementById('bones').textContent };
      });
      if (!R.hud.some((h) => overlaps(h, R.chip))) break; }
    for (const h of R.hud) assert.ok(!overlaps(h, R.chip), `online chip ${R.chip} on HUD chip ${h} ${at}`);
    assert.ok(!overlaps(R.menu, R.chip), 'chip vs menu button ' + at); assert.ok(R.chip[0] >= 0 && R.chip[0] + R.chip[2] <= vp.width, 'on screen ' + at);
    if (vp.width === 667) { assert.match(R.cls, /mp-tight/, 'compact at 667 ' + at); assert.equal(R.after, '"12"', 'count still shown'); }
    if (vp.width === 1280) assert.doesNotMatch(R.cls, /mp-tight|hud-tight/, 'full chip on a wide screen');
    // hysteresis: the 667 fit holds steady (no flip-flop between levels) over a second
    if (vp.width === 667) { const seen = new Set(); for (let i = 0; i < 8; i++) { seen.add(await p.evaluate(() => /hud-tight/.test(document.body.className) + '/' + /mp-tight/.test(document.body.className))); await p.waitForTimeout(150); } assert.equal(seen.size, 1, 'stable fit ' + [...seen]); }
    await ctx.close(); }
    assert.deepEqual(errs, []); } finally { await b.close(); srv.close(); }
});

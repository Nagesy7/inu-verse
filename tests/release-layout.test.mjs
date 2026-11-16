// Release layout: one round joystick, no TEST debug chip on the top bar (only behind ?npcdebug=1), nothing covering each other.
import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { serveRoot } from './serve-root.mjs';

const VIEWS = [
  { width: 390, height: 844 },
  { width: 375, height: 667 },
  { width: 667, height: 375 },
];

function hit(a, b) {
  if (!a || !b || a.w < 1 || b.w < 1) return false;
  return a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;
}

test('the default town has one round stick and no TEST chip, uncrowded', { timeout: 120000 }, async () => {
  const srv = await serveRoot();
  const browser = await chromium.launch();
  try {
    for (const viewport of VIEWS) {
      const ctx = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.goto(srv.url + '?mp=off');
      await page.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:test'); });
      await page.reload();
      await page.click('#start');
      await page.waitForFunction(() => document.getElementById('hud')?.classList.contains('in'));
      await page.waitForTimeout(400);
      const boxes = await page.evaluate(() => {
        const read = (id) => {
          const el = document.getElementById(id);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, w: r.width, h: r.height, text: (el.innerText || '').trim(), radius: s.borderRadius, hidden: el.hidden };
        };
        return {
          stick: read('stick'),
          chip: read('npcwork-chip'),
          chips: document.querySelectorAll('#npcwork-chip').length,
          bones: read('bones-chip'),
          menu: read('menu-btn'),
          map: read('map-peek'),
          a: read('btn-a'),
          town: document.body.classList.contains('npcwork'),
        };
      });
      assert.equal(boxes.town, true, `town @${viewport.width}`);
      assert.equal(boxes.chips, 0, `no TEST chip on the top bar @${viewport.width}`);
      assert.ok(Math.abs(boxes.stick.w - boxes.stick.h) < 1, `stick @${viewport.width} ${boxes.stick.w}x${boxes.stick.h}`);
      const radius = boxes.stick.radius.trim();
      const round = radius === '50%' || parseFloat(radius) + 0.05 >= boxes.stick.w / 2;
      assert.equal(round, true, `stick radius @${viewport.width} ${boxes.stick.radius}`);
      assert.equal(hit(boxes.stick, boxes.a), false, `stick hits A @${viewport.width}`);
      await page.tap('#map-peek');
      const map = await page.evaluate(() => {
        const canvas = document.getElementById('minimap').getBoundingClientRect();
        const q = (id) => { const r = document.getElementById(id).getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, w: r.width, h: r.height }; };
        return { canvas: { x: canvas.x, y: canvas.y, right: canvas.right, bottom: canvas.bottom, w: canvas.width, h: canvas.height }, stick: q('stick'), a: q('btn-a') };
      });
      assert.ok(map.canvas.w >= 44 && map.canvas.h >= 44, `map @${viewport.width}`);
      assert.equal(hit(map.canvas, map.stick), false, `map hits stick @${viewport.width}`);
      assert.equal(hit(map.canvas, map.a), false, `map hits A @${viewport.width}`);
      await ctx.close();
    }
  } finally {
    await browser.close();
    srv.close();
  }
});

test('?npcdebug=1 still opens the TEST chip for developers, clear of the controls', { timeout: 60000 }, async () => {
  const srv = await serveRoot();
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(srv.url + '?mp=off&npcdebug=1');
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:test'); });
    await page.reload();
    await page.click('#start');
    await page.waitForFunction(() => document.getElementById('hud')?.classList.contains('in'));
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => { const q = (id) => { const e = document.getElementById(id); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, right: b.right, bottom: b.bottom, w: b.width, h: b.height, text: (e.innerText || '').trim() }; }; return { n: document.querySelectorAll('#npcwork-chip').length, chip: q('npcwork-chip'), stick: q('stick'), a: q('btn-a'), menu: q('menu-btn') }; });
    assert.equal(r.n, 1); assert.equal(r.chip.text, 'TEST');
    for (const k of ['stick', 'a', 'menu']) assert.equal(hit(r.chip, r[k]), false, `TEST hits ${k}`);
    await ctx.close();
  } finally { await browser.close(); srv.close(); }
});

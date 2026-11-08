// Top-row controls stay at least 44px and do not cover one another.
// Town is the one ledger entry. Notices keeps its word, not a bare count.
import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { serveRoot } from './serve-root.mjs';

const VIEWS = [
  { width: 360, height: 740 },
  { width: 390, height: 844 },
  { width: 667, height: 375 },
];
const TOUCH = ['play-details', 'notice-toggle', 'menu-btn', 'map-peek', 'stick', 'btn-a', 'btn-emo'];
const BOXES = [...TOUCH, 'bones-chip'];

function hit(a, b) {
  return a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;
}

async function boot(page, url) {
  await page.goto(url + '?mp=off');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:test'); localStorage.setItem('inuverse.minimap', '1'); });
  await page.reload();
  await page.click('#start');
  await page.waitForFunction(() => document.getElementById('hud')?.classList.contains('in'));
  await page.waitForFunction(() => {
    const b = document.getElementById('notice-toggle');
    return b && b.getBoundingClientRect().width >= 44 && /Notices/.test(b.innerText);
  });
}

test('360, 390, and 667 touch boxes stay 44px and do not intersect', { timeout: 120000 }, async () => {
  const srv = await serveRoot();
  const browser = await chromium.launch();
  try {
    for (const viewport of VIEWS) {
      const ctx = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await boot(page, srv.url);
      const boxes = await page.evaluate((ids) => {
        const out = {};
        for (const id of ids) {
          const el = document.getElementById(id);
          const r = el.getBoundingClientRect();
          out[id] = { x: r.x, y: r.y, right: r.right, bottom: r.bottom, w: r.width, h: r.height, text: (el.innerText || '').replace(/\s+/g, ' ').trim() };
        }
        return out;
      }, BOXES);
      for (const id of TOUCH) {
        assert.ok(boxes[id].w + 0.05 >= 44 && boxes[id].h + 0.05 >= 44, `${id} @${viewport.width} ${JSON.stringify(boxes[id])}`);
      }
      assert.match(boxes['notice-toggle'].text, /^Notices\b/);
      assert.doesNotMatch(boxes['play-details'].text, /ledger/i);
      const ids = BOXES;
      for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
        assert.equal(hit(boxes[ids[i]], boxes[ids[j]]), false, `${ids[i]} hits ${ids[j]} @${viewport.width} ${JSON.stringify(boxes)}`);
      }
      await page.tap('#play-details');
      const town = await page.evaluate(() => ({
        locked: document.body.classList.contains('ctrl-lock'),
        pe: getComputedStyle(document.getElementById('stick')).pointerEvents,
        ledger: document.getElementById('grove-ledger').innerText,
        day: document.getElementById('streak-chip').innerText,
      }));
      assert.equal(town.locked, true);
      assert.equal(town.pe, 'none');
      assert.match(town.ledger, /TEST SPLINTS/);
      assert.match(town.ledger, /budget/);
      assert.match(town.day, /day/i);
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => document.getElementById('play-sheet').hidden && !document.body.classList.contains('ctrl-lock')), true);
      await page.tap('#notice-toggle');
      const notes = await page.evaluate(() => {
        const log = document.getElementById('notice-log');
        const prompt = document.getElementById('prompt');
        const pr = prompt && !prompt.hidden ? prompt.getBoundingClientRect() : null;
        return {
          open: !log.hidden,
          text: log.innerText,
          locked: document.body.classList.contains('ctrl-lock'),
          pe: getComputedStyle(document.getElementById('stick')).pointerEvents,
          promptShown: !!(pr && pr.width > 8),
        };
      });
      assert.equal(notes.open, true);
      assert.equal(notes.locked, true);
      assert.equal(notes.pe, 'none');
      assert.ok(notes.text.length > 8, notes.text);
      await page.tap('#notice-toggle');
      assert.equal(await page.evaluate(() => document.getElementById('notice-log').hidden), true);
      await page.tap('#map-peek');
      const map = await page.evaluate(() => {
        const canvas = document.getElementById('minimap').getBoundingClientRect();
        const q = (id) => { const r = document.getElementById(id).getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, w: r.width, h: r.height }; };
        return { canvas: { x: canvas.x, y: canvas.y, right: canvas.right, bottom: canvas.bottom, w: canvas.width, h: canvas.height }, stick: q('stick'), a: q('btn-a'), menu: q('menu-btn'), town: q('play-details'), notes: q('notice-toggle') };
      });
      assert.ok(map.canvas.w >= 44 && map.canvas.h >= 44);
      for (const id of ['stick', 'a', 'menu', 'town', 'notes']) assert.equal(hit(map.canvas, map[id]), false, `map hits ${id} @${viewport.width}`);
      await page.tap('#map-peek');
      assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('minimap')).display), 'none');
      await ctx.close();
    }
  } finally {
    await browser.close();
    srv.close();
  }
});

// The flagged town must render like the live town: real tiles, a building, and the player.
import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { serveRoot } from './serve-root.mjs';

function colors(data) {
  const seen = new Set();
  let placeholder = 0;
  for (let i = 0; i < data.length; i += 16) {
    seen.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
    if (data[i] === 96 && data[i + 1] === 104 && data[i + 2] === 120) placeholder++;
  }
  return { colors: seen.size, placeholder };
}

test('a flagged plaza draws building detail, the player, and live tiles', async () => {
  const srv = await serveRoot();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(srv.url + '?npcwork=1&mp=off&fx=low');
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:test'); });
    await page.reload();
    await page.click('#start');
    await page.waitForFunction(() => document.getElementById('hud')?.classList.contains('in'));
    await page.evaluate(() => __inu.npcwork && __inu.npcwork.artReady);
    await page.evaluate(() => {
      __inu.setZoom(2);
      __inu.setHour(11);
      __inu.grove.place(31.5 * 32, 23.5 * 32);
      globalThis.__camLock = { x: 31.5 * 32, y: 22.4 * 32 };
    });
    await page.waitForTimeout(500);
    const sample = await page.evaluate(() => {
      const cv = document.getElementById('game');
      const g = cv.getContext('2d');
      const read = (x, y, w, h) => g.getImageData(x, y, w, h).data;
      const w = cv.width;
      const h = cv.height;
      return {
        zoom: __inu.zoom,
        building: Array.from(read(Math.round(w * 0.32), Math.round(h * 0.22), 90, 80)),
        player: Array.from(read(Math.round(w / 2 - 16), Math.round(h / 2 - 8), 32, 48)),
        street: Array.from(read(Math.round(w * 0.08), Math.round(h * 0.62), 48, 36)),
      };
    });
    assert.equal(sample.zoom, 2);
    const building = colors(sample.building);
    const player = colors(sample.player);
    const street = colors(sample.street);
    assert.ok(building.colors > 8, `building detail ${building.colors}`);
    assert.ok(player.colors > 5, `player detail ${player.colors}`);
    assert.ok(street.colors > 4, `street detail ${street.colors}`);
    assert.ok(street.placeholder < 8, 'flat placeholder road fill');
  } finally {
    await browser.close();
    srv.close();
  }
});

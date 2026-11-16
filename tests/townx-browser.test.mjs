// Town economy extras in the browser (preview): walk to a workplace door, open its card, play a job shift on a phone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { serveRoot } from './serve-root.mjs';

async function boot(browser, srv, viewport) {
  const mobile = viewport.width < 600;
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(srv.url + '?mp=off');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:test'); });
  await page.reload(); await page.click('#start');
  await page.waitForFunction(() => document.getElementById('hud')?.classList.contains('in'));
  await page.waitForTimeout(500);
  return { ctx, page, errs };
}
const goDoor = (page, tx, ty) => page.evaluate(([tx, ty]) => { __inu.state.player.x = (tx + 0.5) * 32; __inu.state.player.y = (ty + 0.5) * 32; }, [tx, ty]);

test('job shift at the Sawmill door on phones: prompt, card, 12 taps, capped Bones, back to the joystick', { timeout: 120000 }, async () => {
  const srv = await serveRoot(); const browser = await chromium.launch();
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 375, height: 667 }]) {
      const { ctx, page, errs } = await boot(browser, srv, viewport);
      await goDoor(page, 42, 20); await page.waitForTimeout(500);
      const pr = await page.evaluate(() => ({ t: document.getElementById('prompt').innerText, near: __inu.townx.near()?.id }));
      assert.equal(pr.near, 'sawmill'); assert.match(pr.t, /Log Chopper/i);
      await page.dispatchEvent('#btn-a', 'pointerdown'); await page.waitForSelector('[data-tx-place="sawmill"]');
      await page.click('[data-tx-job="sawmill"]'); await page.waitForSelector('#zj-canvas');
      const box = await page.evaluate(() => { const r = document.getElementById('zj-canvas').getBoundingClientRect(); return { x: r.x, y: r.y, r: r.right, b: r.bottom }; });
      assert.ok(box.x >= 0 && box.y >= 0 && box.r <= viewport.width + 1 && box.b <= viewport.height + 1, 'game fits the phone screen');
      const bones0 = await page.evaluate(() => __inu.state.bones);
      await page.waitForFunction(() => __inu.townx.zj()?.phase === 'play');
      for (let i = 0; i < 12; i++) { await page.evaluate(() => { const st = __inu.townx.zj(); st.zone = { c: 0.5, w: st.zone.w }; st.tap(); }); await page.waitForTimeout(40); }
      await page.waitForFunction(() => __inu.townx.zj()?.phase === 'results');
      const res = await page.evaluate(() => __inu.townx.zj().res);
      assert.equal(res.hits, 12); assert.equal(res.bestMult, 64); assert.equal(res.paid, 150);
      assert.equal(await page.evaluate(() => __inu.state.bones), bones0 + 150);
      await page.keyboard.press('Enter'); await page.waitForTimeout(200);
      assert.equal(await page.evaluate(() => !!document.getElementById('zj')), false);
      const stick = await page.evaluate(() => { const s = document.getElementById('stick'); return s && getComputedStyle(s).display !== 'none'; });
      assert.ok(stick, 'joystick is back');
      assert.deepEqual(errs, []); await ctx.close();
    }
  } finally { await browser.close(); srv.close(); }
});

test('every job mini-game draws its scene and plays without errors', { timeout: 120000 }, async () => {
  const srv = await serveRoot(); const browser = await chromium.launch();
  try {
    const { ctx, page, errs } = await boot(browser, srv, { width: 1280, height: 800 });
    for (const id of ['sawmill', 'mine', 'forge', 'bakery', 'fishery', 'farm', 'quarry', 'docks', 'police']) {
      await page.evaluate((id) => __inu.townx.job(id), id); await page.waitForFunction(() => __inu.townx.zj()?.phase === 'play');
      for (let i = 0; i < 3; i++) { await page.evaluate((i) => { const st = __inu.townx.zj(); if (i === 1) st.zone = { c: 0.05, w: 0.08 }; else st.zone = { c: 0.5, w: st.zone.w }; st.tap(); }, i); await page.waitForTimeout(120); }
      const st = await page.evaluate(() => { const s = __inu.townx.zj(); return { job: s.job, hits: s.run.hits, taps: s.run.taps, mult: s.run.mult }; });
      assert.deepEqual(st, { job: id, hits: 2, taps: 3, mult: 2 });
      await page.keyboard.press('Escape'); await page.waitForTimeout(150);
      assert.equal(await page.evaluate(() => __inu.townx.zj()), null);
    }
    assert.deepEqual(errs, []); await ctx.close();
  } finally { await browser.close(); srv.close(); }
});

test('shop card on a phone: buy three scarves, become a Regular, see 5% off; challenge the owner to Meme Brawl', { timeout: 90000 }, async () => {
  const srv = await serveRoot(); const browser = await chromium.launch();
  try {
    const { ctx, page, errs } = await boot(browser, srv, { width: 390, height: 844 });
    await page.evaluate(() => __inu.setHour(14)); await page.waitForTimeout(300);
    await page.evaluate(() => __inu.townx.open('tailor')); await page.waitForSelector('[data-tx-sec="shop"][data-tx-tier="stranger"]');
    for (let i = 0; i < 3; i++) { await page.click('[data-tx-buy="tailor:scarf"]'); await page.waitForTimeout(120); }
    await page.waitForSelector('[data-tx-sec="shop"][data-tx-tier="regular"]');
    const beanie = await page.locator('[data-tx-item="beanie"]').innerText(); assert.match(beanie, /22\s+21 Bones/i);
    await page.click('[data-tx-brawl="tailor"]'); await page.waitForSelector('[data-tx-brawl-state="playing"]');
    assert.match(await page.locator('[data-tx-sec="brawl"]').innerText(), /Stitch is playing Meme Brawl/i);
    await page.click('[data-tx-brawl-res="tailor:won"]'); await page.waitForSelector('[data-tx-brawl-state="done"]');
    assert.match(await page.locator('[data-tx-sec="brawl"]').innerText(), /You tore right through me/);
    assert.deepEqual(errs, []); await ctx.close();
  } finally { await browser.close(); srv.close(); }
});

test('walk into the Town Exchange on a phone, read every board, and walk back out', { timeout: 90000 }, async () => {
  const srv = await serveRoot(); const browser = await chromium.launch();
  try {
    const { ctx, page, errs } = await boot(browser, srv, { width: 375, height: 667 });
    await page.evaluate(() => __inu.setHour(13)); await goDoor(page, 56, 43); await page.waitForTimeout(500);
    assert.match(await page.evaluate(() => document.getElementById('prompt').innerText), /Town Exchange/i);
    await page.dispatchEvent('#btn-a', 'pointerdown');
    await page.waitForFunction(() => __inu.townx.where().room === 'exchange', null, { timeout: 5000 }); await page.waitForTimeout(300);
    for (const tab of ['production', 'routes', 'needs', 'wanted', 'spending']) {
      await page.evaluate((t) => __inu.townx.exchange(t), tab); await page.waitForSelector(`[data-tx-exchange="${tab}"]`);
    }
    await page.evaluate(() => __inu.townx.exchange('production')); assert.ok(await page.locator('[data-ex-good="planks"]').count() === 1);
    await page.evaluate(() => __inu.townx.exchange('routes')); assert.ok(await page.locator('#ex-map').count() === 1);
    await page.evaluate(() => __inu.townx.exchange('needs')); assert.match(await page.locator('[data-ex-need]').innerText(), /needs today/i);
    await page.evaluate(() => { document.querySelector('#panel-close')?.click(); __inu.townx.leave(); }); await page.waitForFunction(() => __inu.townx.where().mode === 'world', null, { timeout: 5000 });
    assert.deepEqual(await page.evaluate(() => { const w = __inu.townx.where(); return [w.tx, w.ty]; }), [56, 43], 'back out on the Exchange door tile');
    assert.deepEqual(errs, []); await ctx.close();
  } finally { await browser.close(); srv.close(); }
});

test('civic row on a phone: catch a pickpocket, get patched up at the Hospital, read the Fire Station and Police logs', { timeout: 120000 }, async () => {
  const srv = await serveRoot(); const browser = await chromium.launch();
  try {
    const { ctx, page, errs } = await boot(browser, srv, { width: 390, height: 844 });
    const c = await page.evaluate(() => __inu.townx.civic().crimes[0]);
    await page.evaluate((h) => __inu.setHour(h), (c.t0 + 4) / 60); await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => __inu.townx.civic().crimes[0].phase), 'sneaking');
    const pos = await page.evaluate((id) => { const T = __inu.townx; return T.civic().crimes.find((q) => q.id === id); }, c.id);
    const door = await page.evaluate((stall) => { __inu.townx.open(stall); const el = document.querySelector(`[data-tx-place="${stall}"]`); return !!el; }, pos.stall);
    assert.ok(door); await page.evaluate(() => document.querySelector('#panel-close')?.click()); await page.waitForTimeout(200);
    await page.evaluate((stall) => { const p = __inu.townx.placeDoor(stall); __inu.state.player.x = p.x + 22; __inu.state.player.y = p.y + 14; }, pos.stall); await page.waitForTimeout(400);
    assert.match(await page.evaluate(() => document.getElementById('prompt').innerText), /Stop .* the pickpocket/i);
    const b0 = await page.evaluate(() => __inu.state.bones);
    await page.dispatchEvent('#btn-a', 'pointerdown'); await page.waitForTimeout(300);
    const after = await page.evaluate(() => ({ c: __inu.townx.civic().crimes[0], bones: __inu.state.bones, catches: __inu.townx.state().catches }));
    assert.equal(after.c.phase, 'caught'); assert.equal(after.c.by, 'you'); assert.equal(after.bones, b0 + 5); assert.equal(after.catches, 1);
    await page.evaluate(() => __inu.townx.open('police')); await page.waitForSelector(`[data-tx-crime="${c.id}"][data-phase="caught"]`); assert.ok(await page.locator('[data-tx-job="police"]').count() === 1, 'join the police: Beat Patrol shift');
    await page.evaluate(() => { __inu.townx.state().injury = { kind: 'job', job: 'mine', what: 'a bonked head', day: 0 }; __inu.townx.open('hospital'); });
    await page.waitForSelector('[data-tx-sec="hospital"][data-tx-injury="a bonked head"]'); await page.click('[data-tx-treat]');
    await page.waitForSelector('[data-tx-sec="hospital"][data-tx-injury=""]'); assert.equal(await page.evaluate(() => __inu.townx.state().injury), null);
    await page.evaluate(() => __inu.townx.open('firehouse')); await page.waitForSelector('[data-tx-sec="fire"]');
    assert.deepEqual(errs, []); await ctx.close();
  } finally { await browser.close(); srv.close(); }
});

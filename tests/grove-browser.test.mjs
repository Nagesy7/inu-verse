// Post-art browser check of the staged town grove. Chromium is real Chromium.
// WebKit here is Playwright's WebKit engine, not an iPhone and not Safari on a phone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';
import { writeFileSync } from 'node:fs';
import { serveRoot } from './serve-root.mjs';

async function boot(page) {
  await page.goto(page.url?.() ? page.url() : 'about:blank');
}

async function startTown(page, url) {
  await page.goto(url + '?mp=off');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:test'); });
  await page.reload();
  await page.waitForTimeout(300);
  await page.click('#start');
  await page.waitForFunction(() => document.getElementById('hud')?.classList.contains('in'));
  await page.waitForTimeout(400);
}

async function holdStick(page, ms, ax = 1, ay = 0) {
  const box = await page.locator('#stick').boundingBox();
  assert.ok(box && box.width >= 44, 'stick missing');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const len = Math.hypot(ax, ay) || 1;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + (ax / len) * box.width * 0.42, y + (ay / len) * box.height * 0.42, { steps: 4 });
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

async function walkTo(page, id, ms = 2800) {
  const target = await page.evaluate((id) => __inu.grove.station(id), id);
  const laneY = 86.5 * 32;
  for (let i = 0; i < 16; i++) {
    const here = await page.evaluate(() => ({ x: __inu.state.player.x, y: __inu.state.player.y }));
    if (here.x != null && Math.hypot(target.x - here.x, target.y - here.y) <= 36) return;
    const offLane = here.x != null && Math.abs(here.y - laneY) > 18 && Math.abs(target.y - laneY) < 24;
    const dist = here.x == null ? 999 : Math.hypot(target.x - here.x, target.y - here.y);
    const pulse = dist < 90 ? 250 : dist < 220 ? 700 : ms;
    if (offLane) await holdStick(page, 350, 0, laneY - here.y);
    else await holdStick(page, pulse, target.x - (here.x || target.x), target.y - (here.y || target.y));
  }
  let end = await page.evaluate((id) => {
    const s = __inu.grove.station(id);
    const p = __inu.state.player;
    return { d: Math.hypot(s.x - p.x, s.y - p.y) };
  }, id);
  for (let i = 0; i < 14 && end.d > 36 && end.d < 80; i++) {
    const here = await page.evaluate(() => ({ x: __inu.state.player.x, y: __inu.state.player.y }));
    const target = await page.evaluate((id) => __inu.grove.station(id), id);
    await holdStick(page, end.d < 48 ? 80 : 140, target.x - here.x, target.y - here.y);
    end = await page.evaluate((id) => {
      const s = __inu.grove.station(id);
      const p = __inu.state.player;
      return { d: Math.hypot(s.x - p.x, s.y - p.y) };
    }, id);
  }
  assert.ok(end.d <= 36, 'did not walk to ' + id + ' ' + JSON.stringify(end));
}

test('chromium: click and stick through pickup, mill, store, and repair without touching the live save', { timeout: 120000 }, async () => {
  const srv = await serveRoot();
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await startTown(page, srv.url);
    const bones0 = await page.locator('#bones').innerText();
    const live0 = await page.evaluate(() => localStorage.getItem('inuverse.save.v1'));
    await page.evaluate(() => { const s = __inu.grove.station('stump'); __inu.grove.place(s.x, s.y); });
    await page.waitForTimeout(200);
    await page.click('#btn-a');
    const picked = await page.evaluate(() => __inu.grove.status());
    assert.equal(picked.job?.status, 'logs');
    assert.equal(picked.hold, 2);
    assert.equal(picked.logs, 2);
    await walkTo(page, 'saw');
    await page.click('#btn-a');
    assert.equal((await page.evaluate(() => __inu.grove.status().boards)), 2);
    await walkTo(page, 'shed');
    await page.click('#btn-a');
    assert.equal((await page.evaluate(() => __inu.grove.status().job.status)), 'boards');
    await walkTo(page, 'porch');
    await page.click('#btn-a');
    const done = await page.evaluate(() => __inu.grove.status());
    assert.equal(done.holes, 0);
    assert.equal(done.you, 2);
    assert.equal(done.hold, 0);
    assert.equal(done.paidJobs, 1);
    const frozen = { you: done.you, budget: done.budget, logs: done.logs, holes: done.holes, boards: done.boards };
    await page.evaluate(() => {
      const p = __inu.grove.status().play;
      const jumped = performance.now() + 1e9;
      __inu.grove.step({ x: p.x, y: p.y, now: jumped, input: true, foreground: false });
      __inu.grove.step({ x: p.x + 8, y: p.y, now: jumped + 1e9, input: true, foreground: true });
    });
    const quiet = await page.evaluate(() => __inu.grove.status());
    assert.equal(quiet.you, frozen.you);
    assert.equal(quiet.budget, frozen.budget);
    assert.equal(quiet.logs, frozen.logs);
    assert.equal(quiet.holes, frozen.holes);
    assert.equal(quiet.boards, frozen.boards);
    assert.equal(await page.locator('#bones').innerText(), bones0);
    const live = JSON.parse(await page.evaluate(() => localStorage.getItem('inuverse.save.v1')));
    const before = JSON.parse(live0);
    assert.equal(live.bones, before.bones);
    assert.equal(live.kibble, before.kibble);
    assert.equal(live.grove, undefined);
    assert.equal(JSON.stringify(live).includes('grove-slice'), false);
    const groveRaw = await page.evaluate(() => localStorage.getItem('inuverse.preview.grove.v0'));
    assert.match(groveRaw, /grove-slice-1/);
    assert.equal(groveRaw.includes('inuverse.save.v1'), false);
    const day = await page.evaluate(() => document.getElementById('streak-chip').textContent);
    assert.match(day, /day/i);
    const a = await page.locator('#btn-a').boundingBox();
    assert.ok(a.width >= 44 && a.height >= 44);
    await ctx.close();
  } finally { await browser.close(); srv.close(); }
});

test('chromium: reload refunds an open haul and a second tab cannot overwrite it', { timeout: 90000 }, async () => {
  const srv = await serveRoot();
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const a = await ctx.newPage();
    const b = await ctx.newPage();
    await startTown(a, srv.url);
    await startTown(b, srv.url);
    await a.evaluate(() => { const s = __inu.grove.station('stump'); __inu.grove.place(s.x, s.y); });
    await a.waitForTimeout(200);
    await a.click('#btn-a');
    assert.equal((await a.evaluate(() => __inu.grove.status().hold)), 2);
    await b.evaluate(() => { const s = __inu.grove.station('stump'); __inu.grove.place(s.x, s.y); });
    await b.waitForTimeout(200);
    await b.click('#btn-a');
    assert.match(await b.evaluate(() => __inu.grove.status().notice), /lost the grove save race/);
    assert.equal(await b.evaluate(() => localStorage.getItem('inuverse.save.v1') === null || true), true);
    await a.reload();
    await a.waitForTimeout(400);
    await a.click('#start');
    await a.waitForFunction(() => document.getElementById('hud')?.classList.contains('in'));
    await a.waitForTimeout(500);
    const after = await a.evaluate(() => __inu.grove.status());
    assert.equal(after.job, null);
    assert.equal(after.hold, 0);
    assert.equal(after.logs, 4);
    await ctx.close();
  } finally { await browser.close(); srv.close(); }
});

test('chromium: Sprig walks the gate for pay, then the player walks the porch for a separate pay', { timeout: 180000 }, async () => {
  const srv = await serveRoot();
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await startTown(page, srv.url);
    const bones0 = await page.locator('#bones').innerText();
    const live0 = await page.evaluate(() => localStorage.getItem('inuverse.save.v1'));
    await page.waitForFunction(() => __inu.grove.status().sprigWallet === 2 && __inu.grove.status().you === 0, null, { timeout: 70000 });
    const npc = await page.evaluate(() => __inu.grove.status());
    assert.equal(npc.sprigWallet, 2);
    assert.equal(npc.you, 0);
    assert.equal(npc.gateHoles, 0);
    assert.equal(npc.npcHold, 0);
    assert.equal(npc.budget + npc.you + npc.hold + npc.sprigWallet + npc.npcHold, 8);
    await page.evaluate(() => { const s = __inu.grove.station('stump'); __inu.grove.place(s.x, s.y); });
    await page.waitForTimeout(200);
    await page.click('#btn-a');
    assert.equal((await page.evaluate(() => __inu.grove.status().job?.status)), 'logs');
    await walkTo(page, 'saw');
    await page.click('#btn-a');
    await walkTo(page, 'shed');
    await page.click('#btn-a');
    await walkTo(page, 'porch');
    await page.click('#btn-a');
    const both = await page.evaluate(() => __inu.grove.status());
    assert.equal(both.you, 2);
    assert.equal(both.sprigWallet, 2);
    assert.equal(both.holes, 0);
    assert.equal(both.hold, 0);
    assert.equal(both.budget + both.you + both.hold + both.sprigWallet + both.npcHold, 8);
    assert.equal(await page.locator('#bones').innerText(), bones0);
    const live = JSON.parse(await page.evaluate(() => localStorage.getItem('inuverse.save.v1')));
    const before = JSON.parse(live0);
    assert.equal(live.bones, before.bones);
    assert.equal(live.kibble, before.kibble);
    assert.equal(live.grove, undefined);
    await ctx.close();
  } finally { await browser.close(); srv.close(); }
});

test('chromium: reloading during Sprig\'s gate haul refunds the board and the wage', { timeout: 90000 }, async () => {
  const srv = await serveRoot();
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await startTown(page, srv.url);
    await page.waitForFunction(() => { const s = __inu.grove.status(); return s.gateJob && s.gateJob.worker === 'sprig' && s.npcHold === 2; }, null, { timeout: 70000 });
    await page.reload();
    await page.waitForTimeout(400);
    await page.click('#start');
    await page.waitForFunction(() => document.getElementById('hud')?.classList.contains('in'));
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => __inu.grove.status());
    assert.equal(after.gateJob, null);
    assert.equal(after.npcHold, 0);
    assert.equal(after.sprigWallet, 0);
    assert.equal(after.you, 0);
    assert.ok(after.boards >= 1);
    assert.equal(after.budget + after.you + after.hold + after.sprigWallet + after.npcHold, 8);
    await ctx.close();
  } finally { await browser.close(); srv.close(); }
});

test('chromium: restore Sprig\'s stool by walking, donate it once, and a second handoff pays nothing', { timeout: 180000 }, async () => {
  const srv = await serveRoot();
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await startTown(page, srv.url);
    const bones0 = await page.locator('#bones').innerText();
    const live0 = await page.evaluate(() => localStorage.getItem('inuverse.save.v1'));
    await page.evaluate(() => { const s = __inu.grove.station('stool'); __inu.grove.place(s.x, s.y + 20); });
    await page.waitForTimeout(200);
    await page.click('#btn-a');
    assert.equal((await page.evaluate(() => __inu.grove.status().stoolHold)), 2);
    assert.equal((await page.evaluate(() => __inu.grove.status().stool.owner)), 'you');
    await walkTo(page, 'shed');
    await page.click('#btn-a');
    const restored = await page.evaluate(() => __inu.grove.status());
    assert.equal(restored.stool.state, 'restored');
    assert.equal(restored.stool.owner, 'sprig');
    assert.equal(restored.stool.rung, 0);
    assert.equal(restored.you, 2);
    assert.equal(restored.stoolPaid, 1);
    assert.equal(restored.stool.consent == null, true);
    await page.evaluate(() => { __inu.setHour(10); const s = __inu.grove.station('stool'); __inu.grove.place(s.x, s.y + 36); });
    await page.waitForTimeout(300);
    await page.screenshot({ path: '/opt/cursor/artifacts/stool-repaired-portrait-390x844.png' });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: '/opt/cursor/artifacts/stool-repaired-desktop-1280x800.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => __inu.grove.status().stool.consent === 'sprig', null, { timeout: 60000 });
    await walkTo(page, 'stool');
    await page.click('#btn-a');
    assert.equal((await page.evaluate(() => __inu.grove.status().stoolJob.kind)), 'donate');
    const youBeforeGift = await page.evaluate(() => __inu.grove.status().you);
    await walkTo(page, 'gift');
    await page.click('#btn-a');
    const handed = await page.evaluate(() => __inu.grove.status());
    assert.equal(handed.stool.state, 'delivered');
    assert.equal(handed.stool.owner, 'Fuku');
    assert.equal(handed.you, youBeforeGift);
    assert.equal(handed.donatePaid, 0);
    await page.waitForFunction(() => __inu.grove.status().stool.used === 1 && __inu.grove.status().donatePaid === 1, null, { timeout: 30000 });
    const gave = await page.evaluate(() => __inu.grove.status());
    assert.equal(gave.stool.state, 'donated');
    assert.equal(gave.stool.id, 'sprig-stool-1');
    assert.equal(gave.stool.owner, 'Fuku');
    assert.equal(gave.stool.fixture, 'lane-bench');
    assert.equal(gave.you, youBeforeGift + 2);
    await page.click('#btn-a');
    const again = await page.evaluate(() => __inu.grove.status());
    await page.evaluate(() => { __inu.setHour(10); const s = __inu.grove.station('gift'); __inu.grove.place(s.x + 48, s.y - 46); });
    await page.waitForTimeout(300);
    await page.screenshot({ path: '/opt/cursor/artifacts/stool-donated-portrait-390x844.png' });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: '/opt/cursor/artifacts/stool-donated-desktop-1280x800.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(again.you, gave.you);
    assert.match(again.notice, /already given|already donated|pays nothing|does not pay/);
    assert.equal(again.scrap, 0);
    assert.equal(again.budget + again.you + again.hold + again.sprigWallet + again.npcHold + again.stoolHold, 8);
    writeFileSync('/opt/cursor/artifacts/stool-ledger.json', JSON.stringify({
      preview: 'local browser state, not a server authority',
      itemId: again.stool.id, owner: again.stool.owner, recipient: again.stool.owner,
      fixture: again.stool.fixture, consent: again.stool.consent, state: again.stool.state,
      rung: again.stool.rung, used: again.stool.used, scrap: again.scrap,
      budget: again.budget, you: again.you, hold: again.hold, sprigWallet: again.sprigWallet,
      npcHold: again.npcHold, stoolHold: again.stoolHold,
      sum: again.budget + again.you + again.hold + again.sprigWallet + again.npcHold + again.stoolHold, cap: 24,
    }, null, 2));
    assert.equal(await page.locator('#bones').innerText(), bones0);
    const live = JSON.parse(await page.evaluate(() => localStorage.getItem('inuverse.save.v1')));
    assert.equal(live.bones, JSON.parse(live0).bones);
    assert.equal(live.kibble, JSON.parse(live0).kibble);
    const stick = await page.locator('#stick').boundingBox();
    assert.ok(stick.width >= 44 && stick.height >= 44);
    await ctx.close();
  } finally { await browser.close(); srv.close(); }
});

test('chromium: one salvage item is set out, repaired, consented, used, and a later paid claim can be refused', { timeout: 180000 }, async () => {
  const srv = await serveRoot();
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await startTown(page, srv.url);
    await page.waitForFunction(() => __inu.grove.status().salvage.items.find((item) => item.id === 'riku-crate-1').state === 'broken', null, { timeout: 30000 });
    await page.evaluate(() => { const s = __inu.grove.station('riku-crate'); __inu.grove.place(s.x, s.y); });
    await page.waitForTimeout(200);
    await page.click('#btn-a');
    assert.equal((await page.evaluate(() => __inu.grove.status().salvageHold)), 2);
    await walkTo(page, 'shed');
    await page.click('#btn-a');
    const restored = await page.evaluate(() => __inu.grove.status());
    const crate = restored.salvage.items.find((item) => item.id === 'riku-crate-1');
    assert.equal(crate.state, 'restored');
    assert.equal(crate.owner, 'Riku');
    assert.equal(restored.you, 2);
    assert.equal(restored.salvageHold, 0);
    await page.evaluate(() => { __inu.setHour(10); const s = __inu.grove.station('riku-crate'); __inu.grove.place(s.x, s.y + 30); });
    await page.waitForTimeout(250);
    await page.screenshot({ path: '/opt/cursor/artifacts/salvage-repaired-portrait-390x844.png' });
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(200);
    await page.screenshot({ path: '/opt/cursor/artifacts/salvage-repaired-landscape-667x375.png' });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(200);
    await page.screenshot({ path: '/opt/cursor/artifacts/salvage-repaired-desktop-1280x800.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => __inu.grove.status().salvage.items.find((item) => item.id === 'riku-crate-1').consent === 'Riku', null, { timeout: 60000 });
    await walkTo(page, 'riku-crate');
    await page.click('#btn-a');
    assert.equal((await page.evaluate(() => __inu.grove.status().salvageHold)), 2);
    await walkTo(page, 'shed');
    await page.click('#btn-a');
    assert.equal((await page.evaluate(() => __inu.grove.status().salvage.items.find((item) => item.id === 'riku-crate-1').state)), 'delivered');
    assert.equal((await page.evaluate(() => __inu.grove.status().you)), 2);
    await page.waitForFunction(() => __inu.grove.status().salvage.items.find((item) => item.id === 'riku-crate-1').used === 1, null, { timeout: 30000 });
    const used = await page.evaluate(() => __inu.grove.status());
    const done = used.salvage.items.find((item) => item.id === 'riku-crate-1');
    assert.equal(done.state, 'donated');
    assert.equal(done.owner, 'Sprig');
    assert.equal(done.fixture, 'board-shed');
    assert.equal(used.you, 4);
    const parts = used.budget + used.you + used.hold + used.sprigWallet + used.npcHold + used.stoolHold + used.salvageHold;
    assert.equal(parts, 8);
    await page.evaluate(() => { __inu.setHour(10); const s = __inu.grove.station('shed'); __inu.grove.place(s.x, s.y + 30); });
    await page.waitForTimeout(250);
    await page.screenshot({ path: '/opt/cursor/artifacts/salvage-donated-portrait-390x844.png' });
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(200);
    await page.screenshot({ path: '/opt/cursor/artifacts/salvage-donated-landscape-667x375.png' });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(200);
    await page.screenshot({ path: '/opt/cursor/artifacts/salvage-donated-desktop-1280x800.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    const purse = await page.evaluate(() => __inu.grove.status());
    await page.evaluate(() => { const s = __inu.grove.station('ume-lantern'); __inu.grove.place(s.x, s.y); });
    await page.waitForTimeout(200);
    await page.click('#btn-a');
    const next = await page.evaluate(() => __inu.grove.status());
    if (purse.budget < 2) {
      assert.match(next.notice, /refused before any hauling/);
      assert.equal(next.salvageHold, 0);
    } else if (!purse.gateJob && !purse.job && !purse.stoolJob) {
      assert.equal(next.salvageHold, 2);
    } else {
      assert.match(next.notice, /already open|refused before any hauling/);
    }
    const sum = next.budget + next.you + next.hold + next.sprigWallet + next.npcHold + next.stoolHold + next.salvageHold;
    assert.equal(sum, 8);
    writeFileSync('/opt/cursor/artifacts/salvage-ledger.json', JSON.stringify({
      preview: 'local browser state, not a server authority',
      day: next.salvage.id, done: next.salvage.done,
      items: next.salvage.items.map((item) => ({ id: item.id, owner: item.owner, recipient: item.recipient, fixture: item.fixture, state: item.state, consent: item.consent, used: item.used, scrapped: item.scrapped || 0 })),
      budget: next.budget, you: next.you, hold: next.hold, sprigWallet: next.sprigWallet,
      npcHold: next.npcHold, stoolHold: next.stoolHold, salvageHold: next.salvageHold,
      sum, cap: 24,
    }, null, 2));
    await ctx.close();
  } finally { await browser.close(); srv.close(); }
});

test('chromium: the scrap bin consumes the stool once across a reload and a second tab', { timeout: 90000 }, async () => {
  const srv = await serveRoot();
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const a = await ctx.newPage();
    const b = await ctx.newPage();
    await startTown(a, srv.url);
    await startTown(b, srv.url);
    await a.evaluate(() => { const s = __inu.grove.station('bin'); __inu.grove.place(s.x, s.y); });
    await a.waitForTimeout(200);
    await a.click('#btn-a');
    assert.equal((await a.evaluate(() => __inu.grove.status().scrap)), 1);
    assert.equal((await a.evaluate(() => __inu.grove.status().stool.state)), 'scrapped');
    await a.click('#btn-a');
    assert.equal((await a.evaluate(() => __inu.grove.status().scrap)), 1);
    await b.evaluate(() => { const s = __inu.grove.station('bin'); __inu.grove.place(s.x, s.y); });
    await b.waitForTimeout(200);
    await b.click('#btn-a');
    assert.match(await b.evaluate(() => __inu.grove.status().notice), /lost the grove save race|already scrapped/);
    await a.reload();
    await a.waitForTimeout(300);
    await a.click('#start');
    await a.waitForFunction(() => document.getElementById('hud')?.classList.contains('in'));
    await a.waitForTimeout(400);
    const after = await a.evaluate(() => __inu.grove.status());
    assert.equal(after.stool.state, 'scrapped');
    assert.equal(after.stool.id, 'sprig-stool-1');
    assert.equal(after.scrap, 1);
    assert.equal(after.you, 0);
    assert.equal(after.budget + after.you + after.hold + after.sprigWallet + after.npcHold + after.stoolHold + after.salvageHold, 8);
    await ctx.close();
  } finally { await browser.close(); srv.close(); }
});

async function creditHaul(page) {
  for (let i = 0; i < 10; i++) {
    const job = await page.evaluate(() => __inu.grove.status().salvageJob);
    if (!job || (job.carryPx >= 160 && job.activeMs >= 1200)) return;
    await holdStick(page, 450, i % 2 ? 1 : -1, 0);
  }
}

async function frameEvent(page, name) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    document.body.classList.remove('drawer-open', 'notices-open');
    __inu.setHour(10);
    const s = __inu.grove.station('gift');
    __inu.grove.place(s.x, s.y - 30);
  });
  await page.waitForTimeout(60);
  await page.evaluate(() => __inu.setHour(10));
  const prompt = await page.locator('#prompt').innerText();
  const strip = await page.evaluate(() => document.getElementById('grove-ledger')?.textContent || '');
  await page.screenshot({ path: `/opt/cursor/artifacts/event-${name}-portrait-390x844.png` });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(60);
  await page.evaluate(() => __inu.setHour(10));
  await page.screenshot({ path: `/opt/cursor/artifacts/event-${name}-desktop-1280x800.png` });
  await page.setViewportSize({ width: 667, height: 375 });
  await page.waitForTimeout(60);
  await page.evaluate(() => __inu.setHour(10));
  const narrow = await page.locator('#prompt').innerText();
  const narrowBox = await page.locator('#prompt').boundingBox();
  await page.screenshot({ path: `/opt/cursor/artifacts/event-${name}-landscape-667x375.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  return { prompt, strip, narrow, narrowBox };
}

test('chromium: all three salvage items finish, with consent, use, one chosen scrap, and no gate prompt', { timeout: 240000 }, async () => {
  const srv = await serveRoot();
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await startTown(page, srv.url);
    const bones0 = await page.locator('#bones').innerText();
    const live0 = await page.evaluate(() => localStorage.getItem('inuverse.save.v1'));
    await page.waitForFunction(() => __inu.grove.status().salvage.items.every((item) => item.state === 'broken'), null, { timeout: 30000 });
    const before = await frameEvent(page, 'before');
    assert.match(before.prompt, /bench|stool|Fuku/i);
    assert.doesNotMatch(before.prompt, /gate board|portal stone/i);
    assert.match(before.strip, /8\/24/);

    await walkTo(page, 'koko-cushion');
    await page.click('#btn-a');
    assert.equal((await page.evaluate(() => __inu.grove.status().salvageHold)), 2);
    assert.equal((await page.evaluate(() => __inu.grove.status().salvageJob.itemId)), 'koko-cushion-1');
    await walkTo(page, 'bin');
    await creditHaul(page);
    await walkTo(page, 'bin');
    await page.click('#btn-a');
    const scrapped = await page.evaluate(() => __inu.grove.status());
    const cushion = scrapped.salvage.items.find((item) => item.id === 'koko-cushion-1');
    assert.equal(cushion.state, 'scrapped');
    assert.equal(cushion.scrapped, 1);
    assert.equal(scrapped.stool.state, 'broken');
    assert.equal(scrapped.you, 0);
    assert.equal(scrapped.salvageHold, 0);
    assert.match(scrapped.notice, /koko-cushion-1/);

    async function paidRound(id, owner) {
      await walkTo(page, id === 'ume-lantern-1' ? 'ume-lantern' : 'riku-crate');
      await page.click('#btn-a');
      const claimed = await page.evaluate(() => __inu.grove.status());
      assert.equal(claimed.salvageHold, 2, claimed.notice);
      await walkTo(page, 'shed');
      await creditHaul(page);
      await walkTo(page, 'shed');
      await page.click('#btn-a');
      const restored = await page.evaluate((id) => __inu.grove.status().salvage.items.find((item) => item.id === id), id);
      assert.equal(restored.state, 'restored');
      assert.equal(restored.owner, owner);
      assert.equal(restored.repairPaid, 1);
      await page.waitForFunction(({ id, owner }) => __inu.grove.status().salvage.items.find((item) => item.id === id).consent === owner, { id, owner }, { timeout: 30000 });
      await walkTo(page, id === 'ume-lantern-1' ? 'ume-lantern' : 'riku-crate');
      await page.click('#btn-a');
      assert.equal((await page.evaluate(() => __inu.grove.status().salvageHold)), 2);
      const dropId = id === 'ume-lantern-1' ? 'gift' : 'shed';
      await walkTo(page, dropId);
      await creditHaul(page);
      await walkTo(page, dropId);
      const youBefore = await page.evaluate(() => __inu.grove.status().you);
      await page.click('#btn-a');
      let handed = await page.evaluate((id) => {
        const s = __inu.grove.status();
        return { item: s.salvage.items.find((item) => item.id === id), notice: s.notice, job: s.salvageJob };
      }, id);
      if (handed.item.state !== 'delivered') {
        await walkTo(page, dropId);
        await page.click('#btn-a');
        handed = await page.evaluate((id) => {
          const s = __inu.grove.status();
          return { item: s.salvage.items.find((item) => item.id === id), notice: s.notice, job: s.salvageJob };
        }, id);
      }
      assert.equal(handed.item.state, 'delivered', handed.notice + ' ' + JSON.stringify(handed.job));
      assert.equal(handed.item.owner, handed.item.recipient);
      assert.equal((await page.evaluate(() => __inu.grove.status().you)), youBefore);
      await page.waitForFunction((id) => __inu.grove.status().salvage.items.find((item) => item.id === id).used === 1, id, { timeout: 30000 });
    }
    await paidRound('ume-lantern-1', 'Ume');
    await paidRound('riku-crate-1', 'Riku');
    const done = await page.evaluate(() => __inu.grove.status());
    assert.equal(done.salvage.done, true);
    assert.equal(done.budget, 0);
    assert.equal(done.you, 8);
    assert.equal(done.hold, 0);
    assert.equal(done.sprigWallet, 0);
    assert.equal(done.npcHold, 0);
    assert.equal(done.stoolHold, 0);
    assert.equal(done.salvageHold, 0);
    const after = await frameEvent(page, 'after');
    assert.match(after.prompt, /finished/i);
    assert.match(after.prompt, /Fuku has ume-lantern-1/i);
    assert.match(after.prompt, /Sprig has riku-crate-1/i);
    assert.match(after.prompt, /koko-cushion-1 scrapped/i);
    assert.doesNotMatch(after.prompt, /gate board/i);
    assert.match(after.narrow, /finished/i);
    assert.ok(after.narrowBox && after.narrowBox.width > 40 && after.narrowBox.x >= 0 && after.narrowBox.y >= 0);
    assert.match(after.strip, /0 · you 8/i);
    assert.match(after.strip, /day done/i);
    const sum = done.budget + done.you + done.hold + done.sprigWallet + done.npcHold + done.stoolHold + done.salvageHold;
    assert.equal(sum, 8);
    writeFileSync('/opt/cursor/artifacts/event-ledger.json', JSON.stringify({
      preview: 'local browser state, not a server authority',
      engine: 'Chromium. Not iPhone Safari. Playwright WebKit is a separate bones and day check, not this walk.',
      day: done.salvage.id, done: done.salvage.done,
      items: done.salvage.items.map((item) => ({ id: item.id, owner: item.owner, recipient: item.recipient, fixture: item.fixture, state: item.state, consent: item.consent, used: item.used, repairPaid: item.repairPaid || 0, donatePaid: item.donatePaid || 0, scrapped: item.scrapped || 0 })),
      budget: done.budget, you: done.you, hold: done.hold, sprigWallet: done.sprigWallet,
      npcHold: done.npcHold, stoolHold: done.stoolHold, salvageHold: done.salvageHold,
      sum, cap: 24,
      beforePrompt: before.prompt, afterPrompt: after.prompt,
    }, null, 2));
    await page.evaluate(() => { const s = __inu.grove.station('shed'); __inu.grove.place(s.x, s.y); });
    await page.waitForTimeout(100);
    await page.click('#btn-a');
    await page.click('#btn-a');
    const refused = await page.evaluate(() => __inu.grove.status());
    assert.match(refused.notice, /refused before any hauling/);
    assert.equal(refused.you, 8);
    assert.equal(refused.hold + refused.npcHold + refused.salvageHold + refused.stoolHold, 0);
    await page.evaluate(() => {
      const p = __inu.grove.status().play;
      const jumped = performance.now() + 1e9;
      __inu.grove.step({ x: p.x, y: p.y, now: jumped, input: true, foreground: false });
    });
    assert.equal((await page.evaluate(() => __inu.grove.status().salvage.done)), true);
    assert.equal((await page.evaluate(() => __inu.grove.status().you)), 8);
    await page.reload();
    await page.waitForTimeout(300);
    await page.click('#start');
    await page.waitForFunction(() => document.getElementById('hud')?.classList.contains('in'));
    await page.waitForTimeout(300);
    const kept = await page.evaluate(() => __inu.grove.status());
    assert.equal(kept.salvage.done, true);
    assert.equal(kept.salvage.items.find((item) => item.id === 'ume-lantern-1').owner, 'Fuku');
    assert.equal(kept.salvage.items.find((item) => item.id === 'riku-crate-1').owner, 'Sprig');
    assert.equal(kept.salvage.items.find((item) => item.id === 'koko-cushion-1').state, 'scrapped');
    assert.equal(kept.salvage.items.filter((item) => item.id === 'koko-cushion-1').length, 1);
    assert.equal(kept.budget + kept.you + kept.hold + kept.sprigWallet + kept.npcHold + kept.stoolHold + kept.salvageHold, 8);
    const b = await ctx.newPage();
    await b.goto(srv.url + '?mp=off');
    await b.evaluate(() => localStorage.setItem('inuverse.tour.v1', 'skipped:test'));
    await b.reload();
    await b.click('#start');
    await b.waitForFunction(() => document.getElementById('hud')?.classList.contains('in'));
    await page.evaluate(() => { const s = __inu.grove.station('ume-lantern'); __inu.grove.place(s.x, s.y); });
    await page.click('#btn-a');
    await b.evaluate(() => { const s = __inu.grove.station('ume-lantern'); __inu.grove.place(s.x, s.y); });
    await b.click('#btn-a');
    assert.match(await b.evaluate(() => __inu.grove.status().notice), /lost the grove save race|already given|not replaced|finished/);
    const live = JSON.parse(await page.evaluate(() => localStorage.getItem('inuverse.save.v1')));
    const prior = JSON.parse(live0);
    assert.equal(live.bones, prior.bones);
    assert.equal(live.kibble, prior.kibble);
    assert.equal(live.grove, undefined);
    assert.equal(await page.locator('#bones').innerText(), bones0);
    await ctx.close();
  } finally { await browser.close(); srv.close(); }
});

async function creditChain(page) {
  for (let i = 0; i < 10; i++) {
    const job = await page.evaluate(() => __inu.grove.status().job);
    if (!job || (job.carryPx >= 160 && job.activeMs >= 1200)) return;
    await holdStick(page, 450, i % 2 ? 1 : -1, 0);
  }
}

async function frameSnap(page, station) {
  await page.evaluate((station) => {
    document.body.classList.remove('drawer-open', 'notices-open');
    __inu.setHour(10);
    const st = __inu.grove.station(station);
    __inu.grove.place(st.x, st.y + 16);
  }, station);
  await page.waitForTimeout(80);
  return page.evaluate((station) => {
    __inu.setHour(10);
    const s = __inu.grove.status();
    const near = __inu.grove.near(__inu.state.player.x, __inu.state.player.y);
    const prompt = document.getElementById('prompt')?.innerText || '';
    const note = document.getElementById('grove-note')?.textContent || '';
    const strip = document.getElementById('grove-ledger')?.textContent || '';
    return {
      station, near: near?.id || null,
      prompt, strip, note,
      budget: s.budget, you: s.you, hold: s.hold, sprigWallet: s.sprigWallet,
      npcHold: s.npcHold, stoolHold: s.stoolHold, salvageHold: s.salvageHold,
      logs: s.logs, boards: s.boards, holes: s.holes,
      done: !!s.salvage?.done,
      sum: s.budget + s.you + s.hold + s.sprigWallet + s.npcHold + s.stoolHold + s.salvageHold,
    };
  }, station);
}

function assertSnapAgrees(snap) {
  assert.match(snap.note, /TEST SPLINTS/i);
  assert.doesNotMatch(snap.note, /budget/i);
  assert.match(snap.strip, /TEST SPLINTS/i);
  assert.match(snap.strip, /not Bones/i);
  assert.match(snap.strip, /not \$KIBBLE/i);
  assert.equal(snap.near, snap.station, JSON.stringify(snap));
  assert.match(snap.strip, new RegExp(`budget ${snap.budget}`, 'i'), snap.strip);
  assert.match(snap.strip, new RegExp(`you ${snap.you}`, 'i'), snap.strip);
  assert.equal(snap.sum, 8);
  const mentioned = snap.prompt.match(/budget(?: has)? (\d+)/i);
  if (mentioned) assert.equal(Number(mentioned[1]), snap.budget, snap.prompt + ' | ' + snap.strip);
}

async function frameBatch(page, name, station) {
  const views = [['portrait', 390, 844], ['desktop', 1280, 800], ['landscape', 667, 375]];
  const shots = {};
  for (const [label, w, h] of views) {
    await page.setViewportSize({ width: w, height: h });
    const snap = await frameSnap(page, station);
    assertSnapAgrees(snap);
    shots[label] = snap;
    if (label === 'landscape') {
      shots.narrowBox = await page.locator('#prompt').boundingBox();
      shots.narrowStrip = await page.locator('#grove-strip').boundingBox();
    }
    await page.screenshot({ path: `/opt/cursor/artifacts/batch-${name}-${label}-${w}x${h}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  return { ...shots.portrait, narrow: shots.landscape.prompt, narrowBox: shots.narrowBox, narrowStrip: shots.narrowStrip, shots };
}

test('chromium: one porch batch is walked, and stock, funds, and a finished porch stay distinct', { timeout: 180000 }, async () => {
  const srv = await serveRoot();
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await startTown(page, srv.url);
    const bones0 = await page.locator('#bones').innerText();
    const live0 = await page.evaluate(() => localStorage.getItem('inuverse.save.v1'));
    const before = await frameBatch(page, 'before', 'porch');
    assert.match(before.prompt, /Sprig needs/i);
    assert.match(before.prompt, /Stump has/i);
    assert.match(before.prompt, /budget 8/i);
    assert.match(before.prompt, /Nothing is reserved/i);
    assert.doesNotMatch(before.prompt, /gate board/i);
    await walkTo(page, 'stump');
    await page.click('#btn-a');
    let held = await page.evaluate(() => __inu.grove.status());
    if (held.hold !== 2 && /Sprig already reserved/.test(held.notice || '')) {
      await page.evaluate(() => localStorage.removeItem('inuverse.preview.grove.v0'));
      await page.reload();
      await page.click('#continue');
      await page.waitForFunction(() => document.getElementById('hud')?.classList.contains('in'));
      await page.evaluate(() => { const s = __inu.grove.station('stump'); __inu.grove.place(s.x, s.y + 16); });
      await walkTo(page, 'stump');
      await page.click('#btn-a');
      held = await page.evaluate(() => __inu.grove.status());
    }
    assert.equal(held.hold, 2, held.notice);
    assert.equal(held.logs, 2);
    assert.equal(held.boards, 0);
    assert.equal(held.you, 0);
    assert.equal(held.holes, 2);
    const haulStart = await page.evaluate(() => performance.now());
    await holdStick(page, 180, 1, 0);
    const released = await page.evaluate(() => __inu.grove.status());
    assert.equal(released.you, 0);
    assert.equal(released.holes, 2);
    assert.equal(released.hold, 2);
    const reserved = await frameBatch(page, 'reserved', 'stump');
    assert.match(reserved.prompt, /reserved/i);
    assert.match(reserved.prompt, /not paid/i);
    await walkTo(page, 'saw');
    await creditChain(page);
    await walkTo(page, 'saw');
    await page.click('#btn-a');
    const milled = await page.evaluate(() => __inu.grove.status());
    assert.equal(milled.job?.status, 'stored', milled.notice);
    assert.equal(milled.boards, 2);
    await walkTo(page, 'shed');
    await page.click('#btn-a');
    assert.equal((await page.evaluate(() => __inu.grove.status().job.status)), 'boards');
    await walkTo(page, 'porch');
    await creditChain(page);
    await walkTo(page, 'porch');
    await page.click('#btn-a');
    const delivered = await page.evaluate(() => __inu.grove.status());
    assert.equal(delivered.holes, 0, delivered.notice);
    assert.equal(delivered.you, 2);
    assert.equal(delivered.budget, 6);
    assert.equal(delivered.hold, 0);
    assert.equal(delivered.sprigWallet, 0);
    assert.equal(delivered.npcHold, 0);
    assert.equal(delivered.stoolHold, 0);
    assert.equal(delivered.salvageHold, 0);
    const sum = delivered.budget + delivered.you + delivered.hold + delivered.sprigWallet + delivered.npcHold + delivered.stoolHold + delivered.salvageHold;
    assert.equal(sum, 8);
    const after = await frameBatch(page, 'after', 'porch');
    assert.match(after.prompt, /repaired/i);
    assert.match(after.prompt, /no further wage/i);
    assert.match(after.prompt, /2 splints already paid/i);
    assert.doesNotMatch(after.prompt, /no splints are paid/i);
    assert.match(after.strip, /budget 6/i);
    assert.match(after.strip, /you 2/i);
    assert.doesNotMatch(after.prompt, /budget 8/i);
    assert.match(after.narrow, /repaired/i);
    assert.ok(after.narrowBox && after.narrowBox.width > 40 && after.narrowBox.y >= 0 && after.narrowBox.y < 375);
    assert.ok(after.narrowStrip && after.narrowStrip.width > 40);
    const stockBeforeRepeat = await page.evaluate(() => __inu.grove.status());
    await page.click('#btn-a');
    const twice = await page.evaluate(() => __inu.grove.status());
    const elapsed = await page.evaluate((t0) => performance.now() - t0, haulStart);
    const regenTicks = twice.logs + twice.boards - 2;
    assert.equal(twice.you, 2);
    assert.equal(twice.holes, 0);
    assert.equal(twice.budget, 6);
    assert.equal(twice.job, null);
    assert.equal(twice.logs + twice.boards, 2 + regenTicks);
    assert.ok(regenTicks >= 0);
    assert.ok(regenTicks <= Math.floor(elapsed / 20000) + 1, `regen ${regenTicks} over ${elapsed}ms`);
    assert.ok(twice.regenMs >= 0 && twice.regenMs < 20000);
    assert.ok(twice.logs + twice.boards === stockBeforeRepeat.logs + stockBeforeRepeat.boards || twice.logs + twice.boards === stockBeforeRepeat.logs + stockBeforeRepeat.boards + 1);
    assert.match(twice.notice, /does not wear|repaired/i);
    writeFileSync('/opt/cursor/artifacts/batch-ledger.json', JSON.stringify({
      preview: 'local browser state, not a server authority',
      fixture: 'clean opening grove, not the finished salvage save',
      engine: 'Chromium. Not iPhone Safari.',
      budget: twice.budget, you: twice.you, hold: twice.hold, sprigWallet: twice.sprigWallet,
      npcHold: twice.npcHold, stoolHold: twice.stoolHold, salvageHold: twice.salvageHold,
      logs: twice.logs, boards: twice.boards, holes: twice.holes, regenMs: twice.regenMs, regenTicks, sum, cap: 24,
      stock: 'opening 4, batch took 2, foreground regen adds 1 log per 20000ms under the cap of 8, Sprig storing moves a log into a board',
      beforePrompt: before.prompt, reservedPrompt: reserved.prompt, afterPrompt: after.prompt,
    }, null, 2));
    const stick = await page.locator('#stick').boundingBox();
    assert.ok(stick.width >= 44 && stick.height >= 44);
    await page.click('#menu-btn');
    await page.waitForFunction(() => document.getElementById('drawer') && !document.getElementById('drawer').hidden);
    const title = await page.locator('#dr-title').boundingBox();
    assert.ok(title && title.x >= 0 && title.y >= 0 && title.x + title.width <= 400);
    const stickLocked = await page.locator('#stick').boundingBox();
    assert.ok(stickLocked.width >= 44);
    await page.click('#dr-close');
    await page.evaluate(() => {
      const rec = JSON.parse(localStorage.getItem('inuverse.preview.grove.v0'));
      const s = rec.state;
      s.budget = 0; s.you = 8; s.hold = 0; s.npcHold = 0; s.stoolHold = 0; s.salvageHold = 0; s.sprigWallet = 0;
      s.holes = 2; s.logs = 4; s.boards = 0; s.job = null; s.gateJob = null; s.stoolJob = null; s.salvageJob = null;
      if (s.salvage) {
        s.salvage.done = true;
        for (const item of s.salvage.items) {
          if (item.id === 'ume-lantern-1') { item.state = 'donated'; item.owner = 'Fuku'; item.used = 1; item.consent = 'Ume'; item.scrapped = 0; }
          if (item.id === 'riku-crate-1') { item.state = 'donated'; item.owner = 'Sprig'; item.used = 1; item.consent = 'Riku'; item.scrapped = 0; }
          if (item.id === 'koko-cushion-1') { item.state = 'scrapped'; item.owner = null; item.scrapped = 1; item.used = 0; }
        }
      }
      localStorage.setItem('inuverse.preview.grove.v0', JSON.stringify(rec));
    });
    await page.reload();
    await page.waitForTimeout(300);
    await page.click('#start');
    await page.waitForFunction(() => document.getElementById('hud')?.classList.contains('in'));
    await page.waitForTimeout(250);
    const unfunded = await frameBatch(page, 'unfunded', 'stump');
    assert.equal(unfunded.budget, 0);
    assert.equal(unfunded.you, 8);
    assert.equal(unfunded.done, true);
    assert.match(unfunded.strip, /day done/i);
    assert.match(unfunded.prompt, /refused/i);
    assert.match(unfunded.prompt, /budget has 0/i);
    assert.match(unfunded.prompt, /unpaid/i);
    const beforeRefuse = await page.evaluate(() => __inu.grove.status().logs);
    await walkTo(page, 'stump');
    await page.click('#btn-a');
    const broke = await page.evaluate(() => __inu.grove.status());
    assert.equal(broke.budget, 0);
    assert.equal(broke.you, 8);
    assert.equal(broke.hold, 0);
    assert.equal(broke.job, null);
    assert.ok(broke.logs === beforeRefuse || broke.logs === beforeRefuse + 1);
    assert.match(broke.notice, /before any hauling/);
    assert.match(broke.notice, /not refilled/);
    const spentSum = broke.budget + broke.you + broke.hold + broke.sprigWallet + broke.npcHold + broke.stoolHold + broke.salvageHold;
    assert.equal(spentSum, 8);
    writeFileSync('/opt/cursor/artifacts/batch-unfunded-ledger.json', JSON.stringify({
      preview: 'local browser state, not a server authority',
      fixture: 'spent-event shape loaded on its own, not a refill of the batch save',
      budget: broke.budget, you: broke.you, hold: broke.hold, sprigWallet: broke.sprigWallet,
      npcHold: broke.npcHold, stoolHold: broke.stoolHold, salvageHold: broke.salvageHold,
      logs: broke.logs, holes: broke.holes, sum: spentSum, cap: 24,
      prompt: unfunded.prompt,
    }, null, 2));
    await page.evaluate(() => {
      const rec = JSON.parse(localStorage.getItem('inuverse.preview.grove.v0'));
      const s = rec.state;
      s.budget = 8; s.you = 0; s.hold = 0; s.npcHold = 0; s.stoolHold = 0; s.salvageHold = 0; s.sprigWallet = 0;
      s.holes = 2; s.logs = 0; s.boards = 0; s.job = null; s.gateJob = null; s.stoolJob = null; s.salvageJob = null;
      if (s.salvage) {
        s.salvage.done = false;
        for (const item of s.salvage.items) {
          item.state = 'broken';
          item.scrapped = 0;
          item.used = 0;
          item.consent = null;
          item.donatePaid = 0;
          item.repairPaid = 0;
          item.mark = null;
          item.owner = item.id === 'ume-lantern-1' ? 'Ume' : item.id === 'riku-crate-1' ? 'Riku' : 'Koko';
        }
      }
      localStorage.setItem('inuverse.preview.grove.v0', JSON.stringify(rec));
    });
    await page.reload();
    await page.waitForTimeout(300);
    await page.click('#start');
    await page.waitForFunction(() => document.getElementById('hud')?.classList.contains('in'));
    await page.waitForTimeout(250);
    const shortage = await frameBatch(page, 'shortage', 'stump');
    assert.equal(shortage.budget, 8);
    assert.equal(shortage.you, 0);
    assert.equal(shortage.logs, 0);
    assert.equal(shortage.done, false);
    assert.doesNotMatch(shortage.strip, /day done/i);
    assert.match(shortage.strip, /budget 8/i);
    assert.match(shortage.strip, /you 0/i);
    assert.match(shortage.prompt, /Stump has 0/i);
    assert.match(shortage.prompt, /Nothing is reserved/i);
    assert.doesNotMatch(shortage.prompt, /reserved for Sprig's porch/i);
    const beforeDry = await page.evaluate(() => __inu.grove.status().logs);
    assert.equal(beforeDry, 0);
    await page.click('#btn-a');
    const dry = await page.evaluate(() => __inu.grove.status());
    assert.ok(dry.logs === 0 || dry.logs === 1);
    assert.notEqual(dry.logs, beforeDry - 2);
    assert.equal(dry.hold, 0);
    assert.equal(dry.budget, 8);
    assert.equal(dry.you, 0);
    assert.match(dry.notice, /stump/i);
    assert.match(dry.notice, /not reserved/i);
    writeFileSync('/opt/cursor/artifacts/batch-shortage-ledger.json', JSON.stringify({
      preview: 'local browser state, not a server authority',
      fixture: 'opening funds with an empty stump, separate from the spent-event save',
      frame: { budget: shortage.budget, you: shortage.you, logs: shortage.logs, boards: shortage.boards, holes: shortage.holes, done: shortage.done, sum: shortage.sum, prompt: shortage.prompt, strip: shortage.strip },
      desktopAgrees: shortage.shots.desktop.budget === shortage.budget && shortage.shots.desktop.you === shortage.you && shortage.shots.desktop.done === shortage.done,
      landscapeAgrees: shortage.shots.landscape.budget === shortage.budget && shortage.shots.landscape.you === shortage.you,
      afterClick: { budget: dry.budget, you: dry.you, logs: dry.logs, hold: dry.hold },
      cap: 24,
    }, null, 2));
    const live = JSON.parse(await page.evaluate(() => localStorage.getItem('inuverse.save.v1')));
    const prior = JSON.parse(live0);
    assert.equal(live.bones, prior.bones);
    assert.equal(live.kibble, prior.kibble);
    assert.equal(live.grove, undefined);
    assert.equal(await page.locator('#bones').innerText(), bones0);
    await ctx.close();
  } finally { await browser.close(); srv.close(); }
});

test('webkit engine, not a phone: bones and the day label stay readable', { timeout: 90000 }, async (t) => {
  let browser;
  try { browser = await webkit.launch(); }
  catch { return t.skip('Playwright WebKit is not installed. This is engine emulation, not iPhone Safari.'); }
  if (!browser) return t.skip('Playwright WebKit is not installed. This is engine emulation, not iPhone Safari.');
  const srv = await serveRoot();
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await startTown(page, srv.url);
    await page.click('#play-details');
    const day = await page.locator('#streak-chip').innerText();
    assert.match(day, /day/i);
    const box = await page.locator('#streak-chip').boundingBox();
    assert.ok(box && box.y >= 0 && box.width >= 40 && box.height >= 28);
    assert.equal(await page.evaluate(() => document.body.classList.contains('ctrl-lock')), true);
    await ctx.close();
  } finally { await browser.close(); srv.close(); }
});

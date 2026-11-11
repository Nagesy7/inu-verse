// Phone HUD readability: Bones and the day streak stay full size. Clock, season, tasks, and sound
// sit in the menu on a portrait phone. The landscape tour, including its buttons, stays inside the
// viewport above the legal footer. Chat is the real multiplayer bar against a local test socket.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import { chromium } from 'playwright';
import { serveRoot } from './serve-root.mjs';

const SHOTS = '/opt/cursor/artifacts';

function wsAccept(key) {
  return crypto.createHash('sha1').update(String(key) + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
}

function sendText(socket, text) {
  const payload = Buffer.from(text);
  const header = payload.length < 126
    ? Buffer.from([0x81, payload.length])
    : Buffer.from([0x81, 126, (payload.length >> 8) & 255, payload.length & 255]);
  socket.write(Buffer.concat([header, payload]));
}

function startLocalChat() {
  const seen = [];
  const srv = http.createServer((q, r) => { r.statusCode = 404; r.end('local chat test socket'); });
  srv.on('upgrade', (req, socket) => {
    const key = req.headers['sec-websocket-key'];
    if (!key) { socket.destroy(); return; }
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${wsAccept(key)}\r\n\r\n`);
    let buf = Buffer.alloc(0);
    socket.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      while (buf.length >= 2) {
        const op = buf[0] & 15;
        const masked = (buf[1] & 128) !== 0;
        let len = buf[1] & 127;
        let off = 2;
        if (len === 126) {
          if (buf.length < 4) return;
          len = buf.readUInt16BE(2);
          off = 4;
        } else if (len === 127) return;
        const need = off + (masked ? 4 : 0) + len;
        if (buf.length < need) return;
        let payload = buf.subarray(off + (masked ? 4 : 0), need);
        if (masked) {
          const mask = buf.subarray(off, off + 4);
          payload = Buffer.from(payload);
          for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
        }
        buf = buf.subarray(need);
        if (op === 8) { try { socket.end(); } catch {} return; }
        if (op !== 1) continue;
        const text = payload.toString();
        if (text === 'ping') continue;
        let msg;
        try { msg = JSON.parse(text); } catch { continue; }
        seen.push(msg);
        if (msg.t === 'hi') sendText(socket, JSON.stringify({ t: 'w', id: 'local-test', name: msg.name || 'Pup', inst: 1, room: msg.room || 'city', players: [] }));
      }
    });
  });
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok({
    url: `ws://127.0.0.1:${srv.address().port}`,
    seen,
    close: () => srv.close(),
  })));
}

async function boot(page, base, { two = false } = {}) {
  await page.goto(base);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:test'); });
  await page.reload();
  await page.waitForTimeout(600);
  await page.click('#start');
  if (two) await page.waitForFunction(() => document.body.classList.contains('inworld') && document.body.classList.contains('hud-two'), null, { timeout: 8000 });
  else await page.waitForFunction(() => document.body.classList.contains('inworld'), null, { timeout: 8000 });
}

test('portrait bones and day stay readable; menu holds the rest without overflow', { timeout: 120000 }, async () => {
  const srv = await serveRoot();
  const browser = await chromium.launch();
  const errs = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errs.push(String(e)));
    await boot(page, srv.url, { two: true });
    await page.waitForTimeout(700);
    const hud = await page.evaluate(() => {
      const q = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          text: (el.innerText || '').replace(/\s+/g, ' ').trim(),
          x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom,
          font: parseFloat(cs.fontSize),
          clipX: el.scrollWidth - el.clientWidth,
          clipY: el.scrollHeight - el.clientHeight,
          parent: el.parentElement?.id || '',
        };
      };
      const bones = document.getElementById('bones-chip');
      const num = document.getElementById('bones');
      const dayn = document.getElementById('streak-n');
      const nb = num.getBoundingClientRect();
      return {
        bones: q(bones),
        num: { w: nb.width, h: nb.height, font: parseFloat(getComputedStyle(num).fontSize), clipX: num.scrollWidth - num.clientWidth },
        day: q(document.getElementById('streak-chip')),
        dayn: dayn ? { font: parseFloat(getComputedStyle(dayn).fontSize), text: dayn.textContent, clipX: dayn.scrollWidth - dayn.clientWidth } : null,
        clock: q(document.getElementById('clock')),
        extent: getComputedStyle(document.documentElement).getPropertyValue('--iv-hud-extent').trim(),
        bottom: getComputedStyle(document.documentElement).getPropertyValue('--iv-ctrl-bottom').trim(),
        two: document.body.classList.contains('hud-two'),
        cls: document.body.className,
        vw: innerWidth, vh: innerHeight,
      };
    });
    assert.equal(hud.two, true, JSON.stringify(hud));
    assert.ok(hud.bones, 'bones chip missing');
    assert.ok(hud.num.font >= 16 && hud.num.w >= 12 && hud.num.clipX <= 1, JSON.stringify(hud.num));
    assert.ok(hud.bones.h >= 28 && hud.bones.right <= hud.vw - 48, JSON.stringify(hud.bones));
    assert.equal(hud.day.parent, 'play-body', JSON.stringify(hud.day));
    assert.equal(hud.clock.parent, 'play-body', JSON.stringify(hud.clock));
    assert.equal(hud.day.h, 0, 'day streak stays off the world until Town is open');
    assert.match(hud.extent, /^\d+px$/);
    assert.ok(parseInt(hud.extent, 10) <= 180, JSON.stringify(hud));
    await page.screenshot({ path: `${SHOTS}/town-portrait-390x844.png` });
    await page.tap('#play-details');
    const town = await page.evaluate(() => {
      const day = document.getElementById('streak-chip').getBoundingClientRect();
      const n = document.getElementById('streak-n');
      const ledger = document.getElementById('grove-ledger');
      return {
        locked: document.body.classList.contains('ctrl-lock'),
        pe: getComputedStyle(document.getElementById('stick')).pointerEvents,
        dayH: day.height,
        dayFont: parseFloat(getComputedStyle(n).fontSize),
        dayText: document.getElementById('streak-chip').innerText,
        ledger: ledger.innerText,
      };
    });
    assert.equal(town.locked, true);
    assert.equal(town.pe, 'none');
    assert.match(town.dayText, /day/i);
    assert.ok(town.dayFont >= 14 && town.dayH >= 28, JSON.stringify(town));
    assert.match(town.ledger, /budget/i);
    assert.match(town.ledger, /not Bones/i);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.getElementById('play-sheet').hidden && !document.body.classList.contains('ctrl-lock')), true);
    const wide = await page.evaluate(() => {
      const num = document.getElementById('bones');
      num.textContent = '99999';
      const r = num.getBoundingClientRect();
      const chip = document.getElementById('bones-chip').getBoundingClientRect();
      return { clip: num.scrollWidth - num.clientWidth, w: r.width, right: chip.right, vw: innerWidth };
    });
    assert.ok(wide.clip <= 1 && wide.w >= 40 && wide.right <= wide.vw - 48, JSON.stringify(wide));
    await page.screenshot({ path: `${SHOTS}/town-portrait-390x844-bones-99999.png` });
    await page.tap('#menu-btn');
    await page.waitForTimeout(250);
    const menu = await page.evaluate(() => {
      const card = document.querySelector('#drawer .dr-card').getBoundingClientRect();
      const rows = [...document.querySelectorAll('#drawer .dr-grid > *')].map((el) => {
        const r = el.getBoundingClientRect();
        return { id: el.id, text: (el.innerText || '').replace(/\s+/g, ' ').trim(), x: r.x, right: r.right, w: r.width, h: r.height, clipX: el.scrollWidth - el.clientWidth };
      });
      const clock = document.getElementById('clock');
      const cr = clock.getBoundingClientRect();
      const phantom = document.getElementById('btn-phantom');
      const pr = phantom.getBoundingClientRect();
      return {
        card: { x: card.x, right: card.right, bottom: card.bottom },
        rows,
        clock: { text: (clock.innerText || '').replace(/\s+/g, ' ').trim(), x: cr.x, right: cr.right, h: cr.height, clipX: clock.scrollWidth - clock.clientWidth },
        phantom: { text: (phantom.innerText || '').replace(/\s+/g, ' ').trim(), x: pr.x, right: pr.right, w: pr.width, h: pr.height, clipX: phantom.scrollWidth - phantom.clientWidth },
      };
    });
    assert.match(menu.phantom.text, /phantom/i);
    assert.ok(menu.phantom.w >= 44 && menu.phantom.h >= 44, JSON.stringify(menu.phantom));
    assert.ok(menu.phantom.clipX <= 2, JSON.stringify(menu.phantom));
    assert.ok(menu.phantom.x >= menu.card.x - 1 && menu.phantom.right <= menu.card.right + 2, JSON.stringify(menu.phantom));
    for (const row of menu.rows) {
      assert.ok(row.w >= 44 && row.h >= 44, JSON.stringify(row));
      assert.ok(row.x >= menu.card.x - 1 && row.right <= menu.card.right + 2, JSON.stringify(row));
    }
    const lock = await page.evaluate(() => {
      const stick = document.getElementById('stick').getBoundingClientRect();
      return {
        locked: document.body.classList.contains('ctrl-lock'),
        modal: document.getElementById('drawer').getAttribute('aria-modal'),
        pe: getComputedStyle(document.getElementById('stick')).pointerEvents,
        sw: stick.width, sh: stick.height,
      };
    });
    assert.equal(lock.locked, true);
    assert.equal(lock.modal, 'true');
    assert.equal(lock.pe, 'none');
    assert.ok(lock.sw >= 100 && lock.sh >= 100, JSON.stringify(lock));
    await page.tap('#dr-minimap');
    assert.equal(await page.evaluate(() => document.getElementById('drawer').hidden), false);
    const dock = await page.evaluate(() => {
      const hud = document.getElementById('hud').getBoundingClientRect();
      const card = document.querySelector('#drawer .dr-card').getBoundingClientRect();
      const stick = document.getElementById('stick').getBoundingClientRect();
      return { hudBottom: hud.bottom, cardTop: card.top, cardBottom: card.bottom, stickTop: stick.top };
    });
    assert.ok(dock.cardTop >= dock.hudBottom - 2, JSON.stringify(dock));
    assert.ok(dock.cardBottom <= dock.stickTop + 2, JSON.stringify(dock));
    await page.screenshot({ path: `${SHOTS}/town-portrait-390x844-menu.png` });
    await ctx.close();
  } finally {
    await browser.close();
    srv.close();
  }
  assert.deepEqual(errs.filter((e) => !/kibble-pay|inu-profile|inu-eco/i.test(e)), []);
});

test('landscape tour buttons stay inside the measured center, including 667x375', { timeout: 180000 }, async () => {
  const srv = await serveRoot();
  const browser = await chromium.launch();
  const measured = [];
  try {
    for (const vp of [{ width: 844, height: 390 }, { width: 667, height: 375 }]) {
    const ctx = await browser.newContext({ viewport: vp, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(srv.url);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(500);
    await page.click('#start');
    await page.waitForSelector('#tour:not([hidden])');
    await page.waitForTimeout(400);
    const before = await page.evaluate(() => {
      const q = (id) => {
        const el = document.getElementById(id);
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, w: r.width, h: r.height, text: (el.innerText || '').trim() };
      };
      const tour = q('tour');
      const next = q('t-next');
      const fold = q('t-fold');
      const legal = document.getElementById('inu-legal');
      const lr = legal ? legal.getBoundingClientRect() : null;
      const overlap = lr && next.x < lr.right && next.right > lr.x && next.y < lr.bottom && next.bottom > lr.y;
      const cs = getComputedStyle(document.documentElement);
      const left = parseInt(cs.getPropertyValue('--iv-ctrl-left'), 10);
      const right = parseInt(cs.getPropertyValue('--iv-ctrl-right'), 10);
      return { tour, next, fold, legal: lr && { x: lr.x, y: lr.y, right: lr.right, bottom: lr.bottom }, overlap, vw: innerWidth, vh: innerHeight, step: document.querySelector('#tour .tstep').textContent, left, right, center: innerWidth - left - right, steps: document.querySelector('#tour .tstep').textContent };
    });
    measured.push({ vp, center: before.center, left: before.left, right: before.right });
    assert.ok(before.center >= 240, JSON.stringify(before));
    assert.ok(before.tour.x >= before.left - 2 && before.tour.right <= before.vw - before.right + 2, JSON.stringify(before));
    for (const box of [before.tour, before.next, before.fold]) {
      assert.ok(box.x >= -1 && box.y >= -1 && box.right <= before.vw + 1 && box.bottom <= before.vh + 1, JSON.stringify({ box, vw: before.vw, vh: before.vh }));
      assert.ok(box.w > 20 && box.h > 16, JSON.stringify(box));
    }
    assert.equal(before.overlap, false, JSON.stringify(before));
    assert.ok(before.next.bottom <= before.tour.bottom + 1 && before.next.right <= before.tour.right + 1, JSON.stringify(before));
    await page.screenshot({ path: `${SHOTS}/town-landscape-${vp.width}x${vp.height}-tour.png` });
    await page.tap('#t-next');
    await page.waitForTimeout(200);
    const step = await page.evaluate(() => document.querySelector('#tour .tstep').textContent);
    assert.notEqual(step, before.step);
    await page.tap('#t-fold');
    await page.waitForTimeout(150);
    const folded = await page.evaluate(() => {
      const el = document.getElementById('tour-resume');
      const r = el.getBoundingClientRect();
      return { hidden: el.hidden, x: r.x, y: r.y, right: r.right, bottom: r.bottom, text: el.innerText, vw: innerWidth, vh: innerHeight };
    });
    assert.equal(folded.hidden, false);
    assert.match(folded.text, /resume/i);
    assert.ok(folded.right <= folded.vw && folded.bottom <= folded.vh, JSON.stringify(folded));
    await page.tap('#tour-resume');
    assert.equal(await page.evaluate(() => document.getElementById('tour').classList.contains('folded')), false);
    await ctx.close();
    }
    const { writeFileSync } = await import('node:fs');
    writeFileSync(`${SHOTS}/ux-bounds.json`, JSON.stringify(measured, null, 2));
  } finally {
    await browser.close();
    srv.close();
  }
});

test('desktop keeps a gold readable strip', { timeout: 90000 }, async () => {
  const srv = await serveRoot();
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await boot(page, srv.url);
    const hud = await page.evaluate(() => {
      const bones = document.getElementById('bones').closest('.chip');
      const day = document.getElementById('streak-chip');
      const clock = document.getElementById('clock');
      const q = (el) => { const r = el.getBoundingClientRect(); return { text: (el.innerText || '').replace(/\s+/g, ' ').trim(), w: r.width, h: r.height, parent: el.parentElement.id }; };
      return { bones: q(bones), day: q(day), clock: q(clock) };
    });
    assert.match(hud.bones.text, /bones/i);
    assert.ok(hud.bones.w >= 72, JSON.stringify(hud));
    assert.equal(hud.clock.parent, 'play-body');
    await page.click('#play-details');
    assert.match(await page.locator('#streak-chip').innerText(), /day/i);
    await page.screenshot({ path: `${SHOTS}/town-desktop-1280x800.png` });
    await ctx.close();
  } finally {
    await browser.close();
    srv.close();
  }
});

test('real chat bar builds against a local test socket and does not send', { timeout: 120000 }, async () => {
  const srv = await serveRoot();
  const chat = await startLocalChat();
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(`${srv.url}?mp=${encodeURIComponent(chat.url)}`);
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:test'); localStorage.removeItem('inuverse.mp.off'); });
    await page.reload();
    await page.waitForTimeout(500);
    await page.click('#start');
    await page.waitForFunction(() => {
      const i = document.getElementById('mp-say');
      const bar = document.getElementById('mp-chat');
      if (!i || i.disabled || !bar || bar.hidden || document.body.classList.contains('modal-open')) return false;
      const r = bar.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }, null, { timeout: 15000 });
    const lay = await page.evaluate(() => {
      const bar = document.getElementById('mp-chat');
      const say = document.getElementById('mp-say');
      const send = document.getElementById('mp-send');
      const bones = document.getElementById('bones').closest('.chip');
      const stick = document.getElementById('stick');
      const q = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, w: r.width, h: r.height }; };
      const a = q(bar), b = q(bones), s = q(stick), input = q(say), btn = q(send);
      const hit = (p, c) => p.x < c.right && p.right > c.x && p.y < c.bottom && p.bottom > c.y;
      return { bar: a, input, btn, hitBones: hit(a, b), hitStick: hit(a, s), vw: innerWidth, vh: innerHeight, host: location.search };
    });
    assert.match(lay.host, /mp=ws%3A%2F%2F127\.0\.0\.1/);
    assert.ok(lay.bar.x >= -1 && lay.bar.y >= -1 && lay.bar.right <= lay.vw + 1 && lay.bar.bottom <= lay.vh + 1, JSON.stringify(lay));
    assert.ok(lay.input.w >= 80 && lay.btn.w >= 44 && lay.btn.h >= 28, JSON.stringify(lay));
    assert.equal(lay.hitBones, false);
    assert.equal(lay.hitStick, false);
    await page.focus('#mp-say');
    await page.keyboard.type('local draft');
    assert.equal(await page.inputValue('#mp-say'), 'local draft');
    await page.evaluate(() => document.getElementById('mp-say').value = '');
    assert.equal(chat.seen.some((m) => m.t === 'c'), false);
    assert.ok(chat.seen.some((m) => m.t === 'hi'));
    await page.screenshot({ path: `${SHOTS}/town-portrait-390x844-local-chat.png` });
    await ctx.close();
  } finally {
    await browser.close();
    chat.close();
    srv.close();
  }
});

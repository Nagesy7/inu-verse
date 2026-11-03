// Feature batch #3: low-CPU minimap + portal stones (discover locally, warp free between found stones, full map from the minimap).
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { chromium } from 'playwright';
import * as PT from '../src/portals.js';
import * as MM from '../src/minimap.js';
import { isSolid, interactables, TILE, MAP_W, MAP_H, MAP, T } from '../src/world.js';
import { SPOTS } from '../src/sitspots.js';
import { SIM_SOLIDS } from '../src/sim/place.js';
import { serveRoot, overlaps } from './serve-root.mjs';

const memLS = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };

test('portal stones: one per district, original names, on open ground with a free landing tile, clear of doors/seats/sim buildings', () => {
  assert.ok(PT.STONES.length >= 8); assert.equal(new Set(PT.STONES.map((s) => s.id)).size, PT.STONES.length);
  const its = interactables({ plots: {}, packs: {} });
  for (const s of PT.STONES) {
    assert.ok(PT.placedOk(s), s.id + ' on open ground'); const a = PT.arrival(s); assert.ok(!isSolid(Math.floor(a.x / TILE), Math.floor(a.y / TILE)), s.id + ' landing tile walkable');
    assert.ok([T.GRASS, T.FLOWER, T.PLAZA, T.WALK].includes(MAP[s.ty][s.tx]), s.id + ' not on a road/water');
    assert.ok(its.every((i) => Math.hypot(i.tx - s.tx, i.ty - s.ty) >= 3), s.id + ' 3+ tiles from every interactable (no prompt fights)');
    assert.ok(SPOTS.every((q) => Math.hypot(q.x / TILE - s.tx - 0.5, q.y / TILE - s.ty - 0.5) >= 3), s.id + ' clear of sit spots');
    assert.ok(!SIM_SOLIDS.some((r) => s.tx >= r.x - 1 && s.tx <= r.x + r.w && s.ty >= r.y - 5 && s.ty <= r.y + 1), s.id + ' not hidden behind a sim building');
    for (const o of PT.STONES) if (o !== s) assert.ok(Math.hypot(o.tx - s.tx, o.ty - s.ty) > 8, `${s.id}/${o.id} spread out`);
    assert.ok(/^[A-Z][A-Za-z ]+$/.test(s.name)); }
  const ys = PT.STONES.map((s) => s.ty); assert.ok(Math.min(...ys) < 15 && Math.max(...ys) > 90, 'stones span the whole town (north to the farm/pond)');
});

test('discovery: walking near finds a stone once, saved on this device only (localStorage), garbage-tolerant', () => {
  const ls = memLS(), f = PT.loadFound(ls); assert.equal(f.size, 0);
  const s = PT.BY_ID.plaza, far = PT.discover(f, (s.tx + 0.5 + 4) * TILE, (s.ty + 0.5) * TILE); assert.equal(far, null, '4 tiles away: not yet');
  assert.equal(PT.discover(f, (s.tx + 0.5) * TILE, (s.ty + 2) * TILE)?.id, 'plaza'); assert.equal(PT.discover(f, (s.tx + 0.5) * TILE, (s.ty + 2) * TILE), null, 'only once');
  PT.saveFound(f, ls); assert.deepEqual([...PT.loadFound(ls)], ['plaza']); assert.equal(ls.m.get(PT.LS_KEY), '["plaza"]');
  ls.setItem(PT.LS_KEY, '{oops'); assert.equal(PT.loadFound(ls).size, 0); ls.setItem(PT.LS_KEY, '["plaza","nope",3]'); assert.deepEqual([...PT.loadFound(ls)], ['plaza'], 'unknown ids dropped');
  assert.equal(PT.stoneNear((s.tx + 0.5) * TILE, (s.ty + 1.5) * TILE)?.id, 'plaza', 'landing tile is in touch range');
});

test('warping: only from a found stone you are touching to another found stone; never to undiscovered ones', () => {
  const f = new Set(['plaza', 'farm']);
  assert.ok(PT.canWarp(f, 'plaza', 'farm')); assert.ok(!PT.canWarp(f, 'plaza', 'plaza'), 'not to itself'); assert.ok(!PT.canWarp(f, 'plaza', 'pond'), 'not to undiscovered');
  assert.ok(!PT.canWarp(f, 'pond', 'farm'), 'not from an undiscovered stone'); assert.ok(!PT.canWarp(f, 'plaza', 'nowhere'));
  const L = PT.warpList(f, 'plaza'); assert.equal(L.length, PT.STONES.length); assert.deepEqual(L.filter((w) => w.ok).map((w) => w.id), ['farm']); assert.ok(L.find((w) => w.id === 'plaza').here);
});

test('free + local only: no Bones, $KIBBLE, fees or network in portal/minimap code', () => {
  const src = fs.readFileSync(new URL('../src/portals.js', import.meta.url), 'utf8') + fs.readFileSync(new URL('../src/minimap.js', import.meta.url), 'utf8');
  assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|state\.bones|addBones|spend|kibble-pay|burn/i.test(src));
  const main = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8'), w = main.slice(main.indexOf('function warpTo('), main.indexOf('\n', main.indexOf('function warpTo(') + 400));
  assert.ok(w.length > 50 && !/bones|kibble|spend|pay/i.test(w), 'warpTo never touches currency');
});

test('minimap: player-centred window clamped to the map; redraws throttled and skipped while hidden', () => {
  let v = MM.miniView(32, 53, MAP_W, MAP_H); assert.equal(v.sx, 0, 'map is exactly minimap-wide'); assert.equal(v.sy, 53 * 2 - 70);
  v = MM.miniView(10, 2, MAP_W, MAP_H); assert.equal(v.sy, 0); v = MM.miniView(10, MAP_H - 1, MAP_W, MAP_H); assert.equal(v.sy, MAP_H * 2 - MM.VIEW_H, 'clamped at the south edge');
  assert.deepEqual(MM.tileAt(64, 70, { sx: 0, sy: 36 }), [32, 53]);
  const c = MM.makeMiniClock(125); assert.ok(c.due(0, true, 'a')); assert.ok(!c.due(16, true, 'a'), 'same spot, too soon'); assert.ok(c.due(32, true, 'b'), 'moved a pixel'); assert.ok(c.due(200, true, 'b'), 'time passed');
  assert.ok(!c.due(1000, false, 'z'), 'hidden: never draws'); let n = 0; for (let t = 0; t < 1000; t += 16) if (c.due(2000 + t, true, 'k')) n++; assert.ok(n <= 9, 'standing still: ~8 redraws a second, got ' + n);
});

test('browser: minimap on + fits the phone HUD, discovers stones by walking, A warps (free), minimap tap opens the full map with stones', { timeout: 120000 }, async () => {
  const srv = await serveRoot(); const b = await chromium.launch(); const errs = [];
  try { for (const vp of [{ width: 844, height: 390 }, { width: 667, height: 375 }]) {
    const ctx = await b.newContext({ viewport: vp, isMobile: true, hasTouch: true }), p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    await p.route(/kibble-pay|_vercel/, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
    await p.goto(srv.url + '?mp=off'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:test'); }); await p.reload(); await p.waitForTimeout(700); await p.click('#start'); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => { const q = (id) => { const e = document.getElementById(id); if (!e) return null; const r = e.getBoundingClientRect(); return r.width && getComputedStyle(e).display !== 'none' ? [r.x, r.y, r.width, r.height] : null; };
      const bar = document.getElementById('mp-chat'); if (bar) bar.hidden = false; // the chat bar is hidden with ?mp=off: show it to check the layout
      const o = ['menu-btn', 'btn-sound', 'clock', 'btn-a', 'btn-emo', 'stick', 'inu-wallet-btn', 'crier-banner', 'ev-banner', 'mp-chat', 'mp-chip', 'prompt'].map((k) => [k, q(k)]); if (bar) bar.hidden = true;
      return { on: document.body.classList.contains('mm-on'), mm: q('minimap-wrap'), o }; });
    assert.ok(r.on && r.mm, 'minimap shown by default'); for (const [k, v] of r.o) if (v) assert.ok(!overlaps(r.mm, v), `minimap overlaps ${k} @${vp.width}`);
    assert.ok(r.mm[0] + r.mm[2] <= vp.width && r.mm[1] + r.mm[3] <= vp.height);
    // menus/panels never sit under the minimap: with a panel open the minimap is hidden or drawn beneath it
    await p.evaluate(() => __inu.open('help')); await p.waitForTimeout(250);
    assert.ok(await p.evaluate(() => { const m = document.getElementById('minimap-wrap'), pn = document.getElementById('panel'); if (!m || getComputedStyle(m).display === 'none' || !m.getBoundingClientRect().width) return true; const r = m.getBoundingClientRect(), top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!pn && !m.contains(top); }), 'an open panel covers / hides the minimap');
    await p.evaluate(() => document.getElementById('panel-close')?.click()); await p.waitForTimeout(200);
    const d0 = await p.evaluate(() => globalThis.__mmDraws || 0); await p.waitForTimeout(1000); const d1 = await p.evaluate(() => globalThis.__mmDraws); assert.ok(d1 - d0 <= 10, 'throttled: ' + (d1 - d0) + ' draws/s');
    // walk up to two stones: discovered + saved
    for (const id of ['plaza', 'farm']) { await p.evaluate((id) => { const s = __inu.portals.PT.BY_ID[id]; Object.assign(__inu.state.player, { x: (s.tx + 0.5) * 32, y: (s.ty + 2.6) * 32 }); }, id); await p.waitForTimeout(450); }
    assert.deepEqual(await p.evaluate(() => JSON.parse(localStorage.getItem('inuverse.portals.v1')).sort()), ['farm', 'plaza']);
    const bones0 = await p.evaluate(() => __inu.state.bones);
    let pr = ''; for (let i = 0; i < 12 && !/Portal stone: Farmlands/.test(pr); i++) { // a wandering pup next to you takes the prompt (pup first by design): wait for it to pass
      await p.evaluate(() => { const a = __inu.portals.PT.arrival(__inu.portals.PT.BY_ID.farm); Object.assign(__inu.state.player, a); }); await p.waitForTimeout(300); pr = await p.evaluate(() => document.getElementById('prompt').textContent); }
    assert.match(pr, /Portal stone: Farmlands/); assert.equal(await p.evaluate(() => document.getElementById('btn-a').textContent), 'WARP');
    await p.tap('#btn-a'); await p.waitForTimeout(400);
    assert.equal(await p.locator('[data-warp]').count(), 1, 'only the other found stone is warpable'); assert.ok(await p.locator('.pt-lock').count() >= 6, 'undiscovered stones locked');
    await p.tap('[data-warp=plaza]'); await p.waitForTimeout(400);
    const at = await p.evaluate(() => ({ x: __inu.state.player.x, y: __inu.state.player.y, w: globalThis.__warps, b: __inu.state.bones })), pa = await p.evaluate(() => __inu.portals.PT.arrival(__inu.portals.PT.BY_ID.plaza));
    assert.deepEqual([at.x, at.y], [pa.x, pa.y]); assert.equal(at.w, 1); assert.equal(at.b, bones0, 'warping is free');
    assert.equal(await p.evaluate(() => __inu.portals.warp('pond', 'plaza')), false, 'cannot warp to an undiscovered stone');
    // minimap tap -> full map; at a stone, tapping another found stone on the map warps there
    await p.tap('#minimap'); await p.waitForTimeout(400); assert.ok(await p.evaluate(() => !document.getElementById('mapfull').hidden), 'full map open'); assert.ok(await p.evaluate(() => !document.getElementById('map-warp').hidden), 'warp hint at a stone');
    const box = await p.evaluate(() => { const c = document.getElementById('mapcv').getBoundingClientRect(), s = __inu.portals.PT.BY_ID.farm; return { x: c.left + (s.tx + 0.5) * c.width / 64, y: c.top + (s.ty + 0.5) * c.height / 106 }; });
    await p.mouse.click(box.x, box.y); await p.waitForTimeout(400);
    assert.equal(await p.evaluate(() => globalThis.__warps), 2, 'warped from the full map'); assert.ok(await p.evaluate(() => document.getElementById('mapfull').hidden));
    await ctx.close(); }
    assert.deepEqual(errs, []); } finally { await b.close(); srv.close(); }
});

test('full-map stone marker: 14px+ outlined diamond, rune / "?" icon, short name tag on found stones', () => {
  const calls = []; let font = ''; const m = new Proxy({ measureText: (t) => ({ width: t.length * 5 }) }, { get: (o, k) => (k in o ? o[k] : k === 'font' ? font : (...a) => calls.push([k, ...a])), set: (o, k, v) => { if (k === 'font') font = v; calls.push(['set', k, v]); return true; } });
  const s = PT.BY_ID.farm; PT.drawMapStone(m, s, 100, 100, 2, true, 0);
  const xs = calls.filter((c) => c[0] === 'lineTo').map((c) => c[1]); assert.ok(Math.max(...xs) - Math.min(...xs) >= 2 * 2 * PT.MAP_STONE_R, 'diamond at least 14 CSS px wide');
  const fills = calls.filter((c) => c[0] === 'set' && c[1] === 'fillStyle').map((c) => c[2]); assert.ok(fills.includes('#141a2e') && fills.includes('#e8fffb'), 'ink + light outline');
  assert.ok(calls.some((c) => c[0] === 'fillText' && c[1] === 'FARMLANDS'), 'found stone is labelled'); assert.equal(PT.shortName(PT.BY_ID.plaza), 'Kibble');
  calls.length = 0; PT.drawMapStone(m, s, 100, 100, 2, false, 0); const txt = calls.filter((c) => c[0] === 'fillText').map((c) => c[1]); assert.deepEqual(txt, ['?'], 'undiscovered: "?" icon, no name spoiler');
  const src = fs.readFileSync(new URL('../src/guideui.js', import.meta.url), 'utf8'); assert.match(src, /drawMapStone\(m, st,/); assert.match(src, /rm = fxLow\(\)/);
});

test('browser: full-map stones are big, visible and tappable at 844x390 + 667x375', { timeout: 120000 }, async () => {
  const srv = await serveRoot(); const b = await chromium.launch(); const errs = [];
  try { for (const vp of [{ width: 844, height: 390 }, { width: 667, height: 375 }]) {
    const ctx = await b.newContext({ viewport: vp, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }), p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    await p.route(/kibble-pay|_vercel/, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
    await p.goto(srv.url + '?mp=off&fx=low'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:test'); localStorage.setItem('inuverse.portals.v1', JSON.stringify(['farm', 'plaza'])); }); await p.reload(); await p.waitForTimeout(700); await p.click('#start'); await p.waitForTimeout(1200);
    await p.tap('#minimap'); await p.waitForFunction(() => !document.getElementById('mapfull').hidden); await p.waitForTimeout(300);
    const R = await p.evaluate(() => { const cv = document.getElementById('mapcv'), c = cv.getBoundingClientRect(), g = cv.getContext('2d'), u = cv.width / c.width, out = {};
      for (const id of ['farm', 'arcade']) { const s = __inu.portals.PT.BY_ID[id], x = (s.tx + 0.5) * cv.width / 64, y = (s.ty + 0.5) * cv.height / 106; let cyan = 0, ink = 0;
        const d = g.getImageData(Math.round(x - 8 * u), Math.round(y - 8 * u), Math.round(16 * u), Math.round(16 * u)).data; for (let i = 0; i < d.length; i += 4) { if (d[i] < 120 && d[i + 1] > 200 && d[i + 2] > 190) cyan++; if (d[i] < 30 && d[i + 1] < 40 && d[i + 2] < 60) ink++; }
        out[id] = { cyan: cyan / u / u, ink: ink / u / u, cx: c.left + x / u, cy: c.top + y / u }; } return out; });
    assert.ok(R.farm.cyan >= 40, `found stone shows a big cyan diamond (${R.farm.cyan} CSS px²) @${vp.width}`); assert.ok(R.farm.ink >= 15, 'ink outline @' + vp.width); assert.ok(R.arcade.cyan < 5 && R.arcade.ink >= 15, 'undiscovered stone: grey outlined, not cyan @' + vp.width);
    await p.mouse.click(R.farm.cx + 5, R.farm.cy + 4); await p.waitForTimeout(300); // edge of the drawn diamond still picks the stone
    assert.equal(await p.evaluate(() => document.body.dataset.guide), 'stone-farm', 'tap near the drawn diamond edge picks the stone');
    await ctx.close(); }
    assert.deepEqual(errs, []); } finally { await b.close(); srv.close(); }
});

// Feature batch #1: emotes + sit spots (benches, swings, café seats), rate limit, compact emote button, live sync over the existing emote/pose path.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { chromium } from 'playwright';
import { ACTIONS, ACTION_ORDER, ICON_ACTIONS, makeEmoteLimiter, poseAt, poseCode, poseOf } from '../src/actions.js';
import { EMOTE_KINDS, POSES, emoteOk, cleanState, MP } from '../src/mpshared.js';
import { SPOTS, SPOT_NAME, nearestSpot, takenBy, spotAt, swingSway, seatPose, REACH } from '../src/sitspots.js';
import { sitProps } from '../src/sitart.js';
import { EMOTES } from '../src/ambient.js';
import { isSolid, TILE } from '../src/world.js';
import { wheelLayout } from '../src/actionwheel.js';
import { serveRoot, overlaps } from './serve-root.mjs';

test('emote set: wave, dance, sit, heart, laugh, photo pose; each has a bubble/pixel icon and passes the server filter', () => {
  for (const k of ['wave', 'dance', 'sit', 'laugh', 'pose']) { assert.ok(ACTIONS[k], k); assert.ok(emoteOk(k), 'server accepts ' + k); }
  assert.ok(emoteOk('heart') && EMOTES.heart, 'heart is a bubble emote');
  for (const k of Object.keys(ICON_ACTIONS)) { assert.ok(EMOTES[k], k + ' has a bubble icon'); assert.ok(ICON_ACTIONS[k] > 1 && ICON_ACTIONS[k] < 4); }
  assert.ok(!emoteOk('kibble') && !emoteOk('<script>') && !emoteOk(''), 'unknown ids rejected');
  assert.equal(poseOf(cleanState({ x: 1, y: 1, p: poseCode('pose') }).p), 'pose'); assert.equal(cleanState({ x: 1, y: 1, p: POSES.length }).p, 0, 'bad pose codes zeroed');
  const L = poseAt('laugh', 0.4, 'down'), P = poseAt('pose', 1, 'down'); assert.ok(L.ha > 0, 'laugh draws rising "ha"'); assert.ok(P.sparkle > 0 && P.paw?.up > 0, 'pose: paw up + sparkles');
  assert.ok(EMOTE_KINDS.length <= 32 && EMOTE_KINDS.every((k) => /^[a-z0-9]+$/.test(k)));
});

test('rate limit: same bucket as the realtime Worker (1/s, burst 2)', () => {
  const L = makeEmoteLimiter(); assert.equal(MP.EMOTE_RATE, 1); assert.equal(MP.EMOTE_BURST, 2);
  assert.ok(L.ok(0)); assert.ok(L.ok(10)); assert.ok(!L.ok(20), 'third in a burst blocked'); assert.ok(!L.ok(500)); assert.ok(L.ok(1100), 'refills after ~1s');
  let n = 0; for (let t = 0; t < 10000; t += 50) if (L.ok(5000 + t)) n++; assert.ok(n <= 12, 'spam for 10 s lets ~10 through, got ' + n);
});

test('sit spots: 14 bench seats, 2 swings, 4 café chairs; unique, on walkable ground, reachable', () => {
  const by = (k) => SPOTS.filter((s) => s.kind === k).length; assert.equal(by('bench'), 14); assert.equal(by('swing'), 2); assert.equal(by('cafe'), 4);
  assert.equal(new Set(SPOTS.map((s) => s.id)).size, SPOTS.length); for (const s of SPOTS) { assert.ok(SPOT_NAME[s.kind]); assert.ok(['up', 'down', 'left', 'right'].includes(s.face));
    assert.ok(!isSolid(Math.floor(s.x / TILE), Math.floor(s.y / TILE)), s.id + ' seat tile is walkable (you can stand up and walk off)'); }
  for (let i = 0; i < SPOTS.length; i++) for (let j = i + 1; j < SPOTS.length; j++) assert.ok(Math.hypot(SPOTS[i].x - SPOTS[j].x, SPOTS[i].y - SPOTS[j].y) >= 14, 'seats not stacked');
  const s = SPOTS[0]; assert.equal(nearestSpot(s.x + 5, s.y + 8), s); assert.equal(nearestSpot(s.x + REACH + 40, s.y), null, 'out of reach');
  assert.ok(takenBy(s, [{ x: s.x, y: s.y + 1 }])); assert.notEqual(nearestSpot(s.x, s.y + 4, [{ x: s.x, y: s.y }]), s, 'occupied seat skipped');
  assert.equal(spotAt(s.x, s.y), s); assert.equal(spotAt(s.x + 0.4, s.y - 0.3), s, 'interpolated remote still on the seat'); assert.equal(spotAt(s.x + 9, s.y), null);
});

test('seat poses: swings sway (gentler with reduced effects), café/bench lift; props drawn for sitters', () => {
  const sw = SPOTS.find((s) => s.kind === 'swing'), cafe = SPOTS.find((s) => s.kind === 'cafe');
  let full = 0, calm = 0; for (let t = 0; t < 6; t += 0.1) { full = Math.max(full, Math.abs(swingSway(t, sw).dx)); calm = Math.max(calm, Math.abs(swingSway(t, sw, true).dx)); }
  assert.ok(full > 5 && calm < full / 3, `sway ${full} vs reduced ${calm}`);
  const P = seatPose(poseAt('sit', 1, 'down'), cafe, 1); assert.equal(P.face, cafe.face); assert.ok(P.dy < 0);
  const props = sitProps(1, [{ x: sw.x, y: sw.y }], false); assert.ok(props.length >= 4 && props.every((p) => typeof p.d === 'function' && Number.isFinite(p.y)));
  for (const f of ['sitspots.js', 'sitart.js']) { const src = fs.readFileSync(new URL('../src/' + f, import.meta.url), 'utf8'); assert.doesNotMatch(src, /Math\.random|kibble|wager|fee\b/i); }
});

test('wheel: 11 actions still thumb-sized at 844x390 / 667x375; keys 1-9, 0, -', () => {
  for (const [w, h] of [[844, 390], [667, 375]]) { const L = wheelLayout(w, h); assert.equal(L.outer.length, ACTION_ORDER.length); for (const b of L.outer) assert.ok(b.size >= 44); }
  assert.match(fs.readFileSync(new URL('../src/actionwheel.js', import.meta.url), 'utf8'), /'1234567890-'/);
});

test('browser: compact emote button opens the wheel, laugh plays, spam is limited, A sits on a bench and stands up', { timeout: 120000 }, async () => {
  const srv = await serveRoot(); const b = await chromium.launch(); const errs = [];
  try { for (const vp of [{ width: 844, height: 390 }, { width: 667, height: 375 }]) {
    const ctx = await b.newContext({ viewport: vp, isMobile: true, hasTouch: true }), p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    await p.route(/kibble-pay|_vercel/, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
    await p.goto(srv.url + '?mp=off'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:test'); }); await p.reload(); await p.waitForTimeout(700); await p.click('#start'); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => { const q = (id) => { const e = document.getElementById(id); if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? [r.x, r.y, r.width, r.height] : null; }; return { emo: q('btn-emo'), a: q('btn-a'), menu: q('menu-btn'), sound: q('btn-sound') }; });
    assert.ok(r.emo && r.emo[2] >= 44 && r.emo[3] >= 44, 'emote button visible + 44px'); for (const k of ['a', 'menu', 'sound']) if (r[k]) assert.ok(!overlaps(r.emo, r[k]), `btn-emo overlaps ${k} @${vp.width}`);
    assert.ok(r.emo[0] + r.emo[2] <= vp.width && r.emo[1] + r.emo[3] <= vp.height);
    await p.tap('#btn-emo'); await p.waitForTimeout(250); assert.ok(await p.evaluate(() => !document.getElementById('act-wheel').hidden), 'wheel open');
    await p.tap('[data-act=laugh]'); await p.waitForTimeout(150); assert.equal(await p.evaluate(() => __inu.emo.act?.kind), 'laugh');
    const drops0 = await p.evaluate(() => globalThis.__emoteDrops); for (let i = 0; i < 4; i++) await p.evaluate(() => __inu.emote('heart'));
    assert.ok(await p.evaluate(() => globalThis.__emoteDrops) > drops0, 'spam rate-limited');
    await p.waitForTimeout(2200);
    const sp = await p.evaluate(() => { const s = __inu.emo.spots.find((q) => q.id === 'b0'); __inu.state.player.x = s.x; __inu.state.player.y = s.y + 12; return s; }); await p.waitForTimeout(200);
    assert.match(await p.evaluate(() => document.getElementById('prompt').textContent), /Sit on the bench/);
    await p.tap('#btn-a'); await p.waitForTimeout(200);
    const st = await p.evaluate(() => ({ k: __inu.emo.act?.kind, spot: __inu.emo.act?.spot, x: __inu.state.player.x, y: __inu.state.player.y, pr: document.getElementById('prompt').textContent }));
    assert.equal(st.k, 'sit'); assert.equal(st.spot, 'b0'); assert.equal(st.x, sp.x); assert.equal(st.y, sp.y); assert.match(st.pr, /Stand up/);
    await p.waitForTimeout(1100); await p.tap('#btn-a'); await p.waitForTimeout(150); assert.equal(await p.evaluate(() => __inu.emo.act), null, 'A again stands up');
    await ctx.close(); } } finally { await b.close(); srv.close(); }
  assert.deepEqual(errs, []);
});

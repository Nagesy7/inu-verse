// Round 3: sit / lie / dances / wave / wag / sleep / bow, auto-sit then doze, moving cancels, multiplayer sync, the wheel.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ACTIONS, ACTION_ORDER, BUBBLES, IDLE, makeActor, startAction, stepActor, cancelAction, poseAt, poseCode, poseOf, poseCodeOf, remoteEmote, remoteState, remoteStep, isAction } from '../src/actions.js';
import { wheelLayout, MIN_TARGET } from '../src/actionwheel.js';
import { EMOTE_KINDS, POSES, cleanState, emoteOk, MP } from '../src/mpshared.js';
import { createMultiplayer } from '../src/multiplayer.js';
import { faceAt } from '../src/face.js';

test('actions: the full set is there, with 3 original dances, and every action/bubble passes the server emote filter', () => {
  for (const k of ['sit', 'lie', 'dance', 'dance2', 'dance3', 'wave', 'wag', 'sleep', 'bow']) assert.ok(isAction(k), k);
  assert.equal(ACTION_ORDER.length, 9); assert.deepEqual([...ACTION_ORDER].sort(), Object.keys(ACTIONS).sort());
  assert.equal(Object.values(ACTIONS).filter((a) => a.dance).length, 3);
  for (const k of [...ACTION_ORDER, ...BUBBLES.map((b) => b[0])]) assert.ok(emoteOk(k), 'server must accept ' + k);
  assert.ok(BUBBLES.length >= 4 && BUBBLES.length <= 8);
  // every looping action has a pose code that survives the state sanitiser; one-shots have a finite duration
  for (const k of ACTION_ORDER) { const a = ACTIONS[k]; if (a.loop) { const c = poseCode(k); assert.ok(c > 0); assert.equal(poseOf(cleanState({ x: 1, y: 1, p: c }).p), k); } else assert.ok(a.dur > 0 && a.dur < 5, k); }
  assert.equal(cleanState({ x: 1, y: 1, p: 99 }).p, 0); assert.equal(cleanState({ x: 1, y: 1, p: 'sit' }).p, 0); assert.equal(cleanState({ x: 1, y: 1, p: 1.5 }).p, 0);
  assert.ok(JSON.stringify({ t: 's', ...cleanState({ x: 12345.5, y: 9999, f: 'right', m: 0, p: 5, ts: Date.now() }) }).length < MP.MAX_STATE);
});

test('poses: deterministic, anchored and distinct; dances move, sleep shuts the eyes via the face system', () => {
  for (const k of ACTION_ORDER) assert.deepEqual(poseAt(k, 1.234, 'down'), poseAt(k, 1.234, 'down'), k);
  assert.equal(poseAt('nope', 1), null);
  assert.ok(poseAt('sit', 1).sy < 0.9); assert.ok(poseAt('lie', 1).sy < poseAt('sit', 1).sy); assert.ok(poseAt('lie', 1).sx > 1);
  assert.ok(poseAt('sleep', 1).zz); assert.ok(poseAt('wave', 0.3).paw);
  const sig = (k) => JSON.stringify([0.1, 0.3, 0.6, 0.9, 1.3].map((t) => { const p = poseAt(k, t, 'down'); return [p.dx, p.dy, p.rot, p.sx, p.sy, p.face].map((v) => (typeof v === 'number' ? +v.toFixed(3) : v)); }));
  const ds = ['dance', 'dance2', 'dance3'].map(sig); assert.equal(new Set(ds).size, 3, 'three different dances');
  assert.deepEqual(new Set([0, 0.4, 0.8, 1.2].map((t) => poseAt('dance2', t).face)), new Set(['down', 'right', 'up', 'left']), 'Spin Hop turns all the way round');
  for (const k of ['dance', 'dance2', 'dance3']) assert.ok([0.1, 0.2, 0.3, 0.45].some((t) => Math.abs(poseAt(k, t).dy) > 1 || Math.abs(poseAt(k, t).dx) > 1 || Math.abs(poseAt(k, t).sy - 1) > 0.03), k);
  assert.equal(faceAt('x', 3, { emote: 'sleep' }).eye, 'blink'); assert.equal(faceAt('x', 3, { emote: 'dance' }).eye, 'happy');
});

test('state machine: moving cancels any action; one-shots expire; re-picking a loop stands you up', () => {
  const A = makeActor();
  for (const k of ACTION_ORDER) { startAction(A, k, 0); assert.equal(A.act.kind, k); assert.equal(stepActor(A, 0.016, 0.1, { moving: true }), 'cancel'); assert.equal(A.act, null, k + ' cancelled by moving'); }
  startAction(A, 'bow', 10); stepActor(A, 0.1, 10 + ACTIONS.bow.dur + 0.01); assert.equal(A.act, null);
  startAction(A, 'dance2', 20); for (let i = 0; i < 600; i++) stepActor(A, 0.1, 20 + i * 0.1); assert.equal(A.act.kind, 'dance2', 'loops hold (no idle override of a manual action)');
  startAction(A, 'dance2', 90); assert.equal(A.act, null, 'pick again = stand up');
  startAction(A, 'sit', 1); assert.equal(poseCodeOf(A), poseCode('sit')); startAction(A, 'wave', 2); assert.equal(poseCodeOf(A), 0);
  assert.equal(cancelAction(A), true); assert.equal(cancelAction(A), false);
});

test('idle: long idle auto-sits, then dozes; any movement wakes you; panels/menus do not count as idle', () => {
  const A = makeActor(); let t = 0; const run = (secs, o = {}) => { for (let i = 0; i < secs * 10; i++) { t += 0.1; stepActor(A, 0.1, t, o); } };
  run(IDLE.sit - 1); assert.equal(A.act, null); run(2); assert.equal(A.act.kind, 'sit'); assert.equal(A.act.auto, true);
  run(IDLE.doze - IDLE.sit); assert.equal(A.act.kind, 'sleep'); assert.equal(poseCodeOf(A), poseCode('sleep'));
  stepActor(A, 0.1, t, { moving: true }); assert.equal(A.act, null); assert.equal(A.still, 0);
  run(IDLE.doze + 5, { busy: true }); assert.equal(A.act, null, 'busy (panel open) never auto-sits');
});

test('remote: emote starts the action, state pose code keeps it for late joiners, moving clears it', () => {
  const r = {}; assert.equal(remoteEmote(r, 'heart', 0), false); assert.equal(r.act, undefined);
  remoteEmote(r, 'dance3', 5); assert.equal(r.act.kind, 'dance3');
  remoteState(r, { m: 0, p: poseCode('dance3') }, 5.1); assert.equal(r.act.t0, 5, 'same pose keeps its clock');
  remoteState(r, { m: 1, p: 0 }, 6); assert.equal(r.act, null);
  const late = {}; remoteState(late, { m: 0, p: poseCode('sleep') }, 9); assert.equal(late.act.kind, 'sleep');
  remoteState(late, { m: 0, p: 0 }, 10); assert.equal(late.act, null, 'stood up');
  remoteEmote(late, 'wave', 11); remoteState(late, { m: 0, p: 0 }, 11.2); assert.equal(late.act.kind, 'wave', 'one-shot not cleared by p=0'); remoteStep(late, 11 + ACTIONS.wave.dur); assert.equal(late.act, null);
});

// fake socket client (same harness style as multiplayer.test.mjs)
function mk() { const socks = []; class WS { constructor(u) { this.url = u; this.sent = []; this.readyState = 0; socks.push(this); } send(s) { this.sent.push(s); } close() { this.readyState = 3; } open() { this.readyState = 1; this.onopen?.(); } recv(m) { this.onmessage?.({ data: JSON.stringify(m) }); } }
  WS.socks = socks; let ms = 1000, t = 0; const L = { room: 'city', x: 100, y: 100, f: 'down', m: false, r: false, d: false, emote: null, act: null, p: 0, name: 'Pup1', look: { coat: 'tan', eq: {} } };
  const mp = createMultiplayer({ getLocal: () => L, WS, doc: null, clock: () => ms, now: () => t });
  return { mp, L, WS, tick: (d = 16) => { ms += d; t += d / 1000; mp.step(d / 1000); } }; }

test('multiplayer: actions go out on the existing emote path + pose code in state; received ones animate remote pups', async () => {
  const c = mk(); await c.mp.start('ws://x'); c.tick(); const ws = c.WS.socks[0]; ws.open();
  ws.recv({ t: 'w', id: 'me', name: 'Pup1', room: 'city', inst: 1, players: [{ id: 'a', name: 'Pup2', look: {}, s: { x: 50, y: 60, f: 'down', p: poseCode('lie'), ts: 0 } }] });
  let a = c.mp.actors(null); assert.equal(a[0].act.kind, 'lie', 'late joiner sees the pose from the welcome snapshot');
  const A = makeActor(); c.L.act = startAction(A, 'dance', 1); c.L.p = poseCodeOf(A); c.tick(200);
  const out = ws.sent.map((s) => JSON.parse(s)); assert.ok(out.some((m) => m.t === 'e' && m.k === 'dance')); assert.equal(out.filter((m) => m.t === 's').at(-1).p, poseCode('dance'));
  c.tick(200); assert.equal(ws.sent.map((s) => JSON.parse(s)).filter((m) => m.t === 'e').length, 1, 'one emote per action, not per frame');
  ws.recv({ t: 'e', id: 'a', k: 'dance2' }); a = c.mp.actors(null); assert.equal(a[0].act.kind, 'dance2');
  ws.recv({ t: 's', id: 'a', x: 70, y: 60, f: 'right', m: 1, p: 0, ts: 5 }); assert.equal(c.mp.actors(null)[0].act, null, 'walking clears it');
  ws.recv({ t: 'e', id: 'a', k: 'bogus' }); assert.equal(c.mp.actors(null)[0].act, null);
});

test('server: unchanged emote limits; worker shares the same EMOTE_KINDS/POSES/cleanState (mpshared.js)', () => {
  assert.equal(MP.EMOTE_RATE, 1); assert.equal(MP.EMOTE_BURST, 2);
  const w = fs.readFileSync(new URL('../realtime/src/worker.js', import.meta.url), 'utf8'); assert.match(w, /from '\.\.\/\.\.\/src\/mpshared\.js'/); assert.match(w, /emoteOk\(m\.k\)/);
  for (const p of POSES.slice(1)) assert.ok(EMOTE_KINDS.includes(p));
});

test('wheel: thumb-friendly in phone landscape (844x390, 667x375), fits on screen, no overlaps', () => {
  for (const [w, h] of [[844, 390], [667, 375], [1280, 800], [568, 320]]) { const L = wheelLayout(w, h);
    assert.ok(L.D <= h - 20 || L.D === 260, `${w}x${h} fits`); assert.ok(L.D <= w - 20);
    const all = [...L.outer, ...L.inner, L.center]; for (const b of all) { assert.ok(b.size >= MIN_TARGET, `${w}x${h} ${b.kind} ${b.size}px`); assert.ok(b.x - b.size / 2 >= 0 && b.x + b.size / 2 <= L.D && b.y - b.size / 2 >= 0 && b.y + b.size / 2 <= L.D, 'inside the ring'); }
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) { const p = all[i], q = all[j]; assert.ok(Math.hypot(p.x - q.x, p.y - q.y) >= (p.size + q.size) / 2 + 2, `${w}x${h} ${p.kind}/${q.kind} overlap`); }
    assert.equal(L.outer.length, 9); assert.equal(L.inner.length, BUBBLES.length); }
  assert.ok(wheelLayout(844, 390).outer[0].size >= 64); assert.ok(wheelLayout(667, 375).outer[0].size >= 64);
});

test('wiring: opened from the ☰ menu button, the multiplayer popover and G; no new on-screen button; vendor untouched', () => {
  const main = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8'), mpj = fs.readFileSync(new URL('../src/multiplayer.js', import.meta.url), 'utf8'), hud = fs.readFileSync(new URL('../src/hudmenu.js', import.meta.url), 'utf8');
  assert.match(hud, /\['Fun', \['btn-emote'/); assert.match(main, /\$\('#btn-emote'\)\.onclick = \(\) => toggleEmotes\(\)/); assert.match(main, /if \(k === 'g'\) \{ wheel\.toggle\(\)/);
  assert.match(mpj, /id="mp-act"/); assert.match(main, /onActions: \(\) => wheel\.open\(\)/);
  assert.match(main, /'r-' \+ RP\.id/, 'rooms/zones get their own live room'); assert.match(fs.readFileSync(new URL('../src/roomplay.js', import.meta.url), 'utf8'), /D\.remotes\?\.\(/);
  const wh = fs.readFileSync(new URL('../src/actionwheel.js', import.meta.url), 'utf8'), ac = fs.readFileSync(new URL('../src/actions.js', import.meta.url), 'utf8');
  for (const src of [wh, ac]) { assert.doesNotMatch(src, /Math\.random|vendor\/inu-avatar/); assert.doesNotMatch(src.toLowerCase(), /\b(buy|sell|moon|dump|pump it)\b/); }
});

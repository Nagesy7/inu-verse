import test from 'node:test'; import assert from 'node:assert/strict';
import { radialDeadzone, padKind, glyphsFor, connectMsg, makeEdges, readButton, nextFocus, createGamepad, BTN, DEADZONE } from '../src/gamepad.js';

test('gamepad: radial deadzone kills drift and rescales 0..1 from the dead edge', () => {
  const o = { x: 0, y: 0, mag: 0 };
  assert.equal(radialDeadzone(0.1, 0.1, DEADZONE, o).mag, 0); assert.equal(o.x, 0); assert.equal(o.y, 0);
  assert.equal(radialDeadzone(0.2, 0, 0.2, o).mag, 0);
  radialDeadzone(0.6, 0, 0.2, o); assert.ok(Math.abs(o.mag - 0.5) < 1e-9); assert.ok(Math.abs(o.x - 0.5) < 1e-9);
  radialDeadzone(1, 0, 0.2, o); assert.equal(o.mag, 1); radialDeadzone(1, 1, 0.2, o); assert.equal(o.mag, 1); assert.ok(Math.abs(Math.hypot(o.x, o.y) - 1) < 1e-9);
  radialDeadzone(0.15, 0.15, 0.2, o); assert.ok(o.mag > 0 && o.mag < 0.1, 'diagonal past the radius is live (radial, not per-axis)');
  assert.equal(radialDeadzone(0.5, 0, 0.2, o), o, 'writes into the caller object (no allocation)');
  assert.equal(radialDeadzone(NaN, undefined, 0.2, o).mag, 0);
});

test('gamepad: PlayStation vs Xbox glyph detection from Gamepad.id', () => {
  for (const id of ['DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', 'Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)', 'DUALSHOCK 4', '054c-05c4-Wireless Controller', 'Sony PLAYSTATION(R)3 Controller'])
    assert.equal(padKind(id), 'ps', id);
  for (const id of ['Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)', '045e-02fd-Xbox Wireless Controller', 'xinput', 'Xbox 360 Controller (XInput STANDARD GAMEPAD)'])
    assert.equal(padKind(id), 'xbox', id);
  assert.equal(padKind('8BitDo SN30 Pro (Vendor: 2dc8)'), 'generic'); assert.equal(padKind(), 'generic');
  assert.deepEqual([glyphsFor('ps').a, glyphsFor('ps').b, glyphsFor('ps').x, glyphsFor('ps').y], ['✕', '○', '□', '△']);
  assert.deepEqual([glyphsFor('xbox').a, glyphsFor('xbox').b, glyphsFor('xbox').x, glyphsFor('xbox').y], ['A', 'B', 'X', 'Y']);
  assert.match(connectMsg('ps'), /✕ select · ○ back/); assert.match(connectMsg('xbox'), /A select · B back/);
});

test('gamepad: button edge detection fires once per press and once per release, per pad slot', () => {
  const e = makeEdges(4);
  assert.equal(e.step(0, BTN.A, false), 0); assert.equal(e.step(0, BTN.A, true), 1); assert.equal(e.step(0, BTN.A, true), 0); assert.equal(e.step(0, BTN.A, true), 0);
  assert.equal(e.step(0, BTN.A, false), -1); assert.equal(e.step(0, BTN.A, false), 0);
  assert.equal(e.step(1, BTN.A, true), 1, 'slots are independent'); e.clear(1); assert.equal(e.step(1, BTN.A, true), 1, 'clear (hot-plug) re-arms');
});

const btns = (on = []) => Array.from({ length: 17 }, (_, i) => ({ pressed: on.includes(i), value: on.includes(i) ? 1 : 0 }));
test('gamepad: standard mapping + non-standard fallbacks (dpad axes 6/7, POV hat on axis 9)', () => {
  const std = { mapping: 'standard', buttons: btns([0, 12]), axes: [0, 0, 0, 0] };
  assert.equal(readButton(std, BTN.A), true); assert.equal(readButton(std, BTN.B), false); assert.equal(readButton(std, BTN.UP), true);
  const ns = { mapping: '', buttons: btns([]).slice(0, 12), axes: [0, 0, 0, 0, 0, 0, -1, 0] };
  assert.equal(readButton(ns, BTN.LEFT), true); assert.equal(readButton(ns, BTN.RIGHT), false);
  const hat = (v) => ({ mapping: '', buttons: btns([]).slice(0, 12), axes: [0, 0, 0, 0, 0, 0, 0, 0, 0, v] });
  assert.equal(readButton(hat(-1), BTN.UP), true); assert.equal(readButton(hat(-0.428), BTN.RIGHT), true); assert.equal(readButton(hat(0.142), BTN.DOWN), true);
  assert.equal(readButton(hat(0.714), BTN.LEFT), true); assert.equal(readButton(hat(1.2857), BTN.UP), false, 'idle hat'); assert.equal(readButton(hat(0), BTN.DOWN), false, 'resting axis is not a press');
});

test('gamepad: spatial focus navigation order over a grid + list', () => {
  // 2x2 grid of cards, then a full-width button under it, close × top right
  const R = [{ x: 0, y: 40, w: 100, h: 60 }, { x: 120, y: 40, w: 100, h: 60 }, { x: 0, y: 120, w: 100, h: 60 }, { x: 120, y: 120, w: 100, h: 60 }, { x: 0, y: 200, w: 220, h: 30 }, { x: 200, y: 0, w: 20, h: 20 }];
  assert.equal(nextFocus(R, -1, 'down'), 0, 'nothing focused -> first');
  assert.equal(nextFocus(R, 0, 'right'), 1); assert.equal(nextFocus(R, 1, 'left'), 0);
  assert.equal(nextFocus(R, 0, 'down'), 2); assert.equal(nextFocus(R, 1, 'down'), 3); assert.equal(nextFocus(R, 3, 'down'), 4); assert.equal(nextFocus(R, 2, 'down'), 4);
  assert.equal(nextFocus(R, 4, 'up'), 2, 'up from the wide button prefers the aligned left column');
  assert.equal(nextFocus(R, 1, 'up'), 5, 'up from top-right reaches the close button');
  assert.equal(nextFocus(R, 4, 'down'), 5, 'nothing below: steps on in DOM order (wraps)'); assert.equal(nextFocus(R, 0, 'up'), 5, 'wraps backwards');
  assert.equal(nextFocus([], -1, 'down'), -1);
  // vertical list (drawer)
  const L = [0, 1, 2, 3].map((i) => ({ x: 10, y: i * 40, w: 200, h: 32 }));
  assert.deepEqual([nextFocus(L, 0, 'down'), nextFocus(L, 1, 'down'), nextFocus(L, 3, 'up'), nextFocus(L, 3, 'down')], [1, 2, 2, 0]);
});

// minimal fake window/document for the runtime (no DOM needed for the world path)
function fakeEnv() {
  const win = new EventTarget(); let pads = [null, null, null, null], t = 0;
  win.navigator = { getGamepads: () => pads }; win.performance = { now: () => (t += 16) };
  const cls = new Set(); const doc = { body: { classList: { toggle: (c, v) => (v ? cls.add(c) : cls.delete(c)), contains: (c) => cls.has(c) } }, getElementById: () => null, querySelectorAll: () => [], activeElement: null, head: null };
  const toasts = [], acts = [], touch = { x: 0, y: 0, mag: 0, id: null };
  const ev = (type, gp) => { const e = new Event(type); e.gamepad = gp; win.dispatchEvent(e); };
  return { win, doc, cls, toasts, acts, touch, ev, setPads: (p) => { pads = p; } };
}
const pad = (index, id, on = [], axes = [0, 0, 0, 0]) => ({ index, id, mapping: 'standard', connected: true, buttons: btns(on), axes });

test('gamepad: hot-plug, multiple pads (most recent active wins), polling only while connected', () => {
  const E = fakeEnv();
  const G = createGamepad({ win: E.win, doc: E.doc, hooks: { touch: E.touch, toast: (m, c) => E.toasts.push([m, c]), onA: () => E.acts.push('A'), onB: () => E.acts.push('B'), onX: () => E.acts.push('X'), onY: () => E.acts.push('Y'), menu: (v) => E.acts.push('menu:' + v) } });
  assert.equal(G.connected, 0); assert.equal(G.poll(0.016), false, 'no pad: poll is a no-op'); assert.equal(G.P.polls, 0);
  const ps = pad(0, 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)'); E.setPads([ps, null, null, null]); E.ev('gamepadconnected', ps);
  assert.equal(G.connected, 1); assert.equal(G.kind, 'ps'); assert.match(E.toasts.at(-1)[0], /PlayStation controller connected · ✕ select · ○ back/); assert.ok(E.cls.has('pad-on') && E.cls.has('pad-ps'));
  assert.equal(G.glyph('a'), '✕'); assert.equal(G.glyph('b'), '○');
  // stick moves the player through the shared touch-stick object
  ps.axes = [0.9, 0, 0, 0]; G.poll(0.016); assert.ok(E.touch.x > 0.85 && E.touch.mag > 0.85 && E.touch.y === 0);
  ps.axes = [0.1, 0.05, 0, 0]; G.poll(0.016); assert.equal(E.touch.mag, 0, 'released into the deadzone -> stops');
  ps.buttons = btns([BTN.DOWN]); G.poll(0.016); assert.equal(E.touch.y, 1); assert.equal(E.touch.x, 0); ps.buttons = btns(); G.poll(0.016); assert.equal(E.touch.y, 0);
  // A edge: one action per press
  ps.buttons = btns([BTN.A]); G.poll(0.016); G.poll(0.016); G.poll(0.016); ps.buttons = btns(); G.poll(0.016); assert.deepEqual(E.acts, ['A']);
  ps.buttons = btns([BTN.B, BTN.X, BTN.Y]); G.poll(0.016); ps.buttons = btns([BTN.START]); G.poll(0.016); ps.buttons = btns(); G.poll(0.016); assert.deepEqual(E.acts, ['A', 'B', 'X', 'Y', 'menu:true']);
  // a finger on the touch stick owns it: the pad doesn't fight it
  E.touch.id = 7; E.touch.x = -1; ps.axes = [1, 0, 0, 0]; G.poll(0.016); assert.equal(E.touch.x, -1); E.touch.id = null; ps.axes = [0, 0, 0, 0]; G.poll(0.016);
  // second pad (Xbox) plugged in: newest becomes active and glyphs switch
  const xb = pad(1, 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)'); E.setPads([ps, xb, null, null]); E.ev('gamepadconnected', xb);
  assert.equal(G.connected, 2); assert.equal(G.kind, 'xbox'); assert.equal(G.glyph('a'), 'A'); assert.match(E.toasts.at(-1)[0], /Xbox controller connected · A select · B back/); assert.ok(E.cls.has('pad-xb') && !E.cls.has('pad-ps'));
  // pressing on the PS pad makes it the active one again
  ps.buttons = btns([BTN.A]); G.poll(0.016); assert.equal(G.P.active, 0); assert.equal(G.kind, 'ps'); ps.buttons = btns(); G.poll(0.016);
  // keyboard / touch take the hints back; the pad takes them again on input
  const k = new Event('keydown'); Object.defineProperty(k, 'isTrusted', { value: true }); E.win.dispatchEvent(k); assert.equal(G.glyph('a'), null); assert.ok(!E.cls.has('pad-on'));
  xb.buttons = btns([BTN.A]); G.poll(0.016); assert.equal(G.glyph('a'), 'A'); xb.buttons = btns(); G.poll(0.016);
  // unplug the active Xbox pad -> falls back to the PS pad; unplug that -> polling stops and the stick is released
  E.setPads([ps, null, null, null]); E.ev('gamepaddisconnected', xb); assert.equal(G.connected, 1); assert.equal(G.kind, 'ps'); assert.match(E.toasts.at(-1)[0], /Controller disconnected · 1 still connected/);
  ps.axes = [0, -1, 0, 0]; G.poll(0.016); assert.equal(E.touch.y, -1);
  E.setPads([null, null, null, null]); E.ev('gamepaddisconnected', ps); assert.equal(G.connected, 0); assert.equal(E.touch.y, 0); assert.equal(E.touch.mag, 0); assert.match(E.toasts.at(-1)[0], /^🎮 Controller disconnected$/);
  const n = G.P.polls; G.poll(0.016); assert.equal(G.P.polls, n, 'no polling with nothing plugged in'); assert.ok(!E.cls.has('pad-on'));
});

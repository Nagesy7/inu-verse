// The phone walk control stays the round stick. A second pointer can act while it is held.
// pointerup, pointercancel, lost capture, blur, and a hidden page all drop the vector.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bindStick, stickAxes } from '../src/stick.js';

function fakePad() {
  const listeners = {};
  const pad = {
    listeners,
    className: '',
    style: {},
    classList: {
      add(c) { pad.className += ' ' + c; },
      remove(c) { pad.className = pad.className.replace(c, ''); },
    },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 120, height: 120, right: 120, bottom: 120 }),
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    setPointerCapture() {},
    ownerDocument: null,
  };
  const doc = {
    visibilityState: 'visible',
    addEventListener(type, fn) { (listeners['doc:' + type] ||= []).push(fn); },
    defaultView: { addEventListener(type, fn) { (listeners['win:' + type] ||= []).push(fn); } },
  };
  pad.ownerDocument = doc;
  return pad;
}

function fire(pad, type, id, x, y) {
  for (const fn of pad.listeners[type] || []) fn({ pointerId: id, clientX: x, clientY: y, preventDefault() {} });
}

test('the stick is round, at least the action minimum, and the touch HUD is not a D-pad', () => {
  const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(css, /#stick\{[^}]*width:120px;height:120px;border-radius:50%/);
  assert.match(css, /\.tb\{[^}]*width:64px;height:64px/);
  assert.match(css, /\.tb\.m\{[^}]*width:44px;height:44px/);
  assert.match(html, /id="stick"/);
  assert.doesNotMatch(html, /id="dpad"|class="dpad"|D-pad walk/);
  const touch = html.slice(html.indexOf('id="touch"'), html.indexOf('id="fade"'));
  assert.match(touch, /id="stick"/);
  assert.match(touch, /id="btn-a"/);
  assert.doesNotMatch(touch, /dpad|crosspad/i);
});

test('a second pointer does not clear the stick, and cancel, blur, and hide do', () => {
  const pad = fakePad();
  const knob = { style: {} };
  const touch = { id: null, x: 0, y: 0, mag: 0 };
  let ends = 0;
  assert.equal(bindStick(pad, knob, touch, { onEnd: () => { ends += 1; } }), true);
  fire(pad, 'pointerdown', 1, 110, 60);
  assert.ok(touch.x > 0, 'held stick moves');
  assert.equal(touch.id, 1);
  fire(pad, 'pointerdown', 2, 20, 20);
  assert.equal(touch.id, 1, 'a second finger does not steal the held stick');
  assert.ok(touch.x > 0);
  fire(pad, 'pointercancel', 2, 20, 20);
  assert.equal(touch.id, 1, 'cancelling the other finger leaves the stick held');
  fire(pad, 'pointercancel', 1, 110, 60);
  assert.equal(touch.x, 0);
  assert.equal(touch.y, 0);
  assert.equal(touch.mag, 0);
  assert.equal(touch.id, null);
  assert.equal(ends, 1);
  fire(pad, 'pointerdown', 3, 110, 60);
  assert.ok(touch.x > 0);
  for (const fn of pad.listeners['win:blur']) fn();
  assert.equal(touch.id, null);
  assert.equal(touch.x, 0);
  assert.equal(ends, 2);
  fire(pad, 'pointerdown', 4, 60, 110);
  assert.ok(touch.y > 0);
  pad.ownerDocument.visibilityState = 'hidden';
  for (const fn of pad.listeners['doc:visibilitychange']) fn();
  assert.equal(touch.y, 0);
  assert.equal(ends, 3);
  const dead = stickAxes(60, 60, pad.getBoundingClientRect());
  assert.equal(dead.x, 0);
  assert.equal(dead.y, 0);
});

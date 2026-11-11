import test from 'node:test';
import assert from 'node:assert/strict';
import { mountNotices } from '../src/notices.js';

function docFor(width, height) {
  const nodes = new Map();
  const body = {
    classList: new Set(['inworld']),
    appendChild(el) { el.parent = body; nodes.set(el.id, el); },
    classListContains: null,
  };
  body.classList = {
    _s: new Set(['inworld']),
    contains(c) { return this._s.has(c); },
    toggle(c, on) { if (on) this._s.add(c); else this._s.delete(c); },
  };
  const toast = { id: 'toast', children: [{ innerText: 'Welcome to Inu Verse, Kabosu!' }, { innerText: 'Login streak: day 1 (device-only)' }], parent: body };
  const crier = { id: 'crier-banner', classList: { contains: (c) => c === 'show' }, innerText: 'Crier Barkley Hear ye!', hidden: false, parent: body };
  const garden = { id: 'ev-banner', hidden: false, innerText: 'Garden Show today', parent: body };
  nodes.set('toast', toast); nodes.set('crier-banner', crier); nodes.set('ev-banner', garden);
  const created = [];
  const doc = {
    body,
    defaultView: { matchMedia: () => ({ matches: width < height && width <= 520 }) },
    getElementById: (id) => nodes.get(id) || null,
    createElement(tag) {
      const el = { tag, id: '', hidden: false, className: '', dataset: {}, textContent: '', children: [], innerHTML: '', parent: null,
        querySelector: (sel) => el.children.find((c) => sel === '#notice-log' ? c.id === 'notice-log' : sel === '#notice-count' ? c.id === 'notice-count' : sel === '#notice-toggle' ? c.id === 'notice-toggle' : null),
        appendChild(ch) { ch.parent = el; el.children.push(ch); if (ch.id) nodes.set(ch.id, ch); },
        setAttribute() {}, addEventListener() {} };
      created.push(el);
      return el;
    },
  };
  const tray = doc.createElement('div');
  tray.id = 'notice-tray';
  const toggle = doc.createElement('button'); toggle.id = 'notice-toggle';
  const count = doc.createElement('b'); count.id = 'notice-count'; count.textContent = '0';
  const log = doc.createElement('div'); log.id = 'notice-log'; log.hidden = true;
  tray.querySelector = (sel) => sel === '#notice-log' ? log : sel === '#notice-count' ? count : sel === '#notice-toggle' ? toggle : null;
  tray.children = [toggle, log];
  doc.createElement = ((orig) => orig)(doc.createElement);
  const realCreate = doc.createElement.bind(doc);
  let first = true;
  doc.createElement = (tag) => {
    if (first && tag === 'div') { first = false; return tray; }
    return realCreate(tag);
  };
  // rebuild simply
  return { doc, toast, crier, garden, tray, log, count };
}

test('phone notice tray keeps welcome, streak, crier, and garden text', () => {
  const nodes = new Map();
  const listeners = {};
  const body = { classList: { _s: new Set(['inworld']), contains(c) { return this._s.has(c); }, toggle(c, on) { if (on === false || (on == null && this._s.has(c))) this._s.delete(c); else this._s.add(c); } }, appendChild() {} };
  const toast = { id: 'toast', children: [{ innerText: 'Welcome to Inu Verse, Kabosu!' }, { innerText: 'Login streak: day 1 (device-only)' }] };
  const crier = { id: 'crier-banner', classList: { contains: (c) => c === 'show' }, innerText: 'Crier Barkley Hear ye!' };
  const garden = { id: 'ev-banner', hidden: false, innerText: 'Garden Show today' };
  nodes.set('toast', toast); nodes.set('crier-banner', crier); nodes.set('ev-banner', garden);
  const log = { id: 'notice-log', hidden: true, children: [], appendChild(ch) { this.children.push(ch); }, firstElementChild: null };
  Object.defineProperty(log, 'firstElementChild', { get() { return this.children[0] || null; } });
  const count = { id: 'notice-count', textContent: '0' };
  const toggle = { id: 'notice-toggle', addEventListener(type, fn) { listeners[type] = fn; }, setAttribute() {} };
  const tray = { id: 'notice-tray', hidden: true, innerHTML: '', children: [], querySelector(sel) { return sel === '#notice-log' ? log : sel === '#notice-count' ? count : toggle; }, appendChild() {} };
  let made = 0;
  const doc = {
    body,
    defaultView: { matchMedia: () => ({ matches: true }) },
    getElementById: (id) => nodes.get(id) || null,
    createElement() { made += 1; if (made === 1) { nodes.set('notice-tray', tray); return tray; } const row = { className: '', dataset: {}, textContent: '' }; return row; },
  };
  const park = mountNotices(doc);
  assert.equal(typeof listeners.click, 'function');
  assert.equal(park(), 4);
  assert.equal(count.textContent, '4');
  assert.equal(tray.hidden, false);
  assert.equal(log.hidden, true);
  assert.equal(toast.children.length, 2);
  assert.match(log.children.map((c) => c.textContent).join('\n'), /Welcome to Inu Verse/);
  assert.match(log.children.map((c) => c.textContent).join('\n'), /Login streak/);
  assert.match(log.children.map((c) => c.textContent).join('\n'), /Crier Barkley/);
  assert.match(log.children.map((c) => c.textContent).join('\n'), /Garden Show/);
  assert.equal(park(), 4, 'the same lines are not stored twice');
  listeners.click();
  assert.equal(log.hidden, false);
  assert.equal(body.classList.contains('notices-open'), true);
});

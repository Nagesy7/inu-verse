import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modalOpen, syncChat, MODAL_SEL } from '../src/chatdodge.js';
import { overScenery } from '../src/ghosts.js';
import { TILE, KIBBLE_PLAZA, LEADERS } from '../src/world.js';

// tiny DOM stand-in: elements with id / visible rect, a body classList, style objects
function el(id, { vis = true, rect = { top: 0, height: 0 }, hidden = false } = {}) {
  return { id, hidden, style: {}, closest: () => null, getClientRects: () => (vis ? [1] : []), getBoundingClientRect: () => rect };
}
function fakeDoc(map) { const cls = new Set(), byId = {}, head = { appendChild: (s) => { byId[s.id] = s; } };
  for (const list of Object.values(map)) for (const e of list) if (e.id) byId[e.id] = e;
  return { head, byId, body: { classList: { contains: (c) => cls.has(c), toggle: (c, on) => (on ? cls.add(c) : cls.delete(c)) } }, cls,
    querySelectorAll: (sel) => map[sel] || [], getElementById: (id) => byId[id] || null, createElement: () => ({}) }; }

test('modalOpen: a visible panel counts, hidden ones and corner popovers do not', () => {
  assert.ok(MODAL_SEL.includes('#panel'));
  assert.equal(modalOpen(fakeDoc({ '#panel': [el('panel', { vis: false })] })), false);
  assert.equal(modalOpen(fakeDoc({ '#panel': [el('panel', { hidden: true })] })), false);
  assert.equal(modalOpen(fakeDoc({ '[role="dialog"]': [el('mp-pop')] })), false);
  assert.equal(modalOpen(fakeDoc({ '#panel': [el('panel')] })), true);
  assert.equal(modalOpen(fakeDoc({ '.overlay': [el('arcade-x')] })), true);
});

test('syncChat: modal open hides the chat bar (body.modal-open); closed lifts the event banner above the bar', () => {
  const bar = el('mp-chat', { rect: { top: 326, height: 58 } }), bn = el('ev-banner'), panel = el('panel', { vis: false });
  const d = fakeDoc({ '#panel': [panel], x: [bar, bn] }), win = { innerHeight: 390 };
  assert.equal(syncChat(d, win), false); assert.equal(d.cls.has('modal-open'), false);
  assert.equal(bn.style.bottom, (390 - 326 + 6) + 'px', 'banner bottom sits 6px above the chat bar top');
  assert.ok(d.byId['chatdodge-css'].textContent.includes('#ev-banner'));
  panel.getClientRects = () => [1];
  assert.equal(syncChat(d, win), true); assert.equal(d.cls.has('modal-open'), true);
  assert.equal(bn.style.bottom, '', 'no lift while a modal is open (chat hidden)');
  panel.getClientRects = () => []; syncChat(d, win); assert.equal(d.cls.has('modal-open'), false);
});

test('syncChat: no chat bar (MP off) leaves the banner at its default spot', () => {
  const bn = el('ev-banner'); bn.style.bottom = '99px'; const d = fakeDoc({ x: [bn] });
  syncChat(d, { innerHeight: 390 }); assert.equal(bn.style.bottom, '');
});

test('overScenery: ghost labels avoid buildings and plaza decor, open paving is fine', () => {
  assert.equal(overScenery(LEADERS.x * TILE + 4, LEADERS.y * TILE + 4, 40, 14), true, 'Leaderboards Hall');
  assert.equal(overScenery(KIBBLE_PLAZA.statue.x * TILE + 2, KIBBLE_PLAZA.statue.y * TILE + 2, 20, 10), true, 'statue');
  assert.equal(overScenery(22 * TILE + 2, 50 * TILE + 2, 20, 10), false, 'open plaza paving');
});

test('wallet pill: hidden while the menu drawer or any panel/modal is open, its own dropdown is not a modal', () => {
  const inWallet = el('w-drop'); inWallet.closest = (sel) => (sel.includes('#inu-wallet') ? {} : null);
  assert.equal(modalOpen(fakeDoc({ '[role="dialog"]': [inWallet] })), false);
  const d = fakeDoc({ x: [] }); syncChat(d, { innerHeight: 390 }); const css = d.byId['chatdodge-css'].textContent;
  assert.ok(!/body\.modal-open #inu-wallet/.test(css), 'title screen keeps the pill');
  for (const c of ['inworld.modal-open', 'drawer-open', 'menu-open']) for (const w of ['#inu-wallet', '#inu-profile-badge']) assert.ok(css.includes(`body.${c} ${w}`), c + w);
  assert.match(css, /#inu-profile-badge\{visibility:hidden!important;pointer-events:none!important\}/);
});

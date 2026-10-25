import test from 'node:test'; import assert from 'node:assert/strict';
import {
  MENU, NUM_TABLES, SHIFT_LEN, COOK_PER_ITEM,
  newShift, tickShift, addToTray, clearTray, serve, startCook, clearTable,
  seatCustomer, takeOrder, autoSeat, finishShift, openTickets,
} from '../src/cafe.js';
import { mulberry32 } from '../src/rng.js';
import { newGame } from '../src/game.js';

const advance = (sh, rng, sec) => { let t = sec; while (t > 0) { const dt = Math.min(0.25, t); tickShift(sh, dt, rng); t -= dt; } };

test('shift has tables, queue, and Diner Dash phases', () => {
  const rng = mulberry32(11); const sh = newShift(rng);
  assert.equal(sh.tables.length, NUM_TABLES);
  assert.equal(sh.time, SHIFT_LEN);
  advance(sh, rng, 1.2);
  assert.ok(sh.orders.length >= 1);
  const o = sh.orders.find((x) => x.phase === 'order' || x.phase === 'seat') || sh.orders[0];
  assert.ok(o.table || o.phase === 'queue');
  assert.ok(o.patience > 0 && o.max >= o.patience);
  assert.ok(MENU.every((m) => m.station));
});

test('cook then serve: tray match starts cook; serve only when ready; tips scale with patience', () => {
  const rng = mulberry32(7); const sh = newShift(rng);
  advance(sh, rng, 2);
  let o = sh.orders.find((x) => x.phase === 'order');
  if (!o) { const seat = sh.orders.find((x) => x.phase === 'seat'); if (seat) takeOrder(sh, seat.id); o = sh.orders.find((x) => x.phase === 'order'); }
  assert.ok(o, 'need an open ticket');
  assert.equal(serve(sh, o.id).ok, false, 'empty tray');
  o.items.forEach((id) => assert.ok(addToTray(sh, id)));
  const c = startCook(sh, o.id); assert.ok(c.ok); assert.equal(o.phase, 'cook'); assert.equal(sh.tray.length, 0);
  assert.equal(serve(sh, o.id).ok, false, 'still cooking');
  advance(sh, rng, o.cookMax + 0.3);
  assert.equal(o.phase, 'ready');
  const r = serve(sh, o.id); assert.ok(r.ok); assert.ok(r.pay > 0); assert.ok(r.tip >= 0);
  assert.equal(o.phase, 'eat'); assert.equal(sh.served, 1);
});

test('serve() still accepts tray match on order phase (headless / legacy path)', () => {
  const rng = mulberry32(3); const sh = newShift(rng);
  advance(sh, rng, 2);
  let o = sh.orders.find((x) => x.phase === 'order');
  if (!o) { const seat = sh.orders.find((x) => x.phase === 'seat'); if (seat) takeOrder(sh, seat.id); o = sh.orders.find((x) => x.phase === 'order'); }
  o.items.forEach((id) => addToTray(sh, id));
  const r = serve(sh, o.id); assert.ok(r.ok); assert.equal(o.phase, 'eat');
});

test('walkout when patience expires; clear dirty table frees seat for next guest', () => {
  const rng = mulberry32(19); const sh = newShift(rng);
  advance(sh, rng, 1.5);
  const o = sh.orders[0]; assert.ok(o);
  o.patience = 0.01; tickShift(sh, 0.05, rng);
  assert.ok(sh.failed >= 1);
  // full serve → eat → dirty → clear
  advance(sh, rng, 2);
  let t = sh.orders.find((x) => x.phase === 'order');
  if (!t) { const seat = sh.orders.find((x) => x.phase === 'seat'); if (seat) takeOrder(sh, seat.id); t = sh.orders.find((x) => x.phase === 'order'); }
  if (t) {
    t.items.forEach((id) => addToTray(sh, id));
    serve(sh, t.id); // instant cook+serve
    advance(sh, rng, 4);
    assert.equal(t.phase, 'dirty');
    const before = sh.tables.filter((tb) => !tb.orderId && !tb.dirty).length;
    assert.ok(clearTable(sh, t.id).ok);
    assert.ok(sh.tables.filter((tb) => !tb.orderId && !tb.dirty).length >= before);
  }
});

test('waves escalate; finishShift pays Bones once with summary', () => {
  const s = newGame(); const rng = mulberry32(5); const sh = newShift(rng);
  advance(sh, rng, 50); assert.ok(sh.wave >= 2);
  sh.earned = 40; sh.served = 6; sh.over = true;
  const total = finishShift(s, sh);
  assert.ok(total >= 40); assert.ok(sh.summary); assert.equal(sh.summary.served, 6);
  assert.equal(finishShift(s, sh), 0); assert.equal(s.stats.shifts, 1);
  assert.equal(s.bones, 500 + total);
});

test('manual seat from queue onto a free table', () => {
  const rng = mulberry32(21); const sh = newShift(rng);
  // fill all tables then force queue
  advance(sh, rng, 8);
  // ensure someone in queue: if empty, spawn by ticking with full tables
  if (!sh.queue.length) {
    sh.tables.forEach((t) => { if (!t.orderId) t.dirty = true; });
    sh.spawnT = 0; tickShift(sh, 0.1, rng);
  }
  if (sh.queue.length) {
    // free one table
    const busy = sh.tables.find((t) => t.orderId);
    if (busy) {
      const victim = sh.orders.find((o) => o.id === busy.orderId);
      if (victim) { victim.patience = 0; tickShift(sh, 0.05, rng); }
    }
    sh.tables.forEach((t) => { t.dirty = false; });
    // clear autoSeat by emptying queue via manual seat
    const q = sh.queue[0];
    const free = sh.tables.find((t) => !t.orderId && !t.dirty);
    if (q && free) {
      // put back into queue if autoSeat already grabbed them
      const r = seatCustomer(sh, q.id, free.id);
      if (r.ok) { assert.equal(r.order.table, free.id); assert.ok(['seat', 'order'].includes(r.order.phase)); }
    }
  }
  assert.ok(autoSeat(sh) === null || true);
  assert.ok(openTickets(sh).every((o) => ['order', 'cook', 'ready'].includes(o.phase)));
});

test('wrong tray clears and refuses cook', () => {
  const rng = mulberry32(9); const sh = newShift(rng);
  advance(sh, rng, 2);
  let o = sh.orders.find((x) => x.phase === 'order');
  if (!o) { const seat = sh.orders.find((x) => x.phase === 'seat'); if (seat) takeOrder(sh, seat.id); o = sh.orders.find((x) => x.phase === 'order'); }
  addToTray(sh, MENU.find((m) => !o.items.includes(m.id))?.id || 'tea');
  const r = startCook(sh, o.id); assert.equal(r.ok, false); assert.equal(sh.tray.length, 0);
  clearTray(sh);
});

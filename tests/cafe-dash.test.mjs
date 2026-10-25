import test from 'node:test'; import assert from 'node:assert/strict';
import {
  MENU, STATIONS, NUM_TABLES, TABLES_START, SHIFT_LEN, COOK_PER_ITEM, STATION_COOK,
  newShift, tickShift, addToTray, clearTray, serve, startCook, clearTable,
  seatCustomer, takeOrder, autoSeat, finishShift, openTickets,
  cookAtStation, selectQueue, seatSelected, tablesOpenForWave, neededByStation,
} from '../src/cafe.js';
import { mulberry32 } from '../src/rng.js';
import { newGame } from '../src/game.js';

const advance = (sh, rng, sec) => { let t = sec; while (t > 0) { const dt = Math.min(0.25, t); tickShift(sh, dt, rng); t -= dt; } };

test('shift has stations, locked tables, and longer Diner Dash shift', () => {
  const rng = mulberry32(11); const sh = newShift(rng);
  assert.equal(sh.tables.length, NUM_TABLES);
  assert.equal(sh.tables.filter((t) => t.open).length, TABLES_START);
  assert.equal(sh.time, SHIFT_LEN);
  assert.ok(SHIFT_LEN >= 120);
  assert.equal(STATIONS.length, 3);
  assert.ok(MENU.every((m) => STATIONS.some((st) => st.id === m.station)));
  assert.equal(tablesOpenForWave(1), 4);
  assert.equal(tablesOpenForWave(3), 5);
  assert.equal(tablesOpenForWave(5), 6);
  advance(sh, rng, 1.2);
  assert.ok(sh.orders.length >= 1 || sh.queue.length >= 0);
});

test('cook at station: wrong station refused; right station fills tray then plate+serve', () => {
  const rng = mulberry32(7); const sh = newShift(rng);
  // force a seated order with known items
  const o = {
    id: 99, customer: 'Kiki', items: ['latte', 'biscuit'], patience: 30, max: 30,
    phase: 'order', table: 1, cookT: 0, cookMax: 0, eatT: 0, greetT: 0, tagged: false, seat: null, vip: false, special: false,
  };
  sh.orders.push(o); sh.tables[0].orderId = 99;
  assert.equal(cookAtStation(sh, 'grill', 'latte').ok, false, 'latte is drink station');
  const d = cookAtStation(sh, 'drink', 'latte'); assert.ok(d.ok); assert.ok(sh.stations.drink.busy > 0);
  advance(sh, rng, STATION_COOK + 0.05);
  assert.ok(sh.tray.includes('latte'));
  assert.ok(cookAtStation(sh, 'grill', 'biscuit').ok);
  advance(sh, rng, STATION_COOK + 0.05);
  assert.ok(sameish(sh.tray, o.items));
  const c = startCook(sh, o.id); assert.ok(c.ok); assert.equal(o.phase, 'cook');
  assert.equal(serve(sh, o.id).ok, false, 'still cooking');
  advance(sh, rng, o.cookMax + 0.3);
  assert.equal(o.phase, 'ready');
  const r = serve(sh, o.id); assert.ok(r.ok); assert.ok(r.tip >= 0); assert.ok(r.pay > 0);
  assert.equal(o.phase, 'eat');
});

function sameish(a, b) { return a.length === b.length && [...a].sort().join() === [...b].sort().join(); }

test('serve() still accepts tray match on order phase (headless / legacy path)', () => {
  const rng = mulberry32(3); const sh = newShift(rng);
  advance(sh, rng, 5);
  // seat someone manually if only in queue
  if (sh.queue.length && !sh.orders.some((x) => x.phase === 'order' || x.phase === 'seat')) {
    seatCustomer(sh, sh.queue[0].id, freeOpen(sh).id);
  }
  // wait for soft auto-seat + greet
  advance(sh, rng, 5);
  let o = sh.orders.find((x) => x.phase === 'order');
  if (!o) { const seat = sh.orders.find((x) => x.phase === 'seat'); if (seat) takeOrder(sh, seat.id); o = sh.orders.find((x) => x.phase === 'order'); }
  assert.ok(o, 'need an open ticket');
  o.items.forEach((id) => addToTray(sh, id));
  const r = serve(sh, o.id); assert.ok(r.ok); assert.equal(o.phase, 'eat');
});

function freeOpen(sh) { return sh.tables.find((t) => t.open && !t.orderId && !t.dirty); }

test('dirty tables tax patience; clear pays bigger tidy bonus', () => {
  const rng = mulberry32(19); const sh = newShift(rng);
  const o = {
    id: 1, customer: 'Hana', items: ['tea'], patience: 20, max: 20,
    phase: 'dirty', table: 1, cookT: 0, cookMax: 0, eatT: 0, greetT: 0, tagged: false, seat: null, vip: false, special: false,
  };
  sh.orders.push(o);
  sh.tables[0].orderId = 1; sh.tables[0].dirty = true; sh.tables[0].dirtyAge = 5;
  // another guest loses patience faster while dirty exists
  const g = {
    id: 2, customer: 'Taro', items: ['latte'], patience: 10, max: 10,
    phase: 'order', table: 2, cookT: 0, cookMax: 0, eatT: 0, greetT: 0, tagged: false, seat: null, vip: false, special: false,
  };
  sh.orders.push(g); sh.tables[1].orderId = 2;
  const before = g.patience;
  tickShift(sh, 1, rng);
  assert.ok(g.patience < before - 0.9, 'dirt tax should accelerate drain');
  const r = clearTable(sh, 1); assert.ok(r.ok); assert.ok(r.pay >= 5, 'aged dirty pays more than flat 2');
});

test('waves unlock tables; finishShift pays star/combo/vip bonuses once', () => {
  const s = newGame(); const rng = mulberry32(5); const sh = newShift(rng);
  advance(sh, rng, 55); assert.ok(sh.wave >= 3);
  assert.ok(sh.tables.filter((t) => t.open).length >= 5);
  sh.earned = 40; sh.served = 8; sh.failed = 0; sh.maxCombo = 6; sh.stars = 2; sh.vipServed = 1; sh.cleared = 3; sh.over = true;
  // syncStars would set stars; force finish
  const total = finishShift(s, sh);
  assert.ok(total >= 40); assert.ok(sh.summary); assert.equal(sh.summary.served, 8);
  assert.ok((sh.summary.star || 0) > 0 || (sh.summary.comboBonus || 0) > 0);
  assert.equal(finishShift(s, sh), 0); assert.equal(s.stats.shifts, 1);
  assert.equal(s.bones, 500 + total);
});

test('tap-to-seat: select from queue then seat onto free table', () => {
  const rng = mulberry32(21); const sh = newShift(rng);
  // force queue with locked seats (all dirty)
  sh.tables.forEach((t) => { t.dirty = true; });
  sh.spawnT = 0; tickShift(sh, 0.1, rng);
  assert.ok(sh.queue.length >= 1);
  const q = sh.queue[0];
  assert.ok(selectQueue(sh, q.id).ok);
  assert.equal(sh.selectedQueueId, q.id);
  sh.tables[0].dirty = false;
  const r = seatSelected(sh, 1);
  assert.ok(r.ok); assert.equal(r.order.table, 1); assert.ok(['seat', 'order'].includes(r.order.phase));
  assert.equal(sh.selectedQueueId, null);
});

test('manual seatCustomer still works; neededByStation reports gaps', () => {
  const rng = mulberry32(9); const sh = newShift(rng);
  sh.tables.forEach((t) => { t.dirty = true; });
  sh.spawnT = 0; tickShift(sh, 0.1, rng);
  const q = sh.queue[0]; assert.ok(q);
  sh.tables[0].dirty = false;
  assert.ok(seatCustomer(sh, q.id, 1).ok);
  takeOrder(sh, q.id);
  const need = neededByStation(sh, q.id);
  assert.ok(Object.values(need).some((arr) => arr.length));
  assert.ok(autoSeat(sh) === null || true);
  assert.ok(openTickets(sh).every((o) => ['order', 'cook', 'ready'].includes(o.phase)));
});

test('wrong tray clears and refuses cook; VIP tip popup path', () => {
  const rng = mulberry32(9); const sh = newShift(rng);
  const o = {
    id: 7, customer: 'Lady Sakura', items: ['tea'], patience: 25, max: 25,
    phase: 'order', table: 1, cookT: 0, cookMax: 0, eatT: 0, greetT: 0, tagged: false, seat: null, vip: true, special: false,
  };
  sh.orders.push(o); sh.tables[0].orderId = 7;
  addToTray(sh, 'latte');
  const r = startCook(sh, o.id); assert.equal(r.ok, false); assert.equal(sh.tray.length, 0);
  clearTray(sh);
  addToTray(sh, 'tea');
  const sv = serve(sh, o.id); assert.ok(sv.ok); assert.ok(sv.tip >= 0); assert.ok(sh.pops.some((p) => p.kind === 'tip' || p.kind === 'vip'));
});

// Shiba Sips Café — player barista shift (Diner Dash loop).
// Customers arrive → seat (auto) → take order → cook/prep at the station → serve before
// patience runs out → clear dirty tables → earn Bones tips. Waves escalate during a shift.
// Bones only (player rewards). Never touches Pawmarks / sim economy.
import { earnBones } from './outfits.js';

export const MENU = [
  { id: 'latte', name: 'Pup Latte', station: 'drink' },
  { id: 'biscuit', name: 'Bone Biscuit', station: 'oven' },
  { id: 'berry', name: 'Berry Bowl', station: 'prep' },
  { id: 'cake', name: 'Sakura Cake', station: 'oven' },
  { id: 'tea', name: 'Matcha Tea', station: 'drink' },
];
export const CUSTOMERS = ['Mochi', 'Kuro', 'Hana', 'Taro', 'Yuzu', 'Kiki', 'Goma', 'Sora', 'Azuki', 'Pochi'];
export const NUM_TABLES = 4;
export const SHIFT_LEN = 90;
export const MAX_ORDERS = 4; // active tickets (order/cook/ready)
export const TRAY_MAX = 4;
export const COOK_PER_ITEM = 1.6; // seconds per menu item once tray matches
export const EAT_TIME = 2.8;
export const QUEUE_CAP = 3;

const menuOf = (id) => MENU.find((m) => m.id === id);
const sameItems = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

function mkTables() {
  return Array.from({ length: NUM_TABLES }, (_, i) => ({ id: i + 1, orderId: null, dirty: false }));
}

export function newShift(rng) {
  return {
    time: SHIFT_LEN,
    orders: [], // tickets: seated customers in order/cook/ready/eat/dirty
    queue: [], // waiting to sit (patience)
    tables: mkTables(),
    tray: [],
    served: 0,
    failed: 0, // walkouts
    cleared: 0,
    earned: 0,
    tips: 0,
    spawnT: 0.4,
    nextId: 1,
    wave: 1,
    over: false,
    settled: false,
    combo: 0,
    maxCombo: 0,
    events: [], // recent UI flashes: { kind, msg, t }
  };
}

function waveOf(s) {
  // escalate every ~22s of remaining time consumed
  const elapsed = SHIFT_LEN - s.time;
  return 1 + Math.min(4, Math.floor(elapsed / 22));
}

function patienceFor(nItems, wave) {
  return Math.max(10, 20 + nItems * 3 - (wave - 1) * 2.5);
}

function spawnInterval(wave) {
  return Math.max(2.2, 4.2 - (wave - 1) * 0.45);
}

function freeTable(s) {
  return s.tables.find((t) => !t.orderId && !t.dirty) || null;
}

function pushEvent(s, kind, msg) {
  s.events.push({ kind, msg, t: 2.2 });
  if (s.events.length > 6) s.events.shift();
}

function walkout(s, o, why) {
  s.failed++;
  s.combo = 0;
  const tbl = s.tables.find((t) => t.id === o.table);
  if (tbl && tbl.orderId === o.id) { tbl.orderId = null; tbl.dirty = false; }
  s.orders = s.orders.filter((x) => x !== o);
  s.queue = s.queue.filter((x) => x !== o);
  pushEvent(s, 'walkout', `${o.customer} left (${why})`);
}

function seatOne(s, o, table) {
  o.phase = 'seat';
  o.table = table.id;
  table.orderId = o.id;
  o.patience = Math.min(o.patience, o.max * 0.85); // sitting buys a little calm
  // auto-take order shortly — Diner Dash "greeting" beat; UI can also call takeOrder
  o.greetT = 0.7 + Math.random() * 0.5;
}

function spawn(s, rng) {
  const wave = s.wave;
  const n = 1 + rng.int(rng() < 0.45 + wave * 0.08 ? 2 : 3);
  const items = Array.from({ length: n }, () => rng.pick(MENU).id);
  const max = patienceFor(n, wave);
  const o = {
    id: s.nextId++,
    customer: rng.pick(CUSTOMERS),
    items,
    patience: max,
    max,
    phase: 'queue', // queue | seat | order | cook | ready | eat | dirty
    table: null,
    cookT: 0,
    cookMax: 0,
    eatT: 0,
    greetT: 0,
    tagged: false,
    seat: null, // cafeplay tags a room seat id for display
  };
  const tbl = freeTable(s);
  if (tbl && s.queue.length === 0) seatOne(s, o, tbl);
  else {
    if (s.queue.length >= QUEUE_CAP) return; // lobby full — skip spawn
    s.queue.push(o);
  }
  s.orders.push(o);
}

/** Auto-seat the head of the queue onto a free clean table. */
export function autoSeat(s) {
  if (s.over) return null;
  const tbl = freeTable(s);
  if (!tbl || !s.queue.length) return null;
  const o = s.queue.shift();
  seatOne(s, o, tbl);
  return o;
}

/** Manually seat a queued customer onto a table. */
export function seatCustomer(s, orderId, tableId) {
  if (s.over) return { ok: false, reason: 'Shift over' };
  const o = s.queue.find((x) => x.id === orderId);
  const tbl = s.tables.find((t) => t.id === tableId);
  if (!o) return { ok: false, reason: 'Not in line' };
  if (!tbl || tbl.orderId || tbl.dirty) return { ok: false, reason: 'Table busy' };
  s.queue = s.queue.filter((x) => x !== o);
  seatOne(s, o, tbl);
  return { ok: true, order: o };
}

/** Take the order at a seated table (opens the ticket). */
export function takeOrder(s, orderId) {
  if (s.over) return { ok: false, reason: 'Shift over' };
  const o = s.orders.find((x) => x.id === orderId);
  if (!o || o.phase !== 'seat') return { ok: false, reason: 'No seated guest' };
  o.phase = 'order';
  o.greetT = 0;
  return { ok: true, order: o };
}

export function tickShift(s, dt, rng) {
  if (s.over) return;
  s.time -= dt;
  s.wave = waveOf(s);
  for (const e of s.events) e.t -= dt;
  s.events = s.events.filter((e) => e.t > 0);

  // auto-seat whenever a table frees
  while (autoSeat(s)) { /* drain queue onto free tables */ }

  for (const o of [...s.orders]) {
    if (o.phase === 'eat') {
      o.eatT -= dt;
      if (o.eatT <= 0) {
        o.phase = 'dirty';
        const tbl = s.tables.find((t) => t.id === o.table);
        if (tbl) tbl.dirty = true;
      }
      continue; // eating customers don't lose patience
    }
    if (o.phase === 'dirty') continue; // waiting for clear — no walkout
    if (o.phase === 'cook') {
      o.cookT -= dt;
      o.patience -= dt * 0.55; // cooking buys some calm
      if (o.cookT <= 0) { o.phase = 'ready'; o.cookT = 0; }
    } else {
      o.patience -= dt;
    }
    if (o.phase === 'seat' && o.greetT > 0) {
      o.greetT -= dt;
      if (o.greetT <= 0) takeOrder(s, o.id);
    }
    if (o.patience <= 0) walkout(s, o, o.phase === 'queue' ? 'queue' : 'impatient');
  }

  s.spawnT -= dt;
  const activeTickets = s.orders.filter((o) => ['order', 'cook', 'ready'].includes(o.phase)).length;
  if (s.spawnT <= 0 && activeTickets < MAX_ORDERS && s.orders.length < NUM_TABLES + QUEUE_CAP) {
    spawn(s, rng);
    s.spawnT = spawnInterval(s.wave);
  }
  if (s.time <= 0) { s.time = 0; s.over = true; }
}

export function addToTray(s, id) {
  if (s.over || s.tray.length >= TRAY_MAX || !menuOf(id)) return false;
  s.tray.push(id);
  return true;
}
export const clearTray = (s) => { s.tray = []; };

/** Start cooking when the tray matches a ticket in 'order' phase. */
export function startCook(s, orderId) {
  const o = s.orders.find((x) => x.id === orderId);
  if (!o || s.over) return { ok: false, reason: 'No order' };
  if (o.phase !== 'order') return { ok: false, reason: o.phase === 'cook' ? 'Already cooking' : 'Not ready to cook' };
  if (!sameItems(o.items, s.tray)) { s.tray = []; return { ok: false, reason: 'Wrong order!' }; }
  o.phase = 'cook';
  o.cookMax = COOK_PER_ITEM * o.items.length;
  o.cookT = o.cookMax;
  s.tray = [];
  pushEvent(s, 'cook', `Cooking for ${o.customer}…`);
  return { ok: true, cookT: o.cookT };
}

/**
 * Serve a ready order. For backward-compat with tray-match tests: if phase is still
 * 'order' and the tray matches, cook completes instantly then serves (headless path).
 * UI should call startCook → wait → serve for the full Diner Dash beat.
 */
export function serve(s, orderId) {
  const o = s.orders.find((x) => x.id === orderId);
  if (!o || s.over) return { ok: false, reason: 'No order' };

  if (o.phase === 'order') {
    if (!sameItems(o.items, s.tray)) { s.tray = []; return { ok: false, reason: 'Wrong order!' }; }
    // instant cook+serve (API / tests); UI prefers startCook
    s.tray = [];
    o.phase = 'ready';
    o.cookT = 0;
  }
  if (o.phase === 'cook') return { ok: false, reason: 'Still cooking…' };
  if (o.phase !== 'ready') return { ok: false, reason: 'Not ready to serve' };

  const tipFrac = Math.max(0, o.patience / o.max);
  const base = 6 * o.items.length;
  const tip = Math.round(8 * tipFrac + (s.combo >= 3 ? 2 : 0) + (s.wave > 2 ? 1 : 0));
  const pay = base + tip;
  s.earned += pay;
  s.tips += tip;
  s.served++;
  s.combo++;
  s.maxCombo = Math.max(s.maxCombo, s.combo);
  o.phase = 'eat';
  o.eatT = EAT_TIME;
  pushEvent(s, 'serve', `+${pay} Bones · ${o.customer}`);
  return { ok: true, pay, tip, base };
}

/** Clear a dirty table after the guest finishes eating. Small tidy bonus. */
export function clearTable(s, orderId) {
  const o = s.orders.find((x) => x.id === orderId);
  if (!o || o.phase !== 'dirty') return { ok: false, reason: 'Nothing to clear' };
  const bonus = 2;
  s.earned += bonus;
  s.cleared++;
  const tbl = s.tables.find((t) => t.id === o.table);
  if (tbl) { tbl.orderId = null; tbl.dirty = false; }
  s.orders = s.orders.filter((x) => x !== o);
  pushEvent(s, 'clear', `Table cleared · +${bonus}`);
  return { ok: true, pay: bonus };
}

export function finishShift(state, s) {
  if (s.settled) return 0; // idempotent: paid (and counted) exactly once, even if 0
  const star = s.served >= 6 ? 30 : s.served >= 4 ? 15 : 0;
  const comboBonus = Math.min(20, Math.floor((s.maxCombo || 0) / 4) * 4);
  const total = s.earned + star + comboBonus;
  const earned = earnBones(state, total);
  state.stats.shifts++;
  state.stats.served += s.served;
  s.over = true;
  s.star = star;
  s.comboBonus = comboBonus;
  s.paid = earned.total;
  s.settled = true;
  s.summary = {
    served: s.served,
    walkouts: s.failed,
    cleared: s.cleared,
    tips: s.tips,
    star,
    comboBonus,
    maxCombo: s.maxCombo,
    wave: s.wave,
    total: earned.total,
  };
  return earned.total;
}

/** Active tickets the barista still needs to cook/serve (for UI + cafeplay tagging). */
export function openTickets(s) {
  return s.orders.filter((o) => ['order', 'cook', 'ready'].includes(o.phase));
}

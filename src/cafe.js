// Shiba Sips Café — player barista shift (Diner Dash loop).
// Seat from the line → take order → cook each dish at the right station (drink / grill / prep)
// → serve before patience runs out → clear dirty tables (they tax the floor) → Bones tips.
// Waves unlock more tables. VIP guests + specials. Bones only — never Pawmarks / sim / Mememon.
import { earnBones } from './outfits.js';

export const STATIONS = [
  { id: 'drink', name: 'Drink', emoji: '☕' },
  { id: 'grill', name: 'Grill', emoji: '🔥' },
  { id: 'prep', name: 'Prep', emoji: '🥗' },
];

export const MENU = [
  { id: 'latte', name: 'Pup Latte', station: 'drink' },
  { id: 'biscuit', name: 'Bone Biscuit', station: 'grill' },
  { id: 'berry', name: 'Berry Bowl', station: 'prep' },
  { id: 'cake', name: 'Sakura Cake', station: 'grill' },
  { id: 'tea', name: 'Matcha Tea', station: 'drink' },
  { id: 'salad', name: 'Pup Salad', station: 'prep' },
];

export const CUSTOMERS = ['Mochi', 'Kuro', 'Hana', 'Taro', 'Yuzu', 'Kiki', 'Goma', 'Sora', 'Azuki', 'Pochi'];
export const VIP_NAMES = ['President Inu', 'Lady Sakura', 'Chef Bones', 'Mayor Pup'];

/** Tables on the floor (some lock until later waves). */
export const NUM_TABLES = 6;
export const TABLES_START = 4;
export const SHIFT_LEN = 140;
export const MAX_ORDERS = 5; // active tickets (order/cook/ready)
export const TRAY_MAX = 5;
export const COOK_PER_ITEM = 1.4; // plating time once tray matches (startCook)
export const STATION_COOK = 1.15; // seconds a station is busy per item
export const EAT_TIME = 2.6;
export const QUEUE_CAP = 4;
export const MAX_WAVE = 6;

const menuOf = (id) => MENU.find((m) => m.id === id);
const sameItems = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

export function tablesOpenForWave(wave) {
  // wave 1-2: 4, wave 3-4: 5, wave 5+: 6
  if (wave >= 5) return NUM_TABLES;
  if (wave >= 3) return TABLES_START + 1;
  return TABLES_START;
}

function mkTables() {
  return Array.from({ length: NUM_TABLES }, (_, i) => ({
    id: i + 1,
    orderId: null,
    dirty: false,
    dirtyAge: 0,
    open: i < TABLES_START,
  }));
}

export function newShift(rng) {
  return {
    time: SHIFT_LEN,
    orders: [],
    queue: [],
    tables: mkTables(),
    tray: [],
    stations: Object.fromEntries(STATIONS.map((st) => [st.id, { busy: 0, lastItem: null }])),
    served: 0,
    failed: 0,
    cleared: 0,
    earned: 0,
    tips: 0,
    spawnT: 0.5,
    nextId: 1,
    wave: 1,
    over: false,
    settled: false,
    combo: 0,
    maxCombo: 0,
    stars: 0, // live star rating 0-3 during shift
    selectedQueueId: null, // tap-to-seat selection
    vipServed: 0,
    specials: 0,
    events: [],
    pops: [], // floating tip / combo popups { id, text, kind, t, tip }
  };
}

function waveOf(s) {
  const elapsed = SHIFT_LEN - s.time;
  return 1 + Math.min(MAX_WAVE - 1, Math.floor(elapsed / 18));
}

function patienceFor(nItems, wave, vip) {
  const base = Math.max(9, 19 + nItems * 2.8 - (wave - 1) * 2.2);
  return vip ? base * 0.82 : base;
}

function spawnInterval(wave) {
  return Math.max(1.9, 4.0 - (wave - 1) * 0.38);
}

function freeTable(s) {
  return s.tables.find((t) => t.open && !t.orderId && !t.dirty) || null;
}

function dirtyCount(s) {
  return s.tables.filter((t) => t.dirty && t.open).length;
}

function pushEvent(s, kind, msg) {
  s.events.push({ kind, msg, t: 2.4 });
  if (s.events.length > 8) s.events.shift();
}

function pushPop(s, text, kind, tip = 0) {
  s.pops.push({ id: (s._popId = (s._popId || 0) + 1), text, kind, tip, t: 1.6 });
  if (s.pops.length > 10) s.pops.shift();
}

function syncStars(s) {
  // live stars from served vs walkouts + combo peak
  if (s.served >= 10 && s.failed <= 1 && s.maxCombo >= 5) s.stars = 3;
  else if (s.served >= 6 && s.failed <= 2) s.stars = 2;
  else if (s.served >= 3) s.stars = 1;
  else s.stars = 0;
}

function walkout(s, o, why) {
  s.failed++;
  s.combo = 0;
  syncStars(s);
  const tbl = s.tables.find((t) => t.id === o.table);
  if (tbl && tbl.orderId === o.id) { tbl.orderId = null; tbl.dirty = false; tbl.dirtyAge = 0; }
  s.orders = s.orders.filter((x) => x !== o);
  s.queue = s.queue.filter((x) => x !== o);
  if (s.selectedQueueId === o.id) s.selectedQueueId = null;
  pushEvent(s, 'walkout', `${o.customer} left (${why})`);
  pushPop(s, 'Walkout!', 'walkout');
}

function seatOne(s, o, table) {
  o.phase = 'seat';
  o.table = table.id;
  table.orderId = o.id;
  o.patience = Math.min(o.patience, o.max * 0.88);
  o.greetT = 0.55 + Math.random() * 0.4;
  if (s.selectedQueueId === o.id) s.selectedQueueId = null;
  pushEvent(s, 'seat', `Seated ${o.customer} at T${table.id}`);
}

function pickItems(rng, wave, vip) {
  // VIP / special: longer multi-station orders
  if (vip || rng() < 0.08 + wave * 0.015) {
    const bySt = { drink: MENU.filter((m) => m.station === 'drink'), grill: MENU.filter((m) => m.station === 'grill'), prep: MENU.filter((m) => m.station === 'prep') };
    const items = [rng.pick(bySt.drink).id, rng.pick(bySt.grill).id, rng.pick(bySt.prep).id];
    return { items, special: true };
  }
  const n = 1 + rng.int(rng() < 0.4 + wave * 0.07 ? 2 : 3);
  const items = Array.from({ length: n }, () => rng.pick(MENU).id);
  return { items, special: false };
}

function spawn(s, rng) {
  const wave = s.wave;
  const vip = rng() < 0.11 + wave * 0.02;
  const { items, special } = pickItems(rng, wave, vip);
  const max = patienceFor(items.length, wave, vip);
  const o = {
    id: s.nextId++,
    customer: vip ? rng.pick(VIP_NAMES) : rng.pick(CUSTOMERS),
    items,
    patience: max,
    max,
    phase: 'queue',
    table: null,
    cookT: 0,
    cookMax: 0,
    eatT: 0,
    greetT: 0,
    tagged: false,
    seat: null,
    vip: !!vip,
    special: !!special,
  };
  if (s.queue.length >= QUEUE_CAP) return;
  s.queue.push(o);
  s.orders.push(o);
  if (vip) pushEvent(s, 'vip', `VIP ${o.customer} in line!`);
  else if (special) pushEvent(s, 'special', `Special order incoming`);
}

/** Select a queued guest for tap-to-seat (mobile-friendly). */
export function selectQueue(s, orderId) {
  if (s.over) return { ok: false, reason: 'Shift over' };
  const o = s.queue.find((x) => x.id === orderId);
  if (!o) return { ok: false, reason: 'Not in line' };
  s.selectedQueueId = s.selectedQueueId === orderId ? null : orderId;
  return { ok: true, selected: s.selectedQueueId };
}

/** Auto-seat the head of the queue onto a free clean open table. Soft assist only. */
export function autoSeat(s) {
  if (s.over) return null;
  const tbl = freeTable(s);
  if (!tbl || !s.queue.length) return null;
  // Prefer selected guest if still in queue
  let o = s.selectedQueueId ? s.queue.find((x) => x.id === s.selectedQueueId) : null;
  if (!o) o = s.queue[0];
  s.queue = s.queue.filter((x) => x !== o);
  seatOne(s, o, tbl);
  return o;
}

/** Manually seat a queued customer onto a table. */
export function seatCustomer(s, orderId, tableId) {
  if (s.over) return { ok: false, reason: 'Shift over' };
  const o = s.queue.find((x) => x.id === orderId);
  const tbl = s.tables.find((t) => t.id === tableId);
  if (!o) return { ok: false, reason: 'Not in line' };
  if (!tbl || !tbl.open) return { ok: false, reason: 'Table locked' };
  if (tbl.orderId || tbl.dirty) return { ok: false, reason: tbl.dirty ? 'Clear dirty table first' : 'Table busy' };
  s.queue = s.queue.filter((x) => x !== o);
  seatOne(s, o, tbl);
  return { ok: true, order: o };
}

/** Seat the currently selected queue guest (or head of line) onto a table. */
export function seatSelected(s, tableId) {
  const id = s.selectedQueueId || s.queue[0]?.id;
  if (!id) return { ok: false, reason: 'Nobody in line' };
  return seatCustomer(s, id, tableId);
}

/** Take the order at a seated table (opens the ticket). */
export function takeOrder(s, orderId) {
  if (s.over) return { ok: false, reason: 'Shift over' };
  const o = s.orders.find((x) => x.id === orderId);
  if (!o || o.phase !== 'seat') return { ok: false, reason: 'No seated guest' };
  o.phase = 'order';
  o.greetT = 0;
  pushEvent(s, 'order', `${o.customer}: ${o.items.map((id) => menuOf(id)?.name || id).join(' + ')}`);
  return { ok: true, order: o };
}

export function tickShift(s, dt, rng) {
  if (s.over) return;
  s.time -= dt;
  s.wave = waveOf(s);
  const openN = tablesOpenForWave(s.wave);
  for (const t of s.tables) t.open = t.id <= openN;

  for (const e of s.events) e.t -= dt;
  s.events = s.events.filter((e) => e.t > 0);
  for (const p of s.pops) p.t -= dt;
  s.pops = s.pops.filter((p) => p.t > 0);

  // station timers
  for (const st of STATIONS) {
    const slot = s.stations[st.id];
    if (slot.busy > 0) {
      slot.busy -= dt;
      if (slot.busy <= 0) {
        slot.busy = 0;
        if (slot.pending) {
          if (s.tray.length < TRAY_MAX) s.tray.push(slot.pending);
          pushEvent(s, 'station', `${st.name}: ${menuOf(slot.pending)?.name || slot.pending} ready`);
          slot.lastItem = slot.pending;
          slot.pending = null;
        }
      }
    }
  }

  // dirty tables age and tax the floor
  const dirties = dirtyCount(s);
  for (const t of s.tables) {
    if (t.dirty) t.dirtyAge += dt;
  }

  // Soft auto-seat: only if a guest has waited ≥3.5s in line (player usually seats manually)
  for (const o of s.queue) {
    o._wait = (o._wait || 0) + dt;
  }
  while (s.queue.length && freeTable(s) && (s.queue[0]._wait || 0) >= 3.5) {
    if (!autoSeat(s)) break;
  }

  for (const o of [...s.orders]) {
    if (o.phase === 'eat') {
      o.eatT -= dt;
      if (o.eatT <= 0) {
        o.phase = 'dirty';
        const tbl = s.tables.find((t) => t.id === o.table);
        if (tbl) { tbl.dirty = true; tbl.dirtyAge = 0; }
        pushEvent(s, 'dirty', `T${o.table} needs clearing`);
      }
      continue;
    }
    if (o.phase === 'dirty') continue;
    if (o.phase === 'cook') {
      o.cookT -= dt;
      o.patience -= dt * 0.5;
      if (o.cookT <= 0) { o.phase = 'ready'; o.cookT = 0; pushEvent(s, 'ready', `${o.customer}'s order ready!`); pushPop(s, 'Ready!', 'ready'); }
    } else {
      // dirtier floor = faster patience drain
      const dirtTax = 1 + dirties * 0.18;
      const vipTax = o.vip && dirties > 0 ? 1.25 : 1;
      o.patience -= dt * dirtTax * vipTax;
    }
    if (o.phase === 'seat' && o.greetT > 0) {
      o.greetT -= dt;
      if (o.greetT <= 0) takeOrder(s, o.id);
    }
    if (o.patience <= 0) walkout(s, o, o.phase === 'queue' ? 'queue' : 'impatient');
  }

  s.spawnT -= dt;
  const activeTickets = s.orders.filter((o) => ['order', 'cook', 'ready'].includes(o.phase)).length;
  const cap = openN + QUEUE_CAP;
  if (s.spawnT <= 0 && activeTickets < MAX_ORDERS && s.orders.length < cap) {
    spawn(s, rng);
    s.spawnT = spawnInterval(s.wave);
  }
  if (s.time <= 0) { s.time = 0; s.over = true; }
}

/** Headless / tests: add item to tray without station (still validates menu id). */
export function addToTray(s, id) {
  if (s.over || s.tray.length >= TRAY_MAX || !menuOf(id)) return false;
  s.tray.push(id);
  return true;
}
export const clearTray = (s) => { s.tray = []; };

/**
 * Cook one menu item at its station. Station must match the item.
 * Item lands on the tray when the station finishes (or instantly if forceInstant for tests).
 * Prefer items still needed by an open 'order' ticket.
 */
export function cookAtStation(s, stationId, itemId, opts = {}) {
  if (s.over) return { ok: false, reason: 'Shift over' };
  const st = STATIONS.find((x) => x.id === stationId);
  if (!st) return { ok: false, reason: 'Unknown station' };
  const slot = s.stations[stationId];
  if (slot.busy > 0) return { ok: false, reason: `${st.name} busy` };
  if (s.tray.length >= TRAY_MAX) return { ok: false, reason: 'Tray full' };

  let id = itemId;
  if (!id) {
    // pick a needed item for this station from open tickets
    const need = [];
    for (const o of s.orders.filter((x) => x.phase === 'order')) {
      const have = [...s.tray];
      // also count pending at stations
      for (const sid of Object.keys(s.stations)) {
        if (s.stations[sid].pending) have.push(s.stations[sid].pending);
      }
      for (const it of o.items) {
        const m = menuOf(it);
        if (m?.station !== stationId) continue;
        const idx = have.indexOf(it);
        if (idx >= 0) have.splice(idx, 1);
        else need.push(it);
      }
    }
    id = need[0];
    if (!id) {
      // fallback: any menu item at this station
      const any = MENU.find((m) => m.station === stationId);
      id = any?.id;
    }
  }
  const m = menuOf(id);
  if (!m) return { ok: false, reason: 'Unknown item' };
  if (m.station !== stationId) return { ok: false, reason: `Use the ${m.station} station` };

  if (opts.instant) {
    s.tray.push(id);
    slot.lastItem = id;
    pushEvent(s, 'station', `${st.name}: ${m.name}`);
    return { ok: true, item: id, instant: true };
  }
  slot.busy = STATION_COOK;
  slot.pending = id;
  pushEvent(s, 'cook', `${st.name} cooking ${m.name}…`);
  return { ok: true, item: id, busy: STATION_COOK };
}

/** Start plating when the tray matches a ticket in 'order' phase. */
export function startCook(s, orderId) {
  const o = s.orders.find((x) => x.id === orderId);
  if (!o || s.over) return { ok: false, reason: 'No order' };
  if (o.phase !== 'order') return { ok: false, reason: o.phase === 'cook' ? 'Already cooking' : 'Not ready to cook' };
  if (!sameItems(o.items, s.tray)) { s.tray = []; return { ok: false, reason: 'Wrong order!' }; }
  o.phase = 'cook';
  o.cookMax = COOK_PER_ITEM * o.items.length;
  o.cookT = o.cookMax;
  s.tray = [];
  pushEvent(s, 'cook', `Plating for ${o.customer}…`);
  return { ok: true, cookT: o.cookT };
}

/**
 * Serve a ready order. Tray-match on 'order' still works for headless/tests (instant cook+serve).
 */
export function serve(s, orderId) {
  const o = s.orders.find((x) => x.id === orderId);
  if (!o || s.over) return { ok: false, reason: 'No order' };

  if (o.phase === 'order') {
    if (!sameItems(o.items, s.tray)) { s.tray = []; return { ok: false, reason: 'Wrong order!' }; }
    s.tray = [];
    o.phase = 'ready';
    o.cookT = 0;
  }
  if (o.phase === 'cook') return { ok: false, reason: 'Still cooking…' };
  if (o.phase !== 'ready') return { ok: false, reason: 'Not ready to serve' };

  const tipFrac = Math.max(0, o.patience / o.max);
  const base = 6 * o.items.length + (o.special ? 4 : 0) + (o.vip ? 6 : 0);
  const comboBonus = Math.min(12, Math.floor(s.combo / 2) * 2);
  const tip = Math.round(
    8 * tipFrac
    + comboBonus
    + (s.wave > 2 ? 1 : 0)
    + (o.vip ? 6 * tipFrac : 0)
    + (o.special ? 3 : 0),
  );
  const pay = base + tip;
  s.earned += pay;
  s.tips += tip;
  s.served++;
  s.combo++;
  s.maxCombo = Math.max(s.maxCombo, s.combo);
  if (o.vip) s.vipServed++;
  if (o.special) s.specials++;
  syncStars(s);
  o.phase = 'eat';
  o.eatT = EAT_TIME;
  const comboTxt = s.combo >= 2 ? ` · x${s.combo}` : '';
  pushEvent(s, 'serve', `+${pay} Bones · tip ${tip}${comboTxt}`);
  pushPop(s, `+${tip} tip!${comboTxt}`, 'tip', tip);
  if (s.combo === 3 || s.combo === 5 || s.combo === 8) pushPop(s, `COMBO x${s.combo}!`, 'combo');
  if (o.vip) pushPop(s, 'VIP served!', 'vip');
  return { ok: true, pay, tip, base, combo: s.combo };
}

/** Clear a dirty table. Bonus scales with how long it sat dirty + combo. Dirt taxes the floor until cleared. */
export function clearTable(s, orderId) {
  const o = s.orders.find((x) => x.id === orderId);
  if (!o || o.phase !== 'dirty') return { ok: false, reason: 'Nothing to clear' };
  const tbl = s.tables.find((t) => t.id === o.table);
  const age = tbl?.dirtyAge || 0;
  const bonus = Math.min(14, 3 + Math.floor(age * 0.7) + (s.combo >= 2 ? 2 : 0) + (dirtyCount(s) >= 2 ? 2 : 0));
  s.earned += bonus;
  s.cleared++;
  if (tbl) { tbl.orderId = null; tbl.dirty = false; tbl.dirtyAge = 0; }
  s.orders = s.orders.filter((x) => x !== o);
  pushEvent(s, 'clear', `Table cleared · +${bonus}`);
  pushPop(s, `+${bonus} tidy`, 'clear', bonus);
  return { ok: true, pay: bonus };
}

export function finishShift(state, s) {
  if (s.settled) return 0;
  const starPay = s.stars >= 3 ? 40 : s.stars >= 2 ? 25 : s.stars >= 1 ? 12 : (s.served >= 4 ? 8 : 0);
  const comboBonus = Math.min(28, Math.floor((s.maxCombo || 0) / 3) * 5);
  const vipBonus = Math.min(20, (s.vipServed || 0) * 5);
  const clearBonus = Math.min(12, Math.floor((s.cleared || 0) / 3) * 3);
  const total = s.earned + starPay + comboBonus + vipBonus + clearBonus;
  const earned = earnBones(state, total);
  state.stats.shifts++;
  state.stats.served += s.served;
  s.over = true;
  s.star = starPay;
  s.comboBonus = comboBonus;
  s.vipBonus = vipBonus;
  s.clearBonus = clearBonus;
  s.paid = earned.total;
  s.settled = true;
  s.summary = {
    served: s.served,
    walkouts: s.failed,
    cleared: s.cleared,
    tips: s.tips,
    star: starPay,
    stars: s.stars,
    comboBonus,
    vipBonus,
    clearBonus,
    maxCombo: s.maxCombo,
    wave: s.wave,
    vipServed: s.vipServed,
    specials: s.specials,
    total: earned.total,
  };
  return earned.total;
}

/** Active tickets the barista still needs to cook/serve. */
export function openTickets(s) {
  return s.orders.filter((o) => ['order', 'cook', 'ready'].includes(o.phase));
}

/** Items still needed on tray for a ticket (by station). */
export function neededByStation(s, orderId) {
  const o = s.orders.find((x) => x.id === orderId);
  if (!o) return {};
  const have = [...s.tray];
  for (const sid of Object.keys(s.stations || {})) {
    if (s.stations[sid]?.pending) have.push(s.stations[sid].pending);
  }
  const need = { drink: [], grill: [], prep: [] };
  for (const it of o.items) {
    const idx = have.indexOf(it);
    if (idx >= 0) { have.splice(idx, 1); continue; }
    const m = menuOf(it);
    if (m && need[m.station]) need[m.station].push(it);
  }
  return need;
}

import { earnBones } from './outfits.js';
export const MENU = [
  { id: 'latte', name: 'Pup Latte' },
  { id: 'biscuit', name: 'Bone Biscuit' },
  { id: 'berry', name: 'Berry Bowl' },
  { id: 'cake', name: 'Sakura Cake' },
  { id: 'tea', name: 'Matcha Tea' },
];
const CUSTOMERS = ['Mochi', 'Kuro', 'Hana', 'Taro', 'Yuzu', 'Kiki', 'Goma', 'Sora', 'Azuki', 'Pochi'];
export const SHIFT_LEN = 60, MAX_ORDERS = 3, TRAY_MAX = 4;

export function newShift(rng) {
  const s = { time: SHIFT_LEN, orders: [], tray: [], served: 0, failed: 0, earned: 0, spawnT: 0.3, nextId: 1, over: false };
  return s;
}

function spawn(s, rng) {
  const n = 1 + rng.int(rng() < 0.5 ? 2 : 3);
  const items = Array.from({ length: n }, () => rng.pick(MENU).id);
  const patience = 18 + n * 4;
  s.orders.push({ id: s.nextId++, customer: rng.pick(CUSTOMERS), items, patience, max: patience });
}

export function tickShift(s, dt, rng) {
  if (s.over) return;
  s.time -= dt;
  for (const o of s.orders) o.patience -= dt;
  const before = s.orders.length;
  s.orders = s.orders.filter((o) => o.patience > 0);
  s.failed += before - s.orders.length;
  s.spawnT -= dt;
  if (s.spawnT <= 0 && s.orders.length < MAX_ORDERS) { spawn(s, rng); s.spawnT = 3.5; }
  if (s.time <= 0) { s.time = 0; s.over = true; }
}

export function addToTray(s, id) {
  if (s.over || s.tray.length >= TRAY_MAX || !MENU.find((m) => m.id === id)) return false;
  s.tray.push(id); return true;
}
export const clearTray = (s) => { s.tray = []; };

const sameItems = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

export function serve(s, orderId) {
  const o = s.orders.find((x) => x.id === orderId);
  if (!o || s.over) return { ok: false, reason: 'No order' };
  if (!sameItems(o.items, s.tray)) { s.tray = []; return { ok: false, reason: 'Wrong order!' }; }
  const pay = 8 * o.items.length + Math.round(6 * (o.patience / o.max));
  s.earned += pay; s.served++; s.tray = [];
  s.orders = s.orders.filter((x) => x !== o);
  return { ok: true, pay };
}

export function finishShift(state, s) {
  if (s.settled) return 0; // idempotent: a shift is paid (and counted) exactly once, even if it paid 0
  const bonus = s.served >= 5 ? 25 : 0;
  const total = s.earned + bonus;
  const earned = earnBones(state, total); state.stats.shifts++; state.stats.served += s.served;
  s.over = true; s.paid = earned.total; s.settled = true;
  return earned.total;
}

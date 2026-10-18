// Daily login streak, counted in Australia/Sydney calendar days (real days, not in-game days).
// Wallet connected + signed in -> the streak lives on kibble-pay (/api/game?action=streak), keyed by wallet: one count per wallet
//   per Sydney day on SERVER time, rate-limited; the result is also kept in the save (which syncs to the wallet cloud save).
// No wallet -> device-only: counted on this device's clock in this save, and labelled "device-only" everywhere it shows.
// Migration: the old device streak (fly5 streak, in-game days) carries over so nobody loses progress, capped at the number of real
//   Sydney days since that streak launched (2026-10-15); the server applies the same cap once per wallet.
// Rewards are cosmetic pins only (original art in streakart.js): no Bones, no $KIBBLE.
export const TZ = 'Australia/Sydney', GAME = 'inu-verse', LAUNCH = '2026-10-15';
export const MILESTONES = [7, 30, 90, 180];
export const PINS = Object.freeze({
  7: { id: 'pin_paw', name: 'Bronze Paw Pin', about: '7-day login streak' },
  30: { id: 'pin_bone', name: 'Silver Bone Pin', about: '30-day login streak' },
  90: { id: 'pin_sun', name: 'Golden Sun Pin', about: '90-day login streak' },
  180: { id: 'pin_sakura', name: 'Sakura Crown Pin', about: '180-day login streak' },
});
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
export const sydneyDay = (now = Date.now()) => fmt.format(new Date(now)); // YYYY-MM-DD
export const dayNum = (ymd) => Math.round(Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10)) / 864e5);
export const migrateCap = (today) => Math.max(1, dayNum(today) - dayNum(LAUNCH) + 1);
export const unlockedFor = (best) => MILESTONES.filter((m) => best >= m);
export const nextMilestone = (count) => MILESTONES.find((m) => m > count) || null;

/** Create (and migrate into) s.loginStreak. Pure apart from mutating s. */
export function ensureStreak(s, now = Date.now()) {
  if (s.loginStreak?.v === 1) return s.loginStreak;
  const old = s.fly5?.streak, today = sydneyDay(now), dev = Math.max(0, Math.floor(old?.count || 0)), granted = Math.min(dev, migrateCap(today));
  s.loginStreak = { v: 1, count: granted, best: granted, last: granted ? today : null, source: 'device', wallet: null, unlocked: unlockedFor(granted), pin: null,
    migrated: dev ? { from: 'device streak (in-game days)', device: dev, granted } : null, syncedAt: null };
  return s.loginStreak;
}
const step = (L, today) => { if (L.last === today) return false; const gap = L.last ? dayNum(today) - dayNum(L.last) : 99; L.count = gap === 1 ? L.count + 1 : 1; L.best = Math.max(L.best, L.count); L.last = today; return true; };
const merge = (a, b) => [...new Set([...(a || []), ...(b || [])])].filter((m) => MILESTONES.includes(m)).sort((x, y) => x - y);

/** Device-only check-in (no wallet): once per Sydney day on this device's clock. Returns { counted, newPins }. */
export function deviceCheckIn(s, now = Date.now()) {
  const L = ensureStreak(s, now); if (L.source === 'wallet') return { counted: false, newPins: [], skipped: 'wallet' };
  const before = L.unlocked.slice(), counted = step(L, sydneyDay(now)); L.unlocked = merge(L.unlocked, unlockedFor(L.best));
  return { counted, newPins: L.unlocked.filter((m) => !before.includes(m)) };
}
/** Apply the server record (authoritative for this wallet). */
export function applyServer(s, r, wallet, now = Date.now()) {
  const L = ensureStreak(s, now), before = L.unlocked.slice();
  Object.assign(L, { source: 'wallet', wallet, count: Math.max(0, r.count | 0), best: Math.max(0, r.best | 0), last: r.last || null, syncedAt: now });
  if (r.migrated) L.migrated = { ...(L.migrated || {}), server: r.migrated };
  L.unlocked = merge(L.unlocked, r.unlocked || unlockedFor(L.best));
  return { counted: !!r.counted, newPins: L.unlocked.filter((m) => !before.includes(m)) };
}
/** Signed-in check-in through the kibble-pay SDK. The client sends no date: the server decides the Sydney day. */
export async function walletCheckIn(s, kp, now = Date.now()) {
  const L = ensureStreak(s, now), seed = L.source === 'device' ? L.count : 0;
  const r = kp.checkIn ? await kp.checkIn(GAME, seed) : await kp._req('/api/game?action=streak', { game: GAME, seed });
  return applyServer(s, r, kp.address, now);
}
/** Signed out after a wallet session: the streak stays on the wallet; this save goes back to device-only from the wallet's count. */
export function toDevice(s) { const L = s.loginStreak; if (L?.source === 'wallet') { L.source = 'device'; L.wallet = null; } return L; }
export function equipPin(s, tier) { const L = ensureStreak(s); if (tier != null && !L.unlocked.includes(+tier)) return { ok: false, reason: 'Not unlocked yet' }; L.pin = tier == null ? null : +tier; return { ok: true }; }
export function view(s, now = Date.now()) {
  const L = ensureStreak(s, now), today = sydneyDay(now), alive = L.last && dayNum(today) - dayNum(L.last) <= 1, count = alive ? L.count : 0;
  return { count, best: L.best, today, doneToday: L.last === today, wallet: L.source === 'wallet', label: L.source === 'wallet' ? 'saved to wallet' : 'device-only', next: nextMilestone(count),
    pins: MILESTONES.map((m) => ({ tier: m, ...PINS[m], got: L.unlocked.includes(m), worn: L.pin === m })), pin: L.pin, migrated: L.migrated };
}

// Login streak: Sydney days, device-only mode, migration from the old device streak, wallet sync (server authoritative), cosmetic pins only.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import * as LS from '../src/loginstreak.js'; import * as LSUI from '../src/streakui.js';
const at = (iso) => Date.parse(iso), D = 864e5;
test('Sydney day: 12:59 UTC on the 19th is the 19th, 13:00 UTC is the 20th (AEDT)', () => {
  assert.equal(LS.sydneyDay(at('2026-10-19T12:59:59Z')), '2026-10-19'); assert.equal(LS.sydneyDay(at('2026-10-19T13:00:00Z')), '2026-10-20'); });
test('migration: the old device streak carries over, capped at real Sydney days since launch; nothing lost', () => {
  const s = { fly5: { streak: { day: 40, count: 3, claimed30: false } } }; LS.ensureStreak(s, at('2026-10-19T02:00:00Z'));
  assert.equal(s.loginStreak.count, 3); assert.equal(s.loginStreak.last, '2026-10-19'); assert.deepEqual(s.loginStreak.migrated, { from: 'device streak (in-game days)', device: 3, granted: 3 });
  const big = { fly5: { streak: { count: 42 } } }; LS.ensureStreak(big, at('2026-10-19T02:00:00Z')); assert.equal(big.loginStreak.count, 5, '42 in-game days in 5 real days -> 5');
  const none = {}; LS.ensureStreak(none, at('2026-10-19T02:00:00Z')); assert.equal(none.loginStreak.count, 0); assert.equal(none.loginStreak.migrated, null);
  assert.equal(LS.ensureStreak(s).count, 3, 'migration runs once');
});
test('device-only: one count per Sydney day, consecutive days add, a gap restarts, no pins from device-only days', () => {
  const s = {}; let t = at('2026-11-01T01:00:00Z');
  assert.equal(LS.deviceCheckIn(s, t).counted, true); assert.equal(LS.deviceCheckIn(s, t + 3600e3 * 8).counted, false);
  let r; for (let d = 1; d < 7; d++) r = LS.deviceCheckIn(s, t + d * D); assert.equal(s.loginStreak.count, 7); assert.deepEqual(r.newPins, [], 'device-only days earn no pins');
  LS.deviceCheckIn(s, t + 9 * D); assert.equal(s.loginStreak.count, 1); assert.equal(s.loginStreak.best, 7); assert.deepEqual(s.loginStreak.unlocked, []); assert.deepEqual(s.loginStreak.devicePins, []);
  const v = LS.view(s, t + 9 * D); assert.equal(v.label, 'device-only'); assert.equal(v.wallet, false); assert.equal(v.next, null); assert.equal(v.pinsNeedWallet, true);
  assert.match(LSUI.streakHtml(s), /wallet-verified days only/);
  assert.match(LSUI.streakHtml(s), /Device-only/); assert.match(LSUI.chipHtml(s), /device/);
});
test('wallet: sends the device count as the one-time seed, no date; server record wins; device mode again after sign-out', async () => {
  const s = { fly5: { streak: { count: 4 } } }; LS.ensureStreak(s, at('2026-10-19T02:00:00Z')); const calls = [];
  const kp = { address: 'Wal1etXYZ', async checkIn(game, seed) { calls.push([game, seed]); return { ok: true, counted: true, count: 4, best: 31, last: '2026-10-19', unlocked: [7, 30], migrated: { device: 4, granted: 4 } }; } };
  const r = await LS.walletCheckIn(s, kp, at('2026-10-19T03:00:00Z')); assert.deepEqual(calls, [['inu-verse', 4]]); assert.deepEqual(r.newPins, [7, 30]);
  assert.equal(s.loginStreak.source, 'wallet'); assert.equal(s.loginStreak.wallet, 'Wal1etXYZ'); assert.equal(LS.view(s, at('2026-10-19T03:00:00Z')).label, 'saved to wallet');
  await LS.walletCheckIn(s, kp, at('2026-10-19T04:00:00Z')); assert.deepEqual(calls[1], ['inu-verse', 0], 'no seed once the wallet owns the streak');
  assert.equal(LS.deviceCheckIn(s).skipped, 'wallet'); LS.toDevice(s); assert.equal(s.loginStreak.source, 'device'); assert.equal(s.loginStreak.count, 4, 'keeps progress');
  assert.equal(LS.equipPin(s, 30).ok, false, 'wallet pins are not device pins once signed out'); assert.equal(LS.view(s).pins.filter((p) => p.got).length, 0);
  await LS.walletCheckIn(s, kp, at('2026-10-19T05:00:00Z')); assert.equal(LS.equipPin(s, 90).ok, false); assert.equal(LS.equipPin(s, 30).ok, true); assert.equal(LS.wornPin(s), 30);
});
test('wallet-only pins: device-earned pins stay device-only on the device and never carry over onto a wallet', async () => {
  // a pre-rule device save with 7 + 30 device pins (worn 30)
  const s = { loginStreak: { v: 1, count: 31, best: 31, last: '2026-10-19', source: 'device', wallet: null, unlocked: [7, 30], pin: 30, migrated: null, syncedAt: null } };
  let v = LS.view(s, at('2026-10-19T03:00:00Z')); assert.deepEqual(s.loginStreak.devicePins, [7, 30]); assert.deepEqual(s.loginStreak.unlocked, []);
  assert.equal(v.label, 'device-only'); assert.deepEqual(v.pins.filter((p) => p.got).map((p) => [p.tier, p.deviceOnly]), [[7, true], [30, true]]); assert.equal(LS.wornPin(s), 30);
  assert.match(LSUI.streakHtml(s), /device-only/); assert.match(LSUI.profileCardHtml(s), /\(device-only\)/); assert.match(LSUI.chipHtml(s), /device/);
  // more device-only days: still no new pins
  assert.deepEqual(LS.deviceCheckIn(s, at('2026-10-20T03:00:00Z')).newPins, []); assert.equal(s.loginStreak.count, 32);
  // sign in: the server knows 3 wallet-verified days and no pins -> wallet shows NO pins, device pin taken off; server list is used as-is
  const calls = [], kp = { address: 'Wal1etABC', async checkIn(g, seed) { calls.push(seed); return { ok: true, counted: true, count: 3, best: 3, last: '2026-10-20', unlocked: [] }; } };
  const r = await LS.walletCheckIn(s, kp, at('2026-10-20T04:00:00Z')); assert.deepEqual(r.newPins, []); assert.deepEqual(s.loginStreak.unlocked, []);
  v = LS.view(s, at('2026-10-20T04:00:00Z')); assert.equal(v.wallet, true); assert.equal(v.pins.filter((p) => p.got).length, 0); assert.equal(LS.wornPin(s), null); assert.equal(LS.equipPin(s, 7).ok, false);
  assert.equal(calls[0], 32, 'the existing one-time capped migration seed is unchanged (server caps + applies it once)');
  // a server reply without an unlocked list falls back to the server's VERIFIED best only (never the displayed best)
  LS.applyServer(s, { count: 8, best: 8, last: '2026-10-21' }, 'Wal1etABC'); assert.deepEqual(s.loginStreak.unlocked, []);
  LS.applyServer(s, { count: 8, best: 8, verifiedCount: 8, verifiedBest: 8, last: '2026-10-21' }, 'Wal1etABC'); assert.deepEqual(s.loginStreak.unlocked, [7]);
  // sign out: back to device-only with the device's own pins; the wallet's pin does not follow
  LS.toDevice(s); assert.deepEqual(LS.pinsHere(s), [7, 30]); assert.equal(LS.view(s).label, 'device-only');
  // a pre-rule wallet save (merged list may hold device pins): dropped until kibble-pay answers
  const w = { loginStreak: { v: 1, count: 2, best: 2, last: '2026-10-19', source: 'wallet', wallet: 'W2', unlocked: [7, 30], pin: 7, migrated: null } };
  assert.deepEqual(LS.pinsHere(w), []); assert.equal(LS.wornPin(w), null);
});
test('migration counts toward the DISPLAYED streak, not toward pins (pins from wallet-verified days only)', async () => {
  const s = { fly5: { streak: { count: 40 } } }, now = at('2026-11-30T02:00:00Z'); LS.ensureStreak(s, now); assert.equal(s.loginStreak.count, 40, 'device migration shows in full (cap 47)');
  assert.equal(LS.view(s, now).count, 40); assert.equal(LS.view(s, now).pins.filter((p) => p.got).length, 0, 'no pins from migrated days on the device');
  // kibble-pay reply after the first wallet check-in: 40 migrated -> displayed 40, verified 1, no pins (server shape from api/_lib/loginstreak.js)
  const kp = { address: 'Wal1etMIG', async checkIn() { return { ok: true, counted: true, count: 40, best: 40, verifiedCount: 1, verifiedBest: 1, last: '2026-11-30', unlocked: [], migrated: { device: 40, granted: 40 } }; } };
  const r = await LS.walletCheckIn(s, kp, now); assert.deepEqual(r.newPins, []);
  const v = LS.view(s, now); assert.equal(v.count, 40); assert.equal(v.verified, 1); assert.equal(v.next, 7); assert.equal(v.pins.filter((p) => p.got).length, 0);
  const html = LSUI.streakHtml(s); assert.match(html, /Login streak: 40 days/); assert.match(html, /Next pin at 7 wallet-verified days \(6 to go\)/); assert.match(html, /1 of these 40 days are wallet-verified/);
  // 6 more real days: the server unlocks the 7-day pin from verified days
  LS.applyServer(s, { counted: true, count: 46, best: 46, verifiedCount: 7, verifiedBest: 7, last: '2026-12-06', unlocked: [7] }, 'Wal1etMIG', at('2026-12-06T02:00:00Z'));
  assert.deepEqual(s.loginStreak.unlocked, [7]); assert.equal(LS.view(s, at('2026-12-06T02:00:00Z')).next, 30);
});
test('daily Bones claim is untouched by the streak pin rule', () => {
  const src = fs.readFileSync('src/loginstreak.js', 'utf8'); assert.doesNotMatch(src, /fly5\.streak\.(claimed|count\s*=)/);
});
test('rewards are cosmetic pins only, original art exists for each; HUD chip, profile card and streak tab are wired', () => {
  assert.deepEqual(LS.MILESTONES, [7, 30, 90, 180]); for (const m of LS.MILESTONES) assert.ok(LS.PINS[m].name);
  const src = fs.readFileSync('src/loginstreak.js', 'utf8').replace(/^\s*\/\/.*$/gm, ''); assert.doesNotMatch(src, /bones\s*[+-]?=|kibble\s*[+-]?=|\.bones\b|\.kibble\b/i);
  const art = fs.readFileSync('src/streakart.js', 'utf8'); for (const m of LS.MILESTONES) assert.match(art, new RegExp(`\\b${m}: \\{ pal:`));
  const main = fs.readFileSync('src/main.js', 'utf8'), html = fs.readFileSync('index.html', 'utf8'), ui = fs.readFileSync('src/fly5ui.js', 'utf8');
  assert.match(html, /id="streak-chip"/); assert.match(main, /LSUI\.chipHtml\(state\)/); assert.match(main, /LSUI\.profileCardHtml\(state\)/); assert.match(ui, /LSUI\.streakHtml/);
  assert.match(main, /kp\?\.signedIn\) \{ try \{ r = await LS\.walletCheckIn/); assert.match(main, /drawWornPin/);
});

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
test('device-only: one count per Sydney day, consecutive days add, a gap restarts, pins at 7/30/90/180', () => {
  const s = {}; let t = at('2026-11-01T01:00:00Z');
  assert.equal(LS.deviceCheckIn(s, t).counted, true); assert.equal(LS.deviceCheckIn(s, t + 3600e3 * 8).counted, false);
  let r; for (let d = 1; d < 7; d++) r = LS.deviceCheckIn(s, t + d * D); assert.equal(s.loginStreak.count, 7); assert.deepEqual(r.newPins, [7]);
  LS.deviceCheckIn(s, t + 9 * D); assert.equal(s.loginStreak.count, 1); assert.equal(s.loginStreak.best, 7); assert.deepEqual(s.loginStreak.unlocked, [7]);
  const v = LS.view(s, t + 9 * D); assert.equal(v.label, 'device-only'); assert.equal(v.wallet, false); assert.equal(v.next, 7);
  assert.match(LSUI.streakHtml(s), /Device-only/); assert.match(LSUI.chipHtml(s), /device/);
});
test('wallet: sends the device count as the one-time seed, no date; server record wins; device mode again after sign-out', async () => {
  const s = { fly5: { streak: { count: 4 } } }; LS.ensureStreak(s, at('2026-10-19T02:00:00Z')); const calls = [];
  const kp = { address: 'Wal1etXYZ', async checkIn(game, seed) { calls.push([game, seed]); return { ok: true, counted: true, count: 4, best: 31, last: '2026-10-19', unlocked: [7, 30], migrated: { device: 4, granted: 4 } }; } };
  const r = await LS.walletCheckIn(s, kp, at('2026-10-19T03:00:00Z')); assert.deepEqual(calls, [['inu-verse', 4]]); assert.deepEqual(r.newPins, [7, 30]);
  assert.equal(s.loginStreak.source, 'wallet'); assert.equal(s.loginStreak.wallet, 'Wal1etXYZ'); assert.equal(LS.view(s, at('2026-10-19T03:00:00Z')).label, 'saved to wallet');
  await LS.walletCheckIn(s, kp, at('2026-10-19T04:00:00Z')); assert.deepEqual(calls[1], ['inu-verse', 0], 'no seed once the wallet owns the streak');
  assert.equal(LS.deviceCheckIn(s).skipped, 'wallet'); LS.toDevice(s); assert.equal(s.loginStreak.source, 'device'); assert.equal(s.loginStreak.count, 4, 'keeps progress');
  assert.equal(LS.equipPin(s, 90).ok, false); assert.equal(LS.equipPin(s, 30).ok, true); assert.equal(s.loginStreak.pin, 30);
});
test('rewards are cosmetic pins only, original art exists for each; HUD chip, profile card and streak tab are wired', () => {
  assert.deepEqual(LS.MILESTONES, [7, 30, 90, 180]); for (const m of LS.MILESTONES) assert.ok(LS.PINS[m].name);
  const src = fs.readFileSync('src/loginstreak.js', 'utf8').replace(/^\s*\/\/.*$/gm, ''); assert.doesNotMatch(src, /bones\s*[+-]?=|kibble\s*[+-]?=|\.bones\b|\.kibble\b/i);
  const art = fs.readFileSync('src/streakart.js', 'utf8'); for (const m of LS.MILESTONES) assert.match(art, new RegExp(`\\b${m}: \\{ pal:`));
  const main = fs.readFileSync('src/main.js', 'utf8'), html = fs.readFileSync('index.html', 'utf8'), ui = fs.readFileSync('src/fly5ui.js', 'utf8');
  assert.match(html, /id="streak-chip"/); assert.match(main, /LSUI\.chipHtml\(state\)/); assert.match(main, /LSUI\.profileCardHtml\(state\)/); assert.match(ui, /LSUI\.streakHtml/);
  assert.match(main, /kp\?\.signedIn\) \{ try \{ r = await LS\.walletCheckIn/); assert.match(main, /drawWornPin/);
});

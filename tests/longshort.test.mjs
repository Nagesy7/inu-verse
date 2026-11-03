import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as LS from '../src/longshort.js';

const K = LS.KIBBLE_MINT, SPON = '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump';
const coin = (mint = K, extra = {}) => ({ mint, symbol: 'KIBBLE', ...extra });

test('longshort: $KIBBLE always first, 4 coins + sponsored slot, open slot has no mint', () => {
  const l = LS.lineupFor();
  assert.equal(l[0].mint, K); assert.equal(l.length, 5);
  assert.equal(l[4].sponsored, true); assert.equal(l[4].open, true); assert.equal(l[4].mint, null);
  assert.equal(LS.lineupFor(undefined, LS.LINEUP.slice(1))[0].mint, K, 'KIBBLE re-added if missing from config');
});
test('longshort: sponsored slot shows only that exact mint (strict pairing), bad mint = open slot', () => {
  const s = LS.sponsorCoin({ mint: SPON }); assert.equal(s.mint, SPON); assert.equal(s.open, false);
  assert.equal(LS.sponsorCoin({ mint: 'not a mint!' }).open, true);
  const pairs = [{ baseToken: { address: 'OTHERxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', symbol: 'FAKE' }, priceUsd: '9', liquidity: { usd: 1e9 } },
    { baseToken: { address: SPON, symbol: 'SP' }, priceUsd: '0.5', liquidity: { usd: 10 } }, { baseToken: { address: SPON, symbol: 'SP' }, priceUsd: '0.6', liquidity: { usd: 500 } }];
  assert.equal(LS.pickPair(pairs, SPON).price, 0.6, 'deepest pool of the exact mint');
  assert.equal(LS.pickPair(pairs.slice(0, 1), SPON), null, 'never falls back to another token');
});
test('longshort: correct calls score Bones with the streak multiplier; miss resets; flat is a push', () => {
  const st = LS.emptyState(), t0 = Date.UTC(2026, 10, 3, 1);
  const a = LS.makeCall(st, { coin: coin(), side: 'long', win: '1h', price: 1, now: t0 });
  assert.throws(() => LS.makeCall(st, { coin: coin(), side: 'short', win: '1h', price: 1, now: t0 }), /already/);
  LS.resolveCall(st, a, 2, t0 + 1000); assert.equal(a.result, undefined, 'not before window end');
  LS.resolveCall(st, a, 1.1, t0 + 3600_000); assert.equal(a.result, 'win'); assert.equal(a.bones, 10); assert.equal(st.streak, 1);
  const b = LS.makeCall(st, { coin: coin(), side: 'short', win: '24h', price: 1, now: t0 });
  LS.resolveCall(st, b, 0.9, t0 + 86_400_000); assert.equal(b.bones, Math.round(25 * 1.25)); assert.equal(st.streak, 2);
  const c = LS.makeCall(st, { coin: coin(), side: 'long', win: '1h', price: 1, now: t0 + 2 });
  LS.resolveCall(st, c, 1, t0 + 2 + 3600_000); assert.equal(c.result, 'push'); assert.equal(st.streak, 2);
  const d = LS.makeCall(st, { coin: coin(), side: 'long', win: '1h', price: 1, now: t0 + 3 });
  LS.resolveCall(st, d, 0.5, t0 + 3 + 3600_000); assert.equal(d.result, 'miss'); assert.equal(d.bones, 0); assert.equal(st.streak, 0); assert.equal(st.bestStreak, 2);
  assert.equal(LS.multiplier(100), 3);
});
test('longshort: debug window only with debug flag; no price = no call', () => {
  const st = LS.emptyState();
  assert.throws(() => LS.makeCall(st, { coin: coin(), side: 'long', win: '20s', price: 1 }), /unknown window/);
  assert.equal(LS.makeCall(st, { coin: coin(), side: 'long', win: '20s', price: 1, debug: true, now: 0 }).endsAt, 20_000);
  assert.throws(() => LS.makeCall(st, { coin: coin('x'), side: 'long', win: '1h', price: 0 }), /price/);
  assert.throws(() => LS.makeCall(st, { coin: coin('x'), side: 'up', win: '1h', price: 1 }), /side/);
});
test('longshort: daily / weekly boards and hall of fame', () => {
  const st = LS.emptyState(); st.name = 'Zed'; const mon = Date.UTC(2026, 10, 2, 5), tue = Date.UTC(2026, 10, 3, 5);
  st.calls.push({ result: 'win', bones: 40, resolvedAt: mon }, { result: 'win', bones: 15, resolvedAt: tue }); st.bestStreak = 12;
  assert.equal(LS.bonesIn(st, 'day', tue), 15); assert.equal(LS.bonesIn(st, 'week', tue), 55);
  assert.equal(LS.weekKey(Date.UTC(2026, 10, 8, 23)), '2026-11-02');
  const hof = LS.board(st, 'hof', tue); assert.equal(hof[0].me, true); assert.equal(hof[0].name, 'Zed');
});
test('longshort: page carries the legal copy, no stake/wager flow, sponsor + For devs paid link', () => {
  const html = readFileSync(new URL('../long-or-short.html', import.meta.url), 'utf8');
  assert.match(html, /Free to play\. Not financial advice\. No purchase or stake needed\./);
  assert.match(html, /Top weekly callers may win Kennel Chest prizes that are reviewed and paid by hand/);
  assert.match(html, /data-paid="for-devs" data-paid-from="longshort-sponsor"/);
  assert.match(html, /0\.3 SOL/); assert.equal(LS.SPONSOR_CHEST, '7rPVPVBi8sDAcLNkEK6zdEnreeK3SV56ARaXzhnRUNRg');
  assert.doesNotMatch(html + readFileSync(new URL('../src/longshort.js', import.meta.url), 'utf8'), /signTransaction|sendTransaction|wager amount|place bet/i);
});

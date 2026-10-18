import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import * as KM from '../src/kibblemood.js';
import { makeHandler, changeFrom, addSample, parseCurve, KEY, HIST } from '../api/kibble-mood.js';
import { memoryKv } from '../api/_lib/kv.js';

test('mood thresholds on the 1h change (no 24h data)', () => {
  const c = (h1) => KM.classify(h1, null);
  assert.equal(c(15), 'zoomies'); assert.equal(c(40), 'zoomies'); assert.equal(c(14.99), 'happy'); assert.equal(c(3), 'happy');
  assert.equal(c(2.99), 'chill'); assert.equal(c(0), 'chill'); assert.equal(c(-2.99), 'chill'); assert.equal(c(-3), 'grumpy');
  assert.equal(c(-14.99), 'grumpy'); assert.equal(c(-15), 'doghouse'); assert.equal(c(-60), 'doghouse');
});
test('24h smoothing: 75% of 1h + 25% of 24h; missing 1h -> chill (flat fallback)', () => {
  assert.equal(KM.smoothed(16, 0), 12); assert.equal(KM.classify(16, 0), 'happy'); // one spiky hour against a flat day is not zoomies
  assert.equal(KM.classify(14, 20), 'zoomies'); assert.equal(KM.classify(-4, 8), 'chill'); assert.equal(KM.classify(-14, -20), 'doghouse');
  assert.equal(KM.classify(null, 50), 'chill'); assert.equal(KM.classify(undefined, undefined), 'chill'); assert.equal(KM.classify('abc', 3), 'chill');
});
test('hysteresis: a new mood must hold for 2 consecutive polls', () => {
  let h = KM.stepMood(null, 'chill'); assert.equal(h.mood, 'chill');
  h = KM.stepMood(h, 'happy'); assert.equal(h.mood, 'chill', '1st poll of happy: still chill'); assert.equal(h.pending, 'happy');
  h = KM.stepMood(h, 'chill'); assert.equal(h.mood, 'chill'); assert.equal(h.pending, null, 'flap back resets');
  h = KM.stepMood(h, 'happy'); h = KM.stepMood(h, 'zoomies'); assert.equal(h.mood, 'chill', 'different new states do not add up'); assert.equal(h.count, 1);
  h = KM.stepMood(h, 'zoomies'); assert.equal(h.mood, 'zoomies', '2nd consecutive zoomies poll switches');
  h = KM.stepMood(h, 'zoomies'); assert.equal(h.mood, 'zoomies'); assert.equal(h.pending, null);
  assert.equal(KM.stepMood(h, 'nonsense').pending, 'chill', 'unknown raw mood is treated as chill');
});
test('?mood= dev override', () => {
  for (const m of KM.MOOD_IDS) assert.equal(KM.overrideMood('?mood=' + m), m);
  assert.equal(KM.overrideMood('?mood=DOGHOUSE'), 'doghouse'); assert.equal(KM.overrideMood('?mood=rocket'), null); assert.equal(KM.overrideMood(''), null);
  let got = null; const M = KM.startMood({ search: '?x=1&mood=grumpy', f: () => { throw new Error('no network with an override'); }, onMood: (m) => { got = m; } });
  assert.equal(got.mood, 'grumpy'); assert.equal(got.override, true); assert.equal(M.forced, 'grumpy'); M.stop();
});
test('brief NPC lines are used verbatim, 3 per mood', () => {
  assert.deepEqual(KM.LINES.zoomies, ["The whole town's got the zoomies today!", "I haven't wagged this hard since puppy school.", "Someone fetch me a bigger bone bowl!"]);
  assert.deepEqual(KM.LINES.doghouse, ["Stormy one. We huddle, we hold, we play.", "Diamond paws, pup.", "Even the President's in the doghouse. He'll be back."]);
  for (const m of KM.MOOD_IDS) { assert.equal(KM.LINES[m].length, 3); assert.ok(KM.HEADLINES[m] && KM.CRIER[m]); }
  const L = KM.moodLedger(); assert.ok(L.take('Mochi', 'happy')); assert.equal(L.take('Mochi', 'happy'), null, 'max one mood line per NPC per visit'); assert.ok(L.take('Kuro', 'happy'));
});
const BANNED_WORDS = /\bbuy\b|\bsell\b|pump it|\bmoon\b|\bdump\b/i, PRICE_TARGET = /\$\s?\d|\b\d+(\.\d+)?\s?x\b|\btarget\b|\bto\s+\$|\b\d+\s?(k|m|b)\b/i;
test('banned words and price targets never appear in mood copy', () => {
  for (const s of KM.allCopy()) { assert.doesNotMatch(s, BANNED_WORDS, s); assert.doesNotMatch(s, PRICE_TARGET, s); assert.deepEqual(KM.bannedIn(s), [], s); }
  for (const bad of ['Buy now!', 'time to sell', 'pump it', 'to the moon', 'dump incoming', 'next stop $1', '10x soon', 'price target 0.01']) assert.ok(KM.bannedIn(bad).length, bad);
});
test('banned words: mood source files contain none at all (code, comments, copy)', () => {
  for (const f of ['src/kibblemood.js', 'src/moodworld.js', 'api/kibble-mood.js']) { const t = fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8').replace(/export const BANNED = .*\n/, '').replace(/const BANNED_WORDS.*\n/, '');
    assert.doesNotMatch(t, BANNED_WORDS, f); assert.doesNotMatch(t, /\bmoon(ing)?\b|\bsold\b/i, f); }
});
test('kibble-pay shared copy (public/kibble-mood.js) is identical when present', { skip: !fs.existsSync(new URL('../../kibble-pay/public/kibble-mood.js', import.meta.url)) }, () => {
  assert.equal(fs.readFileSync(new URL('../../kibble-pay/public/kibble-mood.js', import.meta.url), 'utf8'), fs.readFileSync(new URL('../src/kibblemood.js', import.meta.url), 'utf8'));
});
test('client poller: polls, pauses while hidden, resumes on visible', async () => {
  const timers = []; const doc = { hidden: false, l: null, addEventListener(_, f) { this.l = f; }, removeEventListener() {} }; let calls = 0;
  const f = async () => { calls++; return { ok: true, json: async () => ({ price: 1, change1h: 20, change24h: 20, mood: 'zoomies', updatedAt: 'x' }) }; };
  const seen = []; const M = KM.startMood({ f, doc, search: '', onMood: (m) => seen.push(m.mood), setT: (fn) => { timers.push(fn); return timers.length; }, clearT: () => {} });
  await new Promise((r) => setTimeout(r, 5)); assert.equal(calls, 1); assert.deepEqual(seen, ['zoomies']); assert.equal(timers.length, 1);
  doc.hidden = true; await timers[0](); assert.equal(calls, 1, 'no fetch while hidden');
  doc.hidden = false; doc.l(); await new Promise((r) => setTimeout(r, 5)); assert.equal(calls, 2, 'refresh on return');
  const bad = await KM.fetchMood({ f: async () => { throw new Error('down'); } }); assert.equal(bad.mood, 'chill'); assert.equal(bad.stale, true); M.stop();
});

// ---- server ----
const dex = (h1, h24, price = 0.00001) => [{ baseToken: { address: KM.MINT }, priceUsd: String(price), priceChange: { h1, h24 }, liquidity: { usd: 5000 }, marketCap: 10000 }];
function fakeFetch(state) { return async (u) => { state.calls.push(String(u)); if (String(u).includes('dexscreener')) { if (state.dexDown) throw new Error('down'); return { ok: true, json: async () => state.dex }; }
  if (String(u).includes('pump.fun')) { if (state.pumpDown) return { ok: false, status: 503 }; return { ok: true, json: async () => ({ usd_market_cap: state.mc, total_supply_str: '1000000000000000', base_decimals: 6 }) }; }
  if (String(u).includes('coinbase')) return { ok: true, json: async () => ({ data: { amount: '200' } }) };
  if (state.rpcDown) throw new Error('rpc down https://mainnet.helius-rpc.com/?api-key=SECRETKEY123'); return { ok: true, json: async () => ({ result: { value: { owner: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P', data: [state.curve, 'base64'] } } }) }; }; }
const call = (h) => new Promise((done) => { const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { done({ code: this.statusCode, headers: this.headers, body: JSON.parse(b), raw: b }); } }; h({ method: 'GET', url: '/api/kibble-mood', headers: {} }, res); });
test('server: DexScreener first, 60s Upstash cache under kibble:mood, hysteresis across refreshes', async () => {
  let t = 1_000_000; const kv = memoryKv(() => t), st = { calls: [], dex: dex(1, 1) }; const h = makeHandler({ env: {}, kv, f: fakeFetch(st), now: () => t });
  let r = await call(h); assert.equal(r.code, 200); assert.equal(r.body.mood, 'chill'); assert.equal(r.body.source, 'dexscreener'); assert.equal(r.headers['access-control-allow-origin'], '*');
  for (const k of ['price', 'change1h', 'change24h', 'mood', 'updatedAt']) assert.ok(k in r.body, k);
  assert.ok(await kv.get(KEY), 'cached under kibble:mood');
  st.dex = dex(30, 30); t += 30_000; r = await call(h); assert.equal(r.body.cached, true); assert.equal(st.calls.length, 1, 'served from cache inside 60s');
  t += 31_000; r = await call(h); assert.equal(r.body.mood, 'chill', 'first zoomies poll held back'); assert.equal(r.body.pendingMood, 'zoomies'); assert.equal(st.calls.length, 2);
  t += 61_000; r = await call(h); assert.equal(r.body.mood, 'zoomies', 'second consecutive poll switches');
  st.dex = dex(-20, -20); t += 61_000; r = await call(h); assert.equal(r.body.mood, 'zoomies'); t += 61_000; r = await call(h); assert.equal(r.body.mood, 'doghouse');
});
test('server: falls back to pump.fun then on-chain; change computed from our own samples; never leaks the RPC key', async () => {
  let t = 5_000_000; const kv = memoryKv(() => t), st = { calls: [], dex: [], mc: 3000 }; const env = { HELIUS_API_KEY: 'SECRETKEY123' }; const h = makeHandler({ env, kv, f: fakeFetch(st), now: () => t });
  let r = await call(h); assert.equal(r.body.source, 'pump.fun'); assert.ok(Math.abs(r.body.price - 3e-6) < 1e-12); assert.equal(r.body.change1h, null); assert.equal(r.body.mood, 'chill');
  for (let i = 0; i < 16; i++) { t += 4 * 60_000; await call(h); } // ~64 min of samples at a flat price
  st.mc = 3600; t += 61_000; r = await call(h); assert.ok(Math.abs(r.body.change1h - 20) < 0.5, 'derived 1h change ' + r.body.change1h); assert.equal(r.body.pendingMood, 'zoomies');
  // pump.fun down -> bonding curve via RPC
  const b = Buffer.alloc(81); b.writeBigUInt64LE(1_000_000_000_000_000n, 8); b.writeBigUInt64LE(30_000_000_000n, 16); b.writeBigUInt64LE(1n, 24); b.writeBigUInt64LE(2_000_000_000n, 32); st.curve = b.toString('base64'); st.pumpDown = true;
  t += 61_000; r = await call(h); assert.equal(r.body.source, 'onchain'); assert.ok(Math.abs(r.body.priceSol - 3e-8) < 1e-15); assert.ok(Math.abs(r.body.price - 6e-6) < 1e-12);
  assert.ok(st.calls.some((u) => u.includes('helius')), 'server-side Helius RPC used'); assert.doesNotMatch(r.raw, /SECRETKEY123/);
  // everything down -> last good answer, marked stale; no secret in output
  st.rpcDown = true; t += 61_000; r = await call(h); assert.equal(r.body.stale, true); assert.doesNotMatch(r.raw, /SECRETKEY123|api-key/);
});
test('server: everything down with no history -> chill, stale (graceful)', async () => {
  const st = { calls: [], dexDown: true, pumpDown: true, rpcDown: true }; const r = await call(makeHandler({ env: {}, kv: memoryKv(), f: fakeFetch(st) }));
  assert.equal(r.code, 200); assert.equal(r.body.mood, 'chill'); assert.equal(r.body.stale, true); assert.equal(r.body.price, null); });
test('history helpers', () => {
  let h = []; for (let i = 0; i <= 15; i++) h = addSample(h, i * 240_000, { price: 1 }); assert.equal(h.length, 16);
  assert.equal(changeFrom(h, 3_600_000, 1.1, 3_600_000, 1_200_000).toFixed(1), '10.0'); assert.equal(changeFrom(h, 3_600_000, 1.1, 86_400_000, 3_600_000), null, 'no 24h sample -> null');
  assert.equal(addSample(h, 15 * 240_000 + 1000, { price: 2 }).length, 16, 'samples at most every 4 min');
  assert.equal(parseCurve(Buffer.alloc(10).toString('base64')), null);
});

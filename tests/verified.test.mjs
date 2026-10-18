// Verified Launch badge (opt-in) + town crier news: mocked RPC, no network.
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as V from '../api/_lib/verified.js';
import { sharingConfigOf, PUMP_FEES } from '../api/_lib/clean.js';
import { makeHandler, memoryStore, bondingCurveOf, b58decode as _d, b58encode, PUMP_PROGRAM } from '../api/coins.js';
import * as VF from '../src/verified.js';
import { gate, CRIER_SFX_CD } from '../src/audio.js';
import { bannedIn } from '../src/kibblemood.js';

const b58decode = (s) => Buffer.from(_d(s));
const W = (i) => b58encode(Buffer.alloc(32, i + 1));
const MINT = W(60), CREATOR = W(61), CURVE = bondingCurveOf(MINT), SUP = 1e15, T0 = 1_800_000_000_000;
function curveBuf() { const b = Buffer.alloc(81); b.writeBigUInt64LE(30n * 1000000000n, 32); b58decode(CREATOR).copy(b, 49); return b; }
function sharingBuf({ holders = [[W(7), 6000], [W(8), 4000]] } = {}) { const b = Buffer.alloc(80 + holders.length * 34); Buffer.from([216, 74, 9, 0, 56, 140, 93, 75]).copy(b, 0); b[10] = 1;
  b58decode(MINT).copy(b, 11); b58decode(W(9)).copy(b, 43); b[75] = 1; b.writeUInt32LE(holders.length, 76); holders.forEach(([a, bps], i) => { b58decode(a).copy(b, 80 + i * 34); b.writeUInt16LE(bps, 112 + i * 34); }); return b; }
// default: everything passes. Options flip exactly one criterion.
function fakeRpc({ mintAuth = null, freezeAuth = null, sharing = sharingBuf(), top = [0.9, 0.8, 0.5, 0.4, 0.3, 0.3, 0.2, 0.2, 0.1, 0.1, 0.05], sniper = false, down = [], createdAgoS = 3600 } = {}) {
  const S = 300_000_000, nowS = T0 / 1000;
  const one = async (m, p) => { if (down.includes(m)) throw new Error('429');
    if (m === 'getAccountInfo' && p[0] === MINT) return { value: { owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBSf4Ss623VQ5DA', data: { parsed: { info: { supply: String(SUP), decimals: 6, mintAuthority: mintAuth, freezeAuthority: freezeAuth } } } } };
    if (m === 'getAccountInfo' && p[0] === CURVE) return { value: { owner: PUMP_PROGRAM, data: [curveBuf().toString('base64'), 'base64'] } };
    if (m === 'getAccountInfo' && p[0] === sharingConfigOf(MINT)) return { value: sharing ? { owner: PUMP_FEES, data: [sharing.toString('base64'), 'base64'] } : null };
    if (m === 'getTokenLargestAccounts') return { value: [{ address: 'pool', amount: String(SUP * 0.7) }, ...top.map((x, i) => ({ address: 'a' + i, amount: String(Math.round(SUP * x / 100)) }))] };
    if (m === 'getMultipleAccounts' && p[0][0] === 'pool') return { value: p[0].map((a, i) => ({ data: { parsed: { info: { owner: i === 0 ? CURVE : W(i) } } } })) };
    if (m === 'getMultipleAccounts') return { value: p[0].map(() => ({ owner: '11111111111111111111111111111111' })) };
    if (m === 'getSignaturesForAddress' && p[0] === CURVE) return [{ signature: 'late', slot: S + 40, blockTime: nowS - createdAgoS + 20 }, { signature: 'w2', slot: S + 3, blockTime: nowS - createdAgoS + 1 }, { signature: 'w1', slot: S + 1, blockTime: nowS - createdAgoS }, { signature: 'create', slot: S, blockTime: nowS - createdAgoS }];
    throw new Error('unexpected ' + m); };
  const batch = async (reqs) => reqs.map(([, [sig]]) => ({ meta: { preTokenBalances: [], postTokenBalances: [{ mint: MINT, owner: sig === 'w2' && sniper ? W(40) : CREATOR, uiTokenAmount: { amount: '5' } }] } }));
  return { one, batch, calls: 0 };
}
const run = (o, extra = {}) => V.verifiedChecks(MINT, { rpc: fakeRpc(o), now: T0, ...extra });

test('all four checks passing awards the badge, with the exact wording', async () => {
  const r = await run(); assert.deepEqual(V.ORDER.map((k) => r.checks[k].status), ['pass', 'pass', 'pass', 'pass']); assert.equal(r.verdict, 'pass'); assert.equal(r.creator, CREATOR);
  const rec = V.nextRecord(null, r); assert.equal(rec.status, 'verified'); assert.equal(rec.newly, true); assert.equal(rec.passedAt, T0);
  const html = VF.badgeHtml(MINT, { rec: V.publicRecord(rec), o: { locale: 'en-AU', timeZone: 'Australia/Sydney' } });
  assert.match(html, /Verified Launch: checks passed at \d{1,2} \w{3}, \d{1,2}:\d{2}\s?(am|pm) AE[DS]T/i); for (const k of V.ORDER) assert.match(html, new RegExp(VF.LABELS[k].replace(/[+]/g, '\\+')));
  assert.match(html, /Source: Solana RPC/); });

const single = { authorities: [{ mintAuth: W(3) }, { freezeAuth: W(4) }], feeSplit: [{ sharing: null }, { sharing: sharingBuf({ holders: [[W(7), 5000]] }) }], snipes: [{ sniper: true }], top10: [{ top: [1.2, 0.5, 0.4] }, { top: [0.9, 0.8, 1.0] }] };
for (const [k, cases] of Object.entries(single)) cases.forEach((o, i) => test(`single fail blocks the badge: ${k} #${i + 1}`, async () => {
  const r = await run(o); assert.equal(r.checks[k].status, 'fail', r.checks[k].note); for (const other of V.ORDER.filter((x) => x !== k)) assert.equal(r.checks[other].status, 'pass', other);
  assert.equal(r.verdict, 'fail'); const rec = V.nextRecord(null, r); assert.equal(rec.status, 'not_passed'); assert.doesNotMatch(VF.badgeHtml(MINT, { rec }), /checks passed at/); }));

test('snipe rule: only slots S..S+4 count; a non-creator in slot S+40 does not fail it; too-new coins are "couldn\'t check"', async () => {
  assert.equal(V.SNIPE_SLOTS, 5); const r = await run(); assert.deepEqual(r.checks.snipes.window, [300_000_000, 300_000_004]); assert.equal(r.checks.snipes.txsInWindow, 3);
  const young = await run({ createdAgoS: 30 }); assert.equal(young.checks.snipes.status, 'unknown'); assert.equal(young.verdict, 'unknown'); });

test("data unavailable is 'couldn't check', never a pass", async () => {
  for (const m of ['getTokenLargestAccounts', 'getSignaturesForAddress']) { const r = await run({ down: [m] }); assert.equal(r.verdict, 'unknown'); assert.equal(V.nextRecord(null, r).status, 'unknown'); }
  const html = VF.badgeHtml(MINT, { rec: V.nextRecord(null, await run({ down: ['getTokenLargestAccounts'] })) }); assert.match(html, /couldn't check/i); assert.match(html, /COULDN'T CHECK/); assert.doesNotMatch(html, /checks passed at/); });

test('a settled snipe result is stored once and reused on re-checks', async () => { const m = new Map(); const cache = { get: async (x) => m.get(x) || null, set: async (x, v) => m.set(x, v) };
  await run({}, { snipeCache: cache }); assert.equal(m.get(MINT).status, 'pass'); const r2 = await run({ down: ['getSignaturesForAddress'] }, { snipeCache: cache }); assert.equal(r2.checks.snipes.status, 'pass'); });

function mkRes() { return { code: 0, h: {}, body: '', setHeader(k, v) { this.h[k.toLowerCase()] = v; }, end(b) { this.body = b || ''; }, get statusCode() { return this.code; }, set statusCode(c) { this.code = c; } }; }
function harness({ verify, now }) { const clock = { t: now }; const store = memoryStore(() => clock.t);
  const h = makeHandler({ env: {}, store, deps: { now: () => clock.t, verify, sessionWallet: async (t) => t === 'creator' ? CREATOR : t === 'other' ? W(70) : null, pumpCreator: async () => ({ ok: true, creator: CREATOR }), dexInfo: async () => ({ name: 'Shiba Star', symbol: 'STAR' }) } });
  const call = async (method, q, body, token) => { const res = mkRes(); await h({ method, query: q, body, headers: token ? { authorization: 'Bearer ' + token } : {}, url: '/api/coins' }, res); return { code: res.code || 200, j: JSON.parse(res.body || '{}') }; };
  return { store, clock, call }; }

test('re-check revokes the badge with the reason and time; non-opted-in coins get nothing', async () => {
  let fail = false; const verify = async (m) => { const r = await V.verifiedChecks(m, { rpc: fakeRpc(fail ? { top: [2.5, 0.4] } : {}), now: H.clock.t }); return r; };
  const H = harness({ verify, now: T0 });
  // opt-in at registration
  const reg = await H.call('POST', {}, { action: 'register', mint: MINT, verified: true }, 'creator'); assert.equal(reg.j.coin.verifiedOptIn, true);
  const a = await H.call('GET', { verified: MINT }); assert.equal(a.j.verified[MINT].status, 'verified'); assert.equal(a.j.verified[MINT].passedAt, T0);
  // within the TTL: cached, no re-check
  fail = true; H.clock.t += 5 * 60_000; assert.equal((await H.call('GET', { verified: MINT })).j.verified[MINT].status, 'verified');
  // after the TTL: lazy re-check fails -> revoked, reason + time
  H.clock.t = T0 + V.VERIFIED_TTL_MS + 1000; const b = (await H.call('GET', { verified: MINT })).j.verified[MINT];
  assert.equal(b.status, 'revoked'); assert.equal(b.revokedAt, H.clock.t); assert.match(b.revokeReason, /Top 10 holders each under 1% of supply: .*2\.5%/);
  const html = VF.badgeHtml(MINT, { rec: b }); assert.match(html, /Verified Launch revoked at/); assert.match(html, /2\.5%/); assert.doesNotMatch(html, /checks passed at/);
  // a coin registered WITHOUT the checkbox: null record, empty badge, never a fail
  const other = W(80); await H.call('POST', {}, { action: 'register', mint: other }, 'creator'); const n = await H.call('GET', { verified: other });
  assert.equal(n.j.verified[other], null); VF._reset(); VF.setRecord(other, null); assert.equal(VF.badgeHtml(other), ''); assert.equal(VF.trendTag(other).verified, false); });

test('opt-in later via "register an existing coin": only the creator can opt in', async () => {
  const H = harness({ verify: async () => { throw new Error('not called'); }, now: T0 }); const m = W(81);
  await H.call('POST', {}, { action: 'register', mint: m }, 'creator'); assert.equal((await H.call('POST', {}, { action: 'register', mint: m, verified: true }, 'other')).j.coin?.verifiedOptIn, undefined);
  const r = await H.call('POST', {}, { action: 'register', mint: m, verified: true }, 'creator'); assert.equal(r.j.optedIn, true); assert.equal(r.j.coin.verifiedOptIn, true); });

test('crier: each coin announced once (server set) and releases are rate-limited', async () => {
  const clock = { t: T0 }, store = memoryStore(() => clock.t), rec = { passedAt: T0 };
  assert.equal(await V.queueAnnouncement(store, { mint: W(1), name: 'One', symbol: 'ONE' }, rec), true); assert.equal(await V.queueAnnouncement(store, { mint: W(1), name: 'One', symbol: 'ONE' }, rec), false);
  assert.equal(await V.queueAnnouncement(store, { mint: W(2), name: 'Two', symbol: 'TWO' }, rec), true);
  let news = await V.releaseNews(store, clock.t); assert.equal(news.length, 1); assert.equal(news[0].symbol, 'ONE'); assert.equal(news[0].pump, `https://pump.fun/coin/${W(1)}`);
  clock.t += 60_000; news = await V.releaseNews(store, clock.t); assert.equal(news.length, 1, 'second coin waits for the gap');
  clock.t += V.ANNOUNCE_GAP_S * 1000; news = await V.releaseNews(store, clock.t); assert.equal(news.length, 2); assert.equal(news[0].symbol, 'TWO');
  // re-verification after a revoke never re-announces
  const H = harness({ verify: null, now: T0 }); assert.equal(await V.queueAnnouncement(H.store, { mint: MINT }, rec), true); assert.equal(await V.queueAnnouncement(H.store, { mint: MINT }, rec), false); });

test('crier: newly verified through the API queues exactly one announcement', async () => {
  let fail = false; const H = harness({ verify: async (m) => V.verifiedChecks(m, { rpc: fakeRpc(fail ? { sniper: false, top: [3] } : {}), now: H.clock.t }), now: T0 });
  await H.call('POST', {}, { action: 'register', mint: MINT, verified: true }, 'creator'); await H.call('GET', { verified: MINT });
  fail = true; H.clock.t += V.VERIFIED_TTL_MS + 1; await H.call('GET', { verified: MINT }); fail = false; H.clock.t += V.VERIFIED_TTL_MS + 1; assert.equal((await H.call('GET', { verified: MINT })).j.verified[MINT].status, 'verified');
  const n = await H.call('GET', { news: '1' }); assert.equal(n.j.news.length, 1); assert.equal(n.j.news[0].symbol, 'STAR'); assert.equal(n.j.gapS, V.ANNOUNCE_GAP_S); });

test('crier client: one headline per gap per device, each id once', () => { const mem = new Map(), store = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const c = VF.makeCrier({ store, gapMs: 90_000 }), t = T0; const news = [{ id: 'a', at: t - 1000, symbol: 'A' }, { id: 'b', at: t - 500, symbol: 'B' }];
  assert.equal(c.pick(news, t).id, 'a'); assert.equal(c.pick(news, t + 1000), null); assert.equal(c.pick(news, t + 91_000).id, 'b'); assert.equal(c.pick(news, t + 200_000), null);
  assert.equal(VF.makeCrier({ store }).pick(news, t + 300_000), null, 'seen ids persist across reloads'); });

test('crier sound: one bell with a cooldown, never stacks', () => { assert.ok(CRIER_SFX_CD >= 10); const t = 5000;
  assert.equal(gate('crier', CRIER_SFX_CD, 1.2, t), true); assert.equal(gate('crier', CRIER_SFX_CD, 1.2, t + 1), false); assert.equal(gate('crier', CRIER_SFX_CD, 1.2, t + CRIER_SFX_CD - 0.1), false); assert.equal(gate('crier', CRIER_SFX_CD, 1.2, t + CRIER_SFX_CD + 0.1), true);
  const src = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8'); const tick = src.slice(src.indexOf('function crierNewsTick'), src.indexOf('setTimeout(refreshNews')); assert.equal((tick.match(/crierBell\(\)/g) || []).length, 1); assert.doesNotMatch(tick, /blip\(/); });

test("wording ban: no 'safe', 'sold' or 'dev buy' in any Verified Launch copy; crier headline passes the mood copy rules", async () => {
  const fx = VF.fixtures(T0), all = [];
  for (const r of Object.values(fx.recs)) all.push(VF.badgeHtml('x', { rec: r, open: true }));
  for (const st of ['pending', 'unknown', 'not_passed']) all.push(VF.badgeHtml('x', { rec: { mint: 'x', optIn: true, status: st, checks: (await run({ top: [2] })).checks, checkedAt: T0 }, open: true }));
  all.push(VF.newsCardHtml(fx.news), VF.headline(fx.news[0]), VF.verifiedOptHtml(false, 'x'), VF.RULES, JSON.stringify(await run()), JSON.stringify(await run({ sniper: true, top: [3], sharing: null, mintAuth: W(2) })), JSON.stringify(V.LABELS), JSON.stringify(V.SOURCES));
  for (const s of all) { assert.doesNotMatch(s, /safe/i); assert.doesNotMatch(s, /\bsold\b/i); assert.doesNotMatch(s, /dev buy/i); }
  for (const f of ['src/verified.js', 'api/_lib/verified.js']) { const src = fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8'); assert.doesNotMatch(src, /safe/i, f); assert.doesNotMatch(src, /\bsold\b|dev buy/i, f); }
  assert.deepEqual(bannedIn(VF.headline({ symbol: 'STAR', name: 'Shiba Star' })), []); assert.match(VF.RULES, /Not financial advice/); });

test('the board, the coin card and the ads all render the badge (main.js + coinads wiring)', () => {
  const src = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8'), ads = fs.readFileSync(new URL('../src/coinads.js', import.meta.url), 'utf8');
  assert.match(src, /vfSlot\(c\.mint\)/); assert.match(src, /function coinCardHtml[\s\S]*vfSlot\(mint/); assert.match(src, /RC\.realTrend\(REG\.coins, 6, VF\.trendTag\)/); assert.match(src, /vfOpen: !!ad\.coin\.verified/);
  assert.equal((ads.match(/drawSeal\(/g) || []).length >= 5, true); assert.match(fs.readFileSync(new URL('../src/launchui.js', import.meta.url), 'utf8'), /verifiedOptHtml\(f\.verified, 'nx-verified'\)/); assert.match(src, /verifiedOptHtml\(false, 'reg-verified'\)/); });

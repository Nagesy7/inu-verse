// Clean Launch: real-check logic with a mocked RPC (no network), strict PASS rule, server caching, badge flags.
import test from 'node:test'; import assert from 'node:assert/strict';
import { cleanChecks, overallOf, parseSharing, sharingConfigOf, PUMP_FEES } from '../api/_lib/clean.js';
import { makeHandler, memoryStore, bondingCurveOf, b58decode as _d, b58encode, PUMP_PROGRAM, KIBBLE_MINT } from '../api/coins.js';
import * as CL from '../src/cleanlaunch.js';
import { bannedIn } from '../src/kibblemood.js';
import fs from 'node:fs';

const b58decode = (s) => Buffer.from(_d(s));
const MINT = KIBBLE_MINT, CREATOR = 'Akk3DdxeRRLZABfpkFKYoDBk6Zim5wNLRYemNFjv56fn', CURVE = bondingCurveOf(MINT);
const W = (i) => b58encode(Buffer.alloc(32, i + 1));
function curveBuf({ sol = 30, complete = 0 } = {}) { const b = Buffer.alloc(81); b.writeBigUInt64LE(BigInt(sol * 1e9), 32); b[48] = complete; Buffer.from(b58decode(CREATOR)).copy(b, 49); return b; }
function sharingBuf({ revoked = 1, holders = [[W(7), 6000], [W(8), 4000]] } = {}) { const b = Buffer.alloc(80 + holders.length * 34); Buffer.from([216, 74, 9, 0, 56, 140, 93, 75]).copy(b, 0); b[10] = 1;
  Buffer.from(b58decode(MINT)).copy(b, 11); b58decode(W(9)).copy(b, 43); b[75] = revoked; b.writeUInt32LE(holders.length, 76); holders.forEach(([a, bps], i) => { Buffer.from(b58decode(a)).copy(b, 80 + i * 34); b.writeUInt16LE(bps, 112 + i * 34); }); return b; }
const SUP = 1e15;
function fakeRpc({ mintAuth = null, sharing = sharingBuf(), creatorAmt = 0, top = [5, 4, 3], down = [], snipers = 0 } = {}) { let calls = 0;
  const one = async (m, p) => { calls++; if (down.includes(m)) throw new Error('429');
    if (m === 'getAccountInfo' && p[0] === MINT) return { value: { owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBSf4Ss623VQ5DA', data: { parsed: { info: { supply: String(SUP), decimals: 6, mintAuthority: mintAuth, freezeAuthority: null } } } } };
    if (m === 'getAccountInfo' && p[0] === CURVE) return { value: { owner: PUMP_PROGRAM, data: [curveBuf().toString('base64'), 'base64'] } };
    if (m === 'getAccountInfo' && p[0] === sharingConfigOf(MINT)) return { value: sharing ? { owner: PUMP_FEES, data: [sharing.toString('base64'), 'base64'] } : null };
    if (m === 'getTokenLargestAccounts') return { value: [{ address: 'pool', amount: String(SUP * 0.6) }, ...top.map((x, i) => ({ address: 'a' + i, amount: String(SUP * x / 100) }))] };
    if (m === 'getMultipleAccounts' && p[0][0] === 'pool') return { value: p[0].map((a, i) => ({ data: { parsed: { info: { owner: i === 0 ? CURVE : W(i) } } } })) };
    if (m === 'getMultipleAccounts') return { value: p[0].map(() => ({ owner: '11111111111111111111111111111111' })) };
    if (m === 'getTokenAccountsByOwner') return { value: creatorAmt ? [{ pubkey: 'cAcc', account: { data: { parsed: { info: { tokenAmount: { amount: String(SUP * creatorAmt / 100) } } } } } }] : [] };
    if (m === 'getSignaturesForAddress' && p[0] === CURVE) return [{ signature: 's2', slot: 101 }, { signature: 's1', slot: 100 }];
    if (m === 'getSignaturesForAddress') return [];
    throw new Error('unexpected ' + m); };
  const batch = async (reqs) => { calls += reqs.length; return reqs.map(() => ({ meta: { preTokenBalances: [], postTokenBalances: Array.from({ length: snipers }, (_, i) => ({ mint: MINT, owner: W(20 + i), uiTokenAmount: { amount: '5' } })) } })); };
  return { one, batch, get calls() { return calls; } }; }
const run = (o) => cleanChecks(MINT, { rpc: fakeRpc(o), solUsd: async () => 150, now: 1 });

test('clean coin with a published + locked fee split passes, with real values', async () => {
  const r = await run(); assert.equal(r.overall, 'pass'); assert.equal(r.checks.top10.value, 12); assert.equal(r.checks.creatorPct.value, 0); assert.equal(r.checks.feeSplit.status, 'pass'); assert.equal(r.checks.snipes.value, 0); assert.equal(r.checks.liquidity.status, 'pass'); assert.equal(r.creator, CREATOR); });
test('fee split not locked, or not published, can never PASS', async () => {
  assert.equal((await run({ sharing: sharingBuf({ revoked: 0 }) })).overall, 'warn'); const np = await run({ sharing: null }); assert.equal(np.checks.feeSplit.status, 'warn'); assert.match(np.checks.feeSplit.note, /No creator fee split/); assert.equal(np.overall, 'warn'); });
test('fee split that cannot be read is unknown and caps the badge at WARN', async () => {
  const rpc = fakeRpc(); const orig = rpc.one; rpc.one = async (m, p) => { if (m === 'getAccountInfo' && p[0] === sharingConfigOf(MINT)) throw new Error('rpc down'); return orig(m, p); };
  const r = await cleanChecks(MINT, { rpc, solUsd: async () => null }); assert.equal(r.checks.feeSplit.status, 'unknown'); assert.equal(r.overall, 'warn'); });
test('never invents data: RPC failures become unknown, all-unknown is unknown', async () => {
  const r = await run({ down: ['getTokenLargestAccounts'] }); assert.equal(r.checks.top10.status, 'unknown'); assert.equal(r.checks.top10.value, null); assert.equal(r.overall, 'warn');
  const all = await cleanChecks(MINT, { rpc: { one: async () => { throw new Error('x'); }, batch: async () => { throw new Error('x'); }, calls: 0 } });
  assert.ok(Object.values(all.checks).every((c) => c.status === 'unknown')); assert.equal(all.overall, 'unknown'); });
test('red flags fail: live mint authority, whale dev, snipers', async () => {
  assert.equal((await run({ mintAuth: W(3) })).overall, 'fail'); const dev = await run({ creatorAmt: 20 }); assert.equal(dev.checks.creatorPct.status, 'fail'); assert.equal((await run({ snipers: 4 })).checks.snipes.status, 'fail'); });
test('overallOf: any fail -> fail; pass needs feeSplit pass', () => {
  const P = { status: 'pass' }; assert.equal(overallOf({ a: P, feeSplit: P }), 'pass'); assert.equal(overallOf({ a: P }), 'warn'); assert.equal(overallOf({ a: P, feeSplit: { status: 'unknown' } }), 'warn'); assert.equal(overallOf({ a: { status: 'fail' }, feeSplit: P }), 'fail'); });
test('parseSharing reads the pump.fun SharingConfig layout', () => { const c = parseSharing(sharingBuf()); assert.equal(c.mint, MINT); assert.equal(c.adminRevoked, true); assert.equal(c.totalBps, 10000); assert.equal(c.shareholders.length, 2); assert.equal(parseSharing(Buffer.alloc(100)), null); });

function mkRes() { return { code: 0, h: {}, body: '', setHeader(k, v) { this.h[k.toLowerCase()] = v; }, status(c) { this.code = c; return this; }, end(b) { this.body = b || ''; }, json(o) { this.body = JSON.stringify(o); }, get statusCode() { return this.code; }, set statusCode(c) { this.code = c; } }; }
test('/api/coins?clean= caches per coin and only checks board coins + $KIBBLE', async () => {
  const store = memoryStore(); let n = 0; const h = makeHandler({ env: {}, store, deps: { clean: async (m) => { n++; return { mint: m, checks: {}, overall: 'warn', checkedAt: Date.now() }; } } });
  const call = async (q) => { const res = mkRes(); await h({ method: 'GET', query: q, headers: {} }, res); return { code: res.code || 200, j: JSON.parse(res.body) }; };
  const a = await call({ clean: MINT }); assert.equal(a.j.clean[MINT].overall, 'warn'); const b = await call({ clean: MINT }); assert.equal(b.j.clean[MINT].cached, true); assert.equal(n, 1);
  const other = W(30); const c = await call({ clean: other }); assert.equal(c.j.clean[other].overall, 'unknown'); assert.match(c.j.clean[other].error, /not on the Launch Hall board/); assert.equal(n, 1);
  assert.equal((await call({ clean: 'bad!' })).code, 400); });

test('badge always flags dev + top-10 holdings and shows unknown honestly', async () => {
  CL._reset(); const r = await run({ sharing: null }); await CL.fetchClean([MINT], { f: async () => ({ ok: true, json: async () => ({ clean: { [MINT]: r } }) }) });
  const html = CL.badgeHtml(MINT); assert.match(html, /Dev 0%/); assert.match(html, /Top10 12%/); assert.match(html, /CHECK NOTES/); assert.match(html, /Creator fee split published \+ locked/);
  await CL.fetchClean([W(40)], { f: async () => { throw new Error('offline'); } }); const u = CL.badgeHtml(W(40)); assert.match(u, /Dev \?/); assert.match(u, /NOT CHECKED YET/); });
test('clean launch copy has no banned words', () => { for (const f of ['src/cleanlaunch.js', 'api/_lib/clean.js']) assert.deepEqual(bannedIn(fs.readFileSync(f, 'utf8').replace(/^\s*\/\/.*$/gm, '')), [], f); });
test('unreadable transactions never count as clean (first-slot + dev history -> unknown)', async () => {
  const rpc = fakeRpc(); rpc.batch = async (reqs) => reqs.map(() => null); const r = await cleanChecks(MINT, { rpc, solUsd: async () => 150 });
  assert.equal(r.checks.snipes.status, 'unknown'); assert.match(r.checks.snipes.note, /Could not read/); assert.notEqual(r.overall, 'pass');
  assert.match(fs.readFileSync('api/_lib/clean.js', 'utf8'), /maxSupportedTransactionVersion: 1/); });

// creatorSold with the per-coin published project-wallet allowlist ($KIBBLE only)
import { creatorSoldCheck, PROJECT_WALLETS } from '../api/_lib/clean.js';
const PV = 'BzLYTFAfUsjzQ5x8bx5BbPK4DFtaHrLCuferkvkxTNGJ', BV = 'Bv35NAj1XvfSGrQKpHHw29ojZmY4NYyUZr7rwXpPhW8Y';
const tb = (o) => Object.entries(o).map(([owner, amount]) => ({ mint: MINT, owner, uiTokenAmount: { amount: String(amount) } }));
const tx = (pre, post) => ({ meta: { preTokenBalances: tb(pre), postTokenBalances: tb(post) } });
const M = 1e6; // 1 token at 6 decimals
const kibbleTxs = [
  tx({ [CURVE]: 1000 * M }, { [CURVE]: 724 * M, [CREATOR]: 276 * M }),            // creator buys 276
  tx({ [CREATOR]: 276 * M, [PV]: 0 }, { [CREATOR]: 76 * M, [PV]: 200 * M }),      // moves 200 to President's Vault
  tx({ [CREATOR]: 76 * M, [CURVE]: 724 * M }, { [CREATOR]: 0, [CURVE]: 800 * M }), // sells 76 on the curve
  tx({ [BV]: 100 * M, [CREATOR]: 0 }, { [BV]: 0, [CREATOR]: 100 * M }),           // receives 100 from Bone Vault
  tx({ [CREATOR]: 100 * M, [CURVE]: 800 * M }, { [CREATOR]: 52 * M, [CURVE]: 848 * M }), // sells 48 on the curve
];
const kSigs = kibbleTxs.map((_, i) => ({ signature: 'sig' + i }));
test('creatorSold: $KIBBLE transfers to its published project wallets are listed but not counted; curve sells still count', () => {
  assert.deepEqual(Object.keys(PROJECT_WALLETS[MINT]).sort(), [PV, CREATOR, BV].sort());
  const r = creatorSoldCheck(kibbleTxs, { mint: MINT, creator: CREATOR, curve: CURVE, sigs: kSigs });
  assert.equal(r.status, 'warn'); assert.equal(r.value, 44.93); // 124 sold of 276 bought (inbound from Bone Vault excluded)
  assert.equal(r.offloaded.length, 2); assert.ok(r.offloaded.every((s) => s.kind === 'swapped into the pump.fun curve for SOL'));
  assert.match(r.note, /sig2/); assert.match(r.note, /sig4/); assert.match(r.note, /President's Vault/); assert.match(r.note, /Bone Vault/);
  assert.equal(r.moved.length, 1); assert.equal(r.moved[0].signature, 'sig1'); assert.equal(r.fromProject.length, 1); });
test('creatorSold: other coins (no allowlist) count every outflow exactly as before', () => {
  const r = creatorSoldCheck(kibbleTxs, { mint: 'OtherMint1111', creator: CREATOR, curve: CURVE, sigs: kSigs, project: undefined });
  const other = kibbleTxs.map((t) => ({ meta: { preTokenBalances: t.meta.preTokenBalances.map((b) => ({ ...b, mint: 'X' })), postTokenBalances: t.meta.postTokenBalances.map((b) => ({ ...b, mint: 'X' })) } }));
  const o = creatorSoldCheck(other, { mint: 'X', creator: CREATOR, curve: CURVE, sigs: kSigs });
  assert.equal(o.status, 'fail'); assert.equal(o.value, 86.17); assert.match(o.note, /went down by 86.17% of what it received/); assert.equal(o.offloaded, undefined);
  assert.ok(r); });
test('creatorSold: a send to a wallet NOT on the allowlist still counts, even for $KIBBLE', () => {
  const t = [tx({ [CURVE]: 100 * M }, { [CURVE]: 0, [CREATOR]: 100 * M }), tx({ [CREATOR]: 100 * M, [W(5)]: 0 }, { [CREATOR]: 0, [W(5)]: 100 * M })];
  const r = creatorSoldCheck(t, { mint: MINT, creator: CREATOR, curve: CURVE, sigs: [{ signature: 'a' }, { signature: 'b' }] });
  assert.equal(r.status, 'fail'); assert.equal(r.offloaded[0].kind, 'sent out'); });
test('creatorSold: only moves to project wallets -> pass with the moves listed', () => {
  const r = creatorSoldCheck(kibbleTxs.slice(0, 2), { mint: MINT, creator: CREATOR, curve: CURVE, sigs: kSigs });
  assert.equal(r.status, 'pass'); assert.match(r.note, /Not counted/); assert.match(r.note, /sig1/); });

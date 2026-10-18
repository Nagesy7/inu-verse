// Launch Hall: $KIBBLE is the default pair (pump.fun Custom Pairs). An opening swap is routed SOL → $KIBBLE → new coin in ONE
// unsigned transaction; the player sees the full route + every fee from a mainnet dry run before the wallet opens.
// Solana RPC is mocked here; scripts/kibble-route-sim.mjs runs the same builder against mainnet (simulate only, never sign/send).
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { makeLaunchHandler } from '../api/launch.js';
import { memoryStore } from '../api/coins.js';
import { kit as K, decodeAccount, KIBBLE_MINT, ROUTE_ALT, tradesFromLogs, describeRoute, validateBuild, explainSim, SLIPPAGE_BPS } from '../api/_lib/launchtx.js';
import * as NX from '../src/noext.js';
import * as CK from '../src/vendor/phantom-kit.js';
import { planRoute, minLamports, DEFAULT_PAIR, ROUTE_ALT as CLIENT_ALT } from '../src/launchcost.js';
import { bannedIn } from '../src/kibblemood.js';
const FX = JSON.parse(fs.readFileSync(new URL('./fixtures/pump-accounts.json', import.meta.url)));
const ALT = JSON.parse(fs.readFileSync(new URL('./fixtures/pump-alt.json', import.meta.url)));
const T22 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb', WSOL = 'So11111111111111111111111111111111111111112';
const player = CK.Keypair.generate();
const altAccount = () => ({ key: new K.PublicKey(ALT.key), state: { addresses: ALT.addresses.map((a) => new K.PublicKey(a)) }, isActive: () => true });
// Two-leg trade events like pump.fun emits during the dry run (values shaped after the Oct 18 mainnet run).
const trades = (mint, out = '1344314539051') => [
  { mint: KIBBLE_MINT, quoteMint: WSOL, isBuy: true, quoteAmount: '9905894', tokenAmount: '348747546098', fee: '94106', feeBps: 95, creatorFee: '0', creatorFeeBps: 0, buybackFee: '47053', holderRewards: '0', holderRewardsBps: 0 },
  { mint, quoteMint: KIBBLE_MINT, isBuy: true, quoteAmount: '347704432799', tokenAmount: out, fee: '0', feeBps: 0, creatorFee: '1043113299', creatorFeeBps: 30, buybackFee: '0', holderRewards: '0', holderRewardsBps: 0 }];
function deps(over = {}) { const sims = [];
  return { sims, global: async () => K.PUMP_SDK.decodeGlobal(decodeAccount(FX.global)), feeConfig: async () => K.PUMP_SDK.decodeFeeConfig(decodeAccount(FX.feeConfig)),
    resolveQuote: async () => ({ source: 'pumpCoin', quoteTokenProgram: new K.PublicKey(T22), pumpQuote: { accounts: { chain: [] }, depth: 1 } }),
    blockhash: async () => 'GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi', lookupTable: async (a) => (a === ROUTE_ALT ? altAccount() : null),
    simulate: async (tx) => { const mint = tx.message.staticAccountKeys[1].toBase58(); sims.push(tx); return { err: null, units: 300_607, balance: 1e9, cost: 17_854_264, logs: [], trades: trades(mint) }; }, ...over }; }
const call = (h, body) => new Promise((done) => { const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { done({ code: this.statusCode, body: JSON.parse(b) }); } };
  h({ method: 'POST', url: '/api/launch', query: {}, body: { action: 'build', ...body }, headers: { 'x-forwarded-for': '9.9.9.9' } }, res); });
const req = (extra = {}) => ({ player: player.publicKey.toBase58(), mint: CK.Keypair.generate().publicKey.toBase58(), name: 'Shiba Star', symbol: 'STAR', uri: 'https://ipfs.io/ipfs/bafytest', ...extra });

test('$KIBBLE is the default pair everywhere; SOL stays available', () => {
  assert.equal(DEFAULT_PAIR, 'KIBBLE'); assert.equal(validateBuild(req()).v.pair, 'KIBBLE'); assert.equal(validateBuild(req({ pair: 'SOL' })).v.pair, 'SOL');
  assert.equal(validateBuild(req({ pair: 'BONK' })).ok, false); assert.equal(validateBuild(req()).v.slippageBps, SLIPPAGE_BPS.def);
  const ui = fs.readFileSync('src/launchui.js', 'utf8'); assert.match(ui, /form: \{ pair: 'KIBBLE'/); assert.match(ui, /<option value="KIBBLE"[^>]*>★ \$KIBBLE \(default\)<\/option><option value="SOL"/);
  assert.equal(CLIENT_ALT, ROUTE_ALT); });

test('$KIBBLE + opening swap: one UNSIGNED tx, SOL → $KIBBLE → coin, slippage floor from the dry run, fits 1232 bytes via the public ALT', async () => {
  const d = deps(), h = makeLaunchHandler({ env: {}, store: memoryStore(), deps: d }), body = req({ devBuySol: 0.01, slippageBps: 300 });
  const r = await call(h, body); assert.equal(r.code, 200, JSON.stringify(r.body));
  const tx = K.VersionedTransaction.deserialize(Buffer.from(r.body.tx, 'base64')), keys = tx.message.staticAccountKeys.map(String);
  assert.equal(keys[0], body.player); assert.equal(tx.message.header.numRequiredSignatures, 2); assert.deepEqual(keys.slice(0, 2).sort(), [body.player, body.mint].sort());
  assert.ok(tx.signatures.every((s) => s.every((b) => b === 0)), 'server signed nothing'); assert.equal(r.body.serverSigned, false);
  assert.ok(r.body.size <= 1232 && tx.serialize().length === r.body.size); assert.deepEqual(tx.message.addressTableLookups.map((l) => l.accountKey.toBase58()), [ROUTE_ALT]);
  assert.equal(d.sims.length, 2, 'quote dry run, then the final tx dry run'); assert.equal(r.body.minOut, String((1344314539051n * 9700n) / 10000n));
  assert.ok(Buffer.from(tx.message.serialize()).includes(Buffer.from(new K.BN(r.body.minOut).toArray('le', 8))), 'min-out floor is inside the signed bytes');
  const rt = r.body.route; assert.deepEqual(rt.steps.map((s) => s.from + '>' + s.to), ['SOL>$KIBBLE', '$KIBBLE>$STAR']);
  assert.deepEqual(rt.fees.map((f) => f.key), ['pumpfun', 'creator', 'lp', 'slippage', 'network', 'priority', 'rent']);
  const f = Object.fromEntries(rt.fees.map((x) => [x.key, x])); assert.equal(f.pumpfun.amount, '0.000094 SOL'); assert.equal(f.pumpfun.bps, 95); assert.match(f.pumpfun.plain, /first leg/);
  assert.equal(f.creator.bps, 30); assert.match(f.creator.plain, /last leg/); assert.equal(f.network.lamports, 10_000); assert.equal(f.priority.lamports, 45_000);
  assert.equal(f.rent.lamports, 17_854_264 - 10_000 - 45_000 - 10_000_000); assert.match(f.slippage.amount, /^at least 1,303,985\.1028 \$STAR$/);
  assert.ok(rt.notes.some((n) => /Charity routing isn't available for \$KIBBLE-paired coins/.test(n))); assert.ok(rt.notes.some((n) => n.includes(ROUTE_ALT)));
  assert.equal(rt.total.lamports, 17_854_264); assert.deepEqual(bannedIn(JSON.stringify(rt)), [], 'route copy is free of banned words'); });

test('no lookup table → honest 503, never a tx without the route; no dry run → never a tx without a slippage floor', async () => {
  const a = await call(makeLaunchHandler({ env: {}, store: memoryStore(), deps: deps({ lookupTable: async () => null }) }), req({ devBuySol: 0.01 }));
  assert.equal(a.code, 503); assert.match(a.body.error, /no opening swap, or pick SOL/);
  const b = await call(makeLaunchHandler({ env: {}, store: memoryStore(), deps: deps({ simulate: async () => { throw new Error('rpc down'); } }) }), req({ devBuySol: 0.01 }));
  assert.equal(b.code, 503); assert.equal(b.body.tx, undefined);
  const c = await call(makeLaunchHandler({ env: {}, store: memoryStore(), deps: deps({ simulate: async () => ({ err: { InstructionError: [4, { Custom: 6107 }] }, logs: ['x'], trades: [] }) }) }), req({ devBuySol: 0.01 }));
  assert.equal(c.code, 200); assert.equal(c.body.tx, null); assert.equal(c.body.simulation.ok, false); assert.match(c.body.hint, /migrating/);
  const plain = await call(makeLaunchHandler({ env: {}, store: memoryStore(), deps: deps({ lookupTable: async () => null }) }), req());
  assert.equal(plain.code, 200, 'create-only $KIBBLE pair needs no lookup table'); assert.equal(plain.body.lookupTable, null); });

test('decodes pump.fun TradeEvents from real mainnet dry-run logs', () => {
  const line = 'Program data: vdt/007mYe46JAl5uX1HWZxUK71hkem3zfiZJM2ABjehC8/iutggNwAAAAAAAAAAK/xj/zgBAAABfowIh2C/3h3dzzLBfyCbgkLuUqrxMfrNiNDqLG0LBvKZbdRqAAAAAAAAAAAAAAAA1RN0SKrOAwAAAAAAAAAAANV7YfwY0AIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfowIh2C/3h3dzzLBfyCbgkLuUqrxMfrNiNDqLG0LBvIeAAAAAAAAAFOlLD4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAG11bHRpX2hvcF9zd2FwAAAAAAAAAAAAAAAAAAAAAACIEwAAAAAAAAAAAAAAAAAAAAAAADPOMhdtX7Zf+Nize2tmHxeHmRYufkSqqkx/BXbJAH6vn5jM9FAAAABh8nhbafwAAJ+YzPRQAAAAAAAAAAAAAAAAAAAAAAAAAFOlLD4AAAAA';
  const t = tradesFromLogs(['Program log: hi', line, 'Program data: AAAA']); assert.equal(t.length, 1);
  assert.equal(t[0].quoteMint, KIBBLE_MINT); assert.equal(t[0].ix, 'multi_hop_swap'); assert.equal(t[0].creatorFeeBps, 30); assert.equal(t[0].fee, '0'); assert.ok(BigInt(t[0].tokenAmount) > 0n); });

test('launchCoin shows the dry-run route and waits: cancel → wallet never opens; confirm → signs', async () => {
  const built = { tx: 'x', pair: 'KIBBLE', minOut: '5', route: { steps: [], fees: [], notes: [] }, simulation: { ok: true } };
  let opened = 0; const wallet = { address: player.publicKey.toBase58(), signAndSendLaunch: async () => { opened++; return 'sig'; } };
  const realTx = await (async () => { const d = deps(), r = await call(makeLaunchHandler({ env: {}, store: memoryStore(), deps: d }), req({ devBuySol: 0.01 })); return r.body; })();
  let mintKp; const kit = { ...CK, Keypair: { generate: () => (mintKp = CK.Keypair.generate()) } };
  const api = { metadata: async () => ({ uri: 'https://ipfs.io/ipfs/x' }), build: async (b) => ({ ...realTx, mint: b.mint, tx: realTx.tx }), status: async () => ({ status: 'confirmed' }), register: async () => ({}) };
  // The real tx was built for a different mint, so the client safety check must refuse it before any review or signing.
  await assert.rejects(NX.launchCoin({ form: { name: 'A', symbol: 'A', pair: 'KIBBLE', devBuySol: 0.01 }, wallet, kit, api, review: async () => true, sleep: async () => {} }), /unexpected signers/); assert.equal(opened, 0);
  // Same flow with a tx built for the browser's mint: cancel at review, then confirm.
  const api2 = { ...api, build: async (b) => (await call(makeLaunchHandler({ env: {}, store: memoryStore(), deps: deps() }), { ...b })).body };
  const steps = []; let seen = null;
  await assert.rejects(NX.launchCoin({ form: { name: 'Shiba Star', symbol: 'STAR', pair: 'KIBBLE', devBuySol: 0.01 }, wallet: { ...wallet, address: player.publicKey.toBase58() }, kit, api: api2, onStep: (s) => steps.push(s), review: async (b) => { seen = b; return false; }, sleep: async () => {} }), /cancelled before signing/);
  assert.equal(opened, 0, 'wallet never opened'); assert.ok(steps.includes('review') && !steps.includes('sign')); assert.equal(seen.route.steps.length, 2);
  const ok = await NX.launchCoin({ form: { name: 'Shiba Star', symbol: 'STAR', pair: 'KIBBLE', devBuySol: 0.01 }, wallet, kit, api: api2, review: async () => true, sleep: async () => {}, registerTries: 1 });
  assert.equal(opened, 1); assert.equal(ok.signature, 'sig'); void built; });

test('client refuses foreign lookup tables and a $KIBBLE route without a slippage floor', () => {
  const fake = (alt) => ({ message: { addressTableLookups: alt ? [{ accountKey: new K.PublicKey(alt) }] : [] } });
  assert.throws(() => NX.checkRoute(fake(player.publicKey.toBase58()), { pair: 'KIBBLE', minOut: '9' }, { pair: 'KIBBLE', devBuySol: 1 }), /lookup table/);
  assert.throws(() => NX.checkRoute(fake(ROUTE_ALT), { pair: 'KIBBLE', minOut: '0' }, { pair: 'KIBBLE', devBuySol: 1 }), /slippage floor/);
  assert.throws(() => NX.checkRoute(fake(null), { pair: 'SOL' }, { pair: 'KIBBLE', devBuySol: 0 }), /pair changed/);
  assert.deepEqual(NX.checkRoute(fake(ROUTE_ALT), { pair: 'KIBBLE', minOut: '9' }, { pair: 'KIBBLE', devBuySol: 1 }).alts, [ROUTE_ALT]); });

test('form preview lists the route and every fee in plain words before anything is built (deterministic, no banned words)', () => {
  const k = planRoute({ pair: 'KIBBLE', devBuySol: 0.1, slippageBps: 300, symbol: 'STAR' }), all = [...k.steps, ...k.fees, ...k.notes].join(' | ');
  assert.equal(k.steps.length, 2); for (const w of [/pump\.fun fee: 0\.95%/, /Creator fee: 0\.3%/, /Liquidity fee: 0%/, /Slippage limit: 3%/, /Network fee/, /Priority fee: 0\.0000450? SOL/, /rent/, /Charity routing/]) assert.match(all, w);
  assert.deepEqual(planRoute({ pair: 'KIBBLE', devBuySol: 0.1, symbol: 'STAR' }), planRoute({ pair: 'KIBBLE', devBuySol: 0.1, symbol: 'STAR' }));
  const s = planRoute({ pair: 'SOL', devBuySol: 0.1, symbol: 'STAR' }); assert.equal(s.steps.length, 1); assert.match(s.fees.join(' '), /Slippage: none/); assert.equal(s.notes.length, 0);
  assert.match(planRoute({ pair: 'KIBBLE' }).steps[0], /paired with \$KIBBLE \(no swap\)/);
  for (const p of [k, s, planRoute()]) assert.deepEqual(bannedIn([...p.steps, ...p.fees, ...p.notes].join(' ')), []);
  assert.ok(minLamports({ pair: 'KIBBLE', devBuySol: 0.01 }).total > 17_854_264, 'minimum covers the measured mainnet cost'); });

test('describeRoute without a dry run never invents amounts; explainSim names the name-length quirk', () => {
  const r = describeRoute({ pair: 'KIBBLE', symbol: 'STAR', lamports: 1e7, mint: 'x' }); assert.equal(r.total, null); assert.equal(r.fees.find((f) => f.key === 'rent').amount, null);
  assert.match(explainSim({ ok: false, err: '{"InsufficientFundsForRent":{"account_index":1}}' }), /Add or remove one letter/); });

// Community mains: any user can add their own coin in the Cabal Meme Maker as a launch quote pair. NOT featured, NOT the face,
// NOT endorsed. /api/launch accepts pair=<mint> only when the Kibble Pay registry lists it as approved AND it passes the
// on-chain verifier again for this build. $KIBBLE stays the default. Mocked here; tests/community-live.test.mjs hits mainnet.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { makeLaunchHandler } from '../api/launch.js';
import { memoryStore } from '../api/coins.js';
import { kit as K, decodeAccount, validateBuild, validateBuy, communitySpec, specFor, describeRoute, DEFAULT_PAIR, PAIRS, KIBBLE_MINT, ROUTE_ALT } from '../api/_lib/launchtx.js';
import { impersonates, verifyCommunityMint, decodeMetaplex, COMMUNITY_RULES, OFFICIAL_MAINS, isMintPair } from '../api/_lib/community.js';
import { planRoute, minLamports } from '../src/launchcost.js';
import * as CK from '../src/vendor/phantom-kit.js';
const FX = JSON.parse(fs.readFileSync(new URL('./fixtures/pump-accounts.json', import.meta.url)));
const ALT = JSON.parse(fs.readFileSync(new URL('./fixtures/pump-alt.json', import.meta.url)));
const T22 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const NEET = 'Ce2gx9KGXJ6C9Mp5b5x1sn9Mg87JwEbrQby4Zqo3pump';
const player = CK.Keypair.generate();
const altAccount = () => ({ key: new K.PublicKey(ALT.key), state: { addresses: ALT.addresses.map((a) => new K.PublicKey(a)) }, isActive: () => true });
const deps = () => ({ global: async () => K.PUMP_SDK.decodeGlobal(decodeAccount(FX.global)), feeConfig: async () => K.PUMP_SDK.decodeFeeConfig(decodeAccount(FX.feeConfig)),
  resolveQuote: async () => ({ source: 'pumpCoin', quoteTokenProgram: new K.PublicKey(T22), pumpQuote: { accounts: { chain: [] }, depth: 1 } }),
  blockhash: async () => 'GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi', lookupTable: async (a) => (a === ROUTE_ALT ? altAccount() : null) });
const call = (h, body, query = {}, method = 'POST') => new Promise((done) => { const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { done({ code: this.statusCode, body: JSON.parse(b) }); } };
  h({ method, url: '/api/launch', query, body: method === 'POST' ? { action: 'build', ...body } : undefined, headers: { 'x-forwarded-for': '9.9.9.9' } }, res); });
const req = (extra = {}) => ({ player: player.publicKey.toBase58(), mint: CK.Keypair.generate().publicKey.toBase58(), name: 'Shiba Star', symbol: 'STAR', uri: 'https://ipfs.io/ipfs/bafytest', ...extra });
const okVerify = async (mint) => ({ ok: true, mint, symbol: 'NEET', venue: 'pumpswap-pool', failures: [], redFlags: [] });
const approved = async (mint) => (mint === NEET ? { mint, symbol: 'NEET', status: 'approved', hidden: false } : null);

test('community spec: never replaces an official pair, never the default, ticker sanitised', () => {
  assert.equal(DEFAULT_PAIR, 'KIBBLE');
  assert.equal(communitySpec({ mint: KIBBLE_MINT, symbol: 'X' }), null, 'official mint is never a community spec');
  const s = communitySpec({ mint: NEET, symbol: '<neet>$', venue: 'pumpswap-pool' });
  assert.deepEqual(s, { quote: NEET, devBuy: true, ticker: '$NEET', community: true, venue: 'pumpswap-pool' });
  assert.equal(specFor(NEET, null), null); assert.equal(specFor(NEET, { mint: NEET, symbol: 'NEET' }).quote, NEET);
  assert.equal(validateBuild(req({ pair: NEET })).ok, false, 'a mint pair without an approved+verified community record is refused');
  const v = validateBuild(req({ pair: NEET }), { community: { mint: NEET, symbol: 'NEET', venue: 'pumpswap-pool' } });
  assert.equal(v.ok, true); assert.equal(v.v.pair, NEET); assert.equal(v.v.spec.community, true);
  assert.equal(validateBuild(req(), { community: { mint: NEET, symbol: 'NEET' } }).v.pair, 'KIBBLE', 'still defaults to $KIBBLE');
  assert.equal(validateBuy(req({ pair: NEET, devBuySol: 0.01 }), { community: { mint: NEET, symbol: 'NEET' } }).ok, true);
  const r = describeRoute({ pair: NEET, symbol: 'STAR', lamports: 1e7, spec: s });
  assert.match(r.steps[0].venue, /\$NEET PumpSwap pool/); assert.ok(r.notes.some((n) => /community main/.test(n) && /not endorsed/.test(n)));
});

test('client cost + plan treat a community mint as a quoted pair with its own ticker', () => {
  assert.equal(minLamports({ pair: NEET }).total, minLamports({ pair: 'KIBBLE' }).total);
  const p = planRoute({ pair: NEET, devBuySol: 0.01, quoteTicker: 'neet', quoteVenue: 'pumpswap-pool', symbol: 'STAR' });
  assert.match(p.steps[0], /SOL → \$NEET on the \$NEET PumpSwap pool/); assert.ok(p.notes.some((n) => /community main/.test(n)));
  assert.match(planRoute({ pair: NEET, quoteTicker: 'NEET' }).steps[0], /paired with \$NEET \(no swap\)/);
});

test('impersonation of official mains is blocked by mint, ticker and name', () => {
  assert.equal(OFFICIAL_MAINS.length, 6);
  for (const t of ['KIBBLE', '$food', 'FLC', 'autism', 'CHAIRMAN', 'SOL', 'foodcoin']) assert.ok(impersonates({ mint: NEET, name: 'Other', symbol: t }), t);
  for (const n of ['Autism Coin', 'Fly Cat', 'FOODCOIN', 'Chairman The Uber Driver']) assert.ok(impersonates({ mint: NEET, name: n, symbol: 'ZZZ' }), n);
  assert.ok(impersonates({ mint: KIBBLE_MINT, name: 'x', symbol: 'y' }));
  assert.equal(impersonates({ mint: NEET, name: 'NotInEmploymentEducationTraining', symbol: 'NEET' }), null);
  assert.equal(isMintPair('KIBBLE'), false); assert.equal(isMintPair(NEET), true);
});

test('build: pair=<mint> requires registry approval AND a passing on-chain re-check; fees/signers unchanged', async () => {
  const mk = (community) => makeLaunchHandler({ env: {}, store: memoryStore(), deps: deps(), community });
  let r = await call(mk({ registry: async () => null, verify: okVerify }), req({ pair: NEET }));
  assert.equal(r.code, 400); assert.match(r.body.error, /isn't an approved community main/);
  r = await call(mk({ registry: async () => { throw new Error('down'); }, verify: okVerify }), req({ pair: NEET }));
  assert.equal(r.code, 503);
  r = await call(mk({ registry: approved, verify: async (m) => ({ ok: false, failures: ['freeze authority is not revoked'] }) }), req({ pair: NEET }));
  assert.equal(r.code, 409); assert.match(r.body.error, /freeze authority/);
  let verified = 0;
  r = await call(mk({ registry: approved, verify: async (m, o) => { verified++; assert.equal(o.rugcheck, false); return okVerify(m); } }), req({ pair: NEET }));
  assert.equal(r.code, 200, JSON.stringify(r.body)); assert.equal(verified, 1, 're-verified for this build');
  assert.equal(r.body.pair, NEET); assert.equal(r.body.quoteMint, NEET); assert.equal(r.body.community, true); assert.equal(r.body.quoteTicker, '$NEET'); assert.equal(r.body.serverSigned, false);
  const tx = K.VersionedTransaction.deserialize(Buffer.from(r.body.tx, 'base64'));
  assert.equal(tx.message.header.numRequiredSignatures, 2); assert.ok(tx.signatures.every((s) => s.every((b) => b === 0)), 'server signed nothing');
  // Empty-field validation call (how the preview is checked without a wallet): pair accepted, only the missing fields are reported.
  r = await call(mk({ registry: approved, verify: okVerify }), { pair: NEET });
  assert.equal(r.code, 400); assert.doesNotMatch(r.body.error, /pair must be/); assert.match(r.body.error, /player wallet address is invalid/);
  // Official pairs never touch the registry.
  r = await call(mk({ registry: async () => { throw new Error('must not be called'); }, verify: okVerify }), req({ pair: 'FOOD' }));
  assert.equal(r.code, 200);
});

test('GET ?pairCheck=<mint> runs the verifier read-only; bad input is refused', async () => {
  const h = makeLaunchHandler({ env: {}, store: memoryStore(), deps: deps(), community: { verify: okVerify, registry: approved } });
  let r = await call(h, null, { pairCheck: NEET }, 'GET'); assert.equal(r.code, 200); assert.equal(r.body.ok, true);
  r = await call(h, null, { pairCheck: 'not-a-mint' }, 'GET'); assert.equal(r.code, 400);
  r = await call(h, null, {}, 'GET'); assert.deepEqual(r.body.pairs, ['KIBBLE', 'FLC', 'FOOD', 'AUTISM', 'SOL']); assert.match(r.body.community, /pair=<mint>/);
});

test('verifier (mocked RPC): authorities, metadata, liquidity floor and red flags', async () => {
  const now = Date.UTC(2026, 10, 13);
  const acct = (info) => ({ result: { value: { owner: T22, data: { parsed: { type: 'mint', info: { decimals: 6, supply: '1', extensions: [{ extension: 'tokenMetadata', state: { name: 'Neet', symbol: 'NEET', uri: '', updateAuthority: null } }], ...info } } } } } });
  const fx = (info, liq) => async (url) => ({ ok: true, status: 200, json: async () => (String(url).includes('dexscreener') ? [{ chainId: 'solana', baseToken: { address: NEET }, liquidity: { usd: liq }, marketCap: 2e6, pairCreatedAt: now - 3 * 864e5, dexId: 'pumpswap' }] : acct(info)) });
  const routeDeps = { resolveQuote: async () => ({}), resolveFirstHop: async () => ({ venue: 'pool' }) };
  let v = await verifyCommunityMint(NEET, { rpcUrl: 'x', f: fx({ mintAuthority: null, freezeAuthority: null }, 50_000), routeDeps, now, rugcheck: false });
  assert.equal(v.ok, true, JSON.stringify(v.failures)); assert.equal(v.venue, 'pumpswap-pool'); assert.deepEqual(v.redFlags, ['only one trading pool']);
  v = await verifyCommunityMint(NEET, { rpcUrl: 'x', f: fx({ mintAuthority: 'AAAA', freezeAuthority: 'BBBB' }, 4_000), routeDeps, now, rugcheck: false });
  assert.equal(v.ok, false); assert.ok(v.failures.some((x) => /mint authority/.test(x))); assert.ok(v.failures.some((x) => /freeze authority/.test(x)));
  assert.ok(v.failures.some((x) => /below the \$5,000 minimum/.test(x))); assert.equal(COMMUNITY_RULES.minLiquidityUsd, 5000);
  v = await verifyCommunityMint(NEET, { rpcUrl: 'x', f: fx({ mintAuthority: null, freezeAuthority: null }, 50_000), routeDeps: { resolveQuote: async () => ({}), resolveFirstHop: async () => { throw new Error('No tradable curve'); } }, now, rugcheck: false });
  assert.equal(v.ok, false); assert.equal(v.checks.solRoute, false);
  v = await verifyCommunityMint('nope', {}); assert.equal(v.ok, false);
});

test('Metaplex metadata decoder reads name/symbol/uri/isMutable', () => {
  const s = (t) => { const b = Buffer.from(t); const l = Buffer.alloc(4); l.writeUInt32LE(b.length); return Buffer.concat([l, b]); };
  const buf = Buffer.concat([Buffer.from([4]), Buffer.alloc(64), s('Bonk\0\0'), s('BONK'), s('https://x.io/m.json'), Buffer.from([0, 0]), Buffer.from([0]), Buffer.from([1]), Buffer.from([0])]);
  const d = decodeMetaplex(buf); assert.equal(d.name, 'Bonk'); assert.equal(d.symbol, 'BONK'); assert.equal(d.uri, 'https://x.io/m.json'); assert.equal(d.isMutable, false);
});

// No-extension launch: server builds UNSIGNED pump.fun txs only; player = fee payer + creator; mint key never leaves the browser.
// All external services (Solana RPC, Pinata, Phantom) are mocked. Uses the real pump.fun SDK instruction builders (vendored)
// with a mainnet Global/FeeConfig snapshot (tests/fixtures/pump-accounts.json).
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import crypto from 'node:crypto';
import { makeLaunchHandler } from '../api/launch.js';
import { publicConfig } from '../api/config.js';
import { makeHandler, memoryStore, b58encode, PUMP_PROGRAM } from '../api/coins.js';
import { kit as K, decodeAccount, validateBuild, carriesSecret, KIBBLE_MINT } from '../api/_lib/launchtx.js';
import * as NX from '../src/noext.js';
import * as CK from '../src/vendor/phantom-kit.js';
import { minLamports } from '../src/launchcost.js';
const FX = JSON.parse(fs.readFileSync(new URL('./fixtures/pump-accounts.json', import.meta.url)));
const TOKEN_2022 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const IMG = 'data:image/png;base64,' + Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4c00000000049454e44ae426082', 'hex').toString('base64');

function mocks() { const sent = [];
  const rpc = { global: async () => K.PUMP_SDK.decodeGlobal(decodeAccount(FX.global)), feeConfig: async () => K.PUMP_SDK.decodeFeeConfig(decodeAccount(FX.feeConfig)),
    resolveQuote: async () => ({ source: 'pumpCoin', quoteTokenProgram: new K.PublicKey(TOKEN_2022), pumpQuote: { accounts: { chain: [] }, depth: 1 } }),
    blockhash: async () => 'GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi', simulate: async () => ({ err: null, units: 150000, balance: 1e9, cost: 5_430_360 }),
    conn: { sendRawTransaction: async (b) => { sent.push(Buffer.from(b)); const t = K.VersionedTransaction.deserialize(b); return b58encode(t.signatures[0]); },
      getSignatureStatuses: async () => ({ value: [{ confirmationStatus: 'confirmed', err: null }] }), getBalance: async () => 123456789 } };
  return { rpc, sent }; }
const call = (h, { method = 'GET', url = '/api/launch', body, ip = '1.2.3.4' } = {}) => new Promise((done) => { const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { done({ code: this.statusCode, headers: this.headers, raw: b, body: (() => { try { return JSON.parse(b); } catch { return null; } })() }); } };
  h({ method, url, query: Object.fromEntries(new URL(url, 'http://x').searchParams), body, headers: { 'x-forwarded-for': ip } }, res); });
// fetch() that routes into the real handlers, recording every request body the browser would send
function router(launch, coins, log) { return async (url, o = {}) => { log.push({ url, body: o.body || '' }); const h = url.startsWith('/api/coins') ? coins : launch;
  const r = await call(h, { method: o.method || 'GET', url, body: o.body ? JSON.parse(o.body) : undefined }); return { ok: r.code < 300, status: r.code, json: async () => r.body }; }; }
const player = CK.Keypair.generate(); // test-only stand-in for the player's wallet
const unsignedOf = (b64) => K.VersionedTransaction.deserialize(Buffer.from(b64, 'base64'));
const spki = (pub) => crypto.createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(pub)]), format: 'der', type: 'spki' });
const verifySig = (tx, i) => crypto.verify(null, Buffer.from(tx.message.serialize()), spki(tx.message.staticAccountKeys[i].toBytes()), Buffer.from(tx.signatures[i]));

for (const [label, extra] of [['SOL, no dev buy', {}], ['SOL + 0.05 SOL dev buy', { devBuySol: 0.05 }], ['$KIBBLE pair', { pair: 'KIBBLE' }]]) {
  test(`build (${label}) returns an UNSIGNED tx: fee payer + creator = player, signers = {player, browser mint}, no server signer`, async () => {
    const { rpc } = mocks(), h = makeLaunchHandler({ env: {}, store: memoryStore(), deps: rpc }), mint = CK.Keypair.generate().publicKey.toBase58(), me = player.publicKey.toBase58();
    const r = await call(h, { method: 'POST', body: { action: 'build', player: me, mint, name: 'Shiba Star', symbol: 'STAR', uri: 'https://ipfs.io/ipfs/bafytest', ...extra } });
    assert.equal(r.code, 200, JSON.stringify(r.body)); assert.equal(r.body.serverSigned, false); assert.equal(r.body.feePayer, me); assert.equal(r.body.creator, me);
    const tx = unsignedOf(r.body.tx), n = tx.message.header.numRequiredSignatures, keys = tx.message.staticAccountKeys.map((k) => k.toBase58());
    assert.equal(keys[0], me, 'fee payer is the player'); assert.equal(n, 2); assert.deepEqual(keys.slice(0, n).sort(), [me, mint].sort(), 'only player + mint sign');
    assert.ok(tx.signatures.every((s) => s.every((b) => b === 0)), 'no signature present: server signed nothing');
    assert.ok(keys.includes(PUMP_PROGRAM), 'calls pump.fun');
    const create = tx.message.compiledInstructions.find((ix) => keys[ix.programIdIndex] === PUMP_PROGRAM); // create_v2: accounts[0] mint, creator arg = player
    assert.equal(keys[create.accountKeyIndexes[0]], mint); assert.ok(Buffer.from(create.data).includes(Buffer.from(player.publicKey.toBytes())), 'creator argument = player');
    if (extra.pair === 'KIBBLE') { assert.ok(keys.includes(KIBBLE_MINT), '$KIBBLE quote mint passed'); assert.equal(r.body.quoteMint, KIBBLE_MINT); }
    assert.equal(r.body.minLamports.total, minLamports(extra).total); }); }

test('server refuses anything that looks like a key, bad pairs ($WALLETFLWR is not offered) and $KIBBLE dev buys', async () => {
  const { rpc } = mocks(), h = makeLaunchHandler({ env: {}, store: memoryStore(), deps: rpc }), kp = CK.Keypair.generate(), me = player.publicKey.toBase58();
  const base = { action: 'build', player: me, mint: kp.publicKey.toBase58(), name: 'X', symbol: 'X', uri: 'https://ipfs.io/ipfs/x1234567' };
  for (const bad of [{ mintSecretKey: b58encode(kp.secretKey) }, { mintKeypair: Array.from(kp.secretKey) }, { extra: Array.from(kp.secretKey) }, { note: b58encode(kp.secretKey) }]) {
    const r = await call(h, { method: 'POST', body: { ...base, ...bad } }); assert.equal(r.code, 400); assert.match(r.body.error, /Never send private keys/); }
  assert.equal((await call(h, { method: 'POST', body: { ...base, pair: 'WALLETFLWR' } })).code, 400);
  assert.equal((await call(h, { method: 'POST', body: { ...base, pair: 'KIBBLE', devBuySol: 0.1 } })).code, 400);
  assert.equal((await call(h, { method: 'POST', body: { ...base, mint: me } })).code, 400);
  assert.equal(carriesSecret({ player: me, mint: kp.publicKey.toBase58() }), false); assert.equal(validateBuild({ ...base, devBuySol: 99 }).ok, false);
  const src = ['src/noext.js', 'src/launchui.js', 'api/launch.js', 'api/_lib/launchtx.js'].map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  assert.doesNotMatch(src, /WALLETFLWR/i); assert.doesNotMatch(fs.readFileSync('api/launch.js', 'utf8') + fs.readFileSync('api/_lib/launchtx.js', 'utf8'), /Keypair\.(generate|from)|secretKey|\.sign\(/, 'server code never creates or uses a keypair'); });

async function e2e(walletFactory) {
  const { rpc, sent } = mocks(), store = memoryStore(), launch = makeLaunchHandler({ env: {}, store, deps: rpc }); let mintSeen = null;
  const coins = makeHandler({ env: {}, store, deps: { sessionWallet: async () => null, dexInfo: async () => null, pairs: async () => ({ pairs: [] }), now: () => 1e12,
    launchTx: async (sig) => ({ ok: true, feePayer: player.publicKey.toBase58(), keys: [player.publicKey.toBase58(), mintSeen, PUMP_PROGRAM], blockTime: 1e9 }),
    pumpCreator: async (m) => (m === mintSeen ? { ok: true, creator: player.publicKey.toBase58() } : { ok: false, reason: 'nope' }) } });
  const log = [], api = NX.apiClient(router(launch, coins, log)), realGen = CK.Keypair.generate; let mintKp = null;
  const kit = { ...CK, Keypair: { generate: () => (mintKp = realGen.call(CK.Keypair), mintSeen = mintKp.publicKey.toBase58(), mintKp) } };
  const steps = []; const wallet = walletFactory(kit);
  const out = await NX.launchCoin({ form: { name: 'Shiba Star', symbol: 'STAR', description: 'gm', twitter: 'https://x.com/inu', image: IMG, pair: 'SOL', devBuySol: 0.02 }, wallet, kit, api, onStep: (s) => steps.push(s), sleep: async () => {} });
  return { out, log, sent, mintKp, steps, store };
}
function assertNoSecret(log, kp) { const sk = Buffer.from(kp.secretKey), seed = sk.subarray(0, 32);
  const forms = [b58encode(sk), sk.toString('base64'), sk.toString('hex'), b58encode(seed), seed.toString('base64'), seed.toString('hex'), Array.from(sk).join(','), Array.from(seed).join(',')];
  for (const { url, body } of log) for (const f of forms) assert.ok(!body.includes(f) && !url.includes(f), 'mint secret leaked to ' + url); }

test('extension path end to end: Phantom signs first, mint co-signs in the browser, mint secret never sent, coin auto-registered', async () => {
  const provider = { isPhantom: true, publicKey: player.publicKey, connect: async () => ({ publicKey: player.publicKey }),
    signTransaction: async (tx) => { const t = CK.VersionedTransaction.deserialize(tx.serialize()); t.sign([player]); return t; } };
  const { out, log, sent, mintKp, steps } = await e2e(() => NX.extensionWallet(provider));
  assert.equal(out.registered, true, out.regError); assert.deepEqual(steps, ['meta', 'build', 'sign', 'confirm', 'register', 'done']);
  assertNoSecret(log, mintKp); assert.ok(log.every((l) => !/secret|private|seed/i.test(l.body)));
  const build = JSON.parse(log.find((l) => l.body.includes('"build"')).body); assert.equal(build.mint, mintKp.publicKey.toBase58()); assert.equal(build.player, player.publicKey.toBase58());
  assert.equal(sent.length, 1); const tx = K.VersionedTransaction.deserialize(sent[0]); assert.ok(verifySig(tx, 0) && verifySig(tx, 1), 'player + mint signatures valid'); });

test('embedded (Google/Apple) path: signAndSendTransaction with mint co-signing in presignTransaction (no pre-signed tx), never sends the mint key', async () => {
  let presigned = 0;
  const sdk = { solana: { publicKey: player.publicKey.toBase58(), signAndSendTransaction: async (tx, opts) => {
    assert.ok(tx.signatures.every((s) => s.every((b) => b === 0)), 'handed to Phantom unsigned'); assert.equal(typeof opts.presignTransaction, 'function');
    const back = CK.VersionedTransaction.deserialize(CK.base64urlDecode(await opts.presignTransaction(CK.base64urlEncode(tx.serialize()), { networkId: 'solana:mainnet' }))); presigned++;
    back.sign([player]); assert.ok(verifySig(back, 0) && verifySig(back, 1)); return { signature: b58encode(back.signatures[0]) }; } }, connect: async () => {}, disconnect: async () => {} };
  const { out, log, mintKp } = await e2e((kit) => NX.embeddedWallet(sdk, kit));
  assert.equal(presigned, 1); assert.equal(out.registered, true); assertNoSecret(log, mintKp); });

test('client refuses txs it did not ask for; relay refuses unsigned txs', async () => {
  const { rpc } = mocks(), h = makeLaunchHandler({ env: {}, store: memoryStore(), deps: rpc }), mint = CK.Keypair.generate().publicKey.toBase58(), me = player.publicKey.toBase58();
  const r = await call(h, { method: 'POST', body: { action: 'build', player: me, mint, name: 'A', symbol: 'A', uri: 'https://ipfs.io/ipfs/abcdefgh' } }); const tx = unsignedOf(r.body.tx);
  assert.throws(() => NX.checkUnsignedTx(tx, CK.Keypair.generate().publicKey.toBase58(), mint), /fee payer/); assert.throws(() => NX.checkUnsignedTx(tx, me, CK.Keypair.generate().publicKey.toBase58()), /signers/);
  assert.equal((await call(h, { method: 'POST', body: { action: 'send', tx: r.body.tx } })).code, 400); });

test('board registration by launch tx: fee payer must equal the pump.fun creator; tx must create that mint', async () => {
  const me = player.publicKey.toBase58(), other = CK.Keypair.generate().publicKey.toBase58(), mint = 'HgBRWfYxEfvPhtqkaeymCQtHCrKE46qQ43pKe8HCpump', sig = '5'.repeat(88);
  const mk = (lt, creator) => makeHandler({ env: {}, store: memoryStore(), deps: { sessionWallet: async () => null, dexInfo: async () => null, now: () => 1e12, launchTx: async () => lt, pumpCreator: async () => ({ ok: true, creator }) } });
  const reg = (h, body = {}) => call(h, { method: 'POST', url: '/api/coins', body: { action: 'register', mint, signature: sig, name: 'Shiba Star', symbol: 'STAR', ...body } });
  assert.equal((await reg(mk({ ok: true, feePayer: me, keys: [me, mint, PUMP_PROGRAM, KIBBLE_MINT], blockTime: 1e9 }, other))).code, 403);
  assert.equal((await reg(mk({ ok: true, feePayer: me, keys: [me, PUMP_PROGRAM], blockTime: 1e9 }, me))).code, 400);
  assert.equal((await reg(mk({ ok: true, feePayer: me, keys: [me, mint, PUMP_PROGRAM], blockTime: 1e9 - 90000 }, me))).code, 400);
  assert.equal((await reg(mk({ ok: true, feePayer: me, keys: [me, mint, PUMP_PROGRAM], blockTime: 1e9 }, me), { signature: undefined })).code, 401);
  const ok = await reg(mk({ ok: true, feePayer: me, keys: [me, mint, PUMP_PROGRAM, KIBBLE_MINT], blockTime: 1e9 }, me));
  assert.equal(ok.code, 200); assert.equal(ok.body.coin.creator, me); assert.equal(ok.body.coin.proof, 'launch transaction'); assert.equal(ok.body.coin.pairedWithKibble, true); assert.equal(ok.body.coin.symbol, 'STAR'); });

test('metadata: hosted fallback (no PINATA_JWT) and Pinata IPFS path; bad input rejected', async () => {
  const store = memoryStore(), h = makeLaunchHandler({ env: {}, store, deps: mocks().rpc });
  const r = await call(h, { method: 'POST', body: { action: 'metadata', name: 'Shiba Star', symbol: 'star', description: 'gm', website: 'https://inu.dog', image: IMG } });
  assert.equal(r.code, 200); assert.equal(r.body.storage, 'hosted'); assert.match(r.body.uri, /^https:\/\/inu-verse-tawny\.vercel\.app\/api\/launch\?meta=[a-f0-9]{32}$/);
  const m = await call(h, { url: '/api/launch?meta=' + r.body.uri.split('=')[1] }); assert.equal(m.body.symbol, 'STAR'); assert.equal(m.body.image, r.body.image); assert.equal(m.body.website, 'https://inu.dog');
  const im = await call(h, { url: '/api/launch?img=' + r.body.image.split('=')[1] }); assert.equal(im.headers['content-type'], 'image/png');
  assert.equal((await call(h, { method: 'POST', body: { action: 'metadata', name: 'A', symbol: 'A', image: 'data:text/html;base64,PGI+' } })).code, 400);
  assert.equal((await call(h, { method: 'POST', body: { action: 'metadata', name: 'A', symbol: 'A', twitter: 'javascript:alert(1)', image: IMG } })).code, 400);
  let n = 0; const f = async (u, o) => { n++; assert.equal(u, 'https://uploads.pinata.cloud/v3/files'); assert.match(o.headers.authorization, /^Bearer /); return { ok: true, status: 200, json: async () => ({ data: { cid: 'bafy' + n } }) }; };
  const hp = makeLaunchHandler({ env: { PINATA_JWT: 'test-jwt' }, store, deps: mocks().rpc, f });
  const p = await call(hp, { method: 'POST', body: { action: 'metadata', name: 'Shiba Star', symbol: 'STAR', image: IMG } }); assert.equal(p.body.storage, 'ipfs'); assert.equal(p.body.uri, 'https://ipfs.io/ipfs/bafy2'); assert.equal(n, 2); });

test('config: social login only when PHANTOM_APP_ID is set; min SOL maths', () => {
  assert.equal(publicConfig({}).socialLogin, false); assert.equal(publicConfig({}).phantomAppId, null);
  const c = publicConfig({ PHANTOM_APP_ID: '0b1c2d3e-aaaa-bbbb-cccc-1234567890ab' }); assert.equal(c.socialLogin, true); assert.equal(c.redirectUrl, 'https://inu-verse-tawny.vercel.app/');
  assert.ok(minLamports().total > 5e6 && minLamports().total < 1e7); assert.ok(minLamports({ devBuySol: 0.1 }).total > 0.1e9 + 5e6); assert.equal(minLamports({ pair: 'KIBBLE', devBuySol: 1 }).parts.devBuy, 0); });

// ---- Server-side RPC proxy: allowlist, rate limit, and the provider key never leaves the server ----
import { rpcUrl, redact, RPC_ALLOW, rpcProvider } from '../api/_lib/rpc.js';
const FAKE_KEY = 'test-helius-key-0000-1111-2222';
test('RPC proxy forwards only allowlisted methods to the server-side RPC and is rate limited', async () => {
  const seen = []; const f = async (url, o) => { seen.push({ url, body: JSON.parse(o.body) }); return { ok: true, status: 200, json: async () => ({ result: { value: 42 } }) }; };
  const env = { HELIUS_API_KEY: FAKE_KEY }, h = makeLaunchHandler({ env, store: memoryStore(), deps: mocks().rpc, f, limits: { metadata: 1, build: 1, send: 1, rpc: 3 } });
  assert.deepEqual([...RPC_ALLOW].sort(), ['getAccountInfo', 'getBalance', 'getLatestBlockhash', 'getSignatureStatuses']);
  const ok = await call(h, { method: 'POST', body: { action: 'rpc', method: 'getBalance', params: [player.publicKey.toBase58()] } });
  assert.equal(ok.code, 200); assert.deepEqual(ok.body, { result: { value: 42 }, rpcProvider: 'HL' });
  assert.equal(seen[0].url, 'https://mainnet.helius-rpc.com/?api-key=' + FAKE_KEY, 'server builds the Helius URL from HELIUS_API_KEY'); assert.equal(seen[0].body.method, 'getBalance');
  for (const m of ['getProgramAccounts', 'sendTransaction', 'requestAirdrop', 'getSignaturesForAddress', '__proto__', '']) {
    const r = await call(h, { method: 'POST', body: { action: 'rpc', method: m, params: [] }, ip: '9.9.9.' + m.length }); assert.equal(r.code, 400, m); assert.match(r.body.error, /not allowed/); }
  assert.equal(seen.length, 1, 'disallowed methods never reach the RPC');
  for (let i = 0; i < 2; i++) assert.equal((await call(h, { method: 'POST', body: { action: 'rpc', method: 'getLatestBlockhash' } })).code, 200);
  assert.equal((await call(h, { method: 'POST', body: { action: 'rpc', method: 'getLatestBlockhash' } })).code, 429, 'per-IP rate limit');
});
test('the RPC URL / API key never appears in any response: proxy errors, launch errors, coins errors, /api/config', async () => {
  const URL_ = 'https://mainnet.helius-rpc.com/?api-key=' + FAKE_KEY;
  for (const env of [{ SOLANA_RPC: URL_ }, { HELIUS_API_KEY: FAKE_KEY }]) {
    assert.equal(rpcUrl(env), URL_);
    const leak = (s) => { const t = JSON.stringify(s); assert.ok(!t.includes(FAKE_KEY) && !/helius|api-key=(?!\[redacted\])/i.test(t), 'leaked: ' + t); };
    const boom = async () => { throw new Error('request to ' + URL_ + ' failed, reason: ECONNRESET'); };
    const rpcErr = async () => ({ ok: true, status: 200, json: async () => ({ error: { message: 'bad request for ' + URL_ } }) });
    for (const f of [boom, rpcErr]) { const h = makeLaunchHandler({ env, store: memoryStore(), deps: mocks().rpc, f });
      const r = await call(h, { method: 'POST', body: { action: 'rpc', method: 'getBalance', params: ['x'] } }); assert.equal(r.code, 502); leak(r.body); }
    const failing = { ...mocks().rpc, conn: { getBalance: boom, getSignatureStatuses: boom, sendRawTransaction: boom }, blockhash: boom };
    const h = makeLaunchHandler({ env, store: memoryStore(), deps: failing });
    for (const url of ['/api/launch?balance=' + player.publicKey.toBase58(), '/api/launch?sig=' + b58encode(new Uint8Array(64).fill(7))]) leak((await call(h, { url })).body);
    leak((await call(h, { method: 'POST', body: { action: 'build', player: player.publicKey.toBase58(), mint: CK.Keypair.generate().publicKey.toBase58(), name: 'A', symbol: 'A', uri: 'https://ipfs.io/ipfs/x1234567' } })).body);
    const coins = makeHandler({ env, store: memoryStore(), deps: { launchTx: boom } });
    leak((await call(coins, { method: 'POST', url: '/api/coins', body: { action: 'register', signature: b58encode(new Uint8Array(64).fill(3)) } })).body);
    leak(publicConfig({ ...env, PHANTOM_APP_ID: 'app' }));
    assert.equal(redact('x ' + URL_ + ' y', env), 'x [rpc] y'); }
  makeLaunchHandler({ env: {} }); makeHandler({ env: {}, store: memoryStore() }); // reset module-level env for later tests
});
test('no browser code contains an RPC key or provider URL', () => {
  const files = ['index.html', ...fs.readdirSync('src', { recursive: true }).filter((f) => /\.(js|html|css)$/.test(f)).map((f) => 'src/' + f)];
  for (const f of files) { const t = fs.readFileSync(f, 'utf8'); assert.doesNotMatch(t, /helius|api-key=/i, f); }
});
test('rpc provider diagnostic reports only the endpoint kind (HL | custom | public), never the key', async () => {
  assert.equal(rpcProvider({}), 'public'); assert.equal(rpcProvider({ HELIUS_API_KEY: FAKE_KEY }), 'HL'); assert.equal(rpcProvider({ SOLANA_RPC: 'https://x.example/rpc' }), 'custom');
  const f = async () => ({ ok: true, status: 200, json: async () => ({ result: { value: 1 } }) });
  for (const [env, want] of [[{ HELIUS_API_KEY: FAKE_KEY }, 'HL'], [{}, 'public']]) {
    const h = makeLaunchHandler({ env, store: memoryStore(), deps: mocks().rpc, f });
    const r = await call(h, { method: 'POST', body: { action: 'rpc', method: 'getBalance', params: [player.publicKey.toBase58()] } });
    assert.equal(r.code, 200); assert.equal(r.body.rpcProvider, want); assert.equal(r.headers['x-rpc-provider'], want);
    const b = await call(h, { url: '/api/launch?balance=' + player.publicKey.toBase58() }); assert.equal(b.headers['x-rpc-provider'], want);
    assert.ok(!JSON.stringify([r.body, r.headers, b.body, b.headers]).includes(FAKE_KEY)); }
  makeLaunchHandler({ env: {} });
});

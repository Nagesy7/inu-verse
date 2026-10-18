// $KIBBLE creator fee split: on-chain SharingConfig first, creator-signed declaration second; named wallets; signing flow.
import test from 'node:test'; import assert from 'node:assert/strict';
import crypto from 'node:crypto'; import fs from 'node:fs'; import path from 'node:path';
import * as V from '../api/_lib/verified.js';
import { sharingConfigOf, PUMP_FEES } from '../api/_lib/clean.js';
import { makeHandler, memoryStore, bondingCurveOf, b58decode as _d, b58encode, PUMP_PROGRAM, KIBBLE_MINT } from '../api/coins.js';
import * as WL from '../src/wallets.js';
import { declarationMessage, b58 } from '../src/declaration.js';
import * as VF from '../src/verified.js';

const b58d = (s) => Buffer.from(_d(s)), T0 = 1_800_000_000_000;
function keypair() { const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519'); const pub = b58encode(publicKey.export({ format: 'der', type: 'spki' }).subarray(-32)); return { pub, sign: (msg) => b58(crypto.sign(null, Buffer.from(msg, 'utf8'), privateKey)) }; }
const CREATOR = keypair(), OTHER = keypair();
const OFFICIAL = WL.KIBBLE_SPLIT.map((s) => ({ address: s.address, bps: s.bps }));
function sharingBuf(mint, holders) { const b = Buffer.alloc(80 + holders.length * 34); Buffer.from([216, 74, 9, 0, 56, 140, 93, 75]).copy(b, 0); b[10] = 1; b58d(mint).copy(b, 11); b58d(WL.WALLETS.boneVault.address).copy(b, 43); b[75] = 1;
  b.writeUInt32LE(holders.length, 76); holders.forEach((h, i) => { b58d(h.address).copy(b, 80 + i * 34); b.writeUInt16LE(h.bps, 112 + i * 34); }); return b; }
function rpcFor(mint, { creator = CREATOR.pub, sharing = null } = {}) { return { calls: 0, batch: async (r) => r.map(() => null), one: async (m, p) => {
  if (m === 'getAccountInfo' && p[0] === sharingConfigOf(mint)) return { value: sharing ? { owner: PUMP_FEES, data: [sharingBuf(mint, sharing).toString('base64'), 'base64'] } : null };
  if (m === 'getAccountInfo' && p[0] === bondingCurveOf(mint)) { const b = Buffer.alloc(81); b58d(creator).copy(b, 49); return { value: { owner: PUMP_PROGRAM, data: [b.toString('base64'), 'base64'] } }; }
  throw new Error('unexpected ' + m); } }; }
const declare = (kp, { mint = KIBBLE_MINT, split = OFFICIAL, issuedAt = T0, symbol = 'KIBBLE', signer = kp.pub } = {}) => { const d = { mint, symbol, split, signer, issuedAt }; return { ...d, signature: kp.sign(declarationMessage(d)) }; };

test('Sharing-config PDA for $KIBBLE derives to D81S… (seeds ["sharing-config", mint], Pump Fees program)', () => {
  assert.equal(PUMP_FEES, 'pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ'); assert.equal(sharingConfigOf(KIBBLE_MINT), 'D81SsjvoeEXFxjQgEGLTcG5cnT6dYJXk1XE2Nh9eHzM8'); });
test('on-chain pass: the config exists and matches 40/35/25 to the named wallets', async () => {
  const c = await V.checkFeeSplit(KIBBLE_MINT, rpcFor(KIBBLE_MINT, { sharing: OFFICIAL }), { creator: CREATOR.pub }); assert.equal(c.status, 'pass', c.note); assert.equal(c.splitSource, 'onchain');
  assert.match(c.note, /40% Kennel Chest, 35% President's Vault, 25% Bone Vault/); assert.match(c.source, /^On-chain: pump\.fun fee-sharing config D81S/); });
test('on-chain config that differs from the published split fails with the reason', async () => {
  const c = await V.checkFeeSplit(KIBBLE_MINT, rpcFor(KIBBLE_MINT, { sharing: [{ address: WL.WALLETS.kennelChest.address, bps: 5000 }, { address: WL.WALLETS.presidentsVault.address, bps: 5000 }] }));
  assert.equal(c.status, 'fail'); assert.match(c.note, /doesn't match the published split: Kennel Chest expected 40%, found 50%.*Bone Vault expected 25%, found none/); });
test('declaration pass: no on-chain config + a valid declaration signed by the on-chain creator, labelled as such', async () => {
  const c = await V.checkFeeSplit(KIBBLE_MINT, rpcFor(KIBBLE_MINT), { creator: CREATOR.pub, declaration: declare(CREATOR) }); assert.equal(c.status, 'pass', c.note); assert.equal(c.splitSource, 'declaration');
  assert.match(c.note, /^Published by creator — not enforced on-chain/); assert.match(c.source, /Published by creator — not enforced on-chain.*D81S…HzM8 not found/);
  const html = VF.breakdownHtml({ mint: KIBBLE_MINT, optIn: true, status: 'verified', checks: { feeSplit: c }, checkedAt: T0 }); assert.match(html, /Published by creator — not enforced on-chain/);
  for (const w of Object.values(WL.WALLETS)) { assert.ok(html.includes(`https://solscan.io/account/${w.address}`)); assert.ok(html.includes(w.name.replace("'", '&#39;'))); } assert.ok(html.includes(WL.SPLIT_NOTE.replace(/'/g, '&#39;').replace(/\$/g, '$'))); });
test('mismatch fails: on-chain config vs declaration, and a declaration that differs from the published split', async () => {
  const mint = b58encode(Buffer.alloc(32, 9)), mine = [{ address: WL.WALLETS.kennelChest.address, bps: 10000 }];
  const c = await V.checkFeeSplit(mint, rpcFor(mint, { sharing: [{ address: WL.WALLETS.boneVault.address, bps: 10000 }] }), { creator: CREATOR.pub, declaration: declare(CREATOR, { mint, split: mine, symbol: 'X' }) });
  assert.equal(c.status, 'fail'); assert.match(c.note, /creator's declared split|disagree/);
  const k = await V.checkFeeSplit(KIBBLE_MINT, rpcFor(KIBBLE_MINT), { creator: CREATOR.pub, declaration: declare(CREATOR, { split: mine }) }); assert.equal(k.status, 'fail'); assert.match(k.note, /doesn't match the published split/); });
test('bad signature fails', async () => { const d = declare(CREATOR); const bad = { ...d, signature: OTHER.sign(declarationMessage(d)) };
  const c = await V.checkFeeSplit(KIBBLE_MINT, rpcFor(KIBBLE_MINT), { creator: CREATOR.pub, declaration: bad }); assert.equal(c.status, 'fail'); assert.match(c.note, /signature does not match/);
  const tampered = { ...d, issuedAt: d.issuedAt + 1 }; assert.equal((await V.checkFeeSplit(KIBBLE_MINT, rpcFor(KIBBLE_MINT), { creator: CREATOR.pub, declaration: tampered })).status, 'fail'); });
test('non-creator signer fails (valid signature, wrong wallet)', async () => {
  const c = await V.checkFeeSplit(KIBBLE_MINT, rpcFor(KIBBLE_MINT), { creator: CREATOR.pub, declaration: declare(OTHER) }); assert.equal(c.status, 'fail'); assert.match(c.note, /is not the on-chain creator/); });
test('no config and no declaration fails; unreadable config is couldn\'t check', async () => {
  assert.equal((await V.checkFeeSplit(KIBBLE_MINT, rpcFor(KIBBLE_MINT))).status, 'fail');
  assert.equal((await V.checkFeeSplit(KIBBLE_MINT, { one: async () => { throw new Error('429'); } }, { declaration: declare(CREATOR) })).status, 'unknown'); });

function mkRes() { return { code: 0, body: '', setHeader() {}, end(b) { this.body = b || ''; }, get statusCode() { return this.code; }, set statusCode(c) { this.code = c; } }; }
test('API: creator signs once -> $KIBBLE opted in + declaration stored; creator read from chain; bad/expired/non-creator refused', async () => {
  const clock = { t: T0 }, store = memoryStore(() => clock.t);
  const h = makeHandler({ env: {}, store, deps: { now: () => clock.t, pumpCreator: async () => ({ ok: true, creator: CREATOR.pub }), verify: (m, ch, sc, decl) => V.verifiedChecks(m, { rpc: { ...rpcFor(m), one: async (meth, p) => { if (meth === 'getAccountInfo' && p[0] === m) return { value: { owner: 'x', data: { parsed: { info: { supply: '1000', mintAuthority: null, freezeAuthority: null } } } } }; return rpcFor(m).one(meth, p); } }, declaration: decl, now: clock.t }) } });
  const call = async (method, q, body) => { const res = mkRes(); await h({ method, query: q, body, headers: {}, url: '/api/coins' }, res); return { code: res.code || 200, j: JSON.parse(res.body || '{}') }; };
  const info = await call('GET', { declare: KIBBLE_MINT }); assert.equal(info.j.creator, CREATOR.pub); assert.equal(info.j.optIn, false); assert.deepEqual(info.j.split.map((s) => s.bps), [4000, 3500, 2500]);
  assert.equal((await call('GET', { verified: KIBBLE_MINT })).j.verified[KIBBLE_MINT], null, 'not opted in -> nothing');
  const post = (kp, o = {}) => { const d = declare(kp, o); return call('POST', {}, { action: 'declare', mint: KIBBLE_MINT, signer: d.signer, issuedAt: d.issuedAt, signature: d.signature }); };
  assert.equal((await post(OTHER)).code, 403); const bad = declare(CREATOR); assert.equal((await call('POST', {}, { action: 'declare', mint: KIBBLE_MINT, signer: CREATOR.pub, issuedAt: T0, signature: OTHER.sign(declarationMessage(bad)) })).code, 400);
  assert.equal((await post(CREATOR, { issuedAt: T0 - 11 * 60_000 })).code, 400, 'stale declaration refused');
  const ok = await post(CREATOR); assert.equal(ok.code, 200, JSON.stringify(ok.j)); assert.equal(ok.j.optIn, true); assert.match(ok.j.declaration.message, /Kennel Chest/);
  const v = (await call('GET', { verified: KIBBLE_MINT })).j.verified[KIBBLE_MINT]; assert.equal(v.optIn, true); assert.equal(v.checks.feeSplit.status, 'pass'); assert.equal(v.checks.feeSplit.splitSource, 'declaration'); });

test('named wallets: one constants module, name + short address + Solscan link everywhere', () => {
  assert.deepEqual(Object.values(WL.WALLETS).map((w) => [w.name, w.address]), [["President's Vault", 'BzLYTFAfUsjzQ5x8bx5BbPK4DFtaHrLCuferkvkxTNGJ'], ['Kennel Chest', 'Akk3DdxeRRLZABfpkFKYoDBk6Zim5wNLRYemNFjv56fn'], ['Bone Vault', 'Bv35NAj1XvfSGrQKpHHw29ojZmY4NYyUZr7rwXpPhW8Y']]);
  assert.equal(WL.shortAddr(WL.TREASURY_WALLET), 'BzLY…NGJ'); assert.match(WL.walletHtml(WL.PRIZE_POOL_WALLET), /<b>Kennel Chest<\/b> <a href="https:\/\/solscan\.io\/account\/Akk3DdxeRRLZABfpkFKYoDBk6Zim5wNLRYemNFjv56fn"[^>]*><code>Akk3…6fn<\/code>/);
  const lit = /BzLYTFAfUsjzQ5x8bx5BbPK4DFtaHrLCuferkvkxTNGJ|Akk3DdxeRRLZABfpkFKYoDBk6Zim5wNLRYemNFjv56fn|Bv35NAj1XvfSGrQKpHHw29ojZmY4NYyUZr7rwXpPhW8Y/;
  for (const dir of ['src', 'api']) for (const f of fs.readdirSync(dir, { recursive: true })) { const p = path.join(dir, String(f)); if (!/\.(m?js|cjs)$/.test(p) || p.includes('vendor') || p === path.join('src', 'wallets.js') || p.startsWith(path.join('src', 'sim'))) continue;
    assert.doesNotMatch(fs.readFileSync(p, 'utf8'), lit, `${p}: wallet address literal outside src/wallets.js`); }
  const main = fs.readFileSync('src/main.js', 'utf8'); assert.match(main, /President's treasury \(Solana\): \$\{WL\.walletHtml\(OWNER_WALLET\)\}/); assert.match(main, /Paid to the treasury, \$\{WL\.walletHtml\(TREASURY\)\}/); assert.match(main, /WL\.splitHtml\(WL\.KIBBLE_SPLIT\)/);
  assert.match(fs.readFileSync('src/flyui.js', 'utf8'), /walletHtml\(P\.prizeWallet\.address\)/); });
test('Bone Vault is always described with the exact dev-share line (card split, breakdown, wallet labels)', () => {
  assert.equal(WL.BONE_VAULT_LINE, 'Bone Vault receives the 25% dev share for hosting, tools and art, with part of it seeding the next Inu project after Inu Verse.');
  assert.ok(WL.splitHtml().includes(WL.BONE_VAULT_LINE)); assert.ok(WL.walletHtml(WL.DEV_WALLET, { role: true }).includes(WL.BONE_VAULT_LINE));
  const html = VF.breakdownHtml({ mint: KIBBLE_MINT, optIn: true, status: 'unknown', checks: { feeSplit: { status: 'pass', note: 'x', split: OFFICIAL } }, checkedAt: T0 }); assert.ok(html.includes(WL.BONE_VAULT_LINE));
  assert.doesNotMatch(WL.splitHtml(), /profit|yield|guarantee|returns? to holders|safe|sold|dev buy/i); });
test("wording near the split + signing copy: exact note, no 'safe' / 'sold' / 'dev buy', no advice", () => {
  assert.equal(WL.SPLIT_NOTE, 'How $KIBBLE creator fees are shared, published for transparency. This is not a payout promise to holders and there are no returns.');
  const html = WL.splitHtml(); assert.ok(html.includes('not a payout promise to holders and there are no returns'));
  for (const f of ['src/wallets.js', 'src/declaration.js', 'src/kibblesign.js', 'api/_lib/declaration.js', 'api/_lib/verified.js']) { const s = fs.readFileSync(f, 'utf8'); assert.doesNotMatch(s, /safe|\bsold\b|dev buy/i, f); }
  assert.doesNotMatch(declarationMessage({ mint: KIBBLE_MINT, symbol: 'KIBBLE', split: OFFICIAL, signer: CREATOR.pub, issuedAt: T0 }), /safe|sold|dev buy|profit|return/i); });
test('signing flow: signMessage only (never a transaction), no on-chain fee-sharing config flow, creator read from the server', () => {
  const s = fs.readFileSync('src/kibblesign.js', 'utf8'); assert.match(s, /\.signMessage\(/); assert.doesNotMatch(s, /signTransaction|signAndSendTransaction|sendTransaction|secretKey|privateKey/);
  assert.match(s, /\/api\/coins\?declare=/); assert.doesNotMatch(s, /Akk3|BzLY/); assert.doesNotMatch(s, /create_fee_sharing|createFeeSharing|update_fee_shares/i); });
test("no 'multisig' or 'Squads' anywhere in shipped copy", () => {
  const files = ['index.html', 'style.css', 'README.md']; for (const d of ['src', 'api', 'docs', 'reveal']) if (fs.existsSync(d)) for (const f of fs.readdirSync(d, { recursive: true })) files.push(path.join(d, String(f)));
  // api/_lib/pumpkit.cjs is a vendored library bundle (Solana SDK code, not copy) and src/vendor/* likewise
  for (const p of files) { if (!fs.existsSync(p) || fs.statSync(p).isDirectory() || /vendor|pumpkit\.cjs$|\.(png|jpe?g|gif|webp|ttf|woff2?|mp3|ogg|wav)$/i.test(p)) continue;
    assert.doesNotMatch(fs.readFileSync(p, 'utf8'), /multisig|squads/i, p); } });

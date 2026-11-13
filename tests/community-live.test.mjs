// Live mainnet checks for the community-main verifier (read-only RPC + DexScreener; nothing is signed or sent).
// Run with: LIVE=1 node --test tests/community-live.test.mjs   (skipped otherwise so CI stays offline)
import test from 'node:test'; import assert from 'node:assert/strict';
import { verifyCommunityMint } from '../api/_lib/community.js';
import { rpcDeps } from '../api/_lib/launchtx.js';
const live = process.env.LIVE === '1', rpcUrl = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
const opt = { skip: !live && 'set LIVE=1 to hit mainnet', timeout: 60_000 };
const run = (m) => verifyCommunityMint(m, { rpcUrl, routeDeps: rpcDeps(rpcUrl) });
test('AUTISM passes every on-chain check (blocked only because it is already an official main)', opt, async () => {
  const v = await run('LaZV2Qz2mzRVwN6xGcZJkG76ziquRmSU2TBy4gxpump');
  assert.equal(v.symbol, 'AUTISM'); assert.deepEqual({ ...v.checks, notOfficial: true }, { mint: true, authoritiesRevoked: true, metadata: true, safeExtensions: true, solRoute: true, liquidity: true, notOfficial: true });
  assert.equal(v.venue, 'pumpswap-pool'); assert.deepEqual(v.failures, ['this is already an official main']);
});
test('CHAIRMAN fails on its SOL route (quoted in $FOOD on its curve, no SOL pool)', opt, async () => {
  const v = await run('BiZev8AUeKT6nDyAJFTZwyn4oEh1BrGKNT83qBJvpump');
  assert.equal(v.ok, false); assert.equal(v.checks.solRoute, false); assert.ok(v.failures.some((f) => /no SOL buy route/.test(f)));
});
test('a random invalid mint fails', opt, async () => {
  assert.equal((await run('11111111111111111111111111111111')).ok, false);
  assert.equal((await run('4uTq3hTq3hTq3hTq3hTq3hTq3hTq3hTq3hTq3hTq3hT')).ok, false);
});
test('NEET (graduated pump.fun coin, PumpSwap pool) qualifies as a community main', opt, async () => {
  const v = await run('Ce2gx9KGXJ6C9Mp5b5x1sn9Mg87JwEbrQby4Zqo3pump');
  assert.equal(v.ok, true, JSON.stringify(v.failures)); assert.equal(v.symbol, 'NEET'); assert.equal(v.venue, 'pumpswap-pool'); assert.ok(v.liquidityUsd >= 5000);
});
test('BONK (SPL + Metaplex metadata) reads metadata but has no pump.fun SOL route', opt, async () => {
  const v = await run('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263');
  assert.equal(v.program, 'spl-token'); assert.equal(v.symbol, 'BONK'); assert.equal(v.checks.solRoute, false);
});

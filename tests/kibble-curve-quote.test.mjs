// Regression: the first hop of a $KIBBLE first-buy (SOL -> $KIBBLE on its live bonding curve) must be priced on the REAL curve.
// Before the fix the quote used a fresh initial curve (mintSupply: null), ~31% too high, so min-out failed on-chain (Custom 6004).
import test from 'node:test'; import assert from 'node:assert/strict';
import { kit as K, quoteCurveBuyAmount } from '../api/_lib/launchtx.js';
const { BN, PublicKey, getBuyTokenAmountFromSolAmount } = K;

// $KIBBLE curve as read from mainnet on 17 Nov 2026 (not complete, no creator fee).
const curve = { virtualTokenReserves: new BN('933346953274941'), virtualQuoteReserves: new BN('34488782740'), realTokenReserves: new BN('653446953274941'), realQuoteReserves: new BN('4488782740'),
  tokenTotalSupply: new BN('1000000000000000'), complete: false, creator: new PublicKey('Akk3DdxeRRLZABfpkFKYoDBk6Zim5wNLRYemNFjv56fn'), isMayhemMode: false, isCashbackCoin: false, quoteMint: PublicKey.default, creatorFeeBps: new BN(0) };
import fs from 'node:fs'; import { decodeAccount } from '../api/_lib/launchtx.js';
const FX = JSON.parse(fs.readFileSync(new URL('./fixtures/pump-accounts.json', import.meta.url)));
const global = K.PUMP_SDK.decodeGlobal(decodeAccount(FX.global)), feeConfig = K.PUMP_SDK.decodeFeeConfig(decodeAccount(FX.feeConfig));

test('quoteCurveBuyAmount prices the live curve, not a fresh initial curve', () => {
  const lamports = 10_000_000;
  const out = quoteCurveBuyAmount({ global, feeConfig, curve, amount: lamports });
  const ideal = BigInt(curve.virtualTokenReserves.toString()) * BigInt(lamports) / (BigInt(curve.virtualQuoteReserves.toString()) + BigInt(lamports)); // fee-free upper bound ~270.6e9
  assert.ok(BigInt(out.toString()) < ideal, 'fees make it smaller than the fee-free constant-product output');
  assert.ok(BigInt(out.toString()) > ideal * 95n / 100n, 'but within ~5% of it (real reserves)');
  const buggy = getBuyTokenAmountFromSolAmount({ global, feeConfig, mintSupply: null, bondingCurve: curve, amount: new BN(lamports), quoteMint: new PublicKey('So11111111111111111111111111111111111111112') });
  assert.ok(BigInt(buggy.toString()) > BigInt(out.toString()) * 120n / 100n, 'the old call (mintSupply: null) overquoted by ~30%');
});

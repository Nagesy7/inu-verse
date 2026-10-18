// Builds an UNSIGNED pump.fun create_v2 (+ optional dev buy) transaction for a player's wallet.
// The server never holds keys, SOL or tokens and never signs: it only assembles instructions with pump.fun's official
// SDK (@pump-fun/pump-sdk 4.1.0, vendored in pumpkit.cjs) and returns the serialized transaction with empty signatures.
// Signers: the player (fee payer + on-chain creator) and the NEW MINT, whose keypair is generated in the player's browser.
// Only the mint's PUBLIC key ever reaches us; requests that look like they carry a secret key are rejected.
import kit from "./pumpkit.cjs";
import { minLamports, MAX_DEV_BUY_SOL } from "../../src/launchcost.js";
const { PUMP_SDK, OnlinePumpSdk, getBuyTokenAmountFromSolAmount, BN, Connection, PublicKey, TransactionMessage, VersionedTransaction, ComputeBudgetProgram, GLOBAL_PDA, PUMP_FEE_CONFIG_PDA } = kit;
export { kit };
export const KIBBLE_MINT = "4VE9sy4fEMJdZ6i7MkYPbnqDJd2oqzJQmg44WJ3opump";
export const WSOL = "So11111111111111111111111111111111111111112";
export const PAIRS = { SOL: { quote: null, devBuy: true }, KIBBLE: { quote: KIBBLE_MINT, devBuy: false } }; // only SOL and $KIBBLE; no other pair asset is offered here
export const CU = { limit: 300_000, microLamports: 100_000 };
const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const SECRETISH = /secret|private|seed|mnemonic|keypair|signer/i;

// Reject anything that smells like key material: suspicious field names, 64-byte arrays, or 87-88 char base58 strings.
export function carriesSecret(v, depth = 0) {
  if (depth > 4 || v == null) return false;
  if (Array.isArray(v)) return v.length === 64 || v.some((x) => carriesSecret(x, depth + 1));
  if (typeof v === "string") return /^[1-9A-HJ-NP-Za-km-z]{86,90}$/.test(v);
  if (typeof v === "object") return Object.entries(v).some(([k, x]) => SECRETISH.test(k) || carriesSecret(x, depth + 1));
  return false;
}
const pk = (s) => { try { if (!B58.test(String(s || ""))) return null; const p = new PublicKey(s); return PublicKey.isOnCurve(p.toBytes()) ? p : null; } catch { return null; } };
export const cleanText = (s, n) => String(s ?? "").replace(/[<>\u0000-\u001f\u007f]/g, "").trim().slice(0, n);

export function validateBuild(body = {}) {
  const errors = [];
  if (carriesSecret(body)) return { ok: false, errors: ["Never send private keys or seed phrases. The mint keypair stays in your browser; send only its public key."] };
  const player = pk(body.player), mint = pk(body.mint);
  if (!player) errors.push("player wallet address is invalid");
  if (!mint) errors.push("mint public key is invalid");
  if (player && mint && player.equals(mint)) errors.push("mint must be a fresh key, not your wallet");
  const name = cleanText(body.name, 32), symbol = cleanText(body.symbol, 10).replace(/^\$/, "").toUpperCase();
  if (!name) errors.push("name is required (max 32)");
  if (!/^[A-Z0-9]{1,10}$/.test(symbol)) errors.push("ticker must be 1-10 letters/numbers");
  const uri = String(body.uri || "");
  if (!/^https:\/\/[^\s"'<>]{8,200}$/.test(uri)) errors.push("metadata uri must be https");
  const pair = body.pair === "KIBBLE" ? "KIBBLE" : body.pair == null || body.pair === "SOL" ? "SOL" : null;
  if (!pair) errors.push("pair must be SOL or KIBBLE");
  const devBuySol = Number(body.devBuySol || 0);
  if (!Number.isFinite(devBuySol) || devBuySol < 0 || devBuySol > MAX_DEV_BUY_SOL) errors.push(`dev buy must be 0-${MAX_DEV_BUY_SOL} SOL`);
  if (pair === "KIBBLE" && devBuySol > 0) errors.push("dev buy is SOL-pair only (a $KIBBLE-paired buy would spend $KIBBLE)");
  return errors.length ? { ok: false, errors } : { ok: true, v: { player, mint, name, symbol, uri, pair, devBuySol } };
}

// RPC-backed dependencies (replaced by mocks in tests).
export function rpcDeps(rpcUrl) {
  const conn = new Connection(rpcUrl, "confirmed"), online = new OnlinePumpSdk(conn);
  return {
    conn,
    global: () => online.fetchGlobal(),
    feeConfig: () => online.fetchFeeConfig().catch(() => null),
    resolveQuote: (mint) => online.resolveQuoteMint(new PublicKey(mint)),
    blockhash: async () => (await conn.getLatestBlockhash("confirmed")).blockhash,
    simulate: async (tx, payer) => { const pre = await conn.getBalance(payer, "confirmed");
      const r = await conn.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true, commitment: "confirmed", accounts: { encoding: "base64", addresses: [payer.toBase58()] } });
      const post = r.value.accounts?.[0]?.lamports; return { err: r.value.err, units: r.value.unitsConsumed ?? null, logs: (r.value.logs || []).slice(-6), balance: pre, cost: post == null ? null : pre - post }; },
  };
}
export const decodeAccount = (a) => ({ data: Buffer.from(a.data, "base64"), owner: new PublicKey(a.owner), lamports: a.lamports, executable: false, rentEpoch: 0 });

// Inspect a built transaction: who must sign, and whether any signature is already present.
export function inspectTx(tx) {
  const n = tx.message.header.numRequiredSignatures, keys = tx.message.staticAccountKeys;
  return { feePayer: keys[0].toBase58(), signers: keys.slice(0, n).map((k) => k.toBase58()), signed: tx.signatures.map((s) => s.some((b) => b !== 0)) };
}

export async function buildCreateTx(v, deps) {
  const { player, mint, name, symbol, uri, pair, devBuySol } = v;
  const ixs = [ComputeBudgetProgram.setComputeUnitLimit({ units: CU.limit }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: CU.microLamports })];
  let quote = null;
  if (pair === "KIBBLE") {
    quote = await deps.resolveQuote(KIBBLE_MINT); // throws UnsupportedQuoteMintError etc. when pump.fun does not accept it
    ixs.push(await PUMP_SDK.createV2Instruction({ mint, name, symbol, uri, creator: player, user: player, mayhemMode: false, quoteMint: new PublicKey(KIBBLE_MINT), quoteTokenProgram: quote.quoteTokenProgram, pumpQuote: quote.pumpQuote?.accounts }));
  } else if (devBuySol > 0) {
    const [global, feeConfig] = await Promise.all([deps.global(), deps.feeConfig()]);
    const solAmount = new BN(Math.round(devBuySol * 1e9));
    const amount = getBuyTokenAmountFromSolAmount({ global, feeConfig, mintSupply: null, bondingCurve: null, amount: solAmount, quoteMint: new PublicKey(WSOL) });
    ixs.push(...await PUMP_SDK.createV2AndBuyInstructions({ global, mint, name, symbol, uri, creator: player, user: player, amount, solAmount, mayhemMode: false }));
  } else {
    ixs.push(await PUMP_SDK.createV2Instruction({ mint, name, symbol, uri, creator: player, user: player, mayhemMode: false }));
  }
  const tx = new VersionedTransaction(new TransactionMessage({ payerKey: player, recentBlockhash: await deps.blockhash(), instructions: ixs }).compileToV0Message());
  const info = inspectTx(tx);
  // Hard guarantees: the player pays and creates; the only other signer is the browser-generated mint; nothing is signed here.
  if (info.feePayer !== player.toBase58()) throw new Error("internal: fee payer is not the player");
  if (info.signers.length !== 2 || !info.signers.includes(mint.toBase58())) throw new Error("internal: unexpected signer set " + info.signers.join(","));
  if (info.signed.some(Boolean)) throw new Error("internal: transaction must be unsigned");
  let simulation = null;
  if (deps.simulate) { try { const s = await deps.simulate(tx, player); simulation = { ok: !s.err, err: s.err ? JSON.stringify(s.err) : null, units: s.units, balance: s.balance, cost: s.cost, logs: s.err ? s.logs : [] }; } catch (e) { simulation = { ok: null, err: "simulation unavailable: " + String(e.message || e).slice(0, 120) }; } }
  return { tx: Buffer.from(tx.serialize()).toString("base64"), feePayer: info.feePayer, creator: player.toBase58(), signers: info.signers, mint: mint.toBase58(), pair, devBuySol,
    quoteMint: pair === "KIBBLE" ? KIBBLE_MINT : null, minLamports: minLamports({ devBuySol, pair }), simulation, serverSigned: false };
}

// Friendly explanation of common simulation failures.
export function explainSim(sim) {
  if (!sim || sim.ok !== false) return null; const e = sim.err || "";
  if (/AccountNotFound|insufficient|0x1\b|"Custom":1\b/.test(e) || (sim.balance === 0)) return "Your wallet needs more SOL first (see Top up).";
  if (/6063|6100|UnsupportedQuote|NotEligible/.test(e)) return "pump.fun is not accepting $KIBBLE as a pair right now. Launch with SOL, or use pump.fun's own page.";
  if (/6107/.test(e)) return "$KIBBLE is migrating to PumpSwap right now. Try the $KIBBLE pair again in a few minutes.";
  return "pump.fun rejected this launch in a dry run: " + e.slice(0, 140);
}

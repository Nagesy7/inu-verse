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
export const PAIRS = { KIBBLE: { quote: KIBBLE_MINT, devBuy: true }, SOL: { quote: null, devBuy: true } }; // $KIBBLE is the default; SOL stays available. No other pair asset is offered here.
export const DEFAULT_PAIR = "KIBBLE";
export const CU = { limit: 300_000, hopLimit: 450_000, microLamports: 100_000 };
export const SIG_FEE = 5000; // Solana base fee per signature (lamports)
export const SLIPPAGE_BPS = { def: 300, min: 50, max: 1500 };
// Public address lookup table that pump.fun traders widely use (pump program, global, fee + buyback recipients...).
// It only compresses account addresses so create + SOL→$KIBBLE→new coin fits in one 1232-byte transaction; it cannot move funds.
export const ROUTE_ALT = "Hyif6eWb8x88RVrvjPfabsgRYnwkVnyByEXTVTXbUcyP";
const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const TRADE_EVENT = Buffer.from([189, 219, 127, 211, 78, 230, 97, 238]);
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
  const pair = body.pair == null || body.pair === "" ? DEFAULT_PAIR : PAIRS[body.pair] ? body.pair : null;
  if (!pair) errors.push("pair must be KIBBLE or SOL");
  const devBuySol = Number(body.devBuySol || 0);
  if (!Number.isFinite(devBuySol) || devBuySol < 0 || devBuySol > MAX_DEV_BUY_SOL) errors.push(`opening swap must be 0-${MAX_DEV_BUY_SOL} SOL`);
  const slippageBps = body.slippageBps == null || body.slippageBps === "" ? SLIPPAGE_BPS.def : Number(body.slippageBps);
  if (!Number.isInteger(slippageBps) || slippageBps < SLIPPAGE_BPS.min || slippageBps > SLIPPAGE_BPS.max) errors.push(`slippage must be ${SLIPPAGE_BPS.min / 100}-${SLIPPAGE_BPS.max / 100}%`);
  return errors.length ? { ok: false, errors } : { ok: true, v: { player, mint, name, symbol, uri, pair, devBuySol, slippageBps } };
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
    lookupTable: async (addr) => { const t = (await conn.getAddressLookupTable(new PublicKey(addr))).value; return t && t.isActive() ? t : null; },
    // Dry run only (sigVerify off, nothing is signed or sent). Returns the wallet's SOL change and pump.fun's own trade events.
    simulate: async (tx, payer) => { const pre = await conn.getBalance(payer, "confirmed");
      const r = await conn.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true, commitment: "confirmed", accounts: { encoding: "base64", addresses: [payer.toBase58()] } });
      const post = r.value.accounts?.[0]?.lamports, logs = r.value.logs || [];
      return { err: r.value.err, units: r.value.unitsConsumed ?? null, logs: logs.slice(-6), balance: pre, cost: post == null ? null : pre - post, trades: tradesFromLogs(logs) }; },
  };
}
export const decodeAccount = (a) => ({ data: Buffer.from(a.data, "base64"), owner: new PublicKey(a.owner), lamports: a.lamports, executable: false, rentEpoch: 0 });

// Inspect a built transaction: who must sign, and whether any signature is already present.
export function inspectTx(tx) {
  const n = tx.message.header.numRequiredSignatures, keys = tx.message.staticAccountKeys;
  return { feePayer: keys[0].toBase58(), signers: keys.slice(0, n).map((k) => k.toBase58()), signed: tx.signatures.map((s) => s.some((b) => b !== 0)) };
}

// pump.fun emits a TradeEvent per bonding-curve leg; decode them from simulation logs (amounts as decimal strings).
export function tradesFromLogs(logs = []) {
  const out = [], str = (x) => (x == null ? "0" : x.toString()), b58 = (x) => (x && x.toBase58 ? x.toBase58() : null);
  for (const l of logs) { if (!l.startsWith("Program data: ")) continue; const b = Buffer.from(l.slice(14), "base64");
    if (b.length < 16 || !b.subarray(0, 8).equals(TRADE_EVENT)) continue;
    try { const e = PUMP_SDK.decodeTradeEventBc(b.subarray(8)); const q = b58(e.quoteMint);
      out.push({ mint: b58(e.mint), quoteMint: !q || q === "11111111111111111111111111111111" ? WSOL : q, isBuy: !!e.isBuy, quoteAmount: str(e.quoteAmount && !e.quoteAmount.isZero() ? e.quoteAmount : e.solAmount),
        tokenAmount: str(e.tokenAmount), fee: str(e.fee), feeBps: Number(str(e.feeBasisPoints)), creatorFee: str(e.creatorFee), creatorFeeBps: Number(str(e.creatorFeeBasisPoints)),
        buybackFee: str(e.buybackFee), holderRewards: str(e.holderRewards), holderRewardsBps: Number(str(e.holderRewardsBps)), lpFee: "0", ix: e.ixName || null }); } catch { /* not a decodable trade */ } }
  return out;
}

const units = (raw, dec = 6) => { const n = BigInt(String(raw || "0")), d = 10n ** BigInt(dec), w = n / d, f = (n % d).toString().padStart(dec, "0").replace(/0+$/, ""); return w.toLocaleString("en-US") + (f ? "." + f.slice(0, 4) : ""); };
const solTxt = (l) => (Number(l) / 1e9).toFixed(Number(l) < 1e7 ? 6 : 4).replace(/0+$/, "").replace(/\.$/, "") + " SOL";
const pct = (bps) => (bps / 100).toFixed(2).replace(/\.?0+$/, "") + "%";

// Plain-words route + every fee, shown to the player before they sign. Amounts come from the mainnet dry run when we have one.
export function describeRoute({ pair, symbol, lamports = 0, slippageBps = SLIPPAGE_BPS.def, minOut = null, cuLimit = CU.limit, signers = 2, sim = null, mint = null, alt = null }) {
  const trades = sim?.trades || [], tick = "$" + symbol, network = SIG_FEE * signers, priority = Math.ceil(cuLimit * CU.microLamports / 1e6);
  const legKib = trades.find((t) => t.mint === KIBBLE_MINT), legNew = trades.find((t) => t.mint === mint) || trades[trades.length - 1];
  const steps = [], fees = [], notes = [];
  if (lamports > 0 && pair === "KIBBLE") {
    steps.push({ from: "SOL", to: "$KIBBLE", venue: "the $KIBBLE pump.fun bonding curve", in: solTxt(lamports), out: legKib ? units(legKib.tokenAmount) + " $KIBBLE" : "quoted in the dry run" });
    steps.push({ from: "$KIBBLE", to: tick, venue: `your new ${tick} bonding curve (created in this same transaction)`, in: legNew ? units(legNew.quoteAmount) + " $KIBBLE" : "all $KIBBLE from step 1", out: legNew ? units(legNew.tokenAmount) + " " + tick : "quoted in the dry run" });
    fees.push({ key: "pumpfun", label: "pump.fun trading fee", bps: legKib?.feeBps ?? 95, amount: legKib ? solTxt(legKib.fee) : null,
      plain: `${pct(legKib?.feeBps ?? 95)} of the SOL → $KIBBLE swap, charged once on the first leg (pump.fun charges protocol fees on the first leg of a multi-hop route). About half funds pump.fun's buyback.` });
    fees.push({ key: "creator", label: "Creator fee", bps: legNew?.creatorFeeBps ?? 30, amount: legNew ? units(legNew.creatorFee) + " $KIBBLE" : null,
      plain: `${pct(legNew?.creatorFeeBps ?? 30)} of the $KIBBLE → ${tick} swap, charged on the last leg and paid into your own coin's creator rewards (you are the creator). $KIBBLE's creator fee is not charged on this route.` });
    fees.push({ key: "lp", label: "Liquidity fee", bps: 0, amount: "0", plain: "0% while your coin trades on its bonding curve." });
    if (legNew && legNew.holderRewards !== "0") fees.push({ key: "holders", label: "Holder rewards", bps: legNew.holderRewardsBps, amount: units(legNew.holderRewards) + " $KIBBLE", plain: "Shared with holders, charged on the last leg." });
    fees.push({ key: "slippage", label: "Slippage limit", bps: slippageBps, amount: minOut != null ? "at least " + units(minOut) + " " + tick : null,
      plain: `The SOL → $KIBBLE price can move before your transaction lands. Your limit is ${pct(slippageBps)}: if you would get less than the minimum, the whole launch fails and nothing is swapped (Solana still keeps the network + priority fee).` });
  } else if (lamports > 0) {
    steps.push({ from: "SOL", to: tick, venue: `your new ${tick} bonding curve (created in this same transaction)`, in: solTxt(lamports), out: legNew ? units(legNew.tokenAmount) + " " + tick : "quoted in the dry run" });
    fees.push({ key: "pumpfun", label: "pump.fun trading fee", bps: legNew?.feeBps ?? 95, amount: legNew ? solTxt(legNew.fee) : null, plain: `${pct(legNew?.feeBps ?? 95)} of your opening swap.` });
    fees.push({ key: "creator", label: "Creator fee", bps: legNew?.creatorFeeBps ?? 30, amount: legNew ? solTxt(legNew.creatorFee) : null, plain: "Paid into your own coin's creator rewards (you are the creator)." });
    fees.push({ key: "slippage", label: "Slippage", bps: 0, amount: "none", plain: "Your coin is created and bought in one transaction, so nobody can trade in between." });
  }
  const swapSpent = trades.filter((t) => t.quoteMint === WSOL).reduce((a, t) => a + Number(t.quoteAmount) + Number(t.fee) + (t.creatorFee && t.mint !== KIBBLE_MINT ? Number(t.creatorFee) : 0), 0);
  const rent = sim?.cost != null ? Math.max(0, sim.cost - network - priority - swapSpent) : null;
  fees.push({ key: "network", label: "Network fee", amount: solTxt(network), lamports: network, plain: `Solana's base fee: ${signers} signatures × 0.000005 SOL (your wallet + the new coin's address).` });
  fees.push({ key: "priority", label: "Priority fee", amount: solTxt(priority), lamports: priority, plain: `${cuLimit.toLocaleString("en-US")} compute units × ${CU.microLamports / 1e6} lamports, so validators pick it up quickly.` });
  fees.push({ key: "rent", label: "Account deposits (rent)", amount: rent != null ? solTxt(rent) : null, lamports: rent, plain: "One-time Solana storage deposits for your coin's mint, metadata, bonding curve and your token accounts. pump.fun charges no separate create fee." });
  if (pair === "KIBBLE") notes.push("Charity routing isn't available for $KIBBLE-paired coins.");
  if (alt) notes.push(`Uses ${alt}, a public address lookup table widely used by pump.fun transactions, to fit everything in one transaction. It only shortens addresses; it can't move funds.`);
  notes.push("Inu Verse never signs, holds or moves your SOL or tokens. You sign in your own wallet.");
  return { pair, steps, fees, notes, total: sim?.cost != null ? { lamports: sim.cost, text: solTxt(sim.cost), from: "mainnet dry run" } : null };
}

export async function buildCreateTx(v, deps) {
  const { player, mint, name, symbol, uri, pair, devBuySol, slippageBps = SLIPPAGE_BPS.def } = v;
  const lamports = Math.round(devBuySol * 1e9), hop = pair === "KIBBLE" && lamports > 0, cuLimit = hop ? CU.hopLimit : CU.limit;
  const head = [ComputeBudgetProgram.setComputeUnitLimit({ units: cuLimit }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: CU.microLamports })];
  let compose, alt = null;
  if (pair === "KIBBLE") {
    const quote = await deps.resolveQuote(KIBBLE_MINT); // throws UnsupportedQuoteMintError etc. when pump.fun does not accept it
    const create = await PUMP_SDK.createV2Instruction({ mint, name, symbol, uri, creator: player, user: player, mayhemMode: false, quoteMint: new PublicKey(KIBBLE_MINT), quoteTokenProgram: quote.quoteTokenProgram, pumpQuote: quote.pumpQuote?.accounts });
    if (hop) {
      alt = deps.lookupTable ? await deps.lookupTable(ROUTE_ALT).catch(() => null) : null;
      if (!alt) throw Object.assign(new Error("The SOL → $KIBBLE route is unavailable right now. Launch the $KIBBLE pair with no opening swap, or pick SOL."), { status: 503 });
      // Route: SOL → $KIBBLE on $KIBBLE's bonding curve, then $KIBBLE → new coin on the new coin's curve (pump.fun multi-hop, SDK 4.1.0).
      const hops = [{ venue: "curve", baseMint: new PublicKey(KIBBLE_MINT), quoteMint: new PublicKey(WSOL), baseTokenProgram: quote.quoteTokenProgram, quoteTokenProgram: new PublicKey(TOKEN_PROGRAM) },
        { venue: "curve", baseMint: mint, quoteMint: new PublicKey(KIBBLE_MINT), baseTokenProgram: new PublicKey(TOKEN_2022), quoteTokenProgram: quote.quoteTokenProgram }];
      compose = async (minOut) => [create, ...await PUMP_SDK.multiHopSwapInstructions({ user: player, hops, side: "buy", amountIn: new BN(lamports), minAmountOut: new BN(String(minOut)) })];
    } else compose = async () => [create];
  } else if (lamports > 0) {
    const [global, feeConfig] = await Promise.all([deps.global(), deps.feeConfig()]);
    const solAmount = new BN(lamports);
    const amount = getBuyTokenAmountFromSolAmount({ global, feeConfig, mintSupply: null, bondingCurve: null, amount: solAmount, quoteMint: new PublicKey(WSOL) });
    const ixs = await PUMP_SDK.createV2AndBuyInstructions({ global, mint, name, symbol, uri, creator: player, user: player, amount, solAmount, mayhemMode: false });
    compose = async () => ixs;
  } else {
    const create = await PUMP_SDK.createV2Instruction({ mint, name, symbol, uri, creator: player, user: player, mayhemMode: false });
    compose = async () => [create];
  }
  const blockhash = await deps.blockhash();
  const compile = async (minOut) => { const t = new VersionedTransaction(new TransactionMessage({ payerKey: player, recentBlockhash: blockhash, instructions: [...head, ...await compose(minOut)] }).compileToV0Message(alt ? [alt] : []));
    const info = inspectTx(t);
    // Hard guarantees: the player pays and creates; the only other signer is the browser-generated mint; nothing is signed here.
    if (info.feePayer !== player.toBase58()) throw new Error("internal: fee payer is not the player");
    if (info.signers.length !== 2 || !info.signers.includes(mint.toBase58())) throw new Error("internal: unexpected signer set " + info.signers.join(","));
    if (info.signed.some(Boolean)) throw new Error("internal: transaction must be unsigned");
    return { t, info, bytes: t.serialize() }; };
  const runSim = async (t) => { try { const s = await deps.simulate(t, player); return { ok: !s.err, err: s.err ? JSON.stringify(s.err) : null, units: s.units, balance: s.balance, cost: s.cost, logs: s.err ? s.logs : [], trades: s.trades || [] }; }
    catch (e) { return { ok: null, err: "simulation unavailable: " + String(e.message || e).slice(0, 120) }; } };
  let minOut = null, built, simulation = null;
  if (hop) {
    // Quote by mainnet dry run (no floor), then lock the slippage floor into the real transaction and dry-run that too.
    if (!deps.simulate) throw Object.assign(new Error("can't quote the $KIBBLE route without a dry run"), { status: 503 });
    const q = await runSim((await compile(1)).t);
    const last = q.ok ? (q.trades || []).find((t) => t.mint === mint.toBase58()) : null;
    if (!last) { const fail = q.ok === null ? Object.assign(new Error("Couldn't quote the SOL → $KIBBLE route right now. Try again in a moment."), { status: 503 }) : null; if (fail) throw fail;
      return { tx: null, pair, devBuySol, slippageBps, mint: mint.toBase58(), feePayer: player.toBase58(), creator: player.toBase58(), quoteMint: KIBBLE_MINT, minLamports: minLamports({ devBuySol, pair }), simulation: q.ok === false ? q : { ...q, ok: false, err: "route quote missing" }, serverSigned: false }; }
    minOut = (BigInt(last.tokenAmount) * BigInt(10_000 - slippageBps)) / 10_000n;
    built = await compile(minOut);
  } else built = await compile(1);
  if (deps.simulate) simulation = await runSim(built.t);
  const route = describeRoute({ pair, symbol, lamports, slippageBps, minOut: minOut == null ? null : minOut.toString(), cuLimit, signers: built.info.signers.length, sim: simulation, mint: mint.toBase58(), alt: alt ? ROUTE_ALT : null });
  if (simulation) delete simulation.trades;
  return { tx: Buffer.from(built.bytes).toString("base64"), size: built.bytes.length, feePayer: built.info.feePayer, creator: player.toBase58(), signers: built.info.signers, mint: mint.toBase58(), pair, devBuySol, slippageBps,
    minOut: minOut == null ? null : minOut.toString(), lookupTable: alt ? ROUTE_ALT : null, quoteMint: pair === "KIBBLE" ? KIBBLE_MINT : null, minLamports: minLamports({ devBuySol, pair }), route, simulation, serverSigned: false };
}

// Friendly explanation of common simulation failures.
export function explainSim(sim) {
  if (!sim || sim.ok !== false) return null; const e = sim.err || "";
  if (/InsufficientFundsForRent[^}]*"account_index":1\b/.test(e)) return "pump.fun can't size this exact name + ticker + link combination (a known on-chain quirk). Add or remove one letter in the name and try again.";
  if (/AccountNotFound|insufficient|0x1\b|"Custom":1\b/.test(e) || (sim.balance === 0)) return "Your wallet needs more SOL first (see Top up).";
  if (/6063|6100|UnsupportedQuote|NotEligible/.test(e)) return "pump.fun is not accepting $KIBBLE as a pair right now. Launch with SOL, or use pump.fun's own page.";
  if (/6107/.test(e)) return "$KIBBLE is migrating to PumpSwap right now. Try the $KIBBLE pair again in a few minutes.";
  return "pump.fun rejected this launch in a dry run: " + e.slice(0, 140);
}

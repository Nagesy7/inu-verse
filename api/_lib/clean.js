// Clean Launch proof: real on-chain checks for a Launch Hall coin, through the server RPC only (api/_lib/rpc.js).
// Nothing is guessed: any check that cannot run (RPC error, history too long, data missing) comes back "unknown".
//   mint / freeze authority renounced · creator holding % · top-10 holder % (bonding curve + AMM pools excluded)
//   creator balance went down (offloaded or moved) · other wallets buying in the creation slot (bundles/snipes) · liquidity
import { findPda, b58decode, b58encode, bondingCurveOf, PUMP_PROGRAM } from "../coins.js";
import { redact } from "./rpc.js";
export const PUMP_FEES = "pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ"; // pump.fun creator fee sharing program (SharingConfig PDA ["sharing-config", mint])
export const PUMP_AMM = "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA";
export const RAYDIUM_AUTH = "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1";
export const ATA_PROGRAM = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
export const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBSf4Ss623VQ5DA", TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
export const LIMITS = { creatorPct: [5, 15], top10Pct: [30, 50], soldFrac: 0.5, snipers: [1, 3], curveSol: [20, 2], poolUsd: [25_000, 5_000], creatorTxs: 40, historyPages: 3 };
export const LABELS = { mint: "Mint authority renounced", freeze: "Freeze authority renounced", creatorPct: "Dev (creator) holding", top10: "Top 10 wallets hold", creatorSold: "Dev balance dropped (offloaded or moved)", snipes: "Bundled / sniped first-slot entries", liquidity: "Liquidity", feeSplit: "Creator fee split published + locked" };
export const sharingConfigOf = (mint) => findPda([Buffer.from("sharing-config"), b58decode(mint)], PUMP_FEES);
const SHARING_DISC = Buffer.from([216, 74, 9, 0, 56, 140, 93, 75]);
// SharingConfig: disc(8) bump(1) version(1) status(1: 0 paused, 1 active) mint(32) admin(32) admin_revoked(1) vec<Shareholder{address(32), share_bps(u16)}>
export function parseSharing(buf) { if (!buf || buf.length < 80 || !buf.subarray(0, 8).equals(SHARING_DISC)) return null; const n = buf.readUInt32LE(76), holders = [];
  for (let i = 0; i < n && 80 + i * 34 + 34 <= buf.length; i++) { const o = 80 + i * 34; holders.push({ address: b58encode(buf.subarray(o, o + 32)), bps: buf.readUInt16LE(o + 32) }); }
  return { status: buf[10] === 1 ? "active" : "paused", mint: b58encode(buf.subarray(11, 43)), admin: b58encode(buf.subarray(43, 75)), adminRevoked: buf[75] === 1, shareholders: holders, totalBps: holders.reduce((s, h) => s + h.bps, 0) }; }
export const ataOf = (owner, mint, prog = TOKEN) => findPda([b58decode(owner), b58decode(prog), b58decode(mint)], ATA_PROGRAM);

export function makeRpc(url, f = fetch, env = process.env) { let id = 0; let calls = 0;
  const one = async (method, params) => { calls++; const r = await f(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }) });
    const j = await r.json().catch(() => ({})); if (j.error || !r.ok) throw new Error(redact(j.error?.message || "rpc " + r.status, env)); return j.result; };
  // JSON-RPC batches in chunks of 10; if a provider rejects batches (some free tiers) or drops entries, fall back to single
  // calls (3 at a time) for what's missing. Entries that still fail stay null and the caller reports "unknown".
  const raw = async (reqs) => { calls += reqs.length; const body = reqs.map(([method, params], i) => ({ jsonrpc: "2.0", id: i, method, params }));
    const r = await f(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); const j = await r.json().catch(() => null);
    if (!Array.isArray(j)) throw new Error("rpc batch " + r.status); const out = []; for (const x of j) out[x.id] = x.error ? null : x.result; return out; };
  const batch = async (reqs) => { if (!reqs.length) return []; const out = new Array(reqs.length).fill(null);
    for (let i = 0; i < reqs.length; i += 10) { const chunk = reqs.slice(i, i + 10); try { (await raw(chunk)).forEach((v, k) => { out[i + k] = v ?? null; }); } catch {} }
    for (let pass = 0; pass < 2; pass++) { const miss = out.map((v, i) => (v == null ? i : -1)).filter((i) => i >= 0); if (!miss.length) break; if (pass) await new Promise((r) => setTimeout(r, 600));
      for (let k = 0; k < miss.length; k += 3) await Promise.all(miss.slice(k, k + 3).map(async (i) => { try { out[i] = await one(reqs[i][0], reqs[i][1]); } catch {} })); }
    return out; };
  return { one, batch, get calls() { return calls; } }; }

const st = (status, value, note, extra = {}) => ({ status, value, note, ...extra });
const unknown = (note) => st("unknown", null, note);
const grade = (v, [p, w]) => v <= p ? "pass" : v <= w ? "warn" : "fail";
const pct = (a, b) => b > 0 ? Math.round((a / b) * 10000) / 100 : null;
const bal = (list, owner, mint) => (list || []).filter((b) => b.owner === owner && b.mint === mint).reduce((s, b) => s + Number(b.uiTokenAmount?.amount || 0), 0);

export function parseCurve(buf) { if (!buf || buf.length < 49) return null; const u = (o) => buf.readBigUInt64LE(o);
  return { virtualTokenReserves: u(8), virtualSolReserves: u(16), realTokenReserves: u(24), realSolReserves: u(32), tokenTotalSupply: u(40), complete: buf[48] === 1, creator: buf.length >= 81 ? b58encode(buf.subarray(49, 81)) : null }; }

export async function cleanChecks(mint, { rpc, creatorHint = null, dexLiquidityUsd = async () => null, solUsd = async () => null, now = Date.now() } = {}) {
  const c = {}, ctx = {};
  // 1) mint account: authorities, supply, token program
  try { const a = await rpc.one("getAccountInfo", [mint, { encoding: "jsonParsed" }]); const info = a?.value?.data?.parsed?.info;
    if (!info) throw new Error("mint account not found"); ctx.supply = Number(info.supply); ctx.decimals = info.decimals; ctx.program = a.value.owner;
    c.mint = info.mintAuthority ? st("fail", info.mintAuthority, "Mint authority is still set: more tokens can be minted") : st("pass", null, "No one can mint more");
    c.freeze = info.freezeAuthority ? st("fail", info.freezeAuthority, "Freeze authority is still set: holder accounts can be frozen") : st("pass", null, "No one can freeze holders"); }
  catch (e) { c.mint = unknown("Could not read the mint account"); c.freeze = unknown("Could not read the mint account"); }
  // 2) pump.fun bonding curve: creator, graduated?, curve depth
  const curveAddr = bondingCurveOf(mint);
  try { const a = await rpc.one("getAccountInfo", [curveAddr, { encoding: "base64" }]); const v = a?.value;
    if (v && v.owner === PUMP_PROGRAM) { ctx.curve = parseCurve(Buffer.from(v.data[0], "base64")); } } catch { ctx.curveErr = true; }
  ctx.creator = ctx.curve?.creator || creatorHint || null;
  // 3) holders: top 20 token accounts -> owners -> drop the curve / AMM pool vaults
  if (ctx.supply > 0) try { const big = (await rpc.one("getTokenLargestAccounts", [mint]))?.value || [];
      const accs = big.length ? (await rpc.one("getMultipleAccounts", [big.map((b) => b.address), { encoding: "jsonParsed" }]))?.value || [] : [];
      const owners = accs.map((a) => a?.data?.parsed?.info?.owner || null), uniq = [...new Set(owners.filter(Boolean))];
      const oa = uniq.length ? (await rpc.one("getMultipleAccounts", [uniq, { encoding: "base64", dataSlice: { offset: 0, length: 0 } }]))?.value || [] : [];
      const progOf = Object.fromEntries(uniq.map((o, i) => [o, oa[i]?.owner || null]));
      const isPool = (o) => o === curveAddr || o === RAYDIUM_AUTH || [PUMP_PROGRAM, PUMP_AMM].includes(progOf[o]);
      const rows = big.map((b, i) => ({ owner: owners[i], amount: Number(b.amount) })).filter((r) => r.owner);
      const excluded = rows.filter((r) => isPool(r.owner)), holders = rows.filter((r) => !isPool(r.owner));
      const byOwner = new Map(); for (const r of holders) byOwner.set(r.owner, (byOwner.get(r.owner) || 0) + r.amount);
      const top = [...byOwner.values()].sort((a, b) => b - a).slice(0, 10), t10 = pct(top.reduce((s, x) => s + x, 0), ctx.supply);
      c.top10 = st(grade(t10, LIMITS.top10Pct), t10, `${t10}% of supply held by the 10 largest wallets (excluding ${excluded.length ? 'the pump.fun curve / pool vaults' : 'nothing: no pool vault found'})`, { excludedPct: pct(excluded.reduce((s, r) => s + r.amount, 0), ctx.supply) });
      ctx.holders = byOwner; }
    catch { c.top10 = unknown("Holder list unavailable from RPC right now"); }
  else c.top10 = unknown("Supply unknown");
  // 4) creator holding
  if (!ctx.creator) { c.creatorPct = unknown("Creator wallet unknown (not a pump.fun bonding-curve coin)"); c.creatorSold = unknown("Creator wallet unknown"); }
  else {
    try { const r = await rpc.one("getTokenAccountsByOwner", [ctx.creator, { mint }, { encoding: "jsonParsed" }]); const accs = r?.value || [];
      const amt = accs.reduce((s, a) => s + Number(a.account?.data?.parsed?.info?.tokenAmount?.amount || 0), 0); ctx.creatorAccs = accs.map((a) => a.pubkey);
      const p = pct(amt, ctx.supply); c.creatorPct = p == null ? unknown("Supply unknown") : st(grade(p, LIMITS.creatorPct), p, `Creator ${short(ctx.creator)} holds ${p}% of supply`); }
    catch { c.creatorPct = unknown("Could not read the creator's token accounts"); }
    // 5) creator sold / moved: walk the creator token account history (ATA, both token programs, plus any open accounts)
    try { const progs = ctx.program ? [ctx.program] : [TOKEN, TOKEN_2022]; const addrs = [...new Set([...progs.map((p) => ataOf(ctx.creator, mint, p)), ...(ctx.creatorAccs || [])])];
      let sigs = []; for (const a of addrs) sigs.push(...((await rpc.one("getSignaturesForAddress", [a, { limit: LIMITS.creatorTxs }])) || []).map((s) => ({ ...s, acct: a })));
      const partial = sigs.length >= LIMITS.creatorTxs; sigs = [...new Map(sigs.filter((s) => !s.err).map((s) => [s.signature, s])).values()].slice(0, LIMITS.creatorTxs);
      if (!sigs.length) c.creatorSold = st("pass", 0, "Creator never held this coin");
      else { const txs = await rpc.batch(sigs.map((s) => ["getTransaction", [s.signature, { encoding: "json", maxSupportedTransactionVersion: 1, commitment: "confirmed" }]]));
        let out = 0, inn = 0, missing = 0; for (const t of txs) { if (!t) { missing++; continue; } const d = bal(t.meta?.postTokenBalances, ctx.creator, mint) - bal(t.meta?.preTokenBalances, ctx.creator, mint); if (d < 0) out += -d; else inn += d; }
        const peak = Math.max(inn, out, 1), frac = out / peak;
        if (missing > sigs.length / 2) c.creatorSold = unknown("Creator history unavailable from RPC right now");
        else c.creatorSold = out === 0 ? st("pass", 0, `No outflow from the creator in ${sigs.length} transaction${sigs.length === 1 ? "" : "s"}${partial ? " (latest only)" : ""}`)
          : st(frac >= LIMITS.soldFrac ? "fail" : "warn", pct(out, peak), `Creator balance went down by ${pct(out, peak)}% of what it received (offloaded or moved)${partial ? ", latest transactions only" : ""}`); } }
    catch { c.creatorSold = unknown("Creator history unavailable from RPC right now"); } }
  // 6) bundled / sniped first-slot entries: find the creation slot from the bonding-curve history
  try { let before, all = [], done = false; for (let i = 0; i < LIMITS.historyPages; i++) { const page = (await rpc.one("getSignaturesForAddress", [curveAddr, { limit: 1000, ...(before ? { before } : {}) }])) || []; all.push(...page); if (page.length < 1000) { done = true; break; } before = page[page.length - 1].signature; }
    if (!all.length) c.snipes = unknown(ctx.curve ? "No bonding-curve history found" : "Not a pump.fun bonding-curve coin: first-slot check not available");
    else if (!done) c.snipes = unknown(`More than ${LIMITS.historyPages * 1000} curve transactions: creation slot not reached`);
    else { const slot = all[all.length - 1].slot, first = all.filter((s) => s.slot === slot && !s.err);
      const txs = await rpc.batch(first.map((s) => ["getTransaction", [s.signature, { encoding: "json", maxSupportedTransactionVersion: 1, commitment: "confirmed" }]]));
      const buyers = new Set(); let missing = 0; for (const t of txs) { if (!t) { missing++; continue; }
        for (const b of t.meta?.postTokenBalances || []) { if (b.mint !== mint || b.owner === curveAddr || !b.owner || b.owner === ctx.creator) continue; const before0 = bal(t.meta?.preTokenBalances, b.owner, mint), after0 = bal(t.meta?.postTokenBalances, b.owner, mint); if (after0 > before0) buyers.add(b.owner); }
      }
      const n = buyers.size; if (missing && n < LIMITS.snipers[1]) c.snipes = unknown(`Could not read ${missing} of ${txs.length} creation-slot transactions`); else c.snipes = st(n < LIMITS.snipers[0] ? "pass" : n < LIMITS.snipers[1] ? "warn" : "fail", n, n ? `${n} other wallet${n === 1 ? "" : "s"} picked up tokens in the creation slot (${slot}): bundled or sniped` : `No other wallet picked up tokens in the creation slot (${slot})`, { slot, txsInSlot: first.length }); } }
  catch { c.snipes = unknown("Could not read the coin's first transactions"); }
  // 7) creator fee split: pump.fun fee-sharing config must exist (published) and have its admin revoked (locked)
  try { const sc = sharingConfigOf(mint), a = await rpc.one("getAccountInfo", [sc, { encoding: "base64" }]), v = a?.value;
    if (!v) c.feeSplit = st("warn", null, "No creator fee split published on pump.fun (no fee-sharing config on-chain)", { account: sc });
    else if (v.owner !== PUMP_FEES) c.feeSplit = unknown("Fee-sharing account has an unexpected owner");
    else { const cfg = parseSharing(Buffer.from(v.data[0], "base64")); if (!cfg || cfg.mint !== mint) c.feeSplit = unknown("Could not read the fee-sharing config");
      else { const list = cfg.shareholders.map((h) => `${short(h.address)} ${h.bps / 100}%`).join(", ");
        c.feeSplit = cfg.adminRevoked && cfg.totalBps === 10000 ? st("pass", cfg.shareholders.length, `Fee split published and locked: ${list}`, { account: sc, shareholders: cfg.shareholders })
          : st("warn", cfg.shareholders.length, `Fee split published (${list || "no recipients"}) but ${cfg.adminRevoked ? "shares don't add up (need 100%)" : "not locked: the admin can still change it"}`, { account: sc, shareholders: cfg.shareholders }); } } }
  catch { c.feeSplit = unknown("Could not read the fee-sharing config from RPC"); }
  // 8) liquidity
  try { if (ctx.curve && !ctx.curve.complete) { const sol = Number(ctx.curve.realSolReserves) / 1e9, usd = await solUsd(); const [p, w] = LIMITS.curveSol;
      c.liquidity = st(sol >= p ? "pass" : sol >= w ? "warn" : "fail", Math.round(sol * 1000) / 1000, `${(Math.round(sol * 1000) / 1000)} SOL${usd ? ` (~$${Math.round(sol * usd).toLocaleString("en-US")})` : ""} in the pump.fun bonding curve: locked by the program (can't be pulled)${sol < w ? ", but very thin" : ""}`, { unit: "SOL" }); }
    else { const usd = await dexLiquidityUsd(mint); const [p, w] = LIMITS.poolUsd;
      c.liquidity = usd == null ? unknown(ctx.curve?.complete ? "Graduated: pool liquidity unavailable from DexScreener right now" : "No pool or bonding curve found") : st(usd >= p ? "pass" : usd >= w ? "warn" : "fail", Math.round(usd), `$${Math.round(usd).toLocaleString("en-US")} pool liquidity (DexScreener)`, { unit: "USD" }); } }
  catch { c.liquidity = unknown("Liquidity unavailable right now"); }
  return { mint, checks: c, overall: overallOf(c), creator: ctx.creator, graduated: ctx.curve ? ctx.curve.complete : null, checkedAt: now, rpcCalls: rpc.calls };
}
// PASS needs every check verified as pass (so an unknown fee split, or any unknown, caps the badge at WARN). Any fail -> FAIL.
export function overallOf(c) { const v = Object.values(c).map((x) => x.status); if (!v.length || v.every((s) => s === "unknown")) return "unknown"; if (v.includes("fail")) return "fail"; if (c.feeSplit?.status === "pass" && v.every((s) => s === "pass")) return "pass"; return "warn"; }
const short = (a) => a ? a.slice(0, 4) + "…" + a.slice(-4) : "?";

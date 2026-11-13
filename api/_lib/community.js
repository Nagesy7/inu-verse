// Community mains: coins anyone can add in the Cabal Meme Maker as a launch quote pair. They are NOT featured, NOT the face,
// NOT endorsed. The registry (approved list + admin kill switch) lives in Kibble Pay's cabal API (Upstash). This module is the
// ONE on-chain verifier: Kibble Pay calls it through GET /api/launch?pairCheck=<mint> before adding a coin, and /api/launch
// re-runs it server-side on every build that asks for pair=<community mint>. Nothing here signs, holds or moves funds.
//
// A coin passes only when ALL hold:
//   1. it is a real SPL Token or Token-2022 mint account on mainnet
//   2. mint authority AND freeze authority are revoked (null)
//   3. name + symbol are read from on-chain metadata (Token-2022 tokenMetadata extension or the Metaplex metadata account);
//      client-supplied metadata is never trusted
//   4. pump.fun accepts it as a create_v2 quote mint (resolveQuoteMint) AND there is a live SOL → coin first hop
//      (resolveMultiHopRoute: its pump.fun curve, or its canonical PumpSwap pool)
//   5. DexScreener liquidity across its Solana pools is at least COMMUNITY_RULES.minLiquidityUsd
//   6. its name/ticker/mint is not one of the official mains (no impersonation)
// Everything else (young coin, thin liquidity, mutable metadata, RugCheck "danger" items) is reported as a red flag.
import kit from "./pumpkit.cjs";
const { PublicKey } = kit;

export const COMMUNITY_RULES = Object.freeze({
  minLiquidityUsd: 5_000,       // hard floor for a community quote pair
  thinLiquidityUsd: 25_000,     // red flag below this
  lowMcapUsd: 100_000,          // red flag below this
  youngMs: 24 * 3600_000,       // red flag when the oldest pool is younger than this
  reverifyMs: 10 * 60_000,      // a build re-verifies on-chain when the cached check is older than this (we always re-verify at build)
  registryTimeoutMs: 6_000,
});
export const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const METAPLEX = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";
const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
// Official mains (and SOL) can never be added again as a community main, by mint, ticker or name.
export const OFFICIAL_MAINS = Object.freeze([
  { mint: "4VE9sy4fEMJdZ6i7MkYPbnqDJd2oqzJQmg44WJ3opump", tickers: ["KIBBLE", "INU"], names: ["KIBBLE", "INU", "PRESIDENT INU", "KIBBLE INU"] },
  { mint: "FTu55MyigXns96jz4nTCDDiTCjYJjyrHSceCgG9Upump", tickers: ["FOOD", "FOODCOIN"], names: ["FOODCOIN", "FOOD COIN", "FOOD"] },
  { mint: "7yLCJpWQvE2bnX3JZGbmmKrCkCSrSGbqTmgA8tMdpump", tickers: ["FLC", "FLYCAT"], names: ["FLY CAT", "FLYCAT"] },
  { mint: "LaZV2Qz2mzRVwN6xGcZJkG76ziquRmSU2TBy4gxpump", tickers: ["AUTISM"], names: ["AUTISM COIN", "AUTISM", "AUTISMCOIN"] },
  { mint: "BiZev8AUeKT6nDyAJFTZwyn4oEh1BrGKNT83qBJvpump", tickers: ["CHAIRMAN"], names: ["CHAIRMAN", "CHAIRMAN THE UBER DRIVER"] },
  { mint: "So11111111111111111111111111111111111111112", tickers: ["SOL", "WSOL"], names: ["SOL", "SOLANA", "WRAPPED SOL"] },
]);
const norm = (s) => String(s || "").normalize("NFKC").toUpperCase().replace(/^\$/, "").replace(/[^A-Z0-9 ]/g, "").replace(/\s+/g, " ").trim();
const squash = (s) => norm(s).replace(/ /g, "");
/** -> reason string when name/symbol/mint collide with an official main, else null. */
export function impersonates({ mint, name, symbol }) {
  for (const o of OFFICIAL_MAINS) {
    if (mint === o.mint) return "this is already an official main";
    if (o.tickers.some((t) => squash(symbol) === t)) return `the ticker $${norm(symbol)} belongs to an official main`;
    if (o.names.some((n) => squash(name) === n.replace(/ /g, ""))) return `the name "${String(name).slice(0, 32)}" belongs to an official main`;
  }
  return null;
}
export const cleanMetaText = (s, n) => String(s ?? "").replace(/\u0000/g, "").replace(/[<>\u0001-\u001f\u007f]/g, "").trim().slice(0, n);

async function rpc(rpcUrl, method, params, f, timeoutMs = 10_000) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), timeoutMs);
  try { const r = await f(rpcUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: ac.signal });
    const j = await r.json(); if (j.error) throw new Error(method + ": " + (j.error.message || "rpc error")); return j.result; }
  finally { clearTimeout(t); }
}
// Metaplex Token Metadata account (borsh): key u8, update_authority 32, mint 32, name str, symbol str, uri str, seller_fee u16,
// creators Option<Vec>, primary_sale_happened bool, is_mutable bool. We read name/symbol/uri/isMutable only.
export function decodeMetaplex(buf) {
  let o = 1 + 32 + 32; const str = () => { const n = buf.readUInt32LE(o); o += 4; if (n > 256) throw new Error("bad metadata"); const s = buf.subarray(o, o + n).toString("utf8"); o += n; return s; };
  const name = str(), symbol = str(), uri = str(); o += 2;
  if (buf[o] === 1) { o += 1; const n = buf.readUInt32LE(o); o += 4 + n * 34; } else o += 1;
  o += 1; const isMutable = buf[o] === 1;
  return { name: cleanMetaText(name, 32), symbol: cleanMetaText(symbol, 12), uri: cleanMetaText(uri, 200), updateAuthority: buf.subarray(1, 33), isMutable };
}
export const metaplexPda = (mint) => PublicKey.findProgramAddressSync([Buffer.from("metadata"), new PublicKey(METAPLEX).toBuffer(), new PublicKey(mint).toBuffer()], new PublicKey(METAPLEX))[0].toBase58();

/** On-chain mint facts: program, authorities, decimals, metadata (never client-supplied). */
export async function readMint(mint, { rpcUrl, f = fetch }) {
  const v = (await rpc(rpcUrl, "getAccountInfo", [mint, { encoding: "jsonParsed", commitment: "confirmed" }], f))?.value;
  if (!v) return { ok: false, reason: "no account at this address on Solana mainnet" };
  if (v.owner !== TOKEN_PROGRAM && v.owner !== TOKEN_2022) return { ok: false, reason: "not an SPL Token or Token-2022 mint" };
  if (v.data?.parsed?.type !== "mint") return { ok: false, reason: "this address is a token account, not a mint" };
  const info = v.data.parsed.info || {};
  const out = { ok: true, program: v.owner === TOKEN_2022 ? "token-2022" : "spl-token", decimals: info.decimals, supply: info.supply,
    mintAuthority: info.mintAuthority || null, freezeAuthority: info.freezeAuthority || null, name: "", symbol: "", uri: "", metadataMutable: null, extensions: [] };
  for (const e of info.extensions || []) {
    out.extensions.push(e.extension);
    if (e.extension === "tokenMetadata") { out.name = cleanMetaText(e.state?.name, 32); out.symbol = cleanMetaText(e.state?.symbol, 12); out.uri = cleanMetaText(e.state?.uri, 200); out.metadataMutable = !!e.state?.updateAuthority; }
  }
  if (!out.name || !out.symbol) {
    const m = (await rpc(rpcUrl, "getAccountInfo", [metaplexPda(mint), { encoding: "base64", commitment: "confirmed" }], f).catch(() => null))?.value;
    if (m && m.owner === METAPLEX) { try { const d = decodeMetaplex(Buffer.from(m.data[0], "base64")); out.name ||= d.name; out.symbol ||= d.symbol; out.uri ||= d.uri; if (out.metadataMutable == null) out.metadataMutable = d.isMutable; } catch { /* unreadable metadata */ } }
  }
  // Risky Token-2022 extensions: a permanent delegate or transfer hook can move or block holders' tokens.
  out.riskyExtensions = out.extensions.filter((x) => ["permanentDelegate", "transferHook", "nonTransferable", "defaultAccountState", "pausableConfig"].includes(x));
  return out;
}
const IMG_OK = /^(https:\/\/[^\s"'<>]{8,300}|ipfs:\/\/[A-Za-z0-9/._-]{10,200})$/;
export const ipfsHttp = (u) => String(u || "").replace(/^ipfs:\/\//, "https://ipfs.io/ipfs/");
/** Logo URL from the on-chain metadata URI JSON (https/ipfs only, small, short timeout). Falls back to DexScreener's image. */
export async function readImage(uri, { f = fetch, timeoutMs = 4000 } = {}) {
  if (!IMG_OK.test(uri || "")) return null;
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), timeoutMs);
  try { const r = await f(ipfsHttp(uri), { signal: ac.signal, headers: { accept: "application/json" } }); if (!r.ok) return null;
    const txt = (await r.text()).slice(0, 65_536); const j = JSON.parse(txt); const img = String(j.image || "");
    return IMG_OK.test(img) ? ipfsHttp(img) : null; } catch { return null; } finally { clearTimeout(t); }
}
/** DexScreener: total USD liquidity across Solana pools where this mint is the base token, best market cap, oldest pool age. */
export async function readMarket(mint, { f = fetch, timeoutMs = 6000 } = {}) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), timeoutMs);
  try { const r = await f(`https://api.dexscreener.com/tokens/v1/solana/${mint}`, { signal: ac.signal }); if (!r.ok) throw new Error("dexscreener " + r.status);
    const a = ((await r.json()) || []).filter((p) => p?.baseToken?.address === mint && p.chainId === "solana");
    if (!a.length) return { ok: true, pools: 0, liquidityUsd: 0, mcapUsd: null, createdAt: null, dexes: [], image: null };
    return { ok: true, pools: a.length, liquidityUsd: Math.round(a.reduce((s, p) => s + Number(p.liquidity?.usd || 0), 0)), mcapUsd: Math.max(...a.map((p) => Number(p.marketCap || p.fdv || 0))) || null,
      createdAt: Math.min(...a.map((p) => Number(p.pairCreatedAt || Infinity))) || null, dexes: [...new Set(a.map((p) => p.dexId))], image: a.find((p) => p.info?.imageUrl)?.info?.imageUrl || null };
  } catch (e) { return { ok: false, reason: String(e?.message || e).slice(0, 80) }; } finally { clearTimeout(t); }
}
export async function readRugcheck(mint, { f = fetch, timeoutMs = 5000 } = {}) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), timeoutMs);
  try { const r = await f(`https://api.rugcheck.xyz/v1/tokens/${mint}/report/summary`, { signal: ac.signal }); if (!r.ok) return null;
    const j = await r.json(); return { danger: (j.risks || []).filter((x) => x.level === "danger").map((x) => cleanMetaText(x.name, 60)).slice(0, 6) }; }
  catch { return null; } finally { clearTimeout(t); }
}
/** pump.fun quote acceptance + SOL → coin first hop, via the vendored official SDK (same code path as the Launchpad build). */
export async function readRoute(mint, routeDeps) {
  try { await routeDeps.resolveQuote(mint); } catch (e) { return { ok: false, reason: "pump.fun does not accept this coin as a quote pair (" + String(e?.message || e).slice(0, 90) + ")" }; }
  try { const hop = await routeDeps.resolveFirstHop(mint); return { ok: true, venue: hop.venue === "pool" ? "pumpswap-pool" : "pump-curve" }; }
  catch (e) { return { ok: false, reason: "no SOL buy route for this coin (" + String(e?.message || e).slice(0, 90) + ")" }; }
}

/**
 * Full verification. deps: { rpcUrl, f, routeDeps:{resolveQuote, resolveFirstHop}, now, rules, rugcheck:boolean }.
 * -> { ok, mint, name, symbol, image, program, venue, liquidityUsd, mcapUsd, createdAt, redFlags[], failures[], checkedAt }
 */
export async function verifyCommunityMint(mint, { rpcUrl, f = fetch, routeDeps, now = Date.now(), rules = COMMUNITY_RULES, rugcheck = true } = {}) {
  mint = String(mint || "").trim();
  const base = { mint, checkedAt: now, rules: { minLiquidityUsd: rules.minLiquidityUsd } };
  if (!B58.test(mint)) return { ...base, ok: false, failures: ["that is not a Solana mint address"], redFlags: [] };
  try { new PublicKey(mint); } catch { return { ...base, ok: false, failures: ["that is not a Solana mint address"], redFlags: [] }; }
  const failures = [], redFlags = [];
  let m; try { m = await readMint(mint, { rpcUrl, f }); } catch (e) { return { ...base, ok: false, failures: ["couldn't read the mint on-chain right now, try again"], redFlags: [], transient: true }; }
  if (!m.ok) return { ...base, ok: false, failures: [m.reason], redFlags: [] };
  if (m.mintAuthority) failures.push("mint authority is not revoked (more tokens can be minted)");
  if (m.freezeAuthority) failures.push("freeze authority is not revoked (holders' tokens can be frozen)");
  if (!m.name || !m.symbol) failures.push("no on-chain name/ticker metadata");
  if (m.riskyExtensions.length) failures.push("risky Token-2022 extension: " + m.riskyExtensions.join(", "));
  const imp = m.name || m.symbol ? impersonates({ mint, name: m.name, symbol: m.symbol }) : impersonates({ mint });
  if (imp) failures.push(imp);
  const [route, market, image, rc] = await Promise.all([
    routeDeps ? readRoute(mint, routeDeps) : Promise.resolve({ ok: false, reason: "route check unavailable" }),
    readMarket(mint, { f }), readImage(m.uri, { f }), rugcheck ? readRugcheck(mint, { f }) : Promise.resolve(null)]);
  if (!route.ok) failures.push(route.reason);
  if (!market.ok) failures.push("couldn't read liquidity right now (" + market.reason + ")");
  else if (market.liquidityUsd < rules.minLiquidityUsd) failures.push(`liquidity $${market.liquidityUsd.toLocaleString("en-US")} is below the $${rules.minLiquidityUsd.toLocaleString("en-US")} minimum`);
  if (market.ok) {
    if (market.liquidityUsd >= rules.minLiquidityUsd && market.liquidityUsd < rules.thinLiquidityUsd) redFlags.push(`thin liquidity ($${market.liquidityUsd.toLocaleString("en-US")})`);
    if (market.mcapUsd != null && market.mcapUsd < rules.lowMcapUsd) redFlags.push(`small market cap ($${Math.round(market.mcapUsd).toLocaleString("en-US")})`);
    if (market.createdAt && now - market.createdAt < rules.youngMs) redFlags.push(`new coin (first pool ${Math.max(1, Math.round((now - market.createdAt) / 3600_000))}h old)`);
    if (market.pools === 1) redFlags.push("only one trading pool");
  }
  if (m.metadataMutable) redFlags.push("metadata can still be changed by its update authority");
  if (rc?.danger?.length) redFlags.push("RugCheck danger: " + rc.danger.join(", "));
  if (rugcheck && !rc) redFlags.push("RugCheck report unavailable");
  const checks = { mint: true, authoritiesRevoked: !m.mintAuthority && !m.freezeAuthority, metadata: !!(m.name && m.symbol), safeExtensions: !m.riskyExtensions.length,
    solRoute: !!route.ok, liquidity: !!(market.ok && market.liquidityUsd >= rules.minLiquidityUsd), notOfficial: !imp };
  return { ...base, ok: failures.length === 0, checks, name: m.name, symbol: m.symbol.replace(/^\$/, "").toUpperCase(), uri: m.uri, image: image || market.image || null, program: m.program, decimals: m.decimals,
    mintAuthority: m.mintAuthority, freezeAuthority: m.freezeAuthority, venue: route.ok ? route.venue : null, liquidityUsd: market.ok ? market.liquidityUsd : null, mcapUsd: market.ok ? market.mcapUsd : null,
    createdAt: market.ok ? market.createdAt : null, dexes: market.ok ? market.dexes : [], redFlags, failures };
}

/** Approved community record from the Kibble Pay registry (hidden/removed/blocked -> null). Throws only on network failure. */
export async function registryRecord(mint, { base, f = fetch, timeoutMs = COMMUNITY_RULES.registryTimeoutMs }) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), timeoutMs);
  try { const r = await f(`${String(base).replace(/\/$/, "")}/api/cabal?op=cm-get&mint=${encodeURIComponent(mint)}`, { signal: ac.signal, headers: { accept: "application/json" } });
    if (r.status === 404) return null; if (!r.ok) throw new Error("registry " + r.status);
    const j = await r.json(); const c = j?.coin; return c && c.mint === mint && !c.hidden && c.status === "approved" ? c : null; }
  finally { clearTimeout(t); }
}
export const isMintPair = (p) => B58.test(String(p || "")) && String(p).length >= 32;

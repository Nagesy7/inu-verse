import { rpcUrl } from "./rpc.js";
// Pair-asset allowlist for the Launch Hall. $KIBBLE is always first and exempt from thresholds.
// Candidates are Inu/Doge-themed Solana coins that pump.fun Custom Pairs accepts as a quote
// (listed on https://pump.fun/docs/custom-pairs, or SOL-launched pump.fun coins = "Secondary Pair Assets").
// Each candidate is re-checked live: DexScreener market cap / liquidity and RugCheck (no "danger" risks). Failing ones are hidden.
export const PAIR_RULES = { minMcapUsd: Number(process.env.PAIR_MIN_MCAP || 100_000), minLiquidityUsd: Number(process.env.PAIR_MIN_LIQ || 10_000), cacheMs: 10 * 60_000 };
export const KIBBLE_PAIR = { mint: "4VE9sy4fEMJdZ6i7MkYPbnqDJd2oqzJQmg44WJ3opump", symbol: "KIBBLE", name: "Kibble", featured: true, pumpBasis: "SOL-launched pump.fun coin (Secondary Pair Asset)" };
export const PAIR_CANDIDATES = [
  { mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", symbol: "WIF", name: "dogwifhat", pumpBasis: "on pump.fun Supported Pair Assets list" },
  { mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", symbol: "BONK", name: "Bonk", pumpBasis: "on pump.fun Supported Pair Assets list" },
  { mint: "HgBRWfYxEfvPhtqkaeymCQtHCrKE46qQ43pKe8HCpump", symbol: "Bert", name: "Bertram The Pomeranian", pumpBasis: "on pump.fun Supported Pair Assets list (launched on pump.fun)" },
  { mint: "BcHEaaTCvycPwwsJ9yQTXdHP9X2gCLkznDbZ8VySpump", symbol: "Jotchua", name: "Jotchua", pumpBasis: "on pump.fun Supported Pair Assets list (launched on pump.fun)" },
  { mint: "DoGEV7LASBkQbibMc5k5vKnTZoMg423GpJ5QtJEGfm7R", symbol: "DOGE", name: "Dogecoin (Sunrise/Wormhole)", pumpBasis: "on pump.fun Supported Pair Assets list" },
];
export async function dexMarket(mint, f = fetch) { const r = await f(`https://api.dexscreener.com/tokens/v1/solana/${mint}`); if (!r.ok) throw new Error("dexscreener " + r.status);
  const a = (await r.json() || []).filter((p) => p.baseToken?.address === mint); if (!a.length) return { mcap: null, liquidity: 0 };
  return { mcap: Math.max(...a.map((p) => Number(p.marketCap || p.fdv || 0))), liquidity: a.reduce((s, p) => s + Number(p.liquidity?.usd || 0), 0) }; }
export async function rugcheck(mint, f = fetch) { const r = await f(`https://api.rugcheck.xyz/v1/tokens/${mint}/report/summary`); if (!r.ok) throw new Error("rugcheck " + r.status);
  const j = await r.json(); const danger = (j.risks || []).filter((x) => x.level === "danger").map((x) => x.name); return { danger, score: j.score_normalised ?? null }; }
export function judge(c, m, rc, rules = PAIR_RULES) { const why = [];
  if (!m || m.mcap == null) why.push("no market data"); else { if (m.mcap < rules.minMcapUsd) why.push(`market cap below $${rules.minMcapUsd.toLocaleString("en-US")}`); if (m.liquidity < rules.minLiquidityUsd) why.push(`liquidity below $${rules.minLiquidityUsd.toLocaleString("en-US")}`); }
  if (!rc) why.push("RugCheck unavailable"); else if (rc.danger.length) why.push("RugCheck danger: " + rc.danger.join(", "));
  return { ...c, mcap: m?.mcap ?? null, liquidity: m?.liquidity ?? null, rugcheck: rc ? (rc.danger.length ? "danger" : "ok") : "unavailable", eligible: !why.length, why }; }
// $KIBBLE's pump.fun bonding curve (PDA verified in tests). Byte 48 = complete (graduated).
export const KIBBLE_CURVE = "CwcC2iMpRVGgxZKKnmLq9N3fMjVVPSkLGKdvU7piXLrc";
export async function curveStatus(addr, { f = fetch, rpc = rpcUrl(process.env) } = {}) {
  const r = await f(rpc, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getAccountInfo", params: [addr, { encoding: "base64" }] }) });
  const v = (await r.json()).result?.value; if (!v) return null; const d = Buffer.from(v.data[0], "base64"); return { graduated: d[48] === 1 }; }
// Honest note for the featured pair: pump.fun lets a SOL-launched pump.fun coin be a "Secondary Pair Asset" "where the platform permits".
export function kibbleNote(graduated) { return graduated === true ? "Graduated. Search its CA under Custom Pairs on pump.fun's create page."
  : graduated === false ? "Not graduated yet (still on its bonding curve). pump.fun may not offer $KIBBLE under Custom Pairs until it graduates — if it doesn't appear when you paste the CA, it isn't available yet; pick another pair below or use SOL. Tip: the launcher above pairs your coin with $KIBBLE directly (pump.fun create_v2, checked by a dry run)."
  : "Graduation status unavailable right now. If $KIBBLE doesn't appear under Custom Pairs when you paste the CA, it isn't available yet. The launcher above can pair with $KIBBLE directly."; }
let memo = null;
export async function evaluatePairs({ f = fetch, now = Date.now(), rules = PAIR_RULES, curve = (a) => curveStatus(a, { f }) } = {}) {
  if (memo && now - memo.at < rules.cacheMs) return memo.v;
  const k = await dexMarket(KIBBLE_PAIR.mint, f).catch(() => null);
  const cs = await curve(KIBBLE_CURVE).catch(() => null), graduated = cs ? cs.graduated : null;
  const rows = await Promise.all(PAIR_CANDIDATES.map(async (c) => judge(c, await dexMarket(c.mint, f).catch(() => null), await rugcheck(c.mint, f).catch(() => null), rules)));
  const v = { rules: { minMcapUsd: rules.minMcapUsd, minLiquidityUsd: rules.minLiquidityUsd }, checkedAt: now,
    pairs: [{ ...KIBBLE_PAIR, mcap: k?.mcap ?? null, liquidity: k?.liquidity ?? null, eligible: true, exempt: true, graduated, availability: graduated ? "available" : "unconfirmed", note: kibbleNote(graduated), why: [] }, ...rows.filter((r) => r.eligible).sort((a, b) => b.mcap - a.mcap)], rejected: rows.filter((r) => !r.eligible) };
  memo = { at: now, v }; return v; }
export const _resetPairs = () => { memo = null; };

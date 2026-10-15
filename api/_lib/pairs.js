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
let memo = null;
export async function evaluatePairs({ f = fetch, now = Date.now(), rules = PAIR_RULES } = {}) {
  if (memo && now - memo.at < rules.cacheMs) return memo.v;
  const k = await dexMarket(KIBBLE_PAIR.mint, f).catch(() => null);
  const rows = await Promise.all(PAIR_CANDIDATES.map(async (c) => judge(c, await dexMarket(c.mint, f).catch(() => null), await rugcheck(c.mint, f).catch(() => null), rules)));
  const v = { rules: { minMcapUsd: rules.minMcapUsd, minLiquidityUsd: rules.minLiquidityUsd }, checkedAt: now,
    pairs: [{ ...KIBBLE_PAIR, mcap: k?.mcap ?? null, liquidity: k?.liquidity ?? null, eligible: true, exempt: true, why: [] }, ...rows.filter((r) => r.eligible).sort((a, b) => b.mcap - a.mcap)], rejected: rows.filter((r) => !r.eligible) };
  memo = { at: now, v }; return v; }
export const _resetPairs = () => { memo = null; };

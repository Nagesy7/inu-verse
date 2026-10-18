// Server-side Solana RPC endpoint + browser proxy. The RPC URL (which may embed a provider API key) lives ONLY in server
// env: SOLANA_RPC (full URL) or HELIUS_API_KEY (URL built here). It is never sent to the browser, and every error message
// leaving the server is redacted.
export const PUBLIC_RPC = "https://api.mainnet-beta.solana.com";
export function rpcUrl(env = process.env) {
  if (env.SOLANA_RPC) return env.SOLANA_RPC;
  if (env.HELIUS_API_KEY) return "https://mainnet.helius-rpc.com/?api-key=" + encodeURIComponent(env.HELIUS_API_KEY);
  return PUBLIC_RPC;
}
// Non-secret diagnostic: WHICH kind of endpoint is configured, derived only from which env var is set.
// "HL" = dedicated Helius endpoint (HELIUS_API_KEY); "custom" = SOLANA_RPC; "public" = public mainnet RPC.
export function rpcProvider(env = process.env) { return env.SOLANA_RPC ? "custom" : env.HELIUS_API_KEY ? "HL" : "public"; }
export function redact(s, env = process.env) {
  let out = String(s ?? "");
  for (const secret of [env.SOLANA_RPC, env.HELIUS_API_KEY, env.HELIUS_API_KEY && encodeURIComponent(env.HELIUS_API_KEY)]) if (secret && secret.length > 3) out = out.split(secret).join("[rpc]");
  return out.replace(/api[-_]?key=[^&\s"'<>]+/gi, "api-key=[redacted]").replace(/https?:\/\/[^\s"'<>]*helius[^\s"'<>]*/gi, "[rpc]");
}
// Read-mostly methods the browser may call through /api/launch {action:"rpc"}. Transactions go through {action:"send"},
// which only relays fully signed pump.fun launch transactions.
export const RPC_ALLOW = new Set(["getBalance", "getLatestBlockhash", "getSignatureStatuses", "getAccountInfo"]);
export async function proxyRpc({ method, params }, { env = process.env, f = fetch } = {}) {
  if (!RPC_ALLOW.has(method)) return { code: 400, body: { error: `method not allowed (allowed: ${[...RPC_ALLOW].join(", ")})` } };
  if (params != null && !Array.isArray(params)) return { code: 400, body: { error: "params must be an array" } };
  if (JSON.stringify(params || []).length > 2000) return { code: 400, body: { error: "params too large" } };
  try { const r = await f(rpcUrl(env), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: params || [] }) });
    const j = await r.json().catch(() => ({}));
    if (j.error) return { code: 502, body: { error: redact(j.error.message || "rpc error", env) } };
    return { code: r.ok ? 200 : 502, body: r.ok ? { result: j.result, rpcProvider: rpcProvider(env) } : { error: "rpc unavailable (" + r.status + ")" } }; }
  catch (e) { return { code: 502, body: { error: "rpc unavailable: " + redact(e?.message || e, env).slice(0, 120) } }; }
}

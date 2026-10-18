// GET /api/kibble-mood -> { price, change1h, change24h, mood, updatedAt, ... } for $KIBBLE. Public, read-only, CORS *.
// Sources in order: DexScreener token API -> pump.fun coins-v2 -> on-chain pump.fun bonding-curve read through the server RPC
// (HELIUS_API_KEY stays server-side; errors are redacted). Cached 60 s in Upstash under kibble:mood so all players share one
// fetch. When a source gives no 1h/24h change (pump.fun, on-chain) the change is computed from our own price samples
// (kibble:mood:hist), and stays null until enough history exists (null change -> "chill"). Mood hysteresis: a new mood
// must hold for 2 consecutive refreshes before it shows. Everything failing -> last good answer marked stale, else "chill".
import { MINT, classify, stepMood, FALLBACK } from "../src/kibblemood.js";
import { rpcUrl, redact } from "./_lib/rpc.js";
import { upstashKv, memoryKv } from "./_lib/kv.js";

export const KEY = "kibble:mood", HIST = "kibble:mood:hist", LOCK = "kibble:mood:lock";
export const TTL_MS = 60_000, HIST_MAX = 400, HIST_EVERY_MS = 4 * 60_000;
const PUMP = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P", BONDING_CURVE = "CwcC2iMpRVGgxZKKnmLq9N3fMjVVPSkLGKdvU7piXLrc"; // PDA ["bonding-curve", mint] (tests/launchhall verifies the derivation)
const DEC = 6;
const n = (v) => { if (v === null || v === undefined || v === "") return null; const x = Number(v); return Number.isFinite(x) ? x : null; };
const pos = (v) => { const x = n(v); return x != null && x > 0 ? x : null; };
const timed = (f, ms = 6000) => (u, o = {}) => { const c = new AbortController(), t = setTimeout(() => c.abort(), ms); return f(u, { ...o, signal: c.signal }).finally(() => clearTimeout(t)); };

export async function fromDex(f) { const r = await f(`https://api.dexscreener.com/tokens/v1/solana/${MINT}`); if (!r.ok) throw new Error("dexscreener " + r.status);
  const a = (await r.json() || []).filter((p) => p?.baseToken?.address === MINT && pos(p.priceUsd)); if (!a.length) return null;
  const p = a.sort((x, y) => (y.liquidity?.usd || 0) - (x.liquidity?.usd || 0))[0];
  return { source: "dexscreener", price: pos(p.priceUsd), change1h: n(p.priceChange?.h1), change24h: n(p.priceChange?.h24), liquidityUsd: n(p.liquidity?.usd), marketCapUsd: pos(p.marketCap) ?? pos(p.fdv) }; }
export async function fromPump(f) { const r = await f(`https://frontend-api-v3.pump.fun/coins-v2/${MINT}`, { headers: { accept: "application/json", "user-agent": "Mozilla/5.0 (InuVerse mood)" } }); if (!r.ok) throw new Error("pump.fun " + r.status);
  const j = await r.json(); const mc = pos(j.usd_market_cap ?? j.market_cap_usd), sup = pos(j.total_supply_str ?? j.total_supply); if (!mc || !sup) return null;
  return { source: "pump.fun", price: mc / (sup / 10 ** (j.base_decimals ?? DEC)), change1h: null, change24h: null, liquidityUsd: n(j.canonical_pool_liquidity_usd), marketCapUsd: mc, graduated: !!j.complete }; }
export function parseCurve(b64) { const d = Buffer.from(b64, "base64"); if (d.length < 49) return null; const u = (o) => Number(d.readBigUInt64LE(o));
  return { virtualTokenReserves: u(8), virtualSolReserves: u(16), realTokenReserves: u(24), realSolReserves: u(32), tokenTotalSupply: u(40), complete: d[48] === 1 }; }
export async function solUsd(f) { try { const r = await f("https://api.coinbase.com/v2/prices/SOL-USD/spot"); if (!r.ok) return null; return pos((await r.json())?.data?.amount); } catch { return null; } }
export async function fromChain(f, env) { const r = await f(rpcUrl(env), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getAccountInfo", params: [BONDING_CURVE, { encoding: "base64" }] }) });
  const j = await r.json(); const v = j?.result?.value; if (!v || v.owner !== PUMP) return null; const c = parseCurve(v.data?.[0] || ""); if (!c || !c.virtualTokenReserves) return null;
  const priceSol = (c.virtualSolReserves / 1e9) / (c.virtualTokenReserves / 10 ** DEC), usd = await solUsd(f);
  return { source: "onchain", priceSol, price: usd ? priceSol * usd : null, change1h: null, change24h: null, liquidityUsd: usd ? (c.realSolReserves / 1e9) * usd : null, graduated: c.complete }; }

// ---- % change fallbacks (keyless, public). Used only when the price source gave no change. Never invented: no data -> null.
// GeckoTerminal indexes the pump.fun bonding curve as a pool and publishes h1/h24 price change (computed from real trades).
export async function changesFromGecko(f) { const r = await f(`https://api.geckoterminal.com/api/v2/networks/solana/tokens/${MINT}/pools?page=1`, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error("geckoterminal " + r.status); const a = ((await r.json())?.data || []).map((d) => d?.attributes).filter((x) => x?.price_change_percentage);
  if (!a.length) return null; const p = a.sort((x, y) => (n(y.reserve_in_usd) || 0) - (n(x.reserve_in_usd) || 0))[0], c = p.price_change_percentage;
  return { change1h: n(c.h1), change24h: n(c.h24), source: "geckoterminal" }; }
// pump.fun 1h candles exist only for hours with trades, so the price at time T is the close of the last candle at or before T
// (no trade since = same price). If the coin has no candle at or before T (younger than the window), the change is null.
export function candleChange(candles, now, ago, price) { if (price == null || !Array.isArray(candles) || !candles.length) return null; const T = now - ago, H = 3600_000;
  const c = candles.map((k) => ({ t: Number(k.timestamp), open: n(k.open), close: n(k.close) })).filter((k) => Number.isFinite(k.t) && k.close > 0).sort((a, b) => a.t - b.t);
  let at = null; for (const k of c) { if (k.t + H <= T) at = k.close; else { if (k.t <= T && k.open > 0) at = k.open; break; } } // a candle containing T: use its open (the price before its trades)
  return at ? ((price - at) / at) * 100 : null; }
export async function changesFromPumpCandles(f, now, price) { if (price == null) return null;
  const r = await f(`https://swap-api.pump.fun/v2/coins/${MINT}/candles?interval=1h&limit=1000&currency=USD&createdTs=${now - 30 * 86400_000}`, { headers: { accept: "application/json", "user-agent": "Mozilla/5.0 (InuVerse mood)" } });
  if (!r.ok) throw new Error("pump.fun candles " + r.status); const l = await r.json(); if (!Array.isArray(l) || !l.length) return null;
  return { change1h: candleChange(l, now, 3600_000, price), change24h: candleChange(l, now, 24 * 3600_000, price), source: "pump.fun candles" }; }

// change vs the sample nearest to `ago` ms back, only if one exists within the tolerance window
export function changeFrom(hist, now, price, ago, tol, unit = "usd") { if (price == null) return null; let best = null;
  for (const s of hist || []) { const v = s[unit]; if (v == null) continue; const d = Math.abs(now - ago - s.t); if (d <= tol && (!best || d < best.d)) best = { d, v }; }
  return best ? ((price - best.v) / best.v) * 100 : null; }
export function addSample(hist, now, q) { const h = (hist || []).filter((s) => now - s.t < 27 * 3600_000); const last = h[h.length - 1];
  if (!last || now - last.t >= HIST_EVERY_MS) h.push({ t: now, usd: q.price ?? null, sol: q.priceSol ?? null }); return h.slice(-HIST_MAX); }

export async function refresh({ prev, hist, now, f, env }) { let q = null; const errors = [];
  for (const src of [() => fromDex(f), () => fromPump(f), () => fromChain(f, env)]) { try { q = await src(); if (q) break; } catch (e) { errors.push(redact(e?.message || String(e), env).slice(0, 80)); } }
  if (!q) return { resp: prev?.resp ? { ...prev.resp, stale: true, cached: true } : { price: null, change1h: null, change24h: null, mood: FALLBACK, updatedAt: null, stale: true, source: "none", mint: MINT }, state: prev?.state || null, hist, at: prev?.at || 0, failed: true, errors };
  const h = addSample(hist, now, q), unit = q.price != null ? "usd" : "sol", p = q.price ?? q.priceSol, src = { h1: q.change1h != null ? q.source : null, h24: q.change24h != null ? q.source : null };
  // fill missing changes: GeckoTerminal -> pump.fun candles (USD price only) -> our own Upstash price samples. Each field keeps the first real value.
  const fill = (c) => { if (!c) return; if (q.change1h == null && c.change1h != null) { q.change1h = c.change1h; src.h1 = c.source; } if (q.change24h == null && c.change24h != null) { q.change24h = c.change24h; src.h24 = c.source; } };
  if (q.change1h == null || q.change24h == null) { try { fill(await changesFromGecko(f)); } catch (e) { errors.push(redact(e?.message || String(e), env).slice(0, 80)); } }
  if ((q.change1h == null || q.change24h == null) && q.price != null) { try { fill(await changesFromPumpCandles(f, now, q.price)); } catch (e) { errors.push(redact(e?.message || String(e), env).slice(0, 80)); } }
  fill({ change1h: changeFrom(hist, now, p, 3600_000, 20 * 60_000, unit), change24h: changeFrom(hist, now, p, 24 * 3600_000, 3 * 3600_000, unit), source: "Inu Verse price samples" });
  const changeSource = src.h1 === src.h24 ? src.h1 : [src.h1 && "1h: " + src.h1, src.h24 && "24h: " + src.h24].filter(Boolean).join(" · ") || null;
  const raw = classify(q.change1h, q.change24h), state = stepMood(prev?.state, raw);
  const r1 = (x, d = 2) => x == null ? null : Math.round(x * 10 ** d) / 10 ** d;
  const resp = { mint: MINT, symbol: "KIBBLE", price: q.price ?? null, priceSol: q.priceSol ?? null, change1h: r1(q.change1h), change24h: r1(q.change24h), mood: state.mood, rawMood: raw, pendingMood: state.pending,
    updatedAt: new Date(now).toISOString(), source: q.source, changeSource, samples: h.length, samplesSinceMin: h.length ? Math.round((now - h[0].t) / 60000) : 0, liquidityUsd: r1(q.liquidityUsd), marketCapUsd: r1(q.marketCapUsd), stale: false };
  return { resp, state, hist: h, at: now }; }

let MEM = null; // fallback store when Upstash env is missing (local dev)
export function makeHandler({ env = process.env, kv, f = timed(fetch), now = () => Date.now() } = {}) {
  const store = kv !== undefined ? kv : (upstashKv(env) || (MEM ||= memoryKv()));
  return async function handler(req, res) {
    res.setHeader("access-control-allow-origin", "*"); res.setHeader("content-type", "application/json");
    if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
    if (req.method !== "GET") { res.statusCode = 405; return res.end(JSON.stringify({ error: "GET only" })); }
    const t = now(); let prev = null, hist = [];
    try { prev = JSON.parse((await store.get(KEY)) || "null"); } catch {}
    const send = (o, fresh) => { res.statusCode = 200; res.setHeader("cache-control", fresh ? "public, max-age=20, s-maxage=30, stale-while-revalidate=30" : "no-store"); res.end(redact(JSON.stringify(o), env)); };
    if (prev?.resp && t - prev.at < TTL_MS) return send({ ...prev.resp, cached: true, ageMs: t - prev.at }, true);
    if (prev?.resp) { let cool = null; try { cool = await store.get(KEY + ":fail"); } catch {} if (cool) return send({ ...prev.resp, stale: true, cached: true, ageMs: t - prev.at }, false); } // sources just failed: don't hammer them
    let got = true; try { got = await store.setNX(LOCK, "1", 20); } catch {}
    if (!got && prev?.resp) return send({ ...prev.resp, cached: true, ageMs: t - prev.at }, true); // someone else is refreshing
    try { hist = JSON.parse((await store.get(HIST)) || "[]"); } catch {}
    const out = await refresh({ prev, hist, now: t, f, env });
    if (out.failed) { try { await store.set(KEY + ":fail", "1", 30); } catch {} }
    if (!out.failed) { try { await store.set(KEY, JSON.stringify({ resp: out.resp, state: out.state, at: out.at }), 86400); await store.set(HIST, JSON.stringify(out.hist), 2 * 86400); } catch {} }
    try { await store.del(LOCK); } catch {}
    return send({ ...out.resp, cached: !!out.failed }, !out.failed);
  };
}
export default makeHandler();

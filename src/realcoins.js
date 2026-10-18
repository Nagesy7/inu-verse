// Real coins in the Launch Hall: the official $KIBBLE (pump.fun, Token-2022) plus coins players launched themselves on
// pump.fun and registered here. The game never creates, holds or signs tokens: launching happens on pump.fun.
// Live stats come from DexScreener's public API, cached; on any failure we show "unavailable", never made-up numbers.
export const KIBBLE = { mint: '4VE9sy4fEMJdZ6i7MkYPbnqDJd2oqzJQmg44WJ3opump', symbol: 'KIBBLE', name: 'Kibble', program: 'Token-2022', color: '#e5a03a' };
export const PUMP_COIN = (mint) => `https://pump.fun/coin/${mint}`;
export const DEX_URL = (mint) => `https://dexscreener.com/solana/${mint}`;
export const PUMP_CREATE = 'https://pump.fun/create';
export const phantomBrowse = (url, ref = 'https://inu-verse-tawny.vercel.app') => `https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(ref)}`;
export const isMint = (s) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(s || '').trim());
export const short = (a) => a ? `${a.slice(0, 4)}…${a.slice(-4)}` : '';
export const CACHE_MS = 60_000;

const cache = new Map(); // mint -> { at, stats|null, p }
export function _resetCache() { cache.clear(); }
export function parseDex(arr, mint) {
  if (!Array.isArray(arr) || !arr.length) return null;
  const mine = arr.filter((p) => p?.baseToken?.address === mint); const list = mine.length ? mine : arr;
  const p = list.slice().sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0) || (b.volume?.h24 || 0) - (a.volume?.h24 || 0))[0];
  const num = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };
  const priceUsd = num(p.priceUsd), mcap = num(p.marketCap) ?? num(p.fdv);
  if (priceUsd == null && mcap == null) return null;
  return { priceUsd, mcap, change24: Number.isFinite(Number(p.priceChange?.h24)) ? Number(p.priceChange.h24) : null, vol24: num(p.volume?.h24), dex: p.dexId || '', pair: p.pairAddress || '',
    name: p.baseToken?.name || '', symbol: (p.baseToken?.symbol || '').replace(/^\$/, ''), quote: p.quoteToken?.symbol || '', quoteMint: p.quoteToken?.address || '', url: p.url || DEX_URL(mint) };
}
// Batched: DexScreener accepts up to 30 comma-separated mints per call.
export async function fetchStats(mints, { f = globalThis.fetch, now = Date.now() } = {}) {
  const want = [...new Set(mints.filter(isMint))], need = want.filter((m) => { const c = cache.get(m); return !c || now - c.at > (c.stats ? CACHE_MS : CACHE_MS / 2); });
  for (let i = 0; i < need.length; i += 30) {
    const chunk = need.slice(i, i + 30);
    try { const r = await f(`https://api.dexscreener.com/tokens/v1/solana/${chunk.join(',')}`); if (!r.ok) throw new Error('HTTP ' + r.status); const a = await r.json();
      for (const m of chunk) cache.set(m, { at: now, stats: parseDex((a || []).filter((p) => p?.baseToken?.address === m), m) }); }
    catch { for (const m of chunk) { const old = cache.get(m); cache.set(m, { at: now, stats: old?.stats && now - old.at < 5 * CACHE_MS ? old.stats : null, err: true }); } }
  }
  return Object.fromEntries(want.map((m) => [m, cache.get(m)?.stats || null]));
}
export const statsOf = (mint) => cache.get(mint)?.stats || null;
export function fmtUsd(n) { if (n == null) return 'unavailable'; if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'; if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'; if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  if (n >= 1) return '$' + n.toFixed(2); if (n === 0) return '$0'; const d = Math.max(2, -Math.floor(Math.log10(n)) + 2); return '$' + n.toFixed(Math.min(d, 12)); }
export const fmtPct = (p) => p == null ? '—' : (p >= 0 ? '+' : '') + p.toFixed(1) + '%';
function hue(s) { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return `hsl(${h % 360} 65% 50%)`; }

// ---- registry API (same-origin /api/coins) ----
export async function listCoins({ f = globalThis.fetch, base = '' } = {}) {
  try { const r = await f(base + '/api/coins'); const j = await r.json().catch(() => ({})); if (!r.ok) return { ok: false, offline: r.status === 503 || r.status === 404, reason: j.error || 'registry unavailable', coins: [] };
    return { ok: true, coins: j.coins || [], reportsToHide: j.reportsToHide }; } catch { return { ok: false, offline: true, reason: 'registry unavailable', coins: [] }; } }
export async function postCoins(body, { session, admin, f = globalThis.fetch, base = '' } = {}) {
  const h = { 'content-type': 'application/json' }; if (session) h.authorization = 'Bearer ' + session; if (admin) h['x-admin-token'] = admin;
  try { const r = await f(base + '/api/coins', { method: 'POST', headers: h, body: JSON.stringify(body) }); const j = await r.json().catch(() => ({})); return r.ok ? { ok: true, ...j } : { ok: false, reason: j.error || 'request failed' }; }
  catch { return { ok: false, reason: 'registry unavailable' }; } }

// Billboard/ad views: $KIBBLE first, then registered coins. pct = DexScreener 24h change, or null when unavailable.
// tag(mint, coin) adds display flags (Verified Launch seal, fixture label) from src/verified.js.
export function realTrend(coins = [], n = 6, tag = () => ({})) {
  const v = (mint, symbol, name, color, c) => { const s = statsOf(mint); return { id: 'real:' + mint, mint, real: true, ticker: (s?.symbol || symbol || '???').slice(0, 10), name: s?.name || name || short(mint), color, pct: s?.change24 ?? null, heat: s?.vol24 || 0, ...tag(mint, c) }; };
  return [v(KIBBLE.mint, KIBBLE.symbol, KIBBLE.name, KIBBLE.color), ...coins.filter((c) => !c.hidden).map((c) => v(c.mint, c.symbol, c.name, hue(c.mint), c)).sort((a, b) => b.heat - a.heat)].slice(0, n);
}
// Eligible pair assets (server-checked live: $KIBBLE first + Inu/Doge coins over the mcap/liquidity/RugCheck bar).
export async function listPairs({ f = globalThis.fetch, base = '' } = {}) {
  try { const r = await f(base + '/api/coins?pairs=1'); if (!r.ok) throw 0; const j = await r.json(); return { ok: true, ...j }; }
  catch { return { ok: false, pairs: [{ mint: KIBBLE.mint, symbol: KIBBLE.symbol, name: KIBBLE.name, featured: true, exempt: true }], rules: null }; } }

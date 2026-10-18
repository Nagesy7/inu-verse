// ---- Kibble Kennel tier: looked up by the SERVER for a verified wallet; whatever tier a client sends is ignored ----
// Kennel API v2 (kibble-pay docs/KENNEL_API.md, hybrid since 18 Oct 2026): `tier` comes from hold streaks (tierSource
// 'hold-streak'), and `locked.flair` is a separate optional Locked flair (a 100K+ self-lock) that never sets a tier.
// One kibble-pay lookup per wallet per KENNEL_TTL_MS (Workers Free plan friendly): per-object memory map, then the
// colo-wide Cache API (shared by every room object in the colo), then the socket attachment survives hibernation.
// Guests / unverified players never get a tier. Any failure (network, non-200, bad or non-v2 body, other wallet) = no tier
// and no flair (fail closed).
export const KENNEL_TTL_MS = 10 * 60_000;
export const KENNEL_TIERS = ['pup', 'guard', 'alpha', 'top'];
export const NONE = Object.freeze({ k: null, lf: false });
// -> { k: tier|null, lf: bool }
export function kennelFromBody(j, wallet) { if (!j || typeof j !== 'object' || j.wallet !== wallet || j.tierSource !== 'hold-streak') return NONE;
  const t = j.tier === 'topdog' ? 'top' : j.tier; return { k: KENNEL_TIERS.includes(t) ? t : null, lf: !!(j.locked && typeof j.locked === 'object' && j.locked.flair === true) }; }
// drop any self-reported tier from a cleaned look (pl.look.kennel); a pl that only carried the tier goes away entirely
export function stripKennel(look) { const pl = look?.pl; if (!pl) return look; if (pl.look) { delete pl.look.kennel; delete pl.look.kflair; }
  if (!Object.keys(pl.look || {}).length && !Object.values(pl.outfit || {}).some(Boolean)) delete look.pl; return look; }
const valid = (v) => v && typeof v === 'object' && (v.k === null || KENNEL_TIERS.includes(v.k)) && typeof v.lf === 'boolean';
export function makeKennelLookup({ kpUrl = 'https://kibble-pay.vercel.app', f = (...a) => fetch(...a), now = () => Date.now(), cache = null, mem = new Map(), timeoutMs = 4000 } = {}) {
  const inflight = new Map(); let calls = 0;
  const out = (v) => ({ k: v.k, lf: v.lf });
  async function lookup(wallet) { if (typeof wallet !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) return out(NONE);
    const hit = mem.get(wallet); if (hit && now() - hit.at < KENNEL_TTL_MS) return out(hit);
    if (inflight.has(wallet)) return inflight.get(wallet);
    const p = (async () => { const ck = `https://kennel-cache.inu-verse.internal/v2/${wallet}`; // v2 key: v1 cache entries ({tier}) are never read
      if (cache) { try { const c = await cache.match(ck); if (c) { const j = await c.json(); if (valid(j) && now() - j.at < KENNEL_TTL_MS) { mem.set(wallet, j); return out(j); } } } catch {} }
      let r0 = NONE; calls++;
      try { const r = await f(`${kpUrl}/api/kennel?wallet=${encodeURIComponent(wallet)}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(timeoutMs) });
        if (r.ok) r0 = kennelFromBody(await r.json(), wallet); } catch { r0 = NONE; }
      const v = { k: r0.k, lf: r0.lf, at: now() }; mem.set(wallet, v); if (mem.size > 500) mem.delete(mem.keys().next().value);
      if (cache) { try { await cache.put(ck, new Response(JSON.stringify(v), { headers: { 'content-type': 'application/json', 'cache-control': `max-age=${KENNEL_TTL_MS / 1000}` } })); } catch {} }
      return out(v); })();
    inflight.set(wallet, p); try { return await p; } finally { inflight.delete(wallet); } }
  return { lookup, get calls() { return calls; } };
}

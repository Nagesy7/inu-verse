// ---- Kibble Kennel tier: looked up by the SERVER for a verified wallet; whatever tier a client sends is ignored ----
// One kibble-pay lookup per wallet per KENNEL_TTL_MS (Workers Free plan friendly): per-object memory map, then the
// colo-wide Cache API (shared by every room object in the colo), then the socket attachment survives hibernation.
// Guests / unverified players never get a tier. Any failure (network, non-200, bad body) = no tier (fail closed).
export const KENNEL_TTL_MS = 10 * 60_000;
export const KENNEL_TIERS = ['pup', 'guard', 'alpha', 'top'];
export function kennelFromBody(j, wallet) { if (!j || typeof j !== 'object' || j.wallet !== wallet) return null;
  const t = j.tier === 'topdog' ? 'top' : j.tier; return KENNEL_TIERS.includes(t) ? t : null; }
// drop any self-reported tier from a cleaned look (pl.look.kennel); a pl that only carried the tier goes away entirely
export function stripKennel(look) { const pl = look?.pl; if (!pl) return look; if (pl.look) delete pl.look.kennel;
  if (!Object.keys(pl.look || {}).length && !Object.values(pl.outfit || {}).some(Boolean)) delete look.pl; return look; }
export function makeKennelLookup({ kpUrl = 'https://kibble-pay.vercel.app', f = (...a) => fetch(...a), now = () => Date.now(), cache = null, mem = new Map(), timeoutMs = 4000 } = {}) {
  const inflight = new Map(); let calls = 0;
  async function lookup(wallet) { if (typeof wallet !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) return null;
    const hit = mem.get(wallet); if (hit && now() - hit.at < KENNEL_TTL_MS) return hit.tier;
    if (inflight.has(wallet)) return inflight.get(wallet);
    const p = (async () => { const ck = `https://kennel-cache.inu-verse.internal/${wallet}`;
      if (cache) { try { const c = await cache.match(ck); if (c) { const j = await c.json(); if (now() - j.at < KENNEL_TTL_MS) { mem.set(wallet, j); return j.tier; } } } catch {} }
      let tier = null; calls++;
      try { const r = await f(`${kpUrl}/api/kennel?wallet=${encodeURIComponent(wallet)}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(timeoutMs) });
        if (r.ok) tier = kennelFromBody(await r.json(), wallet); } catch { tier = null; }
      const v = { tier, at: now() }; mem.set(wallet, v); if (mem.size > 500) mem.delete(mem.keys().next().value);
      if (cache) { try { await cache.put(ck, new Response(JSON.stringify(v), { headers: { 'content-type': 'application/json', 'cache-control': `max-age=${KENNEL_TTL_MS / 1000}` } })); } catch {} }
      return tier; })();
    inflight.set(wallet, p); try { return await p; } finally { inflight.delete(wallet); } }
  return { lookup, get calls() { return calls; } };
}

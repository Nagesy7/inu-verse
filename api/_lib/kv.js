// Minimal Upstash Redis REST client (no prefix, raw keys) + an in-memory stand-in for tests / local runs.
export function upstashKv(env = process.env, f = fetch) {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL, tok = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  if (!url || !tok) return null;
  const cmd = async (...a) => { const r = await f(url, { method: "POST", headers: { authorization: "Bearer " + tok, "content-type": "application/json" }, body: JSON.stringify(a) }); const j = await r.json(); if (j.error) throw new Error("kv error"); return j.result; };
  return { kind: "upstash", get: (k) => cmd("GET", k), set: (k, v, ex) => ex ? cmd("SET", k, String(v), "EX", Math.max(1, Math.round(ex))) : cmd("SET", k, String(v)),
    setNX: async (k, v, ex) => (await cmd("SET", k, String(v), "NX", "EX", Math.max(1, Math.round(ex || 30)))) === "OK", del: (k) => cmd("DEL", k) };
}
export function memoryKv(now = () => Date.now()) { const m = new Map(); const live = (k) => { const e = m.get(k); if (!e) return null; if (e.exp && e.exp <= now()) { m.delete(k); return null; } return e; };
  return { kind: "memory", map: m, async get(k) { return live(k)?.v ?? null; }, async set(k, v, ex) { m.set(k, { v: String(v), exp: ex ? now() + ex * 1000 : 0 }); return "OK"; },
    async setNX(k, v, ex) { if (live(k)) return false; m.set(k, { v: String(v), exp: now() + (ex || 30) * 1000 }); return true; }, async del(k) { m.delete(k); } }; }

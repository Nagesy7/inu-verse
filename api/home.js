// /api/home: shared homes + guestbooks (Round 4). Public, CORS *. Stored in Upstash (KV_REST_API_*), raw keys:
//   home:v1:<id>  { kh: sha256(owner key), name, layout, updatedAt }    90-day TTL, refreshed on every publish
//   book:v1:<id>  [{ i, name, text, at }] newest first, max 50            90-day TTL
// GET  ?id=<home id>                         -> { id, name, layout, updatedAt, book, count }   (404 if never published)
// POST { op:"publish", id, key, name, layout } owner only (first publish claims the id; the server keeps only sha256(key))
// POST { op:"sign", id, name, text }           anyone; same filter as chat (cleanChat/cleanName); rate limits per hashed IP:
//                                              one entry per 15 s anywhere and one per home per 60 s (429 + retryAfter)
// POST { op:"del", id, key, entry }            owner deletes one guestbook entry
// GET  ?shop=<shop id>                      -> { id, owner, layout, updatedAt }   shop interiors (src/interiors.js), 404 if none
// POST { op:"shop", id, key, owner, layout }  owner only. The shop id is "s" + the player's home id: if a shop record exists its
//                                              key must match; else if the home record exists the HOME key must match (ids are
//                                              only broadcast after a home is published, so nobody can pre-claim someone's shop);
//                                              else the first publish claims it. Strict validation (known props for that theme
//                                              only, on the grid, no overlaps, door clear, prop cap from Bigger Shelves level,
//                                              <= 2 KB layout / 4 KB body), rate limits: one save per shop per 3 s, one per IP per 1 s.
// No tokens, wallets or payments here: a home is furniture the player already owns, copied for others to look at.
import { createHash, randomBytes } from "node:crypto";
import { upstashKv, memoryKv } from "./_lib/kv.js";
import { validHomeId, cleanLayout, cleanEntry, homeOwnerName, GB } from "../src/homeshare.js";
import { SHOP_RE, homeIdOf, cleanShopPayload } from "../src/interiors.js";

export const TTL_S = 90 * 86400, SIGN_GAP_S = 15, SIGN_HOME_GAP_S = 60, PUBLISH_GAP_S = 2, SHOP_GAP_S = 3, SHOP_IP_GAP_S = 1, SHOP_BODY_MAX = 4096;
const sha = (s) => createHash("sha256").update(String(s)).digest("hex");
const ipOf = (req) => String(req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress || "?").split(",")[0].trim();
let MEM = null;
export function makeHandler({ env = process.env, kv, now = () => Date.now(), sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  const store = kv !== undefined ? kv : (upstashKv(env) || (MEM ||= memoryKv()));
  const salt = env.HOME_IP_SALT || "inu-verse-home";
  const getJ = async (k, d) => { const raw = await store.get(k); try { return JSON.parse(raw || "null") ?? d; } catch { return d; } }; // store errors propagate (500), bad JSON -> default
  async function locked(id, fn) { const L = "home:lock:" + id; for (let i = 0; i < 20; i++) { if (await store.setNX(L, "1", 5)) { try { return await fn(); } finally { try { await store.del(L); } catch {} } } await sleep(100); } throw Object.assign(new Error("busy, try again"), { status: 503 }); }
  const owner = async (id, key) => { const h = await getJ("home:v1:" + id, null); return h && typeof key === "string" && key.length >= 16 && h.kh === sha(key) ? h : null; };
  return async function handler(req, res) {
    res.setHeader("access-control-allow-origin", "*"); res.setHeader("access-control-allow-headers", "content-type"); res.setHeader("content-type", "application/json"); res.setHeader("cache-control", "no-store");
    const send = (code, o) => { res.statusCode = code; res.end(JSON.stringify(o)); };
    if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
    try {
      if (req.method === "GET" && (req.query?.shop ?? new URL(req.url, "http://x").searchParams.get("shop")) != null) { const id = String(req.query?.shop ?? new URL(req.url, "http://x").searchParams.get("shop"));
        if (!SHOP_RE.test(id)) return send(400, { error: "bad shop id" }); const r = await getJ("shop:v1:" + id, null); if (!r) return send(404, { error: "This shop hasn't been opened to visitors yet." });
        return send(200, { id, owner: r.owner, layout: r.layout, updatedAt: r.updatedAt }); }
      if (req.method === "GET") { const id = String((req.query?.id) ?? new URL(req.url, "http://x").searchParams.get("id") ?? "");
        if (!validHomeId(id)) return send(400, { error: "bad home id" });
        const h = await getJ("home:v1:" + id, null); if (!h) return send(404, { error: "This home hasn't been opened to visitors yet." });
        const book = await getJ("book:v1:" + id, []); return send(200, { id, name: h.name, layout: h.layout, updatedAt: h.updatedAt, book, count: book.length }); }
      if (req.method !== "POST") return send(405, { error: "GET or POST" });
      const rawLen = typeof req.body === "string" ? req.body.length : JSON.stringify(req.body || {}).length; if (rawLen > SHOP_BODY_MAX * 4) return send(413, { error: "too big" });
      const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      if (b.op === "shop") { if (rawLen > SHOP_BODY_MAX) return send(413, { error: `layout too big (max ${SHOP_BODY_MAX} bytes)` });
        const sid = String(b.id || ""), hid = homeIdOf(sid); if (!hid) return send(400, { error: "bad shop id" });
        if (typeof b.key !== "string" || !/^[0-9a-f]{32}$/.test(b.key)) return send(400, { error: "bad key" });
        const c = cleanShopPayload(b.layout); if (!c.ok) return send(400, { error: c.reason });
        const ip = sha(salt + "|" + ipOf(req)).slice(0, 24);
        if (!(await store.setNX("shop:rl:ip:" + ip, "1", SHOP_IP_GAP_S))) return send(429, { error: "Saving too fast", retryAfter: SHOP_IP_GAP_S });
        if (!(await store.setNX("shop:rl:p:" + sid, "1", SHOP_GAP_S))) return send(429, { error: "Saving too fast", retryAfter: SHOP_GAP_S });
        return await locked(sid, async () => { const cur = await getJ("shop:v1:" + sid, null), home = cur ? null : await getJ("home:v1:" + hid, null), kh = sha(b.key);
          if ((cur && cur.kh !== kh) || (!cur && home && home.kh !== kh)) return send(403, { error: "not your shop" });
          const rec = { kh, owner: homeOwnerName(b.owner), layout: c.layout, updatedAt: new Date(now()).toISOString() };
          await store.set("shop:v1:" + sid, JSON.stringify(rec), TTL_S); return send(200, { ok: true, id: sid, items: c.layout.items.length, updatedAt: rec.updatedAt }); }); }
      const id = String(b.id || ""); if (!validHomeId(id)) return send(400, { error: "bad home id" });
      if (b.op === "publish") { if (typeof b.key !== "string" || !/^[0-9a-f]{32}$/.test(b.key)) return send(400, { error: "bad key" });
        const layout = cleanLayout(b.layout); if (!layout) return send(400, { error: "bad layout" });
        if (!(await store.setNX("home:rl:p:" + id, "1", PUBLISH_GAP_S))) return send(429, { error: "Saving too fast", retryAfter: PUBLISH_GAP_S });
        return await locked(id, async () => { const h = await getJ("home:v1:" + id, null); if (h && h.kh !== sha(b.key)) return send(403, { error: "not your home" });
          const rec = { kh: sha(b.key), name: homeOwnerName(b.name), layout, updatedAt: new Date(now()).toISOString() };
          await store.set("home:v1:" + id, JSON.stringify(rec), TTL_S); return send(200, { ok: true, id, name: rec.name, items: layout.items.length, updatedAt: rec.updatedAt }); }); }
      if (b.op === "sign") { const e = cleanEntry(b.name, b.text); if (!e.ok) return send(400, { error: e.reason });
        if (!(await getJ("home:v1:" + id, null))) return send(404, { error: "home not found" });
        const ip = sha(salt + "|" + ipOf(req)).slice(0, 24);
        if (!(await store.setNX("home:rl:s:" + ip + ":" + id, "1", SIGN_HOME_GAP_S))) return send(429, { error: "You just signed this guestbook. Try again in a minute.", retryAfter: SIGN_HOME_GAP_S });
        if (!(await store.setNX("home:rl:s:" + ip, "1", SIGN_GAP_S))) { try { await store.del("home:rl:s:" + ip + ":" + id); } catch {} return send(429, { error: "Slow down: one guestbook entry every 15 seconds.", retryAfter: SIGN_GAP_S }); }
        const entry = { i: randomBytes(6).toString("hex"), name: e.name, text: e.text, at: new Date(now()).toISOString() };
        return await locked(id, async () => { const book = [entry, ...(await getJ("book:v1:" + id, []))].slice(0, GB.MAX); await store.set("book:v1:" + id, JSON.stringify(book), TTL_S);
          return send(200, { ok: true, entry, count: book.length }); }); }
      if (b.op === "del" || b.op === "book") { if (!(await owner(id, b.key))) return send(403, { error: "not your home" });
        if (b.op === "book") { const book = await getJ("book:v1:" + id, []); return send(200, { book, count: book.length }); }
        return await locked(id, async () => { const book = await getJ("book:v1:" + id, []), left = book.filter((x) => x.i !== b.entry);
          if (left.length === book.length) return send(404, { error: "entry not found" }); await store.set("book:v1:" + id, JSON.stringify(left), TTL_S); return send(200, { ok: true, count: left.length }); }); }
      return send(400, { error: "unknown op" });
    } catch (e) { return send(e.status || 500, { error: e.status ? e.message : "home store unavailable" }); }
  };
}
export default makeHandler();

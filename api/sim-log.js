// /api/sim-log: Paw Audit Bureau chain-head anchor for Pawmarks wallets (sim data only, Upstash keys under 'sim:').
//   GET  ?pid=p<16 hex>             -> { anchor } (the player's last checkpoint, or null)
//   POST { pid, token, entries[] }  -> verifies hashes + rules (src/sim/anchor.js), moves the checkpoint forward
// Never touches Bones, $KIBBLE, scores, prizes, wallets or the main save. Without Upstash it answers 503 and the wallet stays local.
import { upstashKv } from "./_lib/kv.js";
import { anchorGet, anchorPost, LIMITS } from "../src/sim/anchor.js";
import { sha256 } from "../src/sim/sha256.js";
const send = (res, status, json) => { res.statusCode = status; res.setHeader("content-type", "application/json; charset=utf-8"); res.setHeader("cache-control", "no-store"); res.end(JSON.stringify(json)); };
export default async function handler(req, res, kvOverride = null) {
  const kv = kvOverride || upstashKv(); if (!kv) return send(res, 503, { error: "anchor offline (no store configured)" });
  try {
    if (req.method === "GET") { const pid = new URL(req.url || "/", "http://x").searchParams.get("pid"); const r = await anchorGet(kv, pid); return send(res, r.status, r.json); }
    if (req.method !== "POST") { res.setHeader("allow", "GET, POST"); return send(res, 405, { error: "GET or POST" }); }
    let body = req.body; if (typeof body === "string") { if (body.length > LIMITS.maxBody) return send(res, 413, { error: "body too big" }); try { body = JSON.parse(body); } catch { return send(res, 400, { error: "bad json" }); } }
    const size = JSON.stringify(body ?? null).length, ip = String(req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim();
    const r = await anchorPost(kv, body, { now: Date.now(), size, ipHash: sha256("pab-ip|" + ip).slice(0, 16) }); return send(res, r.status, r.json);
  } catch { return send(res, 500, { error: "anchor error" }); }
}

// Inu Verse Launch Hall coin registry (Vercel serverless function).
// The game never creates, holds or signs tokens. Players launch on pump.fun themselves, then register the mint here.
//
//   GET  /api/coins                         -> { coins: [visible coins], reportsToHide }
//   GET  /api/coins?all=1   (admin)         -> every coin incl. hidden
//   POST /api/coins {action:"register", mint}  Bearer <kibble-pay SIWS session>
//   POST /api/coins {action:"report", mint, reason}          anonymous, one report per IP per coin
//   POST /api/coins {action:"moderate", mint, op:"hide"|"show"|"delete"}  admin only
//
// Creator verification (documented): the coin must be a pump.fun coin, and the `creator` pubkey stored in its pump.fun
// bonding-curve account (PDA ["bonding-curve", mint] of program 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P, bytes 49..81)
// must equal the signed-in wallet. That account is written by pump.fun's create instruction from the signer, so it is the
// on-chain proof of who launched it. Pairing with $KIBBLE is checked (informational) from DexScreener's quoteToken.
// Session: the player's existing kibble-pay Phantom/SIWS session token is checked by kibble-pay itself (read-only GET).
// Admin: ADMIN_TOKEN header, or a kibble-pay session for the owner wallet.
// Storage: Upstash Redis REST (UPSTASH_REDIS_REST_URL/TOKEN or KV_REST_API_URL/TOKEN). Without it the API answers 503.
import crypto from "node:crypto";

export const KIBBLE_MINT = "4VE9sy4fEMJdZ6i7MkYPbnqDJd2oqzJQmg44WJ3opump";
export const OWNER_WALLET = "BzLYTFAfUsjzQ5x8bx5BbPK4DFtaHrLCuferkvkxTNGJ";
export const PUMP_PROGRAM = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
export const REPORTS_TO_HIDE = 3;
const KP = "https://kibble-pay.vercel.app";
const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function memoryStore() { const m = new Map(); return {
  async get(k) { return m.has(k) ? m.get(k) : null; }, async set(k, v) { m.set(k, String(v)); },
  async del(k) { m.delete(k); }, async setNX(k, v) { if (m.has(k)) return false; m.set(k, String(v)); return true; },
  async sadd(k, v) { const s = new Set(JSON.parse(m.get(k) || "[]")); s.add(v); m.set(k, JSON.stringify([...s])); },
  async srem(k, v) { const s = new Set(JSON.parse(m.get(k) || "[]")); s.delete(v); m.set(k, JSON.stringify([...s])); },
  async smembers(k) { return JSON.parse(m.get(k) || "[]"); }, async incr(k) { const n = Number(m.get(k) || 0) + 1; m.set(k, String(n)); return n; } }; }
export function upstashStore(env = process.env, f = fetch) {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL, tok = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  if (!url || !tok) return null;
  const cmd = async (...a) => { const r = await f(url, { method: "POST", headers: { authorization: "Bearer " + tok, "content-type": "application/json" }, body: JSON.stringify(a) }); const j = await r.json(); if (j.error) throw new Error(j.error); return j.result; };
  const P = "inuverse:";
  return { get: (k) => cmd("GET", P + k), set: (k, v) => cmd("SET", P + k, String(v)), del: (k) => cmd("DEL", P + k),
    setNX: async (k, v) => (await cmd("SET", P + k, String(v), "NX")) === "OK", sadd: (k, v) => cmd("SADD", P + k, v), srem: (k, v) => cmd("SREM", P + k, v),
    smembers: (k) => cmd("SMEMBERS", P + k), incr: (k) => cmd("INCR", P + k) }; }

// ---- base58 + PDA (no deps) ----
const ALPH = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export function b58decode(s) { let n = 0n; for (const c of s) { const i = ALPH.indexOf(c); if (i < 0) throw new Error("bad base58"); n = n * 58n + BigInt(i); }
  const out = []; while (n > 0n) { out.unshift(Number(n & 255n)); n >>= 8n; } for (const c of s) { if (c !== "1") break; out.unshift(0); } return Uint8Array.from(out); }
export function b58encode(b) { let n = 0n; for (const x of b) n = (n << 8n) + BigInt(x); let s = ""; while (n > 0n) { s = ALPH[Number(n % 58n)] + s; n /= 58n; } for (const x of b) { if (x) break; s = "1" + s; } return s; }
// ed25519 on-curve test (decompression), for findProgramAddress
const Pf = 2n ** 255n - 19n, Df = (-121665n * inv(121666n)) % Pf;
function mod(a) { const r = a % Pf; return r < 0n ? r + Pf : r; }
function pw(b, e) { let r = 1n; b = mod(b); while (e > 0n) { if (e & 1n) r = r * b % Pf; b = b * b % Pf; e >>= 1n; } return r; }
function inv(a) { return pw(a, Pf - 2n); }
export function onCurve(bytes) { const b = Uint8Array.from(bytes); b[31] &= 0x7f; let y = 0n; for (let i = 31; i >= 0; i--) y = (y << 8n) + BigInt(b[i]);
  if (y >= Pf) return false; const y2 = y * y % Pf, u = mod(y2 - 1n), v = mod(Df * y2 + 1n); const x2 = u * inv(v) % Pf; if (x2 === 0n) return true; return pw(x2, (Pf - 1n) / 2n) === 1n; }
export function findPda(seeds, programId) { const prog = b58decode(programId);
  for (let bump = 255; bump >= 0; bump--) { const h = crypto.createHash("sha256"); for (const s of seeds) h.update(s); h.update(Buffer.from([bump])); h.update(prog); h.update(Buffer.from("ProgramDerivedAddress"));
    const d = h.digest(); if (!onCurve(d)) return b58encode(d); } throw new Error("no pda"); }
export const bondingCurveOf = (mint) => findPda([Buffer.from("bonding-curve"), b58decode(mint)], PUMP_PROGRAM);

// ---- verification ----
export async function sessionWallet(token, f = fetch) { if (!token) return null;
  const r = await f(`${KP}/api/save?game=inu-verse`, { headers: { authorization: "Bearer " + token } }); if (!r.ok) return null; const j = await r.json(); return B58.test(j.wallet || "") ? j.wallet : null; }
export async function pumpCreator(mint, { rpc, f = fetch } = {}) {
  const r = await f(rpc, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getAccountInfo", params: [bondingCurveOf(mint), { encoding: "base64" }] }) });
  const j = await r.json(); const v = j.result?.value; if (!v) return { ok: false, reason: "not a pump.fun coin (no bonding curve account found)" };
  if (v.owner !== PUMP_PROGRAM) return { ok: false, reason: "bonding curve not owned by pump.fun" };
  const d = Buffer.from(v.data[0], "base64"); if (d.length < 81) return { ok: false, reason: "old pump.fun curve without a creator field" };
  return { ok: true, creator: b58encode(d.subarray(49, 81)), complete: d[48] === 1 }; }
export async function dexInfo(mint, f = fetch) { try { const r = await f(`https://api.dexscreener.com/tokens/v1/solana/${mint}`); if (!r.ok) return null; const a = await r.json(); if (!Array.isArray(a) || !a.length) return null;
  const p = a.find((x) => x.baseToken?.address === mint) || a[0]; return { name: p.baseToken?.name || "", symbol: p.baseToken?.symbol || "", pairedWithKibble: a.some((x) => x.quoteToken?.address === KIBBLE_MINT || (x.baseToken?.address === KIBBLE_MINT && x.quoteToken?.address === mint)), quote: p.quoteToken?.symbol || "" }; } catch { return null; } }

const json = (res, code, o) => { res.statusCode = code; res.setHeader("content-type", "application/json"); res.setHeader("cache-control", code === 200 ? "public, max-age=15" : "no-store"); res.end(JSON.stringify(o)); };
const clean = (s, n) => String(s || "").replace(/[<>\u0000-\u001f]/g, "").slice(0, n);
async function listCoins(store, all) { const ids = await store.smembers("coins"); const out = [];
  for (const id of ids || []) { const raw = await store.get("coin:" + id); if (!raw) continue; const c = JSON.parse(raw); if (all || !c.hidden) out.push(c); }
  return out.sort((a, b) => b.registeredAt - a.registeredAt); }
async function isAdmin(req, env, deps) { const t = req.headers["x-admin-token"]; if (env.ADMIN_TOKEN && t && t.length === env.ADMIN_TOKEN.length && crypto.timingSafeEqual(Buffer.from(t), Buffer.from(env.ADMIN_TOKEN))) return true;
  const w = await deps.sessionWallet(bearer(req)); return w === OWNER_WALLET; }
const bearer = (req) => (req.headers.authorization || "").replace(/^Bearer /, "");

export function makeHandler({ env = process.env, store = upstashStore(env), deps = {} } = {}) {
  const D = { sessionWallet: (t) => sessionWallet(t), pumpCreator: (m) => pumpCreator(m, { rpc: env.SOLANA_RPC || "https://api.mainnet-beta.solana.com" }), dexInfo: (m) => dexInfo(m), ...deps };
  return async function handler(req, res) {
    if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
    if (!store) return json(res, 503, { error: "coin registry storage is not configured yet", storage: false });
    try {
      const q = req.query || Object.fromEntries(new URL(req.url, "http://x").searchParams);
      if (req.method === "GET") { const all = q.all === "1"; if (all && !(await isAdmin(req, env, D))) return json(res, 403, { error: "admin only" });
        return json(res, 200, { coins: await listCoins(store, all), reportsToHide: REPORTS_TO_HIDE, kibble: KIBBLE_MINT, verification: "pump.fun bonding-curve creator == signed-in wallet" }); }
      if (req.method !== "POST") return json(res, 405, { error: "GET or POST" });
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const mint = String(body.mint || "").trim(); if (!B58.test(mint)) return json(res, 400, { error: "that is not a Solana mint address" });
      const key = "coin:" + mint;
      if (body.action === "register") {
        const wallet = await D.sessionWallet(bearer(req)); if (!wallet) return json(res, 401, { error: "sign in with Phantom first" });
        if (mint === KIBBLE_MINT) return json(res, 400, { error: "$KIBBLE is already featured" });
        const prev = await store.get(key); if (prev) { const p = JSON.parse(prev); if (p.removed) return json(res, 403, { error: "this coin was removed by moderation" }); return json(res, 200, { ok: true, coin: p, already: true }); }
        const pc = await D.pumpCreator(mint); if (!pc.ok) return json(res, 400, { error: pc.reason });
        if (pc.creator !== wallet) return json(res, 403, { error: `pump.fun lists ${pc.creator.slice(0, 4)}…${pc.creator.slice(-4)} as the creator, not your wallet` });
        const dx = await D.dexInfo(mint);
        const coin = { mint, creator: wallet, name: clean(dx?.name, 32), symbol: clean(dx?.symbol, 12).replace(/^\$/, ""), pairedWithKibble: !!dx?.pairedWithKibble, quote: clean(dx?.quote, 12),
          verifiedBy: "pump.fun bonding-curve creator", registeredAt: Date.now(), reports: 0, hidden: false };
        await store.set(key, JSON.stringify(coin)); await store.sadd("coins", mint); return json(res, 200, { ok: true, coin }); }
      const raw = await store.get(key); if (!raw) return json(res, 404, { error: "coin not registered" }); const coin = JSON.parse(raw);
      if (body.action === "report") {
        const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "?").split(",")[0].trim();
        const who = crypto.createHash("sha256").update(ip + "|" + mint).digest("hex").slice(0, 24);
        if (!(await store.setNX(`report:${mint}:${who}`, 1))) return json(res, 200, { ok: true, duplicate: true, hidden: coin.hidden });
        coin.reports = (coin.reports || 0) + 1; (coin.reasons ||= []).push(clean(body.reason, 80)); coin.reasons = coin.reasons.slice(-10);
        if (coin.reports >= REPORTS_TO_HIDE && !coin.hidden) { coin.hidden = true; coin.hiddenBy = "auto: reports pending review"; }
        await store.set(key, JSON.stringify(coin)); return json(res, 200, { ok: true, hidden: coin.hidden }); }
      if (body.action === "moderate") {
        if (!(await isAdmin(req, env, D))) return json(res, 403, { error: "admin only" });
        if (body.op === "hide") { coin.hidden = true; coin.hiddenBy = "owner"; }
        else if (body.op === "show") { coin.hidden = false; coin.hiddenBy = null; coin.reports = 0; coin.reviewedAt = Date.now(); }
        else if (body.op === "delete") { coin.hidden = true; coin.removed = true; coin.hiddenBy = "owner removed"; await store.srem("coins", mint); }
        else return json(res, 400, { error: "op must be hide, show or delete" });
        await store.set(key, JSON.stringify(coin)); return json(res, 200, { ok: true, coin }); }
      return json(res, 400, { error: "unknown action" });
    } catch (e) { return json(res, 500, { error: "registry error: " + e.message }); }
  };
}
export default makeHandler();

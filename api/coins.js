// Inu Verse Launch Hall coin registry (Vercel serverless function).
// The game never creates, holds or signs tokens. Players launch on pump.fun themselves, then register the mint here.
//
//   GET  /api/coins                         -> { coins: [visible coins], reportsToHide }
//   GET  /api/coins?all=1   (admin)         -> every coin incl. hidden
//   POST /api/coins {action:"register", mint}  Bearer <kibble-pay SIWS session>
//   POST /api/coins {action:"register", mint, signature}  no session: proof = the confirmed Launch Hall create tx (see launchTx)
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
import { evaluatePairs, PAIR_CANDIDATES } from "./_lib/pairs.js";
import { rpcUrl, redact } from "./_lib/rpc.js";
import { cleanChecks, makeRpc } from "./_lib/clean.js";

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
  async smembers(k) { return JSON.parse(m.get(k) || "[]"); }, async incr(k) { const n = Number(m.get(k) || 0) + 1; m.set(k, String(n)); return n; }, async expire() {} }; }
export function upstashStore(env = process.env, f = fetch) {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL, tok = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  if (!url || !tok) return null;
  const cmd = async (...a) => { const r = await f(url, { method: "POST", headers: { authorization: "Bearer " + tok, "content-type": "application/json" }, body: JSON.stringify(a) }); const j = await r.json(); if (j.error) throw new Error(j.error); return j.result; };
  const P = env.REGISTRY_PREFIX || "launchhall:"; // distinct namespace: this Upstash DB is shared with Kibble Pay
  return { get: (k) => cmd("GET", P + k), set: (k, v) => cmd("SET", P + k, String(v)), del: (k) => cmd("DEL", P + k),
    setNX: async (k, v) => (await cmd("SET", P + k, String(v), "NX")) === "OK", sadd: (k, v) => cmd("SADD", P + k, v), srem: (k, v) => cmd("SREM", P + k, v),
    smembers: (k) => cmd("SMEMBERS", P + k), incr: (k) => cmd("INCR", P + k), expire: (k, sec) => cmd("EXPIRE", P + k, sec) }; }

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
// Launch-tx proof (no-extension launches): the confirmed transaction that created the coin. Its fee payer signed it, so
// "fee payer == pump.fun bonding-curve creator" is the same creator-vs-wallet check as a signed-in session.
export const LAUNCH_PROOF_MAX_AGE_S = 24 * 3600;
export async function launchTx(sig, { rpc, f = fetch } = {}) {
  const r = await f(rpc, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTransaction", params: [sig, { encoding: "json", commitment: "confirmed", maxSupportedTransactionVersion: 1 }] }) });
  const t = (await r.json()).result; if (!t) return { ok: false, reason: "launch transaction not found yet, try again in a few seconds" };
  if (t.meta?.err) return { ok: false, reason: "that launch transaction failed on-chain" };
  const keys = t.transaction?.message?.accountKeys || []; return { ok: true, feePayer: keys[0], keys, blockTime: t.blockTime || 0 }; }
export async function dexInfo(mint, f = fetch) { try { const r = await f(`https://api.dexscreener.com/tokens/v1/solana/${mint}`); if (!r.ok) return null; const a = await r.json(); if (!Array.isArray(a) || !a.length) return null;
  const p = a.find((x) => x.baseToken?.address === mint) || a[0]; const allow = [KIBBLE_MINT, ...PAIR_CANDIDATES.map((c) => c.mint)], qp = a.find((x) => x.baseToken?.address === mint && allow.includes(x.quoteToken?.address));
  return { quoteMint: qp?.quoteToken?.address || p.quoteToken?.address || "", name: p.baseToken?.name || "", symbol: p.baseToken?.symbol || "", pairedWithKibble: a.some((x) => x.quoteToken?.address === KIBBLE_MINT || (x.baseToken?.address === KIBBLE_MINT && x.quoteToken?.address === mint)), quote: p.quoteToken?.symbol || "" }; } catch { return null; } }

// ---- Clean Launch proof (GET /api/coins?clean=<mint>[,<mint>...]) ----
// Real on-chain checks through the server RPC (api/_lib/clean.js), cached per coin in Upstash (launchhall:clean:<mint>) for
// CLEAN_TTL so the Helius free tier is only hit about twice an hour per coin; stale results are served while one request
// recomputes (lock launchhall:cleanlock:<mint>). At most CLEAN_PER_REQ coins are computed per request; the rest say pending.
export const CLEAN_KEY = "clean:v2:"; // bump when the checks change so old results are not served
export const CLEAN_TTL_MS = 30 * 60_000, CLEAN_MAX_AGE_MS = 24 * 3600_000, CLEAN_PER_REQ = 2, CLEAN_MAX = 12;
export async function dexLiquidity(mint, f = fetch) { try { const r = await f(`https://api.dexscreener.com/tokens/v1/solana/${mint}`); if (!r.ok) return null; const a = (await r.json() || []).filter((p) => p.baseToken?.address === mint);
  return a.length ? a.reduce((s, p) => s + Number(p.liquidity?.usd || 0), 0) : null; } catch { return null; } }
export async function solUsd(f = fetch) { try { const r = await f("https://api.coinbase.com/v2/prices/SOL-USD/spot"); if (!r.ok) return null; const v = Number((await r.json())?.data?.amount); return v > 0 ? v : null; } catch { return null; } }
async function cleanFor(store, mints, D) { const out = {}; let budget = CLEAN_PER_REQ;
  for (const m of mints) { let hit = null; try { hit = JSON.parse((await store.get(CLEAN_KEY + m)) || "null"); } catch {}
    const age = hit ? D.now() - hit.checkedAt : Infinity;
    if (hit && age < CLEAN_TTL_MS) { out[m] = { ...hit, cached: true }; continue; }
    if (m !== KIBBLE_MINT) { const c = await store.get("coin:" + m); if (!c || JSON.parse(c).removed) { out[m] = { mint: m, overall: "unknown", error: "not on the Launch Hall board" }; continue; } }
    let mine = budget > 0; if (mine) mine = await store.setNX("cleanlock:" + m, String(D.now())).catch(() => false); if (mine) { try { await store.expire("cleanlock:" + m, 120); } catch {} }
    if (!mine) { out[m] = hit && age < CLEAN_MAX_AGE_MS ? { ...hit, cached: true, stale: true } : { mint: m, overall: "unknown", pending: true }; continue; }
    budget--; let creatorHint = null; try { creatorHint = m === KIBBLE_MINT ? null : JSON.parse((await store.get("coin:" + m)) || "{}").creator || null; } catch {}
    try { const r = await D.clean(m, creatorHint); await store.set(CLEAN_KEY + m, JSON.stringify(r)); out[m] = r; }
    catch (e) { out[m] = hit ? { ...hit, cached: true, stale: true } : { mint: m, overall: "unknown", error: "checks unavailable right now" }; }
    try { await store.del("cleanlock:" + m); } catch {} }
  return out; }

const json = (res, code, o) => { res.statusCode = code; res.setHeader("content-type", "application/json"); res.setHeader("cache-control", code === 200 ? "public, max-age=15" : "no-store"); res.end(redact(JSON.stringify(o), json.env || process.env)); }; // never leak the RPC URL/key
const clean = (s, n) => String(s || "").replace(/[<>\u0000-\u001f]/g, "").slice(0, n);
async function listCoins(store, all) { const ids = await store.smembers("coins"); const out = [];
  for (const id of ids || []) { const raw = await store.get("coin:" + id); if (!raw) continue; const c = JSON.parse(raw); if (all || !c.hidden) out.push(c); }
  return out.sort((a, b) => b.registeredAt - a.registeredAt); }
async function isAdmin(req, env, deps) { const t = req.headers["x-admin-token"]; if (env.ADMIN_TOKEN && t && t.length === env.ADMIN_TOKEN.length && crypto.timingSafeEqual(Buffer.from(t), Buffer.from(env.ADMIN_TOKEN))) return true;
  const w = await deps.sessionWallet(bearer(req)); return w === OWNER_WALLET; }
const bearer = (req) => (req.headers.authorization || "").replace(/^Bearer /, "");

export function makeHandler({ env = process.env, store = upstashStore(env), deps = {} } = {}) {
  json.env = env;
  const RPC = rpcUrl(env);
  const D = { sessionWallet: (t) => sessionWallet(t), pumpCreator: (m) => pumpCreator(m, { rpc: RPC }), launchTx: (s) => launchTx(s, { rpc: RPC }), now: () => Date.now(), dexInfo: (m) => dexInfo(m), pairs: () => evaluatePairs(), clean: (m, creatorHint) => cleanChecks(m, { rpc: makeRpc(RPC, fetch, env), creatorHint, dexLiquidityUsd: (x) => dexLiquidity(x), solUsd: () => solUsd() }), ...deps };
  return async function handler(req, res) {
    if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
    if (req.method === "GET" && /[?&]pairs=1/.test(req.url || "")) return json(res, 200, await D.pairs());
    if (!store) return json(res, 503, { error: "coin registry storage is not configured yet", storage: false });
    try {
      const q = req.query || Object.fromEntries(new URL(req.url, "http://x").searchParams);
      if (req.method === "GET" && q.pairs === "1") return json(res, 200, await D.pairs());
      if (req.method === "GET" && q.clean) { const mints = [...new Set(String(q.clean).split(",").map((x) => x.trim()).filter((x) => B58.test(x)))].slice(0, CLEAN_MAX);
        if (!mints.length) return json(res, 400, { error: "clean=<mint>[,<mint>...]" }); return json(res, 200, { clean: await cleanFor(store, mints, D), ttlMs: CLEAN_TTL_MS }); }
      if (req.method === "GET") { const all = q.all === "1"; if (all && !(await isAdmin(req, env, D))) return json(res, 403, { error: "admin only" });
        return json(res, 200, { coins: await listCoins(store, all), reportsToHide: REPORTS_TO_HIDE, kibble: KIBBLE_MINT, verification: "pump.fun bonding-curve creator == signed-in wallet" }); }
      if (req.method !== "POST") return json(res, 405, { error: "GET or POST" });
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const mint = String(body.mint || "").trim(); if (!B58.test(mint)) return json(res, 400, { error: "that is not a Solana mint address" });
      const key = "coin:" + mint;
      if (body.action === "register") {
        let wallet = await D.sessionWallet(bearer(req)), via = "session", lt0 = null;
        if (!wallet && body.signature) { // no-extension launch: prove it with the create transaction itself
          if (!/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(String(body.signature))) return json(res, 400, { error: "bad transaction signature" });
          const lt = lt0 = await D.launchTx(String(body.signature)); if (!lt.ok) return json(res, 400, { error: lt.reason });
          if (!lt.keys.includes(mint) || !lt.keys.includes(PUMP_PROGRAM)) return json(res, 400, { error: "that transaction did not create this pump.fun coin" });
          if (lt.blockTime && D.now() / 1000 - lt.blockTime > LAUNCH_PROOF_MAX_AGE_S) return json(res, 400, { error: "launch proof too old: sign in with Phantom to register" });
          wallet = B58.test(lt.feePayer || "") ? lt.feePayer : null; via = "launch transaction"; }
        if (!wallet) return json(res, 401, { error: "sign in with Phantom first" });
        if (mint === KIBBLE_MINT) return json(res, 400, { error: "$KIBBLE is already featured" });
        const prev = await store.get(key); if (prev) { const p = JSON.parse(prev); if (p.removed) return json(res, 403, { error: "this coin was removed by moderation" }); return json(res, 200, { ok: true, coin: p, already: true }); }
        const pc = await D.pumpCreator(mint); if (!pc.ok) return json(res, 400, { error: pc.reason });
        if (pc.creator !== wallet) return json(res, 403, { error: `pump.fun lists ${pc.creator.slice(0, 4)}…${pc.creator.slice(-4)} as the creator, not your wallet` });
        const dx = await D.dexInfo(mint);
        const lk = via === "launch transaction" && lt0?.keys?.includes(KIBBLE_MINT); // brand-new coins are not on DexScreener yet
        const coin = { mint, creator: wallet, name: clean(dx?.name || (via !== "session" ? body.name : ""), 32), symbol: clean(dx?.symbol || (via !== "session" ? body.symbol : ""), 12).replace(/^\$/, ""), pairedWithKibble: !!dx?.pairedWithKibble || !!lk, quote: clean(dx?.quote || (lk ? "KIBBLE" : ""), 12), quoteMint: clean(dx?.quoteMint || (lk ? KIBBLE_MINT : ""), 44),
          verifiedBy: "pump.fun bonding-curve creator", proof: via, launchedInHall: via === "launch transaction", registeredAt: Date.now(), reports: 0, hidden: false };
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

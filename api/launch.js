// Inu Verse Launch Hall: no-extension coin launch helper (Vercel serverless function).
// The server BUILDS unsigned pump.fun transactions and hosts/uploads public coin metadata. It never holds SOL, tokens or
// keys and never signs: the player's wallet (Phantom embedded via Google/Apple, or the Phantom extension) signs as fee payer
// and creator, and the new mint's keypair is generated and used only in the player's browser.
//
//   POST /api/launch {action:"metadata", name, symbol, description, twitter, telegram, website, image:dataURL} -> {uri, image, storage}
//   POST /api/launch {action:"build", player, mint(PUBLIC key), name, symbol, uri, pair:"KIBBLE"(default)|"FLC"|"FOOD"|"AUTISM"|"SOL"|<community main mint>, devBuySol, slippageBps} -> {tx(base64, unsigned), route{steps,fees,notes}, simulation, ...}
//   POST /api/launch {action:"build-buy", player, mint, pair, devBuySol, slippageBps} -> unsigned first-buy after a split create (player is the only signer)
//   POST /api/launch {action:"send", tx}   relays an already fully-signed launch tx to Solana (extension path); adds no signature
//   POST /api/launch {action:"rpc", method, params}  allowlisted RPC proxy: getBalance, getLatestBlockhash, getSignatureStatuses, getAccountInfo
//   GET  /api/launch?balance=<address>     live SOL balance      GET /api/launch?sig=<signature>  confirmation status
//   GET  /api/launch?meta=<id> | ?img=<id> hosted metadata (when PINATA_JWT is not configured)
//   GET  /api/launch?pairCheck=<mint>      community-main on-chain check (authorities, metadata, SOL route, liquidity, red flags). Read-only.
// Community mains: pair=<mint> is accepted only when the Kibble Pay registry (KIBBLE_PAY_BASE, op=cm-get) lists it as approved
// and not hidden, AND it passes verifyCommunityMint again right here, for this build. $KIBBLE stays the default pair.
import crypto from "node:crypto";
import { upstashStore } from "./coins.js";
import { validateBuild, buildCreateTx, validateBuy, buildBuyTx, rpcDeps, explainSim, inspectTx, kit, PAIRS } from "./_lib/launchtx.js";
import { verifyCommunityMint, registryRecord, isMintPair } from "./_lib/community.js";
import { validateMeta, pinataUpload, hostedUpload } from "./_lib/launchmeta.js";
import { rpcUrl, redact, proxyRpc, rpcProvider } from "./_lib/rpc.js";
import { applyCors } from "./_lib/cors.js";
const { VersionedTransaction, PublicKey } = kit;
export const PUBLIC_BASE = "https://inu-verse-tawny.vercel.app";
const PUMP = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,90}$/;
const json = (res, code, o, cache = "no-store") => { res.statusCode = code; res.setHeader("content-type", "application/json"); res.setHeader("cache-control", cache); res.end(redact(JSON.stringify(o), json.env || process.env)); }; // never leak the RPC URL/key
const ipOf = (req) => String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "?").split(",")[0].trim();

export function makeLaunchHandler({ env = process.env, store = upstashStore(env), deps = null, f = fetch, limits = { metadata: 12, build: 40, send: 20, rpc: 300, check: 60 }, community: C = {} } = {}) {
  json.env = env; let D = deps; const rpc = () => (D ||= rpcDeps(rpcUrl(env)));
  const base = env.PUBLIC_BASE_URL || PUBLIC_BASE;
  const registryBase = env.KIBBLE_PAY_BASE || "https://kibbleinu.com";
  const verify = C.verify || ((mint, o = {}) => verifyCommunityMint(mint, { rpcUrl: rpcUrl(env), f, routeDeps: rpc(), ...o }));
  const registry = C.registry || ((mint) => registryRecord(mint, { base: registryBase, f }));
  // pair=<mint>: must be in the registry (approved, not hidden) AND pass the on-chain check again now. -> {community} | {error:[code,msg]}
  async function communityFor(pair) {
    if (!isMintPair(pair) || PAIRS[pair]) return { community: null };
    let rec; try { rec = await registry(pair); } catch { return { error: [503, "couldn't reach the community-mains registry right now. Try again, or pick $KIBBLE."] }; }
    if (!rec) return { error: [400, "that coin isn't an approved community main. Add it in the Cabal Meme Maker first, or pick $KIBBLE."] };
    let v; try { v = await verify(pair, { rugcheck: false }); } catch (e) { return { error: [503, "couldn't re-check that community main on-chain right now. Try again."] }; }
    if (!v?.ok) return { error: [409, "this community main failed its on-chain re-check: " + (v?.failures || ["unknown"]).join("; ")] };
    return { community: { mint: pair, symbol: v.symbol || rec.symbol, venue: v.venue } };
  }
  async function limited(req, action) { if (!store?.incr) return false; const hour = Math.floor(Date.now() / 3.6e6);
    const k = `rl:${action}:${crypto.createHash("sha256").update(ipOf(req)).digest("hex").slice(0, 16)}:${hour}`;
    try { const n = await store.incr(k); if (n === 1) await store.expire?.(k, 3700); return n > (limits[action] || 30); } catch { return false; } }
  return async function handler(req, res) {
    res.setHeader("x-rpc-provider", rpcProvider(env)); // "HL" | "custom" | "public": endpoint kind only, never the key
    if (applyCors(req, res)) return; // hub (kibble-pay) Launch Hall: CORS preflight
    try {
      if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
      const q = req.query || Object.fromEntries(new URL(req.url, "http://x").searchParams);
      if (req.method === "GET") {
        if (q.meta || q.img) { const id = String(q.meta || q.img); if (!/^[a-f0-9]{32}$/.test(id) || !store) return json(res, 404, { error: "not found" });
          const raw = await store.get((q.meta ? "launchmeta:" : "launchimg:") + id); if (!raw) return json(res, 404, { error: "not found" });
          if (q.meta) return json(res, 200, JSON.parse(raw), "public, max-age=31536000, immutable");
          const im = JSON.parse(raw); res.statusCode = 200; res.setHeader("content-type", im.mime); res.setHeader("cache-control", "public, max-age=31536000, immutable"); return res.end(Buffer.from(im.b64, "base64")); }
        if (q.balance) { let p; try { p = new PublicKey(String(q.balance)); } catch { return json(res, 400, { error: "bad address" }); }
          return json(res, 200, { lamports: await rpc().conn.getBalance(p, "confirmed") }); }
        if (q.sig) { if (!B58.test(String(q.sig))) return json(res, 400, { error: "bad signature" });
          const st = (await rpc().conn.getSignatureStatuses([String(q.sig)], { searchTransactionHistory: true })).value[0];
          return json(res, 200, { status: !st ? "pending" : st.err ? "failed" : st.confirmationStatus || "processed", err: st?.err ? JSON.stringify(st.err) : null }); }
        if (q.pairCheck) { if (await limited(req, "check")) return json(res, 429, { error: "too many checks, try again later" });
          const m = String(q.pairCheck).trim(); if (!isMintPair(m)) return json(res, 400, { ok: false, failures: ["that is not a Solana mint address"] });
          return json(res, 200, await verify(m)); }
        return json(res, 200, { ok: true, builds: "unsigned pump.fun create transactions only", serverSigns: false, pairs: ["KIBBLE", "FLC", "FOOD", "AUTISM", "SOL"], community: "pair=<mint> of an approved community main (re-verified on-chain per build)" }, "public, max-age=60");
      }
      if (req.method !== "POST") return json(res, 405, { error: "GET or POST" });
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      if (body.action === "metadata") {
        if (await limited(req, "metadata")) return json(res, 429, { error: "too many uploads, try again later" });
        const m = validateMeta(body); if (!m.ok) return json(res, 400, { error: m.errors.join("; ") });
        if (env.PINATA_JWT) return json(res, 200, await pinataUpload(m.v, { jwt: env.PINATA_JWT, gateway: env.PINATA_GATEWAY, f }));
        if (!store) return json(res, 503, { error: "metadata storage is not configured yet (set PINATA_JWT)" });
        return json(res, 200, await hostedUpload(m.v, { store, base }));
      }
      if (body.action === "build") {
        if (await limited(req, "build")) return json(res, 429, { error: "too many requests, try again later" });
        const cm = await communityFor(body.pair); if (cm.error) return json(res, cm.error[0], { error: cm.error[1] });
        const b = validateBuild(body, { community: cm.community }); if (!b.ok) return json(res, 400, { error: b.errors.join("; ") });
        let out; try { out = await buildCreateTx(b.v, rpc()); }
        catch (e) { const msg = String(e?.message || e); if (e?.status) return json(res, e.status, { error: msg.slice(0, 200) }); return json(res, 502, { error: /quote|6063|6100|eligible/i.test(msg) && b.v.pair === "KIBBLE" ? "pump.fun is not accepting $KIBBLE as a pair right now. Launch with SOL, or use pump.fun's own page." : "could not build the transaction: " + msg.slice(0, 160) }); }
        return json(res, 200, { ...out, hint: explainSim(out.simulation) });
      }
      if (body.action === "build-buy") {
        if (await limited(req, "build")) return json(res, 429, { error: "too many requests, try again later" });
        const cm = await communityFor(body.pair); if (cm.error) return json(res, cm.error[0], { error: cm.error[1] });
        const b = validateBuy(body, { community: cm.community }); if (!b.ok) return json(res, 400, { error: b.errors.join("; ") });
        let out; try { out = await buildBuyTx(b.v, rpc()); }
        catch (e) { const msg = String(e?.message || e); if (e?.status) return json(res, e.status, { error: msg.slice(0, 200) }); return json(res, 502, { error: "could not build the first-buy transaction: " + msg.slice(0, 160) }); }
        return json(res, 200, { ...out, hint: explainSim(out.simulation) });
      }
      if (body.action === "rpc") { // allowlisted read-only RPC proxy for the browser (the key stays server-side)
        if (await limited(req, "rpc")) return json(res, 429, { error: "too many requests, try again later" });
        const r = await proxyRpc(body, { env, f }); return json(res, r.code, r.body); }
      if (body.action === "send") {
        if (await limited(req, "send")) return json(res, 429, { error: "too many requests, try again later" });
        let tx; try { tx = VersionedTransaction.deserialize(Buffer.from(String(body.tx || ""), "base64")); } catch { return json(res, 400, { error: "not a transaction" }); }
        const info = inspectTx(tx);
        if (!info.signed.every(Boolean)) return json(res, 400, { error: "transaction is missing signatures (the server never signs)" });
        if (!tx.message.staticAccountKeys.some((k) => k.toBase58() === PUMP)) return json(res, 400, { error: "only pump.fun launch transactions are relayed" });
        const signature = await rpc().conn.sendRawTransaction(tx.serialize(), { skipPreflight: false, preflightCommitment: "confirmed", maxRetries: 5 });
        return json(res, 200, { signature, feePayer: info.feePayer });
      }
      return json(res, 400, { error: "unknown action" });
    } catch (e) { return json(res, 500, { error: "launch helper error: " + String(e?.message || e).slice(0, 200) }); }
  };
}
export default makeLaunchHandler();

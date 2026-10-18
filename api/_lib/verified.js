// Verified Launch badge (opt-in, server-side). Four on-chain checks for a Launch Hall coin whose creator opted in; the badge
// is awarded only when all four pass. Anything that cannot be read is "unknown" ("couldn't check"), never a pass.
//
//   (a) authorities  mint authority AND freeze authority are both renounced           getAccountInfo(mint, jsonParsed)
//   (b) feeSplit     a creator fee split is published. First the on-chain pump.fun SharingConfig PDA (must match the
//                    expected split: $KIBBLE's official 40/35/25); if that account doesn't exist, a declaration signed by
//                    the coin's on-chain creator, labelled "Published by creator — not enforced on-chain"
//   (c) snipes       NO SNIPES RULE: no wallet other than the creator picked up tokens in the first SNIPE_SLOTS slots of the
//                    coin's life, i.e. slots S .. S+SNIPE_SLOTS-1 where S is the slot of the coin's first bonding-curve
//                    transaction (its creation). SNIPE_SLOTS = 5 (the creation slot + the next 4, about 2 seconds).
//                    getSignaturesForAddress(bonding curve) back to creation + getTransaction for every tx in the window.
//   (d) top10        each of the 10 largest holders has under 1% of supply, excluding the pump.fun bonding curve and AMM /
//                    Raydium pool vaults. getTokenLargestAccounts (20 largest token accounts) + owners.
//
// Re-checks: lazy, with a TTL in Upstash (VERIFIED_TTL_MS). Every board view asks GET /api/coins?verified=<mints>; a record
// older than the TTL is recomputed (at most VERIFY_PER_REQ coins per request, one lock per coin), so no cron is needed on
// the Vercel free plan. A definite fail after a pass revokes the badge with the reason and time. The snipe result is about
// the past, so once it is definite it is stored for good and later re-checks skip it.
import { bondingCurveOf, PUMP_PROGRAM, b58encode } from "../coins.js";
import { holderTable, sharingConfigOf, parseSharing, PUMP_FEES } from "./clean.js";
import { checkDeclaration } from "./declaration.js";
import { sameSplit, splitDiff } from "../../src/declaration.js";
import { nameOf, KIBBLE_MINT, KIBBLE_SPLIT } from "../../src/wallets.js";
export const expectedSplitOf = (mint) => (mint === KIBBLE_MINT ? KIBBLE_SPLIT : null); // published split to compare against

export const SNIPE_SLOTS = 5, TOP_HOLDER_MAX_PCT = 1, TOP_N = 10;
export const VERIFY_HISTORY_PAGES = 5, SNIPE_MAX_TXS = 60, SNIPE_SETTLE_S = 90; // window must be 90 s old before it counts
export const VERIFIED_TTL_MS = 15 * 60_000, VERIFIED_STALE_MS = 24 * 3600_000, VERIFY_PER_REQ = 2;
export const VKEY = "verified:v1:", SNIPE_KEY = "verified:snipe:v1:", VLOCK = "verifiedlock:";
export const ORDER = ["authorities", "feeSplit", "snipes", "top10"];
export const LABELS = { authorities: "Mint + freeze authority renounced", feeSplit: "Creator fee split published", snipes: `No snipes in the first ${SNIPE_SLOTS} slots`, top10: `Top ${TOP_N} holders each under ${TOP_HOLDER_MAX_PCT}% of supply` };
export const SOURCES = {
  authorities: "Solana RPC (via our server): getAccountInfo on the mint account",
  feeSplit: "On-chain pump.fun fee-sharing config (PDA [\"sharing-config\", mint] of pfeeUx…VojVZ), else a creator-signed declaration",
  snipes: `Solana RPC (via our server): bonding-curve signatures back to creation + getTransaction for slots S..S+${SNIPE_SLOTS - 1}`,
  top10: "Solana RPC (via our server): getTokenLargestAccounts (20 largest accounts) + account owners; bonding curve and pool vaults excluded",
};
const short = (a) => (a ? a.slice(0, 4) + "…" + a.slice(-4) : "?");
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 10000) / 100 : null);
const ck = (k, status, note, extra = {}) => ({ status, note, source: SOURCES[k], ...extra });

export async function checkAuthorities(mint, rpc) {
  try { const a = await rpc.one("getAccountInfo", [mint, { encoding: "jsonParsed" }]); const info = a?.value?.data?.parsed?.info;
    if (!info) return { c: ck("authorities", "unknown", "Couldn't check: mint account not found") };
    const ctx = { supply: Number(info.supply), program: a.value.owner }, m = info.mintAuthority, f = info.freezeAuthority;
    if (m || f) return { ctx, c: ck("authorities", "fail", [m && `Mint authority is still set (${short(m)})`, f && `Freeze authority is still set (${short(f)})`].filter(Boolean).join("; "), { mintAuthority: m || null, freezeAuthority: f || null }) };
    return { ctx, c: ck("authorities", "pass", "Mint authority and freeze authority are both renounced") }; }
  catch { return { c: ck("authorities", "unknown", "Couldn't check: mint account unavailable from RPC right now") }; }
}
// Fee split: (1) derive + read the pump.fun SharingConfig PDA ["sharing-config", mint] of the Pump Fees program (strongest proof).
// If it exists, its shares must match the expected split ($KIBBLE: the official 40/35/25 in src/wallets.js; other coins: the
// creator's declaration if any). (2) If it does not exist, fall back to the creator-signed declaration, labelled
// "Published by creator — not enforced on-chain". On-chain vs declaration disagreement fails with the reason.
const withNames = (split) => split.map((h) => ({ address: h.address, bps: h.bps, name: nameOf(h.address) }));
export async function checkFeeSplit(mint, rpc, { creator = null, declaration = null, expected = expectedSplitOf(mint) } = {}) {
  const account = sharingConfigOf(mint), onSrc = `On-chain: pump.fun fee-sharing config ${short(account)} (PDA ["sharing-config", mint] of the Pump Fees program pfeeUx…VojVZ)`;
  let v; try { v = (await rpc.one("getAccountInfo", [account, { encoding: "base64" }]))?.value; } catch { return ck("feeSplit", "unknown", "Couldn't check: fee-sharing config unavailable from RPC right now", { account }); }
  const decl = declaration ? checkDeclaration(declaration, { creator }) : null, want = expected || (decl?.ok ? declaration.split : null);
  if (v) {
    if (v.owner !== PUMP_FEES) return ck("feeSplit", "unknown", "Couldn't check: fee-sharing account has an unexpected owner", { account, source: onSrc });
    const cfg = parseSharing(Buffer.from(v.data[0], "base64")); if (!cfg || cfg.mint !== mint) return ck("feeSplit", "unknown", "Couldn't check: fee-sharing config unreadable", { account, source: onSrc });
    const got = cfg.shareholders.map((h) => ({ address: h.address, bps: h.bps })), extra = { account, source: onSrc, split: withNames(got), splitSource: "onchain", locked: cfg.adminRevoked };
    if (!got.length || cfg.totalBps !== 10000) return ck("feeSplit", "fail", `On-chain fee split shares add up to ${cfg.totalBps / 100}% (need 100%)`, extra);
    if (want && !sameSplit(want, got)) return ck("feeSplit", "fail", `On-chain fee split doesn't match the ${expected ? "published" : "creator's declared"} split: ${splitDiff(want, got)}`, extra);
    if (declaration && decl?.ok && !sameSplit(declaration.split, got)) return ck("feeSplit", "fail", `On-chain fee split and the creator's signed declaration disagree: ${splitDiff(declaration.split, got)}`, extra);
    return ck("feeSplit", "pass", `Fee split enforced on-chain: ${got.map((h) => `${h.bps / 100}% ${nameOf(h.address) || short(h.address)}`).join(", ")}${cfg.adminRevoked ? " (locked)" : " (admin can still edit it)"}${want ? ", matches the published split" : ""}`, extra);
  }
  const declSrc = `Published by creator — not enforced on-chain: declaration signed by the on-chain creator${declaration?.signer ? ` ${nameOf(declaration.signer) ? nameOf(declaration.signer) + " " : ""}${short(declaration.signer)}` : ""} (ed25519 signature checked by our server); on-chain fee-sharing config ${short(account)} not found`;
  if (!declaration) return ck("feeSplit", "fail", "No creator fee split published (no on-chain fee-sharing config and no creator-signed declaration)", { account });
  if (!decl.ok) return ck("feeSplit", decl.unknown ? "unknown" : "fail", `${decl.unknown ? "Couldn't check" : "Creator declaration rejected"}: ${decl.reason}`, { account, source: declSrc });
  if (expected && !sameSplit(expected, declaration.split)) return ck("feeSplit", "fail", `Creator declaration doesn't match the published split: ${splitDiff(expected, declaration.split)}`, { account, source: declSrc });
  return ck("feeSplit", "pass", `Published by creator — not enforced on-chain: ${declaration.split.map((h) => `${h.bps / 100}% ${nameOf(h.address) || short(h.address)}`).join(", ")}`, { account, source: declSrc, split: withNames(declaration.split), splitSource: "declaration", declaredAt: declaration.issuedAt });
}
const tokBal = (list, owner, mint) => (list || []).filter((b) => b.owner === owner && b.mint === mint).reduce((s, b) => s + Number(b.uiTokenAmount?.amount || 0), 0);
// Snipes: the curve's history back to its first transaction (creation slot S), then every successful tx in S..S+SNIPE_SLOTS-1.
export async function checkSnipes(mint, rpc, { creator, nowS = Date.now() / 1000 } = {}) {
  const curve = bondingCurveOf(mint);
  try { let before, all = [], done = false;
    for (let i = 0; i < VERIFY_HISTORY_PAGES; i++) { const page = (await rpc.one("getSignaturesForAddress", [curve, { limit: 1000, ...(before ? { before } : {}) }])) || []; all.push(...page); if (page.length < 1000) { done = true; break; } before = page[page.length - 1].signature; }
    if (!all.length) return ck("snipes", "unknown", "Couldn't check: no pump.fun bonding-curve history found");
    if (!done) return ck("snipes", "unknown", `Couldn't check: more than ${VERIFY_HISTORY_PAGES * 1000} bonding-curve transactions, creation not reached`);
    if (!creator) return ck("snipes", "unknown", "Couldn't check: creator wallet unknown");
    const first = all[all.length - 1], S = first.slot, end = S + SNIPE_SLOTS - 1;
    if (first.blockTime && nowS - first.blockTime < SNIPE_SETTLE_S) return ck("snipes", "unknown", "Couldn't check yet: the coin is under 90 seconds old, re-checking soon", { slot: S });
    const win = all.filter((s) => s.slot >= S && s.slot <= end && !s.err), read = win.slice(-SNIPE_MAX_TXS);
    const txs = await rpc.batch(read.map((s) => ["getTransaction", [s.signature, { encoding: "json", maxSupportedTransactionVersion: 1, commitment: "confirmed" }]]));
    const snipers = new Set(); let missing = 0;
    for (const t of txs) { if (!t) { missing++; continue; }
      for (const b of t.meta?.postTokenBalances || []) { if (b.mint !== mint || !b.owner || b.owner === creator || b.owner === curve) continue;
        if (tokBal(t.meta?.postTokenBalances, b.owner, mint) > tokBal(t.meta?.preTokenBalances, b.owner, mint)) snipers.add(b.owner); } }
    const extra = { slot: S, window: [S, end], txsInWindow: win.length, snipers: [...snipers].slice(0, 5) };
    if (snipers.size) return ck("snipes", "fail", `${snipers.size} wallet${snipers.size === 1 ? "" : "s"} other than the creator picked up tokens in slots ${S}–${end} (e.g. ${short([...snipers][0])})`, extra);
    if (missing || win.length > read.length) return ck("snipes", "unknown", `Couldn't check: ${missing + win.length - read.length} of ${win.length} transactions in slots ${S}–${end} unreadable`, extra);
    return ck("snipes", "pass", `Only the creator picked up tokens in slots ${S}–${end} (${win.length} transaction${win.length === 1 ? "" : "s"} read)`, extra); }
  catch { return ck("snipes", "unknown", "Couldn't check: bonding-curve history unavailable from RPC right now"); }
}
export async function checkTopHolders(mint, rpc, supply) {
  if (!(supply > 0)) return ck("top10", "unknown", "Couldn't check: supply unknown");
  try { const { holders, excluded, accounts } = await holderTable(mint, rpc);
    if (!accounts) return ck("top10", "unknown", "Couldn't check: holder list empty from RPC");
    const top = [...holders.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_N).map(([owner, amt]) => ({ owner, pct: pct(amt, supply) }));
    const over = top.filter((h) => h.pct >= TOP_HOLDER_MAX_PCT), max = top.length ? top[0].pct : 0;
    const extra = { top: top.map((h) => ({ owner: short(h.owner), pct: h.pct })), excludedVaults: excluded.length, maxPct: max };
    if (over.length) return ck("top10", "fail", `${over.length} of the top ${top.length} holders ${over.length === 1 ? "has" : "have"} ${TOP_HOLDER_MAX_PCT}% or more (largest: ${short(over[0].owner)} with ${over[0].pct}%)`, extra);
    return ck("top10", "pass", `Largest holder has ${max}% of supply; all top ${top.length} under ${TOP_HOLDER_MAX_PCT}% (${excluded.length} curve/pool vault account${excluded.length === 1 ? "" : "s"} excluded)`, extra); }
  catch { return ck("top10", "unknown", "Couldn't check: holder list unavailable from RPC right now"); }
}
// All four checks. snipeCache: { get(mint) -> stored check | null, set(mint, check) } so a definite, settled result is reused.
export async function verifiedChecks(mint, { rpc, creatorHint = null, snipeCache = null, declaration = null, now = Date.now() } = {}) {
  const a = await checkAuthorities(mint, rpc);
  let creator = creatorHint; try { const v = (await rpc.one("getAccountInfo", [bondingCurveOf(mint), { encoding: "base64" }]))?.value; if (v?.owner === PUMP_PROGRAM) { const d = Buffer.from(v.data[0], "base64"); if (d.length >= 81) creator = b58encode(d.subarray(49, 81)); } } catch {}
  let snipes = null; try { snipes = await snipeCache?.get(mint); } catch {}
  if (!snipes) { snipes = await checkSnipes(mint, rpc, { creator, nowS: now / 1000 }); if (snipes.status !== "unknown") try { await snipeCache?.set(mint, snipes); } catch {} }
  const checks = { authorities: a.c, feeSplit: await checkFeeSplit(mint, rpc, { creator, declaration }), snipes, top10: await checkTopHolders(mint, rpc, a.ctx?.supply) };
  return { mint, checks, verdict: verdictOf(checks), creator, checkedAt: now };
}
// pass only if all four pass; any fail -> fail; otherwise unknown ("couldn't check").
export function verdictOf(checks) { const v = ORDER.map((k) => checks?.[k]?.status || "unknown"); if (v.includes("fail")) return "fail"; return v.every((s) => s === "pass") ? "pass" : "unknown"; }
export const failReason = (checks) => ORDER.filter((k) => checks?.[k]?.status === "fail").map((k) => `${LABELS[k]}: ${checks[k].note}`).join(" · ");

// State machine for a stored record. Statuses: pending · verified · revoked · not_passed · unknown.
//   pass                          -> verified (passedAt = now; firstVerifiedAt kept; newly = first ever pass)
//   fail after verified/revoked   -> revoked (revokedAt = time of the first failing re-check, revokeReason)
//   fail, never verified          -> not_passed
//   couldn't check, was verified  -> stays verified while the last pass is under VERIFIED_STALE_MS old (recheckNote says so),
//                                    then unknown. Couldn't check otherwise -> unknown (or keeps revoked / not_passed).
export function nextRecord(prev, result, now = result.checkedAt) {
  const p = prev || {}, base = { mint: result.mint, optIn: true, checks: result.checks, checkedAt: now, firstVerifiedAt: p.firstVerifiedAt || null, passedAt: p.passedAt || null };
  if (result.verdict === "pass") return { ...base, status: "verified", passedAt: now, firstVerifiedAt: p.firstVerifiedAt || now, newly: !p.firstVerifiedAt, revokedAt: null, revokeReason: null };
  if (result.verdict === "fail") { const wasV = p.status === "verified" || p.status === "revoked" || !!p.firstVerifiedAt;
    if (wasV) return { ...base, status: "revoked", revokedAt: p.status === "revoked" ? p.revokedAt : now, revokeReason: failReason(result.checks), newly: false };
    return { ...base, status: "not_passed", revokedAt: null, revokeReason: null, newly: false }; }
  if (p.status === "verified" && now - (p.passedAt || 0) < VERIFIED_STALE_MS) return { ...p, lastAttemptAt: now, recheckNote: "Latest re-check couldn't run; showing the last pass", newly: false };
  if (p.status === "revoked" || p.status === "not_passed") return { ...p, lastAttemptAt: now, recheckNote: "Latest re-check couldn't run", newly: false };
  return { ...base, status: "unknown", newly: false };
}
// What the browser gets: no internal flags.
export function publicRecord(r) { if (!r || !r.optIn) return null; const { newly, ...rest } = r; return rest; }

// ---- Town crier announcements: dedupe (Upstash set) + rate limit (one release per ANNOUNCE_GAP_S, queued) ----
export const ANNOUNCED = "crier:announced", QUEUE = "crier:queue", NEWS = "crier:news", GATE = "crier:gate", ANNOUNCE_GAP_S = 600, NEWS_MAX = 10;
export async function queueAnnouncement(store, coin, rec) {
  const added = await store.sadd(ANNOUNCED, coin.mint); if (!Number(added)) return false; // already announced once: never again
  const item = { id: coin.mint + ":" + rec.passedAt, mint: coin.mint, name: String(coin.name || "").slice(0, 32), symbol: String(coin.symbol || "").slice(0, 12), passedAt: rec.passedAt, pump: `https://pump.fun/coin/${coin.mint}` };
  await store.rpush(QUEUE, JSON.stringify(item)); return true; }
// Called on every news read: releases at most one queued item per ANNOUNCE_GAP_S (gate = SET NX EX).
export async function releaseNews(store, now = Date.now()) {
  if (await store.setNXEx(GATE, String(now), ANNOUNCE_GAP_S)) { const raw = await store.lpop(QUEUE);
    if (raw) { const it = { ...JSON.parse(raw), at: now }; await store.lpush(NEWS, JSON.stringify(it)); await store.ltrim(NEWS, 0, NEWS_MAX - 1); }
    else await store.del(GATE); } // nothing waiting: free the gate so the next verified coin is announced promptly
  return ((await store.lrange(NEWS, 0, NEWS_MAX - 1)) || []).map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
}

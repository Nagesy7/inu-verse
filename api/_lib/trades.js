// The deal desk behind /api/home op "trade" (Round 3 player trading). No new Vercel function: api/_lib is not a route.
// ITEMS ONLY: Bureau gate offerItems (src/sim/itembook.js) + the catalog rule (src/trade.js). No Bones, Pawmarks or $KIBBLE,
// no transactions: the server never holds, moves or asks for tokens. Players confirm by signing a plain-text message with
// their wallet (sign-message only), the server checks the ed25519 signature, then swaps both items or neither.
// Identity: the kibble-pay session (Bearer) -> wallet, looked up at kibble-pay and cached by token hash for 5 minutes.
// Every step is written to the Paw Audit Bureau's hash-chained item book (sim:ib:*), with parties as opaque handles.
// Raw keys (Upstash): trade:v1:<id> deal | trade:u:<tid> trader | trade:tid:<tid> wallet | trade:board | trade:sig:<h> replay |
//   trade:sess:<h> session cache | trade:rl:* rate limits | trade:report:<id> reports | trade:lock:* locks.
import { createHash, randomBytes } from "node:crypto";
import { ed25519Verify } from "./declaration.js";
import { offerItems, createItemBook } from "../../src/sim/itembook.js";
import { TRADE, isTradeable, tradeInfo, confirmText } from "../../src/trade.js";
import { homeOwnerName } from "../../src/homeshare.js";

const KP = "https://kibble-pay.vercel.app", B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/, TID = /^[0-9a-f]{16}$/, DID = /^[0-9a-f]{24}$/;
export const TRADE_LIMITS = Object.freeze({ boardMs: 15 * 60e3, boardMax: 60, gap: { list: 1, offer: 5, edit: 1, confirm: 1, cancel: 1, block: 2, report: 30, book: 1 }, ipPerMin: 120,
  offersPerHour: 10, newTraderMs: 60 * 60e3, keepDays: 7, blocksMax: 200, recentMax: 40 });
export const REPORT_REASONS = Object.freeze(["scam", "harassment", "spam", "alt-account", "other"]);
const sha = (s) => createHash("sha256").update(String(s)).digest("hex");
const short = (w) => (w ? w.slice(0, 4) + "…" + w.slice(-4) : "");
const sydneyDay = (t) => new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(t));
const err = (status, error, extra = {}) => Object.assign(new Error(error), { status, extra });
export async function kpSessionWallet(token, f = fetch) { if (!token) return null;
  const r = await f(`${KP}/api/save?game=inu-verse`, { headers: { authorization: "Bearer " + token } }); if (!r.ok) return null; const j = await r.json(); return B58.test(j.wallet || "") ? j.wallet : null; }

export function makeTrades({ store, now = () => Date.now(), env = {}, sessionWallet = kpSessionWallet, verify = ed25519Verify, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const salt = env.TRADE_SALT || env.HOME_IP_SALT || "inu-verse-trade", book = createItemBook(store, { now, sleep });
  const tidOf = (w) => sha(salt + "|tid|" + w).slice(0, 16), party = (tid) => "player:t" + tid;
  const getJ = async (k, d) => { const raw = await store.get(k); try { return JSON.parse(raw || "null") ?? d; } catch { return d; } };
  const putJ = (k, v, days = 180) => store.set(k, JSON.stringify(v), days * 86400);
  async function locked(keys, fn) { const ks = [...new Set(keys)].sort(), got = [];
    try { for (const k of ks) { let ok = false; for (let i = 0; i < 40 && !ok; i++) { ok = await store.setNX("trade:lock:" + k, "1", 10); if (!ok) await sleep(50); } if (!ok) throw err(503, "Trading is busy, try again"); got.push(k); }
      return await fn(); } finally { for (const k of got.reverse()) { try { await store.del("trade:lock:" + k); } catch { /* expires */ } } } }
  const log = async (d, actor, action, data) => { try { const e = await book.append({ actor, action, deal: d?.id || randomBytes(12).toString("hex"), data }); if (d) d.log = [...(d.log || []), e.seq].slice(-40); return e; } catch (e) { if (e?.kind === "economy") throw err(422, e.message); throw e; } };

  async function whoAmI(token) { if (typeof token !== "string" || token.length < 16 || token.length > 4096) throw err(401, "Sign in with Phantom to trade");
    const ck = "trade:sess:" + sha(token).slice(0, 32); let w = await store.get(ck);
    if (!w) { w = await sessionWallet(token); if (!w) throw err(401, "Your sign-in expired. Sign in with Phantom again."); await store.set(ck, w, 300); }
    if (!B58.test(w)) throw err(401, "bad session"); return w; }
  const userKey = (tid) => "trade:u:" + tid;
  const freshUser = (w, t) => ({ tid: tidOf(w), short: short(w), name: "A pup", firstSeen: t, shelf: {}, shelfAt: 0, open: [], recent: [], blocks: [], inv: { claim: {}, in: {}, out: {} }, applied: [], day: { d: "", n: 0 }, offers: [] });
  async function loadUser(w) { const tid = tidOf(w); const u = await getJ(userKey(tid), null); return u || freshUser(w, now()); }
  const avail = (u, id) => (u.inv.claim[id] || 0) + (u.inv.in[id] || 0) - (u.inv.out[id] || 0);
  const blocked = (u, v) => u.blocks.includes(v.tid) || v.blocks.includes(u.tid);
  // the player's published shelf is also their ownership claim: claims only ever grow (capped), the in/out ledger then keeps
  // one copy from being given away twice.
  function setShelf(u, shelf) { const clean = {}; if (shelf && typeof shelf === "object" && !Array.isArray(shelf)) for (const [id, n] of Object.entries(shelf).slice(0, 80)) {
      if (!isTradeable(id) || !Number.isInteger(n) || n < 1) continue; const cap = tradeInfo(id).unique ? 1 : TRADE.furnCap, c = Math.min(n, cap); clean[id] = c;
      const base = c - (u.inv.in[id] || 0) + (u.inv.out[id] || 0); if (base > (u.inv.claim[id] || 0)) u.inv.claim[id] = Math.min(base, cap + (u.inv.out[id] || 0)); }
    u.shelf = clean; u.shelfAt = now(); }
  async function touchBoard(u, show) { await locked(["board"], async () => { const t = now(); let b = (await getJ("trade:board", [])).filter((x) => t - x.at < TRADE_LIMITS.boardMs && x.tid !== u.tid);
      if (show) b = [{ tid: u.tid, short: u.short, name: u.name, at: t }, ...b].slice(0, TRADE_LIMITS.boardMax); await putJ("trade:board", b, 1); }); }
  async function boardFor(u) { const t = now(), b = (await getJ("trade:board", [])).filter((x) => t - x.at < TRADE_LIMITS.boardMs && x.tid !== u.tid), out = [];
    for (const x of b) { const v = await getJ(userKey(x.tid), null); if (!v || blocked(u, v)) continue; out.push({ tid: x.tid, short: x.short, name: v.name, shelf: v.shelf, seen: x.at }); } return out; }

  const sideOf = (d, tid) => (d.at === tid ? "a" : d.bt === tid ? "b" : null);
  function view(d, tid) { const side = sideOf(d, tid), t = now();
    return { id: d.id, side, ver: d.ver, status: d.status, give: d.give, at: d.at, bt: d.bt, aShort: d.aShort, bShort: d.bShort, aName: d.aName, bName: d.bName, nonce: d.nonce, confirmBy: d.confirmBy,
      aw: side === "a" ? d.aw : undefined, bw: side === "b" ? d.bw : undefined, confirmed: { a: d.confirms.a?.ver === d.ver, b: d.confirms.b?.ver === d.ver }, lockedMs: Math.max(0, d.lockUntil - t),
      lastBy: d.lastBy || null, why: d.why || null, createdAt: d.createdAt, updatedAt: d.updatedAt, log: d.log || [] }; }
  async function loadDeal(id) { if (!DID.test(String(id || ""))) throw err(400, "bad trade id"); const d = await getJ("trade:v1:" + id, null); if (!d) throw err(404, "That trade is gone"); return d; }
  const saveDeal = (d) => putJ("trade:v1:" + d.id, d, TRADE_LIMITS.keepDays);
  async function close(d, status, why, actor, action, { users = true } = {}) { d.status = status; d.why = why; d.updatedAt = now(); await log(d, actor, action, { ver: d.ver, why }); await saveDeal(d);
    if (users) for (const t of [d.at, d.bt]) await locked(["u:" + t], async () => { const u = await getJ(userKey(t), null); if (u) { u.open = u.open.filter((x) => x !== d.id); u.recent = [d.id, ...u.recent.filter((x) => x !== d.id)].slice(0, TRADE_LIMITS.recentMax); await putJ(userKey(t), u); } }); }
  async function expireIfDue(d) { if (d.status === "open" && now() > d.confirmBy) await close(d, "expired", "Nobody confirmed in time", "sim:bureau", "item.expire"); return d; }
  // the items each side gives must be in their shelf and not already promised away; wardrobe items can't go to someone who has one
  function checkItems(d, A, B) { for (const [u, give, other] of [[A, d.give.a, B], [B, d.give.b, A]]) {
      for (const id of give) { if (!isTradeable(id)) throw err(422, `${tradeInfo(id)?.name || id} can't be traded`);
        if (!(u.shelf[id] >= 1) || avail(u, id) < 1) throw err(409, `${u.name} no longer has ${tradeInfo(id).name} to trade`);
        if (tradeInfo(id).unique && (other.shelf[id] >= 1 || avail(other, id) > 0)) throw err(409, `${other.name} already owns ${tradeInfo(id).name}`); } } }
  function cleanGive(give) { let g; try { g = offerItems(give); } catch (e) { throw err(e.kind === "economy" ? 422 : 400, e.message.replace(/^\[\w+\]\s*/, ""), { kind: e.kind }); }
    for (const id of [...g.a, ...g.b]) if (!isTradeable(id)) throw err(422, `${tradeInfo(id)?.name || id} can't be traded (${tradeInfo(id)?.why || "unknown item"})`);
    return g; }
  async function rate(tid, act, ipH) { const gap = TRADE_LIMITS.gap[act] || 1; if (!(await store.setNX(`trade:rl:${tid}:${act}`, "1", gap))) throw err(429, "Slow down a little", { retryAfter: gap });
    const k = `trade:rlip:${ipH}:${Math.floor(now() / 60e3)}`, n = Number(await store.get(k) || 0) + 1; await store.set(k, String(n), 70); if (n > TRADE_LIMITS.ipPerMin) throw err(429, "Too many trade requests from this network", { retryAfter: 60 }); }

  async function settle(d) { // both confirmed at this version: swap both items or neither, under both traders' locks
    return locked(["u:" + d.at, "u:" + d.bt], async () => {
      const A = await getJ(userKey(d.at), null), B = await getJ(userKey(d.bt), null), t = now(), day = sydneyDay(t);
      const refuse = async (why) => { await close(d, "refused", why, "sim:bureau", "item.refuse", { users: false });
        for (const u of [A, B]) if (u) { u.open = u.open.filter((x) => x !== d.id); u.recent = [d.id, ...u.recent.filter((x) => x !== d.id)].slice(0, TRADE_LIMITS.recentMax); await putJ(userKey(u.tid), u); } return d; };
      if (!A || !B) return refuse("A trader record is missing");
      for (const u of [A, B]) { if (u.day.d !== day) u.day = { d: day, n: 0 }; if (u.day.n >= TRADE.perDay) return refuse(`${u.name} reached today's ${TRADE.perDay} trades`); }
      const pk = `trade:pair:${day}:${[d.at, d.bt].sort().join(":")}`, pn = Number(await store.get(pk) || 0); if (pn >= TRADE.pairPerDay) return refuse(`These two pups already traded ${TRADE.pairPerDay} times today`);
      try { checkItems(d, A, B); } catch (e) { if (e.status) return refuse(e.message); throw e; }
      d.status = "settling"; d.updatedAt = t; await saveDeal(d);
      const apply = (u, give, get) => { if (u.applied.includes(d.id)) return; for (const id of give) { u.inv.out[id] = (u.inv.out[id] || 0) + 1; if (u.shelf[id] > 1) u.shelf[id]--; else delete u.shelf[id]; }
        for (const id of get) { u.inv.in[id] = (u.inv.in[id] || 0) + 1; u.shelf[id] = Math.min((u.shelf[id] || 0) + 1, tradeInfo(id).unique ? 1 : TRADE.furnCap); }
        u.applied = [...u.applied, d.id].slice(-200); u.day.n++; u.open = u.open.filter((x) => x !== d.id); u.recent = [d.id, ...u.recent.filter((x) => x !== d.id)].slice(0, TRADE_LIMITS.recentMax); };
      apply(A, d.give.a, d.give.b); apply(B, d.give.b, d.give.a); await putJ(userKey(d.at), A); await putJ(userKey(d.bt), B); await store.set(pk, String(pn + 1), 2 * 86400);
      d.status = "done"; d.why = null; d.updatedAt = now(); await log(d, "sim:bureau", "item.done", { ver: d.ver, a: d.give.a, b: d.give.b }); await saveDeal(d); return d; }); }

  return async function trade(b, { token, ipHash }) {
    const act = String(b.act || ""), w = await whoAmI(token), tid = tidOf(w);
    if (!Object.hasOwn(TRADE_LIMITS.gap, act) && act !== "unblock") throw err(400, "unknown trade action");
    await rate(tid, act === "unblock" ? "block" : act, ipHash);
    if (!(await store.get("trade:tid:" + tid))) await store.set("trade:tid:" + tid, w, 180 * 86400);
    if (act === "list") { const u = await locked(["u:" + tid], async () => { const u = await loadUser(w); if (b.name) u.name = homeOwnerName(b.name); if (b.shelf) setShelf(u, b.shelf); await putJ(userKey(tid), u); return u; });
      await touchBoard(u, b.show !== false); const deals = [];
      for (const id of [...u.open, ...u.recent].slice(0, 30)) { const d = await getJ("trade:v1:" + id, null); if (d) { if (d.status === "settling") await locked(["d:" + id], () => settle(d)); deals.push(view(await expireIfDue(d), tid)); } }
      return { me: { tid, short: u.short, wallet: w, name: u.name, shelf: u.shelf, blocks: u.blocks, applied: u.applied.slice(-50), today: u.day.d === sydneyDay(now()) ? u.day.n : 0, newWaitMs: Math.max(0, u.firstSeen + TRADE_LIMITS.newTraderMs - now()) }, board: await boardFor(u), deals, limits: { ...TRADE, newTraderMs: TRADE_LIMITS.newTraderMs } }; }
    if (act === "offer") { const to = String(b.to || ""); if (!TID.test(to)) throw err(400, "Pick a player to trade with");
      if (to === tid) throw err(422, "You can't trade with yourself");
      const toW = await store.get("trade:tid:" + to); if (!toW) throw err(404, "That player hasn't opened trading");
      if (toW === w) throw err(422, "You can't trade with yourself");
      const give = cleanGive(b.give);
      return locked(["u:" + tid, "u:" + to], async () => { const A = await loadUser(w), B = await getJ(userKey(to), null), t = now();
        if (!B) throw err(404, "That player hasn't opened trading");
        if (blocked(A, B)) throw err(403, "You can't trade with this player");
        if (!(await boardFor(A)).some((x) => x.tid === to)) throw err(409, "That player isn't online for trading right now");
        if (t < A.firstSeen + TRADE_LIMITS.newTraderMs || t < B.firstSeen + TRADE_LIMITS.newTraderMs) throw err(425, "New traders wait an hour after opening trading before their first offer (stops alt-account farming)");
        A.offers = (A.offers || []).filter((x) => t - x < 3600e3); if (A.offers.length >= TRADE_LIMITS.offersPerHour) throw err(429, `At most ${TRADE_LIMITS.offersPerHour} offers an hour`);
        for (const u of [A, B]) if (u.open.length >= TRADE.maxOpen) throw err(429, `${u === A ? "You have" : B.name + " has"} ${TRADE.maxOpen} open trades already`);
        const d = { id: randomBytes(12).toString("hex"), at: tid, bt: to, aw: w, bw: toW, aShort: A.short, bShort: B.short, aName: A.name, bName: B.name, give, ver: 1, nonce: randomBytes(9).toString("hex"),
          status: "open", confirms: {}, lockUntil: t + TRADE.lockMs, createdAt: t, updatedAt: t, confirmBy: t + TRADE.ttlMs, lastBy: "a", log: [] };
        checkItems(d, A, B);
        await log(d, party(tid), "item.offer", { ver: 1, a: give.a, b: give.b, to: party(to) }); await saveDeal(d);
        A.offers.push(t); A.open.push(d.id); B.open.push(d.id); await putJ(userKey(tid), A); await putJ(userKey(to), B); return { deal: view(d, tid) }; }); }
    if (act === "block" || act === "unblock") { const v = String(b.tid || ""); if (!TID.test(v) || v === tid) throw err(400, "bad player");
      const u = await locked(["u:" + tid], async () => { const u = await loadUser(w); u.blocks = act === "block" ? [v, ...u.blocks.filter((x) => x !== v)].slice(0, TRADE_LIMITS.blocksMax) : u.blocks.filter((x) => x !== v); await putJ(userKey(tid), u); return u; });
      if (act === "block") { await log(null, party(tid), "item.block", { who: party(v) });
        for (const id of [...u.open]) { const d = await getJ("trade:v1:" + id, null); if (d?.status === "open" && (d.at === v || d.bt === v)) await locked(["d:" + id], () => close(d, "cancelled", "Blocked", party(tid), "item.cancel")); } }
      return { ok: true, blocks: u.blocks }; }
    const id = String(b.id || "");
    if (act === "report") { const reason = REPORT_REASONS.includes(b.reason) ? b.reason : "other"; const d = DID.test(id) ? await getJ("trade:v1:" + id, null) : null;
      const who = d ? (d.at === tid ? d.bt : d.at) : String(b.tid || ""); if (!TID.test(who) || who === tid || (d && !sideOf(d, tid))) throw err(400, "bad report");
      const rid = randomBytes(8).toString("hex"); await putJ("trade:report:" + rid, { rid, by: tid, who, deal: d?.id || null, reason, at: now() }, 90);
      const list = await getJ("trade:reports", []); await putJ("trade:reports", [rid, ...list].slice(0, 500), 90);
      await log(d, party(tid), "item.report", { who: party(who), reason });
      if (d && d.status === "open") await locked(["d:" + d.id], async () => { const cur = await loadDeal(d.id); if (cur.status === "open") await close(cur, "cancelled", "Reported", party(tid), "item.cancel"); });
      await locked(["u:" + tid], async () => { const u = await loadUser(w); u.blocks = [who, ...u.blocks.filter((x) => x !== who)].slice(0, TRADE_LIMITS.blocksMax); await putJ(userKey(tid), u); });
      return { ok: true, report: rid, blocked: who }; }
    return locked(["d:" + id], async () => { const d = await expireIfDue(await loadDeal(id)), side = sideOf(d, tid); if (!side) throw err(403, "Not your trade");
      if (act === "book") { const out = []; for (const s of d.log || []) { const e = (await book.read(s, 1))[0]; if (e) out.push(e); } return { deal: view(d, tid), entries: out, chain: await book.verify(Math.max(0, (await book.head()).seq - 200), 200) }; }
      if (d.status === "settling") { await settle(d); return { deal: view(d, tid) }; }
      if (d.status !== "open") throw err(409, `This trade is ${d.status}`, { deal: view(d, tid) });
      if (act === "cancel") { await close(d, "cancelled", side === "a" ? `${d.aName} cancelled` : `${d.bName} cancelled`, party(tid), "item.cancel"); return { deal: view(d, tid) }; }
      if (act === "edit") { if (Number(b.ver) !== d.ver) throw err(409, "The offer changed. Check it again.", { deal: view(d, tid) });
        const give = cleanGive(b.give); const A = await getJ(userKey(d.at), null), B = await getJ(userKey(d.bt), null); const nd = { ...d, give }; checkItems(nd, A, B);
        const t = now(); Object.assign(d, { give, ver: d.ver + 1, nonce: randomBytes(9).toString("hex"), confirms: {}, lockUntil: t + TRADE.lockMs, updatedAt: t, lastBy: side, confirmBy: t + TRADE.ttlMs });
        await log(d, party(tid), "item.edit", { ver: d.ver, a: give.a, b: give.b }); await saveDeal(d); return { deal: view(d, tid) }; }
      if (act === "confirm") { if (Number(b.ver) !== d.ver) throw err(409, "The offer changed. Check it again and confirm the new version.", { deal: view(d, tid) });
        if (now() < d.lockUntil) throw err(423, "The offer just changed. Look it over, then confirm.", { deal: view(d, tid), retryAfter: Math.ceil((d.lockUntil - now()) / 1000) });
        if (d.confirms[side]?.ver === d.ver) return { deal: view(d, tid) };
        const sig = String(b.sig || ""); if (!/^[1-9A-HJ-NP-Za-km-z]{60,100}$/.test(sig)) throw err(400, "missing signature");
        const sh = sha("sig|" + sig); if (await store.get("trade:sig:" + sh)) throw err(409, "That signature was already used");
        if (!verify(confirmText(d, side), sig, side === "a" ? d.aw : d.bw)) throw err(401, "The signature doesn't match this trade");
        if (!(await store.setNX("trade:sig:" + sh, d.id, 2 * 86400))) throw err(409, "That signature was already used");
        const other = d.confirms[side === "a" ? "b" : "a"];
        if (other?.ver === d.ver && other.ip === ipHash) { await close(d, "refused", "Both sides confirmed from the same network (alt-account check)", "sim:bureau", "item.refuse"); throw err(422, d.why, { deal: view(d, tid) }); }
        d.confirms[side] = { ver: d.ver, sig: sh.slice(0, 24), ip: ipHash, at: now() }; d.updatedAt = now(); await log(d, party(tid), "item.confirm", { ver: d.ver, side }); await saveDeal(d);
        if (d.confirms.a?.ver === d.ver && d.confirms.b?.ver === d.ver) await settle(d);
        return { deal: view(d, tid) }; }
      throw err(400, "unknown trade action"); });
  };
}

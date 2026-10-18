// PAB-001 fix: server-side chain-head anchor for each player's Pawmarks wallet (POST/GET /api/sim-log, Upstash).
// The server keeps a checkpoint per player { seq, head, ts, balance, joined, flows, heads[] } and only moves it forward when the
// posted entries (1) continue exactly from the stored head, (2) re-hash correctly, (3) are allowed player actions, and
// (4) pass the same anti-farm rules as the client (economy.js). Forks, edits, truncation and replays are refused.
// Sim data only: every key is under 'sim:'; nothing here can name Bones, $KIBBLE, scores or prizes (Check 3 + scan).
import { hashOf, GENESIS } from './ledger.js';
import { sha256 } from './sha256.js';
import { applyFlow } from './economy.js';
import { ISSUER, SINK, balances } from './pawmarks.js';
import { FirewallError, guardNoWallet, guardKey, SIM_UNIT } from './firewall.js';
import { CURRENCY } from './currency.js';
import { policeStep, freshPolice } from './police.js';
import { courtStep, COURT } from './court.js';
import { DAY_MS } from './economy.js';
import { medStep, freshMed, MED_ACTIONS } from './medical.js';
import { fireStep, freshFire, FIRE_ACTIONS } from './fire.js';
export const LIMITS = Object.freeze({ maxBody: 24000, maxEntries: 40, keepHeads: 50, maxLength: 50000, pidEverySec: 2, ipEverySec: 1, futureMs: 120000, maxData: 300, altsPerIpDay: 4 });
export const K = Object.freeze({ anchor: (pid) => `sim:anchor:${pid}`, lock: (pid) => `sim:lock:${pid}`, pidRate: (pid) => `sim:rl:${pid}`, ipRate: (h) => `sim:rlip:${h}`, alt: (h, day, n) => `sim:alt:${h}:${day}:${n}`,
  ibHead: () => 'sim:ib:head', ibEntry: (n) => `sim:ib:e:${n}`, ibLock: () => 'sim:ib:lock' }); // ib* = the item book (itembook.js)
export const PLAYER_ACTIONS = Object.freeze(['wallet.join', 'wallet.leave', 'pm.wage', 'pm.fine', 'pm.bail', 'police.cite', 'police.detain', 'police.release', 'court.verdict', 'pm.refund', ...MED_ACTIONS, ...FIRE_ACTIONS]);
const MEDDED = new Set([...MED_ACTIONS, ...FIRE_ACTIONS]); // Phase 5: medStep checks the parties of every medical entry itself
const COURTED = new Set(['court.verdict', 'pm.refund']);
const POLICED = new Set(['police.cite', 'police.detain']);
export const PID = /^p[0-9a-f]{16}$/, TOKEN = /^[0-9a-f]{48}$/;
export const tokenHash = (t) => sha256('pab-anchor|' + t);
export const freshCheckpoint = () => ({ seq: 0, head: GENESIS, ts: 0, balance: 0, joined: false, flows: {}, police: freshPolice(), med: freshMed(), fire: freshFire() });
const pub = (a) => a && { pid: a.pid, seq: a.seq, head: a.head, ts: a.ts, balance: a.balance, joined: a.joined, flows: a.flows, police: a.police || freshPolice(), med: a.med || freshMed(), fire: a.fire || freshFire(), heads: a.heads, updatedAt: a.updatedAt };

// Replays entries on top of a checkpoint with every rule the server enforces. Throws on the first bad entry. Shared with the client.
export function advance(cp, entries, acct, { now = Infinity } = {}) {
  let { seq, head, ts, balance, joined, flows } = cp, police = cp.police || freshPolice(), med = cp.med || freshMed(), fire = cp.fire || freshFire();
  for (const e of entries) {
    if (!e || typeof e !== 'object') throw new FirewallError('chain', 'not an entry');
    if (e.seq !== seq) throw new FirewallError('chain', `expected seq ${seq}, got ${e.seq}`);
    if (e.prev !== head) throw new FirewallError('chain', 'does not continue from the anchored head (fork, edit or replay)');
    if (hashOf(e) !== e.hash) throw new FirewallError('chain', `entry ${e.seq} hash mismatch (edited)`);
    if (!(e.ts >= ts) || e.ts > now) throw new FirewallError('chain', `entry ${e.seq} timestamp out of order or in the future`);
    if (e.group !== 'sim' || e.value?.unit !== SIM_UNIT || !Number.isInteger(e.value?.amount) || e.value.amount < 0) throw new FirewallError('economy', `entry ${e.seq}: ${CURRENCY.one} units only`);
    if (!PLAYER_ACTIONS.includes(e.action)) throw new FirewallError('economy', `entry ${e.seq}: ${e.action} is not a player wallet action`);
    const join = e.action.startsWith('wallet.') || e.action === 'police.release', wage = e.action === 'pm.wage' || e.action === 'pm.refund', policed = POLICED.has(e.action), verdict = e.action === 'court.verdict', medical = MEDDED.has(e.action);
    if (medical ? false : join ? (e.actor !== acct || e.target !== acct || e.value.amount !== 0) : wage ? (e.actor !== ISSUER || e.target !== acct) : policed ? (e.target !== acct || e.actor === acct) : verdict ? (e.actor !== COURT.judge || e.target !== acct) : (e.actor !== acct || e.target !== SINK)) throw new FirewallError('economy', `entry ${e.seq}: wrong parties for ${e.action}`);
    if (e.data != null) { guardNoWallet(e.data, 'data'); if (typeof e.data === 'object') for (const k of Object.keys(e.data)) guardKey(k); if (JSON.stringify(e.data).length > LIMITS.maxData) throw new FirewallError('size', 'data too big'); }
    if (wage && !joined) throw new FirewallError('optin', 'wages only after joining the side economy');
    police = COURTED.has(e.action) ? courtStep(police, e, acct, { joined }) // Phase 4: verdicts (re-decided here) + refunds of exactly what was paid
      : policeStep(police, e, acct, { joined, balance }); // citations, detentions (<= 60 s, opt-in only), fines, bail, releases
    med = medStep(med, e, acct, { joined }); // Phase 5: cartoon bumps (opt-in, <= 60 s), free care, optional co-pay, medic calls + their wages
    fire = fireStep(fire, e, acct, { joined }); // Phase 6: town events opt-in, seeded fire call-outs + their wages (no action starts a fire)
    flows = applyFlow(flows, e);
    balance = balances([e], { [acct]: balance }).get(acct) || 0; if (balance < 0) throw new FirewallError('economy', `entry ${e.seq}: not enough ${CURRENCY.short}`);
    if (e.action === 'wallet.join') joined = true; if (e.action === 'wallet.leave') joined = false;
    seq++; head = e.hash; ts = e.ts;
  }
  return { seq, head, ts, balance, joined, flows, police, med, fire };
}

const getA = async (kv, pid) => { const r = await kv.get(K.anchor(pid)); return r ? JSON.parse(r) : null; };
async function altSlot(kv, ipHash, pid, day) { for (let n = 0; n < LIMITS.altsPerIpDay; n++) { const v = await kv.get(K.alt(ipHash, day, n));
    if (v === pid) return true; if (!v && (await kv.setNX(K.alt(ipHash, day, n), pid, 2 * 86400))) return true; if ((await kv.get(K.alt(ipHash, day, n))) === pid) return true; } return false; }
export async function anchorGet(kv, pid) {
  if (!PID.test(String(pid))) return { status: 400, json: { error: 'bad pid' } };
  const raw = await kv.get(K.anchor(pid)); return { status: 200, json: { anchor: raw ? pub(JSON.parse(raw)) : null } };
}
// body = { pid, token, entries }. ipHash = hashed client IP (never stored raw).
export async function anchorPost(kv, body, { now = Date.now(), ipHash = 'none', size = 0 } = {}) {
  if (size > LIMITS.maxBody) return { status: 413, json: { error: 'body too big' } };
  const { pid, token, entries } = body || {};
  if (!PID.test(String(pid)) || !TOKEN.test(String(token))) return { status: 400, json: { error: 'bad pid or token' } };
  if (!Array.isArray(entries) || !entries.length || entries.length > LIMITS.maxEntries) return { status: 400, json: { error: `1..${LIMITS.maxEntries} entries` } };
  if (!(await kv.setNX(K.ipRate(ipHash), '1', LIMITS.ipEverySec)) || !(await kv.setNX(K.pidRate(pid), '1', LIMITS.pidEverySec))) return { status: 429, json: { error: 'slow down' } };
  if (!(await kv.setNX(K.lock(pid), '1', 5))) return { status: 429, json: { error: 'busy' } };
  // alts: wallets that EARN (wages) from one network per day are limited; the same device is the same network (no fingerprinting)
  if (entries.some((e) => e?.action === 'pm.wage') && !(await altSlot(kv, ipHash, pid, Math.floor(now / DAY_MS)))) { await kv.del(K.lock(pid)); return { status: 422, json: { error: `at most ${LIMITS.altsPerIpDay} ${CURRENCY.name} wallets can earn wages from one network per day`, kind: 'alts', anchor: pub(await getA(kv, pid)) } }; }
  try {
    const raw = await kv.get(K.anchor(pid)), a = raw ? JSON.parse(raw) : { pid, tokenHash: tokenHash(token), ...freshCheckpoint(), heads: [] };
    if (a.tokenHash !== tokenHash(token)) return { status: 403, json: { error: 'not your wallet' } };
    if (a.seq + entries.length > LIMITS.maxLength) return { status: 413, json: { error: 'wallet log is full' } };
    let next; try { next = advance(a, entries, 'player:' + pid, { now: now + LIMITS.futureMs }); }
    catch (e) { const fork = e.kind === 'chain'; return { status: fork ? 409 : 422, json: { error: e.message, kind: e.kind, anchor: pub(raw ? a : null) } }; }
    const out = { ...a, ...next, heads: [...(a.heads || []), { seq: next.seq, head: next.head, ts: next.ts }].slice(-LIMITS.keepHeads), updatedAt: now };
    await kv.set(K.anchor(pid), JSON.stringify(out)); return { status: 200, json: { anchor: pub(out) } };
  } finally { await kv.del(K.lock(pid)); }
}
// tiny in-memory store with the same 4 calls as api/_lib/kv.js (tests + the Bureau's live checks)
export function memoryStore(clock = () => Date.now()) { const m = new Map(), live = (k) => { const e = m.get(k); if (e && e.exp && e.exp <= clock()) { m.delete(k); return null; } return e; };
  return { map: m, get: async (k) => live(k)?.v ?? null, set: async (k, v) => { m.set(k, { v: String(v), exp: 0 }); return 'OK'; }, setNX: async (k, v, ex) => { if (live(k)) return false; m.set(k, { v: String(v), exp: clock() + (ex || 30) * 1000 }); return true; }, del: async (k) => { m.delete(k); } }; }

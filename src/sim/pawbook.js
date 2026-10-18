// The player's Pawmarks wallet (Phase 2). Per player, per device: a hash-chained log kept locally (localStorage key
// 'inu.sim.pm.v1', separate from the game save) and anchored on the sim server (/api/sim-log). The id is a random
// device id, never a crypto wallet; nothing here can move value to Bones, $KIBBLE, a wallet or anything prize-eligible.
// Opt-in: nothing pays a player until they join; leaving stops it at once. Every rule is re-checked by the server.
import { hashOf } from './ledger.js';
import { advance, freshCheckpoint, PID, TOKEN } from './anchor.js';
import { quote } from './economy.js';
import { ISSUER, SINK } from './pawmarks.js';
import { guardedFetch, SIM_UNIT, FirewallError } from './firewall.js';
import { OPT_IN_KEY } from './engine.js';
export const STORE_KEY = 'inu.sim.pm.v1', MAX_UNSYNCED = 200;
const hex = (bytes) => { const a = new Uint8Array(bytes); globalThis.crypto.getRandomValues(a); return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join(''); };

export function createPawWallet({ store = globalThis.localStorage, now = () => Date.now(), net = (u, o) => guardedFetch(u, globalThis.fetch, o) } = {}) {
  let st = null, status = { server: 'unknown', note: '' };
  const fresh = () => ({ v: 1, pid: 'p' + hex(8), token: hex(24), base: freshCheckpoint(), entries: [] });
  const save = () => { try { store?.setItem(STORE_KEY, JSON.stringify(st)); } catch {} };
  const load = () => { try { const j = JSON.parse(store?.getItem(STORE_KEY) || 'null'); if (j && PID.test(j.pid) && TOKEN.test(j.token) && j.base && Array.isArray(j.entries)) return j; } catch {} return null; };
  st = load(); if (!st) { st = fresh(); save(); }
  const acct = () => 'player:' + st.pid;
  // current state = anchored checkpoint + local entries, replayed with the server's own rules (a tampered local log is dropped)
  const cur = () => { try { return advance(st.base, st.entries, acct()); } catch (e) { status = { ...status, note: `local log failed verification (${e.message}); kept the anchored checkpoint` }; st.entries = []; save(); return st.base; } };
  const append = (action, target, actor, amount = 0, data = null) => {
    const c = cur(); if (st.entries.length >= MAX_UNSYNCED) throw new FirewallError('size', 'too many unsynced entries: sync first');
    const e = { seq: c.seq, ts: Math.max(Math.round(now()), c.ts), actor, group: 'sim', action, target, value: { amount, unit: SIM_UNIT }, data, prev: c.head }; e.hash = hashOf(e);
    advance(c, [e], acct()); st.entries.push(e); save(); return e; };
  const w = {
    get pid() { return st.pid; }, account: acct,
    state: () => { const c = cur(); return { balance: c.balance, joined: c.joined, seq: c.seq, head: c.head, unsynced: st.entries.length, anchoredSeq: st.base.seq, server: status.server, note: status.note }; },
    joined: () => cur().joined, balance: () => cur().balance, entries: () => st.entries.map((e) => ({ ...e })),
    join() { if (cur().joined) return null; try { store?.setItem(OPT_IN_KEY, 'yes'); } catch {} return append('wallet.join', acct(), acct()); },
    leave() { if (!cur().joined) return null; try { store?.removeItem(OPT_IN_KEY); } catch {} return append('wallet.leave', acct(), acct()); },
    quote: (kind = 'wage') => quote(cur().flows, acct(), kind, now()),
    payWage(why = 'desk shift') { if (!cur().joined) throw new FirewallError('optin', 'join the side economy first'); const q = w.quote('wage'); if (!q.ok) throw new FirewallError(q.reason === 'cooldown' ? 'cooldown' : 'cap', q.reason); return append('pm.wage', acct(), ISSUER, q.amount, { why }); },
    payFine(amount, why) { return append('pm.fine', SINK, acct(), amount, { why: String(why || '').slice(0, 60) }); }, // primitives: nothing fines players in Phase 2
    payBail(amount, why) { return append('pm.bail', SINK, acct(), amount, { why: String(why || '').slice(0, 60) }); },
    // push unsynced entries to the anchor; on a fork the server checkpoint wins (it is the record)
    async sync() {
      try {
        if (!st.entries.length) { const r = await net('/api/sim-log?pid=' + st.pid, { method: 'GET' }); if (r.status === 503) { status.server = 'offline'; return w.state(); } const j = await r.json(); status.server = 'ok';
          if (j.anchor) { const b = cpOf(j.anchor); if (b.seq !== st.base.seq || b.head !== st.base.head || b.balance !== st.base.balance) { st.base = b; save(); status.note = 'restored the server-anchored checkpoint'; } } return w.state(); } // server anchor wins over local
        const sending = st.entries.slice(0, 40), r = await net('/api/sim-log', { method: 'POST', body: { pid: st.pid, token: st.token, entries: sending } }), j = await r.json().catch(() => ({}));
        if (r.status === 200) { st.base = cpOf(j.anchor); st.entries = st.entries.slice(sending.length); status = { server: 'ok', note: '' }; save(); if (st.entries.length) return w.sync(); }
        else if (r.status === 409 || r.status === 422) { const lost = st.entries.length; if (j.anchor) st.base = cpOf(j.anchor); else st.base = freshCheckpoint(); st.entries = []; save(); status = { server: 'ok', note: `server refused ${lost} local entr${lost === 1 ? 'y' : 'ies'} (${j.error}); using the anchored checkpoint` }; }
        else status.server = [404, 501, 502, 503, 504].includes(r.status) ? 'offline' : r.status === 429 ? 'busy' : 'error ' + r.status;
      } catch { status.server = 'offline'; }
      return w.state(); },
  };
  return w;
}
const cpOf = (a) => ({ seq: a.seq, head: a.head, ts: a.ts, balance: a.balance, joined: a.joined, flows: a.flows || {} });

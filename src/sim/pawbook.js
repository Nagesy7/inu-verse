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
import { POLICE, fineFor, heldNow, canPolice } from './police.js';
import { COURT, hear } from './court.js';
import { MED, AILMENTS, callAt, canInjure, canTreat, hurtNow, slowFactor, freshMed } from './medical.js';
import { FIRE, eventAt, canAttend, freshFire } from './fire.js';
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
    state: () => { const c = cur(), ps = c.police || {}; return { balance: c.balance, joined: c.joined, seq: c.seq, head: c.head, unsynced: st.entries.length, anchoredSeq: st.base.seq, server: status.server, note: status.note,
      held: heldNow(ps, now()) ? { ...ps.held, leftMs: ps.held.ts + ps.held.sec * 1000 - now() } : null, heldRecord: ps.held || null, owed: { ...(ps.owed || {}) }, citesToday: ps.day === Math.floor(now() / 864e5) ? ps.cites : 0, verdictsToday: ps.court?.day === Math.floor(now() / 864e5) ? ps.court.verdicts : 0, med: medState(c.med, now()), fire: fireState(c.fire, now()) }; },
    joined: () => cur().joined, balance: () => cur().balance, entries: () => st.entries.map((e) => ({ ...e })),
    join() { if (cur().joined) return null; try { store?.setItem(OPT_IN_KEY, 'yes'); } catch {} return append('wallet.join', acct(), acct()); },
    leave() { if (!cur().joined) return null; try { store?.removeItem(OPT_IN_KEY); } catch {} return append('wallet.leave', acct(), acct()); },
    quote: (kind = 'wage') => quote(cur().flows, acct(), kind, now()),
    payWage(why = 'desk shift') { if (!cur().joined) throw new FirewallError('optin', 'join the side economy first'); const q = w.quote('wage'); if (!q.ok) throw new FirewallError(q.reason === 'cooldown' ? 'cooldown' : 'cap', q.reason); return append('pm.wage', acct(), ISSUER, q.amount, { why }); },
    // Phase 3 policing. Every rule is the server's (police.js); a real player is only policed after joining.
    canPolice: (kind = 'cite') => cur().joined && canPolice(cur().police, now(), kind),
    cite(by, offense, tx, ty) { const c = cur(); if (!c.joined) throw new FirewallError('optin', 'not in the side economy'); const fine = fineFor(c.police, now(), c.balance);
      const e = append('police.cite', acct(), by, 0, { offense, tx, ty, fine }); const paid = fine ? append('pm.fine', SINK, acct(), fine, { for: e.seq }) : null; return { cite: e, fine, paid }; },
    detain(by, offense, tx, ty, sec = POLICE.detainSec) { if (!cur().joined) throw new FirewallError('optin', 'not in the side economy'); return append('police.detain', acct(), by, 0, { offense, tx, ty, sec }); },
    release(reason) { return cur().police?.held ? append('police.release', acct(), acct(), 0, { reason }) : null; },
    payFine(forSeq) { const owed = cur().police?.owed?.[forSeq]; if (!owed) throw new FirewallError('economy', 'no such unpaid citation'); return append('pm.fine', SINK, acct(), owed, { for: Number(forSeq) }); },
    payBail() { const h = cur().police?.held; if (!h || !heldNow(cur().police, now())) throw new FirewallError('economy', 'not detained'); return append('pm.bail', SINK, acct(), POLICE.bail, { for: h.seq }); },
    // Phase 4 courts. The docket is the ANCHORED evidence file (the server's checkpoint), never the local copy; a verdict is
    // re-decided by the server from that same file (court.js), and a dismissal refunds exactly what was paid.
    docket() { const f = st.base.police?.file || {}, live = cur().police?.file || {};
      return Object.values(f).sort((a, b) => b.e.seq - a.e.seq).map((r) => { const l = live[r.e.seq] || r; return { ...l, e: { ...r.e }, anchored: true, facts: hear({ record: r, ground: null, file: f }).facts, open: !l.verdict && now() - r.e.ts < COURT.windowMs }; }); },
    contest(seq, ground, opened) { const c = cur(); if (!c.joined) throw new FirewallError('optin', 'join the side economy first');
      if (!st.base.police?.file?.[seq]) throw new FirewallError('evidence', 'only anchored evidence can be tried: sync first');
      const rec = c.police.file[seq], { outcome } = hear({ record: rec, ground, file: c.police.file });
      if (outcome === 'inadmissible') throw new FirewallError('collusion', "inadmissible: the patrol log can't back this record up");
      const v = append('court.verdict', acct(), COURT.judge, 0, { for: Number(seq), ground, outcome, opened: Math.round(opened) });
      const paid = cur().police.file[seq]?.paid || 0, refund = outcome === 'dismissed' && paid ? append('pm.refund', acct(), ISSUER, paid, { for: Number(seq) }) : null;
      return { verdict: v, outcome, refund, refunded: refund ? paid : 0 }; },
    // Phase 5 clinic. Cartoon bumps need the side economy AND bumps switched on; every rule is the server's (medical.js).
    bumpsOn() { const c = cur(); if (!c.joined) throw new FirewallError('optin', 'join the side economy first'); return c.med?.opted ? null : append('med.optin', acct(), acct()); },
    bumpsOff() { return cur().med?.opted ? append('med.optout', acct(), acct()) : null; },
    canInjure: () => canInjure(cur().med, now(), cur().joined),
    injure(ail, tx, ty) { const a = AILMENTS[ail]; if (!a) throw new FirewallError('evidence', 'unknown bump'); return append('med.injury', acct(), a.cause, 0, { ail, tx, ty, sec: a.sec }); },
    heal(how) { const h = cur().med?.hurt; return h ? append('med.heal', acct(), acct(), 0, { for: h.seq, how }) : null; },
    // free treatment by the clinic doctor (never blocked: no balance needed); chipping in the co-pay is a separate choice
    care() { const h = cur().med?.hurt; if (!h) throw new FirewallError('harm', 'nothing to treat'); return append('med.care', acct(), MED.doctor, 0, { for: h.seq }); },
    copay(careSeq) { return append('pm.copay', SINK, acct(), MED.copay, { for: Number(careSeq) }); },
    canTreat: (slot) => cur().joined && canTreat(cur().med, now(), slot),
    // a medic shift: treat the sim pup on this call, then the normal sim wage (shared cap, cooldown, diminishing returns)
    treatCall(slot, slips = 0) { const c = callAt(slot); if (!cur().joined) throw new FirewallError('optin', 'join the side economy first'); if (!c) throw new FirewallError('evidence', 'no such call');
      const t = append('med.treat', c.pt, acct(), 0, { call: c.slot, ail: c.ail, slips }); const q = w.quote('wage'); let wage = null;
      if (q.ok) wage = append('pm.wage', acct(), ISSUER, q.amount, { why: 'medic shift', for: t.seq }); return { treat: t, wage, reason: q.ok ? '' : q.reason }; },
    // Phase 6 town events + firefighter shifts. Events need the side economy AND town events switched on (fire.optin); a
    // shift answers a SEEDED incident (there is no way to start one) and then takes the normal sim wage, once.
    eventsOn() { const c = cur(); if (!c.joined) throw new FirewallError('optin', 'join the side economy first'); return c.fire?.opted ? null : append('fire.optin', acct(), acct()); },
    eventsOff() { return cur().fire?.opted ? append('fire.optout', acct(), acct()) : null; },
    canAttend: (slot) => canAttend(cur().fire, now(), slot, cur().joined),
    attendCall(slot, slips = 0) { const c = eventAt(slot); if (!cur().joined) throw new FirewallError('optin', 'join the side economy first'); if (!c || c.quiet) throw new FirewallError('evidence', 'no incident on that slot');
      const a = append('fire.attend', c.actor, acct(), 0, { call: c.slot, kind: c.kind, spot: c.spot, slips }); const q = w.quote('wage'); let wage = null;
      if (q.ok) wage = append('pm.wage', acct(), ISSUER, q.amount, { why: 'fire shift', for: a.seq }); return { attend: a, wage, reason: q.ok ? '' : q.reason }; },
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
const cpOf = (a) => ({ seq: a.seq, head: a.head, ts: a.ts, balance: a.balance, joined: a.joined, flows: a.flows || {}, police: a.police || freshCheckpoint().police, med: a.med || freshMed(), fire: a.fire || freshFire() });
function medState(md0, t) { const md = { ...freshMed(), ...(md0 || {}) }, today = md.day === Math.floor(t / 864e5);
  return { bumps: !!md.opted, hurt: md.hurt ? { ...md.hurt, live: hurtNow(md, t), leftMs: Math.max(0, md.hurt.ts + md.hurt.sec * 1000 - t), label: AILMENTS[md.hurt.ail]?.label } : null, slow: slowFactor(md, t),
    injuriesToday: today ? md.injuries : 0, treatsToday: today ? md.treats : 0, calls: [...md.calls], cares: { ...md.cares } }; }
function fireState(f0, t) { const f = { ...freshFire(), ...(f0 || {}) }, today = f.day === Math.floor(t / 864e5); return { events: !!f.opted, callsToday: today ? f.n : 0, calls: [...f.calls], cap: FIRE.callsPerDay }; }

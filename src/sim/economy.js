// Side-economy flows (Phase 2): wages, fines, bail and bribes. Pawmarks only, every one a log entry, and every one
// anti-farm controlled: diminishing returns, per-entry and daily caps, cooldowns. Pure: the same rules run in the
// client wallet (pawbook.js), the sim engine (engine.js) and the server anchor (anchor.js), so the server re-checks
// everything a client claims. Times are ms; "day" is the UTC day of the entry's timestamp.
import { FirewallError } from './firewall.js';
export const DAY_MS = 86400000;
export const FLOWS = Object.freeze({
  wage: Object.freeze({ action: 'pm.wage', base: 10, min: 2, decay: 0.8, cooldownMs: 3 * 60e3, dailyCap: 60, payer: 'target' }), // earner = target
  fine: Object.freeze({ action: 'pm.fine', max: 15, cooldownMs: 60e3, dailyCap: 30, payer: 'actor' }),
  bail: Object.freeze({ action: 'pm.bail', max: 25, cooldownMs: 5 * 60e3, dailyCap: 50, payer: 'actor' }),
  bribe: Object.freeze({ action: 'pm.bribe', max: 20, decay: 0.5, cooldownMs: 60e3, dailyCap: 40, payer: 'actor' }), // ledger primitive only (corrupt-cop branch is Phase 7)
});
export const FLOW_OF = Object.freeze(Object.fromEntries(Object.entries(FLOWS).map(([k, f]) => [f.action, k])));
const dayOf = (ts) => Math.floor(ts / DAY_MS);
const slot = (state, acct, k, ts) => { const s = state?.[acct]?.[k]; return s && s.day === dayOf(ts) ? s : { day: dayOf(ts), count: 0, total: 0, lastTs: s?.lastTs ?? -Infinity }; };
// What the next flow of kind k for this account may be at time ts: { ok, amount (wage: exact; others: max), waitMs, reason }.
export function quote(state, acct, k, ts) {
  const f = FLOWS[k]; if (!f) throw new Error(`unknown flow ${k}`); const s = slot(state, acct, k, ts), wait = s.lastTs + f.cooldownMs - ts, left = f.dailyCap - s.total;
  const step = f.decay ? Math.max(f.min || 1, Math.floor((f.base || f.max) * f.decay ** s.count)) : (f.base || f.max);
  if (left <= 0) return { ok: false, amount: 0, waitMs: (s.day + 1) * DAY_MS - ts, reason: 'daily cap reached' };
  if (wait > 0) return { ok: false, amount: 0, waitMs: wait, reason: 'cooldown' };
  return { ok: true, amount: Math.min(step, left), waitMs: 0, reason: '' };
}
// Validate entry e against the flow state and return the NEXT state (never mutates). Non-flow entries pass through.
export function applyFlow(state, e) {
  const k = FLOW_OF[e.action]; if (!k) return state; const f = FLOWS[k], acct = f.payer === 'target' ? e.target : e.actor, amt = e.value?.amount ?? 0, q = quote(state, acct, k, e.ts);
  if (!q.ok) throw new FirewallError(q.reason === 'cooldown' ? 'cooldown' : 'cap', `${e.action}: ${q.reason}`);
  if (!Number.isInteger(amt) || amt <= 0) throw new FirewallError('economy', `${e.action} needs a positive whole amount`);
  if (k === 'wage' ? amt !== q.amount : amt > q.amount) throw new FirewallError('cap', `${e.action}: ${amt} is over the allowed ${q.amount} (diminishing returns / caps)`);
  const s = slot(state, acct, k, e.ts), next = { ...(state || {}) }; next[acct] = { ...(next[acct] || {}), [k]: { day: s.day, count: s.count + 1, total: s.total + amt, lastTs: e.ts } }; return next;
}

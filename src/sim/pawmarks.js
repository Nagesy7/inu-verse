// Pawmarks: the sim's side currency. One-way by design.
//  - Earned and spent only inside the simulation (wages, fines, bail, fees). Balances are NOT stored anywhere:
//    they are recomputed by replaying the hash-chained action log, so there is no unlogged way to change one.
//  - No exchange, no shop item, no trade or gift path into Bones, $KIBBLE, cosmetics or anything prize-eligible.
//  - Never leaves the game, never tied to a wallet (account ids that look like addresses are refused).
// tests/sim-checks.test.mjs (Check 4, Check 5) assert this module exports exactly PAWMARK, ISSUER, SINK, validAccount, balances.
import { FirewallError, SIM_UNIT } from './firewall.js';
import { CURRENCY } from './currency.js';
export const PAWMARK = Object.freeze({ unit: SIM_UNIT, name: CURRENCY.name, short: CURRENCY.short, oneWay: true, cashOut: false, wallet: false, prizeEligible: false });
export const ISSUER = 'sim:issuer', SINK = 'sim:sink'; // issuance comes from the sim itself; fines/fees go to the sink (destroyed)
const ACCOUNT = /^(sim|player):[a-z0-9][a-z0-9_-]{0,31}$/;
export function validAccount(id) {
  if (typeof id !== 'string' || !ACCOUNT.test(id)) throw new FirewallError('wallet', `not a sim account id: ${String(id).slice(0, 48)}`);
  return id;
}
// Replay. Created by the sim: pm.issue, pm.wage, pm.refund (ISSUER -> target; a refund is exactly a dismissed record's own fine/bail). Moved: pm.pay, pm.bribe (actor -> target).
// Destroyed: pm.sink, pm.fine, pm.bail, pm.copay (actor -> SINK; the clinic co-pay is optional). Everything else moves nothing. start = balances at a checkpoint.
const CREATE = ['pm.issue', 'pm.wage', 'pm.refund'], MOVE = ['pm.pay', 'pm.bribe'], DESTROY = ['pm.sink', 'pm.fine', 'pm.bail', 'pm.copay'];
export function balances(entries, start = null) {
  const b = new Map(Object.entries(start || {})), add = (k, v) => b.set(k, (b.get(k) || 0) + v);
  for (const e of entries) { const a = e.value?.amount || 0; if (!a || e.value.unit !== SIM_UNIT) continue;
    if (CREATE.includes(e.action)) add(e.target, a);
    else if (MOVE.includes(e.action) || DESTROY.includes(e.action)) { add(e.actor, -a); add(DESTROY.includes(e.action) ? SINK : e.target, a); } }
  return b;
}

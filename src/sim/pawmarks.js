// Pawmarks: the sim's side currency. One-way by design.
//  - Earned and spent only inside the simulation (wages, fines, bail, fees). Balances are NOT stored anywhere:
//    they are recomputed by replaying the hash-chained action log, so there is no unlogged way to change one.
//  - No exchange, no shop item, no trade or gift path into Bones, $KIBBLE, cosmetics or anything prize-eligible.
//  - Never leaves the game, never tied to a wallet (account ids that look like addresses are refused).
// tests/sim-checks.test.mjs (Check 4, Check 5) assert this module exports exactly PAWMARK, ISSUER, SINK, validAccount, balances.
import { FirewallError, SIM_UNIT } from './firewall.js';
export const PAWMARK = Object.freeze({ unit: SIM_UNIT, name: 'Pawmarks', short: 'PM', oneWay: true, cashOut: false, wallet: false, prizeEligible: false });
export const ISSUER = 'sim:issuer', SINK = 'sim:sink'; // issuance comes from the sim itself; fines/fees go to the sink (destroyed)
const ACCOUNT = /^(sim|player):[a-z0-9][a-z0-9_-]{0,31}$/;
export function validAccount(id) {
  if (typeof id !== 'string' || !ACCOUNT.test(id)) throw new FirewallError('wallet', `not a sim account id: ${String(id).slice(0, 48)}`);
  return id;
}
// Replay: pm.issue (ISSUER -> target), pm.pay (actor -> target), pm.sink (actor -> SINK). Everything else moves nothing.
export function balances(entries) {
  const b = new Map(), add = (k, v) => b.set(k, (b.get(k) || 0) + v);
  for (const e of entries) { const a = e.value?.amount || 0; if (!a || e.value.unit !== SIM_UNIT) continue;
    if (e.action === 'pm.issue') add(e.target, a);
    else if (e.action === 'pm.pay' || e.action === 'pm.sink') { add(e.actor, -a); add(e.action === 'pm.sink' ? SINK : e.target, a); } }
  return b;
}

// Simulation event/agent framework (Phase 1 hooks for the later Investigations / Courts / Medical / Fire phases).
// Every agent action goes through act(): it is checked by the firewalls, then appended to the hash-chained log, then
// broadcast to listeners. There is no other way to move Pawmarks (balances are replayed from the log).
// Real players are never targets unless they opted in; the sim gets only a read-only copy of game state.
import { CURRENCY } from './currency.js';
import { createLog, GROUPS } from './ledger.js';
import { FirewallError, BANNED_ACTION, guardUnit, guardKey, guardNoWallet, guardedFetch, readOnly, SIM_UNIT } from './firewall.js';
import { ISSUER, SINK, validAccount, balances as replay } from './pawmarks.js';
import { applyFlow, quote, FLOW_OF } from './economy.js';

export const LIMITS = Object.freeze({ holdMaxSec: 600, perActionPerMin: 6, pairFlowPerDay: 200, issuePerDay: 2000, day: 720 });
export const OPT_IN_KEY = 'inu.sim.optin.v1'; // local flag, default OFF. Phase 1 ships no switch for it, so no real player is ever in the sim.
export function optedIn(store = globalThis.localStorage) { try { return store?.getItem(OPT_IN_KEY) === 'yes'; } catch { return false; } }
export const STAT_KEYS = ['grit', 'wits', 'heart', 'pace']; // the ONLY inputs to outcomes. Cosmetics are kept apart and never read.
const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const strSeed = (s) => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };

export function createSim({ seed = 1, now = null, players = [], limits = LIMITS } = {}) {
  let clock = 0; const L = { ...LIMITS, ...limits };
  const log = createLog({ now: now || (() => Math.round(clock * 1000)) });
  const agents = new Map(), actions = new Map(), holds = new Map(), once = new Set(), listeners = new Map(), rate = new Map(); let flows = {};
  const tsNow = () => (now ? Number(now()) : Math.round(clock * 1000));
  const optIn = new Set(players.map((p) => validAccount('player:' + p)));
  const isWatchdog = (id) => agents.get(id)?.group === 'watchdogs';
  const day = () => Math.floor(clock / L.day);

  function register(a) {
    guardNoWallet(a, 'agent'); for (const k of Object.keys(a)) if (k !== 'look') guardKey(k);
    const id = validAccount(a.id); if (!id.startsWith('sim:')) throw new FirewallError('optin', 'agents are sim pups, never real players');
    if (!GROUPS.includes(a.group) || a.group === 'sim') throw new Error(`unknown group ${a.group}`);
    const stats = {}; for (const k of STAT_KEYS) stats[k] = Math.max(0, Math.min(10, Number(a.stats?.[k] ?? 5)));
    const ag = Object.freeze({ id, name: String(a.name || id), group: a.group, role: String(a.role || ''), stats: Object.freeze(stats), look: Object.freeze({ ...(a.look || {}) }) });
    agents.set(id, ag); log.append({ actor: 'sim:system', group: 'sim', action: 'agent.join', target: id, data: { group: ag.group, role: ag.role } }); return ag;
  }
  function defineAction(name, d = {}) {
    if (BANNED_ACTION.test(name) || BANNED_ACTION.test(d.kind || '')) throw new FirewallError('gambling', `actions shaped like gambling are not allowed (${name})`);
    if (d.chance != null && (d.cost || d.price)) throw new FirewallError('gambling', `no random paid rewards (${name})`);
    if (d.unit) guardUnit(d.unit); if (d.writes) for (const k of [].concat(d.writes)) guardKey(k);
    if (d.hold && !(d.hold.maxSec > 0 && d.hold.maxSec <= L.holdMaxSec)) throw new FirewallError('harm', `holds need a time cap <= ${L.holdMaxSec}s`);
    actions.set(name, Object.freeze({ name, moves: d.moves || null, once: !!d.once, hold: d.hold || null, investigative: !!d.investigative, diminish: !!d.diminish, groups: d.groups || null })); return name;
  }
  const canTarget = (t) => agents.has(t) || t === SINK || (t.startsWith('player:') && optIn.has(t));
  function act(actorId, name, targetId, { amount = 0, unit = SIM_UNIT, data = null } = {}) {
    const d = actions.get(name); if (!d) throw new Error(`unknown action ${name}`);
    guardUnit(unit); if (!Number.isInteger(amount) || amount < 0) throw new FirewallError('economy', `amount must be a whole number of ${CURRENCY.name}`);
    const sys = actorId === ISSUER; if (!sys && !agents.has(actorId)) throw new Error(`unknown actor ${actorId}`);
    validAccount(targetId); if (!canTarget(targetId)) throw new FirewallError('optin', `${targetId} is not in the sim (real players need opt-in)`);
    if (d.moves === 'issue' && !sys) throw new FirewallError('economy', `only the sim issuer creates ${CURRENCY.name}`);
    if (sys && d.moves !== 'issue') throw new Error('issuer can only issue');
    const actor = sys ? { group: 'sim' } : agents.get(actorId);
    if (d.groups && !d.groups.includes(actor.group)) throw new FirewallError('permission', `${actor.group} may not ${name}`);
    if ((d.investigative || d.hold) && actorId === targetId) throw new FirewallError('collusion', `nobody can ${name} themselves`);
    if (isWatchdog(targetId) && actor.group !== 'watchdogs' && (d.investigative || d.hold)) throw new FirewallError('independence', 'the Watchdogs cannot be investigated, held or tried by sim agents');
    if (amount > 0 && (isWatchdog(actorId) || isWatchdog(targetId))) throw new FirewallError('independence', 'the Watchdogs have no balance, no wages and cannot be bribed');
    if (data != null) { guardNoWallet(data, 'data'); if (typeof data === 'object') for (const k of Object.keys(data)) guardKey(k); }
    if (d.once) { const k = name + ':' + String(data?.key ?? ''); if (!data?.key) throw new Error(`${name} needs data.key`); if (once.has(k)) throw new FirewallError('replay', `${name} already done for ${data.key}`); }
    if (d.hold) { const sec = Number(data?.sec); if (!(sec > 0 && sec <= d.hold.maxSec)) throw new FirewallError('harm', `hold must be 1..${d.hold.maxSec}s`); }
    // rate limit + diminishing returns per actor/action (sim minutes)
    const rk = actorId + '|' + name, recent = (rate.get(rk) || []).filter((t) => t > clock - 60);
    if (!sys && recent.length >= L.perActionPerMin) throw new FirewallError('rate', `${name} rate limit`);
    let amt = amount; if (d.diminish && amt) amt = Math.floor(amt / (1 + recent.length));
    if (amt && d.moves) {
      const bal = replay(log.entries());
      if (d.moves !== 'issue' && (bal.get(actorId) || 0) < amt) throw new FirewallError('economy', `not enough ${CURRENCY.name}`);
      if (d.moves === 'issue') { const today = log.entries().filter((e) => e.action === name && Math.floor(e.ts / 1000 / L.day) === day()).reduce((s, e) => s + e.value.amount, 0);
        if (today + amt > L.issuePerDay) throw new FirewallError('economy', `daily ${CURRENCY.one} issuance cap`); }
      if (d.moves === 'pay') { const pair = [actorId, targetId].sort().join('|'), flow = log.entries().filter((e) => e.action === name && [e.actor, e.target].sort().join('|') === pair && Math.floor(e.ts / 1000 / L.day) === day()).reduce((s, e) => s + e.value.amount, 0);
        if (flow + amt > L.pairFlowPerDay) throw new FirewallError('collusion', 'daily flow cap between two parties'); } }
    if (d.moves && !amt && amount) throw new FirewallError('rate', 'diminishing returns: nothing left to earn this minute');
    // Phase 2 flows (wage / fine / bail / bribe): anti-farm rules from economy.js, identical to the client wallet and server anchor
    let nextFlows = null; if (FLOW_OF[name]) {
      if (name === 'pm.bribe' && (actorId.startsWith('player:') || targetId.startsWith('player:'))) throw new FirewallError('phase', 'bribes are a sim-agent ledger primitive only until the corrupt-cop branch (Phase 7)');
      if (name !== 'pm.wage' && name !== 'pm.bribe' && targetId !== SINK) throw new FirewallError('economy', `${name} is paid into the sink`);
      if (name === 'pm.bail' && !holds.has(String(data?.for))) throw new Error('bail needs data.for = someone currently held');
      nextFlows = applyFlow(flows, { action: name, actor: actorId, target: targetId, ts: tsNow(), value: { amount: amt } }); }
    const e = log.append({ actor: actorId, group: actor.group, action: name, target: targetId, value: { amount: amt, unit: SIM_UNIT }, data });
    recent.push(clock); rate.set(rk, recent); if (nextFlows) flows = nextFlows;
    if (name === 'pm.bail') release(String(data.for), 'bail paid');
    if (d.once) once.add(name + ':' + String(data.key));
    if (d.hold) holds.set(targetId, { by: actorId, until: clock + Number(data.sec), seq: e.seq });
    for (const fn of [...(listeners.get(name) || []), ...(listeners.get('*') || [])]) { try { fn(e); } catch {} }
    return e;
  }
  // The way out (check 11): anyone held can always walk free; it is logged like everything else.
  function release(targetId, reason = 'released') { if (!holds.has(targetId)) return null; holds.delete(targetId); return log.append({ actor: 'sim:system', group: 'sim', action: 'release', target: targetId, data: { reason } }); }
  function step(dt) { clock += Math.max(0, dt); for (const [t, h] of [...holds]) if (clock >= h.until) release(t, 'time cap'); }
  // Outcomes read stats + a seeded roll only (check 9: nothing bought with $KIBBLE can change them).
  function resolve(agentId, kind, salt = 0) { const a = agents.get(agentId); if (!a) throw new Error('unknown agent');
    const r = mulberry(strSeed(`${seed}|${kind}|${salt}|${a.id}`))(), s = a.stats, base = { legal: s.wits, health: s.heart, police: s.grit, fire: s.pace }[kind] ?? (s.grit + s.wits + s.heart + s.pace) / 4;
    return Math.round((base * 0.08 + r * 0.2) * 1000) / 1000; }
  const on = (name, fn) => { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(fn); return () => listeners.set(name, listeners.get(name).filter((f) => f !== fn)); };

  defineAction('pm.issue', { moves: 'issue' }); defineAction('pm.pay', { moves: 'pay' }); defineAction('pm.sink', { moves: 'sink' });
  defineAction('audit.read', { groups: ['watchdogs'] }); defineAction('audit.note', { groups: ['watchdogs'] });
  defineAction('pm.wage', { moves: 'issue' }); defineAction('pm.fine', { moves: 'sink' }); defineAction('pm.bail', { moves: 'sink' }); defineAction('pm.bribe', { moves: 'pay' });
  defineAction('evidence.file', { once: true, investigative: true });
  // Phase 3: police + rangers. Citations are evidence; detentions are holds capped at 60 s (players: opt-in only, canTarget).
  defineAction('police.cite', { investigative: true, groups: ['police', 'rangers'] }); defineAction('police.detain', { hold: { maxSec: 60 }, investigative: true, groups: ['police', 'rangers'] }); defineAction('hold', { hold: { maxSec: L.holdMaxSec }, investigative: true });
  return { log, register, defineAction, act, release, step, resolve, on, view: readOnly, fetch: guardedFetch, limits: L,
    get clock() { return clock; }, agents: () => [...agents.values()], holds: () => new Map(holds), isOptedIn: (id) => optIn.has(id),
    quote: (acct, kind) => quote(flows, acct, kind, tsNow()),
    balance: (id) => replay(log.entries()).get(id) || 0, balances: () => replay(log.entries()) };
}

// Phase 6: Emberpaw Firehouse + seeded town events. Pure rules shared by the player's wallet (pawbook.js), the sim engine
// and the server anchor (anchor.js), so the server re-checks every opt-in, call answered and fire-shift wage.
//  - Cartoon incidents only (a smoking bin, a kite stuck in a tree, a toaster puff at the town bakery kiosk, a cat up a
//    lamppost), always at fixed PUBLIC spots (pavements, street trees, lampposts, the sim bakery kiosk): never a player's
//    home, plot, lot or shop, and nothing is ever damaged. Nothing graphic.
//  - Town events are a fixed timetable hashed from the clock (one 3-minute slot each), so every device and the server
//    derive the same event at the same time from the slot number alone: no payloads, no dice, no stakes.
//  - Bigger events ("two-alarm") bring a police constable for a cordon and a clinic medic on standby (cosmetic, cheap).
//  - Players: only after joining the side economy AND switching town events on (fire.optin, off by default). Events are
//    scenery: nothing blocks movement, doors, chat or other games, and nothing touches Bones, $KIBBLE, prizes, scores,
//    player shops or other games.
//  - Firefighter shifts pay a normal sim wage (pm.wage: the SAME daily cap, cooldown and diminishing returns as every sim
//    job) only for answering a SEEDED incident: there is no action that starts a fire, so nobody can light one to farm wages.
//    At most 6 calls a day, each call once, each wage once.
import { FirewallError } from './firewall.js';
import { sha256 } from './sha256.js';
import { DAY_MS } from './economy.js';
export const FIRE = Object.freeze({ callMs: 180e3, graceMs: 60e3, callsPerDay: 6, gapMs: 60e3, payWithinMs: 10 * 60e3, keepCalls: 40, maxSlips: 2, sirenCooldownMs: 45e3, chief: 'sim:fd-rusty' });
const spot = (id, name, x, y, stand, park, road) => Object.freeze({ id, name, x, y, stand: Object.freeze(stand), park: Object.freeze(park), road });
// x, y = the incident itself (tiles); stand = where a responder (or you) works from; park = where the engine stops; road = the lane it drives on
export const INCIDENTS = Object.freeze({
  bins: Object.freeze({ label: 'Smoking bin', actor: 'sim:fx-bin', how: 'warm barbecue ashes went in a street bin', icon: 'smoke',
    steps: Object.freeze(['Check it is only smoke', 'Pop the lid back on', 'A quick spritz of water']),
    spots: Object.freeze([spot('bin-w', 'Kibble Row (west)', 10.5, 45.3, [11.4, 45.7], [12.6, 43.7], 43), spot('bin-mall', 'Kibble Row by the mall', 25.5, 45.3, [26.4, 45.7], [27.6, 43.7], 43),
      spot('bin-plaza', 'Kibble Row by the plaza', 37.5, 45.3, [38.4, 45.7], [39.6, 43.7], 43), spot('bin-e', 'Kibble Row (east)', 52.5, 45.3, [53.4, 45.7], [54.6, 43.7], 43)]) }),
  kite: Object.freeze({ label: 'Kite stuck in a tree', actor: 'sim:fx-kite', how: 'a gust took a pup\'s kite into a street tree', icon: 'kite',
    steps: Object.freeze(['Steady the ladder', 'Climb two rungs', 'Unhook the kite gently']),
    spots: Object.freeze([spot('kite-12', 'Market Street tree', 12.5, 19.5, [13.5, 19.6], [13.8, 20.4], 21), spot('kite-42', 'Pond Road tree', 42.5, 34.5, [43.6, 34.6], [43.8, 32.8], 32),
      spot('kite-52', 'Pond Road east tree', 52.5, 34.5, [53.6, 34.6], [53.8, 32.8], 32)]) }),
  toaster: Object.freeze({ label: 'Toaster puff at the bakery', actor: 'sim:fx-toaster', how: 'a crumpet got stuck in the bakery kiosk toaster', icon: 'toast',
    steps: Object.freeze(['Unplug the toaster', 'Open the hatch', 'Wave the smoke out']),
    spots: Object.freeze([spot('bakery', 'Crumb and Co. bakery kiosk', 36.0, 40.6, [36.2, 41.6], [37.8, 42.9], 43)]) }),
  cat: Object.freeze({ label: 'Cat up a lamppost', actor: 'sim:fx-cat', how: 'a cat climbed a lamppost and will not come down', icon: 'cat',
    steps: Object.freeze(['Lean the ladder on the post', 'Offer a fish treat', 'Carry the cat down']),
    spots: Object.freeze([spot('lamp-8', 'North Plaza lamppost', 8.4, 18.75, [9.3, 19.5], [10.2, 20.4], 21), spot('lamp-24', 'North Plaza lamppost', 24.4, 18.75, [25.3, 19.5], [26.2, 20.4], 21),
      spot('lamp-52', 'North Plaza east lamppost', 52.4, 18.75, [53.3, 19.5], [54.2, 20.4], 21), spot('lamp-45', 'Pond Road lamppost', 45.4, 34.75, [46.4, 34.6], [46.6, 32.8], 32)]) }),
});
export const KINDS = Object.freeze(Object.keys(INCIDENTS));
export const INCIDENT_ACTORS = Object.freeze(KINDS.map((k) => INCIDENTS[k].actor));
export const SPOTS = Object.freeze(KINDS.flatMap((k) => INCIDENTS[k].spots.map((s) => ({ ...s, kind: k }))));
// the crew (original sim pups) and the bigger-event responders
export const CREW = Object.freeze([
  { id: 'sim:fd-rusty', name: 'Captain Rusty Ladderly', role: 'captain', title: 'Fire Captain', coat: 'red', outfit: { bottom: 'chinos', feet: 'sneakers_red' }, line: 'Small fires, big smiles. Nobody gets hurt on my watch.' },
  { id: 'sim:fd-juniper', name: 'Firefighter Juniper Sparkwhistle', role: 'firefighter', title: 'Firefighter', coat: 'cream', outfit: { bottom: 'chinos', feet: 'sneakers_red' }, line: 'Ladder up, treat ready, cat down.' },
  { id: 'sim:fd-biscuit', name: 'Firefighter Biscuit Hydrant', role: 'firefighter', title: 'Engine Driver', coat: 'golden', outfit: { bottom: 'chinos', feet: 'sneakers_red' }, line: 'Engine 7 has never been late. Never.' },
].map((c) => Object.freeze(c)));
export const CREW_IDS = Object.freeze(CREW.map((c) => c.id));
export const CONSTABLE = Object.freeze({ id: 'sim:pd-tilly', name: 'Constable Tilly Brightcollar', force: 'police', title: 'Event Constable', coat: 'tan', outfit: { top: 'suit_navy', bottom: 'slacks_navy', feet: 'loafers' }, prop: 'policecap', line: 'Tape is up. Nice and wide, please.' });
const word = (s, i = 0) => parseInt(sha256(s).slice(i * 8, i * 8 + 8), 16);
// The timetable: one 3-minute slot each, hashed from the slot number (the same for every device and the server).
// 2 in 8 slots are quiet, 2 in 8 are bigger "two-alarm" events, the rest are ordinary call-outs.
export function eventAt(slot) { const n = Math.floor(Number(slot)); if (!Number.isFinite(n) || n < 0) return null; const s = 'emberpaw-call|' + n, q = word(s, 0) % 8, start = n * FIRE.callMs;
  if (q < 2) return { slot: n, quiet: true, start, end: start + FIRE.callMs };
  const kind = KINDS[word(s, 1) % KINDS.length], I = INCIDENTS[kind], sp = I.spots[word(s, 2) % I.spots.length];
  return { slot: n, quiet: false, kind, big: q < 4, spot: sp.id, name: sp.name, label: I.label, actor: I.actor, x: sp.x, y: sp.y, stand: sp.stand, park: sp.park, road: sp.road, start, end: start + FIRE.callMs + FIRE.graceMs }; }
export const fireSlotAt = (ms) => Math.floor(ms / FIRE.callMs);
// the order the steps are offered in (hashed; the right order is INCIDENTS[kind].steps)
export function fireOrder(slot, kind) { const st = INCIDENTS[kind]?.steps || [], idx = st.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = word(`emberpaw-steps|${slot}|${kind}|${i}`) % (i + 1); [idx[i], idx[j]] = [idx[j], idx[i]]; } return idx; }
// the mini-task, graded from the taps only (indexes into INCIDENTS[kind].steps in the order tapped)
export function fireGrade({ kind, taps }) { const st = INCIDENTS[kind]?.steps; if (!st || !Array.isArray(taps)) return { done: false, slips: 0, next: 0 };
  let next = 0, slips = 0; for (const t of taps) { if (t === next) next++; else slips++; if (next === st.length) break; }
  return { done: next === st.length && slips <= FIRE.maxSlips, slips, next, failed: slips > FIRE.maxSlips }; }
export const freshFire = () => ({ opted: false, day: -1, n: 0, last: 0, calls: [], unpaid: {} });
const dayOf = (ts) => Math.floor(ts / DAY_MS), int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const keys = (d, k) => d && typeof d === 'object' && Object.keys(d).sort().join(',') === k;
export const FIRE_ACTIONS = Object.freeze(['fire.optin', 'fire.optout', 'fire.attend']);
export function canAttend(fs, ts, slot, joined = true) { const f = { ...freshFire(), ...(fs || {}) }, c = eventAt(slot), today = f.day === dayOf(ts) ? f.n : 0;
  return !!joined && f.opted && !!c && !c.quiet && ts >= c.start && ts <= c.end && !f.calls.includes(c.slot) && today < FIRE.callsPerDay && !(f.last && ts - f.last < FIRE.gapMs); }
// Validate one player-log entry against the fire state and return the next state (never mutates). Other entries pass.
export function fireStep(fs0, e, acct, { joined }) {
  const d = e.data || {}, bad = (k, m) => { throw new FirewallError(k, `entry ${e.seq}: ${m}`); };
  const wage = e.action === 'pm.wage' && d.why === 'fire shift';
  if (!FIRE_ACTIONS.includes(e.action) && !wage && e.action !== 'wallet.leave') return fs0 || freshFire();
  let f = { ...freshFire(), ...(fs0 || {}) }; f = { ...f, calls: [...f.calls], unpaid: { ...f.unpaid } };
  if (dayOf(e.ts) !== f.day) f = { ...f, day: dayOf(e.ts), n: 0 };
  const self = e.actor === acct && e.target === acct && e.value.amount === 0;
  switch (e.action) {
    case 'wallet.leave': f.opted = false; return f;
    case 'fire.optin': if (!self) bad('economy', 'you switch town events on for yourself'); if (!joined) bad('optin', 'join the side economy first'); if (e.data != null) bad('evidence', 'no data'); f.opted = true; return f;
    case 'fire.optout': if (!self) bad('economy', 'you switch town events off for yourself'); if (e.data != null) bad('evidence', 'no data'); f.opted = false; return f;
    case 'fire.attend': { const c = eventAt(d.call); // the player as a firefighter, answering a SEEDED incident
      if (e.actor !== acct || e.value.amount !== 0) bad('economy', 'you answer the call; it carries no amount (the wage is separate)');
      if (!joined || !f.opted) bad('optin', 'firefighter shifts are for players in the side economy with town events on');
      if (!INCIDENT_ACTORS.includes(e.target)) bad('collusion', 'an incident comes from the seeded timetable (a bin, a kite, a toaster, a cat), never from a player or a place you pick');
      if (!keys(d, 'call,kind,slips,spot') || !int(d.call, 0, 1e9) || !int(d.slips, 0, FIRE.maxSlips)) bad('evidence', 'a call-out names the slot, the incident, the spot and the slips');
      if (!c || c.quiet || c.kind !== d.kind || c.spot !== d.spot || c.actor !== e.target) bad('collusion', 'no such incident on the timetable: you cannot start your own fire');
      if (e.ts < c.start || e.ts > c.end) bad('evidence', 'that call is not open');
      if (f.calls.includes(c.slot)) bad('replay', 'that call is already answered');
      if (f.n >= FIRE.callsPerDay) bad('cap', `at most ${FIRE.callsPerDay} fire calls a day`);
      if (f.last && e.ts - f.last < FIRE.gapMs) bad('cooldown', 'one call a minute');
      f.calls = [...f.calls, c.slot].slice(-FIRE.keepCalls); f.n++; f.last = e.ts; f.unpaid[e.seq] = e.ts;
      f.unpaid = Object.fromEntries(Object.entries(f.unpaid).filter(([, t]) => e.ts - t <= FIRE.payWithinMs)); return f; }
    case 'pm.wage': { // a fire-shift wage: only for one of your own seeded call-outs, once, within 10 min
      if (!keys(d, 'for,why')) bad('evidence', 'a fire-shift wage names the call-out');
      const t = f.unpaid[d.for]; if (t == null) bad('collusion', 'a fire-shift wage is for a seeded call-out you answered (once)');
      if (e.ts - t > FIRE.payWithinMs) bad('cap', 'claim within 10 min'); delete f.unpaid[d.for]; return f; }
  }
  return f;
}
// The engine's drive (pure geometry + the wall clock, so every device sees the same thing): out of the bay along Market
// Row to the avenue, down it, then along Market Street, Pond Road or Kibble Row. Scenery only: the engine is never solid and blocks nothing.
export const ROLL = Object.freeze({ bay: Object.freeze([59.7, 6.55]), rollSec: 4, speed: 5, walkSec: 1.5, workSec: 30, bigWorkSec: 45, holdSec: 140, afterSec: 20 });
// helpers stand beside the work spot: below it, except on the Pond Road kerb (row 34), where the hedges start a row down
export const sideOf = (c) => (c.road === 32 ? -1 : 1);
export function routeOf(c) { const [bx, by] = ROLL.bay, lane = c.road === 43 ? 42.9 : c.road === 32 ? 32.1 : 21.1;
  return [[bx, by], [32.2, by], [32.2, lane], [c.park[0], lane], [c.park[0], c.park[1]]]; }
export const pathLen = (pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
// mine = { slot, doneAt } when this device's player is answering that call: the sim crew stand by until it is done
export function timeline(c, mine = null) { if (!c || c.quiet) return null; const route = routeOf(c), L = pathLen(route), drive = (L / ROLL.speed) * 1000;
  const roll = c.start + ROLL.rollSec * 1000, arrive = roll + drive, out = arrive + ROLL.walkSec * 1000, held = mine && mine.slot === c.slot;
  const work = held ? (mine.doneAt ? Math.max(out, mine.doneAt) : c.start + ROLL.holdSec * 1000) : out + (c.big ? ROLL.bigWorkSec : ROLL.workSec) * 1000;
  const back = work + ROLL.walkSec * 1000, home = back + drive; return { route, L, roll, arrive, out, done: work, back, home, held: !!held }; }

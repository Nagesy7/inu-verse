// Phase 5: the Pawsley Pup Clinic. Pure rules shared by the player's wallet (pawbook.js), the sim engine and the server
// anchor (anchor.js), so the server re-checks every injury, treatment, co-pay and medic wage a client posts.
//  - Cartoon bumps only (a stubbed paw, a bee sting, sunburn, a tummy ache after the café). Nothing graphic.
//  - Players: only after joining the side economy AND switching cartoon bumps on (med.optin). An effect is cosmetic or a
//    small walking slowdown, never longer than 60 s, at most 3 a day, 5 min apart; walk it off, opt out, or get free
//    treatment at any time. Nobody is ever blocked from playing: nothing here stops input, doors, chat or other games.
//  - Treatment is free. A 2 PM co-pay is optional (chip in or waive it; waiving changes nothing).
//  - Medic shifts pay a normal sim wage (pm.wage: the SAME daily cap, cooldown and diminishing returns as every sim job)
//    only for treating a SIM pup from the seeded call schedule. Patients are never players, so nobody can hurt
//    themselves (or a friend) and treat it for pay; your own bumps pay nothing.
//  - Calls are a fixed schedule hashed from the clock (no dice, no stakes); outcomes never read looks, outfits or
//    $KIBBLE items, and nothing here touches Bones, $KIBBLE, prizes, scores or other games.
import { FirewallError } from './firewall.js';
import { sha256 } from './sha256.js';
import { PARK, CLINIC, CAFE_DOOR } from './place.js';
import { DAY_MS } from './economy.js';
import { SINK } from './pawmarks.js';
export const MED = Object.freeze({ maxSec: 60, injuriesPerDay: 3, injuryGapMs: 5 * 60e3, copay: 2, treatsPerDay: 6, treatGapMs: 60e3, callMs: 120e3, graceMs: 60e3,
  payWithinMs: 10 * 60e3, cafeTiles: 10, walkOffTiles: 12, keepCalls: 40, doctor: 'sim:md-doctor', maxSlips: 2 });
export const AILMENTS = Object.freeze({
  paw: Object.freeze({ label: 'Stubbed paw', cause: 'sim:hz-curb', sec: 30, slow: 0.85, how: 'ran into a wall', icon: 'bandage',
    steps: Object.freeze(['Check the paw', 'Hold a cool pack on it', 'Wrap a soft bandage']) }),
  sting: Object.freeze({ label: 'Bee sting', cause: 'sim:hz-bee', sec: 40, slow: 1, how: 'sniffed the flowers in the park while the bees were busy', icon: 'bee',
    steps: Object.freeze(['Gently scrape the sting out', 'Cold compress', 'Dab on soothing cream']) }),
  sunburn: Object.freeze({ label: 'Sunburn', cause: 'sim:hz-sun', sec: 45, slow: 1, how: 'dozed off in the sun', icon: 'sun',
    steps: Object.freeze(['Move into the shade', 'Cool aloe gel', 'A bowl of water']) }),
  tummy: Object.freeze({ label: 'Tummy ache', cause: 'sim:hz-cafe', sec: 30, slow: 0.9, how: 'had one pup-cake too many at the café', icon: 'swirl',
    steps: Object.freeze(['Sit down for a moment', 'Warm chamomile', 'One plain biscuit']) }),
});
export const AIL_KEYS = Object.freeze(Object.keys(AILMENTS));
export const HAZARDS = Object.freeze(AIL_KEYS.map((k) => AILMENTS[k].cause));
export const HEALS = Object.freeze(['walked it off', 'time up', 'opted out']); // + 'treated' via med.care (the doctor)
// the clinic staff and the sim pups who call for help (original names; sim pups only, never players)
export const STAFF = Object.freeze([
  { id: 'sim:md-doctor', name: 'Dr. Clementine Pawsley', role: 'doctor', title: 'Clinic Doctor', coat: 'cream', outfit: { bottom: 'slacks_navy', feet: 'loafers' }, post: [61.4, 49.55],
    line: 'Bumps happen. Treatment is always free here.' },
  { id: 'sim:md-rowan', name: 'Medic Rowan Dewclaw', role: 'medic', title: 'Paramedic', coat: 'red', outfit: { bottom: 'chinos', feet: 'sneakers_red' }, post: [57.3, 49.55],
    line: 'Cool pack first, questions later.' },
  { id: 'sim:md-fig', name: 'Medic Fig Brightwhisker', role: 'medic', title: 'Paramedic', coat: 'gray', outfit: { bottom: 'chinos', feet: 'sneakers_red' }, post: [56.3, 49.4],
    line: 'Steady paws. One step at a time.' },
]);
export const STAFF_IDS = Object.freeze(STAFF.map((s) => s.id));
export const PATIENTS = Object.freeze([
  { id: 'sim:pt-crumpet', name: 'Crumpet', coat: 'tan' }, { id: 'sim:pt-noodle', name: 'Noodle', coat: 'cream' }, { id: 'sim:pt-pepper', name: 'Pepper', coat: 'dark' },
  { id: 'sim:pt-waffles', name: 'Waffles', coat: 'golden' }, { id: 'sim:pt-pudding', name: 'Pudding', coat: 'red' }, { id: 'sim:pt-marzipan', name: 'Marzipan', coat: 'gray' },
].map((p) => Object.freeze(p)));
export const PATIENT_IDS = Object.freeze(PATIENTS.map((p) => p.id));
// where sim pups call from: the plaza and pavement west of the clinic (tile centres, all walkable)
export const CALL_SPOTS = Object.freeze([[41.6, 47.4], [43.4, 48.1], [45.0, 46.9], [46.8, 46.3], [48.2, 47.0], [53.4, 46.0], [54.8, 46.7], [44.2, 47.7]].map((s) => Object.freeze(s)));
const word = (s, i = 0) => parseInt(sha256(s).slice(i * 8, i * 8 + 8), 16);
// The call schedule: one sim pup per 2-minute slot, hashed from the slot number (the same for every device and the server).
export function callAt(slot) { const n = Math.floor(Number(slot)); if (!Number.isFinite(n) || n < 0) return null; const s = 'pawsley-call|' + n;
  const pt = PATIENTS[word(s, 0) % PATIENTS.length], ail = AIL_KEYS[word(s, 1) % AIL_KEYS.length], at = CALL_SPOTS[word(s, 2) % CALL_SPOTS.length];
  return { slot: n, pt: pt.id, name: pt.name, coat: pt.coat, ail, x: at[0], y: at[1], start: n * MED.callMs, end: n * MED.callMs + MED.callMs + MED.graceMs }; }
export const slotAt = (ms) => Math.floor(ms / MED.callMs);
// the order the treatment steps are offered in (hashed, so it's the same everywhere; the right order is AILMENTS[ail].steps)
export function stepOrder(slot, ail) { const st = AILMENTS[ail]?.steps || [], idx = st.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = word(`pawsley-steps|${slot}|${ail}|${i}`) % (i + 1); [idx[i], idx[j]] = [idx[j], idx[i]]; } return idx; }
// the mini-task, graded: taps = indexes into AILMENTS[ail].steps in the order tapped. Only the taps are read.
export function grade({ ail, taps }) { const st = AILMENTS[ail]?.steps; if (!st || !Array.isArray(taps)) return { done: false, slips: 0, next: 0 };
  let next = 0, slips = 0; for (const t of taps) { if (t === next) next++; else slips++; if (next === st.length) break; }
  return { done: next === st.length && slips <= MED.maxSlips, slips, next, failed: slips > MED.maxSlips }; }
// bees are about in the park every other 10 minutes (hashed); the only "random-looking" thing here and it's a fixed timetable
export const beesAbout = (ms) => word('pawsley-bees|' + Math.floor(ms / 600e3)) % 2 === 0;
const inPark = (tx, ty) => tx >= PARK.x && tx < PARK.x + PARK.w && ty >= PARK.y && ty < PARK.y + PARK.h;
export const nearCafe = (tx, ty) => Math.hypot(tx + 0.5 - (CAFE_DOOR.tx + 0.5), ty + 0.5 - (CAFE_DOOR.ty + 0.5)) <= MED.cafeTiles;
export function placeFits(ail, tx, ty) { if (ail === 'sting') return inPark(tx, ty); if (ail === 'tummy') return nearCafe(tx, ty); return !!AILMENTS[ail]; }
export const freshMed = () => ({ opted: false, day: -1, injuries: 0, lastInj: 0, hurt: null, treats: 0, lastTreat: 0, calls: [], unpaid: {}, cares: {} });
export const hurtNow = (md, now) => !!(md?.hurt && now < md.hurt.ts + md.hurt.sec * 1000);
// What an injury does to walking right now (1 = nothing). Capped: never slower than x0.85, never past 60 s.
export const slowFactor = (md, now) => (hurtNow(md, now) ? Math.max(0.85, AILMENTS[md.hurt.ail]?.slow ?? 1) : 1);
const dayOf = (ts) => Math.floor(ts / DAY_MS), int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const keys = (d, k) => d && typeof d === 'object' && Object.keys(d).sort().join(',') === k;
export const MED_ACTIONS = Object.freeze(['med.optin', 'med.optout', 'med.injury', 'med.heal', 'med.care', 'med.treat', 'pm.copay']);
// can a bump happen to this player now? (opted in, not already hurt, daily cap, 5 min gap)
export function canInjure(md, ts, joined = true) { const m = { ...freshMed(), ...(md || {}) }; if (!joined || !m.opted || hurtNow(m, ts)) return false;
  const today = m.day === dayOf(ts) ? m.injuries : 0; return today < MED.injuriesPerDay && !(m.lastInj && ts - m.lastInj < MED.injuryGapMs); }
export function canTreat(md, ts, slot) { const m = { ...freshMed(), ...(md || {}) }, today = m.day === dayOf(ts) ? m.treats : 0, c = callAt(slot);
  return !!c && ts >= c.start && ts <= c.end && !m.calls.includes(c.slot) && today < MED.treatsPerDay && !(m.lastTreat && ts - m.lastTreat < MED.treatGapMs); }
// Validate one player-log entry against the medical state and return the next state (never mutates). Non-medical entries pass.
export function medStep(md0, e, acct, { joined }) {
  const d = e.data || {}, bad = (k, m) => { throw new FirewallError(k, `entry ${e.seq}: ${m}`); };
  const wage = e.action === 'pm.wage' && d.why === 'medic shift';
  if (!MED_ACTIONS.includes(e.action) && !wage && e.action !== 'wallet.leave') return md0 || freshMed();
  let md = { ...freshMed(), ...(md0 || {}) }; md = { ...md, calls: [...md.calls], unpaid: { ...md.unpaid }, cares: { ...md.cares } };
  if (dayOf(e.ts) !== md.day) md = { ...md, day: dayOf(e.ts), injuries: 0, treats: 0 };
  const self = e.actor === acct && e.target === acct && e.value.amount === 0;
  switch (e.action) {
    case 'wallet.leave': md.opted = false; md.hurt = null; return md; // leaving the side economy ends everything at once
    case 'med.optin': if (!self) bad('economy', 'you switch cartoon bumps on for yourself'); if (!joined) bad('optin', 'join the side economy first'); if (e.data != null) bad('evidence', 'no data'); md.opted = true; return md;
    case 'med.optout': if (!self) bad('economy', 'you switch cartoon bumps off for yourself'); if (e.data != null) bad('evidence', 'no data'); md.opted = false; md.hurt = null; return md;
    case 'med.injury': { const a = AILMENTS[d.ail];
      if (e.target !== acct || e.actor === acct || !HAZARDS.includes(e.actor)) bad('collusion', 'a bump comes from a sim hazard (a curb, a bee, the sun, the café), never from a player');
      if (!joined || !md.opted) bad('optin', 'cartoon bumps only happen to players who switched them on');
      if (e.value.amount !== 0) bad('economy', 'a bump carries no amount');
      if (!a || e.actor !== a.cause) bad('evidence', 'unknown bump or the wrong cause');
      if (!keys(d, 'ail,sec,tx,ty') || !int(d.tx, 0, 999) || !int(d.ty, 0, 999)) bad('evidence', 'a bump records the ailment, the tile and how long');
      if (d.sec !== a.sec || d.sec > MED.maxSec) bad('harm', `${a.label} lasts ${a.sec} s (never over ${MED.maxSec} s)`);
      if (!placeFits(d.ail, d.tx, d.ty)) bad('evidence', `${a.label} can't happen there`);
      if (hurtNow(md, e.ts)) bad('harm', 'one bump at a time');
      if (md.injuries >= MED.injuriesPerDay) bad('cap', `at most ${MED.injuriesPerDay} bumps a day`);
      if (md.lastInj && e.ts - md.lastInj < MED.injuryGapMs) bad('cooldown', `bumps are at least ${MED.injuryGapMs / 60e3} min apart`);
      md.hurt = { seq: e.seq, ts: e.ts, ail: d.ail, sec: d.sec }; md.injuries++; md.lastInj = e.ts; return md; }
    case 'med.heal': if (!self) bad('economy', 'you walk it off yourself'); if (!md.hurt) bad('harm', 'nothing to heal');
      if (!keys(d, 'for,how') || d.for !== md.hurt.seq || !HEALS.includes(d.how)) bad('evidence', 'a heal names the bump and how');
      if (d.how === 'time up' && hurtNow(md, e.ts)) bad('harm', 'not over yet'); md.hurt = null; return md;
    case 'med.care': // free treatment by the clinic doctor; ends the bump. The co-pay is a separate, optional entry.
      if (e.actor !== MED.doctor || e.target !== acct) bad('collusion', 'treatment is given by the clinic doctor to the patient');
      if (e.value.amount !== 0) bad('economy', 'treatment is free'); if (!md.hurt) bad('harm', 'nothing to treat');
      if (!keys(d, 'for') || d.for !== md.hurt.seq) bad('evidence', 'treatment names the bump');
      md.cares = Object.fromEntries(Object.entries({ ...md.cares, [e.seq]: { ts: e.ts, paid: 0 } }).filter(([, c]) => e.ts - c.ts < DAY_MS).slice(-12)); md.hurt = null; return md;
    case 'pm.copay': { const c = md.cares[d.for]; // optional; destroyed like a fee (never paid to anyone)
      if (e.actor !== acct || e.target !== SINK) bad('economy', 'a co-pay goes from you to the sink');
      if (!keys(d, 'for') || !c) bad('economy', 'a co-pay is for one of your treatments');
      if (c.paid) bad('replay', 'that treatment is already chipped in for'); if (e.value.amount !== MED.copay) bad('cap', `the co-pay is ${MED.copay}`);
      if (e.ts - c.ts > MED.payWithinMs) bad('cap', 'chip in within 10 min of the treatment'); md.cares[d.for] = { ...c, paid: e.value.amount }; return md; }
    case 'med.treat': { const c = callAt(d.call); // the player as a medic, treating a SIM pup who called the clinic
      if (e.actor !== acct || e.value.amount !== 0) bad('economy', 'you treat; it carries no amount (the wage is separate)');
      if (!joined) bad('optin', 'medic shifts are for players in the side economy');
      if (!PATIENT_IDS.includes(e.target) || e.target === acct) bad('collusion', "patients are sim pups from the clinic's call list: you can't treat yourself or another player for pay");
      if (!keys(d, 'ail,call,slips') || !int(d.call, 0, 1e9) || !int(d.slips, 0, MED.maxSlips)) bad('evidence', 'a treatment names the call, the ailment and the slips');
      if (!c || c.pt !== e.target || c.ail !== d.ail) bad('evidence', "that pup didn't call with that (the call list is fixed)");
      if (e.ts < c.start || e.ts > c.end) bad('evidence', 'that call is not open');
      if (md.calls.includes(c.slot)) bad('replay', 'that call is already treated');
      if (md.treats >= MED.treatsPerDay) bad('cap', `at most ${MED.treatsPerDay} medic calls a day`);
      if (md.lastTreat && e.ts - md.lastTreat < MED.treatGapMs) bad('cooldown', 'one call a minute');
      md.calls = [...md.calls, c.slot].slice(-MED.keepCalls); md.treats++; md.lastTreat = e.ts; md.unpaid[e.seq] = e.ts;
      md.unpaid = Object.fromEntries(Object.entries(md.unpaid).filter(([, t]) => e.ts - t <= MED.payWithinMs)); return md; }
    case 'pm.wage': { // a medic-shift wage: only for one of your own sim-pup treatments, once, within 10 min
      if (!keys(d, 'for,why')) bad('evidence', 'a medic wage names the treatment');
      const t = md.unpaid[d.for]; if (t == null) bad('collusion', 'a medic wage is for a treatment of a sim pup you did (not for your own bumps)');
      if (e.ts - t > MED.payWithinMs) bad('cap', 'claim within 10 min'); delete md.unpaid[d.for]; return md; }
  }
  return md;
}

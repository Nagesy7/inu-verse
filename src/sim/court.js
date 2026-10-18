// Phase 4: the Barkley Courthouse. Pure rules shared by the player's wallet (pawbook.js), the sim engine and the server
// anchor (anchor.js), so the server re-decides every verdict and refund a client posts.
//  - The court READS the anchored evidence file (police.js keeps each citation/detention entry exactly as hashed). It never
//    edits an entry: a verdict is a new log entry, and the file only gains verdict/refund fields beside the untouched entry.
//  - Evidence review, not chance: the facts come from the entry itself (offence, tile, time, officer) and the wall-clock
//    patrol schedule (force.js). Nothing here rolls a number, and nothing can be staked on a trial (no fees, no spectators).
//  - Outcomes: dismissed (whatever was paid for it comes back, exactly once) or upheld (nothing changes). A wrong defence
//    is simply upheld. Walking out, or the 90 s cap, leaves the original outcome as it was and logs nothing.
//  - Only the record's own player can contest it, only after opting in, at most 3 verdicts a day. A citation the patrol log
//    can't back up (a modified client citing itself) is inadmissible, so nobody can farm refunds; refunds never exceed
//    what was paid, so no pair of wallets or self-made records can gain a single Pawmark.
//  - Never reads looks, outfits or $KIBBLE items; never touches Bones, $KIBBLE, prizes, scores or other games.
import { FirewallError } from './firewall.js';
import { POLICE, OFFENSES, isCrossing, freshPolice } from './police.js';
import { officerById, officerPose } from './force.js';
import { STREETS, PARK } from './place.js';
import { hashOf } from './ledger.js';
import { ISSUER } from './pawmarks.js';
import { DAY_MS } from './economy.js';
export const COURT = Object.freeze({ trialSec: 90, verdictsPerDay: 3, windowMs: DAY_MS, clearViewTiles: 4, slackTiles: 1, judge: 'sim:ct-judge' });
export const BENCH = Object.freeze([
  { id: 'sim:ct-judge', name: 'Judge Rosalind Barkwell', role: 'judge', title: 'Presiding Judge', coat: 'cream', outfit: { bottom: 'slacks_navy', feet: 'loafers' }, post: [42.25, 72.0],
    line: 'This court reads the record. It never rewrites it.' },
  { id: 'sim:ct-clerk', name: 'Clerk Tobias Inkpaw', role: 'clerk', title: 'Clerk of the Court', coat: 'tan', outfit: { bottom: 'chinos', feet: 'loafers' }, post: [45.6, 71.7],
    line: 'Every exhibit comes straight from the anchored log. Hashes and all.' },
  { id: 'sim:ct-defence', name: 'Maple Quillfeather', role: 'defence', title: 'Duty Defender', coat: 'red', outfit: { bottom: 'slacks_navy', feet: 'sneakers_red' }, post: [46.6, 72.6],
    line: 'Read the scene carefully. Pick the one argument the evidence backs.' },
]);
export const BENCH_IDS = Object.freeze(BENCH.map((b) => b.id));
export const GROUNDS = Object.freeze({
  sightline: Object.freeze({ label: `The officer was too far away to see clearly (more than ${COURT.clearViewTiles} tiles)`, short: 'too far to see', kinds: ['cite', 'detain'] }),
  crossing: Object.freeze({ label: 'I was one step from the zebra stripes', short: 'one step from the crossing', kinds: ['cite', 'detain'], offense: 'jaywalk' }),
  priors: Object.freeze({ label: `The citations behind this detention don't stand (fewer than ${POLICE.priorCites})`, short: 'priors dismissed', kinds: ['detain'] }),
});
export const groundFits = (g, rec) => !!GROUNDS[g] && GROUNDS[g].kinds.includes(rec?.k) && (!GROUNDS[g].offense || GROUNDS[g].offense === rec?.e?.data?.offense);
export const groundsFor = (rec) => Object.keys(GROUNDS).filter((g) => groundFits(g, rec));
const roadish = (tx, ty) => STREETS.roads.some((r) => ty >= r && ty < r + 3) || (tx >= STREETS.avenue && tx < STREETS.avenue + 3 && ty <= STREETS.lastAvenueRow);
const inPark = (tx, ty) => tx >= PARK.x && tx < PARK.x + PARK.w && ty >= PARK.y && ty < PARK.y + PARK.h;
// The facts of a filed record. Inputs: the filed entry (+ its file, for priors). Nothing about the player is read.
export function facts(rec, file = {}) {
  const e = rec?.e, d = e?.data || {}, o = officerById(e?.actor), off = OFFENSES[d.offense];
  const at = o ? officerPose(o, e.ts / 1000) : null, ox = at ? at.x / 32 : NaN, oy = at ? at.y / 32 : NaN;
  const dist = at ? Math.hypot(ox - (d.tx + 0.5), oy - (d.ty + 0.5)) : Infinity;
  const ground = d.offense === 'jaywalk' ? roadish(d.tx, d.ty) && !isCrossing(d.tx, d.ty) : d.offense === 'flowers' ? inPark(d.tx, d.ty) : false;
  let nearCrossing = false; if (d.offense === 'jaywalk') for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && isCrossing(d.tx + dx, d.ty + dy)) nearCrossing = true;
  const priors = rec?.k === 'detain' ? (rec.priors || []) : [], standing = priors.filter((s) => file[s]?.verdict !== 'dismissed').length;
  const hashOk = !!e && hashOf(e) === e.hash, sameForce = !!(o && off && o.force === off.force);
  const admissible = hashOk && sameForce && ground && dist <= POLICE.seeTiles + COURT.slackTiles && (rec.k !== 'detain' || priors.length >= POLICE.priorCites);
  return { admissible, hashOk, sameForce, onOffenceTile: ground, officer: o ? { id: o.id, name: o.name, x: ox, y: oy } : null, dist: Math.round(dist * 10) / 10, nearCrossing, priors, standingPriors: standing,
    holds: { sightline: dist > COURT.clearViewTiles, crossing: nearCrossing, priors: rec?.k === 'detain' && standing < POLICE.priorCites } };
}
// The ruling. Destructures only the record, the ground and the file: whatever else is passed (a look, $KIBBLE items,
// Bones, a score) is never read (check 9 passes a dressed-up player here and expects identical verdicts).
export function hear({ record, ground, file = {} }) { const f = facts(record, file);
  if (!f.admissible) return { outcome: 'inadmissible', facts: f }; return { outcome: groundFits(ground, record) && f.holds[ground] ? 'dismissed' : 'upheld', facts: f }; }
const dayOf = (ts) => Math.floor(ts / DAY_MS), int = (v) => Number.isInteger(v) && v >= 0;
const VERDICT_KEYS = 'for,ground,opened,outcome';
// Validate one court entry (court.verdict / pm.refund) against the police state and return the next state (never mutates).
export function courtStep(ps0, e, acct, { joined }) {
  const ps = { ...freshPolice(), ...(ps0 || {}) }; ps.file = { ...(ps.file || {}) }; ps.owed = { ...(ps.owed || {}) }; ps.recent = [...(ps.recent || [])];
  ps.court = ps.court && ps.court.day === dayOf(e.ts) ? { ...ps.court } : { day: dayOf(e.ts), verdicts: 0 };
  const bad = (k, m) => { throw new FirewallError(k, `entry ${e.seq}: ${m}`); }, d = e.data || {};
  if (e.action === 'court.verdict') {
    if (e.actor !== COURT.judge) bad('collusion', 'only the sim judge gives verdicts (nobody rules on their own case)');
    if (e.target !== acct) bad('collusion', 'a verdict is on your own record only');
    if (!joined) bad('optin', 'the court only hears players who opted in');
    if (e.value.amount !== 0) bad('economy', 'a verdict carries no amount (refunds are separate entries)');
    if (Object.keys(d).sort().join(',') !== VERDICT_KEYS) bad('evidence', 'a verdict carries only for, ground, outcome and opened (it cannot add to or change the evidence)');
    const rec = ps.file[d.for]; if (!rec) bad('evidence', 'no such record on file (records can be contested for a day)');
    if (rec.verdict) bad('replay', 'that record was already tried');
    if (e.ts - rec.e.ts > COURT.windowMs) bad('evidence', 'records can be contested for a day');
    if (!int(d.opened) || d.opened < rec.e.ts || e.ts < d.opened || e.ts - d.opened > COURT.trialSec * 1000) bad('harm', `trials are capped at ${COURT.trialSec} s`);
    if (ps.court.verdicts >= COURT.verdictsPerDay) bad('cap', `at most ${COURT.verdictsPerDay} verdicts a day`);
    if (!groundFits(d.ground, rec)) bad('evidence', 'that defence does not apply to this record');
    const h = hear({ record: rec, ground: d.ground, file: ps.file });
    if (h.outcome === 'inadmissible') bad('collusion', "inadmissible: the patrol log can't back this record up (a self-made citation can't be contested)");
    if (d.outcome !== h.outcome) bad('evidence', `the court finds this ${h.outcome}, not ${d.outcome}`);
    ps.file[d.for] = { ...rec, verdict: h.outcome, ground: d.ground, vseq: e.seq, refunded: false }; ps.court.verdicts++;
    if (h.outcome === 'dismissed') { delete ps.owed[d.for];
      if (rec.k === 'cite') { const i = ps.recent.indexOf(rec.e.ts); if (i >= 0) ps.recent.splice(i, 1); }
      if (rec.k === 'detain' && ps.held?.seq === rec.e.seq) ps.held = null; }
    return ps; }
  if (e.action === 'pm.refund') {
    if (e.actor !== ISSUER || e.target !== acct) bad('economy', 'refunds come from the sim to the record\'s own player');
    const rec = ps.file[d.for]; if (!rec || rec.verdict !== 'dismissed' || rec.refunded) bad('economy', 'a refund is for a dismissed record, once');
    if (!rec.paid || e.value.amount !== rec.paid) bad('cap', `a refund is exactly what was paid (${rec.paid})`);
    if (Object.keys(d).join(',') !== 'for') bad('evidence', 'a refund names only the record');
    ps.file[d.for] = { ...rec, refunded: true }; return ps; }
  return ps0 || freshPolice();
}
// A trial in the courthouse (client side): opt-in, time-capped, walk out any time (nothing is logged, the record stands).
export function createTrial({ wallet, seq, now = () => Date.now() }) {
  const opened = Math.round(now()); let state = 'open', result = null;
  const T = { seq: Number(seq), opened, get state() { return T.leftMs() <= 0 && state === 'open' ? 'timed out' : state; }, get result() { return result; },
    leftMs: () => Math.max(0, opened + COURT.trialSec * 1000 - now()),
    walkOut() { if (state === 'open') state = 'walked out'; return state; },
    present(ground) { if (T.state !== 'open') throw new FirewallError('harm', `this trial is over (${T.state}): the record stands as it was`);
      result = wallet.contest(seq, ground, opened); state = 'decided'; return result; } };
  return T;
}

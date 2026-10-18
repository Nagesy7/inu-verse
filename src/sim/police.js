// Phase 3 rules for police + park rangers, pure and shared by the player's wallet (pawbook.js), the sim engine and the
// server anchor (anchor.js), so the server re-checks every citation, detention, fine, bail and release a client posts.
// Real players: only after opting in (joined), detentions <= 60 s, and always a way out (bail, walk it off, opt out,
// leave the scene). Nothing here moves the player, blocks the main game, or touches Bones, $KIBBLE or other games.
import { FirewallError } from './firewall.js';
import { OFFICER_IDS, officerById } from './force.js';
import { STREETS } from './place.js';
import { DAY_MS, FLOWS } from './economy.js';
export const POLICE = Object.freeze({ seeTiles: 5, dwellMs: Object.freeze({ jaywalk: 2000, flowers: 1200 }), cooldownMs: 60e3, citesPerDay: 4, detainsPerDay: 2,
  detainSec: 45, maxDetainSec: 60, minDetainSec: 10, priorCites: 3, repeatWindowMs: 10 * 60e3, fine: 5, bail: 10, leaveSceneTiles: 8, maxDataLen: 200, fileKeepMs: DAY_MS, fileMax: 12 });
export const OFFENSES = Object.freeze({ jaywalk: Object.freeze({ force: 'police', label: 'Jaywalking (cross at the zebra stripes)', short: 'jaywalking' }), flowers: Object.freeze({ force: 'rangers', label: 'Trampling the flowerbeds', short: 'trampling the flowers' }) });
export const RELEASES = Object.freeze(['walked it off', 'opted out', 'left the scene', 'time cap']); // + 'bail paid' via pm.bail
export const freshPolice = () => ({ day: -1, cites: 0, detains: 0, lastTs: 0, recent: [], owed: {}, held: null, file: {}, court: { day: -1, verdicts: 0 } });
// Phase 4: the evidence file. Every citation/detention entry is copied, exactly as hashed and anchored, into the checkpoint
// (last day, at most 12) so the court can read it. Nothing ever edits a filed entry; verdicts and refunds only add fields
// beside it (court.js). paid = the fine/bail actually paid for it.
const fileEntry = (e) => JSON.parse(JSON.stringify({ seq: e.seq, ts: e.ts, actor: e.actor, group: e.group, action: e.action, target: e.target, value: e.value, data: e.data, prev: e.prev, hash: e.hash }));
function fileIt(file, e, extra) { const out = { ...file, [e.seq]: { k: e.action === 'police.detain' ? 'detain' : 'cite', e: fileEntry(e), paid: 0, verdict: null, ...extra } };
  const keep = Object.values(out).filter((r) => e.ts - r.e.ts < POLICE.fileKeepMs).sort((a, b) => b.e.seq - a.e.seq).slice(0, POLICE.fileMax); return Object.fromEntries(keep.map((r) => [r.e.seq, r])); }
const paidFor = (file, seq, amt) => (file[seq] ? { ...file, [seq]: { ...file[seq], paid: file[seq].paid + amt } } : file);
if (POLICE.maxDetainSec > 60 || POLICE.detainSec > POLICE.maxDetainSec || POLICE.bail > FLOWS.bail.max || POLICE.fine > FLOWS.fine.max) throw new Error('police limits out of bounds');

// zebra crossings (tiles.js draws them): the street columns either side of the avenue, and the avenue rows either side of each street
export function isCrossing(tx, ty) { const { roads, avenue } = STREETS, street = roads.find((r) => ty >= r && ty < r + 3);
  if (street != null && (tx === avenue - 2 || tx === avenue + 4)) return true;
  return tx >= avenue && tx < avenue + 3 && roads.some((r) => ty === r - 1 || ty === r + 3); }
// The ONLY inputs to a police outcome: where the pup stands, how long, and who is watching. A player's look, outfit,
// $KIBBLE items, Bones or score are never read (Check 9): observe() copies x/y and nothing else.
export const observe = (player) => ({ x: Number(player?.x) || 0, y: Number(player?.y) || 0 });
export function offenseAt(tile, tx, ty, T) { if (tile === T.ROAD && !isCrossing(tx, ty)) return 'jaywalk'; if (tile === T.FLOWER) return 'flowers'; return null; }
// pure decision: given a dwell on an offence tile and the officers' positions, who (if anyone) cites
export function decide({ offense, dwellMs, at, officers }) {
  if (!offense || !(dwellMs >= POLICE.dwellMs[offense])) return null; const force = OFFENSES[offense].force; let best = null, bd = POLICE.seeTiles;
  for (const o of officers) { if (o.force !== force) continue; const d = Math.hypot(o.x - at.x, o.y - at.y); if (d <= bd) { bd = d; best = o.id; } }
  return best ? { offense, by: best } : null; }

const dayOf = (ts) => Math.floor(ts / DAY_MS);
const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
// Validate one player-log entry that touches policing and return the next police state (never mutates). balance = before e.
export function policeStep(ps0, e, acct, { joined, balance }) {
  let ps = { ...freshPolice(), ...(ps0 || {}) }; ps = { ...ps, owed: { ...ps.owed }, recent: [...ps.recent], file: { ...(ps.file || {}) } };
  if (dayOf(e.ts) !== ps.day) ps = { ...ps, day: dayOf(e.ts), cites: 0, detains: 0 };
  ps.recent = ps.recent.filter((t) => e.ts - t < POLICE.repeatWindowMs);
  const heldLive = ps.held && e.ts < ps.held.ts + ps.held.sec * 1000; const bad = (k, m) => { throw new FirewallError(k, `entry ${e.seq}: ${m}`); };
  switch (e.action) {
    case 'police.cite': case 'police.detain': {
      if (!OFFICER_IDS.includes(e.actor)) bad('collusion', 'only sim officers cite or detain (nobody cites themselves)');
      if (e.target !== acct || e.actor === acct) bad('collusion', 'citations name the player who was seen, by someone else');
      if (!joined) bad('optin', 'real players are only policed after opting in');
      if (e.value.amount !== 0) bad('economy', 'citations and detentions carry no amount (fines are separate entries)');
      const d = e.data || {}, off = OFFENSES[d.offense]; if (!off || officerById(e.actor).force !== off.force) bad('evidence', 'unknown offence or wrong force');
      if (!int(d.tx, 0, 999) || !int(d.ty, 0, 999)) bad('evidence', 'evidence needs the tile');
      if (e.action === 'police.cite') {
        if (ps.cites >= POLICE.citesPerDay) bad('cap', `at most ${POLICE.citesPerDay} citations a day`);
        if (ps.lastTs && e.ts - ps.lastTs < POLICE.cooldownMs) bad('cooldown', 'citation cooldown');
        const fine = fineFor(ps, e.ts, balance); if (d.fine !== fine) bad('cap', `fine must be ${fine} (first of the day is a warning)`);
        if (fine) ps.owed[e.seq] = fine; ps.cites++; ps.lastTs = e.ts; ps.recent.push(e.ts); ps.file = fileIt(ps.file, e); return ps; }
      if (heldLive) bad('harm', 'already detained');
      if (ps.detains >= POLICE.detainsPerDay) bad('cap', `at most ${POLICE.detainsPerDay} detentions a day`);
      if (ps.recent.length < POLICE.priorCites) bad('harm', `detention only after ${POLICE.priorCites} citations within ${POLICE.repeatWindowMs / 60e3} min`);
      if (!int(d.sec, POLICE.minDetainSec, POLICE.maxDetainSec)) bad('harm', `detentions are ${POLICE.minDetainSec}..${POLICE.maxDetainSec} s`);
      ps.held = { seq: e.seq, ts: e.ts, sec: d.sec, by: e.actor }; ps.detains++;
      const priors = Object.values(ps.file).filter((r) => r.k === 'cite' && e.ts - r.e.ts < POLICE.repeatWindowMs && r.verdict !== 'dismissed').map((r) => r.e.seq).sort((a, b) => a - b);
      ps.file = fileIt(ps.file, e, { priors }); return ps; }
    case 'police.release': {
      if (e.actor !== acct || e.target !== acct || e.value.amount !== 0) bad('economy', 'the player releases themselves');
      if (!ps.held) bad('harm', 'not detained'); if (!RELEASES.includes(e.data?.reason)) bad('harm', 'unknown release reason');
      ps.held = null; return ps; }
    case 'pm.fine': {
      const f = e.data?.for; if (!(String(f) in ps.owed)) bad('economy', 'a fine pays one of your unpaid citations');
      if (e.value.amount !== ps.owed[f]) bad('cap', `that citation is ${ps.owed[f]}`); ps.file = paidFor(ps.file, f, e.value.amount); delete ps.owed[f]; return ps; }
    case 'pm.bail': {
      if (!heldLive || e.data?.for !== ps.held.seq) bad('economy', 'bail is for your current detention');
      if (e.value.amount !== POLICE.bail) bad('cap', `bail is ${POLICE.bail}`); ps.file = paidFor(ps.file, ps.held.seq, e.value.amount); ps.held = null; return ps; }
    case 'wallet.leave': ps.held = null; ps.owed = {}; return ps; // opting out ends everything at once
    default: return ps0 || freshPolice();
  }
}
export const heldNow = (ps, now) => !!(ps?.held && now < ps.held.ts + ps.held.sec * 1000);
// what the next citation's fine is (first of the day, or no balance to pay it from: a warning)
export function fineFor(ps, ts, balance) { const today = ps && ps.day === dayOf(ts) ? ps.cites : 0; return today === 0 || balance < POLICE.fine ? 0 : POLICE.fine; }
// can an officer act on this player right now? (cooldown + daily caps; detention also needs repeat citations)
export function canPolice(ps, ts, kind = 'cite') { const p = { ...freshPolice(), ...(ps || {}) }, sameDay = p.day === dayOf(ts), recent = p.recent.filter((t) => ts - t < POLICE.repeatWindowMs).length;
  if (kind === 'cite') return !(p.lastTs && ts - p.lastTs < POLICE.cooldownMs) && !(sameDay && p.cites >= POLICE.citesPerDay);
  return !heldNow(p, ts) && !(sameDay && p.detains >= POLICE.detainsPerDay) && recent >= POLICE.priorCites; }

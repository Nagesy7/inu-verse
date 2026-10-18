// Paw Audit Bureau report generator (check 12): findings ranked by severity, each with repro steps, the fix and its status,
// signed by the Chief Auditor and addressed to Zachary. Same code runs in the in-game panel and in /api/sim-audit.
import { runChecks, CHECK_NAMES } from './checks.js';
import { WATCHDOGS, COLORS } from './roster.js';
import { PAWMARK } from './pawmarks.js';
import { CURRENCY } from './currency.js';
import { POLICE } from './police.js';
export const SEVERITY = ['critical', 'high', 'medium', 'low', 'info'];
export const PHASE = 'Phase 5: medical (Paw Audit Bureau re-run)';

// Standing findings: the Bureau's own reading of the code. `when` decides from the static scan whether it still applies.
export const STANDING = [
  { id: 'PAB-001', severity: 'medium', check: 1, title: 'Action log lived in the browser session only',
    detail: `Phase 1 chains were tamper-evident but not anchored: a modified client could throw a chain away and build a fresh one. Phase 2 anchors every player ${CURRENCY.name} wallet on the sim server: /api/sim-log keeps the checkpoint (seq, head, balance, anti-farm counters, last ${50} heads) in Upstash under sim:* keys and only moves it forward when posted entries continue from the stored head, re-hash correctly and pass the same rules.`,
    repro: ['Join at the Bureau desk and work a desk shift.', 'Edit, reorder, replay or drop entries in the local log and sync.', 'The server answers 409 and the wallet falls back to the anchored checkpoint.'],
    fix: 'Server chain-head anchor (src/sim/anchor.js + api/sim-log.js) with hash verification, rate limits and size caps; attacked live in check 1.', status: 'fixed (Phase 2)' },
  { id: 'PAB-002', severity: 'low', check: 3, title: "President Inu's tip writes Bones directly", when: (S) => S.context.presidentTip,
    detail: 'talk() in the President module adds 25 Bones to the player. That is the main game, not the sim, and it is fine today. If a later phase let sim agents drive President Inu, it would become a sim write to Bones.',
    repro: ['Wait for a President visit.', 'Talk to President Inu.', '+25 Bones (once per visit).'],
    fix: 'The President module is on the sim deny-list; sim agents use their own NPCs. The static scan fails if sim code imports it.', status: 'guarded' },
  { id: 'PAB-003', severity: 'low', check: 4, title: 'A Bones to practice-KIBBLE swap exists in the Launch Hall', when: (S) => S.context.bonesSwap,
    detail: 'The main game converts Bones into practice KIBBLE for the Launch Hall trainer. It is the obvious route a side currency would try to reach.',
    repro: ['Open the Launch Hall.', 'Use "Swap bones to practice KIBBLE".'],
    fix: `${CURRENCY.name} never become Bones, so they cannot reach the swap. The main-game module is deny-listed, the currency has no conversion export, and the anchor accepts only join, leave, wage, fine, bail, police, verdict, refund and clinic entries (a refund only returns a dismissed record's own fine or bail; the optional clinic co-pay is destroyed).`, status: 'guarded' },
  { id: 'PAB-004', severity: 'low', check: 2, title: 'A grep alone misses URLs built at runtime',
    detail: 'A static scan finds literal paths only. A URL assembled from pieces would slip past it.',
    repro: ['Build a URL from string pieces inside sim code.', 'The grep does not see the endpoint.'],
    fix: 'Sim code may not open its own network calls (fetch, XHR, sockets, beacons or dynamic imports); its only door is an allow-list guard (path + method) that throws for anything else.', status: 'fixed' },
  { id: 'PAB-008', severity: 'low', check: 2, title: 'Protocol-relative URLs passed the Phase 1 host check',
    detail: 'In Phase 1 a URL like //other-host/api/sim-audit skipped the host test. Nothing left the site, because only the bare path was ever fetched, but the guard was wrong.',
    repro: ['guardUrl("//evil.example/api/sim-log") in Phase 1 code: no throw.'], fix: 'The guard now requires the same origin for every URL; the Red-Team probe list includes protocol-relative and absolute same-path URLs.', status: 'fixed (Phase 2)' },
  { id: 'PAB-009', severity: 'low', check: 3, title: 'The desk-shift puzzle is solved in the browser',
    detail: `The server cannot prove a desk or ranger shift was really worked, only that it obeys the rules. A scripted client could earn at most the daily wage cap (${60} ${CURRENCY.short}/day, diminishing from ${10} per shift, ${3}-minute cooldown). ${CURRENCY.name} have no value outside the sim, so the worst case is a full sim wallet.`,
    repro: ['Post wage entries straight to /api/sim-log with correct hashes.', 'They are accepted only up to the cooldown, diminishing amount and daily cap.'],
    fix: 'Server-side caps, cooldowns and diminishing returns (economy.js, shared by client and server). Later phases can move shifts to server-issued tasks if wages ever buy anything that matters.', status: 'mitigated (kept as is, optional: President Inu)' },
  { id: 'PAB-010', severity: 'low', check: 5, title: `A ${CURRENCY.name} wallet lives on one device`,
    detail: 'The wallet id and its owner token are random and stored only in this browser. Clearing site data or switching device starts a new, empty wallet; the old one stays anchored but nobody can write to it.',
    repro: ['Join and earn at the desk.', 'Clear site data and reload.', 'A new wallet with 0 starts.'],
    fix: 'By design for now: linking to a crypto wallet would break the "never tied to a wallet" rule. Cross-device restore needs a non-wallet account.', status: 'kept as is (optional: President Inu)' },
  { id: 'PAB-012', severity: 'low', check: 11, title: 'Police see what the browser reports',
    detail: 'Spotting an offence runs in the player\'s browser (the server never sees positions). A modified client could dodge citations, which only helps itself, or invent citations against itself, which only hurts itself. It cannot cite anyone else: every entry is scoped to its own wallet id and token.',
    repro: ['Post a forged police.cite for your own wallet to /api/sim-log.', 'Accepted only within the daily caps, cooldown and fine rules; another wallet id is refused (403/400).'],
    fix: 'Server-side caps, cooldowns, 60 s detention cap and the opt-in rule (police.js, shared by client and server). Phase 4: the court checks every record against the wall-clock patrol schedule, so a self-made citation with no officer nearby cannot be tried.', status: 'mitigated (kept as is, optional: President Inu)' },
  { id: 'PAB-013', severity: 'low', check: 11, title: 'Shared networks share the alt limit',
    detail: `At most ${4} ${CURRENCY.name} wallets can earn wages from one network per day (per hashed IP; the same device is the same network, and there is no fingerprinting). A busy household, school or phone-carrier NAT could hit it. Only wages are limited: policing, bail and leaving still work.`,
    repro: ['Join and finish a shift in 5 fresh browsers on one network on one day.', 'The 5th wallet\'s wage is refused (422, kind "alts").'],
    fix: 'Raise or lower anchor.js LIMITS.altsPerIpDay if real players hit it.', status: 'kept as is (optional: President Inu)' },
  { id: 'PAB-015', severity: 'low', check: 7, title: 'A modified client can win back a fine it made up for itself',
    detail: `Citations are still spotted in the browser (PAB-012). A modified client could post a citation against itself where an officer really was 4 to 5 tiles away, pay the fine, then win it back in court with "too far to see". It ends exactly where it started: a refund is always exactly what that record paid, once, so no wallet, pair of wallets or loop of self-made records can gain a single ${CURRENCY.name}. Records with no officer within ${POLICE.seeTiles + 1} tiles on the patrol schedule are inadmissible.`,
    repro: ['Post a forged police.cite + pm.fine for your own wallet (officer 4.5 tiles away on the patrol schedule).', 'Contest it: dismissed, the same 5 PM comes back. Net change 0.', 'Forge one with no officer nearby: the court refuses it (422, kind "collusion").'],
    fix: 'Refunds capped at what was paid, once per record, inadmissibility check on the patrol schedule, 3 verdicts a day (court.js, shared by client and server). Moving detection server-side would close it fully (see PAB-012).', status: 'accepted (President Inu)' },
  { id: 'PAB-018', severity: 'low', check: 11, title: 'Medic shifts are worked in the browser',
    detail: `Like the desk and ranger shifts (PAB-009), the server cannot see the player walk to the sim pup or tap the treatment steps. A scripted client could claim a medic wage for each open call without walking over. It still needs a real call from the fixed timetable (one every ${2} min, each once), at most ${6} calls a day, and every medic wage is an ordinary sim wage inside the same daily cap, cooldown and diminishing returns as every other job, so it can never earn more than honest shifts would.`,
    repro: ['Post med.treat for the open call + pm.wage {why: "medic shift"} straight to /api/sim-log.', 'Accepted only for the call that is open, once, inside the shared wage cap; a treatment of yourself, another player or the wrong pup is refused (422).'],
    fix: 'Server-side call timetable, once-per-call, 6 calls a day and the shared wage rules (medical.js + economy.js, shared by client and server). Server-issued tasks would close it fully.', status: 'mitigated (optional: President Inu)' },
  { id: 'PAB-005', severity: 'info', check: 6, title: 'The corrupt-cop branch is not built yet',
    detail: 'Phase 4 built the courthouse, so check 7 (trial and evidence) is now enforced against real trials on anchored evidence, like check 11 for arrests (and, since Phase 5, for cartoon bumps and medic shifts). Check 6 still runs against the framework guards the corrupt-cop branch will use (rate limits, diminishing returns, pair flow caps). Bribes exist only as a ledger primitive between sim agents.',
    repro: ['Run the Bureau checks: check 6 shows scope "guarded", checks 7 and 11 "enforced".'], fix: 'Re-audit when the corrupt-cop branch (Phase 7) lands, before anything ships.', status: 'deferred' },
  { id: 'PAB-016', severity: 'info', check: 7, title: 'A wrong defence is final; walking out is free',
    detail: `Each record is tried once: picking a defence the evidence does not back means upheld, and it cannot be retried. Walking out (or the ${90} s cap) logs nothing and keeps the record open for another try within the day. Nothing is lost either way: there is no fee and an upheld record changes nothing.`,
    repro: ['Contest a citation where the officer stood 2 tiles away with "too far to see": upheld.', 'The Contest button for it is gone.'], fix: 'By design: once-only verdicts stop retry farming; the evidence is shown in full before you choose.', status: 'by design' },
  { id: 'PAB-017', severity: 'info', check: 7, title: 'Only anchored evidence can be tried',
    detail: 'The court reads the server\'s checkpoint, never the copy on the device. A citation made while offline shows as "syncing" and can be contested once it reaches the sim server (records stay contestable for a day).',
    repro: ['Get cited with the network off.', 'Open the courthouse: the record is listed as syncing, not contestable.'], fix: 'By design: the court only trusts what the server anchored.', status: 'by design' },
  { id: 'PAB-019', severity: 'info', check: 11, title: 'Cartoon bumps are spotted in the browser',
    detail: 'Like the police (PAB-012), the browser decides when a bump happens (a run into a wall, the park bees, a long nap in the sun, the café). A modified client can skip them, which only spares itself, or post its own, which only costs itself: a bump pays nothing, treatment is free, and a bump can never be turned into a medic wage (patients are only sim pups from the call list).',
    repro: ['Post a med.injury for your own wallet.', 'Accepted only with bumps switched on, within 3 a day, 5 min apart, 60 s max and in the right place (a bee sting only in the park, a tummy ache only near the café); a medic wage that names it is refused (422).'],
    fix: 'By design: nothing is gained by faking one; the caps and opt-in are server-side (medical.js).', status: 'by design' },
  { id: 'PAB-020', severity: 'info', check: 11, title: 'A stubbed paw or tummy ache slows walking a little',
    detail: 'The only effect that is not purely cosmetic: walking speed x0.85 (stubbed paw, 30 s) or x0.9 (tummy ache, 30 s), only in the hub world while walking, never driving, never inside any game, never past 60 s. It ends early by walking 12 tiles, switching bumps off or free treatment. Bee stings and sunburn are only looks.',
    repro: ['Switch bumps on at the clinic, sprint into a wall: "Stubbed paw", walking x0.85 for 30 s.', 'Walk 12 tiles: walked it off.'],
    fix: 'By design (the brief allows a minor slowdown); the multiplier is clamped to >= 0.85 and to the bump\'s own timer.', status: 'by design' },
  { id: 'PAB-006', severity: 'info', check: 11, title: 'Opt-in is per device and off by default',
    detail: 'Joining the side economy is an explicit switch at the Bureau desk; leaving stops wages at once and the server refuses wages for anyone not joined. Phase 3 police and rangers act only on joined players; leaving ends any detention and clears unpaid citations at once. Phase 5 cartoon bumps need a second, separate switch at the clinic (off by default); leaving the side economy switches them off too.',
    repro: ['Open the desk: the wallet says "not joined" until you join.'], fix: 'Keep it explicit.', status: 'by design' },
  { id: 'PAB-011', severity: 'info', check: 12, title: 'Hiding Connect Wallet behind open panels relies on CSS :has()',
    detail: 'On phones the Connect Wallet button hides while a panel is open and comes back when it closes. Phase 4 does the same for the ☰ menu button over the panel close button (proof/sim4-panels-*). Browsers without :has() (Safari before 15.4) keep the old overlap.',
    repro: ['Open any panel at 667x375.'], fix: 'Accepted: the button still works everywhere; only very old browsers see the overlap.', status: 'accepted (President Inu)' },
  { id: 'PAB-014', severity: 'info', check: 11, title: 'Walking away ends a detention',
    detail: 'A detained player keeps full control: moving more than 8 tiles from the spot, entering any door or game, or a gap in play ends it with no charge (logged as "left the scene"). Detention is a sim status, never a cage.',
    repro: ['Get detained (3 citations in 10 min), then walk off.'], fix: 'By design: the brief requires that a detained player can always leave the scene.', status: 'by design' },
  { id: 'PAB-007', severity: 'info', check: 12, title: 'Report delivery to Zachary is manual',
    detail: 'The Bureau has no outbox. The report is published in-game and as JSON; President Inu\'s agent sends it to Zachary.',
    repro: ['Open /api/sim-audit.'], fix: 'Keep it manual: President Inu relays each report to Zachary. Ship holds stay advisory.', status: 'by design (process)' },
];
const failFinding = (c) => ({ id: `PAB-F${String(c.n).padStart(2, '0')}`, severity: [2, 3, 4, 5, 10].includes(c.n) ? 'critical' : 'high', check: c.n, title: `Check ${c.n} (${c.name}) is failing`,
  detail: c.evidence.join('; '), repro: ['Run `node --test tests/` or open the Bureau desk.'], fix: 'Hold any ship touching prizes or the main economy until this passes.', status: 'open: ship hold' });
export const rank = (list) => [...list].sort((a, b) => SEVERITY.indexOf(a.severity) - SEVERITY.indexOf(b.severity) || a.check - b.check || a.id.localeCompare(b.id));

export function checkReport(r) { // check 12: the report has what the spec asks for
  const sorted = r.findings.every((f, i, a) => !i || SEVERITY.indexOf(a[i - 1].severity) <= SEVERITY.indexOf(f.severity));
  const complete = r.findings.every((f) => SEVERITY.includes(f.severity) && f.repro?.length && f.fix && f.status);
  return { pass: sorted && complete && r.to === 'Zachary Nagle' && r.signedBy?.title === 'Chief Auditor' && r.checks.length === 12, ev: [`${r.findings.length} findings ranked by severity: ${sorted}`, `every finding has repro, fix and status: ${complete}`, `addressed to ${r.to}, signed by ${r.signedBy?.name} (${r.signedBy?.title})`] };
}

export async function buildReport(STATIC, { now = Date.now() } = {}) {
  const checks = await runChecks(STATIC);
  const findings = rank([...STANDING.filter((f) => !f.when || f.when(STATIC)).map(({ when, ...f }) => f), ...checks.filter((c) => c.status === 'fail').map(failFinding)]);
  const chief = WATCHDOGS.find((w) => w.role === 'chief');
  const r = { bureau: 'Paw Audit Bureau', tag: 'the Watchdogs', colors: { violet: COLORS.violet, silver: COLORS.silver }, phase: PHASE, generatedAt: new Date(now).toISOString(),
    to: 'Zachary Nagle', signedBy: { name: chief.name, title: chief.title }, sideCurrency: { name: PAWMARK.name, unit: PAWMARK.unit, oneWay: true, cashOut: false, wallet: false },
    staticScan: { generatedFrom: STATIC.fingerprint, files: STATIC.files.length }, checks, findings, members: WATCHDOGS.map((w) => ({ name: w.name, title: w.title, owns: w.owns.map((n) => CHECK_NAMES[n - 1]) })) };
  const c12 = checkReport({ ...r, checks: [...checks, {}] });
  r.checks = [...checks, { n: 12, name: CHECK_NAMES[11], owner: chief.name, ownerTitle: chief.title, status: c12.pass ? 'pass' : 'fail', scope: 'enforced', evidence: c12.ev }];
  if (!c12.pass) r.findings = rank([...r.findings, failFinding(r.checks[11])]);
  r.summary = { checks: { pass: r.checks.filter((c) => c.status === 'pass').length, fail: r.checks.filter((c) => c.status === 'fail').length },
    findings: Object.fromEntries(SEVERITY.map((s) => [s, r.findings.filter((f) => f.severity === s).length])), shipHold: r.findings.some((f) => f.status.startsWith('open: ship hold')) };
  return r;
}

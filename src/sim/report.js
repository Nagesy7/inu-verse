// Paw Audit Bureau report generator (check 12): findings ranked by severity, each with repro steps, the fix and its status,
// signed by the Chief Auditor and addressed to Zachary. Same code runs in the in-game panel and in /api/sim-audit.
import { runChecks, CHECK_NAMES } from './checks.js';
import { WATCHDOGS, COLORS } from './roster.js';
import { PAWMARK } from './pawmarks.js';
export const SEVERITY = ['critical', 'high', 'medium', 'low', 'info'];
export const PHASE = 'Phase 1: Paw Audit Bureau';

// Standing findings: the Bureau's own reading of the code. `when` decides from the static scan whether it still applies.
export const STANDING = [
  { id: 'PAB-001', severity: 'medium', check: 1, title: 'Action log lives in the browser session only',
    detail: 'The chain is tamper-evident (any edit, reorder or deletion fails verification) but not anchored anywhere: a modified client could throw the whole chain away and build a fresh one that also verifies.',
    repro: ['Open the Bureau desk, note the chain head.', 'Reload the page.', 'The log restarts from genesis with a new head.'],
    fix: 'Before any sim outcome matters across players (Phase 2), anchor chain heads server-side: an append-only Upstash list written only by a sim API that hashes on the server.', status: 'open: needs Zachary\'s OK (adds a new write API)' },
  { id: 'PAB-002', severity: 'low', check: 3, title: "President Inu's tip writes Bones directly", when: (S) => S.context.presidentTip,
    detail: 'talk() in the President module adds 25 Bones to the player. That is the main game, not the sim, and it is fine today. If a later phase lets sim agents drive President Inu, it would become a sim write to Bones.',
    repro: ['Wait for a President visit.', 'Talk to President Inu.', '+25 Bones (once per visit).'],
    fix: 'The President module is on the sim deny-list; Phase 2 agents must use their own NPCs. The static scan fails if sim code imports it.', status: 'guarded' },
  { id: 'PAB-003', severity: 'low', check: 4, title: 'A Bones to practice-KIBBLE swap exists in the Launch Hall', when: (S) => S.context.bonesSwap,
    detail: 'The main game converts Bones into practice KIBBLE for the Launch Hall trainer. It is the obvious route a side currency would try to reach.',
    repro: ['Open the Launch Hall.', 'Use "Swap bones to practice KIBBLE".'],
    fix: 'Pawmarks never become Bones, so they cannot reach the swap. The main-game module is deny-listed, Pawmarks have no conversion export, and the only sim route is a read-only GET.', status: 'guarded' },
  { id: 'PAB-004', severity: 'low', check: 2, title: 'A grep alone misses URLs built at runtime',
    detail: 'A static scan finds literal paths only. A URL assembled from pieces would slip past it.',
    repro: ['Build a URL from string pieces inside sim code.', 'The grep does not see the endpoint.'],
    fix: 'Belt and braces: sim code may not open its own network calls (fetch, XHR, sockets, beacons or dynamic imports) (static test), and its only network door is an allow-list guard that throws for anything except /api/sim-audit.', status: 'fixed' },
  { id: 'PAB-005', severity: 'info', check: 6, title: 'Corrupt-cop, trial and arrest branches are not built yet',
    detail: 'Checks 6, 7 and 11 run against the framework guards those branches will have to use (rate limits, diminishing returns, pair flow caps, once-only verdicts, opt-in, time caps, a way out). They pass now and must be re-run when Phase 2 lands.',
    repro: ['Run the Bureau checks: checks 6, 7 and 11 show scope "guarded".'], fix: 'Re-audit at the start of Phase 2 before anything ships.', status: 'deferred to Phase 2' },
  { id: 'PAB-006', severity: 'info', check: 11, title: 'No opt-in switch ships in Phase 1',
    detail: 'Real players cannot be part of the sim at all yet, so no player can be targeted. The opt-in flag exists (default off) but nothing turns it on.',
    repro: ['Search the UI for a sim opt-in: there is none.'], fix: 'Phase 2 adds an explicit, reversible opt-in with a time cap and a leave button.', status: 'by design' },
  { id: 'PAB-007', severity: 'info', check: 12, title: 'Report delivery to Zachary is manual',
    detail: 'The Bureau has no outbox. The report is published in-game and as JSON; President Inu\'s agent sends it to Zachary.',
    repro: ['Open /api/sim-audit.'], fix: 'Keep it manual: a human-approved send before any major ship.', status: 'open (process)' },
];
const failFinding = (c) => ({ id: `PAB-F${String(c.n).padStart(2, '0')}`, severity: [2, 3, 4, 5, 10].includes(c.n) ? 'critical' : 'high', check: c.n, title: `Check ${c.n} (${c.name}) is failing`,
  detail: c.evidence.join('; '), repro: ['Run `node --test tests/` or open the Bureau desk.'], fix: 'Hold any ship touching prizes or the main economy until this passes.', status: 'open: ship hold' });
export const rank = (list) => [...list].sort((a, b) => SEVERITY.indexOf(a.severity) - SEVERITY.indexOf(b.severity) || a.check - b.check || a.id.localeCompare(b.id));

export function checkReport(r) { // check 12: the report has what the spec asks for
  const sorted = r.findings.every((f, i, a) => !i || SEVERITY.indexOf(a[i - 1].severity) <= SEVERITY.indexOf(f.severity));
  const complete = r.findings.every((f) => SEVERITY.includes(f.severity) && f.repro?.length && f.fix && f.status);
  return { pass: sorted && complete && r.to === 'Zachary Nagle' && r.signedBy?.title === 'Chief Auditor' && r.checks.length === 12, ev: [`${r.findings.length} findings ranked by severity: ${sorted}`, `every finding has repro, fix and status: ${complete}`, `addressed to ${r.to}, signed by ${r.signedBy?.name} (${r.signedBy?.title})`] };
}

export function buildReport(STATIC, { now = Date.now() } = {}) {
  const checks = runChecks(STATIC);
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

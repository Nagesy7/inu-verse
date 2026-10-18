// Paw Audit Bureau: the 12 checks from the spec (inu-shared/inu-verse-audit-bureau.md), one named test each.
// Each test runs the Bureau's own check (src/sim/checks.js) against the LIVE static scan, then asserts the core rule directly.
import test from 'node:test'; import assert from 'node:assert/strict';
import { scan } from '../scripts/sim-scan.mjs';
const { runChecks, CHECK_NAMES, PAWMARK_EXPORTS, sandbox } = await import('../src/sim/checks.js');
const { buildReport, checkReport, SEVERITY } = await import('../src/sim/report.js');
const PM = await import('../src/sim/pawmarks.js'); const { verifyChain } = await import('../src/sim/ledger.js');
const { FirewallError, guardUrl, readOnly, ECON_KEYS } = await import('../src/sim/firewall.js');
const S = scan(new URL('..', import.meta.url).pathname), results = await runChecks(S), byN = (n) => results.find((r) => r.n === n);
const ok = (n) => { const r = byN(n); assert.equal(r.name, CHECK_NAMES[n - 1]); assert.equal(r.status, 'pass', r.evidence.join('\n')); };
const fw = (fn, kind) => assert.throws(fn, (e) => e instanceof FirewallError && (!kind || e.kind === kind));
const [BK, KK] = ECON_KEYS;

test('Check 1: Action log', () => { ok(1); assert.ok(byN(1).evidence.some((e) => /server anchor: honest sync accepted \(true\)/.test(e)), 'check 1 includes the server anchor attack'); const s = sandbox(); s.act(PM.ISSUER, 'pm.issue', 'sim:cop-rex', { amount: 10 }); s.act('sim:cop-rex', 'pm.pay', 'sim:pup-miso', { amount: 4 });
  const e = s.log.entries().at(-1); for (const k of ['actor', 'group', 'target', 'value', 'ts']) assert.ok(e[k] !== undefined, k); assert.deepEqual(e.value, { amount: 4, unit: 'PAWMARK' });
  assert.equal(s.balance('sim:pup-miso'), 4); assert.ok(verifyChain(s.log.entries()).ok); });
test('Check 2: Prize firewall', () => { ok(2); assert.deepEqual(S.imports.violations, []); assert.deepEqual(S.prize, []); assert.deepEqual(S.network, []);
  for (const u of ['/api/inu-score', 'https://kibble-pay.vercel.app/api/pools', '/api/raid?op=submit', '/api/boards']) fw(() => guardUrl(u), 'prize'); assert.equal(guardUrl('/api/sim-audit'), '/api/sim-audit'); });
test('Check 3: Main economy firewall', () => { ok(3); assert.deepEqual(S.economy, []); const real = { [BK]: 1, [KK]: 2 }, v = readOnly(real); fw(() => { v[BK] = 99; }, 'economy'); fw(() => { v[KK] = 99; }, 'economy'); assert.deepEqual(real, { [BK]: 1, [KK]: 2 });
  const s = sandbox(); s.act(PM.ISSUER, 'pm.issue', 'sim:cop-rex', { amount: 5 }); for (const u of ['BONES', 'KIBBLE']) fw(() => s.act('sim:cop-rex', 'pm.pay', 'sim:pup-miso', { amount: 1, unit: u }), 'economy'); });
test('Check 4: Side currency is one-way', () => { ok(4); assert.deepEqual(Object.keys(PM).sort(), [...PAWMARK_EXPORTS].sort()); assert.deepEqual(S.conversion, []);
  assert.deepEqual(S.routes.map((r) => [r.file, r.writes]), [['api/sim-audit.js', false], ['api/sim-log.js', true]]); for (const o of S.outside) { assert.ok(S.allowedOutside.includes(o.file), o.file); assert.ok(o.imports.every((i) => !/pawmarks|engine|ledger/.test(i))); } });
test('Check 5: No cash-out', () => { ok(5); assert.equal(PM.PAWMARK.cashOut, false); assert.equal(PM.PAWMARK.wallet, false); fw(() => PM.validAccount('4VE9sy4fEMJdZ6i7MkYPbnqDJd2oqzJQmg44WJ3opump'), 'wallet'); assert.deepEqual(S.wallet, []); });
test('Check 6: Corrupt-cop branch', () => { ok(6); assert.equal(byN(6).scope, 'guarded'); const s = sandbox(); s.act(PM.ISSUER, 'pm.issue', 'sim:cop-rex', { amount: 50 }); fw(() => s.act('sim:cop-rex', 'pm.pay', 'sim:chief-juniper', { amount: 5 }), 'independence'); });
test('Check 7: Trial/evidence', () => { ok(7); const s = sandbox(); s.act('sim:judge-oaks', 'evidence.file', 'sim:pup-kiki', { data: { key: 'c1' } }); fw(() => s.act('sim:judge-oaks', 'evidence.file', 'sim:pup-kiki', { data: { key: 'c1' } }), 'replay'); });
test('Check 8: Gambling check', () => { ok(8); assert.deepEqual(S.gambling, []); const s = sandbox(); fw(() => s.defineAction('crate', { chance: 0.5, price: 3 }), 'gambling'); });
test('Check 9: Cosmetics rule', () => { ok(9); const a = sandbox(), b = sandbox(); a.register({ id: 'sim:z', group: 'medical' }); b.register({ id: 'sim:z', group: 'medical', look: { hat: 'crown', top: 'gold_suit' } });
  for (const k of ['legal', 'health', 'police', 'fire']) assert.equal(a.resolve('sim:z', k, 3), b.resolve('sim:z', k, 3)); });
test("Check 10: Players' real wallets", () => { ok(10); const s = sandbox(); fw(() => s.register({ id: 'sim:w', group: 'fire', look: { secretKey: 'x' } }), 'wallet'); });
test('Check 11: Abuse and harm', () => { ok(11); const s = sandbox(); fw(() => s.act('sim:cop-rex', 'hold', 'player:anyone', { data: { sec: 5 } }), 'optin'); });
test('Check 12: Report', async () => { const r = await buildReport(S); assert.equal(r.checks.length, 12); assert.equal(r.checks[11].name, 'Report'); assert.equal(r.checks[11].status, 'pass', r.checks[11].evidence.join('\n'));
  assert.ok(checkReport(r).pass); assert.equal(r.to, 'Zachary Nagle'); assert.equal(r.signedBy.title, 'Chief Auditor');
  for (let i = 1; i < r.findings.length; i++) assert.ok(SEVERITY.indexOf(r.findings[i - 1].severity) <= SEVERITY.indexOf(r.findings[i].severity));
  assert.deepEqual(r.checks.map((c) => c.name), CHECK_NAMES); assert.equal(r.summary.checks.pass, 12);
  const bad = checkReport({ ...r, findings: [...r.findings].reverse() }); assert.equal(bad.pass, false, 'an unsorted report must fail check 12'); });
test('a failing check becomes a ranked critical finding and a ship hold', async () => { const S2 = structuredClone(S); S2.prize.push({ file: 'src/sim/x.js', line: 1, rule: 'demo' });
  const r = await buildReport(S2); assert.equal(r.checks[1].status, 'fail'); assert.equal(r.findings[0].severity, 'critical'); assert.equal(r.summary.shipHold, true); });

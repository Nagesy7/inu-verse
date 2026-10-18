// Paw Audit Bureau firewalls: static import/grep over src/sim/** and api/sim*, plus runtime guards that throw.
import test from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scan, simFiles, PATTERNS } from '../scripts/sim-scan.mjs';
const root = new URL('..', import.meta.url).pathname, S = scan(root);
const F = await import('../src/sim/firewall.js'); const { createSim } = await import('../src/sim/engine.js'); const PM = await import('../src/sim/pawmarks.js');
const fw = (fn, kind) => assert.throws(fn, (e) => e instanceof F.FirewallError && (!kind || e.kind === kind));

test('scan covers every sim file (src/sim/** + api/sim*)', () => { const f = simFiles(root); for (const x of ['src/sim/engine.js', 'src/sim/ledger.js', 'src/sim/pawmarks.js', 'src/sim/firewall.js', 'src/sim/checks.js', 'src/sim/report.js', 'src/sim/bureauui.js', 'api/sim-audit.js']) assert.ok(f.includes(x), x); });
test('prize firewall (static): sim imports only sim; no Inu Score / pools / boards / raids / payouts / kibble-pay paths', () => {
  assert.deepEqual(S.imports.violations, []); assert.deepEqual(S.prize, []);
  for (const f of simFiles(root)) { const src = readFileSync(root + f, 'utf8'); for (const m of F.DENY_MODULES) if (f !== 'src/sim/firewall.js') assert.ok(!new RegExp(`['"][^'"]*${m.replace('.', '\\.')}['"]`).test(src), `${f} imports ${m}`); } });
test('prize firewall (static): sim never opens its own network calls', () => assert.deepEqual(S.network, []));
test('the scanner really catches violations (self-test on planted code)', () => { const planted = { prize: "fetchIt('/api/inu-score?wallet=' + w)", economy: 'state.bones += 5', network: "fetch('/x')", wallet: 'provider.signTransaction(tx)', gambling: 'if (Math.random() < 0.1) win()' };
  for (const [k, line] of Object.entries(planted)) assert.ok(PATTERNS[k].some((re) => re.test(line)), k); });
test('the denylist block holds data only (no calls hidden in the exempt region)', () => { const src = readFileSync(root + 'src/sim/firewall.js', 'utf8'), block = src.match(/FIREWALL-DENYLIST-BEGIN[\s\S]*?FIREWALL-DENYLIST-END/)[0];
  assert.ok(!/=>|function|\bfetch\b|\(\s*\)/.test(block), 'only constant data in the exempt block'); });
test('prize firewall (runtime): guardedFetch throws before any request for forbidden URLs and only GETs the audit route', async () => { const calls = [], f = (u, o) => { calls.push([u, o]); return Promise.resolve({ ok: true }); };
  for (const u of F.RED_TEAM.prizeUrls) fw(() => F.guardedFetch(u, f), 'prize'); assert.equal(calls.length, 0);
  await F.guardedFetch('/api/sim-audit', f); assert.deepEqual(calls, [['/api/sim-audit', { method: 'GET', credentials: 'omit', cache: 'no-store' }]]); });
test('main-economy firewall (static): nothing in the sim writes Bones or $KIBBLE', () => assert.deepEqual(S.economy, []));
test('main-economy firewall (runtime): units, keys, read-only state', () => { const s = createSim(); s.register({ id: 'sim:a', group: 'fire' }); s.act(PM.ISSUER, 'pm.issue', 'sim:a', { amount: 9 });
  for (const u of F.ECON_UNITS) fw(() => s.act('sim:a', 'pm.sink', PM.SINK, { amount: 1, unit: u }), 'economy');
  for (const k of ['bones', 'Bones', 'kibble', '$KIBBLE', 'pools', 'payout', 'inuScore']) fw(() => F.guardKey(k), 'economy');
  const game = { bones: 10, kibble: 5, player: { x: 1 } }, v = s.view(game); assert.equal(v.bones, 10); fw(() => { v.player.x = 2; }); fw(() => { v.bones = 0; }, 'economy'); assert.deepEqual(game, { bones: 10, kibble: 5, player: { x: 1 } }); });
test('only the sim/main hooks import sim code, and never the currency, engine or ledger', () => { assert.deepEqual(S.outside.map((o) => o.file).sort(), ['src/main.js', 'src/world.js']);
  for (const o of S.outside) assert.ok(o.imports.every((i) => /sim\/(bureau|place)\.js$/.test(i)), o.imports.join()); });
test('no conversion path: no conversion-shaped export, the only sim API route is read-only, Pawmarks unknown outside the sim', () => { assert.deepEqual(S.conversion, []); assert.deepEqual(S.routes, [{ file: 'api/sim-audit.js', writes: false }]);
  for (const f of ['src/game.js', 'src/mall.js', 'src/wallet.js', 'src/save.js', 'src/main.js']) assert.ok(!/pawmark/i.test(readFileSync(root + f, 'utf8')), f); });

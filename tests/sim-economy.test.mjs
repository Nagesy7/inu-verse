// Phase 2 side economy: wages, fines, bail and bribes with diminishing returns, caps and cooldowns; one rename-able label.
import test from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
const { FLOWS, quote, applyFlow, DAY_MS } = await import('../src/sim/economy.js'); const { createSim } = await import('../src/sim/engine.js');
const { CURRENCY, pm } = await import('../src/sim/currency.js'); const { PAWMARK, balances, ISSUER, SINK } = await import('../src/sim/pawmarks.js'); const { FirewallError } = await import('../src/sim/firewall.js');
const root = new URL('..', import.meta.url).pathname, fw = (fn, kind) => assert.throws(fn, (e) => e instanceof FirewallError && (!kind || e.kind === kind));
test('the currency label lives in one constant and is not hard-coded in any sim string', () => { assert.equal(PAWMARK.name, CURRENCY.name); assert.equal(pm(12.9), `12 ${CURRENCY.short}`);
  for (const f of readdirSync(root + 'src/sim').filter((x) => x.endsWith('.js') && x !== 'currency.js' && x !== 'audit-static.js')) readFileSync(root + 'src/sim/' + f, 'utf8').split('\n').forEach((l, i) => {
    const code = l.replace(/^\s*\/\/.*$/, '').replace(/\s\/\/ .*$/, ''); assert.ok(!/['"`][^'"`]*\bPawmarks?\b/.test(code), `${f}:${i + 1} hard-codes the currency name`); }); });
test('wages diminish within a day, respect the cooldown and stop at the daily cap; a new day resets', () => { const F = FLOWS.wage; let st = {}, t = 10 * DAY_MS, got = [];
  for (let i = 0; i < 40; i++) { const q = quote(st, 'player:pa', 'wage', t); if (!q.ok) { if (q.reason === 'daily cap reached') break; t += q.waitMs; continue; }
    st = applyFlow(st, { action: 'pm.wage', actor: ISSUER, target: 'player:pa', ts: t, value: { amount: q.amount } }); got.push(q.amount); assert.ok(['cooldown', 'daily cap reached'].includes(quote(st, 'player:pa', 'wage', t + 1).reason)); fw(() => applyFlow(st, { action: 'pm.wage', actor: ISSUER, target: 'player:pa', ts: t + 1, value: { amount: 1 } })); }
  assert.equal(got[0], F.base); for (let i = 1; i < got.length; i++) assert.ok(got[i] <= got[i - 1]); assert.equal(got.reduce((a, b) => a + b, 0), F.dailyCap);
  assert.equal(quote(st, 'player:pa', 'wage', t + F.cooldownMs).reason, 'daily cap reached'); assert.equal(quote(st, 'player:pa', 'wage', (Math.floor(t / DAY_MS) + 1) * DAY_MS).amount, F.base); });
test('a wage must be exactly the quoted amount; fines/bail/bribes at most the cap', () => { fw(() => applyFlow({}, { action: 'pm.wage', actor: ISSUER, target: 'player:pa', ts: 1, value: { amount: 11 } }), 'cap');
  fw(() => applyFlow({}, { action: 'pm.wage', actor: ISSUER, target: 'player:pa', ts: 1, value: { amount: 9 } }), 'cap'); fw(() => applyFlow({}, { action: 'pm.fine', actor: 'sim:a', target: SINK, ts: 1, value: { amount: FLOWS.fine.max + 1 } }), 'cap');
  fw(() => applyFlow({}, { action: 'pm.bail', actor: 'sim:a', target: SINK, ts: 1, value: { amount: 0 } }), 'economy'); assert.ok(applyFlow({}, { action: 'pm.bribe', actor: 'sim:a', target: 'sim:b', ts: 1, value: { amount: 20 } })); });
test('engine: wages, fines, bail (releases the hold) and bribes all go through the log and replay to balances', () => { const s = createSim(); for (const id of ['a', 'b', 'c']) s.register({ id: 'sim:' + id, group: 'fire' });
  s.act(ISSUER, 'pm.wage', 'sim:a', { amount: 10 }); s.step(200); s.act(ISSUER, 'pm.wage', 'sim:a', { amount: 8 }); fw(() => s.act(ISSUER, 'pm.wage', 'sim:a', { amount: 6 }), 'cooldown');
  s.act('sim:a', 'hold', 'sim:b', { data: { sec: 120 } }); s.act('sim:a', 'pm.bail', SINK, { amount: 5, data: { for: 'sim:b' } }); assert.equal(s.holds().has('sim:b'), false);
  s.act('sim:a', 'pm.fine', SINK, { amount: 3 }); s.act('sim:a', 'pm.bribe', 'sim:c', { amount: 4 }); fw(() => s.act('sim:a', 'pm.fine', 'sim:c', { amount: 1 }), 'economy');
  assert.equal(s.balance('sim:a'), 6); assert.equal(s.balance('sim:c'), 4); assert.equal(s.balance(SINK), 8); assert.ok(s.log.verify().ok);
  assert.deepEqual(Object.fromEntries(balances(s.log.entries())), Object.fromEntries(s.balances())); });
test('bribes are a sim-agent primitive only: never with players, never with the Watchdogs', () => { const s = createSim({ players: ['pz'] }); s.register({ id: 'sim:a', group: 'fire' }); s.register({ id: 'sim:w', group: 'watchdogs' }); s.act(ISSUER, 'pm.issue', 'sim:a', { amount: 50 });
  fw(() => s.act('sim:a', 'pm.bribe', 'player:pz', { amount: 1 }), 'phase'); fw(() => s.act('sim:a', 'pm.bribe', 'sim:w', { amount: 1 }), 'independence'); });

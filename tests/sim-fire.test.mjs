// Phase 6: the Emberpaw Firehouse and seeded town events. Cartoon incidents on a hashed timetable (the same on every device),
// never on player homes or shops; an opt-in firefighter shift paid in ordinary sim wages only for seeded incidents; one
// gated siren; scenery only (never solid, never blocking); no chance, no cosmetic edge, nothing touching Bones/$KIBBLE/prizes.
import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
const W = await import('../src/world.js'); const PL = await import('../src/sim/place.js');
const F = await import('../src/sim/fire.js'); const H = await import('../src/sim/firehouse.js');
const { fireRig, walletRig } = await import('../src/sim/checks.js'); const { FirewallError } = await import('../src/sim/firewall.js');
const root = new URL('..', import.meta.url).pathname, src = (f) => readFileSync(root + f, 'utf8'), code = (f) => src(f).replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
const { FIRE, ROLL, eventAt, timeline, SPOTS } = F;
const kindOf = (fn) => { try { fn(); } catch (e) { return e instanceof FirewallError ? e.kind : 'other:' + e.message; } return null; };

test('timetable: deterministic from the slot number, a mix of quiet, ordinary and two-alarm events, every run done before the next slot', () => {
  const a = Array.from({ length: 2000 }, (_, i) => eventAt(i)), b = Array.from({ length: 2000 }, (_, i) => eventAt(i)); assert.deepEqual(a, b);
  const quiet = a.filter((c) => c.quiet).length, big = a.filter((c) => c.big).length; assert.ok(quiet > 400 && quiet < 600, 'about 1 in 4 quiet'); assert.ok(big > 400 && big < 600, 'about 1 in 4 bigger');
  for (const k of Object.keys(F.INCIDENTS)) assert.ok(a.some((c) => c.kind === k), k);
  for (const c of a.filter((x) => !x.quiet)) { for (const mine of [null, { slot: c.slot, doneAt: 0 }]) { const t = timeline(c, mine); assert.ok(t.home < c.start + FIRE.callMs, `slot ${c.slot} overlaps the next`); } }
  assert.equal(eventAt(-1), null); assert.equal(eventAt('x'), null); for (let i = 0; i < 50; i++) { const c = H.shiftEvent(1.8e12 + i * 61e3); assert.ok(c === null || c.quiet === false); }
});

test('incident spots: public kerbs and street furniture, at least 4.5 tiles from every plot, lot and home; stands walkable; the engine parks on a road', () => {
  const own = [...W.PLOTS, ...W.LOTS, ...W.NPC_HOMES];
  for (const s of SPOTS) { const m = Math.min(...own.map((r) => Math.hypot(Math.max(r.x - s.x, 0, s.x - (r.x + r.w)), Math.max(r.y - s.y, 0, s.y - (r.y + r.h)))));
    assert.ok(m >= 4.5, `${s.id} is ${m.toFixed(1)} tiles from a player home/shop`); assert.ok(!W.isSolid(Math.floor(s.stand[0]), Math.floor(s.stand[1])), `${s.id} stand`);
    assert.equal(W.MAP[Math.floor(s.park[1])][Math.floor(s.park[0])], W.T.ROAD, `${s.id} parks on a road`);
    for (const sd of [[0.9, 0.25], [1.8, 0.1], [2.8, 0.6], [-1.7, 0.7]]) { const x = s.stand[0] + sd[0], y = s.stand[1] + sd[1] * F.sideOf(s); assert.ok(!W.isSolid(Math.floor(x), Math.floor(y)), `${s.id} helper at ${x},${y}`); } }
  assert.ok(F.INCIDENT_ACTORS.every((a) => a.startsWith('sim:fx-'))); assert.ok(F.CREW_IDS.every((a) => a.startsWith('sim:fd-')));
});

test('firehouse and bakery kiosk: solid, doors reachable, the station a Bureau spot; the engine route stays off solid tiles', () => {
  const S = PL.FIRE_STATION; for (let x = S.x; x < S.x + S.w; x++) assert.ok(W.isSolid(x, S.y)); assert.ok(!W.isSolid(S.tx, S.ty)); assert.ok(W.findPath(33, 47, S.tx, S.ty));
  const B = PL.BAKERY; for (let x = B.x; x < B.x + B.w; x++) assert.ok(W.isSolid(x, B.y)); assert.ok(!W.isSolid(B.tx, B.ty));
  const its = W.interactables({ plots: {}, homeShare: {} }); assert.ok(its.some((i) => i.kind === 'bureau' && i.id === 'firehouse' && i.tab === 'fire'));
  assert.ok(!its.some((i) => i.id !== 'firehouse' && Math.abs(i.tx - S.tx) <= 2 && Math.abs(i.ty - S.ty) <= 1), 'no other door right beside the station');
  assert.deepEqual([...ROLL.bay], [...S.bay]);
  for (const s of SPOTS) { const r = F.routeOf(s); for (let i = 1; i < r.length; i++) { const [x0, y0] = r[i - 1], [x1, y1] = r[i], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 3));
    for (let k = 0; k <= n; k++) { const x = x0 + ((x1 - x0) * k) / n, y = y0 + ((y1 - y0) * k) / n; assert.ok(!W.isSolid(Math.floor(x), Math.floor(y)), `${s.id} route at ${x.toFixed(1)},${y.toFixed(1)}`); } } }
});

test('scenery only: with events off the crew stay home and nothing rolls; scenes carry no solids; props come only from the seed and the clock', () => {
  for (let i = 0; i < 200; i++) { const ms = 1.8e12 + i * 29e3, off = H.sceneAt(ms, { events: false }), on = H.sceneAt(ms, { events: true });
    assert.equal(off.incident, null); assert.equal(off.constable, null); assert.equal(off.engine.moving, false); assert.equal(off.engine.beacon, false);
    assert.deepEqual(on, H.sceneAt(ms, { events: true, outfit: { hat: 'crown' }, kibble: 1e6, bones: 1e9 })); }
  for (const b of [PL.FIRE_STATION, PL.BAKERY]) assert.ok(PL.SIM_SOLIDS.some((r) => r.x === b.x && r.y === b.y && r.w === b.w));
  assert.ok(!/solid\s*:/.test(code('src/sim/fireart.js')) && !/solid\s*:/.test(code('src/sim/firehouse.js')), 'fire props never solid');
});

test('opt-in: no town events before joining or with the switch off; leaving the side economy switches them off', async () => {
  assert.equal(kindOf(() => walletRig().wallet().eventsOn()), 'optin');
  const N = await fireRig({ events: false }); const c = N.open(); assert.equal(N.w.canAttend(c.slot), false); assert.notEqual(kindOf(() => N.w.attendCall(c.slot, 0)), null);
  N.w.eventsOn(); assert.equal(N.w.state().fire.events, true); N.w.eventsOff(); assert.equal(N.w.state().fire.events, false);
  const L = await fireRig(); L.w.leave(); assert.equal(L.w.state().fire.events, false);
});

test('anti-farm: only seeded incidents pay, once per slot, 6 a day, a minute apart, inside the shared wage cap with diminishing returns; all anchored', async () => {
  const R = await fireRig(); const first = R.attend(); assert.ok(first.wage.value.amount > 0); assert.equal(first.attend.target, first.c.actor);
  assert.equal(kindOf(() => R.w.attendCall(first.c.slot, 0)), 'replay');
  let q = R.c; for (let s = first.c.slot + 1; ; s++) if (eventAt(s).quiet) { q = s; break; } assert.equal(kindOf(() => R.w.attendCall(q, 0)), 'evidence');
  const pays = [first.wage.value.amount]; for (let i = 0; i < 60 && pays.length < FIRE.callsPerDay + 1; i++) { R.R.tick(FIRE.callMs + 1); const c = eventAt(F.fireSlotAt(R.R.now()));
    if (c.quiet) continue; try { pays.push(R.w.attendCall(c.slot, 0).wage?.value.amount || 0); } catch (e) { assert.equal(e.kind, 'cap'); break; } }
  assert.equal(pays.length, FIRE.callsPerDay); for (let i = 1; i < pays.length; i++) assert.ok(pays[i] <= pays[i - 1]); assert.ok(R.w.state().balance <= 60);
  const s = await R.sync(); assert.equal(s.unsynced, 0); assert.equal(s.server, 'ok');
  assert.ok(!F.FIRE_ACTIONS.some((a) => /start|ignite|light|burn|spawn/.test(a)));
});

test('no $KIBBLE edge and no chance: grading reads only the taps; no randomness, stakes or economy keys in the fire files', () => {
  const rich = { outfit: { hat: 'crown', neck: 'diamond_chain' }, kibble: 1e6, bones: 1e9, cosmetics: ['crown'], vip: true };
  for (let i = 0; i < 100; i++) { const kind = Object.keys(F.INCIDENTS)[i % 4], taps = [F.fireOrder(i, kind)[i % 3], 0, 1, 2].slice(i % 2);
    assert.deepEqual(F.fireGrade({ kind, taps }), F.fireGrade({ kind, taps, player: rich, ...rich })); }
  for (const f of ['src/sim/fire.js', 'src/sim/firehouse.js', 'src/sim/fireart.js', 'src/sim/fireui.js']) { const c = code(f);
    assert.ok(!/Math\.random|\bbet\b|wager|lottery|raffle|jackpot/i.test(c), f); assert.ok(!/\b(bones|kibble|prize|score)\s*[:=]/i.test(c), f + ' touches no main-economy field'); }
});

test('siren: one per roll-out, only within earshot with events on, never two inside 45 s; audio gates it; reduced motion respected', () => {
  const run = (pos, events = true) => { let t = 1.8e12; const calls = [], wallet = { state: () => ({ joined: true, fire: { events, callsToday: 0, calls: [], cap: 6 } }), quote: () => ({ ok: true, amount: 10 }) };
    const C = H.createFirehouse({ wallet, now: () => t, sound: (n) => calls.push([n, t]) }); for (let i = 0; i < 3600; i++) { t += 500; C.tick(0.5, t / 1000, Object.freeze({ x: pos[0] * 32, y: pos[1] * 32 })); } return calls; };
  const near = run(ROLL.bay), far = run([2, 100]), off = run(ROLL.bay, false);
  assert.ok(near.length >= 3 && near.length <= 10, `near ${near.length}`); assert.ok(near.every(([n]) => n === 'siren'));
  for (let i = 1; i < near.length; i++) assert.ok(near[i][1] - near[i - 1][1] >= FIRE.sirenCooldownMs);
  assert.equal(far.length, 0); assert.equal(off.length, 0);
  const a = src('src/audio.js'); assert.match(a, /gate\('siren', 45/); assert.match(a, /inu:sim-sfx/);
  assert.match(code('src/sim/fireart.js'), /prefers-reduced-motion|reduced\(\)/); assert.match(code('src/sim/fireui.js'), /inu:sim-sfx/);
});

// Phase 3: police + park rangers. Patrols in the world, citations/fines/detentions for opted-in players only, ways out,
// caps, collusion/alts, ranger shifts, and no $KIBBLE cosmetic edge in any police outcome.
import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
const W = await import('../src/world.js'); const PL = await import('../src/sim/place.js'); const { OFFICERS, officersAt, officerPose } = await import('../src/sim/force.js');
const { POLICE, isCrossing, offenseAt, decide, observe } = await import('../src/sim/police.js'); const { createPatrol, SHIFT } = await import('../src/sim/patrol.js');
const { walletRig, policeRig } = await import('../src/sim/checks.js'); const { FLOWS } = await import('../src/sim/economy.js');
const root = new URL('..', import.meta.url).pathname, tileAt = (tx, ty) => (W.isSolid(tx, ty) ? -1 : W.MAP[ty][tx]), T = W.T; // same lookup main.js passes
const pip = OFFICERS.find((o) => o.id === 'sim:pd-pip');
test('street layout copy matches world.js; zebra crossings are road tiles; kiosk + station are solid and reachable', () => {
  assert.deepEqual([...PL.STREETS.roads], W.ROADS); assert.equal(PL.STREETS.avenue, W.AVENUE);
  for (const r of W.ROADS) for (let dy = 0; dy < 3; dy++) for (const zx of [W.AVENUE - 2, W.AVENUE + 4]) { assert.ok(isCrossing(zx, r + dy)); assert.equal(W.MAP[r + dy][zx], T.ROAD); }
  assert.ok(!isCrossing(10, 43) && !isCrossing(W.AVENUE + 1, 25) && isCrossing(W.AVENUE + 1, 41));
  for (const p of [PL.PRECINCT, PL.RANGER_HUT]) { for (let x = p.x; x < p.x + p.w; x++) assert.ok(W.isSolid(x, p.y)); assert.ok(!W.isSolid(p.tx, p.ty)); assert.ok(W.findPath(31, 70, p.tx, p.ty), p.id); }
  const ids = W.interactables({ plots: {}, homeShare: {} }).filter((i) => i.kind === 'bureau').map((i) => i.id + ':' + (i.tab || '')); assert.deepEqual(ids.sort(), ['bureau:', 'precinct:precinct', 'rangers:rangers']); });
test('patrols: 4 police + 3 rangers, original names, every patrol point walkable, smooth time-only motion', () => {
  assert.equal(OFFICERS.filter((o) => o.force === 'police').length, 4); assert.equal(OFFICERS.filter((o) => o.force === 'rangers').length, 3);
  for (const o of OFFICERS) { for (let t = 0; t < 120; t += 0.5) { const p = officerPose(o, t); assert.ok(!W.isSolid(Math.floor(p.x / 32), Math.floor(p.y / 32)), `${o.id} at t=${t}`); }
    let maxStep = 0; for (let t = 0; t < 120; t += 1 / 60) { const a = officerPose(o, t), b = officerPose(o, t + 1 / 60); maxStep = Math.max(maxStep, Math.hypot(b.x - a.x, b.y - a.y)); } assert.ok(maxStep < 2.5, `${o.id} jumps ${maxStep}px/frame`); }
  assert.ok(!OFFICERS.some((o) => /paw patrol|chase|marshall|skye|ranger rick|smokey/i.test(o.name))); });
test('offences: off-zebra road tiles (police) and flowers (rangers), only after a dwell, only with an officer of that force in sight', () => {
  assert.equal(offenseAt(T.ROAD, 10, 43, T), 'jaywalk'); assert.equal(offenseAt(T.ROAD, W.AVENUE - 2, 43, T), null); assert.equal(offenseAt(T.FLOWER, 5, 85, T), 'flowers'); assert.equal(offenseAt(T.PLAZA, 5, 50, T), null);
  const officers = [{ id: 'sim:pd-pip', force: 'police', x: 10, y: 45 }, { id: 'sim:rg-moss', force: 'rangers', x: 10, y: 44 }];
  assert.equal(decide({ offense: 'jaywalk', dwellMs: 1000, at: { x: 10, y: 43 }, officers }), null); assert.deepEqual(decide({ offense: 'jaywalk', dwellMs: 2100, at: { x: 10, y: 43 }, officers }), { offense: 'jaywalk', by: 'sim:pd-pip' });
  assert.equal(decide({ offense: 'jaywalk', dwellMs: 9000, at: { x: 30, y: 43 }, officers }), null); assert.equal(decide({ offense: 'flowers', dwellMs: 9000, at: { x: 10, y: 43 }, officers: officers.slice(0, 1) }), null); });
// drive the real patrol tick: stand in the road next to Officer Pip for `sec`
const jaywalk = (R, P, sec = 2.2, view = {}) => { let out = null; for (let i = 0; i < sec * 60; i++) { const t = R.now() / 1000, o = officersAt(t).find((x) => x.id === pip.id); R.tick(1000 / 60);
  const r = P.tick(1 / 60, t, Object.freeze({ driving: false, ...view, x: (Math.floor(o.x) + 0.5) * 32, y: 43.5 * 32 }), tileAt, T); if (r) out = r; } return out; };
test('opted-in player: warning, then a fine, then (3rd in 10 min) a detention of at most 60 s with every way out; nothing for non-joined players', async () => {
  const R0 = walletRig(), w0 = R0.wallet(), P0 = createPatrol({ wallet: w0, now: R0.now }); assert.equal(jaywalk(R0, P0, 5), null); assert.equal(w0.entries().length, 0, 'not joined: never policed');
  const { R, w } = await policeRig(), P = createPatrol({ wallet: w, now: R.now }), bal = w.balance();
  const a = jaywalk(R, P); assert.equal(a.cite.data.fine, 0); assert.equal(P.notice.kind, 'cited'); assert.equal(jaywalk(R, P, 3), null, 'cooldown: one a minute');
  R.tick(POLICE.cooldownMs); const b = jaywalk(R, P); assert.equal(b.cite.data.fine, POLICE.fine); assert.equal(w.balance(), bal - POLICE.fine); assert.equal(b.detained, null);
  R.tick(POLICE.cooldownMs); const c = jaywalk(R, P); assert.ok(c.detained); assert.ok(c.detained.data.sec <= 60); assert.equal(P.notice.kind, 'detained');
  const st = w.state(); assert.ok(st.held && st.held.leftMs <= POLICE.maxDetainSec * 1000);
  P.walkItOff(); assert.ok(P.notice.waiting); const here = Object.freeze({ x: (c.detained.data.tx + 0.5) * 32, y: (c.detained.data.ty + 0.5) * 32 }); for (let i = 0; i < 50; i++) { R.tick(1000); P.tick(1, R.now() / 1000, here, () => T.PLAZA, T); }
  assert.ok(!w.state().held && !w.state().heldRecord); assert.equal(w.entries().at(-1).data.reason, 'walked it off'); assert.equal(P.notice.kind, 'released'); });
test('ways out: leave the scene (walk 9 tiles / a gap in play), bail, opt out; the tick never moves or blocks the player', async () => {
  for (const way of ['walk', 'gap', 'bail', 'out']) { const { R, w, cite3 } = await policeRig(), P = createPatrol({ wallet: w, now: R.now }); cite3(); w.detain('sim:pd-pip', 'jaywalk', 10, 43);
    const v = Object.freeze({ x: 10.5 * 32, y: 43.5 * 32 }); P.tick(0.016, 0, v, () => T.PLAZA, T); assert.ok(w.state().held);
    if (way === 'walk') { R.tick(100); P.tick(0.016, 0, Object.freeze({ x: 19.6 * 32, y: 43.5 * 32 }), () => T.PLAZA, T); assert.equal(w.entries().at(-1).data.reason, 'left the scene'); }
    if (way === 'gap') { R.tick(5000); P.tick(0.016, 0, v, () => T.PLAZA, T); assert.equal(w.entries().at(-1).data.reason, 'left the scene'); }
    if (way === 'bail') { const b = w.balance(); P.payBail(); assert.equal(w.balance(), b - POLICE.bail); assert.equal(w.entries().at(-1).action, 'pm.bail'); }
    if (way === 'out') { P.optOut(); assert.equal(w.state().joined, false); }
    assert.ok(!w.state().held, way); assert.equal(v.x, 10.5 * 32); }
  const src = ['patrol.js', 'patrolui.js', 'police.js'].map((f) => readFileSync(root + 'src/sim/' + f, 'utf8')).join('\n');
  assert.ok(!/\bstate\.|player\.(x|y|moving)\s*=|keys\.|preventDefault|stopPropagation|\.disabled\s*=\s*true|openPanel|#chat/.test(src.replace(/^\s*\/\/.*$/gm, '')), 'sim police code never touches game state, input or chat');
  const main = readFileSync(root + 'src/main.js', 'utf8'); assert.match(main, /PAB\.simTick\(dt, time, \{ x: p\.x, y: p\.y, driving: !!drive, busy: !!panel \}, \(tx, ty\) => \(isSolid\(tx, ty\) \? -1 : MAP\[ty\]\[tx\]\), T\)/, 'main.js passes a fresh copy, not the player object'); });
test('caps: 4 citations and 2 detentions a day; detentions need 3 citations in 10 min', async () => {
  const { R, w } = await policeRig(); for (let i = 0; i < 4; i++) { w.cite('sim:pd-pip', 'jaywalk', 10, 43); R.tick(POLICE.cooldownMs + 1); } assert.throws(() => w.cite('sim:pd-pip', 'jaywalk', 10, 43), /citations a day/);
  const X = await policeRig(); X.w.cite('sim:pd-pip', 'jaywalk', 10, 43); X.R.tick(POLICE.repeatWindowMs + 1); X.w.cite('sim:pd-pip', 'jaywalk', 10, 43); X.R.tick(61e3); X.w.cite('sim:pd-pip', 'jaywalk', 10, 43); assert.throws(() => X.w.detain('sim:pd-pip', 'jaywalk', 10, 43), /detention only after/);
  assert.ok(POLICE.maxDetainSec <= 60 && POLICE.detainSec <= POLICE.maxDetainSec); });
test('$KIBBLE cosmetics give no edge in any police outcome (full patrol run, plain vs dressed in the priciest items)', async () => {
  const runFor = async (extra) => { const { R, w } = await policeRig(), P = createPatrol({ wallet: w, now: R.now }); const log = [];
    for (let k = 0; k < 3; k++) { const r = jaywalk(R, P, 2.3, extra); log.push(r ? [r.cite.data.fine, !!r.detained] : null); R.tick(POLICE.cooldownMs); }
    return JSON.stringify([log, w.entries().filter((e) => e.action.startsWith('police.') || e.action.startsWith('pm.f') || e.action === 'pm.bail').map((e) => [e.action, e.actor.startsWith('player:') ? 'me' : e.actor, e.value.amount, e.data?.fine ?? null, e.data?.sec ?? null])]); };
  const plain = await runFor({}), fancy = await runFor({ outfit: { hat: 'sapphire_crown', neck: 'diamond_chain', top: 'plat_suit', eyes: 'plat_shades' }, kibble: 1e7, bones: 1e9, items: ['gold_suit'], vip: 1, score: 1e6, coat: 'golden' });
  assert.equal(plain, fancy); assert.deepEqual(Object.keys(observe({ x: 1, y: 2, outfit: {}, kibble: 5 })), ['x', 'y']); });
test('ranger shift: litter on walkable park tiles, all of it, not too fast; pays a diminishing wage; cooldown + shared daily cap', async () => {
  const { R, w } = await policeRig({ wages: 0 }), P = createPatrol({ wallet: w, now: R.now }); P.startShift(); P.tick(0.016, 0, { x: 38.5 * 32, y: 82.5 * 32 }, tileAt, T);
  const L = P.litter(); assert.equal(L.length, SHIFT.litter); for (const l of L) { assert.ok(!W.isSolid(Math.floor(l.x), Math.floor(l.y))); assert.ok(l.y >= PL.PARK.y && l.y < PL.PARK.y + PL.PARK.h); }
  const before = w.balance(); for (const l of L) { R.tick(1000); P.tick(0.016, 1, { x: l.x * 32, y: l.y * 32 }, tileAt, T); } assert.equal(w.balance(), before, 'too fast: not paid yet');
  R.tick(SHIFT.minMs); P.tick(0.016, 2, { x: 1, y: 1 }, tileAt, T); assert.equal(w.balance(), before + FLOWS.wage.base); assert.equal(w.entries().at(-1).data.why, 'ranger shift'); assert.equal(P.notice.kind, 'paid');
  assert.throws(() => P.startShift(), /cooldown/); R.tick(FLOWS.wage.cooldownMs); assert.equal(w.quote('wage').amount, Math.floor(FLOWS.wage.base * FLOWS.wage.decay)); });
test('no offences while driving or while a panel is open', async () => { const { R, w } = await policeRig(), P = createPatrol({ wallet: w, now: R.now }); const n = w.entries().length;
  assert.equal(jaywalk(R, P, 4, { busy: true }), null); assert.equal(jaywalk(R, P, 4, { driving: true }), null); assert.equal(w.entries().length, n); });

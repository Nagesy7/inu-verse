// Phase 5: the Pawsley Pup Clinic. Cartoon bumps (opt-in twice, <= 60 s, cosmetic or a small slowdown, always a way
// out), free treatment with an optional co-pay, medic shifts that pay ordinary sim wages only for sim-pup calls, no
// chance/stakes, no cosmetic edge, no farming, every event anchored, nothing touching Bones/$KIBBLE/prizes/scores/other games.
import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
const W = await import('../src/world.js'); const PL = await import('../src/sim/place.js');
const M = await import('../src/sim/medical.js'); const { createClinic, shiftCall, staffPose, patientsAt, rounds } = await import('../src/sim/clinic.js');
const { medRig, clinicWalk, walletRig } = await import('../src/sim/checks.js'); const { anchorPost, memoryStore, anchorGet } = await import('../src/sim/anchor.js');
const { createPawWallet } = await import('../src/sim/pawbook.js'); const { createSim } = await import('../src/sim/engine.js'); const { FLOWS } = await import('../src/sim/economy.js');
const { BENCH } = await import('../src/sim/court.js');
const root = new URL('..', import.meta.url).pathname, T = W.T, tileAt = (tx, ty) => (W.isSolid(tx, ty) ? -1 : W.MAP[ty][tx]), src = (f) => readFileSync(root + f, 'utf8');
const code = (f) => src(f).replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
const { MED, AILMENTS } = M;
// drive the real clinic tick through the real world tiles
const run = (R, w, C, pts, extra = {}) => { const out = []; let [px, py] = pts[0]; for (const [x, y, ms] of pts) { const n = Math.max(1, Math.round(ms / 50)), x0 = px, y0 = py;
  for (let i = 1; i <= n; i++) { R.tick(50); px = x0 + ((x - x0) * i) / n; py = y0 + ((y - y0) * i) / n; const e = C.tick(0.05, 0, Object.freeze({ x: px * 32, y: py * 32, driving: false, busy: false, ...extra }), tileAt, T); if (e) out.push(e); } } return out; };

test('clinic: solid, reachable, its own door clear of others; staff, call spots and the medics\' path stand on walkable tiles; the café door matches world.js', () => {
  const C = PL.CLINIC; for (let x = C.x; x < C.x + C.w; x++) assert.ok(W.isSolid(x, C.y)); assert.ok(!W.isSolid(C.tx, C.ty)); assert.ok(W.findPath(33, 47, C.tx, C.ty));
  const its = W.interactables({ plots: {}, homeShare: {} }); assert.ok(its.some((i) => i.kind === 'bureau' && i.tab === 'clinic'));
  assert.ok(!its.some((i) => i.tab !== 'clinic' && Math.abs(i.tx - C.tx) <= 3 && Math.abs(i.ty - C.ty) <= 3), 'no other door within 3 tiles');
  for (const s of M.STAFF) assert.ok(!W.isSolid(Math.floor(s.post[0]), Math.floor(s.post[1])), s.id);
  for (const [x, y] of M.CALL_SPOTS) { assert.ok(!W.isSolid(Math.floor(x), Math.floor(y)), `${x},${y}`); assert.notEqual(tileAt(Math.floor(x), Math.floor(y)), T.ROAD); }
  for (let s = 0; s < 40; s++) { const r = rounds(M.callAt(14e6 + s)); for (let i = 1; i < r.out.length; i++) { const [ax, ay] = r.out[i - 1], [bx, by] = r.out[i]; for (let k = 0; k <= 20; k++) { const x = ax + ((bx - ax) * k) / 20, y = ay + ((by - ay) * k) / 20; assert.ok(!W.isSolid(Math.floor(x), Math.floor(y)), `medic path ${x},${y}`); } } }
  const cafe = its.find((i) => i.kind === 'building' && i.id === 'cafe'); assert.equal(cafe.tx, PL.CAFE_DOOR.tx); assert.equal(cafe.ty, PL.CAFE_DOOR.ty);
  assert.ok(!M.STAFF.concat(M.PATIENTS).some((p) => /grey'?s|house|dolittle|scooby|lassie|snoopy|bluey/i.test(p.name)), 'original names');
});
test('opt-in twice: nothing before joining, off by default after, the server refuses a bump with bumps off; leaving switches them off', async () => {
  const U = walletRig(), u = U.wallet(); assert.throws(() => u.bumpsOn(), /join/); assert.equal(u.canInjure(), false);
  const A = await medRig({ bumps: false }); assert.equal(A.w.state().med.bumps, false); assert.equal(A.w.canInjure(), false); await A.sync();
  const st = await A.forge((acct) => ({ actor: AILMENTS.paw.cause, action: 'med.injury', target: acct, data: { ail: 'paw', tx: 10, ty: 31, sec: 30 } })); assert.equal(st, 422);
  A.w.bumpsOn(); A.R.tick(6 * 60e3); assert.equal(A.w.canInjure(), true); A.w.injure('paw', 10, 31); A.w.leave(); const s = A.w.state(); assert.equal(s.med.bumps, false); assert.equal(s.med.hurt, null);
  const C = createClinic({ wallet: A.w, now: A.R.now }); assert.equal(run(A.R, A.w, C, [[10.5, 31.5, 50], [10.5, 31.5, 50e3]]).length, 0, 'no bumps while out');
});
test('the real tick: sunburn (45 s in the sun), stubbed paw (sprint into a wall), bee sting (park flowers while the bees are busy), tummy ache (after the café)', async () => {
  { const A = await medRig(); A.R.tick(6 * 60e3); const C = createClinic({ wallet: A.w, now: A.R.now }); const e = run(A.R, A.w, C, [[40.5, 47.5, 50], [40.5, 47.5, 46e3]]); assert.equal(e[0]?.data.ail, 'sunburn'); assert.equal(C.walkFactor(), 1, 'sunburn is just looks'); }
  { const A = await medRig(); A.R.tick(6 * 60e3); const C = createClinic({ wallet: A.w, now: A.R.now }); let tx = 0; for (let x = 6; x < 60; x++) if (!W.isSolid(x, 47) && W.isSolid(x, 46)) { tx = x; break; }
    assert.ok(tx > 0); const e = run(A.R, A.w, C, [[tx + 0.5, 47.9, 50], [tx + 0.5, 47.9, 100], [tx + 0.5, 47.1, 160], [tx + 0.5, 47.1, 500]]); // sprint north into the wall at tx,46
    assert.equal(e[0]?.data.ail, 'paw', `ran into the wall north of ${tx},47`); assert.equal(C.walkFactor(), 0.85); }
  { const A = await medRig(); A.R.tick(6 * 60e3); while (!M.beesAbout(A.R.now())) A.R.tick(60e3); const C = createClinic({ wallet: A.w, now: A.R.now }); let spot = null;
    for (let ty = PL.PARK.y; ty < PL.PARK.y + PL.PARK.h && !spot; ty++) for (let tx = PL.PARK.x; tx < PL.PARK.x + PL.PARK.w && !spot; tx++) { const t = tileAt(tx, ty); if (t < 0 || t === T.FLOWER || t === T.ROAD) continue; for (const [i, j] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (tileAt(tx + i, ty + j) === T.FLOWER) { spot = [tx, ty]; break; } }
    assert.ok(spot); const e = run(A.R, A.w, C, [[spot[0] + 0.5, spot[1] + 0.5, 50], [spot[0] + 0.5, spot[1] + 0.5, 3200]]); assert.equal(e[0]?.data.ail, 'sting'); }
  { const A = await medRig(); A.R.tick(6 * 60e3); const C = createClinic({ wallet: A.w, now: A.R.now }), d = PL.CAFE_DOOR; run(A.R, A.w, C, [[d.tx + 0.5, d.ty + 0.6, 50], [d.tx + 0.5, d.ty + 0.6, 1500]], { busy: true });
    const e = run(A.R, A.w, C, [[d.tx + 0.5, d.ty + 0.6, 50], [d.tx + 3.5, d.ty + 0.6, 2000], [d.tx + 3.5, d.ty + 0.6, 14e3]]); assert.equal(e[0]?.data.ail, 'tummy'); assert.equal(C.walkFactor(), 0.9); }
});
test('every bump is cartoon, <= 60 s, cosmetic or a small slowdown; the walk factor goes back to 1 by itself; ways out are always there and logged', async () => {
  for (const a of Object.values(AILMENTS)) { assert.ok(a.sec <= 60 && a.sec > 0); assert.ok(a.slow >= 0.85 && a.slow <= 1); assert.ok(!/blood|broken|bone fracture|wound|gash|vomit/i.test(JSON.stringify(a))); }
  const A = await medRig({ wages: 0 }); A.R.tick(6 * 60e3); const C = createClinic({ wallet: A.w, now: A.R.now }); A.w.injure('paw', 10, 31); assert.equal(C.walkFactor(), 0.85);
  A.R.tick(31e3); assert.equal(M.slowFactor({ hurt: A.w.state().med.hurt }, A.R.now()), 1); run(A.R, A.w, C, [[10.5, 31.5, 100]]); assert.equal(A.w.state().med.hurt, null, 'time up'); assert.equal(C.walkFactor(), 1);
  A.R.tick(MED.injuryGapMs); A.w.injure('paw', 10, 31); run(A.R, A.w, C, [[10.5, 31.5, 50], [14.5, 31.5, 900], [10.5, 31.5, 900], [14.5, 31.5, 900], [10.5, 31.5, 900]]); assert.equal(A.w.state().med.hurt, null, 'walked it off');
  A.R.tick(MED.injuryGapMs); A.w.injure('sunburn', 10, 31); assert.equal(A.w.balance(), 0); A.w.care(); assert.equal(A.w.state().med.hurt, null, 'free treatment with nothing in the wallet'); assert.equal(A.w.balance(), 0);
  const s = await A.sync(); assert.equal(s.unsynced, 0); assert.equal(s.server, 'ok');
  const B = await medRig(); B.R.tick(6 * 60e3); B.w.injure('tummy', 6, 20); B.w.bumpsOff(); assert.equal(B.w.state().med.hurt, null, 'switching bumps off clears it');
  assert.throws(() => B.w.injure('paw', 6, 20), /switched them on/); assert.match(code('src/sim/clinic.js'), /observe\(view\)/); assert.ok(!/view\.(x|y)\s*=|player\.(x|y)\s*=/.test(code('src/sim/clinic.js')), 'the tick never moves the player');
});
test('free treatment with an optional co-pay: chip in or waive it, exactly 2, once, into the sink', async () => {
  const A = await medRig(); A.R.tick(6 * 60e3); A.w.injure('paw', 10, 31); const b0 = A.w.balance(), c = A.w.care(); assert.equal(A.w.balance(), b0, 'free');
  A.w.copay(c.seq); assert.equal(A.w.balance(), b0 - MED.copay); assert.throws(() => A.w.copay(c.seq), /already/); await A.sync();
  const big = await A.forge((acct) => ({ actor: acct, action: 'pm.copay', target: 'sim:sink', value: { amount: 50, unit: 'PAWMARK' }, data: { for: c.seq } })); assert.equal(big, 422);
  const doc = await A.forge((acct) => ({ actor: acct, action: 'med.care', target: acct, data: { for: c.seq } })); assert.equal(doc, 422, 'a player is not the doctor');
});
test('medic shift: walk to the sim pup on the call, tap the steps in order, paid an ordinary wage (shared cap); everything anchored', async () => {
  const A = await medRig({ wages: 0 }); const C = createClinic({ wallet: A.w, now: A.R.now }); let sh = C.startShift(); const c = sh.c; if (A.R.now() < c.start) A.R.tick(c.start - A.R.now() + 10);
  run(A.R, A.w, C, [[59.5, 49.6, 50], [c.x, c.y + 0.3, 3000]]); assert.equal(C.shift.state, 'task'); const st = AILMENTS[c.ail].steps; assert.deepEqual([...C.shift.order].sort(), [0, 1, 2]);
  C.tap(2); C.tap(0); const q = A.w.quote('wage').amount; C.tap(1); C.tap(2); assert.equal(C.shift.state, 'done'); assert.equal(A.w.balance(), q); void st;
  const es = A.w.entries(), t = es.find((e) => e.action === 'med.treat'), wg = es.find((e) => e.action === 'pm.wage' && e.data.why === 'medic shift');
  assert.ok(M.PATIENT_IDS.includes(t.target)); assert.equal(t.data.slips, 1); assert.equal(wg.data.for, t.seq); const s = await A.sync(); assert.equal(s.unsynced, 0); assert.equal(s.balance, q);
  assert.equal(M.grade({ ail: 'paw', taps: [1, 2, 1, 2, 0, 1, 2] }).failed, true); assert.equal(M.grade({ ail: 'paw', taps: [0, 1, 2] }).done, true);
  // the wage is the shared one: a desk shift right after is refused by the same cooldown
  assert.throws(() => A.w.payWage('desk shift'), /cooldown/); assert.equal(FLOWS.wage.dailyCap, 60);
  const p = patientsAt(A.R.now(), { mineSlot: c.slot, mineDone: true }).find((x) => x.c.slot === c.slot); assert.ok(p?.treated);
  for (const s2 of M.STAFF.filter((x) => x.role === 'medic')) assert.equal(!!(staffPose(s2, A.R.now(), c.slot).treating && staffPose(s2, A.R.now(), c.slot).slot === c.slot), false, 'the sim medics leave your call to you');
});
test('anti-farm: no treating yourself, a friend, the wrong pup or a closed call; no wage for your own bump or twice; two wallets gain nothing together', async () => {
  const A = await medRig({ wages: 0 }); A.R.tick(6 * 60e3); const inj = A.w.injure('paw', 10, 31); A.w.care(); await A.sync(); const slot = M.slotAt(A.R.now()), c = M.callAt(slot);
  const f = (o) => A.forge((acct) => ({ actor: acct, action: 'med.treat', target: c.pt, data: { call: slot, ail: c.ail, slips: 0 }, ...o(acct) }));
  assert.equal(await f((acct) => ({ target: acct })), 422); assert.equal(await f(() => ({ target: 'player:p00000000000000aa' })), 422); assert.equal(await f(() => ({ target: M.PATIENT_IDS.find((p) => p !== c.pt) })), 422);
  assert.equal(await f(() => ({ data: { call: slot + 3, ail: M.callAt(slot + 3).ail, slips: 0 }, target: M.callAt(slot + 3).pt })), 422, 'a future call');
  assert.equal(await A.forge((acct) => ({ actor: 'sim:issuer', action: 'pm.wage', target: acct, value: { amount: 10, unit: 'PAWMARK' }, data: { why: 'medic shift', for: inj.seq } })), 422);
  // a modified client injuring itself and "treating" it: refused (patients are sim pups only); its own bumps never pay
  const self = await A.forge((acct) => ({ actor: acct, action: 'med.treat', target: acct, data: { call: slot, ail: 'paw', slips: 0 } })); assert.equal(self, 422);
  // two wallets on two networks: A bumps itself, B "treats" A, B claims a wage -> refused; neither wallet moves
  const B = await medRig({ wages: 0 }); await B.sync(); const bA = A.w.balance(), bB = B.w.balance();
  const cross = await B.forge(() => ({ actor: B.w.account(), action: 'med.treat', target: A.w.account(), data: { call: slot, ail: 'paw', slips: 0 } })); assert.equal(cross, 422);
  assert.equal(A.w.balance(), bA); assert.equal(B.w.balance(), bB);
  const r = A.w.treatCall(slot, 0); assert.ok(r.wage); assert.throws(() => A.w.treatCall(slot, 0), /already treated/); await A.sync();
  assert.equal(await A.forge((acct) => ({ actor: 'sim:issuer', action: 'pm.wage', target: acct, value: { amount: 8, unit: 'PAWMARK' }, data: { why: 'medic shift', for: r.treat.seq } })), 422, 'one wage per treatment');
  // engine: only medics treat, never themselves; bumps capped at 60 s; players only after opt-in
  const s = createSim({ players: ['zachary'] }); s.register({ id: 'sim:md-a', group: 'medical' }); s.register({ id: 'sim:pd-a', group: 'police' }); s.register({ id: 'sim:pt-a', group: 'medical' });
  assert.throws(() => s.act('sim:pd-a', 'med.treat', 'sim:pt-a'), /may not/); assert.throws(() => s.act('sim:md-a', 'med.treat', 'sim:md-a'), /themselves/);
  assert.throws(() => s.act('sim:md-a', 'med.injury', 'player:zachary', { data: { sec: 61 } }), /1\.\.60/); assert.ok(s.act('sim:md-a', 'med.injury', 'player:zachary', { data: { sec: 30 } }));
});
test('$KIBBLE cosmetics give no edge: the same walk, the same bumps; the same taps, the same grade; medical code never reads looks', async () => {
  const rich = { outfit: { hat: 'crown', neck: 'diamond_chain', top: 'gold_suit' }, kibble: 1e6, bones: 1e9, items: ['alpha_kennel'], score: 99999, vip: true, look: { hat: 'crown' } };
  const walk = [[40.5, 47.5, 50], [40.5, 47.5, 46e3], [44.5, 47.5, 1000], [44.5, 47.5, 47e3]];
  const go = async (extra) => { const A = await medRig(); A.R.tick(6 * 60e3); const C = createClinic({ wallet: A.w, now: A.R.now }); return run(A.R, A.w, C, walk, extra).map((e) => `${e.data.ail}@${e.data.tx},${e.data.ty}`); };
  assert.deepEqual(await go({}), await go(rich));
  for (let i = 0; i < 300; i++) { const ail = M.AIL_KEYS[i % 4], taps = [i % 3, (i * 7) % 3, 0, 1, 2]; assert.deepEqual(M.grade({ ail, taps }), M.grade({ ail, taps, ...rich, player: rich })); }
  for (const f of ['src/sim/medical.js', 'src/sim/clinic.js']) assert.ok(!/\b(outfit|look|cosmetic|kibble|bones|score|vip|items)\b/i.test(code(f).replace(/\$KIBBLE|Bones, \$KIBBLE, prizes, scores/g, '').replace(/outfit: \{[^}]*\}/g, '')), f);
});
test('no chance, no stakes: the call timetable and the bees are fixed hashes of the clock; no Math.random, no bets in the clinic files', () => {
  assert.deepEqual(M.callAt(123), M.callAt(123)); assert.equal(M.beesAbout(5e11), M.beesAbout(5e11 + 1000)); const seen = new Set(); for (let s = 0; s < 400; s++) seen.add(M.callAt(s).ail); assert.equal(seen.size, 4);
  for (const f of ['src/sim/medical.js', 'src/sim/clinic.js', 'src/sim/clinicart.js', 'src/sim/clinicui.js']) assert.ok(!/Math\.random|\bbet\b|wager|odds|lotter|raffle|jackpot|casino|gacha/i.test(code(f)), f);
});
test('fixes: the judge stands clear of the palm, the guide pointer label slides off the sim buildings\' signs, main.js walks at PAB.walkFactor()', () => {
  const j = BENCH.find((b) => b.role === 'judge'); assert.ok(j.post[0] >= PL.COURTHOUSE.x, 'in front of the courthouse, not the palm west of it');
  const g = src('src/guideui.js'); assert.match(g, /function labelSpot/); assert.match(src('src/main.js'), /guide\.drawScreen\(ctx, ox, oy, ZOOM, time, PAB\.signRects\(\)\)/);
  assert.match(src('src/main.js'), /const speed = MOB\.WALK_SPEED \* PAB\.walkFactor\(\);/);
  const B = src('src/sim/bureau.js'); assert.match(B, /export const signRects/);
});

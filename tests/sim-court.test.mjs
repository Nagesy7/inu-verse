// Phase 4: the Barkley Courthouse. Contest anchored citations/detentions in a short evidence-review trial; dismissed =
// refunded exactly, upheld = unchanged. Evidence immutable, verdicts appended, opt-in, time-capped, walk out any time,
// no chance/stakes, no cosmetic edge, no farming, nothing touching Bones/$KIBBLE/prizes/scores/other games.
import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
const W = await import('../src/world.js'); const PL = await import('../src/sim/place.js');
const { COURT, BENCH, GROUNDS, hear, facts, createTrial, groundsFor } = await import('../src/sim/court.js');
const { POLICE } = await import('../src/sim/police.js'); const { officersAt, OFFICERS } = await import('../src/sim/force.js'); const { createPatrol } = await import('../src/sim/patrol.js');
const { courtRig, walletRig, policeRig } = await import('../src/sim/checks.js'); const { hashOf } = await import('../src/sim/ledger.js'); const { createSim } = await import('../src/sim/engine.js');
const { anchorPost, K } = await import('../src/sim/anchor.js'); const { STORE_KEY } = await import('../src/sim/pawbook.js');
const root = new URL('..', import.meta.url).pathname, T = W.T, tileAt = (tx, ty) => (W.isSolid(tx, ty) ? -1 : W.MAP[ty][tx]), src = (f) => readFileSync(root + f, 'utf8');
const code = (f) => src(f).replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

test('courthouse: solid, reachable, its own spot clear of other doors; the bench stands on walkable tiles', () => {
  const C = PL.COURTHOUSE; for (let x = C.x; x < C.x + C.w; x++) assert.ok(W.isSolid(x, C.y)); assert.ok(!W.isSolid(C.tx, C.ty)); assert.ok(W.findPath(31, 70, C.tx, C.ty));
  const its = W.interactables({ plots: {}, homeShare: {} }); assert.ok(its.some((i) => i.kind === 'bureau' && i.tab === 'court'));
  assert.ok(!its.some((i) => i.tab !== 'court' && Math.abs(i.tx - C.tx) <= 3 && Math.abs(i.ty - C.ty) <= 3), 'no other door within 3 tiles');
  for (const b of BENCH) assert.ok(!W.isSolid(Math.floor(b.post[0]), Math.floor(b.post[1])), b.id);
  assert.deepEqual(BENCH.map((b) => b.role), ['judge', 'clerk', 'defence']); assert.ok(!BENCH.some((b) => /judy|wapner|perry mason|matlock|phoenix wright/i.test(b.name)));
});
test('the real patrol tick (wall-clock beat) makes citations the court can back up', async () => {
  for (let n = 0; n < 4; n++) { const { R, w } = await policeRig({ wages: 0 }), P = createPatrol({ wallet: w, now: R.now }); R.tick(n * 9000); let hit = null;
    for (let i = 0; i < 60 * 20 && !hit; i++) { const o = officersAt(R.now() / 1000).find((x) => x.id === 'sim:pd-pip'); R.tick(1000 / 60);
      hit = P.tick(1 / 60, 0, Object.freeze({ x: (Math.floor(o.x) + (n % 3)) * 32 + 16, y: 44.5 * 32 }), tileAt, T); }
    assert.ok(hit, 'cited'); const rec = { k: 'cite', e: hit.cite, paid: 0 }, f = facts(rec); assert.ok(f.admissible, JSON.stringify(f)); assert.ok(f.dist <= POLICE.seeTiles + COURT.slackTiles); }
});
test('trial: dismissed refunds exactly what was paid, upheld changes nothing, once per record, all anchored', async () => {
  const A = await courtRig(); const warn = A.cite('close'), far = A.cite('far'); await A.sync(); const b0 = A.w.balance();
  const t = createTrial({ wallet: A.w, seq: far.cite.seq, now: A.R.now }); assert.equal(t.state, 'open'); const r = t.present('sightline');
  assert.equal(r.outcome, 'dismissed'); assert.equal(r.refund.value.amount, far.fine); assert.equal(A.w.balance(), b0 + far.fine); assert.equal(r.refund.action, 'pm.refund');
  const u = createTrial({ wallet: A.w, seq: warn.cite.seq, now: A.R.now }).present('sightline'); assert.equal(u.outcome, 'upheld'); assert.equal(u.refund, null); assert.equal(A.w.balance(), b0 + far.fine);
  assert.throws(() => A.w.contest(far.cite.seq, 'sightline', A.R.now()), /already tried/); const s = await A.sync(); assert.equal(s.unsynced, 0); assert.equal(s.server, 'ok');
  const d = A.w.docket(); assert.equal(d.find((x) => x.e.seq === far.cite.seq).verdict, 'dismissed'); assert.equal(d.find((x) => x.e.seq === warn.cite.seq).verdict, 'upheld');
  assert.equal(s.balance, b0 + far.fine, 'the server agrees');
});
test('evidence is immutable: the court reads the anchored entry, re-hashes it, never edits it; verdicts are new entries', async () => {
  const A = await courtRig(); A.cite('close'); const far = A.cite('far'); await A.sync(); const before = JSON.stringify(A.w.docket().find((x) => x.e.seq === far.cite.seq).e);
  const r = A.w.contest(far.cite.seq, 'sightline', A.R.now()); await A.sync(); const rec = A.w.docket().find((x) => x.e.seq === far.cite.seq);
  assert.equal(JSON.stringify(rec.e), before); assert.equal(hashOf(rec.e), rec.e.hash); assert.ok(r.verdict.seq > far.cite.seq); assert.equal(rec.vseq, r.verdict.seq);
  assert.ok(!/\.e\.(data|ts|actor|hash|value)\s*=|delete\s+\w+\.e\b/.test(code('src/sim/court.js')), 'court.js has no write into a filed entry');
  // a verdict that tries to carry evidence changes is refused by the server
  const sv = JSON.parse(A.R.mem.get(STORE_KEY)), cp = JSON.parse(await A.R.kv.get(K.anchor(sv.pid))), acct = 'player:' + sv.pid; A.R.tick(3000);
  const e = { seq: cp.seq, ts: A.R.now(), actor: COURT.judge, group: 'sim', action: 'court.verdict', target: acct, value: { amount: 0, unit: 'PAWMARK' }, data: { for: far.cite.seq, ground: 'sightline', outcome: 'dismissed', opened: A.R.now() - 10, tx: 1 }, prev: cp.head }; e.hash = hashOf(e);
  assert.equal((await A.R.post({ pid: sv.pid, token: sv.token, entries: [e] })).status, 422);
});
test('opt-in, the 90 s cap and the walk-out: the default is always the original outcome', async () => {
  const C = await courtRig(); C.cite('close'); const c = C.cite('far'); await C.sync(); const n = C.w.state().seq;
  const a = createTrial({ wallet: C.w, seq: c.cite.seq, now: C.R.now }); assert.equal(a.walkOut(), 'walked out'); assert.throws(() => a.present('sightline'), /over/);
  const b = createTrial({ wallet: C.w, seq: c.cite.seq, now: C.R.now }); C.R.tick(COURT.trialSec * 1000 + 1); assert.equal(b.state, 'timed out'); assert.throws(() => b.present('sightline'), /over/);
  assert.equal(C.w.state().seq, n, 'nothing logged'); assert.equal(C.w.docket().find((x) => x.e.seq === c.cite.seq).verdict, null);
  assert.ok(COURT.trialSec <= 90); C.w.leave(); assert.throws(() => C.w.contest(c.cite.seq, 'sightline', C.R.now()), /join/);
  assert.throws(() => walletRig().wallet().contest(1, 'sightline', 0), /join/);
});
test('anti-farm: self-made citations are inadmissible, 3 verdicts a day, and no loop can gain a Pawmark', async () => {
  const B = await courtRig(); B.cite('close'); const fk = B.cite('fake'); await B.sync(); assert.throws(() => B.w.contest(fk.cite.seq, 'sightline', B.R.now()), /inadmissible/);
  // farm: three admissible "far" citations, each fined, each contested
  const F = await courtRig({ wages: 3 }), start = F.w.balance(); F.cite('close'); const cs = [F.cite('far'), F.cite('far'), F.cite('far')]; await F.sync(); const paid = cs.reduce((s, c) => s + c.fine, 0);
  let refunded = 0; for (const c of cs) refunded += F.w.contest(c.cite.seq, 'sightline', F.R.now()).refunded; await F.sync();
  assert.ok(paid > 0); assert.equal(refunded, paid); assert.equal(F.w.balance(), start, 'net zero: refunds are exactly what was paid');
  const H = await courtRig({ wages: 4 }); const hw = H.cite('close'), hs = [H.cite('far'), H.cite('far'), H.cite('far')]; await H.sync(); for (const c of hs) H.w.contest(c.cite.seq, 'sightline', H.R.now());
  assert.equal(H.w.state().verdictsToday, COURT.verdictsPerDay); assert.throws(() => H.w.contest(hw.cite.seq, 'sightline', H.R.now()), /verdicts a day/); const extra = hw;
  // nobody contests someone else's record: another wallet's token is refused
  const sv = JSON.parse(H.R.mem.get(STORE_KEY)), cp = JSON.parse(await H.R.kv.get(K.anchor(sv.pid))); H.R.tick(3000);
  const e = { seq: cp.seq, ts: H.R.now(), actor: COURT.judge, group: 'sim', action: 'court.verdict', target: 'player:' + sv.pid, value: { amount: 0, unit: 'PAWMARK' }, data: { for: extra.cite.seq, ground: 'sightline', outcome: 'upheld', opened: H.R.now() - 10 }, prev: cp.head }; e.hash = hashOf(e);
  assert.equal((await H.R.post({ pid: sv.pid, token: 'e'.repeat(48), entries: [e] })).status, 403);
});
test('detentions: the "priors" defence holds once the citations behind it are dismissed, and bail comes back', async () => {
  const A = await courtRig({ wages: 3 }); const c1 = A.cite('far'), c2 = A.cite('far'), c3 = A.cite('far', { detain: true, bail: true }), d = c3.detained; await A.sync();
  const rec = A.w.docket().find((x) => x.e.seq === d.seq); assert.equal(rec.k, 'detain'); assert.equal(rec.paid, POLICE.bail); assert.deepEqual(groundsFor(rec).sort(), ['crossing', 'priors', 'sightline']);
  assert.equal(hear({ record: rec, ground: 'priors', file: Object.fromEntries(A.w.docket().map((r) => [r.e.seq, r])) }).outcome, 'upheld', 'all 3 priors stand');
  A.w.contest(c2.cite.seq, 'sightline', A.R.now()); await A.sync(); const b = A.w.balance(); const r = A.w.contest(d.seq, 'priors', A.R.now());
  assert.equal(r.outcome, 'dismissed'); assert.equal(r.refunded, POLICE.bail); assert.equal(A.w.balance(), b + POLICE.bail); assert.equal((await A.sync()).unsynced, 0);
});
test('$KIBBLE cosmetics give no edge in any verdict; the court reads only the record and the patrol schedule; no chance, no stakes', () => {
  const rich = { outfit: { hat: 'sapphire_crown', neck: 'diamond_chain', top: 'plat_suit' }, kibble: 1e7, bones: 1e9, items: ['gold_suit'], vip: 1, score: 1e6 };
  let n = 0; for (let i = 0; i < 300; i++) { const ts = 1.79e12 + i * 6151, o = officersAt(ts / 1000)[1 + (i % 2) * 4], off = o.force === 'police' ? 'jaywalk' : 'flowers';
    const e = { seq: i, ts, actor: o.id, group: 'sim', action: 'police.cite', target: 'player:p0000000000000002', value: { amount: 0, unit: 'PAWMARK' }, data: { offense: off, tx: Math.floor(o.x) + (i % 11) - 5, ty: off === 'jaywalk' ? 44 : Math.floor(o.y), fine: 5 }, prev: '0'.repeat(64) }; e.hash = hashOf(e);
    for (const g of Object.keys(GROUNDS)) { const plain = hear({ record: { k: 'cite', e, paid: 5 }, ground: g }), dressed = hear({ record: { k: 'cite', e, paid: 5 }, ground: g, player: rich, ...rich }); assert.deepEqual(dressed, plain); n++; } }
  assert.equal(n, 900); assert.match(hear.toString(), /^function hear\(\{ record, ground, file = \{\} \}\)/);
  for (const f of ['src/sim/court.js', 'src/sim/courtui.js', 'src/sim/courtart.js']) { const s = code(f).replace(/Bones, \$KIBBLE, prizes, scores/g, ''); assert.ok(!/Math\.random|\bbet\b|wager|odds|stake|jackpot|lotter|raffle/i.test(s), f); assert.ok(!/\b(outfit|kibble|bones|score|wardrobe|inventory)\b/i.test(s.replace(/\$KIBBLE/g, '').replace(/outfit: \{[^}]*\}/g, '').replace(/outfit: b\.outfit/g, '')), f + ' never reads cosmetics or the main economy'); }
  const s = createSim(); assert.throws(() => s.defineAction('trial.bet'), /gambling/); assert.throws(() => s.defineAction('verdict.wager'), /gambling/);
});
test('the ☰ menu steps aside while a full panel is open, so it never covers the close button', () => {
  assert.match(src('style.css'), /body:has\(#panel:not\(\[hidden\]\)\) #menu-btn\{display:none\}/);
});

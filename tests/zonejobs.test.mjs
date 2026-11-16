// Player job mini-games (preview): zone timing, doubling multiplier with a 64x cap, caps, ranks, saves migrate.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ZJ, ZJOBS, ZJOB_IDS, RANKS, zoneWidth, zoneSpeed, zoneAt, isHit, newShift, tap, step, finishShift, ensureTownx, rankOf, capLeft } from '../src/zonejobs.js';
import { load, MemoryStorage, SAVE_KEY } from '../src/save.js';

const ON = { c: 0.5, w: 0.2 }, OFF = { c: 0.1, w: 0.1 }, EDGE = { c: 0.58, w: 0.2 };
test('a hit pays 1 Bone x multiplier, then the multiplier doubles up to 64x; a miss resets to 1x', () => {
  const r = newShift('sawmill');
  const pays = []; for (let i = 0; i < 8; i++) pays.push(tap(r, EDGE).pay); // edge hits (no perfect bonus)
  assert.deepEqual(pays, [1, 2, 4, 8, 16, 32, 64, 64]);
  assert.equal(r.mult, ZJ.MULT_CAP);
  assert.equal(tap(r, OFF).pay, 0); assert.equal(r.mult, 1);
  assert.equal(tap(r, EDGE).pay, 1);
});
test('a dead-centre hit adds a small perfect bonus', () => { const r = newShift('mine'); const t = tap(r, ON); assert.ok(t.perfect); assert.equal(t.pay, 1 + ZJ.PERFECT_BONUS); });
test('the zone shrinks and speeds up every tap, with floors and ceilings', () => {
  for (let l = 1; l < 40; l++) { assert.ok(zoneWidth(l) <= zoneWidth(l - 1)); assert.ok(zoneSpeed(l) >= zoneSpeed(l - 1)); }
  assert.ok(zoneWidth(99) >= 0.07); assert.ok(zoneSpeed(99) <= 1.6); assert.ok(zoneWidth(0) > zoneWidth(11) * 2);
});
test('the zone moves, stays on the bar, and each job moves it its own way', () => {
  const motions = new Set(ZJOB_IDS.map((id) => ZJOBS[id].motion)); assert.equal(motions.size, ZJOB_IDS.length);
  for (const id of ZJOB_IDS) { const seen = new Set(); for (let p = 0; p < 20; p += 0.05) { const z = zoneAt(id, p, 3); assert.ok(z.c - z.w / 2 >= -1e-9 && z.c + z.w / 2 <= 1 + 1e-9, id); seen.add(Math.round(z.c * 20)); } assert.ok(seen.size > 8, id + ' barely moves'); }
  const sigs = ZJOB_IDS.map((id) => [0.7, 1.9, 3.3, 5.1].map((p) => zoneAt(id, p, 2).c.toFixed(3)).join()); assert.equal(new Set(sigs).size, sigs.length);
  const r = newShift('sawmill'); const a = step(r, 0.2).c, b = step(r, 0.2).c; assert.notEqual(a, b);
  assert.equal(isHit({ c: 0.5, w: 0.07 }), true); assert.equal(isHit({ c: 0.6, w: 0.07 }), false);
});
test('the jobs Zachary named are all there, at real town workplaces', () => {
  for (const id of ['sawmill', 'mine', 'forge', 'bakery', 'fishery', 'farm', 'quarry', 'docks', 'police']) assert.ok(ZJOBS[id], id);
  assert.equal(RANKS[0][0], 'Trainee'); assert.equal(RANKS.at(-1)[0], 'Legend');
});
const play = (s, job, day, hits = 12) => { const r = newShift(job); for (let i = 0; i < ZJ.SHIFT_ZONES; i++) tap(r, i < hits ? ON : OFF); return finishShift(s, r, { day, skyDay: 7 }); };
test('a shift is 12 taps, pays at most the shift cap, and the day stops at the daily cap', () => {
  const s = { bones: 500 }; const a = play(s, 'sawmill', 'D1'); assert.equal(a.taps, ZJ.SHIFT_ZONES); assert.equal(a.paid, ZJ.SHIFT_CAP); assert.equal(a.cappedBy, 'shift');
  play(s, 'mine', 'D1'); const c = play(s, 'forge', 'D1'); assert.equal(c.paid, ZJ.DAILY_CAP - 2 * ZJ.SHIFT_CAP); assert.equal(c.cappedBy, 'daily');
  const d = play(s, 'bakery', 'D1'); assert.equal(d.paid, 0); assert.equal(s.bones, 500 + ZJ.DAILY_CAP); assert.equal(capLeft(s, 'D1'), 0);
  assert.ok(d.hits > 0 && s.townx.jobs.bakery.hits === 12, 'capped shifts still count for rank');
  assert.equal(capLeft(s, 'D2'), ZJ.DAILY_CAP, 'a new Sydney day resets the cap');
});
test('rank climbs Trainee -> Legend on lifetime hits; personal best and goods for the town are kept', () => {
  assert.equal(rankOf(0).title, 'Trainee'); assert.equal(rankOf(25).title, 'Apprentice'); assert.equal(rankOf(1000).title, 'Legend'); assert.equal(rankOf(1000).next, null);
  const s = { bones: 0 }; const a = play(s, 'quarry', 'D1', 3); const b = play(s, 'quarry', 'D1', 12); const c = play(s, 'quarry', 'D1', 2);
  assert.ok(b.pb && !c.pb); assert.equal(s.townx.jobs.quarry.best, b.score); assert.equal(s.townx.made.goods.stone, 17); assert.ok(a.score < b.score);
  for (let i = 0; i < 3; i++) play(s, 'quarry', 'D' + (i + 9)); assert.equal(rankOf(s.townx.jobs.quarry.hits).title, 'Apprentice');
});
test('three misses in a row is a cartoon bump the Hospital can patch', () => { const s = { bones: 0 }; const r = play(s, 'forge', 'D1', 0); assert.ok(r.bumped); assert.equal(s.townx.injury.kind, 'job'); assert.equal(s.townx.injury.what, 'a singed paw'); });
test('saves migrate: an old save gets the town slice and keeps everything else', () => {
  const st = new MemoryStorage(); const old = { v: 1, player: { name: 'Zed', coat: 'golden', x: 10, y: 10 }, bones: 1234, plots: { a: 1 }, inventory: { cap: 2 } };
  st.setItem(SAVE_KEY, JSON.stringify(old)); const s = load(st);
  assert.equal(s.bones, 1234); assert.deepEqual(s.plots, { a: 1 }); assert.equal(s.inventory.cap, 2); assert.equal(s.player.name, 'Zed');
  assert.ok(s.townx && s.townx.jobs.sawmill && s.townx.jobDay); const keep = { bones: 9, townx: { v: 1, jobs: { sawmill: { hits: 77, shifts: 3, best: 90, bestMult: 32, perfects: 1 } } } };
  ensureTownx(keep); assert.equal(keep.townx.jobs.sawmill.hits, 77, 'existing progress is kept'); assert.ok(keep.townx.jobs.mine);
});
test('job copy says Bones are in-game only and never calls them real earnings or $KIBBLE', () => {
  for (const f of ['src/zonejobs.js', 'src/zonejobui.js', 'src/townxui.js']) { const src = readFileSync(new URL('../' + f, import.meta.url), 'utf8');
    const strings = src.match(/(['"`])(?:(?!\1).)*\1/g).join(' '); assert.doesNotMatch(strings, /\$KIBBLE|real (money|earnings)|cash out|withdraw/i, f); }
  assert.match(readFileSync(new URL('../src/zonejobui.js', import.meta.url), 'utf8'), /IN-GAME ONLY/);
});

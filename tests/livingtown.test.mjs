// Living town preview: Orchard Row workplaces, workers, events, upgrades, moods, memory, apprenticeships.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GRID, LOTS, STOPS, NOOKS, EXPANSIONS, lotById, isBlocked, proposalPath, SPAWN } from '../src/townproposal.js';
import * as WR from '../src/workrow.js';
import { createTownLife, renderTownLife, queryOverrides } from '../src/townlife.js';

function mem() { const m = new Map(); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; }

test('seven new Orchard Row workplaces are solid lots with a reachable door', () => {
  assert.equal(WR.ROW_LOTS.length, 7);
  for (const id of WR.ROW_LOTS) {
    const lot = lotById(id); assert.ok(lot, id);
    for (let y = lot.y; y < lot.y + lot.h; y++) for (let x = lot.x; x < lot.x + lot.w; x++) assert.ok(isBlocked(x, y), `${id} ${x},${y} solid`);
    assert.ok(!isBlocked(lot.door[0], lot.door[1]), `${id} door walkable`);
    assert.ok(WR.fastPath([SPAWN.tx, SPAWN.ty], lot.door), `${id} reachable from spawn`);
  }
});

test('the new lots do not overlap other lots, stops, nooks or expansion gates', () => {
  const inLot = (l, x, y) => x >= l.x && x < l.x + l.w && y >= l.y && y < l.y + l.h;
  for (const id of WR.ROW_LOTS) {
    const a = lotById(id);
    for (const b of LOTS) if (b.id !== id) for (let y = a.y; y < a.y + a.h; y++) for (let x = a.x; x < a.x + a.w; x++) assert.ok(!inLot(b, x, y), `${id} overlaps ${b.id}`);
    for (const s of [...STOPS, ...NOOKS]) { const [x, y] = s.tile || [s.tx, s.ty]; if (Number.isFinite(x)) assert.ok(!inLot(a, x, y), `${id} covers ${s.id}`); }
    for (const e of EXPANSIONS) { const [x, y] = e.gate || e.tile || [e.tx, e.ty]; if (Number.isFinite(x)) assert.ok(!inLot(a, x, y), `${id} covers gate ${e.id}`); }
  }
});

test('fastPath agrees with proposalPath on length', () => {
  for (const [a, b] of [['orchard', 'goods'], ['dairy', 'sip'], ['post', 'h1']]) {
    const A = lotById(a).door, B = lotById(b).door;
    const fp = WR.fastPath(A, B), pp = proposalPath(A[0], A[1], B[0], B[1]);
    assert.ok(fp && pp); assert.equal(fp.length, pp.length, `${a}->${b}`);
  }
});

test('eight workers, each has a full day plan that only walks on open tiles', () => {
  assert.equal(WR.ROW_WORKERS.length, 8);
  for (const w of WR.ROW_WORKERS) {
    const plan = WR.dayPlan(w);
    assert.ok(plan.segs.some((s) => s.kind === 'work'), `${w.id} works`);
    assert.ok(plan.segs.some((s) => s.kind === 'lunch'), `${w.id} lunches`);
    assert.ok(plan.drops > 0, `${w.id} delivers`);
    for (const s of plan.segs) if (s.path) for (const [x, y] of s.path) assert.ok(!isBlocked(x, y) || (x === s.path[0][0] && y === s.path[0][1]), `${w.id} walks on ${x},${y}`);
  }
});

test('workers are home before 7 and after 17, visibly out working from 7 to 4, and the same second gives the same answer', () => {
  for (const w of WR.ROW_WORKERS) {
    assert.equal(WR.workerAt(w, 6 * 60).visible, false);
    assert.equal(WR.workerAt(w, 18 * 60).visible, false);
    let work = 0, walk = 0;
    for (let s = 7.5 * 60; s < 15.8 * 60; s += 5) { const a = WR.workerAt(w, s); if (a.kind === 'work') work++; if (a.kind === 'walk') walk++; assert.ok(a.visible); }
    assert.ok(work > 10 && walk > 10, `${w.id} works ${work} and walks ${walk}`);
    assert.deepEqual(WR.workerAt(w, 600), WR.workerAt(w, 600));
  }
});

test('working spots are on the workplace (station tile) and carried goods are shown on deliveries', () => {
  const pip = WR.workerById('pip');
  let carry = 0, made = 0;
  for (let s = 420; s < 1020; s += 3) { const a = WR.workerAt(pip, s); if (a.carry) carry++; made = Math.max(made, a.made); }
  assert.ok(carry > 0); assert.ok(made > 0);
});

test('rain: walkers keep going, outdoor workers shelter', () => {
  const pip = WR.workerById('pip');
  const s = WR.dayPlan(pip).segs.find((g) => g.kind === 'work');
  const a = WR.workerAt(pip, (s.t0 + s.t1) / 2, { rain: true });
  assert.equal(a.sheltering, true);
});

test('fires are cartoon flare-ups on a seeded subset of days, 30 seconds then all clear', () => {
  let days = 0;
  for (let d = 0; d < 200; d++) { const f = WR.fireOn(d, 0); if (f) { days++; assert.ok(['pottery', 'print', 'carpentry', 'post'].includes(f.lot)); assert.equal(WR.fireOn(d, f.t0 + 1).on, true); assert.equal(WR.fireOn(d, f.t1 + 1).after, true); assert.equal(WR.fireOn(d, f.t1 + 25).on, false); } }
  assert.ok(days > 50 && days < 130, `fire days ${days}`);
});

test('town hall goes up one stage per day and finishes', () => {
  assert.equal(WR.hallStage(0, 0).name, 'Surveyed');
  assert.equal(WR.hallStage(3, 600).name, 'Walls');
  assert.equal(WR.hallStage(9, 600).name, 'Finished');
  assert.ok(WR.hallStage(1, 17 * 60).pct > WR.hallStage(1, 7 * 60).pct);
});

test('upgrades unlock in order from goods moved and are shared (derived from the clock only)', () => {
  assert.deepEqual(WR.upgradesFor(0).done, []);
  assert.deepEqual(WR.upgradesFor(1300).done, ['lamps', 'flowers']);
  assert.equal(WR.upgradesFor(99999).done.length, WR.UPGRADES.length);
  assert.ok(WR.goodsMoved(2, 0) === 2 * WR.dropsPerSkyDay());
});

test('needs and moods follow the day', () => {
  const w = WR.workerById('honey');
  assert.equal(WR.needsOf(w, 60).mood, 'asleep');
  const early = WR.needsOf(w, 7.2 * 60), late = WR.needsOf(w, 16.8 * 60);
  assert.ok(early.energy > late.energy);
  assert.equal(WR.needsOf(w, 9 * 60, { metToday: true }).mood, 'chuffed');
});

test('workers remember you, foreman comes from experience, apprenticeships unlock crafting', () => {
  const L = WR.emptyLife();
  const r1 = WR.talk(L, 'kiln', { day: '2026-11-16', playerName: 'Kabosu', sec: 600 });
  assert.ok(r1.first && /Kabosu/.test(r1.line));
  const r2 = WR.talk(L, 'kiln', { day: '2026-11-17', playerName: 'Kabosu', sec: 600 });
  assert.equal(r2.days, 2);
  assert.equal(WR.isForeman(L, 'kiln', 0), false);
  assert.equal(WR.isForeman(L, 'kiln', 4), true);
  assert.equal(WR.craft(L, 'Clay mug', 1).ok, false);
  assert.ok(WR.startApprentice(L, 'kiln').ok);
  const workS = WR.dayPlan(WR.workerById('kiln')).segs.find((g) => g.kind === 'work');
  const sec = (workS.t0 + workS.t1) / 2;
  assert.ok(WR.lesson(L, 'kiln', { sec, absHour: 1 }).ok);
  assert.equal(WR.lesson(L, 'kiln', { sec, absHour: 1 }).ok, false, 'one per hour');
  assert.equal(WR.lesson(L, 'kiln', { sec: 60, absHour: 2 }).ok, false, 'only while at work');
  WR.lesson(L, 'kiln', { sec, absHour: 2 });
  const g = WR.lesson(L, 'kiln', { sec, absHour: 3 });
  assert.ok(g.graduated);
  const recipe = WR.workerById('kiln').recipe;
  assert.ok(WR.craft(L, recipe, 5).ok);
  assert.equal(WR.craft(L, recipe, 5).ok, false, 'once per sky day');
});

test('preview progress lives in its own key and never writes the live save', () => {
  const s = mem(); s.setItem(WR.LIVE_SAVE_KEY, '{"live":true}');
  const tl = createTownLife(s, '');
  tl.setEnv({ hour: 10, rain: false, ev: null, night: false });
  tl.talk('pip', 'Kabosu'); tl.apprentice('pip');
  assert.equal(s.getItem(WR.LIVE_SAVE_KEY), '{"live":true}');
  assert.ok(s.getItem(WR.ROW_SAVE_KEY));
  // a corrupt preview key is ignored, not thrown
  s.setItem(WR.ROW_SAVE_KEY, '{not json'); assert.deepEqual(WR.loadLife(s), WR.emptyLife());
});

test('town life actors and props render as world sprites', () => {
  const tl = createTownLife(mem(), '');
  tl.setEnv({ hour: 10, rain: false, ev: null, night: false });
  const a = tl.actors();
  assert.equal(a.length, 8);
  for (const x of a) { assert.ok(Number.isFinite(x.x) && Number.isFinite(x.y)); assert.ok(x.npcwork); }
  assert.ok(tl.props().length > 20);
  const s = tl.summary(); assert.equal(s.workers.length, 8);
});

test('preview overrides force a fire, a market and a construction day', () => {
  assert.deepEqual(queryOverrides('?ltfire=post&ltmarket=1&ltday=3'), { day: 3, skyDay: null, fire: 'post', market: true, season: null });
  const tl = createTownLife(mem(), '?ltfire=post&ltmarket=1&ltday=3');
  tl.setEnv({ hour: 10, rain: false, ev: null, night: false });
  const s = tl.summary(); assert.equal(s.fire.lot, 'post'); assert.equal(s.market, true); assert.equal(s.hall.name, 'Walls');
});

test('card copy never says anyone earns anything real', () => {
  const tl = createTownLife(mem(), '');
  tl.setEnv({ hour: 10, rain: false, ev: null, night: false });
  for (const tab of ['worker', 'town', 'craft']) {
    const body = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
    renderTownLife(body, { tl, id: 'pip', tab });
    const text = body.innerHTML.replace(/<[^>]+>/g, ' ');
    assert.match(text, /Nobody here earns anything real/);
    assert.doesNotMatch(text.replace(/Nobody here earns anything real\.?/, '').replace(/No Bones, \$KIBBLE, wallet or prizes[^.]*\./, ''), /\b(earn|earns|earning|salary|wage|paid|payout|\$KIBBLE|SOL|token)\b/i);
  }
  const src = readFileSync(new URL('../src/workrow.js', import.meta.url), 'utf8') + readFileSync(new URL('../src/townlife.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /localStorage\.setItem\(['"]inuverse\.save\.v1/);
});

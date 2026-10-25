// Shiba Sips Café restaurant (customer side): Bones purchases, refusal, service timeline, seated townsfolk, fun-only food,
// and the barista shift economy pinned to the values it had before the restaurant shipped.
import test from 'node:test'; import assert from 'node:assert/strict';
import { DISHES, order, favourite, makeService, request, tickService, waiterArrived, ticketAt, plateLeft, seatDiners, isEating, SEATS, EAT } from '../src/diner.js';
import { newShift, tickShift, addToTray, serve, finishShift } from '../src/cafe.js';
import { payFor, finishJob, FIRST_SHIFT_BONUS, comboBonus, JOBS, jobBoard } from '../src/jobs.js';
import { mulberry32 } from '../src/rng.js';
import { scene, solidAt } from '../src/scenes.js';
import * as MOB from '../src/mobility.js';
import fs from 'fs';
const fresh = (bones = 100) => ({ bones, stats: { shifts: 2, bonesEarned: 340, served: 9 }, jobs: { cafe: { xp: 50, best: 30, runs: 2, lastDay: 1, bestCombo: 4 } }, player: { name: 'Pup' } });

test('menu: 10-15 original dishes and drinks, priced in whole Bones only', () => {
  assert.ok(DISHES.length >= 10 && DISHES.length <= 15, String(DISHES.length));
  assert.equal(new Set(DISHES.map((d) => d.id)).size, DISHES.length);
  for (const d of DISHES) { assert.ok(Number.isInteger(d.price) && d.price > 0, d.id); assert.ok(['food', 'drink', 'treat'].includes(d.kind)); assert.deepEqual(Object.keys(d).sort(), ['emote', 'id', 'kind', 'line', 'name', 'price'], `${d.id}: no hidden effect fields`); }
  assert.ok(DISHES.some((d) => /latte/i.test(d.name)) && DISHES.some((d) => /kibble/i.test(d.name)));
});
test('a purchase deducts exactly the price in Bones; refused (and nothing changes) with insufficient Bones', () => {
  const s = fresh(20), r = order(s, 'pupLatte'); assert.ok(r.ok); assert.equal(s.bones, 20 - 6); assert.equal(s.diner.counts.pupLatte, 1);
  const s2 = fresh(14); const before = JSON.stringify(s2); const no = order(s2, 'salmonBento'); assert.equal(no.ok, false); assert.match(no.reason, /Not enough Bones/); assert.equal(JSON.stringify(s2), before);
  const s3 = fresh(15); assert.ok(order(s3, 'salmonBento').ok); assert.equal(s3.bones, 0); assert.equal(order(s3, 'pupuccino').ok, false); assert.equal(s3.bones, 0);
  const s4 = fresh(50); assert.equal(order(s4, 'nope').ok, false); assert.equal(s4.bones, 50);
  const s5 = fresh(5.9); assert.equal(order(s5, 'pupLatte').ok, false, 'fractional Bones never round up'); assert.equal(s5.bones, 5.9);
});
test('food is fun only: an order touches state.bones and state.diner and nothing else (no stats, jobs, scores, prizes)', () => {
  const s = fresh(500), snap = JSON.parse(JSON.stringify(s)); for (const d of DISHES) order(s, d.id);
  const { bones, diner, ...rest } = s, { bones: b0, ...rest0 } = snap; assert.deepEqual(rest, rest0); assert.equal(bones, 500 - DISHES.reduce((t, d) => t + d.price, 0));
  assert.deepEqual(jobBoard(s, 1), jobBoard(snap, 1), 'daily job board (prize pool) unchanged');
  // nothing prize- or gameplay-related reads the diner state
  const src = fs.readdirSync('src').filter((f) => f.endsWith('.js') && !['diner.js', 'cafeplay.js', 'dinerart.js', 'main.js'].includes(f)).filter((f) => /from '\.\/(diner|cafeplay)\.js'|state\.diner|\.counts\.pupLatte/.test(fs.readFileSync('src/' + f, 'utf8')));
  assert.deepEqual(src, [], 'only the café files read the diner state'); const main = fs.readFileSync('src/main.js', 'utf8');
  assert.ok(!/state\.diner[^\n]*(speed|WALK|stats|score|pool|bonesEarned)/.test(main)); assert.ok(!/WALK_SPEED|RUN_MULT|player\.|state\.(stats|jobs|player|packs|mall)|bonesEarned/.test(fs.readFileSync('src/diner.js', 'utf8') + fs.readFileSync('src/cafeplay.js', 'utf8')), 'the café runtime never touches the player body, stats, jobs or prize state');
  assert.equal(MOB.WALK_SPEED, 92);
});
test('favourite dish memory', () => { const s = fresh(200); assert.equal(favourite(s), null); order(s, 'honeyScone'); order(s, 'pupLatte'); order(s, 'honeyScone'); assert.deepEqual(favourite(s), { dish: DISHES.find((d) => d.id === 'honeyScone'), times: 2 }); });
test('service: cook -> waiter carries -> served (eat) -> empty plate -> waiter clears; one ticket per seat; waiter one at a time', () => {
  const v = makeService(), a = request(v, { who: 'me', seat: 's1', dish: 'pupLatte', me: true }), b = request(v, { who: 'Kiki', seat: 's3', dish: 'kibbleBowl' });
  assert.equal(request(v, { who: 'x', seat: 's1', dish: 'pupLatte' }), null); assert.equal(plateLeft(a), 1);
  let ev = tickService(v, EAT.cook + 0.01); assert.deepEqual(ev.map((e) => [e.kind, e.ticket.who]), [['walk', 'me']]); assert.equal(a.phase, 'carry'); assert.equal(b.phase, 'ready');
  assert.deepEqual(tickService(v, 0.1), [], 'waiter is busy');
  ev = waiterArrived(v); assert.deepEqual(ev.map((e) => e.kind), ['served']); assert.equal(a.phase, 'eat');
  ev = tickService(v, 0.01); assert.equal(ev[0].kind, 'walk'); assert.equal(ev[0].ticket, b); waiterArrived(v);
  tickService(v, EAT.eat / 2); assert.ok(plateLeft(a) < 0.6 && plateLeft(a) > 0);
  ev = tickService(v, EAT.eat); assert.ok(ev.some((e) => e.kind === 'finished' && e.ticket === a)); assert.equal(plateLeft(a), 0);
  ev = tickService(v, EAT.clear + 0.01); assert.ok(ev.some((e) => e.kind === 'walk' && e.ticket.phase === 'clear'));
  ev = waiterArrived(v); assert.equal(ev[0].kind, 'cleared'); tickService(v, 0); assert.ok(!ticketAt(v, ev[0].ticket.seat));
});
test('seats are chairs beside a table, the waiter can reach every seat from the kitchen pass', () => {
  const sc = scene('cafe'); for (const s of SEATS) { assert.equal(sc.at(s.tx, s.ty).prop, 'chair'); assert.equal(sc.at(...s.table).prop, 'table'); assert.ok(!solidAt(sc, ...s.stand));
    assert.ok(MOB.astar(8, 4, s.stand[0], s.stand[1], (x, y) => solidAt(sc, x, y), { w: sc.w, h: sc.h }), s.id); assert.ok(sc.spots.some((p) => p.tx === s.tx && p.ty === s.ty && p.act.diner === s.id)); }
  const counter = sc.spots.find((p) => p.act.diner === 'counter'), shift = sc.spots.find((p) => p.act.panel === 'cafe'); assert.ok(counter && shift && counter !== shift); assert.equal(shift.label, 'Work a shift');
});
test("townsfolk whose townai action is 'eat' get a seat (eaters first, regulars fill in, player seat respected)", () => {
  const town = { folk: { Mochi: { name: 'Mochi', act: 'eat' }, Kuro: { name: 'Kuro', act: 'work' }, Hana: { name: 'Hana', act: 'eat' } } };
  assert.ok(isEating(town.folk.Mochi) && !isEating(town.folk.Kuro) && isEating({ act: 'grab a bite at the café' }));
  const d = seatDiners(town, { taken: new Set(['s1']) }); assert.deepEqual(d.filter((x) => x.folk).map((x) => x.name), ['Mochi', 'Hana']); assert.ok(!d.some((x) => x.seat === 's1')); assert.equal(new Set(d.map((x) => x.seat)).size, d.length);
  assert.equal(seatDiners({ folk: {} }).length, 2);
});
test('barista shift economy is unchanged (pinned to the pre-restaurant values)', () => {
  const rng = mulberry32(42), s = newShift(rng), pays = [];
  for (let i = 0; i < 1300; i++) { tickShift(s, 0.05, rng); if (i % 40 === 20 && s.orders.length) { const o = s.orders[0]; o.customer = 'Kiki'; o.seat = 's3'; o.tagged = true; /* café tagging is display only */ for (const it of o.items) addToTray(s, it); pays.push(serve(s, o.id).pay); } }
  assert.deepEqual(pays, [22, 14, 14, 14, 14, 22, 22, 22, 14, 22, 22, 22, 22, 14, 30, 14, 22]); assert.equal(s.earned, 326);
  const st = { bones: 0, stats: { shifts: 0, bonesEarned: 0, served: 0 } }; assert.equal(finishShift(st, s), 351); assert.equal(st.bones, 351); assert.deepEqual(st.stats, { shifts: 1, bonesEarned: 351, served: 17 }); assert.equal(finishShift(st, s), 0);
  assert.deepEqual(JOBS.cafe, { name: 'Café Order Rush', game: 'match', dur: 45, base: 10, rate: 0.5, cap: 120, where: 'Shiba Sips Café' }); assert.equal(FIRST_SHIFT_BONUS, 25);
  assert.deepEqual([comboBonus(4), comboBonus(12), comboBonus(99)], [0, 6, 30]);
  assert.deepEqual(payFor('cafe', { score: 100, maxCombo: 10 }, true), { perf: 60, combo: 6, first: 25, total: 91 }); assert.deepEqual(payFor('cafe', { score: 300, maxCombo: 0 }, false), { perf: 120, combo: 0, first: 0, total: 120 }); assert.deepEqual(payFor('cafe', { score: 0 }, true), { perf: 10, combo: 0, first: 25, total: 12 });
  const S = { bones: 0, stats: { bonesEarned: 0 } }; assert.equal(finishJob(S, 'cafe', { score: 80, maxCombo: 6 }, 3).total, 78); assert.equal(finishJob(S, 'cafe', { score: 80, maxCombo: 6 }, 3).total, 53); assert.equal(S.bones, 131);
  // eating in between shifts never changes pay
  const S2 = { bones: 500, stats: { bonesEarned: 0 } }; order(S2, 'salmonBento'); assert.equal(finishJob(S2, 'cafe', { score: 80, maxCombo: 6 }, 3).total, 78);
});

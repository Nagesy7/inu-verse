import test from 'node:test'; import assert from 'node:assert/strict';
import { dayPhase, timeForHour, makeAmbient, stepAmbient, throwBall, addMail, unreadMail, DAY_LEN } from '../src/ambient.js';
import { newGame, claimPlot } from '../src/game.js';
test('day/night cycle: ~12 min day with sunset and dark night', () => {
  assert.equal(DAY_LEN, 720); assert.equal(dayPhase(timeForHour(12)).label, 'day'); assert.equal(dayPhase(timeForHour(18)).label, 'sunset');
  assert.equal(dayPhase(timeForHour(23)).label, 'night'); assert.ok(dayPhase(timeForHour(23)).dark > 0.5); assert.equal(dayPhase(0).dark, 0);
});
test('ambient wildlife is deterministic and birds flee the player', () => {
  const a = makeAmbient(3), b = makeAmbient(3); assert.deepEqual(a.birds.map((x) => [x.x, x.y]), b.birds.map((x) => [x.x, x.y]));
  const bird = a.birds[0]; const ev = stepAmbient(a, 0.016, { x: bird.x + 10, y: bird.y }, []); assert.equal(bird.state, 'fly'); assert.ok(ev.some((e) => e.kind === 'flush'));
  assert.ok(a.ducks.length >= 5 && a.butterflies.length && a.squirrels.length);
});
test('ball fetch: nearest NPC runs to ball and brings it back', () => {
  const a = makeAmbient(5), me = { x: 500, y: 500 }, dog = { name: 'Mochi', x: 700, y: 520, phase: 0, path: [] };
  assert.equal(throwBall(a, me, 'right', [dog]), dog); let got = false;
  for (let i = 0; i < 600 && !got; i++) got = stepAmbient(a, 0.02, me, [dog]).some((e) => e.kind === 'fetched'); assert.ok(got); assert.equal(a.ball, null);
});
test('mailbox notes only arrive once you own a home', () => {
  const s = newGame(); assert.equal(addMail(s), null); claimPlot(s, 'p1'); addMail(s, () => 0.1); assert.equal(unreadMail(s), 1); assert.ok(s.mail[0].from);
});

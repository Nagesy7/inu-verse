import test from 'node:test'; import assert from 'node:assert/strict';
const { WORKERS, makeCrew, stepCrew, onDuty, takeGig, GIG_PAY } = await import('../src/workers.js');
const { isSolid, interactables, TILE } = await import('../src/world.js');
test('worker routes stay on walkable tiles and never stop on a door / interact tile', () => { const doors = new Set(interactables().map((i) => i.tx + ',' + i.ty));
  for (const w of WORKERS) { for (const [x, y] of w.route) assert.equal(doors.has(Math.floor(x / TILE) + ',' + Math.floor(y / TILE)), false, w.id + ' waypoint on a door');
    for (let i = 0; i + 1 < w.route.length; i++) for (let k = 0; k <= 30; k++) { const [ax, ay] = w.route[i], [bx, by] = w.route[i + 1], x = ax + (bx - ax) * k / 30, y = ay + (by - ay) * k / 30; assert.equal(isSolid(Math.floor(x / TILE), Math.floor(y / TILE)), false, `${w.id} route blocked at ${x},${y}`); } } });
test('schedule fits the time of day and crews move along routes', () => { const el = WORKERS.find((w) => w.job === 'electrician'), bins = WORKERS.find((w) => w.truck); assert.ok(onDuty(el, 18) && !onDuty(el, 10)); assert.ok(onDuty(bins, 6) && !onDuty(bins, 14));
  const c = makeCrew(), w = c[0], x0 = w.x; stepCrew(c, 1, 9); assert.ok(w.on && w.x !== x0); stepCrew(c, 1, 23); assert.equal(c[0].on, false); });
test('odd-job gig pays once per day', () => { const s = { bones: 0 }, w = WORKERS[0]; assert.ok(takeGig(s, w, 1).ok); assert.equal(takeGig(s, w, 1).ok, false); assert.ok(takeGig(s, w, 2).ok); assert.equal(s.bones, 2 * GIG_PAY); });

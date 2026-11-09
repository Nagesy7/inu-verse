// Workplace preview: path tiles only, work happens at the building, delivery conserves one plank and one tool.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MAP, PLOTS, isSolid } from '../src/world.js';
import {
  DAILY_ISSUE, LUMBER, MECHANIC, RECYCLER, ROUTES,
  advance, conserved, crewView, lotProof, onPath, plankTotal, seek, seedState,
} from '../src/npcbuildings.js';

test('the two workplaces sit on empty grass, not on claim plots, with a path door', () => {
  const proof = lotProof();
  assert.equal(proof.length, 2);
  for (const lot of proof) {
    assert.equal(lot.allEmptyGrass, true, lot.id);
    assert.deepEqual(lot.claimPlots, []);
    assert.equal(lot.doorOnPath, true, lot.id);
    assert.equal(PLOTS.some((p) => p.x === lot.x && p.y === lot.y), false);
  }
  assert.deepEqual(LUMBER.door, [50, 95]);
  assert.deepEqual(MECHANIC.door, [30, 6]);
  assert.equal(onPath(RECYCLER[0], RECYCLER[1]), true);
});

test('every commute tile is an existing path tile', () => {
  for (const [name, route] of Object.entries(ROUTES)) {
    assert.ok(route.length >= 3, name);
    if (name !== 'toRecycler') assert.ok(route.length > 16, name);
    for (const [x, y] of route) {
      assert.equal(onPath(x, y), true, `${name} ${x},${y} tile ${MAP[y][x]} solid ${isSolid(x, y)}`);
    }
  }
});

test('nothing is produced while the crew is still walking', () => {
  const s = seek('walking');
  const crew = crewView(s);
  assert.equal(s.logs, 0);
  assert.equal(s.planks, 0);
  assert.equal(s.cart, 'broken');
  assert.equal(s.cargo, null);
  assert.equal(crew.timber.moving, true);
  assert.equal(crew.timber.place, 'path');
  assert.equal(crew.wrench.moving, true);
  assert.equal(crew.wrench.place, 'path');
  assert.equal(s.chits, DAILY_ISSUE);
  assert.equal(conserved(s), true);
});

test('work waits until the worker is at the building, then the pile and the cart change', () => {
  const home = seek('home');
  assert.equal(home.beat, 'home');
  assert.equal(crewView(home).timber.place, 'home');
  assert.equal(home.chits, 0);
  const yard = seek('working-lumber');
  const y = crewView(yard);
  assert.equal(y.timber.place, 'lumber');
  assert.equal(y.timber.moving, false);
  assert.equal(y.timber.face, 'up');
  assert.equal(y.timber.tx, LUMBER.door[0]);
  assert.equal(y.timber.ty, LUMBER.door[1]);
  assert.equal(y.timber.working, true);
  assert.equal(y.timber.frame, 2);
  assert.equal(yard.act, 'chop');
  assert.equal(yard.logs, 4);
  assert.equal(yard.planks, 0);
  assert.equal(yard.cart, 'broken');
  const shop = seek('working-mechanic');
  const w = crewView(shop);
  assert.equal(w.wrench.place, 'mechanic');
  assert.equal(w.wrench.moving, false);
  assert.equal(w.wrench.face, 'up');
  assert.equal(w.wrench.ty, MECHANIC.door[1]);
  assert.equal(w.wrench.x, MECHANIC.door[0] * 32 + 22);
  assert.equal(w.wrench.working, true);
  assert.equal(w.wrench.frame, 3);
  assert.equal(shop.cart, 'fixed');
  assert.equal(shop.logs, 4);
  assert.equal(conserved(yard) && conserved(shop), true);
});

test('porter moves one plank and one tool, and a second pass does not mint another', () => {
  const mid = seek('delivery');
  const p = crewView(mid);
  assert.equal(mid.cargo, 'plank');
  assert.equal(mid.planks, 0);
  assert.equal(mid.shopPlanks, 0);
  assert.equal(plankTotal(mid), 1);
  assert.equal(p.porter.moving, true);
  assert.equal(p.porter.place, 'path');
  assert.equal(mid.shortage, 'SHORT 1 PLANK');
  const done = seek('nextdawn');
  const home = crewView(done);
  assert.equal(done.day, 2);
  assert.equal(done.shopPlanks, 1);
  assert.equal(done.planks, 0);
  assert.equal(done.cargo, null);
  assert.equal(done.recycled, 1);
  assert.equal(done.cart, 'fixed');
  assert.equal(done.shortage, 'FILLED');
  assert.equal(done.logs, 2);
  assert.equal(done.cut, 4);
  assert.equal(plankTotal(done), 1);
  assert.equal(home.timber.place, 'home');
  assert.equal(home.wrench.place, 'home');
  assert.equal(home.porter.place, 'home');
  assert.equal(home.timber.moving || home.porter.moving, false);
  assert.equal(done.chits, DAILY_ISSUE * 2);
  assert.equal(conserved(done), true);
  const again = advance(done);
  assert.equal(again.shopPlanks, 1);
  assert.equal(again.recycled, 1);
  assert.equal(again.chits, DAILY_ISSUE * 2);
  const opened = seedState();
  const before = MAP[LUMBER.y][LUMBER.x];
  seek('nextdawn');
  assert.equal(MAP[LUMBER.y][LUMBER.x], before);
  assert.equal(opened.logs, 0);
});

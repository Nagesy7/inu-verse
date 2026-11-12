// Layout errands stay on the reviewed town. The old ROUTES table still walks the opt-out map.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ROUTES, SIGN, advance, crewView, onPath, routeProgress, seek, seedState } from '../src/npcbuildings.js';
import { createNpcWork, npcWorkOn, useLayout } from '../src/npcwork.js';
import { layoutAnchors, layoutPose, layoutRoutes } from '../src/npcroutes.js';
import { PROPOSAL_H, PROPOSAL_W, TILE_PX, isBlocked } from '../src/townproposal.js';

const CREW = ['timber', 'wrench', 'porter', 'saw', 'stitch', 'crumb', 'bolt', 'sprout', 'dusty', 'pike', 'ember', 'smith'];

function near(a, b) {
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) <= 1;
}

test('every layout route is in bounds, walkable, and meets its door', () => {
  const routes = layoutRoutes();
  const anchors = layoutAnchors();
  assert.deepEqual(Object.keys(routes).sort(), Object.keys(ROUTES).sort());
  for (const [name, route] of Object.entries(routes)) {
    const { from, to } = anchors[name];
    assert.ok(near(route[0], from), `${name} start`);
    assert.ok(near(route[route.length - 1], to), `${name} end`);
    for (let i = 0; i < route.length; i++) {
      const [x, y] = route[i];
      assert.ok(x > 0 && y > 0 && x < PROPOSAL_W - 1 && y < PROPOSAL_H - 1, `${name} ${x},${y}`);
      assert.equal(isBlocked(x, y), false, `${name} ${x},${y}`);
      if (i === 0) continue;
      const [px, py] = route[i - 1];
      assert.equal(Math.abs(x - px) + Math.abs(y - py), 1, `${name} step ${i}`);
    }
  }
});

test('stepping every errand keeps every actor on the new map', () => {
  const s = seedState();
  const seen = new Set();
  for (let n = 0; n < 30000 && s.beat !== 'nextdawn'; n++) {
    for (const id of CREW) {
      const step = routeProgress(s, id);
      seen.add(step.key);
      const pose = layoutPose(step.key, step.i, step.length);
      assert.equal(isBlocked(pose.tx, pose.ty), false, `${id} ${step.key} ${step.i} ${pose.tx},${pose.ty}`);
      assert.ok(pose.ty < PROPOSAL_H, `${id} ${pose.ty}`);
    }
    advance(s);
  }
  assert.equal(s.beat, 'nextdawn');
  assert.ok(seen.has('sawToSign'));
  assert.ok(seen.has('toLumber'));
  assert.ok(seen.has('porterHome'));
  assert.ok(ROUTES.sawToSign.some(([x, y]) => y >= PROPOSAL_H || isBlocked(x, y)));
  for (let i = 0; i < ROUTES.sawToSign.length; i++) {
    const posed = layoutPose('sawToSign', i, ROUTES.sawToSign.length);
    assert.ok(posed.tx > 0 && posed.ty > 0 && posed.ty < PROPOSAL_H && posed.tx < PROPOSAL_W);
    assert.equal(isBlocked(posed.tx, posed.ty), false, `${i} ${posed.tx},${posed.ty}`);
  }
});

test('the drawn porter follows the layout street while the opt-out crew stays put', () => {
  const store = {
    getItem: () => null,
    setItem() {},
    removeItem() {},
  };
  const page = {
    body: { appendChild() {}, classList: { add() {} } },
    defaultView: { location: { search: '' } },
    createElement() { return { setAttribute() {}, addEventListener() {} }; },
    getElementById() { return null; },
  };
  useLayout(true);
  try {
    const work = createNpcWork(page, store);
    work.seek('working-saw');
    let pose = null;
    for (let n = 0; n < 400; n++) {
      const s = work.advance();
      if (s.leg === 'sawToSign' && s.i.porter === Math.floor(ROUTES.sawToSign.length / 2)) {
        pose = layoutPose('sawToSign', s.i.porter, ROUTES.sawToSign.length);
        break;
      }
    }
    assert.ok(pose);
    const drawn = work.actors().find((a) => a.x === pose.tx * TILE_PX + 16 && a.y === pose.ty * TILE_PX + 16);
    assert.ok(drawn, JSON.stringify(pose));
    assert.equal(isBlocked(pose.tx, pose.ty), false);
  } finally {
    useLayout(false);
  }
});

test('?npcwork=0 keeps the old mechanic sign and its street', () => {
  assert.equal(npcWorkOn('?npcwork=0'), false);
  assert.equal(npcWorkOn('?npcwork=off'), false);
  assert.equal(npcWorkOn(''), true);
  const p = crewView(seek('delivery')).porter;
  assert.deepEqual([p.tx, p.ty], [...SIGN]);
  assert.equal(p.place, 'sign');
  for (const [x, y] of ROUTES.sawToSign) assert.equal(onPath(x, y), true, `${x},${y}`);
});

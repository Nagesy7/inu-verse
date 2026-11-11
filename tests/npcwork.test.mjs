// The reviewed town is on unless ?npcwork=0, and it does not write the live save.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SHEAF_WORLD, bottomCentre, createNpcWork, npcWorkOn } from '../src/npcwork.js';
import { lunchLayout, setLife } from '../src/daytown.js';
import { LIVE_SAVE_KEY, SAVE_KEY } from '../src/npcbuildings.js';

function mem() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}
function doc(search) {
  return {
    body: { appendChild() {}, classList: { add() {} } },
    defaultView: { location: { search } },
    createElement() {
      return { id: '', type: '', hidden: true, textContent: '', setAttribute() {}, addEventListener() {} };
    },
    getElementById() { return null; },
  };
}

test('the reviewed town is on unless the query opts out', () => {
  assert.equal(npcWorkOn(''), true);
  assert.equal(npcWorkOn('?yard=1'), true);
  assert.equal(npcWorkOn('?npcwork=1'), true);
  assert.equal(npcWorkOn('?npcwork=0'), false);
  assert.equal(npcWorkOn('?npcwork=off'), false);
  assert.ok(createNpcWork(doc(''), mem()));
  assert.equal(createNpcWork(doc('?npcwork=0'), mem()), null);
});

test('a flagged preview stores its own key and does not change the live save', () => {
  const store = mem();
  const live = '{"bones":4,"kibble":2}';
  store.setItem(LIVE_SAVE_KEY, live);
  const work = createNpcWork(doc('?npcwork=1'), store);
  assert.equal(work.saveKey, SAVE_KEY);
  assert.notEqual(SAVE_KEY, LIVE_SAVE_KEY);
  assert.equal(store.getItem(LIVE_SAVE_KEY), live);
  const home = work.seek('home');
  assert.equal(home.logs, 0);
  assert.equal(home.crew.timber.place, 'home');
  assert.equal(home.chits, 0);
  const walking = work.seek('walking');
  assert.equal(walking.logs, 0);
  assert.equal(walking.crew.timber.moving, true);
  assert.equal(store.getItem(LIVE_SAVE_KEY), live);
  assert.ok(store.getItem(SAVE_KEY).includes('npc-buildings-1'));
  const note = work.frameNote();
  assert.equal(note.visible, 'TEST');
  assert.match(note.detail, /unbalanced and local only/);
  assert.match(note.detail, /logs 0/);
});

test('the larger sheaf sits on its bottom centre and the carry sheet stays 48x60', () => {
  assert.deepEqual(SHEAF_WORLD, { w: 48, h: 54 });
  const old = bottomCentre(200, 300, 32, 36);
  const next = bottomCentre(200, 300, SHEAF_WORLD.w, SHEAF_WORLD.h);
  assert.equal(next.y + SHEAF_WORLD.h, 300);
  assert.equal(next.x + SHEAF_WORLD.w / 2, 200);
  assert.equal(old.y, 264);
  assert.equal(next.y, 246);
});

test('lunch composites on the sit anchor and the day shift does not mint bones', () => {
  const lay = lunchLayout(400, 500);
  assert.deepEqual(lay.bench, [368, 474, 64, 28]);
  assert.equal(lay.clipY, 490);
  assert.equal(lay.raise, 6);
  assert.deepEqual(lay.coat, [376, 456, 48, 60]);
  assert.deepEqual(lay.front, [376, 456, 48, 60]);
  const lunch = setLife(100, 'lunch');
  assert.equal(lunch.mode, 'lunch');
  assert.equal(lunch.lunch, 0);
  const bite = setLife(800, 'lunch');
  assert.equal(bite.lunch, 1);
  const src = readFileSync(new URL('../src/daytown.js', import.meta.url), 'utf8');
  assert.equal(src.includes('bones'), false);
  assert.equal(src.includes('inuverse.save.v1'), false);
  assert.match(src, /dock-east\.png/);
  assert.equal(src.includes('dock/dock.png'), false);
});

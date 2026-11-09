// The building preview is off unless ?npcwork=1, and it does not write the live save.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createNpcWork, npcWorkOn } from '../src/npcwork.js';
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

test('the work preview is off unless the query flag is set', () => {
  assert.equal(npcWorkOn(''), false);
  assert.equal(npcWorkOn('?yard=1'), false);
  assert.equal(createNpcWork(doc(''), mem()), null);
  assert.equal(npcWorkOn('?npcwork=1'), true);
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

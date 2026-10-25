import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/game.js';
import { OUTFITS, buyOutfit } from '../src/outfits.js';
import { tradeInfo } from '../src/trade.js';
import * as OB from '../src/onboard.js';

test('place quests cover key Verse locations with Bones rewards and need/task', () => {
  const ids = OB.PLACE_QUESTS.map((q) => q.place);
  for (const p of ['launch', 'bank', 'mall', 'arcade', 'shuttle', 'rescue', 'quest', 'cafe', 'home', 'market', 'leaders', 'board']) {
    assert.ok(ids.includes(p), p);
  }
  assert.ok(OB.totalBonesAvailable() > 200);
  assert.equal(OB.PLACE_QUESTS.length, 12);
  for (const q of OB.PLACE_QUESTS) {
    assert.ok(['use', 'act', 'claim'].includes(q.need), q.id + ' need');
    assert.ok(typeof q.task === 'string' && q.task.length > 5, q.id + ' task');
  }
  assert.equal(OB.questByPlace('cafe').need, 'act');
  assert.equal(OB.questByPlace('home').need, 'claim');
  assert.equal(OB.questByPlace('launch').need, 'use');
});

test('completePlace refuses without engagement (no grant-on-Got-it / visit)', () => {
  const s = newGame({ name: 'Scout' });
  OB.ensureOnboard(s);
  const before = s.bones;
  const r = OB.completePlace(s, 'launch');
  assert.equal(r.ok, false);
  assert.match(r.reason, /Use this place first|not enough/i);
  assert.equal(s.bones, before);
  assert.equal(OB.isPlaceDone(s, 'launch'), false);
  assert.equal(OB.isEngaged(s, 'launch'), false);
});

test('markEngaged then completePlace awards Bones once and is idempotent', () => {
  const s = newGame({ name: 'Scout' });
  OB.ensureOnboard(s);
  const before = s.bones;
  assert.equal(OB.markEngaged(s, 'launch', 'use').ok, true);
  assert.equal(OB.isEngaged(s, 'launch'), true);
  const r = OB.completePlace(s, 'launch');
  assert.equal(r.ok, true);
  assert.equal(r.bones, 25);
  assert.equal(s.bones, before + 25);
  assert.equal(s.stats.bonesEarned, 25);
  assert.ok(OB.isPlaceDone(s, 'launch'));
  assert.equal(OB.completePlace(s, 'launch').ok, false);
  assert.equal(OB.markEngaged(s, 'launch', 'use').ok, false);
  assert.equal(s.bones, before + 25);
  assert.ok(OB.mascotFor(s, 'launch')?.name);
  assert.equal(OB.mascotFor(s, 'bank'), null);
});

test('cafe refuses use-kind engagement; act grants apron once', () => {
  const s = newGame({ name: 'Barista' });
  assert.equal(OB.markEngaged(s, 'cafe', 'use').ok, false);
  assert.equal(OB.completePlace(s, 'cafe').ok, false);
  assert.equal(OB.markEngaged(s, 'cafe', 'act').ok, true);
  const r = OB.completePlace(s, 'cafe');
  assert.equal(r.ok, true);
  assert.ok(r.cosmetics.includes('ob_apron_pin'));
  assert.ok(s.wardrobe.owned.includes('ob_apron_pin'));
  assert.equal(OUTFITS.ob_apron_pin.quest, true);
  assert.equal(buyOutfit(s, 'ob_apron_pin').ok, false);
  assert.match(buyOutfit(newGame(), 'ob_apron_pin').reason, /never sold|Quest reward/i);
  assert.equal(tradeInfo('w:ob_apron_pin').tradeable, false);
  assert.equal(tradeInfo('w:ob_scout_bandana').tradeable, false);
  assert.equal(tradeInfo('w:ob_verse_pin').tradeable, false);
});

test('home refuses use-kind; claim grants Bones', () => {
  const s = newGame({ name: 'Homey' });
  assert.equal(OB.markEngaged(s, 'home', 'use').ok, false);
  assert.equal(OB.completePlace(s, 'home').ok, false);
  assert.equal(OB.markEngaged(s, 'home', 'claim').ok, true);
  const r = OB.completePlace(s, 'home');
  assert.equal(r.ok, true);
  assert.equal(r.bones, 30);
});

test('milestones grant scout bandana and graduate pin (never sold)', () => {
  const s = newGame({ name: 'Grad' });
  const engage = (q) => {
    const k = q.need || 'use';
    assert.equal(OB.markEngaged(s, q.place, k).ok, true);
    assert.equal(OB.completePlace(s, q.place).ok, true);
  };
  for (const q of OB.PLACE_QUESTS.slice(0, 5)) engage(q);
  assert.equal(s.onboard.milestones.half, undefined);
  engage(OB.PLACE_QUESTS[5]);
  assert.ok(s.onboard.milestones.half);
  assert.ok(s.wardrobe.owned.includes('ob_scout_bandana'));
  for (const q of OB.PLACE_QUESTS.slice(6)) engage(q);
  assert.ok(OB.allDone(s));
  assert.ok(s.onboard.milestones.all);
  assert.ok(s.wardrobe.owned.includes('ob_verse_pin'));
  assert.equal(OB.activeMascots(s).length, OB.PLACE_QUESTS.length);
  assert.ok(buyOutfit(s, 'ob_verse_pin').reason);
});

test('placeFromInteract maps doors and panels', () => {
  assert.equal(OB.placeFromInteract({ kind: 'building', id: 'launch' }), 'launch');
  assert.equal(OB.placeFromInteract({ kind: 'bank', id: 'bank' }), 'bank');
  assert.equal(OB.placeFromInteract({ kind: 'arcade', id: 'arcade' }), 'arcade');
  assert.equal(OB.placeFromInteract({ kind: 'gamedoor', id: 'rescue' }), 'rescue');
  assert.equal(OB.placeFromInteract({ kind: 'gamedoor', id: 'quest' }), 'quest');
  assert.equal(OB.placeFromInteract({ kind: 'shuttle', id: 'shuttle' }), 'shuttle');
  assert.equal(OB.placeFromInteract({ kind: 'plot', id: 'p1' }), 'home');
  assert.equal(OB.placeFromInteract({ kind: 'mall', id: 'leaders', cat: 'leaders' }), 'leaders');
  assert.equal(OB.placeFromInteract({ kind: 'farm', id: 'market' }), 'market');
  assert.equal(OB.placeFromPanel('launch'), 'launch');
  assert.equal(OB.placeFromPanel('bank'), 'bank');
  assert.equal(OB.placeFromPanel('fasttravel'), 'shuttle');
  assert.equal(OB.placeFromPanel('diner'), 'cafe');
  assert.equal(OB.placeFromPanel('farm', { id: 'market' }), 'market');
});

test('mascots are placeholders labelled for Inu Art Studio', () => {
  for (const q of OB.PLACE_QUESTS) {
    assert.ok(q.mascot?.name);
    assert.match(q.mascot.label, /Inu Art Studio/i);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/game.js';
import { earnBones, equipOutfit, ensureWardrobe, OUTFITS } from '../src/outfits.js';
import { ensurePair } from '../src/pairing.js';
import {
  QUIZ_BANK, LESSONS, QUIZ_STRIKE_CAP, DAILY_CARD_COUNT, DISCLAIMER,
  ensureAcademy, lessonOfDay, dailyQuizCards, quizStatus, answerQuiz,
  clearLesson, reportCard, boardSummary, lessonBonesFor,
} from '../src/academy.js';
import { sydneyDay } from '../src/loginstreak.js';
import { SCENES, scene, DOOR_SCENES, sceneForDoor } from '../src/scenes.js';
import { BUILDINGS } from '../src/world.js';

test('quiz bank has 5–8 cards covering required topics', () => {
  assert.ok(QUIZ_BANK.length >= 5 && QUIZ_BANK.length <= 8);
  const blob = QUIZ_BANK.map((c) => c.topic + c.q + c.choices.join(' ')).join(' ').toLowerCase();
  for (const needle of ['bonding', 'creator', 'verified', 'mint', 'freeze', 'kibble', 'play-money', 'advice']) {
    assert.ok(blob.includes(needle) || blob.includes(needle.replace('-', ' ')), needle);
  }
  for (const c of QUIZ_BANK) {
    assert.ok(c.choices.length >= 3);
    assert.ok(c.correct >= 0 && c.correct < c.choices.length);
  }
});

test('disclaimer is always present on board summary', () => {
  const s = newGame();
  const sum = boardSummary(s, Date.parse('2026-10-25T12:00:00+11:00'));
  assert.equal(sum.disclaimer, DISCLAIMER);
  assert.match(sum.disclaimer, /not investment advice/i);
});

test('daily quiz rotates and caps at DAILY_CARD_COUNT', () => {
  const a = dailyQuizCards(Date.parse('2026-10-25T12:00:00+11:00'));
  const b = dailyQuizCards(Date.parse('2026-10-26T12:00:00+11:00'));
  assert.equal(a.cards.length, DAILY_CARD_COUNT);
  assert.equal(b.cards.length, DAILY_CARD_COUNT);
  assert.notEqual(a.day, b.day);
  // sets differ or start at different index for adjacent days (very likely)
  const idsA = a.cards.map((c) => c.id).join(',');
  const idsB = b.cards.map((c) => c.id).join(',');
  assert.notEqual(idsA, idsB);
});

test('3-strike day cap locks further answers', () => {
  const s = newGame();
  const now = Date.parse('2026-10-25T15:00:00+11:00');
  const st = quizStatus(s, now);
  const card = st.cards[0];
  const wrong = card.correct === 0 ? 1 : 0;
  for (let i = 0; i < QUIZ_STRIKE_CAP; i++) {
    const r = answerQuiz(s, card.id, wrong, now);
    assert.equal(r.ok, true);
    assert.equal(r.correct, false);
  }
  assert.equal(quizStatus(s, now).locked, true);
  const again = answerQuiz(s, st.cards[1].id, st.cards[1].correct, now);
  assert.equal(again.ok, false);
  assert.match(again.reason, /three strikes/i);
});

test('correct answers clear daily set and credit Bones via earnBones', () => {
  const s = newGame();
  ensureWardrobe(s);
  // equip a bones-bonus outfit if available
  const bonusId = Object.keys(OUTFITS).find((id) => OUTFITS[id].bonesBonus > 0);
  if (bonusId) { s.wardrobe.owned.push(bonusId); equipOutfit(s, bonusId); }
  const before = s.bones;
  const now = Date.parse('2026-10-25T16:00:00+11:00');
  const st = quizStatus(s, now);
  for (const c of st.cards) {
    const r = answerQuiz(s, c.id, c.correct, now);
    assert.equal(r.ok, true);
    assert.equal(r.correct, true);
  }
  const done = quizStatus(s, now);
  assert.equal(done.doneToday, true);
  assert.ok(s.bones > before, 'Bones credited on daily quiz clear');
  assert.ok(ensureAcademy(s).bonesEarned > 0);
});

test('first lesson clear awards 15–40 Bones through earnBones (outfit bonus applies)', () => {
  const s = newGame();
  ensureWardrobe(s);
  const bonusId = Object.keys(OUTFITS).find((id) => (OUTFITS[id].bonesBonus || 0) >= 2);
  if (bonusId) { s.wardrobe.owned.push(bonusId); equipOutfit(s, bonusId); }
  const now = Date.parse('2026-10-25T10:00:00+11:00');
  const { lesson, day } = lessonOfDay(now);
  const base = lessonBonesFor(lesson.id, day);
  assert.ok(base >= 15 && base <= 40);
  const before = s.bones;
  const r = clearLesson(s, lesson.id, now);
  assert.equal(r.ok, true);
  assert.equal(r.bones.base, base);
  assert.equal(r.bones.total, base + r.bones.bonus);
  assert.equal(s.bones, before + r.bones.total);
  const again = clearLesson(s, lesson.id, now);
  assert.equal(again.ok, false);
  assert.equal(again.repeat, true);
});

test('pup report card lists breedPups (max 6) as classmates', () => {
  const s = newGame();
  const P = ensurePair(s);
  for (let i = 0; i < 7; i++) P.breedPups.push({ id: 'p' + i, name: 'Pup' + i, look: { coat: '#e8a25a' }, parents: ['A', 'B'] });
  // pairing enforces max 6 on breed(); report card still slices to 6
  const R = reportCard(s);
  assert.equal(R.classmates.length, 6);
  assert.equal(R.classmates[0].name, 'Pup0');
});

test('academy building + walkable classroom + Dean desk panel', () => {
  assert.ok(BUILDINGS.some((b) => b.id === 'academy'));
  assert.equal(SCENES.academy.kind, 'interior');
  assert.ok(SCENES.academy.npcs.some((n) => n.name === 'Dean Barkley'));
  const sc = scene('academy');
  assert.ok(sc.spots.some((s) => s.act?.panel === 'academy'));
  assert.equal(DOOR_SCENES['building:academy'], 'academy');
  assert.equal(sceneForDoor({ kind: 'building', id: 'academy' }), 'academy');
  // map not ragged
  assert.ok(SCENES.academy.map.every((r) => r.length === sc.w));
});

test('earnBones helper still used (sanity import)', () => {
  const s = newGame();
  const r = earnBones(s, 5);
  assert.equal(r.total, 5);
});

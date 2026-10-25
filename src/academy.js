// Good Boy Academy Phase 1: daily trading lessons + quizzes + Bones (no $KIBBLE / Coach fee / Pawmarks).
// Educational game fiction only — not investment advice. Pure logic (no DOM).
import { earnBones } from './outfits.js';
import { ensurePair } from './pairing.js';
import { sydneyDay } from './loginstreak.js';

export const DISCLAIMER =
  'Educational game fiction only. Not investment advice. Play-money lessons — nothing here is a recommendation to buy, sell or hold any token.';

export const QUIZ_STRIKE_CAP = 3;
export const DAILY_CARD_COUNT = 5;
export const LESSON_BONES_MIN = 15;
export const LESSON_BONES_MAX = 40;

/** Quiz bank (5–8 cards). Correct index is 0-based into choices. */
export const QUIZ_BANK = Object.freeze([
  {
    id: 'curve',
    topic: 'Bonding curve basics',
    q: 'On a typical pump.fun-style bonding curve, early buys tend to…',
    choices: [
      'Cost less per token than later buys on the same curve (price rises as supply is bought)',
      'Always cost the same fixed price forever',
      'Refund your SOL automatically after 24 hours',
      'Guarantee a profit if you hold overnight',
    ],
    correct: 0,
    explain: 'Curves usually start cheaper and get pricier as more of the supply is bought. That is play-money fiction here — not a tip.',
  },
  {
    id: 'fees',
    topic: 'Creator vs protocol fee',
    q: 'Creator fees and protocol fees are…',
    choices: [
      'The same wallet receiving every trade forever',
      'Different: creator fee can go to the coin’s creator split; protocol fee goes to the launch platform',
      'Both paid only in Bones inside Inu Verse',
      'Illegal to talk about in a game',
    ],
    correct: 1,
    explain: 'Creator share is about the coin’s published split; protocol fee is the platform’s cut. Game fiction — not advice.',
  },
  {
    id: 'verified',
    topic: 'Verified Launch checks',
    q: 'A Verified Launch badge in Inu Verse means…',
    choices: [
      'The coin will 100× — guaranteed',
      'Opt-in checks (authorities, fee split, snipes window, top holders) passed when last checked',
      'President Inu personally endorses the ticker',
      'You must pay $KIBBLE to see the badge',
    ],
    correct: 1,
    explain: 'Verified Launch is opt-in and check-based. Pass ≠ investment advice. Unknown checks never count as a pass.',
  },
  {
    id: 'auth',
    topic: 'Mint / freeze authority',
    q: 'For Verified Launch “authorities” check, mint and freeze authority should be…',
    choices: [
      'Both still held by the creator forever',
      'Both null (revoked / renounced) when the check can read them',
      'Transferred to Dean Barkley',
      'Irrelevant if the logo looks cute',
    ],
    correct: 1,
    explain: 'Renounced mint + freeze authority is one of the on-chain checks. Cute logos do not pass checks.',
  },
  {
    id: 'pair',
    topic: '$KIBBLE pair vs SOL',
    q: 'In Launch Hall, pairing with $KIBBLE vs SOL means…',
    choices: [
      '$KIBBLE pair is always risk-free; SOL pair is banned',
      'Which quote asset the launch/practice flow emphasises — still play-money fiction, never a promise',
      'You earn double Bones for $KIBBLE pairs',
      'SOL pairs skip Verified Launch forever',
    ],
    correct: 1,
    explain: 'Pair choice is a launch setting in the game UI. Neither pair is financial advice.',
  },
  {
    id: 'playmoney',
    topic: 'Play-money / not financial advice',
    q: 'Bones, practice launches and Academy quizzes are…',
    choices: [
      'Licensed financial products under Australian law',
      'In-game fiction for learning vibes — not investment advice and not real returns',
      'A Coach fee that bills your wallet nightly',
      'A way to mint real $KIBBLE for free',
    ],
    correct: 1,
    explain: 'Always: educational game fiction, not investment advice. No Coach fee here.',
  },
  {
    id: 'snipe',
    topic: 'Verified Launch — snipes window',
    q: 'The “no snipes” style check looks at early slots after creation to see if…',
    choices: [
      'Only the creator (not other wallets) picked up tokens in that short window',
      'The chart drew a green candle emoji',
      'Telegram has 10k members',
      'Dean Barkley barked three times',
    ],
    correct: 0,
    explain: 'Early non-creator grabs in the creation-slot window can fail the check. Fiction classroom — not a buy signal.',
  },
  {
    id: 'top10',
    topic: 'Verified Launch — top holders',
    q: 'A top-holder style check usually wants large holders (excluding curve/pool vaults) to be…',
    choices: [
      'Each under a small % of supply (e.g. under 1% in Verified Launch)',
      'All the same wallet as the Dean',
      'Hidden so nobody can read them',
      'Paid in Bones to stay listed',
    ],
    correct: 0,
    explain: 'Concentration checks are about published on-chain reads. Still not financial advice.',
  },
]);

export const LESSONS = Object.freeze([
  {
    id: 'L-curve',
    title: 'Bonding curves in plain pup',
    body: 'A bonding curve is a pricing recipe: as more of the supply is bought along the curve, the price per token usually steps up. Early fills can be cheaper than later ones on the same curve. In Academy this is classroom fiction with Bones — not a tip to ape anything.',
    quizIds: ['curve', 'playmoney'],
  },
  {
    id: 'L-fees',
    title: 'Creator fee vs protocol fee',
    body: 'Creator fees are about how a coin’s creator share is split (when published). Protocol fees are the launch platform’s cut. They are not the same wallet story. Inu Verse can show published splits for transparency; that is never a payout promise to holders.',
    quizIds: ['fees', 'playmoney'],
  },
  {
    id: 'L-verified',
    title: 'Verified Launch checklist',
    body: 'Verified Launch is opt-in. Checks include mint/freeze authorities, fee-split evidence, an early snipes window, and top-holder concentration. Any check that cannot be read is “couldn’t check” — never treated as a pass. Badge ≠ endorsement.',
    quizIds: ['verified', 'auth', 'snipe', 'top10'],
  },
  {
    id: 'L-pair',
    title: '$KIBBLE pair vs SOL (classroom)',
    body: 'Launch Hall can emphasise a $KIBBLE pair or a SOL pair depending on the flow. Pairing is a UI/launch setting in this game world. Practice stays off-chain. Nothing here tells you what to buy.',
    quizIds: ['pair', 'playmoney'],
  },
  {
    id: 'L-safe',
    title: 'Play-money rules of the Academy',
    body: 'Bones are in-game. Practice launches must never hit /api/launch chain txs in Phase 1. Quizzes teach vocabulary. There is no Coach fee and Pawmarks are untouched. If it sounds like real financial advice, Dean Barkley will send you back to recess.',
    quizIds: ['playmoney', 'fees'],
  },
]);

const h32 = (str) => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};

export function ensureAcademy(s) {
  if (!s || typeof s !== 'object') return null;
  s.academy ||= {};
  const A = s.academy;
  if (!A.cleared || typeof A.cleared !== 'object') A.cleared = {};
  if (!A.quiz || typeof A.quiz !== 'object') A.quiz = {};
  A.quiz.day ??= null;
  A.quiz.strikes ??= 0;
  A.quiz.correct ??= {};
  A.quiz.doneToday ??= false;
  A.streak ??= { count: 0, last: null, pin: false };
  A.bonesEarned ??= 0;
  return A;
}

export function lessonOfDay(now = Date.now()) {
  const day = sydneyDay(now);
  const i = h32('lesson:' + day) % LESSONS.length;
  return { day, lesson: LESSONS[i] };
}

export function lessonBonesFor(lessonId, day) {
  const span = LESSON_BONES_MAX - LESSON_BONES_MIN + 1;
  return LESSON_BONES_MIN + (h32('bones:' + day + ':' + lessonId) % span);
}

export function dailyQuizCards(now = Date.now()) {
  const day = sydneyDay(now);
  const n = QUIZ_BANK.length;
  const start = h32('quizset:' + day) % n;
  const cards = [];
  for (let i = 0; i < Math.min(DAILY_CARD_COUNT, n); i++) cards.push(QUIZ_BANK[(start + i) % n]);
  return { day, cards };
}

function syncQuizDay(A, day) {
  if (A.quiz.day !== day) {
    A.quiz.day = day;
    A.quiz.strikes = 0;
    A.quiz.correct = {};
    A.quiz.doneToday = false;
  }
}

export function quizStatus(s, now = Date.now()) {
  const A = ensureAcademy(s);
  const { day, cards } = dailyQuizCards(now);
  syncQuizDay(A, day);
  const got = cards.filter((c) => A.quiz.correct[c.id]).length;
  return {
    day,
    cards,
    strikes: A.quiz.strikes,
    strikesLeft: Math.max(0, QUIZ_STRIKE_CAP - A.quiz.strikes),
    correctCount: got,
    total: cards.length,
    doneToday: !!A.quiz.doneToday || got >= cards.length,
    locked: A.quiz.strikes >= QUIZ_STRIKE_CAP && got < cards.length,
    streak: { ...A.streak },
  };
}

export function answerQuiz(s, cardId, choiceIdx, now = Date.now()) {
  const A = ensureAcademy(s);
  const st = quizStatus(s, now);
  if (st.locked) return { ok: false, reason: 'Three strikes today — try again tomorrow (Sydney day).' };
  if (st.doneToday) return { ok: false, reason: 'Daily quiz already cleared.' };
  const card = st.cards.find((c) => c.id === cardId);
  if (!card) return { ok: false, reason: 'That card is not in today’s set.' };
  if (A.quiz.correct[cardId]) return { ok: false, reason: 'Already got that one.' };
  const idx = Number(choiceIdx);
  if (!Number.isInteger(idx) || idx < 0 || idx >= card.choices.length) return { ok: false, reason: 'Pick a choice.' };
  if (idx === card.correct) {
    A.quiz.correct[cardId] = true;
    const next = quizStatus(s, now);
    let cleared = false, pin = false, bones = null;
    if (next.correctCount >= next.total) {
      A.quiz.doneToday = true;
      cleared = true;
      const r = bumpQuizStreak(A, st.day);
      pin = r.pin;
      // small Bones bump on first full clear of the day (on top of lesson clears)
      bones = earnBones(s, 10);
      A.bonesEarned += bones.total;
    }
    return { ok: true, correct: true, explain: card.explain, cleared, pin, bones, status: quizStatus(s, now) };
  }
  A.quiz.strikes += 1;
  return {
    ok: true,
    correct: false,
    explain: card.explain,
    strikes: A.quiz.strikes,
    locked: A.quiz.strikes >= QUIZ_STRIKE_CAP,
    status: quizStatus(s, now),
  };
}

function bumpQuizStreak(A, day) {
  const last = A.streak.last;
  const prev = last ? Date.parse(last + 'T12:00:00+11:00') : NaN;
  const cur = Date.parse(day + 'T12:00:00+11:00');
  const dayMs = 86400000;
  if (last === day) return { pin: !!A.streak.pin };
  if (Number.isFinite(prev) && cur - prev <= dayMs + 3600000) A.streak.count = (A.streak.count || 0) + 1;
  else A.streak.count = 1;
  A.streak.last = day;
  let pin = false;
  if (A.streak.count >= 3 && !A.streak.pin) { A.streak.pin = true; pin = true; }
  return { pin };
}

export function clearLesson(s, lessonId, now = Date.now()) {
  const A = ensureAcademy(s);
  const { day, lesson } = lessonOfDay(now);
  const id = lessonId || lesson.id;
  const L = LESSONS.find((x) => x.id === id) || lesson;
  if (A.cleared[L.id]) return { ok: false, reason: 'Already cleared this lesson.', lesson: L, repeat: true };
  const base = lessonBonesFor(L.id, day);
  const bones = earnBones(s, base);
  A.cleared[L.id] = { day, bones: bones.total, at: Date.now() };
  A.bonesEarned += bones.total;
  return { ok: true, lesson: L, bones, first: true };
}

export function reportCard(s) {
  ensureAcademy(s);
  const P = ensurePair(s);
  const pups = (P.breedPups || []).slice(0, 6);
  return {
    classmates: pups.map((pu) => ({
      id: pu.id,
      name: pu.name || 'Pup',
      rare: pu.rare?.name || null,
      parents: pu.parents || [],
      look: pu.look || null,
    })),
    max: 6,
    clearedLessons: Object.keys(s.academy.cleared || {}).length,
    bonesEarned: s.academy.bonesEarned || 0,
    quizStreak: s.academy.streak?.count || 0,
    quizPin: !!s.academy.streak?.pin,
  };
}

export function boardSummary(s, now = Date.now()) {
  const { day, lesson } = lessonOfDay(now);
  const quiz = quizStatus(s, now);
  const A = ensureAcademy(s);
  return {
    day,
    lesson,
    lessonCleared: !!A.cleared[lesson.id],
    lessonBones: lessonBonesFor(lesson.id, day),
    quiz,
    report: reportCard(s),
    disclaimer: DISCLAIMER,
  };
}

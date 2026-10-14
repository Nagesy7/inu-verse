import test from 'node:test'; import assert from 'node:assert/strict';
const { makePresident, scheduleNext, pickKind, startVisit, updatePresident, talk, KINDS, TIP } = await import('../src/president.js');
test('president visits are seeded every 3-6 in-game hours', () => {
  const a = makePresident(7), b = makePresident(7); const na = scheduleNext(a, 10), nb = scheduleNext(b, 10); assert.equal(na, nb); assert.ok(na >= 13 && na <= 16);
  const kinds = new Set(); for (let n = 0; n < 40; n++) { a.n = n; kinds.add(pickKind(a)); } assert.deepEqual([...kinds].sort(), [...KINDS].sort()); });
test('president arrives, stays, exits (walk) and tips once per visit', () => {
  const P = makePresident(3), hooks = { nowH: 0, dayLen: 720, npcs: [], rng: () => 0.5 }; startVisit(P, 'walk', hooks); assert.equal(P.stage, 'enter');
  for (let i = 0; i < 600 && P.stage === 'enter'; i++) updatePresident(P, 0.1, hooks); assert.equal(P.stage, 'visit');
  const s = { bones: 0 }; assert.equal(talk(P, s).tip, TIP); assert.equal(talk(P, s).tip, 0); assert.equal(s.bones, TIP);
  P.t = P.stay + 1; for (let i = 0; i < 2000 && P.on; i++) updatePresident(P, 0.1, hooks); assert.equal(P.on, false); assert.ok(P.next > 0); });

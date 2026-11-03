import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as Q from '../src/quests.js';
import { FOLK_NAMES } from '../src/townsfolk.js';
import { EVENT_IDS, eventForDay, dayNumber } from '../src/events.js';
import { JOBS } from '../src/jobs.js';
import { isSolid, interactables, KIBBLE_PLAZA } from '../src/world.js';
import { DRAWER } from '../src/hudmenu.js';

const days = (n, from = '2026-11-01') => Array.from({ length: n }, (_, i) => new Date(Date.parse(from + 'T00:00:00Z') + i * 864e5).toISOString().slice(0, 10));
const fresh = () => ({ bones: 0, wardrobe: { owned: [], equipped: {} } });

test('quests: 3 per Sydney day, deterministic from the date, named townsfolk givers, event tie-in first', () => {
  const seenKinds = new Set(), sets = new Set();
  for (const d of days(120)) { const ev = eventForDay(dayNumber(d)), a = Q.questsFor(d, ev), b = Q.questsFor(d, ev);
    assert.deepEqual(a, b, 'same date -> same quests'); assert.equal(a.length, 3); sets.add(a.map((q) => q.text).join('|'));
    assert.equal(a[0].kind, 'event'); assert.equal(a[0].ev, ev);
    assert.equal(new Set(a.map((q) => q.giver)).size, 3, 'three different givers'); assert.equal(new Set(a.map((q) => q.kind)).size, 3, 'three different kinds');
    for (const q of a) { assert.ok(FOLK_NAMES.includes(q.giver)); assert.ok(q.text.includes(q.giver) || q.kind === 'event'); assert.equal(q.reward, Q.REWARD[q.kind]); seenKinds.add(q.kind);
      if (q.kind === 'deliver') { assert.ok(Q.NEAR_FOLK.includes(q.to)); assert.notEqual(q.to, q.giver); }
      if (q.kind === 'find') assert.ok(Q.FIND_SPOTS[q.spot]); if (q.kind === 'visit') assert.ok(interactables().some((i) => i.id === q.place), q.place);
      if (ev === 'derby') assert.notEqual(q.kind, 'fish', 'no duplicate fishing on Derby day'); } }
  assert.deepEqual([...seenKinds].sort(), ['deliver', 'event', 'find', 'fish', 'greet', 'visit']); assert.ok(sets.size > 100, 'boards vary day to day');
  for (const ev of EVENT_IDS) assert.ok(Q.EVENT_TIE[ev], ev);
  // Sydney date: 13:30 UTC on Nov 3 is already Nov 4 in Sydney (UTC+11)
  assert.equal(Q.today(Date.parse('2026-11-03T13:30:00Z'), 'festival').day, '2026-11-04'); assert.equal(Q.today(Date.parse('2026-11-03T12:30:00Z'), 'festival').day, '2026-11-03');
});

test('quests: Bones daily cap (below one job shift cap), paid once per quest, outfit bonus counted inside the cap', () => {
  assert.ok(Q.QUEST_DAILY_CAP <= Q.JOB_SHIFT_CAP_MIN && Q.JOB_SHIFT_CAP_MIN === Math.min(...Object.values(JOBS).map((j) => j.cap)));
  for (const d of days(60)) { const list = Q.questsFor(d, eventForDay(dayNumber(d))); assert.ok(list.reduce((a, q) => a + q.reward, 0) <= Q.QUEST_DAILY_CAP); }
  const s = fresh(), day = '2026-11-03', Qs = Q.ensure(s, day); let total = 0; for (let i = 0; i < 10; i++) total += Q.payQuest(s, Qs, 25).total;
  assert.equal(total, Q.QUEST_DAILY_CAP); assert.equal(s.bones, Q.QUEST_DAILY_CAP); assert.equal(Q.payQuest(s, Qs, 25).total, 0);
  const s2 = fresh(); s2.wardrobe.owned = ['ob_scout_bandana']; s2.wardrobe.equipped = { neck: 'ob_scout_bandana' }; const Q2 = Q.ensure(s2, day); let t2 = 0;
  for (let i = 0; i < 10; i++) t2 += Q.payQuest(s2, Q2, 25).total; assert.ok(t2 <= Q.QUEST_DAILY_CAP, 'bonus never pushes past the cap'); assert.equal(s2.bones, t2);
  Q.ensure(s, '2026-11-04'); assert.equal(s.dquests.paid, 0, 'new Sydney day resets the cap'); assert.equal(Q.payQuest(s, s.dquests, 20).total, 20);
});

test('quests: progress hooks finish each quest once and pay through earnBones', () => {
  const day = '2026-11-03', list = [{ id: 'a', kind: 'fish', n: 2, reward: 20, giver: 'Koko' }, { id: 'b', kind: 'deliver', to: 'Riku', n: 1, reward: 25, giver: 'Ume' }, { id: 'c', kind: 'greet', n: 3, reward: 20, giver: 'Sora' }],
    s = fresh(); s.stats = { bonesEarned: 0 };
  assert.equal(Q.note(s, day, list, 'fish').length, 0); assert.equal(Q.note(s, day, list, 'fish')[0].q.id, 'a'); assert.equal(Q.note(s, day, list, 'fish').length, 0, 'done quests stay done');
  assert.equal(Q.note(s, day, list, 'talk', { name: 'Koko' }).length, 0); assert.equal(Q.note(s, day, list, 'talk', { name: 'Koko' }).length, 0, 'same pup twice counts once');
  const r = Q.note(s, day, list, 'talk', { name: 'Riku' }); assert.deepEqual(r.map((x) => x.q.id), ['b']);
  assert.deepEqual(Q.note(s, day, list, 'talk', { name: 'Sora' }).map((x) => x.q.id), ['c']); assert.equal(s.bones, 65); assert.equal(s.stats.bonesEarned, 65);
  const ev = [{ id: 'e', kind: 'event', ev: 'festival', n: 1, reward: 25 }, { id: 'f', kind: 'find', n: 1, reward: 25 }, { id: 't', kind: 'event', ev: 'trader', n: 1, reward: 25 }], s3 = fresh();
  assert.equal(Q.note(s3, day, ev, 'event', { ev: 'market', n: 1 }).length, 0, 'other events do not count'); assert.equal(Q.note(s3, day, ev, 'event', { ev: 'festival', n: 1 }).length, 1);
  assert.equal(Q.note(s3, day, ev, 'near', { id: 'x' }).length, 0); assert.equal(Q.note(s3, day, ev, 'near', { id: 'f' }).length, 1); assert.equal(Q.note(s3, day, ev, 'trader').length, 1);
});

test('quests: stickers on sticker days for a full board, Town Helper badge, all cosmetic', () => {
  const sd = days(60).filter(Q.stickerDay); assert.ok(sd.length >= 10 && sd.length <= 35, 'roughly one day in three'); assert.equal(Q.stickerDay(sd[0]), true);
  const s = fresh(); let got = [];
  for (const d of days(30)) { const list = Q.questsFor(d, 'trader'); for (const q of list) { const r = Q.note(s, d, list, q.kind === 'event' ? 'trader' : q.kind === 'fish' ? 'fish' : q.kind === 'deliver' ? 'talk' : q.kind === 'greet' ? 'talk' : 'near', q.kind === 'deliver' ? { name: q.to } : { id: q.id, name: 'x' + Math.random() });
    if (q.kind === 'fish') for (let i = 0; i < 3; i++) Q.note(s, d, list, 'fish'); if (q.kind === 'greet') for (const n of ['A', 'B', 'C']) Q.note(s, d, list, 'talk', { name: n }); for (const x of r) if (x.sticker) got.push(x.sticker.id); }
    for (const q of list) assert.ok(Q.isDone(s.dquests, q), d + ' ' + q.kind); }
  assert.equal(s.dquests.full, 30); const want = Math.min(Q.STICKERS.length, days(30).filter(Q.stickerDay).length); assert.ok(want > 0 && got.length <= want);
  assert.deepEqual(s.dquests.stickers, Q.STICKERS.slice(0, want).map((x) => x.id), 'one sticker per finished sticker day, in order, never random');
  assert.ok(s.engage.badges.includes(Q.HELPER_BADGE));
});

test('quests: no $KIBBLE / wallet / pay / burn / fee paths, no randomness, no network in the quest code', () => {
  const src = readFileSync(new URL('../src/quests.js', import.meta.url), 'utf8') + readFileSync(new URL('../src/questsui.js', import.meta.url), 'utf8');
  const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n').replace(/never KIBBLE/g, '').replace(/Kibble (Plaza|Bank|Mall)|KIBBLE_PLAZA/g, '');
  for (const bad of [/kibble-?pay/i, /\bburn/i, /wallet/i, /phantom/i, /solana/i, /\bfetch\s*\(/, /Math\.random/, /\bwager/i, /\bfee\b/i, /lottery|raffle/i, /\$KIBBLE/, /kibble/i]) assert.doesNotMatch(code, bad, String(bad));
  for (const m of src.matchAll(/from '\.\/([a-z0-9]+)\.js'/g)) assert.ok(['townsfolk', 'events', 'outfits', 'jobs', 'quests', 'world'].includes(m[1]), m[1]);
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8'), blk = main.slice(main.indexOf('// ---- Daily Quests'), main.indexOf("globalThis.__quests"));
  assert.ok(blk.length > 500); assert.doesNotMatch(blk, /kibble|wallet|fetch\(|FEEDUI|burn/i);
});

test('quests: plaza board is solid with a walkable reading spot, menu entry + HUD chip wired', () => {
  const B = KIBBLE_PLAZA.quests; assert.ok(isSolid(B.x, B.y)); assert.ok(!isSolid(B.x, B.y + 1));
  const it = interactables().find((i) => i.kind === 'dquest'); assert.ok(it && it.tx === B.x && it.ty === B.y + 1);
  assert.ok(DRAWER.find(([t]) => t === 'Explore')[1].includes('btn-daily'));
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8'), main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8'), ui = readFileSync(new URL('../src/questsui.js', import.meta.url), 'utf8');
  assert.match(html, /id="btn-daily"/); assert.match(main, /kind === 'dquests'/); assert.match(main, /it\.kind === 'dquest'/);
  assert.match(ui, /role', 'button'/); assert.match(ui, /@media \(max-height:430px\)\{#dq-chip b\{display:none\}\}/, 'chip shrinks to icon + count on phones');
});

import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, buyFurniture } from '../src/game.js';
import { save, load, MemoryStorage } from '../src/save.js';
import { mulberry32 } from '../src/rng.js';
import { ensurePacks, createPack, joinPack, leavePack, kickMember, contribute, buyForPack, donateFurniture, placePackFurniture, storePackFurniture, postToBoard, recordActivity, memberScore, packScore, leaderboard, simulatePacks, recruitNpc, myPack, PACK_CREATE_COST, SEASON, ME } from '../src/packs.js';

const rich = () => { const s = newGame({ name: 'Kabo' }); s.bones = 2000; ensurePacks(s); return s; };

test('seeds 3 simulated NPC packs with members, board and clubhouse', () => {
  const s = rich(); const all = Object.values(s.packs.all);
  assert.equal(all.length, 3); assert.ok(all.every((p) => p.npc && p.members.length >= 3 && p.board.length && p.clubhouse.items.length));
  assert.equal(s.packs.joined, null); assert.match(SEASON.name, /Kibble Cup – Season 1 \(preview\)/);
});
test('create pack: costs bones, validates, sets me as leader', () => {
  const s = rich();
  assert.equal(createPack(s, { name: 'ab', tag: 'AB' }).ok, false, 'short name');
  assert.equal(createPack(s, { name: 'Good Name', tag: 'x' }).ok, false, 'short tag');
  assert.equal(createPack(s, { name: 'Copy Cats', tag: 'BARK' }).ok, false, 'tag taken');
  const poor = rich(); poor.bones = 10; assert.equal(createPack(poor, { name: 'Poor Pups', tag: 'POOR' }).ok, false);
  const r = createPack(s, { name: 'Shiba Squad', tag: 'shib!', color: '#ff7a3a', emblem: 'bone' });
  assert.ok(r.ok); assert.equal(s.bones, 2000 - PACK_CREATE_COST); assert.equal(r.pack.tag, 'SHIB'); assert.equal(r.pack.ownerId, ME);
  assert.equal(myPack(s).members[0].role, 'leader'); assert.equal(createPack(s, { name: 'Second', tag: 'TWO' }).ok, false, 'one pack at a time');
});
test('join + leave NPC pack; leader leaving transfers; sole member disbands', () => {
  const s = rich();
  assert.ok(joinPack(s, 'pk_bark').ok); assert.equal(joinPack(s, 'pk_snif').ok, false);
  assert.equal(myPack(s).members.length, 4); assert.match(myPack(s).board[0].text, /joined/);
  assert.equal(kickMember(s, 'npc_taro').ok, false, 'only leader kicks');
  assert.ok(leavePack(s).ok); assert.equal(s.packs.joined, null); assert.equal(s.packs.all.pk_bark.members.length, 3);
  createPack(s, { name: 'Solo Pup', tag: 'SOLO' }); const id = s.packs.joined; recruitNpc(s, mulberry32(1));
  assert.ok(kickMember(s, myPack(s).members[1].id).ok); assert.equal(myPack(s).members.length, 1);
  recruitNpc(s, mulberry32(2)); const heir = myPack(s).members[1];
  assert.equal(leavePack(s).ok, true); assert.equal(s.packs.all[id].ownerId, heir.id, 'leadership transferred');
  const s2 = rich(); createPack(s2, { name: 'Lonely', tag: 'LONE' }); const id2 = s2.packs.joined;
  assert.equal(leavePack(s2).disbanded, true); assert.equal(s2.packs.all[id2], undefined);
});
test('treasury contributions, buying into the shared pool, decorating', () => {
  const s = rich(); joinPack(s, 'pk_zoom'); const p = myPack(s), t0 = p.treasury;
  assert.equal(contribute(s, 0).ok, false); assert.equal(contribute(s, 99999).ok, false);
  assert.ok(contribute(s, 300).ok); assert.equal(p.treasury, t0 + 300); assert.equal(s.bones, 1700);
  assert.ok(buyForPack(s, 'sofa').ok); assert.equal(p.treasury, t0 + 300 - 90); assert.equal(p.pool.sofa, 1);
  buyFurniture(s, 'lamp'); assert.ok(donateFurniture(s, 'lamp').ok); assert.equal(s.inventory.lamp, undefined);
  const n0 = p.clubhouse.items.length;
  assert.ok(placePackFurniture(s, 'sofa', 5, 6).ok); assert.equal(placePackFurniture(s, 'sofa', 5, 6).ok, false, 'pool empty');
  const lamp = placePackFurniture(s, 'lamp', 9, 6); assert.ok(lamp.ok); assert.equal(p.clubhouse.items.length, n0 + 2);
  assert.ok(storePackFurniture(s, lamp.item.uid).ok); assert.equal(p.pool.lamp, 1);
});
test('score calc: shifts, tokens, decorating and contributions', () => {
  assert.equal(memberScore({ shifts: 2, tokens: 1, decor: 3, contributed: 105 }), 20 + 25 + 15 + 10);
  const s = rich(); createPack(s, { name: 'Score Pups', tag: 'SCOR' });
  recordActivity(s, 'shift'); recordActivity(s, 'shift'); recordActivity(s, 'token'); contribute(s, 50);
  assert.equal(packScore(myPack(s)), 20 + 25 + 5); assert.equal(recordActivity(s, 'nap').ok, false);
  const lb = leaderboard(s); assert.equal(lb.length, 4); assert.ok(lb.every((r, i) => !i || lb[i - 1].score >= r.score)); assert.ok(lb.find((r) => r.mine));
});
test('board posts and NPC simulation', () => {
  const s = rich(); assert.equal(postToBoard(s, 'hi').ok, false, 'must be in pack');
  joinPack(s, 'pk_snif'); assert.equal(postToBoard(s, '   ').ok, false);
  assert.ok(postToBoard(s, 'Hello Sniffers!').ok); assert.equal(myPack(s).board[0].author, 'Kabo');
  assert.equal(postToBoard(s, 'x'.repeat(500)).post.text.length, 140);
  const before = packScore(s.packs.all.pk_bark), rng = mulberry32(7); for (let i = 0; i < 200; i++) simulatePacks(s, rng);
  assert.ok(packScore(s.packs.all.pk_bark) > before); assert.ok(s.packs.all.pk_snif.board.length <= 60);
});
test('packs save/load round trip and migration of old saves', () => {
  const st = new MemoryStorage(), s = rich(); createPack(s, { name: 'Saved Pups', tag: 'SAVE', color: '#123456' });
  contribute(s, 100); buyForPack(s, 'plant'); placePackFurniture(s, 'plant', 1, 1); postToBoard(s, 'persist me');
  save(s, st); const l = load(st);
  assert.deepEqual(l.packs, JSON.parse(JSON.stringify(s.packs))); assert.equal(myPack(l).name, 'Saved Pups'); assert.equal(myPack(l).board[0].text, 'persist me');
  const old = newGame(); delete old.packs; st.setItem('inuverse.save.v1', JSON.stringify(old)); const m = load(st);
  assert.equal(Object.keys(m.packs.all).length, 3); assert.equal(m.packs.joined, null);
});

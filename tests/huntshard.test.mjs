// Kibble Hunt hidden Golden Bowl shard: off the main paths, reachable, not listed by the guide, reports a signed-in find.
import test from 'node:test'; import assert from 'node:assert/strict';
import * as W from '../src/world.js'; import { places } from '../src/guide.js'; import * as HS from '../src/huntshard.js';
test('shard is an interactable on a walkable, reachable tile away from roads and other spots', () => {
  const it = W.interactables({}).find((i) => i.kind === 'shard'); assert.ok(it); assert.equal(it.tx, HS.SHARD.tx);
  assert.equal(W.isSolid(it.tx, it.ty), false); assert.ok(W.findPath(31, 44, it.tx, it.ty), 'reachable from the avenue');
  assert.ok(![W.T.ROAD, W.T.WALK, W.T.PLAZA].includes(W.MAP[it.ty][it.tx]), 'off the main path');
  for (const o of W.interactables({})) if (o.kind !== 'shard') assert.ok(Math.hypot(o.tx - it.tx, o.ty - it.ty) > 4, `not next to ${o.id}`);
});
test('guide never lists the shard', () => { assert.equal(places({ plots: {}, tokens: [] }).some((p) => p.kind === 'shard' || p.id === HS.SHARD.id), false); });
test('reportFind: demo + signed-out ask to sign in, signed-in posts op find with the spot id, errors never throw', async () => {
  const s = {};
  assert.equal((await HS.reportFind(s, null, { demo: true })).ok, false);
  assert.equal((await HS.reportFind(s, { signedIn: false })).needSignIn, true);
  const calls = []; const kp = { signedIn: true, address: 'W', _req: async (p, b) => { calls.push([p, b]); return { ok: true, bones: 150, found: ['inu-verse'] }; } };
  const r = await HS.reportFind(s, kp); assert.equal(r.ok, true); assert.match(r.msg, /\+150 Bones/);
  assert.deepEqual(calls[0], ['/api/game?action=hunt', { op: 'find', game: 'inu-verse', spot: HS.SPOT }]); assert.ok(s.hunt.shard.at);
  const again = await HS.reportFind(s, { ...kp, _req: async () => ({ ok: true, bones: 0, already: true }) }); assert.match(again.msg, /already found/);
  const bad = await HS.reportFind({}, { ...kp, _req: async () => { throw new Error('Open Inu Verse signed in with your wallet first'); } }); assert.equal(bad.ok, false);
  assert.doesNotMatch(String(HS.reportFind), /KIBBLE|lamports|transfer/);
});
test('sparkle prop draws without throwing', () => { const ops = []; const c = new Proxy({}, { get: (_, k) => (k === 'globalAlpha' || k === 'fillStyle' ? 0 : () => ops.push(k)), set: () => true });
  for (const p of HS.shardProps(1.2, W.TILE)) p.d(c); assert.ok(ops.includes('fillRect')); });

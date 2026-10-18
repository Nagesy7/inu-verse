// Follow-up A: the realtime Worker looks Kennel tiers up itself (kibble-pay /api/kennel), caches one lookup per wallet per
// 10 min, ignores whatever tier the client sends, and fails closed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeKennelLookup, kennelFromBody, stripKennel, KENNEL_TTL_MS } from '../realtime/src/kennel.js';
import { cleanLook } from '../src/mpshared.js';
const W = '4VE9sy4fEMJdZ6i7MkYPbnqDJd2oqzJQmg44WJ3opump'.replace('pump', 'abcd'), W2 = 'Akk3n7UUeb8TWZn5w8y6uWvd2iGyEqpH4tWqf9Q56fn';
const ok = (body) => ({ ok: true, json: async () => body }), bad = (status) => ({ ok: false, status, json: async () => ({}) });

const v2 = (o = {}) => ({ wallet: W, tierSource: 'hold-streak', tier: null, locked: { flair: false, amount: 0, minAmount: 100000, unlockDate: null, count: 0 }, ...o });
const FX = JSON.parse(fs.readFileSync(new URL('./fixtures/kennel-v2.json', import.meta.url), 'utf8'));
const N = { k: null, lf: false };
test('kennelFromBody (v2): tier from hold streaks + locked.flair; same wallet only; v1 / unknown -> nothing', () => {
  assert.deepEqual(kennelFromBody(v2({ tier: 'guard' }), W), { k: 'guard', lf: false }); assert.deepEqual(kennelFromBody(v2({ tier: 'topdog' }), W), { k: 'top', lf: false });
  assert.deepEqual(kennelFromBody(v2({ tier: 'pup', locked: { flair: true, amount: 900000 } }), W), { k: 'pup', lf: true }, 'Pup + Locked flair');
  assert.deepEqual(kennelFromBody(v2({ tier: null, locked: { flair: true } }), W), { k: null, lf: true }, 'flair alone never becomes a tier');
  assert.deepEqual(kennelFromBody(v2({ tier: 'top' }), W2), N, 'other wallet'); assert.deepEqual(kennelFromBody(v2({ tier: 'emperor' }), W), N);
  assert.deepEqual(kennelFromBody({ wallet: W, tier: 'guard', lockedAmount: 2e6 }, W), N, 'v1 lock-tier body is not trusted');
  assert.deepEqual(kennelFromBody(v2({ locked: { flair: 'yes' } }), W), N); assert.deepEqual(kennelFromBody(null, W), N); assert.deepEqual(kennelFromBody('top', W), N);
  const fw = FX.wallet; assert.deepEqual(kennelFromBody(FX.noTier, fw), N); assert.deepEqual(kennelFromBody(FX.pupLocked, fw), { k: 'pup', lf: true }); assert.deepEqual(kennelFromBody(FX.topDog, fw), { k: 'top', lf: false }); });

test('lookup: one fetch per wallet per TTL (concurrent joins share it), refetch after TTL, fail closed on errors', async () => {
  let t = 0, calls = []; const f = async (url) => { calls.push(url); return ok(v2({ tier: 'alpha', locked: { flair: true } })); };
  const K = makeKennelLookup({ kpUrl: 'https://kp.test', f, now: () => t });
  const r = await Promise.all([K.lookup(W), K.lookup(W), K.lookup(W)]); assert.deepEqual(r, Array(3).fill({ k: 'alpha', lf: true })); assert.equal(calls.length, 1);
  assert.equal(calls[0], `https://kp.test/api/kennel?wallet=${W}`);
  t += KENNEL_TTL_MS - 1; await K.lookup(W); assert.equal(calls.length, 1); t += 2; await K.lookup(W); assert.equal(calls.length, 2, 'after TTL');
  for (const fail of [async () => bad(500), async () => bad(404), async () => { throw new Error('net'); }, async () => ok({ nope: 1 }), async () => ok({ wallet: W, tier: 'top' }), async () => ({ ok: true, json: async () => { throw new Error('json'); } })]) {
    const K2 = makeKennelLookup({ f: fail, now: () => 0 }); assert.deepEqual(await K2.lookup(W), N); }
  // a failure is cached too (no hammering kibble-pay), so it stays "no tier" until the TTL passes
  let n = 0; const K3 = makeKennelLookup({ f: async () => { n++; return bad(503); }, now: () => 0 }); await K3.lookup(W); await K3.lookup(W); assert.equal(n, 1);
  assert.deepEqual(await K.lookup('not-a-wallet'), N); assert.deepEqual(await K.lookup(null), N); });

test('lookup: colo Cache API shared between room objects (v2 key; an old v1 {tier} entry is ignored)', async () => {
  const store = new Map(), cache = { async match(k) { return store.has(k) ? new Response(store.get(k)) : undefined; }, async put(k, r) { store.set(k, await r.text()); } };
  store.set(`https://kennel-cache.inu-verse.internal/${W}`, JSON.stringify({ tier: 'top', at: 5 }));
  let n = 0; const f = async () => { n++; return ok(v2({ tier: 'pup', locked: { flair: true } })); };
  const roomA = makeKennelLookup({ f, cache, now: () => 5 }), roomB = makeKennelLookup({ f, cache, now: () => 6 });
  assert.deepEqual(await roomA.lookup(W), { k: 'pup', lf: true }); assert.deepEqual(await roomB.lookup(W), { k: 'pup', lf: true }); assert.equal(n, 1);
  store.set(`https://kennel-cache.inu-verse.internal/v2/${W2}`, JSON.stringify({ k: 'emperor', lf: true, at: 6 })); assert.deepEqual(await makeKennelLookup({ f: async () => bad(500), cache, now: () => 7 }).lookup(W2), N, 'bad cache entry ignored'); });

test('client-sent tiers are stripped from the look; real profiles are kept', () => {
  assert.equal(stripKennel(cleanLook({ coat: 'tan', pl: { look: { kennel: 'top' }, outfit: {} } })).pl, undefined);
  const l = stripKennel(cleanLook({ coat: 'tan', pl: { look: { kennel: 'top', coat: '#aabbcc' }, outfit: {} } })); assert.deepEqual(l.pl.look, { coat: '#aabbcc' });
  assert.deepEqual(stripKennel(cleanLook({ coat: 'tan' })), { coat: 'tan', eq: {} }); });

test('worker wiring: tier + Locked flair only from the server lookup, guests get none, pub() carries k only with a verified wallet', () => {
  const w = fs.readFileSync(new URL('../realtime/src/worker.js', import.meta.url), 'utf8');
  assert.match(w, /a\.wf = wallet \|\| null; a\.k = null; a\.lf = false/); assert.match(w, /k: \(a\.w && a\.k\) \|\| null, lf: !!\(a\.w && a\.lf\)/);
  assert.match(w, /\{ t: 'k', id: a\.id, k: tier, lf \}/, 'broadcasts tier + flair'); assert.match(w, /lf = r\?\.lf === true/, 'flair fails closed');
  assert.equal((w.match(/stripKennel\(cleanLook\(/g) || []).length, 2, 'hello + look both strip');
  assert.match(w, /refreshKennel\(ws\)/); });

test('worker refreshKennel: broadcasts the looked-up tier + flair to everyone; lookup throw -> nothing', async () => {
  globalThis.WebSocketRequestResponsePair ??= class {}; const { Room } = await import('../realtime/src/worker.js');
  const mk = (att) => { const w = { att, sent: [], readyState: 1, deserializeAttachment() { return this.att && JSON.parse(JSON.stringify(this.att)); }, serializeAttachment(a) { this.att = a; }, send(s) { this.sent.push(JSON.parse(s)); } }; return w; };
  const me = mk({ id: 'm', joined: true, w: 'Akk3…56fn', wf: W2, k: null, lf: false, kAt: 0 }), other = mk({ id: 'o', joined: true });
  const room = new Room({ getWebSockets: () => [me, other], setWebSocketAutoResponse() {} }, {});
  room.kennel = { lookup: async () => ({ k: 'pup', lf: true }) }; await room.refreshKennel(me);
  assert.deepEqual(other.sent.at(-1), { t: 'k', id: 'm', k: 'pup', lf: true }); assert.deepEqual(me.sent.at(-1), { t: 'k', id: 'm', k: 'pup', lf: true });
  assert.deepEqual({ k: room.pub(me.att).k, lf: room.pub(me.att).lf }, { k: 'pup', lf: true });
  me.att.kAt = 0; room.kennel = { lookup: async () => { throw new Error('boom'); } }; await room.refreshKennel(me); assert.deepEqual(other.sent.at(-1), { t: 'k', id: 'm', k: null, lf: false });
  const guest = mk({ id: 'g', joined: true, w: null, wf: null, k: 'top', lf: true }); assert.deepEqual([room.pub(guest.att).k, room.pub(guest.att).lf], [null, false], 'guests never carry a tier or flair'); });

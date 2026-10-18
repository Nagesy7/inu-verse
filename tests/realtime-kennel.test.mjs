// Follow-up A: the realtime Worker looks Kennel tiers up itself (kibble-pay /api/kennel), caches one lookup per wallet per
// 10 min, ignores whatever tier the client sends, and fails closed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeKennelLookup, kennelFromBody, stripKennel, KENNEL_TTL_MS } from '../realtime/src/kennel.js';
import { cleanLook } from '../src/mpshared.js';
const W = '4VE9sy4fEMJdZ6i7MkYPbnqDJd2oqzJQmg44WJ3opump'.replace('pump', 'abcd'), W2 = 'Akk3n7UUeb8TWZn5w8y6uWvd2iGyEqpH4tWqf9Q56fn';
const ok = (body) => ({ ok: true, json: async () => body }), bad = (status) => ({ ok: false, status, json: async () => ({}) });

test('kennelFromBody: only a known tier for the same wallet; topdog alias; anything else -> null', () => {
  assert.equal(kennelFromBody({ wallet: W, tier: 'guard' }, W), 'guard'); assert.equal(kennelFromBody({ wallet: W, tier: 'topdog' }, W), 'top');
  assert.equal(kennelFromBody({ wallet: W2, tier: 'top' }, W), null, 'other wallet'); assert.equal(kennelFromBody({ wallet: W, tier: 'emperor' }, W), null);
  assert.equal(kennelFromBody({ wallet: W, tier: null }, W), null); assert.equal(kennelFromBody(null, W), null); assert.equal(kennelFromBody('top', W), null); });

test('lookup: one fetch per wallet per TTL (concurrent joins share it), refetch after TTL, fail closed on errors', async () => {
  let t = 0, calls = []; const f = async (url) => { calls.push(url); return ok({ wallet: W, tier: 'alpha' }); };
  const K = makeKennelLookup({ kpUrl: 'https://kp.test', f, now: () => t });
  const r = await Promise.all([K.lookup(W), K.lookup(W), K.lookup(W)]); assert.deepEqual(r, ['alpha', 'alpha', 'alpha']); assert.equal(calls.length, 1);
  assert.equal(calls[0], `https://kp.test/api/kennel?wallet=${W}`);
  t += KENNEL_TTL_MS - 1; await K.lookup(W); assert.equal(calls.length, 1); t += 2; await K.lookup(W); assert.equal(calls.length, 2, 'after TTL');
  for (const fail of [async () => bad(500), async () => bad(404), async () => { throw new Error('net'); }, async () => ok({ nope: 1 }), async () => ({ ok: true, json: async () => { throw new Error('json'); } })]) {
    const K2 = makeKennelLookup({ f: fail, now: () => 0 }); assert.equal(await K2.lookup(W), null); }
  // a failure is cached too (no hammering kibble-pay), so it stays "no tier" until the TTL passes
  let n = 0; const K3 = makeKennelLookup({ f: async () => { n++; return bad(503); }, now: () => 0 }); await K3.lookup(W); await K3.lookup(W); assert.equal(n, 1);
  assert.equal(await K.lookup('not-a-wallet'), null); assert.equal(await K.lookup(null), null); });

test('lookup: colo Cache API shared between room objects (second room = no extra kibble-pay call)', async () => {
  const store = new Map(), cache = { async match(k) { return store.has(k) ? new Response(store.get(k)) : undefined; }, async put(k, r) { store.set(k, await r.text()); } };
  let n = 0; const f = async () => { n++; return ok({ wallet: W, tier: 'pup' }); };
  const roomA = makeKennelLookup({ f, cache, now: () => 5 }), roomB = makeKennelLookup({ f, cache, now: () => 6 });
  assert.equal(await roomA.lookup(W), 'pup'); assert.equal(await roomB.lookup(W), 'pup'); assert.equal(n, 1); });

test('client-sent tiers are stripped from the look; real profiles are kept', () => {
  assert.equal(stripKennel(cleanLook({ coat: 'tan', pl: { look: { kennel: 'top' }, outfit: {} } })).pl, undefined);
  const l = stripKennel(cleanLook({ coat: 'tan', pl: { look: { kennel: 'top', coat: '#aabbcc' }, outfit: {} } })); assert.deepEqual(l.pl.look, { coat: '#aabbcc' });
  assert.deepEqual(stripKennel(cleanLook({ coat: 'tan' })), { coat: 'tan', eq: {} }); });

test('worker wiring: tier only from the server lookup, guests get none, pub() carries k only with a verified wallet', () => {
  const w = fs.readFileSync(new URL('../realtime/src/worker.js', import.meta.url), 'utf8');
  assert.match(w, /a\.wf = wallet \|\| null; a\.k = null/); assert.match(w, /k: \(a\.w && a\.k\) \|\| null/);
  assert.equal((w.match(/stripKennel\(cleanLook\(/g) || []).length, 2, 'hello + look both strip');
  assert.match(w, /refreshKennel\(ws\)/); });

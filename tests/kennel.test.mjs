// Kibble Kennel mirror: contract parsing, graceful 404/unknown, preview override, multiplayer display rules, wall, copy.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import * as KN from '../src/kennel.js';
import { createMultiplayer } from '../src/multiplayer.js';
import { cleanLook } from '../src/mpshared.js';
import { bannedIn } from '../src/kibblemood.js';
const W = 'Akk3DdxeRRLZABfpkFKYoDBk6Zim5wNLRYemNFjv56fn';
const res = (status, body) => async () => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test('tiers match the shared contract (amount / min days), topdog alias accepted', () => {
  assert.deepEqual(KN.TIER_IDS, ['pup', 'guard', 'alpha', 'top']); assert.deepEqual(KN.TIER_IDS.map((t) => [KN.TIERS[t].amount, KN.TIERS[t].minDays]), [[100000, 7], [1000000, 30], [10000000, 90], [50000000, 180]]);
  assert.equal(KN.tierId('topdog'), 'top'); assert.equal(KN.tierId('TOP'), 'top'); assert.equal(KN.tierId('whale'), null);
  const doc = fs.readFileSync('/workspace/inu-shared/kennel-api.md', 'utf8'); for (const t of KN.TIER_IDS) assert.ok(doc.includes('`' + t + '`'), t); });
test('API 404 / network error / bad body -> unknown, nothing shown', async () => {
  KN._reset(); const a = await KN.fetchKennel(W, { f: res(404, {}) }); assert.equal(a.status, 'unknown'); assert.equal(a.tier, null); assert.match(a.reason, /not live/);
  KN._reset(); assert.equal((await KN.fetchKennel(W, { f: async () => { throw new TypeError('cors'); } })).status, 'unknown');
  KN._reset(); assert.equal((await KN.fetchKennel(W, { f: res(200, { hello: 1 }) })).status, 'unknown');
  assert.equal(KN.myKennel({ real: a }), null); assert.equal((await KN.fetchWall({ f: res(404, {}) })).status, 'unknown'); });
test('a real tier from the contract shape is shown and cached 10 min', async () => {
  KN._reset(); let n = 0; const f = async () => { n++; return { ok: true, status: 200, json: async () => ({ wallet: W, tier: 'guard', tierName: 'Guard Dog', lockedAmount: 1250000, unlockDate: '2026-12-01T00:00:00.000Z', source: 'chain', stale: false }) }; };
  const a = await KN.fetchKennel(W, { f, now: 0 }); assert.equal(a.tier, 'guard'); await KN.fetchKennel(W, { f, now: 9 * 60_000 }); assert.equal(n, 1); await KN.fetchKennel(W, { f, now: 11 * 60_000 }); assert.equal(n, 2);
  assert.deepEqual(KN.myKennel({ real: a }), { tier: 'guard', preview: false }); assert.equal(KN.myKennel({ real: a, show: false }), null);
  KN._reset(); assert.equal((await KN.fetchKennel(W, { f: res(200, { tier: null }) })).tier, null); });
test('?kennel= preview is labelled and never sent to other players', () => {
  assert.equal(KN.overrideTier('?kennel=alpha'), 'alpha'); assert.equal(KN.overrideTier('?kennel=<x>'), null); const m = KN.myKennel({ override: 'top' });
  assert.equal(m.preview, true); assert.match(KN.tagFor('top', true).text, /PREVIEW/); assert.equal(KN.lookKennel(m), null); assert.equal(KN.lookKennel({ tier: 'top', preview: false }), 'top'); assert.equal(KN.tagFor('top').gold, true); assert.equal(KN.tagFor('pup').gold, false); });
test('multiplayer: only the server-looked-up tier (p.k / {t:"k"}) shows, and only with a server-verified wallet', async () => {
  assert.equal(cleanLook({ coat: 'tan', pl: { look: { kennel: 'top' }, outfit: {} } }).pl.look.kennel, 'top');
  function fakeWS() { const socks = []; class Ws { constructor() { this.readyState = 0; this.sent = []; socks.push(this); } send(s) { this.sent.push(s); } close() {} open() { this.readyState = 1; this.onopen?.(); } recv(o) { this.onmessage?.({ data: JSON.stringify(o) }); } } Ws.socks = socks; Ws.OPEN = 1; return Ws; }
  let ms = 0; const WS = fakeWS(); const mp = createMultiplayer({ getLocal: () => ({ room: 'city', x: 100, y: 100, f: 'down', name: 'Me', look: { coat: 'tan', eq: {} } }), WS, clock: () => ms, now: () => ms / 1000, doc: null });
  await mp.start('ws://x'); mp.step(0.016); const ws = WS.socks[0]; ws.open();
  ws.recv({ t: 'w', id: 'me', name: 'Me', room: 'city', inst: 1, players: [
    { id: 'a', name: 'Rin', w: 'Akk3…56fn', k: 'top', look: { coat: 'black', eq: {}, pl: { look: { kennel: 'pup' }, outfit: {} } }, s: { x: 120, y: 100, ts: 0 } },
    { id: 'b', name: 'Fake', look: { coat: 'tan', eq: {}, pl: { look: { kennel: 'top' }, outfit: {} } }, s: { x: 140, y: 100, ts: 0 } },
    { id: 'c', name: 'Selfie', w: 'Bkk3…56fn', look: { coat: 'tan', eq: {}, pl: { look: { kennel: 'top' }, outfit: {} } }, s: { x: 160, y: 100, ts: 0 } }] });
  ms += 500; const acts = mp.actors({ x0: 0, y0: 0, x1: 900, y1: 900 }, { x: 100, y: 100 }); const rin = acts.find((a) => a.name === 'Rin'), fake = acts.find((a) => a.name === 'Fake');
  assert.equal(KN.remoteKennel(rin), 'top'); assert.equal(rin.profile, null, 'kennel-only pl is not a custom profile'); assert.equal(rin.art, 'layer:black');
  assert.equal(KN.remoteKennel(fake), null, 'no verified wallet -> no tier');
  assert.equal(KN.remoteKennel(acts.find((a) => a.name === 'Selfie')), null, 'self-reported tier in the look is ignored');
  ws.recv({ t: 'k', id: 'c', k: 'alpha' }); assert.equal(KN.remoteKennel(mp.actors(null).find((a) => a.name === 'Selfie')), 'alpha', 'server tier update');
  ws.recv({ t: 'k', id: 'a', k: null }); assert.equal(KN.remoteKennel(mp.actors(null).find((a) => a.name === 'Rin')), null, 'server dropped the tier'); });
test('wall: 404 -> opens soon; Top Dogs listed when the API has them; cosmetics-only copy, no banned words', async () => {
  const soon = KN.wallHtml({ wall: { status: 'unknown', topDogs: [], reason: 'not live yet' }, me: { status: 'unknown', reason: 'kennel API not live yet' }, wallet: W, show: true });
  assert.match(soon, /listed here once the Kibble Kennel publishes/); assert.match(soon, /Kennel tier: unknown/); assert.match(soon, /Cosmetics only/);
  const wall = await KN.fetchWall({ f: res(200, { topDogs: [{ wallet: W, since: '2026-10-01' }] }) }); const html = KN.wallHtml({ wall, me: null, wallet: null, show: false });
  assert.match(html, /Akk3…56fn/); assert.doesNotMatch(html, /id="kn-show" checked/);
  for (const f of ['src/kennel.js']) assert.deepEqual(bannedIn(fs.readFileSync(f, 'utf8').replace(/^\s*\/\/.*$/gm, '').replace(/\/\/ [^\n]*/g, '')), [], f);
  assert.deepEqual(bannedIn(soon.replace(/<[^>]+>/g, ' ')), []); });
test('wall (kibble-pay ?wall=1 live shape): empty state, Top Dogs + verified members, names filtered', async () => {
  const empty = await KN.fetchWall({ f: res(200, { wall: [], topDogs: [], count: 0, empty: 'No Top Dogs yet', updatedAt: 'x' }) });
  const h0 = KN.wallHtml({ wall: empty, me: null, wallet: null, show: true }); assert.match(h0, /No Top Dogs yet/); assert.doesNotMatch(h0, /<ol/);
  const W2 = 'Bkk3n7UUeb8TWZn5w8y6uWvd2iGyEqpH4tWqf9Q56fn';
  const full = await KN.fetchWall({ f: res(200, { wall: [{ wallet: W, name: 'Shiba Queen', tier: 'top', lockedAmount: 60000000, since: '2026-10-18T06:00:00Z' }, { wallet: W2, name: 'fuck', tier: 'guard', lockedAmount: 2000000 }], topDogs: [{ wallet: W, name: 'Shiba Queen', lockedAmount: 60000000 }], empty: null }) });
  assert.equal(full.topDogs[0].label, 'Shiba Queen'); assert.equal(full.wall[1].label, 'Bkk3…56fn', 'profane name -> short address');
  const h = KN.wallHtml({ wall: full, me: null, wallet: null, show: true }); assert.match(h, /Shiba Queen/); assert.match(h, /60,000,000 \$KIBBLE locked/); assert.match(h, /Kennel members/); assert.match(h, /Guard Dog/);
  assert.equal(KN.wallHtml({ wall: { status: 'unknown', topDogs: [], wall: [], reason: 'unreachable' } }).includes('No Top Dogs yet'), false, 'unknown is not presented as empty'); });

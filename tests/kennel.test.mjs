// Kibble Kennel mirror: contract parsing, graceful 404/unknown, preview override, multiplayer display rules, wall, copy.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import * as KN from '../src/kennel.js';
import { createMultiplayer } from '../src/multiplayer.js';
import { cleanLook } from '../src/mpshared.js';
import { bannedIn } from '../src/kibblemood.js';
const W = 'Akk3DdxeRRLZABfpkFKYoDBk6Zim5wNLRYemNFjv56fn';
const res = (status, body) => async () => ({ ok: status >= 200 && status < 300, status, json: async () => body });

const FX = JSON.parse(fs.readFileSync(new URL('./fixtures/kennel-v2.json', import.meta.url), 'utf8'));
test('tiers match the shared v2 contract (hold amount / streak days, Top Dog 90), topdog alias accepted', () => {
  assert.deepEqual(KN.TIER_IDS, ['pup', 'guard', 'alpha', 'top']); assert.deepEqual(KN.TIER_IDS.map((t) => [KN.TIERS[t].amount, KN.TIERS[t].days, KN.TIERS[t].minDays]), [[100000, 7, 7], [1000000, 30, 30], [10000000, 90, 90], [50000000, 90, 90]]);
  assert.equal(KN.tierId('topdog'), 'top'); assert.equal(KN.tierId('TOP'), 'top'); assert.equal(KN.tierId('whale'), null); assert.equal(KN.FLAIR.id, 'kn_badge_locked'); assert.equal(KN.FLAIR.minAmount, 100000);
  const doc = '/workspace/kibble-pay/docs/KENNEL_API.md'; if (fs.existsSync(doc)) { const d = fs.readFileSync(doc, 'utf8');
    for (const [n, a, days] of [['Pup', '100,000', 7], ['Guard Dog', '1,000,000', 30], ['Alpha', '10,000,000', 90], ['Top Dog', '50,000,000', 90]]) assert.match(d, new RegExp(`\\| ${n} \\| ${a}( \\$KIBBLE)? \\| ${days} days`), n); } });
test('API 404 / network error / bad body -> unknown, nothing shown', async () => {
  KN._reset(); const a = await KN.fetchKennel(W, { f: res(404, {}) }); assert.equal(a.status, 'unknown'); assert.equal(a.tier, null); assert.match(a.reason, /not live/);
  KN._reset(); assert.equal((await KN.fetchKennel(W, { f: async () => { throw new TypeError('cors'); } })).status, 'unknown');
  KN._reset(); assert.equal((await KN.fetchKennel(W, { f: res(200, { hello: 1 }) })).status, 'unknown');
  assert.equal(KN.myKennel({ real: a }), null); assert.equal((await KN.fetchWall({ f: res(404, {}) })).status, 'unknown'); });
test('a real v2 tier is shown and cached 10 min; a v1 lock-tier body is not trusted', async () => {
  KN._reset(); let n = 0; const f = async () => { n++; return { ok: true, status: 200, json: async () => FX.pupLocked }; };
  const a = await KN.fetchKennel(W, { f, now: 0 }); assert.equal(a.tier, 'pup'); await KN.fetchKennel(W, { f, now: 9 * 60_000 }); assert.equal(n, 1); await KN.fetchKennel(W, { f, now: 11 * 60_000 }); assert.equal(n, 2);
  assert.deepEqual(KN.myKennel({ real: a }), { tier: 'pup', flair: true, preview: false }); assert.equal(KN.myKennel({ real: a, show: false }), null);
  KN._reset(); const v1 = await KN.fetchKennel(W, { f: res(200, FX.v1LockTier) }); assert.equal(v1.status, 'unknown'); assert.equal(v1.tier, null); assert.equal(KN.myKennel({ real: v1 }), null);
  KN._reset(); assert.equal((await KN.fetchKennel(W, { f: res(200, { ...FX.noTier, wallet: 'Bkk3n7UUeb8TWZn5w8y6uWvd2iGyEqpH4tWqf9Q56fn' }) })).status, 'unknown', 'other wallet'); });
test('v2 fixture: no tier yet but streak progress -> nothing on the pup, honest progress in the panel', async () => {
  KN._reset(); const me = await KN.fetchKennel(W, { f: res(200, FX.noTier) }); assert.equal(me.status, 'ok'); assert.equal(me.tier, null); assert.equal(me.locked.flair, false);
  assert.equal(KN.myKennel({ real: me }), null); assert.equal(KN.tagFor(null, false, false), null);
  assert.equal(me.streaks[0].id, 'pup'); assert.equal(me.nextStep.id, 'pup'); assert.equal(KN.nextLine(me), '<b>Pup in 5 days if held</b> (23 Oct 2026)');
  const h = KN.wallHtml({ wall: { status: 'ok', topDogs: [], wall: [], empty: 'No Top Dogs yet' }, me, wallet: W, show: true, now: Date.parse('2026-10-18T11:00:00Z') });
  assert.match(h, /No Kennel tier on this wallet yet/); assert.match(h, /Pup in 5 days if held/); assert.match(h, /day 2 of 7/); assert.match(h, /112,308 \$KIBBLE held now/);
  assert.match(h, /no wallet can reach Pup before 22 Oct 2026/); assert.match(h, /not before 14 Nov 2026/); assert.match(h, /hold 1,000,000 for 30 days/); assert.doesNotMatch(h, /🔒 Locked<\/span> ·|Locked flair:/);
  const late = KN.wallHtml({ me, wallet: W, show: true, now: Date.parse('2026-10-25T00:00:00Z') }); assert.doesNotMatch(late, /no wallet can reach Pup before/); });
test('v2 fixture: Pup plus the separate Locked flair (the lock never raises the tier)', async () => {
  KN._reset(); const me = await KN.fetchKennel(W, { f: res(200, FX.pupLocked) }); assert.equal(me.tier, 'pup'); assert.deepEqual(me.locked, { flair: true, amount: 900000, minAmount: 100000, unlockDate: '2027-01-01T00:00:00.000Z', count: 1 });
  const t = KN.tagFor('pup', false, true); assert.equal(t.text, 'PUP'); assert.equal(t.flair, true); assert.equal(t.gold, false);
  const h = KN.wallHtml({ me, wallet: W, show: true }); assert.match(h, /Your tier: <span[^>]*>Pup<\/span> <span class="kn-chip kn-flair"[^>]*>🔒 Locked/); assert.match(h, /Guard Dog in 18 days if held/);
  assert.match(h, /Locked flair: 900,000 \$KIBBLE in your own self-lock until 1 Jan 2027\. It is a badge only and does not change your tier/);
  // flair alone (lock but no streak yet): padlock only, no tier tag
  KN._reset(); const only = await KN.fetchKennel(W, { f: res(200, { ...FX.noTier, locked: FX.pupLocked.locked }) }); assert.deepEqual(KN.myKennel({ real: only }), { tier: null, flair: true, preview: false });
  const t2 = KN.tagFor(null, false, true); assert.equal(t2.text, null); assert.equal(t2.flair, true); assert.equal(KN.lookKennel(KN.myKennel({ real: only })), null); });
test('v2 fixture: Top Dog -> gold tag + aura, full look, no next step', async () => {
  KN._reset(); const me = await KN.fetchKennel(W, { f: res(200, FX.topDog) }); assert.equal(me.tier, 'top'); assert.equal(me.nextStep, null);
  assert.deepEqual(KN.myKennel({ real: me }), { tier: 'top', flair: false, preview: false }); assert.equal(KN.tagFor('top').gold, true); assert.equal(KN.TIERS.top.aura, 'gold');
  const h = KN.wallHtml({ me, wallet: W, show: true }); assert.match(h, /Your tier: <span[^>]*>Top Dog/); assert.match(h, /full Kennel look is yours/); assert.equal((h.match(/earned ✓/g) || []).length, 4); });
test('v2 fixture: API error / holder-only -> shows nothing', async () => {
  KN._reset(); const e = await KN.fetchKennel(W, { f: res(FX.apiError.status, FX.apiError.body) }); assert.equal(e.status, 'unknown'); assert.equal(e.tier, null); assert.match(e.reason, /error 500/);
  assert.equal(KN.myKennel({ real: e }), null); const h = KN.wallHtml({ me: e, wallet: W, show: true }); assert.match(h, /Kennel tier: unknown/); assert.doesNotMatch(h, /kn-streak|Your tier/);
  KN._reset(); const ho = await KN.fetchKennel(W, { f: res(200, { ...FX.noTier, source: 'holder-only', streaks: [], nextStep: null, held: 0 }) }); assert.equal(KN.myKennel({ real: ho }), null);
  assert.match(KN.wallHtml({ me: ho, wallet: W, show: true }), /No chain data right now/); });
test('previews: ?kennel=pup-locked / &kflair=1 flair preview, ?kennelwallet= read-only peek is labelled and never sent', () => {
  assert.equal(KN.overrideTier('?kennel=pup-locked'), 'pup'); assert.equal(KN.overrideFlair('?kennel=pup-locked'), true); assert.equal(KN.overrideFlair('?kennel=alpha&kflair=1'), true); assert.equal(KN.overrideFlair('?kennel=alpha'), false);
  assert.deepEqual(KN.myKennel({ override: 'pup', overrideFlair: true }), { tier: 'pup', flair: true, preview: true });
  assert.equal(KN.peekWallet('?kennelwallet=BzLYTFAfUsjzQ5x8bx5BbPK4DFtaHrLCuferkvkxTNGJ'), 'BzLYTFAfUsjzQ5x8bx5BbPK4DFtaHrLCuferkvkxTNGJ'); assert.equal(KN.peekWallet('?kennelwallet=<x>'), null);
  const real = KN.parseKennel(FX.pupLocked, W), m = KN.myKennel({ real, peek: true }); assert.equal(m.preview, true); assert.equal(KN.lookKennel(m), null);
  assert.match(KN.wallHtml({ me: real, wallet: W, peek: true, show: true }), /read-only preview, not your pup/); });
test('copy: no line says locking grants a tier; cosmetics only', () => {
  const h = KN.wallHtml({ me: KN.parseKennel(FX.pupLocked, W), wallet: W, show: true, wall: { status: 'ok', topDogs: [], wall: [] } }).replace(/<[^>]+>/g, ' ');
  assert.doesNotMatch(h, /\block (your )?\$?KIBBLE for|lock \d|locks? (count|give|grant|unlock)s? .*tier|tiers? (come|comes) from (self-)?locks/i); assert.match(h, /hold streaks/); assert.match(h, /never sets or raises a tier/); assert.match(h, /Cosmetics only/);
  assert.doesNotMatch(h.replace('Cosmetics only: no rewards, no yield, no stat changes.', ''), /\b(yield|interest|apy|earn (rewards|yield)|reward(s)? for)\b/i, 'only the disclaimer may name rewards/yield');
  const src = fs.readFileSync('src/kennel.js', 'utf8'); assert.doesNotMatch(src, /lock \$\{fmt\(T\.amount\)\} \$KIBBLE for/); assert.doesNotMatch(src, /You lock your own \$KIBBLE/); });
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
  assert.match(html, /Kennel Chest<\/b> <span class="wname"><a href="https:\/\/solscan.io\/account\/Akk3DdxeRRLZABfpkFKYoDBk6Zim5wNLRYemNFjv56fn"[^>]*><code>Akk3…6fn<\/code>/, 'our own wallets show name + short address + Solscan link'); assert.doesNotMatch(html, /id="kn-show" checked/);
  for (const f of ['src/kennel.js']) assert.deepEqual(bannedIn(fs.readFileSync(f, 'utf8').replace(/^\s*\/\/.*$/gm, '').replace(/\/\/ [^\n]*/g, '')), [], f);
  assert.deepEqual(bannedIn(soon.replace(/<[^>]+>/g, ' ')), []); });
test('wall (kibble-pay ?wall=1 live shape): empty state, Top Dogs + verified members, names filtered', async () => {
  const empty = await KN.fetchWall({ f: res(200, { wall: [], topDogs: [], count: 0, empty: 'No Top Dogs yet', updatedAt: 'x' }) });
  const h0 = KN.wallHtml({ wall: empty, me: null, wallet: null, show: true }); assert.match(h0, /No Top Dogs yet/); assert.doesNotMatch(h0, /<ol/);
  const W2 = 'Bkk3n7UUeb8TWZn5w8y6uWvd2iGyEqpH4tWqf9Q56fn';
  const full = await KN.fetchWall({ f: res(200, { wall: [{ wallet: W, name: 'Shiba Queen', tier: 'top', held: 60000000, since: '2026-10-18T06:00:00Z' }, { wallet: W2, name: 'fuck', tier: 'guard', held: 2000000 }], topDogs: [{ wallet: W, name: 'Shiba Queen', held: 60000000 }], empty: null }) });
  assert.equal(full.topDogs[0].label, 'Kennel Chest', 'named wallet (src/wallets.js) beats a display name'); assert.equal(full.wall[1].label, 'Bkk3…56fn', 'profane name -> short address');
  const h = KN.wallHtml({ wall: full, me: null, wallet: null, show: true }); assert.match(h, /Kennel Chest/); assert.match(h, /60,000,000 \$KIBBLE held/); assert.match(h, /Kennel members/); assert.match(h, /Guard Dog/);
  assert.equal(KN.wallHtml({ wall: { status: 'unknown', topDogs: [], wall: [], reason: 'unreachable' } }).includes('No Top Dogs yet'), false, 'unknown is not presented as empty'); });
test('wall v2 fixture: ranked by tier then $KIBBLE held, Locked flair chip, honest empty state', async () => {
  const w = await KN.fetchWall({ f: res(200, FX.wall) }); assert.deepEqual(w.wall.map((d) => [d.tier, d.held]), [['top', 60000000], ['pup', 1195500], ['pup', 150000]]);
  assert.equal(w.wall[1].lockedFlair, true); assert.equal(w.wall[2].label, 'Bkk3…56fn', 'profane name filtered');
  const h = KN.wallHtml({ wall: w, me: null, wallet: null, show: true }); assert.match(h, /Rin<\/b> <span[^>]*>Pup<\/span> <span class="kn-chip kn-flair"[^>]*>🔒 Locked<\/span> <span class="small">1,195,500 \$KIBBLE held/);
  assert.ok(h.indexOf('Rin') < h.indexOf('Bkk3…56fn'), 'more held ranks first'); assert.match(h, /ranked by \$KIBBLE held/);
  const e = await KN.fetchWall({ f: res(200, FX.emptyWall) }); const he = KN.wallHtml({ wall: e, show: true }); assert.match(he, /No Top Dogs yet\. The first verified Top Dog shows up here/); assert.doesNotMatch(he, /<ol/);
  // plaza wall prop draws a padlock for flair Top Dogs and never throws on unknown
  const ops = []; const c = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (...a) => ops.push(k)), set: (t, k, v) => { t[k] = v; return true; } });
  for (const wl of [w, e, { status: 'unknown', topDogs: [], wall: [] }, null]) KN.wallProps({ x: 1, y: 1, w: 4 }, wl, 0)[0].d(c); assert.ok(ops.length > 10); });
test('multiplayer: server-sent Locked flair (lf) shows only with a verified wallet', async () => {
  function fakeWS() { const socks = []; class Ws { constructor() { this.readyState = 0; this.sent = []; socks.push(this); } send(s) { this.sent.push(s); } close() {} open() { this.readyState = 1; this.onopen?.(); } recv(o) { this.onmessage?.({ data: JSON.stringify(o) }); } } Ws.socks = socks; Ws.OPEN = 1; return Ws; }
  let ms = 0; const WS = fakeWS(); const mp = createMultiplayer({ getLocal: () => ({ room: 'city', x: 100, y: 100, f: 'down', name: 'Me', look: { coat: 'tan', eq: {} } }), WS, clock: () => ms, now: () => ms / 1000, doc: null });
  await mp.start('ws://x'); mp.step(0.016); const ws = WS.socks[0]; ws.open();
  ws.recv({ t: 'w', id: 'me', name: 'Me', room: 'city', inst: 1, players: [{ id: 'a', name: 'Rin', w: 'Akk3…56fn', k: 'pup', lf: true, look: { coat: 'black', eq: {} }, s: { x: 120, y: 100, ts: 0 } },
    { id: 'b', name: 'Fake', lf: true, k: 'top', look: { coat: 'tan', eq: {} }, s: { x: 140, y: 100, ts: 0 } }] });
  ms += 500; let acts = mp.actors({ x0: 0, y0: 0, x1: 900, y1: 900 }, { x: 100, y: 100 });
  assert.deepEqual(KN.remoteLook(acts.find((a) => a.name === 'Rin')), { tier: 'pup', flair: true, preview: false }); assert.equal(KN.remoteLook(acts.find((a) => a.name === 'Fake')), null);
  ws.recv({ t: 'k', id: 'a', k: 'pup', lf: false }); assert.deepEqual(KN.remoteLook(mp.actors(null).find((a) => a.name === 'Rin')), { tier: 'pup', flair: false, preview: false });
  ws.recv({ t: 'k', id: 'a', k: null, lf: true }); assert.deepEqual(KN.remoteLook(mp.actors(null).find((a) => a.name === 'Rin')), { tier: null, flair: true, preview: false }); });

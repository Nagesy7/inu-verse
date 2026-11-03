// Phase 2 "alive": live activity feed (real events only) + ghost recent visitors (src/feed.js, src/ghosts.js, api/feed.js, api/_lib/feed.js)
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import * as FD from '../src/feed.js';
import * as GH from '../src/ghosts.js';
import { makeHandler, pollArcade, MIN_SESSION_MS, HELLO_GAP_S } from '../api/feed.js';
import { appendEvent, readEvents, touchVisitor, readVisitors, EV_KEY } from '../api/_lib/feed.js';
import { makeHandler as homeHandler } from '../api/home.js';
import { memoryKv } from '../api/_lib/kv.js';
import * as HS from '../src/homeshare.js';

const T0 = 1_800_000_000_000;
const call = (h, { method = 'POST', body, ip = '1.2.3.4' } = {}) => new Promise((done) => { const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { done({ code: this.statusCode, headers: this.headers, raw: b || '', body: b ? JSON.parse(b) : null }); } };
  h({ method, url: '/api/feed', query: {}, headers: { 'x-forwarded-for': ip }, body: body && JSON.stringify(body) }, res); });
const mk = (f = async () => ({ ok: false })) => { let t = T0; const kv = memoryKv(() => t); return { kv, h: makeHandler({ env: {}, kv, now: () => t, f, sleep: async () => {} }), tick: (ms) => { t += ms; }, now: () => t }; };
const WALLET = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';

test('feed: only known event types are accepted, anywhere', async () => {
  assert.deepEqual(Object.keys(FD.EVENT_TYPES).sort(), ['arcade', 'arrive', 'featured', 'guestbook', 'home', 'keepsake', 'koi', 'plot', 'shop', 'trader']);
  assert.deepEqual([...FD.CLIENT_TYPES].sort(), ['keepsake', 'koi', 'trader'], 'a browser may only report a rare koi catch or a daily-event keepsake / trader purchase (validated server-side)');
  for (const k of ['', 'jackpot', 'wager', 'kibble', 'burn', '__proto__', 'constructor', 'toString', null, 7]) { assert.equal(FD.isEventType(k), false, String(k)); assert.equal(FD.cleanEvent({ k, n: 'Rex', t: T0 }, T0), null); }
  const kv = memoryKv(() => T0);
  assert.equal(await appendEvent(kv, { k: 'jackpot', n: 'Rex' }, { now: T0 }), null);
  assert.equal(await appendEvent(kv, { k: 'plot', n: 'Rex', x: 'nope' }, { now: T0 }), null, 'bad extra refused');
  assert.ok(await appendEvent(kv, { k: 'plot', n: 'Rex', x: HS.PLOT_IDS[0] }, { now: T0 }));
  // junk smuggled straight into storage is dropped on read
  await kv.set(EV_KEY, JSON.stringify([{ k: 'fake', n: 'Bot', t: T0 }, { k: 'koi', n: 'Rex', t: T0, w: WALLET, ip: 'x', sid: 'y' }]), 100);
  const out = await readEvents(kv, T0); assert.equal(out.length, 1); assert.deepEqual(Object.keys(out[0]).sort(), ['i', 'k', 'n', 't', 'v', 'x']);
  const { h } = mk(); let r = await call(h, { body: { op: 'hello', name: 'Rex' } }); const sid = r.body.sid;
  r = await call(h, { body: { op: 'event', sid, type: 'plot', area: 'plots' } }); assert.equal(r.code, 400, 'server-only types cannot be posted');
  r = await call(h, { body: { op: 'event', sid, type: 'arrive' } }); assert.equal(r.code, 400, 'arrive comes only from the hello handshake');
  r = await call(h, { body: { op: 'yell', sid } }); assert.equal(r.code, 400);
  assert.equal(FD.eventText({ k: 'koi', n: 'Rex', t: T0 }), 'Rex caught a rare golden koi at the Fishing Pond');
});

test('feed: capped at 50 events and 24 h', async () => {
  let t = T0; const kv = memoryKv(() => t);
  for (let i = 0; i < 60; i++) { await appendEvent(kv, { k: 'arrive', n: 'Pup' + i }, { now: t, sleep: async () => {} }); t += 1000; }
  let ev = await readEvents(kv, t); assert.equal(ev.length, FD.FEED.MAX); assert.equal(ev[0].n, 'Pup59', 'newest first'); assert.equal(ev.at(-1).n, 'Pup10');
  assert.ok(kv.map.get(EV_KEY).exp - t <= FD.FEED.TTL_S * 1000, 'the key itself expires within 24 h');
  t += 24 * 3600_000 + 60_000; assert.equal((await readEvents(kv, t)).length, 0, 'everything older than 24 h is gone');
  assert.equal(FD.cleanEvent({ k: 'koi', n: 'Rex', t: t + 3600_000 }, t), null, 'no future-dated events');
});

test('feed: names are sanitised with the chat filter; filtered names never appear (no placeholders)', async () => {
  assert.equal(FD.feedName('  Biscuit  '), 'Biscuit');
  for (const bad of [WALLET, '0x52908400098527886E0F7030069857D2E4169EE7', 'fuck', 'www.scam.io', '', null, {}]) assert.equal(FD.feedName(bad), null, String(bad));
  const kv = memoryKv(() => T0);
  assert.equal(await appendEvent(kv, { k: 'arrive', n: WALLET }, { now: T0 }), null);
  assert.equal(await touchVisitor(kv, { n: WALLET, c: 'tan', a: 'plaza' }, { now: T0 }), null, 'never a ghost either');
  const { h } = mk(); const r = await call(h, { body: { op: 'hello', name: WALLET, coat: 'tan', area: 'plaza' } });
  assert.equal(r.code, 200); assert.equal(r.body.sid, null, 'no session for a filtered name'); assert.equal(r.body.events.length, 0);
  assert.ok(!r.raw.includes(WALLET));
  assert.equal(FD.eventText({ k: 'guestbook', n: 'Mochi', x: 'shit head', t: T0 }), null, 'a filtered host name drops the whole line');
});

test('api/feed: hello logs a real arrival, koi needs a real session at the pond, rate limits, no wallet/IP/session leakage', async () => {
  const { h, tick, kv } = mk();
  let r = await call(h, { body: { op: 'hello', name: 'KeeperTest', coat: 'cream', area: 'plaza', wallet: WALLET, email: 'a@b.co' } });
  assert.equal(r.code, 200); assert.match(r.body.sid, /^[0-9a-f]{24}$/); const sid = r.body.sid;
  assert.deepEqual(r.body.events.map((e) => [e.k, e.n, e.v]), [['arrive', 'KeeperTest', 0]]);
  assert.equal((await call(h, { body: { op: 'hello', name: 'KeeperTest' } })).code, 429, 'hello rate limit');
  tick(HELLO_GAP_S * 1000); r = await call(h, { body: { op: 'hello', name: 'KeeperTest' } }); assert.equal(r.body.events.length, 1, 'no duplicate arrival spam');
  assert.equal((await call(h, { body: { op: 'event', sid, type: 'koi', area: 'pond' } })).code, 409, 'brand-new sessions cannot report');
  tick(MIN_SESSION_MS);
  assert.equal((await call(h, { body: { op: 'event', sid, type: 'koi', area: 'mall' } })).code, 409, 'koi only at the pond');
  assert.equal((await call(h, { body: { op: 'event', sid, type: 'koi', area: 'pond' }, ip: '5.6.7.8' })).code, 403, 'a session cannot be used from elsewhere');
  assert.equal((await call(h, { body: { op: 'event', sid: 'f'.repeat(24), type: 'koi', area: 'pond' } })).code, 404);
  r = await call(h, { body: { op: 'event', sid, type: 'koi', area: 'pond', name: 'Imposter' } }); assert.equal(r.code, 200);
  assert.equal(r.body.events[0].n, 'KeeperTest', 'name comes from the server session, never the request');
  assert.equal((await call(h, { body: { op: 'event', sid, type: 'koi', area: 'pond' } })).code, 429, 'one koi per 2 min');
  r = await call(h, { method: 'GET' }); assert.equal(r.code, 200);
  for (const leak of [WALLET, 'a@b.co', sid, '1.2.3.4']) assert.ok(!r.raw.includes(leak), 'GET never leaks ' + leak);
  for (const e of r.body.events) assert.deepEqual(Object.keys(e).sort(), ['i', 'k', 'n', 't', 'v', 'x']);
  const stored = [...kv.map.entries()].map(([k, v]) => k + ' ' + v.v).join('\n'); assert.ok(!stored.includes(WALLET) && !stored.includes('a@b.co') && !stored.includes('1.2.3.4'), 'nothing private is even stored');
  assert.equal((await call(h, { body: { op: 'hello', name: 'x'.repeat(2000) } })).code, 413);
});

test('api/feed: ghosts = real visitors seen 10 min..24 h ago, only name/coat/spot/time', async () => {
  const { h, tick } = mk(); let r = await call(h, { body: { op: 'hello', name: 'Rex', coat: 'red', area: 'pond' } });
  assert.deepEqual(r.body.ghosts, [], 'someone here right now is not a ghost');
  tick(GH.GHOST.ONLINE_MS); r = await call(h, { method: 'GET' }); assert.deepEqual(r.body.ghosts.map((g) => Object.keys(g).sort()), [['a', 'c', 'n', 't']]);
  assert.equal(r.body.ghosts[0].n, 'Rex'); assert.equal(r.body.ghosts[0].a, 'pond');
  tick(24 * 3600_000); r = await call(h, { method: 'GET' }); assert.deepEqual(r.body.ghosts, [], 'gone after a day');
});

test('ghosts: capped at 8, filtered, live players excluded', () => {
  const now = T0, old = (m) => now - m * 60_000;
  const list = [...Array.from({ length: 20 }, (_, i) => ({ n: 'Pup' + i, c: 'tan', a: GH.SPOT_IDS[i % GH.SPOT_IDS.length], t: old(15 + i) })),
    { n: 'Live', c: 'tan', a: 'plaza', t: old(2) }, { n: 'Stale', c: 'tan', a: 'plaza', t: old(25 * 60) }, { n: WALLET, c: 'tan', a: 'plaza', t: old(20) },
    { n: 'Lost', c: 'tan', a: 'moon', t: old(20) }, { n: 'pup0', c: 'tan', a: 'plaza', t: old(30) }];
  const g = GH.selectGhosts(list, { now, exclude: new Set(['pup1']) });
  assert.equal(g.length, GH.GHOST.MAX); assert.equal(GH.GHOST.MAX, 8);
  const names = g.map((x) => x.n); assert.ok(!names.includes('Pup1'), 'live MP players / me excluded'); assert.ok(!names.some((n) => ['Live', 'Stale', 'Lost', WALLET].includes(n)));
  assert.equal(names.filter((n) => n.toLowerCase() === 'pup0').length, 1, 'dupes dropped');
  assert.equal(GH.selectGhosts(list, { now, cap: 99 }).length, 8, 'cap can never exceed 8');
  for (const id of GH.SPOT_IDS) assert.ok(GH.spotTiles(id).length >= 8, id + ' has walkable non-road tiles');
  const gs = GH.createGhosts({ sprite: () => null, rm: () => true }); gs.set(list); assert.ok(gs.list.length <= 8);
  gs.step(0.5); const props = gs.props({ x: 0, y: 0, w: 1e6, h: 1e6 }, 0); assert.ok(props.length <= 8);
});

test('server-recorded events: home open (>=3 items, once), guestbook sign, arcade #1 change; feed failures never break the action', async () => {
  let t = T0; const kv = memoryKv(() => t), h = homeHandler({ env: {}, kv, now: () => t, sleep: async () => {} });
  const hc = (body, ip = '1.2.3.4') => new Promise((done) => { const res = { headers: {}, setHeader() {}, end(b) { done({ code: this.statusCode, body: JSON.parse(b) }); } }; h({ method: 'POST', url: '/api/home', query: {}, headers: { 'x-forwarded-for': ip }, body: JSON.stringify(body) }, res); });
  const sh = HS.newShare(), items = [{ id: 'sofa', x: 1, y: 1, rot: 0 }, { id: 'rug', x: 1, y: 3, rot: 0 }, { id: 'lamp', x: 1, y: 3, rot: 0 }];
  assert.equal((await hc({ op: 'publish', ...sh, name: 'Biscuit', layout: { items: items.slice(0, 1) } })).code, 200); assert.equal((await readEvents(kv, t)).length, 0, 'an empty-ish home is not news');
  t += 3000; assert.equal((await hc({ op: 'publish', ...sh, name: 'Biscuit', layout: { items } })).code, 200);
  t += 3000; await hc({ op: 'publish', ...sh, name: 'Biscuit', layout: { items } });
  let ev = await readEvents(kv, t); assert.deepEqual(ev.map((e) => [e.k, e.n, e.v]), [['home', 'Biscuit', 1]], 'once per home');
  assert.equal((await hc({ op: 'sign', id: sh.id, name: 'Mochi', text: 'cute sofa' }, '9.9.9.9')).code, 200);
  ev = await readEvents(kv, t); assert.equal(FD.eventText(ev[0]), "Mochi signed Biscuit's guestbook");
  // arcade: silent first look, then a real leader change
  let top = 'Rex'; const f = async () => ({ ok: true, json: async () => ({ entries: [{ name: 'House', points: 999, house: true }, { name: top, points: 50 }] }) });
  assert.equal(await pollArcade(kv, { f, now: t }), null); t += 181_000; top = 'Mochi';
  const a = await pollArcade(kv, { f, now: t }); assert.equal(a.k, 'arcade'); assert.equal(a.n, 'Mochi');
  assert.equal(await pollArcade(kv, { f, now: t }), null, 'polled at most every 3 min');
  // a broken feed store never fails the real action
  const bad = { ...kv, get: kv.get.bind(kv), set: kv.set.bind(kv), del: kv.del.bind(kv), setNX: async (k, ...r) => { if (k.startsWith('feed:')) throw new Error('down'); return kv.setNX(k, ...r); } };
  const h2 = homeHandler({ env: {}, kv: bad, now: () => t, sleep: async () => {} }); const s2 = HS.newShare();
  const r2 = await new Promise((done) => { const res = { setHeader() {}, end(b) { done({ code: this.statusCode }); } }; h2({ method: 'POST', url: '/api/home', query: {}, headers: { 'x-forwarded-for': '7.7.7.7' }, body: JSON.stringify({ op: 'publish', ...s2, name: 'Kabo', layout: { items } }) }, res); });
  assert.equal(r2.code, 200);
});

test('guardrails: no rewards/tokens in the feed code, no Kibble payment paths touched, client stays light', () => {
  const src = ['src/feed.js', 'src/ghosts.js', 'api/feed.js', 'api/_lib/feed.js'].map((p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8')).join('\n');
  assert.ok(!/from\s+['"][^'"]*(kibble|burn|pay|cron|district)/i.test(src), 'feed code imports nothing from Kibble / burn / pay / cron / district rent');
  assert.ok(!/wager|payout|\bfees?\b|mememon|airdrop/i.test(src), 'no wagers, payouts, fees');
  assert.ok(!/addKibble|kibble\s*[+-]?=|grant|reward\(/i.test(src), 'no rewards granted from feed code');
  const main = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8'); assert.match(main, /if \(!DEMO\) FEEDUI\.start/, 'no network in demo/tests');
  assert.ok(FD.FEED.POLL_MS >= 20_000, 'polls gently');
});

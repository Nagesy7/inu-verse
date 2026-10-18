// Round 4: shared home + guestbook (src/homeshare.js, api/home.js, multiplayer "Visit home", main.js wiring, landscape)
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import * as HS from '../src/homeshare.js';
import { makeHandler, TTL_S } from '../api/home.js';
import { memoryKv } from '../api/_lib/kv.js';
import { createMultiplayer } from '../src/multiplayer.js';

const call = (h, { method = 'POST', body, query, ip = '1.2.3.4' }) => new Promise((done) => { const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { done({ code: this.statusCode, headers: this.headers, body: b ? JSON.parse(b) : null }); } };
  h({ method, url: '/api/home' + (query ? '?id=' + query : ''), query: query ? { id: query } : {}, headers: { 'x-forwarded-for': ip }, body: body && JSON.stringify(body) }, res); });
const mk = () => { let t = 1_800_000_000_000; const kv = memoryKv(() => t); return { kv, h: makeHandler({ env: {}, kv, now: () => t, sleep: async () => {} }), tick: (ms) => { t += ms; } }; };
const LAYOUT = { wall: 2, floor: 1, items: [{ uid: 'a', id: 'sofa', x: 1, y: 1, rot: 0 }, { uid: 'b', id: 'rug', x: 1, y: 3, rot: 0 }, { uid: 'c', id: 'lamp', x: 1, y: 3, rot: 0 }] };

test('homeshare: ids/keys, layout cleaning (known items, bounds, no overlaps), chat filter on entries', () => {
  const sh = HS.newShare(); assert.match(sh.id, HS.HOME_RE); assert.match(sh.key, /^[0-9a-f]{32}$/); assert.notEqual(HS.newShare().id, sh.id);
  const s = { plots: {} }; assert.equal(HS.myHomePlot(s), null); const a = HS.ensureShare(s); assert.equal(HS.ensureShare(s), a, 'stable once made');
  const l = HS.cleanLayout({ wall: 99, floor: -1, items: [...LAYOUT.items, { id: 'sofa', x: 1, y: 1, rot: 0 }, { id: 'nope', x: 0, y: 0 }, { id: 'chair', x: 9.5, y: 0 }, { id: 'bed', x: 9, y: 0, rot: 0 }, { id: 'chair', x: 9, y: 6, rot: 7 }] });
  assert.deepEqual(l.items.map((i) => [i.id, i.x, i.y, i.rot]), [['sofa', 1, 1, 0], ['rug', 1, 3, 0], ['lamp', 1, 3, 0], ['chair', 9, 6, 3]], 'overlap/unknown/fractional/out of bounds dropped; rug + lamp on different layers ok');
  assert.equal(l.wall, 0); assert.equal(l.floor, 0); assert.equal(HS.cleanLayout(null), null); assert.equal(HS.cleanLayout({ items: 'x' }), null);
  assert.equal(HS.layoutOf({ ...LAYOUT }).items.length, 3); assert.equal(HS.layoutKey(HS.layoutOf(LAYOUT)), HS.layoutKey(HS.cleanLayout(LAYOUT)));
  assert.equal(HS.cleanEntry('Biscuit', 'Lovely sofa!').text, 'Lovely sofa!');
  assert.equal(HS.cleanEntry('x', 'nice fuck').text, 'nice ****', 'profanity masked like chat');
  assert.equal(HS.cleanEntry('x', 'visit www.scam.io').text, 'visit', 'links stripped like chat');
  for (const bad of ['', 'www.scam.io', 'send to 4VE9sy4fEMJdZ6i7MkYPbnqDJd2oqzJQmg44WJ3opump', 'abandon ability able about above absent absorb abstract absurd abuse access accident']) assert.equal(HS.cleanEntry('x', bad).ok, false, bad);
  assert.equal(HS.cleanEntry('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', 'hi').name, 'A visitor', 'addresses never become names');
});

test('api/home: publish claims the id (owner key hashed), get, guestbook sign + filter + rate limits, owner-only delete', async () => {
  const { kv, h, tick } = mk(), sh = HS.newShare(), other = HS.newShare();
  assert.equal((await call(h, { method: 'GET', query: sh.id })).code, 404);
  assert.equal((await call(h, { method: 'GET', query: 'bad' })).code, 400);
  let r = await call(h, { body: { op: 'publish', ...sh, name: 'Biscuit', layout: LAYOUT } }); assert.equal(r.code, 200); assert.equal(r.body.items, 3);
  const raw = await kv.get('home:v1:' + sh.id); assert.ok(!raw.includes(sh.key), 'owner key is never stored, only its hash');
  assert.equal(kv.map.get('home:v1:' + sh.id).exp - 1_800_000_000_000, TTL_S * 1000);
  r = await call(h, { body: { op: 'publish', ...sh, name: 'Biscuit', layout: LAYOUT } }); assert.equal(r.code, 429, 'publish rate limit'); tick(3000);
  r = await call(h, { body: { op: 'publish', id: sh.id, key: other.key, name: 'Thief', layout: { items: [] } } }); assert.equal(r.code, 403, 'someone else cannot overwrite');
  r = await call(h, { method: 'GET', query: sh.id }); assert.equal(r.body.name, 'Biscuit'); assert.equal(r.body.layout.items.length, 3); assert.deepEqual(r.body.book, []); assert.equal(r.headers['access-control-allow-origin'], '*');
  assert.equal(r.body.kh, undefined, 'hash not exposed');
  // sign
  assert.equal((await call(h, { body: { op: 'sign', id: other.id, name: 'Mochi', text: 'hi' } })).code, 404, 'unpublished home');
  assert.equal((await call(h, { body: { op: 'sign', id: sh.id, name: 'Mochi', text: 'https://t.me/scam' } })).code, 400, 'a link-only entry is refused (links are stripped like chat)');
  r = await call(h, { body: { op: 'sign', id: sh.id, name: 'Mochi', text: 'Cute home, shit nice rug!' } }); assert.equal(r.code, 200); assert.equal(r.body.entry.text, 'Cute home, **** nice rug!'); assert.equal(r.body.entry.name, 'Mochi');
  r = await call(h, { body: { op: 'sign', id: sh.id, name: 'Mochi', text: 'again' } }); assert.equal(r.code, 429, 'one per home per minute per IP');
  r = await call(h, { body: { op: 'sign', id: sh.id, name: 'Kuma', text: 'hello from another IP' }, ip: '5.6.7.8' }); assert.equal(r.code, 200);
  tick(20_000); r = await call(h, { body: { op: 'sign', id: sh.id, name: 'Mochi', text: 'still too soon' } }); assert.equal(r.code, 429); tick(41_000);
  r = await call(h, { body: { op: 'sign', id: sh.id, name: 'Mochi', text: 'third' } }); assert.equal(r.code, 200);
  const book = (await call(h, { method: 'GET', query: sh.id })).body.book; assert.deepEqual(book.map((e) => e.text), ['third', 'hello from another IP', 'Cute home, **** nice rug!'], 'newest first');
  // delete: owner only
  assert.equal((await call(h, { body: { op: 'del', id: sh.id, key: other.key, entry: book[1].i } })).code, 403);
  assert.equal((await call(h, { body: { op: 'del', id: sh.id, key: sh.key, entry: book[1].i } })).code, 200);
  assert.equal((await call(h, { body: { op: 'del', id: sh.id, key: sh.key, entry: 'nope' } })).code, 404);
  r = await call(h, { body: { op: 'book', id: sh.id, key: sh.key } }); assert.deepEqual(r.body.book.map((e) => e.text), ['third', 'Cute home, **** nice rug!']);
  assert.equal((await call(h, { body: { op: 'book', id: sh.id, key: other.key } })).code, 403);
});

test('api/home: guestbook capped at 50 entries; 15 s per-IP gap across homes; store errors -> 500 without details', async () => {
  const { h, tick } = mk(), a = HS.newShare(), b = HS.newShare();
  await call(h, { body: { op: 'publish', ...a, name: 'A', layout: LAYOUT } }); await call(h, { body: { op: 'publish', ...b, name: 'B', layout: LAYOUT } });
  assert.equal((await call(h, { body: { op: 'sign', id: a.id, name: 'x', text: 'one' } })).code, 200);
  assert.equal((await call(h, { body: { op: 'sign', id: b.id, name: 'x', text: 'two' } })).code, 429, 'same IP, other home, within 15 s');
  tick(16_000); assert.equal((await call(h, { body: { op: 'sign', id: b.id, name: 'x', text: 'two' } })).code, 200);
  for (let i = 0; i < 60; i++) await call(h, { body: { op: 'sign', id: a.id, name: 'x', text: 'entry ' + i }, ip: '9.9.9.' + i });
  const g = (await call(h, { method: 'GET', query: a.id })).body; assert.equal(g.count, 50); assert.equal(g.book[0].text, 'entry 59');
  const broken = makeHandler({ env: {}, kv: { get: async () => { throw new Error('ECONN secret-url'); }, set: async () => {}, setNX: async () => true, del: async () => {} } });
  const r = await call(broken, { method: 'GET', query: a.id }); assert.equal(r.code, 500); assert.ok(!JSON.stringify(r.body).includes('secret'));
});

test('multiplayer client: home id sent in hello and on change, peers get "Visit home" (server value only)', async () => {
  const sent = [], json = () => sent.filter((x) => x[0] === '{').map((x) => JSON.parse(x)); let inst; class WS { constructor() { inst = this; this.readyState = 1; setTimeout(() => this.onopen?.(), 0); } send(s) { sent.push(s); } close() {} }
  let L = { room: 'city', x: 1, y: 1, f: 'down', name: 'Me', look: { coat: 'tan', eq: {} }, h: 'h00000000000a' }, visited = null;
  const mp = createMultiplayer({ getLocal: () => L, WS, doc: null, clock: () => Date.now(), onVisit: (id, n) => { visited = [id, n]; } });
  await mp.start('ws://x'); mp.step(0.016); await new Promise((r) => setTimeout(r, 5));
  assert.equal(json()[0].h, 'h00000000000a');
  inst.onmessage({ data: JSON.stringify({ t: 'w', id: 'me', name: 'Me', room: 'city', inst: 1, players: [{ id: 'p2', name: 'Biscuit', h: 'h00000000000b', look: {} }, { id: 'p3', name: 'Junk', h: 'javascript:x', look: {} }] }) });
  assert.deepEqual(mp.players().map((p) => p.h), ['h00000000000b', null]);
  inst.onmessage({ data: JSON.stringify({ t: 'h', id: 'p3', h: 'h00000000000c' }) }); assert.equal(mp.players()[1].h, 'h00000000000c');
  L = { ...L, h: null }; mp.step(0.016); assert.deepEqual(json().at(-1), { t: 'h', h: null }, 'closing your home tells the room');
  mp.stop();
});

test('main/ui wiring: Visit home in the player list, guestbook in build mode, landscape side panel, no paid mechanics', () => {
  const m = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8'), mp = fs.readFileSync(new URL('../src/multiplayer.js', import.meta.url), 'utf8'), css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  assert.match(mp, /data-visit=/); assert.match(mp, />Visit home</); assert.match(m, /onVisit: \(id, name\) => visitShared\(id, name\)/);
  assert.match(m, /function sharedBuildBar/); assert.match(m, /data-gbdel/); assert.match(m, /HOME\.sign\(/); assert.match(m, /HOME\.del\(/);
  assert.match(m, /const buildSide = \(\) => innerHeight < 520 && innerWidth > innerHeight/); assert.match(css, /body\.short\.landscape #buildbar/);
  const r4 = m.slice(m.indexOf('// ---- Round 4: share your home'), m.indexOf('function enterBuild('));
  for (const w of [/\bbuy\b/i, /\bsell\b/i, /kibble/i, /price/i, /bones/i]) assert.doesNotMatch(r4, w, 'no new paid mechanics / banned copy in the R4 block: ' + w);
  const api = fs.readFileSync(new URL('../api/home.js', import.meta.url), 'utf8'); assert.doesNotMatch(api, /wallet\s*[:=]|transfer|sign(Transaction|Message)/);
});

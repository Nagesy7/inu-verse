// Friends list: follow by public name, block/unfollow, presence from live multiplayer + /api/feed?who, Join targets.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import * as F from '../src/friends.js';
import { makeHandler } from '../api/feed.js';
import { memoryKv } from '../api/_lib/kv.js';
import { touchVisitor } from '../api/_lib/feed.js';
import { SPOTS } from '../src/ghosts.js';
import { DRAWER } from '../src/hudmenu.js';

const T0 = Date.UTC(2026, 10, 3, 3);
const get = (h, url) => new Promise((done) => { const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { done({ code: this.statusCode, headers: this.headers, raw: b, body: JSON.parse(b) }); } };
  h({ method: 'GET', url, query: Object.fromEntries(new URL(url, 'http://x').searchParams), headers: {} }, res); });

test('follow / unfollow / block / unblock by public name; no self, no duplicates, filtered names refused', () => {
  const s = { player: { name: 'Rex' } };
  assert.equal(F.follow(s, 'Kabosu').ok, true); assert.equal(F.follow(s, 'KABOSU').ok, false); assert.equal(F.follow(s, 'rex').ok, false);
  assert.equal(F.follow(s, 'evil.com').ok, false); assert.equal(F.follow(s, '').ok, false);
  assert.ok(F.isFollowing(s, 'kabosu')); assert.equal(F.unfollow(s, 'Kabosu'), true); assert.ok(!F.isFollowing(s, 'Kabosu'));
  F.follow(s, 'Shiba'); F.block(s, 'Shiba'); assert.ok(!F.isFollowing(s, 'Shiba') && F.isBlocked(s, 'Shiba')); assert.equal(F.follow(s, 'Shiba').ok, false, 'blocked cannot be followed');
  assert.equal(F.unblock(s, 'shiba'), true); assert.equal(F.follow(s, 'Shiba').ok, true);
  for (let i = 0; i < F.FR.MAX + 5; i++) F.follow(s, 'Pup' + (1000 + i)); assert.ok(F.ensureFriends(s).list.length <= F.FR.MAX);
  assert.ok(!JSON.stringify(s.friends).match(/wallet|addr|email/i));
});
test('statusOf: here (same room) > online with area > last seen > offline; Join targets', () => {
  const fr = { n: 'Kabosu', k: 'kabosu' };
  const here = F.statusOf(fr, { here: [{ name: 'Kabosu', x: 100, y: 200 }] }); assert.equal(here.state, 'here'); assert.deepEqual(F.joinTarget(here), { px: 128, py: 200, near: true });
  const on = F.statusOf(fr, { who: { kabosu: { n: 'Kabosu', on: true, a: 'pond', t: T0 } }, now: T0 + 30_000 }); assert.equal(on.state, 'online'); assert.match(on.label, /Fishing Pond/);
  assert.deepEqual(F.joinTarget(on), { tx: SPOTS.pond.tx, ty: SPOTS.pond.ty, name: 'Fishing Pond' });
  const away = F.statusOf(fr, { who: { kabosu: { n: 'Kabosu', on: false, a: null, t: T0 } }, now: T0 + 3_600_000 }); assert.equal(away.state, 'away'); assert.equal(F.joinTarget(away), null);
  assert.equal(F.statusOf(fr, {}).state, 'offline');
  const stale = F.statusOf(fr, { who: { kabosu: { on: true, a: 'pond', t: T0 } }, now: T0 + F.FR.ONLINE_MS + 1 }); assert.notEqual(stale.state, 'online');
});
test('GET /api/feed?who= returns presence for asked public names only; area only while online', async () => {
  let t = T0; const kv = memoryKv(() => t); const h = makeHandler({ env: {}, kv, now: () => t, f: async () => ({ ok: false }), sleep: async () => {} });
  await touchVisitor(kv, { n: 'OldPup', c: 'tan', a: 'mall' }, { now: T0 - 3_600_000 }); await touchVisitor(kv, { n: 'Kabosu', c: 'tan', a: 'pond' }, { now: T0 - 30_000 }); await touchVisitor(kv, { n: 'Stranger', c: 'tan', a: 'bank' }, { now: T0 });
  const r = await get(h, '/api/feed?who=kabosu,OldPup,Nobody,' + encodeURIComponent('<script>'));
  assert.equal(r.code, 200); assert.deepEqual(Object.keys(r.body.who).sort(), ['kabosu', 'oldpup']);
  assert.equal(r.body.who.kabosu.on, true); assert.equal(r.body.who.kabosu.a, 'pond'); assert.equal(r.body.who.oldpup.on, false); assert.equal(r.body.who.oldpup.a, null);
  assert.ok(!r.raw.includes('Stranger') && !r.raw.includes('"c"')); assert.equal(r.body.who.kabosu.t % 60_000, 0);
  const many = await get(h, '/api/feed?who=' + Array.from({ length: 200 }, (_, i) => 'P' + i).join(',')); assert.equal(many.code, 200);
  assert.equal(F.whoKeys(Array.from({ length: 200 }, (_, i) => 'Pup' + i).join(',')).length, F.FR.WHO_MAX);
  const plain = await get(h, '/api/feed'); assert.ok(Array.isArray(plain.body.events), 'normal feed GET unchanged');
});
test('panel html: escaped names, Join only when joinable, blocked section, controller-reachable buttons', () => {
  const s = { player: { name: 'Rex' } }; F.follow(s, 'Kabosu'); F.follow(s, 'Doge'); F.block(s, 'Meanie');
  const html = F.friendsHtml(s, { here: [{ name: 'Kabosu', x: 1, y: 2 }, { name: 'NewPal', x: 3, y: 4 }], who: {}, mp: 'online' });
  assert.ok(html.includes('1 of 2 online')); assert.equal((html.match(/data-act="join"/g) || []).length, 1); assert.ok(html.includes('data-act="unfollow"') && html.includes('data-act="block"'));
  assert.ok(html.includes('data-n="NewPal"') && html.includes('Blocked (1)') && html.includes('data-act="unblock"'));
  assert.ok(!/kibble|bones|wallet/i.test(html.replace(/wallet/gi, (m) => m))); // no economy in the friends list
  const x = F.friendsHtml({ player: { name: 'a' }, friends: { list: [{ n: '<b>', k: '<b>' }], blocked: [] } }, {}); assert.ok(!x.includes('<b><'));
});
test('wired: Menu → Me, Follow on the players-online card, main.js handlers', () => {
  assert.ok(DRAWER.find(([k]) => k === 'Me')[1].includes('btn-friends')); assert.ok(fs.readFileSync('index.html', 'utf8').includes('id="btn-friends"'));
  const mp = fs.readFileSync('src/multiplayer.js', 'utf8'); assert.ok(mp.includes('data-follow=') && mp.includes('h.follow?.('));
  const main = fs.readFileSync('src/main.js', 'utf8'); assert.ok(main.includes("kind === 'friends'") && main.includes('onFollow:') && main.includes('function joinFriend'));
});
test('a friend followed by their live guest tag (Pup1234) is found via the feed presence, without revealing their other name', async () => {
  let t = T0; const kv = memoryKv(() => t); const h = makeHandler({ env: {}, kv, now: () => t, f: async () => ({ ok: false }), sleep: async () => {} });
  const hi = await new Promise((done) => { const res = { headers: {}, setHeader() {}, end(b) { done(JSON.parse(b)); } }; h({ method: 'POST', url: '/api/feed', headers: { 'x-forwarded-for': '9.9.9.9' }, body: JSON.stringify({ op: 'hello', name: 'Kabosu', coat: 'tan', area: 'arcade', g: 'Pup4242' }) }, res); });
  assert.ok(hi.sid); t += 1000;
  const r = await get(h, '/api/feed?who=Pup4242'); assert.equal(r.body.who.pup4242.on, true); assert.equal(r.body.who.pup4242.a, 'arcade'); assert.ok(!r.raw.includes('Kabosu'));
  const bad = await new Promise((done) => { const res = { headers: {}, setHeader() {}, end(b) { done(JSON.parse(b)); } }; h({ method: 'POST', url: '/api/feed', headers: { 'x-forwarded-for': '8.8.8.8' }, body: JSON.stringify({ op: 'hello', name: 'Other', coat: 'tan', area: 'pond', g: '<x>' }) }, res); });
  assert.ok(bad.sid); assert.ok(!JSON.stringify(JSON.parse(await kv.get('feed:v1:vis'))).includes('<x>'));
});

// blocked players are not drawn: live multiplayer actors skip them, feed ghosts are excluded by key
import { createMultiplayer as mkMP } from '../src/multiplayer.js';
import { createGhosts as mkGhosts } from '../src/ghosts.js';
test('blocked players: no live avatar, no feed ghost', async () => {
  const socks = []; class WS { constructor() { this.sent = []; this.readyState = 0; socks.push(this); } send(s) { this.sent.push(s); } close() { this.readyState = 3; } open() { this.readyState = 1; this.onopen?.(); } recv(m) { this.onmessage?.({ data: JSON.stringify(m) }); } }
  const s = {}; const L = { room: 'city', x: 100, y: 100, f: 'down', m: false, r: false, d: false, emote: null, act: null, p: 0, name: 'Pup1', look: { coat: 'tan', eq: {} } };
  let ms = 1000, t = 0; const mp = mkMP({ getLocal: () => L, WS, doc: null, clock: () => ms, now: () => t, isBlocked: (n) => F.isBlocked(s, n) });
  await mp.start('ws://x'); ms += 16; t += 0.016; mp.step(0.016); const ws = socks[0]; ws.open();
  ws.recv({ t: 'w', id: 'me', name: 'Pup1', room: 'city', inst: 1, players: [{ id: 'a', name: 'Tora', look: {}, s: { x: 50, y: 60, f: 'down', ts: 0 } }, { id: 'b', name: 'Mochi', look: {}, s: { x: 70, y: 60, f: 'down', ts: 0 } }] });
  assert.deepEqual(mp.actors(null).map((a) => a.name).sort(), ['Mochi', 'Tora']);
  F.block(s, "tora"); assert.deepEqual(mp.actors(null).map((a) => a.name), ['Mochi'], 'blocked (any case) is not drawn');
  assert.equal(mp.anchor('mp:a'), null); assert.equal(mp.players().length, 2, 'still listed on the card so you can unblock');
  F.unblock(s, "Tora"); assert.equal(mp.actors(null).length, 2);
  const gh = mkGhosts({ now: () => 1e9 }), old = 1e9 - 10 * 60e3;
  gh.set([{ n: 'Tora', c: 'tan', a: 'plaza', t: old }, { n: 'Mochi', c: 'tan', a: 'plaza', t: old }], new Set(['tora']));
  assert.deepEqual(gh.list.map((g) => g.n), ['Mochi']);
  gh.exclude(['Mochi']); assert.equal(gh.list.length, 0);
});

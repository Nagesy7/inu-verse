// Live multiplayer: shared moderation/rate-limit/room rules (client == server), interpolation, client throttling, graceful offline.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MP, cleanChat, cleanName, take, pickInstance, interpolate, pushSnap, cullPlayers, cleanState, cleanLook, validRoom, seedLike, hasAddress } from '../src/mpshared.js';
import { createMultiplayer, resolveRealtimeUrl } from '../src/multiplayer.js';
import { originAllowed } from '../realtime/src/worker.js';
import { publicConfig } from '../api/config.js';

test('filter: profanity masked, slurs refused, Scunthorpe-safe', () => {
  assert.equal(cleanChat('you fucking idiot').text, 'you ******* idiot');
  assert.equal(cleanChat('shiiiit man').text, '******* man'); assert.equal(cleanChat('shiiiit').ok, false); // all-profanity lines are not sent
  for (const s of ['n i g g e r', 'you f4gg0t', 'what a retard', 'N1GGA']) assert.equal(cleanChat(s).ok, false, s);
  for (const s of ['I love Nigeria', 'spicy raccoon tycoon', 'the cockpit cocktail', 'Scunthorpe', 'a classic assassin', 'flame retardant', 'hello friends!']) assert.equal(cleanChat(s).text, s, s);
});
test('filter: links stripped, length cap, control chars and html removed', () => {
  assert.equal(cleanChat('join www.scam.xyz now').text, 'join now');
  assert.equal(cleanChat('go https://evil.example/x?y=1 ok').text, 'go ok');
  assert.equal(cleanChat('visit pump.fun/coin and kibble.money').text, 'visit and');
  assert.equal(cleanChat('dm me discord.gg/abc').text, 'dm me');
  assert.equal(cleanChat('x'.repeat(200)).text.length, MP.CHAT_MAX);
  assert.equal(cleanChat('<b>hi</b>\u0007\u202e').text, 'bhi/b');
  assert.match(cleanChat('https://only.link').reason, /Links/);
  assert.equal(cleanChat('   ').ok, false);
});
test('filter: no wallet addresses, keys or seed-like word lists', () => {
  for (const s of ['send BzLYTFAfUsjzQ5x8bx5BbPK4DFtaHrLCuferkvkxTNGJ pls', 'Bz LYTF AfUs jzQ5 x8bx 5BbP K4DF taHr LCuf erkv kxTN GJ', '0x52908400098527886E0F7030069857D2E4169EE7',
    'a'.repeat(0) + '4f3c2b1a9e8d7c6b5a4f3c2b1a9e8d7c6b5a4f3c2b1a9e8d7c6b5a4f3c2b1a9e8d']) assert.equal(cleanChat(s).ok, false, s);
  for (const s of ['abandon ability able about above absent absorb abstract absurd abuse access accident', '1. abandon 2. ability 3. able 4. about 5. above 6. absent', 'zoo wrong wrist write year yellow young youth zebra zero zone zoo'])
    assert.match(cleanChat(s).reason, /seed phrase/, s);
  for (const s of ['what a sunny day here at the park we should hang out', 'my score is 123456 and 7890 points nice', 'GOODMORNINGEVERYBODYHOWAREYOU']) { assert.equal(seedLike(s), false, s); assert.equal(hasAddress(s), false, s); }
});
test('names: guest fallback for addresses/profanity, short addresses ok', () => {
  assert.equal(cleanName('Rex'), 'Rex'); assert.equal(cleanName('xX_fuck_Xx', 'Pup1234'), 'Pup1234'); assert.equal(cleanName('BzLYTFAfUsjzQ5x8bx5BbPK4DFtaHrLCuferkvkxTNGJ', 'Bz…NGJ'), 'Bz…NGJ');
  assert.equal(cleanName('Rex'.repeat(14)).length, MP.NAME_MAX); assert.equal(cleanName('<script>'), 'script');
});
test('rate limit: token bucket drops faster updates (state ~10 Hz, chat 1 per 2 s)', () => {
  const b = {}; let ok = 0; for (let t = 0; t < 1000; t += 10) ok += take(b, t, MP.STATE_RATE, MP.STATE_BURST); // 100 msgs in 1 s at 100 Hz
  assert.ok(ok >= 10 && ok <= 14, `accepted ${ok}`);
  const c = {}; assert.equal(take(c, 0, MP.CHAT_RATE, MP.CHAT_BURST), true); assert.equal(take(c, 1000, MP.CHAT_RATE, MP.CHAT_BURST), false); assert.equal(take(c, 2001, MP.CHAT_RATE, MP.CHAT_BURST), true);
});
test('rooms: cap 40 per instance, overflow to instance 2, all-full -> 0, room ids validated', () => {
  assert.equal(MP.ROOM_CAP, 40); assert.equal(pickInstance([]), 1); assert.equal(pickInstance([39]), 1); assert.equal(pickInstance([40]), 2); assert.equal(pickInstance([40, 40, 3]), 3);
  assert.equal(pickInstance(Array(8).fill(40)), 0); assert.equal(validRoom('city'), true); assert.equal(validRoom('int:cafe'), true); assert.equal(validRoom('../x'), false); assert.equal(validRoom('A'.repeat(40)), false);
});
test('sanitise: state clamped/rounded, look stripped to known fields', () => {
  assert.deepEqual(cleanState({ x: 1e9, y: -5, f: 'evil', m: 'yes' }), { x: MP.WORLD_MAX, y: 0, f: 'down', m: 1, r: 0, d: 0, ts: 0 }); assert.equal(cleanState({ x: 'a', y: 1 }), null);
  const l = cleanLook({ coat: 'tan', eq: { hat: 'cap_red', top: '<img>' }, pl: { look: { coat: '#aabbcc', evil: 'javascript:alert(1)' }, outfit: { hat: { id: 'cap', c: '#ff0000' } } }, extra: 'x'.repeat(5000) });
  assert.deepEqual(l.eq, { hat: 'cap_red' }); assert.deepEqual(l.pl.look, { coat: '#aabbcc' }); assert.equal(JSON.stringify(l).length < 600, true);
});
test('interpolation: ~100 ms buffered lerp, holds at the ends, snaps teleports, idle->walk starts smoothly', () => {
  const buf = [{ t: 0, x: 0, y: 0, f: 'right', m: 1 }, { t: 100, x: 10, y: 0, f: 'right', m: 1 }, { t: 200, x: 20, y: 10, f: 'down', m: 1 }];
  assert.equal(interpolate(buf, -50).x, 0); assert.equal(interpolate(buf, 50).x, 5); assert.equal(interpolate(buf, 150).y, 5); assert.equal(interpolate(buf, 999).x, 20);
  assert.equal(interpolate([{ t: 0, x: 0, y: 0 }, { t: 100, x: 900, y: 0 }], 50).x, 900); // door teleport: snap, no slide across the map
  const rp = {}; pushSnap(rp, { x: 100, y: 100, ts: 1000 }, 5000); pushSnap(rp, { x: 104, y: 100, ts: 6000, m: 1 }, 10000); // 5 s idle, then moves
  assert.equal(rp.buf.length, 3); assert.equal(rp.buf[1].x, 100); assert.equal(rp.buf[2].t - rp.buf[1].t, MP.SEND_MS); // hold point
  const mid = interpolate(rp.buf, rp.buf[2].t - MP.SEND_MS / 2); assert.ok(mid.x > 100 && mid.x < 104);
  pushSnap(rp, { x: 1, y: 1, ts: 5999 }, 10001); assert.equal(rp.buf.at(-1).x, 104); // out-of-order packets ignored
});
test('culling: only on-screen players, nearest first, capped for phone fps', () => {
  const ps = Array.from({ length: 50 }, (_, i) => ({ x: i * 20, y: 100 })); const v = { x0: 0, y0: 0, x1: 400, y1: 300 };
  const vis = cullPlayers(ps, v, { x: 200, y: 100 }, 12); assert.equal(vis.length, 12); assert.ok(vis.every((p) => p.x <= 480)); assert.equal(vis[0].x, 200);
});

// ---- client against a fake socket ----
function fakeWS() { const socks = []; class W { constructor(url) { this.url = url; this.readyState = 0; this.sent = []; socks.push(this); } send(s) { this.sent.push(s); } close() { this.readyState = 3; } open() { this.readyState = 1; this.onopen?.(); } recv(o) { this.onmessage?.({ data: JSON.stringify(o) }); } die() { this.readyState = 3; this.onclose?.(); } } W.socks = socks; return W; }
const mk = (over = {}) => { let ms = 0; const L = { room: 'city', x: 100, y: 100, f: 'down', m: false, r: false, d: false, emote: null, name: 'Rex', look: { coat: 'tan', eq: {} } }; const WS = fakeWS(); const toasts = [];
  const mp = createMultiplayer({ getLocal: () => L, WS, clock: () => ms, now: () => ms / 1000, doc: null, toast: (m) => toasts.push(m), ...over }); return { mp, L, WS, toasts, tick: (d = 16) => { ms += d; mp.step(d / 1000); }, get ms() { return ms; } }; };
test('client: sends state only on change and at most ~9 Hz', async () => {
  const c = mk(); await c.mp.start('ws://x'); c.tick(); const ws = c.WS.socks[0]; ws.open(); ws.recv({ t: 'w', id: 'me', name: 'Pup1', room: 'city', inst: 1, players: [] });
  const hi = JSON.parse(ws.sent[0]); assert.equal(hi.t, 'hi'); assert.equal(hi.tok, undefined);
  for (let i = 0; i < 60; i++) c.tick(16); assert.equal(ws.sent.filter((s) => s.includes('"t":"s"')).length, 0); // idle: nothing
  for (let i = 0; i < 63; i++) { c.L.x += 2; c.L.m = true; c.tick(16); } // ~1 s walking at 60 fps
  const n = ws.sent.filter((s) => s.includes('"t":"s"')).length; assert.ok(n >= 8 && n <= 10, `sent ${n}`);
});
test('client: remote players join/move/chat/emote/quit, mute hides chat, actors renderer-ready', async () => {
  const c = mk(); await c.mp.start('ws://x'); c.tick(); const ws = c.WS.socks[0]; ws.open();
  ws.recv({ t: 'w', id: 'me', name: 'Pup1', room: 'city', inst: 2, players: [{ id: 'a', name: 'Pup2', look: { coat: 'cream', eq: { hat: 'cap' } }, s: { x: 50, y: 60, f: 'left', ts: 0 } }] });
  assert.equal(c.mp.count, 2); let a = c.mp.actors({ x0: 0, y0: 0, x1: 500, y1: 500 }, { x: 0, y: 0 }); assert.equal(a[0].name, 'Pup2'); assert.equal(a[0].art, 'layer:cream'); assert.deepEqual(a[0].outfit, { hat: 'cap' }); assert.ok(c.mp.anchor('mp:a'));
  ws.recv({ t: 'j', p: { id: 'b', name: 'Pup3', look: {}, s: { x: 5000, y: 5000 } } }); assert.equal(c.mp.count, 3); assert.equal(c.mp.actors({ x0: 0, y0: 0, x1: 500, y1: 500 }, { x: 0, y: 0 }).length, 1); // off-screen culled
  const { bubbles, resetChat } = await import('../src/chat.js'); resetChat();
  ws.recv({ t: 'c', id: 'a', text: 'hi friend' }); assert.equal(bubbles().at(-1).text, 'hi friend');
  c.mp.toggleMute('Pup2'); resetChat(); ws.recv({ t: 'c', id: 'a', text: 'hello?' }); assert.equal(bubbles().length, 0);
  ws.recv({ t: 'e', id: 'b', k: 'wave' }); ws.recv({ t: 'e', id: 'b', k: '<script>' }); assert.equal(c.mp.S.remotes.get('b').emote.kind, 'wave');
  ws.recv({ t: 'q', id: 'b' }); assert.equal(c.mp.count, 2);
  assert.equal(c.mp.chat('my seed abandon ability able about above absent absorb abstract'), false); assert.match(c.toasts.at(-1), /seed/);
  assert.equal(c.mp.chat('hello all'), true); assert.equal(c.mp.chat('again'), false); assert.match(c.toasts.at(-1), /Slow down/);
  ws.recv({ t: 'garbage' }); ws.onmessage({ data: '{not json' }); // ignored
});
test('graceful offline: no URL = off; dead server / constructor throw / drop -> solo with backoff, no throws', async () => {
  const off = mk(); assert.equal(await off.mp.start(null), false); for (let i = 0; i < 10; i++) off.tick(); assert.equal(off.WS.socks.length, 0); assert.deepEqual(off.mp.actors(null), []);
  const c = mk(); await c.mp.start('ws://x'); c.tick(); const ws = c.WS.socks[0]; ws.open(); ws.recv({ t: 'w', id: 'me', name: 'P', room: 'city', inst: 1, players: [{ id: 'a', name: 'Q', look: {} }] });
  ws.die(); assert.equal(c.mp.status, 'offline'); assert.equal(c.mp.count, 0); assert.deepEqual(c.mp.actors(null), []);
  c.tick(500); assert.equal(c.WS.socks.length, 1); c.tick(3000); assert.equal(c.WS.socks.length, 2); // reconnect after backoff
  c.WS.socks[1].die(); c.tick(2600); assert.equal(c.WS.socks.length, 2); c.tick(3000); assert.equal(c.WS.socks.length, 3); // backoff doubles
  assert.equal(c.mp.chat('hi'), false); // offline chat: refused politely
  const bad = mk({ WS: class { constructor() { throw new Error('blocked'); } } }); await bad.mp.start('ws://x'); for (let i = 0; i < 5; i++) bad.tick(1000); assert.equal(bad.mp.status, 'offline');
  // leaving the room (home interior) hides you for others, then closes after a grace period
  const h = mk(); await h.mp.start('ws://x'); h.tick(); const hw = h.WS.socks[0]; hw.open(); hw.recv({ t: 'w', id: 'me', name: 'P', room: 'city', inst: 1, players: [] }); h.L.x = 120; h.tick(200);
  h.L.room = null; h.tick(16); assert.match(hw.sent.at(-1), /"d":1/); h.tick(16000); assert.equal(hw.readyState, 3);
});
test('config: realtime URL only from /api/config (wss) or ?mp=; off otherwise', async () => {
  assert.equal(await resolveRealtimeUrl({ search: '?mp=off', f: () => { throw 1; } }), null);
  assert.equal(await resolveRealtimeUrl({ search: '?mp=ws://127.0.0.1:8787', f: null }), 'ws://127.0.0.1:8787');
  assert.equal(await resolveRealtimeUrl({ search: '', f: async () => ({ ok: true, json: async () => ({ realtimeUrl: 'wss://rt.example.workers.dev/' }) }) }), 'wss://rt.example.workers.dev');
  assert.equal(await resolveRealtimeUrl({ search: '', f: async () => ({ ok: true, json: async () => ({ realtimeUrl: null }) }) }), null);
  assert.equal(await resolveRealtimeUrl({ search: '', f: async () => { throw new Error('offline'); } }), null);
  assert.equal(publicConfig({}).realtimeUrl, null); assert.equal(publicConfig({ REALTIME_URL: 'wss://inu-verse-realtime.x.workers.dev/' }).realtimeUrl, 'wss://inu-verse-realtime.x.workers.dev');
  assert.equal(publicConfig({ REALTIME_URL: 'javascript:alert(1)' }).realtimeUrl, null); assert.equal(publicConfig({ REALTIME_URL: 'ws://insecure.example' }).realtimeUrl, null);
  const list = 'https://inu-verse-tawny.vercel.app,http://localhost:*'; assert.equal(originAllowed('https://inu-verse-tawny.vercel.app', list), true); assert.equal(originAllowed('http://localhost:8642', list), true);
  assert.equal(originAllowed('https://evil.example', list), false); assert.equal(originAllowed('http://localhost.evil.com', list), false); assert.equal(originAllowed(null, list), false);
});

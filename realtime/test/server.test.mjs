// Integration tests against a running worker (wrangler dev). Start it with a small cap so overflow is cheap to test:
//   npx wrangler dev --port 8787 --var ROOM_CAP:3 --var MAX_INSTANCES:3      then   MP_URL=ws://127.0.0.1:8787 npm test
// Skipped when MP_URL is unset.
import test from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';

const URL0 = process.env.MP_URL, CAP = Number(process.env.MP_CAP || 3), ORIGIN = 'http://localhost:8642';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function client(room, { origin = ORIGIN, guest, tok, look, h } = {}) { return new Promise((res, rej) => {
  const ws = new WebSocket(`${URL0}/ws?room=${encodeURIComponent(room)}`, { origin }); const c = { ws, msgs: [], welcome: null };
  ws.on('message', (d) => { const m = JSON.parse(String(d)); c.msgs.push(m); if (m.t === 'w') { c.welcome = m; res(c); } });
  ws.on('open', () => ws.send(JSON.stringify({ t: 'hi', tok, guest: guest || 'Pup' + (1000 + Math.floor(Math.random() * 9000)), name: 'ignored-for-guests', look: look || { coat: 'tan', eq: {} }, h, s: { x: 100, y: 100, f: 'down', ts: Date.now() } })));
  ws.on('unexpected-response', (_, r) => rej(new Error('http ' + r.statusCode))); ws.on('error', rej); }); }
const of = (c, t) => c.msgs.filter((m) => m.t === t);
const room = (n) => `t${n}-${Date.now().toString(36)}`;

test('server: health + origin check', { skip: !URL0 }, async () => {
  const h = await (await fetch(URL0.replace(/^ws/, 'http') + '/')).json(); assert.equal(h.ok, true);
  await assert.rejects(client(room('o'), { origin: 'https://evil.example' }), /http 403/); });

test('server: players see each other join, move, chat, emote, quit', { skip: !URL0 }, async () => {
  const r = room('a'), A = await client(r, { guest: 'Pup1111' }), B = await client(r, { guest: 'Pup2222' });
  assert.equal(B.welcome.players.length, 1); assert.equal(B.welcome.players[0].name, 'Pup1111');
  await sleep(150); assert.equal(of(A, 'j')[0].p.name, 'Pup2222');
  A.ws.send(JSON.stringify({ t: 's', x: 321.3, y: 99, f: 'left', m: 1, ts: Date.now() })); await sleep(200);
  const s = of(B, 's').at(-1); assert.equal(s.id, A.welcome.id); assert.equal(s.x, 321.5); assert.equal(s.f, 'left');
  A.ws.send(JSON.stringify({ t: 'c', text: 'hi there fuck www.scam.io' })); A.ws.send(JSON.stringify({ t: 'e', k: 'wave' })); await sleep(200);
  assert.equal(of(B, 'c')[0].text, 'hi there ****'); assert.equal(of(B, 'e')[0].k, 'wave');
  A.ws.close(); await sleep(300); assert.equal(of(B, 'q')[0].id, A.welcome.id); B.ws.close(); });

test('server: state rate limit drops updates faster than ~10 Hz', { skip: !URL0 }, async () => {
  const r = room('r'), A = await client(r), B = await client(r); await sleep(100);
  for (let i = 0; i < 40; i++) A.ws.send(JSON.stringify({ t: 's', x: 100 + i, y: 100, f: 'down', ts: Date.now() })); // 40 in a burst
  await sleep(400); const got = of(B, 's').length; assert.ok(got <= 6 && got >= 1, `relayed ${got} of 40`); A.ws.close(); B.ws.close(); });

test('server: chat rate limit (1 per 2 s), filter refusals, size cap', { skip: !URL0 }, async () => {
  const r = room('c'), A = await client(r), B = await client(r); await sleep(100);
  A.ws.send(JSON.stringify({ t: 'c', text: 'one' })); A.ws.send(JSON.stringify({ t: 'c', text: 'two' }));
  A.ws.send(JSON.stringify({ t: 'c', text: 'x'.repeat(5000) })); await sleep(300);
  assert.deepEqual(of(B, 'c').map((m) => m.text), ['one']); assert.match(of(A, 'no')[0].why, /Slow down/);
  await sleep(2100); A.ws.send(JSON.stringify({ t: 'c', text: 'my wallet BzLYTFAfUsjzQ5x8bx5BbPK4DFtaHrLCuferkvkxTNGJ' })); await sleep(300);
  assert.equal(of(B, 'c').length, 1); assert.match(of(A, 'no').at(-1).why, /wallet/); A.ws.close(); B.ws.close(); });

test(`server: room cap ${CAP} -> overflow to instance 2`, { skip: !URL0 }, async () => {
  const r = room('cap'), cs = []; for (let i = 0; i < CAP + 1; i++) cs.push(await client(r));
  assert.deepEqual(cs.map((c) => c.welcome.inst), [...Array(CAP).fill(1), 2]);
  assert.equal(cs[CAP].welcome.players.length, 0); // instance 2 is a separate room
  cs[0].ws.close(); await sleep(300); const back = await client(r); assert.equal(back.welcome.inst, 1); // freed slot is reused
  for (const c of [...cs, back]) c.ws.close(); });

test('server: Round 3 actions ride the emote path (same limits) and the pose code rides state for late joiners', { skip: !URL0 }, async () => {
  const r = room('p'), A = await client(r, { guest: 'Pup1212' }), B = await client(r, { guest: 'Pup3434' }); await sleep(100);
  A.ws.send(JSON.stringify({ t: 'e', k: 'dance2' })); A.ws.send(JSON.stringify({ t: 's', x: 120, y: 100, f: 'down', m: 0, p: 4, ts: Date.now() }));
  A.ws.send(JSON.stringify({ t: 'e', k: 'sleep' })); A.ws.send(JSON.stringify({ t: 'e', k: 'bow' })); A.ws.send(JSON.stringify({ t: 'e', k: 'not-a-pose' })); await sleep(250);
  assert.deepEqual(of(B, 'e').map((m) => m.k), ['dance2', 'sleep'], 'burst of 2, unknown kinds dropped'); assert.equal(of(B, 's').at(-1).p, 4);
  const C = await client(r, { guest: 'Pup5656' }); assert.equal(C.welcome.players.find((p) => p.name === 'Pup1212').s.p, 4, 'late joiner sees the pose');
  A.ws.send(JSON.stringify({ t: 's', x: 120, y: 100, f: 'down', m: 0, p: 77, ts: Date.now() })); await sleep(200); assert.equal(of(B, 's').at(-1).p, 0, 'bad pose codes sanitised');
  A.ws.close(); B.ws.close(); C.ws.close(); });

// Kennel tiers come from the server's own kibble-pay lookup. Run wrangler dev with --var KP_URL:http://127.0.0.1:8799 and
// MP_KP_MOCK=8799: this test serves a fake kibble-pay (save = token check, kennel = tier) and counts the lookups.
test('server: Kennel tier looked up server-side for verified wallets only, client tiers ignored, one lookup per TTL', { skip: !URL0 || !process.env.MP_KP_MOCK }, async () => {
  const http = await import('node:http'), B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', WAL = Array.from({ length: 44 }, () => B58[Math.floor(Math.random() * 58)]).join(''); let kennelCalls = 0; // fresh wallet each run: the colo cache may remember old ones
  const srv = http.createServer((req, res) => { const u = new globalThis.URL(req.url, 'http://x'); res.setHeader('content-type', 'application/json');
    if (u.pathname === '/api/save') return req.headers.authorization === 'Bearer good' ? res.end(JSON.stringify({ wallet: WAL })) : (res.statusCode = 401, res.end('{}'));
    if (u.pathname === '/api/kennel') { kennelCalls++; return res.end(JSON.stringify({ wallet: u.searchParams.get('wallet'), tier: 'alpha' })); } res.statusCode = 404; res.end('{}'); });
  await new Promise((r) => srv.listen(Number(process.env.MP_KP_MOCK), '127.0.0.1', r));
  try { const r = room('k'), fakeLook = { coat: 'tan', eq: {}, pl: { look: { kennel: 'top' }, outfit: {} } };
    const O = await client(r, { guest: 'Pup7070' }), A = await client(r, { tok: 'good', look: { coat: 'tan', eq: {}, pl: { look: { kennel: 'pup' }, outfit: {} } } }), G = await client(r, { guest: 'Pup8080', look: fakeLook });
    await sleep(600); const jA = of(O, 'j').find((m) => m.p.w), jG = of(O, 'j').find((m) => m.p.name === 'Pup8080');
    assert.equal(jA.p.look.pl, undefined, 'client tier stripped'); assert.equal(jG.p.look.pl, undefined); assert.equal(jG.p.k, null, 'guest: no tier');
    assert.deepEqual(of(O, 'k').map((m) => [m.id, m.k]), [[A.welcome.id, 'alpha']], 'only the server-looked-up tier is broadcast');
    G.ws.send(JSON.stringify({ t: 'l', look: fakeLook })); await sleep(250); assert.equal(of(O, 'k').length, 1, 'guest look change: still no tier');
    A.ws.close(); await sleep(200); const A2 = await client(r, { tok: 'good' }); await sleep(400); G.ws.close(); await sleep(200); const C = await client(r, { guest: 'Pup9090' });
    assert.equal(C.welcome.players.find((p) => p.id === A2.welcome.id).k, 'alpha', 'late joiner gets k in the welcome'); assert.equal(kennelCalls, 1, 'one lookup per wallet per TTL');
    O.ws.close(); await sleep(200); const B = await client(r, { tok: 'bad' }); await sleep(300); assert.equal(C.msgs.filter((m) => m.t === 'k' && m.id === B.welcome.id).length, 0, 'unverified: no tier');
    for (const c of [A2, C, B]) c.ws.close(); } finally { srv.closeAllConnections?.(); srv.close(); } });

test('server: Round 4 shared home id rides the player entry (hello + {t:h} updates), junk ids dropped', { skip: !URL0 }, async () => {
  const r = room('h'), A = await client(r, { guest: 'Pup3131', h: 'habcdefghijk1' }), B = await client(r, { guest: 'Pup3232', h: 'not a home' });
  assert.equal(B.welcome.players[0].h, 'habcdefghijk1'); await sleep(150); assert.equal(of(A, 'j')[0].p.h, null, 'invalid id -> null');
  B.ws.send(JSON.stringify({ t: 'h', h: 'h000000000002' })); await sleep(200); assert.deepEqual(of(A, 'h').at(-1), { t: 'h', id: B.welcome.id, h: 'h000000000002' });
  B.ws.send(JSON.stringify({ t: 'h', h: '<script>' })); await sleep(200); assert.equal(of(A, 'h').at(-1).h, null);
  A.ws.close(); B.ws.close(); await sleep(200); });

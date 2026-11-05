// Long or Short server (api/longshort.js + api/_lib/longshort.js): server-locked prices, server resolution, scoring, anti-cheat, boards, admin export.
import test from 'node:test'; import assert from 'node:assert/strict';
import { makeHandler } from '../api/longshort.js';
import { memoryKv } from '../api/_lib/kv.js';
import * as S from '../api/_lib/longshort.js';
import * as LS from '../src/longshort.js';

const K = LS.KIBBLE_MINT, SOL = 'So11111111111111111111111111111111111111112', WIF = 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', SPON = '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump';
const T0 = Date.UTC(2026, 10, 3, 1, 0, 0); // Tue 3 Nov 2026 01:00 UTC
function mk({ env = {}, schedule = [] } = {}) {
  let t = T0; const px = { [K]: 0.000003, [SOL]: 90, [WIF]: 0.16, [LS.LINEUP[3].mint]: 0.0000027, [SPON]: 0.5 }; const hits = { dex: 0, gecko: 0 }; let geckoClose = null;
  const pair = (m, p, extra = {}) => ({ baseToken: { address: m, symbol: m === K ? '$KIBBLE' : 'X', name: 'n' }, quoteToken: { symbol: 'SOL' }, priceUsd: String(p), liquidity: { usd: 1000 }, pairAddress: 'pool' + m.slice(0, 4), dexId: 'raydium', priceChange: {}, ...extra });
  const f = async (u) => { if (u.includes('dexscreener')) { hits.dex++; const ms = u.split('/').pop().split(','); return { ok: true, json: async () => [...ms.filter((m) => px[m]).map((m) => pair(m, px[m])), pair('LOOKALIKE111111111111111111111111111', 999, { liquidity: { usd: 1e9 } })] }; }
    if (u.includes('geckoterminal')) { hits.gecko++; return { ok: true, json: async () => ({ data: { attributes: { ohlcv_list: geckoClose == null ? [] : [[Math.floor((t - 3600_000) / 60000) * 60, 1, 1, 1, geckoClose, 1]] } } }) }; }
    throw new Error('unexpected fetch ' + u); };
  const kv = memoryKv(() => t), h = makeHandler({ env, kv, now: () => t, f, schedule });
  const call = (method, { q = '', body, token, ip = '1.1.1.1', headers = {} } = {}) => new Promise((done) => { const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { let j = null; try { j = JSON.parse(b); } catch {} done({ code: this.statusCode, body: j, raw: b }); } };
    h({ method, url: '/api/longshort' + q, query: Object.fromEntries(new URLSearchParams(q.replace(/^\?/, ''))), headers: { 'x-forwarded-for': ip, ...(token ? { authorization: 'Bearer ' + token } : {}), ...headers }, body: body && JSON.stringify(body) }, res); });
  return { kv, call, px, hits, tick: (ms) => { t += ms; }, now: () => t, setGecko: (v) => { geckoClose = v; } };
}
const reg = async (w, name, ip) => { const r = await w.call('POST', { body: { op: 'register', name }, ip: ip || 'ip-' + name }); assert.equal(r.code, 200, JSON.stringify(r.body)); return r.body.token; };

test('longshort api: lineup is the fixed config with $KIBBLE first; no debug window unless local debug flag (never on Vercel)', async () => {
  const w = mk(); const r = await w.call('GET', { q: '?op=lineup' });
  assert.equal(r.code, 200); assert.equal(r.body.lineup[0].mint, K); assert.deepEqual(r.body.windows, ['1h', '24h']); assert.equal(r.body.debug, false);
  assert.equal(r.body.lineup.at(-1).open, true, 'sponsored slot open (no schedule)');
  assert.equal(S.localDebug({ LS_LOCAL_DEBUG: '1' }), true);
  for (const v of [{ VERCEL: '1' }, { VERCEL_ENV: 'production' }, { VERCEL_ENV: 'preview' }, { VERCEL_URL: 'x.vercel.app' }]) assert.equal(S.localDebug({ LS_LOCAL_DEBUG: '1', ...v }), false);
  const t = await reg(w, 'Rex'); const d = await w.call('POST', { token: t, body: { op: 'call', mint: K, side: 'long', win: '20s' } });
  assert.equal(d.code, 400, 'debug window refused server-side');
});
test('longshort api: server locks the price itself; client price/time/result fields are ignored', async () => {
  const w = mk(); const t = await reg(w, 'Rex');
  const r = await w.call('POST', { token: t, body: { op: 'call', mint: SOL, side: 'long', win: '1h', price: 1, lockPrice: 1, endsAt: T0 + 1, at: 0, result: 'win', bones: 9999 } });
  assert.equal(r.code, 200, JSON.stringify(r.body)); assert.equal(r.body.call.lockPrice, 90); assert.equal(r.body.call.endsAt, T0 + 3600_000); assert.equal(r.body.call.result, undefined);
  assert.equal(r.body.player.total, 0);
});
test('longshort api: cannot resolve early; resolves at window end from the server sample; scoring + streak multiplier', async () => {
  const w = mk(); const t = await reg(w, 'Rex');
  await w.call('POST', { token: t, body: { op: 'call', mint: SOL, side: 'long', win: '1h' } }); w.tick(1100);
  await w.call('POST', { token: t, body: { op: 'call', mint: WIF, side: 'short', win: '1h' } });
  w.px[SOL] = 99; w.px[WIF] = 0.1; w.tick(1800_000);
  let me = await w.call('POST', { token: t, body: { op: 'resolve' } }); assert.equal(me.code, 200); assert.deepEqual(me.body.resolved, [], 'not before window end');
  assert.ok(me.body.player.calls.every((c) => !c.result));
  w.tick(1800_000); // SOL window ended; WIF ends 1.1s later
  me = await w.call('GET', { q: '?op=me', token: t }); const sol = me.body.player.calls.find((c) => c.mint === SOL);
  assert.equal(sol.result, 'win'); assert.equal(sol.bones, 10); assert.equal(sol.endPrice, 99); assert.equal(sol.endSrc, 'sample');
  w.tick(2000); me = await w.call('GET', { q: '?op=me', token: t }); const wif = me.body.player.calls.find((c) => c.mint === WIF);
  assert.equal(wif.result, 'win'); assert.equal(wif.bones, Math.round(10 * 1.25)); assert.equal(me.body.player.streak, 2); assert.equal(me.body.player.total, 23);
  const again = await w.call('GET', { q: '?op=me', token: t }); assert.equal(again.body.player.total, 23, 'idempotent: resolving twice never re-scores');
  // miss resets streak, push keeps it
  w.tick(3000); await w.call('POST', { token: t, body: { op: 'call', mint: SOL, side: 'short', win: '1h' } }); w.tick(1100); await w.call('POST', { token: t, body: { op: 'call', mint: K, side: 'long', win: '1h' } });
  w.px[SOL] = 120; w.tick(3600_000 + 2000); me = await w.call('GET', { q: '?op=me', token: t });
  assert.equal(me.body.player.calls.find((c) => c.mint === K).result, 'push'); assert.equal(me.body.player.calls.filter((c) => c.mint === SOL)[0].result, 'miss');
  assert.equal(me.body.player.streak, 0); assert.equal(me.body.player.best, 2);
});
test('longshort api: end price is the sample nearest AFTER window end, not the price at a later read (no waiting for a better price)', async () => {
  const w = mk(); const t = await reg(w, 'Rex'); const o = await reg(w, 'Milo');
  await w.call('POST', { token: t, body: { op: 'call', mint: SOL, side: 'long', win: '1h' } });
  w.px[SOL] = 80; w.tick(3600_000 + 10_000); await w.call('GET', { q: '?op=lineup' }); // someone else loads the page: a sample at end+10s (price 80)
  w.px[SOL] = 200; w.tick(3600_000); // Rex waits an hour for a better price
  const me = await w.call('GET', { q: '?op=me', token: t }); const c = me.body.player.calls[0];
  assert.equal(c.result, 'miss'); assert.equal(c.endPrice, 80); assert.ok(o);
});
test('longshort api: late resolve without a sample uses the GeckoTerminal 1m candle at window end, else voids after 6h', async () => {
  const w = mk(); const t = await reg(w, 'Rex'); await w.call('POST', { token: t, body: { op: 'call', mint: SOL, side: 'long', win: '1h' } });
  w.tick(3600_000 + 5 * 60_000); w.px[SOL] = 500; w.setGecko(95);
  let me = await w.call('GET', { q: '?op=me', token: t }); let c = me.body.player.calls[0];
  assert.equal(c.result, 'win'); assert.equal(c.endPrice, 95); assert.equal(c.endSrc, 'geckoterminal-1m');
  const w2 = mk(); const t2 = await reg(w2, 'Rex'); await w2.call('POST', { token: t2, body: { op: 'call', mint: SOL, side: 'long', win: '1h' } });
  w2.tick(3600_000 + 5 * 60_000); me = await w2.call('GET', { q: '?op=me', token: t2 }); assert.equal(me.body.player.calls[0].result, undefined, 'stays open, retried later');
  w2.tick(7 * 3600_000); me = await w2.call('GET', { q: '?op=me', token: t2 }); c = me.body.player.calls[0]; assert.equal(c.result, 'void'); assert.equal(me.body.player.streak, 0); assert.equal(c.bones, 0);
});
test('longshort api: one open call per coin per window; only lineup mints; sponsored slot = exact scheduled mint only', async () => {
  const w = mk({ schedule: [{ day: '2026-11-03', mint: SPON, symbol: 'SPN' }] }); const t = await reg(w, 'Rex');
  assert.equal((await w.call('POST', { token: t, body: { op: 'call', mint: K, side: 'long', win: '1h' } })).code, 200); w.tick(1100);
  const dup = await w.call('POST', { token: t, body: { op: 'call', mint: K, side: 'short', win: '1h' } }); assert.equal(dup.code, 409); w.tick(1100);
  assert.equal((await w.call('POST', { token: t, body: { op: 'call', mint: K, side: 'short', win: '24h' } })).code, 200, 'other window is fine'); w.tick(1100);
  assert.equal((await w.call('POST', { token: t, body: { op: 'call', mint: 'LOOKALIKE111111111111111111111111111', side: 'long', win: '1h' } })).code, 400); w.tick(1100);
  const sp = await w.call('POST', { token: t, body: { op: 'call', mint: SPON, side: 'long', win: '1h' } }); assert.equal(sp.code, 200); assert.equal(sp.body.call.lockPrice, 0.5, 'exact mint price, never the deeper lookalike');
  assert.equal(sp.body.call.sponsored, true);
  const lu = await w.call('GET', { q: '?op=lineup' }); assert.equal(lu.body.lineup.at(-1).mint, SPON); assert.equal(lu.body.lineup.at(-1).sponsored, true);
  w.tick(86_400_000); w.tick(1100); // next day: sponsor not scheduled -> its mint is not callable
  assert.equal((await w.call('POST', { token: t, body: { op: 'call', mint: SPON, side: 'long', win: '1h' } })).code, 400);
});
test('longshort api: rate limits, auth and name filter', async () => {
  const w = mk(); assert.equal((await w.call('POST', { body: { op: 'call', mint: K, side: 'long', win: '1h' } })).code, 401);
  assert.equal((await w.call('POST', { token: 'x'.repeat(32), body: { op: 'call', mint: K, side: 'long', win: '1h' } })).code, 401);
  for (const bad of ['', 'a', 'http://x.com', 'admin', 'Kibble', '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', 'fuck']) assert.equal((await w.call('POST', { body: { op: 'register', name: bad }, ip: 'n' + bad })).code, 400, bad);
  const t = await reg(w, 'Rex', 'same');
  assert.equal((await w.call('POST', { body: { op: 'register', name: 'Rex2' }, ip: 'same' })).code, 429, 'register gap per IP');
  const taken = await w.call('POST', { body: { op: 'register', name: 'rex' }, ip: 'other' }); assert.equal(taken.code, 409); assert.match(taken.body.suggest, /^rex\d{4}$/);
  assert.equal((await w.call('POST', { token: t, body: { op: 'call', mint: K, side: 'long', win: '1h' } })).code, 200);
  assert.equal((await w.call('POST', { token: t, body: { op: 'call', mint: SOL, side: 'long', win: '1h' } })).code, 429, '1 call / s');
  assert.equal((await w.call('POST', { token: t, body: { op: 'call', mint: SOL, side: 'sideways', win: '1h' } })).code, 400);
  assert.equal((await w.call('POST', { token: t, body: { op: 'call', mint: SOL, side: 'long', win: '5m' } })).code, 400);
  const rn = await w.call('POST', { token: t, body: { op: 'name', name: 'Rexy' } }); assert.equal(rn.body.player.name, 'Rexy');
  assert.equal((await w.call('POST', { body: { op: 'register', name: 'Rex' }, ip: 'z' })).code, 200, 'old name released');
});
test('longshort api: Zachary / Nagesy / Znagle can register; admin still blocked', async () => {
  const w = mk();
  const z = await w.call('POST', { body: { op: 'register', name: 'Zachary' }, ip: '8.8.8.8' });
  assert.equal(z.code, 200); assert.equal(z.body.player.name, 'Zachary');
  const n = await w.call('POST', { body: { op: 'register', name: 'Nagesy' }, ip: '8.8.8.9' });
  assert.equal(n.code, 200); assert.equal(n.body.player.name, 'Nagesy');
  const zn = await w.call('POST', { body: { op: 'register', name: 'Znagle' }, ip: '8.8.8.11' });
  assert.equal(zn.code, 200);
  const bad = await w.call('POST', { body: { op: 'register', name: 'admin' }, ip: '8.8.8.10' });
  assert.equal(bad.code, 400);
  const bad2 = await w.call('POST', { body: { op: 'register', name: 'Nagesy7' }, ip: '8.8.8.12' });
  assert.equal(bad2.code, 400);
});

test('longshort api: real daily / weekly boards + Hall of Fame; debug rounds never count; admin-only winners export', async () => {
  const w = mk(); const a = await reg(w, 'Rex'), b = await reg(w, 'Milo'), c = await reg(w, 'Biscuit');
  for (const tk of [a, b, c]) { await w.call('POST', { token: tk, body: { op: 'call', mint: SOL, side: tk === c ? 'short' : 'long', win: '1h' } }); }
  w.tick(1100); await w.call('POST', { token: a, body: { op: 'call', mint: WIF, side: 'long', win: '1h' } });
  w.px[SOL] = 95; w.px[WIF] = 0.2; w.tick(3600_000 + 2000);
  const day = await w.call('GET', { q: '?op=board&period=day', token: b }); // lazy resolve on read
  assert.equal(day.code, 200); assert.deepEqual(day.body.rows.map((r) => [r.name, r.score]), [['Rex', 23], ['Milo', 10]]); assert.equal(day.body.me.rank, 2);
  assert.ok(!JSON.stringify(day.body).includes('pid'), 'no player ids on the public board');
  const hof = await w.call('GET', { q: '?op=board&period=hof' }); assert.deepEqual(hof.body.rows.map((r) => [r.name, r.score]), [['Rex', 2], ['Milo', 1]]);
  const wk = await w.call('GET', { q: '?op=board&period=week' }); assert.equal(wk.body.rows[0].name, 'Rex');
  assert.equal((await w.call('GET', { q: '?op=winners' })).code, 401);
  assert.equal((await w.call('GET', { q: '?op=winners', headers: { 'x-admin-token': 'nope' } })).code, 401);
  const w2 = mk({ env: { ADMIN_TOKEN: 'secret-admin-token' } }); const a2 = await reg(w2, 'Rex'); await w2.call('POST', { token: a2, body: { op: 'call', mint: SOL, side: 'long', win: '1h' } });
  w2.px[SOL] = 95; w2.tick(3600_000 + 2000);
  assert.equal((await w2.call('GET', { q: '?op=resolve-all' })).code, 401);
  const ra = await w2.call('GET', { q: '?op=resolve-all', headers: { 'x-admin-token': 'secret-admin-token' } }); assert.equal(ra.body.resolved, 1);
  const ex = await w2.call('GET', { q: '?op=winners&format=csv', headers: { 'x-admin-token': 'secret-admin-token' } });
  assert.equal(ex.code, 200); assert.match(ex.raw, /^rank,player_id,name,bones,wins,calls,hit_rate,best_streak\n1,[0-9a-f]{16},"Rex",10,1,1,100,1\n$/);
  const j = await w2.call('GET', { q: '?op=winners', headers: { 'x-admin-token': 'secret-admin-token' } }); assert.match(j.body.note, /paid by hand/);
  const w3 = mk({ env: { CRON_SECRET: 'cron-s' } }); assert.equal((await w3.call('GET', { q: '?op=resolve-all', headers: { authorization: 'Bearer cron-s' } })).code, 200);
  // local debug: 20s window works but never reaches a board
  const w4 = mk({ env: { LS_LOCAL_DEBUG: '1' } }); const d = await reg(w4, 'Rex'); assert.equal((await w4.call('POST', { token: d, body: { op: 'call', mint: SOL, side: 'long', win: '20s' } })).code, 200);
  w4.px[SOL] = 99; w4.tick(21_000); const me = await w4.call('GET', { q: '?op=me', token: d }); assert.equal(me.body.player.calls[0].result, 'win');
  assert.deepEqual((await w4.call('GET', { q: '?op=board&period=day' })).body.rows, []);
});
test('longshort api: keys live under the ls: prefix only', async () => {
  const w = mk(); const t = await reg(w, 'Rex'); await w.call('POST', { token: t, body: { op: 'call', mint: SOL, side: 'long', win: '1h' } });
  assert.ok([...w.kv.map.keys()].length > 3); for (const k of w.kv.map.keys()) assert.match(k, /^ls:v1:/);
});

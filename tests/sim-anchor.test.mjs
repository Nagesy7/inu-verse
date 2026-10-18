// PAB-001 fix: /api/sim-log chain-head anchor (hash verification, forks, rate limits, size caps, sim-only keys).
import test from 'node:test'; import assert from 'node:assert/strict';
const { anchorPost, anchorGet, memoryStore, LIMITS, K, tokenHash } = await import('../src/sim/anchor.js'); const { hashOf, GENESIS } = await import('../src/sim/ledger.js');
const { default: handler } = await import('../api/sim-log.js');
const pid = 'p0123456789abcdef', token = 'ab'.repeat(24), acct = 'player:' + pid;
const chain = (from, specs) => { let { seq, head, ts } = from; return specs.map((x) => { const e = { seq, ts: (ts += 200000), actor: acct, group: 'sim', action: 'wallet.join', target: acct, value: { amount: 0, unit: 'PAWMARK' }, data: null, prev: head, ...x }; e.hash = hashOf(e); seq++; head = e.hash; return e; }); };
const rig = () => { let t = 1.8e12; const kv = memoryStore(() => t); return { kv, tick: (ms = 3000) => { t += ms; }, post: (entries, o = {}) => anchorPost(kv, { pid, token, entries, ...o.body }, { now: t + 1e7, ipHash: 'i' + t, size: o.size || 100 }) }; };
const join = () => chain({ seq: 0, head: GENESIS, ts: 0 }, [{}, { actor: 'sim:issuer', action: 'pm.wage', value: { amount: 10, unit: 'PAWMARK' } }]);
test('honest chain anchors; checkpoint moves forward and keeps recent heads', async () => { const R = rig(), c = join(), r = await R.post(c); assert.equal(r.status, 200); assert.equal(r.json.anchor.seq, 2); assert.equal(r.json.anchor.head, c[1].hash); assert.equal(r.json.anchor.balance, 10);
  R.tick(); const more = chain({ seq: 2, head: c[1].hash, ts: c[1].ts }, [{ actor: 'sim:pd-pip', action: 'police.cite', target: acct, value: { amount: 0, unit: 'PAWMARK' }, data: { offense: 'jaywalk', tx: 3, ty: 21, fine: 0 } }]); const r2 = await R.post(more); assert.equal(r2.status, 200, JSON.stringify(r2.json)); assert.equal(r2.json.anchor.balance, 10); assert.equal(r2.json.anchor.police.cites, 1); assert.equal(r2.json.anchor.heads.length, 2);
  assert.equal((await anchorGet(R.kv, pid)).json.anchor.seq, 3); assert.equal((await anchorGet(R.kv, 'nope')).status, 400); assert.ok(!('tokenHash' in r2.json.anchor)); });
test('edits, forks, replays and truncation are refused with the server checkpoint', async () => { const R = rig(), c = join(); await R.post(c); const cp = { seq: 2, head: c[1].hash, ts: c[1].ts };
  const ed = chain(cp, [{}]); ed[0].data = { why: 'changed' }; R.tick(); let r = await R.post(ed); assert.equal(r.status, 409); assert.equal(r.json.anchor.seq, 2);
  R.tick(); r = await R.post(chain({ ...cp, head: 'f'.repeat(64) }, [{}])); assert.equal(r.status, 409);
  R.tick(); r = await R.post(c); assert.equal(r.status, 409, 'replaying anchored entries');
  R.tick(); r = await R.post(chain({ seq: 1, head: c[0].hash, ts: c[0].ts }, [{}])); assert.equal(r.status, 409, 'a shorter/rewritten history');
  R.tick(); r = await R.post(chain({ ...cp, ts: cp.ts - 1e6 }, [{}]).map((e) => { const x = { ...e, ts: cp.ts - 5 }; x.hash = hashOf(x); return x; })); assert.equal(r.status, 409, 'timestamps cannot go backwards'); });
test('rules re-checked server-side: Pawmark unit, parties, actions, wage quota, opt-in, balance', async () => { const R = rig(), c = join(); await R.post(c); const cp = { seq: 2, head: c[1].hash, ts: c[1].ts };
  const bad = [{ value: { amount: 0, unit: 'BONES' } }, { action: 'pm.issue', actor: 'sim:issuer', value: { amount: 5, unit: 'PAWMARK' } }, { action: 'pm.pay', target: 'sim:x', value: { amount: 1, unit: 'PAWMARK' } }, { action: 'pm.bribe', target: 'sim:x', value: { amount: 1, unit: 'PAWMARK' } },
    { actor: 'sim:issuer', action: 'pm.wage', value: { amount: 50, unit: 'PAWMARK' } }, { actor: acct, action: 'pm.fine', target: 'sim:sink', value: { amount: 15, unit: 'PAWMARK' } }, { data: { bones: 5 } }, { data: { wallet: 'x' } }, { actor: 'sim:issuer', action: 'pm.wage', target: 'player:pother', value: { amount: 8, unit: 'PAWMARK' } }];
  for (const b of bad) { R.tick(); const r = await R.post(chain(cp, [b])); assert.equal(r.status, 422, JSON.stringify(b)); }
  const R2 = rig(); const w = chain({ seq: 0, head: GENESIS, ts: 0 }, [{ actor: 'sim:issuer', action: 'pm.wage', value: { amount: 10, unit: 'PAWMARK' } }]); assert.equal((await R2.post(w)).status, 422, 'no wages before joining'); });
test('owner token, rate limits and size caps', async () => { const R = rig(), c = join(); await R.post(c); const cp = { seq: 2, head: c[1].hash, ts: c[1].ts };
  R.tick(); assert.equal((await anchorPost(R.kv, { pid, token: 'cd'.repeat(24), entries: chain(cp, [{}]) }, { now: 2e12, ipHash: 'z' })).status, 403);
  R.tick(); assert.equal((await R.post(chain(cp, [{}]))).status, 200); assert.equal((await anchorPost(R.kv, { pid, token, entries: chain(cp, [{}]) }, { now: 2e12, ipHash: 'other' })).status, 429, 'per-wallet rate limit');
  const R3 = rig(); await anchorPost(R3.kv, { pid: 'p1111111111111111', token, entries: join() }, { now: 2e12, ipHash: 'same' }); assert.equal((await anchorPost(R3.kv, { pid: 'p2222222222222222', token, entries: join() }, { now: 2e12, ipHash: 'same' })).status, 429, 'per-IP rate limit');
  R.tick(); assert.equal((await R.post(chain(cp, Array(LIMITS.maxEntries + 1).fill({})))).status, 400); assert.equal((await R.post([{}], { size: LIMITS.maxBody + 1 })).status, 413);
  R.tick(); assert.equal((await R.post([])).status, 400); assert.equal((await anchorPost(R.kv, { pid: '4VE9sy4fEMJdZ6i7MkYPbnqDJd2oqzJQmg44WJ3opump', token, entries: [{}] }, {})).status, 400); });
test('the store only ever holds sim:* keys, no raw IPs, no token, no Bones/$KIBBLE/score/prize fields', async () => { const R = rig(); await R.post(join());
  for (const [k, v] of R.kv.map) { assert.ok(k.startsWith('sim:'), k); assert.ok(!v.v.includes(token)); assert.ok(!/"(bones|kibble|score|scores|prize|payout|pools?|wallet|inventory)"\s*:/i.test(v.v), v.v); }
  assert.equal(JSON.parse(await R.kv.get(K.anchor(pid))).tokenHash, tokenHash(token)); });
test('api/sim-log: GET/POST through the handler, 405 otherwise, 503 without a store', async () => { const kv = memoryStore(), mk = (method, body, url = '/api/sim-log?pid=' + pid) => ({ method, url, body, headers: { 'x-forwarded-for': '1.2.3.4' } });
  const res = () => ({ headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b; } });
  let r = res(); await handler(mk('POST', JSON.stringify({ pid, token, entries: join() })), r, kv); assert.equal(r.statusCode, 200); assert.equal(JSON.parse(r.body).anchor.balance, 10);
  r = res(); await handler(mk('GET'), r, kv); assert.equal(JSON.parse(r.body).anchor.seq, 2); r = res(); await handler(mk('DELETE'), r, kv); assert.equal(r.statusCode, 405);
  r = res(); await handler(mk('POST', '{bad'), r, kv); assert.equal(r.statusCode, 400); r = res(); await handler(mk('POST', 'x'.repeat(LIMITS.maxBody + 5)), r, kv); assert.equal(r.statusCode, 413);
  const env = { ...process.env }; for (const k of ['UPSTASH_REDIS_REST_URL', 'KV_REST_API_URL']) delete process.env[k]; r = res(); await handler(mk('GET'), r); Object.assign(process.env, env); assert.equal(r.statusCode, 503);
  assert.ok(![...kv.map.keys()].some((k) => k.includes('1.2.3.4')) && ![...kv.map.values()].some((v) => v.v.includes('1.2.3.4')), 'no raw IP stored'); });

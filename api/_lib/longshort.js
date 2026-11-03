// Server side of Long or Short (api/longshort.js). A FREE skill contest scored in Bones: no stakes, no wagers, no payouts tied to calls.
// The server is the only source of prices: it locks the start price itself (DexScreener, read-only) and resolves the end price
// from its own price samples taken around the window end (GeckoTerminal 1-minute candles as a fallback). Clients only send
// { mint, side, win }; any price, time or result fields in a request are ignored.
//
// Storage: Upstash Redis REST via api/_lib/kv.js (same UPSTASH_* / KV_REST_API_* env as the rest of the repo), every key under
// LS_PREFIX (default "ls:v1:"; tests use memoryKv, local runs without Upstash use memory too):
//   p:<pid>              player { pid, n, at, streak, best, wins, misses, pushes, voids, total, calls:[open + last 60 resolved] }
//   pn:<pid>             display name (joined into boards)
//   n:<lower name>       pid that owns the name (unique-ish names)
//   due                  { <pid>: earliest open endsAt } so a cron / lazy reads can resolve without the player coming back
//   lb:d:<YYYY-MM-DD>    { <pid>: { b, w, c } } daily board (by window END time, UTC), TTL 40 d
//   lb:w:<monday>        { <pid>: { b, w, c } } weekly board (Monday 00:00 UTC), TTL 400 d
//   lb:hof               { <pid>: best streak }
//   px:cache             last DexScreener read { t, q:{ <mint>: quote } }
//   ph:<mint>:<minute>   price samples [[t, price], ...] taken in that UTC minute, TTL 9 d
//   rl:*                 rate-limit counters, lock:* short locks
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import * as LS from '../../src/longshort.js';
import { feedName, isTestName } from '../../src/feed.js';

export const RULES = Object.freeze({ LOCK_MAX_AGE_MS: 5_000, READ_MAX_AGE_MS: 15_000, END_TOL_MS: 60_000, VOID_AFTER_MS: 6 * 3600_000, KEEP_RESOLVED: 60,
  CALL_GAP_S: 1, CALLS_PER_H: 40, CALLS_PER_H_IP: 120, REG_GAP_S: 10, REG_PER_H_IP: 5, RENAMES_PER_DAY: 3, RESOLVE_GAP_S: 2, LAZY_PLAYERS: 10, CRON_PLAYERS: 200 });
const RESERVED = /^(admin|mod|moderator|official|kibble|kibbleinu|inu ?verse|inuverse|sponsor|support|team|system|zachary|nagesy7?)$/i;
export const sha = (s) => createHash('sha256').update(String(s)).digest('hex');
export const pidOf = (token) => sha('ls|' + token).slice(0, 16);
const TOKEN_RE = /^[A-Za-z0-9_-]{32}$/, PID_RE = /^[0-9a-f]{16}$/;

export function prefixed(kv, P = 'ls:v1:') {
  return { kind: kv.kind, get: (k) => kv.get(P + k), set: (k, v, ex) => kv.set(P + k, v, ex), setNX: (k, v, ex) => kv.setNX(P + k, v, ex), del: (k) => kv.del(P + k),
    mget: (ks) => kv.mget(ks.map((k) => P + k)), scan: (c, m) => kv.scan(c, P + m) }; }
const getJ = async (s, k, d) => { try { return JSON.parse((await s.get(k)) || 'null') ?? d; } catch { return d; } };
const setJ = (s, k, v, ex) => s.set(k, JSON.stringify(v), ex);
async function locked(s, name, fn, sleep = (ms) => new Promise((r) => setTimeout(r, ms))) {
  for (let i = 0; i < 25; i++) { if (await s.setNX('lock:' + name, '1', 5)) { try { return await fn(); } finally { try { await s.del('lock:' + name); } catch {} } } await sleep(40); }
  throw Object.assign(new Error('busy, try again'), { status: 503 }); }
async function under(s, key, max, win) { const n = Number(await s.get(key)) || 0; if (n >= max) return false; await s.set(key, String(n + 1), win); return true; }
const err = (status, error, extra = {}) => Object.assign(new Error(error), { status, extra });

/** Local-only debug: 20s windows + optional server-side mock prices. Never on Vercel (prod, preview or vercel dev). */
export const localDebug = (env) => env.LS_LOCAL_DEBUG === '1' && !env.VERCEL && !env.VERCEL_ENV && !env.VERCEL_URL;
export const windowsFor = (env) => [...Object.keys(LS.WINDOWS), ...(localDebug(env) ? [LS.DEBUG_WINDOW.id] : [])];

export function lineupOn(day, schedule) { return LS.lineupFor(LS.sponsorFor(day, schedule)); }
export const callableMints = (day, schedule) => lineupOn(day, schedule).filter((c) => c.mint && !c.open).map((c) => c.mint);

// ---- prices ----
// mock (local debug only): deterministic wobble so short debug rounds resolve both ways
export function mockQuotes(mints, t, real = {}) { const out = {}; for (const m of mints) { const h = parseInt(sha(m).slice(0, 6), 16), r = real[m], base = r?.price || 0.5 + (h % 1000) / 10;
  out[m] = { ...(r || {}), mint: m, price: +(base * (1 + 0.02 * Math.sin(t / 9000 + h))).toPrecision(8), symbol: r?.symbol || '', name: r?.name || '', dex: 'mock', pair: 'mock', change1h: r?.change1h ?? null, change24h: r?.change24h ?? null }; } return out; }
export function makePrices({ store, env = {}, f = fetch, now = () => Date.now() }) {
  const mock = localDebug(env) && env.LS_LOCAL_MOCK === '1';
  let real = null; // mock mode: wobble around a real reading taken once (so local screenshots look realistic)
  async function fetchQuotes(mints) { if (mock) { if (!real) { try { real = await LS.fetchPrices(mints, f); } catch { real = {}; } } return mockQuotes(mints, now(), real); } return LS.fetchPrices(mints, f); }
  async function sample(q, t) { const min = Math.floor(t / 60000); for (const [m, v] of Object.entries(q)) { if (!v) continue; const k = `ph:${m}:${min}`;
    const a = await getJ(store, k, []); if (a.length < 8) { a.push([t, v.price]); await setJ(store, k, a, 9 * 86400); } } }
  /** Quotes for these mints no older than maxAge. Every fresh read is also stored as a price sample. */
  async function quotes(mints, maxAge = RULES.READ_MAX_AGE_MS) {
    const c = await getJ(store, 'px:cache', null), t = now();
    if (c && t - c.t <= maxAge && mints.every((m) => m in c.q)) return { t: c.t, q: c.q };
    const q = await fetchQuotes(mints); const merged = { ...(c && t - c.t < 600_000 ? c.q : {}), ...q };
    await setJ(store, 'px:cache', { t, q: merged }, 3600); await sample(q, t); return { t, q: merged };
  }
  /** End price for a call: first own sample in [endsAt, endsAt + 60s]; else the GeckoTerminal 1-min candle covering endsAt; else null (retry) / 'void' after 6 h. */
  async function endPrice(call) {
    const t = now(), m0 = Math.floor(call.endsAt / 60000), keys = [m0, m0 + 1].map((m) => `ph:${call.mint}:${m}`);
    const rows = (await store.mget(keys)).flatMap((r) => { try { return JSON.parse(r || '[]'); } catch { return []; } });
    const hit = rows.filter(([ts]) => ts >= call.endsAt && ts <= call.endsAt + RULES.END_TOL_MS).sort((a, b) => a[0] - b[0])[0];
    if (hit) return { price: hit[1], src: 'sample', at: hit[0] };
    if (t <= call.endsAt + RULES.END_TOL_MS) { const q = await quotes([call.mint], 0); const p = q.q[call.mint]; return p ? { price: p.price, src: 'sample', at: q.t } : null; }
    if (!mock && call.pair) { try { const g = await geckoClose(call.pair, call.endsAt, f); if (g) return { price: g, src: 'geckoterminal-1m' }; } catch {} }
    return t > call.endsAt + RULES.VOID_AFTER_MS ? { price: 'void', src: 'none' } : null;
  }
  return { quotes, endPrice, mock };
}
export async function geckoClose(pool, endsAt, f = fetch) {
  const minStart = Math.floor(endsAt / 60000) * 60, u = `https://api.geckoterminal.com/api/v2/networks/solana/pools/${encodeURIComponent(pool)}/ohlcv/minute?aggregate=1&limit=5&currency=usd&token=base&before_timestamp=${minStart + 60}`;
  const r = await f(u, { headers: { accept: 'application/json' } }); if (!r.ok) return null; const j = await r.json();
  const c = (j?.data?.attributes?.ohlcv_list || []).filter((x) => Number(x[0]) <= minStart).sort((a, b) => b[0] - a[0])[0];
  return c && Number(c[4]) > 0 ? Number(c[4]) : null; }

// ---- players ----
export function cleanDisplayName(raw) { const n = feedName(typeof raw === 'string' ? raw.slice(0, 40) : ''); if (!n) return null; const t = n.slice(0, 18).trim();
  if (t.length < 2 || RESERVED.test(t.replace(/[ _.-]+/g, ' ').trim())) return null; return t; }
export async function auth(store, req) { const tok = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, ''); if (!TOKEN_RE.test(tok)) return null;
  const pid = pidOf(tok), p = await getJ(store, 'p:' + pid, null); return p ? p : null; }
async function claimName(store, name, pid) { const k = 'n:' + name.toLowerCase(); if (await store.setNX(k, pid, 400 * 86400)) return true; return (await store.get(k)) === pid; }
export async function register(store, { name, ip, now }) {
  const n = cleanDisplayName(name); if (!n) throw err(400, 'Pick another name (2-18 letters/numbers, no links, addresses or rude words).');
  if (!(await store.setNX('rl:reg:' + ip, '1', RULES.REG_GAP_S))) throw err(429, 'slow down', { retryAfter: RULES.REG_GAP_S });
  if (!(await under(store, 'rl:regh:' + ip, RULES.REG_PER_H_IP, 3600))) throw err(429, 'too many new players from here, try later');
  const token = randomBytes(24).toString('base64url'), pid = pidOf(token);
  if (!(await claimName(store, n, pid))) throw err(409, 'That name is taken.', { suggest: n.slice(0, 13) + String(Math.floor(1000 + Math.random() * 9000)) });
  const p = { pid, n, at: now, streak: 0, best: 0, wins: 0, misses: 0, pushes: 0, voids: 0, total: 0, calls: [] };
  await setJ(store, 'p:' + pid, p); await store.set('pn:' + pid, n); return { token, player: pub(p) }; }
export async function rename(store, p, name) {
  const n = cleanDisplayName(name); if (!n) throw err(400, 'Pick another name (2-18 letters/numbers, no links, addresses or rude words).');
  if (n.toLowerCase() === p.n.toLowerCase()) return p;
  if (!(await under(store, 'rl:ren:' + p.pid, RULES.RENAMES_PER_DAY, 86400))) throw err(429, 'name changes are limited to 3 a day');
  if (!(await claimName(store, n, p.pid))) throw err(409, 'That name is taken.', { suggest: n.slice(0, 13) + String(Math.floor(1000 + Math.random() * 9000)) });
  return locked(store, 'p:' + p.pid, async () => { const cur = await getJ(store, 'p:' + p.pid, p); await store.del('n:' + cur.n.toLowerCase()); cur.n = n;
    await setJ(store, 'p:' + p.pid, cur); await store.set('pn:' + p.pid, n); return cur; }); }
export const pub = (p) => ({ pid: p.pid, name: p.n, streak: p.streak, best: p.best, mult: LS.multiplier(p.streak), wins: p.wins, misses: p.misses, pushes: p.pushes, voids: p.voids || 0, total: p.total,
  hit: p.wins + p.misses ? Math.round((100 * p.wins) / (p.wins + p.misses)) : null,
  calls: (p.calls || []).map(({ id, mint, symbol, sponsored, side, win, lockPrice, at, endsAt, debug, result, endPrice, move, bones, mult, resolvedAt, endSrc }) => ({ id, mint, symbol, sponsored, side, win, lockPrice, at, endsAt, debug, result, endPrice, move, bones, mult, resolvedAt, endSrc })) });

// ---- calls ----
export async function createCall(store, prices, p, body, { env, now, ip, schedule }) {
  const t = now(), day = LS.dayKey(t), mint = typeof body?.mint === 'string' ? body.mint : '', side = body?.side, win = body?.win;
  if (!LS.SIDES.includes(side)) throw err(400, 'side must be long or short');
  if (!windowsFor(env).includes(win)) throw err(400, 'window must be 1h or 24h');
  const coin = lineupOn(day, schedule).find((c) => c.mint === mint && !c.open); // fixed lineup + today's exact sponsored mint only
  if (!coin) throw err(400, 'That coin is not in today\'s lineup.');
  if (!(await store.setNX('rl:call:' + p.pid, '1', RULES.CALL_GAP_S))) throw err(429, 'slow down', { retryAfter: RULES.CALL_GAP_S });
  if (!(await under(store, 'rl:callh:' + p.pid, RULES.CALLS_PER_H, 3600)) || !(await under(store, 'rl:callip:' + ip, RULES.CALLS_PER_H_IP, 3600))) throw err(429, 'call limit reached for this hour');
  const q = await prices.quotes(callableMints(day, schedule), RULES.LOCK_MAX_AGE_MS), quote = q.q[mint];
  if (!quote || !(quote.price > 0)) throw err(503, 'No live price for that coin right now, try again shortly.');
  return locked(store, 'p:' + p.pid, async () => {
    const cur = await getJ(store, 'p:' + p.pid, p), st = { calls: cur.calls, streak: cur.streak, bestStreak: cur.best };
    let c; try { c = LS.makeCall(st, { coin: { ...coin, symbol: (coin.symbol || quote.symbol || '').replace('$', '') }, side, win, price: quote.price, now: t, debug: localDebug(env) }); }
    catch (e) { throw err(409, /already/.test(e.message) ? 'You already have an open call on that coin for this window.' : e.message); }
    c.id = randomBytes(6).toString('hex'); c.lockAt = q.t; c.pair = quote.pair || ''; c.dex = quote.dex || '';
    cur.calls = st.calls; await setJ(store, 'p:' + p.pid, cur); await markDue(store, cur);
    return c; }); }
async function markDue(store, p) { const open = (p.calls || []).filter((c) => !c.result); await locked(store, 'due', async () => { const d = await getJ(store, 'due', {});
  if (open.length) d[p.pid] = Math.min(...open.map((c) => c.endsAt)); else delete d[p.pid]; await setJ(store, 'due', d); }); }

/** Resolve every due call of one player. Idempotent: resolved calls are never touched again. */
export async function resolvePlayer(store, prices, pid, now) {
  if (!PID_RE.test(pid)) return null;
  return locked(store, 'p:' + pid, async () => {
    const p = await getJ(store, 'p:' + pid, null); if (!p) { await locked(store, 'due', async () => { const d = await getJ(store, 'due', {}); delete d[pid]; await setJ(store, 'due', d); }); return null; }
    const st = { calls: p.calls, streak: p.streak, bestStreak: p.best }, done = [];
    for (const c of LS.due(st, now())) { const e = await prices.endPrice(c); if (!e) continue; LS.resolveCall(st, c, e.price, now()); if (c.result) { c.endSrc = e.src; done.push(c); } }
    if (!done.length) return { player: p, done };
    p.streak = st.streak; p.best = st.bestStreak;
    for (const c of done) { p.total += c.bones || 0; if (c.result === 'win') p.wins++; else if (c.result === 'miss') p.misses++; else if (c.result === 'push') p.pushes++; else p.voids = (p.voids || 0) + 1; }
    const open = p.calls.filter((c) => !c.result), res = p.calls.filter((c) => c.result).sort((a, b) => b.endsAt - a.endsAt).slice(0, RULES.KEEP_RESOLVED);
    p.calls = [...open, ...res]; await setJ(store, 'p:' + pid, p); await markDue(store, p); await addToBoards(store, p, done);
    return { player: p, done }; }); }
async function addToBoards(store, p, done) {
  const scored = done.filter((c) => (c.result === 'win' || c.result === 'miss') && !c.debug); // debug rounds never reach a board
  const by = {}; for (const c of scored) for (const k of ['d:' + LS.dayKey(c.endsAt), 'w:' + LS.weekKey(c.endsAt)]) { const e = (by[k] ||= { b: 0, w: 0, c: 0 }); e.b += c.bones || 0; e.w += c.result === 'win' ? 1 : 0; e.c += 1; }
  for (const [k, add] of Object.entries(by)) await locked(store, 'lb:' + k, async () => { const m = await getJ(store, 'lb:' + k, {}); const e = m[p.pid] || { b: 0, w: 0, c: 0 };
    m[p.pid] = { b: e.b + add.b, w: e.w + add.w, c: e.c + add.c }; await setJ(store, 'lb:' + k, m, k.startsWith('d:') ? 40 * 86400 : 400 * 86400); });
  if (p.best > 0 && scored.length) await locked(store, 'lb:hof', async () => { const m = await getJ(store, 'lb:hof', {}); if ((m[p.pid] || 0) < p.best) { m[p.pid] = p.best; await setJ(store, 'lb:hof', m); } }); }
/** Resolve up to `max` players whose earliest open call has ended (lazy reads use a small max, the cron a big one). */
export async function resolveDue(store, prices, now, max) { const d = await getJ(store, 'due', {}), t = now();
  const pids = Object.entries(d).filter(([, e]) => e <= t).sort((a, b) => a[1] - b[1]).slice(0, max).map(([k]) => k); let n = 0;
  for (const pid of pids) { try { const r = await resolvePlayer(store, prices, pid, now); n += r?.done?.length || 0; } catch {} } return { players: pids.length, resolved: n }; }

// ---- boards ----
export async function board(store, period, { now, me = null, limit = 50, week = null } = {}) {
  const t = now(), key = period === 'hof' ? 'lb:hof' : period === 'week' ? 'lb:w:' + (week || LS.weekKey(t)) : 'lb:d:' + LS.dayKey(t);
  const m = await getJ(store, key, {}), pids = Object.keys(m).filter((k) => PID_RE.test(k));
  const names = pids.length ? await store.mget(pids.map((k) => 'pn:' + k)) : [];
  const rows = pids.map((pid, i) => { const v = m[pid]; const r = typeof v === 'number' ? { score: v } : { score: v.b, wins: v.w, calls: v.c }; return { pid, name: names[i] || '?', ...r }; })
    .filter((r) => r.name !== '?' && !isTestName(r.name) && r.score > 0).sort((a, b) => b.score - a.score || (b.wins || 0) - (a.wins || 0) || (a.calls || 0) - (b.calls || 0) || a.name.localeCompare(b.name)); // same tie-break as the winners export
  rows.forEach((r, i) => { r.rank = i + 1; });
  const out = rows.slice(0, limit).map(({ pid, ...r }) => ({ ...r, me: pid === me || undefined }));
  const mine = me ? rows.find((r) => r.pid === me) : null;
  return { period, key: key.replace(/^lb:/, ''), rows: out, me: mine ? { rank: mine.rank, score: mine.score } : null, players: rows.length }; }
export async function winners(store, week, top = 10) {
  const m = await getJ(store, 'lb:w:' + week, {}), hof = await getJ(store, 'lb:hof', {}), pids = Object.keys(m).filter((k) => PID_RE.test(k));
  const names = pids.length ? await store.mget(pids.map((k) => 'pn:' + k)) : [];
  return pids.map((pid, i) => ({ pid, name: names[i] || '?', bones: m[pid].b, wins: m[pid].w, calls: m[pid].c, hitRate: m[pid].c ? Math.round((100 * m[pid].w) / m[pid].c) : 0, bestStreak: hof[pid] || 0 }))
    .filter((r) => r.name !== '?' && !isTestName(r.name) && r.bones > 0).sort((a, b) => b.bones - a.bones || b.wins - a.wins || a.calls - b.calls || a.name.localeCompare(b.name)).slice(0, top).map((r, i) => ({ rank: i + 1, ...r })); }
export function isAdmin(req, env) { const t = String(req.headers?.['x-admin-token'] || ''); const A = env.ADMIN_TOKEN || '';
  return !!(A && t && t.length === A.length && timingSafeEqual(Buffer.from(t), Buffer.from(A))); }
export function isCron(req, env) { const C = env.CRON_SECRET || '', a = String(req.headers?.authorization || ''); return !!(C && a.length === C.length + 7 && timingSafeEqual(Buffer.from(a), Buffer.from('Bearer ' + C))); }

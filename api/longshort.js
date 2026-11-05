// /api/longshort: Long or Short, a FREE daily coin-calling skill contest scored in Bones (in-game points, no cash value).
// No stakes, no wagers, no leverage, no payouts tied to calls. Prize review for top weekly callers is done by hand (op=winners).
// Logic + storage layout: api/_lib/longshort.js. Scoring rules: src/longshort.js.
//
// GET  ?op=lineup                      -> { day, lineup, windows, prices, updatedAt, debug }   (also lazily resolves a few due players)
// GET  ?op=me            [Bearer token] -> { player }   resolves the caller's own due calls first
// GET  ?op=board&period=day|week|hof    -> { rows:[{ rank, name, score, wins?, calls? }], me? }  (optional Bearer token for "me")
// POST { op:"register", name }           -> { token, player }   anonymous player id; the token is the only credential (keep it secret)
// POST { op:"name", name }     [Bearer]  -> { player }          rename (3 / day, unique-ish, filtered)
// POST { op:"call", mint, side, win } [Bearer] -> { call, player }   server locks the price itself; anything else in the body is ignored
// POST { op:"resolve" }        [Bearer]  -> { player, resolved } idempotent: resolves only calls whose window has ended
// GET  ?op=resolve-all  [x-admin-token or Authorization: Bearer CRON_SECRET] -> { players, resolved }   (vercel.json cron every minute; Authorization: Bearer CRON_SECRET)
// GET  ?op=winners&week=YYYY-MM-DD(Monday)&top=10&format=csv  [x-admin-token] -> weekly top callers for HAND-REVIEWED Kennel Chest prizes
import { createHash } from 'node:crypto';
import { upstashKv, memoryKv } from './_lib/kv.js';
import * as S from './_lib/longshort.js';
import * as LS from '../src/longshort.js';

let MEM = null;
const ipOf = (req) => String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || '?').split(',')[0].trim();
const timed = (f, ms = 3500) => (u, o = {}) => f(u, { ...o, signal: AbortSignal.timeout(ms) });
export function makeHandler({ env = process.env, kv, now = () => Date.now(), f = fetch, schedule = LS.SPONSOR_SCHEDULE } = {}) {
  const raw = kv !== undefined ? kv : (upstashKv(env) || (MEM ||= memoryKv()));
  const store = raw && S.prefixed(raw, env.LS_PREFIX || 'ls:v1:');
  const prices = store && S.makePrices({ store, env, f: timed(f), now });
  const salt = env.LS_IP_SALT || env.HOME_IP_SALT || 'inu-verse-longshort';
  return async function handler(req, res) {
    res.setHeader('access-control-allow-origin', '*'); res.setHeader('access-control-allow-headers', 'content-type,authorization'); res.setHeader('content-type', 'application/json');
    const send = (code, o, cache = 'no-store') => { res.statusCode = code; res.setHeader('cache-control', cache); res.end(JSON.stringify(cache === 'no-store' && o && typeof o === 'object' && !Array.isArray(o) ? { ...o, serverNow: now() } : o)); }; // serverNow: lets the page count down on the server clock
    if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
    if (!store) return send(503, { error: 'storage not configured' });
    try {
      const url = new URL(req.url || '/', 'http://x'), qp = (k) => req.query?.[k] ?? url.searchParams.get(k), t = now(), day = LS.dayKey(t);
      const ip = createHash('sha256').update(salt + '|ls|' + ipOf(req)).digest('hex').slice(0, 24);
      if (req.method === 'GET') {
        const op = qp('op') || 'lineup';
        if (op === 'lineup') {
          const line = S.lineupOn(day, schedule), mints = S.callableMints(day, schedule); let q = { t: null, q: {} }, priceError = null;
          try { q = await prices.quotes(mints); } catch (e) { priceError = 'prices unavailable'; }
          try { await S.resolveDue(store, prices, now, S.RULES.LAZY_PLAYERS); } catch {}
          return send(200, { day, debug: S.localDebug(env), mock: prices.mock || undefined, windows: S.windowsFor(env), updatedAt: q.t, priceError,
            lineup: line.map((c) => ({ id: c.id, mint: c.mint, symbol: c.symbol || q.q[c.mint]?.symbol?.replace('$', '') || null, name: c.name || q.q[c.mint]?.name || null, color: c.color, always: !!c.always, sponsored: !!c.sponsored, open: !!c.open,
              quote: c.mint && q.q[c.mint] ? { price: q.q[c.mint].price, change1h: q.q[c.mint].change1h, change24h: q.q[c.mint].change24h, dex: q.q[c.mint].dex } : null })),
            rules: { base: LS.BASE_BONES, step: 0.25, maxMult: LS.MAX_MULT, sponsorPriceSol: LS.SPONSOR_PRICE_SOL, sponsorChest: LS.SPONSOR_CHEST } }, 'public, max-age=5, s-maxage=10');
        }
        if (op === 'me') { const p = await S.auth(store, req); if (!p) return send(401, { error: 'unknown player' });
          const r = await S.resolvePlayer(store, prices, p.pid, now); return send(200, { player: S.pub(r?.player || p), resolved: (r?.done || []).map((c) => c.id) }); }
        if (op === 'board') { const period = ['day', 'week', 'hof'].includes(qp('period')) ? qp('period') : 'day'; const p = await S.auth(store, req);
          try { await S.resolveDue(store, prices, now, S.RULES.LAZY_PLAYERS); } catch {}
          return send(200, await S.board(store, period, { now, me: p?.pid })); }
        if (op === 'resolve-all' || (S.isCron(req, env) && (op === '' || op == null))) { if (!S.isAdmin(req, env) && !S.isCron(req, env)) return send(401, { error: 'admin or cron only' });
          try { await prices.quotes(S.callableMints(day, schedule)); } catch {} // a fresh sample every run keeps end prices exact
          return send(200, await S.resolveDue(store, prices, now, S.RULES.CRON_PLAYERS)); }
        if (op === 'winners') { if (!S.isAdmin(req, env)) return send(401, { error: 'admin only' });
          const week = /^\d{4}-\d{2}-\d{2}$/.test(qp('week') || '') ? qp('week') : LS.weekKey(t), top = Math.max(1, Math.min(100, Number(qp('top')) || 10));
          const rows = await S.winners(store, week, top);
          if (qp('format') === 'csv') { res.setHeader('content-type', 'text/csv'); res.statusCode = 200; res.setHeader('cache-control', 'no-store');
            return res.end(['rank,player_id,name,bones,wins,calls,hit_rate,best_streak', ...rows.map((r) => [r.rank, r.pid, '"' + r.name.replace(/"/g, '""') + '"', r.bones, r.wins, r.calls, r.hitRate, r.bestStreak].join(','))].join('\n') + '\n'); }
          return send(200, { week, rows, note: 'For hand review only. Kennel Chest prizes are reviewed and paid by hand; nothing is paid automatically.' }); }
        return send(400, { error: 'unknown op' });
      }
      if (req.method !== 'POST') return send(405, { error: 'GET or POST' });
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}); if (rawBody.length > 1024) return send(413, { error: 'too big' });
      let b; try { b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}; } catch { return send(400, { error: 'bad json' }); }
      if (b.op === 'register') return send(200, await S.register(store, { name: b.name, ip, now: t }));
      const p = await S.auth(store, req); if (!p) return send(401, { error: 'unknown player' });
      if (b.op === 'name') return send(200, { player: S.pub(await S.rename(store, p, b.name)) });
      if (b.op === 'call') { const c = await S.createCall(store, prices, p, { mint: b.mint, side: b.side, win: b.win }, { env, now, ip, schedule }); // only these 3 fields are read
        const cur = await S.auth(store, req); return send(200, { call: S.pub({ ...cur, calls: [c] }).calls[0], player: S.pub(cur) }); }
      if (b.op === 'resolve') { if (!(await store.setNX('rl:res:' + p.pid, '1', S.RULES.RESOLVE_GAP_S))) return send(429, { error: 'slow down' });
        const r = await S.resolvePlayer(store, prices, p.pid, now); return send(200, { player: S.pub(r?.player || p), resolved: (r?.done || []).map((c) => c.id) }); }
      return send(400, { error: 'unknown op' });
    } catch (e) { return send(e.status || 500, { error: e.status ? e.message : 'server error', ...(e.extra || {}) }); }
  };
}
export default makeHandler();

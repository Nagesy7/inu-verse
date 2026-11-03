// /api/feed: live activity feed + ghost recent visitors (src/feed.js, src/ghosts.js, api/_lib/feed.js). Public, CORS *.
// GET                                   -> { events:[{i,k,n,x,t,v}], ghosts:[{n,c,a,t}] }  (ghosts = seen 10 min .. 24 h ago)
// GET ?who=Name1,Name2 (max 50)        -> { who: { <lower name>: { n, on, a, t } } } presence for the Friends list: a = named spot only
//                                          while online (seen < 3 min), t rounded to the minute. Public names only.
// POST { op:"hello", name, coat, area } -> { sid, events, ghosts }  starts a visit session (name cleaned with cleanName; a filtered
//                                          name gets no session and is never stored). Logs "X arrived in town" at most once per
//                                          name per 6 h and once per IP per 10 min. Rate limits per hashed IP: 1 hello / 15 s, 8 / h.
// POST { op:"ping", sid, area, coat, g? } (g = the device's multiplayer guest tag Pup1234, also accepted on hello)   -> keeps the visitor's last spot / last seen fresh (1 per 20 s per session)
// POST { op:"event", sid, type, area, x } -> client-reported event (CLIENT_TYPES: "koi", "trader", "keepsake"): the name comes from the
//                                          server-side session (never the request), the session must be >= 20 s old and from the
//                                          same IP, koi needs area "pond"; 1 per type per 2 min per session, 6 per hour per IP.
//                                          trader / keepsake (daily world events, src/events.js): x = item id, only on the matching
//                                          Sydney event day, at that event's area, once per name + item + day. Cosmetic only.
// Server-recorded events (no client call possible): plot claim / home + shop open / guestbook sign (api/home.js) and a new #1 on
// the Inu Arcade weekly board (polled here from the arcade's own /api/scores, at most every 3 min).
// No rewards, no tokens, no payments. Nothing returned ever includes a wallet, IP, session id of someone else, or email.
import { createHash, randomBytes } from 'node:crypto';
import { upstashKv, memoryKv } from './_lib/kv.js';
import { appendEvent, readEvents, readVisitors, touchVisitor } from './_lib/feed.js';
import { CLIENT_TYPES, FEED, feedName, cleanExtra } from '../src/feed.js';
import { GEAR, eventToday, eventArea } from '../src/events.js';
import { GHOST, validSpot } from '../src/ghosts.js';
import { whoKeys, whoOut } from '../src/friends.js';

export const HELLO_GAP_S = 15, HELLO_PER_H = 8, PING_GAP_S = 20, EVENT_GAP_S = 120, EVENTS_PER_H = 6, MIN_SESSION_MS = 20_000, ARRIVE_NAME_S = 6 * 3600, ARRIVE_IP_S = 600, ARCADE_EVERY_S = 180, GHOSTS_OUT = 16;
export const ARCADE_SCORES = 'https://inu-arcade.vercel.app/api/scores?game=arcade&period=weekly';
const sha = (s) => createHash('sha256').update(String(s)).digest('hex');
const ipOf = (req) => String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || '?').split(',')[0].trim();
const SID_RE = /^[0-9a-f]{24}$/, COAT_RE = /^[a-z0-9_-]{1,24}$/, GUEST_RE = /^Pup\d{4}$/;
let MEM = null;
export function ghostsOut(vis, now) { return Object.values(vis).filter((v) => validSpot(v.a) && now - v.t >= GHOST.ONLINE_MS).sort((a, b) => b.t - a.t).slice(0, GHOSTS_OUT).map(({ n, c, a, t }) => ({ n, c, a, t })); }
// count-per-window limiter on top of get/set (best effort; races only ever under-count by one)
async function under(store, key, max, win) { const n = Number(await store.get(key)) || 0; if (n >= max) return false; await store.set(key, String(n + 1), win); return true; }
export async function pollArcade(store, { f = fetch, now = Date.now(), url = ARCADE_SCORES } = {}) {
  if (!(await store.setNX('feed:arcade:lock', '1', ARCADE_EVERY_S))) return null;
  let j; try { const c = new AbortController(), tm = setTimeout(() => c.abort(), 2500); try { const r = await f(url, { signal: c.signal, headers: { accept: 'application/json' } }); if (!r.ok) return null; j = await r.json(); } finally { clearTimeout(tm); } } catch { return null; }
  const top = (Array.isArray(j?.entries) ? j.entries : []).find((e) => e && !e.house && Number(e.points ?? e.score) > 0); if (!top) return null;
  const name = feedName(top.name); if (!name) return null; const prev = await store.get('feed:arcade:top');
  if (prev === name.toLowerCase()) return null; await store.set('feed:arcade:top', name.toLowerCase(), 8 * 86400);
  if (prev == null) return null; // first look ever: remember the current leader quietly (it didn't just happen)
  return appendEvent(store, { k: 'arcade', n: name }, { now }); }
export function makeHandler({ env = process.env, kv, now = () => Date.now(), f = fetch, sleep } = {}) {
  const store = kv !== undefined ? kv : (upstashKv(env) || (MEM ||= memoryKv()));
  const salt = env.HOME_IP_SALT || 'inu-verse-home';
  const payload = async (t) => ({ events: await readEvents(store, t), ghosts: ghostsOut(await readVisitors(store, t), t) });
  return async function handler(req, res) {
    res.setHeader('access-control-allow-origin', '*'); res.setHeader('access-control-allow-headers', 'content-type'); res.setHeader('content-type', 'application/json');
    const send = (code, o, cache = 'no-store') => { res.statusCode = code; res.setHeader('cache-control', cache); res.end(JSON.stringify(o)); };
    if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
    try { const t = now();
      if (req.method === 'GET' && (req.query?.who ?? new URL(req.url || '/', 'http://x').searchParams.get('who')) != null) { // friends presence (src/friends.js)
        const keys = whoKeys(req.query?.who ?? new URL(req.url || '/', 'http://x').searchParams.get('who')); return send(200, { who: keys.length ? whoOut(await readVisitors(store, t), keys, t) : {} }, 'public, max-age=10, s-maxage=15'); }
      if (req.method === 'GET') { try { await pollArcade(store, { f, now: t }); } catch {} return send(200, await payload(t), 'public, max-age=5, s-maxage=10, stale-while-revalidate=20'); }
      if (req.method !== 'POST') return send(405, { error: 'GET or POST' });
      const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}); if (raw.length > 1024) return send(413, { error: 'too big' });
      let b; try { b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}; } catch { return send(400, { error: 'bad json' }); }
      const ip = sha(salt + '|feed|' + ipOf(req)).slice(0, 24);
      if (b.op === 'hello') {
        if (!(await store.setNX('feed:rl:h:' + ip, '1', HELLO_GAP_S))) return send(429, { error: 'slow down', retryAfter: HELLO_GAP_S });
        const name = feedName(b.name); if (!name) return send(200, { ok: true, sid: null, ...(await payload(t)) }); // filtered names are never stored or shown
        if (!(await under(store, 'feed:rl:hc:' + ip, HELLO_PER_H, 3600))) return send(429, { error: 'too many visits from here', retryAfter: 600 });
        const sid = randomBytes(12).toString('hex'), area = validSpot(b.area) ? b.area : null, coat = COAT_RE.test(b.coat || '') ? b.coat : 'tan';
        const g = GUEST_RE.test(b.g || '') ? b.g : null;
        await store.set('feed:v1:s:' + sid, JSON.stringify({ n: name, c: coat, a: area, g, ip, t0: t, t }), FEED.TTL_S);
        await touchVisitor(store, { n: name, c: coat, a: area, g }, { now: t, sleep });
        if (await store.setNX('feed:rl:arr:' + ip, '1', ARRIVE_IP_S)) { if (await store.setNX('feed:arr:' + sha(name.toLowerCase()).slice(0, 24), '1', ARRIVE_NAME_S)) await appendEvent(store, { k: 'arrive', n: name }, { now: t, sleep }); }
        return send(200, { ok: true, sid, ...(await payload(t)) }); }
      if (b.op === 'ping' || b.op === 'event') {
        const sid = String(b.sid || ''); if (!SID_RE.test(sid)) return send(400, { error: 'bad session' });
        let s = null; try { s = JSON.parse((await store.get('feed:v1:s:' + sid)) || 'null'); } catch {} if (!s) return send(404, { error: 'no session' });
        if (s.ip !== ip) return send(403, { error: 'session moved' });
        if (b.op === 'ping') { if (!(await store.setNX('feed:rl:p:' + sid, '1', PING_GAP_S))) return send(429, { error: 'slow down', retryAfter: PING_GAP_S });
          if (validSpot(b.area)) s.a = b.area; if (COAT_RE.test(b.coat || '')) s.c = b.coat; if (GUEST_RE.test(b.g || '')) s.g = b.g; s.t = t; await store.set('feed:v1:s:' + sid, JSON.stringify(s), FEED.TTL_S);
          await touchVisitor(store, { n: s.n, c: s.c, a: s.a, g: s.g }, { now: t, sleep }); return send(200, { ok: true, ...(await payload(t)) }); }
        const type = String(b.type || ''); if (!CLIENT_TYPES.includes(type)) return send(400, { error: 'unknown event type' });
        if (t - s.t0 < MIN_SESSION_MS) return send(409, { error: 'too soon' });
        if (type === 'koi' && b.area !== 'pond') return send(409, { error: 'not at the pond' });
        let x = ''; if (type === 'trader' || type === 'keepsake') { // daily world events: must match TODAY's Sydney event, the item and the area
          x = cleanExtra(type, b.x); if (!x) return send(400, { error: 'bad item' }); const ev = eventToday(t);
          if (type === 'trader' ? ev.id !== 'trader' : GEAR[x].ev !== ev.id) return send(409, { error: 'not today' });
          if (b.area !== eventArea(ev)) return send(409, { error: 'not at the event' }); x = { x, day: ev.day }; }
        if (!(await store.setNX('feed:rl:e:' + sid + ':' + type, '1', EVENT_GAP_S))) return send(429, { error: 'slow down', retryAfter: EVENT_GAP_S });
        if (!(await under(store, 'feed:rl:ec:' + ip, EVENTS_PER_H, 3600))) return send(429, { error: 'too many events', retryAfter: 600 });
        if (x && !(await store.setNX('feed:rl:x:' + sha(s.n.toLowerCase()).slice(0, 16) + ':' + x.day + ':' + x.x, '1', 26 * 3600))) return send(409, { error: 'already posted' }); // once per name + item + day
        if (validSpot(b.area)) s.a = b.area; s.t = t; await store.set('feed:v1:s:' + sid, JSON.stringify(s), FEED.TTL_S);
        const ev = await appendEvent(store, { k: type, n: s.n, x: x ? x.x : '' }, { now: t, sleep }); return send(200, { ok: !!ev, ...(await payload(t)) }); }
      return send(400, { error: 'unknown op' });
    } catch (e) { return send(e.status || 500, { error: e.status ? e.message : 'feed unavailable' }); }
  };
}
export default makeHandler();

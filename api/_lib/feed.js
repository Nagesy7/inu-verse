// Server side of the live activity feed + ghost visitors (src/feed.js, src/ghosts.js). Upstash (same KV_REST_API_* / UPSTASH_* env
// as api/home.js), raw keys, everything expires within a day:
//   feed:v1:ev   [{ i, k, n, x, t }] newest first, max FEED.MAX (50), entries older than 24 h dropped, key TTL 24 h
//   feed:v1:vis  { <lower name>: { n, c, a, t, g? } } recent visitors (public name, coat, last spot, last seen), max VIS_MAX, TTL 24 h
//   feed:v1:s:<sid>  visit session { n, c, a, ip, t0, t } (ip = salted sha256 prefix, never returned), TTL 24 h
// Only typed fields are stored (event type, cleaned public name, tiny extra such as a plot number); text is rendered client-side.
import { FEED, isEventType, feedName, cleanExtra, cleanEvent } from '../../src/feed.js';
import { randomBytes } from 'node:crypto';

export const EV_KEY = 'feed:v1:ev', VIS_KEY = 'feed:v1:vis', VIS_MAX = 60;
const getJ = async (store, k, d) => { const raw = await store.get(k); try { return JSON.parse(raw || 'null') ?? d; } catch { return d; } };
async function locked(store, name, fn, sleep = (ms) => new Promise((r) => setTimeout(r, ms))) { const L = 'feed:lock:' + name;
  for (let i = 0; i < 15; i++) { if (await store.setNX(L, '1', 5)) { try { return await fn(); } finally { try { await store.del(L); } catch {} } } await sleep(60); }
  throw Object.assign(new Error('busy'), { status: 503 }); }
export const liveEvents = (list, now) => (Array.isArray(list) ? list : []).map((e) => cleanEvent(e, now)).filter(Boolean).sort((a, b) => b.t - a.t).slice(0, FEED.MAX);
// Append one event. Unknown types, filtered names (addresses, slurs, profanity) and bad extras are refused (returns null). Best-effort
// for callers in other routes: wrap in try/catch so a feed hiccup never breaks the real action.
export async function appendEvent(store, { k, n, x = '' }, { now = Date.now(), sleep } = {}) {
  if (!store || !isEventType(k)) return null; const name = feedName(n); if (!name) return null; const ex = cleanExtra(k, x); if (ex == null) return null;
  const ev = { i: randomBytes(5).toString('hex'), k, n: name, x: ex, t: now };
  return locked(store, 'ev', async () => { const list = liveEvents([ev, ...(await getJ(store, EV_KEY, []))], now); await store.set(EV_KEY, JSON.stringify(list), FEED.TTL_S); return ev; }, sleep); }
export async function readEvents(store, now = Date.now()) { return liveEvents(await getJ(store, EV_KEY, []), now); }
const COAT_RE = /^[a-z0-9_-]{1,24}$/, GUEST_RE = /^Pup\d{4}$/; // g = the device's multiplayer guest tag (Pup1234), so friends followed from the live players list can be found
export function liveVisitors(map, now) { const out = {}; const rows = Object.values(map && typeof map === 'object' ? map : {}).filter((v) => v && feedName(v.n) && Number.isFinite(v.t) && now - v.t < FEED.TTL_S * 1000 && v.t <= now + 60_000)
  .sort((a, b) => b.t - a.t).slice(0, VIS_MAX); for (const v of rows) { const n = feedName(v.n); out[n.toLowerCase()] = { n, c: COAT_RE.test(v.c || '') ? v.c : 'tan', a: typeof v.a === 'string' ? v.a : null, t: v.t, ...(GUEST_RE.test(v.g || '') ? { g: v.g } : {}) }; } return out; }
export async function touchVisitor(store, { n, c, a, g }, { now = Date.now(), sleep } = {}) { const name = feedName(n); if (!name) return null;
  return locked(store, 'vis', async () => { const m = liveVisitors(await getJ(store, VIS_KEY, {}), now), k = name.toLowerCase(), prev = m[k];
    m[k] = { n: name, c: COAT_RE.test(c || '') ? c : prev?.c || 'tan', a: a || prev?.a || null, t: now, g: GUEST_RE.test(g || '') ? g : prev?.g }; const out = liveVisitors(m, now); await store.set(VIS_KEY, JSON.stringify(out), FEED.TTL_S); return out[k]; }, sleep); }
export async function readVisitors(store, now = Date.now()) { return liveVisitors(await getJ(store, VIS_KEY, {}), now); }

// ---- Round 4: decoratable home you can share, with a guestbook ----
// Your home is the plot you claimed (state.plots[id]); you decorate it in build mode with furniture you own (shop items only,
// nothing new to pay for). The layout lives in your save (localStorage, synced to your wallet cloud save when signed in).
// To let others visit, the game publishes a COPY of the layout to /api/home under a random home id (state.homeShare.id).
// state.homeShare.key is a random owner secret (never shown, never sent to other players); the server keeps only its SHA-256
// and requires it to republish or delete guestbook entries. Other players see your home id on your multiplayer entry
// ("Visit home") and can sign your guestbook; entries go through the same filter as chat (mpshared cleanChat / cleanName)
// and are rate-limited by the server. Pure helpers (shared by the client, api/home.js and tests) + a tiny fetch client.
import { FURNITURE, WALLS, FLOORS, ROOM_W, ROOM_H, canPlace } from './furniture.js';
import { cleanChat, cleanName } from './mpshared.js';

export const HOME_RE = /^h[0-9a-z]{12}$/;
export const validHomeId = (id) => typeof id === 'string' && HOME_RE.test(id);
export const GB = { MAX: 50, TEXT_MAX: 120, ITEMS_MAX: 80, NAME_MAX: 16 };
const rndStr = (n, abc, rnd) => Array.from({ length: n }, () => abc[Math.floor(rnd() * abc.length)]).join('');
function rand() { try { const a = new Uint32Array(1); globalThis.crypto.getRandomValues(a); return a[0] / 2 ** 32; } catch { return Math.random(); } }
export function newShare(rnd = rand) { return { id: 'h' + rndStr(12, '0123456789abcdefghijklmnopqrstuvwxyz', rnd), key: rndStr(32, '0123456789abcdef', rnd) }; }
export function ensureShare(s, rnd) { if (!s.homeShare || !validHomeId(s.homeShare.id) || !/^[0-9a-f]{32}$/.test(s.homeShare.key || '')) s.homeShare = newShare(rnd); return s.homeShare; }
// your home = the plot you last decorated in build mode (homeShare.plot), else the first plot you claimed
export const myHomePlot = (s) => { const p = s?.homeShare?.plot; return p && s.plots?.[p] ? p : Object.keys(s?.plots || {})[0] || null; };
// layout copy that is safe to publish: only known furniture, in bounds, no overlaps (same rule as build mode), known wall/floor
export function cleanLayout(l) { if (!l || typeof l !== 'object' || !Array.isArray(l.items)) return null;
  const out = { items: [], wall: Number.isInteger(l.wall) && WALLS[l.wall] ? l.wall : 0, floor: Number.isInteger(l.floor) && FLOORS[l.floor] ? l.floor : 0 };
  for (const it of l.items.slice(0, GB.ITEMS_MAX)) { if (!it || !FURNITURE[it.id]) continue; const x = it.x | 0, y = it.y | 0, rot = ((it.rot | 0) % 4 + 4) % 4;
    if (x !== it.x || y !== it.y || x < 0 || y < 0 || x >= ROOM_W || y >= ROOM_H) continue;
    if (canPlace(out, it.id, x, y, rot)) out.items.push({ uid: 'p' + out.items.length, id: it.id, x, y, rot }); }
  return out; }
export const layoutOf = (plot) => cleanLayout({ items: (plot?.items || []).map(({ id, x, y, rot }) => ({ id, x, y, rot })), wall: plot?.wall | 0, floor: plot?.floor | 0 });
export const layoutKey = (l) => JSON.stringify(l ? [l.wall, l.floor, l.items.map((i) => [i.id, i.x, i.y, i.rot])] : null);
// guestbook entry: name like a multiplayer name, text exactly like a chat line
export function cleanEntry(name, text) { const c = cleanChat(text, GB.TEXT_MAX); if (!c.ok) return { ok: false, reason: c.reason === 'empty' ? 'Write a message first.' : String(c.reason).replace(/in chat/, 'in the guestbook') };
  return { ok: true, name: cleanName(name, 'A visitor'), text: c.text }; }
export const homeOwnerName = (n) => cleanName(n, 'A pup');

export function homeApi(base = '', f = (...a) => globalThis.fetch(...a)) {
  const call = async (method, body, q = '') => { const r = await f(`${base}/api/home${q}`, method === 'GET' ? { headers: { accept: 'application/json' } } : { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    let j = null; try { j = await r.json(); } catch {} if (!r.ok) { const e = new Error(j?.error || 'home ' + r.status); e.status = r.status; throw e; } return j; };
  return { get: (id) => call('GET', null, '?id=' + encodeURIComponent(id)),
    publish: (share, name, layout) => call('POST', { op: 'publish', id: share.id, key: share.key, name, layout }),
    sign: (id, name, text) => call('POST', { op: 'sign', id, name, text }),
    del: (share, entry) => call('POST', { op: 'del', id: share.id, key: share.key, entry }),
    book: (share) => call('POST', { op: 'book', id: share.id, key: share.key }) };
}

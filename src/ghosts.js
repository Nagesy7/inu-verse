// Ghost recent visitors: real players who visited in the last ~24 h and are NOT online now, drawn as translucent "ghost" Inu idling
// and wandering near the spot they were last at, so the town never feels empty. Data comes from /api/feed (api/_lib/feed.js):
// only { n: public display name (cleaned with the multiplayer name filter), c: coat id, a: spot id, t: last seen }. Never a wallet,
// email, IP, session id or any other id. Capped (MAX on screen), culled to the view, one cached pre-tinted sprite per ghost+face.
// Clearly not live players: semi-transparent, pale-blue tint, floating bob, no shadow, no chat/emotes, "recent visitor" label.
import { feedName } from './feed.js';
import { isSolid, MAP, T, TILE, KIBBLE_PLAZA, FOUNTAIN, ARCADE, BANK, POND, MARKET, BARN, CHAPEL, MATCHMAKER, PLOTS } from './world.js';

export const GHOST = { MAX: 8, ONLINE_MS: 10 * 60_000, TTL_MS: 24 * 3600_000, RADIUS: 3, SPEED: 26, ALPHA: 0.5 };
const at = (tx, ty, name) => ({ tx, ty, name });
// Named outdoor spots (tile anchors). The client reports the nearest one; the server only accepts these ids.
export const SPOTS = Object.freeze({
  plaza: at(KIBBLE_PLAZA.crier.x + 1, KIBBLE_PLAZA.crier.y + 2, 'Kibble Plaza'),
  mall: at(FOUNTAIN.x - 2, FOUNTAIN.y + 1, 'Kibble Mall fountain'),
  arcade: at(ARCADE.door.tx, ARCADE.door.ty + 1, 'Inu Arcade'),
  bank: at(BANK.door.tx, BANK.door.ty + 1, 'Kibble Bank'),
  pond: at(POND.x + 5, POND.y - 2, 'Fishing Pond'),
  market: at(MARKET.x + 3, MARKET.y + MARKET.h, 'Farmers Market'),
  barn: at(BARN.x + 4, BARN.y + BARN.h, 'Big Barn'),
  chapel: at(CHAPEL.x + 3, CHAPEL.y + CHAPEL.h, 'Park Chapel'),
  park: at(MATCHMAKER.x, MATCHMAKER.y + 2, 'the park'),
  plots: at(PLOTS[1].x + 3, PLOTS[1].y + PLOTS[1].h + 1, 'the home plots'),
  mainst: at(26, 23, 'Main Street'),
});
export const SPOT_IDS = Object.freeze(Object.keys(SPOTS));
export const validSpot = (a) => typeof a === 'string' && Object.prototype.hasOwnProperty.call(SPOTS, a);
// nearest named spot to a tile position (within maxD tiles), else null (the last good area is kept)
export function spotAt(tx, ty, maxD = 12) { let best = null, bd = maxD * maxD;
  for (const [id, s] of Object.entries(SPOTS)) { const d = (s.tx - tx) ** 2 + (s.ty - ty) ** 2; if (d <= bd) { bd = d; best = id; } } return best; }
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (seed) => () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
// walkable tiles around a spot (cached)
const TILES = new Map();
export function spotTiles(id, r = GHOST.RADIUS) { if (TILES.has(id)) return TILES.get(id); const s = SPOTS[id], out = [];
  if (s) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const tx = s.tx + dx, ty = s.ty + dy; if (!isSolid(tx, ty) && MAP[ty]?.[tx] !== T.ROAD) out.push([tx, ty]); } // never idle in the road
  TILES.set(id, out); return out; }
const COAT_RE = /^[a-z0-9_-]{1,24}$/;
// pure: server list -> the ghosts to show. Drops anything malformed, online-recently (< ONLINE_MS), older than TTL, unknown spots,
// filtered names, live players / me (exclude = lower-case names), dupes; newest first; capped.
export function selectGhosts(list, { now = Date.now(), exclude = new Set(), cap = GHOST.MAX } = {}) { const seen = new Set(), out = [];
  for (const g of Array.isArray(list) ? list : []) { if (!g || typeof g !== 'object') continue; const n = feedName(g.n), t = Number(g.t); if (!n || !validSpot(g.a) || !Number.isFinite(t)) continue;
    const age = now - t; if (age < GHOST.ONLINE_MS || age > GHOST.TTL_MS) continue; const key = n.toLowerCase(); if (seen.has(key) || exclude.has(key)) continue; seen.add(key);
    out.push({ n, c: typeof g.c === 'string' && COAT_RE.test(g.c) ? g.c : 'tan', a: g.a, t }); }
  return out.sort((a, b) => b.t - a.t).slice(0, Math.max(0, Math.min(cap, GHOST.MAX))); }

// createGhosts({ sprite(coat, face) -> canvas, rm() }) -> { set(list, exclude), step(dt), props(view, time), list }
export function createGhosts({ sprite = null, rm = () => false, now = () => Date.now() } = {}) {
  const live = new Map(); const cache = new Map();
  function place(g) { const tiles = spotTiles(g.a); if (!tiles.length) return null; const R = rng(hash(g.n + '|' + g.a)), [tx, ty] = tiles[Math.floor(R() * tiles.length)];
    return { ...g, R, x: (tx + 0.5) * TILE, y: (ty + 0.8) * TILE, tx: null, ty: null, wait: 1 + R() * 4, face: ['down', 'left', 'right'][Math.floor(R() * 3)], ph: R() * 6 }; }
  const api = {
    get list() { return [...live.values()]; },
    set(list, exclude = new Set(), cap = GHOST.MAX) { const want = selectGhosts(list, { now: now(), exclude, cap }), keep = new Set();
      for (const g of want) { const k = g.n.toLowerCase(); keep.add(k); const cur = live.get(k); if (cur && cur.a === g.a) { cur.c = g.c; cur.t = g.t; continue; } const p = place(g); if (p) live.set(k, p); }
      for (const k of [...live.keys()]) if (!keep.has(k)) live.delete(k); return api.list; },
    exclude(names) { for (const n of names) live.delete(String(n).toLowerCase()); },
    step(dt) { const slow = rm(); for (const g of live.values()) { g.ph += dt;
      if (g.tx == null) { if ((g.wait -= dt) <= 0) { if (slow) { g.wait = 6; continue; } const tiles = spotTiles(g.a), [tx, ty] = tiles[Math.floor(g.R() * tiles.length)]; g.tx = (tx + 0.5) * TILE; g.ty = (ty + 0.8) * TILE; } continue; }
      const dx = g.tx - g.x, dy = g.ty - g.y, d = Math.hypot(dx, dy), s = GHOST.SPEED * dt;
      if (d <= s) { g.x = g.tx; g.y = g.ty; g.tx = null; g.wait = 3 + g.R() * 6; g.face = 'down'; } else { g.x += (dx / d) * s; g.y += (dy / d) * s; g.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy < 0 ? 'up' : 'down'; } } },
    // depth-sortable props for the world renderer (same {y, d(c)} shape as other props); only ghosts in view
    props(view, time = 0) { if (!live.size || !sprite) return []; const out = [], m = 80;
      for (const g of live.values()) { if (g.x < view.x0 - m || g.x > view.x1 + m || g.y < view.y0 - m || g.y > view.y1 + m * 2) continue;
        out.push({ y: g.y + 6, ghost: g.n, d: (c) => drawGhost(c, g, time) }); } return out; },
  };
  function spr(coat, face) { const k = coat + '|' + face; let cv = cache.get(k); if (!cv) { cv = sprite(coat, face); if (cv) { try { tint(cv); } catch {} cache.set(k, cv); } } return cv; }
  function drawGhost(c, g, time) { const cv = spr(g.c, g.face); if (!cv) return; const bob = rm() ? 0 : Math.sin(g.ph * 2.2) * 1.5, w = cv.width / 2, h = cv.height / 2;
    c.save(); c.globalAlpha = GHOST.ALPHA; c.imageSmoothingEnabled = false; c.drawImage(cv, Math.round(g.x - w / 2), Math.round(g.y - h + 8 + bob - 4), w, h);
    c.globalAlpha = 0.85; c.textAlign = 'center'; c.font = '5px Silkscreen, monospace'; const ty = Math.round(g.y - h + 8 + bob - 4) + 6;
    const lbl = g.n, sub = 'recent visitor', tw = Math.max(c.measureText(lbl).width, c.measureText(sub).width) + 6;
    c.fillStyle = 'rgba(12,16,34,0.55)'; c.fillRect(Math.round(g.x - tw / 2), ty - 6, Math.round(tw), 13);
    c.fillStyle = '#dfeaff'; c.fillText(lbl, Math.round(g.x), ty); c.fillStyle = '#9fb4e0'; c.fillText(sub, Math.round(g.x), ty + 6); c.restore(); }
  return api;
}
// pale-blue ghost tint baked into the cached sprite once (no per-frame filters)
function tint(cv) { const x = cv.getContext('2d'); x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(170,200,255,0.45)'; x.fillRect(0, 0, cv.width, cv.height); x.globalCompositeOperation = 'source-over'; }

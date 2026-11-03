// Ghost recent visitors: real players who visited in the last ~24 h and are NOT online now, drawn as translucent "ghost" Inu idling
// and wandering near the spot they were last at, so the town never feels empty. Data comes from /api/feed (api/_lib/feed.js):
// only { n: public display name (cleaned with the multiplayer name filter), c: coat id, a: spot id, t: last seen }. Never a wallet,
// email, IP, session id or any other id. Capped (MAX on screen), culled to the view, one cached pre-tinted sprite per ghost+face.
// Clearly not live players: semi-transparent, pale-blue tint with a soft glow outline, gentle floating bob, a faint halo instead of a
// shadow, no chat/emotes, a "recent visitor" label drawn above every prop and moved clear of the HUD buttons.
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
// walkable tiles around a spot (cached). A ghost never idles where a statue / sign / wall / building front stands just south of it
// (those are drawn over it, hiding the ghost): tiles with a solid tile or a known decor tile 1-2 rows below (x +-1) are skipped,
// unless that would leave fewer than MIN_TILES (then only the row just below is checked, then the plain walkable list is used).
const TILES = new Map(), MIN_TILES = 8;
const PZ = KIBBLE_PLAZA, DECOR = new Set();
const addDecor = (x, y, w = 1, h = 1) => { for (let a = 0; a < w; a++) for (let b = 0; b < h; b++) DECOR.add((y + b) * 1000 + x + a); };
addDecor(PZ.statue.x, PZ.statue.y, PZ.statue.w, 2); addDecor(PZ.news.x, PZ.news.y, 1, 2); addDecor(PZ.crier.x, PZ.crier.y); addDecor(PZ.firepit.x, PZ.firepit.y); addDecor(PZ.wall.x, PZ.wall.y, PZ.wall.w, 2); addDecor(PZ.raid.x, PZ.raid.y, PZ.raid.w, 2);
// extra decor tiles from the client (street lamps, signs); clears the cache
export function addBlockers(tiles) { for (const [x, y] of tiles || []) addDecor(x, y); TILES.clear(); }
// does a world-px rect touch a building / sign / statue tile (solid or decor)? used to keep ghost name labels off building signs
export function overScenery(x, y, w, h) { const x0 = Math.floor(x / TILE), x1 = Math.floor((x + w - 1) / TILE), y0 = Math.floor(y / TILE), y1 = Math.floor((y + h - 1) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (isSolid(tx, ty) || DECOR.has(ty * 1000 + tx)) return true; return false; }
export const blockedBelow = (tx, ty, reach = 2) => { for (let dy = 1; dy <= reach; dy++) for (let dx = -1; dx <= 1; dx++) { const x = tx + dx, y = ty + dy; if (isSolid(x, y) || DECOR.has(y * 1000 + x)) return true; } return DECOR.has(ty * 1000 + tx); };
export function spotTiles(id, r = GHOST.RADIUS) { if (TILES.has(id)) return TILES.get(id); const s = SPOTS[id], all = [];
  if (s) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const tx = s.tx + dx, ty = s.ty + dy; if (!isSolid(tx, ty) && MAP[ty]?.[tx] !== T.ROAD) all.push([tx, ty]); } // never idle in the road
  const clear = all.filter(([tx, ty]) => !blockedBelow(tx, ty)), near = clear.length >= MIN_TILES ? clear : all.filter(([tx, ty]) => !blockedBelow(tx, ty, 1)), out = near.length >= MIN_TILES ? near : all;
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
    // late pass (after every world prop, before the screen HUD): name labels on top of statues / signs / buildings. blocked(x, y, w, h)
    // gets the label's world rect and says if a HUD button / chip covers it on screen; the label then tries below the feet, then
    // left / right, and is skipped rather than drawn under a button. Placement is re-checked at most every LABEL_MS per ghost.
    labels(c, view, time = 0, blocked = null) { if (!live.size) return 0; let n = 0; const m = 40, nowMs = now();
      for (const g of live.values()) { if (g.x < view.x0 - m || g.x > view.x1 + m || g.y < view.y0 - m || g.y > view.y1 + m) continue;
        const cv = spr(g.c, g.face); if (!cv) continue; const h = cv.height / 2, b = bobOf(g), top = Math.round(g.y - h + 4 + b);
        c.save(); c.font = '5px Silkscreen, monospace'; const tw = Math.round(Math.max(c.measureText(g.n).width, c.measureText(SUB).width) + 6);
        if (!g.lab || nowMs - g.labT > LABEL_MS) { g.labT = nowMs; g.lab = placeLabel(g, top, tw, blocked); }
        if (g.lab) { const [lx, ly] = g.lab, x = Math.round(g.x + lx), y = ly === 'below' ? Math.round(g.y + 14) : top + 6;
          c.globalAlpha = 0.9; c.textAlign = 'center'; c.fillStyle = 'rgba(12,16,34,0.6)'; c.fillRect(x - tw / 2, y - 6, tw, 13);
          c.fillStyle = '#dfeaff'; c.fillText(g.n, x, y); c.fillStyle = '#9fb4e0'; c.fillText(SUB, x, y + 6); n++; }
        c.restore(); } return n; },
  };
  const SUB = 'recent visitor', LABEL_MS = 400;
  const bobOf = (g) => (rm() ? 0 : Math.sin(g.ph * 2.2) * 2);
  // first pass: clear of HUD buttons AND of building fronts / signs / statues (solid or decor tiles); second pass: clear of the HUD only
  function placeLabel(g, top, tw, blocked) { const tries = [[0, 'above'], [0, 'below'], [-(tw / 2 + 12), 'above'], [tw / 2 + 12, 'above'], [-(tw / 2 + 12), 'below'], [tw / 2 + 12, 'below']];
    for (const strict of [true, false]) for (const [dx, where] of tries) { const x = g.x + dx - tw / 2, y = where === 'below' ? g.y + 8 : top;
      if (blocked && blocked(x, y, tw, 14)) continue; if (strict && overScenery(x, y, tw, 14)) continue; return [dx, where]; } return null; }
  function spr(coat, face) { const k = coat + '|' + face; let cv = cache.get(k); if (!cv) { cv = sprite(coat, face); if (cv) { try { cv = tint(cv); } catch {} cache.set(k, cv); } } return cv; }
  // sprite: translucent, pale blue with a baked soft glow outline, gentle float bob (none in reduced motion), a faint pulsing halo on
  // the ground instead of a shadow. The name label is drawn separately in labels() so props can never cover it.
  function drawGhost(c, g, time) { const cv = spr(g.c, g.face); if (!cv) return; const b = bobOf(g), w = cv.width / 2, h = cv.height / 2, pulse = rm() ? 0.5 : 0.5 + 0.5 * Math.sin(g.ph * 1.6);
    c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = 0.16 + 0.1 * pulse; c.fillStyle = '#bcd4ff'; c.beginPath(); c.ellipse(Math.round(g.x), Math.round(g.y + 6), 13, 4, 0, 0, Math.PI * 2); c.fill();
    c.globalAlpha = GHOST.ALPHA; c.drawImage(cv, Math.round(g.x - w / 2), Math.round(g.y - h + 4 + b), w, h); c.restore(); }
  return api;
}
export const GLOW = 3; // px of soft outline baked round the cached sprite (canvas px, before the 1/2 draw scale)
// pale-blue ghost tint + soft glow outline baked into the cached sprite once (no per-frame filters). Returns the new canvas.
export function tint(cv) { const W = cv.width + GLOW * 2, H = cv.height + GLOW * 2, out = mkCanvas(W, H, cv); if (!out) return cv; const o = out.getContext('2d');
  const sil = mkCanvas(cv.width, cv.height, cv), s = sil.getContext('2d'); s.drawImage(cv, 0, 0); s.globalCompositeOperation = 'source-in'; s.fillStyle = '#cfe0ff'; s.fillRect(0, 0, cv.width, cv.height);
  o.globalAlpha = 0.28; for (let dx = -GLOW; dx <= GLOW; dx++) for (let dy = -GLOW; dy <= GLOW; dy++) { const d = Math.hypot(dx, dy); if (d > GLOW || d === 0 || (dx + dy) % 2) continue; o.drawImage(sil, GLOW + dx, GLOW + dy); }
  o.globalAlpha = 1; o.drawImage(cv, GLOW, GLOW); o.globalCompositeOperation = 'source-atop'; o.fillStyle = 'rgba(170,200,255,0.45)'; o.fillRect(0, 0, W, H); o.globalCompositeOperation = 'source-over'; return out; }
function mkCanvas(w, h, like) { try { if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; } if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h); } catch {} return null; }

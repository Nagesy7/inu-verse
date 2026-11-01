// Item hunts: small collectible pins hidden around rooms. A new hunt starts every HUNT_DAYS Sydney days, with a fresh set
// of pins in different rooms. Walk onto a pin to collect it (kept forever in s.club.pins). Free, in-game only.
import { mulberry32 } from '../rng.js';
import { ensureClub } from './state.js';
import { award } from './stamps.js';
import { sydneyYMD } from './parties.js';

export const HUNT_DAYS = 14, PINS_PER_HUNT = 3;
const ANCHOR = Date.UTC(2026, 9, 26) / 864e5; // Monday 26 Oct 2026 (Sydney calendar day index): hunt #0 started here
export const PINS = [
  { id: 'bone', name: 'Golden Bone Pin', icon: 'p_bone' },
  { id: 'blossom', name: 'Jacaranda Blossom Pin', icon: 'p_blossom' },
  { id: 'acorn', name: 'Acorn Pin', icon: 'p_acorn' },
  { id: 'shell', name: 'Seashell Pin', icon: 'p_shell' },
  { id: 'kite', name: 'Paper Kite Pin', icon: 'p_kite' },
  { id: 'teacup', name: 'Teacup Pin', icon: 'p_teacup' },
  { id: 'bell', name: 'Lucky Bell Pin', icon: 'p_bell' },
  { id: 'star', name: 'Star Biscuit Pin', icon: 'p_star' },
  { id: 'doghouse', name: 'Tiny Kennel Pin', icon: 'p_doghouse' },
  { id: 'ramen', name: 'Ramen Bowl Pin', icon: 'p_ramen' },
  { id: 'compass', name: 'Paw Compass Pin', icon: 'p_compass' },
  { id: 'leaf', name: 'Gum Leaf Pin', icon: 'p_leaf' },
];
export const PIN_BY_ID = Object.fromEntries(PINS.map((p) => [p.id, p]));
export const HUNT_ROOMS = ['cafe', 'shop', 'fashion', 'cars', 'bank', 'mall', 'academy', 'park', 'beach', 'shrine'];
const dayIdx = (now) => { const { y, m, d } = sydneyYMD(now); return Date.UTC(y, m - 1, d) / 864e5; };
/** Hunt number at `now` (Sydney days), plus when it started/ends (ISO dates). */
export function huntAt(now = Date.now(), override = null) {
  const n = override != null && Number.isInteger(+override) ? +override : Math.floor((dayIdx(now) - ANCHOR) / HUNT_DAYS);
  const start = new Date((ANCHOR + n * HUNT_DAYS) * 864e5), end = new Date((ANCHOR + (n + 1) * HUNT_DAYS - 1) * 864e5);
  const left = Math.max(0, ANCHOR + (n + 1) * HUNT_DAYS - 1 - dayIdx(now));
  return { n, start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10), daysLeft: left };
}
export const pinsOfHunt = (n) => Array.from({ length: PINS_PER_HUNT }, (_, i) => PINS[(((n * PINS_PER_HUNT + i) % PINS.length) + PINS.length) % PINS.length]);
/** Reachable floor tiles from the scene's first spawn (BFS, 4-way, never through solids). */
export function reachable(sc) {
  const sp = Object.values(sc.spawns || {})[0]; if (!sp) return [];
  const seen = new Set(), q = [[sp[0], sp[1]]], out = []; seen.add(sp[1] * 1000 + sp[0]);
  while (q.length) { const [x, y] = q.shift(); out.push([x, y]);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = ny * 1000 + nx, c = sc.at(nx, ny); if (seen.has(k) || !c || c.solid) continue; seen.add(k); q.push([nx, ny]); } }
  return out;
}
/** Good hiding tiles: reachable, not a door mat / exit / interaction spot, away from the spawn, ideally beside a wall or prop. */
export function hidingTiles(sc) {
  const sp = Object.values(sc.spawns || {})[0] || [0, 0], exits = new Set((sc.exits || []).flatMap((e) => e.tiles.map(([x, y]) => y * 1000 + x))), spots = new Set((sc.spots || []).map((s) => s.ty * 1000 + s.tx));
  const ok = reachable(sc).filter(([x, y]) => { const c = sc.at(x, y); return c && !c.solid && c.floor !== 'mat' && !exits.has(y * 1000 + x) && !spots.has(y * 1000 + x) && Math.abs(x - sp[0]) + Math.abs(y - sp[1]) >= 3; });
  const tucked = ok.filter(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const c = sc.at(x + dx, y + dy); return !c || c.solid; }));
  return tucked.length >= 4 ? tucked : ok;
}
/** The hunt's pins and where each one hides. sceneOf(id) -> compiled scene (src/scenes.js scene). Deterministic per hunt. */
export function huntSpots(n, sceneOf) {
  const rng = mulberry32((n * 7919 + 1013) >>> 0), rooms = HUNT_ROOMS.slice(), out = [];
  for (const pin of pinsOfHunt(n)) {
    while (rooms.length) { const room = rooms.splice(rng.int(rooms.length), 1)[0], sc = sceneOf(room); const tiles = sc ? hidingTiles(sc) : [];
      if (!tiles.length) continue; const [tx, ty] = tiles[rng.int(tiles.length)]; out.push({ pin, room, roomName: sc.name, tx, ty }); break; }
  }
  return out;
}
export const hasPin = (s, id) => !!ensureClub(s).pins[id];
/** Pins already found in hunt n (each hunt's pins can be found once per hunt; your collection keeps them forever). */
export function foundIn(s, n) { const c = ensureClub(s); return c.huntFound && c.huntFound.n === n ? c.huntFound.ids.slice() : []; }
/** Collect a pin of hunt n. Returns { ok, pin, stamps, all, first } (all = every pin of this hunt found, first = new to your collection). */
export function collect(s, n, pinId, now) {
  const pin = PIN_BY_ID[pinId]; if (!pin || !pinsOfHunt(n).some((p) => p.id === pinId)) return { ok: false, reason: 'Not part of this hunt' };
  const c = ensureClub(s); if (!c.huntFound || c.huntFound.n !== n || !Array.isArray(c.huntFound.ids)) c.huntFound = { n, ids: [] };
  if (c.huntFound.ids.includes(pinId)) return { ok: false, reason: 'Already found this hunt' };
  c.huntFound.ids.push(pinId); const at = new Date(now ?? Date.now()).toISOString(), first = !c.pins[pinId];
  c.pins[pinId] = { at: c.pins[pinId]?.at || at, hunt: c.pins[pinId]?.hunt ?? n, times: (c.pins[pinId]?.times || 0) + 1 };
  const all = pinsOfHunt(n).every((p) => c.huntFound.ids.includes(p.id)), stamps = [...award(s, 'pin-first', now), ...(all ? award(s, 'pin-all', now) : [])];
  return { ok: true, pin, stamps, all, first };
}

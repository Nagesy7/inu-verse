// Club features save slice (save v2): Kennel room, stamp book, item hunt pins, party attendance, Inu Times reading.
// Pure helpers: no DOM, no network, no wallet. Everything here is free and in-game (Bones only where anything costs).
export const KENNEL_ID = 'kennel';
export const SAVE_V = 2;
// A new Kennel comes with a few basics (a dog house, a food bowl, a rug and a plant) so it never opens as an empty box.
export const STARTER_KENNEL = [['kennel', 1, 1], ['bowl', 3, 2], ['rug', 5, 3], ['plant', 9, 0]];
const nextUid = (s) => { if (!Number.isFinite(s.uid)) s.uid = 1; return s.uid++; };
export function ensureClub(s) {
  const c = (s.club && typeof s.club === 'object') ? s.club : (s.club = {});
  c.v = 1;
  if (!c.stamps || typeof c.stamps !== 'object') c.stamps = {};
  if (!Array.isArray(c.visited)) c.visited = [];
  if (!c.pins || typeof c.pins !== 'object') c.pins = {};
  if (!c.party || typeof c.party !== 'object') c.party = {};
  c.party.attended ||= {}; c.party.claimed ||= {};
  if (!c.kennel || !Array.isArray(c.kennel.items)) c.kennel = { wall: 0, floor: 0, items: STARTER_KENNEL.map(([id, x, y]) => ({ uid: nextUid(s), id, x, y, rot: 0 })) };
  c.kennel.wall |= 0; c.kennel.floor |= 0;
  if (!c.huntFound || !Array.isArray(c.huntFound.ids)) c.huntFound = { n: null, ids: [] };
  if (c.timesRead === undefined) c.timesRead = null;
  return c;
}
// The personal Kennel room has the same shape as a Bone Street plot home ({ wall, floor, items }), so build mode,
// furniture placement and home sharing all reuse the existing code paths.
export const kennelOf = (s) => ensureClub(s).kennel;
export const roomOf = (s, id) => (id === KENNEL_ID ? kennelOf(s) : s?.plots?.[id]);
export const isKennel = (id) => id === KENNEL_ID;
// v1 -> v2 save migration: keep everything, add the club slice. Returns the same object.
export function migrateSave(s) {
  if (!s || typeof s !== 'object') return s;
  if (s.v === 1) s.v = SAVE_V;
  if (s.v === SAVE_V) ensureClub(s);
  return s;
}

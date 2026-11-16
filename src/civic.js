// Civic life (preview): Hospital, Fire Station, Police Academy, cartoon pickpockets, and the haulers that carry the
// farm / fishery / quarry goods along their chains. Pure + deterministic from (sky day, sky second, saved choices), so
// every device sees the same events and screenshots can be checked. All cartoony: nobody is hurt, nothing is lost for
// good, stolen things are snacks and trinkets that always go back to the stall. Bones are in-game only; no real money.
import { HOUR_S, SKY_DAY_S, LEAVE_H, HOME_H, route } from './workrow.js';
import { ensureTownx, ZJ } from './zonejobs.js';
import { PLACES, placeDoor } from './townx.js';
import { TILE } from './world.js';

const h32 = (n) => { let h = (n | 0) ^ 0x2545f491; h = Math.imul(h ^ (h >>> 16), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const daySec = (sec) => ((sec % SKY_DAY_S) + SKY_DAY_S) % SKY_DAY_S;
export const INJURED_CAP = 8; // a sore paw caps the job multiplier at 8x until the Hospital patches you up
export const CATCH_BONES = 5; // stopping a pickpocket yourself (counts toward the daily job-Bones cap)

// ---------------------------------------------------------------- staff (named, drawn in town)
export const STAFF = Object.freeze({
  officer: { name: 'Officer Biscuit', coat: 'gray', base: 'police' },
  ember: { name: 'Chief Ember', coat: 'red', base: 'firehouse' },
  nurse: { name: 'Nurse Poppy', coat: 'cream', base: 'hospital' },
});

// ---------------------------------------------------------------- hospital
export function treat(s, skyDay = 0) {
  const X = ensureTownx(s); if (!X.injury) return { ok: false, reason: 'Nothing to patch up. You are in great shape!' };
  const was = X.injury; X.injury = null; X.treated = (X.treated || 0) + 1;
  X.log.unshift({ k: 'treated', what: was.what, day: skyDay }); X.log.length = Math.min(X.log.length, 20);
  return { ok: true, was, line: `${STAFF.nurse.name}: "All better! One bandage for ${was.what} and a sticker for being brave."` };
}
export const injuryCap = (s) => (ensureTownx(s).injury ? INJURED_CAP : 0);

// ---------------------------------------------------------------- fires (kitchen + forge)
// Up to two a sky day: a kitchen flare-up (Bakery or Café) and a forge flare-up. The Fire Station crew rolls out and has it
// out by t0+FIRE_OUT; the player can ride along from the Fire Station (or the burning door) and put it out early.
export const FIRE_ROLL = 10, FIRE_ARRIVE = 24, FIRE_OUT = 38, FIRE_SMOKE = 16;
export function firesOf(skyDay) {
  const out = [];
  if (h32(skyDay * 11 + 1) < 0.7) out.push({ id: `k${skyDay}`, kind: 'kitchen', place: h32(skyDay * 5 + 2) < 0.5 ? 'bakery' : 'cafe', t0: (8 + Math.floor(h32(skyDay * 3 + 7) * 4)) * HOUR_S + 15 });
  if (h32(skyDay * 17 + 4) < 0.6) out.push({ id: `f${skyDay}`, kind: 'forge', place: 'forge', t0: (12 + Math.floor(h32(skyDay * 23 + 9) * 4)) * HOUR_S + 30 });
  return out;
}
// phase: upcoming | burning (crew rolling at roll..arrive) | out (smoke) | done. put = saved { [id]: { by, at } }
export function fireState(f, sec, put = {}) {
  const s = daySec(sec), p = put[f.id], outAt = p ? Math.min(p.at, f.t0 + FIRE_OUT) : f.t0 + FIRE_OUT;
  const phase = s < f.t0 ? 'upcoming' : s < outAt ? 'burning' : s < outAt + FIRE_SMOKE ? 'out' : 'done';
  const crew = !p && s >= f.t0 + FIRE_ROLL && s < outAt ? Math.min(1, (s - f.t0 - FIRE_ROLL) / (FIRE_ARRIVE - FIRE_ROLL)) : null; // 0..1 along the route, 1 = hosing
  return { ...f, phase, k: phase === 'burning' ? Math.min(1, (s - f.t0) / 8) : phase === 'out' ? 1 - (s - outAt) / FIRE_SMOKE : 0, by: phase === 'out' || phase === 'done' ? (p ? p.by : 'crew') : null, crew };
}
export const firesAt = (skyDay, sec, put = {}) => firesOf(skyDay).map((f) => fireState(f, sec, put));
export function putOut(s, skyDay, sec, id) {
  const X = ensureTownx(s); X.fires = savedFires(s, skyDay);
  const f = firesAt(skyDay, sec, X.fires).find((q) => q.id === id);
  if (!f || f.phase !== 'burning') return { ok: false, reason: f?.phase === 'upcoming' ? 'No fire there right now.' : 'That fire is already out.' };
  X.fires[id] = { by: 'you', at: daySec(sec) }; X.firesOut = (X.firesOut || 0) + 1;
  X.log.unshift({ k: 'fire', place: f.place, day: skyDay }); X.log.length = Math.min(X.log.length, 20);
  return { ok: true, fire: f, line: `${STAFF.ember.name}: "Nice hose work! The ${PLACES[f.place].name} ${f.kind === 'kitchen' ? 'kitchen' : 'forge'} is safe."` };
}

// ---------------------------------------------------------------- pickpockets (cartoon raccoons and a magpie)
export const THIEVES = Object.freeze([
  { name: 'Sly Socks', kind: 'raccoon' }, { name: 'Pocket Pete', kind: 'raccoon' }, { name: 'Nibbles', kind: 'raccoon' }, { name: 'Glint', kind: 'magpie' }]);
export const STALLS = Object.freeze(['market', 'bakery', 'cafe', 'tailor', 'candles']);
const LOOT = { market: 'an apple', bakery: 'a bread roll', cafe: 'a teacup', tailor: 'a sock', candles: 'a tea light' };
export const SNEAK_S = 22, CHASE_S = 14, CAUGHT_S = 22;
export function crimesOf(skyDay) {
  const out = [];
  for (let i = 0; i < 3; i++) { const r = h32(skyDay * 41 + i * 7 + 1); if (i === 2 && r < 0.4) continue;
    const stall = STALLS[Math.floor(h32(skyDay * 13 + i * 3) * STALLS.length)], th = THIEVES[Math.floor(h32(skyDay * 29 + i) * THIEVES.length)];
    out.push({ id: `c${skyDay}-${i}`, stall, thief: th.name, kind: th.kind, loot: LOOT[stall], t0: (9 + i * 3 + Math.floor(h32(skyDay * 7 + i) * 2)) * HOUR_S + 10 }); }
  return out;
}
// phase: upcoming | sneaking (catchable) | chase (Officer Biscuit runs over) | caught | done. caught = saved { [id]: { by, at } }
export function crimeState(c, sec, caught = {}) {
  const s = daySec(sec), me = caught[c.id];
  const caughtAt = me ? me.at : c.t0 + SNEAK_S + CHASE_S;
  let phase = s < c.t0 ? 'upcoming' : s < (me ? caughtAt : c.t0 + SNEAK_S) ? 'sneaking' : !me && s < caughtAt ? 'chase' : s < caughtAt + CAUGHT_S ? 'caught' : 'done';
  return { ...c, phase, by: phase === 'caught' || phase === 'done' ? (me ? me.by : 'police') : null, chase: phase === 'chase' ? (s - c.t0 - SNEAK_S) / CHASE_S : null };
}
export const crimesAt = (skyDay, sec, caught = {}) => crimesOf(skyDay).map((c) => crimeState(c, sec, caught));
export const CATCH_PX = 46;
export function thiefPos(c) { const d = placeDoor(c.stall); return d ? { x: d.x + 22, y: d.y + 10 } : null; }
export function nearThief(skyDay, sec, caught, x, y) {
  for (const c of crimesAt(skyDay, sec, caught)) { if (c.phase !== 'sneaking') continue; const p = thiefPos(c); if (p && Math.hypot(p.x - x, p.y - y) < CATCH_PX) return c; }
  return null;
}
export function catchThief(s, skyDay, sec, id, day) {
  const X = ensureTownx(s); X.caught = savedCaught(s, skyDay);
  const c = crimesAt(skyDay, sec, X.caught).find((q) => q.id === id);
  if (!c || c.phase !== 'sneaking') return { ok: false, reason: 'Too late, Officer Biscuit has it covered.' };
  X.caught[id] = { by: 'you', at: daySec(sec) }; X.catches = (X.catches || 0) + 1;
  if (X.jobDay.day !== day) X.jobDay = { day, bones: 0 };
  const paid = Math.max(0, Math.min(CATCH_BONES, ZJ.DAILY_CAP - X.jobDay.bones)); X.jobDay.bones += paid; s.bones = (s.bones || 0) + paid;
  X.log.unshift({ k: 'catch', thief: c.thief, stall: c.stall, paid, day: skyDay }); X.log.length = Math.min(X.log.length, 20);
  return { ok: true, crime: c, paid, line: `${c.thief}: "Aw, nuts! Fine, here's ${c.loot} back." ${STAFF.officer.name}: "Great catch, deputy!"` };
}
export const savedCaught = (s, skyDay) => { const X = ensureTownx(s); return Object.fromEntries(Object.entries(X.caught || {}).filter(([k]) => k.startsWith(`c${skyDay}-`))); };
export const savedFires = (s, skyDay) => { const X = ensureTownx(s); return Object.fromEntries(Object.entries(X.fires || {}).filter(([k]) => k.slice(1) === String(skyDay))); };

// ---------------------------------------------------------------- chain haulers (farm, fishery, quarry)
// One hauler per base chain. Each worked hour: load at the workplace, walk the goods to the next stop, come back empty.
export const HAULERS = Object.freeze([
  { id: 'hay', name: 'Hayley', coat: 'golden', good: 'wheat', from: 'farm', to: 'mill', carry: 'wheat', job: 'Farmhand' },
  { id: 'gill', name: 'Gill', coat: 'gray', good: 'fish', from: 'dock', to: 'goods', carry: 'fish', job: 'Fisher' },
  { id: 'flint', name: 'Flint', coat: 'dark', good: 'stone', from: 'quarry', to: 'builders', carry: 'stone', job: 'Quarry hand' },
]);
const along = (path, k) => { const n = path.length - 1, f = Math.max(0, Math.min(1, k)) * n, i = Math.min(n - 1, Math.floor(f)), r = f - i, a = path[i], b = path[Math.min(n, i + 1)];
  return { x: (a[0] + (b[0] - a[0]) * r + 0.5) * TILE, y: (a[1] + (b[1] - a[1]) * r + 0.5) * TILE, face: b[0] > a[0] ? 'right' : b[0] < a[0] ? 'left' : b[1] < a[1] ? 'up' : 'down' }; };
export function haulerAt(h, sec) {
  const s = daySec(sec), hr = s / HOUR_S;
  if (hr < LEAVE_H || hr >= HOME_H) return { visible: false };
  const path = route(h.from, h.to); if (!path || path.length < 2) return { visible: false };
  const k = (s % HOUR_S) / HOUR_S, trips = Math.floor(hr - LEAVE_H);
  if (k < 0.1) { const p = along(path, 0); return { visible: true, kind: 'load', ...p, moving: false, carry: h.carry, trips }; }
  if (k < 0.5) { const p = along(path, (k - 0.1) / 0.4); return { visible: true, kind: 'haul', ...p, moving: true, carry: h.carry, trips }; }
  if (k < 0.58) { const p = along(path, 1); return { visible: true, kind: 'drop', ...p, moving: false, carry: null, trips: trips + 1 }; }
  const p = along(path, 1 - (k - 0.58) / 0.42); return { visible: true, kind: 'back', ...p, face: p.face === 'left' ? 'right' : p.face === 'right' ? 'left' : p.face === 'up' ? 'down' : 'up', moving: true, carry: null, trips: trips + 1 };
}
// staff runs: officer chasing to a stall, fire chief to a fire, both from their station doors
export function runPos(fromPlace, toPlace, k) { const a = placeDoor(fromPlace), b = placeDoor(toPlace); if (!a || !b) return null;
  const path = route(PLACES[fromPlace].lot, PLACES[toPlace].lot); if (!path || path.length < 2) return { x: b.x, y: b.y, face: 'down' };
  return along(path, k); }

// Walk-in doors: entering happens when you walk into a door (no A press), from ANY side.
// Trigger zone per door: the door tile, the tiles left/right of it along the building front, and the two diagonal tiles in
// front of those. It fires when you are pushing (keys, stick, sprint or a tap-walk path) and
//   - you are on the door tile and not heading back out, or
//   - you are beside it pushing sideways toward it, or pushing into the building close to the door edge, or
//   - you are on a diagonal tile pushing toward the door in both axes.
// Fires once: a door only arms when you step onto a zone tile (a new tile), and every enter/exit/spawn disarms everything and
// re-syncs the current tile WITHOUT arming, plus a short cooldown. So spawning outside a door or walking out never fires.
import { TILE, doorDir, isSolid } from './world.js';
export const DOOR_COOLDOWN = 0.9;
export function makeDoorState() { return { armed: new Set(), lastTile: -1, until: 0, resync: true }; }
const FACE_V = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
// zone tiles of door d: [x, y, kind] kind = 'door' | 'side' | 'diag'
export function doorZone(d) { const r = doorDir(d), lx = r.dy !== 0 ? 1 : 0, ly = r.dx !== 0 ? 1 : 0; // lateral axis along the building front
  return [[d.tx, d.ty, 'door'], [d.tx - lx, d.ty - ly, 'side'], [d.tx + lx, d.ty + ly, 'side'], [d.tx - lx - r.dx, d.ty - ly - r.dy, 'diag'], [d.tx + lx - r.dx, d.ty + ly - r.dy, 'diag']]; }
const keyOf = (d) => d.id + ':' + d.kind;
// p = { x, y, face, moving, push?: {x, y} } (push = the direction the player is trying to go, in any units). Returns the door or null.
export function doorStep(st, p, doors, now, armable = doors) { // armable: doors that arm on stepping into their zone, doors: ones allowed to fire now
  const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE), key = ty * 10000 + tx;
  if (key !== st.lastTile) { const fresh = !st.resync; st.lastTile = key; st.resync = false; st.armed.clear();
    if (fresh) for (const d of armable) if (doorZone(d).some(([x, y]) => x === tx && y === ty)) st.armed.add(keyOf(d)); }
  if (now < st.until || !st.armed.size) return null;
  let px = p.push?.x || 0, py = p.push?.y || 0; if (!px && !py && p.moving) [px, py] = FACE_V[p.face] || [0, 0];
  const pl = Math.hypot(px, py); if (pl < 1e-6) return null; px /= pl; py /= pl;
  for (const d of doors) { if (!st.armed.has(keyOf(d))) continue; const z = doorZone(d).find(([x, y]) => x === tx && y === ty); if (!z) continue;
    const r = doorDir(d), inward = px * r.dx + py * r.dy, cx = (d.tx + 0.5) * TILE, cy = (d.ty + 0.5) * TILE, lat = r.dy !== 0 ? Math.abs(p.x - cx) : Math.abs(p.y - cy);
    const toward = (r.dy !== 0 ? (cx - p.x) * px : (cy - p.y) * py) / Math.max(1, lat); // >0: pushing sideways toward the door
    const ok = z[2] === 'door' ? inward > -0.5
      : z[2] === 'side' ? (toward > 0.35) || (inward > 0.5 && lat < TILE * 1.25)
      : (toward > 0.25 && inward > 0.25);
    if (!ok) continue; st.armed.delete(keyOf(d)); st.until = now + DOOR_COOLDOWN; return d; }
  return null; }
// call when entering, returning from inside, spawning or closing a door panel: nothing is armed until you step onto a new tile
export function doorExit(st, now) { st.until = now + DOOR_COOLDOWN; st.armed.clear(); st.resync = true; st.lastTile = -1; } // the tile you are on now never arms; the next one does
// one tile outside the door (opposite the walk-in direction), centred, facing away from the building
export function outsideOf(d) { const r = doorDir(d), face = { up: 'down', left: 'right', right: 'left' }[r.face];
  for (const [ox, oy] of [[-r.dx, -r.dy], [-r.dx - r.dy, -r.dy - r.dx], [-r.dx + r.dy, -r.dy + r.dx], [r.dy, r.dx], [-r.dy, -r.dx]]) { const x = d.tx + ox, y = d.ty + oy; if (!isSolid(x, y)) return { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, face }; }
  return { x: (d.tx + 0.5) * TILE, y: (d.ty + 0.5) * TILE, face }; }

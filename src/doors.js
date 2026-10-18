// Walk-in doors: entering happens when you walk into a door from its stand tile (no A press).
// Debounced: a door only re-arms after you step off its tile, plus a short cooldown after any exit/return.
import { TILE, doorDir, isSolid } from './world.js';
export const DOOR_COOLDOWN = 0.9;
export function makeDoorState() { return { armed: new Set(), lastTile: -1, until: 0 }; }
// p = { x, y, face, moving }; doors = list of door interactables. Returns the door entered (or null).
export function doorStep(st, p, doors, now, armable = doors) { // armable: doors that arm on stepping onto their tile (all of them), doors: ones allowed to fire now
  const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE), key = ty * 10000 + tx;
  if (key !== st.lastTile) { st.lastTile = key; st.armed.clear(); for (const d of armable) if (d.tx === tx && d.ty === ty) st.armed.add(d.id + ':' + d.kind); }
  if (!p.moving || now < st.until) return null;
  for (const d of doors) { if (d.tx !== tx || d.ty !== ty || !st.armed.has(d.id + ':' + d.kind)) continue; const dir = doorDir(d); if (p.face !== dir.face) continue;
    st.armed.delete(d.id + ':' + d.kind); st.until = now + DOOR_COOLDOWN; return d; }
  return null; }
// call when returning from inside / closing a door panel: re-arming needs a step off the tile + cooldown
export function doorExit(st, now) { st.until = now + DOOR_COOLDOWN; st.armed.clear(); }
// one tile outside the door (opposite the walk-in direction), centred, facing away from the building
export function outsideOf(d) { const r = doorDir(d), face = { up: 'down', left: 'right', right: 'left' }[r.face];
  for (const [ox, oy] of [[-r.dx, -r.dy], [-r.dx - r.dy, -r.dy - r.dx], [-r.dx + r.dy, -r.dy + r.dx], [r.dy, r.dx], [-r.dy, -r.dx]]) { const x = d.tx + ox, y = d.ty + oy; if (!isSolid(x, y)) return { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, face }; }
  return { x: (d.tx + 0.5) * TILE, y: (d.ty + 0.5) * TILE, face }; }

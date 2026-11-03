// Facade camera lift: when the player stands at a front door, nudge the follow camera up so the
// building (and its sign) clears the top HUD row on short landscape phones (844x390), while the
// player stays above the chat bar / stick / A pad. Pure + unit-tested; only ever lifts the camera.
import { TILE, BUILDINGS, MALL_BUILDINGS, NPC_HOMES, CLUBHOUSE, BANK, ARCADE, doorTile } from './world.js';

export const HUD_SAFE = 58; // screen px reserved for the top HUD row
export const FOOT_SAFE = 70; // screen px the player's feet stay above (chat bar / pads)
export const SIGN_RISE = 26; // world px painted above b.y (roofs, crowns, sign boards)

/** front doors as world-px points: { x, y (door threshold), top (visual facade top) } */
export function facadeDoors(list = [...BUILDINGS, ...MALL_BUILDINGS, ...NPC_HOMES, CLUBHOUSE, BANK, ARCADE]) {
  const out = [];
  for (const b of list) { if (!b) continue; const d = b.door ? { ...b.door, side: 'front' } : doorTile(b); if (d.side && d.side !== 'front') continue;
    out.push({ id: b.id, x: (d.tx + 0.5) * TILE, y: d.ty * TILE, top: b.y * TILE - SIGN_RISE }); }
  return out;
}

/** proximity weight 0..1 of the player to a door (full within 1.5 tiles across, 0..2 tiles below) */
export function doorWeight(px, py, d) {
  const ax = Math.abs(px - d.x) / TILE, ay = (py - d.y) / TILE;
  if (ay < -0.75 || ay > 3) return 0;
  const wx = ax <= 1.5 ? 1 : ax >= 2.5 ? 0 : 2.5 - ax, wy = ay <= 2 ? 1 : 3 - ay;
  return Math.max(0, Math.min(wx, wy));
}

/** camera y target with the lift applied. vh/zoom/SH describe the viewport (vh = SH / zoom). */
export function liftTarget(defY, px, py, doors, zoom, SH) {
  let best = null, bw = 0;
  for (const d of doors) { const w = doorWeight(px, py, d); if (w > bw) { bw = w; best = d; } }
  if (!best) return defY;
  const vh = SH / zoom, hud = best.top + vh / 2 - HUD_SAFE / zoom, feet = py - vh / 2 + FOOT_SAFE / zoom;
  const want = Math.min(defY, Math.max(hud, feet));
  return defY + (want - defY) * bw;
}

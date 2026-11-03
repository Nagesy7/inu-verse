// Sit spots: benches, swings and café terrace chairs you can sit on (A / E when you're next to one), and everyone else sees it.
// Sync rides what multiplayer already sends: the 'sit' pose code (s.p) plus your position snapped onto the seat, so it works with
// the current realtime Worker (no new message). Swing sway is derived on every client from "a sitter is on a swing seat", so it
// needs nothing on the wire either. Pure: no DOM, no clocks, no randomness.
import { TILE } from './world.js';
import { SEATS as BENCH_SEATS } from './townsfolk.js';

// swing set by Sakura Pond (north park), two seats; frame drawn by sitart.js. Feet y = seat y.
export const SWING_SET = { x: 20.2 * TILE, y: 8 * TILE + 24, w: 3.2 * TILE };
// café terrace in front of the Inu Café (door at tile 4,18): two little round tables, a chair either side
export const CAFE_TABLES = [[6.9 * TILE, 18 * TILE + 22], [9.4 * TILE, 18 * TILE + 22]];
const r = (o) => ({ ...o, x: Math.round(o.x), y: Math.round(o.y) });
export const SPOTS = [
  ...BENCH_SEATS.map(([x, y], i) => ({ id: 'b' + i, kind: 'bench', x, y, face: 'down' })),
  { id: 'sw0', kind: 'swing', x: SWING_SET.x + 0.32 * SWING_SET.w, y: SWING_SET.y, face: 'down' },
  { id: 'sw1', kind: 'swing', x: SWING_SET.x + 0.72 * SWING_SET.w, y: SWING_SET.y, face: 'down' },
  ...CAFE_TABLES.flatMap(([x, y], i) => [{ id: `c${i}l`, kind: 'cafe', x: x - 19, y, face: 'right' }, { id: `c${i}r`, kind: 'cafe', x: x + 19, y, face: 'left' }]),
].map(r);
export const SPOT_NAME = { bench: 'bench', swing: 'swing', cafe: 'café seat' };
export const REACH = 30;     // px: how close you must be to sit
export const ON_SPOT = 3;    // px: a sitter this close to a seat is "on" it (snap is exact; interpolation lands within 0.5 px)
export const TAKEN_R = 12;   // px: another pup this close to a seat has it

// nearest seat within reach (or null); `others` = [{x,y}] of everyone else, taken seats are skipped
export function nearestSpot(x, y, others = [], reach = REACH) { let best = null, bd = reach;
  for (const s of SPOTS) { const d = Math.hypot(s.x - x, s.y - y); if (d < bd && !takenBy(s, others)) { bd = d; best = s; } } return best; }
export const takenBy = (s, others) => others.some((o) => o && Math.hypot(o.x - s.x, o.y - s.y) < TAKEN_R);
// which seat (if any) a pup at x,y is sitting on
export function spotAt(x, y, tol = ON_SPOT) { for (const s of SPOTS) if (Math.abs(s.x - x) <= tol && Math.abs(s.y - y) <= tol) return s; return null; }
// swing sway: smooth pendulum (a in -1..1), phase from the seat so two swings drift apart; reduced motion = small and slow.
// dx/dy are WORLD px for the seat plank; seatPose converts them to pose units (sprites draw at 0.5 x 1.5 = 0.75 world px per unit).
export function swingSway(t, spot, rm = false) { const ph = spot.id === 'sw1' ? 1.9 : 0, a = Math.sin(t * (rm ? 1.2 : 2.1) + ph) * (rm ? 0.25 : 1);
  return { dx: a * 7, dy: -Math.abs(a) * 3, rot: a * 0.12, a }; }
export const POSE_UNIT = 0.75;
// pose tweaks for a pup sitting on a spot (on top of the 'sit' pose): swings sway with the plank, chairs/benches lift a touch
export function seatPose(P, spot, t, rm = false) { if (!P || !spot) return P;
  if (spot.kind === 'swing') { const s = swingSway(t, spot, rm); P.dx += s.dx / POSE_UNIT; P.dy += (s.dy - 9) / POSE_UNIT; P.rot += s.rot; }
  else if (spot.kind === 'cafe') P.dy -= 5 / POSE_UNIT; else P.dy -= 2 / POSE_UNIT;
  P.face = spot.face; return P; }

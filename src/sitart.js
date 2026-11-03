// Pixel art for the new sit spots: a wooden swing set by Sakura Pond and the Inu Café terrace (round tables + chairs).
// Original art, drawn with plain rects in world px (2 px "pixels"), y-sorted props like everything else in the town.
import { SPOTS, SWING_SET, CAFE_TABLES, spotAt, swingSway } from './sitspots.js';

const WOOD = '#8a5a32', WOOD_L = '#b07a48', WOOD_D = '#5a3820', INK = '#141a2e', ROPE = '#d9c49a', ROPE_D = '#9a8460';
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
const SWINGS = SPOTS.filter((s) => s.kind === 'swing'), CHAIRS = SPOTS.filter((s) => s.kind === 'cafe');
const BEAM_Y = SWING_SET.y - 58;

function swingFrame(c) { const x0 = SWING_SET.x, x1 = SWING_SET.x + SWING_SET.w, yb = SWING_SET.y + 4;
  for (const px of [x0 + 4, x1 - 4]) { // A-frame legs (splayed) + cross brace
    for (let i = 0; i < 31; i++) { const yy = BEAM_Y + 2 + i * 2; R(c, px - 1 - i * 0.28, yy, 4, 2, i % 6 ? WOOD : WOOD_D); R(c, px - 1 + i * 0.28, yy, 4, 2, i % 6 ? WOOD_L : WOOD); }
    R(c, px - 6, BEAM_Y + 38, 14, 3, WOOD_D); R(c, px - 11, yb - 2, 8, 3, INK); R(c, px + 5, yb - 2, 8, 3, INK); }
  R(c, x0 - 2, BEAM_Y - 3, x1 - x0 + 4, 7, INK); R(c, x0, BEAM_Y - 2, x1 - x0, 5, WOOD_L); R(c, x0, BEAM_Y + 1, x1 - x0, 2, WOOD_D); }
function swingSeat(c, s, a) { const dx = a * 7, sy = SWING_SET.y - 8 - Math.abs(a) * 3, sx = s.x + dx; // ropes + plank, plank follows the sway
  for (const o of [-11, 9]) { const top = s.x + o, bot = sx + o; for (let i = 0; i <= 24; i++) { const u = i / 24; R(c, top + (bot - top) * u, BEAM_Y + 3 + (sy - BEAM_Y - 3) * u, 2, 2, i % 3 ? ROPE : ROPE_D); } }
  R(c, sx - 14, sy - 1, 28, 6, INK); R(c, sx - 13, sy, 26, 3, '#c8323c'); R(c, sx - 13, sy + 3, 26, 1, '#8a1a24'); }
function chair(c, s) { const dir = s.face === 'right' ? -1 : 1, x = s.x, y = s.y; // back rest on the far side from the table
  R(c, x - 9, y - 12, 18, 5, INK); R(c, x - 8, y - 11, 16, 3, '#2f6fbd'); R(c, x + dir * 7 - 2, y - 30, 5, 20, INK); R(c, x + dir * 7 - 1, y - 29, 3, 18, '#2f6fbd');
  R(c, x - 7, y - 7, 2, 8, INK); R(c, x + 5, y - 7, 2, 8, INK); }
function table(c, x, y, t) { R(c, x - 2, y - 14, 4, 15, INK); R(c, x - 7, y, 14, 2, INK); // pedestal
  R(c, x - 13, y - 21, 26, 8, INK); R(c, x - 12, y - 20, 24, 5, '#fff6e0'); R(c, x - 12, y - 16, 24, 2, '#d8c8a8');
  R(c, x - 4, y - 27, 7, 7, INK); R(c, x - 3, y - 26, 5, 5, '#e88a3a'); R(c, x + 3, y - 25, 2, 3, INK); // mug
  if (Math.sin(t * 1.3 + x) > -0.2) { R(c, x - 2, y - 31 - (t * 6) % 4, 1, 2, '#ffffffaa'); R(c, x, y - 34 - (t * 5) % 4, 1, 2, '#ffffff88'); } } // steam
// props for this frame: sitters = [{x,y}] of pups currently sitting (anyone), so occupied swings swing in step with their pup
export function sitProps(t, sitters = [], rm = false) { const out = [];
  out.push({ y: SWING_SET.y - 20, d: swingFrame });
  for (const s of SWINGS) { const on = sitters.some((p) => spotAt(p.x, p.y) === s); const a = on ? swingSway(t, s, rm).a : (rm ? 0 : Math.sin(t * 0.9 + (s.id === 'sw1' ? 2 : 0)) * 0.12);
    out.push({ y: s.y - 1, d: (c) => swingSeat(c, s, a) }); }
  for (const s of CHAIRS) out.push({ y: s.y - 2, d: (c) => chair(c, s) });
  for (const [x, y] of CAFE_TABLES) out.push({ y: y + 1, d: (c) => table(c, x, y, rm ? 0 : t) });
  return out; }

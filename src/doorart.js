// Pixel art for the Rescue Station and Trainer Gate (procedural, crisp integer rects, same style as arcadeart.js).
import { TILE, GAME_DOORS } from './world.js';
const INK = '#1a1424', R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const txt = (c, s, x, y, size, col) => { c.font = `${size}px Silkscreen, monospace`; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillStyle = INK; c.fillText(s, x + 1, y + 1); c.fillStyle = col; c.fillText(s, x, y); };
function rescue(c, g, t) { const x = g.x * TILE, y = g.y * TILE, w = g.w * TILE, h = g.h * TILE, dx = (g.door.tx - g.x) * TILE;
  R(c, x - 2, y - 8, w + 4, h + 8, INK); R(c, x, y - 6, w, h + 4, '#c8282e'); R(c, x, y - 6, w, 12, '#8a1a22'); for (let k = 0; k < w; k += 12) R(c, x + k, y + 4, 6, 2, '#a01e26');
  R(c, x + 8, y + 14, w - 16, 18, '#f4e3c8'); txt(c, 'RESCUE', x + w / 2, y + 28, 12, '#c8282e');
  const on = Math.floor(t * 3) % 2; R(c, x + w / 2 - 10, y - 14, 8, 6, on ? '#ff3a3a' : '#6a1a1a'); R(c, x + w / 2 + 2, y - 14, 8, 6, on ? '#3a6aff' : '#1a2a6a');
  R(c, x + 10, y + 40, dx - 22, h - 44, '#d8d8d0'); for (let k = y + 44; k < y + h - 4; k += 6) R(c, x + 10, k, dx - 22, 1, '#9a9a90'); // garage door
  R(c, x + dx - 8, y + h - 34, 32, 34, INK); R(c, x + dx - 6, y + h - 32, 28, 32, '#6a3a1a'); R(c, x + dx + 16, y + h - 18, 2, 3, '#f0c840'); // front door
  R(c, x + dx + 30, y + 42, w - dx - 40, 20, '#bfe8ff'); txt(c, 'PUPS IN NEED', x + w - 30, y + h - 8, 6, '#fff'); }
function gate(c, g, t) { const x = g.x * TILE, y = g.y * TILE, w = g.w * TILE, h = g.h * TILE, dx = (g.door.tx - g.x) * TILE;
  R(c, x - 2, y + 6, w + 4, h - 4, INK); R(c, x, y + 8, w, h - 8, '#7a8a9a'); for (let r = y + 14; r < y + h; r += 12) for (let k = (r / 12) % 2 ? 0 : 10; k < w; k += 20) R(c, x + k, r, 18, 10, '#8c9cac'); // stone wall
  R(c, x + dx - 14, y - 6, 8, h + 6, INK); R(c, x + dx + 22, y - 6, 8, h + 6, INK); R(c, x + dx - 12, y - 4, 4, h + 4, '#c8282e'); R(c, x + dx + 24, y - 4, 4, h + 4, '#c8282e'); // posts
  R(c, x - 6, y - 14, w + 12, 10, INK); R(c, x - 4, y - 12, w + 8, 6, '#c8282e'); R(c, x + 4, y - 2, w - 8, 4, INK); // lintel
  R(c, x + dx - 8, y + 4, 32, h - 4, '#2a2a3a'); // opening
  const b = Math.sin(t * 2) * 1.5, cx = x + dx + 8, cy = y + 22 + b; R(c, cx - 8, cy - 8, 16, 16, INK); R(c, cx - 7, cy - 7, 14, 14, '#ffd84a'); R(c, cx - 3, cy - 1, 6, 5, '#7a4a18'); for (const [px, py] of [[-5, -4], [-2, -6], [2, -6], [5, -4]]) R(c, cx + px - 1, cy + py, 3, 3, '#7a4a18'); // paw emblem
  txt(c, 'TRAINER GATE', x + w / 2, y + h - 6, 7, '#ffd84a'); }
export function doorProps(t) { return GAME_DOORS.map((g) => ({ y: (g.y + g.h) * TILE - 1, d: (c) => (g.id === 'rescue' ? rescue(c, g, t) : gate(c, g, t)) })); }

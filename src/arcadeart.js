// Original neon pixel art for the Inu Arcade building (procedural, crisp integer rects).
import { TILE, ARCADE } from './world.js';
const INK = '#141a2e';
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
function txt(c, s, x, y, size, col, glow) { c.font = `${size}px Silkscreen, monospace`; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; if (glow) { c.save(); c.shadowColor = glow; c.shadowBlur = 8; c.fillStyle = col; c.fillText(s, x, y); c.restore(); } c.fillStyle = INK; c.fillText(s, x, y + 1); c.fillStyle = col; c.fillText(s, x, y); }
const NEON = ['#ff4fd8', '#3af0ff', '#ffe14a', '#6aff7a'];
function cabinet(c, x, y, col, t, i) { // 18x30 upright cabinet seen in the window
  R(c, x, y, 18, 30, INK); R(c, x + 1, y + 1, 16, 28, '#2a2050'); R(c, x + 1, y + 1, 16, 4, col);
  const on = 0.6 + 0.4 * Math.sin(t * 5 + i * 1.7); c.save(); c.globalAlpha = on; R(c, x + 3, y + 7, 12, 10, '#0a0f24'); R(c, x + 4, y + 8, 10, 8, col); c.restore();
  R(c, x + 5 + ((t * 6 + i * 3) % 6 | 0), y + 10, 2, 2, '#fff'); R(c, x + 3, y + 19, 12, 3, '#3a3070'); R(c, x + 5, y + 18, 2, 2, '#ff4a4a'); R(c, x + 10, y + 19, 2, 2, '#ffe14a');
}
export function arcadeProps(t, top = []) {
  const x = ARCADE.x * TILE, y = ARCADE.y * TILE, w = ARCADE.w * TILE, h = ARCADE.h * TILE, dx = (ARCADE.door.tx - ARCADE.x) * TILE;
  return [{ y: y + h - 1, d: (c) => {
    // body + roof
    R(c, x - 2, y - 6, w + 4, h + 6, INK); R(c, x, y - 4, w, h + 2, '#1c1638'); R(c, x, y - 4, w, 10, '#2c2258');
    for (let k = 0; k < w; k += 16) R(c, x + k, y + 6, 8, 2, '#3a2e70'); // roof ribs
    // side neon tubes
    const pulse = 0.55 + 0.45 * Math.sin(t * 3);
    c.save(); c.shadowBlur = 10; c.shadowColor = '#ff4fd8'; c.globalAlpha = pulse; R(c, x + 2, y + 10, 3, h - 14, '#ff4fd8'); c.shadowColor = '#3af0ff'; R(c, x + w - 5, y + 10, 3, h - 14, '#3af0ff'); c.restore();
    // marquee with chasing bulbs
    const mx = x + 12, my = y + 14, mw = w - 24, mh = 34; R(c, mx - 2, my - 2, mw + 4, mh + 4, INK); R(c, mx, my, mw, mh, '#3a0f4a');
    for (let k = 0; k < mw; k += 8) { const lit = ((k / 8 + Math.floor(t * 8)) % 3) === 0; R(c, mx + k + 2, my + 2, 3, 3, lit ? '#fff6a0' : '#7a5a2a'); R(c, mx + k + 2, my + mh - 5, 3, 3, !lit ? '#fff6a0' : '#7a5a2a'); }
    txt(c, 'INU ARCADE', x + w / 2, my + 24, 14, NEON[Math.floor(t * 1.5) % 2 ? 0 : 1], NEON[Math.floor(t * 1.5) % 2 ? 0 : 1]);
    // window with glowing cabinets
    const wy = y + 58, wh = h - 58 - 4; R(c, x + 10, wy, w - 20, wh, INK); R(c, x + 12, wy + 2, w - 24, wh - 4, '#0e0a24');
    c.save(); c.globalAlpha = 0.35 + 0.15 * Math.sin(t * 2); R(c, x + 12, wy + 2, w - 24, wh - 4, '#5a2a9a'); c.restore();
    txt(c, 'CHOMP · INVADERS · CROSSING · BREAKER', x + w / 2, wy + 16, 5, '#ffe14a', '#ffe14a');
    for (let i = 0; i < 3; i++) { const sx2 = x + 40 + i * ((w - 80) / 2), on = (Math.floor(t * 2) + i) % 2; c.save(); c.shadowBlur = 8; c.shadowColor = NEON[i]; R(c, sx2 - 8, wy + 26, 16, 2, on ? NEON[i] : '#3a2a5a'); R(c, sx2 - 1, wy + 22, 2, 10, on ? NEON[i] : '#3a2a5a'); c.restore(); }
    const n = Math.floor((w - 40) / 24); for (let i = 0; i < n; i++) { if (x + 20 + i * 24 > x + dx - 26 && x + 20 + i * 24 < x + dx + 14) continue; cabinet(c, x + 20 + i * 24, wy + wh - 36, NEON[i % 4], t, i); }
    // door (front, onto the plaza)
    R(c, x + dx - 14, y + h - 40, 28, 40, INK); R(c, x + dx - 12, y + h - 38, 24, 38, '#3af0ff'); c.save(); c.globalAlpha = 0.5 + 0.3 * Math.sin(t * 4); R(c, x + dx - 10, y + h - 36, 20, 36, '#0e0a24'); c.restore();
    R(c, x + dx - 1, y + h - 36, 2, 36, '#3af0ff'); txt(c, 'OPEN', x + dx, y + h - 44, 7, '#6aff7a', '#6aff7a');
    // top-scores sign out front (left of the door)
    const sx = x + 8, sy = y + h + 4; R(c, sx + 22, sy + 30, 4, 14, '#4a3a5a'); R(c, sx - 2, sy - 2, 52, 36, INK); R(c, sx, sy, 48, 32, '#140c2c');
    txt(c, 'HI-SCORES', sx + 24, sy + 8, 5, '#ffe14a', '#ffe14a');
    (top.length ? top : [{ name: '---', points: 0 }]).slice(0, 3).forEach((r, i) => txt(c, `${i + 1} ${String(r.name).slice(0, 3)} ${r.points ?? r.score ?? 0}`, sx + 24, sy + 16 + i * 7, 5, NEON[(i + 1) % 4]));
  } }];
}

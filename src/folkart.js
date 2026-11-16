// What townsfolk wear and say (preview): scarf / beanie / jacket bought from the Tailor with their in-game Bones,
// plus a speech bubble for "Oh, I want that jacket!" / "Check out my new scarf!". Drawn over the actor's own overlay.
import { drawNpcOverlay } from './npcwork.js';
const INK = '#141a2e';
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
export const WEAR_COL = { scarf: ['#d83a4a', '#ff7a8a'], beanie: ['#3a7ad8', '#8ab8ff'], jacket: ['#4a8a4a', '#7ac87a'] };
export const WEAR = {
  scarf: (c, side) => { const [a, b] = WEAR_COL.scarf; R(c, -20, -66, 40, 10, INK); R(c, -19, -65, 38, 8, a); R(c, -19, -65, 38, 2, b); if (!side) { R(c, 6, -58, 9, 18, INK); R(c, 7, -57, 7, 16, a); R(c, 7, -45, 7, 3, b); } },
  beanie: (c) => { const [a, b] = WEAR_COL.beanie; R(c, -18, -104, 36, 14, INK); R(c, -17, -103, 34, 12, a); R(c, -17, -94, 34, 4, b); R(c, -5, -112, 10, 9, INK); R(c, -4, -111, 8, 7, b); },
  jacket: (c, side) => { const [a, b] = WEAR_COL.jacket; R(c, -22, -60, 44, 30, INK); R(c, -21, -59, 42, 28, a); R(c, -21, -59, 42, 3, b); if (!side) { R(c, -1, -58, 2, 26, INK); R(c, -8, -50, 4, 4, '#ffd84a'); } },
};
export function bubble(c, txt) {
  c.font = '15px Silkscreen, monospace'; const words = txt.split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (c.measureText(t).width > 210 && cur) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur);
  const W = Math.max(...lines.map((l) => c.measureText(l).width)) + 16, H = lines.length * 18 + 10, y0 = -150 - H;
  R(c, -W / 2 - 2, y0 - 2, W + 4, H + 4, INK); R(c, -W / 2, y0, W, H, '#fffbe8'); R(c, -5, y0 + H + 2, 10, 6, INK); R(c, -3, y0 + H, 6, 5, '#fffbe8');
  c.fillStyle = INK; c.textAlign = 'center'; c.textBaseline = 'top'; lines.forEach((l, i) => c.fillText(l, 0, y0 + 6 + i * 18));
}
export function folkOverlay(base, wearing, say, face) {
  if (!wearing && !say) return base;
  const side = face === 'left' || face === 'right';
  return { behind: false, draw(c) {
    c.save(); c.imageSmoothingEnabled = false;
    if (wearing === 'jacket' && face !== 'up') WEAR.jacket(c, side);
    if (wearing === 'scarf') WEAR.scarf(c, side || face === 'up');
    if (wearing === 'beanie') WEAR.beanie(c);
    c.restore();
    if (base) drawNpcOverlay(c, base);
    if (say) { c.save(); bubble(c, say); c.restore(); }
  } };
}

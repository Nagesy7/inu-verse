// What townsfolk wear and say (preview): scarf / beanie / jacket bought from the Tailor with their in-game Bones
// (fitted outfit-atlas layers, see folkOutfit), plus a speech bubble for "Oh, I want that jacket!" / "Check out my new scarf!". Drawn over the actor's own overlay.
import { drawNpcOverlay } from './npcwork.js';
const INK = '#141a2e';
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
export function bubble(c, txt) {
  c.font = '15px Silkscreen, monospace'; const words = txt.split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (c.measureText(t).width > 210 && cur) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur);
  const W = Math.max(...lines.map((l) => c.measureText(l).width)) + 16, H = lines.length * 18 + 10, y0 = -150 - H;
  R(c, -W / 2 - 2, y0 - 2, W + 4, H + 4, INK); R(c, -W / 2, y0, W, H, '#fffbe8'); R(c, -5, y0 + H + 2, 10, 6, INK); R(c, -3, y0 + H, 6, 5, '#fffbe8');
  c.fillStyle = INK; c.textAlign = 'center'; c.textBaseline = 'top'; lines.forEach((l, i) => c.fillText(l, 0, y0 + 6 + i * 18));
}
// Worn items are real outfit-atlas layers (assets/outfits/<coat>.png: npc_beanie / npc_scarf / npc_jacket), drawn by
// art.js drawLayered with the body, so they follow facing (front/side/back, left = mirrored side) and the walk bob.
export const WEAR_ITEM = { beanie: { slot: 'hat', id: 'npc_beanie' }, scarf: { slot: 'neck', id: 'npc_scarf' }, jacket: { slot: 'top', id: 'npc_jacket' } };
export function folkOutfit(outfit, wearing) { const w = WEAR_ITEM[wearing]; return w ? { ...(outfit || {}), [w.slot]: w.id } : outfit; }
export function folkOverlay(base, wearing, say, face) {
  if (!say) return base;
  return { behind: false, draw(c) {
    if (base) drawNpcOverlay(c, base);
    if (say) { c.save(); bubble(c, say); c.restore(); }
  } };
}

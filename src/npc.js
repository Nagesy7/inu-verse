import { TILE, MAP_W, MAP_H, isSolid, findPath } from './world.js';
const NAMES = ['Mochi', 'Kuro', 'Hana', 'Taro', 'Yuzu', 'Goma'];
const COATS = ['tan', 'dark', 'cream', 'red', 'golden', 'gray'];
// NPCs wear Fetch Fashion outfits for variety
export const NPC_OUTFITS = [
  { top: 'suit_navy', bottom: 'slacks_navy', neck: 'tie_red', hat: 'cap_red', feet: 'loafers' },
  { top: 'jacket_black', bottom: 'slacks_black', neck: 'chain_gold', feet: 'sneakers_gold' },
  { top: 'tux_black', bottom: 'slacks_black', neck: 'bowtie', feet: 'loafers' },
  { top: 'hoodie_maroon', bottom: 'jeans_ripped', neck: 'chain_gold', feet: 'sneakers_red' },
  { top: 'gown_white', neck: 'chain_gold' },
  { top: 'hawaiian', bottom: 'chinos', eyes: 'gold_shades', neck: 'chain_gold', feet: 'sneakers_red' },
];
export function spawnNpcs(rng, n = 6) {
  const out = [];
  while (out.length < n) {
    const tx = 2 + rng.int(MAP_W - 4), ty = 6 + rng.int(MAP_H - 10);
    if (isSolid(tx, ty)) continue;
    const i = out.length;
    out.push({ name: NAMES[i], coat: COATS[i], outfit: NPC_OUTFITS[i], face: 'down', x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE, path: [], wait: rng() * 3, dir: 1, phase: 0, moving: false });
  }
  return out;
}
export function updateNpc(n, dt, rng) {
  if (!n.path.length) {
    n.moving = false; n.wait -= dt;
    if (n.wait <= 0) {
      const sx = Math.floor(n.x / TILE), sy = Math.floor(n.y / TILE);
      const tx = Math.max(1, Math.min(MAP_W - 2, sx + rng.int(17) - 8)), ty = Math.max(1, Math.min(MAP_H - 2, sy + rng.int(13) - 6));
      const p = findPath(sx, sy, tx, ty);
      if (p) n.path = p.slice(1);
      n.wait = 1.5 + rng() * 4;
    }
    return;
  }
  const [tx, ty] = n.path[0];
  const gx = (tx + 0.5) * TILE, gy = (ty + 0.5) * TILE, dx = gx - n.x, dy = gy - n.y, d = Math.hypot(dx, dy), sp = 34 * dt;
  if (d <= sp) { n.x = gx; n.y = gy; n.path.shift(); } else { n.x += (dx / d) * sp; n.y += (dy / d) * sp; }
  if (Math.abs(dx) > 1) n.dir = dx > 0 ? 1 : -1;
  n.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  n.moving = true; n.phase += dt * 10;
}

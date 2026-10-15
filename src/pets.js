import { shadeSprite } from './detail.js';
import { hires } from './hires.js';
// Pets: bought like clothes, follow the player, idle + walk animations, can be named and petted.
// Common pets cost Bones; exotic pets cost $KIBBLE through the shared wallet adapter (treasury + pool split).
import { wallet } from './wallet.js';
import { toU } from './mall.js';
export const PETS = {
  kitten:   { name: 'Kitten', cur: 'bones', price: 150, pal: ['#f0a050', '#b86a2a', '#fff1e0'] },
  bunny:    { name: 'Bunny', cur: 'bones', price: 120, pal: ['#f4f1ea', '#c9c3b8', '#ff9fb8'] },
  hamster:  { name: 'Hamster', cur: 'bones', price: 80, pal: ['#e8b070', '#b07840', '#fff4e0'] },
  parrot:   { name: 'Parrot', cur: 'bones', price: 200, pal: ['#3fb04a', '#e8343c', '#ffd84a'] },
  fishbowl: { name: 'Goldfish Bowl', cur: 'bones', price: 60, pal: ['#ff8a2a', '#9fd8f5', '#e6f7ff'] },
  redpanda: { name: 'Red Panda', cur: 'kibble', price: 18, exotic: true, pal: ['#c8502a', '#3a2418', '#fff1e0'] },
  fennec:   { name: 'Fennec Fox', cur: 'kibble', price: 15, exotic: true, pal: ['#e8c88a', '#b08a50', '#fff6ea'] },
  axolotl:  { name: 'Axolotl', cur: 'kibble', price: 12, exotic: true, pal: ['#ffa8c8', '#e86a9a', '#9fd8f5'] },
  peacock:  { name: 'Peacock', cur: 'kibble', price: 22, exotic: true, pal: ['#2a6ad0', '#2aa890', '#e3b341'] },
  dragon:   { name: 'Baby Dragon-Lizard', cur: 'kibble', price: 30, exotic: true, pal: ['#4fb05a', '#2a7038', '#ffd84a'] },
  koi:      { name: 'Golden Koi', cur: 'kibble', price: 25, exotic: true, pal: ['#e3b341', '#fff6ea', '#9fd8f5'] },
  snowowl:  { name: 'Snow Owl', cur: 'kibble', price: 20, exotic: true, pal: ['#f4f6fa', '#9aa0b4', '#ffd84a'] },
};
export function ensurePets(s) { s.pets ||= { owned: [], active: null }; return s.pets; }
export function buyPet(s, species, name) {
  const p = PETS[species], st = ensurePets(s); if (!p) return { ok: false, reason: 'Unknown pet' };
  if (p.cur === 'bones') { if (s.bones < p.price) return { ok: false, reason: `Need ${p.price} bones` }; s.bones -= p.price; }
  else { const r = wallet().purchaseSync({ state: s, itemId: 'pet-' + species, priceU: toU(p.price) }); if (!r.ok) return r; }
  const pet = { id: 'pet' + (st.owned.length + 1), species, name: (name || '').trim().slice(0, 16) || p.name }; st.owned.push(pet); st.active = pet.id; return { ok: true, pet };
}
export function renamePet(s, id, name) { const p = ensurePets(s).owned.find((q) => q.id === id); if (p && name.trim()) p.name = name.trim().slice(0, 16); return p; }
export const activePet = (s) => { const st = ensurePets(s); return st.owned.find((p) => p.id === st.active) || null; };
// follow: trails a few steps behind the player, stops when close (headless)
export function followStep(f, tx, ty, dt) { const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy); f.moving = d > 26; if (f.moving) { const sp = Math.min(d - 20, 120 * dt + d * 2 * dt); f.x += (dx / d) * sp; f.y += (dy / d) * sp; if (Math.abs(dx) > 2) f.dir = dx > 0 ? 1 : -1; f.phase = (f.phase || 0) + dt * 10; } else f.phase = (f.phase || 0) + dt * 2; return f; }

// ---------- pixel sprites (native 16x16, 2 frames) ----------
const cache = new Map();
export function petSprite(species, frame = 0, pal = null) { const k = species + frame + (pal ? pal.join('') : ''); let cv = cache.get(k); if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = 16; cv.height = 16; const c = cv.getContext('2d'), [a, b, e] = pal || PETS[species].pal, I = '#141a2e', P = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); }, f = frame;
  const legs = (xs, y) => xs.forEach((x, i) => P(x, y + ((i + f) % 2 ? 0 : -1), 2, 2, b));
  switch (species) {
    case 'kitten': P(3, 7, 9, 6, I); P(4, 8, 7, 4, a); P(9, 3, 6, 6, I); P(10, 4, 4, 4, a); P(10, 2, 2, 2, I); P(13, 2, 2, 2, I); P(11, 5, 1, 1, I); P(13, 5, 1, 1, I); P(1, 5 + f, 2, 4, a); P(5, 9, 4, 1, b); legs([4, 9], 13); break;
    case 'bunny': P(3, 8, 9, 6, I); P(4, 9, 7, 4, a); P(9, 5, 5, 5, I); P(10, 6, 3, 3, a); P(10, 0, 2, 6, I); P(12, 0 + f, 2, 6, I); P(10, 1, 1, 4, e); P(12, 1 + f, 1, 4, e); P(12, 7, 1, 1, I); P(2, 9, 2, 2, '#ffffff'); legs([4, 9], 14 - f); break;
    case 'hamster': P(3, 7, 11, 7, I); P(4, 8, 9, 5, a); P(4, 11, 9, 2, e); P(11, 9, 1, 1, I); P(10, 6, 2, 2, b); P(5, 6, 2, 2, b); legs([5, 10], 14); break;
    case 'parrot': P(6, 3, 6, 10, I); P(7, 4, 4, 8, a); P(10, 5, 3, 2, e); P(8, 5, 1, 1, I); P(5, 7 - f, 2, 5, b); P(11, 7 - f, 2, 5, b); P(7, 12, 4, 3, b); P(7, 14, 1, 2, '#e3b341'); P(10, 14, 1, 2, '#e3b341'); break;
    case 'fishbowl': P(2, 4, 12, 11, I); P(3, 5, 10, 9, b); P(3, 5, 10, 2, e); P(5 + f * 2, 9, 4, 3, a); P(4 + f * 2, 10, 1, 1, a); P(4, 7, 1, 3, '#ffffff'); P(3, 14, 10, 1, '#c9a46a'); break;
    case 'redpanda': P(2, 7, 10, 6, I); P(3, 8, 8, 4, a); P(3, 11, 8, 1, b); P(9, 3, 6, 6, I); P(10, 4, 4, 4, a); P(10, 6, 4, 2, e); P(11, 5, 1, 1, I); P(13, 5, 1, 1, I); P(0, 6 + f, 3, 6, a); P(0, 8 + f, 3, 1, b); P(0, 10 + f, 3, 1, b); legs([4, 9], 13); break;
    case 'fennec': P(3, 8, 9, 5, I); P(4, 9, 7, 3, a); P(9, 5, 6, 5, I); P(10, 6, 4, 3, a); P(8, 0, 3, 6, I); P(13, 0, 3, 6, I); P(9, 1, 1, 4, e); P(14, 1, 1, 4, e); P(12, 7, 1, 1, I); P(0, 8 + f, 4, 3, a); P(0, 8 + f, 1, 3, e); legs([4, 9], 13); break;
    case 'axolotl': P(2, 8, 12, 5, I); P(3, 9, 10, 3, a); P(10, 6, 5, 6, I); P(11, 7, 3, 4, a); P(9, 5, 1, 3, b); P(15, 5, 1, 3, b); P(9, 11, 1, 2, b); P(12, 8, 1, 1, I); P(0, 9 + f, 3, 2, a); legs([4, 9], 13); break;
    case 'peacock': for (let i = 0; i < 5; i++) { P(0 + i * 2, 1 + (i % 2) + f, 3, 9, b); P(1 + i * 2, 3 + (i % 2) + f, 1, 2, e); } P(8, 5, 5, 8, I); P(9, 6, 3, 6, a); P(10, 2, 3, 4, a); P(13, 3, 1, 1, e); P(11, 1, 1, 1, e); P(9, 13, 1, 2, b); P(11, 13, 1, 2, b); break;
    case 'dragon': P(2, 8, 10, 5, I); P(3, 9, 8, 3, a); P(9, 5, 6, 5, I); P(10, 6, 4, 3, a); P(12, 7, 1, 1, I); P(4, 5 - f, 4, 4, b); P(5, 6 - f, 2, 2, e); P(0, 10, 3, 2, a); P(0, 11, 1, 1, e); for (const x of [4, 6, 8]) P(x, 8, 1, 1, e); legs([4, 9], 13); break;
    case 'koi': P(2, 4, 12, 11, I); P(3, 5, 10, 9, c3(b)); P(5 + f * 2, 8, 5, 3, a); P(6 + f * 2, 9, 2, 1, e); P(3 + f * 2, 9, 2, 1, a); P(4, 6, 1, 3, '#ffffff'); P(3, 14, 10, 1, '#e3b341'); break;
    case 'snowowl': P(4, 3, 9, 11, I); P(5, 4, 7, 9, a); P(6, 5, 2, 2, e); P(9, 5, 2, 2, e); P(6, 5, 1, 1, I); P(10, 5, 1, 1, I); P(8, 7, 1, 1, '#e3b341'); P(5, 9, 7, 1, b); P(4 - f, 7, 1, 4, b); P(12 + f, 7, 1, 4, b); P(6, 14, 1, 2, '#e3b341'); P(10, 14, 1, 2, '#e3b341'); break;
  }
  cv = hires(cv); if (!globalThis.__noDetail) shadeSprite(cv, { r: 2, light: 0.26, dark: 0.28, glint: 'small', grad: 0.14, bands: [0.18, 0.22] }); cache.set(k, cv); return cv; } // 32x32: 2x pixel density (same palette)
const c3 = (x) => x;

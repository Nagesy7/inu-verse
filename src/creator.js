// Character creator logic (pure; UI lives in main.js). Choices -> new game state extras.
import { OPTIONS } from './vendor/profile-schema.js';
import { COATS } from './game.js';
import { TRAITS } from './traits.js';
export { OPTIONS, TRAITS };
export const STARTER_OUTFITS = {
  casual: { name: 'Beach Casual', items: ['hawaiian', 'chinos', 'sneakers_red'] },
  smart: { name: 'Smart', items: ['suit_navy', 'slacks_navy', 'loafers', 'tie_red'] },
  cosy: { name: 'Cosy Hoodie', items: ['hoodie_maroon', 'jeans_ripped'] },
  street: { name: 'Street', items: ['jacket_black', 'jeans_ripped', 'sneakers_gold', 'shades'] },
};
export const HOMES = {
  apartment: { name: 'City Apartment', plot: 'p5', wall: 3, floor: 2, roof: '#5a8de0', items: [['sofa', 1, 4], ['table', 4, 3]], desc: 'Close to the mall & café' },
  cottage: { name: 'Cosy Cottage', plot: 'p2', wall: 2, floor: 1, roof: '#e0735a', items: [['bed', 0, 0], ['chair', 4, 4]], desc: 'Quiet, by the park' },
  farmhouse: { name: 'Farmhouse', plot: 'p1', wall: 1, floor: 0, roof: '#69b67a', items: [['table', 2, 3]], seeds: { turnip: 4 }, desc: 'Nearest the fields, +4 turnip seeds' },
};
export const PATHS = {
  none: { name: 'No path', desc: 'Free spirit' },
  farmer: { name: 'Farmer', desc: '10 seeds + 2 eggs', seeds: { turnip: 6, carrot: 4 }, inv: { egg: 2 } },
  shopkeeper: { name: 'Shopkeeper', desc: '+250 Bones lease fund', bones: 250 },
  worker: { name: 'Worker', desc: 'Red work cap + 40 job XP each', outfit: ['cap_red'], jobXp: 40 },
  socialite: { name: 'Socialite', desc: '2 bouquets + 1 rose bone', gifts: { bouquet: 2, rose_bone: 1 } },
};
const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export function nearestCoat(hex) { const a = hexToRgb(hex); let best = 'tan', bd = 1e9; for (const [k, c] of Object.entries(COATS)) { const b = hexToRgb(c.base), d = a.reduce((t, v, i) => t + (v - b[i]) ** 2, 0); if (d < bd) { bd = d; best = k; } } return best; }
export const defaultChoices = () => ({ name: 'Kabosu', pronouns: 'they/them', coat: OPTIONS.coat[0], pattern: 'none', eyeShape: 'round', eyeColor: OPTIONS.eyeColor[0], ears: 'pointy', tail: 'curl', markings: 'none', size: 'medium', outfit: 'casual', trait: 'hardworker', home: 'cottage', path: 'none' });
export const lookOf = (c) => ({ coat: c.coat, pattern: c.pattern, eyeShape: c.eyeShape, eyeColor: c.eyeColor, ears: c.ears, tail: c.tail, markings: c.markings, size: c.size, accent: '#fff6e8' });
// apply to a fresh newGame() state. deps: { ensureFarm, ensureJobs, ensureRel }
export function applyCreation(s, c, { ensureFarm, ensureJobs, ensureRel } = {}) {
  const pick = (k, list) => (list.includes(c[k]) ? c[k] : defaultChoices()[k]);
  s.player.look = lookOf({ ...defaultChoices(), ...Object.fromEntries(['coat', 'eyeColor', 'pattern', 'eyeShape', 'ears', 'tail', 'markings', 'size'].map((k) => [k, pick(k, OPTIONS[k === 'eyeShape' ? 'eyeShape' : k])])) });
  s.player.coat = nearestCoat(s.player.look.coat); s.player.pronouns = pick('pronouns', OPTIONS.pronouns); s.player.trait = TRAITS[c.trait] ? c.trait : 'hardworker';
  const fit = STARTER_OUTFITS[c.outfit] || STARTER_OUTFITS.casual; s.wardrobe ||= { owned: [], equipped: {} };
  const SLOT = { hawaiian: 'top', chinos: 'bottom', sneakers_red: 'feet', suit_navy: 'top', slacks_navy: 'bottom', loafers: 'feet', tie_red: 'neck', hoodie_maroon: 'top', jeans_ripped: 'bottom', jacket_black: 'top', sneakers_gold: 'feet', shades: 'eyes', cap_red: 'hat' };
  const P = PATHS[c.path] || PATHS.none; for (const id of [...fit.items, ...(P.outfit || [])]) { if (!s.wardrobe.owned.includes(id)) s.wardrobe.owned.push(id); s.wardrobe.equipped[SLOT[id]] = id; }
  const H = HOMES[c.home] || HOMES.cottage; s.plots[H.plot] = { wall: H.wall, floor: H.floor, items: H.items.map(([id, x, y]) => ({ uid: s.uid++, id, x, y, rot: 0 })), roof: H.roof, style: c.home in HOMES ? c.home : 'cottage', starter: true };
  s.player.home = H.plot; s.player.path = c.path in PATHS ? c.path : 'none';
  const f = ensureFarm?.(s); if (f) { for (const [k, n] of Object.entries({ ...(H.seeds || {}) })) f.seeds[k] = (f.seeds[k] || 0) + n; for (const [k, n] of Object.entries(P.seeds || {})) f.seeds[k] = (f.seeds[k] || 0) + n; for (const [k, n] of Object.entries(P.inv || {})) f.inv[k] = (f.inv[k] || 0) + n; }
  if (P.bones) s.bones += P.bones; if (P.gifts) { ensureRel?.(s); s.giftInv ||= {}; for (const [k, n] of Object.entries(P.gifts)) s.giftInv[k] = (s.giftInv[k] || 0) + n; }
  if (P.jobXp && ensureJobs) for (const j of Object.values(ensureJobs(s))) j.xp += P.jobXp;
  return s; }
// re-customise later (salon / mirror). Look + name + pronouns only; trait/home/path are permanent life choices.
export const SALON_PRICE = 120;
export function restyle(s, c) { if (s.bones < SALON_PRICE) return { ok: false, reason: `Need ${SALON_PRICE} Bones` }; s.bones -= SALON_PRICE; const base = { ...defaultChoices(), ...(s.player.look || {}), ...c };
  s.player.look = lookOf(base); s.player.coat = nearestCoat(s.player.look.coat); if (c.name) s.player.name = String(c.name).slice(0, 14); if (OPTIONS.pronouns.includes(c.pronouns)) s.player.pronouns = c.pronouns; s.player.profileAt = 0; return { ok: true }; }

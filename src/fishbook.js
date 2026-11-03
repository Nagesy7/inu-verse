// Fishing collection book: every species you can hook at the Fishing Pond, silhouettes until caught, catch counts, biggest
// size and rarity, plus themed sets that unlock cosmetic badges, nameplate titles and a home trophy. Cosmetic only — it never
// pays Bones or $KIBBLE; the catch itself still lands in the farm inventory exactly as before (minnow / carp / koi goods),
// so the farm market is unchanged. Pure logic (no DOM) so it is unit tested; persisted inside the normal save (state.fishbook).
import { FURNITURE } from './furniture.js';

export const RARITY = { common: { name: 'Common', w: 60, color: '#c9d2e0' }, uncommon: { name: 'Uncommon', w: 26, color: '#7ed957' }, rare: { name: 'Rare', w: 10, color: '#5ab0ff' }, legendary: { name: 'Legendary', w: 4, color: '#ffd23a' } };
// good: which farm good the catch counts as. when: optional condition (night / rain / season list). size in cm.
export const SPECIES = [
  { id: 'silver_minnow', name: 'Silver Minnow', good: 'minnow', rarity: 'common', min: 4, max: 9, color: '#b8c4d6' },
  { id: 'speckled_minnow', name: 'Speckled Minnow', good: 'minnow', rarity: 'common', min: 5, max: 10, color: '#9aa86a' },
  { id: 'pond_loach', name: 'Pond Loach', good: 'minnow', rarity: 'uncommon', min: 8, max: 16, color: '#8a6a4a', when: { rain: true } },
  { id: 'snow_smelt', name: 'Snow Smelt', good: 'minnow', rarity: 'uncommon', min: 9, max: 18, color: '#d8f0ff', when: { seasons: ['winter'] } },
  { id: 'glow_minnow', name: 'Glow Minnow', good: 'minnow', rarity: 'rare', min: 5, max: 11, color: '#7affd8', when: { night: true } },
  { id: 'pond_carp', name: 'Pond Carp', good: 'carp', rarity: 'common', min: 28, max: 62, color: '#8a7a3a' },
  { id: 'mirror_carp', name: 'Mirror Carp', good: 'carp', rarity: 'uncommon', min: 34, max: 74, color: '#a8a090' },
  { id: 'sakura_carp', name: 'Sakura Carp', good: 'carp', rarity: 'uncommon', min: 30, max: 66, color: '#f4a6c0', when: { seasons: ['spring'] } },
  { id: 'sun_perch', name: 'Sun Perch', good: 'carp', rarity: 'uncommon', min: 18, max: 36, color: '#ffb03a', when: { seasons: ['summer'] } },
  { id: 'ghost_carp', name: 'Ghost Carp', good: 'carp', rarity: 'rare', min: 40, max: 86, color: '#e8ecf4', when: { night: true } },
  { id: 'golden_koi', name: 'Golden Koi', good: 'koi', rarity: 'rare', min: 45, max: 90, color: '#ffc83a' },
  { id: 'kohaku_koi', name: 'Kohaku Koi', good: 'koi', rarity: 'rare', min: 45, max: 92, color: '#f04a3a' },
  { id: 'moonlit_koi', name: 'Moonlit Koi', good: 'koi', rarity: 'legendary', min: 55, max: 105, color: '#9ab0ff', when: { night: true } },
  { id: 'rainbow_koi', name: 'Rainbow Koi', good: 'koi', rarity: 'legendary', min: 55, max: 110, color: '#ff7ad8', when: { rain: true } },
];
export const BY_ID = Object.fromEntries(SPECIES.map((s) => [s.id, s]));
// themed sets -> cosmetic badge + title (+ the full book adds a home trophy). No Bones, no $KIBBLE.
export const SETS = {
  smallfry: { name: 'Small Fry', need: SPECIES.filter((s) => s.good === 'minnow').map((s) => s.id), badge: '🐟', title: 'Small Fry' },
  carpclub: { name: 'Carp Club', need: SPECIES.filter((s) => s.good === 'carp').map((s) => s.id), badge: '🎏', title: 'Carp Whisperer' },
  koikeeper: { name: 'Koi Keeper', need: SPECIES.filter((s) => s.good === 'koi').map((s) => s.id), badge: '🏮', title: 'Koi Keeper' },
  nightowl: { name: 'Night Shift', need: SPECIES.filter((s) => s.when?.night).map((s) => s.id), badge: '🌙', title: 'Night Angler' },
  master: { name: 'Master Angler', need: SPECIES.map((s) => s.id), badge: '🎣', title: 'Master Angler', trophy: 'trophy_fish' },
};
if (!FURNITURE.trophy_fish) FURNITURE.trophy_fish = { name: 'Master Angler Trophy', w: 1, h: 1, color: '#3a8ac8', layer: 'obj', draw: 'art', set: 'trophy', cat: 'wall art', store: 'cosy', price: 0, trophy: true };

export function ensureBook(s) { s.fishbook ||= {}; const b = s.fishbook; b.caught ||= {}; b.sets ||= {}; b.title ??= null; b.total ??= 0; return b; }
export const fits = (sp, env = {}) => { const w = sp.when; if (!w) return true; if (w.night && !env.night) return false; if (w.rain && !env.rain) return false; if (w.seasons && !w.seasons.includes(env.season)) return false; return true; };
// species that can bite right now for a given farm good (minnow / carp / koi)
export const pool = (good, env = {}) => SPECIES.filter((s) => s.good === good && fits(s, env));
// r in [0,1): weighted by rarity among the species available in this env
export function pickSpecies(good, r, env = {}) {
  const c = pool(good, env); if (!c.length) return null; const tot = c.reduce((a, s) => a + RARITY[s.rarity].w, 0); let x = Math.min(0.999999, Math.max(0, r)) * tot;
  for (const s of c) { x -= RARITY[s.rarity].w; if (x < 0) return s; } return c[c.length - 1];
}
// size grows with luck (r) and a quick reel (reaction seconds after the bite, 0..0.9)
export function rollSize(sp, r, reaction = 0.45) { const q = Math.min(1, Math.max(0, 0.7 * r + 0.3 * (1 - Math.min(0.9, Math.max(0, reaction)) / 0.9))); return Math.round((sp.min + (sp.max - sp.min) * q) * 10) / 10; }
// record one catch. Returns { species, size, first, record, sets: [newly completed sets] }
export function recordCatch(s, id, size, now = Date.now()) {
  const sp = BY_ID[id]; if (!sp) return null; const b = ensureBook(s), e = b.caught[id] ||= { n: 0, best: 0, first: now }, first = e.n === 0, record = !first && size > e.best;
  e.n++; if (size > e.best) e.best = size; b.total++; return { species: sp, size, first, record, sets: checkSets(s) };
}
export function setProgress(s, id) { const S = SETS[id], b = ensureBook(s), have = S.need.filter((k) => b.caught[k]?.n > 0); return { id, name: S.name, badge: S.badge, title: S.title, have, need: S.need, done: have.length === S.need.length, unlocked: !!b.sets[id] }; }
export function checkSets(s) {
  const b = ensureBook(s), out = [];
  for (const id of Object.keys(SETS)) { const p = setProgress(s, id); if (!p.done || b.sets[id]) continue; b.sets[id] = true; out.push(p);
    s.engage ||= {}; s.engage.badges ||= []; if (!s.engage.badges.includes(SETS[id].badge)) s.engage.badges.push(SETS[id].badge);
    const t = SETS[id].trophy; if (t) { s.engage.trophies ||= []; if (!s.engage.trophies.includes(t)) { s.engage.trophies.push(t); s.inventory ||= {}; s.inventory[t] = (s.inventory[t] || 0) + 1; } } }
  return out;
}
export const titlesOf = (s) => Object.keys(SETS).filter((id) => ensureBook(s).sets[id]).map((id) => SETS[id].title);
export function setTitle(s, title) { const b = ensureBook(s); if (title && !titlesOf(s).includes(title)) return { ok: false, reason: 'Complete that set first' }; b.title = title || null; return { ok: true }; }
export const titleOf = (s) => { const t = s?.fishbook?.title; return t && titlesOf(s).includes(t) ? t : null; };
export function summary(s) { const b = ensureBook(s), seen = SPECIES.filter((x) => b.caught[x.id]?.n > 0).length; return { seen, total: SPECIES.length, catches: b.total }; }

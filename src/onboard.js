// Verse quest-style place onboarding: visit places, learn what they do, earn Bones and optional inventory-only cosmetics.
// Per-place mascots appear once that place is onboarded (as if the mascot onboarded you). Cosmetics follow champion rules:
// inventory-only, never sold (OUTFITS.*.quest === true). Pure logic — no DOM.
import { ensureWardrobe } from './outfits.js';

export const ONBOARD_KEY = 'inuverse.onboard.v1';
export const ONBOARD_MARK = 'verse-onboard-v1';

// Place quests. place = guide/world place id. bones awarded once on complete. cosmetic optional (inventory-only).
export const PLACE_QUESTS = Object.freeze([
  { id: 'launch', place: 'launch', title: 'Launch Hall', bones: 25, cosmetic: null,
    learn: 'Home of live $KIBBLE (price + CA), launch your own coin on pump.fun, register it for billboards, or practice with play tokens. Not financial advice.',
    mascot: { name: 'Launch Luna', coat: 'golden', label: 'placeholder · Inu Art Studio' } },
  { id: 'bank', place: 'bank', title: 'Kibble Bank', bones: 20, cosmetic: null,
    learn: 'Read-only wallet window: $KIBBLE balance, cross-game inventory, purchase history and public prize/burn boards. No deposits, lending or yield.',
    mascot: { name: 'Banker Bao', coat: 'cream', label: 'placeholder · Inu Art Studio' } },
  { id: 'mall', place: 'mall', title: 'Kibble Mall', bones: 20, cosmetic: null,
    learn: 'Luxury outfits, jewels, cars and furniture priced in $KIBBLE (you pay in Phantom). Everyday Bones shops sit nearby.',
    mascot: { name: 'Mall Mochi', coat: 'red', label: 'placeholder · Inu Art Studio' } },
  { id: 'arcade', place: 'arcade', title: 'Inu Arcade', bones: 25, cosmetic: null,
    learn: 'Four retro games. Sign in and your best scores count toward the weekly skill-based prize pools. Free to play.',
    mascot: { name: 'Arcade Aki', coat: 'tan', label: 'placeholder · Inu Art Studio' } },
  { id: 'shuttle', place: 'shuttle', title: 'Arcade Districts', bones: 20, cosmetic: null,
    learn: 'Gate east of the Arcade: Arcade Row cabinets, The Arena, FUD Field, Stadium, Parkour Park and Race Park. Fast travel at kiosks. Just for fun — no Bones or $KIBBLE.',
    mascot: { name: 'District Dash', coat: 'gray', label: 'placeholder · Inu Art Studio' } },
  { id: 'rescue', place: 'rescue', title: 'Rescue Station', bones: 20, cosmetic: null,
    learn: 'Opens Inu Rescue: climb girders and save pups. Your wallet comes along when signed in.',
    mascot: { name: 'Rescue Ruff', coat: 'dark', label: 'placeholder · Inu Art Studio' } },
  { id: 'quest', place: 'quest', title: 'Trainer Gate', bones: 20, cosmetic: null,
    learn: 'Opens Inu Quest, the Shiba creature-collecting RPG. Clearing a gym can complete a weekly cross-game quest step.',
    mascot: { name: 'Trainer Taro', coat: 'golden', label: 'placeholder · Inu Art Studio' } },
  { id: 'cafe', place: 'cafe', title: 'Shiba Sips Café', bones: 25, cosmetic: 'ob_apron_pin',
    learn: 'Take a café shift for Bones. Order dishes at the counter, or chat with workers in hi-vis for more jobs around town.',
    mascot: { name: 'Barista Bean', coat: 'cream', label: 'placeholder · Inu Art Studio' } },
  { id: 'home', place: 'home', title: 'Your home plot', bones: 30, cosmetic: null,
    learn: 'Claim a plot for Bones, then decorate inside with furniture from the Bones shops. Your home is where companions and trophies live.',
    mascot: { name: 'Homey Hana', coat: 'tan', label: 'placeholder · Inu Art Studio' } },
  { id: 'market', place: 'market', title: 'Farmers Market', bones: 15, cosmetic: null,
    learn: 'Sell crops and fish at the farm stalls. Prices shift with the seasons. Farm and fish near the barn and pond.',
    mascot: { name: 'Farmer Fenn', coat: 'red', label: 'placeholder · Inu Art Studio' } },
  { id: 'leaders', place: 'leaders', title: 'Leaderboards Hall', bones: 15, cosmetic: null,
    learn: 'Combined boards from every Inu game. Top 3 each day, week and month share prize pools. Skill only, free entry.',
    mascot: { name: 'Boardie Bolt', coat: 'gray', label: 'placeholder · Inu Art Studio' } },
  { id: 'board', place: 'board', title: 'Prize-pool board', bones: 15, cosmetic: null,
    learn: 'Shows what the daily, weekly and monthly pools hold right now (1% of every $KIBBLE purchase, skill-ranked).',
    mascot: { name: 'Pool Pup', coat: 'dark', label: 'placeholder · Inu Art Studio' } },
]);

// Milestone cosmetics (inventory-only, never sold). Awarded once when thresholds are hit.
export const MILESTONES = Object.freeze([
  { id: 'half', need: 6, bones: 40, cosmetic: 'ob_scout_bandana', toast: 'Verse Scout Bandana unlocked!' },
  { id: 'all', need: PLACE_QUESTS.length, bones: 100, cosmetic: 'ob_verse_pin', toast: 'Verse Graduate Pin unlocked!' },
]);

const ok = (x = {}) => ({ ok: true, ...x });
const fail = (reason) => ({ ok: false, reason });

export function ensureOnboard(s) {
  if (!s || typeof s !== 'object') return null;
  s.onboard ||= {};
  const O = s.onboard;
  if (!O.done || typeof O.done !== 'object') O.done = {};
  if (!O.milestones || typeof O.milestones !== 'object') O.milestones = {};
  if (typeof O.bonesEarned !== 'number') O.bonesEarned = 0;
  return O;
}

export const questByPlace = (place) => PLACE_QUESTS.find((q) => q.place === place || q.id === place) || null;
export const questById = (id) => PLACE_QUESTS.find((q) => q.id === id) || null;
export const isPlaceDone = (s, place) => { const q = questByPlace(place); return !!(q && ensureOnboard(s).done[q.id]); };
export const doneCount = (s) => { ensureOnboard(s); return PLACE_QUESTS.filter((q) => s.onboard.done[q.id]).length; };
export const allDone = (s) => doneCount(s) >= PLACE_QUESTS.length;
export const nextQuest = (s) => PLACE_QUESTS.find((q) => !ensureOnboard(s).done[q.id]) || null;
export const progress = (s) => { const done = doneCount(s); return { done, total: PLACE_QUESTS.length, next: nextQuest(s), bonesEarned: ensureOnboard(s).bonesEarned || 0 }; };

function grantCosmetic(s, id) {
  if (!id) return false;
  const w = ensureWardrobe(s);
  if (w.owned.includes(id)) return false;
  w.owned.push(id);
  return true;
}

function grantBones(s, n) {
  const amt = Math.max(0, Math.floor(n || 0));
  if (!amt) return 0;
  s.bones = (s.bones || 0) + amt;
  s.stats ||= { shifts: 0, bonesEarned: 0, served: 0 };
  s.stats.bonesEarned = (s.stats.bonesEarned || 0) + amt;
  ensureOnboard(s).bonesEarned = (s.onboard.bonesEarned || 0) + amt;
  return amt;
}

/** Complete a place quest (idempotent). Awards Bones + optional place cosmetic, then any newly hit milestones. */
export function completePlace(s, place) {
  const q = questByPlace(place);
  if (!q) return fail('Unknown place');
  const O = ensureOnboard(s);
  if (O.done[q.id]) return fail('Already onboarded here');
  O.done[q.id] = { at: Date.now(), bones: q.bones };
  const bones = grantBones(s, q.bones);
  const cosmetics = [];
  if (q.cosmetic && grantCosmetic(s, q.cosmetic)) cosmetics.push(q.cosmetic);
  const milestones = [];
  const count = doneCount(s);
  for (const m of MILESTONES) {
    if (count >= m.need && !O.milestones[m.id]) {
      O.milestones[m.id] = { at: Date.now() };
      const mb = grantBones(s, m.bones);
      if (m.cosmetic && grantCosmetic(s, m.cosmetic)) cosmetics.push(m.cosmetic);
      milestones.push({ ...m, bones: mb });
    }
  }
  if (allDone(s)) s.onboardComplete = true;
  return ok({ quest: q, bones, cosmetics, milestones, progress: progress(s) });
}

/** Mascot that should appear at a place once the player is onboarded there. */
export function mascotFor(s, place) {
  const q = questByPlace(place);
  if (!q || !isPlaceDone(s, place)) return null;
  return { ...q.mascot, place: q.place, title: q.title, questId: q.id };
}

export function activeMascots(s) {
  ensureOnboard(s);
  return PLACE_QUESTS.filter((q) => s.onboard.done[q.id]).map((q) => ({ ...q.mascot, place: q.place, title: q.title, questId: q.id }));
}

/** Map a world interactable (or panel kind) to an onboard place id. */
export function placeFromInteract(it) {
  if (!it) return null;
  if (it.kind === 'plot' || it.id === 'home') return 'home';
  if (it.kind === 'gamedoor') return it.id; // rescue | quest
  if (it.kind === 'arcade') return 'arcade';
  if (it.kind === 'shuttle') return 'shuttle';
  if (it.kind === 'bank') return 'bank';
  if (it.kind === 'mall' && (it.id === 'mall' || it.cat === 'fashion' || !it.cat)) return 'mall';
  if (it.kind === 'farm' && it.id === 'market') return 'market';
  if (it.kind === 'square' && (it.id === 'board' || it.id === 'quests')) return it.id === 'board' ? 'board' : null;
  if (it.id === 'leaders' || it.kind === 'leaders') return 'leaders';
  if (it.id === 'launch' || it.id === 'cafe' || it.id === 'mall' || it.id === 'arcade' || it.id === 'bank' || it.id === 'market' || it.id === 'board' || it.id === 'leaders') return it.id;
  if (it.kind === 'building') {
    if (it.id === 'launch' || it.id === 'cafe') return it.id;
  }
  return questByPlace(it.id) ? it.id : null;
}

export function placeFromPanel(kind, opts = {}) {
  if (kind === 'launch') return 'launch';
  if (kind === 'bank') return 'bank';
  if (kind === 'mall') return 'mall';
  if (kind === 'arcade' || kind === 'minigames') return 'arcade';
  if (kind === 'fasttravel') return 'shuttle';
  if (kind === 'cafe' || kind === 'diner') return 'cafe';
  if (kind === 'plot' || kind === 'build' || kind === 'home') return 'home';
  if (kind === 'farm' && opts.id === 'market') return 'market';
  if (kind === 'leaders' || kind === 'leaderboards') return 'leaders';
  if (kind === 'city' && opts.tab === 'pools') return 'board';
  if (kind === 'fly5' && opts.tab === 'vip') return null;
  return questByPlace(kind) ? kind : null;
}

export const totalBonesAvailable = () => PLACE_QUESTS.reduce((n, q) => n + q.bones, 0) + MILESTONES.reduce((n, m) => n + m.bones, 0);

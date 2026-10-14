// Item 4: referral twins, free 4-week season pass, collectible sets. Cosmetics only.
import { OUTFITS } from './outfits.js';
import { FURNITURE } from './furniture.js';

const ok = (x = {}) => ({ ok: true, ...x });
const fail = (reason) => ({ ok: false, reason });
const h32 = (s) => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 0xffffffff; };

export const TWIN_OUTFITS = ['hoodie_maroon', 'sneakers_red', 'cap_red'];
export const SEASON_WEEKS = 4, SEASON_DAYS = SEASON_WEEKS * 7;
export const SEASON_TIERS = [
  { at: 0, id: 's_welcome', name: 'Season Sticker', kind: 'note' },
  { at: 40, id: 's_band', name: 'Season Bandana', kind: 'outfit', grant: 'tie_red' },
  { at: 100, id: 's_hat', name: 'Season Cap', kind: 'outfit', grant: 'cap_red' },
  { at: 180, id: 's_jacket', name: 'Season Jacket', kind: 'outfit', grant: 'jacket_black' },
  { at: 280, id: 's_trophy', name: 'Season Home Trophy', kind: 'trophy', furniture: 'trophy_season' },
];
export const XP = { job: 8, duo: 12, farm: 4, pack: 3, login: 5, burn: 6, breed: 10 };

export const COLLECTIONS = {
  fashionista: { name: 'Fetch Fashionista', kind: 'outfit', need: ['gown_white', 'tux_black', 'shades', 'chain_gold'], badge: '★', trophy: 'trophy_fashion' },
  gearhead: { name: 'Zoomster Club', kind: 'car', need: ['hatch', 'sedan', 'supercar'], badge: '🚗', trophy: 'trophy_car', of: (c) => c.model },
  packpup: { name: 'Critter Crew', kind: 'pet', need: ['kitten', 'bunny', 'redpanda'], badge: '🐾', trophy: 'trophy_pet', of: (p) => p.species },
};

const TROPHY_META = {
  trophy_season: { name: 'Season Trophy', color: '#e3b341' },
  trophy_fashion: { name: 'Fashionista Trophy', color: '#e86a9a' },
  trophy_car: { name: 'Zoomster Trophy', color: '#2f6fbd' },
  trophy_pet: { name: 'Critter Trophy', color: '#3f9450' },
};
for (const [id, m] of Object.entries(TROPHY_META)) {
  if (!FURNITURE[id]) FURNITURE[id] = { name: m.name, w: 1, h: 1, color: m.color, layer: 'obj', draw: id === 'trophy_season' ? 'gold_statue' : 'art', set: 'trophy', cat: 'wall art', store: 'cosy', price: 0, trophy: true };
}

export function ensureEngage(s) {
  s.engage ||= {};
  const E = s.engage;
  E.code ||= codeOf(s);
  E.referredBy ||= null;
  E.referrals ||= [];
  E.twins ||= false;
  E.season ||= { id: 's1', startDay: 0, xp: 0, claimed: [], week: 0 };
  E.collections ||= {};
  E.trophies ||= [];
  E.badges ||= [];
  E.outbox ||= [];
  return E;
}

export function codeOf(s) {
  const seed = (s.player?.name || 'PUP') + (s.wallet || '');
  const n = Math.floor(h32(seed) * 36 ** 4).toString(36).toUpperCase().padStart(4, '0').slice(0, 4);
  return 'INU-' + n;
}

function grantTwins(s) {
  s.wardrobe ||= { owned: [], equipped: {} };
  for (const id of TWIN_OUTFITS) if (OUTFITS[id] && !s.wardrobe.owned.includes(id)) s.wardrobe.owned.push(id);
  if (!s.wardrobe.equipped.top && OUTFITS.hoodie_maroon) s.wardrobe.equipped.top = 'hoodie_maroon';
}

export function applyReferral(s, code, day = 0) {
  const E = ensureEngage(s);
  code = String(code || '').toUpperCase().trim();
  if (E.referredBy) return fail('Already used a referral');
  if (!/^INU-[A-Z0-9]{4}$/.test(code)) return fail('Codes look like INU-XXXX');
  if (code === E.code) return fail("That's your own code");
  E.referredBy = code; E.twins = true; grantTwins(s);
  E.outbox.push({ t: 'referral', code, day, twins: TWIN_OUTFITS.slice() });
  return ok({ twins: TWIN_OUTFITS.slice(), code });
}

export function claimReferralCredit(s, fromCode) {
  const E = ensureEngage(s);
  if (E.referrals.includes(fromCode)) return fail('Already credited');
  E.referrals.push(fromCode); E.twins = true; grantTwins(s);
  return ok({ n: E.referrals.length });
}

export function seasonWeek(s, day) {
  const E = ensureEngage(s);
  return Math.min(SEASON_WEEKS - 1, Math.floor(Math.max(0, day - (E.season.startDay || 0)) / 7));
}

export function maybeResetSeason(s, day) {
  const E = ensureEngage(s);
  if (day - (E.season.startDay || 0) >= SEASON_DAYS) {
    const n = (parseInt(String(E.season.id).replace(/\D/g, '') || '1', 10) + 1);
    E.season = { id: 's' + n, startDay: day, xp: 0, claimed: [], week: 0 };
    return true;
  }
  E.season.week = seasonWeek(s, day);
  return false;
}

export function addSeasonXp(s, kind, day = 0) {
  const E = ensureEngage(s); maybeResetSeason(s, day);
  const amt = XP[kind] || 0; if (!amt) return 0;
  if (kind === 'login') { if (E.season.loginDay === day) return 0; E.season.loginDay = day; }
  E.season.xp += amt; return amt;
}

export function claimableTiers(s) {
  const E = ensureEngage(s);
  return SEASON_TIERS.filter((t) => E.season.xp >= t.at && !E.season.claimed.includes(t.id));
}

export function claimTier(s, tierId) {
  const E = ensureEngage(s);
  const t = SEASON_TIERS.find((x) => x.id === tierId);
  if (!t) return fail('Unknown tier');
  if (E.season.xp < t.at) return fail('Not enough season XP');
  if (E.season.claimed.includes(t.id)) return fail('Already claimed');
  E.season.claimed.push(t.id);
  if (t.grant) { s.wardrobe ||= { owned: [], equipped: {} }; if (OUTFITS[t.grant] && !s.wardrobe.owned.includes(t.grant)) s.wardrobe.owned.push(t.grant); }
  if (t.furniture) grantTrophy(s, t.furniture);
  return ok({ tier: t });
}

function grantTrophy(s, fid) {
  const E = ensureEngage(s);
  if (!E.trophies.includes(fid)) E.trophies.push(fid);
  s.inventory ||= {};
  s.inventory[fid] = (s.inventory[fid] || 0) + 1;
}

export function collectionProgress(s, id) {
  const C = COLLECTIONS[id]; if (!C) return null;
  const have = new Set();
  if (C.kind === 'outfit') for (const x of (s.wardrobe?.owned || [])) if (C.need.includes(x)) have.add(x);
  if (C.kind === 'car') for (const c of (s.garage?.cars || [])) { const k = C.of ? C.of(c) : c.model; if (C.need.includes(k)) have.add(k); }
  if (C.kind === 'pet') for (const p of (s.pets?.owned || [])) { const k = C.of ? C.of(p) : p.species; if (C.need.includes(k)) have.add(k); }
  return { id, name: C.name, have: [...have], need: C.need.slice(), done: have.size >= C.need.length, badge: C.badge, trophy: C.trophy };
}

export function checkCollections(s) {
  const E = ensureEngage(s), unlocked = [];
  for (const id of Object.keys(COLLECTIONS)) {
    const p = collectionProgress(s, id);
    if (p.done && !E.collections[id]) {
      E.collections[id] = true;
      if (!E.badges.includes(COLLECTIONS[id].badge)) E.badges.push(COLLECTIONS[id].badge);
      grantTrophy(s, COLLECTIONS[id].trophy);
      unlocked.push(p);
    }
  }
  return unlocked;
}

export const trophiesOf = (s) => ensureEngage(s).trophies.slice();
export const badgesOf = (s) => ensureEngage(s).badges.slice();

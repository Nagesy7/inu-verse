// Inu Verse <-> shared cross-game character profile (kibble-pay /api/profile, schema v1).
// Local store now; setProfileStore(kibblePayProfileStore(kibblePay)) swaps in the server (SIWS-signed PUT).
import { normalizeProfile, defaultProfile, OPTIONS, PROFILE_VERSION } from './vendor/profile-schema.js';
import { OUTFITS } from './outfits.js';
export { OPTIONS, PROFILE_VERSION };
export const LOCAL_KEY = 'inu.profile.v1:';
export const COAT_NAMES = ['Sesame Tan', 'Cream', 'Black & Tan', 'Silver', 'Red', 'Honey', 'Cocoa', 'Snow'];
export const localProfileStore = (ls = globalThis.localStorage) => ({ id: 'local',
  async get(wallet) { try { const r = ls?.getItem(LOCAL_KEY + wallet); return r ? normalizeProfile(JSON.parse(r), wallet) : null; } catch { return null; } },
  async put(p) { const n = { ...normalizeProfile(p, p.wallet), updatedAt: Date.now() }; ls?.setItem(LOCAL_KEY + n.wallet, JSON.stringify(n)); return n; } });
export const kibblePayProfileStore = (kp, local = localProfileStore()) => ({ id: 'kibble-pay',
  async get(wallet) { try { return await kp.getProfile(wallet); } catch { return local.get(wallet); } },
  async put(p) { const n = await local.put(p); try { return await kp.saveProfile(n); } catch { return n; } } });
let store = localProfileStore();
export const setProfileStore = (s) => (store = s || localProfileStore());
export const profileStore = () => store;
export const walletOf = (s) => (s.walletAddr ||= 'local-' + (s.player?.name || 'inu').toLowerCase().replace(/\W/g, '') + '-' + Math.floor((s.clockSec || 0) + (s.uid || 1)));
// resolve wardrobe ids to self-describing slots so other games can draw them without our catalogue
const slotOf = (id) => { const d = OUTFITS[id]; if (!d) return null; const L = d.look || {}; return { id, kind: L.kind || null, c: L.c || L.frame || null, d: L.d || null, accent: L.accent || L.band || L.pin || null, full: !!d.full }; };
export function profileFromState(s) { const P = s.player, eq = s.wardrobe?.equipped || {};
  return normalizeProfile({ v: PROFILE_VERSION, wallet: walletOf(s), name: P.name, pronouns: P.pronouns, look: P.look, trait: P.trait,
    outfit: Object.fromEntries(['hat', 'eyes', 'neck', 'top', 'bottom', 'feet'].map((k) => [k, eq[k] ? slotOf(eq[k]) : null])), cosmetics: [...(s.tourDone ? ['verse-tour-v1'] : []), ...(s.wardrobe?.owned || []), ...(s.fly?.cosmetics || []), ...Object.keys(s.fly?.owned || {})].slice(0, 64),
    pets: [...(s.pups || []).map((p, i) => ({ id: p.id || 'pup' + i, name: p.name, coat: p.coat?.hex || p.coatHex || p.color, rare: !!p.rare, game: 'inu-verse' })), ...(s.pair?.breedPups || []).map((p) => ({ id: p.id, name: p.name, coat: p.look?.coat, rare: !!p.rare, game: 'inu-verse' }))].slice(0, 12) }, walletOf(s)); }
// avatar-ready profile (cached per frame by the caller); null for legacy saves that keep the atlas look
export const hasCustomLook = (s) => !!s?.player?.look;
export async function saveProfile(s) { if (!hasCustomLook(s)) return null; try { return await store.put(profileFromState(s)); } catch { return null; } }
export async function loadProfile(s) { const p = await store.get(walletOf(s)).catch(() => null); if (p && hasCustomLook(s) && p.updatedAt > (s.player.profileAt || 0)) { s.player.look = p.look; s.player.name = p.name; s.player.pronouns = p.pronouns; s.player.profileAt = p.updatedAt; } return p; }
export { defaultProfile, normalizeProfile };

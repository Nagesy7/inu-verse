import { ensureWardrobe } from './outfits.js';
import { normalizeCoat } from './game.js';
export const SAVE_KEY = 'inuverse.save.v1';
export function save(state, storage) {
  storage.setItem(SAVE_KEY, JSON.stringify(state));
  return true;
}
export function load(storage) {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || s.v !== 1 || !s.player || typeof s.bones !== 'number') return null;
    s.plots ||= {}; s.inventory ||= {}; s.tokens ||= []; s.stats ||= { shifts: 0, bonesEarned: 0, served: 0 };
    s.player.coat = normalizeCoat(s.player.coat); ensureWardrobe(s);
    return s;
  } catch { return null; }
}
export function clearSave(storage) { storage.removeItem(SAVE_KEY); }
export class MemoryStorage { constructor() { this.m = new Map(); } getItem(k) { return this.m.has(k) ? this.m.get(k) : null; } setItem(k, v) { this.m.set(k, String(v)); } removeItem(k) { this.m.delete(k); } }

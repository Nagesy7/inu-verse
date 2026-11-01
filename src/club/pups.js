// Pet pups: small companion pups you adopt (Bones), name, feed and play with. Your walking pup follows you (the same follower
// as other pets). Care is gentle: tummy and fun slowly drop over real time, a pup never runs away or gets hurt, it just
// looks hungry or bored until you visit. Pure + headless-testable; the sprite lives in src/pets.js ('pup').
import { ensurePets } from '../pets.js';
import { award } from './stamps.js';

export const ADOPT_PRICE = 100, SNACK_PRICE = 5, MAX_PUPS = 6;
export const PUP_COATS = {
  biscuit: { name: 'Biscuit', pal: ['#e3a35a', '#a8662c', '#fff1dc'] },
  sesame: { name: 'Sesame', pal: ['#c98a4a', '#5a3a22', '#f4dcc0'] },
  snowy: { name: 'Snowy', pal: ['#f4f1ea', '#b9b2a6', '#ffffff'] },
  cocoa: { name: 'Cocoa', pal: ['#6a4a3a', '#3a2418', '#c9a07a'] },
  berry: { name: 'Berry', pal: ['#e07aa8', '#a8487a', '#ffe0ee'] },
  mint: { name: 'Mint', pal: ['#6fcaa8', '#2f8a6a', '#e8fff6'] },
  sky: { name: 'Sky', pal: ['#7aa7e0', '#3a5aa8', '#e6f0ff'] },
  sunny: { name: 'Sunny', pal: ['#f2cc68', '#c08a22', '#fff6d0'] },
};
const FOOD_MIN = 10, FUN_MIN = 8; // minutes per point lost
const clamp = (v) => Math.max(0, Math.min(100, v));
const ms = (now) => (now instanceof Date ? now.getTime() : now ?? Date.now());
export const pupsOf = (s) => ensurePets(s).owned.filter((p) => p.species === 'pup');
export const isPup = (p) => !!p && p.species === 'pup';
/** Care values right now (does not change the save). */
export function careNow(p, now) {
  const c = p.care || { food: 70, fun: 70, t: ms(now) }, mins = Math.max(0, (ms(now) - (c.t || ms(now))) / 60000);
  return { food: Math.round(clamp(c.food - mins / FOOD_MIN)), fun: Math.round(clamp(c.fun - mins / FUN_MIN)) };
}
function settle(p, now) { const c = careNow(p, now); p.care = { food: c.food, fun: c.fun, t: ms(now) }; return p.care; }
export function mood(p, now) { const c = careNow(p, now); return c.food < 30 ? 'hungry' : c.fun < 30 ? 'bored' : c.food >= 60 && c.fun >= 60 ? 'happy' : 'okay'; }
export const MOOD_TEXT = { happy: 'Happy and waggy', okay: 'Doing fine', hungry: 'Tummy rumbling', bored: 'Wants to play' };
export function adoptPup(s, coat, name, now) {
  const k = PUP_COATS[coat]; if (!k) return { ok: false, reason: 'Pick a coat first' };
  const st = ensurePets(s); if (pupsOf(s).length >= MAX_PUPS) return { ok: false, reason: `You can look after up to ${MAX_PUPS} pups` };
  if (!(s.bones >= ADOPT_PRICE)) return { ok: false, reason: `Need ${ADOPT_PRICE} Bones` };
  s.bones -= ADOPT_PRICE;
  const clean = String(name || '').replace(/[<>&"'`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  const pup = { id: 'pet' + (st.owned.length + 1), species: 'pup', coat, pal: k.pal.slice(), name: clean || k.name, care: { food: 80, fun: 80, t: ms(now) }, adopted: new Date(ms(now)).toISOString() };
  while (st.owned.some((q) => q.id === pup.id)) pup.id += 'x';
  st.owned.push(pup); st.active = pup.id;
  const stamps = [...award(s, 'pup-adopt', now), ...(pupsOf(s).length >= 3 ? award(s, 'pup-pack', now) : [])];
  return { ok: true, pup, stamps };
}
const find = (s, id) => pupsOf(s).find((p) => p.id === id) || null;
export function feedPup(s, id, now) {
  const p = find(s, id); if (!p) return { ok: false, reason: 'No such pup' };
  const c = settle(p, now); if (c.food >= 95) return { ok: false, reason: `${p.name} is full!` };
  if (!(s.bones >= SNACK_PRICE)) return { ok: false, reason: `A pup snack costs ${SNACK_PRICE} Bones` };
  s.bones -= SNACK_PRICE; c.food = clamp(c.food + 35); c.fun = clamp(c.fun + 5);
  return { ok: true, pup: p, stamps: award(s, 'pup-feed', now) };
}
export function playPup(s, id, now) {
  const p = find(s, id); if (!p) return { ok: false, reason: 'No such pup' };
  const c = settle(p, now); if (c.fun >= 95) return { ok: false, reason: `${p.name} is already bouncing with joy!` };
  c.fun = clamp(c.fun + 30); c.food = clamp(c.food - 5);
  return { ok: true, pup: p, stamps: award(s, 'pup-play', now) };
}
export function walkPup(s, id) { const p = find(s, id); if (!p) return { ok: false, reason: 'No such pup' }; ensurePets(s).active = p.id; return { ok: true, pup: p }; }
export function homePup(s) { const st = ensurePets(s); if (isPup(st.owned.find((q) => q.id === st.active))) st.active = null; return { ok: true }; }
export function renamePup(s, id, name) { const p = find(s, id), clean = String(name || '').replace(/[<>&"'`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16); if (!p || !clean) return { ok: false, reason: 'Type a name' }; p.name = clean; return { ok: true, pup: p }; }

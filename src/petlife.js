// Pet life (companions round 2): free starter pet, idle behaviours, reactions to the owner's emotes/actions, pet gear
// (collars / bows / hats) bought with Bones through the Pawsome Pets panel, a compact cosmetic wire code so other players see
// your pet trailing you, and capped remote pet followers. Cosmetic only: no stats, no $KIBBLE pricing, no wagers or fees.
import { PETS, ensurePets, activePet } from './pets.js';
import { inSeason } from './seasons.js';

export const STARTER = 'duckling';
// pet gear: slot collar|hat; price in Bones (0 = free claim); season-gated like the seasonal Shiba hats
export const PET_GEAR = Object.freeze({
  cr: { slot: 'collar', name: 'Red Collar', price: 25, c: '#d83a3a' },
  cg: { slot: 'collar', name: 'Gold Collar', price: 80, c: '#e3b341' },
  cb: { slot: 'collar', name: 'Blue Bandana', price: 40, c: '#2a7ad8', kind: 'bandana' },
  bp: { slot: 'hat', name: 'Pink Bow', price: 35, c: '#ff7ab0', kind: 'bow' },
  hp: { slot: 'hat', name: 'Tiny Party Hat', price: 45, c: '#e3b341', kind: 'party' },
  hf: { slot: 'hat', name: 'Daisy Crown', price: 40, kind: 'flowers', season: 'spring' },
  hs: { slot: 'hat', name: 'Tiny Santa Hat', price: 0, kind: 'santa', season: 'xmas' },
  hw: { slot: 'hat', name: 'Tiny Witch Hat', price: 50, kind: 'witch', season: 'halloween' },
});
const fail = (reason) => ({ ok: false, reason });
const gearOf = (st) => (Array.isArray(st.gear) ? st.gear : (st.gear = []));

/** one free starter pet per save (only if you have never claimed it) */
export function claimStarter(s, name) {
  const st = ensurePets(s); if (st.starter || st.owned.some((p) => p.species === STARTER)) return fail('Starter already claimed');
  const pet = { id: 'pet' + (st.owned.length + 1), species: STARTER, name: (name || '').trim().slice(0, 16) || PETS[STARTER].name };
  st.owned.push(pet); st.active = pet.id; st.starter = true; return { ok: true, pet };
}
export const canClaimStarter = (s) => { const st = ensurePets(s); return !st.starter && !st.owned.some((p) => p.species === STARTER); };
/** gear is sold only while its season is on (owned gear stays wearable) */
export const gearOnSale = (id) => { const g = PET_GEAR[id]; return !!g && (!g.season || inSeason(g.season)); };
export function buyGear(s, id) {
  const g = PET_GEAR[id]; if (!g) return fail('Unknown gear'); const st = ensurePets(s), own = gearOf(st);
  if (own.includes(id)) return fail('Already owned'); if (!gearOnSale(id)) return fail('Seasonal - back later');
  if ((s.bones || 0) < g.price) return fail(`Need ${g.price} bones`); s.bones -= g.price; own.push(id); return { ok: true, id };
}
/** put gear on (or take it off with id=null) for the active pet */
export function equipGear(s, id, slot = PET_GEAR[id]?.slot) {
  const st = ensurePets(s), pet = activePet(s); if (!pet) return fail('No pet following you'); if (!slot) return fail('Unknown gear');
  if (id && !gearOf(st).includes(id)) return fail('Buy it first'); pet.gear = { ...(pet.gear || {}), [slot]: id || null }; return { ok: true, gear: pet.gear };
}

// ---- wire code (multiplayer cosmetic field, rides in look.pl.look as one WORD-safe key) ----
export const WIRE_KEY = 'pet';
const SPECIES_OK = /^[a-z]{2,10}$/;
export function petWire(pet) { if (!pet || !PETS[pet.species] || pet.burn) return null; const g = pet.gear || {}; return `${pet.species}-${PET_GEAR[g.collar] ? g.collar : 'x'}-${PET_GEAR[g.hat] ? g.hat : 'x'}`; }
export function fromPetWire(v) { if (typeof v !== 'string' || v.length > 24) return null; const [sp, c, h] = v.split('-'); if (!SPECIES_OK.test(sp || '') || !PETS[sp]) return null;
  return { species: sp, gear: { collar: PET_GEAR[c]?.slot === 'collar' ? c : null, hat: PET_GEAR[h]?.slot === 'hat' ? h : null } }; }
/** add our pet key to an outgoing profile-look, never pushing another key past the 12-key look cap */
export function withPetLook(pl, pet) { const w = petWire(pet); if (!w) return pl; const look = { ...(pl?.look || {}) }; if (Object.keys(look).length >= 12) return pl; look[WIRE_KEY] = w; return { look, outfit: pl?.outfit || {} }; }

// ---- behaviour: idle + reactions (headless; f = follower { x, y, dir, phase, moving }) ----
export const REACT = { heart: 'love', wave: 'hop', bow: 'hop', wag: 'hop', dance: 'spin', dance2: 'spin', dance3: 'spin', zoomies: 'spin', sit: 'sit', lie: 'nap', sleep: 'nap', laugh: 'hop', wow: 'hop', angry: 'hide', sad: 'nuzzle' };
export function petReact(f, kind, t) { const r = REACT[kind] || 'hop'; f.react = { kind: r, t0: t, until: t + (r === 'sit' || r === 'nap' ? 6 : 1.8) }; if (r === 'love') f.love = 2; return r; }
/** call after followStep each frame: idle timer -> sit -> nap; reactions expire; sniff-wander a little while the owner idles */
export function petIdle(f, t, dt, ownerMoving) {
  if (f.moving || ownerMoving) { f.still = 0; if (f.react && (f.react.kind === 'sit' || f.react.kind === 'nap')) f.react = null; f.idle = null; return f; }
  f.still = (f.still || 0) + dt; if (f.react && t > f.react.until) f.react = null;
  f.idle = f.react ? null : f.still > 14 ? 'nap' : f.still > 5 ? 'sit' : f.still > 2 ? 'sniff' : null; return f;
}
/** draw offsets for the current pose: { hop, squash, flip, zz } (reduced effects: no motion) */
export function petPose(f, t, low = false) {
  const r = f.react, k = r ? r.kind : f.idle, e = r ? t - r.t0 : 0;
  if (low) return { hop: 0, squash: k === 'sit' || k === 'nap' ? 0.86 : 1, flip: 1, zz: k === 'nap', kind: k };
  if (k === 'hop') return { hop: -Math.abs(Math.sin(e * 9)) * 9, squash: 1, flip: 1, kind: k };
  if (k === 'spin') return { hop: -Math.abs(Math.sin(e * 7)) * 5, squash: 1, flip: Math.sin(e * 14) >= 0 ? 1 : -1, kind: k };
  if (k === 'sit') return { hop: 0, squash: 0.86, flip: 1, kind: k };
  if (k === 'nap') return { hop: 0, squash: 0.74, flip: 1, zz: true, kind: k };
  if (k === 'hide') return { hop: 0, squash: 0.8, flip: -1, kind: k };
  if (k === 'nuzzle') return { hop: Math.sin(e * 6) * 1.5, squash: 1, flip: 1, kind: k };
  if (k === 'sniff') return { hop: 0, squash: 1, flip: Math.floor(t * 0.8) % 2 ? 1 : -1, kind: k };
  return { hop: 0, squash: 1, flip: 1, kind: null };
}

// ---- remote pets: tiny local followers per remote player (cosmetic), capped for phones ----
export const REMOTE_CAP = { full: 8, low: 3 };
export function stepRemotePets(M, owners, dt, { low = false, follow, me = null, now = 0 } = {}) {
  const cap = low ? REMOTE_CAP.low : REMOTE_CAP.full, out = [], seen = new Set();
  const list = owners.filter((o) => o.pet).map((o) => [o, me ? Math.hypot(o.x - me.x, o.y - me.y) : 0]).sort((a, b) => a[1] - b[1]).slice(0, cap);
  for (const [o] of list) { seen.add(o.id); let f = M.get(o.id); if (!f) { f = { x: o.x - 20, y: o.y + 4, dir: 1, phase: 0, moving: false }; M.set(o.id, f); }
    if (Math.hypot(o.x - f.x, o.y - f.y) > 400) Object.assign(f, { x: o.x - 20, y: o.y + 4 }); follow(f, o.x - 22, o.y + 2, dt);
    const em = o.emote?.kind || o.act?.kind || null; if (em && em !== f.lastEm) petReact(f, em, now); f.lastEm = em; if (f.love > 0) f.love -= dt; petIdle(f, now, dt, !!o.moving); out.push({ f, o }); }
  for (const k of M.keys()) if (!seen.has(k)) M.delete(k); return out;
}

// ---- gear art: drawn in sprite pixels (u = world px per sprite px) over the 16x16 pet sprite ----
// head top-centre + neck per species, in native sprite px (see petSprite in pets.js)
export const ANCHORS = { kitten: [12, 3, 10.5, 8], bunny: [11.5, 5, 10, 9], hamster: [10.5, 7, 10, 10], parrot: [9, 3, 9, 7], fishbowl: [8, 4, 8, 14], redpanda: [12, 3, 10.5, 8],
  fennec: [12, 5, 10.5, 9], axolotl: [12.5, 6, 11, 10], peacock: [11.5, 2, 10, 6], dragon: [12, 5, 10.5, 9], koi: [8, 4, 8, 14], pup: [11.5, 3, 10, 9], minipup: [11.5, 3, 10, 9], snowowl: [8.5, 3, 8.5, 9], duckling: [12, 3, 11, 8] };
export function drawPetGear(c, species, gear, ox, oy, u) {
  if (!gear) return 0; const A = ANCHORS[species] || [11, 4, 10, 9], I = '#141a2e', P = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(ox + x * u), Math.round(oy + y * u), Math.ceil(w * u), Math.ceil(h * u)); }; let n = 0;
  const col = PET_GEAR[gear.collar], hat = PET_GEAR[gear.hat], [hx, hy, nx, ny] = A;
  if (col && species !== 'fishbowl' && species !== 'koi') { n++; if (col.kind === 'bandana') { P(nx - 2, ny - 0.5, 4, 1.4, col.c); P(nx - 1, ny + 0.8, 2, 1, col.c); P(nx - 0.5, ny + 1.6, 1, 0.8, col.c); } else { P(nx - 2, ny - 0.5, 4, 1, col.c); P(nx - 0.5, ny + 0.5, 1, 1, '#ffd84a'); } }
  if (hat) { n++; const k = hat.kind;
    if (k === 'bow') { P(hx - 2.5, hy - 1.5, 2, 2, I); P(hx - 2.3, hy - 1.3, 1.6, 1.6, hat.c); P(hx - 0.5, hy - 1, 1, 1, I); P(hx + 0.5, hy - 1.5, 2, 2, I); P(hx + 0.7, hy - 1.3, 1.6, 1.6, hat.c); }
    else if (k === 'party') { P(hx - 1.5, hy - 1, 3, 1, I); P(hx - 1.2, hy - 1, 2.4, 0.8, hat.c); P(hx - 1, hy - 2, 2, 1, hat.c); P(hx - 0.5, hy - 3, 1, 1, hat.c); P(hx - 0.5, hy - 2, 1, 0.5, '#2ab8c8'); P(hx - 0.5, hy - 4, 1, 1, '#ff4fa0'); }
    else if (k === 'santa') { P(hx - 2, hy - 1, 4, 1, '#f8f8f8'); P(hx - 1.5, hy - 2, 3, 1, '#d42a36'); P(hx - 0.5, hy - 3, 2, 1, '#d42a36'); P(hx + 1, hy - 3.5, 1, 1, '#f8f8f8'); }
    else if (k === 'witch') { P(hx - 2.5, hy - 1, 5, 1, I); P(hx - 2.3, hy - 0.9, 4.6, 0.7, '#3a2458'); P(hx - 1, hy - 2, 2, 1, '#3a2458'); P(hx - 0.5, hy - 3, 1, 1, '#3a2458'); P(hx, hy - 3.6, 1, 0.8, '#3a2458'); P(hx - 1, hy - 1.4, 2, 0.4, '#ff8a1a'); }
    else if (k === 'flowers') { P(hx - 2, hy - 0.5, 4, 0.5, '#3f8a3a'); for (const [dx, cc] of [[-2, '#ffffff'], [-0.5, '#ffd84a'], [1, '#ff8ab8']]) P(hx + dx, hy - 1.5, 1, 1, cc); } }
  return n;
}

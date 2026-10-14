// City flywheels: featured billboards, burn-for-status cosmetics, prize-pool HUD, President free drops.
// Cosmetics and status only. No paid entry, no chance prizes.
import { wallet } from './wallet.js'; import { toU } from './mall.js'; import { ensureMall } from './mall.js';
export const FEATURED_SLOTS = {
  bb1: { id: 'bb1', name: 'Bone Street East Billboard', price: 8, hours: 24 },
  bb2: { id: 'bb2', name: 'Bone Street West Billboard', price: 6, hours: 24 },
};
// burn-for-status: limited editions. Paying burns the $KIBBLE (out of circulation); supply is numbered.
export const STATUS = {
  supercar_01: { kind: 'car', name: 'No.1 Golden Zoomster', burn: 40, supply: 50, glow: '#ffd23a' },
  supercar_02: { kind: 'car', name: 'No.2 Midnight Phantom', burn: 40, supply: 50, glow: '#7aa7e0' },
  pet_aurora: { kind: 'pet', name: 'Aurora Kitsune', burn: 25, supply: 100, glow: '#ff7aa8' },
  pet_void: { kind: 'pet', name: 'Void Pup', burn: 25, supply: 100, glow: '#9b7aff' },
  store_sakura: { kind: 'storefront', name: 'Sakura Storefront Skin', burn: 15, supply: 200, glow: '#ffb0c8' },
  store_gold: { kind: 'storefront', name: 'Gilded Storefront Skin', burn: 18, supply: 150, glow: '#e3b341' },
};
export const PRES_DROPS = [
  { id: 'pres_scarf', name: "President's Scarf", slot: 'neck' },
  { id: 'pres_pin', name: 'Golden Seal Pin', slot: 'neck' },
  { id: 'pres_cap', name: 'Visit Day Cap', slot: 'hat' },
];
export function ensureFly(s) { s.fly ||= {}; const f = s.fly;
  f.featured ||= {}; f.burns ||= {}; f.owned ||= {}; f.drops ||= {}; f.burnedTotal ||= 0; f.claimDay ||= -1; return f; }
export function featuredOf(s, slotId, nowH = 0) { const r = ensureFly(s).featured[slotId]; if (!r) return null; if (r.untilH <= nowH) { delete ensureFly(s).featured[slotId]; return null; } return r; }
export function rentFeatured(s, slotId, ticker, nowH) { const S = FEATURED_SLOTS[slotId]; if (!S) return { ok: false, reason: 'No such slot' };
  if (featuredOf(s, slotId, nowH)) return { ok: false, reason: 'Already featured' }; const priceU = toU(S.price);
  const buy = wallet().purchaseSync({ state: s, itemId: 'featured:' + slotId, priceU }); if (!buy.ok) return buy;
  ensureFly(s).featured[slotId] = { ticker, by: s.player?.name || 'you', untilH: nowH + S.hours, price: S.price }; return { ok: true, untilH: nowH + S.hours, quote: buy.quote }; }
export function burnedCount(s, id) { return ensureFly(s).burns[id] || 0; }
export function remaining(s, id) { const S = STATUS[id]; return S ? Math.max(0, S.supply - burnedCount(s, id)) : 0; }
export function burnForStatus(s, id) { const S = STATUS[id]; if (!S) return { ok: false }; if (remaining(s, id) <= 0) return { ok: false, reason: 'Sold out' };
  if (ensureFly(s).owned[id]) return { ok: false, reason: 'Already owned' }; const priceU = toU(S.burn);
  const w = wallet(); if (!w.burnSync) return { ok: false, reason: 'Wallet cannot burn yet' };
  const buy = w.burnSync({ state: s, itemId: 'burn:' + id, amountU: priceU }); if (!buy.ok) return buy;
  const f = ensureFly(s); f.burns[id] = (f.burns[id] || 0) + 1; f.owned[id] = { n: f.burns[id], at: Date.now() }; f.burnedTotal += S.burn;
  if (S.kind === 'car') grantBurnCar(s, id, S); if (S.kind === 'storefront') grantBurnStore(s, id); if (S.kind === 'pet') grantBurnPet(s, id, S);
  return { ok: true, n: f.burns[id], left: remaining(s, id), glow: S.glow, burnedU: buy.burnedU }; }
function grantBurnCar(s, id, S) { s.garage ||= { cars: [], active: null, parked: null }; if (s.garage.cars.find((c) => c.burnId === id)) return;
  const car = { id: 'burn-' + id, model: 'supercar', color: id.endsWith('02') ? 'Black' : 'Gold', burn: true, burnId: id, n: ensureFly(s).owned[id].n, glow: S.glow, name: S.name }; s.garage.cars.push(car); s.garage.active ??= car.id; }
function grantBurnStore(s, id) { if (!s.biz?.mine) return; s.biz.mine.looks ||= {}; s.biz.mine.looks[id] = true; s.biz.mine.look = id === 'store_gold' ? 'gold' : 'sakura'; }
function grantBurnPet(s, id, S) { s.pets ||= { owned: [], active: null }; if (s.pets.owned.find((p) => p.burnId === id)) return;
  const pet = { id: 'burn-' + id, species: 'redpanda', name: S.name, exotic: true, burn: true, burnId: id, glow: S.glow, pal: [S.glow, '#3a2418', '#fff1e0'] }; s.pets.owned.push(pet); s.pets.active ??= pet.id; }
export function statusGlow(s) { const f = ensureFly(s); for (const id of Object.keys(f.owned || {})) if (STATUS[id]?.glow) return STATUS[id].glow; return null; }
export function poolsOf(s) { const m = ensureMall(s); return { daily: m.pools.daily, weekly: m.pools.weekly, monthly: m.pools.monthly, treasury: m.treasury }; }
export function claimPresDrop(s, visitKey) { const f = ensureFly(s); if (f.drops[visitKey]) return { ok: false, reason: 'Already claimed this visit' };
  const drop = PRES_DROPS[Math.abs(hash(visitKey)) % PRES_DROPS.length]; f.drops[visitKey] = drop.id;
  f.cosmetics ||= []; if (!f.cosmetics.includes(drop.id)) f.cosmetics.push(drop.id);
  s.wardrobe ||= { owned: [], equipped: {} }; if (!s.wardrobe.owned.includes(drop.id)) s.wardrobe.owned.push(drop.id); // wearable; player can equip from Wardrobe
  return { ok: true, drop }; }
const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

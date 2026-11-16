// Town economy extras (preview): places you can walk up to in the reviewed town. Each place opens one card with what you
// can do there: work a shift (job mini-game), shop (relationship + discounts), challenge the owner, get patched up...
// Pure data + small helpers here; the card HTML lives in townxui.js. Positions are townproposal lot doors (tiles).
import { lotById } from './townproposal.js';
import { TILE } from './world.js';
import { ZJOBS } from './zonejobs.js';

// place id -> { lot, name, job?, shop?, civic? }. The job/shop/civic keys are filled in by each feature.
export const PLACES = Object.freeze({
  sawmill: { id: 'sawmill', lot: 'sawmill', name: 'Sawmill', job: 'sawmill' },
  mine: { id: 'mine', lot: 'mine', name: 'Mine', job: 'mine' },
  forge: { id: 'forge', lot: 'forge', name: 'Forge', job: 'forge', shop: 'forge' },
  bakery: { id: 'bakery', lot: 'bakery', name: 'Bakery', job: 'bakery', shop: 'bakery' },
  farm: { id: 'farm', lot: 'farm', name: 'Wheat Farm', job: 'farm' },
  quarry: { id: 'quarry', lot: 'quarry', name: 'Quarry', job: 'quarry' },
  fishery: { id: 'fishery', lot: 'dock', name: 'Fishery', job: 'fishery' },
  docks: { id: 'docks', lot: 'eastdock', name: 'East Dock', job: 'docks' },
  tailor: { id: 'tailor', lot: 'tailor', name: 'Tailor', shop: 'tailor' },
  market: { id: 'market', lot: 'goods', name: 'Market', shop: 'market' },
  cafe: { id: 'cafe', lot: 'sip', name: 'Café', shop: 'cafe' },
  candles: { id: 'candles', lot: 'candles', name: 'Candle Works', shop: 'candles' },
  exchange: { id: 'exchange', lot: 'exchange', name: 'Town Exchange', civic: 'exchange' },
  townhall: { id: 'townhall', lot: 'town-hall', name: 'Town Hall', civic: 'townhall' },
  police: { id: 'police', lot: 'police', name: 'Police Academy', job: 'police', civic: 'police' },
  hospital: { id: 'hospital', lot: 'hospital', name: 'Hospital', civic: 'hospital' },
  firehouse: { id: 'firehouse', lot: 'firehouse', name: 'Fire Station', civic: 'fire' },
});
export const PLACE_IDS = Object.freeze(Object.keys(PLACES));
export const NEAR_PX = 34;

export function placeDoor(id) { const p = PLACES[id], l = p && lotById(p.lot); return l ? { tx: l.door[0], ty: l.door[1], x: (l.door[0] + 0.5) * TILE, y: (l.door[1] + 0.5) * TILE } : null; }
export function nearPlace(x, y) {
  let best = null, bd = NEAR_PX;
  for (const id of PLACE_IDS) { const d = placeDoor(id); if (!d) continue; const k = Math.hypot(x - d.x, y - d.y); if (k < bd) { bd = k; best = PLACES[id]; } }
  return best;
}
export function promptOf(p) {
  if (!p) return null;
  const bits = [];
  if (p.job) bits.push(`work: ${ZJOBS[p.job]?.name || p.job}`);
  if (p.shop) bits.push('shop');
  if (p.civic === 'exchange') bits.push('walk in');
  else if (p.civic && !p.job) bits.push('visit');
  return { label: `${p.name} · ${bits.join(' · ')}`, verb: p.civic === 'exchange' ? 'ENTER' : p.job ? 'WORK' : p.shop ? 'SHOP' : 'VISIT' };
}

// little hanging signs over doors so places are findable (drawn in world space, sorted with the props)
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
export function placeProps(t = 0, near = null) {
  const list = [];
  for (const id of PLACE_IDS) { const p = PLACES[id], d = placeDoor(id); if (!d) continue;
    const on = near && near.id === id, bob = on ? Math.round(Math.sin(t * 5) * 2) : 0, x = d.x + 12, y = d.y - 30 + bob;
    list.push({ y: d.y - 18, d: (c) => { R(c, x - 1, y - 1, 14, 14, '#141a2e'); R(c, x, y, 12, 12, p.job ? '#d4a640' : p.shop ? '#7fd1b9' : '#9fb8ff');
      if (p.job) { R(c, x + 5, y + 2, 2, 8, '#141a2e'); R(c, x + 3, y + 2, 6, 3, '#141a2e'); } // hammer = job here
      else if (p.shop) { R(c, x + 2, y + 4, 8, 6, '#141a2e'); R(c, x + 4, y + 2, 4, 2, '#141a2e'); } // bag = shop
      else { R(c, x + 5, y + 2, 2, 8, '#141a2e'); R(c, x + 2, y + 5, 8, 2, '#141a2e'); } } }); // cross = civic
  }
  return list;
}

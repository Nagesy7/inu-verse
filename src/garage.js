// Buyable cars: Zoomies Motors (everyday, Bones) + Zoomies Luxury Autos (luxury, $KIBBLE via the wallet adapter, 2% split).
import { wallet } from './wallet.js';
import { toU } from './mall.js';
export const CAR_MODELS = {
  hatch:       { name: 'Pupper Hatchback', kind: 'hatch', dealer: 'cars', price: 400, cur: 'bones', speed: 190, blurb: 'Zippy little city runabout.' },
  sedan:       { name: 'Fetch Sedan', kind: 'sedan', dealer: 'cars', price: 650, cur: 'bones', speed: 205, blurb: 'Comfy family cruiser.' },
  suv:         { name: 'Trailsniffer SUV', kind: 'suv', dealer: 'cars', price: 900, cur: 'bones', speed: 200, blurb: 'Room for the whole Pack.' },
  pickup:      { name: 'Bone Hauler Pickup', kind: 'pickup', dealer: 'cars', price: 800, cur: 'bones', speed: 195, blurb: 'Hauls bones by the bed-load.' },
  coupe:       { name: 'Zoomie GT Coupe', kind: 'coupe', dealer: 'luxauto', price: 40, cur: 'kibble', speed: 250, blurb: 'Sports coupe, tuned for zoomies.' },
  convertible: { name: 'Sea Breeze Convertible', kind: 'convertible', dealer: 'luxauto', price: 55, cur: 'kibble', speed: 235, blurb: 'Ears in the wind.' },
  supercar:    { name: 'Zoomstar Supercar', kind: 'supercar', dealer: 'luxauto', price: 90, cur: 'kibble', speed: 280, blurb: 'Fastest thing on four paws.' },
  limo:        { name: 'Gold Bone-mobile Limo', kind: 'limo', dealer: 'luxauto', price: 65, cur: 'kibble', speed: 210, blurb: 'Fit for a President.' },
};
export const CAR_COLORS = { Red: '#c8323c', Blue: '#2f6fbd', Green: '#3f9450', Gold: '#e3b341', White: '#f2efe6', Black: '#232633', Pink: '#e86a9a', Purple: '#7a4ac0' };
export function ensureGarage(s) { s.garage ||= { cars: [], active: null, parked: null }; return s.garage; }
export const ownsModel = (s, model) => ensureGarage(s).cars.some((c) => c.model === model);
export function buyCar(s, model, color) {
  const m = CAR_MODELS[model], g = ensureGarage(s), col = CAR_COLORS[color] ? color : 'Red'; if (!m) return { ok: false, reason: 'Unknown model' };
  if (m.cur === 'bones') { if (s.bones < m.price) return { ok: false, reason: `Need ${m.price} bones` }; s.bones -= m.price; }
  else { const r = wallet().purchaseSync({ state: s, itemId: 'car-' + model, priceU: toU(m.price) }); if (!r.ok) return r; }
  const car = { id: 'c' + (g.cars.length + 1) + '-' + model, model, color: col }; g.cars.push(car); g.active ??= car.id; return { ok: true, car };
}
export const carOf = (s, id) => ensureGarage(s).cars.find((c) => c.id === id);

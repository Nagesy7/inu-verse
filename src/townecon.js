// Town economy model (preview). Pure + deterministic from (sky day, sky second, what the player did), so every device
// sees the same numbers and screenshots can be checked against them. Units are in-game goods; Bones are in-game only.
// Row workplaces: real deliveries from the day plans (workrow.js). Base workplaces (sawmill, mine...): a steady rate
// while their crews are on shift (7:00-17:00). The player's job shifts add goods; shop sales and lunches use them up.
import { townStock, HOUR_S, LEAVE_H, HOME_H, SKY_DAY_S } from './workrow.js';

export const BATCH = 4; // units in one row delivery
// good -> who makes it, where it goes, and (base goods) units per working hour
export const GOODS = Object.freeze({
  planks: { name: 'Planks', from: 'Sawmill', to: "Builders' Yard", rate: 3 },
  ore: { name: 'Ore', from: 'Mine', to: 'Smelter', rate: 3 },
  bars: { name: 'Metal bars', from: 'Smelter', to: 'Forge', rate: 1.5 },
  tools: { name: 'Tools', from: 'Forge', to: 'Forge counter', rate: 1 },
  wheat: { name: 'Wheat', from: 'Wheat Farm', to: 'Flour Mill', rate: 3 },
  bread: { name: 'Bread', from: 'Bakery', to: 'Bakery counter', rate: 3 },
  fish: { name: 'Fish', from: 'Fishery', to: 'Market', rate: 2 },
  stone: { name: 'Stone', from: 'Quarry', to: "Builders' Yard", rate: 2 },
  cargo: { name: 'Cargo', from: 'East Dock', to: 'Delivery Depot', rate: 1.5 },
  fruit: { name: 'Fruit', from: 'Orchard', to: 'Market', row: true },
  honey: { name: 'Honey', from: 'Apiary', to: 'Bakery', row: true },
  milk: { name: 'Milk', from: 'Dairy', to: 'Café', row: true },
  pots: { name: 'Pots', from: 'Pottery', to: 'Market', row: true },
  chairs: { name: 'Chairs', from: "Carpenter's Shop", to: 'Golden Den', row: true },
  wool: { name: 'Wool', from: 'Sheep Meadow', to: 'Tailor', row: true },
  tea: { name: 'Tea', from: 'Tea Garden', to: 'Café', row: true },
  candles: { name: 'Candles', from: 'Candle Works', to: 'Homes', row: true },
  letters: { name: 'Letters', from: 'Post Office', to: 'Homes', row: true },
  papers: { name: 'Papers', from: 'Print Shop', to: 'Noticeboard', row: true },
});
export const GOOD_IDS = Object.freeze(Object.keys(GOODS));
export const workedHours = (sec) => { const h = (((sec % SKY_DAY_S) + SKY_DAY_S) % SKY_DAY_S) / HOUR_S; return Math.max(0, Math.min(HOME_H, h) - LEAVE_H); };

/** goods made so far today. made = player's shift output for this sky day ({ good: n }) */
export function production(sec, made = {}) {
  const out = Object.fromEntries(GOOD_IDS.map((g) => [g, 0]));
  const wh = workedHours(sec);
  for (const g of GOOD_IDS) if (!GOODS[g].row) out[g] = Math.floor(GOODS[g].rate * wh);
  for (const e of townStock(sec)) if (out[e.good] != null) out[e.good] += e.delivered * BATCH;
  out.letters = Math.round(out.letters / BATCH) * 2; out.papers = Math.round(out.papers / BATCH) * 3; // letters + papers counted per bundle
  for (const [g, n] of Object.entries(made || {})) if (out[g] != null) out[g] += n;
  return out;
}
// row deliveries so far today, for the route map: [{ from, to, good, n }]
export function deliveries(sec) {
  const m = new Map();
  for (const e of townStock(sec)) { const k = e.good + '>' + e.lot; const d = m.get(k) || { good: e.good, to: e.lot, from: GOODS[e.good]?.from || '', n: 0 }; d.n += e.delivered; m.set(k, d); }
  return [...m.values()].sort((a, b) => b.n - a.n);
}
/** whole-town ledger at a moment. used = { good: n } (shop sales, lunches, town needs), wanted = { good: n } */
export function ledger(sec, { made = {}, used = {}, wanted = {} } = {}) {
  const prod = production(sec, made);
  const rows = GOOD_IDS.map((g) => { const u = Math.min(prod[g], used[g] || 0), stock = prod[g] - u, want = wanted[g] || 0;
    return { good: g, name: GOODS[g].name, from: GOODS[g].from, to: GOODS[g].to, made: prod[g], used: u, stock, wanted: want, short: want > stock }; });
  return { hour: +((((sec % SKY_DAY_S) + SKY_DAY_S) % SKY_DAY_S) / HOUR_S).toFixed(2), rows, shortages: rows.filter((r) => r.short).map((r) => r.good) };
}

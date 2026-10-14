// Farmland district: fields, orchard, animals, fishing, crafting, a supply/demand market and the weekly Top Farmer board.
// Bones are the farm economy. Rare seeds + barn/tractor cosmetics are $KIBBLE (via the shared wallet adapter, 2% split).
// Pure logic (no DOM) so it can be unit tested and later moved to a backend.
export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
export const WEEK_DAYS = 7;
export const seasonOf = (day) => SEASONS[Math.floor(day / WEEK_DAYS) % 4]; // one in-game week per season
// grow: real seconds to full growth in season. yield: units per field. rare seeds cost KIBBLE.
export const CROPS = {
  turnip:     { name: 'Turnip', seed: 10, grow: 120, yield: 6, seasons: ['spring', 'autumn'], color: '#f4f0ff', leaf: '#6cbf4a' },
  wheat:      { name: 'Wheat', seed: 8, grow: 150, yield: 8, seasons: ['summer', 'autumn'], color: '#e8c95a', leaf: '#c9b04a' },
  carrot:     { name: 'Carrot', seed: 12, grow: 160, yield: 6, seasons: ['spring', 'summer', 'autumn'], color: '#ff8a2a', leaf: '#4caf50' },
  strawberry: { name: 'Strawberry', seed: 18, grow: 210, yield: 5, seasons: ['spring', 'summer'], color: '#e8344a', leaf: '#3f9c4a' },
  pumpkin:    { name: 'Pumpkin', seed: 25, grow: 300, yield: 3, seasons: ['autumn'], color: '#f07a1a', leaf: '#4a8c3a' },
  kale:       { name: 'Snow Kale', seed: 14, grow: 180, yield: 5, seasons: ['winter'], color: '#9fd8c0', leaf: '#3f8a6a' },
  goldmelon:  { name: 'Golden Melon', rare: true, kibble: 2, grow: 360, yield: 3, seasons: ['summer'], color: '#ffd23a', leaf: '#5aa04a' },
  starberry:  { name: 'Starberry', rare: true, kibble: 3, grow: 300, yield: 4, seasons: SEASONS, color: '#b07aff', leaf: '#4a7ad0' },
};
// base market prices (Bones per unit) for every sellable good
export const GOODS = {
  turnip: { name: 'Turnip', base: 6 }, wheat: { name: 'Wheat', base: 4 }, carrot: { name: 'Carrot', base: 7 }, strawberry: { name: 'Strawberry', base: 12 },
  pumpkin: { name: 'Pumpkin', base: 30 }, kale: { name: 'Snow Kale', base: 10 }, goldmelon: { name: 'Golden Melon', base: 70 }, starberry: { name: 'Starberry', base: 45 },
  apple: { name: 'Apple', base: 5 }, peach: { name: 'Peach', base: 8 }, egg: { name: 'Egg', base: 5 }, milk: { name: 'Milk', base: 9 },
  minnow: { name: 'Minnow', base: 4 }, carp: { name: 'Pond Carp', base: 14 }, koi: { name: 'Golden Koi', base: 60 },
  jam: { name: 'Fruit Jam', base: 26 }, cheese: { name: 'Cheese', base: 34 }, treats: { name: 'Kibble Treats', base: 22 },
};
export const CAFE_BUYS = { milk: 1.25, egg: 1.2, strawberry: 1.2, jam: 1.3, cheese: 1.2, treats: 1.35, apple: 1.1, peach: 1.15 }; // café premium
export const RECIPES = {
  jam: { name: 'Fruit Jam', needs: { fruit: 3 } }, // any of apple/peach/strawberry/starberry
  cheese: { name: 'Cheese', needs: { milk: 2 } },
  treats: { name: 'Kibble Treats', needs: { wheat: 2, egg: 1 } },
};
const FRUIT = ['strawberry', 'apple', 'peach', 'starberry'];
export const ANIMALS = { chicken: { name: 'Chicken', price: 60, product: 'egg', every: 90, max: 6 }, cow: { name: 'Cow', price: 180, product: 'milk', every: 150, max: 3 } };
export const ORCHARD_FRUIT = { spring: 'peach', summer: 'peach', autumn: 'apple', winter: null };
export const FIELD_COUNT = 4;
export const MARKET_FEE = 0.05; // 5% of market sales -> weekly Top Farmer Bones pool
export const POOL_SPLIT = [0.5, 0.3, 0.2];
export const COSMETICS = {
  barn_red: { slot: 'barn', name: 'Classic Red Barn', kibble: 0 }, barn_blue: { slot: 'barn', name: 'Royal Blue Barn', kibble: 4 }, barn_gold: { slot: 'barn', name: 'Gold-Trim Barn', kibble: 8 },
  tractor_green: { slot: 'tractor', name: 'Field Green Tractor', kibble: 0 }, tractor_pink: { slot: 'tractor', name: 'Sakura Tractor', kibble: 3 }, tractor_chrome: { slot: 'tractor', name: 'Chrome Tractor', kibble: 6 },
};
export const RIVAL_FARMERS = ['Farmer Goma', 'Old Kinako', 'Ume of Hill Farm', 'Pochi Fields', 'Azuki Acres'];
const h32 = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };

export function ensureFarm(s) {
  s.farm ||= {}; const f = s.farm;
  f.fields ||= Array.from({ length: FIELD_COUNT }, () => ({ crop: null, grown: 0, watered: 0 }));
  f.inv ||= {}; f.seeds ||= {}; f.animals ||= { chicken: 0, cow: 0 }; f.animalT ||= { chicken: 0, cow: 0 }; f.fed ??= 0; f.pen ||= {};
  f.orchard ||= { t: 0, ready: 0 }; f.demand ||= {}; f.sold ||= {}; f.owned ||= { barn_red: true, tractor_green: true }; f.look ||= { barn: 'barn_red', tractor: 'tractor_green' };
  f.week ??= 0; f.weekValue ??= 0; f.pool ??= 300; f.history ||= []; f.harvested ??= 0;
  return f;
}
const add = (inv, k, n) => { inv[k] = (inv[k] || 0) + n; if (inv[k] <= 0) delete inv[k]; };
export function seasonMult(crop, season) { return CROPS[crop].seasons.includes(season) ? 1 : season === 'winter' ? 0.25 : 0.5; }
// dt real seconds. env: { season, rain }
export function tickFarm(s, dt, env) {
  const f = ensureFarm(s);
  for (const fl of f.fields) { if (!fl.crop || fl.grown >= 1) continue; const wet = fl.watered > 0 || env.rain ? 1.5 : 1;
    fl.grown = Math.min(1, fl.grown + (dt / CROPS[fl.crop].grow) * seasonMult(fl.crop, env.season) * wet); if (fl.watered > 0) fl.watered = Math.max(0, fl.watered - dt); }
  for (const k in ANIMALS) { const A = ANIMALS[k], n = f.animals[k]; if (!n) continue; f.animalT[k] += dt * (f.fed > 0 ? 1 : 0.3);
    while (f.animalT[k] >= A.every) { f.animalT[k] -= A.every; f.pen[A.product] = Math.min(A.max * n, (f.pen[A.product] || 0) + n); } }
  if (f.fed > 0) f.fed = Math.max(0, f.fed - dt);
  const fruit = ORCHARD_FRUIT[env.season]; if (fruit) { f.orchard.t += dt; while (f.orchard.t >= 100) { f.orchard.t -= 100; f.orchard.ready = Math.min(12, f.orchard.ready + 2); } f.orchard.fruit = fruit; }
  return f;
}
export const stageOf = (fl) => (!fl.crop ? 0 : fl.grown >= 1 ? 4 : 1 + Math.floor(fl.grown * 3)); // 0 empty, 1 sprout, 2 young, 3 budding, 4 ripe
export function buySeeds(s, crop, n = 1) { const c = CROPS[crop]; if (!c || c.rare) return { ok: false, reason: 'Rare seeds cost KIBBLE' }; const cost = c.seed * n; if (s.bones < cost) return { ok: false, reason: `Need ${cost} bones` }; s.bones -= cost; add(ensureFarm(s).seeds, crop, n); return { ok: true, cost }; }
// rare seeds: caller pays via wallet().purchaseSync({ priceU }) first, then grants
export function grantRareSeed(s, crop, n = 1) { add(ensureFarm(s).seeds, crop, n); }
export function plant(s, i, crop) { const f = ensureFarm(s), fl = f.fields[i]; if (!fl) return { ok: false, reason: 'No field' }; if (fl.crop) return { ok: false, reason: 'Field is planted' }; if (!(f.seeds[crop] > 0)) return { ok: false, reason: 'No seeds' };
  add(f.seeds, crop, -1); Object.assign(fl, { crop, grown: 0, watered: 0 }); return { ok: true }; }
export function water(s, i) { const fl = ensureFarm(s).fields[i]; if (!fl?.crop || fl.grown >= 1) return { ok: false, reason: 'Nothing to water' }; fl.watered = 120; return { ok: true }; }
export function harvest(s, i) { const f = ensureFarm(s), fl = f.fields[i]; if (!fl?.crop || fl.grown < 1) return { ok: false, reason: 'Not ripe yet' };
  const c = fl.crop, n = CROPS[c].yield; add(f.inv, c, n); f.harvested += n; Object.assign(fl, { crop: null, grown: 0, watered: 0 }); return { ok: true, item: c, n }; }
export function buyAnimal(s, k) { const A = ANIMALS[k], f = ensureFarm(s); if (!A) return { ok: false }; if (f.animals[k] >= 4) return { ok: false, reason: 'Pen is full' }; if (s.bones < A.price) return { ok: false, reason: `Need ${A.price} bones` }; s.bones -= A.price; f.animals[k]++; return { ok: true }; }
export function feedAnimals(s) { const f = ensureFarm(s), n = f.animals.chicken + f.animals.cow; if (!n) return { ok: false, reason: 'No animals' }; const cost = 2 * n; if (s.bones < cost) return { ok: false, reason: `Feed costs ${cost} bones` }; s.bones -= cost; f.fed = 600; return { ok: true, cost }; }
export function collectPen(s) { const f = ensureFarm(s); let n = 0; for (const k in f.pen) { add(f.inv, k, f.pen[k]); n += f.pen[k]; } f.pen = {}; f.harvested += n; return { ok: n > 0, n, reason: n ? '' : 'Nothing to collect yet' }; }
export function pickOrchard(s) { const f = ensureFarm(s), o = f.orchard; if (!o.ready || !o.fruit) return { ok: false, reason: 'No ripe fruit' }; const n = o.ready; add(f.inv, o.fruit, n); f.harvested += n; o.ready = 0; return { ok: true, item: o.fruit, n }; }
// fishing: r in [0,1) from rng; reaction in seconds after the bite (smaller is better)
export function fishCatch(s, r, reaction) { if (reaction > 0.9) return { ok: false, reason: 'It got away!' }; const q = r * (1.4 - reaction); const fish = q > 0.93 ? 'koi' : q > 0.55 ? 'carp' : 'minnow'; add(ensureFarm(s).inv, fish, 1); ensureFarm(s).harvested++; return { ok: true, item: fish }; }
export function craft(s, id) { const R = RECIPES[id], f = ensureFarm(s); if (!R) return { ok: false };
  for (const [k, n] of Object.entries(R.needs)) { if (k === 'fruit') { if (FRUIT.reduce((a, x) => a + (f.inv[x] || 0), 0) < n) return { ok: false, reason: `Need ${n} fruit` }; } else if ((f.inv[k] || 0) < n) return { ok: false, reason: `Need ${n} ${GOODS[k].name}` }; }
  for (const [k, n] of Object.entries(R.needs)) { if (k === 'fruit') { let left = n; for (const x of FRUIT) { const t = Math.min(left, f.inv[x] || 0); add(f.inv, x, -t); left -= t; } } else add(f.inv, k, -n); }
  add(f.inv, id, 1); return { ok: true, item: id }; }
// supply & demand: demand drifts per in-game hour (seeded), each unit sold adds supply; supply decays hourly
export function priceOf(s, item, buyer = 'market', hourKey = 0) { const f = ensureFarm(s), g = GOODS[item]; if (!g) return 0; const drift = 0.8 + h32(item + ':' + hourKey) * 0.5, supply = f.sold[item] || 0;
  const m = Math.max(0.35, drift - supply * 0.025) * (buyer === 'cafe' ? CAFE_BUYS[item] || 0 : 1); return Math.max(0, Math.round(g.base * m)); }
export function marketHour(s) { const f = ensureFarm(s); for (const k in f.sold) { f.sold[k] *= 0.8; if (f.sold[k] < 0.3) delete f.sold[k]; } }
export function sell(s, item, n, buyer = 'market', hourKey = 0) { const f = ensureFarm(s); n = Math.min(n, f.inv[item] || 0); if (n <= 0) return { ok: false, reason: 'None to sell' };
  if (buyer === 'cafe' && !CAFE_BUYS[item]) return { ok: false, reason: 'The café does not buy that' };
  let total = 0; for (let i = 0; i < n; i++) { total += priceOf(s, item, buyer, hourKey); f.sold[item] = (f.sold[item] || 0) + 1; }
  const fee = Math.round(total * MARKET_FEE); add(f.inv, item, -n); s.bones += total - fee; f.pool += fee; f.weekValue += total; s.stats && (s.stats.bonesEarned = (s.stats.bonesEarned || 0) + total - fee);
  return { ok: true, total, fee, net: total - fee }; }
export function rivalScore(name, week, weekFrac) { return Math.floor((200 + h32(name + week) * 1400) * Math.max(0.05, weekFrac)); }
export function farmBoard(s, weekFrac = 1) { const f = ensureFarm(s); return [{ id: 'you', name: s.player?.name || 'You', score: f.weekValue, me: true }, ...RIVAL_FARMERS.map((n) => ({ id: n, name: n, score: rivalScore(n, f.week, weekFrac) }))].sort((a, b) => b.score - a.score).map((r, i) => ({ ...r, rank: i + 1, prize: i < 3 ? Math.floor(f.pool * POOL_SPLIT[i]) : 0 })); }
// call when the in-game week changes: pays the player if they placed top 3, resets
export function rollFarmWeek(s, week) { const f = ensureFarm(s); if (week === f.week) return null; const rows = farmBoard(s, 1), me = rows.find((r) => r.me); let paid = 0;
  if (me.rank <= 3) { paid = me.prize; s.bones += paid; } f.history.unshift({ week: f.week, rank: me.rank, score: me.score, paid }); f.history.length = Math.min(f.history.length, 8); f.week = week; f.weekValue = 0; f.pool = 300; return { rank: me.rank, paid }; }
export function cosmetic(s, id) { const C = COSMETICS[id], f = ensureFarm(s); if (!C) return { ok: false }; if (!f.owned[id]) return { ok: false, needKibble: C.kibble }; f.look[C.slot] = id; return { ok: true }; }
export function grantCosmetic(s, id) { const f = ensureFarm(s); f.owned[id] = true; f.look[COSMETICS[id].slot] = id; }
// catch up crops/animals for real time spent away (capped to 6h)
export function catchUp(s, nowMs, env) { const f = ensureFarm(s); const last = f.lastReal || nowMs, dt = Math.min(6 * 3600, Math.max(0, (nowMs - last) / 1000)); f.lastReal = nowMs; if (dt > 1) for (let t = 0; t < dt; t += 30) tickFarm(s, Math.min(30, dt - t), env); return dt; }

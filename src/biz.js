import { perk } from './traits.js';
// Player businesses: lease a shopfront lot for Bones, stock it, price it, decorate it, hire staff and run a daily ledger.
// Prime lots by the mall are owned by President Inu; their rent is paid to the President's treasury ledger.
// Pure logic (no DOM). NPC shoppers are a demand model evaluated once per in-game hour.
import { GOODS, ensureFarm } from './farm.js';
export const LOTS = [
  { id: 'P1', name: 'Prime Lot 1 (Mall Row)', x: 41, y: 74, w: 6, h: 4, prime: true, rent: 120, foot: 1.7 },
  { id: 'P2', name: 'Prime Lot 2 (Mall Row)', x: 48, y: 74, w: 6, h: 4, prime: true, rent: 120, foot: 1.7 },
  { id: 'L1', name: 'Farm Lane Lot 1', x: 4, y: 82, w: 6, h: 4, rent: 40, foot: 1 },
  { id: 'L2', name: 'Farm Lane Lot 2', x: 12, y: 82, w: 6, h: 4, rent: 40, foot: 1 },
  { id: 'L3', name: 'Farm Lane Lot 3', x: 44, y: 82, w: 6, h: 4, rent: 40, foot: 1 },
  { id: 'L4', name: 'Farm Lane Lot 4', x: 52, y: 82, w: 6, h: 4, rent: 40, foot: 1 },
];
export const LANDLORD = 'President Inu';
// goods: what each type sells. wholesale = Bones to stock 1 unit from the market. local: farm items it can stock from your inventory.
export const TYPES = {
  bakery:  { name: 'Bakery', color: '#e8b46a', goods: { bread: { name: 'Bread', wholesale: 6, ref: 14 }, cake: { name: 'Strawberry Cake', wholesale: 14, ref: 32 } }, local: ['wheat', 'egg', 'treats'] },
  cafe:    { name: 'Café', color: '#a8744a', goods: { latte: { name: 'Latte', wholesale: 4, ref: 11 }, muffin: { name: 'Muffin', wholesale: 5, ref: 12 } }, local: ['milk', 'cheese', 'jam'] },
  flower:  { name: 'Flower Shop', color: '#e87aa8', goods: { bouquet: { name: 'Bouquet', wholesale: 10, ref: 24 }, pot: { name: 'Potted Plant', wholesale: 8, ref: 18 } }, local: [] },
  boutique:{ name: 'Boutique', color: '#9a6ad0', goods: { scarf: { name: 'Silk Scarf', wholesale: 18, ref: 40 }, bow: { name: 'Hair Bow', wholesale: 7, ref: 16 } }, local: [] },
  groomer: { name: 'Groomer', color: '#5ab0d8', goods: { bath: { name: 'Bubble Bath', wholesale: 5, ref: 20 }, trim: { name: 'Fur Trim', wholesale: 8, ref: 28 } }, local: [] },
  stand:   { name: 'Farm Stand', color: '#6aa84a', goods: { basket: { name: 'Veg Basket', wholesale: 9, ref: 18 } }, local: ['turnip', 'carrot', 'strawberry', 'pumpkin', 'kale', 'apple', 'peach', 'egg', 'milk', 'goldmelon', 'starberry'] },
};
export const LEASE_DEPOSIT = 2; // days of rent up front
export const STAFF_WAGE = 20, MAX_STAFF = 3, BIZ_POOL_SHARE = 0.1; // 10% of every rent payment -> weekly Top Business pool
export const DECOR = { awning: { name: 'Striped Awning', price: 60, appeal: 0.1 }, planters: { name: 'Flower Planters', price: 40, appeal: 0.06 }, neon: { name: 'Neon Sign', price: 90, appeal: 0.14 }, bench: { name: 'Window Bench', price: 30, appeal: 0.04 } };
export const UPGRADES = { shelves: { name: 'Bigger Shelves', price: [80, 160, 320], cap: 20 }, display: { name: 'Window Display', price: [100, 200, 400], appeal: 0.12 } };
export const PREMIUM_LOOKS = { marble: { name: 'Marble Storefront', kibble: 5, appeal: 0.15 }, gold: { name: 'Gold Leaf Facade', kibble: 9, appeal: 0.25 }, sakura: { name: 'Sakura Arch', kibble: 4, appeal: 0.12 } };
export const RIVAL_BIZ = [{ lot: 'P2', owner: 'Hana', name: "Hana's Blooms", type: 'flower' }, { lot: 'L3', owner: 'Taro', name: 'Taro Bakes', type: 'bakery' }, { lot: 'L4', owner: 'Kiki', name: 'Kiki Grooming', type: 'groomer' }];
export const OTHER_OWNERS = ['Goma Goods', 'Yuzu Café'];
// NPC footfall by hour (0..23), shops open 8-20
export const OPEN = [8, 20];
const footAt = (h) => (h < OPEN[0] || h >= OPEN[1] ? 0 : h >= 11 && h < 14 ? 1.4 : h >= 17 && h < 19 ? 1.3 : 0.9);
const h32 = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };
export function ensureBiz(s) { s.biz ||= { mine: null, treasuryRent: 0, ledger: [], week: 0, weekProfit: 0, pool: 400, history: [] }; return s.biz; }
export const lotById = (id) => LOTS.find((l) => l.id === id);
export const rivalAt = (id) => RIVAL_BIZ.find((r) => r.lot === id);
export function lease(s, lotId, type, name, day) { const b = ensureBiz(s), L = lotById(lotId); if (!L || !TYPES[type]) return { ok: false, reason: 'Unknown lot or type' };
  if (rivalAt(lotId)) return { ok: false, reason: `Leased by ${rivalAt(lotId).owner}` }; if (b.mine) return { ok: false, reason: 'You already run a business' };
  const cost = L.rent * LEASE_DEPOSIT; if (s.bones < cost) return { ok: false, reason: `Need ${cost} bones (2 days rent)` }; s.bones -= cost; payRent(b, L, cost);
  b.mine = { lot: lotId, type, name: String(name || TYPES[type].name).slice(0, 22), stock: {}, prices: {}, decor: {}, look: null, looks: {}, staff: 0, up: { shelves: 0, display: 0 }, paidThrough: day + LEASE_DEPOSIT, today: blankDay(day) };
  return { ok: true, cost }; }
const blankDay = (day) => ({ day, revenue: 0, cogs: 0, wages: 0, rent: 0, sold: 0, shoppers: 0 });
function payRent(b, L, amt) { b.pool += Math.round(amt * BIZ_POOL_SHARE); if (L.prime) b.treasuryRent += amt; } // prime rent -> President Inu's treasury
export function closeBiz(s) { const b = ensureBiz(s); if (!b.mine) return { ok: false }; const T = TYPES[b.mine.type]; let refund = 0; for (const [k, n] of Object.entries(b.mine.stock)) refund += Math.floor((T.goods[k]?.wholesale || 0) * n * 0.5); s.bones += refund; b.mine = null; return { ok: true, refund }; }
export const capOf = (m) => 20 + m.up.shelves * UPGRADES.shelves.cap;
export const stockCount = (m) => Object.values(m.stock).reduce((a, n) => a + n, 0);
export function refOf(m, item) { const T = TYPES[m.type]; return T.goods[item]?.ref ?? Math.round((GOODS[item]?.base || 5) * 1.8); }
export function priceIn(m, item) { return m.prices[item] ?? refOf(m, item); }
export function setPrice(s, item, p) { const m = ensureBiz(s).mine; if (!m) return { ok: false }; m.prices[item] = Math.max(1, Math.min(999, Math.round(p))); return { ok: true }; }
export function stockFromMarket(s, item, n) { const m = ensureBiz(s).mine; if (!m) return { ok: false }; const g = TYPES[m.type].goods[item]; if (!g) return { ok: false, reason: 'Not sold here' };
  n = Math.min(n, capOf(m) - stockCount(m)); if (n <= 0) return { ok: false, reason: 'Shelves are full' }; const cost = g.wholesale * n; if (s.bones < cost) return { ok: false, reason: `Need ${cost} bones` };
  s.bones -= cost; m.stock[item] = (m.stock[item] || 0) + n; m.today.cogs += cost; return { ok: true, n, cost }; }
export function stockFromFarm(s, item, n) { const m = ensureBiz(s).mine, f = ensureFarm(s); if (!m) return { ok: false }; if (!TYPES[m.type].local.includes(item)) return { ok: false, reason: 'Not sold here' };
  n = Math.min(n, f.inv[item] || 0, capOf(m) - stockCount(m)); if (n <= 0) return { ok: false, reason: 'Nothing to stock' }; f.inv[item] -= n; if (!f.inv[item]) delete f.inv[item]; m.stock[item] = (m.stock[item] || 0) + n; return { ok: true, n }; }
export function appeal(m) { let a = 1; for (const k in m.decor) a += DECOR[k].appeal; a += m.up.display * UPGRADES.display.appeal; if (m.look) a += PREMIUM_LOOKS[m.look].appeal; return a; }
export function buyDecor(s, k) { const m = ensureBiz(s).mine, D = DECOR[k]; if (!m || !D) return { ok: false }; if (m.decor[k]) return { ok: false, reason: 'Already placed' }; if (s.bones < D.price) return { ok: false, reason: `Need ${D.price} bones` }; s.bones -= D.price; m.decor[k] = true; return { ok: true }; }
export function buyUpgrade(s, k) { const m = ensureBiz(s).mine, U = UPGRADES[k]; if (!m || !U) return { ok: false }; const lv = m.up[k]; if (lv >= U.price.length) return { ok: false, reason: 'Max level' }; const p = U.price[lv]; if (s.bones < p) return { ok: false, reason: `Need ${p} bones` }; s.bones -= p; m.up[k]++; return { ok: true }; }
export function hire(s) { const m = ensureBiz(s).mine; if (!m) return { ok: false }; if (m.staff >= MAX_STAFF) return { ok: false, reason: 'Fully staffed' }; m.staff++; return { ok: true }; }
export function fire(s) { const m = ensureBiz(s).mine; if (!m || !m.staff) return { ok: false }; m.staff--; return { ok: true }; }
export function grantLook(s, k) { const m = ensureBiz(s).mine; if (!m) return; m.looks[k] = true; m.look = k; }
// purchase probability for one shopper at a given price vs reference price
export const buyChance = (price, ref) => Math.max(0, Math.min(0.95, 0.75 - (price / ref - 1) * 0.9));
// one in-game hour of NPC shoppers. rng: () => [0,1)
export function bizHour(s, hour, rng, spouseHelp = 0) { const b = ensureBiz(s), m = b.mine; if (!m) return null; const L = lotById(m.lot);
  const shoppers = Math.round(footAt(hour) * L.foot * appeal(m) * (4 + m.staff * 1.5 + spouseHelp) * (0.75 + rng() * 0.5)); let rev = 0, sold = 0;
  const service = 6 + m.staff * 5 + spouseHelp * 3; // max customers served per hour
  for (let i = 0; i < shoppers && sold < service; i++) { const items = Object.keys(m.stock).filter((k) => m.stock[k] > 0); if (!items.length) break; const it = items[Math.floor(rng() * items.length)], p = priceIn(m, it);
    if (rng() < buyChance(p, refOf(m, it)) * perk(s, 'sales')) { m.stock[it]--; if (!m.stock[it]) delete m.stock[it]; rev += p; sold++; } }
  s.bones += rev; m.today.revenue += rev; m.today.sold += sold; m.today.shoppers += shoppers; return { shoppers, sold, rev }; }
// end of in-game day: wages + rent, close the ledger row. Returns the row.
export function bizDay(s, day) { const b = ensureBiz(s), m = b.mine; if (!m) return null; const L = lotById(m.lot), t = m.today;
  const due = m.staff * STAFF_WAGE + L.rent; let unpaid = false;
  if (s.bones >= due) { t.wages = m.staff * STAFF_WAGE; t.rent = L.rent; s.bones -= due; payRent(b, L, t.rent); m.paidThrough = day + 1; m.unpaid = 0; }
  else { unpaid = true; t.wages = 0; t.rent = 0; m.unpaid = (m.unpaid || 0) + 1; } // Bones never go below zero: nothing is charged, the debt counts as an unpaid day
  const row = { ...t, profit: t.revenue - t.cogs - t.wages - t.rent, unpaid, due, unpaidDays: m.unpaid }; b.ledger.unshift(row); b.ledger.length = Math.min(b.ledger.length, 14); b.weekProfit += row.profit; m.today = blankDay(day + 1);
  if (m.unpaid >= UNPAID_LIMIT) { const lot = m.lot; closeBiz(s); row.closed = true; row.lot = lot; } return row; }
export const UNPAID_LIMIT = 3;
export function rivalProfit(name, week, frac) { return Math.floor((150 + h32(name + 'biz' + week) * 1200) * Math.max(0.05, frac)); }
export function bizBoard(s, frac = 1) { const b = ensureBiz(s); const rows = [...(b.mine ? [{ id: 'you', name: `${b.mine.name} (${s.player?.name || 'you'})`, score: b.weekProfit, me: true }] : []), ...RIVAL_BIZ.map((r) => ({ id: r.lot, name: `${r.name} (${r.owner})`, score: rivalProfit(r.name, b.week, frac) })), ...OTHER_OWNERS.map((n) => ({ id: n, name: n, score: rivalProfit(n, b.week, frac) }))];
  return rows.sort((a, c) => c.score - a.score).map((r, i) => ({ ...r, rank: i + 1, prize: i < 3 ? Math.floor(b.pool * [0.5, 0.3, 0.2][i]) : 0 })); }
export function rollBizWeek(s, week) { const b = ensureBiz(s); if (week === b.week) return null; const me = bizBoard(s, 1).find((r) => r.me); let paid = 0; if (me && me.rank <= 3) { paid = me.prize; s.bones += paid; }
  b.history.unshift({ week: b.week, rank: me?.rank || null, profit: b.weekProfit, paid }); b.history.length = Math.min(b.history.length, 8); b.week = week; b.weekProfit = 0; b.pool = 400; return { rank: me?.rank, paid }; }

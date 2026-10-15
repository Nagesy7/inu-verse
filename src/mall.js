// Kibble Mall + shopping district economy. Real mode: purchases go through kibble-pay (wallet.js); demo (?demo=1): local sim.
// All Mall + district stores are owned by "President Inu". Prices are FEE-INCLUSIVE; 2% of every price is set aside:
//   1%    -> President's Treasury (Mall owner)
//   0.25% -> daily prize pool    (top café/job earner of the day)
//   0.5%  -> weekly prize pool   (best decorated home score of the week)
//   0.25% -> monthly prize pool  (top Pack in the Kibble Cup)
// Prize pools are skill/activity based - winners are chosen by score, never by chance.
// Amounts are kept as integer micro-KIBBLE units (1 KIBBLE = 1,000,000 u) so splits are exact.
// Real payments: the full price goes to OWNER_WALLET; the 2% split is an off-chain ledger in kibble-pay (no separate pool wallets).
// settle() here is the DEMO-mode local ledger only.
import { OUTFITS } from './outfits.js';
import { FURNITURE } from './furniture.js';
import { wallet, DEMO } from './wallet.js';

export const U = 1_000_000;
export const OWNER = { name: 'President Inu', title: 'Owner of Kibble Mall & the shopping district' };
export const OWNER_WALLET = 'BzLYTFAfUsjzQ5x8bx5BbPK4DFtaHrLCuferkvkxTNGJ'; // President's treasury (Solana receive address). Simulated: no transfers are made.
export const FEE_BPS = { owner: 100, daily: 25, weekly: 50, monthly: 25 }; // basis points (sum 200 = 2%)
export const FEE_TOTAL_BPS = 200;
export const FEE_LABEL = 'price includes 2%: 1% treasury, 1% community prize pools';
export const PERIOD_DAYS = { daily: 1, weekly: 7, monthly: 28 };
export const POOL_RULES = {
  daily: 'Top café / job earner of the day (bones earned on shifts)',
  weekly: 'Best decorated home of the week (decor score: items + upgrades)',
  monthly: 'Top Pack in the Kibble Cup (whole pool goes to that Pack\'s treasury)',
};

// price in KIBBLE (2dp). kind: outfit | furniture | car | jewelry
export const MALL_ITEMS = {
  gold_suit:    { cat: 'outfit', name: 'Gold Designer Suit', price: 120000, grants: { outfit: 'gold_suit' } },
  velvet_gown:  { cat: 'outfit', name: 'Midnight Velvet Gown', price: 140000, grants: { outfit: 'velvet_gown' } },
  crown:        { cat: 'jewelry', name: 'Little Gold Crown', price: 95000, grants: { outfit: 'crown' } },
  diamond_chain:{ cat: 'jewelry', name: 'Diamond Paw Chain', price: 80000, grants: { outfit: 'diamond_chain' } },
  gold_shades2: { cat: 'jewelry', name: 'Platinum Shades', price: 52500, grants: { outfit: 'plat_shades' } },
  gold_throne:  { cat: 'furniture', name: 'Golden Throne', price: 100000, grants: { furniture: 'gold_throne' } },
  gold_statue:  { cat: 'furniture', name: 'Mini Shiba Statue', price: 75000, grants: { furniture: 'gold_statue' } },
  gold_lamp:    { cat: 'furniture', name: 'Gilded Lamp', price: 30000, grants: { furniture: 'gold_lamp' } },
  car_coupe:    { cat: 'car', name: 'Zoomie GT Coupe (preview)', price: 400000, grants: { car: 'coupe' } },
  car_limo:     { cat: 'car', name: 'Bone-mobile Limo (preview)', price: 650000, grants: { car: 'limo' } },
};

const fail = (reason) => ({ ok: false, reason });
export const toU = (k) => Math.round(k * U);
export const fromU = (u) => u / U;
export const fmtK = (u) => (u / U).toFixed(u % 10000 ? 4 : 2);

export function ensureMall(s) {
  s.mall ||= {};
  const m = s.mall; m.v = 1; m.treasury ||= 0; m.pools ||= { daily: 0, weekly: 0, monthly: 0 };
  m.owned ||= []; m.cars ||= []; m.ledger ||= []; m.winners ||= []; m.period ||= { day: 0 };
  m.activity ||= { dayBones: 0, weekDecor: 0 };
  return m;
}

// Exact split: every unit of the fee lands somewhere (owner takes the rounding remainder).
export function feeSplit(priceU) {
  const fee = Math.floor(priceU * FEE_TOTAL_BPS / 10000);
  const daily = Math.floor(priceU * FEE_BPS.daily / 10000), weekly = Math.floor(priceU * FEE_BPS.weekly / 10000), monthly = Math.floor(priceU * FEE_BPS.monthly / 10000);
  const owner = fee - daily - weekly - monthly;
  return { price: priceU, fee, owner, daily, weekly, monthly, total: priceU }; // fee-inclusive: player pays exactly priceU
}
export const quote = (id) => { const it = MALL_ITEMS[id]; return it ? feeSplit(toU(it.price)) : null; };

export function buyMallItem(s, id) {
  const m = ensureMall(s), it = MALL_ITEMS[id]; if (!it) return fail('Unknown item');
  if (it.grants.outfit && s.wardrobe?.owned?.includes(it.grants.outfit)) return fail('Already owned');
  if (it.grants.car && m.cars.includes(it.grants.car)) return fail('Already owned');
  const r = wallet().purchaseSync({ state: s, itemId: 'mall-' + id, priceU: toU(it.price) }); if (!r.ok) return r; const q = r.quote;
  if (it.grants.outfit) { s.wardrobe ||= { owned: [], equipped: {} }; s.wardrobe.owned.push(it.grants.outfit); }
  if (it.grants.furniture) s.inventory[it.grants.furniture] = (s.inventory[it.grants.furniture] || 0) + 1;
  if (it.grants.car) m.cars.push(it.grants.car);
  m.owned.push(id);
  return { ok: true, quote: q };
}
// DEMO-mode settlement (local ledger). Real purchases are settled by kibble-pay's server ledger.
export function settle(m, q, item) {
  m.treasury += q.owner; m.pools.daily += q.daily; m.pools.weekly += q.weekly; m.pools.monthly += q.monthly;
  m.ledger.unshift({ item, price: q.price, fee: q.fee, owner: q.owner, daily: q.daily, weekly: q.weekly, monthly: q.monthly, to: OWNER_WALLET });
  if (m.ledger.length > 50) m.ledger.length = 50;
}

// Skill/activity payout: highest score wins whole pool; ties -> earliest entry (stable). No randomness.
export function payout(m, pool, entries) {
  const amt = m.pools[pool]; const ranked = [...entries].filter((e) => e.score > 0).sort((a, b) => b.score - a.score);
  if (!amt || !ranked.length) return null;
  const w = ranked[0]; m.pools[pool] = 0;
  const rec = { pool, winner: w.name, id: w.id, score: w.score, amount: amt, day: m.period.day };
  m.winners.unshift(rec); if (m.winners.length > 30) m.winners.length = 30; return rec;
}

// Advance to in-game day `day`; pays out finished periods. entries(pool) -> [{id,name,score}].
// Credits: player winner -> s.kibble; pack winner -> pack treasury (in bones-equivalent KIBBLE note).
export function rollPeriods(s, day, entries) {
  const m = ensureMall(s), out = [];
  while (m.period.day < day) {
    m.period.day++;
    for (const pool of ['daily', 'weekly', 'monthly']) if (m.period.day % PERIOD_DAYS[pool] === 0) {
      const r = payout(m, pool, entries(pool)); if (!r) continue;
      if (r.id === 'you' && DEMO) s.kibble = fromU(toU(s.kibble) + r.amount); // demo only: real pools are paid on-chain by kibble-pay
      else if (r.id?.startsWith('pk_') && s.packs?.all?.[r.id]) { const p = s.packs.all[r.id]; p.kibblePrize = (p.kibblePrize || 0) + r.amount; }
      out.push(r);
    }
    m.activity.dayBones = 0; if (m.period.day % 7 === 0) m.activity.weekDecor = 0;
  }
  return out;
}
export const homeDecorScore = (s) => Object.values(s.plots || {}).reduce((a, h) => a + h.items.length * 10 + (h.wall + h.floor) * 5, 0);

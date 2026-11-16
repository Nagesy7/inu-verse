// NPC spending (preview). Every named townsfolk worker gets an in-game Bones purse: a day's wage in, lunch and home
// costs out, and the rest saved toward something they want from a town shop. They say so near the shop ("Oh, I want
// that jacket!"), save up when short, buy it, wear it (or put it in their home) and show it off to friends. Broke
// workers take an extra shift the next day. What they want counts as shop demand, and shops restock on demand.
// Pure + deterministic: simulated day by day from sky day 0 with a per-NPC cache, so all devices agree.
// NPC pay is play money inside the game only: never real earnings, never $KIBBLE, no real money anywhere.
import { ROW_WORKERS } from './workrow.js';
import { HAULERS } from './civic.js';
import { SHOPS } from './shops.js';

const h32 = (x) => { let h = 2166136261; for (const c of String(x)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); return ((h ^ (h >>> 15)) >>> 0) / 4294967296; };
export const SPEND = Object.freeze({ FOOD: 4, HOME: 6, EXTRA_SHIFT: 0.5, BROKE_BELOW: 6, TREAT_CHANCE: 0.15 });
export const FOLK = Object.freeze([...ROW_WORKERS.map((w) => ({ id: w.id, name: w.name, coat: w.coat, job: w.job, kind: 'row' })), ...HAULERS.map((h) => ({ id: h.id, name: h.name, coat: h.coat, job: h.job, kind: 'hauler' }))]);
export const folkById = (id) => FOLK.find((f) => f.id === id) || null;
// what townsfolk shop for (wearables are worn; lantern / planter / mug / beeswax go in their home)
export const WANTABLE = Object.freeze([['tailor', 'scarf'], ['tailor', 'beanie'], ['tailor', 'jacket'], ['market', 'planter'], ['cafe', 'mug'], ['forge', 'lantern'], ['candles', 'beeswax']]
  .map(([shop, id]) => { const it = SHOPS[shop].items.find((i) => i.id === id); return { shop, id, name: it.name, price: it.price, good: it.good, wear: ['scarf', 'beanie', 'jacket'].includes(id) ? id : null, home: !['scarf', 'beanie', 'jacket'].includes(id) }; }));
const shortName = (w) => w.name.replace(/^(Wool|Clay|Café|Iron|Beeswax) /, (m) => (m === 'Beeswax ' ? 'beeswax ' : '')).toLowerCase();
export const wageOf = (id) => 18 + Math.floor(h32('wage:' + id) * 8); // 18..25 Bones a worked sky day
const LUNCH = [['bakery', 'loaf'], ['cafe', 'milktea'], ['market', 'fruitbag'], ['cafe', 'matcha']];

export const WANT_MIN_DAYS = 2, HOME_UP_AT = 90;
export const HOME_UPS = Object.freeze([{ id: 'paint', name: 'a fresh coat of paint', cost: 40 }, { id: 'roof', name: 'a new roof', cost: 50 }, { id: 'garden', name: 'a little garden', cost: 35 }, { id: 'porch', name: 'a porch swing', cost: 45 }]);
const cache = new Map(); // id -> { days: [...] } simulated so far
function simDay(id, d, prev) {
  const wage = wageOf(id), extra = prev ? prev.broke : false;
  const pay = Math.round(wage * (extra ? 1 + SPEND.EXTRA_SHIFT : 1));
  const lunch = LUNCH[Math.floor(h32(`l:${id}:${d}`) * LUNCH.length)];
  const treat = h32(`t:${id}:${d}`) < SPEND.TREAT_CHANCE ? 10 + Math.floor(h32(`tt:${id}:${d}`) * 10) : 0; // a birthday present for a friend, a vet visit...
  let savings = (prev ? prev.savings : Math.floor(h32('s0:' + id) * 12)) + pay - SPEND.FOOD - SPEND.HOME - treat;
  const owned = prev ? [...prev.owned] : [];
  let want = prev ? prev.want : null, wantSince = prev ? prev.wantSince : d, bought = null, restUntil = prev ? prev.restUntil : 0, homeUp = prev ? prev.homeUp : 0, homeUpToday = null;
  // fancies something new (not one of their last few buys)
  if (!want && d >= restUntil) { const recent = owned.slice(-3).map((o) => o.id), left = WANTABLE.filter((w) => !recent.includes(w.id)); if (left.length) { want = left[Math.floor(h32(`w:${id}:${d}`) * left.length)]; wantSince = d; } }
  if (want && savings >= want.price && d >= wantSince + WANT_MIN_DAYS) { savings -= want.price; bought = { ...want, day: d }; owned.push(bought); if (owned.length > 8) owned.shift(); want = null; restUntil = d + 1 + Math.floor(h32(`r:${id}:${d}`) * 2); } // wants it for a couple of days first
  if (savings > HOME_UP_AT) { const u = HOME_UPS[homeUp % HOME_UPS.length]; savings -= u.cost; homeUp++; homeUpToday = u; } // plenty saved: fix up the house
  if (savings < 0) savings = 0;
  return { day: d, restUntil, homeUp, homeUpToday, pay, extraShift: extra, lunch: { shop: lunch[0], item: lunch[1] }, food: SPEND.FOOD, home: SPEND.HOME, treat, savings, want, wantSince, bought, owned, broke: savings < SPEND.BROKE_BELOW };
}
export function folkDay(id, skyDay) {
  const d = Math.max(0, Math.floor(skyDay)); let c = cache.get(id); if (!c) cache.set(id, (c = { days: [] }));
  while (c.days.length <= d) c.days.push(simDay(id, c.days.length, c.days[c.days.length - 1] || null));
  return c.days[d];
}
// what a townsfolk is up to today: purse, wanting/saving, wearing, showing off, extra shift
export function folkStatus(id, skyDay) {
  const t = folkDay(id, skyDay), y = skyDay > 0 ? folkDay(id, skyDay - 1) : null, f = folkById(id);
  const wearing = [...t.owned].reverse().find((o) => o.wear) || null;
  const fresh = t.owned.filter((o) => skyDay - o.day <= 1); // bought today or yesterday: shows it off
  const status = t.extraShift ? 'extra shift' : t.want ? (t.savings >= t.want.price ? 'buying soon' : 'saving up') : 'content';
  return { id, name: f?.name, job: f?.job, savings: t.savings, pay: t.pay, extraShift: t.extraShift, broke: t.broke, want: t.want ? { shop: t.want.shop, id: t.want.id, name: t.want.name, price: t.want.price, since: t.wantSince, short: Math.max(0, t.want.price - t.savings) } : null,
    wearing: wearing ? wearing.wear : null, wearingSince: wearing ? wearing.day : null, homeItems: t.owned.filter((o) => o.home).map((o) => o.id), showOff: fresh.length ? fresh[fresh.length - 1] : null, boughtToday: t.bought, lunch: t.lunch, status, spentToday: { food: t.food, home: t.home, upgrade: (t.bought ? t.bought.price : 0) + (t.homeUpToday ? t.homeUpToday.cost : 0), treat: t.treat }, homeUpgrade: t.homeUpToday ? t.homeUpToday.name : null, homeUpgrades: t.homeUp, yesterday: y ? y.savings : null };
}
export function wantLine(st) { if (!st.want) return null; const n = shortName(st.want); return st.want.short > 0 ? `Oh, I want that ${n}! Saving up, ${st.want.short} Bones to go.` : `Oh, I want that ${n}! Nearly there.`; }
export function showOffLine(st) { if (!st.showOff) return null; const n = shortName(st.showOff); return st.showOff.wear ? `Check out my new ${n}!` : `Come see the ${n} in my house!`; }
export function shiftLine(st) { return st.extraShift ? 'Bit short this week, so I picked up an extra shift.' : null; }
// whole town: most wanted items, demand by good (for the ledger + restock), spending board rows
export function townWants(skyDay) {
  const all = FOLK.map((f) => folkStatus(f.id, skyDay)), m = new Map();
  for (const s of all) if (s.want) { const k = s.want.shop + ':' + s.want.id; const e = m.get(k) || { shop: s.want.shop, id: s.want.id, name: s.want.name, price: s.want.price, good: WANTABLE.find((w) => w.id === s.want.id).good, who: [], saving: 0 }; e.who.push(s.name); if (s.want.short > 0) e.saving++; m.set(k, e); }
  const wanted = [...m.values()].sort((a, b) => b.who.length - a.who.length || a.name.localeCompare(b.name));
  const demand = {}; for (const w of wanted) demand[w.good] = (demand[w.good] || 0) + w.who.length;
  for (const s of all) { const L = SHOPS[s.lunch.shop].items.find((i) => i.id === s.lunch.item); demand[L.good] = (demand[L.good] || 0) + 1; }
  return { wanted, demand, folk: all };
}
// Shops restock on demand: every townsfolk who wants an item today adds a batch the shop orders in from the workers.
export const RESTOCK_PER_WANT = 2;
export function restockOf(shopId, itemId, skyDay) { const w = townWants(skyDay).wanted.find((x) => x.shop === shopId && x.id === itemId); return w ? { n: w.who.length * RESTOCK_PER_WANT, who: w.who } : { n: 0, who: [] }; }
export function spendingRows(skyDay) {
  return townWants(skyDay).folk.map((s) => ({ name: s.name, job: s.job, savings: s.savings, pay: s.pay, food: s.spentToday.food, home: s.spentToday.home, upgrade: s.spentToday.upgrade, status: s.status, wearing: s.wearing, want: s.want ? s.want.name : null, short: s.want ? s.want.short : 0 }));
}

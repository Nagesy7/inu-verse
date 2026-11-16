// Shops that sell what the town's workers make (preview). Buying builds a relationship with the shop owner:
// Stranger -> Regular -> Friend -> Bestie = 0 / 5 / 10 / 15% off. Besties now and then slip you a small gift.
// Owners can be challenged to Meme Brawl. Prices are in-game Bones only (never real money, never $KIBBLE).
import { ensureTownx } from './zonejobs.js';

export const TIERS = Object.freeze([
  { id: 'stranger', name: 'Stranger', buys: 0, off: 0 },
  { id: 'regular', name: 'Regular', buys: 3, off: 0.05 },
  { id: 'friend', name: 'Friend', buys: 8, off: 0.10 },
  { id: 'bestie', name: 'Bestie', buys: 15, off: 0.15 },
]);
// wear = what an NPC (or you) can be seen with: scarf / jacket / beanie / lantern / planter / mug
export const SHOPS = Object.freeze({
  bakery: { id: 'bakery', name: 'Bakery', owner: 'Crumb', coat: 'cream', lot: 'bakery', items: [
    { id: 'loaf', name: 'Bread loaf', good: 'bread', price: 6, kind: 'food' },
    { id: 'honeybun', name: 'Honey bun', good: 'honey', price: 9, kind: 'food' },
    { id: 'tart', name: 'Fruit tart', good: 'fruit', price: 14, kind: 'food' }],
    lines: { hi: 'Fresh out of the oven!', tierUp: 'You keep coming back. I like that.', brawlPre: 'Flour in your eyes, here I come!', brawlWin: 'Ha! You knead more practice.', brawlLose: 'Fine, fine. You rise to the occasion.', gift: 'Here, on the house. Warm from the tray.' } },
  tailor: { id: 'tailor', name: 'Tailor', owner: 'Stitch', coat: 'golden', lot: 'tailor', items: [
    { id: 'scarf', name: 'Wool scarf', good: 'wool', price: 18, kind: 'wear', wear: 'scarf' },
    { id: 'beanie', name: 'Wool beanie', good: 'wool', price: 22, kind: 'wear', wear: 'beanie' },
    { id: 'jacket', name: 'Wool jacket', good: 'wool', price: 40, kind: 'wear', wear: 'jacket' }],
    lines: { hi: 'Everything here is sheared on Meadow Row.', tierUp: 'You have a good eye for a seam.', brawlPre: 'I will have you in stitches.', brawlWin: 'Sewn up. Neat and tidy.', brawlLose: 'You tore right through me. Well played.', gift: 'A spare tassel for your scarf. Take it.' } },
  market: { id: 'market', name: 'Market', owner: 'Basil', coat: 'tan', lot: 'goods', items: [
    { id: 'fruitbag', name: 'Bag of fruit', good: 'fruit', price: 8, kind: 'food' },
    { id: 'fishpie', name: 'Fish pie', good: 'fish', price: 12, kind: 'food' },
    { id: 'planter', name: 'Clay planter', good: 'pots', price: 16, kind: 'wear', wear: 'planter' }],
    lines: { hi: 'Straight from the orchard and the pond.', tierUp: 'For you, I pick the shiny ones.', brawlPre: 'Market rules: no refunds on a beating!', brawlWin: 'Sold! One loss, wrapped to go.', brawlLose: 'You drive a hard bargain, pup.', gift: 'One apple, on me. Do not tell the others.' } },
  cafe: { id: 'cafe', name: 'Café', owner: 'Mocha', coat: 'dark', lot: 'sip', items: [
    { id: 'matcha', name: 'Matcha latte', good: 'tea', price: 7, kind: 'food' },
    { id: 'milktea', name: 'Milk tea', good: 'milk', price: 6, kind: 'food' },
    { id: 'mug', name: 'Café mug', good: 'pots', price: 15, kind: 'wear', wear: 'mug' }],
    lines: { hi: 'Tea from Matcha, milk from Clover. Sit anywhere.', tierUp: 'The usual? I already started it.', brawlPre: 'Prepare to be steamed.', brawlWin: 'That one was a foam finish.', brawlLose: 'You spilled my tea. Respect.', gift: 'Extra shot, no charge. Bestie perk.' } },
  forge: { id: 'forge', name: 'Forge', owner: 'Anvil', coat: 'gray', lot: 'forge', items: [
    { id: 'trowel', name: 'Garden trowel', good: 'tools', price: 20, kind: 'tool' },
    { id: 'lantern', name: 'Iron lantern', good: 'tools', price: 30, kind: 'wear', wear: 'lantern' }],
    lines: { hi: 'Hammered right here, cooled in the trough.', tierUp: 'You know good iron when you see it.', brawlPre: 'Strike while the iron is hot!', brawlWin: 'Forged in victory.', brawlLose: 'You hit like a hammer. Ouch.', gift: 'A little horseshoe charm. For luck in your shifts.' } },
  candles: { id: 'candles', name: 'Candle Works', owner: 'Taper', coat: 'cream', lot: 'candles', items: [
    { id: 'tealight', name: 'Tea light', good: 'candles', price: 5, kind: 'home' },
    { id: 'beeswax', name: 'Beeswax candle', good: 'candles', price: 9, kind: 'home' }],
    lines: { hi: 'Wax from Honey\u2019s hives, wicks by me.', tierUp: 'You light up this shop.', brawlPre: 'I burn at both ends today!', brawlWin: 'Snuffed out!', brawlLose: 'You outshone me.', gift: 'A tiny tea light. Keep it in your window.' } },
});
export const SHOP_IDS = Object.freeze(Object.keys(SHOPS));
export const GIFTS = Object.freeze({ bakery: 'loaf', tailor: 'tassel', market: 'apple', cafe: 'extra shot', forge: 'horseshoe charm', candles: 'tealight' });
export const MEME_BRAWL_URL = 'https://meme-brawl.vercel.app/';

const h32 = (x) => { let h = 2166136261; for (const c of String(x)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };
export function relOf(s, shopId) { const X = ensureTownx(s); return (X.shops[shopId] ||= { buys: 0, spent: 0, lastGift: -1, brawls: { won: 0, lost: 0 } }); }
export function tierOf(buys) { let t = TIERS[0]; for (const x of TIERS) if (buys >= x.buys) t = x; const i = TIERS.indexOf(t); return { ...t, level: i, next: TIERS[i + 1] || null }; }
export const priceFor = (item, buys) => Math.max(1, Math.ceil(item.price * (1 - tierOf(buys).off)));
// shop stock of an item = town stock of its good, split across the items made from that good (ledger rows from townecon)
export function itemStock(shopId, itemId, ledgerRows) {
  const sh = SHOPS[shopId], it = sh?.items.find((i) => i.id === itemId); if (!it) return 0;
  const row = ledgerRows.find((r) => r.good === it.good); if (!row) return 0;
  const sharing = SHOP_IDS.flatMap((k) => SHOPS[k].items).filter((i) => i.good === it.good).length;
  return Math.max(0, Math.floor(row.stock / sharing));
}
export function soldToday(s, skyDay) { const X = ensureTownx(s); return X.bought.day === skyDay ? X.bought.items : {}; }
// goods the player bought today (feeds the ledger's "used")
export function playerUsed(s, skyDay) { const out = {}; for (const [k, n] of Object.entries(soldToday(s, skyDay))) { const [sh, id] = k.split(':'); const it = SHOPS[sh]?.items.find((i) => i.id === id); if (it) out[it.good] = (out[it.good] || 0) + n; } return out; }

/** buy one item. stock = units on the shelf right now. returns { ok, reason?, paid, tier, tierUp, gift, line } */
export function buy(s, shopId, itemId, { skyDay = 0, stock = 1 } = {}) {
  const sh = SHOPS[shopId], it = sh?.items.find((i) => i.id === itemId); if (!it) return { ok: false, reason: 'Not sold here' };
  const R = relOf(s, shopId), price = priceFor(it, R.buys);
  if (stock <= 0) return { ok: false, reason: `Sold out. ${sh.owner} has ordered more ${it.good} from the workers.` };
  if ((s.bones || 0) < price) return { ok: false, reason: `Need ${price} Bones` };
  const before = tierOf(R.buys);
  s.bones -= price; R.buys++; R.spent += price;
  const X = ensureTownx(s); if (X.bought.day !== skyDay) X.bought = { day: skyDay, items: {} };
  X.bought.items[shopId + ':' + itemId] = (X.bought.items[shopId + ':' + itemId] || 0) + 1;
  X.items ||= {}; X.items[itemId] = (X.items[itemId] || 0) + 1;
  const after = tierOf(R.buys);
  let gift = null; // Besties: about one day in three, the first buy of the day comes with a small gift
  if (after.id === 'bestie' && R.lastGift !== skyDay && h32(shopId + ':' + skyDay) < 0.34) { R.lastGift = skyDay; gift = GIFTS[shopId]; X.items[gift] = (X.items[gift] || 0) + 1; }
  X.log.unshift({ k: 'buy', shop: shopId, item: itemId, paid: price, day: skyDay }); X.log.length = Math.min(X.log.length, 20);
  return { ok: true, paid: price, full: it.price, tier: after, tierUp: after.level > before.level, gift, line: gift ? sh.lines.gift : after.level > before.level ? sh.lines.tierUp : sh.lines.hi, item: it };
}
// Meme Brawl challenge: the owner talks before, the player plays in Meme Brawl, then says how it went
export function brawlResult(s, shopId, won, { skyDay = 0 } = {}) {
  const sh = SHOPS[shopId], R = relOf(s, shopId); if (won) R.brawls.won++; else R.brawls.lost++;
  const X = ensureTownx(s); if (!won) X.injury = { kind: 'brawl', job: shopId, what: 'a bruised tail', day: skyDay };
  return { line: won ? sh.lines.brawlLose : sh.lines.brawlWin, record: { ...R.brawls } };
}

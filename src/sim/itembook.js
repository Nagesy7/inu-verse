// Paw Audit Bureau: the item book. Every step of a player-to-player item deal (offer, edit, confirm, done, cancel, refuse,
// expire, report, block) is one entry on a server-side hash-chained log: same entry format, hashing and verifyChain as ledger.js.
// ITEMS ONLY: an offer is two short lists of item ids ({ a: [...], b: [...] }). Anything that looks like a currency (a main-economy
// key, a unit, an amount, a bare number, a currency-named item) is refused here before it can reach the book, and every entry
// moves value.amount 0. No wallets: parties are opaque 'player:t<16 hex>' handles and addresses are refused (guardNoWallet).
// Used by the deal desk in api/home.js (op "trade", the only non-hook allowed to import sim code, and only this file) and by Check 9.
import { createLog, verifyChain, GENESIS } from './ledger.js';
import { FirewallError, guardNoWallet, ECON_KEYS, ECON_UNITS, SIM_UNIT } from './firewall.js';
import { K } from './anchor.js';

export const ITEM_RE = /^[wf]:[a-z0-9_]{2,40}$/; // w: wardrobe item, f: furniture item
export const MAX_SIDE = 4, MAX_DATA = 600;
export const BOOK_ACTIONS = Object.freeze(['item.offer', 'item.edit', 'item.confirm', 'item.done', 'item.cancel', 'item.refuse', 'item.expire', 'item.report', 'item.block']);
export const PARTY_RE = /^player:t[0-9a-f]{16}$/, DEAL_RE = /^[0-9a-f]{16,32}$/;
export const MONEY_WORDS = Object.freeze(['bone', 'bones', 'kibble', 'kibbles', 'pawmark', 'pawmarks', 'pm', 'token', 'tokens', 'coin', 'coins', 'cash', 'credit', 'credits', 'money',
  'usdc', 'sol', 'lamport', 'lamports', 'point', 'points', 'gem', 'gems', 'bux', 'dollar', 'dollars', 'price', 'cost', 'amount', 'value', 'unit', 'units', 'fee', 'fees', 'tip', 'tips',
  'currency', 'balance', 'pay', 'payment', 'qty', 'quantity', 'count', 'sum', 'total']);
const words = (k) => String(k).replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9$]+/).map((w) => w.replace(/^\$/, '')).filter(Boolean);
export const moneyish = (k) => /bone|kibble|pawmark/i.test(String(k)) || words(k).some((w) => MONEY_WORDS.includes(w));
const isMoneyKey = (k) => { const s = String(k).toLowerCase().replace(/[^a-z$]/g, ''); return ECON_KEYS.filter((x) => x !== 'wardrobe' && x !== 'inventory').includes(s.replace(/^\$/, '')) || moneyish(k); };
const isUnit = (v) => typeof v === 'string' && (ECON_UNITS.includes(v.trim().toUpperCase()) || v.trim().toUpperCase() === SIM_UNIT || v.trim().toUpperCase() === 'PAWMARKS');

// The one gate for what a deal may carry. Returns { a, b } (fresh arrays) or throws FirewallError: 'economy' for anything
// currency-shaped, 'shape' for anything else that isn't two lists of 1..4 distinct item ids.
export function offerItems(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) throw new FirewallError('shape', 'an offer is { a: [items], b: [items] }');
  for (const k of Object.keys(o)) if (k !== 'a' && k !== 'b') throw new FirewallError(isMoneyKey(k) ? 'economy' : 'shape', `offers carry items only, not "${k}"`);
  const side = (list, who) => {
    if (!Array.isArray(list)) throw new FirewallError(typeof list === 'number' || isUnit(list) ? 'economy' : 'shape', `side ${who} must be a list of items`);
    if (list.length < 1 || list.length > MAX_SIDE) throw new FirewallError('shape', `side ${who} needs 1 to ${MAX_SIDE} items (item for item, no gifts)`);
    const out = [];
    for (const id of list) {
      if (typeof id === 'number' || typeof id === 'bigint' || (id && typeof id === 'object') || isUnit(id)) throw new FirewallError('economy', `side ${who}: only item ids, never amounts or currency`);
      if (typeof id !== 'string' || !ITEM_RE.test(id)) throw new FirewallError(/^\s*\d/.test(String(id)) ? 'economy' : 'shape', `side ${who}: "${String(id).slice(0, 40)}" is not an item id`);
      if (isMoneyKey(id.slice(2))) throw new FirewallError('economy', `side ${who}: "${id}" names a currency`);
      if (out.includes(id)) throw new FirewallError('shape', `side ${who}: "${id}" listed twice`);
      out.push(id);
    }
    return out; };
  return { a: side(o.a, 'a'), b: side(o.b, 'b') };
}
// Entry data may describe a step but never carry money: currency keys, units and amounts are refused at any depth.
export function guardItemData(d, path = 'data') {
  if (d == null) return d; guardNoWallet(d, path);
  const walk = (x, p) => { if (x == null) return; if (isUnit(x)) throw new FirewallError('economy', `${p} names a currency unit`);
    if (typeof x !== 'object') return; for (const k of Object.keys(x)) { if (isMoneyKey(k)) throw new FirewallError('economy', `${p}.${k}: the item book carries no currency`); walk(x[k], `${p}.${k}`); } };
  walk(d, path); if (JSON.stringify(d).length > MAX_DATA) throw new FirewallError('shape', `${path} too big`); return d;
}

export function createItemBook(kv, { now = () => Date.now(), sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  const parse = (raw) => { try { return JSON.parse(raw || 'null'); } catch { return null; } };
  const head = async () => parse(await kv.get(K.ibHead())) || { seq: 0, head: GENESIS, ts: 0 };
  async function append({ actor, action, deal, data = null }) {
    if (!BOOK_ACTIONS.includes(action)) throw new FirewallError('shape', `unknown item-book step ${action}`);
    if (actor !== 'sim:bureau' && !PARTY_RE.test(String(actor))) throw new FirewallError('wallet', 'parties are written as opaque player:t… handles');
    if (!DEAL_RE.test(String(deal))) throw new FirewallError('shape', 'bad deal id');
    guardItemData(data);
    for (let i = 0; i < 40; i++) {
      if (await kv.setNX(K.ibLock(), '1', 5)) {
        try { const base = await head(), L = createLog({ now, base });
          const e = L.append({ actor, group: 'sim', action, target: 'deal:' + deal, value: { amount: 0, unit: SIM_UNIT }, data });
          await kv.set(K.ibEntry(e.seq), JSON.stringify(e)); await kv.set(K.ibHead(), JSON.stringify({ seq: e.seq + 1, head: e.hash, ts: e.ts })); return e;
        } finally { try { await kv.del(K.ibLock()); } catch { /* lock expires on its own */ } } }
      await sleep(50); }
    throw new FirewallError('busy', 'item book busy');
  }
  async function read(from = 0, n = 50) { const h = await head(), out = []; for (let s = Math.max(0, from); s < Math.min(h.seq, from + Math.min(n, 500)); s++) { const e = parse(await kv.get(K.ibEntry(s))); if (e) out.push(e); } return out; }
  // Re-hash a window of the book. Every entry must link, re-hash, be a known item step and move nothing (amount 0).
  async function verify(from = 0, n = 200) { const h = await head(), list = await read(from, n);
    if (!list.length) return { ok: true, length: 0, head: h.head };
    const v = verifyChain(list, { base: { seq: from, head: from === 0 ? GENESIS : list[0].prev, ts: 0 }, expectHead: from + list.length === h.seq ? h.head : undefined });
    if (!v.ok) return v;
    const bad = list.findIndex((e) => !BOOK_ACTIONS.includes(e.action) || e.value?.amount !== 0 || e.value?.unit !== SIM_UNIT);
    return bad >= 0 ? { ok: false, at: bad, reason: 'an item-book entry moved value or used an unknown step' } : v; }
  return { append, read, head, verify };
}

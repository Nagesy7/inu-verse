// Player item trading (Round 3): what can be traded, the text each player signs, and how a finished deal lands in a save.
// Shared by the browser (src/tradeui.js) and the deal desk (api/_lib/trades.js, behind /api/home op "trade").
// ITEMS ONLY. No Bones, no Pawmarks, no $KIBBLE ever ride along: the shape gate is the Bureau's offerItems (src/sim/itembook.js,
// re-checked by Bureau Check 9), and this file adds the catalog rule on top. Games never hold or move tokens; nothing here does.
import { OUTFITS } from './outfits.js';
import { FURNITURE } from './furniture.js';

export const TRADE = Object.freeze({ maxSide: 4, ttlMs: 30 * 60e3, lockMs: 3000, maxOpen: 3, perDay: 10, pairPerDay: 3, confirmTtlMs: 5 * 60e3, furnCap: 3 });
// --- what is tradeable -------------------------------------------------------------------------------------------------
// YES: wardrobe items bought with Bones at Fetch Fashion; furniture bought with Bones (base shop + Cosy Corner sets).
// NO : anything bought with $KIBBLE (Kibble Mall wardrobe, mall furniture, Maison Royale sets), President Inu visit drops,
//      login-streak pins, prize / quest / season / pack cosmetics, shop interior props, pets, cars, homes, walls and floors.
export function tradeInfo(id) {
  const m = /^([wf]):([a-z0-9_]{2,40})$/.exec(String(id || '')); if (!m) return null;
  if (m[1] === 'w') { const d = OUTFITS[m[2]]; if (!d) return null;
    const why = d.mall ? 'bought with $KIBBLE' : d.drop ? 'a President Inu visit drop' : !(d.price > 0) ? 'not a shop item' : null;
    return { id, kind: 'wardrobe', key: m[2], name: d.name, slot: d.slot, tradeable: !why, why, unique: true }; }
  const d = FURNITURE[m[2]]; if (!d) return null;
  const why = d.mall || d.kibble || d.store === 'royal' ? 'bought with $KIBBLE' : !(d.price > 0) ? 'not a shop item' : null;
  return { id, kind: 'furniture', key: m[2], name: d.name, tradeable: !why, why, unique: false };
}
export const isTradeable = (id) => !!tradeInfo(id)?.tradeable;
// lazy: outfits.js imports this file (markBought), so nothing here may read OUTFITS while modules are still loading
let IDS = null; export const tradeableIds = () => (IDS ||= Object.freeze([...Object.keys(OUTFITS).map((k) => 'w:' + k), ...Object.keys(FURNITURE).map((k) => 'f:' + k)].filter(isTradeable)));
export const itemName = (id) => tradeInfo(id)?.name || id;

// --- the player's own tradeable stock (from the local save) ------------------------------------------------------------
// Provenance: the same item id can be bought with Bones OR earned (quest/season/burn/photo prizes, starter outfits, twin
// outfits). The save never recorded which, so only copies bought with Bones from now on (or received in a trade) count:
// s.trades.ok[id] = how many tradeable copies. Everything already owned before trading shipped stays untradeable.
const placed = (s, key) => Object.values(s.plots || {}).reduce((n, h) => n + (h?.items || []).filter((it) => it.id === key).length, 0);
export function ensureTrades(s) { if (!s.trades || typeof s.trades !== 'object') s.trades = {}; const T = s.trades;
  if (!Array.isArray(T.applied)) T.applied = []; if (!T.nosell || typeof T.nosell !== 'object') T.nosell = {}; if (!T.ok || typeof T.ok !== 'object') T.ok = {}; return T; }
export function markBought(s, id, n = 1) { if (!isTradeable(id)) return; const T = ensureTrades(s); T.ok[id] = Math.min((T.ok[id] || 0) + n, tradeInfo(id).unique ? 1 : 99); }
export function rawCount(s, id) { const t = tradeInfo(id); if (!t) return 0; return t.kind === 'wardrobe' ? (s.wardrobe?.owned?.includes(t.key) ? 1 : 0) : (s.inventory?.[t.key] || 0); }
// furniture: only what is in storage (not placed in a home) can be offered
export function haveCount(s, id) { if (!isTradeable(id)) return 0; return Math.min(rawCount(s, id), s.trades?.ok?.[id] || 0); }
export function shelfOf(s) { const out = {}; for (const id of tradeableIds()) { const n = haveCount(s, id); if (n > 0) out[id] = Math.min(n, tradeInfo(id).unique ? 1 : TRADE.furnCap); } return out; }
// what the player owns that can't be traded, and why (shown greyed in the panel so the rule is visible)
export function lockedOf(s) { const out = []; for (const k of s.wardrobe?.owned || []) { const id = 'w:' + k, t = tradeInfo(id); if (t && haveCount(s, id) < 1) out.push({ id, name: t.name, why: t.why || 'earned or owned before trading opened' }); }
  for (const [k, n] of Object.entries(s.inventory || {})) { const id = 'f:' + k, t = tradeInfo(id); if (t && n > haveCount(s, id)) out.push({ id, name: t.name, why: t.why || 'earned or owned before trading opened' }); } return out; }

// Furniture received in a trade can't be sold back to the shop for Bones (otherwise a trade would be a Bones transfer).
export function canSellFurniture(s, key) { const held = s.trades?.nosell?.[key] || 0; if (!held) return true; return (s.inventory?.[key] || 0) + placed(s, key) > held; }
// after any furniture sale, tradeable copies can't exceed what is left in storage
export function afterFurnitureSold(s, key) { const T = s.trades; if (!T?.ok?.['f:' + key]) return; T.ok['f:' + key] = Math.min(T.ok['f:' + key], s.inventory?.[key] || 0); if (!T.ok['f:' + key]) delete T.ok['f:' + key]; }

// --- the text each player signs (wallet sign-message only, never a transaction) ---------------------------------------
export function confirmText(d, side) {
  const list = (ids) => ids.map((id) => `  - ${itemName(id)} [${id}]`).join('\n');
  return [`Inu Verse item trade`, `I confirm this item-for-item trade. No Bones, Pawmarks or $KIBBLE change hands.`, `This signature is not a transaction and cannot move funds.`, ``,
    `Trade: ${d.id}`, `Version: ${d.ver}`, `Me: ${side === 'a' ? d.aw : d.bw}`, `With: ${side === 'a' ? d.bShort : d.aShort} (${side === 'a' ? d.bt : d.at})`, ``,
    `I give:`, list(side === 'a' ? d.give.a : d.give.b), `I get:`, list(side === 'a' ? d.give.b : d.give.a), ``,
    `Nonce: ${d.nonce}`, `Expires: ${new Date(d.confirmBy).toISOString()}`].join('\n');
}

// --- landing a finished deal in the local save (idempotent: each deal applies once) -----------------------------------
export function applyDeal(s, d, me) {
  const T = ensureTrades(s); if (!d || d.status !== 'done' || T.applied.includes(d.id)) return { ok: false, why: 'already' };
  const mine = d.at === me ? 'a' : d.bt === me ? 'b' : null; if (!mine) return { ok: false, why: 'not mine' };
  const give = d.give[mine], get = d.give[mine === 'a' ? 'b' : 'a'];
  if (!s.wardrobe) s.wardrobe = { owned: [], equipped: {} }; if (!s.inventory) s.inventory = {};
  for (const id of give) { const t = tradeInfo(id); if (!t) continue;
    if (T.ok[id] > 0) { T.ok[id]--; if (!T.ok[id]) delete T.ok[id]; }
    if (t.kind === 'wardrobe') { s.wardrobe.owned = s.wardrobe.owned.filter((k) => k !== t.key); for (const [sl, k] of Object.entries(s.wardrobe.equipped || {})) if (k === t.key) delete s.wardrobe.equipped[sl]; }
    else { if (s.inventory[t.key] > 0) { s.inventory[t.key]--; if (!s.inventory[t.key]) delete s.inventory[t.key]; } if (T.nosell[t.key] > 0) { T.nosell[t.key]--; if (!T.nosell[t.key]) delete T.nosell[t.key]; } } }
  for (const id of get) { const t = tradeInfo(id); if (!t) continue; T.ok[id] = Math.min((T.ok[id] || 0) + 1, t.unique ? 1 : 99);
    if (t.kind === 'wardrobe') { if (!s.wardrobe.owned.includes(t.key)) s.wardrobe.owned.push(t.key); }
    else { s.inventory[t.key] = (s.inventory[t.key] || 0) + 1; T.nosell[t.key] = (T.nosell[t.key] || 0) + 1; } }
  T.applied = [...T.applied, d.id].slice(-200); return { ok: true, gave: give, got: get };
}
// Before signing, the browser checks the deal against the real save: I still have what I give, and I don't already own a
// wardrobe item I'd get (it would be lost).
export function checkMine(s, d, side) {
  const give = d.give[side], get = d.give[side === 'a' ? 'b' : 'a'];
  for (const id of [...give, ...get]) if (!isTradeable(id)) return { ok: false, why: `${itemName(id)} can't be traded` };
  for (const id of give) if (haveCount(s, id) < give.filter((x) => x === id).length) return { ok: false, why: `You no longer have ${itemName(id)} in storage` };
  for (const id of get) if (tradeInfo(id).unique && haveCount(s, id) > 0) return { ok: false, why: `You already own ${itemName(id)}` };
  return { ok: true };
}

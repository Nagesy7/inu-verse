import { PLOTS, PLOT_COST, TILE } from './world.js';
import { ensurePacks } from './packs.js';
import { FURNITURE, WALLS, FLOORS, canPlace } from './furniture.js';
import { markBought, canSellFurniture, afterFurnitureSold } from './trade.js';

export const START_BONES = 500, START_KIBBLE = 200000, BONES_PER_KIBBLE = 0.0025, SELL_BACK = 0.5;
// The six starter Shiba coats (only avatar choices at character creation).
export const COATS = {
  tan:    { name: 'Classic Tan',    base: '#d98b45', dark: '#a8622c', light: '#f7e6c8', ear: '#f0b48e' },
  cream:  { name: 'Cream / White',  base: '#efe4cf', dark: '#c9b79a', light: '#fffaf0', ear: '#f3c6b0' },
  red:    { name: 'Reddish-Brown',  base: '#b4532b', dark: '#7f351a', light: '#f3d9bf', ear: '#e59a7c' },
  dark:   { name: 'Dark Brown',     base: '#4b3529', dark: '#2d1f18', light: '#8c6b52', ear: '#7a5644' },
  golden: { name: 'Light Golden',   base: '#e9b75c', dark: '#bf8a36', light: '#fcf0d4', ear: '#f4c79a' },
  gray:   { name: 'Gray',           base: '#a4a7ad', dark: '#73777e', light: '#ececee', ear: '#d6b3b0' },
};
const COAT_ALIASES = { sesame: 'tan', black: 'dark' };
export const normalizeCoat = (c) => (COATS[c] ? c : COATS[COAT_ALIASES[c]] ? COAT_ALIASES[c] : 'tan');

export function newGame({ name = 'Inu', coat = 'tan' } = {}) {
  const s = {
    v: 1, player: { name: String(name).slice(0, 14) || 'Inu', coat: normalizeCoat(coat), x: 31.5 * TILE, y: 23.5 * TILE },
    bones: START_BONES, kibble: START_KIBBLE, plots: {}, inventory: {}, tokens: [], uid: 1,
    stats: { shifts: 0, bonesEarned: 0, served: 0 }, simTime: 0,
    wardrobe: { owned: [], equipped: {} },
    packs: null,
  };
  ensurePacks(s); s.mall = { v: 1, treasury: 0, pools: { daily: 0, weekly: 0, monthly: 0 }, owned: [], cars: [], ledger: [], winners: [], period: { day: 0 }, activity: { dayBones: 0, weekDecor: 0 } }; return s;
}

const ok = (extra = {}) => ({ ok: true, ...extra });
const fail = (reason) => ({ ok: false, reason });

export function claimPlot(s, plotId) {
  if (!PLOTS.find((p) => p.id === plotId)) return fail('No such plot');
  if (s.plots[plotId]) return fail('Already yours');
  if (s.bones < PLOT_COST) return fail(`Need ${PLOT_COST} bones`);
  s.bones -= PLOT_COST;
  s.plots[plotId] = { wall: 0, floor: 0, items: [], roof: ['#e0735a', '#5a8de0', '#69b67a', '#b07ad6'][Object.keys(s.plots).length % 4] };
  return ok();
}

export function buyFurniture(s, id, qty = 1) {
  const d = FURNITURE[id];
  if (!d) return fail('Unknown item');
  if (s.bones < d.price * qty) return fail('Not enough bones');
  s.bones -= d.price * qty;
  s.inventory[id] = (s.inventory[id] || 0) + qty; markBought(s, 'f:' + id, qty); // Bones-bought copies are tradeable (src/trade.js)
  return ok();
}

export function sellFromInventory(s, id) {
  if (!s.inventory[id]) return fail('None in inventory');
  if (!canSellFurniture(s, id)) return fail("Got it in a trade, so it can't be sold for Bones");
  s.inventory[id]--; if (!s.inventory[id]) delete s.inventory[id]; afterFurnitureSold(s, id);
  const refund = Math.floor(FURNITURE[id].price * SELL_BACK);
  s.bones += refund; return ok({ refund });
}

export function placeFurniture(s, plotId, id, x, y, rot = 0) {
  const home = s.plots[plotId];
  if (!home) return fail('Not your plot');
  if (!s.inventory[id]) return fail('Buy it at the Furniture Shop first');
  if (!canPlace(home, id, x, y, rot)) return fail('Blocked');
  s.inventory[id]--; if (!s.inventory[id]) delete s.inventory[id];
  const item = { uid: s.uid++, id, x, y, rot: rot % 4 };
  home.items.push(item); return ok({ item });
}

export function moveFurniture(s, plotId, uid, x, y, rot) {
  const home = s.plots[plotId]; const it = home?.items.find((i) => i.uid === uid);
  if (!it) return fail('Missing');
  if (!canPlace(home, it.id, x, y, rot, uid)) return fail('Blocked');
  it.x = x; it.y = y; it.rot = rot % 4; return ok();
}

export function storeFurniture(s, plotId, uid) {
  const home = s.plots[plotId]; const i = home?.items.findIndex((x) => x.uid === uid);
  if (i == null || i < 0) return fail('Missing');
  const [it] = home.items.splice(i, 1); s.inventory[it.id] = (s.inventory[it.id] || 0) + 1; return ok();
}

export function sellPlaced(s, plotId, uid) {
  const home = s.plots[plotId]; const it = home?.items.find((x) => x.uid === uid);
  if (!it) return fail('Missing');
  if (!canSellFurniture(s, it.id)) return fail("Got it in a trade, so it can't be sold for Bones");
  const r = storeFurniture(s, plotId, uid); if (!r.ok) return r;
  return sellFromInventory(s, it.id);
}

export function upgrade(s, plotId, kind, level) {
  const home = s.plots[plotId]; if (!home) return fail('Not your plot');
  const list = kind === 'wall' ? WALLS : FLOORS; const opt = list[level];
  if (!opt) return fail('Unknown');
  if (home[kind] === level) return fail('Already applied');
  if (s.bones < opt.price) return fail('Not enough bones');
  s.bones -= opt.price; home[kind] = level; return ok();
}

export function swapBonesToKibble(s, bones) {
  bones = Math.floor(bones);
  if (!(bones > 0)) return fail('Enter an amount');
  if (s.bones < bones) return fail('Not enough bones');
  s.bones -= bones; const kibble = bones / BONES_PER_KIBBLE; s.kibble += kibble; return ok({ kibble });
}

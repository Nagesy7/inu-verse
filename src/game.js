import { PLOTS, PLOT_COST, TILE } from './world.js';
import { FURNITURE, WALLS, FLOORS, canPlace } from './furniture.js';

export const START_BONES = 500, START_KIBBLE = 20, BONES_PER_KIBBLE = 25, SELL_BACK = 0.5;
export const COATS = {
  red: { name: 'Classic Red', base: '#d9803a', dark: '#b4602a' },
  sesame: { name: 'Sesame', base: '#c58b52', dark: '#5f412a' },
  black: { name: 'Black & Tan', base: '#2e2724', dark: '#1d1816', tan: '#d39a5e' },
  cream: { name: 'Cream', base: '#f0dbb2', dark: '#d4b886' },
};

export function newGame({ name = 'Inu', coat = 'red' } = {}) {
  return {
    v: 1, player: { name: String(name).slice(0, 14) || 'Inu', coat: COATS[coat] ? coat : 'red', x: 31.5 * TILE, y: 23.5 * TILE },
    bones: START_BONES, kibble: START_KIBBLE, plots: {}, inventory: {}, tokens: [], uid: 1,
    stats: { shifts: 0, bonesEarned: 0, served: 0 }, simTime: 0,
  };
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
  s.inventory[id] = (s.inventory[id] || 0) + qty;
  return ok();
}

export function sellFromInventory(s, id) {
  if (!s.inventory[id]) return fail('None in inventory');
  s.inventory[id]--; if (!s.inventory[id]) delete s.inventory[id];
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

// Opt-in workplace preview. Positions are town tiles. Routes use the existing
// path network only (walk, road, plaza, dirt). This module does not change the
// map, and it never reads or writes inuverse.save.v1.
import { MAP, T, isSolid, NETWORK, MAP_W, MAP_H, PLOTS, TILE } from './world.js';

export const SAVE_KEY = 'inuverse.preview.npcwork.v1';
export const LIVE_SAVE_KEY = 'inuverse.save.v1';
export const DAILY_ISSUE = 40;
export const CHIT_CAP = 160;
export const TAG = 'npc-buildings-1';

export const LUMBER = Object.freeze({ id: 'lumber', name: 'Lumber Yard', x: 50, y: 96, w: 6, h: 4, door: Object.freeze([50, 95]) });
export const MECHANIC = Object.freeze({ id: 'mechanic', name: "Mechanic's Shop", x: 28, y: 2, w: 5, h: 4, door: Object.freeze([30, 6]) });
export const RECYCLER = Object.freeze([30, 8]);
export const HOMES = Object.freeze({
  timber: Object.freeze([12, 40]),
  wrench: Object.freeze([26, 40]),
  porter: Object.freeze([19, 40]),
});

export function onPath(x, y) {
  return x > 0 && y > 0 && x < MAP_W - 1 && y < MAP_H - 1 && NETWORK.has(MAP[y][x]) && !isSolid(x, y);
}

export function pathTiles(from, to) {
  const [sx, sy] = from;
  const [tx, ty] = to;
  if (!onPath(sx, sy) || !onPath(tx, ty)) return null;
  const key = (x, y) => y * MAP_W + x;
  const prev = new Map([[key(sx, sy), -1]]);
  const q = [[sx, sy]];
  let head = 0;
  while (head < q.length) {
    const [x, y] = q[head++];
    if (x === tx && y === ty) {
      const path = [];
      let k = key(x, y);
      while (k !== -1) {
        path.push([k % MAP_W, Math.floor(k / MAP_W)]);
        k = prev.get(k);
      }
      return path.reverse();
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (onPath(nx, ny) && !prev.has(key(nx, ny))) {
        prev.set(key(nx, ny), key(x, y));
        q.push([nx, ny]);
      }
    }
  }
  return null;
}

function mustPath(from, to, name) {
  const path = pathTiles(from, to);
  if (!path) throw new Error(`no existing path for ${name}`);
  return path;
}

export const ROUTES = Object.freeze({
  timber: mustPath(HOMES.timber, LUMBER.door, 'timber'),
  wrench: mustPath(HOMES.wrench, MECHANIC.door, 'wrench'),
  toLumber: mustPath(HOMES.porter, LUMBER.door, 'porter to lumber'),
  toShop: mustPath(LUMBER.door, MECHANIC.door, 'porter to mechanic'),
  toRecycler: mustPath(MECHANIC.door, RECYCLER, 'porter to recycler'),
  timberHome: mustPath(LUMBER.door, HOMES.timber, 'timber home'),
  wrenchHome: mustPath(MECHANIC.door, HOMES.wrench, 'wrench home'),
  porterHome: mustPath(RECYCLER, HOMES.porter, 'porter home'),
});

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function lotProof() {
  return [LUMBER, MECHANIC].map((lot) => {
    const tiles = [];
    for (let y = lot.y; y < lot.y + lot.h; y++) {
      for (let x = lot.x; x < lot.x + lot.w; x++) tiles.push({ x, y, tile: MAP[y][x], solid: isSolid(x, y) });
    }
    return {
      id: lot.id,
      name: lot.name,
      x: lot.x,
      y: lot.y,
      w: lot.w,
      h: lot.h,
      door: [...lot.door],
      doorOnPath: onPath(lot.door[0], lot.door[1]),
      allEmptyGrass: tiles.every((t) => (t.tile === T.GRASS || t.tile === T.FLOWER) && !t.solid),
      claimPlots: PLOTS.filter((p) => overlaps(lot, p)).map((p) => p.id),
      tiles,
    };
  });
}

export function seedState() {
  return {
    tag: TAG,
    day: 1,
    beat: 'home',
    leg: 'toLumber',
    phase: 0,
    chits: 0,
    issuedDawn: 0,
    lastIssue: 0,
    cut: 0,
    logs: 0,
    planks: 0,
    shopPlanks: 0,
    cart: 'broken',
    cargo: null,
    recycled: 0,
    shortage: 'SHORT 1 PLANK',
    i: { timber: 0, wrench: 0, porter: 0 },
  };
}

function issueDawn(s) {
  const n = Math.max(0, Math.min(DAILY_ISSUE, CHIT_CAP - s.chits));
  s.chits += n;
  s.issuedDawn += n;
  s.lastIssue = n;
}

function stepAlong(s, id, route) {
  if (s.i[id] < route.length - 1) s.i[id] += 1;
  return s.i[id] >= route.length - 1;
}

export function advance(input) {
  const s = input;
  s.phase += 1;
  if (s.beat === 'home') {
    issueDawn(s);
    s.beat = 'walk';
    return s;
  }
  if (s.beat === 'walk') {
    const timberIn = stepAlong(s, 'timber', ROUTES.timber);
    const wrenchIn = stepAlong(s, 'wrench', ROUTES.wrench);
    if (timberIn && wrenchIn) s.beat = 'work';
    return s;
  }
  if (s.beat === 'work') {
    if (s.cut < 4) {
      s.cut += 1;
      s.logs += 1;
    } else if (s.cart === 'broken') s.cart = 'fixed';
    else if (s.logs >= 2 && s.planks < 1) {
      s.logs -= 2;
      s.planks += 1;
    } else s.beat = 'deliver';
    return s;
  }
  if (s.beat === 'deliver') {
    const route = ROUTES[s.leg];
    if (s.i.porter < route.length - 1) {
      s.i.porter += 1;
      return s;
    }
    if (s.leg === 'toLumber' && s.cargo == null && s.planks >= 1) {
      s.planks -= 1;
      s.cargo = 'plank';
      s.leg = 'toShop';
      s.i.porter = 0;
      return s;
    }
    if (s.leg === 'toShop' && s.cargo === 'plank') {
      s.shopPlanks += 1;
      s.cargo = null;
      s.shortage = 'FILLED';
      if (s.cart === 'fixed') {
        s.cart = 'carried';
        s.cargo = 'tool';
      }
      s.leg = 'toRecycler';
      s.i.porter = 0;
      return s;
    }
    if (s.leg === 'toRecycler' && s.cargo === 'tool') {
      s.recycled += 1;
      s.cargo = null;
      s.cart = 'recycled';
      s.beat = 'homebound';
      s.i.timber = 0;
      s.i.wrench = 0;
      s.i.porter = 0;
    }
    return s;
  }
  if (s.beat === 'homebound') {
    const done = [
      stepAlong(s, 'timber', ROUTES.timberHome),
      stepAlong(s, 'wrench', ROUTES.wrenchHome),
      stepAlong(s, 'porter', ROUTES.porterHome),
    ].every(Boolean);
    if (done) {
      s.beat = 'nextdawn';
      s.day += 1;
      issueDawn(s);
    }
  }
  return s;
}

export function seek(label) {
  const s = seedState();
  const want = () => {
    if (label === 'home') return s.beat === 'home';
    if (label === 'walking') return s.beat === 'walk' && s.i.timber === 15 && s.i.wrench === 15 && s.logs === 0 && s.cart === 'broken';
    if (label === 'working-lumber') return s.beat === 'work' && s.logs === 4 && s.planks === 0 && s.cart === 'broken';
    if (label === 'working-mechanic') return s.beat === 'work' && s.cart === 'fixed' && s.logs === 4 && s.planks === 0;
    if (label === 'delivery') return s.leg === 'toShop' && s.cargo === 'plank' && s.planks === 0 && s.shopPlanks === 0 && s.i.porter === Math.floor(ROUTES.toShop.length / 2);
    if (label === 'nextdawn') return s.beat === 'nextdawn';
    return false;
  };
  if (want()) return s;
  for (let n = 0; n < 8000; n++) {
    advance(s);
    if (want()) return s;
  }
  throw new Error(`no frame ${label}`);
}

function routeFor(s, id) {
  if (s.beat === 'home' || s.beat === 'nextdawn') return id === 'porter' ? ROUTES.toLumber : ROUTES[id];
  if (s.beat === 'homebound') return ROUTES[id === 'timber' ? 'timberHome' : id === 'wrench' ? 'wrenchHome' : 'porterHome'];
  if (id === 'porter') return s.beat === 'deliver' ? ROUTES[s.leg] : ROUTES.toLumber;
  return ROUTES[id];
}

function indexFor(s, id) {
  if (s.beat === 'home' || s.beat === 'nextdawn') return 0;
  if (id === 'porter' && (s.beat === 'walk' || s.beat === 'work')) return 0;
  return s.i[id];
}

export function crewView(s) {
  const out = {};
  for (const id of ['timber', 'wrench', 'porter']) {
    const route = routeFor(s, id);
    const i = Math.max(0, Math.min(route.length - 1, indexFor(s, id)));
    const [tx, ty] = route[i];
    const nxt = route[Math.min(route.length - 1, i + 1)];
    const moving = i < route.length - 1 && (s.beat === 'walk' || s.beat === 'deliver' || s.beat === 'homebound') && !(id === 'porter' && s.beat !== 'deliver' && s.beat !== 'homebound');
    let face = 'down';
    if (moving) {
      const dx = nxt[0] - tx;
      const dy = nxt[1] - ty;
      face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    } else if ((id === 'timber' && tx === LUMBER.door[0] && ty === LUMBER.door[1]) || (id === 'wrench' && tx === MECHANIC.door[0] && ty === MECHANIC.door[1])) face = 'up';
    let place = 'path';
    if ((s.beat === 'home' || s.beat === 'nextdawn') && i === 0) place = 'home';
    else if (tx === LUMBER.door[0] && ty === LUMBER.door[1] && id !== 'wrench') place = 'lumber';
    else if (tx === MECHANIC.door[0] && ty === MECHANIC.door[1]) place = 'mechanic';
    else if (tx === RECYCLER[0] && ty === RECYCLER[1]) place = 'recycler';
    else if (i === 0 && id === 'porter' && s.beat !== 'deliver') place = 'home';
    const working = s.beat === 'work' && ((id === 'timber' && place === 'lumber') || (id === 'wrench' && place === 'mechanic'));
    out[id] = {
      id, tx, ty, x: tx * TILE + 16, y: ty * TILE + 16, face, moving, place, working,
      name: id === 'timber' ? 'Timber' : id === 'wrench' ? 'Wrench' : 'Porter',
      coat: id === 'timber' ? 'tan' : id === 'wrench' ? 'gray' : 'cream',
      tool: id === 'timber' ? 'axe' : id === 'wrench' ? 'wrench' : '',
    };
  }
  return out;
}

export function plankTotal(s) {
  return s.planks + s.shopPlanks + (s.cargo === 'plank' ? 1 : 0);
}

export function conserved(s) {
  const carts = ['broken', 'fixed', 'carried', 'recycled'];
  return s.logs >= 0 && s.logs + 2 * plankTotal(s) === s.cut
    && plankTotal(s) <= 1 && s.recycled <= 1
    && carts.includes(s.cart)
    && (s.cargo === 'tool') === (s.cart === 'carried')
    && (s.recycled === 1) === (s.cart === 'recycled')
    && s.chits === s.issuedDawn && s.issuedDawn <= DAILY_ISSUE * s.day && s.chits <= CHIT_CAP;
}

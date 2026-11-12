// Workplace errands on the reviewed town. Doors and stands come from the layout lots.
// The old ROUTES table in npcbuildings.js stays the ?npcwork=0 streets.
import { isBlocked, lotById, proposalPath, tileAt, T } from './townproposal.js';

function door(id) {
  const lot = lotById(id);
  if (!lot) throw new Error(`no lot ${id}`);
  return [lot.door[0], lot.door[1]];
}

function beside(id) {
  const [x, y] = door(id);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx;
    const ny = y + dy;
    if (!isBlocked(nx, ny)) return [nx, ny];
  }
  return [x, y];
}

function roadPast(from, steps) {
  const q = [[from[0], from[1], 0]];
  const seen = new Set();
  while (q.length) {
    const [x, y, d] = q.shift();
    const k = `${x},${y}`;
    if (seen.has(k)) continue;
    seen.add(k);
    if (d >= steps && tileAt(x, y) === T.ROAD) return [x, y];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!isBlocked(x + dx, y + dy)) q.push([x + dx, y + dy, d + 1]);
    }
  }
  throw new Error('no road past the mechanic');
}

function join(from, to, name) {
  const path = proposalPath(from[0], from[1], to[0], to[1]);
  if (!path) throw new Error(`no layout path for ${name}: ${from} -> ${to}`);
  return path;
}

let cached = null;

export function layoutPlan() {
  if (cached) return cached;
  const lumber = door('lumber');
  const sawmill = door('sawmill');
  const bakery = door('bakery');
  const mill = door('mill');
  const farm = door('farm');
  const mine = door('mine');
  const smelter = door('smelter');
  const forge = door('forge');
  const mechanic = door('mechanic');
  const scrap = door('scrap');
  const tailor = door('tailor');
  const cloth = door('cloth');
  const sign = beside('mechanic');
  const rack = beside('tailor');
  const homes = {
    timber: door('h1'),
    wrench: door('h3'),
    porter: door('p1'),
    saw: beside('sawmill'),
    stitch: beside('tailor'),
    crumb: beside('bakery'),
    bolt: beside('scrap'),
    sprout: beside('farm'),
    dusty: beside('mill'),
    pike: beside('mine'),
    ember: beside('smelter'),
    smith: beside('forge'),
  };
  const ends = {
    timber: [homes.timber, lumber],
    wrench: [homes.wrench, mechanic],
    saw: [homes.saw, sawmill],
    stitch: [homes.stitch, tailor],
    crumb: [homes.crumb, bakery],
    bolt: [homes.bolt, scrap],
    sprout: [homes.sprout, farm],
    dusty: [homes.dusty, mill],
    pike: [homes.pike, mine],
    ember: [homes.ember, smelter],
    smith: [homes.smith, forge],
    farmToMill: [farm, mill],
    millToBakery: [mill, bakery],
    mineToSmelter: [mine, smelter],
    smelterToForge: [smelter, forge],
    forgeToLumber: [forge, lumber],
    forgeToSign: [forge, sign],
    lumberToScrap: [lumber, scrap],
    scrapToSmelter: [scrap, smelter],
    toLumber: [homes.porter, lumber],
    lumberToSaw: [lumber, sawmill],
    sawToSign: [sawmill, sign],
    signToScrap: [sign, scrap],
    scrapToSign: [scrap, sign],
    signToCloth: [sign, cloth],
    clothToTailor: [cloth, tailor],
    tailorToRack: [tailor, rack],
    rackToBakery: [rack, bakery],
    bakeryToLumber: [bakery, lumber],
    carExit: [mechanic, roadPast(mechanic, 4)],
  };
  const routes = {};
  const anchors = {};
  for (const [name, [from, to]] of Object.entries(ends)) {
    routes[name] = join(from, to, name);
    anchors[name] = { from, to };
  }
  const commute = ['timber', 'wrench', 'saw', 'stitch', 'crumb', 'bolt', 'sprout', 'dusty', 'pike', 'ember', 'smith'];
  for (const name of commute) {
    routes[`${name}Home`] = routes[name].slice().reverse();
    anchors[`${name}Home`] = { from: anchors[name].to, to: anchors[name].from };
  }
  routes.porterHome = routes.toLumber.slice().reverse();
  anchors.porterHome = { from: anchors.toLumber.to, to: anchors.toLumber.from };
  cached = { routes, anchors };
  return cached;
}

export function layoutRoutes() {
  return layoutPlan().routes;
}

export function layoutAnchors() {
  return layoutPlan().anchors;
}

export function layoutPose(key, index, length) {
  const route = layoutRoutes()[key];
  if (!route) throw new Error(`no layout route ${key}`);
  const span = Math.max(1, length - 1);
  const j = length <= 1 ? 0 : Math.round((index * (route.length - 1)) / span);
  const i = Math.max(0, Math.min(route.length - 1, j));
  const here = route[i];
  const nxt = route[Math.min(route.length - 1, i + 1)];
  const dx = nxt[0] - here[0];
  const dy = nxt[1] - here[1];
  let face = 'down';
  if (dx || dy) face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  return { tx: here[0], ty: here[1], face };
}

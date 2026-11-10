// Opt-in workplace preview. The lumber yard and the mechanic stay on their
// existing grass. Sawmill, tailor, bakery and scrap yard sit on a south
// extension so no old building, path or coordinate moves. This module never
// reads or writes inuverse.save.v1.
import { MAP, T, isSolid, NETWORK, MAP_W, MAP_H, TOWN_H, PLOTS, TILE } from './world.js';

export const SAVE_KEY = 'inuverse.preview.npcwork.v1';
export const LIVE_SAVE_KEY = 'inuverse.save.v1';
export const DAILY_ISSUE = 40;
export const CHIT_CAP = 160;
export const TAG = 'npc-buildings-1';
export const CHOP_CAP = 4;
export const FLOUR_STOCK = 2;
export const CLOTH_STOCK = 1;

export const LUMBER = Object.freeze({ id: 'lumber', name: 'Lumber Yard', x: 50, y: 96, w: 6, h: 4, door: Object.freeze([50, 95]), work: Object.freeze([52, 98]), saw: Object.freeze([53, 97]) });
export const MECHANIC = Object.freeze({ id: 'mechanic', name: "Mechanic's Shop", x: 28, y: 2, w: 5, h: 4, door: Object.freeze([30, 6]), work: Object.freeze([30, 4]), bay: Object.freeze([31, 4]) });
export const SIGN = Object.freeze([33, 6]);
// South work quarter. The street is the row under each footprint (lot.y+4), joined to the farm walk through grass (52,104) and the border tree (52,105).
export const WORK_JOIN = Object.freeze([[52, 104], [52, 105]]);
export const JOIN_WAS = Object.freeze({ '52,104': T.GRASS, '52,105': T.TREE });
export const QUARTER_STREET = 113;
export const SAWMILL = Object.freeze({ id: 'sawmill', name: 'Sawmill', x: 6, y: 109, w: 5, h: 4, door: Object.freeze([8, 113]), work: Object.freeze([8, 111]) });
export const TAILOR = Object.freeze({ id: 'tailor', name: 'Tailor', x: 16, y: 109, w: 5, h: 4, door: Object.freeze([20, 113]), rack: Object.freeze([23, 113]) });
export const BAKERY = Object.freeze({ id: 'bakery', name: 'Bakery', x: 28, y: 109, w: 5, h: 4, door: Object.freeze([32, 113]), work: Object.freeze([32, 111]) });
export const SCRAP = Object.freeze({ id: 'scrap', name: 'Scrap Yard', x: 40, y: 109, w: 6, h: 4, door: Object.freeze([43, 113]), work: Object.freeze([43, 111]) });
export const CLOTH = Object.freeze([58, 113]);
export const HOMES = Object.freeze({
  timber: Object.freeze([12, 40]),
  wrench: Object.freeze([26, 40]),
  porter: Object.freeze([19, 40]),
  saw: Object.freeze([6, 113]),
  stitch: Object.freeze([16, 113]),
  crumb: Object.freeze([28, 113]),
  bolt: Object.freeze([40, 113]),
});

function paintBox(x, y, w, h, tile) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (MAP[yy]) MAP[yy][xx] = tile;
}

function paintQuarter() {
  for (let y = TOWN_H; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      MAP[y][x] = ((x * 73856093) ^ (y * 19349663)) % 23 === 0 ? T.FLOWER : T.GRASS;
    }
  }
  for (let y = TOWN_H; y < MAP_H; y++) { MAP[y][0] = T.TREE; MAP[y][MAP_W - 1] = T.TREE; }
  for (let x = 0; x < MAP_W; x++) MAP[MAP_H - 1][x] = T.TREE;
  for (let x = 4; x <= 60; x++) MAP[QUARTER_STREET][x] = T.WALK;
  for (let y = 106; y <= QUARTER_STREET; y++) MAP[y][52] = T.WALK;
  MAP[104][52] = T.WALK;
  MAP[105][52] = T.WALK;
  for (const b of [SAWMILL, TAILOR, BAKERY, SCRAP]) paintBox(b.x, b.y, b.w, b.h, T.BUILDING);
}
paintQuarter();

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
  if (!path) throw new Error(`no path for ${name}: ${from} -> ${to}`);
  return path;
}

export const ROUTES = Object.freeze({
  timber: mustPath(HOMES.timber, LUMBER.door, 'timber'),
  wrench: mustPath(HOMES.wrench, MECHANIC.door, 'wrench'),
  saw: mustPath(HOMES.saw, SAWMILL.door, 'saw'),
  stitch: mustPath(HOMES.stitch, TAILOR.door, 'stitch'),
  crumb: mustPath(HOMES.crumb, BAKERY.door, 'crumb'),
  bolt: mustPath(HOMES.bolt, SCRAP.door, 'bolt'),
  toLumber: mustPath(HOMES.porter, LUMBER.door, 'porter to lumber'),
  lumberToSaw: mustPath(LUMBER.door, SAWMILL.door, 'porter log to saw'),
  sawToSign: mustPath(SAWMILL.door, SIGN, 'porter plank to sign'),
  signToScrap: mustPath(SIGN, SCRAP.door, 'porter parts to scrap'),
  scrapToSign: mustPath(SCRAP.door, SIGN, 'porter scrap to sign'),
  signToCloth: mustPath(SIGN, CLOTH, 'porter to cloth'),
  clothToTailor: mustPath(CLOTH, TAILOR.door, 'porter cloth to tailor'),
  tailorToRack: mustPath(TAILOR.door, TAILOR.rack, 'porter coat to rack'),
  rackToBakery: mustPath(TAILOR.rack, BAKERY.door, 'porter to bakery'),
  bakeryToLumber: mustPath(BAKERY.door, LUMBER.door, 'porter bread to yard'),
  timberHome: mustPath(LUMBER.door, HOMES.timber, 'timber home'),
  wrenchHome: mustPath(MECHANIC.door, HOMES.wrench, 'wrench home'),
  sawHome: mustPath(SAWMILL.door, HOMES.saw, 'saw home'),
  stitchHome: mustPath(TAILOR.door, HOMES.stitch, 'stitch home'),
  crumbHome: mustPath(BAKERY.door, HOMES.crumb, 'crumb home'),
  boltHome: mustPath(SCRAP.door, HOMES.bolt, 'bolt home'),
  porterHome: mustPath(LUMBER.door, HOMES.porter, 'porter home'),
  carExit: mustPath(MECHANIC.door, [31, 10], 'car onto the road'),
});

const CREW = ['timber', 'wrench', 'porter', 'saw', 'stitch', 'crumb', 'bolt'];

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function lotProof() {
  return [LUMBER, MECHANIC, SAWMILL, TAILOR, BAKERY, SCRAP].map((lot) => {
    const tiles = [];
    for (let y = lot.y; y < lot.y + lot.h; y++) {
      for (let x = lot.x; x < lot.x + lot.w; x++) tiles.push({ x, y, tile: MAP[y][x], solid: isSolid(x, y) });
    }
    const expansion = lot.y >= TOWN_H;
    return {
      id: lot.id,
      name: lot.name,
      x: lot.x,
      y: lot.y,
      w: lot.w,
      h: lot.h,
      door: [...lot.door],
      doorOnPath: onPath(lot.door[0], lot.door[1]),
      expansion,
      allEmptyGrass: tiles.every((t) => (t.tile === T.GRASS || t.tile === T.FLOWER) && !t.solid),
      onNewGround: expansion && tiles.every((t) => t.y >= TOWN_H),
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
    act: 'chop',
    axe: 0,
    shownChop: false,
    wrenchSwing: 0,
    logs: 0,
    millLogs: 0,
    planks: 0,
    sawed: 0,
    sawFrame: 0,
    shopPlanks: 0,
    plankUsed: 0,
    cart: 'broken',
    cargo: null,
    shortage: 'SHORT 1 PLANK',
    car: 'broken',
    carI: 0,
    bay: 'broken',
    bayFrame: 0,
    toolMade: 0,
    leftoverMade: 0,
    toolEver: 0,
    yardTool: 0,
    yardLeft: 0,
    pressed: 0,
    press: 'sort',
    pressFrame: 0,
    scrap: 0,
    scrapAtShop: 0,
    scrapUsed: 0,
    clothStock: CLOTH_STOCK,
    shopBolt: 0,
    needle: 0,
    mannequin: 'bare',
    vestReady: 0,
    rack: 0,
    flour: FLOUR_STOCK,
    dough: 0,
    bread: 0,
    eaten: 0,
    meal: 0,
    oven: 'knead',
    ovenFrame: 0,
    i: { timber: 0, wrench: 0, porter: 0, saw: 0, stitch: 0, crumb: 0, bolt: 0 },
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

function zeroCrew(s) {
  for (const id of CREW) s.i[id] = 0;
}

export function sawOne(s) {
  if (s.millLogs > 0) s.millLogs -= 1;
  else if (s.logs > 0) s.logs -= 1;
  else return false;
  s.planks += 1;
  s.sawed += 1;
  return true;
}

export function bakeOne(s) {
  if (s.flour <= 0) return false;
  s.flour -= 1;
  s.bread += 1;
  return true;
}

function chopStep(s) {
  if (s.cut < CHOP_CAP) {
    if (s.act === 'chop') {
      if (s.axe < 3) s.axe += 1;
      else { s.act = 'stack'; s.axe = 0; }
    } else if (s.axe < 1) s.axe += 1;
    else { s.cut += 1; s.logs += 1; s.act = 'chop'; s.axe = 0; }
    return;
  }
  if (!s.shownChop) {
    s.act = 'chop';
    if (s.axe < 2) s.axe += 1;
    else s.shownChop = true;
    return;
  }
  s.beat = 'haulLog';
  s.leg = 'pickupLog';
}

function walkLeg(s, route, next) {
  if (s.i.porter < route.length - 1) { s.i.porter += 1; return true; }
  next();
  return false;
}

function bayStep(s) {
  if (s.shopPlanks >= 1 && s.plankUsed === 0) {
    s.shopPlanks -= 1;
    s.plankUsed += 1;
    return;
  }
  s.car = 'repairing';
  if (s.bay === 'broken') { s.bay = 'lift'; s.bayFrame = 0; return; }
  if (s.bay === 'lift') { s.bay = 'bonnet'; s.bayFrame = 0; return; }
  if (s.bay === 'bonnet' || s.bay === 'creeper' || s.bay === 'wheel') {
    if (s.bayFrame < 3) { s.bayFrame += 1; return; }
    s.bay = s.bay === 'bonnet' ? 'creeper' : s.bay === 'creeper' ? 'wheel' : 'down';
    s.bayFrame = 0;
    return;
  }
  if (s.bay === 'down') {
    s.bay = 'fixed';
    s.cart = 'fixed';
    s.car = 'fixed';
    s.wrenchSwing = 3;
    if (!s.toolEver) { s.toolEver = 1; s.toolMade = 1; s.leftoverMade = 1; }
    return;
  }
  s.car = 'leaving';
  if (s.carI < ROUTES.carExit.length - 1) s.carI += 1;
  else {
    s.car = 'out';
    s.beat = 'haulParts';
    s.leg = 'pickupParts';
  }
}

function tailorStep(s) {
  if (s.i.stitch < ROUTES.stitch.length - 1) { s.i.stitch += 1; return; }
  if (s.leg === 'sew') {
    if (s.needle < 3) s.needle += 1;
    else { s.leg = 'cut'; s.needle = 0; }
    return;
  }
  if (s.leg === 'cut') {
    if (s.needle < 1) s.needle += 1;
    else if (s.mannequin === 'bare') {
      s.mannequin = 'dressed';
      s.shopBolt = 0;
      s.vestReady = 1;
    } else {
      s.cargo = 'coat';
      s.vestReady = 0;
      s.leg = 'tailorToRack';
      s.i.porter = 0;
    }
    return;
  }
  const route = ROUTES[s.leg];
  if (!route) return;
  if (s.i.porter < route.length - 1) { s.i.porter += 1; return; }
  if (s.leg === 'signToCloth' && s.cargo == null && s.clothStock === 1) {
    s.clothStock = 0;
    s.cargo = 'bolt';
    s.leg = 'clothToTailor';
    s.i.porter = 0;
    return;
  }
  if (s.leg === 'clothToTailor' && s.cargo === 'bolt') {
    s.cargo = null;
    s.shopBolt = 1;
    s.leg = 'sew';
    s.needle = 0;
    return;
  }
  if (s.leg === 'tailorToRack' && s.cargo === 'coat') {
    s.cargo = null;
    s.rack = 1;
    s.beat = 'baking';
    s.oven = 'knead';
    s.ovenFrame = 0;
    s.leg = 'rackToBakery';
    s.i.porter = 0;
  }
}

function bakeStep(s) {
  if (s.leg === 'rackToBakery') {
    if (s.i.porter < ROUTES.rackToBakery.length - 1) { s.i.porter += 1; return; }
    s.leg = 'oven';
    return;
  }
  if (s.oven === 'knead') {
    if (s.ovenFrame < 3) { s.ovenFrame += 1; return; }
    if (s.flour >= 1 && s.dough === 0 && s.bread === 0 && s.eaten === 0) { s.flour -= 1; s.dough = 1; }
    s.oven = 'bake';
    s.ovenFrame = 0;
    return;
  }
  if (s.ovenFrame < 3) { s.ovenFrame += 1; return; }
  if (s.dough === 1) { s.dough = 0; s.bread = 1; }
  s.beat = 'serve';
  s.leg = 'pickupBread';
}

export function advance(input) {
  const s = input;
  if (s.beat === 'nextdawn') return s;
  s.phase += 1;
  if (s.beat === 'home') {
    issueDawn(s);
    s.beat = 'walk';
    zeroCrew(s);
    return s;
  }
  if (s.beat === 'walk') {
    const ids = ['timber', 'wrench', 'saw', 'stitch', 'crumb', 'bolt'];
    const flags = ids.map((id) => stepAlong(s, id, ROUTES[id]));
    flags.push(stepAlong(s, 'porter', ROUTES.toLumber));
    if (flags.every(Boolean)) s.beat = 'chop';
    return s;
  }
  if (s.beat === 'chop') { chopStep(s); return s; }
  if (s.beat === 'haulLog') {
    if (s.leg === 'pickupLog') {
      if (s.logs >= 1 && s.cargo == null) { s.logs -= 1; s.cargo = 'log'; }
      s.leg = 'lumberToSaw';
      s.i.porter = 0;
      return s;
    }
    walkLeg(s, ROUTES.lumberToSaw, () => {
      if (s.cargo === 'log') { s.cargo = null; s.millLogs += 1; }
      s.beat = 'sawing';
      s.sawFrame = 0;
    });
    return s;
  }
  if (s.beat === 'sawing') {
    if (s.sawFrame < 3) { s.sawFrame += 1; return s; }
    if (s.millLogs === 1 && s.sawed === 0) sawOne(s);
    s.beat = 'haulPlank';
    s.leg = 'pickupPlank';
    return s;
  }
  if (s.beat === 'haulPlank') {
    if (s.leg === 'pickupPlank') {
      if (s.planks >= 1 && s.cargo == null) { s.planks -= 1; s.cargo = 'plank'; }
      s.leg = 'sawToSign';
      s.i.porter = 0;
      return s;
    }
    walkLeg(s, ROUTES.sawToSign, () => {
      if (s.cargo === 'plank') { s.cargo = null; s.shopPlanks += 1; s.shortage = 'FILLED'; }
      s.beat = 'bay';
    });
    return s;
  }
  if (s.beat === 'bay') { bayStep(s); return s; }
  if (s.beat === 'haulParts') {
    if (s.leg === 'pickupParts') {
      if (s.toolMade === 1 && s.cargo == null) { s.toolMade = 0; s.leftoverMade = 0; s.cargo = 'parts'; }
      s.leg = 'signToScrap';
      s.i.porter = 0;
      return s;
    }
    walkLeg(s, ROUTES.signToScrap, () => {
      if (s.cargo === 'parts') { s.cargo = null; s.yardTool = 1; s.yardLeft = 1; }
      s.beat = 'pressing';
      s.press = 'sort';
      s.pressFrame = 0;
    });
    return s;
  }
  if (s.beat === 'pressing') {
    if (s.press === 'sort') {
      if (s.pressFrame < 3) { s.pressFrame += 1; return s; }
      s.press = 'press';
      s.pressFrame = 0;
      return s;
    }
    if (s.pressFrame < 3) { s.pressFrame += 1; return s; }
    if (s.yardTool === 1 && s.yardLeft === 1 && s.pressed === 0) {
      s.yardTool = 0; s.yardLeft = 0; s.pressed = 1; s.scrap = 1;
      return s;
    }
    s.beat = 'haulScrap';
    s.leg = 'pickupScrap';
    return s;
  }
  if (s.beat === 'haulScrap') {
    if (s.leg === 'pickupScrap') {
      if (s.scrap === 1 && s.cargo == null) { s.scrap = 0; s.cargo = 'scrap'; }
      s.leg = 'scrapToSign';
      s.i.porter = 0;
      return s;
    }
    walkLeg(s, ROUTES.scrapToSign, () => {
      if (s.cargo === 'scrap') { s.cargo = null; s.scrapAtShop = 1; s.scrapAtShop = 0; s.scrapUsed = 1; }
      s.beat = 'tailor';
      s.leg = 'signToCloth';
      s.i.porter = 0;
      s.i.stitch = 0;
    });
    return s;
  }
  if (s.beat === 'tailor') { tailorStep(s); return s; }
  if (s.beat === 'baking') { bakeStep(s); return s; }
  if (s.beat === 'serve') {
    if (s.leg === 'pickupBread') {
      if (s.bread === 1 && s.cargo == null) { s.bread = 0; s.cargo = 'bread'; }
      s.leg = 'bakeryToLumber';
      s.i.porter = 0;
      return s;
    }
    walkLeg(s, ROUTES.bakeryToLumber, () => {
      if (s.cargo === 'bread') { s.cargo = null; s.eaten = 1; s.meal = 1; }
      s.beat = 'homebound';
      zeroCrew(s);
    });
    return s;
  }
  if (s.beat === 'homebound') {
    const ids = ['timber', 'wrench', 'saw', 'stitch', 'crumb', 'bolt', 'porter'];
    const done = ids.map((id) => stepAlong(s, id, ROUTES[id + 'Home'])).every(Boolean);
    if (done && s.meal === 1) {
      s.beat = 'nextdawn';
      s.day += 1;
      issueDawn(s);
    }
  }
  return s;
}

export function logLedger(s) {
  const logsLeft = s.logs + s.millLogs + (s.cargo === 'log' ? 1 : 0);
  const planks = s.planks + s.shopPlanks + s.plankUsed + (s.cargo === 'plank' ? 1 : 0);
  return { produced: s.cut, logsLeft, planks, sum: logsLeft + planks };
}

export function clothHeld(s) {
  return s.clothStock + s.shopBolt + s.vestReady + s.rack + (s.cargo === 'bolt' || s.cargo === 'coat' ? 1 : 0);
}

export function flourHeld(s) {
  return s.flour + s.dough + s.bread + s.eaten + (s.cargo === 'bread' ? 1 : 0);
}

export function scrapHeld(s) {
  return s.scrap + s.scrapAtShop + s.scrapUsed + (s.cargo === 'scrap' ? 1 : 0);
}

export function partsHeld(s) {
  const transit = s.cargo === 'parts' ? 1 : 0;
  return s.toolMade + transit + s.yardTool + s.pressed;
}

export function leftHeld(s) {
  const transit = s.cargo === 'parts' ? 1 : 0;
  return s.leftoverMade + transit + s.yardLeft + s.pressed;
}

export function conserved(s) {
  const logs = logLedger(s);
  return logs.produced === logs.sum
    && logs.produced <= CHOP_CAP
    && logs.produced >= 0
    && s.sawed === logs.planks
    && s.plankUsed <= 1
    && s.shopPlanks <= 1
    && clothHeld(s) === CLOTH_STOCK
    && flourHeld(s) === FLOUR_STOCK
    && s.eaten <= 1
    && s.meal <= 1
    && partsHeld(s) === s.toolEver
    && leftHeld(s) === s.toolEver
    && s.toolEver <= 1
    && scrapHeld(s) === s.pressed
    && s.pressed <= 1
    && (s.cart === 'broken' || s.cart === 'fixed')
    && s.chits === s.issuedDawn
    && s.issuedDawn <= DAILY_ISSUE * s.day
    && s.chits <= CHIT_CAP;
}

export function seek(label) {
  const s = seedState();
  const want = () => {
    if (label === 'home') return s.beat === 'home';
    if (label === 'walking') return s.beat === 'walk' && s.i.timber === 15 && s.logs === 0 && s.cart === 'broken';
    if (label === 'working-lumber') return s.beat === 'chop' && s.logs === 4 && s.shownChop && s.act === 'chop' && s.axe === 2 && s.planks === 0 && s.cart === 'broken';
    if (label === 'working-saw') return s.beat === 'sawing' && s.sawFrame === 2 && s.millLogs === 1 && s.sawed === 0;
    if (label === 'working-mechanic') return s.beat === 'bay' && s.bay === 'bonnet' && s.bayFrame === 2 && s.plankUsed === 1 && s.shortage === 'FILLED';
    if (label === 'delivery') return s.beat === 'haulPlank' && s.leg === 'sawToSign' && s.cargo === 'plank' && s.shopPlanks === 0 && s.shortage === 'SHORT 1 PLANK' && s.i.porter === ROUTES.sawToSign.length - 1;
    if (label === 'working-tailor') return s.beat === 'tailor' && s.leg === 'sew' && s.needle === 2 && s.mannequin === 'bare' && s.shopBolt === 1;
    if (label === 'working-bakery') return s.beat === 'baking' && s.oven === 'knead' && s.ovenFrame === 2 && s.flour === FLOUR_STOCK && s.dough === 0;
    if (label === 'working-scrap') return s.beat === 'pressing' && s.press === 'press' && s.pressFrame === 2 && s.yardTool === 1 && s.scrap === 0;
    if (label === 'nextdawn') return s.beat === 'nextdawn';
    return false;
  };
  if (want()) return s;
  for (let n = 0; n < 20000; n++) {
    advance(s);
    if (want()) return s;
  }
  throw new Error(`no frame ${label} beat=${s.beat} leg=${s.leg} phase=${s.phase}`);
}

function porterView(s) {
  if (s.beat === 'home' || s.beat === 'nextdawn' || s.beat === 'walk') return { route: ROUTES.toLumber, i: s.beat === 'walk' ? s.i.porter : 0 };
  if (s.beat === 'homebound') return { route: ROUTES.porterHome, i: s.i.porter };
  if (s.leg === 'pickupLog' || s.beat === 'chop') return { route: ROUTES.toLumber, i: ROUTES.toLumber.length - 1 };
  if (s.leg === 'pickupPlank' || s.beat === 'sawing') return { route: ROUTES.lumberToSaw, i: ROUTES.lumberToSaw.length - 1 };
  if (s.leg === 'pickupParts' || s.beat === 'bay') return { route: ROUTES.sawToSign, i: ROUTES.sawToSign.length - 1 };
  if (s.leg === 'sew' || s.leg === 'cut') return { route: ROUTES.clothToTailor, i: ROUTES.clothToTailor.length - 1 };
  if (s.leg === 'pickupScrap' || s.beat === 'pressing') return { route: ROUTES.signToScrap, i: ROUTES.signToScrap.length - 1 };
  if (s.leg === 'oven') return { route: ROUTES.rackToBakery, i: ROUTES.rackToBakery.length - 1 };
  if (s.leg === 'pickupBread') return { route: ROUTES.rackToBakery, i: ROUTES.rackToBakery.length - 1 };
  if (ROUTES[s.leg]) return { route: ROUTES[s.leg], i: s.i.porter };
  return { route: ROUTES.toLumber, i: 0 };
}

const NAMES = { timber: 'Timber', wrench: 'Wrench', porter: 'Porter', saw: 'Saw', stitch: 'Stitch', crumb: 'Crumb', bolt: 'Bolt' };
const COATS = { timber: 'tan', wrench: 'gray', porter: 'cream', saw: 'red', stitch: 'golden', crumb: 'cream', bolt: 'dark' };

export function crewView(s) {
  const out = {};
  for (const id of CREW) {
    let route;
    let i;
    if (id === 'porter') {
      const p = porterView(s);
      route = p.route;
      i = p.i;
    } else if (s.beat === 'home' || s.beat === 'nextdawn') {
      route = ROUTES[id];
      i = 0;
    } else if (s.beat === 'walk') {
      route = ROUTES[id];
      i = s.i[id];
    } else if (s.beat === 'homebound') {
      route = ROUTES[id + 'Home'];
      i = s.i[id];
    } else {
      route = ROUTES[id];
      i = route.length - 1;
    }
    i = Math.max(0, Math.min(route.length - 1, i));
    let tx = route[i][0];
    let ty = route[i][1];
    const nxt = route[Math.min(route.length - 1, i + 1)];
    const travelling = (s.beat === 'walk' || s.beat === 'homebound' || (id === 'porter' && ROUTES[s.leg] && s.i.porter < route.length - 1)) && i < route.length - 1;
    let face = 'down';
    if (travelling) {
      const dx = nxt[0] - tx;
      const dy = nxt[1] - ty;
      face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    }
    let place = 'path';
    if ((s.beat === 'home' || s.beat === 'nextdawn') && i === 0) place = 'home';
    if (id === 'timber' && s.beat !== 'home' && s.beat !== 'nextdawn' && s.beat !== 'walk' && s.beat !== 'homebound') {
      tx = LUMBER.door[0]; ty = LUMBER.door[1]; face = 'up'; place = 'lumber';
    }
    if (id === 'wrench' && s.beat === 'bay' && (s.bay === 'bonnet' || s.bay === 'creeper' || s.bay === 'wheel')) {
      tx = MECHANIC.work[0]; ty = MECHANIC.work[1]; face = 'right'; place = 'mechanic';
    } else if (id === 'wrench' && s.car === 'leaving') {
      tx = MECHANIC.door[0]; ty = MECHANIC.door[1]; face = 'down'; place = 'mechanic';
    } else if (id === 'wrench' && s.beat !== 'home' && s.beat !== 'walk' && s.beat !== 'homebound' && s.beat !== 'nextdawn') {
      tx = MECHANIC.door[0]; ty = MECHANIC.door[1]; place = 'mechanic';
    }
    if (id === 'saw' && s.beat !== 'home' && s.beat !== 'walk' && s.beat !== 'homebound' && s.beat !== 'nextdawn') {
      tx = SAWMILL.door[0]; ty = SAWMILL.door[1]; face = 'up'; place = 'sawmill';
    }
    if (id === 'stitch' && s.beat === 'tailor' && s.i.stitch >= ROUTES.stitch.length - 1) {
      tx = TAILOR.door[0]; ty = TAILOR.door[1]; face = 'up'; place = 'tailor';
    }
    if (id === 'crumb' && s.beat !== 'home' && s.beat !== 'walk' && s.beat !== 'homebound' && s.beat !== 'nextdawn') {
      tx = BAKERY.door[0]; ty = BAKERY.door[1]; face = 'up'; place = 'bakery';
    }
    if (id === 'bolt' && s.beat !== 'home' && s.beat !== 'walk' && s.beat !== 'homebound' && s.beat !== 'nextdawn') {
      tx = SCRAP.door[0]; ty = SCRAP.door[1]; face = 'up'; place = 'scrap';
    }
    if (id === 'porter' && s.beat === 'sawing') {
      tx = SAWMILL.door[0] - 3; ty = SAWMILL.door[1]; face = 'right'; place = 'sawmill';
    }
    if (id === 'porter' && tx === SIGN[0] && ty === SIGN[1]) place = 'sign';
    else if (id === 'porter' && tx === LUMBER.door[0] && ty === LUMBER.door[1]) place = 'lumber';
    else if (id === 'porter' && tx === SAWMILL.door[0] && ty === SAWMILL.door[1]) place = 'sawmill';
    else if (id === 'porter' && tx === SCRAP.door[0] && ty === SCRAP.door[1]) place = 'scrap';
    else if (id === 'porter' && tx === TAILOR.door[0] && ty === TAILOR.door[1]) place = 'tailor';
    else if (id === 'porter' && tx === BAKERY.door[0] && ty === BAKERY.door[1]) place = 'bakery';
    const moving = travelling && !(id !== 'porter' && s.beat !== 'walk' && s.beat !== 'homebound');
    const working = (id === 'timber' && s.beat === 'chop' && place === 'lumber')
      || (id === 'wrench' && s.beat === 'bay' && place === 'mechanic')
      || (id === 'saw' && s.beat === 'sawing')
      || (id === 'stitch' && (s.leg === 'sew' || s.leg === 'cut'))
      || (id === 'crumb' && s.beat === 'baking' && s.leg === 'oven')
      || (id === 'bolt' && s.beat === 'pressing');
    let px = tx * TILE + 16;
    if (id === 'wrench' && tx === MECHANIC.work[0] && ty === MECHANIC.work[1]) px = MECHANIC.work[0] * TILE + 6;
    if (id === 'porter' && place === 'sign') { face = 'down'; }
    out[id] = {
      id, tx, ty, x: px, y: ty * TILE + 16, face, moving, place, working,
      frame: id === 'timber' ? s.axe : id === 'saw' ? s.sawFrame : id === 'crumb' ? s.ovenFrame : id === 'bolt' ? s.pressFrame : s.wrenchSwing,
      name: NAMES[id],
      coat: COATS[id],
      tool: id === 'timber' ? 'axe' : id === 'wrench' ? 'wrench' : '',
    };
  }
  return out;
}

export function plankTotal(s) {
  return logLedger(s).planks;
}

export function goodsHeld(s) {
  return { bolt: clothHeld(s), vest: s.rack + s.vestReady + (s.cargo === 'coat' ? 1 : 0), sum: clothHeld(s) };
}

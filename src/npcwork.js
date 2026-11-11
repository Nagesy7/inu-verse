// The reviewed town is the default. ?npcwork=1 is a no-op. ?npcwork=0 opts out to the old map.
// Save key is inuverse.preview.npcwork.v1. This file does not touch inuverse.save.v1.
import { TILE } from './world.js';
import { EXPANSIONS, hop, lotById, NOOKS, setDistrictArt, STOPS, stubApproach, visitDistrict } from './townproposal.js';
import { cottageAsleep, dayProps, drawCottageSleep, lifeMode, loadDayArt, lunchActor, setLife, shopOverlay, stepLife } from './daytown.js';
import { factoryFrame } from './factoryline.js';
import { clothFrame } from './clothline.js';
import { cafeFrame, depotFrame, marketShown, powerFrame, serveFrame, vetFrame } from './townline.js';
import {
  BAKERY, CHIT_CAP, CLOTH_STOCK, DAILY_ISSUE, FARM, FLOUR_STOCK, FORGE, LUMBER, MECHANIC, MILL, MINE, ROUTES, SAWMILL, SCRAP, SIGN, SMELTER, TAILOR,
  SAVE_KEY, TAG, advance, crewView, routeProgress, seek, seedState,
} from './npcbuildings.js';
import { layoutPose } from './npcroutes.js';

export const NPCWORK_QUERY = 'npcwork';

export function npcWorkOn(search = '') {
  const v = new URLSearchParams(search).get(NPCWORK_QUERY);
  return v !== '0' && v !== 'off';
}

const ART_SRC = {
  lumber: 'assets/npcwork/buildings/lumber-yard.png',
  mechanic: 'assets/npcwork/buildings/mechanic-shop.png',
  log: 'assets/npcwork/props/log.png',
  plank: 'assets/npcwork/props/plank.png',
  cartBroken: 'assets/npcwork/props/cart-broken.png',
  cartFixed: 'assets/npcwork/props/cart-fixed.png',
  signShort: 'assets/npcwork/props/sign-short-1-plank.png',
  signFilled: 'assets/npcwork/props/sign-filled.png',
  chop: 'assets/npcwork/overlays/chop-axe-down.png',
  stack: 'assets/npcwork/overlays/stack-log-down.png',
  wrench: 'assets/npcwork/overlays/repair-wrench-up.png',
  carryPlank: 'assets/npcwork/overlays/carry-plank.png',
  carryTool: 'assets/npcwork/overlays/carry-tool.png',
  carryBolt: 'assets/npcwork/overlays/carry-cloth-bolt.png',
  clothBolt: 'assets/npcwork/props/cloth-bolt.png',
  carryCoat: 'assets/npcwork/overlays/carry-coat.png',
  shopInterior: 'assets/npcwork/mechanic/mechanic-shop-interior.png',
  liftDown: 'assets/npcwork/mechanic/lift-down.png',
  liftUp: 'assets/npcwork/mechanic/lift-up.png',
  carBroken: 'assets/npcwork/mechanic/car-broken.png',
  carFixed: 'assets/npcwork/mechanic/car-fixed.png',
  carBrokenLift: 'assets/npcwork/mechanic/car-broken-lifted.png',
  carFixedLift: 'assets/npcwork/mechanic/car-fixed-lifted.png',
  bonnet: 'assets/npcwork/mechanic/work-bonnet.png',
  creeper: 'assets/npcwork/mechanic/work-creeper.png',
  wheel: 'assets/npcwork/mechanic/work-wheel.png',
  tailorShop: 'assets/npcwork/tailor/tailor-shop.png',
  rackEmpty: 'assets/npcwork/tailor/rack-empty.png',
  rackStocked: 'assets/npcwork/tailor/rack-stocked.png',
  manBare: 'assets/npcwork/tailor/mannequin-bare.png',
  manDressed: 'assets/npcwork/tailor/mannequin-dressed.png',
  sew: 'assets/npcwork/tailor/work-sew.png',
  cut: 'assets/npcwork/tailor/work-cut.png',
  sawmill: 'assets/npcwork/sawmill/sawmill.png',
  sawLoop: 'assets/npcwork/sawmill/work-saw.png',
  logPile: 'assets/npcwork/sawmill/log-pile.png',
  plankStack: 'assets/npcwork/sawmill/plank-stack.png',
  bakery: 'assets/npcwork/bakery/bakery.png',
  knead: 'assets/npcwork/bakery/work-knead.png',
  ovenDoor: 'assets/npcwork/bakery/oven-door.png',
  trayEmpty: 'assets/npcwork/bakery/bread-tray-empty.png',
  trayFull: 'assets/npcwork/bakery/bread-tray-full.png',
  flourSack: 'assets/npcwork/props/flour-sack.png',
  scrapYard: 'assets/npcwork/scrapyard/scrap-yard.png',
  sortLoop: 'assets/npcwork/scrapyard/work-sort.png',
  pressLoop: 'assets/npcwork/scrapyard/work-press.png',
  pressIdle: 'assets/npcwork/scrapyard/press-idle.png',
  brokenHeap: 'assets/npcwork/props/broken-heap.png',
  partsCrate: 'assets/npcwork/props/parts-crate.png',
  scrapBale: 'assets/npcwork/props/scrap-bale.png',
  carryBread: 'assets/npcwork/overlays/carry-bread-loaf.png',
  carryBroken: 'assets/npcwork/overlays/carry-broken-item.png',
  carryBale: 'assets/npcwork/overlays/carry-scrap-bale.png',
  wheatFarm: 'assets/npcwork/farm/wheat-farm.png',
  crops: 'assets/npcwork/farm/crop-stages.png',
  sow: 'assets/npcwork/farm/work-sow.png',
  water: 'assets/npcwork/farm/work-water.png',
  harvest: 'assets/npcwork/farm/work-harvest.png',
  sheafLoop: 'assets/npcwork/farm/work-sheaf.png',
  windmill: 'assets/npcwork/mill/windmill.png',
  sails: 'assets/npcwork/mill/work-sails.png',
  grind: 'assets/npcwork/mill/work-grind.png',
  grainPile: 'assets/npcwork/mill/grain-pile.png',
  flourStack: 'assets/npcwork/mill/flour-stack.png',
  sheafProp: 'assets/npcwork/props/wheat-sheaf.png',
  carrySheaf: 'assets/npcwork/overlays/carry-wheat-sheaf.png',
  mine: 'assets/npcwork/mine/mine.png',
  pick: 'assets/npcwork/mine/work-pick.png',
  cartLoop: 'assets/npcwork/mine/work-cart.png',
  orePile: 'assets/npcwork/mine/ore-pile.png',
  cartEmpty: 'assets/npcwork/mine/ore-cart-empty.png',
  cartFull: 'assets/npcwork/mine/ore-cart-full.png',
  smelter: 'assets/npcwork/smelter/smelter.png',
  oreIn: 'assets/npcwork/smelter/work-ore-in.png',
  pour: 'assets/npcwork/smelter/work-pour.png',
  barStack: 'assets/npcwork/smelter/bar-stack.png',
  forge: 'assets/npcwork/forge/forge.png',
  hammerAxe: 'assets/npcwork/forge/work-hammer-axe.png',
  hammerPart: 'assets/npcwork/forge/work-hammer-part.png',
  axeHead: 'assets/npcwork/props/axe-head.png',
  carPart: 'assets/npcwork/props/car-part.png',
  carryOre: 'assets/npcwork/overlays/carry-ore.png',
  carryBar: 'assets/npcwork/overlays/carry-metal-bar.png',
  carryForged: 'assets/npcwork/overlays/carry-forged-tool.png',
  carryWorn: 'assets/npcwork/overlays/carry-tool-worn.png',
  carryFlour: 'assets/npcwork/overlays/carry-flour-sack.png',
  pathC: 'assets/path/option-C-tiles.png',
  pathCEdge: 'assets/path/option-C-edges.png',
  pathInlay: 'assets/path/plaza-centre-inlay-C.png',
  brick: 'assets/district/brick-ground.png',
  brickGrass: 'assets/district/brick-edge-grass.png',
  brickDirt: 'assets/district/brick-edge-dirt.png',
  awning: 'assets/district/awning.png',
  soot: 'assets/district/soot-decal.png',
  factory: 'assets/npcwork/factory/factory.png',
  belt: 'assets/npcwork/factory/line/conveyor.png',
  chassis: 'assets/npcwork/factory/line/car-1-chassis.png',
  wheels: 'assets/npcwork/factory/line/car-2-wheels.png',
  primer: 'assets/npcwork/factory/line/car-3-body.png',
  bodyDrop: 'assets/npcwork/factory/line/body-drop.png',
  paintedGold: 'assets/npcwork/factory/line/car-4-painted-gold.png',
  paintedGreen: 'assets/npcwork/factory/line/car-4-painted-green.png',
  paintedTeal: 'assets/npcwork/factory/line/car-4-painted-teal.png',
  weld: 'assets/npcwork/factory/line/work-weld.png',
  fit: 'assets/npcwork/factory/line/work-fit.png',
  paintGold: 'assets/npcwork/factory/line/work-paint-gold.png',
  paintGreen: 'assets/npcwork/factory/line/work-paint-green.png',
  paintTeal: 'assets/npcwork/factory/line/work-paint-teal.png',
  check: 'assets/npcwork/factory/line/work-check.png',
  finishedGold: 'assets/npcwork/factory/cars/car-finished-gold.png',
  finishedGreen: 'assets/npcwork/factory/cars/car-finished-green.png',
  finishedTeal: 'assets/npcwork/factory/cars/car-finished-teal.png',
  inPlanks: 'assets/npcwork/factory/props/input-planks.png',
  inParts: 'assets/npcwork/factory/props/input-parts.png',
  outLot: 'assets/npcwork/factory/props/output-lot.png',
  cottonField: 'assets/npcwork/cotton/cotton-field.png',
  cottonGrow: 'assets/npcwork/cotton/growth.png',
  cottonPick: 'assets/npcwork/cotton/work-pick.png',
  carryCotton: 'assets/npcwork/overlays/carry-cotton.png',
  weaveMill: 'assets/npcwork/weaving/weaving-mill.png',
  weaveLoom: 'assets/npcwork/weaving/work-loom.png',
  yarnPile: 'assets/npcwork/weaving/yarn-pile.png',
  marketHall: 'assets/npcwork/market/market.png',
  marketServe: 'assets/npcwork/market/work-serve.png',
  dispBread: 'assets/npcwork/market/display-bread.png',
  dispCoats: 'assets/npcwork/market/display-coats.png',
  dispPlanks: 'assets/npcwork/market/display-planks.png',
  dispMetal: 'assets/npcwork/market/display-metal.png',
  dispCar: 'assets/npcwork/market/display-car.png',
  depotBld: 'assets/npcwork/depot/depot.png',
  depotLoad: 'assets/npcwork/depot/work-load.png',
  truckSide: 'assets/npcwork/depot/truck-side.png',
  towerBld: 'assets/npcwork/power/water-tower.png',
  towerPump: 'assets/npcwork/power/work-pump.png',
  wattWalk: 'assets/npcwork/power/work-walk.png',
  shedBld: 'assets/npcwork/power/power-shed.png',
  lightOff: 'assets/npcwork/power/light-off.png',
  lightOn: 'assets/npcwork/power/light-on.png',
  cafeBld: 'assets/npcwork/cafe/cafe.png',
  cafeBarista: 'assets/npcwork/cafe/work-barista.png',
  cafeBreak: 'assets/npcwork/cafe/work-break.png',
  vetBld: 'assets/npcwork/vet/vet.png',
  vetCheck: 'assets/npcwork/vet/work-checkup.png',
  cot0: 'assets/npcwork/houses/cottage-0.png',
  cot1: 'assets/npcwork/houses/cottage-1.png',
  cot2: 'assets/npcwork/houses/cottage-2.png',
  glowWindow: 'assets/npcwork/lights/glow-window.png',
  glowDoor: 'assets/npcwork/lights/glow-door.png',
  carryParcel: 'assets/npcwork/overlays/carry-parcel.png',
  carryToy: 'assets/npcwork/overlays/carry-toy-car.png',
  carryMarketLoaf: 'assets/npcwork/overlays/carry-market-loaf.png',
};
const IMG = {};
let artLoaded = false;
function loadArt() {
  if (artLoaded || typeof Image === 'undefined') return Promise.resolve(false);
  artLoaded = true;
  return Promise.all(Object.entries(ART_SRC).map(([key, src]) => new Promise((res) => {
    const im = new Image();
    im.onload = () => { IMG[key] = im; res(true); };
    im.onerror = () => res(false);
    im.src = src;
  }))).then((ok) => {
    setDistrictArt({ brick: IMG.brick, grassEdge: IMG.brickGrass, dirtEdge: IMG.brickDirt, soot: IMG.soot, pathTiles: IMG.pathC, pathEdges: IMG.pathCEdge, inlay: IMG.pathInlay });
    return loadDayArt().then(() => ok);
  });
}

function blit(c, key, x, y, w, h) {
  const im = IMG[key];
  if (!im) return false;
  c.imageSmoothingEnabled = false;
  c.drawImage(im, Math.round(x), Math.round(y), w, h);
  return true;
}

// Carry sheets stay 48×60, anchor (24, 44) at the actor's feet. The sheaf prop is a separate 24×27.
export function drawNpcOverlay(ctx, o) {
  if (o.draw) { o.draw(ctx); return; }
  const im = IMG[o.key];
  if (!im) return;
  const sc = o.scale || 1;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(im, (o.frame || 0) * 48, 0, 48, 60, Math.round(-48 * sc), Math.round(-88 * sc), Math.round(96 * sc), Math.round(120 * sc));
}

const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };

const LOG_SLOTS = [[1660, 3160], [1678, 3160], [1696, 3160], [1668, 3150]];

let laidOut = false;
let lineMs = 0;
let clothMs = 0;
let townMs = 0;
let shelfOverride = null;
let shownStocks = { bread: 0, coats: 0, planks: 0, metal: 0, car: 0 };

function rememberStocks(state) {
  if (shelfOverride) { shownStocks = shelfOverride; return; }
  shownStocks = {
    bread: (state.bread || 0) + (state.cargo === 'bread' ? 1 : 0),
    coats: (state.rack || 0) + (state.vestReady || 0) + (state.cargo === 'coat' ? 1 : 0),
    planks: (state.planks || 0) + (state.shopPlanks || 0),
    metal: (state.bars || 0) + (state.forgeBars || 0),
    car: 0,
  };
}
let focus = null;
let labelsOn = false;
const seenNooks = new Set();
export function useLayout(on) { laidOut = !!on; }
export function setFocus(x, y) { focus = { x, y }; }
export function toggleLabels() { labelsOn = !labelsOn; return labelsOn; }

function place(lot) {
  if (!laidOut) return { x: lot.x * TILE, y: lot.y * TILE };
  const p = lotById(lot.id);
  return { x: (p?.x ?? lot.x) * TILE, y: (p?.y ?? lot.y) * TILE };
}

function nearFocus(x, y) {
  if (labelsOn || !focus) return true;
  return Math.hypot(focus.x - x, focus.y - y) < 220;
}

function label(c, text, x, y) {
  if (!nearFocus(x, y)) return;
  c.font = '8px Silkscreen, monospace';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const w = Math.ceil(c.measureText(text).width) + 8;
  R(c, x - w / 2, y - 6, w, 12, '#121a36');
  c.fillStyle = '#f6e7b8';
  c.fillText(text, x, y);
}

// Wheat sheaf is 24×27 native, drawn at 2×. Bottom-centre sits on the ground point.
export const SHEAF_WORLD = Object.freeze({ w: 48, h: 54 });
export function bottomCentre(ax, ay, w, h) {
  return { x: ax - w / 2, y: ay - h };
}

function blitFrame(c, key, frame, x, y, dw, dh, fw, fh) {
  const im = IMG[key];
  if (!im) return;
  c.imageSmoothingEnabled = false;
  c.drawImage(im, frame * fw, 0, fw, fh, x, y, dw, dh);
}

function drawBay(c, state) {
  const bay = laidOut ? place(MECHANIC) : { x: 896, y: 64 };
  blit(c, 'shopInterior', bay.x, bay.y, 160, 128);
  if (state.car === 'leaving' || state.car === 'out') return;
  const x = bay.x + 12;
  const y = bay.y + 50;
  const lifted = state.bay === 'lift' || state.bay === 'bonnet' || state.bay === 'creeper' || state.bay === 'wheel';
  blit(c, lifted ? 'liftUp' : 'liftDown', x, y, 104, 72);
  // v1.2.1 draws the creeper body under the car and the head past the nose, so it stays behind the car.
  if (state.bay === 'creeper') blitFrame(c, 'creeper', state.bayFrame, x, y, 104, 72, 52, 36);
  const fixed = state.bay === 'fixed' || state.bay === 'down';
  const car = lifted ? (fixed ? 'carFixedLift' : 'carBrokenLift') : (fixed ? 'carFixed' : 'carBroken');
  blit(c, car, x, y, 104, 72);
  if (state.bay === 'bonnet') blitFrame(c, 'bonnet', state.bayFrame, x, y, 104, 72, 52, 36);
  if (state.bay === 'wheel') blitFrame(c, 'wheel', state.bayFrame, x, y, 104, 72, 52, 36);
}

function drawDistrictAwning(c, x, y, frame) {
  blitFrame(c, 'awning', frame, x + 32, y + 26, 64, 32, 32, 16);
}

function drawTailorShop(c, state) {
  const { x, y } = place(TAILOR);
  blit(c, 'tailorShop', x, y, 160, 128);
  drawDistrictAwning(c, x, y, 1);
  const wx = x + 12;
  const wy = y + 46;
  blit(c, state.rack ? 'rackStocked' : 'rackEmpty', wx, wy, 100, 56);
  blit(c, state.mannequin === 'dressed' ? 'manDressed' : 'manBare', wx, wy, 100, 56);
  if (state.leg === 'sew') {
    blitFrame(c, 'sew', state.needle % 4, wx, wy, 100, 56, 50, 28);
    const tip = [18, 20, 22, 20][state.needle % 4];
    R(c, wx + 46, wy + tip, 2, 8, '#f4f7fb');
    R(c, wx + 46, wy + tip + 6, 2, 2, '#9aa4b0');
  }
  if (state.leg === 'cut') blitFrame(c, 'cut', state.needle % 4, wx, wy, 100, 56, 50, 28);
}

function fillFrame(n, steps) {
  let i = 0;
  for (let k = 0; k < steps.length; k++) if (n >= steps[k]) i = k;
  return i;
}

function drawSawmill(c, state) {
  const { x, y } = place(SAWMILL);
  blit(c, 'sawmill', x, y, 160, 128);
  blitFrame(c, 'logPile', fillFrame(state.millLogs, [0, 1, 3, 6]), x + 112, y + 94, 36, 26, 18, 13);
  blitFrame(c, 'plankStack', fillFrame(state.planks, [0, 1, 3, 5]), x + 12, y + 100, 36, 20, 18, 10);
  if (state.beat === 'sawing') blitFrame(c, 'sawLoop', state.sawFrame % 4, x + 12, y + 48, 136, 72, 68, 36);
  label(c, `MILL ${state.millLogs}`, x + 80, y - 8);
}

function drawFarm(c, state) {
  const { x, y } = place(FARM);
  blit(c, 'wheatFarm', x, y, 192, 128);
  for (const [dx, dy] of [[40, 52], [72, 52], [40, 84], [72, 84]]) {
    blitFrame(c, 'crops', state.crop, x + dx, y + dy, 32, 32, 16, 16);
  }
  const loop = state.beat === 'grow' && state.farmLoop !== 'rise' ? state.farmLoop : '';
  const key = loop === 'sow' ? 'sow' : loop === 'water' ? 'water' : loop === 'harvest' ? 'harvest' : loop === 'sheaf' ? 'sheafLoop' : '';
  if (key) blitFrame(c, key, state.farmFrame % 4, x + 8, y + 28, 176, 88, 88, 44);
  if (state.sheaf === 1) {
    const sit = bottomCentre(x + 128, y + 112, SHEAF_WORLD.w, SHEAF_WORLD.h);
    blit(c, 'sheafProp', sit.x, sit.y, SHEAF_WORLD.w, SHEAF_WORLD.h);
  }
}

function drawMill(c, state) {
  const { x, y } = place(MILL);
  blit(c, 'windmill', x, y, 160, 128);
  blitFrame(c, 'grainPile', state.grain > 0 ? 1 : 0, x + 20, y + 92, 36, 24, 18, 12);
  blitFrame(c, 'flourStack', state.milled > 0 && state.flourDelivered === 0 && state.cargo !== 'flour' ? 1 : 0, x + 112, y + 88, 36, 28, 18, 14);
  if (state.beat === 'grind') {
    blitFrame(c, 'sails', state.sailFrame % 4, x + 16, y + 36, 128, 80, 64, 40);
    blitFrame(c, 'grind', state.grindFrame % 4, x + 16, y + 36, 128, 80, 64, 40);
  }
}

function drawMine(c, state) {
  const { x, y } = place(MINE);
  blit(c, 'mine', x, y, 160, 128);
  blitFrame(c, 'orePile', Math.max(0, Math.min(3, state.ore)), x + 108, y + 88, 40, 28, 20, 14);
  blit(c, state.ore > 0 ? 'cartFull' : 'cartEmpty', x + 24, y + 84, 36, 28);
  if (state.beat !== 'dig') return;
  const loading = state.ore > 0 && state.pickFrame === 0;
  blitFrame(c, loading ? 'cartLoop' : 'pick', loading ? state.phase % 4 : state.pickFrame % 4, x + 8, y + 36, 144, 84, 72, 42);
}

function drawSmelter(c, state) {
  const { x, y } = place(SMELTER);
  blit(c, 'smelter', x, y, 160, 128);
  blitFrame(c, 'barStack', Math.max(0, Math.min(3, state.bars)), x + 116, y + 92, 32, 24, 16, 12);
  // Scrap bales reuse the ore-in hopper. The pour sheet is the glow and the bar coming out.
  const scrapIn = state.scrapFeed > 0 || state.cargo === 'scrap';
  if (scrapIn) blitFrame(c, 'oreIn', state.phase % 4, x + 12, y + 40, 136, 80, 68, 40);
  else if (state.beat === 'pour') {
    const key = state.pourFrame < 2 ? 'oreIn' : 'pour';
    blitFrame(c, key, state.pourFrame % 4, x + 12, y + 40, 136, 80, 68, 40);
  }
}

function factoryHands() {
  const lot = lotById('factory');
  if (!lot) return [];
  const now = factoryFrame(lineMs);
  const hands = [
    { id: 'rivet', name: 'Rivet', coat: 'tan', face: 'down' },
    { id: 'lug', name: 'Lug', coat: 'golden', face: 'left' },
    { id: 'gloss', name: 'Gloss', coat: 'dark', face: 'right' },
  ];
  return hands.filter((a) => now.stage !== 'roll' && a.id !== now.who).map((a, i) => ({
    ...a, x: lot.door[0] * TILE + (i - 1) * 24, y: lot.door[1] * TILE + 8, moving: false, working: false,
  }));
}

function clothHands() {
  const now = clothFrame(clothMs);
  const cotton = lotById('cotton');
  const mill = lotById('cloth');
  if (!cotton || !mill) return [];
  const hands = [];
  if (now.who !== 'boll') {
    const hauling = now.stage === 'haul' || now.stage === 'weave' || now.stage === 'bolt';
    const lot = hauling ? mill : cotton;
    hands.push({
      id: 'boll', name: 'Boll', coat: 'cream', face: hauling ? 'right' : 'down',
      x: lot.door[0] * TILE + 8, y: lot.door[1] * TILE + 8, moving: now.stage === 'haul', working: false,
      npcOverlay: now.stage === 'haul' ? { key: 'carryCotton', frame: 0, behind: false } : null,
    });
  }
  if (now.who !== 'twill' && now.stage !== 'grow' && now.stage !== 'pick') {
    hands.push({
      id: 'twill', name: 'Twill', coat: 'tan', face: 'left',
      x: mill.door[0] * TILE + 22, y: mill.door[1] * TILE + 8, moving: false, working: false, npcOverlay: null,
    });
  }
  return hands;
}

function drawCotton(c) {
  if (!laidOut) return;
  const lot = lotById('cotton');
  if (!lot) return;
  const x = lot.x * TILE;
  const y = lot.y * TILE;
  const now = clothFrame(clothMs);
  blit(c, 'cottonField', x, y, 160, 128);
  if (now.stage === 'pick') blitFrame(c, 'cottonPick', now.frame, x + 8, y + 32, 144, 88, 72, 44);
  else if (now.stage === 'grow') blitFrame(c, 'cottonGrow', now.frame, x + 8, y + 32, 144, 88, 72, 44);
  else blitFrame(c, 'cottonGrow', 4, x + 8, y + 32, 144, 88, 72, 44);
}

function drawWeave(c) {
  if (!laidOut) return;
  const lot = lotById('cloth');
  if (!lot) return;
  const x = lot.x * TILE;
  const y = lot.y * TILE;
  const now = clothFrame(clothMs);
  blit(c, 'weaveMill', x, y, 160, 128);
  blit(c, 'yarnPile', x + 16, y + 96, 112, 20);
  if (now.stage === 'weave') blitFrame(c, 'weaveLoom', now.frame, x + 12, y + 44, 112, 72, 56, 36);
  if (now.stage === 'bolt' || now.stage === 'weave' && now.frame === 3) blit(c, 'clothBolt', x + 96, y + 100, 32, 12);
}

const DISP = { bread: 'dispBread', coats: 'dispCoats', planks: 'dispPlanks', metal: 'dispMetal', car: 'dispCar' };

function hand(id, name, coat, lotId, face, overlay) {
  const lot = lotById(lotId);
  if (!lot) return null;
  return {
    id, name, coat, face, moving: false, working: false, npcOverlay: overlay || null,
    x: lot.door[0] * TILE + 8, y: lot.door[1] * TILE + 8,
  };
}

function townHands() {
  const serve = serveFrame(townMs);
  const cafe = cafeFrame(townMs);
  const depot = depotFrame(townMs);
  const power = powerFrame(townMs);
  const vet = vetFrame(townMs);
  const hands = [];
  if (serve.who !== 'pip') hands.push(hand('pip', 'Pip', 'tan', 'goods', 'left'));
  if (depot.who !== 'dash') {
    const carrying = depot.stage === 'roll' ? { key: 'carryParcel', frame: 0, behind: false } : null;
    hands.push(hand('dash', 'Dash', 'red', 'depot', 'right', carrying));
  }
  if (power.who !== 'watt') hands.push(hand('watt', 'Watt', 'dark', power.stage === 'shed' ? 'shed' : 'tower', 'down'));
  if (cafe.who !== 'bean') hands.push(hand('bean', 'Bean', 'golden', 'sip', 'left'));
  if (vet.who !== 'clover') hands.push(hand('clover', 'Clover', 'gray', 'vet', 'left'));
  return hands.filter(Boolean);
}

function drawMarket(c) {
  if (!laidOut) return;
  const lot = lotById('goods');
  if (!lot) return;
  const x = lot.x * TILE;
  const y = lot.y * TILE;
  const shown = marketShown(townMs, shownStocks);
  const now = serveFrame(townMs);
  blit(c, 'marketHall', x, y, 192, 128);
  blitFrame(c, DISP[shown.kind], shown.frame, x + 12, y + 40, 168, 80, 84, 40);
  if (now.stage === 'serve') blitFrame(c, 'marketServe', now.frame, x + 12, y + 40, 168, 80, 84, 40);
}

function drawDepot(c) {
  if (!laidOut) return;
  const lot = lotById('depot');
  if (!lot) return;
  const x = lot.x * TILE;
  const y = lot.y * TILE;
  const now = depotFrame(townMs);
  blit(c, 'depotBld', x, y, 160, 128);
  const wheel = Math.floor(townMs / 120) % 2;
  const truckFrame = now.stage === 'roll' ? 2 + wheel : wheel;
  blitFrame(c, 'truckSide', truckFrame, x + 20, y + 96, 80, 44, 40, 22);
  if (now.stage === 'load' && lifeMode() !== 'cart') blitFrame(c, 'depotLoad', now.frame, x + 12, y + 44, 108, 76, 54, 38);
}

function drawTower(c) {
  if (!laidOut) return;
  const lot = lotById('tower');
  if (!lot) return;
  const x = lot.x * TILE;
  const y = lot.y * TILE;
  const now = powerFrame(townMs);
  blit(c, 'towerBld', x, y, 96, 96);
  if (now.stage === 'pump') blitFrame(c, 'towerPump', now.frame, x + 16, y + 32, 64, 56, 32, 28);
  if (now.stage === 'walk') blitFrame(c, 'wattWalk', now.frame, x + 8, y + 70, 96, 56, 48, 28);
}

function drawShed(c) {
  if (!laidOut) return;
  const lot = lotById('shed');
  if (!lot) return;
  const x = lot.x * TILE;
  const y = lot.y * TILE;
  const now = powerFrame(townMs);
  blit(c, 'shedBld', x, y, 128, 96);
  blit(c, now.stage === 'shed' ? 'lightOn' : 'lightOff', x + 16, y + 32, 28, 24);
}

function drawSip(c) {
  if (!laidOut) return;
  const lot = lotById('sip');
  if (!lot) return;
  const x = lot.x * TILE;
  const y = lot.y * TILE;
  const now = cafeFrame(townMs);
  blit(c, 'cafeBld', x, y, 128, 128);
  if (now.stage === 'barista') blitFrame(c, 'cafeBarista', now.frame, x + 12, y + 36, 80, 68, 40, 34);
  if (now.stage === 'break') blitFrame(c, 'cafeBreak', now.frame, x + 12, y + 36, 80, 68, 40, 34);
}

function drawVet(c) {
  if (!laidOut) return;
  const lot = lotById('vet');
  if (!lot) return;
  const x = lot.x * TILE;
  const y = lot.y * TILE;
  const now = vetFrame(townMs);
  blit(c, 'vetBld', x, y, 128, 128);
  if (now.stage === 'checkup') blitFrame(c, 'vetCheck', now.frame, x + 12, y + 36, 80, 68, 40, 34);
}

function drawCottage(c, id, key) {
  if (!laidOut) return;
  const lot = lotById(id);
  if (!lot) return;
  const x = lot.x * TILE;
  const y = lot.y * TILE;
  blit(c, key, x, y, 96, 96);
  if (cottageAsleep(id)) drawCottageSleep(c, x, y);
  else if (globalThis.__inuNight) {
    blit(c, 'glowWindow', x + 14, y + 36, 20, 20);
    blit(c, 'glowDoor', x + 42, y + 52, 12, 12);
  }
}

function drawFactory(c) {
  if (!laidOut) return;
  const lot = lotById('factory');
  if (!lot) return;
  const x = lot.x * TILE;
  const y = lot.y * TILE;
  const now = factoryFrame(lineMs);
  const colour = now.colour;
  blit(c, 'factory', x, y, 256, 160);
  blitFrame(c, 'inParts', 2, x + 6, y + 42, 26, 22, 13, 11);
  blitFrame(c, 'inPlanks', 2, x + 6, y + 68, 26, 16, 13, 8);
  blitFrame(c, 'belt', Math.floor(lineMs / 120) % 4, x + 6, y + 80, 244, 74, 122, 37);
  blitFrame(c, 'outLot', { gold: 1, green: 2, teal: 3 }[colour] || 1, x + 188, y + 118, 168, 60, 84, 30);
  const at = (key, frame, slot, fw, fh) => blitFrame(c, key, frame, x + slot[0], y + slot[1], fw * 2, fh * 2, fw, fh);
  const paintKey = { gold: 'paintGold', green: 'paintGreen', teal: 'paintTeal' };
  const paintedKey = { gold: 'paintedGold', green: 'paintedGreen', teal: 'paintedTeal' };
  const finishedKey = { gold: 'finishedGold', green: 'finishedGreen', teal: 'finishedTeal' };
  if (now.stage === 'weld') {
    at('chassis', 0, now.slot, 48, 32);
    at('weld', now.frame, now.slot, 48, 32);
  } else if (now.stage === 'wheels') {
    if (now.frame < 3) {
      at('chassis', 0, now.slot, 48, 32);
      at('fit', now.frame, now.slot, 48, 32);
    } else at('wheels', 0, now.slot, 48, 32);
  } else if (now.stage === 'drop') {
    at('bodyDrop', now.frame, now.slot, 48, 32);
  } else if (now.stage === 'paint') {
    if (now.frame < 3) {
      at('primer', 0, now.slot, 48, 32);
      at(paintKey[colour], now.frame, now.slot, 48, 32);
    } else at(paintedKey[colour], 0, now.slot, 48, 32);
  } else if (now.stage === 'check') {
    at(paintedKey[colour], 0, now.slot, 48, 32);
    at('check', now.frame, now.slot, 48, 32);
  } else {
    const slide = now.frame * 22;
    blitFrame(c, finishedKey[colour], now.frame % 2, x + 46 - slide, y + 104, 80, 44, 40, 22);
  }
}

function drawForge(c, state) {
  const { x, y } = place(FORGE);
  blit(c, 'forge', x, y, 160, 128);
  if (state.axeHeads > 0) {
    const sit = bottomCentre(x + 48, y + 110, 24, 20);
    blit(c, 'axeHead', sit.x, sit.y, 24, 20);
  }
  if (state.forgedParts > 0) {
    const sit = bottomCentre(x + 112, y + 110, 24, 20);
    blit(c, 'carPart', sit.x, sit.y, 24, 20);
  }
  if (state.beat === 'hammer') {
    blitFrame(c, state.axeHeads === 0 ? 'hammerAxe' : 'hammerPart', state.hammerFrame % 4, x + 12, y + 44, 136, 76, 68, 38);
  }
}

function drawBakery(c, state) {
  const { x, y } = place(BAKERY);
  blit(c, 'bakery', x, y, 160, 128);
  drawDistrictAwning(c, x, y, 0);
  for (let i = 0; i < state.flour; i++) blit(c, 'flourSack', x - 28, y + 36 + i * 26, 20, 24);
  blit(c, state.bread >= 1 ? 'trayFull' : 'trayEmpty', x + 12, y + 46, 100, 56);
  blitFrame(c, 'ovenDoor', state.oven === 'bake' ? 1 : 0, x + 12, y + 46, 100, 56, 50, 28);
  c.globalAlpha = state.oven === 'bake' ? 0.85 : 0.45;
  R(c, x + 22, y + 62, 14, 10, '#ffb15a');
  R(c, x + 26, y + 64, 6, 6, '#ffe08a');
  c.globalAlpha = 1;
  if (state.beat === 'baking' && state.leg === 'oven' && state.oven === 'knead') blitFrame(c, 'knead', state.ovenFrame, x + 12, y + 46, 100, 56, 50, 28);
  label(c, `FLOUR ${state.flour}`, x + 40, y - 8);
}

function drawScrap(c, state) {
  const { x, y } = place(SCRAP);
  const pressing = state.beat === 'pressing' && state.press === 'press';
  const sorting = state.beat === 'pressing' && state.press === 'sort';
  blit(c, 'scrapYard', x, y, 192, 128);
  if (!pressing) blit(c, 'pressIdle', x + 8, y + 24, 176, 92);
  // Stock sits above the idle press so the heap, crate and bale are not swallowed by that layer.
  blitFrame(c, 'brokenHeap', fillFrame(state.yardTool + state.yardLeft, [0, 1, 2, 3]), x + 12, y + 44, 44, 28, 22, 14);
  if (state.press === 'press' || state.pressed || state.scrap || state.scrapUsed || state.cargo === 'scrap') blit(c, 'partsCrate', x + 64, y + 56, 28, 22);
  blit(c, 'scrapBale', x + 140, y + 52, 40, 32);
  if (pressing) blitFrame(c, 'pressLoop', state.pressFrame, x + 8, y + 24, 176, 92, 88, 46);
  if (sorting) blitFrame(c, 'sortLoop', state.pressFrame, x + 8, y + 24, 176, 92, 88, 46);
  label(c, `HEAP ${state.yardTool + state.yardLeft}`, x + 48, y - 8);
}

function porterOverlay(state, face) {
  const behind = face === 'up';
  if (state.cargo === 'plank') return { key: 'carryPlank', frame: 0, behind };
  if (state.cargo === 'bolt') return { key: 'carryBolt', frame: 0, behind };
  if (state.cargo === 'coat') return { key: 'carryCoat', frame: 0, behind };
  if (state.cargo === 'tool') return { key: 'carryTool', frame: 0, behind };
  if (state.cargo === 'parts') return { key: 'carryBroken', frame: 0, behind, scale: 1.3 };
  if (state.cargo === 'scrap') return { key: 'carryBale', frame: 0, behind, scale: 1.3 };
  if (state.cargo === 'bread') return { key: 'carryBread', frame: 0, behind, scale: 1.3 };
  if (state.cargo === 'log') return { draw: (ctx) => { const im = IMG.log; if (!im) return; ctx.imageSmoothingEnabled = false; ctx.drawImage(im, -40, -82, 72, 40); }, behind };
  if (state.cargo === 'axe' || state.cargo === 'part') return { key: 'carryForged', frame: 0, behind };
  if (state.cargo === 'worn') return { key: 'carryWorn', frame: 0, behind };
  return null;
}

export function detailText(s, crew) {
  return [
    'TEST',
    'Local preview. Not Bones. Not $KIBBLE. Not a live rule.',
    `Dawn can issue up to ${DAILY_ISSUE} test chits while the total stays under ${CHIT_CAP}. That rate is unbalanced and local only.`,
    `Day ${s.day} · ${s.beat} · test chits ${s.chits}/${CHIT_CAP} · last dawn ${s.lastIssue}`,
    `Timber ${crew.timber.place} · logs ${s.logs} · mill ${s.millLogs} · planks cut ${s.sawed}`,
    `Saw ${crew.saw.place} · Wrench ${crew.wrench.place} · cart ${s.cart} · bay ${s.bay}`,
    `Porter ${crew.porter.place} · cargo ${s.cargo || 'none'} · sign ${s.shortage} · shop ${s.shopPlanks}`,
    `Bolt ${crew.bolt.place} · scrap used ${s.scrapUsed} · Stitch ${crew.stitch.place} · rack ${s.rack}`,
    `Crumb ${crew.crumb.place} · flour ${s.flour}/${FLOUR_STOCK} · bread eaten ${s.eaten} · cloth ${s.clothStock}/${CLOTH_STOCK}`,
    `Sprout crop ${s.crop} · Dusty grain ${s.grain} · milled ${s.milled} · Pike ore ${s.dug} · wear ${s.wear}`,
  ].join('\n');
}

export function createNpcWork(doc = document, storage = globalThis.localStorage) {
  const search = doc?.defaultView?.location?.search || '';
  if (!npcWorkOn(search)) return null;
  let state = seedState();
  let held = false;
  let acc = 0;
  const pop = doc?.createElement ? doc.createElement('div') : null;
  const chip = doc?.createElement ? doc.createElement('button') : null;
  if (chip) {
    chip.id = 'npcwork-chip';
    chip.type = 'button';
    chip.className = 'btn alt';
    chip.textContent = 'TEST';
    chip.setAttribute?.('aria-expanded', 'false');
  }
  if (pop) {
    pop.id = 'npcwork-pop';
    pop.hidden = true;
  }
  const hud = doc.getElementById?.('hud');
  if (chip && hud) hud.appendChild(chip);
  else if (chip && doc.body) doc.body.appendChild(chip);
  if (pop && doc.body) doc.body.appendChild(pop);
  if (doc.body?.classList) doc.body.classList.add('npcwork');
  const grove = doc.getElementById?.('grove-strip');
  if (grove) grove.hidden = true;
  const paint = () => {
    if (!pop) return;
    pop.textContent = detailText(state, crewView(state));
  };
  const persist = () => {
    if (!storage?.setItem) return;
    storage.setItem(SAVE_KEY, JSON.stringify({ v: 1, tag: TAG, state }));
  };
  if (chip) chip.addEventListener?.('click', () => {
    if (!pop) return;
    pop.hidden = !pop.hidden;
    toggleLabels();
    chip.setAttribute?.('aria-expanded', String(!pop.hidden));
    paint();
  });
  const ready = loadArt();
  paint();
  persist();
  return {
    artReady: ready.then(() => true),
    saveKey: SAVE_KEY,
    hold(v) { held = !!v; },
    reset() {
      state = seedState();
      if (storage?.removeItem) storage.removeItem(SAVE_KEY);
      persist();
      paint();
      return this.summary();
    },
    pose(patch) { Object.assign(state, patch || {}); return this.summary(); },
    seek(label) {
      state = seek(label);
      persist();
      paint();
      return this.summary();
    },
    frame(patch) {
      Object.assign(state, patch);
      paint();
      return this.summary();
    },
    pose(n) { state.phase = n; return state.phase; },
    line(ms) { lineMs = ms; return factoryFrame(lineMs); },
    cloth(ms) { clothMs = ms; return clothFrame(clothMs); },
    town(ms) { townMs = ms; rememberStocks(state); return { serve: serveFrame(townMs), cafe: cafeFrame(townMs), market: marketShown(townMs, shownStocks) }; },
    life(ms, mode) { return setLife(ms, mode); },
    shelf(stocks) { shelfOverride = stocks; rememberStocks(state); return marketShown(townMs, shownStocks); },
    advance() {
      advance(state);
      persist();
      paint();
      return this.summary();
    },
    step(dt) {
      if (held) { paint(); return state; }
      acc += Math.max(0, dt) * 1000;
      lineMs += Math.max(0, dt) * 1000;
      clothMs += Math.max(0, dt) * 1000;
      townMs += Math.max(0, dt) * 1000;
      stepLife(dt);
      rememberStocks(state);
      if (acc >= 140) {
        acc = 0;
        advance(state);
        persist();
      }
      paint();
      return state;
    },
    summary() {
      const crew = crewView(state);
      return { ...state, crew, visible: 'TEST' };
    },
    frameNote() {
      paint();
      const crew = crewView(state);
      const spot = (id) => ({ place: crew[id].place, moving: crew[id].moving, x: crew[id].x, y: crew[id].y, face: crew[id].face });
      return {
        visible: chip?.textContent || 'TEST',
        detail: pop?.textContent || detailText(state, crew),
        summary: {
          day: state.day, beat: state.beat, leg: state.leg, chits: state.chits, lastIssue: state.lastIssue, issuedDawn: state.issuedDawn,
          logs: state.logs, millLogs: state.millLogs, planks: state.planks, sawed: state.sawed, shopPlanks: state.shopPlanks, plankUsed: state.plankUsed,
          cart: state.cart, car: state.car, bay: state.bay, cargo: state.cargo, shortage: state.shortage,
          flour: state.flour, dough: state.dough, bread: state.bread, eaten: state.eaten, meal: state.meal,
          clothStock: state.clothStock, rack: state.rack, mannequin: state.mannequin, scrap: state.scrap, scrapUsed: state.scrapUsed, pressed: state.pressed,
          timber: spot('timber'), wrench: spot('wrench'), porter: spot('porter'), saw: spot('saw'), stitch: spot('stitch'), crumb: spot('crumb'), bolt: spot('bolt'),
        },
      };
    },
    actors() {
      rememberStocks(state);
      return Object.values(crewView(state)).filter((a) => {
        const bayLoop = state.bay === 'bonnet' || state.bay === 'creeper' || state.bay === 'wheel';
        if (a.id === 'wrench' && state.beat === 'bay' && bayLoop) return false;
        if (a.id === 'stitch' && (state.leg === 'sew' || state.leg === 'cut')) return false;
        if (a.id === 'saw' && state.beat === 'sawing') return false;
        if (a.id === 'crumb' && state.beat === 'baking' && state.leg === 'oven' && state.oven === 'knead') return false;
        if (a.id === 'bolt' && state.beat === 'pressing') return false;
        if (a.id === 'sprout' && state.beat === 'grow' && state.farmLoop !== 'rise') return false;
        if (a.id === 'dusty' && state.beat === 'grind') return false;
        if (a.id === 'pike' && state.beat === 'dig') return false;
        if (a.id === 'ember' && (state.beat === 'pour' || state.scrapFeed > 0)) return false;
        if (a.id === 'smith' && state.beat === 'hammer') return false;
        return true;
      }).concat(laidOut ? factoryHands().concat(clothHands(), townHands()) : []).filter((a) => !(a.id === 'dash' && lifeMode() === 'cart')).map((a) => {
        let npcOverlay = null;
        if (a.id === 'timber' && a.working) npcOverlay = { key: state.act === 'stack' ? 'stack' : 'chop', frame: state.axe, behind: false };
        else if (a.id === 'porter') npcOverlay = porterOverlay(state, a.face);
        else if (a.id === 'sprout' && state.cargo === 'sheaf') npcOverlay = { key: 'carrySheaf', frame: 0, behind: a.face === 'up' };
        else if (a.id === 'dusty' && state.cargo === 'flour') npcOverlay = { key: 'carryFlour', frame: 0, behind: a.face === 'up' };
        else if (a.id === 'pike' && state.cargo === 'ore') npcOverlay = { key: 'carryOre', frame: 0, behind: a.face === 'up' };
        else if (a.id === 'ember' && state.cargo === 'bar') npcOverlay = { key: 'carryBar', frame: 0, behind: a.face === 'up' };
        else if (a.id === 'bean' && shopOverlay()) npcOverlay = shopOverlay();
        else if (a.npcOverlay) npcOverlay = a.npcOverlay;
        const seat = { sprout: 'farm', dusty: 'mill', pike: 'mine', ember: 'smelter', smith: 'forge', timber: 'lumber', saw: 'sawmill', crumb: 'bakery', stitch: 'tailor', bolt: 'scrap', wrench: 'mechanic' };
        let x = a.x;
        let y = a.y;
        let face = a.face;
        if (laidOut && a.id === 'porter') {
          const step = routeProgress(state, 'porter');
          const pose = layoutPose(step.key, step.i, step.length);
          x = pose.tx * TILE + 16;
          y = pose.ty * TILE + 16;
          face = a.place === 'sign' ? 'down' : pose.face;
        } else if (laidOut && seat[a.id]) {
          const p = lotById(seat[a.id]);
          if (p) { x = p.door[0] * TILE + 16; y = p.door[1] * TILE + 16; }
        }
        const named = !laidOut || nearFocus(x, y);
        return {
          x, y, coat: a.coat, outfit: {}, face, phase: state.phase, moving: a.moving,
          name: named ? a.name : '', art: null, npcwork: true, npcOverlay,
          worker: { tool: '', face: a.face, phase: state.phase, work: 0 },
        };
      }).concat(lunchActor() || []);
    },
    props() {
      rememberStocks(state);
      const lumber = place(LUMBER);
      const mech = place(MECHANIC);
      const list = [
        { y: lumber.y + 128, d: (c) => blit(c, 'lumber', lumber.x, lumber.y, 192, 128) },
        { y: place(MECHANIC).y + 140, d: (c) => drawBay(c, state) },
        { y: place(SAWMILL).y + 128, d: (c) => drawSawmill(c, state) },
        { y: place(BAKERY).y + 128, d: (c) => drawBakery(c, state) },
        { y: place(FARM).y + 128, d: (c) => drawFarm(c, state) },
        { y: place(MILL).y + 128, d: (c) => drawMill(c, state) },
        { y: place(MINE).y + 128, d: (c) => drawMine(c, state) },
        { y: place(SMELTER).y + 128, d: (c) => drawSmelter(c, state) },
        { y: place(FORGE).y + 128, d: (c) => drawForge(c, state) },
        { y: (lotById('factory')?.y || 0) * TILE + 160, d: (c) => drawFactory(c) },
        { y: (lotById('cotton')?.y || 0) * TILE + 128, d: (c) => drawCotton(c) },
        { y: (lotById('cloth')?.y || 0) * TILE + 128, d: (c) => drawWeave(c) },
        { y: (lotById('goods')?.y || 0) * TILE + 128, d: (c) => drawMarket(c) },
        { y: (lotById('depot')?.y || 0) * TILE + 128, d: (c) => drawDepot(c) },
        { y: (lotById('tower')?.y || 0) * TILE + 96, d: (c) => drawTower(c) },
        { y: (lotById('shed')?.y || 0) * TILE + 96, d: (c) => drawShed(c) },
        { y: (lotById('sip')?.y || 0) * TILE + 128, d: (c) => drawSip(c) },
        { y: (lotById('vet')?.y || 0) * TILE + 128, d: (c) => drawVet(c) },
        { y: (lotById('cot0')?.y || 0) * TILE + 96, d: (c) => drawCottage(c, 'cot0', 'cot0') },
        { y: (lotById('cot1')?.y || 0) * TILE + 96, d: (c) => drawCottage(c, 'cot1', 'cot1') },
        { y: (lotById('cot2')?.y || 0) * TILE + 96, d: (c) => drawCottage(c, 'cot2', 'cot2') },
        { y: place(SCRAP).y + 128, d: (c) => drawScrap(c, state) },
        { y: lumber.y + 130, d: (c) => {
          for (let i = 0; i < state.logs && i < LOG_SLOTS.length; i++) blit(c, 'log', lumber.x + 16 + (i % 3) * 20, lumber.y + 96 + Math.floor(i / 3) * 12, 18, 10);
          label(c, `LOGS ${state.logs}`, lumber.x + 96, lumber.y - 8);
        } },
        { y: mech.y + 140, d: (c) => {
          if (state.shopPlanks >= 1) blit(c, 'plank', mech.x + 104, mech.y + 112, 51, 12);
          blit(c, state.shortage === 'FILLED' ? 'signFilled' : 'signShort', mech.x + 114, mech.y + 91, 40, 18);
          label(c, state.shortage === 'FILLED' ? 'FILLED' : `SHOP ${state.shopPlanks}`, mech.x + 134, mech.y + 80);
          if (state.shortage !== 'FILLED') label(c, 'SHORT 1 PLANK', mech.x + 134, mech.y + 64);
        } },
        { y: 8, d: (c) => {
          if (!laidOut) return;
          for (const s of STOPS) R(c, s.tx * TILE + 4, s.ty * TILE + 4, 56, 56, '#e07070');
          c.font = '8px Silkscreen, monospace';
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          for (const stub of EXPANSIONS) {
            const [tx, ty] = stubApproach(stub);
            const x = tx * TILE + 16;
            const y = ty * TILE + 8;
            R(c, x - 40, y - 28, 80, 22, '#3a2a16');
            R(c, x - 38, y - 26, 76, 18, '#f4e3c8');
            c.fillStyle = '#3a2a16';
            c.fillText('COMING SOON', x, y - 16);
            R(c, x - 2, y - 8, 4, 16, '#6a4428');
          }
          for (const n of NOOKS) R(c, n.tx * TILE + 8, n.ty * TILE + 8, 16, 16, '#8a6ad0');
        } },
        { y: place(TAILOR).y + 128, d: (c) => drawTailorShop(c, state) },
        ...dayProps(),
        ...(state.car === 'leaving' || state.car === 'out' ? [{
          y: (laidOut ? layoutPose('carExit', Math.min(state.carI, ROUTES.carExit.length - 1), ROUTES.carExit.length).ty : ROUTES.carExit[Math.min(state.carI, ROUTES.carExit.length - 1)][1]) * TILE + 16,
          d: (c) => {
            const tile = laidOut
              ? [layoutPose('carExit', Math.min(state.carI, ROUTES.carExit.length - 1), ROUTES.carExit.length).tx, layoutPose('carExit', Math.min(state.carI, ROUTES.carExit.length - 1), ROUTES.carExit.length).ty]
              : ROUTES.carExit[Math.min(state.carI, ROUTES.carExit.length - 1)];
            const x = tile[0] * TILE + 16;
            const y = tile[1] * TILE + 16;
            R(c, x - 18, y - 16, 36, 14, '#2f6fbd');
            R(c, x - 8, y - 22, 18, 8, '#9cc3c2');
            R(c, x - 14, y - 4, 7, 7, '#141a2e');
            R(c, x + 8, y - 4, 7, 7, '#141a2e');
          },
        }] : []),
      ];
      return list;
    },
    focus(x, y) { setFocus(x, y); },
    nearestNook(px, py) {
      let best = null;
      let bd = 48;
      for (const n of NOOKS) {
        const d = Math.hypot(px - (n.tx + 0.5) * TILE, py - (n.ty + 0.5) * TILE);
        if (d < bd) { bd = d; best = n; }
      }
      return best;
    },
  };
}

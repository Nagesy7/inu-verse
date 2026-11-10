// Opt-in only (?npcwork=1). Draws the workplaces and walks the crew.
// Save key is inuverse.preview.npcwork.v1. This file does not touch inuverse.save.v1.
import { TILE } from './world.js';
import {
  BAKERY, CHIT_CAP, CLOTH_STOCK, DAILY_ISSUE, FARM, FLOUR_STOCK, LUMBER, MECHANIC, MILL, ROUTES, SAWMILL, SCRAP, SIGN, TAILOR,
  SAVE_KEY, TAG, advance, crewView, seek, seedState,
} from './npcbuildings.js';

export const NPCWORK_QUERY = 'npcwork';

export function npcWorkOn(search = '') {
  return new URLSearchParams(search).get(NPCWORK_QUERY) === '1';
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
  carrySheaf: 'assets/npcwork/overlays/carry-wheat-sheaf.png',
  carryFlour: 'assets/npcwork/overlays/carry-flour-sack.png',
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
  })));
}

function blit(c, key, x, y, w, h) {
  const im = IMG[key];
  if (!im) return false;
  c.imageSmoothingEnabled = false;
  c.drawImage(im, Math.round(x), Math.round(y), w, h);
  return true;
}

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

function label(c, text, x, y) {
  c.font = '8px Silkscreen, monospace';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const w = Math.ceil(c.measureText(text).width) + 8;
  R(c, x - w / 2, y - 6, w, 12, '#121a36');
  c.fillStyle = '#f6e7b8';
  c.fillText(text, x, y);
}

function blitFrame(c, key, frame, x, y, dw, dh, fw, fh) {
  const im = IMG[key];
  if (!im) return;
  c.imageSmoothingEnabled = false;
  c.drawImage(im, frame * fw, 0, fw, fh, x, y, dw, dh);
}

function drawBay(c, state) {
  blit(c, 'shopInterior', 896, 64, 160, 128);
  if (state.car === 'leaving' || state.car === 'out') return;
  const x = 908;
  const y = 114;
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

function drawTailorShop(c, state) {
  const x = TAILOR.x * TILE;
  const y = TAILOR.y * TILE;
  blit(c, 'tailorShop', x, y, 160, 128);
  const wx = x + 12;
  const wy = y + 46;
  blit(c, state.rack ? 'rackStocked' : 'rackEmpty', wx, wy, 100, 56);
  blit(c, state.mannequin === 'dressed' ? 'manDressed' : 'manBare', wx, wy, 100, 56);
  if (state.leg === 'sew') blitFrame(c, 'sew', state.needle % 4, wx, wy, 100, 56, 50, 28);
  if (state.leg === 'cut') blitFrame(c, 'cut', state.needle % 4, wx, wy, 100, 56, 50, 28);
}

function fillFrame(n, steps) {
  let i = 0;
  for (let k = 0; k < steps.length; k++) if (n >= steps[k]) i = k;
  return i;
}

function drawSawmill(c, state) {
  const x = SAWMILL.x * TILE;
  const y = SAWMILL.y * TILE;
  blit(c, 'sawmill', x, y, 160, 128);
  blitFrame(c, 'logPile', fillFrame(state.millLogs, [0, 1, 3, 6]), x + 112, y + 94, 36, 26, 18, 13);
  blitFrame(c, 'plankStack', fillFrame(state.planks, [0, 1, 3, 5]), x + 12, y + 100, 36, 20, 18, 10);
  if (state.beat === 'sawing') blitFrame(c, 'sawLoop', state.sawFrame % 4, x + 12, y + 48, 136, 72, 68, 36);
  label(c, `MILL ${state.millLogs}`, x + 80, y - 8);
}

function drawFarm(c, state) {
  const x = FARM.x * TILE;
  const y = FARM.y * TILE;
  blit(c, 'wheatFarm', x, y, 192, 128);
  for (const [dx, dy] of [[40, 52], [72, 52], [40, 84], [72, 84]]) {
    blitFrame(c, 'crops', state.crop, x + dx, y + dy, 32, 32, 16, 16);
  }
  const loop = state.beat === 'grow' && state.farmLoop !== 'rise' ? state.farmLoop : '';
  const key = loop === 'sow' ? 'sow' : loop === 'water' ? 'water' : loop === 'harvest' ? 'harvest' : loop === 'sheaf' ? 'sheafLoop' : '';
  if (key) blitFrame(c, key, state.farmFrame % 4, x + 8, y + 28, 176, 88, 88, 44);
}

function drawMill(c, state) {
  const x = MILL.x * TILE;
  const y = MILL.y * TILE;
  blit(c, 'windmill', x, y, 160, 128);
  blitFrame(c, 'grainPile', state.grain > 0 ? 1 : 0, x + 20, y + 92, 36, 24, 18, 12);
  blitFrame(c, 'flourStack', state.milled > 0 && state.flourDelivered === 0 && state.cargo !== 'flour' ? 1 : 0, x + 112, y + 88, 36, 28, 18, 14);
  if (state.beat === 'grind') {
    blitFrame(c, 'sails', state.sailFrame % 4, x + 16, y + 36, 128, 80, 64, 40);
    blitFrame(c, 'grind', state.grindFrame % 4, x + 16, y + 36, 128, 80, 64, 40);
  }
}

function drawBakery(c, state) {
  const x = BAKERY.x * TILE;
  const y = BAKERY.y * TILE;
  blit(c, 'bakery', x, y, 160, 128);
  for (let i = 0; i < state.flour; i++) blit(c, 'flourSack', x - 28, y + 36 + i * 26, 20, 24);
  blit(c, state.bread >= 1 ? 'trayFull' : 'trayEmpty', x + 12, y + 46, 100, 56);
  blitFrame(c, 'ovenDoor', state.oven === 'bake' ? 1 : 0, x + 12, y + 46, 100, 56, 50, 28);
  if (state.beat === 'baking' && state.leg === 'oven' && state.oven === 'knead') blitFrame(c, 'knead', state.ovenFrame, x + 12, y + 46, 100, 56, 50, 28);
  label(c, `FLOUR ${state.flour}`, x + 40, y - 8);
}

function drawScrap(c, state) {
  const x = SCRAP.x * TILE;
  const y = SCRAP.y * TILE;
  const pressing = state.beat === 'pressing' && state.press === 'press';
  const sorting = state.beat === 'pressing' && state.press === 'sort';
  blit(c, 'scrapYard', x, y, 192, 128);
  if (!pressing) blit(c, 'pressIdle', x + 8, y + 24, 176, 92);
  // Stock sits above the idle press so the heap, crate and bale are not swallowed by that layer.
  blitFrame(c, 'brokenHeap', fillFrame(state.yardTool + state.yardLeft, [0, 1, 2, 3]), x + 12, y + 44, 44, 28, 22, 14);
  if (state.press === 'press' || state.pressed || state.scrap || state.scrapUsed || state.cargo === 'scrap') blit(c, 'partsCrate', x + 64, y + 56, 28, 22);
  if (state.scrap > 0) blit(c, 'scrapBale', x + 154, y + 32, 28, 20);
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
    advance() {
      advance(state);
      persist();
      paint();
      return this.summary();
    },
    step(dt) {
      if (held) { paint(); return state; }
      acc += Math.max(0, dt) * 1000;
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
      return Object.values(crewView(state)).filter((a) => {
        const bayLoop = state.bay === 'bonnet' || state.bay === 'creeper' || state.bay === 'wheel';
        if (a.id === 'wrench' && state.beat === 'bay' && bayLoop) return false;
        if (a.id === 'stitch' && (state.leg === 'sew' || state.leg === 'cut')) return false;
        if (a.id === 'saw' && state.beat === 'sawing') return false;
        if (a.id === 'crumb' && state.beat === 'baking' && state.leg === 'oven' && state.oven === 'knead') return false;
        if (a.id === 'bolt' && state.beat === 'pressing') return false;
        if (a.id === 'sprout' && state.beat === 'grow' && state.farmLoop !== 'rise') return false;
        if (a.id === 'dusty' && state.beat === 'grind') return false;
        return true;
      }).map((a) => {
        let npcOverlay = null;
        if (a.id === 'timber' && a.working) npcOverlay = { key: state.act === 'stack' ? 'stack' : 'chop', frame: state.axe, behind: false };
        else if (a.id === 'porter') npcOverlay = porterOverlay(state, a.face);
        else if (a.id === 'sprout' && state.cargo === 'sheaf') npcOverlay = { key: 'carrySheaf', frame: 0, behind: a.face === 'up' };
        else if (a.id === 'dusty' && state.cargo === 'flour') npcOverlay = { key: 'carryFlour', frame: 0, behind: a.face === 'up' };
        return {
          x: a.x, y: a.y, coat: a.coat, outfit: {}, face: a.face, phase: state.phase, moving: a.moving,
          name: a.name, art: null, npcwork: true, npcOverlay,
          worker: { tool: '', face: a.face, phase: state.phase, work: 0 },
        };
      });
    },
    props() {
      const list = [
        { y: 3200, d: (c) => blit(c, 'lumber', 1600, 3072, 192, 128) },
        { y: 192, d: (c) => drawBay(c, state) },
        { y: (SAWMILL.y + SAWMILL.h) * TILE, d: (c) => drawSawmill(c, state) },
        { y: (BAKERY.y + BAKERY.h) * TILE, d: (c) => drawBakery(c, state) },
        { y: (FARM.y + FARM.h) * TILE, d: (c) => drawFarm(c, state) },
        { y: (MILL.y + MILL.h) * TILE, d: (c) => drawMill(c, state) },
        { y: (SCRAP.y + SCRAP.h) * TILE, d: (c) => drawScrap(c, state) },
        { y: 3202, d: (c) => {
          for (let i = 0; i < state.logs && i < LOG_SLOTS.length; i++) blit(c, 'log', LOG_SLOTS[i][0], LOG_SLOTS[i][1], 18, 10);
          label(c, `LOGS ${state.logs}`, 1712, 3144);
        } },
        { y: 195, d: (c) => {
          if (state.shopPlanks >= 1) blit(c, 'plank', 1000, 176, 51, 12);
          blit(c, state.shortage === 'FILLED' ? 'signFilled' : 'signShort', 1010, 155, 40, 18);
          label(c, `SHOP ${state.shopPlanks}`, 1030, 190);
        } },
        { y: (TAILOR.y + TAILOR.h) * TILE, d: (c) => drawTailorShop(c, state) },
        ...(state.car === 'leaving' || state.car === 'out' ? [{
          y: ROUTES.carExit[Math.min(state.carI, ROUTES.carExit.length - 1)][1] * TILE + 16,
          d: (c) => {
            const tile = ROUTES.carExit[Math.min(state.carI, ROUTES.carExit.length - 1)];
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
  };
}

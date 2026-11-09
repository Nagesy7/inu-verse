// Opt-in only (?npcwork=1). Draws the lumber yard and the mechanic's shop
// on empty grass and walks the crew on existing town paths. Save key is
// inuverse.preview.npcwork.v1. This file does not touch inuverse.save.v1.
import { TILE } from './world.js';
import {
  CHIT_CAP, DAILY_ISSUE, LUMBER, MECHANIC, RECYCLER, SAVE_KEY, TAG,
  advance, crewView, seek, seedState,
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
  recyclerEmpty: 'assets/npcwork/props/recycler-empty.png',
  recyclerTool: 'assets/npcwork/props/recycler-tool.png',
  chop: 'assets/npcwork/overlays/chop-axe-down.png',
  stack: 'assets/npcwork/overlays/stack-log-down.png',
  wrench: 'assets/npcwork/overlays/repair-wrench-up.png',
  carryPlank: 'assets/npcwork/overlays/carry-plank.png',
  carryTool: 'assets/npcwork/overlays/carry-tool.png',
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
  if (!im) return;
  c.imageSmoothingEnabled = false;
  c.drawImage(im, Math.round(x), Math.round(y), w, h);
}

export function drawNpcOverlay(ctx, o) {
  const im = IMG[o.key];
  if (!im) return;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(im, (o.frame || 0) * 48, 0, 48, 60, -48, -88, 96, 120);
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

export function detailText(s, crew) {
  return [
    'TEST',
    'Local preview. Not Bones. Not $KIBBLE. Not a live rule.',
    `Dawn can issue up to ${DAILY_ISSUE} test chits while the total stays under ${CHIT_CAP}. That rate is unbalanced and local only.`,
    `Day ${s.day} · ${s.beat} · test chits ${s.chits}/${CHIT_CAP} · last dawn ${s.lastIssue}`,
    `Timber ${crew.timber.place} ${crew.timber.moving ? 'walking' : 'still'} · logs ${s.logs} · yard planks ${s.planks}`,
    `Wrench ${crew.wrench.place} ${crew.wrench.moving ? 'walking' : 'still'} · cart ${s.cart}`,
    `Porter ${crew.porter.place} ${crew.porter.moving ? 'walking' : 'still'} · cargo ${s.cargo || 'none'}`,
    `Shop planks ${s.shopPlanks} · recycled ${s.recycled} · notice ${s.shortage}`,
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
      return {
        visible: chip?.textContent || 'TEST',
        detail: pop?.textContent || detailText(state, crew),
        summary: {
          day: state.day,
          beat: state.beat,
          chits: state.chits,
          lastIssue: state.lastIssue,
          issuedDawn: state.issuedDawn,
          logs: state.logs,
          planks: state.planks,
          shopPlanks: state.shopPlanks,
          cart: state.cart,
          cargo: state.cargo,
          recycled: state.recycled,
          shortage: state.shortage,
          timber: { place: crew.timber.place, moving: crew.timber.moving, x: crew.timber.x, y: crew.timber.y },
          wrench: { place: crew.wrench.place, moving: crew.wrench.moving, x: crew.wrench.x, y: crew.wrench.y },
          porter: { place: crew.porter.place, moving: crew.porter.moving, x: crew.porter.x, y: crew.porter.y, cargo: state.cargo },
        },
      };
    },
    actors() {
      return Object.values(crewView(state)).map((a) => {
        let npcOverlay = null;
        if (a.id === 'timber' && a.working) npcOverlay = { key: state.act === 'stack' ? 'stack' : 'chop', frame: state.axe, behind: false };
        else if (a.id === 'wrench' && a.working) npcOverlay = { key: 'wrench', frame: state.wrenchSwing, behind: false };
        else if (a.id === 'porter' && state.cargo === 'plank') npcOverlay = { key: 'carryPlank', frame: 0, behind: a.face === 'up' };
        else if (a.id === 'porter' && state.cargo === 'tool') npcOverlay = { key: 'carryTool', frame: 0, behind: a.face === 'up' };
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
        { y: 192, d: (c) => blit(c, 'mechanic', 896, 64, 160, 128) },
        { y: 3202, d: (c) => {
          for (let i = 0; i < state.logs && i < LOG_SLOTS.length; i++) blit(c, 'log', LOG_SLOTS[i][0], LOG_SLOTS[i][1], 18, 10);
          label(c, `LOGS ${state.logs}`, 1712, 3144);
          if (state.planks >= 1) blit(c, 'plank', 1736, 3128, 34, 8);
        } },
        { y: 194, d: (c) => {
          if (state.cart === 'broken' || state.cart === 'fixed') blit(c, state.cart === 'fixed' ? 'cartFixed' : 'cartBroken', 954, 148, 44, 30);
          if (state.shopPlanks >= 1) blit(c, 'plank', 952, 180, 34, 8);
          blit(c, state.shortage === 'FILLED' ? 'signFilled' : 'signShort', 1010, 155, 40, 18);
          label(c, `SHOP ${state.shopPlanks}`, 1030, 190);
        } },
        { y: 286, d: (c) => blit(c, state.recycled ? 'recyclerTool' : 'recyclerEmpty', 960, 256, 32, 32) },
      ];
      return list;
    },
  };
}

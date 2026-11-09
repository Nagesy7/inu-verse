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

const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };

function building(c, lot, wall, roof, title) {
  const x = lot.x * TILE;
  const y = lot.y * TILE;
  const w = lot.w * TILE;
  const h = lot.h * TILE;
  R(c, x + 4, y + h - 6, w, 8, 'rgba(16,24,48,.28)');
  R(c, x, y + 10, w, h - 10, '#3a2210');
  R(c, x + 2, y + 12, w - 4, h - 14, wall);
  R(c, x - 4, y, w + 8, 16, '#3a2210');
  R(c, x - 2, y + 2, w + 4, 12, roof);
  R(c, x + w / 2 - 8, y + h - 22, 16, 18, '#5c3a22');
  c.font = '8px Silkscreen, monospace';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const tw = Math.ceil(c.measureText(title).width) + 8;
  R(c, x + w / 2 - tw / 2, y + 18, tw, 12, '#121a36');
  c.fillStyle = '#f6e7b8';
  c.fillText(title, x + w / 2, y + 24);
}

function logs(c, n) {
  const x = (LUMBER.x + 2) * TILE;
  const y = (LUMBER.y + LUMBER.h - 1) * TILE - 8;
  for (let i = 0; i < n; i++) {
    R(c, x + (i % 3) * 14, y - Math.floor(i / 3) * 8, 12, 6, i % 2 ? '#8a5a32' : '#c48a48');
    R(c, x + (i % 3) * 14, y - Math.floor(i / 3) * 8, 12, 2, '#e2b888');
  }
  label(c, `LOGS ${n}`, x + 20, y - 28);
}

function label(c, text, x, y) {
  c.font = '8px Silkscreen, monospace';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const w = Math.ceil(c.measureText(text).width) + 8;
  R(c, x - w / 2, y - 6, w, 12, '#121a36');
  c.fillStyle = '#f6e7b8';
  c.fillText(text, x, y);
}

function cart(c, kind) {
  const x = MECHANIC.door[0] * TILE + 16;
  const y = (MECHANIC.y + MECHANIC.h - 1) * TILE + 8;
  if (kind === 'carried' || kind === 'recycled') return;
  R(c, x - 16, y - 10, 32, 10, kind === 'fixed' ? '#2f6fbd' : '#6a6460');
  R(c, x - 18, y - 16, 20, 8, kind === 'fixed' ? '#7eb0e0' : '#4a4644');
  R(c, x - 14, y, 8, 8, '#141a2e');
  if (kind === 'fixed') R(c, x + 6, y, 8, 8, '#141a2e');
  else R(c, x + 8, y + 2, 8, 3, '#8a4030');
  label(c, kind === 'fixed' ? 'CART FIXED' : 'CART BROKEN', x, y - 28);
}

function sign(c, text) {
  const x = (MECHANIC.x + MECHANIC.w - 1) * TILE;
  const y = MECHANIC.door[1] * TILE - 20;
  label(c, text, x, y);
}

function bin(c, n) {
  const x = RECYCLER[0] * TILE + 16;
  const y = RECYCLER[1] * TILE + 10;
  R(c, x - 10, y - 16, 20, 16, '#2a6a38');
  R(c, x - 12, y - 20, 24, 5, '#1d4a28');
  if (n) R(c, x - 6, y - 28, 12, 6, '#9aa0b4');
  label(c, n ? 'RECYCLED 1' : 'RECYCLER', x, y - 36);
}

function plankProp(c, x, y) {
  R(c, x + 8, y - 16, 28, 8, '#e2b070');
  R(c, x + 8, y - 16, 28, 2, '#f0d0a0');
  R(c, x + 8, y - 10, 28, 2, '#a87440');
  label(c, 'PLANK', x + 22, y - 28);
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
  paint();
  persist();
  return {
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
      return Object.values(crewView(state)).map((a) => ({
        x: a.x, y: a.y, coat: a.coat, outfit: {}, face: a.face, phase: state.phase, moving: a.moving,
        name: a.name, art: null, npcwork: true,
        worker: { tool: a.tool, face: a.face, phase: state.phase, work: a.working ? 1 : 0 },
      }));
    },
    props() {
      const crew = crewView(state);
      const list = [
        { y: (LUMBER.y + LUMBER.h) * TILE, d: (c) => building(c, LUMBER, '#8d5a32', '#6a3030', 'LUMBER') },
        { y: (MECHANIC.y + MECHANIC.h) * TILE, d: (c) => building(c, MECHANIC, '#4a5568', '#2a3348', 'MECHANIC') },
        { y: (LUMBER.y + LUMBER.h) * TILE + 2, d: (c) => { logs(c, state.logs); label(c, `PLANKS ${state.planks}`, (LUMBER.x + 4) * TILE, (LUMBER.y + 1) * TILE); } },
        { y: MECHANIC.door[1] * TILE, d: (c) => { cart(c, state.cart); sign(c, state.shortage); label(c, `SHOP ${state.shopPlanks}`, MECHANIC.door[0] * TILE - 28, MECHANIC.door[1] * TILE - 8); } },
        { y: RECYCLER[1] * TILE + 12, d: (c) => bin(c, state.recycled) },
      ];
      if (state.cargo === 'plank' || state.cargo === 'tool') {
        const p = crew.porter;
        list.push({ y: p.y + 4, d: (c) => (state.cargo === 'plank' ? plankProp(c, p.x + 18, p.y) : label(c, 'TOOL', p.x + 18, p.y - 36)) });
      }
      return list;
    },
  };
}

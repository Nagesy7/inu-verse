// Preview-only day shift from Studio v1.7 and the v1.7.1 delta. Cosmetic. No currency.
import { TILE } from './world.js';
import { normalizeCoat, COATS } from './game.js';
import { lotById } from './townproposal.js';

const SRC = {
  quarry: 'assets/npcwork/quarry/quarry.png',
  split: 'assets/npcwork/quarry/work-split.png',
  pile: 'assets/npcwork/quarry/stone-pile.png',
  yard: 'assets/npcwork/yard/builders-yard.png',
  hammer: 'assets/npcwork/yard/work-hammer.png',
  stages: 'assets/npcwork/yard/house-stages.png',
  patch: 'assets/npcwork/yard/repair-patch.png',
  well: 'assets/npcwork/well/well.png',
  draw: 'assets/npcwork/well/work-draw.png',
  dock: 'assets/npcwork/dock/dock-east.png',
  fish: 'assets/npcwork/dock/work-fish-east.png',
  crate: 'assets/npcwork/dock/fish-crate.png',
  pay: 'assets/npcwork/pay/pay-window.png',
  payLoop: 'assets/npcwork/pay/work-pay.png',
  board: 'assets/npcwork/jobs/noticeboard.png',
  cards: 'assets/npcwork/jobs/job-cards.png',
  bench: 'assets/npcwork/props/lunch-bench.png',
  eatCoat: 'assets/npcwork/overlays/lunch-eat-coat.png',
  eatFront: 'assets/npcwork/overlays/lunch-eat-front.png',
  wickLight: 'assets/npcwork/night/wick-light.png',
  wickLeft: 'assets/npcwork/night/wick-patrol-left.png',
  wickRight: 'assets/npcwork/night/wick-patrol-right.png',
  wickHome: 'assets/npcwork/night/wick-home.png',
  bay: 'assets/npcwork/lights/glow-bay-lamp.png',
  pane5: 'assets/npcwork/lights/glow-pane-5x9.png',
  pane6: 'assets/npcwork/lights/glow-pane-6x9.png',
  pane8: 'assets/npcwork/lights/glow-pane-8x9.png',
  nightGlow: 'assets/npcwork/bakery/nightshift-glow.png',
  cartLoad: 'assets/npcwork/depot/work-cart-load.png',
  handcart: 'assets/npcwork/cart/handcart-right.png',
  glowStreet: 'assets/npcwork/lights/glow-street.png',
  glowWindow: 'assets/npcwork/lights/glow-window.png',
  darkWindow: 'assets/npcwork/lights/dark-window.png',
  darkDoor: 'assets/npcwork/lights/dark-door.png',
  sleepZ: 'assets/npcwork/lights/sleep-z.png',
  shopCafe: 'assets/npcwork/overlays/shop-cafe.png',
};

const IMG = {};
const coatCache = new Map();
let lifeMs = 0;
let lifeHold = null;

const SPLIT = [300, 180, 260, 360];
const HAMMER = [240, 160, 240, 160];
const DRAW = [220, 220, 220, 360];
const FISH = [300, 200, 600, 360];
const PAY = [400, 220, 300, 500];
const LUNCH = [700, 400, 500, 800];
const LIGHT = [300, 260, 200, 700];
const PATROL = [200, 200, 200, 200];
const HOME = [700, 500, 600, 900];
const CART = [280, 260, 260, 360];

export function frameAt(ms, times) {
  const total = times.reduce((sum, n) => sum + n, 0) || 1;
  let t = ((ms % total) + total) % total;
  for (let i = 0; i < times.length; i++) {
    if (t < times[i]) return i;
    t -= times[i];
  }
  return 0;
}

export function loadDayArt() {
  if (typeof Image === 'undefined') return Promise.resolve(false);
  return Promise.all(Object.entries(SRC).map(([key, src]) => new Promise((res) => {
    const im = new Image();
    im.onload = () => { IMG[key] = im; res(true); };
    im.onerror = () => res(false);
    im.src = src;
  })));
}

export function setLife(ms, mode) {
  lifeMs = ms;
  lifeHold = mode || null;
  return lifeNow();
}

export function stepLife(dt) {
  lifeMs += Math.max(0, dt) * 1000;
}

export function lifeMode() {
  if (lifeHold) return lifeHold;
  const t = ((lifeMs % 12000) + 12000) % 12000;
  if (t < 8000) return 'work';
  if (t < 10400) return 'lunch';
  return 'cart';
}

export function wickPhase() {
  if (lifeHold === 'wick-light') return 'light';
  if (lifeHold === 'wick-patrol') return 'patrol';
  if (lifeHold === 'wick-home') return 'home';
  if (lifeHold === 'wick-sleep') return 'sleep';
  const order = [['light', 1460], ['patrol', 1600], ['home', 2700], ['sleep', 3000]];
  let t = ((lifeMs % 8760) + 8760) % 8760;
  for (const [id, n] of order) {
    if (t < n) return id;
    t -= n;
  }
  return 'sleep';
}

export function lifeNow() {
  return {
    mode: lifeMode(),
    ms: lifeMs,
    wick: wickPhase(),
    lunch: frameAt(lifeMs, LUNCH),
    split: frameAt(lifeMs, SPLIT),
    cart: lifeMode() === 'cart',
  };
}

// Sit anchor (ax, ay). Bench under the haunch, actor clipped and raised, then the two overlays.
export function lunchLayout(ax, ay) {
  return {
    bench: [ax - 32, ay - 26, 64, 28],
    clipY: ay - 10,
    raise: 6,
    coat: [ax - 24, ay - 44, 48, 60],
    front: [ax - 24, ay - 44, 48, 60],
  };
}

export function lunchSeat() {
  const well = lotById('drawwell');
  const tx = well ? well.door[0] : 6;
  const ty = well ? well.door[1] : 59;
  return { ax: tx * TILE + 16, ay: ty * TILE + 16, name: 'Brook', coat: 'red' };
}

function blit(c, key, x, y, w, h) {
  const im = IMG[key];
  if (!im) return;
  c.imageSmoothingEnabled = false;
  c.drawImage(im, Math.round(x), Math.round(y), w, h);
}

function frame(c, key, i, x, y, dw, dh, fw, fh) {
  const im = IMG[key];
  if (!im) return;
  c.imageSmoothingEnabled = false;
  c.drawImage(im, i * fw, 0, fw, fh, Math.round(x), Math.round(y), dw, dh);
}

function origin(id) {
  const lot = lotById(id);
  if (!lot) return null;
  return { lot, x: lot.x * TILE, y: lot.y * TILE };
}

function night() {
  return !!globalThis.__inuNight;
}

export function dayProps() {
  const list = [];
  const put = (id, y, d) => {
    const at = origin(id);
    if (!at) return;
    list.push({ y: at.y + y, d: (c) => d(c, at.x, at.y) });
  };
  put('quarry', 128, (c, x, y) => {
    blit(c, 'quarry', x, y, 160, 128);
    frame(c, 'pile', Math.floor(lifeMs / 800) % 4, x + 112, y + 92, 48, 36, 24, 18);
    if (lifeMode() !== 'lunch') frame(c, 'split', frameAt(lifeMs, SPLIT), x + 8, y + 52, 104, 72, 52, 36);
    if (night()) blit(c, 'glowWindow', x + 128, y + 56, 20, 20);
  });
  put('builders', 128, (c, x, y) => {
    blit(c, 'yard', x, y, 160, 128);
    frame(c, 'hammer', frameAt(lifeMs, HAMMER), x + 8, y + 44, 104, 80, 52, 40);
    if (night()) blit(c, 'glowWindow', x + 128, y + 44, 20, 20);
  });
  put('stage', 96, (c, x, y) => {
    const i = Math.floor(lifeMs / 900) % 3;
    frame(c, 'stages', i, x, y, 96, 96, 48, 48);
    if (i === 2) frame(c, 'patch', 2, x, y, 96, 96, 48, 48);
  });
  put('drawwell', 96, (c, x, y) => {
    blit(c, 'well', x, y, 96, 96);
    if (lifeMode() !== 'lunch') frame(c, 'draw', frameAt(lifeMs, DRAW), x, y + 16, 96, 76, 48, 38);
  });
  put('eastdock', 96, (c, x, y) => {
    blit(c, 'dock', x, y, 96, 96);
    frame(c, 'fish', frameAt(lifeMs, FISH), x, y + 8, 96, 80, 48, 40);
    frame(c, 'crate', Math.floor(lifeMs / 700) % 4, x + 2, y + 70, 32, 24, 16, 12);
  });
  put('pay', 64, (c, x, y) => {
    blit(c, 'pay', x, y, 64, 64);
    frame(c, 'payLoop', frameAt(lifeMs, PAY), x, y, 64, 64, 32, 32);
  });
  put('jobs', 32, (c, x, y) => {
    blit(c, 'board', x, y - 48, 64, 80);
    const slots = [[4, 11], [13, 11], [22, 11], [4, 21], [13, 21], [22, 21]];
    slots.forEach(([sx, sy], i) => frame(c, 'cards', i % 8, x + sx * 2, y - 48 + sy * 2, 16, 18, 8, 9));
  });
  if (lifeMode() === 'cart') {
    put('depot', 130, (c, x, y) => {
      frame(c, 'cartLoad', frameAt(lifeMs, CART), x + 12, y + 44, 108, 76, 54, 38);
      const step = Math.floor(lifeMs / 110) % 8;
      frame(c, 'handcart', step, x + 36, y + 78, 60, 48, 30, 24);
    });
  }
  if (night()) {
    const bay = (c, x, y) => {
      c.save();
      c.globalCompositeOperation = 'lighter';
      blit(c, 'bay', x, y, 24, 28);
      c.restore();
    };
    put('goods', 130, (c, x, y) => {
      bay(c, x + 72, y + 42);
      blit(c, 'pane6', x + 170, y + 56, 12, 18);
    });
    put('depot', 130, (c, x, y) => {
      bay(c, x + 52, y + 50);
      blit(c, 'pane6', x + 134, y + 56, 12, 18);
    });
    put('sip', 130, (c, x, y) => {
      bay(c, x + 44, y + 38);
      blit(c, 'pane5', x + 106, y + 60, 10, 18);
    });
    put('bakery', 130, (c, x, y) => {
      frame(c, 'nightGlow', Math.floor(lifeMs / 280) % 2, x + 12, y + 46, 100, 56, 50, 28);
      blit(c, 'pane8', x + 132, y + 60, 16, 18);
    });
  }
  const showWick = night() || (lifeHold && String(lifeHold).startsWith('wick'));
  if (showWick && wickPhase() !== 'sleep') {
    const ax = 36 * TILE + 16;
    const ay = 36 * TILE + 16;
    const phase = wickPhase();
    list.push({
      y: ay + 4,
      d: (c) => drawWick(c, ax, ay, phase),
    });
  }
  return list;
}

function drawWick(c, ax, ay, phase) {
  const s = 2;
  if (phase === 'light') {
    const i = frameAt(lifeMs, LIGHT);
    frame(c, 'wickLight', i, ax - 20 * s, ay - 48 * s, 40 * s, 48 * s, 40, 48);
    return;
  }
  if (phase === 'home') {
    frame(c, 'wickHome', frameAt(lifeMs, HOME), ax - 18 * s, ay - 35 * s, 32 * s, 36 * s, 32, 36);
    return;
  }
  const right = Math.floor(lifeMs / 800) % 2 === 0;
  const i = frameAt(lifeMs, PATROL);
  const x = ax - 18 * s + (right ? 1 : -1) * i * 6;
  frame(c, right ? 'wickRight' : 'wickLeft', i, x, ay - 35 * s, 32 * s, 36 * s, 32, 36);
}

export function cottageAsleep(id) {
  return id === 'cot1' && night() && wickPhase() === 'sleep';
}

function baySpots() {
  const spots = [];
  for (const [id, dx, dy] of [['goods', 72, 42], ['depot', 52, 50], ['sip', 44, 38]]) {
    const at = origin(id);
    if (at) spots.push([at.x + dx, at.y + dy]);
  }
  return spots;
}

// The night grade multiplies the town toward blue, which swallows this lamp's few gold pixels.
// Draw the same sprite after the grade so the falloff can be judged on top of that tint.
export function punchNightLights(ctx, ox, oy) {
  if (!night() || !ctx) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  for (const [x, y] of baySpots()) blit(ctx, 'bay', x + ox, y + oy, 24, 28);
  ctx.restore();
}

export function drawCottageSleep(c, x, y) {
  blit(c, 'darkWindow', x + 14, y + 36, 20, 20);
  blit(c, 'darkDoor', x + 42, y + 52, 10, 10);
  frame(c, 'sleepZ', Math.floor(lifeMs / 400) % 3, x - 4, y - 28, 28, 32, 14, 16);
}

export function shopOverlay() {
  if (lifeMode() !== 'shop') return null;
  const times = [500, 400, 400, 600];
  return {
    draw(ctx) {
      const im = IMG.shopCafe;
      if (!im) return;
      const i = frameAt(lifeMs, times);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(im, i * 48, 0, 48, 60, -48, -88, 96, 120);
    },
  };
}

export function lunchActor() {
  if (lifeMode() !== 'lunch') return null;
  const seat = lunchSeat();
  return {
    x: seat.ax,
    y: seat.ay,
    coat: seat.coat,
    outfit: {},
    face: 'down',
    phase: 0,
    moving: false,
    name: seat.name,
    art: null,
    lunch: { frame: frameAt(lifeMs, LUNCH) },
  };
}

function swappedCoat(coat, index) {
  const im = IMG.eatCoat;
  if (!im || typeof document === 'undefined') return null;
  const key = `${coat}:${index}`;
  if (coatCache.has(key)) return coatCache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 60;
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(im, index * 48, 0, 48, 60, 0, 0, 48, 60);
  const image = g.getImageData(0, 0, 48, 60);
  const pal = COATS[normalizeCoat(coat)];
  const map = {
    '255,255,255': pal.base,
    '128,128,128': pal.dark,
    '192,192,192': pal.light,
  };
  const px = image.data;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    const hex = map[`${px[i]},${px[i + 1]},${px[i + 2]}`];
    if (!hex) continue;
    const n = parseInt(hex.slice(1), 16);
    px[i] = (n >> 16) & 255;
    px[i + 1] = (n >> 8) & 255;
    px[i + 2] = n & 255;
  }
  g.putImageData(image, 0, 0);
  coatCache.set(key, canvas);
  return canvas;
}

export function drawSeated(ctx, actor, drawBody) {
  const ax = actor.x;
  const ay = actor.y;
  const lay = lunchLayout(ax, ay);
  const index = actor.lunch?.frame || 0;
  blit(ctx, 'bench', lay.bench[0], lay.bench[1], lay.bench[2], lay.bench[3]);
  ctx.save();
  ctx.beginPath();
  ctx.rect(-100000, -100000, 200000, lay.clipY + 100000);
  ctx.clip();
  drawBody(ax, ay - lay.raise);
  ctx.restore();
  const coat = swappedCoat(actor.coat, index);
  const mirror = actor.face === 'right';
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (mirror) {
    ctx.translate(ax, 0);
    ctx.scale(-1, 1);
    if (coat) ctx.drawImage(coat, -24, ay - 44, 48, 60);
    if (IMG.eatFront) ctx.drawImage(IMG.eatFront, index * 48, 0, 48, 60, -24, ay - 44, 48, 60);
  } else {
    if (coat) ctx.drawImage(coat, lay.coat[0], lay.coat[1], 48, 60);
    if (IMG.eatFront) ctx.drawImage(IMG.eatFront, index * 48, 0, 48, 60, lay.front[0], lay.front[1], 48, 60);
  }
  ctx.restore();
}

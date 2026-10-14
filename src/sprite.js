// Procedural pixel-art Shiba avatars (upright, big head) with outfit layers.
// Each sprite is painted on a tiny grid canvas, outlined, cached and blitted
// with imageSmoothingEnabled=false for crisp chunky pixels.
import { COATS, normalizeCoat } from './game.js';
import { outfitLook } from './outfits.js';

export const GW = 18, GH = 27, PAD = 1;
const SHIRT = '#f3ead6', SHIRT_D = '#d9ccb0', JEANS = '#26335e', JEANS_D = '#1a2446', INK = '#1a1420';
const cache = new Map();

function grid() {
  const g = Array.from({ length: GH }, () => new Array(GW).fill(null));
  const set = (x, y, c) => { if (c && x >= 0 && y >= 0 && x < GW && y < GH) g[y][x] = c; };
  const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, c); };
  const has = (x, y) => x >= 0 && y >= 0 && x < GW && y < GH && g[y][x];
  return { g, set, rect, has };
}

// face: 'down' | 'up' | 'side' (side = facing right; left is mirrored)
function paint(coatKey, face, frame, equipped) {
  const C = COATS[normalizeCoat(coatKey)], o = outfitLook(equipped), G = grid(), { set, rect } = G;
  const step = frame % 2 === 1 ? (frame === 1 ? -1 : 1) : 0; // -1 left foot up, 1 right foot up
  const bob = frame % 2 === 1 ? 1 : 0;
  const top = o.top, gown = top?.kind === 'gown';
  const pants = o.bottom || { c: JEANS, d: JEANS_D };
  const shirtC = top ? top.c : SHIRT, shirtD = top ? top.d : SHIRT_D;
  const longSleeve = top && top.kind !== 'hawaiian' && top.kind !== 'gown';
  const by = bob; // body y offset (head bobs with body)

  if (face !== 'side') {
    const back = face === 'up';
    // legs / feet
    const legs = [[5, step === -1 ? -1 : 0], [10, step === 1 ? -1 : 0]];
    if (!gown) for (const [lx, ly] of legs) {
      rect(lx, 20 + ly + by, 3, 4, pants.c); set(lx + 2, 20 + ly + by + 1, pants.d); set(lx + 2, 20 + ly + by + 2, pants.d);
      if (pants.rip) { set(lx + 1, 21 + ly + by, pants.rip); set(lx, 22 + ly + by, pants.rip); }
    }
    for (const [lx, ly] of legs) {
      const fx = lx - 1, fy = 24 + ly + by;
      if (o.feet) { rect(fx, fy, 4, 2, o.feet.c); rect(fx, fy + 1, 4, 1, o.feet.sole); }
      else { rect(fx + 1, fy, 3, 2, C.light); set(fx + 1, fy + 1, C.dark); }
    }
    if (!gown) { rect(5, 20 + by, 8, 1, pants.c); rect(5, 20 + by, 8, 1, top?.kind === 'suit' || top?.kind === 'jacket' ? shirtD : pants.d); rect(5, 19 + by, 8, 1, '#2b2116'); set(8, 19 + by, '#c9a24a'); }
    // torso
    rect(5, 13 + by, 8, 7, shirtC); rect(12, 14 + by, 1, 6, shirtD);
    // arms (swing opposite to legs)
    const armL = step === 1 ? -1 : 0, armR = step === -1 ? -1 : 0;
    for (const [ax, ay] of [[3, armL], [13, armR]]) {
      rect(ax, 13 + ay + by, 2, longSleeve ? 5 : 2, shirtC); set(ax + 1, 14 + ay + by, shirtD);
      if (!longSleeve) rect(ax, 15 + ay + by, 2, 3, C.base);
      rect(ax, 18 + ay + by, 2, 1, C.light);
    }
    if (gown) { // flared skirt
      for (let r = 0; r < 6; r++) rect(5 - (r >> 1), 20 + r + by, 8 + 2 * (r >> 1), 1, r % 2 ? top.c : top.c);
      rect(5, 19 + by, 8, 1, top.accent); for (let r = 1; r < 6; r += 2) set(13 + (r >> 1) - 1, 20 + r + by, top.d);
      set(9, 21 + by, top.accent); set(8, 23 + by, top.accent); set(10, 24 + by, top.accent);
      if (!back) { set(7, 13 + by, top.accent); set(10, 13 + by, top.accent); }
    }
    if (!back && top) {
      if (top.kind === 'suit') { rect(8, 13 + by, 2, 4, top.shirt); set(7, 14 + by, top.d); set(10, 14 + by, top.d); set(11, 15 + by, top.pin); set(8, 18 + by, top.d); set(9, 17 + by, top.d); }
      if (top.kind === 'hoodie') { set(7, 14 + by, '#f3ead6'); set(10, 14 + by, '#f3ead6'); set(7, 15 + by, '#f3ead6'); set(10, 15 + by, '#f3ead6'); set(11, 16 + by, top.accent); rect(6, 18 + by, 6, 1, top.d); }
      if (top.kind === 'jacket') { rect(8, 13 + by, 2, 7, '#111'); set(9, 15 + by, top.accent); set(9, 17 + by, top.accent); set(11, 14 + by, top.accent); }
      if (top.kind === 'hawaiian') { for (const [px, py] of [[6, 14], [10, 15], [7, 17], [11, 18], [5, 18], [9, 13]]) set(px, py + by, top.accent); rect(8, 13 + by, 1, 7, top.d); }
    }
    if (back && top?.kind === 'hoodie') rect(6, 13 + by, 6, 2, top.d);
    if (back && !gown) { set(8, 17 + by, C.light); set(9, 16 + by, C.base); } // tail curl peeking
    // neck accessories
    if (!back && o.neck) {
      if (o.neck.kind === 'tie') { rect(8, 13 + by, 2, 1, o.neck.c); rect(8, 14 + by, 2, 3, o.neck.c); set(8, 17 + by, o.neck.c); }
      if (o.neck.kind === 'bow') { rect(6, 13 + by, 6, 1, o.neck.c); set(6, 14 + by, o.neck.c); set(11, 14 + by, o.neck.c); set(8, 14 + by, '#444'); set(9, 14 + by, '#444'); }
      if (o.neck.kind === 'chain') { set(6, 13 + by, o.neck.c); set(7, 14 + by, o.neck.c); set(8, 15 + by, o.neck.c); set(9, 15 + by, o.neck.c); set(10, 14 + by, o.neck.c); set(11, 13 + by, o.neck.c); set(8, 16 + by, '#fff1b0'); }
    }
    // head
    const hy = by;
    for (const ex of [2, 12]) { // ears
      rect(ex + 1, 0 + hy, 1, 1, C.base); rect(ex, 1 + hy, 3, 1, C.base); rect(ex, 2 + hy, 4, 1, C.base); rect(ex, 3 + hy, 4, 1, C.base);
      if (!back) { set(ex + 1, 2 + hy, C.ear); set(ex + (ex < 9 ? 1 : 2), 3 + hy, C.ear); }
    }
    rect(4, 3 + hy, 10, 1, C.base); rect(2, 4 + hy, 14, 7, C.base); rect(3, 11 + hy, 12, 1, C.base); rect(5, 12 + hy, 8, 1, C.base);
    rect(15, 5 + hy, 1, 6, C.dark); set(14, 11 + hy, C.dark);
    if (!back) {
      set(5, 5 + hy, C.light); set(12, 5 + hy, C.light);
      rect(6, 7 + hy, 6, 1, C.light); rect(3, 8 + hy, 12, 3, C.light); rect(4, 11 + hy, 10, 1, C.light); rect(6, 12 + hy, 6, 1, C.light);
      rect(5, 6 + hy, 1, 2, INK); rect(12, 6 + hy, 1, 2, INK); set(5, 6 + hy, '#3a2c28');
      rect(8, 8 + hy, 2, 1, INK); set(8, 9 + hy, INK); set(9, 9 + hy, INK); set(7, 10 + hy, '#5a3a32'); set(10, 10 + hy, '#5a3a32');
      set(4, 9 + hy, '#f0a0a0');  set(13, 9 + hy, '#f0a0a0');
      if (o.eyes) { rect(3, 6 + hy, 12, 1, o.eyes.frame); rect(4, 6 + hy, 4, 2, o.eyes.c); rect(10, 6 + hy, 4, 2, o.eyes.c); set(5, 6 + hy, '#5a6070'); set(11, 6 + hy, '#5a6070'); }
    } else { rect(4, 10 + hy, 10, 2, C.dark); rect(5, 4 + hy, 8, 1, C.dark); }
    if (o.hat?.kind === 'cap') { rect(4, 1 + hy, 10, 1, o.hat.c); rect(3, 2 + hy, 12, 2, o.hat.c); rect(14, 2 + hy, 1, 2, o.hat.d); set(8, 1 + hy, o.hat.d); if (!back) rect(2, 4 + hy, 14, 1, o.hat.d); else rect(6, 4 + hy, 6, 1, o.hat.d); }
    if (o.hat?.kind === 'tophat') { rect(5, -0 + hy, 8, 3, o.hat.c); rect(5, 2 + hy, 8, 1, o.hat.band); rect(3, 3 + hy, 12, 1, o.hat.d); rect(12, 0 + hy, 1, 2, o.hat.d); }
  } else {
    // ---- side view (facing right) ----
    const legF = step === 1 ? 1 : step === -1 ? -1 : 0;
    if (!gown) {
      rect(7 - legF, 20 + by, 3, 4, pants.d); rect(9 + legF, 20 + by, 3, 4, pants.c);
      if (pants.rip) set(10 + legF, 21 + by, pants.rip);
    }
    for (const [fx, col] of [[6 - legF, 0], [9 + legF, 1]]) {
      if (o.feet) { rect(fx, 24 + by, 4, 2, o.feet.c); rect(fx, 25 + by, 4, 1, o.feet.sole); }
      else { rect(fx + 1, 24 + by, 3, 2, col ? C.light : C.dark); }
    }
    if (!gown) { rect(7, 19 + by, 5, 1, '#2b2116'); rect(7, 20 + by, 5, 1, pants.c); }
    // tail
    if (!gown) { rect(4, 14 + by, 2, 2, C.base); set(4, 13 + by, C.base); set(5, 14 + by, C.light); }
    rect(6, 13 + by, 6, 7, shirtC); rect(6, 13 + by, 1, 7, shirtD);
    if (top?.kind === 'suit') { rect(11, 13 + by, 1, 3, top.shirt); set(10, 15 + by, top.pin); }
    if (top?.kind === 'hawaiian') for (const [px, py] of [[7, 14], [10, 16], [8, 18]]) set(px, py + by, top.accent);
    if (top?.kind === 'jacket') set(11, 15 + by, top.accent);
    if (top?.kind === 'hoodie') { rect(6, 13 + by, 2, 2, top.d); set(11, 16 + by, top.accent); }
    if (gown) { for (let r = 0; r < 6; r++) rect(6 - (r >> 1), 20 + r + by, 7 + (r >> 1) * 2, 1, top.c); rect(6, 19 + by, 6, 1, top.accent); set(9, 22 + by, top.accent); }
    if (o.neck?.kind === 'chain') { set(10, 14 + by, o.neck.c); set(11, 15 + by, o.neck.c); }
    if (o.neck?.kind === 'tie') { rect(11, 14 + by, 1, 3, o.neck.c); }
    if (o.neck?.kind === 'bow') { set(11, 13 + by, o.neck.c); }
    const arm = -legF;
    rect(8 + arm, 13 + by, 2, longSleeve ? 5 : 2, shirtC); set(9 + arm, 13 + by, shirtD);
    if (!longSleeve) rect(8 + arm, 15 + by, 2, 3, C.base);
    rect(8 + arm, 18 + by, 2, 1, C.light);
    // head
    const hy = by;
    rect(5, 0 + hy, 1, 1, C.dark); rect(5, 1 + hy, 2, 3, C.dark); // back ear
    rect(8, 0 + hy, 1, 1, C.base); rect(7, 1 + hy, 3, 1, C.base); rect(7, 2 + hy, 4, 2, C.base); set(8, 2 + hy, C.ear); set(9, 3 + hy, C.ear);
    rect(4, 3 + hy, 10, 1, C.base); rect(3, 4 + hy, 12, 7, C.base); rect(4, 11 + hy, 10, 1, C.base); rect(6, 12 + hy, 6, 1, C.base);
    rect(3, 5 + hy, 1, 6, C.dark);
    rect(14, 7 + hy, 3, 4, C.light); rect(10, 8 + hy, 4, 4, C.light); rect(8, 11 + hy, 6, 1, C.light);
    rect(16, 7 + hy, 1, 2, INK); set(15, 10 + hy, '#5a3a32'); set(14, 10 + hy, '#5a3a32');
    rect(12, 6 + hy, 1, 2, INK); set(13, 5 + hy, C.light);
    set(11, 9 + hy, '#f0a0a0');
    if (o.eyes) { rect(9, 6 + hy, 6, 1, o.eyes.frame); rect(11, 6 + hy, 3, 2, o.eyes.c); set(12, 6 + hy, '#5a6070'); }
    if (o.hat?.kind === 'cap') { rect(4, 1 + hy, 9, 1, o.hat.c); rect(4, 2 + hy, 10, 2, o.hat.c); rect(4, 2 + hy, 1, 2, o.hat.d); rect(13, 4 + hy, 4, 1, o.hat.d); }
    if (o.hat?.kind === 'tophat') { rect(6, 0 + hy, 7, 3, o.hat.c); rect(6, 2 + hy, 7, 1, o.hat.band); rect(4, 3 + hy, 11, 1, o.hat.d); }
  }
  return G.g;
}

function toCanvas(g, mirror) {
  const W = GW + PAD * 2, H = GH + PAD * 2;
  const cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(W, H) : Object.assign(document.createElement('canvas'), { width: W, height: H });
  const c = cv.getContext('2d');
  const at = (x, y) => (y >= 0 && y < GH && x >= 0 && x < GW ? g[y][mirror ? GW - 1 - x : x] : null);
  for (let y = -1; y <= GH; y++) for (let x = -1; x <= GW; x++) {
    const col = at(x, y);
    if (col) { c.fillStyle = col; c.fillRect(x + PAD, y + PAD, 1, 1); }
    else if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) { c.fillStyle = INK; c.fillRect(x + PAD, y + PAD, 1, 1); }
  }
  return cv;
}

export function shibaSprite(coat, face = 'down', frame = 0, equipped = {}) {
  const mirror = face === 'left', f = face === 'left' || face === 'right' ? 'side' : face;
  const key = `${coat}|${face}|${frame}|${JSON.stringify(equipped || {})}`;
  let cv = cache.get(key);
  if (!cv) { cv = toCanvas(paint(coat, f, frame, equipped), mirror); cache.set(key, cv); if (cache.size > 600) cache.delete(cache.keys().next().value); }
  return cv;
}

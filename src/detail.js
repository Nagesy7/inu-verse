// Detail pass for cosmetics: form shading + rim light, fur strands, eye glints and per-item fabric/material patterns.
// All procedural, palette-preserving (mixes toward each pixel's own lighter/darker tone), run once per sprite and cached.
const mk = (w, h) => (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h }));
const hash = (x, y, s = 0) => { let n = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const lum = (r, g, b) => 0.3 * r + 0.59 * g + 0.11 * b;
// Pixel-level pass on a canvas (in place). r = rim/shadow reach in px. fur = strand strength (0 = none).
export function shadeSprite(cv, { r = 2, light = 0.28, dark = 0.3, fur = 0, glint = false, grad = 0.12, seed = 1, skipInk = 40 } = {}) {
  const w = cv.width, h = cv.height, c = cv.getContext('2d'), im = c.getImageData(0, 0, w, h), d = im.data, src = new Uint8ClampedArray(d);
  const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src[(y * w + x) * 4 + 3]);
  const L = (x, y) => { const i = (y * w + x) * 4; return lum(src[i], src[i + 1], src[i + 2]); };
  let y0 = h, y1 = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (A(x, y) > 128) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const span = Math.max(1, y1 - y0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; if (src[i + 3] < 128) continue; const l = L(x, y); if (l < skipInk) continue; // keep outlines/ink crisp
    let k = 0; // + lighten, - darken
    for (let s = 1; s <= r; s++) { if (A(x - s, y - s) < 128 || A(x, y - s) < 128) { k += light / s; break; } }
    for (let s = 1; s <= r; s++) { if (A(x + s, y + s) < 128 || A(x + s, y) < 128) { k -= dark / s; break; } }
    k += grad * (0.5 - (y - y0) / span) * 2; // top-lit form gradient
    if (fur) { const hh = hash(x >> 0, y, seed), stroke = hash((x - y) >> 1, (x + y) >> 2, seed + 7); if (stroke > 0.82) k -= fur; else if (stroke < 0.1) k += fur * 0.7; if (hh > 0.97) k += fur; }
    const t = k > 0 ? 255 : 0, a = Math.min(0.6, Math.abs(k)); for (let j = 0; j < 3; j++) d[i + j] = src[i + j] + (t - src[i + j]) * a;
  }
  if (glint) for (let y = 6; y < h - 6; y++) for (let x = 6; x < w - 6; x++) { // eye glints: dark pixel enclosed by colour
    if (L(x, y) > skipInk || A(x, y) < 128) continue; if (![[-6, 0], [6, 0], [0, -6], [0, 6], [-2, 0], [2, 0], [0, -2], [0, 2]].every(([a, b]) => A(x + a, y + b) > 128)) continue;
    if (L(x - 1, y) <= skipInk && L(x, y - 1) <= skipInk && L(x + 1, y) <= skipInk && L(x, y + 1) <= skipInk && L(x - 1, y - 1) > skipInk) { const i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = 255; }
  }
  c.putImageData(im, 0, 0); return cv;
}
// Material patterns per outfit item (drawn source-atop on that layer only). b = layer bbox [x, y, w, h], u = px unit.
const P = {
  pin: (c, [x, y, w, h], col, step = 5) => { c.fillStyle = col; for (let i = x + 2; i < x + w; i += step) c.fillRect(i, y, 1, h); },
  rows: (c, [x, y, w, h], col, step = 3) => { c.fillStyle = col; for (let j = y + 1; j < y + h; j += step) c.fillRect(x, j, w, 1); },
  twill: (c, [x, y, w, h], col, step = 4) => { c.fillStyle = col; for (let j = y; j < y + h; j++) for (let i = x + ((j * 1) % step); i < x + w; i += step) c.fillRect(i, j, 1, 1); },
  folds: (c, [x, y, w, h], n = 3) => { c.strokeStyle = 'rgba(0,0,0,.28)'; c.lineWidth = 1.5; for (let k = 0; k < n; k++) { const fy = y + h * (0.3 + 0.22 * k); c.beginPath(); c.moveTo(x + w * 0.15, fy); c.quadraticCurveTo(x + w * 0.5, fy + 5, x + w * 0.85, fy - 1); c.stroke(); } c.strokeStyle = 'rgba(255,255,255,.18)'; for (let k = 0; k < n; k++) { const fy = y + h * (0.3 + 0.22 * k) - 2; c.beginPath(); c.moveTo(x + w * 0.2, fy); c.quadraticCurveTo(x + w * 0.5, fy + 4, x + w * 0.8, fy - 1); c.stroke(); } },
  sheen: (c, [x, y, w, h], a0 = 0.35) => { const a = a0 * 0.45; const g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0.15, 'rgba(255,255,255,0)'); g.addColorStop(0.32, `rgba(255,255,255,${a})`); g.addColorStop(0.42, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(x, y, w, h); },
  dots: (c, [x, y, w, h], cols, n, r = 1.5, seed = 3) => { for (let k = 0; k < n; k++) { c.fillStyle = cols[k % cols.length]; const px = x + hash(k, 1, seed) * w, py = y + hash(k, 2, seed) * h; c.fillRect(Math.round(px), Math.round(py), r, r); } },
  flowers: (c, b, seed = 5) => { const [x, y, w, h] = b; for (let k = 0; k < Math.max(4, (w * h) / 260); k++) { const px = Math.round(x + hash(k, 1, seed) * w), py = Math.round(y + hash(k, 2, seed) * h), col = ['#ff6fa0', '#ffe066', '#ffffff', '#ff9a3a'][k % 4];
    c.fillStyle = col; c.fillRect(px - 2, py, 5, 1); c.fillRect(px, py - 2, 1, 5); c.fillRect(px - 1, py - 1, 3, 3); c.fillStyle = '#7a2a1a'; c.fillRect(px, py, 1, 1); c.fillStyle = '#2f8a4a'; c.fillRect(px + 2, py + 2, 2, 1); } },
  stitch: (c, [x, y, w, h], col) => { c.fillStyle = col; for (let j = y + 2; j < y + h; j += 4) { c.fillRect(x + 3, j, 1, 2); c.fillRect(x + w - 4, j, 1, 2); } },
  glint: (c, [x, y, w, h]) => { c.fillStyle = 'rgba(255,255,255,.75)'; for (let k = 0; k < 3; k++) c.fillRect(Math.round(x + w * (0.18 + k * 0.08)), Math.round(y + h * 0.15), 1, Math.max(2, Math.round(h * 0.55))); },
  sparkle: (c, b, n, seed = 9) => { const [x, y, w, h] = b; for (let k = 0; k < n; k++) { const px = Math.round(x + hash(k, 1, seed) * w), py = Math.round(y + hash(k, 2, seed) * h); c.fillStyle = '#fffbe0'; c.fillRect(px, py, 1, 1); c.fillStyle = 'rgba(255,251,224,.55)'; c.fillRect(px - 1, py, 3, 1); c.fillRect(px, py - 1, 1, 3); } },
};
export const PATTERNS = {
  suit_navy: (c, b) => { P.pin(c, b, 'rgba(210,220,255,.22)'); P.folds(c, b, 2); P.sheen(c, b, 0.18); },
  gold_suit: (c, b) => { P.twill(c, b, 'rgba(255,250,200,.35)', 3); P.folds(c, b, 2); P.sheen(c, b, 0.4); P.sparkle(c, b, 10); },
  tux_black: (c, b) => { P.sheen(c, b, 0.32); P.folds(c, b, 2); P.pin(c, b, 'rgba(255,255,255,.06)', 3); },
  jacket_black: (c, b) => { P.sheen(c, b, 0.4); P.folds(c, b, 3); P.stitch(c, b, 'rgba(200,200,210,.45)'); },
  hoodie_maroon: (c, b) => { P.rows(c, b, 'rgba(0,0,0,.16)', 3); P.folds(c, b, 3); P.dots(c, b, ['rgba(255,255,255,.12)'], 60, 1, 4); },
  hawaiian: (c, b) => { P.flowers(c, b); P.folds(c, b, 2); },
  gown_white: (c, b) => { P.folds(c, b, 4); P.sheen(c, b, 0.3); P.sparkle(c, b, 14); },
  velvet_gown: (c, b) => { P.folds(c, b, 4); P.dots(c, b, ['rgba(0,0,0,.18)', 'rgba(255,255,255,.1)'], 160, 1, 6); P.sparkle(c, b, 12); },
  slacks_navy: (c, b) => { P.pin(c, b, 'rgba(210,220,255,.2)'); P.folds(c, b, 2); },
  slacks_black: (c, b) => { P.sheen(c, b, 0.2); P.folds(c, b, 2); },
  jeans_ripped: (c, b) => { P.twill(c, b, 'rgba(180,200,255,.28)', 3); P.stitch(c, b, '#d9a441'); P.folds(c, b, 2); },
  chinos: (c, b) => { P.twill(c, b, 'rgba(0,0,0,.12)', 4); P.folds(c, b, 2); },
  sneakers_red: (c, b) => { P.rows(c, b, 'rgba(255,255,255,.55)', 4); P.sheen(c, b, 0.4); },
  sneakers_gold: (c, b) => { P.sheen(c, b, 0.55); P.sparkle(c, b, 4); },
  loafers: (c, b) => P.sheen(c, b, 0.6),
  cap_red: (c, b) => { P.pin(c, b, 'rgba(0,0,0,.22)', 7); P.sheen(c, b, 0.3); },
  top_hat: (c, b) => P.sheen(c, b, 0.45), pres_cap: (c, b) => { P.pin(c, b, 'rgba(0,0,0,.2)', 7); P.sheen(c, b, 0.3); },
  crown: (c, b) => { P.sheen(c, b, 0.6); P.sparkle(c, b, 6); },
  shades: (c, b) => P.glint(c, b), gold_shades: (c, b) => P.glint(c, b), plat_shades: (c, b) => P.glint(c, b),
  chain_gold: (c, b) => P.sparkle(c, b, 4), diamond_chain: (c, b) => P.sparkle(c, b, 8), pres_pin: (c, b) => P.sparkle(c, b, 2),
  tie_red: (c, b) => { c.fillStyle = 'rgba(255,255,255,.3)'; for (let j = b[1]; j < b[1] + b[3]; j += 4) for (let i = 0; i < b[2]; i++) c.fillRect(b[0] + i, j + i, 1, 1); },
  bowtie: (c, b) => P.sheen(c, b, 0.4), pres_scarf: (c, b) => { P.rows(c, b, 'rgba(255,255,255,.2)', 3); P.folds(c, b, 2); },
};
export function patternLayer(c, id, b) { const f = PATTERNS[id]; if (!f) return; c.save(); c.globalCompositeOperation = 'source-atop'; f(c, b); c.restore(); }
export { mk as mkCanvas };

// Detail pass for cosmetics: form shading + rim light, fur strands, eye glints and per-item fabric/material patterns.
// All procedural, palette-preserving (mixes toward each pixel's own lighter/darker tone), run once per sprite and cached.
const mk = (w, h) => (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h }));
const hash = (x, y, s = 0) => { let n = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const lum = (r, g, b) => 0.3 * r + 0.59 * g + 0.11 * b;
// Pixel-level pass on a canvas (in place). r = rim/shadow reach in px. fur = strand strength (0 = none).
export function shadeSprite(cv, { r = 2, light = 0.28, dark = 0.3, fur = 0, glint = false, grad = 0.12, seed = 1, skipInk = 40, bands = null } = {}) {
  const w = cv.width, h = cv.height, c = cv.getContext('2d'), im = c.getImageData(0, 0, w, h), d = im.data, src = new Uint8ClampedArray(d);
  const AL = new Uint8Array(w * h); for (let p = 0; p < w * h; p++) AL[p] = src[p * 4 + 3]; const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : AL[y * w + x]);
  const L = (x, y) => { const i = (y * w + x) * 4; return lum(src[i], src[i + 1], src[i + 2]); };
  let y0 = h, y1 = 0; for (let p = 0; p < w * h; p++) if (AL[p] > 128) { const y = (p / w) | 0; if (y < y0) y0 = y; y1 = y; }
  const span = Math.max(1, y1 - y0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; if (src[i + 3] < 128) continue; const l = L(x, y); if (l < skipInk) continue; // keep outlines/ink crisp
    let k = 0; // + lighten, - darken
    for (let s = 1; s <= r; s++) { if (A(x - s, y - s) < 128 || A(x, y - s) < 128) { k += light / s; break; } }
    for (let s = 1; s <= r; s++) { if (A(x + s, y + s) < 128 || A(x + s, y) < 128) { k -= dark / s; break; } }
    k += grad * (0.5 - (y - y0) / span) * 2; // top-lit form gradient
    if (fur) { const hh = hash(x >> 0, y, seed), stroke = hash((x - y) >> 1, (x + y) >> 2, seed + 7); if (stroke > 0.82) k -= fur; else if (stroke < 0.1) k += fur * 0.7; if (hh > 0.97) k += fur; }
    if (bands) k = k > 0.07 ? bands[0] : k < -0.07 ? -bands[1] : 0; // clean light / mid / shadow bands
    const t = k > 0 ? 255 : 0, a = Math.min(0.6, Math.abs(k)); for (let j = 0; j < 3; j++) d[i + j] = src[i + j] + (t - src[i + j]) * a;
  }
  if (glint) for (let y = 6; y < h - 6; y++) for (let x = 6; x < w - 6; x++) { // eye glints: dark pixel enclosed by colour
    if (L(x, y) > skipInk || A(x, y) < 128) continue; if (![[-6, 0], [6, 0], [0, -6], [0, 6], [-2, 0], [2, 0], [0, -2], [0, 2]].every(([a, b]) => A(x + a, y + b) > 128)) continue;
    if (L(x - 1, y) <= skipInk && L(x, y - 1) <= skipInk && L(x + 1, y) <= skipInk && L(x, y + 1) <= skipInk && L(x - 1, y - 1) > skipInk) { const i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = 255; }
  }
  if (glint === 'small') for (let y = 1; y < h - 2; y++) for (let x = 1; x < w - 2; x++) { // 2x2-ish pet eyes: light the top-left pixel
    if (A(x, y) < 128 || L(x, y) > skipInk) continue; const lit = (a, b) => A(a, b) > 128 && L(a, b) > skipInk + 30;
    if (lit(x - 1, y) && lit(x, y - 1) && !lit(x + 1, y) && !lit(x, y + 1) && A(x + 1, y) > 128 && A(x, y + 1) > 128 && lit(x + 2, y) && lit(x, y + 2)) { const i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = 255; }
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
// Creases only where cloth naturally folds (fractions of the layer bbox; view-aware). Two-tone: shadow line + light lip.
const crease = (c, pts, w = 1.5) => { c.lineCap = 'round'; for (const [col, dy] of [['rgba(0,0,0,.32)', 0], ['rgba(255,255,255,.16)', -1.2]]) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(pts[0][0], pts[0][1] + dy); c.quadraticCurveTo(pts[1][0], pts[1][1] + dy, pts[2][0], pts[2][1] + dy); c.stroke(); } };
const at = ([x, y, w, h], fx, fy) => [x + w * fx, y + h * fy];
const C = {
  top: (c, b, v, jacket) => { const arms = v === 'side' ? [0.5] : [0.13, 0.87];
    for (const ax of arms) { const s = ax < 0.5 ? 1 : -1; crease(c, [at(b, ax - 0.04 * s, 0.5), at(b, ax + 0.03 * s, 0.56), at(b, ax + 0.06 * s, 0.52)]); crease(c, [at(b, ax - 0.03 * s, 0.6), at(b, ax + 0.02 * s, 0.64), at(b, ax + 0.05 * s, 0.6)], 1); } // elbow + inner arm
    if (v !== 'side') for (const s of [1, -1]) crease(c, [at(b, 0.5 - 0.27 * s, 0.1), at(b, 0.5 - 0.2 * s, 0.24), at(b, 0.5 - 0.1 * s, 0.32)]); // shoulder-to-chest drape
    if (jacket && v === 'front') { const [bx, by] = at(b, 0.5, 0.66); for (const [dx, dy] of [[-0.12, -0.05], [0.12, -0.05], [-0.1, 0.06], [0.1, 0.06]]) crease(c, [[bx, by], at(b, 0.5 + dx * 0.5, 0.66 + dy * 0.5), at(b, 0.5 + dx, 0.66 + dy)], 1.2); } // button pull
    crease(c, [at(b, 0.3, 0.86), at(b, 0.5, 0.89), at(b, 0.7, 0.86)], 1.2); }, // waist
  bottom: (c, b, v) => { for (const lx of v === 'side' ? [0.5] : [0.3, 0.7]) { crease(c, [at(b, lx - 0.1, 0.48), at(b, lx, v === 'back' ? 0.44 : 0.52), at(b, lx + 0.1, 0.48)]); crease(c, [at(b, lx - 0.12, 0.9), at(b, lx - 0.03, 0.95), at(b, lx + 0.05, 0.9)], 1.2); crease(c, [at(b, lx + 0.02, 0.92), at(b, lx + 0.08, 0.96), at(b, lx + 0.13, 0.91)], 1.2); } }, // knees + trouser breaks
  gown: (c, b) => { for (const fx of [0.3, 0.42, 0.58, 0.7]) crease(c, [at(b, 0.5 + (fx - 0.5) * 0.4, 0.42), at(b, fx, 0.7), at(b, 0.5 + (fx - 0.5) * 1.5, 0.98)], 1.4); }, // folds fall from the waist
};
export const PATTERNS = {
  suit_navy: (c, b, v) => { P.pin(c, b, 'rgba(210,220,255,.18)'); C.top(c, b, v, true); },
  gold_suit: (c, b, v) => { P.sheen(c, b, 0.4); C.top(c, b, v, true); },
  tux_black: (c, b, v) => { P.sheen(c, b, 0.32); C.top(c, b, v, true); },
  jacket_black: (c, b, v) => { P.sheen(c, b, 0.4); P.stitch(c, b, 'rgba(200,200,210,.4)'); C.top(c, b, v, true); },
  hoodie_maroon: (c, b, v) => { P.rows(c, b, 'rgba(0,0,0,.1)', 3); C.top(c, b, v); },
  hawaiian: (c, b, v) => { P.flowers(c, b); C.top(c, b, v); },
  gown_white: (c, b) => { P.sheen(c, b, 0.3); C.gown(c, b); },
  velvet_gown: (c, b) => { P.sheen(c, b, 0.3); C.gown(c, b); },
  slacks_navy: (c, b, v) => { P.pin(c, b, 'rgba(210,220,255,.16)'); C.bottom(c, b, v); },
  slacks_black: (c, b, v) => { P.sheen(c, b, 0.2); C.bottom(c, b, v); },
  jeans_ripped: (c, b, v) => { P.twill(c, b, 'rgba(180,200,255,.16)', 3); P.stitch(c, b, '#d9a441'); C.bottom(c, b, v); },
  chinos: (c, b, v) => C.bottom(c, b, v),
  sneakers_red: (c, b) => { P.rows(c, b, 'rgba(255,255,255,.5)', 4); P.sheen(c, b, 0.4); },
  sneakers_gold: (c, b) => P.sheen(c, b, 0.55), loafers: (c, b) => P.sheen(c, b, 0.6),
  cap_red: (c, b) => { P.pin(c, b, 'rgba(0,0,0,.2)', 7); P.sheen(c, b, 0.3); }, pres_cap: (c, b) => { P.pin(c, b, 'rgba(0,0,0,.2)', 7); P.sheen(c, b, 0.3); },
  top_hat: (c, b) => P.sheen(c, b, 0.45), crown: (c, b) => { P.sheen(c, b, 0.6); P.sparkle(c, b, 3); },
  shades: (c, b) => P.glint(c, b), gold_shades: (c, b) => P.glint(c, b), plat_shades: (c, b) => P.glint(c, b),
  chain_gold: (c, b) => P.sparkle(c, b, 2), diamond_chain: (c, b) => P.sparkle(c, b, 4), pres_pin: (c, b) => P.sparkle(c, b, 1),
  tie_red: (c, b) => { c.fillStyle = 'rgba(255,255,255,.3)'; for (let j = b[1]; j < b[1] + b[3]; j += 4) for (let i = 0; i < b[2]; i++) c.fillRect(b[0] + i, j + i, 1, 1); },
  bowtie: (c, b) => P.sheen(c, b, 0.4), pres_scarf: (c, b) => P.rows(c, b, 'rgba(255,255,255,.18)', 3),
};
export function patternLayer(c, id, b, view = 'front') { const f = PATTERNS[id]; if (!f) return; c.save(); c.globalCompositeOperation = 'source-atop'; f(c, b, view); c.restore(); }
// Silhouette softening: chop convex corner pixels (passes ~ radius) so shoulders, head, hips and paws read round.
export function roundCorners(cv, passes = 2) { const w = cv.width, h = cv.height, c = cv.getContext('2d'), im = c.getImageData(0, 0, w, h), d = im.data;
  for (let p = 0; p < passes; p++) { const a = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) a[i] = d[i * 4 + 3] > 128 ? 1 : 0; const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : a[y * w + x]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (!A(x, y)) continue; const u = A(x, y - 1), dn = A(x, y + 1), l = A(x - 1, y), r = A(x + 1, y);
      if ((!u && !l && !A(x - 1, y - 1)) || (!u && !r && !A(x + 1, y - 1)) || (!dn && !l && !A(x - 1, y + 1)) || (!dn && !r && !A(x + 1, y + 1))) d[(y * w + x) * 4 + 3] = 0; } }
  c.putImageData(im, 0, 0); return cv; }
// Neck: find the chin/shoulder pinch (narrowest base row in the upper body), push everything below down by n px and
// fill the gap with a shaded fur neck + outline. Returns { cv, at, n } so callers can move the feet line.
export function addNeck(src, base, n = 5, ink = '#1a1420') { const w = src.width, h = src.height, bc = base.getContext('2d').getImageData(0, 0, w, h).data;
  let top = h, bot = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (bc[(y * w + x) * 4 + 3] > 128) { top = Math.min(top, y); bot = Math.max(bot, y); }
  const span = bot - top, rowW = (y) => { let l = -1, r = -1; for (let x = 0; x < w; x++) if (bc[(y * w + x) * 4 + 3] > 128) { if (l < 0) l = x; r = x; } return [l, r]; };
  let S = top + Math.round(span * 0.3), best = 1e9; for (let y = top + Math.round(span * 0.28); y < top + span * 0.5; y++) { const [l, r] = rowW(y); if (l >= 0 && r - l < best) { best = r - l; S = y; } }
  for (let y = S; y < top + span * 0.6; y++) { const [l, r] = rowW(y); if (r - l > best * 1.12) { S = y; break; } } // first shoulder row below the chin pinch
  // the chin hangs over the collar: find its bottom on the centre column (dark chin line), head = rows above S + chin ellipse
  const [hl, hr] = rowW(S - 2), cx = (hl + hr) / 2, L = (x, y) => { const k = (y * w + Math.round(x)) * 4; return bc[k + 3] > 128 ? 0.3 * bc[k] + 0.59 * bc[k + 1] + 0.11 * bc[k + 2] : 255; };
  let Yc = S + 6; for (let y = S; y < S + 24 && y < h; y++) if (L(cx, y) < 80) { Yc = y + 1; break; }
  const hw = (hr - hl) * 0.36, headPath = (c) => { c.beginPath(); c.rect(0, 0, w, S); c.ellipse(cx, S, hw, Math.max(2, Yc - S + 1), 0, 0, Math.PI); };
  const out = mk(w, h + n), c = out.getContext('2d');
  const b3 = [0, 0, 0]; let nb = 0; for (let y = S - 18; y < S - 6; y++) for (let x = Math.round(hl + 3); x < hl + 12; x++) { const k = (y * w + x) * 4; const l = 0.3 * bc[k] + 0.59 * bc[k + 1] + 0.11 * bc[k + 2]; if (bc[k + 3] > 128 && l > 50 && l < 215) { b3[0] += bc[k]; b3[1] += bc[k + 1]; b3[2] += bc[k + 2]; nb++; } } for (let q = 0; q < 3; q++) b3[q] = nb ? b3[q] / nb : 150;
  const sh = (f) => `rgb(${b3.map((v) => Math.round(v * f)).join(',')})`, nw = Math.max(6, Math.round(hw * 2) + 2), x0 = Math.round(cx - nw / 2);
  if (ink) { c.fillStyle = ink; c.fillRect(x0 - 2, S - 6, nw + 4, Yc - S + n + 10); } else { c.fillStyle = sh(0.74); c.fillRect(x0 - 2, S - 6, nw + 4, Yc - S + n + 10); } // no dark outline where neck meets collar/fur c.fillStyle = sh(0.84); c.fillRect(x0, S - 6, nw, Yc - S + n + 10); c.fillStyle = sh(0.66); c.fillRect(x0, Yc - 2, nw, 4); // neck (behind body + head), shadow under the chin
  const body = mk(w, h), bx = body.getContext('2d'); bx.drawImage(src, 0, 0); bx.globalCompositeOperation = 'destination-out'; headPath(bx); bx.fill();
  for (let k = 0; k < n + 3; k++) c.drawImage(body, 0, S + 3, w, 1, 0, S + k, w, 1); // stretch from inside the shoulders (not the outline row) // shoulders rise to meet the head (no gap)
  c.drawImage(body, 0, n); // body moved down n: collar now overlaps the neck base
  c.save(); headPath(c); c.clip(); c.drawImage(src, 0, 0); c.restore(); // head + chin on top
  return { cv: out, at: S, n, rect: [x0, S - 6, nw, Yc - S + n + 10] }; }
export { mk as mkCanvas };

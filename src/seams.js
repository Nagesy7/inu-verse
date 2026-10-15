// Layer-conforming helpers + detectors for the layered Shiba art (pure functions on RGBA arrays; no DOM).
const lumAt = (d, i) => 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
// Exterior = transparent pixels reachable from the canvas border. Returns Uint8Array (1 = exterior).
export function exterior(d, w, h, thr = 128) { const ext = new Uint8Array(w * h), q = [];
  const push = (p) => { if (!ext[p] && d[p * 4 + 3] < thr) { ext[p] = 1; q.push(p); } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); } for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (q.length) { const p = q.pop(), x = p % w, y = (p / w) | 0; if (x > 0) push(p - 1); if (x < w - 1) push(p + 1); if (y > 0) push(p - w); if (y < h - 1) push(p + w); }
  return ext; }
// Holes: transparent (alpha < thr) pixels not reachable from outside = background showing through the character.
export function findHoles(d, w, h, thr = 128) { const ext = exterior(d, w, h, thr); let n = 0; for (let p = 0; p < w * h; p++) if (d[p * 4 + 3] < thr && !ext[p]) n++; return n; }
// Interior alpha dips: semi-transparent pixels with no exterior pixel in their 8-neighbourhood.
export function findAlphaDips(d, w, h) { const ext = exterior(d, w, h, 1); let n = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const p = y * w + x, a = d[p * 4 + 3]; if (a === 0 || a >= 250) continue; let edge = false; for (let j = -1; j <= 1 && !edge; j++) for (let i = -1; i <= 1; i++) if (ext[p + j * w + i]) { edge = true; break; } if (!edge) n++; }
  return n; }
// Dark seam lines: on a layer-boundary mask, pixels much darker than the pixels 2px either side across the boundary.
export function findDarkSeams(d, w, h, mask, list = null) { let n = 0;
  for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) { const p = y * w + x; if (!mask[p] || d[p * 4 + 3] < 128) continue; const l = lumAt(d, p * 4);
    for (const [a, b] of [[-2, 2], [-2 * w, 2 * w]]) { const i = (p + a) * 4, j = (p + b) * 4; if (d[i + 3] < 128 || d[j + 3] < 128) continue; const m = Math.min(lumAt(d, i), lumAt(d, j)); if (l < 70 && m - l > 45) { n++; if (list) list.push(p); break; } } }
  return n; }
// Boundary of an item layer against already-opaque pixels below (where two layers meet inside the body). bb = [x, y, w, h].
export function layerBoundary(item, under, w, h, mask = new Uint8Array(w * h), bb = [0, 0, w, h]) { const O = [-1, 1, -w, w];
  const x0 = Math.max(1, bb[0] - 1), y0 = Math.max(1, bb[1] - 1), x1 = Math.min(w - 1, bb[0] + bb[2] + 1), y1 = Math.min(h - 1, bb[1] + bb[3] + 1);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const p = y * w + x; if (item[p * 4 + 3] < 128) continue;
    for (let k = 0; k < 4; k++) { const o = O[k], q = p + o; if (item[q * 4 + 3] < 128 && under[q * 4 + 3] >= 128) { mask[p] = 1; mask[q] = 1; const r = q + o; if (r >= 0 && r < w * h) mask[r] = 1; } } }
  return mask; }
// Conform an item layer onto the composite: kill dark outline pixels where the item meets body/cloth (not the outside),
// and spread the item 1-2px over thin dark seam lines just outside its edge. Mutates comp (the composite after drawing).
export function conformLayer(comp, item, under, w, h, bb = [0, 0, w, h]) { const ext = exterior(under, w, h, 128), O = [-1, 1, -w, w], N = w * h;
  const L = (d, i) => 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
  const x0 = Math.max(2, bb[0] - 3), y0 = Math.max(2, bb[1] - 3), x1 = Math.min(w - 2, bb[0] + bb[2] + 3), y1 = Math.min(h - 2, bb[1] + bb[3] + 3);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const p = y * w + x; if (item[p * 4 + 3] < 128) continue;
    for (let k = 0; k < 4; k++) { const o = O[k], q = p + o; if (item[q * 4 + 3] >= 128 || ext[q]) continue; // p inside item, q outside (inside the body)
      let src = -1; for (let s = 2; s <= 7; s++) { const z = p - o * s; if (z >= 0 && z < N && item[z * 4 + 3] >= 200 && L(item, z * 4) >= 70) { src = z; break; } } if (src < 0) continue;
      const j = src * 4; const put = (r) => { const i = r * 4; comp[i] = item[j]; comp[i + 1] = item[j + 1]; comp[i + 2] = item[j + 2]; comp[i + 3] = 255; };
      for (let s = 0; s < 4; s++) { const z = p - o * s; if (z === src) break; if (L(comp, z * 4) < 70 || comp[z * 4 + 3] < 250) put(z); else if (s) break; } // item's own dark/soft rim (up to 3px) over the body
      for (let s = 1; s <= 2; s++) { const r = p + o * s; if (r < 0 || r >= N || ext[r]) break; if (comp[r * 4 + 3] < 250 || L(comp, r * 4) < 70) put(r); else break; } } } // seam line beside it
}
// Fill holes + solidify interior alpha (grow colour in from opaque neighbours). Mutates d.
export function sealInterior(d, w, h) { const ext = exterior(d, w, h, 128); let todo = [];
  for (let p = 0; p < w * h; p++) if (!ext[p] && d[p * 4 + 3] < 255) { const nearExt = [-1, 1, -w, w].some((o) => ext[p + o]); if (d[p * 4 + 3] >= 128 && nearExt) continue; todo.push(p); }
  for (let guard = 0; todo.length && guard < 40; guard++) { const next = [];
    for (const p of todo) { const i = p * 4; if (d[i + 3] >= 128 && d[i + 3] < 255) { d[i + 3] = 255; continue; }
      const o = [-1, 1, -w, w].find((o) => d[(p + o) * 4 + 3] === 255); if (o === undefined) { next.push(p); continue; } const j = (p + o) * 4; d[i] = d[j]; d[i + 1] = d[j + 1]; d[i + 2] = d[j + 2]; d[i + 3] = 255; }
    if (next.length === todo.length) break; todo = next; } }
// Remove dark seam lines on the layer-boundary mask: recolour each from the lighter pixel 2px away across the line.
export function eraseSeams(d, w, h, mask, passes = 6) { const L = (i) => 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
  for (let k = 0; k < passes; k++) { let fixed = 0;
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) { const p = y * w + x; if (!mask[p] || d[p * 4 + 3] < 128) continue; const l = L(p * 4);
      for (const [a, b] of [[-2, 2], [-2 * w, 2 * w]]) { const i = (p + a) * 4, j = (p + b) * 4; if (d[i + 3] < 128 || d[j + 3] < 128) continue; const li = L(i), lj = L(j);
        if (l < 70 && Math.min(li, lj) - l > 45) { const s = li >= lj ? i : j, o = p * 4; d[o] = d[s]; d[o + 1] = d[s + 1]; d[o + 2] = d[s + 2]; d[o + 3] = 255; fixed++; break; } } }
    if (!fixed) break; } }
// Gaps = narrow slits/notches where background shows between parts that should meet (sleeve-hand, shirt-trousers,
// collar-neck): pixels filled by a morphological closing (radius r) of the opaque mask that are transparent now.
function morph(m, w, h, r, dil) { const t = new Uint8Array(w * h), o = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = dil ? 0 : 1; for (let k = -r; k <= r; k++) { const xx = x + k; const s = xx < 0 || xx >= w ? 0 : m[y * w + xx]; if (dil ? s : !s) { v = dil ? 1 : 0; break; } } t[y * w + x] = v; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = dil ? 0 : 1; for (let k = -r; k <= r; k++) { const yy = y + k; const s = yy < 0 || yy >= h ? 0 : t[yy * w + x]; if (dil ? s : !s) { v = dil ? 1 : 0; break; } } o[y * w + x] = v; }
  return o; }
export function gapMask(d, w, h, r = 2) { const m = new Uint8Array(w * h); for (let p = 0; p < w * h; p++) m[p] = d[p * 4 + 3] >= 128 ? 1 : 0;
  const c = morph(morph(m, w, h, r, true), w, h, r, false); for (let p = 0; p < w * h; p++) c[p] = c[p] && !m[p] ? 1 : 0; return c; }
export function findGaps(d, w, h, r = 2) { const g = gapMask(d, w, h, r); let n = 0; for (let p = 0; p < w * h; p++) n += g[p]; return n; }
export function closeGaps(d, w, h, r = 2) { const g = gapMask(d, w, h, r); let todo = []; for (let p = 0; p < w * h; p++) if (g[p]) todo.push(p);
  for (let guard = 0; todo.length && guard < 2 * r + 2; guard++) { const next = [];
    for (const p of todo) { const i = p * 4, o = [-1, 1, -w, w].find((o) => p + o >= 0 && p + o < w * h && d[(p + o) * 4 + 3] === 255); if (o === undefined) { next.push(p); continue; } const j = (p + o) * 4; d[i] = d[j]; d[i + 1] = d[j + 1]; d[i + 2] = d[j + 2]; d[i + 3] = 255; }
    todo = next; } }

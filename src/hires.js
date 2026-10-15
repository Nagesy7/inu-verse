// Hi-res sprite pass: Scale2x (EPX) upsample of a native pixel sprite. Doubles the pixel density with the exact
// same palette (no new colours, no blur): staircase edges become smooth diagonals/curves, outlines stay 1 native px.
// Used for pets, cars, the shared Shiba and the procedural Shiba fallback. Results are cached by the callers.
const mk = (w, h) => (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h }));
export function scale2xData(src, w, h) { // src: Uint32Array w*h -> Uint32Array (2w)*(2h)
  const out = new Uint32Array(w * h * 4), W = w * 2, at = (x, y) => src[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const P = src[y * w + x], A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
    let e0 = P, e1 = P, e2 = P, e3 = P;
    if (A !== D && C !== B) { if (C === A) e0 = A; if (A === B) e1 = B; if (D === C) e2 = C; if (B === D) e3 = D; }
    const o = y * 2 * W + x * 2; out[o] = e0; out[o + 1] = e1; out[o + W] = e2; out[o + W + 1] = e3;
  }
  return out;
}
export function hires(cv, times = 1) {
  let w = cv.width, h = cv.height; if (!w || !h || globalThis.__noHires) return cv; // __noHires: proof-only before/after toggle
  const c0 = mk(w, h).getContext('2d'); c0.drawImage(cv, 0, 0); let px = new Uint32Array(c0.getImageData(0, 0, w, h).data.buffer.slice(0));
  for (let i = 0; i < times; i++) { px = scale2xData(px, w, h); w *= 2; h *= 2; }
  const out = mk(w, h), c = out.getContext('2d'), img = c.createImageData(w, h); img.data.set(new Uint8ClampedArray(px.buffer)); c.putImageData(img, 0, 0);
  out.k = 2 ** times; return out; // k = density multiplier vs the native sprite
}

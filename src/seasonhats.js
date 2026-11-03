// Procedural seasonal hats painted onto the layered Shiba canvas (no new atlas art needed). The anchor (crown of the
// head between the ears) is found from the sprite's own alpha, so every coat/view/frame lines up. Original pixel art.
export const HAT_KINDS = ['santa', 'antlers', 'witch', 'party', 'lucky', 'bunny', 'flowers', 'sunhat'];

/** crown anchor from an RGBA buffer: { cx, y, hw, top } in canvas px, or null. Head = widest opaque run in the top third
 * of the sprite; crown = first row (below the ear tips) where a run reaches ~55% of that width. */
export function headAnchor(d, W, H) {
  const op = (x, y) => d[(y * W + x) * 4 + 3] > 40, runOf = (y) => { let best = [0, -1], s = -1; for (let x = 0; x <= W; x++) { const o = x < W && op(x, y); if (o && s < 0) s = x; if (!o && s >= 0) { if (x - s > best[1] - best[0]) best = [s, x - 1]; s = -1; } } return best; };
  let top = 0; for (; top < H * 0.5; top++) { let any = false; for (let x = 0; x < W; x++) if (op(x, top)) { any = true; break; } if (any) break; }
  if (top >= H * 0.5) return null;
  let maxW = 0; for (let y = top; y < Math.min(H, top + H * 0.3); y++) { const r = runOf(y); maxW = Math.max(maxW, r[1] - r[0] + 1); }
  if (maxW < 6) return null;
  for (let y = top; y < Math.min(H, top + H * 0.3); y++) { const r = runOf(y); if (r[1] - r[0] + 1 >= maxW * 0.55) { const hw = Math.max(4, Math.round(maxW * 0.36)); return { cx: (r[0] + r[1]) / 2, y: y + Math.round(hw * 0.25), hw, top }; } }
  return null;
}
/** headroom a hat needs above the canvas (px) */
export const hatPad = (a) => Math.ceil(a.hw * 2.6);

/** paint `look.proc` hat onto ctx at anchor a. view: front|side|back */
export function paintHat(c, look, a, view = 'front') {
  const u = Math.max(2, Math.round(a.hw / 8)), R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
  const INK = '#1a1420', cx = a.cx, y = a.y + u, hw = a.hw, k = look.proc, side = view === 'side';
  const cone = (bw, h, col, dk, lean = 0, stripes = null) => { for (let j = 0; j < h; j += u) { const t = j / h, w = Math.max(u, bw * (1 - t)), x = cx - w / 2 + lean * t * t; R(x - u / 2, y - j - u, w + u, u + 1, INK); R(x, y - j - u, w, u, stripes && Math.floor(j / (u * 2)) % 2 ? stripes : col); R(x + w * 0.66, y - j - u, w * 0.34, u, stripes && Math.floor(j / (u * 2)) % 2 ? stripes : dk); } return { tx: cx + lean, ty: y - h - u }; };
  const ball = (x, y0, r, col) => { R(x - r - u / 2, y0 - r - u / 2, r * 2 + u, r * 2 + u, INK); R(x - r, y0 - r, r * 2, r * 2, col); R(x - r, y0 - r, r, u, '#ffffff'); };
  if (k === 'santa') { const tip = cone(hw * 1.6, hw * 1.5, look.c || '#d42a36', look.d || '#9a1a24', hw * (side ? -0.9 : 0.9)); ball(tip.tx, tip.ty + u, u * 1.2, '#f8f8f8'); R(cx - hw * 0.95, y - u * 1.5, hw * 1.9, u * 2.2, INK); R(cx - hw * 0.9, y - u * 1.3, hw * 1.8, u * 1.8, '#fbfbf4'); R(cx - hw * 0.9, y + u * 0.2, hw * 1.8, u * 0.4, '#d8d8d0'); }
  else if (k === 'witch') { R(cx - hw * 1.45, y - u, hw * 2.9, u * 1.6, INK); R(cx - hw * 1.4, y - u * 0.8, hw * 2.8, u * 1.1, look.c || '#3a2458'); const tip = cone(hw * 1.2, hw * 1.9, look.c || '#3a2458', look.d || '#22143a', hw * (side ? -0.7 : 0.7)); R(cx - hw * 0.58, y - u * 2.6, hw * 1.16, u * 1.2, look.band || '#ff8a1a'); R(cx - u * 0.6, y - u * 2.7, u * 1.2, u * 1.4, '#ffd23a'); void tip; }
  else if (k === 'party') { const tip = cone(hw * 1.1, hw * 1.7, look.c || '#e3b341', look.d || '#b08420', 0, look.band || '#2ab8c8'); ball(tip.tx, tip.ty + u * 0.6, u, '#ff4fa0'); R(cx - hw * 0.5, y, u * 0.6, u * 3, '#f4f0ff'); }
  else if (k === 'bunny') { R(cx - hw, y - u, hw * 2, u * 1.2, INK); R(cx - hw * 0.95, y - u * 0.9, hw * 1.9, u * 0.9, look.band || '#ff9ac8');
    for (const s of side ? [0.2] : [-0.45, 0.45]) { const ex = cx + hw * s, eh = hw * 1.9; R(ex - u * 1.6, y - eh - u, u * 3.2, eh, INK); R(ex - u * 1.1, y - eh - u * 0.6, u * 2.2, eh - u * 0.6, look.c || '#fbfbf4'); R(ex - u * 0.4, y - eh + u * 0.6, u * 0.8, eh - u * 2.4, look.d || '#ffb0d0'); } }
  else if (k === 'antlers') { R(cx - hw, y - u, hw * 2, u * 1.1, INK); R(cx - hw * 0.95, y - u * 0.9, hw * 1.9, u * 0.8, '#c8282e');
    for (const s of side ? [1] : [-1, 1]) { const bx = cx + s * hw * 0.5, col = look.c || '#8a5a2a'; R(bx - u * 0.8, y - hw * 1.3, u * 1.6, hw * 1.3, INK); R(bx - u * 0.4, y - hw * 1.25, u * 0.8, hw * 1.2, col);
      for (const [ty, len] of [[0.5, 0.6], [0.95, 0.5]]) { const yy = y - hw * ty * 1.3; R(s > 0 ? bx : bx - hw * len, yy - u * 0.8, hw * len, u * 1.6, INK); R(s > 0 ? bx : bx - hw * len + u * 0.4, yy - u * 0.4, hw * len - u * 0.4, u * 0.8, col); } }
    R(cx - u * 0.8, y - u * 3, u * 1.6, u * 1.6, '#3a9152'); }
  else if (k === 'lucky') { R(cx - hw, y - u, hw * 2, u * 1.2, INK); R(cx - hw * 0.95, y - u * 0.9, hw * 1.9, u * 0.9, '#c8202a'); const kx = side ? cx : cx + hw * 0.55, ky = y - u * 3.2;
    R(kx - u * 2.2, ky - u * 2.2, u * 4.4, u * 4.4, INK); R(kx - u * 1.8, ky - u * 1.8, u * 3.6, u * 3.6, '#d8202a'); R(kx - u * 0.6, ky - u * 1.8, u * 1.2, u * 3.6, '#f2cc68'); R(kx - u * 1.8, ky - u * 0.6, u * 3.6, u * 1.2, '#f2cc68'); R(kx - u * 0.3, ky + u * 2.2, u * 0.6, u * 3, '#f2cc68'); R(kx - u * 0.6, ky + u * 4.6, u * 1.2, u * 2, '#d8202a'); }
  else if (k === 'flowers') { const cols = look.cols || ['#ff8ab8', '#ffd84a', '#ffffff', '#c88aff', '#ff6a5a']; const n = side ? 4 : 6; R(cx - hw, y - u * 0.8, hw * 2, u, '#3f8a3a');
    for (let i = 0; i < n; i++) { const t = n === 1 ? 0.5 : i / (n - 1), fx = cx - hw * 0.95 + t * hw * 1.9, fy = y - u - Math.sin(Math.PI * t) * u * 1.2; R(fx - u * 1.2, fy - u * 1.2, u * 2.4, u * 2.4, INK); R(fx - u, fy - u * 0.5, u * 2, u, cols[i % cols.length]); R(fx - u * 0.5, fy - u, u, u * 2, cols[i % cols.length]); R(fx - u * 0.35, fy - u * 0.35, u * 0.7, u * 0.7, '#ffe14a'); } }
  else if (k === 'sunhat') { R(cx - hw * 1.6, y - u * 1.1, hw * 3.2, u * 1.8, INK); R(cx - hw * 1.55, y - u * 0.9, hw * 3.1, u * 1.3, look.c || '#e8c878'); R(cx - hw * 0.8, y - hw * 0.8, hw * 1.6, hw * 0.8, INK); R(cx - hw * 0.75, y - hw * 0.75, hw * 1.5, hw * 0.75 - u * 0.4, look.c || '#e8c878'); R(cx - hw * 0.75, y - u * 2.4, hw * 1.5, u * 1.2, look.band || '#2a9ad8'); R(cx - hw * 0.75, y - hw * 0.75, hw * 0.5, u, '#f8e8b0'); }
}

/** procedural hat as an overlay layer for a finished layered canvas: { cv, pad } where cv is W x (H+pad) and is drawn
 * `pad` source px above the sprite (the Shiba canvas has no headroom). null when no anchor. */
export function procHatLayer(cv, look, view) {
  try { if (!look?.proc || !cv?.getContext) return null; const W = cv.width, H = cv.height, a = headAnchor(cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data, W, H); if (!a) return null;
    const pad = hatPad(a), o = Object.assign(document.createElement('canvas'), { width: W, height: H + pad }); paintHat(o.getContext('2d'), look, { ...a, y: a.y + pad }, view); return { cv: o, pad }; } catch { return null; }
}

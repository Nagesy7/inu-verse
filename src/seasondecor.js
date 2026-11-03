// Seasonal building + plaza decorations (original pixel art). Painted into the cached building layer (src/bldgfx.js keys
// the cache by theme), with a tiny per-frame overlay for twinkling lights / flicker. Theme comes from src/seasons.js.
const INK = '#141022';
const PAL = {
  xmas: ['#e8323c', '#3ac85a', '#ffd84a', '#4ab8ff', '#ff8ad8'], newyear: ['#f2cc68', '#e8e8f4', '#ff6ad0', '#6ae0ff'],
  halloween: ['#ff8a1a', '#8a4ad8', '#3ad86a'], lunar: ['#d8202a', '#f2cc68'], easter: ['#ffb0d0', '#b0e0ff', '#fff0a0', '#c8f0b0', '#d8c0ff'],
  spring: ['#ff8ab8', '#ffffff', '#ffd84a', '#c88aff'], summer: ['#2a9ad8', '#ffd84a', '#ff6a5a', '#ffffff'], autumn: ['#d86a1a', '#e8a42a', '#a83a1a'], winter: ['#fff0c0', '#ffe08a'],
};
export const DECOR_THEMES = Object.keys(PAL);
/** where to hang the garland on a building: just under the footprint top, clamped to the facade */
export const eaveY = (b, g) => (EAVE[b.id] ? EAVE[b.id](g) : g.y + 8);
const EAVE = { h1: (g) => g.base - 80, h2: (g) => g.y + 32, h3: (g) => g.base - 82, h4: (g) => g.base - 98, mall: (g) => g.y + 92, lounge: (g) => g.y + 2 };
const swagPts = (x0, x1, y, sag, n) => Array.from({ length: n + 1 }, (_, i) => [Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y + Math.sin((Math.PI * i) / n) * sag)]);

/** static decorations; V = { night, low, theme }, h = { R, A, emit } from bldgfx */
export function decorate(c, b, g, V, h) {
  const th = V.theme, P = PAL[th]; if (!P || !g || !(g.w > 0)) return false;
  const { R, emit } = h, { x, w, base } = g, dx = g.dx ?? x + w / 2, ey = eaveY(b, g), x0 = x + 8, x1 = x + w - 8, segs = Math.max(1, Math.round((x1 - x0) / 70));
  const garland = (kind) => { for (let s = 0; s < segs; s++) { const a = x0 + ((x1 - x0) * s) / segs, z = x0 + ((x1 - x0) * (s + 1)) / segs, pts = swagPts(a, z, ey, 7, 12);
    for (const [i, [px, py]] of pts.entries()) { R(c, px, py, 2, 1, kind === 'leaf' ? '#2e6e30' : '#3a2a1a');
      if (kind === 'bulbs' && i % 2 === 0) { const col = P[(i / 2 + s) % P.length]; R(c, px - 1, py + 1, 3, 4, INK); R(c, px, py + 2, 1, 2, col); if (V.night) emit(px - 1, py + 1, 3, 3, col, 0.8); }
      if (kind === 'flags' && i % 2 === 0 && i < pts.length - 1) { const col = P[(i / 2 + s) % P.length]; R(c, px, py + 1, 5, 2, col); R(c, px + 1, py + 3, 3, 2, col); R(c, px + 2, py + 5, 1, 1, col); }
      if (kind === 'leaf' && i % 2 === 0) { R(c, px - 1, py, 4, 3, i % 4 ? '#3a8a3a' : '#2e6e30'); if (i % 4 === 0) R(c, px, py + 2, 2, 2, P[(i / 4 + s) % P.length]); } } } };
  const pot = (px, col, top) => { R(c, px - 5, base - 9, 11, 9, INK); R(c, px - 4, base - 8, 9, 8, col); R(c, px - 4, base - 8, 9, 2, '#ffffff22'); top(px, base - 9); };
  const doorL = dx - 22, doorR = dx + 22;
  if (th === 'xmas') { garland('leaf'); garland('bulbs');
    const wy = base - 50; R(c, dx - 8, wy - 8, 16, 16, INK); R(c, dx - 7, wy - 7, 14, 14, '#2e7a3a'); R(c, dx - 3, wy - 3, 6, 6, INK); for (const [a, bb] of [[-6, -6], [4, -5], [-5, 3], [3, 4]]) R(c, dx + a, wy + bb, 2, 2, '#e8323c'); R(c, dx - 3, wy + 5, 6, 4, '#e8323c'); R(c, dx - 1, wy + 6, 2, 2, '#ffd84a'); // wreath + bow
    for (const [px, k] of [[doorL - 6, 0], [doorR + 6, 1]]) { R(c, px - 5, base - 10, 10, 10, INK); R(c, px - 4, base - 9, 8, 8, k ? '#3a6ad8' : '#e8323c'); R(c, px - 4, base - 6, 8, 2, '#ffd84a'); R(c, px - 1, base - 9, 2, 8, '#ffd84a'); } } // presents
  else if (th === 'newyear') { garland('flags'); garland('bulbs'); for (let i = 0; i < 14; i++) R(c, x + 6 + ((i * 37) % (w - 12)), ey + 12 + ((i * 13) % 26), 2, 1, P[i % P.length]); } // confetti
  else if (th === 'halloween') { garland('flags');
    for (const px of [doorL - 6, doorR + 6]) { R(c, px - 7, base - 11, 14, 11, INK); R(c, px - 6, base - 10, 12, 9, '#ff8a1a'); R(c, px - 2, base - 10, 1, 9, '#d86a0a'); R(c, px + 2, base - 10, 1, 9, '#d86a0a'); R(c, px - 1, base - 13, 2, 3, '#3a8a3a'); R(c, px - 4, base - 8, 2, 2, V.night ? '#ffe14a' : INK); R(c, px + 2, base - 8, 2, 2, V.night ? '#ffe14a' : INK); R(c, px - 3, base - 4, 6, 1, V.night ? '#ffe14a' : INK); if (V.night) emit(px - 4, base - 8, 8, 5, '#ff9a2a', 0.8); }
    for (const [cx0, dir] of [[x + 4, 1], [x + w - 4, -1]]) for (let i = 0; i < 10; i++) { R(c, cx0 + dir * i, ey + i, 1, 1, '#e8e8f0'); if (i % 3 === 0) R(c, cx0, ey + i, dir * i || 1, 1, '#c8c8d8'); } } // cobwebs
  else if (th === 'lunar') { garland('flags');
    for (const px of [doorL - 4, doorR + 4]) { R(c, px - 4, base - 58, 8, 38, INK); R(c, px - 3, base - 57, 6, 36, '#c8202a'); for (let j = 0; j < 4; j++) R(c, px - 1, base - 53 + j * 8, 2, 4, '#f2cc68'); } } // door couplets
  else if (th === 'easter') { garland('flags'); for (let i = 0; i < 6; i++) { const ex = x + 10 + ((i * 53) % (w - 20)), col = P[i % P.length]; R(c, ex - 3, base - 8, 7, 8, INK); R(c, ex - 2, base - 7, 5, 7, col); R(c, ex - 2, base - 5, 5, 1, '#ffffff'); } }
  else if (th === 'spring') { garland('leaf'); for (const px of [doorL - 6, doorR + 6]) pot(px, '#c86a3a', (qx, qy) => { for (let i = -2; i <= 2; i++) { R(c, qx + i * 2, qy - 6 - Math.abs(i), 1, 6, '#3a8a3a'); R(c, qx + i * 2 - 1, qy - 8 - Math.abs(i), 3, 3, P[(i + 2) % P.length]); } }); }
  else if (th === 'summer') { garland('flags'); for (const px of [doorL - 6, doorR + 6]) pot(px, '#2a9ad8', (qx, qy) => { R(c, qx, qy - 14, 1, 14, '#3a8a3a'); R(c, qx - 4, qy - 19, 9, 7, INK); R(c, qx - 3, qy - 18, 7, 5, '#ffd84a'); R(c, qx - 1, qy - 17, 3, 3, '#6a3a1a'); }); }
  else if (th === 'autumn') { garland('leaf'); for (let i = 0; i < 10; i++) R(c, x + 6 + ((i * 41) % (w - 12)), base - 3 - (i % 3), 3, 2, P[i % P.length]); }
  else if (th === 'winter') { garland('bulbs'); }
  return true;
}
/** per-frame overlay (skipped with reduced effects): bulbs twinkle, jack-o'-lantern flicker, lantern sway */
export function decorAnim(c, b, g, t, V, h) {
  const th = V.theme; if (!PAL[th] || !g) return; const { R } = h, ey = eaveY(b, g), x0 = g.x + 8, x1 = g.x + g.w - 8, segs = Math.max(1, Math.round((x1 - x0) / 70));
  if (th === 'xmas' || th === 'newyear' || th === 'winter') { const k = Math.floor(t * 3); for (let s = 0; s < segs; s++) { const a = x0 + ((x1 - x0) * s) / segs, z = x0 + ((x1 - x0) * (s + 1)) / segs; const pts = swagPts(a, z, ey, 7, 12);
    for (let i = 0; i < pts.length; i += 2) if ((i / 2 + k + s) % 3 === 0) R(c, pts[i][0], pts[i][1] + 2, 1, 2, '#fffbe0'); } }
  if (th === 'lunar') { const dx = g.dx ?? g.x + g.w / 2; for (const [i, lx] of [[0, dx - 30], [1, dx + 30]]) { const sw = Math.round(Math.sin(t * 2 + i) * 1.5), y0 = g.base - 66; R(c, lx + sw, y0 - 6, 1, 6, INK); R(c, lx - 5 + sw, y0, 11, 10, INK); R(c, lx - 4 + sw, y0 + 1, 9, 8, '#d8202a'); R(c, lx - 4 + sw, y0 + 4, 9, 1, '#f2cc68'); R(c, lx + sw, y0 + 10, 1, 4, '#f2cc68'); } }
}

// ---- plaza centrepiece (world prop next to the forecourt fountain): one original seasonal set piece per theme ----
export const CENTRE = { x: 36, y: 64 }; // tile; the forecourt beside the fountain (FOUNTAIN x30..33, y63..65)
const F = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
export function plazaCentreProps(t, theme, opts = {}) {
  if (!PAL[theme]) return []; const T = opts.tile || 32, cx = CENTRE.x * T + T / 2, base = (CENTRE.y + 1) * T, low = !!opts.low, night = !!opts.night, P = PAL[theme];
  const tw = (i) => low || Math.floor(t * 3 + i) % 3 !== 0;
  const S = opts.scale || 1.5, nk = typeof opts.night === 'number' ? opts.night : night ? 1 : 0; // set pieces read at phone zoom
  let glow = null; const L = (c, x, y, w, h, col) => { F(c, x, y, w, h, col); if (glow) glow.push([cx + (x - cx) * S, base + (y - base) * S, w * S, h * S, col, 0.9]); }; // light: drawn + glows after the night grade
  return [{ y: base - 2, seasonal: theme, d: (c0) => { const c = c0; glow = nk > 0.05 && opts.glow ? [] : null; c.save(); c.translate(cx, base); c.scale(S, S); c.translate(-cx, -base); try { draw(c); } finally { c.restore(); } if (glow) opts.glow(glow, nk); glow = null; } }];
  function draw(c) {
    F(c, cx - 22, base - 4, 44, 5, 'rgba(0,0,0,.22)');
    if (theme === 'xmas' || theme === 'winter') { // decorated pine (no snow - Sydney December is summer)
      F(c, cx - 3, base - 12, 6, 10, '#5a3a1a'); F(c, cx - 12, base - 10, 24, 8, INK); F(c, cx - 11, base - 9, 22, 6, '#c8323c'); F(c, cx - 11, base - 7, 22, 1, '#ffd84a');
      for (let k = 0; k < 5; k++) { const w = 40 - k * 8, y = base - 20 - k * 11; F(c, cx - w / 2 - 1, y - 1, w + 2, 12, INK); F(c, cx - w / 2, y, w, 10, k % 2 ? '#2e7a3a' : '#3a8a44'); F(c, cx - w / 2, y + 8, w, 2, '#24602e');
        for (let j = 0; j < w / 8; j++) { const bx = cx - w / 2 + 3 + j * 8, col = P[(j + k) % P.length]; if (tw(j + k)) L(c, bx, y + 5, 2, 2, col); } }
      F(c, cx - 3, base - 80, 7, 7, INK); L(c, cx - 2, base - 79, 5, 5, '#ffd84a'); F(c, cx, base - 82, 1, 11, '#ffd84a'); F(c, cx - 5, base - 77, 11, 1, '#ffd84a');
    } else if (theme === 'halloween') { // pumpkin pile + scarecrow-free hay bale
      F(c, cx - 20, base - 12, 40, 12, INK); F(c, cx - 19, base - 11, 38, 10, '#d8b04a'); F(c, cx - 19, base - 8, 38, 1, '#b08a2a');
      for (const [dx, dy, s] of [[-12, -12, 12], [6, -12, 14], [-3, -24, 12]]) { F(c, cx + dx - 1, base + dy - s, s + 2, s, INK); F(c, cx + dx, base + dy - s + 1, s, s - 2, '#ff8a1a'); F(c, cx + dx + s / 2 - 1, base + dy - s - 3, 2, 3, '#3a8a3a');
        const lit = night ? (low ? '#ffe14a' : Math.sin(t * 12 + dx) > -0.6 ? '#ffe14a' : '#ffb02a') : INK; const Lf = night ? L : F; Lf(c, cx + dx + 2, base + dy - s + 4, 2, 2, lit); Lf(c, cx + dx + s - 4, base + dy - s + 4, 2, 2, lit); Lf(c, cx + dx + 2, base + dy - 5, s - 4, 1, lit); }
    } else if (theme === 'lunar') { // lantern arch
      F(c, cx - 22, base - 70, 4, 70, '#8a1a1a'); F(c, cx + 18, base - 70, 4, 70, '#8a1a1a'); F(c, cx - 26, base - 74, 52, 6, '#d8202a'); F(c, cx - 26, base - 70, 52, 1, '#f2cc68');
      for (let k = 0; k < 3; k++) { const lx = cx - 12 + k * 12, sw = low ? 0 : Math.round(Math.sin(t * 2 + k)), y = base - 64; F(c, lx + sw, y - 4, 1, 4, INK); F(c, lx - 4 + sw, y, 9, 9, INK); L(c, lx - 3 + sw, y + 1, 7, 7, '#d8202a'); F(c, lx - 3 + sw, y + 4, 7, 1, '#f2cc68'); F(c, lx + sw, y + 9, 1, 4, '#f2cc68'); }
      F(c, cx - 8, base - 28, 16, 20, INK); F(c, cx - 7, base - 27, 14, 18, '#d8202a'); F(c, cx - 3, base - 23, 6, 6, '#f2cc68'); F(c, cx - 2, base - 22, 4, 4, '#d8202a'); // lucky knot
    } else if (theme === 'easter') { // egg basket
      F(c, cx - 18, base - 14, 36, 14, INK); F(c, cx - 17, base - 13, 34, 12, '#c89a5a'); for (let j = 0; j < 6; j++) F(c, cx - 17 + j * 6, base - 13, 3, 12, '#a87a3a');
      for (let j = 0; j < 5; j++) { const ex = cx - 15 + j * 7; F(c, ex - 1, base - 23, 8, 11, INK); F(c, ex, base - 22, 6, 9, P[j % P.length]); F(c, ex, base - 18, 6, 1, '#ffffff'); }
      F(c, cx - 19, base - 34, 3, 22, '#a87a3a'); F(c, cx + 16, base - 34, 3, 22, '#a87a3a'); F(c, cx - 19, base - 36, 38, 3, '#a87a3a');
    } else if (theme === 'newyear') { // countdown clock + popping fireworks above
      F(c, cx - 2, base - 60, 4, 60, '#3a3a4a'); F(c, cx - 14, base - 78, 28, 22, INK); F(c, cx - 13, base - 77, 26, 20, '#f2cc68'); L(c, cx - 10, base - 74, 20, 14, '#fff8e0'); F(c, cx, base - 72, 1, 6, INK); F(c, cx, base - 67, 6, 1, INK);
      if (!low) for (let k = 0; k < 3; k++) { const ph = (t * 0.6 + k / 3) % 1, fx = cx - 40 + k * 40, fy = base - 110 - k * 8, r = 4 + ph * 18; for (let a = 0; a < 8; a++) L(c, fx + Math.cos(a * 0.785) * r, fy + Math.sin(a * 0.785) * r, 2, 2, P[(a + k) % P.length]); }
    } else { // spring / summer / autumn: big planter with flowers, beach umbrella, leaf pile
      if (theme === 'summer') { F(c, cx, base - 58, 2, 56, '#e8e8e8'); for (let j = 0; j < 8; j++) { F(c, cx - 28 + j * 7, base - 62 + Math.abs(j - 3.5) * 1.5, 7, 6, j % 2 ? '#ffffff' : '#ff6a5a'); } F(c, cx - 18, base - 10, 14, 8, '#2a9ad8'); F(c, cx + 6, base - 9, 12, 7, '#ffd84a'); }
      else { F(c, cx - 20, base - 16, 40, 16, INK); F(c, cx - 19, base - 15, 38, 14, theme === 'autumn' ? '#8a5a3a' : '#c86a3a'); F(c, cx - 19, base - 15, 38, 3, '#ffffff22');
        for (let j = 0; j < 9; j++) { const fx = cx - 16 + j * 4, hh = 8 + ((j * 5) % 7); F(c, fx, base - 15 - hh, 1, hh, '#3a8a3a'); F(c, fx - 1, base - 18 - hh, 4, 4, P[j % P.length]); } }
    }
  }
}

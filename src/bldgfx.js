// Building graphics v2: richer pixel-art facades, pre-rendered to offscreen canvases.
// Each building = a static layer (cached per building + variant: day/night, wet, reduced-fx) blitted once per frame,
// plus a tiny animated overlay (steam, neon flicker, beacons, flags, sparkles) drawn only when on screen and effects are on.
// Style: chunky 1-world-px pixels, ink outlines, top-left sun (lit left / shaded right), ambient occlusion at the ground line,
// soft drop shadow, textured walls (brick / plank / stone / panel / stucco), shingled or tiled roofs with ridge lines.
// No webfonts: signs use the built-in 5x7 pixel font below so they bake identically before/after fonts load.
import { TILE, DOORS } from './world.js';
import { ALIVE, reducedMotion } from './alive.js';

export const INK = '#141a2e';
const GOLD = '#d4a640', GOLD_L = '#f2cc68', GOLD_D = '#8f6a22';
const R = (c, x, y, w, h, col) => { if (w <= 0 || h <= 0) return; c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const A = (c, a, fn) => { const p = c.globalAlpha; c.globalAlpha = p * a; fn(); c.globalAlpha = p; };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const rgb = (hex) => { const n = parseInt(hex.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const shade = (hex, f) => { const [r, g, b] = rgb(hex); return toHex(r * f, g * f, b * f); };
export const mix = (a, b, t) => { const p = rgb(a), q = rgb(b); return toHex(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t); };
const hash = (x, y, s = 0) => { let h = ((x | 0) * 374761393 + (y | 0) * 668265263 + s * 2246822519) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---------------------------------------------------------------- 5x7 pixel font
const GL = {
  A: '.###.#...##...#######...##...##...#', B: '####.#...##...#####.#...##...#####.', C: '.###.#...##....#....#....#...#.###.', D: '####.#...##...##...##...##...#####.',
  E: '######....#....####.#....#....#####', F: '######....#....####.#....#....#....', G: '.###.#...##....#.####...##...#.####', H: '#...##...##...#######...##...##...#',
  I: '.###...#....#....#....#....#...###.', J: '..###...#....#....#.#..#.#..#..##..', K: '#...##..#.#.#..##...#.#..#..#.#...#', L: '#....#....#....#....#....#....#####',
  M: '#...###.###.#.##.#.##...##...##...#', N: '#...###..##.#.##..###...##...##...#', O: '.###.#...##...##...##...##...#.###.', P: '####.#...##...#####.#....#....#....',
  Q: '.###.#...##...##...##.#.##..#..##.#', R: '####.#...##...#####.#.#..#..#.#...#', S: '.#####....#.....###.....#....#####.', T: '#####..#....#....#....#....#....#..',
  U: '#...##...##...##...##...##...#.###.', V: '#...##...##...##...##...#.#.#...#..', W: '#...##...##...##.#.##.#.##.#.#.#.#.', X: '#...##...#.#.#...#...#.#.#...##...#',
  Y: '#...##...#.#.#...#....#....#....#..', Z: '#####....#...#...#...#...#....#####',
  0: '.###.#...##..###.#.###..##...#.###.', 1: '..#...##....#....#....#....#...###.', 2: '.###.#...#....#...#...#...#...#####', 3: '####.....#....#.###.....#....#####.',
  4: '...#...##..#.#.#..#.#####...#....#.', 5: '######....####.....#....##...#.###.', 6: '.###.#....#....####.#...##...#.###.', 7: '#####....#...#...#...#....#....#...',
  8: '.###.#...##...#.###.#...##...#.###.', 9: '.###.#...##...#.####....#....#.###.',
  $: '..#...####.#....###....#.####...#..', '&': '.##..#..#.#.#...#...#.#.##..#..##.#', "'": '..#....#...#.......................', '.': '..............................##...',
  '-': '...............###.................', '!': '..#....#....#....#....#.........#..', ':': '.......##...##.........##...##.....', ' ': '',
};
const GLYPH = {}; // char -> { w, px: [[x,y]...] } trimmed to used columns (proportional)
for (const [ch, s] of Object.entries(GL)) { const px = []; let x0 = 9, x1 = -1;
  for (let i = 0; i < s.length; i++) if (s[i] === '#') { const x = i % 5, y = (i / 5) | 0; px.push([x, y]); x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
  GLYPH[ch] = px.length ? { w: x1 - x0 + 1, px: px.map(([x, y]) => [x - x0, y]) } : { w: 3, px: [] }; }
const norm = (s) => String(s).toUpperCase().replace(/[ÉÈÊ]/g, 'E').replace(/[ÀÂ]/g, 'A').replace(/[’`]/g, "'");
export function ptw(s, k = 1) { let w = 0; for (const ch of norm(s)) w += ((GLYPH[ch] || GLYPH[' ']).w + 1) * k; return Math.max(0, w - k); }
/** pixel text centred at (cx, cy); returns its width. shadow: drop colour at +k,+k (null = none) */
export function ptext(c, s, cx, cy, col, k = 1, shadow = INK) {
  const w = ptw(s, k), x0 = Math.round(cx - w / 2), y0 = Math.round(cy - 3.5 * k);
  for (const pass of shadow ? [0, 1] : [1]) { c.fillStyle = pass ? col : shadow; let x = x0;
    for (const ch of norm(s)) { const g = GLYPH[ch] || GLYPH[' ']; for (const [px, py] of g.px) c.fillRect(x + px * k + (pass ? 0 : k), y0 + py * k + (pass ? 0 : k), k, k); x += (g.w + 1) * k; } }
  return w;
}

// ---------------------------------------------------------------- icons (9x9), drawn with a palette
const ICONS = {
  cup: ['..w..w...', '...w..w..', '..w..w...', 'aaaaaaa..', 'awwwwwaaa', 'awbbbwa.a', 'awwwwwaaa', '.awwwa...', 'aaaaaaaa.'],
  sofa: ['.bbbbbbb.', '.bwbbbwb.', 'abbbbbbba', 'abbbbbbba', 'aaaaaaaaa', 'aaaaaaaaa', 'a.......a', '.........', '.........'],
  hanger: ['....ww...', '...w..w..', '......w..', '.....w...', '....a....', '...a.a...', '..a...a..', '.a.....a.', 'aaaaaaaaa'],
  rocket: ['....a....', '...awa...', '...aba...', '...awa...', '...aaa...', '..aaaaa..', '.a.aaa.a.', '...r.r...', '....y....'],
  wheel: ['..aaaaa..', '.aawwwaa.', 'aawbwbwaa', 'awwwbwwwa', 'awbbybbwa', 'awwwbwwwa', 'aawbwbwaa', '.aawwwaa.', '..aaaaa..'],
  cap: ['....a....', '..aaaaa..', 'aaaaaaaaa', '..aaaaa.y', '...bbb..y', '...bbb..y', '.......yy', '.........', '.........'],
  diamond: ['..aaaaa..', '.awaaawa.', 'aaaaaaaaa', '.abaaaba.', '..abbba..', '...aba...', '....a....', '.........', '.........'],
  chair: ['.aaaaaaa.', '.abbbbba.', '.abbbbba.', 'aaaaaaaaa', 'abbbbbbba', 'aaaaaaaaa', 'a.......a', 'a.......a', '.........'],
  star: ['....a....', '....a....', '...aaa...', 'aaaaaaaaa', '.aaaaaaa.', '..aaaaa..', '..aa.aa..', '.aa...aa.', '.........'],
  paw: ['...a.a...', '..aa.aa..', 'a.......a', 'aa.aaa.aa', '..aaaaa..', '.aaaaaaa.', '.aaaaaaa.', '..aa.aa..', '.........'],
  lamp: ['..aaaaa..', '.aaaaaaa.', 'aaaaaaaaa', '...yyy...', '....b....', '....b....', '...bbb...', '..bbbbb..', '.........'],
  crown: ['a...a...a', 'aa.aaa.aa', 'aaaaaaaaa', 'aarawaraa', 'aaaaaaaaa', 'bbbbbbbbb', '.........', '.........', '.........'],
  joystick: ['...rr....', '...rrr...', '....b....', '....b....', '....b....', '.aaaaaaa.', 'aayaaaraa', 'aaaaaaaaa', '.........'],
  coin: ['..aaaaa..', '.awwwwwa.', 'awwbbbwwa', 'awwbwwwwa', 'awwbbbwwa', 'awwwwbwwa', 'awwbbbwwa', '.awwwwwa.', '..aaaaa..'],
  bank: ['....a....', '..aaaaa..', 'aaaaaaaaa', '.a.a.a.a.', '.a.a.a.a.', '.a.a.a.a.', '.a.a.a.a.', 'aaaaaaaaa', '.........'],
  bone: ['.........', 'aa.....aa', 'aaaaaaaaa', '.aaaaaaa.', 'aaaaaaaaa', 'aa.....aa', '.........', '.........', '.........'],
};
export function icon(c, name, x, y, k, pal) { const rows = ICONS[name]; if (!rows) return;
  for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) { const ch = rows[j][i]; if (ch === '.') continue; c.fillStyle = pal[ch] || pal.a; c.fillRect(Math.round(x + i * k), Math.round(y + j * k), Math.ceil(k), Math.ceil(k)); } }
export const ICON_NAMES = Object.freeze(Object.keys(ICONS));

// ---------------------------------------------------------------- environment (night / rain / effects level / view)
export function fxLow() { // ?fx=low, localStorage inuverse.fx=low, auto low-fps (shared sky pool), or prefers-reduced-motion
  if (globalThis.__bldgFx === 'low') return true; if (globalThis.__bldgFx === 'full') return false;
  if (globalThis.__inu?.sky?.pool?.low) return true;
  try { if (/(?:^|[?&])fx=low(?:&|$)/.test(globalThis.location?.search || '')) return true; if (globalThis.localStorage?.getItem('inuverse.fx') === 'low') return true; } catch {}
  return reducedMotion();
}
export const nightK = () => clamp01(((+globalThis.__inuNight || 0) - 0.12) / 0.38); // 0 day .. 1 full night (dusk crossfades)
export const wetNow = () => { try { return (globalThis.__inu?.amb?.rain || 0) > 0.3; } catch { return false; } };
export const animT = () => ALIVE.t || 0;
function viewOf(c) { // visible world rect from the current transform (null = unknown -> treat as visible)
  try { const m = c.getTransform?.(), cv = c.canvas; if (!m || !cv || !m.a || !m.d) return null;
    return { x0: -m.e / m.a, y0: -m.f / m.d, x1: (cv.width - m.e) / m.a, y1: (cv.height - m.f) / m.d }; } catch { return null; }
}

// ---------------------------------------------------------------- textures
function bricks(c, x, y, w, h, base, { bw = 10, bh = 5, mortar } = {}) {
  R(c, x, y, w, h, mortar || shade(base, 0.72));
  for (let r = 0, yy = y; yy < y + h; yy += bh, r++) for (let xx = x - (r % 2 ? bw / 2 : 0); xx < x + w; xx += bw) {
    const bx = Math.max(x, xx), bx1 = Math.min(x + w, xx + bw - 1), by1 = Math.min(y + h, yy + bh - 1); if (bx1 <= bx || by1 <= yy) continue;
    const v = hash(xx, yy, 3), col = v < 0.15 ? shade(base, 0.88) : v > 0.85 ? shade(base, 1.1) : base;
    R(c, bx, yy, bx1 - bx, by1 - yy, col); R(c, bx, yy, bx1 - bx, 1, shade(col, 1.14)); if (v > 0.93) R(c, bx + 2, yy + 2, 2, 1, shade(col, 0.8)); }
}
function planks(c, x, y, w, h, base, { ph = 6, vertical = false } = {}) {
  R(c, x, y, w, h, base);
  if (vertical) { for (let xx = x; xx < x + w; xx += ph) { R(c, xx, y, 1, h, shade(base, 0.72)); R(c, xx + 1, y, 1, h, shade(base, 1.12)); if (hash(xx, y) > 0.5) R(c, xx + 2, y + ((hash(xx, 1) * h) | 0), ph - 3, 1, shade(base, 0.86)); } return; }
  for (let r = 0, yy = y; yy < y + h; yy += ph, r++) { R(c, x, yy + ph - 1, w, 1, shade(base, 0.68)); R(c, x, yy, w, 1, shade(base, 1.14));
    for (let xx = x + ((hash(r, 7) * 30) | 0); xx < x + w; xx += 34 + ((hash(xx, r) * 20) | 0)) { R(c, xx, yy, 1, ph - 1, shade(base, 0.74)); R(c, xx + 2, yy + 2, 1, 1, shade(base, 0.6)); } }
}
function stoneBlocks(c, x, y, w, h, base, { bw = 18, bh = 9 } = {}) {
  R(c, x, y, w, h, shade(base, 0.7));
  for (let r = 0, yy = y; yy < y + h; yy += bh, r++) for (let xx = x - (r % 2 ? bw / 2 : 0); xx < x + w; xx += bw) {
    const bx = Math.max(x, xx), bx1 = Math.min(x + w, xx + bw - 1), by1 = Math.min(y + h, yy + bh - 1); if (bx1 <= bx || by1 <= yy) continue;
    const col = shade(base, 0.94 + hash(xx, yy, 5) * 0.12);
    R(c, bx, yy, bx1 - bx, by1 - yy, col); R(c, bx, yy, bx1 - bx, 1, shade(col, 1.16)); R(c, bx, yy, 1, by1 - yy, shade(col, 1.08)); R(c, bx, by1 - 1, bx1 - bx, 1, shade(col, 0.82)); }
}
function panels(c, x, y, w, h, base, { pw = 24, ph = 14 } = {}) {
  R(c, x, y, w, h, base);
  for (let yy = y; yy < y + h; yy += ph) for (let xx = x; xx < x + w; xx += pw) { const ww = Math.min(pw, x + w - xx), hh = Math.min(ph, y + h - yy);
    R(c, xx, yy, ww, 1, shade(base, 1.2)); R(c, xx, yy, 1, hh, shade(base, 1.1)); if (ww === pw) R(c, xx + pw - 1, yy, 1, hh, shade(base, 0.75));
    for (const [rx, ry] of [[2, 2], [pw - 4, 2], [2, ph - 4], [pw - 4, ph - 4]]) if (xx + rx < x + w && yy + ry < y + h) R(c, xx + rx, yy + ry, 1, 1, shade(base, 1.35)); }
}
function stucco(c, x, y, w, h, base) {
  R(c, x, y, w, h, base);
  for (let i = 0; i < (w * h) / 40; i++) { const px = x + hash(i, 1, 9) * w, py = y + hash(i, 2, 9) * h; R(c, px, py, 1, 1, hash(i, 3, 9) < 0.5 ? shade(base, 0.9) : shade(base, 1.08)); }
}
const TEX = { brick: bricks, plank: planks, stone: stoneBlocks, panel: panels, stucco };

// ---------------------------------------------------------------- shading + structure
function dropShadow(c, x, base, w) { // soft cast shadow on the ground (sun top-left -> shadow falls right/down)
  A(c, 0.18, () => { R(c, x + 6, base - 2, w + 8, 12, '#0a0e1e'); }); A(c, 0.22, () => { R(c, x + 4, base - 2, w + 4, 8, '#0a0e1e'); R(c, x + w, base - 40, 8, 40, '#0a0e1e'); });
}
/** textured wall box with ink outline, eave shadow, lit left edge, shaded right edge, ground AO, optional rain sheen */
function wall(c, x, y, w, h, base, tex = 'brick', V = {}, o = {}) {
  R(c, x - 2, y - 2, w + 4, h + 2, INK);
  (TEX[tex] || stucco)(c, x, y, w, h, base, o);
  A(c, 0.35, () => R(c, x, y, w, 4, '#0a0e1e')); A(c, 0.18, () => R(c, x, y + 4, w, 3, '#0a0e1e')); // eave shadow
  A(c, 0.18, () => R(c, x, y, 3, h, '#ffffff'));
  A(c, 0.2, () => R(c, x + w - 10, y, 10, h, '#0a0e1e')); A(c, 0.18, () => R(c, x + w - 4, y, 4, h, '#0a0e1e'));
  for (let k = 0; k < 4; k++) A(c, 0.1 + k * 0.07, () => R(c, x, y + h - 4 + k, w, 1, '#0a0e1e')); // ambient occlusion at the ground
  if (V.wet) { A(c, 0.16, () => { for (let i = 0; i < w; i += 7) if (hash(i, y, 4) > 0.45) R(c, x + i, y + 6 + hash(i, 2, 4) * (h * 0.3), 1, 6 + hash(i, 3, 4) * 14, '#dfe8ff'); }); A(c, 0.22, () => R(c, x, y + h - 10, w, 6, '#0a1430')); }
}
function plinth(c, x, y, w, col = '#6d6a80') { R(c, x - 3, y, w + 6, 7, INK); R(c, x - 2, y, w + 4, 6, col); R(c, x - 2, y, w + 4, 1, shade(col, 1.3)); for (let i = 6; i < w; i += 14) R(c, x + i, y + 2, 1, 4, shade(col, 0.75)); }
/** front gable (triangle) roof with tile/shingle courses, ridge finial, lit left / shaded right, ink outline + fascia */
function gable(c, x0, x1, eaveY, apexY, col, { style = 'shingle', fascia } = {}) {
  const H = eaveY - apexY, cx = (x0 + x1) / 2, half = (x1 - x0) / 2, lit = shade(col, 1.12), dk = shade(col, 0.82);
  for (let yy = 0; yy <= H; yy++) { const hw = Math.round(half * (yy / H)), y = apexY + yy;
    R(c, cx - hw - 2, y, hw * 2 + 4, 1, INK); R(c, cx - hw, y, hw, 1, lit); R(c, cx, y, hw, 1, col);
    const course = style === 'tile' ? 6 : 5, row = Math.floor(yy / course), ry = yy % course;
    if (ry === course - 1) R(c, cx - hw, y, hw * 2, 1, dk);
    else { const step = style === 'tile' ? 7 : 9, off = (row % 2) * Math.floor(step / 2);
      for (let xx = cx - hw + off; xx < cx + hw; xx += step) { if (style === 'tile') { if (ry >= course - 3) R(c, xx, y, 1, 1, dk); if (ry < 2) R(c, xx + 2, y, 2, 1, shade(col, 1.25)); } else R(c, xx, y, 1, 1, dk); } }
  }
  for (let yy = 0; yy < H; yy++) { const hw = Math.round(half * (yy / H)); if (hw > 3) R(c, cx - hw + 1, apexY + yy, 2, 1, shade(col, 1.3)); } // lit barge board
  R(c, cx - 3, apexY - 3, 6, 4, INK); R(c, cx - 2, apexY - 2, 4, 3, shade(col, 1.35)); // ridge finial
  const fc = fascia || shade(col, 0.6); R(c, x0 - 4, eaveY, x1 - x0 + 8, 4, INK); R(c, x0 - 3, eaveY, x1 - x0 + 6, 3, fc); R(c, x0 - 3, eaveY, x1 - x0 + 6, 1, shade(fc, 1.4));
}
/** front-facing roof band (shed / mansard): rows of shingles or tiles, ridge highlight on top, shaded right */
function roofBand(c, x, y, w, h, col, { style = 'shingle', ridge = true } = {}) {
  R(c, x - 2, y - 2, w + 4, h + 4, INK); R(c, x, y, w, h, col);
  const course = style === 'tile' ? 6 : 5;
  for (let r = 0, yy = y + 2; yy < y + h; yy += course, r++) { R(c, x, yy + course - 1, w, 1, shade(col, 0.78));
    for (let xx = x + (r % 2) * 4; xx < x + w; xx += style === 'tile' ? 7 : 8) { R(c, xx, yy, 1, Math.min(course - 1, y + h - yy), shade(col, 0.82)); if (style === 'tile') R(c, xx + 2, yy, 3, 1, shade(col, 1.22)); } }
  if (ridge) { R(c, x, y, w, 2, shade(col, 1.35)); R(c, x, y + 2, w, 1, shade(col, 0.9)); }
  A(c, 0.25, () => R(c, x + w - 8, y, 8, h, '#0a0e1e'));
}
function chimney(c, x, y, h, col) { R(c, x - 2, y - 2, 18, h + 2, INK); bricks(c, x, y, 14, h, col, { bw: 7, bh: 4 }); A(c, 0.25, () => R(c, x + 9, y, 5, h, '#0a0e1e')); R(c, x - 3, y - 5, 20, 5, INK); R(c, x - 2, y - 4, 18, 3, shade(col, 0.7)); R(c, x - 2, y - 4, 18, 1, shade(col, 1.1)); R(c, x + 3, y - 3, 8, 2, '#1a1010'); }

// ---------------------------------------------------------------- emissive collector
// While a night layer is painted, lit parts (window glass, sign boards, lamps) register world rects here. ambient.js
// re-adds them *after* the night grade (drawBuildingGlow) so windows and signs genuinely glow instead of being dimmed.
let GLOWS = null;
const emit = (x, y, w, h, col, a = 0.55) => { if (GLOWS && w > 0 && h > 0) GLOWS.push([Math.round(x), Math.round(y), Math.round(w), Math.round(h), col, a]); };

// ---------------------------------------------------------------- facade parts
const glassDay = ['#d6efff', '#a6d4f2', '#7cb4de', '#5a92c4'];
const glassNight = ['#fff4c4', '#ffe08a', '#ffc860', '#f0a848'];
/** framed window: ink + trim frame, gradient glass (sky by day, warm lamp light by night), panes, curtains, sill + optional flower box */
const o_glow = (F) => F.winGlow || '#ffb860';
function win(c, x, y, w, h, F, V, { panes = [2, 2], curtains = true, sill = true, box = false, arch = false, frame, inner } = {}) {
  const fr = frame || F.trim, G = V.night ? glassNight : glassDay;
  R(c, x - 3, y - 3, w + 6, h + 6, INK); R(c, x - 2, y - 2, w + 4, h + 4, fr); R(c, x - 2, y - 2, w + 4, 1, shade(fr, 1.2)); R(c, x + w + 1, y - 2, 1, h + 4, shade(fr, 0.75));
  if (arch) { R(c, x - 1, y - 6, w + 2, 4, INK); R(c, x + 1, y - 5, w - 2, 3, fr); R(c, x + 3, y - 8, w - 6, 3, INK); R(c, x + 4, y - 7, w - 8, 2, fr); }
  for (let i = 0; i < 4; i++) R(c, x, y + Math.round((i * h) / 4), w, Math.ceil(h / 4), G[i]);
  if (V.night) emit(x, y, w, h, o_glow(F), Math.max(0.16, Math.min(0.4, 0.4 * Math.sqrt(900 / (w * h)))));
  if (V.night) A(c, 0.35, () => R(c, x + 2, y + 2, w - 4, Math.max(2, h / 3), '#fffbe0'));
  if (inner) inner(c, x, y, w, h);
  if (!V.night) A(c, 0.55, () => { for (let k = 0; k < 3; k++) R(c, x + 3 + k, y + h - 5 - k * 3, 2, 2, '#ffffff'); R(c, x + w - 8, y + 2, 2, 2, '#ffffff'); R(c, x + w - 6, y + 4, 2, 2, '#ffffff'); });
  if (curtains) { const cc = F.curtain || F.accent, cw = Math.max(3, Math.round(w * 0.18));
    R(c, x, y, cw, h, cc); R(c, x + w - cw, y, cw, h, cc); for (let k = 1; k < cw; k += 2) { R(c, x + k, y, 1, h, shade(cc, 0.82)); R(c, x + w - cw + k, y, 1, h, shade(cc, 0.82)); }
    R(c, x, y, w, 3, shade(cc, 0.9)); R(c, x, y + 3, w, 1, shade(cc, 0.7)); R(c, x + cw - 1, y + h / 2, 2, 2, GOLD); R(c, x + w - cw - 1, y + h / 2, 2, 2, GOLD); }
  const [px, py] = panes; for (let i = 1; i < px; i++) R(c, x + Math.round((i * w) / px) - 1, y, 2, h, fr); for (let j = 1; j < py; j++) R(c, x, y + Math.round((j * h) / py) - 1, w, 2, fr);
  if (sill) { R(c, x - 5, y + h + 2, w + 10, 4, INK); R(c, x - 4, y + h + 2, w + 8, 3, shade(fr, 0.95)); R(c, x - 4, y + h + 2, w + 8, 1, shade(fr, 1.25)); A(c, 0.3, () => R(c, x - 3, y + h + 6, w + 6, 2, '#0a0e1e')); }
  if (box) flowerBox(c, x - 2, y + h + 6, w + 4);
}
function flowerBox(c, x, y, w, wood = '#6a4424') {
  const fl = ['#ff7aa8', '#ffd84a', '#ffffff', '#ff9a5a', '#c88aff'];
  for (let i = 1; i < w - 2; i += 3) { const hh = 3 + ((hash(x + i, y) * 3) | 0); R(c, x + i, y - hh + 2, 2, hh, i % 2 ? '#3f8a3a' : '#2e6e30'); }
  for (let i = 2; i < w - 3; i += 5) { const col = fl[(hash(i, x) * fl.length) | 0], dy = (hash(i, y) * 3) | 0; R(c, x + i, y - 4 - dy, 3, 3, col); R(c, x + i + 1, y - 3 - dy, 1, 1, '#ffe08a'); }
  R(c, x - 1, y, w + 2, 7, INK); R(c, x, y + 1, w, 5, wood); R(c, x, y + 1, w, 1, shade(wood, 1.35)); for (let i = 6; i < w; i += 10) R(c, x + i, y + 2, 1, 4, shade(wood, 0.7));
}
/** striped awning: gilt rail, curved stripes (lit top / dark bottom), scalloped edge, cast shadow on the wall */
function awning(c, x, y, w, a, b, { h = 12, stripe = 10, scallop = true } = {}) {
  A(c, 0.3, () => R(c, x + 2, y + h + 3, w - 2, 6, '#0a0e1e'));
  R(c, x - 2, y - 3, w + 4, h + 4, INK);
  for (let i = 0, k = 0; i < w; i += stripe, k++) { const col = k % 2 ? b : a, sw = Math.min(stripe, w - i);
    R(c, x + i, y, sw, h, col); R(c, x + i, y, sw, 2, shade(col, 1.18)); R(c, x + i, y + h - 4, sw, 4, shade(col, 0.84));
    if (scallop && sw > 4) { R(c, x + i + 1, y + h, sw - 2, 2, shade(col, 0.84)); R(c, x + i + 2, y + h + 2, sw - 4, 1, shade(col, 0.84)); R(c, x + i + 1, y + h + 2, 1, 1, INK); R(c, x + i + sw - 2, y + h + 2, 1, 1, INK); R(c, x + i + 2, y + h + 3, sw - 4, 1, INK); } }
  R(c, x - 3, y - 4, w + 6, 2, INK); R(c, x - 2, y - 3, w + 4, 1, GOLD_L);
}
/** panelled door with frame, transom, glass, brass handle, kick plate, steps + mat, and wall sconces */
function door(c, cx, base, F, V, { w = 26, h = 36, col = '#6a3e1e', glass = false, double = false, steps = 2, lamps = true, frame } = {}) {
  const x = Math.round(cx - w / 2), y = base - h - steps * 3, fr = frame || F.trim;
  R(c, x - 5, y - 9, w + 10, h + 9, INK); R(c, x - 4, y - 8, w + 8, h + 8, fr); R(c, x - 4, y - 8, w + 8, 1, shade(fr, 1.25)); R(c, x + w + 3, y - 8, 1, h + 8, shade(fr, 0.7));
  R(c, x, y - 6, w, 4, V.night ? '#ffe08a' : '#a6d4f2'); R(c, x + Math.round(w / 3), y - 6, 1, 4, fr); R(c, x + Math.round((2 * w) / 3), y - 6, 1, 4, fr); // transom
  R(c, x - 1, y - 1, w + 2, h + 1, INK);
  const leaf = (lx, lw, hand) => {
    if (glass) { R(c, lx, y, lw, h, shade(fr, 0.95)); for (let i = 0; i < 4; i++) R(c, lx + 2, y + 2 + Math.round((i * (h - 8)) / 4), lw - 4, Math.ceil((h - 8) / 4), (V.night ? glassNight : glassDay)[i]); if (!V.night) A(c, 0.5, () => R(c, lx + 3, y + 4, 2, h / 2, '#fff')); R(c, lx, y + h - 6, lw, 6, shade(fr, 0.8)); }
    else { R(c, lx, y, lw, h, col); R(c, lx, y, lw, 1, shade(col, 1.3)); R(c, lx + lw - 1, y, 1, h, shade(col, 0.7));
      R(c, lx + 2, y + 3, lw - 4, Math.round(h * 0.38), V.night ? '#ffd27a' : '#a6d4f2'); R(c, lx + 2, y + 3, lw - 4, 1, INK); if (!V.night) A(c, 0.5, () => R(c, lx + 3, y + 4, 2, 4, '#fff'));
      const py = y + Math.round(h * 0.5); R(c, lx + 2, py, lw - 4, h - (py - y) - 4, shade(col, 0.86)); R(c, lx + 3, py + 1, lw - 6, h - (py - y) - 6, shade(col, 1.06)); }
    R(c, hand, y + Math.round(h * 0.52), 2, 4, GOLD_L); R(c, hand, y + Math.round(h * 0.52) + 3, 2, 1, GOLD_D);
  };
  if (double) { const lw = Math.floor(w / 2) - 1; leaf(x, lw, x + lw - 4); leaf(x + lw + 2, lw, x + lw + 4); R(c, x + lw, y, 2, h, INK); }
  else leaf(x, w, x + w - 6);
  for (let s = 0; s < steps; s++) { const sw = w + 10 + (s + 1) * 6, sx = Math.round(cx - sw / 2), sy = base - (steps - s) * 3; R(c, sx - 1, sy - 1, sw + 2, 4, INK); R(c, sx, sy, sw, 3, '#b8b0a2'); R(c, sx, sy, sw, 1, '#e8e2d6'); }
  R(c, x + 3, base - steps * 3 - 2, w - 6, 2, F.accent);
  if (lamps) for (const lx of [x - 10, x + w + 6]) { R(c, lx - 1, y + 6, 6, 9, INK); R(c, lx, y + 7, 4, 7, V.night ? '#fff0b0' : '#e8d8a0'); R(c, lx, y + 7, 4, 1, GOLD_D); R(c, lx + 1, y + 15, 2, 3, INK);
    if (V.night) { A(c, 0.35, () => R(c, lx - 4, y + 4, 12, 13, '#ffd27a')); emit(lx, y + 7, 4, 7, '#ffd27a', 0.8); } }
  if (V.night) emit(x, y - 6, w, 4, '#ffc860', 0.5);
}
/** signboard: ink + accent frame with gilt corner bolts, gradient board, function icon, pixel lettering (glows at night) */
function sign(c, cx, y, label, F, V, { maxW = 200, icon: ic, iconPal, h, k, chains = false } = {}) {
  let s = norm(label); const kk = k || (ptw(s, 2) + (ic ? 26 : 0) + 16 <= maxW ? 2 : 1); let tw = ptw(s, kk);
  while (tw + (ic ? 14 * kk : 0) > maxW - 12 && s.length > 4) { s = s.slice(0, -1); tw = ptw(s, kk); }
  const iw = ic ? 13 * kk : 0, bw = Math.min(maxW, tw + iw + 16), bh = h || (kk === 2 ? 26 : 17), x = Math.round(cx - bw / 2);
  if (chains) for (const ch of [x + 8, x + bw - 10]) { R(c, ch, y - 10, 2, 10, INK); R(c, ch, y - 10, 1, 10, GOLD_D); }
  if (V.night) A(c, 0.22, () => R(c, x - 6, y - 6, bw + 12, bh + 12, F.glow || F.sign));
  R(c, x - 3, y - 3, bw + 6, bh + 6, INK); R(c, x - 2, y - 2, bw + 4, bh + 4, F.accent); R(c, x - 2, y - 2, bw + 4, 1, shade(F.accent, 1.3)); R(c, x - 2, y + bh + 1, bw + 4, 1, shade(F.accent, 0.7));
  R(c, x, y, bw, bh, INK); R(c, x + 1, y + 1, bw - 2, bh - 2, F.signBg); R(c, x + 1, y + 1, bw - 2, Math.round(bh / 3), shade(F.signBg, 1.25)); R(c, x + 1, y + bh - 3, bw - 2, 2, shade(F.signBg, 0.75));
  for (const [qx, qy] of [[x - 1, y - 1], [x + bw - 1, y - 1], [x - 1, y + bh - 1], [x + bw - 1, y + bh - 1]]) R(c, qx, qy, 2, 2, GOLD_L);
  const tx = cx + iw / 2, col = V.night ? mix(F.sign, '#ffffff', 0.35) : F.sign;
  if (V.night) { emit(x - 2, y - 2, bw + 4, bh + 4, F.glow || F.sign, 0.22); emit(x + 4, y + 3, bw - 8, bh - 6, F.sign, 0.3); }
  if (ic) icon(c, ic, Math.round(cx - (tw + iw) / 2), Math.round(y + bh / 2 - 4.5 * kk), kk, iconPal || { a: F.sign, b: F.accent, w: '#ffffff', y: GOLD_L, r: '#ff5a5a' });
  if (V.night) A(c, 0.4, () => { ptext(c, s, tx - 1, y + bh / 2, F.glow || F.sign, kk, null); ptext(c, s, tx + 1, y + bh / 2, F.glow || F.sign, kk, null); });
  ptext(c, s, tx, y + bh / 2, col, kk, INK);
  return { x, y, w: bw, h: bh };
}
function streetLamp(c, x, base, V) { R(c, x - 1, base - 44, 3, 44, INK); R(c, x, base - 44, 1, 44, '#5a5a70'); R(c, x - 3, base - 3, 7, 3, INK); R(c, x - 4, base - 54, 9, 11, INK); R(c, x - 3, base - 53, 7, 9, V.night ? '#fff0b0' : '#d8e8f0'); R(c, x - 5, base - 56, 11, 3, INK); R(c, x - 1, base - 58, 3, 2, INK);
  if (V.night) { emit(x - 3, base - 53, 7, 9, '#ffe0a0', 0.8); A(c, 0.3, () => R(c, x - 8, base - 58, 17, 18, '#ffd27a')); A(c, 0.18, () => R(c, x - 14, base - 4, 29, 4, '#ffd27a')); } }
function shrub(c, x, base, s = 1, pot = '#8a5a3a') { const w = Math.round(14 * s), hh = Math.round(14 * s); R(c, x - 1, base - 9, w + 2, 9, INK); R(c, x, base - 8, w, 8, pot); R(c, x, base - 8, w, 2, shade(pot, 1.3)); R(c, x + w - 3, base - 8, 3, 8, shade(pot, 0.75));
  const g = ['#1f5a34', '#2a7442', '#3a9152', '#5cb86a']; R(c, x - 2, base - 8 - hh, w + 4, hh, INK); R(c, x - 1, base - 7 - hh, w + 2, hh - 1, g[0]); R(c, x, base - 6 - hh, w - 2, Math.round(8 * s), g[1]); R(c, x + 1, base - 5 - hh, w - 6, Math.round(4 * s), g[2]); R(c, x + 2, base - 4 - hh, 3, 2, g[3]); }
function aFrame(c, x, base, label, col = '#2a2a2a') { R(c, x - 1, base - 23, 22, 23, INK); R(c, x, base - 22, 20, 18, '#8a5a30'); R(c, x + 2, base - 20, 16, 14, col); ptext(c, label, x + 10, base - 16, '#ffffff', 1, null); R(c, x + 4, base - 10, 12, 1, '#ffd84a'); R(c, x + 4, base - 8, 8, 1, '#ff9ab8'); R(c, x + 1, base - 4, 2, 4, INK); R(c, x + 17, base - 4, 2, 4, INK); }
function flagpole(c, x, base, h) { R(c, x - 1, base - h, 3, h, INK); R(c, x, base - h, 1, h, '#e8e8f0'); R(c, x - 2, base - h - 3, 5, 3, GOLD_L); }
function wavingFlag(c, f, t, w = 16, h = 10) { for (let i = 0; i < w; i += 2) { const off = Math.round(Math.sin(t * 5 - i * 0.45) * 1.5 * (i / w)); R(c, f.x + i, f.y + off - 1, 2, h + 2, INK); } for (let i = 0; i < w; i += 2) { const off = Math.round(Math.sin(t * 5 - i * 0.45) * 1.5 * (i / w)); R(c, f.x + i, f.y + off, 2, h, i < w / 2 ? f.col : f.col2 || f.col); R(c, f.x + i, f.y + off + h - 2, 2, 1, shade(i < w / 2 ? f.col : f.col2 || f.col, 0.7)); } }
function bunting(c, x0, x1, y, cols, t, animate) { R(c, x0, y, x1 - x0, 1, INK); for (let x = x0 + 3, k = 0; x < x1 - 4; x += 8, k++) { const sw = animate ? Math.round(Math.sin(t * 4 + k)) : 0, col = cols[k % cols.length]; R(c, x + sw, y + 1, 5, 2, col); R(c, x + 1 + sw, y + 3, 3, 2, col); R(c, x + 2 + sw, y + 5, 1, 1, col); } }
function steam(c, x, y, t, n = 3, col = '#f4f4f8') { for (let i = 0; i < n; i++) { const ph = (t * 0.6 + i / n) % 1, yy = y - ph * 22, xx = x + Math.round(Math.sin(t * 2 + i * 2 + ph * 5) * 3); A(c, (1 - ph) * 0.7, () => R(c, xx, yy, 3 + ph * 3, 3 + ph * 2, col)); } }
function twinkle(c, x, y, t, ph = 0, col = '#ffffff') { const s = (Math.sin(t * 3 + ph) + 1) / 2; if (s < 0.45) return; const L = s > 0.8 ? 3 : 2; R(c, x, y - L, 1, L * 2 + 1, col); R(c, x - L, y, L * 2 + 1, 1, col); R(c, x - 1, y - 1, 3, 3, col); }

// ---------------------------------------------------------------- geometry
function geo(b) { const x = b.x * TILE, y = b.y * TILE, w = b.w * TILE, h = b.h * TILE, base = y + h, d = DOORS[b.id] || (b.door ? { side: 'front', dx: b.door.tx - b.x } : { side: 'front', dx: Math.floor(b.w / 2) });
  return { x, y, w, h, base, side: d.side, dx: d.side === 'front' ? (b.x + d.dx + 0.5) * TILE : null }; }
const away = (px, dx, r) => dx == null || Math.abs(px - dx) > r;

// ---------------------------------------------------------------- painters
// paint(c, b, F, V, g) draws the static layer; anim(c, b, F, t, g, V) draws the per-frame overlay (cheap, few rects).
const P = {};
const winRow = (c, g, F, V, y, ww, wh, n, o = {}) => { const gap = (g.w - n * ww) / (n + 1); const out = [];
  for (let i = 0; i < n; i++) { const wx = Math.round(g.x + gap + i * (ww + gap)); if (!away(wx + ww / 2, g.dx, ww / 2 + 22)) continue; win(c, wx, y, ww, wh, F, V, o); out.push(wx); } return out; };

/** ground-floor shopfront: tall display windows between pilasters, stall-riser panels below the glass, skipping the door bay */
function shopfront(c, g, F, V, y, h, o = {}) { const { x, w } = g, n = o.n || Math.max(2, Math.round(w / 90)), pad = o.pad ?? 10, gap = o.gap ?? 12, ww = Math.floor((w - pad * 2 - gap * (n - 1)) / n);
  for (let i = 0; i < n; i++) { const wx = x + pad + i * (ww + gap); let a = wx, b2 = wx + ww;
    if (g.dx != null && g.dx + 22 > a && g.dx - 22 < b2) { if (g.dx - a > b2 - g.dx) b2 = g.dx - 24; else a = g.dx + 24; }
    if (b2 - a < 22) continue;
    win(c, a, y, b2 - a, h - 12, F, V, { panes: o.panes || [Math.max(1, Math.round((b2 - a) / 30)), 1], curtains: !!o.curtains, sill: false, inner: o.inner, frame: o.frame, box: false });
    R(c, a - 3, y + h - 9, b2 - a + 6, 10, INK); R(c, a - 2, y + h - 8, b2 - a + 4, 8, o.riser || shade(F.trim, 0.85)); R(c, a - 2, y + h - 8, b2 - a + 4, 1, shade(o.riser || F.trim, 1.1)); R(c, a + 2, y + h - 6, b2 - a - 4, 4, shade(o.riser || F.trim, 0.72)); }
}
function stringCourse(c, x, y, w, col) { R(c, x - 3, y - 1, w + 6, 6, INK); R(c, x - 2, y, w + 4, 4, col); R(c, x - 2, y, w + 4, 1, shade(col, 1.3)); A(c, 0.3, () => R(c, x, y + 5, w, 2, '#0a0e1e')); }

P.cafe = {
  paint(c, b, F, V, g) { const { x, y, w, base } = g, top = y + 34;
    dropShadow(c, x, base, w);
    chimney(c, x + w - 46, y - 6, 34, '#8a3a26');
    wall(c, x, top, w, base - top, F.wall, 'brick', V);
    gable(c, x - 8, x + w + 8, top + 2, y - 10, F.roof, { style: 'tile', fascia: '#3a160e' });
    sign(c, x + w / 2, y + 2, b.name || 'CAFE', F, V, { maxW: w - 24, icon: 'cup', iconPal: { a: F.sign, w: '#ffffff', b: F.accent } });
    const up = (cc, wx, wy, ww, wh) => { R(cc, wx + ww / 2 - 3, wy + 4, 6, 4, '#ffe08a'); R(cc, wx + ww / 2, wy, 1, 4, INK); };
    for (const wx of [x + 22, x + w / 2 - 15, x + w - 52]) win(c, wx, top + 14, 30, 26, F, V, { panes: [2, 2], box: true, frame: '#fff1d8', inner: up });
    stringCourse(c, x, top + 58, w, '#e8c8a0');
    awning(c, x + 4, top + 70, w - 8, '#e0503a', '#fff1d8', { h: 14 });
    const pastries = (cc, wx, wy, ww, wh) => { R(cc, wx + 2, wy + wh - 8, ww - 4, 3, '#7a4a2a'); R(cc, wx + 2, wy + wh - 5, ww - 4, 5, '#c8a070'); for (let i = 4; i < ww - 6; i += 9) { R(cc, wx + i, wy + wh - 13, 6, 5, i % 2 ? '#f4c27a' : '#ff9ab8'); R(cc, wx + i + 1, wy + wh - 14, 4, 1, '#fff1d8'); } R(cc, wx + 4, wy + 6, ww - 8, 1, '#7a4a2a'); for (let i = 6; i < ww - 8; i += 7) R(cc, wx + i, wy + 2, 4, 4, '#ffffff'); };
    shopfront(c, g, F, V, top + 92, base - top - 98, { inner: pastries, frame: '#fff1d8', riser: '#5a2218', n: 2 });
    if (g.dx != null) door(c, g.dx, base, F, V, { w: 26, h: 40, col: '#7a3a1e' });
    for (const tx of [x + 10, x + w - 46]) if (away(tx + 18, g.dx, 44)) { // parasol table + chairs
      R(c, tx + 17, base - 40, 2, 30, INK); R(c, tx + 2, base - 46, 32, 4, INK); for (let i = 0; i < 30; i += 6) R(c, tx + 3 + i, base - 49 + Math.abs(i - 15) / 6, 6, 5, (i / 6) % 2 ? '#fff1d8' : '#e0503a');
      R(c, tx + 8, base - 14, 20, 3, INK); R(c, tx + 9, base - 14, 18, 2, '#fff1d8'); R(c, tx + 17, base - 12, 2, 12, INK);
      for (const cx of [tx + 2, tx + 29]) { R(c, cx, base - 18, 5, 8, INK); R(c, cx + 1, base - 17, 3, 6, '#b04a2a'); R(c, cx, base - 10, 1, 10, INK); R(c, cx + 4, base - 10, 1, 10, INK); }
      R(c, tx + 12, base - 18, 4, 4, '#ffffff'); R(c, tx + 13, base - 17, 2, 1, '#7a4a2a'); }
    if (g.dx != null) aFrame(c, g.dx + 22, base, 'MENU', '#2a1a14');
  },
  anim(c, b, F, t, g) { steam(c, g.x + g.w - 40, g.y - 14, t, 4, '#e8e8f0'); if (g.dx != null) steam(c, g.dx - 40 > g.x ? g.x + 26 : g.x + g.w - 30, g.base - 22, t * 1.3, 2, '#ffffff'); },
};

P.shop = {
  paint(c, b, F, V, g) { const { x, y, w, base } = g, top = y + 30;
    dropShadow(c, x, base, w);
    roofBand(c, x - 6, y + 2, w + 12, 30, F.roof, { style: 'shingle' });
    wall(c, x, top, w, base - top, F.wall, 'plank', V, { ph: 7 });
    sign(c, x + w / 2, y - 8, b.name || 'SHOP', F, V, { maxW: w - 20, icon: 'sofa', iconPal: { a: F.sign, b: F.accent, w: '#ffffff' } });
    winRow(c, g, F, V, top + 12, 30, 24, 4, { panes: [2, 2], box: true, frame: F.trim });
    stringCourse(c, x, top + 50, w, shade(F.wall, 0.7));
    awning(c, x + 6, top + 60, w - 12, F.accent, F.trim, { h: 12 });
    const furn = (cc, wx, wy, ww, wh) => { R(cc, wx + 4, wy + wh - 14, ww - 8, 10, '#d86a4a'); R(cc, wx + 4, wy + wh - 18, ww - 8, 5, '#b04a2a'); R(cc, wx + 6, wy + wh - 4, 2, 3, INK); R(cc, wx + ww - 8, wy + wh - 4, 2, 3, INK); R(cc, wx + ww / 2 - 3, wy + 6, 6, 6, '#ffe08a'); R(cc, wx + ww / 2, wy + 2, 1, 4, INK); };
    shopfront(c, g, F, V, top + 82, base - top - 88, { inner: furn, n: 3, riser: shade(F.roof, 1.1) });
    if (g.dx != null) door(c, g.dx, base, F, V, { w: 26, h: 38, col: '#1e5a50', glass: true });
    shrub(c, x + 4, base, 1); shrub(c, x + w - 18, base, 1);
  },
  still: true,
};

const fashionPaint = (iconName, doorSide) => function (c, b, F, V, g) { const { x, y, w, base } = g, top = y + 26;
  dropShadow(c, x, base, w);
  roofBand(c, x - 4, y + 4, w + 8, 24, F.roof, { style: 'tile' });
  for (let i = 0; i < w + 8; i += 16) { R(c, x - 4 + i, y - 2, 12, 7, INK); R(c, x - 3 + i, y - 1, 10, 6, F.accent); R(c, x - 3 + i, y - 1, 10, 1, shade(F.accent, 1.2)); } // crenel scallops
  wall(c, x, top, w, base - top, F.wall, 'stucco', V);
  for (let i = 8; i < w; i += 22) R(c, x + i, top + 6, 2, base - top - 20, shade(F.wall, 0.88)); // pilasters
  sign(c, x + w / 2, y - 16, b.name || 'BOUTIQUE', F, V, { maxW: w + 12, icon: iconName, iconPal: { a: F.sign, b: F.accent, w: '#ffffff', y: GOLD_L } });
  awning(c, x + 4, top + 8, w - 8, F.accent, '#ffffff', { h: 14, stripe: 8 });
  const mannequins = (cc, wx, wy, ww, wh) => { const cols = [F.accent, '#7ad8ff', '#ffe08a'];
    for (let i = 0, mx = wx + 6; mx < wx + ww - 10; mx += 16, i++) { R(cc, mx + 3, wy + 6, 4, 4, '#f4d8c8'); R(cc, mx, wy + 10, 10, 14, cols[i % 3]); R(cc, mx + 1, wy + 24, 8, 4, shade(cols[i % 3], 0.75)); R(cc, mx + 4, wy + 28, 2, wh - 30, INK); } };
  const ws = winRow(c, g, F, V, top + 34, w > 220 ? 58 : 48, 46, 2 + (w > 220 ? 1 : 0), { panes: [1, 1], curtains: true, inner: mannequins, frame: '#ffffff' });
  stringCourse(c, x, top + 96, w, '#ffffff');
  const racks = (cc, wx, wy, ww, wh) => { R(cc, wx + 3, wy + 8, ww - 6, 2, '#c0c0c8'); for (let i = 5; i < ww - 6; i += 5) R(cc, wx + i, wy + 10, 4, 14 + (i % 3) * 2, ['#ff8ac8', '#7ad8ff', '#ffe08a', '#ffffff'][(i / 5) % 4 | 0]); R(cc, wx + 2, wy + wh - 6, ww - 4, 6, '#f4e8f0'); };
  shopfront(c, g, F, V, top + 108, base - top - 112, { inner: racks, frame: '#ffffff', riser: F.roof, n: 2 });
  if (doorSide && g.dx != null) door(c, g.dx, base, F, V, { w: 26, h: 38, glass: true, col: F.roof, frame: '#ffffff' });
  for (const hx of [x + 2, x + w - 12]) { R(c, hx, top + 20, 10, 18, INK); R(c, hx + 1, top + 21, 8, 16, F.roof); icon(c, 'hanger', hx + 1, top + 25, 0.9, { a: F.trim }); }
  shrub(c, x + w / 2 - 7, base, 0.9, '#ffffff'); void ws;
};
P.fashion = { paint: fashionPaint('hanger', false), anim(c, b, F, t, g) { bunting(c, g.x + 4, g.x + g.w - 4, g.y + 28, [F.accent, '#ffffff', '#7ad8ff', '#ffe08a'], t, true); } };
P.designer = { paint: fashionPaint('crown', true), anim: P.fashion.anim };

P.launch = {
  paint(c, b, F, V, g) { const { x, y, w, base } = g, top = y + 30;
    dropShadow(c, x, base, w);
    // barrel-vault hangar roof
    for (let i = 0; i <= 24; i++) { const hw = Math.round((w / 2 + 6) * Math.sqrt(1 - Math.pow((24 - i) / 25, 2))); R(c, x + w / 2 - hw - 2, y + 6 + i, hw * 2 + 4, 1, INK); R(c, x + w / 2 - hw, y + 6 + i, hw, 1, shade(F.roof, 1.15)); R(c, x + w / 2, y + 6 + i, hw, 1, F.roof); }
    for (let i = x + 12; i < x + w - 8; i += 16) R(c, i, y + 12, 1, 18, shade(F.roof, 0.7));
    wall(c, x, top, w, base - top, F.wall, 'panel', V);
    // control tower + beacon mast
    const tx = x + w - 54; R(c, tx - 2, y - 38, 34, 46, INK); panels(c, tx, y - 36, 30, 44, shade(F.wall, 1.1), { pw: 15, ph: 11 }); win(c, tx + 4, y - 32, 22, 10, F, V, { curtains: false, sill: false, panes: [3, 1] }); R(c, tx + 14, y - 52, 2, 16, INK); R(c, tx + 9, y - 40, 12, 4, '#c0c8d8');
    sign(c, x + w / 2 - 24, y - 26, b.name || 'LAUNCH HALL', F, V, { maxW: w - 120, icon: 'rocket', iconPal: { a: '#e8f0ff', w: '#7ec8ff', b: INK, r: '#ff5a3a', y: '#ffd84a' } });
    // LED board
    R(c, x + 22, top + 12, w - 44, 22, INK); R(c, x + 24, top + 14, w - 48, 18, '#06122e'); for (let i = x + 26; i < x + w - 26; i += 3) for (let j = top + 16; j < top + 31; j += 3) R(c, i, j, 1, 1, '#14306a');
    ptext(c, 'NEXT LAUNCH', x + w / 2, top + 23, '#7ec8ff', 1, null); emit(x + 24, top + 14, w - 48, 18, '#2a5aaa', 0.35);
    // hangar bay doors with hazard stripes, side windows
    for (const [bx, bw] of [[x + 20, 74], [x + w - 94, 74]]) { if (!away(bx + bw / 2, g.dx, bw / 2 + 18)) continue;
      R(c, bx - 2, top + 44, bw + 4, base - top - 46, INK); for (let j = top + 46; j < base - 10; j += 6) { R(c, bx, j, bw, 5, '#5a6a88'); R(c, bx, j, bw, 1, '#8a9ab8'); }
      for (let i = 0; i < bw; i += 8) { R(c, bx + i, base - 10, 4, 6, '#ffd84a'); R(c, bx + i + 4, base - 10, 4, 6, INK); } }
    if (g.dx != null) door(c, g.dx, base, F, V, { w: 30, h: 40, glass: true, double: true, col: F.roof, frame: '#c0c8d8' });
    for (let i = x + 104; i < x + w - 104; i += 26) if (away(i + 8, g.dx, 30)) { R(c, i - 2, top + 50, 20, 20, INK); R(c, i, top + 52, 16, 16, '#c0c8d8'); R(c, i + 2, top + 54, 12, 12, V.night ? '#ffe08a' : '#7ec8ff'); emit(i + 2, top + 54, 12, 12, '#ffc860', 0.45); if (!V.night) R(c, i + 4, top + 56, 3, 3, '#ffffff'); }
    R(c, x + 100, top + 84, w - 200, 4, '#ffd84a'); R(c, x + 100, top + 90, w - 200, 2, '#7ec8ff');
    for (const sx of [x + 6, x + w - 14]) { R(c, sx - 1, top + 40, 10, base - top - 52, INK); R(c, sx, top + 41, 8, base - top - 54, '#c0c8d8'); for (let j = top + 44; j < base - 14; j += 8) R(c, sx + 2, j, 4, 4, '#ff5a3a'); }
  },
  anim(c, b, F, t, g) { const tx = g.x + g.w - 54; if ((t * 1.6) % 1 < 0.5) { R(c, tx + 13, g.y - 56, 4, 4, '#ff4a4a'); A(c, 0.35, () => R(c, tx + 9, g.y - 60, 12, 12, '#ff4a4a')); } else R(c, tx + 13, g.y - 56, 4, 4, '#6a1a1a');
    const top = g.y + 30, n = Math.floor((g.w - 52) / 3), k = Math.floor(t * 18) % n; for (let d = 0; d < 6; d++) R(c, g.x + 26 + ((k + d * 7) % n) * 3, top + 16 + ((d * 5) % 5) * 3, 1, 1, '#ffd84a'); },
};

const carsPaint = (lux) => function (c, b, F, V, g) { const { x, y, w, base } = g, top = y + 18;
  dropShadow(c, x, base, w);
  R(c, x - 6, y + 2, w + 12, 18, INK); R(c, x - 4, y + 4, w + 8, 14, F.roof); R(c, x - 4, y + 4, w + 8, 2, shade(F.roof, 1.8)); // flat slab roof
  for (let i = 0; i < w + 8; i += 14) { R(c, x - 4 + i, y + 8, 7, 6, F.accent); R(c, x + 3 + i, y + 8, 7, 6, lux ? GOLD_D : '#f0f0f4'); } // racing chevron fascia
  wall(c, x, top, w, base - top, F.wall, 'panel', V, { pw: 32, ph: 18 });
  sign(c, x + w / 2, y - 20, b.name || 'MOTORS', F, V, { maxW: w - 40, icon: 'wheel', iconPal: { a: INK, w: '#d8dce8', b: '#5a5a6a', y: lux ? GOLD_L : '#ff3a3a' } });
  // full-height showroom glass with three cars
  const sx = x + 14, sw = w - (g.dx != null && g.dx < x + w / 2 ? 0 : 0) - 110, sy = top + 16, sh = base - sy - 14;
  const showroom = (cc, wx, wy, ww, wh) => { const bk = V.night ? '#5a4a38' : '#3a3e52'; R(cc, wx, wy + 14, ww, wh - 14, bk); R(cc, wx, wy + 14, ww, 2, shade(bk, 0.7));
    for (let i = 10; i < ww - 10; i += 30) { R(cc, wx + i, wy + 14, 8, 3, '#c0c0c8'); A(cc, 0.25, () => { for (let k = 0; k < wh - 30; k += 2) R(cc, wx + i + 4 - k / 6, wy + 17 + k, 1 + k / 3, 2, '#fff4c0'); }); }
    R(cc, wx + 8, wy + 24, 34, 20, '#c8282e'); ptext(cc, 'SALE', wx + 25, wy + 34, '#ffffff', 1, null); R(cc, wx + ww - 44, wy + 24, 34, 20, lux ? GOLD : '#ffd84a'); ptext(cc, 'NEW', wx + ww - 27, wy + 34, INK, 1, null);
    for (let i = 0; i < ww; i += 12) R(cc, wx + i, wy + wh - 12, 6, 4, (i / 12) % 2 ? '#d8dce8' : '#9aa0b4');
    R(cc, wx, wy + wh - 8, ww, 8, '#c8ccd8'); R(cc, wx, wy + wh - 8, ww, 1, '#ffffff');
    const cols = lux ? ['#e3b341', '#f0f0f4', '#c8282e'] : ['#e83a3a', '#3a8ae8', '#ffd84a'];
    for (let i = 0; i < 3; i++) { const cw = Math.round((ww - 16) / 3 - 6), cx = Math.round(wx + 8 + i * ((ww - 16) / 3)), cy = wy + wh - 30, col = cols[i];
      R(cc, cx, cy + 8, cw, 14, INK); R(cc, cx + 1, cy + 9, cw - 2, 12, col); R(cc, cx + 1, cy + 9, cw - 2, 2, shade(col, 1.35)); R(cc, cx + 1, cy + 17, cw - 2, 4, shade(col, 0.7));
      R(cc, cx + Math.round(cw * 0.22), cy, Math.round(cw * 0.56), 9, INK); R(cc, cx + Math.round(cw * 0.22) + 2, cy + 2, Math.round(cw * 0.56) - 4, 6, '#bfe4ff'); R(cc, cx + Math.round(cw * 0.22) + 3, cy + 3, 3, 2, '#ffffff');
      R(cc, cx + cw - 3, cy + 11, 2, 3, '#ffe08a'); R(cc, cx + 1, cy + 11, 2, 3, '#ff5a3a');
      for (const wxx of [cx + 3, cx + cw - 12]) { R(cc, wxx, cy + 17, 9, 9, INK); R(cc, wxx + 2, cy + 19, 5, 5, '#5a5a6a'); R(cc, wxx + 3, cy + 20, 3, 3, '#d8dce8'); } } };
  win(c, sx, sy, sw, sh, F, V, { panes: [4, 1], curtains: false, sill: false, inner: showroom, frame: lux ? GOLD : '#d8dce8' });
  // service bay roll-up door
  const bx = x + w - 84; R(c, bx - 2, top + 22, 72, base - top - 22, INK); R(c, bx, top + 26, 68, 10, F.accent); ptext(c, 'SERVICE', bx + 34, top + 31, '#ffffff', 1, INK);
  for (let j = top + 38; j < base - 2; j += 5) { R(c, bx, j, 68, 4, '#8a8e9e'); R(c, bx, j, 68, 1, '#b8bcc8'); }
  if (g.dx != null && !lux) door(c, g.dx, base, F, V, { w: 26, h: 36, glass: true, col: F.roof, steps: 1, lamps: false, frame: '#d8dce8' });
  if (g.dx != null && lux) door(c, g.dx, base, F, V, { w: 26, h: 36, glass: true, col: F.roof, steps: 1, lamps: true, frame: GOLD });
  for (const fx of [x - 10, x + w + 4]) flagpole(c, fx + 3, base, 64);
};
const carsAnim = (c, b, F, t, g) => { for (const [i, fx] of [g.x - 7, g.x + g.w + 7].entries()) wavingFlag(c, { x: fx + 1, y: g.base - 62, col: F.accent, col2: i ? '#ffffff' : INK }, t + i, 14, 9);
  bunting(c, g.x + 10, g.x + g.w - 90, g.y + 30, [F.accent, '#ffffff', F.glow], t, true); };
P.cars = { paint: carsPaint(false), anim: carsAnim };
P.luxauto = { paint: carsPaint(true), anim: carsAnim };

P.academy = {
  paint(c, b, F, V, g) { const { x, y, w, base } = g, top = y + 40, cx = x + w / 2;
    dropShadow(c, x, base, w);
    gable(c, x - 8, x + w + 8, top + 2, y + 6, F.roof, { style: 'shingle' });
    // bell cupola
    R(c, cx - 14, y - 18, 28, 26, INK); R(c, cx - 12, y - 16, 24, 24, F.trim); R(c, cx - 7, y - 12, 14, 14, '#2a2a3a'); R(c, cx - 4, y - 10, 8, 8, GOLD); R(c, cx - 1, y - 2, 2, 3, GOLD_D);
    gable(c, cx - 18, cx + 18, y - 16, y - 32, F.roof, { style: 'shingle' }); flagpole(c, cx, y - 34, 16);
    wall(c, x, top, w, base - top, F.wall, 'brick', V, { bw: 12 });
    sign(c, cx, top + 6, b.name || 'ACADEMY', F, V, { maxW: w - 20, icon: 'cap', iconPal: { a: INK, b: '#3a3a4a', y: GOLD_L } });
    winRow(c, g, F, V, top + 38, 30, 34, 4, { panes: [2, 3], curtains: false, arch: true });
    if (g.dx != null) door(c, g.dx, base, F, V, { w: 30, h: 40, double: true, col: '#5a2e14' });
    shrub(c, x + 6, base, 1); shrub(c, x + w - 20, base, 1);
  },
  anim(c, b, F, t, g) { wavingFlag(c, { x: g.x + g.w / 2 + 2, y: g.y - 50, col: F.accent, col2: '#ffffff' }, t, 14, 8); },
};

P.jewel = {
  paint(c, b, F, V, g) { const { x, y, w, base } = g, top = y + 30, cx = x + w / 2;
    dropShadow(c, x, base, w);
    R(c, x - 6, y + 10, w + 12, 22, INK); stoneBlocks(c, x - 4, y + 12, w + 8, 18, shade(F.wall, 1.25), { bw: 16, bh: 6 }); R(c, x - 4, y + 12, w + 8, 2, GOLD); R(c, x - 4, y + 28, w + 8, 2, GOLD_D); // cornice
    wall(c, x, top, w, base - top, F.wall, 'stone', V);
    for (const px of [x + 4, x + w - 12]) { R(c, px - 1, top, 10, base - top, INK); R(c, px, top, 8, base - top, shade(F.wall, 1.3)); R(c, px + 2, top, 1, base - top, shade(F.wall, 1.6)); R(c, px, top, 8, 3, GOLD); R(c, px, base - 8, 8, 3, GOLD); }
    sign(c, cx, y - 18, b.name || 'JEWELLER', F, V, { maxW: w + 30, icon: 'diamond', iconPal: { a: '#9fd8ff', w: '#ffffff', b: '#4a8ad0' } });
    R(c, cx - 15, top + 6, 30, 22, INK); R(c, cx - 14, top + 7, 28, 20, F.signBg); icon(c, 'diamond', cx - 9, top + 9, 2, { a: '#9fd8ff', w: '#ffffff', b: '#4a8ad0' });
    const gems = (cc, wx, wy, ww, wh) => { for (let i = 0; i < 3; i++) { const px = wx + 6 + i * ((ww - 12) / 3); R(cc, px, wy + wh - 12, 10, 8, '#2a1a3a'); R(cc, px + 2, wy + wh - 14, 6, 3, ['#ff5a8a', '#7ad8ff', '#ffe08a'][i]); R(cc, px + 3, wy + wh - 15, 2, 1, '#ffffff'); } };
    for (const wx of [x + 24, x + w - 54]) win(c, wx, top + 8, 30, 30, F, V, { panes: [2, 2], arch: true, frame: GOLD, curtains: true });
    stringCourse(c, x, top + 52, w, GOLD);
    R(c, x + 10, top + 64, w - 20, 14, INK); R(c, x + 11, top + 65, w - 22, 12, F.signBg); ptext(c, 'FINE GEMS - GOLD - PEARLS', cx, top + 71, '#c8ecff', 1, null);
    shopfront(c, g, F, V, top + 86, base - top - 92, { inner: gems, frame: GOLD, riser: F.roof, n: 2, curtains: true });
    shrub(c, cx - 7, base, 0.9, '#d0d4e0');
  },
  anim(c, b, F, t, g) { const cx = g.x + g.w / 2, top = g.y + 30; twinkle(c, cx + 5, top + 11, t, 0); twinkle(c, cx - 6, top + 16, t, 2.1, '#cfefff'); twinkle(c, g.x + 30, g.y - 10, t, 4, '#ffe08a'); },
};

P.goldden = {
  paint(c, b, F, V, g) { const { x, y, w, base } = g, top = y + 34, cx = x + w / 2;
    dropShadow(c, x, base, w);
    gable(c, x - 8, x + w + 8, top + 2, y - 4, F.roof, { style: 'shingle' });
    wall(c, x, top, w, base - top, F.wall, 'plank', V, { ph: 8, vertical: true });
    for (const px of [x, x + w - 8]) { R(c, px, top, 8, base - top, '#5a3818'); R(c, px + 1, top, 1, base - top, '#7a5028'); }
    R(c, x, top + 2, w, 6, '#5a3818'); // timber beam
    sign(c, cx, y + 2, b.name || 'FURNITURE', F, V, { maxW: w + 10, icon: 'chair', iconPal: { a: F.sign, b: F.accent } });
    const thrones = (cc, wx, wy, ww, wh) => { for (const tx of [wx + 6, wx + ww - 20]) { R(cc, tx, wy + 8, 14, wh - 12, INK); R(cc, tx + 1, wy + 9, 12, wh - 14, '#c8282e'); R(cc, tx + 1, wy + 9, 12, 3, GOLD_L); R(cc, tx - 1, wy + wh - 14, 16, 4, GOLD); } };
    for (const wx of [x + 22, x + w / 2 - 15, x + w - 52]) win(c, wx, top + 14, 30, 26, F, V, { panes: [2, 2], box: true, frame: F.accent });
    stringCourse(c, x, top + 56, w, '#5a3818');
    awning(c, x + 6, top + 66, w - 12, '#8a3a1a', '#ffd878', { h: 12 });
    shopfront(c, g, F, V, top + 88, base - top - 94, { inner: thrones, frame: F.accent, riser: '#5a3818', n: 2 });
    shrub(c, x + 4, base, 1); shrub(c, x + w - 18, base, 1);
  },
  still: true,
};

P.office = {
  paint(c, b, F, V, g) { const { x, y, w, base } = g, top = y + 34, cx = x + w / 2;
    dropShadow(c, x, base, w);
    wall(c, x, top, w, base - top, F.wall, 'stone', V, { bw: 20, bh: 10 });
    // pediment
    for (let i = 0; i <= 26; i++) { const hw = Math.round(((w / 2 - 20) * i) / 26); R(c, cx - hw - 2, y + 8 + i, hw * 2 + 4, 1, INK); R(c, cx - hw, y + 8 + i, hw * 2, 1, i > 1 ? '#f0e8d0' : GOLD); }
    R(c, x + 10, y + 34, w - 20, 6, INK); R(c, x + 12, y + 34, w - 24, 4, GOLD); icon(c, 'star', cx - 9, y + 16, 2, { a: GOLD });
    sign(c, cx, top + 6, b.name || 'OFFICE', F, V, { maxW: w - 40, icon: 'star', iconPal: { a: GOLD_L } });
    for (let i = 0; i < 6; i++) { const px = x + 24 + i * ((w - 56) / 5); if (!away(px + 5, g.dx, 24)) continue; R(c, px - 2, top + 34, 14, base - top - 40, INK); R(c, px, top + 34, 10, base - top - 40, '#f4ecd8'); R(c, px + 3, top + 34, 1, base - top - 40, '#d8ccb0'); R(c, px + 7, top + 34, 1, base - top - 40, '#d8ccb0'); R(c, px - 3, top + 32, 16, 4, '#e8dcc0'); R(c, px - 3, base - 8, 16, 4, '#e8dcc0'); }
    if (g.dx != null) door(c, g.dx, base, F, V, { w: 32, h: 40, double: true, col: '#3a1e10', steps: 3 }); else door(c, cx, base, F, V, { w: 32, h: 40, double: true, col: '#3a1e10', steps: 3 });
    for (const fx of [x + 6, x + w - 8]) flagpole(c, fx, top + 30, 50);
  },
  anim(c, b, F, t, g) { const top = g.y + 34; wavingFlag(c, { x: g.x + 7, y: top - 20, col: '#1f2d5c', col2: '#c8282e' }, t, 16, 10); wavingFlag(c, { x: g.x + g.w - 7, y: top - 20, col: GOLD, col2: '#ffffff' }, t + 1.3, 16, 10); },
};

P.petshop = {
  paint(c, b, F, V, g) { const { x, y, w, base } = g, top = y + 30, cx = x + w / 2;
    dropShadow(c, x, base, w);
    roofBand(c, x - 6, y + 4, w + 12, 28, F.roof, { style: 'tile' });
    for (let i = x; i < x + w; i += 26) { R(c, i - 1, y - 3, 20, 9, INK); icon(c, 'bone', i, y - 4, 2, { a: '#fff4e0' }); } // bone ridge
    wall(c, x, top, w, base - top, F.wall, 'plank', V, { ph: 7 });
    sign(c, cx, y - 24, b.name || 'PET SHOP', F, V, { maxW: w + 10, icon: 'paw', iconPal: { a: '#fff0a0' } });
    awning(c, x + 4, top + 8, w - 8, F.accent, '#ffffff', { h: 12, stripe: 9 });
    const pups = (cc, wx, wy, ww, wh) => { R(cc, wx + 2, wy + wh - 8, ww - 4, 6, '#d8a060'); for (const [i, col] of [[0, '#f0c890'], [1, '#ffffff']]) { const px = wx + 6 + i * (ww / 2 - 2); R(cc, px, wy + wh - 16, 14, 9, INK); R(cc, px + 1, wy + wh - 15, 12, 7, col); R(cc, px + 8, wy + wh - 22, 8, 8, INK); R(cc, px + 9, wy + wh - 21, 6, 6, col); R(cc, px + 9, wy + wh - 23, 2, 3, INK); R(cc, px + 14, wy + wh - 23, 2, 3, INK); R(cc, px + 11, wy + wh - 19, 1, 1, INK); R(cc, px + 13, wy + wh - 19, 1, 1, INK); } };
    winRow(c, g, F, V, top + 32, 52, 40, 2, { panes: [1, 1], curtains: false, inner: pups, box: true });
    stringCourse(c, x, top + 92, w, '#ffffff');
    const toys = (cc, wx, wy, ww, wh) => { for (let i = 4; i < ww - 8; i += 12) { R(cc, wx + i, wy + wh - 10, 8, 8, ['#ff5a5a', '#ffd84a', '#3a8ae8'][(i / 12) % 3 | 0]); R(cc, wx + i + 2, wy + wh - 9, 2, 2, '#ffffff'); } icon(cc, 'bone', wx + 4, wy + 4, 1, { a: '#fff4e0' }); };
    shopfront(c, g, F, V, top + 104, base - top - 108, { inner: toys, riser: F.roof, n: 2 });
    if (g.dx != null) door(c, g.dx, base, F, V, { w: 26, h: 36, col: '#1e5860', glass: true });
    R(c, x + 6, base - 10, 14, 10, INK); R(c, x + 7, base - 9, 12, 8, '#3a8ae8'); R(c, x + 9, base - 7, 8, 3, '#7ad8ff'); ptext(c, 'H2O', x + 13, base - 14, '#ffffff', 1, INK); // water bowl
  },
  anim(c, b, F, t, g) { const top = g.y + 30, gap = (g.w - 104) / 3; for (let i = 0; i < 2; i++) { const wx = Math.round(g.x + gap + i * (52 + gap)); if (!away(wx + 26, g.dx, 48)) continue; for (let p = 0; p < 2; p++) { const px = wx + 6 + p * 24, wag = Math.round(Math.sin(t * 9 + p * 2 + i)); R(c, px - 3, top + 32 + 40 - 16 + wag, 3, 2, p ? '#ffffff' : '#f0c890'); } } },
};

P.cosy = {
  paint(c, b, F, V, g) { const { x, y, w, base } = g, top = y + 44, cx = x + w / 2;
    dropShadow(c, x, base, w);
    chimney(c, x + w - 38, y + 2, 30, '#8a4a2a');
    wall(c, x, top, w, base - top, F.wall, 'plank', V, { ph: 6 });
    gable(c, x - 8, x + w + 8, top + 2, y + 2, F.roof, { style: 'shingle' });
    sign(c, cx, top + 4, b.name || 'COSY', F, V, { maxW: w + 30, icon: 'lamp', iconPal: { a: F.accent, y: '#fff0a0', b: INK } });
    for (const wx of [x + 10, x + w - 40]) win(c, wx, top + 40, 30, 30, F, V, { panes: [2, 2], curtains: true, box: true });
    door(c, cx, base, F, V, { w: 24, h: 34, col: '#6a3a1a' });
  },
  anim(c, b, F, t, g) { steam(c, g.x + g.w - 32, g.y - 6, t * 0.8, 4, '#c8c8d0'); },
};

P.royal = {
  paint(c, b, F, V, g) { const { x, y, w, base } = g, top = y + 40, cx = x + w / 2;
    dropShadow(c, x, base, w);
    roofBand(c, x - 6, y + 8, w + 12, 34, F.roof, { style: 'shingle' }); // mansard
    for (const dx of [x + 24, x + w - 48]) { R(c, dx - 2, y + 8, 28, 26, INK); R(c, dx, y + 10, 24, 22, F.wall); win(c, dx + 5, y + 16, 14, 12, F, V, { curtains: false, sill: false, panes: [1, 2] }); gable(c, dx - 2, dx + 26, y + 10, y - 2, F.roof); }
    R(c, x - 6, y + 4, w + 12, 4, GOLD); for (let i = 0; i < w + 12; i += 6) R(c, x - 6 + i, y + 1, 3, 3, GOLD_L); // gilt cresting
    wall(c, x, top, w, base - top, F.wall, 'stone', V, { bw: 16, bh: 8 });
    sign(c, cx, top + 4, b.name || 'ROYAL', F, V, { maxW: w + 10, icon: 'crown', iconPal: { a: GOLD_L, r: '#c8282e', w: '#9fd8ff', b: GOLD_D } });
    for (const wx of [x + 18, x + w - 50]) win(c, wx, top + 40, 32, 36, F, V, { panes: [2, 3], curtains: true, arch: true, frame: GOLD, box: true });
    door(c, cx, base, F, V, { w: 28, h: 36, double: true, col: '#3a1050', frame: GOLD });
    R(c, cx - 30, base - 4, 60, 4, '#a01a2a'); // red carpet
  },
  anim(c, b, F, t, g) { twinkle(c, g.x + g.w / 2 - 20, g.y + 2, t, 0, '#fff4c0'); twinkle(c, g.x + g.w / 2 + 24, g.y + 3, t, 2.4, '#fff4c0'); },
};

P.clubhouse = {
  paint(c, b, F, V, g) { const { x, y, w, base } = g, top = y + 40, cx = x + w / 2;
    dropShadow(c, x, base, w);
    chimney(c, x + 24, y - 2, 30, '#6a6070');
    wall(c, x, top, w, base - top, F.wall, 'plank', V, { ph: 8 });
    for (let j = top + 4; j < base - 6; j += 8) { R(c, x - 4, j, 5, 7, INK); R(c, x - 3, j + 1, 4, 5, shade(F.wall, 1.2)); R(c, x + w - 1, j, 5, 7, INK); R(c, x, j + 1, 1, 1, '#5a3018'); } // log ends
    gable(c, x - 10, x + w + 10, top + 2, y - 2, F.roof, { style: 'shingle' });
    R(c, cx - 16, y + 12, 32, 22, INK); R(c, cx - 15, y + 13, 30, 20, F.signBg); icon(c, 'paw', cx - 9, y + 15, 2, { a: F.accent });
    sign(c, cx, top + 6, b.name || 'PACK CLUBHOUSE', F, V, { maxW: w - 10, icon: 'paw', iconPal: { a: F.accent } });
    winRow(c, g, F, V, top + 34, 32, 28, 4, { panes: [2, 2], curtains: true, box: true });
    door(c, g.dx ?? cx, base, F, V, { w: 28, h: 36, col: '#4a2a14' });
    for (let i = 0; i < 3; i++) { R(c, x + w - 36 + i * 8, base - 10 - (i % 2) * 6, 8, 10 + (i % 2) * 6, INK); R(c, x + w - 35 + i * 8, base - 9 - (i % 2) * 6, 6, 9 + (i % 2) * 6, '#8a5a30'); } // firewood
  },
  anim(c, b, F, t, g) { steam(c, g.x + 30, g.y - 10, t * 0.7, 4, '#b8b8c4'); },
};

P.bank = {
  paint(c, b, F, V, g) { const { x, y, w, base } = g, top = y + 36, cx = x + w / 2;
    dropShadow(c, x, base, w);
    wall(c, x, top, w, base - top, F.wall, 'stone', V, { bw: 20, bh: 10 });
    for (let i = 0; i <= 30; i++) { const hw = Math.round(((w / 2 + 6) * i) / 30); R(c, cx - hw - 2, y - 4 + i, hw * 2 + 4, 1, INK); R(c, cx - hw, y - 4 + i, hw * 2, 1, i > 1 ? (i > 27 ? '#b8ab90' : '#e8dcc0') : GOLD); }
    R(c, x - 8, y + 26, w + 16, 12, INK); R(c, x - 6, y + 28, w + 12, 8, F.roof); ptext(c, 'KIBBLE BANK', cx, y + 32, GOLD_L, 1, INK); // navy frieze
    R(c, cx - 11, y + 4, 22, 20, INK); icon(c, 'coin', cx - 9, y + 6, 2, { a: GOLD_D, w: GOLD_L, b: GOLD_D }); // seal
    for (let i = 0; i < 4; i++) { const px = x + 10 + i * ((w - 30) / 3); if (!away(px + 5, g.dx, 22)) continue; R(c, px - 2, top + 6, 14, base - top - 16, INK); R(c, px, top + 6, 10, base - top - 16, '#f4ecd8'); for (let k = 2; k < 10; k += 3) R(c, px + k, top + 8, 1, base - top - 20, '#c8bca0'); R(c, px - 3, top + 4, 16, 4, '#e8dcc0'); R(c, px - 3, base - 12, 16, 4, '#e8dcc0'); }
    for (const wx of [x + 26, x + w - 44]) if (away(wx + 9, g.dx, 26)) { win(c, wx, top + 18, 18, 40, F, V, { panes: [1, 3], curtains: false, arch: true, frame: '#e8dcc0', sill: true }); }
    plinth(c, x, base - 8, w, '#8a8070');
    door(c, g.dx ?? cx, base, F, V, { w: 26, h: 34, double: true, col: '#8a5a2a', steps: 2, frame: GOLD });
  },
  anim(c, b, F, t, g) { const s = (t * 0.5) % 1; if (s < 0.25) { const cx = g.x + g.w / 2, k = Math.floor(s * 4 * 18); R(c, cx - 9 + Math.min(17, k), g.y + 8 + Math.min(14, k / 1.3), 2, 2, '#ffffff'); } twinkle(c, g.x + g.w / 2 + 8, g.y + 6, t, 1, '#fff4c0'); },
};

P.arcade = {
  paint(c, b, F, V, g) { const { x, y, w, base } = g, top = y + 44, cx = x + w / 2;
    dropShadow(c, x, base, w);
    wall(c, x, top, w, base - top, F.wall, 'panel', V, { pw: 24, ph: 16 });
    // marquee crown
    R(c, x - 8, y - 4, w + 16, 50, INK); R(c, x - 6, y - 2, w + 12, 46, '#2c2258'); R(c, x - 6, y - 2, w + 12, 3, '#4a3a8a');
    for (let i = x - 2; i < x + w + 4; i += 8) { R(c, i, y + 1, 3, 3, '#6a4a2a'); R(c, i, y + 38, 3, 3, '#6a4a2a'); } // bulb sockets
    R(c, x + 10, y + 8, w - 20, 28, INK); R(c, x + 12, y + 10, w - 24, 24, '#3a0f4a');
    icon(c, 'joystick', x + 18, y + 12, 2, { a: '#3af0ff', r: '#ff4fd8', b: '#e8e8f0', y: '#ffe14a' });
    emit(x + 12, y + 10, w - 24, 24, '#ff4fd8', 0.3); ptext(c, 'INU', cx + 10, y + 16, '#ffe14a', 2, INK); ptext(c, 'ARCADE', cx + 10, y + 28, '#3af0ff', 1, INK);
    // cabinets in the windows
    const cabs = (cc, wx, wy, ww, wh) => { const cols = ['#ff4fd8', '#3af0ff', '#ffe14a', '#6aff7a']; R(cc, wx, wy, ww, wh, '#1a0e3a'); A(cc, 0.5, () => R(cc, wx, wy, ww, 10, '#5a2a9a')); R(cc, wx, wy + wh - 6, ww, 6, '#2a1a4a'); for (let i = 0; i + 2 < wh - 6; i += 6) R(cc, wx + (i % 12 ? 0 : 6), wy + wh - 6, 6, 3, '#3a2a6a');
      const n = Math.floor((ww - 4) / 18); for (let i = 0; i < n; i++) { const px = wx + 4 + i * 18, ch = Math.min(54, wh - 10), py = wy + wh - 6 - ch, col = cols[(i + (wx >> 3)) % 4];
        R(cc, px, py, 15, ch, INK); R(cc, px + 1, py + 1, 13, ch - 1, '#2c2258'); R(cc, px + 1, py + 1, 13, 4, col); R(cc, px + 2, py + 7, 11, 11, '#0a0a1a'); R(cc, px + 3, py + 8, 9, 9, shade(col, 0.5)); R(cc, px + 5, py + 11, 3, 3, col);
        R(cc, px + 1, py + 20, 13, 4, '#4a3a8a'); R(cc, px + 4, py + 19, 2, 2, '#ff4a4a'); R(cc, px + 9, py + 20, 2, 2, '#ffe14a'); R(cc, px + 3, py + 26, 9, ch - 28, '#241a48'); R(cc, px + 6, py + 29, 3, 2, '#ffe14a'); } };
    R(c, x + 4, top + 6, w - 8, 11, INK); R(c, x + 5, top + 7, w - 10, 9, '#0e0a24'); ptext(c, 'MUNCH STAR PUPS ROAD HOP BRICKS', cx, top + 11, '#ffe14a', 1, null);
    const night2 = { ...V, night: true };
    shopfront(c, g, { ...F, winGlow: '#7a3ad8' }, night2, top + 26, base - top - 30, { inner: cabs, frame: '#3af0ff', riser: '#2c2258', n: 2, pad: 10, gap: 8, panes: [1, 1] });
    R(c, (g.dx ?? cx) - 16, base - 62, 32, 12, INK); R(c, (g.dx ?? cx) - 15, base - 61, 30, 10, '#0e0a24'); ptext(c, 'OPEN', g.dx ?? cx, base - 56, '#6aff7a', 1, null);
    door(c, g.dx ?? cx, base, F, V, { w: 30, h: 40, glass: true, double: true, frame: '#ff4fd8', lamps: false });
    for (const sx of [x + 2, x + w - 6]) { R(c, sx, top + 4, 4, base - top - 8, INK); R(c, sx + 1, top + 4, 2, base - top - 8, '#ff4fd8'); }
  },
  anim(c, b, F, t, g) { const { x, y, w } = g, k = Math.floor(t * 8);
    let n = 0; for (let i = x - 2; i < x + w + 4; i += 8, n++) { const on = (n + k) % 3 === 0; R(c, i, y + 1, 3, 3, on ? '#ffe14a' : '#6a4a2a'); R(c, i, y + 38, 3, 3, (n + k + 1) % 3 === 0 ? '#ff4fd8' : '#6a4a2a'); }
    const fl = Math.sin(t * 17) > 0.95 ? 0.3 : 1; A(c, fl, () => ptext(c, 'ARCADE', x + w / 2 + 10, y + 28, '#3af0ff', 1, INK));
    const top = y + 44; A(c, 0.5 + 0.5 * Math.sin(t * 4), () => { R(c, x + 3, top + 4, 2, g.base - top - 8, '#ffc0f4'); R(c, x + w - 5, top + 4, 2, g.base - top - 8, '#ffc0f4'); }); },
};

// ---------------------------------------------------------------- homes (v2): four distinct houses on the 6x5 lots
// Shared front garden: lawn strip, stone path to the door, fence styles, owner nameplate. Door = interact tile (x+3).
export const HOME_F = Object.freeze({
  h1: { wall: '#f1e2c6', roof: '#c89a52', accent: '#ff8ab8', trim: '#fff6e6', signBg: '#5a3a22', sign: '#ffe8c0', glow: '#ffc078', curtain: '#ff9ac4', door: '#3f7a4a', style: 'cottage' },
  h2: { wall: '#3e4a6e', roof: '#262c44', accent: '#c8283a', trim: '#f4f0e8', signBg: '#1a1f36', sign: '#ffe08a', glow: '#ffd27a', curtain: '#e8d8b8', door: '#b8283a', style: 'townhouse' },
  h3: { wall: '#f4ecdc', roof: '#4a5a78', accent: '#ff9ac0', trim: '#5a3418', signBg: '#3a2010', sign: '#ffe0c8', glow: '#ffb070', curtain: '#f8e8d0', door: '#6a4024', style: 'machiya' },
  h4: { wall: '#2e3240', roof: '#1a1c26', accent: '#e3b341', trim: '#c8ccd8', signBg: '#14161e', sign: '#f2cc68', glow: '#ffd27a', curtain: '#d8c8a8', door: '#b07848', style: 'modern' },
});
function lawn(c, x, w, base, dx, { path = '#cfc4ae', grass = '#5d9a4a' } = {}) {
  R(c, x, base - 14, w, 14, grass); for (let i = 0; i < w; i += 3) if (hash(i, base, 7) > 0.55) R(c, x + i, base - 14 + ((hash(i, 2, 7) * 12) | 0), 1, 2, hash(i, 3, 7) > 0.5 ? '#7cbc5c' : '#3f7a3a');
  A(c, 0.25, () => R(c, x, base - 14, w, 2, '#0a0e1e'));
  if (dx != null) for (let j = 0; j < 3; j++) { const sw = 18 + j * 2, sx = Math.round(dx - sw / 2 + (j % 2 ? 2 : -1)), sy = base - 13 + j * 4; R(c, sx - 1, sy - 1, sw + 2, 5, '#5a5448'); R(c, sx, sy, sw, 3, path); R(c, sx, sy, sw, 1, shade(path, 1.15)); }
}
function picket(c, x0, x1, base, col = '#f8f4ec', gate) { for (let x = x0; x < x1; x += 6) { if (gate && x + 4 > gate[0] && x < gate[1]) continue; R(c, x - 1, base - 13, 6, 13, INK); R(c, x, base - 12, 4, 12, col); R(c, x + 1, base - 14, 2, 2, INK); R(c, x + 3, base - 12, 1, 12, shade(col, 0.8)); }
  for (const yy of [base - 9, base - 4]) { let a = x0; for (const [p, q] of gate ? [[x0, gate[0]], [gate[1], x1]] : [[x0, x1]]) { if (q - p > 2) { R(c, p, yy, q - p, 2, shade(col, 0.88)); R(c, p, yy + 2, q - p, 1, INK); } a = q; } } }
function ironFence(c, x0, x1, base, gate) { for (const [p, q] of gate ? [[x0, gate[0]], [gate[1], x1]] : [[x0, x1]]) { if (q - p < 4) continue; R(c, p, base - 12, q - p, 2, INK); R(c, p, base - 3, q - p, 2, INK); for (let x = p; x < q; x += 4) { R(c, x, base - 15, 1, 15, '#1a1d2a'); R(c, x - 1, base - 16, 3, 2, '#3a3f58'); } R(c, p, base - 12, q - p, 1, '#4a5070'); } }
function bambooFence(c, x0, x1, base, gate) { for (const [p, q] of gate ? [[x0, gate[0]], [gate[1], x1]] : [[x0, x1]]) for (let x = p; x < q; x += 3) { const hh = 12 + ((hash(x, 5, 3) * 3) | 0); R(c, x, base - hh, 3, hh, INK); R(c, x, base - hh + 1, 2, hh - 1, '#8ab04a'); R(c, x, base - hh + 1, 1, hh - 1, '#b8d878'); R(c, x, base - 8, 2, 1, '#5a7a2a'); } for (const [p, q] of gate ? [[x0, gate[0]], [gate[1], x1]] : [[x0, x1]]) if (q - p > 3) { R(c, p, base - 9, q - p, 2, '#5a3a1a'); R(c, p, base - 9, q - p, 1, '#8a5a2a'); } }
function slatFence(c, x0, x1, base, gate) { for (const [p, q] of gate ? [[x0, gate[0]], [gate[1], x1]] : [[x0, x1]]) { if (q - p < 4) continue; R(c, p - 1, base - 15, q - p + 2, 15, INK); for (let yy = base - 14; yy < base; yy += 4) { R(c, p, yy, q - p, 3, '#a87048'); R(c, p, yy, q - p, 1, '#c89060'); } } }
function nameplate(c, cx, y, label, F, V, post = true) { const s = norm(label), w = ptw(s, 1) + 10; if (post) { R(c, cx - 2, y + 10, 4, 22, INK); R(c, cx - 1, y + 10, 2, 22, '#6a4424'); }
  R(c, cx - w / 2 - 1, y - 1, w + 2, 13, INK); R(c, cx - w / 2, y, w, 11, F.signBg); R(c, cx - w / 2, y, w, 1, shade(F.signBg, 1.6)); R(c, cx - w / 2, y + 10, w, 1, F.accent); ptext(c, s, cx, y + 6, F.sign, 1, null); if (V.night) emit(cx - w / 2, y, w, 11, F.sign, 0.18); }
function shutters(c, x, y, w, h, col) { for (const sx of [x - 11, x + w + 3]) { R(c, sx - 1, y - 1, 10, h + 2, INK); R(c, sx, y, 8, h, col); for (let j = y + 2; j < y + h - 1; j += 3) R(c, sx + 1, j, 6, 1, shade(col, 0.75)); R(c, sx, y, 1, h, shade(col, 1.25)); } }
function roses(c, x, y, n, seed = 0) { for (let i = 0; i < n; i++) { const rx = x + ((hash(i, seed, 11) * 6) | 0) - 3, ry = y + i * 4; R(c, rx, ry, 3, 3, '#2e6e30'); if (hash(i, seed, 12) > 0.4) { R(c, rx + 1, ry - 1, 3, 3, hash(i, seed, 13) > 0.5 ? '#ff6a9a' : '#ffb0cc'); R(c, rx + 2, ry, 1, 1, '#c8285a'); } } }
/** thatched roof seen from the front: thick rounded hip with straw strands, sagging eave overhang */
function thatch(c, x0, x1, eaveY, topY, inset, col) {
  const H = eaveY - topY, lit = shade(col, 1.15), dk = shade(col, 0.72);
  for (let yy = 0; yy <= H; yy++) { const t = yy / H, round = Math.round(Math.sqrt(Math.max(0, 1 - (1 - t) * (1 - t))) * 6), l = Math.round(x0 + inset * (1 - t)) - round + 6, r = Math.round(x1 - inset * (1 - t)) + round - 6, y = topY + yy;
    R(c, l - 2, y, r - l + 4, 1, INK); R(c, l, y, r - l, 1, col); R(c, l, y, Math.round((r - l) * 0.35), 1, lit); R(c, r - 10, y, 10, 1, shade(col, 0.85));
    for (let xx = l; xx < r; xx += 2) if (hash(xx, y, 21) > 0.62) R(c, xx, y, 1, 1, hash(xx, y, 22) > 0.5 ? dk : shade(col, 1.3)); }
  for (let k = 0; k < 3; k++) { const yy = topY + 6 + k * Math.round(H / 3.2); const t = (yy - topY) / H, l = Math.round(x0 + inset * (1 - t)), r = Math.round(x1 - inset * (1 - t)); A(c, 0.35, () => R(c, l + 2, yy, r - l - 4, 1, dk)); }
  R(c, x0 - 4, eaveY - 4, x1 - x0 + 8, 7, INK); R(c, x0 - 3, eaveY - 3, x1 - x0 + 6, 5, col); for (let xx = x0 - 3; xx < x1 + 3; xx += 2) R(c, xx, eaveY + 1 + ((hash(xx, 1, 23) * 3) | 0), 1, 2, dk); R(c, x0 - 3, eaveY - 3, x1 - x0 + 6, 1, lit);
  R(c, x0 + inset - 2, topY - 3, x1 - x0 - inset * 2 + 4, 5, INK); R(c, x0 + inset, topY - 2, x1 - x0 - inset * 2, 3, shade(col, 0.8)); for (let xx = x0 + inset + 2; xx < x1 - inset - 2; xx += 6) R(c, xx, topY - 2, 3, 3, shade(col, 1.25)); // ridge roll + spars
}

P.h1 = { // Rose Cottage: thatched stone-and-stucco cottage, eyebrow dormer, rose arch, picket fence
  paint(c, b, F, V, g) { const { x, y, w, base, dx } = g, bx = x + 16, bw = w - 32, wt = base - 84;
    dropShadow(c, bx, base - 12, bw);
    chimney(c, x + w - 58, y - 28, 44, '#8a8478');
    wall(c, bx, wt, bw, base - 12 - wt, F.wall, 'stucco', V);
    for (const qx of [bx, bx + bw - 10]) for (let j = wt + 6, k = 0; j < base - 16; j += 9, k++) { const qw = k % 2 ? 7 : 10, xx = qx === bx ? bx : bx + bw - qw; R(c, xx, j, qw, 8, '#a8a090'); R(c, xx, j, qw, 1, '#c8c0b0'); R(c, xx, j + 7, qw, 1, '#7a7468'); } // stone quoins
    thatch(c, x + 4, x + w - 4, wt + 6, y - 22, 26, F.roof);
    // eyebrow dormer
    const ex = x + 58; for (let i = 0; i < 12; i++) { const hw = Math.round(Math.sqrt(144 - (11 - i) * (11 - i)) * 2.2); R(c, ex - hw - 2, y + 8 + i, hw * 2 + 4, 1, INK); R(c, ex - hw, y + 8 + i, hw * 2, 1, i < 3 ? shade(F.roof, 1.2) : F.roof); }
    win(c, ex - 12, y + 20, 24, 14, F, V, { panes: [3, 1], curtains: false, sill: false });
    R(c, x + w - 66, y + 12, 18, 18, INK); R(c, x + w - 64, y + 14, 14, 14, F.trim); win(c, x + w - 62, y + 16, 10, 10, F, V, { panes: [2, 2], curtains: false, sill: false }); // round-ish attic light
    // bow window left, cottage window right
    const lw = 44, lx = bx + 14, ly = wt + 22; R(c, lx - 6, ly - 8, lw + 12, 6, INK); R(c, lx - 5, ly - 7, lw + 10, 4, '#5a6a8a'); R(c, lx - 5, ly - 7, lw + 10, 1, '#8a9ab8');
    win(c, lx, ly, lw, 30, F, V, { panes: [4, 2], curtains: true, box: true });
    const rx = dx + 26; shutters(c, rx, ly + 2, 26, 26, F.accent); win(c, rx, ly + 2, 26, 26, F, V, { panes: [2, 2], curtains: true, box: true });
    door(c, dx, base - 12, { ...F, accent: '#ffb0cc' }, V, { w: 22, h: 34, col: F.door, steps: 1, lamps: false });
    // rose arch over the door
    for (let i = 0; i <= 20; i++) { const a = Math.PI * (i / 20), ax = Math.round(dx - Math.cos(a) * 19), ay = Math.round(base - 50 - Math.sin(a) * 12); R(c, ax - 2, ay - 2, 5, 5, INK); R(c, ax - 1, ay - 1, 3, 3, '#2e6e30'); if (i % 3 === 0) { R(c, ax - 1, ay - 3, 3, 3, i % 2 ? '#ff6a9a' : '#ffb0cc'); R(c, ax, ay - 2, 1, 1, '#c8285a'); } }
    for (const sx of [dx - 20, dx + 18]) { R(c, sx - 1, base - 52, 4, 40, INK); R(c, sx, base - 52, 2, 40, '#f4efe4'); roses(c, sx + 1, base - 48, 9, sx); }
    lawn(c, x, w, base, dx);
    for (let i = 4; i < 60; i += 5) { R(c, x + i, base - 20, 3, 6, '#2e6e30'); R(c, x + i, base - 22, 3, 3, ['#ff6a9a', '#ffd84a', '#ffffff', '#c88aff'][i % 4]); } // cottage bed
    for (let i = w - 60; i < w - 30; i += 5) { R(c, x + i, base - 20, 3, 6, '#2e6e30'); R(c, x + i, base - 22, 3, 3, ['#ffb0cc', '#ffffff', '#ff9a5a'][i % 3]); }
    picket(c, x + 2, x + w - 2, base + 2, '#f8f4ec', [dx - 12, dx + 12]);
    nameplate(c, x + 30, base - 40, `${b.owner || 'Mochi'}'s`, F, V);
  },
  anim(c, b, F, t, g) { steam(c, g.x + g.w - 52, g.y - 34, t * 0.7, 4, '#d0d0d8'); },
};

P.h2 = { // Townhouse: tall three-storey brick terrace, bay window, stoop + iron railings, cornice with chimney pots
  paint(c, b, F, V, g) { const { x, y, w, base, dx } = g, bx = x + 34, bw = w - 68, top = y - 26, gnd = base - 12;
    dropShadow(c, bx, gnd, bw);
    for (const px of [bx + 12, bx + bw - 30]) for (let k = 0; k < 3; k++) { R(c, px + k * 6 - 1, top - 14, 6, 14, INK); R(c, px + k * 6, top - 13, 4, 13, '#b05a3a'); R(c, px + k * 6, top - 13, 1, 13, '#d07a58'); } // chimney pots
    wall(c, bx, top, bw, gnd - top, F.wall, 'brick', V, { bw: 9, bh: 4 });
    for (const sx of [bx - 6, bx + bw]) { R(c, sx - 1, top, 7, gnd - top, INK); R(c, sx, top, 6, gnd - top, '#2a3250'); for (let j = top; j < gnd; j += 12) R(c, sx, j, 6, 1, '#1a2038'); } // party-wall piers
    // cornice + dentils
    R(c, bx - 10, top - 4, bw + 20, 10, INK); R(c, bx - 9, top - 3, bw + 18, 8, F.trim); R(c, bx - 9, top - 3, bw + 18, 2, '#ffffff'); for (let i = bx - 7; i < bx + bw + 8; i += 5) R(c, i, top + 3, 3, 3, '#b8b4a8'); A(c, 0.35, () => R(c, bx, top + 6, bw, 3, '#0a0e1e'));
    // third floor: three small windows with arched lintels
    for (let i = 0; i < 3; i++) { const wx = bx + 12 + i * ((bw - 24 - 22) / 2); win(c, wx, top + 18, 22, 24, F, V, { panes: [2, 2], curtains: true, arch: true, frame: F.trim }); }
    stringCourse(c, bx, top + 54, bw, F.trim);
    // second floor: tall windows behind an iron juliet balcony
    for (let i = 0; i < 3; i++) { const wx = bx + 10 + i * ((bw - 20 - 24) / 2); win(c, wx, top + 66, 24, 40, F, V, { panes: [2, 3], curtains: true, frame: F.trim }); }
    R(c, bx + 4, top + 100, bw - 8, 2, INK); for (let i = bx + 6; i < bx + bw - 6; i += 4) R(c, i, top + 102, 1, 10, '#1a1d2a'); R(c, bx + 4, top + 111, bw - 8, 2, INK);
    stringCourse(c, bx, top + 118, bw, F.trim);
    // ground floor: projecting bay window left, door with fanlight right
    const bayX = bx + 6, bayW = dx - 22 - bayX - 6, bayY = top + 132; R(c, bayX - 4, bayY - 6, bayW + 8, 7, INK); R(c, bayX - 3, bayY - 5, bayW + 6, 5, '#262c44'); R(c, bayX - 3, bayY - 5, bayW + 6, 1, '#4a5478');
    win(c, bayX, bayY, bayW, gnd - bayY - 14, F, V, { panes: [3, 2], curtains: true, frame: F.trim, sill: false });
    R(c, bayX - 3, gnd - 12, bayW + 6, 12, INK); R(c, bayX - 2, gnd - 11, bayW + 4, 11, F.trim); R(c, bayX + 2, gnd - 8, bayW - 4, 5, '#d8d4c8');
    const fy = gnd - 56; R(c, dx - 14, fy - 2, 28, 12, INK); for (let i = 0; i < 9; i++) { const hw = Math.round(Math.sqrt(81 - (8 - i) * (8 - i)) * 1.4); R(c, dx - hw, fy + i - 8, hw * 2, 1, i ? (V.night ? '#ffe08a' : '#a6d4f2') : INK); } for (const a of [-6, 0, 6]) R(c, dx + a, fy - 6, 1, 6, F.trim); // fanlight
    door(c, dx, gnd, F, V, { w: 24, h: 38, col: F.door, steps: 3, frame: F.trim });
    R(c, dx - 7, fy - 22, 14, 9, INK); R(c, dx - 6, fy - 21, 12, 7, GOLD_D); ptext(c, '2', dx, fy - 17, '#fff4c0', 1, null);
    for (const sx of [dx - 22, dx + 19]) { R(c, sx, gnd - 22, 2, 22, INK); for (let j = gnd - 20; j < gnd; j += 5) R(c, sx - 1, j, 4, 1, '#3a3f58'); R(c, sx - 1, gnd - 24, 4, 3, GOLD_D); } // stoop railings
    lawn(c, x, w, base, dx, { grass: '#4a8a44' });
    shrub(c, x + 6, base - 2, 1.1, '#3a3f58'); shrub(c, x + w - 22, base - 2, 1.1, '#3a3f58');
    ironFence(c, x + 2, x + w - 2, base + 2, [dx - 14, dx + 14]);
    nameplate(c, dx + 40, gnd - 40, `${b.owner || 'Kuro'}'s`, F, V, false);
  },
  anim(c, b, F, t, g) { // a cat in the top window blinks
    const bx = g.x + 34, wx = Math.round(bx + 12 + 2 * ((g.w - 68 - 24 - 22) / 2)), wy = g.y - 26 + 18; const blink = (t % 4) < 0.15;
    R(c, wx + 8, wy + 16, 8, 8, '#1a1a22'); R(c, wx + 8, wy + 14, 2, 2, '#1a1a22'); R(c, wx + 14, wy + 14, 2, 2, '#1a1a22'); if (!blink) { R(c, wx + 9, wy + 18, 2, 1, '#ffe14a'); R(c, wx + 13, wy + 18, 2, 1, '#ffe14a'); } },
};

P.h3 = { // Blossom machiya: timber lattice front, tiled double eaves with upturned ends, noren curtain, paper lanterns
  paint(c, b, F, V, g) { const { x, y, w, base, dx } = g, gnd = base - 12, bx = x + 10, bw = w - 20;
    dropShadow(c, bx, gnd, bw);
    const curvedRoof = (x0, x1, yTop, yEave, col) => { const H = yEave - yTop;
      for (let yy = 0; yy <= H; yy++) { const t = yy / H, l = Math.round(x0 + 10 * (1 - t)), r = Math.round(x1 - 10 * (1 - t)), lift = Math.round(Math.pow(t, 3) * 5), y2 = yTop + yy;
        R(c, l - 2 - lift, y2 - (yy === H ? 0 : 0), r - l + 4 + lift * 2, 1, INK); R(c, l - lift, y2, r - l + lift * 2, 1, col); if (yy % 4 === 3) R(c, l - lift, y2, r - l + lift * 2, 1, shade(col, 0.75)); }
      for (let xx = x0 + 4; xx < x1 - 4; xx += 6) { R(c, xx, yTop + 2, 2, H - 2, shade(col, 1.18)); R(c, xx + 2, yTop + 2, 1, H - 2, shade(col, 0.8)); } // round tile rows
      R(c, x0 - 8, yEave - 2, 8, 3, INK); R(c, x0 - 10, yEave - 5, 5, 4, INK); R(c, x1, yEave - 2, 8, 3, INK); R(c, x1 + 5, yEave - 5, 5, 4, INK); // upturned eave tips
      R(c, x0 - 4, yEave + 1, x1 - x0 + 8, 3, INK); R(c, x0 - 3, yEave + 1, x1 - x0 + 6, 2, shade(col, 0.6)); };
    // upper storey: white plaster, dark timber frame, slatted mushiko windows
    wall(c, bx + 8, base - 126, bw - 16, 44, F.wall, 'stucco', V);
    for (const px of [bx + 8, bx + 60, bx + bw - 66, bx + bw - 14]) R(c, px, base - 126, 6, 44, F.trim);
    R(c, bx + 8, base - 106, bw - 16, 3, F.trim);
    for (const wx of [bx + 20, bx + bw - 54]) { R(c, wx - 2, base - 122, 38, 14, INK); R(c, wx, base - 120, 34, 10, V.night ? '#ffd27a' : '#e8e0c8'); for (let i = wx + 1; i < wx + 34; i += 3) R(c, i, base - 120, 1, 10, F.trim); if (V.night) emit(wx, base - 120, 34, 10, '#ffb070', 0.3); }
    curvedRoof(x + 6, x + w - 6, y - 18, base - 128, F.roof);
    R(c, x + 18, y - 22, w - 36, 5, INK); R(c, x + 20, y - 21, w - 40, 3, shade(F.roof, 0.7)); R(c, x + 14, y - 28, 8, 9, INK); R(c, x + 15, y - 27, 6, 7, shade(F.roof, 1.2)); R(c, x + w - 22, y - 28, 8, 9, INK); R(c, x + w - 21, y - 27, 6, 7, shade(F.roof, 1.2)); // ridge + end tiles
    // ground storey: wooden koshi lattice
    wall(c, bx, base - 78, bw, gnd - base + 78, '#7a4a28', 'plank', V, { ph: 7, vertical: true });
    for (const [a, b2] of [[bx + 8, dx - 22], [dx + 22, bx + bw - 8]]) { R(c, a - 2, base - 70, b2 - a + 4, 50, INK); R(c, a, base - 68, b2 - a, 46, V.night ? '#ffcf80' : '#e8dcc0'); if (V.night) emit(a, base - 68, b2 - a, 46, '#ffb070', 0.22); for (let i = a + 1; i < b2; i += 4) R(c, i, base - 68, 2, 46, '#5a3418'); R(c, a, base - 52, b2 - a, 2, '#5a3418'); R(c, a, base - 66, b2 - a, 1, '#8a5a30'); }
    curvedRoof(x + 2, x + w - 2, base - 92, base - 78, F.roof);
    // sliding door with noren curtain
    R(c, dx - 18, gnd - 46, 36, 46, INK); R(c, dx - 16, gnd - 44, 32, 44, '#5a3418'); for (const sx of [dx - 15, dx + 1]) { R(c, sx, gnd - 42, 14, 40, V.night ? '#ffd890' : '#efe6d0'); for (let j = gnd - 40; j < gnd - 4; j += 6) R(c, sx, j, 14, 1, '#7a4a28'); R(c, sx + 6, gnd - 42, 1, 40, '#7a4a28'); }
    R(c, dx - 18, gnd - 47, 36, 2, '#3a2010'); for (const [i, nx] of [[0, dx - 17], [1, dx - 5], [2, dx + 7]]) { R(c, nx, gnd - 45, 10, 20, '#2a3a7a'); R(c, nx, gnd - 45, 10, 2, '#1a2458'); R(c, nx + 9, gnd - 45, 1, 20, '#1a2458'); if (i === 1) { R(c, nx + 3, gnd - 37, 4, 4, '#ffb0cc'); R(c, nx + 4, gnd - 38, 2, 6, '#ffb0cc'); R(c, nx + 2, gnd - 36, 6, 2, '#ffb0cc'); R(c, nx + 4, gnd - 36, 2, 2, '#ffe08a'); } }
    R(c, dx - 22, gnd - 2, 44, 3, INK); R(c, dx - 21, gnd - 2, 42, 2, '#9a9488');
    // stone lantern + pine on the left, sakura branch on the right
    const lx = x + 18; R(c, lx - 1, gnd - 30, 14, 4, INK); R(c, lx, gnd - 29, 12, 2, '#a8a498'); R(c, lx + 2, gnd - 26, 8, 8, INK); R(c, lx + 3, gnd - 25, 6, 6, V.night ? '#ffd27a' : '#6a6860'); R(c, lx + 4, gnd - 18, 4, 16, '#8a8478'); R(c, lx + 1, gnd - 3, 10, 3, '#8a8478'); if (V.night) emit(lx + 3, gnd - 25, 6, 6, '#ffd27a', 0.7);
    R(c, x + w - 20, gnd - 46, 4, 46, INK); R(c, x + w - 19, gnd - 46, 2, 46, '#5a3418'); R(c, x + w - 30, gnd - 44, 12, 2, '#5a3418'); R(c, x + w - 18, gnd - 52, 2, 8, '#5a3418');
    for (const [px, py, r] of [[x + w - 18, gnd - 56, 9], [x + w - 30, gnd - 48, 7], [x + w - 8, gnd - 48, 6], [x + w - 22, gnd - 44, 6]]) { for (let j = -r; j <= r; j++) { const hw = Math.round(Math.sqrt(r * r - j * j)); R(c, px - hw - 1, py + j, hw * 2 + 2, 1, INK); } for (let j = -r + 1; j < r; j++) { const hw = Math.round(Math.sqrt((r - 1) * (r - 1) - j * j)); R(c, px - hw, py + j, hw * 2, 1, j < -r / 3 ? '#ffc8dc' : j > r / 3 ? '#e87aa4' : '#ff9ac0'); }
      for (let i = 0; i < r * 2; i++) R(c, px - r + 1 + ((hash(i, py, 31) * (r * 2 - 2)) | 0), py - r + 2 + ((hash(i, px, 32) * (r * 2 - 4)) | 0), 1, 1, hash(i, px, 33) > 0.5 ? '#fff0f6' : '#c8507a'); } // sakura clouds
    lawn(c, x, w, base, dx, { path: '#b8b4a8', grass: '#4f8a46' });
    bambooFence(c, x + 2, x + w - 2, base + 1, [dx - 13, dx + 13]);
    nameplate(c, dx + 30, gnd - 40, `${b.owner || 'Hana'}'s`, F, V, false);
    if (V.night) for (const lx of [dx - 30, dx + 26]) emit(lx - 2, gnd - 69, 6, 10, '#ff7a4a', 0.6);
  },
  anim(c, b, F, t, g) { const gnd = g.base - 12; for (const [i, lx] of [[0, g.dx - 30], [1, g.dx + 26]]) { const sw = Math.round(Math.sin(t * 2 + i) * 1.2); R(c, lx + sw, gnd - 76, 1, 6, INK); R(c, lx - 3 + sw, gnd - 70, 8, 12, INK); R(c, lx - 2 + sw, gnd - 69, 6, 10, '#e8423a'); R(c, lx - 2 + sw, gnd - 66, 6, 1, '#a8221a'); R(c, lx - 2 + sw, gnd - 62, 6, 1, '#a8221a'); R(c, lx - 1 + sw, gnd - 69, 1, 10, '#ff8a6a'); } },
};

P.h4 = { // Modern: mono-pitch two-storey with cedar slats + glass box wing, solar panels, bollard lights
  paint(c, b, F, V, g) { const { x, y, w, base, dx } = g, gnd = base - 12, lx0 = x + 10, lx1 = dx - 14, rx0 = dx + 14, rx1 = x + w - 10, hiY = y - 30, loY = y + 10;
    dropShadow(c, lx0, gnd, rx1 - lx0);
    // tall block: sloped roof line from hiY (left) to loY (right)
    const slope = (xx) => Math.round(hiY + ((xx - lx0) / (lx1 - lx0)) * (loY - hiY));
    for (let xx = lx0 - 2; xx < lx1 + 2; xx++) { const t0 = slope(Math.max(lx0, Math.min(lx1 - 1, xx))) - 2; R(c, xx, t0, 1, gnd - t0, INK); }
    for (let xx = lx0; xx < lx1; xx++) { const t0 = slope(xx); R(c, xx, t0, 1, gnd - t0, F.wall); }
    for (let xx = lx0; xx < lx1; xx += 5) { const t0 = slope(xx) + 6; R(c, xx, t0, 4, base - 96 - t0, '#b07848'); R(c, xx, t0, 1, base - 96 - t0, '#c8925a'); R(c, xx + 3, t0, 1, base - 96 - t0, '#8a5a34'); } // cedar slats upstairs
    for (let xx = lx0 - 4; xx < lx1 + 4; xx++) { const t0 = slope(Math.max(lx0, Math.min(lx1 - 1, xx))); R(c, xx, t0 - 4, 1, 5, INK); R(c, xx, t0 - 3, 1, 2, '#4a4e60'); } // thin roof fascia
    A(c, 0.2, () => R(c, lx1 - 8, slope(lx1 - 8), 8, gnd - slope(lx1 - 8), '#0a0e1e'));
    win(c, lx0 + 12, base - 140, lx1 - lx0 - 24, 22, F, V, { panes: [3, 1], curtains: false, sill: false, frame: '#1a1c26' }); // upstairs ribbon window over the slats
    R(c, lx0, base - 96, lx1 - lx0, 3, '#1a1c26');
    win(c, lx0 + 8, base - 86, lx1 - lx0 - 16, 46, F, V, { panes: [2, 1], curtains: true, sill: false, frame: '#1a1c26', inner: (cc, wx, wy, ww, wh) => { R(cc, wx + 6, wy + wh - 12, 22, 8, '#c86a3a'); R(cc, wx + 6, wy + wh - 16, 22, 4, '#e88a5a'); R(cc, wx + ww - 14, wy + wh - 22, 6, 18, '#2e6e30'); R(cc, wx + ww - 16, wy + wh - 26, 10, 6, '#3a9152'); } });
    // glass wing with green roof + solar panels
    const wt = base - 92; R(c, rx0 - 2, wt - 2, rx1 - rx0 + 4, gnd - wt + 2, INK); R(c, rx0, wt, rx1 - rx0, gnd - wt, F.wall);
    R(c, rx0 - 4, wt - 8, rx1 - rx0 + 8, 8, INK); R(c, rx0 - 3, wt - 7, rx1 - rx0 + 6, 3, '#4a8a3a'); for (let i = rx0 - 3; i < rx1 + 3; i += 3) R(c, i, wt - 9 - ((hash(i, 4, 41) * 2) | 0), 1, 3, '#6ab04a'); R(c, rx0 - 3, wt - 4, rx1 - rx0 + 6, 3, '#d8dce8');
    for (let i = 0; i < 3; i++) { const sx = rx0 + 2 + i * 18; R(c, sx - 1, wt - 22, 17, 13, INK); R(c, sx, wt - 21, 15, 11, '#26407a'); for (let k = 1; k < 3; k++) R(c, sx + k * 5, wt - 21, 1, 11, '#5a7ac8'); R(c, sx, wt - 16, 15, 1, '#5a7ac8'); R(c, sx + 6, wt - 10, 2, 4, '#4a4e60'); }
    win(c, rx0 + 4, wt + 8, rx1 - rx0 - 8, gnd - wt - 14, F, V, { panes: [2, 1], curtains: false, sill: false, frame: '#1a1c26', inner: (cc, wx, wy, ww, wh) => { R(cc, wx + 6, wy + wh - 30, 2, 28, '#1a1c26'); R(cc, wx + 2, wy + wh - 34, 10, 6, V.night ? '#fff0b0' : '#e8d8a0'); R(cc, wx + ww - 24, wy + wh - 10, 20, 8, '#3a3f58'); R(cc, wx + ww - 22, wy + wh - 14, 16, 4, '#5a6080'); } });
    // pivot door
    R(c, dx - 14, gnd - 50, 28, 50, INK); R(c, dx - 12, gnd - 48, 18, 48, F.door); for (let j = gnd - 46; j < gnd; j += 4) R(c, dx - 12, j, 18, 1, shade(F.door, 0.8)); R(c, dx + 7, gnd - 48, 5, 48, V.night ? '#ffe08a' : '#a6d4f2'); R(c, dx + 2, gnd - 30, 2, 14, '#e8e8f0'); if (V.night) emit(dx + 7, gnd - 48, 5, 48, '#ffd27a', 0.4);
    R(c, dx - 20, gnd - 56, 40, 6, INK); R(c, dx - 19, gnd - 55, 38, 4, '#1a1c26'); if (V.night) emit(dx - 8, gnd - 51, 16, 1, '#fff0b0', 0.8);
    lawn(c, x, w, base, dx, { path: '#b8bcc8', grass: '#4a8a44' });
    for (let i = 0; i < 5; i++) { const gx = x + 8 + i * 10; for (let k = -3; k <= 3; k += 2) R(c, gx + k, base - 22 + Math.abs(k), 1, 10 - Math.abs(k), k % 3 ? '#a8b860' : '#7a9a4a'); } // ornamental grasses
    for (const bxp of [dx - 26, dx + 24]) { R(c, bxp - 1, base - 18, 5, 16, INK); R(c, bxp, base - 17, 3, 15, '#4a4e60'); R(c, bxp, base - 16, 3, 2, V.night ? '#fff0b0' : '#c8ccd8'); if (V.night) emit(bxp, base - 16, 3, 2, '#fff0b0', 0.8); } // bollards
    slatFence(c, x + w - 60, x + w - 2, base + 1);
    nameplate(c, dx - 40, base - 60, `${b.owner || 'Taro'}'s`, F, V, false);
  },
  anim(c, b, F, t, g, V) { if (V && V.night) return; const s = (t * 0.25) % 1; if (s > 0.3) return; const wt = g.base - 92, sx = g.dx + 16 + Math.floor((s / 0.3) * 54); R(c, sx, wt - 21, 2, 11, '#dfe8ff'); },
};

// ---------------------------------------------------------------- Holder Lounge (v2): velvet + gold art-deco members' club
const VELVET = '#5a1840', VELVET_D = '#3a0e2a', VELVET_L = '#7a2a58', LACQ = '#16101a';
function quilt(c, x, y, w, h) { R(c, x, y, w, h, VELVET);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const u = (i + j) % 12, v = (i - j + 1200) % 12; if (u === 0 || v === 0) R(c, x + i, y + j, 1, 1, VELVET_D); else if (u === 1 || v === 1) R(c, x + i, y + j, 1, 1, VELVET_L); }
  for (let j = 0; j < h; j += 6) for (let i = (j / 6) % 2 ? 6 : 0; i < w; i += 12) { R(c, x + i - 1, y + j - 1, 2, 2, GOLD_D); R(c, x + i - 1, y + j - 1, 1, 1, GOLD_L); } // gold buttons at the tufts
  A(c, 0.25, () => R(c, x, y, w, Math.round(h * 0.25), '#ffb8e0')); A(c, 0.18, () => R(c, x, y + Math.round(h * 0.7), w, Math.round(h * 0.3), '#0a0410')); }
function decoPilaster(c, x, y, h) { R(c, x - 1, y, 10, h, INK); R(c, x, y, 8, h, LACQ); R(c, x + 2, y + 4, 1, h - 8, GOLD); R(c, x + 5, y + 4, 1, h - 8, GOLD_D); R(c, x - 2, y - 2, 12, 4, GOLD); R(c, x - 2, y - 2, 12, 1, GOLD_L); R(c, x - 2, y + h - 4, 12, 4, GOLD_D); for (let k = 0; k < 3; k++) R(c, x + 1 + k * 2, y + 6 + k * 2, 6 - k * 4 > 0 ? 6 - k * 2 : 2, 1, GOLD_L); }
P.lounge = {
  paint(c, b, F, V, g) { const { x, y, w, base, dx } = g, cx = x + w / 2, top = y + 6;
    dropShadow(c, x, base, w);
    // stepped deco crown + sunburst fan
    for (const [sx, sw, sy] of [[x + 6, w - 12, top - 14], [cx - 52, 104, top - 26], [cx - 34, 68, top - 40]]) { R(c, sx - 2, sy - 2, sw + 4, top - sy + 4, INK); R(c, sx, sy, sw, top - sy, LACQ); R(c, sx, sy, sw, 2, GOLD); R(c, sx, sy, sw, 1, GOLD_L); }
    for (let i = 0; i < 28; i++) { const a = Math.PI * (i / 27), r = 26; for (let k = 6; k < r; k += 1) { const px = Math.round(cx + Math.cos(a) * k), py = Math.round(top - 14 - Math.sin(a) * k * 0.95); if (i % 2 === 0) R(c, px, py, 1, 1, k > r - 3 ? GOLD_L : GOLD); else if (k > r - 4) R(c, px, py, 1, 1, GOLD_D); } }
    R(c, cx - 6, top - 22, 12, 9, INK); icon(c, 'crown', cx - 4, top - 21, 1, { a: GOLD_L, r: '#c8282e', w: '#9fd8ff', b: GOLD_D });
    // quilted velvet wall between lacquer + gold pilasters
    R(c, x - 2, top - 2, w + 4, base - top + 2, INK); quilt(c, x, top, w, base - top);
    A(c, 0.22, () => R(c, x + w - 10, top, 10, base - top, '#0a0410')); for (let k = 0; k < 4; k++) A(c, 0.1 + k * 0.07, () => R(c, x, base - 4 + k, w, 1, '#0a0410'));
    for (const px of [x + 2, x + w - 10]) decoPilaster(c, px, top, base - top - 6);
    // marquee: gold frame, lacquer board, pixel lettering, bulb sockets
    const mw = w - 28, mx = cx - mw / 2, my = top + 4, mh = 24; R(c, mx - 4, my - 4, mw + 8, mh + 8, INK); R(c, mx - 3, my - 3, mw + 6, mh + 6, GOLD); R(c, mx - 3, my - 3, mw + 6, 1, GOLD_L); R(c, mx - 1, my - 1, mw + 2, mh + 2, INK); R(c, mx, my, mw, mh, '#1a0a20'); R(c, mx, my, mw, 7, '#2a1030');
    for (let i = mx + 2; i < mx + mw - 1; i += 6) { R(c, i, my + 1, 2, 2, '#6a4a2a'); R(c, i, my + mh - 3, 2, 2, '#6a4a2a'); }
    const lab = '$KIBBLE HOLDER LOUNGE'; if (V.night) A(c, 0.45, () => { ptext(c, lab, cx - 1, my + 12, '#ffd27a', 1, null); ptext(c, lab, cx + 1, my + 12, '#ffd27a', 1, null); }); ptext(c, lab, cx, my + 12, V.night ? '#fff0b8' : GOLD_L, 1, INK); if (V.night) emit(mx, my, mw, mh, '#ffc860', 0.3);
    // deco arched windows with crimson swag curtains (skip the door bay)
    const swag = (cc, wx, wy, ww, wh) => { R(cc, wx, wy, ww, wh, V.night ? '#5a1e2a' : '#3a1226'); R(cc, wx, wy + wh - 10, ww, 10, V.night ? '#8a3a2a' : '#5a1e2a'); for (let i = 2; i < ww; i += 8) R(cc, wx + i, wy + 12, 3, wh - 22, V.night ? '#6a2a34' : '#46162e'); // warm panelled interior
      R(cc, wx + 4, wy + wh - 14, ww - 8, 5, VELVET_L); R(cc, wx + 4, wy + wh - 14, ww - 8, 1, '#a04a78'); R(cc, wx + 4, wy + wh - 9, 2, 4, GOLD_D); R(cc, wx + ww - 6, wy + wh - 9, 2, 4, GOLD_D); // chaise
      A(cc, V.night ? 0.35 : 0.18, () => R(cc, wx + ww / 2 - 8, wy + 8, 16, wh - 16, '#ffd27a')); R(cc, wx + ww / 2 - 6, wy + 4, 12, 2, GOLD_D); for (let i = -2; i <= 2; i++) R(cc, wx + ww / 2 + i * 4, wy + 6 + Math.abs(i), 1, 4 + Math.abs(i), GOLD_L); R(cc, wx + ww / 2 - 1, wy + 2, 2, 2, GOLD_L); // chandelier
      for (const s of [0, 1]) for (let j = 0; j < wh; j++) { const cw = Math.max(2, Math.round((ww * 0.32) * (1 - j / (wh * 1.3)) + (j > wh * 0.6 ? (j - wh * 0.6) * 0.5 : 0))); R(cc, s ? wx + ww - cw : wx, wy + j, cw, 1, j % 3 ? '#a01a3a' : '#c8284a'); }
      R(cc, wx, wy, ww, 4, '#7a0e2a'); for (let i = 1; i < ww; i += 3) R(cc, wx + i, wy + 4, 1, 2, GOLD); };
    const wy = top + 40, wh = base - wy - 22;
    for (const [a, b2] of [[x + 16, dx - 30], [dx + 30, x + w - 16]]) { if (b2 - a < 18) continue; const n = b2 - a > 70 ? 2 : 1, ww = Math.floor((b2 - a - (n - 1) * 10) / n);
      for (let i = 0; i < n; i++) { const wx = a + i * (ww + 10); win(c, wx, wy, ww, wh, { ...F, winGlow: '#ff9a5a' }, V, { panes: [1, 1], curtains: false, arch: true, frame: GOLD, sill: true, inner: swag }); } }
    // canopy: velvet awning with gold fringe + HOLDERS ONLY plaque
    const cw = 84, cxl = dx - cw / 2, cy = base - 62; A(c, 0.35, () => R(c, cxl + 2, cy + 16, cw - 2, 6, '#0a0410'));
    R(c, cxl - 2, cy - 2, cw + 4, 18, INK); R(c, cxl, cy, cw, 12, VELVET); R(c, cxl, cy, cw, 2, VELVET_L); R(c, cxl, cy + 10, cw, 2, VELVET_D);
    for (let i = 0; i < cw; i += 6) { R(c, cxl + i + 1, cy + 12, 4, 3, GOLD); R(c, cxl + i + 2, cy + 15, 2, 1, GOLD_D); } // gold fringe
    R(c, cxl - 3, cy - 3, cw + 6, 2, GOLD_L); R(c, cxl + 2, cy + 2, cw - 4, 1, GOLD_D); R(c, cxl + 2, cy + 9, cw - 4, 1, GOLD_D);
    ptext(c, 'HOLDERS ONLY', dx, cy + 6, GOLD_L, 1, null); if (V.night) emit(cxl, cy, cw, 12, '#ffc860', 0.18);
    // lacquer double door with gold diamond inlay
    door(c, dx, base, { ...F, trim: GOLD, accent: '#c8282e' }, V, { w: 28, h: 38, double: true, col: LACQ, steps: 2, frame: GOLD, lamps: true });
    for (const s of [-1, 1]) { const ix = dx + s * 7; R(c, ix - 1, base - 34, 2, 2, GOLD_L); R(c, ix - 3, base - 32, 6, 2, GOLD); R(c, ix - 1, base - 30, 2, 2, GOLD_L); }
    // red carpet, brass stanchions + velvet rope, gold topiary planters
    R(c, dx - 12, base - 6, 24, 30, '#a01a2a'); R(c, dx - 12, base - 6, 2, 30, '#c8323c'); R(c, dx - 11, base - 6, 1, 30, GOLD); R(c, dx + 10, base - 6, 1, 30, GOLD);
    for (const s of [-1, 1]) { const p0 = dx + s * 18, p1 = dx + s * 40; for (const px of [p0, p1]) { R(c, px - 2, base - 2, 5, 3, INK); R(c, px - 1, base - 20, 3, 18, INK); R(c, px, base - 19, 1, 17, GOLD_L); R(c, px - 2, base - 23, 5, 4, GOLD); R(c, px - 1, base - 23, 2, 1, '#fff4c0'); }
      for (let i = 0; i <= 22; i++) { const xx = Math.round(p0 + ((p1 - p0) * i) / 22), sag = Math.round(Math.sin((Math.PI * i) / 22) * 5); R(c, xx, base - 18 + sag, 1, 3, '#7a0e2a'); R(c, xx, base - 18 + sag, 1, 1, '#c8284a'); } }
    for (const px of [x + 4, x + w - 20]) { R(c, px - 1, base - 12, 18, 12, INK); R(c, px, base - 11, 16, 11, GOLD); R(c, px, base - 11, 16, 2, GOLD_L); R(c, px + 2, base - 7, 12, 1, GOLD_D); const gg = ['#1f5a34', '#2a7442', '#3a9152']; for (let k = 0; k < 3; k++) { R(c, px + 2 - 1, base - 26 - k * 0, 14, 14, INK); } R(c, px + 2, base - 25, 12, 12, gg[0]); R(c, px + 3, base - 24, 9, 8, gg[1]); R(c, px + 4, base - 23, 4, 3, gg[2]); }
  },
  anim(c, b, F, t, g) { const { x, y, w } = g, top = y + 6, mw = w - 28, mx = x + w / 2 - mw / 2, my = top + 4, mh = 24, k = Math.floor(t * 6); let n = 0;
    for (let i = mx + 2; i < mx + mw - 1; i += 6, n++) { R(c, i, my + 1, 2, 2, (n + k) % 4 === 0 ? '#fff4c0' : '#8a6a3a'); R(c, i, my + mh - 3, 2, 2, (n + k + 2) % 4 === 0 ? '#fff4c0' : '#8a6a3a'); }
    twinkle(c, x + w / 2 - 14, top - 28, t, 0, '#fff4c0'); twinkle(c, x + w / 2 + 18, top - 22, t, 2.1, '#fff4c0'); },
};

// ---------------------------------------------------------------- Kibble Mall (v2): keep the marble/gold facade art, add depth + life
const MALL_FESTOONS = (x, w) => { const n = 4, seg = (w - 40) / n; return Array.from({ length: n }, (_, i) => [Math.round(x + 20 + i * seg), Math.round(x + 20 + (i + 1) * seg)]); };
P.mall = {
  paint(c, b, F, V, g) { const { x, y, w, base } = g, cx = x + w / 2;
    A(c, 0.22, () => { R(c, x + 10, base - 2, w, 10, '#0a0e1e'); R(c, x + w - 4, y + 90, 10, base - y - 90, '#0a0e1e'); });
    if (typeof F.legacy === 'function') F.legacy(c); else { wall(c, x, y + 92, w, base - y - 92, F.wall, 'stone', V); sign(c, cx, y + 82, 'KIBBLE MALL', F, V, { maxW: 200 }); }
    // ink silhouette + lit marble edge so the building pops off the plaza
    A(c, 0.55, () => { R(c, x + 6, y + 92, 2, base - y - 120, '#ffffff'); }); A(c, 0.25, () => R(c, x + w - 18, y + 92, 10, base - y - 120, '#0a0e1e'));
    // rooftop pennant poles at the cornice corners + the dome finial
    for (const px of [x + 14, x + w - 16]) flagpole(c, px, y + 86, 30);
    flagpole(c, cx, y - 2, 22);
    // planter boxes with clipped box hedges along the stair foot
    for (const px of [cx - 120, cx + 96]) { R(c, px - 1, base - 18, 26, 14, INK); R(c, px, base - 17, 24, 12, '#e8e2d6'); R(c, px, base - 17, 24, 2, GOLD); R(c, px - 1, base - 30, 26, 13, INK); R(c, px, base - 29, 24, 12, '#2a7442'); R(c, px + 2, base - 28, 12, 5, '#3a9152'); R(c, px + 3, base - 27, 4, 2, '#5cb86a'); }
    // festoon string-lights draped across the colonnade + wing fronts (bulbs glow at night, chase in anim)
    for (const [a, b2] of MALL_FESTOONS(x, w)) for (let i = 0; i <= 24; i++) { const xx = Math.round(a + ((b2 - a) * i) / 24), yy = Math.round(y + 150 + Math.sin((Math.PI * i) / 24) * 10); R(c, xx, yy, 1, 1, '#3a2a1a'); if (i % 3 === 0) { R(c, xx - 1, yy + 1, 3, 3, INK); R(c, xx, yy + 2, 1, 1, V.night ? '#fff0b0' : '#f2cc68'); if (V.night) emit(xx - 1, yy + 1, 3, 3, '#ffd27a', 0.9); } }
    // night: warm wing windows, glowing doors + frieze sign; rain: wet sheen on the marble stairs
    const W2 = (n) => n * 2;
    if (V.night) { for (const wx of [10, 24, w / 2 - 34, w / 2 - 20]) for (const wy of [54, 76]) emit(x + W2(wx), y + W2(wy), 20, 28, '#ffd27a', 0.3);
      emit(cx - 36, base - 104, 72, 60, '#ffe08a', 0.2); emit(cx - 90, y + 80, 180, 24, '#ffe08a', 0.22); }
    if (V.wet) A(c, 0.28, () => { for (let s = 0; s < 5; s++) R(c, cx - 70 - s * 6, base - 40 + s * 8, 140 + s * 12, 1, '#dfe8ff'); });
  },
  anim(c, b, F, t, g) { const { x, y, w } = g, cx = x + w / 2;
    wavingFlag(c, { x: cx + 1, y: y - 24, col: GOLD, col2: '#2a1a4a' }, t, 16, 9);
    wavingFlag(c, { x: x + 15, y: y + 56, col: '#c8282e', col2: GOLD }, t + 0.7, 12, 8); wavingFlag(c, { x: x + w - 15, y: y + 56, col: '#1f2d5c', col2: GOLD }, t + 1.4, 12, 8);
    const s = (t * 0.18) % 1; if (s < 0.35) { const k = s / 0.35, gx = Math.round(cx - 56 + k * 112); A(c, 0.5 * Math.sin(Math.PI * k), () => { for (let r = 0; r < 26; r++) { const yy = r - 26, hw = Math.sqrt(676 - yy * yy) * 2.3; if (Math.abs(gx - cx) < hw - 3) R(c, gx, y + (24 + yy) * 2, 3, 2, '#ffffff'); } }); } }, // light sweeping across the dome
};

P._generic = {
  paint(c, b, F, V, g) { const { x, y, w, base } = g, top = y + Math.min(34, g.h * 0.3), cx = x + w / 2;
    dropShadow(c, x, base, w);
    wall(c, x, top, w, base - top, F.wall, 'brick', V);
    gable(c, x - 6, x + w + 6, top + 2, y - 2, F.roof, { style: 'shingle' });
    if (b.name) sign(c, cx, top + 6, b.name, F, V, { maxW: Math.max(60, w - 30), k: w < 160 ? 1 : undefined });
    if (w >= 96) winRow(c, g, F, V, top + 30, 26, 24, Math.max(1, Math.floor(w / 80)), { box: true });
    door(c, g.dx ?? cx, base, F, V, { w: 24, h: Math.min(34, g.h * 0.4) });
  },
  still: true,
};

export const PAINTERS = P;
export const BLDG_IDS = Object.freeze(Object.keys(P).filter((k) => k !== '_generic'));
const FALLBACK_F = { wall: '#6a5a8a', roof: '#2a2050', accent: '#e3b341', trim: '#f4ead8', signBg: '#1a1430', sign: '#ffe08a', glow: '#ffe08a', tag: 'generic' };

// ---------------------------------------------------------------- cache
const MARGIN = { l: 56, r: 56, t: 84, b: 24 }; // room for roofs, signs, chimneys, flags, shadows outside the footprint
export function boundsOf(b) { const x = b.x * TILE, y = b.y * TILE; return { x: x - MARGIN.l, y: y - MARGIN.t, w: b.w * TILE + MARGIN.l + MARGIN.r, h: b.h * TILE + MARGIN.t + MARGIN.b }; }
export const CACHE = new Map(); // key -> canvas (LRU, insertion order)
const GLOW_RECTS = new Map(); // night key -> emissive rects
const FRAME_GLOW = []; // [rects, k] for night buildings drawn this frame
const CACHE_MAX = 36;
export const STATS = { hits: 0, misses: 0, blits: 0, anims: 0, culled: 0, direct: 0 };
let makeCanvas = (w, h) => { try { if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h); if (typeof document !== 'undefined') { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv; } } catch {} return null; };
export function setCanvasFactory(f) { makeCanvas = f; clearCache(); }
export function clearCache() { CACHE.clear(); GLOW_RECTS.clear(); FRAME_GLOW.length = 0; }
export const cacheKey = (b, V) => `${b.id}|${b.name || ''}|${b.x},${b.y},${b.w},${b.h}|${V.night ? 'n' : 'd'}|${V.wet ? 'w' : 's'}|${V.low ? 'lo' : 'hi'}`;

function paintInto(c, b, F, V) { const p = P[b.id] || P._generic, g = geo(b);
  p.paint(c, b, F, V, g);
  if (V.low && p.anim && !p.still) { try { p.anim(c, b, F, 0, g, V); } catch {} } // reduced effects: freeze one pose into the static layer
}
function layer(b, F, V) {
  const k = cacheKey(b, V); let cv = CACHE.get(k);
  if (cv) { STATS.hits++; CACHE.delete(k); CACHE.set(k, cv); return cv; }
  STATS.misses++; const bb = boundsOf(b); cv = makeCanvas(bb.w, bb.h); if (!cv) return null;
  const cc = cv.getContext('2d'); if (!cc) return null; cc.imageSmoothingEnabled = false; cc.translate(-bb.x, -bb.y);
  GLOWS = V.night ? [] : null; try { paintInto(cc, b, F, V); } finally { if (GLOWS) GLOW_RECTS.set(k, GLOWS); GLOWS = null; }
  CACHE.set(k, cv); while (CACHE.size > CACHE_MAX) { const old = CACHE.keys().next().value; CACHE.delete(old); GLOW_RECTS.delete(old); }
  return cv;
}
let warned = false;
/** Draw one building: cached static layer(s) + live overlay. Never throws. Returns true when handled. */
export function drawBuilding(c, b, F, opts = {}) {
  try {
    if (!b || !Number.isFinite(b.x) || !Number.isFinite(b.y) || !(b.w > 0) || !(b.h > 0)) return false;
    F = F || HOME_F[b.id] || FALLBACK_F;
    const bb = boundsOf(b), view = 'view' in opts ? opts.view : viewOf(c);
    if (view && (bb.x > view.x1 || bb.x + bb.w < view.x0 || bb.y > view.y1 || bb.y + bb.h < view.y0)) { STATS.culled++; return true; }
    const nk = opts.night ?? nightK(), wet = opts.wet ?? wetNow(), low = opts.low ?? fxLow();
    const p = P[b.id] || P._generic;
    const day = layer(b, F, { night: false, wet, low });
    if (!day) { STATS.direct++; const V = { night: nk > 0.5, wet, low }; paintInto(c, b, F, V); if (!low && p.anim && !p.still) p.anim(c, b, F, opts.t ?? animT(), geo(b), V); return true; }
    const sm = c.imageSmoothingEnabled; c.imageSmoothingEnabled = false;
    if (nk < 0.999) { c.drawImage(day, bb.x, bb.y); STATS.blits++; }
    if (nk > 0.001) { const nl = layer(b, F, { night: true, wet, low }); if (nl) { A(c, nk >= 0.999 ? 1 : nk, () => c.drawImage(nl, bb.x, bb.y)); STATS.blits++; const gr = GLOW_RECTS.get(cacheKey(b, { night: true, wet, low })); if (gr && gr.length) { if (FRAME_GLOW.length > 64) FRAME_GLOW.shift(); FRAME_GLOW.push([gr, nk]); } } }
    c.imageSmoothingEnabled = sm;
    if (!low && p.anim && !p.still) { p.anim(c, b, F, opts.t ?? animT(), geo(b), { night: nk > 0.5, wet, low }); STATS.anims++; }
    return true;
  } catch (e) { if (!warned) { warned = true; try { console.warn('[bldgfx] draw failed for', b && b.id, e); } catch {} } return false; }
}

/** After the night grade (ambient.js): re-light this frame's building windows/signs. ox/oy = world->screen offset. Cheap: a few dozen fillRects. */
export function drawBuildingGlow(c, ox, oy, lit = 1) {
  if (!FRAME_GLOW.length) return 0; let n = 0;
  try { c.save(); c.globalCompositeOperation = 'lighter';
    for (const [rects, k] of FRAME_GLOW) for (const [x, y, w, h, col, a] of rects) { const al = a * k * lit; if (al <= 0.01) continue;
      c.fillStyle = col; c.globalAlpha = al * 0.28; c.fillRect(x + ox - 3, y + oy - 3, w + 6, h + 6); c.globalAlpha = al; c.fillRect(x + ox, y + oy, w, h); n++; }
  } finally { c.restore(); FRAME_GLOW.length = 0; }
  return n;
}

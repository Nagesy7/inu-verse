// Original pixel art for Round 2 rooms & zones: floors, walls and furniture for interiors; grass, sand, water, docks,
// sakura, lanterns, a shrine and a little ferry outdoors. Drawn in world px (1 tile = 32), cached per scene.
import { ST } from './scenes.js';
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
const hz = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
const FLOORS = {
  wood: (c, x, y, tx, ty) => { R(c, x, y, ST, ST, '#b07a4a'); for (let i = 0; i < 4; i++) { R(c, x, y + i * 8, ST, 1, '#8f5f36'); R(c, x + ((tx * 7 + i * 13) % 4) * 8, y + i * 8, 1, 8, '#9a6840'); } if (hz(tx, ty) < 0.2) R(c, x + 6, y + 13, 3, 1, '#c79062'); },
  tile: (c, x, y, tx, ty) => { const a = (tx + ty) % 2 ? '#e8e2d4' : '#d6cfbf'; R(c, x, y, ST, ST, a); R(c, x, y, ST, 1, '#c2baa8'); R(c, x, y, 1, ST, '#c2baa8'); },
  marble: (c, x, y, tx, ty) => { R(c, x, y, ST, ST, (tx + ty) % 2 ? '#f1ece0' : '#e6dfcf'); R(c, x, y, ST, 1, '#cfc6b2'); R(c, x, y, 1, ST, '#cfc6b2'); if (hz(tx, ty) < 0.5) R(c, x + 4 + hz(tx, ty, 2) * 20, y + 5 + hz(tx, ty, 3) * 20, 6, 1, '#d8d0bf'); },
  carpet: (c, x, y, tx, ty) => { R(c, x, y, ST, ST, '#8e4b6e'); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j + tx + ty) % 2) R(c, x + i * 8 + 3, y + j * 8 + 3, 2, 2, '#9d5a7d'); },
};
function ground(c, sc, tx, ty, cell) { const x = tx * ST, y = ty * ST, f = cell.floor;
  if (sc.kind === 'interior') {
    if (f === 'wall') { const below = sc.at(tx, ty + 1), face = below && below.floor !== 'wall'; R(c, x, y, ST, ST, face ? sc.wall : shade(sc.wall, 0.55));
      if (face) { R(c, x, y + ST - 5, ST, 5, shade(sc.wall, 0.7)); R(c, x, y + ST - 6, ST, 1, shade(sc.wall, 1.15)); for (let i = 0; i < 4; i++) R(c, x + i * 8 + 4, y + 2, 1, ST - 9, shade(sc.wall, 0.92)); }
      else { R(c, x, y + ST - 2, ST, 2, shade(sc.wall, 0.4)); }
      return; }
    if (f === 'mat') { FLOORS[sc.floor](c, x, y, tx, ty); R(c, x + 2, y + 4, ST - 4, ST - 8, '#3a6a4a'); R(c, x + 4, y + 6, ST - 8, ST - 12, '#4f8a5f'); R(c, x + 15, y + 8, 2, 8, '#d4f0c0'); R(c, x + 11, y + 14, 10, 2, '#d4f0c0'); R(c, x + 13, y + 16, 6, 2, '#d4f0c0'); R(c, x + 15, y + 18, 2, 2, '#d4f0c0'); return; } // exit mat: down arrow
    FLOORS[sc.floor](c, x, y, tx, ty);
    if (f === 'rug') { R(c, x, y, ST, ST, '#b4423c'); R(c, x + 2, y + 2, ST - 4, ST - 4, '#c75a4a'); R(c, x + 6, y + 6, ST - 12, ST - 12, '#e2b25a'); }
    return; }
  // outdoors
  if (f === 'grass') { R(c, x, y, ST, ST, '#7cbf5a'); for (let i = 0; i < 6; i++) { const gx = x + Math.floor(hz(tx, ty, i) * 30), gy = y + Math.floor(hz(tx, ty, i + 9) * 30); R(c, gx, gy, 2, 3, i % 2 ? '#6aac4c' : '#8fd06a'); } }
  else if (f === 'path') { R(c, x, y, ST, ST, '#d9c08a'); for (let i = 0; i < 4; i++) R(c, x + Math.floor(hz(tx, ty, i) * 28), y + Math.floor(hz(tx, ty, i + 5) * 28), 4, 3, '#c4a874'); }
  else if (f === 'sand') { R(c, x, y, ST, ST, '#f0d898'); for (let i = 0; i < 5; i++) R(c, x + Math.floor(hz(tx, ty, i) * 30), y + Math.floor(hz(tx, ty, i + 3) * 30), 2, 2, i % 2 ? '#e2c47e' : '#fff0c0'); }
  else if (f === 'water') { R(c, x, y, ST, ST, '#3f8fd0'); const up = sc.at(tx, ty - 1); if (up && up.floor !== 'water' && up.floor !== 'dock') { R(c, x, y, ST, 4, '#e8f4ff'); R(c, x, y + 4, ST, 2, '#8cc6ee'); } }
  else if (f === 'dock') { R(c, x, y, ST, ST, '#3f8fd0'); R(c, x, y, ST, ST - 2, '#a87a4a'); for (let i = 0; i < 4; i++) R(c, x, y + i * 8 + 7, ST, 1, '#7c5530'); R(c, x + 3, y + ST - 4, 4, 4, '#5c3d22'); R(c, x + ST - 7, y + ST - 4, 4, 4, '#5c3d22'); }
  if (f === 'path' && cell.prop === 'gate') { R(c, x + 2, y + 2, ST - 4, ST - 4, '#c7a35a'); R(c, x + 6, y + 6, ST - 12, ST - 12, '#e8cf8a'); }
}
// ---- props (depth-sorted with actors; y = ground line) ----
const P = {
  window: (c, x, y, t, n) => { R(c, x + 4, y + 4, 24, 18, '#4a3a2a'); R(c, x + 6, y + 6, 20, 14, n ? '#2a3a6a' : '#9fd6f0'); R(c, x + 15, y + 6, 2, 14, '#4a3a2a'); R(c, x + 6, y + 12, 20, 2, '#4a3a2a'); if (!n) R(c, x + 8, y + 7, 4, 3, '#e8f8ff'); },
  menu: (c, x, y) => { R(c, x + 3, y + 3, 26, 20, '#2a2a2a'); R(c, x + 4, y + 4, 24, 18, '#3a4a3a'); for (let i = 0; i < 4; i++) R(c, x + 7, y + 7 + i * 4, 10 + ((x / 8 + i) % 3) * 3, 2, '#e8e0c8'); },
  poster: (c, x, y) => { const k = hz(x, y) < 0.5; R(c, x + 7, y + 4, 18, 20, '#3a2a2a'); R(c, x + 8, y + 5, 16, 18, k ? '#f2cc68' : '#ff9ac0'); R(c, x + 12, y + 9, 8, 8, '#fff'); R(c, x + 14, y + 11, 4, 4, k ? '#e58b3a' : '#6c4fd0'); },
  safe: (c, x, y) => { R(c, x + 2, y + 3, 28, 22, '#6a6a72'); R(c, x + 4, y + 5, 24, 18, '#8a8a94'); R(c, x + 13, y + 10, 6, 6, '#d4a640'); R(c, x + 15, y + 12, 2, 2, '#4a3a1a'); },
  mirror: (c, x, y) => { R(c, x + 5, y + 2, 22, 24, '#d4a640'); R(c, x + 7, y + 4, 18, 20, '#bfe2ee'); R(c, x + 9, y + 6, 4, 10, '#e8f8ff'); },
};
function bodyProp(c, sc, cell, tx, ty, t, night) { const x = tx * ST, y = ty * ST, p = cell.prop, L = (dx, dy) => sc.at(tx + dx, ty + dy)?.prop === p;
  switch (p) {
    case 'counter': { R(c, x, y + 6, ST, 26, '#7a4a2a'); R(c, x, y + 4, ST, 6, '#c9935e'); if (!L(-1, 0)) R(c, x, y + 4, 3, 28, '#5e3820'); if (!L(1, 0)) R(c, x + ST - 3, y + 4, 3, 28, '#5e3820'); R(c, x, y + 16, ST, 2, '#5e3820'); if ((tx + ty) % 3 === 0) { R(c, x + 10, y - 2, 8, 6, '#fff'); R(c, x + 11, y - 1, 6, 2, '#e58b3a'); } break; }
    case 'machine': R(c, x + 4, y + 2, 24, 26, '#3a3a44'); R(c, x + 6, y + 5, 20, 8, '#6a6a7a'); R(c, x + 9, y + 16, 4, 6, '#222'); R(c, x + 19, y + 16, 4, 6, '#222'); R(c, x + 8, y + 7, 3, 3, Math.sin(t * 4 + tx) > 0 ? '#ff5a5a' : '#5aff7a'); if (Math.sin(t * 2 + tx) > 0.3) R(c, x + 14, y - 4 - (t * 10 % 6), 2, 4, 'rgba(255,255,255,.6)'); break;
    case 'table': R(c, x + 3, y + 8, 26, 12, '#9a6a40'); R(c, x + 3, y + 7, 26, 3, '#c08a58'); R(c, x + 6, y + 20, 3, 10, '#6a4428'); R(c, x + 23, y + 20, 3, 10, '#6a4428'); R(c, x + 12, y + 4, 8, 5, '#fff'); R(c, x + 13, y + 5, 6, 2, '#8a5a30'); break;
    case 'chair': R(c, x + 9, y + 12, 14, 4, '#c94a3a'); R(c, x + 9, y + 4, 14, 9, '#b03a2c'); R(c, x + 10, y + 16, 2, 10, '#5e3820'); R(c, x + 20, y + 16, 2, 10, '#5e3820'); break;
    case 'plant': R(c, x + 9, y + 20, 14, 10, '#b5653a'); R(c, x + 10, y + 19, 12, 3, '#8a4a2a'); for (const [a, b, col] of [[6, 4, '#3f8a3a'], [14, 0, '#4fa04a'], [18, 6, '#3f8a3a'], [10, 10, '#5fb85a'], [16, 12, '#4fa04a']]) R(c, x + a, y + b, 9, 9, col); break;
    case 'shelf': R(c, x + 2, y - 12, 28, 42, '#7a5030'); for (let i = 0; i < 4; i++) { R(c, x + 4, y - 9 + i * 10, 24, 7, '#3a2618'); for (let j = 0; j < 3; j++) R(c, x + 5 + j * 8, y - 8 + i * 10, 6, 6, ['#e58b3a', '#6c9fd0', '#f2cc68', '#ff9ac0', '#7cbf5a'][(tx + i + j + ty) % 5]); } break;
    case 'rack': R(c, x + 2, y - 6, 28, 3, '#8a8a94'); R(c, x + 3, y - 6, 2, 36, '#6a6a72'); R(c, x + 27, y - 6, 2, 36, '#6a6a72'); for (let j = 0; j < 4; j++) { const col = ['#e05a6a', '#5a8ae0', '#f2cc68', '#6ac08a', '#b06ad0'][(tx + j) % 5]; R(c, x + 5 + j * 6, y - 3, 5, 18, col); R(c, x + 5 + j * 6, y - 3, 5, 3, shade(col, 0.7)); } break;
    case 'mannequin': R(c, x + 13, y - 6, 6, 6, '#e8d8c0'); R(c, x + 10, y, 12, 14, ['#e05a6a', '#5a8ae0', '#f2cc68'][(tx + ty) % 3]); R(c, x + 15, y + 14, 2, 12, '#6a6a72'); R(c, x + 10, y + 26, 12, 3, '#6a6a72'); break;
    case 'atm': R(c, x + 6, y - 4, 20, 34, '#3a5a8a'); R(c, x + 9, y, 14, 9, '#9fe0b0'); R(c, x + 10, y + 13, 12, 6, '#2a3a5a'); R(c, x + 12, y + 22, 8, 2, '#111'); R(c, x + 10, y + 2, 6, 1, '#2a6a3a'); break;
    case 'vault': { R(c, x, y - 4, ST, 34, '#5a5a62'); R(c, x + 1, y - 3, ST - 2, 32, '#7a7a84'); if (!L(-1, 0)) R(c, x, y - 4, 2, 34, '#3a3a42'); if (!L(1, 0)) R(c, x + ST - 2, y - 4, 2, 34, '#3a3a42');
      if (L(1, 0) && !L(-1, 0) || (L(-1, 0) && L(1, 0) && !sc.at(tx - 2, ty)?.prop?.includes('vault'))) { R(c, x + 22, y + 4, 20, 20, '#9a9aa4'); R(c, x + 28, y + 10, 8, 8, '#d4a640'); } break; }
    case 'car': { const left = !L(-1, 0), col = ['#e05a4a', '#4a8ae0', '#f2cc68'][Math.floor(tx / 4) % 3]; if (left) { R(c, x + 2, y + 18, 60, 10, '#222'); R(c, x + 4, y + 4, 56, 18, col); R(c, x + 14, y - 4, 34, 12, shade(col, 0.85)); R(c, x + 17, y - 2, 13, 8, '#bfe2ee'); R(c, x + 33, y - 2, 12, 8, '#bfe2ee'); R(c, x + 8, y + 20, 12, 12, '#1a1a1a'); R(c, x + 44, y + 20, 12, 12, '#1a1a1a'); R(c, x + 12, y + 24, 4, 4, '#aaa'); R(c, x + 48, y + 24, 4, 4, '#aaa'); R(c, x + 56, y + 8, 4, 4, '#ffe9a0'); } break; }
    case 'sofa': R(c, x + 1, y + 2, 30, 12, '#4a6ab0'); R(c, x + 1, y + 12, 30, 12, '#5a7ac0'); R(c, x - 1, y + 6, 5, 20, '#3a5a9a'); R(c, x + 28, y + 6, 5, 20, '#3a5a9a'); R(c, x + 4, y + 24, 3, 5, '#2a2a2a'); R(c, x + 25, y + 24, 3, 5, '#2a2a2a'); break;
    case 'fountain': { const tl = !L(-1, 0) && !L(0, -1); if (tl) { R(c, x + 2, y + 6, 60, 54, '#9a9aa4'); R(c, x + 6, y + 10, 52, 46, '#5aa8e0'); for (let i = 0; i < 6; i++) R(c, x + 10 + ((t * 20 + i * 9) % 44), y + 16 + i * 6, 6, 2, '#bfe6ff'); R(c, x + 26, y + 16, 12, 30, '#b0b0ba'); R(c, x + 29, y + 4 - Math.abs(Math.sin(t * 3)) * 4, 6, 14, '#bfe6ff'); } break; }
    case 'lamp': R(c, x + 14, y - 10, 4, 38, '#4a4a52'); R(c, x + 8, y - 18, 16, 10, night ? '#ffe9a0' : '#f2e2b0'); R(c, x + 10, y + 26, 12, 4, '#4a4a52'); break;
    case 'board': R(c, x + 4, y - 8, 24, 26, '#7a5030'); R(c, x + 6, y - 6, 20, 22, '#e8dcc0'); for (let i = 0; i < 3; i++) R(c, x + 8 + (i % 2) * 8, y - 3 + i * 6, 7, 5, ['#ff9ac0', '#9fd6f0', '#f2cc68'][i]); R(c, x + 8, y + 18, 3, 10, '#5e3820'); R(c, x + 21, y + 18, 3, 10, '#5e3820'); break;
    case 'crate': R(c, x + 3, y + 6, 26, 24, '#a87a4a'); R(c, x + 3, y + 6, 26, 2, '#c99a62'); R(c, x + 3, y + 17, 26, 2, '#7c5530'); R(c, x + 14, y + 6, 2, 24, '#7c5530'); break;
    case 'pillow': R(c, x + 4, y + 10, 24, 16, ['#ff9ac0', '#9fd6f0', '#f2cc68'][(tx + ty) % 3]); R(c, x + 6, y + 12, 20, 3, 'rgba(255,255,255,.35)'); R(c, x + 2, y + 9, 4, 4, '#fff'); R(c, x + 26, y + 9, 4, 4, '#fff'); break;
    // outdoors
    case 'tree': R(c, x + 13, y + 14, 6, 18, '#6a4428'); R(c, x + 2, y - 14, 28, 30, '#3f8a3a'); R(c, x + 6, y - 20, 20, 10, '#4fa04a'); R(c, x + 8, y - 12, 8, 6, '#6ac05a'); break;
    case 'sakura': R(c, x + 13, y + 12, 6, 20, '#6a4428'); R(c, x, y - 16, 32, 30, '#f2a6c4'); R(c, x + 5, y - 22, 22, 10, '#f7bcd4'); R(c, x + 6, y - 12, 7, 5, '#ffd8e6'); R(c, x + 20, y - 4, 6, 4, '#e88aac'); if (Math.sin(t * 1.3 + tx) > 0.6) R(c, x + 4 + ((t * 9 + tx * 5) % 24), y + 8 + ((t * 13) % 18), 2, 2, '#ffd8e6'); break;
    case 'flowers': for (let i = 0; i < 4; i++) { const fx = x + 4 + Math.floor(hz(tx, ty, i) * 22), fy = y + 6 + Math.floor(hz(tx, ty, i + 4) * 20); R(c, fx, fy, 4, 4, ['#ff6a8a', '#ffe14a', '#a07aff', '#fff'][i]); R(c, fx + 1, fy + 4, 2, 3, '#3f8a3a'); } break;
    case 'bench': R(c, x + 2, y + 8, 28, 4, '#a87a4a'); R(c, x + 2, y + 14, 28, 5, '#c99a62'); R(c, x + 4, y + 19, 3, 9, '#4a4a52'); R(c, x + 25, y + 19, 3, 9, '#4a4a52'); break;
    case 'hedge': R(c, x, y - 4, ST, 34, '#3f8a3a'); R(c, x, y - 4, ST, 4, '#5fb85a'); break;
    case 'lantern': R(c, x + 12, y + 20, 8, 10, '#8a8a94'); R(c, x + 14, y + 6, 4, 14, '#8a8a94'); R(c, x + 8, y - 6, 16, 14, '#a8a8b2'); R(c, x + 11, y - 3, 10, 8, night ? '#ffe9a0' : '#f2e2b0'); R(c, x + 6, y - 9, 20, 4, '#6a6a72'); break;
    case 'fountain_': break;
    case 'rock': R(c, x + 4, y + 10, 24, 18, '#8a8a94'); R(c, x + 8, y + 6, 14, 8, '#a8a8b2'); R(c, x + 10, y + 8, 5, 3, '#c8c8d2'); break;
    case 'umbrella': R(c, x + 15, y - 4, 2, 32, '#e8e0d0'); for (let i = 0; i < 5; i++) R(c, x - 2 + i * 7, y - 12 + Math.abs(2 - i) * 2, 7, 8, i % 2 ? '#fff' : '#e05a6a'); R(c, x + 2, y + 24, 28, 4, 'rgba(0,0,0,.12)'); break;
    case 'palm': R(c, x + 14, y - 6, 5, 36, '#9a6a3a'); for (const [a, b] of [[-6, -14], [10, -18], [20, -12], [2, -8], [16, -6]]) R(c, x + a, y + b, 16, 6, '#3f9a4a'); R(c, x + 13, y - 8, 6, 6, '#6a4428'); break;
    case 'castle': R(c, x + 6, y + 14, 20, 14, '#e2c47e'); R(c, x + 6, y + 8, 6, 6, '#e2c47e'); R(c, x + 20, y + 8, 6, 6, '#e2c47e'); R(c, x + 13, y + 4, 6, 10, '#d6b46e'); R(c, x + 15, y - 2, 1, 6, '#6a4428'); R(c, x + 16, y - 2, 5, 3, '#e05a6a'); break;
    case 'hut': R(c, x - 2, y - 14, 36, 10, '#e05a4a'); R(c, x + 2, y - 4, 28, 30, '#f2e2c0'); R(c, x + 11, y + 8, 10, 18, '#8a5a30'); R(c, x + 4, y - 2, 6, 6, '#9fd6f0'); break;
    case 'ferry': { if (!L(-1, 0)) { const b = Math.round(Math.sin(t * 2) * 1.5); R(c, x - 4, y + 8 + b, 70, 16, '#f2f2f2'); R(c, x, y + 22 + b, 62, 4, '#c0392b'); R(c, x + 10, y - 6 + b, 34, 16, '#3a6ab0'); R(c, x + 14, y - 3 + b, 8, 7, '#bfe2ee'); R(c, x + 26, y - 3 + b, 8, 7, '#bfe2ee'); R(c, x + 46, y - 16 + b, 4, 24, '#555'); R(c, x + 50, y - 16 + b, 12, 8, '#f2cc68'); } break; }
    case 'arch': { const lft = sc.at(tx + 2, ty)?.prop === 'arch'; R(c, x + 10, y - 26, 10, 56, '#c0392b'); if (lft) { R(c, x + 2, y - 34, 86, 8, '#a02a1e'); R(c, x + 6, y - 24, 78, 5, '#c0392b'); R(c, x + 40, y - 26, 10, 8, '#c0392b'); } break; }
    case 'shrine': { const top = sc.at(tx, ty - 1)?.prop !== 'shrine', lft = sc.at(tx - 1, ty)?.prop !== 'shrine', rgt = sc.at(tx + 1, ty)?.prop !== 'shrine';
      R(c, x, y, ST, ST, '#c9935e'); R(c, x, y + ST - 4, ST, 4, '#7a4a2a'); if ((tx + ty) % 2) R(c, x + 8, y + 6, 16, 18, '#7a4a2a');
      if (top) { R(c, x - (lft ? 8 : 0), y - 14, ST + (lft ? 8 : 0) + (rgt ? 8 : 0), 14, '#3a4a6a'); R(c, x - (lft ? 10 : 0), y - 4, ST + (lft ? 10 : 0) + (rgt ? 10 : 0), 4, '#2a3550'); if (!lft && !rgt) R(c, x + 12, y - 22, 8, 8, '#d4a640'); } break; }
    case 'bell': R(c, x + 4, y - 18, 24, 4, '#7a4a2a'); R(c, x + 6, y - 18, 3, 44, '#7a4a2a'); R(c, x + 23, y - 18, 3, 44, '#7a4a2a'); { const sw = Math.round(Math.sin(t * 2) * 1); R(c, x + 11 + sw, y - 12, 10, 12, '#d4a640'); R(c, x + 10 + sw, y - 1, 12, 3, '#b0862a'); R(c, x + 15 + sw, y + 2, 2, 12, '#e8e0c0'); } break;
    case 'stall': R(c, x - 2, y - 12, 36, 8, '#e05a6a'); for (let i = 0; i < 5; i++) R(c, x - 2 + i * 8, y - 4, 4, 4, '#fff'); R(c, x + 2, y - 4, 2, 32, '#7a4a2a'); R(c, x + 28, y - 4, 2, 32, '#7a4a2a'); R(c, x, y + 12, 32, 14, '#c9935e'); for (let i = 0; i < 4; i++) R(c, x + 3 + i * 7, y + 8, 5, 6, ['#ff9ac0', '#9fd6f0', '#f2cc68', '#7cbf5a'][i]); break;
  } }
// one offscreen canvas per scene with every static ground tile (+ wall decorations)
const groundCache = new Map();
export function sceneGround(sc, night = false) { const k = sc.id + (night ? ':n' : ''); if (groundCache.has(k)) return groundCache.get(k);
  const cv = (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(sc.w * ST, sc.h * ST) : Object.assign(document.createElement('canvas'), { width: sc.w * ST, height: sc.h * ST }); const c = cv.getContext('2d');
  for (let ty = 0; ty < sc.h; ty++) for (let tx = 0; tx < sc.w; tx++) { const cell = sc.at(tx, ty); ground(c, sc, tx, ty, cell); if (P[cell.prop]) P[cell.prop](c, tx * ST, ty * ST, 0, night); }
  groundCache.set(k, cv); return cv; }
// dynamic/depth props for the current scene: [{ y, d(c) }]
export function sceneProps(sc, t, night) { const out = [];
  for (let ty = 0; ty < sc.h; ty++) for (let tx = 0; tx < sc.w; tx++) { const cell = sc.at(tx, ty); if (!cell.prop || P[cell.prop] || cell.prop === 'gate') continue; const flat = cell.prop === 'flowers' || cell.prop === 'pillow' || cell.prop === 'chair';
    out.push({ y: flat ? (ty) * ST + 4 : (ty + 1) * ST - 2, d: (c) => bodyProp(c, sc, cell, tx, ty, t, night) }); }
  return out; }
// animated water sparkle (only visible tiles)
export function drawSceneWater(c, sc, t, x0, y0, x1, y1) { for (let ty = Math.max(0, y0); ty < Math.min(sc.h, y1); ty++) for (let tx = Math.max(0, x0); tx < Math.min(sc.w, x1); tx++) { const cell = sc.at(tx, ty); if (cell.floor !== 'water') continue;
  const ph = t * 1.4 + hz(tx, ty) * 6.28, x = tx * ST, y = ty * ST; c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(x + ((Math.sin(ph) + 1) * 10 | 0) + 2, y + 10 + ((ty * 7) % 12), 8, 2); c.fillStyle = 'rgba(20,60,120,.25)'; c.fillRect(x + ((Math.cos(ph * 0.8) + 1) * 8 | 0) + 6, y + 22, 10, 2); } }
// hub gate arches (drawn on the main map at each HUB_GATES stand tile)
export function hubGateProp(g, t) { const x = g.tx * ST, y = g.ty * ST, wide = g.face === 'down' ? 2 : 1; // torii-style arch drawn over the border trees so the exit reads clearly
  return { y: y + ST * 4, d: (c) => { const L = x - 6, Rr = x + wide * ST - 2, top = y - 34, foot = y + ST - 2;
    R(c, L - 1, top + 6, 10, foot - top - 6, '#5a1a12'); R(c, Rr - 1, top + 6, 10, foot - top - 6, '#5a1a12'); R(c, L, top + 6, 8, foot - top - 7, '#c0392b'); R(c, Rr, top + 6, 8, foot - top - 7, '#c0392b');
    R(c, L - 10, top - 1, Rr - L + 28, 9, '#5a1a12'); R(c, L - 9, top, Rr - L + 26, 7, '#a02a1e'); R(c, L - 4, top + 12, Rr - L + 16, 5, '#c0392b');
    const sw = 34, sx = Math.round((L + Rr + 8) / 2 - sw / 2); R(c, sx - 1, top + 19, sw + 2, 13, '#5a1a12'); R(c, sx, top + 20, sw, 11, '#f2e2c0');
    c.fillStyle = '#7a2a1e'; c.font = '6px Silkscreen, monospace'; c.textAlign = 'center'; c.fillText(g.face === 'down' ? 'BEACH' : 'PARK', sx + sw / 2, top + 28);
    const b = Math.round(Math.sin(t * 5) * 2), ax = Math.round((L + Rr + 8) / 2), ay = foot - 14;
    if (g.face === 'down') { R(c, ax - 4, ay + b, 8, 3, '#f2cc68'); R(c, ax - 2, ay + 3 + b, 4, 3, '#f2cc68'); }
    else { R(c, ax - 3 + b, ay - 4, 3, 8, '#f2cc68'); R(c, ax + b, ay - 2, 3, 4, '#f2cc68'); } } }; }

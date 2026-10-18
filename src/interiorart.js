// Shop interior art (original Inu Verse style: chunky top-down props, warm outlines, soft drop shadows) + the cached layer.
// The static room (walls, floor, every placed prop, lamp light pools) is drawn ONCE to an offscreen canvas and re-used every
// frame; it is redrawn only when the layout, theme or size changes (ShopLayer.redraws counts it; tests check it). Selection,
// hover ghost and the shopkeeper are drawn live on top. No per-frame allocation in draw().
import { PROPS, THEMES, COLS, ROWS, DOOR, footprint } from './interiors.js';
const INK = '#3a2418';
function rr(c, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath(); }
const box = (c, x, y, w, h, r, fill, line = INK) => { rr(c, x, y, w, h, r); c.fillStyle = fill; c.fill(); if (line) { c.lineWidth = 1.5; c.strokeStyle = line; c.stroke(); } };
const dot = (c, x, y, r, fill) => { c.beginPath(); c.arc(x, y, Math.max(0.5, r), 0, 7); c.fillStyle = fill; c.fill(); };
const loaf = (c, x, y, s) => { c.beginPath(); c.ellipse(x, y, s, s * 0.6, 0, 0, 7); c.fillStyle = '#d08a3a'; c.fill(); c.fillStyle = '#f2c27a'; c.fillRect(x - s * 0.5, y - 1, s, 1.5); };
const flower = (c, x, y, s, col) => { for (let k = 0; k < 5; k++) { const a = k * 1.2566; dot(c, x + Math.cos(a) * s, y + Math.sin(a) * s, s * 0.8, col); } dot(c, x, y, s * 0.6, '#ffe07a'); };
// draw one prop into the W x H box centred at the origin (already rotated). u = cell size.
function body(c, id, W, H, u) { const d = PROPS[id], L = -W / 2 + 3, T = -H / 2 + 3, w = W - 6, h = H - 6, col = d.col;
  switch (id) {
    case 'pendant': case 'kb_chandelier': { const g = id === 'kb_chandelier'; c.strokeStyle = INK; c.lineWidth = 1; c.beginPath(); c.moveTo(0, T); c.lineTo(0, -h * 0.1); c.stroke(); dot(c, 0, h * 0.05, w * (g ? 0.36 : 0.28), g ? '#c9a23a' : '#5a4a3a'); dot(c, 0, h * 0.05, w * (g ? 0.26 : 0.18), col); if (g) for (let k = 0; k < 6; k++) { const a = k * 1.047; dot(c, Math.cos(a) * w * 0.36, h * 0.05 + Math.sin(a) * w * 0.36, 2, '#fff6c0'); } break; }
    case 'floorlamp': dot(c, 0, 0, w * 0.4, '#6a4a32'); dot(c, 0, 0, w * 0.3, col); dot(c, 0, 0, w * 0.1, '#fff6d8'); break;
    case 'plant': dot(c, 0, h * 0.18, w * 0.3, '#c0623b'); for (let k = 0; k < 6; k++) { const a = k * 1.047; c.beginPath(); c.ellipse(Math.cos(a) * w * 0.2, Math.sin(a) * h * 0.2 - h * 0.05, w * 0.22, h * 0.12, a, 0, 7); c.fillStyle = k % 2 ? '#4a9a54' : col; c.fill(); } break;
    case 'stool': dot(c, 0, 0, w * 0.38, INK); dot(c, 0, 0, w * 0.34, col); dot(c, -w * 0.08, -h * 0.08, w * 0.12, 'rgba(255,255,255,.35)'); break;
    case 'bench': case 'fl_bench': box(c, L, T + h * 0.2, w, h * 0.6, 4, col); for (let k = 1; k < 4; k++) { c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(L + (w / 4) * k, T + h * 0.22, 1.5, h * 0.56); } if (id === 'fl_bench') { dot(c, L + w * 0.2, 0, h * 0.18, '#c0623b'); flower(c, L + w * 0.2, -2, 3, '#e87aa8'); dot(c, L + w * 0.75, 0, h * 0.16, '#c0623b'); } break;
    case 'register': box(c, L + 2, T + h * 0.2, w - 4, h * 0.7, 3, col); box(c, L + w * 0.2, T, w * 0.6, h * 0.35, 2, '#7ad3a0'); c.fillStyle = '#ffd23a'; c.fillRect(-2, T + h * 0.55, 4, 3); break;
    case 'chalk': box(c, L + 2, T + 2, w - 4, h - 4, 2, '#8a5a34'); c.fillStyle = col; c.fillRect(L + 5, T + 5, w - 10, h - 10); c.fillStyle = '#f4ead2'; for (let k = 0; k < 3; k++) c.fillRect(L + 7, T + 8 + k * (h - 16) / 3, (w - 14) * (k === 1 ? 0.6 : 0.85), 1.5); break;
    case 'runner': box(c, L + w * 0.1, T, w * 0.8, h, 3, col, null); c.strokeStyle = '#f2cc68'; c.lineWidth = 1.5; c.strokeRect(L + w * 0.18, T + 4, w * 0.64, h - 8); break;
    // counters: wooden top + front lip + goods on top
    case 'bk_counter': case 'cf_bar': case 'fl_counter': case 'bt_counter': case 'gr_counter': case 'st_counter': {
      box(c, L, T, w, h, 4, col); c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(L + 2, T + h * 0.72, w - 4, h * 0.22); c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(L + 3, T + 3, w - 6, 2);
      const n = Math.max(2, Math.round(w / u * 2));
      for (let k = 0; k < n; k++) { const x = L + (k + 0.5) * (w / n), y = T + h * 0.38;
        if (id === 'bk_counter') loaf(c, x, y, u * 0.12); else if (id === 'cf_bar') { dot(c, x, y, u * 0.08, '#fff'); dot(c, x, y, u * 0.05, '#8a5a38'); } else if (id === 'fl_counter') { c.fillStyle = k % 2 ? '#fff6f0' : '#f4d8e4'; c.fillRect(x - 3, y - 4, 6, 8); }
        else if (id === 'bt_counter') { c.fillStyle = k % 2 ? '#e87aa8' : '#9a6ad0'; c.fillRect(x - 4, y - 2, 8, 4); } else if (id === 'gr_counter') { dot(c, x, y, u * 0.07, k % 2 ? '#ffd86a' : '#7ad0e0'); } else { dot(c, x, y, u * 0.09, ['#e8344a', '#ff9a3a', '#6aa84a', '#ffd23a'][k % 4]); } }
      break; }
    // display cases: glass top with goods inside
    case 'bk_case': case 'cf_case': case 'fl_cooler': case 'bt_case': case 'gr_jars': case 'st_cooler': {
      box(c, L, T, w, h, 3, '#8a6a4a'); c.fillStyle = 'rgba(190,230,250,.85)'; c.fillRect(L + 3, T + 3, w - 6, h - 6); c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(L + 4, T + 4, (w - 8) * 0.3, 2);
      const n = Math.max(2, Math.round(w / u * 2.5));
      for (let k = 0; k < n; k++) { const x = L + 3 + (k + 0.5) * ((w - 6) / n), y = T + h * 0.55;
        if (id === 'bk_case') { dot(c, x, y, u * 0.1, '#fff'); dot(c, x, y - 1, u * 0.07, k % 2 ? '#e8507a' : '#f2c27a'); } else if (id === 'cf_case') { c.beginPath(); c.ellipse(x, y, u * 0.09, u * 0.06, 0, 0, 7); c.fillStyle = '#c88a4a'; c.fill(); }
        else if (id === 'fl_cooler') flower(c, x, y, 2.4, ['#e8507a', '#ffb0c8', '#9a6ad0'][k % 3]); else if (id === 'bt_case') { c.fillStyle = ['#e8507a', '#5ab0d8', '#f2cc68'][k % 3]; c.fillRect(x - 3, y - 2, 6, 4); dot(c, x, y, 1.4, '#fff'); }
        else if (id === 'gr_jars') { box(c, x - 3, y - 4, 6, 8, 2, '#f4f8fc', '#8a9aa8'); c.fillStyle = '#c08a4a'; c.fillRect(x - 2, y, 4, 3); } else { dot(c, x, y, u * 0.06, k % 2 ? '#fffaf0' : '#f2e4c8'); } }
      break; }
    // shelves (against walls): stacked colourful goods
    case 'bk_rack': case 'cf_shelf': case 'fl_shelf': case 'bt_shelf': case 'gr_shelf': case 'st_shelf': {
      box(c, L, T, w, h, 3, col); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(L + 3, T + h / 2 - 1, w - 6, 2); const n = Math.max(3, Math.round(w / u * 3));
      for (let r = 0; r < 2; r++) for (let k = 0; k < n; k++) { const x = L + 4 + k * ((w - 8) / n), y = T + 4 + r * (h / 2 - 2), iw = (w - 8) / n - 2, ih = h / 2 - 7;
        if (id === 'bk_rack') loaf(c, x + iw / 2, y + ih / 2, iw * 0.45); else if (id === 'cf_shelf') { box(c, x, y + 1, iw, ih - 1, 2, ['#fff', '#f2cc68', '#e87aa8', '#7ad3f0'][(k + r) % 4], null); }
        else if (id === 'fl_shelf') { dot(c, x + iw / 2, y + ih / 2 + 1, iw * 0.35, '#c0623b'); dot(c, x + iw / 2, y + ih / 2 - 1, iw * 0.4, (k + r) % 2 ? '#5fb36a' : '#3a8c3e'); }
        else if (id === 'bt_shelf') { c.fillStyle = ['#9a6ad0', '#e87aa8', '#f2e4c8', '#5ab0d8'][(k + r) % 4]; c.fillRect(x, y + 2, iw, ih - 2); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(x, y + ih / 2, iw, 1); }
        else if (id === 'gr_shelf') { box(c, x, y + 1, iw, ih - 1, 2, ['#ffd86a', '#e86a8a', '#7ad0e0', '#9fd8c0'][(k + r) % 4], null); drawBone(c, x + iw / 2, y + ih / 2, iw * 0.25); }
        else { box(c, x + 1, y + 1, iw - 2, ih - 1, 2, 'rgba(230,240,250,.9)', null); c.fillStyle = ['#e8344a', '#ff9a3a', '#ffd23a'][(k + r) % 3]; c.fillRect(x + 2, y + ih * 0.45, iw - 4, ih * 0.5); } }
      break; }
    case 'bk_oven': box(c, L, T, w, h, 6, col); for (let k = 0; k < 5; k++) { c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(L + 2, T + 3 + k * (h - 6) / 5, w - 4, 1); } c.beginPath(); c.arc(0, T + h * 0.75, w * 0.18, Math.PI, 0); c.fillStyle = '#2a1a12'; c.fill(); dot(c, 0, T + h * 0.68, w * 0.08, '#ff8a3a'); dot(c, 0, T + h * 0.68, w * 0.04, '#ffe07a'); break;
    case 'bk_table': case 'cf_table': { const r = Math.min(w, h) * 0.42; if (id === 'cf_table') { box(c, L + 2, T + 2, w - 4, h - 4, 8, col); dot(c, L + w * 0.3, 0, 4, '#fff'); dot(c, L + w * 0.7, 0, 4, '#fff'); dot(c, L + w * 0.3, 0, 2.5, '#8a5a38'); dot(c, L + w * 0.7, 0, 2.5, '#8a5a38'); } else { dot(c, 0, 0, r + 1.5, INK); dot(c, 0, 0, r, col); dot(c, 0, 0, r * 0.4, '#fff'); dot(c, 0, 0, r * 0.25, '#e8507a'); } break; }
    case 'bk_flour': for (const [dx, dy] of [[-0.18, -0.12], [0.16, -0.08], [0, 0.16]]) { box(c, dx * w - w * 0.2, dy * h - h * 0.18, w * 0.4, h * 0.36, 5, col); c.fillStyle = '#c8b490'; c.fillRect(dx * w - 3, dy * h - 1, 6, 2); } break;
    case 'cf_machine': box(c, L + 2, T + 2, w - 4, h - 4, 4, col); box(c, L + w * 0.2, T + 4, w * 0.6, h * 0.35, 3, '#3a3f4c', null); dot(c, 0, T + h * 0.72, w * 0.12, '#fff'); dot(c, 0, T + h * 0.72, w * 0.07, '#6a4630'); dot(c, L + w * 0.8, T + h * 0.2, 2, '#ff5a5a'); break;
    case 'cf_arm': case 'bt_pouf': if (id === 'bt_pouf') { dot(c, 0, 0, w * 0.42, INK); dot(c, 0, 0, w * 0.4, col); c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(k * 1.57) * w * 0.35, Math.sin(k * 1.57) * w * 0.35); c.stroke(); } } else { box(c, L, T, w, h, 7, col); box(c, L + 4, T + 4, w - 8, h * 0.3, 4, 'rgba(0,0,0,.2)', null); box(c, L + 4, T + h * 0.42, w - 8, h * 0.5, 4, 'rgba(255,255,255,.25)', null); } break;
    case 'cf_beans': for (const [dx, dy, k] of [[-0.16, -0.1, 0], [0.16, -0.06, 1], [0, 0.16, 2]]) { box(c, dx * w - w * 0.2, dy * h - h * 0.18, w * 0.4, h * 0.36, 5, k === 1 ? '#7a5638' : col); for (let q = 0; q < 3; q++) dot(c, dx * w - 3 + q * 3, dy * h, 1.2, '#3a2418'); } break;
    case 'fl_buckets': for (let k = 0; k < 3; k++) { const x = L + (k + 0.5) * (w / 3); dot(c, x, 0, Math.min(w / 6, h / 2) * 0.9, col); dot(c, x, 0, Math.min(w / 6, h / 2) * 0.75, '#4a5a6a'); for (let q = 0; q < 4; q++) flower(c, x + Math.cos(q * 1.6 + k) * 4, Math.sin(q * 1.6 + k) * 4, 2.4, ['#e8507a', '#ffd23a', '#ffb0c8', '#ff7a3a'][(q + k) % 4]); } break;
    case 'fl_can': c.beginPath(); c.ellipse(0, 0, w * 0.3, h * 0.24, 0, 0, 7); c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.2; c.stroke(); c.fillStyle = col; c.fillRect(w * 0.2, -2, w * 0.25, 3); c.beginPath(); c.arc(-w * 0.05, -h * 0.2, w * 0.15, Math.PI, 0); c.stroke(); break;
    case 'bt_rack': { c.strokeStyle = '#8a8aa0'; c.lineWidth = 2; c.beginPath(); c.moveTo(L + 3, 0); c.lineTo(L + w - 3, 0); c.stroke(); const n = Math.round(w / u * 3); for (let k = 0; k < n; k++) { const x = L + 6 + k * ((w - 12) / Math.max(1, n - 1)); c.beginPath(); c.moveTo(x - 4, -h * 0.35); c.lineTo(x + 4, -h * 0.35); c.lineTo(x + 5, h * 0.35); c.lineTo(x - 5, h * 0.35); c.closePath(); c.fillStyle = ['#e87aa8', '#9a6ad0', '#5ab0d8', '#f2cc68', '#fff'][k % 5]; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); } break; }
    case 'bt_mirror': box(c, L + 3, T + 1, w - 6, h - 2, 8, '#d4a640'); box(c, L + 6, T + 4, w - 12, h - 8, 6, col, null); c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(L + 9, T + 7, 2, h * 0.4); break;
    case 'bt_dummy': case 'kb_statue': { const g = id === 'kb_statue'; dot(c, 0, h * 0.18, w * 0.34, g ? '#6a5a4a' : '#8a8aa0'); dot(c, 0, -h * 0.02, w * 0.28, g ? '#e3b341' : col); for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * w * 0.24, -h * 0.12); c.lineTo(s * w * 0.18, -h * 0.38); c.lineTo(s * w * 0.04, -h * 0.2); c.fillStyle = g ? '#e3b341' : col; c.fill(); } if (!g) { c.fillStyle = '#e87aa8'; c.fillRect(-w * 0.22, h * 0.12, w * 0.44, 3); } else { dot(c, -w * 0.08, -h * 0.05, 1.4, INK); dot(c, w * 0.08, -h * 0.05, 1.4, INK); dot(c, w * 0.2, -h * 0.25, 1.5, '#fff6c0'); } break; }
    case 'gr_tub': box(c, L, T, w, h, 9, '#dfe8ee'); box(c, L + 4, T + 4, w - 8, h - 8, 7, '#8fd0ea', null); for (let k = 0; k < 7; k++) dot(c, L + 8 + (k * 13) % (w - 16), T + 7 + (k * 7) % (h - 14), 2.5 + (k % 3), 'rgba(255,255,255,.9)'); dot(c, L + w - 8, T + 6, 2.5, '#c9ced8'); break;
    case 'gr_table': box(c, L + 2, T + 2, w - 4, h - 4, 4, col); box(c, L + 6, T + 5, w - 12, h - 10, 3, '#5a6a7a', null); c.strokeStyle = '#c9ced8'; c.lineWidth = 2; c.beginPath(); c.moveTo(L + w * 0.8, T + 4); c.lineTo(L + w * 0.8, -h * 0.5); c.stroke(); dot(c, L + w * 0.8, T + 4, 2, '#e86a8a'); break;
    case 'gr_dryer': dot(c, 0, h * 0.2, w * 0.2, '#5a6a7a'); c.beginPath(); c.ellipse(0, -h * 0.05, w * 0.36, h * 0.26, 0, 0, 7); c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.2; c.stroke(); dot(c, w * 0.12, -h * 0.05, w * 0.12, '#fff'); break;
    case 'gr_bed': c.beginPath(); c.ellipse(0, 0, w * 0.44, h * 0.38, 0, 0, 7); c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.2; c.stroke(); c.beginPath(); c.ellipse(0, 1, w * 0.28, h * 0.22, 0, 0, 7); c.fillStyle = '#fff6e0'; c.fill(); drawBone(c, 0, 1, w * 0.12); break;
    case 'st_crates': for (let k = 0; k < 2; k++) { const x = L + k * (w / 2) + 1; box(c, x, T, w / 2 - 2, h, 2, col); c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(x + 2, T + h / 2, w / 2 - 6, 1.5); for (let q = 0; q < 6; q++) dot(c, x + 5 + (q % 3) * ((w / 2 - 10) / 2), T + 5 + Math.floor(q / 3) * (h - 10), u * 0.08, k ? '#ff9a3a' : '#6aa84a'); } break;
    case 'st_scale': box(c, L + 4, T + h * 0.3, w - 8, h * 0.6, 3, '#8a7a6a'); dot(c, 0, -h * 0.05, w * 0.32, col); dot(c, 0, -h * 0.05, w * 0.22, '#fff6d8'); c.strokeStyle = '#e8344a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, -h * 0.05); c.lineTo(w * 0.15, -h * 0.18); c.stroke(); break;
    case 'st_barrel': dot(c, 0, 0, w * 0.42, INK); dot(c, 0, 0, w * 0.4, col); c.strokeStyle = '#3a2418'; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, w * 0.32, 0, 7); c.stroke(); for (let q = 0; q < 7; q++) dot(c, Math.cos(q * 0.9) * w * 0.18, Math.sin(q * 0.9) * w * 0.18, w * 0.09, q % 3 ? '#e8344a' : '#ff6a5a'); break;
    case 'st_bale': box(c, L + 2, T + 4, w - 4, h - 8, 3, col); c.fillStyle = 'rgba(160,120,40,.5)'; for (let k = 0; k < 4; k++) c.fillRect(L + 4, T + 7 + k * (h - 14) / 4, w - 8, 1); c.fillStyle = '#a8323a'; c.fillRect(L + w * 0.3, T + 4, 2, h - 8); c.fillRect(L + w * 0.68, T + 4, 2, h - 8); break;
    default: box(c, L, T, w, h, 4, col); }
}
function drawBone(c, x, y, s) { c.fillStyle = '#fff6e0'; c.fillRect(x - s, y - s * 0.3, s * 2, s * 0.6); for (const sx of [-1, 1]) for (const sy of [-1, 1]) dot(c, x + sx * s, y + sy * s * 0.35, s * 0.4, '#fff6e0'); }
export function drawProp(c, id, x, y, cell, rot = 0, alpha = 1) { const d = PROPS[id]; if (!d) return; const f = footprint(id, rot), w = f.w * cell, h = f.h * cell;
  c.save(); c.globalAlpha = alpha; c.translate(x + w / 2, y + h / 2); c.rotate(rot * Math.PI / 2);
  if (d.layer === 'obj') { c.save(); c.translate(2, 4); c.globalAlpha = alpha * 0.22; rr(c, -d.w * cell / 2 + 4, -d.h * cell / 2 + 4, d.w * cell - 8, d.h * cell - 8, 6); c.fillStyle = '#000'; c.fill(); c.restore(); } // soft drop shadow (no shadowBlur: cheap)
  body(c, id, d.w * cell, d.h * cell, cell); c.restore(); }
// back wall (with theme sign + windows + sconces), floor pattern, door mat
export function drawShell(c, type, name, ox, oy, cell) { const T = THEMES[type] || THEMES.bakery, W = COLS * cell, H = ROWS * cell, wallH = Math.round(cell * 1.5);
  c.fillStyle = T.wall; c.fillRect(ox - 12, oy - wallH, W + 24, wallH); c.fillStyle = 'rgba(0,0,0,.06)'; for (let i = 0; i < W + 24; i += Math.max(6, cell / 3)) c.fillRect(ox - 12 + i, oy - wallH, 1.5, wallH);
  c.fillStyle = T.trim; c.fillRect(ox - 12, oy - 9, W + 24, 9); c.fillRect(ox - 12, oy - wallH, W + 24, 5);
  for (const wx of [1.2, 8.8]) { box(c, ox + wx * cell, oy - wallH + 9, cell * 2, wallH - 24, 4, '#fff'); c.fillStyle = '#bfe6ff'; c.fillRect(ox + wx * cell + 4, oy - wallH + 13, cell * 2 - 8, wallH - 32); c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(ox + wx * cell + cell - 1, oy - wallH + 13, 2, wallH - 32); c.fillStyle = T.accent; for (let k = 0; k < 6; k++) c.fillRect(ox + wx * cell + k * cell / 3, oy - wallH + 9, cell / 6, 5); }
  box(c, ox + cell * 4, oy - wallH + 8, cell * 4, Math.max(14, cell * 0.55), 4, INK); box(c, ox + cell * 4 + 2, oy - wallH + 10, cell * 4 - 4, Math.max(10, cell * 0.55 - 4), 3, T.accent, null);
  c.fillStyle = '#fff'; c.font = `${Math.max(7, Math.round(cell * 0.3))}px Silkscreen, monospace`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(name || '').toUpperCase().slice(0, 18), ox + cell * 6, oy - wallH + 8 + Math.max(14, cell * 0.55) / 2 + 0.5);
  for (const sx of [3.4, 8.6]) { dot(c, ox + sx * cell, oy - wallH * 0.38, 4, '#8a5a34'); dot(c, ox + sx * cell, oy - wallH * 0.38 - 3, 3, '#ffe7a3'); }
  c.fillStyle = T.floor; c.fillRect(ox, oy, W, H); c.strokeStyle = T.line; c.fillStyle = T.line; c.lineWidth = 1;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const px = ox + x * cell, py = oy + y * cell;
    if (T.tile === 'check') { if ((x + y) % 2) c.fillRect(px, py, cell, cell); } else if (T.tile === 'plank') { c.fillRect(px, py + cell - 1, cell, 1); if ((x + y * 2) % 3 === 0) c.fillRect(px, py, 1, cell); }
    else if (T.tile === 'stone') { c.strokeRect(px + 1.5, py + 1.5, cell - 3, cell - 3); } else { c.save(); c.beginPath(); c.rect(px, py, cell, cell); c.clip(); c.beginPath(); for (let k = -1; k < 3; k++) { c.moveTo(px + k * cell / 2, py + cell); c.lineTo(px + k * cell / 2 + cell / 2, py); } c.stroke(); c.restore(); } }
  c.fillStyle = 'rgba(0,0,0,.14)'; c.fillRect(ox, oy, W, 7);
  const [d0] = DOOR; box(c, ox + d0[0] * cell + 4, oy + d0[1] * cell + cell * 0.25, cell * 2 - 8, cell * 0.7, 4, '#8a5a34'); c.fillStyle = '#c8a070'; c.fillRect(ox + d0[0] * cell + 8, oy + d0[1] * cell + cell * 0.4, cell * 2 - 16, cell * 0.4);
  c.strokeStyle = '#5a4030'; c.lineWidth = 5; c.strokeRect(ox - 2.5, oy - 2.5, W + 5, H + 5); c.fillStyle = T.floor; c.fillRect(ox + d0[0] * cell + 2, oy + H - 1, cell * 2 - 4, 6); }
export function drawLights(c, items, ox, oy, cell, night) { c.save(); c.globalCompositeOperation = 'lighter';
  for (const o of items) { if (PROPS[o.id]?.cat !== 'light') continue; const f = footprint(o.id, o.rot), x = ox + (o.x + f.w / 2) * cell, y = oy + (o.y + f.h / 2) * cell, r = cell * (o.id === 'kb_chandelier' ? 2.6 : 2);
    const g = c.createRadialGradient(x, y, 2, x, y, r); g.addColorStop(0, `rgba(255,214,140,${night ? 0.34 : 0.2})`); g.addColorStop(1, 'rgba(255,214,140,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }
  c.restore(); }
export function drawLayout(c, type, name, items, ox, oy, cell, { night = false } = {}) { drawShell(c, type, name, ox, oy, cell);
  const sorted = items.map((o, i) => [o, i]).sort((a, b) => (PROPS[a[0].id].layer === 'floor' ? -1 : 0) - (PROPS[b[0].id].layer === 'floor' ? -1 : 0) || a[0].y - b[0].y || a[1] - b[1]);
  for (const [o] of sorted) drawProp(c, o.id, ox + o.x * cell, oy + o.y * cell, cell, o.rot); drawLights(c, items, ox, oy, cell, night); }
export function drawGrid(c, ox, oy, cell) { c.strokeStyle = 'rgba(90,64,48,0.16)'; c.lineWidth = 1; c.beginPath(); for (let x = 0; x <= COLS; x++) { c.moveTo(ox + x * cell + 0.5, oy); c.lineTo(ox + x * cell + 0.5, oy + ROWS * cell); } for (let y = 0; y <= ROWS; y++) { c.moveTo(ox, oy + y * cell + 0.5); c.lineTo(ox + COLS * cell, oy + y * cell + 0.5); } c.stroke(); }
// The cached static layer. makeCanvas(w, h) -> canvas (document canvas in the game, a fake in tests).
export function createShopLayer(makeCanvas = (w, h) => { const cv = globalThis.document.createElement('canvas'); cv.width = w; cv.height = h; return cv; }) {
  const S = { cv: null, key: null, redraws: 0, pad: 0, dpr: 1 };
  return { get redraws() { return S.redraws; }, get key() { return S.key; },
    // returns true when it had to redraw. Call every frame; it is a string compare unless something changed.
    // rev: bump on every layout change (the editor ops do); hide = index of the prop being moved (drawn live instead)
    draw(ctx, { type, name, items, rev = 0, ox, oy, cell, dpr = 1, night = false, grid = false, hide = -1 }) { const wallH = Math.round(cell * 1.5), pad = 14, W = COLS * cell + pad * 2, H = ROWS * cell + wallH + pad * 2;
      const key = type + '|' + name + '|' + cell + '|' + dpr + '|' + (night ? 1 : 0) + '|' + rev + '|' + hide + '|' + (grid ? 1 : 0) + '|' + items.length; let did = false;
      if (key !== S.key) { const list = hide >= 0 ? items.filter((_, i) => i !== hide) : items; if (!S.cv || S.cv.width !== Math.ceil(W * dpr) || S.cv.height !== Math.ceil(H * dpr)) S.cv = makeCanvas(Math.ceil(W * dpr), Math.ceil(H * dpr));
        const c = S.cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, S.cv.width, S.cv.height); c.setTransform(dpr, 0, 0, dpr, 0, 0); drawLayout(c, type, name, list, pad, wallH + pad, cell, { night }); if (grid) drawGrid(c, pad, wallH + pad, cell);
        S.key = key; S.pad = pad; S.wallH = wallH; S.dpr = dpr; S.redraws++; did = true; }
      ctx.drawImage(S.cv, ox - S.pad, oy - S.wallH - S.pad, S.cv.width / S.dpr, S.cv.height / S.dpr); return did; },
    invalidate() { S.key = null; } }; }
// tiny cached preview for the storefront window (Window Display upgrade); one canvas per layout key
const MINI = new Map();
// rev: the interior's edit counter (cheap per-frame key; no JSON per frame)
export function windowMini(type, items, w, h, rev = 0, makeCanvas) { const key = type + '|' + w + '|' + h + '|' + rev + '|' + items.length; let cv = MINI.get(key); if (cv) return cv;
  cv = (makeCanvas || ((W, H) => { const e = globalThis.document.createElement('canvas'); e.width = W; e.height = H; return e; }))(w, h); const c = cv.getContext('2d'), T = THEMES[type] || THEMES.bakery, cell = Math.min(w / COLS, h / ROWS);
  c.fillStyle = T.floor; c.fillRect(0, 0, w, h); c.fillStyle = T.wall; c.fillRect(0, 0, w, Math.max(2, cell * 0.8));
  for (const o of items) { const d = PROPS[o.id]; if (!d) continue; const f = footprint(o.id, o.rot); c.fillStyle = d.layer === 'floor' ? 'rgba(184,50,58,.4)' : d.col; c.fillRect(o.x * cell + 0.5, o.y * cell + 0.5, f.w * cell - 1, f.h * cell - 1); if (d.cat === 'light') { c.fillStyle = 'rgba(255,230,160,.5)'; c.fillRect(o.x * cell - cell / 2, o.y * cell - cell / 2, cell * 2, cell * 2); } }
  if (MINI.size > 24) MINI.delete(MINI.keys().next().value); MINI.set(key, cv); return cv; }

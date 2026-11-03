// Portal stones (feature batch #3): one carved waystone per district. Walk near a stone to discover it (saved on this
// device only), then press A at any discovered stone to warp to another one you've found. Always free: no Bones,
// no $KIBBLE, no fees, nothing sent to a server. Original art: a mossy standing stone with a glowing paw-spiral rune.
import { TILE, MAP, T, isSolid } from './world.js';

export const LS_KEY = 'inuverse.portals.v1';
export const STONES = [
  { id: 'meadow', name: 'Lakeside Meadow', tx: 17, ty: 10 },
  { id: 'pack', name: 'Clubhouse Green', tx: 60, ty: 10 },
  { id: 'river', name: 'Riverside Walk', tx: 59, ty: 36 },
  { id: 'plaza', name: 'Kibble Plaza', tx: 50, ty: 47 },
  { id: 'mall', name: 'Mall Forecourt', tx: 39, ty: 63 },
  { id: 'arcade', name: 'Arcade Corner', tx: 57, ty: 67 },
  { id: 'park', name: 'Chapel Park', tx: 34, ty: 84 },
  { id: 'farm', name: 'Farmlands', tx: 18, ty: 87 },
  { id: 'pond', name: 'Pondside', tx: 14, ty: 95 },
  { id: 'orchard', name: 'Orchard Lane', tx: 58, ty: 101 },
];
export const BY_ID = Object.fromEntries(STONES.map((s) => [s.id, s]));
export const DISCOVER_R = 2.6; // tiles from the stone's centre: walking this close finds it
export const USE_R = 1.4;      // tiles: close enough to touch it (A / E)

const cx = (s) => (s.tx + 0.5) * TILE, cy = (s) => (s.ty + 0.5) * TILE;
export const stoneXY = (s) => ({ x: cx(s), y: cy(s) });
// where you land after a warp: the tile just below the stone, facing down (always walkable, never on the stone)
export const arrival = (s) => ({ x: (s.tx + 0.5) * TILE, y: (s.ty + 1.5) * TILE });
// every stone stands on open ground with a free landing tile (used by tests)
export const placedOk = (s) => !isSolid(s.tx, s.ty) && !isSolid(s.tx, s.ty + 1) && MAP[s.ty]?.[s.tx] !== T.ROAD && MAP[s.ty]?.[s.tx] !== T.WATER;

export function loadFound(ls = globalThis.localStorage) { try { const a = JSON.parse(ls?.getItem(LS_KEY) || '[]'); return new Set(Array.isArray(a) ? a.filter((id) => BY_ID[id]) : []); } catch { return new Set(); } }
export function saveFound(found, ls = globalThis.localStorage) { try { ls?.setItem(LS_KEY, JSON.stringify([...found].filter((id) => BY_ID[id]))); } catch {} }

// nearest stone within r tiles of a world point (px), or null
export function stoneNear(px, py, r = USE_R) { let best = null, bd = r; for (const s of STONES) { const d = Math.hypot(px / TILE - (s.tx + 0.5), py / TILE - (s.ty + 0.5)); if (d < bd) { bd = d; best = s; } } return best; }
// walking near an undiscovered stone discovers it; returns the newly found stone (and adds it to `found`) or null
export function discover(found, px, py) { const s = stoneNear(px, py, DISCOVER_R); if (!s || found.has(s.id)) return null; found.add(s.id); return s; }
// you can only warp from a stone you're touching (and have found) to a different stone you've found
export const canWarp = (found, fromId, toId) => !!BY_ID[fromId] && !!BY_ID[toId] && fromId !== toId && found.has(fromId) && found.has(toId);
export function warpList(found, fromId) { return STONES.map((s) => ({ id: s.id, name: s.name, found: found.has(s.id), here: s.id === fromId, ok: canWarp(found, fromId, s.id) })); }

// ---------- art ----------
const INK = '#141a2e';
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
// rune: a little paw spiral, 7x7, drawn in `col`
const RUNE = ['..###..', '.#...#.', '#..#..#', '#.#.#.#', '#..#..#', '.#...#.', '..#.#..'];
export function drawStone(c, s, t, { found = false, rm = false, near = false } = {}) {
  const x = cx(s), y = (s.ty + 0.85) * TILE;
  c.fillStyle = 'rgba(10,14,30,.35)'; c.fillRect(Math.round(x - 13), Math.round(y - 2), 26, 5);                       // shadow
  R(c, x - 13, y - 6, 26, 6, INK); R(c, x - 12, y - 5, 24, 4, '#5d6378'); R(c, x - 12, y - 5, 24, 1, '#7d84a0');   // plinth
  R(c, x - 9, y - 32, 18, 27, INK); R(c, x - 7, y - 35, 14, 4, INK);                                               // outline
  R(c, x - 8, y - 31, 16, 26, '#8a90a8'); R(c, x - 6, y - 34, 12, 4, '#8a90a8');                                    // body
  R(c, x - 8, y - 31, 3, 26, '#a9aec4'); R(c, x - 6, y - 34, 3, 3, '#a9aec4');                                      // lit edge
  R(c, x + 5, y - 31, 3, 26, '#6c7290'); R(c, x + 3, y - 34, 3, 3, '#6c7290');                                      // shade edge
  R(c, x - 8, y - 9, 5, 3, '#4f8f45'); R(c, x + 4, y - 8, 4, 2, '#4f8f45'); R(c, x - 2, y - 34, 4, 1, '#4f8f45');   // moss
  const pulse = found ? (rm ? 0.85 : 0.65 + Math.sin(t * 2.6 + s.tx) * 0.3) : 0, rc = found ? '#5ff2e0' : '#4a5068';
  if (found) { c.fillStyle = `rgba(95,242,224,${(0.18 * pulse).toFixed(3)})`; c.fillRect(Math.round(x - 11), Math.round(y - 30), 22, 22); }
  c.globalAlpha = found ? Math.min(1, 0.55 + pulse * 0.5) : 1;
  for (let j = 0; j < 7; j++) for (let i = 0; i < 7; i++) if (RUNE[j][i] === '#') R(c, x - 4 + i, y - 27 + j * 2, 1, 2, rc);
  c.globalAlpha = 1;
  if (found && !rm) for (let k = 0; k < 3; k++) { const ph = (t * 0.6 + k / 3 + s.ty * 0.13) % 1; c.fillStyle = `rgba(160,255,240,${(1 - ph).toFixed(2)})`; c.fillRect(Math.round(x - 6 + k * 6), Math.round(y - 36 - ph * 16), 2, 2); }
  if (near) { R(c, x - 1, y - 46 + (rm ? 0 : Math.round(Math.sin(t * 5) * 1.5)), 3, 5, INK); R(c, x, y - 45 + (rm ? 0 : Math.round(Math.sin(t * 5) * 1.5)), 1, 3, found ? '#5ff2e0' : '#fff6e0'); }
}
// depth-sorted props for the world renderer (culled to the view)
export function stoneProps(found, t, view, { rm = false, near = null } = {}) { const out = [];
  for (const s of STONES) { const x = cx(s), y = (s.ty + 0.85) * TILE; if (view && (x < view.x0 - 40 || x > view.x1 + 40 || y < view.y0 - 10 || y > view.y1 + 60)) continue;
    out.push({ y, d: (c) => drawStone(c, s, t, { found: found.has(s.id), rm, near: near === s }) }); }
  return out; }
// tiny map icon (minimap + full map): a diamond, cyan when found, grey when not
export function drawStoneIcon(m, x, y, r, found) { m.fillStyle = INK; m.beginPath(); m.moveTo(x, y - r - 1); m.lineTo(x + r + 1, y); m.lineTo(x, y + r + 1); m.lineTo(x - r - 1, y); m.closePath(); m.fill();
  m.fillStyle = found ? '#5ff2e0' : '#8a90a8'; m.beginPath(); m.moveTo(x, y - r); m.lineTo(x + r, y); m.lineTo(x, y + r); m.lineTo(x - r, y); m.closePath(); m.fill(); }
// full-map marker (u = canvas px per CSS px): a chunky 14px diamond with an ink + light outline, a pixel rune inside ("?" when undiscovered),
// a soft pulsing ring on found stones (static when rm) and a short outlined name tag under found stones
export const shortName = (s) => s.name.split(' ')[0];
export const MAP_STONE_R = 7; // CSS px half-width of the full-map diamond
export function drawMapStone(m, s, x, y, u, found, t = 0, { rm = false } = {}) { const r = MAP_STONE_R * u, o = Math.max(1, Math.round(u)), dia = (rr, col) => { m.fillStyle = col; m.beginPath(); m.moveTo(x, y - rr); m.lineTo(x + rr, y); m.lineTo(x, y + rr); m.lineTo(x - rr, y); m.closePath(); m.fill(); };
  if (found) { const ph = rm ? 0.5 : (t * 0.8 + s.ty * 0.07) % 1; m.strokeStyle = `rgba(95,242,224,${(0.75 * (1 - ph)).toFixed(2)})`; m.lineWidth = 2 * o; m.beginPath(); m.arc(x, y, r + (3 + ph * 5) * u, 0, 7); m.stroke(); }
  dia(r + 2 * o, INK); dia(r + o, found ? '#e8fffb' : '#c9cde0'); dia(r, found ? '#5ff2e0' : '#8a90a8'); dia(r * 0.55, found ? '#22a89a' : '#5d6380');
  m.fillStyle = found ? '#fff6e0' : INK; const p = Math.max(1, Math.round(u * 1.5));
  if (found) { m.fillRect(x - p / 2, y - p * 1.5, p, p * 3); m.fillRect(x - p * 1.5, y - p / 2, p * 3, p); } // ✦ rune
  else { m.font = `${Math.round(9 * u)}px Silkscreen, monospace`; m.textAlign = 'center'; m.textBaseline = 'middle'; m.fillStyle = '#fff6e0'; m.fillText('?', x, y + o); }
  if (found) { const label = shortName(s).toUpperCase(); m.font = `${Math.round(7 * u)}px Silkscreen, monospace`; m.textAlign = 'center'; m.textBaseline = 'top'; const ly = y + r + 3 * o, w = m.measureText(label).width;
    m.fillStyle = 'rgba(20,26,46,.85)'; m.fillRect(x - w / 2 - 2 * o, ly - o, w + 4 * o, 9 * u); m.fillStyle = '#5ff2e0'; m.fillText(label, x, ly); }
  m.textBaseline = 'alphabetic'; }

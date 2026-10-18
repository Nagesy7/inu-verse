// Phase 5 world art: the Pawsley Pup Clinic (white walls, mint trim, a teal roof with a paw-and-cross sign, glass doors),
// Dr. Pawsley (long white coat, stethoscope, head mirror, clipboard), the two paramedics (mint scrubs, red-cross badge,
// first-aid bag), the sim pups who call for help, and the cartoon bump icons (bandage, bee, sun, tummy swirl). The normal
// Shiba renderer (deps.drawShiba) plus a layered outfit, like the police and the court. Pure drawing, original art.
import { TILE, CLINIC } from './place.js';
import { STAFF, AILMENTS } from './medical.js';
import { staffPose, patientsAt } from './clinic.js';
export const CLINIC_COLORS = Object.freeze({ wall: '#f4f1ea', wallShade: '#d9d3c4', mint: '#7fd1b9', mintDark: '#3a9c84', teal: '#2f7f8f', tealDark: '#1d5866', cross: '#d8433a', crossDark: '#9e2a24',
  glass: '#9fd6e8', glassDark: '#5a9bb3', ink: '#141a2e', coat: '#fbfaf6', coatShade: '#d6d2c8', steel: '#9aa3b2', scrub: '#6cc4ad', scrubDark: '#3f8f7c', bag: '#c8402f', sun: '#ffcf3a', blush: '#ff8a9a', bee: '#f2c230', swirl: '#7bc96a' });
const C = CLINIC_COLORS, R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h)); };
// the clinic emblem: a white rounded tile, a red cross, a little paw in the middle. (x, y) = centre, s = pixel unit
export function drawEmblem(c, x, y, s = 1) { const P = (px, py, w, h, col) => R(c, x + px * s, y + py * s, w * s, h * s, col);
  P(-6, -5, 12, 10, C.ink); P(-5, -6, 10, 12, C.ink); P(-5, -5, 10, 10, C.wall); P(-1.5, -4, 3, 8, C.cross); P(-4, -1.5, 8, 3, C.cross); P(-0.8, -0.6, 1.6, 1.4, C.wall); P(-1.8, -1.6, 0.8, 0.8, C.wall); P(1, -1.6, 0.8, 0.8, C.wall); }
export function drawStaffOutfit(c, s, face) {
  const back = face === 'up', side = face === 'left' || face === 'right', k = face === 'left' ? -1 : 1;
  if (s.role === 'doctor') { // long white coat, stethoscope, head mirror, clipboard
    if (back) { R(c, -15, -46, 30, 36, C.coat); R(c, -1, -40, 2, 30, C.coatShade); }
    else if (side) { R(c, -11, -46, 22, 36, C.coat); R(c, k > 0 ? 6 : -11, -46, 5, 36, C.coatShade); }
    else { R(c, -15, -46, 30, 36, C.coat); R(c, -5, -46, 10, 12, '#bfe3f2'); R(c, -6, -46, 3, 14, C.coatShade); R(c, 3, -46, 3, 14, C.coatShade); R(c, -1, -34, 2, 24, C.coatShade);
      R(c, -9, -46, 2, 10, C.steel); R(c, 7, -46, 2, 10, C.steel); R(c, -9, -37, 6, 2, C.steel); R(c, -4, -36, 4, 4, '#cfd6e0'); R(c, 8, -30, 6, 4, C.coatShade); }
    if (!back) { R(c, -4, -68, 8, 3, C.steel); R(c, -3, -71, 6, 6, '#e8eef5'); R(c, -1, -69, 2, 2, '#ffffff');
      const bx = k * 16 - (k < 0 ? 10 : 0); R(c, bx, -40, 10, 14, '#8a5a32'); R(c, bx + 1, -38, 8, 11, C.wall); R(c, bx + 3, -41, 4, 2, C.steel); for (let i = 0; i < 3; i++) R(c, bx + 2, -36 + i * 3, 6, 1, C.glassDark); } }
  else { // paramedic: mint scrubs, red-cross badge, mint cap, first-aid bag
    if (back) { R(c, -14, -45, 28, 25, C.scrub); R(c, -14, -45, 28, 2, C.scrubDark); }
    else if (side) { R(c, -10, -45, 20, 25, C.scrub); R(c, k > 0 ? 6 : -10, -45, 4, 25, C.scrubDark); }
    else { R(c, -14, -45, 28, 25, C.scrub); R(c, -4, -45, 8, 6, C.scrubDark); R(c, 5, -40, 6, 6, C.wall); R(c, 7, -39, 2, 4, C.cross); R(c, 6, -38, 4, 2, C.cross); R(c, -14, -23, 28, 3, C.scrubDark); }
    R(c, -14, -71, 28, 5, C.scrub); R(c, -14, -67, 28, 2, C.scrubDark);
    if (!back) { const bx = k * 14 - (k < 0 ? 14 : 0); R(c, bx, -26, 14, 12, C.bag); R(c, bx + 5, -24, 4, 8, C.wall); R(c, bx + 3, -22, 8, 4, C.wall); R(c, bx + 4, -29, 6, 3, C.crossDark); } }
}
export function drawStaff(c, s, pose, deps, { name = null, scale = 1 } = {}) {
  c.save(); c.translate(Math.round(pose.x), Math.round(pose.y)); c.scale(0.5 * scale, 0.5 * scale);
  deps.drawShiba(c, 0, 0, { coat: s.coat, outfit: s.outfit, art: 'layer:' + s.coat, face: pose.face, phase: pose.phase, moving: pose.moving, scale: 1.5, fid: s.id, name });
  drawStaffOutfit(c, s, pose.face); c.restore();
}
// cartoon bump icons, drawn above a pup's head. (x, y) = the pup's feet in world px; t = seconds
export function drawBump(c, ail, x, y, t, { treated = false } = {}) { const hy = y - 52 + Math.sin(t * 4) * 1.5;
  if (treated) { R(c, x - 6, hy + 2, 12, 5, '#f0d8b0'); R(c, x - 2, hy + 1, 4, 7, '#f0d8b0'); R(c, x - 1, hy + 3, 2, 1, '#c9a77a'); // plaster
    for (const [i, dx] of [[0, -8], [1, 7]]) { const py = hy - 6 - ((t * 9 + i * 5) % 10); R(c, x + dx - 2, py, 2, 2, C.blush); R(c, x + dx + 1, py, 2, 2, C.blush); R(c, x + dx - 1, py + 2, 3, 2, C.blush); } return; }
  if (ail === 'paw') { R(c, x - 7, y - 4, 14, 4, C.wall); R(c, x - 7, y - 4, 14, 1, C.coatShade); for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.1, sx = x + Math.cos(a) * 10, sy = hy + 6 + Math.sin(a) * 3; R(c, sx - 1, sy - 3, 2, 6, C.sun); R(c, sx - 3, sy - 1, 6, 2, C.sun); } }
  else if (ail === 'sting') { R(c, x - 3, y - 30, 6, 5, C.cross); R(c, x - 2, y - 31, 4, 1, '#ff7468'); const a = t * 6, bx = x + Math.cos(a) * 11, by = hy + Math.sin(a * 2) * 3;
    R(c, bx - 3, by - 2, 6, 4, C.bee); R(c, bx - 1, by - 2, 2, 4, C.ink); R(c, bx - 2, by - 5, 2, 3, '#e8f6ff'); R(c, bx + 1, by - 5, 2, 3, '#e8f6ff'); }
  else if (ail === 'sunburn') { R(c, x - 9, y - 30, 4, 3, C.blush); R(c, x + 5, y - 30, 4, 3, C.blush); R(c, x - 4, hy - 4, 8, 8, C.sun); R(c, x - 6, hy - 1, 12, 2, C.sun); R(c, x - 1, hy - 6, 2, 12, C.sun); R(c, x - 2, hy - 2, 4, 4, '#fff1a8'); }
  else if (ail === 'tummy') { const k = Math.floor(t * 6) % 4; c.fillStyle = C.swirl; for (let i = 0; i < 6; i++) { const a = i * 1.05 + k * 0.4, r = 2 + i * 1.1; R(c, x + Math.cos(a) * r - 1, hy + Math.sin(a) * r - 1, 2, 2, C.swirl); } R(c, x - 8, y - 24, 3, 3, '#a7e08f'); }
}
function drawClinic(c, t) { const x = CLINIC.x * TILE, y = CLINIC.y * TILE, w = CLINIC.w * TILE; // 96 px wide, sits on its tile row
  R(c, x - 4, y + 27, w + 8, 6, 'rgba(10,14,30,0.3)'); R(c, x - 2, y + 22, w + 4, 8, C.wallShade); R(c, x + w / 2 - 14, y + 24, 28, 6, '#c9c3b4'); // step
  R(c, x, y - 34, w, 58, C.wall); R(c, x, y - 34, 3, 58, C.wallShade); R(c, x + w - 3, y - 34, 3, 58, C.wallShade); R(c, x, y + 16, w, 6, C.mint); R(c, x, y + 20, w, 2, C.mintDark); // walls + mint skirting
  for (const wx of [x + 8, x + w - 30]) { R(c, wx - 1, y - 21, 24, 26, C.mintDark); R(c, wx, y - 20, 22, 24, C.glass); for (let i = 0; i < 4; i++) R(c, wx, y - 18 + i * 6, 22, 2, '#cfeef7'); R(c, wx, y + 3, 22, 2, C.mint); } // windows with blinds
  R(c, x + w / 2 - 12, y - 16, 24, 38, C.mintDark); R(c, x + w / 2 - 11, y - 15, 10, 37, C.glass); R(c, x + w / 2 + 1, y - 15, 10, 37, C.glass); R(c, x + w / 2 - 1, y - 15, 2, 37, C.mintDark); // glass doors
  R(c, x + w / 2 - 9, y - 12, 6, 12, '#cfeef7'); R(c, x + w / 2 + 3, y - 12, 6, 12, '#cfeef7'); R(c, x + w / 2 - 3, y - 1, 6, 6, C.wall); R(c, x + w / 2 - 1, y, 2, 4, C.cross); R(c, x + w / 2 - 2, y + 1, 4, 2, C.cross);
  R(c, x - 4, y - 46, w + 8, 13, C.teal); R(c, x - 4, y - 46, w + 8, 3, '#4aa3b2'); R(c, x - 4, y - 35, w + 8, 2, C.tealDark); // roof band
  R(c, x + 20, y - 44, w - 40, 9, C.ink); c.font = '7px Silkscreen, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = C.mint; c.fillText('CLINIC', x + w / 2, y - 39.5, w - 44);
  drawEmblem(c, x + w / 2, y - 56, 1.4); const glow = 0.55 + 0.3 * Math.sin(t * 2.2); // the "+" lamp by the door
  for (const lx of [x - 3, x + w - 3]) { R(c, lx, y - 10, 6, 6, C.ink); R(c, lx + 1, y - 9, 4, 4, `rgba(127,209,185,${glow})`); R(c, lx + 2, y - 4, 2, 10, C.ink); }
}
// view = { mineSlot, mineDone, shiftGo, hurt: { ail } | null } from the clinic tick (what this device should show)
export function clinicProps(t, deps, player = null, view = {}) { const ms = Date.now();
  const out = [{ y: (CLINIC.y + 1) * TILE - 2, d: (c) => drawClinic(c, t) }];
  for (const s of STAFF) { const p = staffPose(s, ms, view.mineSlot, !!view.events), near = player && Math.hypot(player.x - p.x, player.y - p.y) < 4.5 * TILE;
    out.push({ y: p.y, d: (c) => { drawStaff(c, s, p, deps, { name: near ? s.name.replace(/^(Dr\.|Medic) /, '').split(' ')[0] : null }); if (p.treating) for (let i = 0; i < 2; i++) { const a = t * 4 + i * 3; R(c, p.x - 18 + Math.cos(a) * 4, p.y - 40 - ((t * 14 + i * 9) % 14), 2, 6, C.cross); R(c, p.x - 20 + Math.cos(a) * 4, p.y - 38 - ((t * 14 + i * 9) % 14), 6, 2, C.cross); } } }); }
  for (const pt of patientsAt(ms, view)) { const pose = { x: pt.x, y: pt.y, face: 'down', moving: false, phase: t * 2 }, near = player && Math.hypot(player.x - pt.x, player.y - pt.y) < 4 * TILE;
    out.push({ y: pt.y, d: (c) => { c.save(); c.translate(Math.round(pt.x), Math.round(pt.y)); c.scale(0.5, 0.5); deps.drawShiba(c, 0, 0, { coat: pt.c.coat, art: 'layer:' + pt.c.coat, face: 'down', phase: pose.phase, moving: false, scale: 1.5, fid: pt.c.pt, name: near ? pt.c.name : null }); c.restore();
      drawBump(c, pt.c.ail, pt.x, pt.y, t, { treated: pt.treated });
      if (pt.mine && !pt.treated) { const by = pt.y - 46 - Math.abs(Math.sin(t * 4)) * 8; R(c, pt.x - 8, by - 8, 16, 16, C.ink); R(c, pt.x - 7, by - 7, 14, 14, C.wall); R(c, pt.x - 2, by - 5, 4, 10, C.cross); R(c, pt.x - 5, by - 2, 10, 4, C.cross); } } }); }
  if (player && view.hurt) out.push({ y: player.y + 1, d: (c) => drawBump(c, view.hurt.ail, player.x, player.y, t) });
  return out;
}
// where the clinic's sign sits on screen (CSS px): the guide's off-screen pointer label steers clear of it
export const clinicSign = () => ({ x: CLINIC.x * TILE - 4, y: CLINIC.y * TILE - 66, w: CLINIC.w * TILE + 8, h: 34 });

// Phase 3 world art: Barkley Precinct police (navy + gold star, peaked cap) and Greenpaw Rangers (olive shirt, khaki
// wide-brim hat), the precinct kiosk, the ranger station and ranger-shift litter. Officers use the game's normal Shiba
// renderer (deps.drawShiba, layered outfit atlas) with a layered uniform on top. Pure drawing, time-only motion.
import { TILE, PRECINCT, RANGER_HUT } from './place.js';
import { OFFICERS, FORCE_COLORS as C, officerPose } from './force.js';
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h)); };
// gold six-point-ish star badge (police) / olive leaf badge (rangers). (x, y) = centre, s = pixel unit
export function drawStar(c, x, y, s = 1) { const P = (px, py, w, h, col) => R(c, x + px * s, y + py * s, w * s, h * s, col);
  P(-0.5, -3, 1, 6, C.gold); P(-3, -0.5, 6, 1, C.gold); P(-2, -2, 4, 4, C.gold); P(-1, -1, 2, 2, C.goldDark); P(-0.3, -2.6, 0.6, 0.6, '#fff3c4'); }
export function drawLeaf(c, x, y, s = 1) { const P = (px, py, w, h, col) => R(c, x + px * s, y + py * s, w * s, h * s, col);
  P(-1, -3, 2, 1, C.oliveLight); P(-2, -2, 4, 3, C.oliveLight); P(-1, 1, 2, 1, C.oliveLight); P(-0.3, -2, 0.6, 4.5, C.oliveDark); P(-2.2, -2.2, 4.4, 0.5, C.khaki); }
// uniform overlay in actor space (torso about x -14..14, y -44..-20), same space as the Watchdogs' tabard
export function drawForceUniform(c, o, face) {
  const back = face === 'up', side = face === 'left' || face === 'right', cop = o.force === 'police';
  const main = cop ? C.navy : C.olive, dark = cop ? C.navyDark : C.oliveDark, light = cop ? C.navyLight : C.oliveLight, trim = cop ? C.gold : C.khaki;
  if (back) { R(c, -14, -45, 28, 25, main); R(c, -14, -45, 28, 2, light); R(c, -14, -23, 28, 3, dark); if (cop) { R(c, -10, -40, 20, 6, C.ink); R(c, -9, -39, 18, 4, C.gold); } }
  else if (side) { R(c, -10, -45, 20, 25, main); R(c, -10, -45, 20, 2, light); R(c, -10, -23, 20, 3, dark); R(c, face === 'right' ? 6 : -10, -45, 4, 25, dark); cop ? drawStar(c, face === 'right' ? 2 : -2, -36, 0.8) : drawLeaf(c, face === 'right' ? 2 : -2, -36, 0.8); }
  else { R(c, -14, -45, 28, 25, main); R(c, -14, -45, 28, 2, light); R(c, -1, -45, 2, 25, dark); R(c, -14, -23, 28, 3, dark); R(c, -12, -21, 24, 1, trim);
    for (const by of [-40, -33, -27]) R(c, 2, by, 2, 2, trim); // buttons
    cop ? drawStar(c, -7.5, -37, 0.9) : drawLeaf(c, -7.5, -37, 0.9); R(c, 5, -38, 7, 5, dark); }   // badge + pocket
  if (cop) { // peaked cap: navy crown, gold band, black visor, star
    R(c, -15, -79, 30, 10, C.navy); R(c, -13, -81, 26, 4, C.navyLight); R(c, -15, -70, 30, 3, C.gold);
    if (!back) { R(c, -13, -67, 26, 3, C.ink); drawStar(c, 0, -75, 0.7); } }
  else { // ranger hat: wide khaki brim, olive band, creased crown
    R(c, -21, -69, 42, 4, C.khakiDark); R(c, -19, -70, 38, 2, C.khaki); R(c, -12, -82, 24, 12, C.khaki); R(c, -12, -73, 24, 3, C.olive); R(c, -1, -82, 2, 5, C.khakiDark); R(c, -12, -82, 24, 1, '#e0cd98'); }
}
export function drawOfficer(c, o, pose, deps, { name = null, scale = 1 } = {}) {
  c.save(); c.translate(Math.round(pose.x), Math.round(pose.y)); c.scale(0.5 * scale, 0.5 * scale);
  deps.drawShiba(c, 0, 0, { coat: o.coat, outfit: o.outfit, art: 'layer:' + o.coat, face: pose.face, phase: pose.phase, moving: pose.moving, scale: 1.5, fid: o.id, name });
  drawForceUniform(c, o, pose.face); c.restore();
}
function drawKiosk(c, t) { // Barkley Precinct: a small navy police box with a gold sign and a slow blue lamp
  const x = PRECINCT.x * TILE, y = PRECINCT.y * TILE, w = PRECINCT.w * TILE;
  R(c, x - 2, y + 28, w + 4, 5, 'rgba(10,14,30,0.3)'); R(c, x + 2, y - 26, w - 4, 54, C.navyDark); R(c, x + 4, y - 24, w - 8, 50, C.navy);
  R(c, x, y - 30, w, 6, C.navyDark); R(c, x + 2, y - 29, w - 4, 3, C.navyLight); // roof
  const lamp = 0.45 + 0.4 * (0.5 + 0.5 * Math.sin(t * 2.6)); R(c, x + w / 2 - 4, y - 38, 8, 8, C.ink); R(c, x + w / 2 - 3, y - 37, 6, 6, `rgba(110,170,255,${lamp})`);
  R(c, x + 6, y - 21, w - 12, 9, C.ink); c.font = '6px Silkscreen, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = C.gold; c.fillText('PRECINCT', x + w / 2, y - 16.5, w - 14);
  for (const wx of [x + 8, x + w / 2 + 3]) { R(c, wx, y - 8, w / 2 - 11, 12, '#9cc3e8'); R(c, wx, y - 8, w / 2 - 11, 2, '#d8ecff'); } // windows
  R(c, x + 6, y + 8, w - 12, 14, C.navyDark); R(c, x + 8, y + 10, w - 16, 3, C.gold); drawStar(c, x + w / 2, y + 17, 1.1); // counter + star
}
function drawHut(c, t) { // Greenpaw Rangers station: log cabin with a green roof, leaf sign and a litter bin
  const x = RANGER_HUT.x * TILE, y = RANGER_HUT.y * TILE, w = RANGER_HUT.w * TILE;
  R(c, x - 2, y + 28, w + 6, 5, 'rgba(10,14,30,0.3)'); for (let i = 0; i < 6; i++) R(c, x + 2, y - 18 + i * 8, w - 4, 7, i % 2 ? '#8a5a32' : '#9c6a3c');
  R(c, x - 4, y - 30, w + 8, 6, C.oliveDark); R(c, x - 1, y - 36, w + 2, 6, C.olive); R(c, x + 4, y - 41, w - 8, 5, C.oliveLight); // roof
  R(c, x + 6, y - 14, w - 12, 9, C.ink); c.font = '6px Silkscreen, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = C.khaki; c.fillText('RANGERS', x + w / 2, y - 9.5, w - 14);
  R(c, x + w / 2 - 6, y + 2, 12, 24, '#5b3a1e'); R(c, x + w / 2 + 3, y + 13, 2, 2, C.gold); drawLeaf(c, x + 10, y + 12, 1.2);
  R(c, x + w - 6, y + 12, 9, 14, '#3a6b4a'); R(c, x + w - 7, y + 10, 11, 3, '#2a5038'); // bin
  const sway = Math.sin(t * 1.7) * 1.5; R(c, x - 6, y - 24 + sway, 2, 18, '#6b4a2a'); R(c, x - 14 + sway, y - 26 + sway, 10, 6, C.oliveLight); // little pennant
}
const LITTER_COLS = [['#d9d4c4', '#9a958a'], ['#c8402f', '#7a2219'], ['#4aa3d8', '#246a90'], ['#e3b341', '#9a7417']];
export function drawLitter(c, l, t) { const x = l.x * TILE, y = l.y * TILE, [a, b] = LITTER_COLS[l.k % 4], bob = Math.sin(t * 3 + l.k) * 1;
  R(c, x - 6, y + 3, 12, 3, 'rgba(10,14,30,0.25)'); R(c, x - 5, y - 4, 10, 7, b); R(c, x - 4, y - 5, 8, 6, a); R(c, x - 1, y - 3, 3, 1, '#ffffff');
  R(c, x - 1, y - 14 + bob, 2, 5, C.gold); R(c, x - 1, y - 7 + bob, 2, 2, C.gold); } // floating "!" marker so it reads at phone size
export function forceProps(t, deps, player = null, litter = []) {
  const out = [{ y: (PRECINCT.y + 1) * TILE - 2, d: (c) => drawKiosk(c, t) }, { y: (RANGER_HUT.y + 1) * TILE - 2, d: (c) => drawHut(c, t) }];
  for (const o of OFFICERS) { const p = officerPose(o, t), near = player && Math.hypot(player.x - p.x, player.y - p.y) < 4.5 * TILE;
    out.push({ y: p.y, d: (c) => drawOfficer(c, o, p, deps, { name: near ? o.name.split(' ').slice(-2, -1)[0] || o.name : null }) }); }
  for (const l of litter) if (!l.got) out.push({ y: l.y * TILE, d: (c) => drawLitter(c, l, t) });
  return out;
}

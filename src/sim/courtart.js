// Phase 4 world art: the Barkley Courthouse (pale stone, four columns, a stepped pediment with the paw-and-scales crest)
// and its three sim pups: Judge Barkwell (black robe, white jabot), Clerk Inkpaw (plum waistcoat, green visor, docket
// book) and Maple Quillfeather (teal blazer, red tie, briefcase). The normal Shiba renderer (deps.drawShiba) plus a
// layered outfit on top, like the police and the Watchdogs. Pure drawing, time-only motion, original art.
import { TILE, COURTHOUSE } from './place.js';
import { BENCH } from './court.js';
export const COURT_COLORS = Object.freeze({ stone: '#e6dcc4', stoneLight: '#f6efdc', stoneDark: '#b8a986', shade: '#8f8366', robe: '#1d1b26', robeLight: '#3a3648', jabot: '#f4f1ea',
  plum: '#6b2f5a', plumDark: '#4a1f3e', visor: '#2f8f5a', teal: '#1f6f78', tealDark: '#14484e', tie: '#c8402f', brass: '#d9a63a', brassDark: '#9a7417', ink: '#141a2e', paper: '#f4f1ea' });
const C = COURT_COLORS, R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h)); };
// crest: a paw under a balance. (x, y) = centre, s = pixel unit
export function drawScales(c, x, y, s = 1, col = C.brass, dark = C.brassDark) { const P = (px, py, w, h, cc) => R(c, x + px * s, y + py * s, w * s, h * s, cc);
  P(-0.5, -4, 1, 7, col); P(-4.5, -3.5, 9, 1, col); P(-5, -2.5, 1, 2.5, dark); P(4, -2.5, 1, 2.5, dark); P(-6.5, -0.5, 4, 1, col); P(2.5, -0.5, 4, 1, col); P(-2, 3, 4, 1, dark);
  P(-1.2, 0.6, 2.4, 1.6, dark); P(-1.9, -0.4, 0.8, 0.8, dark); P(1.1, -0.4, 0.8, 0.8, dark); }
export function drawBenchOutfit(c, b, face) {
  const back = face === 'up', side = face === 'left' || face === 'right', s = face === 'left' ? -1 : 1;
  if (b.role === 'judge') { // long robe to the knees, white jabot, brass chain of office
    if (back) { R(c, -15, -46, 30, 34, C.robe); R(c, -15, -46, 30, 2, C.robeLight); }
    else if (side) { R(c, -11, -46, 22, 34, C.robe); R(c, -11, -46, 22, 2, C.robeLight); R(c, s > 0 ? 6 : -11, -46, 5, 34, C.robeLight); }
    else { R(c, -15, -46, 30, 34, C.robe); R(c, -15, -46, 30, 2, C.robeLight); R(c, -4, -46, 8, 10, C.jabot); R(c, -3, -36, 6, 3, C.jabot); R(c, -10, -46, 2, 12, C.brass); R(c, 8, -46, 2, 12, C.brass); R(c, -2, -34, 4, 3, C.brass); R(c, -15, -15, 30, 2, C.robeLight); }
    if (!back) { R(c, s * 15 - (s < 0 ? 7 : 0), -30, 7, 3, '#8a5a32'); R(c, s * 18 - 2, -34, 4, 9, '#6b4a2a'); } } // gavel
  else if (b.role === 'clerk') { // plum waistcoat over a white shirt, green eyeshade, docket book
    if (back) { R(c, -14, -45, 28, 25, C.plum); }
    else if (side) { R(c, -10, -45, 20, 25, C.plum); R(c, s > 0 ? 6 : -10, -45, 4, 25, C.plumDark); }
    else { R(c, -14, -45, 28, 25, C.paper); R(c, -14, -45, 10, 25, C.plum); R(c, 4, -45, 10, 25, C.plum); for (const by of [-40, -34, -28]) R(c, -5, by, 2, 2, C.brass); R(c, -14, -23, 28, 3, C.plumDark); }
    R(c, -15, -71, 30, 4, C.visor); if (!back) R(c, -13, -67, 26, 3, '#4fbf7f');
    if (!back) { const bx = s * 16 - (s < 0 ? 11 : 0); R(c, bx, -40, 11, 14, C.plumDark); R(c, bx + 1, -39, 9, 12, C.paper); for (let i = 0; i < 4; i++) R(c, bx + 2, -37 + i * 2.6, 7, 1, C.plum); } }
  else { // duty defender: teal blazer, red tie, brass-clasped briefcase
    if (back) { R(c, -14, -45, 28, 25, C.teal); R(c, -14, -45, 28, 2, '#2f8f98'); }
    else if (side) { R(c, -10, -45, 20, 25, C.teal); R(c, s > 0 ? 6 : -10, -45, 4, 25, C.tealDark); }
    else { R(c, -14, -45, 28, 25, C.teal); R(c, -5, -45, 10, 14, C.paper); R(c, -1.5, -45, 3, 16, C.tie); R(c, -14, -23, 28, 3, C.tealDark); R(c, 6, -40, 6, 2, C.paper); }
    if (!back) { const bx = s * 14 - (s < 0 ? 14 : 0); R(c, bx, -24, 14, 11, '#6b4a2a'); R(c, bx + 1, -23, 12, 2, '#8a5a32'); R(c, bx + 5, -27, 4, 3, '#4a321c'); R(c, bx + 6, -20, 2, 2, C.brass); } }
}
export function benchPose(b, t) { const i = BENCH.indexOf(b), look = Math.sin(t * 0.23 + i * 2.1); return { x: b.post[0] * TILE, y: b.post[1] * TILE, face: look > 0.8 ? 'right' : look < -0.8 ? 'left' : 'down', moving: false, phase: t * 2 + i }; }
export function drawBench(c, b, pose, deps, { name = null, scale = 1 } = {}) {
  c.save(); c.translate(Math.round(pose.x), Math.round(pose.y)); c.scale(0.5 * scale, 0.5 * scale);
  deps.drawShiba(c, 0, 0, { coat: b.coat, outfit: b.outfit, art: 'layer:' + b.coat, face: pose.face, phase: pose.phase, moving: pose.moving, scale: 1.5, fid: b.id, name });
  drawBenchOutfit(c, b, pose.face); c.restore();
}
function drawCourthouse(c, t) { const x = COURTHOUSE.x * TILE, y = COURTHOUSE.y * TILE, w = COURTHOUSE.w * TILE; // 96 px wide, sits on its tile row
  R(c, x - 4, y + 27, w + 8, 6, 'rgba(10,14,30,0.3)');
  for (let i = 0; i < 3; i++) R(c, x - 4 + i * 3, y + 20 - i * 5, w + 8 - i * 6, 6, i % 2 ? C.stoneDark : C.stone); // three steps
  R(c, x + 4, y - 30, w - 8, 42, C.stoneDark); R(c, x + 6, y - 28, w - 12, 40, '#d4c8aa'); // back wall
  R(c, x + w / 2 - 9, y - 12, 18, 24, C.ink); R(c, x + w / 2 - 7, y - 10, 14, 22, '#3a2a1a'); R(c, x + w / 2 - 1, y - 10, 2, 22, '#2a1c10'); R(c, x + w / 2 - 5, y + 1, 2, 2, C.brass); R(c, x + w / 2 + 3, y + 1, 2, 2, C.brass); // doors
  for (const cx of [x + 8, x + 26, x + w - 34, x + w - 16]) { R(c, cx - 1, y - 30, 10, 3, C.stoneLight); R(c, cx, y - 27, 8, 37, C.stoneLight); R(c, cx + 6, y - 27, 2, 37, C.stoneDark); R(c, cx + 2, y - 27, 1, 37, '#fffaf0'); R(c, cx - 1, y + 9, 10, 3, C.stone); } // columns
  R(c, x, y - 38, w, 8, C.stone); R(c, x, y - 38, w, 2, C.stoneLight); R(c, x + 2, y - 31, w - 4, 1, C.shade); // frieze
  R(c, x + 18, y - 37, w - 36, 6, C.ink); c.font = '6px Silkscreen, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = C.brass; c.fillText('COURTHOUSE', x + w / 2, y - 33.5, w - 40);
  for (let i = 0; i < 6; i++) R(c, x + 2 + i * 8, y - 44 - i * 4, w - 4 - i * 16, 6, i % 2 ? C.stone : C.stoneLight); // stepped pediment
  drawScales(c, x + w / 2, y - 52, 1.3);
  const glow = 0.5 + 0.25 * Math.sin(t * 1.6); for (const lx of [x - 2, x + w - 4]) { R(c, lx, y - 6, 6, 16, C.ink); R(c, lx + 1, y - 5, 4, 6, `rgba(255,220,140,${glow})`); } // lanterns
}
export function courtProps(t, deps, player = null) {
  const out = [{ y: (COURTHOUSE.y + 1) * TILE - 2, d: (c) => drawCourthouse(c, t) }];
  for (const b of BENCH) { const p = benchPose(b, t), near = player && Math.hypot(player.x - p.x, player.y - p.y) < 4.5 * TILE;
    out.push({ y: p.y, d: (c) => drawBench(c, b, p, deps, { name: near ? (b.role === 'judge' ? 'Judge' : b.name.split(' ')[b.role === 'clerk' ? 1 : 0]) : null }) }); }
  return out;
}

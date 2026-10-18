// Paw Audit Bureau world art: the violet audit desk, the Watchdogs banner and the seven members.
// Members are drawn with the game's normal Shiba renderer (passed in as deps.drawShiba, layered outfit atlas) and get a
// layered Bureau uniform on top: violet tabard, silver trim, the magnifier-over-paw badge and one role prop each.
// Pure drawing, no game state. Movement is a function of time only (eased, no randomness), so it is smooth at any fps.
import { TILE, BUREAU } from './place.js';
import { WATCHDOGS, COLORS as C } from './roster.js';
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h)); };

// Badge: a violet paw with a silver magnifying glass over it. (x, y) = centre, s = pixel unit (~9x9 units).
export function drawBadge(c, x, y, s = 1, { plate = true } = {}) {
  const P = (px, py, w, h, col) => R(c, x + px * s, y + py * s, w * s, h * s, col);
  if (plate) { P(-5, -5, 10, 10, C.silverDark); P(-4.5, -4.5, 9, 9, C.silver); P(-4, -4, 8, 8, C.violetDark); }
  P(-2, -0.5, 4, 3, C.violet); P(-3, -3, 1.5, 1.5, C.violet); P(-1, -3.8, 1.5, 1.5, C.violet); P(1, -3.8, 1.5, 1.5, C.violet); P(2.6, -3, 1.5, 1.5, C.violet); // paw
  P(-0.6, -2.4, 3.4, 0.7, C.silver); P(-0.6, 0.3, 3.4, 0.7, C.silver); P(-1, -1.8, 0.7, 2.2, C.silver); P(2.6, -1.8, 0.7, 2.2, C.silver); // lens ring
  P(-0.3, -1.7, 2.9, 2, 'rgba(201,206,214,0.35)'); P(0, -1.5, 0.8, 0.6, '#ffffff'); // glass + glint
  P(2.9, 1, 1, 1, C.silver); P(3.7, 1.8, 1.2, 1.2, C.silverDark); // handle
}

// Uniform overlay in actor space (same space as workers.js drawVest: torso about x -14..14, y -44..-20).
export function drawUniform(c, m, face) {
  const back = face === 'up', side = face === 'left' || face === 'right';
  if (back) { R(c, -14, -45, 28, 25, C.violet); R(c, -14, -45, 28, 2, C.silver); R(c, -14, -22, 28, 2, C.silver); drawBadge(c, 0, -33, 1.1, { plate: false }); }
  else if (side) { R(c, -10, -45, 20, 25, C.violet); R(c, -10, -45, 20, 2, C.silver); R(c, -10, -22, 20, 2, C.silver); R(c, face === 'right' ? 6 : -10, -45, 4, 25, C.violetDark); drawBadge(c, face === 'right' ? 3 : -3, -36, 0.75); }
  else { for (const sx of [-14, 5]) { R(c, sx, -45, 9, 25, C.violet); R(c, sx, -45, 9, 2, C.violetLight); R(c, sx + (sx < 0 ? 7 : 0), -45, 2, 25, C.silver); R(c, sx, -22, 9, 2, C.silver); } drawBadge(c, -9.5, -36, 0.75); }
  const s = face === 'left' ? -1 : 1, X = (x) => x * s;
  switch (m.prop) {
    case 'cap': R(c, -15, -77, 30, 9, C.violetDark); R(c, -13, -79, 26, 4, C.violet); R(c, -15, -69, 30, 3, C.silver); if (!back) { R(c, -12, -67, 24, 3, C.ink); drawBadge(c, 0, -73, 0.5, { plate: false }); } break; // peaked cap
    case 'ledger': if (!back) { R(c, X(16) - (s < 0 ? 10 : 0), -38, 10, 13, C.silverDark); R(c, X(16) - (s < 0 ? 10 : 0) + 1, -37, 8, 11, '#f4f1ea'); for (let i = 0; i < 4; i++) R(c, X(16) - (s < 0 ? 10 : 0) + 2, -35 + i * 2.5, 6, 1, C.violet); } break; // clipboard
    case 'scales': if (!back) { const bx = X(19); R(c, bx - 1, -44, 2, 18, C.silver); R(c, bx - 8, -44, 16, 2, C.silver); R(c, bx - 9, -40, 5, 2, C.silverDark); R(c, bx + 4, -40, 5, 2, C.silverDark); R(c, bx - 3, -26, 6, 2, C.silverDark); } break; // little scales of justice
    case 'tablet': if (!back) { const tx = X(15) - (s < 0 ? 12 : 0); R(c, tx, -38, 12, 15, C.ink); R(c, tx + 1, -37, 10, 12, '#5ad1c8'); R(c, tx + 2, -35, 6, 1, '#e8fffb'); R(c, tx + 2, -32, 8, 1, '#e8fffb'); R(c, tx + 2, -29, 5, 1, '#e8fffb'); } break; // hash-checking tablet
    case 'bandana': R(c, -14, -52, 28, 6, C.violet); R(c, -14, -52, 28, 1, C.silver); if (!back) { R(c, -4, -47, 8, 4, C.violetDark); } else { R(c, -3, -47, 6, 7, C.violet); } break; // red-team scarf (violet, silver edge)
  }
}

// time-only motion: patrol members walk an eased back-and-forth with a pause at each end
export function memberPose(m, t) {
  const [px, py] = m.post, idx = WATCHDOGS.indexOf(m);
  if (!m.patrol) { const look = Math.sin(t * 0.21 + idx * 1.7); return { x: px * TILE, y: py * TILE, face: look > 0.82 ? 'right' : look < -0.82 ? 'left' : 'down', moving: false, phase: t * 2 + idx }; }
  const P = 16, u = ((t + idx * 3.1) % P) / P, tri = u < 0.5 ? u * 2 : 2 - u * 2, k = Math.min(1, Math.max(0, (tri - 0.12) / 0.76)), e = k * k * (3 - 2 * k);
  const de = 6 * k * (1 - k) * (u < 0.5 ? 1 : -1) * (tri > 0.12 && tri < 0.88 ? 1 : 0), dir = Math.sign(m.patrol[0]) * Math.sign(de);
  return { x: (px + m.patrol[0] * e) * TILE, y: (py + m.patrol[1] * e) * TILE, face: dir > 0 ? 'right' : dir < 0 ? 'left' : 'down', moving: Math.abs(de) > 0.25, phase: t * 9 };
}

export function drawMember(c, m, pose, deps, { name = null, scale = 1 } = {}) {
  c.save(); c.translate(Math.round(pose.x), Math.round(pose.y)); c.scale(0.5 * scale, 0.5 * scale);
  deps.drawShiba(c, 0, 0, { coat: m.coat, outfit: m.outfit, art: 'layer:' + m.coat, face: pose.face, phase: pose.phase, moving: pose.moving, scale: 1.5, fid: m.id, name });
  drawUniform(c, m, pose.face); c.restore();
}

function drawDesk(c, t) {
  const x = BUREAU.x * TILE, y = BUREAU.y * TILE, w = BUREAU.w * TILE;
  R(c, x - 2, y + 26, w + 4, 6, 'rgba(10,14,30,0.3)'); // shadow
  R(c, x, y + 2, w, 10, C.silverDark); R(c, x + 2, y, w - 4, 8, C.silver); // desk top
  R(c, x + 2, y + 10, w - 4, 18, C.violetDark); R(c, x + 4, y + 12, w - 8, 14, C.violet); R(c, x + 4, y + 12, w - 8, 2, C.violetLight);
  R(c, x + 2, y + 10, w - 4, 1, C.silver); R(c, x + 2, y + 27, w - 4, 1, C.silver);
  R(c, x + 6, y + 14, w - 12, 10, C.ink); R(c, x + 6, y + 14, w - 12, 1, C.silverDark); // name plate
  R(c, x + 8, y - 6, 16, 6, '#f4f1ea'); R(c, x + 9, y - 8, 14, 3, '#e4e0d4'); R(c, x + 10, y - 4, 10, 1, C.violet); // paper stack
  const glow = 0.55 + Math.sin(t * 2.2) * 0.1; R(c, x + w - 22, y - 12, 2, 12, C.silverDark); R(c, x + w - 28, y - 16, 14, 5, C.violetDark); R(c, x + w - 26, y - 11, 10, 2, `rgba(255,236,170,${glow})`); // desk lamp
  c.font = '6px Silkscreen, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = C.silver; c.fillText('PAW AUDIT BUREAU', x + w / 2, y + 19.5, w - 16);
  drawBadge(c, x + 3, y + 19, 0.55, { plate: false }); drawBadge(c, x + w - 3, y + 19, 0.55, { plate: false });
}
function drawFlag(c, t) {
  const fx = BUREAU.flag.x * TILE, fy = BUREAU.flag.y * TILE; R(c, fx - 6, fy + 8, 12, 4, 'rgba(10,14,30,0.3)'); R(c, fx - 1, fy - 52, 3, 62, C.silverDark); R(c, fx - 2, fy - 54, 5, 3, C.silver);
  for (let i = 0; i < 26; i++) { const sway = Math.sin(t * 2.4 - i * 0.35) * (i / 26) * 2.2; R(c, fx + 2 + i, fy - 50 + sway, 1, 24 - (i > 20 ? (i - 20) * 2 : 0), i % 2 ? C.violet : '#7348cf'); }
  R(c, fx + 2, fy - 50, 26, 1, C.silver); drawBadge(c, fx + 14, fy - 39 + Math.sin(t * 2.4 - 4) * 1.1, 1, { plate: false });
}

// World drawables for render's y-sorted prop list. player = { x, y } for name tags when close.
export function bureauProps(t, deps, player = null) {
  const out = [{ y: (BUREAU.y + 1) * TILE - 4, d: (c) => drawDesk(c, t) }, { y: BUREAU.flag.y * TILE + 10, d: (c) => drawFlag(c, t) }];
  for (const m of WATCHDOGS) { const p = memberPose(m, t), near = player && Math.hypot(player.x - p.x, player.y - p.y) < 4.5 * TILE;
    out.push({ y: p.y, d: (c) => drawMember(c, m, p, deps, { name: near ? m.name.split(' ')[0] : null }) }); }
  return out;
}
export const bureauActors = (t) => WATCHDOGS.map((m) => ({ ...memberPose(m, t), name: m.name, id: m.id }));

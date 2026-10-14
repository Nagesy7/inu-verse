// City maintenance crew: Shiba workers in hi-vis vests with tools, walking routes on a time-of-day schedule.
// Headless: route stepping + schedule + gigs are testable; drawing helpers take a canvas.
import { TILE } from './world.js';
const P = (x, y) => [x * TILE + 16, y * TILE + 16];
// route = waypoints (world px) on sidewalks/plazas/roads only (never door tiles); hours = [from, to) in-game hours
export const WORKERS = [
  { id: 'w1', name: 'Sweepy', job: 'sweeper', tool: 'broom', hours: [6, 18], route: [P(2, 30), P(29, 30)], coat: 'tan', line: 'Keeping Bone Street spotless, one leaf at a time!' },
  { id: 'w2', name: 'Fern', job: 'gardener', tool: 'shears', hours: [7, 16], route: [P(24, 60), P(24, 69), P(39, 69), P(39, 60)], coat: 'cream', line: 'These topiaries need a trim every single day.' },
  { id: 'w3', name: 'Squeegee', job: 'window cleaner', tool: 'ladder', hours: [8, 15], route: [P(5, 18.4), P(9, 18.4), P(15, 18.4), P(19, 18.4)], coat: 'red', line: 'Sparkling windows sell more taiyaki.' },
  { id: 'w4', name: 'Cone', job: 'road crew', tool: 'cone', hours: [9, 17], route: [P(14, 32.2), P(18, 32.2)], coat: 'dark', line: 'Pothole patrol! Mind the cones.', cones: [[13, 32.1], [19, 32.1], [16, 31.6]] },
  { id: 'w5', name: 'Sparky', job: 'electrician', tool: 'wrench', hours: [16, 21], route: [P(7, 18), P(25, 18)], coat: 'golden', line: 'Checking every street light before dark.' },
  { id: 'w6', name: 'Roller', job: 'painter', tool: 'roller', hours: [8, 16], route: [P(3, 41), P(28, 41)], coat: 'gray', line: 'Fresh paint on the Sakura Lane fences.' },
  { id: 'w7', name: 'Binny', job: 'bin collector', tool: 'bin', hours: [5, 10], route: [P(2, 41.2), P(61, 41.2)], coat: 'tan', line: 'Bin day! The truck is just up the road.', truck: true },
  { id: 'w8', name: 'Nettie', job: 'pond cleaner', tool: 'net', hours: [7, 17], route: [P(43, 34), P(51, 34)], coat: 'cream', line: 'Fishing out leaves so the ducks stay happy.' },
  { id: 'w9', name: 'Pixel', job: 'billboard repair', tool: 'ladder', hours: [10, 18], route: [P(41, 46.6), P(46, 46.6)], coat: 'red', line: 'Swapping the coin ads on the billboard.', billboard: true },
];
export const GIGS = { sweeper: 'Help sweep the sidewalk', gardener: 'Rake up the clippings', 'window cleaner': 'Hold the ladder steady', 'road crew': 'Carry the cones', electrician: 'Pass the light bulbs', painter: 'Mix the paint', 'bin collector': 'Wheel the bins out', 'pond cleaner': 'Scoop the leaves', 'billboard repair': 'Hand up the new poster' };
export const GIG_PAY = 15;
// one in-game hour off mid-shift, staggered per worker so the crew is never all on break at once
export const breakHour = (w) => { const len = (w.hours[1] - w.hours[0] + 24) % 24; return (w.hours[0] + Math.floor(len / 2) + (w.id ? (parseInt(w.id.slice(1)) || 0) % 3 - 1 : 0)) % 24; };
export const onBreak = (w, hour) => Math.floor(hour) === breakHour(w);
export const onDuty = (w, hour) => (w.hours[0] <= w.hours[1] ? hour >= w.hours[0] && hour < w.hours[1] : hour >= w.hours[0] || hour < w.hours[1]);
export function makeCrew() { return WORKERS.map((w) => ({ ...w, i: 0, dir: 1, x: w.route[0][0], y: w.route[0][1], work: 0, phase: 0, moving: false, face: 'right', on: false })); }
export function stepCrew(crew, dt, hour, onSwap) {
  for (const w of crew) { w.on = onDuty(w, hour); if (!w.on) continue; w.phase += dt * 6;
    w.onBreak = onBreak(w, hour); if (w.onBreak) { w.moving = false; w.face = 'down'; continue; } // tea break: down tools mid-shift
    if (w.work > 0) { w.work -= dt; w.moving = false; if (w.work <= 0 && w.billboard) onSwap?.(); continue; }
    const nxt = w.route[w.i + w.dir] ? w.i + w.dir : (w.dir = -w.dir, w.i + w.dir); const [tx, ty] = w.route[nxt] || w.route[0], dx = tx - w.x, dy = ty - w.y, d = Math.hypot(dx, dy), st = 22 * dt;
    if (d <= st) { w.x = tx; w.y = ty; w.i = nxt; w.work = 3 + (w.i % 2) * 2; } else { w.x += (dx / d) * st; w.y += (dy / d) * st; w.moving = true; w.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); } }
  return crew; }
// odd job: one per worker per in-game day
export function takeGig(state, w, day) { state.gigs ||= {}; if (state.gigs[w.id] === day) return { ok: false, reason: 'Already helped today' }; state.gigs[w.id] = day; state.bones = (state.bones || 0) + GIG_PAY; return { ok: true, pay: GIG_PAY, task: GIGS[w.job] }; }

// ---------- drawing (screen scale, relative to the Shiba's feet at 0,0) ----------
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
export function drawVest(c, face) { if (face === 'up') { R(c, -14, -44, 28, 24, '#ff8a1e'); R(c, -14, -36, 28, 3, '#e8f0f0'); R(c, -14, -28, 28, 3, '#e8f0f0'); return; }
  R(c, -14, -44, 9, 24, '#ff8a1e'); R(c, 5, -44, 9, 24, '#ff8a1e'); R(c, -14, -44, 9, 2, '#ffb04a'); R(c, 5, -44, 9, 2, '#ffb04a'); R(c, -14, -34, 9, 3, '#e8f0f0'); R(c, 5, -34, 9, 3, '#e8f0f0'); R(c, -14, -26, 9, 3, '#e8f0f0'); R(c, 5, -26, 9, 3, '#e8f0f0'); }
export function drawTool(c, w) { const s = w.face === 'left' ? -1 : 1, a = Math.sin(w.phase * (w.work > 0 ? 2.5 : 1)), X = (x) => x * s;
  switch (w.tool) {
    case 'broom': R(c, X(16) - 1, -40 + a * 2, 3, 44, '#9a6a3c'); R(c, X(16) - 7 + a * 4, 2, 14, 6, '#e3b341'); break;
    case 'shears': R(c, X(18), -30, 4, 10, '#c9cede'); R(c, X(18) + a * 4, -36, 3, 8, '#c9cede'); R(c, X(18) - 2, -22, 8, 4, '#c8323c'); break;
    case 'ladder': if (w.work > 0 || w.billboard) { for (let i = 0; i < 7; i++) R(c, X(10) - 8, -12 - i * 12, 18, 2, '#c9cede'); R(c, X(10) - 8, -88, 2, 88, '#9aa0b4'); R(c, X(10) + 8, -88, 2, 88, '#9aa0b4'); } R(c, X(18), -34 + a * 6, 10, 4, '#2f6fbd'); R(c, X(18) + 4, -30 + a * 6, 2, 8, '#141a2e'); break;
    case 'cone': R(c, X(18) - 5, -6, 10, 4, '#141a2e'); R(c, X(18) - 4, -20, 8, 14, '#ff6a1e'); R(c, X(18) - 3, -16, 6, 3, '#f4f2ea'); break;
    case 'wrench': R(c, X(18), -34 + a * 3, 3, 14, '#9aa0b4'); R(c, X(18) - 2, -36 + a * 3, 7, 4, '#9aa0b4'); break;
    case 'roller': R(c, X(18), -40 + a * 6, 2, 22, '#9a6a3c'); R(c, X(18) - 5, -46 + a * 6, 12, 6, '#f4f2ea'); R(c, X(18) - 5, -42 + a * 6, 12, 2, '#7ab0e0'); break;
    case 'bin': R(c, X(-26) - 8, -24, 16, 24, '#141a2e'); R(c, X(-26) - 7, -23, 14, 22, '#3f9450'); R(c, X(-26) - 8, -26, 16, 3, '#2a6a38'); R(c, X(-26) - 6, -2, 4, 4, '#22232c'); break;
    case 'net': R(c, X(16), -48 + a * 4, 2, 40, '#9a6a3c'); R(c, X(16) - 6, -56 + a * 4, 14, 10, 'rgba(230,240,255,.7)'); R(c, X(16) - 6, -56 + a * 4, 14, 1, '#141a2e'); break;
  } }
export function drawCones(c, w) { for (const [x, y] of w.cones || []) { const X = x * TILE, Y = y * TILE; R(c, X - 5, Y - 2, 10, 3, '#141a2e'); R(c, X - 4, Y - 13, 8, 11, '#ff6a1e'); R(c, X - 3, Y - 9, 6, 2, '#f4f2ea'); } }
export const ADS = ['$KIBBLE - the coin of the Kibble Mall', 'Buy a Bone, Back a Pup - $BONE', 'Zoomies Motors: 0% interest on bones', 'Launch your own coin at Launch Hall', '$PAWS - to the moon (demo)'];

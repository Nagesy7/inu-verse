// Phase 6 world art: Emberpaw Firehouse (red brick, cream trim, a roll-up engine bay, a bell, the "FIRE" sign), Engine 7
// (a small red pumper with a ladder and a beacon), the crew (tan turnout coats with reflective stripes, red helmets; the
// captain's is white), the Crumb and Co. bakery kiosk, and the cartoon incidents: a smoking bin, a kite in a street tree, a
// toaster puff, a cat on a lamppost. Bigger events add a constable and a taped cordon. Smoke is soft grey puffs; nothing
// burns, nothing breaks. Reduced motion: no flashing beacon, still smoke. The normal Shiba renderer + layered outfits.
import { TILE, FIRE_STATION, BAKERY } from './place.js';
import { CREW, CONSTABLE, INCIDENTS, sideOf } from './fire.js';
import { sceneAt } from './firehouse.js';
import { drawOfficer } from './patrolart.js';
export const FIRE_COLORS = Object.freeze({ brick: '#b5483a', brickDark: '#8a3229', brickLight: '#cf6a55', cream: '#f2e6c9', creamDark: '#d2c19a', red: '#d6362b', redDark: '#9c231b', redLight: '#ee6a55',
  steel: '#b8c0cc', steelDark: '#7d8696', glass: '#9fd6e8', ink: '#141a2e', gold: '#e7b83a', coat: '#d9a933', coatDark: '#a9801f', stripe: '#eef4f2', lime: '#c6e84a', smoke: '#9aa1ab', smokeLight: '#c9ced6',
  bin: '#3f7d4a', binDark: '#2b5a34', tape: '#f4d23a', pink: '#f3a6b8', cat: '#e88b3a', kite: '#e8473a', kiteB: '#ffd23a', white: '#fbfaf6' });
const C = FIRE_COLORS, R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h)); };
const seven = (c, x, y, s, col) => { R(c, x, y, 5 * s, s, col); R(c, x + 4 * s, y, s, 3 * s, col); R(c, x + 3 * s, y + 3 * s, s, 2 * s, col); R(c, x + 2 * s, y + 5 * s, s, 2 * s, col); }; // a pixel "7" (no font needed)
const reduced = () => { try { return !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
function drawFirehouse(c, t) { const x = FIRE_STATION.x * TILE, y = FIRE_STATION.y * TILE, w = FIRE_STATION.w * TILE; // 128 px wide on its tile row
  R(c, x - 4, y + 27, w + 8, 6, 'rgba(10,14,30,0.3)'); R(c, x - 2, y + 22, w + 4, 8, C.creamDark); R(c, x + 44, y + 24, 80, 6, '#8e8a80'); // apron
  R(c, x, y - 40, w, 64, C.brick); for (let r = 0; r < 8; r++) for (let k = 0; k < 9; k++) R(c, x + ((r % 2) * 8 + k * 16) % w, y - 38 + r * 8, 14, 1, C.brickDark); // brick courses
  R(c, x, y - 40, 3, 64, C.brickDark); R(c, x + w - 3, y - 40, 3, 64, C.brickDark); R(c, x, y + 18, w, 6, C.cream);
  R(c, x + 44, y - 24, 80, 46, C.cream); R(c, x + 47, y - 21, 74, 42, '#e9e2d0'); for (let i = 0; i < 7; i++) R(c, x + 47, y - 19 + i * 6, 74, 1, C.creamDark); // roll-up bay door
  for (const wx of [x + 52, x + 70, x + 88, x + 106]) { R(c, wx, y - 16, 12, 6, C.ink); R(c, wx + 1, y - 15, 10, 4, C.glass); }
  R(c, x + 10, y - 14, 22, 36, C.cream); R(c, x + 12, y - 12, 18, 34, C.redDark); R(c, x + 14, y - 10, 14, 12, C.glass); R(c, x + 25, y + 6, 3, 3, C.gold); // office door
  R(c, x + 8, y - 30, 26, 12, C.cream); R(c, x + 10, y - 28, 22, 8, C.glass); R(c, x + 20, y - 28, 2, 8, C.cream);
  R(c, x - 4, y - 54, w + 8, 15, C.cream); R(c, x - 4, y - 54, w + 8, 3, C.white); R(c, x - 4, y - 41, w + 8, 2, C.creamDark); // sign band
  R(c, x + 18, y - 52, w - 36, 10, C.redDark); c.font = '7px Silkscreen, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = C.cream; c.fillText('EMBERPAW FIRE', x + w / 2, y - 46.5, w - 40);
  R(c, x + 56, y - 76, 16, 22, C.brick); R(c, x + 53, y - 80, 22, 5, C.cream); R(c, x + 59, y - 72, 10, 12, C.ink); const sw = reduced() ? 0 : Math.round(Math.sin(t * 1.3) * 1); R(c, x + 61 + sw, y - 70, 6, 7, C.gold); R(c, x + 63 + sw, y - 63, 2, 2, C.coatDark); // bell tower
  R(c, x + 88, y - 66, 26, 12, C.ink); R(c, x + 89, y - 65, 24, 10, C.red); seven(c, x + 97, y - 64, 1.4, C.cream); // station number
  for (const lx of [x + 40, x + w - 2]) { R(c, lx - 2, y - 8, 6, 6, C.ink); R(c, lx - 1, y - 7, 4, 4, '#ffd27a'); R(c, lx, y - 2, 2, 10, C.ink); } }
function drawBakery(c, t) { const x = BAKERY.x * TILE, y = BAKERY.y * TILE, w = BAKERY.w * TILE; // a little sim kiosk (not a player shop)
  R(c, x - 3, y + 26, w + 6, 5, 'rgba(10,14,30,0.3)'); R(c, x, y - 18, w, 42, C.cream); R(c, x, y - 18, 2, 42, C.creamDark); R(c, x + w - 2, y - 18, 2, 42, C.creamDark);
  R(c, x + 6, y - 10, w - 12, 16, C.ink); R(c, x + 7, y - 9, w - 14, 14, '#f7e6c4'); for (const [bx, col] of [[x + 10, '#c88a3e'], [x + 22, '#d9a35a'], [x + 34, '#b8742f']]) { R(c, bx, y - 2, 9, 6, col); R(c, bx + 1, y - 3, 7, 1, '#e8c07a'); }
  R(c, x + 46, y - 4, 10, 8, C.steel); R(c, x + 47, y - 6, 3, 2, C.steelDark); R(c, x + 52, y - 6, 3, 2, C.steelDark); // the toaster
  R(c, x - 2, y + 6, w + 4, 6, '#8a5a32'); R(c, x - 2, y + 6, w + 4, 2, '#a8754a'); R(c, x + 2, y + 12, w - 4, 12, '#efe3c6');
  for (let i = 0; i < 8; i++) R(c, x - 4 + i * 9, y - 28, 9, 12, i % 2 ? C.white : C.pink); R(c, x - 4, y - 17, w + 8, 2, '#d77c93'); // striped awning
  R(c, x + 4, y - 40, w - 8, 11, C.ink); c.font = '6px Silkscreen, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = C.pink; c.fillText('BAKERY', x + w / 2, y - 34.5, w - 10); }
// Engine 7: side view when driving east/west, front/back view on the avenue. (x, y) = the middle of its back wheels' line
export function drawEngine(c, pose, t, rm = reduced()) { const x = Math.round(pose.x), y = Math.round(pose.y), f = pose.face, flash = pose.beacon && (rm ? true : Math.floor(t * 6) % 2 === 0);
  R(c, x - 30, y - 1, 60, 5, 'rgba(10,14,30,0.3)');
  if (f === 'left' || f === 'right') { const k = f === 'left' ? -1 : 1, cab = k > 0 ? x + 10 : x - 30;
    R(c, x - 30, y - 24, 60, 20, C.red); R(c, x - 30, y - 24, 60, 3, C.redLight); R(c, x - 30, y - 8, 60, 4, C.redDark); R(c, x - 30, y - 14, 60, 2, C.stripe);
    R(c, cab, y - 32, 20, 10, C.red); R(c, cab + (k > 0 ? 8 : 2), y - 30, 10, 8, C.glass); R(c, cab, y - 32, 20, 2, C.redLight);
    R(c, k > 0 ? x - 28 : x - 8, y - 29, 36, 2, C.steel); for (let i = 0; i < 7; i++) R(c, (k > 0 ? x - 27 : x - 7) + i * 5, y - 31, 1, 4, C.steel); R(c, k > 0 ? x - 28 : x - 8, y - 32, 36, 1, C.steelDark); // ladder
    R(c, x - 6, y - 21, 12, 9, C.gold); seven(c, x - 3, y - 20, 1, C.redDark);
    R(c, cab + 7, y - 36, 6, 4, flash ? '#ff4b3a' : '#8c2a22'); if (flash && !rm) R(c, cab + 5, y - 38, 10, 2, 'rgba(255,90,70,0.5)');
    for (const wx of [x - 20, x + 14]) { R(c, wx - 5, y - 6, 11, 10, C.ink); R(c, wx - 2, y - 3, 5, 4, C.steelDark); } return; }
  const back = f === 'up'; R(c, x - 16, y - 34, 32, 30, C.red); R(c, x - 16, y - 34, 32, 3, C.redLight); R(c, x - 16, y - 8, 32, 4, C.redDark); R(c, x - 16, y - 16, 32, 2, C.stripe);
  if (!back) { R(c, x - 12, y - 30, 24, 10, C.glass); R(c, x - 10, y - 12, 6, 4, '#fff1a8'); R(c, x + 4, y - 12, 6, 4, '#fff1a8'); R(c, x - 6, y - 8, 12, 3, C.steel); }
  else { R(c, x - 10, y - 30, 20, 12, C.steelDark); for (let i = 0; i < 4; i++) R(c, x - 9, y - 29 + i * 3, 18, 1, C.steel); }
  R(c, x - 5, y - 38, 10, 4, flash ? '#ff4b3a' : '#8c2a22'); for (const wx of [x - 15, x + 11]) R(c, wx - 2, y - 4, 6, 7, C.ink); }
function drawCrewOutfit(c, s, face) { const back = face === 'up', side = face === 'left' || face === 'right', k = face === 'left' ? -1 : 1;
  if (back) { R(c, -15, -46, 30, 28, C.coat); R(c, -15, -28, 30, 3, C.stripe); R(c, -15, -25, 30, 2, C.lime); R(c, -9, -42, 18, 6, C.ink); R(c, -8, -41, 16, 4, C.stripe); }
  else if (side) { R(c, -11, -46, 22, 28, C.coat); R(c, k > 0 ? 6 : -11, -46, 5, 28, C.coatDark); R(c, -11, -28, 22, 3, C.stripe); R(c, -11, -25, 22, 2, C.lime); }
  else { R(c, -15, -46, 30, 28, C.coat); R(c, -1, -46, 2, 28, C.coatDark); R(c, -15, -28, 30, 3, C.stripe); R(c, -15, -25, 30, 2, C.lime); R(c, -10, -44, 3, 14, C.stripe); R(c, 7, -44, 3, 14, C.stripe); R(c, -4, -40, 8, 2, C.ink); }
  const hat = s.role === 'captain' ? C.white : C.red, hatD = s.role === 'captain' ? C.creamDark : C.redDark; // helmet with a long back brim and a gold front shield
  R(c, -14, -82, 28, 12, hat); R(c, -12, -84, 24, 3, hat); R(c, -1, -84, 2, 13, hatD); R(c, back ? -18 : -17, -71, back ? 36 : 34, 3, hatD);
  if (!back && !side) { R(c, -4, -80, 8, 8, C.gold); R(c, -2, -78, 4, 4, C.redDark); } }
export function drawCrew(c, s, pose, deps, { name = null, scale = 1 } = {}) { if (pose.hidden) return; c.save(); c.translate(Math.round(pose.x), Math.round(pose.y)); c.scale(0.5 * scale, 0.5 * scale);
  deps.drawShiba(c, 0, 0, { coat: s.coat, outfit: s.outfit, art: 'layer:' + s.coat, face: pose.face, phase: pose.phase, moving: pose.moving, scale: 1.5, fid: s.id, name }); drawCrewOutfit(c, s, pose.face); c.restore(); }
export function drawSmoke(c, x, y, t, n = 4, rm = reduced(), big = false) { for (let i = 0; i < n; i++) { const ph = rm ? (i + 0.5) / n : (t * 0.45 + i / n) % 1, py = y - ph * (big ? 46 : 34), px = x + Math.sin(ph * 5 + i) * (big ? 6 : 4), r = 3 + ph * (big ? 8 : 6);
    c.globalAlpha = 0.75 * (1 - ph * 0.8); R(c, px - r, py - r * 0.7, r * 2, r * 1.4, i % 2 ? C.smoke : C.smokeLight); R(c, px - r * 0.7, py - r, r * 1.4, r * 2, i % 2 ? C.smoke : C.smokeLight); } c.globalAlpha = 1; }
function drawIncident(c, inc, t, deps, scene) { const ev = inc.c, X = ev.x * TILE, Y = ev.y * TILE, rm = reduced(), working = Object.values(scene.crew).some((p) => p.working);
  if (ev.kind === 'bins') { R(c, X - 8, Y - 18, 16, 18, C.bin); R(c, X - 8, Y - 18, 16, 2, '#5a9c64'); R(c, X - 6, Y - 14, 2, 12, C.binDark); R(c, X + 4, Y - 14, 2, 12, C.binDark);
    if (inc.solved) { R(c, X - 9, Y - 22, 18, 4, C.binDark); R(c, X - 3, Y - 24, 6, 2, C.binDark); for (const dx of [-12, 12]) R(c, X + dx, Y - 30 - ((t * 10) % 6), 2, 2, C.stripe); }
    else { R(c, X - 13, Y - 21, 10, 3, C.binDark); drawSmoke(c, X, Y - 20, t, ev.big ? 6 : 4, rm, ev.big); } }
  else if (ev.kind === 'kite') { if (!inc.solved) { const kx = X + 4, ky = Y - 56 + (rm ? 0 : Math.sin(t * 3) * 1.5); R(c, kx - 1, ky - 7, 2, 14, C.kite); R(c, kx - 6, ky - 1, 12, 2, C.kite); R(c, kx - 4, ky - 4, 8, 8, C.kite); R(c, kx - 2, ky - 2, 4, 4, C.kiteB);
      for (let i = 0; i < 5; i++) R(c, kx + 1 + i * 2, ky + 6 + i * 3, 2, 2, i % 2 ? C.kiteB : C.ink); }
    const o = { x: (ev.stand[0] - 1.6) * TILE, y: (ev.stand[1] + 0.3) * TILE }; c.save(); c.translate(Math.round(o.x), Math.round(o.y)); c.scale(0.38, 0.38); deps.drawShiba(c, 0, 0, { coat: 'cream', art: 'layer:cream', face: 'up', phase: t * 2, moving: false, scale: 1.5, fid: 'sim:pt-kiteowner' }); c.restore();
    if (inc.solved) { const kx = o.x + 8, ky = o.y - 30; R(c, kx - 3, ky - 4, 6, 8, C.kite); R(c, kx - 1, ky - 2, 2, 4, C.kiteB); for (const dx of [-8, 8]) R(c, o.x + dx, o.y - 40 - ((t * 9) % 8), 3, 3, C.pink); } }
  else if (ev.kind === 'toaster') { const tx = BAKERY.x * TILE + 51, ty = BAKERY.y * TILE - 6; if (!inc.solved) { drawSmoke(c, tx, ty, t, ev.big ? 6 : 4, rm, ev.big); R(c, tx - 3, ty - 6 - (rm ? 0 : Math.abs(Math.sin(t * 5)) * 3), 6, 4, '#7a4a20'); }
    else { R(c, tx - 4, ty - 4, 8, 3, '#d9a35a'); for (const dx of [-9, 9]) R(c, tx + dx, ty - 14 - ((t * 9) % 8), 2, 2, C.stripe); } }
  else if (ev.kind === 'cat') { const cx = inc.solved ? (ev.stand[0] - 1.1) * TILE : X + 4, cy = inc.solved ? (ev.stand[1] + 0.2) * TILE : Y - 70, tail = rm ? 0 : Math.sin(t * 4) * 2;
    R(c, cx - 6, cy - 7, 12, 7, C.cat); R(c, cx + 2, cy - 12, 7, 6, C.cat); R(c, cx + 2, cy - 14, 2, 2, C.cat); R(c, cx + 7, cy - 14, 2, 2, C.cat); R(c, cx + 4, cy - 10, 1, 1, C.ink); R(c, cx + 7, cy - 10, 1, 1, C.ink);
    R(c, cx - 9, cy - 9 + tail, 3, 6, C.cat); if (!inc.solved && !working) { R(c, cx + 10, cy - 22, 9, 8, C.white); R(c, cx + 13, cy - 21, 2, 4, C.ink); R(c, cx + 13, cy - 16, 2, 1, C.ink); } }
  if (working && (ev.kind === 'kite' || ev.kind === 'cat')) { const bx = ev.stand[0] * TILE - 6, by = ev.stand[1] * TILE, topY = ev.kind === 'cat' ? Y - 62 : Y - 46, topX = X + 6; // the ladder, leaning in
    for (const dx of [0, 6]) { c.strokeStyle = C.steelDark; c.lineWidth = 2; c.beginPath(); c.moveTo(bx + dx, by); c.lineTo(topX + dx, topY); c.stroke(); }
    for (let i = 1; i < 6; i++) { const k = i / 6; R(c, bx + (topX - bx) * k, by + (topY - by) * k, 7, 1, C.steel); } } }
function tapeLine(c, x0, x1, y, t) { for (let x = x0; x < x1; x += 6) R(c, x, y, 4, 2, Math.floor((x - x0) / 6) % 2 ? C.ink : C.tape); }
function cone(c, x, y) { R(c, x - 3, y - 8, 6, 8, '#f07a2a'); R(c, x - 2, y - 5, 4, 2, C.white); R(c, x - 4, y, 8, 2, '#c75a1a'); }
// world drawables (the bureau hook adds these to the y-sorted props). view = { events, mine } from the firehouse tick
export function fireProps(t, deps, player = null, view = {}) { const ms = Date.now(), sc = sceneAt(ms, view), out = [{ y: (FIRE_STATION.y + 1) * TILE - 2, d: (c) => drawFirehouse(c, t) }, { y: (BAKERY.y + 1) * TILE - 2, d: (c) => drawBakery(c, t) }];
  out.push({ y: sc.engine.y, d: (c) => drawEngine(c, sc.engine, t) });
  for (const s of CREW) { const p = sc.crew[s.id]; if (!p || p.hidden) continue; const near = player && Math.hypot(player.x - p.x, player.y - p.y) < 4.5 * TILE; out.push({ y: p.y, d: (c) => drawCrew(c, s, p, deps, { name: near ? s.name.split(' ').slice(-2, -1)[0] : null }) }); }
  if (sc.incident) { const ev = sc.c, Y = ev.y * TILE; out.push({ y: Y + (ev.kind === 'kite' ? 30 : 1), d: (c) => drawIncident(c, sc.incident, t, deps, sc) }); // a kite sits in front of its tree's canopy
    if (view.mine && view.mine.slot === ev.slot && !view.mine.doneAt) { const by = ev.stand[1] * TILE - 46 - (reduced() ? 0 : Math.abs(Math.sin(t * 4)) * 6), bx = ev.stand[0] * TILE; out.push({ y: ev.stand[1] * TILE + 2, d: (c) => { R(c, bx - 8, by - 8, 16, 16, C.ink); R(c, bx - 7, by - 7, 14, 14, C.red); R(c, bx - 3, by - 5, 6, 9, C.tape); R(c, bx - 1, by - 2, 2, 5, C.white); } }); } }
  if (sc.constable) { const k = sc.constable, ev = sc.c, x0 = (ev.x - 2.4) * TILE, x1 = (ev.x + 2.4) * TILE, up = sideOf(ev) < 0, y0 = (Math.min(ev.y, ev.stand[1]) - (up ? 1.5 : 1.2)) * TILE, y1 = (Math.max(ev.y, ev.stand[1]) + (up ? 0.38 : 1.1)) * TILE; // never out over the pond
    if (k.tape) { out.push({ y: y0, d: (c) => { cone(c, x0, y0); cone(c, x1, y0); tapeLine(c, x0, x1, y0 - 6, t); } }); out.push({ y: y1, d: (c) => { cone(c, x0, y1); cone(c, x1, y1); tapeLine(c, x0, x1, y1 - 6, t); } }); }
    const near = player && Math.hypot(player.x - k.x, player.y - k.y) < 4.5 * TILE; out.push({ y: k.y, d: (c) => drawOfficer(c, CONSTABLE, k, deps, { name: near ? 'Tilly' : null }) }); }
  return out; }
// screen-sign rect for the guide's pointer label (world px)
export const fireSigns = () => [{ x: FIRE_STATION.x * TILE - 6, y: FIRE_STATION.y * TILE - 82, w: FIRE_STATION.w * TILE + 12, h: 82 + TILE }, { x: BAKERY.x * TILE - 6, y: BAKERY.y * TILE - 42, w: BAKERY.w * TILE + 12, h: 42 }];

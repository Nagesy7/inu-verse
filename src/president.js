// President Inu: Zachary's character. Visits the city on a seeded schedule (every ~3-6 in-game hours) with one of four
// entrances (limo motorcade, helicopter, smoke + spotlights, casual stroll) and a mirrored exit. Headless logic + world drawables.
import { TILE, findPath, isSolid } from './world.js';
import { drawCar, LANES } from './cars.js';

export const KINDS = ['limo', 'heli', 'smoke', 'walk'];
export const QUOTES = ['Every pup deserves a good home. And a better snack.', 'Bones are temporary. Friendship is forever.', 'I came, I sniffed, I conquered.', 'Remember: always fetch responsibly.', 'The state of the Verse is... pawsome.', 'My only policy: more belly rubs.', 'Ask not what your Verse can do for you. Ask for treats.', 'Nice outfit. Very presidential.'];
export const OUTFIT = { top: 'suit_navy', neck: 'tie_red', eyes: 'shades', bottom: 'slacks_navy', feet: 'loafers' }; // tie recoloured gold + sash added at draw time
export const TIP = 25;
const HOUR = (dayLen) => dayLen / 24; // real seconds per in-game hour
const h32 = (n) => { let h = (n * 2654435761) ^ 0x9e3779b9; h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const T = (x, y) => ({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE });
const SPOTS = { limoStop: { x: LANES.south(), y: 44 * TILE + 10 }, carpetEnd: T(32, 48), heli: T(21, 71), smoke: T(32, 67), edge: T(1, 45), edgeIn: T(8, 45) };
export const WAYPOINTS = [[32, 59], [14, 56], [50, 56], [14, 67], [50, 67], [32, 80], [32, 67], [32, 48]];

export function makePresident(seed = 7) { return { seed, n: 0, next: null, on: false, stage: 'away', kind: null, t: 0, x: 0, y: 0, face: 'down', moving: false, phase: 0, path: [], wait: 0, stay: 0, tipped: false, emote: null, coffee: false, fx: [], gatherT: 0, said: 0, veh: null }; }
// schedule: next arrival 3-6 in-game hours after the last departure (seeded per visit index)
export function scheduleNext(P, nowH) { P.next = nowH + 3 + h32(P.seed * 977 + P.n) * 3; return P.next; }
export function pickKind(P) { return KINDS[Math.floor(h32(P.seed * 131 + P.n * 7 + 3) * KINDS.length)]; }

export function startVisit(P, kind, hooks = {}) {
  Object.assign(P, { on: true, stage: 'enter', kind: kind || pickKind(P), t: 0, path: [], wait: 0, tipped: false, emote: null, coffee: false, fx: [], said: 0, moving: false, face: 'down' });
  P.stay = HOUR(hooks.dayLen || 720) * (1.5 + h32(P.seed + P.n * 13) * 1.5); // 1.5-3 in-game hours
  const k = P.kind;
  if (k === 'limo') { P.veh = { y: 8 * TILE, v: 0 }; P.x = -999; }
  else if (k === 'heli') { P.veh = { alt: 300, rot: 0 }; P.x = -999; }
  else if (k === 'smoke') { P.x = -999; }
  else { P.x = SPOTS.edge.x; P.y = SPOTS.edge.y; P.coffee = true; P.path = route(SPOTS.edge, SPOTS.edgeIn); }
  return P.kind;
}
function route(a, b) { const p = findPath(Math.floor(a.x / TILE), Math.floor(a.y / TILE), Math.floor(b.x / TILE), Math.floor(b.y / TILE)); return p ? p.slice(1) : []; }
function walk(P, dt, sp = 40) { if (!P.path.length) { P.moving = false; return true; }
  const [tx, ty] = P.path[0], gx = (tx + 0.5) * TILE, gy = (ty + 0.5) * TILE, dx = gx - P.x, dy = gy - P.y, d = Math.hypot(dx, dy), st = sp * dt;
  if (d <= st) { P.x = gx; P.y = gy; P.path.shift(); } else { P.x += (dx / d) * st; P.y += (dy / d) * st; }
  P.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); P.moving = true; P.phase += dt * 10; return false; }
const smoothstep = (a, b, t) => { const x = Math.max(0, Math.min(1, (t - a) / (b - a))); return x * x * (3 - 2 * x); };

// hooks: { nowH, dayLen, npcs, toast, banner, fanfare, rng, snack }
export function updatePresident(P, dt, H) {
  if (!P.on) { if (P.next == null) scheduleNext(P, H.nowH); if (H.nowH >= P.next) startVisit(P, null, H); else return; }
  P.t += dt; if (P.emote) { P.emote.t -= dt; if (P.emote.t <= 0) P.emote = null; }
  for (const f of P.fx) f.t += dt; P.fx = P.fx.filter((f) => f.t < f.life);
  const k = P.kind, t = P.t;
  const arrive = () => { P.stage = 'visit'; P.t = 0; H.toast?.('The President has arrived!'); H.banner?.('The President has arrived!'); };
  if (P.stage === 'enter') {
    if (k === 'limo') { const stopY = SPOTS.limoStop.y; P.veh.y = 8 * TILE + (stopY - 8 * TILE) * smoothstep(0, 5, t);
      if (t > 5 && !P.fan) { P.fan = 1; H.fanfare?.(); }
      if (t > 5 && t < 9 && Math.random() < dt * 10) P.fx.push({ k: 'flash', x: SPOTS.carpetEnd.x + (Math.random() - 0.5) * 220, y: SPOTS.carpetEnd.y + (Math.random() - 0.3) * 90, t: 0, life: 0.18 });
      if (t > 6.5 && P.x < 0) { P.x = SPOTS.limoStop.x + 34; P.y = SPOTS.limoStop.y + 20; P.path = route(P, SPOTS.carpetEnd); }
      if (P.x > 0 && walk(P, dt, 30) && t > 7) { P.emote = { kind: 'wave', t: 2 }; arrive(); } }
    else if (k === 'heli') { P.veh.alt = 300 * (1 - smoothstep(0, 5, t)); P.veh.rot += dt * (t < 6.5 ? 40 : 40 * Math.max(0, 1 - (t - 6.5) / 2));
      if (t < 6.5 && Math.random() < dt * 30) P.fx.push(wash(P.veh.alt)); if (t > 5 && !P.fan) { P.fan = 1; H.fanfare?.(); }
      if (t > 5.8 && P.x < 0) { P.x = SPOTS.heli.x + 60; P.y = SPOTS.heli.y + 8; P.face = 'down'; }
      if (t > 7) { P.emote = { kind: 'wave', t: 2 }; arrive(); } }
    else if (k === 'smoke') { if (Math.random() < dt * 24 && t < 3.6) P.fx.push({ k: 'smoke', x: SPOTS.smoke.x + (Math.random() - 0.5) * 70, y: SPOTS.smoke.y + (Math.random() - 0.5) * 24, r: 8 + Math.random() * 10, t: 0, life: 2.4 });
      if (t > 2.6 && P.x < 0) { P.x = SPOTS.smoke.x; P.y = SPOTS.smoke.y; P.face = 'down'; P.emote = { kind: 'dance', t: 2 }; H.fanfare?.(); }
      if (t > 4.6) arrive(); }
    else { if (walk(P, dt, 34)) { P.emote = { kind: 'wave', t: 2 }; if ((H.rng?.() ?? Math.random()) < 0.5) H.snack?.(); arrive(); } }
    return;
  }
  if (P.stage === 'visit') {
    if (walk(P, dt)) { P.wait -= dt; if (P.wait <= 0) { const w = WAYPOINTS[Math.floor((H.rng?.() ?? Math.random()) * WAYPOINTS.length)]; P.path = route(P, T(w[0], w[1])); P.wait = 4 + (H.rng?.() ?? Math.random()) * 5; } }
    gather(P, dt, H.npcs || []);
    if (P.t > P.stay) { P.stage = 'exit'; P.t = 0; P.emote = { kind: 'wave', t: 2 };
      P.path = k === 'limo' ? route(P, { x: SPOTS.limoStop.x + 34, y: SPOTS.limoStop.y + 20 }) : k === 'heli' ? route(P, { x: SPOTS.heli.x + 60, y: SPOTS.heli.y + 8 }) : k === 'walk' ? route(P, SPOTS.edge) : []; }
    return;
  }
  // exit (mirrors the entrance)
  if (k === 'limo') { if (P.x > 0) { if (walk(P, dt, 34)) { P.x = -999; P.t = 0; } } else { P.veh.y -= dt * 120 * Math.min(1, P.t / 2); if (P.veh.y < 8 * TILE) end(P, H); } }
  else if (k === 'heli') { if (P.x > 0) { if (walk(P, dt, 34)) { P.x = -999; P.t = 0; } } else { P.veh.rot += dt * 40; P.veh.alt = 300 * smoothstep(1.5, 6, P.t); if (Math.random() < dt * 30 && P.veh.alt < 200) P.fx.push(wash(P.veh.alt)); if (P.t > 6.5) end(P, H); } }
  else if (k === 'smoke') { if (P.t < 5) { const m = { x: P.x - 26 * dt, y: P.y }; if (!isSolid(Math.floor(m.x / TILE), Math.floor(m.y / TILE))) P.x = m.x; P.face = 'right'; P.moving = true; P.phase += dt * 8; P.moonwalk = true; }
    else { if (!P.puff) { P.puff = 1; for (let i = 0; i < 14; i++) P.fx.push({ k: 'smoke', x: P.x + (Math.random() - 0.5) * 50, y: P.y - 10 + (Math.random() - 0.5) * 20, r: 8 + Math.random() * 10, t: 0, life: 2 }); } if (P.t > 5.4) P.x = -999; if (P.t > 7) end(P, H); } }
  else if (walk(P, dt, 38)) end(P, H);
}
function end(P, H) { Object.assign(P, { on: false, stage: 'away', x: -999, veh: null, fan: 0, puff: 0, moonwalk: false, path: [] }); P.n++; scheduleNext(P, H.nowH); }
function wash(alt) { const a = Math.random() * 6.28, r = 40 + Math.random() * 70; return { k: Math.random() < 0.35 ? 'leaf' : 'dust', x: SPOTS.heli.x + Math.cos(a) * r, y: SPOTS.heli.y + Math.sin(a) * r * 0.5, vx: Math.cos(a) * 90, vy: Math.sin(a) * 40 - 10, t: 0, life: 1 + Math.random(), alt }; }
function gather(P, dt, npcs) { P.gatherT -= dt; if (P.gatherT > 0) return; P.gatherT = 2;
  for (const n of npcs) { const d = Math.hypot(n.x - P.x, n.y - P.y); if (d > 14 * TILE) continue;
    if (d < 3.5 * TILE) { n.path = []; n.wait = 2.5; n.face = P.x < n.x ? 'left' : 'right'; if (Math.random() < 0.6) n.emote = { kind: Math.random() < 0.5 ? 'heart' : 'wave', t: 1.6 }; n.cheer = 2; continue; }
    if (!n.path.length) { const tx = Math.floor(P.x / TILE) + Math.round((Math.random() - 0.5) * 5), ty = Math.floor(P.y / TILE) + 1 + Math.round(Math.random() * 2);
      const p = findPath(Math.floor(n.x / TILE), Math.floor(n.y / TILE), tx, ty); if (p) n.path = p.slice(1, 40); } } }

export function talk(P, state) { const q = QUOTES[(P.said++ + P.n * 3) % QUOTES.length]; let tip = 0; if (!P.tipped) { P.tipped = true; tip = TIP; state.bones = (state.bones || 0) + tip; } return { quote: q, tip }; }
export const presidentPresent = (P) => P.on && P.x > 0;

// ---------- drawables (world coords) ----------
export function presidentProps(P, time) { const out = []; if (!P.on) return out; const k = P.kind;
  if (k === 'limo' && P.veh) { const x = SPOTS.limoStop.x, dir = P.stage === 'exit' && P.x < 0 ? 'north' : 'south';
    for (const [dy, col, kind] of [[-200, '#141a2e', 'sedan'], [-100, '#e3b341', 'limo'], [0, '#141a2e', 'sedan']]) out.push({ y: P.veh.y + dy, d: (c) => drawCar(c, x, P.veh.y + dy, { col, kind, dir }) }); // escort, gold limo, escort
    const grow = P.stage === 'enter' ? Math.max(0, Math.min(1, (P.t - 5) / 1.5)) : 1, cx = SPOTS.carpetEnd.x, y0 = SPOTS.limoStop.y + 8, y1 = y0 + (SPOTS.carpetEnd.y + 20 - y0) * grow;
    if (grow > 0 && (P.stage !== 'exit' || P.x > 0)) out.push({ flat: true, y: y0, d: (c) => { c.fillStyle = '#7a1018'; c.fillRect(cx - 26, y0, 52, y1 - y0); c.fillStyle = '#b3202c'; c.fillRect(cx - 24, y0, 48, y1 - y0); c.fillStyle = '#e3b341'; c.fillRect(cx - 20, y0, 2, y1 - y0); c.fillRect(cx + 18, y0, 2, y1 - y0); if (grow < 1) { c.fillStyle = '#8e1a20'; c.fillRect(cx - 26, y1 - 6, 52, 10); c.fillStyle = '#d8404a'; c.fillRect(cx - 26, y1 - 6, 52, 2); } } }); }
  if (k === 'heli' && P.veh) { const { x, y } = SPOTS.heli, alt = P.veh.alt;
    out.push({ flat: true, y, d: (c) => { const s = 1 - alt / 500; c.fillStyle = `rgba(16,24,48,${0.35 * s})`; c.beginPath(); c.ellipse(x, y + 6, 70 * s, 22 * s, 0, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,.55)'; c.strokeStyle = '#e3b341'; c.lineWidth = 4; c.beginPath(); c.ellipse(x, y + 6, 86, 30, 0, 0, 7); c.stroke(); c.fillStyle = '#e3b341'; c.fillRect(x - 12, y - 8, 6, 28); c.fillRect(x + 6, y - 8, 6, 28); c.fillRect(x - 6, y + 3, 12, 6); } });
    out.push({ y: y + 10, d: (c) => drawHeli(c, x, y - alt, P.veh.rot) }); }
  if (k === 'smoke' && P.stage === 'enter' && P.t < 4.6) out.push({ y: 1e9 - 2, d: (c) => { const { x, y } = SPOTS.smoke; c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) { const a = Math.sin(time * 1.7 + i * 2.1) * 140, bx = x + a, by = y; c.fillStyle = 'rgba(255,240,190,.16)'; c.beginPath(); c.moveTo(x - 260 + i * 260, y - 420); c.lineTo(bx - 40, by + 10); c.lineTo(bx + 40, by + 10); c.fill(); c.fillStyle = 'rgba(255,240,200,.22)'; c.beginPath(); c.ellipse(bx, by + 6, 44, 14, 0, 0, 7); c.fill(); }
    c.restore(); } });
  out.push({ y: 1e9 - 1, d: (c) => { for (const f of P.fx) { const a = 1 - f.t / f.life;
    if (f.k === 'flash') { c.fillStyle = `rgba(255,255,255,${a})`; c.fillRect(f.x - 6, f.y - 2, 12, 4); c.fillRect(f.x - 2, f.y - 6, 4, 12); c.fillStyle = `rgba(255,255,220,${a * 0.35})`; c.beginPath(); c.arc(f.x, f.y, 18, 0, 7); c.fill(); }
    else if (f.k === 'smoke') { const r = f.r + f.t * 14; c.fillStyle = `rgba(220,220,232,${a * 0.75})`; c.beginPath(); c.arc(f.x, f.y - f.t * 16, r, 0, 7); c.fill(); c.fillStyle = `rgba(255,255,255,${a * 0.5})`; c.beginPath(); c.arc(f.x - r * 0.3, f.y - f.t * 16 - r * 0.3, r * 0.45, 0, 7); c.fill(); }
    else { const x = f.x + f.vx * f.t, y = f.y + f.vy * f.t; c.fillStyle = f.k === 'leaf' ? `rgba(80,160,70,${a})` : `rgba(210,195,160,${a * 0.7})`; c.fillRect(Math.round(x), Math.round(y), f.k === 'leaf' ? 6 : 4, f.k === 'leaf' ? 4 : 4); } } } });
  return out; }
function drawHeli(c, x, y, rot) { const R = (a, b, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x + a), Math.round(y + b), w, h); };
  R(-60, -10, 120, 6, '#141a2e'); R(-50, 2, 100, 4, '#141a2e'); for (const sx of [-40, 34]) R(sx, -4, 4, 8, '#141a2e'); // skids
  R(-46, -54, 72, 46, '#141a2e'); R(-44, -52, 68, 42, '#1f2d5c'); R(-44, -52, 68, 6, '#3a4c8a'); R(-44, -20, 68, 4, '#e3b341'); R(4, -48, 20, 22, '#9fd8f5'); R(6, -46, 6, 8, '#e6f7ff'); R(-36, -44, 16, 14, '#9fd8f5');
  R(-100, -42, 56, 10, '#141a2e'); R(-98, -40, 52, 6, '#1f2d5c'); R(-108, -56, 12, 26, '#141a2e'); R(-106, -54, 8, 22, '#e3b341'); // tail + fin
  R(-4, -64, 8, 10, '#141a2e'); const L = Math.abs(Math.cos(rot)) * 110 + 8; R(-L, -66, L * 2, 4, 'rgba(20,26,46,.85)'); const L2 = Math.abs(Math.sin(rot)) * 110 + 8; R(-L2, -66, L2 * 2, 4, 'rgba(20,26,46,.5)');
  R(-8, -34, 16, 10, '#e3b341'); R(-4, -31, 8, 4, '#1f2d5c'); }

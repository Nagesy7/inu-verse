// Daily world events, browser side (Alive phase 5): scenery props, the trader cart, festival confetti + lantern lights, the
// participation activity (walk up to stalls / lanterns / beds, catch fish), carried keepsakes, the HUD chip, the entry banner and the
// event panel. Pure rules + the daily pick live in src/events.js. Perf: everything is culled to the camera, scenery is a handful of
// fillRects, confetti is a capped pool (none in reduced-effects / reduced-motion), lantern lights only join the light list when dark.
// No Bones are granted here; the trader spends Bones client-side like the wardrobe; never $KIBBLE.
import * as E from './events.js';

const TILE = 32;
const PAL = { wood: '#7a4a26', woodd: '#4e2e18', cloth: ['#d94a4a', '#3d8fd1', '#e0a63a', '#4aa86a'], cream: '#fff3d6', ink: '#121a36', gold: '#f2cc68', lant: ['#e2463c', '#f0a030', '#e85a8a', '#f2cc68'] };
// scenery is drawn at K x its pixel size so it matches the town's buildings / Shibas at the default zoom
const K = 1.4, sc = (x, y, fn) => (c) => { c.save(); c.translate(x, y); c.scale(K, K); fn(c); c.restore(); };
const inV = (x, y, v, m = 80) => x > v.x0 - m && x < v.x1 + m && y > v.y0 - m && y < v.y1 + m * 2;
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

export function createEvents({ search = '', now = () => Date.now(), store = null } = {}) {
  const forced = E.parseEventParam(search); let ev = E.eventToday(now(), forced), checkT = 0; const conf = []; let glowT = 0;
  const api = {
    get ev() { return ev; }, forced,
    // re-check the date every few seconds (cheap); returns true when the featured event changed (midnight Sydney)
    tick() { const t = now(); if (t - checkT < 5000) return false; checkT = t; const n = E.eventToday(t, forced); if (n.id === ev.id && n.day === ev.day) return false; ev = n; conf.length = 0; return true; },
    traderAt() { if (ev.id !== 'trader') return null; const [tx, ty] = ev.spot.at; return { x: (tx + 0.5) * TILE + 30, y: (ty + 0.8) * TILE, face: 'down' }; },
    nearTrader(px, py) { const a = api.traderAt(); return !!a && Math.hypot(a.x - px, a.y - py) < E.CAPS.traderR + 20; },
    // activity step: walking up to a stall / lantern / bed counts it (once per target per day). Returns addProgress results to toast.
    step(dt, s, px, py, { low = false, rm = false, view = null } = {}) { const out = [];
      if (s && px != null && ev.def.goal?.kind === 'visit') for (const tg of E.targetsFor(ev)) if (Math.hypot(tg.x - px, tg.y - py) < E.CAPS.visitR) { const r = E.addProgress(s, ev, 'visit', tg.i); if (r.counted) out.push(r); }
      // confetti: festival only, capped, spawned only inside the plaza part of the view
      const cap = low || rm ? E.CAPS.confettiLow : E.CAPS.confetti;
      if (ev.id === 'festival' && cap && view) { const Z = E.SCENERY.festival.confetti, x0 = Math.max(view.x0, Z.x0 * TILE), x1 = Math.min(view.x1, Z.x1 * TILE), y0 = Math.max(view.y0, Z.y0 * TILE - 80), y1 = Math.min(view.y1, Z.y1 * TILE);
        if (x1 > x0 && y1 > y0) while (conf.length < cap) conf.push({ x: x0 + Math.random() * (x1 - x0), y: y0 + Math.random() * (y1 - y0) * 0.4, vy: 14 + Math.random() * 16, ph: Math.random() * 6, col: PAL.cloth[conf.length % 4], end: y0 + (y1 - y0) * (0.5 + Math.random() * 0.5), x0, x1, y0 });
        for (const p of conf) { p.ph += dt * 3; p.y += p.vy * dt; p.x += Math.sin(p.ph) * 8 * dt; if (p.y > p.end) { p.x = p.x0 + Math.random() * (p.x1 - p.x0); p.y = p.y0; } } }
      else conf.length = 0; glowT += dt; return out; },
    // depth-sorted scenery props (only those near the view)
    props(view, time, { dark = 0, s = null } = {}) { const out = [], S = E.SCENERY[ev.id], hit = s ? hitSet(s) : new Set();
      if (ev.id === 'market') S.stalls.forEach(([tx, ty], i) => { const x = tx * TILE + 16, y = ty * TILE + 26; if (inV(x, y, view)) out.push({ y, d: sc(x, y, (c) => drawStall(c, 0, 0, i, hit.has(String(i)))) }); });
      if (ev.id === 'festival') { const L = S.lanterns.map(([tx, ty]) => ({ x: tx * TILE + 16, y: ty * TILE + 26 }));
        L.forEach((p, i) => { if (inV(p.x, p.y, view)) out.push({ y: p.y, d: sc(p.x, p.y, (c) => drawLanternPole(c, 0, 0, time, dark, hit.has(String(i)), i)) }); });
        for (const [a, b] of S.strands) { const A = L[a], B = L[b]; if (inV((A.x + B.x) / 2, A.y, view, 220)) out.push({ y: Math.max(A.y, B.y) + 1, d: (c) => drawBunting(c, A.x, A.y - 44 * K, B.x, B.y - 44 * K, time, a === 1 ? 'LANTERN FESTIVAL' : null, dark) }); } }
      if (ev.id === 'derby') { const [p0, p1] = S.poles.map(([tx, ty]) => ({ x: tx * TILE + 16, y: ty * TILE + 26 }));
        if (inV((p0.x + p1.x) / 2, p0.y, view, 200)) { out.push({ y: p0.y, d: (c) => { sc(p0.x, p0.y, (q) => drawPole(q, 0, 0))(c); sc(p1.x, p1.y, (q) => drawPole(q, 0, 0))(c); drawBunting(c, p0.x, p0.y - 44 * K, p1.x, p1.y - 44 * K, time, 'FISHING DERBY'); } }); }
        for (const [tx, ty] of S.buoys) { const x = tx * TILE + 16, y = ty * TILE + 16; if (inV(x, y, view)) out.push({ y: y - 40, d: (c) => drawBuoy(c, x, y, time) }); }
        { const [tx, ty] = S.sign, x = tx * TILE + 16, y = ty * TILE + 26; if (inV(x, y, view)) out.push({ y, d: sc(x, y, (c) => drawSign(c, 0, 0, ['DERBY', 'CATCH 3'])) }); } }
      if (ev.id === 'garden') { S.beds.forEach(([tx, ty], i) => { const x = tx * TILE + 16, y = ty * TILE + 24; if (inV(x, y, view)) out.push({ y, d: sc(x, y, (c) => drawBed(c, 0, 0, i, time, hit.has(String(i)))) }); });
        { const [tx, ty] = S.sign, x = tx * TILE + 16, y = ty * TILE + 26; if (inV(x, y, view)) out.push({ y, d: sc(x, y, (c) => drawSign(c, 0, 0, ['GARDEN', 'SHOW'])) }); } }
      if (ev.id === 'trader') { const [tx, ty] = ev.spot.at, x = tx * TILE + 8, y = (ty + 0.8) * TILE; if (inV(x, y, view)) out.push({ y: y - 2, d: sc(x, y, (c) => drawCart(c, 0, 0, time)) }); }
      return out; },
    // late pass (above props): confetti
    drawAir(c, view) { for (const p of conf) { if (!inV(p.x, p.y, view, 0)) continue; c.fillStyle = p.col; c.fillRect(Math.round(p.x), Math.round(p.y), Math.sin(p.ph) > 0 ? 3 : 2, 2); } },
    // warm lantern lights for drawAtmosphere's light list (festival only; the caller only asks when it is dark)
    lights() { if (ev.id !== 'festival') return []; const S = E.SCENERY.festival, P = S.lanterns.map(([tx, ty]) => ({ x: tx * TILE + 16 + 14, y: ty * TILE - 14, gy: ty * TILE + 26, r: 70, glow: true, core: 16 }));
      for (const [a, b] of S.strands) { const A = P[a], B = P[b]; P.push({ x: (A.x + B.x) / 2 - 14, y: (A.y + B.y) / 2 - 20, gy: Math.max(A.gy, B.gy), r: 56, glow: true, core: 10 }); } return P; }, // pole lanterns + one per strand
    confettiCount: () => conf.length,
  };
  function hitSet(s) { const g = E.ensureGear(s); return new Set(g.prog.day === ev.day && g.prog.ev === ev.id ? g.prog.hit : []); }
  return api;
}

// ---- scenery art (world px; all plain rects, no images) ----
function drawStall(c, x, y, i, seen) { const col = PAL.cloth[i % 4], x0 = x - 26;
  R(c, x0 + 2, y - 40, 3, 40, PAL.woodd); R(c, x0 + 47, y - 40, 3, 40, PAL.woodd); // poles
  for (let k = 0; k < 6; k++) R(c, x0 + k * 9, y - 46, 9, 9, k % 2 ? PAL.cream : col); R(c, x0, y - 37, 54, 2, '#0003'); // striped awning
  for (let k = 0; k < 6; k++) R(c, x0 + k * 9 + 2, y - 37, 5, 3, k % 2 ? PAL.cream : col);
  R(c, x0 + 2, y - 16, 50, 12, PAL.wood); R(c, x0 + 2, y - 5, 50, 3, PAL.woodd); // table
  const goods = [['#d8402f', '#f06a4a'], ['#f08a20', '#4aa040'], ['#7cc24a', '#4e8a2c'], ['#e9c040', '#b8862a']][i % 4];
  for (let k = 0; k < 5; k++) { R(c, x0 + 6 + k * 9, y - 21, 7, 6, goods[k % 2]); R(c, x0 + 7 + k * 9, y - 22, 2, 2, '#fff5'); }
  if (seen) R(c, x0 + 22, y - 54, 10, 6, PAL.gold); }
function drawPole(c, x, y) { R(c, x - 2, y - 44, 4, 44, PAL.woodd); R(c, x - 4, y - 2, 8, 3, '#0004'); R(c, x - 3, y - 46, 6, 3, PAL.gold); }
function drawLanternPole(c, x, y, time, dark, lit, i) { drawPole(c, x, y); R(c, x, y - 40, 12, 2, PAL.woodd);
  const col = PAL.lant[i % 4], sw = Math.sin(time * 1.4 + i) * 1.2, lx = x + 10 + sw, ly = y - 38, on = lit || dark > 0.15;
  if (on && dark > 0.15) { c.save(); c.globalAlpha = 0.25 + 0.25 * dark; c.fillStyle = '#ffd88a'; c.beginPath(); c.arc(lx, ly + 11, 14, 0, Math.PI * 2); c.fill(); c.restore(); }
  R(c, lx - 0.5, ly, 1, 3, PAL.ink); R(c, lx - 6, ly + 3, 12, 16, col); R(c, lx - 7, ly + 6, 14, 10, col); R(c, lx - 5, ly + 2, 10, 2, PAL.ink); R(c, lx - 5, ly + 19, 10, 2, PAL.ink); R(c, lx - 1, ly + 21, 2, 4, PAL.gold);
  for (const yy of [ly + 8, ly + 13]) R(c, lx - 7, yy, 14, 1, '#0002');
  if (on) { c.save(); c.globalAlpha = 0.6 + 0.25 * Math.sin(time * 3 + i); R(c, lx - 3, ly + 7, 6, 8, '#fff2b0'); c.restore(); if (lit) R(c, lx - 1, ly - 4, 2, 2, PAL.gold); } else R(c, lx - 3, ly + 9, 6, 1, '#0003'); }
function drawBunting(c, x0, y0, x1, y1, time, label, dark = -1) { const n = Math.max(3, Math.floor(Math.hypot(x1 - x0, y1 - y0) / 10)), sag = 10;
  c.strokeStyle = PAL.ink; c.lineWidth = 1; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag * 2, x1, y1); c.stroke();
  for (let k = 1; k < n; k++) { const t = k / n, x = (1 - t) ** 2 * x0 + 2 * t * (1 - t) * (x0 + x1) / 2 + t * t * x1, y = (1 - t) ** 2 * y0 + 2 * t * (1 - t) * ((y0 + y1) / 2 + sag * 2) + t * t * y1;
    if (dark >= 0 && k % 3 === 0) { const col = PAL.lant[(k / 3) % 4]; R(c, x - 0.5, y, 1, 3, PAL.ink); R(c, x - 4, y + 3, 8, 8, col); R(c, x - 3, y + 2, 6, 10, col); R(c, x - 3, y + 2, 6, 1, PAL.ink); R(c, x - 3, y + 11, 6, 1, PAL.ink);
      if (dark > 0.15) { c.save(); c.globalAlpha = 0.2 + 0.3 * dark; c.fillStyle = '#ffd88a'; c.beginPath(); c.arc(x, y + 7, 9, 0, Math.PI * 2); c.fill(); c.restore(); R(c, x - 2, y + 5, 4, 4, '#fff2b0'); } continue; }
    c.fillStyle = PAL.cloth[k % 4]; c.beginPath(); c.moveTo(x - 4, y); c.lineTo(x + 4, y); c.lineTo(x, y + 9); c.closePath(); c.fill(); }
  if (label) { const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + sag + 6; c.font = '6px Silkscreen, monospace'; const w = c.measureText(label).width + 8; R(c, mx - w / 2, my, w, 10, PAL.ink); R(c, mx - w / 2 + 1, my + 1, w - 2, 8, '#b8322a'); c.fillStyle = PAL.cream; c.textAlign = 'center'; c.fillText(label, mx, my + 7); } }
function drawBuoy(c, x, y, time) { const b = Math.round(Math.sin(time * 2 + x) * 1); R(c, x - 3, y - 2 + b, 6, 5, '#e2463c'); R(c, x - 3, y + b, 6, 1, '#fff'); R(c, x - 4, y + 3 + b, 8, 1, '#ffffff55'); }
function drawSign(c, x, y, lines) { R(c, x - 2, y - 22, 4, 22, PAL.woodd); R(c, x - 20, y - 40, 40, 20, PAL.woodd); R(c, x - 18, y - 38, 36, 16, '#e8d2a0'); c.fillStyle = PAL.ink; c.font = '6px Silkscreen, monospace'; c.textAlign = 'center'; c.fillText(lines[0], x, y - 31); if (lines[1]) c.fillText(lines[1], x, y - 24); }
function drawBed(c, x, y, i, time, seen) { R(c, x - 22, y - 8, 44, 10, PAL.wood); R(c, x - 22, y - 8, 44, 2, '#9a6a3a'); R(c, x - 20, y - 12, 40, 5, '#4e3220');
  const F = [['#f2cc68', '#7a4a26'], ['#e85a8a', '#fff3d6'], ['#8a6ae0', '#f2cc68'], ['#e2463c', '#f2cc68']][i % 4];
  for (let k = 0; k < 5; k++) { const fx = x - 17 + k * 8, h = 10 + ((k * 7 + i * 3) % 6), sw = Math.round(Math.sin(time * 1.2 + k + i) * 0.8); R(c, fx + 1, y - 10 - h, 2, h, '#3f8a3a'); R(c, fx - 2 + sw, y - 15 - h, 7, 7, F[0]); R(c, fx + sw, y - 13 - h, 3, 3, F[1]); }
  // rosette ribbon on a stake
  R(c, x + 24, y - 22, 2, 22, PAL.woodd); R(c, x + 20, y - 30, 10, 10, seen ? PAL.gold : '#3d6fd1'); R(c, x + 23, y - 27, 4, 4, PAL.cream); R(c, x + 21, y - 20, 3, 6, '#b8322a'); R(c, x + 26, y - 20, 3, 6, '#b8322a'); }
function drawCart(c, x, y, time) { // trader cart: wheels, wooden body, scalloped teal canopy, keepsakes on display, little sign
  R(c, x - 30, y - 30, 3, 26, PAL.woodd); R(c, x + 25, y - 30, 3, 26, PAL.woodd);
  for (let k = 0; k < 7; k++) R(c, x - 32 + k * 9, y - 38, 9, 8, k % 2 ? '#2a9a8a' : '#e9f2e4'); for (let k = 0; k < 7; k++) R(c, x - 30 + k * 9, y - 30, 5, 3, k % 2 ? '#2a9a8a' : '#e9f2e4');
  R(c, x - 30, y - 16, 58, 12, PAL.wood); R(c, x - 30, y - 16, 58, 2, '#9a6a3a'); R(c, x - 30, y - 5, 58, 2, PAL.woodd);
  for (const wx of [x - 20, x + 16]) { R(c, wx - 6, y - 6, 12, 12, PAL.ink); R(c, wx - 4, y - 4, 8, 8, '#8a5a30'); R(c, wx - 1, y - 1, 2, 2, PAL.ink); }
  const b = Math.sin(time * 1.5) * 1.5; R(c, x - 24, y - 26, 8, 9, '#e2463c'); R(c, x - 23, y - 27, 6, 1, PAL.ink); // lantern
  R(c, x - 6, y - 54 + b, 9, 9, PAL.gold); R(c, x - 2, y - 45 + b, 1, 15, PAL.ink); // star balloon
  R(c, x + 8, y - 22, 14, 4, PAL.cream); R(c, x + 6, y - 24, 4, 8, PAL.cream); R(c, x + 20, y - 24, 4, 8, PAL.cream); // bone kite folded
  R(c, x - 14, y - 12, 26, 7, '#e8d2a0'); c.fillStyle = PAL.ink; c.font = '5px Silkscreen, monospace'; c.textAlign = 'center'; c.fillText('TRADER', x - 1, y - 7); }

// ---- carried keepsake (drawn beside the player; local only) ----
export function drawGear(c, gid, x, y, time, rm = false) { const G = E.GEAR[gid]; if (!G) return; const b = rm ? 0 : Math.sin(time * 2) * 2, hx = x + 12, hy = y - 14;
  if (G.kind === 'balloon') { const bx = x + 22, by = y - 58 + b; c.strokeStyle = '#121a36aa'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(hx, hy); c.quadraticCurveTo(hx + 6, hy - 18, bx, by + 7); c.stroke();
    if (gid === 'apple') { R(c, bx - 6, by - 5, 12, 11, '#d8402f'); R(c, bx - 5, by - 6, 10, 13, '#d8402f'); R(c, bx - 3, by - 3, 3, 3, '#ffffff77'); R(c, bx, by - 9, 1, 3, PAL.woodd); R(c, bx + 1, by - 9, 4, 2, '#4aa040'); }
    else if (gid === 'star') { R(c, bx - 2, by - 7, 4, 14, PAL.gold); R(c, bx - 7, by - 2, 14, 4, PAL.gold); R(c, bx - 4, by - 4, 8, 8, PAL.gold); R(c, bx - 1, by - 3, 2, 2, '#fff8'); }
    else { for (const [dx, dy] of [[-6, 0], [6, 0], [0, -6], [0, 6], [-4, -4], [4, -4], [-4, 4], [4, 4]]) R(c, bx + dx - 2, by + dy - 2, 5, 5, '#f2cc68'); R(c, bx - 3, by - 3, 6, 6, '#7a4a26'); } return; }
  if (G.kind === 'kite') { const kx = x + 36, ky = y - 62 + b * 1.5; c.strokeStyle = '#121a3688'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(hx, hy); c.lineTo(kx, ky + 6); c.stroke();
    if (gid === 'koikite') { R(c, kx - 9, ky - 3, 14, 7, '#f08a20'); R(c, kx + 5, ky - 5, 5, 11, '#f08a20'); R(c, kx - 7, ky - 1, 2, 2, PAL.ink); R(c, kx - 4, ky - 2, 3, 2, '#fff'); R(c, kx, ky + 1, 3, 2, '#fff'); }
    else { R(c, kx - 7, ky - 2, 14, 4, PAL.cream); R(c, kx - 10, ky - 4, 5, 8, PAL.cream); R(c, kx + 5, ky - 4, 5, 8, PAL.cream); }
    for (let k = 0; k < 3; k++) R(c, kx - 2 - k * 3 + Math.round(Math.sin(time * 3 + k) * 2), ky + 8 + k * 5, 3, 2, PAL.cloth[k]); return; }
  if (G.kind === 'lantern') { const lx = x + 18, ly = y - 34; R(c, x + 10, ly - 4, 1, 22, PAL.woodd); R(c, x + 10, ly - 4, 9, 1, PAL.woodd); const sw = rm ? 0 : Math.sin(time * 2) * 1;
    R(c, lx - 4 + sw, ly, 8, 10, '#e2463c'); R(c, lx - 3 + sw, ly - 1, 6, 1, PAL.ink); R(c, lx - 3 + sw, ly + 10, 6, 1, PAL.ink); R(c, lx - 2 + sw, ly + 3, 4, 4, '#fff2b0'); return; }
  if (G.kind === 'pinwheel') { const px = x + 16, py = y - 38; R(c, px, py, 1, 24, PAL.woodd); const a = rm ? 0 : time * 4;
    for (let k = 0; k < 4; k++) { const an = a + k * Math.PI / 2; c.fillStyle = PAL.cloth[k]; c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(an) * 8, py + Math.sin(an) * 8); c.lineTo(px + Math.cos(an + 0.9) * 6, py + Math.sin(an + 0.9) * 6); c.closePath(); c.fill(); } R(c, px - 1, py - 1, 2, 2, PAL.gold); } }

// ---- HUD chip (next to the sky clock), entry banner, icons ----
export function drawEventIcon(c, id) { const P = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); }; c.clearRect(0, 0, 12, 12);
  if (id === 'market') { for (let k = 0; k < 4; k++) P(k * 3, 1, 3, 3, k % 2 ? '#fff3d6' : '#d94a4a'); P(1, 4, 1, 6, '#7a4a26'); P(10, 4, 1, 6, '#7a4a26'); P(1, 7, 10, 3, '#7a4a26'); P(3, 5, 2, 2, '#f08a20'); P(7, 5, 2, 2, '#7cc24a'); }
  else if (id === 'festival') { P(5, 0, 2, 2, '#121a36'); P(3, 2, 6, 8, '#e2463c'); P(2, 3, 8, 6, '#e2463c'); P(4, 4, 4, 4, '#fff2b0'); P(3, 2, 6, 1, '#121a36'); P(3, 10, 6, 1, '#121a36'); }
  else if (id === 'trader') { for (let k = 0; k < 4; k++) P(k * 3, 1, 3, 3, k % 2 ? '#e9f2e4' : '#2a9a8a'); P(1, 5, 10, 3, '#7a4a26'); P(2, 8, 3, 3, '#121a36'); P(7, 8, 3, 3, '#121a36'); }
  else if (id === 'derby') { P(2, 5, 7, 4, '#f08a20'); P(9, 4, 2, 6, '#f08a20'); P(3, 6, 1, 1, '#121a36'); P(0, 10, 12, 1, '#7cc4f0'); P(5, 1, 1, 4, '#121a36'); }
  else { for (const [x, y] of [[5, 1], [5, 6], [2, 3.5], [8, 3.5]]) P(x, y, 3, 3, '#f2cc68'); P(5, 4, 3, 2, '#7a4a26'); P(6, 8, 1, 4, '#3f8a3a'); P(3, 9, 3, 2, '#3f8a3a'); } }
const CSS = `#ev-chip{display:inline-flex;align-items:center;gap:4px;cursor:pointer;font:inherit}#ev-chip canvas{width:12px;height:12px;image-rendering:pixelated}
#ev-chip b{font-weight:normal;letter-spacing:.5px}@media (max-height:430px){#ev-chip b{display:none}}
#ev-banner{position:fixed;left:50%;bottom:calc(58px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:41;padding:7px 16px;background:#121a36ee;color:#f2cc68;border:3px solid #d4a640;font:11px/1.35 Silkscreen,monospace;letter-spacing:1px;box-shadow:0 4px 0 #0008;pointer-events:none;text-align:center;max-width:min(520px,80vw);transition:opacity .4s}
#ev-banner small{display:block;color:#fff6e0;font-size:9px;letter-spacing:0;margin-top:2px}#ev-banner[hidden]{display:none}
.evp h3{margin:0 0 4px}.evp .evg{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}.evp .evi{border:2px solid #8a6a2a;padding:4px 6px;background:#0c1022aa;min-width:120px}.evp .evi.on{border-color:#f2cc68}
.evp .bar{height:6px;background:#2a2f4a;margin:4px 0 2px}.evp .bar i{display:block;height:100%;background:#f2cc68}.evp small{opacity:.75}`;
export function ensureChip(doc, onClick) { if (!doc.getElementById('ev-css')) { const st = doc.createElement('style'); st.id = 'ev-css'; st.textContent = CSS; doc.head.appendChild(st); }
  let el = doc.getElementById('ev-chip'); if (el) return el; const clock = doc.getElementById('clock'); if (!clock) return null;
  el = doc.createElement('span'); el.id = 'ev-chip'; el.className = 'chip'; el.setAttribute('role', 'button'); el.tabIndex = 0; // part of the clock pill row, not an extra HUD button const cv = doc.createElement('canvas'); cv.width = 12; cv.height = 12; cv.setAttribute('aria-hidden', 'true'); const b = doc.createElement('b'); el.append(cv, b);
  el.addEventListener('click', (e) => { e.stopPropagation(); onClick?.(); }); el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }); clock.after(el); return el; }
export function updateChip(el, ev) { if (!el) return; let cv = el.querySelector('canvas'), b = el.querySelector('b'); if (!cv || !b) { el.textContent = ''; cv = el.ownerDocument.createElement('canvas'); cv.width = 12; cv.height = 12; cv.setAttribute('aria-hidden', 'true'); b = el.ownerDocument.createElement('b'); el.append(cv, b); el._ev = null; } // rebuilt if something cleared it
  if (el._ev === ev.id + ev.day) return; el._ev = ev.id + ev.day; const g = cv.getContext('2d'); if (g) drawEventIcon(g, ev.id); b.textContent = ev.def.short; el.title = `Today: ${ev.def.name}. ${ev.def.blurb}. Tap for details`; el.setAttribute('aria-label', `Today's event: ${ev.def.name}`); el.dataset.ev = ev.id; }
const SEEN_KEY = 'inuverse.event.seen';
// entry banner, once per Sydney day per event per browser (a forced ?event= always shows it)
export function maybeBanner(doc, ev, storage) { let seen = null; try { seen = storage?.getItem(SEEN_KEY); } catch {} const key = ev.day + ':' + ev.id; if (seen === key && !ev.forced) return false;
  try { storage?.setItem(SEEN_KEY, key); } catch {} let b = doc.getElementById('ev-banner'); if (!b) { b = doc.createElement('div'); b.id = 'ev-banner'; b.setAttribute('role', 'status'); doc.body.appendChild(b); }
  b.textContent = ''; const t = doc.createElement('div'); t.textContent = '★ ' + ev.def.name.toUpperCase() + ' TODAY ★'; const s = doc.createElement('small'); s.textContent = ev.def.blurb + (ev.id === 'trader' ? ` (${spotName(ev.spot.area)})` : '') + (ev.def.goal ? ` · ${ev.def.goal.verb} ${ev.def.goal.n} ${ev.def.goal.what} for a free keepsake` : ''); b.append(t, s);
  b.hidden = false; b.style.opacity = '1'; clearTimeout(b._t); b._t = setTimeout(() => { b.style.opacity = '0'; b._t = setTimeout(() => { b.hidden = true; }, 450); }, 5200); return true; }
export const spotName = (a) => ({ plaza: 'Kibble Plaza', market: 'by the Farmers Market', pond: 'by the Fishing Pond', park: 'in the park', chapel: 'in the community garden' }[a] || a);
const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
// event panel html (today's event, the activity progress, the trader stock, your keepsakes). Buttons carry data-ev attributes.
export function panelHtml(s, ev, { near = false, tomorrow = null } = {}) { const g = E.ensureGear(s), d = ev.def, p = E.progress(s, ev);
  let h = `<div class="evp"><h3>${esc(d.name)}</h3><p>${esc(d.blurb)}${ev.id === 'trader' ? ' ' + esc(spotName(ev.spot.area)) : ''}. <small>One event a day, the same for everyone (Sydney date ${esc(ev.day)}).${tomorrow ? ' Tomorrow: ' + esc(E.EVENTS[tomorrow].name) + '.' : ''}</small></p>`;
  if (p) { const kg = E.GEAR[d.keepsake]; h += `<p>${esc(d.goal.verb)} ${d.goal.n} ${esc(d.goal.what)}: <b>${p.n}/${p.of}</b>${p.done ? ' · done!' : ''}</p><div class="bar"><i style="width:${Math.round(100 * p.n / p.of)}%"></i></div><small>Free keepsake: ${esc(kg.name)} (cosmetic, once). No Bones, no KIBBLE, nothing to pay.</small>`; }
  if (ev.id === 'trader') { h += `<h3>Biscuit's keepsakes</h3><small>${near ? 'Cosmetic only. Pay in Bones, or swap one trader keepsake for another (1 free swap a day).' : 'Walk up to the trader cart ' + esc(spotName(ev.spot.area)) + ' to trade.'}</small><div class="evg">`;
    for (const k of E.TRADER_STOCK) { const G = E.GEAR[k], have = g.owned.includes(k); h += `<div class="evi${have ? ' on' : ''}"><b>${esc(G.name)}</b><br><small>${G.price} Bones</small><br>${have ? '<small>owned</small>' : `<button class="btn" data-ev="buy:${k}"${near ? '' : ' disabled'}>Buy</button>`}`;
      if (!have && near) for (const gv of E.TRADER_STOCK) if (gv !== k && g.owned.includes(gv)) h += ` <button class="btn alt" data-ev="swap:${gv}:${k}">Swap my ${esc(E.GEAR[gv].name)}</button>`;
      h += '</div>'; } h += '</div>'; }
  h += `<h3>Your keepsakes</h3>`; if (!g.owned.length) h += '<small>None yet. Take part in an event to earn one.</small>';
  else { h += '<div class="evg">'; for (const k of g.owned) h += `<div class="evi${g.carry === k ? ' on' : ''}"><b>${esc(E.GEAR[k].name)}</b><br><button class="btn ${g.carry === k ? 'ghost' : 'alt'}" data-ev="carry:${g.carry === k ? '' : k}">${g.carry === k ? 'Put away' : 'Carry'}</button></div>`; h += '</div>'; }
  return h + '</div>'; }

// Full-screen job mini-game overlay (preview): themed scene with the player doing the work, the moving red zone bar,
// the multiplier, then a results card. Logic lives in zonejobs.js; this file only draws and reads taps.
import { ZJ, ZJOBS, MARKER, ensureTownx, newShift, step, tap, finishShift, rankOf, capLeft, zoneAt } from './zonejobs.js';
import { drawShiba } from './art.js';
export const ZW = 360, ZH = 540;
const INK = '#141a2e';
let active = null;
export const zoneJobActive = () => !!active;
export const zoneJobDebug = () => active;
export const SCENE_IDS = () => Object.keys(SCENE);
const BAR = { x: 24, y: 346, w: 312, h: 24 };
const BTN = { x: 40, y: 414, w: 280, h: 72 };

export function startZoneJob(jobId, ctx) {
  if (active || !ZJOBS[jobId]) return null;
  const job = ZJOBS[jobId]; ensureTownx(ctx.state);
  const ov = document.createElement('div'); ov.id = 'zj'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', job.name);
  ov.style.cssText = 'position:fixed;inset:0;z-index:62;background:rgba(10,12,24,.94);display:flex;align-items:center;justify-content:center;touch-action:none;user-select:none;-webkit-user-select:none';
  const cv = document.createElement('canvas'); cv.id = 'zj-canvas'; ov.appendChild(cv); document.body.appendChild(ov); const c = cv.getContext('2d');
  const fit = () => { const k = Math.min(innerWidth / ZW, innerHeight / ZH) * 0.98, d = devicePixelRatio || 1; cv.style.width = Math.round(ZW * k) + 'px'; cv.style.height = Math.round(ZH * k) + 'px'; cv.width = Math.round(ZW * k * d); cv.height = Math.round(ZH * k * d); cv._s = k * d; c.imageSmoothingEnabled = false; };
  fit(); addEventListener('resize', fit);
  const st = { job: jobId, phase: 'ready', t: 0, run: newShift(jobId), zone: zoneAt(jobId, 0, 0), anim: null, res: null, paused: false, fx: [], msg: '', msgCol: '#fff', ready: 1.0 };
  active = st;
  const day = () => (ctx.day ? ctx.day() : ''), skyDay = () => (ctx.skyDay ? ctx.skyDay() : 0);
  const blip = (f) => { try { ctx.blip?.(f); } catch {} };
  const local = (e) => { const r = cv.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * ZW, y: ((e.clientY - r.top) / r.height) * ZH }; };
  const inBox = (p, b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
  const CLOSE = { x: 318, y: 6, w: 36, h: 34 }, AGAIN = { x: 30, y: 452, w: 140, h: 54 }, DONE = { x: 190, y: 452, w: 140, h: 54 };
  function doTap() {
    if (st.phase !== 'play' || st.paused) return;
    const r = tap(st.run, st.zone); st.anim = { kind: r.hit ? "hit" : "miss", t0: st.t, perfect: r.perfect, at: r.at };
    if (r.hit) { blip(r.perfect ? 1100 : 520 + Math.min(6, Math.log2(r.mult)) * 70); st.msg = r.perfect ? `PERFECT! +${r.pay}` : `+${r.pay} BONES`; st.msgCol = r.perfect ? '#ffe07a' : '#7af07a'; burst(st, 250, 200, r.perfect ? '#ffe07a' : '#fff6d0', r.perfect ? 14 : 8); }
    else { blip(150); st.msg = st.run.missRow >= ZJ.BUMP_MISSES ? 'OUCH! A BUMP - MULTIPLIER 1x' : 'MISS - MULTIPLIER BACK TO 1x'; st.msgCol = '#ff8a7a'; }
    if (st.run.done) setTimeout(() => finish(), 650);
  }
  function finish() { if (st.phase !== 'play') return; st.phase = 'results'; st.res = finishShift(ctx.state, st.run, { day: day(), skyDay: skyDay() }); blip(st.res.paid ? 880 : 300); try { ctx.onDone?.(st.res); } catch {} }
  function again() { st.run = newShift(jobId); st.phase = 'ready'; st.ready = 1.0; st.anim = null; st.msg = ''; st.res = null; }
  function end() { if (st.phase === 'play' && st.run.taps > 0) finish(); close(); }
  function close() { if (!active) return; active = null; removeEventListener('keydown', kd, true); removeEventListener('resize', fit); ov.remove(); try { ctx.onClose?.(st.res); } catch {} }
  st.close = close; st.tap = doTap; st.finish = finish;
  cv.onpointerdown = (e) => { e.preventDefault(); const p = local(e);
    if (inBox(p, CLOSE)) return end();
    if (st.phase === 'results') { if (inBox(p, AGAIN)) return again(); if (inBox(p, DONE)) return close(); return; }
    doTap(); };
  const kd = (e) => { const k = e.key.toLowerCase(); e.stopImmediatePropagation(); e.preventDefault(); if (e.repeat) return;
    if (k === 'escape') return end();
    if (st.phase === 'results') { if (k === 'enter' || k === 'e') close(); else if (k === ' ' || k === 'r') again(); return; }
    if (k === ' ' || k === 'e' || k === 'enter') doTap(); };
  addEventListener('keydown', kd, true);
  let last = performance.now();
  function frame(now) { if (active !== st) return; const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!st.paused) { st.t += dt;
      if (st.phase === 'ready') { st.ready -= dt; if (st.ready <= 0) st.phase = 'play'; }
      else if (st.phase === 'play' && !st.run.done) st.zone = step(st.run, dt);
      for (const f of st.fx) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 420 * dt; f.life -= dt; } st.fx = st.fx.filter((f) => f.life > 0); }
    draw(c, cv._s, st, job, ctx); requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
  return st;
}
function burst(st, x, y, col, n) { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; st.fx.push({ x, y, vx: Math.cos(a) * (60 + (i % 3) * 30), vy: Math.sin(a) * 80 - 140, life: 0.6, col }); } }

// ---------- drawing ----------
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const B = (c, x, y, w, h, col, ink = INK) => { R(c, x - 2, y - 2, w + 4, h + 4, ink); R(c, x, y, w, h, col); };
const T = (c, s, x, y, size, col = '#fff', al = 'center') => { c.font = `${size}px Silkscreen, monospace`; c.textAlign = al; c.textBaseline = 'alphabetic'; c.fillStyle = INK; c.fillText(s, x + 1, y + 1); c.fillStyle = col; c.fillText(s, x, y); };
const lerp = (a, b, k) => a + (b - a) * k;
const heatCol = (k) => { const s = [[90, 30, 30], [200, 60, 30], [255, 140, 40], [255, 220, 90], [255, 250, 230]]; const f = Math.max(0, Math.min(0.999, k)) * (s.length - 1), i = Math.floor(f), u = f - i; const a = s[i], b = s[i + 1]; return `rgb(${Math.round(lerp(a[0], b[0], u))},${Math.round(lerp(a[1], b[1], u))},${Math.round(lerp(a[2], b[2], u))})`; };
const SKY = { sawmill: ['#8fc8e8', '#5a9a4a'], mine: ['#3a3048', '#4a4040'], forge: ['#4a2a2a', '#5a4a40'], bakery: ['#e8c8a0', '#b08060'], fishery: ['#9ad0f0', '#3a7ab8'], farm: ['#a8daf0', '#7ab048'], quarry: ['#c8d0d8', '#a89a88'], docks: ['#9ad0f0', '#5a6a7a'], police: ['#b8c8e0', '#8a8a90'] };

function draw(c, s, st, job, ctx) {
  c.setTransform(s, 0, 0, s, 0, 0); c.imageSmoothingEnabled = false;
  R(c, 0, 0, ZW, ZH, '#1b1f33');
  // header
  const X = ensureTownx(ctx.state), J = X.jobs[st.job], rk = rankOf(J.hits);
  R(c, 0, 0, ZW, 44, '#121a36'); R(c, 0, 44, ZW, 2, '#d4a640');
  T(c, job.name.toUpperCase(), 10, 20, 12, '#ffe7a3', 'left'); T(c, `${job.place.toUpperCase()} · ${rk.title.toUpperCase()} · BEST ${J.best}`, 10, 36, 7, '#9fd8ff', 'left');
  B(c, 320, 8, 30, 28, '#2a3050', '#d4a640'); T(c, 'X', 335, 28, 12, '#fff');
  // scene
  c.save(); c.beginPath(); c.rect(8, 52, ZW - 16, 250); c.clip();
  const [sky, ground] = SKY[st.job] || SKY.sawmill; R(c, 8, 52, ZW - 16, 250, sky); R(c, 8, 232, ZW - 16, 70, ground);
  SCENE[st.job]?.(c, st, ctx);
  for (const f of st.fx) R(c, f.x - 2, f.y - 2, 4, 4, f.col);
  c.restore(); c.strokeStyle = '#d4a640'; c.lineWidth = 2; c.strokeRect(8, 52, ZW - 16, 250);
  if (st.phase === 'results') return drawResults(c, st, job, ctx);
  // info row
  const r = st.run; const mk = r.mult;
  T(c, `x${mk}`, 18, 322, mk >= 16 ? 22 : 18, mk >= 32 ? '#ff7aa8' : mk >= 8 ? '#ffe07a' : '#fff', 'left');
  T(c, `SHIFT ${r.score}`, ZW / 2, 320, 10, '#7af07a'); T(c, `${Math.min(r.taps + 1, ZJ.SHIFT_ZONES)}/${ZJ.SHIFT_ZONES}`, ZW - 18, 320, 10, '#fff', 'right');
  // bar
  const z = st.zone; B(c, BAR.x, BAR.y, BAR.w, BAR.h, '#2a3050');
  const zx = BAR.x + (z.c - z.w / 2) * BAR.w, zw = z.w * BAR.w; R(c, zx, BAR.y, zw, BAR.h, '#e83a3a'); R(c, zx + zw * (0.5 - ZJ.PERFECT_FRAC / 2), BAR.y, Math.max(2, zw * ZJ.PERFECT_FRAC), BAR.h, '#ff8a6a'); R(c, zx, BAR.y, zw, 3, '#ff9a8a');
  const mx = BAR.x + MARKER * BAR.w; R(c, mx - 1, BAR.y - 6, 3, BAR.h + 12, '#fff'); c.fillStyle = '#ffd84a'; c.beginPath(); c.moveTo(mx - 7, BAR.y - 14); c.lineTo(mx + 8, BAR.y - 14); c.lineTo(mx + 0.5, BAR.y - 5); c.fill(); c.beginPath(); c.moveTo(mx - 7, BAR.y + BAR.h + 14); c.lineTo(mx + 8, BAR.y + BAR.h + 14); c.lineTo(mx + 0.5, BAR.y + BAR.h + 5); c.fill();
  if (st.phase === 'ready') T(c, 'GET READY…', ZW / 2, 400, 11, '#ffe7a3'); else if (st.msg && st.anim && st.t - st.anim.t0 < 1.2) T(c, st.msg, ZW / 2, 400, 10, st.msgCol); else T(c, job.how.toUpperCase(), ZW / 2, 400, 7, '#c8d0e8');
  const pressed = st.anim && st.t - st.anim.t0 < 0.12; B(c, BTN.x, BTN.y + (pressed ? 3 : 0), BTN.w, BTN.h - (pressed ? 3 : 0), pressed ? '#b8862a' : '#d4a640'); R(c, BTN.x, BTN.y + (pressed ? 3 : 0), BTN.w, 5, '#f2cc68');
  T(c, job.verb, ZW / 2, BTN.y + 46, 20, INK === '#fff' ? INK : '#fff8e0');
  const left = capLeft(ctx.state, ctx.day ? ctx.day() : '');
  T(c, `TODAY ${ZJ.DAILY_CAP - left}/${ZJ.DAILY_CAP} JOB BONES · IN-GAME ONLY`, ZW / 2, 512, 7, left > 0 ? '#9fd8ff' : '#ff9a8a');
  T(c, 'TAP · SPACE · E', ZW / 2, 528, 7, '#6a7090');
}
function drawResults(c, st, job, ctx) {
  const r = st.res; B(c, 16, 312, ZW - 32, 210, '#121a36', '#d4a640');
  T(c, r.rankUp ? `RANK UP: ${r.rank.toUpperCase()}!` : 'SHIFT DONE', ZW / 2, 338, 13, r.rankUp ? '#ff7aa8' : '#ffe7a3');
  T(c, `+${r.paid} BONES`, ZW / 2, 366, 18, '#7af07a');
  T(c, r.cappedBy === 'daily' ? `DAILY JOB CAP REACHED (${r.dailyCap})` : r.cappedBy === 'shift' ? `SHIFT CAP ${ZJ.SHIFT_CAP} (SCORED ${r.score})` : `SCORED ${r.score}`, ZW / 2, 384, 8, r.cappedBy ? '#ff9a8a' : '#c8d0e8');
  T(c, `HITS ${r.hits}/${r.taps} · PERFECT ${r.perfects} · TOP x${r.bestMult}`, ZW / 2, 402, 8, '#fff');
  T(c, `${r.pb ? 'NEW PERSONAL BEST! ' : 'BEST '}${r.best} · ${r.rank.toUpperCase()}${r.next ? ` (${r.lifetimeHits}/${r.next.at} HITS)` : ''}`, ZW / 2, 420, 8, r.pb ? '#ffe07a' : '#9fd8ff');
  T(c, r.made ? `+${r.made} ${job.good.toUpperCase()} TO THE TOWN` : job.good === 'calm' ? `${r.hits} PICKPOCKETS CAUGHT` : 'NOTHING MADE THIS TIME', ZW / 2, 438, 8, '#ffd8a0');
  if (r.bumped) T(c, `OUCH: ${(st.res && ctx.state.townx?.injury?.what || 'a bump').toUpperCase()} · VISIT THE HOSPITAL`, ZW / 2, 448, 6, '#ff9a8a');
  B(c, 30, 452, 140, 54, '#2a3050', '#d4a640'); T(c, 'AGAIN', 100, 486, 12, '#fff');
  B(c, 190, 452, 140, 54, '#d4a640'); T(c, 'DONE', 260, 486, 12, '#fff8e0');
}

// player: the real player look (coat + outfit), facing the station, squash/lean on each tap
function me(c, st, ctx, x = 120, y = 268, k = 2.3) {
  const a = st.anim, dt = a ? st.t - a.t0 : 9, sw = dt < 0.25 ? Math.sin((dt / 0.25) * Math.PI) : 0;
  const pose = { dx: sw * 4, dy: 0, rot: sw * 0.08, sx: 1 + sw * 0.06, sy: 1 - sw * 0.06 };
  const L = ctx.look || {}; drawShiba(c, x, y - 12 * k / 1.5, { coat: L.coat || 'golden', outfit: L.outfit || {}, art: L.art, face: 'right', scale: k, shadow: true, pose });
  return { sw, dt, a };
}
// tool swing angle: raised -> strike -> back
const swing = (st) => { const a = st.anim, dt = a ? st.t - a.t0 : 9; if (dt < 0.12) return lerp(-1.3, 0.5, dt / 0.12); if (dt < 0.4) return lerp(0.5, -1.3, (dt - 0.12) / 0.28); return -1.3 + Math.sin(st.t * 3) * 0.05; };
function tool(c, x, y, ang, len, headFn) { c.save(); c.translate(x, y); c.rotate(ang); R(c, -2, -len, 5, len, INK); R(c, -1, -len, 3, len, '#9a6a3c'); headFn(c, len); c.restore(); }
const axeHead = (c, len) => { R(c, 0, -len - 2, 18, 14, INK); R(c, 1, -len - 1, 16, 12, '#c9cede'); R(c, 13, -len - 1, 4, 12, '#ffffff'); };
const pickHead = (c, len) => { R(c, -18, -len - 3, 38, 8, INK); R(c, -17, -len - 2, 36, 6, '#8a909c'); R(c, 16, -len, 6, 4, '#c9cede'); R(c, -22, -len, 6, 4, '#c9cede'); };
const hammerHead = (c, len) => { R(c, -10, -len - 4, 22, 14, INK); R(c, -9, -len - 3, 20, 12, '#6a7080'); };
const sinceHit = (st) => (st.anim ? st.t - st.anim.t0 : 9);
const hitNow = (st) => st.anim?.kind === 'hit' && sinceHit(st) < 0.6;
const missNow = (st) => st.anim?.kind === 'miss' && sinceHit(st) < 0.6;
const near = (st) => 1 - Math.min(1, Math.abs(st.zone.c - MARKER) / 0.5); // 1 when the zone sits on the marker (scene hints)
const stackOf = (c, n, x, y, draw1, per = 6) => { for (let i = 0; i < Math.min(n, 18); i++) draw1(c, x + (i % 3) * 4, y - Math.floor(i / 3) * per - (i % 3) * 2); };
const plank = (c, x, y) => { R(c, x - 1, y - 1, 36, 8, INK); R(c, x, y, 34, 6, '#c89060'); R(c, x, y, 34, 1, '#e8b080'); };

const SCENE = {
  sawmill(c, st, ctx) {
    R(c, 8, 120, ZW - 16, 8, '#4a7a3a'); for (let i = 0; i < 6; i++) { R(c, 20 + i * 60, 80, 22, 44, '#3a6a2a'); R(c, 28 + i * 60, 118, 6, 14, '#6a4a2a'); }
    B(c, 196, 246, 72, 22, '#8a5a2a'); R(c, 196, 246, 72, 6, '#c8905a'); for (let i = 0; i < 3; i++) R(c, 210 + i * 18, 250, 10, 2, '#a8703a');
    const dt = sinceHit(st), hit = st.anim?.kind === 'hit';
    if (hit && dt < 0.45) { const k = dt / 0.45; // the log splits: two halves fly apart, then the next log drops on
      c.save(); c.translate(218 - k * 50, 214 - Math.sin(k * Math.PI) * 30); c.rotate(-k * 1.6); B(c, -12, -22, 16, 44, '#a86a3a'); R(c, -12, -22, 4, 44, '#e8c08a'); c.restore();
      c.save(); c.translate(246 + k * 50, 214 - Math.sin(k * Math.PI) * 30); c.rotate(k * 1.6); B(c, -4, -22, 16, 44, '#a86a3a'); R(c, 8, -22, 4, 44, '#e8c08a'); c.restore();
    } else { const drop = hit && dt < 0.7 ? (1 - (dt - 0.45) / 0.25) * 60 : 0;
      B(c, 214, 200 - Math.max(0, drop), 36, 46, '#8a5a2a'); R(c, 214, 200 - Math.max(0, drop), 36, 8, '#e8c08a'); R(c, 226, 202 - Math.max(0, drop), 12, 4, '#c8905a');
      if (st.anim?.kind === 'miss' && dt < 0.4) { R(c, 252, 236, 6, 4, '#e8c08a'); R(c, 260, 230, 4, 3, '#e8c08a'); } }
    stackOf(c, st.run.hits, 286, 286, (cc, x, y) => plank(cc, x, y), 7);
    me(c, st, ctx, 150, 270); tool(c, 178, 214, swing(st) + 0.2, 52, axeHead);
  },
  mine(c, st, ctx) {
    R(c, 8, 52, ZW - 16, 250, '#2a2434'); B(c, 190, 92, 166, 196, '#5a5260'); for (let i = 0; i < 14; i++) R(c, 196 + (i * 37) % 150, 100 + (i * 53) % 180, 14, 8, '#4a4250');
    const g = near(st), vein = (x, y) => { R(c, x, y, 10, 6, INK); R(c, x + 1, y + 1, 8, 4, g > 0.85 ? '#ffe680' : '#c8a040'); };
    vein(212, 160); vein(226, 170); vein(240, 166); vein(254, 178); if (g > 0.85) { R(c, 230, 150, 3, 3, '#fff'); R(c, 252, 168, 3, 3, '#fff'); }
    if (hitNow(st)) { const k = sinceHit(st) / 0.6; for (let i = 0; i < 3; i++) B(c, 230 + i * 10 + k * 40, 172 - Math.sin(k * Math.PI) * 50 + k * 60, 8, 6, '#c8a040'); }
    if (missNow(st)) { const k = sinceHit(st); R(c, 214 - k * 30, 176, 4, 4, '#fff8c0'); R(c, 216, 168 - k * 30, 3, 3, '#ffd080'); }
    B(c, 288, 252, 60, 30, '#6a5a4a'); R(c, 292, 280, 10, 10, INK); R(c, 334, 280, 10, 10, INK); stackOf(c, st.run.hits, 294, 252, (cc, x, y) => { R(cc, x, y - 4, 10, 6, INK); R(cc, x + 1, y - 3, 8, 4, '#c8a040'); }, 4);
    me(c, st, ctx, 140, 272); tool(c, 168, 216, swing(st) + 0.3, 50, pickHead);
  },
  forge(c, st, ctx) {
    R(c, 8, 52, ZW - 16, 180, '#3a2626'); B(c, 280, 90, 70, 80, '#6a3a2a'); R(c, 292, 110, 46, 40, `rgb(255,${120 + Math.round(Math.sin(st.t * 8) * 40)},40)`);
    B(c, 196, 226, 70, 18, '#4a4a58'); R(c, 214, 244, 34, 24, '#3a3a48'); B(c, 206, 268, 50, 8, '#3a3a48');
    const heat = st.zone.c; const hit = hitNow(st), k = sinceHit(st) / 0.6;
    if (hit) { R(c, 300, 236, 44, 40, '#4a6a9a'); R(c, 302, 238, 40, 10, '#8ac8ff'); B(c, 316, 214 + k * 20, 8, 30, '#8a909c'); for (let i = 0; i < 5; i++) R(c, 304 + i * 9, 220 - k * 70 - (i % 2) * 12, 10 - k * 6, 8, `rgba(240,240,255,${1 - k})`); }
    else { B(c, 200, 216, 60, 8, heatCol(heat)); R(c, 252, 216, 8, 8, heatCol(Math.min(1, heat + 0.1))); B(c, 300, 236, 44, 40, '#4a6a9a'); R(c, 302, 238, 40, 10, '#8ac8ff'); }
    if (missNow(st)) for (let i = 0; i < 6; i++) R(c, 230 + Math.cos(i) * k * 50, 214 - Math.abs(Math.sin(i * 2)) * k * 60, 3, 3, '#ffb040');
    T(c, heat > 0.62 ? 'TOO HOT!' : heat < 0.38 ? 'HEATING…' : 'NOW!', 230, 206, 8, heat > 0.62 ? '#ff6a4a' : heat < 0.38 ? '#ffd8a0' : '#fff');
    stackOf(c, st.run.hits, 24, 288, (cc, x, y) => { B(cc, x, y - 4, 22, 4, '#c9cede'); R(cc, x + 16, y - 6, 8, 8, '#6a4a2a'); }, 6);
    me(c, st, ctx, 150, 272); tool(c, 176, 222, swing(st) * 0.4 + 0.9, 46, (cc, len) => { R(cc, -4, -len - 6, 4, 10, INK); R(cc, 3, -len - 6, 4, 10, INK); });
  },
  bakery(c, st, ctx) {
    R(c, 8, 52, ZW - 16, 180, '#d8b890'); for (let y = 60; y < 230; y += 16) for (let x = 8 + ((y / 16) % 2) * 12; x < ZW; x += 24) R(c, x, y, 22, 14, '#c8a070');
    B(c, 196, 96, 150, 150, '#a85a3a'); for (let y = 100; y < 244; y += 12) for (let x = 198 + ((y / 12) % 2) * 10; x < 344; x += 20) R(c, x, y, 18, 10, '#b86a4a');
    B(c, 222, 150, 98, 60, '#1a1010'); R(c, 226, 196, 90, 10, `rgb(255,${130 + Math.round(Math.sin(st.t * 6) * 30)},40)`);
    const brown = st.zone.c, hit = hitNow(st), k = sinceHit(st) / 0.6;
    const loaf = (x, y, col) => { B(c, x, y, 40, 18, col); R(c, x + 6, y + 4, 6, 2, '#fff2d0'); R(c, x + 18, y + 4, 6, 2, '#fff2d0'); R(c, x + 30, y + 4, 6, 2, '#fff2d0'); };
    if (hit) loaf(250 - k * 90, 180 - Math.sin(k * Math.PI) * 30, '#c8803a'); else loaf(250, 180, brown < 0.38 ? '#f0d8a0' : brown > 0.62 ? '#4a2a1a' : '#c8803a');
    if (missNow(st)) for (let i = 0; i < 4; i++) R(c, 254 + i * 8, 170 - k * 60 - i * 6, 10, 8, `rgba(60,60,60,${1 - k})`);
    T(c, brown > 0.62 ? 'BURNING!' : brown < 0.38 ? 'BAKING…' : 'GOLDEN!', 270, 144, 8, brown > 0.62 ? '#ff6a4a' : '#fff');
    B(c, 20, 270, 80, 8, '#8a909c'); stackOf(c, st.run.hits, 26, 266, (cc, x, y) => { R(cc, x, y - 6, 16, 8, INK); R(cc, x + 1, y - 5, 14, 6, '#c8803a'); }, 5);
    me(c, st, ctx, 150, 272); tool(c, 172, 228, swing(st) * 0.3 + 1.35, 70, (cc, len) => { R(cc, -10, -len - 14, 22, 16, INK); R(cc, -9, -len - 13, 20, 14, '#c89060'); });
  },
  fishery(c, st, ctx) {
    R(c, 8, 200, ZW - 16, 102, '#3a7ab8'); for (let i = 0; i < 9; i++) R(c, 16 + ((i * 41 + st.t * 20) % 330), 214 + (i * 17) % 80, 14, 2, '#8ac8ff');
    B(c, 8, 236, 150, 14, '#8a5a2a'); R(c, 8, 236, 150, 3, '#c8905a'); for (let x = 20; x < 150; x += 30) R(c, x, 250, 6, 52, '#6a4a2a');
    const g = near(st), hit = hitNow(st), k = sinceHit(st) / 0.6, bob = g > 0.85 ? 8 : Math.sin(st.t * 3) * 2;
    c.strokeStyle = '#fff'; c.lineWidth = 1; c.beginPath(); c.moveTo(186, 160); c.lineTo(hit ? 200 : 268, hit ? 170 : 214 + bob); c.stroke();
    if (!hit) { B(c, 264, 210 + bob, 8, 8, '#e83a3a'); R(c, 264, 210 + bob, 8, 3, '#fff'); if (g > 0.85) { R(c, 252, 222, 30, 2, '#cfe8ff'); T(c, 'BITE!', 268, 196, 8, '#fff'); } }
    else { c.save(); c.translate(lerp(268, 60, k), 214 - Math.sin(k * Math.PI) * 110); c.rotate(k * 6); B(c, -10, -5, 20, 10, '#9ac0d8'); R(c, 8, -6, 6, 12, '#7aa0b8'); R(c, -6, -3, 2, 2, INK); c.restore(); }
    if (missNow(st)) { R(c, 256, 206 - k * 30, 4, 4, '#cfe8ff'); R(c, 276, 204 - k * 26, 4, 4, '#cfe8ff'); }
    B(c, 24, 214, 46, 20, '#a8703a'); stackOf(c, st.run.hits, 28, 214, (cc, x, y) => { R(cc, x, y - 5, 14, 6, INK); R(cc, x + 1, y - 4, 12, 4, '#9ac0d8'); }, 4);
    me(c, st, ctx, 130, 240); tool(c, 150, 196, -0.6 + (hit ? -0.4 : 0) + Math.sin(st.t * 2) * 0.03, 60, () => {});
  },
  farm(c, st, ctx) {
    for (let r = 0; r < 3; r++) R(c, 8, 244 + r * 18, ZW - 16, 8, '#6a4a2a');
    const ripe = 1 - Math.abs(st.zone.c - MARKER) * 2, hit = hitNow(st), k = sinceHit(st) / 0.6;
    const plant = (x, y, rp, wilt) => { const h = 20 + rp * 26, col = wilt ? '#8a7a4a' : rp > 0.75 ? '#e8c040' : rp > 0.4 ? '#a8c840' : '#5aa840'; R(c, x, y - h, 4, h, '#4a8a2a'); B(c, x - 6, y - h - 12, 16, 14, col); if (rp > 0.75 && !wilt) R(c, x - 2, y - h - 10, 3, 3, '#fff8a0'); };
    for (let i = 0; i < 5; i++) if (i !== 2) plant(196 + i * 34, 250, 0.3 + (i % 2) * 0.2, false);
    if (!hit) plant(264, 250, Math.max(0, ripe), missNow(st)); else { B(c, lerp(264, 60, k), 210 - Math.sin(k * Math.PI) * 60, 16, 22, '#e8c040'); }
    T(c, ripe > 0.8 ? 'PEAK!' : ripe > 0.5 ? 'ALMOST…' : 'GROWING', 266, 180, 8, ripe > 0.8 ? '#fff8a0' : '#fff');
    B(c, 30, 250, 50, 26, '#c8a060'); stackOf(c, st.run.hits, 34, 248, (cc, x, y) => { R(cc, x, y - 10, 10, 12, INK); R(cc, x + 1, y - 9, 8, 10, '#e8c040'); }, 5);
    me(c, st, ctx, 160, 272); tool(c, 186, 222, swing(st) * 0.6 + 0.6, 30, (cc, len) => { R(cc, 0, -len - 4, 16, 4, INK); R(cc, 12, -len, 4, 8, INK); R(cc, 1, -len - 3, 14, 2, '#c9cede'); });
  },
  quarry(c, st, ctx) {
    R(c, 8, 52, ZW - 16, 120, '#b8a890'); for (let i = 0; i < 8; i++) R(c, 8 + i * 44, 140 - (i % 3) * 20, 44, 40 + (i % 3) * 20, '#a89878');
    const hit = hitNow(st), k = sinceHit(st) / 0.6, g = near(st);
    if (hit) { B(c, 206 - k * 40, 214, 28, 52, '#9aa0a8'); B(c, 238 + k * 40, 214, 28, 52, '#9aa0a8'); }
    else { B(c, 210, 212, 56, 54, '#9aa0a8'); R(c, 210, 212, 56, 6, '#c8ccd4'); R(c, 237, 214, 2, 50, g > 0.85 ? '#ffe680' : '#6a7078'); }
    if (missNow(st)) for (let i = 0; i < 4; i++) R(c, 236 + i * 6, 208 - k * 40 + i * 4, 3, 3, '#fff8c0');
    stackOf(c, st.run.hits, 290, 284, (cc, x, y) => { R(cc, x, y - 8, 16, 10, INK); R(cc, x + 1, y - 7, 14, 8, '#9aa0a8'); }, 9);
    me(c, st, ctx, 160, 272); tool(c, 186, 220, swing(st) + 0.4, 40, hammerHead);
  },
  docks(c, st, ctx) {
    R(c, 8, 220, ZW - 16, 82, '#3a6a9a'); B(c, 8, 250, ZW - 16, 16, '#8a5a2a');
    R(c, 300, 60, 10, 190, INK); R(c, 302, 60, 6, 190, '#d8a040'); R(c, 80, 62, 230, 8, INK); R(c, 80, 64, 228, 4, '#d8a040');
    const hit = hitNow(st), k = sinceHit(st) / 0.6, x = 60 + st.zone.c * 240, sx = 60 + MARKER * 240;
    stackOf(c, st.run.hits, sx - 12, 246, (cc, xx, yy) => { R(cc, xx - 2, yy - 14, 24, 16, INK); R(cc, xx - 1, yy - 13, 22, 14, '#c8905a'); R(cc, xx + 9, yy - 13, 2, 14, '#8a5a2a'); }, 14);
    R(c, sx - 1, 236, 3, 12, '#ffd84a');
    const cy = hit ? lerp(150, 230, Math.min(1, k * 2)) : 150; const cx = hit ? st.anim.x ?? x : x; c.strokeStyle = '#2a2a2a'; c.beginPath(); c.moveTo(cx, 68); c.lineTo(cx, cy - 18); c.stroke();
    B(c, cx - 16, cy - 18, 32, 26, '#c8905a'); R(c, cx - 2, cy - 18, 4, 26, '#8a5a2a');
    me(c, st, ctx, 110, 262); tool(c, 140, 230, -0.3 + (hit ? 0.5 : 0), 30, (cc, len) => { R(cc, -4, -len - 8, 10, 10, INK); R(cc, -3, -len - 7, 8, 8, '#e83a3a'); });
  },
  police(c, st, ctx) {
    R(c, 8, 52, ZW - 16, 180, '#c8d0e0'); for (let i = 0; i < 3; i++) { const x = 30 + i * 110; B(c, x, 140, 90, 70, ['#e8a040', '#7ab0e0', '#e87a9a'][i]); for (let s = 0; s < 6; s++) R(c, x + s * 15, 132, 15, 10, s % 2 ? '#fff' : ['#c8602a', '#3a7ab8', '#c84a6a'][i]); B(c, x + 10, 186, 70, 24, '#a8703a'); }
    const hit = hitNow(st), k = sinceHit(st) / 0.6, x = 60 + st.zone.c * 240;
    const px = hit ? 60 + (st.anim.at ?? 0.5) * 240 : x;
    drawShiba(c, px, 262, { coat: 'dark', outfit: {}, face: hit ? 'left' : 'right', scale: 1.6, shadow: true, moving: !hit, phase: st.t * 12 });
    R(c, px - 10, 222, 20, 5, INK); // cartoon bandit mask
    if (hit) { T(c, 'SORRY!', px, 206, 8, '#fff'); B(c, px - 26, 236, 12, 8, '#c8803a'); } else B(c, px + 10, 236, 10, 8, '#c8803a');
    if (missNow(st)) T(c, 'HEHE!', px, 206, 8, '#ffd8a0');
    R(c, 176, 254, 1, 1, '#fff');
    me(c, st, ctx, 70, 272, 2.1); if (sinceHit(st) < 0.5) T(c, 'HALT!', 96, 172, 10, '#ffe07a');
    T(c, `CAUGHT ${st.run.hits}`, 300, 76, 8, '#2a3050');
  },
};

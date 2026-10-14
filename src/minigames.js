// Job mini-games (30-60s skill games). Virtual field W x H; input: { x, y, down, tap, left, right, up, dn, act }.
// Every game: update(dt, inp), draw(c), auto() -> the input a perfect player would give (used by tests & attract demos).
export const W = 360, H = 480;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
function txt(c, s, x, y, size = 10, col = '#fff', align = 'center') { c.font = `${size}px Silkscreen, monospace`; c.textAlign = align; c.fillStyle = '#141a2e'; c.fillText(s, x + 1, y + 1); c.fillStyle = col; c.fillText(s, x, y); }
function base(kind, dur, rng, sfx) { return { kind, dur, t: 0, score: 0, combo: 0, maxCombo: 0, hits: 0, misses: 0, done: false, fx: [], shake: 0, rng, sfx: sfx || {},
  hit(pts, x, y) { this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo); const m = 1 + Math.min(4, Math.floor(this.combo / 5)) * 0.5, g = Math.round(pts * m); this.score += g; this.hits++; this.pop(`+${g}${m > 1 ? ' x' + m : ''}`, x, y, '#ffe66a'); for (let i = 0; i < 8; i++) this.fx.push({ k: 'p', x, y, vx: (rng() - 0.5) * 160, vy: -rng() * 140, l: 0.5, col: ['#ffd23a', '#ff7aa8', '#5fd3ff'][i % 3] }); this.sfx.hit?.(this.combo); },
  miss(x, y) { this.combo = 0; this.misses++; this.shake = 0.25; this.pop('miss', x, y, '#ff6a6a'); this.sfx.miss?.(); },
  pop(s, x, y, col) { this.fx.push({ k: 't', s, x, y, vy: -40, l: 0.8, col }); },
  tick(dt) { this.t += dt; if (this.t >= this.dur) this.done = true; this.shake = Math.max(0, this.shake - dt); for (const f of this.fx) { f.l -= dt; f.x += (f.vx || 0) * dt; f.y += (f.vy || 0) * dt; if (f.k === 'p') f.vy += 300 * dt; } this.fx = this.fx.filter((f) => f.l > 0); },
  drawFx(c) { for (const f of this.fx) { c.globalAlpha = Math.min(1, f.l * 2); if (f.k === 'p') R(c, f.x, f.y, 3, 3, f.col); else txt(c, f.s, f.x, f.y, 11, f.col); } c.globalAlpha = 1; } }; }
const GAMES = {
  // cafe: an order card shows a treat; tap the matching button of 4
  match(g) { const ITEMS = [['latte', '#c08a5a'], ['cake', '#ff9ac0'], ['bun', '#e8b04a'], ['tea', '#7ad06a'], ['berry', '#b07aff'], ['bone', '#f4ead2']];
    const next = () => { g.want = Math.floor(g.rng() * ITEMS.length); g.opts = [g.want]; while (g.opts.length < 4) { const k = Math.floor(g.rng() * ITEMS.length); if (!g.opts.includes(k)) g.opts.push(k); } g.opts.sort(() => g.rng() - 0.5); g.pat = Math.max(1.4, 3.2 - g.t / 20); g.left = g.pat; };
    next(); const btn = (i) => ({ x: 20 + (i % 2) * 170, y: 280 + Math.floor(i / 2) * 90, w: 150, h: 76 });
    g.update = (dt, inp) => { g.cd = Math.max(0, (g.cd || 0) - dt); if (g.cd > 0) inp = { ...inp, tap: false }; g.left -= dt; if (g.left <= 0) { g.miss(W / 2, 140); next(); } if (inp.tap) for (let i = 0; i < 4; i++) { const b = btn(i); if (inp.x > b.x && inp.x < b.x + b.w && inp.y > b.y && inp.y < b.y + b.h) { if (g.opts[i] === g.want) { g.hit(10 + Math.round(g.left * 3), b.x + b.w / 2, b.y); } else g.miss(b.x + b.w / 2, b.y); g.cd = 0.35; next(); } } };
    g.auto = () => { const i = g.opts.indexOf(g.want), b = btn(i); return { tap: true, x: b.x + 10, y: b.y + 10 }; };
    g.draw = (c) => { R(c, 0, 0, W, H, '#5a3a2a'); R(c, 0, 220, W, 6, '#3a2418'); R(c, 90, 50, 180, 150, '#fff6e0'); txt(c, 'ORDER UP!', W / 2, 74, 11, '#8a5a2a'); const [n, col] = ITEMS[g.want]; R(c, 150, 92, 60, 60, col); txt(c, n.toUpperCase(), W / 2, 176, 12, '#3a2418'); R(c, 100, 188, 160 * (g.left / g.pat), 6, g.left < 1 ? '#ff6a6a' : '#5df07a');
      for (let i = 0; i < 4; i++) { const b = btn(i), [nm, cl] = ITEMS[g.opts[i]]; R(c, b.x, b.y, b.w, b.h, '#141a2e'); R(c, b.x + 3, b.y + 3, b.w - 6, b.h - 6, '#2a3358'); R(c, b.x + 12, b.y + 18, 40, 40, cl); txt(c, nm.toUpperCase(), b.x + 100, b.y + 44, 10, '#fff'); } }; },
  // sweeper/pond: steer the broom (pointer or arrows) to piles before the wind scatters them
  collect(g) { g.px = W / 2; g.py = 380; g.piles = []; g.wind = 0; const add = () => g.piles.push({ x: 30 + g.rng() * (W - 60), y: 80 + g.rng() * 320, life: 4 + g.rng() * 2 });
    for (let i = 0; i < 3; i++) add();
    g.update = (dt, inp) => { if (inp.down) { g.px += clamp(inp.x - g.px, -260 * dt, 260 * dt); g.py += clamp(inp.y - g.py, -260 * dt, 260 * dt); } g.px += ((inp.right ? 1 : 0) - (inp.left ? 1 : 0)) * 220 * dt; g.py += ((inp.dn ? 1 : 0) - (inp.up ? 1 : 0)) * 220 * dt; g.px = clamp(g.px, 10, W - 10); g.py = clamp(g.py, 60, H - 10);
      g.wind = Math.sin(g.t * 0.7) * 40; for (const p of g.piles) { p.life -= dt; p.x += g.wind * dt * 0.5; if (Math.hypot(p.x - g.px, p.y - g.py) < 26) { p.got = true; g.hit(10, p.x, p.y); } else if (p.life <= 0) { p.got = true; g.miss(p.x, p.y); } }
      g.piles = g.piles.filter((p) => !p.got); while (g.piles.length < 3 + Math.floor(g.t / 15)) add(); };
    g.auto = () => { const p = [...g.piles].sort((a, b) => a.life - b.life)[0]; return p ? { down: true, x: p.x, y: p.y } : {}; };
    g.draw = (c) => { R(c, 0, 0, W, H, g.kind2 === 'pond' ? '#2a6aa8' : '#bdb6a8'); for (let i = 0; i < 12; i++) R(c, ((i * 53 + g.t * g.wind) % W + W) % W, (i * 41) % H, 18, 1, 'rgba(255,255,255,.4)');
      for (const p of g.piles) { for (let k = 0; k < 5; k++) R(c, p.x - 10 + k * 4, p.y - 4 + (k % 2) * 3, 6, 5, p.life < 1.2 ? '#ff6a3a' : g.kind2 === 'pond' ? '#6cbf4a' : '#c08a4a'); }
      R(c, g.px - 3, g.py - 30, 6, 30, '#8a5a2a'); R(c, g.px - 14, g.py, 28, 8, '#e8c95a'); txt(c, `WIND ${g.wind > 0 ? '>>' : '<<'}`, W - 50, 50, 9, '#fff'); }; },
  // window/painter: drag across smudges to wipe them
  swipe(g) { g.sm = []; const add = () => g.sm.push({ x: 40 + g.rng() * (W - 80), y: 90 + g.rng() * 330, hp: 1, r: 20 + g.rng() * 10, life: 5 });
    for (let i = 0; i < 4; i++) add(); g.lx = null;
    g.update = (dt, inp) => { for (const s of g.sm) { s.life -= dt; if (inp.down && Math.hypot(inp.x - s.x, inp.y - s.y) < s.r + 8) { s.hp -= dt * 3.5; if (s.hp <= 0) { s.gone = true; g.hit(10, s.x, s.y); g.sfx.swipe?.(); } } if (!s.gone && s.life <= 0) { s.gone = true; g.miss(s.x, s.y); } } g.sm = g.sm.filter((s) => !s.gone); while (g.sm.length < 4 + Math.floor(g.t / 12)) add(); };
    g.auto = () => { const s = [...g.sm].sort((a, b) => a.life - b.life)[0]; return s ? { down: true, x: s.x + Math.sin(g.t * 30) * 6, y: s.y } : {}; };
    g.draw = (c) => { const paint = g.kind2 === 'painter'; R(c, 0, 0, W, H, paint ? '#e8dcc4' : '#9fd8f5'); if (!paint) for (let x = 0; x < W; x += 120) R(c, x, 0, 6, H, '#fff'); for (const s of g.sm) { c.globalAlpha = 0.35 + 0.6 * s.hp; R(c, s.x - s.r, s.y - s.r / 2, s.r * 2, s.r, paint ? '#8a7a6a' : '#7a6a5a'); R(c, s.x - s.r / 2, s.y - s.r, s.r, s.r * 2, paint ? '#8a7a6a' : '#7a6a5a'); c.globalAlpha = 1; if (s.life < 1.5) R(c, s.x - 2, s.y - s.r - 8, 4, 4, '#ff6a6a'); } }; },
  // road crew: a marker sweeps; tap when it is inside the pothole zone
  timing(g) { g.m = 0; g.v = 1; g.zone = [0.4, 0.6]; const nz = () => { const w = Math.max(0.08, 0.22 - g.t / 300); const a = 0.1 + g.rng() * (0.8 - w); g.zone = [a, a + w]; };
    nz(); g.update = (dt, inp) => { const sp = 0.8 + g.t / 30; g.m += g.v * sp * dt; if (g.m > 1) { g.m = 1; g.v = -1; } if (g.m < 0) { g.m = 0; g.v = 1; } if (inp.tap || inp.act) { if (g.m >= g.zone[0] && g.m <= g.zone[1]) { const ctr = Math.abs(g.m - (g.zone[0] + g.zone[1]) / 2) / ((g.zone[1] - g.zone[0]) / 2); g.hit(ctr < 0.3 ? 15 : 10, 30 + g.m * 300, 240); } else g.miss(30 + g.m * 300, 240); nz(); } };
    g.auto = () => (g.m >= g.zone[0] + 0.01 && g.m <= g.zone[1] - 0.01 ? { tap: true } : {});
    g.draw = (c) => { R(c, 0, 0, W, H, '#3a3d44'); for (let y = 40; y < H; y += 60) R(c, W / 2 - 3, y, 6, 30, '#f2e6a0'); R(c, 30, 230, 300, 20, '#22252c'); R(c, 30 + g.zone[0] * 300, 226, (g.zone[1] - g.zone[0]) * 300, 28, '#ff8a2a'); R(c, 30 + g.m * 300 - 3, 216, 6, 48, '#fff'); txt(c, 'TAP TO FILL!', W / 2, 320, 12, '#ffe66a');
      for (let i = 0; i < Math.min(12, g.hits); i++) R(c, 20 + i * 28, 400, 22, 10, '#5a5d64'); }; },
  // gardener: snip the green leaves sticking out of the shape; avoid the pink keep-dots
  trace(g) { g.dots = []; const add = () => { const a = g.rng() * Math.PI * 2, out = g.rng() < 0.72; const r = out ? 105 + g.rng() * 30 : 60 + g.rng() * 25; g.dots.push({ x: W / 2 + Math.cos(a) * r, y: 250 + Math.sin(a) * r * 1.1, out, life: 5 }); };
    for (let i = 0; i < 6; i++) add();
    g.update = (dt, inp) => { for (const d of g.dots) { d.life -= dt; if (inp.tap && Math.hypot(inp.x - d.x, inp.y - d.y) < 16) { d.gone = true; if (d.out) { g.hit(10, d.x, d.y); g.sfx.snip?.(); } else g.miss(d.x, d.y); } else if (d.life <= 0) { d.gone = true; if (d.out) g.miss(d.x, d.y); } } g.dots = g.dots.filter((d) => !d.gone); while (g.dots.length < 6) add(); };
    g.auto = () => { const d = g.dots.find((x) => x.out); return d ? { tap: true, x: d.x, y: d.y } : {}; };
    g.draw = (c) => { R(c, 0, 0, W, H, '#8fd16a'); c.fillStyle = '#2f7a3a'; c.beginPath(); c.ellipse(W / 2, 250, 100, 110, 0, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.setLineDash([6, 6]); c.beginPath(); c.ellipse(W / 2, 250, 100, 110, 0, 0, 7); c.stroke(); c.setLineDash([]);
      for (const d of g.dots) R(c, d.x - 7, d.y - 7, 14, 14, d.out ? '#5ab05a' : '#ff8fb6'); R(c, W / 2 - 10, 360, 20, 60, '#8a5a32'); txt(c, 'SNIP THE STRAYS', W / 2, 455, 10, '#141a2e'); }; },
  // electrician: tap a left socket then the right socket of the same colour
  wire(g) { const COLS = ['#ff5a5a', '#5fd3ff', '#ffd23a', '#9cf06b', '#c99bff']; const deal = () => { g.L = [0, 1, 2, 3].map((i) => i); g.Rr = [...g.L].sort(() => g.rng() - 0.5); g.cols = [...COLS].sort(() => g.rng() - 0.5).slice(0, 4); g.done4 = []; g.sel = null; };
    deal(); const ly = (i) => 120 + i * 80;
    g.update = (dt, inp) => { g.cd = Math.max(0, (g.cd || 0) - dt); if (!inp.tap || g.cd > 0) return; g.cd = 0.18; const side = inp.x < W / 2 ? 'L' : 'R', i = Math.floor((inp.y - 90) / 80); if (i < 0 || i > 3) return;
      if (side === 'L') { if (!g.done4.includes(i)) g.sel = i; } else if (g.sel !== null) { if (g.Rr[i] === g.sel) { g.done4.push(g.sel); g.hit(12, W / 2, ly(i)); g.sfx.zap?.(); if (g.done4.length === 4) { g.score += 10; g.pop('+10 LIT!', W / 2, 80, '#ffe66a'); deal(); } } else g.miss(W / 2, ly(i)); g.sel = null; } };
    g.auto = () => { if (g.sel === null) { const i = g.L.find((k) => !g.done4.includes(k)); return { tap: true, x: 40, y: ly(i) + 5 }; } return { tap: true, x: W - 40, y: ly(g.Rr.indexOf(g.sel)) + 5 }; };
    g.draw = (c) => { R(c, 0, 0, W, H, '#1b1f33'); for (let i = 0; i < 4; i++) { R(c, 20, ly(i) - 15, 40, 30, g.cols[g.L[i]]); R(c, W - 60, ly(i) - 15, 40, 30, g.cols[g.Rr[i]]); if (g.sel === i) R(c, 14, ly(i) - 20, 52, 4, '#fff'); }
      c.lineWidth = 6; for (const k of g.done4) { c.strokeStyle = g.cols[k]; c.beginPath(); c.moveTo(60, ly(k)); c.lineTo(W - 60, ly(g.Rr.indexOf(k))); c.stroke(); } R(c, W / 2 - 20, 30, 40, 30, g.done4.length === 4 ? '#ffe66a' : '#4a4f5e'); }; },
  // bin run: move the truck hopper to catch falling bags; avoid the cats
  catch(g) { g.px = W / 2; g.items = []; g.spawn = 0;
    g.update = (dt, inp) => { if (inp.down) g.px += clamp(inp.x - g.px, -320 * dt, 320 * dt); g.px += ((inp.right ? 1 : 0) - (inp.left ? 1 : 0)) * 280 * dt; g.px = clamp(g.px, 30, W - 30); g.spawn -= dt;
      if (g.spawn <= 0) { g.spawn = Math.max(0.35, 0.9 - g.t / 80); g.items.push({ x: 20 + g.rng() * (W - 40), y: 40, v: 120 + g.t * 3, cat: g.rng() < 0.18 }); }
      for (const it of g.items) { it.y += it.v * dt; if (it.y > 420 && it.y < 440 && Math.abs(it.x - g.px) < 36 && !it.gone) { it.gone = true; if (it.cat) g.miss(it.x, 420); else g.hit(10, it.x, 420); } if (it.y > H && !it.gone) { it.gone = true; if (!it.cat) g.miss(it.x, H - 20); } } g.items = g.items.filter((i) => !i.gone); };
    g.auto = () => { const b = g.items.filter((i) => !i.cat && i.y < 430).sort((a, b2) => b2.y - a.y)[0]; return b ? { down: true, x: b.x, y: 430 } : {}; };
    g.draw = (c) => { R(c, 0, 0, W, H, '#cfe6f0'); R(c, 0, 450, W, 30, '#5a5d64'); for (const it of g.items) { if (it.cat) { R(c, it.x - 10, it.y - 8, 20, 16, '#f2a64a'); R(c, it.x - 10, it.y - 12, 5, 5, '#f2a64a'); R(c, it.x + 5, it.y - 12, 5, 5, '#f2a64a'); } else { R(c, it.x - 10, it.y - 10, 20, 20, '#2a2a33'); R(c, it.x - 3, it.y - 14, 6, 5, '#2a2a33'); } }
      R(c, g.px - 36, 424, 72, 24, '#2f8a4a'); R(c, g.px - 36, 424, 72, 4, '#5ac07a'); txt(c, 'BAGS IN, CATS OUT', W / 2, 30, 9, '#141a2e'); }; },
  // billboard: a poster panel slides across; tap to stop it in line with the frame
  slide(g) { g.n = 0; g.x = 0; g.v = 1; const reset = () => { g.x = g.v > 0 ? -140 : W; }; reset();
    g.update = (dt, inp) => { const sp = 160 + g.t * 4; g.x += g.v * sp * dt; if (g.x > W + 10 || g.x < -150) { g.miss(W / 2, 200); g.v = -g.v; reset(); } if (inp.tap || inp.act) { const err = Math.abs(g.x - (W / 2 - 70)); if (err < 30) { g.hit(err < 8 ? 18 : err < 18 ? 13 : 9, W / 2, 160); g.n++; } else g.miss(W / 2, 200); g.v = -g.v; reset(); } };
    g.auto = () => (Math.abs(g.x - (W / 2 - 70)) < 5 ? { tap: true } : {});
    g.draw = (c) => { R(c, 0, 0, W, H, '#8ab0d8'); R(c, W / 2 - 76, 150, 152, 112, '#141a2e'); R(c, W / 2 - 72, 154, 144, 104, '#2a3358'); R(c, W / 2 - 40, 262, 6, 160, '#4a4f5e'); R(c, W / 2 + 34, 262, 6, 160, '#4a4f5e');
      R(c, g.x, 156, 140, 100, ['#ffcf3a', '#ff7aa8', '#5fd3ff', '#9cf06b'][g.n % 4]); txt(c, '$KIBBLE', g.x + 70, 212, 12, '#141a2e'); txt(c, 'TAP WHEN ALIGNED', W / 2, 120, 10, '#fff'); }; },
  // delivery: three lanes; swipe/arrow to change lane; grab parcels, dodge puddles + cones
  dodge(g) { g.lane = 1; g.obs = []; g.sp = 0; const lx = (l) => 60 + l * 120;
    g.update = (dt, inp) => { if (inp.tap) g.lane = inp.x < W / 3 ? 0 : inp.x > (2 * W) / 3 ? 2 : 1; if (inp.leftP) g.lane = Math.max(0, g.lane - 1); if (inp.rightP) g.lane = Math.min(2, g.lane + 1);
      g.sp -= dt; if (g.sp <= 0) { g.sp = Math.max(0.45, 1 - g.t / 60); const l = Math.floor(g.rng() * 3); g.obs.push({ l, y: -20, parcel: g.rng() < 0.55 }); }
      for (const o of g.obs) { o.y += (200 + g.t * 4) * dt; if (!o.gone && o.y > 380 && o.y < 410 && o.l === g.lane) { o.gone = true; if (o.parcel) g.hit(10, lx(o.l), 380); else g.miss(lx(o.l), 380); } if (o.y > H) o.gone = true; } g.obs = g.obs.filter((o) => !o.gone); };
    g.auto = () => { const near = g.obs.filter((o) => o.y < 400 && o.y > 200).sort((a, b) => b.y - a.y); const p = near.find((o) => o.parcel), bad = new Set(near.filter((o) => !o.parcel && o.y > 300).map((o) => o.l)); let l = p && !bad.has(p.l) ? p.l : [0, 1, 2].find((k) => !bad.has(k)) ?? g.lane; return { tap: true, x: lx(l), y: 300 }; };
    g.draw = (c) => { R(c, 0, 0, W, H, '#4a5060'); for (let l = 1; l < 3; l++) for (let y = (g.t * 200) % 60 - 60; y < H; y += 60) R(c, l * 120 - 2, y, 4, 30, '#f2e6a0');
      for (const o of g.obs) { if (o.parcel) { R(c, lx(o.l) - 14, o.y - 14, 28, 28, '#c08a4a'); R(c, lx(o.l) - 2, o.y - 14, 4, 28, '#8a5a2a'); } else { R(c, lx(o.l) - 12, o.y - 16, 24, 28, '#ff6a1e'); R(c, lx(o.l) - 9, o.y - 6, 18, 4, '#fff'); } }
      R(c, lx(g.lane) - 16, 380, 32, 36, '#e8b04a'); R(c, lx(g.lane) - 10, 372, 20, 12, '#e8b04a'); R(c, lx(g.lane) - 16, 404, 32, 6, '#3a5aa8'); }; },
};
export function createGame(jobId, job, rng, sfx) { const g = base(job.game, job.dur, rng, sfx); g.kind2 = jobId; GAMES[job.game](g); const up = g.update; g.update = (dt, inp) => { if (g.done) return; g.tick(dt); if (!g.done) up(dt, inp); }; const dr = g.draw;
  g.draw = (c) => { c.save(); if (g.shake) c.translate((rng() - 0.5) * 8, (rng() - 0.5) * 8); dr(c); g.drawFx(c); c.restore(); R(c, 0, 0, W, 34, 'rgba(20,26,46,.85)'); txt(c, job.name.toUpperCase(), 8, 22, 10, '#ffe7a3', 'left'); txt(c, `${Math.ceil(g.dur - g.t)}s`, W / 2 + 40, 22, 11, g.dur - g.t < 6 ? '#ff6a6a' : '#fff');
    txt(c, `${g.score}`, W - 8, 22, 12, '#5df07a', 'right'); if (g.combo >= 3) txt(c, `COMBO ${g.combo}!`, W / 2, 56, 12 + Math.min(6, g.combo / 3), '#ff7aa8'); }; return g; }
export const GAME_KINDS = Object.keys(GAMES);

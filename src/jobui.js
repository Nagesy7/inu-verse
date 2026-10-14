// Full-screen overlay that runs a job mini-game, then shows the results (pay, combo, first-shift bonus, rank, personal best).
import { JOBS, ensureJobs, finishJob, rankOf, FIRST_SHIFT_BONUS } from './jobs.js';
import { createGame, W, H } from './minigames.js';
let active = null;
export const jobActive = () => !!active;
export function startJob(jobId, ctx) { if (active) return; const job = JOBS[jobId]; ensureJobs(ctx.state);
  const ov = document.createElement('div'); ov.id = 'mg'; ov.style.cssText = 'position:fixed;inset:0;z-index:60;background:rgba(10,12,24,.92);display:flex;align-items:center;justify-content:center;touch-action:none;user-select:none';
  const cv = document.createElement('canvas'); ov.appendChild(cv); document.body.appendChild(ov); const c = cv.getContext('2d');
  const fit = () => { const k = Math.min(innerWidth / W, innerHeight / H), s = k >= 1 ? Math.floor(k) : k, d = devicePixelRatio || 1; cv.style.width = W * s + 'px'; cv.style.height = H * s + 'px'; cv.width = Math.round(W * s * d); cv.height = Math.round(H * s * d); cv._s = s * d; cv._css = s; c.imageSmoothingEnabled = false; };
  fit(); addEventListener('resize', fit);
  const inp = { x: W / 2, y: H / 2, down: false, tap: false, left: false, right: false, up: false, dn: false, act: false, leftP: false, rightP: false };
  const pos = (e) => { const r = cv.getBoundingClientRect(); inp.x = ((e.clientX - r.left) / r.width) * W; inp.y = ((e.clientY - r.top) / r.height) * H; };
  cv.onpointerdown = (e) => { e.preventDefault(); cv.setPointerCapture(e.pointerId); pos(e); inp.down = true; inp.tap = true; if (state.phase === 'results') onResultsTap(); };
  cv.onpointermove = (e) => { pos(e); }; cv.onpointerup = () => { inp.down = false; };
  const KEY = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', arrowup: 'up', w: 'up', arrowdown: 'dn', s: 'dn', ' ': 'act', e: 'act', enter: 'act' };
  const kd = (e) => { const k = KEY[e.key.toLowerCase()]; e.stopImmediatePropagation(); e.preventDefault(); if (e.key === 'Escape') return end(true); if (!k || e.repeat) return; inp[k] = true; if (k === 'left') inp.leftP = true; if (k === 'right') inp.rightP = true; if (k === 'act' && state.phase === 'results') onResultsTap(); };
  const ku = (e) => { const k = KEY[e.key.toLowerCase()]; e.stopImmediatePropagation(); if (k) inp[k] = false; };
  addEventListener('keydown', kd, true); addEventListener('keyup', ku, true);
  const sfx = { hit: (n) => ctx.blip(520 + Math.min(12, n) * 45), miss: () => ctx.blip(160), swipe: () => ctx.rustle?.(), snip: () => ctx.blip(900), zap: () => ctx.blip(1200) };
  const state = { phase: 'intro', t: 0, game: null, res: null, auto: false };
  const onResultsTap = () => { const r = cv.getBoundingClientRect(), y = inp.y; if (y > 380 && y < 430) { if (inp.x < W / 2) { state.phase = 'intro'; state.t = 0; } else end(false); } };
  const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  const T = (s, x, y, size, col = '#fff', al = 'center') => { c.font = `${size}px Silkscreen, monospace`; c.textAlign = al; c.fillStyle = '#141a2e'; c.fillText(s, x + 1, y + 1); c.fillStyle = col; c.fillText(s, x, y); };
  let last = performance.now();
  function frame(now) { if (!active) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; c.setTransform(cv._s, 0, 0, cv._s, 0, 0); state.t += dt;
    if (state.phase === 'intro') { const J = ensureJobs(ctx.state)[jobId], rk = rankOf(J.xp); R(0, 0, W, H, '#1b1f33'); T(job.name.toUpperCase(), W / 2, 90, 16, '#ffe7a3'); T(HOW[job.game], W / 2, 130, 8, '#fff');
      T(`RANK: ${rk.title.toUpperCase()}${rk.next ? `  (${J.xp}/${rk.next.at} XP)` : ''}`, W / 2, 180, 9, '#5fd3ff'); T(`PERSONAL BEST: ${J.best}`, W / 2, 200, 9, '#ff7aa8'); T(J.lastDay !== ctx.day() ? `FIRST SHIFT TODAY: +${FIRST_SHIFT_BONUS} BONUS` : 'STREAKS OF 5+ BOOST POINTS', W / 2, 220, 8, '#5df07a');
      const n = 3 - Math.floor(state.t); T(n > 0 ? String(n) : 'GO!', W / 2, 320, 40, '#ffe66a'); if (state.t >= 3.6) { state.phase = 'play'; state.game = createGame(jobId, job, ctx.rng, sfx); ctx.blip(880); } }
    else if (state.phase === 'play') { const g = state.game; g.update(dt, state.auto ? { ...inp, ...g.auto() } : inp); g.draw(c); if (g.done) { state.res = finishJob(ctx.state, jobId, g, ctx.day()); state.phase = 'results'; state.t = 0; ctx.done(state.res, g); if (state.res.pb || state.res.rankUp) ctx.fanfare?.(); } }
    else { const g = state.game, r = state.res; R(0, 0, W, H, '#1b1f33'); T('SHIFT COMPLETE!', W / 2, 70, 14, '#ffe7a3'); T(`SCORE ${g.score}`, W / 2, 110, 14, '#fff'); if (r.pb) T('★ NEW PERSONAL BEST ★', W / 2, 136, 10, '#ff7aa8');
      T(`HITS ${g.hits}  MISSES ${g.misses}  BEST COMBO ${g.maxCombo}`, W / 2, 166, 8, '#ccd'); T(`PERFORMANCE  +${r.perf}`, W / 2, 200, 10, '#fff'); T(`COMBO BONUS  +${r.combo}`, W / 2, 222, 10, '#fff'); T(`FIRST SHIFT  +${r.first}`, W / 2, 244, 10, '#fff'); T(`PAID ${r.total} BONES`, W / 2, 280, 14, '#5df07a');
      T(`${r.rankUp ? 'RANK UP! ' : 'RANK: '}${r.rank.toUpperCase()}`, W / 2, 316, 11, r.rankUp ? '#ffe66a' : '#5fd3ff'); if (r.next) T(`${r.xp}/${r.next.at} XP TO ${r.next.title.toUpperCase()}`, W / 2, 338, 8, '#aab');
      R(30, 380, 140, 46, '#2f8a4a'); T('PLAY AGAIN', 100, 408, 10); R(190, 380, 140, 46, '#5a3a8a'); T('DONE', 260, 408, 10); }
    inp.tap = false; inp.leftP = false; inp.rightP = false; if (inp.act && state.phase !== 'results') inp.act = false; requestAnimationFrame(frame); }
  function end() { removeEventListener('keydown', kd, true); removeEventListener('keyup', ku, true); removeEventListener('resize', fit); ov.remove(); active = null; ctx.closed?.(); }
  active = { state, end, inp }; globalThis.__mg = active; requestAnimationFrame(frame); }
const HOW = { match: 'TAP THE TREAT THAT MATCHES THE ORDER', collect: 'DRAG / ARROWS: REACH PILES BEFORE THE WIND', swipe: 'DRAG OVER SMUDGES TO WIPE THEM', timing: 'TAP / SPACE WHEN THE MARKER IS IN THE HOLE', trace: 'TAP THE STRAY LEAVES, NOT THE PINK BUDS', wire: 'TAP A LEFT PLUG, THEN ITS MATCHING SOCKET', catch: 'DRAG / ARROWS: CATCH BAGS, NOT CATS', slide: 'TAP / SPACE WHEN THE POSTER LINES UP', dodge: 'TAP A LANE / ARROWS: GRAB PARCELS, DODGE CONES' };

import { closeGaps } from './seams.js';
// Facial animation for layered Shiba avatars (player + NPCs): randomized blinks, eyes following movement, idle expressions
// (happy, curious, sleepy yawn), talking/emote mouth + tongue, ear twitches, reaction faces and a back-view tail wag.
// Faces are found once per coat/view/frame on the bare base art; each expression is a cached repaint of the dressed canvas,
// so outfits/hats layer exactly as before and per-frame cost is a Map lookup.
const hz = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0) / 4294967296; };
const h2 = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };

// ---- detection -------------------------------------------------------------------------------------------------
export function findFace(d, W, H, view) {
  if (view === 'back') return tailOnly(d, W, H);
  const lim = Math.floor(H * 0.45), lum = []; for (let i = 0; i < W * lim; i += 3) if (d[i * 4 + 3] > 200) lum.push(d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]); lum.sort((a, b) => a - b);
  const thr = Math.min(170, (lum[lum.length >> 1] || 300) * 0.62), dark = (i) => d[i + 3] > 200 && d[i] + d[i + 1] + d[i + 2] < thr, seen = new Uint8Array(W * H), comps = [];
  for (let y = 0; y < lim; y++) for (let x = 0; x < W; x++) { const p = y * W + x; if (seen[p] || !dark(p * 4)) continue;
    const st = [p], px = []; seen[p] = 1; while (st.length) { const q = st.pop(), qx = q % W, qy = (q / W) | 0; px.push(q);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = qx + dx, ny = qy + dy, n = ny * W + nx; if (nx < 0 || ny < 0 || nx >= W || ny >= lim || seen[n] || !dark(n * 4)) continue; seen[n] = 1; st.push(n); } }
    let x0 = W, y0 = H, x1 = 0, y1 = 0; for (const q of px) { const qx = q % W, qy = (q / W) | 0; x0 = Math.min(x0, qx); x1 = Math.max(x1, qx); y0 = Math.min(y0, qy); y1 = Math.max(y1, qy); }
    comps.push({ px, x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, n: px.length }); }
  const compact = comps.filter((c) => c.w >= 4 && c.h >= 4 && c.w <= 18 && c.h <= 18 && c.n >= 10 && c.n >= c.w * c.h * 0.45);
  let top = 0; while (top < H && !rowAny(d, W, top)) top++;
  const ears = earRows(d, W, H, top);
  if (view === 'front') { let best = null;
    for (let i = 0; i < compact.length; i++) for (let j = i + 1; j < compact.length; j++) { const a = compact[i], b = compact[j]; if (Math.abs(a.cy - b.cy) > 3 || Math.abs(a.cx - b.cx) < 10 || Math.max(a.n, b.n) > Math.min(a.n, b.n) * 1.8) continue;
      if (!best || a.cy < best[0].cy) best = a.cx < b.cx ? [a, b] : [b, a]; }
    if (!best) return null; const mid = (best[0].cx + best[1].cx) / 2;
    const nose = comps.filter((c) => c.y0 > best[0].cy && c.n >= 20 && Math.abs(c.cx - mid) < 10).sort((a, b) => b.n - a.n)[0]; let mouth = null;
    if (nose) { const set = new Set(nose.px), wid = (y) => { let n = 0; for (let x = nose.x0; x <= nose.x1; x++) if (set.has(y * W + x)) n++; return n; }; let my = nose.y0 + 6, mw = 99;
      for (let y = nose.y0 + 4; y < nose.y1; y++) { const w = wid(y); if (w < mw) { mw = w; my = y; } } mouth = { x: Math.round(mid), y: my + 2, w: Math.max(8, Math.round(nose.w * 0.42)) }; }
    return { view, eyes: best, nose, mouth, ears, top, mid }; }
  const nose = comps.filter((c) => c.n >= 30).sort((a, b) => b.x1 - a.x1)[0]; if (!nose) return null; const eye = compact.filter((c) => c !== nose && c.x1 < nose.x0 - 6).sort((a, b) => b.n - a.n)[0];
  if (!eye) return null; const outline = nose.n > 300; return { view, eyes: [eye], nose: { ...nose, y1: nose.y0 + 9 }, mouth: outline ? null : { x: nose.x0 - 6, y: nose.y0 + 14, w: 12 }, ears: { y0: top, y1: top + Math.round((eye.y0 - top) * 0.4) }, top, mid: -1 }; }
const rowAny = (d, W, y) => { for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 40) return true; return false; };
function earRows(d, W, H, top) { // rows above the skull where the ears stand clear of each other
  const op = (x, y) => d[(y * W + x) * 4 + 3] > 40; let y = top; for (; y < H * 0.3; y++) { let runs = 0, inr = false; for (let x = 0; x < W; x++) { const o = op(x, y); if (o && !inr) runs++; inr = o; } if (runs < 2) break; }
  return { y0: top, y1: Math.max(top, y - 1) }; }
function tailOnly(d, W, H) { // back view: the curled tail sits in the middle of the back
  return { view: 'back', tail: { x0: Math.round(W * 0.38), x1: Math.round(W * 0.62), y0: Math.round(H * 0.5), y1: Math.round(H * 0.66) } }; }

// ---- expression state ------------------------------------------------------------------------------------------
const MEM = new Map(), TALK = new Map(), REACT = new Map();
export const faceTalk = (id, secs = 2.4) => { if (id) TALK.set(id, performance.now() / 1000 + secs); };
export const faceReact = (id, kind = 'joy', secs = 1.6) => { if (id) REACT.set(id, { kind, until: performance.now() / 1000 + secs }); };
export const reducedMotion = () => !!(globalThis.__reducedMotion ?? globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
// Pure: what the face should do at time t. m = { since (idle start), dir, talkUntil, react, emote, wag }
export function faceAt(id, t, { moving = false, face = 'down', emote = null, wag = 0, idle = 0, talking = false, react = null } = {}) {
  const s = { eye: 'open', lx: 0, ly: 0, mouth: 'none', ear: 0, tail: 0 }, r = hz(id), RM = reducedMotion();
  // blink: each id gets its own randomized 2.2-5.4s rhythm, sometimes a double blink
  const per = 2.2 + r * 3.2, cyc = Math.floor((t + r * 9) / per), ph = (t + r * 9) - cyc * per, at = per * (0.35 + h2(cyc, r) * 0.5);
  if (!RM && (Math.abs(ph - at) < 0.07 || (h2(cyc, r + 1) < 0.25 && Math.abs(ph - at - 0.24) < 0.06))) s.eye = 'blink';
  if (moving) { if (face === 'down') s.ly = 1; } // eyes lead the walk direction (side view already looks ahead)
  else if (idle > 1.5 && !RM) { const g = Math.floor((t + r * 5) / 2.6); const k = h2(g, r + 2); s.lx = k < 0.3 ? -1 : k > 0.7 ? 1 : 0; if (face !== 'down') s.lx = k < 0.4 ? -1 : 0; }
  if (!moving && idle > 4 && !RM) { const g = Math.floor((t + r * 13) / 7), k = h2(g, r + 3), ph2 = (t + r * 13) - g * 7; // idle mood cycle
    if (k < 0.34) { if (ph2 < 2.4) { s.eye = 'happy'; s.mouth = 'tongue'; s.tail = 1; } }
    else if (k < 0.62) { if (ph2 < 2.2) { s.lx = face === 'down' ? (ph2 < 1.1 ? -1 : 1) : -1; s.ly = -1; s.ear = ph2 % 0.9 < 0.3 ? 1 : 0; } } // curious: glance about, ears perk
    else if (k < 0.85 && idle > 9) { if (ph2 < 3) { s.eye = s.eye === 'blink' ? 'blink' : 'half'; if (ph2 > 0.8 && ph2 < 2.2) { s.mouth = 'yawn'; s.eye = 'blink'; } } } }
  if (!RM && idle > 0.5 && (h2(Math.floor((t + r * 3) / 3.3), r + 4) < 0.3) && ((t + r * 3) % 3.3) < 0.22) s.ear = 1; // random ear twitch
  if (talking) s.mouth = RM ? 'open' : (Math.floor(t * 9 + r * 3) % 3 === 0 ? 'none' : (Math.floor(t * 9) % 2 ? 'open' : 'tongue'));
  if (emote === 'heart' || emote === 'wave' || emote === 'bork' || emote === 'happy') { s.eye = emote === 'bork' ? 'open' : 'happy'; s.mouth = emote === 'bork' ? 'open' : 'tongue'; s.tail = 1; }
  if (emote === 'sit' && !moving && idle > 6) s.eye = s.eye === 'open' ? 'half' : s.eye;
  if (react) { if (react === 'joy') { s.eye = 'happy'; s.mouth = 'tongue'; s.tail = 1; s.ear = 1; } else if (react === 'wow') { s.eye = 'open'; s.ly = -1; s.mouth = 'open'; s.ear = 1; } else if (react === 'curious') { s.lx = -1; s.ly = -1; s.ear = 1; } }
  if (wag > 0) s.tail = 1;
  if (s.tail && !RM) s.tail = Math.sin(t * 18) > 0 ? 1 : -1; else if (RM) s.tail = 0;
  if (RM) s.ear = 0;
  return s; }
// Per-character live state (idle timers, talking, reactions) -> faceAt
export function faceFor(id, opts) { const t = performance.now() / 1000; let m = MEM.get(id); if (!m) { m = { still: t }; MEM.set(id, m); if (MEM.size > 300) MEM.delete(MEM.keys().next().value); }
  if (opts.moving) m.still = t; const rc = REACT.get(id);
  return faceAt(id, t, { ...opts, idle: t - m.still, talking: (TALK.get(id) || 0) > t, react: rc && rc.until > t ? rc.kind : null }); }
export const faceKey = (s) => `${s.eye}${s.lx}${s.ly}${s.mouth}${s.ear}${s.tail}`;
export const NEUTRAL = 'open00none00';

// ---- painting ----------------------------------------------------------------------------------------------------
const INK = [20, 16, 24], TONGUE = [232, 112, 136], TONGUE_D = [190, 74, 100], MOUTH = [70, 28, 34];
export function paintFace(d, W, H, F, s, { eyes = true, ears = true } = {}) {
  const set = (x, y, c, a = 255) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; if (d[i + 3] < 200) return; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = a; };
  const get = (x, y) => { const i = (y * W + x) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; };
  if (F.view === 'back') { if (s.tail) shearBox(d, W, H, F.tail, s.tail); return; }
  if (eyes && (s.eye !== 'open' || s.lx || s.ly)) for (const e of F.eyes) { const inEye = new Set(e.px); const orig = [];
    for (let y = e.y0; y <= e.y1; y++) { let l = W, r = -1; for (let x = e.x0; x <= e.x1; x++) if (inEye.has(y * W + x)) { l = Math.min(l, x); r = Math.max(r, x); } for (let x = l; x <= r; x++) orig.push([x, y, get(x, y)]); } // iris + glint
    for (let y = e.y0 - 1; y <= e.y1 + 1; y++) { if (y < 0 || y >= H) continue; const xl = Math.max(0, e.x0 - 2), xr = Math.min(W - 1, e.x1 + 2), cl = get(xl, y), cr = get(xr, y);
      for (let x = xl + 1; x < xr; x++) { const k = (x - xl) / (xr - xl); set(x, y, [0, 1, 2].map((j) => Math.round(cl[j] + (cr[j] - cl[j]) * k))); } }
    const midY = e.y0 + e.h * 0.62;
    if (s.eye === 'open') for (const [x, y, c] of orig) set(x + s.lx, y + s.ly, c);
    else if (s.eye === 'half') { for (const [x, y, c] of orig) if (y >= e.y0 + e.h * 0.45) set(x, y, c); for (let x = e.x0; x <= e.x1; x++) set(x, Math.round(e.y0 + e.h * 0.42), INK); }
    else for (let x = e.x0; x <= e.x1; x++) { const u = (x - e.x0) / Math.max(1, e.w - 1) * 2 - 1, bend = Math.round((1 - u * u) * Math.max(1, e.h * 0.22)); // blink: lower lid curve; happy: ^ arch
      const y = s.eye === 'happy' ? Math.round(midY - bend) : Math.round(midY + bend - 1); set(x, y, INK); set(x, y + 1, INK); } }
  if (F.mouth && s.mouth !== 'none') { const m = F.mouth, big = s.mouth === 'yawn', w = Math.round(big ? m.w * 1.1 : m.w * 0.75), h = big ? 7 : 4;
    if (F.view === 'front') { for (let yy = 0; yy < h; yy++) { const hw = Math.round((w / 2) * Math.sqrt(1 - ((yy - h / 2 + 0.5) / (h / 2 + 0.3)) ** 2)); for (let x = -hw; x <= hw; x++) set(m.x + x, m.y + yy, Math.abs(x) === hw || yy === h - 1 ? INK : MOUTH); }
      if (s.mouth === 'tongue' || big) for (let yy = Math.floor(h / 2); yy < h + (big ? 0 : 3); yy++) { const hw = Math.max(1, Math.round(w * 0.28) - Math.max(0, yy - h)); for (let x = -hw; x <= hw; x++) set(m.x + x, m.y + yy, Math.abs(x) === hw ? TONGUE_D : TONGUE); } }
    else { const x0 = Math.round(m.x - w / 2), x1 = Math.round(F.nose.x0 + 1); for (let x = x0; x <= x1; x++) { const k = (x - x0) / Math.max(1, x1 - x0), oh = Math.round(h * (0.3 + 0.7 * k)); for (let yy = 0; yy <= oh; yy++) set(x, m.y + yy, yy === oh || yy === 0 ? INK : MOUTH); }
      if (s.mouth === 'tongue' || big) for (let yy = 1; yy < h + (big ? 1 : 4); yy++) for (let x = x0 + 2; x < x0 + 6; x++) set(x, m.y + yy, x === x0 + 2 || x === x0 + 5 ? TONGUE_D : TONGUE); } }
  if (ears && s.ear && F.ears && F.ears.y1 > F.ears.y0 + 2) { shearRows(d, W, F.ears.y0, F.ears.y1, F.view === 'front' ? F.mid : -1); closeGaps(d, W, H); } }
function furNear(d, W, H, e) { for (const [x, y] of [[Math.round(e.cx), e.y0 - 3], [Math.round(e.cx), e.y0 - 2], [e.x0 - 3, Math.round(e.cy)], [e.x1 + 3, Math.round(e.cy)], [Math.round(e.cx), e.y1 + 3]]) { if (x < 0 || y < 0 || x >= W || y >= H) continue; const i = (y * W + x) * 4; if (d[i + 3] > 200 && d[i] + d[i + 1] + d[i + 2] > 200) return [d[i], d[i + 1], d[i + 2]]; } return [200, 140, 80]; }
// ear twitch: shear the free-standing ear tips 1-2px outward (no vertical moves, so nothing tears open)
function shearRows(d, W, y0, y1, mid) { for (let y = y0; y <= y1; y++) { const sh = (y1 - y) / Math.max(1, y1 - y0) > 0.45 ? 1 : 0; if (!sh) continue; const row = d.slice(y * W * 4, (y + 1) * W * 4), out = new Uint8ClampedArray(row.length);
  for (let x = 0; x < W; x++) { const left = mid < 0 || x < mid, nx = mid < 0 ? x - sh : left ? x - sh : x + sh; if (nx < 0 || nx >= W) continue; const s = x * 4; if (row[s + 3] === 0) continue; out.set(row.subarray(s, s + 4), nx * 4); }
  d.set(out, y * W * 4); } }
// tail wag (back view): shear the tail box sideways about its base; vacated pixels take the neighbouring colour
function shearBox(d, W, H, b, dir) { for (let y = b.y0; y <= b.y1; y++) { const sh = Math.round(((b.y1 - y) / (b.y1 - b.y0)) * 2) * dir; if (!sh) continue; const row = d.slice((y * W + b.x0) * 4, (y * W + b.x1 + 1) * 4), n = b.x1 - b.x0 + 1;
  for (let i = 0; i < n; i++) { const src = Math.min(n - 1, Math.max(0, i - sh)), o = (y * W + b.x0 + i) * 4; const ls = row[src * 4] + row[src * 4 + 1] + row[src * 4 + 2], ld = d[o] + d[o + 1] + d[o + 2]; if (d[o + 3] < 200 || row[src * 4 + 3] < 200 || ls < 240 || ld < 240) continue; d.set(row.subarray(src * 4, src * 4 + 4), o); } } }

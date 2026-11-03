// Alive phase 3: wandering Inu townsfolk. Ten original background Shibas who live on the shared sky clock (src/weather.js:
// one in-game day = 24 real minutes, so one sky hour = 60 real seconds). Each has a coat + accessory and a fixed daily
// routine: stroll a street loop, sit on a park/plaza bench, gather round the plaza fountain, chat outside the cafe, and walk
// home at night (then they are indoors and not drawn). Where a folk is at any moment is a PURE function of the folk-day
// second (like the ambient.js dog walkers), so every client sees the same pup on the same bench. Only a small local layer
// sits on top: turn to face / wave / greet when the player comes near (a short pause that catches up afterwards), a tap /
// interact line, and capped speech bubbles through chat.js say().
// NPC only: never in MPL / presence, never in the activity feed, never counted as a visitor, no rewards, no economy.
// Perf: routes are path-found once (sidewalk-preferring) and cached; per frame there is one binary search per active folk, no allocation
// (pooled actor objects + a reused output array), only near-camera folk are emitted/react, bubbles capped, fewer folk in
// reduced-effects mode.
import { TILE, MAP, MAP_W, MAP_H, T as TT, isSolid } from './world.js';
import { DOOR_TILES } from './townai.js';

export const FOLK_DAY = 1440;            // folk-day seconds (= 24 sky hours x 60 real seconds)
export const SPEED = 40;                 // walking speed, world px per second
export const FOLK_CAPS = { all: 10, low: 6, bubbles: 2, react: 56, unreact: 110, talk: 36, view: 90, greetCool: 40 };

// bench seats (render.js draws the benches at [bx*TILE, by*TILE+4], 56x28 world px); two seats per bench, feet in front
const BENCHES = [[17, 6], [11, 8], [39, 34.2], [50, 34.2], [22, 52], [41, 52], [28, 47]];
const seatY = (by) => Math.min(by * TILE + 27, (Math.floor(by) + 1) * TILE - 3); // stay on the bench's own tile row (pond benches sit at y 34.2)
export const SEATS = BENCHES.flatMap(([bx, by]) => [[bx * TILE + 15, seatY(by)], [bx * TILE + 41, seatY(by)]]);
// street / plaza / park stroll loops (tile corners, walked in order and back to the start)
export const LOOPS = {
  mainW: [[1, 19], [29, 19], [29, 23], [2, 23]],
  mainE: [[35, 19], [62, 19], [62, 23], [35, 23]],
  pond:  [[35, 34], [61, 34], [57, 39], [36, 39]],
  plaza: [[8, 46], [56, 46], [56, 58], [8, 58]],
  park:  [[2, 9], [28, 9], [27, 2], [15, 1]],
  south: [[2, 86], [61, 86], [61, 95], [2, 95]],
};
// standing spots: a ring round the plaza fountain (30,63) + chat spots by the cafe / launch hall / chapel (none on or
// right in front of a door; tests check)
export const SPOTS = {
  g0: [[29, 63], 'right'], g1: [[34, 63], 'left'], g2: [[29, 65], 'right'], g3: [[34, 65], 'left'], g4: [[31, 62], 'down'], g5: [[32, 66], 'up'],
  cafeA: [[8, 19], 'right'], cafeB: [[9, 19], 'left'], launchA: [[36, 19], 'right'], launchB: [[37, 19], 'left'],
  chapelA: [[21, 86], 'right'], chapelB: [[22, 86], 'left'], marketA: [[19, 100], 'right'],
};
// homes: the walk ends at the front step and the folk goes indoors (hidden) until morning
const HOMES = [[4, 40], [11, 40], [18, 40], [25, 40], [12, 102], [26, 102]];

// [hour, stop]: stroll <loop> | sit <seat#> | stand <spot> | home
export const FOLK = [
  { name: 'Sora',  coat: 'golden', outfit: { hat: 'cap_red', neck: 'ob_scout_bandana' }, home: 0, day: [[6, 'stroll mainW'], [9, 'sit 0'], [12, 'stand g0'], [15, 'stroll pond'], [18, 'stand cafeA'], [21, 'home']] },
  { name: 'Ume',   coat: 'cream',  outfit: { neck: 'pearl_brooch', feet: 'loafers' }, home: 1, day: [[7, 'sit 1'], [10, 'stand cafeB'], [13, 'sit 8'], [16, 'stand g1'], [19, 'home']] },
  { name: 'Riku',  coat: 'dark',   outfit: { eyes: 'shades', top: 'jacket_black' }, home: 2, day: [[9, 'stroll plaza'], [12, 'stand launchA'], [15, 'sit 4'], [18, 'stand g2'], [20, 'stroll pond'], [2, 'home']] },
  { name: 'Koko',  coat: 'red',    outfit: { neck: 'bowtie' }, home: 3, day: [[7, 'stroll park'], [10, 'sit 2'], [13, 'stand g3'], [16, 'stroll mainE'], [19, 'stand cafeA'], [22, 'home']] },
  { name: 'Natsu', coat: 'tan',    outfit: { top: 'hawaiian', eyes: 'rose_shades' }, home: 4, day: [[8, 'stroll south'], [11, 'stand marketA'], [14, 'sit 10'], [17, 'stroll plaza'], [20, 'stand g4'], [23, 'home']] },
  { name: 'Benji', coat: 'gray',   outfit: { hat: 'top_hat', neck: 'tie_red' }, home: 5, day: [[8, 'stand chapelA'], [11, 'stroll plaza'], [14, 'stand g5'], [17, 'sit 6'], [20, 'stroll mainW'], [22, 'home']] },
  { name: 'Haru',  coat: 'golden', outfit: { bottom: 'jeans_ripped', feet: 'sneakers_red' }, home: 0, day: [[6, 'stroll pond'], [9, 'stand launchB'], [12, 'sit 9'], [15, 'stroll mainE'], [18, 'stand g1'], [21, 'home']] },
  { name: 'Kiki',  coat: 'cream',  outfit: { neck: 'emerald_chain', hat: 'rose_tiara' }, home: 2, day: [[9, 'sit 3'], [12, 'stroll park'], [15, 'stand cafeB'], [18, 'sit 12'], [21, 'stroll mainW'], [1, 'home']] },
  { name: 'Fuku',  coat: 'tan',    outfit: { neck: 'ob_apron_pin', bottom: 'chinos' }, home: 5, day: [[7, 'stand chapelB'], [10, 'stroll south'], [13, 'stand g4'], [16, 'sit 11'], [19, 'stand g0'], [22, 'home']] },
  { name: 'Tama',  coat: 'red',    outfit: { eyes: 'gold_shades', top: 'suit_navy' }, home: 1, day: [[10, 'stroll mainE'], [13, 'sit 5'], [16, 'stand g2'], [19, 'stroll plaza'], [23, 'stand g5'], [3, 'home']] },
];
export const FOLK_NAMES = FOLK.map((f) => f.name);
export const folkId = (name) => 'tf:' + name; // chat bubble id (kept apart from npc / multiplayer ids)

// ---- lines (original, light) ----
export const FOLK_LINES = {
  greet: ['Oh, hi there!', 'Hello, neighbour!', 'Nice to see you!', 'Hey! Lovely day for a walk.', 'Hi! Love the look.', 'Oh! Didn\'t see you there. Hi!'],
  morning: ['Morning! The air smells like toast.', 'Early start today!', 'Good morning, sunshine.'],
  day: ['What a nice afternoon.', 'The plaza is buzzing today.', 'I could sit here all day.'],
  evening: ['The lamps are coming on.', 'Golden hour is my favourite.', 'Almost time to head home.'],
  night: ['Out late too, huh?', 'The stars are out!', 'Shh, the town is sleeping.'],
  rain: ['Glad I brought my umbrella!', 'Puddle season!', 'Rain makes the flowers happy.'],
  cloudy: ['Bit grey today, still cosy.', 'Clouds look like bones, right?'],
  sit: ['Best bench in town.', 'Just resting my paws.', 'Watching the world go by.'],
  stroll: ['Getting my steps in!', 'Gotta keep these paws moving.', 'Loop number three!'],
  stand: ['We were just catching up.', 'Have you heard? New shops soon!', 'The fountain is extra sparkly.'],
  talk: ['I walk this way every day.', 'Try the cafe, the buns are warm.', 'This town feels more alive lately.', 'Wave at the dog walkers, they love it.', 'I heard the pond koi are shy today.'],
  pairs: [['Nice weather, huh?', 'Perfect for a stroll!'], ['Did you try the new buns?', 'Twice! No regrets.'], ['See the fireflies last night?', 'By the park! So pretty.'], ['How was your day?', 'Pawsome, thanks!'], ['Look at those clouds.', 'That one is a bone!']],
};
const pickL = (arr, r) => arr[Math.floor(r * arr.length) % arr.length];
export function timeLine(hour, wx, r) { if (wx === 'rain') return pickL(FOLK_LINES.rain, r); if (wx === 'cloudy' && r < 0.3) return pickL(FOLK_LINES.cloudy, r / 0.3);
  return pickL(hour < 5 || hour >= 22 ? FOLK_LINES.night : hour < 11 ? FOLK_LINES.morning : hour < 17 ? FOLK_LINES.day : FOLK_LINES.evening, r); }

// ---- geometry helpers ----
const tc = ([tx, ty]) => [(tx + 0.5) * TILE, (ty + 0.7) * TILE];
const tileOf = (x, y) => [Math.floor(x / TILE), Math.floor(y / TILE)];
export const nearDoor = (tx, ty) => { for (let dx = -1; dx <= 1; dx++) for (let dy = 0; dy <= 1; dy++) if (DOOR_TILES.has((ty - dy) * 1000 + tx + dx)) return true; return false; };
function parseStop(s) { const [kind, arg] = s.split(' ');
  if (kind === 'stroll') return { kind, loop: arg }; if (kind === 'sit') return { kind, seat: +arg }; if (kind === 'stand') return { kind, spot: arg }; return { kind: 'home' }; }
function mkPath(pts) { const cum = [0]; for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1])); return { pts, cum, len: cum[cum.length - 1] }; }
// sidewalk-preferring route (Dijkstra, roads cost 3x so folk keep to pavements and only cross where needed); computed once per
// route and cached, never per frame
export function walkPath(sx, sy, tx, ty) { if (isSolid(tx, ty)) return null; const N = MAP_W * MAP_H, dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), done = new Uint8Array(N);
  const heap = []; const push = (d, k) => { heap.push([d, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  const s0 = sy * MAP_W + sx, goal = ty * MAP_W + tx; dist[s0] = 0; push(0, s0);
  while (heap.length) { const [d, k] = pop(); if (done[k]) continue; done[k] = 1; if (k === goal) break; const x = k % MAP_W, y = (k - x) / MAP_W;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (isSolid(nx, ny)) continue; const nk = ny * MAP_W + nx, nd = d + (MAP[ny][nx] === TT.ROAD ? 3 : 1);
      if (nd < dist[nk]) { dist[nk] = nd; prev[nk] = k; push(nd, nk); } } }
  if (!done[goal]) return null; const out = []; for (let k = goal; k !== -1; k = prev[k]) out.push([k % MAP_W, Math.floor(k / MAP_W)]); return out.reverse(); }
// tile route between two world points (walkPath once, cached); falls back to a straight line if no path
function routeBetween(a, b) { const [sx, sy] = tileOf(a[0], a[1]), [ex, ey] = tileOf(b[0], b[1]); const tiles = (sx === ex && sy === ey) ? null : walkPath(sx, sy, ex, ey);
  const pts = [a]; if (tiles) for (let k = 1; k < tiles.length - 1; k++) pts.push(tc(tiles[k])); pts.push(b); return mkPath(pts); }
const LOOP_CACHE = new Map();
function loopPath(name) { let L = LOOP_CACHE.get(name); if (L) return L; const c = LOOPS[name], pts = [];
  for (let k = 0; k < c.length; k++) { const a = c[k], b = c[(k + 1) % c.length], seg = walkPath(a[0], a[1], b[0], b[1]) || [a, b]; for (let j = 0; j < seg.length - 1; j++) pts.push(tc(seg[j])); }
  pts.push(tc(c[0])); L = mkPath(pts); L.ok = c.every((p) => !isSolid(p[0], p[1])); LOOP_CACHE.set(name, L); return L; }
// point at distance d along a path (binary search over cumulative lengths); writes into o
function along(P, d, o) { const n = P.cum.length; if (d <= 0) { o.x = P.pts[0][0]; o.y = P.pts[0][1]; o.dx = 0; o.dy = 1; return o; } if (d >= P.len) { o.x = P.pts[n - 1][0]; o.y = P.pts[n - 1][1]; o.dx = 0; o.dy = 1; return o; }
  let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P.cum[m] <= d) lo = m; else hi = m; }
  const a = P.pts[lo], b = P.pts[hi], seg = P.cum[hi] - P.cum[lo] || 1, k = (d - P.cum[lo]) / seg; o.x = a[0] + (b[0] - a[0]) * k; o.y = a[1] + (b[1] - a[1]) * k; o.dx = b[0] - a[0]; o.dy = b[1] - a[1]; return o; }
const faceOf = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy < 0 ? 'up' : 'down'));
function anchorOf(f, st) { if (st.kind === 'stroll') return loopPath(st.loop).pts[0]; if (st.kind === 'sit') return SEATS[st.seat]; if (st.kind === 'stand') return tc(SPOTS[st.spot][0]); return tc(HOMES[f.home]); }
const TMP = { x: 0, y: 0, dx: 0, dy: 1 };
const LANE = [[0, 0], [-7, 3], [7, -3], [-4, -4], [4, 4]]; // small per-folk lane offset so two walkers on one street don't overlap exactly
// where a folk is inside a stop, e seconds after arriving (pure)
function inStop(f, st, e, o) { if (st.kind === 'stroll') { const L = loopPath(st.loop), d = (e * SPEED) % L.len, ln = LANE[FOLK.indexOf(f) % 5], k = Math.min(1, e * SPEED / 16); along(L, d, TMP); o.x = TMP.x + ln[0] * k; o.y = TMP.y + ln[1] * k; o.face = faceOf(TMP.dx, TMP.dy); o.moving = true; o.dist = e * SPEED; o.doing = 'stroll'; o.hidden = false; return o; }
  const a = anchorOf(f, st); o.x = a[0]; o.y = a[1]; o.moving = false; o.dist = 0;
  if (st.kind === 'sit') { o.face = 'down'; o.doing = 'sit'; o.hidden = false; } else if (st.kind === 'stand') { o.face = SPOTS[st.spot][1]; o.doing = 'stand'; o.hidden = false; } else { o.face = 'up'; o.doing = 'home'; o.hidden = true; }
  return o; }

// ---- daily plan: blocks with their (cached) transit route from where the previous block ended ----
const PLANS = [];
export function folkPlan(i) { if (PLANS[i]) return PLANS[i]; const f = FOLK[i], n = f.day.length;
  const blocks = [...f.day].sort((p, q) => p[0] - q[0]).map(([h, s]) => ({ h, s0: h * 60, stop: parseStop(s), len: 0, route: null, dur: 0 }));
  for (let k = 0; k < n; k++) blocks[k].len = ((blocks[(k + 1) % n].h - blocks[k].h + 24) % 24 || 24) * 60;
  // start right after the home block (its end point does not depend on anything), go once round the cycle
  const hk = blocks.findIndex((b) => b.stop.kind === 'home'), o = { x: 0, y: 0 };
  for (let j = 1; j <= n; j++) { const k = (hk + j) % n, p = blocks[(k - 1 + n) % n], b = blocks[k];
    const endE = Math.max(0, p.len - p.dur); let from; if (p.route && p.len < p.dur) { along(p.route, p.len * SPEED, TMP); from = [TMP.x, TMP.y]; } else { inStop(f, p.stop, endE, o); from = [o.x, o.y]; }
    b.route = routeBetween(from, anchorOf(f, b.stop)); b.dur = b.route.len / SPEED; }
  PLANS[i] = { blocks }; return PLANS[i]; }
// pure position of folk i at folk-day second s: { x, y, face, moving, dist, doing: walk|stroll|sit|stand|home, hidden }
export function folkAt(i, s, o = {}) { const { blocks } = folkPlan(i); s = ((s % FOLK_DAY) + FOLK_DAY) % FOLK_DAY;
  let k = blocks.length - 1; for (let j = 0; j < blocks.length; j++) if (blocks[j].s0 <= s) k = j; // blocks are hour-sorted
  const b = blocks[k]; let e = s - b.s0; if (e < 0) e += FOLK_DAY; o.block = k;
  if (e < b.dur) { const d = e * SPEED, k = Math.max(0, Math.min(1, d / 16, (b.route.len - d) / 16)); along(b.route, d, TMP); o.x = TMP.x + LANE[i % 5][0] * k; o.y = TMP.y + LANE[i % 5][1] * k; o.face = faceOf(TMP.dx, TMP.dy); o.moving = true; o.dist = e * SPEED; o.doing = 'walk'; o.hidden = false; return o; }
  return inStop(FOLK[i], b.stop, e - b.dur, o); }
// folk-day second from the sky clock (sky hour in [0,24)); pinned debug hours (?tod=) still let them move
export const folkSec = (hour) => (((hour % 24) + 24) % 24) * 60;

// ---- runtime: pooled actors + local reactions ----
const SIT = Object.freeze({ kind: 'sit', t0: -100 });
export function makeTownsfolk() { const T = { out: [], pending: null, chatT: 6, seq: 0, lastS: 0,
  F: FOLK.map((f, i) => ({ i, f, id: folkId(f.name), p: { x: 0, y: 0, face: 'down', moving: false, dist: 0, doing: 'home', hidden: true, block: 0 },
    a: { x: 0, y: 0, coat: f.coat, outfit: f.outfit, face: 'down', phase: 0, moving: false, name: null, folkName: f.name, fid: 'tf:' + f.name, id: 'tf:' + f.name, townsfolk: true, folkIdx: i, idx: i, art: null, act: null, emote: null, umbrella: false, wave: { kind: 'wave', t0: 0 }, em: { kind: 'wave', t: 0 } },
    lag: 0, hold: 0, greeted: false, greetAt: -999, lookT: 0, talkAt: -999, bubbleUntil: -1 })) };
  return T; }
export const activeCount = (low) => (low ? FOLK_CAPS.low : FOLK_CAPS.all);
const inV = (x, y, v, m) => !v || (x > v.x0 - m && x < v.x1 + m && y > v.y0 - m && y < v.y1 + m); // view {x0,y0,x1,y1} like alive.js
function bubbles(T, now) { let n = 0; for (const F of T.F) if (F.bubbleUntil > now) n++; return n; }
function speak(T, F, text, now, ctx, force = false) { if (!ctx.say || bubbles(T, now) >= FOLK_CAPS.bubbles) return false; const ok = ctx.say(F.id, text, now, force); if (ok) F.bubbleUntil = now + 3.4; return ok; }
// per frame. ctx: { s (folk-day second), now (game time, s), px, py (player; null when driving / away), view {x0,y0,x1,y1},
// hour, wx ('clear'|'cloudy'|'rain'), low (reduced effects), rm (reduced motion), rng, say(id, text, now, force), artKey }
export function stepTownsfolk(T, dt, ctx) { const out = T.out; out.length = 0; const n = activeCount(ctx.low), rng = ctx.rng || Math.random, now = ctx.now, rain = ctx.wx === 'rain';
  for (let i = 0; i < T.F.length; i++) { const F = T.F[i], a = F.a;
    if (i >= n) { F.greeted = false; continue; }
    if (F.hold > 0) { F.hold -= dt; F.lag = Math.min(12, F.lag + dt); } else if (F.lag > 0) F.lag = Math.max(0, F.lag - dt * 0.35);
    const p = folkAt(i, ctx.s - (F.p.moving || F.hold > 0 ? F.lag : (F.lag = 0)), F.p);
    if (p.hidden || !inV(p.x, p.y, ctx.view, FOLK_CAPS.view)) { F.greeted = F.greeted && !p.hidden; continue; }
    a.x = p.x; a.y = p.y; a.face = p.face; a.moving = p.moving && F.hold <= 0; a.phase = ctx.rm ? 0 : p.dist * 0.35; a.act = p.doing === 'sit' ? SIT : null; a.umbrella = rain && p.doing !== 'home';
    if (ctx.artKey && a.art == null) a.art = ctx.artKey(a.coat, a.outfit) || false;
    // react to the player: turn, wave, greet (one greeting per approach, cooldown), short pause while walking
    if (ctx.px != null) { const dx = ctx.px - p.x, dy = ctx.py - p.y, d = Math.hypot(dx, dy);
      if (d < FOLK_CAPS.react && !F.greeted && now - F.greetAt > FOLK_CAPS.greetCool) { F.greeted = true; F.greetAt = now; F.lookT = 3; if (p.moving) F.hold = 2.2;
        F.a.wave.t0 = now; F.a.em.t = 1.6; speak(T, F, pickL(FOLK_LINES.greet, rng()), now, ctx, true); }
      else if (d > FOLK_CAPS.unreact) F.greeted = false;
      if (d < FOLK_CAPS.react * 1.4 && (F.lookT > 0 || !p.moving)) { if (p.doing !== 'sit' || dy > -8) a.face = faceOf(dx, dy); }
      if (F.lookT > 0) F.lookT -= dt; }
    if (F.a.em.t > 0) { F.a.em.t -= dt; a.emote = F.a.em; if (p.doing !== 'sit') a.act = now - F.a.wave.t0 < 2.4 ? F.a.wave : a.act; } else a.emote = null;
    out.push(a); }
  // ambient chatter among visible folk: a pair exchange if two stand/sit close, else a solo time/weather line
  if (T.pending && now >= T.pending.at) { const F = T.F[T.pending.i]; if (out.includes(F.a)) speak(T, F, T.pending.text, now, ctx, true); T.pending = null; }
  if ((T.chatT -= dt) <= 0) { T.chatT = 5 + rng() * 6; const vis = out.length; if (vis) { const A = T.F[out[Math.floor(rng() * vis) % vis].folkIdx];
      let B = null; for (const a of out) { const G = T.F[a.folkIdx]; if (G !== A && !G.p.moving && !A.p.moving && Math.hypot(a.x - A.a.x, a.y - A.a.y) < 130) { B = G; break; } }
      if (B && rng() < 0.7) { const pr = pickL(FOLK_LINES.pairs, rng()); if (speak(T, A, pr[0], now, ctx)) T.pending = { i: B.i, text: pr[1], at: now + 1.8 }; }
      else if (rng() < 0.6) speak(T, A, rng() < 0.5 ? timeLine(ctx.hour ?? 12, ctx.wx, rng()) : pickL(FOLK_LINES[A.p.doing] || FOLK_LINES.talk, rng()), now, ctx); } }
  return out; }
// nearest visible folk within r of (x, y) (for the interact prompt / tap); uses the last step's output
export function nearestFolk(T, x, y, r = FOLK_CAPS.talk) { let best = null, bd = r; for (const a of T.out) { const d = Math.hypot(a.x - x, a.y - y); if (d < bd) { bd = d; best = a; } } return best; }
export function folkAtWorld(T, wx, wy) { let best = null, bd = 22; for (const a of T.out) { const dx = Math.abs(wx - a.x), dy = a.y - wy; if (dy < -10 || dy > 44) continue; const d = Math.hypot(dx, Math.max(0, dy - 18)); if (dx < 16 && d < bd) { bd = d; best = a; } } return best; }
// tap / interact: a short line (no rewards); they turn to you and wave
export function talkTo(T, a, ctx) { const F = T.F[a.folkIdx], r = ctx.rng || Math.random; F.lookT = 3; F.a.wave.t0 = ctx.now; F.a.em.t = 1.4; if (F.p.moving) F.hold = Math.max(F.hold, 3);
  const pool = r() < 0.4 ? null : (FOLK_LINES[F.p.doing] || FOLK_LINES.talk); return pool ? pickL(r() < 0.5 ? FOLK_LINES.talk : pool, r()) : timeLine(ctx.hour ?? 12, ctx.wx, r()); }
// chat bubble anchor for a 'tf:' id (above the head), or null when not on screen
export function folkAnchor(T, id) { if (typeof id !== 'string' || !id.startsWith('tf:')) return null; for (const a of T.out) if (a.fid === id) return { x: a.x, y: a.y - (a.act === SIT ? 52 : 60) }; return null; }

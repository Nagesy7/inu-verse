// Living-town preview: Orchard Row workplaces, their crew, and the six living-town systems layered on top.
// Pure and deterministic: where every worker is, what they carry and how many goods they have moved is a function of the
// shared sky clock. Plans count 60 plan-seconds per sky hour (1440 per sky day). The game's sky clock is wall-clock based
// (src/weather.js SKY_DAY_MS = 24 real minutes, re-synced every frame), so one plan-second is one real second. Every device sees the same pup at the
// same station. Only memory, apprenticeships and keepsakes are personal, and they live in their own preview key.
// Nothing here reads or writes inuverse.save.v1, Bones, $KIBBLE, wallets, prizes or scores. Goods are town scenery.
// Workers are town characters. They are not paid in anything real, and nothing here is earnings.
import { TILE } from './world.js';
import { lotById, isBlocked, PROPOSAL_W, PROPOSAL_H } from './townproposal.js';
import { sydneyYMD, seasonOfMonth } from './seasons.js';

export const ROW_SAVE_KEY = 'inuverse.preview.livingtown.v1';
export const LIVE_SAVE_KEY = 'inuverse.save.v1';
export const SKY_DAY_S = 1440; // plan-seconds per sky day (60 per sky hour)
export const HOUR_S = 60;
// The game's real sky day: src/weather.js SKY_DAY_MS (24 real minutes). main.js re-syncs the hour to it every frame
// (syncSky -> skyWorldT), so ambient.js DAY_LEN (720) does not set the pace. Kept as a literal so this file stays light;
// tests/livingtown.test.mjs checks it still equals SKY_DAY_MS / 1000.
export const GAME_DAY_S = 1440;
export const PLAN_S_PER_REAL_S = SKY_DAY_S / GAME_DAY_S; // 1
// Designed pace: workers stroll at 70 real px/s, a little slower than the player (WALK_SPEED 92 px/s).
export const WALK_REAL_PX = 70;
export const WALK_PX = WALK_REAL_PX / PLAN_S_PER_REAL_S;
export const LEAVE_H = 7;
export const HOME_H = 17;
export const LUNCH_H = 12;
export const LUNCH_S = 40;
// Day 0 of the preview town (Sydney calendar). Multi-day work counts real Sydney days from here.
export const EPOCH_YMD = Object.freeze({ y: 2026, m: 11, d: 16 });
export const EPOCH_MS = Date.UTC(2026, 10, 15, 13, 0, 0); // 16 Nov 2026 00:00 Australia/Sydney (UTC+11)

export const ORCHARD_LOTS = Object.freeze(['orchard', 'apiary', 'dairy', 'pottery', 'carpentry', 'post', 'print']);
// Meadow Row: three more staffed workplaces in the north-east meadow (added for the go-live pass).
export const MEADOW_LOTS = Object.freeze(['sheep', 'teagarden', 'candles']);
export const ROW_LOTS = Object.freeze([...ORCHARD_LOTS, ...MEADOW_LOTS]);

// Station = where the worker stands while working, in tiles (feet point). Outdoor stations move under the eave in rain.
export const WORKPLACES = Object.freeze({
  orchard: { id: 'orchard', name: 'Orchard', outdoor: true, station: [62.5, 25.2], shelter: [63.5, 26.4], verb: 'picking fruit' },
  apiary: { id: 'apiary', name: 'Apiary', outdoor: true, station: [69.3, 25.3], shelter: [70.5, 26.4], verb: 'tending the hives' },
  dairy: { id: 'dairy', name: 'Dairy', outdoor: true, station: [78.4, 25.3], shelter: [76.5, 26.4], verb: 'milking' },
  pottery: { id: 'pottery', name: 'Pottery', outdoor: false, station: [82.2, 26.35], verb: 'throwing pots' },
  carpentry: { id: 'carpentry', name: "Carpenter's Shop", outdoor: false, station: [62.0, 27.3], verb: 'building chairs' },
  post: { id: 'post', name: 'Post Office', outdoor: false, station: [73.1, 27.3], verb: 'sorting mail' },
  print: { id: 'print', name: 'Print Shop', outdoor: false, station: [79.1, 27.3], verb: 'printing The Daily Bone' },
  sheep: { id: 'sheep', name: 'Sheep Meadow', outdoor: true, station: [75.6, 6.3], shelter: [77.4, 7.45], verb: 'shearing the sheep' },
  teagarden: { id: 'teagarden', name: 'Tea Garden', outdoor: true, station: [81.4, 6.3], shelter: [83.4, 7.45], verb: 'picking tea leaves' },
  candles: { id: 'candles', name: 'Candle Works', outdoor: false, station: [87.2, 7.4], verb: 'dipping candles' },
  'town-hall': { id: 'town-hall', name: 'Town Hall site', outdoor: true, station: [41.5, 64.4], verb: 'building the Town Hall' },
});

// Seasonal harvest at the orchard (southern hemisphere, Sydney date).
export const HARVEST = Object.freeze({ spring: 'strawberries', summer: 'peaches', autumn: 'apples', winter: 'lemons' });

// steps: ['work', s] | ['go', lotId, carry] | ['pick', s, carry] | ['drop', s, good]
export const ROW_WORKERS = Object.freeze([
  { id: 'pip', name: 'Pip', coat: 'golden', job: 'Orchard picker', lot: 'orchard', home: 'p8', tool: 'basket', good: 'fruit', marketSwap: 'goods', recipe: 'Fruit tart',
    steps: [['work', 42], ['go', 'goods', 'fruit'], ['drop', 3, 'fruit'], ['go', 'orchard', null]] },
  { id: 'honey', name: 'Honey', coat: 'cream', job: 'Beekeeper', lot: 'apiary', home: 'p5', tool: 'smoker', good: 'honey', marketSwap: 'bakery', recipe: 'Beeswax candle',
    steps: [['work', 46], ['go', 'bakery', 'honey'], ['drop', 3, 'honey'], ['go', 'apiary', null]] },
  { id: 'clover', name: 'Clover', coat: 'tan', job: 'Dairy hand', lot: 'dairy', home: 'P2', tool: 'pail', good: 'milk', marketSwap: 'sip', recipe: 'Cheese wheel',
    steps: [['work', 40], ['go', 'sip', 'milk'], ['drop', 3, 'milk'], ['go', 'dairy', null]] },
  { id: 'kiln', name: 'Kiln', coat: 'red', job: 'Potter', lot: 'pottery', home: 'cot0', tool: 'clay', good: 'pots', marketSwap: 'goods', recipe: 'Clay planter',
    steps: [['go', 'quarry', null], ['pick', 3, 'clay'], ['go', 'pottery', 'clay'], ['work', 40], ['go', 'goods', 'pots'], ['drop', 3, 'pots'], ['go', 'pottery', null]] },
  { id: 'chip', name: 'Chip', coat: 'dark', job: 'Carpenter', lot: 'carpentry', home: 'p4', tool: 'saw', good: 'chairs', recipe: 'Footstool',
    steps: [['go', 'sawmill', null], ['pick', 3, 'planks'], ['go', 'carpentry', 'planks'], ['work', 44], ['go', 'goldden', 'chair'], ['drop', 3, 'chairs'], ['go', 'carpentry', null]] },
  { id: 'letty', name: 'Letty', coat: 'gray', job: 'Postie', lot: 'post', home: 'P1', tool: 'stamp', good: 'letters', recipe: 'Postcard',
    steps: [['work', 30], ['go', 'h1', 'mail'], ['drop', 2, 'letters'], ['go', 'h2', 'mail'], ['drop', 2, 'letters'], ['go', 'h3', 'mail'], ['drop', 2, 'letters'], ['go', 'h4', 'mail'], ['drop', 2, 'letters'], ['go', 'post', null]] },
  { id: 'inky', name: 'Inky', coat: 'cream', job: 'Printer', lot: 'print', home: 'cot2', tool: 'roller', good: 'papers', recipe: 'Gig poster',
    steps: [['work', 44], ['go', 'jobs', 'papers'], ['drop', 3, 'papers'], ['go', 'fountain', 'papers'], ['drop', 3, 'papers'], ['go', 'print', null]] },
  { id: 'brick', name: 'Brick', coat: 'golden', job: 'Builder', lot: 'town-hall', home: 'p3', tool: 'hammer', good: 'build', recipe: 'Birdhouse', base: 'builders',
    steps: [['work', 60], ['go', 'builders', null], ['pick', 3, 'planks'], ['go', 'town-hall', 'planks'], ['drop', 2, 'build']] },
  // Meadow Row crew. Each one is wired into an existing chain: wool feeds the Tailor, tea goes to the Café with Clover's milk,
  // and the Candle Works takes wax from Honey's Apiary and lights the homes on the high street.
  { id: 'woolly', name: 'Woolly', coat: 'gray', job: 'Shepherd', lot: 'sheep', home: 'p1', tool: 'shears', good: 'wool', recipe: 'Wool scarf',
    steps: [['work', 44], ['go', 'tailor', 'wool'], ['drop', 3, 'wool'], ['go', 'sheep', null]] },
  { id: 'matcha', name: 'Matcha', coat: 'tan', job: 'Tea picker', lot: 'teagarden', home: 'p2', tool: 'leaf', good: 'tea', marketSwap: 'sip', recipe: 'Tea sachet',
    steps: [['work', 40], ['go', 'sip', 'tea'], ['drop', 3, 'tea'], ['go', 'teagarden', null]] },
  { id: 'taper', name: 'Taper', coat: 'cream', job: 'Candle maker', lot: 'candles', home: 'p6', tool: 'dip', good: 'candles', recipe: 'Tea light',
    steps: [['go', 'apiary', null], ['pick', 3, 'wax'], ['go', 'candles', 'wax'], ['work', 42], ['go', 'h3', 'candles'], ['drop', 2, 'candles'], ['go', 'h4', 'candles'], ['drop', 2, 'candles'], ['go', 'candles', null]] },
]);
export const WORKER_IDS = Object.freeze(ROW_WORKERS.map((w) => w.id));
export const workerById = (id) => ROW_WORKERS.find((w) => w.id === id) || null;

// ---------------------------------------------------------------- routes
const doorOf = (id) => { const l = lotById(id); return l ? l.door : null; };
const routeCache = new Map();
// Same rules as proposalPath (4-way BFS over isBlocked), on a blocked grid built once so a full day plan stays cheap.
let BLOCK = null;
function blockGrid() {
  if (BLOCK) return BLOCK;
  BLOCK = new Uint8Array(PROPOSAL_W * PROPOSAL_H);
  for (let y = 0; y < PROPOSAL_H; y++) for (let x = 0; x < PROPOSAL_W; x++) BLOCK[y * PROPOSAL_W + x] = isBlocked(x, y) ? 1 : 0;
  return BLOCK;
}
export function fastPath([sx, sy], [tx, ty]) {
  const B = blockGrid(), W = PROPOSAL_W, H = PROPOSAL_H;
  if (B[sy * W + sx] || B[ty * W + tx]) return null;
  const prev = new Int32Array(W * H).fill(-2), q = new Int32Array(W * H);
  let head = 0, tail = 0; const s0 = sy * W + sx, goal = ty * W + tx; prev[s0] = -1; q[tail++] = s0;
  while (head < tail) {
    const k = q[head++];
    if (k === goal) { const path = []; let c = k; while (c !== -1) { path.push([c % W, Math.floor(c / W)]); c = prev[c]; } return path.reverse(); }
    const x = k % W, y = Math.floor(k / W);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const nk = ny * W + nx; if (B[nk] || prev[nk] !== -2) continue; prev[nk] = k; q[tail++] = nk; }
  }
  return null;
}
export function route(fromId, toId) {
  const k = fromId + '>' + toId;
  if (routeCache.has(k)) return routeCache.get(k);
  const a = doorOf(fromId), b = doorOf(toId);
  const p = a && b ? fastPath(a, b) : null;
  routeCache.set(k, p);
  return p;
}
const walkS = (path) => (path ? ((path.length - 1) * TILE) / WALK_PX : 0);

// ---------------------------------------------------------------- per-worker day timeline (cached; pure)
// segment: { kind: 'home'|'walk'|'work'|'pick'|'drop'|'lunch', t0, t1, from, to, path, carry, good, at }
const planCache = new Map();
export function dayPlan(w, { foreman = false, market = false } = {}) {
  const swap = market && w.marketSwap;
  const key = w.id + (foreman ? ':f' : '') + (swap ? ':m' : '');
  const steps = swap ? w.steps.map((st) => (st[0] === 'go' && st[1] === w.marketSwap ? ['go', 'market', st[2]] : st)) : w.steps;
  if (planCache.has(key)) return planCache.get(key);
  const segs = [];
  const stagger = (WORKER_IDS.indexOf(w.id) % 4) * 6;
  let t = LEAVE_H * HOUR_S + stagger;
  segs.push({ kind: 'home', t0: 0, t1: t, at: w.home });
  let lastCarry = null;
  const go = (from, to, carry) => { const path = route(from, to); const d = walkS(path); segs.push({ kind: 'walk', t0: t, t1: t + d, from, to, path, carry }); t += d; lastCarry = carry || null; };
  const workLot = w.lot;
  go(w.home, w.base || workLot, null);
  if (w.base) go(w.base, workLot, null);
  let at = workLot, lunched = false, cycles = 0;
  const speed = foreman ? 0.85 : 1;
  const cycleLen = () => { let s = 0, here = at; for (const st of steps) { if (st[0] === 'go') { s += walkS(route(here, st[1])); here = st[1]; } else s += st[1] * (st[0] === 'work' ? speed : 1); } return s; };
  const endH = HOME_H * HOUR_S;
  const homeWalk = walkS(route(workLot, w.home));
  while (cycles < 40) {
    // lunch near noon: if the next round would run well past 12, eat first
    if (!lunched && t + cycleLen() / 2 >= LUNCH_H * HOUR_S) { segs.push({ kind: 'lunch', t0: t, t1: t + LUNCH_S, at }); t += LUNCH_S; lunched = true; }
    if (t + cycleLen() + (lunched ? 0 : LUNCH_S) > endH - homeWalk) break; // leave time to walk home by knocking-off time
    for (const st of steps) {
      if (st[0] === 'go') { go(at, st[1], st[2]); at = st[1]; }
      else if (st[0] === 'work') { const d = st[1] * speed; segs.push({ kind: 'work', t0: t, t1: t + d, at }); t += d; }
      else if (st[0] === 'pick') { segs.push({ kind: 'pick', t0: t, t1: t + st[1], at, carry: st[2] }); t += st[1]; }
      else if (st[0] === 'drop') { segs.push({ kind: 'drop', t0: t, t1: t + st[1], at, good: st[2], carry: lastCarry }); t += st[1]; }
    }
    cycles++;
  }
  // a full round no longer fits: stay at the bench until knocking-off time instead of heading home early
  if (!lunched && t < endH && t >= LUNCH_H * HOUR_S - 1) { segs.push({ kind: 'lunch', t0: t, t1: t + LUNCH_S, at }); t += LUNCH_S; lunched = true; }
  { const homeBy = endH - homeWalk; if (at === workLot && t < homeBy) { segs.push({ kind: 'work', t0: t, t1: homeBy, at, tail: true }); t = homeBy; } }
  go(at, w.home, null);
  segs.push({ kind: 'home', t0: t, t1: SKY_DAY_S, at: w.home });
  const plan = { segs, cycles, drops: segs.filter((s) => s.kind === 'drop').length, works: segs.filter((s) => s.kind === 'work').length };
  planCache.set(key, plan);
  return plan;
}

function faceOf(dx, dy) { return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'; }
function alongPath(path, f) {
  if (!path || path.length < 2) { const p = path?.[0] || [0, 0]; return { tx: p[0], ty: p[1], face: 'down' }; }
  const n = path.length - 1, u = Math.max(0, Math.min(n, f * n)), i = Math.min(n - 1, Math.floor(u)), k = u - i;
  const [x0, y0] = path[i], [x1, y1] = path[i + 1];
  return { tx: x0 + (x1 - x0) * k, ty: y0 + (y1 - y0) * k, face: faceOf(x1 - x0, y1 - y0) };
}

const stationOf = (lotId) => WORKPLACES[lotId]?.station || null;

/** where a worker is at sky second `sec` (0..1440) and what it is doing; ctx: { rain, foreman, fire } */
export function workerAt(w, sec, ctx = {}) {
  const s = ((sec % SKY_DAY_S) + SKY_DAY_S) % SKY_DAY_S;
  const plan = dayPlan(w, { foreman: !!ctx.foreman, market: !!ctx.market });
  let seg = plan.segs[plan.segs.length - 1];
  for (const g of plan.segs) if (s >= g.t0 && s < g.t1) { seg = g; break; }
  const f = seg.t1 > seg.t0 ? (s - seg.t0) / (seg.t1 - seg.t0) : 0;
  let made = 0, delivered = 0, last = null;
  for (const g of plan.segs) {
    if (g.kind === 'work' && g.t1 <= s) made++;
    if (g.kind === 'drop' && g.t1 <= s) { delivered++; last = g.at; }
  }
  const out = { id: w.id, name: w.name, kind: seg.kind, f, made, delivered, last, carry: null, visible: true, moving: false, face: 'down', x: 0, y: 0, at: seg.at || null, to: seg.to || null, sheltering: false, firefight: false };
  if (seg.kind === 'home') { out.visible = false; const d = doorOf(seg.at); if (d) { out.x = d[0] * TILE + 16; out.y = d[1] * TILE + 16; } return out; }
  if (seg.kind === 'walk') {
    const p = alongPath(seg.path, f);
    out.x = p.tx * TILE + 16; out.y = p.ty * TILE + 16; out.face = p.face; out.moving = true; out.carry = seg.carry || null; return out;
  }
  const wp = WORKPLACES[seg.at];
  if (seg.kind === 'work' && wp) {
    const outdoorRain = wp.outdoor && ctx.rain && wp.shelter;
    const st = outdoorRain ? wp.shelter : wp.station;
    out.x = st[0] * TILE; out.y = st[1] * TILE; out.face = outdoorRain ? 'down' : 'up'; out.sheltering = !!outdoorRain;
    if (ctx.fire && ctx.fire.lot === seg.at && ctx.fire.on) { const d = doorOf(seg.at); out.x = d[0] * TILE + 16; out.y = d[1] * TILE + 22; out.face = 'up'; out.firefight = true; }
    return out;
  }
  const d = doorOf(seg.at) || [0, 0];
  out.x = d[0] * TILE + 16; out.y = d[1] * TILE + 16;
  if (seg.kind === 'lunch') { out.x += 20; out.y += 2; out.face = 'down'; out.lunch = true; }
  if (seg.kind === 'pick') { out.carry = f > 0.5 ? seg.carry : null; out.face = 'up'; }
  // the hand-off shows what the worker actually walked in with (Kiln brings pots, not clay; Chip brings a chair, not planks)
  if (seg.kind === 'drop') { out.carry = f < 0.5 ? (seg.carry || null) : null; out.face = 'up'; out.dropping = seg.good; }
  return out;
}

// ---------------------------------------------------------------- deliveries are used up (service effects)
// Every delivered good is used by the place it went to USE_S seconds after it arrives, so piles at doors grow with deliveries
// and shrink as the town uses them. Pure: derived from the same day plans, so every device sees the same stock.
export const USE_S = 75;
export const SERVE_FX_S = 12;
export const SERVICE = Object.freeze({
  fruit: 'sold at the stalls', honey: 'baked into honey buns', milk: 'poured into lattes', pots: 'sold at the stalls', chairs: 'set out for customers',
  letters: 'opened at home', papers: 'read around town', wool: 'sewn into coats', tea: 'brewed into pots of tea', candles: 'lit in the windows', build: 'built into the Town Hall',
});
/** stock at every delivery door at sky second `sec`: [{ lot, good, delivered, used, stock, servedAgo }] */
export function townStock(sec, ctxFor = () => ({})) {
  const s = ((sec % SKY_DAY_S) + SKY_DAY_S) % SKY_DAY_S;
  const out = new Map();
  for (const w of ROW_WORKERS) {
    const c = ctxFor(w) || {};
    for (const g of dayPlan(w, { foreman: !!c.foreman, market: !!c.market }).segs) {
      if (g.kind !== 'drop' || g.t1 > s) continue;
      const k = g.at + ':' + g.good;
      const e = out.get(k) || { lot: g.at, good: g.good, delivered: 0, used: 0, stock: 0, servedAgo: null };
      e.delivered++;
      const usedAt = g.t1 + USE_S;
      if (usedAt <= s) { e.used++; const ago = s - usedAt; if (e.servedAgo == null || ago < e.servedAgo) e.servedAgo = ago; }
      e.stock = e.delivered - e.used;
      out.set(k, e);
    }
  }
  return [...out.values()];
}

// ---------------------------------------------------------------- shared clocks
export function sydneyDayIndex(ms = Date.now()) {
  const { y, m, d } = sydneyYMD(ms);
  return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(EPOCH_YMD.y, EPOCH_YMD.m - 1, EPOCH_YMD.d)) / 864e5);
}
export const dayKey = (ms = Date.now()) => { const { y, m, d } = sydneyYMD(ms); return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`; };
export const skyDayIndex = (ms = Date.now()) => Math.floor((ms - EPOCH_MS) / (GAME_DAY_S * 1000)); // one per game sky day (24 real min)
export const seasonNow = (ms = Date.now(), forced = null) => forced || seasonOfMonth(sydneyYMD(ms).m);
export const harvestOf = (season) => HARVEST[season] || 'apples';

const h32 = (n) => { let h = (n | 0) ^ 0x9e3779b9; h = Math.imul(h ^ (h >>> 16), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---------------------------------------------------------------- town events
// Fires: a cartoon chimney flare-up at one Orchard Row workplace on some sky days. Nothing is damaged, nobody is hurt,
// it never touches a player's home, and it is out within half a sky hour. Seeded from the sky-day number only.
export const FIRE_LEN_S = 30;
export function fireOn(skyDay, sec) {
  const r = h32(skyDay * 7 + 3);
  if (r > 0.45) return null; // a little under half of sky days
  const lot = ['pottery', 'print', 'carpentry', 'post'][Math.floor(h32(skyDay * 13 + 1) * 4)];
  const t0 = (9 + Math.floor(h32(skyDay * 31 + 5) * 6)) * HOUR_S + 20;
  const on = sec >= t0 && sec < t0 + FIRE_LEN_S;
  const after = sec >= t0 + FIRE_LEN_S && sec < t0 + FIRE_LEN_S + 20;
  return { lot, t0, t1: t0 + FIRE_LEN_S, on, after, k: on ? 1 - (sec - t0) / FIRE_LEN_S : 0, upcoming: sec < t0 };
}
// Multi-day construction: the Town Hall goes up one stage per real Sydney day from the preview's day 0.
export const HALL_STAGES = Object.freeze(['Surveyed', 'Foundation', 'Frame', 'Walls', 'Roof', 'Finished']);
export function hallStage(dayIdx, sec) {
  const d = Math.max(0, dayIdx);
  if (d >= HALL_STAGES.length - 1) return { stage: HALL_STAGES.length - 1, name: HALL_STAGES[HALL_STAGES.length - 1], pct: 100, daysLeft: 0 };
  const within = Math.max(0, Math.min(1, (sec - LEAVE_H * HOUR_S) / ((HOME_H - LEAVE_H) * HOUR_S)));
  return { stage: d, name: HALL_STAGES[d], pct: Math.round(((d + within) / (HALL_STAGES.length - 1)) * 100), daysLeft: HALL_STAGES.length - 1 - d };
}
export function marketDay(evId) { return evId === 'market'; }

// ---------------------------------------------------------------- town-wide upgrades (shared; from goods moved since day 0)
export const UPGRADES = Object.freeze([
  { id: 'lamps', name: 'Orchard Lane lamps', need: 400, what: 'Street lamps light the lane at night.' },
  { id: 'flowers', name: 'Flower boxes', need: 1200, what: 'Flower boxes along the Orchard Row fronts.' },
  { id: 'benches', name: 'Lane benches', need: 2600, what: 'Two benches for lunch breaks on the lane.' },
  { id: 'cart', name: 'Delivery handcarts', need: 5000, what: 'Workers push a handcart on deliveries (cosmetic).' },
  { id: 'arch', name: 'Orchard Row arch', need: 9000, what: 'A painted arch over the lane entrance.' },
  { id: 'clock', name: 'Town Hall clock', need: 15000, what: 'A clock face for the finished Town Hall.' },
]);
let perDayMemo = null;
export function dropsPerSkyDay() {
  if (perDayMemo != null) return perDayMemo;
  perDayMemo = ROW_WORKERS.reduce((n, w) => n + dayPlan(w).drops, 0);
  return perDayMemo;
}
export function goodsMoved(skyDay, sec, ctxFor = () => ({})) {
  const today = ROW_WORKERS.reduce((n, w) => n + workerAt(w, sec, ctxFor(w)).delivered, 0);
  return Math.max(0, skyDay) * dropsPerSkyDay() + today;
}
export function upgradesFor(points) {
  const done = UPGRADES.filter((u) => points >= u.need).map((u) => u.id);
  const next = UPGRADES.find((u) => points < u.need) || null;
  return { points, done, next, pct: next ? Math.round((points / next.need) * 100) : 100 };
}

// ---------------------------------------------------------------- needs and moods (per worker, derived)
export const MOODS = Object.freeze({ cheerful: 'Cheerful', content: 'Content', busy: 'Busy', tired: 'Tired', peckish: 'Peckish', soggy: 'Soggy', alarmed: 'Alarmed', chuffed: 'Chuffed', asleep: 'Asleep' });
export function needsOf(w, sec, { rain = false, metToday = false, fire = null } = {}) {
  const s = ((sec % SKY_DAY_S) + SKY_DAY_S) % SKY_DAY_S;
  const startS = LEAVE_H * HOUR_S, endS = HOME_H * HOUR_S;
  const plan = dayPlan(w); const lunch = plan.segs.find((g) => g.kind === 'lunch');
  const workF = Math.max(0, Math.min(1, (s - startS) / (endS - startS)));
  let energy = 1 - workF * 0.7; if (lunch && s >= lunch.t1) energy += 0.15;
  let hunger = 1 - Math.max(0, Math.min(1, (s - startS) / ((lunch ? lunch.t0 : LUNCH_H * HOUR_S) - startS))) * 0.8;
  if (lunch && s >= lunch.t1) hunger = 1 - Math.max(0, (s - lunch.t1) / (endS - lunch.t1)) * 0.5;
  const at = workerAt(w, s, { rain });
  let social = 0.45 + (metToday ? 0.35 : 0) + (at.kind === 'drop' || at.kind === 'lunch' ? 0.15 : 0);
  energy = Math.max(0, Math.min(1, energy)); hunger = Math.max(0, Math.min(1, hunger)); social = Math.max(0, Math.min(1, social));
  let mood = 'content';
  if (!at.visible) mood = 'asleep';
  else if (fire && fire.on && (fire.lot === w.lot || at.firefight)) mood = 'alarmed';
  else if (rain && at.sheltering) mood = 'soggy';
  else if (hunger < 0.3) mood = 'peckish';
  else if (energy < 0.4) mood = 'tired';
  else if (metToday) mood = 'chuffed';
  else if (at.kind === 'work') mood = 'busy';
  else if (energy > 0.8) mood = 'cheerful';
  return { energy, hunger, social, mood, label: MOODS[mood] };
}

// ---------------------------------------------------------------- personal: memory, foreman, apprenticeships, crafting
export const FOREMAN_XP = 6;
export const LESSONS_TO_GRADUATE = 3;
export function emptyLife() { return { v: 1, met: {}, apprentice: null, graduated: [], keepsakes: {}, crafted: {} }; }
export function loadLife(storage) {
  try {
    const raw = storage?.getItem?.(ROW_SAVE_KEY);
    if (!raw) return emptyLife();
    const o = JSON.parse(raw);
    if (!o || o.v !== 1) return emptyLife();
    const L = emptyLife();
    for (const id of WORKER_IDS) if (o.met?.[id] && Array.isArray(o.met[id].days)) L.met[id] = { days: o.met[id].days.filter((d) => typeof d === 'string').slice(-60), talks: Math.max(0, o.met[id].talks | 0) };
    if (o.apprentice && WORKER_IDS.includes(o.apprentice.id)) L.apprentice = { id: o.apprentice.id, lessons: Math.min(LESSONS_TO_GRADUATE, Math.max(0, o.apprentice.lessons | 0)), lastHour: Number.isFinite(o.apprentice.lastHour) ? o.apprentice.lastHour : -1 };
    L.graduated = Array.isArray(o.graduated) ? o.graduated.filter((id) => WORKER_IDS.includes(id)) : [];
    for (const w of ROW_WORKERS) { const n = o.keepsakes?.[w.recipe]; if (Number.isFinite(n) && n > 0) L.keepsakes[w.recipe] = Math.min(99, n | 0); const c = o.crafted?.[w.recipe]; if (typeof c === 'number') L.crafted[w.recipe] = c; }
    return L;
  } catch { return emptyLife(); }
}
export function saveLife(storage, L) { try { storage?.setItem?.(ROW_SAVE_KEY, JSON.stringify(L)); } catch {} }
export function xpOf(L, id, dayIdx) {
  const met = L.met[id]?.days.length || 0;
  const lessons = (L.apprentice?.id === id ? L.apprentice.lessons : 0) + (L.graduated.includes(id) ? LESSONS_TO_GRADUATE : 0);
  return Math.max(0, dayIdx) + met + lessons * 2;
}
export const isForeman = (L, id, dayIdx) => xpOf(L, id, dayIdx) >= FOREMAN_XP;

/** talk to a worker: remembers the day, returns the greeting. Pure apart from mutating L. */
export function talk(L, id, { day, playerName = 'pup', sec = 0, rain = false, dayIdx = 0 } = {}) {
  const w = workerById(id); if (!w) return null;
  const m = (L.met[id] ||= { days: [], talks: 0 });
  const first = m.talks === 0;
  const newDay = !m.days.includes(day);
  if (newDay) m.days.push(day);
  m.talks++;
  const name = String(playerName || 'pup').slice(0, 16);
  const foremanNow = isForeman(L, id, dayIdx);
  const at = workerAt(w, sec, { rain });
  const doing = at.kind === 'work' ? WORKPLACES[w.lot]?.verb : at.kind === 'walk' ? (at.carry ? `taking ${at.carry} to the ${lotById(at.to)?.name || 'next stop'}` : 'heading back') : at.kind === 'lunch' ? 'on my lunch break' : 'between jobs';
  let line;
  if (first) line = `Hi, I'm ${w.name}, the ${w.job.toLowerCase()} at the ${WORKPLACES[w.lot]?.name || 'yard'}. I'm ${doing}. Nice to meet you, ${name}!`;
  else if (newDay) line = `${name}! Good to see you again. That's ${m.days.length} days you've come by. I'm ${doing}.`;
  else line = `Back again, ${name}? I'm ${doing}.`;
  if (foremanNow) line += ' I run the crew here now. Foreman!';
  return { line, first, newDay, days: m.days.length, foreman: foremanNow, xp: xpOf(L, id, dayIdx) };
}
export function startApprentice(L, id) {
  if (!workerById(id)) return { ok: false, reason: 'Unknown workplace' };
  if (L.graduated.includes(id)) return { ok: false, reason: 'You already trained here' };
  if (L.apprentice && L.apprentice.id !== id && L.apprentice.lessons < LESSONS_TO_GRADUATE) return { ok: false, reason: `You are training with ${workerById(L.apprentice.id).name}` };
  L.apprentice = { id, lessons: 0, lastHour: -1 };
  return { ok: true };
}
/** one lesson per sky hour, only while the worker is at work. absHour = whole sky hours since day 0. */
export function lesson(L, id, { sec, absHour, rain = false }) {
  const w = workerById(id);
  if (!w || L.apprentice?.id !== id) return { ok: false, reason: 'Sign up as an apprentice first' };
  if (workerAt(w, sec, { rain }).kind !== 'work') return { ok: false, reason: `${w.name} is not at the bench right now` };
  if (L.apprentice.lastHour === absHour) return { ok: false, reason: 'One lesson per hour. Come back in a bit' };
  L.apprentice.lessons++;
  L.apprentice.lastHour = absHour;
  if (L.apprentice.lessons >= LESSONS_TO_GRADUATE) { L.graduated.push(id); L.apprentice = null; return { ok: true, graduated: true, recipe: w.recipe }; }
  return { ok: true, lessons: L.apprentice.lessons };
}
export const recipesOf = (L) => L.graduated.map((id) => workerById(id).recipe);
/** craft a keepsake you have learned. Once per sky day per recipe. Keepsakes are display items only. */
export function craft(L, recipe, skyDay) {
  if (!recipesOf(L).includes(recipe)) return { ok: false, reason: 'Learn it first with an apprenticeship' };
  if (L.crafted[recipe] === skyDay) return { ok: false, reason: 'Made one already today' };
  L.crafted[recipe] = skyDay;
  L.keepsakes[recipe] = Math.min(99, (L.keepsakes[recipe] || 0) + 1);
  return { ok: true, count: L.keepsakes[recipe] };
}

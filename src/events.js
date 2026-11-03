// Daily world events (Alive phase 5). ONE featured event per Sydney calendar day, picked deterministically from the date so every
// player (and the server) agrees with no network call: Market Day, Festival, Wandering Trader, Fishing Derby, Garden Show.
// Pure module (no DOM): shared by the browser (src/eventsui.js draws + runs it) and /api/feed (validates event feed posts).
// REWARDS: cosmetic keepsakes ONLY ("event gear": a floating balloon / kite / lantern / pinwheel carried beside your Inu). Bones in
// Inu Verse live client-side only (state.bones in the browser save) and there is NO server-side Bones grant path, so events never
// grant Bones at all. Trader items cost Bones (a client-side spend, like the wardrobe) and can be swapped item-for-item for free.
// Never $KIBBLE, no wagers, no entry fees, no random draws: participation keepsakes are earned once by doing the activity.
import { TILE, isSolid } from './world.js';

export const EVENT_IDS = Object.freeze(['market', 'festival', 'trader', 'derby', 'garden']);
const t = (tx, ty) => Object.freeze([tx, ty]);
// activity: what "taking part" means (visit N marked spots / catch N fish). area = the named spot id (src/ghosts.js SPOTS) where it
// happens; the server checks it for feed posts.
export const EVENTS = Object.freeze({
  market: { id: 'market', name: 'Market Day', short: 'MARKET', area: 'market', blurb: 'Extra stalls at the Farmers Market', goal: { kind: 'visit', n: 3, verb: 'Browse', what: 'market stalls' }, keepsake: 'apple' },
  festival: { id: 'festival', name: 'Lantern Festival', short: 'FESTIVAL', area: 'plaza', blurb: 'Bunting, lanterns and confetti in Kibble Plaza', goal: { kind: 'visit', n: 3, verb: 'Light', what: 'festival lanterns' }, keepsake: 'pinwheel' },
  trader: { id: 'trader', name: 'Wandering Trader', short: 'TRADER', area: null, blurb: 'Biscuit the trader is in town with keepsakes', goal: null, keepsake: null },
  derby: { id: 'derby', name: 'Fishing Derby', short: 'DERBY', area: 'pond', blurb: 'Catch fish at the Fishing Pond', goal: { kind: 'fish', n: 3, verb: 'Catch', what: 'fish at the pond' }, keepsake: 'koikite' },
  garden: { id: 'garden', name: 'Garden Show', short: 'GARDEN', area: 'chapel', blurb: 'Prize flower beds in the community garden', goal: { kind: 'visit', n: 3, verb: 'Admire', what: 'show flower beds' }, keepsake: 'sunflower' },
});
// cosmetic-only keepsakes. price: Bones at the trader (client-side spend); ev: the event whose activity awards it free (once).
export const GEAR = Object.freeze({
  lantern: { id: 'lantern', name: 'Paper Lantern', kind: 'lantern', price: 120, ev: 'trader' },
  star: { id: 'star', name: 'Star Balloon', kind: 'balloon', price: 80, ev: 'trader' },
  bonekite: { id: 'bonekite', name: 'Bone Kite', kind: 'kite', price: 150, ev: 'trader' },
  apple: { id: 'apple', name: 'Apple Balloon', kind: 'balloon', price: 0, ev: 'market' },
  pinwheel: { id: 'pinwheel', name: 'Paw Pinwheel', kind: 'pinwheel', price: 0, ev: 'festival' },
  koikite: { id: 'koikite', name: 'Koi Kite', kind: 'kite', price: 0, ev: 'derby' },
  sunflower: { id: 'sunflower', name: 'Sunflower Balloon', kind: 'balloon', price: 0, ev: 'garden' },
});
export const TRADER_STOCK = Object.freeze(['lantern', 'star', 'bonekite']);
export const TRADER = Object.freeze({ name: 'Biscuit', title: 'Biscuit the Wandering Trader', coat: 'cream', outfit: Object.freeze({ hat: 'top_hat', neck: 'bowtie' }) });
// where the trader parks the cart (a different spot each trader day). Each tile is walkable, off the road, and inside its area.
export const TRADER_SPOTS = Object.freeze([{ area: 'plaza', at: t(13, 48) }, { area: 'market', at: t(31, 100) }, { area: 'pond', at: t(17, 96) }, { area: 'chapel', at: t(23, 92) }]);
// per-event scenery (tile coords). stalls/lanterns/beds are also the "visit" targets of the activity.
export const SCENERY = Object.freeze({
  market: { stalls: [t(17, 99), t(27, 100), t(19, 96)] },
  festival: { lanterns: [t(8, 47), t(11, 47), t(17, 47), t(27, 47), t(33, 48), t(24, 53)], strands: [[0, 1], [1, 2], [2, 3], [3, 4]], confetti: { x0: 6, y0: 45, x1: 34, y1: 58 } },
  derby: { poles: [t(5, 96), t(16, 96)], buoys: [t(8, 99), t(11, 98), t(14, 100)], sign: t(18, 95) },
  garden: { beds: [t(19, 90), t(22, 90), t(26, 90), t(29, 90)], sign: t(24, 92) },
});
export const CAPS = Object.freeze({ confetti: 36, confettiLow: 0, visitR: 44, traderR: 46, lanternR: 44 });

// ---- deterministic daily pick ----
const SYD = (() => { try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }); } catch { return null; } })();
// 'YYYY-MM-DD' of the Sydney calendar day at nowMs (DST-aware via Intl; fallback +10 h if Intl has no tz data)
export function sydneyDay(nowMs = Date.now()) { if (SYD) { const p = {}; for (const x of SYD.formatToParts(new Date(nowMs))) p[x.type] = x.value; return `${p.year}-${p.month}-${p.day}`; }
  return new Date(nowMs + 10 * 3600_000).toISOString().slice(0, 10); }
export const dayNumber = (key) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || ''); return m ? Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 864e5) : 0; };
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (seed) => () => { seed = (seed + 0x6d2b79f5) >>> 0; let x = seed; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const N = EVENT_IDS.length;
// a fresh shuffled order of all events every N-day cycle (each event exactly once per cycle), never the same event two days in a row
function cycleOrder(c) { const R = rng(hash('inu-events:' + c)), o = [...EVENT_IDS]; for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return o; }
const ORDERS = new Map();
function orderFor(c) { let o = ORDERS.get(c); if (o) return o; o = cycleOrder(c); const prev = cycleOrder(c - 1); // (prev unadjusted is fine: only its last slot matters and the fix only touches slots 0/1)
  if (o[0] === prev[N - 1]) [o[0], o[1]] = [o[1], o[0]]; if (ORDERS.size > 64) ORDERS.clear(); ORDERS.set(c, o); return o; }
export function eventForDay(dayNum) { const c = Math.floor(dayNum / N), i = dayNum - c * N; return orderFor(c)[i]; }
// the featured event at nowMs: { id, day (YYYY-MM-DD), dayNum, def, trader spot (trader days), forced }
export function eventToday(nowMs = Date.now(), override = null) { const day = sydneyDay(nowMs), dayNum = dayNumber(day), forced = EVENT_IDS.includes(override);
  const id = forced ? override : eventForDay(dayNum); return { id, day, dayNum, def: EVENTS[id], forced, spot: id === 'trader' ? traderSpot(dayNum) : null }; }
export const traderSpot = (dayNum) => TRADER_SPOTS[hash('inu-trader:' + dayNum) % TRADER_SPOTS.length];
// ?event=market|festival|trader|derby|garden (debug / proof only: changes what this browser shows, never what the server accepts)
export function parseEventParam(search) { try { const v = new URLSearchParams(search || '').get('event'); return EVENT_IDS.includes(v) ? v : null; } catch { return null; } }
// event area for feed validation: trader -> today's cart spot, others -> their fixed area
export function eventArea(ev) { return ev.id === 'trader' ? ev.spot.area : ev.def.area; }

// ---- player progress + keepsakes (state.evgear in the browser save) ----
export function ensureGear(s) { const g = (s.evgear && typeof s.evgear === 'object') ? s.evgear : (s.evgear = {});
  if (!Array.isArray(g.owned)) g.owned = []; g.owned = g.owned.filter((k, i, a) => GEAR[k] && a.indexOf(k) === i);
  if (g.carry != null && !g.owned.includes(g.carry)) g.carry = null;
  if (!g.prog || typeof g.prog !== 'object') g.prog = { day: '', ev: '', hit: [], n: 0 }; if (!Array.isArray(g.prog.hit)) g.prog.hit = [];
  if (!g.swap || typeof g.swap !== 'object') g.swap = { day: '', n: 0 }; return g; }
export const owns = (s, k) => ensureGear(s).owned.includes(k);
function progFor(s, ev) { const g = ensureGear(s); if (g.prog.day !== ev.day || g.prog.ev !== ev.id) g.prog = { day: ev.day, ev: ev.id, hit: [], n: 0, done: false }; return g.prog; }
export function progress(s, ev) { const goal = ev.def.goal; if (!goal) return null; const p = progFor(s, ev); return { n: Math.min(goal.n, p.n), of: goal.n, done: !!p.done }; }
// one "visit" (stall / lantern / bed index) or "fish" step. Returns { counted, earned: gear id | null, already } — the keepsake is
// earned once ever (participation, free); repeats on later days just complete the goal. Never touches Bones.
export function addProgress(s, ev, kind, key = null) { const goal = ev.def.goal; if (!goal || goal.kind !== kind) return { counted: false };
  const p = progFor(s, ev); if (p.done) return { counted: false, done: true };
  if (kind === 'visit') { const k = String(key); if (p.hit.includes(k)) return { counted: false }; p.hit.push(k); }
  p.n = Math.min(goal.n, (p.n || 0) + 1); if (p.n < goal.n) return { counted: true, n: p.n, of: goal.n };
  p.done = true; const g = ensureGear(s), gid = ev.def.keepsake; if (gid && !g.owned.includes(gid)) { g.owned.push(gid); if (g.carry == null) g.carry = gid; return { counted: true, n: p.n, of: goal.n, earned: gid }; }
  return { counted: true, n: p.n, of: goal.n, already: gid }; }
// trader: buy a stock item for Bones (client-side spend, like the wardrobe). Only on a trader day, only next to the cart.
export function traderBuy(s, ev, gid, near) { const G = GEAR[gid]; if (ev.id !== 'trader') return { ok: false, reason: 'The trader is not in town today' };
  if (!G || !TRADER_STOCK.includes(gid)) return { ok: false, reason: 'Not for sale' }; if (!near) return { ok: false, reason: 'Walk up to the trader cart first' };
  const g = ensureGear(s); if (g.owned.includes(gid)) return { ok: false, reason: 'You already have one' };
  if (!(Number(s.bones) >= G.price)) return { ok: false, reason: `Need ${G.price} Bones` }; s.bones -= G.price; g.owned.push(gid); g.carry = gid; return { ok: true, gid, cost: G.price }; }
// trader: swap one owned trader item for another (free, item-for-item, 1 swap per day)
export function traderSwap(s, ev, give, get, near) { if (ev.id !== 'trader') return { ok: false, reason: 'The trader is not in town today' }; if (!near) return { ok: false, reason: 'Walk up to the trader cart first' };
  const g = ensureGear(s); if (!TRADER_STOCK.includes(give) || !TRADER_STOCK.includes(get) || give === get) return { ok: false, reason: 'Pick two different trader items' };
  if (!g.owned.includes(give)) return { ok: false, reason: 'You do not have that' }; if (g.owned.includes(get)) return { ok: false, reason: 'You already have one' };
  if (g.swap.day === ev.day && g.swap.n >= 1) return { ok: false, reason: 'One swap per day' };
  g.owned = g.owned.filter((k) => k !== give); g.owned.push(get); if (g.carry === give || g.carry == null) g.carry = get; g.swap = { day: ev.day, n: 1 }; return { ok: true, give, get }; }
export function carry(s, gid) { const g = ensureGear(s); g.carry = gid && g.owned.includes(gid) ? gid : null; return g.carry; }

// ---- geometry helpers (shared with tests) ----
export const tileCenter = ([tx, ty]) => ({ x: (tx + 0.5) * TILE, y: (ty + 0.8) * TILE });
export function targetsFor(ev) { const S = SCENERY[ev.id]; if (!S) return []; return (S.stalls || S.lanterns || S.beds || []).map((p, i) => ({ i, ...tileCenter(p), tx: p[0], ty: p[1] })); }
export const sceneryOk = () => Object.values(SCENERY).every((S) => [...(S.stalls || []), ...(S.lanterns || []), ...(S.beds || [])].every(([x, y]) => !isSolid(x, y)));

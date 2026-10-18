// Townsfolk free will: needs + personality-driven utility AI. Pure & deterministic given a seeded rng.
// Needs (0 = desperate, 1 = satisfied): hunger, energy, social, fun, money. Every in-game hour needs decay, the current
// activity restores some, and each NPC re-scores activities (with inertia). Movement is delegated: we set n.goal (tile).
import { BUILDINGS, MALL_BUILDINGS, NPC_HOMES, POND, FORECOURT, CHAPEL, FIELDS, MARKET, doorTile, isSolid, MAP, T, TILE } from './world.js';
import { LOTS } from './biz.js';
export const NEEDS = ['hunger', 'energy', 'social', 'fun', 'money'];
const B = (id) => [...BUILDINGS, ...MALL_BUILDINGS].find((b) => b.id === id);
const front = (b, off = 0) => { const d = doorTile(b); return [d.tx + off, d.ty + (d.side === 'front' ? 1 : 0)]; };
const lotFront = (id) => { const L = LOTS.find((l) => l.id === id); return [L.x + 2, L.y + L.h]; };
export const PLACES = {
  cafe: front(B('cafe'), 2), launch: front(B('launch'), 2), mall: [32, 60], fashion: front(B('fashion')), jewel: front(B('jewel')), farm: [FIELDS[1].x + 2, FIELDS[1].y + FIELDS[1].h], market: [MARKET.x + 2, MARKET.y + MARKET.h],
  pond: [POND.x + POND.w + 1, POND.y + 2], plaza: [FORECOURT.x + 3, FORECOURT.y + 11], chapel: [CHAPEL.x + 3, CHAPEL.y + CHAPEL.h + 1], P2: lotFront('P2'), L3: lotFront('L3'),
};
export const JOB_SPOTS = { barista: 'cafe', trader: 'launch', clerk: 'mall', farmer: 'farm', vendor: 'market', florist: 'P2', baker: 'L3', stylist: 'fashion' };
export const TOWNSFOLK = {
  Mochi: { job: 'barista', home: 'h1', p: { diligent: 0.8, social: 0.7, playful: 0.4, thrifty: 0.5, grumpy: 0.1 } },
  Kuro: { job: 'trader', home: 'h2', p: { diligent: 0.6, social: 0.3, playful: 0.3, thrifty: 0.8, grumpy: 0.6 } },
  Hana: { job: 'florist', home: 'h3', shop: 'P2', p: { diligent: 0.7, social: 0.8, playful: 0.5, thrifty: 0.4, grumpy: 0.2 } },
  Taro: { job: 'baker', home: 'h4', shop: 'L3', p: { diligent: 0.9, social: 0.4, playful: 0.2, thrifty: 0.6, grumpy: 0.5 } },
  Yuzu: { job: 'farmer', home: 'farm-cottage', p: { diligent: 0.5, social: 0.6, playful: 0.9, thrifty: 0.3, grumpy: 0.2 } },
  Goma: { job: 'vendor', home: 'market-flat', p: { diligent: 0.4, social: 0.9, playful: 0.7, thrifty: 0.2, grumpy: 0.3 } },
};
const HOMES = Object.fromEntries([...NPC_HOMES.map((h) => [h.id, [h.x + 2, h.y + h.h + 1]]), ['farm-cottage', [FIELDS[0].x + 1, FIELDS[0].y - 2]], ['market-flat', [MARKET.x - 2, MARKET.y + 4]]]);
// door tiles of every building: townsfolk never park on these
export const DOOR_TILES = new Set([...BUILDINGS, ...MALL_BUILDINGS].map((b) => { const d = doorTile(b); return d.ty * 1000 + d.tx; }));
const okStand = (x, y) => !isSolid(x, y) && !DOOR_TILES.has(y * 1000 + x) && !DOOR_TILES.has((y - 1) * 1000 + x) && MAP[y]?.[x] !== T.ROAD;
// a free standing tile near an anchor (deterministic ring search, avoids doors, roads and tiles other NPCs claimed)
export function standNear([ax, ay], taken = new Set(), salt = 0) { for (let r = 0; r < 6; r++) { const ring = []; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r) ring.push([ax + dx, ay + dy]);
    for (let i = 0; i < ring.length; i++) { const [x, y] = ring[(i + salt) % ring.length]; if (okStand(x, y) && !taken.has(y * 1000 + x)) return [x, y]; } } return [ax, ay]; }
// activity table: where, which needs it restores per in-game hour, schedule weight by hour
const sched = (h, from, to) => (from <= to ? h >= from && h < to : h >= from || h < to);
export const ACTS = {
  work: { gain: { money: 0.22, energy: -0.05, fun: -0.03 }, hours: (h) => (sched(h, 9, 17) ? 1.4 : sched(h, 7, 9) || sched(h, 17, 19) ? 0.5 : 0.05) },
  eat: { at: 'cafe', gain: { hunger: 0.7, money: -0.06, social: 0.08 }, hours: (h) => (sched(h, 7, 9) || sched(h, 12, 14) || sched(h, 18, 20) ? 1.3 : sched(h, 22, 6) ? 0.12 : 0.6) },
  shop: { at: 'mall', gain: { fun: 0.25, money: -0.1 }, hours: (h) => (sched(h, 10, 20) ? 1 : 0.1) },
  fish: { at: 'pond', gain: { fun: 0.22, energy: 0.03 }, hours: (h) => (sched(h, 6, 19) ? 1 : 0.2) },
  visit: { gain: { social: 0.4, fun: 0.08 }, hours: (h) => (sched(h, 10, 21) ? 1 : 0.15) },
  nap: { gain: { energy: 0.22, hunger: 0.05 }, hours: (h) => (sched(h, 22, 6) ? 2.2 : sched(h, 13, 15) ? 0.5 : 0.25) },
  event: { at: 'plaza', gain: { social: 0.3, fun: 0.3 }, hours: (h) => (sched(h, 18, 21) ? 1.2 : 0) },
  president: { gain: { fun: 0.35, social: 0.12 }, hours: () => 1 },
};
const DECAY = { hunger: 0.075, energy: 0.05, social: 0.05, fun: 0.045, money: 0.025 };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
export function makeTown(rng) { const town = { folk: {}, rel: {}, shops: {}, log: [], hour: -1, day: 0, seed: Math.floor(rng() * 1e9) };
  for (const [name, d] of Object.entries(TOWNSFOLK)) town.folk[name] = { name, job: d.job, home: d.home, shop: d.shop || null, p: d.p, needs: Object.fromEntries(NEEDS.map((k) => [k, 0.5 + rng() * 0.4])), act: 'nap', actH: 0, mood: 'ok', history: [], workedToday: 0 };
  for (const [name, d] of Object.entries(TOWNSFOLK)) if (d.shop) town.shops[d.shop] = { owner: name, open: true, broke: 0 };
  return town; }
const key = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
export const aff = (town, a, b) => town.rel[key(a, b)] || 0;
export const friendsOf = (town, a) => Object.keys(town.folk).filter((b) => b !== a && aff(town, a, b) >= 30);
export const rivalsOf = (town, a) => Object.keys(town.folk).filter((b) => b !== a && aff(town, a, b) <= -20);
const moodOf = (f) => { const avg = NEEDS.reduce((t, k) => t + f.needs[k], 0) / NEEDS.length; return avg > 0.62 ? 'happy' : avg < 0.35 ? 'grumpy' : 'ok'; };
export function note(town, text, about = null) { town.log.unshift({ day: town.day, hour: town.hour, text, about }); town.log.length = Math.min(town.log.length, 40); }
// score every activity for one townsfolk at an hour
export function scores(town, f, hour, ctx = {}) { const N = f.needs, P = f.p, out = {}, shopClosed = f.shop && !town.shops[f.shop]?.open;
  for (const [a, A] of Object.entries(ACTS)) { let u = 0;
    if (a === 'work') u = (1 - N.money) * 1.2 + P.diligent * 0.9 - (1 - N.energy) * 0.5 + (shopClosed ? -0.3 : 0);
    if (a === 'eat') u = (1 - N.hunger) * 1.8 - (N.money < 0.1 ? 0.4 : 0);
    if (a === 'shop') u = (1 - N.fun) * 0.8 + N.money * 0.5 * (1 - P.thrifty) - P.thrifty * 0.3;
    if (a === 'fish') u = (1 - N.fun) * 0.7 + P.playful * 0.3 - P.social * 0.2;
    if (a === 'visit') u = friendsOf(town, f.name).length || P.social > 0.5 ? (1 - N.social) * 1.3 * (0.5 + P.social) : (1 - N.social) * 0.4;
    if (a === 'nap') u = (1 - N.energy) * 1.6 + (sched(hour, 22, 6) ? 0.35 : 0);
    if (a === 'event') u = ((1 - N.social) + (1 - N.fun)) * 0.6 * (0.4 + P.social);
    if (a === 'president') u = ctx.president ? 0.35 + P.playful * 0.7 + P.social * 0.2 + (1 - N.fun) * 0.5 - P.diligent * (sched(hour, 9, 17) ? 0.4 : 0) : -9;
    u *= A.hours(hour); if (f.mood === 'grumpy' && (a === 'visit' || a === 'event')) u *= 0.6; if (a === f.act && f.actH < 2) u += 0.25; out[a] = u; }
  return out; }
function placeFor(town, f, act, ctx) { if (act === 'work') return PLACES[JOB_SPOTS[f.job]]; if (act === 'nap') return HOMES[f.home]; if (act === 'president') return ctx.president ? [Math.floor(ctx.president.x / TILE) + 2, Math.floor(ctx.president.y / TILE) + 1] : PLACES.plaza;
  if (act === 'visit') { const fr = friendsOf(town, f.name).sort((a, b) => aff(town, f.name, b) - aff(town, f.name, a))[0] || Object.keys(town.folk).find((x) => x !== f.name && town.folk[x].act !== 'nap'); f.visiting = fr || null; const o = fr && town.folk[fr]; return o ? (o.act === 'nap' ? HOMES[o.home] : o.goal || HOMES[o.home]) : PLACES.plaza; }
  return PLACES[ACTS[act].at]; }
// one in-game hour for the whole town. Returns events. ctx: { rng, hour, day, president, player:{x,y} }
export function townHour(town, ctx) { const { rng, hour } = ctx, ev = []; if (!ctx.replan && ctx.day !== undefined && ctx.day !== town.day) { dayEnd(town, ev, rng); town.day = ctx.day; }
  town.hour = hour; const taken = new Set();
  for (const f of Object.values(town.folk)) { const A = ACTS[f.act];
    if (!ctx.replan) for (const k of NEEDS) f.needs[k] = clamp01(f.needs[k] - DECAY[k] + ((f.arrived ? A.gain[k] : 0) || 0) + (f.act === 'nap' && k === 'energy' ? 0 : 0));
    if (f.act === 'work' && f.arrived && !ctx.replan) f.workedToday++;
    f.mood = moodOf(f); const sc = scores(town, f, hour, ctx), keys = Object.keys(sc); let best = keys[0];
    const jit = Object.fromEntries(keys.map((a) => [a, sc[a] + rng() * 0.3])); for (const a of keys) if (jit[a] > jit[best]) best = a;
    if (best !== f.act) { f.act = best; f.actH = 0; f.arrived = false; f.history.push([town.day, hour, best]); if (f.history.length > 60) f.history.shift(); ev.push({ kind: 'act', who: f.name, act: best }); } else f.actH++;
    f.goal = standNear(placeFor(town, f, f.act, ctx), taken, f.name.length); taken.add(f.goal[1] * 1000 + f.goal[0]); }
  if (!ctx.replan) socialise(town, ev, rng); return ev; }
// townsfolk at the same place (or one visiting another) bond; grumpy pairs + shop rivals clash
function socialise(town, ev, rng) { const F = Object.values(town.folk);
  for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) { const a = F[i], b = F[j]; if (!a.arrived || !b.arrived || !a.goal || !b.goal) continue;
    if (Math.hypot(a.goal[0] - b.goal[0], a.goal[1] - b.goal[1]) > 3.5) continue; const k = key(a.name, b.name), before = town.rel[k] || 0;
    const clash = (a.mood === 'grumpy' && b.mood === 'grumpy') || (a.shop && b.shop && a.p.grumpy + b.p.grumpy > 0.6) ? 1 : 0;
    const d = clash ? -(4 + rng() * 5) : 3 + (a.p.social + b.p.social) * 4 - Math.abs(a.p.grumpy - b.p.grumpy) * 3 + rng() * 2;
    town.rel[k] = Math.max(-100, Math.min(100, before + d));
    if (before < 30 && town.rel[k] >= 30) { note(town, `${a.name} and ${b.name} are friends now - always together at the ${a.act === 'visit' ? 'house' : a.act}.`); ev.push({ kind: 'friends', a: a.name, b: b.name }); }
    if (before > -20 && town.rel[k] <= -20) { note(town, `${a.name} and ${b.name} had words... a rivalry is brewing.`); ev.push({ kind: 'rivals', a: a.name, b: b.name }); } } }
function dayEnd(town, ev, rng) { for (const f of Object.values(town.folk)) {
    if (f.shop) { const s = town.shops[f.shop];
      if (s.open) { s.broke = f.needs.money < 0.2 || f.workedToday < 2 ? s.broke + 1 : 0; if (s.broke >= 2) { s.open = false; note(town, `${f.name} closed the shop on lot ${f.shop}. Times are tough.`, f.name); ev.push({ kind: 'shopClosed', who: f.name, lot: f.shop }); } }
      else if (f.needs.money > 0.55 && f.needs.fun > 0.3) { s.open = true; s.broke = 0; note(town, `${f.name} reopened the shop on lot ${f.shop}! Go say hi.`, f.name); ev.push({ kind: 'shopOpened', who: f.name, lot: f.shop }); } }
    // unhappy at work for a while -> change job (shop owners keep theirs)
    if (!f.shop && f.needs.fun < 0.25 && f.needs.money > 0.4 && rng() < 0.5) { const opts = Object.keys(JOB_SPOTS).filter((j) => j !== f.job && !['florist', 'baker'].includes(j)); const nj = opts[Math.floor(rng() * opts.length)]; note(town, `${f.name} quit being a ${f.job} and became a ${nj}!`, f.name); ev.push({ kind: 'job', who: f.name, from: f.job, to: nj }); f.job = nj; }
    f.workedToday = 0; } }
// ---- Taro's morning bread round (Sydney time) ----
// Taro, who owns Taro Bakes on lot L3, walks the same delivery round every morning by the real Australia/Sydney clock:
// loads up at the bakery at 06:00, then drops fresh bread at the café, the market, the plaza and the mall, half an hour
// per stop, and is back at the bakery with an empty basket at 08:30. Purely cosmetic: it only steers where he walks.
export const BREAD_ROUND = Object.freeze({ who: 'Taro', from: 6 * 60, slot: 30, stops: Object.freeze(['L3', 'cafe', 'market', 'plaza', 'mall', 'L3']) });
const SYD = typeof Intl !== 'undefined' ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Australia/Sydney', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) : null;
// minutes since midnight in Australia/Sydney (DST-aware) for an epoch ms
export function sydneyMinutes(now = Date.now()) { const p = SYD.formatToParts(new Date(now)), h = +p.find((x) => x.type === 'hour').value, m = +p.find((x) => x.type === 'minute').value; return (h % 24) * 60 + m; }
// where Taro's round has him at a Sydney minute: null outside the round, else { stop, idx, goal [tx,ty], carrying }
export function breadRound(min) { const R = BREAD_ROUND, k = Math.floor((min - R.from) / R.slot); if (min < R.from || k >= R.stops.length) return null;
  const stop = R.stops[k]; return { stop, idx: k, goal: PLACES[stop], carrying: k < R.stops.length - 1 }; }
const STOP_NAME = { L3: 'the bakery', cafe: 'the café', market: 'the market', plaza: 'the plaza', mall: 'the mall' };
// things the player did, so townsfolk can talk about them
export function playerDid(town, text) { note(town, text, 'you'); }
const ACT_LINE = { work: (f) => `On shift as a ${f.job}.`, eat: () => 'Grabbing a bite at the café.', shop: () => 'Window shopping at the mall!', fish: () => 'Fishing by the pond. Shh.', visit: (f) => (f.visiting ? `Off to see ${f.visiting}.` : 'Just visiting friends.'), nap: () => 'Zzz... so sleepy.', event: () => 'The plaza party is on!', president: () => 'President Inu is here!!' };
const MOOD_OPEN = { happy: ['What a day!', 'Feeling great!'], ok: ['Hey there.', 'Oh, hi!'], grumpy: ['Hmph.', 'Not now...'] };
// what a townsfolk says to you right now: mood, activity, then gossip or a comment on what you did
export function lineFor(town, name, rng = Math.random) { const f = town.folk[name]; if (!f) return null; const open = MOOD_OPEN[f.mood][Math.floor(rng() * 2)];
  const mine = town.log.find((l) => l.about === 'you'), gossip = town.log.find((l) => l.about !== 'you' && !l.text.startsWith(name));
  const tail = mine && rng() < 0.6 ? (f.mood === 'grumpy' ? `I heard ${mine.text.replace(/^You /, 'you ')} Big deal.` : `I heard ${mine.text.replace(/^You /, 'you ')} Nice!`) : gossip ? `Did you hear? ${gossip.text}` : rivalsOf(town, name).length ? `Don't get me started on ${rivalsOf(town, name)[0]}.` : '';
  const doing = f.round ? (f.round.carrying ? (f.round.idx === 0 ? 'Loading up the morning bread!' : `Fresh bread for ${STOP_NAME[f.round.stop]}!`) : 'Bread round done. Back to the ovens.') : ACT_LINE[f.act](f);
  return `${open} ${doing} ${tail}`.trim(); }

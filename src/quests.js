// Daily Quests (town errands): 3 quests per Sydney day, the same for everyone and deterministic from the date, each given by a named
// townsfolk (src/townsfolk.js). Kinds: deliver something to another townsfolk, find a lost item near a spot, catch fish, visit a
// place, say hi to townsfolk, and one tie-in with the day's world event (src/events.js). Rewards: Bones only, paid client-side through
// the SAME earnBones() save path the job shifts use (src/jobs.js finishJob), with a hard daily cap below one job shift's pay cap, plus an
// occasional cosmetic sticker (finish the whole board on a sticker day) and a "Town Helper" badge. Bones are free in-game points that
// are never cashed out. Never $KIBBLE: no wallet, no fees, no wagers, no random paid draws. Pure + testable; UI in src/questsui.js.
import { FOLK_NAMES } from './townsfolk.js';
import { EVENTS, sydneyDay, dayNumber } from './events.js';
import { earnBones, wornBonesBonus } from './outfits.js';
import { JOBS } from './jobs.js';

// reward per quest kind (Bones) and the daily cap. Cap scale: one job shift's performance pay is capped at 90-120 Bones
// (JOBS[*].cap); a full quest board pays at most QUEST_DAILY_CAP, i.e. less than a single capped shift, outfit bonus included.
export const REWARD = Object.freeze({ deliver: 25, find: 25, event: 25, greet: 20, fish: 20, visit: 15 });
export const QUEST_DAILY_CAP = 75;
export const JOB_SHIFT_CAP_MIN = Math.min(...Object.values(JOBS).map((j) => j.cap));
export const QUESTS_PER_DAY = 3;
// recipients / greet targets come from the first FOLK_CAPS.low townsfolk so they are out even in low-effects mode
export const NEAR_FOLK = Object.freeze(FOLK_NAMES.slice(0, 6));
export const DELIVER_ITEMS = Object.freeze(['a coffee', 'a fresh bun', 'a letter', 'a bone biscuit', 'a bunch of flowers', 'a lost library book']);
export const LOST_ITEMS = Object.freeze(['ball', 'squeaky toy', 'frisbee', 'scarf', 'bell', 'chew rope']);
export const FIND_SPOTS = Object.freeze({ pond: 'the pond', park: 'the park', plaza: 'Kibble Plaza', market: 'the Farmers Market', chapel: 'the Park Chapel', mall: 'the Mall fountain' });
// place id -> label (ids from world.js interactables(); the client resolves their door tiles)
export const VISIT_PLACES = Object.freeze({ arcade: 'the Inu Arcade', cafe: 'Shiba Sips Café', bank: 'the Kibble Bank', chapel: 'the Park Chapel', market: 'the Farmers Market', leaders: 'Leaderboards Hall', mall: 'the Kibble Mall', fashion: 'Fetch Fashion' });
export const EVENT_TIE = Object.freeze({
  market: { short: 'STALL', text: 'browse a Market Day stall', why: 'wants the pick of the Market Day produce' },
  festival: { short: 'LANTERN', text: 'light a festival lantern', why: 'loves the Lantern Festival' },
  derby: { short: 'DERBY FISH', text: 'catch a fish at the Derby', why: 'is cheering at the Fishing Derby' },
  garden: { short: 'GARDEN BED', text: 'admire a Garden Show bed', why: 'entered the Garden Show' },
  trader: { short: 'HI BISCUIT', text: 'say hello to Biscuit the trader', why: 'heard the Wandering Trader is in town' },
});
// cosmetic stickers: one per "sticker day" when the whole board is finished (no Bones, nothing to buy). In order, never random.
export const STICKERS = Object.freeze([
  { id: 'pawstamp', name: 'Paw Stamp', icon: '🐾' }, { id: 'goldbone', name: 'Gold Bone', icon: '🦴' }, { id: 'coffee', name: 'Café Cup', icon: '☕' },
  { id: 'ball', name: 'Lost Ball', icon: '⚽' }, { id: 'hook', name: 'Fish Hook', icon: '🎣' }, { id: 'lantern', name: 'Paper Lantern', icon: '🏮' },
]);
export const HELPER_BADGE = '📜', HELPER_AT = 5; // badge after 5 full boards

const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (seed) => () => { seed = (seed + 0x6d2b79f5) >>> 0; let x = seed; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const shuffle = (a, R) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a, R) => a[Math.floor(R() * a.length)];
export const stickerDay = (day) => hash('inu-sticker:' + day) % 3 === 0; // roughly one day in three

// the 3 quests for a Sydney day key 'YYYY-MM-DD' and that day's event id. Same inputs -> same quests, for everyone.
export function questsFor(day, evId) { const R = rng(hash('inu-quests:' + day)), givers = shuffle(FOLK_NAMES, R), out = [];
  if (EVENTS[evId]) { const T = EVENT_TIE[evId]; out.push({ kind: 'event', ev: evId, giver: givers[0], text: `${givers[0]} ${T.why}: ${T.text}`, n: 1 }); }
  const pool = shuffle(['deliver', 'find', 'fish', 'visit', 'greet'].filter((k) => !(evId === 'derby' && k === 'fish')), R);
  for (const kind of pool) { if (out.length >= QUESTS_PER_DAY) break; const g = givers[out.length];
    if (kind === 'deliver') { const to = pick(NEAR_FOLK.filter((n) => n !== g), R), item = pick(DELIVER_ITEMS, R); out.push({ kind, giver: g, to, item, text: `${g} needs ${item} delivered to ${to}`, n: 1 }); }
    else if (kind === 'find') { const spot = pick(Object.keys(FIND_SPOTS), R), item = pick(LOST_ITEMS, R); out.push({ kind, giver: g, spot, item, seed: Math.floor(R() * 1e6), text: `Find ${g}'s lost ${item} near ${FIND_SPOTS[spot]}`, n: 1 }); }
    else if (kind === 'fish') { const n = 2 + Math.floor(R() * 2); out.push({ kind, giver: g, text: `${g} wants fish for supper: catch ${n} fish at the pond`, n }); }
    else if (kind === 'visit') { const place = pick(Object.keys(VISIT_PLACES), R); out.push({ kind, giver: g, place, text: `${g} left a note at ${VISIT_PLACES[place]}: go and visit it`, n: 1 }); }
    else { const n = 3; out.push({ kind, giver: g, text: `${g} says the town is shy today: say hi to ${n} townsfolk`, n }); } }
  return out.map((q, i) => ({ ...q, id: `${day}:${i}:${q.kind}`, reward: REWARD[q.kind] })); }
export function today(nowMs = Date.now(), evId) { const day = sydneyDay(nowMs); return { day, dayNum: dayNumber(day), list: questsFor(day, evId) }; }

// ---- save state (s.dquests): today's progress + lifetime stickers / full boards ----
export function ensure(s, day) { let Q = s.dquests; if (!Q || typeof Q !== 'object') Q = s.dquests = {};
  if (!Array.isArray(Q.stickers)) Q.stickers = []; Q.full = Math.max(0, Math.floor(+Q.full || 0)); if (typeof Q.track !== 'number') Q.track = -1;
  if (Q.day !== day) { Q.day = day; Q.prog = {}; Q.done = []; Q.paid = 0; Q.greeted = []; Q.track = -1; Q.fullToday = false; }
  Q.prog ||= {}; Q.done ||= []; Q.greeted ||= []; Q.paid = Math.max(0, Math.floor(+Q.paid || 0)); return Q; }
export const isDone = (Q, q) => Q.done.includes(q.id);
export const progOf = (Q, q) => (isDone(Q, q) ? q.n : Math.min(q.n, Q.prog[q.id] || 0));
export const remainingCap = (Q) => Math.max(0, QUEST_DAILY_CAP - Q.paid);

// pay a finished quest: Bones through earnBones (the job path), clamped so today's quest Bones (worn-outfit bonus included) never pass the cap
export function payQuest(s, Q, reward) { const left = remainingCap(Q); if (left <= 0) return { base: 0, bonus: 0, total: 0, capped: true };
  const bonus = wornBonesBonus(s), base = Math.max(0, Math.min(reward, left - bonus)); if (base <= 0) return { base: 0, bonus: 0, total: 0, capped: true };
  const r = earnBones(s, base); Q.paid += r.total; return { ...r, capped: base < reward }; }

// an in-world happening; returns the quests it finished: [{ q, pay, sticker?, badge? }]. Kinds:
//  talk {name} (a townsfolk chat) · trader · fish · near {kind:'find'|'visit', id} (client checks the distance) · event {n} (today's event progress)
export function note(s, day, list, kind, data = {}) { const Q = ensure(s, day), out = [];
  if (kind === 'talk' && data.name && !Q.greeted.includes(data.name)) Q.greeted.push(data.name);
  for (const q of list) { if (isDone(Q, q)) continue; let n = Q.prog[q.id] || 0;
    if (q.kind === 'deliver' && kind === 'talk' && data.name === q.to) n = 1;
    else if (q.kind === 'greet' && kind === 'talk') n = Math.min(q.n, Q.greeted.length);
    else if (q.kind === 'fish' && kind === 'fish') n++;
    else if ((q.kind === 'find' || q.kind === 'visit') && kind === 'near' && data.id === q.id) n = 1;
    else if (q.kind === 'event' && ((q.ev === 'trader' && kind === 'trader') || (kind === 'event' && data.ev === q.ev && (data.n || 0) >= 1))) n = 1;
    else continue;
    Q.prog[q.id] = n; if (n >= q.n) out.push(finish(s, Q, q, list)); }
  return out; }
function finish(s, Q, q, list) { Q.done.push(q.id); const pay = payQuest(s, Q, q.reward), r = { q, pay };
  if (!Q.fullToday && list.every((x) => Q.done.includes(x.id))) { Q.fullToday = true; Q.full++;
    if (stickerDay(Q.day)) { const st = STICKERS.find((x) => !Q.stickers.includes(x.id)); if (st) { Q.stickers.push(st.id); r.sticker = st; } }
    if (Q.full >= HELPER_AT) { s.engage ||= {}; s.engage.badges ||= []; if (!s.engage.badges.includes(HELPER_BADGE)) { s.engage.badges.push(HELPER_BADGE); r.badge = HELPER_BADGE; } } }
  return r; }
export function summary(s, day, list) { const Q = ensure(s, day); return { done: list.filter((q) => isDone(Q, q)).length, of: list.length, paid: Q.paid, cap: QUEST_DAILY_CAP, stickers: Q.stickers.slice(), full: Q.full }; }

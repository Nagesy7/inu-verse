// Onboarding tour + wayfinding: pure logic (no DOM). Places registry, tour trigger rules, tour steps, guide paths.
import { TILE, MAP_W, MAP_H, BUILDINGS, MALL_BUILDINGS, ARCADE, GAME_DOORS, BANK, LEADERS, STATUE, CHAPEL, BARN, MARKET, CRAFT, POND, PEN, CLUBHOUSE, PLOTS, NPC_HOMES, FIELDS, SQUARE, interactables, isSolid, findPath } from './world.js';
import { AD_SLOTS } from './coinads.js';

// ---------- tour trigger ----------
export const TOUR_KEY = 'inuverse.tour.v1';      // per device/browser
export const TOUR_MARK = 'verse-tour-v1';         // per wallet: stored in the shared profile's cosmetics list
export const isRealWallet = (w) => typeof w === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(w);
export const walletTourKey = (w) => (isRealWallet(w) ? TOUR_KEY + ':' + w : null);
// Start the tour when nothing says it was seen: no device flag, and (if signed in) no per-wallet flag locally or in the profile.
export function shouldStartTour({ ls, wallet = null, profile = null } = {}) {
  try { if (ls?.getItem(TOUR_KEY)) return false; const wk = walletTourKey(wallet); if (wk && ls?.getItem(wk)) return false; } catch {}
  if (isRealWallet(wallet) && Array.isArray(profile?.cosmetics) && profile.cosmetics.includes(TOUR_MARK)) return false;
  return true;
}
// how: 'done' | 'skipped'. Writes the device flag and the per-wallet flag; the caller saves the profile (cosmetics gets TOUR_MARK).
export function markTourSeen({ ls, wallet = null, how = 'done', state = null } = {}) {
  const v = how + ':' + new Date().toISOString().slice(0, 10);
  try { ls?.setItem(TOUR_KEY, v); const wk = walletTourKey(wallet); if (wk) ls.setItem(wk, v); } catch {}
  if (state) state.tourDone = how;
}

// ---------- places registry ----------
export const FEATURED = ['launch', 'bank']; // pinned at the top of Places + the map, with a star
export const GROUPS = ['Featured', 'Games', 'Shops & Mall', 'Prizes & Boards', 'Work & Café', 'Homes', 'Farm', 'Park & Square', 'Billboards'];
const rect = (o) => (o && o.w ? { fx: o.x + o.w / 2, fy: o.y + o.h / 2 } : null);
const RECTS = Object.fromEntries([...BUILDINGS, ...MALL_BUILDINGS, ...GAME_DOORS, ARCADE, BANK, CLUBHOUSE, CHAPEL, BARN, MARKET, CRAFT, ...PLOTS, ...NPC_HOMES, ...FIELDS].filter((o) => o?.id).map((o) => [o.id, o]));
RECTS.leaders = LEADERS; RECTS.pond = { ...POND, id: 'pond' }; RECTS.pen = { ...PEN, id: 'pen' }; RECTS.board = { x: STATUE.x, y: STATUE.y - 2, w: 2, h: 2 };
const GAME_IDS = new Set(['arcade', 'rescue', 'quest', 'launch']);
const WORK_IDS = new Set(['cafe', 'office', 'bizboard']);
function groupOf(it) {
  if (FEATURED.includes(it.id)) return 'Featured';
  if (it.kind === 'arcade' || it.kind === 'gamedoor' || GAME_IDS.has(it.id)) return 'Games';
  if (it.id === 'leaders' || it.id === 'board' || it.id === 'pools' || it.id === 'burn' || it.id === 'quests' || it.id === 'farmboard') return 'Prizes & Boards';
  if (WORK_IDS.has(it.id) || it.kind === 'lot' || it.kind === 'stall') return 'Work & Café';
  if (it.kind === 'plot' || it.kind === 'visit' || it.kind === 'clubhouse') return 'Homes';
  if (it.kind === 'farm' || it.kind === 'field') return 'Farm';
  if (it.kind === 'mall' || it.kind === 'building') return 'Shops & Mall';
  return 'Park & Square';
}
const NICE = { launch: 'Launch Hall (simulated tokens)', bank: 'Kibble Bank', pools: 'VIP Lounge & Pools Monument', burn: 'Burn Festival Monument', board: 'Prize-pool board (Mall statue)', quests: 'Quest Board (cross-game quests)', cafe: 'Shiba Sips Café (jobs)', office: "President's Office" };
const KEYWORDS = { bank: 'wallet balance inventory history purchases', cafe: 'jobs work coffee shift', arcade: 'games scores chomp invaders', rescue: 'inu rescue pups game door', quest: 'inu quest trainer gate game door', leaders: 'leaderboards scores prizes', board: 'prize pool kibble', pools: 'vip lounge holder pools', burn: 'burn kibble festival monument', mall: 'kibble shop luxury', launch: 'tokens launch hall coins', quests: 'quest chain weekly' };
// nearest walkable tile (spiral search) so every place has a reachable stand tile
export function nearestWalkable(tx, ty, r = 6) { tx = Math.round(tx); ty = Math.round(ty); if (!isSolid(tx, ty)) return [tx, ty];
  for (let d = 1; d <= r; d++) for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue; if (!isSolid(tx + dx, ty + dy)) return [tx + dx, ty + dy]; } return null; }
export function places(state) {
  const out = [], seen = new Set();
  for (const it of interactables(state)) {
    if (it.kind === 'stall') continue; const key = it.kind + ':' + it.id; if (seen.has(key)) continue; seen.add(key);
    const r = rect(RECTS[it.id]) || { fx: it.tx + 0.5, fy: it.ty - 0.5 };
    out.push({ id: it.id, kind: it.kind, name: NICE[it.id] || it.name, group: groupOf(it), featured: FEATURED.includes(it.id), tx: it.tx, ty: it.ty, fx: r.fx, fy: r.fy, keywords: KEYWORDS[it.id] || '' });
  }
  for (const a of AD_SLOTS) if (a.kind === 'billboard') { const fx = (a.x + a.w / 2) / TILE, fy = a.y / TILE + a.h / TILE / 2, st = nearestWalkable(fx, fy + 2);
    if (st) out.push({ id: a.id, kind: 'billboard', name: `Billboard ${a.id === 'bb1' ? 'East' : 'West'} (coin ads)`, group: 'Billboards', tx: st[0], ty: st[1], fx, fy, keywords: 'ads featured coins billboard' }); }
  return out;
}
export const placeById = (state, id) => places(state).find((p) => p.id === id) || null;
export function searchPlaces(list, q) { q = String(q || '').trim().toLowerCase(); if (!q) return list; const words = q.split(/\s+/);
  return list.filter((p) => { const hay = (p.name + ' ' + p.group + ' ' + p.keywords + ' ' + p.id).toLowerCase(); return words.every((w) => hay.includes(w)); }); }
export function grouped(list) { const g = {}; for (const p of list) (g[p.group] ||= []).push(p); return GROUPS.filter((k) => g[k]).map((k) => [k, k === 'Featured' ? g[k].sort((a, b) => FEATURED.indexOf(a.id) - FEATURED.indexOf(b.id)) : g[k].sort((a, b) => a.name.localeCompare(b.name))]); }
// nearest place to a map tile (for tap-to-select on the full map)
export function placeAt(list, tx, ty, maxD = 3) { let best = null, bd = maxD; for (const p of list) { const d = Math.min(Math.hypot(p.fx - tx, p.fy - ty), Math.hypot(p.tx + 0.5 - tx, p.ty + 0.5 - ty)); if (d < bd) { bd = d; best = p; } } return best; }

// ---------- guide (persistent arrow + path) ----------
export const tileOf = (px, py) => [Math.floor(px / TILE), Math.floor(py / TILE)];
export function guidePath(px, py, target) { const [sx, sy] = tileOf(px, py); return findPath(sx, sy, target.tx, target.ty); }
export const ARRIVE_TILES = 1.6;
export function arrived(px, py, target) { return Math.hypot(px / TILE - (target.tx + 0.5), py / TILE - (target.ty + 0.5)) <= ARRIVE_TILES; }
// distance along the path in tiles; shown as metres (1 tile = 2 m)
export const distLabel = (path, px, py, target) => { const n = path ? path.length - 1 : Math.round(Math.hypot(px / TILE - target.tx, py / TILE - target.ty)); return n * 2 + ' m'; };

// ---------- tour steps ----------
// place: registry id the camera pans to (null = the player). Text is short; every step is skippable.
export const TOUR = [
  { place: null, title: 'Welcome to Inu Verse!', text: 'I\'m Biscuit, President Inu\'s aide. Walk with WASD / arrow keys or click the ground. On a phone, drag the stick and tap A to interact (E on a keyboard).' },
  { place: 'launch', highlight: true, title: '★ Launch Hall: the big one', text: 'Create your own coin and watch NPC traders pump it up a bonding curve until it graduates! It\'s a SIMULATION: play tokens only, no blockchain, no real money. Try it first!' },
  { place: 'bank', featured: true, title: '★ Kibble Bank', text: 'Your wallet at a glance: $KIBBLE balance (soon), items you own across every Inu game, purchase history and the public prize-pool and burn boards. No deposits, lending or yield.' },
  { place: 'mall', title: 'Kibble Mall', text: 'Luxury outfits, jewels, cars and furniture. Prices are in $KIBBLE (launching soon); everyday stuff costs bones you earn by playing.' },
  { place: 'arcade', title: 'Inu Arcade', text: 'Four retro games. Sign in and your best scores count toward the weekly prize pools.' },
  { place: 'rescue', title: 'Rescue Station', text: 'Opens Inu Rescue: climb the girders and save pups from the grumpy cat. Your wallet comes along.' },
  { place: 'quest', title: 'Trainer Gate', text: 'Opens Inu Quest, the Shiba creature-collecting RPG. Beat the gym to complete a weekly quest step.' },
  { place: 'quests', title: 'Quest Board (more games)', text: 'The weekly quest chain links every Inu game: Meme Brawl, PepeBallz, Arcade, Rescue and Quest. Finish the chain for a free outfit.' },
  { place: 'leaders', title: 'Leaderboards Hall', text: 'Combined boards from every game. The top 3 each day, week and month share the prize pools. Skill only, free to enter.' },
  { place: 'board', title: 'Prize-pool board', text: 'Shows what the daily, weekly and monthly pools hold right now (1% of every purchase).' },
  { place: 'market', title: 'Farmers Market', text: 'Sell your crops and fish at the market stalls down by the farm. Prices change with the seasons.' },
  { place: 'cafe', title: 'Shiba Sips Café', text: 'Take a shift for bones. Other jobs pop up around town: chat with workers in hi-vis vests.' },
  { place: 'home', title: 'Your home plot', text: 'Claim a plot for bones, then decorate inside with furniture from the shops.' },
  { place: 'pools', title: 'VIP Lounge', text: 'Holders get the VIP lounge, gold names and early peeks. Cosmetic perks only.' },
  { place: 'burn', title: 'Burn Festival Monument', text: 'Opt-in burns unlock numbered status flair. Burning is always your choice.' },
  { place: 'bb1', title: 'Billboards', text: 'Coin ads rotate here. Featured slots can be rented; organic ads are free.' },
  { place: null, title: 'Find your way', text: 'Tap Places to search anywhere, or Map to pick a spot. I\'ll draw an arrow and a path, and can walk you there. First stop: the Launch Hall! Replay me any time with Guide.' },
];
// resolve a tour step to a place (home = your plot if owned, else the first free plot)
export function stepPlace(state, step) {
  if (!step.place) return null;
  if (step.place === 'home') { const ps = places(state).filter((p) => p.kind === 'plot'); return ps.find((p) => p.name === 'Your Home') || ps[0] || null; }
  return placeById(state, step.place);
}

// first guide arrow after the tour
export const AFTER_TOUR = 'launch';

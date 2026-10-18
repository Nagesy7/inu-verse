// Shiba Sips Café, customer side: a menu of original Inu dishes and drinks priced in Bones (free, earned in game, never cashed
// out), table / counter ordering, the waiter's serve -> eat -> clear timeline, a 'favourite dish' memory and seated diners
// (townsfolk whose townai action is 'eat', plus café regulars). Pure + headless (tested); drawing lives in dinerart.js,
// wiring in roomplay.js / main.js.
// Food is FUN ONLY: an order changes state.bones and state.diner (memory) and nothing else. No stats, no speed, no job pay, no
// score, no prize pool. Small mood flavour (an emote + a chat line) is the whole effect.
export const DISHES = [
  { id: 'pupLatte',   name: 'Puppy Latte',          kind: 'drink', price: 6,  emote: 'heart', line: 'Foamy paw-print on top!' },
  { id: 'kibbleBowl', name: 'Classic Kibble Bowl',  kind: 'food',  price: 8,  emote: 'happy', line: 'Crunchy and perfect.' },
  { id: 'chickBowl',  name: 'Chicken & Rice Bowl',  kind: 'food',  price: 12, emote: 'happy', line: 'Just like home.' },
  { id: 'boneCookie', name: 'Bone Biscuit Trio',    kind: 'treat', price: 4,  emote: 'note',  line: 'Three biscuits, zero regrets.' },
  { id: 'pumpkinPup', name: 'Pumpkin Pupcake',      kind: 'treat', price: 7,  emote: 'heart', line: 'Sprinkles on my nose!' },
  { id: 'matchaWag',  name: 'Matcha Wag Tea',       kind: 'drink', price: 5,  emote: 'note',  line: 'Calm tail, warm paws.' },
  { id: 'berrySplash',name: 'Blueberry Splash',     kind: 'drink', price: 5,  emote: 'happy', line: 'Fizzy! My ears popped up.' },
  { id: 'salmonBento',name: 'Salmon Bento Box',     kind: 'food',  price: 15, emote: 'heart', line: 'Fancy lunch for a fancy pup.' },
  { id: 'sakuraMochi',name: 'Sakura Paw Mochi',     kind: 'treat', price: 6,  emote: 'heart', line: 'Squishy and sweet.' },
  { id: 'honeyScone', name: 'Honey Scone',          kind: 'treat', price: 5,  emote: 'happy', line: 'Still warm from the oven.' },
  { id: 'brothBowl',  name: 'Cosy Bone Broth',      kind: 'food',  price: 9,  emote: 'note',  line: 'Slurp. Ahh.' },
  { id: 'pupuccino',  name: 'Whipped Pupuccino',    kind: 'drink', price: 3,  emote: 'happy', line: 'Cream moustache achieved.' },
  { id: 'peanutPops', name: 'Peanut Butter Pops',   kind: 'treat', price: 6,  emote: 'heart', line: 'Sticky! Worth it.' },
];
export const dishById = (id) => DISHES.find((d) => d.id === id) || null;
export const EAT = { cook: 2.2, eat: 6, clear: 2.5 }; // seconds: kitchen, eat/drink, empty plate until cleared
// seats in the café room (chair tiles; the table is the tile between each pair); stand = where the waiter stops to serve
export const SEATS = [
  { id: 's1', tx: 2, ty: 5, table: [3, 5], face: 'right', stand: [2, 6] }, { id: 's2', tx: 4, ty: 5, table: [3, 5], face: 'left', stand: [4, 6] },
  { id: 's3', tx: 9, ty: 5, table: [10, 5], face: 'right', stand: [9, 6] }, { id: 's4', tx: 11, ty: 5, table: [10, 5], face: 'left', stand: [11, 6] },
  { id: 's5', tx: 2, ty: 7, table: [3, 7], face: 'right', stand: [2, 8] }, { id: 's6', tx: 4, ty: 7, table: [3, 7], face: 'left', stand: [4, 8] },
  { id: 's7', tx: 9, ty: 7, table: [10, 7], face: 'right', stand: [9, 8] }, { id: 's8', tx: 11, ty: 7, table: [10, 7], face: 'left', stand: [11, 8] },
];
export const seatAt = (tx, ty) => SEATS.find((s) => s.tx === tx && s.ty === ty) || null;
export const WAITER_HOME = [8, 4]; // in front of the kitchen pass
export function ensureDiner(state) { const d = (state.diner ||= {}); d.counts ||= {}; d.orders ||= 0; d.spent ||= 0; return d; }
// buy a dish: Bones only, deducted exactly once, refused with insufficient Bones. Touches state.bones + state.diner, nothing else.
export function order(state, dishId) { const d = dishById(dishId); if (!d) return { ok: false, reason: 'Not on the menu' };
  const have = Math.floor(state.bones || 0); if (have < d.price) return { ok: false, reason: `Not enough Bones (${d.name} is ${d.price}, you have ${have})` };
  state.bones -= d.price; const m = ensureDiner(state); m.counts[d.id] = (m.counts[d.id] || 0) + 1; m.orders++; m.spent += d.price; m.last = d.id;
  return { ok: true, dish: d, price: d.price }; }
export function favourite(state) { const c = state.diner?.counts; if (!c) return null; let best = null, n = 0;
  for (const d of DISHES) if ((c[d.id] || 0) > n) { n = c[d.id]; best = d; } return best ? { dish: best, times: n } : null; }
// ---- service timeline (one ticket per seated diner) ----
// phases: cook (kitchen) -> carry (waiter walks to the table) -> eat (dish on the table, eat/drink animation) -> empty (plate
// waits) -> clear (waiter walks over and takes it) -> done. The waiter handles one ticket at a time; the runtime moves him and
// calls arrived(); the timeline itself is pure.
export function makeService() { return { tickets: [], nextId: 1, waiter: { busy: null } }; }
export function request(svc, { who, seat, dish, me = false }) { if (svc.tickets.some((t) => t.seat === seat && t.phase !== 'done')) return null;
  const t = { id: svc.nextId++, who, seat, dish, me, phase: 'cook', t: EAT.cook }; svc.tickets.push(t); return t; }
export const ticketAt = (svc, seat) => svc.tickets.find((t) => t.seat === seat && t.phase !== 'done') || null;
// returns events [{ kind: 'walk', ticket, to: 'table'|'home' } | { kind: 'served'|'finished'|'cleared', ticket }]
export function tickService(svc, dt) { const ev = [], w = svc.waiter;
  for (const t of svc.tickets) { if (t.phase === 'cook' || t.phase === 'eat' || t.phase === 'empty') t.t -= dt;
    if (t.phase === 'cook' && t.t <= 0) t.phase = 'ready';
    else if (t.phase === 'eat' && t.t <= 0) { t.phase = 'empty'; t.t = EAT.clear; ev.push({ kind: 'finished', ticket: t }); }
    else if (t.phase === 'empty' && t.t <= 0) t.phase = 'dirty'; }
  if (!w.busy) { const next = svc.tickets.find((t) => t.phase === 'ready' && t.me) || svc.tickets.find((t) => t.phase === 'ready') || svc.tickets.find((t) => t.phase === 'dirty'); // the player's dish first
    if (next) { w.busy = next.id; next.phase = next.phase === 'ready' ? 'carry' : 'clear'; ev.push({ kind: 'walk', ticket: next, to: 'table' }); } }
  svc.tickets = svc.tickets.filter((t) => t.phase !== 'done'); return ev; }
// the runtime says the waiter reached the table for the ticket he is busy with
export function waiterArrived(svc) { const t = svc.tickets.find((q) => q.id === svc.waiter.busy); if (!t) { svc.waiter.busy = null; return []; }
  svc.waiter.busy = null; if (t.phase === 'carry') { t.phase = 'eat'; t.t = EAT.eat; return [{ kind: 'served', ticket: t }]; }
  if (t.phase === 'clear') { t.phase = 'done'; return [{ kind: 'cleared', ticket: t }]; } return []; }
export function cancelSeat(svc, seat) { const t = ticketAt(svc, seat); if (!t) return false; if (svc.waiter.busy === t.id) svc.waiter.busy = null; t.phase = 'done'; svc.tickets = svc.tickets.filter((q) => q !== t); return true; }
// plate stage for drawing: 1 full .. 0 empty
export function plateLeft(t) { if (!t) return null; if (t.phase === 'eat') return Math.max(0.15, t.t / EAT.eat); if (t.phase === 'empty' || t.phase === 'dirty' || t.phase === 'clear') return 0; return 1; }
// ---- seated diners: townsfolk whose townai action is 'eat' sit and eat; regulars fill in so the café never looks empty ----
export const REGULARS = [{ name: 'Kiki', coat: 'red' }, { name: 'Sora', coat: 'golden' }, { name: 'Azuki', coat: 'dark' }, { name: 'Pochi', coat: 'cream' }];
export const isEating = (f) => !!f && (f.act === 'eat' || /grab a bite/i.test(f.act || ''));
// pick who sits where: eaters first (deterministic order), then up to `regulars` regulars; never a seat the player holds
export function seatDiners(town, { taken = new Set(), regulars = 2, coatOf = () => 'tan' } = {}) { const out = [], free = SEATS.filter((s) => !taken.has(s.id));
  const eaters = Object.values(town?.folk || {}).filter(isEating).map((f) => ({ name: f.name, coat: coatOf(f.name), folk: true }));
  const list = [...eaters, ...REGULARS.slice(0, Math.max(0, regulars - Math.max(0, eaters.length - 2)))];
  // spread out: alternate tables first
  const order = [0, 2, 5, 7, 1, 3, 4, 6].map((i) => SEATS[i]).filter((s) => free.includes(s));
  list.slice(0, order.length).forEach((d, i) => out.push({ ...d, seat: order[i].id })); return out; }
// what a seated NPC orders (deterministic from the name + an index so it varies)
export function npcPick(name, k = 0) { let h = 7; for (const c of name + k) h = (h * 31 + c.charCodeAt(0)) >>> 0; return DISHES[h % DISHES.length].id; }

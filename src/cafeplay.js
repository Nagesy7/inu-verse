// Shiba Sips Café runtime (customer side): seated diners, the waiter NPC (Server Sesame) walking dishes to the tables and
// clearing empty plates, the player's own table, and shift orders tagged with the seated customers' names. Pure logic lives in
// diner.js; this file moves NPCs (A*, same 46 px/s as other room NPCs) and draws dishes. Cosmetic only: never touches stats,
// pay, speed or any score.
import * as MOB from './mobility.js';
import { poseAt } from './actions.js';
import { DISHES, SEATS, WAITER_HOME, dishById, makeService, request, tickService, waiterArrived, ticketAt, cancelSeat, plateLeft, seatDiners, isEating, npcPick, REGULARS } from './diner.js';
import { drawDish } from './dinerart.js';
const ST = 32, SPEED = 46, DOOR = [7, 9];
// shift menu ids (cafe.js MENU) -> what the waiter carries out to that customer (display only)
export const SHIFT_DISH = { latte: 'pupLatte', biscuit: 'boneCookie', berry: 'berrySplash', cake: 'sakuraMochi', tea: 'matchaWag' };
const seatOf = (id) => SEATS.find((s) => s.id === id);
const C = (tx, ty) => ({ x: (tx + 0.5) * ST, y: (ty + 0.5) * ST });
export function makeCafePlay(D) {
  const K = { on: false, svc: makeService(), diners: [], waiter: null, me: null, chatT: 0, munchT: 0, recheck: 0, k: 0, served: 0, cleared: 0 };
  function pathTo(n, tile) { const sx = Math.floor(n.x / ST), sy = Math.floor(n.y / ST); const p = MOB.astar(sx, sy, tile[0], tile[1], D.solid, { w: D.sc().w, h: D.sc().h }); n.path = p ? p.slice(1) : []; n.goalTile = tile; return !!p; }
  function step(n, dt) { if (!n.path?.length) { n.moving = false; return true; } const [tx, ty] = n.path[0], g = C(tx, ty), dx = g.x - n.x, dy = g.y - n.y, d = Math.hypot(dx, dy), st = SPEED * dt;
    if (d <= st) { n.x = g.x; n.y = g.y; n.path.shift(); } else { n.x += (dx / d) * st; n.y += (dy / d) * st; } n.moving = true; n.phase += dt * 10; n.face = MOB.faceOf(dx, dy, n.face); return !n.path.length; }
  function mkNpc(name, coat, tile, extra = {}) { const c = C(tile[0], tile[1]); return { name, coat, x: c.x, y: c.y, face: 'down', phase: Math.random() * 6, moving: false, path: [], ctl: true, lines: extra.lines || ['Mmm, lovely café.', 'The puppy latte here is the best in town.'], ...extra }; }
  const taken = () => new Set([...K.diners.map((d) => d.seat), ...(K.me?.seat ? [K.me.seat] : [])]);
  const freeSeat = () => { const t = taken(); return SEATS.find((s) => !t.has(s.id)) || null; };
  function addDiner(d, walkIn) { const s = seatOf(d.seat), n = mkNpc(d.name, d.coat, walkIn ? DOOR : [s.tx, s.ty], { diner: true, folk: !!d.folk, seat: d.seat, state: walkIn ? 'arrive' : 'sit', next: 1 + Math.random() * 4, sitT: D.time(),
      lines: d.folk ? ['Lunch break! Do not tell the boss.', 'I always sit by the window.', 'Their broth fixes everything.'] : ['I come here every day.', 'Best seat in the house.', 'Have you tried the honey scone?'] });
    if (walkIn) pathTo(n, [s.tx, s.ty]); else n.face = s.face; K.diners.push(d); d.npc = n; D.R().npcs.push(n); return n; }
  function enter(R) { K.on = D.sc().id === 'cafe'; if (!K.on) return; K.svc = makeService(); K.diners = []; K.me = null; K.recheck = 4;
    K.waiter = mkNpc('Server Sesame', 'tan', WAITER_HOME, { waiter: true, outfit: { neck: 'bowtie', bottom: 'slacks_black' }, lines: ['Table service! Sit anywhere, I will bring it over.', 'Mind the tail, hot plates!', 'Order at the counter or from your table.'] });
    R.npcs.push(K.waiter); for (const d of seatDiners(D.town(), { regulars: 2, coatOf: D.coatOf })) addDiner(d, false); }
  // keep the room in step with townai: eaters walk in and sit; folk who stopped eating finish up and leave
  function reconcile() { const town = D.town(); if (!town) return; const eat = new Set(Object.values(town.folk || {}).filter(isEating).map((f) => f.name));
    for (const d of K.diners) if (d.folk && !eat.has(d.name) && d.npc.state === 'sit' && !ticketAt(K.svc, d.seat)) { d.npc.state = 'leave'; pathTo(d.npc, DOOR); }
    for (const name of eat) if (!K.diners.some((d) => d.name === name)) { const s = freeSeat(); if (s) addDiner({ name, coat: D.coatOf(name), folk: true, seat: s.id }, true); } }
  function onEvents(ev) { for (const e of ev) { const t = e.ticket, s = seatOf(t.seat);
    if (e.kind === 'walk') { const w = K.waiter; w.carry = t.phase === 'carry' ? t.dish : null; w.clearing = t.phase === 'clear'; pathTo(w, s.stand); w.task = 'table'; }
    else if (e.kind === 'served') { K.served++; const dish = dishById(t.dish); D.sfx?.('serve'); K.waiter.carry = null; K.waiter.face = 'up'; K.waiter.emote = { kind: 'note', t: 1.2 };
      if (t.me) { D.onMe?.('served', dish, t); } else { const d = K.diners.find((q) => q.seat === t.seat); if (d) { d.npc.emote = { kind: dish.emote, t: 2.2 }; if (K.chatT <= 0 && D.near(d.npc, 260)) { K.chatT = 3; D.chat(d.name, dish.line); } } } }
    else if (e.kind === 'finished') { if (t.me) D.onMe?.('finished', dishById(t.dish), t); else { const d = K.diners.find((q) => q.seat === t.seat); if (d) d.npc.emote = { kind: 'happy', t: 1.6 }; } }
    else if (e.kind === 'cleared') { K.cleared++; D.sfx?.('clear'); K.waiter.clearing = false; K.waiter.empty = 1.6; K.waiter.emptyDish = t.dish; if (t.me) { D.onMe?.('cleared', dishById(t.dish), t); if (K.me?.ticket === t.id) K.me = null; }
      else { const d = K.diners.find((q) => q.seat === t.seat); if (d) d.npc.next = 7 + Math.random() * 8; } } } }
  function update(R, dt) { if (!K.on) return; const now = D.time(); K.chatT -= dt; K.recheck -= dt; if (K.recheck <= 0) { K.recheck = 4; reconcile(); }
    // your meal only progresses while you are at your table (it waits for you otherwise)
    const mt = K.me && K.svc.tickets.find((q) => q.id === K.me.ticket); const atSeat = K.me && D.atSeat(seatOf(K.me.seat));
    if (mt && mt.phase === 'eat' && !atSeat) mt.t += dt;
    if (mt && mt.phase === 'eat' && atSeat) { K.munchT -= dt; if (K.munchT <= 0) { K.munchT = 1.4; D.sfx?.(dishById(mt.dish).kind === 'drink' ? 'sip' : 'munch'); } }
    onEvents(tickService(K.svc, dt));
    const w = K.waiter; if (w.emote) { w.emote.t -= dt; if (w.emote.t <= 0) w.emote = null; } if (w.empty > 0) w.empty -= dt;
    if (w.path.length) { if (step(w, dt)) { if (w.task === 'table') { w.task = 'home'; onEvents(waiterArrived(K.svc)); pathTo(w, WAITER_HOME); } else { w.task = null; w.face = 'down'; } } }
    else { w.moving = false; w.phase += dt * 2; if (w.task === 'table') { w.task = 'home'; onEvents(waiterArrived(K.svc)); pathTo(w, WAITER_HOME); } }
    for (let i = K.diners.length - 1; i >= 0; i--) { const d = K.diners[i], n = d.npc; if (n.emote) { n.emote.t -= dt; if (n.emote.t <= 0) n.emote = n.waitingShift ? { kind: 'note', t: 99 } : null; }
      if (n.held > 0) n.held -= dt;
      if (n.state === 'arrive') { if (step(n, dt)) { n.state = 'sit'; n.face = seatOf(d.seat).face; n.sitT = now; n.next = 1.5; } continue; }
      if (n.state === 'leave') { if (step(n, dt)) { R.npcs.splice(R.npcs.indexOf(n), 1); K.diners.splice(i, 1); } continue; }
      n.moving = false; n.phase += dt * 2; n.face = seatOf(d.seat).face; const t = ticketAt(K.svc, d.seat);
      if (!t && !n.waitingShift) { n.next -= dt; if (n.next <= 0) { n.next = 9; request(K.svc, { who: d.name, seat: d.seat, dish: npcPick(d.name, K.k++) }); } }
      const eating = t?.phase === 'eat'; n.pose = poseAt('sit', now - (n.sitT || 0) + 1, n.face); if (eating && n.pose) { const m = Math.max(0, Math.sin(now * 7 + i)); n.pose.dy += m * 1.6; n.pose.rot += (n.face === 'left' ? -1 : 1) * m * 0.05; } }
  }
  // the player's own order (table or counter)
  function placeOrder(dishId, seatId) { const s = seatOf(seatId) || freeSeat(); if (!s) return null; if (K.me?.seat && K.me.seat !== s.id) cancelSeat(K.svc, K.me.seat);
    const t = request(K.svc, { who: 'me', seat: s.id, dish: dishId, me: true }); if (!t) return null; K.me = { seat: s.id, ticket: t.id }; D.sfx?.('order'); return s; }
  // shift: tag new orders with a seated customer (display only: items, patience and pay are untouched, no rng is used)
  function tagShift(shift) { if (!K.on || !shift) return; const live = new Set(shift.orders.map((o) => o.id));
    for (const d of K.diners) if (d.npc.waitingShift && !live.has(d.npc.waitingShift)) { const o = d.npc.waitingShift; d.npc.waitingShift = null; d.npc.emote = shift.over ? null : { kind: 'angry', t: 1.5 }; void o; }
    for (const o of shift.orders) { if (o.tagged || !['order','cook','ready'].includes(o.phase || 'order')) continue; o.tagged = true; const pool = K.diners.filter((d) => d.npc.state === 'sit' && !d.npc.waitingShift);
      const d = pool.find((q) => !ticketAt(K.svc, q.seat)) || pool[0]; if (!d) continue; o.customer = d.name; o.seat = d.seat; d.npc.waitingShift = o.id; d.npc.emote = { kind: 'note', t: 99 }; } }
  function shiftServed(o) { const d = K.diners.find((q) => q.seat === o.seat && q.npc.waitingShift === o.id); if (!d) return false; d.npc.waitingShift = null; d.npc.emote = { kind: 'heart', t: 2 };
    cancelSeat(K.svc, d.seat); const t = request(K.svc, { who: d.name, seat: d.seat, dish: SHIFT_DISH[o.items[0]] || 'pupLatte' }); if (t) t.t = 0.4; return true; }
  function shiftEnded() { for (const d of K.diners) if (d.npc.waitingShift) { d.npc.waitingShift = null; d.npc.emote = null; } }
  // dishes on the tables + whatever the waiter is carrying (sorted with the actors by y)
  function props(t) { if (!K.on) return []; const out = [];
    for (const tk of K.svc.tickets) { const left = plateLeft(tk); if (left === null || tk.phase === 'cook' || tk.phase === 'ready' || tk.phase === 'carry') continue; const s = seatOf(tk.seat), side = s.face === 'right' ? -1 : 1;
      const x = (s.table[0] + 0.5) * ST + side * 8, y = (s.table[1] + 0.5) * ST - 5; out.push({ y: (s.table[1] + 1) * ST - 1, d: (c) => drawDish(c, tk.dish, x, y, left, t, false, 1.5) }); }
    const w = K.waiter; if (w && (w.carry || w.empty > 0)) out.push({ y: w.y + 7, d: (c) => drawDish(c, w.carry || w.emptyDish || DISHES[0].id, w.x + (w.face === 'left' ? -8 : 8), w.y - 20, w.carry ? 1 : 0, t, true, 1.4) });
    return out; }
  const meMunch = (now) => { const mt = K.me && K.svc.tickets.find((q) => q.id === K.me.ticket); return mt?.phase === 'eat' && D.atSeat(seatOf(K.me.seat)) ? Math.max(0, Math.sin(now * 7)) : 0; };
  const meTicket = () => K.me && K.svc.tickets.find((q) => q.id === K.me.ticket) || null;
  return { K, enter, update, props, placeOrder, tagShift, shiftServed, shiftEnded, freeSeat, meMunch, meTicket, seatOf, get on() { return K.on; }, off() { K.on = false; } };
}
export { REGULARS };

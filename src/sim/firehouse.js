// Phase 6 runtime: Emberpaw Firehouse. Every scene is a pure function of the wall clock and the slot's seed (fire.js), so
// every opted-in device draws the same incident, engine and crew at the same moment without sending anything. Like the
// patrol and clinic ticks, main.js hands the tick a COPY of the player's position; it never moves the player, never blocks
// a tile, door, chat or game. One siren sound per call-out, with a cooldown, only for players with town events on.
import { FIRE, ROLL, INCIDENTS, CREW, eventAt, fireSlotAt, fireOrder, fireGrade, timeline, sideOf } from './fire.js';
import { observe } from './police.js';
import { FIRE_STATION, TILE } from './place.js';
export const SHIFT = Object.freeze({ reach: 1.6, pickWithinSec: 90, lookAhead: 4, sirenTiles: 30 });
const memo = new Map();
export const ev = (slot) => { if (!memo.has(slot)) { if (memo.size > 64) memo.clear(); memo.set(slot, eventAt(slot)); } return memo.get(slot); };
// the call a new shift answers: this slot's incident if there's time left, else the next one on the timetable
export function shiftEvent(ms) { const s = fireSlotAt(ms); for (let k = 0; k <= SHIFT.lookAhead; k++) { const c = ev(s + k); if (!c || c.quiet) continue; if (k === 0 && ms - c.start > SHIFT.pickWithinSec * 1000) continue; return c; } return null; }
const lerpPath = (pts, d) => { for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i], l = Math.hypot(bx - ax, by - ay); if (d <= l) { const k = l ? d / l : 0; return { x: ax + (bx - ax) * k, y: ay + (by - ay) * k, dx: bx - ax, dy: by - ay }; } d -= l; } const [x, y] = pts[pts.length - 1]; return { x, y, dx: 0, dy: 0 }; };
const faceOf = (dx, dy, f = 'down') => (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6 ? f : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
const POSTS = Object.freeze({ 'sim:fd-rusty': [57.7, 6.45], 'sim:fd-juniper': [58.5, 6.6], 'sim:fd-biscuit': [56.6, 6.7] });
// what the scene looks like at wall-clock ms. view = { events, mine: { slot, doneAt } | null }
export function sceneAt(ms, view = {}) { const t = ms / 1000, c = ev(fireSlotAt(ms)), on = !!view.events;
  const idle = (id) => ({ x: POSTS[id][0] * TILE, y: POSTS[id][1] * TILE, face: Math.sin(t * 0.25 + POSTS[id][0]) > 0.85 ? 'left' : 'down', moving: false, phase: t * 2 });
  const out = { c: null, tl: null, engine: { x: ROLL.bay[0] * TILE, y: ROLL.bay[1] * TILE, face: 'down', moving: false, beacon: false }, crew: {}, incident: null, constable: null };
  for (const s of CREW) out.crew[s.id] = idle(s.id);
  if (!on || !c || c.quiet || ms < c.start) return out;
  const tl = timeline(c, view.mine), drive = (ms0) => { const d = ((ms0 - tl.roll) / 1000) * ROLL.speed, p = lerpPath(tl.route, Math.max(0, Math.min(tl.L, d))); return p; };
  out.c = c; out.tl = tl; if (ms > tl.home + 1000) return out;
  // the engine: rolls out, drives the route, parks with the beacon on, then drives home
  if (ms >= tl.roll && ms <= tl.home) { const going = ms < tl.arrive, coming = ms > tl.back, p = going ? drive(ms) : coming ? lerpPath(tl.route, Math.max(0, tl.L - ((ms - tl.back) / 1000) * ROLL.speed)) : lerpPath(tl.route, tl.L);
    out.engine = { x: p.x * TILE, y: p.y * TILE, face: going || coming ? faceOf(coming ? -p.dx : p.dx, coming ? -p.dy : p.dy) : 'left', moving: going || coming, beacon: ms < tl.back + 2000 }; }
  // the crew ride in the engine; at the scene the captain and a firefighter walk to the work spot (and, on a bigger event, the driver too)
  const team = c.big ? CREW : CREW.filter((s) => s.id !== 'sim:fd-biscuit'), spots = { 'sim:fd-rusty': [0, 0], 'sim:fd-juniper': [0.9, 0.25], 'sim:fd-biscuit': [1.8, 0.1] };
  for (const s of CREW) { if (ms >= tl.roll - 1500 && ms < tl.roll) { out.crew[s.id] = { ...idle(s.id), x: ROLL.bay[0] * TILE, y: (ROLL.bay[1] - 0.4) * TILE, moving: true, face: 'right', phase: t * 12, hidden: false }; continue; }
    if (ms < tl.roll || ms > tl.home) continue; if (!team.includes(s) || ms < tl.arrive || ms > tl.back + ROLL.walkSec * 1000) { out.crew[s.id] = { hidden: true }; continue; }
    const [ox, oy] = spots[s.id], hold = tl.held ? 1.3 : 0, wx = c.stand[0] + ox + hold, wy = c.stand[1] + oy * sideOf(c), k = ms < tl.out ? (ms - tl.arrive) / (tl.out - tl.arrive) : ms > tl.done ? 1 - (ms - tl.done) / (ROLL.walkSec * 1000) : 1, kk = Math.max(0, Math.min(1, k));
    const x = c.park[0] + (wx - c.park[0]) * kk, y = c.park[1] + (wy - c.park[1]) * kk, walking = kk > 0 && kk < 1;
    out.crew[s.id] = { x: x * TILE, y: y * TILE, face: walking ? faceOf(wx - c.park[0], wy - c.park[1]) : x * TILE > c.x * TILE ? 'left' : 'right', moving: walking, phase: t * 12, working: !walking && ms >= tl.out && ms <= tl.done, hidden: kk <= 0 }; }
  // the incident itself: there from the call's start until it's sorted, then a happy little "all sorted" for a moment
  const solved = ms >= tl.done && (!tl.held || view.mine?.doneAt); if (!(solved && ms > tl.done + ROLL.afterSec * 1000)) out.incident = { c, solved, since: solved ? tl.done : c.start };
  // two-alarm events: a constable tapes off a wide cordon (scenery: never solid)
  if (c.big && ms >= tl.arrive - 3000 && ms <= tl.done + 3000) { const k = Math.max(0, Math.min(1, (ms - (tl.arrive - 3000)) / 1500)), cx = c.stand[0] - 1.7, cy = c.stand[1] + 0.7 * sideOf(c);
    out.constable = { x: (cx - 3 * (1 - k)) * TILE, y: cy * TILE, face: k < 1 ? 'right' : 'down', moving: k < 1, phase: t * 12, tape: ms >= tl.arrive - 1500 }; }
  return out; }
export const stationSpot = () => ({ x: (FIRE_STATION.tx + 0.5) * TILE, y: (FIRE_STATION.ty + 0.5) * TILE });
// a firefighter shift + the siren for one device
export function createFirehouse({ wallet, now = () => Date.now(), onChange = () => {}, sync = () => {}, sound = () => {} } = {}) {
  let shift = null, notice = null, cache = { at: -1e9, st: null }, lastSiren = -1e12, sirenFor = -1, sirens = 0;
  const st = (force = false) => { const t = now(); if (force || t - cache.at > 400) cache = { at: t, st: wallet.state() }; return cache.st; };
  const say = (n) => { notice = { ...n, at: now() }; cache.at = -1e9; onChange(notice); };
  const after = () => { cache.at = -1e9; sync(); };
  const C = {
    get notice() { return notice; }, get shift() { return shift; }, get sirens() { return sirens; },
    view() { const s = st(); return { events: !!(s?.joined && s.fire?.events), mine: shift ? { slot: shift.c.slot, doneAt: shift.doneAt || 0 } : null }; },
    dismiss() { notice = null; onChange(null); },
    eventsOn() { wallet.eventsOn(); say({ kind: 'info', text: 'Town events on: the fire crew, the engine and the odd cartoon incident around town. Switch them off any time.' }); after(); },
    eventsOff() { wallet.eventsOff(); shift = null; say({ kind: 'info', text: 'Town events off. The town goes quiet for you; nothing else changes.' }); after(); },
    startShift() { const s = st(true); if (!s.joined) throw new Error('join the side economy first'); if (!s.fire?.events) throw new Error('switch town events on first');
      if (s.fire.callsToday >= FIRE.callsPerDay) throw new Error(`that's ${FIRE.callsPerDay} calls today: back tomorrow`);
      const q = wallet.quote('wage'); if (!q.ok) throw new Error(q.reason === 'cooldown' ? 'next shift after the wage cooldown' : 'daily wage cap reached');
      const c = shiftEvent(now()); if (!c) throw new Error('no call on the board right now: try again in a minute');
      shift = { start: now(), c, order: fireOrder(c.slot, c.kind), taps: [], state: 'go', quote: q.amount, doneAt: 0 };
      say({ kind: 'shift', text: `Firefighter shift: ${INCIDENTS[c.kind].label.toLowerCase()} at ${c.name}.` }); return shift; },
    endShift() { shift = null; say({ kind: 'info', text: 'Shift ended. No pay for an unfinished call; the crew will sort it.' }); },
    tap(i) { if (!shift || shift.state !== 'task') return null; shift.taps.push(Number(i)); const g = fireGrade({ kind: shift.c.kind, taps: shift.taps });
      if (g.failed) { shift.taps = []; shift.retry = (shift.retry || 0) + 1; onChange(notice); return g; }
      if (g.done) { const c = shift.c; let r; try { r = wallet.attendCall(c.slot, g.slips); } catch (e) { shift = null; say({ kind: 'info', text: `Couldn't log that call (${e.message}). No pay.` }); return g; }
        shift = { ...shift, state: 'done', doneAt: now() }; const done = shift;
        say({ kind: 'paid', text: r.wage ? `${INCIDENTS[c.kind].label}: sorted! Firefighter shift: +${r.wage.value.amount} PM.` : `${INCIDENTS[c.kind].label}: sorted! (${r.reason}: no wage this time)` });
        setTimeout(() => { if (shift === done) { shift = null; onChange(notice); } }, 25e3); after(); }
      else onChange(notice); return g; },
    tick(dt, t, view) { const ms = now(), s = st(), at = observe(view), x = at.x / TILE, y = at.y / TILE;
      if (!s?.joined || !s.fire?.events) { if (shift) shift = null; return null; }
      if (shift && shift.state !== 'done') { const c = shift.c;
        if (ms > c.start + 140e3 || ms > c.end) { shift = null; say({ kind: 'info', text: 'That call timed out: the crew sorted it. No pay this time.' }); }
        else if (shift.state === 'go' && ms >= c.start && Math.hypot(x - c.stand[0], y - c.stand[1]) <= SHIFT.reach) { shift.state = 'task'; onChange(notice); }
        else if (shift.state === 'go') { shift.dist = Math.round(Math.hypot(x - c.stand[0], y - c.stand[1]) * 2); shift.wait = Math.max(0, c.start - ms); } }
      // one siren per call-out as the engine rolls, only if you're within earshot, never two inside the cooldown
      const c = ev(fireSlotAt(ms)); if (c && !c.quiet) { const tl = timeline(c); if (ms >= tl.roll && ms <= tl.roll + 2500 && sirenFor !== c.slot && ms - lastSiren >= FIRE.sirenCooldownMs) {
        const near = Math.min(Math.hypot(x - ROLL.bay[0], y - ROLL.bay[1]), Math.hypot(x - c.x, y - c.y)) <= SHIFT.sirenTiles; sirenFor = c.slot; if (near) { lastSiren = ms; sirens++; sound('siren'); } } }
      return null; },
  };
  return C;
}

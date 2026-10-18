// Phase 5 runtime: the clinic tick. Like the patrol tick, main.js hands it a COPY of the player's position and a tile
// lookup each frame. It never moves the player or blocks anything: a bump is a timer, a small icon and (stubbed paw,
// tummy ache) a slightly slower walk for at most 60 s. Only players who joined the side economy AND switched cartoon
// bumps on can get one; walking it off, opting out or free treatment at the clinic always clears it.
// Also: the sim medics' rounds (pure functions of the wall clock, so every device sees the same thing) and medic shifts.
import { MED, AILMENTS, STAFF, callAt, slotAt, stepOrder, grade, beesAbout, nearCafe } from './medical.js';
import { observe } from './police.js';
import { PARK, CLINIC, CAFE_DOOR, TILE } from './place.js';
import { pm } from './currency.js';
import { eventAt, fireSlotAt, timeline, sideOf } from './fire.js';
export const ROUNDS = Object.freeze({ leaveSec: 5, speed: 2.4, treatSec: 12, patientSec: 100, reach: 1.4, shiftMaxMs: 4 * 60e3, minLeftMs: 90e3 });
export const TRIGGERS = Object.freeze({ bumpSpeed: 3.6, bumpWithinMs: 350, sunStillMs: 45e3, stillTiles: 0.3, stingDwellMs: 3000, cafeDelayMs: 15e3, cafeDoorTiles: 3 });
const memo = new Map();
export const call = (slot) => { if (!memo.has(slot)) { if (memo.size > 64) memo.clear(); memo.set(slot, callAt(slot)); } return memo.get(slot); };
// a shift takes the current call if enough of it is left, else the next one
export function shiftCall(ms) { const c = call(slotAt(ms)); return c.end - ms >= ROUNDS.minLeftMs ? c : call(c.slot + 1); }
const MEDICS = STAFF.filter((s) => s.role === 'medic');
const lerpPath = (pts, d) => { for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i], l = Math.hypot(bx - ax, by - ay); if (d <= l) { const k = l ? d / l : 0; return { x: ax + (bx - ax) * k, y: ay + (by - ay) * k, dx: bx - ax, dy: by - ay }; } d -= l; } const [x, y] = pts[pts.length - 1]; return { x, y, dx: 0, dy: 0 }; };
const plen = (pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
const faceOf = (dx, dy, f = 'down') => (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6 ? f : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
// The rounds for one call: which medic goes, the path out (along the plaza row in front of the shops), when they arrive and finish.
export function rounds(c) { const m = MEDICS[c.slot % MEDICS.length], out = [m.post, [56.5, m.post[1]], [56.5, 47.15], [c.x + 0.9, 47.15], [c.x + 0.9, c.y]], L = plen(out);
  const leave = c.start + ROUNDS.leaveSec * 1000, arrive = leave + (L / ROUNDS.speed) * 1000, done = arrive + ROUNDS.treatSec * 1000, back = done + (L / ROUNDS.speed) * 1000; return { medic: m, out, L, leave, arrive, done, back }; }
// where a staff member is at wall-clock ms (mineSlot: the call this player is answering, so the sim medics stay put)
export function staffPose(s, ms, mineSlot = null, events = false) { const t = ms / 1000, idle = { x: s.post[0] * TILE, y: s.post[1] * TILE, face: Math.sin(t * 0.3 + s.post[0]) > 0.85 ? 'left' : 'down', moving: false, phase: t * 2 };
  if (s.role !== 'medic') return idle;
  for (const slot of [slotAt(ms), slotAt(ms) - 1]) { const c = call(slot); if (!c || c.slot === mineSlot) continue; const r = rounds(c); if (r.medic.id !== s.id || ms < r.leave || ms > r.back) continue;
    const go = ms < r.arrive, home = ms > r.done, d = go ? ((ms - r.leave) / 1000) * ROUNDS.speed : home ? r.L - ((ms - r.done) / 1000) * ROUNDS.speed : r.L, p = lerpPath(r.out, Math.max(0, Math.min(r.L, d)));
    return { x: p.x * TILE, y: p.y * TILE, face: go || home ? faceOf(home ? -p.dx : p.dx, home ? -p.dy : p.dy) : 'left', moving: go || home, phase: t * 12, treating: !go && !home, slot: c.slot }; }
  if (events) { const sb = fireStandby(ms); if (sb && sb.id === s.id) { const k = Math.max(0, Math.min(1, (ms - sb.t.out) / 1500)), x = sb.x + 3 * (1 - k);
    return { x: x * TILE, y: sb.y * TILE, face: k < 1 ? 'left' : 'left', moving: k < 1, phase: t * 12, standby: true }; } }
  return idle; }
// Phase 6: on a bigger fire event, a medic with no clinic rounds during it stands by at the scene (cosmetic; same on every device)
export function fireStandby(ms) { const c = eventAt(fireSlotAt(ms)); if (!c || !c.big) return null; const t = timeline(c); if (ms < t.out || ms > t.done) return null;
  for (const m of MEDICS) { let busy = false; for (let sl = slotAt(t.out) - 1; sl <= slotAt(t.done); sl++) { const cc = call(sl); if (!cc) continue; const r = rounds(cc); if (r.medic.id === m.id && r.leave <= t.done && r.back >= t.out) busy = true; }
    if (!busy) return { id: m.id, c, t, x: c.stand[0] + 2.8, y: c.stand[1] + 0.6 * sideOf(c) }; }
  return null; }
// the sim pup on a call: there from the call's start, treated by the sim medic (or by you, on a shift), then heads off
export function patientsAt(ms, { mineSlot = null, mineDone = false } = {}) { const out = [];
  for (const slot of [slotAt(ms), slotAt(ms) - 1]) { const c = call(slot); if (!c || ms < c.start) continue; const mine = c.slot === mineSlot, r = rounds(c);
    const treated = mine ? mineDone : ms >= r.done, gone = mine ? (mineDone ? false : ms > c.end) : ms > c.start + ROUNDS.patientSec * 1000; if (gone) continue;
    out.push({ c, x: c.x * TILE, y: c.y * TILE, treated, mine, waiting: !treated && !(ms >= r.arrive && !mine), face: 'down' }); }
  return out; }

export function createClinic({ wallet, now = () => Date.now(), onChange = () => {}, sync = () => {} } = {}) {
  let lastTick = 0, prev = null, fast = null, wall = 0, still = null, sting = 0, cafe = null, walked = 0, notice = null, shift = null, cache = { at: -1e9, st: null };
  const st = (force = false) => { const t = now(); if (force || t - cache.at > 400) cache = { at: t, st: wallet.state() }; return cache.st; };
  const say = (n) => { notice = { ...n, at: now() }; cache.at = -1e9; onChange(notice); };
  const after = () => { cache.at = -1e9; sync(); };
  const C = {
    get notice() { return notice; }, get shift() { return shift; },
    walkFactor() { const s = st(); return s?.joined && s.med?.hurt?.live ? s.med.slow : 1; },
    dismiss() { if (notice && notice.kind !== 'hurt') { notice = null; onChange(null); } },
    bumpsOn() { wallet.bumpsOn(); say({ kind: 'info', text: 'Cartoon bumps on. Switch them off any time at the clinic.' }); after(); },
    optOut() { wallet.bumpsOff(); walked = 0; say({ kind: 'healed', text: 'Cartoon bumps off. All better, nothing else changes.' }); after(); },
    // free treatment at the clinic; chipping in the co-pay is optional and changes nothing about the care
    treat(chipIn = false) { const e = wallet.care(); let paid = 0; if (chipIn && st(true).balance >= MED.copay) { wallet.copay(e.seq); paid = MED.copay; } walked = 0;
      say({ kind: 'healed', text: `Dr. Pawsley patched you up${paid ? ` (thanks for chipping in ${pm(paid)})` : ' (free)'}. All better!` }); after(); return e; },
    startShift() { const s = st(true); if (!s.joined) throw new Error('join the side economy first'); const q = wallet.quote('wage'); if (!q.ok) throw new Error(q.reason === 'cooldown' ? 'next shift after the cooldown' : 'daily wage cap reached');
      const c = shiftCall(now()); if (!wallet.canTreat(c.slot) && now() >= c.start) throw new Error('no open call right now: try again in a minute');
      shift = { start: now(), c, order: stepOrder(c.slot, c.ail), taps: [], state: 'go', quote: q.amount, done: false };
      say({ kind: 'shift', text: `Medic shift: ${c.name} has a ${AILMENTS[c.ail].label.toLowerCase()} on the plaza (marked +). Walk over.` }); return shift; },
    endShift() { shift = null; say({ kind: 'info', text: 'Medic shift ended. No pay for an unfinished call; the clinic medics will take it.' }); },
    tap(i) { if (!shift || shift.state !== 'task') return null; shift.taps.push(Number(i)); const g = grade({ ail: shift.c.ail, taps: shift.taps });
      if (g.failed) { shift.taps = []; shift.retry = (shift.retry || 0) + 1; onChange(notice); return g; }
      if (g.done) { const r = wallet.treatCall(shift.c.slot, g.slips); shift.done = true; const c = shift.c; shift = { ...shift, state: 'done' };
        say({ kind: 'paid', text: r.wage ? `${c.name} feels much better! Medic shift: +${pm(r.wage.value.amount)}.` : `${c.name} feels much better! (${r.reason}: no wage this time)` }); setTimeout(() => { if (shift?.state === 'done') { shift = null; onChange(notice); } }, 20e3); after(); }
      else onChange(notice); return g; },
    mineSlot: () => (shift ? shift.c.slot : null), mineDone: () => !!shift?.done,
    tick(dt, t, view, tileAt, T) {
      const nowMs = now(), gap = lastTick ? nowMs - lastTick : 0; lastTick = nowMs; const s = st();
      const at = observe(view), x = at.x / TILE, y = at.y / TILE, tx = Math.floor(x), ty = Math.floor(y), moved = prev ? Math.hypot(x - prev.x, y - prev.y) : 0, jump = moved >= 1, sp = dt > 0 && !jump ? moved / dt : 0; // a door/warp jump is not running
      if (jump) { fast = null; wall = 0; } const dir = prev && moved > 1e-4 && !jump ? { x: (x - prev.x) / moved, y: (y - prev.y) / moved } : fast?.dir; prev = { x, y };
      // a medic shift: walk to the sim pup, then the steps (the card shows them)
      if (shift && shift.state !== 'done') { const c = shift.c;
        if (nowMs > c.end || nowMs - shift.start > ROUNDS.shiftMaxMs) { shift = null; say({ kind: 'info', text: 'That call timed out. The clinic medics took it. No pay this time.' }); }
        else if (shift.state === 'go' && nowMs >= c.start && Math.hypot(x - c.x, y - c.y) <= ROUNDS.reach) { shift.state = 'task'; shift.taskAt = nowMs; onChange(notice); }
        else if (shift.state === 'go') { shift.dist = Math.round(Math.hypot(x - c.x, y - c.y) * 2); shift.wait = Math.max(0, c.start - nowMs); } }
      if (!s?.joined) { walked = 0; still = null; sting = 0; cafe = null; if (notice?.kind === 'hurt') { notice = null; onChange(null); } return null; }
      const m = s.med || {};
      // already bumped: count it down, or walk it off
      if (m.hurt) { if (!m.hurt.live) { wallet.heal('time up'); walked = 0; say({ kind: 'healed', text: `${m.hurt.label}: all better. That was just a cartoon bump.` }); after(); return null; }
        if (gap < 2500 && !view.driving && !jump) walked += Math.min(moved, 0.5);
        if (walked >= MED.walkOffTiles) { wallet.heal('walked it off'); walked = 0; say({ kind: 'healed', text: `Walked it off! ${m.hurt.label} gone.` }); after(); return null; }
        notice = { kind: 'hurt', ail: m.hurt.ail, label: m.hurt.label, leftMs: m.hurt.leftMs, slow: m.slow, walked, at: nowMs }; onChange(notice); return null; }
      walked = 0; if (notice?.kind === 'hurt') { notice = null; onChange(null); }
      if (!m.bumps) { still = null; sting = 0; cafe = null; return null; }
      const busy = view.driving || view.busy, tile = tileAt(tx, ty);
      // the café: a visit is a panel or a trip inside next to its door; 15 s after you come out, maybe one pup-cake too many
      const byCafe = Math.hypot(x - (CAFE_DOOR.tx + 0.5), y - (CAFE_DOOR.ty + 0.5)) <= TRIGGERS.cafeDoorTiles;
      if (byCafe && (view.busy || gap > 2000)) cafe = { at: nowMs }; else if (cafe && !nearCafe(tx, ty)) cafe = null;
      if (busy || !wallet.canInjure()) { fast = null; still = null; sting = 0; return null; }
      let ail = null;
      if (cafe && !view.busy && nowMs - cafe.at >= TRIGGERS.cafeDelayMs && nearCafe(tx, ty)) { ail = 'tummy'; cafe = null; }
      // stubbed paw: running flat out, then stopped dead by a wall right in front
      if (!ail) { if (sp >= TRIGGERS.bumpSpeed && dir) fast = { at: nowMs, dir }; else if (fast && sp < 0.3 && nowMs - fast.at < TRIGGERS.bumpWithinMs) { const ax = Math.floor(x + fast.dir.x * 0.7), ay = Math.floor(y + fast.dir.y * 0.7);
          if ((ax !== tx || ay !== ty) && tileAt(ax, ay) === -1) { wall += dt * 1000; if (wall >= 120) { ail = 'paw'; wall = 0; fast = null; } } } else if (fast && nowMs - fast.at >= TRIGGERS.bumpWithinMs) { fast = null; wall = 0; } }
      // bee sting: lingering by the flowerbeds in the park while the bees are busy (a fixed timetable, every other 10 min)
      if (!ail) { const inPark = tx >= PARK.x && tx < PARK.x + PARK.w && ty >= PARK.y && ty < PARK.y + PARK.h; let flowers = false;
        if (inPark && tile !== T.FLOWER) for (let j = -1; j <= 1 && !flowers; j++) for (let i = -1; i <= 1; i++) if ((i || j) && tileAt(tx + i, ty + j) === T.FLOWER) { flowers = true; break; }
        sting = inPark && flowers && beesAbout(nowMs) ? sting + dt * 1000 : 0; if (sting >= TRIGGERS.stingDwellMs) { ail = 'sting'; sting = 0; } }
      // sunburn: standing still out in the daytime sun for 45 s
      if (!ail) { if (!still || Math.hypot(x - still.x, y - still.y) > TRIGGERS.stillTiles || globalThis.__inuNight || tile < 0) still = { x, y, ms: 0 }; else still.ms += Math.min(dt, 0.25) * 1000;
        if (still.ms >= TRIGGERS.sunStillMs) { ail = 'sunburn'; still = null; } }
      if (!ail) return null;
      const e = wallet.injure(ail, tx, ty), a = AILMENTS[ail]; walked = 0;
      notice = { kind: 'hurt', ail, label: a.label, leftMs: a.sec * 1000, slow: a.slow, walked: 0, fresh: `You ${a.how}: ${a.label.toLowerCase()}!`, at: nowMs }; cache.at = -1e9; onChange(notice); after(); return e; },
  };
  return C;
}
export const clinicSpot = () => ({ x: (CLINIC.tx + 0.5) * TILE, y: (CLINIC.ty + 0.5) * TILE });

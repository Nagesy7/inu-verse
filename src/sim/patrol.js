// Phase 3 runtime: the patrol tick. Each frame main.js hands it a COPY of the player's position (never the player object)
// and a tile lookup. It never moves the player, never opens a panel, never blocks input, chat, doors, Bones, $KIBBLE or
// other games: a detention is a timer + a notice card with its ways out. Only players who joined the side economy are
// policed; everyone else just sees pups on patrol.
import { observe, offenseAt, decide, POLICE, OFFENSES } from './police.js';
import { officersAt, officerById } from './force.js';
import { PARK, RANGER_HUT, TILE } from './place.js';
import { pm } from './currency.js';
export const SHIFT = Object.freeze({ litter: 5, minMs: 40e3, maxMs: 3 * 60e3, reach: 0.8, spread: 3.5, radius: 22 });
const rnd = () => { const a = new Uint32Array(1); globalThis.crypto.getRandomValues(a); return a[0] / 2 ** 32; };

export function createPatrol({ wallet, now = () => Date.now(), onChange = () => {}, sync = () => {} } = {}) {
  let dwell = { offense: null, ms: 0 }, lastTick = 0, scene = null, notice = null, shift = null, cache = { at: -1e9, st: null };
  const st = (force = false) => { const t = now(); if (force || t - cache.at > 400) cache = { at: t, st: wallet.state() }; return cache.st; };
  const say = (n) => { notice = { ...n, at: now() }; cache.at = -1e9; onChange(notice); };
  const after = () => { cache.at = -1e9; sync(); };
  const P = {
    get notice() { return notice; }, get shift() { return shift; }, litter: () => (shift ? shift.litter : []),
    dismiss() { if (notice && notice.kind !== 'detained') { notice = null; onChange(null); } },
    // ways out of a detention: every one is always available and logged
    payBail() { wallet.payBail(); scene = null; say({ kind: 'released', text: `Bail paid (${pm(POLICE.bail)}). You're free to go.` }); after(); },
    walkItOff() { if (notice?.kind === 'detained') { notice = { ...notice, waiting: true }; onChange(notice); } },
    optOut() { wallet.leave(); scene = null; shift = null; say({ kind: 'released', text: 'You left the side economy. Officers will leave you be.' }); after(); },
    startShift() { if (!st(true).joined) throw new Error('join the side economy first'); const q = wallet.quote('wage'); if (!q.ok) throw new Error(q.reason === 'cooldown' ? 'next shift after the cooldown' : 'daily wage cap reached');
      shift = { start: now(), litter: null, pending: true, quote: q.amount }; say({ kind: 'shift', text: 'Ranger shift started: pick up the litter marked with "!" in the park.' }); },
    endShift() { shift = null; say({ kind: 'info', text: 'Ranger shift ended. No pay for an unfinished shift.' }); },
    tick(dt, t, view, tileAt, T) {
      const nowMs = now(), gap = lastTick ? nowMs - lastTick : 0; lastTick = nowMs; const s = st();
      if (!s?.joined) { dwell = { offense: null, ms: 0 }; scene = null; if (notice?.kind === 'detained') { notice = null; onChange(null); } return null; }
      const at = observe(view), x = at.x / TILE, y = at.y / TILE, tx = Math.floor(x), ty = Math.floor(y);
      // detention: a timer, never a cage. Leaving the scene (walking away, entering a door, another game) ends it.
      if (s.held || s.heldRecord) {
        const left = s.held ? s.held.leftMs : 0; if (!scene) scene = { x, y };
        const away = Math.hypot(x - scene.x, y - scene.y) > POLICE.leaveSceneTiles || gap > 2500;
        if (s.held && away) { wallet.release('left the scene'); scene = null; say({ kind: 'released', text: 'You left the scene. Detention over, no charge.' }); after(); }
        else if (!s.held && s.heldRecord) { wallet.release(notice?.waiting ? 'walked it off' : 'time cap'); scene = null; say({ kind: 'released', text: 'Walked it off. Free to go, no charge.' }); after(); }
        else if (s.held) { const o = officerById(s.held.by); notice = { kind: 'detained', by: o?.name, offense: notice?.offense, leftMs: left, waiting: !!notice?.waiting, balance: s.balance, at: nowMs }; onChange(notice); }
      } else scene = null;
      // ranger shift: litter appears on walkable park tiles near the station; collect it all, not too fast
      if (shift) { if (shift.pending) { shift.litter = spawnLitter(tileAt, T); shift.pending = false; }
        for (const l of shift.litter) if (!l.got && Math.hypot(l.x - x, l.y - (y - 0.2)) < SHIFT.reach) { l.got = true; onChange(notice); }
        const got = shift.litter.filter((l) => l.got).length, el = nowMs - shift.start;
        if (el > SHIFT.maxMs) { shift = null; say({ kind: 'info', text: 'Ranger shift timed out. No pay this time.' }); }
        else if (got === shift.litter.length && el >= SHIFT.minMs) { shift = null; try { const e = wallet.payWage('ranger shift'); say({ kind: 'paid', text: `Ranger shift done: +${pm(e.value.amount)}. Thanks for tidying the park!` }); after(); } catch (err) { say({ kind: 'info', text: String(err.message) }); } }
        else if (got === shift.litter.length) notice = { kind: 'shift', text: `All litter collected. Finishing up… ${Math.ceil((SHIFT.minMs - el) / 1000)} s`, at: nowMs }; }
      // offences: dwell on an offence tile while an officer of the right force can see you
      const off = view.driving || view.busy ? null : offenseAt(tileAt(tx, ty), tx, ty, T);
      dwell = off && off === dwell.offense ? { offense: off, ms: dwell.ms + Math.min(dt, 0.25) * 1000 } : { offense: off, ms: 0 };
      const hit = decide({ offense: dwell.offense, dwellMs: dwell.ms, at: { x, y }, officers: officersAt(t) });
      if (!hit || !wallet.canPolice('cite')) return null;
      dwell = { offense: null, ms: 0 }; const o = officerById(hit.by), r = wallet.cite(hit.by, hit.offense, tx, ty); let detained = null;
      if (wallet.canPolice('detain')) { detained = wallet.detain(hit.by, hit.offense, tx, ty, POLICE.detainSec); scene = { x, y }; }
      say(detained ? { kind: 'detained', by: o.name, leftMs: POLICE.detainSec * 1000, waiting: false, balance: st(true).balance, offense: OFFENSES[hit.offense].short }
        : { kind: 'cited', by: o.name, offense: OFFENSES[hit.offense].label, fine: r.fine, text: r.fine ? `${o.name} cited you: ${OFFENSES[hit.offense].label}. Fine ${pm(r.fine)} paid.` : `Warning from ${o.name}: ${OFFENSES[hit.offense].label}.${r.fine === 0 && s.balance >= POLICE.fine ? ` Next time is a ${pm(POLICE.fine)} fine.` : ''}` });
      after(); return { cite: r.cite, detained };
    },
  };
  return P;
}
export function spawnLitter(tileAt, T) { const out = [], hut = { x: RANGER_HUT.tx + 0.5, y: RANGER_HUT.ty + 0.5 };
  for (let tries = 0; out.length < SHIFT.litter && tries < 400; tries++) {
    const x = PARK.x + Math.floor(rnd() * PARK.w) + 0.5, y = PARK.y + Math.floor(rnd() * PARK.h) + 0.5, tile = tileAt(Math.floor(x), Math.floor(y));
    if (tile !== T.GRASS && tile !== T.WALK && tile !== T.DIRT) continue; if (Math.hypot(x - hut.x, y - hut.y) > SHIFT.radius) continue;
    if (out.some((l) => Math.hypot(l.x - x, l.y - y) < SHIFT.spread)) continue; out.push({ x, y, k: out.length, got: false }); }
  return out; }

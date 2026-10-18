// Paw Audit Bureau: the one entry point the game imports (src/main.js). Drawing, panels and the patrol tick only; the sim
// engine, ledger and Pawmarks stay behind it and are never imported by game code (tests/sim-firewall.test.mjs checks).
import { bureauProps as deskProps } from './bureauart.js';
import { patrolProps } from './patrolui.js';
import { courtProps } from './courtart.js';
import { clinicProps } from './clinicart.js';
import { simTick as patrolTick } from './patrolui.js';
import { clinicTick, clinicView, walkFactor } from './clinicui.js';
import { fireProps, fireSigns } from './fireart.js';
import { fireTick, fireView } from './fireui.js';
import { BUREAU, PRECINCT, RANGER_HUT, COURTHOUSE, CLINIC, TILE } from './place.js';
export { bureauActors, drawBadge } from './bureauart.js';
export { renderBureau, simReadout, pawWallet } from './bureauui.js';
export { BUREAU, BUREAU_SPOT } from './place.js';
// world drawables: the Bureau desk + Watchdogs, (Phase 3) the precinct kiosk, ranger station, officers, rangers, litter, and
// (Phase 4) the courthouse with its judge, clerk and duty defender
export const bureauProps = (t, deps, player = null) => [...deskProps(t, deps, player), ...patrolProps(t, deps, player), ...courtProps(t, deps, player), ...clinicProps(t, deps, player, { ...clinicView(), events: fireView().events }), ...fireProps(t, deps, player, fireView())];
// the per-frame hook: police/rangers (Phase 3) and the clinic (Phase 5) each get the same frozen copy of the position
export function simTick(dt, t, view, tileAt, T) { patrolTick(dt, t, view, tileAt, T); clinicTick(dt, t, view, tileAt, T); fireTick(dt, t, view); } // + (Phase 6) the firehouse
// Phase 5: walking speed multiplier while an opted-in cartoon bump is on (1 = normal; never under 0.85, never past 60 s)
export { walkFactor };
// world-px rectangles of the sim buildings' signs/roofs: the guide's off-screen pointer label steers clear of them
export const signRects = () => [
  { x: COURTHOUSE.x * TILE - 4, y: COURTHOUSE.y * TILE - 62, w: COURTHOUSE.w * TILE + 8, h: 62 + TILE }, { x: CLINIC.x * TILE - 6, y: CLINIC.y * TILE - 68, w: CLINIC.w * TILE + 12, h: 38 },
  ...[BUREAU, PRECINCT, RANGER_HUT].map((b) => ({ x: b.x * TILE - 4, y: (b.y - 1.6) * TILE, w: b.w * TILE + 8, h: 1.6 * TILE })), ...fireSigns()];

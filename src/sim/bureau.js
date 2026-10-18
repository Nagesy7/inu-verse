// Paw Audit Bureau: the one entry point the game imports (src/main.js). Drawing, panels and the patrol tick only; the sim
// engine, ledger and Pawmarks stay behind it and are never imported by game code (tests/sim-firewall.test.mjs checks).
import { bureauProps as deskProps } from './bureauart.js';
import { patrolProps } from './patrolui.js';
import { courtProps } from './courtart.js';
export { bureauActors, drawBadge } from './bureauart.js';
export { renderBureau, simReadout, pawWallet } from './bureauui.js';
export { simTick } from './patrolui.js';
export { BUREAU, BUREAU_SPOT } from './place.js';
// world drawables: the Bureau desk + Watchdogs, (Phase 3) the precinct kiosk, ranger station, officers, rangers, litter, and
// (Phase 4) the courthouse with its judge, clerk and duty defender
export const bureauProps = (t, deps, player = null) => [...deskProps(t, deps, player), ...patrolProps(t, deps, player), ...courtProps(t, deps, player)];

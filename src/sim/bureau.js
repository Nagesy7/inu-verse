// Paw Audit Bureau: the one entry point the game imports (src/main.js). Drawing + the desk panel only; the sim engine,
// ledger and Pawmarks stay behind it and are never imported by game code (tests/sim-firewall.test.mjs checks).
export { bureauProps, bureauActors, drawBadge } from './bureauart.js';
export { renderBureau, simReadout, pawWallet } from './bureauui.js';
export { BUREAU, BUREAU_SPOT } from './place.js';

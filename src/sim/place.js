// Where the Paw Audit Bureau sits in the hub world: a violet audit desk on the plaza just west of the President's Office.
// No imports on purpose (world.js imports this). TILE must equal world.js TILE (tests/sim-bureau.test.mjs checks).
export const TILE = 32;
export const BUREAU = Object.freeze({ id: 'bureau', name: 'Paw Audit Bureau (the Watchdogs)', x: 22, y: 75, w: 3, h: 1, tx: 23, ty: 76, flag: { x: 19.9, y: 74.5 } });
export const BUREAU_SPOT = Object.freeze({ kind: 'bureau', id: 'bureau', name: 'Paw Audit Bureau desk', tx: BUREAU.tx, ty: BUREAU.ty });

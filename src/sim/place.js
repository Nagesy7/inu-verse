// Where the Paw Audit Bureau sits in the hub world: a violet audit desk on the plaza just west of the President's Office.
// No imports on purpose (world.js imports this). TILE must equal world.js TILE (tests/sim-bureau.test.mjs checks).
export const TILE = 32;
export const BUREAU = Object.freeze({ id: 'bureau', name: 'Paw Audit Bureau (the Watchdogs)', x: 22, y: 75, w: 3, h: 1, tx: 23, ty: 76, flag: { x: 19.9, y: 74.5 } });
export const BUREAU_SPOT = Object.freeze({ kind: 'bureau', id: 'bureau', name: 'Paw Audit Bureau desk', tx: BUREAU.tx, ty: BUREAU.ty });
// Phase 3: the Barkley Precinct police kiosk (Kibble Plaza, beside the road) and the Greenpaw Rangers station (the park).
export const PRECINCT = Object.freeze({ id: 'precinct', name: 'Barkley Precinct kiosk', x: 12, y: 46, w: 2, h: 1, tx: 12, ty: 47 });
export const RANGER_HUT = Object.freeze({ id: 'rangers', name: 'Greenpaw Rangers station', x: 38, y: 81, w: 2, h: 1, tx: 38, ty: 82 });
// copies of world.js street layout (tests/sim-police.test.mjs checks they match): zebra crossings are the only legal road tiles
export const STREETS = Object.freeze({ roads: Object.freeze([20, 31, 42]), avenue: 31, lastAvenueRow: 44 });
export const PARK = Object.freeze({ x: 2, y: 80, w: 60, h: 15 }); // the park + farmland lanes the rangers look after
// Phase 4: the Barkley Courthouse (open plaza east of the mall forecourt, north-east of the Bureau desk)
export const COURTHOUSE = Object.freeze({ id: 'court', name: 'Barkley Courthouse', x: 42, y: 70, w: 3, h: 1, tx: 43, ty: 71 });
// Phase 5: the Pawsley Pup Clinic (the lawn by the avenue, north-east of the plaza, above the arcade) and the café door the
// tummy-ache rule measures from (world.js: Shiba Sips Café; tests/sim-medical.test.mjs checks it matches)
export const CLINIC = Object.freeze({ id: 'clinic', name: 'Pawsley Pup Clinic', x: 58, y: 48, w: 3, h: 1, tx: 59, ty: 49 });
export const CAFE_DOOR = Object.freeze({ tx: 4, ty: 18 });
export const SIM_SOLIDS = Object.freeze([BUREAU, PRECINCT, RANGER_HUT, COURTHOUSE, CLINIC].map((r) => Object.freeze({ x: r.x, y: r.y, w: r.w, h: r.h })).concat([Object.freeze({ x: Math.floor(BUREAU.flag.x), y: Math.floor(BUREAU.flag.y), w: 1, h: 1 })]));
export const SIM_SPOTS = Object.freeze([BUREAU_SPOT, Object.freeze({ kind: 'bureau', id: 'precinct', tab: 'precinct', name: PRECINCT.name, tx: PRECINCT.tx, ty: PRECINCT.ty }),
  Object.freeze({ kind: 'bureau', id: 'rangers', tab: 'rangers', name: RANGER_HUT.name, tx: RANGER_HUT.tx, ty: RANGER_HUT.ty }),
  Object.freeze({ kind: 'bureau', id: 'court', tab: 'court', name: COURTHOUSE.name, tx: COURTHOUSE.tx, ty: COURTHOUSE.ty }),
  Object.freeze({ kind: 'bureau', id: 'clinic', tab: 'clinic', name: CLINIC.name, tx: CLINIC.tx, ty: CLINIC.ty })]);

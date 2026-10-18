// The side currency's display label, in ONE place. Rename here (e.g. to 'Pawbucks') and every panel, readout and report follows.
// The internal unit id stays 'PAWMARK' (firewall.js SIM_UNIT) so logs and anchors stay valid after a rename.
// tests/sim-economy.test.mjs fails if the display name is hard-coded in a quoted string anywhere else in src/sim/**.
export const CURRENCY = Object.freeze({ name: 'Pawmarks', one: 'Pawmark', short: 'PM' });
export const pm = (n) => `${Math.floor(n || 0)} ${CURRENCY.short}`;

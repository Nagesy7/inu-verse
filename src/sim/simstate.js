// One Pawmarks wallet per page (shared by the Bureau desk, the precinct, the ranger station and the patrol tick), plus a
// throttled sync to the sim server anchor (/api/sim-log). A 429 (server rate limit) retries a little later, at most twice.
import { createPawWallet } from './pawbook.js';
let W = null, lastSync = 0, timer = null;
export const pawWallet = () => (W ||= createPawWallet());
export function syncSoon(then, tries = 2) { const now = Date.now(); if (now - lastSync < 2500) { if (!timer) timer = setTimeout(() => { timer = null; syncSoon(then, tries); }, 2600 - (now - lastSync)); return; } lastSync = now;
  pawWallet().sync().then((st) => { then?.(); if (st?.server === 'busy' && tries > 0) setTimeout(() => { lastSync = 0; syncSoon(then, tries - 1); }, 2600); }).catch(() => {}); }
export const syncNow = (then) => { lastSync = 0; syncSoon(then); };

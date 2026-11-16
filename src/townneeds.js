// Town Hall daily needs (preview): one posted need per sky day, e.g. "20 planks for the bridge". The town's crews chip in
// part of what they make; the player's job shifts can finish it. Pure + deterministic from the sky day.
import { production } from './townecon.js';
export const NEEDS = Object.freeze([
  { id: 'bridge', good: 'planks', n: 20, what: 'for the bridge', done: 'The bridge is fixed!' },
  { id: 'wellwall', good: 'stone', n: 14, what: 'for the well wall', done: 'The well wall is rebuilt!' },
  { id: 'firetools', good: 'tools', n: 8, what: 'for the Fire Station', done: 'The fire crew has new tools!' },
  { id: 'supper', good: 'bread', n: 24, what: 'for the harvest supper', done: 'Harvest supper is served!' },
  { id: 'fishfry', good: 'fish', n: 14, what: 'for the Friday fish fry', done: 'The fish fry is on!' },
  { id: 'lamps', good: 'ore', n: 18, what: 'for new street lamps', done: 'New lamps are up!' },
  { id: 'granary', good: 'wheat', n: 22, what: 'for the granary', done: 'The granary is full!' },
]);
export const CREW_SHARE = 0.4; // the part of the day's output the crews put towards the posted need
const h32 = (x) => { let h = 2166136261; for (const c of String(x)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
export const needOf = (skyDay) => NEEDS[h32('need:' + skyDay) % NEEDS.length];
/** progress on today's need. made = the player's goods for this sky day */
export function needStatus(skyDay, sec, made = {}) {
  const N = needOf(skyDay), crew = Math.floor(production(sec)[N.good] * CREW_SHARE), you = made[N.good] || 0;
  const have = Math.min(N.n, crew + you);
  return { ...N, crew: Math.min(N.n, crew), you, have, left: N.n - have, complete: have >= N.n, title: `${N.n} ${N.good} ${N.what}` };
}

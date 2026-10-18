// The Watchdogs: the Paw Audit Bureau's seven members. Original Inu Verse pups, drawn with the normal Shiba renderer
// (layered outfit atlas) plus a violet Bureau tabard with silver trim and the magnifier-over-paw badge (bureauart.js).
// Independence: no wallet, no balance, no in-sim income; the engine refuses any Pawmark movement to or from them and any
// investigative action against them by another group.
import { CURRENCY } from './currency.js';
export const COLORS = Object.freeze({ violet: '#7B4FD6', violetDark: '#4f2f9a', violetLight: '#a58bea', silver: '#C9CED6', silverDark: '#8e95a3', ink: '#141a2e' });
const SUIT = { top: 'jacket_black', bottom: 'slacks_black', feet: 'loafers' };
// post = tile coords (centre of the pup's feet). patrol = [dx, dy] tiles of a slow eased back-and-forth walk.
export const WATCHDOGS = Object.freeze([
  { id: 'sim:chief-juniper', name: 'Juniper Ledgerpaw', role: 'chief', title: 'Chief Auditor', coat: 'gray', outfit: { ...SUIT, top: 'suit_navy', eyes: 'shades' }, prop: 'cap', post: [23.5, 74.55], owns: [12],
    line: 'Every report is signed by me and goes to Zachary before anything big ships.' },
  { id: 'sim:econ-tally', name: 'Tally Crumbsworth', role: 'economy', title: 'Economy Auditor', coat: 'cream', outfit: { ...SUIT }, prop: 'ledger', post: [21.2, 74.9], owns: [3, 4],
    line: `${CURRENCY.name} go in. Nothing comes out. That is the whole point.` },
  { id: 'sim:econ-penny', name: 'Penny Sniffington', role: 'economy', title: 'Economy Auditor', coat: 'tan', outfit: { ...SUIT, neck: 'bowtie' }, prop: 'ledger', post: [20.8, 76.6], owns: [2, 5, 8],
    line: 'The prize boards are off-limits to the sim. I check the fences every shift.' },
  { id: 'sim:justice-ivy', name: 'Ivy Gavelby', role: 'justice', title: 'Justice Auditor', coat: 'dark', outfit: { ...SUIT, neck: 'tie_red' }, prop: 'scales', post: [25.9, 75.3], owns: [6],
    line: 'Bribes cannot erase evidence. The log does not forget.' },
  { id: 'sim:justice-rook', name: 'Rook Fairfield', role: 'justice', title: 'Justice Auditor', coat: 'golden', outfit: { ...SUIT }, prop: 'scales', post: [26.0, 77.0], owns: [7, 11],
    line: 'Nobody real gets dragged into the sim without saying yes first.' },
  { id: 'sim:systems-hash', name: 'Byte Hashbrown', role: 'systems', title: 'Systems Auditor', coat: 'red', outfit: { ...SUIT, eyes: 'shades' }, prop: 'tablet', post: [21.0, 78.2], patrol: [3.2, 0], owns: [1, 10],
    line: 'Every action is chained to the one before it. Change one and the chain snaps.' },
  { id: 'sim:redteam-ziggy', name: 'Ziggy Pickwick', role: 'redteam', title: 'Red-Team Pup', coat: 'tan', outfit: { top: 'hoodie_maroon', bottom: 'jeans_ripped', feet: 'sneakers_red' }, prop: 'bandana', post: [24.6, 78.9], patrol: [-2.4, 0], owns: [9],
    line: 'My job is to break things before anyone else can. Then I write it down.' },
]);
export const ROLE_COUNTS = { chief: 1, economy: 2, justice: 2, systems: 1, redteam: 1 };
export const memberFor = (n) => WATCHDOGS.find((m) => m.owns.includes(n));

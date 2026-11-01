// Monthly parties: a date-driven themed event. The party for the current Sydney month switches on by itself on the 1st and
// off at the end of the month. Each party has decorations (drawn in the hub) and ONE free party item (furniture for your
// Kennel), claimable once per party per year. Free, in-game only: no Bones, no $KIBBLE, no wallet.
import { ensureClub } from './state.js';
import { award } from './stamps.js';

export const TZ = 'Australia/Sydney';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthName = (m) => MONTHS[(m - 1 + 12) % 12];
/** { y, m (1-12), d } for an instant in Sydney time. */
export function sydneyYMD(now = Date.now()) {
  const d = now instanceof Date ? now : new Date(now);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-AU', { timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(d).map((p) => [p.type, p.value]));
  return { y: +parts.year, m: +parts.month, d: +parts.day };
}
export const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

// Hub tile coordinates: lantern posts stand on the walks either side of the main street (rows 19 and 23), in the gaps between
// home plots so they never cover a door; bunting hangs between neighbouring posts. The party booth stands on the grass
// verge east of the avenue, bottom edge on row 18 (tile 48,18 is its interact spot).
const POST_X = [1, 8, 15, 22, 29, 41, 48, 55, 62];
const POSTS = [19, 23].flatMap((y) => POST_X.map((x) => [x, y]));
export const BOOTH = [48, 18];
export const PARTIES = {
  11: {
    key: 'jacaranda', month: 11, name: 'Jacaranda Bloom Party', short: 'Jacaranda Party',
    blurb: 'The jacaranda trees are in full bloom! Purple petals drift over every street, lanterns glow along the walks, and the Party Booth on the grass just east of the avenue has a free Jacaranda Lantern for every pup.',
    palette: { main: '#7d5bd0', light: '#c3a6f0', dark: '#3e2a78', accent: '#f2cc68', petal: '#b38ae8' },
    item: 'jaca_lantern', petals: true, posts: POSTS, booth: BOOTH,
  },
  12: {
    key: 'summerlights', month: 12, name: 'Summer Lights Festival', short: 'Summer Lights',
    blurb: 'Long warm evenings and strings of fairy lights over every walk. Grab a free Starlight Garland at the party booth and light up your Kennel.',
    palette: { main: '#e0563f', light: '#ffd27a', dark: '#2a6a5a', accent: '#5fd0c0', petal: '#ffe7a3' },
    item: 'star_garland', petals: false, sparkles: true, posts: POSTS, booth: BOOTH,
  },
};
/** The party running at `now` (Sydney month), or null. override: 'off' | a month number | a party key (dev/proof). */
export function partyAt(now = Date.now(), override = null) {
  const { y, m, d } = sydneyYMD(now);
  if (override === 'off') return null;
  let p = PARTIES[m];
  if (override != null && override !== '') { const k = String(override).toLowerCase(); p = PARTIES[+k] || Object.values(PARTIES).find((q) => q.key === k || q.key.startsWith(k)) || p; }
  if (!p) return null;
  const left = p.month === m ? daysInMonth(y, m) - d : null;
  return { ...p, id: `${p.key}-${y}`, year: y, daysLeft: left, ends: `${daysInMonth(y, p.month)} ${monthName(p.month)}` };
}
/** Next party after `now` (for the Inu Times / panel when nothing is on). */
export function nextParty(now = Date.now()) {
  const { y, m } = sydneyYMD(now);
  for (let i = 1; i <= 12; i++) { const mm = ((m - 1 + i) % 12) + 1, yy = y + Math.floor((m - 1 + i) / 12); if (PARTIES[mm]) return { ...PARTIES[mm], id: `${PARTIES[mm].key}-${yy}`, year: yy, starts: `1 ${monthName(mm)} ${yy}` }; }
  return null;
}
export const attended = (s, party) => !!(party && ensureClub(s).party.attended[party.id]);
export const claimed = (s, party) => !!(party && ensureClub(s).party.claimed[party.id]);
/** Mark that the player joined this party (once). Returns newly earned stamps. */
export function attend(s, party, now) {
  if (!party) return []; const c = ensureClub(s);
  if (!c.party.attended[party.id]) c.party.attended[party.id] = new Date(now ?? Date.now()).toISOString();
  return award(s, 'party-attend', now);
}
/** Claim the party's free item once: it goes to the furniture inventory (place it in your Kennel). */
export function claimItem(s, party, now) {
  if (!party) return { ok: false, reason: 'No party is on right now.' };
  const c = ensureClub(s); if (c.party.claimed[party.id]) return { ok: false, reason: 'You already collected this party item.' };
  c.party.claimed[party.id] = new Date(now ?? Date.now()).toISOString();
  s.inventory ||= {}; s.inventory[party.item] = (s.inventory[party.item] || 0) + 1;
  return { ok: true, item: party.item, stamps: [...attend(s, party, now), ...award(s, 'party-item', now)] };
}

// The Inu Times: the in-game newspaper. One edition per Sydney month. Every story describes something that is really live
// in Inu Verse right now and tells players how to reach it; no invented figures, prices, quotes or player counts.
// Dates shown (party end, hunt end) are computed from the real calendar.
import { partyAt, nextParty, sydneyYMD, monthName } from './parties.js';
import { huntAt, pinsOfHunt, HUNT_DAYS } from './hunts.js';
import { ADOPT_PRICE } from './pups.js';

const FIRST = { y: 2026, m: 11 }; // Edition 1 = November 2026 (the month the Times launched)
const fmt = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${monthName(m)}`; };
export function edition(now = Date.now(), partyOverride = null) {
  const { y, m } = sydneyYMD(now), no = Math.max(1, (y - FIRST.y) * 12 + (m - FIRST.m) + 1), party = partyAt(now, partyOverride), hunt = huntAt(now), next = nextParty(now);
  const pins = pinsOfHunt(hunt.n).map((p) => p.name);
  const lead = party
    ? { tag: 'Party', h: `${party.name} is on!`, body: `${party.blurb} The party runs until ${party.ends}.`, how: 'Walk the main streets to see the decorations, then open Menu → Club → Party & Pins to collect the free party item.' }
    : { tag: 'Coming up', h: next ? `Next party: ${next.name}` : 'Parties return soon', body: next ? `${next.blurb} It starts on ${next.starts}.` : 'Check back next month.', how: 'Menu → Club → Party & Pins shows what is on.' };
  const stories = [
    lead,
    { tag: 'New', h: 'Every pup gets a Kennel', body: 'You now have your own Kennel: a cosy room to decorate with furniture you own. Place, move and rotate pieces in build mode, then switch on Visitors so friends can drop by and sign your guestbook.', how: 'Menu → Club → My Kennel.' },
    { tag: 'New', h: 'Adopt a pet pup', body: `Small pups in eight coat colours are waiting for a home. Adoption costs ${ADOPT_PRICE} Bones. Name your pup, feed it a snack, play fetch, and take it for a walk around town. Pups get hungry or bored if you are away, but they never run off.`, how: 'Menu → Club → Pet Pups.' },
    { tag: 'New', h: 'Start your Stamp Book', body: 'Earn stamps for visiting places, working shifts, playing games, decorating, caring for pups, joining parties and finding pins. Stamps are sorted into easy, medium and hard.', how: 'Menu → Club → Stamp Book.' },
    { tag: 'Hunt', h: 'Pin Hunt', body: `Three pins are hidden in rooms around town: ${pins.join(', ')}. Walk over a pin to collect it. A new hunt with new hiding places starts every ${HUNT_DAYS} days; this one ends on ${fmt(hunt.end)}.`, how: 'Menu → Club → Party & Pins shows which rooms to search.' },
    { tag: 'Around town', h: 'Boss Raids every hour', body: 'A new boss appears at the Raid Gate on Kibble Plaza every hour. Raids are free to play for everyone.', how: 'Walk south to Kibble Plaza.' },
    { tag: 'Around town', h: 'Shifts at Shiba Sips Café', body: 'Start a floor shift at Shiba Sips Café and serve the line of customers to earn Bones.', how: 'Walk into the café and press Start floor shift.' },
    { tag: 'Around town', h: 'Class is in at Good Boy Academy', body: 'Dean Barkley runs the classroom at Good Boy Academy, teaching trading vocab for pups.', how: 'Walk into the Academy.' },
    { tag: 'Around town', h: 'Swap at the Trading Post', body: 'Trade wardrobe items and furniture you bought with Bones, item for item, with other players.', how: 'Open the online players list and press Trades.' },
  ];
  return { no, title: 'The Inu Times', date: `${monthName(m)} ${y}`, stories };
}

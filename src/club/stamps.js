// Stamp book: achievement stamps for things you do in the world. Pure + headless-testable.
// Stamps are a record only: no Bones, no $KIBBLE, no prizes. Earned stamps live in s.club.stamps { id: ISO date }.
import { ensureClub } from './state.js';

export const TIERS = { easy: { name: 'Easy', paws: 1, color: '#5fb36a' }, medium: { name: 'Medium', paws: 2, color: '#4f8fe0' }, hard: { name: 'Hard', paws: 3, color: '#a35ad8' } };
export const CATS = [['explore', 'Explore'], ['play', 'Games & Work'], ['social', 'Social'], ['kennel', 'Kennel'], ['pups', 'Pups'], ['events', 'Events']];
// icon = key into the club icon sheet (assets/club/icons.png, see scripts/club_art.py + src/club/iconmap.js)
export const STAMPS = [
  { id: 'visit-cafe', cat: 'explore', tier: 'easy', icon: 'cafe', name: 'Coffee Break', desc: 'Step inside the Shiba Sips Café.' },
  { id: 'visit-park', cat: 'explore', tier: 'easy', icon: 'park', name: 'Blossom Stroll', desc: 'Visit Hanami Park.' },
  { id: 'visit-beach', cat: 'explore', tier: 'easy', icon: 'beach', name: 'Sandy Paws', desc: 'Visit Biscuit Beach.' },
  { id: 'visit-shrine', cat: 'explore', tier: 'medium', icon: 'shrine', name: 'Island Hop', desc: 'Reach Pawprint Shrine Isle.' },
  { id: 'visit-academy', cat: 'explore', tier: 'easy', icon: 'academy', name: 'Back to School', desc: 'Visit Good Boy Academy.' },
  { id: 'visit-mall', cat: 'explore', tier: 'easy', icon: 'mall', name: 'Window Shopper', desc: 'Walk into the Kibble Mall.' },
  { id: 'visit-districts', cat: 'explore', tier: 'medium', icon: 'districts', name: 'Arcade Explorer', desc: 'Ride out to the Arcade Districts.' },
  { id: 'explorer', cat: 'explore', tier: 'hard', icon: 'explorer', name: 'Globe Trotter', desc: 'Visit 8 different rooms and zones.' },
  { id: 'cafe-shift', cat: 'play', tier: 'medium', icon: 'shift', name: 'Shift Done', desc: 'Finish a work shift at the café.' },
  { id: 'job', cat: 'play', tier: 'easy', icon: 'job', name: 'Hard Worker', desc: 'Finish any town job.' },
  { id: 'arcade', cat: 'play', tier: 'easy', icon: 'arcade', name: 'Press Start', desc: 'Open the Inu Arcade.' },
  { id: 'emote', cat: 'social', tier: 'easy', icon: 'emote', name: 'Say Hi', desc: 'Use an emote.' },
  { id: 'guestbook', cat: 'social', tier: 'medium', icon: 'guestbook', name: 'Kind Words', desc: "Sign another player's guestbook." },
  { id: 'visit-home', cat: 'social', tier: 'medium', icon: 'visitors', name: 'House Guest', desc: "Visit another player's Kennel or home." },
  { id: 'kennel-home', cat: 'kennel', tier: 'easy', icon: 'kennel', name: 'Home Sweet Kennel', desc: 'Go inside your own Kennel.' },
  { id: 'kennel-decor', cat: 'kennel', tier: 'medium', icon: 'decor', name: 'Interior Designer', desc: 'Have 5 pieces of furniture in your Kennel.' },
  { id: 'kennel-open', cat: 'kennel', tier: 'medium', icon: 'door', name: 'Open House', desc: 'Welcome visitors to your Kennel.' },
  { id: 'pup-adopt', cat: 'pups', tier: 'easy', icon: 'pup', name: 'New Best Friend', desc: 'Adopt a pet pup.' },
  { id: 'pup-feed', cat: 'pups', tier: 'easy', icon: 'feed', name: 'Snack Time', desc: 'Feed your pup.' },
  { id: 'pup-play', cat: 'pups', tier: 'easy', icon: 'play', name: 'Fetch!', desc: 'Play with your pup.' },
  { id: 'pup-pack', cat: 'pups', tier: 'hard', icon: 'pack3', name: 'Pup Pack', desc: 'Adopt 3 pet pups.' },
  { id: 'party-attend', cat: 'events', tier: 'easy', icon: 'party', name: 'Party Pup', desc: 'Join a monthly party.' },
  { id: 'party-item', cat: 'events', tier: 'easy', icon: 'gift', name: 'Party Favour', desc: "Collect a party's free item." },
  { id: 'pin-first', cat: 'events', tier: 'medium', icon: 'pin', name: 'Sharp Eyes', desc: 'Find a hidden pin.' },
  { id: 'pin-all', cat: 'events', tier: 'hard', icon: 'trophy', name: 'Pin Hunter', desc: 'Find every pin in one hunt.' },
  { id: 'times', cat: 'events', tier: 'easy', icon: 'times', name: 'Extra! Extra!', desc: 'Read the Inu Times.' },
  { id: 'stamp-10', cat: 'events', tier: 'hard', icon: 'star', name: 'Stamp Collector', desc: 'Earn 10 other stamps.' },
];
export const STAMP_BY_ID = Object.fromEntries(STAMPS.map((x) => [x.id, x]));
// room/zone scene id -> visit stamp
export const VISIT_STAMP = { cafe: 'visit-cafe', park: 'visit-park', beach: 'visit-beach', shrine: 'visit-shrine', academy: 'visit-academy', mall: 'visit-mall', districts: 'visit-districts' };
export const EXPLORER_N = 8;
export const hasStamp = (s, id) => !!ensureClub(s).stamps[id];
export const stampCount = (s) => Object.keys(ensureClub(s).stamps).filter((k) => STAMP_BY_ID[k]).length;
const iso = (now) => (now instanceof Date ? now : new Date(now ?? Date.now())).toISOString();
/** Award a stamp once. Returns the list of NEWLY earned stamps (the stamp plus any meta stamp it unlocks), [] if none. */
export function award(s, id, now) {
  const st = STAMP_BY_ID[id]; if (!st) return []; const c = ensureClub(s); if (c.stamps[id]) return [];
  c.stamps[id] = iso(now); const out = [st];
  if (id !== 'stamp-10' && !c.stamps['stamp-10'] && stampCount(s) >= 10) { c.stamps['stamp-10'] = iso(now); out.push(STAMP_BY_ID['stamp-10']); }
  return out;
}
/** Record a room/zone visit; returns newly earned stamps. Rooms that are someone's home ('home:...') don't count as places. */
export function visit(s, sceneId, now) {
  if (typeof sceneId !== 'string' || !sceneId || sceneId.startsWith('home:')) return [];
  const c = ensureClub(s), out = [];
  if (!c.visited.includes(sceneId)) { c.visited.push(sceneId); if (c.visited.length > 64) c.visited.length = 64; }
  if (VISIT_STAMP[sceneId]) out.push(...award(s, VISIT_STAMP[sceneId], now));
  if (c.visited.length >= EXPLORER_N) out.push(...award(s, 'explorer', now));
  return out;
}
/** Book pages: one per category, each stamp with earned date (or null). */
export function book(s) {
  const c = ensureClub(s);
  return CATS.map(([cat, name]) => ({ cat, name, stamps: STAMPS.filter((x) => x.cat === cat).map((x) => ({ ...x, at: c.stamps[x.id] || null })) }));
}
export const progressText = (s) => `${stampCount(s)} / ${STAMPS.length} stamps`;

// Pairing loops: duo jobs, couple perks + Top Couples, pup breeding (two Shibas), duo leaderboards, matchmaker.
// Multiplayer is simulated locally (seeded "players"), but every action goes through an outbox shaped for a real backend.
import { JOBS, payFor } from './jobs.js'; import { ensureRel, hearts, PEOPLE } from './relations.js';
import { OPTIONS } from './vendor/profile-schema.js';
const h32 = (x) => { let h = 2166136261; for (const c of String(x)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };
export const DUO_WEEK_DAYS = 7, DUO_POOL_BASE = 600, DUO_SPLIT = [0.5, 0.3, 0.2];
// simulated other players on the matchmaker board (stand-ins for real wallets later)
export const SIM_PLAYERS = ['Sora', 'Ponzu', 'Kinako', 'Miso', 'Udon', 'Natto', 'Wasabi', 'Tofu'].map((name, i) => ({ id: 'sim:' + name.toLowerCase(), name, sim: true,
  wants: ['duo', 'pups', 'friends', 'duo'][i % 4], skill: 0.55 + h32(name) * 0.4,
  look: { coat: OPTIONS.coat[i % OPTIONS.coat.length], pattern: OPTIONS.pattern[(i * 3) % OPTIONS.pattern.length], eyeShape: OPTIONS.eyeShape[i % 4], eyeColor: OPTIONS.eyeColor[(i * 2) % 5], ears: OPTIONS.ears[(i + 1) % 4], tail: OPTIONS.tail[(i * 3) % 4], markings: OPTIONS.markings[i % 5], size: OPTIONS.size[i % 3], accent: '#fff6e8' } }));
export function ensurePair(s) { s.pair ||= {}; const P = s.pair; P.week ??= 0; P.duo ||= {}; P.duoBest ||= 0; P.outbox ||= []; P.listing ??= null; P.requests ||= []; P.breedPups ||= []; P.history ||= []; P.couple ||= { score: 0, since: null }; return P; }
// ---------- duo jobs ----------
// partner: { kind:'npc'|'player', name, skill(0..1) }. NPC skill grows with hearts. Multiplier rewards in-sync play: combo + partner.
export function partnerFor(s, name) { const sim = SIM_PLAYERS.find((p) => p.name === name); if (sim) return { kind: 'player', name, skill: sim.skill, id: sim.id };
  if (PEOPLE[name]) { const h = hearts(ensureRel(s)[name]); return { kind: 'npc', name, skill: 0.45 + h * 0.04, hearts: h }; } return null; }
export function duoMultiplier(partner, myMaxCombo, sweetheart = false) { const sync = Math.min(0.25, Math.floor((myMaxCombo || 0) / 10) * 0.05); const bond = partner.kind === 'npc' ? Math.min(0.2, (partner.hearts || 0) * 0.02) : 0.1; return +(1.1 + sync + bond + (sweetheart ? 0.1 : 0)).toFixed(2); }
// partner's own score is deterministic from their skill + your performance (they keep pace with a good teammate)
export function partnerScore(partner, jobId, myScore, day) { const J = JOBS[jobId]; const theirs = Math.round((J.cap / J.rate) * 0.5 * partner.skill * (0.85 + h32(partner.name + jobId + day) * 0.3)); return Math.round(theirs * 0.6 + myScore * 0.4 * partner.skill); }
export function finishDuo(s, jobId, partner, result, day) { const P = ensurePair(s), mult = duoMultiplier(partner, result.maxCombo, partner.name === partnerOf(s) && coupleScore(s, day) >= 40), theirs = partnerScore(partner, jobId, result.score, day);
  const team = Math.round((result.score + theirs) * mult), bonus = Math.round(payFor(jobId, result, false).perf * (mult - 1)); s.bones += bonus;
  const key = 'you+' + partner.name; P.duo[key] = Math.max(P.duo[key] || 0, team); P.duoBest = Math.max(P.duoBest, team);
  if (partner.kind === 'player') P.outbox.push({ t: 'duo_result', with: partner.id, jobId, team, day });
  return { mult, theirs, team, bonus, best: P.duo[key] }; }
export function duoBoard(s, frac = 1) { const P = ensurePair(s); const mine = Object.entries(P.duo).map(([k, v]) => ({ id: k, name: k.replace('you', s.player?.name || 'You'), score: v, me: true }));
  const sims = [['Sora', 'Ponzu'], ['Kinako', 'Miso'], ['Udon', 'Natto'], ['Mochi', 'Hana'], ['Wasabi', 'Tofu']].map(([a, b]) => ({ id: a + '+' + b, name: `${a} + ${b}`, score: Math.floor((900 + h32(a + b + P.week) * 2600) * Math.max(0.05, frac)) }));
  return [...mine, ...sims].sort((a, b) => b.score - a.score); }
// weekly skill split: top 3 duos share the pool 50/30/20; each partner takes half of the duo's share
export function rollDuoWeek(s, pool = DUO_POOL_BASE) { const P = ensurePair(s), board = duoBoard(s, 1).filter((r, i, a) => !r.me || a.findIndex((x) => x.me) === i), out = [];
  board.slice(0, 3).forEach((r, i) => { const share = Math.floor(pool * DUO_SPLIT[i]); if (r.me) { s.bones += Math.floor(share / 2); out.push({ rank: i + 1, you: Math.floor(share / 2), duo: r.name }); } });
  P.history.unshift({ week: P.week, top: board.slice(0, 3).map((r) => r.name), you: out[0] || null }); P.history.length = Math.min(P.history.length, 8); P.week++; P.duo = {}; return out; }
// ---------- couples ----------
export const COUPLE_PERKS = [
  { id: 'home', name: 'Shared home', desc: 'Your partner lives with you; both can decorate', at: 0 },
  { id: 'garden', name: 'Couple garden', desc: '+10% harvest yield on your fields', at: 0 },
  { id: 'farm', name: 'Joint farm', desc: 'Partner waters crops every morning', at: 0 },
  { id: 'shop', name: 'Joint shop', desc: 'Partner covers one staff wage at your shop', at: 0 },
  { id: 'duo', name: 'Sweetheart duo', desc: '+0.1 duo multiplier together', at: 40 },
];
export const partnerOf = (s) => s.spouse?.name || s.p2p?.partner?.name || null;
export function coupleScore(s, day) { const p = partnerOf(s); if (!p) return 0; const P = ensurePair(s); P.couple.since ??= day; const days = Math.max(0, day - P.couple.since), h = PEOPLE[p] ? hearts(ensureRel(s)[p]) : 10;
  return Math.round(h * 5 + days * 3 + (s.pups?.length || 0) * 10 + Object.keys(P.duo).filter((k) => k.endsWith('+' + p)).length * 8 + (P.couple.bonus || 0)); }
export const perksFor = (s, day) => { const sc = coupleScore(s, day); return partnerOf(s) ? COUPLE_PERKS.filter((k) => sc >= k.at) : []; };
export function topCouples(s, day) { const me = partnerOf(s) ? [{ id: 'you', name: `${s.player?.name || 'You'} & ${partnerOf(s)}`, score: coupleScore(s, day), me: true }] : [];
  return [...me, ...[['Sora', 'Ponzu'], ['Kinako', 'Miso'], ['Taro', 'Goma'], ['Udon', 'Natto']].map(([a, b]) => ({ id: a + b, name: `${a} & ${b}`, score: Math.floor(20 + h32(a + b + Math.floor(day / 7)) * 90) }))].sort((a, b) => b.score - a.score); }
// ---------- pup breeding (two Shibas, both consent) ----------
const mixHex = (a, b, t = 0.5) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('');
// rare combos: deterministic collectibles (no luck) - specific parent trait pairs give a named rare coat
export const RARE_COMBOS = [
  { id: 'aurora', name: 'Aurora', when: (a, b) => a.markings === 'star' && b.markings === 'star', coat: '#b8a4ff', accent: '#ffe6ff' },
  { id: 'panda', name: 'Panda', when: (a, b) => [a.pattern, b.pattern].includes('mask') && [a.pattern, b.pattern].includes('spots'), coat: '#f4f4f4', pattern: 'mask' },
  { id: 'sunset', name: 'Sunset', when: (a, b) => a.eyeShape === 'sparkle' && b.eyeShape === 'sparkle', coat: '#ff9a5a', accent: '#ffe08a' },
  { id: 'sweetheart', name: 'Sweetheart', when: (a, b) => a.markings === 'heart' || b.markings === 'heart' ? a.markings === b.markings : false, coat: '#ffb0c8', markings: 'heart' },
];
export function breedLook(a, b, seedStr = '') { const pick = (k, i) => (h32(seedStr + k + i) < 0.5 ? a[k] : b[k]); const rare = RARE_COMBOS.find((r) => r.when(a, b));
  const look = { coat: mixHex(a.coat, b.coat, 0.35 + h32(seedStr + 'c') * 0.3), pattern: pick('pattern', 1), eyeShape: pick('eyeShape', 2), eyeColor: pick('eyeColor', 3), ears: pick('ears', 4), tail: pick('tail', 5), markings: pick('markings', 6), size: 'small', accent: mixHex(a.accent || '#ffffff', b.accent || '#ffffff') };
  if (rare) Object.assign(look, { coat: rare.coat, ...(rare.pattern ? { pattern: rare.pattern } : {}), ...(rare.markings ? { markings: rare.markings } : {}), ...(rare.accent ? { accent: rare.accent } : {}) });
  return { look, rare: rare ? { id: rare.id, name: rare.name } : null }; }
// request -> other player consents -> pup born into BOTH wallets' pets (profile)
export function requestBreed(s, otherId) { const P = ensurePair(s); if (P.requests.some((r) => r.with === otherId && r.state === 'pending')) return { ok: false, reason: 'Already asked' }; if (s.p2p?.blocked?.includes(otherId)) return { ok: false, reason: 'Blocked' };
  const req = { id: 'br' + (P.requests.length + 1), with: otherId, state: 'pending', consent: { you: true, them: null } }; P.requests.push(req); P.outbox.push({ t: 'breed_request', with: otherId, req: req.id }); return { ok: true, req }; }
export function respondBreed(s, reqId, accept) { const r = ensurePair(s).requests.find((x) => x.id === reqId); if (!r) return { ok: false }; r.consent.them = !!accept; r.state = accept ? 'accepted' : 'declined'; return { ok: true }; }
export function breed(s, reqId, myLook, name, day) { const P = ensurePair(s), r = P.requests.find((x) => x.id === reqId); if (!r || r.state !== 'accepted' || !r.consent.you || !r.consent.them) return { ok: false, reason: 'Both players must consent' };
  if (P.breedPups.length >= 6) return { ok: false, reason: 'Max 6 pups (they will follow you to other games)' }; const other = SIM_PLAYERS.find((x) => x.id === r.with); if (!other) return { ok: false, reason: 'Unknown player' };
  const { look, rare } = breedLook(myLook, other.look, r.id + day); const pup = { id: 'pup-' + r.id, name: String(name || (rare ? rare.name + ' Pup' : 'Pup')).slice(0, 14), look, rare, parents: ['you', other.name], born: day };
  P.breedPups.push(pup); r.state = 'done'; P.outbox.push({ t: 'pup_born', with: other.id, pup: pup.id }); return { ok: true, pup }; }
// matchmaker listing (what you're looking for); simulated players reply deterministically
export function setListing(s, wants) { ensurePair(s).listing = ['duo', 'pups', 'friends', 'couple'].includes(wants) ? wants : null; ensurePair(s).outbox.push({ t: 'listing', wants }); return { ok: true }; }
export const simAccepts = (simId, kind) => { const p = SIM_PLAYERS.find((x) => x.id === simId); return !!p && (p.wants === kind || p.wants === 'friends'); };

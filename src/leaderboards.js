// Leaderboards hall (Mall plaza). One data model per game so a backend can feed rows later:
//   GAMES[gameId] = { name, status: 'live'|'coming_soon', boards: [{ id, title, pool, criterion, unit }] }
//   rows: [{ rank, id, name, score, sample? }]  (a server would return exactly this shape per board)
// Prize pools are won by skill/activity score - highest score wins that game's share of the pool.
import { NPC_HOMES } from './world.js';
import { NPC_INTERIORS } from './homes.js';
import { leaderboard as packBoard } from './packs.js';
import { homeDecorScore } from './mall.js';

export const GAMES = {
  verse: { name: 'Inu Verse', status: 'live', share: '100% of each pool while Inu Verse is the only live game', boards: [
    { id: 'daily', pool: 'daily', title: 'Daily – top job earner', criterion: 'Most bones earned from café / job shifts today', unit: 'bones' },
    { id: 'weekly', pool: 'weekly', title: 'Weekly – best decorated home', criterion: 'Highest home decor score this week (10 per item + 5 per wall/floor upgrade level)', unit: 'decor pts' },
    { id: 'monthly', pool: 'monthly', title: 'Monthly – top Pack', criterion: 'Highest Pack score in the Kibble Cup', unit: 'pts' } ] },
  empires: { name: 'Inu Empires', status: 'coming_soon', share: 'Share of pools set when the game launches', boards: [
    { id: 'rating', pool: 'weekly', title: 'Ranked 1v1 rating', criterion: 'Highest ranked 1v1 rating at the end of the period', unit: 'rating' } ] },
  quest: { name: 'Inu Quest', status: 'coming_soon', share: 'Share of pools set when the game launches', boards: [
    { id: 'gym', pool: 'daily', title: 'Fastest gym clears', criterion: 'Fastest verified gym clear time', unit: 'sec' },
    { id: 'defense', pool: 'monthly', title: 'Pack Gym defenses', criterion: 'Most successful Pack Gym defenses', unit: 'defenses' } ] },
};
const SAMPLE = { rating: [['Sample Pup A', 1840], ['Sample Pup B', 1772], ['Sample Pup C', 1705]], gym: [['Sample Pup A', 74], ['Sample Pup B', 81], ['Sample Pup C', 95]], defense: [['Sample Pack A', 12], ['Sample Pack B', 9], ['Sample Pack C', 7]] };
const NPC_EARNERS = ['Mochi', 'Kuro', 'Hana', 'Taro', 'Yuzu', 'Goma'];
const h32 = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };
const rank = (rows, asc = false) => rows.sort((a, b) => (asc ? a.score - b.score : b.score - a.score) || a.name.localeCompare(b.name)).map((r, i) => ({ ...r, rank: i + 1 }));

// entries for one board. dayFrac: 0..1 of the current in-game day elapsed (NPC sim grows through the day)
export function boardRows(s, gameId, boardId, dayFrac = 1) {
  if (gameId !== 'verse') return rank((SAMPLE[boardId] || []).map(([name, score]) => ({ id: name, name, score, sample: true })), boardId === 'gym');
  const day = s.mall?.period?.day || 0;
  if (boardId === 'daily') return rank([{ id: 'you', name: s.player.name, score: s.mall?.activity?.dayBones || 0 }, ...NPC_EARNERS.map((n) => ({ id: 'npc_' + n.toLowerCase(), name: n, score: Math.floor((40 + h32(n + day) * 220) * dayFrac) }))]);
  if (boardId === 'weekly') return rank([{ id: 'you', name: s.player.name, score: homeDecorScore(s) }, ...NPC_HOMES.map((h) => { const I = NPC_INTERIORS[h.id]; return { id: 'npc_' + h.owner.toLowerCase(), name: h.owner, score: I.items.length * 10 + (I.wall + I.floor) * 5 }; })]);
  if (boardId === 'monthly') return packBoard(s).map((r) => ({ id: r.id, name: `${r.name} [${r.tag}]`, score: r.score, mine: r.mine, rank: r.rank }));
  return [];
}
// entries feed for mall.rollPeriods (Inu Verse is the only live game)
export const poolEntries = (s, dayFrac = 1) => (pool) => boardRows(s, 'verse', pool, dayFrac);

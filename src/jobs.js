// Job mini-games: pay, streak/combo bonuses, daily first-shift bonus, ranks and personal bests. Pure + testable.
// Fair by design: pay depends only on in-game performance; there are no paid boosts.
import { perk } from './traits.js';
import { earnBones } from './outfits.js';
export const JOBS = {
  cafe:        { name: 'Café Order Rush', game: 'match', dur: 45, base: 10, rate: 0.5, cap: 120, where: 'Shiba Sips Café' },
  delivery:    { name: 'Delivery Dash', game: 'dodge', dur: 40, base: 10, rate: 0.45, cap: 110, where: 'Shiba Sips Café' },
  sweeper:     { name: 'Windy Sweep', game: 'collect', dur: 35, base: 8, rate: 0.5, cap: 90 },
  pond:        { name: 'Leaf Scoop', game: 'collect', dur: 35, base: 8, rate: 0.5, cap: 90 },
  window:      { name: 'Smudge Swipe', game: 'swipe', dur: 35, base: 8, rate: 0.45, cap: 90 },
  painter:     { name: 'Fresh Coat', game: 'swipe', dur: 35, base: 8, rate: 0.45, cap: 90 },
  roadcrew:    { name: 'Pothole Patch', game: 'timing', dur: 35, base: 8, rate: 0.6, cap: 90 },
  gardener:    { name: 'Topiary Trim', game: 'trace', dur: 40, base: 8, rate: 0.5, cap: 90 },
  electrician: { name: 'Wire Up', game: 'wire', dur: 45, base: 9, rate: 0.6, cap: 100 },
  bins:        { name: 'Bin Run', game: 'catch', dur: 35, base: 8, rate: 0.5, cap: 90 },
  billboard:   { name: 'Poster Slide', game: 'slide', dur: 40, base: 9, rate: 0.6, cap: 100 },
};
export const WORKER_JOB = { sweeper: 'sweeper', gardener: 'gardener', 'window cleaner': 'window', 'road crew': 'roadcrew', electrician: 'electrician', painter: 'painter', 'bin collector': 'bins', 'pond cleaner': 'pond', 'billboard repair': 'billboard' };
export const RANKS = [['Trainee', 0], ['Apprentice', 300], ['Skilled', 900], ['Pro', 2000], ['Expert', 4000], ['Master', 7500], ['Legend', 12000]];
export const FIRST_SHIFT_BONUS = 25;
export const comboBonus = (maxCombo) => Math.min(30, Math.floor(maxCombo / 5) * 3); // +3 per 5-streak, capped
export function payFor(jobId, { score, maxCombo }, firstToday, traitMult = 1) { const J = JOBS[jobId]; const perf = Math.round(Math.min(J.cap, J.base + score * J.rate) * traitMult); const combo = comboBonus(maxCombo || 0), first = firstToday ? FIRST_SHIFT_BONUS : 0;
  return { perf, combo, first, total: score > 0 ? perf + combo + first : first ? Math.floor(first / 2) : 0 }; }
export function rankOf(xp) { let r = RANKS[0], next = null; for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i][1]) { r = RANKS[i]; next = RANKS[i + 1] || null; } return { title: r[0], level: RANKS.indexOf(r), next: next ? { title: next[0], at: next[1] } : null }; }
export function ensureJobs(s) { s.jobs ||= {}; for (const k in JOBS) s.jobs[k] ||= { xp: 0, best: 0, runs: 0, lastDay: -1, bestCombo: 0 }; return s.jobs; }
// record a finished run: pays bones, xp = performance pay (capped), personal best. returns summary for the results screen
export function finishJob(s, jobId, result, day) { const J = ensureJobs(s)[jobId], first = J.lastDay !== day, pay = payFor(jobId, result, first, perk(s, 'jobPay')), before = rankOf(J.xp);
  J.runs++; J.lastDay = day; J.xp += pay.perf + pay.combo; /* skill xp capped per run */ const pb = result.score > J.best; if (pb) J.best = Math.round(result.score); J.bestCombo = Math.max(J.bestCombo, result.maxCombo || 0);
  J.today = J.today?.day === day ? { day, total: J.today.total + pay.total, best: Math.max(J.today.best, pay.perf) } : { day, total: pay.total, best: pay.perf };
  const earned = earnBones(s, pay.total); const after = rankOf(J.xp);
  return { ...pay, outfitBonus: earned.bonus, total: earned.total, pb, best: J.best, rank: after.title, rankUp: after.level > before.level, next: after.next, xp: J.xp }; }

// daily Job board (feeds the daily prize pool): today's shift earnings across all jobs vs seeded townsfolk
const h32 = (x) => { let h = 2166136261; for (const c of String(x)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };
export const JOB_RIVALS = ['Mochi', 'Kuro', 'Hana', 'Taro', 'Yuzu', 'Goma'];
export function jobBoard(s, day, frac = 1) { const J = ensureJobs(s), mine = Object.values(J).reduce((t, j) => t + (j.today?.day === day ? j.today.total : 0), 0);
  return [{ id: 'you', name: s.player?.name || 'You', score: mine, me: true }, ...JOB_RIVALS.map((n) => ({ id: n, name: n, score: Math.floor((60 + h32(n + day) * 380) * Math.max(0.05, frac)) }))].sort((a, b) => b.score - a.score); }

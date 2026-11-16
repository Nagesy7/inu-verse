// Player jobs as timing mini-games (preview). Pure + deterministic so tests and screenshots can pin any moment.
// The core is the same on every job: a red zone moves along a bar, the marker sits still in the middle, tap when the zone
// is under the marker. A hit pays 1 Bone x the multiplier, then the multiplier doubles (1x -> 64x cap). A miss resets it to 1x.
// The zone shrinks and speeds up with every tap. Each job moves its zone its own way (sweep, jitter, heat, drift, bob...).
// Bones are in-game play money only. They are never real earnings, never $KIBBLE, and never feed a prize pool.
export const ZJ = Object.freeze({
  SHIFT_ZONES: 12, // taps per shift
  BASE: 1, // Bones per zone scored at 1x
  MULT_CAP: 64,
  PERFECT_BONUS: 2, // small flat bonus for a dead-centre hit
  PERFECT_FRAC: 0.18, // centre band (fraction of the zone width) that counts as perfect
  SHIFT_CAP: 150, // most Bones one shift can pay
  DAILY_CAP: 400, // most job Bones per Sydney day, all jobs together. Past it shifts still count for rank and best, at 0 Bones.
  BUMP_MISSES: 3, // three misses in a row = a cartoon bump (the Hospital patches it up)
});
export const MARKER = 0.5;

// lot = the workplace door the job is taken at (townproposal lot ids). good = what each hit makes for the town.
export const ZJOBS = Object.freeze({
  sawmill: { id: 'sawmill', name: 'Log Chopper', place: 'Sawmill', lot: 'sawmill', good: 'planks', unit: 'plank', verb: 'CHOP', motion: 'sweep', how: 'Chop when the red zone is under the axe mark' },
  mine: { id: 'mine', name: 'Ore Strike', place: 'Mine', lot: 'mine', good: 'ore', unit: 'ore', verb: 'STRIKE', motion: 'jitter', how: 'Strike the vein when it glints under the mark' },
  forge: { id: 'forge', name: 'Quench!', place: 'Forge', lot: 'forge', good: 'tools', unit: 'tool', verb: 'QUENCH', motion: 'heat', how: 'Quench the blade before it overheats' },
  bakery: { id: 'bakery', name: 'Bread Pull', place: 'Bakery', lot: 'bakery', good: 'bread', unit: 'loaf', verb: 'PULL', motion: 'drift', how: 'Pull the bread before it burns' },
  fishery: { id: 'fishery', name: 'Reel In', place: 'Fishery', lot: 'dock', good: 'fish', unit: 'fish', verb: 'REEL', motion: 'bob', how: 'Reel in when the fish bites' },
  farm: { id: 'farm', name: 'Peak Pick', place: 'Farm', lot: 'farm', good: 'wheat', unit: 'sheaf', verb: 'PICK', motion: 'pulse', how: 'Pick at peak ripeness' },
  quarry: { id: 'quarry', name: 'Stone Split', place: 'Quarry', lot: 'quarry', good: 'stone', unit: 'block', verb: 'SPLIT', motion: 'accel', how: 'Split the block on the chisel line' },
  docks: { id: 'docks', name: 'Crate Swing', place: 'East Dock', lot: 'eastdock', good: 'cargo', unit: 'crate', verb: 'DROP', motion: 'pendulum', how: 'Drop the crate when it swings over the stack' },
  police: { id: 'police', name: 'Beat Patrol', place: 'Police Academy', lot: 'police', good: 'calm', unit: 'catch', verb: 'HALT!', motion: 'dart', how: 'Call "Halt!" when the pickpocket darts past' },
});
export const ZJOB_IDS = Object.freeze(Object.keys(ZJOBS));
export const RANKS = Object.freeze([['Trainee', 0], ['Apprentice', 25], ['Skilled', 75], ['Pro', 175], ['Expert', 350], ['Master', 600], ['Legend', 1000]]); // lifetime hits per job

export const zoneWidth = (level) => Math.max(0.07, 0.26 * Math.pow(0.9, level));
export const zoneSpeed = (level) => Math.min(1.6, 0.42 * Math.pow(1.1, level)); // bar-lengths of travel per second
const frac = (x) => x - Math.floor(x);
const tri = (x) => { const f = frac(x / 2) * 2; return f <= 1 ? f : 2 - f; }; // 0..1..0 every 2 units
// u in 0..1 = where the zone centre sits along its free travel, for a phase (accumulated speed * dt)
const MOTION = {
  sweep: (p) => tri(p),
  pendulum: (p) => (1 - Math.cos(Math.PI * p)) / 2,
  drift: (p) => frac(p * 0.5),
  jitter: (p) => Math.min(1, Math.max(0, tri(p) + Math.sin(p * 23) * 0.035)),
  heat: (p) => Math.pow(frac(p * 0.5), 1.6),
  bob: (p) => tri(p + 0.18 * Math.sin(p * 5.3)),
  pulse: (p) => tri(p * 0.8),
  accel: (p) => tri(p * (1 + 0.15 * tri(p * 0.25))),
  dart: (p) => tri(p + 0.12 * Math.sign(Math.sin(p * 4.1))),
};
export function zoneAt(jobId, phase, level) {
  const J = ZJOBS[jobId] || ZJOBS.sawmill;
  let w = zoneWidth(level);
  if (J.motion === 'pulse') w *= 0.8 + 0.2 * Math.sin(phase * 6); // ripeness swells and fades
  const u = (MOTION[J.motion] || MOTION.sweep)(phase);
  return { c: w / 2 + u * (1 - w), w };
}
export const isHit = (z) => Math.abs(z.c - MARKER) <= z.w / 2;
export const isPerfect = (z) => Math.abs(z.c - MARKER) <= (z.w * ZJ.PERFECT_FRAC) / 2;

// ---- save slice (s.townx). Added with defaults, never wipes anything else in the save.
export function ensureTownx(s) {
  if (!s) return null;
  const X = (s.townx && typeof s.townx === 'object') ? s.townx : (s.townx = {});
  X.v ||= 1; X.jobs ||= {}; X.jobDay ||= { day: '', bones: 0 }; X.made ||= { day: -1, goods: {} }; X.shops ||= {}; X.bought ||= { day: -1, items: {} };
  X.injury ??= null; X.log ||= [];
  for (const id of ZJOB_IDS) X.jobs[id] ||= { hits: 0, shifts: 0, best: 0, bestMult: 1, perfects: 0 };
  return X;
}
export function rankOf(hits) {
  let i = 0; for (let k = 0; k < RANKS.length; k++) if (hits >= RANKS[k][1]) i = k;
  const nx = RANKS[i + 1]; return { title: RANKS[i][0], level: i, next: nx ? { title: nx[0], at: nx[1] } : null };
}
export function capLeft(s, day) { const X = ensureTownx(s); return Math.max(0, ZJ.DAILY_CAP - (X.jobDay.day === day ? X.jobDay.bones : 0)); }

// ---- one shift
export function newShift(jobId, { cap = 0 } = {}) { return { job: jobId, cap: cap || ZJ.MULT_CAP, taps: 0, hits: 0, perfects: 0, mult: 1, bestMult: 1, score: 0, misses: 0, missRow: 0, bumped: false, phase: 0, done: false, last: null }; }
export function tap(run, z) {
  if (run.done) return run.last;
  const hit = isHit(z), perfect = hit && isPerfect(z);
  let pay = 0;
  if (hit) { pay = ZJ.BASE * run.mult + (perfect ? ZJ.PERFECT_BONUS : 0); run.hits++; run.missRow = 0; if (perfect) run.perfects++; run.mult = Math.min(run.cap || ZJ.MULT_CAP, run.mult * 2); run.bestMult = Math.max(run.bestMult, run.mult); }
  else { run.misses++; run.missRow++; run.mult = 1; if (run.missRow >= ZJ.BUMP_MISSES) run.bumped = true; }
  run.score += pay; run.taps++;
  if (run.taps >= ZJ.SHIFT_ZONES) run.done = true;
  run.last = { hit, perfect, pay, mult: run.mult, at: z.c, w: z.w };
  return run.last;
}
// advance the moving zone; level = taps so far (it gets harder every tap, hit or miss)
export function step(run, dt) { run.phase += zoneSpeed(run.taps) * dt; return zoneAt(run.job, run.phase, run.taps); }

// Pays the shift into the in-game Bones balance (capped), records rank, best and what the town got.
export function finishShift(s, run, { day, skyDay = 0 } = {}) {
  const X = ensureTownx(s), J = X.jobs[run.job], job = ZJOBS[run.job];
  if (X.jobDay.day !== day) X.jobDay = { day, bones: 0 };
  const left = Math.max(0, ZJ.DAILY_CAP - X.jobDay.bones);
  const paid = Math.max(0, Math.min(run.score, ZJ.SHIFT_CAP, left));
  const before = rankOf(J.hits);
  J.hits += run.hits; J.shifts++; J.perfects += run.perfects; J.bestMult = Math.max(J.bestMult, run.bestMult);
  const pb = run.score > J.best; if (pb) J.best = run.score;
  X.jobDay.bones += paid; s.bones = (s.bones || 0) + paid;
  if (X.made.day !== skyDay) X.made = { day: skyDay, goods: {} };
  if (job.good !== 'calm') X.made.goods[job.good] = (X.made.goods[job.good] || 0) + run.hits;
  if (run.bumped) X.injury = { kind: 'job', job: run.job, what: BUMP_OF[run.job] || 'a bump', day: skyDay };
  const after = rankOf(J.hits);
  const r = { job: run.job, score: run.score, paid, cappedBy: paid < run.score ? (left < Math.min(run.score, ZJ.SHIFT_CAP) ? 'daily' : 'shift') : null, hits: run.hits, taps: run.taps, perfects: run.perfects, bestMult: run.bestMult,
    pb, best: J.best, rank: after.title, rankUp: after.level > before.level, next: after.next, lifetimeHits: J.hits, madeGood: job.good, made: job.good === 'calm' ? 0 : run.hits, todayBones: X.jobDay.bones, dailyCap: ZJ.DAILY_CAP, bumped: run.bumped };
  X.log.unshift({ k: 'job', job: run.job, paid, day: skyDay }); X.log.length = Math.min(X.log.length, 20);
  return r;
}
export const BUMP_OF = { sawmill: 'a splinter', mine: 'a bonked head', forge: 'a singed paw', bakery: 'a hot-tray paw', fishery: 'a soggy tumble', farm: 'a nettle sting', quarry: 'a grazed knee', docks: 'a bumped nose', police: 'a scraped elbow' };

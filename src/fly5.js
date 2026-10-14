// Item 5 — nine engagement flywheels. Cosmetics / status only. No paid entry, no chance.
import { wallet } from './wallet.js';
import { toU, ensureMall } from './mall.js';
import { OUTFITS } from './outfits.js';
import { FURNITURE } from './furniture.js';

const ok = (x = {}) => ({ ok: true, ...x });
const fail = (reason) => ({ ok: false, reason });
const h32 = (s) => { let h = 2166136261 >>> 0; for (let i = 0; i < String(s).length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 0xffffffff; };

// 1. Holder perks (simulated SDK balance threshold)
export const HOLDER_THRESHOLD_U = toU(100); // 100 KIBBLE
export const HOLDER_PERKS = ['mall_vip', 'early_access', 'gold_name'];

// 2. Monthly burn festival
export const BURN_GOAL_U = toU(500);
export const BURN_STAGES = [0.25, 0.5, 0.75, 1];
export const BURN_REWARD = 'hoodie_maroon'; // free cosmetic for everyone when goal hits

// 3. Cross-game weekly quest chain
export const QUESTS = [
  { id: 'q_job', game: 'verse', name: 'Land a job shift', check: (s) => Object.values(s.jobs || {}).some((j) => (j.runs || 0) > 0) },
  { id: 'q_farm', game: 'verse', name: 'Harvest a crop', check: (s) => (s.farm?.harvested || 0) > 0 },
  { id: 'q_duo', game: 'verse', name: 'Finish a duo job', check: (s) => Object.keys(s.pair?.duo || {}).length > 0 },
  { id: 'q_empires', game: 'empires', name: 'Win a ranked match (Inu Empires)', remote: true },
  { id: 'q_quest', game: 'quest', name: 'Clear a gym (Inu Quest)', remote: true },
];
export const QUEST_REWARD = 'shades';

// 4. Sponsor slots — cafe week + billboard (extends featured; labelled Sponsored)
export const SPONSOR_SLOTS = {
  cafe: { id: 'cafe', name: 'Café Theme Week', price: 12, hours: 72, label: 'Sponsored Café' },
  bb1: { id: 'bb1', name: 'Bone Street East Billboard', price: 8, hours: 24, label: 'Sponsored' },
  bb2: { id: 'bb2', name: 'Bone Street West Billboard', price: 6, hours: 24, label: 'Sponsored' },
};

// 5. Photo board
export const PHOTO_WEEK_PRIZE = 'bowtie';

// 6. Free-entry weekly job-skill tournament
export const TOURNEY_POOL_BASE = 200; // Bones display; funded from activity, not entry fees

// 7. UGC designer
export const UGC_MAX = 24;
export const UGC_SELL_PRICE = 80; // Bones

// 8. Daily login streak
export const STREAK_BONES = (n) => Math.min(50, 5 + n * 2);
export const STREAK_DAY_REWARD = 30;
export const STREAK_COSMETIC = 'chain_gold';

// 9. Pools monument — pure display of treasury-funded pools (see poolsOf)

if (!FURNITURE.monument_pools) {
  FURNITURE.monument_pools = { name: 'Pools Monument', w: 2, h: 2, color: '#e3b341', layer: 'obj', draw: 'gold_statue', set: 'civic', cat: 'wall art', store: 'cosy', price: 0 };
}

export function ensureFly5(s) {
  s.fly5 ||= {};
  const F = s.fly5;
  F.holder ||= { vip: false, checked: 0 };
  F.burnFest ||= { month: 0, burnedU: 0, claimed: false, stage: 0 };
  F.quests ||= { week: 0, done: {}, remote: {}, claimed: false };
  F.sponsors ||= {};
  F.photos ||= { week: 0, mine: [], board: [] };
  F.tourney ||= { week: 0, scores: {}, claimed: false };
  F.ugc ||= { designs: [], featured: null };
  F.streak ||= { day: -1, count: 0, claimed30: false };
  return F;
}

/** 1. Simulated holder check (SDK would read on-chain balance). */
export function holderCheck(s, balU = null) {
  const F = ensureFly5(s);
  const bal = balU != null ? balU : toU(s.kibble || 0);
  F.holder.vip = bal >= HOLDER_THRESHOLD_U;
  F.holder.checked = Date.now();
  return { vip: F.holder.vip, bal, threshold: HOLDER_THRESHOLD_U, perks: F.holder.vip ? HOLDER_PERKS.slice() : [] };
}

export const isVip = (s) => ensureFly5(s).holder.vip || toU(s.kibble || 0) >= HOLDER_THRESHOLD_U;

/** 2. Burn festival — accumulate burned KIBBLE toward a community goal. */
export function recordBurn(s, amountU, month = 0) {
  const F = ensureFly5(s);
  if (F.burnFest.month !== month) { F.burnFest = { month, burnedU: 0, claimed: false, stage: 0 }; }
  F.burnFest.burnedU += amountU;
  const frac = F.burnFest.burnedU / BURN_GOAL_U;
  F.burnFest.stage = BURN_STAGES.filter((x) => frac >= x).length;
  return F.burnFest;
}

export function burnStage(s) { return ensureFly5(s).burnFest.stage; }

export function claimBurnFest(s, month = 0) {
  const F = ensureFly5(s);
  if (F.burnFest.month !== month) return fail('Wrong month');
  if (F.burnFest.burnedU < BURN_GOAL_U) return fail('Festival goal not reached yet');
  if (F.burnFest.claimed) return fail('Already claimed');
  F.burnFest.claimed = true;
  s.wardrobe ||= { owned: [], equipped: {} };
  if (OUTFITS[BURN_REWARD] && !s.wardrobe.owned.includes(BURN_REWARD)) s.wardrobe.owned.push(BURN_REWARD);
  return ok({ item: BURN_REWARD });
}

/** 3. Quest chain — local checks + remote stubs (kibble-pay later). */
export function questProgress(s, week = 0) {
  const F = ensureFly5(s);
  if (F.quests.week !== week) F.quests = { week, done: {}, remote: F.quests.remote || {}, claimed: false };
  for (const q of QUESTS) {
    if (q.remote) { if (F.quests.remote[q.id]) F.quests.done[q.id] = true; }
    else if (q.check?.(s)) F.quests.done[q.id] = true;
  }
  return { done: Object.keys(F.quests.done).length, total: QUESTS.length, claimed: F.quests.claimed, list: QUESTS.map((q) => ({ ...q, ok: !!F.quests.done[q.id], remote: !!q.remote })) };
}

export function reportRemoteQuest(s, questId, week = 0) {
  const q = QUESTS.find((x) => x.id === questId && x.remote);
  if (!q) return fail('Unknown remote quest');
  const F = ensureFly5(s);
  if (F.quests.week !== week) F.quests = { week, done: {}, remote: {}, claimed: false };
  F.quests.remote[questId] = true; F.quests.done[questId] = true;
  return ok();
}

export function claimQuestChain(s, week = 0) {
  const p = questProgress(s, week);
  if (p.done < p.total) return fail(`Need all ${p.total} quests (${p.done} done)`);
  const F = ensureFly5(s);
  if (F.quests.claimed) return fail('Already claimed this week');
  F.quests.claimed = true;
  s.wardrobe ||= { owned: [], equipped: {} };
  if (OUTFITS[QUEST_REWARD] && !s.wardrobe.owned.includes(QUEST_REWARD)) s.wardrobe.owned.push(QUEST_REWARD);
  return ok({ item: QUEST_REWARD });
}

/** 4. Sponsor a slot (café week or billboard) — KIBBLE to treasury, labelled Sponsored. */
export function rentSponsor(s, slotId, brand, nowH) {
  const S = SPONSOR_SLOTS[slotId]; if (!S) return fail('No such sponsor slot');
  const F = ensureFly5(s);
  const cur = F.sponsors[slotId]; if (cur && cur.untilH > nowH) return fail('Already sponsored');
  const buy = wallet().purchaseSync({ state: s, itemId: 'sponsor:' + slotId, priceU: toU(S.price) });
  if (!buy.ok) return buy;
  F.sponsors[slotId] = { brand: String(brand || 'Sponsored').slice(0, 18), by: s.player?.name || 'you', untilH: nowH + S.hours, label: S.label, price: S.price };
  return ok({ untilH: nowH + S.hours, label: S.label });
}

export function sponsorOf(s, slotId, nowH = 0) {
  const r = ensureFly5(s).sponsors[slotId]; if (!r) return null;
  if (r.untilH <= nowH) { delete ensureFly5(s).sponsors[slotId]; return null; }
  return r;
}

/** 5. Photo with watermark + share intent + weekly board. */
export function submitPhoto(s, week = 0, meta = {}) {
  const F = ensureFly5(s);
  if (F.photos.week !== week) F.photos = { week, mine: [], board: seedPhotoBoard(week) };
  const entry = { id: 'ph' + (F.photos.mine.length + 1), by: s.player?.name || 'you', me: true, score: meta.score || Math.round(40 + h32(String(week) + s.player?.name) * 60), at: Date.now(), caption: String(meta.caption || '').slice(0, 40) };
  F.photos.mine.push(entry);
  F.photos.board = [...F.photos.board.filter((x) => !x.me), ...F.photos.mine].sort((a, b) => b.score - a.score).slice(0, 10);
  return ok({ entry, shareUrl: shareXUrl(meta.caption) });
}

function seedPhotoBoard(week) {
  return ['Mochi', 'Hana', 'Kuro', 'Yuzu', 'Taro'].map((n, i) => ({ id: 'npc' + i, by: n, score: Math.round(50 + h32(week + n) * 50), me: false }));
}

export function photoBoard(s, week = 0) {
  const F = ensureFly5(s);
  if (F.photos.week !== week) F.photos = { week, mine: [], board: seedPhotoBoard(week) };
  return F.photos.board.slice().sort((a, b) => b.score - a.score).map((r, i) => ({ ...r, rank: i + 1 }));
}

export function claimPhotoPrize(s, week = 0) {
  const board = photoBoard(s, week);
  const me = board.find((r) => r.me);
  if (!me || me.rank > 1) return fail('Only this week\'s #1 photo wins the cosmetic');
  const F = ensureFly5(s);
  if (F.photos.claimed === week) return fail('Already claimed');
  F.photos.claimed = week;
  s.wardrobe ||= { owned: [], equipped: {} };
  if (OUTFITS[PHOTO_WEEK_PRIZE] && !s.wardrobe.owned.includes(PHOTO_WEEK_PRIZE)) s.wardrobe.owned.push(PHOTO_WEEK_PRIZE);
  return ok({ item: PHOTO_WEEK_PRIZE });
}

export function shareXUrl(caption = '') {
  const text = encodeURIComponent(`${caption || 'Playing Inu Verse'} #InuVerse`);
  const url = encodeURIComponent('https://inu-verse-tawny.vercel.app');
  return `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
}

export function watermarkPhoto(ctx, w, h) {
  ctx.save();
  ctx.font = 'bold 14px monospace'; ctx.fillStyle = 'rgba(20,26,46,0.55)';
  ctx.fillRect(w - 130, h - 28, 122, 20);
  ctx.fillStyle = '#fff6e0'; ctx.fillText('INU VERSE', w - 120, h - 13);
  ctx.restore();
}

/** 6. Free-entry weekly job tournament — skill score only, live pool display. */
export function tourneyScore(s, jobId, score, week = 0) {
  const F = ensureFly5(s);
  if (F.tourney.week !== week) F.tourney = { week, scores: {}, claimed: false };
  const prev = F.tourney.scores[jobId] || 0;
  if (score > prev) F.tourney.scores[jobId] = score;
  return F.tourney.scores[jobId];
}

export function tourneyBoard(s, week = 0) {
  const F = ensureFly5(s);
  if (F.tourney.week !== week) F.tourney = { week, scores: {}, claimed: false };
  const mine = Object.values(F.tourney.scores).reduce((a, b) => a + b, 0);
  const npcs = ['Mochi', 'Kuro', 'Hana', 'Yuzu', 'Goma'].map((n) => ({ id: 'npc_' + n, name: n, score: Math.round(200 + h32(week + n) * 800), me: false }));
  return [...npcs, { id: 'you', name: s.player?.name || 'You', score: mine, me: true }]
    .sort((a, b) => b.score - a.score).map((r, i) => ({ ...r, rank: i + 1 }));
}

export function tourneyPool(s) {
  const m = ensureMall(s);
  return Math.floor(TOURNEY_POOL_BASE + (m.pools?.weekly || 0) / 1e6 * 10);
}

export function claimTourney(s, week = 0) {
  const board = tourneyBoard(s, week);
  const me = board.find((r) => r.me);
  if (!me || me.rank > 3) return fail('Top 3 only (skill score)');
  const F = ensureFly5(s);
  if (F.tourney.claimed) return fail('Already claimed');
  F.tourney.claimed = true;
  const share = [0.5, 0.3, 0.2][me.rank - 1];
  const prize = Math.floor(tourneyPool(s) * share);
  s.bones += prize;
  return ok({ rank: me.rank, prize });
}

/** 7. UGC pixel outfit / furniture designer. */
export function saveUgc(s, { kind = 'outfit', name, pixels, slot = 'hat' } = {}) {
  const F = ensureFly5(s);
  if (F.ugc.designs.length >= UGC_MAX) return fail('Design library full');
  name = String(name || 'My Design').slice(0, 18);
  if (!pixels || !Array.isArray(pixels) || pixels.length < 4) return fail('Need a pixel grid');
  const id = 'ugc' + (F.ugc.designs.length + 1) + '_' + Math.floor(h32(name + Date.now()) * 1e6).toString(36);
  const d = { id, kind, name, pixels: pixels.slice(0, 256), slot, by: s.player?.name || 'you', listed: false, sales: 0, official: false };
  F.ugc.designs.push(d);
  return ok({ design: d });
}

export function listUgc(s, id) {
  const d = ensureFly5(s).ugc.designs.find((x) => x.id === id);
  if (!d) return fail('Unknown design');
  d.listed = true;
  return ok({ price: UGC_SELL_PRICE });
}

export function buyUgc(s, design, fromSim = true) {
  // Buying a listed design for Bones (cosmetics). fromSim = marketplace listing.
  if (!design?.listed && !fromSim) return fail('Not listed');
  if (s.bones < UGC_SELL_PRICE) return fail(`Need ${UGC_SELL_PRICE} Bones`);
  s.bones -= UGC_SELL_PRICE;
  if (design) design.sales = (design.sales || 0) + 1;
  if (design?.kind === 'outfit') {
    s.wardrobe ||= { owned: [], equipped: {} };
    // Grant a twin of an existing atlas item as a stand-in for the UGC wear
    const grant = design.slot === 'hat' ? 'cap_red' : design.slot === 'neck' ? 'tie_red' : 'hoodie_maroon';
    if (!s.wardrobe.owned.includes(grant)) s.wardrobe.owned.push(grant);
    s.wardrobe.ugc ||= {}; s.wardrobe.ugc[grant] = design.id;
  } else {
    s.inventory ||= {};
    const fid = 'ugc_furn_' + (design?.id || 'x');
    if (!FURNITURE[fid] && design) FURNITURE[fid] = { name: design.name, w: 1, h: 1, color: design.pixels?.[0] || '#e3b341', layer: 'obj', draw: 'art', set: 'ugc', cat: 'wall art', store: 'cosy', price: 0 };
    s.inventory[fid] = (s.inventory[fid] || 0) + 1;
  }
  return ok();
}

export function featureUgc(s, id) {
  const F = ensureFly5(s);
  const d = F.ugc.designs.find((x) => x.id === id);
  if (!d) return fail('Unknown design');
  d.official = true; F.ugc.featured = id;
  return ok({ design: d });
}

/** 8. Daily login streak. */
export function claimDaily(s, day) {
  const F = ensureFly5(s);
  if (F.streak.day === day) return fail('Already claimed today');
  if (F.streak.day === day - 1) F.streak.count += 1;
  else F.streak.count = 1;
  F.streak.day = day;
  const bones = STREAK_BONES(F.streak.count);
  s.bones += bones;
  let cosmetic = null;
  if (F.streak.count >= STREAK_DAY_REWARD && !F.streak.claimed30) {
    F.streak.claimed30 = true;
    s.wardrobe ||= { owned: [], equipped: {} };
    if (OUTFITS[STREAK_COSMETIC] && !s.wardrobe.owned.includes(STREAK_COSMETIC)) s.wardrobe.owned.push(STREAK_COSMETIC);
    cosmetic = STREAK_COSMETIC;
  }
  return ok({ bones, streak: F.streak.count, cosmetic });
}

/** 9. Transparent pools snapshot for the in-world monument. */
export function poolsMonument(s) {
  const m = ensureMall(s);
  return {
    daily: m.pools?.daily || 0,
    weekly: m.pools?.weekly || 0,
    monthly: m.pools?.monthly || 0,
    treasury: m.treasury || 0,
    burned: m.burnedU || 0,
    label: 'Treasury-funded skill pools',
  };
}

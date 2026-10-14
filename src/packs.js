// Packs (community guilds) - headless logic, LOCAL SIMULATION for now.
//
// Backend-ready data model: everything lives under state.packs as plain JSON keyed by
// string ids, every member/post has a stable id, and every mutation goes through one of
// the exported functions below which returns {ok, reason?, ...}. A future server would
// own `packs.all` and expose the same verbs as endpoints:
//   POST /packs (createPack)            POST /packs/:id/join (joinPack)
//   POST /packs/:id/leave (leavePack)    POST /packs/:id/kick (kickMember)
//   POST /packs/:id/treasury (contribute, buyForPack)  POST /packs/:id/pool (donateFurniture)
//   POST /packs/:id/clubhouse/items (placePackFurniture / movePackFurniture / storePackFurniture)
//   POST /packs/:id/board (postToBoard)  GET /leaderboard (leaderboard)
// `source: 'local'` marks records created by this client-side simulation.
import { FURNITURE, WALLS, FLOORS, canPlace } from './furniture.js';

export const PACK_CREATE_COST = 400;
export const ME = 'you';
export const EMBLEMS = ['paw', 'bone', 'star', 'heart'];
export const SEASON = { id: 's1', name: 'Kibble Cup – Season 1 (preview)' };
export const SCORE = { shift: 10, token: 25, decor: 5, bonesPer: 10 }; // +1 point per 10 bones contributed
export const BOARD_MAX = 60, POST_MAX = 140;

const ok = (x = {}) => ({ ok: true, ...x });
const fail = (reason) => ({ ok: false, reason });
const blankStats = () => ({ shifts: 0, tokens: 0, decor: 0, contributed: 0 });
const ROOFS = { SNIF: '#e58fa8', BARK: '#4b6fb0', ZOOM: '#7a5ad6' };

export function ensurePacks(s) {
  if (!s.packs || typeof s.packs !== 'object') s.packs = {};
  const P = s.packs;
  P.v = 1; P.all ||= {}; P.seq ||= 1; P.clock ||= 0;
  if (P.joined && !P.all[P.joined]) P.joined = null;
  P.joined ??= null;
  for (const p of Object.values(P.all)) { p.members ||= []; p.board ||= []; p.pool ||= {}; p.treasury ||= 0; p.clubhouse ||= { wall: 0, floor: 0, items: [], roof: p.color }; p.clubhouse.items ||= []; for (const m of p.members) m.stats = { ...blankStats(), ...(m.stats || {}) }; }
  if (!Object.values(P.all).some((p) => p.npc)) seedNpcPacks(s);
  return P;
}
export const myPack = (s) => (s.packs?.joined ? s.packs.all[s.packs.joined] : null);
export const meIn = (p) => p?.members.find((m) => m.id === ME);
const nextId = (P, pre) => pre + (P.seq++).toString(36);
const now = (P) => ++P.clock;

function post(p, P, author, text, system = false) {
  p.board.unshift({ id: nextId(P, 'm'), author, text, t: now(P), system });
  if (p.board.length > BOARD_MAX) p.board.length = BOARD_MAX;
}
export const cleanTag = (t) => String(t || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);

// ---- NPC packs (deterministic seed) ----
const NPC_PACKS = [
  { tag: 'SNIF', name: 'Sakura Sniffers', color: '#d8507a', emblem: 'heart', members: [['Hana', 'cream'], ['Mochi', 'tan'], ['Ume', 'golden'], ['Sora', 'gray']], stats: [[6, 1, 9, 300], [4, 0, 5, 120], [3, 1, 2, 60], [2, 0, 3, 40]], treasury: 380, pool: { plant: 2, lamp: 1 }, items: [['rug', 3, 3, 0], ['plant', 0, 0, 0], ['plant', 9, 0, 0], ['table', 4, 2, 0], ['lamp', 2, 0, 0]], wall: 2, floor: 1 },
  { tag: 'BARK', name: 'Bone Street Barkers', color: '#3a6fd8', emblem: 'bone', members: [['Kuro', 'dark'], ['Taro', 'red'], ['Pochi', 'tan']], stats: [[8, 2, 4, 220], [5, 1, 3, 150], [2, 0, 1, 30]], treasury: 260, pool: { sofa: 1 }, items: [['tv', 4, 0, 0], ['sofa', 4, 3, 0], ['arcade', 0, 0, 0], ['arcade', 1, 0, 0], ['kennel', 8, 4, 0]], wall: 1, floor: 3 },
  { tag: 'ZOOM', name: 'Moonlight Zoomies', color: '#7a4fd0', emblem: 'star', members: [['Yuzu', 'golden'], ['Goma', 'gray'], ['Kiki', 'red'], ['Azuki', 'dark'], ['Kinako', 'cream']], stats: [[3, 3, 2, 90], [3, 2, 6, 110], [1, 1, 1, 20], [2, 0, 4, 50], [1, 0, 0, 10]], treasury: 190, pool: { bowl: 2, chair: 2 }, items: [['bed', 0, 0, 0], ['shelf', 4, 0, 0], ['lamp', 9, 0, 0], ['rug', 4, 3, 0]], wall: 3, floor: 2 },
];
const NPC_LINES = ['Who is up for a café shift?', 'Added a lamp to the clubhouse!', 'Chipped some bones into the treasury.', 'Kibble Cup is heating up - keep it going!', 'Anyone seen the new stall on Market Row?', 'The clubhouse looks so cosy now.', 'Morning walk round Sakura Pond, then work.', 'Welcome to everyone new!', 'Saving up for an Inu Arcade for the clubhouse.', 'Great teamwork this week, pack.'];

export function seedNpcPacks(s) {
  const P = s.packs;
  for (const d of NPC_PACKS) {
    const id = 'pk_' + d.tag.toLowerCase();
    if (P.all[id]) continue;
    const p = { id, name: d.name, tag: d.tag, color: d.color, emblem: d.emblem, npc: true, source: 'local', season: SEASON.id, ownerId: 'npc_' + d.members[0][0].toLowerCase(), createdAt: 0, treasury: d.treasury, pool: { ...d.pool }, members: [], board: [], clubhouse: { wall: d.wall, floor: d.floor, roof: ROOFS[d.tag], items: [] } };
    d.members.forEach(([name, coat], i) => p.members.push({ id: 'npc_' + name.toLowerCase(), name, coat, npc: true, role: i ? 'member' : 'leader', joinedAt: i, stats: { shifts: d.stats[i][0], tokens: d.stats[i][1], decor: d.stats[i][2], contributed: d.stats[i][3] } }));
    d.items.forEach(([fid, x, y, rot]) => p.clubhouse.items.push({ uid: nextId(P, 'f'), id: fid, x, y, rot, by: p.ownerId }));
    for (let i = 0; i < 3; i++) post(p, P, p.members[i % p.members.length].name, NPC_LINES[(i * 3 + d.tag.length + id.length) % NPC_LINES.length]);
    P.all[id] = p;
  }
}

// ---- membership ----
export function createPack(s, { name, tag, color = '#d4a640', emblem = 'paw' } = {}) {
  const P = ensurePacks(s); name = String(name || '').trim().slice(0, 22); tag = cleanTag(tag);
  if (P.joined) return fail('Leave your current Pack first');
  if (name.length < 3) return fail('Pack name needs 3+ characters');
  if (tag.length < 2) return fail('Tag needs 2-4 letters/numbers');
  if (Object.values(P.all).some((p) => p.tag === tag)) return fail('Tag already taken');
  if (Object.values(P.all).some((p) => p.name.toLowerCase() === name.toLowerCase())) return fail('Name already taken');
  if (!/^#[0-9a-f]{6}$/i.test(color)) color = '#d4a640';
  if (!EMBLEMS.includes(emblem)) emblem = 'paw';
  if (s.bones < PACK_CREATE_COST) return fail(`Need ${PACK_CREATE_COST} bones`);
  s.bones -= PACK_CREATE_COST;
  const id = nextId(P, 'pk_');
  const p = { id, name, tag, color, emblem, npc: false, source: 'local', season: SEASON.id, ownerId: ME, createdAt: now(P), treasury: 0, pool: {}, members: [], board: [], clubhouse: { wall: 0, floor: 0, roof: color, items: [] } };
  p.members.push({ id: ME, name: s.player.name, coat: s.player.coat, role: 'leader', joinedAt: now(P), stats: blankStats() });
  post(p, P, 'Pack', `${s.player.name} founded ${name} [${tag}]!`, true);
  P.all[id] = p; P.joined = id;
  return ok({ pack: p });
}

export function joinPack(s, id) {
  const P = ensurePacks(s), p = P.all[id];
  if (!p) return fail('No such Pack');
  if (P.joined) return fail(P.joined === id ? 'Already a member' : 'Leave your current Pack first');
  p.members.push({ id: ME, name: s.player.name, coat: s.player.coat, role: 'member', joinedAt: now(P), stats: blankStats() });
  P.joined = id; post(p, P, 'Pack', `${s.player.name} joined the Pack. Say hi!`, true);
  return ok({ pack: p });
}

export function leavePack(s) {
  const P = ensurePacks(s), p = myPack(s);
  if (!p) return fail('Not in a Pack');
  p.members = p.members.filter((m) => m.id !== ME); P.joined = null;
  if (!p.members.length) { delete P.all[p.id]; return ok({ disbanded: true }); }
  if (p.ownerId === ME) { const heir = [...p.members].sort((a, b) => a.joinedAt - b.joinedAt)[0]; p.ownerId = heir.id; heir.role = 'leader'; post(p, P, 'Pack', `${s.player.name} left. ${heir.name} now leads the Pack.`, true); }
  else post(p, P, 'Pack', `${s.player.name} left the Pack.`, true);
  return ok({ disbanded: false });
}

export function kickMember(s, memberId) {
  const P = ensurePacks(s), p = myPack(s);
  if (!p) return fail('Not in a Pack');
  if (p.ownerId !== ME) return fail('Only the Pack leader can kick');
  if (memberId === ME) return fail('Use Leave instead');
  const m = p.members.find((x) => x.id === memberId); if (!m) return fail('No such member');
  p.members = p.members.filter((x) => x.id !== memberId); post(p, P, 'Pack', `${m.name} was removed from the Pack.`, true);
  return ok();
}

// Simulated recruitment for player-founded packs (NPC drifter asks to join).
export const RECRUITS = [['Riku', 'tan'], ['Nori', 'dark'], ['Momo', 'cream'], ['Haru', 'red'], ['Suzu', 'golden'], ['Kai', 'gray']];
export function recruitNpc(s, rng = Math.random) {
  const P = ensurePacks(s), p = myPack(s); if (!p) return fail('Not in a Pack');
  const taken = new Set(Object.values(P.all).flatMap((x) => x.members.map((m) => m.name)));
  const free = RECRUITS.filter(([n]) => !taken.has(n)); if (!free.length) return fail('No one looking for a Pack right now');
  const [name, coat] = free[Math.floor(rng() * free.length)];
  const m = { id: 'npc_' + name.toLowerCase(), name, coat, npc: true, role: 'member', joinedAt: now(P), stats: blankStats() };
  p.members.push(m); post(p, P, name, 'Thanks for having me! Ready to help with the clubhouse.');
  return ok({ member: m });
}

// ---- treasury / pool ----
export function contribute(s, bones) {
  const p = myPack(s); bones = Math.floor(+bones);
  if (!p) return fail('Not in a Pack');
  if (!(bones > 0)) return fail('Enter an amount');
  if (s.bones < bones) return fail('Not enough bones');
  s.bones -= bones; p.treasury += bones; meIn(p).stats.contributed += bones;
  return ok({ treasury: p.treasury });
}
export function buyForPack(s, fid) {
  const p = myPack(s), d = FURNITURE[fid];
  if (!p) return fail('Not in a Pack'); if (!d) return fail('Unknown item');
  if (p.treasury < d.price) return fail('Treasury too low - contribute bones');
  p.treasury -= d.price; p.pool[fid] = (p.pool[fid] || 0) + 1; return ok();
}
export function donateFurniture(s, fid) {
  const p = myPack(s); if (!p) return fail('Not in a Pack');
  if (!s.inventory[fid]) return fail('Not in your inventory');
  s.inventory[fid]--; if (!s.inventory[fid]) delete s.inventory[fid];
  p.pool[fid] = (p.pool[fid] || 0) + 1; return ok();
}
export function upgradeClubhouse(s, kind, level) {
  const p = myPack(s); if (!p) return fail('Not in a Pack');
  const opt = (kind === 'wall' ? WALLS : FLOORS)[level]; if (!opt) return fail('Unknown');
  if (p.clubhouse[kind] === level) return fail('Already applied');
  if (p.treasury < opt.price) return fail('Treasury too low');
  p.treasury -= opt.price; p.clubhouse[kind] = level; return ok();
}

// ---- clubhouse decorating (shared pool) ----
export function placePackFurniture(s, fid, x, y, rot = 0, by = ME) {
  const P = ensurePacks(s), p = myPack(s); if (!p) return fail('Not in a Pack');
  if (!p.pool[fid]) return fail('None left in the Pack pool');
  if (!canPlace(p.clubhouse, fid, x, y, rot)) return fail('Blocked');
  p.pool[fid]--; if (!p.pool[fid]) delete p.pool[fid];
  const item = { uid: nextId(P, 'f'), id: fid, x, y, rot: rot % 4, by };
  p.clubhouse.items.push(item);
  const m = p.members.find((q) => q.id === by); if (m) m.stats.decor++;
  return ok({ item });
}
export function movePackFurniture(s, uid, x, y, rot) {
  const p = myPack(s), it = p?.clubhouse.items.find((i) => i.uid === uid); if (!it) return fail('Missing');
  if (!canPlace(p.clubhouse, it.id, x, y, rot, uid)) return fail('Blocked');
  it.x = x; it.y = y; it.rot = rot % 4; return ok();
}
export function storePackFurniture(s, uid) {
  const p = myPack(s), i = p ? p.clubhouse.items.findIndex((q) => q.uid === uid) : -1; if (i < 0) return fail('Missing');
  const [it] = p.clubhouse.items.splice(i, 1); p.pool[it.id] = (p.pool[it.id] || 0) + 1; return ok();
}

// ---- board ----
export function postToBoard(s, text) {
  const P = ensurePacks(s), p = myPack(s); if (!p) return fail('Not in a Pack');
  text = String(text || '').replace(/\s+/g, ' ').trim();
  if (!text) return fail('Write something first'); if (text.length > POST_MAX) text = text.slice(0, POST_MAX);
  post(p, P, s.player.name, text); return ok({ post: p.board[0] });
}

// ---- activity + scoring ----
export function recordActivity(s, kind, n = 1) {
  const p = myPack(s), m = meIn(p); if (!m) return fail('Not in a Pack');
  const key = { shift: 'shifts', token: 'tokens', decor: 'decor' }[kind]; if (!key) return fail('Unknown activity');
  m.stats[key] += n; return ok();
}
export const memberScore = (st) => st.shifts * SCORE.shift + st.tokens * SCORE.token + st.decor * SCORE.decor + Math.floor(st.contributed / SCORE.bonesPer);
export const packScore = (p) => p.members.reduce((a, m) => a + memberScore(m.stats), 0);
export function leaderboard(s) {
  const P = ensurePacks(s);
  return Object.values(P.all).map((p) => ({ id: p.id, name: p.name, tag: p.tag, color: p.color, emblem: p.emblem, members: p.members.length, score: packScore(p), mine: p.id === P.joined }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).map((r, i) => ({ ...r, rank: i + 1 }));
}
export function packOfName(s, name) { for (const p of Object.values(s.packs?.all || {})) if (p.members.some((m) => m.name === name && (m.id !== ME))) return p; return null; }

// ---- NPC simulation tick (call every few seconds) ----
export function simulatePacks(s, rng = Math.random) {
  const P = ensurePacks(s), events = [];
  for (const p of Object.values(P.all)) {
    for (const m of p.members) {
      if (m.id === ME) continue;
      const r = rng();
      if (r < 0.08) m.stats.shifts++;
      else if (r < 0.1) m.stats.tokens++;
      else if (r < 0.16) { const amt = 10 + Math.floor(rng() * 30); m.stats.contributed += amt; p.treasury += amt; }
    }
    // NPC decorates from the shared pool (only places, never removes player items)
    const npcs = p.members.filter((m) => m.id !== ME), poolIds = Object.keys(p.pool);
    if (npcs.length && poolIds.length && rng() < 0.25) {
      const m = npcs[Math.floor(rng() * npcs.length)], fid = poolIds[Math.floor(rng() * poolIds.length)];
      for (let k = 0; k < 20; k++) { const x = Math.floor(rng() * 10), y = Math.floor(rng() * 7); if (canPlace(p.clubhouse, fid, x, y, 0)) { p.pool[fid]--; if (!p.pool[fid]) delete p.pool[fid]; p.clubhouse.items.push({ uid: nextId(P, 'f'), id: fid, x, y, rot: 0, by: m.id }); m.stats.decor++; events.push({ pack: p.id, kind: 'decor', who: m.name, item: fid }); break; } }
    }
    if (npcs.length && rng() < 0.12) { const m = npcs[Math.floor(rng() * npcs.length)]; post(p, P, m.name, NPC_LINES[Math.floor(rng() * NPC_LINES.length)]); events.push({ pack: p.id, kind: 'post', who: m.name }); }
  }
  return events;
}

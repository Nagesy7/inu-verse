// Friendship (10 hearts), dating, marriage, player-to-player marriage (simulated locally, backend-shaped) and pups.
// Wholesome only. Pure logic: no DOM.
import { ensureFarm, GOODS } from './farm.js';
export const MAX_PTS = 1000, PER_HEART = 100;
export const hearts = (r) => Math.min(10, Math.floor((r?.pts || 0) / PER_HEART));
// per-NPC gift preferences + small quests. Items are farm goods or shop gifts.
export const PEOPLE = {
  Mochi: { loves: ['strawberry', 'jam'], likes: ['peach', 'treats', 'bouquet'], dislikes: ['minnow'], quest: ['egg', 3], line: 'Mochi loves anything sweet.' },
  Kuro:  { loves: ['koi', 'cheese'], likes: ['carp', 'milk'], dislikes: ['kale'], quest: ['carp', 1], line: 'Kuro is a quiet angler.' },
  Hana:  { loves: ['bouquet', 'starberry'], likes: ['strawberry', 'peach'], dislikes: ['pumpkin'], quest: ['peach', 4], line: 'Hana runs the flower shop.' },
  Taro:  { loves: ['wheat', 'treats'], likes: ['egg', 'milk'], dislikes: ['koi'], quest: ['wheat', 5], line: 'Taro bakes bread at dawn.' },
  Yuzu:  { loves: ['goldmelon', 'jam'], likes: ['apple', 'latte'], dislikes: ['turnip'], quest: ['apple', 4], line: 'Yuzu sells coffee and gossip.' },
  Goma:  { loves: ['pumpkin', 'cheese'], likes: ['carrot', 'turnip'], dislikes: ['bouquet'], quest: ['carrot', 5], line: 'Goma is a proud farmer.' },
};
export const GIFT_SHOP = { rose_bone: { name: 'Rose Bone', price: 60, note: 'Ask someone out (8+ hearts)' }, promise_collar: { name: 'Promise Collar', price: 500, note: 'Propose (10 hearts, dating)' }, bouquet: { name: 'Bouquet', price: 30, note: 'A lovely gift' } };
export const DATES = { cafe: { name: 'Coffee at Shiba Sips', cost: 20 }, fountain: { name: 'Stroll by the mall fountain', cost: 0 }, pond: { name: 'Sunset at the Fishing Pond', cost: 0 }, dinner: { name: 'Dinner at the Kibble Mall', cost: 80 } };
// heart milestone cutscenes (lines shown in the dialog)
export const SCENES = {
  2: (n) => [`${n}: You keep saying hi to me. I like that.`, `${n} shows you a secret bench under the sakura trees.`],
  4: (n) => [`${n}: Want to hear something silly? I'm scared of pigeons.`, 'You both laugh until the pigeons leave.'],
  6: (n) => [`${n} invites you to a picnic by the pond.`, `${n}: This is my favourite spot in all of Inu Verse.`],
  8: (n) => [`${n}: You're my best friend, you know?`, `${n} gives you a tiny hand-knitted scarf.`],
  10: (n) => [`${n} waits for you at the fountain at dusk.`, `${n}: Whatever happens next... I'm glad it's with you.`],
};
export function ensureRel(s) { s.rel ||= {}; for (const n in PEOPLE) s.rel[n] ||= { pts: 0, chatDay: -1, giftDay: -1, dateDay: -1, status: 'friend', seen: [], quest: null, questsDone: 0 };
  s.giftInv ||= {}; s.pups ||= []; s.p2p ||= { partner: null, pending: null, joint: null, outbox: [], blocked: [], muted: [], reports: [], history: [] }; return s.rel; }
const addPts = (r, n) => { const before = hearts(r); r.pts = Math.max(0, Math.min(MAX_PTS, r.pts + n)); const after = hearts(r); const scene = after > before && SCENES[after] && !r.seen.includes(after) ? after : null; if (scene) r.seen.push(scene); return scene; };
export function chat(s, name, day) { const r = ensureRel(s)[name]; if (!r) return { ok: false }; if (r.chatDay === day) return { ok: true, repeat: true, gain: 0 }; r.chatDay = day; const scene = addPts(r, 20); return { ok: true, gain: 20, scene }; }
export function reaction(name, item) { const P = PEOPLE[name]; return P.loves.includes(item) ? 'loved' : P.likes.includes(item) ? 'liked' : P.dislikes.includes(item) ? 'disliked' : 'neutral'; }
export const REACT = { loved: { pts: 80, emote: 'heart', line: 'I LOVE this! How did you know?!' }, liked: { pts: 45, emote: 'happy', line: 'Aww, thank you! I like this.' }, neutral: { pts: 20, emote: 'note', line: 'Oh, thanks!' }, disliked: { pts: -20, emote: 'angry', line: 'Hmm... not really my thing.' } };
const takeItem = (s, item) => { const f = ensureFarm(s); if (f.inv[item] > 0) { f.inv[item]--; if (!f.inv[item]) delete f.inv[item]; return true; } if (s.giftInv[item] > 0) { s.giftInv[item]--; if (!s.giftInv[item]) delete s.giftInv[item]; return true; } return false; };
export const giftables = (s) => { const f = ensureFarm(s), out = {}; for (const [k, n] of Object.entries(f.inv)) out[k] = n; for (const [k, n] of Object.entries(s.giftInv || {})) if (k !== 'rose_bone' && k !== 'promise_collar') out[k] = (out[k] || 0) + n; return out; };
export function gift(s, name, item, day) { const r = ensureRel(s)[name]; if (!r) return { ok: false }; if (r.giftDay === day) return { ok: false, reason: `You already gave ${name} a gift today` }; if (!takeItem(s, item)) return { ok: false, reason: 'You do not have that' };
  r.giftDay = day; const kind = reaction(name, item), R = REACT[kind], scene = addPts(r, R.pts); return { ok: true, kind, emote: R.emote, line: R.line, gain: R.pts, scene }; }
export function buyGift(s, id) { const g = GIFT_SHOP[id]; if (!g) return { ok: false }; if (s.bones < g.price) return { ok: false, reason: `Need ${g.price} bones` }; s.bones -= g.price; ensureRel(s); s.giftInv[id] = (s.giftInv[id] || 0) + 1; return { ok: true }; }
// quests: unlock at 1 heart, one at a time
export function questOf(s, name) { const r = ensureRel(s)[name]; if (hearts(r) < 1) return null; if (!r.quest) { const [item, n] = PEOPLE[name].quest; r.quest = { item, n: n + r.questsDone, reward: 40 + r.questsDone * 10 }; } return r.quest; }
export function completeQuest(s, name) { const r = ensureRel(s)[name], q = questOf(s, name); if (!q) return { ok: false, reason: 'No quest yet' }; const f = ensureFarm(s); if ((f.inv[q.item] || 0) < q.n) return { ok: false, reason: `Bring ${q.n} ${GOODS[q.item]?.name || q.item}` };
  f.inv[q.item] -= q.n; if (!f.inv[q.item]) delete f.inv[q.item]; s.bones += q.reward; r.questsDone++; r.quest = null; const scene = addPts(r, 60); return { ok: true, reward: q.reward, scene }; }
export const spouseName = (s) => s.spouse?.name || null;
export function askOut(s, name) { const r = ensureRel(s)[name]; if (hearts(r) < 8) return { ok: false, reason: `Need 8 hearts with ${name}` }; if (r.status !== 'friend') return { ok: false, reason: 'Already dating' }; if (Object.values(s.rel).some((x) => x.status !== 'friend') || s.p2p.partner) return { ok: false, reason: 'You are already seeing someone' };
  if (!(s.giftInv.rose_bone > 0)) return { ok: false, reason: 'You need a Rose Bone' }; s.giftInv.rose_bone--; r.status = 'dating'; return { ok: true }; }
export function goOnDate(s, name, place, day) { const r = ensureRel(s)[name], D = DATES[place]; if (!D) return { ok: false }; if (!['dating', 'engaged', 'married'].includes(r.status)) return { ok: false, reason: 'You are not dating' }; if (r.dateDay === day) return { ok: false, reason: 'One date a day' };
  if (s.bones < D.cost) return { ok: false, reason: `Need ${D.cost} bones` }; s.bones -= D.cost; r.dateDay = day; r.dates = (r.dates || 0) + 1; addPts(r, 40); return { ok: true, scene: [`You and ${name}: ${D.name}.`, `${name}: Today was perfect.`] }; }
export function propose(s, name) { const r = ensureRel(s)[name]; if (r.status !== 'dating') return { ok: false, reason: 'Date first' }; if (hearts(r) < 10) return { ok: false, reason: 'Need 10 hearts' }; if (!(s.giftInv.promise_collar > 0)) return { ok: false, reason: 'You need a Promise Collar' };
  s.giftInv.promise_collar--; r.status = 'engaged'; return { ok: true }; }
export function wedding(s, name, day, helps = 'farm') { const r = ensureRel(s)[name]; if (r.status !== 'engaged') return { ok: false, reason: 'Not engaged' }; r.status = 'married'; s.spouse = { name, kind: 'npc', since: day, helps }; return { ok: true, guests: Object.keys(PEOPLE).filter((n) => n !== name) }; }
export function setHelp(s, helps) { if (!s.spouse) return { ok: false }; s.spouse.helps = helps; return { ok: true }; }
// spouse daily help: farm -> water every planted field; biz -> extra service (used by bizHour)
export function spouseMorning(s) { if (s.spouse?.helps !== 'farm') return 0; const f = ensureFarm(s); let n = 0; for (const fl of f.fields) if (fl.crop && fl.grown < 1) { fl.watered = 120; n++; } return n; }
// ---- player-to-player marriage (simulated partner, backend-shaped messages in outbox) ----
const msg = (s, type, to, extra = {}) => { const m = { type, from: 'you', to, t: Date.now(), ...extra }; s.p2p.outbox.push(m); s.p2p.outbox = s.p2p.outbox.slice(-50); return m; };
export function p2pPropose(s, other) { const P = ensureRel(s) && s.p2p; if (P.blocked.includes(other)) return { ok: false, reason: 'You blocked this player' }; if (P.partner || s.spouse) return { ok: false, reason: 'Already married' }; P.pending = { with: other, consent: { you: true, them: null } }; msg(s, 'propose', other); return { ok: true }; }
export function p2pRespond(s, accept) { const P = s.p2p; if (!P.pending) return { ok: false }; P.pending.consent.them = !!accept; if (!accept) { P.history.push({ with: P.pending.with, declined: true }); P.pending = null; return { ok: true, declined: true }; } return { ok: true }; }
export function p2pWed(s, day) { const P = s.p2p; if (!P.pending?.consent.you || !P.pending.consent.them) return { ok: false, reason: 'Both players must consent' }; P.partner = { name: P.pending.with, since: day, home: 'shared' }; P.pending = null; msg(s, 'wed', P.partner.name); return { ok: true }; }
export function jointOpen(s, both) { const P = s.p2p; if (!P.partner) return { ok: false, reason: 'Not married' }; if (!both) return { ok: false, reason: 'Both partners must opt in' }; P.joint ||= { bones: 0 }; msg(s, 'joint_open', P.partner.name); return { ok: true }; }
export function jointMove(s, amt) { const P = s.p2p; if (!P.joint) return { ok: false, reason: 'No joint account' }; amt = Math.round(amt); if (amt > 0 && s.bones < amt) return { ok: false, reason: 'Not enough bones' }; if (amt < 0 && P.joint.bones < -amt) return { ok: false, reason: 'Not enough in joint' }; s.bones -= amt; P.joint.bones += amt; return { ok: true }; }
export function p2pDivorce(s) { const P = s.p2p; if (!P.partner) return { ok: false }; const half = P.joint ? Math.floor(P.joint.bones / 2) : 0; s.bones += half; P.history.push({ with: P.partner.name, divorced: true }); msg(s, 'divorce', P.partner.name); P.partner = null; P.joint = null; return { ok: true, refund: half }; }
export function block(s, who) { const P = ensureRel(s) && s.p2p; if (!P.blocked.includes(who)) P.blocked.push(who); if (P.pending?.with === who) P.pending = null; if (P.partner?.name === who) p2pDivorce(s); msg(s, 'block', who); return { ok: true }; }
export function mute(s, who) { const P = s.p2p; if (!P.muted.includes(who)) P.muted.push(who); return { ok: true }; }
export function report(s, who, reason) { s.p2p.reports.push({ who, reason: String(reason).slice(0, 140), t: Date.now() }); msg(s, 'report', 'moderation', { who, reason }); return { ok: true }; }
// ---- pups ----
export const COAT_HEX = { tan: '#d8924a', dark: '#3a3036', cream: '#f2e2c4', red: '#c8602a', golden: '#e8b04a', gray: '#9a9aa6' };
const mix = (a, b, t = 0.5) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('');
export function blendCoat(a, b, r = 0.5) { const A = COAT_HEX[a] || a, B = COAT_HEX[b] || b, hex = mix(A, B, 0.35 + r * 0.3); let best = 'tan', bd = 1e9; // base art coat = nearest existing coat
  for (const [k, v] of Object.entries(COAT_HEX)) { const d = [1, 3, 5].reduce((s2, i) => s2 + (parseInt(v.slice(i, i + 2), 16) - parseInt(hex.slice(i, i + 2), 16)) ** 2, 0); if (d < bd) { bd = d; best = k; } } return { base: best, hex, patch: B }; }
export const STAGES = ['pup', 'junior', 'young adult'];
export const stageOfPup = (p, day, weekDays = 7) => STAGES[Math.min(2, Math.floor((day - p.born) / weekDays))]; // grows one stage per in-game season
export const PUP_SCALE = { pup: 0.8, junior: 1.1, 'young adult': 1.4 };
export function adoptPup(s, { name, myCoat, partnerCoat, day, r = 0.5 }) { if (!s.spouse && !s.p2p?.partner) return { ok: false, reason: 'Pups join married couples' }; if (s.pups.length >= 3) return { ok: false, reason: 'Your home is full of pups!' };
  const pup = { id: 'pup' + (s.pups.length + 1), name: String(name || 'Pup').slice(0, 14), coat: blendCoat(myCoat, partnerCoat, r), born: day, jobDay: -1 }; s.pups.push(pup); return { ok: true, pup }; }
// pups help with one small job each per day once they are juniors
export function pupJobs(s, day) { const f = ensureFarm(s), done = []; for (const p of s.pups || []) { if (p.jobDay === day || stageOfPup(p, day) === 'pup') continue; p.jobDay = day;
  const eggs = f.pen.egg || 0; if (eggs) { f.inv.egg = (f.inv.egg || 0) + eggs; delete f.pen.egg; done.push(`${p.name} gathered ${eggs} eggs`); continue; }
  if (f.orchard.ready) { f.inv[f.orchard.fruit] = (f.inv[f.orchard.fruit] || 0) + f.orchard.ready; done.push(`${p.name} picked ${f.orchard.ready} fruit`); f.orchard.ready = 0; continue; }
  s.bones += 5; done.push(`${p.name} found 5 bones`); } return done; }

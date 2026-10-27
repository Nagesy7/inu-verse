// $KIBBLE Holder Lounge — gated room past the free Trainer Gate (Inu Quest portal).
// Six features mirror Quest progress / Kibble Pay cosmetics. READ-ONLY toward Inu Quest:
// never cloudSave('inu-quest') or PUT save?game=inu-quest. Bones never cash out; cosmetics only.
import { HOLDER_THRESHOLD_U, isVip, holderCheck } from './fly5.js';
import { toU } from './mall.js';
import { readOnlyKp } from './companions.js';

export const LOUNGE_ID = 'lounge';
export const LOUNGE_NAME = '$KIBBLE Holder Lounge';
export const GATE_THRESHOLD_U = HOLDER_THRESHOLD_U; // same 100K bar as Mall VIP
export const KIBBLE_PAY_SHOP = 'https://kibble-pay.vercel.app/?game=inu-quest';
export const QUEST_ORIGIN = 'https://inu-quest.vercel.app';

/** Waghire founding myth plaques — mirrored from Inu Quest intro (Dr. Maple). No new lore product. */
export const LORE_PLAQUES = Object.freeze([
  {
    id: 'listen',
    title: 'Listen',
    body: 'Long before this land was called WAGHIRE, every creature species fought over it. Inus stopped fighting and started listening.',
  },
  {
    id: 'heartbeat',
    title: 'Heartbeat',
    body: "They matched their heartbeat to the land's rhythm — and that let them lead without ruling.",
  },
  {
    id: 'bridge',
    title: 'Bridge',
    body: 'Ribbits kept the waters. Cats kept the shadows. Inus became the bridge between all of it.',
  },
]);

/** Quest $KIBBLE cosmetics (from Inu Quest catalog / kibble-pay). Looks + trail only — never creatures/stats. */
export const QUEST_COSMETICS = Object.freeze([
  { id: 'look-ranger', name: 'Ranger Trainer look', price: 100000, kind: 'look' },
  { id: 'look-champion', name: 'Champion Trainer look', price: 400000, kind: 'look' },
  { id: 'look-shadow', name: 'Shadow Trainer look', price: 250000, kind: 'look' },
  { id: 'look-surf', name: 'Surf Trainer outfit', price: 150000, kind: 'look' },
  { id: 'look-sakura', name: 'Sakura Trainer outfit', price: 200000, kind: 'look' },
  { id: 'look-kibble', name: 'Kibble Gold outfit', price: 500000, kind: 'look' },
  { id: 'look-tidecoat', name: 'Tidecoat outfit', price: 200000, kind: 'look' },
  { id: 'look-bramble', name: 'Bramble Ranger outfit', price: 150000, kind: 'look' },
  { id: 'look-dune', name: 'Dune Walker outfit', price: 150000, kind: 'look' },
  { id: 'trail-paws', name: 'Paw-print throw trail', price: 100000, kind: 'trail' },
]);

/** Rival board beats — align with Inu Quest step4 rivalStory (REX). */
export const RIVAL_BEATS = Object.freeze([
  { id: 'intro', label: 'Lab intro', tease: 'Meet REX at Dr. Maple\'s lab.' },
  { id: 'route3', label: 'Route 3 rematch', tease: 'After Bramble Woods / Team Mange — talent vs listening.' },
  { id: 'route8', label: 'Route 8 rematch', tease: 'After the FUSE Badge — force vs the land\'s heartbeat.' },
]);

/**
 * Night-watch tips for routes the player has walked — reused Quest day/night encounter knowledge.
 * tip lists dusk/night-favoured species names (display only). requireFlag|requireBadge gate honesty.
 */
export const NIGHT_ROUTE_TIPS = Object.freeze([
  { id: 'paddock', name: 'Puppy Paddock', require: { flag: 'got_starter' }, night: ['Whiskerrier', 'Burrowbeagle', 'Fumepup'], note: 'Night grass leans shadow/flea pups.' },
  { id: 'bramble', name: 'Bramble Woods', require: { flag: 'mange_woods' }, night: ['Fumepup', 'Mangecur', 'Shibumbra'], note: 'Dusk/night: mangy & umbra lines show up more.' },
  { id: 'route3', name: 'Route 3', require: { flag: 'beat_rival2' }, night: ['Fumepup', 'Shibumbra'], note: 'Night pads the shadow weight after the rival beat.' },
  { id: 'route4', name: 'Route 4', require: { badge: 'ripple' }, night: ['Fumepup', 'Rattlerrier', 'Shibumbra'], note: 'Night rattlers and umbras after Ripple Badge.' },
  { id: 'mtkibble', name: 'Mt. Kibble', require: { badge: 'ripple' }, night: ['Lanterpup'], note: 'Cave night tag: Lanterpup joins the pool.' },
  { id: 'route5', name: 'Route 5', require: { map: 'route5' }, night: ['Fumepup', 'Mangecur'], note: 'Night favours fume/mange over day soarers.' },
  { id: 'echoden', name: 'Echo Den', require: { badge: 'fuse' }, night: ['Echopup', 'Hushpup'], note: 'Dark cave — GLOW from FUSE Badge; night-minded Inu.' },
  { id: 'route8', name: 'Route 8', require: { flag: 'beat_rival3' }, night: ['Shibumbra', 'Nightdoodle'], note: 'Late Act II night tips after beating REX on Route 8.' },
]);

const WORD = /^[a-z0-9_-]{1,40}$/i;
const clean = (s, fb = '', max = 24) => {
  const v = String(s ?? '').normalize('NFKC').replace(/[<>&"'`/\\\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
  return v || fb;
};

export function ensureLounge(state) {
  const L = (state.lounge ||= {});
  if (typeof L.sat !== 'boolean') L.sat = false;
  if (!Array.isArray(L.seenPlaques)) L.seenPlaques = [];
  return L;
}

/** Parse wallet UI balance ("1,234.56") into micro-units; null if unknown. */
export function balUFromUi(ui) {
  if (ui == null || ui === '' || ui === '…' || ui === '–' || ui === 'soon') return null;
  const n = Number(String(ui).replace(/,/g, ''));
  if (!Number.isFinite(n) || n < 0) return null;
  return toU(n);
}

/**
 * Gate: hold ≥ 100K $KIBBLE (same bar as Mall VIP). Demo uses state.kibble; live uses on-chain UI balance.
 * Optional kennelTier (any hold-streak tier) also opens the door — still $KIBBLE-backed, never pay-to-win.
 */
export function loungeGate(state, { balU = null, signedIn = false, kennelTier = null, demo = false } = {}) {
  holderCheck(state, balU != null ? balU : undefined);
  const vip = isVip(state) || (balU != null && balU >= GATE_THRESHOLD_U);
  const kennelOk = !!(kennelTier && ['pup', 'guard', 'alpha', 'top'].includes(kennelTier));
  const ok = vip || kennelOk;
  let reason = null;
  if (!ok) {
    if (!demo && !signedIn) reason = 'Sign in with Phantom and hold ≥ 100K $KIBBLE to enter the Holder Lounge. Trainer Gate next door stays free for everyone.';
    else reason = `Hold ≥ 100K $KIBBLE (on-chain) to enter. Trainer Gate (Inu Quest) stays free — lounge is holder space only.`;
  }
  return {
    ok,
    vip,
    kennelOk,
    thresholdU: GATE_THRESHOLD_U,
    balU: balU != null ? balU : toU(state.kibble || 0),
    reason,
  };
}

/** Pull raw Inu Quest save object from a cloud record or localStorage-shaped blob. Never writes. */
export function extractQuestSave(cloudOrData) {
  if (!cloudOrData || typeof cloudOrData !== 'object') return null;
  const data = cloudOrData.data && typeof cloudOrData.data === 'object' ? cloudOrData.data : cloudOrData;
  let raw = data['inuquest-save'] ?? data.inuquestSave ?? null;
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { return null; }
  }
  if (!raw || typeof raw !== 'object') return null;
  return raw;
}

/** Normalize rivalStory from Quest save v5 (+ legacy flags). Defaults name to REX. */
export function rivalFromSave(G) {
  if (!G || typeof G !== 'object') {
    return {
      status: 'empty',
      name: 'REX',
      sp: null,
      stage: 0,
      met: { intro: false, route3: false, route8: false },
      beaten: { intro: false, route3: false, route8: false },
      badges: 0,
      next: RIVAL_BEATS[0],
      stub: true,
      line: 'No Inu Quest save found yet. Play Quest, save with the same wallet, and REX will show up here.',
    };
  }
  const flags = G.flags && typeof G.flags === 'object' ? G.flags : {};
  const rs = G.rivalStory && typeof G.rivalStory === 'object' ? G.rivalStory : {};
  const met = {
    intro: !!(rs.met?.intro || flags.rival_intro || flags.got_starter || (Array.isArray(G.party) && G.party.length)),
    route3: !!(rs.met?.route3 || flags.rival2),
    route8: !!(rs.met?.route8 || flags.rival3),
  };
  const beaten = {
    intro: !!(rs.beaten?.intro || flags.beat_rival_intro),
    route3: !!(rs.beaten?.route3 || flags.beat_rival2),
    route8: !!(rs.beaten?.route8 || flags.beat_rival3),
  };
  let stage = Math.max(0, rs.stage | 0);
  if (beaten.route8) stage = Math.max(stage, 3);
  else if (beaten.route3) stage = Math.max(stage, 2);
  else if (met.intro) stage = Math.max(stage, 1);
  const name = clean(G.rival || rs.name || 'REX', 'REX', 12);
  const sp = WORD.test(G.rivalSp || rs.sp || '') ? (G.rivalSp || rs.sp) : null;
  const badges = Array.isArray(G.badges) ? G.badges.length : 0;
  let next = null;
  for (const b of RIVAL_BEATS) {
    if (!beaten[b.id]) { next = b; break; }
  }
  const lastBeat = [...RIVAL_BEATS].reverse().find((b) => beaten[b.id]) || null;
  const any = met.intro || beaten.intro || stage > 0 || !!sp;
  return {
    status: any ? 'ready' : 'stub',
    name,
    sp,
    stage,
    met,
    beaten,
    badges,
    lastBeat,
    next,
    stub: !any,
    line: any
      ? (next ? `Next tease: ${next.tease}` : 'You cleared every REX rematch on the board — Champion path still ahead in Quest.')
      : 'REX is waiting in Inu Quest. Clear the lab intro to light this board.',
  };
}

/** Silhouette gallery entries from companion bridge profile OR party forms on the Quest save. */
export function silhouettesFromCompanions(prof) {
  if (!prof?.companions?.length) return { status: 'empty', entries: [], line: 'No Inu Quest party found for this wallet yet. Catch and evolve Inus, save, then come back.' };
  const entries = [];
  for (const c of prof.companions) {
    if (c.kind !== 'inu' || !c.unlocked) continue;
    const forms = Array.isArray(c.forms) && c.forms.length
      ? c.forms.map((f) => ({ id: f.id, name: clean(f.name, f.id), stage: f.stage | 0 || 1, current: !!f.current }))
      : (c.form ? [{ id: c.form.id, name: clean(c.form.name, c.form.id), stage: c.form.stage | 0 || 1, current: true }] : []);
    if (!forms.length) continue;
    entries.push({
      id: c.id,
      name: clean(c.name, c.form?.name || 'Inu'),
      line: c.line || null,
      stage: c.form?.stage || forms.find((f) => f.current)?.stage || 1,
      forms,
      sheet: c.sheet || null,
    });
  }
  if (!entries.length) {
    return { status: 'empty', entries: [], line: 'Your Quest companions list has no evolved Inu outlines yet.' };
  }
  return { status: 'ready', entries, line: null };
}

/** Fallback silhouettes from raw Quest party when companion bridge is thin. */
export function silhouettesFromSave(G) {
  const party = Array.isArray(G?.party) ? G.party : [];
  const entries = [];
  for (let i = 0; i < Math.min(6, party.length); i++) {
    const m = party[i];
    if (!m || typeof m !== 'object') continue;
    const sp = WORD.test(m.sp || '') ? m.sp : null;
    if (!sp) continue;
    const name = clean(m.nick || m.name || sp, sp);
    entries.push({
      id: `inu:${i}`,
      name,
      line: sp,
      stage: Math.max(1, Math.min(3, m.stage | 0 || 1)),
      forms: [{ id: sp, name, stage: Math.max(1, Math.min(3, m.stage | 0 || 1)), current: true }],
      sheet: null,
    });
  }
  if (!entries.length) {
    return { status: 'empty', entries: [], line: 'No party Inus in the Quest save yet. The silhouette wall lights up as you evolve.' };
  }
  return { status: 'ready', entries, line: 'Showing party outlines from your Quest save (full evo chains appear once the companion bridge syncs).' };
}

function hasBadge(G, id) {
  const b = G?.badges;
  if (!Array.isArray(b)) return false;
  return b.some((x) => (typeof x === 'string' ? x : x?.id) === id);
}

function walkedRoute(G, tip) {
  const r = tip.require || {};
  if (r.flag && !(G?.flags && G.flags[r.flag])) return false;
  if (r.badge && !hasBadge(G, r.badge)) return false;
  if (r.map) {
    const visited = G?.visited || G?.maps || G?.flags;
    if (visited && typeof visited === 'object') {
      if (visited[r.map] || visited[`map_${r.map}`] || visited[`been_${r.map}`]) return true;
    }
    // Act II maps often only set progress flags — treat fuse badge as Route 5+ walked
    if (r.map === 'route5' && hasBadge(G, 'ripple')) return true;
    return false;
  }
  return true;
}

/** Night-watch pane: only tips for routes the player has evidence of walking. */
export function nightWatchFromSave(G, phaseLabel = 'day') {
  const nightish = phaseLabel === 'night' || phaseLabel === 'sunset' || phaseLabel === 'dusk' || phaseLabel === 'dawn';
  if (!G) {
    return {
      status: 'empty',
      phase: phaseLabel,
      nightish,
      tips: [],
      line: 'Walk routes in Inu Quest (same wallet) to unlock dusk/night encounter tips here. Lounge lamps follow the hub day–night cycle.',
    };
  }
  const tips = NIGHT_ROUTE_TIPS.filter((t) => walkedRoute(G, t)).map((t) => ({
    id: t.id,
    name: t.name,
    night: t.night.slice(),
    note: t.note,
  }));
  if (!tips.length) {
    return {
      status: 'empty',
      phase: phaseLabel,
      nightish,
      tips: [],
      line: 'No walked routes with night tips yet. Clear early Quest flags (starter, woods, badges) and the Night Watch pane fills in.',
    };
  }
  return {
    status: 'ready',
    phase: phaseLabel,
    nightish,
    tips,
    line: nightish
      ? 'Night pane open — dusk/night encounter tips for routes you have walked.'
      : 'Daytime in the hub — tips stay visible; lamps dim until dusk.',
  };
}

/** Party of six for kennel seats (companion profile preferred). */
export function partyDisplay(prof, G) {
  const fromC = silhouettesFromCompanions(prof);
  if (fromC.status === 'ready') {
    return {
      status: 'ready',
      slots: fromC.entries.slice(0, 6).map((e) => ({ id: e.id, name: e.name, stage: e.stage, form: e.forms.find((f) => f.current)?.name || e.name })),
      line: null,
    };
  }
  const fromS = silhouettesFromSave(G);
  if (fromS.status === 'ready') {
    return {
      status: 'ready',
      slots: fromS.entries.slice(0, 6).map((e) => ({ id: e.id, name: e.name, stage: e.stage, form: e.forms[0]?.name || e.name })),
      line: fromS.line,
    };
  }
  return { status: 'empty', slots: [], line: 'Sit with other holders — your Quest party of six will display here when the save bridge finds it.' };
}

export function cosmeticsRack(owned = {}) {
  const items = QUEST_COSMETICS.map((c) => ({
    ...c,
    owned: !!(owned[c.id] || owned[`inu-quest:${c.id}`]),
  }));
  return {
    status: 'ready',
    items,
    shopUrl: KIBBLE_PAY_SHOP,
    line: '$KIBBLE Quest cosmetics only (looks + paw trail). No creatures, stats, XP or pay-to-win. Buy on Kibble Pay.',
  };
}

export function loreHearth(seen = []) {
  const set = new Set(seen);
  return {
    status: 'ready',
    plaques: LORE_PLAQUES.map((p) => ({ ...p, seen: set.has(p.id) })),
    line: 'Waghire founding myth — same plaques as Inu Quest (listen / heartbeat / bridge).',
  };
}

/** Load Quest cloud save read-only (same frozen kp surface as companions). */
export async function loadQuestSave({ kp, timeoutMs = 8000, online = globalThis.navigator?.onLine !== false } = {}) {
  if (!kp?.session || !online) return { status: !kp?.session ? 'signedout' : 'offline', save: null };
  const within = (p) => {
    let t;
    return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error('timeout')), timeoutMs); })]).finally(() => clearTimeout(t));
  };
  try {
    const ro = readOnlyKp(kp);
    const cloud = await within(ro.cloudLoad('inu-quest'));
    const save = extractQuestSave(cloud);
    return { status: save ? 'ready' : 'empty', save };
  } catch {
    return { status: 'error', save: null };
  }
}

/** Hub dayPhase label → night-watch phase word. */
export function phaseForWatch(label) {
  if (label === 'night') return 'night';
  if (label === 'sunset') return 'dusk';
  if (label === 'dawn') return 'dawn';
  return 'day';
}

export { HOLDER_THRESHOLD_U, toU, isVip, readOnlyKp };

// World-growth presence ladder from World Grower growth-map v1.1 (29 Oct 2026, Australia/Sydney).
// Sources: /workspace/pump-copy-stack/data/KIBBLE-World-Growth-Map-v1.pdf (v1.1) and President Inu
// no-veto of growth-map-v1.md (soft flags folded in). Thresholds $0 / $50K / $100K / $250K / $500K / $1M / $5M.
// MC unlocks cosmetic / social / district *presence* only — never APY, prizes, Kennel eligibility, lounge access,
// or Arcade cabinet live flags. No item grants or Bones amounts ship here: per-tier content briefs were never
// written, so unspecified presence stays labeled "coming soon". Live MC always from marketCapUsd; UI never
// prints the live dollar figure (it says "Seed Town", not a snapshot cap). Preview: ?worldTier=borough.
export const HOLD_POLLS = 2;
export const NOTE = 'Cosmetic / social / district presence only — not a district gate, prize boost, Kennel change or cabinet flip. Cosmetics and Bones only; never $KIBBLE from play. Bone Day (when it lands) has no Bones, Treats or $KIBBLE drops.';
export const CALENDAR_NOTE = 'Cosmetic shop calendars from the Economy Designer draft stay off until a live calendar is approved. This panel does not grant items, Bones or $KIBBLE.';
const LIVE = 'already-live';
const SOON = 'coming-soon';
const NOW = 'live';
export const TIERS = Object.freeze([
  Object.freeze({ id: 'seed', name: 'Seed Town', mcUsd: 0, unlocks: Object.freeze([
    Object.freeze({ text: 'World as it is today', state: NOW }),
  ]) }),
  Object.freeze({ id: 'puppy_block', name: 'Puppy Block', mcUsd: 50000, unlocks: Object.freeze([
    Object.freeze({ text: 'Ambient traffic flair', state: SOON }),
    Object.freeze({ text: '+1 sidewalk NPC on the FUD Field strip', state: SOON }),
    Object.freeze({ text: 'Soft festival bunting on the Mall plaza', state: SOON }),
  ]) }),
  Object.freeze({ id: 'neighbourhood', name: 'Neighbourhood', mcUsd: 100000, unlocks: Object.freeze([
    Object.freeze({ text: 'Day/night shop OPEN/CLOSED lights', state: LIVE }),
    Object.freeze({ text: '+2 routine NPCs (barista, ranger)', state: SOON }),
    Object.freeze({ text: 'Materials Store textures (greenlit)', state: SOON }),
    Object.freeze({ text: 'District name-sign polish', state: SOON }),
  ]) }),
  Object.freeze({ id: 'borough', name: 'Borough', mcUsd: 250000, unlocks: Object.freeze([
    Object.freeze({ text: 'Community Hall shell — town-fiction / read-only art, not a vote', state: SOON }),
    Object.freeze({ text: 'Bone Day plaza gathering (no Bones, Treats or $KIBBLE drops)', state: SOON }),
    Object.freeze({ text: 'Stadium presence flair', state: SOON }),
  ]) }),
  Object.freeze({ id: 'city_ward', name: 'City Ward', mcUsd: 500000, unlocks: Object.freeze([
    Object.freeze({ text: 'Weather system (rain/sun still follow the mood API, not market cap)', state: LIVE }),
    Object.freeze({ text: 'Living World building queue (greenlit for District Architect)', state: SOON }),
    Object.freeze({ text: 'Kennel wall showcase slot (equip and lounge stay Kennel-gated)', state: SOON }),
  ]) }),
  Object.freeze({ id: 'capital_district', name: 'Capital District', mcUsd: 1000000, unlocks: Object.freeze([
    Object.freeze({ text: 'Full festival set (seasonal parade cosmetic)', state: SOON }),
    Object.freeze({ text: 'Mall-radial layout (greenlit)', state: SOON }),
    Object.freeze({ text: 'Cross-hub companion parade cosmetic', state: SOON }),
    Object.freeze({ text: 'Parkour / Race Park presence art (cabinets still Arcade-live only)', state: SOON }),
  ]) }),
  Object.freeze({ id: 'metropolis', name: 'Metropolis', mcUsd: 5000000, unlocks: Object.freeze([
    Object.freeze({ text: 'Deep ambient (buses, ice-cream route)', state: SOON }),
    Object.freeze({ text: 'Seasons pack', state: LIVE }),
    Object.freeze({ text: 'Full Living World phase depth', state: SOON }),
  ]) }),
]);
const byId = (id) => TIERS.find((t) => t.id === id) || null;
const slug = (v) => String(v || '').toLowerCase().replace(/[_-\s]+/g, '');
const ALIAS = Object.freeze({
  seed: 'seed', seedtown: 'seed',
  puppyblock: 'puppy_block',
  neighbourhood: 'neighbourhood', neighborhood: 'neighbourhood',
  borough: 'borough',
  cityward: 'city_ward', city: 'city_ward',
  capitaldistrict: 'capital_district', capital: 'capital_district',
  metropolis: 'metropolis',
});
export function prettyMc(n) {
  if (n == null || !Number.isFinite(n)) return '';
  if (n >= 1000000) return `$${n / 1000000}M`;
  if (n >= 1000) return `$${n / 1000}K`;
  return `$${n}`;
}
const num = (v) => { if (v == null || v === '') return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
export function mcOf(mood) { return num(mood?.marketCapUsd ?? mood?.mcUsd ?? mood?.marketCap); }
export function tierFromMc(mcUsd) {
  const n = num(mcUsd); if (n == null || n < 0) return null;
  let hit = TIERS[0];
  for (const t of TIERS) { if (n >= t.mcUsd) hit = t; else break; }
  return hit;
}
export function nextOf(tier) {
  const t = typeof tier === 'string' ? byId(tier) : tier;
  if (!t) return null;
  const i = TIERS.indexOf(byId(t.id));
  return i >= 0 && i < TIERS.length - 1 ? TIERS[i + 1] : null;
}
export function parseWorldTier(value) {
  const id = ALIAS[slug(value)];
  return id ? byId(id) : null;
}
export function overrideWorldTier(search = (typeof location !== 'undefined' ? location.search : '')) {
  try { return parseWorldTier(new URLSearchParams(search).get('worldTier')); } catch { return null; }
}
// 2-poll hysteresis, same shape as mood (src/kibblemood.js stepMood): first reading is accepted;
// a new tier must be seen on 2 consecutive polls before the displayed tier switches.
export function stepWorld(h, rawId) {
  const raw = byId(rawId) ? rawId : null;
  if (!raw) return { tier: byId(h?.tier) ? h.tier : null, pending: null, count: 0 };
  if (!h || !byId(h.tier)) return { tier: raw, pending: null, count: 0 };
  if (raw === h.tier) return { tier: h.tier, pending: null, count: 0 };
  const count = h.pending === raw ? (h.count || 0) + 1 : 1;
  return count >= HOLD_POLLS ? { tier: raw, pending: null, count: 0 } : { tier: h.tier, pending: raw, count };
}
export function snapshotOf(tierId, extra = {}) {
  const tier = byId(tierId) || null, next = nextOf(tier);
  return {
    worldTier: tier ? tier.id : null,
    nextTier: next ? next.id : null,
    nextAt: next ? next.mcUsd : null,
    pendingWorldTier: extra.pendingWorldTier || extra.pending || null,
    override: !!extra.override,
    tier, next,
  };
}
export function apiFields(wstate) {
  const snap = snapshotOf(wstate?.tier, { pendingWorldTier: wstate?.pending || null });
  return { worldTier: snap.worldTier, nextTier: snap.nextTier, nextAt: snap.nextAt, pendingWorldTier: snap.pendingWorldTier };
}
export function readGrowth(mood, { search } = {}) {
  const ov = overrideWorldTier(search);
  if (ov) return snapshotOf(ov.id, { override: true });
  if (mood && byId(mood.worldTier)) return snapshotOf(mood.worldTier, { pendingWorldTier: mood.pendingWorldTier || null });
  const raw = tierFromMc(mcOf(mood));
  return snapshotOf(raw ? raw.id : null);
}
export function statueLine(snap) {
  if (!snap?.tier) return 'Town growth follows the live $KIBBLE market cap. No live figure is printed here.';
  if (snap.override) {
    const next = snap.next ? ` · next unlock at ${snap.next.name} (${prettyMc(snap.next.mcUsd)})` : '';
    return `${snap.tier.name}${next} · preview`;
  }
  if (!snap.next) return `${snap.tier.name}.`;
  return `${snap.tier.name} · next unlock at ${snap.next.name} (${prettyMc(snap.next.mcUsd)}).`;
}
function stateLabel(st) { return st === SOON ? 'coming soon' : st === LIVE ? 'already live' : 'live'; }
export function cardHtml(esc = (s) => String(s), { snap = null } = {}) {
  const rows = TIERS.map((t) => {
    const on = snap?.tier && snap.tier.id === t.id ? ' on' : '';
    const bits = t.unlocks.map((u) => `${esc(u.text)} <em class="${u.state === SOON ? 'soon' : 'live'}">${esc(stateLabel(u.state))}</em>`).join(' · ');
    return `<div class="growth-band${on}"><b>${esc(t.name)}</b><small>${esc(t.mcUsd === 0 ? 'from $0' : 'from ' + prettyMc(t.mcUsd))}</small><span>${bits}</span></div>`;
  }).join('');
  const now = `<p class="sub">${esc(statueLine(snap))}</p>`;
  return `<div class="growth-card" id="growth-card"><h2>Town growth</h2>${now}<p class="small">${esc(NOTE)}</p><div class="growth-list">${rows}</div><p class="small">${esc(CALENDAR_NOTE)}</p></div>`;
}

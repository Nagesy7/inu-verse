// District booth rent (Bones only). Approved by Zachary 2 Nov 2026: all four classes at 15/35/50/80 Bones per in-game day,
// deposit = 2 days, lease closes after 3 unpaid days, one active lease per player, NO pool skim (pure Bones sink).
// Spec: /workspace/briefs/kibble-bones-district-rent-2026-10-29.md. Pure logic (no DOM), persisted under s.districtRent.
// Cosmetic presence only: never a fee to walk a district or open a cabinet, never a score/prize modifier, never $KIBBLE,
// no MC in the formula. Bones never go negative (an unpaid day charges nothing and counts toward closing).
import { DISTRICTS, CABINETS } from './districts.js';

// RELEASE FLAG: ON. Zachary approved wiring booths into the UI and save tick (Bones-only 15/35/50/80, no pool skim).
// setDistrictRentEnabled(false) still turns every write path into a no-op for tests.
export const DISTRICT_RENT_DEFAULT = true;
let ENABLED = DISTRICT_RENT_DEFAULT;
export const districtRentEnabled = () => ENABLED;
export function setDistrictRentEnabled(on) { ENABLED = on === true; return ENABLED; }
const OFF = Object.freeze({ ok: false, off: true, reason: 'District rent is not released yet' });

export const DEPOSIT_DAYS = 2; // same as biz.js LEASE_DEPOSIT
export const UNPAID_CLOSE = 3; // same as biz.js unpaid limit
export const POOL_SHARE = 0; // Zachary 2 Nov 2026: no 10% skim; district rent is a pure sink
export const MAX_LEASES = 1;
const VENUES = ['arena', 'fud-field', 'stadium', 'parkour', 'race-park'];
export const BOOTHS = Object.freeze({
  row_plaque: Object.freeze({ id: 'row_plaque', name: 'Sidewalk Plaque', rent: 15, districts: Object.freeze(['arcade-row']), needsLive: false, blurb: 'Cosmetic nameplate only.' }),
  row_booth: Object.freeze({ id: 'row_booth', name: 'Booth Skin', rent: 35, districts: Object.freeze(['arcade-row']), needsLive: false, blurb: 'Visual booth slot; not a cabinet.' }),
  district_kiosk: Object.freeze({ id: 'district_kiosk', name: 'District Kiosk', rent: 50, districts: Object.freeze(VENUES), needsLive: true, blurb: 'Kiosk flair in a district.' }),
  district_venue_skin: Object.freeze({ id: 'district_venue_skin', name: 'Venue Banner', rent: 80, districts: Object.freeze(['arcade-row', ...VENUES]), needsLive: true, blurb: 'Facade tint / banner (cosmetic).' }),
});
export const BOOTH_IDS = Object.freeze(Object.keys(BOOTHS));
export const LEASE_COPY = 'Cosmetic booth only. Cabinets stay free. Bones never cash out.';
export const deposit = (cls) => (BOOTHS[cls] ? BOOTHS[cls].rent * DEPOSIT_DAYS : null);
const hasLive = (d) => CABINETS.some((c) => c.district === d && c.live);

export function ensureDistrictRent(s) { if (!ENABLED) return null; s.districtRent ||= { lease: null, spent: 0, history: [] }; return s.districtRent; }
// Kiosk / venue banner only where the district has at least one live cabinet (ambience-only mode is not approved yet).
export function offered(cls, district) { const B = BOOTHS[cls]; if (!B || !DISTRICTS.some((d) => d.id === district)) return false; if (!B.districts.includes(district)) return false; return !B.needsLive || hasLive(district); }
export function offers(district) { return BOOTH_IDS.filter((c) => offered(c, district)).map((c) => BOOTHS[c]); }
// Spec soft-cap: warn (still allow) if daily rent obligations exceed max(40, 50% of yesterday's Bones earned).
export function rentWarn(cls, bonesEarnedYesterday = 0, otherDailyRent = 0) { const B = BOOTHS[cls]; if (!B) return false; return otherDailyRent + B.rent > Math.max(40, 0.5 * (Number(bonesEarnedYesterday) || 0)); }

export function leaseBooth(s, cls, district, day) {
  if (!ENABLED) return OFF;
  const r = ensureDistrictRent(s), B = BOOTHS[cls];
  if (!B) return { ok: false, reason: 'Unknown booth' };
  if (!offered(cls, district)) return { ok: false, reason: 'Not offered in this district' };
  if (r.lease) return { ok: false, reason: 'You already lease a booth' };
  const cost = deposit(cls); if ((s.bones || 0) < cost) return { ok: false, reason: `Need ${cost} bones (${DEPOSIT_DAYS} days rent)` };
  s.bones -= cost; r.spent += cost;
  r.lease = { cls, district, rent: B.rent, since: day, paidThrough: day + DEPOSIT_DAYS, unpaid: 0 };
  return { ok: true, cost, lease: r.lease };
}
export function endLease(s, why = 'ended') { if (!ENABLED) return OFF; const r = ensureDistrictRent(s); if (!r.lease) return { ok: false }; const l = r.lease; r.lease = null; r.history.unshift({ ...l, why }); r.history.length = Math.min(r.history.length, 10); return { ok: true, closed: l }; }
// Call once per in-game day (day = the day being settled). Deposit covers the first DEPOSIT_DAYS days.
export function tickDay(s, day) {
  if (!ENABLED) return null;
  const r = ensureDistrictRent(s), l = r.lease; if (!l) return null;
  if (day < l.paidThrough) return { paid: 0, covered: true };
  if ((s.bones || 0) >= l.rent) { s.bones -= l.rent; r.spent += l.rent; l.paidThrough = day + 1; l.unpaid = 0; return { paid: l.rent }; }
  l.unpaid += 1; // nothing charged; Bones never go below zero
  if (l.unpaid >= UNPAID_CLOSE) { endLease(s, 'unpaid'); return { paid: 0, unpaid: UNPAID_CLOSE, closed: true }; }
  return { paid: 0, unpaid: l.unpaid };
}
// Cosmetic read for renderers: what booth (if any) the player shows in a district. Never gates doors or cabinets.
export function boothIn(s, district) { if (!ENABLED) return null; const l = s.districtRent?.lease; return l && l.district === district ? BOOTHS[l.cls] : null; }

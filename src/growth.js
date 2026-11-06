// Growth-ladder cosmetic bands from economy loop v1.1 (29 Oct 2026).
// Source: /workspace/briefs/kibble-economy-loop-v1-2026-10-29.md (MC flavour table) and kibble-economy-map-2026-10-29.md.
// These bands flavour the town and cosmetic calendars only — they are not permanent unlock gates, prize odds, or Kennel eligibility.
// No item grants ship here: the briefs name calendar *ideas* (spotlight / flair / festival) but do not list item IDs, art, or Bones amounts.
// Rewards, if any are added later, may be cosmetics or Bones only — never $KIBBLE from play.
export const BANDS = Object.freeze([
  Object.freeze({ id: 'puppy_town', name: 'Puppy Town', mcUsdMin: 0, mcUsdMax: 50000, flavour: 'Core plaza mood; starter cosmetic spotlight' }),
  Object.freeze({ id: 'growing_kennel', name: 'Growing Kennel', mcUsdMin: 50000, mcUsdMax: 250000, flavour: 'Busier ambient density; Guard Dog flair campaign' }),
  Object.freeze({ id: 'pack_city', name: 'Pack City', mcUsdMin: 250000, mcUsdMax: 1000000, flavour: 'Seasonal mall drop set (fixed prices)' }),
  Object.freeze({ id: 'capital', name: 'Capital', mcUsdMin: 1000000, mcUsdMax: 5000000, flavour: 'Alpha / Top Dog cosmetic spotlight week' }),
  Object.freeze({ id: 'inuted_states', name: 'Inuted States', mcUsdMin: 5000000, mcUsdMax: null, flavour: 'Full Living World traffic density; festival cosmetics' }),
]);
export const NOTE = 'Flavour and cosmetic calendars only — not a district gate, prize boost or Kennel change. Cosmetics and Bones only; never $KIBBLE from play.';
const num = (v) => { if (v == null || v === '') return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
export function mcOf(mood) { return num(mood?.marketCapUsd ?? mood?.mcUsd ?? mood?.marketCap); }
export function bandFor(mcUsd) {
  const n = num(mcUsd); if (n == null || n < 0) return null;
  for (const b of BANDS) if (n >= b.mcUsdMin && (b.mcUsdMax == null || n < b.mcUsdMax)) return b;
  return BANDS[BANDS.length - 1];
}
function pretty(b) { if (b.mcUsdMax == null) return 'MC above $5M'; if (b.mcUsdMin === 0) return 'MC under $50k';
  const lo = b.mcUsdMin >= 1000000 ? `$${b.mcUsdMin / 1000000}M` : `$${b.mcUsdMin / 1000}k`;
  const hi = b.mcUsdMax >= 1000000 ? `$${b.mcUsdMax / 1000000}M` : `$${b.mcUsdMax / 1000}k`;
  return `MC ${lo}–${hi}`; }
export function cardHtml(esc = (s) => String(s), { band = null } = {}) {
  const rows = BANDS.map((b) => `<div class="growth-band${band && band.id === b.id ? ' on' : ''}"><b>${esc(b.name)}</b><small>${esc(pretty(b))}</small><span>${esc(b.flavour)}</span></div>`).join('');
  const now = band ? `<p class="sub">Current town flavour: <b>${esc(band.name)}</b>.</p>` : '<p class="sub">Town flavour follows the live $KIBBLE market-cap band (same feed as the statue mood). No live figure is printed here.</p>';
  return `<div class="growth-card" id="growth-card"><h2>Town growth</h2>${now}<p class="small">${esc(NOTE)}</p><div class="growth-list">${rows}</div></div>`;
}

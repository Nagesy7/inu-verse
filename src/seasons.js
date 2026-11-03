// Real-world seasons + holiday windows keyed off the Sydney date (southern hemisphere: Dec-Feb summer, Mar-May autumn,
// Jun-Aug winter, Sep-Nov spring). Drives building/plaza decorations, townsfolk hats and seasonal cosmetics.
// Pure (no DOM); ?season=<theme> or globalThis.__season overrides for debugging/screenshots.
export const SEASON_NAMES = ['summer', 'autumn', 'winter', 'spring'];
export const HOLIDAYS = ['halloween', 'xmas', 'newyear', 'lunar', 'easter'];
export const THEMES = [...HOLIDAYS, ...SEASON_NAMES];
export const THEME_LABEL = { halloween: 'Halloween', xmas: 'Christmas', newyear: 'New Year', lunar: 'Lunar New Year', easter: 'Easter', summer: 'Summer', autumn: 'Autumn', winter: 'Winter', spring: 'Spring' };
const ALIAS = { christmas: 'xmas', 'new-year': 'newyear', nye: 'newyear', lny: 'lunar', 'lunar-new-year': 'lunar', fall: 'autumn', off: 'none' };

/** {y, m (1-12), d} for an instant in Australia/Sydney */
export function sydneyYMD(ms = Date.now()) {
  try { const p = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date(ms));
    const g = (t) => +p.find((q) => q.type === t).value; return { y: g('year'), m: g('month'), d: g('day') };
  } catch { const dt = new Date(ms + 10 * 3600e3); return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() }; }
}
export const seasonOfMonth = (m) => SEASON_NAMES[Math.floor((m % 12) / 3)];
/** Gregorian Easter Sunday (anonymous algorithm) as {m, d} */
export function easterSunday(y) { const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, mm = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * mm + 114) / 31), da = ((h + l - 7 * mm + 114) % 31) + 1; return { m: mo, d: da }; }
// Lunar New Year (first day) — published dates
export const LUNAR_NY = { 2024: [2, 10], 2025: [1, 29], 2026: [2, 17], 2027: [2, 6], 2028: [1, 26], 2029: [2, 13], 2030: [2, 3], 2031: [1, 23], 2032: [2, 11], 2033: [1, 31], 2034: [2, 19], 2035: [2, 8] };
const dayNum = (y, m, d) => Math.floor(Date.UTC(y, m - 1, d) / 864e5);

/** holiday id for a Sydney calendar date, or null. Windows: Halloween Oct 24-Nov 1, Christmas Dec 1-26, New Year Dec 27-Jan 4,
 *  Lunar New Year -4..+14 days, Easter Palm Sunday..Easter Monday. */
export function holidayOn({ y, m, d }) {
  const n = dayNum(y, m, d);
  const ln = LUNAR_NY[y]; if (ln) { const k = n - dayNum(y, ln[0], ln[1]); if (k >= -4 && k <= 14) return 'lunar'; }
  const e = easterSunday(y), ek = n - dayNum(y, e.m, e.d); if (ek >= -7 && ek <= 1) return 'easter';
  if ((m === 10 && d >= 24) || (m === 11 && d === 1)) return 'halloween';
  if (m === 12 && d <= 26) return 'xmas';
  if ((m === 12 && d >= 27) || (m === 1 && d <= 4)) return 'newyear';
  return null;
}
function override() {
  let v = globalThis.__season; try { if (v == null && typeof location !== 'undefined') v = new URLSearchParams(location.search).get('season'); } catch {}
  if (!v) return null; v = String(v).toLowerCase(); v = ALIAS[v] || v; return v === 'none' || THEMES.includes(v) ? v : null;
}
/** { season, holiday, theme, label, forced } — theme = holiday || season; forced when overridden by ?season= */
export function currentSeason(ms = Date.now()) {
  const ymd = sydneyYMD(ms), season = seasonOfMonth(ymd.m), holiday = holidayOn(ymd), o = override();
  if (o === 'none') return { season, holiday: null, theme: 'none', label: '', forced: true, ymd };
  if (o) { const hol = HOLIDAYS.includes(o) ? o : null; return { season: hol ? season : o, holiday: hol, theme: o, label: THEME_LABEL[o], forced: true, ymd }; }
  const theme = holiday || season; return { season, holiday, theme, label: THEME_LABEL[theme], forced: false, ymd };
}
let memo = null, memoAt = -1e9;
/** cached theme for per-frame callers (re-evaluated at most every 60 s) */
export function seasonTheme(now = Date.now()) { if (!memo || now - memoAt > 60e3 || globalThis.__seasonDirty) { memo = currentSeason(now); memoAt = now; globalThis.__seasonDirty = false; } return memo; }
/** does a cosmetic tagged `tag` (holiday or season id) belong to the current theme? */
export const inSeason = (tag, S = seasonTheme()) => !!tag && (tag === S.theme || tag === S.holiday || tag === S.season);

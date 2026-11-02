/**
 * Funnel analytics for Vercel Web Analytics (custom events). The tiny window.va queue + /_vercel/insights/script.js are in
 * the HTML <head>. Privacy: no wallet/contract addresses, signatures, names or free text ever go into an event; only short
 * enum-like values pass cleanProps(), and page URLs are sent without the hash and without ?wallet= (beforeSend in the HTML).
 * Events: game_door, kibble_page_click, maker_click, lh_draft_open.
 */
const B58 = /[1-9A-HJ-NP-Za-km-z]{32,44}/, SAFE = /^[A-Za-z0-9_.:\- ]{1,40}$/, BLOCK = /wallet|address|mint|sig|name|text|desc|email|user/i;
export function cleanProps(p = {}) {
  const out = {};
  for (const [k, v] of Object.entries(p || {})) {
    if (BLOCK.test(k) || v == null) continue;
    if (typeof v === 'number' && Number.isFinite(v)) { out[k] = v; continue; }
    if (typeof v === 'boolean') { out[k] = v; continue; }
    const s = String(v).trim().slice(0, 40);
    if (s && !B58.test(s) && SAFE.test(s)) out[k] = s;
  }
  return out;
}
export function track(name, props) {
  try { if (typeof window !== 'undefined' && window.va) window.va('event', { name, data: cleanProps(props) }); } catch { /* never break the game */ }
}
export const KIBBLE_PAGE = 'https://kibbleinu.com/';
export const MAKER = 'https://cabal-meme-maker.vercel.app/';
/** UTM-style ref params for cross-links (added before any #hash). */
export function withRef(url, medium, campaign = 'funnel') {
  const u = new URL(url);
  u.searchParams.set('utm_source', 'inu-verse'); u.searchParams.set('utm_medium', medium); u.searchParams.set('utm_campaign', campaign);
  return u.toString();
}
/** Any <a data-va="event" data-va-from="…"> anywhere on the page is tracked on click (capture phase, never blocks the link). */
export function autoTrackLinks(root = typeof document !== 'undefined' ? document : null) {
  root?.addEventListener('click', (e) => { const a = e.target?.closest?.('[data-va]'); if (a) track(a.dataset.va, { from: a.dataset.vaFrom || '', coin: a.dataset.vaCoin || '' }); }, true);
}

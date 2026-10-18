// Clean Launch badge for every coin on the Launch Hall board (and $KIBBLE). Data: GET /api/coins?clean=<mints> (real on-chain
// checks, server-cached). Never invents data: a check that couldn't run shows "unknown", and PASS needs every check verified,
// including a published + locked creator fee split. Dev (creator) and top-10 wallet holdings are always shown on the badge.
export const ORDER = ['mint', 'freeze', 'creatorPct', 'top10', 'creatorSold', 'snipes', 'feeSplit', 'liquidity'];
export const LABELS = { mint: 'Mint authority renounced', freeze: 'Freeze authority renounced', creatorPct: 'Dev (creator) holding', top10: 'Top 10 wallets hold', creatorSold: 'Dev balance dropped (offloaded or moved)', snipes: 'Bundled / sniped first-slot entries', feeSplit: 'Creator fee split published + locked', liquidity: 'Liquidity' };
export const BADGE = { pass: { t: 'CLEAN LAUNCH', i: '✓' }, warn: { t: 'CHECK NOTES', i: '!' }, fail: { t: 'RED FLAGS', i: '✕' }, unknown: { t: 'NOT CHECKED YET', i: '?' } };
const cache = new Map();
export const cleanOf = (mint) => cache.get(mint) || null;
export function _reset() { cache.clear(); }
export async function fetchClean(mints, { f = globalThis.fetch, base = '' } = {}) { const want = [...new Set(mints)].filter(Boolean); if (!want.length) return {};
  const out = {}; for (let i = 0; i < want.length; i += 12) { const chunk = want.slice(i, i + 12);
    try { const r = await f(`${base}/api/coins?clean=${chunk.join(',')}`); const j = await r.json().catch(() => ({})); if (!r.ok) throw 0; for (const m of chunk) { const v = j.clean?.[m] || { mint: m, overall: 'unknown', error: 'no result' }; cache.set(m, v); out[m] = v; } }
    catch { for (const m of chunk) { const v = cache.get(m) || { mint: m, overall: 'unknown', error: 'checks unavailable right now' }; cache.set(m, v); out[m] = v; } } }
  return out; }
export const pending = (r) => !r || r.pending;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pctTxt = (x) => x?.status === 'unknown' || x?.value == null ? '?' : x.value + '%';
// flags for the badge face: dev + top-10 holdings, coloured by their own status
export function holdingFlags(r) { const c = r?.checks || {}; return [['Dev', c.creatorPct], ['Top10', c.top10]].map(([k, x]) => ({ k, v: pctTxt(x), s: x?.status || 'unknown' })); }
export function badgeHtml(mint, { open = false } = {}) { const r = cleanOf(mint), o = r?.overall || 'unknown', B = BADGE[o] || BADGE.unknown;
  const flags = holdingFlags(r).map((h) => `<span class="cl-flag cl-${h.s}">${h.k} ${esc(h.v)}</span>`).join('');
  return `<details class="cl cl-${o}" data-clean="${esc(mint)}"${open ? ' open' : ''}><summary><span class="cl-t">Clean Launch</span><span class="cl-badge"><i>${B.i}</i>${pending(r) ? 'CHECKING…' : B.t}</span>${flags}<span class="cl-more">tap for proof</span></summary>${breakdownHtml(r)}</details>`; }
export function breakdownHtml(r) { if (!r || r.pending) return '<div class="cl-body small">On-chain checks are running. They refresh about every 30 minutes.</div>';
  if (!r.checks) return `<div class="cl-body small">Checks unavailable right now (${esc(r.error || 'unknown')}). Shown as unknown, never guessed.</div>`;
  const rows = ORDER.filter((k) => r.checks[k]).map((k) => { const x = r.checks[k]; return `<li class="cl-${x.status}"><b>${x.status.toUpperCase()}</b><span><b>${LABELS[k]}</b><br>${esc(x.note)}</span></li>`; }).join('');
  const when = r.checkedAt ? new Date(r.checkedAt).toLocaleString() : '?';
  return `<div class="cl-body"><ul class="cl-list">${rows}</ul><div class="small">Read on-chain (Solana) through our server ${r.stale ? '(older result, refreshing)' : ''} · checked ${esc(when)}. PASS needs every check verified, including a published and locked creator fee split; anything we can't verify is "unknown" and caps the badge at CHECK NOTES. Not financial advice.</div></div>`; }

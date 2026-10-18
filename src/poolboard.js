// Weekly Pool Board: the named weekly boards with LIVE figures, shown on the Pools Monument (walk-up plaque) and in the City
// Board "Prize Pools" tab. Sources, nothing invented:
//   kibble-pay /api/pools                        -> the shared weekly $KIBBLE pool (accruedBaseUnits) + the Kennel Chest prize wallet
//   kibble-pay /api/game?action=scores&game=..   -> Meme Brawl / Street Sniffer / Kibble Chomp weekly entries (leader, entry count)
//   kibble-pay /api/inu-score?board=1            -> Inu Score board (players, leader)
//   this town's sim (farm.pool / biz.pool)       -> Top Farmer / Top Business in-game Bones pools
// kibble-pay keeps ONE shared weekly pool, not one per game, so the per-game boards show "not available" for a pool figure.
// Skill boards only: no entry fee and no chance element, and the copy says so plainly.
import { WALLETS, SOLSCAN, shortAddr, walletText } from './wallets.js';
export const KP = 'https://kibble-pay.vercel.app';
export const NA = 'not available';
export const CACHE_MS = 60000;
export const BOARDS = Object.freeze([
  { id: 'farm', name: 'Top Farmer', src: 'town' }, { id: 'biz', name: 'Top Business', src: 'town' },
  { id: 'meme-brawl', name: 'Meme Brawl', src: 'scores' }, { id: 'street-sniffer', name: 'Street Sniffer', src: 'scores' },
  { id: 'kibble-chomp', name: 'Kibble Chomp', src: 'scores' }, { id: 'inu-score', name: 'Inu Score', src: 'inuscore' },
]);
export const SCORE_GAMES = BOARDS.filter((b) => b.src === 'scores').map((b) => b.id);
const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
export const fmtKib = (base, dec = 6) => (base == null ? NA : (base / 10 ** dec).toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' KIBBLE');
export const sydneyTime = (ts) => new Date(ts).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) + ' Sydney time';
const leaderOf = (entries) => { const e = Array.isArray(entries) && entries[0]; return e && e.wallet ? `${walletText(e.wallet)} · ${Math.floor(Number(e.score) || 0)}` : null; };

/** Fetch every source in parallel. A failed source becomes null (shown as "not available"), never a made-up number. */
export async function fetchRaw(fetchFn = globalThis.fetch, base = KP, now = Date.now) {
  const j = (p) => fetchFn(base + p).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const [pools, inuScore, ...scores] = await Promise.all([j('/api/pools'), j('/api/inu-score?board=1'), ...SCORE_GAMES.map((g) => j(`/api/game?action=scores&game=${g}&pool=weekly`))]);
  return { pools, inuScore, scores: Object.fromEntries(SCORE_GAMES.map((g, i) => [g, scores[i]])), fetchedAt: now() };
}
/** town: { farmPool, bizPool, farmTop: [{name,score}], bizTop } from this save's sim. Pure. */
export function buildBoard(raw, town = {}) {
  const P = raw?.pools || null, dec = num(P?.decimals) ?? 6, wk = P?.pools?.weekly || null;
  const wkBase = num(wk?.accruedBaseUnits), pw = P?.prize?.prizeWallet, addr = pw?.address || WALLETS.kennelChest.address;
  const townRow = (b, pool, top) => { const t = (top || []).slice().sort((a, c) => c.score - a.score)[0];
    return { id: b.id, name: b.name, figure: num(pool) == null ? NA : `${Math.floor(pool).toLocaleString('en-US')} Bones`, note: 'in-game Bones pool (this town)', leader: t ? `${t.name} · ${Math.floor(t.score)}` : null, entries: (top || []).length || null, live: num(pool) != null }; };
  const rows = BOARDS.map((b) => {
    if (b.id === 'farm') return townRow(b, town.farmPool, town.farmTop);
    if (b.id === 'biz') return townRow(b, town.bizPool, town.bizTop);
    if (b.src === 'scores') { const s = raw?.scores?.[b.id]; return { id: b.id, name: b.name, figure: NA, note: s ? `weekly scores ${s.period || ''}`.trim() : 'scores ' + NA, leader: s ? leaderOf(s.entries) : null, entries: s ? (s.entries || []).length : null, live: !!s }; }
    const s = raw?.inuScore; return { id: b.id, name: b.name, figure: NA, note: s ? 'Inu Score board' : 'Inu Score ' + NA, leader: s ? leaderOf(s.entries) : null, entries: s ? num(s.players) : null, live: !!s };
  });
  return { rows, weekly: { period: wk?.period || null, figure: fmtKib(wkBase, dec), base: wkBase },
    chest: { name: pw?.name || WALLETS.kennelChest.name, address: addr, short: pw?.short || shortAddr(addr), solscan: pw?.solscan || SOLSCAN(addr) },
    updatedAt: raw?.fetchedAt || null, updated: raw?.fetchedAt ? sydneyTime(raw.fetchedAt) : NA, live: !!P };
}
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function boardHtml(B) {
  return `<div class="card poolboard" id="pool-board"><b>Weekly Pool Board${B.weekly.period ? ` · ${esc(B.weekly.period)}` : ''}</b>
    <small>Shared weekly $KIBBLE pool (all Inu games): <b>${esc(B.weekly.figure)}</b></small>
    <table class="pbt"><thead><tr><th>Board</th><th>Pool</th><th>Leader</th><th>Entries</th></tr></thead><tbody>${B.rows.map((r) => `<tr data-board="${esc(r.id)}"><td><b>${esc(r.name)}</b><div class="small">${esc(r.note)}</div></td><td class="${r.figure === NA ? 'na' : ''}">${esc(r.figure)}</td><td>${esc(r.leader || '–')}</td><td>${r.entries == null ? NA : r.entries}</td></tr>`).join('')}</tbody></table>
    <small>Prize wallet: <span class="wname"><b>${esc(B.chest.name)}</b> <a href="${esc(B.chest.solscan)}" target="_blank" rel="noopener noreferrer" title="${esc(B.chest.address)}"><code>${esc(B.chest.short)}</code> Solscan ↗</a></span></small>
    <small>Ranked by skill and score only, no entry fee. kibble-pay keeps one shared weekly pool, so per-game pool figures are not available.</small>
    <small class="pb-upd">Last updated ${esc(B.updated)}</small></div>`;
}
// cached loader for the client (monument plaque + panel)
let cache = null, inflight = null;
export function cached() { return cache; }
export async function load(fetchFn, { force = false, now = Date.now } = {}) {
  if (!force && cache && now() - cache.fetchedAt < CACHE_MS) return cache;
  inflight ||= fetchRaw(fetchFn, KP, now).then((r) => (cache = r)).finally(() => { inflight = null; }); return inflight;
}
export function _reset() { cache = null; inflight = null; }

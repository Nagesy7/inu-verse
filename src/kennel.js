// Kibble Kennel mirror (cosmetics only): reads the shared tier API (contract: /workspace/inu-shared/kennel-api.md) and
// draws a tier name tag, aura and golden name on the pup. Inu Verse never holds or moves tokens and never asks for a lock:
// the lock flow + tier reader belong to the Inu Empires keeper (kibble-pay /api/kennel). 404 / errors -> unknown -> nothing shown.
import { cleanName } from './mpshared.js';
export const API = 'https://kibble-pay.vercel.app/api/kennel';
export const TIERS = {
  pup: { id: 'pup', name: 'Pup', amount: 100_000, minDays: 7, tag: '#b87333', ink: '#2a1606', aura: null, gold: false },
  guard: { id: 'guard', name: 'Guard Dog', amount: 1_000_000, minDays: 30, tag: '#c9d1dc', ink: '#1c2230', aura: null, gold: false },
  alpha: { id: 'alpha', name: 'Alpha', amount: 10_000_000, minDays: 90, tag: '#9b7bff', ink: '#160c36', aura: 'paws', gold: false },
  top: { id: 'top', name: 'Top Dog', amount: 50_000_000, minDays: 180, tag: '#f2cc68', ink: '#3a2a06', aura: 'gold', gold: true },
};
export const TIER_IDS = Object.keys(TIERS);
export const tierId = (t) => { const s = String(t || '').toLowerCase(); return s === 'topdog' || s === 'top_dog' ? 'top' : TIERS[s] ? s : null; };
export const CACHE_MS = 10 * 60_000;
const cache = new Map();
export function _reset() { cache.clear(); }
// -> { status: 'ok'|'unknown', tier: id|null, tierName, unlockDate, stale, source }
export async function fetchKennel(wallet, { f = globalThis.fetch, now = Date.now(), api = API } = {}) {
  if (!wallet) return { status: 'unknown', tier: null, reason: 'no wallet' };
  const hit = cache.get(wallet); if (hit && now - hit.at < CACHE_MS) return hit.v;
  let v; try { const r = await f(`${api}?wallet=${encodeURIComponent(wallet)}`, { headers: { accept: 'application/json' } });
    if (!r.ok) v = { status: 'unknown', tier: null, reason: r.status === 404 ? 'kennel API not live yet' : 'kennel API error ' + r.status };
    else { const j = await r.json(); if (!j || typeof j !== 'object' || !('tier' in j)) v = { status: 'unknown', tier: null, reason: 'unexpected response' };
      else { const t = tierId(j.tier); v = { status: 'ok', tier: t, tierName: t ? TIERS[t].name : null, unlockDate: j.unlockDate || null, tierUntil: j.tierUntil || null, lockedAmount: Number(j.lockedAmount) || 0, nextTier: j.nextTier || null, stale: !!j.stale, source: j.source || null }; } } }
  catch { v = { status: 'unknown', tier: null, reason: 'kennel API unreachable' }; }
  cache.set(wallet, { at: now, v }); return v; }
// GET /api/kennel?wall=1 (kibble-pay): only wallets whose tier the server verified from chain. Names go through our own
// name filter (profanity/addresses -> short address). -> { status, topDogs:[...], wall:[...all verified tiers...], empty }
const entry = (d) => { if (typeof d?.wallet !== 'string') return null; const short = shortW(d.wallet), nm = typeof d.name === 'string' ? cleanName(d.name, short) : short;
  return { wallet: d.wallet, label: nm || short, tier: tierId(d.tier) || 'top', lockedAmount: Number(d.lockedAmount) || 0, since: d.since || null }; };
export async function fetchWall({ f = globalThis.fetch, api = API } = {}) {
  try { const r = await f(`${api}?wall=1`); if (!r.ok) return { status: 'unknown', topDogs: [], wall: [], reason: r.status === 404 || r.status === 400 ? 'Top Dog list not published by the Kennel API yet' : 'error ' + r.status };
    const j = await r.json(); if (!Array.isArray(j?.topDogs)) return { status: 'unknown', topDogs: [], wall: [], reason: 'unexpected response' };
    const wall = (Array.isArray(j.wall) ? j.wall : j.topDogs).map(entry).filter(Boolean).slice(0, 40);
    return { status: 'ok', topDogs: j.topDogs.map((d) => entry({ ...d, tier: 'top' })).filter(Boolean).slice(0, 40), wall, empty: j.empty || null, updatedAt: j.updatedAt || null }; }
  catch { return { status: 'unknown', topDogs: [], wall: [], reason: 'unreachable' }; } }
export function overrideTier(search = (typeof location !== 'undefined' ? location.search : '')) { try { return tierId(new URLSearchParams(search).get('kennel')); } catch { return null; } }
export const SHOW_KEY = 'inuverse.kennel.show';
export const showMine = (store = globalThis.localStorage) => { try { return store?.getItem(SHOW_KEY) !== '0'; } catch { return true; } };
export const setShowMine = (on, store = globalThis.localStorage) => { try { store?.setItem(SHOW_KEY, on ? '1' : '0'); } catch {} };
// what the local pup wears: preview override first (labelled), then the real tier; hidden when the player turned it off
export function myKennel({ override = null, real = null, show = true } = {}) { if (!show) return null; if (override) return { tier: override, preview: true }; return real?.status === 'ok' && real.tier ? { tier: real.tier, preview: false } : null; }
// multiplayer: what we send (look.pl.look.kennel) and what we trust from others (only with a server-verified wallet)
export const lookKennel = (mine) => (mine && !mine.preview ? mine.tier : null);
export const remoteKennel = (r) => (r?.w ? tierId(r.kennel) : null);

// ---- drawing (actor space: origin at the pup's feet, ctx already scaled 0.5) ----
export function drawAura(ctx, tier, t) { const T = TIERS[tier]; if (!T?.aura) return; ctx.save();
  if (T.aura === 'gold') { const p = 0.6 + 0.4 * Math.sin(t * 3);
    const g = ctx.createRadialGradient(0, -44, 8, 0, -44, 80); g.addColorStop(0, `rgba(255,214,90,${0.55 * p})`); g.addColorStop(0.6, `rgba(255,200,60,${0.25 * p})`); g.addColorStop(1, 'rgba(255,200,60,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -44, 70, 84, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(255,214,90,${0.7 + 0.3 * p})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 10, 34, 10, 0, 0, 7); ctx.stroke(); ctx.strokeStyle = 'rgba(140,96,20,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, 10, 38, 12, 0, 0, 7); ctx.stroke();
    for (let i = 0; i < 6; i++) { const a = t * 1.4 + i * 1.047, x = Math.cos(a) * 38, y = -44 + Math.sin(a) * 52, al = 0.6 + 0.4 * Math.sin(t * 5 + i); ctx.fillStyle = `rgba(255,236,150,${al})`; ctx.fillRect(Math.round(x) - 3, Math.round(y) - 1, 6, 2); ctx.fillRect(Math.round(x) - 1, Math.round(y) - 3, 2, 6); } }
  else { for (let i = 0; i < 6; i++) { const a = t * 0.9 + i * 1.047, x = Math.cos(a) * 34, y = 8 + Math.sin(a) * 11, al = 0.6 + 0.35 * Math.sin(t * 2.4 + i); paw(ctx, x, y, `rgba(160,120,255,${al})`); } }
  ctx.restore(); }
function paw(ctx, x, y, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, 7, 5.5, 0, 0, 7); ctx.fill(); for (const [dx, dy] of [[-7, -7], [-2.5, -10], [2.5, -10], [7, -7]]) { ctx.beginPath(); ctx.ellipse(x + dx, y + dy, 2.5, 3, 0, 0, 7); ctx.fill(); } }
// small tier tag drawn by art.js nameTag above the name (or above the Pack badge)
export function tagFor(tier, preview = false) { const T = TIERS[tierId(tier)]; return T ? { text: (preview ? 'PREVIEW ' : '') + T.name.toUpperCase(), color: T.tag, ink: T.ink, gold: T.gold } : null; }

// ---- panel ----
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shortW = (w) => w ? w.slice(0, 4) + '…' + w.slice(-4) : '?';
const fmt = (n) => Number(n).toLocaleString('en-US');
export function wallHtml({ wall, me, wallet, override, show }) {
  const tiers = TIER_IDS.map((id) => { const T = TIERS[id]; return `<li><span class="kn-chip" style="background:${T.tag};color:${T.ink}">${T.name}</span> lock ${fmt(T.amount)} $KIBBLE for ${T.minDays}+ days · ${id === 'top' ? 'gold aura, golden name, a spot on this wall' : id === 'alpha' ? 'paw-print aura + tag' : 'name tag'}</li>`; }).join('');
  const row = (d) => `<li><b>${d.tier === 'top' ? '★ ' : ''}${esc(d.label)}</b> <span class="kn-chip" style="background:${TIERS[d.tier].tag};color:${TIERS[d.tier].ink}">${TIERS[d.tier].name}</span>${d.lockedAmount ? ` <span class="small">${fmt(Math.floor(d.lockedAmount))} $KIBBLE locked</span>` : ''}${d.since ? ` <span class="small">since ${esc(String(d.since).slice(0, 10))}</span>` : ''}</li>`;
  const others = wall?.status === 'ok' ? (wall.wall || []).filter((d) => d.tier !== 'top') : [];
  const dogs = wall?.status === 'ok' ? (wall.topDogs.length ? `<ol class="kn-wall">${wall.topDogs.map(row).join('')}</ol>` : `<p class="small kn-empty">${esc(wall.empty || 'No Top Dogs yet')}. The first verified Top Dog lock shows up here.</p>`)
      + (others.length ? `<p class="small" style="margin:8px 0 2px"><b>Kennel members</b> (verified tiers)</p><ol class="kn-wall">${others.slice(0, 20).map(row).join('')}</ol>` : '')
    : `<p class="small kn-soon">Top Dogs will be listed here once the Kibble Kennel publishes its Top Dog list${wall?.reason ? ` (${esc(wall.reason)})` : ''}. Nobody is shown until it does.</p>`;
  const mine = override ? `Previewing <b>${esc(TIERS[override].name)}</b> (preview only, not a real tier).` : !wallet ? 'Connect your wallet to show your Kennel tier on your pup.'
    : me?.status === 'ok' ? (me.tier ? `Your tier: <b>${esc(TIERS[me.tier].name)}</b>${me.unlockDate ? ` · earliest unlock ${esc(String(me.unlockDate).slice(0, 10))}` : ''}${me.stale ? ' (cached)' : ''}` : 'No Kennel tier on this wallet yet.')
    : `Kennel tier: unknown (${esc(me?.reason || 'not checked yet')}).`;
  return `<h2>Kibble Kennel wall</h2><p class="sub">Top Dogs of the Kibble Kennel. Cosmetics only: no rewards, no yield, no stat changes.</p>
  <div class="card" style="text-align:left"><b>Top Dogs</b>${dogs}</div>
  <div class="card" style="text-align:left"><div class="small">${mine}</div><label class="small kn-toggle"><input type="checkbox" id="kn-show" ${show ? 'checked' : ''}> Show my Kennel look (others see it too)</label></div>
  <details class="card" style="text-align:left"><summary><b>How tiers work</b></summary><ul class="small kn-tiers">${tiers}</ul><p class="small">You lock your own $KIBBLE with Streamflow from your own wallet, in Inu Empires' Kibble Kennel. Inu Verse never holds or moves tokens; it only reads your tier.</p></details>
  <div class="nfa">Not financial advice. Kennel tiers are cosmetic.</div>`; }

// ---- plaza Kennel wall prop (world coords; KIBBLE_PLAZA.wall in world.js) ----
const INK = '#0c1022', NAVY = '#121a36', GOLD = '#d4a640', GOLD_L = '#f2cc68', GOLD_D = '#8f6a22', CREAM = '#fff6e0', STONE = '#8a8296', STONE_D = '#5e5870', STONE_L = '#b4acc0';
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
export function wallProps(spot, wall, t, TILE = 32) { if (!spot) return []; const x = spot.x * TILE, w = spot.w * TILE, base = (spot.y + 1) * TILE;
  return [{ y: base - 2, d: (c) => {
    const top = base - 78; R(c, x - 2, top - 2, w + 4, 80, INK); R(c, x, top, w, 76, STONE); R(c, x, top, w, 3, STONE_L); R(c, x, base - 6, w, 4, STONE_D);
    for (let k = 0; k < w; k += 16) R(c, x + k, top + 18 + ((k / 16) % 2) * 22, 1, 20, STONE_D); // masonry seams
    R(c, x + 8, top + 4, w - 16, 14, NAVY); R(c, x + 8, top + 4, w - 16, 2, GOLD); R(c, x + 8, top + 16, w - 16, 2, GOLD_D);
    c.font = '6px Silkscreen, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = GOLD_L; c.fillText('KIBBLE KENNEL · TOP DOGS', x + w / 2, top + 11);
    const dogs = wall?.status === 'ok' ? wall.topDogs.slice(0, 6) : [];
    for (let i = 0; i < 6; i++) { const px = x + 10 + (i % 3) * ((w - 20) / 3), py = top + 24 + Math.floor(i / 3) * 22, pw = (w - 20) / 3 - 6, d = dogs[i];
      R(c, px - 1, py - 1, pw + 2, 18, INK); R(c, px, py, pw, 16, d ? GOLD : STONE_D); R(c, px, py, pw, 2, d ? GOLD_L : STONE);
      c.font = '5px Silkscreen, monospace'; c.fillStyle = d ? '#3a2a06' : STONE_L; c.fillText(d ? '★ ' + String(d.label || shortW(d.wallet)).slice(0, 11) : '· · ·', px + pw / 2, py + 9); }
    if (wall?.status !== 'ok' || !dogs.length) { const sw = 70, sx = x + w / 2 - sw / 2, sy = top + 34; R(c, sx - 1, sy - 1, sw + 2, 13, INK); R(c, sx, sy, sw, 11, CREAM); c.font = '5px Silkscreen, monospace'; c.fillStyle = INK; c.fillText(wall?.status === 'ok' ? 'NO TOP DOGS YET' : 'OPENS SOON', x + w / 2, sy + 6); }
    const s = 0.5 + 0.5 * Math.sin(t * 2); c.fillStyle = `rgba(255,226,122,${0.25 + 0.3 * s})`; c.fillRect(Math.round(x + w / 2 - 3), Math.round(top - 8), 6, 6); // little gold lamp
  } }]; }

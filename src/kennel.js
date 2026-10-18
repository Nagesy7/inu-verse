// Kibble Kennel mirror (cosmetics only): reads the shared Kennel API v2 (contract: kibble-pay docs/KENNEL_API.md, the source of
// truth; HYBRID since 18 Oct 2026). Tiers come from free HOLD STREAKS (keep a tier's $KIBBLE in your wallet for its days); an
// optional Streamflow self-lock of 100K+ only adds one separate 'Locked' flair (kn_badge_locked) and never sets or raises a tier.
// Inu Verse never holds or moves tokens and never asks for a lock. 404 / errors / non-v2 bodies -> unknown -> nothing shown.
import { nameOf, walletText, walletHtml } from './wallets.js';
import { cleanName } from './mpshared.js';
export const API = 'https://kibble-pay.vercel.app/api/kennel';
export const TIERS = {
  pup: { id: 'pup', name: 'Pup', amount: 100_000, days: 7, minDays: 7, tag: '#b87333', ink: '#2a1606', aura: null, gold: false },
  guard: { id: 'guard', name: 'Guard Dog', amount: 1_000_000, days: 30, minDays: 30, tag: '#c9d1dc', ink: '#1c2230', aura: null, gold: false },
  alpha: { id: 'alpha', name: 'Alpha', amount: 10_000_000, days: 90, minDays: 90, tag: '#9b7bff', ink: '#160c36', aura: 'paws', gold: false },
  top: { id: 'top', name: 'Top Dog', amount: 50_000_000, days: 90, minDays: 90, tag: '#f2cc68', ink: '#3a2a06', aura: 'gold', gold: true },
};
export const TIER_IDS = Object.keys(TIERS);
export const FLAIR = { id: 'kn_badge_locked', name: 'Locked', minAmount: 100_000, tag: '#5a6b86', ink: '#f3f6fb' };
export const EARLIEST_PUP = '2026-10-21T13:00:00.000Z'; // 22 Oct 2026 00:00 Sydney ($KIBBLE launched 15 Oct 2026 + 7 days)
export const tierId = (t) => { const s = String(t || '').toLowerCase(); return s === 'topdog' || s === 'top_dog' ? 'top' : TIERS[s] ? s : null; };
export const CACHE_MS = 10 * 60_000;
const cache = new Map();
export function _reset() { cache.clear(); }
const num = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);
const iso = (d) => (typeof d === 'string' && !Number.isNaN(Date.parse(d)) ? d : null);
const streakOf = (s) => { const id = tierId(s?.id); if (!id) return null;
  return { id, name: TIERS[id].name, amount: num(s.amount) || TIERS[id].amount, days: num(s.days) || TIERS[id].days, holding: s.holding === true, daysHeld: Math.max(0, num(s.daysHeld)),
    earned: s.earned === true, reachDate: iso(s.reachDate), needAmount: Math.max(0, num(s.needAmount)), needDays: Math.max(0, num(s.needDays)),
    earliestPossible: iso(s.earliestPossible), progress: Math.min(1, Math.max(0, num(s.progress))) }; };
const nextOf = (n) => { const id = tierId(n?.id); if (!id) return null;
  return { id, name: TIERS[id].name, days: num(n.days) || TIERS[id].days, holding: n.holding === true, needAmount: Math.max(0, num(n.needAmount)), needDays: Math.max(0, num(n.needDays)),
    reachDate: iso(n.reachDate), reachDateIfHeldFromNow: iso(n.reachDateIfHeldFromNow) }; };
// v2 body -> view model. Only a v2 hold-streak body counts (tierSource 'hold-streak'); a v1 lock-tier body is 'unexpected'.
export function parseKennel(j, wallet) {
  if (!j || typeof j !== 'object' || !('tier' in j)) return { status: 'unknown', tier: null, reason: 'unexpected response' };
  if (j.tierSource !== 'hold-streak') return { status: 'unknown', tier: null, reason: 'not a v2 hold-streak response' };
  if (wallet && j.wallet && j.wallet !== wallet) return { status: 'unknown', tier: null, reason: 'wallet mismatch' };
  const t = tierId(j.tier), L = j.locked && typeof j.locked === 'object' ? j.locked : {};
  return { status: 'ok', tier: t, tierName: t ? TIERS[t].name : null, tierSource: 'hold-streak', held: Math.max(0, num(j.held)),
    locked: { flair: L.flair === true, amount: Math.max(0, num(L.amount)), minAmount: num(L.minAmount) || FLAIR.minAmount, unlockDate: iso(L.unlockDate), count: Math.max(0, num(L.count)) },
    streaks: (Array.isArray(j.streaks) ? j.streaks : []).map(streakOf).filter(Boolean), nextStep: nextOf(j.nextStep),
    history: j.history && typeof j.history === 'object' ? { complete: j.history.complete !== false, reason: typeof j.history.reason === 'string' ? j.history.reason : null } : null,
    stale: !!j.stale, source: typeof j.source === 'string' ? j.source : null, fetchedAt: iso(j.fetchedAt) }; }
// -> parseKennel() result, or { status: 'unknown', tier: null, reason } on any failure
export async function fetchKennel(wallet, { f = globalThis.fetch, now = Date.now(), api = API } = {}) {
  if (!wallet) return { status: 'unknown', tier: null, reason: 'no wallet' };
  const hit = cache.get(wallet); if (hit && now - hit.at < CACHE_MS) return hit.v;
  let v; try { const r = await f(`${api}?wallet=${encodeURIComponent(wallet)}`, { headers: { accept: 'application/json' } });
    if (!r.ok) v = { status: 'unknown', tier: null, reason: r.status === 404 ? 'kennel API not live yet' : 'kennel API error ' + r.status };
    else v = parseKennel(await r.json(), wallet); }
  catch { v = { status: 'unknown', tier: null, reason: 'kennel API unreachable' }; }
  cache.set(wallet, { at: now, v }); return v; }
// GET /api/kennel?wall=1 (kibble-pay v2): only wallets whose hold-streak tier the server verified from chain, ranked by tier then
// $KIBBLE held. Names go through our own name filter (profanity/addresses -> short address).
const RANK = { pup: 1, guard: 2, alpha: 3, top: 4 };
const entry = (d) => { if (typeof d?.wallet !== 'string') return null; const short = shortW(d.wallet), nm = nameOf(d.wallet) || (typeof d.name === 'string' ? cleanName(d.name, short) : short); // our own wallets carry their src/wallets.js name
  return { wallet: d.wallet, label: nm || short, tier: tierId(d.tier) || 'top', held: Math.max(0, num(d.held)), lockedFlair: d.lockedFlair === true, since: d.since || null }; };
const byHeld = (a, b) => (RANK[b.tier] - RANK[a.tier]) || (b.held - a.held);
export async function fetchWall({ f = globalThis.fetch, api = API } = {}) {
  try { const r = await f(`${api}?wall=1`); if (!r.ok) return { status: 'unknown', topDogs: [], wall: [], reason: r.status === 404 || r.status === 400 ? 'Kennel wall not published by the Kennel API yet' : 'error ' + r.status };
    const j = await r.json(); if (!Array.isArray(j?.topDogs)) return { status: 'unknown', topDogs: [], wall: [], reason: 'unexpected response' };
    const wall = (Array.isArray(j.wall) ? j.wall : j.topDogs.map((d) => ({ ...d, tier: 'top' }))).map(entry).filter(Boolean).sort(byHeld).slice(0, 40);
    return { status: 'ok', topDogs: j.topDogs.map((d) => entry({ ...d, tier: 'top' })).filter(Boolean).sort(byHeld).slice(0, 40), wall, empty: j.empty || null, updatedAt: j.updatedAt || null }; }
  catch { return { status: 'unknown', topDogs: [], wall: [], reason: 'unreachable' }; } }
// ?kennel=alpha -> labelled tier preview; ?kennel=pup-locked (or &kflair=1) previews the Locked flair too.
export function overrideTier(search = (typeof location !== 'undefined' ? location.search : '')) { try { return tierId(String(new URLSearchParams(search).get('kennel') || '').replace(/-locked$/, '')); } catch { return null; } }
export function overrideFlair(search = (typeof location !== 'undefined' ? location.search : '')) { try { const q = new URLSearchParams(search); return q.get('kflair') === '1' || /-locked$/.test(q.get('kennel') || '') || q.get('kennel') === 'locked'; } catch { return false; } }
// ?kennelwallet=<address>: read-only look at a public wallet's Kennel status while signed out (labelled preview, never sent)
export function peekWallet(search = (typeof location !== 'undefined' ? location.search : '')) { try { const w = new URLSearchParams(search).get('kennelwallet'); return w && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(w) ? w : null; } catch { return null; } }
export const SHOW_KEY = 'inuverse.kennel.show';
export const showMine = (store = globalThis.localStorage) => { try { return store?.getItem(SHOW_KEY) !== '0'; } catch { return true; } };
export const setShowMine = (on, store = globalThis.localStorage) => { try { store?.setItem(SHOW_KEY, on ? '1' : '0'); } catch {} };
// what the local pup wears: preview override first (labelled), then the real tier + Locked flair; hidden when turned off.
// -> null | { tier: id|null, flair: bool, preview: bool }
export function myKennel({ override = null, overrideFlair: of = false, real = null, show = true, peek = false } = {}) { if (!show) return null;
  if (override || of) return { tier: override || null, flair: !!of, preview: true };
  if (real?.status !== 'ok') return null; const flair = real.locked?.flair === true;
  return real.tier || flair ? { tier: real.tier || null, flair, preview: !!peek } : null; }
// multiplayer: what we send (look.pl.look.kennel; the server strips it anyway) and what we trust from others (server-verified only)
export const lookKennel = (mine) => (mine && !mine.preview ? mine.tier : null);
export const remoteKennel = (r) => (r?.w ? tierId(r.kennel) : null);
export const remoteFlair = (r) => !!(r?.w && r.kflair === true);
export const remoteLook = (r) => { const tier = remoteKennel(r), flair = remoteFlair(r); return tier || flair ? { tier, flair, preview: false } : null; };

// ---- drawing (actor space: origin at the pup's feet, ctx already scaled 0.5) ----
export function drawAura(ctx, tier, t) { const T = TIERS[tier]; if (!T?.aura) return; ctx.save();
  if (T.aura === 'gold') { const p = 0.6 + 0.4 * Math.sin(t * 3);
    const g = ctx.createRadialGradient(0, -44, 8, 0, -44, 80); g.addColorStop(0, `rgba(255,214,90,${0.55 * p})`); g.addColorStop(0.6, `rgba(255,200,60,${0.25 * p})`); g.addColorStop(1, 'rgba(255,200,60,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -44, 70, 84, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(255,214,90,${0.7 + 0.3 * p})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 10, 34, 10, 0, 0, 7); ctx.stroke(); ctx.strokeStyle = 'rgba(140,96,20,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, 10, 38, 12, 0, 0, 7); ctx.stroke();
    for (let i = 0; i < 6; i++) { const a = t * 1.4 + i * 1.047, x = Math.cos(a) * 38, y = -44 + Math.sin(a) * 52, al = 0.6 + 0.4 * Math.sin(t * 5 + i); ctx.fillStyle = `rgba(255,236,150,${al})`; ctx.fillRect(Math.round(x) - 3, Math.round(y) - 1, 6, 2); ctx.fillRect(Math.round(x) - 1, Math.round(y) - 3, 2, 6); } }
  else { for (let i = 0; i < 6; i++) { const a = t * 0.9 + i * 1.047, x = Math.cos(a) * 34, y = 8 + Math.sin(a) * 11, al = 0.6 + 0.35 * Math.sin(t * 2.4 + i); paw(ctx, x, y, `rgba(160,120,255,${al})`); } }
  ctx.restore(); }
function paw(ctx, x, y, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, 7, 5.5, 0, 0, 7); ctx.fill(); for (const [dx, dy] of [[-7, -7], [-2.5, -10], [2.5, -10], [7, -7]]) { ctx.beginPath(); ctx.ellipse(x + dx, y + dy, 2.5, 3, 0, 0, 7); ctx.fill(); } }
// small tier tag (+ separate Locked flair padlock) drawn by art.js nameTag above the name (or above the Pack badge)
export function tagFor(tier, preview = false, flair = false) { const T = TIERS[tierId(tier)]; if (!T && !flair) return null;
  return { text: T ? (preview ? 'PREVIEW ' : '') + T.name.toUpperCase() : (preview ? 'PREVIEW' : null), color: T ? T.tag : FLAIR.tag, ink: T ? T.ink : FLAIR.ink, gold: !!T?.gold, flair: !!flair, flairColor: FLAIR.tag, flairInk: FLAIR.ink }; }
// pixel padlock (the kn_badge_locked flair); x,y = top-left of an 8x10 box
export function drawLock(ctx, x, y, col = FLAIR.ink) { ctx.fillStyle = col; ctx.fillRect(x + 2, y, 4, 1); ctx.fillRect(x + 1, y + 1, 1, 3); ctx.fillRect(x + 6, y + 1, 1, 3); ctx.fillRect(x, y + 4, 8, 6); ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x + 3, y + 6, 2, 2); }

// ---- panel ----
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shortW = (w) => w ? w.slice(0, 4) + '…' + w.slice(-4) : '?';
const fmt = (n) => Math.floor(Number(n) || 0).toLocaleString('en-US');
const fmtUp = (n) => Math.ceil(Number(n) || 0).toLocaleString('en-US');
export const sydDate = (d) => { const t = Date.parse(d); if (Number.isNaN(t)) return ''; try { return new Date(t).toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', day: 'numeric', month: 'short', year: 'numeric' }); } catch { return String(d).slice(0, 10); } };
const days = (n) => { const d = Math.ceil(Number(n) || 0); return d <= 0 ? 'under a day' : d === 1 ? '1 day' : d + ' days'; };
const chip = (id) => `<span class="kn-chip" style="background:${TIERS[id].tag};color:${TIERS[id].ink};padding:0 4px;border-radius:3px">${TIERS[id].name}</span>`;
const flairChip = () => `<span class="kn-chip kn-flair" style="background:${FLAIR.tag};color:${FLAIR.ink};padding:0 4px;border-radius:3px">🔒 Locked</span>`;
// one-line progress summary from nextStep, e.g. "Pup in 5 days if held"
export function nextLine(me) { const n = me?.nextStep; if (!n) return me?.tier === 'top' ? 'Top Dog: the full Kennel look is yours while you keep holding.' : '';
  if (n.holding && n.reachDate) return `<b>${esc(n.name)} in ${days(n.needDays)} if held</b> (${esc(sydDate(n.reachDate))})`;
  return `Next: <b>${esc(n.name)}</b> needs ${fmtUp(n.needAmount)} more $KIBBLE held, then ${n.days} days in a row` + (n.reachDateIfHeldFromNow ? ` (${esc(sydDate(n.reachDateIfHeldFromNow))} at the earliest if you hold ${fmt(TIERS[n.id].amount)} from now)` : ''); }
export function progressHtml(me, now = Date.now()) { if (me?.status !== 'ok') return '';
  const rows = me.streaks.map((s) => { const pct = Math.round((s.earned ? 1 : s.progress) * 100);
    const note = s.earned ? 'earned ✓' : s.holding ? `day ${Math.min(s.days, Math.floor(s.daysHeld))} of ${s.days}${s.reachDate ? ` · ${esc(sydDate(s.reachDate))} if held` : ''}` : `hold ${fmt(s.amount)} for ${s.days} days`;
    const early = !s.earned && s.earliestPossible && Date.parse(s.earliestPossible) > now ? ` · not before ${esc(sydDate(s.earliestPossible))}` : '';
    return `<li class="kn-streak" data-tier="${s.id}">${chip(s.id)} <span class="small">${note}${early}</span><div style="height:4px;background:#0003;border-radius:2px;margin:2px 0 4px"><div style="height:4px;width:${pct}%;background:${TIERS[s.id].tag};border-radius:2px"></div></div></li>`; }).join('');
  const launch = now < Date.parse(EARLIEST_PUP) ? `<p class="small">$KIBBLE launched 15 Oct 2026, so long streaks can't exist yet: no wallet can reach Pup before 22 Oct 2026.</p>` : '';
  const hist = me.history && !me.history.complete ? `<p class="small">History only partly read${me.history.reason ? ` (${esc(me.history.reason)})` : ''}: streaks are counted conservatively, so they can only look shorter.</p>` : '';
  return `<div class="kn-progress"><p class="small kn-next">${nextLine(me)}</p>${rows ? `<ul class="small kn-streaks" style="list-style:none;padding:0;margin:4px 0">${rows}</ul>` : ''}${launch}${hist}<p class="small">Dates are Sydney time.</p></div>`; }
export function wallHtml({ wall, me, wallet, override, overrideFlair: of = false, show, peek = false, now = Date.now() }) {
  const tiers = TIER_IDS.map((id) => { const T = TIERS[id]; return `<li>${chip(id)} hold ${fmt(T.amount)} $KIBBLE for ${T.days} days in a row · ${id === 'top' ? 'gold aura, golden name, a spot on this wall' : id === 'alpha' ? 'paw-print aura + tag' : 'name tag'}</li>`; }).join('');
  const row = (d) => `<li><b>${d.tier === 'top' ? '★ ' : ''}${esc(d.label)}</b>${nameOf(d.wallet) ? ' ' + walletHtml(d.wallet).replace(/<b>[^<]*<\/b> /, '') : ''} ${chip(d.tier)}${d.lockedFlair ? ' ' + flairChip() : ''}${d.held ? ` <span class="small">${fmt(d.held)} $KIBBLE held</span>` : ''}${d.since ? ` <span class="small">since ${esc(sydDate(d.since))}</span>` : ''}</li>`;
  const others = wall?.status === 'ok' ? (wall.wall || []).filter((d) => d.tier !== 'top') : [];
  const dogs = wall?.status === 'ok' ? (wall.topDogs.length ? `<ol class="kn-wall">${wall.topDogs.map(row).join('')}</ol>` : `<p class="small kn-empty">${esc(wall.empty || 'No Top Dogs yet')}. The first verified Top Dog shows up here.</p>`)
      + (others.length ? `<p class="small" style="margin:8px 0 2px"><b>Kennel members</b> (verified tiers, ranked by $KIBBLE held)</p><ol class="kn-wall">${others.slice(0, 20).map(row).join('')}</ol>` : '')
    : `<p class="small kn-soon">Kennel members will be listed here once the Kibble Kennel publishes its wall${wall?.reason ? ` (${esc(wall.reason)})` : ''}. Nobody is shown until it does.</p>`;
  const who = peek && wallet ? `Viewing <b>${esc(nameOf(wallet) ? walletText(wallet) : shortW(wallet))}</b> (read-only preview, not your pup). ` : '';
  const mine = override || of ? `Previewing <b>${override ? esc(TIERS[override].name) : 'no tier'}${of ? ' + Locked flair' : ''}</b> (preview only, not a real tier).` : !wallet ? 'Connect your wallet to show your Kennel tier on your pup.'
    : me?.status === 'ok' ? who + (me.source === 'holder-only' ? 'No chain data right now, so no tier is shown.' : (me.tier ? `Your tier: ${chip(me.tier)}` : 'No Kennel tier on this wallet yet.') + (me.locked?.flair ? ' ' + flairChip() : '') + (me.stale ? ' (cached)' : '')
        + (me.held ? ` <span class="small">· ${fmt(me.held)} $KIBBLE held now</span>` : '') + (me.locked?.flair ? `<br>Locked flair: ${fmt(me.locked.amount)} $KIBBLE in your own self-lock${me.locked.unlockDate ? ` until ${esc(sydDate(me.locked.unlockDate))}` : ''}. It is a badge only and does not change your tier.` : '')) + progressHtml(me, now)
    : `${who}Kennel tier: unknown (${esc(me?.reason || 'not checked yet')}).`;
  return `<h2>Kibble Kennel wall</h2><p class="sub">Kennel members, ranked by $KIBBLE held. Cosmetics only: no rewards, no yield, no stat changes.</p>
  <div class="card" style="text-align:left"><b>Top Dogs</b>${dogs}</div>
  <div class="card kn-mine" style="text-align:left"><div class="small">${mine}</div><label class="small kn-toggle"><input type="checkbox" id="kn-show" ${show ? 'checked' : ''}> Show my Kennel look (others see it too)</label></div>
  <details class="card" style="text-align:left"><summary><b>How tiers work</b></summary><p class="small">Tiers come from hold streaks and are free: keep at least a tier's $KIBBLE in your own wallet for its number of days in a row. Dipping below a tier's amount restarts that tier's streak only. No lock and no SOL needed.</p><ul class="small kn-tiers">${tiers}</ul>
  <p class="small">$KIBBLE launched 15 Oct 2026, so long streaks can't exist yet: nobody can reach Pup before 22 Oct 2026.</p>
  <p class="small">${flairChip()} is a separate, optional flair: a Streamflow self-lock of at least ${fmt(FLAIR.minAmount)} $KIBBLE (made in Inu Empires' Kibble Kennel) adds a padlock badge. It never sets or raises a tier. Locked tokens stay in the lock until its unlock date.</p>
  <p class="small">Inu Verse never holds or moves tokens; it only reads your Kennel status.</p></details>
  <div class="nfa">Not financial advice. Kennel tiers and flairs are cosmetic.</div>`; }

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
      c.font = '5px Silkscreen, monospace'; c.fillStyle = d ? '#3a2a06' : STONE_L; c.fillText(d ? '★ ' + String(d.label || shortW(d.wallet)).slice(0, 11) : '· · ·', px + pw / 2, py + 9); if (d?.lockedFlair) drawLock(c, px + pw - 9, py + 3, '#3a2a06'); }
    if (wall?.status !== 'ok' || !dogs.length) { const sw = 70, sx = x + w / 2 - sw / 2, sy = top + 34; R(c, sx - 1, sy - 1, sw + 2, 13, INK); R(c, sx, sy, sw, 11, CREAM); c.font = '5px Silkscreen, monospace'; c.fillStyle = INK; c.fillText(wall?.status === 'ok' ? 'NO TOP DOGS YET' : 'OPENS SOON', x + w / 2, sy + 6); }
    const s = 0.5 + 0.5 * Math.sin(t * 2); c.fillStyle = `rgba(255,226,122,${0.25 + 0.3 * s})`; c.fillRect(Math.round(x + w / 2 - 3), Math.round(top - 8), 6, 6); // little gold lamp
  } }]; }

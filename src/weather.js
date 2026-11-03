// "Alive" phase 1: a shared sky clock, deterministic weather, pooled + capped rain/firefly particles and the HUD sky icon.
// Purely cosmetic: nothing here touches the economy clock (state.clockSec / DAY_LEN days), saves or the network.
// - Sky clock: one in-game day every SKY_DAY_MS (24 real minutes), phase derived from the wall clock, so every
//   player sees roughly the same time of day (same hour on every client within clock skew).
// - Weather: clear / cloudy / rain, picked from a hash of the UTC date + hour, so everyone shares the same sky.
// - Perf: rain drops, splashes and fireflies live in fixed preallocated pools (no per-frame allocation) with hard caps;
//   a reduced-effects path (prefers-reduced-motion, ?fx=low, localStorage 'inuverse.fx'='low', or sustained slow
//   frames) cuts particle counts and motion; nothing steps while the tab is hidden.
// - Debug (visual only): ?tod=dawn|day|dusk|night pins the sky, ?wx=clear|cloudy|rain pins the weather.
import { TILE, MAP_W, MAP_H, MAP, T } from './world.js';

export const SKY_DAY_MS = 24 * 60 * 1000;
export const TODS = ['dawn', 'day', 'dusk', 'night'];
export const WXS = ['clear', 'cloudy', 'rain'];
export const TOD_PIN = { dawn: 6.2, day: 12, dusk: 19, night: 22.5 }; // hour shown when ?tod= pins a phase
export const CAPS = { rain: 120, splash: 24, fireflies: 30 };
export const LOW_CAPS = { rain: 45, splash: 0, fireflies: 12 };
export const WX_ODDS = { rain: 0.18, cloudy: 0.32 }; // per hour: 18% rain, 32% cloudy, 50% clear

// ---------- clock ----------
// in-game hour 0..24 for a wall-clock time (ms since epoch)
export const skyHour = (nowMs) => ((((nowMs % SKY_DAY_MS) + SKY_DAY_MS) % SKY_DAY_MS) / SKY_DAY_MS) * 24;
// the ambient.dayPhase() time value (seconds of a dayLen-second day, starting at 09:00) for that wall-clock time.
// Monotonic in nowMs so hour-scheduled systems (president visits, town plans) never see time run backwards.
export const skyWorldT = (nowMs, dayLen = 720) => (nowMs / SKY_DAY_MS) * dayLen - (9 / 24) * dayLen;
export function todOf(hour) { const h = ((hour % 24) + 24) % 24; // same bands as ambient.dayPhase (sunset == dusk)
  if (h >= 5 && h < 7) return 'dawn'; if (h >= 7 && h < 17) return 'day'; if (h >= 17 && h < 19.5) return 'dusk'; return 'night'; }

// ---------- weather ----------
function hash32(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
export const weatherKey = (nowMs) => { const d = new Date(nowMs); return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}-${d.getUTCHours()}`; };
export function weatherKind(nowMs) { const r = hash32('inu-wx:' + weatherKey(nowMs)); return r < WX_ODDS.rain ? 'rain' : r < WX_ODDS.rain + WX_ODDS.cloudy ? 'cloudy' : 'clear'; }
export const weatherVals = (kind) => ({ kind, rain: kind === 'rain' ? 1 : 0, cloud: kind === 'clear' ? 0 : 1 });
export const weatherAt = (nowMs) => weatherVals(weatherKind(nowMs));

// ---------- debug / settings ----------
export function parseSkyParams(search = '') { const q = new URLSearchParams(search), tod = q.get('tod'), wx = q.get('wx'), fx = q.get('fx');
  return { tod: TODS.includes(tod) ? tod : null, wx: WXS.includes(wx) ? wx : null, low: fx === 'low' }; }
let LOW_SAVED; const lowSaved = () => { if (LOW_SAVED === undefined) { try { LOW_SAVED = globalThis.localStorage?.getItem('inuverse.fx') === 'low'; } catch { LOW_SAVED = false; } } return LOW_SAVED; };
export const capsFor = (low) => (low ? LOW_CAPS : CAPS);

// ---------- particle pools ----------
export function makeSky(rand = Math.random) { const S = { t: 0, ema: 1 / 60, slow: false, low: false, rand,
  drops: Array.from({ length: CAPS.rain }, () => ({ x: 0, y: -1e4, ty: 0, sp: 0, far: false })), active: 0,
  splashes: Array.from({ length: CAPS.splash }, () => ({ x: 0, y: 0, life: 0 })), vw: 0, vh: 0 };
  return S; }
// lowFx: reduced-motion / explicit low setting / auto (sustained frames slower than ~36 fps)
export function lowFx(S, { reduced = false, flag = false } = {}) { return !!(reduced || flag || lowSaved() || S?.slow); }
function respawn(S, d, vw, vh, scatter) { const r = S.rand; d.far = r() < 0.35; d.x = r() * (vw + 60) - 30; d.ty = r() * (vh + 20); const fall = 70 + r() * 120;
  d.y = scatter ? d.ty - r() * fall : d.ty - fall; d.sp = (d.far ? 380 : 620) + r() * 160; }
// steps the pools; returns the number of live drops. intensity 0..1 (amb.rain).
export function stepSky(S, dt, intensity, vw, vh, opts = {}) {
  if (opts.hidden ?? globalThis.document?.hidden) return S.active; // tab hidden: freeze, spend nothing
  S.t += dt; S.ema += (dt - S.ema) * 0.02; if (S.ema > 1 / 36) S.slow = true; else if (S.ema < 1 / 52) S.slow = false;
  S.low = lowFx(S, opts); const cap = capsFor(S.low), want = Math.min(cap.rain, S.drops.length, Math.floor(cap.rain * Math.max(0, Math.min(1, intensity))));
  const resized = S.vw !== vw || S.vh !== vh; S.vw = vw; S.vh = vh;
  for (let i = 0; i < want; i++) { const d = S.drops[i]; if (i >= S.active || resized || d.y < -1e3) respawn(S, d, vw, vh, true); }
  S.active = want; const wind = 40;
  for (let i = 0; i < S.active; i++) { const d = S.drops[i]; d.y += d.sp * dt; d.x += wind * dt * (d.far ? 0.6 : 1);
    if (d.y >= d.ty) { if (!d.far && cap.splash) for (let k = 0; k < cap.splash; k++) { const s = S.splashes[k]; if (s.life <= 0) { s.x = d.x; s.y = d.ty; s.life = 1; break; } } respawn(S, d, vw, vh, false); } }
  for (let k = 0; k < S.splashes.length; k++) { const s = S.splashes[k]; if (s.life > 0) s.life -= dt * 3.2; }
  return S.active; }
export const liveSplashes = (S) => S.splashes.reduce((n, s) => n + (s.life > 0), 0);
// screen-space chunky pixel rain (drawn after the colour grade)
export function drawSky(c, S, intensity) { if (!S || S.active <= 0 || intensity <= 0.02) return;
  const a = Math.min(1, intensity); c.fillStyle = `rgba(160,182,236,${a * 0.38})`;
  for (let i = 0; i < S.active; i++) { const d = S.drops[i]; if (!d.far) continue; const x = Math.round(d.x), y = Math.round(d.y); c.fillRect(x, y, 1, 3); c.fillRect(x - 1, y + 3, 1, 3); }
  c.fillStyle = `rgba(214,228,255,${a * 0.62})`;
  for (let i = 0; i < S.active; i++) { const d = S.drops[i]; if (d.far) continue; const x = Math.round(d.x), y = Math.round(d.y); c.fillRect(x, y, 1, 4); c.fillRect(x - 1, y + 4, 1, 4); c.fillRect(x - 2, y + 8, 1, 3); }
  for (let k = 0; k < S.splashes.length; k++) { const s = S.splashes[k]; if (s.life <= 0) continue; const r = 1 + Math.floor((1 - s.life) * 4), x = Math.round(s.x), y = Math.round(s.y);
    c.fillStyle = `rgba(220,235,255,${s.life * 0.65 * a})`; c.fillRect(x - r, y, 1, 1); c.fillRect(x + r, y, 1, 1); c.fillRect(x - r + 1, y - 1, r * 2 - 1, 1); } }

// ---------- fireflies: only over grass / flower beds near trees (parks), at most CAPS.fireflies ----------
const tileAt = (x, y) => (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H ? -1 : MAP[y][x]);
export const isParkTile = (x, y) => { const t = tileAt(x, y); if (t !== T.GRASS && t !== T.FLOWER) return false;
  for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const n = tileAt(x + i, y + j); if (n === T.TREE || n === T.FLOWER) return true; } return false; };
// a few small swarms (6 each) so a park at night actually twinkles, instead of 30 lone dots across the whole map
export const SWARM = 6;
export function fireflySpots(rng, n = CAPS.fireflies) { const out = [], cap = Math.min(n, CAPS.fireflies), centers = [];
  for (let k = 0; k < 8000 && centers.length < Math.ceil(cap / SWARM); k++) { const x = 2 + Math.floor(rng() * (MAP_W - 4)), y = 2 + Math.floor(rng() * (MAP_H - 4));
    if (isParkTile(x, y) && centers.every(([a, b]) => Math.abs(a - x) + Math.abs(b - y) > 14)) centers.push([x, y]); }
  for (const [cx, cy] of centers) for (let k = 0, got = 0; k < 400 && got < SWARM && out.length < cap; k++) { const x = cx + Math.floor(rng() * 9) - 4, y = cy + Math.floor(rng() * 7) - 3;
    if (isParkTile(x, y)) { got++; out.push({ x: (x + rng()) * TILE, y: (y + rng()) * TILE, p: rng() * 9, tx: x, ty: y }); } }
  return out; }

// drawn in screen space after the night grade (additive), culled to the view; reduced = fewer, no drift, slow steady glow
export function drawFireflies(c, list, t, dark, ox, oy, vw, vh, reduced = false) { if (!list?.length) return 0; const k = Math.min(1, dark / 0.62), n = Math.min(list.length, reduced ? LOW_CAPS.fireflies : CAPS.fireflies); let drawn = 0;
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) { const f = list[i], x = Math.round(f.x + ox + (reduced ? 0 : Math.sin(t * 0.5 + f.p) * 20)), y = Math.round(f.y + oy + (reduced ? 0 : Math.cos(t * 0.4 + f.p) * 14));
    if (x < -8 || y < -8 || x > vw + 8 || y > vh + 8) continue; const a = (reduced ? 0.75 : 0.25 + 0.75 * Math.max(0, Math.sin(t * 2 + f.p * 3))) * k; drawn++;
    c.fillStyle = `rgba(150,220,80,${a * 0.16})`; c.fillRect(x - 3, y - 3, 8, 8); c.fillStyle = `rgba(200,255,110,${a * 0.4})`; c.fillRect(x - 2, y, 6, 2); c.fillRect(x, y - 2, 2, 6); c.fillStyle = `rgba(250,255,190,${a})`; c.fillRect(x, y, 2, 2); }
  c.restore(); return drawn; }

// ---------- HUD sky icon (12x12 native pixels, navy + gold palette) ----------
const PAL = { gold: '#f2cc68', goldd: '#c9a23a', cream: '#f6efe0', moon: '#e8e2c8', cloud: '#c8d0e4', cloudd: '#8a94b0', rain: '#7fb4ff', pink: '#f59ab8', ink: '#141a2e' };
export function drawSkyIcon(c, tod, wx) { const P = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); }; c.clearRect(0, 0, 12, 12);
  if (tod === 'night') { P(3, 1, 5, 1, PAL.moon); P(2, 2, 3, 6, PAL.moon); P(3, 8, 5, 1, PAL.moon); P(5, 2, 1, 1, PAL.moon); P(8, 7, 1, 1, PAL.moon); P(9, 1, 1, 1, PAL.gold); P(10, 4, 1, 1, PAL.cream); }
  else if (tod === 'dawn' || tod === 'dusk') { P(0, 8, 12, 1, PAL.goldd); P(3, 5, 6, 3, tod === 'dusk' ? '#f0905a' : PAL.gold); P(4, 4, 4, 1, tod === 'dusk' ? '#f0905a' : PAL.gold); P(1, 6, 1, 1, PAL.pink); P(10, 6, 1, 1, PAL.pink); P(5, 1, 2, 2, PAL.gold); }
  else { P(3, 3, 6, 6, PAL.gold); P(4, 2, 4, 8, PAL.gold); P(2, 4, 8, 4, PAL.gold); P(5, 0, 2, 1, PAL.gold); P(5, 11, 2, 1, PAL.gold); P(0, 5, 1, 2, PAL.gold); P(11, 5, 1, 2, PAL.gold); P(4, 4, 2, 2, PAL.cream); }
  if (wx === 'cloudy' || wx === 'rain') { P(3, 5, 8, 3, PAL.cloud); P(5, 4, 4, 1, PAL.cloud); P(2, 6, 1, 2, PAL.cloud); P(3, 8, 8, 1, PAL.cloudd); }
  if (wx === 'rain') { P(4, 10, 1, 2, PAL.rain); P(7, 10, 1, 2, PAL.rain); P(10, 9, 1, 2, PAL.rain); } }
// updates the #clock chip in place; touches the DOM only when the minute/phase/weather changes
export function updateSkyHud(el, { hour, tod, wx, season }) { if (!el) return false;
  const txt = `${String(Math.floor(hour)).padStart(2, '0')}:${String(Math.floor((hour % 1) * 60)).padStart(2, '0')} ${tod}${season ? ' · ' + season : ''}`, key = txt + '|' + wx;
  if (el._sky === key) return false; el._sky = key;
  let cv = el.querySelector('canvas.skyic'), sp = el.querySelector('span.skytx');
  if (!cv || !sp) { el.textContent = ''; cv = document.createElement('canvas'); cv.width = 12; cv.height = 12; cv.className = 'skyic'; cv.setAttribute('aria-hidden', 'true'); sp = document.createElement('span'); sp.className = 'skytx'; el.append(cv, sp); }
  if (el._skyIc !== tod + wx) { el._skyIc = tod + wx; drawSkyIcon(cv.getContext('2d'), tod, wx); }
  sp.textContent = txt; el.title = `${tod[0].toUpperCase() + tod.slice(1)} · ${wx}`; el.dataset.tod = tod; el.dataset.wx = wx; return true; }

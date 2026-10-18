// Launchpad coin ads: the live top-trending Launch Hall coins are advertised around the city.
// Real coins: $KIBBLE + player-registered pump.fun coins (live 24h change from DexScreener, '—' when unavailable).
// Slots are world-space rects; tapping one opens that coin in Launch Hall.
import { TILE, BUILDINGS, MALL_BUILDINGS } from './world.js';
import { price } from './curve.js';
import { drawSeal } from './verified.js'; // Verified Launch seal: only on coins whose creator opted in AND all four checks passed
const T = TILE;
export const WINDOW = 30; // history points used for % change
export function pctChange(tok, n = WINDOW) { const h = tok.history || []; if (h.length < 2) return 0; const a = h[Math.max(0, h.length - 1 - n)].p, b = price(tok.curve); return a > 0 ? (b / a - 1) * 100 : 0; }
// rank by % change, ties broken by recent trade count; returns ad-ready coin views
export function trending(state, n = 6) {
  return (state.tokens || []).map((t) => ({ id: t.id, ticker: t.ticker, name: t.name, color: t.color, pct: pctChange(t), heat: (t.trades || []).length }))
    .sort((a, b) => b.pct - a.pct || b.heat - a.heat).slice(0, n);
}
const LAUNCH = BUILDINGS.find((b) => b.id === 'launch'), MALL = MALL_BUILDINGS.find((b) => b.id === 'mall');
export const AD_SLOTS = [
  { id: 'bb1', kind: 'billboard', x: 41 * T, y: 44.3 * T, w: 192, h: 44, rank: 0, crew: true },
  { id: 'bb2', kind: 'billboard', x: 3 * T, y: 44.3 * T, w: 192, h: 44, rank: 1 },
  { id: 'trend', kind: 'sign', x: (LAUNCH.x + 2) * T, y: LAUNCH.y * T + 110, w: 8 * T, h: 14, rank: 0, list: true, depth: (LAUNCH.y + LAUNCH.h) * T + 1 },
  ...BUILDINGS.filter((b) => b.id !== 'launch').map((b, i) => ({ id: 'ban-' + b.id, kind: 'banner', x: b.x * T + 6, y: (b.y + 2) * T, w: 18, h: 42, rank: i % 4, depth: (b.y + b.h) * T + 1 })),
  ...MALL_BUILDINGS.filter((b) => !['mall', 'office'].includes(b.id)).map((b, i) => ({ id: 'sign-' + b.id, kind: 'sign', x: (b.x + b.w) * T - 54, y: (b.y + b.h) * T - 58, w: 46, h: 18, rank: (i + 1) % 5, depth: (b.y + b.h) * T + 1 })),
  { id: 'facade', kind: 'facade', x: (MALL.x + 3) * T, y: MALL.y * T + 146, w: (MALL.w - 6) * T, h: 14, rank: 0, list: true, depth: (MALL.y + MALL.h) * T + 1 },
  ...[[29, 60], [35, 60], [29, 69], [35, 69]].map(([x, y], i) => ({ id: `flag${i}`, kind: 'flag', x: x * T + 20, y: y * T - 14, w: 26, h: 16, rank: i % 3, depth: y * T + 30 })),
];
export function coinFor(slot, trend, rot = 0, crewIdx = 0, featured) { if (featured?.[slot.id]) { const t = trend.find((c) => c.ticker === featured[slot.id].ticker) || { ticker: featured[slot.id].ticker, name: 'Featured', color: '#ffcf3a', pct: 0 }; return { ...t, featured: true, sponsored: !!featured[slot.id].sponsored, by: featured[slot.id].by }; }
  if (!trend.length) return null; return trend[(slot.rank + rot + (slot.crew ? crewIdx : 0)) % trend.length]; }
export function adAt(trend, rot, crewIdx, wx, wy) { for (const s of AD_SLOTS) if (wx >= s.x && wx <= s.x + s.w && wy >= s.y && wy <= s.y + s.h) { const c = s.list ? trend[Math.min(trend.length - 1, Math.floor(((wx - s.x) / s.w) * Math.min(3, trend.length)))] : coinFor(s, trend, rot, crewIdx); if (c) return { slot: s.id, coin: c }; } return null; }
const pctTxt = (p) => p == null ? '—' : (p >= 0 ? '+' : '') + p.toFixed(1) + '%';
const pcol = (p) => p == null ? '#b8bccc' : p >= 0 ? '#5df07a' : '#ff6a6a';
function hash(s) { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }
export function drawLogo(c, x, y, r, coin) { // generated logo: coin colour disc, hashed pixel glyph, ticker initial
  c.fillStyle = '#141a2e'; c.fillRect(x - r - 1, y - r - 1, 2 * r + 2, 2 * r + 2); c.fillStyle = coin.color; c.fillRect(x - r, y - r, 2 * r, 2 * r);
  const h = hash(coin.ticker), u = Math.max(1, Math.floor(r / 3)); c.fillStyle = 'rgba(255,255,255,.35)';
  for (let i = 0; i < 9; i++) if ((h >> i) & 1) { const gx = i % 3, gy = Math.floor(i / 3); c.fillRect(x - r + gx * u * 2 / 3 * 2, y - r + gy * u * 2 / 3 * 2, u, u); }
  c.fillStyle = '#fff'; c.font = `${Math.max(5, Math.round(r * 1.2))}px Silkscreen, monospace`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(coin.ticker[0] || '?', x, y + 0.5); c.textBaseline = 'alphabetic'; }
function glowOn(c, night, col) { if (night) { c.shadowColor = col; c.shadowBlur = 10; } }
export function drawAd(c, s, trend, rot, crewIdx, night, t, featured) {
  const coin = coinFor(s, trend, rot, crewIdx, featured); if (!coin) return; const pc = pcol(coin.pct);
  c.save(); c.textAlign = 'center';
  if (s.kind === 'billboard') { c.fillStyle = '#4a4f5e'; c.fillRect(s.x + 20, s.y + 34, 6, 30); c.fillRect(s.x + s.w - 26, s.y + 34, 6, 30);
    glowOn(c, night, coin.color); c.fillStyle = '#1b1f33'; c.fillRect(s.x, s.y - 6, s.w, s.h); c.shadowBlur = 0; c.fillStyle = night ? '#232a4a' : '#f7f1df'; c.fillRect(s.x + 4, s.y - 2, s.w - 8, s.h - 8);
    c.fillStyle = coin.color; c.fillRect(s.x + 4, s.y - 2, 6, s.h - 8); drawLogo(c, s.x + 28, s.y + 16, 13, coin);
    c.textAlign = 'left'; c.fillStyle = night ? '#fff' : '#141a2e'; c.font = '10px Silkscreen, monospace'; c.fillText('$' + coin.ticker, s.x + 48, s.y + 12);
    c.font = '6px Silkscreen, monospace'; c.fillText(coin.name.slice(0, 18) + (coin.fixture ? ' · TEST FIXTURE' : coin.real ? ' · live on pump.fun' : ' · Launch Hall'), s.x + 48, s.y + 24, s.w - 56); c.fillStyle = pc; c.font = '9px Silkscreen, monospace'; c.textAlign = 'right'; c.fillText(pctTxt(coin.pct), s.x + s.w - 8, s.y + 12);
    c.fillStyle = night ? '#ffcf3a' : '#8a6a1a'; c.font = '5px Silkscreen, monospace'; c.fillText(coin.sponsored ? 'SPONSORED · PAID TO TREASURY' : coin.featured ? 'FEATURED · PAID TO TREASURY' : coin.verified ? 'VERIFIED LAUNCH · TAP FOR CHECKS' : coin.real ? 'TAP FOR LINKS · NOT ADVICE' : 'PRACTICE (PLAY TOKENS)', s.x + s.w - 8, s.y + 32);
    if (coin.verified) drawSeal(c, s.x + 39, s.y + 5, 5);
    if (coin.featured) { c.fillStyle = '#ffcf3a'; c.fillRect(s.x + s.w - 70, s.y - 14, 66, 12); c.fillStyle = '#141a2e'; c.font = '6px Silkscreen, monospace'; c.textAlign = 'center'; c.fillText('FEATURED', s.x + s.w - 37, s.y - 5); } }
  else if (s.kind === 'banner') { c.fillStyle = '#c9a23a'; c.fillRect(s.x - 2, s.y - 2, s.w + 4, 3); glowOn(c, night, coin.color); c.fillStyle = coin.color; c.fillRect(s.x, s.y, s.w, s.h - 6); c.shadowBlur = 0;
    c.beginPath(); c.moveTo(s.x, s.y + s.h - 6); c.lineTo(s.x + s.w / 2, s.y + s.h); c.lineTo(s.x + s.w, s.y + s.h - 6); c.fill(); drawLogo(c, s.x + s.w / 2, s.y + 9, 6, coin);
    c.fillStyle = '#fff'; c.font = '5px Silkscreen, monospace'; c.fillText(coin.ticker.slice(0, 4), s.x + s.w / 2, s.y + 24); c.fillStyle = '#141a2e'; c.fillRect(s.x + 1, s.y + 27, s.w - 2, 7); c.fillStyle = pc; c.font = '4px Silkscreen, monospace'; c.fillText(pctTxt(coin.pct), s.x + s.w / 2, s.y + 32.5); if (coin.verified) drawSeal(c, s.x + s.w, s.y + 2, 3.5); }
  else if (s.kind === 'flag') { c.fillStyle = '#9c7424'; c.fillRect(s.x - 2, s.y - 2, 2, s.h + 6); const wv = Math.sin(t * 3 + s.x) * 1.5; glowOn(c, night, coin.color);
    c.fillStyle = coin.color; c.beginPath(); c.moveTo(s.x, s.y); c.lineTo(s.x + s.w, s.y + wv); c.lineTo(s.x + s.w, s.y + s.h + wv); c.lineTo(s.x, s.y + s.h); c.fill(); c.shadowBlur = 0; c.fillStyle = '#fff'; c.font = '5px Silkscreen, monospace'; c.fillText(coin.ticker.slice(0, 5), s.x + s.w / 2, s.y + 7 + wv / 2); c.fillStyle = pc; c.font = '4px Silkscreen, monospace'; c.fillText(pctTxt(coin.pct), s.x + s.w / 2, s.y + 13 + wv / 2); if (coin.verified) drawSeal(c, s.x + s.w, s.y + wv, 3); }
  else if (s.list) { // Launch Hall trending sign + mall facade LED ticker: top 3 side by side
    glowOn(c, night, '#ffcf3a'); c.fillStyle = '#141a2e'; c.fillRect(s.x - 2, s.y - 2, s.w + 4, s.h + 4); c.shadowBlur = 0; c.fillStyle = '#c9a23a'; c.fillRect(s.x - 2, s.y - 2, s.w + 4, 1); c.fillRect(s.x - 2, s.y + s.h + 1, s.w + 4, 1);
    const k = Math.min(3, trend.length), cw = s.w / k; for (let i = 0; i < k; i++) { const q = trend[i], x0 = s.x + i * cw; drawLogo(c, x0 + 9, s.y + s.h / 2, 5, q);
      c.textAlign = 'left'; c.fillStyle = night ? '#ffe7a3' : '#fff'; c.font = '5px Silkscreen, monospace'; c.fillText(`${i + 1}.$${q.ticker}`, x0 + 17, s.y + s.h / 2 + 2.5); if (q.verified) drawSeal(c, x0 + cw - 30, s.y + s.h / 2, 3); c.fillStyle = pcol(q.pct); c.textAlign = 'right'; c.fillText(pctTxt(q.pct), x0 + cw - 4, s.y + s.h / 2 + 2.5); } }
  else { glowOn(c, night, coin.color); c.fillStyle = '#141a2e'; c.fillRect(s.x, s.y, s.w, s.h); c.shadowBlur = 0; c.fillStyle = '#c9a23a'; c.fillRect(s.x + 8, s.y - 5, 1, 5); c.fillRect(s.x + s.w - 9, s.y - 5, 1, 5);
    drawLogo(c, s.x + 8, s.y + s.h / 2, 5, coin); c.textAlign = 'left'; c.fillStyle = '#fff'; c.font = '5px Silkscreen, monospace'; c.fillText('$' + coin.ticker, s.x + 15, s.y + 8); c.fillStyle = pc; c.fillText(pctTxt(coin.pct), s.x + 15, s.y + 15); if (coin.verified) drawSeal(c, s.x + s.w - 6, s.y + s.h / 2, 4); }
  c.restore(); }
export function adProps(trend, rot, crewIdx, night, t, featured) { return AD_SLOTS.map((s) => ({ y: s.depth ?? s.y + s.h + 30, d: (c) => drawAd(c, s, trend, rot, crewIdx, night, t, featured) })); }

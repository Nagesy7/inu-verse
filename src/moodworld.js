// Kibble Mood in the Inu Verse plaza: Kibble statue (glows by mood, tap for the price card), town crier (announces each mood
// change once), The Daily Bone newsstand, fire pit, mood banners, a light weather overlay and NPC mood touches.
// Data comes from src/kibblemood.js (shared with kibble-pay's /kibble-mood.js). Cosmetic only: no buttons that trade anything.
import { TILE, KIBBLE_PLAZA as KP } from './world.js';
import { MOODS, LINES, HEADLINES, CRIER, BANNER, COPY, MINT, lineFor, headlineFor, moodLedger, FALLBACK } from './kibblemood.js';
const INK = '#0c1022', NAVY = '#121a36', GOLD = '#d4a640', GOLD_L = '#f2cc68', GOLD_D = '#8f6a22', CREAM = '#fff6e0', STONE = '#8a8296', STONE_D = '#5e5870', STONE_L = '#b4acc0', WOOD = '#8a5a30', WOOD_D = '#5a3820', WOOD_L = '#b07a48';
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const FONT = 'Silkscreen, monospace';
export const CRIER_NAME = 'Crier Barkley';
export const CRIER_OUTFIT = { hat: 'top_hat', top: 'suit_navy', bottom: 'slacks_navy', neck: 'bowtie', feet: 'loafers' };
export const tileC = (t) => (t + 0.5) * TILE;

// ---- state shared with main.js ----
export const MW = { mood: FALLBACK, data: null, since: 0, ledger: moodLedger(), announced: null, flash: 0 };
export function setMood(m, t) { if (m.mood !== MW.mood) MW.since = t; MW.mood = m.mood; MW.data = m; }

// ---- crier: announce each mood change once (persisted, so reloads don't repeat it) ----
const LSK = 'inuverse.crier.lastMood';
export function shouldAnnounce(mood, { store = globalThis.localStorage, override = false } = {}) {
  if (override) { if (MW.announced === mood) return false; MW.announced = mood; return true; }
  let last = null; try { last = store?.getItem(LSK); } catch {} if (last === mood) return false;
  try { store?.setItem(LSK, mood); } catch {} MW.announced = mood; return true; }
export const crierLine = (mood) => CRIER[mood] || CRIER[FALLBACK];

// ---- NPC touches ----
// hop (zoomies bounce), wag (happy/zoomies), umbrella (grumpy/doghouse), zz (chill idle naps)
export function npcMood(mood, n, t, i = 0) {
  const o = { hop: 0, wag: 0, umbrella: false, zz: false };
  if (mood === 'zoomies') { o.hop = Math.abs(Math.sin(t * 9 + i * 1.7)) * 5; o.wag = 1; }
  else if (mood === 'happy') o.wag = 1;
  else if (mood === 'grumpy') o.umbrella = i % 3 !== 2;
  else if (mood === 'doghouse') o.umbrella = true;
  else if (mood === 'chill') o.zz = !n.moving && i % 2 === 0;
  return o; }
// doghouse: NPCs huddle around the fire pit (tile goals around it)
export const HUDDLE = [[-1, 0], [1, 0], [0, 1], [-1, 1], [1, 1], [0, -1]].map(([dx, dy]) => [KP.firepit.x + dx, KP.firepit.y + dy]);
export const huddleGoal = (mood, i) => mood === 'doghouse' ? HUDDLE[i % HUDDLE.length] : null;
// a mood line for an NPC: at most one per NPC per visit
export const moodLine = (name, rng) => MW.ledger.take(name, MW.mood, rng);

export function drawUmbrella(c, t, i = 0) { // drawn in actor space (scale 0.5 already applied, origin at feet)
  const sway = Math.round(Math.sin(t * 2 + i) * 2), cols = ['#c8323c', '#2f6fbd', '#e3b341', '#4f9a4a'], col = cols[i % cols.length];
  R(c, 18 + sway, -118, 3, 70, '#3a2a1a'); c.fillStyle = INK; c.beginPath(); c.ellipse(19 + sway, -118, 40, 18, 0, Math.PI, 0); c.fill();
  c.fillStyle = col; c.beginPath(); c.ellipse(19 + sway, -118, 37, 15, 0, Math.PI, 0); c.fill();
  c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.ellipse(9 + sway, -124, 12, 6, -0.3, Math.PI, 0); c.fill();
  R(c, 16 + sway, -136, 6, 6, INK); }
export function drawZz(c, t) { c.save(); c.font = `16px ${FONT}`; c.textAlign = 'center'; const k = (t * 0.8) % 1; c.globalAlpha = 1 - k; c.fillStyle = CREAM; c.strokeStyle = INK; c.lineWidth = 3;
  c.strokeText('z', 22 + k * 10, -100 - k * 20); c.fillText('z', 22 + k * 10, -100 - k * 20); c.font = `11px ${FONT}`; c.strokeText('z', 34 + k * 8, -118 - k * 18); c.fillText('z', 34 + k * 8, -118 - k * 18); c.restore(); }

// ---- statue (golden Shiba on a kibble-bowl pedestal), glow by mood ----
let statueCv = null;
function statueSprite(drawShiba, ready) { if (statueCv && statueCv.ok) return statueCv; if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas'); cv.width = 160; cv.height = 170; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
  x.filter = 'sepia(1) saturate(2.6) brightness(1.08)'; drawShiba(x, 80, 150, { art: 'shiba-golden', coat: 'golden', scale: 1.4, shadow: false }); x.filter = 'none';
  cv.ok = !!ready; statueCv = cv; return cv; }
export function statueProps(t, { drawShiba, artLoaded }) {
  const s = KP.statue, x0 = s.x * TILE, base = (s.y + 1) * TILE, cx = x0 + s.w * TILE / 2, mood = MW.mood, M = MOODS[mood] || MOODS.chill;
  return [{ y: base - 2, d: (c) => {
    // glow (additive) behind the statue
    const pulse = 0.55 + Math.sin(t * (mood === 'zoomies' ? 6 : 2)) * 0.15;
    c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(cx, base - 60, 4, cx, base - 60, 78); g.addColorStop(0, hexA(M.color, 0.6 * pulse)); g.addColorStop(1, hexA(M.color, 0)); c.fillStyle = g; c.fillRect(cx - 80, base - 140, 160, 150); c.restore();
    // pedestal: stone plinth + kibble bowl
    R(c, x0 + 2, base - 14, s.w * TILE - 4, 14, INK); R(c, x0 + 4, base - 13, s.w * TILE - 8, 12, STONE_D); R(c, x0 + 4, base - 13, s.w * TILE - 8, 3, STONE_L);
    R(c, x0 + 8, base - 30, s.w * TILE - 16, 17, INK); R(c, x0 + 10, base - 29, s.w * TILE - 20, 15, GOLD_D); R(c, x0 + 10, base - 29, s.w * TILE - 20, 3, GOLD); R(c, x0 + 14, base - 26, s.w * TILE - 28, 1, GOLD_L);
    for (let k = 0; k < 7; k++) R(c, x0 + 13 + k * 6, base - 34 - (k % 2) * 2, 5, 4, k % 2 ? '#c88a3a' : '#a8682a'); // kibble in the bowl
    c.font = `6px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = INK; c.fillText('$KIBBLE', cx, base - 6); c.fillStyle = CREAM; c.fillText('$KIBBLE', cx, base - 7);
    const sp = statueSprite(drawShiba, artLoaded()); if (sp) c.drawImage(sp, Math.round(cx - 80), base - 30 - 160, 160, 170);
    if (mood === 'zoomies' || mood === 'happy') for (let k = 0; k < (mood === 'zoomies' ? 8 : 3); k++) { const a = t * 1.3 + k * 0.785, rr = 34 + (k % 3) * 8, px = cx + Math.cos(a) * rr, py = base - 80 + Math.sin(a) * rr * 1.1, tw = (Math.sin(t * 8 + k) + 1) / 2;
      R(c, px - 1, py - 3, 2, 6, hexA('#fff1b0', 0.4 + tw * 0.6)); R(c, px - 3, py - 1, 6, 2, hexA('#ffe08a', 0.4 + tw * 0.6)); }
  } }]; }

// ---- newsstand: The Daily Bone ----
export function newsProps(t) { const n = KP.news, x = n.x * TILE, base = (n.y + 1) * TILE, h = headlineFor(MW.mood);
  return [{ y: base - 2, d: (c) => {
    R(c, x - 6, base - 40, 44, 40, INK); R(c, x - 5, base - 39, 42, 38, WOOD); R(c, x - 5, base - 39, 42, 3, WOOD_L); R(c, x - 5, base - 4, 42, 3, WOOD_D);
    R(c, x - 2, base - 30, 36, 18, '#efe6d0'); for (let k = 0; k < 3; k++) R(c, x + 1, base - 26 + k * 4, 30, 1, '#9a917a'); R(c, x + 1, base - 29, 14, 3, INK);
    R(c, x - 8, base - 56, 48, 16, INK); R(c, x - 7, base - 55, 46, 14, NAVY); R(c, x - 7, base - 55, 46, 2, GOLD);
    c.font = `5px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = GOLD_L; c.fillText('THE DAILY', x + 16, base - 51); c.fillText('BONE', x + 16, base - 45);
    // headline board on a post
    const bw = 76, bx = x + 16 - bw / 2, by = base - 82; R(c, x + 14, by + 20, 4, 8, WOOD_D); R(c, bx - 1, by - 1, bw + 2, 22, INK); R(c, bx, by, bw, 20, CREAM); R(c, bx, by, bw, 2, GOLD);
    c.font = `5px ${FONT}`; c.fillStyle = INK; wrapText(c, h[0], x + 16, by + 7, bw - 6, 6);
  } }]; }
function wrapText(c, text, cx, y, maxw, lh) { const words = text.split(' '); let line = '', yy = y; for (const w of words) { const tt = line ? line + ' ' + w : w; if (c.measureText(tt).width > maxw && line) { c.fillText(line, cx, yy); line = w; yy += lh; } else line = tt; } if (line) c.fillText(line, cx, yy); }

// ---- fire pit (always there, roars in the doghouse) ----
export function firepitProps(t) { const f = KP.firepit, cx = tileC(f.x), base = (f.y + 1) * TILE, big = MW.mood === 'doghouse' ? 1.5 : MW.mood === 'grumpy' ? 1.1 : 0.8;
  return [{ y: base - 4, d: (c) => {
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; R(c, cx + Math.cos(a) * 12 - 4, base - 12 + Math.sin(a) * 5 - 3, 8, 6, k % 2 ? STONE : STONE_D); }
    R(c, cx - 9, base - 15, 18, 4, WOOD_D); R(c, cx - 6, base - 17, 12, 3, WOOD);
    for (let k = 0; k < 5; k++) { const fl = (Math.sin(t * 9 + k * 1.3) + 1) / 2, hh = (8 + fl * 10) * big; R(c, cx - 8 + k * 3.5, base - 16 - hh, 3, hh, k % 2 ? '#ff8a2a' : '#ffd84a'); }
    c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(cx, base - 22, 2, cx, base - 22, 30 * big); g.addColorStop(0, 'rgba(255,150,60,.45)'); g.addColorStop(1, 'rgba(255,150,60,0)'); c.fillStyle = g; c.fillRect(cx - 40, base - 60, 80, 70); c.restore();
  } }]; }

// ---- banners / bunting / sky over the plaza ----
export function plazaSkyProps(t) { const out = [], mood = MW.mood, s = KP.statue, cx = (s.x + 1) * TILE, top = (s.y - 1) * TILE;
  if (mood === 'doghouse' || mood === 'zoomies' || mood === 'happy') { const txt = BANNER[mood], x0 = (s.x - 2) * TILE, x1 = (s.x + 4) * TILE, y = top - 6;
    out.push({ y: (s.y) * TILE - 4, d: (c) => { R(c, x0, y - 30, 4, 62, WOOD_D); R(c, x1, y - 30, 4, 62, WOOD_D); R(c, x0 - 2, y - 34, 8, 5, GOLD);
      R(c, x1 - 2, y - 34, 8, 5, GOLD);
      if (mood === 'happy') { for (let k = 0; k <= 12; k++) { const px = x0 + 4 + k * ((x1 - x0 - 4) / 12), sag = Math.sin(k / 12 * Math.PI) * 10, wv = Math.sin(t * 3 + k) * 2, col = ['#c8323c', '#ffd84a', '#2f6fbd', '#4f9a4a'][k % 4];
          c.fillStyle = col; c.beginPath(); c.moveTo(px - 5, y - 24 + sag); c.lineTo(px + 5, y - 24 + sag); c.lineTo(px + wv * 0.5, y - 12 + sag); c.fill(); } R(c, x0 + 4, y - 25, x1 - x0 - 4, 1, '#3a2a1a'); }
      const bw = x1 - x0 - 8, wv = (k) => Math.round(Math.sin(t * 3 - k * 0.2) * 1.5);
      if (mood !== 'happy' || txt) { const by = mood === 'happy' ? y - 6 : y - 22; for (let k = 0; k < bw; k += 4) R(c, x0 + 6 + k, by + wv(k), 4, 15, mood === 'doghouse' ? '#7a1018' : mood === 'zoomies' ? '#c8323c' : '#2f6e3a');
        R(c, x0 + 6, by - 1, bw, 2, GOLD); c.font = `8px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = INK; c.fillText(txt, x0 + 6 + bw / 2 + 1, by + 8); c.fillStyle = GOLD_L; c.fillText(txt, x0 + 6 + bw / 2, by + 7); } } }); }
  if (mood === 'grumpy' || mood === 'doghouse') { const big = mood === 'doghouse', w = big ? 260 : 180, cy = top - 46, col = big ? '#3a3f58' : '#9aa3b8', col2 = big ? '#262a40' : '#7a8398';
    out.push({ y: 1e6, d: (c) => { // sky layer: drawn above actors
      const drift = Math.sin(t * 0.3) * 12; c.save(); c.globalAlpha = 0.92;
      for (const [dx, dy, r] of [[-0.35, 4, 0.22], [-0.12, -6, 0.28], [0.12, -2, 0.26], [0.34, 6, 0.2], [0, 10, 0.3]]) { c.fillStyle = col2; c.beginPath(); c.ellipse(cx + drift + dx * w, cy + dy + 4, r * w, r * w * 0.42, 0, 0, 7); c.fill(); }
      for (const [dx, dy, r] of [[-0.35, 0, 0.2], [-0.12, -10, 0.26], [0.12, -6, 0.24], [0.34, 2, 0.18], [0, 4, 0.28]]) { c.fillStyle = col; c.beginPath(); c.ellipse(cx + drift + dx * w, cy + dy, r * w, r * w * 0.4, 0, 0, 7); c.fill(); }
      c.globalAlpha = big ? 0.75 : 0.55; c.fillStyle = big ? '#9fb4e8' : '#c8d8f0'; const n = big ? 70 : 40, fall = big ? 200 : 140;
      for (let k = 0; k < n; k++) { const px = cx + drift + (((k * 97) % 100) / 100 - 0.5) * w * 0.9, ph = ((t * (big ? 1.6 : 1.1) + k * 0.137) % 1), py = cy + 14 + ph * fall; R(c, px - ph * 6, py, 1.5, big ? 9 : 6, c.fillStyle); }
      if (big && (t % 7) < 0.18) { c.globalAlpha = 0.9; c.strokeStyle = '#fff6c8'; c.lineWidth = 3; c.beginPath(); c.moveTo(cx + drift + 30, cy + 10); c.lineTo(cx + drift + 18, cy + 50); c.lineTo(cx + drift + 34, cy + 56); c.lineTo(cx + drift + 16, cy + 110); c.stroke(); }
      c.restore(); } }); }
  if (mood === 'zoomies') out.push({ y: 1e6, d: (c) => { for (let k = 0; k < 26; k++) { const ph = (t * 0.35 + k * 0.071) % 1, px = cx + Math.sin(k * 12.9 + t * 0.8) * 140, py = top - 120 + ph * 230, rot = t * 3 + k;
      c.save(); c.translate(px, py); c.rotate(rot); c.globalAlpha = 1 - ph * 0.6; const col = ['#fff6e0', '#ffd84a', '#ff9ac0', '#9fd8ff'][k % 4]; R(c, -5, -1.5, 10, 3, col); R(c, -7, -3, 3, 3, col); R(c, -7, 0.5, 3, 3, col); R(c, 4, -3, 3, 3, col); R(c, 4, 0.5, 3, 3, col); c.restore(); } } });
  return out; }

// ---- screen-space weather overlay (light; never blocks the HUD) ----
export function drawWeather(c, t, SW, SH, { reduced = false } = {}) { const mood = MW.mood, M = MOODS[mood] || MOODS.chill;
  if (M.tint) { c.fillStyle = M.tint; c.fillRect(0, 0, SW, SH); }
  if (reduced) return;
  if (mood === 'happy') { c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(0, 0, 10, 0, 0, Math.max(SW, SH) * 0.7); g.addColorStop(0, 'rgba(255,220,140,.22)'); g.addColorStop(1, 'rgba(255,220,140,0)'); c.fillStyle = g; c.fillRect(0, 0, SW, SH); c.restore(); }
  if (mood === 'zoomies') { for (let k = 0; k < 30; k++) { const x = ((k * 137.5) % SW), y = ((k * 71.3 + t * 40) % SH), tw = (Math.sin(t * 6 + k) + 1) / 2; c.fillStyle = `rgba(255,230,120,${0.25 + tw * 0.5})`; c.fillRect(x, y, 2, 2); if (tw > 0.8) { c.fillRect(x - 3, y, 8, 1); c.fillRect(x + 0.5, y - 3, 1, 8); } } }
  if (mood === 'grumpy' || mood === 'doghouse') { const big = mood === 'doghouse', n = big ? 110 : 40; c.save(); c.strokeStyle = big ? 'rgba(170,190,240,.45)' : 'rgba(200,215,240,.35)'; c.lineWidth = 1; c.beginPath();
    for (let k = 0; k < n; k++) { const x = (k * 53.7 + t * 30) % (SW + 40) - 20, y = ((k * 91.1) + t * (big ? 520 : 300)) % (SH + 20) - 10; c.moveTo(x, y); c.lineTo(x - (big ? 4 : 2), y + (big ? 14 : 8)); } c.stroke(); c.restore();
    if (big && (t % 7) < 0.12) { c.fillStyle = 'rgba(255,250,220,.22)'; c.fillRect(0, 0, SW, SH); } } }

// ---- crier actor (drawn with the normal Shiba renderer by main.js) + bell ----
export function crierActor(t, artKey) { const c = KP.crier; return { x: tileC(c.x), y: c.y * TILE + 20, coat: 'red', outfit: CRIER_OUTFIT, art: artKey('red', CRIER_OUTFIT), face: 'down', phase: t * 2, moving: false, name: CRIER_NAME, crier: true, npc: true }; }
export function drawBell(c, t, ringing) { const sw = ringing ? Math.sin(t * 22) * 0.6 : 0; c.save(); c.translate(-30, -56); c.rotate(sw); R(c, -2, -14, 4, 12, WOOD_D); c.fillStyle = INK; c.beginPath(); c.moveTo(-10, 10); c.lineTo(10, 10); c.lineTo(6, -4); c.lineTo(-6, -4); c.fill();
  c.fillStyle = GOLD; c.beginPath(); c.moveTo(-8, 8); c.lineTo(8, 8); c.lineTo(5, -2); c.lineTo(-5, -2); c.fill(); R(c, -2, 9, 4, 4, GOLD_D); c.restore();
  if (ringing) { c.save(); c.strokeStyle = 'rgba(255,240,180,.9)'; c.lineWidth = 2; for (const r of [16, 24]) { c.beginPath(); c.arc(-30, -52, r + (t * 30) % 8, -0.9, 0.4); c.stroke(); } c.restore(); } }

// ---- statue card + Daily Bone panel (HTML) ----
const fmtUsd = (n) => { if (n == null) return COPY.unavailable; if (n >= 1) return '$' + n.toFixed(2); if (n === 0) return '$0'; const d = Math.max(2, -Math.floor(Math.log10(n)) + 2); return '$' + n.toFixed(Math.min(d, 12)); };
const fmtPct = (p) => p == null ? '—' : (p >= 0 ? '+' : '') + Number(p).toFixed(1) + '%';
export function moodCardHtml(d, esc = (s) => String(s)) { const m = MOODS[d?.mood] || MOODS.chill, ago = d?.updatedAt ? Math.max(0, Math.round((Date.now() - Date.parse(d.updatedAt)) / 1000)) : null;
  return `<h2>Kibble Statue</h2><div class="card kmood" style="text-align:left"><div class="kmood-head"><span class="kmood-dot" style="background:${m.color}"></span><b>Town mood: ${m.name}</b>${d?.override ? ` <span class="chip">${COPY.override}</span>` : ''}</div>
  <p class="small">${COPY.card}</p>
  <div class="stats"><div>$KIBBLE price<b>${fmtUsd(d?.price)}</b>USD</div><div>24h change<b class="${d?.change24h == null ? '' : d.change24h >= 0 ? 'up' : 'dn'}">${fmtPct(d?.change24h)}</b>${d?.change24h == null ? 'not enough data yet' : '24 hours'}</div><div>1h change<b class="${d?.change1h == null ? '' : d.change1h >= 0 ? 'up' : 'dn'}">${fmtPct(d?.change1h)}</b>${d?.change1h == null ? 'not enough data yet' : '1 hour'}</div></div>
  <div class="small">Contract address (the only real $KIBBLE):</div><div class="ca"><code id="kmood-ca">${MINT}</code><button class="btn alt" data-copy="${MINT}" id="kmood-copy">Copy</button></div>
  <div class="small">${d?.stale ? COPY.stale : `Source: ${esc(d?.source || '—')}${d?.changeSource && d.changeSource !== d.source ? ' · change ' + esc(d.changeSource) : ''}${ago != null ? ' · updated ' + ago + 's ago' : ''}`}</div></div>
  <div class="nfa"><b>${COPY.nfa}</b></div>`; }
export function dailyBoneHtml(mood) { const [h, sub] = headlineFor(mood); return `<h2>The Daily Bone</h2><div class="card dailybone" style="text-align:left"><div class="small">Inu Verse's favourite paper · today's edition</div><h3 class="db-head">${h}</h3><p>${sub}.</p><p class="small"><i>"${lineFor(mood)}"</i> · overheard at the plaza</p></div><div class="nfa">${COPY.nfa}</div>`; }

function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`; }
export const _all = { LINES, HEADLINES, CRIER, BANNER, COPY };

// Alive phase 4: pure soundscape logic (no WebAudio here, so it's testable). Areas -> original procedural tracks,
// a debounced equal-time crossfade state, ambient bed levels (day/night, weather, plaza/market murmur, fountain),
// and persisted sound settings. audio.js plays it; main.js only feeds numbers at ~4 Hz.
export const AREAS = ['plaza', 'market', 'arcade', 'park'];
export const XFADE = 2.4, AREA_HOLD = 0.9; // seconds: crossfade length; how long a new area must hold before the music follows
export const NIGHT_FROM = 20, NIGHT_TO = 5; // night variant hours (the arcade keeps its own neon theme all night)
// All tracks are original and procedural: chords (semitones from root), an 8-step bass figure per bar (relative to the bar's
// first chord tone, octave down), a 32-step lead (semitones from root + 12), and an 8-step drum line (k kick, s snare, h hat).
export const TRACKS = Object.freeze({
  plaza: { id: 'plaza', name: 'Fountain Square Stroll', bpm: 92, root: 60, cutoff: 1500, pad: 'triangle', leadW: 'triangle', vol: { pad: 0.016, bass: 0.045, lead: 0.022, drum: 1 },
    prog: [[0, 4, 7, 11], [-3, 0, 4, 7], [-7, -3, 0, 4], [-5, -1, 2, 5]], bass: [0, null, null, 7, null, 0, null, null],
    lead: [4, null, 7, null, 9, 7, 4, null, 0, null, 2, 4, null, 2, 0, null, 5, null, 4, null, 0, null, -3, null, 2, null, 4, 2, -1, null, null, null], drums: 'k.h.s.h.' },
  market: { id: 'market', name: 'Kibble Market Bustle', bpm: 112, root: 65, cutoff: 1900, pad: 'triangle', leadW: 'square', vol: { pad: 0.012, bass: 0.045, lead: 0.012, drum: 1.1 },
    prog: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]], bass: [0, null, 12, null, 0, null, 7, null],
    lead: [0, 2, 4, null, 7, null, 4, 2, 0, null, -3, null, 0, 2, null, null, 2, null, 0, 2, 4, null, 2, 0, -1, null, 2, null, 4, 5, 7, null], drums: 'khshkhsh' },
  arcade: { id: 'arcade', name: 'Neon Bones', bpm: 128, root: 57, cutoff: 2400, pad: 'square', leadW: 'square', vol: { pad: 0.007, bass: 0.05, lead: 0.011, drum: 1.2 },
    prog: [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]], bass: [0, 0, 12, 0, 0, 12, 0, 7],
    lead: [0, 3, 7, 12, 7, 3, 0, 3, -4, 0, 3, 8, 3, 0, -4, 0, 3, 7, 10, 15, 10, 7, 3, 7, -2, 2, 5, 10, 5, 2, 7, null], drums: 'khskkhsh' },
  park: { id: 'park', name: 'Pond Lane Breeze', bpm: 80, root: 55, cutoff: 1300, pad: 'sine', leadW: 'triangle', vol: { pad: 0.02, bass: 0.035, lead: 0.02, drum: 0.6 },
    prog: [[0, 4, 7, 11], [-3, 0, 4, 7], [-7, -3, 0, 4], [-5, -1, 2, 5]], bass: [0, null, null, null, 7, null, null, null],
    lead: [4, null, null, 7, null, null, 9, null, 7, null, null, 4, null, 2, null, null, 0, null, 2, null, 4, null, null, null, 2, null, null, null, -1, null, null, null], drums: '..h...h.' },
  night: { id: 'night', name: 'Lantern Lullaby', bpm: 66, root: 62, cutoff: 900, pad: 'sine', leadW: 'sine', vol: { pad: 0.02, bass: 0.035, lead: 0.02, drum: 0.4 },
    prog: [[0, 3, 7, 10], [-4, 0, 3, 7], [-7, -4, 0, 3], [-5, 0, 2, 5]], bass: [0, null, null, null, null, null, null, null],
    lead: [7, null, null, 5, 3, null, null, null, 2, null, null, null, 0, null, null, null, 3, null, 5, null, 7, null, 10, null, 9, null, null, 7, null, null, null, null], drums: '....h...' },
});
export const TRACK_IDS = Object.keys(TRACKS);
export const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
export const stepLen = (tr) => 60 / tr.bpm / 2; // eighth notes; 32 steps = 4 bars
// Town map (tiles, see world.js): Market Row up north, ponds/homes/plots in the middle, the Kibble Plaza + mall forecourt hub,
// mall shops either side, the arcade + game doors on the plaza edges, park chapel and farmland south (Farmers Market = market).
export function areaAt(tx, ty) {
  if (!Number.isFinite(tx) || !Number.isFinite(ty)) return 'plaza';
  if (ty >= 44 && ty < 80) {
    if ((tx >= 55 && ty < 68) || tx <= 7) return 'arcade'; // Inu Arcade + Kibble Pay office (east), game doors strip (west)
    if (tx >= 19 && tx < 45) return 'plaza';
    return 'market'; // mall shops (jewelers, designer, furniture, autos, pets)
  }
  if (ty < 21) return tx <= 14 && ty <= 9 ? 'park' : 'market'; // north pond is park; the rest is Market Row
  if (ty >= 95 && tx >= 17 && tx <= 33) return 'market'; // Farmers Market + crafting
  return 'park';
}
export const isNight = (hour) => hour >= NIGHT_FROM || hour < NIGHT_TO;
export const trackFor = (area, hour) => (area !== 'arcade' && isNight(hour) ? 'night' : TRACKS[area] ? area : 'plaza');
// crossfade: each track ramps linearly from wherever it was when the target changed; reversing mid-fade never jumps
export function makeXfade(dur = XFADE) { return { cur: null, t0: -1e9, dur, start: {}, pend: null, pendT: 0 }; }
export function xfadeLevels(X, now, out = {}) {
  const p = Math.min(1, Math.max(0, (now - X.t0) / X.dur));
  for (const id of TRACK_IDS) { const s = X.start[id] || 0, tgt = id === X.cur ? 1 : 0; out[id] = s + (tgt - s) * p; }
  return out;
}
export function xfadeTo(X, id, now) {
  if (id === X.cur) return false;
  const lv = xfadeLevels(X, now); for (const k of TRACK_IDS) X.start[k] = lv[k];
  X.cur = id; X.t0 = now; return true;
}
export const liveTracks = (X, now) => { const lv = xfadeLevels(X, now); return TRACK_IDS.filter((id) => id === X.cur || lv[id] > 0.002); };
// debounce: a new track must be wanted for AREA_HOLD seconds before it takes over (no flapping on area borders); the first pick is instant
export function wantTrack(X, id, now, hold = AREA_HOLD) {
  if (X.cur == null) { X.pend = null; return xfadeTo(X, id, now); }
  if (id === X.cur) { X.pend = null; return false; }
  if (X.pend !== id) { X.pend = id; X.pendT = now; return false; }
  if (now - X.pendT >= hold - 1e-9) { X.pend = null; return xfadeTo(X, id, now); }
  return false;
}
// ambient beds, 0..1 each. Daylight ramps 5-7 and 18-20 so birds hand over to crickets at dusk.
export const CROWDS = [[22, 48], [32, 66], [23, 98], [46, 8], [14, 15]]; // Kibble Plaza, mall forecourt, Farmers Market, market stalls, café row
export const FOUNTAIN_AT = [32, 64.5];
export const LOW_AMB = 0.5;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export function daylight(h) { h = ((h % 24) + 24) % 24; return h < 5 || h >= 20 ? 0 : h < 7 ? (h - 5) / 2 : h < 18 ? 1 : 1 - (h - 18) / 2; }
export function nearest(tx, ty, pts) { let d = 1e9; for (const [x, y] of pts) { const q = Math.hypot(x - tx, y - ty); if (q < d) d = q; } return d; }
export function bedLevels({ hour = 12, rain = 0, tx = NaN, ty = NaN, area = 'plaza', indoor = false, low = false } = {}, out = {}) {
  const day = daylight(hour), r = clamp01(rain), wet = 1 - r * 0.8;
  const crowdD = Number.isFinite(tx) ? nearest(tx, ty, CROWDS) : 99, fD = Number.isFinite(tx) ? Math.hypot(tx - FOUNTAIN_AT[0], ty - FOUNTAIN_AT[1]) : 99;
  out.birds = day * wet * (area === 'park' ? 1 : 0.55);
  out.breeze = (0.25 + 0.2 * day) * (1 - r * 0.5) * (area === 'park' ? 1.2 : 1);
  out.crickets = (1 - day) * (1 - r * 0.7) * (area === 'park' ? 1 : 0.6);
  out.rain = r;
  out.murmur = clamp01(1 - crowdD / 11) * (0.35 + 0.65 * day) * (1 - r * 0.5);
  out.fountain = clamp01(1 - fD / 9);
  if (indoor) { for (const k of BEDS) out[k] = 0; out.rain = r * 0.25; } // muffled rain on the roof
  if (low) for (const k of BEDS) out[k] *= LOW_AMB; // reduced effects: every ambient layer at half
  return out;
}
export const BEDS = ['birds', 'breeze', 'crickets', 'rain', 'murmur', 'fountain'];
// settings (persisted): one mute + separate music / ambience / effects volumes
export const SETTINGS_KEY = 'inuverse.audio.v1';
export const DEFAULTS = Object.freeze({ muted: false, music: 0.7, amb: 0.8, sfx: 0.9 });
const vol = (v, d) => (Number.isFinite(+v) && v !== null && v !== '' ? Math.min(1, Math.max(0, +v)) : d);
export function loadSettings(store = globalThis.localStorage) {
  let raw = null; try { raw = JSON.parse(store?.getItem(SETTINGS_KEY) || 'null'); } catch { raw = null; }
  const s = raw && typeof raw === 'object' ? raw : {};
  return { muted: s.muted === true, music: vol(s.music, DEFAULTS.music), amb: vol(s.amb, DEFAULTS.amb), sfx: vol(s.sfx, DEFAULTS.sfx) };
}
export function saveSettings(s, store = globalThis.localStorage) {
  const v = { muted: !!s.muted, music: vol(s.music, DEFAULTS.music), amb: vol(s.amb, DEFAULTS.amb), sfx: vol(s.sfx, DEFAULTS.sfx) };
  try { store?.setItem(SETTINGS_KEY, JSON.stringify(v)); } catch { /* private mode: keep in memory */ }
  return v;
}

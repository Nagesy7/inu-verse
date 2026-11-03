// Generated soundscape (WebAudio, all procedural/original): per-area music that crossfades as you walk (soundscape.js picks it),
// ambient beds (breeze/birds by day, crickets at night, rain, plaza murmur, fountain trickle), and the one-shot SFX below.
// Starts only on a user gesture; one AudioContext; suspended while the tab is hidden. Notes are scheduled on the audio clock
// from a 200 ms timer (never per frame); beds are 1 looping noise source + filters + 3 LFOs, so the node count stays tiny.
import * as SS from './soundscape.js';
let ac = null, out = null, master = null, ambBus = null, musicBus = null, nbuf = null, loopTimer = null;
const ST = SS.loadSettings(); let muted = ST.muted, musicOn = true;
export const isMuted = () => muted;
export const audioSettings = () => ({ ...ST, muted });
const OUT_VOL = 0.5;
const nowX = () => (globalThis.performance?.now?.() ?? Date.now()) / 1000; // crossfade clock (exists before the AudioContext does)
const XF = SS.makeXfade(), TN = {}, TSTEP = {}, BED = {}, BEDL = SS.bedLevels({ hour: 12 }), LV = {};
for (const k of SS.BEDS) BEDL[k] = 0;
const SCN = { area: 'plaza', track: null, hour: 12, rain: 0, indoor: true, low: false, tx: NaN, ty: NaN, bedT: {} };
export function initAudio() {
  if (ac) { if (ac.state === 'suspended' && !document.hidden) ac.resume?.(); return; } // one AudioContext for the whole hub; later gestures only resume it
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext; if (!AC) return;
  ac = new AC(); out = ac.createGain(); out.gain.value = muted ? 0 : OUT_VOL; out.connect(ac.destination);
  master = ac.createGain(); master.gain.value = ST.sfx; master.connect(out); // effects bus (every one-shot SFX)
  musicBus = ac.createGain(); musicBus.gain.value = musicOn ? ST.music : 0; musicBus.connect(out);
  ambBus = ac.createGain(); ambBus.gain.value = ST.amb; ambBus.connect(out);
  nbuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); { const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } // one shared noise buffer
  for (const id of SS.TRACK_IDS) { const tr = SS.TRACKS[id], g = ac.createGain(), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = tr.cutoff; g.gain.value = 0; g.connect(lp); lp.connect(musicBus); TN[id] = g; TSTEP[id] = { next: 0, step: 0, live: false }; }
  buildBeds(); applyXfade(); applyBeds(true);
  loopTimer = setInterval(schedule, 200);
}
// Single audio manager rules (no stacking): area music ducked while a game overlay/tab owns the speakers; context suspended while hidden.
export function setMusicActive(on) { musicOn = !!on; if (musicBus) musicBus.gain.setTargetAtTime(on ? ST.music : 0, ac.currentTime, 0.08); }
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) ac.suspend?.(); else ac.resume?.(); });
  addEventListener('pagehide', () => ac?.suspend?.());
}
// one-shot limiter: per-SFX cooldown + cap on concurrent voices so rapid triggers (footsteps, text blips, clicks) never pile up
const lastAt = {}; let ends = [];
export const MAX_VOICES = 10;
export function gate(name, cd = 0.05, dur = 0.25, now = ac ? ac.currentTime : 0) {
  ends = ends.filter((t) => t > now); if (ends.length >= MAX_VOICES) return false;
  if (now - (lastAt[name] ?? -1e9) < cd) return false; lastAt[name] = now; ends.push(now + dur); return true;
}
export function setMuted(m) { muted = !!m; SS.saveSettings({ ...ST, muted }); if (out) out.gain.setTargetAtTime(muted ? 0 : OUT_VOL, ac.currentTime, 0.05); }
export function setVolume(kind, v) { if (!['music', 'amb', 'sfx'].includes(kind)) return; ST[kind] = Math.min(1, Math.max(0, +v || 0)); SS.saveSettings({ ...ST, muted });
  if (!ac) return; const t = ac.currentTime; if (kind === 'music') musicBus.gain.setTargetAtTime(musicOn ? ST.music : 0, t, 0.05); else (kind === 'amb' ? ambBus : master).gain.setTargetAtTime(ST[kind], t, 0.05); }
function tone(f, t, dur, vol = 0.05, type = 'sine', dest) {
  const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + 0.05); return o;
}
function noise(t, dur, vol, hp = 6000, dest) { // plays a slice of the shared noise buffer (no per-hit buffer allocation)
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'highpass'; f.frequency.value = hp; s.buffer = nbuf;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(dest || master); s.start(t, Math.random() * 1.5, dur + 0.02);
}
// ---- area music ----
// main.js calls this ~4x a second with plain numbers: which area the pup is in, the sky hour, rain, tile position, indoors, low-fx.
export function setScene(o) {
  SCN.area = o.area || SCN.area; SCN.hour = o.hour ?? SCN.hour; SCN.rain = o.rain ?? 0; SCN.indoor = !!o.indoor; SCN.low = !!o.low; SCN.tx = o.tx ?? NaN; SCN.ty = o.ty ?? NaN;
  const want = SS.trackFor(SCN.area, SCN.hour); SCN.track = want;
  if (SS.wantTrack(XF, want, nowX())) applyXfade();
  SS.bedLevels(SCN, BEDL); applyBeds(false);
}
function applyXfade() { // mirror the pure crossfade onto the track gains (from each track's current level to its target, over what's left)
  if (!ac) return; const t = ac.currentTime, nx = nowX(), left = Math.max(0, XF.t0 + XF.dur - nx); SS.xfadeLevels(XF, nx, LV);
  for (const id of SS.TRACK_IDS) { const g = TN[id].gain, tgt = id === XF.cur ? 1 : 0; g.cancelScheduledValues(t); g.setValueAtTime(LV[id], t); g.linearRampToValueAtTime(tgt, t + Math.max(0.02, left)); }
}
function kick(t, v, dest) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(0.06 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.16); }
function schedTrack(id, now) {
  const tr = SS.TRACKS[id], st = TSTEP[id], sl = SS.stepLen(tr), dest = TN[id], V = tr.vol;
  if (!st.live) { st.live = true; st.step = 0; st.next = now + 0.05; }
  if (st.next < now - 0.05) st.next = now + 0.05; // timer throttled/suspended: skip missed steps instead of firing them all at once
  while (st.next < now + 0.5) {
    const s = st.step % 32, bar = s >> 3, i = s & 7, t = st.next, ch = tr.prog[bar];
    if (i === 0) for (let k = 0; k < ch.length; k++) tone(SS.mtof(tr.root + ch[k]), t + k * 0.02, sl * 8 * 0.92, V.pad, tr.pad, dest);
    const b = tr.bass[i]; if (b != null) tone(SS.mtof(tr.root - 12 + ch[0] + b), t, sl * 1.6, V.bass, 'triangle', dest);
    const l = tr.lead[s]; if (l != null) tone(SS.mtof(tr.root + 12 + l), t, sl * (tr.lead[(s + 1) % 32] == null ? 1.7 : 0.85), V.lead, tr.leadW, dest);
    const d = tr.drums[i]; if (d === 'k') kick(t, V.drum, dest); else if (d === 's') noise(t, 0.08, 0.018 * V.drum, 1800, dest); else if (d === 'h') noise(t, 0.03, 0.007 * V.drum, 7000, dest);
    st.next += sl; st.step++;
  }
}
// ---- ambient beds ----
function buildBeds() {
  const src = ac.createBufferSource(); src.buffer = nbuf; src.loop = true;
  const bed = (name, type, freq, q, lfoHz = 0, depth = 0) => { const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const m = ac.createGain(), g = ac.createGain(); m.gain.value = 1; g.gain.value = 0;
    src.connect(f); f.connect(m); m.connect(g); g.connect(ambBus); BED[name] = g;
    if (lfoHz) { const o = ac.createOscillator(), d = ac.createGain(); o.frequency.value = lfoHz; d.gain.value = depth; o.connect(d); d.connect(m.gain); o.start(); } };
  bed('breeze', 'lowpass', 420, 0.7, 0.11, 0.45); bed('rain', 'bandpass', 2600, 0.45); bed('fountain', 'bandpass', 1900, 1.3, 5.3, 0.35); bed('murmur', 'bandpass', 520, 1.6, 0.7, 0.5);
  src.start(); SCN.bedT.birds = SCN.bedT.crickets = SCN.bedT.chatter = 0;
}
const BED_VOL = { breeze: 0.05, rain: 0.09, fountain: 0.05, murmur: 0.05 }, LAST = {};
function applyBeds(force) { if (!ac) return; const t = ac.currentTime;
  for (const k in BED) { const v = BEDL[k] * BED_VOL[k]; if (force || Math.abs((LAST[k] ?? -1) - v) > 0.0008) { LAST[k] = v; BED[k].gain.setTargetAtTime(v, t, force ? 0.05 : 0.7); } } }
function schedBeds(now) { // birdsong and crickets are sparse scheduled phrases; the murmur gets soft "voice" glides on top of its noise band
  const T = SCN.bedT, slow = SCN.low ? 2 : 1;
  if (BEDL.birds > 0.05 && now >= T.birds) { const v = 0.014 * BEDL.birds, n = 2 + (Math.random() * 3 | 0), f0 = 2300 + Math.random() * 900;
    for (let i = 0; i < n; i++) { const t = now + 0.05 + i * 0.1, o = tone(f0 + i * 120, t, 0.08, v, 'sine', ambBus); o.frequency.exponentialRampToValueAtTime(f0 + 900 + i * 150, t + 0.06); }
    T.birds = now + (1.6 + Math.random() * 4.5) * slow / Math.max(0.35, BEDL.birds); }
  if (BEDL.crickets > 0.05 && now >= T.crickets) { const v = 0.006 * BEDL.crickets, f = Math.random() < 0.5 ? 4300 : 4650;
    for (let i = 0; i < 4; i++) tone(f, now + 0.05 + i * 0.045, 0.025, v, 'sine', ambBus); T.crickets = now + (0.7 + Math.random() * 0.8) * slow; }
  if (BEDL.murmur > 0.15 && now >= T.chatter) { const o = tone(260 + Math.random() * 220, now + 0.05, 0.22, 0.008 * BEDL.murmur, 'triangle', ambBus); o.frequency.linearRampToValueAtTime(220 + Math.random() * 200, now + 0.25); T.chatter = now + (0.35 + Math.random() * 0.9) * slow; }
}
function schedule() {
  if (!ac || ac.state !== 'running') return; const now = ac.currentTime, nx = nowX(); SS.xfadeLevels(XF, nx, LV);
  for (const id of SS.TRACK_IDS) { if (id === XF.cur || LV[id] > 0.002) schedTrack(id, now); else TSTEP[id].live = false; }
  if (!muted && ST.amb > 0) schedBeds(now);
}
// debug readout (?audiodebug=1): what is playing right now, read from the same state that drives the gains
export function audioDebug() { const nx = nowX(); SS.xfadeLevels(XF, nx, LV); const live = SS.TRACK_IDS.filter((id) => id === XF.cur || LV[id] > 0.002);
  return { ctx: ac ? ac.state : 'waiting for tap', area: SCN.area, track: XF.cur, name: XF.cur ? SS.TRACKS[XF.cur].name : '', pending: XF.pend, live: live.map((id) => [id, +LV[id].toFixed(2)]),
    beds: SS.BEDS.filter((k) => BEDL[k] > 0.02).map((k) => [k, +BEDL[k].toFixed(2)]), hour: +(+SCN.hour).toFixed(1), indoor: SCN.indoor, low: SCN.low, muted, music: ST.music, amb: ST.amb, sfx: ST.sfx, musicOn }; }
export function footstep() { if (!ac || muted || !gate('step', 0.12, 0.05)) return; noise(ac.currentTime, 0.04, 0.03, 1500); }
export function chirp() { if (!ac || muted || !gate('chirp', 0.6, 0.3)) return; const t = ac.currentTime; for (let i = 0; i < 3; i++) { const o = tone(2400 + Math.random() * 800, t + i * 0.09, 0.07, 0.015, 'sine', master); o.frequency.exponentialRampToValueAtTime(3600, t + i * 0.09 + 0.06); } }
export function bork() { if (!ac || muted || !gate('bork', 0.15, 0.25)) return; const t = ac.currentTime; const o = tone(320, t, 0.22, 0.12, 'sawtooth', master); o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(180, t + 0.2); noise(t, 0.08, 0.05, 800); }
export function blip(f = 880) { if (!ac || muted || !gate('blip', 0.04, 0.12)) return; tone(f, ac.currentTime, 0.12, 0.04, 'square', master); }
export function uiClick() { if (!ac || muted || !gate('click', 0.04, 0.08)) return; const t = ac.currentTime; tone(1180, t, 0.05, 0.03, 'square', master); tone(1580, t + 0.03, 0.05, 0.02, 'square', master); }
export function uiOpen() { if (!ac || muted || !gate('open', 0.1, 0.2)) return; const t = ac.currentTime; [523, 659, 784].forEach((f, i) => tone(f, t + i * 0.045, 0.12, 0.03, 'triangle', master)); }
export function uiClose() { if (!ac || muted || !gate('close', 0.1, 0.15)) return; const t = ac.currentTime; [784, 587].forEach((f, i) => tone(f, t + i * 0.05, 0.1, 0.025, 'triangle', master)); }
export function textBlip(f = 620) { if (!ac || muted || !gate('text', 0.035, 0.04)) return; tone(f + Math.random() * 60, ac.currentTime, 0.035, 0.022, 'square', master); }
export function rustle() { if (!ac || muted || !gate('rustle', 0.12, 0.07)) return; noise(ac.currentTime, 0.07, 0.02, 3000); }
// café one-shots (diner): each gated with its own cooldown, eat + sip share one gate so they never stack
export function cafeChime() { if (!ac || muted || !gate('chime', 1.0, 0.5)) return; const t = ac.currentTime; tone(1568, t, 0.35, 0.03, 'sine', master); tone(2093, t + 0.09, 0.4, 0.025, 'sine', master); }
export function munch() { if (!ac || muted || !gate('eat', 0.9, 0.2)) return; const t = ac.currentTime; noise(t, 0.05, 0.03, 900); noise(t + 0.11, 0.05, 0.025, 1100); }
export function sip() { if (!ac || muted || !gate('eat', 0.9, 0.25)) return; const t = ac.currentTime; const o = tone(520, t, 0.18, 0.02, 'sine', master); o.frequency.exponentialRampToValueAtTime(780, t + 0.16); }
export function clink() { if (!ac || muted || !gate('clink', 0.8, 0.2)) return; const t = ac.currentTime; tone(2637, t, 0.12, 0.02, 'triangle', master); tone(3136, t + 0.05, 0.1, 0.015, 'triangle', master); }
// Sim fire engine (Phase 6): ONE soft cartoon "wee-woo" per call-out. The sim asks via a DOM event (it never imports audio);
// the 45 s gate here plus the sim's own cooldown mean two sirens never stack, and mute/limiter rules apply as for every SFX.
export function siren() { if (!ac || muted || !gate('siren', 45, 1.8)) return false; const t = ac.currentTime; for (let i = 0; i < 4; i++) tone(i % 2 ? 660 : 880, t + i * 0.4, 0.36, 0.025, 'triangle', master); globalThis.__inuSirens = (globalThis.__inuSirens || 0) + 1; return true; }
if (typeof addEventListener !== 'undefined') addEventListener('inu:sim-sfx', (e) => { if (e?.detail?.name === 'siren') siren(); });
export function fanfare() { if (!ac || muted || !gate('fanfare', 1.5, 1.8)) return; const t = ac.currentTime; [[523, 0, .18], [659, .18, .18], [784, .36, .18], [1047, .54, .5], [784, .9, .16], [1047, 1.06, .7]].forEach(([f, d, l]) => { tone(f, t + d, l, 0.05, 'square', master); tone(f / 2, t + d, l, 0.03, 'sawtooth', master); }); }
// Town crier "EXTRA!" bell for Verified Launch news: ONE sound, own gate with a long cooldown, so headlines never stack sounds.
export const CRIER_SFX_CD = 20;
export function crierBell() { if (!ac || muted || !gate('crier', CRIER_SFX_CD, 1.2)) return false; const t = ac.currentTime; [[1318, 0], [988, 0.16], [1318, 0.32]].forEach(([f, d]) => { tone(f, t + d, 0.35, 0.04, 'triangle', master); tone(f * 2, t + d, 0.2, 0.012, 'sine', master); }); return true; }

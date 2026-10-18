// Tiny generated soundscape (WebAudio): lo-fi loop, footsteps, birdsong, bork. Starts on first user gesture.
let ac = null, master = null, muted = false, loopTimer = null, nextBar = 0, bar = 0;
export const isMuted = () => muted;
export function initAudio() {
  if (ac) { if (ac.state === 'suspended' && !document.hidden) ac.resume?.(); return; } // one AudioContext for the whole hub; later gestures only resume it
  if (typeof AudioContext === 'undefined') return;
  ac = new AudioContext(); master = ac.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ac.destination);
  musicBus = ac.createGain(); musicBus.gain.value = musicOn ? 1 : 0; musicBus.connect(master);
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.connect(musicBus); master.lofi = lp;
  nextBar = ac.currentTime + 0.1; loopTimer = setInterval(schedule, 200);
}
// Single audio manager rules (no stacking): one lo-fi loop, ducked while a game overlay/tab owns the speakers; context suspended while hidden.
let musicBus = null, musicOn = true;
export function setMusicActive(on) { musicOn = !!on; if (musicBus) musicBus.gain.setTargetAtTime(on ? 1 : 0, ac.currentTime, 0.08); }
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
export function setMuted(m) { muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : 0.5, ac.currentTime, 0.05); }
function tone(f, t, dur, vol = 0.05, type = 'sine', dest) {
  const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest || master.lofi); o.start(t); o.stop(t + dur + 0.05); return o;
}
function noise(t, dur, vol, hp = 6000) {
  const b = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'highpass'; f.frequency.value = hp; s.buffer = b;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(master); s.start(t);
}
const CHORDS = [[261.6, 329.6, 392, 493.9], [220, 261.6, 329.6, 392], [174.6, 220, 261.6, 329.6], [196, 246.9, 293.7, 349.2]]; // Cmaj7 Am7 Fmaj7 G7
function schedule() {
  const BAR = 3.2; // ~75bpm
  if (nextBar < ac.currentTime - 0.05) nextBar = ac.currentTime + 0.05; // timer was throttled/suspended: skip missed bars instead of firing them all at once
  while (nextBar < ac.currentTime + 0.6) {
    const ch = CHORDS[bar % 4], t = nextBar;
    ch.forEach((f, i) => tone(f, t + i * 0.03, BAR * 0.95, 0.018, 'triangle'));
    tone(ch[0] / 2, t, 0.9, 0.05); tone(ch[0] / 2, t + BAR / 2, 0.9, 0.04);
    for (let k = 0; k < 8; k++) noise(t + k * BAR / 8 + (k % 2 ? 0.04 : 0), 0.05, k % 2 ? 0.012 : 0.02);
    if (bar % 2) tone(ch[2 + (bar % 2)] * 2, t + BAR * 0.75, 0.5, 0.012);
    nextBar += BAR; bar++;
  }
}
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
export function fanfare() { if (!ac || muted || !gate('fanfare', 1.5, 1.8)) return; const t = ac.currentTime; [[523, 0, .18], [659, .18, .18], [784, .36, .18], [1047, .54, .5], [784, .9, .16], [1047, 1.06, .7]].forEach(([f, d, l]) => { tone(f, t + d, l, 0.05, 'square', master); tone(f / 2, t + d, l, 0.03, 'sawtooth', master); }); }
// Town crier "EXTRA!" bell for Verified Launch news: ONE sound, own gate with a long cooldown, so headlines never stack sounds.
export const CRIER_SFX_CD = 20;
export function crierBell() { if (!ac || muted || !gate('crier', CRIER_SFX_CD, 1.2)) return false; const t = ac.currentTime; [[1318, 0], [988, 0.16], [1318, 0.32]].forEach(([f, d]) => { tone(f, t + d, 0.35, 0.04, 'triangle', master); tone(f * 2, t + d, 0.2, 0.012, 'sine', master); }); return true; }

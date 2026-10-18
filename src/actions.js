// Round 3 social actions: sit / lie down / 3 original dances / wave / wag / sleep / bow + emote bubbles, auto-sit then doze
// when idle, and the pure pose math layered on top of the normal Shiba renderers (src/art.js applies poseAt() around the
// sprite; the face system in src/face.js reads poseFace()). Pure: no DOM, no clocks, no randomness. Same input -> same pose.
// Sync: an action start rides the existing multiplayer emote path ({t:'e', k}); looping poses also ride the state frame as
// a small pose code (s.p, see mpshared.js POSES) so late joiners and dropped emotes still see you sitting/dancing.
import { POSES } from './mpshared.js';

// loop: holds until you move or pick something else. dur: one-shot length in seconds.
export const ACTIONS = {
  sit:    { label: 'Sit',         icon: 'SIT',  loop: true },
  lie:    { label: 'Lie down',    icon: 'LIE',  loop: true },
  dance:  { label: 'Paw Shuffle', icon: '♪',    loop: true, dance: 1 },
  dance2: { label: 'Spin Hop',    icon: '♫',    loop: true, dance: 2 },
  dance3: { label: 'Tail Twist',  icon: '♬',    loop: true, dance: 3 },
  wave:   { label: 'Wave',        icon: 'HI!',  dur: 2.4 },
  wag:    { label: 'Wag',         icon: 'WAG',  dur: 3 },
  sleep:  { label: 'Sleep',       icon: 'Zz',   loop: true },
  bow:    { label: 'Bow',         icon: 'BOW',  dur: 1.8 },
};
export const ACTION_ORDER = ['sit', 'lie', 'dance', 'dance2', 'dance3', 'wave', 'wag', 'sleep', 'bow'];
// emote bubbles (icon over the head + a chat line), all already in the server's EMOTE_KINDS
export const BUBBLES = [['heart', '♥'], ['happy', 'YAY'], ['note', 'OK'], ['angry', 'HMPH'], ['bork', 'BORK'], ['zoomies', 'ZOOM']];
export const isAction = (k) => Object.prototype.hasOwnProperty.call(ACTIONS, k);
export const poseCode = (k) => { const i = POSES.indexOf(k); return i > 0 ? i : 0; };
export const poseOf = (code) => (Number.isInteger(code) && code > 0 && code < POSES.length ? POSES[code] : null);

// Long idle: auto-sit after IDLE.sit seconds standing still, then doze (sleep) after IDLE.doze. Never interrupts a manual action.
export const IDLE = { sit: 25, doze: 55 };
export function idleAction(still, cur) { if (cur && !cur.auto) return cur.kind;
  return still >= IDLE.doze ? 'sleep' : still >= IDLE.sit ? 'sit' : null; }

// ---- local action state machine (one per player; t = game time in seconds) ----
export function makeActor() { return { act: null, still: 0, seq: 0 }; }
// start an action (or re-pick the same looping one to stand up again)
export function startAction(A, kind, t, { auto = false } = {}) { if (!isAction(kind)) return null;
  if (!auto && A.act && A.act.kind === kind && ACTIONS[kind].loop && !A.act.auto) { A.act = null; A.seq++; return null; } // toggle off
  A.act = { kind, t0: t, auto, seq: ++A.seq }; return A.act; }
export function cancelAction(A) { if (A.act) { A.act = null; A.seq++; return true; } return false; }
// per frame: moving cancels any action and resets the idle clock; idle long enough auto-sits then dozes; one-shots expire.
export function stepActor(A, dt, t, { moving = false, busy = false } = {}) {
  if (moving) { A.still = 0; return cancelAction(A) ? 'cancel' : null; }
  if (A.act && !ACTIONS[A.act.kind].loop && t - A.act.t0 >= ACTIONS[A.act.kind].dur) { A.act = null; A.seq++; }
  if (busy) { A.still = 0; return null; }
  A.still += dt;
  const want = idleAction(A.still, A.act);
  if (want && (!A.act || (A.act.auto && A.act.kind !== want))) { startAction(A, want, t, { auto: true }); return 'auto'; }
  return null; }
export const poseCodeOf = (A) => (A.act && ACTIONS[A.act.kind].loop ? poseCode(A.act.kind) : 0);

// ---- remote players: apply what arrives over the wire ----
export function remoteEmote(r, k, t) { if (!isAction(k)) return false; r.act = { kind: k, t0: t }; return true; }
export function remoteState(r, s, t) {
  if (s.m || s.d) { r.act = null; return; }
  const k = poseOf(s.p);
  if (k) { if (!r.act || r.act.kind !== k) r.act = { kind: k, t0: t }; }
  else if (r.act && ACTIONS[r.act.kind]?.loop) r.act = null; }
export function remoteStep(r, t) { if (r.act && !ACTIONS[r.act.kind]?.loop && t - r.act.t0 >= (ACTIONS[r.act.kind]?.dur || 0)) r.act = null; }

// ---- pose math (pure) ----
// Returns the transform to apply around the sprite, anchored at the feet: scale (sx, sy), rotation (rad, + leans forward
// in the facing direction), offset (dx, dy px at scale 1), an optional facing override, the face-system emote and overlays.
const FACES = ['down', 'right', 'up', 'left'];
export function poseAt(kind, e, face = 'down') { const P = { sx: 1, sy: 1, rot: 0, dx: 0, dy: 0, face: null, faceEmote: null, wag: 0, zz: false, paw: null };
  if (!isAction(kind)) return null; e = Math.max(0, e || 0); const side = face === 'left' || face === 'right';
  const ease = Math.min(1, e / 0.25); // settle into the pose over a quarter second
  switch (kind) {
    case 'sit': P.sy = 1 - 0.18 * ease; P.sx = 1 + 0.04 * ease; P.faceEmote = 'sit'; break;
    case 'lie': P.sy = 1 - 0.36 * ease; P.sx = 1 + 0.14 * ease; P.dy = 1; P.faceEmote = 'lie'; break;
    case 'sleep': P.sy = 1 - 0.38 * ease + Math.sin(e * 2.2) * 0.012; P.sx = 1 + 0.15 * ease; P.dy = 1; P.faceEmote = 'sleep'; P.zz = e > 0.4; break;
    case 'dance': { // Paw Shuffle: two-step side shuffle, little lean into each step, bounce on the beat (2 beats/s)
      const b = e * Math.PI * 2 * 1; P.dx = Math.sin(b) * 5; P.rot = Math.sin(b) * 0.1; P.dy = -Math.abs(Math.sin(b * 2)) * 3; P.faceEmote = 'dance'; P.wag = 1; break; }
    case 'dance2': { // Spin Hop: hop on every beat and turn a quarter each hop (down -> right -> up -> left)
      const beat = e * 2.5, k = Math.floor(beat); P.face = FACES[k % 4]; P.dy = -Math.sin((beat - k) * Math.PI) * 10; P.sy = 1 + Math.sin((beat - k) * Math.PI) * 0.04; P.faceEmote = 'dance'; break; }
    case 'dance3': { // Tail Twist: squash-and-stretch wiggle, look left/right on alternate beats, tail going hard
      const beat = e * 2, k = Math.floor(beat), ph = beat - k; P.sy = 1 + Math.sin(ph * Math.PI * 2) * 0.07; P.sx = 1 - Math.sin(ph * Math.PI * 2) * 0.05; P.rot = (k % 2 ? 1 : -1) * 0.08 * Math.sin(ph * Math.PI);
      P.face = side || face === 'up' ? (k % 2 ? 'left' : 'right') : (k % 4 === 3 ? 'left' : k % 4 === 1 ? 'right' : 'down'); P.faceEmote = 'dance'; P.wag = 1; break; }
    case 'wave': P.rot = Math.sin(e * 9) * 0.05; P.dy = -Math.abs(Math.sin(e * 4.5)) * 2; P.faceEmote = 'wave'; P.paw = { up: 0.5 + 0.5 * Math.sin(e * 12) }; break;
    case 'wag': P.rot = Math.sin(e * 16) * 0.05; P.dx = Math.sin(e * 16) * 1.2; P.faceEmote = 'happy'; P.wag = 1; break;
    case 'bow': { const k = e < 0.4 ? e / 0.4 : e > ACTIONS.bow.dur - 0.4 ? Math.max(0, (ACTIONS.bow.dur - e) / 0.4) : 1; // down, hold, up
      P.sy = 1 - 0.14 * k; P.rot = (side ? 0.22 : 0) * k; P.dy = 2 * k; P.faceEmote = 'happy'; break; }
  }
  if (P.face == null) P.face = face; return P; }
// face-system mood for a pose (face.js faceAt reads these emote names)
export const poseFace = (kind) => poseAt(kind, 1)?.faceEmote || null;

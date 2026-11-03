import test from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as TF from '../src/townsfolk.js';
import { isSolid, TILE } from '../src/world.js';
const NAMES = ['Mochi', 'Kuro', 'Hana', 'Taro', 'Yuzu', 'Goma'];
const tileOf = (x, y) => [Math.floor(x / TILE), Math.floor(y / TILE)];
const VIEW_ALL = { x0: -1e6, y0: -1e6, x1: 1e6, y1: 1e6 };
const ctxAt = (s, extra = {}) => ({ s, now: 100, px: null, py: null, view: VIEW_ALL, hour: s / 60, wx: 'clear', low: false, rm: false, rng: () => 0.42, say: () => true, ...extra });

test('ten original townsfolk, distinct names and looks, no clash with existing NPC names', () => {
  assert.ok(TF.FOLK.length >= 8 && TF.FOLK.length <= 14);
  const names = new Set(TF.FOLK_NAMES); assert.equal(names.size, TF.FOLK.length);
  for (const n of [...NAMES, 'Sumi', 'Ren', 'Nori', 'Aki', 'Hiro', 'Miso', 'Yuki', 'Kinako', 'President Inu']) assert.ok(!names.has(n), n);
  const looks = new Set(TF.FOLK.map((f) => f.coat + JSON.stringify(f.outfit))); assert.equal(looks.size, TF.FOLK.length, 'each coat+accessory combo is unique');
  for (const f of TF.FOLK) assert.ok(Object.keys(f.outfit).length >= 1, f.name + ' has an accessory');
});

test('positions are a pure function of the folk-day second (every client agrees) and never teleport', () => {
  const a = {}, b = {};
  for (let i = 0; i < TF.FOLK.length; i++) { let prev = null;
    for (let s = 0; s < TF.FOLK_DAY * 2; s += 0.5) { TF.folkAt(i, s, a); TF.folkAt(i, s + TF.FOLK_DAY, b); assert.equal(a.x, b.x); assert.equal(a.y, b.y);
      if (prev && !a.hidden && !prev.hidden) assert.ok(Math.hypot(a.x - prev.x, a.y - prev.y) <= TF.SPEED * 0.5 * 1.5 + 1e-6, `${TF.FOLK[i].name} jumped at ${s}`);
      prev = { x: a.x, y: a.y, hidden: a.hidden }; } }
});

test('routines: everyone walks, sits, gathers/chats and is home (hidden) at 4am; plan built on the sky clock', () => {
  const o = {};
  for (let i = 0; i < TF.FOLK.length; i++) { const seen = new Set(); for (let s = 0; s < TF.FOLK_DAY; s += 1) seen.add(TF.folkAt(i, s, o).doing);
    for (const k of ['walk', 'sit', 'stand', 'home']) assert.ok(seen.has(k), `${TF.FOLK[i].name} ${k}`);
    TF.folkAt(i, TF.folkSec(4), o); assert.equal(o.hidden, true, TF.FOLK[i].name + ' home at 4am'); }
  assert.equal(TF.folkSec(13.5), 810);
  const strollers = TF.FOLK.filter((f) => f.day.some(([, s]) => s.startsWith('stroll'))); assert.ok(strollers.length >= 8);
  // the plaza fountain ring gets a crowd at midday-ish
  let gather = 0; for (let i = 0; i < TF.FOLK.length; i++) for (let h = 10; h <= 20; h++) { TF.folkAt(i, h * 60 + 59, o); if (o.doing === 'stand') gather++; } assert.ok(gather >= 10);
});

test('stops, seats and loops stand on walkable tiles and never on (or right in front of) a door', () => {
  for (const [k, [t]] of Object.entries(TF.SPOTS)) { assert.ok(!isSolid(...t), k); assert.ok(!TF.nearDoor(...t), k + ' blocks a door'); }
  TF.SEATS.forEach((p, i) => { const t = tileOf(...p); assert.ok(!isSolid(...t), 'seat ' + i); assert.ok(!TF.nearDoor(...t), 'seat ' + i); });
  for (const [k, L] of Object.entries(TF.LOOPS)) for (const p of L) assert.ok(!isSolid(...p), k);
  const o = {}; for (let i = 0; i < TF.FOLK.length; i++) for (let s = 0; s < TF.FOLK_DAY; s += 1) { TF.folkAt(i, s, o); if (o.doing === 'sit' || o.doing === 'stand') assert.ok(!TF.nearDoor(...tileOf(o.x, o.y)), TF.FOLK[i].name); }
});

test('pooled: same actor objects and output array every frame, culled to the view, fewer in reduced-effects', () => {
  const T = TF.makeTownsfolk(), s = 13 * 60 + 100;
  const out1 = TF.stepTownsfolk(T, 0.016, ctxAt(s)), first = out1.slice(); const out2 = TF.stepTownsfolk(T, 0.016, ctxAt(s + 0.016));
  assert.equal(out1, out2, 'output array reused'); assert.ok(first.length >= 8); first.forEach((a, k) => assert.equal(a, out2[k], 'actor objects reused'));
  assert.ok(TF.stepTownsfolk(T, 0.016, ctxAt(s, { low: true })).length <= TF.FOLK_CAPS.low);
  assert.equal(TF.stepTownsfolk(T, 0.016, ctxAt(s, { view: { x0: -9000, y0: -9000, x1: -8000, y1: -8000 } })).length, 0, 'off-camera folk are not emitted');
  assert.equal(TF.stepTownsfolk(T, 0.016, ctxAt(TF.folkSec(4))).length, 0, 'indoors at night');
  for (const a of first) { assert.equal(a.townsfolk, true); assert.ok(!a.mp && !a.me && !a.npc, 'never a player'); assert.equal(a.name, null, 'no player name tag'); }
});

test('reacts to the player: faces, waves, greets once per approach (capped bubbles), pauses then catches up', () => {
  const T = TF.makeTownsfolk(), said = []; const say = (id, text) => { said.push([id, text]); return true; };
  const s0 = TF.FOLK[0].day[0][0] * 60 + 30, o = TF.folkAt(0, s0, {}); assert.equal(o.moving, true);
  let out = TF.stepTownsfolk(T, 0.016, ctxAt(s0, { px: o.x + 30, py: o.y, say }));
  const a = out.find((q) => q.folkName === 'Sora'); assert.equal(a.face, 'right'); assert.ok(a.emote); assert.equal(a.act?.kind, 'wave');
  assert.equal(said.filter(([id]) => id === 'tf:Sora').length, 1); assert.ok(TF.FOLK_LINES.greet.includes(said.find(([id]) => id === 'tf:Sora')[1]));
  const x0 = a.x; for (let k = 1; k <= 60; k++) out = TF.stepTownsfolk(T, 1 / 60, ctxAt(s0 + k / 60, { px: o.x + 30, py: o.y, say, now: 100 + k / 60 }));
  assert.ok(Math.abs(a.x - x0) < 2, 'pauses while greeting'); assert.equal(said.filter(([id]) => id === 'tf:Sora').length, 1, 'one greeting per approach');
  assert.ok(T.F[0].lag > 0.9); for (let k = 0; k < 600; k++) TF.stepTownsfolk(T, 0.1, ctxAt(s0 + 2 + k * 0.1, { now: 200 + k * 0.1 })); assert.equal(T.F[0].lag, 0, 'catches back up to the shared clock');
  // bubble cap: never more than FOLK_CAPS.bubbles townsfolk bubbles at once
  const T2 = TF.makeTownsfolk(); let n = 0; const say2 = () => { n++; return true; };
  for (let k = 0; k < 200; k++) TF.stepTownsfolk(T2, 0.1, ctxAt(14 * 60 + k * 0.1, { now: 50 + k * 0.1, say: say2, rng: Math.random }));
  assert.ok(T2.F.filter((F) => F.bubbleUntil > 50 + 199 * 0.1).length <= TF.FOLK_CAPS.bubbles);
});

test('talk + interact: short line, no rewards; anchor for chat bubbles', () => {
  const T = TF.makeTownsfolk(), s = 13 * 60 + 200, out = TF.stepTownsfolk(T, 0.016, ctxAt(s)); const a = out[0];
  assert.equal(TF.nearestFolk(T, a.x + 5, a.y), a); assert.equal(TF.nearestFolk(T, a.x + 500, a.y + 500), null);
  const line = TF.talkTo(T, a, { now: 1, rng: () => 0.7, hour: 13, wx: 'rain' }); assert.equal(typeof line, 'string'); assert.ok(line.length > 3 && line.length < 60);
  assert.equal(TF.timeLine(13, 'rain', 0.1), TF.FOLK_LINES.rain[0]); assert.ok(TF.FOLK_LINES.night.includes(TF.timeLine(23, 'clear', 0.5)));
  const an = TF.folkAnchor(T, a.fid); assert.ok(an && an.y < a.y); assert.equal(TF.folkAnchor(T, 'Mochi'), null);
  assert.ok(out.some((q) => q.act?.kind === 'sit'), 'someone is sitting on a bench at 13:03');
  const rain = TF.stepTownsfolk(T, 0.016, ctxAt(s, { wx: 'rain' })); assert.ok(rain.every((q) => q.umbrella), 'umbrellas up in the rain');
});

test('self-contained: NPC only, never touches multiplayer, feed, economy or $KIBBLE', () => {
  const src = readFileSync(new URL('../src/townsfolk.js', import.meta.url), 'utf8');
  const imports = src.match(/^import .*$/gm).join('\n'); assert.deepEqual(imports.match(/'[^']+'/g), ["'./world.js'", "'./townai.js'"], 'only map/door helpers imported');
  for (const bad of ['fetch(', 'localStorage', 'mememon', 'kibble', 'coins', 'state.', 'reward(']) assert.ok(!src.toLowerCase().includes(bad), bad);
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.ok(/amb = makeAmbient\(42\); snapWeather\(\);/.test(main), 'weather snaps to the current state on load');
});

test('phone landscape: profile badge is pushed below the HUD row', () => {
  const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  assert.match(css, /@media \(max-height:520px\) and \(orientation:landscape\)\{#inu-profile-badge\{top:calc\(max\(8px,env\(safe-area-inset-top\)\) \+ 50px\)!important/);
});

// Alive phase 4: area -> track mapping, crossfade state, ambient beds, persisted sound settings, and audio wiring rules.
import test from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as S from '../src/soundscape.js';
import { isSolid } from '../src/world.js';
const src = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const memStore = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };

test('area map: plaza hub, market streets/shops, arcade edges, park everywhere green', () => {
  const cases = [[[32, 61], 'plaza'], [[22, 49], 'plaza'], [[6, 19], 'market'], [[40, 9], 'market'], [[12, 56], 'market'], [[50, 66], 'market'], [[22, 100], 'market'],
    [[59, 57], 'arcade'], [[59, 65], 'arcade'], [[4, 60], 'arcade'], [[40, 33], 'park'], [[24, 86], 'park'], [[8, 5], 'park'], [[50, 92], 'park'], [[NaN, 3], 'plaza']];
  for (const [[x, y], a] of cases) assert.equal(S.areaAt(x, y), a, `${x},${y}`);
  for (let y = 0; y < 106; y++) for (let x = 0; x < 64; x++) assert.ok(S.AREAS.includes(S.areaAt(x, y)));
});

test('track per area; night variant after dark everywhere but the neon arcade', () => {
  for (const a of S.AREAS) assert.equal(S.trackFor(a, 12), a);
  for (const h of [20, 22.5, 0, 4.9]) { assert.equal(S.trackFor('plaza', h), 'night'); assert.equal(S.trackFor('park', h), 'night'); assert.equal(S.trackFor('arcade', h), 'arcade'); }
  for (const h of [5, 7, 19.9]) assert.equal(S.trackFor('market', h), 'market');
  assert.equal(S.trackFor('nowhere', 12), 'plaza');
});

test('tracks are well-formed loops (4 bars x 8 steps) with distinct original names', () => {
  const names = new Set();
  for (const id of S.TRACK_IDS) { const t = S.TRACKS[id]; names.add(t.name);
    assert.equal(t.prog.length, 4); assert.equal(t.bass.length, 8); assert.equal(t.lead.length, 32); assert.match(t.drums, /^[ksh.]{8}$/);
    assert.ok(t.bpm >= 60 && t.bpm <= 140); assert.ok(['sine', 'triangle', 'square'].includes(t.pad) && ['sine', 'triangle', 'square'].includes(t.leadW));
    for (const n of t.lead) assert.ok(n === null || (Number.isInteger(n) && Math.abs(n) <= 24));
    const hz = S.mtof(t.root + 12 + Math.max(...t.lead.filter((n) => n != null))); assert.ok(hz < 2000, 'lead stays soft');
    assert.ok(S.stepLen(t) > 0.2 && S.stepLen(t) < 0.5); }
  assert.equal(names.size, S.TRACK_IDS.length); assert.deepEqual(S.TRACK_IDS, ['plaza', 'market', 'arcade', 'park', 'night']);
  assert.ok(Math.abs(S.mtof(69) - 440) < 1e-9);
});

test('crossfade: linear from current levels, reversing mid-fade never jumps, finished fades go quiet', () => {
  const X = S.makeXfade(2);
  assert.equal(S.xfadeTo(X, 'plaza', 0), true); assert.equal(S.xfadeTo(X, 'plaza', 0.5), false);
  assert.equal(S.xfadeLevels(X, 1).plaza, 0.5); assert.equal(S.xfadeLevels(X, 5).plaza, 1);
  S.xfadeTo(X, 'arcade', 10); let L = S.xfadeLevels(X, 11); assert.ok(Math.abs(L.plaza - 0.5) < 1e-9 && Math.abs(L.arcade - 0.5) < 1e-9);
  assert.deepEqual(S.liveTracks(X, 11).sort(), ['arcade', 'plaza']);
  S.xfadeTo(X, 'plaza', 11); L = S.xfadeLevels(X, 11); assert.ok(Math.abs(L.plaza - 0.5) < 1e-9 && Math.abs(L.arcade - 0.5) < 1e-9, 'no jump on reversal');
  L = S.xfadeLevels(X, 12); assert.ok(Math.abs(L.plaza - 0.75) < 1e-9 && Math.abs(L.arcade - 0.25) < 1e-9);
  assert.deepEqual(S.liveTracks(X, 20), ['plaza']); L = S.xfadeLevels(X, 20); for (const id of S.TRACK_IDS) assert.equal(L[id], id === 'plaza' ? 1 : 0);
  const out = {}; assert.equal(S.xfadeLevels(X, 20, out), out, 'levels written into a reused object (no per-tick allocation)');
});

test('area changes are debounced so the music does not flap on a border', () => {
  const X = S.makeXfade();
  assert.equal(S.wantTrack(X, 'park', 0), true, 'first pick is instant'); assert.equal(X.cur, 'park');
  assert.equal(S.wantTrack(X, 'plaza', 1), false); assert.equal(S.wantTrack(X, 'park', 1.5), false); assert.equal(X.pend, null);
  assert.equal(S.wantTrack(X, 'plaza', 2), false); assert.equal(S.wantTrack(X, 'plaza', 2 + S.AREA_HOLD - 0.01), false);
  assert.equal(S.wantTrack(X, 'plaza', 2 + S.AREA_HOLD), true); assert.equal(X.cur, 'plaza');
});

test('ambient beds follow the sky, the weather and where you stand', () => {
  const day = S.bedLevels({ hour: 12, tx: 40, ty: 33, area: 'park' }), night = S.bedLevels({ hour: 23, tx: 40, ty: 33, area: 'park' });
  assert.ok(day.birds > 0.9 && day.crickets === 0); assert.ok(night.crickets > 0.9 && night.birds === 0); assert.ok(day.breeze > night.breeze);
  const dusk = S.bedLevels({ hour: 19 }); assert.ok(dusk.birds > 0 && dusk.crickets > 0, 'dusk hands over');
  const wet = S.bedLevels({ hour: 12, rain: 1, tx: 40, ty: 33, area: 'park' }); assert.equal(wet.rain, 1); assert.ok(wet.birds < day.birds * 0.3); assert.equal(day.rain, 0);
  const fount = S.bedLevels({ hour: 12, tx: 32, ty: 63, area: 'plaza' }); assert.ok(fount.fountain > 0.8 && fount.murmur > 0.5); assert.equal(day.fountain, 0);
  assert.ok(S.bedLevels({ hour: 12, tx: 23, ty: 99, area: 'market' }).murmur > 0.8, 'farmers market crowd');
  const inside = S.bedLevels({ hour: 12, rain: 1, indoor: true }); for (const k of S.BEDS) assert.equal(inside[k], k === 'rain' ? 0.25 : 0);
  const low = S.bedLevels({ hour: 12, tx: 32, ty: 63, area: 'plaza', low: true }); for (const k of S.BEDS) assert.ok(Math.abs(low[k] - fount[k] * S.LOW_AMB) < 1e-9, k);
  const o = {}; assert.equal(S.bedLevels({ hour: 3 }, o), o);
  for (const [x, y] of [...S.CROWDS, S.FOUNTAIN_AT]) assert.ok(x > 0 && y > 0 && x < 64 && y < 106);
});

test('sound settings persist: mute + separate music / ambience / effects volumes', () => {
  const st = memStore();
  assert.deepEqual(S.loadSettings(st), { ...S.DEFAULTS }); assert.deepEqual(S.loadSettings(undefined), { ...S.DEFAULTS });
  S.saveSettings({ muted: true, music: 0.25, amb: 0, sfx: 1 }, st); assert.deepEqual(S.loadSettings(st), { muted: true, music: 0.25, amb: 0, sfx: 1 });
  st.setItem(S.SETTINGS_KEY, '{oops'); assert.deepEqual(S.loadSettings(st), { ...S.DEFAULTS });
  st.setItem(S.SETTINGS_KEY, JSON.stringify({ muted: 'yes', music: 7, amb: -1, sfx: 'x' })); assert.deepEqual(S.loadSettings(st), { muted: false, music: 1, amb: 0, sfx: S.DEFAULTS.sfx });
  const bad = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
  assert.deepEqual(S.loadSettings(bad), { ...S.DEFAULTS }); assert.doesNotThrow(() => S.saveSettings({ muted: true }, bad));
});

test('audio.js reads saved settings at load and writes mute/volume changes back (no AudioContext needed)', async () => {
  const st = memStore(); st.setItem(S.SETTINGS_KEY, JSON.stringify({ muted: true, music: 0.3, amb: 0.6, sfx: 0.5 }));
  const prev = globalThis.localStorage; globalThis.localStorage = st;
  try { const A = await import('../src/audio.js?persist=' + Date.now());
    assert.equal(A.isMuted(), true); assert.equal(A.audioSettings().music, 0.3);
    A.setMuted(false); A.setVolume('music', 0.9); A.setVolume('sfx', 2); A.setVolume('bogus', 0);
    assert.deepEqual(JSON.parse(st.getItem(S.SETTINGS_KEY)), { muted: false, music: 0.9, amb: 0.6, sfx: 1 });
    A.setScene({ area: 'market', hour: 12, tx: 18, ty: 19 }); const d = A.audioDebug(); assert.equal(d.track, 'market'); assert.equal(d.ctx, 'waiting for tap'); assert.equal(d.area, 'market');
  } finally { globalThis.localStorage = prev; }
});

test('wiring: gesture-only start, hidden-tab suspend, audio-clock scheduling, HUD chip, 4 Hz scene feed', () => {
  const a = src('src/audio.js'), m = src('src/main.js'), u = src('src/soundui.js'), css = src('style.css');
  assert.ok(!/requestAnimationFrame/.test(a), 'audio never runs per frame'); assert.match(a, /setInterval\(schedule, 200\)/);
  assert.match(a, /visibilitychange[^\n]*suspend/); assert.match(a, /st\.next < now \+ 0\.5/);
  const noiseFn = a.slice(a.indexOf('function noise('), a.indexOf('// ---- area music'));
  assert.ok(!/createBuffer\(/.test(noiseFn), 'one shared noise buffer, not one per hit');
  assert.equal((a.match(/new AC\(\)/g) || []).length, 1); assert.ok(!/initAudio\(\)/.test(a.slice(0, a.indexOf('export function initAudio'))), 'audio.js never starts itself');
  assert.match(m, /feedSound\(dt\);/); assert.match(m, /if \(\(sndAcc \+= dt\) < 0\.25\) return;/); assert.match(m, /mountSoundUi\(document/);
  assert.match(m, /addEventListener\('pointerdown', \(\) => initAudio\(\), \{ once: true \}\)/);
  assert.match(u, /clock\.after\(btn\)/); assert.match(u, /audiodebug|debugOn/);
  assert.match(css, /#btn-sound\{/); assert.match(css, /#sound-pop\{position:fixed/);
  for (const f of ['src/soundscape.js', 'src/audio.js', 'src/soundui.js']) assert.ok(!/\.(mp3|ogg|wav|m4a)\b/i.test(src(f)), f + ' uses no sample files');
});

// Inu Quest companions in Inu Verse: read-only bridge, sanitising, Verse-only choice, smooth follow, reactions, light MP sync.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import * as C from '../src/companions.js';
import { emptyLine } from '../src/companionui.js';
import { cleanLook, cleanState, pushSnap, interpolate } from '../src/mpshared.js';
import { createMultiplayer } from '../src/multiplayer.js';
import { save, load, MemoryStorage, SAVE_KEY } from '../src/save.js';
import { TILE, MAP, T, BUILDINGS, doorTile } from '../src/world.js';
const SAMPLE = JSON.parse(readFileSync(new URL('./fixtures/companions-sample.json', import.meta.url)));
const WREN = JSON.parse(readFileSync(new URL('./fixtures/companions-wren-beaten.json', import.meta.url)));
const clone = (o) => JSON.parse(JSON.stringify(o));

test('sanitize: live sample keeps party + locked Wren/Biscuit, sprites only from the Inu Quest companions path', () => {
  const p = C.sanitizeProfile(SAMPLE); assert.ok(p); assert.equal(p.active, 'inu:0');
  const inu = p.companions.filter((c) => c.kind === 'inu'); assert.ok(inu.length >= 1 && inu.length <= 6);
  assert.equal(inu[0].form.id, 'fernshiba'); assert.equal(inu[0].sheet, C.SPRITE_BASE + 'inu/fernshiba.png');
  const wren = p.companions.find((c) => c.id === 'wren-wanderly'), bis = p.companions.find((c) => c.id === 'biscuit');
  assert.equal(wren.unlocked, false); assert.equal(bis.unlocked, false); assert.ok(wren.hint); assert.deepEqual(C.followable(p).map((c) => c.kind), inu.map(() => 'inu'));
  const w = C.sanitizeProfile(WREN); assert.ok(C.followable(w).some((c) => c.id === 'wren-wanderly') && C.followable(w).some((c) => c.id === 'biscuit'));
  for (const c of p.companions) for (const k of Object.keys(c)) assert.ok(['id', 'kind', 'unlocked', 'hint', 'name', 'line', 'form', 'forms', 'level', 'sheet', 'traits'].includes(k), k);
});
test('sanitize: wrong schema / future reader / junk -> null; foreign sprites, bad ids and non-cosmetic fields dropped', () => {
  assert.equal(C.sanitizeProfile(null), null); assert.equal(C.sanitizeProfile('{bad'), null);
  assert.equal(C.sanitizeProfile({ ...SAMPLE, schema: 'other' }), null); assert.equal(C.sanitizeProfile({ ...SAMPLE, minReader: 2 }), null);
  const bad = clone(SAMPLE); bad.companions[0].sprite = { sheet: 'https://evil.example/x.png' }; bad.companions[0].name = '<img src=x onerror=1>Fern';
  bad.companions[0].traits = { coat: '#aabbcc', hp: 999, bones: '10', price: '#123456x' }; bad.companions[0].stats = { atk: 9 }; bad.companions.push({ id: 'inu:9', kind: 'inu', form: { id: 'x' } }, { id: 'biscuit', kind: 'inu' });
  const p = C.sanitizeProfile(bad), f = p.companions[0];
  assert.equal(f.sheet, C.SPRITE_BASE + 'inu/fernshiba.png'); assert.ok(!/[<>]/.test(f.name)); assert.deepEqual(Object.keys(f.traits), ['coat']); assert.equal(f.stats, undefined);
  assert.ok(!p.companions.some((c) => c.id === 'inu:9')); assert.equal(p.companions.filter((c) => c.id === 'biscuit').length, 1);
});
test('load: no session / offline -> null without touching the bridge; bridge failure, timeout or junk -> null, never throws', async () => {
  let calls = 0; const importer = async () => { calls++; return { readCompanions: async () => SAMPLE } };
  assert.equal(await C.loadCompanions({ kp: null, importer }), null); assert.equal(await C.loadCompanions({ kp: { session: null }, importer }), null);
  assert.equal(await C.loadCompanions({ kp: { session: 'tok' }, importer, online: false }), null); assert.equal(calls, 0);
  assert.ok(await C.loadCompanions({ kp: { session: 'tok' }, importer, online: true })); assert.equal(calls, 1);
  assert.equal(await C.loadCompanions({ kp: { session: 't' }, importer: async () => { throw new Error('CORS'); }, online: true }), null);
  assert.equal(await C.loadCompanions({ kp: { session: 't' }, importer: async () => ({}), online: true }), null);
  assert.equal(await C.loadCompanions({ kp: { session: 't' }, importer: async () => ({ readCompanions: async () => { throw new Error('x'); } }), online: true }), null);
  assert.equal(await C.loadCompanions({ kp: { session: 't' }, importer: async () => ({ readCompanions: () => new Promise(() => {}) }), online: true, timeoutMs: 20 }), null);
  assert.equal(await C.loadCompanions({ kp: { session: 't' }, importer: async () => ({ readCompanions: async () => null }), online: true }), null);
});
test('the Inu Quest save is NEVER written: bridge gets a read-only view of the call, choice goes to the Verse save only', async () => {
  const log = [], fetches = [];
  const kp = { session: 'tok', cloudLoad: async (g) => { log.push(['cloudLoad', g]); return null; }, cloudSave: async (...a) => { log.push(['cloudSave', ...a]); }, save: (...a) => log.push(['save', ...a]) };
  const realFetch = globalThis.fetch; globalThis.fetch = async (u, o = {}) => { fetches.push([String(u), (o.method || 'GET').toUpperCase()]); return new Response('null'); };
  const ls = new MemoryStorage(); const iqKey = 'inuquest.save'; ls.setItem(iqKey, '{"party":"untouched"}');
  try {
    let seenKeys = null; const importer = async () => ({ readCompanions: async (k) => { seenKeys = Object.keys(k); assert.ok(Object.isFrozen(k)); assert.equal(k.cloudSave, undefined); assert.equal(k.save, undefined);
      assert.throws(() => { k.cloudSave = () => {}; }); await k.cloudLoad('inu-quest'); await k.cloudLoad('inu-verse'); return SAMPLE; } });
    const prof = await C.loadCompanions({ kp, importer, online: true }); assert.ok(prof);
    const st = { v: 1, player: { coat: 'tan', name: 'Rex', x: 0, y: 0 }, bones: 0 }; C.choose(st, C.followable(prof)[1]); save(st, ls);
    assert.deepEqual(seenKeys, ['session', 'cloudLoad']); assert.deepEqual(log, [['cloudLoad', 'inu-quest']]); // only the bridge's own read (other games not reachable)
    assert.ok(!fetches.some(([u, m]) => m !== 'GET' || /api\/save/.test(u)));
    assert.equal(ls.getItem(iqKey), '{"party":"untouched"}'); const back = load(ls); assert.deepEqual(back.companion, { on: true, id: 'inu:1', line: C.followable(prof)[1].line });
    assert.equal(ls.m.size, 2); assert.ok(ls.m.has(SAVE_KEY));
  } finally { globalThis.fetch = realFetch; }
  // and no code path in the Verse client can do it: no inu-quest writes anywhere in src/
  for (const f of readdirSync(new URL('../src/', import.meta.url))) { if (!f.endsWith('.js')) continue; const s = readFileSync(new URL('../src/' + f, import.meta.url), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(!/cloudSave\s*\(\s*['"`]inu-quest/.test(s), f); assert.ok(!/save\?game=inu-quest/.test(s) || !/PUT/.test(s.match(/.{0,200}save\?game=inu-quest.{0,200}/s)?.[0] || ''), f); }
  const src = readFileSync(new URL('../src/companions.js', import.meta.url), 'utf8') + readFileSync(new URL('../src/companionui.js', import.meta.url), 'utf8');
  assert.ok(!/cloudSave\s*\(|localStorage|setItem|method:\s*['"]PUT|fetch\(/.test(src.replace(/\/\/.*$/gm, '')));
});
test('choice: Verse-save shape, follows the same line after evolution, off when locked/none', () => {
  const st = {}; assert.deepEqual(C.ensureChoice(st), { on: false, id: null, line: null }); const p = C.sanitizeProfile(SAMPLE);
  assert.equal(C.chosen(p, st.companion), null); C.choose(st, p.companions[0]); assert.equal(C.chosen(p, st.companion).id, 'inu:0');
  const evo = clone(SAMPLE); const [a, b] = [evo.companions[0], evo.companions[1]]; evo.companions[0] = { ...b, id: 'inu:0' }; evo.companions[1] = { ...a, id: 'inu:1', form: { ...a.form, id: 'fernhowl', name: 'Fernhowl' }, sprite: { sheet: C.SPRITE_BASE + 'inu/fernhowl.png' } };
  const c = C.chosen(C.sanitizeProfile(evo), st.companion); assert.equal(c.line, a.line); assert.equal(c.form.id, 'fernhowl');
  assert.equal(C.chosen(null, st.companion), null); st.companion.on = false; assert.equal(C.chosen(p, st.companion), null);
  const lock = { on: true, id: 'biscuit', line: null }; assert.equal(C.chosen(p, lock), null); assert.equal(C.chosen(C.sanitizeProfile(WREN), lock).id, 'biscuit');
});
test('follow: trails the owner smoothly, never teleports while walking, snaps on zone hops, pooled trail', () => {
  const p = C.sanitizeProfile(SAMPLE), F = C.makeFollower(), o = { x: 500, y: 500 }; C.resetFollower(F, o, p.companions[0]); const tr = F.tr;
  let maxStep = 0; for (let i = 0; i < 240; i++) { o.x += 1.5; const bx = F.x, by = F.y; C.stepFollow(F, o, 1 / 60); maxStep = Math.max(maxStep, Math.hypot(F.x - bx, F.y - by)); }
  const d = Math.hypot(o.x - F.x, o.y - F.y); assert.ok(d > 18 && d < 45, `gap ${d}`); assert.ok(F.x < o.x); assert.ok(maxStep <= 280 / 60 + 1e-6); assert.equal(F.face, 'right'); assert.equal(F.tr, tr); assert.ok(F.n <= 48);
  for (let i = 0; i < 120; i++) C.stepFollow(F, o, 1 / 60); assert.equal(F.moving, false);
  o.x += 2000; C.stepFollow(F, o, 1 / 60); assert.ok(Math.hypot(o.x - F.x, o.y - F.y) < 30);
  C.stepFollow(F, o, 1 / 60, { back: 56 }); for (let i = 0; i < 200; i++) { o.y += 1.5; C.stepFollow(F, o, 1 / 60, { back: 56 }); } assert.ok(Math.hypot(o.x - F.x, o.y - F.y) > 40);
  const off = C.makeFollower(); C.resetFollower(off, o, p.companions[0]); for (let i = 0; i < 120; i++) C.stepFollow(off, o, 1 / 60, { offset: [20, -10] }); assert.ok(Math.abs(off.x - (o.x + 20)) < 1 && Math.abs(off.y - (o.y - 10)) < 1);
});
test('reactions: water, café, rain, night, buddy; priority + cooldown; reduced motion = no hop', () => {
  assert.equal(C.pickReaction({ water: 1, buddy: 1 }), 'buddy'); assert.equal(C.pickReaction({ water: 1, cafe: 1, rain: 1 }), 'water'); assert.equal(C.pickReaction({ cafe: 1, rain: 1 }), 'cafe');
  assert.equal(C.pickReaction({ rain: 1, dark: 1 }), 'rain'); assert.equal(C.pickReaction({ dark: 1 }), 'night'); assert.equal(C.pickReaction({ dark: 1, moving: 1 }), null);
  let wx = -1, wy = -1; for (let y = 0; y < MAP.length && wx < 0; y++) for (let x = 0; x < MAP[y].length; x++) if (MAP[y][x] === T.WATER) { wx = x; wy = y; break; }
  assert.ok(wx >= 0); assert.equal(C.nearWater((wx + 0.5) * TILE, (wy + 0.5) * TILE), true);
  const cafe = BUILDINGS.find((b) => b.id === 'cafe'), dt = doorTile(cafe); assert.equal(C.nearCafe((dt.tx + 0.5) * TILE, (dt.ty + 1.5) * TILE), true); assert.equal(C.nearCafe(0, 0), false);
  const p = C.sanitizeProfile(SAMPLE), F = C.makeFollower(); C.resetFollower(F, { x: 0, y: 0 }, p.companions[0]);
  assert.equal(C.react(F, { rain: 1 }), 'rain'); assert.equal(F.react, 'rain'); for (let i = 0; i < 200; i++) C.stepFollow(F, { x: 0, y: 0 }, 1 / 60, { rm: false }); assert.equal(F.react, null);
  assert.equal(C.react(F, { rain: 1 }), null); // cooling down
  C.react(F, { water: 1 }); C.stepFollow(F, { x: -18, y: 4 }, 0.1, { rm: false }); const hopOn = F.hop; C.stepFollow(F, { x: -18, y: 4 }, 0.1, { rm: true }); assert.equal(F.hop, 0); assert.ok(hopOn >= 0);
  const G = C.makeFollower(); C.resetFollower(G, { x: 10, y: 0 }, p.companions[1]); assert.equal(C.envFor(F, { others: [F, G] }).buddy, true); assert.equal(C.envFor(F, { others: [F] }).buddy, false);
  assert.equal(C.envFor(F, { rain: 0.8, dark: 0.9 }).rain, true);
});
test('wire: id + form only, survives the deployed cleanLook, rebuilt sprite stays on the Inu Quest path', () => {
  const p = C.sanitizeProfile(WREN); for (const c of C.followable(p)) { const w = C.toWire(c); assert.deepEqual(Object.keys(w), ['cpi', 'cpf']);
    const look = cleanLook({ coat: 'tan', eq: {}, pl: { look: { kennel: 'gold', ...w }, outfit: {} } }); const back = C.fromWire(look.pl.look); assert.equal(back.id, c.id); assert.equal(back.kind, c.kind); assert.equal(back.form?.id ?? null, c.form?.id ?? null); assert.ok(back.sheet.startsWith(C.SPRITE_BASE)); }
  for (const bad of [{ cpi: 'inu-7', cpf: 'x' }, { cpi: 'inu-0', cpf: '../../x' }, { cpi: 'mememon', cpf: 'x' }, {}, null]) assert.equal(C.fromWire(bad), null);
  const F = C.makeFollower(); assert.equal(C.wireOffset(F, { x: 0, y: 0 }), null); F.c = p.companions[0]; F.x = 500.4; F.y = -300; assert.deepEqual(C.wireOffset(F, { x: 0, y: 0 }), [96, -96]);
});
test('state frame: optional cx/cy clamped whole px, absent stays absent, carried through snapshots', () => {
  assert.deepEqual([cleanState({ x: 1, y: 2, cx: 12.6, cy: -400 }).cx, cleanState({ x: 1, y: 2, cx: 12.6, cy: -400 }).cy], [13, -96]);
  const s = cleanState({ x: 1, y: 2 }); assert.equal('cx' in s, false); assert.equal('cx' in cleanState({ x: 1, y: 2, cx: 'a', cy: 3 }), false);
  const rp = { buf: [] }; pushSnap(rp, cleanState({ x: 1, y: 1, cx: -20, cy: 4, ts: 1 }), 1000); pushSnap(rp, cleanState({ x: 3, y: 1, cx: -20, cy: 4, ts: 2 }), 1100); assert.equal(interpolate(rp.buf, 1050).cx, -20);
});
function fakeWS() { const socks = []; class W { constructor(url) { this.url = url; this.readyState = 0; this.sent = []; socks.push(this); } send(s) { this.sent.push(s); } close() { this.readyState = 3; } open() { this.readyState = 1; this.onopen?.(); } recv(o) { this.onmessage?.({ data: JSON.stringify(o) }); } } W.socks = socks; return W; }
test('multiplayer: companion id/form via look, offset via state, cp keys never make a default pup a custom profile', async () => {
  let ms = 0; const L = { room: 'city', x: 100, y: 100, f: 'down', m: false, r: false, d: false, name: 'Rex', look: { coat: 'tan', eq: {}, pl: { look: { cpi: 'inu-0', cpf: 'fernshiba' }, outfit: {} } }, cp: [-18, 4] };
  const WS = fakeWS(), mp = createMultiplayer({ getLocal: () => L, WS, clock: () => ms, now: () => ms / 1000, doc: null }); await mp.start('ws://x'); ms += 16; mp.step(0.016); const ws = WS.socks[0]; ws.open();
  ws.recv({ t: 'w', id: 'me', name: 'Rex', room: 'city', inst: 1, players: [{ id: 'a', name: 'Pal', look: { coat: 'cream', eq: {}, pl: { look: { cpi: 'biscuit', cpf: 'biscuit' }, outfit: {} } }, s: { x: 50, y: 60, f: 'left', ts: 0, cx: 20, cy: -6 } }, { id: 'b', name: 'Solo', look: { coat: 'tan', eq: {} }, s: { x: 80, y: 60, ts: 0 } }] });
  const acts = mp.actors({ x0: 0, y0: 0, x1: 500, y1: 500 }, { x: 0, y: 0 }), a = acts.find((q) => q.id === 'mp:a'), b = acts.find((q) => q.id === 'mp:b');
  assert.equal(a.cp.id, 'biscuit'); assert.deepEqual(a.cpOff, [20, -6]); assert.equal(a.profile, null); assert.equal(a.art, 'layer:cream'); assert.equal(b.cp, null); assert.equal(b.cpOff, null);
  for (let i = 0; i < 30; i++) { ms += 16; L.x += 2; L.m = true; mp.step(0.016); } const st = ws.sent.map((s) => JSON.parse(s)).filter((m) => m.t === 's');
  assert.ok(st.length > 0 && st.every((m) => m.cx === -18 && m.cy === 4)); const raw = ws.sent.join(''); assert.ok(!/fernshiba\.png|sprite|traits|level/.test(raw)); // only ids, never sheets/stats
  const pool = new Map(); C.stepRemotes(pool, acts, 1 / 60); assert.equal(pool.size, 1); assert.ok(pool.has('mp:a')); C.stepRemotes(pool, [b], 1 / 60); assert.equal(pool.size, 0);
});
test('UI copy: graceful empty states, never asks to sign in from the picker; no economy or other-brand words in the feature', () => {
  assert.match(emptyLine('none', false), /sign in/); assert.match(emptyLine('offline', true), /offline/); assert.match(emptyLine('error', true), /unavailable/); assert.match(emptyLine('none', true), /No Inu Quest party/);
  const src = ['companions.js', 'companionui.js'].map((f) => readFileSync(new URL('../src/' + f, import.meta.url), 'utf8')).join('\n').replace(/\/\/.*$/gm, '');
  assert.ok(!/mememon|pok[eé]mon|nintendo|\bbones\b|kibble|prize|award|grant|buy|wallet\.(send|pay)/i.test(src.replace(/same wallet/g, '')), 'no economy/brand hooks');
});

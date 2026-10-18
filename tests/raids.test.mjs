// Boss Raids in Inu Verse: deterministic shared sim, free play for all, auto-entry for Kennel tier / cosmetic holders, skill-only.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import * as B from '../src/bossraid.js';
import * as RD from '../src/raidui.js';
import { interactables, buildMap, KIBBLE_PLAZA, T } from '../src/world.js';
import { bannedIn } from '../src/kibblemood.js';
const memLS = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
function play(boss, stopAt = Infinity) { const r = B.createRaid(boss), inputs = [];
  while (!r.s.over && r.s.tick < stopAt) { const tel = r.telegraph(), bl = r.bossLane(), now = [];
    const want = tel.includes(bl) ? [0, 1, 2, 3, 4].filter((l) => !tel.includes(l)).sort((x, y) => Math.abs(x - r.s.lane) - Math.abs(y - r.s.lane))[0] : bl;
    if (want !== r.s.lane) now.push(want < r.s.lane ? 'L' : 'R'); else if (r.s.cd === 0) now.push('B'); for (const a of now) inputs.push([r.s.tick, a]); r.step(now); }
  return inputs; }

test('sim: same inputs → same result, every boss clearable by skilled play, idle scores 0, no randomness/clock in the rules', () => {
  assert.doesNotMatch(fs.readFileSync('src/bossraid.js', 'utf8'), /Math\.random|Date\.now|performance\.now/);
  for (const b of B.BOSSES) { const i = play(b.id), a = B.simulate(b.id, i); assert.deepEqual(a, B.simulate(b.id, i)); assert.equal(a.cleared, true, b.id); assert.ok(a.score <= B.maxScore(b)); }
  assert.equal(B.simulate('storm-crow', []).score, 0); assert.ok(B.simulate('storm-crow', [[0, 'B'], [6, 'B']]).damage <= 2 * B.BITE.base, 'off-lane bites miss');
  assert.equal(B.simulate('storm-crow', [[3, 'Q']]).ok, false); });

test('live stepper == replay simulation (what the server re-plays is what the player saw)', () => {
  const inputs = play('iron-tomcat'), r = B.createRaid('iron-tomcat'); let i = 0;
  while (!r.s.over) { const now = []; while (i < inputs.length && inputs[i][0] === r.s.tick) now.push(inputs[i++][1]); r.step(now); }
  assert.equal(B.scoreOf(r.s), B.simulate('iron-tomcat', inputs).score); });

test('always-on hourly schedule (UTC hours) cycles all bosses', () => {
  const s = B.schedule(Date.parse('2026-10-18T00:00:00Z'), 8); assert.equal(new Set(s.map((e) => e.boss)).size, B.BOSSES.length); assert.equal(s[1].startMs - s[0].startMs, 3600_000); });

test('auto-entry: Kennel tier or an Inu cosmetic joins once per hour when signed in; guests and non-holders still play free', async () => {
  const calls = []; const api = { join: async () => { calls.push(1); return { ok: true, entry: 'auto:kennel', auto: true }; } };
  const ls = memLS(), now = Date.parse('2026-10-18T07:05:00Z');
  assert.deepEqual(await RD.autoEnter({ api, signedIn: false, kennelTier: 'guard', state: {}, now, ls }), { entered: false, why: 'kennel' });
  assert.equal((await RD.autoEnter({ api, signedIn: true, kennelTier: null, state: { wardrobe: { owned: [] } }, now, ls })).entered, false);
  let r = await RD.autoEnter({ api, signedIn: true, kennelTier: 'guard', state: {}, now, ls }); assert.equal(r.entered, true); assert.equal(r.entry, 'auto:kennel');
  r = await RD.autoEnter({ api, signedIn: true, kennelTier: 'guard', state: {}, now: now + 60_000, ls }); assert.equal(r.already, true); assert.equal(calls.length, 1, 'once per event');
  await RD.autoEnter({ api, signedIn: true, kennelTier: null, state: { wardrobe: { owned: ['top_hat'] } }, now: now + 3600_000, ls }); assert.equal(calls.length, 2, 'next hour, cosmetic holder');
  assert.equal(RD.autoReason({ state: { fly: { cosmetics: ['trail-gold'] } } }), 'cosmetic'); });

test('raid API client sends the SIWS session only as a bearer header and never a score', async () => {
  const seen = []; const f = async (url, o = {}) => { seen.push({ url, o }); return { status: 200, json: async () => ({ ok: true }) }; };
  const api = RD.raidApi({ f, session: () => 'SESSION' }); await api.start(); await api.submit('TK', [[1, 'B']]); await api.event(); await api.inuScore('W');
  assert.equal(seen[0].o.headers.authorization, 'Bearer SESSION'); const sub = JSON.parse(seen[1].o.body); assert.deepEqual(Object.keys(sub).sort(), ['inputs', 'op', 'ticket']);
  assert.equal(seen[2].url, RD.KP + '/api/raid'); assert.equal(seen[3].url, RD.KP + '/api/inu-score?wallet=W'); });

test('panel copy: free entry, skill only, no bets/raffles; no banned words; Raid Gate on a free plaza tile', () => {
  const html = RD.panelHtml({ now: Date.parse('2026-10-18T07:05:00Z'), signedIn: false }) + RD.rulesHtml();
  assert.match(html, /Free entry/); assert.match(html, /No bets, no raffles/); assert.match(html, /Fight \(free\)/); assert.match(html, /Playing as guest/);
  assert.deepEqual(bannedIn(html.replace(/<[^>]+>/g, ' ')), []);
  const it = interactables({}).find((x) => x.id === 'raidgate'); assert.ok(it); const m = buildMap(), R = KIBBLE_PLAZA.raid;
  for (let x = R.x; x < R.x + R.w; x++) assert.equal(m[R.y][x], T.BUILDING); assert.notEqual(m[it.ty][it.tx], T.BUILDING, 'gate is reachable');
  const local = memLS(); RD.keepReplay({ boss: 'storm-crow', score: 5, inputs: [] }, local); for (let i = 0; i < 7; i++) RD.keepReplay({ boss: 'x', score: i, inputs: [] }, local); assert.equal(RD.localReplays(local).length, 5); });

test('shared raid file matches kibble-pay copy byte for byte (when that checkout exists)', (t) => {
  const p = ['/workspace/kibble-pay-mood/public/lib/boss-raid.js', '/workspace/kibble-pay/public/lib/boss-raid.js'].find((f) => fs.existsSync(f)); if (!p) return t.skip('kibble-pay not on this machine');
  assert.equal(fs.readFileSync(p, 'utf8'), fs.readFileSync('src/bossraid.js', 'utf8')); });

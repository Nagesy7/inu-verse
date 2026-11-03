// Daily world events (Alive phase 5): deterministic Sydney-day pick, cosmetic-only rewards with caps, no $KIBBLE paths.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import * as E from '../src/events.js';
import * as GH from '../src/ghosts.js';
import * as TF from '../src/townsfolk.js';
import { isSolid } from '../src/world.js';
import { makeHandler, MIN_SESSION_MS } from '../api/feed.js';
import { readEvents } from '../api/_lib/feed.js';
import { memoryKv } from '../api/_lib/kv.js';
import * as FD from '../src/feed.js';

const D = (y, m, d, h = 2) => Date.UTC(y, m - 1, d, h); // ~13:00 Sydney (AEDT)
const findDay = (id, from = D(2026, 11, 3)) => { for (let k = 0; k < 20; k++) { const t = from + k * 864e5; if (E.eventToday(t).id === id) return t; } throw new Error('no ' + id); };

test('events: one deterministic event per Sydney day, every event once per 5-day cycle, never back-to-back', () => {
  assert.deepEqual([...E.EVENT_IDS], ['market', 'festival', 'trader', 'derby', 'garden']);
  const t = D(2026, 11, 3); assert.equal(E.eventToday(t).id, E.eventToday(t + 3600_000).id, 'same day, same event'); assert.equal(E.eventToday(t).day, '2026-11-03');
  // Sydney midnight (AEDT = UTC+11): 12:59Z is still the 3rd... 13:00Z is the 4th
  assert.equal(E.sydneyDay(Date.UTC(2026, 10, 3, 12, 59)), '2026-11-03'); assert.equal(E.sydneyDay(Date.UTC(2026, 10, 3, 13, 0)), '2026-11-04');
  assert.equal(E.sydneyDay(Date.UTC(2026, 5, 3, 13, 59)), '2026-06-03', 'AEST (UTC+10) in winter'); assert.equal(E.sydneyDay(Date.UTC(2026, 5, 3, 14, 0)), '2026-06-04');
  const d0 = Math.ceil(E.dayNumber('2026-01-01') / 5) * 5, counts = {}; let prev = null, repeats = 0;
  for (let d = d0; d < d0 + 1000; d++) { const id = E.eventForDay(d); assert.ok(E.EVENT_IDS.includes(id)); counts[id] = (counts[id] || 0) + 1; if (id === prev) repeats++; prev = id; }
  assert.equal(repeats, 0, 'no event two days in a row'); for (const id of E.EVENT_IDS) assert.equal(counts[id], 200, id + ' fair share');
  for (let c = Math.ceil(d0 / 5); c < Math.ceil(d0 / 5) + 50; c++) { const s = new Set(); for (let i = 0; i < 5; i++) s.add(E.eventForDay(c * 5 + i)); assert.equal(s.size, 5, 'each cycle has all 5'); }
  assert.equal(E.eventForDay(E.dayNumber('2026-11-03')), E.eventForDay(E.dayNumber('2026-11-03')), 'pure');
});

test('events: ?event= debug override only picks known events; trader spots and scenery are walkable and inside their area', () => {
  assert.equal(E.parseEventParam('?event=festival'), 'festival'); assert.equal(E.parseEventParam('?event=jackpot'), null); assert.equal(E.parseEventParam(''), null); assert.equal(E.parseEventParam('?event=__proto__'), null);
  const f = E.eventToday(D(2026, 11, 3), 'garden'); assert.equal(f.id, 'garden'); assert.equal(f.forced, true);
  for (const s of E.TRADER_SPOTS) { assert.ok(!isSolid(...s.at), 'trader cart on a walkable tile'); assert.equal(GH.spotAt(...s.at), s.area, 'trader spot is inside ' + s.area); assert.ok(GH.SPOT_IDS.includes(s.area)); }
  assert.ok(E.sceneryOk(), 'all visit targets walkable');
  for (const id of E.EVENT_IDS) { const ev = E.eventToday(findDay(id)); assert.equal(ev.id, id); if (id !== 'trader') { assert.ok(GH.SPOT_IDS.includes(ev.def.area), id + ' area is a feed spot'); for (const tg of E.targetsFor(ev)) assert.ok([ev.def.area, null].includes(GH.spotAt(Math.floor(tg.x / 32), Math.floor(tg.y / 32))), id + ' target in its area (or no named spot, which keeps the last one)'); } }
  assert.ok(E.CAPS.confetti <= 40 && E.CAPS.confettiLow === 0, 'cheap capped particles, none in low-effects');
});

test('events: rewards are cosmetic keepsakes earned once, never Bones; trader needs its day, the cart and enough Bones', () => {
  const ev = E.eventToday(findDay('market')), s = { bones: 50 };
  let r; for (const k of [0, 0, 1]) r = E.addProgress(s, ev, 'visit', k); assert.equal(r.earned, undefined, 'a repeat visit does not count'); assert.equal(E.progress(s, ev).n, 2);
  r = E.addProgress(s, ev, 'visit', 2); assert.equal(r.earned, 'apple'); assert.equal(s.bones, 50, 'no Bones granted'); assert.deepEqual(s.evgear.owned, ['apple']);
  assert.equal(E.addProgress(s, ev, 'visit', 3).counted, false, 'done for today'); assert.equal(E.addProgress(s, ev, 'fish').counted, false, 'wrong activity');
  const ev2 = { ...ev, day: '2099-01-01' }; for (const k of [0, 1, 2]) r = E.addProgress(s, ev2, 'visit', k); assert.equal(r.already, 'apple', 'keepsake earned once ever'); assert.deepEqual(s.evgear.owned, ['apple']); assert.equal(s.bones, 50);
  for (const G of Object.values(E.GEAR)) { assert.ok(Number.isInteger(G.price) && G.price >= 0); assert.ok(!/kibble|token|sol|usdc/i.test(G.name)); }
  for (const id of E.EVENT_IDS) { const k = E.EVENTS[id].keepsake; if (k) assert.equal(E.GEAR[k].price, 0, 'participation keepsakes are free'); }
  const notTrader = E.eventToday(findDay('garden')); assert.equal(E.traderBuy({ bones: 999 }, notTrader, 'star', true).ok, false, 'no trader, no sale');
  const tr = E.eventToday(findDay('trader')), b = { bones: 100 };
  assert.equal(E.traderBuy(b, tr, 'star', false).ok, false, 'must be at the cart'); assert.equal(E.traderBuy(b, tr, 'apple', true).ok, false, 'keepsakes are not for sale');
  assert.equal(E.traderBuy(b, tr, 'bonekite', true).ok, false, 'not enough Bones'); assert.equal(b.bones, 100);
  assert.equal(E.traderBuy(b, tr, 'star', true).ok, true); assert.equal(b.bones, 20); assert.equal(E.traderBuy(b, tr, 'star', true).ok, false, 'one each');
  assert.equal(E.traderSwap(b, tr, 'star', 'lantern', true).ok, true, 'free item-for-item swap'); assert.equal(b.bones, 20); assert.deepEqual(b.evgear.owned, ['lantern']);
  assert.equal(E.traderSwap(b, tr, 'lantern', 'bonekite', true).ok, false, 'one swap a day');
  assert.equal(E.carry(b, 'bonekite'), null, 'can only carry what you own'); assert.equal(E.carry(b, 'lantern'), 'lantern');
});

test('events: no $KIBBLE / pay / burn / wager paths anywhere in the event code', () => {
  for (const f of ['src/events.js', 'src/eventsui.js']) { const src = fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8').replace(/\/\/[^\n]*/g, ''); // code only, not the rules in comments
    for (const m of src.matchAll(/import[^'"]*['"]([^'"]+)['"]/g)) assert.ok(!/kibble|pay|burn|cron|district|wallet|swap/i.test(m[1]), f + ' imports ' + m[1]);
    assert.ok(!/swapBonesToKibble|kibblePay|\bburn\(|wager|lottery|entry ?fee/i.test(src), f + ' has no money paths');
    assert.ok(!/(bones|\.bones)\s*\+=/i.test(src), f + ' never adds Bones'); }
});

test('events: townsfolk gather at event spots on event days (walkable, not in doorways)', () => {
  for (const [k, [at]] of Object.entries(TF.SPOTS)) if (/^(mk|fs|dy|gd)\d$/.test(k)) assert.ok(!isSolid(...at), k + ' walkable');
  const ev = E.eventToday(findDay('festival')); assert.doesNotThrow(() => TF.folkAt(0, { h: 14, m: 0 }, {}, ev.id));
});

const call = (h, body, ip = '1.2.3.4') => new Promise((done) => { const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { done({ code: this.statusCode, body: b ? JSON.parse(b) : null }); } };
  h({ method: 'POST', url: '/api/feed', query: {}, headers: { 'x-forwarded-for': ip }, body: JSON.stringify(body) }, res); });
test('events: trader / keepsake feed posts only on the real day, at the event, once per name + item + day', async () => {
  let t = findDay('trader'); const kv = memoryKv(() => t), h = makeHandler({ env: {}, kv, now: () => t, f: async () => ({ ok: false }), sleep: async () => {} });
  const area = E.eventToday(t).spot.area, other = GH.SPOT_IDS.find((a) => a !== area);
  const sid = (await call(h, { op: 'hello', name: 'Rex', coat: 'tan', area })).body.sid; t += MIN_SESSION_MS;
  assert.equal((await call(h, { op: 'event', sid, type: 'trader', area, x: 'kibble' })).code, 400, 'unknown item');
  assert.equal((await call(h, { op: 'event', sid, type: 'keepsake', area, x: 'apple' })).code, 409, 'not the market day');
  assert.equal((await call(h, { op: 'event', sid, type: 'trader', area: other, x: 'star' })).code, 409, 'not at the cart');
  let r = await call(h, { op: 'event', sid, type: 'trader', area, x: 'star' }); assert.equal(r.code, 200);
  t += 5 * 60_000; r = await call(h, { op: 'event', sid, type: 'trader', area, x: 'star' }); assert.equal(r.code, 409, 'once per name + item + day');
  const ev = (await readEvents(kv, t)).filter((e) => e.k === 'trader'); assert.equal(ev.length, 1); assert.equal(FD.eventText(ev[0]), 'Rex bought a Star Balloon from Biscuit the Wandering Trader');
  t = findDay('garden', t); const g = E.eventToday(t); const sid2 = (await call(h, { op: 'hello', name: 'Mochi', coat: 'cream', area: g.def.area }, '5.6.7.8')).body.sid; t += MIN_SESSION_MS;
  assert.equal((await call(h, { op: 'event', sid: sid2, type: 'trader', area: g.def.area, x: 'star' }, '5.6.7.8')).code, 409, 'no trader today');
  r = await call(h, { op: 'event', sid: sid2, type: 'keepsake', area: g.def.area, x: 'sunflower' }, '5.6.7.8'); assert.equal(r.code, 200);
  assert.match(FD.eventText((await readEvents(kv, t)).find((e) => e.k === 'keepsake')), /^Mochi earned a .+ at the Garden Show$/);
});

test('ghost polish: ghosts never idle just above a statue / sign / wall, and every spot still has room', async () => {
  const { KIBBLE_PLAZA: PZ } = await import('../src/world.js');
  assert.ok(GH.blockedBelow(PZ.statue.x, PZ.statue.y - 1), 'right above the statue is skipped');
  for (const id of GH.SPOT_IDS) { const tl = GH.spotTiles(id); assert.ok(tl.length >= 8, id); for (const [x, y] of tl) assert.ok(!isSolid(x, y)); }
  const plaza = GH.spotTiles('plaza'); assert.ok(plaza.every(([x, y]) => !GH.blockedBelow(x, y)), 'plaza ghosts are all in the clear');
});

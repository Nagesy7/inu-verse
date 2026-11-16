// Civic life (preview): Hospital, Fire Station, Police + cartoon pickpockets, chain haulers. Pure + deterministic.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/civic.js';
import { newShift, tap, finishShift, ensureTownx, ZJ, ZJOBS } from '../src/zonejobs.js';
import { brawlResult } from '../src/shops.js';
import { PLACES, placeDoor } from '../src/townx.js';
import { newGame } from '../src/game.js';
import { civicActors, civicProps } from '../src/civicart.js';
const ON = { c: 0.5, w: 0.3 }, OFF = { c: 0.05, w: 0.1 };
const findDay = (pred) => { for (let d = 0; d < 400; d++) if (pred(d)) return d; throw new Error('no day'); };

test('Police Academy, Hospital and Fire Station are places with doors; Beat Patrol is a police job', () => {
  for (const id of ['police', 'hospital', 'firehouse']) assert.ok(placeDoor(id), id);
  assert.equal(PLACES.police.job, 'police'); assert.equal(ZJOBS.police.name, 'Beat Patrol'); assert.equal(PLACES.hospital.civic, 'hospital'); assert.equal(PLACES.firehouse.civic, 'fire');
});
test('job bumps and brawl losses leave an injury that caps shifts at 8x until the Hospital treats it', () => {
  const s = newGame(); const r = newShift('sawmill'); for (let i = 0; i < 12; i++) tap(r, OFF); finishShift(s, r, { day: 'd', skyDay: 3 });
  assert.equal(ensureTownx(s).injury.what, 'a splinter'); assert.equal(C.injuryCap(s), C.INJURED_CAP);
  const r2 = newShift('mine', { cap: C.injuryCap(s) }); for (let i = 0; i < 6; i++) tap(r2, ON); assert.equal(r2.mult, 8);
  const t = C.treat(s, 3); assert.ok(t.ok); assert.match(t.line, /Nurse Poppy/); assert.equal(ensureTownx(s).injury, null); assert.equal(C.injuryCap(s), 0); assert.equal(C.treat(s, 3).ok, false);
  brawlResult(s, 'bakery', false, { skyDay: 4 }); assert.equal(ensureTownx(s).injury.kind, 'brawl'); assert.ok(C.treat(s, 4).ok);
  const r3 = newShift('mine'); for (let i = 0; i < 8; i++) tap(r3, ON); assert.equal(r3.mult, ZJ.MULT_CAP);
});
test('kitchen and forge fires: the crew rolls out and puts them out; the player can put one out early', () => {
  const d = findDay((x) => C.firesOf(x).some((f) => f.kind === 'kitchen')); const f = C.firesOf(d).find((q) => q.kind === 'kitchen');
  assert.ok(['bakery', 'cafe'].includes(f.place));
  assert.equal(C.fireState(f, f.t0 - 1).phase, 'upcoming'); assert.equal(C.fireState(f, f.t0 + 2).phase, 'burning');
  assert.equal(C.fireState(f, f.t0 + C.FIRE_ARRIVE).crew, 1); const late = C.fireState(f, f.t0 + C.FIRE_OUT + 1); assert.equal(late.phase, 'out'); assert.equal(late.by, 'crew');
  const s = newGame(); assert.equal(C.putOut(s, d, f.t0 - 5, f.id).ok, false);
  const r = C.putOut(s, d, f.t0 + 5, f.id); assert.ok(r.ok); assert.match(r.line, /Chief Ember/);
  const st = C.fireState(f, f.t0 + 6, C.savedFires(s, d)); assert.equal(st.phase, 'out'); assert.equal(st.by, 'you'); assert.equal(C.putOut(s, d, f.t0 + 6, f.id).ok, false);
  assert.ok(Array.from({ length: 60 }, (_, i) => C.firesOf(i)).flat().some((q) => q.kind === 'forge' && q.place === 'forge'));
});
test('pickpockets sneak at stalls; Officer Biscuit catches them, or you do first (+5 Bones within the daily cap)', () => {
  const d = 7, c = C.crimesOf(d)[0]; assert.ok(C.STALLS.includes(c.stall)); assert.ok(c.loot && c.thief);
  assert.equal(C.crimeState(c, c.t0 + 1).phase, 'sneaking'); assert.equal(C.crimeState(c, c.t0 + C.SNEAK_S + 1).phase, 'chase');
  const caught = C.crimeState(c, c.t0 + C.SNEAK_S + C.CHASE_S + 1); assert.equal(caught.phase, 'caught'); assert.equal(caught.by, 'police');
  const p = C.thiefPos(c); assert.equal(C.nearThief(d, c.t0 + 1, {}, p.x, p.y).id, c.id); assert.equal(C.nearThief(d, c.t0 + 1, {}, p.x + 300, p.y), null);
  const s = newGame(), b0 = s.bones || 0; const r = C.catchThief(s, d, c.t0 + 3, c.id, 'day1'); assert.ok(r.ok); assert.equal(r.paid, C.CATCH_BONES); assert.equal(s.bones, b0 + C.CATCH_BONES);
  const after = C.crimeState(c, c.t0 + 4, C.savedCaught(s, d)); assert.equal(after.phase, 'caught'); assert.equal(after.by, 'you'); assert.equal(C.catchThief(s, d, c.t0 + 4, c.id, 'day1').ok, false);
  ensureTownx(s).jobDay = { day: 'day1', bones: ZJ.DAILY_CAP }; const c2 = C.crimesOf(d)[1]; const r2 = C.catchThief(s, d, c2.t0 + 1, c2.id, 'day1'); assert.ok(r2.ok); assert.equal(r2.paid, 0, 'cap holds');
  const txt = JSON.stringify(C.crimesOf(d)) + JSON.stringify(C.THIEVES); for (const bad of ['$', 'kibble', 'wallet', 'cash', 'money', 'bet', 'lottery']) assert.ok(!txt.toLowerCase().includes(bad), bad);
});
test('farm, fishery and quarry haulers walk their chain each worked hour and are home by 17:00', () => {
  assert.deepEqual(C.HAULERS.map((h) => h.good), ['wheat', 'fish', 'stone']);
  for (const h of C.HAULERS) { assert.equal(C.haulerAt(h, 6 * 60).visible, false); assert.equal(C.haulerAt(h, 17 * 60 + 5).visible, false);
    const a = C.haulerAt(h, 10 * 60 + 2), b = C.haulerAt(h, 10 * 60 + 18), c = C.haulerAt(h, 10 * 60 + 33);
    assert.equal(a.kind, 'load'); assert.equal(b.kind, 'haul'); assert.equal(b.carry, h.good); assert.equal(c.kind, 'drop'); assert.equal(c.trips, 4); }
});
test('civic art lists the thief, officer and fire chief at the right moments', () => {
  const d = findDay((x) => C.firesOf(x).length > 0), f = C.firesOf(d)[0];
  assert.ok(civicActors({ skyDay: d, sec: f.t0 + C.FIRE_ARRIVE + 1, t: 0 }).some((a) => a.civic === 'ember')); assert.equal(civicProps({ skyDay: d, sec: f.t0 + 3, t: 0 }).length >= 1, true);
  const c = C.crimesOf(7)[0]; assert.ok(civicActors({ skyDay: 7, sec: c.t0 + 1, t: 0 }).some((a) => a.civic === 'thief:' + c.id));
  assert.ok(civicActors({ skyDay: 7, sec: c.t0 + C.SNEAK_S + 3, t: 0 }).some((a) => a.civic === 'officer'));
});

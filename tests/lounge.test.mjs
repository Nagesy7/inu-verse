import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/game.js';
import { BUILDINGS, doorTile } from '../src/world.js';
import { SCENES, scene, DOOR_SCENES, sceneForDoor } from '../src/scenes.js';
import { HOLDER_THRESHOLD_U } from '../src/fly5.js';
import { toU } from '../src/mall.js';
import {
  LOUNGE_ID, LORE_PLAQUES, QUEST_COSMETICS, RIVAL_BEATS, NIGHT_ROUTE_TIPS,
  GATE_THRESHOLD_U, ensureLounge, loungeGate, balUFromUi,
  extractQuestSave, rivalFromSave, silhouettesFromCompanions, silhouettesFromSave,
  nightWatchFromSave, partyDisplay, cosmeticsRack, loreHearth, phaseForWatch,
} from '../src/lounge.js';
import { readFileSync } from 'node:fs';

test('lounge building sits past free Trainer Gate; portal not gated in DOOR_SCENES', () => {
  const L = BUILDINGS.find((b) => b.id === 'lounge');
  assert.ok(L);
  assert.equal(L.name, '$KIBBLE Holder Lounge');
  assert.ok(L.x > 2); // east of quest portal column
  assert.equal(DOOR_SCENES['building:lounge'], 'lounge');
  assert.equal(sceneForDoor({ kind: 'building', id: 'lounge' }), 'lounge');
  assert.equal(sceneForDoor({ kind: 'gamedoor', id: 'quest' }), null); // free portal stays external
  const sc = scene('lounge');
  assert.equal(sc.name, '$KIBBLE Holder Lounge');
  assert.ok(sc.spots.length >= 6);
  const ids = new Set(sc.spots.map((s) => s.act?.opts?.tab || s.id));
  for (const t of ['gallery', 'night', 'rival', 'kennel', 'lore', 'rack']) assert.ok([...sc.spots].some((s) => s.act?.opts?.tab === t), t);
});

test('gate matches Mall VIP 100K/$1M bar; demo short fails; kennel tier opens', () => {
  assert.equal(GATE_THRESHOLD_U, HOLDER_THRESHOLD_U);
  const s = newGame();
  s.kibble = 0;
  let g = loungeGate(s, { balU: toU(0), signedIn: true, demo: true });
  assert.equal(g.ok, false);
  g = loungeGate(s, { balU: GATE_THRESHOLD_U, signedIn: true, demo: true });
  assert.equal(g.ok, true);
  g = loungeGate(s, { balU: toU(0), signedIn: true, kennelTier: 'pup', demo: false });
  assert.equal(g.ok, true);
  assert.equal(balUFromUi('1,000.5'), toU(1000.5));
  assert.equal(balUFromUi('soon'), null);
});

test('rivalFromSave reads Quest step4 rivalStory (REX) + legacy flags', () => {
  const empty = rivalFromSave(null);
  assert.equal(empty.name, 'REX');
  assert.equal(empty.stub, true);
  assert.ok(empty.line.includes('Quest'));

  const G = {
    rival: 'REX',
    rivalSp: 'emberpup',
    badges: ['pebble', 'ripple'],
    flags: { beat_rival_intro: true, rival2: true, beat_rival2: true, mange_woods: true },
    rivalStory: {
      name: 'REX', sp: 'emberpup', stage: 2,
      met: { intro: true, route3: true, route8: false },
      beaten: { intro: true, route3: true, route8: false },
    },
  };
  const rv = rivalFromSave(G);
  assert.equal(rv.name, 'REX');
  assert.equal(rv.beaten.route3, true);
  assert.equal(rv.beaten.route8, false);
  assert.equal(rv.next.id, 'route8');
  assert.equal(rv.lastBeat.id, 'route3');
  assert.equal(rv.badges, 2);
  assert.equal(RIVAL_BEATS.length, 3);
});

test('silhouettes + party empty states are honest', () => {
  assert.equal(silhouettesFromCompanions(null).status, 'empty');
  assert.equal(silhouettesFromSave(null).status, 'empty');
  const prof = {
    companions: [{
      id: 'inu:0', kind: 'inu', unlocked: true, name: 'Emberpup', line: 'emberpup',
      form: { id: 'emberpup', name: 'Emberpup', stage: 1, final: false },
      forms: [
        { id: 'emberpup', name: 'Emberpup', stage: 1, current: true },
        { id: 'flarehound', name: 'Flarehound', stage: 2, current: false },
      ],
      sheet: 'https://inu-quest.vercel.app/companions/v1/inu/emberpup.png',
    }],
  };
  const sil = silhouettesFromCompanions(prof);
  assert.equal(sil.status, 'ready');
  assert.equal(sil.entries[0].forms.length, 2);
  const party = partyDisplay(prof, null);
  assert.equal(party.slots.length, 1);
});

test('night watch only tips walked routes; lore mirrors Quest plaques', () => {
  assert.equal(phaseForWatch('sunset'), 'dusk');
  assert.equal(phaseForWatch('night'), 'night');
  const empty = nightWatchFromSave(null, 'night');
  assert.equal(empty.status, 'empty');
  const G = { flags: { got_starter: true, mange_woods: true }, badges: ['ripple'] };
  const nw = nightWatchFromSave(G, 'night');
  assert.equal(nw.status, 'ready');
  assert.ok(nw.tips.some((t) => t.id === 'bramble'));
  assert.ok(nw.tips.some((t) => t.id === 'mtkibble'));
  assert.ok(!nw.tips.some((t) => t.id === 'route8')); // needs beat_rival3
  assert.equal(LORE_PLAQUES.length, 3);
  assert.deepEqual(LORE_PLAQUES.map((p) => p.id), ['listen', 'heartbeat', 'bridge']);
  const lore = loreHearth([]);
  assert.match(lore.plaques[0].body, /WAGHIRE/);
  assert.match(lore.plaques[1].body, /heartbeat/);
  assert.match(lore.plaques[2].body, /bridge/);
});

test('cosmetic rack is looks/trail only; no creatures/stats', () => {
  assert.ok(QUEST_COSMETICS.length >= 8);
  for (const c of QUEST_COSMETICS) {
    assert.ok(c.kind === 'look' || c.kind === 'trail');
    assert.ok(!/creature|stat|xp|badge/i.test(c.name));
  }
  const rack = cosmeticsRack({ 'look-ranger': true });
  assert.equal(rack.items.find((i) => i.id === 'look-ranger').owned, true);
  assert.match(rack.line, /cosmetic/i);
  assert.match(rack.shopUrl, /kibble-pay/);
});

test('extractQuestSave reads inuquest-save; ensureLounge persists seats/plaques', () => {
  const cloud = { data: { 'inuquest-save': JSON.stringify({ rival: 'REX', flags: {}, party: [] }) } };
  const G = extractQuestSave(cloud);
  assert.equal(G.rival, 'REX');
  const s = newGame();
  const L = ensureLounge(s);
  assert.equal(L.sat, false);
  assert.ok(Array.isArray(L.seenPlaques));
});

test('src never writes Inu Quest save from lounge modules', () => {
  for (const f of ['src/lounge.js', 'src/loungeui.js']) {
    const src = readFileSync(f, 'utf8')
      .split('\n')
      .map((ln) => ln.replace(/\/\/.*$/, ''))
      .join('\n');
    assert.doesNotMatch(src, /cloudSave\s*\(\s*['"`]inu-quest/);
    assert.doesNotMatch(src, /\bPUT\b[^\n]*inu-quest/);
  }
  assert.ok(NIGHT_ROUTE_TIPS.length >= 4);
  assert.equal(LOUNGE_ID, 'lounge');
});

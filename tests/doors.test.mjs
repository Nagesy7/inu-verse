import test from 'node:test';
import assert from 'node:assert/strict';
import { TILE, GAME_DOORS, ARCADE, COMMUNITY, MAP, T, NETWORK, isSolid, findPath, interactables, doorList, doorDir } from '../src/world.js';
import { makeDoorState, doorStep, doorExit, outsideOf, DOOR_COOLDOWN } from '../src/doors.js';
import { places } from '../src/guide.js';
const GAMES = { 'Inu Quest': 'https://inu-quest.vercel.app/', 'Inu Rescue': 'https://inu-rescue.vercel.app/', 'Inu Empires': 'https://aoe2-ashen.vercel.app/', PepeBallz: 'https://pepeballz.vercel.app/', 'Meme Brawl': 'https://meme-brawl.vercel.app/', 'Kibble Pay': 'https://kibble-pay.vercel.app/', 'Inu Arcade': 'https://inu-arcade.vercel.app/' };
test('every game has a building with a reachable door, a Places entry and a correct link', () => {
  const all = [...GAME_DOORS, ARCADE], ids = new Set(places(null).map((p) => p.id));
  for (const [name, url] of Object.entries(GAMES)) { const g = all.find((b) => b.url === url); assert.ok(g, name + ' has no building');
    assert.ok(isSolid(g.x + 1, g.y + 1)); assert.ok(!isSolid(g.door.tx, g.door.ty)); assert.ok(findPath(4, 19, g.door.tx, g.door.ty), 'reach ' + name); assert.ok(ids.has(g.id), name + ' missing from Places');
    assert.ok(NETWORK.has(MAP[g.door.ty][g.door.tx]), name + ' door off the road/path network'); }
  assert.ok(!JSON.stringify(all).includes('meme-kombat'), 'old Meme Brawl link');
  assert.match(COMMUNITY.url, /^https:\/\/t\.me\/\+L1LZkNnEsAA2M2Jl$/); assert.ok(interactables(null).some((i) => i.kind === 'community')); });
const at = (d, face, moving = true) => ({ x: (d.tx + 0.5) * TILE, y: (d.ty + 0.5) * TILE, face, moving });
test('walking into a door enters it; standing or facing away does not', () => { const doors = doorList(null), d = doors.find((x) => x.id === 'memebrawl'), st = makeDoorState();
  assert.equal(doorStep(st, at(d, 'down'), doors, 10), null); assert.equal(doorStep(st, at(d, 'up', false), doors, 10), null); assert.equal(doorStep(st, at(d, 'up'), doors, 10)?.id, 'memebrawl');
  const side = doors.find((x) => x.side === 'left' || x.side === 'right'); if (side) { const s2 = makeDoorState(); assert.equal(doorStep(s2, at(side, doorDir(side).face), doors, 5)?.id, side.id); } });
test('no re-trigger on exit: must step off the door tile and wait out the cooldown', () => { const doors = doorList(null), d = doors.find((x) => x.id === 'bank'), st = makeDoorState();
  assert.ok(doorStep(st, at(d, 'up'), doors, 1)); doorExit(st, 2);
  for (let t = 2; t < 6; t += 0.1) assert.equal(doorStep(st, at(d, 'up'), doors, t), null, 'still on tile');
  const o = outsideOf(d); assert.ok(!isSolid(Math.floor(o.x / TILE), Math.floor(o.y / TILE)), 'spawn outside is walkable'); assert.ok(Math.floor(o.y / TILE) !== d.ty || Math.floor(o.x / TILE) !== d.tx, 'spawn is off the door tile');
  doorExit(st, 10); doorStep(st, { ...o, moving: true }, doors, 10.1); assert.equal(doorStep(st, at(d, 'up'), doors, 10.2), null, 'cooldown right after exit'); doorStep(st, { ...o, moving: true }, doors, 12); assert.ok(doorStep(st, at(d, 'up'), doors, 12.1), 're-enters after stepping off'); });
test('every door has a walkable spawn tile outside it', () => { for (const d of doorList(null)) { const o = outsideOf(d); assert.ok(!isSolid(Math.floor(o.x / TILE), Math.floor(o.y / TILE)), d.id); } });

import test from 'node:test'; import assert from 'node:assert/strict';
import { GAME_DOORS, isSolid, findPath, interactables } from '../src/world.js';
test('Rescue Station + Trainer Gate: solid buildings, walkable reachable doors, listed as interactables', () => {
  assert.deepEqual(GAME_DOORS.map((g) => g.id), ['rescue', 'quest']);
  for (const g of GAME_DOORS) { assert.equal(isSolid(g.x + 1, g.y + 1), true, g.id); assert.equal(isSolid(g.door.tx, g.door.ty), false, g.id); assert.ok(findPath(4, 19, g.door.tx, g.door.ty), 'reach ' + g.id);
    assert.ok(interactables().some((i) => i.kind === 'gamedoor' && i.id === g.id && i.tx === g.door.tx && i.ty === g.door.ty)); assert.match(g.url, /^https:\/\/inu-(rescue|quest)\.vercel\.app\/$/); }
});

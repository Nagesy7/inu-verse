import test from 'node:test';
import assert from 'node:assert/strict';
import { MAP, MAP_W, MAP_H, T, NETWORK, DIRT_LINKS, interactables, isSolid } from '../src/world.js';
const reachesRoad = (sx, sy) => { const seen = new Set([sy * MAP_W + sx]), q = [[sx, sy]];
  while (q.length) { const [x, y] = q.pop(); if (MAP[y][x] === T.ROAD) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = ny * MAP_W + nx; if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H || seen.has(k) || !NETWORK.has(MAP[ny][nx])) continue; seen.add(k); q.push([nx, ny]); } } return false; };
test('every key door / interactable stands on the road network and links to a road', () => {
  for (const it of interactables(null)) { assert.ok(NETWORK.has(MAP[it.ty][it.tx]), `${it.name} not on road/path`); assert.ok(reachesRoad(it.tx, it.ty), `${it.name} not connected to a road`); } });
test('dirt paths are walkable and were actually laid', () => { assert.ok(DIRT_LINKS.length >= 10); let n = 0;
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (MAP[y][x] === T.DIRT) { n++; assert.ok(!isSolid(x, y), `dirt ${x},${y} solid`); } assert.ok(n >= DIRT_LINKS.length); });

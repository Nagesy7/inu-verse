import test from 'node:test';
import assert from 'node:assert/strict';
import { stackNameTag } from '../src/art.js';

test('close name tags stack instead of occupying the same pixels', () => {
  const crumb = { x: 100, y: 40, w: 48, h: 12 };
  const taken = [crumb];
  const kabosu = stackNameTag({ x: 108, y: 42, w: 64, h: 12 }, taken);
  const overlap = kabosu.x < crumb.x + crumb.w && kabosu.x + kabosu.w > crumb.x && kabosu.y < crumb.y + crumb.h && kabosu.y + kabosu.h > crumb.y;
  assert.equal(overlap, false);
  assert.ok(kabosu.y + kabosu.h <= crumb.y);
  const third = stackNameTag({ x: 104, y: 41, w: 40, h: 12 }, [crumb, kabosu]);
  const hit = [crumb, kabosu].some((t) => third.x < t.x + t.w && third.x + third.w > t.x && third.y < t.y + t.h && third.y + third.h > t.y);
  assert.equal(hit, false);
});

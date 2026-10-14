import test from 'node:test'; import assert from 'node:assert/strict';
const W = await import('../src/world.js');
test('Inu Arcade sits on the Mall plaza edge, solid, with a walkable door facing the path', () => { const A = W.ARCADE;
  for (let y = A.y; y < A.y + A.h; y++) for (let x = A.x; x < A.x + A.w; x++) assert.ok(W.isSolid(x, y), `solid ${x},${y}`);
  assert.ok(!W.isSolid(A.door.tx, A.door.ty), 'door tile walkable'); assert.equal(A.door.ty, A.y + A.h); assert.ok(A.door.tx >= A.x && A.door.tx < A.x + A.w);
  assert.ok(!W.isSolid(A.door.tx, A.door.ty + 1) || !W.isSolid(A.door.tx - 1, A.door.ty), 'door connects to the plaza');
  const it = W.interactables(null).find((i) => i.kind === 'arcade'); assert.ok(it); assert.deepEqual([it.tx, it.ty], [A.door.tx, A.door.ty]);
  for (const b of W.MALL_BUILDINGS) assert.ok(A.x >= b.x + b.w || A.x + A.w <= b.x || A.y >= b.y + b.h || A.y + A.h <= b.y, 'no overlap ' + b.id); });

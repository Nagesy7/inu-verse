import { test } from 'node:test'; import assert from 'node:assert'; import { roomZoom } from '../src/roomplay.js'; import { scene } from '../src/scenes.js';
test('Kibble Mall fits phone landscape at zoom 2 (capped, never below 1x); desktop and zones unchanged', () => {
  const mall = scene('mall'); assert.ok(mall && mall.kind !== 'zone');
  for (const [w, h] of [[844, 390], [740, 360], [667, 375]]) { const z = roomZoom(2, mall, w, h); assert.ok(z >= 1 && z < 2); assert.ok(mall.w * 32 * z <= w && (mall.h * 32 * z <= h || z === 1), `${w}x${h} z=${z}`); }
  assert.equal(roomZoom(2, mall, 1280, 800), 2); assert.equal(roomZoom(1, mall, 667, 375), 1); assert.equal(roomZoom(2, { kind: 'zone', w: 60, h: 40 }, 667, 375), 2);
});

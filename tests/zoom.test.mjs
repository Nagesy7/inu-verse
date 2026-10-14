import test from 'node:test'; import assert from 'node:assert/strict';
const { ZOOMS, stepZoom, clampCam } = await import('../src/zoom.js');
test('zoom steps between crisp integer-native levels and clamps at the ends', () => { for (const z of ZOOMS) assert.ok(Number.isInteger(2 * z * 2) || 2 * z >= 1); assert.equal(stepZoom(2, -1), 1); assert.equal(stepZoom(1, -1), 0.5); assert.equal(stepZoom(0.5, -1), 0.5); assert.equal(stepZoom(0.5, 1), 1); assert.equal(stepZoom(2, 1), 2); });
test('camera clamps to map edges and centres small maps', () => { assert.deepEqual(clampCam(0, 0, 640, 400, 2048, 3392), { x: 320, y: 200 }); assert.deepEqual(clampCam(5000, 5000, 640, 400, 2048, 3392), { x: 1728, y: 3192 }); assert.deepEqual(clampCam(10, 10, 2560, 1600, 2048, 1000), { x: 1024, y: 500 }); });

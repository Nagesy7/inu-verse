// The frozen static scan used by the browser panel and /api/sim-audit must match the code. Regenerate: node scripts/sim-audit.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import { scan } from '../scripts/sim-scan.mjs';
const { STATIC } = await import('../src/sim/audit-static.js');
test('src/sim/audit-static.js is fresh (run `node scripts/sim-audit.mjs` after editing src/sim/** or api/sim*)', () => {
  assert.deepEqual(STATIC, JSON.parse(JSON.stringify(scan(new URL('..', import.meta.url).pathname)))); });

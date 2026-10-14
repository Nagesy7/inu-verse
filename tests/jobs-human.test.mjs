import test from 'node:test'; import assert from 'node:assert/strict';
const J = await import('../src/jobs.js'); const { human } = await import('./humansim.mjs');
// a simulated real person: 250ms reaction lag, aim jitter, 10% missed inputs, ~0.1s timing error, 30fps
test('every game is playable by a real person: human-sim earns at least 60% of the pay cap on several seeds', () => {
  for (const id of Object.keys(J.JOBS)) for (const seed of [3, 7, 11]) { const g = human(id, seed), p = J.payFor(id, g, false); assert.ok(p.perf >= J.JOBS[id].cap * 0.6, `${id} seed ${seed}: ${p.perf}/${J.JOBS[id].cap}`); } });

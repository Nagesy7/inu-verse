// Paw Audit Bureau in the world: roster, colours, desk placement, the API route, and no vendor edits.
import test from 'node:test'; import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
const W = await import('../src/world.js'); const { TILE, BUREAU } = await import('../src/sim/place.js');
const { WATCHDOGS, ROLE_COUNTS, COLORS } = await import('../src/sim/roster.js'); const { memberPose, bureauProps } = await import('../src/sim/bureauart.js');
const root = new URL('..', import.meta.url).pathname;
test('seven Watchdogs: 1 chief, 2 economy, 2 justice, 1 systems, 1 red-team; violet + silver', () => { assert.equal(WATCHDOGS.length, 7);
  const c = {}; for (const m of WATCHDOGS) c[m.role] = (c[m.role] || 0) + 1; assert.deepEqual(c, ROLE_COUNTS); assert.equal(COLORS.violet, '#7B4FD6'); assert.equal(COLORS.silver, '#C9CED6');
  assert.equal(new Set(WATCHDOGS.map((m) => m.name)).size, 7); const owned = WATCHDOGS.flatMap((m) => m.owns).sort((a, b) => a - b); assert.deepEqual(owned, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]); });
test('desk sits beside the President\'s Office, is solid, and its spot is reachable from the plaza', () => { assert.equal(TILE, W.TILE);
  const off = W.MALL_BUILDINGS.find((b) => b.id === 'office'); assert.ok(Math.abs(BUREAU.x + BUREAU.w - off.x) <= 4 && BUREAU.y >= off.y && BUREAU.y < off.y + off.h);
  for (let x = BUREAU.x; x < BUREAU.x + BUREAU.w; x++) assert.ok(W.isSolid(x, BUREAU.y)); assert.ok(!W.isSolid(BUREAU.tx, BUREAU.ty));
  assert.ok(W.findPath(32, 70, BUREAU.tx, BUREAU.ty), 'reachable from the forecourt'); const it = W.nearestInteractable({}, (BUREAU.tx + 0.5) * TILE, (BUREAU.ty + 0.5) * TILE); assert.equal(it.kind, 'bureau'); });
test('the banner pole is solid (Phase 2 fix b) and the desk spot stays reachable', () => { assert.ok(W.isSolid(Math.floor(BUREAU.flag.x), Math.floor(BUREAU.flag.y))); assert.ok(W.findPath(32, 70, BUREAU.tx, BUREAU.ty)); });
test('the desk does not block any existing door or spot', () => { const others = W.interactables({}).filter((i) => i.kind !== 'bureau'); for (const o of others) assert.ok(!(o.ty === BUREAU.y && o.tx >= BUREAU.x && o.tx < BUREAU.x + BUREAU.w), o.name); });
test('members stand and patrol on walkable plaza, move smoothly (no jumps), and never use randomness', () => {
  for (const m of WATCHDOGS) { let last = memberPose(m, 0); for (let t = 0.05; t < 40; t += 0.05) { const p = memberPose(m, t); assert.ok(Math.hypot(p.x - last.x, p.y - last.y) < 3, `${m.name} jumped at ${t}`); assert.ok(!W.isSolid(Math.floor(p.x / TILE), Math.floor(p.y / TILE)), `${m.name} in a wall at ${t}`); last = p; }
    assert.deepEqual(memberPose(m, 12.3), memberPose(m, 12.3)); } });
test('bureauProps draws with the injected Shiba renderer (desk, flag, 7 members)', () => { const calls = []; const c = new Proxy({}, { get: (t, k) => k === 'measureText' ? () => ({ width: 10 }) : typeof k === 'string' ? (t[k] ?? (() => {})) : undefined, set: (t, k, v) => { t[k] = v; return true; } });
  const props = bureauProps(1, { drawShiba: (...a) => calls.push(a[3]) }, { x: (BUREAU.tx + 0.5) * TILE, y: (BUREAU.ty + 0.5) * TILE }); assert.equal(props.length, 9); for (const p of props) p.d(c);
  assert.equal(calls.length, 7); assert.ok(calls.every((o) => o.art.startsWith('layer:') && o.scale === 1.5)); assert.ok(calls.some((o) => o.name)); });
test('GET /api/sim-audit returns the ranked report; anything else is 405', async () => { const { default: h } = await import('../api/sim-audit.js');
  const run = async (method) => { const r = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b; } }; await h({ method }, r); return r; };
  const g = await run('GET'), j = JSON.parse(g.body); assert.equal(g.statusCode, 200); assert.equal(j.checks.length, 12); assert.equal(j.summary.checks.pass, 12); assert.equal(j.to, 'Zachary Nagle'); assert.ok(j.findings.length > 0);
  assert.ok(!/UPSTASH|_TOKEN|KV_REST|PINATA/.test(g.body), 'no env/secrets in the report');
  for (const m of ['POST', 'PUT', 'DELETE']) assert.equal((await run(m)).statusCode, 405); });
test('src/vendor/inu-avatar.js is untouched by the sim work', () => { const d = execSync('git diff --name-only origin/master -- src/vendor/inu-avatar.js', { cwd: root }).toString().trim(); assert.equal(d, ''); });

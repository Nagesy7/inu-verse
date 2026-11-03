// Building graphics v2, round 2: four distinct homes, the Holder Lounge (velvet + gold) and the Kibble Mall go through the
// cached painters; the facade camera lift keeps tall signs clear of the HUD at 844x390.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as BG from '../src/bldgfx.js';
import { FUNC } from '../src/facadeart.js';
import { NPC_HOMES, MALL_BUILDINGS, BUILDINGS, TILE } from '../src/world.js';
import { facadeDoors, liftTarget, doorWeight, HUD_SAFE, FOOT_SAFE } from '../src/facadecam.js';

const fakeCtx = (log) => new Proxy({ canvas: null, globalAlpha: 1, getTransform: () => null }, { get: (o, k) => (k in o ? o[k] : (...a) => { if (log) log.push(k); if (k === 'fillRect' && a.some((v) => !Number.isFinite(v))) throw new Error('non-finite ' + a); return k === 'createRadialGradient' || k === 'createLinearGradient' ? { addColorStop() {} } : k === 'measureText' ? { width: 10 } : undefined; }) });
const factory = (w, h) => ({ width: w, height: h, ctx: fakeCtx(), getContext() { return this.ctx; } });
const reset = () => { BG.setCanvasFactory(factory); for (const k of Object.keys(BG.STATS)) BG.STATS[k] = 0; };
const V = [{ night: 0, wet: false, low: false, t: 1 }, { night: 1, wet: false, low: false, t: 2 }, { night: 0.4, wet: true, low: false, t: 3 }, { night: 1, wet: false, low: true, t: 0 }];
const src = (f) => fs.readFileSync(new URL('../src/' + f, import.meta.url), 'utf8');

test('homes h1-h4 each have their own painter + palette and paint in every variant', () => {
  reset(); const styles = new Set();
  for (const h of NPC_HOMES) { assert.ok(BG.PAINTERS[h.id], h.id); assert.ok(BG.HOME_F[h.id], h.id); styles.add(BG.HOME_F[h.id].style);
    for (const v of V) assert.equal(BG.drawBuilding(fakeCtx(), h, BG.HOME_F[h.id], { view: null, ...v }), true, h.id);
    const log = []; BG.PAINTERS[h.id].paint(fakeCtx(log), h, BG.HOME_F[h.id], { night: false }, { x: h.x * TILE, y: h.y * TILE, w: h.w * TILE, h: h.h * TILE, base: (h.y + h.h) * TILE, dx: (h.x + 3.5) * TILE });
    assert.ok(log.length > 300, `${h.id} is detailed (${log.length} ops)`); }
  assert.equal(styles.size, NPC_HOMES.length, 'every house is a different style');
  assert.deepEqual([...styles].sort(), ['cottage', 'machiya', 'modern', 'townhouse']);
  assert.match(src('render.js'), /drawBuilding\(c, h, HOME_F\[h\.id\]\)/, 'render.js routes homes through the painter');
});

test('Holder Lounge: velvet + gold painter beats the legacy storefront and is wired through facadeart', () => {
  reset(); const L = MALL_BUILDINGS.find((b) => b.id === 'lounge') || BUILDINGS.find((b) => b.id === 'lounge'); assert.ok(L);
  for (const v of V) assert.equal(BG.drawBuilding(fakeCtx(), L, FUNC.lounge, { view: null, ...v }), true);
  const s = src('bldgfx.js'); assert.match(s, /\$KIBBLE HOLDER LOUNGE/); assert.match(s, /HOLDERS ONLY/); assert.match(s, /VELVET/);
  BG.drawBuilding(fakeCtx(), L, FUNC.lounge, { view: null, night: 1, wet: false, low: false, t: 0 }); assert.ok(BG.drawBuildingGlow(fakeCtx(), 0, 0, 1) >= 2, 'marquee + windows glow at night');
  assert.match(src('facadeart.js'), /V2_ONLY = new Set\(\['lounge'\]\)/);
});

test('Kibble Mall keeps its legacy art (called inside the cached layer) and adds depth/life on top', () => {
  reset(); const M = MALL_BUILDINGS.find((b) => b.id === 'mall'); let legacy = 0;
  for (const v of V) assert.equal(BG.drawBuilding(fakeCtx(), M, { wall: '#f4efe4', legacy: () => { legacy++; } }, { view: null, ...v }), true);
  assert.ok(legacy >= 3, 'legacy art painted into each cached variant'); assert.equal(BG.drawBuilding(fakeCtx(), M, {}, { view: null, night: 0, wet: false, low: false, t: 0 }), true, 'falls back without legacy');
  assert.match(src('luxury.js'), /drawBuilding\(c, MALL, \{ \.\.\.MALL_F, legacy/);
});

test('facadecam: front doors resolved, lift only near doors, never lowers, respects HUD + feet safe zones', () => {
  const D = facadeDoors(); const ids = D.map((d) => d.id); for (const id of ['h1', 'h2', 'h3', 'h4', 'lounge', 'mall', 'cafe']) assert.ok(ids.includes(id), id);
  for (const d of D) { assert.ok(Number.isFinite(d.x) && Number.isFinite(d.y) && d.top < d.y, d.id); }
  const h2 = D.find((d) => d.id === 'h2'), L = D.find((d) => d.id === 'lounge');
  const px = h2.x, py = h2.y + 18; assert.equal(doorWeight(px, py, h2), 1); assert.equal(doorWeight(px + 4 * TILE, py, h2), 0);
  assert.equal(liftTarget(py, px + 10 * TILE, py, D, 2, 390), py, 'far from doors: untouched');
  for (const [Z, SH] of [[2, 390], [1, 390], [2, 844], [0.5, 390]]) for (const d of [h2, L]) {
    const y = liftTarget(d.y + 18, d.x, d.y + 18, [d], Z, SH); assert.ok(y <= d.y + 18, 'only lifts');
    const feetScreen = (d.y + 18 - y) * Z + SH / 2; assert.ok(feetScreen <= SH - FOOT_SAFE + 0.5, `feet clear of the pads z${Z}`);
    if (y < d.y + 18) { const topScreen = (d.top - y) * Z + SH / 2; assert.ok(topScreen >= HUD_SAFE - 0.5 || feetScreen >= SH - FOOT_SAFE - 0.5, 'either the facade clears the HUD or the lift is maxed'); } }
  // 844x390 at 1x zoom (½x label): whole home facade clears the HUD row from the door tile
  const y1 = liftTarget(h2.y + 18, h2.x, h2.y + 18, D, 1, 390); assert.ok((h2.top - y1) + 195 >= HUD_SAFE - 0.5);
  assert.match(src('main.js'), /liftTarget\(p\.y \+ fy \* lead \* 0\.6, p\.x, p\.y, FDOORS, ZOOM, innerHeight\)/);
});

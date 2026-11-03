// Building graphics v2 (src/bldgfx.js): every building paints without throwing, the static layer is cached per
// building + variant, only the animated overlay is redrawn per frame, reduced effects freeze animation, off-screen is culled.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as BG from '../src/bldgfx.js';
import { FUNC, TYPED_IDS, drawTypedFacade } from '../src/facadeart.js';
import { BUILDINGS, MALL_BUILDINGS, BANK, ARCADE, CLUBHOUSE, NPC_HOMES } from '../src/world.js';
import { ALIVE } from '../src/alive.js';

const fakeCtx = (log) => { const t = { canvas: null, globalAlpha: 1, getTransform: () => null };
  return new Proxy(t, { get: (o, k) => (k in o ? o[k] : (...a) => { if (log) log.push(k); if (k === 'fillRect' && a.some((v) => !Number.isFinite(v))) throw new Error('non-finite rect ' + a); return k === 'createRadialGradient' || k === 'createLinearGradient' ? { addColorStop() {} } : undefined; }), set: (o, k, v) => ((o[k] = v), true) }); };
let made = 0;
const factory = (w, h) => { made++; const cv = { width: w, height: h, ctx: fakeCtx(), getContext() { return this.ctx; } }; return cv; };
const reset = () => { BG.setCanvasFactory(factory); made = 0; for (const k of Object.keys(BG.STATS)) BG.STATS[k] = 0; };
const ALL = [...BUILDINGS, ...MALL_BUILDINGS, BANK, ARCADE, { ...CLUBHOUSE, name: 'Pack Clubhouse' }, ...NPC_HOMES];
const opt = (o = {}) => ({ view: null, night: 0, wet: false, low: false, t: 1.25, ...o });

test('every building type paints day / night / rain / low-fx without throwing, plus unknown ids', () => {
  reset();
  const extra = [{ id: 'designer', name: 'Royal Paws Designer', x: 46, y: 49, w: 8, h: 6 }, { id: 'mystery-hut', name: 'Mystery Hut', x: 3, y: 3, w: 3, h: 3 }, { id: 'nameless', x: 1, y: 1, w: 1, h: 1 }];
  for (const b of [...ALL, ...extra]) for (const v of [opt(), opt({ night: 1 }), opt({ night: 0.5, wet: true }), opt({ low: true, night: 1 })]) {
    const c = fakeCtx(); assert.doesNotThrow(() => BG.drawBuilding(c, b, FUNC[b.id], v), b.id);
    assert.equal(BG.drawBuilding(c, b, FUNC[b.id], v), true, `${b.id} handled`);
    BG.setCanvasFactory(() => null); assert.equal(BG.drawBuilding(fakeCtx(), b, FUNC[b.id], v), true, `${b.id} direct paint path`); BG.setCanvasFactory(factory);
  }
  assert.equal(BG.drawBuilding(fakeCtx(), null, null), false, 'garbage in = false, never throws');
  assert.equal(BG.drawBuilding(fakeCtx(), { id: 'x', x: NaN, y: 0, w: 2, h: 2 }), false);
  // a painter that blows up is contained (render.js then falls back to the legacy art)
  BG.PAINTERS.__boom = { paint() { throw new Error('boom'); } }; const warn = console.warn; console.warn = () => {};
  try { assert.equal(BG.drawBuilding(fakeCtx(), { id: '__boom', x: 1, y: 1, w: 2, h: 2 }, null, opt()), false); } finally { console.warn = warn; delete BG.PAINTERS.__boom; }
});

test('every typed façade id has a v2 painter, and drawTypedFacade routes through it', () => {
  for (const id of TYPED_IDS) assert.ok(BG.PAINTERS[id], `${id} has a painter`);
  assert.ok(BG.PAINTERS.bank && BG.PAINTERS.arcade);
  reset(); const b = MALL_BUILDINGS.find((q) => q.id === 'jewel'); globalThis.__bldgFx = 'full';
  try { assert.equal(drawTypedFacade(fakeCtx(), b), true); assert.ok(BG.STATS.misses >= 1, 'went through the cached painter'); } finally { delete globalThis.__bldgFx; }
  assert.match(fs.readFileSync(new URL('../src/doorart.js', import.meta.url), 'utf8'), /drawBuilding\(c, g, FUNC\.bank\)/);
  assert.match(fs.readFileSync(new URL('../src/arcadeart.js', import.meta.url), 'utf8'), /drawBuilding\(c, ARCADE, FUNC\.arcade\)/);
});

test('cache: static layer painted once per building + variant, then each frame is a blit + small overlay', () => {
  reset(); const b = BUILDINGS.find((q) => q.id === 'cafe'), F = FUNC.cafe;
  for (let i = 0; i < 200; i++) BG.drawBuilding(fakeCtx(), b, F, opt({ t: i / 60 }));
  assert.equal(BG.STATS.misses, 1, '200 frames = 1 static paint'); assert.equal(BG.STATS.hits, 199); assert.equal(made, 1);
  assert.equal(BG.STATS.blits, 200); assert.equal(BG.STATS.anims, 200, 'steam overlay runs each frame');
  const keys = new Set([BG.cacheKey(b, { night: false }), BG.cacheKey(b, { night: true }), BG.cacheKey(b, { night: false, wet: true }), BG.cacheKey(b, { night: false, low: true })]);
  assert.equal(keys.size, 4, 'key covers night / wet / low');
  BG.drawBuilding(fakeCtx(), b, F, opt({ night: 1 })); assert.equal(BG.STATS.misses, 2, 'night variant cached separately');
  BG.drawBuilding(fakeCtx(), b, F, opt({ night: 0.5 })); assert.equal(BG.STATS.misses, 2, 'dusk crossfades the two cached layers, no repaint'); assert.equal(BG.STATS.blits, 203);
  for (const q of ALL) BG.drawBuilding(fakeCtx(), q, FUNC[q.id], opt()); assert.ok(BG.CACHE.size <= 36, 'LRU bounded');
  // the overlay is much cheaper than the static layer
  const statLog = [], animLog = []; BG.PAINTERS.cafe.paint(fakeCtx(statLog), b, F, { night: false }, { x: 96, y: 384, w: 256, h: 192, base: 576, dx: 144 });
  BG.PAINTERS.cafe.anim(fakeCtx(animLog), b, F, 1, { x: 96, y: 384, w: 256, h: 192, base: 576, dx: 144 });
  assert.ok(animLog.length * 20 < statLog.length, `overlay ${animLog.length} ops vs static ${statLog.length}`);
});

test('reduced effects: no per-frame animation; one still pose is baked into the cached layer', () => {
  reset(); const launch = BUILDINGS.find((q) => q.id === 'launch');
  for (let i = 0; i < 30; i++) BG.drawBuilding(fakeCtx(), launch, FUNC.launch, opt({ low: true, t: i }));
  assert.equal(BG.STATS.anims, 0); assert.equal(BG.STATS.misses, 1);
  const k = BG.cacheKey(launch, { night: false, wet: false, low: true }); assert.ok(BG.CACHE.has(k), 'low-fx layer cached under its own key');
  // env detection: ?fx=low / localStorage / auto low-fps / override
  globalThis.__bldgFx = 'low'; assert.equal(BG.fxLow(), true); globalThis.__bldgFx = 'full'; assert.equal(BG.fxLow(), false); delete globalThis.__bldgFx;
  globalThis.__inu = { sky: { pool: { low: true } } }; assert.equal(BG.fxLow(), true, 'auto low-fps from the shared sky pool'); delete globalThis.__inu;
  const ls = globalThis.localStorage; globalThis.localStorage = { getItem: (key) => (key === 'inuverse.fx' ? 'low' : null) };
  try { assert.equal(BG.fxLow(), true, 'localStorage inuverse.fx=low'); } finally { if (ls === undefined) delete globalThis.localStorage; else globalThis.localStorage = ls; }
  reset(); ALIVE.t = 3; globalThis.__bldgFx = 'low';
  try { BG.drawBuilding(fakeCtx(), launch, FUNC.launch, { view: null, night: 0, wet: false }); assert.equal(BG.STATS.anims, 0, 'env low-fx disables the overlay'); } finally { delete globalThis.__bldgFx; }
});

test('off-screen buildings are culled before any paint; on-screen ones are drawn', () => {
  reset(); const cafe = BUILDINGS.find((q) => q.id === 'cafe');
  BG.drawBuilding(fakeCtx(), cafe, FUNC.cafe, opt({ view: { x0: 5000, y0: 5000, x1: 5400, y1: 5200 } }));
  assert.equal(BG.STATS.culled, 1); assert.equal(BG.STATS.misses, 0); assert.equal(BG.STATS.anims, 0);
  BG.drawBuilding(fakeCtx(), cafe, FUNC.cafe, opt({ view: { x0: 0, y0: 300, x1: 422, y1: 500 } })); assert.equal(BG.STATS.misses, 1);
  // view derived from the live transform (dpr * zoom, camera translate)
  const c = fakeCtx(); c.canvas = { width: 844, height: 390 }; c.getTransform = () => ({ a: 2, d: 2, e: -2 * 4000, f: -2 * 4000 });
  BG.drawBuilding(c, cafe, FUNC.cafe, { night: 0, wet: false, low: false, t: 0 }); assert.equal(BG.STATS.culled, 2);
});

test('night: lit windows + signs are re-added after the grade, then the list clears', () => {
  reset(); const shop = BUILDINGS.find((q) => q.id === 'shop'); const log = [];
  BG.drawBuilding(fakeCtx(), shop, FUNC.shop, opt({ night: 1 }));
  const n = BG.drawBuildingGlow(fakeCtx(log), 0, 0, 1); assert.ok(n >= 6, `glow rects ${n}`); assert.ok(log.includes('fillRect'));
  assert.equal(BG.drawBuildingGlow(fakeCtx(), 0, 0, 1), 0, 'consumed per frame');
  BG.drawBuilding(fakeCtx(), shop, FUNC.shop, opt({ night: 0 })); assert.equal(BG.drawBuildingGlow(fakeCtx(), 0, 0, 1), 0, 'no glow by day');
  assert.match(fs.readFileSync(new URL('../src/ambient.js', import.meta.url), 'utf8'), /drawBuildingGlow\(c, ox, oy, lit\)/);
});

test('pixel font covers every sign label; icons exist; no trademarked names in signage', () => {
  const labels = [...ALL.map((b) => b.name || ''), 'KIBBLE BANK', 'INU', 'ARCADE', 'MUNCH STAR PUPS ROAD HOP BRICKS', 'NEXT LAUNCH', 'SERVICE', 'MENU', 'SALE', 'NEW', 'OPEN', 'FINE GEMS - GOLD - PEARLS', 'H2O'];
  for (const s of labels) assert.ok(BG.ptw(s, 1) > 0 || !s.trim(), s);
  for (const n of ['cup', 'sofa', 'hanger', 'rocket', 'wheel', 'cap', 'diamond', 'chair', 'star', 'paw', 'lamp', 'crown', 'joystick', 'coin', 'bone']) assert.ok(BG.ICON_NAMES.includes(n), n);
  const src = fs.readFileSync(new URL('../src/bldgfx.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /nintendo|pok[eé]mon|mortal kombat|mememon|pac-?man|tetris|frogger|galaga/i);
});

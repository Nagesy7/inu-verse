// Seasons (src/seasons.js), seasonal decorations (src/seasondecor.js + bldgfx cache key), seasonal hats (src/seasonhats.js,
// src/outfits.js) and seasonal townsfolk. Sydney dates, southern hemisphere; Bones/free only, no $KIBBLE pricing.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as SN from '../src/seasons.js';
import * as SD from '../src/seasondecor.js';
import * as BG from '../src/bldgfx.js';
import { headAnchor, paintHat, HAT_KINDS, hatPad } from '../src/seasonhats.js';
import { OUTFITS, buyOutfit, seasonalNow } from '../src/outfits.js';
import { folkSeasonOutfit, FOLK_SEASON_HAT, makeTownsfolk } from '../src/townsfolk.js';
import { BUILDINGS, NPC_HOMES } from '../src/world.js';
import { FUNC } from '../src/facadeart.js';

const syd = (y, m, d, h = 12) => Date.UTC(y, m - 1, d, h) - 11 * 3600e3; // AEDT noon-ish
const at = (y, m, d) => SN.currentSeason(syd(y, m, d));
const withSeason = (v, f) => { const o = globalThis.__season; globalThis.__season = v; globalThis.__seasonDirty = true; try { return f(); } finally { if (o === undefined) delete globalThis.__season; else globalThis.__season = o; globalThis.__seasonDirty = true; } };

test('seasons: southern hemisphere months, Sydney date, holiday windows', () => {
  assert.equal(at(2026, 11, 3).season, 'spring'); assert.equal(at(2026, 11, 3).holiday, null); assert.equal(at(2026, 11, 3).theme, 'spring');
  assert.equal(at(2027, 1, 20).season, 'summer'); assert.equal(at(2027, 4, 20).season, 'autumn'); assert.equal(at(2027, 7, 1).season, 'winter');
  assert.equal(at(2026, 10, 30).theme, 'halloween'); assert.equal(at(2026, 12, 10).theme, 'xmas'); assert.equal(at(2026, 12, 31).theme, 'newyear'); assert.equal(at(2027, 1, 2).theme, 'newyear');
  assert.equal(at(2027, 2, 8).theme, 'lunar'); assert.equal(at(2027, 3, 26).theme, 'easter');
  assert.deepEqual(SN.easterSunday(2026), { m: 4, d: 5 }); const e = SN.easterSunday(2027); assert.equal(e.m, 3); assert.equal(e.d, 28);
  // Sydney, not UTC: 2026-10-23 14:30 UTC is already Oct 24 in Sydney -> Halloween window open
  assert.equal(SN.currentSeason(Date.UTC(2026, 9, 23, 14, 30)).theme, 'halloween');
  assert.deepEqual(SN.sydneyYMD(Date.UTC(2026, 9, 23, 14, 30)), { y: 2026, m: 10, d: 24 });
});

test('seasons: ?season= / __season override with aliases, none, and memo refresh', () => {
  withSeason('christmas', () => { const S = SN.seasonTheme(); assert.equal(S.theme, 'xmas'); assert.equal(S.forced, true); assert.ok(SN.inSeason('xmas')); });
  withSeason('lny', () => assert.equal(SN.seasonTheme().theme, 'lunar'));
  withSeason('none', () => assert.equal(SN.seasonTheme().theme, 'none'));
  withSeason('bogus', () => assert.ok(SN.THEMES.includes(SN.seasonTheme().theme)));
  for (const t of SN.THEMES) assert.ok(SN.THEME_LABEL[t], t);
});

test('decorations: baked into the building cache, keyed by theme; every theme paints every building', () => {
  const fake = () => new Proxy({ globalAlpha: 1, getTransform: () => null }, { get: (o, k) => (k in o ? o[k] : (...a) => { if (k === 'fillRect' && a.some((v) => !Number.isFinite(v))) throw new Error('NaN rect ' + a); }), set: (o, k, v) => ((o[k] = v), true) });
  BG.setCanvasFactory((w, h) => ({ width: w, height: h, c: fake(), getContext() { return this.c; } }));
  const b = BUILDINGS.find((q) => q.id === 'cafe');
  const keys = new Set(['xmas', 'halloween', null].map((theme) => BG.cacheKey(b, { night: false, theme }))); assert.equal(keys.size, 3, 'theme is part of the cache key');
  const all = [...BUILDINGS.filter((q) => FUNC[q.id]), ...NPC_HOMES];
  for (const theme of [...SN.THEMES, null]) for (const q of all) for (const night of [0, 1]) BG.drawBuilding(fake(), q, FUNC[q.id], { view: null, night, wet: false, low: false, t: 2, theme });
  BG.clearCache(); for (const k of Object.keys(BG.STATS)) BG.STATS[k] = 0;
  for (let i = 0; i < 20; i++) BG.drawBuilding(fake(), b, FUNC.cafe, { view: null, night: 0, wet: false, low: false, t: i, theme: 'xmas' });
  assert.equal(BG.STATS.misses, 1, 'decorated layer painted once, then blitted');
  // decorate() really draws for every decor theme, and lights glow at night
  for (const th of SD.DECOR_THEMES) { let n = 0, glows = 0; const c = new Proxy({}, { get: (o, k) => (k in o ? o[k] : () => { n++; }), set: (o, k, v) => ((o[k] = v), true) });
    assert.ok(SD.decorate(c, b, { x: 96, y: 384, w: 256, h: 192, base: 576, dx: 160 }, { theme: th, night: true }, { R: () => n++, A: (c, a, f) => f(), emit: () => glows++ }), th); assert.ok(n > 10, th);
    if (['xmas', 'winter', 'newyear', 'halloween'].includes(th)) assert.ok(glows > 0, th + ' lights glow'); }
  assert.equal(SD.decorate({}, b, { x: 0, y: 0, w: 64, h: 64, base: 64 }, { theme: 'none' }, {}), false);
});

test('plaza centrepiece: one prop per theme, none when off, queues night glow', () => {
  const c = new Proxy({}, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => ((o[k] = v), true) });
  for (const th of SD.DECOR_THEMES) { const ps = SD.plazaCentreProps(1.5, th, {}); assert.equal(ps.length, 1); ps[0].d(c); }
  assert.deepEqual(SD.plazaCentreProps(1, 'none'), []); assert.deepEqual(SD.plazaCentreProps(1, null), []);
  let got = null; SD.plazaCentreProps(1, 'xmas', { night: 1, glow: (r, k) => (got = [r, k]) })[0].d(c); assert.ok(got && got[0].length > 3 && got[1] === 1);
  got = null; SD.plazaCentreProps(1, 'xmas', { night: 0, glow: (r) => (got = r) })[0].d(c); assert.equal(got, null, 'no glow by day');
  assert.match(fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8'), /plazaCentreProps\(time, seasonTheme\(\)\.theme/);
});

test('seasonal hats: anchor + every kind paints; Bones/free only; sold only in season; owned stay wearable', () => {
  const W = 40, H = 60, d = new Uint8ClampedArray(W * H * 4); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const ear = y < 6 && (x < 14 && x > 8 || x > 26 && x < 32), body = y >= 6 && x > 6 && x < 34; if (ear || body) d[(y * W + x) * 4 + 3] = 255; }
  const a = headAnchor(d, W, H); assert.ok(a && Math.abs(a.cx - 20) <= 1 && a.y >= 6 && a.hw >= 4, JSON.stringify(a)); assert.ok(hatPad(a) > a.hw);
  for (const k of HAT_KINDS) for (const v of ['front', 'side', 'back']) { let n = 0; paintHat({ set fillStyle(_) {}, fillRect: (...r) => { assert.ok(r.every(Number.isFinite)); n++; } }, { proc: k }, a, v); assert.ok(n > 3, k + v); }
  const seas = Object.entries(OUTFITS).filter(([, d]) => d.season); assert.ok(seas.length >= 6);
  for (const [id, d] of seas) { assert.equal(d.slot, 'hat'); assert.ok(HAT_KINDS.includes(d.look.proc), id); assert.ok(Number.isInteger(d.price) && d.price >= 0 && d.price <= 100, id); assert.ok(SN.THEMES.includes(d.season)); assert.ok(!('kibble' in d) && !('usd' in d)); }
  assert.ok(seas.some(([, d]) => d.price === 0), 'at least one free claim');
  withSeason('halloween', () => { const s = { bones: 500, wardrobe: { owned: [], equipped: {} } };
    assert.equal(buyOutfit(s, 'ss_santa').ok, false, 'xmas hat not sold at Halloween'); assert.equal(s.bones, 500);
    assert.equal(buyOutfit(s, 'ss_witch').ok, true); assert.equal(s.bones, 500 - OUTFITS.ss_witch.price); assert.ok(seasonalNow().includes('ss_witch')); });
  withSeason('xmas', () => { const s = { bones: 0, wardrobe: { owned: [], equipped: {} } }; assert.equal(buyOutfit(s, 'ss_santa').ok, true, 'free claim with 0 bones'); assert.equal(s.bones, 0); });
  const src = ['seasons', 'seasonhats', 'seasondecor'].map((f) => fs.readFileSync(new URL(`../src/${f}.js`, import.meta.url), 'utf8')).join('\n');
  assert.doesNotMatch(src, /\$KIBBLE|kibble-pay|wager|\bfee\b|\bbet\b/i);
});

test('seasonal townsfolk: every other local wears the theme hat; off-season unchanged', () => {
  for (const [th, hat] of Object.entries(FOLK_SEASON_HAT)) { assert.ok(OUTFITS[hat], hat); assert.equal(folkSeasonOutfit({ neck: 'bowtie' }, 0, th).hat, hat); assert.equal(folkSeasonOutfit({ neck: 'bowtie' }, 1, th).hat, undefined); }
  assert.equal(makeTownsfolk('xmas').F[0].a.outfit.hat, 'ss_santa'); assert.notEqual(makeTownsfolk().F[0].a.outfit.hat, 'ss_santa');
  assert.match(fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8'), /makeTownsfolk\(seasonTheme\(\)\.theme\)/);
  const o = { hat: 'cap_red' }; assert.equal(folkSeasonOutfit(o, 0, 'none'), o); assert.equal(folkSeasonOutfit(o, 0, 'autumn'), o);
});

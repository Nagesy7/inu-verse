import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FUNC, CAT_COLOR, TYPED_IDS, catStyle } from '../src/facadeart.js';

test('every typed outdoor building has a function color identity', () => {
  for (const id of TYPED_IDS) {
    assert.ok(FUNC[id], `FUNC.${id}`);
    for (const k of ['wall', 'roof', 'accent', 'trim', 'signBg', 'sign', 'tag']) assert.ok(FUNC[id][k], `${id}.${k}`);
  }
});

test('function colors are unique enough (no shared cream hub chrome on buildings)', () => {
  const creamish = (hex) => { const n = parseInt(hex.slice(1), 16); const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; return r > 220 && g > 200 && b > 170 && Math.abs(r - g) < 40; };
  for (const id of TYPED_IDS) {
    assert.equal(creamish(FUNC[id].wall), false, `${id} wall must not be cream hub chrome`);
  }
  // café warm vs cars sporty vs fashion playful vs bank serious — walls differ
  assert.notEqual(FUNC.cafe.wall, FUNC.cars.wall);
  assert.notEqual(FUNC.cafe.wall, FUNC.fashion.wall);
  assert.notEqual(FUNC.cars.accent, FUNC.fashion.accent);
  assert.equal(FUNC.bank.tag, 'serious');
  assert.equal(FUNC.arcade.tag, 'bright-neon');
  assert.equal(FUNC.cafe.tag, 'warm');
  assert.equal(FUNC.cars.tag, 'sporty');
  assert.equal(FUNC.fashion.tag, 'playful');
});

test('shop category colors cover mall cats', () => {
  for (const cat of ['outfit', 'jewelry', 'furniture', 'car', 'pets', 'furn_cosy', 'furn_royal']) {
    const s = catStyle(cat);
    assert.ok(s.border && s.bg && s.chip && s.label, cat);
  }
  assert.equal(CAT_COLOR.outfit.border, FUNC.fashion.wall);
});

test('render.js prefers typed façades over generic PNG/storefront', () => {
  const src = fs.readFileSync(new URL('../src/render.js', import.meta.url), 'utf8');
  assert.match(src, /drawTypedFacade/);
  assert.match(src, /from '\.\/facadeart\.js'/);
  assert.match(src, /if \(drawTypedFacade\(c, b\)\) return/);
});

test('main.js color-codes mall and shop item cards', () => {
  const src = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(src, /catStyle/);
  assert.match(src, /cat-chip/);
  assert.match(src, /catStyle\('outfit'\)/);
  assert.match(src, /catStyle\('car'\)/);
  assert.match(src, /catStyle\('furniture'\)/);
  assert.match(src, /catStyle\('pets'\)/);
});

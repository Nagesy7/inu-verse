import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as R from '../src/district-rent.js';
import * as UI from '../src/districtrentui.js';
import * as D from '../src/districts.js';
import { scene, solidAt } from '../src/scenes.js';

R.setDistrictRentEnabled(true);

test('main.js imports district-rent, ticks it on the in-game day, and opens booth / explain / growth panels', () => {
  const src = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(src, /import \* as DR from '\.\/district-rent\.js'/);
  assert.match(src, /import \* as XC from '\.\/explaincard\.js'/);
  assert.match(src, /import \* as GR from '\.\/growth\.js'/);
  assert.match(src, /DR\.tickDay\(state,/);
  assert.match(src, /kind === 'boothrent'/);
  assert.match(src, /kind === 'explain'/);
  assert.match(src, /kind === 'growth'/);
  assert.match(src, /bk-explain/);
  assert.match(src, /mall-explain/);
  assert.ok(!/vercel --prod/.test(src));
});

test('each district has a walkable lease desk two tiles east of its kiosk; cabinets stay free', () => {
  const sc = scene('districts');
  for (const d of D.DISTRICTS) {
    const spot = sc.spots.find((s) => s.id === 'lease-' + d.id);
    assert.ok(spot, d.id);
    assert.equal(spot.act.panel, 'boothrent');
    assert.equal(spot.act.opts.district, d.id);
    const [tx, ty] = UI.leaseTile(d);
    assert.equal(spot.tx, tx); assert.equal(spot.ty, ty);
    assert.ok(!solidAt(sc, tx, ty), d.id + ' lease tile walkable');
    assert.ok(sc.spots.some((s) => s.id === 'kiosk-' + d.id && (s.tx !== tx || s.ty !== ty)));
  }
  for (const c of D.CABINETS.filter((x) => x.live)) assert.ok(D.doorUrl(c), c.id);
  assert.match(D.SCENE.spots.find((s) => s.id === 'sign-arcade-row').act.say, /Want a nameplate\? Lease a plaque for Bones/);
});

test('lease panel is Bones-only, lists 15/35/50/80 offers, never mentions paying with $KIBBLE', () => {
  const s = { bones: 500 };
  const html = UI.panelHtml(s, 'arcade-row');
  assert.match(html, /Cosmetic booth only\. Cabinets stay free/);
  assert.match(html, /Sidewalk Plaque/);
  assert.match(html, /15 Bones \/ day/);
  assert.match(html, /Booth Skin/);
  assert.match(html, /35 Bones \/ day/);
  assert.match(html, /Venue Banner/);
  assert.match(html, /80 Bones \/ day/);
  assert.ok(!/pay with \$KIBBLE|\$KIBBLE rent|wallet sign/i.test(html));
  const arena = UI.panelHtml(s, 'arena');
  assert.match(arena, /District Kiosk/);
  assert.match(arena, /50 Bones \/ day/);
  const dark = UI.panelHtml(s, 'fud-field');
  assert.match(dark, /No booth class is offered/);
});

test('wiring never skims a pool or moves tokens; HUD tooltips and bank/mall “?” are present', () => {
  assert.equal(R.POOL_SHARE, 0);
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.ok(!/POOL_SHARE/.test(main));
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /Play currency\. Earn in Verse\. Never cash out\./);
  assert.match(html, /Cosmetics only\. You sign in your wallet\. Not a prize boost\./);
  const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  assert.match(css, /@media \(orientation:landscape\) and \(max-height:430px\)/);
  assert.match(css, /\.explain-card/);
  assert.match(css, /\.growth-card/);
});

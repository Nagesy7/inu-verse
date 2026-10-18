// Shop interiors (src/interiors.js, src/interiorart.js, api/home.js op "shop"): editor, validation, owner-only, income unchanged,
// cached-layer redraws, and that Bigger Shelves / Window Display keep their existing rules.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import * as IN from '../src/interiors.js';
import * as B from '../src/biz.js';
import * as HS from '../src/homeshare.js';
import { createShopLayer } from '../src/interiorart.js';
import { makeHandler } from '../api/home.js';
import { memoryKv } from '../api/_lib/kv.js';
import { mulberry32 } from '../src/rng.js';

const st = () => ({ bones: 5000, kibble: 0, player: { name: 'Kabosu' }, stats: {} });
const leased = (type = 'bakery', lot = 'P1') => { const s = st(); assert.ok(B.lease(s, lot, type, 'Shop', 0).ok); IN.ensureInterior(s); return s; };
const call = (h, { method = 'POST', body, shop, raw, ip = '1.2.3.4' }) => new Promise((done) => { const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { done({ code: this.statusCode, body: b ? JSON.parse(b) : null }); } };
  h({ method, url: '/api/home' + (shop ? '?shop=' + shop : ''), query: shop ? { shop } : {}, headers: { 'x-forwarded-for': ip }, body: raw ?? (body && JSON.stringify(body)) }, res); });
const mk = () => { let t = 1_800_000_000_000; const kv = memoryKv(() => t); return { kv, h: makeHandler({ env: {}, kv, now: () => t, sleep: async () => {} }), tick: (ms) => { t += ms; } }; };

test('every biz.js shop type has a theme + free starter layout with counters, shelves, display cases, seating, lighting and props', () => {
  assert.deepEqual(Object.keys(B.TYPES).sort(), [...IN.THEME_IDS].sort());
  for (const t of IN.THEME_IDS) { const cats = new Set(IN.STARTER[t].map((o) => IN.PROPS[o.id].cat)); for (const c of ['counter', 'shelf', 'display', 'seat', 'light', 'decor']) assert.ok(cats.has(c), `${t} has ${c}`);
    assert.ok(IN.STARTER[t].some((o) => IN.PROPS[o.id].theme === t), `${t} uses its own themed props`);
    const c = IN.cleanShopPayload({ v: 1, lot: 'P1', type: t, name: 'x', shelves: 0, items: IN.STARTER[t].map((o) => [o.id, o.x, o.y, o.rot]) }); assert.ok(c.ok, `${t} starter valid: ${c.reason}`); }
  assert.deepEqual([...IN.LEASABLE].sort(), B.LOTS.filter((l) => !B.rivalAt(l.id)).map((l) => l.id).sort(), 'leasable lots = lots without an NPC tenant');
});

test('editor: place from the storeroom, rotate, move, remove back to the storeroom; doorway and overlaps refused', () => {
  const s = leased('bakery'), it = s.biz.mine.interior, n0 = it.items.length;
  assert.equal(IN.placeProp(s, 'stool', 0, 5).ok, false, 'nothing in the storeroom yet');
  assert.ok(IN.buySet(s, 'cosy').ok); assert.equal(s.bones, 5000 - 240 - 80, 'Bones sink: lease deposit + set price'); assert.equal(IN.invOf(s).stool, 2);
  assert.equal(IN.placeProp(s, 'bench', 5, 6).reason, 'Keep the doorway clear'); assert.equal(IN.placeProp(s, 'bench', 1, 2).reason, 'Something is already there');
  assert.equal(IN.placeProp(s, 'bench', 11, 5).reason, 'Does not fit there'); assert.equal(IN.placeProp(s, 'cf_bar', 0, 5).reason, 'Not part of this shop theme');
  const r = IN.placeProp(s, 'bench', 1, 5); assert.ok(r.ok); assert.equal(it.items.length, n0 + 1); assert.equal(IN.invOf(s).bench, undefined, 'taken from the storeroom');
  const i = it.items.length - 1, rev = it.rev; assert.ok(IN.rotateProp(s, i).ok); assert.equal(it.items[i].rot, 1); assert.ok(it.rev > rev, 'every edit bumps rev (redraws the cached layer)');
  assert.deepEqual(IN.footprint('bench', 1), { w: 1, h: 2 }); assert.equal(IN.moveProp(s, i, 5, 5).reason, 'Keep the doorway clear', 'rotated 1x2 bench would cover the mat');
  assert.ok(IN.moveProp(s, i, 3, 5).ok); assert.deepEqual([it.items[i].x, it.items[i].y], [3, 5]);
  assert.ok(IN.removeProp(s, i).ok); assert.equal(it.items.length, n0); assert.equal(IN.invOf(s).bench, 1, 'back in the storeroom');
  assert.equal(IN.propAt(it.items, 5, 4), it.items.findIndex((o) => o.id === 'runner'), 'floor rug is pickable when nothing stands on it');
  assert.ok(IN.resetStarter(s).ok); assert.equal(it.items.length, IN.STARTER.bakery.length);
});

test('Bigger Shelves raises the prop cap; Window Display shows the layout; both keep their income rules', () => {
  const s = leased('cafe'), m = s.biz.mine; assert.equal(IN.propCap(m), 24); m.interior.items = m.interior.items.slice(0, 0);
  m.interior.inv.stool = 40; let placed = 0; for (let y = 0; y < 6 && placed < 30; y++) for (let x = 0; x < 12 && placed < 30; x++) if (IN.placeProp(s, 'stool', x, y).ok) placed++;
  assert.equal(placed, 24, 'cap 24 at Bigger Shelves L0'); assert.match(IN.placeProp(s, 'stool', 0, 6).reason, /Prop limit 24/);
  const a0 = B.appeal(m), c0 = B.capOf(m); assert.ok(B.buyUpgrade(s, 'shelves').ok); assert.equal(IN.propCap(m), 32); assert.equal(B.capOf(m), c0 + 20, 'shelf stock capacity rule unchanged'); assert.ok(IN.placeProp(s, 'stool', 0, 6).ok);
  assert.equal(IN.windowShows(m), false); assert.ok(B.buyUpgrade(s, 'display').ok); assert.equal(IN.windowShows(m), true); assert.ok(Math.abs(B.appeal(m) - a0 - B.UPGRADES.display.appeal) < 1e-12, 'Window Display appeal rule unchanged');
  const src = fs.readFileSync(new URL('../src/farmart.js', import.meta.url), 'utf8'); assert.match(src, /windowShows\(m\)[\s\S]{0,200}windowMini\(/, 'storefront window draws the layout when Window Display is bought');
});

test('income is identical with and without props (interior is never read by the income maths)', () => {
  const run = (withProps) => { const s = leased('bakery'); s.biz.mine.staff = 2; s.biz.mine.up.display = 2; s.biz.mine.up.shelves = 1; B.stockFromMarket(s, 'bread', 30); B.stockFromMarket(s, 'cake', 10);
    if (withProps) { IN.buySet(s, 'cosy'); IN.buySet(s, 'fittings'); IN.grantKibbleProp(s, 'kb_chandelier'); IN.grantKibbleProp(s, 'kb_statue'); IN.placeProp(s, 'kb_chandelier', 6, 1); IN.placeProp(s, 'kb_statue', 0, 4); IN.placeProp(s, 'bench', 1, 5); IN.removeProp(s, 0); }
    else delete s.biz.mine.interior;
    const b0 = s.bones, rng = mulberry32(42), hours = []; for (let h = 0; h < 24; h++) hours.push(B.bizHour(s, h, rng)); const row = B.bizDay(s, 0);
    return { earned: s.bones - b0, hours, row: { ...row, day: 0 }, appeal: B.appeal(s.biz.mine), stock: s.biz.mine.stock }; };
  const a = run(false), b = run(true); assert.ok(a.earned !== 0 && a.row.revenue > 0); assert.deepEqual(b, a);
  const src = fs.readFileSync(new URL('../src/biz.js', import.meta.url), 'utf8').replace(/^.*returnKibbleProps.*$/gm, ''); assert.doesNotMatch(src, /interior|kprops/, 'biz.js income code never reads the interior');
});

test('$KIBBLE props go through the existing Kibble Pay purchase flow and return to the player when the shop closes', () => {
  const ui = fs.readFileSync(new URL('../src/farmui.js', import.meta.url), 'utf8'); assert.match(ui, /kib\(ctx, IN\.kibbleItemId\(k\), IN\.PROPS\[k\]\.kibble\)/, 'same wallet().purchaseSync path as storefront looks');
  assert.equal(IN.kibbleItemId('kb_statue'), 'iprop-kb_statue'); const s = leased('flower'); IN.grantKibbleProp(s, 'kb_statue'); assert.ok(IN.placeProp(s, 'kb_statue', 0, 4).ok); assert.equal(s.biz.kprops.kb_statue, 0);
  B.closeBiz(s); assert.equal(s.biz.mine, null); assert.equal(s.biz.kprops.kb_statue, 1, 'kept by the player'); assert.ok(B.lease(s, 'L1', 'stand', 'S', 1).ok); assert.equal(IN.invOf(s).kb_statue, 1, 'usable in the next shop (any theme)');
});

test('payload validation: strict known-props-for-theme, grid, overlap, doorway, cap, byte limit, lot and type', () => {
  const base = (items, o = {}) => ({ v: 1, lot: 'P1', type: 'bakery', name: 'Bakes', shelves: 0, items, ...o }), ok = IN.STARTER.bakery.map((o) => [o.id, o.x, o.y, o.rot]);
  assert.ok(IN.cleanShopPayload(base(ok)).ok);
  const bad = { 'unknown prop': [['nuke', 0, 0, 0]], 'off-theme prop': [['cf_bar', 0, 0, 0]], 'out of bounds': [['stool', 12, 0, 0]], fractional: [['stool', 0.5, 0, 0]], overlap: [['stool', 0, 0, 0], ['plant', 0, 0, 0]], doorway: [['stool', 5, 6, 0]], 'bad rot': [['stool', 0, 0, 4]], 'bad row': [['stool', 0, 0]] };
  for (const [k, items] of Object.entries(bad)) assert.equal(IN.cleanShopPayload(base(items)).ok, false, k);
  const many = []; for (let y = 0; y < 6; y++) for (let x = 0; x < 12; x++) many.push(['stool', x, y, 0]);
  assert.match(IN.cleanShopPayload(base(many.slice(0, 25))).reason, /too many props \(max 24\)/); assert.ok(IN.cleanShopPayload(base(many.slice(0, 25), { shelves: 1 })).ok, 'Bigger Shelves L1 allows 32');
  assert.match(IN.cleanShopPayload(base(ok, { name: 'x'.repeat(3000) })).reason, /too big/); assert.equal(IN.cleanShopPayload(base(ok, { lot: 'L3' })).ok, false, 'NPC lot');
  assert.equal(IN.cleanShopPayload(base(ok, { type: 'casino' })).ok, false); assert.equal(IN.cleanShopPayload(null).ok, false); assert.equal(IN.cleanShopPayload(base(ok, { name: '<b>hi</b>' })).layout.name, 'bhi/b');
  assert.ok(JSON.stringify(base(many.slice(0, IN.ITEMS_MAX).map((r) => ['kb_chandelier', ...r.slice(1)]), { shelves: 3 })).length < IN.PAYLOAD_MAX_BYTES, 'a full legal layout fits the byte cap');
});

test('api/home op "shop": owner-only (shop key, or the home key once the home is published), get, size cap, rate limits', async () => {
  const { h, tick } = mk(), me = HS.newShare(), them = HS.newShare(), sid = IN.shopIdOf(me.id), lay = IN.payloadOf({ lot: 'P1', type: 'cafe', name: 'Bean & Bark', up: { shelves: 0 }, interior: { items: IN.STARTER.cafe } });
  assert.equal((await call(h, { method: 'GET', shop: sid })).code, 404); assert.equal((await call(h, { method: 'GET', shop: 'bad' })).code, 400);
  let r = await call(h, { body: { op: 'shop', id: sid, key: me.key, owner: 'Kabosu', layout: lay } }); assert.equal(r.code, 200); assert.equal(r.body.items, IN.STARTER.cafe.length);
  r = await call(h, { method: 'GET', shop: sid }); assert.equal(r.code, 200); assert.equal(r.body.owner, 'Kabosu'); assert.deepEqual(r.body.layout.items.length, lay.items.length); assert.equal(r.body.kh, undefined, 'key hash never returned'); assert.ok(IN.cleanShopPayload(r.body.layout).ok, 'stored in wire format: what visitors fetch validates again');
  tick(5000); assert.equal((await call(h, { body: { op: 'shop', id: sid, key: them.key, owner: 'Thief', layout: lay }, ip: '9.9.9.9' })).code, 403, 'not the owner');
  tick(5000); assert.equal((await call(h, { body: { op: 'shop', id: sid, key: me.key, owner: 'Kabosu', layout: { ...lay, items: [['nuke', 0, 0, 0]] } } })).body.error, 'unknown prop: nuke');
  tick(5000); assert.equal((await call(h, { raw: JSON.stringify({ op: 'shop', id: sid, key: me.key, layout: lay, pad: 'x'.repeat(5000) }) })).code, 413);
  tick(5000); assert.equal((await call(h, { body: { op: 'shop', id: sid, key: me.key, owner: 'K', layout: lay } })).code, 200); assert.equal((await call(h, { body: { op: 'shop', id: sid, key: me.key, owner: 'K', layout: lay }, ip: '5.5.5.5' })).code, 429, 'one save per shop per 3 s');
  tick(1500); assert.equal((await call(h, { body: { op: 'shop', id: IN.shopIdOf(them.id), key: them.key, owner: 'T', layout: lay }, ip: '7.7.7.7' })).code, 200); assert.equal((await call(h, { body: { op: 'shop', id: IN.shopIdOf(HS.newShare().id), key: them.key, owner: 'T', layout: lay }, ip: '7.7.7.7' })).code, 429, 'one save per IP per second');
  // a published home's key guards its shop id: nobody can pre-claim someone's shop from the broadcast home id
  const vic = HS.newShare(); tick(5000); assert.equal((await call(h, { body: { op: 'publish', id: vic.id, key: vic.key, name: 'Vic', layout: { wall: 0, floor: 0, items: [] } } })).code, 200);
  tick(5000); assert.equal((await call(h, { body: { op: 'shop', id: IN.shopIdOf(vic.id), key: them.key, owner: 'Thief', layout: lay }, ip: '8.8.8.8' })).code, 403);
  tick(5000); assert.equal((await call(h, { body: { op: 'shop', id: IN.shopIdOf(vic.id), key: vic.key, owner: 'Vic', layout: lay } })).code, 200);
});

test('cached layer: static props drawn once, redrawn only on edit / resize / move-pick', () => {
  const calls = { drawImage: 0 }; const fakeCtx = () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}), set: (t, k, v) => ((t[k] = v), true) });
  const made = []; const layer = createShopLayer((w, h) => { const c = { width: w, height: h, ctx: fakeCtx(), getContext() { return this.ctx; } }; made.push(c); return c; });
  const screen = { drawImage() { calls.drawImage++; } }, s = leased('groomer'), it = s.biz.mine.interior, frame = (o = {}) => layer.draw(screen, { type: 'groomer', name: 'Fluff', items: it.items, rev: it.rev, ox: 20, oy: 60, cell: 30, dpr: 2, grid: true, ...o });
  for (let i = 0; i < 300; i++) frame(); assert.equal(layer.redraws, 1, '300 idle frames = 1 draw of the static layer'); assert.equal(calls.drawImage, 300, 'each frame is one blit');
  IN.buySet(s, 'cosy'); IN.placeProp(s, 'plant', 0, 4); for (let i = 0; i < 50; i++) frame(); assert.equal(layer.redraws, 2, 'one redraw per edit');
  IN.rotateProp(s, 0); IN.removeProp(s, 1); frame(); assert.equal(layer.redraws, 3, 'edits between frames coalesce');
  frame({ hide: 2 }); frame({ hide: 2 }); assert.equal(layer.redraws, 4, 'picking a prop to move redraws once without it');
  frame({ cell: 24 }); assert.equal(layer.redraws, 5, 'resize'); frame({ cell: 24 }); assert.equal(layer.redraws, 5); assert.ok(made.length <= 3, 'offscreen canvas re-used unless the size changes');
});

test('wiring: lot panel + rival shops can be entered, editor is touch-friendly, visitors fetch on entry via the multiplayer list', () => {
  const main = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8'), ui = fs.readFileSync(new URL('../src/farmui.js', import.meta.url), 'utf8'), mp = fs.readFileSync(new URL('../src/multiplayer.js', import.meta.url), 'utf8'), css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  assert.match(ui, /btn\('inside', 'Step inside'/); assert.match(ui, /btn\('inside', 'Enter & arrange'/); assert.match(main, /enterShop: \(lot\) => enterShop\(lot\)/);
  assert.match(main, /pointerdown[^\n]*build\?\.shop/); assert.match(css, /shopinv button[^}]*min-height:34px/); assert.match(mp, /data-vkind="shop"[^>]*>Visit shop</); assert.match(main, /kind === 'shop' \? visitShop\(id, name\)/);
  assert.match(main, /SHOPAPI\.get\(sid\)[\s\S]{0,200}cleanShopPayload/, 'visitor validates the fetched layout again');
});

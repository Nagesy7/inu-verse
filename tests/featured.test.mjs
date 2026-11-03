// Featured Home of the Day: real homes only, deterministic per Sydney day, public name only, one real feed line per pick.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import * as F from '../src/featured.js';
import { makeHandler } from '../api/home.js';
import { memoryKv } from '../api/_lib/kv.js';
import { readEvents } from '../api/_lib/feed.js';
import { EVENT_TYPES, isEventType } from '../src/feed.js';
import { interactables, FEATURED_SIGN, isSolid } from '../src/world.js';

const items = (n) => Array.from({ length: n }, (_, i) => ({ id: 'rug', x: i, y: 1 }));
const rec = (name, n, extra = {}) => JSON.stringify({ kh: 'SECRET_HASH_' + name, name, layout: { wall: 'w', floor: 'f', items: items(n) }, updatedAt: 1, ...extra });
const get = (h, query) => new Promise((done) => { const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { done({ code: this.statusCode, body: b ? JSON.parse(b) : null, raw: b }); } };
  h({ method: 'GET', url: '/api/home?featured=1', query, headers: { 'x-forwarded-for': '1.1.1.1' } }, res); });
const mk = (t0 = Date.UTC(2026, 10, 3, 2)) => { let t = t0; const kv = memoryKv(() => t); return { kv, h: makeHandler({ env: {}, kv, now: () => t, sleep: async () => {} }), set: (v) => { t = v; }, now: () => t }; };
const seed = async (kv) => { await kv.set('home:v1:haaaaaaaaaaaa', rec('Kabosu', 5)); await kv.set('home:v1:hbbbbbbbbbbbb', rec('Shiba', 3)); await kv.set('home:v1:hcccccccccccc', rec('Doge', 9));
  await kv.set('home:v1:hdddddddddddd', rec('KeeperTest', 20)); await kv.set('home:v1:heeeeeeeeeeee', rec('Tiny', 2)); await kv.set('book:v1:haaaaaaaaaaaa', JSON.stringify([{ n: 'a', t: 'hi' }])); };

test('isRealHome: >=3 items, has a name, never Keeper* test homes', () => {
  assert.equal(F.isRealHome(JSON.parse(rec('Kabosu', 3))), true); assert.equal(F.isRealHome(JSON.parse(rec('Kabosu', 2))), false);
  assert.equal(F.isRealHome(JSON.parse(rec('KeeperTest', 30))), false); assert.equal(F.isRealHome(JSON.parse(rec('keeper2', 30))), false);
  assert.equal(F.isRealHome(JSON.parse(rec('', 30))), false); assert.equal(F.isRealHome(null), false);
});
test('pickFeatured is deterministic per day and independent of listing order; varies across days', () => {
  const hs = ['h1', 'h2', 'h3', 'h4', 'h5'].map((id, i) => ({ id, ...JSON.parse(rec('P' + i, 4)) }));
  const a = F.pickFeatured('2026-11-03', hs), b = F.pickFeatured('2026-11-03', [...hs].reverse()); assert.equal(a.id, b.id);
  const days = new Set(Array.from({ length: 30 }, (_, i) => F.pickFeatured(`2026-12-${String(i + 1).padStart(2, '0')}`, hs).id)); assert.ok(days.size >= 3);
  assert.equal(F.pickFeatured('2026-11-03', [{ id: 'hx', ...JSON.parse(rec('KeeperX', 9)) }]), null);
});
test('sydneyDay rolls over at Sydney midnight, not UTC', () => {
  assert.equal(F.sydneyDay(Date.UTC(2026, 10, 3, 12, 59)), '2026-11-03'); assert.equal(F.sydneyDay(Date.UTC(2026, 10, 3, 13, 1)), '2026-11-04');
});
test('GET ?featured=1 picks a real home, public fields only, and posts ONE real feed event', async () => {
  const { kv, h } = mk(); await seed(kv);
  const r = await get(h, { featured: '1' }); assert.equal(r.code, 200); const hm = r.body.home;
  assert.ok(['haaaaaaaaaaaa', 'hbbbbbbbbbbbb', 'hcccccccccccc'].includes(hm.id)); assert.deepEqual(Object.keys(hm).sort(), ['id', 'items', 'name', 'signs', 'updatedAt']);
  assert.ok(!r.raw.includes('SECRET_HASH') && !r.raw.includes('layout')); assert.equal(r.body.day, '2026-11-03');
  const again = await get(h, { featured: '1' }); assert.equal(again.body.home.id, hm.id);
  const ev = (await readEvents(kv, Date.UTC(2026, 10, 3, 2))).filter((e) => e.k === 'featured'); assert.equal(ev.length, 1); assert.equal(ev[0].n, hm.name);
  assert.ok(isEventType('featured')); assert.equal(EVENT_TYPES.featured.src, 'server');
});
test('no qualifying homes -> null and no feed line; cached pick re-validated if that home goes away', async () => {
  const { kv, h } = mk(); await kv.set('home:v1:hdddddddddddd', rec('KeeperTest', 20)); await kv.set('home:v1:heeeeeeeeeeee', rec('Tiny', 2));
  const r = await get(h, { featured: '1' }); assert.equal(r.body.home, null); assert.equal((await readEvents(kv, Date.UTC(2026, 10, 3, 2))).length, 0);
  const m = mk(); await seed(m.kv); const first = (await get(m.h, { featured: '1' })).body.home; await m.kv.del('home:v1:' + first.id);
  const second = (await get(m.h, { featured: '1' })).body.home; assert.ok(second && second.id !== first.id);
});
test('a new Sydney day can pick again (cache keyed per day)', async () => {
  const m = mk(); await seed(m.kv); const days = new Set();
  for (let d = 0; d < 12; d++) { m.set(Date.UTC(2026, 10, 3 + d, 2)); const r = await get(m.h, { featured: '1' }); assert.equal(r.body.day, F.sydneyDay(m.now())); days.add(r.body.home.id); }
  assert.ok(days.size >= 2);
});
test('panel html: escapes the name, Visit button, empty + error states', () => {
  const html = F.featuredHtml({ data: { day: '2026-11-03', home: { id: 'haaaaaaaaaaaa', name: '<b>x', items: 4, signs: 1 } } });
  assert.ok(html.includes('&lt;b&gt;x') && !html.includes('<b>x')); assert.ok(html.includes('data-act="visit"')); assert.ok(html.includes('1 guestbook entry'));
  assert.ok(F.featuredHtml({ data: { day: 'd', home: null } }).includes('No home is featured')); assert.ok(F.featuredHtml({ error: true }).includes('data-act="retry"'));
  assert.ok(!/kibble|bones/i.test(html));
});
test('fetchFeatured hits /api/home?featured=1 and drops malformed ids', async () => {
  F._resetFeaturedCache(); let url; const f = async (u) => { url = u; return { ok: true, json: async () => ({ day: '2026-11-03', home: { id: 'bad', name: 'x' } }) }; };
  const d = await F.fetchFeatured({ f, now: Date.UTC(2026, 10, 3, 2) }); assert.equal(url, '/api/home?featured=1'); assert.equal(d.home, null); F._resetFeaturedCache();
});
test('plaza signboard + interactable + menu entry are wired', () => {
  const it = interactables().find((x) => x.kind === 'featured'); assert.ok(it); assert.equal(it.tx, FEATURED_SIGN.x); assert.equal(it.ty, FEATURED_SIGN.y + 1);
  assert.equal(isSolid(it.tx, it.ty), false);
  const main = fs.readFileSync('src/main.js', 'utf8'); assert.ok(main.includes("it.kind === 'featured'") && main.includes("$('#btn-featured')"));
  assert.ok(fs.readFileSync('src/hudmenu.js', 'utf8').includes("'btn-featured'")); assert.ok(fs.readFileSync('index.html', 'utf8').includes('id="btn-featured"'));
  assert.ok(fs.readFileSync('src/render.js', 'utf8').includes("'FEATURED HOME'"));
});

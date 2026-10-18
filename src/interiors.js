// Shop interiors for leased business lots (biz.js). COSMETIC ONLY: nothing in here is read by biz.js income maths
// (appeal(), bizHour(), bizDay()); a test runs a full trading day with and without an interior and expects identical Bones.
// Builds on the existing upgrades instead of replacing them:
//   * Bigger Shelves (m.up.shelves) also raises how many props the owner can place (PROP_CAP_BASE + PROP_CAP_PER_LEVEL each).
//   * Window Display (m.up.display, level 1+) shows the owner's arranged layout through the storefront window (farmart.js).
//   Their income effects stay exactly the existing UPGRADES rules in biz.js.
// Layout = a small grid (COLS x ROWS) of props [id, x, y, rot]. The owner arranges it with place / move / rotate / remove.
// Every lease starts with the theme's free starter layout. Extra fittings come from Bones sets (a pure Bones sink; Bones are
// never cashed out) or optional $KIBBLE props bought through the existing Kibble Pay cosmetics flow (wallet.js purchaseSync,
// catalog id inu-verse:iprop-<id>; the player signs in Phantom, the game never holds funds). $KIBBLE props belong to the
// player (s.biz.kprops) and go back there if the shop closes.
// Visitors see a published copy: { v, lot, type, name, items } (cleanShopPayload, also used by api/home.js).
export const COLS = 12, ROWS = 7;
export const DOOR = [[5, 6], [6, 6]]; // entrance mat: always kept clear
export const PROP_CAP_BASE = 24, PROP_CAP_PER_LEVEL = 8, ITEMS_MAX = PROP_CAP_BASE + PROP_CAP_PER_LEVEL * 3, INV_MAX = 20, PAYLOAD_MAX_BYTES = 2048;
// cat: counter | shelf | display | seat | light | decor. layer 'floor' (rugs, mats) may sit under 'obj' props.
const P = (name, w, h, cat, col, theme, extra = {}) => ({ name, w, h, cat, col, theme, layer: 'obj', ...extra });
export const PROPS = {
  // shared by every theme
  pendant:   P('Pendant Lamp', 1, 1, 'light', '#ffd98a', '*'),
  floorlamp: P('Reading Lamp', 1, 1, 'light', '#f2cc68', '*'),
  plant:     P('Shop Plant', 1, 1, 'decor', '#5fb36a', '*'),
  stool:     P('Round Stool', 1, 1, 'seat', '#c0623b', '*'),
  bench:     P('Waiting Bench', 2, 1, 'seat', '#a8744a', '*'),
  register:  P('Paw Till', 1, 1, 'counter', '#4a4f5c', '*'),
  chalk:     P('Chalkboard Menu', 1, 1, 'decor', '#2f3a32', '*'),
  runner:    P('Entry Runner', 1, 3, 'decor', '#b8323a', '*', { layer: 'floor' }),
  // Bakery
  bk_counter: P('Bread Counter', 3, 1, 'counter', '#c88a4a', 'bakery'),
  bk_case:    P('Cake Display Case', 2, 1, 'display', '#f6e7d0', 'bakery'),
  bk_rack:    P('Loaf Rack', 2, 1, 'shelf', '#8a5a34', 'bakery'),
  bk_oven:    P('Brick Oven', 2, 1, 'decor', '#b0523a', 'bakery'),
  bk_table:   P('Café Table', 1, 1, 'seat', '#e8c08a', 'bakery'),
  bk_flour:   P('Flour Sacks', 1, 1, 'decor', '#efe6d2', 'bakery'),
  // Café
  cf_bar:     P('Espresso Bar', 3, 1, 'counter', '#6a4630', 'cafe'),
  cf_machine: P('Espresso Machine', 1, 1, 'display', '#c9ced8', 'cafe'),
  cf_case:    P('Pastry Case', 2, 1, 'display', '#f2e4c8', 'cafe'),
  cf_shelf:   P('Mug Shelf', 2, 1, 'shelf', '#7a5136', 'cafe'),
  cf_table:   P('Table for Two', 2, 1, 'seat', '#d9a86a', 'cafe'),
  cf_arm:     P('Velvet Armchair', 1, 1, 'seat', '#3fa69a', 'cafe'),
  cf_beans:   P('Bean Sacks', 1, 1, 'decor', '#9a7048', 'cafe'),
  // Flower shop
  fl_counter: P('Wrapping Counter', 2, 1, 'counter', '#d8b48a', 'flower'),
  fl_buckets: P('Flower Buckets', 2, 1, 'display', '#7a8a9a', 'flower'),
  fl_shelf:   P('Plant Shelf', 2, 1, 'shelf', '#8a6a44', 'flower'),
  fl_cooler:  P('Bloom Cooler', 1, 1, 'display', '#cfeaf0', 'flower'),
  fl_bench:   P('Potting Bench', 2, 1, 'decor', '#9a7a52', 'flower'),
  fl_can:     P('Watering Can', 1, 1, 'decor', '#5aa0c8', 'flower'),
  // Boutique (fashion / general store)
  bt_counter: P('Boutique Counter', 2, 1, 'counter', '#f2e6f6', 'boutique'),
  bt_rack:    P('Clothes Rail', 2, 1, 'shelf', '#c9c2d6', 'boutique'),
  bt_shelf:   P('Folded Shelf', 2, 1, 'shelf', '#e8dcc4', 'boutique'),
  bt_case:    P('Bow Case', 1, 1, 'display', '#cfe8f6', 'boutique'),
  bt_mirror:  P('Long Mirror', 1, 1, 'decor', '#bfe0f0', 'boutique'),
  bt_dummy:   P('Shiba Mannequin', 1, 1, 'display', '#e8b46a', 'boutique'),
  bt_pouf:    P('Pink Pouf', 1, 1, 'seat', '#f2a6c8', 'boutique'),
  // Groomer (the pet store theme)
  gr_counter: P('Front Desk', 2, 1, 'counter', '#7ac0e0', 'groomer'),
  gr_tub:     P('Bubble Tub', 2, 1, 'decor', '#f4f8fc', 'groomer'),
  gr_table:   P('Grooming Table', 2, 1, 'display', '#9ab0c0', 'groomer'),
  gr_shelf:   P('Pet Supply Shelf', 2, 1, 'shelf', '#5a7a9a', 'groomer'),
  gr_jars:    P('Treat Jar Case', 1, 1, 'display', '#f2e4c8', 'groomer'),
  gr_dryer:   P('Fur Dryer', 1, 1, 'decor', '#e86a8a', 'groomer'),
  gr_bed:     P('Pup Bed Display', 1, 1, 'seat', '#f2cc68', 'groomer'),
  // Farm stand
  st_counter: P('Market Counter', 3, 1, 'counter', '#a8744a', 'stand'),
  st_crates:  P('Produce Crates', 2, 1, 'display', '#c08a4a', 'stand'),
  st_shelf:   P('Jar Shelf', 2, 1, 'shelf', '#8a5a34', 'stand'),
  st_cooler:  P('Egg & Milk Cooler', 1, 1, 'display', '#e4eef4', 'stand'),
  st_scale:   P('Weighing Scale', 1, 1, 'decor', '#c9a23a', 'stand'),
  st_barrel:  P('Apple Barrel', 1, 1, 'decor', '#7a4a2a', 'stand'),
  st_bale:    P('Hay Bale Seat', 1, 1, 'seat', '#e8c85a', 'stand'),
  // optional $KIBBLE cosmetics (any theme). Bought with Kibble Pay; no gameplay or income effect.
  kb_chandelier: P('Kibble Chandelier', 1, 1, 'light', '#f2cc68', '*', { kibble: 20000 }),
  kb_statue:     P('Golden Shiba Statue', 1, 1, 'decor', '#e3b341', '*', { kibble: 30000 }),
};
export const THEME_IDS = ['bakery', 'cafe', 'flower', 'boutique', 'groomer', 'stand'];
export const THEMES = {
  bakery:   { wall: '#f6dcc0', trim: '#c88a4a', floor: '#e8cfa8', line: '#d4b484', tile: 'check', accent: '#e8b46a' },
  cafe:     { wall: '#5a4034', trim: '#c08a5a', floor: '#a8744a', line: '#8a5a38', tile: 'plank', accent: '#f2cc68' },
  flower:   { wall: '#e6f2e0', trim: '#e87aa8', floor: '#d8d0c4', line: '#c0b6a8', tile: 'stone', accent: '#e87aa8' },
  boutique: { wall: '#efe4f6', trim: '#9a6ad0', floor: '#f4eee8', line: '#ddd2e4', tile: 'herring', accent: '#9a6ad0' },
  groomer:  { wall: '#dff0f8', trim: '#5ab0d8', floor: '#eef4f6', line: '#cfdde4', tile: 'check', accent: '#5ab0d8' },
  stand:    { wall: '#e8d6b0', trim: '#6aa84a', floor: '#c8a878', line: '#a88a5a', tile: 'plank', accent: '#6aa84a' },
};
const L = (rows) => rows.map(([id, x, y, rot = 0]) => ({ id, x, y, rot }));
// free starter layout per theme: counters, shelves, display cases, seating, lighting and themed props
export const STARTER = {
  bakery:   L([['bk_oven', 0, 0], ['bk_rack', 2, 0], ['bk_rack', 4, 0], ['bk_flour', 6, 0], ['pendant', 7, 0], ['chalk', 11, 0], ['bk_counter', 1, 2], ['register', 4, 2], ['bk_case', 8, 2], ['bk_case', 10, 2], ['bk_table', 9, 5], ['stool', 10, 5], ['stool', 8, 5], ['plant', 0, 6], ['runner', 5, 3], ['pendant', 1, 4]]),
  cafe:     L([['cf_shelf', 0, 0], ['cf_shelf', 2, 0], ['cf_machine', 4, 0], ['cf_beans', 5, 0], ['pendant', 7, 0], ['chalk', 11, 0], ['cf_bar', 1, 2], ['register', 4, 2], ['cf_case', 7, 2], ['cf_table', 9, 2], ['cf_arm', 11, 2], ['cf_table', 9, 5], ['stool', 8, 5], ['cf_arm', 11, 5], ['plant', 0, 6], ['pendant', 2, 4]]),
  flower:   L([['fl_shelf', 0, 0], ['fl_shelf', 2, 0], ['fl_cooler', 4, 0], ['fl_cooler', 5, 0], ['pendant', 7, 0], ['fl_bench', 9, 0], ['fl_counter', 1, 2], ['register', 3, 2], ['fl_buckets', 8, 3], ['fl_buckets', 10, 3], ['fl_can', 11, 1], ['plant', 0, 6], ['plant', 11, 6], ['bench', 8, 6], ['runner', 5, 3], ['pendant', 2, 4]]),
  boutique: L([['bt_rack', 0, 0], ['bt_rack', 2, 0], ['bt_shelf', 4, 0], ['bt_mirror', 7, 0], ['pendant', 8, 0], ['bt_shelf', 9, 0], ['bt_counter', 1, 3], ['register', 3, 3], ['bt_case', 8, 3], ['bt_dummy', 10, 2], ['bt_dummy', 11, 2], ['bt_pouf', 9, 5], ['bt_pouf', 10, 5], ['plant', 0, 6], ['runner', 5, 3], ['pendant', 2, 5]]),
  groomer:  L([['gr_shelf', 0, 0], ['gr_shelf', 2, 0], ['gr_jars', 4, 0], ['pendant', 6, 0], ['gr_tub', 8, 0], ['gr_dryer', 10, 0], ['gr_counter', 1, 3], ['register', 3, 3], ['gr_table', 8, 3], ['gr_bed', 11, 3], ['gr_bed', 11, 4], ['bench', 8, 6], ['plant', 0, 6], ['runner', 5, 3], ['pendant', 2, 5], ['plant', 11, 6]]),
  stand:    L([['st_shelf', 0, 0], ['st_shelf', 2, 0], ['st_barrel', 4, 0], ['pendant', 6, 0], ['st_cooler', 8, 0], ['st_cooler', 9, 0], ['chalk', 11, 0], ['st_counter', 1, 2], ['st_scale', 4, 2], ['st_crates', 8, 3], ['st_crates', 10, 3], ['st_bale', 9, 5], ['st_bale', 10, 5], ['st_barrel', 0, 6], ['runner', 5, 3], ['pendant', 2, 4]]),
};
// Bones sets (repeatable): each adds props to the shop's storeroom. A Bones sink only.
export const SETS = {
  fittings: { name: 'Theme Fittings Set', price: 120, give: (t) => Object.keys(PROPS).filter((k) => PROPS[k].theme === t).slice(0, 4) },
  cosy:     { name: 'Cosy Corner Set', price: 80, give: () => ['plant', 'stool', 'stool', 'floorlamp', 'bench'] },
};
export const isKibbleProp = (id) => !!PROPS[id]?.kibble;
export const kibbleItemId = (id) => 'iprop-' + id; // Kibble Pay catalog id = inu-verse:iprop-<id>
export const propsFor = (type) => Object.keys(PROPS).filter((k) => PROPS[k].theme === '*' || PROPS[k].theme === type);
export const allowed = (type, id) => !!PROPS[id] && (PROPS[id].theme === '*' || PROPS[id].theme === type);
export const propCap = (m) => PROP_CAP_BASE + PROP_CAP_PER_LEVEL * Math.max(0, Math.min(3, m?.up?.shelves | 0)); // Bigger Shelves
export const windowShows = (m) => (m?.up?.display | 0) >= 1; // Window Display shows the layout from outside
export function footprint(id, rot) { const d = PROPS[id]; return rot % 2 ? { w: d.h, h: d.w } : { w: d.w, h: d.h }; }
const isDoor = (x, y) => DOOR.some(([dx, dy]) => dx === x && dy === y);
// can prop `id` go at (x,y,rot) in `items`? ignore = the item being moved/rotated (object identity or index)
export function canPlace(items, id, x, y, rot, ignore = null) { const d = PROPS[id]; if (!d) return { ok: false, reason: 'Unknown prop' };
  if (![x, y, rot].every(Number.isInteger) || rot < 0 || rot > 3) return { ok: false, reason: 'Bad position' };
  const f = footprint(id, rot); if (x < 0 || y < 0 || x + f.w > COLS || y + f.h > ROWS) return { ok: false, reason: 'Does not fit there' };
  for (let i = 0; i < f.w; i++) for (let j = 0; j < f.h; j++) if (d.layer === 'obj' && isDoor(x + i, y + j)) return { ok: false, reason: 'Keep the doorway clear' };
  for (const o of items) { if (o === ignore) continue; const od = PROPS[o.id]; if (od.layer !== d.layer) continue; const g = footprint(o.id, o.rot);
    if (x < o.x + g.w && o.x < x + f.w && y < o.y + g.h && o.y < y + f.h) return { ok: false, reason: 'Something is already there' }; }
  return { ok: true }; }
// ---- state ----
export function ensureInterior(s, m = s?.biz?.mine) { if (!m) return null; const b = s.biz; b.kprops ||= {};
  if (!m.interior || !Array.isArray(m.interior.items)) m.interior = { items: STARTER[m.type] ? STARTER[m.type].map((it) => ({ ...it })) : [], inv: {}, rev: 0 };
  m.interior.inv ||= {}; return m.interior; }
export const interiorOf = (type, m) => (m?.interior?.items ? m.interior.items : (STARTER[type] || [])); // what visitors / the window see
export function invOf(s) { const m = s.biz?.mine, it = ensureInterior(s); const out = {}; if (!it) return out;
  for (const [k, n] of Object.entries(it.inv)) if (n > 0) out[k] = n; for (const [k, n] of Object.entries(s.biz.kprops || {})) if (n > 0 && allowed(m.type, k)) out[k] = (out[k] || 0) + n; return out; }
const take = (s, id) => { const it = s.biz.mine.interior; if (isKibbleProp(id)) { if (!(s.biz.kprops[id] > 0)) return false; s.biz.kprops[id]--; return true; } if (!(it.inv[id] > 0)) return false; it.inv[id]--; if (!it.inv[id]) delete it.inv[id]; return true; };
const give = (s, id) => { if (isKibbleProp(id)) s.biz.kprops[id] = (s.biz.kprops[id] || 0) + 1; else { const inv = s.biz.mine.interior.inv; inv[id] = Math.min(INV_MAX, (inv[id] || 0) + 1); } };
const bump = (it) => { it.rev = (it.rev | 0) + 1; return { ok: true, rev: it.rev }; };
// editor ops (owner only: they operate on your own s.biz.mine)
export function placeProp(s, id, x, y, rot = 0) { const m = s.biz?.mine, it = ensureInterior(s); if (!it) return { ok: false, reason: 'No shop' }; if (!allowed(m.type, id)) return { ok: false, reason: 'Not part of this shop theme' };
  if (it.items.length >= propCap(m)) return { ok: false, reason: `Prop limit ${propCap(m)} reached (Bigger Shelves raises it)` };
  if (!(invOf(s)[id] > 0)) return { ok: false, reason: 'None in your storeroom' }; const c = canPlace(it.items, id, x, y, rot); if (!c.ok) return c;
  take(s, id); it.items.push({ id, x, y, rot }); return bump(it); }
export function moveProp(s, idx, x, y, rot) { const it = ensureInterior(s), o = it?.items[idx]; if (!o) return { ok: false, reason: 'Nothing selected' }; rot ??= o.rot;
  const c = canPlace(it.items, o.id, x, y, rot, o); if (!c.ok) return c; Object.assign(o, { x, y, rot }); return bump(it); }
export function rotateProp(s, idx) { const o = s.biz?.mine?.interior?.items[idx]; if (!o) return { ok: false, reason: 'Nothing selected' };
  for (let k = 1; k <= 3; k++) { const r = moveProp(s, idx, o.x, o.y, (o.rot + k) % 4); if (r.ok) return r; } return { ok: false, reason: 'No room to rotate here' }; }
export function removeProp(s, idx) { const it = ensureInterior(s), o = it?.items[idx]; if (!o) return { ok: false, reason: 'Nothing selected' }; it.items.splice(idx, 1); give(s, o.id); return bump(it); }
export const propAt = (items, x, y) => { for (let i = items.length - 1; i >= 0; i--) { const o = items[i], f = footprint(o.id, o.rot); if (x >= o.x && x < o.x + f.w && y >= o.y && y < o.y + f.h && PROPS[o.id].layer === 'obj') return i; }
  for (let i = items.length - 1; i >= 0; i--) { const o = items[i], f = footprint(o.id, o.rot); if (x >= o.x && x < o.x + f.w && y >= o.y && y < o.y + f.h) return i; } return -1; };
export function resetStarter(s) { const m = s.biz?.mine, it = ensureInterior(s); if (!it) return { ok: false }; for (const o of it.items) if (isKibbleProp(o.id)) give(s, o.id); it.items = STARTER[m.type].map((o) => ({ ...o })); return bump(it); }
// purchases
export function buySet(s, setId) { const m = s.biz?.mine, S = SETS[setId]; if (!m || !S) return { ok: false, reason: 'No shop' }; ensureInterior(s);
  if (s.bones < S.price) return { ok: false, reason: `Need ${S.price} bones` }; s.bones -= S.price; const got = S.give(m.type); for (const id of got) give(s, id); return { ok: true, got }; }
export function grantKibbleProp(s, id) { if (!isKibbleProp(id)) return { ok: false }; s.biz ||= {}; s.biz.kprops ||= {}; s.biz.kprops[id] = (s.biz.kprops[id] || 0) + 1; return { ok: true }; }
// shop closed (by the player or after 3 unpaid days): $KIBBLE props go back to the player; Bones fittings stay with the lot
export function returnKibbleProps(s) { const m = s?.biz?.mine; if (!m?.interior) return 0; s.biz.kprops ||= {}; let n = 0; for (const o of m.interior.items) if (isKibbleProp(o.id)) { s.biz.kprops[o.id] = (s.biz.kprops[o.id] || 0) + 1; n++; } return n; }
// ---- publish / visit payload (shared by the client, api/home.js and tests) ----
export const SHOP_RE = /^s[0-9a-z]{12}$/;
export const shopIdOf = (homeId) => (typeof homeId === 'string' && /^h[0-9a-z]{12}$/.test(homeId) ? 's' + homeId.slice(1) : null);
export const homeIdOf = (shopId) => (typeof shopId === 'string' && SHOP_RE.test(shopId) ? 'h' + shopId.slice(1) : null);
export const LEASABLE = ['P1', 'L1', 'L2']; // biz.js LOTS without an NPC tenant (P2 Hana, L3 Taro, L4 Kiki)
export function payloadOf(m) { return { v: 1, lot: m.lot, type: m.type, name: String(m.name || '').slice(0, 22), shelves: Math.max(0, Math.min(3, m.up?.shelves | 0)), items: (m.interior?.items || []).map((o) => [o.id, o.x, o.y, o.rot]) }; }
// strict: any unknown / off-theme prop, bad position, overlap, door block, over the cap or over the byte limit -> rejected (not trimmed)
export function cleanShopPayload(p, { lots = null } = {}) { const bad = (reason) => ({ ok: false, reason });
  if (!p || typeof p !== 'object' || Array.isArray(p)) return bad('bad payload'); let bytes; try { bytes = JSON.stringify(p).length; } catch { return bad('bad payload'); }
  if (bytes > PAYLOAD_MAX_BYTES) return bad(`layout too big (${bytes} > ${PAYLOAD_MAX_BYTES} bytes)`);
  if (p.v !== 1 || !THEME_IDS.includes(p.type)) return bad('unknown shop type'); if (!(lots || LEASABLE).includes(p.lot)) return bad('not a leasable lot');
  const shelves = Number.isInteger(p.shelves) && p.shelves >= 0 && p.shelves <= 3 ? p.shelves : 0, cap = PROP_CAP_BASE + PROP_CAP_PER_LEVEL * shelves;
  if (!Array.isArray(p.items) || p.items.length > cap) return bad(`too many props (max ${cap})`);
  const items = []; for (const r of p.items) { if (!Array.isArray(r) || r.length !== 4) return bad('bad prop row'); const [id, x, y, rot] = r;
    if (typeof id !== 'string' || !allowed(p.type, id)) return bad('unknown prop: ' + String(id).slice(0, 24)); const c = canPlace(items, id, x, y, rot); if (!c.ok) return bad(`${id} at ${x},${y}: ${c.reason}`); items.push({ id, x, y, rot }); }
  const name = String(p.name ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 22);
  return { ok: true, layout: { v: 1, lot: p.lot, type: p.type, name, shelves, items } }; }
export const layoutKey = (l) => JSON.stringify(l ? [l.lot, l.type, l.name, l.shelves, l.items.map((o) => [o.id, o.x, o.y, o.rot])] : null);
export function shopApi(base = '', f = (...a) => globalThis.fetch(...a)) {
  const call = async (method, body, q = '') => { const r = await f(`${base}/api/home${q}`, method === 'GET' ? { headers: { accept: 'application/json' } } : { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    let j = null; try { j = await r.json(); } catch {} if (!r.ok) throw Object.assign(new Error(j?.error || 'shop unavailable'), { status: r.status, retryAfter: j?.retryAfter }); return j; };
  return { get: (id) => call('GET', null, '?shop=' + encodeURIComponent(id)), publish: (share, name, layout) => call('POST', { op: 'shop', id: shopIdOf(share.id), key: share.key, owner: name, layout }) }; }

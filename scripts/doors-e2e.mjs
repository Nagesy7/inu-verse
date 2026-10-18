// Door / portal walk-in e2e: every enterable door, the hub gates, every room/zone exit and the ferries, approached from the
// front, left, right, both diagonals and "up against the wall beside it", with keyboard (+ sprint), the on-screen joystick
// (CDP touch) and tap-to-walk, on desktop and phone landscape. Each trial must enter EXACTLY once. Also checks that standing at
// the spawn spot outside a door and walking away (the exit path) never fires.
//   URL=https://inu-verse-tawny.vercel.app/ VP=844x390 node scripts/doors-e2e.mjs      (VP: 1280x800 | 844x390 | 667x375)
import { chromium } from 'playwright'; import fs from 'fs';
const URL = process.env.URL || 'http://127.0.0.1:8644/', VP = process.env.VP || '1280x800', OUT = process.env.OUT || '/tmp/doors-e2e', ONLY = process.env.ONLY || '';
const [W, H] = VP.split('x').map(Number), phone = H < 520; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: phone, isMobile: false }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push('pageerror ' + e.message));
await p.goto(URL); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); localStorage.setItem('inuverse.mp.off', '1'); }); await p.reload(); await p.waitForTimeout(900); await p.click('#start'); await p.waitForTimeout(2200);
await p.evaluate(() => { globalThis.__guide?.endTour?.('skipped'); __inu.setHour(11); globalThis.__noNav = true; const s = __inu.state; s.bones += 99999; for (const id of ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']) __rel.claim(id); });
const cdp = phone ? await ctx.newCDPSession(p) : null;
const stick = phone ? await p.evaluate(() => { const r = document.getElementById('stick').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, R: r.width / 2 }; }) : null;
const KEY = { x: { '-1': 'ArrowLeft', 1: 'ArrowRight' }, y: { '-1': 'ArrowUp', 1: 'ArrowDown' } };
const FV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const sleep = (ms) => p.waitForTimeout(ms);
const st = () => p.evaluate(() => __doorTest.st);
async function press(style, v, on) { // v = [dx, dy] in {-1,0,1}
  if (style === 'keys' || style === 'sprint') { const ks = []; if (v[0]) ks.push(KEY.x[v[0]]); if (v[1]) ks.push(KEY.y[v[1]]); if (style === 'sprint') ks.push('Shift');
    for (const k of ks) on ? await p.keyboard.down(k) : await p.keyboard.up(k); }
  if (style === 'stick') { const l = Math.hypot(...v), f = style === 'stick' ? 0.75 : 1, x = stick.x + (v[0] / l) * stick.R * f, y = stick.y + (v[1] / l) * stick.R * f;
    if (on) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: stick.x, y: stick.y, id: 1 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y, id: 1 }] }); }
    else await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); } }
async function trial({ room = null, start, face, style, v, tapAt, expect = 1, ms = 3200 }) {
  await p.evaluate(([x, y, f, r]) => __doorTest.reset(x, y, f, r), [(start[0] + 0.5) * 32, (start[1] + 0.5) * 32, face, room]); await sleep(room ? 120 : 60);
  const s0 = await st(), n0 = s0.enters + s0.portals; let n = n0, t = 0;
  let via = null;
  if (style === 'tap') { // tap the door/exit (or the tile right behind it); if a HUD button covers every candidate, click the canvas there directly
    let pick = null; for (const t of tapAt) { const sc = await p.evaluate(([x, y]) => __doorTest.toScreen(x, y), [(t[0] + 0.5) * 32, (t[1] + 0.5) * 32]);
      if (sc && sc.x > 2 && sc.y > 2 && sc.x < W - 2 && sc.y < H - 2 && await p.evaluate(([x, y]) => document.elementFromPoint(x, y)?.id === 'game', [sc.x, sc.y])) { pick = sc; break; } if (!pick && sc) pick = { ...sc, covered: true }; }
    if (!pick.covered) { via = phone ? 'touch' : 'mouse'; if (phone) await p.touchscreen.tap(pick.x, pick.y); else await p.mouse.click(pick.x, pick.y); }
    else { via = 'canvas-click (HUD covers the spot)'; await p.evaluate(([x, y]) => document.getElementById('game').dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true })), [pick.x, pick.y]); } }
  else await press(style, v, true);
  while (t < ms) { await sleep(60); t += 60; const s = await st(); n = s.enters + s.portals; if (n > n0 && expect) break; }
  if (style !== 'tap') await press(style, v, false);
  await sleep(450); const s1 = await st(); return { fired: s1.enters + s1.portals - n0, last: s1.last, ms: t, via, after: { mode: s1.mode, panel: s1.panel, room: s1.room } };
}
// approaches for a trigger with tile T (front tile), inward vector iv (walk-in direction), lateral axis lv
function approaches(T, iv, solid) { const lv = [Math.abs(iv[1]), Math.abs(iv[0])], ov = [-iv[0], -iv[1]], add = (a, k, v) => [a[0] + k * v[0], a[1] + k * v[1]], free = (t) => !solid(t);
  const out = [], pick = (name, starts, v, via) => { for (const s of starts) if (free(s) && via(s)) { out.push({ name, start: s, v }); return; } out.push({ name, start: null, v, skip: 'blocked by scenery' }); };
  pick('front', [add(T, 2, ov), add(T, 1, ov)], iv, (s) => free(add(T, 1, ov)));
  for (const [nm, sg] of [['left', -1], ['right', 1]]) { const side = add(T, sg, lv), dir = [-sg * lv[0], -sg * lv[1]];
    pick(nm, [add(T, 2 * sg, lv), side], dir, () => free(side));
    pick('diag-' + nm, [add(add(T, 2 * sg, lv), 2, ov), add(add(T, sg, lv), 1, ov)], [dir[0] + iv[0], dir[1] + iv[1]], (s) => free(add(add(T, sg, lv), 1, ov))); // the diagonal tile itself must be open (as in tests/doors-side.test.mjs)
    pick('wall-' + nm, [add(side, 1, ov)], iv, () => free(side)); }
  return out; }
const res = { url: URL, viewport: VP, phone, doors: [], gates: [], rooms: [], outward: [], summary: {} };
const styles = phone ? ['stick', 'tap'] : ['keys', 'sprint', 'tap'];
const doors = (await p.evaluate(() => __doorTest.doors())).filter((d) => !ONLY || d.id === ONLY);
const solidMap = new Map(); const solidW = async (t, room = null) => { const k = (room || '') + t; if (!solidMap.has(k)) solidMap.set(k, await p.evaluate(([x, y, r]) => __doorTest.solid(x, y, r), [t[0], t[1], room])); return solidMap.get(k); };
async function runTarget(list, label, { room = null, T, iv, tapAt, extra = {} }) {
  const sol = new Map(); for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) { const t = [T[0] + dx, T[1] + dy]; sol.set(t + '', await solidW(t, room)); }
  const solid = (t) => sol.get(t + '') ?? true;
  for (const a of approaches(T, iv, solid)) for (const style of styles) {
    if (style === 'sprint' && !/^(front|diag-left)$/.test(a.name)) continue;
    if (style === 'tap' && /^wall-/.test(a.name)) continue;
    if (!a.start) { list.push({ ...extra, target: label, approach: a.name, style, skip: a.skip }); continue; }
    const face = a.v[1] < 0 ? 'up' : a.v[1] > 0 ? 'down' : a.v[0] < 0 ? 'left' : 'right';
    let r = await trial({ room, start: a.start, face, style, v: a.v, tapAt }), retried = null;
    if (style === 'tap' && r.fired === 0 && r.after.panel === 'friend') { retried = 'tap landed on a wandering NPC (opened their panel); tapped again'; r = await trial({ room, start: a.start, face, style, v: a.v, tapAt }); }
    list.push({ ...extra, target: label, approach: a.name, style, start: a.start, fired: r.fired, ok: r.fired === 1, ms: r.ms, ...(r.via ? { tapVia: r.via } : {}), ...(retried ? { retried } : {}), after: r.after }); } }
for (const d of doors) { const iv = d.side === 'left' ? [1, 0] : d.side === 'right' ? [-1, 0] : [0, -1];
  await runTarget(res.doors, `${d.kind}:${d.id}`, { T: [d.tx, d.ty], iv, tapAt: [[d.tx, d.ty], [d.tx + iv[0], d.ty + iv[1]]], extra: { name: d.name } });
  // spawn/exit: placed at the game's own exit spot (outsideOf) and walking away must never fire
  const o = await p.evaluate(([id, k]) => __doorTest.outside(id, k), [d.id, d.kind]); const ot = [Math.floor(o.x / 32), Math.floor(o.y / 32)];
  for (const v of [[-iv[0], -iv[1]], [-iv[0] + (iv[1] ? 1 : 0), -iv[1] + (iv[0] ? 1 : 0)], [-iv[0] - (iv[1] ? 1 : 0), -iv[1] - (iv[0] ? 1 : 0)]]) {
    const style = phone ? 'stick' : 'keys', r = await trial({ start: ot, face: o.face, style, v, expect: 0, ms: 900 }); const same = r.fired > 0 && r.last === `${d.kind}:${d.id}`; res.outward.push({ target: `${d.kind}:${d.id}`, v, style, fired: r.fired, ...(r.fired ? { entered: r.last } : {}), ok: !same }); /* walking away into a DIFFERENT door is fine */ } }
if (!ONLY) {
  for (const g of await p.evaluate(() => __doorTest.gates())) await runTarget(res.gates, 'gate:' + g.id, { T: [g.tx, g.ty], iv: FV[g.face], tapAt: [[g.tx, g.ty]] });
  for (const r of await p.evaluate(() => __doorTest.rooms())) for (const e of r.exits) {
    const T = e.tiles[0], iv = FV[e.face]; await runTarget(res.rooms, `${r.id}->${e.to}`, { room: r.id, T, iv, tapAt: e.spot ? [[T[0] + iv[0], T[1] + iv[1]], T] : [T, [T[0] + iv[0], T[1] + iv[1]]] }); } }
const all = [...res.doors, ...res.gates, ...res.rooms], ran = all.filter((x) => !x.skip);
res.summary = { trials: ran.length, ok: ran.filter((x) => x.ok).length, failed: ran.filter((x) => !x.ok).map((x) => `${x.target} ${x.approach} ${x.style} fired=${x.fired}`), skipped: all.length - ran.length,
  outward: { trials: res.outward.length, ok: res.outward.filter((x) => x.ok).length, failed: res.outward.filter((x) => !x.ok).map((x) => `${x.target} ${x.v} fired=${x.fired}`) }, errors: errs };
fs.writeFileSync(`${OUT}/doors-side-results-${VP}.json`, JSON.stringify(res, null, 1)); console.log(JSON.stringify(res.summary, null, 1)); await b.close();

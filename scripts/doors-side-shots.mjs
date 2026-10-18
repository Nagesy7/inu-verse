// Proof stills: walk into the café door from the left, right, front and a front diagonal with the on-screen touch stick, phone landscape.
//   URL=https://inu-verse-tawny.vercel.app/ OUT=proof node scripts/doors-side-shots.mjs  -> $OUT/doors-side-<approach>-<vp>-{before,after}.png
import { chromium } from 'playwright'; import fs from 'fs';
const URL = process.env.URL || 'http://127.0.0.1:8644/', OUT = process.env.OUT || 'proof', DOOR = process.env.DOOR || 'cafe'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(), out = { url: URL, door: DOOR, runs: [] };
const plans = { left: [[-2, 0], [1, 0]], right: [[2, 0], [-1, 0]], front: [[0, 3], [0, -1]], diag: [[-2, 2], [0.7, -0.7]] };
for (const [w, h] of [[844, 390], [667, 375]]) for (const [name, [[dx, dy], [vx, vy]]] of Object.entries(plans)) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true }), p = await ctx.newPage();
  await p.goto(URL); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); localStorage.setItem('inuverse.mp.off', '1'); }); await p.reload(); await p.waitForTimeout(900); await p.tap('#start'); await p.waitForTimeout(2200);
  await p.evaluate(() => { globalThis.__guide?.endTour?.('skipped'); __inu.setHour(11); document.querySelectorAll('.toast').forEach((t) => t.remove()); });
  const d = (await p.evaluate(() => __doorTest.doors())).find((q) => q.id === DOOR); const st = [d.tx + dx, d.ty + dy];
  const solid = await p.evaluate(([x, y]) => __doorTest.solid(x, y), st);
  await p.evaluate(([x, y, f]) => __doorTest.reset(x, y, f, null), [(st[0] + 0.5) * 32, (st[1] + 0.5) * 32, vx > 0 ? 'right' : vx < 0 ? 'left' : 'up']); await p.waitForTimeout(400);
  const tag = `${OUT}/doors-side-${name}-${w}x${h}`; await p.screenshot({ path: `${tag}-before.png` });
  const s = await p.evaluate(() => { const r = document.getElementById('stick').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, R: r.width / 2, vis: r.width > 0 }; });
  const cdp = await ctx.newCDPSession(p), e0 = await p.evaluate(() => __doorTest.st.enters);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: s.x, y: s.y, id: 1 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: s.x + s.R * 0.75 * vx, y: s.y + s.R * 0.75 * vy, id: 1 }] });
  let r = null; for (let i = 0; i < 60 && !r; i++) { await p.waitForTimeout(80); const q = await p.evaluate(() => __doorTest.st); if (q.enters > e0) r = q; }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(500);
  const after = await p.evaluate(() => __doorTest.st); await p.screenshot({ path: `${tag}-after.png` });
  out.runs.push({ vp: `${w}x${h}`, approach: name, start: st, startSolid: solid, stickVisible: s.vis, entered: !!r, enters: after.enters - e0, mode: after.mode, room: after.room, panel: after.panel });
  await ctx.close();
}
await b.close(); fs.writeFileSync(`${OUT}/doors-side-shots-results.json`, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out.runs));

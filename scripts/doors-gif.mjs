// Proof GIF: walking into a door from the SIDE (along the wall, not up the path) enters, on phone landscape with the joystick.
//   URL=https://inu-verse-tawny.vercel.app/ OUT=proof node scripts/doors-gif.mjs   -> $OUT/doors-side-entry.gif
import { chromium } from 'playwright'; import fs from 'fs'; import { execFileSync } from 'child_process';
const URL = process.env.URL || 'http://127.0.0.1:8644/', OUT = process.env.OUT || 'proof', DOOR = process.env.DOOR || 'cafe', TMP = '/tmp/doors-gif-frames';
fs.rmSync(TMP, { recursive: true, force: true }); fs.mkdirSync(TMP, { recursive: true }); fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true }), p = await ctx.newPage();
await p.goto(URL); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); localStorage.setItem('inuverse.mp.off', '1'); }); await p.reload(); await p.waitForTimeout(900); await p.click('#start'); await p.waitForTimeout(2200);
await p.evaluate(() => { globalThis.__guide?.endTour?.('skipped'); __inu.setHour(11); document.querySelectorAll('.toast').forEach((t) => t.remove()); });
const d = (await p.evaluate(() => __doorTest.doors())).find((q) => q.id === DOOR); // a front door: start 2 tiles left of it, on the row in front of the wall, walk right
let k = 4; while (k > 2 && await p.evaluate(([x, y]) => __doorTest.solid(x, y), [d.tx - k, d.ty])) k--; const start = [d.tx - k, d.ty]; await p.evaluate(([x, y]) => __doorTest.reset(x, y, 'right', null), [(start[0] + 0.5) * 32, (start[1] + 0.5) * 32]); await p.waitForTimeout(400);
const cdp = await ctx.newCDPSession(p), s = await p.evaluate(() => { const r = document.getElementById('stick').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, R: r.width / 2 }; });
let n = 0; const shot = async () => p.screenshot({ path: `${TMP}/f${String(n++).padStart(3, '0')}.png` });
for (let i = 0; i < 6; i++) { await shot(); await p.waitForTimeout(60); }
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: s.x, y: s.y, id: 1 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: s.x + s.R * 0.75, y: s.y, id: 1 }] });
const e0 = await p.evaluate(() => __doorTest.st.enters); let entered = null;
for (let i = 0; i < 40; i++) { await shot(); const st = await p.evaluate(() => __doorTest.st); if (st.enters > e0 && !entered) entered = { frame: n, mode: st.mode, room: st.room, panel: st.panel, last: st.last }; if (entered && n > entered.frame + 14) break; }
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await b.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '8', '-i', `${TMP}/f%03d.png`, '-vf', 'scale=640:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer', `${OUT}/doors-side-entry.gif`]);
console.log(JSON.stringify({ door: d, start, frames: n, entered, gif: `${OUT}/doors-side-entry.gif` }));

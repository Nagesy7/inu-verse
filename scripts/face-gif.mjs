// Face animation GIF frames: every coat (front + side + back) idling, talking and reacting in real time. OUT dir = /tmp/facegif
import { chromium } from 'playwright'; import fs from 'fs';
const URL = process.env.URL || 'http://localhost:8642/tests/blank.html', DIR = process.env.DIR || '/tmp/facegif';
fs.rmSync(DIR, { recursive: true, force: true }); fs.mkdirSync(DIR);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 760, height: 330 } }); await p.goto(URL);
await p.evaluate(async () => { const A = await import('/src/art.js'); const F = await import('/src/face.js'); await A.artReady; const { OUTFITS } = await import('/src/outfits.js');
  const cv = Object.assign(document.createElement('canvas'), { width: 760, height: 330 }); document.body.style.margin = 0; document.body.appendChild(cv); const c = cv.getContext('2d');
  const coats = ['tan', 'cream', 'red', 'dark', 'golden', 'gray'], hat = Object.keys(OUTFITS).find((k) => OUTFITS[k].slot === 'hat'), top = Object.keys(OUTFITS).find((k) => OUTFITS[k].slot === 'top'), t0 = performance.now();
  const cast = [['tan', 'down', {}], ['cream', 'down', { hat, top }], ['dark', 'down', {}], ['golden', 'down', {}], ['red', 'right', {}], ['gray', 'right', {}], ['tan', 'up', {}]];
  globalThis.__fired = {};
  const loop = () => { const t = (performance.now() - t0) / 1000; c.fillStyle = '#cfe6b8'; c.fillRect(0, 0, 760, 330); c.fillStyle = '#123'; c.font = '12px monospace';
    c.fillText(t < 3 ? 'idle: blinks + glances' : t < 6 ? 'talking (row 1) / ear twitch' : t < 8 ? 'reaction: purchase joy' : 'idle moods: happy, curious, sleepy yawn', 8, 16);
    if (t > 3 && !__fired.talk) { __fired.talk = 1; cast.forEach((_, i) => i < 4 && F.faceTalk('g' + i, 3)); }
    if (t > 6 && !__fired.joy) { __fired.joy = 1; cast.forEach((_, i) => F.faceReact('g' + i, i % 3 ? 'joy' : 'wow', 2)); }
    cast.forEach(([coat, face, outfit], i) => { const x = 56 + i * 108, y = 300; A.drawShiba(c, x, y, { coat, art: A.artKey(coat), outfit, face, scale: 2.7, fid: 'g' + i, wag: face === 'up' ? 1 : 0, shadow: false }); });
    requestAnimationFrame(loop); }; loop(); });
for (let i = 0; i < 90; i++) { await p.screenshot({ path: `${DIR}/f${String(i).padStart(3, '0')}.png` }); await p.waitForTimeout(110); }
await b.close();

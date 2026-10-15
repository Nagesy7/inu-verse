// Face proof: close-up grid of every expression per coat/view (+ outfit/hat), and GIF frames of an idle/talking cycle.
import { chromium } from 'playwright'; import fs from 'fs';
const URL = process.env.URL || 'http://localhost:8642/tests/blank.html', OUT = process.env.OUT || '/tmp/face-grid.png';
const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(URL);
const url = await p.evaluate(async () => { const A = await import('/src/art.js'); await A.artReady; const { OUTFITS } = await import('/src/outfits.js');
  const S = [['neutral', {}], ['blink', { eye: 'blink' }], ['look L', { lx: -1 }], ['look R', { lx: 1 }], ['look down', { ly: 1 }], ['happy', { eye: 'happy', mouth: 'tongue' }], ['curious', { lx: -1, ly: -1, ear: 1 }], ['sleepy', { eye: 'half' }], ['yawn', { eye: 'blink', mouth: 'yawn' }], ['talk', { mouth: 'open' }], ['wow', { mouth: 'open', ly: -1, ear: 1 }], ['wag', { tail: 1 }]];
  const hat = Object.keys(OUTFITS).find((k) => OUTFITS[k].slot === 'hat'), top = Object.keys(OUTFITS).find((k) => OUTFITS[k].slot === 'top');
  const rows = []; for (const coat of ['tan', 'cream', 'red', 'dark', 'golden', 'gray']) for (const view of ['front', 'side']) rows.push([coat, view, {}]);
  rows.push(['tan', 'back', {}], ['dark', 'back', {}], ['tan', 'front', { hat, top }], ['red', 'side', { hat, top }]);
  const cell = 124, ch = 120, cv = Object.assign(document.createElement('canvas'), { width: 70 + S.length * cell, height: 20 + rows.length * ch }), c = cv.getContext('2d'); c.fillStyle = '#e8eef8'; c.fillRect(0, 0, cv.width, cv.height); c.imageSmoothingEnabled = false;
  c.fillStyle = '#123'; c.font = '11px monospace'; S.forEach(([n], i) => c.fillText(n, 72 + i * cell, 13));
  rows.forEach(([coat, view, outfit], r) => { c.fillStyle = '#123'; c.fillText(coat, 2, 40 + r * ch); c.fillText(view, 2, 54 + r * ch); if (outfit.hat) c.fillText('+outfit', 2, 68 + r * ch);
    S.forEach(([, st], i) => { const base = { eye: 'open', lx: 0, ly: 0, mouth: 'none', ear: 0, tail: 0, ...st }; const lc = A.__layered(coat, view, 0, outfit), v = A.faceCanvas(lc, coat, view, 0, outfit, base);
      c.drawImage(v, 0, 0, v.width, v.height * 0.5, 70 + i * cell, 20 + r * ch, v.width, v.height * 0.5); }); });
  return cv.toDataURL(); });
fs.writeFileSync(OUT, Buffer.from(url.split(',')[1], 'base64')); console.log('errors', errs); await b.close();

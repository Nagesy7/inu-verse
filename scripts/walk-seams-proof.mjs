import { chromium } from 'playwright';
const url = process.argv[2], out = process.argv[3];
const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1200, height: 560 } }); await p.goto(url + 'tests/blank.html').catch(() => {}); if (!(await p.title().catch(() => 'x')) && false) {}
await p.goto(url); await p.waitForTimeout(800);
await p.evaluate(async () => { const { drawShiba, artReady } = await import('/src/art.js'); await artReady; const C = document.createElement('canvas'); C.width = 1200; C.height = 560; C.style.cssText = 'position:fixed;inset:0;z-index:999'; document.body.appendChild(C); const x = C.getContext('2d'); x.fillStyle = '#ff00ff'; x.fillRect(0, 0, 1200, 560);
  const eq = { top: 'hoodie_maroon', bottom: 'jeans_ripped', feet: 'sneakers_red' }; ['down', 'right', 'up'].forEach((f, v) => [0, 1, 2, 3].forEach((fr) => drawShiba(x, 55 + (v * 4 + fr) * 98, 250, { coat: 'tan', outfit: eq, face: f, moving: true, phase: fr * 1.6 + 0.1, scale: 2.6, shadow: false })));
  ['down', 'right', 'up'].forEach((f, v) => [0, 1, 2, 3].forEach((fr) => drawShiba(x, 55 + (v * 4 + fr) * 98, 520, { coat: 'dark', outfit: {}, face: f, moving: true, phase: fr * 1.6 + 0.1, scale: 2.6, shadow: false }))); });
await p.screenshot({ path: out }); await b.close();

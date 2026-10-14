// Proof for layered outfit art: close-ups (every coat, front/side/back, walk frames) + in-world / UI shots.
import { chromium } from 'playwright';
const URL = process.env.URL || 'http://localhost:8642/';
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => m.type() !== 'log' && m.type() !== 'debug' && errors.push(m.type() + ': ' + m.text()));
const shot = async (n) => { await page.evaluate(() => document.querySelectorAll('.toast').forEach((t) => t.remove())); await page.screenshot({ path: `proof/outfit-art-${n}.png` }); console.log('proof/outfit-art-' + n + '.png'); };
await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(1200);
const LOOKS = [
  ['SUIT+CAP', { top: 'suit_navy', bottom: 'slacks_navy', neck: 'tie_red', hat: 'cap_red', feet: 'loafers' }],
  ['HOODIE', { top: 'hoodie_maroon', bottom: 'jeans_ripped', neck: 'chain_gold', feet: 'sneakers_red' }],
  ['GOWN', { top: 'velvet_gown', hat: 'crown', neck: 'diamond_chain', eyes: 'plat_shades' }],
  ['TUX', { top: 'tux_black', bottom: 'slacks_black', neck: 'bowtie', hat: 'top_hat', feet: 'sneakers_gold', eyes: 'shades' }],
  ['HAWAIIAN', { top: 'hawaiian', bottom: 'chinos', eyes: 'gold_shades', feet: 'sneakers_red' }],
  ['GOLD SUIT', { top: 'gold_suit', bottom: 'slacks_black', hat: 'crown', neck: 'diamond_chain', feet: 'loafers' }],
  ['JACKET', { top: 'jacket_black', bottom: 'slacks_black', neck: 'chain_gold', feet: 'sneakers_gold' }],
  ['WHITE GOWN', { top: 'gown_white', neck: 'chain_gold' }],
];
const sheet = async (n, js) => {
  await page.evaluate(() => { window.__sdone = 0; });
  await page.addScriptTag({ type: 'module', content: `import { drawShiba, artReady } from '/src/art.js'; await artReady; const LOOKS = ${JSON.stringify(LOOKS)};
    const c = document.createElement('canvas'); c.id = 'sprsheet'; c.width = 1280; c.height = 800; c.style.cssText = 'position:fixed;inset:0;z-index:99'; document.body.appendChild(c);
    const x = c.getContext('2d'); x.fillStyle = '#121a36'; x.fillRect(0, 0, 1280, 800); x.font = '12px Silkscreen, monospace'; x.textAlign = 'center';
    const lbl = (t, X, Y) => { x.fillStyle = '#f2cc68'; x.fillText(t, X, Y); };
    ${js}
    window.__sdone = 1;` });
  await page.waitForFunction(() => window.__sdone === 1); await shot(n); await page.evaluate(() => document.getElementById('sprsheet').remove());
};
const COATS = ['tan', 'cream', 'red', 'dark', 'golden', 'gray'];
// one sheet per coat: 4 looks x (front, side-right, back, side-left) at scale 2.2
for (const [i, coat] of COATS.entries()) await sheet(`0${i + 1}-${coat}-views`, `lbl('${coat.toUpperCase()} COAT - LAYERED OUTFIT ART - FRONT / SIDE / BACK / LEFT', 640, 24);
  const L = [[ 'PLAIN', {} ], ...LOOKS.slice(${i % 2 ? 4 : 0}, ${i % 2 ? 8 : 4})].slice(0, 5);
  L.forEach(([t, o], col) => { const X = 130 + col * 255; lbl(t, X, 60);
    ['down', 'right', 'up', 'left'].forEach((f, r) => drawShiba(x, X + (r % 2 ? 55 : -55), 255 + Math.floor(r / 2) * 330, { coat: '${coat}', outfit: o, face: f, scale: 2.4, shadow: false })); });`);
// walk frames: all 4 frames for side + front on two coats
await sheet('07-walk-frames', `lbl('WALK CYCLE FRAMES 0-3 (FRONT / SIDE / BACK) - LAYERS STAY ALIGNED', 640, 24);
  [['red', LOOKS[0][1]], ['gray', LOOKS[3][1]]].forEach(([coat, o], k) => ['down', 'right', 'up'].forEach((f, v) => [0, 1, 2, 3].forEach((fr) => drawShiba(x, 80 + (v * 4 + fr) * 103, 260 + k * 360, { coat, outfit: o, face: f, moving: true, phase: fr * 1.6 + 0.1, scale: 2.2, shadow: false }))));`);
// in-world
await page.fill('#name', 'Kabosu'); await page.click('.coat[data-coat="red"]'); await page.waitForTimeout(300);
await page.click('#start'); await page.waitForTimeout(800);
await page.evaluate(() => { const w = __inu.state.wardrobe; w.owned = ['top_hat', 'tux_black', 'slacks_black', 'bowtie', 'sneakers_gold', 'shades', 'hoodie_maroon', 'jeans_ripped', 'cap_red', 'chain_gold']; w.equipped = { hat: 'top_hat', top: 'tux_black', bottom: 'slacks_black', neck: 'bowtie', feet: 'sneakers_gold', eyes: 'shades' }; });
await page.keyboard.down('d'); await page.waitForTimeout(700); await shot('08-in-world-walk-side'); await page.keyboard.up('d');
await page.keyboard.down('w'); await page.waitForTimeout(500); await shot('09-in-world-walk-back'); await page.keyboard.up('w');
await page.keyboard.down('s'); await page.waitForTimeout(400); await page.keyboard.up('s'); await page.waitForTimeout(500); await shot('10-in-world-front');
await page.evaluate(() => { __inu.cam.x; }); 
// NPCs on Sakura lane
const clickTile = async (tx, ty) => { const p = await page.evaluate(([tx, ty]) => ({ x: (tx + 0.5) * 32 - __inu.cam.x + innerWidth / 2, y: (ty + 0.5) * 32 - __inu.cam.y + innerHeight / 2 }), [tx, ty]); await page.mouse.click(p.x, p.y); };
const n0 = await page.evaluate(() => ({ x: __inu.npcs[0].x, y: __inu.npcs[0].y }));
await page.evaluate(([x, y]) => { __inu.state.player.x = x + 60; __inu.state.player.y = y; }, [n0.x, n0.y]); await page.waitForTimeout(1500); await shot('11-npcs-in-world');
// wardrobe + shop cards
const mini = async (tx, ty) => { const b = await page.locator('#minimap').boundingBox(); await page.mouse.click(b.x + tx * 2 + 1, b.y + ty * 2 + 1); };
await page.evaluate(() => { __inu.state.bones += 3000; });
await mini(26, 14); await page.waitForFunction(() => __inu.panel === 'fashion', null, { timeout: 30000 }); await page.waitForTimeout(400); await shot('12-shop-cards');
await page.click('#open-wardrobe'); await page.waitForFunction(() => __inu.panel === 'wardrobe'); await page.waitForTimeout(300); await shot('13-wardrobe');
await page.click('#panel-close');
await page.reload(); await page.waitForTimeout(1500); await shot('14-title-preview');
console.log('errors:', JSON.stringify(errors));
await browser.close();

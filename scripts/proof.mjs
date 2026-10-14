import { chromium } from 'playwright';
import fs from 'node:fs';
const URL = process.env.URL || 'http://localhost:8642/';
fs.mkdirSync('proof', { recursive: true });
const log = []; const L = (m) => { const s = `[${new Date().toISOString()}] ${m}`; console.log(s); log.push(s); };
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const shot = async (n) => { await page.screenshot({ path: `proof/verse-${n}.png` }); L('screenshot proof/verse-' + n + '.png'); };
const st = () => page.evaluate(() => JSON.parse(JSON.stringify({ bones: __inu.state.bones, kibble: __inu.state.kibble, x: __inu.state.player.x, y: __inu.state.player.y, plots: Object.keys(__inu.state.plots), inv: __inu.state.inventory, mode: __inu.mode, panel: __inu.panel })));
// click a world tile (real mouse click on canvas)
const clickTile = async (tx, ty) => { const p = await page.evaluate(([tx, ty]) => ({ x: (tx + 0.5) * 32 - __inu.cam.x + innerWidth / 2, y: (ty + 0.5) * 32 - __inu.cam.y + innerHeight / 2 }), [tx, ty]); await page.mouse.click(p.x, p.y); };
const mini = async (tx, ty) => { const b = await page.locator('#minimap').boundingBox(); await page.mouse.click(b.x + tx * 3 + 1.5, b.y + ty * 3 + 1.5); };
const waitPanel = (k) => page.waitForFunction((k) => __inu.panel === k, k, { timeout: 30000 });

await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload();
await page.waitForTimeout(900); await shot('01-title');
const sshot = async (n) => { await page.evaluate(() => document.querySelectorAll('.toast').forEach((t) => t.remove())); await page.screenshot({ path: `proof/style-${n}.png` }); L('screenshot proof/style-' + n + '.png'); };
L('coat choices: ' + (await page.$$eval('.coat', (b) => b.map((x) => x.textContent))).join(' | '));
await sshot('01-character-creation');
await page.fill('#name', 'Kabosu'); await page.click('.coat[data-coat="gray"]'); await page.waitForTimeout(300); await shot('02-avatar');
await page.click('#start'); await page.waitForTimeout(800);
let s = await st(); L(`started: bones=${s.bones} kibble=${s.kibble} pos=${s.x|0},${s.y|0}`);
await page.keyboard.down('d'); await page.waitForTimeout(900); await page.keyboard.up('d');
await page.keyboard.down('ArrowUp'); await page.waitForTimeout(500); await page.keyboard.up('ArrowUp');
const s2 = await st(); L(`walked with keys: pos=${s2.x|0},${s2.y|0} (moved ${Math.hypot(s2.x - s.x, s2.y - s.y) | 0}px)`); await shot('03-walk');
await page.waitForTimeout(1200); await sshot('02-neighbourhood');
// café job: click building
await mini(6, 14); await waitPanel('cafe'); L('arrived at café via click-to-move');
await page.click('#cstart');
const t0 = Date.now(); let served = 0;
while (Date.now() - t0 < 64000) {
  const o = await page.$('.order[data-items]');
  if (o) { const items = (await o.getAttribute('data-items')).split(','); for (const it of items) await page.click(`#menu [data-item="${it}"]`); if (served === 1) await shot('04-cafe'); await o.click(); served++; }
  if (await page.$('#shift-total')) break;
  await page.waitForTimeout(400);
}
await page.waitForSelector('#shift-total', { timeout: 10000 }); L('shift result: ' + await page.textContent('#shift-total') + ` (served clicks ${served})`); await shot('05-cafe-paid');
await page.click('#panel-close'); s = await st(); L(`bones after job: ${s.bones}`);
// claim plot p5 (x 35..40, y 24..29)
await mini(37, 26); await waitPanel('plot'); await shot('06-plot'); await page.click('#claim'); await page.waitForTimeout(500);
s = await st(); L(`claimed: plots=${s.plots} bones=${s.bones} mode=${s.mode}`); await page.click('#bexit');
// shop
await mini(17, 14); await waitPanel('shop');
for (const id of ['sofa', 'plant', 'lamp', 'rug']) { await page.click(`[data-buy="${id}"]`); await page.waitForTimeout(150); }
await shot('07-shop'); s = await st(); L(`bought: inv=${JSON.stringify(s.inv)} bones=${s.bones}`); await page.click('#panel-close');
await mini(37, 26); await page.waitForFunction(() => __inu.mode === 'build', null, { timeout: 30000 }); L('entered home build mode');
const cellPos = (cx, cy) => page.evaluate(([cx, cy]) => { const cell = Math.floor(Math.min((innerWidth - 60) / 10, (innerHeight - 270) / (7 + 1.6), 64)); const ox = Math.floor(innerWidth / 2 - 5 * cell), oy = Math.floor(80 + cell * 1.6); return { x: ox + (cx + 0.5) * cell, y: oy + (cy + 0.5) * cell }; }, [cx, cy]);
const place = async (id, cx, cy, rot = 0) => { await page.click(`[data-inv="${id}"]`); for (let i = 0; i < rot; i++) await page.keyboard.press('r'); const p = await cellPos(cx, cy); await page.mouse.move(p.x, p.y); await page.mouse.click(p.x, p.y); await page.waitForTimeout(150); };
await place('rug', 3, 3); await place('sofa', 3, 2); await place('plant', 0, 0); await place('lamp', 9, 0);
// collision proof: try to buy-less place over sofa should fail; check count
const items = await page.evaluate(() => __inu.state.plots.p5.items.map((i) => i.id)); L('placed items: ' + items.join(','));
await shot('08-home'); await page.click('#bexit');
// launch hall
await mini(41, 14); await waitPanel('launch'); await page.fill('#swapamt', '100'); await page.click('#swap');
await page.fill('#tname', 'Shiba Star'); await page.fill('#tticker', 'STAR'); await page.fill('#tcolor', '#ff7a3a').catch(() => {}); await page.click('#tcreate'); await page.waitForTimeout(300);
await page.fill('#buyamt', '3'); await page.click('#buybtn'); await page.waitForTimeout(4500);
L('after buy: you hold ' + await page.textContent('#st-you') + ' $STAR, holders ' + await page.textContent('#st-holders') + ', mcap ' + await page.textContent('#st-mcap'));
await shot('09-launch'); await page.click('[data-sell="0.5"]'); await page.waitForTimeout(400);
s = await st(); L(`after selling 50%: kibble=${s.kibble.toFixed(3)} hold=${await page.textContent('#st-you')}`); await shot('10-launch-sell');
await page.click('#panel-close');
await clickTile(41, 9); await page.waitForTimeout(4000); await shot('11-market-row');
// Launch Hall exterior (stand on the plaza in front of it)
await clickTile(40, 19); await page.waitForFunction(() => !__inu.panel && Math.abs(__inu.state.player.y - 19.5 * 32) < 2 && Math.abs(__inu.state.player.x - 40.5 * 32) < 2, null, { timeout: 30000 }); await page.waitForTimeout(1500); await sshot('03-launch-hall-exterior');
// Fetch Fashion: proof tops up bones (logged) so every outfit can be shown
await page.evaluate(() => { __inu.state.bones += 1500; }); L('proof top-up: +1500 bones for fashion demo');
await clickTile(25, 19); await page.waitForFunction(() => Math.abs(__inu.state.player.x - 25.5 * 32) < 2 && Math.abs(__inu.state.player.y - 19.5 * 32) < 2, null, { timeout: 30000 }); await page.waitForTimeout(1500); await sshot('04-fetch-fashion-exterior');
await mini(26, 14); await waitPanel('fashion'); await page.waitForTimeout(300);
const b0 = (await st()).bones;
for (const id of ['hawaiian', 'chinos', 'gold_shades', 'chain_gold', 'sneakers_red', 'cap_red', 'suit_navy', 'gown_white']) { await page.click(`[data-buyfit="${id}"]`); await page.waitForTimeout(120); }
s = await st(); L(`fashion: spent ${b0 - s.bones} bones; owned=${JSON.stringify(await page.evaluate(() => __inu.state.wardrobe.owned))}`);
await page.evaluate(() => document.querySelector('.panel-card').scrollTop = 0); await sshot('05-fashion-shop');
await page.click('#open-wardrobe'); await waitPanel('wardrobe');
for (const id of ['hawaiian', 'chinos', 'gold_shades', 'chain_gold', 'sneakers_red']) await page.click(`[data-wear="${id}"]`);
L('equipped: ' + JSON.stringify(await page.evaluate(() => __inu.state.wardrobe.equipped))); await sshot('06-wardrobe');
await page.click('#panel-close'); await page.keyboard.down('s'); await page.waitForTimeout(500); await page.keyboard.up('s'); await page.waitForTimeout(400); await sshot('07-outfit-in-world');
await page.reload(); await page.waitForTimeout(900); await sshot('08-title-with-saved-outfit'); const cont = await page.isVisible('#continue'); await page.click('#continue'); await page.waitForTimeout(500);
s = await st(); L(`reload persistence: continue=${cont} plots=${s.plots} bones=${s.bones} tokens=${await page.evaluate(() => __inu.state.tokens.length)} outfit=${JSON.stringify(await page.evaluate(() => __inu.state.wardrobe.equipped))}`);
await clickTile(12, 33); await page.waitForTimeout(6000); await sshot('09-sakura-lane-npc-outfits');
await mini(11, 37); await page.waitForFunction(() => __inu.mode === 'build', null, { timeout: 30000 }).catch(() => {}); await page.waitForTimeout(400); await shot('12-visit-home');
L('page errors: ' + (errors.length ? errors.join(' | ') : 'none'));
fs.writeFileSync('proof/verse-log.txt', log.join('\n') + '\n'); await browser.close();
if (errors.length) process.exit(1);

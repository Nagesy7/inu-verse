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
const mini = async (tx, ty) => { const b = await page.locator('#minimap').boundingBox(); await page.mouse.click(b.x + tx * 2 + 1, b.y + ty * 2 + 1); };
const waitPanel = (k) => page.waitForFunction((k) => __inu.panel === k, k, { timeout: 30000 });

await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload();
await page.waitForTimeout(900); await shot('01-title');
// ---- sprite close-ups (rendered with the game's own sprite code into an overlay canvas) ----
const spriteShot = async (n, js) => {
  await page.evaluate(() => { window.__sdone = 0; });
  await page.addScriptTag({ type: 'module', content: `import { drawShiba } from '/src/art.js'; import { NPC_OUTFITS } from '/src/npc.js'; import { COATS } from '/src/game.js';
    const c = document.createElement('canvas'); c.id = 'sprsheet'; c.width = 1280; c.height = 800; c.style.cssText = 'position:fixed;inset:0;z-index:99'; document.body.appendChild(c);
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.fillStyle = '#121a36'; x.fillRect(0, 0, 1280, 800); x.font = '14px Silkscreen, monospace'; x.textAlign = 'center';
    const lbl = (t, X, Y) => { x.fillStyle = '#f2cc68'; x.fillText(t, X, Y); };
    ${js}
    window.__sdone = 1;` });
  await page.waitForFunction(() => window.__sdone === 1); await page.screenshot({ path: `proof/sprite-${n}.png` }); L('screenshot proof/sprite-' + n + '.png');
  await page.evaluate(() => document.getElementById('sprsheet').remove());
};
await page.evaluate(() => document.fonts.load('14px Silkscreen'));
await spriteShot('01-six-coats-closeup', `lbl('SIX STARTER SHIBA COATS - FRONT / SIDE / BACK', 640, 30);
  Object.entries(COATS).forEach(([k, c], i) => { const X = 110 + i * 212; drawShiba(x, X, 330, { coat: k, scale: 4, shadow: false }); lbl(c.name.toUpperCase(), X, 380);
    drawShiba(x, X - 52, 690, { coat: k, scale: 2, face: 'right', shadow: false }); drawShiba(x, X + 52, 690, { coat: k, scale: 2, face: 'up', shadow: false }); });`);
await spriteShot('02-outfits-closeup', `lbl('FETCH FASHION LOOKS ON SHIBA AVATARS', 640, 30);
  NPC_OUTFITS.forEach((o, i) => { const X = 110 + i * 212, k = ['tan', 'cream', 'red', 'dark', 'golden', 'gray'][i]; drawShiba(x, X, 330, { coat: k, outfit: o, scale: 4, shadow: false });
    drawShiba(x, X - 52, 690, { coat: k, outfit: o, scale: 2, face: 'right', shadow: false }); drawShiba(x, X + 52, 690, { coat: k, outfit: o, scale: 2, face: 'up', shadow: false }); });
  ['SUIT + CAP', 'JACKET + CHAIN', 'TUXEDO', 'HOODIE + HAIR', 'GOWN + LONG HAIR', 'HAWAIIAN + SHADES'].forEach((t, i) => lbl(t, 110 + i * 212, 380));`);

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
await page.evaluate(() => document.querySelectorAll('.toast').forEach((t) => t.remove())); await page.screenshot({ path: 'proof/sprite-03-world-scale.png' }); L('screenshot proof/sprite-03-world-scale.png (characters ~3 tiles tall next to buildings)');
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

// ---- Packs (local simulation) ----
page.on('dialog', (d) => d.accept());
const pshot = async (n) => { await page.evaluate(() => document.querySelectorAll('.toast').forEach((t) => t.remove())); await page.screenshot({ path: `proof/packs-${n}.png` }); L('screenshot proof/packs-' + n + '.png'); };
const pk = () => page.evaluate(() => { const P = __inu.state.packs, p = P.joined && P.all[P.joined]; return p ? { id: p.id, name: p.name, tag: p.tag, members: p.members.length, treasury: p.treasury, items: p.clubhouse.items.length, pool: p.pool, board: p.board.length, owner: p.ownerId } : null; });
if (await page.isVisible('#bexit')) await page.click('#bexit');
await page.click('#btn-pack'); await waitPanel('packs'); await pshot('01-find-a-pack');
await page.click('[data-join="pk_bark"]'); await page.waitForTimeout(200); L('joined: ' + JSON.stringify(await pk())); await pshot('02-joined-npc-pack');
await page.click('[data-tab="board"]'); await page.fill('#ppost', 'Hi Barkers! Reporting for café duty.'); await page.click('#ppostb'); await page.waitForTimeout(200); await pshot('03-pack-board');
await page.click('[data-tab="home"]'); await page.click('#pleave'); await page.waitForTimeout(200); L('after leave: joined=' + JSON.stringify(await pk()) + ' bark members=' + await page.evaluate(() => __inu.state.packs.all.pk_bark.members.length));
await page.evaluate(() => { __inu.state.bones += 1200; }); L('proof top-up: +1200 bones for Pack demo');
await page.click('[data-tab="create"]'); await page.fill('#pname', 'Shiba Squad'); await page.fill('#ptag', 'SQD'); await page.fill('#pcolor', '#e0733a').catch(() => {}); await page.click('[data-emb="paw"]');
await pshot('04-found-a-pack'); const bb = (await st()).bones; await page.click('#pcreate'); await page.waitForTimeout(200);
L(`founded: ${JSON.stringify(await pk())} cost=${bb - (await st()).bones} bones`);
await page.fill('#pamt', '700'); await page.click('#pcontrib'); await page.waitForTimeout(150);
await page.click('#precruit'); await page.waitForTimeout(100); await page.click('#precruit'); await page.waitForTimeout(100); await page.click('#precruit'); await page.waitForTimeout(150);
L('after contribute + 3 simulated recruits: ' + JSON.stringify(await pk())); await pshot('05-my-pack');
await page.click('#pgo'); await page.waitForFunction(() => __inu.mode === 'build', null, { timeout: 30000 }); L('walked to clubhouse, entered Pack build mode');
for (const id of ['sofa', 'rug', 'plant', 'plant', 'lamp', 'tv', 'arcade']) { await page.click(`[data-pbuy="${id}"]`); await page.waitForTimeout(80); }
await page.click('[data-wall="2"]'); await page.waitForTimeout(80);
L('pool after treasury buys: ' + JSON.stringify(await pk()));
await place('rug', 3, 3); await place('sofa', 3, 2); await place('plant', 0, 0); await place('plant', 9, 0); await place('lamp', 0, 6); await place('tv', 4, 0); await place('arcade', 9, 6);
L('clubhouse after decorating: ' + JSON.stringify(await pk()) + ' my decor=' + await page.evaluate(() => __inu.state.packs.all[__inu.state.packs.joined].members.find((m) => m.id === 'you').stats.decor));
await pshot('06-clubhouse-decorate'); await page.click('#bexit');
await page.evaluate(() => { const p = __inu.state.packs.all[__inu.state.packs.joined]; return p; });
await clickTile(50, 7); await page.waitForFunction(() => Math.abs(__inu.state.player.x - 50.5 * 32) < 2 && Math.abs(__inu.state.player.y - 7.5 * 32) < 2, null, { timeout: 30000 }); await page.waitForTimeout(1500); await pshot('07-clubhouse-banner-and-badge');
await page.click('#btn-pack'); await waitPanel('packs'); await page.click('[data-tab="cup"]'); await page.waitForTimeout(150); await pshot('08-kibble-cup-leaderboard');
L('leaderboard: ' + JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('table.cup tr[data-row]')].map((r) => r.innerText.replace(/\s+/g, ' ').trim()))));
await page.click('[data-tab="board"]'); await page.waitForTimeout(100); await pshot('09-my-pack-board'); await page.click('#panel-close');
await page.reload(); await page.waitForTimeout(800); await page.click('#continue'); await page.waitForTimeout(400);
L('reload persistence (packs): ' + JSON.stringify(await pk()));

// ---- Alive world: day/night, weather, emotes, petting, ball, photo mode, wildlife ----
const ashot = async (n) => { await page.evaluate(() => document.querySelectorAll('.toast').forEach((t) => t.remove())); await page.screenshot({ path: `proof/${n}.png` }); L('screenshot proof/' + n + '.png'); };
const tp = async (tx, ty) => { await page.evaluate(([tx, ty]) => { __inu.state.player.x = (tx + 0.5) * 32; __inu.state.player.y = (ty + 0.5) * 32; __inu.cam.x = __inu.state.player.x; __inu.cam.y = __inu.state.player.y; }, [tx, ty]); await page.waitForTimeout(700); };
await tp(18, 19); await page.evaluate(() => __inu.setHour(12)); await ashot('alive-01-day');
await page.evaluate(() => __inu.setHour(18.2)); await page.waitForTimeout(300); await ashot('alive-02-sunset');
await page.evaluate(() => __inu.setHour(22.5)); await page.waitForTimeout(300); await ashot('alive-03-night');
await tp(40, 21); await page.waitForTimeout(400); await ashot('wildlife-04-night-fireflies-lamp-moths');
await page.evaluate(() => { __inu.setHour(13); __inu.setRain(1); }); await tp(18, 19); await page.waitForTimeout(500); await ashot('alive-04-rain');
await page.evaluate(() => __inu.setRain(0)); await page.waitForTimeout(300);
const n0 = await page.evaluate(() => { const n = __inu.npcs[0]; n.path = []; n.wait = 99; return { x: n.x, y: n.y, name: n.name }; });
await page.evaluate(() => { const n = __inu.npcs[0]; __inu.state.player.x = n.x - 40; __inu.state.player.y = n.y; __inu.cam.x = n.x; __inu.cam.y = n.y; }); await page.waitForTimeout(500);
await page.keyboard.press('4'); await page.waitForTimeout(1100); await ashot('alive-05-emote-dance'); L('emote near ' + n0.name + ' npc emote: ' + JSON.stringify(await page.evaluate(() => __inu.npcs.map((n) => n.emote?.kind || null))));
await page.waitForTimeout(1600); await page.keyboard.press('e'); await page.waitForTimeout(300); await ashot('alive-06-pet-npc');
await page.keyboard.press('t'); await page.waitForTimeout(700); await ashot('alive-07-ball-fetch'); await page.waitForTimeout(4000); L('ball after fetch: ' + JSON.stringify(await page.evaluate(() => __inu.amb.ball && __inu.amb.ball.state)));
await page.keyboard.press('b'); await page.waitForTimeout(200);
await page.keyboard.press('p'); await page.waitForTimeout(300); await ashot('alive-08-photo-mode');
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#photo-save')]); L('photo mode download: ' + dl.suggestedFilename()); await page.keyboard.press('p');
await tp(9, 10); await page.waitForTimeout(1200); await ashot('wildlife-01-pond-ducks-pups-busker-free');
await tp(45, 10); await page.waitForTimeout(1200); await ashot('wildlife-02-busker-and-plaza');
const bird = await page.evaluate(() => { const b = __inu.amb.birds.find((b) => b.state === 'ground'); return { x: b.hx, y: b.hy }; });
await page.evaluate((b) => { __inu.state.player.x = b.x + 150; __inu.state.player.y = b.y; __inu.cam.x = b.x; __inu.cam.y = b.y; }, bird); await page.waitForTimeout(800); await ashot('wildlife-03a-birds-on-ground');
await page.evaluate((b) => { __inu.state.player.x = b.x + 30; }, bird); await page.waitForTimeout(450); await ashot('wildlife-03b-birds-flutter-away');
L('birds flying: ' + await page.evaluate(() => __inu.amb.birds.filter((b) => b.state === 'fly').length));

// ---- Kibble Mall district (demo KIBBLE, President Inu, 2% fee, skill-based prize pools) ----
const openAt = async (tx, ty, kind) => { await tp(tx, ty); await page.keyboard.press('e'); await waitPanel(kind); await page.waitForTimeout(250); };
const mshot = async (n) => { await page.evaluate(() => { document.querySelectorAll('.toast').forEach((t) => t.remove()); const c = document.querySelector('.panel-card'); if (c) c.scrollTop = 0; }); await page.screenshot({ path: `proof/mall-${n}.png` }); L('screenshot proof/mall-' + n + '.png'); };
await page.evaluate(() => __inu.setHour(11)); await tp(32, 60); await page.waitForTimeout(1200); await mshot('01-district-mall-statue');
await tp(33, 65); await page.waitForTimeout(1000); await mshot('02-presidents-office-and-president-inu');
await page.evaluate(() => { __inu.state.kibble += 200; }); L('proof top-up: +200 demo KIBBLE for Mall demo');
await openAt(32, 58, 'mall'); const k0 = await page.evaluate(() => __inu.state.kibble);
for (const id of ['gold_suit', 'gold_throne', 'car_coupe', 'crown']) { await page.click(`[data-mbuy="${id}"]`); await page.waitForTimeout(150); }
const mstate = await page.evaluate(() => JSON.parse(JSON.stringify(__inu.state.mall)));
L(`mall buys: spent ${(k0 - await page.evaluate(() => __inu.state.kibble)).toFixed(4)} KIBBLE; treasury=${mstate.treasury}u pools=${JSON.stringify(mstate.pools)} (u = 1e-6 KIBBLE); ledger fees=${mstate.ledger.map((l) => l.fee).join(',')}`);
await mshot('03-kibble-mall-checkout'); await page.click('#panel-close');
await openAt(14, 55, 'mall'); await mshot('04-district-jeweler'); await page.click('#panel-close');
await openAt(34, 59, 'mall'); await mshot('05-prize-pool-board'); await page.click('#panel-close');
await openAt(21, 58, 'mall'); await mshot('06-leaderboards-inu-verse'); await page.click('[data-game="empires"]'); await page.waitForTimeout(150); await mshot('07-leaderboards-inu-empires-soon'); await page.click('[data-game="quest"]'); await page.waitForTimeout(150); await mshot('08-leaderboards-inu-quest-soon'); await page.click('#panel-close');
await openAt(32, 67, 'mall'); await mshot('09-presidents-office-ledger'); await page.click('#panel-close');
await page.evaluate(() => { __inu.state.clockSec += 720; }); await page.waitForTimeout(500);
L('after one in-game day: winners=' + JSON.stringify(await page.evaluate(() => __inu.state.mall.winners)) + ' pools=' + JSON.stringify(await page.evaluate(() => __inu.state.mall.pools)));
await openAt(34, 59, 'mall'); await mshot('10-board-after-daily-payout'); await page.click('#panel-close');
L('page errors: ' + (errors.length ? errors.join(' | ') : 'none'));
fs.writeFileSync('proof/verse-log.txt', log.join('\n') + '\n'); await browser.close();
if (errors.length) process.exit(1);

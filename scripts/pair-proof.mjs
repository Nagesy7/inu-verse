import { chromium } from 'playwright';
const URL = process.env.URL || 'http://localhost:8643/', PRE = process.env.PRE || '', b = await chromium.launch(), errs = [], out = {};
const go = async (vp, mob) => { const p = await b.newPage({ viewport: vp, hasTouch: !!mob, isMobile: !!mob }); p.on('pageerror', (e) => errs.push(e.message)); await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(900); await p.click('#start'); await p.waitForTimeout(800); return p; };
const shot = (p, n) => p.screenshot({ path: `proof/${PRE}pair-${n}.png` });
let p = await go({ width: 1280, height: 800 });
await p.evaluate(() => { __inu.setHour?.(11); __inu.state.player.x = 15 * 32; __inu.state.player.y = 81 * 32; globalThis.__camLock = { x: 15 * 32, y: 80 * 32 }; __inu.setZoom?.(2.5); }); await p.waitForTimeout(800); await shot(p, '1-matchmaker-sign');
await p.evaluate(() => { globalThis.__camLock = null; __open('matchmaker', {}); }); await p.waitForTimeout(400); await p.click('[data-act="list:duo"]'); await p.waitForTimeout(300); await shot(p, '2-board');
await p.click('[data-ptab="duo"]'); await p.waitForTimeout(300); await shot(p, '3-duo-tab');
await p.click('[data-ptab="board"]'); await p.waitForTimeout(300); await p.click('[data-act^="askbreed:"]'); await p.waitForTimeout(300); await p.click('[data-ptab="pups"]'); await p.waitForTimeout(300); const acc = await p.$('[data-act^="accept:"]'); if (acc) { await acc.click(); await p.waitForTimeout(300); } await p.click('[data-act^="breed:"]'); await p.waitForTimeout(400); await shot(p, '4-pup-born');
out.pups = await p.evaluate(() => __inu.state.pair.breedPups.map((x) => ({ name: x.name, coat: x.look.coat, rare: x.rare?.name || null })));
await p.click('[data-ptab="couple"]'); await p.waitForTimeout(300); await shot(p, '5-couples');
await p.keyboard.press('Escape');
// in-world art: President drops worn, burn supercar, storefront skins
await p.evaluate(() => { const s = __inu.state; s.kibble = 400; s.wardrobe.owned.push('pres_cap', 'pres_scarf'); s.wardrobe.equipped.hat = 'pres_cap'; s.wardrobe.equipped.neck = 'pres_scarf';
  s.biz ||= { mine: null, treasuryRent: 0, ledger: [], week: 0, weekProfit: 0, pool: 400, history: [] }; s.biz.mine = { lot: 'P1', type: 'cafe', name: 'Proof Cafe', stock: {}, prices: {}, decor: {}, look: null, looks: {}, staff: 0, up: { shelves: 0, display: 0 }, paidThrough: 99, open: true }; });
await p.evaluate(() => __open('city', { tab: 'status' })); await p.waitForTimeout(300);
for (const id of ['supercar_01', 'store_sakura', 'store_gold', 'pet_void']) { await p.click(`[data-act="burn:${id}"]`); await p.waitForTimeout(250); }
out.burn = await p.evaluate(() => ({ cars: __inu.state.garage.cars.map((c) => c.burnId || c.model), looks: __inu.state.biz.mine.looks, look: __inu.state.biz.mine.look, pets: __inu.state.pets.owned.map((x) => x.name), equipped: __inu.state.wardrobe.equipped }));
await p.keyboard.press('Escape'); await p.evaluate(() => { const s = __inu.state; s.player.x = 44 * 32; s.player.y = 79 * 32; globalThis.__camLock = { x: 44 * 32, y: 77 * 32 }; __inu.setZoom?.(2.5); }); await p.waitForTimeout(900); await shot(p, '6-storefront-skin-and-drops-worn');
await p.evaluate(() => { globalThis.__camLock = null; __inu.state.player.x = 15 * 32; __inu.state.player.y = 81 * 32; __inu.setZoom?.(3); }); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(600); await p.keyboard.up('ArrowRight'); await p.waitForTimeout(500); await shot(p, '7-pups-following-drops-worn');
await p.evaluate(() => __open('garage', {})); await p.waitForTimeout(400); await shot(p, '8-garage-supercar'); await p.keyboard.press('Escape');
await p.evaluate(() => __playDuo('sweeper', { kind: 'npc', name: 'Mochi', skill: 0.6, bond: 0.1 })); await p.waitForTimeout(1200); await shot(p, '9-duo-job-running'); await p.close();
p = await go({ width: 390, height: 844 }, true); await p.evaluate(() => __open('matchmaker', { tab: 'pups' })); await p.waitForTimeout(400); await shot(p, 'phone-portrait'); await p.close();
p = await go({ width: 844, height: 390 }, true); await p.evaluate(() => __open('matchmaker', { tab: 'duo' })); await p.waitForTimeout(400); await shot(p, 'phone-landscape'); await p.close();
console.log(JSON.stringify(out)); console.log('errors', JSON.stringify(errs)); await b.close();

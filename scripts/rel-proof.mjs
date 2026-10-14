import { chromium } from 'playwright';
const URL = process.env.URL || 'http://localhost:8643/', PRE = process.env.PRE || '', b = await chromium.launch(), errs = [];
async function boot(vp) { const page = await b.newPage({ viewport: vp || { width: 1280, height: 800 }, hasTouch: !!vp, isMobile: !!vp }); page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(800); await page.click('#start'); await page.waitForTimeout(600);
  await page.evaluate(() => { const s = __inu.state; s.bones = 5000; s.kibble = 200; __inu.setHour(11); }); return page; }
const shot = (p, n) => p.screenshot({ path: `proof/${PRE}rel-${n}.png` });
const look = (p, x, y) => p.evaluate(([x, y]) => { __inu.setZoom(2); globalThis.__camLock = { x: x * 32, y: y * 32 }; }, [x, y]);
const free = (p) => p.evaluate(() => { globalThis.__camLock = null; });
const closeP = (p) => p.evaluate(() => document.querySelector('#panel-close')?.click()).then(() => p.keyboard.press('Escape'));
let p = await boot();
// friendship: walk up to Mochi, E opens panel (auto daily chat)
await p.evaluate(() => { const n = __inu.npcs.find((x) => x.name === 'Mochi'); const s = __inu.state; n.path = []; n.wait = 99; s.player.x = n.x - 26; s.player.y = n.y; s.farm.inv = { strawberry: 3, minnow: 1, peach: 2, wheat: 6 }; });
await p.waitForTimeout(400); await shot(p, '01-talk-prompt-hearts'); await p.keyboard.press('e'); await p.waitForTimeout(500); await shot(p, '02-friend-panel');
await p.click('[data-act="gift:strawberry"]'); await p.waitForTimeout(250); await closeP(p); await p.waitForTimeout(500); await shot(p, '03-loved-gift-heart-emote');
// milestone cutscene
await p.evaluate(() => { __inu.state.rel.Mochi.pts = 395; __inu.state.rel.Mochi.giftDay = -5; __open('friend', { name: 'Mochi' }); }); await p.waitForTimeout(200); await p.click('[data-act="gift:peach"]'); await p.waitForTimeout(4200); await shot(p, '04-heart-milestone-cutscene');
await p.evaluate(() => { __rel.scene && (__rel.scene.t = 99, __rel.scene.i = 99); }); await p.waitForTimeout(300);
// dating Hana
await p.evaluate(() => { const s = __inu.state; s.rel.Hana.pts = 800; s.giftInv.rose_bone = 1; __open('friend', { name: 'Hana' }); }); await p.waitForTimeout(200); await shot(p, '05-eight-hearts-rose-bone');
await p.click('[data-act="askout"]'); await p.waitForTimeout(400); await p.evaluate(() => { __rel.scene.i = 99; __rel.scene.t = 99; }); await p.waitForTimeout(300);
await p.evaluate(() => __open('friend', { name: 'Hana' })); await p.waitForTimeout(200); await p.click('[data-act="date:fountain"]'); await p.waitForTimeout(3900); await shot(p, '06-date-at-fountain');
await p.evaluate(() => { __rel.scene.i = 99; __rel.scene.t = 99; const s = __inu.state; s.rel.Hana.pts = 1000; s.giftInv.promise_collar = 1; s.rel.Hana.dateDay = -9; __open('friend', { name: 'Hana' }); }); await p.waitForTimeout(300);
await p.click('[data-act="date:dinner"]'); await p.waitForTimeout(3900); await shot(p, '07-mall-dinner-date'); await p.evaluate(() => { __rel.scene.i = 99; __rel.scene.t = 99; }); await p.waitForTimeout(300);
await p.evaluate(() => __open('friend', { name: 'Hana' })); await p.waitForTimeout(200); await p.click('[data-act="propose"]'); await p.waitForTimeout(3900); await shot(p, '08-proposal'); await p.evaluate(() => { __rel.scene.i = 99; __rel.scene.t = 99; }); await p.waitForTimeout(300);
// wedding at chapel
await p.evaluate(() => __open('chapel')); await p.waitForTimeout(200); await shot(p, '09-chapel-panel-engaged'); await p.click('[data-act="wed"]');
await look(p, 24.5, 84); await p.waitForTimeout(4200); await shot(p, '10-wedding-guests-confetti'); await p.waitForTimeout(10500); await shot(p, '11-wedding-photo-mode');
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
console.log('spouse', JSON.stringify(await p.evaluate(() => __inu.state.spouse)));
// pups
await p.evaluate(() => { const s = __inu.state, d = Math.floor(s.clockSec / 720); __open('chapel'); }); await p.waitForTimeout(200);
for (const n of ['Sesame', 'Azuki', 'Yuki']) { await p.fill('#pupname', n); await p.click('[data-act="pup"]'); await p.waitForTimeout(150); }
await p.evaluate(() => { const s = __inu.state, d = Math.floor(s.clockSec / 720); s.pups[0].born = d - 15; s.pups[1].born = d - 8; s.pups[2].born = d; }); await p.evaluate(() => __open('chapel')); await p.waitForTimeout(200); await shot(p, '12-chapel-pups-p2p');
await closeP(p); await free(p); await p.evaluate(() => { const s = __inu.state; s.player.x = 32 * 32; s.player.y = 87 * 32; }); await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(1600); await p.keyboard.up('ArrowLeft'); await p.waitForTimeout(500); await shot(p, '13-pups-follow-three-stages');
await look(p, 17.5, 92); await p.waitForTimeout(600); await shot(p, '14-spouse-helps-on-farm');
// player-to-player
await p.evaluate(() => { const s = __inu.state; s.spouse = null; s.rel.Hana.status = 'friend'; __open('chapel'); }); await p.waitForTimeout(200); await p.fill('#p2pname', 'Riko'); await p.click('[data-act="p2p"]'); await p.waitForTimeout(150); await shot(p, '15-p2p-awaiting-consent');
await p.click('[data-act="sim"]'); await p.waitForTimeout(150); await p.click('[data-act="p2pwed"]'); await p.waitForTimeout(150); await p.click('[data-act="joint"]'); await p.waitForTimeout(150); await p.click('[data-act="jin"]'); await p.waitForTimeout(150);
await p.fill('#safename', 'Grumpy'); await p.click('[data-act="block"]'); await p.waitForTimeout(150); await shot(p, '16-p2p-married-joint-safety');
console.log('p2p', JSON.stringify(await p.evaluate(() => ({ partner: __inu.state.p2p.partner, joint: __inu.state.p2p.joint, blocked: __inu.state.p2p.blocked, outbox: __inu.state.p2p.outbox.map((m) => m.type) }))));
// furniture stores
await closeP(p); await look(p, 20.5, 63); await p.waitForTimeout(700); await shot(p, '17-cosy-corner-exterior');
await look(p, 57, 72); await p.waitForTimeout(700); await shot(p, '18-maison-royale-exterior');
await p.evaluate(() => __open('furn', { store: 'cosy' })); await p.waitForTimeout(400); await shot(p, '19-cosy-corner-store-preview');
await p.click('[data-act="buy:cosy_patchwork_bed"]'); await p.waitForTimeout(150); await p.click('[data-act="set:modern"]'); await p.waitForTimeout(300); await shot(p, '20-cosy-modern-set');
await p.evaluate(() => __open('furn', { store: 'royal' })); await p.waitForTimeout(400); await shot(p, '21-maison-royale-royal-set');
const k0 = await p.evaluate(() => __inu.state.kibble); await p.click('[data-act="buy:royal_canopy_royal_bed"]'); await p.waitForTimeout(150); await p.click('[data-act="buy:royal_royal_pup_cradle"]'); await p.waitForTimeout(150);
console.log('royal kibble spent (9 + 6 + 2%):', (k0 - await p.evaluate(() => __inu.state.kibble)).toFixed(2));
await p.click('[data-act="set:deco"]'); await p.waitForTimeout(300); await shot(p, '22-maison-royale-deco-set');
await closeP(p); console.log('place', JSON.stringify(await p.evaluate(() => { __rel.claim('p1'); const a = __rel.place('p1', 'royal_canopy_royal_bed', 0, 0, 0), b2 = __rel.place('p1', 'royal_royal_pup_cradle', 3, 0, 0), c = __rel.place('p1', 'cosy_patchwork_bed', 7, 0, 0); __rel.build('p1'); return [a.ok, b2.ok, c.ok]; })));
await p.waitForTimeout(800); await shot(p, '23-placed-in-home-build-mode');
await p.close(); p = await boot({ width: 844, height: 390 }); await p.evaluate(() => __open('furn', { store: 'royal' })); await p.waitForTimeout(400); await shot(p, '24-phone-landscape-store');
await p.close(); p = await boot({ width: 390, height: 844 }); await p.evaluate(() => { __inu.state.rel.Kuro.pts = 450; __open('friend', { name: 'Kuro' }); }); await p.waitForTimeout(400); await shot(p, '25-phone-portrait-friend');
console.log('errors', JSON.stringify(errs)); await b.close();

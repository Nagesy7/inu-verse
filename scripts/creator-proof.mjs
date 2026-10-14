import { chromium } from 'playwright';
const URL = process.env.URL || 'http://localhost:8643/', PRE = process.env.PRE || '', b = await chromium.launch(), errs = [], out = {};
const page = async (vp, mobile) => { const p = await b.newPage({ viewport: vp, hasTouch: !!mobile, isMobile: !!mobile }); p.on('pageerror', (e) => errs.push(e.message)); await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(900); return p; };
let p = await page({ width: 1280, height: 900 });
await p.screenshot({ path: `proof/${PRE}creator-1-look-default.png` });
for (const [k, v] of [['coat', '#3a2a22'], ['pattern', 'mask'], ['markings', 'star'], ['eyeShape', 'sparkle'], ['eyeColor', '#3a6ad8'], ['ears', 'floppy'], ['tail', 'fluffy'], ['size', 'large']]) await p.click(`[data-k="${k}"][data-v="${v}"]`);
await p.waitForTimeout(300); await p.screenshot({ path: `proof/${PRE}creator-2-look-custom.png` });
await p.click('[data-tab="you"]'); await p.click('[data-k="pronouns"][data-v="she/her"]'); await p.click('[data-k="outfit"][data-v="street"]'); await p.click('[data-k="trait"][data-v="greenpaw"]'); await p.waitForTimeout(200); await p.screenshot({ path: `proof/${PRE}creator-3-you.png` });
await p.click('[data-tab="life"]'); await p.click('[data-k="home"][data-v="farmhouse"]'); await p.click('[data-k="path"][data-v="farmer"]'); await p.fill('#name', 'Yuzu'); await p.waitForTimeout(200); await p.screenshot({ path: `proof/${PRE}creator-4-life.png` });
await p.click('#start'); await p.waitForTimeout(1200); await p.evaluate(() => __inu.setZoom?.(2)); await p.waitForTimeout(400); await p.screenshot({ path: `proof/${PRE}creator-5-ingame.png` });
out.player = await p.evaluate(() => ({ look: __inu.state.player.look, trait: __inu.state.player.trait, pronouns: __inu.state.player.pronouns, home: __inu.state.player.home, seeds: __inu.state.farm.seeds, eq: __inu.state.wardrobe.equipped }));
await p.waitForTimeout(500); out.profileKeys = await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('inu.profile.v1:')));
out.profile = await p.evaluate(() => __profile.mine());
await p.evaluate(() => { __inu.state.bones = 1000; __open('wardrobe'); }); await p.waitForTimeout(400); await p.screenshot({ path: `proof/${PRE}creator-6-wardrobe-mirror.png` });
await p.click('#tosalon'); await p.waitForTimeout(300); await p.click('[data-k="coat"][data-v="#ffffff"]'); await p.click('[data-k="tail"][data-v="bob"]'); await p.click('[data-k="markings"][data-v="heart"]'); await p.waitForTimeout(300); await p.screenshot({ path: `proof/${PRE}creator-7-salon.png` });
await p.click('#salonbuy'); await p.waitForTimeout(500); out.afterSalon = await p.evaluate(() => ({ bones: __inu.state.bones, coat: __inu.state.player.look.coat, tail: __inu.state.player.look.tail })); await p.screenshot({ path: `proof/${PRE}creator-8-after-salon.png` });
// legacy save keeps atlas look
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => !k.startsWith('inu.profile') && localStorage.getItem(k).includes('"player"')))); return s; });
await p.close();
// phone portrait creator
p = await page({ width: 390, height: 844 }, true); await p.screenshot({ path: `proof/${PRE}creator-phone-portrait.png`, fullPage: false }); await p.click('[data-tab="life"]'); await p.screenshot({ path: `proof/${PRE}creator-phone-portrait-life.png` }); await p.close();
p = await page({ width: 844, height: 390 }, true); await p.screenshot({ path: `proof/${PRE}creator-phone-landscape.png` }); await p.click('#start'); await p.waitForTimeout(1200); await p.screenshot({ path: `proof/${PRE}creator-phone-landscape-ingame.png` }); await p.close();
console.log(JSON.stringify(out, null, 0)); console.log('errors', JSON.stringify(errs)); await b.close();

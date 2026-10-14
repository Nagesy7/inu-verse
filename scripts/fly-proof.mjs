import { chromium } from 'playwright';
const URL = process.env.URL || 'http://localhost:8643/', PRE = process.env.PRE || '', b = await chromium.launch(), errs = [], out = {};
const go = async (vp, mob) => { const p = await b.newPage({ viewport: vp, hasTouch: !!mob, isMobile: !!mob }); p.on('pageerror', (e) => errs.push(e.message)); await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(900); await p.click('#start'); await p.waitForTimeout(800); return p; };
let p = await go({ width: 1280, height: 800 });
await p.evaluate(() => { __inu.state.kibble = 200; }); await p.evaluate(() => __open('city', { tab: 'pools' })); await p.waitForTimeout(400); await p.screenshot({ path: `proof/${PRE}fly-1-pools.png` });
await p.click('[data-ctab="featured"]'); await p.waitForTimeout(300); await p.screenshot({ path: `proof/${PRE}fly-2-featured-panel.png` });
await p.click('[data-act="feat:bb1"]'); await p.waitForTimeout(300); out.feat = await p.evaluate(() => ({ fly: __inu.state.fly.featured, treasury: __inu.state.mall.treasury, pools: __inu.state.mall.pools, kibble: __inu.state.kibble }));
await p.keyboard.press('Escape'); await p.evaluate(() => { globalThis.__camLock = { x: 44 * 32, y: 45 * 32 }; __inu.setZoom?.(2); }); await p.waitForTimeout(700); await p.screenshot({ path: `proof/${PRE}fly-3-featured-billboard.png` }); await p.evaluate(() => { globalThis.__camLock = null; __inu.setZoom?.(1); });
await p.evaluate(() => __open('city', { tab: 'status' })); await p.waitForTimeout(300); await p.click('[data-act="burn:pet_aurora"]'); await p.waitForTimeout(300); await p.screenshot({ path: `proof/${PRE}fly-4-burn-status.png` });
out.burn = await p.evaluate(() => ({ owned: __inu.state.fly.owned, burnedU: __inu.state.mall.burnedU, kibble: __inu.state.kibble }));
await p.keyboard.press('Escape'); await p.evaluate(() => __inu.setZoom?.(2)); await p.waitForTimeout(600); await p.screenshot({ path: `proof/${PRE}fly-5-flair-glow.png` });
await p.evaluate(() => { __inu.presVisit('walk'); }); for (let i = 0; i < 40; i++) { await p.waitForTimeout(1000); if (await p.evaluate(() => __inu.president.stage === 'visit')) break; }
await p.evaluate(() => __open('city', { tab: 'drops' })); await p.waitForTimeout(300); const has = await p.$('[data-act="drop"]'); if (has) await has.click(); await p.waitForTimeout(300); await p.screenshot({ path: `proof/${PRE}fly-6-president-drop.png` });
out.drops = await p.evaluate(() => __inu.state.fly.drops); await p.keyboard.press('Escape');
out.hud = await p.evaluate(() => document.querySelector('#pools').textContent); await p.screenshot({ path: `proof/${PRE}fly-7-hud-chip.png` }); await p.close();
p = await go({ width: 390, height: 844 }, true); await p.evaluate(() => __open('city', { tab: 'pools' })); await p.waitForTimeout(400); await p.screenshot({ path: `proof/${PRE}fly-phone-portrait.png` }); await p.close();
p = await go({ width: 844, height: 390 }, true); await p.evaluate(() => __open('city', { tab: 'status' })); await p.waitForTimeout(400); await p.screenshot({ path: `proof/${PRE}fly-phone-landscape.png` }); await p.close();
console.log(JSON.stringify(out)); console.log('errors', JSON.stringify(errs)); await b.close();

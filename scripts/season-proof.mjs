// Seasonal decorations + cosmetics proof at 844x390 phone landscape: forced ?season=<theme> for each theme.
// URL=<site> OUT=proof THEMES=xmas,halloween node scripts/season-proof.mjs
import { chromium } from 'playwright'; import fs from 'fs';
const URL = process.env.URL || 'https://inu-verse-tawny.vercel.app/', OUT = process.env.OUT || 'proof', TAG = process.env.TAG || 'feat-season';
const THEMES = (process.env.THEMES || 'auto,xmas,halloween,newyear,lunar,easter,summer').split(','), SHOTS = (process.env.SHOTS || 'plaza,homes,hat,fashion,night').split(',');
const HAT = { auto: 'ss_flowers', spring: 'ss_flowers', xmas: 'ss_santa', halloween: 'ss_witch', newyear: 'ss_party', lunar: 'ss_lucky', easter: 'ss_bunny', summer: 'ss_sunhat' };
fs.mkdirSync(OUT, { recursive: true }); const errs = [], info = {};
const b = await chromium.launch();
for (const th of THEMES) for (const tod of SHOTS.includes('night') ? ['day', 'night'] : ['day']) {
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true }); const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(`${th}/${tod} pageerror ${e.message}`));
  const q = `?tod=${tod}&wx=clear` + (th === 'auto' ? '' : `&season=${th}`);
  await p.goto(URL + q); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); });
  await p.reload(); await p.waitForTimeout(1500); await p.click('#start'); await p.waitForTimeout(2500);
  await p.addStyleTag({ content: '#ev-banner,#crier-banner,.toast,.guide-card,#tour,#prompt,#alive-feed,#feed{visibility:hidden!important}' });
  info[th] = await p.evaluate(async (hat) => { globalThis.__guide?.endTour?.('skipped'); globalThis.__noNav = true; const S = await import('/src/seasons.js'); const st = __inu.state;
    st.wardrobe.owned.push(hat); st.wardrobe.equipped.hat = hat; return S.seasonTheme(); }, HAT[th]);
  const shot = async (name, fn, arg, z = 2, wait = 900) => { await p.evaluate((z) => __inu.setZoom(z), z); await p.evaluate(fn, arg); await p.waitForTimeout(wait); await p.screenshot({ path: `${OUT}/${TAG}-${th}-${tod}-${name}.png` }); };
  const W = await p.evaluate(async () => { const W = await import('/src/world.js'); return { h: W.NPC_HOMES.map((q) => [q.id, q.x, q.y, q.w, q.h]) }; });
  const homes = (z) => shot('homes', ([x, y, w, hh, z]) => { const st = __inu.state; st.player.x = (x + w / 2) * 32; st.player.y = (y + hh + 1) * 32; globalThis.__camLock = { x: (x + w / 2 + (z === 1 ? 4 : 0)) * 32, y: (y + hh * 0.55) * 32 }; }, [...W.h[0].slice(1), z], z);
  if (tod === 'night') { await homes(1); await shot('plaza', () => { const st = __inu.state; st.player.x = 34 * 32; st.player.y = 66.5 * 32; globalThis.__camLock = { x: 34 * 32, y: 62 * 32 }; }, null, 1); }
  else {
    if (SHOTS.includes('plaza')) await shot('plaza', () => { const st = __inu.state; st.player.x = 34 * 32; st.player.y = 66.5 * 32; globalThis.__camLock = { x: 34 * 32, y: 62 * 32 }; }, null, 1);
    if (SHOTS.includes('homes')) await homes(2);
    if (SHOTS.includes('hat')) await shot('hat', () => { const st = __inu.state; st.player.x = 34 * 32; st.player.y = 67 * 32; globalThis.__camLock = { x: 34 * 32, y: 66 * 32 }; __inu.emote?.('wave'); }, null, 2);
    if (SHOTS.includes('fashion')) { await p.evaluate(() => { delete globalThis.__camLock; __inu.open('fashion'); }); await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/${TAG}-${th}-${tod}-fashion.png` }); }
  }
  await ctx.close();
}
console.log(JSON.stringify({ errs, info }, null, 1)); await b.close();

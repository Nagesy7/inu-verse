// Quest-reward outfits on the dog in-world: equips ob_apron_pin / ob_scout_bandana / ob_verse_pin (each also checked in the
// outfit atlas for the player's coat) and saves a close crop of the player. URL= OUT= TAG= node scripts/quest-outfit-proof.mjs
import { chromium } from 'playwright';
const URL = process.env.URL || 'http://localhost:8642/', OUT = process.env.OUT || '/tmp', TAG = process.env.TAG || 'local';
const IDS = ['ob_apron_pin', 'ob_scout_bandana', 'ob_verse_pin'], errs = [];
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 4 }); const p = await ctx.newPage();
p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await p.goto(URL); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); }); await p.reload(); await p.waitForTimeout(1500);
await p.click('#start'); await p.waitForTimeout(3000);
await p.evaluate(() => { globalThis.__guide?.endTour?.('skipped'); __inu.setHour(12); __inu.setZoom?.(2); __inu.state.player.x -= 80; /* step off the road onto the pavement: no cars in the crop */ document.querySelectorAll('.toast').forEach((t) => t.remove()); }); await p.waitForTimeout(800);
const res = [];
// layered = the outfit-atlas dog (classic coat art, as other players without a creator look see it); look = creator-look dog
for (const mode of ['layered', 'look']) { const saved = mode === 'layered' ? await p.evaluate(() => { const l = __inu.state.player.look; delete __inu.state.player.look; return l; }) : null;
for (const id of [null, ...IDS]) {
  const info = await p.evaluate((id) => { const s = __inu.state, w = s.wardrobe; w.equipped = { ...w.equipped }; delete w.equipped.neck; if (id) { if (!w.owned.includes(id)) w.owned.push(id); w.equipped.neck = id; }
    const pl = s.player, z = __inu.zoom, cam = __inu.cam; return { coat: pl.coat, equipped: w.equipped, x: innerWidth / 2 + (pl.x - cam.x) * z, y: innerHeight / 2 + (pl.y - cam.y) * z, z }; }, id);
  await p.waitForTimeout(700);
  const clip = { x: Math.max(0, info.x - 60), y: Math.max(0, info.y - 135), width: 120, height: 150 };
  const path = `${OUT}/verse-fix-outfit-${TAG}-${mode}-${id || 'none'}.png`; await p.screenshot({ path, clip }); res.push({ mode, id, coat: info.coat, path });
}
if (saved) await p.evaluate((l) => { __inu.state.player.look = l; }, saved); }
console.log(JSON.stringify(res)); console.log('errors', errs); await b.close();

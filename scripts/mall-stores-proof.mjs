// Luxury mall stores proof: open Gilded Collar Jewelers, Golden Den Furniture and Royal Paws Designer, count items, screenshot
// each store (desktop + 844x390), and render every new outfit on the pup + every new furniture piece in a home preview.
//   URL=https://inu-verse-tawny.vercel.app/ OUT=proof node scripts/mall-stores-proof.mjs
import { chromium } from 'playwright'; import fs from 'fs';
const URL = process.env.URL || 'http://127.0.0.1:8644/', OUT = process.env.OUT || 'proof'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(), res = { url: URL, stores: {} }, errs = [];
for (const [w, h, touch] of [[1280, 800, false], [844, 390, true]]) { const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch }), p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); localStorage.setItem('inuverse.mp.off', '1'); }); await p.reload(); await p.waitForTimeout(900); await p.click('#start'); await p.waitForTimeout(2200);
  await p.evaluate(() => globalThis.__guide?.endTour?.('skipped'));
  for (const [store, cat] of [['jewel', 'jewelry'], ['goldden', 'furniture'], ['designer', 'outfit']]) { await p.evaluate(([s, c]) => __inu.open('mall', { cat: c, store: s }), [store, cat]); await p.waitForTimeout(500);
    res.stores[store] = { title: await p.evaluate(() => document.querySelector('#panel-body h2')?.textContent), items: await p.evaluate(() => [...document.querySelectorAll('#mallgrid .card b')].map((e) => e.textContent)) };
    await p.screenshot({ path: `${OUT}/mall-${store}-${w}x${h}.png` }); }
  await ctx.close(); }
// every new wearable on the pup (wardrobe sprite) — art check
{ const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }), p = await ctx.newPage(); await p.goto(URL); await p.waitForTimeout(800);
  const ids = ['rose_tiara', 'sapphire_crown', 'ruby_chain', 'emerald_chain', 'rose_shades', 'pearl_brooch', 'plat_suit', 'rose_gown', 'emerald_gown', 'royal_tux', 'champagne_gown', 'gilded_hoodie', 'ivory_suit'];
  const furn = ['gold_bed', 'gold_sofa', 'gold_table', 'gold_rug', 'gold_art', 'gold_plant', 'gold_pupbed', 'gold_throne', 'gold_statue', 'gold_lamp'];
  await p.evaluate(async ([ids, furn]) => { const { drawShiba, drawFurniture } = await import('/src/art.js'); const { OUTFITS } = await import('/src/outfits.js'); const { FURNITURE } = await import('/src/furniture.js');
    document.body.innerHTML = '<div id="g" style="display:flex;flex-wrap:wrap;gap:8px;background:#1b2350;padding:10px;font:10px monospace;color:#f2cc68"></div>'; const g = document.getElementById('g');
    for (const coat of ['tan', 'dark']) for (const id of ids) { const c = document.createElement('canvas'); c.width = 96; c.height = 120; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; const o = { [OUTFITS[id].slot]: id }; if (OUTFITS[id].slot !== 'top') o.top = 'suit_navy';
      drawShiba(x, 48, 104, { coat, outfit: o, scale: 1.4, art: 'layer:' + coat }); const d = document.createElement('div'); d.append(c, document.createElement('br'), OUTFITS[id].name); g.append(d); }
    for (const id of furn) { const f = FURNITURE[id], c = document.createElement('canvas'); c.width = 120; c.height = 100; const x = c.getContext('2d'); const cell = 80 / Math.max(f.w, f.h); drawFurniture(x, id, 60 - f.w * cell / 2, 50 - f.h * cell / 2, cell, 0); const d = document.createElement('div'); d.append(c, document.createElement('br'), f.name); g.append(d); } }, [ids, furn]);
  await p.waitForTimeout(1500); await p.screenshot({ path: `${OUT}/mall-new-items-art.png`, fullPage: true }); await ctx.close(); }
res.errors = errs; fs.writeFileSync(`${OUT}/mall-results.json`, JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1)); await b.close();

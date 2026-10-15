// Refine pass proof: left = BEFORE_URL (current live), right = local. Zoomed so silhouette, neck, creases read.
import { chromium } from 'playwright'; import { execFileSync } from 'node:child_process';
const BEFORE = process.env.BEFORE_URL || 'https://inu-verse-tawny.vercel.app/', AFTER = process.env.URL || 'http://localhost:8642/';
const CATS = {
 characters: `['tan','red','dark'].forEach((c,i)=>drawShiba(x,70+i*135,230,{coat:c,scale:3})); ['down','right','up'].forEach((f,i)=>drawShiba(x,60+i*140,375,{coat:'golden',face:f,moving:true,phase:1.7,scale:1.4}));`,
 outfits: `const L=[{top:'tux_black',bottom:'slacks_black',neck:'bowtie',hat:'top_hat',feet:'sneakers_gold'},{top:'hoodie_maroon',bottom:'jeans_ripped',neck:'chain_gold',feet:'sneakers_red'},{top:'suit_navy',bottom:'slacks_navy',neck:'tie_red',feet:'loafers'}];
  L.forEach((o,i)=>drawShiba(x,70+i*140,240,{coat:['red','tan','cream'][i],outfit:o,scale:3.1})); drawShiba(x,90,385,{coat:'tan',outfit:L[0],face:'right',scale:1.3}); drawShiba(x,210,385,{coat:'dark',outfit:L[1],face:'up',scale:1.3}); drawShiba(x,330,385,{coat:'gray',outfit:L[2],face:'right',moving:true,phase:1.7,scale:1.3});`,
 'outfits-2': `const L=[{top:'velvet_gown',hat:'crown',neck:'diamond_chain'},{top:'gold_suit',bottom:'slacks_black',feet:'loafers'},{top:'jacket_black',bottom:'chinos',feet:'sneakers_gold'}];
  L.forEach((o,i)=>drawShiba(x,70+i*140,240,{coat:['cream','gray','golden'][i],outfit:o,scale:3.1})); L.forEach((o,i)=>drawShiba(x,70+i*140,385,{coat:'tan',outfit:o,face:'right',scale:1.3}));`,
 shiba: `[['#e8a25a'],['#c8502a'],['#f2e2c0'],['#3a2a24']].forEach(([c],i)=>{drawProfileShiba(x,55+i*100,190,{v:1,look:{coat:c}},{scale:2}); drawProfileShiba(x,55+i*100,370,{v:1,look:{coat:c},outfit:{hat:{kind:'tophat',c:'#222'}}},{scale:2,face:'right'});});`,
 pets: `x.imageSmoothingEnabled=false; Object.keys(PETS).forEach((sp,i)=>x.drawImage(petSprite(sp,0),6+(i%4)*103,30+Math.floor(i/4)*118,96,96));`,
};
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3 }); const page = await ctx.newPage(); const errs = [];
page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
for (const [cat, js] of Object.entries(CATS).filter(([k]) => !process.env.ONLY || process.env.ONLY.split(',').includes(k))) for (const [side, url] of [['b', BEFORE], ['a', AFTER]]) {
  await page.goto(url); await page.waitForTimeout(900); await page.evaluate(() => { window.__sd = 0; });
  await page.addScriptTag({ type: 'module', content: `import { drawShiba, drawProfileShiba, artReady } from '/src/art.js'; import { petSprite, PETS } from '/src/pets.js'; await artReady;
   const cv=document.createElement('canvas'),d=3; cv.width=844*d; cv.height=390*d; cv.style.cssText='position:fixed;inset:0;width:844px;height:390px;z-index:99'; document.body.appendChild(cv);
   const x=cv.getContext('2d'); x.setTransform(d,0,0,d,0,0); x.fillStyle='#4a7a42'; x.fillRect(0,0,844,390); x.font='10px Silkscreen, monospace'; x.fillStyle='#fff';
   x.fillText('${side === 'b' ? 'BEFORE (live)' : 'AFTER (refine)'} - ${cat}',${side === 'b' ? 8 : 430},14); x.save(); x.translate(${side === 'b' ? 0 : 422},0); x.beginPath(); x.rect(0,0,421,390); x.clip(); ${js} x.restore(); x.fillStyle='#2a3a5a'; x.fillRect(421,0,2,390); window.__sd=1;` });
  await page.waitForFunction(() => window.__sd === 1); await page.screenshot({ path: `/tmp/ivref-${cat}-${side}.png` });
  if (side === 'a') { execFileSync('python3', ['-c', `from PIL import Image\nb=Image.open('/tmp/ivref-${cat}-b.png');a=Image.open('/tmp/ivref-${cat}-a.png');w=b.width//2\nb.paste(a.crop((w,0,a.width,a.height)),(w,0));b.save('proof/${cat}-refine-before-after.png')`]); console.log(`proof/${cat}-refine-before-after.png`); }
}
console.log('errors', JSON.stringify(errs)); await b.close();

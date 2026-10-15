// Per-category before/after side-by-side (left = native density via __noHires, right = hi-res). Phone landscape DPR 3.
import { chromium } from 'playwright';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3 }); const page = await ctx.newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:8642/'); await page.waitForTimeout(1200);
const CATS = {
 cars: `const M=['sedan','coupe','limo','hatch','suv','pickup','supercar','convertible'],C=['#c8323c','#2a6ad8','#e3b341','#3fb36a','#141a2e','#f08a2a','#c8323c','#6c5ce7'];
  M.forEach((k,i)=>{drawCar(x,60+(i%4)*100,90+Math.floor(i/4)*120,{col:C[i],kind:k,dir:'east'}); drawCar(x,60+(i%4)*100+30,90+Math.floor(i/4)*120+60,{col:C[i],kind:k,dir:'south'});});`,
 'car-accessories': `[['#fff6a0'],['#5ae0ff'],['#ff5aa8']].forEach(([g],i)=>drawCar(x,70+i*130,140,{col:'#141a2e',kind:'supercar',dir:'east',glow:g})); drawCar(x,200,240,{col:'#e3b341',kind:'limo',dir:'west'});`,
 pets: `x.imageSmoothingEnabled=false; Object.keys(PETS).forEach((sp,i)=>x.drawImage(petSprite(sp,0),6+(i%4)*103,24+Math.floor(i/4)*120,96,96));`,
 shiba: `[['#e8a25a'],['#c8502a'],['#f2e2c0'],['#3a2a24']].forEach(([c],i)=>{drawProfileShiba(x,50+i*95,170,{v:1,look:{coat:c}},{scale:2}); drawProfileShiba(x,50+i*95,340,{v:1,look:{coat:c},outfit:{hat:{kind:'tophat',c:'#222'}}},{scale:1.8,face:'right'});});`,
 characters: `['tan','red','dark'].forEach((c,i)=>{drawShiba(x,70+i*135,200,{coat:c,scale:2.6}); drawShiba(x,40+i*135,350,{coat:c,face:'right'}); drawShiba(x,100+i*135,350,{coat:c,face:'up'});});`,
 outfits: `const L=[{top:'tux_black',bottom:'slacks_black',neck:'bowtie',hat:'top_hat',feet:'sneakers_gold',eyes:'shades'},{top:'hoodie_maroon',bottom:'jeans_ripped',neck:'chain_gold',hat:'cap_red',feet:'sneakers_red'},{top:'velvet_gown',hat:'crown',neck:'diamond_chain',eyes:'plat_shades'},{top:'suit_navy',bottom:'slacks_navy',neck:'tie_red',hat:'cap_red',feet:'loafers'}];
  L.forEach((o,i)=>{drawShiba(x,52+i*102,200,{coat:['red','tan','cream','dark'][i],outfit:o,scale:2.3}); drawShiba(x,52+i*102,350,{coat:'tan',outfit:o,face:'right'});});`,
 'outfits-2': `const L=[{top:'hawaiian',bottom:'chinos',eyes:'gold_shades',feet:'sneakers_red'},{top:'gold_suit',bottom:'slacks_black',hat:'crown',neck:'diamond_chain',feet:'loafers'},{top:'jacket_black',bottom:'slacks_black',neck:'chain_gold',feet:'sneakers_gold'},{top:'gown_white',neck:'chain_gold'}];
  L.forEach((o,i)=>{drawShiba(x,52+i*102,200,{coat:['golden','gray','red','cream'][i],outfit:o,scale:2.3}); drawShiba(x,52+i*102,350,{coat:'tan',outfit:o,face:'up'});});`,
};
for (const [cat, js] of Object.entries(CATS).filter(([k]) => !k.startsWith('__') && (!process.env.ONLY || process.env.ONLY.split(',').includes(k)))) for (const half of [1, 0]) {
  await page.reload(); await page.waitForTimeout(600); await page.evaluate(() => { window.__sd = 0; });
  await page.addScriptTag({ type: 'module', content: `import { drawShiba, drawProfileShiba, artReady } from '/src/art.js'; import { petSprite, PETS } from '/src/pets.js'; import { drawCar } from '/src/cars.js'; await artReady;
   document.getElementById('ss')?.remove(); const cv=document.createElement('canvas'),d=3; cv.id='ss'; cv.width=844*d; cv.height=390*d; cv.style.cssText='position:fixed;inset:0;width:844px;height:390px;z-index:99'; document.body.appendChild(cv);
   const X=cv.getContext('2d'); X.setTransform(d,0,0,d,0,0); X.fillStyle='#4a7a42'; X.fillRect(0,0,844,390); X.fillStyle='#2a3a5a'; X.fillRect(421,0,2,390);
   X.font='10px Silkscreen, monospace'; X.fillStyle='#fff'; X.fillText('BEFORE - ${cat}',8,14); X.fillText('AFTER (detail pass) - ${cat}',430,14);
   for (const [side,off] of [[${half},${half}?0:422]]) { globalThis.__noHires=globalThis.__noDetail=!!side; const x=X; x.save(); x.translate(off,0); x.beginPath(); x.rect(0,0,421,390); x.clip(); ${js} x.restore(); }
   globalThis.__noHires=globalThis.__noDetail=false; window.__sd=1;` });
  await page.waitForFunction(() => window.__sd === 1); await page.screenshot({ path: `/tmp/h-${cat}-${half}.png` }); if (!half) { const { execFileSync } = await import('node:child_process'); execFileSync('python3', ['-c', `from PIL import Image\nb=Image.open('/tmp/h-${cat}-1.png');a=Image.open('/tmp/h-${cat}-0.png');w=b.width//2\nb.paste(a.crop((w,0,a.width,a.height)),(w,0));b.save('proof/hires-${cat}-before-after.png')`]); console.log(`proof/hires-${cat}-before-after.png`); }
}
console.log('errors', JSON.stringify(errs)); await b.close();

// Per-category before/after side-by-side (left = native density via __noHires, right = hi-res). Phone landscape DPR 3.
import { chromium } from 'playwright';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3 }); const page = await ctx.newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:8642/'); await page.waitForTimeout(1200);
const CATS = {
 cars: `const M=['sedan','coupe','limo','hatch','suv','pickup','supercar','convertible'],C=['#c8323c','#2a6ad8','#e3b341','#3fb36a','#141a2e','#f08a2a','#c8323c','#6c5ce7'];
  M.forEach((k,i)=>{drawCar(x,60+(i%4)*100,90+Math.floor(i/4)*120,{col:C[i],kind:k,dir:'east'}); drawCar(x,60+(i%4)*100+30,90+Math.floor(i/4)*120+60,{col:C[i],kind:k,dir:'south'});});`,
 'car-accessories': `[['#fff6a0'],['#5ae0ff'],['#ff5aa8']].forEach(([g],i)=>drawCar(x,70+i*130,140,{col:'#141a2e',kind:'supercar',dir:'east',glow:g})); drawCar(x,200,240,{col:'#e3b341',kind:'limo',dir:'west'});`,
 pets: `x.imageSmoothingEnabled=false; Object.keys(PETS).forEach((sp,i)=>x.drawImage(petSprite(sp,0),10+(i%6)*65,30+Math.floor(i/6)*90,56,56));`,
 shiba: `[['tan'],['red'],['cream'],['dark']].forEach(([c],i)=>{drawProfileShiba(x,50+i*95,150,{v:1,coat:c},{scale:1.5}); drawProfileShiba(x,50+i*95,290,{v:1,coat:c,outfit:{hat:{kind:'tophat',c:'#222'}}},{scale:1.5,face:'right'});});`,
 characters: `['tan','red','dark','cream','golden','gray'].forEach((c,i)=>{drawShiba(x,35+i*65,120,{coat:c}); drawShiba(x,35+i*65,250,{coat:c,face:'right',moving:true,phase:1.7});});`,
 outfits: `const L=[{top:'tux_black',bottom:'slacks_black',neck:'bowtie',hat:'top_hat',feet:'sneakers_gold',eyes:'shades'},{top:'hoodie_maroon',bottom:'jeans_ripped',neck:'chain_gold',hat:'cap_red',feet:'sneakers_red'},{top:'velvet_gown',hat:'crown',neck:'diamond_chain',eyes:'plat_shades'},{top:'suit_navy',bottom:'slacks_navy',neck:'tie_red',hat:'cap_red',feet:'loafers'}];
  L.forEach((o,i)=>{drawShiba(x,50+i*100,130,{coat:'red',outfit:o}); drawShiba(x,50+i*100,290,{coat:'tan',outfit:o,scale:1.4,face:'right'});});`,
};
for (const [cat, js] of Object.entries(CATS)) for (const half of [1, 0]) {
  await page.reload(); await page.waitForTimeout(600); await page.evaluate(() => { window.__sd = 0; });
  await page.addScriptTag({ type: 'module', content: `import { drawShiba, drawProfileShiba, artReady } from '/src/art.js'; import { petSprite, PETS } from '/src/pets.js'; import { drawCar } from '/src/cars.js'; await artReady;
   document.getElementById('ss')?.remove(); const cv=document.createElement('canvas'),d=3; cv.id='ss'; cv.width=844*d; cv.height=390*d; cv.style.cssText='position:fixed;inset:0;width:844px;height:390px;z-index:99'; document.body.appendChild(cv);
   const X=cv.getContext('2d'); X.setTransform(d,0,0,d,0,0); X.fillStyle='#4a7a42'; X.fillRect(0,0,844,390); X.fillStyle='#2a3a5a'; X.fillRect(421,0,2,390);
   X.font='10px Silkscreen, monospace'; X.fillStyle='#fff'; X.fillText('BEFORE (native) - ${cat}',8,14); X.fillText('AFTER (2x density) - ${cat}',430,14);
   for (const [side,off] of [[${half},${half}?0:422]]) { globalThis.__noHires=!!side; const x=X; x.save(); x.translate(off,0); x.beginPath(); x.rect(0,0,421,390); x.clip(); ${js} x.restore(); }
   globalThis.__noHires=false; window.__sd=1;` });
  await page.waitForFunction(() => window.__sd === 1); await page.screenshot({ path: `/tmp/h-${cat}-${half}.png` }); if (!half) { const { execFileSync } = await import('node:child_process'); execFileSync('python3', ['-c', `from PIL import Image\nb=Image.open('/tmp/h-${cat}-1.png');a=Image.open('/tmp/h-${cat}-0.png');w=b.width//2\nb.paste(a.crop((w,0,a.width,a.height)),(w,0));b.save('proof/hires-${cat}-before-after.png')`]); console.log(`proof/hires-${cat}-before-after.png`); }
}
console.log('errors', JSON.stringify(errs)); await b.close();
